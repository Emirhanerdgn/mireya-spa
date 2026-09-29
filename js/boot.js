/*
 * Loads the editable content (content/*.json, managed from the Pages CMS panel),
 * turns it into the data/config/translation globals the site scripts expect,
 * then starts those scripts in order.
 */
(function () {
  const BASE_CONFIG = window.MIREYA_CONFIG || {};
  const LANGS = ['sq', 'sr', 'en', 'tr'];
  const CATEGORIES = Object.freeze(['classic', 'eastern', 'signature']);
  const FOCUS = Object.freeze({ left: '15% 50%', center: '50% 50%', right: '85% 50%' });
  const MAX_RITUALS = 4;
  const CONTENT_FILES = ['settings', 'images', 'services', 'gallery', 'reviews', 'texts'];
  const SCRIPTS = [
    'js/i18n/sq.js', 'js/i18n/sr.js', 'js/i18n/en.js', 'js/i18n/tr.js',
    'js/i18n.js', 'js/render.js', 'js/booking.js', 'js/main.js'
  ];
  const VERSION = (document.currentScript && document.currentScript.src.split('?v=')[1]) || '';

  async function loadJson(name) {
    const res = await fetch('content/' + name + '.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('content/' + name + '.json responded ' + res.status);
    return res.json();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src + (VERSION ? '?v=' + VERSION : '');
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.body.append(s);
    });
  }

  const filled = (v) => typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null;

  function buildServices(list) {
    return (list || [])
      .filter((s) => s && s.visible !== false && CATEGORIES.includes(s.category))
      .map((s, i) => {
        const sessions = (s.sessions || []).filter((x) => Number(x.minutes) > 0);
        return Object.freeze({
          id: 's' + i,
          cat: s.category,
          img: s.image || '',
          featured: Boolean(s.featured),
          pos: FOCUS[s.imageFocus] || FOCUS.center,
          durations: sessions.map((x) => Number(x.minutes)),
          prices: sessions.map((x) => Number(x.price) || 0),
          name: s.name || {},
          description: s.description || {}
        });
      });
  }

  function buildReviews(list) {
    return (list || []).filter((r) => r && filled(r.text)).map((r) => Object.freeze({
      name: r.name || '',
      lang: String(r.language || 'EN').toUpperCase(),
      stars: Math.min(5, Math.max(1, Number(r.stars) || 5)),
      text: r.text
    }));
  }

  // Page texts, service names and gallery captions become translation keys.
  function buildTranslations(c, services) {
    const dicts = window.MIREYA_I18N || {};
    const next = {};
    LANGS.forEach((lang) => {
      const extra = {};
      Object.entries((c.texts && c.texts[lang]) || {}).forEach(([k, v]) => {
        if (filled(v)) extra[k.replace('_', '.')] = v;
      });
      services.forEach((s) => {
        if (filled(s.name[lang])) extra['svc.' + s.id + '.name'] = s.name[lang];
        if (filled(s.description[lang])) extra['svc.' + s.id + '.desc'] = s.description[lang];
      });
      ((c.gallery && c.gallery.items) || []).forEach((g, i) => {
        if (g.caption && filled(g.caption[lang])) extra['gal.' + i] = g.caption[lang];
      });
      next[lang] = Object.freeze({ ...(dicts[lang] || {}), ...extra });
    });
    window.MIREYA_I18N = next;
  }

  function applyContent(c) {
    const settings = c.settings || {};
    const images = c.images || {};
    const services = buildServices(c.services && c.services.services);

    window.MIREYA_CONFIG = Object.freeze({
      ...BASE_CONFIG,
      ...Object.fromEntries(Object.entries(settings).filter(([, v]) => filled(v))),
      showPricing: Boolean(settings.showPricing),
      heroVideo: images.heroVideo || ''
    });

    window.MIREYA_DATA = Object.freeze({
      categories: CATEGORIES,
      services: Object.freeze(services),
      rituals: Object.freeze(services.filter((s) => s.featured).slice(0, MAX_RITUALS)
        .map((s) => Object.freeze({ id: s.id, img: s.img, pos: s.pos }))),
      gallery: Object.freeze(((c.gallery && c.gallery.items) || []).filter((g) => g && g.image)
        .map((g, i) => Object.freeze({ src: g.image, key: 'gal.' + i, tall: Boolean(g.tall) }))),
      reviews: Object.freeze(buildReviews(c.reviews && c.reviews.items))
    });

    document.querySelectorAll('[data-img]').forEach((img) => {
      const src = images[img.dataset.img];
      if (filled(src)) img.src = src;
    });

    const reviews = window.MIREYA_DATA.reviews;
    const note = document.querySelector('.review-note');
    if (note) note.hidden = !(c.reviews && c.reviews.showSampleNote);
    if (!reviews.length) {
      document.querySelectorAll('#reviews, a[href="#reviews"]').forEach((n) => {
        (n.closest('li') || n).hidden = true;
      });
    }
    return services;
  }

  async function start() {
    const entries = await Promise.all(CONTENT_FILES.map(async (name) => [name, await loadJson(name)]));
    const content = Object.fromEntries(entries);
    for (const src of SCRIPTS.slice(0, 4)) await loadScript(src); // dictionaries first
    const services = applyContent(content);
    buildTranslations(content, services);
    for (const src of SCRIPTS.slice(4)) await loadScript(src);
  }

  start().catch((err) => {
    console.error('[Mireya] content could not be loaded', err);
    document.body.classList.add('content-error');
  });
})();
