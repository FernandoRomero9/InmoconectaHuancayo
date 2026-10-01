/* Datos de ejemplo para la demo del CRM de Inmoconecta Huancayo.
   Todo es ficticio y se genera de forma determinista respecto a la hora actual,
   para que los tiempos de espera y los contadores se vean "en vivo".
   Cada lead es de COMPRA o de VENTA (propietario que quiere vender). */
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
    fb: { label: 'Facebook Lead Ads', short: 'Facebook', group: 'meta' },
    ig: { label: 'Instagram Lead Ads', short: 'Instagram', group: 'meta' },
    tt: { label: 'TikTok Lead Gen', short: 'TikTok', group: 'tiktok' },
    wa: { label: 'WhatsApp directo', short: 'WhatsApp', group: 'otros' },
    web: { label: 'Sitio web', short: 'Web', group: 'otros' },
    portal: { label: 'Portales inmobiliarios', short: 'Portales', group: 'otros' },
    ref: { label: 'Referido', short: 'Referido', group: 'otros' }
  };

  // Etapas según lo que quiere el cliente
  const STAGES = {
    compra: [
      { id: 'nuevo', label: 'Nuevo' },
      { id: 'contactado', label: 'Contactado' },
      { id: 'calificado', label: 'Calificado' },
      { id: 'visita', label: 'Visita' },
      { id: 'negociacion', label: 'Negociación' },
      { id: 'separacion', label: 'Separación' },
      { id: 'ganado', label: 'Compró' }
    ],
    venta: [
      { id: 'nuevo', label: 'Nuevo' },
      { id: 'contactado', label: 'Contactado' },
      { id: 'tasacion', label: 'Tasación' },
      { id: 'exclusiva', label: 'Exclusiva firmada' },
      { id: 'publicada', label: 'Publicada' },
      { id: 'ganado', label: 'Vendida' }
    ]
  };

  const PAGO = ['Contado', 'Crédito', 'No sabe'];
  const CREDITO = ['Hipotecario', 'MiVivienda', 'Techo Propio'];
  const NO_A_NOMBRE = ['Herencia: sucesión en trámite', 'A nombre de sus padres', 'Copropiedad con hermanos', 'Sin inscribir en SUNARP'];
  const PROP_TYPES = ['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Oficina', 'Casa de campo'];
  const DISTRICTS = ['Huancayo', 'El Tambo', 'Chilca', 'Pilcomayo', 'Huancán', 'San Agustín de Cajas', 'Sapallanga', 'Concepción', 'Chupaca', 'Sicaya'];
  const STREETS = ['Jr. Ica', 'Av. Ferrocarril', 'Jr. Arequipa', 'Av. Huancavelica', 'Calle Real', 'Jr. Puno', 'Av. Mariscal Castilla', 'Jr. Lima', 'Av. 9 de Diciembre', 'Pje. Los Álamos', 'Jr. Ancash', 'Av. Leoncio Prado'];

  const LOSS = {
    compra: [
      ['No responde', 'No responde', 'No responde', 'Datos falsos o duplicado'],
      ['Solo estaba averiguando', 'Precio fuera de presupuesto', 'No responde'],
      ['Precio fuera de presupuesto', 'No califica a crédito', 'Ubicación no le convence', 'Solo estaba averiguando'],
      ['La propiedad no le convenció', 'Ubicación no le convence', 'Precio fuera de presupuesto', 'Compró con otra inmobiliaria'],
      ['No hubo acuerdo en precio', 'No califica a crédito', 'Compró con otra inmobiliaria'],
      ['Crédito denegado por el banco', 'Desistió de la compra']
    ],
    venta: [
      ['No responde', 'No responde', 'Datos falsos o duplicado'],
      ['Solo quería saber cuánto vale', 'Ya no quiere vender', 'No está a su nombre y no puede sanear'],
      ['Precio esperado fuera de mercado', 'Firmó con otra inmobiliaria', 'No acepta exclusividad'],
      ['Desistió de vender'],
      ['Retiró la propiedad del mercado']
    ]
  };
  const LOSS_REASONS = {
    compra: ['No responde', 'Datos falsos o duplicado', 'La propiedad ya se vendió', 'Solo estaba averiguando', 'Precio fuera de presupuesto', 'No califica a crédito', 'Ubicación no le convence', 'La propiedad no le convenció', 'Compró con otra inmobiliaria', 'No hubo acuerdo en precio', 'Crédito denegado por el banco', 'Desistió de la compra'],
    venta: ['No responde', 'Datos falsos o duplicado', 'Solo quería saber cuánto vale', 'Ya no quiere vender', 'No está a su nombre y no puede sanear', 'Precio esperado fuera de mercado', 'Firmó con otra inmobiliaria', 'No acepta exclusividad', 'Desistió de vender', 'Retiró la propiedad del mercado']
  };

  // Perfiles de asesor: definen a quién se deriva cada lead
  const AGENTS = [
    { id: 'a1', name: 'Alberto', last: '', role: 'Bróker · Propietario', initials: 'AL', perfil: 'Supervisión y escalamientos', tags: ['Ve todos los leads', 'Recibe escalamientos'], match: {}, speed: 8, onDuty: true, rr: false },
    { id: 'a2', name: 'Lucía', last: 'Chuquillanqui', role: 'Asesora', initials: 'LC', perfil: 'Compradores con crédito', tags: ['Compra', 'Crédito', 'No sabe cómo pagar'], match: { tipo: 'compra', pago: ['Crédito', 'No sabe'] }, speed: 2.5, onDuty: true, rr: true },
    { id: 'a3', name: 'Diego', last: 'Orihuela', role: 'Asesor', initials: 'DO', perfil: 'Terrenos y lotes', tags: ['Compra', 'Terrenos', 'Proyectos de lotes'], match: { tipo: 'compra', propTipos: ['Terreno'] }, speed: 5, onDuty: true, rr: true },
    { id: 'a4', name: 'Carla', last: 'Ñaupari', role: 'Asesora', initials: 'CÑ', perfil: 'Captación de propietarios', tags: ['Venta', 'Tasaciones', 'Exclusivas'], match: { tipo: 'venta' }, speed: 3.5, onDuty: true, rr: true },
    { id: 'a5', name: 'Marco', last: 'Canchari', role: 'Asesor', initials: 'MC', perfil: 'Compradores al contado', tags: ['Compra', 'Contado', 'Casas, departamentos y locales'], match: { tipo: 'compra', pago: ['Contado'] }, speed: 12, onDuty: true, rr: true }
  ];

  // Elige el asesor cuyo perfil encaja mejor con el lead
  // Si nadie en turno tiene un perfil compatible, el lead va a Alberto (bróker) para que lo asigne.
  function recommend(l, agents, loads) {
    const load = id => (loads && loads[id]) || 0;
    const pool = agents.filter(a => a.rr && a.onDuty);
    const scored = pool.map(a => {
      let s = 0;
      const m = a.match || {};
      const general = !m.tipo;
      if (m.tipo === l.tipo) s += 10;
      else if (general) s += 5;
      else return { a, s: -1 };
      if (l.tipo === 'compra') {
        if (m.propTipos && m.propTipos.includes(l.propTipo)) s += 8;
        if (m.pago && m.pago.includes(l.pago)) s += 6;
      }
      return { a, s };
    }).filter(x => x.s >= 0).sort((x, y) => (y.s - x.s) || (load(x.a.id) - load(y.a.id)));
    if (scored.length) return { agent: scored[0].a, reason: scored[0].a.perfil, ok: true };
    const boss = agents.find(a => a.id === 'a1') || agents[0];
    return { agent: boss, reason: 'Nadie en turno con un perfil para este lead; Alberto lo asigna', ok: false };
  }

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
    { id: 'o11', name: 'César Mendoza Ccanto', phone: '+51 951 330 472', since: 8 }
  ];

  const PROPERTIES = [
    { id: 'INC-101', type: 'Departamento', op: 'Venta', district: 'Huancayo', address: 'Urb. San Carlos, Jr. Los Pinos', cur: 'US$', price: 118000, priceHist: [132000, 125000], area: 112, beds: 3, baths: 2, parking: 1, owner: 'o1', listed: 124, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c1'], hue: 190 },
    { id: 'INC-102', type: 'Casa', op: 'Venta', district: 'El Tambo', address: 'Av. Mariscal Castilla, cdra. 24', cur: 'US$', price: 165000, priceHist: [], area: 210, land: 180, beds: 4, baths: 3, parking: 2, owner: 'o2', listed: 45, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c2'], hue: 28 },
    { id: 'INC-103', type: 'Terreno', op: 'Venta', district: 'Pilcomayo', address: 'Sector La Punta, a 5 min de la Av. Huancavelica', cur: 'US$', price: 28000, priceHist: [], area: 200, owner: 'o3', listed: 78, status: 'Disponible', exclusive: true, commission: 4, campaigns: ['c4'], hue: 95 },
    { id: 'INC-104', type: 'Local comercial', op: 'Venta', district: 'Huancayo', address: 'Jr. Cusco 560, Centro', cur: 'US$', price: 185000, priceHist: [], area: 85, baths: 1, owner: 'o5', listed: 33, status: 'Disponible', exclusive: false, commission: 3, campaigns: ['c8'], hue: 250 },
    { id: 'INC-105', type: 'Departamento', op: 'Venta', district: 'Huancayo', address: 'Av. Ferrocarril 1450 · Estreno', cur: 'US$', price: 79000, priceHist: [], area: 74, beds: 2, baths: 2, parking: 0, owner: 'o8', listed: 18, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c7'], hue: 205 },
    { id: 'INC-106', type: 'Casa', op: 'Venta', district: 'Huancayo', address: 'Palián, Pje. Los Eucaliptos', cur: 'US$', price: 142000, priceHist: [155000], area: 190, land: 240, beds: 4, baths: 3, parking: 2, owner: 'o6', listed: 212, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c3'], hue: 12 },
    { id: 'INC-107', type: 'Departamento', op: 'Venta', district: 'El Tambo', address: 'Jr. Parra del Riego 780', cur: 'US$', price: 95000, priceHist: [], area: 96, beds: 3, baths: 2, parking: 1, owner: 'o4', listed: 57, status: 'Disponible', exclusive: false, commission: 3, campaigns: ['c1'], hue: 175 },
    { id: 'INC-108', type: 'Terreno', op: 'Venta', district: 'San Agustín de Cajas', address: 'Camino a Hualhuas · campestre', cur: 'US$', price: 60000, priceHist: [68000], area: 1000, owner: 'o5', listed: 160, status: 'Disponible', exclusive: true, commission: 4, campaigns: ['c5'], hue: 80 },
    { id: 'INC-109', type: 'Oficina', op: 'Venta', district: 'Huancayo', address: 'Calle Real 890, piso 4', cur: 'US$', price: 68000, priceHist: [], area: 60, baths: 1, owner: 'o3', listed: 26, status: 'Disponible', exclusive: false, commission: 3, campaigns: ['c8'], hue: 230 },
    { id: 'INC-110', type: 'Casa de campo', op: 'Venta', district: 'Concepción', address: 'Anexo Santa Rosa de Ocopa', cur: 'US$', price: 110000, priceHist: [], area: 160, land: 1500, beds: 3, baths: 2, parking: 3, owner: 'o7', listed: 38, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c5'], hue: 60 },
    { id: 'INC-111', type: 'Departamento', op: 'Venta', district: 'Huancayo', address: 'Urb. San Carlos, Av. Centenario · Dúplex', cur: 'US$', price: 155000, priceHist: [], area: 145, beds: 3, baths: 3, parking: 2, owner: 'o2', listed: 72, status: 'Vendida', soldDaysAgo: 19, exclusive: true, commission: 3, campaigns: ['c1'], hue: 200 },
    { id: 'INC-112', type: 'Terreno', op: 'Venta', district: 'Chupaca', address: 'Proyecto Mirador de Huamancaca · 42 lotes', cur: 'US$', price: 14500, priceHist: [], area: 120, owner: 'o8', listed: 96, status: 'Disponible', exclusive: true, commission: 5, campaigns: ['c4'], hue: 110, units: 42, unitsSold: 17 },
    { id: 'INC-113', type: 'Casa', op: 'Venta', district: 'Chilca', address: 'Av. 9 de Diciembre, cdra. 7', cur: 'US$', price: 88000, priceHist: [], area: 150, land: 120, beds: 3, baths: 2, parking: 1, owner: 'o9', listed: 20, status: 'Reservada', exclusive: true, commission: 3, campaigns: ['c7'], hue: 20 },
    { id: 'INC-114', type: 'Departamento', op: 'Venta', district: 'El Tambo', address: 'Av. Huancavelica 3120', cur: 'US$', price: 102000, priceHist: [], area: 104, beds: 3, baths: 2, parking: 1, owner: 'o10', listed: 67, status: 'Disponible', exclusive: true, commission: 3, campaigns: ['c2'], hue: 185 },
    { id: 'INC-115', type: 'Casa', op: 'Venta', district: 'Huancán', address: 'Jr. Arequipa 215', cur: 'US$', price: 72000, priceHist: [], area: 130, land: 160, beds: 3, baths: 2, parking: 1, owner: 'o11', listed: 0, status: 'En captación', exclusive: false, commission: 3, campaigns: [], hue: 35 },
    { id: 'INC-116', type: 'Local comercial', op: 'Venta', district: 'Huancayo', address: 'Av. Giráldez 420', cur: 'US$', price: 260000, priceHist: [275000], area: 140, baths: 2, owner: 'o1', listed: 104, status: 'Disponible', exclusive: false, commission: 3, campaigns: ['c8'], hue: 260 }
  ];

  // Propiedades ya vendidas en los últimos meses (historial del stock)
  const SOLD = [
    { id: 'INC-090', type: 'Departamento', district: 'El Tambo', address: 'Jr. Julio Sumar 345', price: 89000, area: 90, beds: 3, baths: 2, owner: 'o4', hue: 180 },
    { id: 'INC-091', type: 'Casa', district: 'Huancayo', address: 'Urb. Huancayo, Jr. Las Retamas', price: 132000, area: 180, beds: 4, baths: 3, owner: 'o6', hue: 25 },
    { id: 'INC-092', type: 'Departamento', district: 'Huancayo', address: 'Av. Giráldez 1020', price: 76000, area: 70, beds: 2, baths: 2, owner: 'o8', hue: 200 },
    { id: 'INC-093', type: 'Terreno', district: 'Pilcomayo', address: 'Sector La Punta, lote 14', price: 26000, area: 180, owner: 'o3', hue: 100 },
    { id: 'INC-094', type: 'Casa', district: 'Chilca', address: 'Jr. Los Andes 512', price: 84000, area: 140, beds: 3, baths: 2, owner: 'o9', hue: 15 },
    { id: 'INC-095', type: 'Departamento', district: 'El Tambo', address: 'Av. Huancavelica 2780', price: 98000, area: 100, beds: 3, baths: 2, owner: 'o10', hue: 190 },
    { id: 'INC-096', type: 'Local comercial', district: 'Huancayo', address: 'Jr. Puno 410', price: 150000, area: 95, baths: 1, owner: 'o5', hue: 255 },
    { id: 'INC-097', type: 'Casa', district: 'El Tambo', address: 'Pje. Los Jazmines 88', price: 118000, area: 165, beds: 4, baths: 2, owner: 'o2', hue: 35 },
    { id: 'INC-098', type: 'Terreno', district: 'San Agustín de Cajas', address: 'Camino a Hualhuas, lote 3', price: 42000, area: 600, owner: 'o7', hue: 85 },
    { id: 'INC-099', type: 'Departamento', district: 'Huancayo', address: 'Urb. San Carlos, Jr. Las Begonias', price: 112000, area: 108, beds: 3, baths: 2, owner: 'o1', hue: 205 }
  ].map(p => Object.assign({ op: 'Venta', cur: 'US$', priceHist: [], parking: 1, listed: 120, status: 'Vendida', soldDaysAgo: 40, exclusive: true, commission: 3, campaigns: [] }, p));

  const CAMPAIGNS = [
    { id: 'c1', name: 'Departamentos San Carlos', platform: 'meta', source: ['fb', 'ig'], objective: 'Lead Ads · Formulario instantáneo', form: 'Agenda tu visita — San Carlos', status: 'Activa', spend: 1450, days: 58, props: ['INC-101', 'INC-107', 'INC-111'] },
    { id: 'c2', name: 'Casas y dptos El Tambo · Reels', platform: 'meta', source: ['ig', 'fb'], objective: 'Lead Ads · Reels', form: 'Quiero más información', status: 'Activa', spend: 1100, days: 44, props: ['INC-102', 'INC-114'] },
    { id: 'c3', name: 'Tour casa Palián', platform: 'tiktok', source: ['tt'], objective: 'TikTok Lead Gen · Instant Form', form: 'Agenda tu recorrido', status: 'Activa', spend: 450, days: 40, props: ['INC-106'] },
    { id: 'c4', name: 'Lotes financiados Huamancaca', platform: 'tiktok', source: ['tt'], objective: 'TikTok Lead Gen · Instant Form', form: 'Cotiza tu lote', status: 'Activa', spend: 900, days: 60, props: ['INC-112', 'INC-103'] },
    { id: 'c5', name: 'Terrenos y casas de campo', platform: 'meta', source: ['fb'], objective: 'Lead Ads · Formulario instantáneo', form: 'Quiero mi casa de campo', status: 'Pausada', spend: 450, days: 35, props: ['INC-108', 'INC-110'] },
    { id: 'c6', name: 'Vende tu propiedad con nosotros', platform: 'meta', source: ['ig', 'fb'], objective: 'Lead Ads · Captación de propietarios', form: 'Tasación gratuita', status: 'Activa', spend: 500, days: 30, props: [], sellers: true },
    { id: 'c7', name: 'Estrena depa · Ferrocarril y Chilca', platform: 'tiktok', source: ['tt'], objective: 'TikTok Lead Gen · Spark Ads', form: 'Separa con US$ 500', status: 'Activa', spend: 550, days: 21, props: ['INC-105', 'INC-113'] },
    { id: 'c8', name: 'Locales y oficinas en venta · Centro', platform: 'meta', source: ['fb'], objective: 'Lead Ads · Formulario instantáneo', form: 'Quiero comprar un local', status: 'Activa', spend: 350, days: 34, props: ['INC-104', 'INC-109', 'INC-116'] }
  ];

  const FIRST = ['José', 'María', 'Luis', 'Rosa', 'Carlos', 'Ana', 'Jorge', 'Carmen', 'Miguel', 'Juana', 'Pedro', 'Elena', 'Raúl', 'Patricia', 'Víctor', 'Sandra', 'Julio', 'Gladys', 'Renzo', 'Milagros', 'Kevin', 'Yesenia', 'Edwin', 'Flor', 'Álvaro', 'Katherine', 'Hugo', 'Diana', 'César', 'Roxana', 'Frank', 'Maribel', 'Jhon', 'Liliana', 'Wilmer', 'Noemí', 'Brenda', 'Iván', 'Pamela', 'Ronald'];
  const LAST = ['Quispe', 'Huamán', 'Rojas', 'Paucar', 'Ccanto', 'Mendoza', 'Rivera', 'Chuquillanqui', 'Poma', 'Salazar', 'Cárdenas', 'Arias', 'Lazo', 'Orihuela', 'Canchari', 'Espinoza', 'Sánchez', 'Vílchez', 'Taipe', 'Meza', 'Ñaupari', 'Soto', 'Baquerizo', 'Inga', 'Yupanqui', 'Camargo', 'Aliaga', 'Rafael', 'Ticse', 'Zárate'];
  const PLAZO = ['Este mes', '1 a 3 meses', '3 a 6 meses', 'Solo averiguando'];
  const PORTALS = ['Urbania', 'Adondevivir'];
  const QUALITY = { fb: 1, ig: 1.05, tt: 0.78, wa: 1.2, web: 1.15, portal: 1.25, ref: 1.45 };

  function pickW(r, list) {
    const total = list.reduce((s, x) => s + x[1], 0);
    let v = r() * total;
    for (const [k, w] of list) { v -= w; if (v <= 0) return k; }
    return list[0][0];
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const between = (r, a, b) => a + r() * (b - a);
  const propById = id => PROPERTIES.find(p => p.id === id);
  const stageAtOf = l => l.history[l.history.length - 1].at;
  const fmtMoney = (cur, v) => cur + ' ' + Math.round(v).toLocaleString('en-US');

  function phone(r) {
    let s = '+51 9';
    for (let i = 0; i < 8; i++) { s += Math.floor(r() * 10); if (i === 1 || i === 4) s += ' '; }
    return s;
  }
  function contactFactor(mins) {
    if (mins < 5) return 1;
    if (mins < 30) return 0.8;
    if (mins < 120) return 0.62;
    if (mins < 1440) return 0.45;
    return 0.3;
  }
  const stageList = tipo => STAGES[tipo];
  const stageLabel = (tipo, id) => id === 'perdido' ? 'Perdido' : (STAGES[tipo].find(s => s.id === id) || {}).label || id;

  const NEXT = {
    compra: { nuevo: 'Volver a llamar', contactado: 'Calificar: presupuesto y forma de pago', calificado: 'Enviar 3 opciones y proponer visita', visita: 'Confirmar la visita', negociacion: 'Llamar al propietario por la contraoferta', separacion: 'Coordinar firma de minuta' },
    venta: { nuevo: 'Volver a llamar', contactado: 'Agendar tasación', tasacion: 'Enviar propuesta de exclusiva', exclusiva: 'Coordinar fotos y video', publicada: 'Enviar reporte semanal al propietario' }
  };

  function scoreLead(l) {
    let s = 30;
    if (l.tipo === 'compra') {
      s += { 'Este mes': 30, '1 a 3 meses': 20, '3 a 6 meses': 8, 'Solo averiguando': -10 }[l.plazo] || 0;
      s += { 'Contado': 18, 'Crédito': 10, 'No sabe': 0 }[l.pago] || 0;
    } else {
      s += l.aNombre ? 25 : 2;
      s += 12;
    }
    const idx = STAGES[l.tipo].findIndex(x => x.id === l.stage);
    s += l.stage === 'perdido' ? -30 : Math.max(0, idx) * 5;
    s += { ref: 10, portal: 6, web: 5, wa: 5, fb: 0, ig: 0, tt: -4 }[l.src] || 0;
    return Math.max(3, Math.min(99, s));
  }

  function makeLead(r, now, agents, opts) {
    const tipo = opts.tipo || (r() < 0.26 ? 'venta' : 'compra');
    const name = opts.name || (pick(r, FIRST) + ' ' + pick(r, LAST) + ' ' + pick(r, LAST));
    const parts = name.split(' ');
    const created = opts.created;
    let src, campaign = null;
    const lead = { id: opts.id, tipo, name, phone: phone(r), email: (parts[0] + '.' + parts[1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@gmail.com', created, firstResponse: null, history: [{ stage: 'nuevo', at: created }], stage: 'nuevo', lossReason: null, lostAt: null, visitAt: null, visitConfirmed: false, events: [], next: null, derived: [] };

    if (tipo === 'venta') {
      src = opts.src || pickW(r, [['fb', 22], ['ig', 26], ['wa', 24], ['web', 10], ['ref', 18]]);
      if (src === 'fb' || src === 'ig') campaign = 'c6';
      lead.propTipo = opts.propTipo || pickW(r, [['Casa', 5], ['Departamento', 3], ['Terreno', 3], ['Local comercial', 1]]);
      lead.zona = opts.zona || pick(r, DISTRICTS);
      lead.direccion = pick(r, STREETS) + ' ' + Math.floor(between(r, 100, 1900));
      const base = { Casa: [70000, 190000], Departamento: [60000, 130000], Terreno: [15000, 70000], 'Local comercial': [80000, 220000] }[lead.propTipo];
      lead.cur = 'US$';
      lead.precio = Math.round(between(r, base[0], base[1]) / 1000) * 1000;
      lead.aNombre = opts.aNombre !== undefined ? opts.aNombre : r() < 0.66;
      lead.tituloDetalle = lead.aNombre ? null : pick(r, NO_A_NOMBRE);
      lead.motivo = pick(r, ['Se muda a Lima', 'Quiere comprar algo más grande', 'Herencia familiar', 'Necesita liquidez', 'Se va al extranjero']);
    } else {
      src = opts.src || pickW(r, [['fb', 26], ['ig', 17], ['tt', 34], ['wa', 7], ['web', 7], ['portal', 7], ['ref', 2]]);
      if (opts.campaign !== undefined) campaign = opts.campaign;
      else {
        const opts2 = CAMPAIGNS.filter(c => c.source.includes(src) && !c.sellers);
        if (opts2.length) campaign = pickW(r, opts2.map(c => [c.id, c.status === 'Activa' ? 3 : 1]));
      }
      const camp = CAMPAIGNS.find(c => c.id === campaign);
      const pool = camp ? camp.props : PROPERTIES.filter(p => p.status !== 'En captación').map(p => p.id);
      lead.interest = opts.interest || pick(r, pool);
      const p = propById(lead.interest);
      lead.propTipo = p.type;
      lead.zona = p.district;
      lead.cur = p.cur;
      lead.budget = Math.round(p.price * between(r, 0.78, 1.08) / (p.cur === 'S/' ? 100 : 1000)) * (p.cur === 'S/' ? 100 : 1000);
      lead.plazo = src === 'tt' ? pickW(r, [[PLAZO[0], 1], [PLAZO[1], 3], [PLAZO[2], 3], [PLAZO[3], 4]]) : pickW(r, [[PLAZO[0], 2], [PLAZO[1], 4], [PLAZO[2], 3], [PLAZO[3], 2]]);
      lead.pago = opts.pago || (p.op === 'Alquiler' ? 'Contado' : pickW(r, src === 'tt' ? [['Contado', 2], ['Crédito', 3], ['No sabe', 5]] : [['Contado', 4], ['Crédito', 4], ['No sabe', 2]]));
      lead.credito = lead.pago === 'Crédito' ? pickW(r, [['Hipotecario', 4], ['MiVivienda', 4], ['Techo Propio', p.price < 40000 ? 3 : 0.2]]) : null;
    }
    lead.src = src;
    lead.portal = src === 'portal' ? pick(r, PORTALS) : null;
    lead.campaign = campaign;
    const camp = CAMPAIGNS.find(c => c.id === campaign);
    lead.adset = camp ? pick(r, camp.platform === 'tiktok' ? ['Huancayo 25-45 · Vivienda', 'Huancayo + Lima (migrantes)', 'Lookalike clientes'] : ['Huancayo 25-55', 'El Tambo y Chilca · 28-50', 'Retargeting web 30 días', 'Lookalike compradores']) : null;
    lead.ad = camp ? pick(r, camp.platform === 'tiktok' ? ['Video recorrido 45 s', 'Video testimonio', 'Spark Ad asesora'] : ['Carrusel de fotos', 'Reel recorrido', 'Imagen precio + ubicación']) : null;

    // Derivación por perfil (en la mayoría de casos)
    const rec = recommend(lead, agents);
    const ag = opts.agent ? agents.find(a => a.id === opts.agent) : (opts.forceRec || r() < 0.88 ? rec.agent : pick(r, agents.filter(a => a.rr)));
    lead.agent = ag.id;

    const ev = (at, type, text, by) => { if (at <= now) lead.events.push({ at, type, text, by: by || null }); };
    const what = tipo === 'venta' ? 'Quiere vender: ' + lead.propTipo.toLowerCase() + ' en ' + lead.zona : 'Quiere comprar: ' + lead.propTipo.toLowerCase() + ' ' + lead.interest;
    ev(created, 'in', 'Ingresó desde ' + SOURCES[src].label + (lead.portal ? ' (' + lead.portal + ')' : '') + (camp ? ' · campaña «' + camp.name + '»' : '') + ' · ' + what);
    ev(created + 2000, 'auto', 'Derivado a ' + ag.name + ' ' + ag.last + ' · perfil «' + ag.perfil + '»');
    ev(created + 35000, 'auto', tipo === 'venta' ? 'WhatsApp de bienvenida: «Gracias por confiar en Inmoconecta, te llamamos para coordinar la tasación»' : 'WhatsApp de bienvenida con la ficha de ' + lead.interest);

    if (opts.unattended) { lead.score = scoreLead(lead); return lead; }

    let mins = ag.speed * Math.exp(between(r, -0.9, 1.6));
    if (r() < 0.08) mins = between(r, 90, 1800);
    const fr = created + mins * MIN;
    if (fr > now) { lead.score = scoreLead(lead); return lead; }
    lead.firstResponse = fr;
    ev(fr, 'call', 'Primera llamada · ' + (r() < 0.8 ? 'contestó' : 'no contestó, se dejó WhatsApp'), ag.id);

    const st = STAGES[tipo];
    let probs, durs;
    if (tipo === 'compra') {
      const q = QUALITY[src] * (lead.plazo === 'Solo averiguando' ? 0.55 : lead.plazo === 'Este mes' ? 1.25 : 1) * (lead.pago === 'No sabe' ? 0.8 : 1);
      probs = [0.9 * contactFactor(mins), 0.66 * q, 0.6 * q, 0.5, 0.58, 0.86];
      durs = [[0.02, 0.2], [0.3, 2.5], [1, 5], [2, 8], [3, 10], [7, 20]];
    } else {
      probs = [0.9 * contactFactor(mins), 0.66 * (lead.aNombre ? 1 : 0.6), 0.6, 0.92, 0.35];
      durs = [[0.02, 0.2], [1, 6], [2, 8], [3, 7], [15, 50]];
    }
    let t = fr, i = 0;
    while (i < st.length - 1) {
      const ok = r() < Math.min(0.97, probs[i]);
      const dt = between(r, durs[i][0], durs[i][1]) * DAY;
      if (!ok) {
        const lostAt = t + dt * between(r, 0.6, 1.6);
        if (lostAt <= now) {
          lead.lossReason = pick(r, LOSS[tipo][i]);
          lead.lostAt = lostAt; lead.lostStage = st[i].id; lead.stage = 'perdido';
          lead.history.push({ stage: 'perdido', at: lostAt });
          ev(lostAt, 'lost', 'Marcado como perdido en «' + st[i].label + '»: ' + lead.lossReason, ag.id);
        }
        break;
      }
      const nt = t + dt;
      if (nt > now) break;
      t = nt; i++;
      lead.stage = st[i].id;
      lead.history.push({ stage: st[i].id, at: t });
      if (tipo === 'compra') {
        const p = propById(lead.interest);
        const tx = {
          contactado: ['call', 'Conversación por WhatsApp · confirmó interés en ' + lead.interest],
          calificado: ['note', 'Calificado · ' + fmtMoney(lead.cur, lead.budget) + ' · ' + lead.pago + (lead.credito ? ' (' + lead.credito + ')' : '') + ' · compra ' + lead.plazo.toLowerCase()],
          visita: ['visit', 'Visita agendada a ' + lead.interest],
          negociacion: ['offer', 'Oferta de ' + fmtMoney(p.cur, p.price * between(r, 0.9, 0.97)) + ' presentada al propietario'],
          separacion: ['doc', 'Separación firmada'],
          ganado: ['win', 'Compra cerrada · minuta firmada en notaría']
        }[st[i].id];
        ev(t, tx[0], tx[1], ag.id);
        if (st[i].id === 'visita') {
          lead.visitAt = t + between(r, 1, 3) * DAY;
          if (lead.visitAt <= now) ev(lead.visitAt, 'visit', 'Visita realizada a ' + lead.interest, ag.id);
        }
      } else {
        const tx = {
          contactado: ['call', 'Llamada: confirma que quiere vender · ' + (lead.aNombre ? 'la propiedad está a su nombre' : 'no está a su nombre (' + lead.tituloDetalle.toLowerCase() + ')')],
          tasacion: ['visit', 'Tasación realizada · rango sugerido ' + fmtMoney('US$', lead.precio * 0.9) + ' – ' + fmtMoney('US$', lead.precio * 0.98)],
          exclusiva: ['doc', 'Contrato de exclusividad firmado por 6 meses'],
          publicada: ['note', 'Publicada en web, portales y campaña'],
          ganado: ['win', 'Propiedad vendida']
        }[st[i].id];
        ev(t, tx[0], tx[1], ag.id);
        if (st[i].id === 'contactado') { lead.visitAt = t + between(r, 1, 4) * DAY; }
      }
    }
    // Próximo seguimiento para leads abiertos
    if (lead.stage !== 'perdido' && lead.stage !== 'ganado') {
      const last = lead.events.length ? lead.events[lead.events.length - 1].at : created;
      const k = r();
      let at;
      if (k < 0.2) at = Math.max(last + 6 * HOUR, now - between(r, 3, 72) * HOUR);
      else if (k < 0.6) { const d = new Date(now); d.setHours(Math.floor(between(r, 9, 19)), r() < 0.5 ? 0 : 30, 0, 0); at = d.getTime(); }
      else at = now + between(r, 1, 5) * DAY;
      lead.next = { at, text: NEXT[tipo][lead.stage] };
    }
    lead.score = scoreLead(lead);
    return lead;
  }

  const AUTOMATIONS = [
    { id: 'r1', on: true, name: 'Derivación por perfil de asesor', when: 'Entra un lead de Meta, TikTok, web, WhatsApp o portales', then: 'Compra o venta, forma de pago, tipo de inmueble y si está a su nombre deciden qué asesor lo atiende', key: 'assign' },
    { id: 'r2', on: true, name: 'WhatsApp de bienvenida en menos de 1 minuto', when: 'Se crea un lead con teléfono', then: 'Compra: ficha del inmueble. Venta: mensaje para coordinar la tasación', key: 'welcome' },
    { id: 'r3', on: true, name: 'Escalamiento por falta de respuesta', when: 'Lead sin primera respuesta', then: '5 min: alerta al asesor · 15 min: pasa a otro asesor con el mismo perfil · 30 min: aviso a Alberto', key: 'sla' },
    { id: 'r4', on: true, name: 'Recordatorio de visitas y tasaciones', when: 'Cita agendada', then: 'WhatsApp al cliente 24 h y 2 h antes; si no confirma, tarea para el asesor', key: 'visit' },
    { id: 'r5', on: true, name: 'Seguimiento vencido', when: 'Un seguimiento pasa su fecha sin registrarse', then: 'Aparece en «Vencidos» y se avisa al asesor; a las 48 h se avisa a Alberto', key: 'follow' },
    { id: 'r6', on: true, name: 'Documentos cuando no está a su nombre', when: 'Propietario indica que el inmueble no está a su nombre', then: 'Envía la lista de documentos para sanear (sucesión, partida registral) y crea tarea de revisión legal', key: 'docs' },
    { id: 'r7', on: true, name: 'Reporte semanal al propietario', when: 'Todos los lunes a las 9:00', then: 'Vistas, interesados, visitas y ofertas de su inmueble por WhatsApp y correo', key: 'owner' },
    { id: 'r8', on: true, name: 'Conversiones de vuelta a Meta y TikTok', when: 'Un lead se califica, visita o separa', then: 'Se informa a las plataformas para que las campañas busquen compradores reales', key: 'capi' }
  ];

  const INTEGRATIONS = [
    { id: 'meta', name: 'Meta Lead Ads', detail: 'Facebook e Instagram', status: 'Conectado', how: 'Los formularios llegan en segundos con campaña y respuestas. El formulario pregunta si quiere comprar o vender.' },
    { id: 'tiktok', name: 'TikTok Lead Generation', detail: 'Instant Forms', status: 'Conectado', how: 'Cada formulario de TikTok crea un lead y se deriva según su perfil.' },
    { id: 'wa', name: 'WhatsApp Business API', detail: 'Número de la agencia', status: 'Conectado', how: 'Conversaciones compartidas: quedan en la ficha aunque cambie el asesor.' },
    { id: 'web', name: 'Sitio web de Inmoconecta', detail: 'Formularios y catálogo', status: 'Listo para conectar', how: 'La agencia de la web envía sus formularios al CRM; el catálogo puede leerse desde el stock.' },
    { id: 'portals', name: 'Portales inmobiliarios', detail: 'Urbania · Adondevivir', status: 'Conectado', how: 'Las consultas de portales entran como leads de compra.' },
    { id: 'gcal', name: 'Google Calendar', detail: 'Visitas y tasaciones', status: 'Conectado', how: 'Cada cita aparece en el calendario del asesor.' }
  ];

  function build(now) {
    const r = rng(20261001);
    const agents = AGENTS.map(a => Object.assign({}, a));
    const leads = [];
    let n = 1;
    for (let k = 0; k < 340; k++) {
      const ageDays = Math.pow(r(), 1.25) * 62 + 0.02;
      leads.push(makeLead(r, now, agents, { id: 'L-' + (1000 + n++), created: now - ageDays * DAY - between(r, 0, 5) * HOUR }));
    }
    const urgent = [
      { mins: 2, tipo: 'compra', src: 'tt', campaign: 'c4', name: 'Yesenia Ticse Poma', pago: 'Crédito' },
      { mins: 7, tipo: 'venta', src: 'ig', name: 'Pamela Zárate Rojas', aNombre: false, propTipo: 'Casa', zona: 'El Tambo' },
      { mins: 11, tipo: 'compra', src: 'fb', campaign: 'c1', name: 'Wilmer Rafael Soto', pago: 'Contado' },
      { mins: 38, tipo: 'venta', src: 'wa', name: 'Frank Ticse Aliaga', aNombre: true, propTipo: 'Departamento', zona: 'Huancayo' },
      { mins: 200, tipo: 'compra', src: 'tt', campaign: 'c7', name: 'Edwin Paucar Lazo', pago: 'No sabe' },
      { mins: 27 * 60 + 14, tipo: 'compra', src: 'web', campaign: null, name: 'Diana Zárate Inga', interest: 'INC-102', pago: 'Crédito' }
    ];
    urgent.forEach(u => leads.push(makeLead(r, now, agents, Object.assign({ id: 'L-' + (1000 + n++), created: now - u.mins * MIN, unattended: true }, u))));
    leads.sort((a, b) => b.created - a.created);

    // Coherencia con el stock: solo hay cierres en lotes (varias unidades) o en la propiedad vendida,
    // y los interesados abiertos en una propiedad vendida se pierden.
    const soldPool = SOLD.map(p => Object.assign({}, p));
    leads.slice().sort((a, b) => stageAtOf(a) - stageAtOf(b)).forEach(l => {
      if (l.tipo !== 'compra') return;
      const p = propById(l.interest);
      if (!p) return;
      if (l.stage === 'ganado' && p.status !== 'Vendida' && !p.units) {
        // El cierre fue de una propiedad que ya salió del stock como vendida
        const i = soldPool.findIndex(x => x.type === p.type && !x._used);
        const j = i >= 0 ? i : soldPool.findIndex(x => !x._used);
        if (j >= 0) {
          const sp = soldPool[j]; sp._used = true;
          const winAt = stageAtOf(l);
          sp.soldDaysAgo = Math.max(1, Math.round((now - winAt) / DAY));
          sp.listed = sp.soldDaysAgo + 30 + Math.round(r() * 90);
          const old = l.interest;
          l.interest = sp.id; l.propTipo = sp.type; l.zona = sp.district; l.cur = 'US$';
          l.events.forEach(e => { e.text = e.text.split(old).join(sp.id); });
        } else {
          l.history = l.history.filter(h => h.stage !== 'ganado');
          l.events = l.events.filter(e => e.type !== 'win');
          l.stage = 'separacion';
          l.next = { at: now + between(r, 1, 4) * DAY, text: NEXT.compra.separacion };
        }
      }
    });
    leads.forEach(l => {
      if (l.tipo !== 'compra') return;
      const p = propById(l.interest) || soldPool.find(x => x.id === l.interest);
      if (!p) return;
      const sold = p.status === 'Vendida';
      if (sold && l.stage !== 'ganado' && l.stage !== 'perdido') {
        const at = Math.max(l.history[l.history.length - 1].at + HOUR, now - p.soldDaysAgo * DAY);
        l.lostStage = l.stage; l.stage = 'perdido'; l.lossReason = 'La propiedad ya se vendió'; l.lostAt = at; l.next = null; l.visitAt = null;
        l.history.push({ stage: 'perdido', at });
        l.events.push({ at, type: 'lost', text: 'Marcado como perdido: la propiedad ya se vendió', by: l.agent });
      }
      if (l.stage !== 'perdido') l.score = scoreLead(l);
    });
    const allProps = PROPERTIES.concat(soldPool.filter(p => p._used));

    // Citas en los próximos días
    leads.forEach(l => {
      const cita = (l.tipo === 'compra' && l.stage === 'visita') || (l.tipo === 'venta' && l.stage === 'contactado');
      if (!cita) { if (l.tipo === 'venta') l.visitAt = null; return; }
      if (!l.visitAt || l.visitAt < now) {
        if (r() < 0.65) {
          const d = new Date(now + Math.floor(between(r, 0, 6)) * DAY);
          d.setHours(Math.floor(between(r, 9, 18)), r() < 0.5 ? 0 : 30, 0, 0);
          if (d.getTime() < now) d.setTime(d.getTime() + DAY);
          l.visitAt = d.getTime();
          l.events = l.events.filter(e => !/^Visita realizada/.test(e.text));
        } else if (l.tipo === 'venta') l.visitAt = null;
      }
      if (l.visitAt > now) { const d = new Date(l.visitAt); d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0); if (d.getHours() < 9) d.setHours(10); if (d.getHours() > 18) d.setHours(17); l.visitAt = Math.max(d.getTime(), now + 30 * MIN); l.visitConfirmed = r() < 0.55; }
    });

    const properties = allProps.map(p => Object.assign({}, p, {
      listedAt: now - p.listed * DAY,
      soldAt: p.soldDaysAgo ? now - p.soldDaysAgo * DAY : null,
      views: Math.round((p.listed + 10) * (p.campaigns.length ? 38 : 6) * (0.6 + r() * 0.8)),
      priceChanges: p.priceHist.map((v, i) => ({ from: v, to: i + 1 < p.priceHist.length ? p.priceHist[i + 1] : p.price, at: now - Math.round(p.listed * (0.35 + i * 0.3)) * DAY }))
    }));
    const campaigns = CAMPAIGNS.map(c => Object.assign({}, c, { impressions: Math.round(c.spend * (c.platform === 'tiktok' ? 95 : 62) * (0.85 + r() * 0.3)) }));
    const automations = AUTOMATIONS.map(a => Object.assign({}, a, { runs: { assign: leads.length, welcome: leads.length - 6, sla: 104, visit: 181, follow: 233, docs: 31, owner: 88, capi: 402 }[a.key] }));

    return {
      version: 4,
      builtAt: now,
      leads,
      properties,
      owners: OWNERS.map(o => Object.assign({}, o, { sinceAt: now - o.since * DAY, lastReport: now - Math.floor(r() * 6 + 1) * DAY })),
      campaigns,
      agents,
      automations,
      integrations: INTEGRATIONS.map(i => Object.assign({}, i, { lastSync: now - Math.floor(r() * 4 + 1) * MIN })),
      seq: n,
      log: []
    };
  }

  const liveRng = rng(Date.now() % 100000);
  function incoming(state, now) {
    const tipo = liveRng() < 0.3 ? 'venta' : 'compra';
    const src = tipo === 'venta' ? pickW(liveRng, [['ig', 3], ['fb', 2], ['wa', 2]]) : pickW(liveRng, [['fb', 3], ['ig', 2], ['tt', 4]]);
    const lead = makeLead(liveRng, now, state.agents, { id: 'L-' + (1000 + state.seq), created: now, tipo, src, unattended: true, forceRec: true });
    state.seq++;
    return lead;
  }

  window.DEMO = {
    MIN, HOUR, DAY,
    SOURCES, STAGES, PAGO, CREDITO, NO_A_NOMBRE, PROP_TYPES, DISTRICTS, PLAZO, LOSS_REASONS, NEXT,
    build, incoming, scoreLead, recommend, stageList, stageLabel
  };
})();
