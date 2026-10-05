/*
 * Mireya digital assistant (chat widget).
 * Asks the Cloudflare Worker (Claude) when it is available; otherwise answers
 * the common questions itself. Replies are always rendered as plain text.
 */
(function () {
  const CONFIG = window.MIREYA_CONFIG;
  const DATA = window.MIREYA_DATA;
  const I18N = window.MireyaI18n;
  const R = window.MireyaRender;
  const t = (k) => I18N.t(k);

  if (!CONFIG.assistant || !document.body) return;

  const MAX_HISTORY = 10;
  const REQUEST_TIMEOUT_MS = 20000;
  const INTENTS = Object.freeze([
    ['thanks', /faleminderit|hvala|thank|teşekkür|tesekkur|sağol|sagol/i],
    ['booking', /rezerv|termin|randevu|book|appoint|zakaz|reserv/i],
    ['price', /çmim|cmim|cena|cijen|fiyat|ücret|ucret|price|cost|kosht|koliko|euro|€/i],
    ['where', /adres|ku jeni|ku ndodh|where|nerede|nerde|lokacij|lokacion|harit|map|gde|gdje|parking/i],
    ['hours', /orar|orari|radno|working hours|open|hapur|açık|acik|kaçta|kacta|saat kaç|saatler/i],
    ['contact', /telefon|whatsapp|numër|numer|numara|broj|phone|call|thirr|ara/i],
    ['massage', /masazh|masaž|masaz|masaj|massage|tretman|trajtim|ritual|terapi|therapy/i],
    ['greeting', /^\s*(përshëndetje|pershendetje|tung|mirëdita|miredita|zdravo|dobar dan|hello|hi|hey|merhaba|selam)\b/i]
  ]);

  let history = [];
  let aiAvailable = Boolean(CONFIG.assistantEndpoint);
  let busy = false;

  /* ---------- DOM ---------- */
  const launcher = R.el('button', { class: 'ai-launcher', type: 'button', 'aria-expanded': 'false' }, [
    R.el('span', { class: 'ai-launcher-mono', 'aria-hidden': 'true', text: 'M' }),
    R.el('span', { class: 'ai-launcher-dot', 'aria-hidden': 'true' })
  ]);
  const log = R.el('div', { class: 'ai-log', role: 'log', 'aria-live': 'polite' });
  const chips = R.el('div', { class: 'ai-chips' });
  const input = R.el('input', { class: 'ai-input', type: 'text', maxlength: '400', autocomplete: 'off', id: 'ai-input' });
  const sendBtn = R.el('button', { class: 'ai-send', type: 'submit' }, [R.icon('i-arrow')]);
  const form = R.el('form', { class: 'ai-form' }, [input, sendBtn]);
  const titleEl = R.el('strong', { class: 'ai-title' });
  const statusEl = R.el('span', { class: 'ai-status' });
  const closeBtn = R.el('button', { class: 'ai-close', type: 'button' }, [R.icon('i-close')]);
  const noteEl = R.el('p', { class: 'ai-note' });
  const panel = R.el('section', { class: 'ai-panel', hidden: true, role: 'dialog', 'aria-modal': 'false' }, [
    R.el('header', { class: 'ai-head' }, [
      R.el('img', { class: 'ai-logo', src: 'assets/img/mireya-logo-mark.webp', alt: '', width: 355, height: 180 }),
      R.el('div', { class: 'ai-head-text' }, [titleEl, statusEl]),
      closeBtn
    ]),
    log, chips, form, noteEl
  ]);
  document.body.append(launcher, panel);

  /* ---------- Messages ---------- */
  function bubble(role, text, actions) {
    const node = R.el('div', { class: 'ai-msg ai-' + role }, [R.el('p', { text })]);
    if (actions && actions.length) node.append(R.el('div', { class: 'ai-actions' }, actions));
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function typing() {
    const node = R.el('div', { class: 'ai-msg ai-assistant ai-typing', 'aria-label': t('ai.typing') }, [
      R.el('span'), R.el('span'), R.el('span')
    ]);
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function detectIntents(text) {
    return INTENTS.filter(([, re]) => re.test(text)).map(([name]) => name);
  }

  function waUrl(text) {
    const num = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
    return num ? 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : '') : '';
  }

  function mapUrl() {
    const cid = String(CONFIG.googleMapsCid || '').replace(/\D/g, '');
    if (cid) return 'https://www.google.com/maps?cid=' + cid;
    const q = CONFIG.mapQuery || CONFIG.address;
    return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
  }

  function linkButton(label, href, external) {
    return R.el('a', { class: 'ai-action', href, target: external ? '_blank' : null, rel: external ? 'noopener' : null, text: label });
  }

  function bookButton() {
    const a = linkButton(t('ai.btn.book'), '#booking', false);
    a.addEventListener('click', () => setOpen(false));
    return a;
  }

  function actionsFor(intents) {
    const out = [];
    if (intents.includes('booking') || intents.includes('massage')) out.push(bookButton());
    if (intents.includes('where') && mapUrl()) out.push(linkButton(t('ai.btn.map'), mapUrl(), true));
    if (['price', 'contact', 'hours', 'booking'].some((i) => intents.includes(i)) && waUrl()) {
      out.push(linkButton(t('ai.btn.whatsapp'), waUrl(t('book.msgIntro')), true));
    }
    return out;
  }

  function massageNames() {
    return DATA.rituals.map((r) => t('svc.' + r.id + '.name')).join(', ');
  }

  // Answers used when the AI service is not available
  function localAnswer(intents) {
    const first = intents[0] || 'default';
    switch (first) {
      case 'booking': return t('ai.r.booking');
      case 'price': return t('ai.r.price');
      case 'where': return t('ai.r.where').replace('{address}', CONFIG.address || '');
      case 'hours':
        return CONFIG.hoursWeekdays
          ? t('ai.r.hours').replace('{hours}', CONFIG.hoursWeekdays + (CONFIG.hoursWeekend ? ' / ' + CONFIG.hoursWeekend : ''))
          : t('ai.r.hoursUnknown');
      case 'contact': return t('ai.r.contact').replace('{phone}', CONFIG.phoneDisplay || '');
      case 'massage': return t('ai.r.massage').replace('{list}', massageNames());
      case 'thanks': return t('ai.r.thanks');
      case 'greeting': return t('ai.r.greeting');
      default: return t('ai.r.default');
    }
  }

  async function askAI(messages) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(CONFIG.assistantEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: I18N.lang, messages }),
        signal: ctrl.signal
      });
      if (res.status === 503) aiAvailable = false;
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.reply === 'string' && data.reply.trim() ? data.reply.trim() : null;
    } catch (err) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function send(text) {
    const clean = String(text || '').trim().slice(0, 400);
    if (!clean || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    chips.hidden = true;
    bubble('user', clean);
    history = [...history, { role: 'user', content: clean }].slice(-MAX_HISTORY);

    const intents = detectIntents(clean);
    const dots = typing();
    const reply = (aiAvailable && await askAI(history)) || localAnswer(intents);
    dots.remove();
    bubble('assistant', reply, actionsFor(intents));
    history = [...history, { role: 'assistant', content: reply }].slice(-MAX_HISTORY);
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  /* ---------- Open / close & language ---------- */
  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('ai-open', open);
    if (open) {
      if (!log.childElementCount) bubble('assistant', t('ai.greeting'));
      setTimeout(() => input.focus(), 50);
    }
  }

  function renderChips() {
    chips.replaceChildren(...['massage', 'booking', 'price', 'where'].map((key) => R.el('button', {
      type: 'button', class: 'ai-chip', text: t('ai.chip.' + key),
      onclick: () => send(t('ai.chip.' + key))
    })));
  }

  function applyLanguage() {
    launcher.setAttribute('aria-label', t('ai.open'));
    titleEl.textContent = t('ai.title');
    statusEl.textContent = t('ai.status');
    input.placeholder = t('ai.placeholder');
    input.setAttribute('aria-label', t('ai.placeholder'));
    sendBtn.setAttribute('aria-label', t('ai.send'));
    closeBtn.setAttribute('aria-label', t('ai.close'));
    panel.setAttribute('aria-label', t('ai.title'));
    noteEl.textContent = t('ai.note');
    renderChips();
  }

  launcher.addEventListener('click', () => setOpen(panel.hidden));
  closeBtn.addEventListener('click', () => { setOpen(false); launcher.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  document.addEventListener('mireya:lang', applyLanguage);
  applyLanguage();
})();
