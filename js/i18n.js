/* Language engine: SQ · SR · EN · TR */
(function () {
  const DICTS = window.MIREYA_I18N || {};
  const CONFIG = window.MIREYA_CONFIG || {};
  const LANGS = Object.freeze(['sq', 'sr', 'en', 'tr']);
  const STORAGE_KEY = 'mireya-lang';
  const BROWSER_MAP = Object.freeze({ sq: 'sq', sr: 'sr', hr: 'sr', bs: 'sr', me: 'sr', en: 'en', tr: 'tr' });

  let current = CONFIG.defaultLang || 'sq';

  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function writeStored(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable: choice lasts this visit */ }
  }

  function detectInitial() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    const stored = readStored();
    if (LANGS.includes(stored)) return stored;
    const browser = (navigator.languages || [navigator.language || ''])
      .map((l) => BROWSER_MAP[String(l).slice(0, 2).toLowerCase()])
      .find(Boolean);
    return browser || CONFIG.defaultLang || 'sq';
  }

  function t(key) {
    const dict = DICTS[current] || {};
    if (key in dict) return dict[key];
    if (DICTS.en && key in DICTS.en) return DICTS.en[key];
    return key;
  }

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)); });

    document.documentElement.lang = current;
    document.title = t('meta.title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));
  }

  function renderSwitchers() {
    document.querySelectorAll('[data-lang-switch]').forEach((wrap) => {
      wrap.replaceChildren(...LANGS.map((lang) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = lang.toUpperCase();
        btn.lang = lang;
        btn.title = (DICTS[lang] && DICTS[lang]['lang.name']) || lang;
        btn.setAttribute('aria-pressed', String(lang === current));
        btn.addEventListener('click', () => setLang(lang));
        return btn;
      }));
    });
  }

  function setLang(lang) {
    if (!LANGS.includes(lang)) return;
    current = lang;
    writeStored(lang);
    applyStatic();
    renderSwitchers();
    document.dispatchEvent(new CustomEvent('mireya:lang', { detail: { lang } }));
  }

  window.MireyaI18n = Object.freeze({
    t,
    setLang,
    get lang() { return current; },
    init() { setLang(detectInitial()); }
  });
})();
