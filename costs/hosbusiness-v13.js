/* HosBUSINESS v13: layered on top of home.js. Adds date-range control, compare,
   green ticks on API-fed figures, a POS-focused Food & beverage view, and a
   Highlights block on the home dashboard. Nothing in the existing hub is replaced.

   Loads after home.js. All additions are keyed off window.Trading and window.GuestlineFeed. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ---------- small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gbp(v, dp) { if (v === null || v === undefined || !isFinite(v)) return '–'; return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function num(v) { return v === null || v === undefined || !isFinite(v) ? '–' : Math.round(v).toLocaleString('en-GB'); }
  function pc(v) { return v === null || v === undefined || !isFinite(v) ? '–' : (v * 100).toFixed(1) + '%'; }
  function pcNN(v) { return v === null || v === undefined || !isFinite(v) ? '–' : (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%'; }
  function dlabel(d) { return +d.slice(8) + ' ' + MN[+d.slice(5, 7) - 1]; }
  function dlong(d) { return DOW[new Date(d + 'T12:00:00').getDay()] + ' ' + +d.slice(8) + ' ' + MN[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4); }
  function shift(d, n) { var t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function diff(d1, d2) { return Math.round((Date.parse(d2) - Date.parse(d1)) / 864e5); }
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function r0(n) { return Math.round(n); }
  function today() { return new Date().toISOString().slice(0, 10); }

  /* ---------- styles ---------- */
  function addStyle() {
    if ($('v13-style')) return;
    var s = document.createElement('style'); s.id = 'v13-style';
    s.textContent = [
      '.v13-dr{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px;padding:12px 14px;background:#fff;border:1px solid #e4e2dc;border-radius:12px;box-shadow:0 1px 2px rgba(8,16,26,.04)}',
      '.v13-dr b{font-size:12.5px;color:#52514e;font-weight:600;letter-spacing:.3px;margin-right:4px}',
      '.v13-dr select,.v13-dr input[type=date]{font:inherit;font-size:13px;padding:6px 8px;border:1px solid #e4e2dc;border-radius:7px;background:#fff}',
      '.v13-dr .v13-chip{padding:4px 10px;border:1px solid #e4e2dc;background:#fff;border-radius:999px;font:inherit;font-size:12.5px;cursor:pointer;color:#2b2a27}',
      '.v13-dr .v13-chip.on{background:#1a2b47;color:#fff;border-color:#1a2b47}',
      '.v13-dr .v13-note{margin-left:auto;font-size:12px;color:#52514e;display:flex;align-items:center;gap:6px}',
      '.v13-tick{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#1a8f63;color:#fff;font-size:11px;font-weight:700;margin-left:6px;vertical-align:1px;line-height:16px}',
      '.v13-tick:before{content:"✓"}',
      '.v13-src{font-size:11.5px;color:#1a8f63;font-weight:600;display:inline-flex;align-items:center;gap:4px;margin-left:8px;vertical-align:middle}',
      '.v13-src.warn{color:#b9791a}',
      '.v13-hl{background:#fff;border:1px solid #e4e2dc;border-radius:14px;padding:18px 20px;margin:14px 0 18px}',
      '.v13-hl h3{margin:0 0 10px;font-size:16px;display:flex;align-items:center;gap:8px}',
      '.v13-hl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}',
      '.v13-hl-card{padding:12px 14px;background:#faf9f6;border:1px solid #efede7;border-radius:10px;border-left:3px solid #1baf7a}',
      '.v13-hl-card.warn{border-left-color:#eda100}',
      '.v13-hl-card.bad{border-left-color:#e34948}',
      '.v13-hl-card.info{border-left-color:#2a78d6}',
      '.v13-hl-card .v13-l{font-size:11.5px;color:#52514e;letter-spacing:.3px;text-transform:uppercase;font-weight:600;margin-bottom:4px}',
      '.v13-hl-card .v13-v{font-size:15px;color:#1a2b47;font-weight:600;line-height:1.3}',
      '.v13-hl-card .v13-d{font-size:12px;color:#52514e;margin-top:3px}',
      '.v13-pos-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:14px 0}',
      '.v13-pos-tile{background:#fff;border:1px solid #e4e2dc;border-radius:10px;padding:14px;cursor:pointer;transition:transform .1s,box-shadow .1s}',
      '.v13-pos-tile:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(8,16,26,.08)}',
      '.v13-pos-tile .v13-outlet{font-size:11.5px;color:#52514e;letter-spacing:.3px;text-transform:uppercase;font-weight:600;display:flex;justify-content:space-between;align-items:center}',
      '.v13-pos-tile .v13-amt{font-size:22px;font-weight:700;color:#1a2b47;margin:6px 0 3px}',
      '.v13-pos-tile .v13-cmp{font-size:12px;color:#52514e}',
      '.v13-pos-tile .v13-cmp .up{color:#1a8f63;font-weight:600}',
      '.v13-pos-tile .v13-cmp .dn{color:#e34948;font-weight:600}',
      '.v13-pos-tile.food{border-top:3px solid #1a8f63}',
      '.v13-pos-tile.drinks{border-top:3px solid #b9791a}',
      '.v13-pos-tile.breakfast{border-top:3px solid #c2417a}',
      '.v13-pos-tile.other{border-top:3px solid #6250d6}',
      '.v13-note{background:#fdf6e9;border:1px solid #f0d99f;border-radius:8px;padding:10px 14px;margin:10px 0;font-size:13px;color:#725514}',
      '.v13-split{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}',
      '.v13-split .v13-col{background:#fff;border:1px solid #e4e2dc;border-radius:10px;padding:14px}',
      '.v13-split .v13-col h4{margin:0 0 10px;font-size:14px;display:flex;justify-content:space-between;align-items:center}',
      '.v13-bar{height:28px;background:#eee;border-radius:5px;overflow:hidden;display:flex;margin:6px 0}',
      '.v13-bar>span{display:flex;align-items:center;padding:0 8px;color:#fff;font-size:12px;font-weight:600;white-space:nowrap}',
      '.v13-bar .a{background:#1baf7a}.v13-bar .b{background:#2a78d6}',
      '.v13-hero-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:#e6f4ee;color:#1a6442;border-radius:999px;font-size:12px;font-weight:600;margin-left:10px}',
      '.hp-hero h2 .v13-hero-badge{vertical-align:2px}',
      '@media (max-width:640px){.v13-split{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- state ---------- */
  var S_RANGE_KEY = 'hosbusiness_dr_v13', S_CMP_KEY = 'hosbusiness_cmp_v13';
  function getRange() { try { return JSON.parse(localStorage.getItem(S_RANGE_KEY)) || { kind: '7' }; } catch (e) { return { kind: '7' }; } }
  function setRange(r) { try { localStorage.setItem(S_RANGE_KEY, JSON.stringify(r)); } catch (e) {} }
  function getCmp() { try { return localStorage.getItem(S_CMP_KEY) || 'none'; } catch (e) { return 'none'; } }
  function setCmp(v) { try { localStorage.setItem(S_CMP_KEY, v); } catch (e) {} }

  /* ---------- date-range control ---------- */
  var RANGES = [
    ['today', 'Today'], ['1', 'Yesterday'], ['7', 'Last 7 days'], ['14', 'Last 14 days'],
    ['21', 'Last 21 days'], ['28', 'Last 28 days'], ['mtd', 'Month to date'],
    ['lastmonth', 'Last month'], ['90', 'Last 90 days'], ['ytd', 'Year to date'],
    ['12m', 'Last 12 months']
  ];
  var FORWARD = [['next7', 'Next 7 nights'], ['next14', 'Next 14 nights'], ['next21', 'Next 21 nights'], ['next28', 'Next 28 nights']];
  var CMP_OPTIONS = [
    ['none', 'No comparison'],
    ['prev', 'Previous period'],
    ['ly', 'Same period last year']
  ];

  /* Work out the start/end for a range given the hub's last-closed-day */
  function rangeDates(r, lastClosed) {
    var end = lastClosed || today();
    if (r.kind === 'custom' && r.from && r.to) return { from: r.from, to: r.to, label: dlabel(r.from) + ' to ' + dlabel(r.to), length: diff(r.from, r.to) + 1 };
    if (r.kind === 'today') return { from: today(), to: today(), label: 'Today', length: 1 };
    if (r.kind === 'mtd') { var m = end.slice(0, 7); return { from: m + '-01', to: end, label: MN[+m.slice(5) - 1] + ' ' + m.slice(0, 4) + ' to date', length: diff(m + '-01', end) + 1 }; }
    if (r.kind === 'lastmonth') { var d = new Date(end + 'T12:00:00Z'); d.setUTCDate(1); d.setUTCDate(0); var lm = d.toISOString().slice(0, 7); var first = lm + '-01'; return { from: first, to: lm + '-' + String(new Date(+lm.slice(0, 4), +lm.slice(5) % 12 ? +lm.slice(5) : 12, 0).getDate()).padStart(2, '0'), label: MN[+lm.slice(5) - 1] + ' ' + lm.slice(0, 4), length: 999 }; }
    if (r.kind === 'ytd') { var y = end.slice(0, 4); return { from: y + '-01-01', to: end, label: y + ' to date', length: diff(y + '-01-01', end) + 1 }; }
    if (r.kind === '12m') return { from: shift(end, -365), to: end, label: 'Last 12 months', length: 366 };
    if (r.kind === 'next7') return { from: shift(end, 1), to: shift(end, 7), label: 'Next 7 nights', length: 7, forward: true };
    if (r.kind === 'next14') return { from: shift(end, 1), to: shift(end, 14), label: 'Next 14 nights', length: 14, forward: true };
    if (r.kind === 'next21') return { from: shift(end, 1), to: shift(end, 21), label: 'Next 21 nights', length: 21, forward: true };
    if (r.kind === 'next28') return { from: shift(end, 1), to: shift(end, 28), label: 'Next 28 nights', length: 28, forward: true };
    var n = parseInt(r.kind, 10);
    if (isNaN(n)) n = 7;
    if (n === 1) return { from: end, to: end, label: 'Yesterday · ' + dlong(end), length: 1 };
    return { from: shift(end, -(n - 1)), to: end, label: 'Last ' + n + ' days', length: n };
  }
  function cmpDates(d, cmp) {
    if (cmp === 'ly') return { from: shift(d.from, -365), to: shift(d.to, -365), label: 'Same period last year' };
    if (cmp === 'prev') { var len = diff(d.from, d.to) + 1; return { from: shift(d.from, -len), to: shift(d.from, -1), label: 'Previous period' }; }
    return null;
  }

  /* Render the shared date-range bar as a string of HTML.
     pageKey distinguishes different areas (for forward ranges on Trading only). */
  function drBar(pageKey, opts) {
    opts = opts || {};
    var r = getRange(), cmp = getCmp();
    var includeFwd = opts.forward !== false;
    var chips = RANGES.map(function (o) { return '<button class="v13-chip' + (r.kind === o[0] ? ' on' : '') + '" data-v13-r="' + o[0] + '">' + o[1] + '</button>'; }).join('');
    var fwd = includeFwd ? FORWARD.map(function (o) { return '<button class="v13-chip' + (r.kind === o[0] ? ' on' : '') + '" data-v13-r="' + o[0] + '">' + o[1] + '</button>'; }).join('') : '';
    var cmpSel = '<label><b>Compare</b><select id="v13-cmp" data-v13-cmp>' + CMP_OPTIONS.map(function (o) { return '<option value="' + o[0] + '"' + (cmp === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    return '<div class="v13-dr" data-v13-page="' + esc(pageKey) + '"><b>Dates</b>' + chips + (fwd ? '<span style="width:12px"></span>' + fwd : '') + '<label><b>Custom</b> <input type="date" data-v13-cf value="' + (r.kind === 'custom' ? esc(r.from || '') : '') + '"> <input type="date" data-v13-ct value="' + (r.kind === 'custom' ? esc(r.to || '') : '') + '"></label>' + cmpSel + '<span class="v13-note"><span class="v13-tick"></span>Live from Guestline API</span></div>';
  }

  /* Days in S.gl.byDay within [from,to], oldest first */
  function daysIn(S, from, to) {
    if (!S.gl || !S.gl.byDay) return [];
    return Object.keys(S.gl.byDay).sort().filter(function (d) { return d >= from && d <= to; }).map(function (d) { return Object.assign({ d: d }, S.gl.byDay[d]); });
  }

  /* ---------- POS view: revenue by outlet and meal period ---------- */
  var POS_BLOCKS = [
    { key: 'rest_brk', outlet: 'Restaurant', meal: 'Breakfast', codes: ['RES1_BRK'], klass: 'breakfast' },
    { key: 'rest_lun', outlet: 'Restaurant', meal: 'Lunch', codes: ['RES1_LUN', 'RES1BEV_LUN'], klass: 'food' },
    { key: 'rest_din', outlet: 'Restaurant', meal: 'Dinner', codes: ['RES1_DIN', 'RES1BEV_DIN', 'REST_BEV'], klass: 'food' },
    { key: 'aft_tea', outlet: 'Restaurant', meal: 'Afternoon tea', codes: ['AFT_TEA'], klass: 'other' },
    { key: 'bar_lun', outlet: 'Bar', meal: 'Lunch', codes: ['BAR1_LUN', 'BAR1BEV_LUN'], klass: 'drinks' },
    { key: 'bar_din', outlet: 'Bar', meal: 'Dinner', codes: ['BAR1_DIN', 'BAR1BEV_DIN', 'BAR_BER', 'SOFT_BEV'], klass: 'drinks' },
    { key: 'rs', outlet: 'Room service', meal: '', codes: ['RS_FOOD', 'RS_BEV'], klass: 'other' },
    { key: 'funcs', outlet: 'Functions', meal: '', codes: ['FUN_LUN', 'FUN_DIN', 'FUN_BEV_LUN', 'FUN_BEV_DIN', 'BAR2_PCK', 'CON_LUN', 'CON_DIN'], klass: 'other' }
  ];
  function posForDays(days) {
    var tot = {}; POS_BLOCKS.forEach(function (b) { tot[b.key] = 0; });
    var all = 0, food = 0, drinks = 0, byOutlet = { Restaurant: 0, Bar: 0, 'Room service': 0, Functions: 0 };
    days.forEach(function (x) {
      var c = x.codes || {};
      POS_BLOCKS.forEach(function (b) {
        var v = 0; b.codes.forEach(function (k) { v += c[k] || 0; });
        tot[b.key] += v; all += v;
        if (/_BRK|_LUN|_DIN|AFT_TEA|FOOD/.test(b.codes.join())) food += v;
        if (b.klass === 'drinks' || /BEV|BER|CORK/.test(b.codes.join())) drinks += v;
        byOutlet[b.outlet] = (byOutlet[b.outlet] || 0) + v;
      });
    });
    return { byBlock: tot, all: r2(all), food: r2(food), drinks: r2(drinks), byOutlet: byOutlet };
  }

  /* Till revenue: charged-to-room vs paid-at-till (from the compact day record) */
  function tillSplit(days) {
    var r = 0, t = 0;
    days.forEach(function (x) { if (Array.isArray(x.till)) { r += x.till[0] || 0; t += x.till[1] || 0; } });
    return { room: r2(r), till: r2(t) };
  }

  function renderPosView(host, S, lastClosed) {
    var r = getRange(), cmp = getCmp();
    // sensible default for F&B POS: not forward
    if (/^next/.test(r.kind)) r = { kind: '7' };
    var d = rangeDates(r, lastClosed);
    var days = daysIn(S, d.from, d.to);
    if (!days.length) { host.innerHTML = drBar('fb_pos', { forward: false }) + '<div class="card"><h2>No Guestline data for this range</h2><p class="sub">Range: ' + esc(d.label) + '. The feed is still loading; try again in a few minutes.</p></div>'; return; }

    var p = posForDays(days);
    var h;
    var cd = cmp !== 'none' ? cmpDates(d, cmp) : null;
    var cdays = cd ? daysIn(S, cd.from, cd.to) : [];
    var cp = cdays.length ? posForDays(cdays) : null;
    var cmpNote = cd ? (cdays.length === diff(cd.from, cd.to) + 1 ? ' (' + cdays.length + ' days)' : ' (' + cdays.length + '/' + (diff(cd.from, cd.to) + 1) + ' days available)') : '';

    function cmpPill(a, b) {
      if (!b || !isFinite(b) || b === 0) return '';
      var v = (a - b) / Math.abs(b);
      return '<span class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(0) + '%</span>';
    }
    h = '<div class="segs"><button class="seg on" data-fb="pos">POS <span class="v13-tick" style="width:14px;height:14px;font-size:9.5px"></span></button>' +
      '<button class="seg" data-fb="over">Overview</button>' +
      '<button class="seg" data-fb="term">By terminal</button>' +
      '<button class="seg" data-fb="brk">Breakfast</button>' +
      '<button class="seg" data-fb="menu">What we sell</button></div>' +
      drBar('fb_pos', { forward: false });

    h += '<div class="v13-note"><b>Note.</b> The bar till posts to the restaurant analysis codes (RES1*) rather than the bar codes (BAR1*). Until Patrik fixes the till mapping, food and drink shown under Restaurant include sales that happened at the bar. The totals and the "Charged to room vs paid at till" split are not affected.</div>';

    // tiles per block
    h += '<div class="v13-pos-grid">';
    POS_BLOCKS.forEach(function (b) {
      var v = p.byBlock[b.key], cv = cp ? cp.byBlock[b.key] : null;
      h += '<div class="v13-pos-tile ' + b.klass + '">' +
        '<div class="v13-outlet"><span>' + esc(b.outlet) + (b.meal ? ' · ' + b.meal : '') + '</span><span class="v13-tick" title="Live from Guestline API"></span></div>' +
        '<div class="v13-amt">' + gbp(v) + '</div>' +
        '<div class="v13-cmp">' + (cv !== null ? gbp(cv) + ' ' + cmpPill(v, cv) : '&nbsp;') + '</div>' +
        '</div>';
    });
    h += '</div>';

    // outlet share row (food, drinks, breakfast)
    h += '<div class="v13-split">' +
      '<div class="v13-col"><h4>Food vs drinks <span class="v13-tick"></span></h4>' + barPair(p.food, p.drinks, 'Food ' + gbp(p.food), 'Drinks ' + gbp(p.drinks)) + '<p class="note" style="margin:4px 0 0">Net of VAT · ' + esc(d.label) + '</p></div>' +
      '<div class="v13-col"><h4>By outlet <span class="v13-tick"></span></h4>' + outletTable(p.byOutlet, p.all) + '</div>' +
      '</div>';

    // residents (room) vs non-residents (till)
    var t = tillSplit(days);
    h += '<div class="v13-split">' +
      '<div class="v13-col"><h4>Charged to room vs paid at the till <span class="v13-tick"></span></h4>' + barPair(t.room, t.till, 'Room ' + gbp(t.room), 'Till ' + gbp(t.till)) +
      '<p class="note" style="margin:6px 0 0">From the item lines. "Room" means added to a guest folio and settled on check-out; "Till" means paid at the point of sale. Does not include automatic postings (breakfasts in the rate and package meals).</p></div>' +
      '<div class="v13-col"><h4>Breakfast <span class="v13-tick"></span></h4>' + breakfastBlock(days) + '</div>' +
      '</div>';

    // Best-selling items for the last closed day (Guestline API)
    var items = window.GuestlineFeed && window.GuestlineFeed.items ? window.GuestlineFeed.items() : null;
    var itemsDate = window.GuestlineFeed && window.GuestlineFeed.itemsDate ? window.GuestlineFeed.itemsDate() : null;
    if (items && items.length) {
      h += renderItemsBlock(items, itemsDate);
    }

    // sales line table
    var lines = [];
    POS_BLOCKS.forEach(function (b) {
      var v = p.byBlock[b.key]; if (v) lines.push({ outlet: b.outlet, meal: b.meal || '–', net: v, codes: b.codes.join(', '), klass: b.klass });
    });
    lines.sort(function (a, b) { return b.net - a.net; });
    h += '<div class="v13-col" style="margin:14px 0"><h4>Sales by outlet and meal period <span class="v13-tick"></span></h4><div class="scroll"><table><tr><th>Outlet</th><th>Meal</th><th class="n">Net</th><th class="n">% of F&amp;B</th><th>Analysis codes</th></tr>' +
      lines.map(function (l) { return '<tr><td>' + esc(l.outlet) + '</td><td>' + esc(l.meal) + '</td><td class="n">' + gbp(l.net) + '</td><td class="n">' + pc(p.all ? l.net / p.all : null) + '</td><td class="note" style="font-family:monospace;font-size:11px">' + esc(l.codes) + '</td></tr>'; }).join('') +
      '</table></div><p class="note">' + cmpNote + '. Source: Guestline Rezlynx Financial Report, analysis code totals.</p></div>';

    host.innerHTML = h;
  }
  /* Items drill-down: dishes and drinks sold on the last closed day (Guestline API).
     Groups by outlet (Food/Drinks/Breakfast) and by item name, with qty and value. */
  function renderItemsBlock(items, date) {
    // Classify each code into an outlet group
    var GROUP = {
      RES1_BRK: 'Breakfast', AFT_TEA: 'Afternoon tea',
      RES1_LUN: 'Restaurant food', RES1_DIN: 'Restaurant food', RS_FOOD: 'Room service',
      BAR1_LUN: 'Bar food', BAR1_DIN: 'Bar food',
      RES1BEV_LUN: 'Restaurant drinks', RES1BEV_DIN: 'Restaurant drinks', REST_BEV: 'Restaurant drinks',
      BAR1BEV_LUN: 'Bar drinks', BAR1BEV_DIN: 'Bar drinks', BAR_BER: 'Bar drinks', SOFT_BEV: 'Bar drinks', CORK: 'Bar drinks', BAR2_PCK: 'Bar drinks',
      RS_BEV: 'Room service', FUN_LUN: 'Functions', FUN_DIN: 'Functions', FUN_BEV_LUN: 'Functions', FUN_BEV_DIN: 'Functions',
      CON_LUN: 'Conference', CON_DIN: 'Conference', PKL_FOOD: 'Pack lunches', PKL_BEV: 'Pack lunches'
    };
    // byGroup -> { group: { name: { q, n, c } } }
    var byGroup = {}, totalN = 0, totalQ = 0;
    items.forEach(function (it) {
      var g = GROUP[it.c] || it.c;
      byGroup[g] = byGroup[g] || {};
      var k = it.d || '(unnamed)';
      var r = byGroup[g][k] || (byGroup[g][k] = { q: 0, n: 0, c: it.c });
      r.q += it.q || 0; r.n += it.n || 0;
      totalN += it.n || 0; totalQ += it.q || 0;
    });
    // Sort each group's items by net desc, take top N
    var groupList = Object.keys(byGroup).map(function (g) {
      var rows = Object.keys(byGroup[g]).map(function (k) { return Object.assign({ d: k }, byGroup[g][k]); });
      var gn = rows.reduce(function (s, x) { return s + x.n; }, 0), gq = rows.reduce(function (s, x) { return s + x.q; }, 0);
      rows.sort(function (a, b) { return b.n - a.n; });
      return { g: g, rows: rows, gn: r2(gn), gq: gq };
    }).sort(function (a, b) { return b.gn - a.gn; });

    var dateLabel = date ? dlong(date) : 'last closed day';
    var h = '<div class="v13-col" style="margin:14px 0"><h4>What sold on ' + esc(dateLabel) + ' <span class="v13-tick"></span></h4>';
    h += '<p class="note" style="margin:0 0 10px">Individual dishes and drinks from Guestline\'s item lines, ' + items.length + ' postings totalling ' + gbp(totalN) + ' net across ' + groupList.length + ' outlet groups. Automatic breakfast postings are shown as "Breakfast · Adult".</p>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px">';
    groupList.forEach(function (g) {
      var topN = g.rows.slice(0, 10);
      h += '<div style="background:#faf9f6;border:1px solid #efede7;border-radius:10px;padding:12px 14px">';
      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><b>' + esc(g.g) + '</b><span style="color:#52514e;font-size:12px">' + num(g.gq) + ' items · ' + gbp(g.gn) + '</span></div>';
      h += '<table style="width:100%;font-size:12.5px"><tr><th style="text-align:left">Item</th><th class="n">Qty</th><th class="n">Net</th><th class="n">Avg</th></tr>';
      topN.forEach(function (r) {
        var avg = r.q ? r.n / r.q : null;
        h += '<tr><td style="padding:3px 0">' + esc(r.d).slice(0, 48) + '</td><td class="n">' + num(r.q) + '</td><td class="n">' + gbp(r.n) + '</td><td class="n">' + gbp(avg, 2) + '</td></tr>';
      });
      if (g.rows.length > 10) h += '<tr><td colspan="4" class="note" style="padding-top:4px">+ ' + (g.rows.length - 10) + ' more</td></tr>';
      h += '</table></div>';
    });
    h += '</div>';
    h += '<p class="note" style="margin-top:8px">Totals: <b>' + num(totalQ) + '</b> items for <b>' + gbp(totalN) + '</b> on ' + esc(dateLabel) + '. Source: Guestline Rezlynx Financial Report, transaction lines (HOSPRO_ITEMS template).</p>';
    h += '</div>';
    return h;
  }

  function barPair(a, b, la, lb) {
    var t = a + b; if (!t) return '<p class="note">No sales in this range.</p>';
    return '<div class="v13-bar"><span class="a" style="width:' + pcInt(a / t) + '%">' + esc(la) + '</span><span class="b" style="width:' + pcInt(b / t) + '%">' + esc(lb) + '</span></div>';
  }
  function pcInt(v) { return (v * 100).toFixed(0); }
  function outletTable(byO, total) {
    var ks = Object.keys(byO).sort(function (a, b) { return byO[b] - byO[a]; }).filter(function (k) { return byO[k] > 0; });
    return '<table style="width:100%"><tr><th>Outlet</th><th class="n">Net</th><th class="n">%</th></tr>' + ks.map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="n">' + gbp(byO[k]) + '</td><td class="n">' + pc(total ? byO[k] / total : null) + '</td></tr>'; }).join('') + '</table>';
  }
  function breakfastBlock(days) {
    var inr = 0, inrv = 0, paid = 0, paidv = 0;
    days.forEach(function (x) { if (Array.isArray(x.bk)) { inr += x.bk[0] || 0; inrv += x.bk[1] || 0; paid += Math.max(0, x.bk[2] || 0); paidv += Math.max(0, x.bk[3] || 0); } });
    var tot = inr + paid, tv = inrv + paidv;
    if (!tot) return '<p class="note">No breakfast lines in this range.</p>';
    return '<div class="v13-bar"><span class="a" style="width:' + pcInt(inr / tot) + '%">In rate ' + inr + '</span><span class="b" style="width:' + pcInt(paid / tot) + '%">Paid ' + paid + '</span></div>' +
      '<p class="note" style="margin-top:6px"><b>' + inr + '</b> in the rate · <b>' + paid + '</b> paid on the day · ' + gbp(tv) + ' total · ' + gbp(days.length ? tv / days.length : null) + ' a day average</p>';
  }

  /* ---------- Highlights block for home ---------- */
  function buildHighlights(S, lastClosed) {
    var r = getRange(), d = rangeDates(/^next/.test(r.kind) ? { kind: '7' } : r, lastClosed);
    var days = daysIn(S, d.from, d.to);
    if (!days.length || !S.af) return '';
    var out = [];
    // Yesterday vs same day last week (if range is 1 or today)
    var yesterday = lastClosed, lw = shift(yesterday, -7);
    var y = days[days.length - 1], ylw = (S.gl && S.gl.byDay[lw]) ? S.gl.byDay[lw] : null;
    if (y && ylw) {
      var yNet = y.net || 0, lwNet = ylw.net || 0;
      var vLY = yNet - lwNet, pLY = lwNet ? vLY / lwNet : null;
      out.push({ k: Math.abs(pLY || 0) > 0.1 ? (pLY > 0 ? 'info' : 'warn') : 'info', l: 'Yesterday vs same day last week', v: gbp(yNet) + ' ' + (pLY !== null ? '<span class="' + (pLY >= 0 ? 'up' : 'dn') + '">' + pcNN(pLY) + '</span>' : ''), d: dlong(yesterday) + ' against ' + dlong(lw) });
    }
    // Rooms sold average
    var totSold = 0, totOos = 0; days.forEach(function (x) { totSold += x.sold || 0; totOos += x.oos || 0; });
    var avgSold = days.length ? totSold / days.length : 0;
    out.push({ k: 'info', l: 'Average rooms sold', v: avgSold.toFixed(1) + ' of 120', d: 'Across ' + days.length + ' night' + (days.length > 1 ? 's' : '') + ' (' + d.label + ')' });
    // Out of service value
    if (totOos && days.length) {
      var avgAdr = 0, n = 0; days.forEach(function (x) { if (x.adr) { avgAdr += x.adr; n++; } }); avgAdr = n ? avgAdr / n : 70;
      var oosVal = totOos * avgAdr;
      out.push({ k: oosVal > 5000 ? 'bad' : 'warn', l: 'Out-of-service revenue lost', v: gbp(oosVal), d: totOos + ' room-nights at the period ADR of ' + gbp(avgAdr, 2) });
    }
    // Best booking source for the range
    if (y && y.media) {
      var top = Object.keys(y.media).filter(function (k) { return k !== '_none'; }).sort(function (a, b) { return y.media[b] - y.media[a]; })[0];
      if (top) out.push({ k: 'info', l: 'Top booking source yesterday', v: top + ' · ' + gbp(y.media[top]), d: 'Accommodation revenue through this channel' });
    }
    // Best segment for the range
    if (y && y.roomsBySeg) {
      var top2 = Object.keys(y.roomsBySeg).sort(function (a, b) { return y.roomsBySeg[b] - y.roomsBySeg[a]; })[0];
      if (top2) out.push({ k: 'info', l: 'Top segment yesterday', v: top2 + ' · ' + y.roomsBySeg[top2] + ' rooms', d: pc(y.sold ? y.roomsBySeg[top2] / y.sold : null) + ' of rooms sold' });
    }
    // Breakfast conversion
    var inr = 0, paid = 0; days.forEach(function (x) { if (Array.isArray(x.bk)) { inr += x.bk[0] || 0; paid += Math.max(0, x.bk[2] || 0); } });
    if (inr + paid) {
      var rate = (inr + paid) / (days.length ? days.reduce(function (s, x) { return s + (x.sold || 0); }, 0) : 1);
      out.push({ k: 'info', l: 'Breakfast take-up', v: pc(rate), d: (inr + paid) + ' breakfasts over ' + days.length + ' nights' });
    }
    if (!out.length) return '';
    return '<div class="v13-hl"><h3>Highlights <span class="v13-src">Guestline API</span></h3><div class="v13-hl-grid">' +
      out.map(function (x) { return '<div class="v13-hl-card ' + x.k + '"><div class="v13-l">' + esc(x.l) + '</div><div class="v13-v">' + x.v + '</div><div class="v13-d">' + esc(x.d) + '</div></div>'; }).join('') +
      '</div></div>';
  }

  /* ---------- hooks: F&B view switch, home augment, event wiring ---------- */
  function lastClosed() {
    var S = window.Trading && window.Trading.S ? window.Trading.S() : {};
    if (S.gl && S.gl.to) return S.gl.to;
    if (S.af && S.af.rows && S.af.rows.length) {
      var cut = window.Trading.asOfDay();
      var yd = S.af.rows.filter(function (r) { return r.d < cut; }).slice(-1)[0];
      return yd ? yd.d : null;
    }
    return null;
  }

  function augmentHome() {
    var el = $('pf-home'); if (!el) return;
    var S = window.Trading && window.Trading.S ? window.Trading.S() : {}, lc = lastClosed();
    // Add "Live" badge next to the greeting if the API is connected
    var hero = el.querySelector('.hp-hero h2');
    var G = window.GuestlineFeed && window.GuestlineFeed.info();
    if (hero && G && G.days && !hero.querySelector('.v13-hero-badge')) {
      hero.insertAdjacentHTML('beforeend', '<span class="v13-hero-badge">● Live from Guestline · ' + (G.days || 0) + ' days loaded' + (G.loading ? ' · still loading history' : '') + '</span>');
    }
    // Insert date range + Highlights block before hp-cards
    var cards = el.querySelector('.hp-cards'), hlHtml = buildHighlights(S, lc);
    if (cards) {
      var existingHl = el.querySelector('.v13-hl'); if (existingHl) existingHl.remove();
      var existingDr = el.querySelector('.v13-dr[data-v13-page="home"]'); if (existingDr) existingDr.remove();
      if (hlHtml) cards.insertAdjacentHTML('beforebegin', drBar('home', { forward: false }) + hlHtml);
    }
    // Add green ticks to the "Latest trading position" header
    var today = el.querySelector('.hp-today h3');
    if (today && !today.querySelector('.v13-src')) today.insertAdjacentHTML('beforeend', ' <span class="v13-src">Guestline API ●</span>');
  }

  function augmentTrading() {
    var el = $('pf-trading'); if (!el) return;
    if (!el.querySelector('.filters')) return;             // Trading view not rendered yet
    var existing = el.querySelector('.v13-trading-head');
    if (existing) existing.remove();                        // always re-augment to pick up range changes

    var S = window.Trading && window.Trading.S ? window.Trading.S() : {};
    var lc = lastClosed(); if (!lc) return;
    var r = getRange(), d = rangeDates(r, lc), cmp = getCmp();
    var tally = tradingTally(S, d.from, d.to);
    var cd = cmp !== 'none' ? cmpDates(d, cmp) : null;
    var ctally = cd ? tradingTally(S, cd.from, cd.to) : null;

    var ok = tally.nights > 0;
    function cmpLine(label, a, b, formatter) {
      if (!b || !isFinite(b) || b === 0) return '';
      var v = (a - b) / Math.abs(b);
      var cls = v >= 0 ? 'up' : 'dn';
      return '<span class="v13-cmp" style="font-size:11.5px"><span class="' + cls + '">' + (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%</span> vs ' + (cd ? cd.label : '') + '</span>';
    }
    var h = drBar('trading');
    h += '<div style="background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:16px 18px;margin:0 0 14px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><b>Trading summary <span class="v13-src">Guestline API ●</span></b><span class="note" style="margin:0">' + esc(d.label) + ' · ' + tally.nights + ' night' + (tally.nights === 1 ? '' : 's') + '</span></div>';
    if (!ok) {
      h += '<p class="note">No data from the API for this range yet. The feed may still be loading; try again shortly.</p>';
    } else {
      h += '<div class="tiles">' +
        '<div class="tile"><div class="l">Rooms sold <span class="v13-tick"></span></div><div class="v">' + num(tally.rooms) + '</div><div class="d">' + pc(tally.occ) + ' occupancy on 120 rooms ' + (ctally ? cmpLine('rooms', tally.rooms, ctally.rooms) : '') + '</div></div>' +
        '<div class="tile"><div class="l">ADR <span class="v13-tick"></span></div><div class="v">' + gbp(tally.adr, 2) + '</div><div class="d">' + (ctally ? cmpLine('adr', tally.adr, ctally.adr) : '') + '</div></div>' +
        '<div class="tile"><div class="l">RevPAR <span class="v13-tick"></span></div><div class="v">' + gbp(tally.revpar, 2) + '</div><div class="d">rooms revenue per available ' + (ctally ? cmpLine('revpar', tally.revpar, ctally.revpar) : '') + '</div></div>' +
        '<div class="tile"><div class="l">TRevPAR <span class="v13-tick"></span></div><div class="v">' + gbp(tally.trevpar, 2) + '</div><div class="d">all revenue per available ' + (ctally ? cmpLine('trevpar', tally.trevpar, ctally.trevpar) : '') + '</div></div>' +
        '<div class="tile"><div class="l">Total revenue <span class="v13-tick"></span></div><div class="v">' + gbp(tally.total) + '</div><div class="d">rooms ' + gbp(tally.acc) + ' · F&amp;B ' + gbp(tally.fb) + ' · other ' + gbp(tally.oth) + ' ' + (ctally ? cmpLine('total', tally.total, ctally.total) : '') + '</div></div>' +
        '<div class="tile"><div class="l">Out of service <span class="v13-tick"></span></div><div class="v">' + num(tally.oos) + '</div><div class="d">room-nights ' + (tally.adr ? '· valued ' + gbp(tally.oos * tally.adr) + ' at ADR' : '') + '</div></div>' +
        '</div>';
      if (ctally) {
        h += '<p class="note" style="margin-top:10px"><b>' + esc(cd.label) + ':</b> ' + ctally.nights + ' nights, ' + num(ctally.rooms) + ' rooms sold at ' + gbp(ctally.adr, 2) + ' ADR, ' + gbp(ctally.total) + ' total revenue.</p>';
      }
    }
    h += '</div>';
    var block = document.createElement('div');
    block.className = 'v13-trading-head';
    block.innerHTML = h;
    el.insertBefore(block, el.firstChild);
  }
  function tradingTally(S, from, to) {
    var days = daysIn(S, from, to);
    var acc = 0, fb = 0, oth = 0, rooms = 0, oos = 0;
    days.forEach(function (x) {
      var g = x.groups || {};
      var codes = x.codes || {};
      var hire = codes.ROOM_HIRE || 0;
      var roomsRev = ((g.ACCOM && g.ACCOM.n) || 0) - hire;
      var foodRev = (g.FOOD && g.FOOD.n) || 0;
      var bevRev = (g.BEVERAGE && g.BEVERAGE.n) || 0;
      var confRev = (g.CONFERENCE && g.CONFERENCE.n) || 0;
      var miscRev = (g.MISC && g.MISC.n) || 0;
      var sundRev = (g.SUNDRIES && g.SUNDRIES.n) || 0;
      acc += roomsRev; fb += foodRev + bevRev; oth += hire + confRev + miscRev + sundRev;
      rooms += x.sold || 0; oos += x.oos || 0;
    });
    var total = acc + fb + oth, nights = days.length, avail = 120 * nights;
    return {
      nights: nights, rooms: rooms, acc: r2(acc), fb: r2(fb), oth: r2(oth), total: r2(total), oos: oos,
      occ: avail ? rooms / avail : null,
      adr: rooms ? acc / rooms : null,
      revpar: avail ? acc / avail : null,
      trevpar: avail ? total / avail : null
    };
  }

  function augmentFb() {
    var el = $('pf-fb'); if (!el) return;
    // Add our POS tab button to the existing segs if not there
    var seg = el.querySelector('.segs');
    if (seg && !seg.querySelector('[data-fb="pos"]')) {
      var btn = document.createElement('button');
      btn.className = 'seg'; btn.setAttribute('data-fb', 'pos');
      btn.innerHTML = 'POS <span class="v13-tick" style="width:14px;height:14px;font-size:9.5px" title="Live from Guestline API"></span>';
      seg.insertBefore(btn, seg.firstChild);
    }
  }

  var currentFb = null;
  function tryRenderPos() {
    var fbEl = $('pf-fb'); if (!fbEl) return;
    var active = fbEl.querySelector('.seg.on');
    // If the active seg has been swapped to 'pos', render POS; otherwise leave the original renderFb alone
    if (active && active.getAttribute('data-fb') === 'pos') {
      var S = window.Trading && window.Trading.S ? window.Trading.S() : {};
      renderPosView(fbEl, S, lastClosed());
    }
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var r = e.target.closest ? e.target.closest('[data-v13-r]') : null;
      if (r) {
        setRange({ kind: r.getAttribute('data-v13-r') });
        reRender();
        return;
      }
      var fb = e.target.closest ? e.target.closest('[data-fb]') : null;
      if (fb && fb.getAttribute('data-fb') === 'pos') {
        // make POS active and render our view; stop the hub's own click handler from running renderFb
        e.stopPropagation(); e.preventDefault();
        var el = $('pf-fb'); if (!el) return;
        // go to F&B tab first if we're not on it
        if (!document.querySelector('#t-pf-fb.on')) { var navBtn = document.querySelector('#nav button[data-t="pf-fb"]'); if (navBtn) navBtn.click(); }
        Array.from(el.querySelectorAll('.seg')).forEach(function (b) { b.classList.remove('on'); });
        fb.classList.add('on');
        setTimeout(function () { var S = window.Trading ? window.Trading.S() : {}; renderPosView(el, S, lastClosed()); }, 40);
      }
    }, true);
    document.addEventListener('change', function (e) {
      if (e.target && e.target.hasAttribute('data-v13-cmp')) { setCmp(e.target.value); reRender(); return; }
      if (e.target && e.target.hasAttribute('data-v13-cf')) { var r = getRange(); setRange({ kind: 'custom', from: e.target.value, to: r.to || today() }); reRender(); return; }
      if (e.target && e.target.hasAttribute('data-v13-ct')) { var r2 = getRange(); setRange({ kind: 'custom', from: r2.from || today(), to: e.target.value }); reRender(); return; }
    }, true);
  }
  function reRender() {
    var fbEl = $('pf-fb');
    if (fbEl && fbEl.closest('section.tab.on')) {
      var active = fbEl.querySelector('.seg.on');
      if (active && active.getAttribute('data-fb') === 'pos') { var S = window.Trading ? window.Trading.S() : {}; renderPosView(fbEl, S, lastClosed()); return; }
    }
    // Home: re-augment in place (the hl block depends on the range)
    var homeEl = $('pf-home');
    if (homeEl && homeEl.closest('section.tab.on')) {
      augmentHome();
      return;
    }
    // Trading: remove old augmentation and re-augment
    var trEl = $('pf-trading');
    if (trEl && trEl.closest('section.tab.on')) {
      var old = trEl.querySelector('.v13-trading-head'); if (old) old.remove();
      augmentTrading();
      return;
    }
    // Else force re-render of the active tab
    var active2 = document.querySelector('section.tab.on');
    if (active2 && window.Profit && window.Profit.show && active2.id.indexOf('t-pf-') === 0) {
      var name = active2.id.slice(5); window.Profit.show(name);
      setTimeout(function () { augmentHome(); augmentFb(); }, 50);
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    addStyle();
    wire();
    var moT = 0;
    var mo = new MutationObserver(function (muts) {
      // ignore mutations we caused
      var ours = muts.every(function (m) { return Array.from(m.addedNodes || []).every(function (n) { return n && n.nodeType === 1 && (n.classList && (n.classList.contains('v13-hl') || n.classList.contains('v13-hero-badge') || n.classList.contains('v13-src'))); }); });
      if (ours) return;
      clearTimeout(moT); moT = setTimeout(function () { augmentHome(); augmentFb(); augmentTrading(); }, 150);
    });
    if (document.body) mo.observe(document.body, { subtree: true, childList: true });
    augmentHome(); augmentFb(); augmentTrading();
    // After guestline feed loads, re-augment
    document.addEventListener('hub-signin', function () { setTimeout(function () { augmentHome(); augmentFb(); }, 1200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
