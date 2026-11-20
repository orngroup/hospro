/* ============================================================
   HosREV — Revenue Management (Phase 1 shell, demo data)
   Brandon Hall Hotel & Spa — brandon.hospro.co.uk/business
   Lives inside HosBUSINESS as the pf-rev tab.

   What this file does
   -------------------
   - Renders 7 views inside #pf-rev: Dashboard, Calendar, Compset,
     Trend, Events, Forecast, Settings.
   - Uses clearly-flagged DEMO data until two feeds land:
       1) Guestline on-books per night per room type  (replaces CSV upload)
       2) SerpApi Google Hotels comp-set shopper      (hosrev-comp.json)
   - Pricing engine: Profit(p) = (p(1-c) - v + a) * min(D(p), C)
     with guardrails (floor, ceiling, max daily change, locked dates).
   - Decisions (Approve / Override / Lock) persist in localStorage.
     In Phase 2 these move to Firestore (hosrev_decisions).

   Teal accent: #1F7A8C. Headline: "Maximising net room margin
   across the next 365 nights."  Rates reviewed 2x/day.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function gbp(n, dp) { if (n === null || n === undefined || isNaN(n)) return '–'; return (n < 0 ? '−' : '') + '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function num(n, dp) { if (n === null || n === undefined || isNaN(n)) return '–'; return n.toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function pct(n, dp) { if (n === null || n === undefined || !isFinite(n)) return '–'; return (n * 100).toFixed(dp === undefined ? 0 : dp) + '%'; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function parseISO(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dow(d) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(parseISO(d)).getDay()]; }
  function shortD(d) { var x = parseISO(d); return x.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function round(n, dp) { var m = Math.pow(10, dp || 0); return Math.round(n * m) / m; }
  var TEAL = '#1F7A8C', TEAL_DK = '#145866', NAVY = '#1a2b3a', GOLD = '#BB9979', GREY = '#52514e';

  /* ---------- CSS ---------- */
  function injectCSS() {
    if (document.getElementById('hosrev-css')) return;
    var s = document.createElement('style'); s.id = 'hosrev-css';
    s.textContent = [
      '#pf-rev .rv-wrap{max-width:1680px;margin:0 auto}',
      '#pf-rev .rv-hero{background:linear-gradient(135deg,#1F7A8C 0%,#145866 100%);color:#fff;padding:22px 28px;border-radius:14px;margin-bottom:18px;display:flex;align-items:center;gap:22px;box-shadow:0 4px 14px rgba(20,88,102,.18)}',
      '#pf-rev .rv-hero h2{margin:0;font-size:22px;font-weight:700;letter-spacing:-.2px}',
      '#pf-rev .rv-hero p{margin:4px 0 0;font-size:13.5px;opacity:.9}',
      '#pf-rev .rv-hero .rv-demo{margin-left:auto;background:rgba(255,255,255,.18);padding:7px 14px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.3px;text-transform:uppercase}',
      '#pf-rev .rv-tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:1px solid #e4e2dc;padding-bottom:0;overflow-x:auto}',
      '#pf-rev .rv-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;color:#52514e;font:inherit;font-size:13.5px;font-weight:600;padding:10px 16px;cursor:pointer;white-space:nowrap}',
      '#pf-rev .rv-tabs button:hover{color:#1F7A8C}',
      '#pf-rev .rv-tabs button.on{color:#1F7A8C;border-bottom-color:#1F7A8C}',
      '#pf-rev .rv-card{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:18px 20px;margin-bottom:16px;box-shadow:0 1px 2px rgba(8,16,26,.04)}',
      '#pf-rev .rv-card h3{margin:0 0 4px;font-size:15.5px;font-weight:700;color:#1a2b3a}',
      '#pf-rev .rv-card p.sub{margin:0 0 14px;font-size:12.5px;color:#52514e}',
      '#pf-rev .rv-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px}',
      '#pf-rev .rv-tile{background:#fff;border:1px solid #e4e2dc;border-radius:11px;padding:14px 16px;position:relative;overflow:hidden}',
      '#pf-rev .rv-tile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#1F7A8C}',
      '#pf-rev .rv-tile .l{font-size:11.5px;color:#52514e;text-transform:uppercase;letter-spacing:.35px;font-weight:600}',
      '#pf-rev .rv-tile .v{font-size:24px;font-weight:700;color:#1a2b3a;margin:4px 0 2px;line-height:1.1}',
      '#pf-rev .rv-tile .d{font-size:11.5px;color:#7b8494}',
      '#pf-rev .rv-tile.warn::before{background:#d0362b}',
      '#pf-rev .rv-tile.good::before{background:#1a8f63}',
      '#pf-rev .rv-tile.amber::before{background:#eb6834}',
      '#pf-rev table.rv-t{width:100%;border-collapse:collapse;font-size:13px}',
      '#pf-rev table.rv-t th{background:#f6f4ee;text-align:left;padding:8px 10px;font-weight:600;color:#52514e;border-bottom:1px solid #e4e2dc;font-size:12px;letter-spacing:.2px}',
      '#pf-rev table.rv-t th.n,#pf-rev table.rv-t td.n{text-align:right;font-variant-numeric:tabular-nums}',
      '#pf-rev table.rv-t td{padding:8px 10px;border-bottom:1px solid #f1efe9;vertical-align:middle}',
      '#pf-rev table.rv-t tr:hover td{background:#fafaf6}',
      '#pf-rev table.rv-t tr.sat td,#pf-rev table.rv-t tr.sun td{background:#fdf8ee}',
      '#pf-rev table.rv-t tr.sat:hover td,#pf-rev table.rv-t tr.sun:hover td{background:#fbf2dd}',
      '#pf-rev table.rv-t tr.locked td{background:#f0ecf5}',
      '#pf-rev .rv-why{font-size:11.5px;color:#52514e;line-height:1.4}',
      '#pf-rev .rv-dec{display:inline-flex;gap:4px}',
      '#pf-rev .rv-dec button{border:1px solid #e4e2dc;background:#fff;font:inherit;font-size:11.5px;padding:3px 9px;border-radius:999px;cursor:pointer;color:#52514e}',
      '#pf-rev .rv-dec button:hover{background:#f6f4ee}',
      '#pf-rev .rv-dec button.on{background:#1F7A8C;color:#fff;border-color:#1F7A8C}',
      '#pf-rev .rv-dec button.on.lock{background:#6250d6;border-color:#6250d6}',
      '#pf-rev .rv-dec button.on.over{background:#eb6834;border-color:#eb6834}',
      '#pf-rev .rv-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.2px}',
      '#pf-rev .rv-pill.up{background:#e6f4ee;color:#1a6442}',
      '#pf-rev .rv-pill.dn{background:#fbe9e7;color:#8a1e15}',
      '#pf-rev .rv-pill.flat{background:#f1efe9;color:#52514e}',
      '#pf-rev .rv-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}',
      '@media (max-width:1100px){#pf-rev .rv-grid2{grid-template-columns:1fr}}',
      '#pf-rev .rv-signoff{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fdf8ee;border:1px solid #efe4c7;border-radius:10px;font-size:13px;color:#52514e;margin-top:14px}',
      '#pf-rev .rv-signoff b{color:#1a2b3a}',
      '#pf-rev .rv-roomsel{display:inline-flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}',
      '#pf-rev .rv-roomsel button{background:#fff;border:1px solid #e4e2dc;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;cursor:pointer;color:#52514e}',
      '#pf-rev .rv-roomsel button.on{background:#1F7A8C;color:#fff;border-color:#1F7A8C}',
      '#pf-rev .rv-chartbox{height:340px;position:relative}',
      '#pf-rev .rv-chartbox.sm{height:240px}',
      '#pf-rev .rv-leg{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;font-size:12px;color:#52514e}',
      '#pf-rev .rv-leg span{display:inline-flex;align-items:center;gap:6px}',
      '#pf-rev .rv-leg i{width:14px;height:3px;border-radius:2px;display:inline-block}',
      '#pf-rev .rv-note{font-size:11.5px;color:#7b8494;margin-top:10px;line-height:1.5}',
      '#pf-rev .rv-stars{color:#BB9979;letter-spacing:1px;font-size:13px}',
      '#pf-rev .rv-stars .dim{color:#e4e2dc}',
      '#pf-rev .rv-input{border:1px solid #e4e2dc;background:#fff;border-radius:7px;padding:5px 9px;font:inherit;font-size:13px;width:80px}',
      '#pf-rev .rv-input:focus{outline:2px solid rgba(31,122,140,.25);border-color:#1F7A8C}',
      '#pf-rev .rv-row{display:flex;gap:12px;align-items:center;margin-bottom:10px;font-size:13px}',
      '#pf-rev .rv-row label{font-weight:600;color:#1a2b3a;min-width:220px;display:inline-block}',
      '#pf-rev .rv-row small{color:#7b8494;margin-left:6px}',
      '#pf-rev .rv-badge{display:inline-block;padding:1px 7px;border-radius:5px;font-size:10.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;background:#fdf8ee;color:#9d7d5f;border:1px solid #efe4c7}',
      '#pf-rev .rv-compcell{display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}',
      '#pf-rev .rv-compcell .g{font-size:10.5px;color:#7b8494}',
      '#pf-rev .rv-compcell.us{color:#1a2b3a;font-weight:700}',
      '#pf-rev .rv-eventtype{display:inline-block;padding:2px 8px;background:#f1efe9;border-radius:999px;font-size:11px;color:#52514e}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- state ---------- */
  var STATE_KEY = 'hosrev_v1_state';
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  var UI = { view: 'dash', roomType: 'exec_dbl' };

  function mergeSaved() {
    var st = loadState();
    if (st.settings) {
      Object.keys(st.settings).forEach(function (k) {
        if (k === 'weights' && st.settings.weights) {
          Object.keys(st.settings.weights).forEach(function (w) { SETTINGS.weights[w] = +st.settings.weights[w]; });
        } else { SETTINGS[k] = +st.settings[k]; }
      });
    }
    if (st.compWeights) {
      COMP_SET.forEach(function (c) { if (st.compWeights[c.id] != null) c.weight = +st.compWeights[c.id]; });
    }
  }
  function persistSettings() {
    var st = loadState();
    st.settings = {
      commission: SETTINGS.commission, variable: SETTINGS.variable,
      ancillary: SETTINGS.ancillary,   maxDailyChange: SETTINGS.maxDailyChange,
      weights: {
        comp: SETTINGS.weights.comp, forecast: SETTINGS.weights.forecast,
        events: SETTINGS.weights.events, pickup: SETTINGS.weights.pickup
      }
    };
    saveState(st);
  }
  function persistCompWeights() {
    var st = loadState();
    st.compWeights = {};
    COMP_SET.forEach(function (c) { st.compWeights[c.id] = c.weight; });
    saveState(st);
  }
  function bustCache() { NIGHTS = null; }

  /* ---------- room types & settings (demo defaults from the brief) ---------- */
  var ROOM_TYPES = [
    { id: 'classic_dbl', label: 'Classic double',             cat: 'double',     exec: false, suppl: 0,  rooms: 25, floor: 69, ceiling: 180, bar: 157 },
    { id: 'classic_twn', label: 'Classic twin',               cat: 'twin',       exec: false, suppl: 0,  rooms: 21, floor: 69, ceiling: 180, bar: 157 },
    { id: 'exec_dbl',    label: 'Executive double',           cat: 'double',     exec: true,  suppl: 15, rooms: 48, floor: 69, ceiling: 180, bar: 172 },
    { id: 'exec_dbl_a',  label: 'Executive double accessible',cat: 'accessible', exec: true,  suppl: 15, rooms: 3,  floor: 69, ceiling: 180, bar: 172 },
    { id: 'exec_trp',    label: 'Executive triple',           cat: 'double',     exec: true,  suppl: 15, rooms: 5,  floor: 69, ceiling: 180, bar: 172 },
    { id: 'exec_twn',    label: 'Executive twin',             cat: 'twin',       exec: true,  suppl: 15, rooms: 5,  floor: 69, ceiling: 180, bar: 172 },
    { id: 'exec_twn_a',  label: 'Executive twin accessible',  cat: 'twin',       exec: true,  suppl: 15, rooms: 1,  floor: 69, ceiling: 180, bar: 172 },
    { id: 'jr_suite',    label: 'Junior Suite',               cat: 'suite',      exec: true,  suppl: 15, rooms: 4,  floor: 69, ceiling: 220, bar: 257 },
    { id: 'priv_dbl',    label: 'Privilege double',           cat: 'double',     exec: false, suppl: 0,  rooms: 8,  floor: 69, ceiling: 180, bar: 192 }
  ];
  var SETTINGS = {
    commission: 0.14,      // c — channel cost (OTA + payment)
    variable: 18,          // v — cost per occupied room (hskp, laundry, utilities)
    ancillary: 14,         // a — ancillary value per room (bkfst upsell, F&B spill)
    maxDailyChange: 15,    // £ guardrail
    weights: { comp: 4, forecast: 4, events: 2, pickup: 3 }  // 1-5
  };

  /* ---------- comp set ---------- */
  var COMP_SET = [
    { id: 'coombe',   label: 'Coombe Abbey',               weight: 5, base: 185 },
    { id: 'dthilton', label: 'DoubleTree by Hilton Coventry',weight:4, base: 142 },
    { id: 'windmill', label: 'Windmill Village',           weight: 4, base: 128 },
    { id: 'ramada',   label: 'Ramada',                     weight: 3, base: 95  },
    { id: 'chesford', label: 'Chesford Grange',            weight: 4, base: 134 },
    { id: 'nailcote', label: 'Nailcote Hall',              weight: 3, base: 149 },
    { id: 'mallory',  label: 'Mallory Court',              weight: 2, base: 215 }
  ];

  /* ---------- demand curve (simple logistic — demo only) ---------- */
  /* D(p) returns expected rooms sold for a candidate price.
     Elasticity is softer for a strong-demand night (high forecast occ)
     and sharper for a soft night, so recommendations bend the way they should. */
  function demandAt(p, baseOcc, compRef, capacity) {
    var ref = compRef || 140;
    // price position vs reference — amplified/damped by the comp-weight setting
    var compW = (SETTINGS.weights.comp || 3) / 3;    // 1→0.33, 5→1.67
    var position = (p - ref) / ref * compW;
    // elasticity: softer when forecast occupancy signal is weighted less
    var fcW = (SETTINGS.weights.forecast || 3) / 3;
    var elast = (2.8 - 1.6 * baseOcc) * (0.6 + 0.4 * fcW);
    // sigmoid around the comp ref
    var mult = 1 / (1 + Math.exp(elast * position * 4));
    // scale by baseline demand share (baseOcc) and capacity
    var rooms = capacity * baseOcc * 2 * mult;
    if (rooms < 0) rooms = 0;
    if (rooms > capacity) rooms = capacity;
    return rooms;
  }

  function priceSearch(baseOcc, compRef, capacity, floor, ceiling, prevReco) {
    var best = null, bestP = null;
    var lo = Math.max(floor, (prevReco || compRef || 100) - SETTINGS.maxDailyChange);
    var hi = Math.min(ceiling, (prevReco || compRef || 100) + SETTINGS.maxDailyChange);
    if (lo < floor) lo = floor; if (hi > ceiling) hi = ceiling;
    // If no previous reco, search the whole band
    if (!prevReco) { lo = floor; hi = ceiling; }
    for (var p = lo; p <= hi; p += 1) {
      var d = demandAt(p, baseOcc, compRef, capacity);
      var profit = (p * (1 - SETTINGS.commission) - SETTINGS.variable + SETTINGS.ancillary) * d;
      if (best === null || profit > best) { best = profit; bestP = p; }
    }
    return { price: bestP, netPerRoom: round(bestP * (1 - SETTINGS.commission) - SETTINGS.variable + SETTINGS.ancillary, 2) };
  }

  /* ---------- demo night data (365 days from today) ---------- */
  /* Each night carries: baseOcc (forecast occupancy 0-1), compRef (weighted comp),
     eventScore (0-5). From these the engine produces current, recommended, reasons. */
  var NIGHTS = null;
  function buildNights() {
    if (NIGHTS) return NIGHTS;
    NIGHTS = [];
    var start = new Date(); start.setHours(0, 0, 0, 0);
    // Deterministic pseudo-random so the demo is stable across reloads
    function pseudo(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
    for (var i = 1; i <= 365; i++) {
      var d = addDays(start, i);
      var day = d.getDay();
      // DOW pattern: Mon low, build to Fri/Sat peak, Sun midweek
      var dowBase = [0.42, 0.38, 0.52, 0.64, 0.78, 0.92, 0.88][day];
      // Seasonal drift: autumn soft, Dec surge, Jan trough, spring build
      var m = d.getMonth();
      var seasonal = [0.72, 0.68, 0.84, 0.92, 0.96, 1.00, 1.04, 1.02, 0.94, 0.86, 0.78, 1.08][m];
      var noise = (pseudo(i) - 0.5) * 0.14;
      var baseOcc = Math.max(0.12, Math.min(0.98, dowBase * seasonal + noise));

      // comp reference: build a weighted average of comp hotels with per-night drift
      var wsum = 0, psum = 0;
      COMP_SET.forEach(function (c, ci) {
        var drift = 1 + (pseudo(i * 7 + ci) - 0.5) * 0.18;
        var dowLift = [0.86, 0.85, 0.92, 0.96, 1.04, 1.18, 1.12][day];
        var p = c.base * drift * dowLift * seasonal;
        psum += p * c.weight; wsum += c.weight;
      });
      var compRef = round(psum / wsum, 0);

      // event score: weekend lift + occasional spike
      var eventScore = 0;
      if (day === 5 || day === 6) eventScore = 1;
      if (pseudo(i * 11) > 0.92) eventScore = 4;
      else if (pseudo(i * 11) > 0.82) eventScore = 2;

      NIGHTS.push({ d: iso(d), day: day, baseOcc: round(baseOcc, 3), compRef: compRef, eventScore: eventScore });
    }
    return NIGHTS;
  }

  function nightComputedFor(roomType, night, prevReco) {
    var rt = ROOM_TYPES.filter(function (r) { return r.id === roomType; })[0];
    if (!rt) return null;
    // Adjust base occupancy per room type (small bias by category)
    var typeAdj = { double: 1.00, twin: 0.94, suite: 0.70, accessible: 0.60 }[rt.cat] || 1;
    var occ = Math.max(0.05, Math.min(0.99, night.baseOcc * typeAdj));
    // Per-room-type comp reference — add exec supplement if applicable
    var compRef = night.compRef + (rt.exec ? 10 : -6);
    if (rt.cat === 'suite') compRef += 45;
    // Lift for event nights
    compRef = round(compRef * (1 + 0.025 * night.eventScore), 0);
    var pr = priceSearch(occ, compRef, rt.rooms, rt.floor, rt.ceiling, prevReco);
    var current = rt.bar;
    // On-books: demo — rooms already sold for that night
    var onBooks = Math.round(rt.rooms * occ * 0.72);
    var reasons = [];
    if (compRef - pr.price > 10) reasons.push('Comp ref £' + compRef + ' (we are £' + (compRef - pr.price) + ' below)');
    if (compRef - current > 20) reasons.push('Current BAR £' + current + ' well under comp ref £' + compRef);
    if (current - pr.price > 10) reasons.push('Softening — recommended £' + (current - pr.price) + ' below BAR');
    if (pr.price - current > 10) reasons.push('Strengthening — pickup supports +£' + (pr.price - current));
    if (occ > 0.85) reasons.push('Strong forecast occupancy (' + pct(occ) + ')');
    else if (occ < 0.35) reasons.push('Soft night (' + pct(occ) + ' forecast)');
    if (night.eventScore >= 3) reasons.push('Major event nearby (impact ' + night.eventScore + '/5)');
    else if (night.eventScore >= 2) reasons.push('Local event (impact ' + night.eventScore + '/5)');
    if (!reasons.length) reasons.push('Within normal band — hold');
    return {
      d: night.d, day: night.day, occ: occ, compRef: compRef,
      current: current, recommended: pr.price, netPerRoom: pr.netPerRoom,
      onBooks: onBooks, capacity: rt.rooms,
      reasons: reasons.slice(0, 3)
    };
  }

  function nightsFor(roomType, days) {
    buildNights();
    var slice = NIGHTS.slice(0, days || 30);
    var out = [], prev = null;
    slice.forEach(function (n) {
      var row = nightComputedFor(roomType, n, prev);
      prev = row.recommended;
      out.push(row);
    });
    return out;
  }

  /* ---------- decisions (localStorage) ---------- */
  function getDecisions() {
    var st = loadState();
    return st.decisions || {};
  }
  function setDecision(roomType, date, decision, price) {
    var st = loadState();
    st.decisions = st.decisions || {};
    var key = roomType + '|' + date;
    if (decision) { st.decisions[key] = { d: decision, p: price, t: Date.now() }; }
    else { delete st.decisions[key]; }
    saveState(st);
  }
  function decisionFor(roomType, date) {
    var k = roomType + '|' + date;
    return getDecisions()[k] || null;
  }

  /* ---------- VIEWS ---------- */

  function viewTabs() {
    var tabs = [
      ['dash',     'Dashboard'],
      ['calendar', 'Calendar'],
      ['compset',  'Compset'],
      ['trend',    'Trend'],
      ['events',   'Events'],
      ['forecast', 'Forecast'],
      ['settings', 'Settings']
    ];
    return '<div class="rv-tabs">' + tabs.map(function (t) {
      return '<button data-rv-view="' + t[0] + '"' + (UI.view === t[0] ? ' class="on"' : '') + '>' + esc(t[1]) + '</button>';
    }).join('') + '</div>';
  }

  function hero() {
    return '<div class="rv-hero"><div><h2>Revenue Management</h2><p>Maximising net room margin across the next 365 nights · Recommendations refresh every 30 mins against latest on-books · Comp rates refreshed daily at 05:30</p></div><div class="rv-demo">Phase 1 shell · Demo data</div></div>';
  }

  /* ---- Dashboard ---- */
  function viewDash() {
    buildNights();
    var totalNights = 365;
    var horizon = 60;    // near-term window the dashboard counts refer to
    // Default room type for the dashboard counts: Exec double, the biggest pool
    var nights = nightsFor('exec_dbl', 365);
    var near = nights.slice(0, horizon);
    var decs = getDecisions();
    var needDec = 0, quiet = 0, moves = 0, sumReco = 0, sumComp = 0;
    near.forEach(function (n) {
      sumReco += n.recommended; sumComp += n.compRef;
      if (Math.abs(n.recommended - n.current) >= 5) moves++;
      if (n.occ < 0.3) quiet++;
      var key = 'exec_dbl|' + n.d;
      if (!decs[key]) needDec++;
    });
    var eventN = 0;
    buildNights().slice(0, horizon).forEach(function (n) { if (n.eventScore >= 3) eventN++; });
    var avgReco = Math.round(sumReco / near.length);
    var avgComp = Math.round(sumComp / near.length);

    // Decisions list — first 6 nights that need one, within the horizon
    var pending = near.filter(function (n) { return !decs['exec_dbl|' + n.d] && Math.abs(n.recommended - n.current) >= 5; }).slice(0, 6);
    var pendingH = pending.map(function (n) {
      var delta = n.recommended - n.current;
      var pill = delta > 0 ? '<span class="rv-pill up">+£' + delta + '</span>' : (delta < 0 ? '<span class="rv-pill dn">−£' + Math.abs(delta) + '</span>' : '<span class="rv-pill flat">hold</span>');
      return '<tr><td>' + esc(shortD(n.d)) + '</td><td class="n">' + gbp(n.current) + '</td><td class="n">' + gbp(n.recommended) + '</td><td>' + pill + '</td><td class="rv-why">' + esc(n.reasons[0]) + '</td></tr>';
    }).join('');

    // Quiet nights — lowest occupancy within the horizon
    var quietN = near.slice().sort(function (a, b) { return a.occ - b.occ; }).slice(0, 6);
    var quietH = quietN.map(function (n) {
      return '<tr><td>' + esc(shortD(n.d)) + '</td><td class="n">' + pct(n.occ) + '</td><td class="n">' + gbp(n.recommended) + '</td><td class="rv-why">' + esc(n.reasons[0]) + '</td></tr>';
    }).join('');

    return hero() + viewTabs() +
      '<div class="rv-tiles">' +
        tile('Nights priced', num(totalNights), 'next 365 nights', '') +
        tile('Needing a decision', num(needDec), 'next ' + horizon + ' nights · Exec dbl', needDec > 20 ? 'warn' : '') +
        tile('Rate moves recommended', num(moves), 'next ' + horizon + ' nights · move ≥ £5', '') +
        tile('Quiet nights', num(quiet), '< 30% forecast occ', 'amber') +
        tile('Avg suggested rate', gbp(avgReco), 'next ' + horizon + ' · Exec dbl', '') +
        tile('Avg comp reference', gbp(avgComp), 'weighted comp set', '') +
        tile('Event nights', num(eventN), 'impact ≥ 3/5', '') +
      '</div>' +
      '<div class="rv-grid2">' +
        '<div class="rv-card"><h3>Dates needing a decision</h3><p class="sub">Executive double · next ' + horizon + ' nights</p>' +
          '<table class="rv-t"><thead><tr><th>Night</th><th class="n">Current</th><th class="n">Recommended</th><th>Move</th><th>Why</th></tr></thead><tbody>' + pendingH + '</tbody></table>' +
        '</div>' +
        '<div class="rv-card"><h3>Quiet nights to fill</h3><p class="sub">Lowest forecast occupancy</p>' +
          '<table class="rv-t"><thead><tr><th>Night</th><th class="n">Fcast occ</th><th class="n">Recommended</th><th>Why</th></tr></thead><tbody>' + quietH + '</tbody></table>' +
        '</div>' +
      '</div>' +
      '<div class="rv-signoff"><span class="rv-badge">Sign-off</span><span>Daily sign-off: <b>Patrik Vlach</b> · recommendations are reviewed and approved — nothing writes back to Rezlynx in Phase 1.</span></div>';
  }

  function tile(l, v, d, klass) {
    return '<div class="rv-tile ' + (klass || '') + '"><div class="l">' + esc(l) + '</div><div class="v">' + v + '</div><div class="d">' + esc(d) + '</div></div>';
  }

  /* ---- Calendar ---- */
  function viewCalendar() {
    var days = 60;
    var nights = nightsFor(UI.roomType, days);
    var decs = getDecisions();
    var rt = ROOM_TYPES.filter(function (r) { return r.id === UI.roomType; })[0];

    var rows = nights.map(function (n) {
      var key = UI.roomType + '|' + n.d;
      var dec = decs[key];
      var cls = ['Sat', 'Sun'].indexOf(dow(n.d)) >= 0 ? (dow(n.d) === 'Sat' ? 'sat' : 'sun') : '';
      if (dec && dec.d === 'lock') cls = 'locked';

      // effective sell rate = override > lock > approved recommended > engine recommended (pending)
      var sellRate = n.recommended;
      if (dec && dec.d === 'approve') sellRate = dec.p;
      if (dec && dec.d === 'over') sellRate = dec.p;
      if (dec && dec.d === 'lock') sellRate = dec.p;

      var delta = sellRate - n.current;
      var pill = delta > 0 ? '<span class="rv-pill up">+£' + delta + '</span>' : (delta < 0 ? '<span class="rv-pill dn">−£' + Math.abs(delta) + '</span>' : '<span class="rv-pill flat">hold</span>');
      var recoCell = '<b style="color:#1F7A8C">' + gbp(n.recommended) + '</b>';
      if (dec && dec.d === 'over') recoCell = '<b style="color:#eb6834">' + gbp(dec.p) + '</b> <small style="color:#7b8494">was £' + n.recommended + '</small>';
      if (dec && dec.d === 'lock') recoCell = '<b style="color:#6250d6">£' + dec.p + ' locked</b>';

      var overOpen = (UI.overrideOpen === UI.roomType + '|' + n.d);
      var overBtn;
      if (overOpen) {
        overBtn = '<input class="rv-input" style="width:68px;padding:3px 6px" type="number" step="1" data-rv-over-in="' + UI.roomType + '|' + n.d + '" value="' + (dec && dec.d === 'over' ? dec.p : n.recommended) + '">';
      } else {
        overBtn = '<button data-rv-dec="over" data-rv-rt="' + UI.roomType + '" data-rv-d="' + n.d + '" data-rv-p="' + n.recommended + '"' + (dec && dec.d === 'over' ? ' class="on over"' : '') + '>Override' + (dec && dec.d === 'over' ? ' £' + dec.p : '') + '</button>';
      }

      return '<tr class="' + cls + '">' +
        '<td><b>' + esc(shortD(n.d)) + '</b></td>' +
        '<td class="n">' + num(n.onBooks) + ' / ' + num(n.capacity) + '</td>' +
        '<td class="n">' + pct(n.occ) + '</td>' +
        '<td class="n">' + gbp(n.compRef) + '</td>' +
        '<td class="n">' + gbp(n.current) + '</td>' +
        '<td class="n">' + recoCell + ' ' + pill + '</td>' +
        '<td class="n">' + gbp(n.netPerRoom, 2) + '</td>' +
        '<td class="rv-why">' + n.reasons.map(esc).join('<br>') + '</td>' +
        '<td><div class="rv-dec">' +
          '<button data-rv-dec="approve" data-rv-rt="' + UI.roomType + '" data-rv-d="' + n.d + '" data-rv-p="' + n.recommended + '"' + (dec && dec.d === 'approve' ? ' class="on"' : '') + '>Approve</button>' +
          overBtn +
          '<button data-rv-dec="lock" data-rv-rt="' + UI.roomType + '" data-rv-d="' + n.d + '" data-rv-p="' + n.current + '"' + (dec && dec.d === 'lock' ? ' class="on lock"' : '') + '>Lock</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    var roomBtns = ROOM_TYPES.map(function (r) {
      return '<button data-rv-rt="' + r.id + '"' + (UI.roomType === r.id ? ' class="on"' : '') + '>' + esc(r.label) + ' <small style="opacity:.75">(' + r.rooms + ')</small></button>';
    }).join('');

    return hero() + viewTabs() +
      '<div class="rv-card">' +
      '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap">' +
        '<div><h3>365-night rate calendar</h3><p class="sub" style="margin-bottom:0">Per room type — showing the next ' + days + ' nights. Approve sells at recommended; Override lets you type the price you want; Lock holds current BAR.</p></div>' +
        '<button class="v16-chip" data-rv-csv title="Download the next ' + days + ' nights as CSV for Patrik to review offline">↓ Export CSV</button>' +
      '</div>' +
      '<div class="rv-roomsel" style="margin-top:12px">' + roomBtns + '</div>' +
      '<table class="rv-t"><thead><tr><th>Night</th><th class="n">On books</th><th class="n">Fcast occ</th><th class="n">Comp ref</th><th class="n">Current BAR</th><th class="n">Sell at</th><th class="n">Net / room</th><th>Why</th><th>Decision</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="rv-note">Guardrails in force: floor £' + rt.floor + ', ceiling £' + rt.ceiling + ', max daily change £' + SETTINGS.maxDailyChange + '. Decisions are stored locally until the Guestline write-back is wired (Phase 2+, test site first).</p>' +
      '</div>';
  }

  /* CSV export for the current room type's recommendations */
  function exportCsv() {
    var days = 60;
    var rt = ROOM_TYPES.filter(function (r) { return r.id === UI.roomType; })[0];
    var nights = nightsFor(UI.roomType, days);
    var decs = getDecisions();
    var lines = ['Date,Day,Room type,On books,Capacity,Fcast occ %,Comp ref £,Current BAR £,Recommended £,Sell at £,Decision,Net per room £,Reasons'];
    nights.forEach(function (n) {
      var dec = decs[UI.roomType + '|' + n.d];
      var sell = n.recommended;
      if (dec && dec.d) sell = dec.p;
      var decLabel = dec && dec.d ? dec.d.toUpperCase() : 'pending';
      lines.push([
        n.d, dow(n.d), rt.label, n.onBooks, n.capacity, Math.round(n.occ * 100),
        n.compRef, n.current, n.recommended, sell, decLabel, n.netPerRoom,
        '"' + n.reasons.join('; ').replace(/"/g, '""') + '"'
      ].join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hosrev-' + UI.roomType + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  /* ---- Compset ---- */
  function viewCompset() {
    buildNights();
    var days = 14;
    var nights = NIGHTS.slice(0, days);
    // Row per comp hotel + our Classic double (shown bold)
    var headerDates = nights.map(function (n) { return '<th class="n">' + esc(dow(n.d)) + '<br>' + esc(shortD(n.d).split(' ')[1]) + '</th>'; }).join('');

    var ourRows = nightsFor('classic_dbl', days);
    var decs = getDecisions();

    function cellForHotel(comp, night, ci, idx) {
      var seed = (comp ? (comp.id.length * 13 + ci * 7) : 0) + parseISO(night.d).getDate();
      function pseudo(s) { var x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); }
      var displayed, genius;
      if (comp) {
        var dowLift = [0.86, 0.85, 0.92, 0.96, 1.04, 1.18, 1.12][night.day];
        var drift = 1 + (pseudo(seed) - 0.5) * 0.14;
        displayed = Math.round(comp.base * drift * dowLift);
        genius = Math.round(displayed * 0.9);
        return '<td class="n"><div class="rv-compcell">' + gbp(displayed) + '<span class="g">G ' + gbp(genius) + '</span></div></td>';
      }
      // Us — Classic double, showing the recommended (dynamic) with current BAR beneath
      var r = ourRows[idx];
      var dec = decs['classic_dbl|' + r.d];
      var sell = dec && dec.d ? dec.p : r.recommended;
      genius = Math.round(sell * 0.9);
      return '<td class="n"><div class="rv-compcell us">' + gbp(sell) + '<span class="g">G ' + gbp(genius) + ' · BAR £' + r.current + '</span></div></td>';
    }

    var usRow = '<tr><td><b>Brandon Hall</b><br><small style="color:#7b8494">Classic double · recommended</small></td>' + nights.map(function (n, i) { return cellForHotel(null, n, 0, i); }).join('') + '</tr>';
    var compRows = COMP_SET.map(function (c, ci) {
      var starBtns = '';
      for (var w = 1; w <= 5; w++) {
        starBtns += '<button data-rv-cw="' + c.id + '" data-rv-w="' + w + '" title="Set weight to ' + w + '" style="border:0;background:none;padding:0 1px;font-size:14px;cursor:pointer;color:' + (w <= c.weight ? '#BB9979' : '#e4e2dc') + '">●</button>';
      }
      return '<tr><td>' + esc(c.label) + '<br><span class="rv-stars">' + starBtns + '</span></td>' + nights.map(function (n) { return cellForHotel(c, n, ci); }).join('') + '</tr>';
    }).join('');

    return hero() + viewTabs() +
      '<div class="rv-card"><h3>Compset — next ' + days + ' nights</h3><p class="sub">Displayed consumer rate · G = Booking Genius estimate (−10%). Our Classic double shows the engine\'s recommended rate (and current BAR). Click the ● stars to adjust each hotel\'s weight 1–5 — changes feed the comp reference and re-run the engine.</p>' +
      '<div style="overflow-x:auto"><table class="rv-t"><thead><tr><th>Hotel</th>' + headerDates + '</tr></thead><tbody>' + usRow + compRows + '</tbody></table></div>' +
      '<p class="rv-note">When live, comp rates come from the SerpApi Google Hotels shopper (<code>tools/hosrev-rateshop.mjs</code>) writing <code>hosrev-comp.json</code> once a day at 05:30 London.</p>' +
      '</div>';
  }

  /* ---- Trend ---- */
  var charts = {};
  function viewTrend() {
    var html = hero() + viewTabs() +
      '<div class="rv-card"><h3>Trend — average displayed rate by hotel</h3><p class="sub">Next ~30 nights · one line per hotel · our Brandon Hall in navy</p>' +
      '<div class="rv-chartbox"><canvas id="rv-trend-chart"></canvas></div>' +
      '<div class="rv-leg" id="rv-trend-leg"></div>' +
      '<p class="rv-note">The live Trend fills out one point per hotel per day as the 05:30 shopper runs — history builds over the following weeks. The demo lines show the shape to expect.</p>' +
      '</div>';
    return html;
  }
  function drawTrendChart() {
    if (!window.Chart) return;
    buildNights();
    var nights = NIGHTS.slice(0, 30);
    var labels = nights.map(function (n) { return shortD(n.d); });
    function pseudo(s) { var x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); }
    var datasets = [];
    COMP_SET.forEach(function (c, ci) {
      var pal = ['#eb6834', '#7a4fc4', '#1a8f63', '#b9791a', '#c2417a', '#2a78c8', '#6b7a2a'];
      datasets.push({
        label: c.label,
        data: nights.map(function (n, ni) {
          var dowLift = [0.86, 0.85, 0.92, 0.96, 1.04, 1.18, 1.12][n.day];
          var drift = 1 + (pseudo(ci * 17 + ni) - 0.5) * 0.12;
          return Math.round(c.base * drift * dowLift);
        }),
        borderColor: pal[ci % pal.length],
        backgroundColor: pal[ci % pal.length] + '22',
        borderWidth: 1.5, pointRadius: 2, tension: 0.25
      });
    });
    // Us bold navy — the recommended rate per night (dynamic)
    var ourRows = nightsFor('classic_dbl', 30);
    var decs = getDecisions();
    datasets.push({
      label: 'Brandon Hall (recommended)',
      data: ourRows.map(function (r) {
        var dec = decs['classic_dbl|' + r.d];
        if (dec && dec.d) return dec.p;
        return r.recommended;
      }),
      borderColor: NAVY, backgroundColor: NAVY + '22', borderWidth: 3, pointRadius: 3, tension: 0.2
    });
    // Also show current BAR as a dotted reference line so the gap is visible
    datasets.push({
      label: 'Brandon Hall (current BAR)',
      data: ourRows.map(function (r) { return r.current; }),
      borderColor: '#86847d', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, tension: 0
    });
    var el = $('rv-trend-chart'); if (!el) return;
    if (charts.trend) { try { charts.trend.destroy(); } catch (e) {} }
    charts.trend = new Chart(el, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': £' + c.parsed.y; } } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#ebe9e3' }, border: { display: false }, ticks: { callback: function (v) { return '£' + v; } } }
        }
      }
    });
    var leg = $('rv-trend-leg');
    if (leg) leg.innerHTML = datasets.map(function (d) {
      return '<span><i style="background:' + d.borderColor + ';height:' + (d.borderWidth || 2) + 'px"></i>' + esc(d.label) + '</span>';
    }).join('');
  }

  /* ---- Events ---- */
  var DEMO_EVENTS = [
    { date: null, label: 'Coventry City home match',       venue: 'Coventry Building Society Arena', type: 'Football',    impact: 4, attendance: 25000, offset: 3 },
    { date: null, label: 'NEC Classic Motor Show',         venue: 'NEC Birmingham',                  type: 'Exhibition',  impact: 5, attendance: 70000, offset: 8 },
    { date: null, label: 'University of Warwick open day', venue: 'University of Warwick',           type: 'Education',   impact: 3, attendance: 4000,  offset: 12 },
    { date: null, label: 'Private wedding',                venue: 'Brandon Hall (in-house)',         type: 'Wedding',     impact: 4, attendance: 120,   offset: 5 },
    { date: null, label: 'Leamington Food Festival',       venue: 'Pump Room Gardens',               type: 'Festival',    impact: 2, attendance: 15000, offset: 15 },
    { date: null, label: 'British Grand Prix build-up',    venue: 'Silverstone (nearby overflow)',   type: 'Motorsport',  impact: 5, attendance: 140000, offset: 42 },
    { date: null, label: 'Corporate AGM — major client',   venue: 'NEC Birmingham',                  type: 'Conference',  impact: 3, attendance: 1800,  offset: 9 },
    { date: null, label: 'Brandon village fair',           venue: 'Brandon Wood',                    type: 'Local',       impact: 1, attendance: 400,   offset: 22 }
  ];
  function viewEvents() {
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var stars = function (n) { return '<span class="rv-stars">' + '★'.repeat(n) + '<span class="dim">' + '☆'.repeat(5 - n) + '</span></span>'; };
    var rows = DEMO_EVENTS.map(function (e) {
      var d = addDays(start, e.offset);
      return '<tr><td><b>' + esc(shortD(iso(d))) + '</b></td><td>' + esc(e.label) + '</td><td>' + esc(e.venue) + '</td><td><span class="rv-eventtype">' + esc(e.type) + '</span></td><td>' + stars(e.impact) + '</td><td class="n">' + num(e.attendance) + '</td></tr>';
    }).join('');
    return hero() + viewTabs() +
      '<div class="rv-card"><h3>Events — next 60 days</h3><p class="sub">Local events within ~20 miles + our own diary · scored 1–5 for impact. The engine nudges rates up on strong nights but does not double-count — competitors already price events into their own rates.</p>' +
      '<table class="rv-t"><thead><tr><th>Date</th><th>Event</th><th>Venue</th><th>Type</th><th>Impact</th><th class="n">Attendance</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="rv-note">Phase 2: a PredictHQ events feed + weather; our weddings and groups read directly from HosVENUE and HosSALES rather than being keyed by hand.</p>' +
      '</div>';
  }

  /* ---- Forecast ---- */
  function viewForecast() {
    var html = hero() + viewTabs() +
      '<div class="rv-grid2">' +
        '<div class="rv-card"><h3>Occupancy — past 30 days + next 30 nights</h3><p class="sub">Past bars are real occupancy from the Guestline feed · forward bars are the engine\'s forecast</p>' +
          '<div class="rv-chartbox"><canvas id="rv-fc-occ"></canvas></div>' +
        '</div>' +
        '<div class="rv-card"><h3>Net room profit per night — Executive double</h3><p class="sub">At the recommended price</p>' +
          '<div class="rv-chartbox"><canvas id="rv-fc-prof"></canvas></div>' +
        '</div>' +
      '</div>' +
      '<p class="rv-note" style="text-align:center">Historic bars come from closed-day Guestline pulls (already live). Forward occupancy becomes live too the moment the Report Data API key lands.</p>';
    return html;
  }
  function drawForecastCharts() {
    if (!window.Chart) return;
    buildNights();
    var nights = NIGHTS.slice(0, 30);

    // Try to pull real history from the Guestline feed — past 30 closed days
    var histLabels = [], histData = [];
    try {
      var S = (window.Trading && window.Trading.S) ? window.Trading.S() : null;
      if (S && S.gl && S.gl.byDay) {
        var lettable = 114;
        var allDays = Object.keys(S.gl.byDay).sort();
        var tail = allDays.slice(-30);
        tail.forEach(function (d) {
          var row = S.gl.byDay[d];
          var occPct = row && row.sold ? Math.round((row.sold / lettable) * 100) : null;
          histLabels.push(shortD(d));
          histData.push(occPct);
        });
      }
    } catch (e) {}

    var fcLabels = nights.map(function (n) { return shortD(n.d); });
    var labels = histLabels.concat(['— today —']).concat(fcLabels);
    var histPadded = histData.concat([null]).concat(nights.map(function () { return null; }));
    var fcPadded = histLabels.map(function () { return null; }).concat([null]).concat(nights.map(function (n) { return Math.round(n.baseOcc * 100); }));

    var occ = $('rv-fc-occ');
    if (occ) {
      if (charts.occ) { try { charts.occ.destroy(); } catch (e) {} }
      charts.occ = new Chart(occ, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Actual occupancy (past)',
              data: histPadded,
              backgroundColor: '#1a2b3a',
              borderRadius: 3, maxBarThickness: 12
            },
            {
              label: 'Forecast occupancy',
              data: fcPadded,
              backgroundColor: nights.map(function (n) {
                return n.baseOcc < 0.3 ? '#d0362b' : (n.baseOcc > 0.8 ? '#1a8f63' : TEAL);
              }),
              borderRadius: 3, maxBarThickness: 12
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
            tooltip: { callbacks: { label: function (c) { return (c.parsed.y == null ? '' : c.parsed.y + '% ' + c.dataset.label); } } }
          },
          scales: {
            x: { grid: { display: false }, stacked: false, ticks: { maxRotation: 60, minRotation: 50, font: { size: 9 } } },
            y: { max: 100, grid: { color: '#ebe9e3' }, border: { display: false }, ticks: { callback: function (v) { return v + '%'; } } }
          }
        }
      });
    }
    var prof = $('rv-fc-prof');
    if (prof) {
      var rows = nightsFor('exec_dbl', 30);
      if (charts.prof) { try { charts.prof.destroy(); } catch (e) {} }
      charts.prof = new Chart(prof, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Net profit at recommended price',
            data: rows.map(function (r) { return Math.round(r.netPerRoom * Math.min(r.capacity, r.capacity * r.occ)); }),
            borderColor: TEAL, backgroundColor: TEAL + '33', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.25
          }]
        },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return '£' + c.parsed.y; } } } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#ebe9e3' }, border: { display: false }, ticks: { callback: function (v) { return '£' + v; } } }
          }
        }
      });
    }
  }

  /* ---- Settings ---- */
  function viewSettings() {
    var roomRows = ROOM_TYPES.map(function (r) {
      return '<tr><td><b>' + esc(r.label) + '</b></td><td>' + esc(r.cat) + '</td><td>' + (r.exec ? '✓' : '') + '</td><td class="n">£' + r.suppl + '</td><td class="n">' + r.rooms + '</td><td class="n">£' + r.floor + '</td><td class="n">£' + r.ceiling + '</td><td class="n">£' + r.bar + '</td></tr>';
    }).join('');

    return hero() + viewTabs() +
      '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="v16-chip" data-rv-reset title="Restore all parameters and comp weights to their defaults from the brief">↺ Reset to defaults</button></div>' +
      '<div class="rv-grid2">' +
        '<div class="rv-card"><h3>Costs &amp; value</h3><p class="sub">The <code>v</code>, <code>a</code> and <code>c</code> that feed the profit formula · changes save instantly and re-run the engine</p>' +
          '<div class="rv-row"><label>Commission / channel cost<small>c</small></label><input class="rv-input" type="number" step="0.5" min="0" max="35" data-rv-set="commission" data-rv-unit="pct" value="' + (SETTINGS.commission * 100) + '"> %</div>' +
          '<div class="rv-row"><label>Variable cost / occupied room<small>v</small></label><input class="rv-input" type="number" step="1" min="0" data-rv-set="variable" value="' + SETTINGS.variable + '"> £</div>' +
          '<div class="rv-row"><label>Ancillary value / occupied room<small>a</small></label><input class="rv-input" type="number" step="1" min="0" data-rv-set="ancillary" value="' + SETTINGS.ancillary + '"> £</div>' +
          '<div class="rv-row"><label>Max daily change</label><input class="rv-input" type="number" step="1" min="0" data-rv-set="maxDailyChange" value="' + SETTINGS.maxDailyChange + '"> £</div>' +
          '<p class="rv-note">Profit per occupied room = price × (1 − <code>c</code>) − <code>v</code> + <code>a</code>. Raising <code>a</code> tells the engine breakfast/F&amp;B upsell is more valuable so soft nights are worth filling; raising <code>c</code> pushes recommendations up to cover channel cost.</p>' +
        '</div>' +
        '<div class="rv-card"><h3>Input weights (1–5)</h3><p class="sub">How hard each signal pulls the recommendation · 1 = ignore, 5 = dominant</p>' +
          '<div class="rv-row"><label>Comp reference</label><input class="rv-input" type="number" step="1" min="1" max="5" data-rv-wgt="comp" value="' + SETTINGS.weights.comp + '"></div>' +
          '<div class="rv-row"><label>Forecast occupancy</label><input class="rv-input" type="number" step="1" min="1" max="5" data-rv-wgt="forecast" value="' + SETTINGS.weights.forecast + '"></div>' +
          '<div class="rv-row"><label>Events</label><input class="rv-input" type="number" step="1" min="1" max="5" data-rv-wgt="events" value="' + SETTINGS.weights.events + '"></div>' +
          '<div class="rv-row"><label>Pickup &amp; pace</label><input class="rv-input" type="number" step="1" min="1" max="5" data-rv-wgt="pickup" value="' + SETTINGS.weights.pickup + '"></div>' +
          '<p class="rv-note">Pickup needs ~3 months of daily snapshots to be meaningful; for now it uses DOW average.</p>' +
        '</div>' +
      '</div>' +
      '<div class="rv-card"><h3>Room types &amp; rate rules</h3><p class="sub">Floors are Room-Only. Current working floor is under discussion (£65 RO vs £72).</p>' +
      '<table class="rv-t"><thead><tr><th>Room type</th><th>Category</th><th>Exec</th><th class="n">Suppl.</th><th class="n">Rooms</th><th class="n">Floor</th><th class="n">Ceiling</th><th class="n">Current BAR</th></tr></thead><tbody>' + roomRows + '</tbody></table>' +
      '<p class="rv-note">Commercial rule baked in: Executive double is held just under the Classic Twin so the double sells, and the £15 Exec supplement is dropped when the market needs the room.</p>' +
      '</div>' +
      '<div class="rv-card"><h3>Refresh cadence</h3><p class="sub">Agreed cadence per signal. Display only — change these in <code>functions/schedules.ts</code> (Firebase) once the live feeds are wired.</p>' +
        '<table class="rv-t"><thead><tr><th>Signal</th><th>Cadence</th><th>Why</th></tr></thead><tbody>' +
          '<tr><td><b>Our on-books</b> (Guestline)</td><td><span class="rv-badge" style="background:#e6f4ee;color:#1a6442;border-color:#bfe3d0">Every 30 mins</span></td><td>Cheap; catches pickup fast</td></tr>' +
          '<tr><td><b>Engine recompute</b></td><td><span class="rv-badge" style="background:#e6f4ee;color:#1a6442;border-color:#bfe3d0">Every 30 mins</span></td><td>Re-prices against latest on-books</td></tr>' +
          '<tr><td><b>Comp-set shopper</b> (SerpApi Google Hotels)</td><td><span class="rv-badge">Daily · 05:30</span></td><td>Once a day keeps SerpApi cost at ~7,200 searches/month (cheapest tier); comp rates don\'t move enough intraday to justify more</td></tr>' +
          '<tr><td><b>Events</b> (PredictHQ)</td><td><span class="rv-badge">Daily · overnight</span></td><td>Events don\'t change hour by hour</td></tr>' +
          '<tr><td><b>Rate write-back</b> to Rezlynx</td><td><span class="rv-badge" style="background:#fbe9e7;color:#8a1e15;border-color:#f0c4be">Manual only</span></td><td>Phase 2+, VENDORADV test site first; nothing auto-pushes to live PMS</td></tr>' +
        '</tbody></table>' +
        '<p class="rv-note">The honesty chip on each view will read something like: <em>Recommendations updated 09:28 · Comp rates from 05:30 shop (refreshes tomorrow 05:30) · 30-min refresh on your own pickup.</em></p>' +
      '</div>' +
      '<div class="rv-card"><h3>Data sources</h3>' +
        '<table class="rv-t"><thead><tr><th>Signal</th><th>Today</th><th>After integration</th><th>Cadence</th></tr></thead><tbody>' +
          '<tr><td>Comp-set market rates</td><td>Demo</td><td>SerpApi Google Hotels (<code>hosrev-comp.json</code>)</td><td>Daily · 05:30</td></tr>' +
          '<tr><td>On-books / rooms sold</td><td>Demo</td><td>Guestline <code>pmsbkg_GetReservationBookingLines</code></td><td>Every 30 mins</td></tr>' +
          '<tr><td>Forecast occupancy &amp; capacity</td><td>Demo</td><td>Derived from Guestline on-books + room structure</td><td>Every 30 mins</td></tr>' +
          '<tr><td>Pickup / lead time</td><td>—</td><td>Guestline <code>pmsbkg_BookingSearch</code> by created/edited date</td><td>Every 30 mins</td></tr>' +
          '<tr><td>Rooms out of service</td><td>Settings room counts</td><td>Guestline <code>pmsint_GetRoomStatus</code> (pending enablement)</td><td>Hourly</td></tr>' +
          '<tr><td>Rate write-back to PMS</td><td>None — recommend + approve only</td><td>Phase 2+, VENDORADV test first</td><td>Manual</td></tr>' +
        '</tbody></table>' +
      '</div>';
  }

  /* ---------- top-level renderer ---------- */
  function render() {
    injectCSS();
    var el = $('pf-rev');
    if (!el) return;
    var view = UI.view;
    var html = '<div class="rv-wrap">';
    if (view === 'dash')         html += viewDash();
    else if (view === 'calendar') html += viewCalendar();
    else if (view === 'compset')  html += viewCompset();
    else if (view === 'trend')    html += viewTrend();
    else if (view === 'events')   html += viewEvents();
    else if (view === 'forecast') html += viewForecast();
    else if (view === 'settings') html += viewSettings();
    html += '</div>';
    el.innerHTML = html;
    if (view === 'trend')    setTimeout(drawTrendChart, 20);
    if (view === 'forecast') setTimeout(drawForecastCharts, 20);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;

    // Export CSV
    if (t.closest('[data-rv-csv]')) { exportCsv(); return; }

    // Reset settings to defaults
    if (t.closest('[data-rv-reset]')) {
      if (confirm('Reset all costs, weights and comp weights to the defaults from the brief?')) {
        SETTINGS.commission = 0.14; SETTINGS.variable = 18; SETTINGS.ancillary = 14; SETTINGS.maxDailyChange = 15;
        SETTINGS.weights = { comp: 4, forecast: 4, events: 2, pickup: 3 };
        var defs = { coombe: 5, dthilton: 4, windmill: 4, ramada: 3, chesford: 4, nailcote: 3, mallory: 2 };
        COMP_SET.forEach(function (c) { if (defs[c.id] != null) c.weight = defs[c.id]; });
        persistSettings(); persistCompWeights(); bustCache(); render();
      }
      return;
    }

    // Tab switch
    var vb = t.closest('[data-rv-view]');
    if (vb) { UI.view = vb.getAttribute('data-rv-view'); render(); return; }

    // Comp star — click to set weight 1..5
    var cs = t.closest('[data-rv-cw]');
    if (cs) {
      var id = cs.getAttribute('data-rv-cw');
      var w = +cs.getAttribute('data-rv-w');
      var c = COMP_SET.filter(function (x) { return x.id === id; })[0];
      if (c) { c.weight = w; persistCompWeights(); bustCache(); render(); }
      return;
    }

    // Room-type selector in Calendar
    var rb = t.closest('[data-rv-rt]');
    if (rb && !t.closest('[data-rv-dec]') && !t.closest('[data-rv-over-in]')) {
      UI.roomType = rb.getAttribute('data-rv-rt');
      if (UI.view === 'calendar') render();
      return;
    }

    // Decision chip
    var db = t.closest('[data-rv-dec]');
    if (db) {
      var rt = db.getAttribute('data-rv-rt');
      var d = db.getAttribute('data-rv-d');
      var dec = db.getAttribute('data-rv-dec');
      var p = +db.getAttribute('data-rv-p');
      var existing = decisionFor(rt, d);
      if (dec === 'over') {
        // Toggle: if already overriding this night, clear it; else open the inline input
        if (existing && existing.d === 'over') { setDecision(rt, d, null); render(); return; }
        UI.overrideOpen = rt + '|' + d;
        render();
        setTimeout(function () {
          var inp = document.querySelector('[data-rv-over-in="' + rt + '|' + d + '"]');
          if (inp) { inp.focus(); inp.select(); }
        }, 20);
        return;
      }
      if (existing && existing.d === dec) { setDecision(rt, d, null); }
      else { setDecision(rt, d, dec, p); }
      UI.overrideOpen = null;
      render();
    }
  });

  // Live edits on Settings — commit on input, debounce slightly so we don't re-run the engine mid-keystroke
  var editDebounce = 0;
  function scheduleRender() {
    clearTimeout(editDebounce);
    editDebounce = setTimeout(function () { bustCache(); render(); }, 220);
  }
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var setKey = t.getAttribute('data-rv-set');
    var wgtKey = t.getAttribute('data-rv-wgt');
    if (setKey) {
      var v = parseFloat(t.value); if (!isFinite(v)) return;
      if (t.getAttribute('data-rv-unit') === 'pct') v = v / 100;
      SETTINGS[setKey] = v;
      persistSettings();
      scheduleRender();
      return;
    }
    if (wgtKey) {
      var w = Math.max(1, Math.min(5, parseInt(t.value, 10) || 1));
      SETTINGS.weights[wgtKey] = w;
      persistSettings();
      scheduleRender();
      return;
    }
  });

  // Override typed-rate input: Enter commits, Esc closes
  document.addEventListener('keydown', function (e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var key = t.getAttribute('data-rv-over-in');
    if (!key) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      var v = parseFloat(t.value); if (!isFinite(v)) return;
      var parts = key.split('|');
      setDecision(parts[0], parts[1], 'over', Math.round(v));
      UI.overrideOpen = null;
      render();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      UI.overrideOpen = null;
      render();
    }
  });

  /* ---------- register with Profit module ---------- */
  /* We also intercept Profit.show for 'rev' so we don't inherit
     the "Loading the management accounts…" flash or the loadErr
     "Management accounts not found" banner — HosREV doesn't need them. */
  function wireIn() {
    if (!window.Profit || !window.Profit.register) { setTimeout(wireIn, 50); return; }
    mergeSaved();
    window.Profit.register('rev', render);
    var orig = window.Profit.show;
    window.Profit.show = function (name) {
      if (name === 'rev') {
        if (!window.Profit.signedIn || !window.Profit.signedIn()) {
          // Let the original gate the tab (sign-in form) instead of us
          return orig.apply(window.Profit, arguments);
        }
        render();
        return;
      }
      return orig.apply(window.Profit, arguments);
    };
  }
  wireIn();

  window.HosREV = { render: render, nightsFor: nightsFor, ROOM_TYPES: ROOM_TYPES, SETTINGS: SETTINGS };
})();
