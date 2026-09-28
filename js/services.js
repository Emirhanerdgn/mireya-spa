/*
 * Service catalogue. Names and descriptions live in js/i18n/<lang>.js
 * under "svc.<id>.name" / "svc.<id>.desc".
 * Prices are placeholders — edit here (durations in minutes, prices in €).
 * To remove a service, delete its line.
 */
(function () {
  const IMG = 'assets/img/';

  const categories = Object.freeze(['classic', 'eastern', 'signature']);

  const services = Object.freeze([
    // Classic & therapeutic
    { id: 'swedish', cat: 'classic', durations: [30, 60, 90], prices: [20, 35, 50], img: 'mireya-towel-massage.jpg' },
    { id: 'deep', cat: 'classic', durations: [60, 90], prices: [40, 55], img: 'mireya-towel-massage.jpg' },
    { id: 'medical', cat: 'classic', durations: [45, 60], prices: [35, 45], img: 'mireya-towel-massage.jpg' },
    { id: 'sports', cat: 'classic', durations: [60], prices: [40], img: 'stock-sports.jpg' },
    { id: 'backneck', cat: 'classic', durations: [30, 45], prices: [20, 28], img: 'mireya-towel-massage.jpg' },
    { id: 'reflexology', cat: 'classic', durations: [30, 45], prices: [20, 28], img: 'stock-reflexology.jpg' },
    { id: 'head', cat: 'classic', durations: [30], prices: [20], img: 'stock-head-massage.jpg' },
    { id: 'lymph', cat: 'classic', durations: [60], prices: [45], img: 'mireya-treatment-room.jpg' },
    { id: 'cellulite', cat: 'classic', durations: [45, 60], prices: [35, 45], img: 'mireya-towel-massage.jpg' },

    // Far-Eastern & aromatic
    { id: 'thai', cat: 'eastern', durations: [60, 90], prices: [40, 55], img: 'stock-thai.jpg' },
    { id: 'bali', cat: 'eastern', durations: [60, 90], prices: [40, 55], img: 'mireya-oil-ritual.jpg' },
    { id: 'shiatsu', cat: 'eastern', durations: [60], prices: [40], img: 'mireya-treatment-room.jpg' },
    { id: 'lomi', cat: 'eastern', durations: [60, 90], prices: [45, 60], img: 'mireya-oil-ritual.jpg' },
    { id: 'aroma', cat: 'eastern', durations: [60, 90], prices: [38, 52], img: 'mireya-oil-ritual.jpg' },
    { id: 'hotstone', cat: 'eastern', durations: [75], prices: [50], img: 'mireya-hot-stone.jpg' },
    { id: 'bamboo', cat: 'eastern', durations: [60], prices: [45], img: 'mireya-hot-stone.jpg' },
    { id: 'cupping', cat: 'eastern', durations: [45], prices: [35], img: 'mireya-hot-stone.jpg' },

    // Signature & special
    { id: 'mireya', cat: 'signature', durations: [120], prices: [90], img: 'mireya-treatment-room.jpg', featured: true },
    { id: 'couple', cat: 'signature', durations: [60, 90], prices: [70, 100], img: 'mireya-couple-suite.jpg' },
    { id: 'gold', cat: 'signature', durations: [75], prices: [70], img: 'stock-facial-mask.jpg' },
    { id: 'mandara', cat: 'signature', durations: [60], prices: [80], img: 'mireya-oil-ritual.jpg' },
    { id: 'candle', cat: 'signature', durations: [60], prices: [45], img: 'mireya-treatment-room.jpg' },
    { id: 'prenatal', cat: 'signature', durations: [60], prices: [40], img: 'mireya-lounge-robe.jpg' },
    { id: 'facial', cat: 'signature', durations: [45], prices: [35], img: 'stock-facial.jpg' }
  ].map((s) => Object.freeze({ ...s, img: IMG + s.img })));

  // Large cards in the "Signature rituals" section
  const rituals = Object.freeze([
    { id: 'mireya', img: IMG + 'mireya-treatment-room.jpg', pos: '50% 50%' },
    { id: 'hotstone', img: IMG + 'mireya-hot-stone.jpg', pos: '8% 50%' },
    { id: 'couple', img: IMG + 'mireya-couple-suite.jpg', pos: '50% 50%' },
    { id: 'aroma', img: IMG + 'mireya-oil-ritual.jpg', pos: '76% 50%' }
  ]);

  const gallery = Object.freeze([
    { src: IMG + 'mireya-towel-massage.jpg', key: 'gallery.candles', tall: true },
    { src: IMG + 'mireya-treatment-room.jpg', key: 'gallery.room' },
    { src: IMG + 'mireya-couple-suite.jpg', key: 'gallery.couple' },
    { src: IMG + 'mireya-hot-stone.jpg', key: 'gallery.stones' },
    { src: IMG + 'mireya-lounge-robe.jpg', key: 'gallery.relax' },
    { src: IMG + 'mireya-oil-ritual.jpg', key: 'gallery.oils' },
    { src: IMG + 'mireya-reception.jpg', key: 'gallery.reception', tall: true },
    { src: IMG + 'mireya-facade.jpg', key: 'gallery.facade' },
    { src: IMG + 'mireya-lounge.jpg', key: 'gallery.lounge' }
  ]);

  // Placeholder reviews — shown in their original language. Replace with real ones.
  const reviews = Object.freeze([
    { name: 'Arta K.', lang: 'SQ', stars: 5, text: 'Ambient i mrekullueshëm dhe staf shumë profesional. Masazhi me gurë të nxehtë ishte përvoja më relaksuese që kam pasur ndonjëherë. Do të kthehem patjetër!' },
    { name: 'Milica S.', lang: 'SR', stars: 5, text: 'Prelep prostor, sve je besprekorno čisto, a terapeutkinja je znala tačno gde je napetost. Aromaterapija je bila pravi odmor za telo i dušu.' },
    { name: 'Sarah M.', lang: 'EN', stars: 5, text: 'An absolute gem. From the warm welcome at the reception to the signature ritual, every detail felt thoughtful and luxurious. Best massage I have had in the Balkans.' },
    { name: 'Blerim H.', lang: 'SQ', stars: 5, text: 'Masazh sportiv i shkëlqyer pas stërvitjes. Terapisti e kuptoi menjëherë çfarë më duhej. Rekomandim i sinqertë.' },
    { name: 'Nikola P.', lang: 'SR', stars: 5, text: 'Rezervisao sam masažu za parove za godišnjicu — atmosfera, muzika i ulja su bili savršeni. Toplo preporučujem.' },
    { name: 'James T.', lang: 'EN', stars: 5, text: 'Quiet, elegant and spotless. The deep tissue massage finally released my shoulders after a long flight. Booking via WhatsApp was effortless.' }
  ]);

  window.MIREYA_DATA = Object.freeze({ categories, services, rituals, gallery, reviews });
})();
