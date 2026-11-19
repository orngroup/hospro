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
      /* v18: smaller trading position tiles, hide hp-cards duplication */
      'body.v16 #pf-home .hp-cards,body.v16 #pf-home .hp-foot{display:none!important}',
      'body.v16 #pf-home .hp-today .tiles{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}',
      'body.v16 #pf-home .hp-today .tile,body.v16 #pf-home .hp-today .tile.click{padding:10px 12px}',
      'body.v16 #pf-home .hp-today .tile .l{font-size:11px;letter-spacing:.2px}',
      'body.v16 #pf-home .hp-today .tile .v{font-size:19px;line-height:1.15;margin:3px 0 1px}',
      'body.v16 #pf-home .hp-today .tile .d{font-size:11px;line-height:1.3}',
      'body.v16 #pf-home .hp-today .tile .v small{font-size:11px;font-weight:400;color:#86847d;margin-left:4px}',
      'body.v16 #pf-home .hp-today .tile .v span{font-size:14px;color:#52514e;font-weight:600;margin-left:6px}',
      /* smaller header */
      'body.v16 #pf-home .hp-today .hp-th{padding:10px 14px}',
      'body.v16 #pf-home .hp-today .hp-th h3{font-size:15px}',
      'body.v16 #pf-home .hp-today .hp-th p{font-size:12.5px}',
      /* v18: F&B range summary strip */
      '.v18-fb-strip{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:14px 18px;margin:0 0 14px}',
      '.v18-fb-strip h3{margin:0 0 10px;font-size:15px;display:flex;align-items:center;gap:8px}',
      '.v18-fb-strip .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}',
      '.v18-fb-strip .tile{background:#faf9f6;border:1px solid #efede7;border-radius:9px;padding:10px 12px}',
      '.v18-fb-strip .tile .l{font-size:11px;color:#52514e;letter-spacing:.2px;text-transform:uppercase;font-weight:600}',
      '.v18-fb-strip .tile .v{font-size:19px;font-weight:700;color:#1a2b47;margin:3px 0 1px}',
      '.v18-fb-strip .tile .d{font-size:11px;color:#52514e;line-height:1.3}',
      '.v18-cmp{font-size:10.5px;margin-left:6px}',
      '.v18-cmp .up{color:#1a8f63;font-weight:600}',
      '.v18-cmp .dn{color:#e34948;font-weight:600}',

      '.v13-split .v13-col{background:#fff;border:1px solid #e4e2dc;border-radius:10px;padding:14px}',
      '.v13-split .v13-col h4{margin:0 0 10px;font-size:14px;display:flex;justify-content:space-between;align-items:center}',
      '.v13-bar{height:28px;background:#eee;border-radius:5px;overflow:hidden;display:flex;margin:6px 0}',
      '.v13-bar>span{display:flex;align-items:center;padding:0 8px;color:#fff;font-size:12px;font-weight:600;white-space:nowrap}',
      '.v13-bar .a{background:#1baf7a}.v13-bar .b{background:#2a78d6}',
      '.v13-hero-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:#e6f4ee;color:#1a6442;border-radius:999px;font-size:12px;font-weight:600;margin-left:10px}',
      '.hp-hero h2 .v13-hero-badge{vertical-align:2px}',
      '@media (max-width:640px){.v13-split{grid-template-columns:1fr}}',
      /* v16 layout: sidebar on left, sticky top bar */
      'body.v16 #top{display:none}',
      'body.v16 main{margin-left:260px;padding-top:64px;padding-left:28px;padding-right:28px;padding-bottom:40px;background:#f5f4ef;min-height:100vh}',
      'body.v16 #crumb{display:none !important}',
      'body.v16 .v16-side{position:fixed;left:0;top:0;width:260px;height:100vh;background:#1a2b47;color:#fff;overflow-y:auto;z-index:30;display:flex;flex-direction:column}',
      'body.v16 .v16-brand{padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px}',
      'body.v16 .v16-brand img{height:34px}',
      'body.v16 .v16-brand b{font-size:15px;font-weight:600;line-height:1.1}',
      'body.v16 .v16-brand b i{color:#BB9979;font-style:normal;font-weight:800}',
      'body.v16 .v16-brand small{display:block;font-size:11px;color:#c7d2e0;letter-spacing:.3px;margin-top:2px}',
      'body.v16 .v16-sidelist{flex:1;padding:8px 10px}',
      'body.v16 .v16-item{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;color:#d5dde8;padding:9px 10px;border-radius:7px;cursor:pointer;font:inherit;font-size:13.5px;text-align:left;margin-bottom:2px;transition:background .15s}',
      'body.v16 .v16-item:hover{background:rgba(255,255,255,.07);color:#fff}',
      'body.v16 .v16-item.on{background:#BB9979;color:#1a2b47;font-weight:700}',
      'body.v16 .v16-item.on .v16-sub{color:rgba(26,43,71,.7)}',
      'body.v16 .v16-item .v16-ic{width:26px;height:26px;border-radius:5px;flex:none}',
      'body.v16 .v16-item div{flex:1;min-width:0}',
      'body.v16 .v16-item b{display:block;font-weight:600;font-size:13.5px;line-height:1.1}',
      'body.v16 .v16-item .v16-sub{display:block;font-size:11px;color:rgba(255,255,255,.55);margin-top:2px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      'body.v16 .v16-side-sec{padding:12px 20px 4px 20px;font-size:10.5px;letter-spacing:1.2px;color:#8fa4bf;text-transform:uppercase;font-weight:700}',
      'body.v16 .v16-foot{padding:10px 14px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:#c7d2e0;display:flex;justify-content:space-between;align-items:center}',
      'body.v16 .v16-foot button{background:rgba(255,255,255,.08);color:#fff;border:0;padding:6px 10px;border-radius:6px;font:inherit;font-size:11.5px;cursor:pointer}',
      'body.v16 .v16-top{position:fixed;left:260px;right:0;top:0;height:64px;background:#fff;border-bottom:1px solid #e4e2dc;z-index:20;display:flex;align-items:center;padding:0 24px;gap:14px;box-shadow:0 1px 3px rgba(8,16,26,.05)}',
      'body.v16 .v16-top h1{margin:0;font-size:17px;font-weight:600;color:#1a2b47;white-space:nowrap}',
      'body.v16 .v16-top h1 small{font-size:12px;color:#86847d;font-weight:400;margin-left:8px}',
      'body.v16 .v16-top .v16-top-filters{margin-left:auto;display:flex;align-items:center;gap:8px;overflow-x:auto;max-width:65vw}',
      'body.v16 .v16-top .v16-top-filters::-webkit-scrollbar{height:4px}',
      'body.v16 .v16-top select{font:inherit;font-size:12.5px;padding:5px 7px;border:1px solid #e4e2dc;border-radius:6px;background:#fff}',
      'body.v16 .v16-top .v16-chip{padding:5px 10px;border:1px solid #e4e2dc;background:#fff;border-radius:999px;font:inherit;font-size:12px;cursor:pointer;color:#2b2a27;white-space:nowrap}',
      'body.v16 .v16-top .v16-chip.on{background:#1a2b47;color:#fff;border-color:#1a2b47}',
      'body.v16 .v16-top .v16-chip-g{color:#1a8f63}',
      'body.v16 .v16-top .v16-feed{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;background:#e6f4ee;color:#1a6442;white-space:nowrap}',
      'body.v16 .v16-top .v16-feed::before{content:"●";color:#1a8f63}',
      'body.v16 #top>.top-r{display:none}',   /* duplicate who/signout line shown in sidebar now */
      'body.v16 .v13-dr{margin:14px 0 18px}',
      'body.v16 .back{display:none !important}',
      '@media (max-width:860px){body.v16 main{margin-left:0;padding-top:120px}body.v16 .v16-side{top:auto;bottom:0;left:0;right:0;width:100%;height:auto;flex-direction:row;overflow-x:auto;overflow-y:hidden}body.v16 .v16-brand,body.v16 .v16-foot{display:none}body.v16 .v16-sidelist{display:flex;gap:4px}body.v16 .v16-item{min-width:110px}body.v16 .v16-top{left:0}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- state ---------- */
  var S_RANGE_KEY = 'hosbusiness_dr_v13', S_CMP_KEY = 'hosbusiness_cmp_v13';
  function getRange() { try { return JSON.parse(localStorage.getItem(S_RANGE_KEY)) || { kind: '1' }; } catch (e) { return { kind: '1' }; } }
  function setRange(r) { try { localStorage.setItem(S_RANGE_KEY, JSON.stringify(r)); } catch (e) {} }
  function getCmp() { try { return localStorage.getItem(S_CMP_KEY) || 'none'; } catch (e) { return 'none'; } }
  function setCmp(v) { try { localStorage.setItem(S_CMP_KEY, v); } catch (e) {} }

  /* ---------- date-range control ---------- */
  var RANGES = [
    ['1', 'Yesterday'], ['7', 'Last 7 days'], ['14', 'Last 14 days'],
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

    // Items drill-down (date-picker driven): shows what sold on the chosen day
    h += '<div id="v13-items-wrap"></div>';

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
    initItemsBlock(lastClosed);
  }
  // Day picker + fetch for the items block inside POS.
  function initItemsBlock(initDate) {
    var wrap = $('v13-items-wrap'); if (!wrap) return;
    var G = window.GuestlineFeed;
    var pickDate = initDate || (G && G.itemsDate && G.itemsDate());
    var S = window.Trading ? window.Trading.S() : {};
    var dates = S.gl && S.gl.byDay ? Object.keys(S.gl.byDay).sort().slice(-180) : [];
    if (!pickDate && dates.length) pickDate = dates[dates.length - 1];
    if (!pickDate) { wrap.innerHTML = ''; return; }
    var opts = dates.slice().reverse().map(function (x) { return '<option value="' + x + '"' + (x === pickDate ? ' selected' : '') + '>' + dlong(x) + '</option>'; }).join('');
    wrap.innerHTML = '<div class="v13-col" style="margin:14px 0"><h4>What sold on <select id="v13-itemsday" style="font:inherit;font-size:14px;padding:3px 6px;border:1px solid #e4e2dc;border-radius:6px;background:#fff;font-weight:600;color:#1a2b47">' + opts + '</select> <span class="v13-tick"></span></h4><div id="v13-items-body"><p class="note">Loading items…</p></div></div>';
    function show(data) {
      var body = $('v13-items-body'); if (!body) return;
      if (!data || !data.found || !data.items || !data.items.length) { body.innerHTML = '<p class="note">No item lines on file for this date. The feed may not have loaded this day yet, or Guestline posted no items.</p>'; return; }
      body.innerHTML = renderItemsBody(data.items, data.date, data.rates || [], data.lines || data.items.length);
    }
    var recent = G && G.items ? G.items() : null, recentDate = G && G.itemsDate ? G.itemsDate() : null;
    if (recent && pickDate === recentDate) {
      show({ found: true, items: recent, date: recentDate, lines: recent.length });
    } else if (G && G.fetchItems) {
      G.fetchItems(pickDate).then(show).catch(function (e) { $('v13-items-body').innerHTML = '<p class="note">Could not load items: ' + esc(e.message || e) + '</p>'; });
    } else {
      $('v13-items-body').innerHTML = '<p class="note">Items endpoint not available yet. Deploy the feed update.</p>';
    }
    var sel = $('v13-itemsday');
    if (sel) sel.addEventListener('change', function () {
      var d = sel.value; $('v13-items-body').innerHTML = '<p class="note">Loading items for ' + esc(dlong(d)) + '…</p>';
      if (G && G.fetchItems) G.fetchItems(d).then(show).catch(function (e) { $('v13-items-body').innerHTML = '<p class="note">Could not load: ' + esc(e.message || e) + '</p>'; });
    });
  }

  function renderItemsBody(items, date, rates, lines) {
    var GROUP = {
      RES1_BRK: 'Breakfast', AFT_TEA: 'Afternoon tea',
      RES1_LUN: 'Restaurant food', RES1_DIN: 'Restaurant food', RS_FOOD: 'Room service',
      BAR1_LUN: 'Bar food', BAR1_DIN: 'Bar food',
      RES1BEV_LUN: 'Restaurant drinks', RES1BEV_DIN: 'Restaurant drinks', REST_BEV: 'Restaurant drinks',
      BAR1BEV_LUN: 'Bar drinks', BAR1BEV_DIN: 'Bar drinks', BAR_BER: 'Bar drinks', SOFT_BEV: 'Bar drinks', CORK: 'Bar drinks', BAR2_PCK: 'Bar drinks',
      RS_BEV: 'Room service', FUN_LUN: 'Functions', FUN_DIN: 'Functions', FUN_BEV_LUN: 'Functions', FUN_BEV_DIN: 'Functions',
      CON_LUN: 'Conference', CON_DIN: 'Conference', PKL_FOOD: 'Pack lunches', PKL_BEV: 'Pack lunches'
    };
    var byGroup = {}, totalN = 0, totalQ = 0;
    items.forEach(function (it) {
      var g = GROUP[it.c] || it.c;
      byGroup[g] = byGroup[g] || {};
      var k = it.d || '(unnamed)';
      var r = byGroup[g][k] || (byGroup[g][k] = { q: 0, n: 0, c: it.c });
      r.q += it.q || 0; r.n += it.n || 0;
      totalN += it.n || 0; totalQ += it.q || 0;
    });
    var groupList = Object.keys(byGroup).map(function (g) {
      var rows = Object.keys(byGroup[g]).map(function (k) { return Object.assign({ d: k }, byGroup[g][k]); });
      var gn = rows.reduce(function (s, x) { return s + x.n; }, 0), gq = rows.reduce(function (s, x) { return s + x.q; }, 0);
      rows.sort(function (a, b) { return b.n - a.n; });
      return { g: g, rows: rows, gn: r2(gn), gq: gq };
    }).sort(function (a, b) { return b.gn - a.gn; });

    var h = '<p class="note" style="margin:0 0 10px">Individual dishes and drinks from Guestline\'s item lines, ' + (lines || items.length) + ' postings totalling ' + gbp(totalN) + ' net across ' + groupList.length + ' outlet groups.</p>';
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
    h += '<p class="note" style="margin-top:8px">Totals: <b>' + num(totalQ) + '</b> items for <b>' + gbp(totalN) + '</b> on ' + esc(dlong(date)) + '. Source: Guestline Rezlynx Financial Report, transaction lines (HOSPRO_ITEMS template).</p>';
    return h;
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
    out.push({ k: 'info', l: 'Average rooms sold', v: avgSold.toFixed(1) + ' of 114 lettable', d: 'Across ' + days.length + ' night' + (days.length > 1 ? 's' : '') + ' (' + d.label + ')' });
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
    var T = window.Trading;

    // Add "Live" badge next to the greeting if the API is connected
    var hero = el.querySelector('.hp-hero h2');
    var G = window.GuestlineFeed && window.GuestlineFeed.info();
    if (hero && G && G.days && !hero.querySelector('.v13-hero-badge')) {
      hero.insertAdjacentHTML('beforeend', '<span class="v13-hero-badge">● Live from Guestline · ' + (G.days || 0) + ' days loaded' + (G.loading ? ' · still loading history' : '') + '</span>');
    }

    // Remove any old insertions
    var existingHl = el.querySelector('.v13-hl'); if (existingHl) existingHl.remove();
    var existingDr = el.querySelector('.v13-dr[data-v13-page="home"]'); if (existingDr) existingDr.remove();

    // Insert date range bar before the hp-today block (above the trading position)
    var today = el.querySelector('.hp-today');
    if (today && T && S.af) {
      today.insertAdjacentHTML('beforebegin', drBar('home', { forward: false }));
      // Replace the tiles inside hp-today with range-aware ones
      var tilesEl = today.querySelector(':scope > .tiles');
      if (tilesEl) {
        var newTiles = buildBusinessTodayTiles(S, lc);
        tilesEl.outerHTML = newTiles;
      }
      // Update the title to reflect the range
      var th = today.querySelector('.hp-th');
      if (th) {
        var r = getRange(), d = rangeDates(/^next/.test(r.kind) ? { kind: '7' } : r, lc);
        var h3 = th.querySelector('h3');
        if (h3) { h3.firstChild.textContent = 'Latest trading position '; if (!h3.querySelector('.v13-src')) h3.insertAdjacentHTML('beforeend', ' <span class="v13-src">Guestline API ●</span>'); }
        var p = th.querySelector('p');
        if (p) p.innerHTML = esc(d.label) + ' · from the Guestline report received ' + th.querySelector('p').textContent.split('received').pop();
      }
      // Hide the Open Trading button
      var ot = today.querySelector('.hp-link[data-go="pf-trading"]'); if (ot) ot.style.display = 'none';
    }

    // Add highlights block AFTER hp-today
    var hlHtml = buildHighlights(S, lc);
    if (today && hlHtml) today.insertAdjacentHTML('afterend', hlHtml);
  }

  function buildBusinessTodayTiles(S, lc) {
    var T = window.Trading; if (!T || !S.af) return '<div class="tiles"></div>';
    var r = getRange(), d = rangeDates(/^next/.test(r.kind) ? { kind: '7' } : r, lc), cmp = getCmp();
    var tally = tradingTally(S, d.from, d.to);
    var cd = cmp !== 'none' ? cmpDates(d, cmp) : null;
    var ctally = cd ? tradingTally(S, cd.from, cd.to) : null;

    function delta(a, b) {
      if (!b || !isFinite(b) || b === 0 || a === null || !isFinite(a)) return '';
      var v = (a - b) / Math.abs(b); var cls = v >= 0 ? 'up' : 'dn';
      return ' <span class="v18-cmp"><span class="' + cls + '">' + (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%</span></span>';
    }

    // Forward-looking: tonight on the books
    var cut = T.asOfDay();
    var to = S.af.rows.filter(function (x) { return x.d === cut; })[0];
    var yd = S.af.rows.filter(function (x) { return x.d < cut; }).slice(-1)[0];
    var tonightAcc = to ? T.net(to.acc) : 0;
    var tonightAdr = to && to.rooms ? tonightAcc / to.rooms : 0;
    var n7 = T.agg(S.af.rows.filter(function (x) { return x.d >= cut; }).slice(0, 7));
    var m = cut.slice(0, 7), act = T.agg(T.rowsFor(m, 'actual')), bks = T.agg(T.rowsFor(m, 'books'));
    var LET2 = (T && T.LETTABLE) ? T.LETTABLE : 114; var allMonth = act.total + bks.total, allMonthOcc = (act.rooms + bks.rooms) / (LET2 * (act.nights + bks.nights));

    function t(label, value, sub) {
      return '<div class="tile"><div class="l">' + label + '</div><div class="v">' + value + '</div>' + (sub ? '<div class="d">' + sub + '</div>' : '') + '</div>';
    }

    var LET3 = tally.lettable || 114;
    var avail = LET3 * (tally.nights || 0);
    var tiles = [
      t(esc(d.label) + ' revenue', gbp(tally.total), (tally.nights || 0) + ' night' + (tally.nights === 1 ? '' : 's') + ' · ' + num(tally.rooms) + ' room nights' + delta(tally.total, ctally && ctally.total)),
      t('Rooms sold', num(tally.rooms) + ' <small>of ' + num(avail) + '</small>', pc(tally.occ) + ' occupancy on ' + LET3 + ' lettable · ' + gbp(tally.acc) + ' accommodation' + delta(tally.rooms, ctally && ctally.rooms)),
      t('Occupancy', pc(tally.occ), num(tally.rooms) + ' of ' + num(avail) + ' lettable' + delta(tally.occ, ctally && ctally.occ)),
      t('ADR', gbp(tally.adr, 2), 'average daily rate net of VAT' + delta(tally.adr, ctally && ctally.adr)),
      t('RevPAR', gbp(tally.revpar, 2), 'rooms revenue ÷ ' + LET3 + ' lettable' + delta(tally.revpar, ctally && ctally.revpar)),
      t('TRevPAR', gbp(tally.trevpar, 2), 'all revenue ÷ ' + LET3 + ' lettable' + delta(tally.trevpar, ctally && ctally.trevpar)),
      t('Food &amp; Beverage', gbp(tally.fb), (tally.rooms ? gbp(tally.fb / tally.rooms, 2) + ' per room sold' : '') + delta(tally.fb, ctally && ctally.fb)),
      t('Other revenue', gbp(tally.oth), 'room hire, conference, misc, sundries'),
      t('Revenue lost to OOS', gbp(tally.oosLoss), (tally.oos || 0) + ' room nights × that night\'s ADR'),
      // Forward-looking anchors (always shown)
      t('Tonight, on the books', to ? num(to.rooms) + ' <small>rooms</small>' : '–', to ? gbp(tonightAdr, 2) + ' ADR · ' + gbp(tonightAcc) + ' rooms revenue' : ''),
      t('Next 7 nights, on the books', n7.rooms ? num(n7.rooms) + ' <small>rooms</small> <span>' + pc(n7.occ) + '</span>' : '–', n7.rooms ? gbp(n7.acc) + ' rooms revenue' : ''),
      t(MN[+m.slice(5) - 1] + ', with bookings held', gbp(allMonth), pc(allMonthOcc) + ' occupancy for the month')
    ].join('');
    return '<div class="tiles">' + tiles + '</div>';
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
        '<div class="tile"><div class="l">Rooms sold <span class="v13-tick"></span></div><div class="v">' + num(tally.rooms) + '</div><div class="d">' + pc(tally.occ) + ' occupancy of ' + (tally.lettable || 114) + ' lettable ' + (ctally ? cmpLine('rooms', tally.rooms, ctally.rooms) : '') + '</div></div>' +
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
    /* Groups in the Guestline feed use single-letter keys as plain numbers:
       A = accommodation, F = food, B = beverage, C = conference, M = misc, S = sundries.
       Rooms revenue = accommodation less room hire; Other = room hire + conference + misc + sundries.
       Occupancy base is LETTABLE (114 = 120 total − 5 staff − 1 storage), not 120.
       OOS loss per night = that night's OOS rooms × that night's ADR (only on actual nights). */
    var days = daysIn(S, from, to);
    var T = window.Trading; var LET = (T && T.LETTABLE) ? T.LETTABLE : 114;
    var acc = 0, food = 0, bev = 0, oth = 0, rooms = 0, oos = 0, oosLoss = 0, actualNights = 0;
    days.forEach(function (x) {
      var g = x.groups || {};
      var codes = x.codes || {};
      var hire = codes.ROOM_HIRE || 0;
      var A = +(g.A) || 0, F = +(g.F) || 0, B = +(g.B) || 0, C = +(g.C) || 0, M = +(g.M) || 0, Sg = +(g.S) || 0;
      acc += A - hire;
      food += F;
      bev += B;
      oth += hire + C + M + Sg;
      var soldN = x.sold || 0, oosN = x.oos || 0;
      rooms += soldN;
      oos += oosN;
      // ADR for this night = (A − hire) / rooms sold
      if (soldN > 0) {
        var adrN = (A - hire) / soldN;
        oosLoss += oosN * adrN;
        actualNights += 1;
      }
    });
    var fb = food + bev;
    var total = acc + fb + oth, nights = days.length, avail = LET * nights;
    return {
      nights: nights, rooms: rooms, acc: r2(acc), fb: r2(fb), food: r2(food), bev: r2(bev), oth: r2(oth), total: r2(total),
      oos: oos, oosLoss: r2(oosLoss), lettable: LET,
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
    // Capitalise the heading if it says "Food & beverage"
    el.querySelectorAll('h1,h2,h3').forEach(function (h) {
      if (/Food\s*&(amp;)?\s*beverage/i.test(h.innerHTML)) {
        h.innerHTML = h.innerHTML.replace(/Food\s*&(amp;)?\s*beverage/i, 'Food & Beverage').replace(/Food\s*&amp;\s*beverage/i, 'Food &amp; Beverage');
      }
    });
    // Inject a range summary strip at the very top
    var existing = el.querySelector('.v18-fb-strip'); if (existing) existing.remove();
    var existingDr = el.querySelector('.v13-dr[data-v13-page="fb"]'); if (existingDr) existingDr.remove();
    var S = window.Trading && window.Trading.S ? window.Trading.S() : {};
    var T = window.Trading, lc = lastClosed();
    if (!T || !S.af || !lc) return;
    var r = getRange(), d = rangeDates(/^next/.test(r.kind) ? { kind: '7' } : r, lc), cmp = getCmp();
    var tally = tradingTally(S, d.from, d.to);
    var cd = cmp !== 'none' ? cmpDates(d, cmp) : null;
    var ctally = cd ? tradingTally(S, cd.from, cd.to) : null;

    function delta(a, b) {
      if (!b || !isFinite(b) || b === 0 || a === null || !isFinite(a)) return '';
      var v = (a - b) / Math.abs(b); var cls = v >= 0 ? 'up' : 'dn';
      return ' <span class="v18-cmp"><span class="' + cls + '">' + (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%</span></span>';
    }

    // F&B split from the tally (groups.F and groups.B, single-letter keys, as plain numbers)
    var days = daysIn(S, d.from, d.to);
    var food = tally.food || 0, bev = tally.bev || 0, foodRev = tally.fb;

    // Breakfast counts from Postings
    var inr = 0, paid = 0, biv = 0, bpv = 0;
    days.forEach(function (x) { if (Array.isArray(x.bk)) { inr += x.bk[0] || 0; biv += x.bk[1] || 0; paid += Math.max(0, x.bk[2] || 0); bpv += Math.max(0, x.bk[3] || 0); } });

    var html = '<div class="v18-fb-strip"><h3>Food &amp; Beverage summary · ' + esc(d.label) + ' <span class="v13-src">Guestline API ●</span></h3><div class="tiles">';
    html += '<div class="tile"><div class="l">Total F&amp;B revenue</div><div class="v">' + gbp(foodRev) + '</div><div class="d">' + (tally.nights ? gbp(foodRev / tally.nights) + ' a day · ' : '') + (tally.rooms ? gbp(foodRev / tally.rooms, 2) + ' per occupied room' : '') + delta(foodRev, ctally && ctally.fb) + '</div></div>';
    html += '<div class="tile"><div class="l">Food revenue</div><div class="v">' + gbp(food) + '</div><div class="d">' + pc(foodRev ? food / foodRev : null) + ' of F&amp;B</div></div>';
    html += '<div class="tile"><div class="l">Beverage revenue</div><div class="v">' + gbp(bev) + '</div><div class="d">' + pc(foodRev ? bev / foodRev : null) + ' of F&amp;B</div></div>';
    html += '<div class="tile"><div class="l">Breakfasts served</div><div class="v">' + num(inr + paid) + '</div><div class="d">' + num(inr) + ' in the rate · ' + num(paid) + ' paid on the day</div></div>';
    html += '<div class="tile"><div class="l">Nights in view</div><div class="v">' + num(tally.nights) + '</div><div class="d">' + (tally.rooms ? num(tally.rooms) + ' rooms sold · ' + pc(tally.occ) + ' occupancy' : '') + '</div></div>';
    html += '</div></div>';

    el.insertAdjacentHTML('afterbegin', drBar('fb', { forward: false }) + html);
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
    /* v21: every page must respond to the top date-range chips. */
    if (SIDEBAR_BUILT) { renderTopFilters(); highlightActive(); }
    var active = document.querySelector('section.tab.on');
    if (!active) return;
    var tabId = active.id.indexOf('t-') === 0 ? active.id.slice(2) : active.id;

    /* F&B: two shapes — POS view (rendered by me) and the hub's own views (Overview, By terminal, Breakfast, What we sell). */
    if (tabId === 'pf-fb') {
      var fbEl = $('pf-fb');
      var seg = fbEl && fbEl.querySelector('.seg.on');
      if (seg && seg.getAttribute('data-fb') === 'pos') {
        renderPosView(fbEl, window.Trading.S(), lastClosed());
        return;
      }
      /* Hub F&B view — force the hub to re-render, then re-stamp my strip and chips on top. */
      if (window.Profit && window.Profit.show) {
        window.Profit.show('fb');
        setTimeout(augmentFb, 60);
        return;
      }
    }

    /* Business Today — augment in place (the strip and tiles use the range directly). */
    if (tabId === 'pf-home') {
      augmentHome();
      return;
    }

    /* Trading (if ever shown) — re-augment. */
    if (tabId === 'pf-trading') {
      var trEl = $('pf-trading');
      var old = trEl && trEl.querySelector('.v13-trading-head'); if (old) old.remove();
      augmentTrading();
      return;
    }

    /* Forecast page (mine) */
    if (tabId === 'pf-forecast') {
      renderForecast();
      return;
    }

    /* Any other page the hub owns (Channels & rates, Trends, Profitability, Labour, Stock, Actions, Data, Help, Brief):
       force the hub to re-render under the current selection, then stamp our range-aware strip on top so the chips drive the view. */
    if (window.Profit && window.Profit.show && tabId.indexOf('pf-') === 0) {
      var name = tabId.slice(3);
      try { window.Profit.show(name); } catch (e) {}
      setTimeout(function () { augmentHome(); augmentFb(); augmentTrading(); augmentHubPage(tabId); }, 60);
      return;
    }
    // Non-pf tabs (explore, bar, rooms, save, update)
    augmentHubPage(tabId);
  }

  /* ---------- Forecast page: next N months on the books ---------- */
  function renderForecast() {
    var el = $('pf-forecast'); if (!el) return;
    var T = window.Trading, S = T ? T.S() : {};
    if (!T || !S.af || !S.af.rows || !S.af.rows.length) { el.innerHTML = '<div class="card"><h2>No Guestline data yet</h2><p class="sub">Forecast needs the Actual &amp; Forecast feed to be loaded.</p></div>'; return; }
    var LET = T.LETTABLE || 114;
    var cut = T.asOfDay();
    var now = new Date(cut + 'T12:00:00Z');
    var MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var MNL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    /* ===== Staffing rules (from HosPRO Rota — Forecast Staffing Rules tab) =====
       Kitchen        = max(2, ceil(bkfst/28) + (dinner>0 ? 1 : 0))
       Restaurant F&B = max(1, ceil(bkfst/28)) + (dinner>0 ? ceil(dinner/7) : 0)
       Housekeeping   = max(1, ceil((dep*0.542 + stay*0.333) / 7.5))
       Reception = 3, Nights = 1, Bar = 2, Admin = 1, Maintenance = 1 (on-call)
       Covers fallback: bkfst = rooms × 1.8 if not supplied; dinner = 0 if not. */
    function ceil(x) { return Math.ceil(x); }
    function staffForDay(rooms, departures, stayovers, bkfst, dinner) {
      rooms = rooms || 0; departures = departures || 0; stayovers = stayovers || 0;
      if (bkfst == null) bkfst = rooms * 1.8;
      dinner = dinner || 0;
      var kitchen = Math.max(2, ceil(bkfst / 28) + (dinner > 0 ? 1 : 0));
      var restaurant = Math.max(1, ceil(bkfst / 28)) + (dinner > 0 ? ceil(dinner / 7) : 0);
      var housekeeping = rooms > 0 ? Math.max(1, ceil((departures * 0.542 + stayovers * 0.333) / 7.5)) : 1;
      return {
        reception: 3, nights: 1, kitchen: kitchen, restaurant: restaurant,
        bar: 2, housekeeping: housekeeping, admin: 1, maintenance: 1,
        total: 3 + 1 + kitchen + restaurant + 2 + housekeeping + 1 + 1
      };
    }
    /* Block/event rooms for a date from the Block Forecast if loaded */
    var blocksByDay = {};
    try {
      var bl = (S.x && S.x.blocks && S.x.blocks.byMonth) || {};
      Object.keys(bl).forEach(function (mk) {
        (bl[mk].rows || []).forEach(function (b) {
          if (!b.first || !b.last) return;
          var d = b.first;
          while (d <= b.last) {
            var perNight = Math.round((b.total || 0) / (b.nights || 1));
            blocksByDay[d] = blocksByDay[d] || { rooms: 0, names: [] };
            blocksByDay[d].rooms += perNight;
            if (blocksByDay[d].names.indexOf(b.name) === -1) blocksByDay[d].names.push(b.name);
            // step +1 day
            var dd = new Date(d + 'T12:00:00Z'); dd.setUTCDate(dd.getUTCDate() + 1); d = dd.toISOString().slice(0, 10);
          }
        });
      });
    } catch (e) {}

    /* ===== Build daily forward rows (from today + 180 days) ===== */
    var startD = cut, endD = (function () { var e = new Date(cut + 'T12:00:00Z'); e.setUTCDate(e.getUTCDate() + 180); return e.toISOString().slice(0, 10); })();
    var afIndex = {}; S.af.rows.forEach(function (r) { afIndex[r.d] = r; });
    var daily = [];
    for (var d = new Date(startD + 'T12:00:00Z'), end = new Date(endD + 'T12:00:00Z'); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      var ds = d.toISOString().slice(0, 10);
      var r = afIndex[ds];
      if (!r) continue;
      var rooms = r.rooms || 0;
      var dep = r.dep != null ? r.dep : 0;    // departures count
      var arr = r.arr != null ? r.arr : 0;    // arrivals count
      // stayovers = rooms occupied tonight who were here last night and aren't departing today (approx: rooms - arrivals today)
      var stay = Math.max(0, rooms - arr);
      var bkfst = r.bkfst || null;            // not usually supplied by A&F; estimate from rooms
      var dinner = r.dinner || 0;
      var staff = staffForDay(rooms, dep, stay, bkfst, dinner);
      var accNet = T.net(r.acc) || 0, fbNet = T.net(r.fb) || 0, othNet = T.net(r.oth) || 0;
      daily.push({
        d: ds, dow: r.dow || DOW[new Date(ds + 'T12:00:00Z').getUTCDay()],
        rooms: rooms, arrivals: arr, departures: dep, stayovers: stay,
        occ: LET ? rooms / LET : 0,
        acc: accNet, fb: fbNet, oth: othNet, total: accNet + fbNet + othNet,
        adr: rooms ? accNet / rooms : null,
        revpar: LET ? accNet / LET : null,
        trevpar: LET ? (accNet + fbNet + othNet) / LET : null,
        bkfst: bkfst || Math.round(rooms * 1.8),
        dinner: dinner,
        blocks: blocksByDay[ds] || null,
        staff: staff,
        oos: r.roos || 0,
        isBeforeToday: ds < cut
      });
    }

    /* ===== Rolling 6 months aggregation ===== */
    var months = [];
    for (var i = 0; i < 6; i++) {
      var dd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      months.push(dd.toISOString().slice(0, 7));
    }
    function daysInMonth(m) { var y = +m.slice(0,4), mi = +m.slice(5,7); return new Date(y, mi, 0).getDate(); }
    function aggMonth(m) {
      var mrows = S.af.rows.filter(function (x) { return x.d.slice(0,7) === m; });
      var dMrows = daily.filter(function (x) { return x.d.slice(0,7) === m; });
      var days = daysInMonth(m);
      var acc = 0, fb = 0, oth = 0, sold = 0, nights = mrows.length, bkfst = 0, dinner = 0;
      var staffTotal = { reception: 0, nights: 0, kitchen: 0, restaurant: 0, bar: 0, housekeeping: 0, admin: 0, maintenance: 0 };
      mrows.forEach(function (r) {
        acc += T.net(r.acc) || 0; fb += T.net(r.fb) || 0; oth += T.net(r.oth) || 0; sold += r.rooms || 0;
      });
      dMrows.forEach(function (x) {
        bkfst += x.bkfst || 0; dinner += x.dinner || 0;
        Object.keys(staffTotal).forEach(function (k) { staffTotal[k] += x.staff[k]; });
      });
      var total = acc + fb + oth, avail = days * LET;
      // Avg staff per day in the month (round to 1dp)
      var staffAvg = {}; Object.keys(staffTotal).forEach(function (k) { staffAvg[k] = dMrows.length ? +(staffTotal[k] / dMrows.length).toFixed(1) : 0; });
      return {
        month: m, days: days, loaded: nights, available: avail,
        sold: sold, acc: acc, fb: fb, oth: oth, total: total,
        bkfst: bkfst, dinner: dinner,
        occ: avail ? sold / avail : null,
        adr: sold ? acc / sold : null,
        revpar: avail ? acc / avail : null,
        staff: staffAvg
      };
    }
    var mRows = months.map(aggMonth);

    /* ===== Headline tiles ===== */
    var totalRev = 0, totalRooms = 0, totalAvail = 0, totalAcc = 0, totalFb = 0, totalBkfst = 0, totalDinner = 0;
    mRows.forEach(function (r) { totalRev += r.total; totalRooms += r.sold; totalAvail += r.available; totalAcc += r.acc; totalFb += r.fb; totalBkfst += r.bkfst; totalDinner += r.dinner; });
    var totalOcc = totalAvail ? totalRooms / totalAvail : null;

    /* ===== Build HTML ===== */
    var h = drBar('forecast', { forward: false });
    h += '<div class="card" style="padding:20px"><h2 style="margin:0 0 4px">Next 6 months on the books <span class="v13-src">Guestline API ●</span></h2><p class="sub" style="margin:0 0 18px">From ' + MN[+months[0].slice(5)-1] + ' ' + months[0].slice(0,4) + ' to ' + MN[+months[5].slice(5)-1] + ' ' + months[5].slice(0,4) + ', rolling · from the Actual &amp; Forecast feed, net of VAT, on ' + LET + ' lettable rooms a night. Staffing from HosPRO Rota rules.</p>';
    h += '<div class="tiles" style="margin-bottom:14px">' +
      '<div class="tile"><div class="l">Total rooms revenue</div><div class="v">' + gbp(totalAcc) + '</div><div class="d">Across 6 months</div></div>' +
      '<div class="tile"><div class="l">Total F&amp;B (pre-booked)</div><div class="v">' + gbp(totalFb) + '</div><div class="d">Only pre-booked with rooms so far</div></div>' +
      '<div class="tile"><div class="l">Total revenue</div><div class="v">' + gbp(totalRev) + '</div><div class="d">Rooms + F&amp;B + other</div></div>' +
      '<div class="tile"><div class="l">Total rooms sold</div><div class="v">' + num(totalRooms) + '</div><div class="d">of ' + num(totalAvail) + ' lettable</div></div>' +
      '<div class="tile"><div class="l">6-month occupancy</div><div class="v">' + pc(totalOcc) + '</div><div class="d">Picks up as bookings land</div></div>' +
      '<div class="tile"><div class="l">Breakfasts expected</div><div class="v">' + num(totalBkfst) + '</div><div class="d">rooms × 1.8 (estimate)</div></div>' +
      '</div>';

    /* ===== Daily scrolling chart ===== */
    h += '<h3 style="margin:18px 0 6px;font-size:14.5px">Forward position by day — scroll right for later dates</h3>';
    h += '<p class="sub" style="margin:0 0 10px">Daily occupancy, ADR, RevPAR and TRevPAR across the next ' + daily.length + ' nights. Surge markers (gold) on nights at 80%+. Hover for details.</p>';
    h += '<div class="v23-scroll" style="overflow-x:auto;overflow-y:hidden;border:1px solid #efede7;border-radius:10px;background:#faf9f6">';
    h += '<div style="width:' + Math.max(1600, daily.length * 24) + 'px;height:320px;padding:10px"><canvas id="fc-daily-chart"></canvas></div>';
    h += '</div>';
    h += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:#52514e"><span><i style="display:inline-block;width:10px;height:10px;background:#6250d6;border-radius:50%;margin-right:4px"></i>Occupancy %</span><span><i style="display:inline-block;width:10px;height:10px;background:#2a78d6;border-radius:50%;margin-right:4px"></i>ADR</span><span><i style="display:inline-block;width:10px;height:10px;background:#eb6834;border-radius:50%;margin-right:4px"></i>RevPAR</span><span><i style="display:inline-block;width:10px;height:10px;background:#1baf7a;border-radius:50%;margin-right:4px"></i>TRevPAR</span><span><i style="display:inline-block;width:10px;height:10px;background:#bb9979;border-radius:50%;margin-right:4px"></i>Surge (80%+ occ)</span><span><i style="display:inline-block;width:10px;height:10px;background:#c2417a;border-radius:50%;margin-right:4px"></i>Block / event</span></div>';

    /* ===== Monthly summary with staffing ===== */
    h += '<h3 style="margin:22px 0 6px;font-size:14.5px">Monthly roll-up with average staffing per day</h3>';
    h += '<div class="scroll"><table style="font-size:12.5px"><tr><th>Month</th><th class="n">Nights</th><th class="n">Rooms</th><th class="n">Occ</th><th class="n">ADR</th><th class="n">RevPAR</th><th class="n">Rooms rev</th><th class="n">F&amp;B</th><th class="n">Total rev</th><th class="n">Bkfsts</th><th class="n">HK</th><th class="n">Kitch</th><th class="n">Rest</th><th class="n">Recep</th><th class="n">Bar</th><th class="n">Nights</th></tr>';
    mRows.forEach(function (r, i) {
      var m = r.month, label = MN[+m.slice(5)-1] + ' ' + m.slice(0,4);
      h += '<tr' + (i === 0 ? ' style="background:#faf9f6"' : '') + '><td><b>' + label + '</b>' + (i === 0 ? ' <span class="pill" style="font-size:10px;background:#faf0d8;color:#725514;padding:1px 6px;border-radius:999px;margin-left:4px">current</span>' : '') + '</td>' +
        '<td class="n">' + r.loaded + '/' + r.days + '</td>' +
        '<td class="n">' + num(r.sold) + '</td>' +
        '<td class="n">' + pc(r.occ) + '</td>' +
        '<td class="n">' + gbp(r.adr, 2) + '</td>' +
        '<td class="n">' + gbp(r.revpar, 2) + '</td>' +
        '<td class="n">' + gbp(r.acc) + '</td>' +
        '<td class="n">' + gbp(r.fb) + '</td>' +
        '<td class="n"><b>' + gbp(r.total) + '</b></td>' +
        '<td class="n">' + num(r.bkfst) + '</td>' +
        '<td class="n">' + r.staff.housekeeping + '</td>' +
        '<td class="n">' + r.staff.kitchen + '</td>' +
        '<td class="n">' + r.staff.restaurant + '</td>' +
        '<td class="n">' + r.staff.reception + '</td>' +
        '<td class="n">' + r.staff.bar + '</td>' +
        '<td class="n">' + r.staff.nights + '</td></tr>';
    });
    h += '</table></div>';

    /* ===== Surge callouts (next 60 days, 80%+ occ) ===== */
    var surges = daily.slice(0, 60).filter(function (x) { return !x.isBeforeToday && x.occ >= 0.8; }).slice(0, 10);
    if (surges.length) {
      h += '<h3 style="margin:22px 0 6px;font-size:14.5px">Surge nights ahead <span class="v13-src" style="color:#bb9979">need extra cover</span></h3>';
      h += '<div class="tiles" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">';
      surges.forEach(function (x) {
        var blkTxt = x.blocks ? '<br><span style="color:#c2417a;font-size:11px">' + x.blocks.rooms + ' from ' + esc(x.blocks.names.join(', ')) + '</span>' : '';
        h += '<div class="tile" style="border-left:3px solid #bb9979;background:#faf0d8"><div class="l">' + x.dow + ' ' + dlabel(x.d) + '</div><div class="v">' + Math.round(x.occ * 100) + '%</div><div class="d">' + x.rooms + ' rooms · ' + gbp(x.adr, 2) + ' ADR · HK ' + x.staff.housekeeping + ', Kitch ' + x.staff.kitchen + blkTxt + '</div></div>';
      });
      h += '</div>';
    }

    /* ===== Daily detail table (scrollable, next 90 days) ===== */
    h += '<h3 style="margin:22px 0 6px;font-size:14.5px">Day-by-day for the next 90 nights</h3>';
    h += '<p class="sub" style="margin:0 0 10px">Blocks and events come from the Block Forecast; breakfasts estimated at rooms × 1.8; dinners from booking data when available. Staff rows show the HosPRO Rota formulas applied to each night.</p>';
    h += '<div class="scroll" style="max-height:480px"><table style="font-size:12px"><thead style="position:sticky;top:0;background:#fff"><tr><th>Night</th><th class="n">Rooms</th><th class="n">Occ</th><th class="n">Arr</th><th class="n">Dep</th><th class="n">Stay</th><th class="n">ADR</th><th class="n">RevPAR</th><th class="n">TRevPAR</th><th class="n">Bkfsts</th><th class="n">Dinner</th><th>Blocks / events</th><th class="n">HK</th><th class="n">Kitch</th><th class="n">Rest</th><th class="n">Recep</th><th class="n">Bar</th><th class="n">Total staff</th></tr></thead><tbody>';
    daily.slice(0, 90).forEach(function (x) {
      var style = '';
      if (x.occ >= 0.9) style = 'background:#faf0d8';
      else if (x.occ >= 0.8) style = 'background:#fdf6e9';
      else if (x.occ < 0.3) style = 'background:#f7f6f3';
      var blkTxt = x.blocks ? '<span style="color:#c2417a">' + x.blocks.rooms + ' · ' + esc(x.blocks.names.join(', ').slice(0, 30)) + '</span>' : '–';
      h += '<tr style="' + style + '"><td><b>' + x.dow + '</b> ' + dlabel(x.d) + '</td>' +
        '<td class="n">' + x.rooms + '</td>' +
        '<td class="n">' + Math.round(x.occ * 100) + '%</td>' +
        '<td class="n">' + x.arrivals + '</td>' +
        '<td class="n">' + x.departures + '</td>' +
        '<td class="n">' + x.stayovers + '</td>' +
        '<td class="n">' + gbp(x.adr, 2) + '</td>' +
        '<td class="n">' + gbp(x.revpar, 2) + '</td>' +
        '<td class="n">' + gbp(x.trevpar, 2) + '</td>' +
        '<td class="n">' + x.bkfst + '</td>' +
        '<td class="n">' + (x.dinner || '–') + '</td>' +
        '<td>' + blkTxt + '</td>' +
        '<td class="n"><b>' + x.staff.housekeeping + '</b></td>' +
        '<td class="n">' + x.staff.kitchen + '</td>' +
        '<td class="n">' + x.staff.restaurant + '</td>' +
        '<td class="n">' + x.staff.reception + '</td>' +
        '<td class="n">' + x.staff.bar + '</td>' +
        '<td class="n"><b>' + x.staff.total + '</b></td></tr>';
    });
    h += '</tbody></table></div>';

    h += '<p class="note" style="margin-top:14px;font-size:12px">Staffing from HosPRO Rota — Forecast Staffing Rules (19 Nov 2026): Reception 3, Nights 1, Bar 2, Admin 1, Maintenance 1 (on call). Kitchen = max(2, ⌈bkfst÷28⌉ + (1 if dinner&gt;0)). Restaurant = max(1, ⌈bkfst÷28⌉) + ⌈dinner÷7⌉. Housekeeping = max(1, ⌈(dep×0.542 + stay×0.333)÷7.5⌉). Breakfast covers estimate = rooms × 1.8 when not supplied; dinner defaults to 0 until feed is live.</p>';

    h += '</div>';
    el.innerHTML = h;

    /* ===== Render the scrolling daily chart with Chart.js ===== */
    try {
      var cv = document.getElementById('fc-daily-chart');
      if (cv && window.Chart) {
        var labels = daily.map(function (x) { return x.dow.slice(0,1) + ' ' + +x.d.slice(8) + '/' + +x.d.slice(5,7); });
        var ctx = cv.getContext('2d');
        // Surge point style for occupancy
        var surgeColours = daily.map(function (x) { return x.occ >= 0.8 ? '#bb9979' : '#6250d6'; });
        var surgeSizes = daily.map(function (x) { return x.occ >= 0.8 ? 5 : 2; });
        // Mark event days with annotation-like dots on the baseline
        var evtPoints = daily.map(function (x) { return x.blocks ? 2 : null; });
        new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { label: 'Occupancy %', data: daily.map(function (x) { return Math.round(x.occ * 100); }), borderColor: '#6250d6', backgroundColor: 'rgba(98,80,214,0.08)', yAxisID: 'y1', tension: 0.25, borderWidth: 2, pointRadius: surgeSizes, pointBackgroundColor: surgeColours, pointBorderColor: surgeColours, fill: true },
              { label: 'ADR £', data: daily.map(function (x) { return x.adr ? Math.round(x.adr) : null; }), borderColor: '#2a78d6', yAxisID: 'y2', tension: 0.25, borderWidth: 2, pointRadius: 0, fill: false },
              { label: 'RevPAR £', data: daily.map(function (x) { return x.revpar ? Math.round(x.revpar) : null; }), borderColor: '#eb6834', yAxisID: 'y2', tension: 0.25, borderWidth: 2, pointRadius: 0, fill: false },
              { label: 'TRevPAR £', data: daily.map(function (x) { return x.trevpar ? Math.round(x.trevpar) : null; }), borderColor: '#1baf7a', yAxisID: 'y2', tension: 0.25, borderWidth: 2, pointRadius: 0, borderDash: [4, 3], fill: false },
              { label: 'Block / event', data: evtPoints, borderColor: 'transparent', backgroundColor: '#c2417a', yAxisID: 'y1', pointRadius: 5, pointStyle: 'rectRot', showLine: false }
            ]
          },
          options: {
            maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { title: function (it) { var x = daily[it[0].dataIndex]; return x.dow + ' ' + dlabel(x.d) + ' ' + x.d.slice(0,4); },
                afterBody: function (it) {
                  var x = daily[it[0].dataIndex];
                  var lines = ['', 'Rooms sold: ' + x.rooms + ' of ' + LET, 'Arrivals: ' + x.arrivals + ' · Departures: ' + x.departures + ' · Stayovers: ' + x.stayovers];
                  if (x.blocks) lines.push('Block: ' + x.blocks.rooms + ' · ' + x.blocks.names.join(', '));
                  lines.push('Staff needed: HK ' + x.staff.housekeeping + ' · Kitch ' + x.staff.kitchen + ' · Rest ' + x.staff.restaurant + ' (total ' + x.staff.total + ')');
                  return lines;
                } } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 10 } } },
              y1: { position: 'left', title: { display: true, text: 'Occupancy %' }, min: 0, max: 100, grid: { color: '#efede7' } },
              y2: { position: 'right', title: { display: true, text: '£ per room' }, min: 0, grid: { display: false } }
            }
          }
        });
      }
    } catch (ex) { /* chart failed, table still useful */ }
  }

  /* ---------- sidebar + topbar layout ---------- */
  var SIDEBAR_BUILT = false, V16_ACTIVE = 'pf-home';
  function sidebarItem(tab, colorKey, title, subtitle) {
    var ic = (window.icon && window.COL && window.COL[colorKey]) ? ('<span class="v16-ic" style="background:' + window.COL[colorKey] + '"></span>') : '<span class="v16-ic" style="background:#52606d"></span>';
    return '<button class="v16-item" data-v16-tab="' + esc(tab) + '">' + ic + '<div><b>' + esc(title) + '</b><small class="v16-sub">' + esc(subtitle) + '</small></div></button>';
  }
  function buildSidebar() {
    if (SIDEBAR_BUILT || !document.body) return;
    if (document.body.classList.contains('locked')) return;    // don't apply v16 on the sign-in screen
    // All the "cards" the home page used to show, in a sensible order
    var items = [
      { group: 'Main', rows: [
        ['pf-home', 'trading', 'Business Today', 'Trading, live from Guestline'],
        ['pf-forecast', 'kpi', 'Forecast', 'Next 6 months on the books'],
        ['pf-fb', 'fb', 'Food & Beverage', 'Sales by outlet and meal']
      ]},
      { group: 'Commercial', rows: [
        ['pf-demand', 'demand', 'Channels & rates', 'Booking sources, rate plans'],
        ['pf-trends', 'kpi', 'Trends', 'ADR, RevPAR, revenue over time'],
        ['pf-actions', 'actions', 'Action Centre', 'Actions, watch list, savings']
      ]},
      { group: 'Operations', rows: [
        ['bar', 'bar', 'Bar & keg prices', 'Keg history, market comparison'],
        ['rooms', 'rooms', 'Rooms & linen', 'Linen, cleaning, guest supplies']
      ]},
      { group: 'Finance', rows: [
        ['pf-profit', 'profit', 'Profitability', 'Revenue, costs and profit'],
        ['pf-labour', 'labour', 'Labour', 'Payroll by department'],
        ['pf-stock', 'stock', 'Purchased vs consumed', 'Purchases against cost of sales'],
        ['explore', 'explore', 'Supplier costs', 'Every cost line by supplier']
      ]},
      { group: 'Reference', rows: [
        ['pf-data', 'data', 'Data & reports', 'What has been loaded'],
        ['pf-brief', 'brief', 'Project brief', 'What this hub does'],
        ['pf-help', 'kpi', 'How it works', 'How figures are worked out']
      ]}
    ];
    var who = '', who2 = '';
    try { who = (window.Profit && window.Profit.user) ? (window.Profit.user() || '') : ''; who2 = who.split(/\s+/)[0]; } catch (e) {}

    var h = '<div class="v16-brand"><img src="../bh-logo.svg" alt=""><div><b>Hos<i>BUSINESS</i></b><small>Brandon Hall Hotel &amp; Spa</small></div></div>';
    h += '<div class="v16-sidelist">';
    items.forEach(function (sec) {
      h += '<div class="v16-side-sec">' + esc(sec.group) + '</div>';
      sec.rows.forEach(function (r) { h += sidebarItem(r[0], r[1], r[2], r[3]); });
    });
    h += '</div>';
    h += '<div class="v16-foot"><span title="' + esc(who) + '">' + esc(who2 || 'Signed in') + '</span><button data-v16-signout>Sign out</button></div>';

    var side = document.createElement('div');
    side.className = 'v16-side';
    side.innerHTML = h;
    document.body.appendChild(side);

    var top = document.createElement('div');
    top.className = 'v16-top';
    top.innerHTML = '<h1 id="v16-title">Business Today <small id="v16-sub"></small></h1><div class="v16-top-filters" id="v16-top-filters"></div>';
    document.body.appendChild(top);

    document.body.classList.add('v16');
    SIDEBAR_BUILT = true;
    renderTopFilters();
    highlightActive();
  }
  function renderTopFilters() {
    var top = $('v16-top-filters'); if (!top) return;
    var r = getRange(), cmp = getCmp();
    // Shortlist of chips; the full range + custom + compare live in each page's v13-dr bar
    var QUICK = [['1', 'Yesterday'], ['7', '7 days'], ['14', '14 days'], ['28', '28 days'], ['mtd', 'MTD'], ['lastmonth', 'Last month'], ['90', '90 days'], ['12m', '12 months']];
    var chips = QUICK.map(function (o) { return '<button class="v16-chip' + (r.kind === o[0] ? ' on' : '') + '" data-v13-r="' + o[0] + '">' + o[1] + '</button>'; }).join('');
    var cmpSel = '<select data-v13-cmp>' + [['none', 'No compare'], ['prev', 'Previous period'], ['ly', 'Same period LY']].map(function (o) { return '<option value="' + o[0] + '"' + (cmp === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    var G = window.GuestlineFeed && window.GuestlineFeed.info ? window.GuestlineFeed.info() : null;
    var feedChip = (G && G.days) ? '<span class="v16-feed">Live · ' + G.days + ' days</span>' : '';
    top.innerHTML = chips + cmpSel + feedChip;
  }
  function highlightActive() {
    var all = document.querySelectorAll('.v16-item');
    var active = (document.querySelector('section.tab.on') || {}).id || '';
    active = active.indexOf('t-') === 0 ? active.slice(2) : active;
    V16_ACTIVE = active || V16_ACTIVE;
    all.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v16-tab') === V16_ACTIVE); });
    var title = $('v16-title'), sub = $('v16-sub');
    if (title) {
      var found = null;
      document.querySelectorAll('.v16-item').forEach(function (b) { if (b.getAttribute('data-v16-tab') === V16_ACTIVE) { found = b.querySelector('b').textContent + ''; } });
      title.firstChild.textContent = (found || 'Business Today') + ' ';
    }
  }
  function wireV16() {
    document.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('[data-v16-tab]') : null;
      if (it) {
        e.preventDefault(); e.stopPropagation();
        var tab = it.getAttribute('data-v16-tab');
        var btn = document.querySelector('#nav button[data-t="' + tab + '"]');
        if (btn) {
          btn.click();
          V16_ACTIVE = tab;
          setTimeout(function () {
            highlightActive();
            // Make sure every page gets our augmentation (strip, Forecast, etc.) right after nav
            if (tab === 'pf-forecast') { try { renderForecast(); } catch(e) {} }
            else if (tab === 'pf-home') { augmentHome(); }
            else if (tab === 'pf-fb') { augmentFb(); }
            else if (tab === 'pf-trading') { augmentTrading(); }
            else { augmentHubPage(tab); }
          }, 120);
        }
        return;
      }
      var so = e.target.closest ? e.target.closest('[data-v16-signout]') : null;
      if (so) { var sob = $('signout'); if (sob) sob.click(); }
    }, true);
  }

  /* ---------- Universal strip for hub pages so the top chips drive them ---------- */
  function augmentHubPage(tabId) {
    // Only for hub pages we don't own directly
    var MINE = { 'pf-home':1, 'pf-fb':1, 'pf-trading':1, 'pf-forecast':1 };
    if (MINE[tabId]) return;
    // pf-xxx has an inner <div id=pf-xxx>; non-pf tabs (explore, bar, rooms, save, update) only have the section
    var el = document.getElementById(tabId);
    if (!el) el = document.getElementById('t-' + tabId);
    if (!el) return;
    // Remove any previous strip
    var existingDr = el.querySelector(':scope > .v13-dr'); if (existingDr) existingDr.remove();
    var existingStrip = el.querySelector(':scope > .v18-fb-strip.v22-any'); if (existingStrip) existingStrip.remove();

    // Always show the chips so range selection is visible; strip only when we have data
    var T = window.Trading, S = T ? T.S() : {}, lc = lastClosed();
    if (!T || !S.af || !lc) { el.insertAdjacentHTML('afterbegin', drBar(tabId, { forward: false })); return; }
    var r = getRange(), d = rangeDates(/^next/.test(r.kind) ? { kind: '7' } : r, lc), cmp = getCmp();
    var tally = tradingTally(S, d.from, d.to);
    var cd = cmp !== 'none' ? cmpDates(d, cmp) : null;
    var ctally = cd ? tradingTally(S, cd.from, cd.to) : null;
    function delta(a, b) {
      if (!b || !isFinite(b) || b === 0 || a === null || !isFinite(a)) return '';
      var v = (a - b) / Math.abs(b); var cls = v >= 0 ? 'up' : 'dn';
      return ' <span class="v18-cmp"><span class="' + cls + '">' + (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%</span></span>';
    }
    var LET = tally.lettable || 114;
    var h = '<div class="v18-fb-strip v22-any"><h3>Figures for ' + esc(d.label) + ' <span class="v13-src">Guestline API ●</span></h3><div class="tiles">' +
      '<div class="tile"><div class="l">Total revenue</div><div class="v">' + gbp(tally.total) + '</div><div class="d">' + (tally.nights || 0) + ' nights' + delta(tally.total, ctally && ctally.total) + '</div></div>' +
      '<div class="tile"><div class="l">Rooms sold</div><div class="v">' + num(tally.rooms) + '</div><div class="d">of ' + num(LET * (tally.nights || 0)) + ' lettable</div></div>' +
      '<div class="tile"><div class="l">Occupancy</div><div class="v">' + pc(tally.occ) + '</div><div class="d">on ' + LET + ' lettable' + delta(tally.occ, ctally && ctally.occ) + '</div></div>' +
      '<div class="tile"><div class="l">ADR</div><div class="v">' + gbp(tally.adr, 2) + '</div><div class="d">net of VAT' + delta(tally.adr, ctally && ctally.adr) + '</div></div>' +
      '<div class="tile"><div class="l">RevPAR</div><div class="v">' + gbp(tally.revpar, 2) + '</div><div class="d">÷ ' + LET + ' lettable</div></div>' +
      '<div class="tile"><div class="l">F&amp;B</div><div class="v">' + gbp(tally.fb) + '</div><div class="d">food + beverage</div></div>' +
      '</div><p class="note" style="margin:8px 2px 0;font-size:11.5px;color:#86847d">Date chips at the top drive this strip. The content below is the hub\'s own view for drill-down.</p></div>';
    el.insertAdjacentHTML('afterbegin', drBar(tabId, { forward: false }) + h);
  }

  /* ---------- boot ---------- */
  function boot() {
    // v20 migration: 'today' is retired; rewrite saved range to Yesterday
    try { var sr = JSON.parse(localStorage.getItem(S_RANGE_KEY)); if (sr && sr.kind === 'today') { localStorage.setItem(S_RANGE_KEY, JSON.stringify({ kind: '1' })); } } catch (e) {}
    addStyle();
    wire();
    wireV16();
    setTimeout(buildSidebar, 100);
    var moT = 0;
    var mo = new MutationObserver(function (muts) {
      // ignore mutations we caused
      var ours = muts.every(function (m) { return Array.from(m.addedNodes || []).every(function (n) { return n && n.nodeType === 1 && (n.classList && (n.classList.contains('v13-hl') || n.classList.contains('v13-hero-badge') || n.classList.contains('v13-src'))); }); });
      if (ours) return;
      clearTimeout(moT); moT = setTimeout(function () { augmentHome(); augmentFb(); augmentTrading(); var act = document.querySelector('section.tab.on'); if (act) augmentHubPage(act.id.slice(2)); }, 150);
    });
    if (document.body) mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    augmentHome(); augmentFb(); augmentTrading();
    // After guestline feed loads, re-augment
    document.addEventListener('hub-signin', function () { setTimeout(function () { augmentHome(); augmentFb(); augmentTrading(); if (!SIDEBAR_BUILT) buildSidebar(); renderTopFilters(); highlightActive(); }, 1200); });
    // v22: register Forecast renderer with the hub's Profit registry so clicking the nav button renders it
    (function tryReg(){ if (window.Profit && window.Profit.register) { try { window.Profit.register('forecast', renderForecast); } catch(e) {} return; } setTimeout(tryReg, 200); })();
    // keep sidebar highlight + top filters in sync when tabs/range/cmp change
    var syncT = 0;
    new MutationObserver(function () { clearTimeout(syncT); syncT = setTimeout(function () {
      // If user signed out, strip v16 layout and show the sign-in screen cleanly
      if (document.body.classList.contains('locked')) {
        document.body.classList.remove('v16');
        var side = document.querySelector('.v16-side'); if (side) side.remove();
        var top = document.querySelector('.v16-top'); if (top) top.remove();
        SIDEBAR_BUILT = false;
        return;
      }
      // Build sidebar now if just signed in
      if (!SIDEBAR_BUILT && document.body && !document.body.classList.contains('locked')) { buildSidebar(); return; }
      renderTopFilters(); highlightActive();
    }, 100); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
