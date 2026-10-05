/*
 * Mireya digital assistant (chat widget).
 * Asks the Cloudflare Worker (Claude) when it is available; otherwise uses the
 * built-in answers in assistant-brain.js. Replies are always rendered as plain text.
 */
(function () {
  const CONFIG = window.MIREYA_CONFIG;
  const I18N = window.MireyaI18n;
  const R = window.MireyaRender;
  const BRAIN = window.MireyaBrain;
  const t = (k) => I18N.t(k);

  if (!CONFIG.assistant || !BRAIN || !document.body) return;

  const MAX_HISTORY = 10;
  const REQUEST_TIMEOUT_MS = 20000;
  const TEASER_DELAY_MS = 7000;
  const TEASER_KEY = 'mireya-ai-teaser';
  const REPLY_DELAY_MS = 450;

  let history = [];
  let aiAvailable = Boolean(CONFIG.assistantEndpoint);
  let busy = false;

  /* ---------- DOM ---------- */
  const launchLabel = R.el('span', { class: 'ai-launch-label' });
  const launchStatus = R.el('span', { class: 'ai-launch-status' });
  const launcher = R.el('button', { class: 'ai-launcher', type: 'button', 'aria-expanded': 'false' }, [
    R.el('span', { class: 'ai-launch-icon', 'aria-hidden': 'true' }, [R.icon('i-chat')]),
    R.el('span', { class: 'ai-launch-text' }, [launchLabel, launchStatus])
  ]);
  const teaserText = R.el('span');
  const teaserClose = R.el('button', { class: 'ai-teaser-close', type: 'button' }, [R.icon('i-close')]);
  const teaser = R.el('div', { class: 'ai-teaser', hidden: true }, [teaserText, teaserClose]);

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
  document.body.append(teaser, launcher, panel);

  /* ---------- Messages ---------- */
  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function bubble(role, text, actions) {
    const node = R.el('div', { class: 'ai-msg ai-' + role }, [R.el('p', { text })]);
    if (actions && actions.length) node.append(R.el('div', { class: 'ai-actions' }, actions));
    log.append(node);
    scrollDown();
    return node;
  }

  function typing() {
    const node = R.el('div', { class: 'ai-msg ai-assistant ai-typing', 'aria-label': t('ai.typing') }, [
      R.el('span'), R.el('span'), R.el('span')
    ]);
    log.append(node);
    scrollDown();
    return node;
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

  const WHATSAPP_TOPICS = Object.freeze(['price', 'contact', 'hours', 'cancel', 'payment', 'duration', 'gift', 'default']);

  function actionsFor(topics) {
    const out = [];
    if (topics.includes('decline')) return out;
    if (['booking', 'massage'].some((x) => topics.includes(x))) out.push(bookButton());
    if (topics.includes('where') && mapUrl()) out.push(linkButton(t('ai.btn.map'), mapUrl(), true));
    if (WHATSAPP_TOPICS.some((x) => topics.includes(x)) && waUrl()) {
      out.push(linkButton(t('ai.btn.whatsapp'), waUrl(t('book.msgIntro')), true));
    }
    return out;
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

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function send(text) {
    const clean = String(text || '').trim().slice(0, 400);
    if (!clean || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    chips.hidden = true;
    bubble('user', clean);
    history = [...history, { role: 'user', content: clean }].slice(-MAX_HISTORY);

    const local = BRAIN.answer(clean);
    const dots = typing();
    const aiReply = aiAvailable ? await askAI(history) : null;
    if (!aiReply) await pause(REPLY_DELAY_MS);
    const reply = aiReply || local.text;
    const topics = local.topics.length ? local.topics : ['default'];
    dots.remove();
    bubble('assistant', reply, actionsFor(topics));
    history = [...history, { role: 'assistant', content: reply }].slice(-MAX_HISTORY);
    busy = false;
    sendBtn.disabled = false;
    if (finePointer()) input.focus();
  }

  /* ---------- Teaser ---------- */
  function teaserSeen() {
    try { return sessionStorage.getItem(TEASER_KEY) === '1'; } catch (e) { return false; }
  }

  function hideTeaser() {
    teaser.hidden = true;
    try { sessionStorage.setItem(TEASER_KEY, '1'); } catch (e) { /* storage blocked: teaser may show again */ }
  }

  if (!teaserSeen()) {
    setTimeout(() => { if (panel.hidden && !teaserSeen()) teaser.hidden = false; }, TEASER_DELAY_MS);
  }
  teaser.addEventListener('click', (e) => {
    hideTeaser();
    if (!teaserClose.contains(e.target)) setOpen(true);
  });

  const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Open / close & language ---------- */
  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('ai-open', open);
    if (open) {
      hideTeaser();
      if (!log.childElementCount) bubble('assistant', t('ai.greeting'));
      // Telefonda klavye yalnızca yazı kutusuna dokununca açılır.
      if (finePointer()) setTimeout(() => input.focus(), 50);
    }
  }

  function renderChips() {
    chips.replaceChildren(...['massage', 'booking', 'price', 'where'].map((key) => R.el('button', {
      type: 'button', class: 'ai-chip', text: t('ai.chip.' + key),
      onclick: () => send(t('ai.chip.' + key))
    })));
  }

  function applyLanguage() {
    launchLabel.textContent = t('ai.launch');
    launchStatus.textContent = t('ai.online');
    launcher.setAttribute('aria-label', t('ai.open'));
    teaserText.textContent = t('ai.teaser');
    teaserClose.setAttribute('aria-label', t('ai.close'));
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
