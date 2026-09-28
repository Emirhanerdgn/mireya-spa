/*
 * MIREYA — site settings.
 * Fill in the empty values when the information is ready; the site
 * shows a "coming soon" label for anything left empty.
 */
window.MIREYA_CONFIG = Object.freeze({
  // International format, digits only, e.g. "38344123456"
  whatsappNumber: '38345579532',
  // Displayed phone, e.g. "+383 44 123 456"
  phoneDisplay: '+383 45 579 532',
  email: '',
  instagram: '', // full URL
  facebook: '',  // full URL

  // Address line shown in the contact section, e.g. "Rr. ... 18, Prishtinë"
  address: '18 17 Shkurti, Fushë-Kosovë 12000',
  // Google Maps search text for the embedded map (usually same as address)
  mapQuery: '17 Shkurti 18, Fushë Kosovë 12000, Kosovo',

  // Opening hours, e.g. "10:00 – 22:00". Leave empty until known.
  hoursWeekdays: '',
  hoursWeekend: '',

  // Booking time slots offered in the form (24h, 30-min steps)
  bookingOpen: '10:00',
  bookingClose: '22:00',

  // Optional: a Formspree / Web3Forms style endpoint that accepts JSON POST.
  // When set, the booking form posts here; otherwise it opens WhatsApp.
  formEndpoint: '',

  // Logo video shown inside the hero arch (vertical 9:16 MP4 works best).
  // If the file is missing, the reception photo stays in place.
  heroVideo: 'assets/video/mireya-hero.mp4',

  // Durations and prices in the menu, ritual cards and booking form
  showPricing: false,

  defaultLang: 'sq',
  currency: '€'
});
