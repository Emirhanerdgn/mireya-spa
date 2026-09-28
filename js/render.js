/* Renders data-driven sections (rituals, menu, gallery, reviews, marquee). */
(function () {
  const DATA = window.MIREYA_DATA;
  const CONFIG = window.MIREYA_CONFIG;
  const I18N = window.MireyaI18n;
  const t = (k) => I18N.t(k);

  let activeCat = DATA.categories[0];

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children).filter(Boolean).forEach((c) => node.append(c));
    return node;
  }

  function icon(id, cls = 'ico') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.append(use);
    return svg;
  }

  const price = (p) => CONFIG.currency + p;
  const minutes = (d) => d + ' ' + t('menu.min');
  const svcName = (id) => t('svc.' + id + '.name');
  const svcDesc = (id) => t('svc.' + id + '.desc');
  const findService = (id) => DATA.services.find((s) => s.id === id);

  function fromPrice(s) {
    const min = Math.min(...s.prices);
    return s.prices.length > 1 ? t('rituals.from').replace('{p}', price(min)) : price(min);
  }

  function selectService(id) {
    document.dispatchEvent(new CustomEvent('mireya:select-service', { detail: { id } }));
  }

  /* ---------- Marquee ---------- */
  function renderMarquee() {
    const track = document.querySelector('[data-marquee]');
    if (!track) return;
    const names = DATA.services.map((s) => svcName(s.id));
    const items = names.concat(names).map((n) => el('span', {}, [n, el('i', { 'aria-hidden': 'true' })]));
    track.replaceChildren(...items);
  }

  /* ---------- Rituals ---------- */
  function renderRituals() {
    const grid = document.querySelector('[data-rituals]');
    if (!grid) return;
    const cards = DATA.rituals.map((r, i) => {
      const s = findService(r.id);
      if (!s) return null;
      return el('article', { class: 'ritual-card reveal' }, [
        el('img', { src: r.img, alt: svcName(r.id), loading: 'lazy', width: 1024, height: 687, style: r.pos ? 'object-position:' + r.pos : null }),
        el('div', { class: 'rc-body' }, [
          el('span', { class: 'rc-idx', text: String(i + 1).padStart(2, '0') }),
          el('h3', { text: svcName(r.id) }),
          el('p', { class: 'rc-desc', text: svcDesc(r.id) }),
          CONFIG.showPricing && el('div', { class: 'rc-meta' }, [
            el('span', { text: s.durations.join(' / ') + ' ' + t('menu.min') }),
            el('strong', { text: fromPrice(s) })
          ]),
          el('button', { class: 'rc-btn', type: 'button', onclick: () => selectService(r.id) }, [
            el('span', { text: t('rituals.choose') }), icon('i-arrow')
          ])
        ])
      ]);
    });
    grid.replaceChildren(...cards.filter(Boolean));
  }

  /* ---------- Menu ---------- */
  function renderMenuTabs() {
    const tabs = document.querySelector('[data-menu-tabs]');
    if (!tabs) return;
    tabs.replaceChildren(...DATA.categories.map((cat) => el('button', {
      type: 'button',
      role: 'tab',
      class: 'menu-tab',
      'aria-selected': String(cat === activeCat),
      text: t('menu.cat.' + cat),
      onclick: () => { activeCat = cat; renderMenuTabs(); renderMenuList(); }
    })));
  }

  function setPreview(src) {
    const img = document.querySelector('[data-menu-preview]');
    if (!img || img.getAttribute('src') === src) return;
    img.classList.add('is-swapping');
    const next = new Image();
    next.onload = () => { img.src = src; img.classList.remove('is-swapping'); };
    next.onerror = () => img.classList.remove('is-swapping');
    next.src = src;
  }

  function menuItem(s) {
    const options = s.durations.map((d, i) => el('li', {}, [
      el('span', { text: minutes(d) }), el('strong', { text: price(s.prices[i]) })
    ]));
    return el('article', {
      class: 'menu-item',
      onmouseenter: () => setPreview(s.img),
      onfocusin: () => setPreview(s.img)
    }, [
      el('div', { class: 'mi-head' }, [
        el('h3', { text: svcName(s.id) }),
        CONFIG.showPricing && el('span', { class: 'mi-leader', 'aria-hidden': 'true' }),
        CONFIG.showPricing && el('span', { class: 'mi-price', text: fromPrice(s) })
      ]),
      el('p', { class: 'mi-desc', text: svcDesc(s.id) }),
      el('div', { class: 'mi-foot' }, [
        CONFIG.showPricing ? el('ul', { class: 'mi-options' }, options) : el('span'),
        el('button', { class: 'mi-book', type: 'button', onclick: () => selectService(s.id) }, [
          el('span', { text: t('menu.book') }), icon('i-arrow')
        ])
      ])
    ]);
  }

  function renderMenuList() {
    const list = document.querySelector('[data-menu-list]');
    if (!list) return;
    const items = DATA.services.filter((s) => s.cat === activeCat);
    list.replaceChildren(...items.map(menuItem));
    list.classList.remove('fade-in');
    void list.offsetWidth; // restart the fade animation
    list.classList.add('fade-in');
    if (items[0]) setPreview(items[0].img);
  }

  /* ---------- Gallery ---------- */
  function renderGallery() {
    const grid = document.querySelector('[data-gallery]');
    if (!grid) return;
    grid.replaceChildren(...DATA.gallery.map((g, i) => el('button', {
      type: 'button',
      class: 'g-item reveal' + (g.tall ? ' tall' : ''),
      'data-gallery-index': i,
      'aria-label': t(g.key)
    }, [
      el('img', { src: g.src, alt: t(g.key), loading: 'lazy' }),
      el('span', { class: 'g-cap', text: t(g.key) })
    ])));
  }

  /* ---------- Reviews (original language, rendered once) ---------- */
  function renderReviews() {
    const stage = document.querySelector('[data-reviews]');
    const dots = document.querySelector('[data-review-dots]');
    if (!stage || !dots) return;
    stage.replaceChildren(...DATA.reviews.map((r, i) => el('blockquote', {
      class: 'review' + (i === 0 ? ' is-active' : ''), lang: r.lang.toLowerCase()
    }, [
      el('div', { class: 'stars', 'aria-label': r.stars + '/5' }, Array.from({ length: r.stars }, () => icon('i-star'))),
      el('p', { text: '“' + r.text + '”' }),
      el('footer', {}, [el('cite', { text: r.name }), el('span', { class: 'lang-tag', text: r.lang })])
    ])));
    dots.replaceChildren(...DATA.reviews.map((r, i) => el('button', {
      type: 'button', class: 'dot', 'aria-label': String(i + 1), 'aria-current': String(i === 0), 'data-review-dot': i
    })));
  }

  function renderCounts() {
    document.querySelectorAll('[data-service-count]').forEach((n) => { n.textContent = String(DATA.services.length); });
  }

  function renderLocalized() {
    renderMarquee();
    renderRituals();
    renderMenuTabs();
    renderMenuList();
    renderGallery();
    document.dispatchEvent(new CustomEvent('mireya:rendered'));
  }

  window.MireyaRender = Object.freeze({
    el,
    icon,
    svcName,
    findService,
    minutes,
    price,
    init() {
      renderReviews();
      renderCounts();
      document.addEventListener('mireya:lang', renderLocalized);
    }
  });
})();
