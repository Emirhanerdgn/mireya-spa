/* Booking form: validation, WhatsApp hand-off or optional JSON endpoint. */
(function () {
  const DATA = window.MIREYA_DATA;
  const CONFIG = window.MIREYA_CONFIG;
  const I18N = window.MireyaI18n;
  const R = window.MireyaRender;
  const t = (k) => I18N.t(k);

  const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;
  const MIN_PHONE_DIGITS = 7;
  const SLOT_MINUTES = 30;

  const form = document.querySelector('[data-booking-form]');
  if (!form) return;
  const serviceSelect = form.querySelector('[data-service-select]');
  const timeSelect = form.querySelector('[data-time-select]');
  const status = form.querySelector('[data-form-status]');

  function waUrl(text) {
    const num = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
    if (!num) return '';
    return 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
  }

  function formatTime(total) {
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function placeholderOption(key) {
    return R.el('option', { value: '', disabled: true, text: t(key) });
  }

  function fillServices() {
    const prev = serviceSelect.value;
    const groups = DATA.categories.map((cat) => R.el('optgroup', { label: t('menu.cat.' + cat) },
      DATA.services.filter((s) => s.cat === cat).flatMap((s) => s.durations.map((d, i) => R.el('option', {
        value: s.id + '|' + d,
        text: R.svcName(s.id) + ' — ' + R.minutes(d) + ' · ' + R.price(s.prices[i])
      })))
    ));
    serviceSelect.replaceChildren(placeholderOption('book.servicePh'), ...groups);
    serviceSelect.value = prev || '';
  }

  function fillTimes() {
    const prev = timeSelect.value;
    const start = toMinutes(CONFIG.bookingOpen);
    const end = toMinutes(CONFIG.bookingClose);
    const opts = [];
    for (let m = start; m < end; m += SLOT_MINUTES) {
      opts.push(R.el('option', { value: formatTime(m), text: formatTime(m) }));
    }
    timeSelect.replaceChildren(placeholderOption('book.timePh'), ...opts);
    timeSelect.value = prev || '';
  }

  function refreshWaLinks() {
    const url = waUrl(t('book.msgIntro'));
    document.querySelectorAll('[data-wa-link]').forEach((a) => {
      if (url) {
        a.href = url;
        a.target = '_blank';
      } else {
        a.href = '#booking';
        a.removeAttribute('target');
      }
    });
  }

  function setError(field, key) {
    const wrap = field.closest('.field');
    const out = wrap && wrap.querySelector('.field-error');
    field.setAttribute('aria-invalid', key ? 'true' : 'false');
    if (wrap) wrap.classList.toggle('has-error', Boolean(key));
    if (out) out.textContent = key ? t(key) : '';
  }

  function validate(values) {
    const checks = [
      [form.name, values.name.length < 2 ? 'book.errRequired' : ''],
      [form.phone, !values.phone ? 'book.errRequired'
        : (!PHONE_RE.test(values.phone) || values.phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS) ? 'book.errPhone' : ''],
      [form.service, !values.service ? 'book.errRequired' : ''],
      [form.date, !values.date ? 'book.errRequired' : values.date < todayISO() ? 'book.errDate' : ''],
      [form.time, !values.time ? 'book.errRequired' : '']
    ];
    checks.forEach(([field, key]) => setError(field, key));
    const firstBad = checks.find(([, key]) => key);
    if (firstBad) firstBad[0].focus();
    return !firstBad;
  }

  function readValues() {
    const fd = new FormData(form);
    const get = (k) => String(fd.get(k) || '').trim();
    return Object.freeze({
      name: get('name'), phone: get('phone'), service: get('service'), date: get('date'),
      time: get('time'), guests: get('guests') || '1', note: get('note'), honeypot: get('company')
    });
  }

  function describeService(value) {
    const [id, dur] = value.split('|');
    const s = R.findService(id);
    if (!s) return value;
    const idx = s.durations.indexOf(Number(dur));
    return R.svcName(id) + ' — ' + R.minutes(dur) + (idx >= 0 ? ' · ' + R.price(s.prices[idx]) : '');
  }

  function buildMessage(v) {
    const guests = v.guests === '2' ? t('book.g2') : t('book.g1');
    return [
      t('book.msgIntro'),
      '',
      t('book.name') + ': ' + v.name,
      t('book.phone') + ': ' + v.phone,
      t('book.service') + ': ' + describeService(v.service),
      t('book.date') + ': ' + v.date + '  ' + t('book.time') + ': ' + v.time,
      t('book.guests') + ': ' + guests,
      v.note ? t('book.note') + ': ' + v.note : ''
    ].filter((line, i) => line || i === 1).join('\n');
  }

  function showStatus(key, tone, link) {
    status.textContent = t(key);
    status.dataset.tone = tone;
    if (link) {
      status.append(' ', R.el('a', { class: 'text-link', href: link, target: '_blank', rel: 'noopener', text: 'WhatsApp →' }));
    }
  }

  async function postToEndpoint(v) {
    const res = await fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: v.name, phone: v.phone, service: describeService(v.service), date: v.date,
        time: v.time, guests: v.guests, note: v.note, language: I18N.lang, message: buildMessage(v)
      })
    });
    if (!res.ok) throw new Error('Booking endpoint responded ' + res.status);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = readValues();
    if (v.honeypot) { showStatus('book.ok', 'ok'); form.reset(); return; }
    if (!validate(v)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    try {
      if (CONFIG.formEndpoint) {
        await postToEndpoint(v);
        showStatus('book.ok', 'ok');
        form.reset();
      } else if (waUrl()) {
        showStatus('book.okWa', 'ok', waUrl(buildMessage(v)));
      } else {
        showStatus('book.soon', 'info');
      }
    } catch (err) {
      console.error('[Mireya booking]', err);
      showStatus('book.fail', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  function onSelectService(e) {
    const s = R.findService(e.detail.id);
    if (!s) return;
    serviceSelect.value = s.id + '|' + s.durations[0];
    setError(serviceSelect, '');
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  }

  function refreshLocalized() {
    fillServices();
    fillTimes();
    refreshWaLinks();
    form.querySelectorAll('[aria-invalid="true"]').forEach((f) => setError(f, ''));
    status.textContent = '';
    delete status.dataset.tone;
  }

  form.date.min = todayISO();
  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
  document.addEventListener('mireya:lang', refreshLocalized);
  document.addEventListener('mireya:select-service', onSelectService);
})();
