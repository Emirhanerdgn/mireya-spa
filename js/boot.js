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
  const CONTENT_FILES = ['settings', 'images', 'services', 'gallery', 'reviews', 'ui', 'site'];
  const SECTION_TARGETS = Object.freeze({
    marquee: '.marquee', about: '#about', rituals: '#rituals', menu: '#menu', journey: '.journey',
    gallery: '#gallery', instagram: '#instagram', reviews: '#reviews', booking: '#booking', contact: '#contact'
  });
  const ACCENTS = Object.freeze({
    champagne: ['#d8c3a0', '#f3e7cf', '#a08a63', 'linear-gradient(100deg, #f7efdf 0%, #d8c3a0 45%, #a8916a 100%)'],
    rose: ['#c99a86', '#efd3c6', '#9b6a58', 'linear-gradient(100deg, #f5ddd2 0%, #c99a86 45%, #95614f 100%)'],
    bronze: ['#b0793f', '#e0b98a', '#7f5227', 'linear-gradient(100deg, #e8c79e 0%, #b0793f 45%, #7a4d22 100%)']
  });
  const SCRIPTS = [
    'js/i18n/sq.js', 'js/i18n/sr.js', 'js/i18n/en.js', 'js/i18n/tr.js',
    'js/i18n.js', 'js/render.js', 'js/booking.js', 'js/main.js', 'js/assistant-brain.js', 'js/assistant.js'
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

  // Panel accepts a full link, "@name" or just "name"
  function socialUrl(value, base) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    const handle = v.replace(/^@/, '').replace(/^(www\.)?(instagram|facebook)\.com\//i, '').replace(/\/+$/, '');
    return /^[A-Za-z0-9._-]{1,60}$/.test(handle) ? base + handle + '/' : '';
  }

  function instagramUrl(value) {
    return socialUrl(value, 'https://www.instagram.com/');
  }

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
      // content/ui.json: { lang: { section: { field: text } } } -> "section.field" (field "_" = ".")
      Object.entries((c.ui && c.ui[lang]) || {}).forEach(([section, fields]) => {
        Object.entries(fields || {}).forEach(([field, v]) => {
          if (filled(v)) extra[section + '.' + field.replace(/_/g, '.')] = v;
        });
      });
      const site = c.site || {};
      (site.stats || []).forEach((st, i) => {
        if (st.label && filled(st.label[lang])) extra['stat.' + i] = st.label[lang];
      });
      if (site.announcement && site.announcement.text && filled(site.announcement.text[lang])) {
        extra['announce.text'] = site.announcement.text[lang];
      }
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
    const site = c.site || {};
    const look = site.appearance || {};
    const services = buildServices(c.services && c.services.services);

    window.MIREYA_CONFIG = Object.freeze({
      ...BASE_CONFIG,
      ...Object.fromEntries(Object.entries(settings).filter(([, v]) => filled(v))),
      showPricing: Boolean(settings.showPricing),
      heroVideo: look.heroVideo === false ? '' : (images.heroVideo || ''),
      defaultLang: LANGS.includes(site.defaultLang) ? site.defaultLang : (BASE_CONFIG.defaultLang || 'sq'),
      assistant: look.assistant !== false,
      instagram: instagramUrl(settings.instagram),
      facebook: socialUrl(settings.facebook, 'https://facebook.com/')
    });

    window.MIREYA_DATA = Object.freeze({
      categories: CATEGORIES,
      services: Object.freeze(services),
      rituals: Object.freeze(services.filter((s) => s.featured).slice(0, MAX_RITUALS)
        .map((s) => Object.freeze({ id: s.id, img: s.img, pos: s.pos }))),
      gallery: Object.freeze(((c.gallery && c.gallery.items) || []).filter((g) => g && g.image)
        .map((g, i) => Object.freeze({ src: g.image, key: 'gal.' + i, tall: Boolean(g.tall) }))),
      reviews: Object.freeze(buildReviews(c.reviews && c.reviews.items)),
      stats: Object.freeze((site.stats || []).map((st, i) => Object.freeze({
        value: filled(st.value) ? String(st.value) : String(services.length),
        key: 'stat.' + i
      })))
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
    applySite(site);
    return services;
  }

  function hideTarget(selector) {
    document.querySelectorAll(selector).forEach((n) => { n.hidden = true; });
    if (selector.startsWith('#')) {
      document.querySelectorAll('a[href="' + selector + '"]').forEach((a) => { (a.closest('li') || a).hidden = true; });
    }
  }

  // Booking hidden: its buttons lead to the contact section instead
  function redirectBookingLinks(toContact) {
    document.querySelectorAll('a[href="#booking"]').forEach((a) => {
      a.setAttribute('href', toContact ? '#contact' : '#top');
      a.hidden = false;
      const li = a.closest('li');
      if (li) li.hidden = false;
    });
  }

  function applyAnnouncement(ann) {
    const bar = document.querySelector('[data-announce]');
    if (!bar || !ann || !ann.enabled) return;
    const link = bar.querySelector('[data-announce-link]');
    if (filled(ann.link)) {
      link.href = ann.link;
      if (/^https?:/.test(ann.link)) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
    }
    bar.hidden = false;
    document.documentElement.classList.add('has-announce');
  }

  // "Görünüm ve Bölümler" panel options
  function applySite(site) {
    const sections = site.sections || {};
    Object.entries(SECTION_TARGETS).forEach(([name, selector]) => {
      if (sections[name] === false) hideTarget(selector);
    });
    if (sections.booking === false) redirectBookingLinks(sections.contact !== false);

    const look = site.appearance || {};
    const accent = ACCENTS[look.accent];
    if (accent) {
      const root = document.documentElement.style;
      ['--gold', '--gold-light', '--gold-deep', '--gold-grad'].forEach((v, i) => root.setProperty(v, accent[i]));
    }
    if (look.animations === false) document.documentElement.classList.add('no-motion');
    if (look.whatsappButton === false) {
      document.querySelectorAll('.wa-float').forEach((n) => { n.hidden = true; });
    }
    applyAnnouncement(site.announcement);
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
