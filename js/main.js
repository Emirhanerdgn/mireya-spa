/* Page behaviour: header, mobile nav, reveal, gallery lightbox, reviews slider, contact info. */
(function () {
  const DATA = window.MIREYA_DATA;
  const CONFIG = window.MIREYA_CONFIG;
  const I18N = window.MireyaI18n;
  const R = window.MireyaRender;
  const t = (k) => I18N.t(k);

  const REVIEW_INTERVAL_MS = 7000;
  const HEADER_SOLID_AT = 40;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header & mobile nav ---------- */
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-nav-toggle]');

  function onScroll() {
    header.classList.toggle('is-solid', window.scrollY > HEADER_SOLID_AT);
  }

  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.open'));
  }

  toggle.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
  document.querySelectorAll('.main-nav a').forEach((a) => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  const revealer = ('IntersectionObserver' in window && !reduceMotion)
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((node) => {
      if (revealer) revealer.observe(node);
      else node.classList.add('is-visible');
    });
  }

  /* ---------- Gallery lightbox ---------- */
  const lb = document.querySelector('[data-lightbox]');
  const lbImg = lb.querySelector('[data-lb-img]');
  const lbCap = lb.querySelector('[data-lb-cap]');
  let lbIndex = 0;

  function showLightbox(i) {
    const count = DATA.gallery.length;
    lbIndex = (i + count) % count;
    const item = DATA.gallery[lbIndex];
    lbImg.src = item.src;
    lbImg.alt = t(item.key);
    lbCap.textContent = t(item.key);
    if (!lb.open) lb.showModal();
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-gallery-index]');
    if (trigger) showLightbox(Number(trigger.dataset.galleryIndex));
  });
  lb.querySelector('[data-lb-close]').addEventListener('click', () => lb.close());
  lb.querySelector('[data-lb-prev]').addEventListener('click', () => showLightbox(lbIndex - 1));
  lb.querySelector('[data-lb-next]').addEventListener('click', () => showLightbox(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });

  /* ---------- Reviews slider ---------- */
  let reviewIndex = 0;
  let reviewTimer = null;

  function showReview(i) {
    const slides = document.querySelectorAll('.review');
    const dots = document.querySelectorAll('[data-review-dot]');
    if (!slides.length) return;
    reviewIndex = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === reviewIndex));
    dots.forEach((d, n) => d.setAttribute('aria-current', String(n === reviewIndex)));
  }

  function startReviews() {
    if (reduceMotion) return;
    stopReviews();
    reviewTimer = window.setInterval(() => showReview(reviewIndex + 1), REVIEW_INTERVAL_MS);
  }

  function stopReviews() {
    if (reviewTimer) window.clearInterval(reviewTimer);
    reviewTimer = null;
  }

  function initReviews() {
    const section = document.querySelector('#reviews');
    document.querySelector('[data-review-prev]').addEventListener('click', () => { showReview(reviewIndex - 1); startReviews(); });
    document.querySelector('[data-review-next]').addEventListener('click', () => { showReview(reviewIndex + 1); startReviews(); });
    document.querySelector('[data-review-dots]').addEventListener('click', (e) => {
      const dot = e.target.closest('[data-review-dot]');
      if (dot) { showReview(Number(dot.dataset.reviewDot)); startReviews(); }
    });
    section.addEventListener('mouseenter', stopReviews);
    section.addEventListener('mouseleave', startReviews);
    section.addEventListener('focusin', stopReviews);
    startReviews();
  }

  /* ---------- Contact info from config ---------- */
  function setContact(key, value) {
    document.querySelectorAll('[data-contact="' + key + '"]').forEach((n) => {
      n.textContent = value || t('contact.soon');
      n.classList.toggle('is-pending', !value);
    });
  }

  function socialLink(url, iconId, label) {
    return R.el('a', { href: url, target: '_blank', rel: 'noopener', 'aria-label': label }, [R.icon(iconId)]);
  }

  function renderContact() {
    setContact('address', CONFIG.address);
    setContact('weekdays', CONFIG.hoursWeekdays);
    setContact('weekend', CONFIG.hoursWeekend);

    document.querySelectorAll('[data-contact="phone"]').forEach((n) => {
      if (!CONFIG.phoneDisplay) { n.textContent = t('contact.soon'); n.classList.add('is-pending'); return; }
      const tel = CONFIG.phoneDisplay.replace(/[^\d+]/g, '');
      n.replaceChildren(R.el('a', { href: 'tel:' + tel, text: CONFIG.phoneDisplay }));
      n.classList.remove('is-pending');
    });

    const maps = mapLinks();
    document.querySelectorAll('[data-contact="directions"]').forEach((a) => {
      a.hidden = !maps;
      if (maps) a.href = maps.page;
    });
    // Review link from the panel; otherwise the Google listing, where "Write a review" is one tap away
    const reviewUrl = /^https?:\/\//.test(CONFIG.googleReviewUrl || '') ? CONFIG.googleReviewUrl
      : (String(CONFIG.googleMapsCid || '').trim() ? maps && maps.page : '');
    document.querySelectorAll('[data-google-review]').forEach((a) => {
      a.hidden = !reviewUrl;
      if (reviewUrl) a.href = reviewUrl;
    });

    const socials = [
      CONFIG.instagram && socialLink(CONFIG.instagram, 'i-ig', 'Instagram'),
      CONFIG.facebook && socialLink(CONFIG.facebook, 'i-fb', 'Facebook')
    ].filter(Boolean);
    document.querySelectorAll('[data-contact="socials"]').forEach((n) => n.replaceChildren(...socials));
  }

  // Prefer the Google Business listing (shows the salon's name and reviews on the map)
  function mapLinks() {
    const cid = String(CONFIG.googleMapsCid || '').replace(/\D/g, '');
    if (cid) {
      return {
        page: 'https://www.google.com/maps?cid=' + cid,
        embed: 'https://maps.google.com/maps?cid=' + cid + '&output=embed'
      };
    }
    const query = CONFIG.mapQuery || CONFIG.address;
    if (!query) return null;
    return {
      page: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query),
      embed: 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&output=embed'
    };
  }

  function renderMap() {
    const frame = document.querySelector('[data-map]');
    const maps = mapLinks();
    if (!frame || !maps) return;
    frame.replaceChildren(R.el('iframe', {
      src: maps.embed,
      title: 'Mireya map', loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade'
    }));
  }

  /* ---------- Hero video (fades in over the photo once it can play) ---------- */
  function initHeroVideo() {
    const arch = document.querySelector('.hero-arch');
    const saveData = navigator.connection && navigator.connection.saveData;
    if (!arch || !CONFIG.heroVideo || reduceMotion || saveData) return;

    const video = R.el('video', {
      class: 'hero-video', muted: true, loop: true, playsinline: true, autoplay: true,
      preload: 'auto', 'aria-hidden': 'true', src: CONFIG.heroVideo
    });
    video.muted = true; // attribute alone is not enough for autoplay in some browsers
    video.addEventListener('canplay', () => {
      video.play().then(() => arch.classList.add('has-video')).catch(() => video.remove());
    }, { once: true });
    video.addEventListener('error', () => video.remove(), { once: true });
    arch.append(video);
  }

  /* ---------- Boot ---------- */
  document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });
  document.addEventListener('mireya:rendered', observeReveals);
  document.addEventListener('mireya:lang', () => {
    renderContact();
    toggle.setAttribute('aria-label', t(document.body.classList.contains('nav-open') ? 'nav.close' : 'nav.open'));
  });

  R.init();
  I18N.init();
  renderMap();
  initHeroVideo();
  initReviews();
  observeReveals();
  onScroll();
})();
