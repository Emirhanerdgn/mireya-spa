/*
 * Mireya assistant — built-in answers (used when the AI service is unavailable).
 * Understands SQ / SR / EN / TR questions without diacritics, can combine two topics,
 * recognises treatment names and suggests treatments for a need.
 */
(function () {
  const CONFIG = window.MIREYA_CONFIG;
  const DATA = window.MIREYA_DATA;
  const I18N = window.MireyaI18n;
  const t = (k) => I18N.t(k);
  const MAX_ANSWERS = 2;
  const MAX_SUGGESTIONS = 2;

  // Lower-case, strip accents and language-specific letters so "çmimi", "cmimi" and "CMIMI" match alike
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ı/g, 'i').replace(/đ/g, 'd').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9€\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Order matters: earlier topics are answered first
  const TOPICS = Object.freeze([
    ['decline', /\b(seks|sex|sexy|erot|intim|happy ending|extra servis|private massage|masazh privat|privatn|ozel masaj|vip ozel)/],
    ['cancel', /\b(anul|ndrysho|shtyj|otkaz|promen|pomer|izmen|cancel|change|resched|iptal|degistir|ertele)/],
    ['booking', /\b(rezerv|termin|randevu|book|appoint|zakaz|reserv|vend te lir|slobod)/],
    ['price', /(cmim|kushton|kosht|sa ben|cena|cene|cijen|kosta|koliko|fiyat|ucret|kac para|price|cost|how much|€|euro)/],
    ['duration', /(zgjat|sa minut|koliko traje|trajanje|how long|duration|minutes|kac dakika|ne kadar sur|sure ne)/],
    ['hours', /(orar|ne cfare ore|kur hapeni|kur mbyll|radno vreme|kada radite|do kada|working hours|opening|open|close|what time|calisma saat|kacta|kaca kadar|acik mi|kapali)/],
    ['where', /(adres|ku jeni|ku ndodh|lokacion|harte|harta|where|location|direction|map|nerede|nerde|konum|yol tarif|\bgde\b|gdje|lokacij|mapa|parking|parkim|parkir|otopark)/],
    ['contact', /(telefon|numer|numar|broj|phone|call|thirr|whatsapp|viber|instagram|kontakt|contact|iletisim|ulas)/],
    ['payment', /(pages|kartel|kesh|para ne dore|placan|kartic|gotovin|payment|pay by|card|cash|odeme|kredi kart|nakit)/],
    ['hygiene', /(higjien|paster|cist|higijen|hygien|clean|temiz|hijyen|steril)/],
    ['gift', /(dhurat|kupon|poklon|vaucer|gift|voucher|hediye)/],
    ['who', /(kush je|cfare je|robot|bot\b|njeri|ko si|jesi li covek|who are you|are you (a )?(human|real|bot)|kimsin|gercek misin|insan misin|yapay zeka)/],
    ['howareyou', /(si je|si jeni|kako si|kako ste|how are you|nasilsin|nasilsiniz|naber)/],
    ['thanks', /(faleminderit|flm|rrofsh|hvala|thank|thx|tesekkur|sagol|eyvallah)/],
    ['bye', /(mirupafshim|naten e mire|dovidjenja|vidimo se|bye|goodbye|see you|gorusuruz|hosca kal|iyi gunler|iyi aksamlar)/],
    ['massage', /(masazh|masaz|masaj|massage|tretman|trajtim|ritual|terapi|therap|cfare keni|sta imate|what do you offer|neler var|hizmet)/],
    ['greeting', /^(pershendetje|tung|mire dita|miredita|mirembrema|c kemi|zdravo|cao|dobar dan|dobro vece|hello|hi|hey|good (morning|evening)|merhaba|selam|iyi gunler)\b/]
  ]);

  // Needs → English treatment-name keywords used to pick suggestions from the menu
  const NEEDS = Object.freeze([
    ['pain', /(dhimbj|dhemb|shpin|qaf|supet|shpatull|\bboli?\b|\bbole\b|leda|ledj|vrat|ramen|pain|back|neck|shoulder|ache|stiff|agri|agriyor|bel\b|sirt|boyun|omuz|tutul)/, ['Deep Tissue', 'Medical', 'Back, Neck']],
    ['stress', /(stres|tension|relaks|qetes|lodh|gjum|opust|umor|nervoz|spav|relax|calm|tired|sleep|anxiet|rahatla|yorgun|uyku|gergin|dinlen)/, ['Aromatherapy', 'Swedish', 'Hot Stone']],
    ['sport', /(sport|stervit|palester|vrap|futboll|trening|teretan|trcan|gym|workout|running|antrenman|spor|kosu|fitness)/, ['Sports', 'Deep Tissue']],
    ['couple', /(cift|dashur|bashkeshort|partner|pervjetor|zajedno|devojk|momak|supru|godisnjic|couple|together|anniversary|girlfriend|boyfriend|wife|husband|sevgili|esim|birlikte|yildonum)/, ['Couples', 'Mandara']],
    ['pregnancy', /(shtatzen|barre|trudn|pregnan|expecting|hamile|gebe)/, ['Pregnancy']],
    ['head', /(koke|migren|glav|migren|headache|migraine|head|bas agri|basim|migren)/, ['Head', 'Shiatsu']],
    ['legs', /(kemb|shput|enjt|noge|stopal|otok|legs|feet|foot|swollen|ayak|bacak|odem|sislik|sisti)/, ['Reflexology', 'Lymph']],
    ['skin', /(fytyr|lekur|lice|koza|face|skin|glow|yuz|cilt)/, ['Facial', 'Gold']],
    ['special', /(dite e vecante|ditelindj|rodjendan|birthday|special|ozel gun|dogum gun|surpriz|surprise|luks|luksoz|luxury|luksuz)/, ['Signature', 'Couples', 'Gold']]
  ]);

  // Words shared by many treatment names, ignored when looking for a named treatment
  const GENERIC_WORD = /^(masaz\w*|masaj\w*|massag\w*|terapi\w*|therap\w*|ritual\w*|trajtim\w*|tretman\w*|klasik\w*|classic)$/;

  function visibleServices() {
    return DATA.services || [];
  }

  function serviceName(s) {
    return t('svc.' + s.id + '.name');
  }

  function serviceDesc(s) {
    return t('svc.' + s.id + '.desc');
  }

  function englishName(s) {
    return String((s.name && s.name.en) || '');
  }

  // A treatment named in the question, in any of the four languages
  function findNamedService(norm) {
    let best = null;
    visibleServices().forEach((s) => {
      Object.values(s.name || {}).forEach((n) => {
        const words = normalize(n).split(' ').filter((w) => w.length >= 4 && !GENERIC_WORD.test(w));
        const key = words[0];
        if (key && norm.includes(key) && (!best || key.length > best.key.length)) best = { s, key };
      });
    });
    return best && best.s;
  }

  function suggestFor(norm) {
    const need = NEEDS.find(([, re]) => re.test(norm));
    if (!need) return null;
    const picks = need[2]
      .map((kw) => visibleServices().find((s) => englishName(s).toLowerCase().includes(kw.toLowerCase())))
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, MAX_SUGGESTIONS);
    if (!picks.length) return null;
    return t('ai.r.recommend')
      .replace('{list}', picks.map(serviceName).join(' / '))
      .replace('{desc}', serviceDesc(picks[0]));
  }

  function hoursText() {
    if (!CONFIG.hoursWeekdays) return t('ai.r.hoursUnknown');
    const hours = CONFIG.hoursWeekdays + (CONFIG.hoursWeekend ? ' / ' + CONFIG.hoursWeekend : '');
    return t('ai.r.hours').replace('{hours}', hours);
  }

  function topicAnswer(topic) {
    switch (topic) {
      case 'where': return t('ai.r.where').replace('{address}', CONFIG.address || '');
      case 'hours': return hoursText();
      case 'contact': return t('ai.r.contact').replace('{phone}', CONFIG.phoneDisplay || '');
      case 'massage': return t('ai.r.massage').replace('{list}', DATA.rituals.map((r) => t('svc.' + r.id + '.name')).join(', '));
      default: return t('ai.r.' + topic);
    }
  }

  const SOCIAL = Object.freeze(['greeting', 'thanks', 'bye', 'howareyou']);

  /** @returns {{ text: string, topics: string[] }} */
  function answer(question) {
    const norm = normalize(question);
    const topics = TOPICS.filter(([, re]) => re.test(norm)).map(([name]) => name);
    if (topics.includes('decline')) return { text: t('ai.r.decline'), topics: ['decline'] };

    const parts = [];
    // A described need ("my back hurts") wins over a body word that happens to be in a treatment name
    const suggestion = suggestFor(norm);
    const named = suggestion ? null : findNamedService(norm);
    if (suggestion) parts.push(suggestion);
    if (named) parts.push(t('ai.r.service').replace('{name}', serviceName(named)).replace('{desc}', serviceDesc(named)));

    const others = topics.filter((x) => !SOCIAL.includes(x));
    const factual = others.filter((x) => {
      if (x === 'massage') return !named && !suggestion && others.length === 1; // general list only when asked on its own
      if (x === 'booking') return !others.includes('cancel');
      return true;
    });
    factual.forEach((x) => { if (parts.length < MAX_ANSWERS) parts.push(topicAnswer(x)); });

    if (!parts.length) {
      const social = topics.find((x) => SOCIAL.includes(x));
      parts.push(social ? t('ai.r.' + social) : t('ai.r.default'));
    }
    const allTopics = [...new Set([...topics, ...(named || suggestion ? ['massage'] : [])])];
    return { text: parts.join(' '), topics: allTopics };
  }

  window.MireyaBrain = Object.freeze({ answer, normalize });
})();
