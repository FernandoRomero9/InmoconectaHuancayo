/* CRM demo · Inmoconecta Huancayo
   SPA sin dependencias: rutas por #hash, estado en memoria + localStorage (solo este navegador). */
(function () {
  'use strict';
  const D = window.DEMO;
  const { MIN, HOUR, DAY } = D;
  const KEY = 'inmoconecta-crm-demo-v3';
  const FX = 3.7; // tipo de cambio referencial para consolidar comisiones en soles

  /* ================= Estado ================= */
  let S;
  function fresh() { return D.build(Date.now()); }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === 3 && Date.now() - s.builtAt < 10 * HOUR) return s;
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
  S = load();
  const UI = {
    live: false,
    leads: { q: '', src: '', stage: 'open', agent: '', campaign: '', unatt: false, sort: 'recent' },
    board: { agent: '', src: '' },
    props: { type: '', district: '', status: '', stale: false },
    funnel: { group: '', days: 60 },
    drawer: null,
    lastTick: Date.now()
  };
  try { UI.live = localStorage.getItem(KEY + ':live') === '1'; } catch (e) { /* nada */ }

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
  const fdt = t => dtf.format(new Date(t));
  const fd = t => df.format(new Date(t));
  const ft = t => tf.format(new Date(t));

  function dur(ms) {
    ms = Math.max(0, ms);
    const m = Math.floor(ms / MIN);
    if (m < 1) return Math.floor(ms / 1000) + ' s';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ' + (m % 60 ? (m % 60) + ' min' : '');
    const d = Math.floor(h / 24);
    return d + ' d' + (h % 24 ? ' ' + (h % 24) + ' h' : '');
  }
  function timer(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000);
    if (s < 3600) return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    return dur(ms);
  }
  function ago(t) { return 'hace ' + dur(now() - t).trim(); }
  function sev(mins) { return mins < 5 ? 'ok' : mins < 30 ? 'warn' : 'crit'; }

  const agent = id => S.agents.find(a => a.id === id) || { name: '—', last: '', initials: '?' };
  const agentName = id => { const a = agent(id); return a.id === 'a1' ? 'Alberto' : a.name + ' ' + a.last; };
  const prop = id => S.properties.find(p => p.id === id);
  const camp = id => S.campaigns.find(c => c.id === id);
  const owner = id => S.owners.find(o => o.id === id);
  const lead = id => S.leads.find(l => l.id === id);
  const stageIdx = id => D.STAGES.findIndex(s => s.id === id);
  const stageLabel = id => (D.STAGES.find(s => s.id === id) || {}).label || id;
  const isOpen = l => l.stage !== 'ganado' && l.stage !== 'perdido';
  const unattended = l => !l.firstResponse && l.stage === 'nuevo';
  const lastAct = l => l.events.length ? l.events[l.events.length - 1].at : l.created;
  const stageAt = l => l.history[l.history.length - 1].at;
  function reached(l) {
    let m = 0;
    l.history.forEach(h => { const i = stageIdx(h.stage); if (h.stage !== 'perdido' && i > m) m = i; });
    return m;
  }
  const group = src => D.SOURCES[src].group;
  function commissionSoles(p) {
    if (p.op === 'Alquiler') return p.price; // un mes de renta
    const c = p.price * p.commission / 100;
    return p.cur === 'US$' ? c * FX : c;
  }

  const ICONS = {
    panel: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    urgent: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    leads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    pipeline: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    agenda: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    funnel: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/>',
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
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>'
  };
  const ic = (n, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  const srcTag = l => '<span class="src ' + group(l.src) + '"><i></i>' + esc(D.SOURCES[l.src].short) + '</span>';
  const stageTag = id => '<span class="stage ' + id + '">' + esc(stageLabel(id)) + '</span>';
  const who = id => { const a = agent(id); return '<span class="who"><span class="avatar sm">' + esc(a.initials) + '</span>' + esc(agentName(id)) + '</span>'; };
  const scoreTag = s => '<span class="score" title="Puntaje de interés"><span class="bar"><span style="width:' + s + '%"></span></span>' + s + '</span>';
  const campName = id => { const c = camp(id); return c ? c.name : '—'; };
  const platformLabel = p => p === 'meta' ? 'Meta' : 'TikTok';

  /* ================= Navegación ================= */
  const ROUTES = [
    { group: 'Operación', items: [
      { id: 'panel', label: 'Panel', icon: 'panel', title: 'Panel general' },
      { id: 'urgentes', label: 'Urgentes', icon: 'urgent', title: 'Urgentes' },
      { id: 'leads', label: 'Leads', icon: 'leads', title: 'Leads' },
      { id: 'pipeline', label: 'Pipeline', icon: 'pipeline', title: 'Pipeline de ventas' },
      { id: 'agenda', label: 'Agenda', icon: 'agenda', title: 'Agenda de visitas' }
    ] },
    { group: 'Inventario', items: [
      { id: 'propiedades', label: 'Propiedades', icon: 'home', title: 'Stock de propiedades' },
      { id: 'captacion', label: 'Captación', icon: 'key', title: 'Captación de propietarios' }
    ] },
    { group: 'Marketing', items: [
      { id: 'campanas', label: 'Campañas', icon: 'megaphone', title: 'Campañas Meta y TikTok' },
      { id: 'trazabilidad', label: 'Trazabilidad', icon: 'funnel', title: 'Trazabilidad del embudo' }
    ] },
    { group: 'Gestión', items: [
      { id: 'equipo', label: 'Equipo', icon: 'team', title: 'Equipo comercial' },
      { id: 'automatizaciones', label: 'Automatizaciones', icon: 'zap', title: 'Automatizaciones' },
      { id: 'integraciones', label: 'Integraciones', icon: 'plug', title: 'Integraciones' }
    ] }
  ];
  const ALL_ROUTES = ROUTES.flatMap(g => g.items);
  function route() { const h = (location.hash || '').replace('#', ''); return ALL_ROUTES.find(r => r.id === h) ? h : 'panel'; }

  function renderNav() {
    const cur = route();
    const urg = S.leads.filter(unattended).length;
    const openLeads = S.leads.filter(isOpen).length;
    const visits = upcomingVisits(7).length;
    const counts = { urgentes: urg ? '<span class="count hot">' + urg + '</span>' : '', leads: '<span class="count">' + openLeads + '</span>', agenda: visits ? '<span class="count">' + visits + '</span>' : '', captacion: '<span class="count">' + S.captacion.filter(k => k.stage !== 'publicada').length + '</span>' };
    $('#nav').innerHTML = ROUTES.map(g => '<div class="nav-group"><div class="nav-label">' + g.group + '</div>' + g.items.map(r =>
      '<a href="#' + r.id + '" class="' + (r.id === cur ? 'active' : '') + '"' + (r.id === cur ? ' aria-current="page"' : '') + '>' + ic(r.icon) + '<span>' + r.label + '</span>' + (counts[r.id] || '') + '</a>').join('') + '</div>').join('');
  }

  const SUBS = {
    panel: () => new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()) + ' · datos en tiempo real',
    urgentes: () => 'Lo que se pierde si nadie lo atiende hoy',
    leads: () => 'Todos los contactos de Meta, TikTok, WhatsApp, web, portales y referidos',
    pipeline: () => 'Arrastra una tarjeta para cambiar de etapa',
    agenda: () => 'Visitas y tasaciones de los próximos 7 días',
    propiedades: () => 'Inventario, propietario, días en venta y campañas de cada inmueble',
    captacion: () => 'Clientes que quieren vender o alquilar su propiedad con Inmoconecta',
    campanas: () => 'Inversión, costo por lead y ventas de cada campaña',
    trazabilidad: () => 'En qué etapa se pierden los leads y por qué',
    equipo: () => 'Velocidad de respuesta y resultados por asesor',
    automatizaciones: () => 'Reglas que trabajan solas, 24/7',
    integraciones: () => 'Cómo llega cada lead al CRM'
  };

  function render() {
    const r = route();
    const meta = ALL_ROUTES.find(x => x.id === r);
    $('#page-title').textContent = meta.title;
    $('#page-sub').textContent = SUBS[r]();
    document.title = meta.label + ' · Inmoconecta CRM';
    renderNav();
    const html = VIEWS[r]();
    $('#view').innerHTML = '<div class="view-inner">' + html + '</div>';
    if (AFTER[r]) AFTER[r]();
    tickTimers();
  }
  function rerenderSoft() {
    const a = document.activeElement;
    if (a && $('#view').contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) { renderNav(); return; }
    const y = $('#view').scrollTop;
    render();
    $('#view').scrollTop = y;
  }

  /* ================= Cálculos ================= */
  function inLast(days, t) { return t >= now() - days * DAY; }
  function upcomingVisits(days) {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const end = t0.getTime() + days * DAY;
    const items = [];
    S.leads.forEach(l => { if (l.visitAt && l.visitAt >= t0.getTime() && l.visitAt < end && isOpen(l) && l.stage === 'visita') items.push({ kind: 'lead', at: l.visitAt, l }); });
    S.captacion.forEach(k => { if (k.visit && k.visit >= t0.getTime() && k.visit < end && k.stage === 'agendada') items.push({ kind: 'capt', at: k.visit, k }); });
    return items.sort((a, b) => a.at - b.at);
  }
  function urgentGroups() {
    const t = now();
    const noResp = S.leads.filter(unattended).sort((a, b) => a.created - b.created);
    const noFollow = S.leads.filter(l => isOpen(l) && !unattended(l) && t - lastAct(l) > 48 * HOUR && stageIdx(l.stage) >= 1).sort((a, b) => lastAct(a) - lastAct(b));
    const t0 = new Date(); t0.setHours(23, 59, 59, 999);
    const visitsToday = S.leads.filter(l => l.stage === 'visita' && l.visitAt && l.visitAt >= t - 2 * HOUR && l.visitAt <= t0.getTime() && !l.visitConfirmed).sort((a, b) => a.visitAt - b.visitAt);
    const offers = S.leads.filter(l => l.stage === 'negociacion' && t - stageAt(l) > 3 * DAY).sort((a, b) => stageAt(a) - stageAt(b));
    const stale = S.properties.filter(p => p.status === 'Disponible' && t - p.listedAt > 90 * DAY).sort((a, b) => a.listedAt - b.listedAt);
    const sellers = S.captacion.filter(k => k.stage === 'solicitud').sort((a, b) => a.created - b.created);
    return { noResp, noFollow, visitsToday, offers, stale, sellers };
  }
  function propStats(p) {
    const ls = S.leads.filter(l => l.interest === p.id);
    const t = now();
    return {
      leads: ls.length,
      leads7: ls.filter(l => t - l.created < 7 * DAY).length,
      visits: ls.filter(l => reached(l) >= 3 && l.visitAt && l.visitAt <= t).length,
      offers: ls.filter(l => reached(l) >= 4).length,
      list: ls
    };
  }
  function responseMins(l) { return l.firstResponse ? (l.firstResponse - l.created) / MIN : null; }

  /* ================= Gráficos (SVG a mano) ================= */
  function dailyChart(days) {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const start = t0.getTime() - (days - 1) * DAY;
    const buckets = Array.from({ length: days }, (_, i) => ({ at: start + i * DAY, meta: 0, tiktok: 0, otros: 0 }));
    S.leads.forEach(l => { const i = Math.floor((l.created - start) / DAY); if (i >= 0 && i < days) buckets[i][group(l.src)]++; });
    const max = Math.max(4, ...buckets.map(b => b.meta + b.tiktok + b.otros));
    const niceMax = Math.ceil(max / 4) * 4;
    const W = 720, H = 230, L = 30, B = 24, T = 8, R = 6;
    const cw = (W - L - R) / days;
    const y = v => T + (H - T - B) * (1 - v / niceMax);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = niceMax / 4 * k; g += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis-label" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>'; }
    const cols = ['meta', 'tiktok', 'otros'];
    const colors = { meta: 'var(--series-1)', tiktok: 'var(--series-2)', otros: 'var(--series-3)' };
    let bars = '';
    buckets.forEach((b, i) => {
      let acc = 0;
      const x = L + i * cw + cw * 0.18;
      const w = cw * 0.64;
      cols.forEach(c => {
        if (!b[c]) return;
        const y1 = y(acc), y2 = y(acc + b[c]);
        const h = Math.max(0, y1 - y2 - (acc ? 1.5 : 0));
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y2.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + colors[c] + '"/>';
        acc += b[c];
      });
      bars += '<rect class="hit" data-i="' + i + '" x="' + (L + i * cw).toFixed(1) + '" y="' + T + '" width="' + cw.toFixed(1) + '" height="' + (H - T - B) + '" fill="transparent"/>';
      if (i % 5 === (days - 1) % 5) bars += '<text class="axis-label" x="' + (L + i * cw + cw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + new Date(b.at).getDate() + '/' + (new Date(b.at).getMonth() + 1) + '</text>';
    });
    const total = buckets.reduce((s, b) => s + b.meta + b.tiktok + b.otros, 0);
    const byG = cols.map(c => buckets.reduce((s, b) => s + b[c], 0));
    return {
      html: '<div class="legend" style="margin-bottom:10px"><span><i style="background:var(--series-1)"></i>Meta (FB + IG) · ' + byG[0] + '</span><span><i style="background:var(--series-2)"></i>TikTok · ' + byG[1] + '</span><span><i style="background:var(--series-3)"></i>WhatsApp, web, portales y referidos · ' + byG[2] + '</span></div>' +
        '<div class="chart" id="daily-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Leads por día, últimos ' + days + ' días: ' + total + ' en total">' + g + '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--line-strong)"/>' + bars + '</svg><div class="tip" hidden></div></div>',
      buckets
    };
  }
  function bindDailyTip(buckets) {
    const el = $('#daily-chart'); if (!el) return;
    const tip = $('.tip', el);
    el.addEventListener('mousemove', e => {
      const hit = e.target.closest('.hit');
      if (!hit) { tip.hidden = true; return; }
      const b = buckets[+hit.dataset.i];
      const r = el.getBoundingClientRect();
      const hr = hit.getBoundingClientRect();
      tip.innerHTML = '<b>' + new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(b.at)) + '</b><br>Meta: ' + b.meta + ' · TikTok: ' + b.tiktok + ' · Otros: ' + b.otros;
      tip.style.left = (hr.left - r.left + hr.width / 2) + 'px';
      tip.style.top = '20px';
      tip.hidden = false;
    });
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  }
  function hbars(rows, opts) {
    opts = opts || {};
    const max = Math.max(1, ...rows.map(r => r.v));
    return '<div>' + rows.map(r => '<div class="hbar"><span class="name" title="' + esc(r.name) + '">' + esc(r.name) + '</span><div class="track"><div class="fill ' + (r.cls || opts.cls || '') + '" style="width:' + Math.max(1.5, r.v / max * 100) + '%"></div></div><span class="v">' + (r.label != null ? r.label : r.v) + '</span></div>').join('') + '</div>';
  }

  function funnelData(leads) {
    const steps = D.STAGES.slice(0, 7).map((s, i) => ({ id: s.id, label: s.label, i, count: 0, lost: 0, reasons: {}, times: [] }));
    leads.forEach(l => {
      const m = reached(l);
      for (let i = 0; i <= m; i++) steps[i].count++;
      if (l.stage === 'perdido') { const st = steps[stageIdx(l.lostStage)]; st.lost++; st.reasons[l.lossReason] = (st.reasons[l.lossReason] || 0) + 1; }
      for (let k = 0; k < l.history.length - 1; k++) {
        const i = stageIdx(l.history[k].stage);
        if (i >= 0 && i < 7) steps[i].times.push(l.history[k + 1].at - l.history[k].at);
      }
    });
    return steps;
  }
  function funnelHTML(steps, compact) {
    const top = steps[0].count || 1;
    let h = '<div class="funnel">';
    steps.forEach((s, i) => {
      const w = s.count / top * 100;
      const topReason = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
      h += '<div class="fstep"><div class="lbl">' + esc(s.label) + (compact ? '' : '<small>' + (s.times.length ? 'mediana ' + dur(median(s.times)).trim() + ' en etapa' : '&nbsp;') + '</small>') + '</div>' +
        '<div class="barwrap"><div class="fbar" style="width:' + Math.max(w, 4) + '%">' + s.count + '</div></div>' +
        '<div class="drop">' + (s.lost ? '<b>−' + s.lost + '</b> perdidos' + (topReason && !compact ? ' · <span class="muted">' + esc(topReason[0]) + '</span>' : '') : (i === 6 ? '<span class="pill ok">ganados</span>' : '<span class="muted">—</span>')) + '</div></div>';
      if (i < steps.length - 1 && steps[i].count) h += '<div class="fconv">↓ ' + pct(steps[i + 1].count, steps[i].count) + '% pasa a la siguiente etapa</div>';
    });
    return h + '</div>';
  }

  /* ================= Vistas ================= */
  const VIEWS = {};
  const AFTER = {};

  VIEWS.panel = function () {
    const t = now();
    const l30 = S.leads.filter(l => inLast(30, l.created));
    const lPrev = S.leads.filter(l => l.created < t - 30 * DAY && l.created >= t - 60 * DAY);
    const growth = pct(l30.length - lPrev.length, lPrev.length || 1);
    const un = S.leads.filter(unattended);
    const oldest = un.length ? Math.max(...un.map(l => t - l.created)) : 0;
    const resp = l30.map(responseMins).filter(v => v != null);
    const med = median(resp);
    const under5 = pct(resp.filter(v => v < 5).length, resp.length);
    const vis = upcomingVisits(7).filter(v => v.kind === 'lead');
    const pend = vis.filter(v => !v.l.visitConfirmed).length;
    const wins = S.leads.filter(l => l.stage === 'ganado' && inLast(30, stageAt(l)));
    const comm = wins.reduce((s, l) => s + commissionSoles(prop(l.interest)), 0);
    const paid = S.campaigns.filter(c => !c.sellers);
    const spend = paid.reduce((s, c) => s + c.spend, 0);
    const paidLeads = S.leads.filter(l => l.campaign).length;
    const today = S.leads.filter(l => new Date(l.created).toDateString() === new Date().toDateString()).length;

    const chart = dailyChart(30);
    UI._daily = chart.buckets;
    const g = urgentGroups();
    const attention = [];
    g.noResp.slice(0, 4).forEach(l => attention.push('<button class="urgent-mini" data-lead="' + l.id + '">' + '<span class="wait ' + sev((t - l.created) / MIN) + '" data-since="' + l.created + '">' + timer(t - l.created) + '</span><span><b>' + esc(l.name) + '</b><br><span class="muted small">Sin primera respuesta · ' + esc(D.SOURCES[l.src].short) + ' · ' + esc(agentName(l.agent)) + '</span></span></button>'));
    g.visitsToday.slice(0, 2).forEach(l => attention.push('<button class="urgent-mini" data-lead="' + l.id + '"><span class="wait warn">' + ft(l.visitAt) + '</span><span><b>' + esc(l.name) + '</b><br><span class="muted small">Visita hoy sin confirmar · ' + esc(l.interest) + '</span></span></button>'));
    g.offers.slice(0, 2).forEach(l => attention.push('<button class="urgent-mini" data-lead="' + l.id + '"><span class="wait crit">' + dur(t - stageAt(l)).trim() + '</span><span><b>' + esc(l.name) + '</b><br><span class="muted small">Oferta sin respuesta del propietario · ' + esc(l.interest) + '</span></span></button>'));

    // Fuentes
    const srcRows = Object.keys(D.SOURCES).map(k => {
      const ls = S.leads.filter(l => l.src === k && inLast(60, l.created));
      const cont = ls.filter(l => reached(l) >= 1).length;
      const vis2 = ls.filter(l => reached(l) >= 3).length;
      const won = ls.filter(l => l.stage === 'ganado').length;
      return { k, n: ls.length, cont, vis: vis2, won };
    }).sort((a, b) => b.n - a.n);

    // Asesores
    const agRows = S.agents.filter(a => a.rr).map(a => {
      const ls = l30.filter(l => l.agent === a.id);
      const r = ls.map(responseMins).filter(v => v != null);
      return { a, n: ls.length, med: median(r), won: S.leads.filter(l => l.agent === a.id && l.stage === 'ganado' && inLast(60, stageAt(l))).length };
    }).sort((x, y) => x.med - y.med);

    const stale = S.properties.filter(p => p.status === 'Disponible').sort((a, b) => a.listedAt - b.listedAt).slice(0, 5);
    const steps = funnelData(S.leads.filter(l => inLast(60, l.created)));

    return '' +
      '<div class="kpis">' +
      kpi('Leads nuevos · 30 días', num(l30.length), '<span class="' + (growth >= 0 ? 'up' : 'down') + '">' + (growth >= 0 ? '+' : '') + growth + '%</span> vs. 30 días previos · ' + today + ' hoy') +
      kpi('Sin atender ahora', un.length, un.length ? 'El más antiguo espera ' + dur(oldest).trim() : 'Todo al día', un.length ? 'alert' : '') +
      kpi('Primera respuesta', dur(med * MIN).trim().replace(' min', '<small>min</small>'), under5 + '% respondidos en menos de 5 min') +
      kpi('Visitas · 7 días', vis.length, pend + ' por confirmar') +
      kpi('Cierres · 30 días', wins.length, 'Comisión S/ ' + num(comm)) +
      kpi('Costo por lead', 'S/ ' + (spend / Math.max(1, paidLeads)).toFixed(2), 'Meta + TikTok · inversión S/ ' + num(spend)) +
      '</div>' +
      '<div class="grid g-main">' +
      '<section class="card"><div class="card-head"><h2>Leads por día</h2><span class="hint">Últimos 30 días, por origen</span></div>' + chart.html + '</section>' +
      '<section class="card"><div class="card-head"><h2>Requiere atención ahora</h2><a class="hint" href="#urgentes">Ver todos los urgentes →</a></div><div class="stack urgent-minis">' + (attention.join('') || '<div class="empty">Nada pendiente. Buen trabajo.</div>') + '</div></section>' +
      '</div>' +
      '<div class="grid g2">' +
      '<section class="card"><div class="card-head"><h2>Embudo · 60 días</h2><a class="hint" href="#trazabilidad">Dónde se pierden →</a></div>' + funnelHTML(steps, true) + '</section>' +
      '<section class="card"><div class="card-head"><h2>Resultado por origen · 60 días</h2><span class="hint">Del lead al cierre</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Origen</th><th class="r">Leads</th><th class="r">Contactados</th><th class="r">Visitaron</th><th class="r">Cierres</th></tr></thead><tbody>' +
      srcRows.map(r => '<tr><td>' + srcTag({ src: r.k }) + '</td><td class="r num">' + r.n + '</td><td class="r num">' + pct(r.cont, r.n) + '%</td><td class="r num">' + r.vis + '</td><td class="r num">' + r.won + '</td></tr>').join('') +
      '</tbody></table></div></section>' +
      '</div>' +
      '<div class="grid g2">' +
      '<section class="card"><div class="card-head"><h2>Equipo · velocidad de respuesta</h2><a class="hint" href="#equipo">Ver equipo →</a></div><div class="table-wrap"><table class="t"><thead><tr><th>Asesor</th><th class="r">Leads 30 d</th><th class="r">1ª respuesta</th><th class="r">Cierres 60 d</th></tr></thead><tbody>' +
      agRows.map(r => '<tr><td>' + who(r.a.id) + '</td><td class="r num">' + r.n + '</td><td class="r"><span class="wait ' + sev(r.med) + '">' + dur(r.med * MIN).trim() + '</span></td><td class="r num">' + r.won + '</td></tr>').join('') +
      '</tbody></table></div></section>' +
      '<section class="card"><div class="card-head"><h2>Más tiempo en venta</h2><a class="hint" href="#propiedades">Ver stock →</a></div><div class="table-wrap"><table class="t"><thead><tr><th>Inmueble</th><th class="r">Días</th><th class="r">Leads</th><th class="r">Visitas</th></tr></thead><tbody>' +
      stale.map(p => { const st = propStats(p); const d = Math.floor((t - p.listedAt) / DAY); return '<tr class="click" data-prop="' + p.id + '"><td><div class="cell-main">' + esc(p.type) + ' · ' + esc(p.district) + '</div><div class="cell-sub">' + p.id + ' · ' + esc(owner(p.owner).name) + '</div></td><td class="r">' + domPill(d) + '</td><td class="r num">' + st.leads + '</td><td class="r num">' + st.visits + '</td></tr>'; }).join('') +
      '</tbody></table></div></section>' +
      '</div>';
  };
  AFTER.panel = () => bindDailyTip(UI._daily);
  function kpi(label, value, foot, cls) { return '<div class="kpi ' + (cls || '') + '"><span class="label">' + label + '</span><span class="value">' + value + '</span><span class="foot">' + foot + '</span></div>'; }
  function domPill(d) { return '<span class="pill ' + (d > 90 ? 'crit' : d > 45 ? 'warn' : 'ok') + '">' + d + ' d</span>'; }

  VIEWS.urgentes = function () {
    const t = now();
    const g = urgentGroups();
    const row = (l, sevCls, since, label, extra) =>
      '<div class="urgent ' + sevCls + '"><span class="stripe"></span>' +
      '<div class="min0"><button class="link-btn cell-main" data-lead="' + l.id + '">' + esc(l.name) + '</button><div class="cell-sub">' + srcTag(l) + ' · ' + esc(l.phone) + '</div></div>' +
      '<div class="what what-col">' + label + '</div>' +
      '<div class="who-col">' + who(l.agent) + '</div>' +
      '<div class="timer">' + (since ? '<span class="wait ' + sevCls + '" data-since="' + since + '">' + timer(t - since) + '</span>' : '<span class="wait ' + sevCls + '">' + extra + '</span>') + '<small>' + (since ? 'esperando' : '') + '</small></div>' +
      '<div class="acts"><button class="btn sm primary" data-act="attend" data-id="' + l.id + '">' + ic('call') + ' Atender</button><button class="btn sm" data-act="wa" data-id="' + l.id + '">WhatsApp</button><select class="btn sm" data-act="reassign" data-id="' + l.id + '" aria-label="Reasignar">' + '<option value="">Reasignar…</option>' + S.agents.map(a => '<option value="' + a.id + '">' + esc(agentName(a.id)) + '</option>').join('') + '</select></div>' +
      '</div>';
    const sec = (title, hint, items) => '<div class="section-title"><h2>' + title + '</h2><span class="hint">' + hint + '</span></div><div class="urgent-list">' + (items || '<div class="card empty">Nada pendiente aquí.</div>') + '</div>';
    const noResp = g.noResp.map(l => row(l, sev((t - l.created) / MIN), l.created, '<b>Sin primera respuesta</b><br>' + (l.campaign ? 'Campaña «' + esc(campName(l.campaign)) + '»' : esc(D.SOURCES[l.src].label)) + ' · interés ' + esc(l.interest))).join('');
    const noFollow = g.noFollow.slice(0, 10).map(l => row(l, (t - lastAct(l)) > 5 * DAY ? 'crit' : 'warn', lastAct(l), '<b>' + esc(stageLabel(l.stage)) + '</b> sin seguimiento<br>Último contacto: ' + fdt(lastAct(l)))).join('');
    const vt = g.visitsToday.map(l => row(l, 'warn', null, '<b>Visita hoy a las ' + ft(l.visitAt) + '</b> sin confirmar<br>' + esc(l.interest) + ' · ' + esc(prop(l.interest).address), ft(l.visitAt))).join('');
    const of = g.offers.map(l => row(l, 'crit', stageAt(l), '<b>Oferta sin respuesta del propietario</b><br>' + esc(l.interest) + ' · ' + esc(owner(prop(l.interest).owner).name))).join('');
    const sellers = g.sellers.map(k => '<div class="urgent ' + ((t - k.created) / MIN > 120 ? 'crit' : 'warn') + '"><span class="stripe"></span><div><button class="link-btn cell-main" data-capt="' + k.id + '">' + esc(captName(k)) + '</button><div class="cell-sub">Propietario · ' + esc(captPhone(k)) + '</div></div><div class="what what-col"><b>Quiere vender</b><br>' + esc(k.address) + ' · ' + esc(k.expected) + '</div><div class="who-col">' + who(k.agent) + '</div><div class="timer"><span class="wait crit" data-since="' + k.created + '">' + timer(t - k.created) + '</span><small>esperando</small></div><div class="acts"><button class="btn sm primary" data-capt="' + k.id + '">Agendar tasación</button></div></div>').join('');
    const stale = g.stale.map(p => { const d = Math.floor((t - p.listedAt) / DAY); const st = propStats(p); return '<div class="urgent ' + (d > 150 ? 'crit' : 'warn') + '"><span class="stripe"></span><div><button class="link-btn cell-main" data-prop="' + p.id + '">' + p.id + ' · ' + esc(p.type) + '</button><div class="cell-sub">' + esc(p.address) + '</div></div><div class="what what-col"><b>' + d + ' días en venta</b><br>' + st.leads + ' leads · ' + st.visits + ' visitas · ' + (p.priceChanges.length ? p.priceChanges.length + ' ajuste(s) de precio' : 'sin ajuste de precio') + '</div><div class="who-col">' + esc(owner(p.owner).name) + '</div><div class="timer"><span class="wait crit">' + d + ' d</span><small>en mercado</small></div><div class="acts"><button class="btn sm" data-prop="' + p.id + '">Revisar</button></div></div>'; }).join('');
    return '<div class="card"><div class="sla-bar"><b>Tiempos objetivo</b><span class="pill ok"><span class="dot"></span>menos de 5 min</span><span class="pill warn"><span class="dot"></span>5 a 30 min: se avisa al asesor y a los 15 min se reasigna</span><span class="pill crit"><span class="dot"></span>más de 30 min: se avisa a Alberto</span></div></div>' +
      sec('Sin primera respuesta · ' + g.noResp.length, 'Leads de campañas esperando que alguien los llame', noResp) +
      sec('Propietarios que quieren vender · ' + g.sellers.length, 'Solicitudes de tasación sin contactar', sellers) +
      sec('Visitas de hoy por confirmar · ' + g.visitsToday.length, 'Si el cliente no confirma, la visita suele caerse', vt) +
      sec('Ofertas esperando al propietario · ' + g.offers.length, 'Más de 3 días sin respuesta', of) +
      sec('Sin seguimiento hace más de 48 h · ' + g.noFollow.length, g.noFollow.length > 10 ? 'Mostrando los 10 más antiguos' : 'Leads abiertos que se están enfriando', noFollow) +
      sec('Propiedades estancadas · ' + g.stale.length, 'Más de 90 días en venta', stale);
  };

  VIEWS.leads = function () {
    const f = UI.leads;
    const t = now();
    let ls = S.leads.slice();
    if (f.q) { const q = f.q.toLowerCase(); ls = ls.filter(l => (l.name + ' ' + l.phone + ' ' + l.id + ' ' + l.interest).toLowerCase().includes(q)); }
    if (f.src) ls = ls.filter(l => l.src === f.src);
    if (f.stage === 'open') ls = ls.filter(isOpen); else if (f.stage) ls = ls.filter(l => l.stage === f.stage);
    if (f.agent) ls = ls.filter(l => l.agent === f.agent);
    if (f.campaign) ls = ls.filter(l => l.campaign === f.campaign);
    if (f.unatt) ls = ls.filter(unattended);
    if (f.sort === 'score') ls.sort((a, b) => b.score - a.score);
    else if (f.sort === 'stale') ls.sort((a, b) => lastAct(a) - lastAct(b));
    else ls.sort((a, b) => b.created - a.created);
    const shown = ls.slice(0, 80);
    const opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
    return '<div class="toolbar">' +
      '<input type="search" id="lf-q" placeholder="Nombre, teléfono o código" value="' + esc(f.q) + '" aria-label="Buscar leads">' +
      '<select id="lf-src" aria-label="Origen">' + opt('', 'Todos los orígenes', f.src) + Object.keys(D.SOURCES).map(k => opt(k, D.SOURCES[k].label, f.src)).join('') + '</select>' +
      '<select id="lf-stage" aria-label="Etapa">' + opt('open', 'Abiertos', f.stage) + opt('', 'Todas las etapas', f.stage) + D.STAGES.map(s => opt(s.id, s.label, f.stage)).join('') + '</select>' +
      '<select id="lf-agent" aria-label="Asesor">' + opt('', 'Todos los asesores', f.agent) + S.agents.map(a => opt(a.id, agentName(a.id), f.agent)).join('') + '</select>' +
      '<select id="lf-campaign" aria-label="Campaña">' + opt('', 'Todas las campañas', f.campaign) + S.campaigns.filter(c => !c.sellers).map(c => opt(c.id, c.name, f.campaign)).join('') + '</select>' +
      '<select id="lf-sort" aria-label="Orden">' + opt('recent', 'Más recientes', f.sort) + opt('score', 'Mayor puntaje', f.sort) + opt('stale', 'Más tiempo sin contacto', f.sort) + '</select>' +
      '<label class="check"><input type="checkbox" id="lf-unatt"' + (f.unatt ? ' checked' : '') + '> Solo sin atender</label>' +
      '<span class="spacer"></span><button class="btn primary sm" data-act="new-lead">' + ic('plus') + ' Nuevo lead</button></div>' +
      '<section class="card"><div class="card-head"><h2>' + ls.length + ' leads</h2><span class="hint">' + (ls.length > 80 ? 'Mostrando 80 · usa los filtros para acotar' : 'Clic en una fila para ver la ficha completa') + '</span></div>' +
      '<div class="table-wrap"><table class="t"><thead><tr><th>Lead</th><th>Origen y campaña</th><th>Interés</th><th>Etapa</th><th>Asesor</th><th>Espera / último contacto</th><th>Puntaje</th></tr></thead><tbody>' +
      (shown.map(l => {
        const p = prop(l.interest);
        const waitCell = unattended(l) ? '<span class="wait ' + sev((t - l.created) / MIN) + '" data-since="' + l.created + '">' + timer(t - l.created) + '</span> <span class="small muted">sin respuesta</span>' : '<span class="small">' + ago(lastAct(l)) + '</span>';
        return '<tr class="click" data-lead="' + l.id + '"><td><div class="cell-main">' + esc(l.name) + '</div><div class="cell-sub">' + l.id + ' · ' + esc(l.phone) + '</div></td>' +
          '<td>' + srcTag(l) + '<div class="cell-sub">' + esc(l.campaign ? campName(l.campaign) : (l.portal || D.SOURCES[l.src].label)) + '</div></td>' +
          '<td><div class="cell-main">' + esc(l.interest) + '</div><div class="cell-sub">' + esc(p.type) + ' · ' + money(l.cur, l.budget) + '</div></td>' +
          '<td>' + stageTag(l.stage) + '</td><td>' + who(l.agent) + '</td><td>' + waitCell + '</td><td>' + scoreTag(l.score) + '</td></tr>';
      }).join('') || '<tr><td colspan="7"><div class="empty">Ningún lead coincide con los filtros.</div></td></tr>') +
      '</tbody></table></div></section>';
  };
  AFTER.leads = function () {
    const bind = (id, key, ev, fn) => { const el = $('#' + id); if (el) el.addEventListener(ev || 'change', () => { UI.leads[key] = fn ? fn(el) : el.value; render(); if (id === 'lf-q') { const q = $('#lf-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }); };
    bind('lf-q', 'q', 'input'); bind('lf-src', 'src'); bind('lf-stage', 'stage'); bind('lf-agent', 'agent'); bind('lf-campaign', 'campaign'); bind('lf-sort', 'sort'); bind('lf-unatt', 'unatt', 'change', el => el.checked);
  };

  VIEWS.pipeline = function () {
    const f = UI.board;
    const t = now();
    const cols = D.STAGES.slice(0, 7);
    let ls = S.leads.filter(l => l.stage !== 'perdido' && (l.stage !== 'ganado' || inLast(30, stageAt(l))));
    if (f.agent) ls = ls.filter(l => l.agent === f.agent);
    if (f.src) ls = ls.filter(l => l.src === f.src);
    const opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
    const stuck = [0.25, 3, 5, 5, 5, 10, 999];
    return '<div class="toolbar"><select id="bf-agent" aria-label="Asesor">' + opt('', 'Todos los asesores', f.agent) + S.agents.map(a => opt(a.id, agentName(a.id), f.agent)).join('') + '</select>' +
      '<select id="bf-src" aria-label="Origen">' + opt('', 'Todos los orígenes', f.src) + Object.keys(D.SOURCES).map(k => opt(k, D.SOURCES[k].label, f.src)).join('') + '</select>' +
      '<span class="spacer"></span><span class="small muted">El reloj de cada tarjeta indica cuánto lleva en la etapa. Ámbar o rojo: se está enfriando.</span></div>' +
      '<div class="board" id="board">' + cols.map((c, ci) => {
        const items = ls.filter(l => l.stage === c.id).sort((a, b) => b.score - a.score);
        const potential = items.reduce((s, l) => s + commissionSoles(prop(l.interest)), 0);
        return '<div class="col" data-stage="' + c.id + '"><div class="col-head"><b>' + c.label + '</b><span>' + items.length + '</span></div>' +
          '<div class="col-sum">' + (c.id === 'ganado' ? 'Últimos 30 días · ' : 'Comisión potencial ') + 'S/ ' + num(potential) + '</div>' +
          items.slice(0, 30).map(l => {
            const inStage = t - stageAt(l);
            const d = inStage / DAY;
            const cls = c.id === 'ganado' ? '' : d > stuck[ci] * 2 ? 'crit' : d > stuck[ci] ? 'warn' : '';
            return '<div class="kcard" draggable="true" data-lead="' + l.id + '"><div class="row"><span class="name">' + esc(l.name) + '</span><span class="age ' + cls + '"' + (c.id === 'nuevo' && unattended(l) ? ' data-since="' + l.created + '" data-fmt="dur"' : '') + '>' + dur(inStage).trim() + '</span></div>' +
              '<div class="meta">' + esc(l.interest) + ' · ' + esc(prop(l.interest).type) + ' · ' + money(l.cur, l.budget) + '</div>' +
              '<div class="row">' + srcTag(l) + '<span class="avatar sm" title="' + esc(agentName(l.agent)) + '">' + esc(agent(l.agent).initials) + '</span></div></div>';
          }).join('') + (items.length > 30 ? '<div class="col-more">+ ' + (items.length - 30) + ' más</div>' : '') + '</div>';
      }).join('') + '</div>';
  };
  AFTER.pipeline = function () {
    $('#bf-agent').addEventListener('change', e => { UI.board.agent = e.target.value; render(); });
    $('#bf-src').addEventListener('change', e => { UI.board.src = e.target.value; render(); });
    let dragId = null;
    $$('.kcard').forEach(c => {
      c.addEventListener('dragstart', e => { dragId = c.dataset.lead; c.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* nada */ } });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
    });
    $$('.col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', () => col.classList.remove('drop'));
      col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('drop'); if (dragId) { setStage(lead(dragId), col.dataset.stage); dragId = null; } });
    });
  };

  VIEWS.agenda = function () {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const items = upcomingVisits(7);
    const days = Array.from({ length: 7 }, (_, i) => new Date(t0.getTime() + i * DAY));
    const wd = new Intl.DateTimeFormat('es-PE', { weekday: 'short' });
    const pending = items.filter(i => i.kind === 'lead' && !i.l.visitConfirmed).length;
    return '<div class="row-flex"><span class="pill accent">' + items.length + ' citas en 7 días</span><span class="pill gold">' + pending + ' visitas sin confirmar</span><span class="small muted">Recordatorio automático por WhatsApp 24 h y 2 h antes de cada visita.</span></div>' +
      '<div class="week">' + days.map((d, i) => {
        const its = items.filter(x => new Date(x.at).toDateString() === d.toDateString());
        return '<div class="day ' + (i === 0 ? 'today' : '') + '"><h4><span>' + (i === 0 ? 'Hoy' : wd.format(d)) + '</span><b>' + d.getDate() + '</b></h4>' +
          (its.map(x => x.kind === 'lead'
            ? '<button class="appt ' + (x.l.visitConfirmed ? '' : 'pending') + '" data-lead="' + x.l.id + '"><b>' + ft(x.at) + ' · ' + esc(x.l.interest) + '</b><span>' + esc(x.l.name) + '</span><span class="muted">' + esc(agentName(x.l.agent)) + (x.l.visitConfirmed ? ' · confirmada' : ' · por confirmar') + '</span></button>'
            : '<button class="appt capt" data-capt="' + x.k.id + '"><b>' + ft(x.at) + ' · Tasación</b><span>' + esc(captName(x.k)) + '</span><span class="muted">' + esc(x.k.address) + '</span></button>').join('') || '<span class="small muted">Sin citas</span>') + '</div>';
      }).join('') + '</div>';
  };

  VIEWS.propiedades = function () {
    const f = UI.props;
    const t = now();
    let ps = S.properties.slice();
    if (f.type) ps = ps.filter(p => p.type === f.type);
    if (f.district) ps = ps.filter(p => p.district === f.district);
    if (f.status) ps = ps.filter(p => p.status === f.status);
    if (f.stale) ps = ps.filter(p => p.status === 'Disponible' && t - p.listedAt > 90 * DAY);
    const avail = S.properties.filter(p => p.status === 'Disponible');
    const sale = avail.filter(p => p.op === 'Venta');
    const stockVal = sale.reduce((s, p) => s + (p.cur === 'US$' ? p.price : p.price / FX), 0);
    const avgDom = Math.round(avail.reduce((s, p) => s + (t - p.listedAt) / DAY, 0) / Math.max(1, avail.length));
    const types = [...new Set(S.properties.map(p => p.type))];
    const districts = [...new Set(S.properties.map(p => p.district))];
    const opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
    return '<div class="stock-sum">' +
      kpi('Disponibles', avail.length, sale.length + ' en venta · ' + (avail.length - sale.length) + ' en alquiler') +
      kpi('Valor del stock en venta', 'US$ ' + (stockVal / 1e6).toFixed(2) + '<small>M</small>', 'Precios de lista') +
      kpi('Días promedio en mercado', avgDom, S.properties.filter(p => p.status === 'Disponible' && t - p.listedAt > 90 * DAY).length + ' con más de 90 días') +
      kpi('Reservadas', S.properties.filter(p => p.status === 'Reservada').length, 'Con separación firmada') +
      kpi('En captación', S.captacion.filter(k => k.stage !== 'publicada').length, 'Propietarios en proceso') +
      '</div>' +
      '<div class="toolbar"><select id="pf-type" aria-label="Tipo">' + opt('', 'Todos los tipos', f.type) + types.map(x => opt(x, x, f.type)).join('') + '</select>' +
      '<select id="pf-district" aria-label="Distrito">' + opt('', 'Todos los distritos', f.district) + districts.map(x => opt(x, x, f.district)).join('') + '</select>' +
      '<select id="pf-status" aria-label="Estado">' + opt('', 'Todos los estados', f.status) + ['Disponible', 'Reservada', 'Vendida', 'En captación'].map(x => opt(x, x, f.status)).join('') + '</select>' +
      '<label class="check"><input type="checkbox" id="pf-stale"' + (f.stale ? ' checked' : '') + '> Más de 90 días en venta</label>' +
      '<span class="spacer"></span><button class="btn primary sm" data-act="new-prop">' + ic('plus') + ' Agregar propiedad</button></div>' +
      '<div class="props">' + (ps.map(p => {
        const st = propStats(p);
        const d = p.status === 'En captación' ? 0 : Math.floor(((p.soldAt || t) - p.listedAt) / DAY);
        const sPill = { Disponible: 'accent', Reservada: 'gold', Vendida: 'ok', 'En captación': '' }[p.status];
        return '<button class="prop" data-prop="' + p.id + '"><div class="ph">' + propArt(p) + '<span class="tag pill ' + sPill + '">' + p.status + '</span><span class="code">' + p.id + '</span>' + (p.status === 'Disponible' ? '<span class="dom">' + domPill(d) + '</span>' : '') + '</div>' +
          '<div class="prop-body"><div class="price">' + money(p.cur, p.price) + (p.op === 'Alquiler' ? '<span class="small muted"> /mes</span>' : '') + (p.units ? '<span class="small muted"> por lote</span>' : '') + '</div>' +
          '<div class="addr">' + esc(p.type) + ' · ' + esc(p.address) + ', ' + esc(p.district) + '</div>' +
          '<div class="specs"><span>' + p.area + ' m²</span>' + (p.beds ? '<span>' + p.beds + ' dorm.</span>' : '') + (p.baths ? '<span>' + p.baths + ' baños</span>' : '') + (p.units ? '<span>' + (p.units - p.unitsSold) + ' de ' + p.units + ' lotes libres</span>' : '') + '</div>' +
          '<div class="small">Propietario: <b>' + esc(owner(p.owner).name) + '</b>' + (p.exclusive ? ' · <span class="muted">exclusiva</span>' : '') + '</div>' +
          '<div class="chips">' + (p.campaigns.length ? p.campaigns.map(c => '<span class="chip ' + camp(c).platform + '">' + platformLabel(camp(c).platform) + ' · ' + esc(camp(c).name) + '</span>').join('') : '<span class="chip">Sin campaña activa</span>') + '</div>' +
          '<div class="stats"><div><b>' + st.leads + '</b>leads</div><div><b>' + st.visits + '</b>visitas</div><div><b>' + st.offers + '</b>ofertas</div></div></div></button>';
      }).join('') || '<div class="card empty">Ninguna propiedad coincide.</div>') + '</div>';
  };
  AFTER.propiedades = function () {
    [['pf-type', 'type'], ['pf-district', 'district'], ['pf-status', 'status']].forEach(([id, k]) => $('#' + id).addEventListener('change', e => { UI.props[k] = e.target.value; render(); }));
    $('#pf-stale').addEventListener('change', e => { UI.props.stale = e.target.checked; render(); });
  };
  function propArt(p) {
    // Ilustración generada por tipo de inmueble (sin fotos externas)
    const h = p.hue;
    const sky = 'hsl(' + h + ' 35% 78%)', sky2 = 'hsl(' + ((h + 30) % 360) + ' 40% 88%)', hill = 'hsl(' + ((h + 140) % 360) + ' 18% 52%)', body = 'hsl(' + h + ' 28% 34%)', win = 'hsl(45 90% 78%)';
    let b = '';
    if (/Departamento|Oficina/.test(p.type)) {
      b = '<rect x="150" y="30" width="90" height="130" fill="' + body + '"/><rect x="240" y="60" width="60" height="100" fill="hsl(' + h + ' 25% 26%)"/>';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) b += '<rect x="' + (160 + c * 26) + '" y="' + (42 + r * 23) + '" width="16" height="12" fill="' + ((r + c) % 3 ? win : 'hsl(' + h + ' 20% 60%)') + '"/>';
    } else if (/Terreno/.test(p.type)) {
      b = '<path d="M60 150 L200 120 L340 150 L200 170 Z" fill="hsl(95 30% 45%)"/><path d="M60 150 L200 120 L340 150" fill="none" stroke="#fff" stroke-dasharray="6 5" stroke-width="2"/><rect x="195" y="96" width="3" height="26" fill="#fff"/><path d="M198 96 L216 102 L198 108 Z" fill="hsl(' + h + ' 70% 45%)"/>';
    } else if (/Local/.test(p.type)) {
      b = '<rect x="120" y="60" width="160" height="100" fill="' + body + '"/><rect x="120" y="60" width="160" height="18" fill="hsl(' + h + ' 60% 45%)"/><rect x="135" y="92" width="60" height="68" fill="' + win + '"/><rect x="210" y="92" width="55" height="45" fill="' + win + '"/>';
    } else {
      b = '<path d="M130 100 L200 50 L270 100 Z" fill="hsl(' + h + ' 45% 38%)"/><rect x="140" y="100" width="120" height="60" fill="' + body + '"/><rect x="190" y="120" width="22" height="40" fill="hsl(' + h + ' 25% 22%)"/><rect x="152" y="112" width="26" height="20" fill="' + win + '"/><rect x="222" y="112" width="26" height="20" fill="' + win + '"/>';
    }
    return '<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g' + p.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky + '"/><stop offset="1" stop-color="' + sky2 + '"/></linearGradient></defs><rect width="400" height="200" fill="url(#g' + p.id + ')"/><path d="M0 120 L70 70 L130 105 L210 55 L290 100 L350 72 L400 95 V200 H0 Z" fill="' + hill + '" opacity=".55"/><path d="M180 70 L210 55 L232 68 Z" fill="#fff" opacity=".8"/><rect y="160" width="400" height="40" fill="hsl(' + ((h + 140) % 360) + ' 15% 40%)"/>' + b + '</svg>';
  }

  function captName(k) { return k.owner ? owner(k.owner).name : k.name; }
  function captPhone(k) { return k.owner ? owner(k.owner).phone : k.phone; }
  VIEWS.captacion = function () {
    const t = now();
    const ownerRows = S.owners.map(o => {
      const ps = S.properties.filter(p => p.owner === o.id);
      return '<tr><td><div class="cell-main">' + esc(o.name) + '</div><div class="cell-sub">' + esc(o.phone) + '</div></td><td>' + (ps.map(p => '<button class="link-btn" data-prop="' + p.id + '">' + p.id + '</button> <span class="small muted">' + esc(p.status) + '</span>').join('<br>') || '<span class="muted small">En proceso</span>') + '</td><td class="small">Cliente desde ' + fd(o.sinceAt) + '</td><td class="small">' + ago(o.lastReport) + '</td></tr>';
    }).join('');
    return '<div class="insight">' + ic('bulb') + '<div>La campaña <b>«Vende tu propiedad con nosotros»</b> y el WhatsApp de la agencia generan solicitudes de tasación que entran aquí. Cada propietario recibe un <b>reporte semanal automático</b> con vistas, leads y visitas de su inmueble.</div></div>' +
      '<div class="toolbar"><span class="spacer"></span><button class="btn primary sm" data-act="new-capt">' + ic('plus') + ' Registrar propietario</button></div>' +
      '<div class="board">' + D.CAPT_STAGES.map(st => {
        const items = S.captacion.filter(k => k.stage === st.id);
        return '<div class="col"><div class="col-head"><b>' + st.label + '</b><span>' + items.length + '</span></div>' + items.map(k => '<div class="kcard" data-capt="' + k.id + '" style="cursor:pointer"><div class="row"><span class="name">' + esc(captName(k)) + '</span><span class="age ' + (st.id === 'solicitud' && t - k.created > 2 * HOUR ? 'crit' : '') + '">' + dur(t - k.created).trim() + '</span></div><div class="meta">' + esc(k.address) + '</div><div class="row"><span class="small"><b>' + esc(k.expected) + '</b></span><span class="avatar sm" title="' + esc(agentName(k.agent)) + '">' + esc(agent(k.agent).initials) + '</span></div>' + (k.visit && st.id === 'agendada' ? '<div class="meta">' + ic('clock', 'i12') + ' ' + fdt(k.visit) + '</div>' : '') + '</div>').join('') + '</div>';
      }).join('') + '</div>' +
      '<section class="card"><div class="card-head"><h2>Propietarios</h2><span class="hint">' + S.owners.length + ' clientes con inmuebles en cartera</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Propietario</th><th>Inmuebles</th><th>Relación</th><th>Último reporte enviado</th></tr></thead><tbody>' + ownerRows + '</tbody></table></div></section>';
  };

  function campStats(c) {
    const ls = S.leads.filter(l => l.campaign === c.id);
    const resp = ls.map(responseMins).filter(v => v != null);
    const won = ls.filter(l => l.stage === 'ganado');
    return {
      leads: ls.length,
      fast: pct(resp.filter(v => v < 5).length, ls.length),
      qual: ls.filter(l => reached(l) >= 2).length,
      visits: ls.filter(l => reached(l) >= 3).length,
      won: won.length,
      comm: won.reduce((s, l) => s + commissionSoles(prop(l.interest)), 0),
      list: ls
    };
  }
  VIEWS.campanas = function () {
    const rows = S.campaigns.filter(c => !c.sellers).map(c => Object.assign({ c }, campStats(c)));
    const tot = rows.reduce((a, r) => ({ spend: a.spend + r.c.spend, leads: a.leads + r.leads, visits: a.visits + r.visits, won: a.won + r.won, comm: a.comm + r.comm }), { spend: 0, leads: 0, visits: 0, won: 0, comm: 0 });
    const plat = p => rows.filter(r => r.c.platform === p).reduce((a, r) => ({ spend: a.spend + r.c.spend, leads: a.leads + r.leads, visits: a.visits + r.visits, won: a.won + r.won }), { spend: 0, leads: 0, visits: 0, won: 0 });
    const m = plat('meta'), tk = plat('tiktok');
    const cplM = m.spend / Math.max(1, m.leads), cplT = tk.spend / Math.max(1, tk.leads);
    const cpvM = m.spend / Math.max(1, m.visits), cpvT = tk.spend / Math.max(1, tk.visits);
    const sellers = S.campaigns.find(c => c.sellers);
    const sellerLeads = S.captacion.filter(k => k.src === sellers.id).length;
    return '<div class="row-flex">' + S.integrations.filter(i => i.id === 'meta' || i.id === 'tiktok').map(i => '<span class="pill ok"><span class="dot"></span>' + esc(i.name) + ' · sincronizado ' + ago(i.lastSync) + '</span>').join('') + '</div>' +
      '<div class="kpis">' +
      kpi('Inversión total', 'S/ ' + num(tot.spend), 'Meta S/ ' + num(m.spend) + ' · TikTok S/ ' + num(tk.spend)) +
      kpi('Leads de campañas', num(tot.leads), 'CPL promedio S/ ' + (tot.spend / Math.max(1, tot.leads)).toFixed(2)) +
      kpi('Costo por lead', 'S/ ' + cplM.toFixed(2), 'Meta · TikTok: S/ ' + cplT.toFixed(2)) +
      kpi('Costo por visita', 'S/ ' + cpvM.toFixed(0), 'Meta · TikTok: S/ ' + cpvT.toFixed(0)) +
      kpi('Cierres atribuidos', tot.won, 'Comisión S/ ' + num(tot.comm)) +
      kpi('Retorno', (tot.comm / Math.max(1, tot.spend)).toFixed(1) + '<small>x</small>', 'Comisión generada ÷ inversión') +
      '</div>' +
      '<div class="insight gold">' + ic('bulb') + '<div><b>Lectura rápida:</b> en TikTok cada lead cuesta S/ ' + cplT.toFixed(2) + ' y en Meta S/ ' + cplM.toFixed(2) + ', pero lo que importa es la visita: S/ ' + cpvT.toFixed(0) + ' en TikTok frente a S/ ' + cpvM.toFixed(0) + ' en Meta.' + ((cplT < cplM) !== (cpvT < cpvM) ? ' El canal con el lead más barato no es el que trae la visita más barata.' : '') + ' Por eso el CRM devuelve a Meta y TikTok qué leads sí visitaron: así las campañas aprenden a buscar compradores reales y no solo formularios llenos.</div></div>' +
      '<section class="card"><div class="card-head"><h2>Campañas</h2><span class="hint">Clic en una campaña para ver sus leads y propiedades</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Campaña</th><th>Estado</th><th class="r">Inversión</th><th class="r">Leads</th><th class="r">CPL</th><th class="r">Resp. &lt; 5 min</th><th class="r">Calificados</th><th class="r">Visitas</th><th class="r">Cierres</th><th class="r">Costo por visita</th><th>Propiedades</th></tr></thead><tbody>' +
      rows.map(r => '<tr class="click" data-camp="' + r.c.id + '"><td><div class="cell-main">' + esc(r.c.name) + '</div><div class="cell-sub"><span class="src ' + r.c.platform + '"><i></i>' + platformLabel(r.c.platform) + '</span> · ' + esc(r.c.objective) + '</div></td><td><span class="pill ' + (r.c.status === 'Activa' ? 'ok' : '') + '">' + r.c.status + '</span></td><td class="r num">S/ ' + num(r.c.spend) + '</td><td class="r num">' + r.leads + '</td><td class="r num">S/ ' + (r.c.spend / Math.max(1, r.leads)).toFixed(2) + '</td><td class="r num">' + r.fast + '%</td><td class="r num">' + r.qual + '</td><td class="r num">' + r.visits + '</td><td class="r num">' + r.won + '</td><td class="r num">' + (r.visits ? 'S/ ' + num(r.c.spend / r.visits) : '—') + '</td><td class="small">' + r.c.props.join(', ') + '</td></tr>').join('') +
      '<tr><td><div class="cell-main">' + esc(sellers.name) + '</div><div class="cell-sub"><span class="src meta"><i></i>Meta</span> · ' + esc(sellers.objective) + '</div></td><td><span class="pill ok">Activa</span></td><td class="r num">S/ ' + num(sellers.spend) + '</td><td class="r num">' + sellerLeads + '</td><td class="r num">S/ ' + (sellers.spend / Math.max(1, sellerLeads)).toFixed(0) + '</td><td class="r" colspan="5"><span class="small muted">Genera propietarios, no compradores → ver Captación</span></td><td></td></tr>' +
      '</tbody></table></div></section>' +
      '<div class="grid g2"><section class="card"><div class="card-head"><h2>Costo por lead</h2><span class="hint">Soles por formulario recibido</span></div>' + hbars(rows.map(r => ({ name: r.c.name, v: r.c.spend / Math.max(1, r.leads), label: 'S/ ' + (r.c.spend / Math.max(1, r.leads)).toFixed(2) })).sort((a, b) => a.v - b.v)) + '</section>' +
      '<section class="card"><div class="card-head"><h2>Costo por visita realizada</h2><span class="hint">La métrica que importa para vender</span></div>' + hbars(rows.map(r => ({ name: r.c.name, v: r.visits ? r.c.spend / r.visits : 0, label: r.visits ? 'S/ ' + num(r.c.spend / r.visits) : 'sin visitas', cls: 'gold' })).sort((a, b) => a.v - b.v)) + '</section></div>';
  };

  VIEWS.trazabilidad = function () {
    const f = UI.funnel;
    const t = now();
    let ls = S.leads.filter(l => inLast(f.days, l.created));
    if (f.group) ls = ls.filter(l => group(l.src) === f.group);
    const steps = funnelData(ls);
    const lost = ls.filter(l => l.stage === 'perdido');
    const reasons = {};
    lost.forEach(l => { reasons[l.lossReason] = (reasons[l.lossReason] || 0) + 1; });
    const buckets = [['Menos de 5 min', 0, 5], ['5 a 30 min', 5, 30], ['30 min a 2 h', 30, 120], ['2 a 24 h', 120, 1440], ['Más de 24 h', 1440, 1e9]].map(([n, a, b]) => {
      const bl = ls.filter(l => { const m = responseMins(l); return m != null && m >= a && m < b; });
      return { name: n, n: bl.length, contact: pct(bl.filter(l => reached(l) >= 1).length, bl.length), visit: pct(bl.filter(l => reached(l) >= 3).length, bl.length) };
    });
    const stalled = ls.filter(l => isOpen(l) && !unattended(l) && (t - lastAct(l)) > 4 * DAY).sort((a, b) => lastAct(a) - lastAct(b)).slice(0, 8);
    const worst = steps.slice(0, 6).map(s => ({ s, drop: s.count ? s.lost / s.count : 0 })).sort((a, b) => b.drop - a.drop)[0];
    const seg = (v, l, cur) => '<button data-f="' + v + '" class="' + (String(v) === String(cur) ? 'on' : '') + '">' + l + '</button>';
    return '<div class="toolbar"><div class="seg" id="ff-group">' + seg('', 'Todos', f.group) + seg('meta', 'Meta', f.group) + seg('tiktok', 'TikTok', f.group) + seg('otros', 'Otros', f.group) + '</div>' +
      '<div class="seg" id="ff-days">' + seg(30, '30 días', f.days) + seg(60, '60 días', f.days) + '</div><span class="small muted">' + ls.length + ' leads en el periodo</span></div>' +
      (worst ? '<div class="insight crit">' + ic('bulb') + '<div>La mayor fuga está en la etapa <b>' + worst.s.label + '</b>: se perdió el <b>' + Math.round(worst.drop * 100) + '%</b> de los leads que llegaron ahí. Motivo más frecuente: <b>' + esc((Object.entries(worst.s.reasons).sort((a, b) => b[1] - a[1])[0] || ['sin registrar'])[0]) + '</b>.</div></div>' : '') +
      '<section class="card"><div class="card-head"><h2>Embudo completo</h2><span class="hint">Cuántos llegan a cada etapa, cuántos se pierden y cuánto tardan</span></div>' + funnelHTML(steps, false) + '</section>' +
      '<div class="grid g2">' +
      '<section class="card"><div class="card-head"><h2>Velocidad de respuesta vs. resultado</h2><span class="hint">¿Cuánto importa contestar rápido?</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Primera respuesta</th><th class="r">Leads</th><th class="r">Se logró contacto</th><th class="r">Llegó a visita</th></tr></thead><tbody>' +
      buckets.map(b => '<tr><td>' + b.name + '</td><td class="r num">' + b.n + '</td><td class="r"><div class="hbar" style="grid-template-columns:minmax(0,1fr) auto;padding:0"><div class="track"><div class="fill" style="width:' + b.contact + '%"></div></div><span class="v">' + b.contact + '%</span></div></td><td class="r num">' + b.visit + '%</td></tr>').join('') +
      '</tbody></table></div></section>' +
      '<section class="card"><div class="card-head"><h2>Motivos de pérdida</h2><span class="hint">' + lost.length + ' leads perdidos</span></div>' + hbars(Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ name: n, v, label: v + ' · ' + pct(v, lost.length) + '%' })), { cls: 'crit' }) + '</section>' +
      '</div>' +
      '<section class="card"><div class="card-head"><h2>Leads estancados</h2><span class="hint">Abiertos, más de 4 días sin actividad</span></div><div class="table-wrap"><table class="t"><thead><tr><th>Lead</th><th>Etapa</th><th>En la etapa desde</th><th>Último contacto</th><th>Asesor</th></tr></thead><tbody>' +
      (stalled.map(l => '<tr class="click" data-lead="' + l.id + '"><td><div class="cell-main">' + esc(l.name) + '</div><div class="cell-sub">' + srcTag(l) + '</div></td><td>' + stageTag(l.stage) + '</td><td class="small">' + dur(t - stageAt(l)).trim() + '</td><td><span class="wait crit">' + ago(lastAct(l)) + '</span></td><td>' + who(l.agent) + '</td></tr>').join('') || '<tr><td colspan="5"><div class="empty">Ningún lead estancado.</div></td></tr>') +
      '</tbody></table></div></section>';
  };
  AFTER.trazabilidad = function () {
    $$('#ff-group button').forEach(b => b.addEventListener('click', () => { UI.funnel.group = b.dataset.f; render(); }));
    $$('#ff-days button').forEach(b => b.addEventListener('click', () => { UI.funnel.days = +b.dataset.f; render(); }));
  };

  VIEWS.equipo = function () {
    const t = now();
    const rows = S.agents.map(a => {
      const ls = S.leads.filter(l => l.agent === a.id && inLast(30, l.created));
      const all = S.leads.filter(l => l.agent === a.id);
      const r = ls.map(responseMins).filter(v => v != null);
      return { a, n: ls.length, open: all.filter(isOpen).length, un: all.filter(unattended).length, med: median(r), fast: pct(r.filter(v => v < 5).length, r.length), vis: all.filter(l => l.visitAt && l.visitAt <= t && inLast(30, l.visitAt)).length, won: all.filter(l => l.stage === 'ganado' && inLast(60, stageAt(l))).length, conv: pct(all.filter(l => l.stage === 'ganado').length, all.length) };
    });
    return '<div class="insight">' + ic('bulb') + '<div>Los asesores <b>en turno</b> reciben leads por turno rotativo. Si alguien sale de turno, sus leads nuevos pasan al siguiente automáticamente. Alberto recibe solo los escalamientos.</div></div>' +
      '<section class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Asesor</th><th>En turno</th><th class="r">Leads 30 d</th><th class="r">Abiertos</th><th class="r">Sin atender</th><th class="r">1ª respuesta (mediana)</th><th class="r">&lt; 5 min</th><th class="r">Visitas 30 d</th><th class="r">Cierres 60 d</th><th class="r">Conversión</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td><div class="who"><span class="avatar">' + esc(r.a.initials) + '</span><div><div class="cell-main">' + esc(agentName(r.a.id)) + '</div><div class="cell-sub">' + esc(r.a.role) + '</div></div></div></td><td>' + (r.a.rr ? '<label class="switch" title="En turno"><input type="checkbox" data-duty="' + r.a.id + '"' + (r.a.onDuty ? ' checked' : '') + ' aria-label="En turno"><span></span></label>' : '<span class="small muted">Escalamientos</span>') + '</td><td class="r num">' + r.n + '</td><td class="r num">' + r.open + '</td><td class="r">' + (r.un ? '<span class="pill crit">' + r.un + '</span>' : '<span class="num">0</span>') + '</td><td class="r"><span class="wait ' + sev(r.med) + '">' + (r.n ? dur(r.med * MIN).trim() : '—') + '</span></td><td class="r num">' + (r.n ? r.fast + '%' : '—') + '</td><td class="r num">' + r.vis + '</td><td class="r num">' + r.won + '</td><td class="r num">' + r.conv + '%</td></tr>').join('') +
      '</tbody></table></div></section>' +
      '<section class="card"><div class="card-head"><h2>Leads abiertos por asesor</h2><span class="hint">Carga de trabajo actual</span></div>' + hbars(rows.filter(r => r.a.rr).map(r => ({ name: agentName(r.a.id), v: r.open }))) + '</section>';
  };
  AFTER.equipo = function () {
    $$('[data-duty]').forEach(i => i.addEventListener('change', () => { const a = agent(i.dataset.duty); a.onDuty = i.checked; save(); toast(a.name + (i.checked ? ' entró en turno' : ' salió de turno'), 'Los próximos leads se reparten entre ' + S.agents.filter(x => x.rr && x.onDuty).map(x => x.name).join(', ') + '.'); }));
  };

  VIEWS.automatizaciones = function () {
    const log = (S.log || []).slice(-8).reverse();
    return '<section class="card">' + S.automations.map(a => '<div class="rule"><label class="switch"><input type="checkbox" data-rule="' + a.id + '"' + (a.on ? ' checked' : '') + ' aria-label="Activar ' + esc(a.name) + '"><span></span></label><div><h3>' + esc(a.name) + '</h3><div class="flow"><span><b>Cuando</b> ' + esc(a.when) + '</span><span><b>entonces</b> ' + esc(a.then) + '</span></div></div><div class="runs">' + num(a.runs) + ' ejecuciones<br>últimos 60 días</div></div>').join('') + '</section>' +
      '<section class="card"><div class="card-head"><h2>Actividad de esta sesión</h2><span class="hint">Lo que las reglas hicieron mientras usabas la demo</span></div>' + (log.length ? '<ul class="timeline">' + log.map(e => '<li><span class="ic auto">' + ic('auto') + '</span><div><div class="txt">' + esc(e.text) + '</div><div class="when">' + fdt(e.at) + '</div></div></li>').join('') + '</ul>' : '<div class="empty">Pulsa «Simular lead» o activa «En vivo» y vuelve aquí para ver las reglas en acción.</div>') + '</section>';
  };
  AFTER.automatizaciones = function () {
    $$('[data-rule]').forEach(i => i.addEventListener('change', () => { const r = S.automations.find(x => x.id === i.dataset.rule); r.on = i.checked; save(); toast(r.name, i.checked ? 'Activada' : 'Desactivada'); }));
  };

  VIEWS.integraciones = function () {
    const sample = {
      lead_id: 'L-1231', recibido: new Date().toISOString().slice(0, 19) + '-05:00',
      origen: 'tiktok_lead_gen', campana: 'Lotes financiados Huamancaca', grupo_anuncios: 'Huancayo 25-45 · Intereses vivienda', anuncio: 'Video recorrido 45 s',
      formulario: 'Cotiza tu lote',
      respuestas: { nombre: 'Yesenia Ticse Poma', telefono: '+51 9XX XXX XXX', presupuesto: 'US$ 15,000', como_pagarias: 'Crédito MiVivienda', cuando_compras: '1 a 3 meses' },
      asignado_a: 'Diego Orihuela', regla: 'turno rotativo', whatsapp_bienvenida: 'enviado en 12 s'
    };
    return '<div class="integ">' + S.integrations.map(i => '<div class="card"><div class="row-flex" style="justify-content:space-between"><h3>' + esc(i.name) + '</h3><span class="pill ' + (i.status === 'Conectado' ? 'ok' : 'gold') + '"><span class="dot"></span>' + esc(i.status) + '</span></div><div class="small muted">' + esc(i.detail) + '</div><p class="small">' + esc(i.how) + '</p>' + (i.status === 'Conectado' ? '<div class="small muted">Última sincronización ' + ago(i.lastSync) + '</div>' : '') + '</div>').join('') + '</div>' +
      '<div class="grid g2"><section class="card"><div class="card-head"><h2>Así llega un lead de TikTok al CRM</h2><span class="hint">Todo queda guardado: campaña, anuncio y respuestas</span></div><pre class="code">' + esc(JSON.stringify(sample, null, 2)) + '</pre></section>' +
      '<section class="card"><div class="card-head"><h2>Conexión con la nueva web</h2><span class="hint">Para la agencia que desarrolla el sitio</span></div><div class="stack small"><p>El CRM no compite con la web: la complementa. La agencia de la web tiene dos caminos, ambos de pocas horas de trabajo:</p><p><b>1. Formularios →</b> enviar cada formulario a un endpoint del CRM (POST con JSON). El lead entra con la página de origen y los parámetros UTM.</p><p><b>2. Catálogo ←</b> leer el stock desde el CRM (API o feed XML), así la web siempre muestra precios y estados actualizados sin cargar nada dos veces.</p></div><pre class="code">POST /api/v1/leads\n{\n  "nombre": "…",\n  "telefono": "…",\n  "propiedad": "INC-114",\n  "pagina": "/propiedades/inc-114",\n  "utm_source": "google", "utm_campaign": "…"\n}</pre></section></div>';
  };

  /* ================= Cajón (fichas) ================= */
  function openDrawer(html) {
    const d = $('#drawer');
    d.innerHTML = html;
    $('#scrim').hidden = false;
    requestAnimationFrame(() => { $('#scrim').classList.add('show'); d.classList.add('show'); });
    d.setAttribute('aria-hidden', 'false');
    const c = $('.close', d); if (c) c.focus();
    tickTimers();
  }
  function closeDrawer() {
    UI.drawer = null;
    const d = $('#drawer');
    d.classList.remove('show'); $('#scrim').classList.remove('show');
    d.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!UI.drawer) { $('#scrim').hidden = true; d.innerHTML = ''; } }, 250);
  }
  const closeBtn = '<button class="btn ghost sm close" data-act="close" aria-label="Cerrar">' + ic('close') + '</button>';

  function leadDrawer(id, panel) {
    const l = lead(id); if (!l) return;
    UI.drawer = { kind: 'lead', id, panel: panel || '' };
    const t = now();
    const p = prop(l.interest);
    const c = camp(l.campaign);
    const r = reached(l);
    const st = D.STAGES.slice(0, 7);
    const journey = '<div class="journey">' + st.map((s, i) => {
      const h = l.history.find(x => x.stage === s.id);
      const cls = l.stage === 'perdido' && s.id === l.lostStage ? 'lost' : i < r || (i === r && l.stage === 'ganado') ? 'done' : i === r ? 'cur' : '';
      return '<div class="' + cls + '"><div class="seg-bar"></div><span>' + s.label + '</span><b>' + (h ? new Date(h.at).getDate() + '/' + (new Date(h.at).getMonth() + 1) : '') + '</b></div>';
    }).join('') + '</div>';
    // Línea de tiempo con tiempos de espera entre eventos
    let tl = '<ul class="timeline">';
    const evs = l.events.slice().sort((a, b) => a.at - b.at);
    evs.forEach((e, i) => {
      tl += '<li><span class="ic ' + e.type + '">' + ic(e.type === 'wa' ? 'wa' : e.type) + '</span><div><div class="txt">' + esc(e.text) + '</div><div class="when">' + fdt(e.at) + (e.by ? ' · ' + esc(agentName(e.by)) : e.type === 'auto' ? ' · automático' : '') + '</div></div></li>';
      const next = evs[i + 1];
      if (next && next.at - e.at > 30 * MIN) {
        const gap = next.at - e.at;
        const isFirst = !evs.slice(0, i + 1).some(x => x.type !== 'in' && x.type !== 'auto');
        tl += '<div class="gap-note ' + (isFirst ? sev(gap / MIN) : gap > 3 * DAY ? 'crit' : gap > DAY ? 'warn' : '') + '">↕ ' + (isFirst ? 'esperó ' : '') + dur(gap).trim() + (isFirst ? ' la primera respuesta' : ' sin contacto') + '</div>';
      }
    });
    if (unattended(l)) tl += '<div class="gap-note crit">↕ esperando respuesta: <span data-since="' + l.created + '">' + timer(t - l.created) + '</span></div>';
    else if (isOpen(l) && t - lastAct(l) > 30 * MIN) tl += '<div class="gap-note ' + (t - lastAct(l) > 2 * DAY ? 'crit' : 'warn') + '">↕ ' + dur(t - lastAct(l)).trim() + ' sin contacto hasta ahora</div>';
    tl += '</ul>';

    const matches = S.properties.filter(x => x.status === 'Disponible' && x.id !== l.interest && x.op === p.op && x.cur === p.cur)
      .map(x => ({ x, s: (x.type === p.type ? 40 : 0) + (x.district === l.zona ? 30 : 0) + Math.max(0, 30 - Math.abs(x.price - l.budget) / l.budget * 100) }))
      .sort((a, b) => b.s - a.s).slice(0, 3);
    const waText = 'Hola ' + l.name.split(' ')[0] + ', soy ' + agent(l.agent).name + ' de Inmoconecta Huancayo. Vi que te interesó ' + (p.type === 'Terreno' ? 'el terreno' : 'el inmueble') + ' ' + p.id + ' en ' + p.district + ' (' + money(p.cur, p.price) + '). ¿Te puedo llamar ahora o prefieres agendar una visita esta semana?';
    const opt = (v, lbl, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(lbl) + '</option>';
    const pn = UI.drawer.panel;
    const panels = {
      wa: '<div class="inline-form"><div class="field"><label for="wa-tpl">Plantilla</label><select id="wa-tpl"><option value="0">Primer contacto con ficha</option><option value="1">Confirmar visita</option><option value="2">Propiedades similares</option></select></div><div class="wa-preview" id="wa-text">' + esc(waText) + '</div><div class="row-flex"><button class="btn primary sm" data-act="wa-send" data-id="' + l.id + '">Registrar envío</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button><span class="small muted">En producción se envía por WhatsApp Business API.</span></div></div>',
      visit: '<div class="inline-form"><div class="form-row"><div class="field"><label for="v-date">Fecha y hora</label><input type="datetime-local" id="v-date" value="' + localInput(t + DAY) + '"></div><div class="field"><label for="v-prop">Propiedad</label><select id="v-prop">' + S.properties.filter(x => x.status !== 'Vendida').map(x => opt(x.id, x.id + ' · ' + x.type + ' · ' + x.district, l.interest)).join('') + '</select></div></div><div class="row-flex"><button class="btn primary sm" data-act="visit-save" data-id="' + l.id + '">Agendar visita</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      lost: '<div class="inline-form"><div class="field"><label for="lost-r">Motivo de pérdida</label><select id="lost-r">' + D.LOSS_REASONS.map(x => opt(x, x, '')).join('') + '</select></div><div class="row-flex"><button class="btn sm danger" data-act="lost-save" data-id="' + l.id + '">Marcar como perdido</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>',
      note: '<div class="inline-form"><div class="field"><label for="note-t">Nota</label><textarea id="note-t" rows="3" placeholder="Ej.: prefiere visitar el sábado, trabaja en Lima"></textarea></div><div class="row-flex"><button class="btn primary sm" data-act="note-save" data-id="' + l.id + '">Guardar nota</button><button class="btn ghost sm" data-act="panel" data-p="" data-id="' + l.id + '">Cancelar</button></div></div>'
    };
    const html = '<div class="dr-head"><div class="top-row"><div><div class="eyebrow">' + l.id + ' · lead</div><h2 id="dr-title">' + esc(l.name) + '</h2><div class="row-flex small" style="margin-top:4px">' + srcTag(l) + '<span class="mono">' + esc(l.phone) + '</span><span class="muted">' + esc(l.email) + '</span></div></div>' + closeBtn + '</div>' +
      '<div class="row-flex"><select id="dr-stage" aria-label="Etapa" class="btn sm">' + D.STAGES.map(s => opt(s.id, s.label, l.stage)).join('') + '</select><select id="dr-agent" aria-label="Asesor" class="btn sm">' + S.agents.map(a => opt(a.id, agentName(a.id), l.agent)).join('') + '</select>' + scoreTag(l.score) + (unattended(l) ? '<span class="pill crit">Sin atender · <span data-since="' + l.created + '">' + timer(t - l.created) + '</span></span>' : '') + (l.stage === 'perdido' ? '<span class="pill crit">' + esc(l.lossReason) + '</span>' : '') + '</div>' +
      '<div class="dr-actions"><button class="btn sm primary" data-act="call" data-id="' + l.id + '">' + ic('call') + ' Registrar llamada</button><button class="btn sm" data-act="panel" data-p="wa" data-id="' + l.id + '">WhatsApp</button><button class="btn sm" data-act="panel" data-p="visit" data-id="' + l.id + '">Agendar visita</button><button class="btn sm" data-act="panel" data-p="note" data-id="' + l.id + '">Nota</button>' + (isOpen(l) ? '<button class="btn sm danger" data-act="panel" data-p="lost" data-id="' + l.id + '">Perdido</button>' : '') + (l.stage === 'visita' && l.visitAt > t && !l.visitConfirmed ? '<button class="btn sm" data-act="confirm-visit" data-id="' + l.id + '">Confirmar visita</button>' : '') + '</div>' +
      (pn ? panels[pn] : '') + '</div>' +
      '<div class="dr-body">' +
      '<div class="panel"><div class="panel-head"><h3>Recorrido</h3><span class="hint">Ingresó ' + fdt(l.created) + ' · ' + ago(l.created) + '</span></div>' + journey + (l.visitAt && l.stage === 'visita' ? '<div class="small">' + ic('visit', 'i12') + ' Visita: <b>' + fdt(l.visitAt) + '</b> · ' + (l.visitConfirmed ? '<span class="pill ok">confirmada</span>' : '<span class="pill gold">por confirmar</span>') + '</div>' : '') + '</div>' +
      '<div class="panel"><h3>Lo que respondió en el formulario</h3><dl class="kv"><div><dt>Presupuesto</dt><dd>' + money(l.cur, l.budget) + '</dd></div><div><dt>Forma de pago</dt><dd>' + esc(l.pago) + '</dd></div><div><dt>¿Cuándo compra?</dt><dd>' + esc(l.plazo) + '</dd></div><div><dt>Zona</dt><dd>' + esc(l.zona) + '</dd></div></dl></div>' +
      '<div class="panel"><h3>Origen y campaña</h3><dl class="kv"><div><dt>Canal</dt><dd>' + esc(D.SOURCES[l.src].label) + (l.portal ? ' · ' + esc(l.portal) : '') + '</dd></div><div><dt>Campaña</dt><dd>' + (c ? '<button class="link-btn" data-camp="' + c.id + '">' + esc(c.name) + '</button>' : '—') + '</dd></div><div><dt>Conjunto de anuncios</dt><dd>' + esc(l.adset || '—') + '</dd></div><div><dt>Anuncio</dt><dd>' + esc(l.ad || '—') + '</dd></div><div><dt>Formulario</dt><dd>' + esc(c ? c.form : '—') + '</dd></div><div><dt>Primera respuesta</dt><dd>' + (l.firstResponse ? '<span class="wait ' + sev(responseMins(l)) + '">' + dur(l.firstResponse - l.created).trim() + '</span> después' : '<span class="wait crit">pendiente</span>') + '</dd></div></dl></div>' +
      '<div class="panel"><div class="panel-head"><h3>Propiedad de interés</h3><button class="link-btn small" data-prop="' + p.id + '">Ver ficha →</button></div><div class="small"><b>' + p.id + ' · ' + esc(p.type) + '</b> · ' + esc(p.address) + ', ' + esc(p.district) + '<br>' + money(p.cur, p.price) + ' · ' + p.area + ' m²' + (p.beds ? ' · ' + p.beds + ' dorm.' : '') + ' · <span class="pill ' + (p.status === 'Disponible' ? 'accent' : 'gold') + '">' + esc(p.status) + '</span></div></div>' +
      '<div class="panel"><h3>Historial</h3>' + tl + '</div>' +
      '<div class="panel"><div class="panel-head"><h3>Otras propiedades que le pueden interesar</h3><span class="hint">Por tipo, zona y presupuesto</span></div>' + (matches.map(m => '<div class="match"><div><button class="link-btn" data-prop="' + m.x.id + '">' + m.x.id + ' · ' + esc(m.x.type) + ' · ' + esc(m.x.district) + '</button><div class="cell-sub">' + esc(m.x.address) + '</div></div><span class="mono small">' + money(m.x.cur, m.x.price) + '</span></div>').join('') || '<div class="small muted">Sin coincidencias en el stock actual.</div>') + '</div>' +
      '</div>';
    openDrawer(html);
    $('#dr-stage').addEventListener('change', e => { const v = e.target.value; if (v === 'perdido') { leadDrawer(id, 'lost'); e.target.value = l.stage; return; } setStage(l, v); });
    $('#dr-agent').addEventListener('change', e => { reassign(l, e.target.value, 'manual'); });
    const tpl = $('#wa-tpl');
    if (tpl) tpl.addEventListener('change', () => {
      const texts = [waText,
        'Hola ' + l.name.split(' ')[0] + ', te recuerdo tu visita a ' + p.id + ' (' + p.address + '). ¿Me confirmas respondiendo SÍ? Te espero en la puerta.',
        'Hola ' + l.name.split(' ')[0] + ', según lo que buscas te comparto opciones similares: ' + (matches.map(m => m.x.id + ' en ' + m.x.district + ' (' + money(m.x.cur, m.x.price) + ')').join(', ') || 'nuevas opciones pronto') + '. ¿Alguna te interesa para visitarla?'];
      $('#wa-text').textContent = texts[+tpl.value];
    });
  }
  function localInput(ts) { const d = new Date(ts); d.setMinutes(0, 0, 0); d.setHours(Math.max(9, Math.min(18, d.getHours()))); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  function propDrawer(id) {
    const p = prop(id); if (!p) return;
    UI.drawer = { kind: 'prop', id };
    const t = now();
    const o = owner(p.owner);
    const st = propStats(p);
    const d = p.status === 'En captación' ? 0 : Math.floor(((p.soldAt || t) - p.listedAt) / DAY);
    const interested = st.list.slice().sort((a, b) => b.created - a.created);
    const byCamp = p.campaigns.map(cid => { const c = camp(cid); const n = interested.filter(l => l.campaign === cid).length; return '<div class="match"><div><span class="src ' + c.platform + '"><i></i>' + platformLabel(c.platform) + '</span> <button class="link-btn" data-camp="' + c.id + '">' + esc(c.name) + '</button><div class="cell-sub">' + esc(c.objective) + ' · ' + c.status + '</div></div><span class="mono small">' + n + ' leads</span></div>'; }).join('');
    const other = interested.filter(l => !l.campaign).length;
    const suggestion = p.status === 'Disponible' && d > 90
      ? 'Lleva ' + d + ' días en venta con ' + st.visits + ' visitas. Sugerencia: revisar precio (' + (p.priceChanges.length ? 'ya tuvo ' + p.priceChanges.length + ' ajuste' : 'sin ajustes hasta hoy') + '), renovar fotos y video, y probar una campaña de TikTok con recorrido.'
      : p.status === 'Disponible' && st.leads > 10 && st.visits < 3 ? 'Mucho interés y pocas visitas: revisar si el precio publicado en los anuncios coincide con la ficha y reforzar el seguimiento.' : '';
    const report = 'Hola ' + o.name.split(' ')[0] + ', le compartimos el avance de su ' + p.type.toLowerCase() + ' ' + p.id + ' (' + p.address + '):\n\n' +
      '• Días publicado: ' + d + '\n• Vistas del anuncio (web, portales y redes): ' + num(p.views) + '\n• Personas interesadas: ' + st.leads + ' (' + st.leads7 + ' esta semana)\n• Visitas realizadas: ' + st.visits + '\n• Ofertas recibidas: ' + st.offers + '\n' +
      (p.campaigns.length ? '• Campañas activas: ' + p.campaigns.map(c => platformLabel(camp(c).platform) + ' «' + camp(c).name + '»').join(', ') + '\n' : '') +
      '\nQuedamos atentos a sus comentarios.\nInmoconecta Huancayo';
    const html = '<div class="dr-head"><div class="top-row"><div><div class="eyebrow">' + p.id + ' · ' + esc(p.op) + '</div><h2 id="dr-title">' + esc(p.type) + ' en ' + esc(p.district) + '</h2><div class="small muted" style="margin-top:4px">' + esc(p.address) + '</div></div>' + closeBtn + '</div>' +
      '<div class="row-flex"><span class="price" style="font-family:var(--font-display);font-size:22px;font-weight:700">' + money(p.cur, p.price) + (p.op === 'Alquiler' ? '<span class="small muted"> /mes</span>' : '') + '</span><span class="pill ' + (p.status === 'Disponible' ? 'accent' : p.status === 'Vendida' ? 'ok' : 'gold') + '">' + esc(p.status) + '</span>' + (p.status === 'Disponible' ? domPill(d) : '') + (p.exclusive ? '<span class="pill">Exclusiva</span>' : '') + '</div></div>' +
      '<div class="dr-body">' +
      (suggestion ? '<div class="insight gold">' + ic('bulb') + '<div>' + esc(suggestion) + '</div></div>' : '') +
      '<div class="ph" style="border-radius:12px">' + propArt(p) + '</div>' +
      '<div class="panel"><h3>Ficha</h3><dl class="kv"><div><dt>Área</dt><dd>' + p.area + ' m²' + (p.land ? ' · terreno ' + p.land + ' m²' : '') + '</dd></div><div><dt>Ambientes</dt><dd>' + (p.beds ? p.beds + ' dorm. · ' : '') + (p.baths ? p.baths + ' baños' : '—') + (p.parking ? ' · ' + p.parking + ' cochera(s)' : '') + '</dd></div><div><dt>Publicado desde</dt><dd>' + (p.status === 'En captación' ? 'Aún no publicado' : fd(p.listedAt)) + '</dd></div><div><dt>Comisión</dt><dd>' + (p.commissionNote || p.commission + '%') + ' · S/ ' + num(commissionSoles(p)) + '</dd></div>' + (p.soldAt ? '<div><dt>Vendida</dt><dd>' + fd(p.soldAt) + ' · en ' + d + ' días</dd></div>' : '') + (p.units ? '<div><dt>Lotes</dt><dd>' + p.unitsSold + ' vendidos de ' + p.units + '</dd></div>' : '') + '</dl></div>' +
      '<div class="panel"><h3>Propietario</h3><div class="who"><span class="avatar">' + esc(o.name.split(' ').map(x => x[0]).slice(0, 2).join('')) + '</span><div><div class="cell-main">' + esc(o.name) + '</div><div class="cell-sub mono">' + esc(o.phone) + '</div></div></div><div class="small muted">Cliente desde ' + fd(o.sinceAt) + ' · último reporte ' + ago(o.lastReport) + '</div></div>' +
      '<div class="panel"><div class="panel-head"><h3>Rendimiento</h3><span class="hint">Desde que se publicó</span></div><div class="kv"><div><dt>Vistas</dt><dd class="mono">' + num(p.views) + '</dd></div><div><dt>Leads</dt><dd class="mono">' + st.leads + ' <span class="small muted">(' + st.leads7 + ' esta semana)</span></dd></div><div><dt>Visitas</dt><dd class="mono">' + st.visits + '</dd></div><div><dt>Ofertas</dt><dd class="mono">' + st.offers + '</dd></div></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>Campañas donde aparece</h3><span class="hint">' + (other ? other + ' leads llegaron por otros canales' : '') + '</span></div>' + (byCamp || '<div class="small muted">No está en ninguna campaña pagada.</div>') + '</div>' +
      (p.priceChanges.length ? '<div class="panel"><h3>Historial de precio</h3>' + p.priceChanges.map(c => '<div class="match"><span class="small">' + fd(c.at) + '</span><span class="mono small">' + money(p.cur, c.from) + ' → ' + money(p.cur, c.to) + '</span></div>').join('') + '</div>' : '') +
      '<div class="panel"><div class="panel-head"><h3>Interesados</h3><span class="hint">' + interested.length + ' en total</span></div>' + (interested.slice(0, 8).map(l => '<div class="match"><div><button class="link-btn" data-lead="' + l.id + '">' + esc(l.name) + '</button><div class="cell-sub">' + srcTag(l) + ' · ' + ago(l.created) + '</div></div>' + stageTag(l.stage) + '</div>').join('') || '<div class="small muted">Todavía no hay interesados.</div>') + '</div>' +
      '<div class="panel"><div class="panel-head"><h3>Reporte semanal para el propietario</h3><button class="btn sm" data-act="copy-report">' + ic('copy') + ' Copiar</button></div><div class="report" id="report-text">' + esc(report) + '</div><div class="small muted">Se envía solo cada lunes por WhatsApp y correo.</div></div>' +
      '</div>';
    openDrawer(html);
  }

  function campDrawer(id) {
    const c = camp(id); if (!c) return;
    UI.drawer = { kind: 'camp', id };
    const s = campStats(c);
    const steps = funnelData(s.list);
    const html = '<div class="dr-head"><div class="top-row"><div><div class="eyebrow">' + platformLabel(c.platform) + ' · ' + esc(c.objective) + '</div><h2 id="dr-title">' + esc(c.name) + '</h2><div class="small muted" style="margin-top:4px">Formulario «' + esc(c.form) + '» · ' + c.days + ' días activa</div></div>' + closeBtn + '</div></div>' +
      '<div class="dr-body"><div class="kv panel"><div><dt>Inversión</dt><dd class="mono">S/ ' + num(c.spend) + '</dd></div><div><dt>Impresiones</dt><dd class="mono">' + num(c.impressions) + '</dd></div><div><dt>Leads</dt><dd class="mono">' + s.leads + ' · CPL S/ ' + (c.spend / Math.max(1, s.leads)).toFixed(2) + '</dd></div><div><dt>Cierres</dt><dd class="mono">' + s.won + ' · S/ ' + num(s.comm) + '</dd></div></div>' +
      '<div class="panel"><h3>Embudo de esta campaña</h3>' + funnelHTML(steps, true) + '</div>' +
      '<div class="panel"><h3>Propiedades anunciadas</h3>' + c.props.map(pid => { const p = prop(pid); return '<div class="match"><div><button class="link-btn" data-prop="' + p.id + '">' + p.id + ' · ' + esc(p.type) + ' · ' + esc(p.district) + '</button><div class="cell-sub">' + esc(p.status) + '</div></div><span class="mono small">' + s.list.filter(l => l.interest === pid).length + ' leads</span></div>'; }).join('') + '</div>' +
      '<div class="panel"><h3>Leads recientes</h3>' + s.list.slice(0, 10).map(l => '<div class="match"><div><button class="link-btn" data-lead="' + l.id + '">' + esc(l.name) + '</button><div class="cell-sub">' + ago(l.created) + ' · ' + esc(agentName(l.agent)) + '</div></div>' + stageTag(l.stage) + '</div>').join('') + '</div></div>';
    openDrawer(html);
  }

  function captDrawer(id) {
    const k = S.captacion.find(x => x.id === id); if (!k) return;
    UI.drawer = { kind: 'capt', id };
    const i = D.CAPT_STAGES.findIndex(s => s.id === k.stage);
    const next = D.CAPT_STAGES[i + 1];
    const html = '<div class="dr-head"><div class="top-row"><div><div class="eyebrow">Captación · ' + esc(D.CAPT_STAGES[i].label) + '</div><h2 id="dr-title">' + esc(captName(k)) + '</h2><div class="small mono" style="margin-top:4px">' + esc(captPhone(k)) + '</div></div>' + closeBtn + '</div>' +
      '<div class="dr-actions">' + (next ? '<button class="btn sm primary" data-act="capt-next" data-id="' + k.id + '">Mover a «' + next.label + '»</button>' : '') + (k.prop ? '<button class="btn sm" data-prop="' + k.prop + '">Ver propiedad ' + k.prop + '</button>' : '') + '</div></div>' +
      '<div class="dr-body"><div class="journey">' + D.CAPT_STAGES.map((s, j) => '<div class="' + (j < i ? 'done' : j === i ? 'cur' : '') + '"><div class="seg-bar"></div><span>' + s.label + '</span></div>').join('') + '</div>' +
      '<div class="panel"><h3>Inmueble</h3><dl class="kv"><div><dt>Dirección</dt><dd>' + esc(k.address) + '</dd></div><div><dt>Tipo</dt><dd>' + esc(k.type) + '</dd></div><div><dt>Precio esperado</dt><dd>' + esc(k.expected) + '</dd></div><div><dt>Origen</dt><dd>' + esc(camp(k.src) ? 'Campaña «' + camp(k.src).name + '»' : D.SOURCES[k.src] ? D.SOURCES[k.src].label : k.src) + '</dd></div><div><dt>Asesor</dt><dd>' + esc(agentName(k.agent)) + '</dd></div><div><dt>Ingresó</dt><dd>' + fdt(k.created) + '</dd></div>' + (k.visit ? '<div><dt>Tasación</dt><dd>' + fdt(k.visit) + '</dd></div>' : '') + '</dl></div>' +
      '<div class="panel"><h3>Notas</h3><p class="small">' + esc(k.note) + '</p></div>' +
      '<div class="panel"><h3>Qué sigue en captación</h3><ul class="small" style="margin:0;padding-left:18px"><li>Tasación con comparables de la zona</li><li>Contrato de exclusividad firmado en línea</li><li>Sesión de fotos y video para TikTok y Reels</li><li>Publicación en web, portales y campaña</li><li>Reporte semanal automático al propietario</li></ul></div></div>';
    openDrawer(html);
  }

  function formDrawer(kind) {
    UI.drawer = { kind: 'form', id: kind };
    const opt = (v, l) => '<option value="' + v + '">' + esc(l) + '</option>';
    let body = '';
    let title = '';
    if (kind === 'lead') {
      title = 'Nuevo lead';
      body = '<div class="form-row"><div class="field"><label for="nl-name">Nombre</label><input id="nl-name" required placeholder="Nombre y apellidos"></div><div class="field"><label for="nl-phone">Teléfono</label><input id="nl-phone" required placeholder="+51 9…"></div></div>' +
        '<div class="form-row"><div class="field"><label for="nl-src">Origen</label><select id="nl-src">' + Object.keys(D.SOURCES).map(k => opt(k, D.SOURCES[k].label)).join('') + '</select></div><div class="field"><label for="nl-prop">Interés</label><select id="nl-prop">' + S.properties.filter(p => p.status === 'Disponible').map(p => opt(p.id, p.id + ' · ' + p.type + ' · ' + p.district)).join('') + '</select></div></div>' +
        '<div class="form-row"><div class="field"><label for="nl-pago">Forma de pago</label><select id="nl-pago">' + D.PAGO.map(x => opt(x, x)).join('') + '</select></div><div class="field"><label for="nl-plazo">¿Cuándo compra?</label><select id="nl-plazo">' + D.PLAZO.map(x => opt(x, x)).join('') + '</select></div></div>' +
        '<div class="field"><label for="nl-agent">Asesor</label><select id="nl-agent"><option value="">Automático (turno rotativo)</option>' + S.agents.map(a => opt(a.id, agentName(a.id))).join('') + '</select></div>';
    } else if (kind === 'prop') {
      title = 'Agregar propiedad';
      body = '<div class="form-row"><div class="field"><label for="np-type">Tipo</label><select id="np-type">' + ['Departamento', 'Casa', 'Terreno', 'Local comercial', 'Oficina', 'Casa de campo'].map(x => opt(x, x)).join('') + '</select></div><div class="field"><label for="np-op">Operación</label><select id="np-op">' + opt('Venta', 'Venta') + opt('Alquiler', 'Alquiler') + '</select></div></div>' +
        '<div class="form-row"><div class="field"><label for="np-district">Distrito</label><select id="np-district">' + ['Huancayo', 'El Tambo', 'Chilca', 'Pilcomayo', 'Huancán', 'San Agustín de Cajas', 'Sapallanga', 'Concepción', 'Chupaca'].map(x => opt(x, x)).join('') + '</select></div><div class="field"><label for="np-address">Dirección</label><input id="np-address" required placeholder="Jr. / Av. …"></div></div>' +
        '<div class="form-row"><div class="field"><label for="np-price">Precio</label><input id="np-price" type="number" min="0" required placeholder="95000"></div><div class="field"><label for="np-cur">Moneda</label><select id="np-cur">' + opt('US$', 'US$') + opt('S/', 'S/') + '</select></div></div>' +
        '<div class="form-row"><div class="field"><label for="np-area">Área (m²)</label><input id="np-area" type="number" min="0" value="100"></div><div class="field"><label for="np-beds">Dormitorios</label><input id="np-beds" type="number" min="0" value="3"></div></div>' +
        '<div class="field"><label for="np-owner">Propietario</label><select id="np-owner">' + S.owners.map(o => opt(o.id, o.name)).join('') + '</select></div>' +
        '<div class="field"><label>Campañas</label><div class="stack">' + S.campaigns.filter(c => !c.sellers).map(c => '<label class="check"><input type="checkbox" value="' + c.id + '" class="np-camp"> ' + platformLabel(c.platform) + ' · ' + esc(c.name) + '</label>').join('') + '</div></div>';
    } else {
      title = 'Registrar propietario';
      body = '<div class="form-row"><div class="field"><label for="nc-name">Nombre</label><input id="nc-name" required></div><div class="field"><label for="nc-phone">Teléfono</label><input id="nc-phone" required placeholder="+51 9…"></div></div>' +
        '<div class="form-row"><div class="field"><label for="nc-type">Tipo de inmueble</label><select id="nc-type">' + ['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Oficina'].map(x => opt(x, x)).join('') + '</select></div><div class="field"><label for="nc-exp">Precio que espera</label><input id="nc-exp" placeholder="US$ 100,000"></div></div>' +
        '<div class="field"><label for="nc-addr">Dirección</label><input id="nc-addr" required></div>';
    }
    openDrawer('<div class="dr-head"><div class="top-row"><h2 id="dr-title">' + title + '</h2>' + closeBtn + '</div></div><div class="dr-body"><form class="form panel" id="dr-form" novalidate>' + body + '<div class="row-flex"><button class="btn primary" type="submit">Guardar</button><button class="btn ghost" type="button" data-act="close">Cancelar</button><span class="small muted" id="form-err" role="alert"></span></div></form></div>');
    $('#dr-form').addEventListener('submit', e => { e.preventDefault(); submitForm(kind); });
  }

  function submitForm(kind) {
    const v = id => ($('#' + id) || {}).value || '';
    const err = m => { $('#form-err').textContent = m; };
    const t = now();
    if (kind === 'lead') {
      if (!v('nl-name').trim() || !v('nl-phone').trim()) return err('Completa nombre y teléfono.');
      const p = prop(v('nl-prop'));
      const ag = v('nl-agent') || nextOnDuty().id;
      const l = { id: 'L-' + (1000 + S.seq++), name: v('nl-name').trim(), phone: v('nl-phone').trim(), email: '—', src: v('nl-src'), portal: null, campaign: null, adset: null, ad: null, interest: p.id, budget: p.price, cur: p.cur, plazo: v('nl-plazo'), pago: v('nl-pago'), zona: p.district, agent: ag, created: t, firstResponse: null, history: [{ stage: 'nuevo', at: t }], stage: 'nuevo', lossReason: null, lostAt: null, visitAt: null, visitConfirmed: false, events: [{ at: t, type: 'in', text: 'Registrado manualmente · ' + D.SOURCES[v('nl-src')].label, by: null }, { at: t + 1, type: 'auto', text: 'Asignado a ' + agentName(ag), by: null }], tasks: [] };
      l.score = D.scoreLead(l);
      S.leads.unshift(l); save(); closeDrawer(); render(); toast('Lead creado', l.name + ' · asignado a ' + agentName(ag), l.id);
    } else if (kind === 'prop') {
      if (!v('np-address').trim() || !(+v('np-price') > 0)) return err('Completa dirección y precio.');
      const n = S.properties.length + 101;
      const p = { id: 'INC-' + n, type: v('np-type'), op: v('np-op'), district: v('np-district'), address: v('np-address').trim(), cur: v('np-cur'), price: +v('np-price'), priceHist: [], priceChanges: [], area: +v('np-area') || 0, beds: +v('np-beds') || 0, baths: 1, owner: v('np-owner'), listed: 0, listedAt: t, status: 'Disponible', exclusive: true, commission: v('np-op') === 'Venta' ? 3 : 100, commissionNote: v('np-op') === 'Alquiler' ? '1 mes de renta' : null, campaigns: $$('.np-camp:checked').map(x => x.value), hue: Math.floor(Math.random() * 360), views: 0 };
      S.properties.push(p);
      p.campaigns.forEach(cid => camp(cid).props.push(p.id));
      save(); closeDrawer(); render(); toast('Propiedad agregada', p.id + ' ya está en el stock' + (p.campaigns.length ? ' y en ' + p.campaigns.length + ' campaña(s)' : ''));
    } else {
      if (!v('nc-name').trim() || !v('nc-phone').trim() || !v('nc-addr').trim()) return err('Completa nombre, teléfono y dirección.');
      S.captacion.unshift({ id: 'k' + (S.captacion.length + 10), owner: null, name: v('nc-name').trim(), phone: v('nc-phone').trim(), address: v('nc-addr').trim(), type: v('nc-type'), expected: v('nc-exp') || 'Por tasar', stage: 'solicitud', src: 'ref', created: t, note: 'Registrado manualmente', agent: nextOnDuty().id });
      save(); closeDrawer(); render(); toast('Propietario registrado', 'Aparece en «Solicitud de venta».');
    }
  }

  /* ================= Acciones ================= */
  function log(text) { S.log = S.log || []; S.log.push({ at: now(), text }); if (S.log.length > 60) S.log.shift(); }
  function nextOnDuty() {
    const pool = S.agents.filter(a => a.rr && a.onDuty);
    const list = pool.length ? pool : S.agents.filter(a => a.rr);
    S.rr = ((S.rr || 0) + 1) % list.length;
    return list[S.rr];
  }
  function addEvent(l, type, text, by) { l.events.push({ at: now(), type, text, by: by || null }); }
  function refreshAfter(l) {
    l.score = D.scoreLead(l);
    save();
    if (UI.drawer && UI.drawer.kind === 'lead' && UI.drawer.id === l.id) leadDrawer(l.id, '');
    rerenderSoft();
  }
  function setStage(l, stage) {
    if (!l || l.stage === stage) return;
    const t = now();
    if (stage === 'perdido') { leadDrawer(l.id, 'lost'); return; }
    if (!l.firstResponse && stage !== 'nuevo') l.firstResponse = t;
    l.stage = stage; l.lossReason = null; l.lostStage = null;
    l.history.push({ stage, at: t });
    addEvent(l, stage === 'ganado' ? 'win' : 'note', 'Movido a «' + stageLabel(stage) + '»', 'a1');
    if (['calificado', 'visita', 'separacion'].includes(stage) && S.automations.find(a => a.key === 'capi').on) { log('Conversión «' + stageLabel(stage) + '» de ' + l.name + ' enviada a ' + (group(l.src) === 'tiktok' ? 'TikTok Events API' : 'Meta Conversions API')); }
    toast(l.name, 'Ahora en «' + stageLabel(stage) + '»' + (stage === 'ganado' ? ' · ¡felicitaciones!' : ''));
    refreshAfter(l);
  }
  function reassign(l, to, why) {
    if (!to || l.agent === to) return;
    const from = l.agent;
    l.agent = to;
    addEvent(l, 'auto', 'Reasignado de ' + agentName(from) + ' a ' + agentName(to) + (why === 'sla' ? ' (15 min sin respuesta)' : ''), why === 'manual' ? 'a1' : null);
    if (why !== 'sla') toast('Lead reasignado', l.name + ' → ' + agentName(to));
    refreshAfter(l);
  }
  function registerCall(l) {
    const t = now();
    const first = !l.firstResponse;
    if (first) l.firstResponse = t;
    addEvent(l, 'call', first ? 'Primera llamada · respondió a los ' + dur(t - l.created).trim() : 'Llamada de seguimiento', l.agent);
    if (l.stage === 'nuevo') { l.stage = 'contactado'; l.history.push({ stage: 'contactado', at: t }); }
    toast('Llamada registrada', l.name + (first ? ' · primera respuesta en ' + dur(t - l.created).trim() : ''));
    refreshAfter(l);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a && a.tagName !== 'SELECT') {
      const act = a.dataset.act;
      const l = a.dataset.id ? lead(a.dataset.id) : null;
      if (act === 'close') return closeDrawer();
      if (act === 'attend') return leadDrawer(l.id, '');
      if (act === 'wa') return leadDrawer(l.id, 'wa');
      if (act === 'panel') return leadDrawer(l.id, a.dataset.p);
      if (act === 'call') return registerCall(l);
      if (act === 'wa-send') {
        const first = !l.firstResponse; if (first) l.firstResponse = now();
        addEvent(l, 'wa', 'WhatsApp enviado: «' + $('#wa-text').textContent.slice(0, 70) + '…»', l.agent);
        toast('WhatsApp registrado', l.name); UI.drawer.panel = ''; return refreshAfter(l);
      }
      if (act === 'visit-save') {
        const when = new Date($('#v-date').value).getTime(); const pid = $('#v-prop').value;
        if (!when) return;
        l.visitAt = when; l.visitConfirmed = false; l.interest = pid;
        if (!l.firstResponse) l.firstResponse = now();
        if (stageIdx(l.stage) < 3 || l.stage === 'perdido') { l.stage = 'visita'; l.history.push({ stage: 'visita', at: now() }); }
        addEvent(l, 'visit', 'Visita agendada a ' + pid + ' para ' + fdt(when), l.agent);
        log('Recordatorios de visita programados para ' + l.name + ' (24 h y 2 h antes)');
        toast('Visita agendada', fdt(when) + ' · recordatorio automático por WhatsApp'); return refreshAfter(l);
      }
      if (act === 'confirm-visit') { l.visitConfirmed = true; addEvent(l, 'wa', 'Cliente confirmó la visita por WhatsApp', null); toast('Visita confirmada', l.name); return refreshAfter(l); }
      if (act === 'lost-save') {
        const r = $('#lost-r').value; const t = now();
        l.lostStage = l.stage === 'perdido' ? l.lostStage : l.stage; l.stage = 'perdido'; l.lossReason = r; l.lostAt = t; l.history.push({ stage: 'perdido', at: t });
        addEvent(l, 'lost', 'Marcado como perdido: ' + r, 'a1'); toast('Lead perdido', r + ' · queda registrado para el análisis'); return refreshAfter(l);
      }
      if (act === 'note-save') { const tx = $('#note-t').value.trim(); if (!tx) return; addEvent(l, 'note', tx, 'a1'); toast('Nota guardada', l.name); return refreshAfter(l); }
      if (act === 'new-lead') return formDrawer('lead');
      if (act === 'new-prop') return formDrawer('prop');
      if (act === 'new-capt') return formDrawer('capt');
      if (act === 'capt-next') {
        const k = S.captacion.find(x => x.id === a.dataset.id);
        const i = D.CAPT_STAGES.findIndex(s => s.id === k.stage);
        k.stage = D.CAPT_STAGES[i + 1].id;
        if (k.stage === 'agendada' && !k.visit) { const d = new Date(now() + DAY); d.setHours(11, 0, 0, 0); k.visit = d.getTime(); }
        save(); toast('Captación actualizada', captName(k) + ' → ' + D.CAPT_STAGES[i + 1].label); captDrawer(k.id); return rerenderSoft();
      }
      if (act === 'copy-report') {
        const txt = $('#report-text').textContent;
        const done = () => toast('Reporte copiado', 'Listo para pegar en WhatsApp o correo');
        try { navigator.clipboard.writeText(txt).then(done, () => selectText($('#report-text'))); } catch (x) { selectText($('#report-text')); }
        return;
      }
      if (act === 'open-lead') { closeToast(a); return leadDrawer(a.dataset.id, ''); }
    }
    const el = e.target.closest('[data-lead],[data-prop],[data-camp],[data-capt]');
    if (el && !e.target.closest('select')) {
      if (el.dataset.lead) return leadDrawer(el.dataset.lead, '');
      if (el.dataset.prop) return propDrawer(el.dataset.prop);
      if (el.dataset.camp) return campDrawer(el.dataset.camp);
      if (el.dataset.capt) return captDrawer(el.dataset.capt);
    }
  });
  document.addEventListener('change', e => {
    const s = e.target.closest('select[data-act="reassign"]');
    if (s && s.value) reassign(lead(s.dataset.id), s.value, 'manual');
  });
  function selectText(el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texto seleccionado', 'Cópialo con Ctrl+C o mantén presionado'); }

  /* ================= Toasts ================= */
  function toast(title, text, leadId) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="tico">' + ic(leadId ? 'in' : 'win') + '</span><div><b>' + esc(title) + '</b><small>' + esc(text) + '</small>' + (leadId ? '<br><button data-act="open-lead" data-id="' + leadId + '">Atender ahora</button>' : '') + '</div>';
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), leadId ? 9000 : 4200);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  }
  function closeToast(el) { const t = el.closest('.toast'); if (t) t.remove(); }

  /* ================= Tiempo real ================= */
  function tickTimers() {
    const t = now();
    $$('[data-since]').forEach(el => {
      const ms = t - +el.dataset.since;
      el.textContent = el.dataset.fmt === 'dur' ? dur(ms).trim() : timer(ms);
      if (el.classList.contains('wait')) { el.classList.remove('ok', 'warn', 'crit'); el.classList.add(sev(ms / MIN)); }
    });
  }
  function simulateLead() {
    const t = now();
    const l = D.incoming(S, t);
    const on = S.agents.filter(a => a.rr && a.onDuty);
    if (on.length) l.agent = nextOnDuty().id;
    l.events = l.events.filter(e => e.type === 'in');
    l.events.push({ at: t + 1, type: 'auto', text: 'Asignado a ' + agentName(l.agent) + ' por turno rotativo', by: null });
    S.leads.unshift(l);
    const c = camp(l.campaign);
    log('Lead ' + l.id + ' de ' + D.SOURCES[l.src].label + ' asignado a ' + agentName(l.agent) + ' por turno rotativo');
    S.automations.forEach(a => { if (a.key === 'assign' || a.key === 'welcome') a.runs++; });
    setTimeout(() => { const x = lead(l.id); if (x && S.automations.find(a => a.key === 'welcome').on) { x.events.push({ at: now(), type: 'auto', text: 'WhatsApp de bienvenida enviado con la ficha de ' + x.interest, by: null }); log('WhatsApp de bienvenida enviado a ' + x.name + ' en 12 s'); save(); if (UI.drawer && UI.drawer.id === x.id) leadDrawer(x.id, UI.drawer.panel); } }, 12000);
    save();
    toast('Nuevo lead · ' + D.SOURCES[l.src].label, l.name + (c ? ' · «' + c.name + '»' : '') + ' → ' + agentName(l.agent), l.id);
    rerenderSoft();
  }
  // Reglas de tiempo de respuesta (se disparan cuando un lead cruza el umbral mientras la demo está abierta)
  function slaCheck() {
    const t = now(); const prev = UI.lastTick; UI.lastTick = t;
    const sla = S.automations.find(a => a.key === 'sla');
    if (!sla.on) return;
    S.leads.filter(unattended).forEach(l => {
      const crossed = m => l.created + m * MIN > prev && l.created + m * MIN <= t;
      if (crossed(5)) { log('Alerta a ' + agentName(l.agent) + ': ' + l.name + ' lleva 5 min sin respuesta'); toast('5 min sin respuesta', l.name + ' · se avisó a ' + agentName(l.agent), l.id); sla.runs++; }
      if (crossed(15)) { const to = S.agents.filter(a => a.rr && a.onDuty && a.id !== l.agent)[0]; if (to) { log(l.name + ' reasignado a ' + agentName(to.id) + ' por falta de respuesta'); reassign(l, to.id, 'sla'); toast('Reasignado automáticamente', l.name + ' → ' + agentName(to.id), l.id); sla.runs++; } }
      if (crossed(30)) { log('Escalado a Alberto: ' + l.name + ' lleva 30 min sin respuesta'); addEvent(l, 'auto', 'Escalado a Alberto (30 min sin respuesta)'); toast('Escalado a Alberto', l.name + ' lleva 30 min esperando', l.id); sla.runs++; save(); }
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

  /* ================= Búsqueda global ================= */
  function search(q) {
    const box = $('#search-results');
    q = q.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    const ls = S.leads.filter(l => (l.name + ' ' + l.phone + ' ' + l.id).toLowerCase().includes(q)).slice(0, 6);
    const ps = S.properties.filter(p => (p.id + ' ' + p.address + ' ' + p.district + ' ' + p.type).toLowerCase().includes(q)).slice(0, 4);
    const os = S.owners.filter(o => o.name.toLowerCase().includes(q)).slice(0, 3);
    box.innerHTML = (ls.map(l => '<button data-lead="' + l.id + '"><span class="avatar sm">' + ic('leads') + '</span><span><b>' + esc(l.name) + '</b><br><span class="small muted">' + l.id + ' · ' + esc(stageLabel(l.stage)) + '</span></span></button>').join('') +
      ps.map(p => '<button data-prop="' + p.id + '"><span class="avatar sm">' + ic('home') + '</span><span><b>' + p.id + ' · ' + esc(p.type) + '</b><br><span class="small muted">' + esc(p.address) + '</span></span></button>').join('') +
      os.map(o => { const p = S.properties.find(x => x.owner === o.id); return p ? '<button data-prop="' + p.id + '"><span class="avatar sm">' + ic('key') + '</span><span><b>' + esc(o.name) + '</b><br><span class="small muted">Propietario · ' + p.id + '</span></span></button>' : ''; }).join('')) || '<div class="empty">Sin resultados para «' + esc(q) + '»</div>';
    box.hidden = false;
  }

  /* ================= Arranque ================= */
  function init() {
    $('#menu-btn').innerHTML = ic('menu');
    $('#search-ic').innerHTML = ic('search');
    $('#global-search').addEventListener('input', e => search(e.target.value));
    $('#global-search').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; search(''); } });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) $('#search-results').hidden = true; else if (e.target.closest('#search-results button')) { $('#search-results').hidden = true; $('#global-search').value = ''; } });
    $('#sim-lead').addEventListener('click', simulateLead);
    const lt = $('#live-toggle');
    lt.setAttribute('role', 'button'); lt.tabIndex = 0;
    lt.addEventListener('click', () => { setLive(!UI.live); toast(UI.live ? 'Modo en vivo activado' : 'Modo en vivo pausado', UI.live ? 'Entrará un lead simulado cada 45 segundos' : 'Puedes seguir simulando con el botón'); });
    lt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lt.click(); } });
    $('#reset-demo').addEventListener('click', () => { S = fresh(); save(); closeDrawer(); render(); toast('Demo reiniciada', 'Datos de ejemplo restaurados'); });
    $('#scrim').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.drawer) closeDrawer(); });
    $('#menu-btn').addEventListener('click', () => $('#side').classList.toggle('open'));
    $('#nav').addEventListener('click', e => { if (e.target.closest('a')) $('#side').classList.remove('open'); });
    window.addEventListener('hashchange', () => { closeDrawer(); render(); $('#view').scrollTop = 0; });
    setLive(UI.live);
    render();
    setInterval(tickTimers, 1000);
    setInterval(slaCheck, 3000);
    setInterval(() => { if (!UI.drawer) rerenderSoft(); else renderNav(); }, 60000);
  }
  init();
})();
