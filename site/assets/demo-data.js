/* Datos de ejemplo para la demo del CRM de Inmoconecta Huancayo.
   Todo es ficticio y se genera de forma determinista respecto a la hora actual,
   para que los tiempos de espera y los contadores se vean "en vivo". */
(function () {
  'use strict';

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SOURCES = {
    fb: { label: 'Facebook Lead Ads', short: 'Meta · FB', group: 'meta' },
    ig: { label: 'Instagram Lead Ads', short: 'Meta · IG', group: 'meta' },
    tt: { label: 'TikTok Lead Gen', short: 'TikTok', group: 'tiktok' },
    wa: { label: 'WhatsApp directo', short: 'WhatsApp', group: 'otros' },
    web: { label: 'Sitio web', short: 'Web', group: 'otros' },
    portal: { label: 'Portales inmobiliarios', short: 'Portales', group: 'otros' },
    ref: { label: 'Referido', short: 'Referido', group: 'otros' }
  };

  const STAGES = [
    { id: 'nuevo', label: 'Nuevo' },
    { id: 'contactado', label: 'Contactado' },
    { id: 'calificado', label: 'Calificado' },
    { id: 'visita', label: 'Visita' },
    { id: 'negociacion', label: 'Negociación' },
    { id: 'separacion', label: 'Separación' },
    { id: 'ganado', label: 'Cerrado' },
    { id: 'perdido', label: 'Perdido' }
  ];

  const LOSS_BY_STAGE = [
    ['No responde', 'No responde', 'No responde', 'Datos falsos o duplicado'],
    ['Solo estaba averiguando', 'Precio fuera de presupuesto', 'No responde'],
    ['Precio fuera de presupuesto', 'No califica a crédito', 'Ubicación no le convence', 'Solo estaba averiguando'],
    ['La propiedad no le convenció', 'Ubicación no le convence', 'Precio fuera de presupuesto', 'Compró con otra inmobiliaria'],
    ['No hubo acuerdo en precio', 'No califica a crédito', 'Compró con otra inmobiliaria'],
    ['Crédito denegado por el banco', 'Desistió de la compra']
  ];

  const LOSS_REASONS = [
    'No responde', 'Datos falsos o duplicado', 'Solo estaba averiguando', 'Precio fuera de presupuesto',
    'No califica a crédito', 'Ubicación no le convence', 'La propiedad no le convenció',
    'Compró con otra inmobiliaria', 'No hubo acuerdo en precio', 'Crédito denegado por el banco', 'Desistió de la compra'
  ];

  const AGENTS = [
    { id: 'a1', name: 'Alberto', last: '(Bróker)', role: 'Bróker · Propietario', initials: 'AL', speed: 8, onDuty: false, rr: false },
    { id: 'a2', name: 'Lucía', last: 'Chuquillanqui', role: 'Asesora comercial', initials: 'LC', speed: 2.5, onDuty: true, rr: true },
    { id: 'a3', name: 'Diego', last: 'Orihuela', role: 'Asesor comercial', initials: 'DO', speed: 5, onDuty: true, rr: true },
    { id: 'a4', name: 'Carla', last: 'Ñaupari', role: 'Asesora comercial', initials: 'CÑ', speed: 3.5, onDuty: true, rr: true },
    { id: 'a5', name: 'Marco', last: 'Canchari', role: 'Asesor comercial', initials: 'MC', speed: 14, onDuty: false, rr: true }
  ];

  const OWNERS = [
    { id: 'o1', name: 'Rosa Elena Vílchez', phone: '+51 964 218 330', since: 410 },
    { id: 'o2', name: 'Jorge Baquerizo Meza', phone: '+51 954 771 902', since: 95 },
    { id: 'o3', name: 'Inversiones Mantaro S.A.C.', phone: '+51 064 245 118', since: 300 },
    { id: 'o4', name: 'Gladys Poma Inga', phone: '+51 987 332 145', since: 60 },
    { id: 'o5', name: 'Víctor Salazar Lazo', phone: '+51 945 660 213', since: 250 },
    { id: 'o6', name: 'Familia Cárdenas Arias', phone: '+51 962 118 774', since: 150 },
    { id: 'o7', name: 'Liliana Espinoza Soto', phone: '+51 956 402 887', since: 40 },
    { id: 'o8', name: 'Constructora Valle Alto E.I.R.L.', phone: '+51 064 211 560', since: 180 },
    { id: 'o9', name: 'Hugo Taipe Camargo', phone: '+51 978 145 309', since: 20 },
    { id: 'o10', name: 'Noemí Yupanqui Rivera', phone: '+51 943 887 126', since: 12 },
    { id: 'o11', name: 'César Mendoza Ccanto', phone: '+51 951 330 472', since: 8 },
    { id: 'o12', name: 'Maribel Rojas Huamán', phone: '+51 966 519 038', since: 3 }
  ];

  // listed = días en el mercado; priceHist = precios anteriores (más antiguo primero)
  const PROPERTIES = [
    { id: 'INC-101', type: 'Departamento', op: 'Venta', district: 'Huancayo', address: 'Urb. San Carlos, Jr. Los Pinos', cur: 'US$', price: 118000, priceHist: [132000, 125000], area: 112, beds: 3, baths: 2, parking: 1, owner: 'o1', listed: 124, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c1'], hue: 190 },
    { id: 'INC-102', type: 'Casa', op: 'Venta', district: 'El Tambo', address: 'Av. Mariscal Castilla, cdra. 24', cur: 'US$', price: 165000, priceHist: [], area: 210, land: 180, beds: 4, baths: 3, parking: 2, owner: 'o2', listed: 45, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c2'], hue: 28 },
    { id: 'INC-103', type: 'Terreno', op: 'Venta', district: 'Pilcomayo', address: 'Sector La Punta, a 5 min de la Av. Huancavelica', cur: 'US$', price: 28000, priceHist: [], area: 200, owner: 'o3', listed: 78, status: 'Disponible', exclusive: true, commission: 4, campaigns: ['c4'], hue: 95 },
    { id: 'INC-104', type: 'Local comercial', op: 'Alquiler', district: 'Huancayo', address: 'Jr. Cusco 560, Centro', cur: 'S/', price: 3800, priceHist: [], area: 85, baths: 1, owner: 'o5', listed: 33, status: 'Disponible', exclusive: false, commission: 100, commissionNote: '1 mes de renta', campaigns: ['c8'], hue: 250 },
    { id: 'INC-105', type: 'Departamento', op: 'Venta', district: 'Huancayo', address: 'Av. Ferrocarril 1450 · Estreno', cur: 'US$', price: 79000, priceHist: [], area: 74, beds: 2, baths: 2, parking: 0, owner: 'o8', listed: 18, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c7'], hue: 205 },
    { id: 'INC-106', type: 'Casa', op: 'Venta', district: 'Huancayo', address: 'Palián, Pje. Los Eucaliptos', cur: 'US$', price: 142000, priceHist: [155000], area: 190, land: 240, beds: 4, baths: 3, parking: 2, owner: 'o6', listed: 212, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c3'], hue: 12 },
    { id: 'INC-107', type: 'Departamento', op: 'Venta', district: 'El Tambo', address: 'Jr. Parra del Riego 780', cur: 'US$', price: 95000, priceHist: [], area: 96, beds: 3, baths: 2, parking: 1, owner: 'o4', listed: 57, status: 'Disponible', exclusive: false, commission: 3, campaigns: ['c1'], hue: 175 },
    { id: 'INC-108', type: 'Terreno', op: 'Venta', district: 'San Agustín de Cajas', address: 'Camino a Hualhuas · campestre', cur: 'US$', price: 60000, priceHist: [68000], area: 1000, owner: 'o5', listed: 160, status: 'Disponible', exclusive: true, commission: 4, campaigns: ['c5'], hue: 80 },
    { id: 'INC-109', type: 'Oficina', op: 'Alquiler', district: 'Huancayo', address: 'Calle Real 890, piso 4', cur: 'S/', price: 2200, priceHist: [], area: 60, baths: 1, owner: 'o3', listed: 26, status: 'Disponible', exclusive: false, commission: 100, commissionNote: '1 mes de renta', campaigns: ['c8'], hue: 230 },
    { id: 'INC-110', type: 'Casa de campo', op: 'Venta', district: 'Concepción', address: 'Anexo Santa Rosa de Ocopa', cur: 'US$', price: 110000, priceHist: [], area: 160, land: 1500, beds: 3, baths: 2, parking: 3, owner: 'o7', listed: 38, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c5'], hue: 60 },
    { id: 'INC-111', type: 'Departamento', op: 'Venta', district: 'Huancayo', address: 'Urb. San Carlos, Av. Centenario · Dúplex', cur: 'US$', price: 155000, priceHist: [], area: 145, beds: 3, baths: 3, parking: 2, owner: 'o2', listed: 72, status: 'Vendida', soldDaysAgo: 19, exclusive: true, commission: 3, campaigns: ['c1'], hue: 200 },
    { id: 'INC-112', type: 'Terreno', op: 'Venta', district: 'Chupaca', address: 'Proyecto Mirador de Huamancaca · 42 lotes', cur: 'US$', price: 14500, priceHist: [], area: 120, owner: 'o8', listed: 96, status: 'Disponible', exclusive: true, commission: 5, campaigns: ['c4'], hue: 110, units: 42, unitsSold: 17 },
    { id: 'INC-113', type: 'Casa', op: 'Venta', district: 'Chilca', address: 'Av. 9 de Diciembre, cdra. 7', cur: 'US$', price: 88000, priceHist: [], area: 150, land: 120, beds: 3, baths: 2, parking: 1, owner: 'o9', listed: 20, status: 'Reservada', exclusive: true, commission: 3, campaigns: ['c7'], hue: 20 },
    { id: 'INC-114', type: 'Departamento', op: 'Venta', district: 'El Tambo', address: 'Av. Huancavelica 3120', cur: 'US$', price: 102000, priceHist: [], area: 104, beds: 3, baths: 2, parking: 1, owner: 'o10', listed: 67, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c2'], hue: 185 },
    { id: 'INC-115', type: 'Casa', op: 'Venta', district: 'Huancán', address: 'Jr. Arequipa 215', cur: 'US$', price: 72000, priceHist: [], area: 130, land: 160, beds: 3, baths: 2, parking: 1, owner: 'o11', listed: 0, status: 'En captación', exclusive: false, commission: 3, campaigns: [], hue: 35 },
    { id: 'INC-116', type: 'Local comercial', op: 'Alquiler', district: 'Huancayo', address: 'Av. Giráldez 420', cur: 'S/', price: 5500, priceHist: [6000], area: 140, baths: 2, owner: 'o1', listed: 104, status: 'Disponible', exclusive: false, commission: 100, commissionNote: '1 mes de renta', campaigns: ['c8'], hue: 260 }
  ];

  const CAMPAIGNS = [
    { id: 'c1', name: 'Departamentos San Carlos', platform: 'meta', source: ['fb', 'ig'], objective: 'Lead Ads · Formulario instantáneo', form: 'Agenda tu visita — San Carlos', status: 'Activa', spend: 1450, days: 58, props: ['INC-101', 'INC-107', 'INC-111'] },
    { id: 'c2', name: 'Casas y dptos El Tambo · Reels', platform: 'meta', source: ['ig', 'fb'], objective: 'Lead Ads · Reels', form: 'Quiero más información', status: 'Activa', spend: 1100, days: 44, props: ['INC-102', 'INC-114'] },
    { id: 'c3', name: 'Tour casa Palián', platform: 'tiktok', source: ['tt'], objective: 'TikTok Lead Gen · Instant Form', form: 'Agenda tu recorrido', status: 'Activa', spend: 450, days: 40, props: ['INC-106'] },
    { id: 'c4', name: 'Lotes financiados Huamancaca', platform: 'tiktok', source: ['tt'], objective: 'TikTok Lead Gen · Instant Form', form: 'Cotiza tu lote', status: 'Activa', spend: 900, days: 60, props: ['INC-112', 'INC-103'] },
    { id: 'c5', name: 'Terrenos y casas de campo', platform: 'meta', source: ['fb'], objective: 'Lead Ads · Formulario instantáneo', form: 'Quiero mi casa de campo', status: 'Pausada', spend: 450, days: 35, props: ['INC-108', 'INC-110'] },
    { id: 'c6', name: 'Vende tu propiedad con nosotros', platform: 'meta', source: ['ig', 'fb'], objective: 'Captación de propietarios', form: 'Tasación gratuita', status: 'Activa', spend: 500, days: 30, props: [], sellers: true },
    { id: 'c7', name: 'Estrena depa · Ferrocarril y Chilca', platform: 'tiktok', source: ['tt'], objective: 'TikTok Lead Gen · Spark Ads', form: 'Separa con US$ 500', status: 'Activa', spend: 550, days: 21, props: ['INC-105', 'INC-113'] },
    { id: 'c8', name: 'Locales y oficinas en el centro', platform: 'meta', source: ['fb'], objective: 'Lead Ads · Formulario instantáneo', form: 'Busco local', status: 'Activa', spend: 350, days: 34, props: ['INC-104', 'INC-109', 'INC-116'] }
  ];

  const FIRST = ['José', 'María', 'Luis', 'Rosa', 'Carlos', 'Ana', 'Jorge', 'Carmen', 'Miguel', 'Juana', 'Pedro', 'Elena', 'Raúl', 'Patricia', 'Víctor', 'Sandra', 'Julio', 'Gladys', 'Renzo', 'Milagros', 'Kevin', 'Yesenia', 'Edwin', 'Flor', 'Álvaro', 'Katherine', 'Hugo', 'Diana', 'César', 'Roxana', 'Frank', 'Maribel', 'Jhon', 'Liliana', 'Wilmer', 'Noemí', 'Brenda', 'Iván', 'Pamela', 'Ronald'];
  const LAST = ['Quispe', 'Huamán', 'Rojas', 'Paucar', 'Ccanto', 'Mendoza', 'Rivera', 'Chuquillanqui', 'Poma', 'Salazar', 'Cárdenas', 'Arias', 'Lazo', 'Orihuela', 'Canchari', 'Espinoza', 'Sánchez', 'Vílchez', 'Taipe', 'Meza', 'Ñaupari', 'Soto', 'Baquerizo', 'Inga', 'Yupanqui', 'Camargo', 'Aliaga', 'Rafael', 'Ticse', 'Zárate'];
  const PLAZO = ['Este mes', '1 a 3 meses', '3 a 6 meses', 'Solo averiguando'];
  const PAGO = ['Contado', 'Crédito hipotecario', 'Crédito MiVivienda', 'Techo Propio'];
  const PORTALS = ['Urbania', 'Adondevivir'];

  const QUALITY = { fb: 1, ig: 1.05, tt: 0.78, wa: 1.2, web: 1.15, portal: 1.25, ref: 1.45 };
  const SOURCE_WEIGHTS = [['fb', 26], ['ig', 17], ['tt', 34], ['wa', 8], ['web', 7], ['portal', 7], ['ref', 3]];

  function pickW(r, list) {
    const total = list.reduce((s, x) => s + x[1], 0);
    let v = r() * total;
    for (const [k, w] of list) { v -= w; if (v <= 0) return k; }
    return list[0][0];
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const between = (r, a, b) => a + r() * (b - a);

  function phone(r) {
    let s = '+51 9';
    for (let i = 0; i < 8; i++) { s += Math.floor(r() * 10); if (i === 1 || i === 4) s += ' '; }
    return s;
  }

  function propById(id) { return PROPERTIES.find(p => p.id === id); }

  function fmtMoney(cur, v) { return cur + ' ' + Math.round(v).toLocaleString('en-US'); }

  // Probabilidad de lograr contacto según minutos de espera hasta la primera respuesta.
  function contactFactor(mins) {
    if (mins < 5) return 1;
    if (mins < 30) return 0.8;
    if (mins < 120) return 0.62;
    if (mins < 1440) return 0.45;
    return 0.3;
  }

  function campaignFor(r, src) {
    const opts = CAMPAIGNS.filter(c => c.source.includes(src) && !c.sellers);
    if (!opts.length) return null;
    // Campañas pausadas reciben menos leads
    const w = opts.map(c => [c.id, c.status === 'Activa' ? 3 : 1]);
    return pickW(r, w);
  }

  let rrIndex = 0;
  function nextAgent(agents) {
    const pool = agents.filter(a => a.rr);
    const a = pool[rrIndex % pool.length];
    rrIndex++;
    return a;
  }

  function makeLead(r, now, opts) {
    const src = opts.src || pickW(r, SOURCE_WEIGHTS);
    const campaign = opts.campaign !== undefined ? opts.campaign : campaignFor(r, src);
    const camp = CAMPAIGNS.find(c => c.id === campaign);
    const pool = camp ? camp.props : PROPERTIES.filter(p => p.status !== 'En captación').map(p => p.id);
    const interest = opts.interest || pick(r, pool);
    const prop = propById(interest);
    const agent = opts.agent || nextAgent(AGENTS).id;
    const ag = AGENTS.find(a => a.id === agent);
    const name = opts.name || (pick(r, FIRST) + ' ' + pick(r, LAST) + ' ' + pick(r, LAST));
    const nameParts = name.split(' ');
    const created = opts.created;
    const plazo = src === 'tt' ? pickW(r, [[PLAZO[0], 1], [PLAZO[1], 3], [PLAZO[2], 3], [PLAZO[3], 4]]) : pickW(r, [[PLAZO[0], 2], [PLAZO[1], 4], [PLAZO[2], 3], [PLAZO[3], 2]]);
    const pago = prop.op === 'Alquiler' ? 'Contado' : pickW(r, [[PAGO[0], 3], [PAGO[1], 4], [PAGO[2], 3], [PAGO[3], prop.price < 60000 ? 2 : 0.2]]);
    const budget = Math.round(prop.price * between(r, 0.78, 1.08) / (prop.cur === 'S/' ? 100 : 1000)) * (prop.cur === 'S/' ? 100 : 1000);

    const lead = {
      id: opts.id,
      name,
      phone: phone(r),
      email: (nameParts[0] + '.' + nameParts[1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + Math.floor(r() * 90 + 10) + '@gmail.com',
      src,
      portal: src === 'portal' ? pick(r, PORTALS) : null,
      campaign,
      adset: camp ? (camp.platform === 'tiktok' ? pick(r, ['Huancayo 25-45 · Intereses vivienda', 'Huancayo + Lima (migrantes)', 'Lookalike clientes']) : pick(r, ['Huancayo 25-55 · Propietarios', 'El Tambo y Chilca · 28-50', 'Retargeting web 30 días', 'Lookalike 1% compradores'])) : null,
      ad: camp ? pick(r, camp.platform === 'tiktok' ? ['Video recorrido 45 s', 'Video testimonio', 'Spark Ad asesora'] : ['Carrusel fotos', 'Reel recorrido', 'Imagen precio + ubicación']) : null,
      interest,
      budget,
      cur: prop.cur,
      plazo,
      pago,
      zona: prop.district,
      agent,
      created,
      firstResponse: null,
      history: [{ stage: 'nuevo', at: created }],
      stage: 'nuevo',
      lossReason: null,
      lostAt: null,
      visitAt: null,
      visitConfirmed: false,
      events: [],
      tasks: []
    };

    const ev = (at, type, text, by) => { if (at <= now) lead.events.push({ at, type, text, by: by || null }); };
    ev(created, 'in', 'Ingresó desde ' + SOURCES[src].label + (lead.portal ? ' (' + lead.portal + ')' : '') + (camp ? ' · Campaña «' + camp.name + '» · Formulario «' + camp.form + '»' : ''));
    ev(created + 2000, 'auto', 'Asignado a ' + ag.name + ' ' + ag.last + (ag.rr ? ' por turno rotativo' : ''));
    ev(created + 35000, 'auto', 'WhatsApp de bienvenida enviado con la ficha de ' + interest);

    if (opts.unattended) { lead.score = scoreLead(lead); return lead; }

    // Primera respuesta
    let mins = ag.speed * Math.exp(between(r, -0.9, 1.6));
    if (r() < 0.08) mins = between(r, 90, 1800);
    const fr = created + mins * MIN;
    if (fr > now) { lead.score = scoreLead(lead); return lead; }
    lead.firstResponse = fr;
    ev(fr, 'call', 'Primera llamada · ' + (r() < 0.8 ? 'contestó' : 'no contestó, se dejó WhatsApp'), agent);

    const q = QUALITY[src] * (plazo === 'Solo averiguando' ? 0.55 : plazo === 'Este mes' ? 1.25 : 1);
    const probs = [0.9 * contactFactor(mins), 0.66 * q, 0.6 * q, 0.5, 0.58, 0.86];
    const durs = [[0.02, 0.2], [0.3, 2.5], [1, 5], [2, 8], [3, 10], [7, 20]];
    let t = fr;
    let i = 0;
    while (i < 6) {
      const ok = r() < Math.min(0.97, probs[i]);
      const dt = between(r, durs[i][0], durs[i][1]) * DAY;
      if (!ok) {
        const lostAt = t + dt * between(r, 0.6, 1.6);
        if (lostAt <= now) {
          lead.lossReason = pick(r, LOSS_BY_STAGE[i]);
          lead.lostAt = lostAt;
          lead.lostStage = STAGES[i].id;
          lead.history.push({ stage: 'perdido', at: lostAt });
          lead.stage = 'perdido';
          ev(lostAt, 'lost', 'Marcado como perdido en «' + STAGES[i].label + '»: ' + lead.lossReason, agent);
        }
        break;
      }
      const nt = t + dt;
      if (nt > now) break;
      t = nt;
      i++;
      lead.stage = STAGES[i].id;
      lead.history.push({ stage: STAGES[i].id, at: t });
      const money = fmtMoney(prop.cur, prop.price);
      const texts = {
        contactado: ['call', 'Conversación por WhatsApp · confirmó interés en ' + interest],
        calificado: ['note', 'Calificado · presupuesto ' + fmtMoney(lead.cur, budget) + ' · ' + pago + ' · compra ' + plazo.toLowerCase()],
        visita: ['visit', 'Visita agendada a ' + interest],
        negociacion: ['offer', 'Oferta de ' + fmtMoney(prop.cur, prop.price * between(r, 0.9, 0.97)) + ' presentada al propietario (lista: ' + money + ')'],
        separacion: ['doc', 'Separación firmada · ' + fmtMoney(prop.cur, prop.cur === 'S/' ? prop.price : 1000) + ' depositados'],
        ganado: ['win', 'Cierre · minuta firmada en notaría']
      };
      const tx = texts[STAGES[i].id];
      ev(t, tx[0], tx[1], agent);
      if (STAGES[i].id === 'visita') {
        lead.visitAt = t + between(r, 1, 3) * DAY;
        if (lead.visitAt <= now) ev(lead.visitAt, 'visit', 'Visita realizada a ' + interest + ' con ' + ag.name, agent);
      }
    }
    // Seguimiento intermedio
    const last = lead.events[lead.events.length - 1].at;
    if (lead.stage !== 'perdido' && lead.stage !== 'ganado' && r() < 0.55) {
      const fu = last + between(r, 0.3, 4) * DAY;
      ev(fu, pick(r, ['call', 'wa']), pick(r, ['Seguimiento: envió fotos adicionales', 'Seguimiento: consultó opciones de crédito', 'Seguimiento: pidió reprogramar', 'Seguimiento: envió ubicación y video']), agent);
    }
    lead.score = scoreLead(lead);
    return lead;
  }

  function scoreLead(l) {
    let s = 30;
    s += { 'Este mes': 30, '1 a 3 meses': 20, '3 a 6 meses': 8, 'Solo averiguando': -10 }[l.plazo] || 0;
    s += { 'Contado': 18, 'Crédito hipotecario': 10, 'Crédito MiVivienda': 10, 'Techo Propio': 5 }[l.pago] || 0;
    s += { nuevo: 0, contactado: 5, calificado: 12, visita: 18, negociacion: 24, separacion: 28, ganado: 30, perdido: -30 }[l.stage] || 0;
    s += { ref: 10, portal: 6, web: 5, wa: 5, fb: 0, ig: 0, tt: -4 }[l.src] || 0;
    return Math.max(3, Math.min(99, s));
  }

  function buildCaptacion(now) {
    return [
      { id: 'k1', owner: 'o12', address: 'Casa en Jr. Ica 340, El Tambo', type: 'Casa', expected: 'US$ 120,000', stage: 'solicitud', src: 'c6', created: now - 3 * HOUR, note: 'Llenó el formulario «Tasación gratuita» desde Instagram', agent: 'a4' },
      { id: 'k2', owner: 'o11', address: 'Casa en Jr. Arequipa 215, Huancán', type: 'Casa', expected: 'US$ 72,000', stage: 'tasacion', src: 'c6', created: now - 8 * DAY, note: 'Tasación realizada: rango sugerido US$ 68k – 74k', agent: 'a2', prop: 'INC-115' },
      { id: 'k3', owner: null, name: 'Frank Ticse Aliaga', phone: '+51 957 204 118', address: 'Departamento en Av. Ferrocarril 980', type: 'Departamento', expected: 'US$ 85,000', stage: 'agendada', src: 'c6', created: now - 2 * DAY, visit: now + 1 * DAY + 3 * HOUR, note: 'Tasación mañana 11:00', agent: 'a3' },
      { id: 'k4', owner: null, name: 'Pamela Zárate Rojas', phone: '+51 948 663 015', address: 'Terreno 300 m² en Sicaya', type: 'Terreno', expected: 'US$ 35,000', stage: 'solicitud', src: 'wa', created: now - 26 * HOUR, note: 'Escribió al WhatsApp de la agencia', agent: 'a5' },
      { id: 'k5', owner: 'o10', address: 'Departamento en Av. Huancavelica 3120', type: 'Departamento', expected: 'US$ 102,000', stage: 'publicada', src: 'ref', created: now - 75 * DAY, note: 'Publicado en web, Urbania y campaña Meta «Casas y dptos El Tambo»', agent: 'a2', prop: 'INC-114' },
      { id: 'k6', owner: 'o9', address: 'Casa en Av. 9 de Diciembre, Chilca', type: 'Casa', expected: 'US$ 88,000', stage: 'publicada', src: 'c6', created: now - 26 * DAY, note: 'Reservada por un lead de TikTok', agent: 'a4', prop: 'INC-113' },
      { id: 'k7', owner: null, name: 'Ronald Camargo Poma', phone: '+51 963 580 227', address: 'Local en Calle Real 1120', type: 'Local comercial', expected: 'S/ 4,500 / mes', stage: 'exclusiva', src: 'c6', created: now - 12 * DAY, note: 'Contrato de exclusividad firmado por 6 meses · sesión de fotos el jueves', agent: 'a3' },
      { id: 'k8', owner: null, name: 'Brenda Inga Soto', phone: '+51 955 147 632', address: 'Casa en Urb. Los Jardines, San Carlos', type: 'Casa', expected: 'US$ 190,000', stage: 'agendada', src: 'c6', created: now - 4 * DAY, visit: now + 2 * DAY + 5 * HOUR, note: 'Quiere vender para mudarse a Lima', agent: 'a2' },
      { id: 'k9', owner: 'o7', address: 'Casa de campo en Santa Rosa de Ocopa', type: 'Casa de campo', expected: 'US$ 110,000', stage: 'publicada', src: 'web', created: now - 45 * DAY, note: 'Publicado', agent: 'a4', prop: 'INC-110' }
    ];
  }

  const CAPT_STAGES = [
    { id: 'solicitud', label: 'Solicitud de venta' },
    { id: 'agendada', label: 'Tasación agendada' },
    { id: 'tasacion', label: 'Tasación realizada' },
    { id: 'exclusiva', label: 'Exclusiva firmada' },
    { id: 'publicada', label: 'Publicada' }
  ];

  const AUTOMATIONS = [
    { id: 'r1', on: true, name: 'Asignación por turno rotativo', when: 'Entra un lead de Meta, TikTok, web o portales', then: 'Se asigna al siguiente asesor en turno, según zona y tipo de inmueble', runs: 0, key: 'assign' },
    { id: 'r2', on: true, name: 'WhatsApp de bienvenida en menos de 1 minuto', when: 'Se crea un lead con teléfono', then: 'Envía plantilla aprobada por Meta con la ficha, fotos y ubicación del inmueble', runs: 0, key: 'welcome' },
    { id: 'r3', on: true, name: 'Escalamiento por falta de respuesta', when: 'Lead sin primera respuesta', then: '5 min: alerta al asesor · 15 min: se reasigna · 30 min: aviso a Alberto', runs: 0, key: 'sla' },
    { id: 'r4', on: true, name: 'Recordatorio de visita', when: 'Visita agendada', then: 'WhatsApp al cliente 24 h y 2 h antes; si no confirma, tarea para el asesor', runs: 0, key: 'visit' },
    { id: 'r5', on: true, name: 'Reactivación de leads fríos', when: '7 días sin actividad en un lead abierto', then: 'Secuencia de 3 mensajes con propiedades similares; si responde, vuelve al asesor', runs: 0, key: 'cold' },
    { id: 'r6', on: true, name: 'Reporte semanal al propietario', when: 'Todos los lunes a las 9:00', then: 'Envía a cada propietario las vistas, leads, visitas y comentarios de su inmueble', runs: 0, key: 'owner' },
    { id: 'r7', on: true, name: 'Alerta de inmueble estancado', when: 'Propiedad con más de 90 días en venta', then: 'Tarea para revisar precio, fotos y campaña; sugerencia con datos de la zona', runs: 0, key: 'stale' },
    { id: 'r8', on: true, name: 'Conversiones de vuelta a Meta y TikTok', when: 'Un lead pasa a Calificado, Visita o Separación', then: 'Envía el evento por Conversions API (Meta) y Events API (TikTok) para que las campañas optimicen por calidad', runs: 0, key: 'capi' },
    { id: 'r9', on: true, name: 'Detección de duplicados', when: 'Entra un lead con teléfono o correo existente', then: 'Une el historial y avisa al asesor que ya lo atendía', runs: 0, key: 'dup' },
    { id: 'r10', on: false, name: 'Felicitación post-venta y pedido de referidos', when: '30 días y 1 año después del cierre', then: 'Mensaje de saludo y enlace para recomendar a un amigo', runs: 0, key: 'ref' }
  ];

  const INTEGRATIONS = [
    { id: 'meta', name: 'Meta Lead Ads', detail: 'Facebook e Instagram · formularios instantáneos', status: 'Conectado', how: 'Webhook oficial de Meta (leadgen). El lead llega al CRM en segundos, con campaña, conjunto de anuncios y anuncio.' },
    { id: 'tiktok', name: 'TikTok Lead Generation', detail: 'Instant Forms y Spark Ads', status: 'Conectado', how: 'TikTok Lead Gen API con suscripción a nuevos leads por formulario.' },
    { id: 'capi', name: 'Meta Conversions API y TikTok Events API', detail: 'Retorno de conversiones', status: 'Conectado', how: 'El CRM informa a las plataformas qué leads se calificaron, visitaron o separaron.' },
    { id: 'wa', name: 'WhatsApp Business API', detail: 'Número de la agencia con varios asesores', status: 'Conectado', how: 'Bandeja compartida: cada conversación queda en la ficha del lead, aunque cambie el asesor.' },
    { id: 'web', name: 'Sitio web de Inmoconecta', detail: 'Formularios y catálogo', status: 'Listo para conectar', how: 'La agencia que hace la web solo envía sus formularios a nuestro endpoint o pega un script. El catálogo de la web se puede alimentar desde el stock del CRM.' },
    { id: 'portals', name: 'Portales inmobiliarios', detail: 'Urbania · Adondevivir', status: 'Conectado', how: 'Consultas de portales entran como leads; publicación de fichas desde el CRM.' },
    { id: 'gcal', name: 'Google Calendar', detail: 'Agenda de visitas por asesor', status: 'Conectado', how: 'Cada visita agendada aparece en el calendario del asesor.' },
    { id: 'mail', name: 'Correo (Gmail / Outlook)', detail: 'Envío y registro de correos', status: 'Conectado', how: 'Los correos con el cliente quedan en su historial.' }
  ];

  function build(now) {
    const r = rng(20260929);
    rrIndex = 0;
    const leads = [];
    let n = 1;
    const N = 320;
    for (let k = 0; k < N; k++) {
      // más leads en días recientes
      const ageDays = Math.pow(r(), 1.25) * 62 + 0.02;
      const created = now - ageDays * DAY - between(r, 0, 5) * HOUR;
      leads.push(makeLead(r, now, { id: 'L-' + String(1000 + n++), created }));
    }
    // Leads recién llegados sin atender (bandeja de urgentes)
    const urgent = [
      { mins: 2, src: 'tt', campaign: 'c4', agent: 'a3', name: 'Yesenia Ticse Poma' },
      { mins: 9, src: 'fb', campaign: 'c1', agent: 'a5', name: 'Wilmer Rafael Soto' },
      { mins: 38, src: 'ig', campaign: 'c2', agent: 'a5', name: 'Katherine Meza Huamán' },
      { mins: 200, src: 'tt', campaign: 'c7', agent: 'a3', name: 'Edwin Paucar Lazo' },
      { mins: 27 * 60 + 14, src: 'web', campaign: null, agent: 'a5', name: 'Diana Zárate Inga', interest: 'INC-102' }
    ];
    urgent.forEach(u => {
      leads.push(makeLead(r, now, { id: 'L-' + String(1000 + n++), created: now - u.mins * MIN, src: u.src, campaign: u.campaign, agent: u.agent, name: u.name, interest: u.interest, unattended: true }));
    });
    leads.sort((a, b) => b.created - a.created);

    // Visitas futuras para leads activos en etapa Visita
    leads.forEach(l => {
      if (l.stage === 'visita' && l.visitAt && l.visitAt < now) {
        if (r() < 0.6) {
          const day = Math.floor(between(r, 0, 7));
          const d = new Date(now + day * DAY);
          d.setHours(Math.floor(between(r, 9, 18)), r() < 0.5 ? 0 : 30, 0, 0);
          if (d.getTime() < now) d.setTime(d.getTime() + DAY);
          l.visitAt = d.getTime();
          l.events = l.events.filter(e => !/^Visita realizada/.test(e.text));
        }
      }
      if (l.stage === 'visita' && l.visitAt > now) l.visitConfirmed = r() < 0.55;
    });

    const properties = PROPERTIES.map(p => Object.assign({}, p, {
      listedAt: now - p.listed * DAY,
      soldAt: p.soldDaysAgo ? now - p.soldDaysAgo * DAY : null,
      views: Math.round((p.listed + 10) * (p.campaigns.length ? 38 : 6) * (0.6 + r() * 0.8)),
      priceChanges: p.priceHist.map((v, i) => ({ from: v, to: i + 1 < p.priceHist.length ? p.priceHist[i + 1] : p.price, at: now - Math.round(p.listed * (0.35 + i * 0.3)) * DAY }))
    }));

    const campaigns = CAMPAIGNS.map(c => Object.assign({}, c, {
      impressions: Math.round(c.spend * (c.platform === 'tiktok' ? 95 : 62) * (0.85 + r() * 0.3)),
      clicks: 0
    }));
    campaigns.forEach(c => { c.clicks = Math.round(c.impressions * (c.platform === 'tiktok' ? 0.012 : 0.016)); });

    const agents = AGENTS.map(a => Object.assign({}, a));
    const automations = AUTOMATIONS.map(a => Object.assign({}, a));
    automations.forEach(a => {
      a.runs = { assign: leads.length, welcome: leads.length - 4, sla: 104, visit: 181, cold: 396, owner: 88, stale: 9, capi: 402, dup: 31, ref: 0 }[a.key];
    });

    return {
      version: 3,
      builtAt: now,
      leads,
      properties,
      owners: OWNERS.map(o => Object.assign({}, o, { sinceAt: now - o.since * DAY, lastReport: now - Math.floor(r() * 6 + 1) * DAY })),
      captacion: buildCaptacion(now),
      campaigns,
      agents,
      automations,
      integrations: INTEGRATIONS.map(i => Object.assign({}, i, { lastSync: now - Math.floor(r() * 4 + 1) * MIN })),
      seq: n
    };
  }

  // Lead nuevo simulado (para la demostración "en vivo")
  const liveRng = rng(Date.now() % 100000);
  function incoming(state, now) {
    const src = pickW(liveRng, [['fb', 3], ['ig', 2], ['tt', 4]]);
    const agentsOn = state.agents.filter(a => a.rr && a.onDuty);
    const pool = agentsOn.length ? agentsOn : state.agents.filter(a => a.rr);
    const agent = pool[(state.seq || 0) % pool.length];
    const lead = makeLead(liveRng, now, { id: 'L-' + String(1000 + state.seq), created: now, src, agent: agent.id, unattended: true });
    state.seq++;
    return lead;
  }

  window.DEMO = {
    MIN, HOUR, DAY,
    SOURCES, STAGES, CAPT_STAGES, LOSS_REASONS, PLAZO, PAGO,
    build, incoming, scoreLead
  };
})();
