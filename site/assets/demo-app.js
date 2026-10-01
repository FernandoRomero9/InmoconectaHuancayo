/* CRM demo · Inmoconecta Huancayo (Kallari)
   SPA sin dependencias. Rutas por #hash, estado en memoria + localStorage (solo este navegador).
   Leads de COMPRA y de VENTA, derivación por perfil de asesor, seguimiento y vista para celular. */
(function () {
  'use strict';
  const D = window.DEMO;
  const { MIN, HOUR, DAY } = D;
  const KEY = 'inmoconecta-crm-demo-v4';
  const FX = 3.7; // tipo de cambio referencial

  /* ================= Estado ================= */
  let S;
  let UI_RESET_NOTICE = false;
  const fresh = () => D.build(Date.now());
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === 4 && Date.now() - s.builtAt < 7 * DAY) return s;
        if (s) UI_RESET_NOTICE = true;
      }
    } catch (e) { /* sin almacenamiento */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
  S = load();
  const UI = {
    live: false,
    seg: '',
    leads: { tipo: '', q: '', pago: '', titulo: '', agent: '', stage: 'open', limit: 40 },
    pipe: { tipo: 'compra', agent: '' },
    props: { status: 'Disponible', stale: false },
    rep: { tab: 'campanas', tipo: 'compra' },
    aj: { tab: 'asesores' },
    drawer: null,
    lastTick: Date.now()
  };
  UI.tipo = '';
  try { UI.live = localStorage.getItem(KEY + ':live') === '1'; const tv = localStorage.getItem(KEY + ':tipo'); UI.tipo = ['compra', 'venta'].includes(tv) ? tv : ''; } catch (e) { /* nada */ }
  // Filtro global Compra / Venta: se aplica a todas las pantallas de leads
  const byTipo = ls => UI.tipo ? ls.filter(l => l.tipo === UI.tipo) : ls.slice();
  function setTipo(t) {
    UI.tipo = t; UI.leads.pago = ''; UI.leads.titulo = ''; UI.leads.limit = 40;
    try { localStorage.setItem(KEY + ':tipo', t); } catch (e) { /* nada */ }
    render();
  }

  /* ================= Utilidades ================= */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => Date.now();
  const nf = new Intl.NumberFormat('en-US');
  const num = v => nf.format(Math.round(v));
  const money = (cur, v) => cur + ' ' + num(v);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const median = arr => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const dtf = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const df = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  const tf = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' });
  const wdf = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric' });
  const fdt = t => dtf.format(new Date(t));
  const fd = t => df.format(new Date(t));
  const ft = t => tf.format(new Date(t));
  const dayStart = (o) => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() + (o || 0) * DAY; };
  const isToday = t => t >= dayStart() && t < dayStart(1);
  const inLast = (days, t) => t >= now() - days * DAY;

  function dur(ms) {
    ms = Math.max(0, ms);
    const m = Math.floor(ms / MIN);
    if (m < 1) return Math.floor(ms / 1000) + ' s';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    const d = Math.floor(h / 24);
    return d + ' d' + (h % 24 ? ' ' + (h % 24) + ' h' : '');
  }
  function timer(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000);
    if (s < 3600) return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    return dur(ms);
  }
  const ago = t => 'hace ' + dur(now() - t);
  const sev = mins => mins < 5 ? 'ok' : mins < 30 ? 'warn' : 'crit';
  const whenLabel = t => isToday(t) ? 'Hoy ' + ft(t) : (t >= dayStart(1) && t < dayStart(2) ? 'Mañana ' + ft(t) : fdt(t));

  /* ================= Dominio ================= */
  const agent = id => S.agents.find(a => a.id === id) || { name: '—', last: '', initials: '?', perfil: '' };
  const agentName = id => { const a = agent(id); return (a.name + ' ' + (a.last || '')).trim(); };
  const prop = id => id ? S.properties.find(p => p.id === id) : null;
  const camp = id => S.campaigns.find(c => c.id === id);
  const owner = id => S.owners.find(o => o.id === id);
  const lead = id => S.leads.find(l => l.id === id);
  const stagesOf = l => D.STAGES[l.tipo];
  const sIdx = (l, id) => stagesOf(l).findIndex(s => s.id === id);
  const sLabel = (l, id) => D.stageLabel(l.tipo, id || l.stage);
  const isOpen = l => l.stage !== 'ganado' && l.stage !== 'perdido';
  const unattended = l => !l.firstResponse && l.stage === 'nuevo';
  const lastAct = l => l.events.length ? l.events[l.events.length - 1].at : l.created;
  const stageAt = l => l.history[l.history.length - 1].at;
  function reached(l) { let m = 0; l.history.forEach(h => { const i = sIdx(l, h.stage); if (h.stage !== 'perdido' && i > m) m = i; }); return m; }
  const group = src => D.SOURCES[src].group;
  const loads = () => { const m = {}; S.leads.forEach(x => { if (isOpen(x)) m[x.agent] = (m[x.agent] || 0) + 1; }); return m; };
  const rec = (l, agents) => D.recommend(l, agents || S.agents, loads());
  // Derivación automática: respeta el interruptor de la automatización «Derivación por perfil»
  function autoRoute(l) {
    const on = (S.automations.find(a => a.key === 'assign') || {}).on;
    if (!on) return { agent: agent('a1'), reason: 'Derivación automática apagada: Alberto asigna manualmente', ok: false };
    return rec(l);
  }
  const fold = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function matches(text, phone, q) {
    const nq = fold(q).trim();
    if (!nq) return true;
    const digits = nq.replace(/\D/g, '');
    return fold(text).includes(nq) || (digits.length >= 3 && String(phone || '').replace(/\D/g, '').includes(digits));
  }
  const responseMins = l => l.firstResponse ? (l.firstResponse - l.created) / MIN : null;
  function commission(l) {
    if (l.tipo === 'venta') return l.precio * 0.03 * FX;
    const p = prop(l.interest);
    if (!p) return l.budget * 0.03 * (l.cur === 'US$' ? FX : 1);
    return propCommission(p);
  }
  function propCommission(p) {
    if (p.op === 'Alquiler') return p.price;
    const c = p.price * p.commission / 100;
    return p.cur === 'US$' ? c * FX : c;
  }

  const ICONS = {
    panel: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    follow: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>',
    leads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    pipeline: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    home: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 4 3 5-7"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    wa: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    note: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    visit: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    offer: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    win: '<path d="M20 6 9 17l-5-5"/>',
    lost: '<path d="M18 6 6 18M6 6l12 12"/>',
    in: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    auto: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
  };
  const ic = (n, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  const tipoTag = l => '<span class="tipo ' + l.tipo + '">' + (l.tipo === 'venta' ? 'Venta' : 'Compra') + '</span>';
  function keyFact(l) {
    if (l.tipo === 'compra') return '<span class="fact ' + ({ Contado: 'ok', 'Crédito': 'accent', 'No sabe': 'warn' }[l.pago] || '') + '">' + esc(l.pago) + (l.credito ? ' · ' + esc(l.credito) : '') + '</span>';
    return l.aNombre ? '<span class="fact ok">A su nombre</span>' : '<span class="fact warn">No está a su nombre</span>';
  }
  function whatLine(l) {
    if (l.tipo === 'venta') return esc(l.propTipo) + ' en ' + esc(l.zona) + ' · espera ' + money(l.cur, l.precio);
    const p = prop(l.interest);
    return (p ? esc(p.type) + ' ' + p.id + ' · ' + esc(p.district) : esc(l.propTipo) + ' en ' + esc(l.zona)) + ' · ' + money(l.cur, l.budget);
  }
  const av = (id, cls) => { const a = agent(id); return '<span class="avatar ' + (cls || '') + '" title="' + esc(agentName(id)) + '">' + esc(a.initials) + '</span>'; };
  const stageTxt = l => '<span class="stage-txt ' + (l.stage === 'perdido' ? 'lost' : l.stage === 'ganado' ? 'won' : '') + '">' + esc(sLabel(l)) + '</span>';
  const opt = (v, l, cur) => '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(l) + '</option>';
  const segBtns = (id, items, cur) => '<div class="seg" id="' + id + '">' + items.map(([v, l]) => '<button type="button" data-v="' + esc(v) + '" class="' + (String(v) === String(cur) ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  const platformLabel = p => p === 'meta' ? 'Meta' : 'TikTok';

  /* ================= Navegación ================= */
  const ROUTES = [
    { id: 'inicio', label: 'Inicio', icon: 'panel', title: 'Inicio' },
    { id: 'seguimiento', label: 'Seguimiento', icon: 'follow', title: 'Seguimiento' },
    { id: 'leads', label: 'Leads', icon: 'leads', title: 'Leads' },
    { id: 'pipeline', label: 'Pipeline', icon: 'pipeline', title: 'Pipeline' },
    { id: 'propiedades', label: 'Propiedades', icon: 'home', title: 'Propiedades' },
    { id: 'reportes', label: 'Reportes', icon: 'chart', title: 'Reportes' },
    { id: 'ajustes', label: 'Asesores', icon: 'sliders', title: 'Asesores y ajustes' }
  ];
  const ALIAS = { panel: 'inicio', urgentes: 'seguimiento', agenda: 'seguimiento', captacion: 'pipeline', campanas: 'reportes', trazabilidad: 'reportes', equipo: 'ajustes', automatizaciones: 'ajustes', integraciones: 'ajustes' };
  function route() {
    let h = (location.hash || '').replace('#', '');
    if (ALIAS[h]) {
      ({ urgentes: () => { UI.seg = 'sin'; }, agenda: () => { UI.seg = 'citas'; }, captacion: () => { UI.tipo = 'venta'; try { localStorage.setItem(KEY + ':tipo', 'venta'); } catch (e) { /* nada */ } }, campanas: () => { UI.rep.tab = 'campanas'; }, trazabilidad: () => { UI.rep.tab = 'embudo'; }, equipo: () => { UI.aj.tab = 'asesores'; }, automatizaciones: () => { UI.aj.tab = 'auto'; }, integraciones: () => { UI.aj.tab = 'integ'; } }[h] || (() => {}))();
      h = ALIAS[h];
      try { history.replaceState(null, '', '#' + h); } catch (e) { /* nada */ }
    }
    return ROUTES.find(r => r.id === h) ? h : 'inicio';
  }

  function followGroups() {
    const t = now();
    const end = dayStart(1);
    const base = byTipo(S.leads);
    const open = base.filter(l => isOpen(l) && !unattended(l));
    return {
      sin: base.filter(unattended).sort((a, b) => a.created - b.created),
      vencidos: open.filter(l => l.next && l.next.at < t).sort((a, b) => a.next.at - b.next.at),
      hoy: open.filter(l => l.next && l.next.at >= t && l.next.at < end).sort((a, b) => a.next.at - b.next.at),
      citas: base.filter(l => isOpen(l) && l.visitAt && l.visitAt >= t - 2 * HOUR && l.visitAt < dayStart(7)).sort((a, b) => a.visitAt - b.visitAt),
      proximos: open.filter(l => l.next && l.next.at >= end && l.next.at < dayStart(8)).sort((a, b) => a.next.at - b.next.at)
    };
  }

  function renderNav() {
    const cur = route();
    const g = followGroups();
    const hot = g.sin.length + g.vencidos.length;
    const badge = id => id === 'seguimiento' && hot ? '<span class="count hot">' + hot + '</span>' : '';
    $('#nav').innerHTML = ROUTES.map(r => '<a href="#' + r.id + '" class="' + (r.id === cur ? 'active' : '') + '"' + (r.id === cur ? ' aria-current="page"' : '') + '>' + ic(r.icon) + '<span>' + r.label + '</span>' + badge(r.id) + '</a>').join('');
    const bottom = ['inicio', 'seguimiento', 'leads', 'propiedades'];
    const moreActive = !bottom.includes(cur);
    $('#bottom-nav').innerHTML = bottom.map(id => { const r = ROUTES.find(x => x.id === id); return '<a href="#' + id + '" class="' + (id === cur ? 'active' : '') + '">' + ic(r.icon) + '<span>' + r.label + '</span>' + badge(id) + '</a>'; }).join('') +
      '<button type="button" id="more-btn" class="' + (moreActive ? 'active' : '') + '">' + ic('more') + '<span>Más</span></button>';
  }

  const SUBS = {
    inicio: () => new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    seguimiento: () => 'Lo que hay que hacer hoy, en orden de urgencia',
    leads: () => 'Personas que quieren comprar y propietarios que quieren vender',
    pipeline: () => 'Etapas de cada compra y de cada captación',
    propiedades: () => 'Stock, propietario y días en venta',
    reportes: () => 'Campañas, embudo y motivos de pérdida',
    ajustes: () => 'Perfiles de asesor, derivación y automatizaciones'
  };

  function render() {
    const r = route();
    const meta = ROUTES.find(x => x.id === r);
    $('#page-title').textContent = meta.title;
    $('#page-sub').textContent = SUBS[r]();
    document.title = meta.title + ' · Inmoconecta CRM';
    renderNav();
    renderTipoBar(r);
    $('#view').innerHTML = '<div class="view-inner">' + VIEWS[r]() + '</div>';
    if (AFTER[r]) AFTER[r]();
    $$('.tabs .on, .tipo-switch .on').forEach(b => { try { b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) { /* nada */ } });
    tickTimers();
  }
  const TIPO_ROUTES = ['inicio', 'seguimiento', 'leads', 'pipeline', 'reportes'];
  function renderTipoBar(r) {
    const bar = $('#tipo-bar');
    if (!TIPO_ROUTES.includes(r)) { bar.hidden = true; return; }
    bar.hidden = false;
    const open = S.leads.filter(isOpen);
    const n = t => open.filter(l => !t || l.tipo === t).length;
    const b = (t, label, cls) => '<button type="button" role="tab" data-settipo="' + t + '" class="' + cls + (UI.tipo === t ? ' on' : '') + '" aria-selected="' + (UI.tipo === t) + '">' + (cls ? '<i></i>' : '') + '<span>' + label + '</span><b>' + n(t) + '</b></button>';
    bar.innerHTML = '<span class="tipo-label">Ver</span><div class="tipo-switch" role="tablist" aria-label="Ver compra o venta">' + b('', 'Todos', '') + b('compra', 'Compra', 'c') + b('venta', 'Venta', 'v') + '</div>' +
      '<span class="tipo-hint">' + (UI.tipo === 'compra' ? 'Solo personas que quieren <b>comprar</b>' : UI.tipo === 'venta' ? 'Solo propietarios que quieren <b>vender</b>' : 'Compra y venta, cada uno en su bloque') + '</span>';
  }
  function rerenderSoft() {
    if (UI.dragging) { renderNav(); return; }
    const a = document.activeElement;
    if (a && $('#view').contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) { renderNav(); return; }
    const y = $('#view').scrollTop;
    render();
    $('#view').scrollTop = y;
  }

  /* ================= Componentes ================= */
  function kpi(label, value, foot, cls, go) {
    return '<' + (go ? 'a href="#' + go + '"' : 'div') + ' class="kpi ' + (cls || '') + '"><span class="label">' + label + '</span><span class="value">' + value + '</span><span class="foot">' + foot + '</span></' + (go ? 'a' : 'div') + '>';
  }
  function followRow(l, mode) {
    const t = now();
    let time = '', small = '', label = '', cls = '', acts = '';
    if (mode === 'sin') {
      cls = sev((t - l.created) / MIN);
      time = '<span class="wait ' + cls + '" data-since="' + l.created + '">' + timer(t - l.created) + '</span>';
      small = 'esperando';
      label = 'Sin primera respuesta';
      acts = '<button class="btn sm primary" data-act="attend" data-id="' + l.id + '">' + ic('call') + 'Atender</button><button class="btn sm" data-act="panel" data-p="derivar" data-id="' + l.id + '">' + ic('route') + 'Derivar</button>';
    } else if (mode === 'cita') {
      cls = l.visitConfirmed ? 'ok' : 'warn';
      time = '<span class="wait ' + cls + '">' + (isToday(l.visitAt) ? ft(l.visitAt) : wdf.format(new Date(l.visitAt))) + '</span>';
      small = isToday(l.visitAt) ? 'hoy' : ft(l.visitAt);
      label = (l.tipo === 'venta' ? 'Tasación · ' + esc(l.direccion) : 'Visita a ' + esc(l.interest)) + (l.visitConfirmed ? '' : ' · <b>por confirmar</b>');
      acts = l.visitConfirmed ? '<span class="fact ok">Confirmada</span>' : '<button class="btn sm primary" data-act="confirm" data-id="' + l.id + '">' + ic('win') + 'Confirmar</button>';
    } else {
      const overdue = l.next.at < t;
      cls = overdue ? (t - l.next.at > DAY ? 'crit' : 'warn') : '';
      time = '<span class="wait ' + cls + '">' + (overdue ? dur(t - l.next.at) : (isToday(l.next.at) ? ft(l.next.at) : wdf.format(new Date(l.next.at)))) + '</span>';
      small = overdue ? 'vencido' : (isToday(l.next.at) ? 'hoy' : ft(l.next.at));
      label = esc(l.next.text) + ' · <span class="muted">' + esc(sLabel(l)) + '</span>';
      acts = '<button class="btn sm primary" data-act="done" data-id="' + l.id + '">' + ic('win') + 'Hecho</button><button class="btn sm" data-act="panel" data-p="next" data-id="' + l.id + '">Reprogramar</button>';
    }
    return '<div class="frow ' + cls + '"><span class="stripe"></span>' +
      '<button class="frow-main" data-lead="' + l.id + '"><span class="frow-top"><b>' + esc(l.name) + '</b>' + tipoTag(l) + keyFact(l) + '</span>' +
      '<span class="frow-what">' + label + '</span>' +
      '<span class="frow-sub">' + whatLine(l) + '</span>' +
      '<span class="frow-who">' + av(l.agent, 'xs') + esc(agentName(l.agent)) + ' · ' + esc(agent(l.agent).perfil) + '</span></button>' +
      '<div class="frow-time">' + time + '<small>' + small + '</small></div>' +
      '<div class="frow-acts">' + acts + '</div></div>';
  }
  function leadRow(l) {
    const t = now();
    const time = unattended(l) ? '<span class="wait ' + sev((t - l.created) / MIN) + '" data-since="' + l.created + '">' + timer(t - l.created) + '</span>' : '<span class="muted">' + ago(lastAct(l)) + '</span>';
    return '<button class="lrow" data-lead="' + l.id + '"><span class="lrow-main"><b>' + esc(l.name) + '</b><small>' + whatLine(l) + '</small></span>' +
      '<span class="lrow-tags">' + tipoTag(l) + keyFact(l) + '</span>' +
      '<span class="lrow-stage">' + stageTxt(l) + '</span>' +
      '<span class="lrow-agent">' + av(l.agent, 'xs') + '<span>' + esc(agent(l.agent).name) + '</span></span>' +
      '<span class="lrow-time">' + time + '</span></button>';
  }
  const empty = txt => '<div class="empty">' + txt + '</div>';

  /* ================= Vistas ================= */
  const VIEWS = {};
  const AFTER = {};

  VIEWS.inicio = function () {
    const t = now();
    const g = followGroups();
    const oldest = g.sin.length ? t - g.sin[0].created : 0;
    const today = byTipo(S.leads).filter(l => isToday(l.created));
    const wins = byTipo(S.leads).filter(l => l.stage === 'ganado' && inLast(30, stageAt(l)));
    const attention = g.sin.map(l => followRow(l, 'sin')).concat(g.vencidos.slice(0, 3).map(l => followRow(l, 'next'))).slice(0, 6).join('');
    const citasHoy = g.citas.filter(l => isToday(l.visitAt));
    const l30 = byTipo(S.leads).filter(l => inLast(30, l.created));
    return '<div class="kpis">' +
      kpi('Sin atender ahora', g.sin.length, g.sin.length ? 'El más antiguo espera ' + dur(oldest) : 'Todo al día', g.sin.length ? 'alert' : '', 'seguimiento') +
      kpi('Seguimientos vencidos', g.vencidos.length, g.hoy.length + ' programados para hoy', g.vencidos.length ? 'warn' : '', 'seguimiento') +
      kpi('Leads de hoy', today.length, today.filter(l => l.tipo === 'compra').length + ' compra · ' + today.filter(l => l.tipo === 'venta').length + ' venta', '', 'leads') +
      kpi('Cierres · 30 días', wins.length, wins.filter(l => l.tipo === 'compra').length + ' compras · ' + wins.filter(l => l.tipo === 'venta').length + ' ventas', '', 'pipeline') +
      '</div>' +
      '<div class="grid g-main">' +
      '<section class="card"><div class="card-head"><h2>Atender ahora</h2><a class="hint" href="#seguimiento">Ver seguimiento →</a></div><div class="flist">' + (attention || empty('Nada pendiente. Buen trabajo.')) + '</div></section>' +
      '<div class="stack">' +
      '<section class="card"><div class="card-head"><h2>Citas de hoy</h2><span class="hint">' + citasHoy.length + '</span></div>' + (citasHoy.map(l => '<button class="mini" data-lead="' + l.id + '"><span class="mono">' + ft(l.visitAt) + '</span><span><b>' + esc(l.name) + '</b><small>' + (l.tipo === 'venta' ? 'Tasación · ' + esc(l.direccion) : 'Visita · ' + esc(l.interest)) + '</small></span>' + (l.visitConfirmed ? '<span class="fact ok">OK</span>' : '<span class="fact warn">Confirmar</span>') + '</button>').join('') || empty('Sin citas para hoy.')) + '</section>' +
      '<section class="card"><div class="card-head"><h2>Últimos 30 días</h2></div><div class="split2"><div><span class="tipo compra">Compra</span><b>' + l30.filter(l => l.tipo === 'compra').length + '</b><small>leads</small></div><div><span class="tipo venta">Venta</span><b>' + l30.filter(l => l.tipo === 'venta').length + '</b><small>propietarios</small></div></div></section>' +
      '</div></div>' +
      '<section class="card"><div class="card-head"><h2>Leads por día</h2><span class="hint">Últimos 30 días</span></div>' + dailyChart(30) + '</section>';
  };
  AFTER.inicio = () => bindChartTip();

  function dailyChart(days) {
    const start = dayStart(-(days - 1));
    const b = Array.from({ length: days }, (_, i) => ({ at: start + i * DAY, compra: 0, venta: 0 }));
    byTipo(S.leads).forEach(l => { const i = Math.floor((l.created - start) / DAY); if (i >= 0 && i < days) b[i][l.tipo]++; });
    const max = Math.ceil(Math.max(4, ...b.map(x => x.compra + x.venta)) / 4) * 4;
    const W = 720, H = 190, L = 28, B = 22, T = 6, R = 4, cw = (W - L - R) / days;
    const y = v => T + (H - T - B) * (1 - v / max);
    let s = '';
    for (let k = 0; k <= 4; k++) { const v = max / 4 * k; s += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis-label" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>'; }
    b.forEach((d, i) => {
      const x = L + i * cw + cw * 0.18, w = cw * 0.64;
      if (d.compra) s += '<rect x="' + x.toFixed(1) + '" y="' + y(d.compra).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(0) - y(d.compra)).toFixed(1) + '" rx="1.5" fill="var(--accent)"/>';
      if (d.venta) s += '<rect x="' + x.toFixed(1) + '" y="' + y(d.compra + d.venta).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, y(d.compra) - y(d.compra + d.venta) - 1.5).toFixed(1) + '" rx="1.5" fill="var(--gold)"/>';
      s += '<rect class="hit" data-tip="' + esc(wdf.format(new Date(d.at)) + ' · ' + d.compra + ' compra · ' + d.venta + ' venta') + '" x="' + (L + i * cw).toFixed(1) + '" y="' + T + '" width="' + cw.toFixed(1) + '" height="' + (H - T - B) + '" fill="transparent"/>';
      if (i % 5 === (days - 1) % 5) s += '<text class="axis-label" x="' + (L + i * cw + cw / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + new Date(d.at).getDate() + '/' + (new Date(d.at).getMonth() + 1) + '</text>';
    });
    return '<div class="legend"><span><i style="background:var(--accent)"></i>Compra</span><span><i style="background:var(--gold)"></i>Venta</span></div><div class="chart" id="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Leads por día de compra y venta">' + s + '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--line-strong)"/></svg><div class="tip" hidden></div></div>';
  }
  function bindChartTip() {
    const el = $('#chart'); if (!el) return;
    const tip = $('.tip', el);
    el.addEventListener('mousemove', e => {
      const h = e.target.closest('.hit');
      if (!h) { tip.hidden = true; return; }
      const r = el.getBoundingClientRect(), hr = h.getBoundingClientRect();
      tip.textContent = h.dataset.tip;
      tip.style.left = Math.min(r.width - 90, Math.max(90, hr.left - r.left + hr.width / 2)) + 'px';
      tip.style.top = '18px';
      tip.hidden = false;
    });
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  }

  VIEWS.seguimiento = function () {
    const g = followGroups();
    if (!UI.seg) UI.seg = g.sin.length ? 'sin' : 'vencidos';
    const tabs = [['sin', 'Sin atender', g.sin], ['vencidos', 'Vencidos', g.vencidos], ['hoy', 'Hoy', g.hoy], ['citas', 'Citas', g.citas], ['proximos', 'Próximos', g.proximos]];
    const cur = tabs.find(x => x[0] === UI.seg) || tabs[0];
    const mode = cur[0] === 'sin' ? 'sin' : cur[0] === 'citas' ? 'cita' : 'next';
    const notes = {
      sin: 'A los 5 min se avisa al asesor, a los 15 pasa a otro asesor con el mismo perfil y a los 30 se avisa a Alberto.',
      vencidos: 'Seguimientos que ya pasaron su fecha. Marca «Hecho» o reprograma.',
      hoy: 'Llamadas y tareas programadas para hoy.',
      citas: 'Visitas de compradores y tasaciones de propietarios de los próximos 7 días.',
      proximos: 'Lo que viene en los próximos días.'
    };
    return '<div class="tabs" id="seg-tabs" role="tablist">' + tabs.map(([id, l, arr]) => '<button type="button" role="tab" data-v="' + id + '" class="' + (id === cur[0] ? 'on' : '') + '" aria-selected="' + (id === cur[0]) + '">' + l + '<span class="n ' + ((id === 'sin' || id === 'vencidos') && arr.length ? 'hot' : '') + '">' + arr.length + '</span></button>').join('') + '</div>' +
      '<p class="note">' + notes[cur[0]] + '</p>' +
      '<div class="flist">' + (cur[2].slice(0, 40).map(l => followRow(l, mode)).join('') || empty('Nada pendiente aquí.')) + '</div>';
  };
  AFTER.seguimiento = () => $$('#seg-tabs button').forEach(b => b.addEventListener('click', () => { UI.seg = b.dataset.v; render(); }));

  VIEWS.leads = function () {
    const f = UI.leads;
    const tipo = UI.tipo;
    let ls = byTipo(S.leads);
    if (f.q) ls = ls.filter(l => matches(l.name + ' ' + l.id + ' ' + (l.interest || '') + ' ' + (l.zona || ''), l.phone, f.q));
    if (tipo === 'compra' && f.pago) ls = ls.filter(l => l.pago === f.pago);
    if (tipo === 'venta' && f.titulo) ls = ls.filter(l => (f.titulo === 'si') === !!l.aNombre);
    if (f.agent) ls = ls.filter(l => l.agent === f.agent);
    if (f.stage === 'open') ls = ls.filter(isOpen); else if (f.stage === 'perdido') ls = ls.filter(l => l.stage === 'perdido'); else if (f.stage === 'ganado') ls = ls.filter(l => l.stage === 'ganado');
    ls.sort((a, b) => (unattended(b) - unattended(a)) || (b.created - a.created));
    const chips = tipo === 'compra'
      ? segBtns('lf-pago', [['', 'Todas las formas de pago'], ['Contado', 'Contado'], ['Crédito', 'Crédito'], ['No sabe', 'No sabe']], f.pago)
      : tipo === 'venta' ? segBtns('lf-titulo', [['', 'Todos'], ['si', 'A su nombre'], ['no', 'No a su nombre']], f.titulo) : '';
    const tools = '<div class="toolbar"><input type="search" id="lf-q" placeholder="Buscar nombre, teléfono o código" value="' + esc(f.q) + '" aria-label="Buscar leads">' +
      '<select id="lf-agent" aria-label="Asesor">' + opt('', 'Todos los asesores', f.agent) + S.agents.map(a => opt(a.id, agentName(a.id), f.agent)).join('') + '</select>' +
      '<select id="lf-stage" aria-label="Estado">' + opt('open', 'Abiertos', f.stage) + opt('ganado', 'Cerrados', f.stage) + opt('perdido', 'Perdidos', f.stage) + opt('all', 'Todos', f.stage) + '</select></div>' +
      (chips ? '<div class="toolbar">' + chips + '</div>' : '');
    if (!tipo) {
      const block = (t, title, sub) => {
        const g = ls.filter(l => l.tipo === t);
        return '<section class="tblock ' + t + '"><div class="tblock-head"><div><span class="tipo ' + t + '">' + (t === 'venta' ? 'Venta' : 'Compra') + '</span><h2>' + title + '</h2><p>' + sub + '</p></div><button class="btn sm" data-settipo="' + t + '">Ver solo ' + (t === 'venta' ? 'venta' : 'compra') + ' (' + g.length + ') →</button></div>' +
          '<div class="llist">' + (g.slice(0, 6).map(leadRow).join('') || empty('Sin leads con estos filtros.')) + '</div></section>';
      };
      return tools + '<div class="tblocks">' + block('compra', 'Quieren comprar', 'Filtra por contado, crédito o «no sabe»') + block('venta', 'Quieren vender', 'Filtra por si la propiedad está a su nombre') + '</div>';
    }
    return tools + '<div class="list-head"><span class="tipo ' + tipo + '">' + (tipo === 'venta' ? 'Venta' : 'Compra') + '</span><b>' + ls.length + (tipo === 'venta' ? ' propietarios que quieren vender' : ' personas que quieren comprar') + '</b></div>' +
      '<div class="llist">' + (ls.slice(0, f.limit).map(leadRow).join('') || empty('Ningún lead coincide con los filtros.')) + '</div>' +
      (ls.length > f.limit ? '<button class="btn more" data-act="more-leads">Ver ' + Math.min(40, ls.length - f.limit) + ' más</button>' : '');
  };
  AFTER.leads = function () {
    const segBind = (id, key) => $$('#' + id + ' button').forEach(b => b.addEventListener('click', () => { UI.leads[key] = b.dataset.v; UI.leads.limit = 40; render(); }));
    segBind('lf-pago', 'pago'); segBind('lf-titulo', 'titulo');
    $('#lf-agent').addEventListener('change', e => { UI.leads.agent = e.target.value; render(); });
    $('#lf-stage').addEventListener('change', e => { UI.leads.stage = e.target.value; render(); });
    $('#lf-q').addEventListener('input', e => { UI.leads.q = e.target.value; render(); const q = $('#lf-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); });
  };

  VIEWS.pipeline = function () {
    const f = UI.pipe;
    const t = now();
    const tipos = UI.tipo ? [UI.tipo] : ['compra', 'venta'];
    const board = tipo => {
      const cols = D.STAGES[tipo];
      let ls = S.leads.filter(l => l.tipo === tipo && l.stage !== 'perdido' && (l.stage !== 'ganado' || inLast(60, stageAt(l))));
      if (f.agent) ls = ls.filter(l => l.agent === f.agent);
      const stuck = tipo === 'compra' ? [0.25, 3, 5, 5, 5, 10, 999] : [0.25, 4, 5, 7, 60, 999];
      return '<section class="tblock ' + tipo + '"><div class="tblock-head"><div><span class="tipo ' + tipo + '">' + (tipo === 'venta' ? 'Venta' : 'Compra') + '</span><h2>' + (tipo === 'venta' ? 'Captación de propietarios' : 'Pipeline de compra') + '</h2><p>' + ls.filter(isOpen).length + ' leads abiertos' + (tipo === 'venta' ? ' · de la solicitud a la venta' : ' · del primer contacto a la firma') + '</p></div>' + (UI.tipo ? '' : '<button class="btn sm" data-settipo="' + tipo + '">Ver solo ' + tipo + ' →</button>') + '</div>' +
        '<div class="board">' + cols.map((c, ci) => {
          const items = ls.filter(l => l.stage === c.id).sort((a, b) => b.score - a.score);
          return '<div class="col" data-stage="' + c.id + '" data-tipo="' + tipo + '"><div class="col-head"><b>' + c.label + '</b><span>' + items.length + '</span></div>' +
            items.slice(0, UI.tipo ? 25 : 6).map(l => {
              const d = (t - stageAt(l)) / DAY;
              const cls = c.id === 'ganado' ? '' : d > stuck[ci] * 2 ? 'crit' : d > stuck[ci] ? 'warn' : '';
              return '<div class="kcard" draggable="true" data-lead="' + l.id + '"><div class="row"><span class="name">' + esc(l.name) + '</span><span class="age ' + cls + '">' + dur(t - stageAt(l)) + '</span></div>' +
                '<div class="meta">' + whatLine(l) + '</div><div class="row">' + keyFact(l) + av(l.agent, 'xs') + '</div></div>';
            }).join('') + (items.length > (UI.tipo ? 25 : 6) ? '<div class="col-more">+ ' + (items.length - (UI.tipo ? 25 : 6)) + ' más</div>' : '') + (items.length ? '' : '<div class="col-empty">Sin leads</div>') + '</div>';
        }).join('') + '</div></section>';
    };
    return '<div class="toolbar"><select id="pf-agent" aria-label="Asesor">' + opt('', 'Todos los asesores', f.agent) + S.agents.map(a => opt(a.id, agentName(a.id), f.agent)).join('') + '</select>' +
      '<span class="muted small push hide-sm">Arrastra una tarjeta para cambiar de etapa</span></div>' + tipos.map(board).join('');
  };
  AFTER.pipeline = function () {
    $('#pf-agent').addEventListener('change', e => { UI.pipe.agent = e.target.value; render(); });
    let dragId = null;
    $$('.kcard').forEach(c => {
      c.addEventListener('dragstart', e => { dragId = c.dataset.lead; UI.dragging = true; c.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* nada */ } });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
    });
    $$('.col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', () => col.classList.remove('drop'));
      col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('drop'); let id = dragId; try { id = id || e.dataTransfer.getData('text/plain'); } catch (x) { /* nada */ } UI.dragging = false; const l = id && lead(id); if (l && l.tipo === col.dataset.tipo) setStage(l, col.dataset.stage); else if (l) toast('No se puede mover ahí', 'Un lead de ' + l.tipo + ' solo se mueve en su propio tablero'); dragId = null; });
    });
  };

  function propStats(p) {
    const ls = S.leads.filter(l => l.interest === p.id);
    const t = now();
    return { leads: ls.length, leads7: ls.filter(l => t - l.created < 7 * DAY).length, visits: ls.filter(l => reached(l) >= 3 && l.visitAt && l.visitAt <= t).length, offers: ls.filter(l => reached(l) >= 4).length, list: ls };
  }
  const domOf = p => p.status === 'En captación' ? 0 : Math.floor(((p.soldAt || now()) - p.listedAt) / DAY);
  const domPill = d => '<span class="fact ' + (d > 90 ? 'crit' : d > 45 ? 'warn' : 'ok') + '">' + d + ' días</span>';
  VIEWS.propiedades = function () {
    const f = UI.props;
    const t = now();
    let ps = S.properties.slice();
    if (f.status) ps = ps.filter(p => p.status === f.status);
    if (f.stale) ps = ps.filter(p => p.status === 'Disponible' && t - p.listedAt > 90 * DAY);
    const avail = S.properties.filter(p => p.status === 'Disponible');
    const avgDom = Math.round(avail.reduce((s, p) => s + domOf(p), 0) / Math.max(1, avail.length));
    return '<div class="kpis k3">' +
      kpi('Disponibles', avail.length, avail.filter(p => p.op === 'Venta').length + ' en venta · ' + avail.filter(p => p.op === 'Alquiler').length + ' en alquiler') +
      kpi('Días promedio en venta', avgDom, avail.filter(p => domOf(p) > 90).length + ' con más de 90 días', avail.some(p => domOf(p) > 90) ? 'warn' : '') +
      kpi('Propietarios en captación', S.leads.filter(l => l.tipo === 'venta' && isOpen(l) && l.stage !== 'publicada').length, 'Ver pipeline de venta', '', 'pipeline') +
      '</div>' +
      '<div class="toolbar">' + segBtns('pr-status', [['Disponible', 'Disponibles'], ['Reservada', 'Reservadas'], ['Vendida', 'Vendidas'], ['', 'Todas']], f.status) +
      '<label class="check"><input type="checkbox" id="pr-stale"' + (f.stale ? ' checked' : '') + '> Más de 90 días</label>' +
      '<button class="btn primary sm push" data-act="new-prop">' + ic('plus') + 'Agregar</button></div>' +
      '<div class="props">' + (ps.map(p => {
        const st = propStats(p);
        const d = domOf(p);
        return '<button class="prop" data-prop="' + p.id + '"><div class="ph">' + propArt(p) + '<span class="code">' + p.id + '</span></div>' +
          '<div class="prop-body"><div class="row-between"><span class="price">' + money(p.cur, p.price) + (p.op === 'Alquiler' ? '<small> /mes</small>' : '') + '</span>' + (p.status === 'Disponible' ? domPill(d) : '<span class="fact ' + (p.status === 'Vendida' ? 'ok' : 'accent') + '">' + p.status + '</span>') + '</div>' +
          '<div class="addr">' + esc(p.type) + ' · ' + esc(p.district) + '</div>' +
          '<div class="small muted">Propietario: ' + esc(owner(p.owner).name) + '</div>' +
          '<div class="stats"><div><b>' + st.leads + '</b>interesados</div><div><b>' + st.visits + '</b>visitas</div><div><b>' + p.campaigns.length + '</b>campañas</div></div></div></button>';
      }).join('') || empty('Ninguna propiedad coincide.')) + '</div>';
  };
  AFTER.propiedades = function () {
    $$('#pr-status button').forEach(b => b.addEventListener('click', () => { UI.props.status = b.dataset.v; render(); }));
    $('#pr-stale').addEventListener('change', e => { UI.props.stale = e.target.checked; render(); });
  };
  function propArt(p) {
    const h = p.hue;
    const sky = 'hsl(' + h + ' 30% 82%)', sky2 = 'hsl(' + ((h + 30) % 360) + ' 35% 90%)', hill = 'hsl(' + ((h + 140) % 360) + ' 15% 58%)', body = 'hsl(' + h + ' 25% 36%)', win = 'hsl(45 85% 80%)';
    let b = '';
    if (/Departamento|Oficina/.test(p.type)) {
      b = '<rect x="150" y="30" width="90" height="130" fill="' + body + '"/><rect x="240" y="60" width="60" height="100" fill="hsl(' + h + ' 22% 28%)"/>';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) b += '<rect x="' + (160 + c * 26) + '" y="' + (42 + r * 23) + '" width="16" height="12" fill="' + ((r + c) % 3 ? win : 'hsl(' + h + ' 20% 62%)') + '"/>';
    } else if (/Terreno/.test(p.type)) {
      b = '<path d="M60 150 L200 120 L340 150 L200 170 Z" fill="hsl(95 28% 48%)"/><path d="M60 150 L200 120 L340 150" fill="none" stroke="#fff" stroke-dasharray="6 5" stroke-width="2"/><rect x="195" y="96" width="3" height="26" fill="#fff"/><path d="M198 96 L216 102 L198 108 Z" fill="hsl(' + h + ' 60% 48%)"/>';
    } else if (/Local/.test(p.type)) {
      b = '<rect x="120" y="60" width="160" height="100" fill="' + body + '"/><rect x="120" y="60" width="160" height="18" fill="hsl(' + h + ' 50% 46%)"/><rect x="135" y="92" width="60" height="68" fill="' + win + '"/><rect x="210" y="92" width="55" height="45" fill="' + win + '"/>';
    } else {
      b = '<path d="M130 100 L200 50 L270 100 Z" fill="hsl(' + h + ' 40% 40%)"/><rect x="140" y="100" width="120" height="60" fill="' + body + '"/><rect x="190" y="120" width="22" height="40" fill="hsl(' + h + ' 22% 24%)"/><rect x="152" y="112" width="26" height="20" fill="' + win + '"/><rect x="222" y="112" width="26" height="20" fill="' + win + '"/>';
    }
    return '<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g' + p.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky + '"/><stop offset="1" stop-color="' + sky2 + '"/></linearGradient></defs><rect width="400" height="200" fill="url(#g' + p.id + ')"/><path d="M0 120 L70 70 L130 105 L210 55 L290 100 L350 72 L400 95 V200 H0 Z" fill="' + hill + '" opacity=".5"/><path d="M180 70 L210 55 L232 68 Z" fill="#fff" opacity=".8"/><rect y="160" width="400" height="40" fill="hsl(' + ((h + 140) % 360) + ' 12% 44%)"/>' + b + '</svg>';
  }

  /* ---------- Reportes ---------- */
  function funnelData(leads, tipo) {
    const steps = D.STAGES[tipo].map((s, i) => ({ id: s.id, label: s.label, i, count: 0, lost: 0, reasons: {}, times: [] }));
    leads.forEach(l => {
      const m = reached(l);
      for (let i = 0; i <= m; i++) steps[i].count++;
      if (l.stage === 'perdido') { const st = steps[sIdx(l, l.lostStage)]; if (st) { st.lost++; st.reasons[l.lossReason] = (st.reasons[l.lossReason] || 0) + 1; } }
      for (let k = 0; k < l.history.length - 1; k++) { const i = sIdx(l, l.history[k].stage); if (i >= 0 && l.history[k + 1].stage !== 'perdido') steps[i].times.push(l.history[k + 1].at - l.history[k].at); }
    });
    return steps;
  }
  function funnelHTML(steps) {
    const top = steps[0].count || 1;
    return '<div class="funnel">' + steps.map((s, i) => {
      const topReason = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
      return '<div class="fstep"><div class="lbl">' + esc(s.label) + '<small>' + (s.times.length ? 'mediana ' + dur(median(s.times)) : '&nbsp;') + '</small></div>' +
        '<div class="barwrap"><div class="fbar" style="width:' + Math.max(s.count / top * 100, 5) + '%">' + s.count + '</div></div>' +
        '<div class="drop">' + (s.lost ? '<b>−' + s.lost + '</b> · ' + esc(topReason[0]) : (i === steps.length - 1 ? '<span class="fact ok">cerrados</span>' : '<span class="muted">—</span>')) + '</div></div>';
    }).join('') + '</div>';
  }
  function hbars(rows, cls) {
    const max = Math.max(1, ...rows.map(r => r.v));
    return rows.map(r => '<div class="hbar"><span class="name" title="' + esc(r.name) + '">' + esc(r.name) + '</span><div class="track"><div class="fill ' + (cls || '') + '" style="width:' + Math.max(2, r.v / max * 100) + '%"></div></div><span class="v">' + (r.label != null ? r.label : r.v) + '</span></div>').join('');
  }
  function campStats(c) {
    const ls = S.leads.filter(l => l.campaign === c.id);
    const won = ls.filter(l => l.stage === 'ganado');
    return { leads: ls.length, visits: ls.filter(l => reached(l) >= (c.sellers ? 2 : 3)).length, won: won.length, comm: won.reduce((s, l) => s + commission(l), 0), list: ls };
  }
  VIEWS.reportes = function () {
    const tab = UI.rep.tab;
    let body = '';
    if (tab === 'campanas') {
      const rows = S.campaigns.filter(c => !UI.tipo || (UI.tipo === 'venta') === !!c.sellers).map(c => Object.assign({ c }, campStats(c)));
      const spend = rows.reduce((s, r) => s + r.c.spend, 0), leads = rows.reduce((s, r) => s + r.leads, 0), comm = rows.reduce((s, r) => s + r.comm, 0), won = rows.reduce((s, r) => s + r.won, 0);
      body = '<div class="kpis">' + kpi('Inversión', 'S/ ' + num(spend), 'Meta y TikTok') + kpi('Leads de campañas', leads, 'S/ ' + (spend / Math.max(1, leads)).toFixed(2) + ' por lead') + kpi('Cierres atribuidos', won, 'Compras y ventas') + kpi('Retorno', (comm / Math.max(1, spend)).toFixed(1) + '<small>x</small>', 'Comisión S/ ' + num(comm)) + '</div>' +
        '<section class="card"><div class="card-head"><h2>Por campaña</h2><span class="hint">Clic para ver detalle</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Campaña</th><th class="r">Inversión</th><th class="r">Leads</th><th class="r">Costo/lead</th><th class="r">Visitas o tasaciones</th><th class="r">Cierres</th></tr></thead><tbody>' +
        rows.map(r => '<tr class="click" data-camp="' + r.c.id + '"><td><div class="cell-main">' + esc(r.c.name) + '</div><div class="cell-sub">' + platformLabel(r.c.platform) + ' · ' + (r.c.sellers ? 'propietarios que venden' : 'compradores') + (r.c.status !== 'Activa' ? ' · pausada' : '') + '</div></td><td class="r num">S/ ' + num(r.c.spend) + '</td><td class="r num">' + r.leads + '</td><td class="r num">S/ ' + (r.c.spend / Math.max(1, r.leads)).toFixed(2) + '</td><td class="r num">' + r.visits + '</td><td class="r num">' + r.won + '</td></tr>').join('') +
        '</tbody></table></div></section>';
    } else if (tab === 'embudo') {
      const tipo = UI.tipo || UI.rep.tipo;
      const ls = S.leads.filter(l => l.tipo === tipo && inLast(60, l.created));
      const steps = funnelData(ls, tipo);
      const lost = ls.filter(l => l.stage === 'perdido');
      const reasons = {};
      lost.forEach(l => { reasons[l.lossReason] = (reasons[l.lossReason] || 0) + 1; });
      const splitRows = tipo === 'compra'
        ? D.PAGO.map(p => { const g = ls.filter(l => l.pago === p); return { name: p, v: pct(g.filter(l => reached(l) >= 3).length, g.length), label: pct(g.filter(l => reached(l) >= 3).length, g.length) + '% llegó a visita · ' + g.length + ' leads' }; })
        : [true, false].map(b => { const g = ls.filter(l => !!l.aNombre === b); return { name: b ? 'A su nombre' : 'No a su nombre', v: pct(g.filter(l => reached(l) >= 3).length, g.length), label: pct(g.filter(l => reached(l) >= 3).length, g.length) + '% firmó exclusiva · ' + g.length + ' leads' }; });
      body = '<div class="toolbar">' + (UI.tipo ? '' : segBtns('rt-tipo', [['compra', 'Compra'], ['venta', 'Venta']], tipo)) + '<span class="muted small">' + ls.length + ' leads · últimos 60 días</span></div>' +
        '<section class="card"><div class="card-head"><h2>Dónde se pierden</h2><span class="hint">Leads por etapa y motivo principal de pérdida</span></div>' + funnelHTML(steps) + '</section>' +
        '<div class="grid g2"><section class="card"><div class="card-head"><h2>' + (tipo === 'compra' ? 'Según forma de pago' : 'Según si está a su nombre') + '</h2></div>' + hbars(splitRows) + '</section>' +
        '<section class="card"><div class="card-head"><h2>Motivos de pérdida</h2><span class="hint">' + lost.length + ' perdidos</span></div>' + hbars(Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => ({ name: n, v, label: v + ' · ' + pct(v, lost.length) + '%' })), 'crit') + '</section></div>';
    } else {
      const rows = S.agents.map(a => {
        const base = byTipo(S.leads).filter(l => l.agent === a.id);
        const ls = base.filter(l => inLast(30, l.created));
        const r = ls.map(responseMins).filter(v => v != null);
        return { a, n: ls.length, c: ls.filter(l => l.tipo === 'compra').length, v: ls.filter(l => l.tipo === 'venta').length, med: median(r), open: base.filter(isOpen).length, won: base.filter(l => l.stage === 'ganado' && inLast(60, stageAt(l))).length };
      });
      body = '<section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Asesor</th><th class="r">Leads 30 d</th><th class="r">Compra / venta</th><th class="r">Abiertos</th><th class="r">1ª respuesta</th><th class="r">Cierres 60 d</th></tr></thead><tbody>' +
        rows.map(r => '<tr><td><div class="who">' + av(r.a.id) + '<div><div class="cell-main">' + esc(agentName(r.a.id)) + '</div><div class="cell-sub">' + esc(r.a.perfil) + '</div></div></div></td><td class="r num">' + r.n + '</td><td class="r num">' + r.c + ' / ' + r.v + '</td><td class="r num">' + r.open + '</td><td class="r"><span class="wait ' + sev(r.med) + '">' + (r.n ? dur(r.med * MIN) : '—') + '</span></td><td class="r num">' + r.won + '</td></tr>').join('') +
        '</tbody></table></div></section>';
    }
    return '<div class="tabs" id="rep-tabs">' + [['campanas', 'Campañas'], ['embudo', 'Embudo'], ['asesores', 'Asesores']].map(([v, l]) => '<button type="button" data-v="' + v + '" class="' + (v === tab ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' + body;
  };
  AFTER.reportes = function () {
    $$('#rep-tabs button').forEach(b => b.addEventListener('click', () => { UI.rep.tab = b.dataset.v; render(); }));
    $$('#rt-tipo button').forEach(b => b.addEventListener('click', () => { UI.rep.tipo = b.dataset.v; render(); }));
  };

  /* ---------- Asesores y ajustes ---------- */
  const PERFILES = [
    { perfil: 'Compradores con crédito', tags: ['Compra', 'Crédito', 'No sabe cómo pagar'], match: { tipo: 'compra', pago: ['Crédito', 'No sabe'] } },
    { perfil: 'Compradores al contado', tags: ['Compra', 'Contado', 'Casas, departamentos y locales'], match: { tipo: 'compra', pago: ['Contado'] } },
    { perfil: 'Terrenos y lotes', tags: ['Compra', 'Terrenos', 'Proyectos de lotes'], match: { tipo: 'compra', propTipos: ['Terreno'] } },
    { perfil: 'Captación de propietarios', tags: ['Venta', 'Tasaciones', 'Exclusivas'], match: { tipo: 'venta' } },
    { perfil: 'General', tags: ['Compra y venta'], match: {} }
  ];
  VIEWS.ajustes = function () {
    const tab = UI.aj.tab;
    let body = '';
    if (tab === 'asesores') {
      body = '<section class="card"><div class="card-head"><h2>Cómo se deriva cada lead</h2></div><ol class="rules">' +
        '<li><b>¿Compra o venta?</b> Si quiere vender, va a <b>Captación de propietarios</b>.</li>' +
        '<li><b>Compra de terreno o lote</b> → <b>Terrenos y lotes</b>.</li>' +
        '<li><b>Compra con crédito o «no sabe»</b> → <b>Compradores con crédito</b>, que lo orienta con el banco.</li>' +
        '<li><b>Compra al contado</b> → <b>Compradores al contado</b>.</li>' +
        '<li>Si ese asesor no está en turno, pasa al siguiente con el perfil más cercano. Si nadie responde en 15 min, se reasigna.</li></ol></section>' +
        '<div class="agents">' + S.agents.map(a => {
          const open = S.leads.filter(l => l.agent === a.id && isOpen(l)).length;
          return '<div class="card agent"><div class="row-between"><div class="who">' + av(a.id) + '<div><div class="cell-main">' + esc(agentName(a.id)) + '</div><div class="cell-sub">' + esc(a.role) + ' · ' + open + ' leads abiertos</div></div></div>' +
            (a.rr ? '<label class="switch" title="En turno"><input type="checkbox" data-duty="' + a.id + '"' + (a.onDuty ? ' checked' : '') + ' aria-label="En turno"><span></span></label>' : '') + '</div>' +
            (a.rr ? '<div class="field"><label for="pf-' + a.id + '">Perfil</label><select id="pf-' + a.id + '" data-perfil="' + a.id + '">' + PERFILES.map(p => opt(p.perfil, p.perfil, a.perfil)).join('') + '</select></div>' : '<div class="small muted">' + esc(a.perfil) + '</div>') +
            '<div class="chips">' + a.tags.map(x => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>' +
            (a.rr ? '<div class="small ' + (a.onDuty ? 'ok-txt' : 'muted') + '">' + (a.onDuty ? 'En turno: recibe leads' : 'Fuera de turno: no recibe leads') + '</div>' : '') + '</div>';
        }).join('') + '</div>';
    } else if (tab === 'auto') {
      body = '<section class="card">' + S.automations.map(a => '<div class="rule"><label class="switch"><input type="checkbox" data-rule="' + a.id + '"' + (a.on ? ' checked' : '') + ' aria-label="Activar ' + esc(a.name) + '"><span></span></label><div><h3>' + esc(a.name) + '</h3><p class="small muted"><b>Cuando</b> ' + esc(a.when) + '. <b>Entonces</b> ' + esc(a.then) + '.</p></div></div>').join('') + '</section>' +
        ((S.log || []).length ? '<section class="card"><div class="card-head"><h2>Actividad de esta sesión</h2></div><ul class="timeline">' + S.log.slice(-8).reverse().map(e => '<li><span class="ic auto">' + ic('auto') + '</span><div><div class="txt">' + esc(e.text) + '</div><div class="when">' + fdt(e.at) + '</div></div></li>').join('') + '</ul></section>' : '');
    } else {
      body = '<div class="agents">' + S.integrations.map(i => '<div class="card agent"><div class="row-between"><h3>' + esc(i.name) + '</h3><span class="fact ' + (i.status === 'Conectado' ? 'ok' : 'warn') + '">' + esc(i.status) + '</span></div><div class="small muted">' + esc(i.detail) + '</div><p class="small">' + esc(i.how) + '</p></div>').join('') + '</div>';
    }
    return '<div class="tabs" id="aj-tabs">' + [['asesores', 'Asesores y derivación'], ['auto', 'Automatizaciones'], ['integ', 'Integraciones']].map(([v, l]) => '<button type="button" data-v="' + v + '" class="' + (v === tab ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' + body;
  };
  AFTER.ajustes = function () {
    $$('#aj-tabs button').forEach(b => b.addEventListener('click', () => { UI.aj.tab = b.dataset.v; render(); }));
    $$('[data-duty]').forEach(i => i.addEventListener('change', () => { const a = agent(i.dataset.duty); a.onDuty = i.checked; save(); toast(a.name + (i.checked ? ' entró en turno' : ' salió de turno'), i.checked ? 'Vuelve a recibir leads de su perfil.' : 'Sus leads nuevos irán al asesor con el perfil más cercano.'); render(); }));
    $$('[data-perfil]').forEach(s => s.addEventListener('change', () => { const a = agent(s.dataset.perfil); const p = PERFILES.find(x => x.perfil === s.value); Object.assign(a, { perfil: p.perfil, tags: p.tags.slice(), match: JSON.parse(JSON.stringify(p.match)) }); save(); toast('Perfil actualizado', a.name + ' ahora atiende: ' + p.perfil); render(); }));
    $$('[data-rule]').forEach(i => i.addEventListener('change', () => { const r = S.automations.find(x => x.id === i.dataset.rule); r.on = i.checked; save(); toast(r.name, i.checked ? 'Activada' : 'Desactivada'); }));
  };

  /* ================= Cajón (fichas) ================= */
  function openDrawer(html) {
    const d = $('#drawer');
    d.innerHTML = html;
    $('#scrim').hidden = false;
    requestAnimationFrame(() => { $('#scrim').classList.add('show'); d.classList.add('show'); });
    d.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('drawer-open');
    // El botón «Atrás» del navegador cierra la ficha en lugar de salir de la pantalla
    if (!UI.drawerHist) { try { history.pushState({ drawer: 1 }, ''); UI.drawerHist = true; } catch (e) { /* nada */ } }
    tickTimers();
  }
  function closeDrawer(fromNav) {
    if (UI.drawerHist) { UI.drawerHist = false; if (!fromNav) { try { history.back(); } catch (e) { /* nada */ } } }
    UI.drawer = null;
    const d = $('#drawer');
    d.classList.remove('show'); $('#scrim').classList.remove('show');
    d.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('drawer-open');
    setTimeout(() => { if (!UI.drawer) { $('#scrim').hidden = true; d.innerHTML = ''; } }, 250);
  }
  const closeBtn = '<button class="btn ghost sm close" data-act="close" aria-label="Cerrar">' + ic('close') + '</button>';
  function localInput(ts) { const d = new Date(ts); d.setMinutes(0, 0, 0); d.setHours(Math.max(9, Math.min(18, d.getHours()))); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  function leadDrawer(id, panel) {
    const l = lead(id); if (!l) return;
    const keep = UI.drawer && UI.drawer.kind === 'lead' && UI.drawer.id === id;
    const scroll = keep && $('.dr-body') ? $('.dr-body').scrollTop : 0;
    UI.drawer = { kind: 'lead', id, panel: panel || '' };
    const t = now();
    const p = prop(l.interest);
    const c = camp(l.campaign);
    const r = reached(l);
    const recA = rec(l);
    const cur = agent(l.agent);
    const st = stagesOf(l);
    const journey = '<div class="journey">' + st.map((s, i) => {
      const cls = l.stage === 'perdido' && s.id === l.lostStage ? 'lost' : i < r || (i === r && l.stage === 'ganado') ? 'done' : i === r ? 'cur' : '';
      return '<div class="' + cls + '"><div class="seg-bar"></div><span>' + s.label + '</span></div>';
    }).join('') + '</div>';
    const evs = l.events.slice().sort((a, b) => a.at - b.at);
    const evHTML = list => '<ul class="timeline">' + list.map(e => '<li><span class="ic ' + e.type + '">' + ic(e.type) + '</span><div><div class="txt">' + esc(e.text) + '</div><div class="when">' + fdt(e.at) + (e.by ? ' · ' + esc(agentName(e.by)) : e.type === 'auto' ? ' · automático' : '') + '</div></div></li>').join('') + '</ul>';
    const panels = {
      derivar: '<div class="inline-form"><div class="field"><label for="dv-agent">Derivar a</label><select id="dv-agent">' + S.agents.map(a => opt(a.id, agentName(a.id) + ' · ' + a.perfil + (a.id === recA.agent.id ? ' (recomendado)' : '') + (a.rr && !a.onDuty ? ' · fuera de turno' : ''), recA.agent.id)).join('') + '</select></div><div class="row-flex"><button class="btn primary sm" data-act="derivar-save" data-id="' + l.id + '">Derivar</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      wa: '<div class="inline-form"><div class="wa-preview" id="wa-text">' + esc(l.tipo === 'venta' ? 'Hola ' + l.name.split(' ')[0] + ', soy ' + cur.name + ' de Inmoconecta. Gracias por pensar en nosotros para vender tu ' + l.propTipo.toLowerCase() + ' en ' + l.zona + '. ¿Qué día te queda bien para la tasación gratuita?' + (l.aNombre ? '' : ' Si la propiedad no está a tu nombre, te ayudamos con los documentos.') : 'Hola ' + l.name.split(' ')[0] + ', soy ' + cur.name + ' de Inmoconecta. Vi que te interesa ' + (p ? 'el inmueble ' + p.id + ' en ' + p.district : 'un ' + l.propTipo.toLowerCase() + ' en ' + l.zona) + '. ¿Te llamo ahora o prefieres agendar una visita?') + '</div><div class="row-flex"><button class="btn primary sm" data-act="wa-send" data-id="' + l.id + '">Registrar envío</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      cita: '<div class="inline-form"><div class="form-row"><div class="field"><label for="v-date">' + (l.tipo === 'venta' ? 'Fecha de tasación' : 'Fecha de visita') + '</label><input type="datetime-local" id="v-date" value="' + localInput(t + DAY) + '"></div>' + (l.tipo === 'compra' ? '<div class="field"><label for="v-prop">Propiedad</label><select id="v-prop">' + S.properties.filter(x => x.status !== 'Vendida' || x.id === l.interest).map(x => opt(x.id, x.id + ' · ' + x.type + ' · ' + x.district, l.interest)).join('') + '</select></div>' : '') + '</div><div class="row-flex"><button class="btn primary sm" data-act="cita-save" data-id="' + l.id + '">Agendar</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      next: '<div class="inline-form"><div class="form-row"><div class="field"><label for="n-date">Próximo seguimiento</label><input type="datetime-local" id="n-date" value="' + localInput(t + DAY) + '"></div><div class="field"><label for="n-text">Qué hacer</label><input id="n-text" value="' + esc((l.next && l.next.text) || D.NEXT[l.tipo][l.stage] || 'Llamar') + '"></div></div><div class="row-flex"><button class="btn primary sm" data-act="next-save" data-id="' + l.id + '">Guardar</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      lost: '<div class="inline-form"><div class="field"><label for="lost-r">Motivo</label><select id="lost-r">' + D.LOSS_REASONS[l.tipo].map(x => opt(x, x, '')).join('') + '</select></div><div class="row-flex"><button class="btn sm danger" data-act="lost-save" data-id="' + l.id + '">Marcar como perdido</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      note: '<div class="inline-form"><div class="field"><label for="note-t">Nota</label><textarea id="note-t" rows="3" placeholder="Ej.: prefiere que lo llamen después de las 6 p. m."></textarea></div><div class="row-flex"><button class="btn primary sm" data-act="note-save" data-id="' + l.id + '">Guardar nota</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>'
    };
    const datos = l.tipo === 'compra'
      ? '<dl class="kv"><div><dt>Busca</dt><dd>' + esc(l.propTipo) + ' en ' + esc(l.zona) + '</dd></div><div><dt>Presupuesto</dt><dd>' + money(l.cur, l.budget) + '</dd></div>' +
        '<div><dt>¿Cómo paga?</dt><dd><select id="ed-pago" aria-label="Forma de pago">' + D.PAGO.map(x => opt(x, x, l.pago)).join('') + '</select></dd></div>' +
        (l.pago === 'Crédito' ? '<div><dt>Tipo de crédito</dt><dd><select id="ed-credito" aria-label="Tipo de crédito">' + D.CREDITO.map(x => opt(x, x, l.credito)).join('') + '</select></dd></div>' : '<div><dt>¿Cuándo compra?</dt><dd>' + esc(l.plazo) + '</dd></div>') +
        (p ? '<div class="span2"><dt>Le interesa</dt><dd><button class="link-btn" data-prop="' + p.id + '">' + p.id + ' · ' + esc(p.type) + ' · ' + esc(p.address) + '</button> · ' + money(p.cur, p.price) + '</dd></div>' : '') + '</dl>'
      : '<dl class="kv"><div><dt>Inmueble</dt><dd>' + esc(l.propTipo) + ' · ' + esc(l.direccion) + ', ' + esc(l.zona) + '</dd></div><div><dt>Precio que espera</dt><dd>' + money(l.cur, l.precio) + '</dd></div>' +
        '<div><dt>¿Está a su nombre?</dt><dd><select id="ed-anombre" aria-label="¿Está a su nombre?">' + opt('si', 'Sí, a su nombre', l.aNombre ? 'si' : 'no') + opt('no', 'No está a su nombre', l.aNombre ? 'si' : 'no') + '</select></dd></div>' +
        (l.aNombre ? '<div><dt>Motivo de venta</dt><dd>' + esc(l.motivo) + '</dd></div>' : '<div><dt>Situación</dt><dd><select id="ed-detalle" aria-label="Situación del título">' + D.NO_A_NOMBRE.map(x => opt(x, x, l.tituloDetalle)).join('') + '</select></dd></div>') + '</dl>' +
        (l.aNombre ? '' : '<div class="insight gold">' + ic('bulb') + '<div>No está a su nombre: se envía la lista de documentos para sanear el título y se crea una tarea de revisión legal antes de firmar la exclusiva.</div></div>');
    const nextHTML = l.next && isOpen(l) ? '<div class="next-box ' + (l.next.at < t ? 'over' : '') + '">' + ic('clock') + '<div><b>' + esc(l.next.text) + '</b><small>' + (l.next.at < t ? 'Vencido hace ' + dur(t - l.next.at) : whenLabel(l.next.at)) + '</small></div><button class="btn sm" data-act="done" data-id="' + l.id + '">Hecho</button></div>' : '';
    const html = '<div class="dr-head"><div class="top-row"><div class="min0"><div class="eyebrow">' + l.id + ' · ' + esc(D.SOURCES[l.src].short) + ' · ' + ago(l.created) + '</div><h2 id="dr-title">' + esc(l.name) + '</h2><div class="row-flex small"><span class="mono">' + esc(l.phone) + '</span>' + tipoTag(l) + keyFact(l) + (unattended(l) ? '<span class="fact crit">Sin atender&nbsp;·&nbsp;<span data-since="' + l.created + '">' + timer(t - l.created) + '</span></span>' : '') + '</div></div>' + closeBtn + '</div>' +
      '<div class="dr-actions"><button class="btn sm primary" data-act="call" data-id="' + l.id + '">' + ic('call') + 'Llamé</button><button class="btn sm" data-act="panel" data-p="wa" data-id="' + l.id + '">' + ic('wa') + 'WhatsApp</button>' + (isOpen(l) ? '<button class="btn sm" data-act="panel" data-p="cita" data-id="' + l.id + '">' + ic('visit') + (l.tipo === 'venta' ? 'Tasación' : 'Visita') + '</button><button class="btn sm" data-act="panel" data-p="next" data-id="' + l.id + '">' + ic('clock') + 'Seguimiento</button><button class="btn sm" data-act="panel" data-p="derivar" data-id="' + l.id + '">' + ic('route') + 'Derivar</button>' : '<span class="small muted">Lead cerrado: cambia la etapa para reabrirlo.</span>') +
      '<details class="more-acts"><summary class="btn sm ghost">Más</summary><div><button class="btn sm" data-act="panel" data-p="note" data-id="' + l.id + '">' + ic('note') + 'Nota</button>' + (isOpen(l) ? '<button class="btn sm danger" data-act="panel" data-p="lost" data-id="' + l.id + '">Perdido</button>' : '') + '</div></details></div>' +
      '</div>' +
      '<div class="dr-body">' + (UI.drawer.panel ? panels[UI.drawer.panel] : '') +
      nextHTML +
      '<div class="panel"><div class="panel-head"><h3>Etapa</h3><select id="dr-stage" aria-label="Etapa">' + st.map(s => opt(s.id, s.label, l.stage)).join('') + opt('perdido', 'Perdido', l.stage) + '</select></div>' + journey +
      (l.visitAt && isOpen(l) && l.visitAt > t - 2 * HOUR ? '<div class="small">' + ic('visit', 'i12') + ' ' + (l.tipo === 'venta' ? 'Tasación' : 'Visita') + ': <b>' + whenLabel(l.visitAt) + '</b> · ' + (l.visitConfirmed ? '<span class="fact ok">confirmada</span>' : '<button class="link-btn" data-act="confirm" data-id="' + l.id + '">confirmar</button>') + '</div>' : '') +
      (l.stage === 'perdido' ? '<div class="small">Motivo: <b>' + esc(l.lossReason) + '</b></div>' : '') + '</div>' +
      '<div class="panel"><h3>' + (l.tipo === 'venta' ? 'Quiere vender' : 'Quiere comprar') + '</h3>' + datos + '</div>' +
      '<div class="panel"><div class="panel-head"><h3>Asesor</h3></div><div class="who">' + av(l.agent) + '<div><div class="cell-main">' + esc(agentName(l.agent)) + '</div><div class="cell-sub">' + esc(cur.perfil) + '</div></div></div>' +
      (recA.agent.id !== l.agent ? '<div class="insight">' + ic('route') + '<div>Por su perfil, este lead encaja mejor con <b>' + esc(agentName(recA.agent.id)) + '</b> (' + esc(recA.reason) + '). <button class="link-btn" data-act="derivar-to" data-to="' + recA.agent.id + '" data-id="' + l.id + '">Derivar ahora</button></div></div>' : '<div class="small ok-txt">' + ic('win', 'i12') + ' El perfil del asesor coincide con el lead.</div>') + '</div>' +
      '<div class="panel"><h3>Historial</h3>' + evHTML(evs.slice(-4).reverse()) + (evs.length > 4 ? '<details><summary class="link-btn">Ver historial completo (' + evs.length + ')</summary>' + evHTML(evs.slice(0, -4).reverse()) + '</details>' : '') + '</div>' +
      '<details class="panel"><summary><h3>Origen y campaña</h3></summary><dl class="kv"><div><dt>Canal</dt><dd>' + esc(D.SOURCES[l.src].label) + (l.portal ? ' · ' + esc(l.portal) : '') + '</dd></div><div><dt>Campaña</dt><dd>' + (c ? '<button class="link-btn" data-camp="' + c.id + '">' + esc(c.name) + '</button>' : '—') + '</dd></div><div><dt>Anuncio</dt><dd>' + esc(l.ad || '—') + '</dd></div><div><dt>Primera respuesta</dt><dd>' + (l.firstResponse ? dur(l.firstResponse - l.created) + ' después' : 'pendiente') + '</dd></div></dl></details>' +
      '</div>';
    openDrawer(html);
    if (keep && $('.dr-body')) $('.dr-body').scrollTop = UI.drawer.panel ? 0 : scroll;
    $('#dr-stage').addEventListener('change', e => { const v = e.target.value; if (v === 'perdido') { if (l.stage === 'ganado') { toast('No se puede marcar como perdido', 'Este lead ya cerró. Reábrelo primero en otra etapa.'); leadDrawer(id, ''); return; } leadDrawer(id, 'lost'); return; } setStage(l, v); });
    const edit = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('change', () => { fn(el.value); l.score = D.scoreLead(l); addEvent(l, 'note', 'Dato actualizado: ' + el.getAttribute('aria-label') + ' → ' + el.options[el.selectedIndex].text, 'a1'); save(); leadDrawer(id, ''); rerenderSoft(); }); };
    edit('#ed-pago', v => { l.pago = v; l.credito = v === 'Crédito' ? (l.credito || 'Hipotecario') : null; });
    edit('#ed-credito', v => { l.credito = v; });
    edit('#ed-anombre', v => { l.aNombre = v === 'si'; l.tituloDetalle = l.aNombre ? null : (l.tituloDetalle || D.NO_A_NOMBRE[0]); });
    edit('#ed-detalle', v => { l.tituloDetalle = v; });
  }

  function propDrawer(id) {
    const p = prop(id); if (!p) return;
    UI.drawer = { kind: 'prop', id };
    const o = owner(p.owner);
    const st = propStats(p);
    const d = domOf(p);
    const suggestion = p.status === 'Disponible' && d > 90 ? 'Lleva ' + d + ' días en venta con ' + st.visits + ' visitas. Sugerencia: revisar precio, renovar fotos y video, y probar una campaña de TikTok con recorrido.' : '';
    const report = 'Hola ' + o.name.split(' ')[0] + ', le compartimos el avance de su ' + p.type.toLowerCase() + ' ' + p.id + ':\n\n• Días publicado: ' + d + '\n• Vistas del anuncio: ' + num(p.views) + '\n• Interesados: ' + st.leads + ' (' + st.leads7 + ' esta semana)\n• Visitas: ' + st.visits + '\n• Ofertas: ' + st.offers + '\n\nInmoconecta Huancayo';
    openDrawer('<div class="dr-head"><div class="top-row"><div class="min0"><div class="eyebrow">' + p.id + ' · ' + esc(p.op) + '</div><h2 id="dr-title">' + esc(p.type) + ' en ' + esc(p.district) + '</h2><div class="row-flex small"><b>' + money(p.cur, p.price) + '</b>' + (p.status === 'Disponible' ? domPill(d) : '<span class="fact accent">' + esc(p.status) + '</span>') + '</div></div>' + closeBtn + '</div></div>' +
      '<div class="dr-body">' + (suggestion ? '<div class="insight gold">' + ic('bulb') + '<div>' + esc(suggestion) + '</div></div>' : '') +
      '<div class="ph rounded">' + propArt(p) + '</div>' +
      '<div class="panel"><h3>Propietario</h3><div class="who"><span class="avatar">' + esc(o.name.split(' ').map(x => x[0]).slice(0, 2).join('')) + '</span><div><div class="cell-main">' + esc(o.name) + '</div><div class="cell-sub mono">' + esc(o.phone) + '</div></div></div><div class="small muted">Último reporte enviado ' + ago(o.lastReport) + '</div></div>' +
      '<div class="panel"><h3>Ficha</h3><dl class="kv"><div><dt>Dirección</dt><dd>' + esc(p.address) + '</dd></div><div><dt>Área</dt><dd>' + p.area + ' m²' + (p.beds ? ' · ' + p.beds + ' dorm.' : '') + '</dd></div><div><dt>En venta desde</dt><dd>' + (p.status === 'En captación' ? 'Aún no publicado' : fd(p.listedAt)) + '</dd></div><div><dt>Campañas</dt><dd>' + (p.campaigns.map(c => platformLabel(camp(c).platform) + ' · ' + esc(camp(c).name)).join('<br>') || 'Ninguna') + '</dd></div></dl></div>' +
      '<div class="panel"><div class="panel-head"><h3>Interesados</h3><span class="hint">' + st.leads + '</span></div>' + (st.list.slice(0, 6).map(l => '<button class="mini" data-lead="' + l.id + '"><span>' + av(l.agent, 'xs') + '</span><span><b>' + esc(l.name) + '</b><small>' + esc(sLabel(l)) + ' · ' + ago(l.created) + '</small></span>' + keyFact(l) + '</button>').join('') || '<div class="small muted">Todavía no hay interesados.</div>') + '</div>' +
      '<div class="panel"><div class="panel-head"><h3>Reporte para el propietario</h3><button class="btn sm" data-act="copy-report">' + ic('copy') + 'Copiar</button></div><div class="report" id="report-text">' + esc(report) + '</div></div></div>');
  }

  function campDrawer(id) {
    const c = camp(id); if (!c) return;
    UI.drawer = { kind: 'camp', id };
    const s = campStats(c);
    openDrawer('<div class="dr-head"><div class="top-row"><div class="min0"><div class="eyebrow">' + platformLabel(c.platform) + ' · ' + esc(c.objective) + '</div><h2 id="dr-title">' + esc(c.name) + '</h2></div>' + closeBtn + '</div></div>' +
      '<div class="dr-body"><dl class="kv panel"><div><dt>Inversión</dt><dd>S/ ' + num(c.spend) + '</dd></div><div><dt>Leads</dt><dd>' + s.leads + ' · S/ ' + (c.spend / Math.max(1, s.leads)).toFixed(2) + ' c/u</dd></div><div><dt>' + (c.sellers ? 'Tasaciones' : 'Visitas') + '</dt><dd>' + s.visits + '</dd></div><div><dt>Cierres</dt><dd>' + s.won + '</dd></div></dl>' +
      '<div class="panel"><h3>Leads recientes</h3>' + s.list.slice(0, 10).map(l => '<button class="mini" data-lead="' + l.id + '"><span>' + av(l.agent, 'xs') + '</span><span><b>' + esc(l.name) + '</b><small>' + esc(sLabel(l)) + ' · ' + ago(l.created) + '</small></span>' + keyFact(l) + '</button>').join('') + '</div></div>');
  }

  /* ---------- Nuevo lead: direccionar ---------- */
  function intakeDrawer(tipo) {
    UI.drawer = { kind: 'form', id: 'lead' };
    tipo = tipo || 'compra';
    const radios = (name, items, cur) => '<div class="radios" role="radiogroup">' + items.map(([v, l]) => '<label class="radio"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (v === cur ? ' checked' : '') + '><span>' + l + '</span></label>').join('') + '</div>';
    const body = '<div class="field"><label>¿Qué quiere hacer?</label>' + radios('in-tipo', [['compra', 'Comprar'], ['venta', 'Vender']], tipo) + '</div>' +
      '<div class="form-row"><div class="field"><label for="in-name">Nombre</label><input id="in-name" placeholder="Nombre y apellidos"></div><div class="field"><label for="in-phone">Teléfono</label><input id="in-phone" inputmode="tel" placeholder="+51 9…"></div></div>' +
      '<div class="form-row"><div class="field"><label for="in-src">Origen</label><select id="in-src">' + Object.keys(D.SOURCES).map(k => opt(k, D.SOURCES[k].label, 'wa')).join('') + '</select></div><div class="field"><label for="in-zona">Zona</label><select id="in-zona">' + D.DISTRICTS.map(x => opt(x, x, 'Huancayo')).join('') + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="in-ptipo">Tipo de inmueble</label><select id="in-ptipo">' + ['Casa', 'Departamento', 'Terreno', 'Local comercial'].map(x => opt(x, x, 'Casa')).join('') + '</select></div><div class="field"><label for="in-monto" id="in-monto-l">' + (tipo === 'venta' ? 'Precio que espera (US$)' : 'Presupuesto (US$)') + '</label><input id="in-monto" type="number" min="0" placeholder="100000"></div></div>' +
      '<div id="in-compra"' + (tipo === 'compra' ? '' : ' hidden') + '><div class="field"><label>¿Cómo pagaría?</label>' + radios('in-pago', D.PAGO.map(x => [x, x]), 'No sabe') + '</div><div class="field" id="in-credito-f" hidden><label for="in-credito">Tipo de crédito</label><select id="in-credito">' + D.CREDITO.map(x => opt(x, x, '')).join('') + '</select></div></div>' +
      '<div id="in-venta"' + (tipo === 'venta' ? '' : ' hidden') + '><div class="field"><label>¿El inmueble está a su nombre?</label>' + radios('in-anombre', [['si', 'Sí'], ['no', 'No']], 'si') + '</div><div class="field" id="in-detalle-f" hidden><label for="in-detalle">Situación</label><select id="in-detalle">' + D.NO_A_NOMBRE.map(x => opt(x, x, '')).join('') + '</select></div><div class="field"><label for="in-dir">Dirección</label><input id="in-dir" placeholder="Jr. / Av. …"></div></div>' +
      '<div class="route-box" id="in-route"></div>';
    openDrawer('<div class="dr-head"><div class="top-row"><div><div class="eyebrow">Direccionar</div><h2 id="dr-title">Nuevo lead</h2></div>' + closeBtn + '</div></div><div class="dr-body"><form class="form panel" id="dr-form" novalidate>' + body + '<div class="row-flex"><button class="btn primary" type="submit">Guardar y derivar</button><button class="btn ghost" type="button" data-act="close">Cancelar</button><span class="small crit-txt" id="form-err" role="alert"></span></div></form></div>');
    const f = $('#dr-form');
    const val = n => { const x = f.querySelector('[name="' + n + '"]:checked'); return x ? x.value : ''; };
    const draft = () => {
      const tp = val('in-tipo');
      return { tipo: tp, pago: val('in-pago'), aNombre: val('in-anombre') === 'si', propTipo: $('#in-ptipo').value };
    };
    const update = () => {
      const d = draft();
      $('#in-compra').hidden = d.tipo !== 'compra';
      $('#in-venta').hidden = d.tipo !== 'venta';
      $('#in-credito-f').hidden = !(d.tipo === 'compra' && d.pago === 'Crédito');
      $('#in-detalle-f').hidden = !(d.tipo === 'venta' && !d.aNombre);
      $('#in-monto-l').textContent = d.tipo === 'venta' ? 'Precio que espera (US$)' : 'Presupuesto (US$)';
      const r = autoRoute(d);
      $('#in-route').classList.toggle('warn', !r.ok);
      $('#in-route').innerHTML = ic('route') + '<div><span class="small muted">Se derivará a</span><b>' + esc(agentName(r.agent.id)) + '</b><small>' + (r.ok ? 'Perfil: ' : '') + esc(r.reason) + '</small></div>';
      $('#in-route').dataset.agent = r.agent.id;
    };
    f.addEventListener('change', update);
    update();
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#in-name').value.trim(), phone = $('#in-phone').value.trim();
      if (!name || !phone) { $('#form-err').textContent = 'Completa nombre y teléfono.'; return; }
      if ((phone.match(/\d/g) || []).length < 6) { $('#form-err').textContent = 'El teléfono debe tener al menos 6 dígitos.'; return; }
      const d = draft();
      const t = now();
      const ag = $('#in-route').dataset.agent;
      const m = +$('#in-monto').value; const monto = m > 0 ? m : (d.tipo === 'venta' ? 100000 : 90000);
      const l = { id: 'L-' + (1000 + S.seq++), tipo: d.tipo, name, phone, email: '—', src: $('#in-src').value, portal: null, campaign: null, ad: null, adset: null, created: t, firstResponse: null, history: [{ stage: 'nuevo', at: t }], stage: 'nuevo', lossReason: null, lostAt: null, visitAt: null, visitConfirmed: false, events: [], next: null, agent: ag, propTipo: d.propTipo, zona: $('#in-zona').value, cur: 'US$' };
      if (d.tipo === 'compra') Object.assign(l, { interest: null, budget: monto, plazo: '1 a 3 meses', pago: d.pago, credito: d.pago === 'Crédito' ? $('#in-credito').value : null });
      else Object.assign(l, { precio: monto, direccion: $('#in-dir').value.trim() || 'Dirección por confirmar', aNombre: d.aNombre, tituloDetalle: d.aNombre ? null : $('#in-detalle').value, motivo: 'Por confirmar' });
      l.events.push({ at: t, type: 'in', text: 'Registrado manualmente · ' + D.SOURCES[l.src].label + ' · ' + (l.tipo === 'venta' ? 'quiere vender' : 'quiere comprar'), by: null });
      l.events.push({ at: t + 1, type: 'auto', text: 'Derivado a ' + agentName(ag) + ' · perfil «' + agent(ag).perfil + '»', by: null });
      l.score = D.scoreLead(l);
      S.leads.unshift(l); save(); closeDrawer(); render();
      toast('Lead derivado', l.name + ' → ' + agentName(ag) + ' (' + agent(ag).perfil + ')', l.id);
    });
  }

  function propForm() {
    UI.drawer = { kind: 'form', id: 'prop' };
    openDrawer('<div class="dr-head"><div class="top-row"><h2 id="dr-title">Agregar propiedad</h2>' + closeBtn + '</div></div><div class="dr-body"><form class="form panel" id="dr-form" novalidate>' +
      '<div class="form-row"><div class="field"><label for="np-type">Tipo</label><select id="np-type">' + D.PROP_TYPES.map(x => opt(x, x, '')).join('') + '</select></div><div class="field"><label for="np-op">Operación</label><select id="np-op">' + opt('Venta', 'Venta', '') + opt('Alquiler', 'Alquiler', '') + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="np-district">Distrito</label><select id="np-district">' + D.DISTRICTS.map(x => opt(x, x, '')).join('') + '</select></div><div class="field"><label for="np-address">Dirección</label><input id="np-address"></div></div>' +
      '<div class="form-row"><div class="field"><label for="np-price">Precio</label><input id="np-price" type="number" min="0"></div><div class="field"><label for="np-cur">Moneda</label><select id="np-cur">' + opt('US$', 'US$', '') + opt('S/', 'S/', '') + '</select></div></div>' +
      '<div class="field"><label for="np-owner">Propietario</label><select id="np-owner">' + S.owners.map(o => opt(o.id, o.name, '')).join('') + '</select></div>' +
      '<div class="row-flex"><button class="btn primary" type="submit">Guardar</button><button class="btn ghost" type="button" data-act="close">Cancelar</button><span class="small crit-txt" id="form-err" role="alert"></span></div></form></div>');
    $('#dr-form').addEventListener('submit', e => {
      e.preventDefault();
      const v = id => $('#' + id).value;
      if (!v('np-address').trim() || !(+v('np-price') > 0)) { $('#form-err').textContent = 'Completa dirección y precio.'; return; }
      const p = { id: 'INC-' + (S.properties.length + 101), type: v('np-type'), op: v('np-op'), district: v('np-district'), address: v('np-address').trim(), cur: v('np-cur'), price: +v('np-price'), priceHist: [], priceChanges: [], area: 100, owner: v('np-owner'), listedAt: now(), status: 'Disponible', exclusive: true, commission: v('np-op') === 'Venta' ? 3 : 100, campaigns: [], hue: Math.floor(Math.random() * 360), views: 0 };
      S.properties.push(p); save(); closeDrawer(); render(); toast('Propiedad agregada', p.id + ' ya está en el stock');
    });
  }

  /* ================= Acciones ================= */
  function log(text) { S.log = S.log || []; S.log.push({ at: now(), text }); if (S.log.length > 60) S.log.shift(); }
  function addEvent(l, type, text, by) { l.events.push({ at: now(), type, text, by: by || null }); }
  function refreshAfter(l, panel, system) {
    l.score = D.scoreLead(l);
    save();
    if (UI.drawer && UI.drawer.kind === 'lead' && UI.drawer.id === l.id) {
      const a = document.activeElement;
      const typing = a && $('#drawer').contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName);
      if (!(system && typing)) leadDrawer(l.id, system ? UI.drawer.panel : (panel || ''));
    }
    rerenderSoft();
  }
  function setNext(l, days, text) { l.next = { at: now() + days * DAY, text: text || D.NEXT[l.tipo][l.stage] || 'Llamar' }; }
  function setStage(l, stage) {
    if (!l || l.stage === stage) return;
    if (stage === 'perdido') { leadDrawer(l.id, 'lost'); return; }
    const t = now();
    if (!l.firstResponse && stage !== 'nuevo') l.firstResponse = t;
    l.stage = stage; l.lossReason = null; l.lostStage = null; l.lostAt = null;
    l.history.push({ stage, at: t });
    addEvent(l, stage === 'ganado' ? 'win' : 'note', 'Movido a «' + sLabel(l) + '»', 'a1');
    if (isOpen(l)) setNext(l, 2); else l.next = null;
    toast(l.name, 'Ahora en «' + sLabel(l) + '»');
    refreshAfter(l);
  }
  function derive(l, to, why) {
    if (!to || l.agent === to) { if (UI.drawer) leadDrawer(l.id, ''); return; }
    const from = l.agent;
    l.agent = to;
    addEvent(l, 'auto', 'Derivado de ' + agentName(from) + ' a ' + agentName(to) + ' · perfil «' + agent(to).perfil + '»' + (why === 'sla' ? ' (15 min sin respuesta)' : ''), why === 'sla' ? null : 'a1');
    if (why !== 'sla') toast('Lead derivado', l.name + ' → ' + agentName(to));
    refreshAfter(l, '', why === 'sla');
  }
  function registerCall(l) {
    const t = now();
    const first = !l.firstResponse;
    if (first) l.firstResponse = t;
    addEvent(l, 'call', first ? 'Primera llamada · respondió a los ' + dur(t - l.created) : 'Llamada de seguimiento', l.agent);
    if (l.stage === 'nuevo') { l.stage = 'contactado'; l.history.push({ stage: 'contactado', at: t }); }
    if (isOpen(l)) setNext(l, 2);
    toast('Llamada registrada', l.name + (first ? ' · primera respuesta en ' + dur(t - l.created) : '') + (isOpen(l) ? ' · próximo seguimiento en 2 días' : ''));
    refreshAfter(l);
  }

  document.addEventListener('click', e => {
    const st = e.target.closest('[data-settipo]');
    if (st) { setTipo(st.dataset.settipo); $('#view').scrollTop = 0; return; }
    const a = e.target.closest('[data-act]');
    if (a && a.tagName !== 'SELECT') {
      const act = a.dataset.act;
      const l = a.dataset.id ? lead(a.dataset.id) : null;
      if (act === 'close') return closeDrawer();
      if (act === 'attend') return leadDrawer(l.id, '');
      if (act === 'panel') return leadDrawer(l.id, a.dataset.p);
      if (act === 'call') return registerCall(l);
      if (act === 'derivar-save') return derive(l, $('#dv-agent').value, 'manual');
      if (act === 'derivar-to') return derive(l, a.dataset.to, 'manual');
      if (act === 'wa-send') { if (!l.firstResponse) l.firstResponse = now(); addEvent(l, 'wa', 'WhatsApp enviado', l.agent); toast('WhatsApp registrado', l.name); return refreshAfter(l); }
      if (act === 'cita-save') {
        if (!isOpen(l)) { toast('Lead cerrado', 'Reábrelo cambiando su etapa'); return; }
        const when = new Date($('#v-date').value).getTime(); if (!when) return;
        l.visitAt = when; l.visitConfirmed = false;
        if (!l.firstResponse) l.firstResponse = now();
        if (l.tipo === 'compra') {
          const np = prop($('#v-prop').value);
          if (np && np.id !== l.interest) { l.interest = np.id; l.propTipo = np.type; l.zona = np.district; if (np.cur !== l.cur) { l.budget = np.price; l.cur = np.cur; } }
          if (sIdx(l, l.stage) < 3) { l.stage = 'visita'; l.history.push({ stage: 'visita', at: now() }); } }
        else if (sIdx(l, l.stage) < 1) { l.stage = 'contactado'; l.history.push({ stage: 'contactado', at: now() }); }
        l.next = { at: when - 2 * HOUR, text: 'Confirmar ' + (l.tipo === 'venta' ? 'tasación' : 'visita') };
        addEvent(l, 'visit', (l.tipo === 'venta' ? 'Tasación' : 'Visita a ' + l.interest) + ' agendada para ' + fdt(when), l.agent);
        log('Recordatorios programados para ' + l.name + ' (24 h y 2 h antes)');
        toast(l.tipo === 'venta' ? 'Tasación agendada' : 'Visita agendada', fdt(when) + ' · recordatorio automático por WhatsApp'); return refreshAfter(l);
      }
      if (act === 'next-save') { if (!isOpen(l)) return; const when = new Date($('#n-date').value).getTime(); if (!when) return; l.next = { at: when, text: $('#n-text').value.trim() || 'Llamar' }; addEvent(l, 'note', 'Seguimiento programado: ' + l.next.text + ' · ' + fdt(when), 'a1'); toast('Seguimiento programado', whenLabel(when)); return refreshAfter(l); }
      if (act === 'done') {
        if (!isOpen(l)) return;
        const txt = l.next ? l.next.text : 'Seguimiento';
        if (!l.firstResponse) l.firstResponse = now();
        addEvent(l, 'call', 'Hecho: ' + txt, l.agent);
        setNext(l, 2);
        toast('Seguimiento registrado', l.name + ' · el próximo queda para ' + whenLabel(l.next.at)); return refreshAfter(l);
      }
      if (act === 'confirm') { l.visitConfirmed = true; addEvent(l, 'wa', 'Cliente confirmó la cita por WhatsApp', null); toast('Cita confirmada', l.name); return refreshAfter(l); }
      if (act === 'lost-save') {
        if (!isOpen(l)) { toast('Lead cerrado', 'Ya no está abierto'); return leadDrawer(l.id, ''); }
        const r = $('#lost-r').value; const t = now();
        l.lostStage = l.stage; l.stage = 'perdido'; l.lossReason = r; l.lostAt = t; l.next = null; l.history.push({ stage: 'perdido', at: t });
        addEvent(l, 'lost', 'Marcado como perdido: ' + r, 'a1'); toast('Lead perdido', r); return refreshAfter(l);
      }
      if (act === 'note-save') { const tx = $('#note-t').value.trim(); if (!tx) return; addEvent(l, 'note', tx, 'a1'); toast('Nota guardada', l.name); return refreshAfter(l); }
      if (act === 'new-lead') return intakeDrawer();
      if (act === 'new-prop') return propForm();
      if (act === 'more-leads') { UI.leads.limit += 40; return rerenderSoft(); }
      if (act === 'copy-report') {
        const el = $('#report-text');
        const sel = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texto seleccionado', 'Cópialo con Ctrl+C o mantén presionado'); };
        try { navigator.clipboard.writeText(el.textContent).then(() => toast('Reporte copiado', 'Listo para pegar en WhatsApp'), sel); } catch (x) { sel(); }
        return;
      }
      if (act === 'open-lead') { const tt = a.closest('.toast'); if (tt) tt.remove(); return leadDrawer(a.dataset.id, ''); }
    }
    const el = e.target.closest('[data-lead],[data-prop],[data-camp]');
    if (el && !e.target.closest('select') && !e.target.closest('[data-act]')) {
      if (el.dataset.lead) return leadDrawer(el.dataset.lead, '');
      if (el.dataset.prop) return propDrawer(el.dataset.prop);
      if (el.dataset.camp) return campDrawer(el.dataset.camp);
    }
  });

  /* ================= Toasts ================= */
  function toast(title, text, leadId) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="tico">' + ic(leadId ? 'in' : 'win') + '</span><div><b>' + esc(title) + '</b><small>' + esc(text) + '</small>' + (leadId ? '<button data-act="open-lead" data-id="' + leadId + '">Ver lead</button>' : '') + '</div>';
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), leadId ? 8000 : 4000);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  }

  /* ================= Tiempo real ================= */
  function tickTimers() {
    const t = now();
    $$('[data-since]').forEach(el => {
      const ms = t - +el.dataset.since;
      el.textContent = timer(ms);
      if (el.classList.contains('wait')) { el.classList.remove('ok', 'warn', 'crit'); el.classList.add(sev(ms / MIN)); }
    });
  }
  function simulateLead() {
    const l = D.incoming(S, now());
    const routed = autoRoute(l);
    const best = routed.agent;
    if (best.id !== l.agent) { l.agent = best.id; l.events.forEach(e => { if (e.type === 'auto' && /^Derivado a/.test(e.text)) e.text = 'Derivado a ' + agentName(best.id) + ' · perfil «' + best.perfil + '»'; }); }
    const welcomeOn = S.automations.find(a => a.key === 'welcome').on;
    if (!welcomeOn) l.events = l.events.filter(e => !/^WhatsApp de bienvenida/.test(e.text));
    S.leads.unshift(l);
    if (!routed.ok) l.events.push({ at: now() + 2, type: 'auto', text: routed.reason, by: null });
    const ag = agent(l.agent);
    log('Lead ' + l.id + ' (' + l.tipo + ') derivado a ' + agentName(l.agent) + ' por perfil «' + ag.perfil + '»');
    S.automations.forEach(a => { if ((a.key === 'assign' || a.key === 'welcome') && a.on) a.runs++; });
    save();
    toast('Nuevo lead de ' + l.tipo + ' · ' + D.SOURCES[l.src].short, l.name + ' → ' + ag.name + ' (' + ag.perfil + ')', l.id);
    rerenderSoft();
  }
  function slaCheck() {
    const t = now(); const prev = UI.lastTick; UI.lastTick = t;
    const sla = S.automations.find(a => a.key === 'sla');
    if (!sla || !sla.on) return;
    S.leads.filter(unattended).forEach(l => {
      const crossed = m => l.created + m * MIN > prev && l.created + m * MIN <= t;
      if (crossed(5)) { log('Alerta a ' + agentName(l.agent) + ': ' + l.name + ' lleva 5 min sin respuesta'); toast('5 min sin respuesta', l.name + ' · se avisó a ' + agentName(l.agent), l.id); }
      if (crossed(15)) {
        const cur = agent(l.agent);
        const cands = S.agents.filter(a => a.rr && a.onDuty && a.id !== l.agent && a.perfil === cur.perfil);
        const to = cands.length ? rec(l, cands).agent : null;
        if (to) { log(l.name + ' pasó a ' + agentName(to.id) + ' (mismo perfil) por falta de respuesta'); derive(l, to.id, 'sla'); toast('Derivado automáticamente', l.name + ' → ' + agentName(to.id), l.id); }
        else { log('No hay otro asesor con el perfil «' + cur.perfil + '» en turno: se avisa a Alberto por ' + l.name); addEvent(l, 'auto', 'Sin otro asesor del mismo perfil en turno: aviso a Alberto (15 min sin respuesta)'); toast('Aviso a Alberto', l.name + ': no hay otro asesor de ' + cur.perfil + ' en turno', l.id); save(); }
      }
      if (crossed(30)) { log('Aviso a Alberto: ' + l.name + ' lleva 30 min sin respuesta'); addEvent(l, 'auto', 'Aviso a Alberto (30 min sin respuesta)'); toast('Aviso a Alberto', l.name + ' lleva 30 min esperando', l.id); save(); }
    });
  }
  let liveTimer = null;
  function setLive(on) {
    UI.live = on;
    try { localStorage.setItem(KEY + ':live', on ? '1' : '0'); } catch (e) { /* nada */ }
    $('#live-toggle').classList.toggle('on', on);
    $('#live-toggle').setAttribute('aria-pressed', on ? 'true' : 'false');
    clearInterval(liveTimer);
    if (on) liveTimer = setInterval(simulateLead, 45000);
  }

  /* ================= Búsqueda y menú móvil ================= */
  function search(q) {
    const box = $('#search-results');
    q = q.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    const ls = S.leads.filter(l => matches(l.name + ' ' + l.id, l.phone, q)).slice(0, 6);
    const ps = S.properties.filter(p => (p.id + ' ' + p.address + ' ' + p.district).toLowerCase().includes(q)).slice(0, 3);
    box.innerHTML = (ls.map(l => '<button data-lead="' + l.id + '"><span><b>' + esc(l.name) + '</b><small>' + l.id + ' · ' + (l.tipo === 'venta' ? 'Venta' : 'Compra') + ' · ' + esc(sLabel(l)) + '</small></span></button>').join('') +
      ps.map(p => '<button data-prop="' + p.id + '"><span><b>' + p.id + ' · ' + esc(p.type) + '</b><small>' + esc(p.address) + '</small></span></button>').join('')) || empty('Sin resultados para «' + esc(q) + '»');
    box.hidden = false;
  }
  function openSheet() {
    $('#toasts').innerHTML = '';
    const cur = route();
    $('#sheet').innerHTML = '<div class="sheet-inner"><div class="sheet-grab"></div>' + ['pipeline', 'reportes', 'ajustes'].map(id => { const r = ROUTES.find(x => x.id === id); return '<a href="#' + id + '" class="' + (id === cur ? 'active' : '') + '">' + ic(r.icon) + '<span>' + r.title + '</span></a>'; }).join('') +
      '<hr><button type="button" data-sheet="sim">' + ic('auto') + '<span>Simular lead entrante</span></button><button type="button" data-sheet="live">' + ic('clock') + '<span>' + (UI.live ? 'Pausar modo en vivo' : 'Activar modo en vivo') + '</span></button><a href="index.html">' + ic('doc') + '<span>Volver a la propuesta</span></a><button type="button" data-sheet="reset">' + ic('lost') + '<span>Reiniciar demo</span></button></div>';
    $('#sheet').hidden = false; $('#scrim').hidden = false;
    requestAnimationFrame(() => { $('#sheet').classList.add('show'); $('#scrim').classList.add('show'); });
  }
  function closeSheet() { $('#sheet').classList.remove('show'); if (!UI.drawer) $('#scrim').classList.remove('show'); setTimeout(() => { $('#sheet').hidden = true; if (!UI.drawer) $('#scrim').hidden = true; }, 220); }

  /* ================= Arranque ================= */
  function init() {
    $('#search-ic').innerHTML = ic('search');
    $('#new-lead-top').innerHTML = ic('plus') + '<span>Nuevo lead</span>';
    $('#global-search').addEventListener('input', e => search(e.target.value));
    $('#global-search').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; search(''); } });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) $('#search-results').hidden = true; else if (e.target.closest('#search-results button')) { $('#search-results').hidden = true; $('#global-search').value = ''; } });
    $('#sim-lead').addEventListener('click', simulateLead);
    $('#new-lead-top').addEventListener('click', () => intakeDrawer());
    const lt = $('#live-toggle');
    lt.addEventListener('click', () => { setLive(!UI.live); toast(UI.live ? 'Modo en vivo activado' : 'Modo en vivo pausado', UI.live ? 'Entrará un lead simulado cada 45 segundos' : 'Puedes seguir simulando con el botón'); });
    $('#reset-demo').addEventListener('click', () => { S = fresh(); save(); closeDrawer(); render(); toast('Demo reiniciada', 'Datos de ejemplo restaurados'); });
    $('#scrim').addEventListener('click', () => { if (!$('#sheet').hidden) closeSheet(); if (UI.drawer) closeDrawer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (UI.drawer) closeDrawer(); if (!$('#sheet').hidden) closeSheet(); } });
    $('#bottom-nav').addEventListener('click', e => { if (e.target.closest('#more-btn')) openSheet(); });
    $('#sheet').addEventListener('click', e => {
      const b = e.target.closest('[data-sheet]');
      if (b) { const k = b.dataset.sheet; closeSheet(); if (k === 'sim') simulateLead(); if (k === 'live') lt.click(); if (k === 'reset') $('#reset-demo').click(); return; }
      if (e.target.closest('a')) closeSheet();
    });
    window.addEventListener('hashchange', () => { closeDrawer(true); render(); $('#view').scrollTop = 0; });
    window.addEventListener('popstate', () => { if (UI.drawer) closeDrawer(true); });
    setLive(UI.live);
    render();
    if (UI_RESET_NOTICE) { save(); toast('Demo actualizada', 'Pasó más de una semana: se cargaron datos de ejemplo nuevos'); }
    setInterval(tickTimers, 1000);
    setInterval(slaCheck, 3000);
    setInterval(() => { if (!UI.drawer) rerenderSoft(); else renderNav(); }, 60000);
  }
  init();
})();
