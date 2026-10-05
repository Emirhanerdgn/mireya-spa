/*
 * MIREYA — technical defaults.
 * Contact details, hours, photos, services, gallery, reviews and page texts
 * are edited from the admin panel (Pages CMS) and live in content/*.json.
 */
window.MIREYA_CONFIG = Object.freeze({
  // Booking time slots offered in the form (24h, 30-min steps); overridable from the panel
  bookingOpen: '10:00',
  bookingClose: '22:00',

  // Optional: a Formspree / Web3Forms style endpoint that accepts JSON POST.
  // When set, the booking form posts here; otherwise it opens WhatsApp.
  formEndpoint: '',

  // Digital assistant (Cloudflare Worker → Claude). Without an API key it answers common questions itself.
  assistantEndpoint: 'https://mireya-assistant.yayin-worker.workers.dev/api/chat',

  defaultLang: 'sq',
  currency: '€'
});
