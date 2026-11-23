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
      '#pf-rev .rv-hero .rv-demo-live{background:linear-gradient(90deg,#1a8f63,#17a371);color:#fff;box-shadow:0 2px 8px rgba(26,143,99,.3)}',
      '#pf-rev .rv-hero .rv-demo-live::before{content:"● ";animation:rv-blink 1.4s infinite}',
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
      /* v39.14 — num/pos/neg/muted helpers for the 12-month forecast table */
      '#pf-rev table.rv-t th.num,#pf-rev table.rv-t td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '#pf-rev table.rv-t td.num.pos{color:#1a6442;font-weight:600}',
      '#pf-rev table.rv-t td.num.neg{color:#8a1e15;font-weight:600}',
      '#pf-rev table.rv-t td.num.muted{color:#7b8494}',
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
      '#pf-rev .rv-compcell.live{color:#145866}',
      '#pf-rev table.rv-t td:has(.rv-compcell.live){background:#f3f7f8}',
      '#pf-rev .rv-eventtype{display:inline-block;padding:2px 8px;background:#f1efe9;border-radius:999px;font-size:11px;color:#52514e}',
      /* v34: AI insights */
      '#pf-rev .rv-ai-card{background:linear-gradient(180deg,#fafafa 0%,#f3f7f8 100%);border-color:#d6e4e8}',
      '#pf-rev .rv-ai-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;background:linear-gradient(90deg,#1F7A8C,#145866);color:#fff}',
      '#pf-rev .rv-ai-mode{font-size:11px;color:#7b8494;font-style:italic}',
      '#pf-rev .rv-ai-list{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}',
      '@media (max-width:1100px){#pf-rev .rv-ai-list{grid-template-columns:1fr}}',
      '#pf-rev .rv-ai-item{display:flex;gap:12px;padding:12px 14px;background:#fff;border:1px solid #e4e2dc;border-radius:10px}',
      '#pf-rev .rv-ai-icon{flex:0 0 32px;height:32px;line-height:32px;text-align:center;border-radius:8px;background:#1F7A8C;color:#fff;font-weight:700;font-size:16px}',
      '#pf-rev .rv-ai-item b{display:block;font-size:13.5px;color:#1a2b3a;margin-bottom:3px}',
      '#pf-rev .rv-ai-item p{margin:0;font-size:12.5px;color:#52514e;line-height:1.45}',
      '#pf-rev .rv-ai-refresh{margin-left:auto;background:#fff;border:1px solid #d6e4e8;border-radius:999px;padding:4px 10px;font:inherit;font-size:11.5px;color:#1F7A8C;cursor:pointer}',
      '#pf-rev .rv-ai-refresh:hover{background:#eef5f6;border-color:#1F7A8C}',
      /* v34: Actions */
      '#pf-rev .rv-actions-card{border-color:#efe4c7}',
      '#pf-rev .rv-actions{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-top:4px}',
      '#pf-rev .rv-act{text-align:left;background:#fff;border:1px solid #e4e2dc;border-left:4px solid #BB9979;border-radius:10px;padding:12px 14px;font:inherit;cursor:pointer;transition:all .1s ease}',
      '#pf-rev .rv-act:hover{background:#fdf8ee;border-color:#BB9979;transform:translateY(-1px);box-shadow:0 3px 8px rgba(0,0,0,.06)}',
      '#pf-rev .rv-act b{display:block;font-size:13px;color:#1a2b3a;margin-bottom:2px}',
      '#pf-rev .rv-act small{display:block;font-size:11.5px;color:#7b8494}',
      /* v36: Ask the Agent */
      '#pf-rev .rv-ag-wrap{display:grid;grid-template-columns:340px 1fr;gap:16px;margin-top:16px}',
      '@media (max-width:1100px){#pf-rev .rv-ag-wrap{grid-template-columns:1fr}}',
      '#pf-rev .rv-ag-left{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:16px;max-height:calc(100vh - 220px);overflow-y:auto}',
      '#pf-rev .rv-ag-leftH{margin-bottom:12px}',
      '#pf-rev .rv-ag-tag{margin:8px 0 0;font-size:12px;color:#7b8494;line-height:1.5}',
      '#pf-rev .rv-ag-cat{margin:14px 0 4px}',
      '#pf-rev .rv-ag-cat h4{font-size:11.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#52514e;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #f1efe9}',
      '#pf-rev .rv-ag-q{display:flex;gap:10px;width:100%;text-align:left;background:#fafaf6;border:1px solid #e4e2dc;border-radius:9px;padding:8px 10px;margin-bottom:6px;font:inherit;font-size:12.5px;color:#1a2b3a;cursor:pointer;line-height:1.35;transition:all .12s ease}',
      '#pf-rev .rv-ag-q:hover{background:#eef5f6;border-color:#1F7A8C;transform:translateX(2px)}',
      '#pf-rev .rv-ag-qi{flex:0 0 22px;height:22px;text-align:center;line-height:22px;background:#fff;border-radius:6px;font-size:13px}',
      '#pf-rev .rv-ag-qt{flex:1 1 auto}',
      '#pf-rev .rv-ag-right{display:flex;flex-direction:column;background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:16px;min-height:calc(100vh - 220px)}',
      '#pf-rev .rv-ag-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}',
      '#pf-rev .rv-ag-results{flex:1 1 auto;overflow-y:auto;padding:4px 2px;min-height:300px}',
      '#pf-rev .rv-ag-welcome{color:#52514e;font-size:13px;line-height:1.55;padding:16px;background:#fafaf6;border-radius:10px;border:1px dashed #e4e2dc}',
      '#pf-rev .rv-ag-welcome b{color:#1a2b3a}',
      '#pf-rev .rv-ag-welcome ul{margin:8px 0 10px 18px;padding:0}',
      '#pf-rev .rv-ag-welcome li{margin-bottom:3px}',
      '#pf-rev .rv-ag-tip{font-size:12px;color:#7b8494;font-style:italic;margin:6px 0 0}',
      '#pf-rev .rv-ag-turn{margin:0 0 20px;padding:0 0 18px;border-bottom:1px solid #f1efe9}',
      '#pf-rev .rv-ag-turn:last-child{border-bottom:0}',
      '#pf-rev .rv-ag-you{margin-bottom:12px;padding:10px 12px;background:#f3f7f8;border-left:3px solid #1F7A8C;border-radius:0 8px 8px 0}',
      '#pf-rev .rv-ag-ans{padding:0 2px}',
      '#pf-rev .rv-ag-whoY,#pf-rev .rv-ag-whoA{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:2px 7px;border-radius:5px;margin-bottom:6px}',
      '#pf-rev .rv-ag-whoY{background:#1a2b3a;color:#fff}',
      '#pf-rev .rv-ag-whoA{background:linear-gradient(90deg,#1F7A8C,#145866);color:#fff}',
      '#pf-rev .rv-ag-you p{margin:0;font-size:13px;color:#1a2b3a;line-height:1.5}',
      '#pf-rev .rv-ag-md{font-size:13.5px;color:#1a2b3a;line-height:1.6}',
      '#pf-rev .rv-ag-md p{margin:6px 0}',
      '#pf-rev .rv-ag-md h3{font-size:14.5px;font-weight:700;color:#1a2b3a;margin:14px 0 6px}',
      '#pf-rev .rv-ag-md h4{font-size:13px;font-weight:700;color:#52514e;margin:10px 0 4px;text-transform:uppercase;letter-spacing:.3px}',
      '#pf-rev .rv-ag-md ul,#pf-rev .rv-ag-md ol{margin:6px 0 6px 20px;padding:0}',
      '#pf-rev .rv-ag-md li{margin-bottom:3px}',
      '#pf-rev .rv-ag-md strong{color:#145866}',
      '#pf-rev .rv-ag-md code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#fafaf6;border:1px solid #e4e2dc;border-radius:4px;padding:1px 5px;font-size:92%;color:#1a2b3a}',
      '#pf-rev .rv-ag-md a{color:#1F7A8C;text-decoration:underline;text-decoration-color:#7fb9c4}',
      '#pf-rev .rv-ag-searched{margin:10px 0 2px;font-size:11.5px;color:#7b8494}',
      '#pf-rev .rv-ag-searched code{font-size:11px;padding:1px 5px;background:#fafaf6;border-radius:4px;border:1px solid #e4e2dc}',
      '#pf-rev .rv-ag-sources{margin:8px 0 2px;font-size:11.5px;color:#52514e;line-height:1.5}',
      '#pf-rev .rv-ag-sources a{color:#1F7A8C;text-decoration:none}',
      '#pf-rev .rv-ag-sources a:hover{text-decoration:underline}',
      '#pf-rev .rv-ag-sep{margin:0 5px;color:#c9c7bf}',
      '#pf-rev .rv-ag-meta{margin:6px 0 0;font-size:10.5px;color:#9b9992;font-style:italic}',
      '#pf-rev .rv-ag-input{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #f1efe9}',
      '#pf-rev .rv-ag-input textarea{flex:1 1 auto;border:1px solid #e4e2dc;background:#fafaf6;border-radius:9px;padding:10px 12px;font:inherit;font-size:13px;line-height:1.4;resize:vertical;max-height:200px}',
      '#pf-rev .rv-ag-input textarea:focus{outline:2px solid rgba(31,122,140,.2);border-color:#1F7A8C;background:#fff}',
      '#pf-rev .rv-ag-send{background:linear-gradient(90deg,#1F7A8C,#145866);color:#fff;border:0;border-radius:9px;padding:10px 20px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;align-self:flex-start}',
      '#pf-rev .rv-ag-send:hover{background:linear-gradient(90deg,#258ea3,#1F7A8C)}',
      '#pf-rev .rv-ag-thinking{color:#1F7A8C;font-size:13px;font-style:italic;margin:4px 0}',
      '#pf-rev .rv-ag-dot{display:inline-block;animation:rv-blink 1.4s infinite}',
      '#pf-rev .rv-ag-dot:nth-child(2){animation-delay:.2s}',
      '#pf-rev .rv-ag-dot:nth-child(3){animation-delay:.4s}',
      '@keyframes rv-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}',
      /* v37: Market view section headers */
      '#pf-rev h3.rv-sect-h{margin:24px 0 10px;font-size:16px;color:#1a2b3a;border-left:4px solid #1F7A8C;padding-left:10px}',
      /* v37: Day Plan CTA + output */
      '#pf-rev .rv-plan-cta{display:flex;align-items:center;gap:20px;background:linear-gradient(135deg,#145866 0%,#1F7A8C 100%);color:#fff;border:0;border-radius:14px;padding:22px 26px;margin-bottom:18px;box-shadow:0 6px 20px rgba(20,88,102,.25)}',
      '#pf-rev .rv-plan-cta h3{color:#fff;font-size:20px;margin:0 0 6px}',
      '#pf-rev .rv-plan-cta p.sub{color:rgba(255,255,255,.85);margin:0 0 6px;font-size:13.5px;line-height:1.5}',
      '#pf-rev .rv-plan-cta p.rv-note{color:rgba(255,255,255,.6);font-size:11.5px;margin:4px 0 0}',
      '#pf-rev .rv-plan-cta-left{flex:1 1 auto}',
      '#pf-rev .rv-plan-cta-right{flex:0 0 auto}',
      '#pf-rev .rv-plan-btn{background:#fff;color:#145866;border:0;border-radius:11px;padding:14px 22px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:transform .1s ease}',
      '#pf-rev .rv-plan-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.14)}',
      '#pf-rev .rv-plan-pending h3{color:#1F7A8C}',
      '#pf-rev .rv-plan-steps{list-style:none;padding:0;margin:14px 0;display:flex;gap:6px;flex-wrap:wrap}',
      '#pf-rev .rv-plan-steps li{padding:6px 12px;background:#fafaf6;border:1px solid #e4e2dc;border-radius:8px;font-size:12px;color:#7b8494}',
      '#pf-rev .rv-plan-steps li.on{background:#e6f4ee;color:#1a6442;border-color:#bfe3d0}',
      '#pf-rev .rv-plan-steps li.work{background:#fdf8ee;color:#9d7d5f;border-color:#efe4c7;animation:rv-blink 1.4s infinite}',
      '#pf-rev .rv-plan-out{border-color:#d6e4e8}',
      '#pf-rev .rv-plan-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '#pf-rev .rv-plan-head-r{display:flex;gap:6px;flex-wrap:wrap}',
      '#pf-rev .rv-plan-top{background:#fdf8ee;border:1px solid #efe4c7;border-radius:10px;padding:10px 14px;margin:10px 0 14px}',
      '#pf-rev .rv-plan-top b{color:#9d7d5f;font-size:12px;text-transform:uppercase;letter-spacing:.3px}',
      '#pf-rev .rv-plan-top ol{margin:6px 0 0 18px;padding:0;font-size:13px;color:#1a2b3a}',
      '#pf-rev .rv-plan-top ol li{margin-bottom:3px}',
      '#pf-rev .rv-plan-top ol li b{color:#1a2b3a;font-size:13px;text-transform:none;letter-spacing:0}',
      '#pf-rev .rv-plan-watch{margin-top:10px;font-size:12.5px;color:#52514e}',
      '#pf-rev .rv-plan-watch ul{margin:4px 0 0 18px;padding:0}',
      '#pf-rev .rv-plan-tbl{font-size:12.5px}',
      /* confidence pills (used on Calendar too) */
      '#pf-rev .rv-conf{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase}',
      '#pf-rev .rv-conf-hi{background:#e6f4ee;color:#1a6442}',
      '#pf-rev .rv-conf-md{background:#fdf8ee;color:#9d7d5f}',
      '#pf-rev .rv-conf-lo{background:#fbe9e7;color:#8a1e15}',
      /* plan action badges */
      '#pf-rev .rv-planact{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.3px}',
      '#pf-rev .rv-planact-app{background:#e6f4ee;color:#1a6442}',
      '#pf-rev .rv-planact-push{background:#e8f0fd;color:#1646a6}',
      '#pf-rev .rv-planact-lock{background:#efecf9;color:#4e3fa5}',
      '#pf-rev .rv-planact-soft{background:#fdf0e6;color:#9d4712}',
      '#pf-rev .rv-planact-pro{background:#fdeaf4;color:#9d1e5c}',
      /* ---------- v39 Alfred styles ---------- */
      '#pf-rev .rv-alert-pip{display:inline-block;background:#d0362b;color:#fff;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:999px;margin-left:5px;vertical-align:middle}',
      '#pf-rev .rv-alf-hero{background:linear-gradient(135deg,#1a2238 0%,#0f1424 100%);color:#fff;padding:26px 30px;border-radius:14px;margin-bottom:18px;position:relative;overflow:hidden;box-shadow:0 6px 20px rgba(15,20,36,.25)}',
      '#pf-rev .rv-alf-hero::after{content:"🎩";position:absolute;right:28px;top:16px;font-size:72px;opacity:.08}',
      '#pf-rev .rv-alf-hero h2{margin:0 0 4px;font-size:16px;font-weight:600;letter-spacing:.3px;opacity:.85;text-transform:uppercase}',
      '#pf-rev .rv-alf-hero .headline{margin:0;font-size:22px;font-weight:600;line-height:1.35;max-width:880px;letter-spacing:-.2px}',
      '#pf-rev .rv-alf-hero .position{margin:14px 0 0;font-size:14px;opacity:.88;line-height:1.55;max-width:880px}',
      '#pf-rev .rv-alf-hero .meta{display:flex;gap:18px;margin-top:16px;font-size:12px;opacity:.75;flex-wrap:wrap}',
      '#pf-rev .rv-alf-hero .meta b{opacity:1;font-weight:600}',
      '#pf-rev .rv-alf-hero .rv-btn{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.25);padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;margin-right:8px}',
      '#pf-rev .rv-alf-hero .rv-btn:hover{background:rgba(255,255,255,.22)}',
      '#pf-rev .rv-alf-hero .rv-btn.primary{background:#2ba57a;border-color:#2ba57a}',
      '#pf-rev .rv-alf-hero .rv-btn.primary:hover{background:#249b70}',
      '#pf-rev .rv-alf-section{margin:24px 0 10px;font-size:11.5px;font-weight:700;letter-spacing:.6px;color:#52514e;text-transform:uppercase}',
      '#pf-rev .rv-alf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px}',
      '#pf-rev .rv-alf-act{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:18px 20px;position:relative;box-shadow:0 1px 2px rgba(8,16,26,.04);transition:border-color .15s,box-shadow .15s}',
      '#pf-rev .rv-alf-act.approved{border-color:#2ba57a;background:#f4fbf7}',
      '#pf-rev .rv-alf-act.rejected{border-color:#c0392b;background:#fdf6f5;opacity:.75}',
      '#pf-rev .rv-alf-act.snoozed{border-color:#eb6834;background:#fdf8f3;opacity:.85}',
      '#pf-rev .rv-alf-act .top{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}',
      '#pf-rev .rv-alf-act h4{margin:0;font-size:15px;font-weight:700;color:#1a2238;flex:1;line-height:1.35}',
      '#pf-rev .rv-alf-cat{font-size:10.5px;font-weight:700;letter-spacing:.3px;padding:3px 8px;border-radius:5px;text-transform:uppercase;display:inline-block;background:#eef3f8;color:#1a3b60;flex-shrink:0}',
      '#pf-rev .rv-alf-cat.pricing{background:#e8f0fd;color:#1646a6}',
      '#pf-rev .rv-alf-cat.inventory{background:#efecf9;color:#4e3fa5}',
      '#pf-rev .rv-alf-cat.promotion{background:#fdeaf4;color:#9d1e5c}',
      '#pf-rev .rv-alf-cat.comp{background:#fdf0e6;color:#9d4712}',
      '#pf-rev .rv-alf-cat.operations{background:#eceff1;color:#455a64}',
      '#pf-rev .rv-alf-cat.fnb{background:#e6f4ee;color:#1a6442}',
      '#pf-rev .rv-alf-scope{font-size:12px;color:#7b8494;margin-bottom:10px;font-weight:500}',
      '#pf-rev .rv-alf-line{margin:8px 0;font-size:13px;line-height:1.5;color:#2c3440}',
      '#pf-rev .rv-alf-line b{font-weight:600;color:#1a2238;text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;display:inline-block;min-width:78px;margin-right:6px;color:#52514e}',
      '#pf-rev .rv-alf-action-text{background:#f8f6ef;border-left:3px solid #d4a94e;padding:10px 12px;margin:10px 0 12px;border-radius:0 6px 6px 0;font-size:13px;color:#2c3440;font-weight:500}',
      '#pf-rev .rv-alf-meter{display:flex;gap:14px;margin:10px 0 12px;align-items:center;font-size:11.5px;color:#7b8494}',
      '#pf-rev .rv-alf-meter .bar{flex:1;height:6px;background:#eceae3;border-radius:3px;overflow:hidden;max-width:140px}',
      '#pf-rev .rv-alf-meter .fill{height:100%;background:linear-gradient(90deg,#2ba57a,#1a8f63);transition:width .3s}',
      '#pf-rev .rv-alf-meter .impact{font-weight:700;color:#1a6442;font-size:13px}',
      '#pf-rev .rv-alf-btns{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}',
      '#pf-rev .rv-alf-btn{border:1px solid #d4d2cb;background:#fff;color:#2c3440;font:inherit;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:7px;cursor:pointer;transition:background .15s,border-color .15s}',
      '#pf-rev .rv-alf-btn:hover{background:#f6f4ee}',
      '#pf-rev .rv-alf-btn.approve{background:#2ba57a;border-color:#2ba57a;color:#fff}',
      '#pf-rev .rv-alf-btn.approve:hover{background:#249b70}',
      '#pf-rev .rv-alf-btn.reject:hover{background:#fdf6f5;border-color:#c0392b;color:#c0392b}',
      '#pf-rev .rv-alf-btn.snooze:hover{background:#fdf8f3;border-color:#eb6834;color:#eb6834}',
      '#pf-rev .rv-alf-btn.edit:hover{background:#eef3f8;border-color:#1a3b60;color:#1a3b60}',
      '#pf-rev .rv-alf-done{font-size:12px;font-weight:600;color:#1a6442;margin-top:10px;padding:7px 10px;background:#e6f4ee;border-radius:6px;display:inline-block}',
      '#pf-rev .rv-alf-done.rej{color:#8a1e15;background:#fbe9e7}',
      '#pf-rev .rv-alf-done.snz{color:#9d4712;background:#fdf0e6}',
      '#pf-rev .rv-alf-lists{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}',
      '#pf-rev .rv-alf-list{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(8,16,26,.04)}',
      '#pf-rev .rv-alf-list h3{margin:0 0 10px;font-size:13.5px;font-weight:700;color:#1a2238;display:flex;align-items:center;gap:8px}',
      '#pf-rev .rv-alf-list ul{margin:0;padding:0;list-style:none}',
      '#pf-rev .rv-alf-list li{padding:9px 0;border-bottom:1px solid #f1efe9;font-size:13px;line-height:1.5}',
      '#pf-rev .rv-alf-list li:last-child{border-bottom:0}',
      '#pf-rev .rv-alf-list li b{color:#1a2238;display:block;font-size:13px;margin-bottom:2px}',
      '#pf-rev .rv-alf-list li .dt{color:#7b8494;font-size:11.5px;font-weight:600;margin-top:4px}',
      '#pf-rev .rv-alf-list li .mit{color:#1a6442;font-size:12px;margin-top:4px;font-style:italic}',
      '#pf-rev .rv-alf-pace{background:#fdfcf7;border:1px solid #e9e3ca;border-radius:12px;padding:16px 20px;margin-top:14px;font-size:13.5px;line-height:1.6;color:#2c3440}',
      '#pf-rev .rv-alf-pace b{display:block;margin-bottom:6px;color:#9d7d5f;font-size:11.5px;letter-spacing:.4px;text-transform:uppercase}',
      '#pf-rev .rv-alf-watch{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
      '#pf-rev .rv-alf-watch .chip{background:#fff;border:1px solid #e4e2dc;border-radius:8px;padding:8px 12px;font-size:12px;color:#2c3440}',
      '#pf-rev .rv-alf-watch .chip b{color:#1a2238;display:block;font-size:12px;font-weight:700;margin-bottom:2px}',
      '#pf-rev .rv-alf-scorecard{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:18px 20px;margin-top:14px}',
      '#pf-rev .rv-alf-scorecard .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:10px}',
      '#pf-rev .rv-alf-scorecard .st{background:#f8f6ef;border-radius:8px;padding:10px 12px;text-align:left}',
      '#pf-rev .rv-alf-scorecard .st .l{font-size:10.5px;color:#7b8494;text-transform:uppercase;letter-spacing:.3px;font-weight:600}',
      '#pf-rev .rv-alf-scorecard .st .v{font-size:19px;font-weight:700;color:#1a2238;margin-top:3px}',
      '#pf-rev .rv-alf-learn{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:16px 20px;margin-top:14px}',
      '#pf-rev .rv-alf-learn h3{margin:0 0 6px;font-size:13.5px;font-weight:700;color:#1a2238}',
      '#pf-rev .rv-alf-learn .sub{color:#7b8494;font-size:12px;margin:0 0 10px}',
      '#pf-rev .rv-alf-learn ul{margin:0;padding-left:18px}',
      '#pf-rev .rv-alf-learn li{font-size:13px;line-height:1.55;color:#2c3440;margin-bottom:5px}',
      '#pf-rev .rv-alf-alerts-panel{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:0;margin-bottom:14px;overflow:hidden}',
      '#pf-rev .rv-alf-alert-item{padding:11px 16px;border-bottom:1px solid #f1efe9;display:flex;gap:10px;align-items:flex-start;font-size:13px}',
      '#pf-rev .rv-alf-alert-item:last-child{border-bottom:0}',
      '#pf-rev .rv-alf-alert-item .dot{width:8px;height:8px;border-radius:50%;background:#1F7A8C;margin-top:5px;flex-shrink:0}',
      '#pf-rev .rv-alf-alert-item.high .dot{background:#c0362b}',
      '#pf-rev .rv-alf-alert-item.low .dot{background:#999}',
      '#pf-rev .rv-alf-alert-item b{color:#1a2238;font-weight:700;display:block}',
      '#pf-rev .rv-alf-alert-item .dtl{color:#52514e;font-size:12.5px;margin-top:2px;line-height:1.45}',
      '#pf-rev .rv-alf-alert-item .meta{color:#7b8494;font-size:11px;margin-top:3px}',
      '#pf-rev .rv-alf-empty{text-align:center;padding:40px 20px;color:#7b8494}',
      '#pf-rev .rv-alf-empty h3{color:#2c3440;font-weight:700;margin:0 0 8px}',
      '#pf-rev .rv-alf-loading{text-align:center;padding:60px 20px;color:#7b8494;font-size:14px}',
      '#pf-rev .rv-alf-note-input{display:block;width:100%;margin-top:8px;padding:8px 10px;border:1px solid #d4d2cb;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box}',
      /* v39.2 Market Watch */
      '#pf-rev .rv-alf-market-card{background:#fff;border:1px solid #e4e2dc;border-radius:12px;padding:16px 20px;margin-bottom:14px;box-shadow:0 1px 2px rgba(8,16,26,.04)}',
      '#pf-rev .rv-alf-market-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#52514e;margin-bottom:12px}',
      '#pf-rev .rv-alf-market-legend span{display:inline-flex;align-items:center;gap:6px}',
      '#pf-rev .rv-alf-market-legend i{display:inline-block;width:14px;height:3px;border-radius:2px}',
      '#pf-rev .rv-alf-market-chart{position:relative;height:280px;margin:0 -4px}',
      '#pf-rev .rv-alf-market-note{margin-top:12px;padding:10px 12px;background:#f8f6ef;border-radius:8px;font-size:12.5px;color:#2c3440;line-height:1.5}',
      '#pf-rev .rv-alf-market-note b{font-weight:700;color:#1a2238}'
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
  var UI = { view: 'alfred', roomType: 'exec_dbl' };

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
    maxDailyChange: 20,    // £ guardrail — v39.14: raised £15 → £20 to match Patrik's stated normal (max £50 rare)
    sundayFloor: 65,       // v39.14: hard floor for Sunday RO (no spa therapist currently)
    weights: { comp: 5, forecast: 3, events: 2, pickup: 3 }  // v39.14: comp bumped 4→5 per Patrik ("competition first, occupancy second")
  };

  /* ---------- comp set ---------- */
  /* v39.14: realigned to Patrik's actively-monitored set — Coombe, DoubleTree, Windmill, Ramada, Novotel.
     Chesford, Nailcote, Mallory kept at low weight for market visibility but not drivers. */
  var COMP_SET = [
    { id: 'coombe',   label: 'Coombe Abbey',               weight: 5, base: 185 },
    { id: 'dthilton', label: 'DoubleTree by Hilton Coventry',weight:5, base: 142 },
    { id: 'windmill', label: 'Windmill Village',           weight: 4, base: 128 },
    { id: 'ramada',   label: 'Ramada Coventry',            weight: 4, base: 95  },
    { id: 'novotel',  label: 'Novotel Coventry',           weight: 4, base: 118 },
    { id: 'chesford', label: 'Chesford Grange',            weight: 1, base: 134 },
    { id: 'nailcote', label: 'Nailcote Hall',              weight: 1, base: 149 },
    { id: 'mallory',  label: 'Mallory Court',              weight: 1, base: 215 }
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

  function priceSearch(baseOcc, compRef, capacity, floor, ceiling, prevReco, dowIndex) {
    var best = null, bestP = null;
    var lo = Math.max(floor, (prevReco || compRef || 100) - SETTINGS.maxDailyChange);
    var hi = Math.min(ceiling, (prevReco || compRef || 100) + SETTINGS.maxDailyChange);
    if (lo < floor) lo = floor; if (hi > ceiling) hi = ceiling;
    // If no previous reco, search the whole band
    if (!prevReco) { lo = floor; hi = ceiling; }
    // v39.14 — Sunday RO floor per Patrik's rule (no spa therapist — Sundays go to the bottom but never below £65)
    if (dowIndex === 0 && lo < SETTINGS.sundayFloor) lo = SETTINGS.sundayFloor;
    if (dowIndex === 0 && hi < SETTINGS.sundayFloor) hi = SETTINGS.sundayFloor;
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

    // v38: live forward on-books from Guestline (if available)
    var live = getCachedBooks();
    var liveForDay = live && live.byDate && live.byDate[night.d] ? live.byDate[night.d] : null;
    var liveRoomsThisType = liveForDay && liveForDay.byRoomType && liveForDay.byRoomType[roomType] ? liveForDay.byRoomType[roomType].rooms : null;
    var liveDataPresent = liveForDay && liveForDay.totals && liveForDay.totals.rooms != null;

    // Adjust base occupancy per room type (small bias by category)
    var typeAdj = { double: 1.00, twin: 0.94, suite: 0.70, accessible: 0.60 }[rt.cat] || 1;
    var occ = Math.max(0.05, Math.min(0.99, night.baseOcc * typeAdj));

    // If we have live on-books data for this day, lift forecast occupancy toward that minimum
    if (liveDataPresent) {
      var lettable = 114;
      var currentHouseOcc = Math.min(0.99, liveForDay.totals.rooms / lettable);
      // Blend: forecast can't be below what's already booked
      if (currentHouseOcc > occ) occ = Math.min(0.99, Math.max(occ, currentHouseOcc + 0.08));   // add a touch of pickup headroom
    }

    // Per-room-type comp reference — add exec supplement if applicable
    var compRef = night.compRef + (rt.exec ? 10 : -6);
    if (rt.cat === 'suite') compRef += 45;
    // Lift for event nights
    compRef = round(compRef * (1 + 0.025 * night.eventScore), 0);
    // v39.14 — pass day-of-week so priceSearch can apply the Sunday floor (dow 0 = Sun)
    var nDow = (new Date(night.d + 'T00:00:00Z')).getUTCDay();
    var pr = priceSearch(occ, compRef, rt.rooms, rt.floor, rt.ceiling, prevReco, nDow);
    var current = rt.bar;
    // On-books: prefer live from Guestline; fall back to demo
    var onBooks = liveRoomsThisType != null ? liveRoomsThisType : Math.round(rt.rooms * occ * 0.72);
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

  /* v37: confidence heuristic for a night row — High / medium / low.
     - Big swings outside ± max daily change → low
     - Stable move (within ±£10) + event or strong forecast occ → high
     - Everything else → medium */
  function computeConfidence(n) {
    var absMove = Math.abs(n.recommended - n.current);
    if (absMove > SETTINGS.maxDailyChange * 1.4) return 'low';
    if (absMove <= 10 && (n.eventScore >= 3 || n.occ >= 0.85 || n.occ <= 0.2)) return 'high';
    if (absMove <= 15) return 'medium';
    return 'medium';
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
    var al = getCachedAlerts();
    var unread = (al && al.alerts) ? al.alerts.length : 0;
    var alertBadge = unread > 0 ? ' <span class="rv-alert-pip">' + unread + '</span>' : '';
    var tabs = [
      ['morning',  '☀ Morning View'],
      ['alfred',   '<img src="img/aria.png" style="width:16px;height:16px;vertical-align:-3px;margin-right:4px;border-radius:3px"> ARIA' + alertBadge],
      ['dash',     'Dashboard'],
      ['agent',    '✨ Ask ARIA'],
      ['calendar', 'Calendar'],
      ['twelve',   '12-Month Forecast'],
      ['bulk',     'Bulk Rates'],
      ['groupq',   'Group Offer'],
      ['discrep',  'Discrepancies'],
      ['team',     'Team Input'],
      ['market',   'Market view'],
      ['settings', 'Settings']
    ];
    return '<div class="rv-tabs">' + tabs.map(function (t) {
      return '<button data-rv-view="' + t[0] + '"' + (UI.view === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  var HOSREV_VERSION = 'v39.14';
  function phaseBadge() {
    var liveBooks = getCachedBooks();
    var liveOnBooks = !!(liveBooks && liveBooks.byDate);
    var brief = getCachedAlfredBrief();
    if (brief && brief.brief) return 'Phase 2 · ARIA · ' + HOSREV_VERSION;
    if (liveOnBooks) return 'Phase 1 · LIVE · ' + HOSREV_VERSION;
    return 'Phase 1 · Demo · ' + HOSREV_VERSION;
  }
  var FN_BASE = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/';
  var AI_ENDPOINT = FN_BASE + 'hosrevAi';
  var AGENT_ENDPOINT = FN_BASE + 'hosrevAgent';
  var EVENTS_ENDPOINT = FN_BASE + 'hosrevEvents';
  var COMP_ENDPOINT = FN_BASE + 'hosrevComp';
  var PLAN_ENDPOINT = FN_BASE + 'hosrevPlan';
  var BOOKS_ENDPOINT = FN_BASE + 'hosrevBooks';
  /* v39 — Alfred endpoints */
  var ALFRED_BRIEF_GET_ENDPOINT = FN_BASE + 'alfredBriefGet';
  var ALFRED_BRIEF_ENDPOINT     = FN_BASE + 'alfredBrief';
  var ALFRED_DECISION_ENDPOINT  = FN_BASE + 'alfredDecision';
  var ALFRED_ALERTS_ENDPOINT    = FN_BASE + 'alfredAlerts';
  var ALFRED_SCORECARD_ENDPOINT = FN_BASE + 'alfredScorecard';
  var ALFRED_LEARNINGS_ENDPOINT = FN_BASE + 'alfredLearnings';
  /* v39.14 — 12-month forecast + Manager Flash history + Team Input endpoints */
  var FORECAST_ENDPOINT         = FN_BASE + 'hosbookForecastGet';
  var FORECAST_LONG_RUN_ENDPOINT = FN_BASE + 'hosbookLongRun';
  var FLASH_HIST_ENDPOINT       = FN_BASE + 'managerFlashHistoryGet';
  var TEAM_INPUT_ENDPOINT       = FN_BASE + 'alfredQuestionnaireGet';
  var NOTIF_USERS_GET_ENDPOINT    = FN_BASE + 'notificationUsersGet';
  var NOTIF_USERS_SET_ENDPOINT    = FN_BASE + 'notificationUsersSet';
  var NOTIF_USERS_DELETE_ENDPOINT = FN_BASE + 'notificationUsersDelete';
  var NOTIF_USERS_CACHE_KEY       = 'hosrev_notif_users_cache';
  var NOTIF_USERS_CACHE_TTL       = 5 * 60 * 1000;
  var NOTIF_USERS_INFLIGHT = false;
  var FORECAST_CACHE_KEY        = 'hosrev_forecast_12m_cache';
  var FLASH_HIST_CACHE_KEY      = 'hosrev_flash_hist_cache';
  var TEAM_INPUT_CACHE_KEY      = 'hosrev_team_input_cache';
  var FORECAST_CACHE_TTL        = 60 * 60 * 1000;    // 1 hour
  var FLASH_HIST_CACHE_TTL      = 10 * 60 * 1000;    // 10 min
  var TEAM_INPUT_CACHE_TTL      = 15 * 60 * 1000;    // 15 min
  var FORECAST_INFLIGHT = false;
  var FLASH_HIST_INFLIGHT = false;
  var TEAM_INPUT_INFLIGHT = false;
  var ALFRED_BRIEF_CACHE_KEY    = 'hosrev_alfred_brief_cache';
  var ALFRED_ALERTS_CACHE_KEY   = 'hosrev_alfred_alerts_cache';
  var ALFRED_SCORE_CACHE_KEY    = 'hosrev_alfred_score_cache';
  var ALFRED_LEARN_CACHE_KEY    = 'hosrev_alfred_learn_cache';
  var ALFRED_BRIEF_CACHE_TTL    = 30 * 60 * 1000;   // 30 min
  var ALFRED_ALERTS_CACHE_TTL   =  5 * 60 * 1000;   // 5 min
  var ALFRED_SCORE_CACHE_TTL    = 30 * 60 * 1000;   // 30 min
  var ALFRED_LEARN_CACHE_TTL    = 24 * 60 * 60 * 1000; // 24h
  var ALFRED_BRIEF_INFLIGHT = false;
  var ALFRED_ALERTS_INFLIGHT = false;
  var AI_TOKEN_KEY = 'hosbusiness_gl_token';
  /* v39.9: the sign-in flow writes the token to sessionStorage, but earlier code read it from localStorage
     and threw spurious "session expired" errors. Read from BOTH storages so every call finds it. */
  function aiTok() { try { return localStorage.getItem(AI_TOKEN_KEY) || sessionStorage.getItem(AI_TOKEN_KEY); } catch (e) { return null; } }
  var AI_CACHE_KEY = 'hosrev_ai_cache';
  var EVENTS_CACHE_KEY = 'hosrev_events_cache';
  var COMP_CACHE_KEY = 'hosrev_comp_cache';
  var AGENT_HIST_KEY = 'hosrev_agent_history';
  var PLAN_CACHE_KEY = 'hosrev_plan_cache';
  var BOOKS_CACHE_KEY = 'hosrev_books_cache';
  var ACCURACY_KEY = 'hosrev_accuracy';
  var AI_CACHE_TTL = 10 * 60 * 1000;
  var EVENTS_CACHE_TTL = 24 * 60 * 60 * 1000;
  var COMP_CACHE_TTL = 6 * 60 * 60 * 1000;
  var PLAN_CACHE_TTL = 60 * 60 * 1000;   // 1 hour for a day-plan
  var BOOKS_CACHE_TTL = 30 * 60 * 1000;  // 30 min — matches server cadence
  var AI_INFLIGHT = false;
  var AGENT_INFLIGHT = false;
  var PLAN_INFLIGHT = false;
  var BOOKS_INFLIGHT = false;
  function hero() {
    var badge = phaseBadge();
    var isLive = badge.indexOf('LIVE') !== -1;
    return '<div class="rv-hero"><div><h2>Revenue Management</h2><p>Maximising net room margin across the next 365 nights · Recommendations refresh every 30 mins against latest on-books · Comp rates refreshed daily at 05:30</p></div><div class="rv-demo' + (isLive ? ' rv-demo-live' : '') + '">' + esc(badge) + '</div></div>';
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
      // v37: Build My Day Plan — the one-click workflow
      planCard() +

      '<div class="rv-tiles">' +
        tile('Nights priced', num(totalNights), 'next 365 nights', '') +
        tile('Needing a decision', num(needDec), 'next ' + horizon + ' nights · Exec dbl', needDec > 20 ? 'warn' : '') +
        tile('Rate moves recommended', num(moves), 'next ' + horizon + ' nights · move ≥ £5', '') +
        tile('Quiet nights', num(quiet), '< 30% forecast occ', 'amber') +
        tile('Avg suggested rate', gbp(avgReco), 'next ' + horizon + ' · Exec dbl', '') +
        tile('Avg comp reference', gbp(avgComp), 'weighted comp set', '') +
        tile('Event nights', num(eventN), 'impact ≥ 3/5', '') +
        accuracyTile() +   // v37
      '</div>' +

      /* v34: AI insights (rule-based for now; wires to Gemini/Claude when Gary ships the key) */
      aiInsightsCard(nights, decs, horizon) +

      /* v34: Actions — bulk operations across the engine's recommendations */
      actionsCard(nights, decs, horizon) +

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

  /* ---------- v34: AI insights (rule-based, upgrades to LLM when the key lands) ---------- */
  function aiInsightsCard(nights, decs, horizon) {
    var near = nights.slice(0, horizon);
    var insights = [];

    // 1) Big revenue opportunity: nights where recommended > current (push up) and occ > 70%
    var pushUp = near.filter(function (n) { return n.recommended - n.current >= 10 && n.occ >= 0.7; });
    if (pushUp.length) {
      var oppRooms = pushUp.reduce(function (t, n) { return t + Math.round(n.capacity * n.occ); }, 0);
      var oppRev   = pushUp.reduce(function (t, n) { return t + (n.recommended - n.current) * Math.round(n.capacity * n.occ); }, 0);
      insights.push({ t: 'rev-up', icon: '↑', title: 'Pricing power on ' + pushUp.length + ' strong nights', body: 'Forecast occupancy is ≥70% on these nights and comp has moved above us. Pushing to the recommendation could lift revenue by about ' + gbp(oppRev) + ' (' + oppRooms + ' rooms across the window). First three: ' + pushUp.slice(0, 3).map(function (n) { return shortD(n.d) + ' (+£' + (n.recommended - n.current) + ')'; }).join(', ') + '.' });
    }

    // 2) Softness pattern: run of quiet nights (<35% occ) suggests a theme
    var soft = near.filter(function (n) { return n.occ < 0.35; });
    if (soft.length >= 4) {
      var softSat = soft.filter(function (n) { return n.day === 6 || n.day === 0; }).length;
      var softSuffix = softSat > 0 ? ' — ' + softSat + ' of them are weekends, worth checking if a promo would land better than a rate cut.' : '.';
      insights.push({ t: 'soft', icon: '↓', title: soft.length + ' soft nights in the next ' + horizon + ' days', body: 'Forecast occupancy sits below 35% on these nights' + softSuffix + ' Lowest: ' + soft.slice(0, 3).map(function (n) { return shortD(n.d) + ' (' + pct(n.occ) + ')'; }).join(', ') + '.' });
    }

    // 3) Comp gap: average our recommended vs comp ref — if we're trailing by more than 10%
    var ourAvg = 0, compAvg = 0;
    near.forEach(function (n) { ourAvg += n.recommended; compAvg += n.compRef; });
    ourAvg = ourAvg / near.length; compAvg = compAvg / near.length;
    var gap = (compAvg - ourAvg) / compAvg;
    if (gap > 0.12) insights.push({ t: 'comp-gap', icon: '◎', title: 'Trailing the comp set by ' + pct(gap, 0), body: 'Our average recommended rate sits ' + gbp(compAvg - ourAvg) + ' below the weighted comp reference across the next ' + horizon + ' nights. Likely room to close part of the gap on the stronger nights without hurting demand.' });
    else if (gap < -0.08) insights.push({ t: 'comp-ahead', icon: '◎', title: 'Pricing above the comp set', body: 'Our average recommended rate is ' + pct(-gap, 0) + ' above the comp reference. Worth validating the comp-set weights in Settings are still right for today.' });

    // 4) Events coming up
    var ev = buildNights().slice(0, horizon).filter(function (n) { return n.eventScore >= 3; });
    if (ev.length) {
      insights.push({ t: 'events', icon: '★', title: ev.length + ' high-impact event nights ahead', body: 'Dates where local events score ≥3/5. First few: ' + ev.slice(0, 3).map(function (n) { return shortD(n.d) + ' (' + n.eventScore + '/5)'; }).join(', ') + '. Check these aren\'t locked at the current BAR — the engine usually wants to push them.' });
    }

    // 5) Pending decisions urgency
    var urgent = near.filter(function (n) { return !decs['exec_dbl|' + n.d] && Math.abs(n.recommended - n.current) >= 20; });
    if (urgent.length) {
      insights.push({ t: 'urgent', icon: '⏱', title: urgent.length + ' nights where the engine wants a big move', body: 'Recommendations differ from current BAR by £20 or more and still need a decision. First: ' + urgent.slice(0, 3).map(function (n) { return shortD(n.d) + ' (' + (n.recommended > n.current ? '+' : '−') + '£' + Math.abs(n.recommended - n.current) + ')'; }).join(', ') + '.' });
    }

    if (!insights.length) insights.push({ t: 'ok', icon: '✓', title: 'Nothing urgent', body: 'Recommendations sit within normal bands across the next ' + horizon + ' nights. Nothing jumps out.' });

    // Prefer cached live Gemini result if fresh
    var live = getCachedAi();
    var useLive = !!(live && live.insights && live.insights.length);
    var shown = useLive ? live.insights : insights.slice(0, 5);
    var items = shown.map(function (i) {
      return '<div class="rv-ai-item"><span class="rv-ai-icon">' + i.icon + '</span><div><b>' + esc(i.title) + '</b><p>' + esc(i.body) + '</p></div></div>';
    }).join('');

    var mode = useLive
      ? 'Live · ' + (live.model || 'Gemini') + ' · updated ' + fmtAgo(live.ts)
      : 'Rule-based · live Gemini loads in the background if the key is set';

    // Kick off a background fetch if cache is stale and we have a token available
    setTimeout(function () { maybeFetchAi(nights, decs, horizon); }, 0);

    return '<div class="rv-card rv-ai-card" id="rv-ai-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap"><span class="rv-ai-badge">AI insights</span><span class="rv-ai-mode" id="rv-ai-mode">' + mode + '</span><button class="rv-ai-refresh" data-rv-ai-refresh title="Clear cache and re-ask Gemini">↻ Refresh</button></div><div class="rv-ai-list" id="rv-ai-list">' + items + '</div></div>';
  }

  /* ---------- v35: Gemini live insights ---------- */
  function getCachedAi() {
    try {
      var raw = localStorage.getItem(AI_CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || (Date.now() - o.ts) > AI_CACHE_TTL) return null;
      return o;
    } catch (e) { return null; }
  }
  function setCachedAi(o) {
    try { localStorage.setItem(AI_CACHE_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function fmtAgo(ts) {
    var mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return mins + ' mins ago';
    var h = Math.floor(mins / 60);
    return h + (h === 1 ? ' hr ago' : ' hrs ago');
  }
  function maybeFetchAi(nights, decs, horizon) {
    if (AI_INFLIGHT) return;
    var live = getCachedAi();
    if (live && live.insights && live.insights.length) return;    // still fresh
    var token;
    token = aiTok();
    if (!token) return;    // no token, can't call the function — stay on rule-based
    AI_INFLIGHT = true;
    var liveEv = getCachedEvents();
    var liveCo = getCachedComp();
    var payload = {
      today: new Date().toISOString().slice(0, 10),
      horizon: horizon,
      nights: nights.slice(0, horizon).map(function (n) {
        return { d: n.d, day: n.day, occ: n.occ, compRef: n.compRef, current: n.current, recommended: n.recommended, eventScore: n.eventScore || 0, reasons: n.reasons || [] };
      }),
      decisions: decs,
      settings: { commission: SETTINGS.commission, variable: SETTINGS.variable, ancillary: SETTINGS.ancillary, weights: SETTINGS.weights },
      liveEvents: liveEv && liveEv.events ? liveEv.events.slice(0, 10) : null,
      liveComp: liveCo && liveCo.byDate ? { updatedTs: liveCo.serverTs, sample: liveCo.byDate } : null
    };
    fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        AI_INFLIGHT = false;
        if (!j || !j.ok || !Array.isArray(j.insights) || !j.insights.length) return;
        var cache = { ts: Date.now(), model: j.model || 'Gemini', insights: j.insights };
        setCachedAi(cache);
        // Replace the card contents in place (no full re-render)
        var list = document.getElementById('rv-ai-list');
        var mode = document.getElementById('rv-ai-mode');
        if (list) list.innerHTML = j.insights.slice(0, 5).map(function (i) {
          return '<div class="rv-ai-item"><span class="rv-ai-icon">' + esc(i.icon || '•') + '</span><div><b>' + esc(i.title) + '</b><p>' + esc(i.body) + '</p></div></div>';
        }).join('');
        if (mode) mode.textContent = 'Live · ' + (j.model || 'Gemini') + ' · updated just now';
      }).catch(function () { AI_INFLIGHT = false; });
  }

  /* ============================================================
     v37: Build My Day Plan — the one-click workflow.
     ============================================================ */
  function getCachedPlan() {
    try {
      var raw = localStorage.getItem(PLAN_CACHE_KEY); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || (Date.now() - o.ts) > PLAN_CACHE_TTL) return null;
      return o;
    } catch (e) { return null; }
  }
  function setCachedPlan(o) { try { localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }

  function planCard() {
    var cached = getCachedPlan();
    if (cached && cached.plan) {
      return renderPlanCard(cached);
    }
    return '<div class="rv-card rv-plan-cta">' +
      '<div class="rv-plan-cta-left">' +
        '<h3>Build my Day Plan</h3>' +
        '<p class="sub">One click. The Agent bundles your engine snapshot, Guestline history, live comp rates, local events and the weather, then returns a day-by-day 30-night action plan with one-tap approvals.</p>' +
        '<p class="rv-note">Usually takes 10–20 seconds. Costs about a penny. Uses Gemini + Google Search grounding.</p>' +
      '</div>' +
      '<div class="rv-plan-cta-right">' +
        '<button class="rv-plan-btn" data-rv-plan-build>Build 30-night plan →</button>' +
      '</div>' +
    '</div>';
  }

  function renderPlanCard(c) {
    var p = c.plan || {};
    var days = Array.isArray(p.days) ? p.days : [];
    var topThree = Array.isArray(p.topThree) ? p.topThree : [];
    var watch = Array.isArray(p.watchFor) ? p.watchFor : [];

    var confBadge = function (level) {
      var klass = level === 'high' ? 'hi' : (level === 'low' ? 'lo' : 'md');
      return '<span class="rv-conf rv-conf-' + klass + '">' + esc(level || 'med') + '</span>';
    };
    var actionBadge = function (action) {
      var map = {
        approve: ['app', 'Approve'],
        push:    ['push', 'Push up'],
        lock:    ['lock', 'Lock'],
        soften:  ['soft', 'Soften'],
        promo:   ['pro', 'Promo']
      };
      var m = map[action] || ['app', action || 'Approve'];
      return '<span class="rv-planact rv-planact-' + m[0] + '">' + esc(m[1]) + '</span>';
    };

    var rows = days.map(function (d, i) {
      var delta = (d.recommended - d.currentBAR) || 0;
      var deltaH = delta > 0 ? '<span class="rv-pill up">+£' + delta + '</span>' : (delta < 0 ? '<span class="rv-pill dn">−£' + Math.abs(delta) + '</span>' : '<span class="rv-pill flat">hold</span>');
      var evL = (d.events && d.events.length) ? '<br><small style="color:#BB9979">★ ' + esc(d.events.join(', ')) + '</small>' : '';
      return '<tr>' +
        '<td><b>' + esc(d.date ? shortD(d.date) : '—') + '</b>' + evL + '</td>' +
        '<td class="n">' + gbp(d.currentBAR) + '</td>' +
        '<td class="n"><b style="color:#1F7A8C">' + gbp(d.recommended) + '</b> ' + deltaH + '</td>' +
        '<td>' + actionBadge(d.action) + '</td>' +
        '<td>' + confBadge(d.confidence) + '</td>' +
        '<td class="rv-why">' + esc(d.reason || '') + '</td>' +
        '<td><button class="rv-ag-refresh" data-rv-plan-apply="' + i + '">Apply</button></td>' +
      '</tr>';
    }).join('');

    var topThreeH = topThree.map(function (t) {
      return '<li><b>' + esc(t.title || '') + '</b> — ' + esc(t.body || '') + '</li>';
    }).join('');
    var watchH = watch.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');

    var sources = (c.sources || []).map(function (s) {
      return '<a href="' + esc(s.uri) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title || s.uri) + '</a>';
    }).join('<span class="rv-ag-sep">·</span>');

    var stanceColor = { push: '#1a8f63', hold: '#52514e', soften: '#eb6834', mixed: '#7a4fc4' }[p.stance || ''] || '#1a2b3a';

    return '<div class="rv-card rv-plan-out">' +
      '<div class="rv-plan-head">' +
        '<div>' +
          '<span class="rv-ai-badge">Day Plan</span>' +
          '<span class="rv-ai-mode" style="margin-left:6px">' + esc(c.model || 'Gemini') + ' · updated ' + fmtAgo(c.ts) + '</span>' +
        '</div>' +
        '<div class="rv-plan-head-r">' +
          '<button class="v16-chip" data-rv-plan-apply-all>Approve all</button>' +
          '<button class="v16-chip" data-rv-plan-apply-weekends>Approve weekends</button>' +
          '<button class="v16-chip" data-rv-plan-build>↻ Rebuild</button>' +
        '</div>' +
      '</div>' +
      '<h3 style="margin:14px 0 4px">' + esc(p.summary || 'Day plan') + '</h3>' +
      '<p class="sub" style="margin:0 0 14px">Stance: <b style="color:' + stanceColor + '">' + esc(p.stance || '—') + '</b> · Confidence: <b>' + esc(p.confidence || '—') + '</b>' + (p.forecastAccuracyNote ? ' · <em>' + esc(p.forecastAccuracyNote) + '</em>' : '') + '</p>' +
      (topThreeH ? '<div class="rv-plan-top"><b>Top three actions today</b><ol>' + topThreeH + '</ol></div>' : '') +
      '<div style="overflow-x:auto"><table class="rv-t rv-plan-tbl"><thead><tr><th>Night</th><th class="n">BAR</th><th class="n">Recommended</th><th>Action</th><th>Conf.</th><th>Reason</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (watchH ? '<div class="rv-plan-watch"><b>Watch for</b><ul>' + watchH + '</ul></div>' : '') +
      (sources ? '<p class="rv-ag-sources"><b>Sources:</b> ' + sources + '</p>' : '') +
    '</div>';
  }

  /* Build the plan by calling hosrevPlan Firebase function. */
  function buildDayPlan() {
    if (PLAN_INFLIGHT) return;
    var token; token = aiTok(); if (!token) return;
    if (!token) { alert('Please sign out and sign back in to refresh your session, then try again.'); return; }

    PLAN_INFLIGHT = true;

    // Build a snapshot — same shape as agent snapshot
    var snapshot = buildEngineSnapshot(30);
    // Last 60 days actual ADR from the Guestline feed
    var history = buildHistoryPayload(60);
    // Events + comp (may be null if not fetched yet)
    var ev = getCachedEvents();
    var co = getCachedComp();
    var payload = {
      today: new Date().toISOString().slice(0, 10),
      horizonDays: 30,
      snapshot: snapshot,
      history: history,
      events: ev && ev.events ? ev.events.slice(0, 12) : null,
      comp: co && co.byDate ? { byDate: co.byDate } : null,
      weather: null    // Gemini will pull weather via grounding
    };

    // Swap the CTA for a progress stepper
    var sect = document.querySelector('#pf-rev .rv-plan-cta, #pf-rev .rv-plan-out');
    if (sect) {
      sect.outerHTML = '<div class="rv-card rv-plan-pending" id="rv-plan-pending">' +
        '<h3>Building your Day Plan…</h3>' +
        '<p class="sub">Bundling snapshot + 60 days history + live events + comp + weather, then asking Gemini for a 30-night plan.</p>' +
        '<ol class="rv-plan-steps">' +
          '<li class="on">Collect inputs</li>' +
          '<li class="on">Send to Gemini</li>' +
          '<li class="work">Thinking …</li>' +
          '<li>Render plan</li>' +
        '</ol>' +
        '<p class="rv-ag-thinking">This usually takes 10–20 seconds.</p>' +
      '</div>';
    }

    fetch(PLAN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        PLAN_INFLIGHT = false;
        if (!j || !j.ok) {
          var p = document.getElementById('rv-plan-pending');
          if (p) p.outerHTML = '<div class="rv-card"><h3>Plan build failed</h3><p class="sub">' + esc((j && j.error) || (j && j.reason === 'no-key' ? 'Gemini API key not set' : 'Unknown error')) + '</p><button class="rv-plan-btn" data-rv-plan-build>Try again</button></div>';
          return;
        }
        var saved = { ts: Date.now(), plan: j.plan, sources: j.sources || [], model: j.model };
        setCachedPlan(saved);
        render();
      }).catch(function (e) {
        PLAN_INFLIGHT = false;
        var p = document.getElementById('rv-plan-pending');
        if (p) p.outerHTML = '<div class="rv-card"><h3>Plan build failed</h3><p class="sub">Network error: ' + esc(e && e.message || e) + '</p><button class="rv-plan-btn" data-rv-plan-build>Try again</button></div>';
      });
  }

  /* Pull last 60 days actual ADR + occupancy from the Guestline feed */
  function buildHistoryPayload(days) {
    try {
      var S = (window.Trading && window.Trading.S) ? window.Trading.S() : null;
      if (!S || !S.gl || !S.gl.byDay) return null;
      var allDays = Object.keys(S.gl.byDay).sort().slice(-(days || 60));
      return allDays.map(function (d) {
        var r = S.gl.byDay[d];
        return {
          d: d,
          adr: r.adr ? Math.round(r.adr) : null,
          occ: (r.sold && r.stock) ? Math.round((r.sold / 114) * 100) : null,
          rooms: r.sold || 0
        };
      }).filter(function (x) { return x.adr != null; });
    } catch (e) { return null; }
  }

  /* Apply one day from the plan as a decision */
  function applyPlanDay(idx) {
    var c = getCachedPlan(); if (!c || !c.plan || !c.plan.days) return;
    var d = c.plan.days[idx]; if (!d) return;
    var action = d.action === 'lock' ? 'lock' : (d.action === 'soften' || d.action === 'promo' || d.action === 'push' ? 'over' : 'approve');
    var price = (action === 'lock') ? d.currentBAR : d.recommended;
    setDecision('exec_dbl', d.date, action, price);
    render();
  }
  function applyAllPlanDays(weekendsOnly) {
    var c = getCachedPlan(); if (!c || !c.plan || !c.plan.days) return;
    var n = 0;
    c.plan.days.forEach(function (d) {
      if (!d.date) return;
      if (weekendsOnly) {
        var dow = parseISO(d.date).getDay(); if (dow !== 5 && dow !== 6) return;
      }
      var action = d.action === 'lock' ? 'lock' : (d.action === 'soften' || d.action === 'promo' || d.action === 'push' ? 'over' : 'approve');
      var price = (action === 'lock') ? d.currentBAR : d.recommended;
      setDecision('exec_dbl', d.date, action, price); n++;
    });
    alert('Applied ' + n + ' decisions from the Day Plan.');
    render();
  }

  /* v37: forecast accuracy — snapshot approved recommendations, then compare
     against Guestline actuals as nights close. Stores a rolling MAPE in state. */
  function snapshotForAccuracy() {
    try {
      var st = loadState();
      st.forecasts = st.forecasts || {};
      var decs = getDecisions();
      Object.keys(decs).forEach(function (k) {
        if (st.forecasts[k]) return;
        var parts = k.split('|'); if (parts.length !== 2) return;
        var rt = parts[0], d = parts[1];
        var row = (nightsFor(rt, 60) || []).filter(function (n) { return n.d === d; })[0];
        if (!row) return;
        st.forecasts[k] = { d: d, rt: rt, forecastOcc: Math.round(row.occ * 100), forecastRate: row.recommended, decided: Date.now() };
      });
      saveState(st);
    } catch (e) {}
  }
  function reconcileAccuracy() {
    try {
      var S = (window.Trading && window.Trading.S) ? window.Trading.S() : null;
      if (!S || !S.gl || !S.gl.byDay) return;
      var st = loadState();
      st.forecasts = st.forecasts || {};
      st.accuracy = st.accuracy || { count: 0, mape: 0, sum: 0 };
      Object.keys(st.forecasts).forEach(function (k) {
        var f = st.forecasts[k]; if (!f || f.closed) return;
        var row = S.gl.byDay[f.d]; if (!row) return;
        var actualOcc = row.sold ? Math.round((row.sold / 114) * 100) : null;
        if (actualOcc == null) return;
        var ape = Math.abs((actualOcc - f.forecastOcc) / Math.max(1, actualOcc)) * 100;
        f.closed = true; f.actualOcc = actualOcc; f.ape = ape;
        st.accuracy.sum += ape; st.accuracy.count += 1;
        st.accuracy.mape = st.accuracy.sum / st.accuracy.count;
      });
      st.forecasts = st.forecasts;
      saveState(st);
    } catch (e) {}
  }

  /* v37: Forecast accuracy tile — placeholder for now; builds as decisions close */
  function accuracyTile() {
    var st = loadState();
    var acc = st.accuracy || null;
    if (!acc || !acc.count) {
      return tile('Forecast accuracy', '—', 'builds as nights close', '');
    }
    var mape = Math.round(acc.mape * 10) / 10;
    var klass = mape <= 5 ? 'good' : (mape <= 12 ? '' : 'warn');
    return tile('Forecast accuracy', (100 - mape).toFixed(0) + '%', acc.count + ' closed · MAPE ' + mape + '%', klass);
  }

  /* ---------- v34: Actions — bulk operations ---------- */
  function actionsCard(nights, decs, horizon) {
    var near = nights.slice(0, horizon);
    var weekends = near.filter(function (n) { return n.day === 5 || n.day === 6; });
    var weekendsPending = weekends.filter(function (n) { return !decs['exec_dbl|' + n.d]; }).length;
    var narrow = near.filter(function (n) { return Math.abs(n.recommended - n.current) <= 20 && !decs['exec_dbl|' + n.d]; }).length;
    var overrideCount = Object.keys(decs).filter(function (k) { return decs[k].d === 'over'; }).length;
    var monthEnd = (function () {
      var now = new Date(); var e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return Math.max(0, Math.floor((e - now) / 864e5));
    })();

    return '<div class="rv-card rv-actions-card"><h3>Actions</h3><p class="sub">One-click bulk operations across all room types. Nothing writes to Rezlynx — all decisions are saved locally until write-back is on.</p>' +
      '<div class="rv-actions">' +
        '<button class="rv-act" data-rv-act="approve-weekends"><b>Approve weekend recommendations</b><small>' + weekendsPending + ' weekend nights pending across the next ' + horizon + ' days</small></button>' +
        '<button class="rv-act" data-rv-act="approve-narrow"><b>Approve where move ≤ ±£20</b><small>' + narrow + ' low-risk nights — follows the engine quietly</small></button>' +
        '<button class="rv-act" data-rv-act="lock-month"><b>Lock current BAR to month-end</b><small>Freeze for ' + monthEnd + ' nights while something\'s under investigation</small></button>' +
        '<button class="rv-act" data-rv-act="promo-weekend-escape"><b>Push Weekend Escape −15%</b><small>Apply to Thu–Sun across the next 30 days</small></button>' +
        '<button class="rv-act" data-rv-act="clear-overrides"><b>Clear all overrides</b><small>' + overrideCount + ' active overrides across all room types</small></button>' +
        '<button class="rv-act" data-rv-act="send-patrik"><b>Export for Patrik to review</b><small>CSV of everything pending, across all room types</small></button>' +
      '</div>' +
      '<p class="rv-note">An "Action" is reversible — click Clear all overrides or Reset decisions in Settings to undo. Once Rezlynx write-back is turned on (Phase 2+), each Approve/Override will push the rate to the PMS.</p>' +
    '</div>';
  }

  /* ---------- Action handlers ---------- */
  function runAction(key) {
    var done = 0;
    var ROOMS = ['classic_dbl', 'classic_twn', 'exec_dbl', 'exec_dbl_a', 'exec_trp', 'exec_twn', 'exec_twn_a', 'jr_suite', 'priv_dbl'];
    if (key === 'approve-weekends') {
      ROOMS.forEach(function (rt) {
        nightsFor(rt, 60).forEach(function (n) {
          if ((n.day === 5 || n.day === 6) && !decisionFor(rt, n.d)) { setDecision(rt, n.d, 'approve', n.recommended); done++; }
        });
      });
      alert('Approved ' + done + ' weekend nights at the engine\'s recommended rate.');
    } else if (key === 'approve-narrow') {
      ROOMS.forEach(function (rt) {
        nightsFor(rt, 60).forEach(function (n) {
          if (Math.abs(n.recommended - n.current) <= 20 && !decisionFor(rt, n.d)) { setDecision(rt, n.d, 'approve', n.recommended); done++; }
        });
      });
      alert('Approved ' + done + ' nights with low-risk moves (≤ ±£20).');
    } else if (key === 'lock-month') {
      var now = new Date(), end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      ROOMS.forEach(function (rt) {
        nightsFor(rt, 60).forEach(function (n) {
          var d = parseISO(n.d);
          if (d <= end) { setDecision(rt, n.d, 'lock', n.current); done++; }
        });
      });
      alert('Locked current BAR on ' + done + ' nights through month-end.');
    } else if (key === 'promo-weekend-escape') {
      ROOMS.forEach(function (rt) {
        nightsFor(rt, 30).forEach(function (n) {
          if (n.day >= 4 || n.day === 0) {    // Thu-Sun
            var promoPrice = Math.round(n.current * 0.85);
            setDecision(rt, n.d, 'over', promoPrice); done++;
          }
        });
      });
      alert('Weekend Escape −15% applied to ' + done + ' Thu-Sun nights across the next 30 days.');
    } else if (key === 'clear-overrides') {
      var st = loadState(); var decs = st.decisions || {};
      Object.keys(decs).forEach(function (k) { if (decs[k].d === 'over') { delete decs[k]; done++; } });
      st.decisions = decs; saveState(st);
      alert('Cleared ' + done + ' active overrides.');
    } else if (key === 'send-patrik') {
      exportCsv(); return;
    }
    bustCache(); render();
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

      // v37: confidence per night
      var conf = computeConfidence(n);
      var confKlass = conf === 'high' ? 'hi' : (conf === 'low' ? 'lo' : 'md');

      return '<tr class="' + cls + '">' +
        '<td><b>' + esc(shortD(n.d)) + '</b></td>' +
        '<td class="n">' + num(n.onBooks) + ' / ' + num(n.capacity) + '</td>' +
        '<td class="n">' + pct(n.occ) + '</td>' +
        '<td class="n">' + gbp(n.compRef) + '</td>' +
        '<td class="n">' + gbp(n.current) + '</td>' +
        '<td class="n">' + recoCell + ' ' + pill + '</td>' +
        '<td class="n">' + gbp(n.netPerRoom, 2) + '</td>' +
        '<td><span class="rv-conf rv-conf-' + confKlass + '">' + conf + '</span></td>' +
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
      '<table class="rv-t"><thead><tr><th>Night</th><th class="n">On books</th><th class="n">Fcast occ</th><th class="n">Comp ref</th><th class="n">Current BAR</th><th class="n">Sell at</th><th class="n">Net / room</th><th>Conf.</th><th>Why</th><th>Decision</th></tr></thead><tbody>' + rows + '</tbody></table>' +
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
    var liveComp = getCachedComp();   // latest SerpApi snapshot or null

    function cellForHotel(comp, night, ci, idx) {
      var displayed, genius;
      if (comp) {
        // If we have a live SerpApi rate for this hotel+date, use it
        if (liveComp && liveComp.byDate && liveComp.byDate[night.d] && liveComp.byDate[night.d][comp.id] && liveComp.byDate[night.d][comp.id].rate) {
          displayed = liveComp.byDate[night.d][comp.id].rate;
          genius = Math.round(displayed * 0.9);
          return '<td class="n"><div class="rv-compcell live">' + gbp(displayed) + '<span class="g">G ' + gbp(genius) + '</span></div></td>';
        }
        // Fall back to demo distribution
        var seed = (comp.id.length * 13 + ci * 7) + parseISO(night.d).getDate();
        var pseudo = function (s) { var x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
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

    // Kick off a background fetch of live comp data
    setTimeout(function () { maybeFetchComp(); }, 0);

    var usRow = '<tr><td><b>Brandon Hall</b><br><small style="color:#7b8494">Classic double · recommended</small></td>' + nights.map(function (n, i) { return cellForHotel(null, n, 0, i); }).join('') + '</tr>';
    var compRows = COMP_SET.map(function (c, ci) {
      var starBtns = '';
      for (var w = 1; w <= 5; w++) {
        starBtns += '<button data-rv-cw="' + c.id + '" data-rv-w="' + w + '" title="Set weight to ' + w + '" style="border:0;background:none;padding:0 1px;font-size:14px;cursor:pointer;color:' + (w <= c.weight ? '#BB9979' : '#e4e2dc') + '">●</button>';
      }
      return '<tr><td>' + esc(c.label) + '<br><span class="rv-stars">' + starBtns + '</span></td>' + nights.map(function (n) { return cellForHotel(c, n, ci); }).join('') + '</tr>';
    }).join('');

    var liveBadge = liveComp && liveComp.byDate
      ? '<span class="rv-ai-badge">Live SerpApi</span> <span class="rv-ai-mode" style="margin-left:6px">updated ' + fmtAgo(liveComp.ts) + '</span>'
      : '<span class="rv-ai-mode">Demo rates · SerpApi shopper runs Sunday 05:30 if the key is set</span>';
    return hero() + viewTabs() +
      '<div class="rv-card">' +
      '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-bottom:6px">' +
        '<div><h3>Compset — next ' + days + ' nights</h3><p class="sub" style="margin:2px 0 0">' + liveBadge + '</p></div>' +
      '</div>' +
      '<p class="sub" style="margin:10px 0 12px">Displayed consumer rate · G = Booking Genius estimate (−10%). Our Classic double shows the engine\'s recommended rate (and current BAR). Click the ● stars to adjust each hotel\'s weight 1–5.</p>' +
      '<div style="overflow-x:auto"><table class="rv-t"><thead><tr><th>Hotel</th>' + headerDates + '</tr></thead><tbody>' + usRow + compRows + '</tbody></table></div>' +
      '<p class="rv-note">Live comp rates come from the SerpApi Google Hotels shopper (weekly Sunday run, Firestore-cached). Cells with live data have a subtle green tint.</p>' +
      '</div>';
  }

  /* ============================================================
     v39.14 — 12-Month Forecast view
     ============================================================ */
  function viewTwelveMonth() {
    var c = getCachedForecast();
    var f = c && c.forecast;
    var cachedAge = c && c.ts ? Math.round((Date.now() - c.ts) / 60000) : null;

    var body;
    if (!f) {
      body = (
        '<div class="rv-card">' +
          '<h3>12-month forecast</h3>' +
          '<p class="sub">Loading the on-books pull + per-month aggregation. This runs nightly at 03:30 London and rebuilds at 07:40 before the daily email.</p>' +
          '<div class="rv-alf-loading" style="padding:20px;text-align:center;color:#7b8494">Fetching forecast…</div>' +
        '</div>'
      );
    } else {
      var months = f.months || [];
      var roll = f.rollup || {};
      var ratios = f.ratios || {};
      var builtAt = f.builtAt ? new Date(f.builtAt).toLocaleString('en-GB') : (f.asOf || '—');
      var cells = {
        pctCell: function (v) {
          if (v == null) return '<td class="num muted">–</td>';
          var up = v > 0;
          var abs = Math.abs(v);
          var cls = abs < 0.02 ? 'muted' : (up ? 'pos' : 'neg');
          var arrow = abs < 0.02 ? '◆' : (up ? '▲' : '▼');
          return '<td class="num ' + cls + '">' + arrow + ' ' + (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%</td>';
        }
      };

      body = (
        '<div class="rv-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:8px">' +
            '<div>' +
              '<h3 style="margin:0">Next 12 months · forecast vs last year</h3>' +
              '<p class="sub" style="margin:4px 0 0">On-books accommodation at booking net rate + modelled F&amp;B/Other from trailing per-occupied-room ratio. Compared against same month a year ago (closed-day actuals).</p>' +
            '</div>' +
            '<div style="font-size:11px;color:#7b8494;text-align:right">' +
              '<div>Built: ' + esc(builtAt) + '</div>' +
              (cachedAge != null ? '<div>Cached ' + cachedAge + ' min ago</div>' : '') +
              '<button class="rv-alf-btn" data-rv-fc-rebuild style="margin-top:6px">Rebuild forecast</button>' +
            '</div>' +
          '</div>' +

          // Rollup cards
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 18px">' +
            '<div class="rv-k" style="background:#1a2238;color:#fff;padding:14px;border-radius:8px">' +
              '<div style="font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:#9bb5c8;font-weight:700">12-month forecast</div>' +
              '<div style="font-size:22px;font-weight:700;margin-top:4px">' + gbp(roll.forecastTotal || 0) + '</div>' +
              '<div style="font-size:11px;color:#9bb5c8;margin-top:3px">' + (roll.rooms || 0) + ' rooms</div>' +
            '</div>' +
            '<div class="rv-k" style="background:#eef3f8;padding:14px;border-radius:8px;border:1px solid #c8d9dd">' +
              '<div style="font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:#1a3b60;font-weight:700">On books now</div>' +
              '<div style="font-size:22px;font-weight:700;margin-top:4px;color:#1a2238">' + gbp(roll.onBooksTotal || 0) + '</div>' +
              '<div style="font-size:11px;color:#52647a;margin-top:3px">firm bookings in system</div>' +
            '</div>' +
            '<div class="rv-k" style="background:#eef3f8;padding:14px;border-radius:8px;border:1px solid #c8d9dd">' +
              '<div style="font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:#1a3b60;font-weight:700">Last 12 months actual</div>' +
              '<div style="font-size:22px;font-weight:700;margin-top:4px;color:#1a2238">' + gbp(roll.lyTotal || 0) + '</div>' +
              '<div style="font-size:11px;color:#52647a;margin-top:3px">' + (roll.lyRooms || 0) + ' rooms LY</div>' +
            '</div>' +
            '<div class="rv-k" style="background:' + ((roll.vsLYPct || 0) >= 0 ? '#eff7f0' : '#fdf6f5') + ';padding:14px;border-radius:8px;border:1px solid ' + ((roll.vsLYPct || 0) >= 0 ? '#c3dcc7' : '#f0d6d2') + '">' +
              '<div style="font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:' + ((roll.vsLYPct || 0) >= 0 ? '#486128' : '#8a1e15') + ';font-weight:700">vs Last Year</div>' +
              '<div style="font-size:22px;font-weight:700;margin-top:4px;color:' + ((roll.vsLYPct || 0) >= 0 ? '#1a6442' : '#8a1e15') + '">' + (roll.vsLYPct == null ? '–' : ((roll.vsLYPct > 0 ? '+' : '') + (roll.vsLYPct * 100).toFixed(1) + '%')) + '</div>' +
              '<div style="font-size:11px;color:#52647a;margin-top:3px">forecast vs actual</div>' +
            '</div>' +
          '</div>' +

          // Chart
          '<div class="rv-chartbox" style="height:340px;margin-bottom:18px"><canvas id="rv-fc12-chart"></canvas></div>' +

          // Month-by-month table
          '<div style="overflow-x:auto">' +
          '<table class="rv-t">' +
            '<thead><tr>' +
              '<th style="text-align:left">Month</th>' +
              '<th class="num">On books</th>' +
              '<th class="num">Accom (forecast)</th>' +
              '<th class="num">F&amp;B (modelled)</th>' +
              '<th class="num">Other (modelled)</th>' +
              '<th class="num">Total forecast</th>' +
              '<th class="num">Rooms</th>' +
              '<th class="num">Occ</th>' +
              '<th class="num">LY actual</th>' +
              '<th class="num">vs LY</th>' +
            '</tr></thead><tbody>' +
            months.map(function (r) {
              var hl = r.isCurrent ? ' style="background:#fdf6ea"' : '';
              return '<tr' + hl + '>' +
                '<td style="text-align:left;font-weight:600' + (r.isCurrent ? ';color:#1a2238' : '') + '">' + esc(r.label) + (r.isCurrent ? ' <span style="font-size:10px;color:#8a6e3f">MTD</span>' : '') + '</td>' +
                '<td class="num">' + gbp(r.onBooks.accom) + '</td>' +
                '<td class="num">' + gbp(r.forecast.accom) + '</td>' +
                '<td class="num">' + gbp(r.forecast.fb) + '</td>' +
                '<td class="num">' + gbp(r.forecast.other) + '</td>' +
                '<td class="num" style="font-weight:700;color:#1a2238">' + gbp(r.forecast.total) + '</td>' +
                '<td class="num">' + (r.forecast.rooms || 0) + '</td>' +
                '<td class="num">' + ((r.forecast.occPct || 0) * 100).toFixed(1) + '%</td>' +
                '<td class="num">' + (r.lastYear ? gbp(r.lastYear.total) : '–') + '</td>' +
                cells.pctCell(r.vsLYPct) +
              '</tr>';
            }).join('') +
            '</tbody>' +
            '<tfoot><tr style="background:#eef3f8;font-weight:700">' +
              '<td style="text-align:left">12-month rollup</td>' +
              '<td class="num">–</td>' +
              '<td class="num">–</td>' +
              '<td class="num">–</td>' +
              '<td class="num">–</td>' +
              '<td class="num" style="color:#1a2238">' + gbp(roll.forecastTotal || 0) + '</td>' +
              '<td class="num">' + (roll.rooms || 0) + '</td>' +
              '<td class="num">–</td>' +
              '<td class="num">' + gbp(roll.lyTotal || 0) + '</td>' +
              cells.pctCell(roll.vsLYPct) +
            '</tr></tfoot>' +
          '</table>' +
          '</div>' +

          // Methodology footer
          '<div style="margin-top:14px;padding:12px 14px;background:#f6f8fb;border-left:3px solid #1F7A8C;border-radius:4px;font-size:12px;line-height:1.55;color:#52647a">' +
            '<b style="color:#1a3b60">Methodology.</b> ' +
            'Accommodation forecast is <b>firm</b> — it comes from the actual booked net rate per room-night, aggregated to monthly totals. ' +
            'F&amp;B and Other for forward nights are <b>modelled</b> using the trailing 28-night per-occupied-room ratio: ' +
            '<b>£' + (ratios.perRoomFB || 0).toFixed(2) + '</b> F&amp;B per occupied room and ' +
            '<b>£' + (ratios.perRoomOther || 0).toFixed(2) + '</b> Other per occupied room ' +
            '(sampled over ' + (ratios.sampleNights || 0) + ' nights / ' + (ratios.sampleRooms || 0) + ' occupied rooms). ' +
            'The current month row blends actual MTD gl_days data with on-books forward for the rest of the month. ' +
            'Last-year comparisons pull the same month of the previous year from closed-day gl_days actuals.' +
          '</div>' +
        '</div>'
      );
    }
    return hero() + viewTabs() + body;
  }

  function drawTwelveMonthChart() {
    if (!window.Chart) return;
    var el = $('rv-fc12-chart'); if (!el) return;
    var c = getCachedForecast();
    if (!c || !c.forecast) return;
    var months = c.forecast.months || [];
    try { if (charts.fc12) charts.fc12.destroy(); } catch (e) {}
    charts.fc12 = new Chart(el, {
      type: 'bar',
      data: {
        labels: months.map(function (r) { return r.label; }),
        datasets: [
          { label: 'Forecast accommodation', data: months.map(function (r) { return Math.round(r.forecast.accom); }), backgroundColor: '#1a2238', stack: 'forecast', borderRadius: 3, maxBarThickness: 32 },
          { label: 'Forecast F&B', data: months.map(function (r) { return Math.round(r.forecast.fb); }), backgroundColor: '#1F7A8C', stack: 'forecast', borderRadius: 3, maxBarThickness: 32 },
          { label: 'Forecast Other', data: months.map(function (r) { return Math.round(r.forecast.other); }), backgroundColor: '#C7A87A', stack: 'forecast', borderRadius: 3, maxBarThickness: 32 },
          { label: 'Last year actual', data: months.map(function (r) { return r.lastYear ? Math.round(r.lastYear.total) : null; }), type: 'line', borderColor: '#8a1e15', backgroundColor: '#8a1e15', borderDash: [5, 4], pointRadius: 3, tension: 0.2, yAxisID: 'y' }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } } },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, ticks: { callback: function (v) { return '£' + (v / 1000).toFixed(0) + 'k'; } }, grid: { color: '#ebe9e3' } }
        }
      }
    });
  }

  /* ============================================================
     v39.14 — Discrepancies view (reads manager_flash history)
     ============================================================ */
  function viewDiscrepancies() {
    var c = getCachedFlashHist();
    var hist = c && c.history ? c.history : [];
    var latest = c && c.latest;
    var latestCom = latest && latest.commentary;
    var latestDate = latest && latest.flash ? latest.flash.forDate : (hist[0] && hist[0].forDate) || '—';
    var cachedAge = c && c.ts ? Math.round((Date.now() - c.ts) / 60000) : null;

    var body;
    if (!c || !latestCom) {
      body = (
        '<div class="rv-card">' +
          '<h3>Discrepancies &amp; watch-items</h3>' +
          '<p class="sub">Loading ARIA\'s daily anomalies, wins and watch-items from the most recent runs.</p>' +
          '<div class="rv-alf-loading" style="padding:20px;text-align:center;color:#7b8494">Fetching flash history…</div>' +
        '</div>'
      );
    } else {
      var anomCount = (latestCom.anomalies || []).length;
      var winCount = (latestCom.wins || []).length;
      var missCount = (latestCom.misses || []).length;
      var actCount = (latestCom.actions || []).length;

      // Today's anomalies, wins, misses
      var todayHtml = (
        '<div class="rv-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:10px">' +
            '<div>' +
              '<h3 style="margin:0">Today\'s watch-items</h3>' +
              '<p class="sub" style="margin:4px 0 0">ARIA\'s findings from the ' + esc(latestDate) + ' Daily Business Update (' + anomCount + ' anomalies · ' + winCount + ' wins · ' + missCount + ' watch-items · ' + actCount + ' actions)</p>' +
            '</div>' +
            '<div style="font-size:11px;color:#7b8494;text-align:right">' +
              (latest.lastSentAt ? '<div>Email sent: ' + new Date(latest.lastSentAt).toLocaleString('en-GB') + '</div>' : '') +
              (cachedAge != null ? '<div>Cached ' + cachedAge + ' min ago</div>' : '') +
              '<button class="rv-alf-btn" data-rv-flash-refresh style="margin-top:6px">Refresh</button>' +
            '</div>' +
          '</div>' +

          (latestCom.spotlight ? (
            '<div style="background:#1a2238;color:#fff;padding:16px 18px;border-radius:8px;margin-bottom:16px">' +
              '<div style="font-size:10.5px;font-weight:700;letter-spacing:.8px;color:#C7A87A;text-transform:uppercase;margin-bottom:8px">🔎 Today\'s spotlight</div>' +
              '<p style="margin:0;font-size:14px;line-height:1.6">' + esc(latestCom.spotlight) + '</p>' +
            '</div>'
          ) : '') +

          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:8px">' +
            // Anomalies
            '<div style="padding:14px 16px;background:#fdf6f5;border:1px solid #f0d6d2;border-radius:8px">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#8a1e15;text-transform:uppercase;margin-bottom:8px">⚡ Anomalies spotted</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:13px;color:#2c3440;line-height:1.5">' +
                ((latestCom.anomalies || []).length ? (latestCom.anomalies || []).map(function (a) { return '<li style="margin-bottom:6px">' + esc(a) + '</li>'; }).join('') : '<li style="color:#7b8494">No anomalies today</li>') +
              '</ul>' +
            '</div>' +
            // Wins
            '<div style="padding:14px 16px;background:#f0f6ea;border:1px solid #d4e3c3;border-radius:8px">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#486128;text-transform:uppercase;margin-bottom:8px">✓ Wins</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:13px;color:#2c3440;line-height:1.5">' +
                ((latestCom.wins || []).length ? (latestCom.wins || []).map(function (a) { return '<li style="margin-bottom:6px">' + esc(a) + '</li>'; }).join('') : '<li style="color:#7b8494">No notable wins</li>') +
              '</ul>' +
            '</div>' +
            // Watch items / misses
            '<div style="padding:14px 16px;background:#fffbe8;border:1px solid #ecd584;border-radius:8px">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#7a5f0b;text-transform:uppercase;margin-bottom:8px">⚠ Watch items</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:13px;color:#2c3440;line-height:1.5">' +
                ((latestCom.misses || []).length ? (latestCom.misses || []).map(function (a) { return '<li style="margin-bottom:6px">' + esc(a) + '</li>'; }).join('') : '<li style="color:#7b8494">Nothing concerning</li>') +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>'
      );

      // Today's actions
      var actionsHtml = '';
      if (latestCom.actions && latestCom.actions.length) {
        var deptColors = {
          'Front Office': '#1a3b60', 'Kitchen': '#145866', 'F&B': '#1F7A8C',
          'Housekeeping': '#486128', 'Events': '#4a3a7a', 'Revenue': '#1a2238'
        };
        var priColors = { high: '#c0362b', medium: '#1F7A8C', low: '#7b8494' };
        actionsHtml = (
          '<div class="rv-card">' +
            '<h3>Actions for today · by department</h3>' +
            latestCom.actions.map(function (a) {
              var dc = deptColors[a.dept] || '#2c3440';
              var pc = priColors[(a.priority || 'medium').toLowerCase()] || priColors.medium;
              return '<div style="padding:12px 14px;margin:8px 0;background:#f6f8fb;border-left:4px solid ' + dc + ';border-radius:4px;display:flex;justify-content:space-between;gap:12px">' +
                '<div style="flex:1">' +
                  '<div style="font-size:10.5px;font-weight:700;letter-spacing:.4px;color:' + dc + ';text-transform:uppercase">' + esc(a.dept || '') + (a.owner ? ' · ' + esc(a.owner) : '') + '</div>' +
                  '<div style="font-size:14px;color:#1a2238;font-weight:600;margin-top:4px;line-height:1.45">' + esc(a.action || '') + '</div>' +
                  (a.why ? '<div style="font-size:12px;color:#52647a;margin-top:3px;font-style:italic">Why: ' + esc(a.why) + '</div>' : '') +
                '</div>' +
                '<div style="flex:0 0 auto"><span style="display:inline-block;padding:3px 10px;background:' + pc + ';color:#fff;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase">' + esc((a.priority || 'med')) + '</span></div>' +
              '</div>';
            }).join('') +
          '</div>'
        );
      }

      // History — last N days
      var histHtml = '';
      if (hist.length) {
        histHtml = (
          '<div class="rv-card">' +
            '<h3>Past ' + hist.length + ' days of findings</h3>' +
            '<p class="sub">Scroll back through earlier commentaries. Click a date to expand.</p>' +
            hist.map(function (h, idx) {
              var com = h.commentary || {};
              var hAnom = (com.anomalies || []).length;
              var hWin = (com.wins || []).length;
              var hMiss = (com.misses || []).length;
              var dateLbl = h.forDate ? new Date(h.forDate + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
              return (
                '<details style="margin:8px 0;padding:10px 14px;background:#f6f8fb;border:1px solid #e9e7e0;border-radius:6px"' + (idx === 0 ? ' open' : '') + '>' +
                  '<summary style="cursor:pointer;font-size:13.5px;color:#1a2238;font-weight:600">' + esc(dateLbl) +
                    ' <span style="font-weight:400;color:#7b8494;margin-left:8px">' + hAnom + ' anomalies · ' + hWin + ' wins · ' + hMiss + ' watch</span>' +
                  '</summary>' +
                  '<div style="margin-top:10px;font-size:12.5px;color:#2c3440;line-height:1.5">' +
                    (com.overnight ? '<p style="margin:0 0 6px"><b>Overnight.</b> ' + esc(com.overnight) + '</p>' : '') +
                    (com.period ? '<p style="margin:0 0 6px"><b>Period.</b> ' + esc(com.period) + '</p>' : '') +
                    (com.spotlight ? '<p style="margin:6px 0 6px"><b>Spotlight.</b> ' + esc(com.spotlight) + '</p>' : '') +
                    ((com.anomalies || []).length ? '<div style="margin-top:8px"><b style="color:#8a1e15">Anomalies:</b><ul style="margin:3px 0 0 16px">' + com.anomalies.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '') +
                    ((com.misses || []).length ? '<div style="margin-top:8px"><b style="color:#7a5f0b">Watch:</b><ul style="margin:3px 0 0 16px">' + com.misses.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '') +
                  '</div>' +
                '</details>'
              );
            }).join('') +
          '</div>'
        );
      }

      body = todayHtml + actionsHtml + histHtml;
    }
    return hero() + viewTabs() + body;
  }

  /* ============================================================
     v39.14 — Team Input view (Patrik's questionnaire etc.)
     ============================================================ */

  /* Known question slugs → human labels, grouped by section. Any field present
     in the submission that isn't listed here is shown in a final "Other" group. */
  /* v39.14 — field keys match patrik.html's actual form field names */
  var QUESTIONNAIRE_SCHEMA = [
    { section: 'About', fields: [
      { key: 'name', label: 'Your name' },
      { key: 'role', label: 'Role' },
      { key: 'years', label: 'Years doing revenue management' },
      { key: 'involvement', label: 'Involvement in rate decisions (1-5)' }
    ] },
    { section: '1. Morning routine', fields: [
      { key: 'morning_first', label: 'First thing you check when you arrive' },
      { key: 'systems', label: 'Systems you log into first' },
      { key: 'time_per_day', label: 'Time per day on rate-setting & revenue decisions' },
      { key: 'morning_walkthrough', label: 'A typical morning — the first 60 minutes' }
    ] },
    { section: '2. Rate setting · your thinking', fields: [
      { key: 'rate_decision', label: "Tonight's rate vs next week's rate" },
      { key: 'rate_change_freq', label: 'Fixed BAR vs changing during the day' },
      { key: 'max_rate_jump', label: "Largest rate jump you'd make (£)" },
      { key: 'sunday_approach', label: 'Sunday nights vs weekends' },
      { key: 'recent_change', label: 'The most recent rate change you made & why' },
      { key: 'rate_trigger', label: 'What triggers you to change a rate?' }
    ] },
    { section: '3. Comp set', fields: [
      { key: 'comp', label: 'Hotels actively monitored' },
      { key: 'comp_other', label: 'Any other hotels to add?' },
      { key: 'comp_freq', label: 'How often you check comp rates' },
      { key: 'comp_how', label: 'How you check comp rates' }
    ] },
    { section: '4. Inventory & restrictions', fields: [
      { key: 'mlos', label: 'When you use minimum length of stay' },
      { key: 'ota_closeout', label: 'When you close out OTA channels' },
      { key: 'group_split', label: 'Group block release approach' }
    ] },
    { section: '5. Events & demand drivers', fields: [
      { key: 'events', label: 'Local events you watch for' },
      { key: 'event_lead', label: 'Lead time you set rates for known events' }
    ] },
    { section: '6. Pain points & gaps', fields: [
      { key: 'time_sink', label: 'Biggest time sink in your current workflow' },
      { key: 'data_gaps', label: 'Data gaps you feel you have' },
      { key: 'hardest_decision', label: 'Hardest revenue decision you make' },
      { key: 'delete_task', label: "One task you'd delete from your week" }
    ] },
    { section: '7. A better daily tool', fields: [
      { key: 'morning_view', label: 'Your ideal morning view in one screen' },
      { key: 'three_things', label: 'Top three features you want' },
      { key: 'helpful', label: 'Which features would be most helpful' },
      { key: 'free_text', label: 'Anything else' }
    ] }
  ];

  function renderQuestionnaireAnswer(val) {
    if (val == null || val === '') return '<span style="color:#7b8494;font-style:italic">— not answered —</span>';
    var str = String(val);
    // Preserve line breaks in longer textarea answers
    if (str.indexOf('\n') !== -1 || str.length > 80) {
      return '<div style="white-space:pre-wrap;line-height:1.6;color:#2c3440">' + esc(str) + '</div>';
    }
    return '<span style="color:#2c3440">' + esc(str) + '</span>';
  }

  function renderOneSubmission(sub) {
    if (!sub) return '';
    var who = sub.name || '—';
    var role = sub.role || '';
    var when = sub.receivedAt || sub.submittedAt || '—';
    var whenDate = when && when !== '—' ? new Date(when).toLocaleString('en-GB') : when;
    var known = {};
    QUESTIONNAIRE_SCHEMA.forEach(function (s) { s.fields.forEach(function (f) { known[f.key] = true; }); });

    var sectionsHtml = QUESTIONNAIRE_SCHEMA.map(function (sect) {
      var answered = sect.fields.filter(function (f) { return sub[f.key] != null && sub[f.key] !== ''; });
      if (!answered.length && sect.section !== 'About') return '';
      return (
        '<div style="margin:16px 0;padding:14px 16px;background:#f6f8fb;border-left:3px solid #1F7A8C;border-radius:4px">' +
          '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#1a3b60;text-transform:uppercase;margin-bottom:10px">' + esc(sect.section) + '</div>' +
          sect.fields.map(function (f) {
            return (
              '<div style="margin-bottom:12px">' +
                '<div style="font-size:12px;font-weight:600;color:#52647a;margin-bottom:4px">' + esc(f.label) + '</div>' +
                renderQuestionnaireAnswer(sub[f.key]) +
              '</div>'
            );
          }).join('') +
        '</div>'
      );
    }).join('');

    // Anything the schema doesn't cover — render as "Other fields"
    var otherKeys = Object.keys(sub).filter(function (k) {
      return !known[k] && ['id', 'receivedAt', 'submittedAt'].indexOf(k) === -1;
    });
    var otherHtml = '';
    if (otherKeys.length) {
      otherHtml = (
        '<div style="margin:16px 0;padding:14px 16px;background:#fdf6ea;border-left:3px solid #C7A87A;border-radius:4px">' +
          '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#8a6e3f;text-transform:uppercase;margin-bottom:10px">Other fields</div>' +
          otherKeys.map(function (k) {
            return (
              '<div style="margin-bottom:10px">' +
                '<div style="font-size:12px;font-weight:600;color:#52647a;margin-bottom:4px">' + esc(k) + '</div>' +
                renderQuestionnaireAnswer(sub[k]) +
              '</div>'
            );
          }).join('') +
        '</div>'
      );
    }

    return (
      '<div style="margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:10px 14px;background:#1a2238;color:#fff;border-radius:6px">' +
          '<div style="font-size:14px;font-weight:700">' + esc(who) + (role ? ' <span style="opacity:.7;font-weight:400">· ' + esc(role) + '</span>' : '') + '</div>' +
          '<div style="font-size:11.5px;color:#9bb5c8">Submitted ' + esc(whenDate) + '</div>' +
        '</div>' +
        sectionsHtml +
        otherHtml +
      '</div>'
    );
  }

  function viewTeam() {
    var c = getCachedTeamInput();
    var subs = c && c.submissions ? c.submissions : null;
    var cachedAge = c && c.ts ? Math.round((Date.now() - c.ts) / 60000) : null;

    var body;
    if (!subs) {
      body = (
        '<div class="rv-card">' +
          '<h3>Team input</h3>' +
          '<p class="sub">Loading the questionnaire submissions from the team.</p>' +
          '<div class="rv-alf-loading" style="padding:20px;text-align:center;color:#7b8494">Fetching submissions…</div>' +
        '</div>'
      );
    } else if (!subs.length) {
      body = (
        '<div class="rv-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:10px">' +
            '<div>' +
              '<h3 style="margin:0">Team input · revenue management questionnaire</h3>' +
              '<p class="sub" style="margin:4px 0 0">Submissions arrive from brandon.hospro.co.uk/business/patrik.html. ARIA uses the most recent submission in its answers.</p>' +
            '</div>' +
            '<div style="font-size:11px;color:#7b8494;text-align:right">' +
              (cachedAge != null ? '<div>Checked ' + cachedAge + ' min ago</div>' : '') +
              '<button class="rv-alf-btn" data-rv-team-refresh style="margin-top:6px">Check again</button>' +
            '</div>' +
          '</div>' +
          '<div style="padding:30px;text-align:center;color:#7b8494;background:#f6f8fb;border-radius:8px">' +
            '<div style="font-size:14px;margin-bottom:6px">No submissions yet.</div>' +
            '<div style="font-size:12px">When Patrik (or anyone) submits the questionnaire at <code>/business/patrik.html</code>, it will appear here.</div>' +
          '</div>' +
        '</div>'
      );
    } else {
      var latest = subs[0];
      var rest = subs.slice(1);

      body = (
        '<div class="rv-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px">' +
            '<div>' +
              '<h3 style="margin:0">Team input · revenue management questionnaire</h3>' +
              '<p class="sub" style="margin:4px 0 0">' + subs.length + ' submission' + (subs.length === 1 ? '' : 's') + '. The most recent one is wired into ARIA\'s context — Ask ARIA answers now reflect how the team actually works.</p>' +
            '</div>' +
            '<div style="font-size:11px;color:#7b8494;text-align:right">' +
              (cachedAge != null ? '<div>Cached ' + cachedAge + ' min ago</div>' : '') +
              '<button class="rv-alf-btn" data-rv-team-refresh style="margin-top:6px">Refresh</button>' +
            '</div>' +
          '</div>' +

          renderOneSubmission(latest) +
        '</div>' +

        (rest.length ? (
          '<div class="rv-card">' +
            '<h3>Earlier submissions</h3>' +
            '<p class="sub">Collapsed — click a row to open.</p>' +
            rest.map(function (s, idx) {
              var dateLbl = s.receivedAt || s.submittedAt || '—';
              if (dateLbl !== '—') { try { dateLbl = new Date(dateLbl).toLocaleString('en-GB'); } catch (e) {} }
              return (
                '<details style="margin:8px 0;padding:10px 14px;background:#f6f8fb;border:1px solid #e9e7e0;border-radius:6px">' +
                  '<summary style="cursor:pointer;font-size:13.5px;color:#1a2238;font-weight:600">' + esc(s.name || '—') + (s.role ? ' · ' + esc(s.role) : '') +
                    ' <span style="font-weight:400;color:#7b8494;margin-left:8px">' + esc(dateLbl) + '</span>' +
                  '</summary>' +
                  '<div style="margin-top:10px">' +
                    renderOneSubmission(s) +
                  '</div>' +
                '</details>'
              );
            }).join('') +
          '</div>'
        ) : '')
      );
    }

    return hero() + viewTabs() + body;
  }

  /* ============================================================
     v39.14 — Patrik's Morning View
     "Competition rates vs ours for the next 14 days together with our occupancy"
     (direct quote from his questionnaire). Opens with ARIA's suggested adjustment
     per night. One-click approve.
     ============================================================ */

  function inferCompOcc(compId, todayRate, baseRate) {
    // Rough inference: if a comp has dropped >15% from their base, they are soft.
    // >30% drop = struggling.
    var drop = (baseRate - todayRate) / baseRate;
    if (drop > 0.30) return { label: 'Struggling', color: '#8a1e15', weight: 0.5 };
    if (drop > 0.15) return { label: 'Soft',       color: '#b26a00', weight: 0.7 };
    if (drop < -0.10) return { label: 'Strong',    color: '#1a6442', weight: 1.1 };
    return { label: 'Normal', color: '#52647a', weight: 1.0 };
  }

  function viewMorning() {
    buildNights();
    var nights = NIGHTS.slice(0, 14);
    var liveBooks = getCachedBooks();
    var compCache = getCachedComp();
    var compByDate = compCache && compCache.byDate ? compCache.byDate : {};
    var now = new Date(); var hh = now.getHours();

    // Morning greeting — adapts to time of day
    var greeting = hh < 10 ? 'Good morning' : (hh < 14 ? 'Good afternoon' : (hh < 18 ? 'Good afternoon' : 'Good evening'));
    var decisionMomentLine = hh < 10 ? "You usually make rate decisions around 10am — here's what the data says." :
                             hh < 15 ? "Rate conditions right now — adjust as needed." :
                                       "End-of-day view — set tomorrow's opening position.";

    // Comp rate lookup — returns live rate or null
    function compRateFor(compId, dateIso) {
      var row = compByDate[dateIso];
      if (!row) return null;
      var h = row[compId];
      if (h && (h.rate != null)) return Math.round(h.rate);
      return null;
    }

    // Build rows
    var activeComps = COMP_SET.filter(function (c) { return c.weight >= 4; });
    var secondaryComps = COMP_SET.filter(function (c) { return c.weight < 4; });

    var rows = nights.map(function (n) {
      var dow = (new Date(n.d + 'T00:00:00Z')).getUTCDay();
      var dowLbl = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];

      // Our current BAR for Classic double (anchoring rate)
      var ourBAR = 157; // from systemContext — Brandon Hall BAR
      // ARIA suggestion
      var sug = priceSearch(n.baseOcc, n.compRef, 25, 69, 180, ourBAR, dow);
      var ourSug = sug.price;

      // Comp data
      var compData = activeComps.map(function (c) {
        var live = compRateFor(c.id, n.d);
        var rate = live != null ? live : c.base;
        var signal = inferCompOcc(c.id, rate, c.base);
        return { id: c.id, label: c.label, rate: rate, live: live != null, signal: signal };
      });

      // Mean of healthy comps (filters out "struggling" = anchor-to-healthy logic)
      var healthy = compData.filter(function (x) { return x.signal.label !== 'Struggling'; });
      var meanHealthy = healthy.length ? Math.round(healthy.reduce(function (a, b) { return a + b.rate; }, 0) / healthy.length) : null;

      // Our occupancy
      var occPct = null, occSource = 'forecast';
      if (liveBooks && liveBooks.byDate && liveBooks.byDate[n.d] && liveBooks.byDate[n.d].totals) {
        occPct = liveBooks.byDate[n.d].totals.rooms / 114;
        occSource = 'on-books';
      } else {
        occPct = n.baseOcc;
      }

      return {
        d: n.d, dowLbl: dowLbl, dow: dow,
        ourBAR: ourBAR, ourSug: ourSug, delta: ourSug - ourBAR,
        compData: compData, meanHealthy: meanHealthy,
        occPct: occPct, occSource: occSource,
        strugglers: compData.filter(function (x) { return x.signal.label === 'Struggling'; }).map(function (x) { return x.label; }),
        soft: compData.filter(function (x) { return x.signal.label === 'Soft'; }).map(function (x) { return x.label; })
      };
    });

    var body = (
      '<div class="rv-card" style="background:linear-gradient(135deg,#1a2238 0%,#145866 100%);color:#fff;border:0;padding:20px 24px;margin-bottom:14px">' +
        '<h3 style="color:#fff;margin:0;font-size:18px">' + esc(greeting) + ', Patrik — rate command view</h3>' +
        '<p style="color:#bfdde3;margin:4px 0 0;font-size:13px">' + esc(decisionMomentLine) + '</p>' +
        '<p style="color:#9bb5c8;margin:10px 0 0;font-size:11.5px">14 nights forward · ARIA honours your Sunday £65 floor, max £20 move, anchor-to-healthy-comp logic · live comp refresh daily 06:00</p>' +
      '</div>' +

      '<div class="rv-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">' +
          '<div><h3 style="margin:0">Next 14 nights · suggestions</h3></div>' +
          '<div style="font-size:11px;color:#7b8494">' +
            (compCache && compCache.ts ? '<div>Comp data: ' + new Date(compCache.ts).toLocaleTimeString('en-GB') + '</div>' : '<div style="color:#b26a00">⚠ No live comp data yet — using demo baselines</div>') +
            '<button class="rv-alf-btn" data-rv-mv-refresh style="margin-top:4px">Refresh comp rates</button>' +
          '</div>' +
        '</div>' +

        '<div style="overflow-x:auto">' +
        '<table class="rv-t" style="min-width:1000px">' +
          '<thead><tr>' +
            '<th>Date</th>' +
            '<th class="num">Our BAR</th>' +
            '<th class="num">ARIA</th>' +
            '<th class="num">Δ</th>' +
            activeComps.map(function (c) { return '<th class="num">' + esc(c.label.split(' ').slice(0, 2).join(' ')) + '</th>'; }).join('') +
            '<th class="num">Healthy avg</th>' +
            '<th class="num">Our occ</th>' +
            '<th class="num">Signals</th>' +
            '<th style="text-align:center">Action</th>' +
          '</tr></thead>' +
          '<tbody>' +
          rows.map(function (r) {
            var rowCls = r.dow === 0 ? ' class="sun"' : (r.dow === 6 ? ' class="sat"' : '');
            var dColor = r.delta === 0 ? '#52647a' : (r.delta > 0 ? '#1a6442' : '#8a1e15');
            var dArrow = r.delta === 0 ? '◆' : (r.delta > 0 ? '▲' : '▼');
            var occColor = r.occPct >= 0.75 ? '#1a6442' : (r.occPct >= 0.4 ? '#1a2238' : '#8a1e15');
            var signalBadges = '';
            if (r.strugglers.length) signalBadges += '<span class="rv-pill dn" title="' + esc(r.strugglers.join(', ') + ' struggling — drop > 30% from base') + '">' + r.strugglers.length + ' struggling</span> ';
            if (r.soft.length) signalBadges += '<span class="rv-pill flat" title="' + esc(r.soft.join(', ') + ' soft — drop > 15% from base') + '">' + r.soft.length + ' soft</span>';
            var actionBtn = Math.abs(r.delta) > 2 ? '<button class="rv-alf-btn" data-rv-mv-approve="' + r.d + '" data-rv-mv-price="' + r.ourSug + '" style="background:#1a2238;color:#fff;border:0">Set £' + r.ourSug + '</button>' : '<span style="color:#7b8494;font-size:11px">–</span>';
            return '<tr' + rowCls + '>' +
              '<td style="font-weight:600">' + r.dowLbl + ' ' + r.d.slice(8) + '/' + r.d.slice(5, 7) + '</td>' +
              '<td class="num">£' + r.ourBAR + '</td>' +
              '<td class="num" style="color:#1a2238;font-weight:700">£' + r.ourSug + '</td>' +
              '<td class="num" style="color:' + dColor + ';font-weight:600">' + dArrow + (r.delta > 0 ? '+' : '') + r.delta + '</td>' +
              r.compData.map(function (c) {
                var cc = c.signal.color;
                return '<td class="num" style="color:' + cc + '">£' + c.rate + (c.live ? '' : '<sup style="opacity:.5">b</sup>') + '</td>';
              }).join('') +
              '<td class="num" style="font-weight:600">' + (r.meanHealthy != null ? '£' + r.meanHealthy : '–') + '</td>' +
              '<td class="num" style="color:' + occColor + ';font-weight:600">' + (r.occPct * 100).toFixed(0) + '%<div style="font-size:10px;color:#7b8494;font-weight:400">' + r.occSource + '</div></td>' +
              '<td class="num" style="white-space:nowrap">' + (signalBadges || '<span style="color:#7b8494;font-size:11px">normal</span>') + '</td>' +
              '<td style="text-align:center">' + actionBtn + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody>' +
        '</table>' +
        '</div>' +

        '<p class="rv-note" style="margin-top:14px">' +
          '<b>ARIA</b> = suggested rate · <b>Δ</b> = suggested minus BAR · ' +
          '<span style="color:#8a1e15">red</span> = struggling (&gt;30% drop from base) · ' +
          '<span style="color:#b26a00">amber</span> = soft (&gt;15% drop) · ' +
          '<span style="color:#1a6442">green</span> = strong · ' +
          '<sup>b</sup> = baseline (no live comp data yet). ' +
          'Healthy average excludes struggling comps (anchor-to-healthy rule).' +
        '</p>' +
      '</div>' +

      // Context strip with today's priorities
      (function () {
        var movers = rows.filter(function (r) { return Math.abs(r.delta) >= 5; });
        var softNights = rows.filter(function (r) { return r.occPct < 0.35; });
        var sundays = rows.filter(function (r) { return r.dow === 0; });
        return (
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' +
            '<div class="rv-card" style="margin:0">' +
              '<h3 style="margin:0 0 6px;font-size:14px">⚡ Biggest moves today</h3>' +
              (movers.length ? movers.slice(0, 5).map(function (r) {
                return '<div style="padding:6px 0;border-bottom:1px solid #f1efe9;font-size:12.5px"><b>' + r.dowLbl + ' ' + r.d.slice(8) + '/' + r.d.slice(5, 7) + '</b> — £' + r.ourBAR + ' → £' + r.ourSug + ' <span style="color:' + (r.delta > 0 ? '#1a6442' : '#8a1e15') + ';font-weight:600">(' + (r.delta > 0 ? '+' : '') + r.delta + ')</span></div>';
              }).join('') : '<p class="sub" style="margin:4px 0 0">No material moves in the 14-night window — holding steady.</p>') +
            '</div>' +
            '<div class="rv-card" style="margin:0">' +
              '<h3 style="margin:0 0 6px;font-size:14px">🛌 Soft nights</h3>' +
              (softNights.length ? softNights.slice(0, 5).map(function (r) {
                return '<div style="padding:6px 0;border-bottom:1px solid #f1efe9;font-size:12.5px"><b>' + r.dowLbl + ' ' + r.d.slice(8) + '/' + r.d.slice(5, 7) + '</b> — ' + (r.occPct * 100).toFixed(0) + '% on books</div>';
              }).join('') : '<p class="sub" style="margin:4px 0 0">No nights below 35% in the window.</p>') +
            '</div>' +
            '<div class="rv-card" style="margin:0">' +
              '<h3 style="margin:0 0 6px;font-size:14px">🧖 Sunday watch (floor £' + SETTINGS.sundayFloor + ')</h3>' +
              (sundays.length ? sundays.map(function (r) {
                return '<div style="padding:6px 0;border-bottom:1px solid #f1efe9;font-size:12.5px"><b>Sun ' + r.d.slice(8) + '/' + r.d.slice(5, 7) + '</b> — ARIA: £' + r.ourSug + (r.ourSug <= SETTINGS.sundayFloor + 5 ? ' <span style="color:#8a1e15">(at floor)</span>' : '') + '</div>';
              }).join('') : '') +
            '</div>' +
          '</div>'
        );
      })()
    );

    return hero() + viewTabs() + body;
  }

  /* ============================================================
     v39.14 — Bulk Rates (pattern-based 90-365 day rate push)
     "Changing rates for 365 days forward takes lots of my time" — his delete-task
     ============================================================ */

  var BULK_PATTERN_KEY = 'hosrev_bulk_pattern';
  function getBulkPattern() {
    try {
      var o = JSON.parse(localStorage.getItem(BULK_PATTERN_KEY) || 'null');
      if (o) return o;
    } catch (e) {}
    // Defaults — aligned with Patrik's stated Sun/weekend approach
    return { mon: 142, tue: 148, wed: 148, thu: 148, fri: 165, sat: 172, sun: 65, days: 90, skipEvents: true };
  }
  function setBulkPattern(p) { try { localStorage.setItem(BULK_PATTERN_KEY, JSON.stringify(p)); } catch (e) {} }

  function viewBulk() {
    var P = getBulkPattern();
    buildNights();
    var days = Math.max(7, Math.min(365, +P.days || 90));
    var nights = NIGHTS.slice(0, days);

    // Preview — build the batch
    var batch = nights.map(function (n) {
      var dow = (new Date(n.d + 'T00:00:00Z')).getUTCDay();
      var key = ['sun','mon','tue','wed','thu','fri','sat'][dow];
      var newPrice = +P[key] || 0;
      var skip = P.skipEvents && n.eventScore && n.eventScore > 1.5;
      return { d: n.d, dow: dow, dowLbl: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow], newPrice: newPrice, current: 157, skip: skip };
    });
    var applied = batch.filter(function (b) { return !b.skip && b.newPrice > 0; });

    var body = (
      '<div class="rv-card">' +
        '<h3>Bulk rate push · pattern builder</h3>' +
        '<p class="sub">Set one rate per day-of-week and push it forward for up to 365 nights in one go. Honours your Sunday £' + SETTINGS.sundayFloor + ' floor automatically. Skips event spikes if ticked.</p>' +

        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin:14px 0 16px">' +
          [['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat'],['sun','Sun']].map(function (dw) {
            return '<div style="padding:10px;background:' + (dw[0] === 'sun' ? '#fdf6ea' : (dw[0] === 'sat' || dw[0] === 'fri' ? '#eff7f0' : '#eef3f8')) + ';border-radius:8px;text-align:center">' +
              '<div style="font-size:12px;font-weight:700;color:#1a2238;margin-bottom:6px">' + dw[1] + '</div>' +
              '<div style="display:inline-flex;align-items:center;gap:2px"><span style="color:#52647a">£</span><input class="rv-input" type="number" step="1" data-rv-bulk-dow="' + dw[0] + '" value="' + P[dw[0]] + '" style="width:60px;text-align:center"></div>' +
            '</div>';
          }).join('') +
        '</div>' +

        '<div class="rv-row" style="margin-bottom:8px">' +
          '<label>Apply for next</label>' +
          '<input class="rv-input" type="number" step="1" min="7" max="365" data-rv-bulk-days value="' + P.days + '" style="width:70px"> nights' +
          '<label style="margin-left:24px;min-width:0;font-weight:400"><input type="checkbox" data-rv-bulk-skip ' + (P.skipEvents ? 'checked' : '') + '> Skip nights with a high event score (leave them alone)</label>' +
        '</div>' +

        '<div style="display:flex;gap:10px;margin-top:12px">' +
          '<button class="rv-alf-btn" data-rv-bulk-save style="background:#1a2238;color:#fff;border:0;padding:10px 18px">Save pattern &amp; preview</button>' +
          '<button class="rv-alf-btn" data-rv-bulk-csv>Download batch (CSV)</button>' +
          '<button class="rv-alf-btn" data-rv-bulk-rezlynx>Copy for Rezlynx</button>' +
        '</div>' +

        '<p class="rv-note" style="margin-top:10px">Pattern is saved to this browser. Preview shows first 60 nights below. Push-to-Rezlynx is on hold until Gary confirms the pmsRM write-back SOAP methods — for now export CSV or copy the formatted text for paste into Rezlynx manually.</p>' +
      '</div>' +

      '<div class="rv-card">' +
        '<h3>Preview — ' + applied.length + ' of ' + batch.length + ' nights will be set</h3>' +
        '<div style="overflow-x:auto;max-height:500px;overflow-y:auto"><table class="rv-t">' +
          '<thead><tr><th>Date</th><th>Day</th><th class="num">Current BAR</th><th class="num">New rate</th><th class="num">Δ</th><th>Status</th></tr></thead>' +
          '<tbody>' +
          batch.slice(0, 60).map(function (b) {
            var rowCls = b.dow === 0 ? ' class="sun"' : (b.dow === 6 ? ' class="sat"' : '');
            if (b.skip) return '<tr' + rowCls + ' style="opacity:.5"><td>' + b.d + '</td><td>' + b.dowLbl + '</td><td class="num">£' + b.current + '</td><td class="num">—</td><td class="num">—</td><td><span style="color:#b26a00">Skipped (event)</span></td></tr>';
            var delta = b.newPrice - b.current;
            var dColor = delta === 0 ? '#52647a' : (delta > 0 ? '#1a6442' : '#8a1e15');
            return '<tr' + rowCls + '><td>' + b.d + '</td><td>' + b.dowLbl + '</td><td class="num">£' + b.current + '</td><td class="num" style="font-weight:700">£' + b.newPrice + '</td><td class="num" style="color:' + dColor + '">' + (delta > 0 ? '+' : '') + delta + '</td><td><span style="color:#1a6442">Ready</span></td></tr>';
          }).join('') +
          '</tbody>' +
        '</table></div>' +
        (batch.length > 60 ? '<p class="rv-note">… and ' + (batch.length - 60) + ' further nights, same pattern.</p>' : '') +
      '</div>'
    );

    return hero() + viewTabs() + body;
  }

  /* ============================================================
     v39.14 — Group Offer Decision tool
     Patrik's hardest decision: cheap groups on Tue / Wed / Sat
     Input: date, rooms, offered rate, nights.
     Output: opportunity cost vs forecast, walk / counter / accept
     ============================================================ */

  var GROUP_INPUT_KEY = 'hosrev_group_input';
  function getGroupInput() {
    try { var o = JSON.parse(localStorage.getItem(GROUP_INPUT_KEY) || 'null'); if (o) return o; } catch (e) {}
    var today = new Date(); today.setDate(today.getDate() + 14);
    return { date: today.toISOString().slice(0, 10), rooms: 20, rate: 95, nights: 1, roomType: 'classic_dbl' };
  }
  function setGroupInput(v) { try { localStorage.setItem(GROUP_INPUT_KEY, JSON.stringify(v)); } catch (e) {} }

  function viewGroupOffer() {
    var G = getGroupInput();
    buildNights();
    var nightsForType = nightsFor(G.roomType, 90);
    // Find the requested night(s)
    var reqNights = [];
    var startIdx = -1;
    for (var i = 0; i < nightsForType.length; i++) {
      if (nightsForType[i].d === G.date) { startIdx = i; break; }
    }
    if (startIdx >= 0) {
      for (var j = 0; j < G.nights; j++) { if (nightsForType[startIdx + j]) reqNights.push(nightsForType[startIdx + j]); }
    }

    // Model — for each night, compare group revenue vs expected transient revenue if those rooms were sold at ARIA's suggested rate
    var model = reqNights.map(function (n) {
      var dow = (new Date(n.d + 'T00:00:00Z')).getUTCDay();
      var dowLbl = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
      var lettable = 114;
      var forecastSold = Math.round(lettable * n.occ);
      var remaining = lettable - forecastSold;
      var displaced = Math.max(0, G.rooms - remaining);
      var transientRate = n.recommended; // ARIA's recommended rate
      var groupRev = G.rooms * G.rate;
      var transientRev = displaced * transientRate; // revenue we lose from displaced transient bookings
      var netMarginGroup = G.rooms * (G.rate * (1 - SETTINGS.commission) - SETTINGS.variable);
      var netMarginTransient = displaced * (transientRate * (1 - SETTINGS.commission) - SETTINGS.variable + SETTINGS.ancillary);
      var opportunityCost = netMarginTransient - (displaced * (G.rate * (1 - SETTINGS.commission) - SETTINGS.variable));
      return { d: n.d, dow: dow, dowLbl: dowLbl, forecastSold: forecastSold, remaining: remaining, displaced: displaced, transientRate: transientRate, groupRev: groupRev, netMarginGroup: netMarginGroup, netMarginTransient: netMarginTransient, opportunityCost: opportunityCost };
    });
    var totalGroupRev = model.reduce(function (a, b) { return a + b.groupRev; }, 0);
    var totalOppCost = model.reduce(function (a, b) { return a + b.opportunityCost; }, 0);
    var totalDisplaced = model.reduce(function (a, b) { return a + b.displaced; }, 0);

    // Recommendation
    var verdict, verdictBg, verdictColor, counter;
    if (totalDisplaced === 0) {
      verdict = 'ACCEPT'; verdictBg = '#eff7f0'; verdictColor = '#1a6442';
    } else if (totalOppCost > totalGroupRev * 0.3) {
      verdict = 'WALK AWAY'; verdictBg = '#fdf6f5'; verdictColor = '#8a1e15';
      counter = Math.ceil(G.rate + (totalOppCost / (G.rooms * G.nights)));
    } else {
      verdict = 'COUNTER'; verdictBg = '#fdf8ee'; verdictColor = '#7a5f0b';
      counter = Math.ceil(G.rate + (totalOppCost / (G.rooms * G.nights)));
    }

    // Day-of-week flag
    var tueWedSat = model.some(function (m) { return m.dow === 2 || m.dow === 3 || m.dow === 6; });

    var body = (
      '<div class="rv-card">' +
        '<h3>Group offer decision tool</h3>' +
        '<p class="sub">Your hardest call: cheap groups on Tue / Wed / Sat. Enter the request below — ARIA will model opportunity cost vs forecast demand and tell you walk, counter or accept.</p>' +

        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0">' +
          '<div><label style="font-size:12px;font-weight:600;color:#52647a">Arrival date</label><input class="rv-input" type="date" data-rv-grp="date" value="' + esc(G.date) + '" style="width:100%"></div>' +
          '<div><label style="font-size:12px;font-weight:600;color:#52647a">Number of rooms</label><input class="rv-input" type="number" step="1" min="1" data-rv-grp="rooms" value="' + G.rooms + '" style="width:100%"></div>' +
          '<div><label style="font-size:12px;font-weight:600;color:#52647a">Offered rate (£/room/night)</label><input class="rv-input" type="number" step="1" min="0" data-rv-grp="rate" value="' + G.rate + '" style="width:100%"></div>' +
          '<div><label style="font-size:12px;font-weight:600;color:#52647a">Nights</label><input class="rv-input" type="number" step="1" min="1" max="7" data-rv-grp="nights" value="' + G.nights + '" style="width:100%"></div>' +
        '</div>' +

        '<div style="padding:18px 20px;background:' + verdictBg + ';border-radius:8px;border:1px solid ' + verdictColor + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
            '<div><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:' + verdictColor + ';text-transform:uppercase">ARIA\'s recommendation</div>' +
              '<div style="font-size:28px;font-weight:700;color:' + verdictColor + ';margin-top:4px">' + verdict + '</div></div>' +
            (counter ? '<div style="text-align:right"><div style="font-size:11px;color:#52647a;text-transform:uppercase;font-weight:600">Counter at</div><div style="font-size:24px;font-weight:700;color:#1a2238">£' + counter + '</div><div style="font-size:11px;color:#52647a">per room per night</div></div>' : '') +
          '</div>' +
          (tueWedSat ? '<p style="margin:10px 0 0;font-size:12px;color:' + verdictColor + ';font-style:italic">This includes a Tue / Wed / Sat night — your flagged hardest-decision bucket.</p>' : '') +
        '</div>' +

        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0">' +
          '<div class="rv-tile"><div class="l">Group revenue</div><div class="v">' + gbp(totalGroupRev) + '</div><div class="d">' + G.rooms + ' rms × ' + G.nights + ' nts × £' + G.rate + '</div></div>' +
          '<div class="rv-tile ' + (totalOppCost > 0 ? 'warn' : 'good') + '"><div class="l">Opportunity cost</div><div class="v">' + gbp(totalOppCost) + '</div><div class="d">lost margin on displaced transient</div></div>' +
          '<div class="rv-tile"><div class="l">Rooms displaced</div><div class="v">' + totalDisplaced + '</div><div class="d">forecast says we\'d have sold these at BAR</div></div>' +
        '</div>' +

        '<h3 style="margin-top:14px">Night-by-night</h3>' +
        '<div style="overflow-x:auto"><table class="rv-t">' +
          '<thead><tr><th>Date</th><th>Day</th><th class="num">Forecast sold</th><th class="num">Spare rooms</th><th class="num">Displaced</th><th class="num">Transient rate</th><th class="num">Group £</th><th class="num">Opportunity cost</th></tr></thead>' +
          '<tbody>' +
          model.map(function (m) {
            var rowCls = m.dow === 0 ? ' class="sun"' : (m.dow === 6 ? ' class="sat"' : '');
            var pricker = (m.dow === 2 || m.dow === 3 || m.dow === 6) ? ' <span style="color:#8a1e15;font-weight:700" title="Your flagged hard-decision night">!</span>' : '';
            return '<tr' + rowCls + '><td>' + m.d + '</td><td>' + m.dowLbl + pricker + '</td><td class="num">' + m.forecastSold + '</td><td class="num">' + m.remaining + '</td><td class="num">' + m.displaced + '</td><td class="num">£' + m.transientRate + '</td><td class="num">£' + Math.round(m.groupRev) + '</td><td class="num" style="color:' + (m.opportunityCost > 0 ? '#8a1e15' : '#1a6442') + ';font-weight:600">£' + Math.round(m.opportunityCost) + '</td></tr>';
          }).join('') +
          '</tbody>' +
        '</table></div>' +

        '<p class="rv-note" style="margin-top:12px">Opportunity cost = expected net margin on displaced transient rooms (at ARIA\'s recommended rate, with commission, variable cost and ancillary value) minus net margin at the group rate. Counter rate is the minimum per-room-per-night rate that closes the gap.</p>' +
      '</div>'
    );

    return hero() + viewTabs() + body;
  }

  /* v37: Market view — combines the ex-separate Compset, Events, Forecast&Trends tabs
     into one scrollable page with three sections and a "Then vs Now" overview chart
     at the top. Each section below is produced by stripping the hero+tabs from the
     original view so we don't duplicate them. */
  function viewMarket() {
    // Each legacy view returns hero() + viewTabs() + content. Strip the prefix.
    var pre = hero() + viewTabs();
    function stripPre(s) { return s.indexOf(pre) === 0 ? s.slice(pre.length) : s; }
    var compHtml = stripPre(viewCompset());
    var evHtml = stripPre(viewEvents());
    var fcHtml = stripPre(viewForecast());
    return pre +
      // Section 0 — Then vs Now overview
      '<div class="rv-card"><h3>Then vs Now — our ADR history + engine forward + comp average</h3><p class="sub">Last 60 days actual ADR from Guestline closed-day · next 60 nights engine recommended for the Executive double · comp set average (when live)</p>' +
        '<div class="rv-chartbox" style="height:380px"><canvas id="rv-tn-chart"></canvas></div>' +
        '<div class="rv-leg" id="rv-tn-leg"></div>' +
      '</div>' +
      // Section 1 — Compset
      '<h3 class="rv-sect-h">Compset</h3>' + compHtml +
      // Section 2 — Events
      '<h3 class="rv-sect-h">Events</h3>' + evHtml +
      // Section 3 — Forecast charts (occupancy, net profit, trend by hotel)
      '<h3 class="rv-sect-h">Forecast &amp; trend charts</h3>' + fcHtml;
  }

  /* Then-vs-Now chart — real past ADR + engine forward recommended + comp avg */
  function drawThenNowChart() {
    if (!window.Chart) return;
    var el = $('rv-tn-chart'); if (!el) return;
    buildNights();

    // Pull real past ADR from the Guestline feed
    var histLabels = [], histAdr = [];
    try {
      var S = (window.Trading && window.Trading.S) ? window.Trading.S() : null;
      if (S && S.gl && S.gl.byDay) {
        var allDays = Object.keys(S.gl.byDay).sort();
        var tail = allDays.slice(-60);
        tail.forEach(function (d) {
          var row = S.gl.byDay[d];
          histLabels.push(shortD(d));
          histAdr.push(row && row.adr ? Math.round(row.adr) : null);
        });
      }
    } catch (e) {}

    // Forward 60 — engine recommended for Exec double
    var fwdRows = nightsFor('exec_dbl', 60);
    var fwdLabels = fwdRows.map(function (r) { return shortD(r.d); });
    var fwdReco = fwdRows.map(function (r) { return r.recommended; });

    // Comp set avg (if live)
    var liveComp = getCachedComp();
    var compAvg = fwdRows.map(function (r) {
      if (!liveComp || !liveComp.byDate || !liveComp.byDate[r.d]) return null;
      var rates = Object.values(liveComp.byDate[r.d]).map(function (h) { return h.rate; }).filter(function (x) { return x; });
      if (!rates.length) return null;
      return Math.round(rates.reduce(function (t, x) { return t + x; }, 0) / rates.length);
    });

    var labels = histLabels.concat(['— today —']).concat(fwdLabels);
    var histPadded = histAdr.concat([null]).concat(fwdRows.map(function () { return null; }));
    var fwdPadded = histLabels.map(function () { return null; }).concat([null]).concat(fwdReco);
    var compPadded = histLabels.map(function () { return null; }).concat([null]).concat(compAvg);

    if (charts.thenNow) { try { charts.thenNow.destroy(); } catch (e) {} }
    charts.thenNow = new Chart(el, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Our actual ADR (past 60 days)', data: histPadded, borderColor: '#1a2b3a', backgroundColor: '#1a2b3a22', borderWidth: 2.5, pointRadius: 2, tension: 0.2, spanGaps: false },
          { label: 'Engine recommended (next 60 nights)', data: fwdPadded, borderColor: TEAL, backgroundColor: TEAL + '22', borderWidth: 2.5, pointRadius: 2, tension: 0.2, spanGaps: false },
          { label: 'Comp set average', data: compPadded, borderColor: '#BB9979', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, tension: 0.2, spanGaps: false }
        ]
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': £' + (c.parsed.y || '–'); } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 50, font: { size: 9 }, maxTicksLimit: 30 } },
          y: { grid: { color: '#ebe9e3' }, border: { display: false }, ticks: { callback: function (v) { return '£' + v; } } }
        }
      }
    });
  }

  /* v38: live forward on-books — cached locally, backed by hosrevBooks (Firestore).
     Server runs hosbookTick every 30 min, which calls Guestline SOAP for the next 90 nights,
     strips guest names, writes aggregates to Firestore. */
  function getCachedBooks() {
    try {
      var raw = localStorage.getItem(BOOKS_CACHE_KEY); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || (Date.now() - o.ts) > BOOKS_CACHE_TTL) return null;
      return o;
    } catch (e) { return null; }
  }
  function setCachedBooks(o) { try { localStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }
  function maybeFetchBooks() {
    if (BOOKS_INFLIGHT) return;
    if (getCachedBooks()) return;
    var token; token = aiTok(); if (!token) return;
    if (!token) return;
    BOOKS_INFLIGHT = true;
    fetch(BOOKS_ENDPOINT, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        BOOKS_INFLIGHT = false;
        if (!j || !j.ok || !j.snapshot || !Array.isArray(j.snapshot.days) || !j.snapshot.days.length) return;
        var byDate = {};
        j.snapshot.days.forEach(function (d) { byDate[d.date] = { byRoomType: d.byRoomType || {}, totals: d.totals || { rooms: 0 } }; });
        setCachedBooks({ ts: Date.now(), byDate: byDate, serverTs: j.snapshot.ts, builtAt: j.snapshot.builtAt, windowStart: j.snapshot.windowStart, windowEnd: j.snapshot.windowEnd, stats: j.snapshot.stats });
        bustCache(); render();
      }).catch(function () { BOOKS_INFLIGHT = false; });
  }

  /* v36: live comp rates — cached locally, backed by hosrevComp (Firestore). */
  function getCachedComp() {
    try {
      var raw = localStorage.getItem(COMP_CACHE_KEY); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || (Date.now() - o.ts) > COMP_CACHE_TTL) return null;
      return o;
    } catch (e) { return null; }
  }
  function setCachedComp(o) { try { localStorage.setItem(COMP_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }
  var COMP_INFLIGHT = false;
  function maybeFetchComp() {
    if (COMP_INFLIGHT) return;
    if (getCachedComp()) return;
    var token; token = aiTok(); if (!token) return;
    if (!token) return;
    COMP_INFLIGHT = true;
    fetch(COMP_ENDPOINT, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        COMP_INFLIGHT = false;
        if (!j || !j.ok || !j.snapshot || !Array.isArray(j.snapshot.nights) || !j.snapshot.nights.length) return;
        // Index by date for fast lookup
        var byDate = {};
        j.snapshot.nights.forEach(function (n) { byDate[n.date] = n.hotels || {}; });
        setCachedComp({ ts: Date.now(), byDate: byDate, serverTs: j.snapshot.ts });
        if (UI.view === 'compset' || UI.view === 'forecast') render();
      }).catch(function () { COMP_INFLIGHT = false; });
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
  /* ============================================================
     v36: Ask the Agent — grounded Gemini with a Brandon Hall-specific
     question library. Pre-built questions on the left, live research
     results on the right, free text at the bottom.
     ============================================================ */
  var AGENT_QUESTIONS = [
    { cat: '12-month forecast', icon: '📅', q: 'Where are we on the 12-month forecast — how much is on the books, what is the forecast total vs last year, and which months are ahead or behind?' },
    { cat: '12-month forecast', icon: '📊', q: 'Which of the next 12 months are pacing BEHIND last year\'s actuals, by how much, and what is driving the gap — rooms, rate or F&B?' },
    { cat: '12-month forecast', icon: '🎯', q: 'What is our month-end forecast for the CURRENT month — actual-to-date plus on-books plus modelled F&B — and how does it compare to last year\'s same month?' },
    { cat: '12-month forecast', icon: '🔮', q: 'Looking at the 12-month on-books pace, which three months should we most focus pricing / promo activity on to close the gap vs last year?' },
    { cat: 'Morning brief', icon: '☀', q: 'Give me the morning brief: where we stand, the three things to action today, and anything unusual from overnight.' },
    { cat: 'Morning brief', icon: '📈', q: 'What are the biggest revenue opportunities in the next 7 days and what should I approve to capture them?' },
    { cat: 'Morning brief', icon: '⚠', q: 'Where am I leaving money on the table this month, and where am I overpricing and risking occupancy?' },
    { cat: 'Market intelligence', icon: '◎', q: 'What are the current weekend rates in our comp set across Coventry and Warwickshire? Compare ours (Classic double £157 BAR) to theirs, remembering Booking Genius is −10%.' },
    { cat: 'Market intelligence', icon: '◎', q: 'Are any of our competitors (Coombe Abbey, DoubleTree Coventry, Chesford Grange, Windmill Village, Mallory Court, Nailcote Hall, Ramada) running promotional offers right now?' },
    { cat: 'Market intelligence', icon: '◎', q: 'Have any new hotels opened or refurbished within 15 miles of Brandon in the last 12 months that could affect our comp set?' },
    { cat: 'Market intelligence', icon: '◎', q: 'What are the UK Midlands 4-star hotel occupancy and ADR benchmarks running at this quarter?' },
    { cat: 'Local events', icon: '★', q: 'What events, concerts, exhibitions, matches and conferences are happening in Coventry, the NEC, Resorts World Arena, Silverstone and Warwick in the next 30 days?' },
    { cat: 'Local events', icon: '★', q: 'When are the next UK school holidays and university term breaks, and how do they usually affect our Fri–Sun occupancy?' },
    { cat: 'Local events', icon: '★', q: 'Any upcoming University of Warwick graduation ceremonies or open days that could push parent/student overnight demand?' },
    { cat: 'Local events', icon: '★', q: 'What major sports fixtures (Coventry City, Wasps rugby, Silverstone, Edgbaston cricket) are in the next 60 days?' },
    { cat: 'Weather & seasonality', icon: '☁', q: 'What is the weather forecast for Coventry / Brandon over the next 7 days, and how should I nudge rates or promote the Spa / Restaurant accordingly?' },
    { cat: 'Weather & seasonality', icon: '☁', q: 'What was our occupancy pattern for the same month last year, and what seasonal shift should I expect over the next 30 days?' },
    { cat: 'F&B & packages', icon: '🍽', q: 'What dinner-inclusive packages could I promote to drive midweek F&B and occupancy at Brandon Hall over the next 30 days?' },
    { cat: 'F&B & packages', icon: '🍽', q: 'What afternoon tea and Sunday roast offers are 4-star hotels in the Midlands running right now? Where should we position?' },
    { cat: 'F&B & packages', icon: '🍽', q: 'Should we offer a Christmas party or New Year package based on current market demand in the Coventry area?' },
    { cat: 'F&B & packages', icon: '🍽', q: 'What Spa packages typically perform well at this time of year — day spa, overnight spa, couples, bridal?' },
    { cat: 'Yield recommendations', icon: '↑', q: 'Which nights in the next 30 days should I lock at current BAR, and which should I push? Give me the specific dates and new rates.' },
    { cat: 'Yield recommendations', icon: '↑', q: 'Based on the current engine snapshot, what is the single highest-impact pricing change I should make today?' },
    { cat: 'Yield recommendations', icon: '↑', q: 'How should the Executive supplement (£15) flex across the next 30 nights given our forecast occupancy and comp position?' },
    { cat: 'Strategic', icon: '♜', q: 'What is the best pricing strategy for our next Wedding Open Day weekend — hold firm, discount to drive volume, or bundle with F&B?' },
    { cat: 'Strategic', icon: '♜', q: 'How should we respond if Coombe Abbey cuts their rates by 10%? Model the demand impact and give a recommended response.' },
    { cat: 'Strategic', icon: '♜', q: 'A group is requesting 40 rooms for a specific weekend at £95 per room. What is the opportunity cost given our forecast, and should we accept, counter or walk away?' },
    { cat: 'Strategic', icon: '♜', q: 'Looking at Q1 2027 pickup pace vs same-time-last-year, what rate strategy should we run for January, February and March?' }
  ];

  function agentCategories() {
    var cats = {}; var order = [];
    AGENT_QUESTIONS.forEach(function (q) {
      if (!cats[q.cat]) { cats[q.cat] = []; order.push(q.cat); }
      cats[q.cat].push(q);
    });
    return order.map(function (c) { return { name: c, items: cats[c] }; });
  }

  function viewAgent() {
    var cats = agentCategories();
    var sidebar = cats.map(function (c) {
      return '<div class="rv-ag-cat"><h4>' + esc(c.name) + '</h4>' +
        c.items.map(function (q, i) {
          return '<button class="rv-ag-q" data-rv-agent-q="' + esc(c.name + '|' + i) + '" title="' + esc(q.q) + '">' +
            '<span class="rv-ag-qi">' + q.icon + '</span>' +
            '<span class="rv-ag-qt">' + esc(q.q.length > 90 ? q.q.slice(0, 88) + '…' : q.q) + '</span></button>';
        }).join('') +
      '</div>';
    }).join('');

    return hero() + viewTabs() +
      '<div class="rv-ag-wrap">' +
        '<div class="rv-ag-left">' +
          '<div class="rv-ag-leftH"><span class="rv-ai-badge">Pre-built questions</span><p class="rv-ag-tag">Click any question — the Agent researches live and answers in a few seconds. All questions are tuned to Brandon Hall.</p></div>' +
          sidebar +
        '</div>' +
        '<div class="rv-ag-right">' +
          '<div class="rv-ag-head">' +
            '<div><h3>Ask the Agent</h3><p class="sub">Grounded by Google Search + the engine\'s current snapshot. Answers include sources you can click through.</p></div>' +
            '<button class="v16-chip" data-rv-agent-clear title="Clear history">↺ Clear history</button>' +
          '</div>' +
          '<div id="rv-ag-results" class="rv-ag-results">' +
            '<div class="rv-ag-welcome">' +
              '<p><b>Welcome.</b> Pick a pre-built question on the left to get started, or type your own below. Try asking about:</p>' +
              '<ul><li>today\'s morning brief and what to action</li><li>live comp-set rates and market positioning</li><li>upcoming local events that could drive demand</li><li>F&amp;B promos and package ideas for the next 30 days</li><li>yield recommendations by specific date</li><li>strategic calls — group requests, comp moves, Open Day pricing</li></ul>' +
              '<p class="rv-ag-tip">All answers are grounded in your current engine state and in live Google Search results. Sources are listed at the bottom of each answer.</p>' +
            '</div>' +
          '</div>' +
          '<div class="rv-ag-input">' +
            '<textarea id="rv-ag-text" placeholder="Ask anything about Brandon Hall revenue — e.g. &quot;Should we drop the Exec supplement next Tue–Thu?&quot;" rows="2"></textarea>' +
            '<button class="rv-ag-send" data-rv-agent-ask>Ask →</button>' +
          '</div>' +
          '<p class="rv-note" style="margin-top:8px">Model: gemini-2.0-flash · tool: Google Search grounding · ~3-10 seconds per answer · cost: pennies per day.</p>' +
        '</div>' +
      '</div>';
  }

  /* --- Agent runtime: ask, render, history --- */
  function getAgentHistory() {
    try { return JSON.parse(localStorage.getItem(AGENT_HIST_KEY)) || []; } catch (e) { return []; }
  }
  function setAgentHistory(h) {
    try { localStorage.setItem(AGENT_HIST_KEY, JSON.stringify(h.slice(-20))); } catch (e) {}
  }
  function restoreAgentHistory() {
    var h = getAgentHistory();
    if (!h.length) return;
    var el = document.getElementById('rv-ag-results'); if (!el) return;
    // Hide welcome, render each turn
    el.innerHTML = h.map(renderAgentTurn).join('');
    el.scrollTop = el.scrollHeight;
  }
  function renderAgentTurn(t) {
    var sources = (t.sources || []).map(function (s) {
      return '<a href="' + esc(s.uri) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title || s.uri) + '</a>';
    }).join('<span class="rv-ag-sep">·</span>');
    var searchLine = t.searchQueries && t.searchQueries.length
      ? '<p class="rv-ag-searched">Searched: ' + t.searchQueries.map(function (q) { return '<code>' + esc(q) + '</code>'; }).join(', ') + '</p>' : '';
    return '<div class="rv-ag-turn">' +
      '<div class="rv-ag-you"><span class="rv-ag-whoY">You</span><p>' + esc(t.question) + '</p></div>' +
      '<div class="rv-ag-ans"><span class="rv-ag-whoA">Agent</span><div class="rv-ag-md">' + mdLite(t.answer) + '</div>' +
        searchLine +
        (sources ? '<p class="rv-ag-sources"><b>Sources:</b> ' + sources + '</p>' : '') +
        (t.model ? '<p class="rv-ag-meta">' + esc(t.model) + ' · ' + fmtAgo(t.ts) + '</p>' : '') +
      '</div>' +
    '</div>';
  }
  function askAgent(question) {
    if (!question || !question.trim() || AGENT_INFLIGHT) return;
    AGENT_INFLIGHT = true;
    var el = document.getElementById('rv-ag-results');
    if (!el) { AGENT_INFLIGHT = false; return; }
    // Append a placeholder turn
    var placeholder = '<div class="rv-ag-turn rv-ag-pending" id="rv-ag-pending">' +
      '<div class="rv-ag-you"><span class="rv-ag-whoY">You</span><p>' + esc(question) + '</p></div>' +
      '<div class="rv-ag-ans"><span class="rv-ag-whoA">Agent</span><p class="rv-ag-thinking">Thinking <span class="rv-ag-dot">·</span><span class="rv-ag-dot">·</span><span class="rv-ag-dot">·</span> researching live…</p></div>' +
    '</div>';
    // If welcome block is still showing, replace it; else append
    if (el.querySelector('.rv-ag-welcome')) el.innerHTML = placeholder;
    else el.insertAdjacentHTML('beforeend', placeholder);
    el.scrollTop = el.scrollHeight;

    var token = null; token = aiTok();
    if (!token) {
      finalizePending(question, '**Please sign out and sign back in** to refresh your session, then try again.', [], [], null);
      AGENT_INFLIGHT = false; return;
    }
    var snapshot = buildEngineSnapshot(60);
    fetch(AGENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ question: question, snapshot: snapshot, ground: true })
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        AGENT_INFLIGHT = false;
        if (!j || !j.ok) {
          var reason = j && j.reason === 'no-key'
            ? 'The Gemini API key isn\'t configured on the server. Deploy the function with a `GEMINI_API_KEY` secret and try again.'
            : 'The Agent couldn\'t answer: ' + ((j && j.error) || 'unknown error');
          finalizePending(question, reason, [], [], null);
          return;
        }
        finalizePending(question, j.answer, j.sources || [], j.searchQueries || [], j.model);
      }).catch(function (e) {
        AGENT_INFLIGHT = false;
        finalizePending(question, 'Network error contacting the Agent: ' + (e && e.message || e), [], [], null);
      });
  }
  function finalizePending(question, answer, sources, searchQueries, model) {
    var el = document.getElementById('rv-ag-results'); if (!el) return;
    var pending = document.getElementById('rv-ag-pending');
    var turn = { ts: Date.now(), question: question, answer: answer, sources: sources, searchQueries: searchQueries, model: model };
    var hist = getAgentHistory(); hist.push(turn); setAgentHistory(hist);
    if (pending) pending.outerHTML = renderAgentTurn(turn);
    else el.insertAdjacentHTML('beforeend', renderAgentTurn(turn));
    el.scrollTop = el.scrollHeight;
  }

  /* Snapshot of the engine's near-term state — the Agent sees this on every call. */
  function buildEngineSnapshot(horizon) {
    var nights = nightsFor('exec_dbl', horizon || 60);
    var decs = getDecisions();
    var avg = function (fn) { return Math.round(nights.reduce(function (t, n) { return t + fn(n); }, 0) / nights.length); };
    return {
      today: new Date().toISOString().slice(0, 10),
      horizonNights: horizon || 60,
      hotel: 'Brandon Hall Hotel & Spa (114 lettable)',
      roomType: 'Executive double (48 rooms, BAR £172)',
      averages: {
        currentBAR: avg(function (n) { return n.current; }),
        recommendedRate: avg(function (n) { return n.recommended; }),
        compReference: avg(function (n) { return n.compRef; }),
        forecastOccupancyPct: avg(function (n) { return n.occ * 100; })
      },
      counts: {
        needingDecision: nights.filter(function (n) { return !decs['exec_dbl|' + n.d]; }).length,
        bigMoves: nights.filter(function (n) { return Math.abs(n.recommended - n.current) >= 20; }).length,
        softNights: nights.filter(function (n) { return n.occ < 0.35; }).length,
        strongNights: nights.filter(function (n) { return n.occ > 0.85; }).length
      },
      biggestMoves: nights.filter(function (n) { return Math.abs(n.recommended - n.current) >= 10; })
        .sort(function (a, b) { return Math.abs(b.recommended - b.current) - Math.abs(a.recommended - a.current); })
        .slice(0, 5)
        .map(function (n) { return { d: n.d, dow: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][n.day], current: n.current, recommended: n.recommended, occ: Math.round(n.occ * 100), compRef: n.compRef, reasons: n.reasons }; }),
      settings: { commission: SETTINGS.commission, variable: SETTINGS.variable, ancillary: SETTINGS.ancillary, weights: SETTINGS.weights }
    };
  }

  /* Minimal markdown → HTML. Covers the shape Gemini returns:
     ## heading, **bold**, *italic*, bullet lists, numbered lists, links, paragraphs. */
  function mdLite(md) {
    if (!md) return '';
    var out = String(md).replace(/\r\n/g, '\n');
    // Escape HTML first
    out = out.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    // Headings ## and ###
    out = out.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    out = out.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/^# (.+)$/gm, '<h3>$1</h3>');
    // Bold and italic
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    // Inline code
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Links [text](url)
    out = out.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Lists — group consecutive - or * items
    out = out.replace(/^(?:- |\* )(.+)(?:\n(?:- |\* ).+)*/gm, function (block) {
      var items = block.split(/\n/).map(function (l) { return l.replace(/^[-*] /, ''); });
      return '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
    });
    // Numbered lists
    out = out.replace(/^(?:\d+\. )(.+)(?:\n\d+\. .+)*/gm, function (block) {
      var items = block.split(/\n/).map(function (l) { return l.replace(/^\d+\. /, ''); });
      return '<ol>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ol>';
    });
    // Paragraphs — split on blank lines, skip anything that's already a block tag
    out = out.split(/\n{2,}/).map(function (p) {
      if (/^<(h3|h4|ul|ol|pre|blockquote)/.test(p.trim())) return p;
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    return out;
  }

  function viewEvents() {
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var stars = function (n) { return '<span class="rv-stars">' + '★'.repeat(n) + '<span class="dim">' + '☆'.repeat(5 - n) + '</span></span>'; };

    // Prefer live events (cached) over the demo list
    var live = getCachedEvents();
    var useLive = !!(live && live.events && live.events.length);
    var rows;
    if (useLive) {
      rows = live.events.map(function (e) {
        return '<tr><td><b>' + esc(shortD(e.date)) + '</b></td><td>' + esc(e.event) + '</td><td>' + esc(e.venue) + '</td><td><span class="rv-eventtype">' + esc(e.type) + '</span></td><td>' + stars(e.impact) + '</td><td class="n">' + num(e.attendance) + '</td></tr>';
      }).join('');
    } else {
      rows = DEMO_EVENTS.map(function (e) {
        var d = addDays(start, e.offset);
        return '<tr><td><b>' + esc(shortD(iso(d))) + '</b></td><td>' + esc(e.label) + '</td><td>' + esc(e.venue) + '</td><td><span class="rv-eventtype">' + esc(e.type) + '</span></td><td>' + stars(e.impact) + '</td><td class="n">' + num(e.attendance) + '</td></tr>';
      }).join('');
    }

    var sourcesH = '';
    if (useLive && live.sources && live.sources.length) {
      sourcesH = '<p class="rv-ag-sources" style="margin-top:14px"><b>Sources:</b> ' + live.sources.slice(0, 8).map(function (s) {
        return '<a href="' + esc(s.uri) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title || s.uri) + '</a>';
      }).join('<span class="rv-ag-sep">·</span>') + '</p>';
    }

    var mode = useLive
      ? '<span class="rv-ai-badge">Live research</span> <span class="rv-ai-mode" style="margin-left:6px">Gemini + Google Search · updated ' + fmtAgo(live.ts) + '</span>'
      : '<span class="rv-ai-mode">Demo events · click Refresh to pull real events live</span>';

    // Kick off a background refresh if cache is stale
    setTimeout(function () { maybeFetchEvents(); }, 0);

    return hero() + viewTabs() +
      '<div class="rv-card">' +
      '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-bottom:6px">' +
        '<div><h3>Events — next 60 days</h3><p class="sub" style="margin:2px 0 0">' + mode + '</p></div>' +
        '<button class="v16-chip" data-rv-events-refresh title="Clear cache and re-research events via Gemini">↻ Refresh events</button>' +
      '</div>' +
      '<p class="sub" style="margin:10px 0 12px">Local events within ~20 miles + our own diary · scored 1–5 for impact. The engine nudges rates on strong nights but does not double-count — competitors already price events into their own rates.</p>' +
      '<table class="rv-t"><thead><tr><th>Date</th><th>Event</th><th>Venue</th><th>Type</th><th>Impact</th><th class="n">Attendance</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      sourcesH +
      '</div>';
  }

  /* v36: live events — cached locally, backed by hosrevEvents Firebase function */
  function getCachedEvents() {
    try {
      var raw = localStorage.getItem(EVENTS_CACHE_KEY); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || (Date.now() - o.ts) > EVENTS_CACHE_TTL) return null;
      return o;
    } catch (e) { return null; }
  }
  function setCachedEvents(o) { try { localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }
  var EVENTS_INFLIGHT = false;
  function maybeFetchEvents(force) {
    if (EVENTS_INFLIGHT) return;
    if (!force && getCachedEvents()) return;
    var token; token = aiTok(); if (!token) return;
    if (!token) return;
    EVENTS_INFLIGHT = true;
    var method = force ? 'POST' : 'GET';
    var opts = { method: method, headers: { Authorization: 'Bearer ' + token } };
    if (force) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify({ refresh: true, days: 60 }); }
    fetch(EVENTS_ENDPOINT, opts).then(function (r) { return r.json(); })
      .then(function (j) {
        EVENTS_INFLIGHT = false;
        if (!j || !j.ok || !Array.isArray(j.events) || !j.events.length) return;
        setCachedEvents({ ts: Date.now(), events: j.events, sources: j.sources || [], model: j.model });
        if (UI.view === 'events') render();
      }).catch(function () { EVENTS_INFLIGHT = false; });
  }

  /* ---- Forecast ---- */
  function viewForecast() {
    var html = hero() + viewTabs() +
      '<div class="rv-card"><h3>Occupancy — past 30 days + next 30 nights</h3><p class="sub">Past bars are real occupancy from the Guestline feed · forward bars are the engine\'s forecast</p>' +
        '<div class="rv-chartbox" style="height:380px"><canvas id="rv-fc-occ"></canvas></div>' +
      '</div>' +
      '<div class="rv-card"><h3>Net room profit per night — Executive double</h3><p class="sub">Expected net profit per occupied room × expected rooms sold, at the engine\'s recommended price for each night</p>' +
        '<div class="rv-chartbox" style="height:380px"><canvas id="rv-fc-prof"></canvas></div>' +
      '</div>' +
      '<div class="rv-card"><h3>Trend — average displayed rate by hotel</h3><p class="sub">Next ~30 nights · one line per comp hotel · our Brandon Hall (recommended) in bold navy, current BAR dashed grey</p>' +
        '<div class="rv-chartbox" style="height:420px"><canvas id="rv-trend-chart"></canvas></div>' +
        '<div class="rv-leg" id="rv-trend-leg"></div>' +
      '</div>' +
      '<p class="rv-note" style="text-align:center">Historic occupancy bars come from closed-day Guestline pulls (already live). Forward occupancy and the Trend chart become live too the moment the Report Data API key lands.</p>';
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
  /* v39.14 — Report keys + labels for the Users & Notifications UI */
  var REPORT_LABELS = [
    { key: 'dailyBrief',      label: '08:00 Daily Business Update', hint: 'Full trading brief every morning' },
    { key: 'rateActionBrief', label: "09:45 Rate Action Brief",      hint: "Patrik's rate-decision brief · weekdays and weekends" },
    { key: 'watchdog',        label: 'ARIA Watchdog alerts',         hint: 'Only when a scheduled job stalls or fails' },
    { key: 'ariaAlerts',      label: 'ARIA intraday alerts',         hint: 'Soft nights, rate moves, in-day signals' }
  ];

  function renderNotifUsersSection() {
    var c = getCachedNotifUsers();
    var users = c && c.users ? c.users : null;

    var html = '<div class="rv-card"><h3>Users &amp; notifications</h3><p class="sub">Add team members and tick which reports each one should receive. If nobody is ticked for a report, the system default (<code>aj@ykawa.com</code>) gets it.</p>';

    if (!users) {
      html += '<div style="padding:20px;text-align:center;color:#7b8494">Loading…</div>';
    } else if (!users.length) {
      html += '<div style="padding:16px;background:#fdf8ee;border:1px solid #efe4c7;border-radius:6px;font-size:13px;color:#7a5f0b;margin-bottom:14px">No subscribers added yet. All reports go to <b>aj@ykawa.com</b> until you add users below.</div>';
    } else {
      html += '<div style="overflow-x:auto"><table class="rv-t" style="margin-bottom:14px"><thead><tr>' +
        '<th>Name</th><th>Email</th><th>Role</th>' +
        REPORT_LABELS.map(function (r) { return '<th class="n" title="' + esc(r.hint) + '">' + esc(r.label) + '</th>'; }).join('') +
        '<th></th>' +
      '</tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr>' +
          '<td>' + esc(u.name || '—') + '</td>' +
          '<td style="font-family:monospace;font-size:12px">' + esc(u.email) + '</td>' +
          '<td>' + esc(u.role || '') + '</td>' +
          REPORT_LABELS.map(function (r) {
            var checked = u.subs && u.subs[r.key] ? 'checked' : '';
            return '<td class="n"><input type="checkbox" ' + checked + ' data-rv-notif-toggle="' + esc(u.email) + '|' + r.key + '" style="width:16px;height:16px;cursor:pointer"></td>';
          }).join('') +
          '<td class="n"><button class="v16-chip" data-rv-notif-del="' + esc(u.email) + '" title="Remove user" style="color:#8a1e15">×</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
    }

    // Add-user form
    html += (
      '<div style="padding:14px 16px;background:#f6f8fb;border:1px solid #e3e7ee;border-radius:8px">' +
        '<div style="font-size:12px;font-weight:700;letter-spacing:.4px;color:#1a3b60;text-transform:uppercase;margin-bottom:10px">Add a user</div>' +
        '<div style="display:grid;grid-template-columns:1.5fr 1.5fr 1fr auto;gap:10px;align-items:end">' +
          '<div><label style="font-size:11px;color:#52647a;font-weight:600">Name</label><input class="rv-input" type="text" id="rv-notif-name" placeholder="Patrik Vlach" style="width:100%"></div>' +
          '<div><label style="font-size:11px;color:#52647a;font-weight:600">Email</label><input class="rv-input" type="email" id="rv-notif-email" placeholder="patrik@brandonhallhotelandspa.com" style="width:100%"></div>' +
          '<div><label style="font-size:11px;color:#52647a;font-weight:600">Role (optional)</label><input class="rv-input" type="text" id="rv-notif-role" placeholder="Front Office Manager" style="width:100%"></div>' +
          '<div><button class="rv-alf-btn" data-rv-notif-add style="background:#1a2238;color:#fff;border:0;padding:10px 20px">Add user</button></div>' +
        '</div>' +
        '<div style="margin-top:10px;font-size:11.5px;color:#7b8494">New users start subscribed to <b>Daily Business Update</b> and <b>Watchdog</b> only. Tick others as needed.</div>' +
      '</div>' +
    '</div>');

    return html;
  }

  function viewSettings() {
    var roomRows = ROOM_TYPES.map(function (r) {
      return '<tr><td><b>' + esc(r.label) + '</b></td><td>' + esc(r.cat) + '</td><td>' + (r.exec ? '✓' : '') + '</td><td class="n">£' + r.suppl + '</td><td class="n">' + r.rooms + '</td><td class="n">£' + r.floor + '</td><td class="n">£' + r.ceiling + '</td><td class="n">£' + r.bar + '</td></tr>';
    }).join('');

    return hero() + viewTabs() +
      renderNotifUsersSection() +
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
  /* ============================================================
     v39 — Alfred: morning brief, alerts, scorecard, learnings
     ============================================================ */

  /* ---- caches ---- */
  function getCachedAlfredBrief() { try { var o = JSON.parse(localStorage.getItem(ALFRED_BRIEF_CACHE_KEY) || 'null'); if (!o) return null; if (Date.now() - o.ts > ALFRED_BRIEF_CACHE_TTL) return o; return o; } catch (e) { return null; } }
  function setCachedAlfredBrief(o) { try { localStorage.setItem(ALFRED_BRIEF_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }
  function getCachedAlerts() { try { var o = JSON.parse(localStorage.getItem(ALFRED_ALERTS_CACHE_KEY) || 'null'); if (!o) return null; return o; } catch (e) { return null; } }
  function setCachedAlerts(o) { try { localStorage.setItem(ALFRED_ALERTS_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }
  function getCachedScore() { try { return JSON.parse(localStorage.getItem(ALFRED_SCORE_CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function setCachedScore(o) { try { localStorage.setItem(ALFRED_SCORE_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }
  function getCachedLearn() { try { return JSON.parse(localStorage.getItem(ALFRED_LEARN_CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function setCachedLearn(o) { try { localStorage.setItem(ALFRED_LEARN_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }

  /* ---- local decision state (optimistic; echoes server) ---- */
  function getAlfredDecisions() { try { return JSON.parse(localStorage.getItem('hosrev_alfred_decisions') || '{}'); } catch (e) { return {}; } }
  function setAlfredDecisionLocal(actionId, state, note) {
    try {
      var o = getAlfredDecisions();
      o[actionId] = { state: state, note: note || '', ts: Date.now() };
      localStorage.setItem('hosrev_alfred_decisions', JSON.stringify(o));
    } catch (e) {}
  }
  function alfredDecisionFor(actionId) { var o = getAlfredDecisions(); return o[actionId] || null; }

  /* ---- fetchers (silent, background) ---- */
  function maybeFetchAlfredBrief(force) {
    if (ALFRED_BRIEF_INFLIGHT) return;
    if (!force) {
      var cached = getCachedAlfredBrief();
      if (cached && cached.ts && (Date.now() - cached.ts) < ALFRED_BRIEF_CACHE_TTL) return;
    }
    var tok = null; tok = aiTok();
    if (!tok) return;
    ALFRED_BRIEF_INFLIGHT = true;
    // first try GET (cheap read), if empty then POST (generate)
    fetch(ALFRED_BRIEF_GET_ENDPOINT, { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok && j.brief && j.brief.brief) {
          setCachedAlfredBrief({ ts: Date.now(), brief: j.brief });
          ALFRED_BRIEF_INFLIGHT = false;
          if (UI.view === 'alfred') render();
          return;
        }
        // No stored brief — ask Alfred to generate one now
        return fetch(ALFRED_BRIEF_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ horizon: 60, ground: true }) })
          .then(function (r) { return r.json(); })
          .then(function (j2) {
            if (j2 && j2.ok && j2.brief) setCachedAlfredBrief({ ts: Date.now(), brief: j2.brief });
            ALFRED_BRIEF_INFLIGHT = false;
            if (UI.view === 'alfred') render();
          });
      })
      .catch(function () { ALFRED_BRIEF_INFLIGHT = false; });
  }
  function refreshAlfredBrief() {
    var tok = null; tok = aiTok();
    if (!tok) { renderAlfredErr('You need to sign in again — the session has expired.'); return; }
    ALFRED_BRIEF_INFLIGHT = true;
    var statusEl = document.querySelector('[data-rv-alf-status]');
    if (statusEl) statusEl.textContent = 'ARIA is preparing a fresh brief…';
    fetch(ALFRED_BRIEF_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ horizon: 60, ground: true }) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }).catch(function () { return { status: r.status, body: null }; }); })
      .then(function (wrap) {
        ALFRED_BRIEF_INFLIGHT = false;
        if (wrap.body && wrap.body.ok && wrap.body.brief) {
          setCachedAlfredBrief({ ts: Date.now(), brief: wrap.body.brief });
          if (UI.view === 'alfred') render();
          return;
        }
        // Server returned an error — show it to the user instead of leaving the top-hat stuck
        var msg = wrap.body && wrap.body.error ? wrap.body.error : ('ARIA could not reach Gemini (HTTP ' + wrap.status + ')');
        renderAlfredErr(msg);
      })
      .catch(function (e) {
        ALFRED_BRIEF_INFLIGHT = false;
        renderAlfredErr('ARIA could not reach the server — network issue. Try again in a moment.');
      });
  }

  /* v39.1: render an error on the Alfred tab if the brief request fails. */
  function renderAlfredErr(msg) {
    var el = $('pf-rev');
    if (!el || UI.view !== 'alfred') return;
    var safe = esc(msg || 'ARIA could not generate a brief.');
    el.innerHTML = '<div class="rv-wrap">' + hero() + viewTabs() +
      '<div class="rv-alf-loading">' +
        '<div style="font-size:48px;margin-bottom:8px">🎩</div>' +
        '<h3 style="color:#2c3440;margin:0 0 8px">ARIA could not prepare this morning\'s brief.</h3>' +
        '<p style="max-width:560px;margin:0 auto 16px;color:#52514e;line-height:1.5">' + safe + '</p>' +
        '<p><button class="rv-alf-btn" data-rv-alf-refresh>Try again</button></p>' +
        '<p style="margin-top:20px;font-size:12px;opacity:.65">If this persists, check that the Gemini API key has credit at ai.studio and that the Firebase function has fresh logs.</p>' +
      '</div>' +
    '</div>';
  }
  function maybeFetchAlerts(force) {
    if (ALFRED_ALERTS_INFLIGHT) return;
    if (!force) {
      var c = getCachedAlerts();
      if (c && c.ts && (Date.now() - c.ts) < ALFRED_ALERTS_CACHE_TTL) return;
    }
    var tok = null; tok = aiTok();
    if (!tok) return;
    ALFRED_ALERTS_INFLIGHT = true;
    fetch(ALFRED_ALERTS_ENDPOINT, { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        ALFRED_ALERTS_INFLIGHT = false;
        if (j && j.ok) {
          setCachedAlerts({ ts: Date.now(), alerts: j.alerts || [] });
          render();
        }
      })
      .catch(function () { ALFRED_ALERTS_INFLIGHT = false; });
  }
  function maybeFetchScorecard() {
    var c = getCachedScore();
    if (c && c.ts && (Date.now() - c.ts) < ALFRED_SCORE_CACHE_TTL) return;
    var tok = null; tok = aiTok();
    if (!tok) return;
    fetch(ALFRED_SCORECARD_ENDPOINT + '?days=14', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) {
          setCachedScore({ ts: Date.now(), scorecard: j.scorecard });
          if (UI.view === 'alfred') render();
        }
      })
      .catch(function () {});
  }
  function maybeFetchLearnings() {
    var c = getCachedLearn();
    if (c && c.ts && (Date.now() - c.ts) < ALFRED_LEARN_CACHE_TTL) return;
    var tok = null; tok = aiTok();
    if (!tok) return;
    fetch(ALFRED_LEARNINGS_ENDPOINT, { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) {
          setCachedLearn({ ts: Date.now(), learnings: j.learnings });
          if (UI.view === 'alfred') render();
        }
      })
      .catch(function () {});
  }

  function postAlfredDecision(payload) {
    var tok = null; tok = aiTok();
    if (!tok) return Promise.resolve({ ok: false });
    return fetch(ALFRED_DECISION_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  /* ---- v39.14: 12-month forecast cache + fetch ---- */
  function getCachedForecast() { try { var o = JSON.parse(localStorage.getItem(FORECAST_CACHE_KEY) || 'null'); if (!o) return null; return o; } catch (e) { return null; } }
  function setCachedForecast(v) { try { localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(v)); } catch (e) {} }
  function maybeFetchForecast(force) {
    var c = getCachedForecast();
    if (!force && c && c.ts && (Date.now() - c.ts) < FORECAST_CACHE_TTL && c.forecast) return;
    if (FORECAST_INFLIGHT) return;
    var tok = aiTok();
    if (!tok) return;
    FORECAST_INFLIGHT = true;
    var ac = new AbortController();
    var tm = setTimeout(function () { ac.abort(); }, 30000);
    fetch(FORECAST_ENDPOINT, { headers: { 'Authorization': 'Bearer ' + tok }, signal: ac.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(tm);
        FORECAST_INFLIGHT = false;
        if (j && j.ok) {
          setCachedForecast({ ts: Date.now(), forecast: j.forecast });
          if (UI.view === 'twelve') render();
        }
      })
      .catch(function () { clearTimeout(tm); FORECAST_INFLIGHT = false; });
  }
  /* Force Guestline pull then rebuild — called by the "Refresh now" button */
  function refreshForecast() {
    var tok = aiTok();
    if (!tok) return;
    var btn = document.querySelector('[data-rv-fc-refresh]');
    if (btn) { btn.disabled = true; btn.textContent = 'Pulling 365 nights from Guestline…'; }
    fetch(FORECAST_LONG_RUN_ENDPOINT, { method: 'POST', headers: { 'x-gl-key': '' }, body: '{}' })
      .catch(function () {})
      .finally(function () {
        // the admin-key endpoint is called server-to-server normally; for client refresh, use the tick instead
        try { localStorage.removeItem(FORECAST_CACHE_KEY); } catch (e) {}
        maybeFetchForecast(true);
        if (btn) { btn.disabled = false; btn.textContent = 'Refresh now'; }
      });
  }

  /* ---- v39.14: Notification Users cache + fetch ---- */
  function getCachedNotifUsers() { try { return JSON.parse(localStorage.getItem(NOTIF_USERS_CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function setCachedNotifUsers(v) { try { localStorage.setItem(NOTIF_USERS_CACHE_KEY, JSON.stringify(v)); } catch (e) {} }
  function maybeFetchNotifUsers(force) {
    var c = getCachedNotifUsers();
    if (!force && c && c.ts && (Date.now() - c.ts) < NOTIF_USERS_CACHE_TTL && c.users) return;
    if (NOTIF_USERS_INFLIGHT) return;
    var tok = aiTok(); if (!tok) return;
    NOTIF_USERS_INFLIGHT = true;
    fetch(NOTIF_USERS_GET_ENDPOINT, { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        NOTIF_USERS_INFLIGHT = false;
        if (j && j.ok) {
          setCachedNotifUsers({ ts: Date.now(), users: j.users || [], reportKeys: j.reportKeys || [] });
          if (UI.view === 'settings') render();
        }
      })
      .catch(function () { NOTIF_USERS_INFLIGHT = false; });
  }
  function postNotifUser(payload) {
    var tok = aiTok(); if (!tok) return Promise.resolve({ ok: false, error: 'not signed in' });
    return fetch(NOTIF_USERS_SET_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .catch(function (e) { return { ok: false, error: String(e) }; });
  }
  function deleteNotifUser(email) {
    var tok = aiTok(); if (!tok) return Promise.resolve({ ok: false });
    return fetch(NOTIF_USERS_DELETE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ email: email }) })
      .then(function (r) { return r.json(); })
      .catch(function (e) { return { ok: false, error: String(e) }; });
  }

  /* ---- v39.14: Team Input cache + fetch (Rev Mgmt questionnaire submissions) ---- */
  function getCachedTeamInput() { try { return JSON.parse(localStorage.getItem(TEAM_INPUT_CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function setCachedTeamInput(v) { try { localStorage.setItem(TEAM_INPUT_CACHE_KEY, JSON.stringify(v)); } catch (e) {} }
  function maybeFetchTeamInput(force) {
    var c = getCachedTeamInput();
    if (!force && c && c.ts && (Date.now() - c.ts) < TEAM_INPUT_CACHE_TTL && c.submissions) return;
    if (TEAM_INPUT_INFLIGHT) return;
    var tok = aiTok();
    if (!tok) return;
    TEAM_INPUT_INFLIGHT = true;
    var ac = new AbortController();
    var tm = setTimeout(function () { ac.abort(); }, 30000);
    fetch(TEAM_INPUT_ENDPOINT + '?limit=20', { headers: { 'Authorization': 'Bearer ' + tok }, signal: ac.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(tm);
        TEAM_INPUT_INFLIGHT = false;
        if (j && j.ok) {
          setCachedTeamInput({ ts: Date.now(), submissions: j.submissions || [], count: j.count || 0 });
          if (UI.view === 'team') render();
        }
      })
      .catch(function () { clearTimeout(tm); TEAM_INPUT_INFLIGHT = false; });
  }

  /* ---- v39.14: Flash history cache + fetch (Discrepancies) ---- */
  function getCachedFlashHist() { try { return JSON.parse(localStorage.getItem(FLASH_HIST_CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function setCachedFlashHist(v) { try { localStorage.setItem(FLASH_HIST_CACHE_KEY, JSON.stringify(v)); } catch (e) {} }
  function maybeFetchFlashHist(force) {
    var c = getCachedFlashHist();
    if (!force && c && c.ts && (Date.now() - c.ts) < FLASH_HIST_CACHE_TTL && c.latest) return;
    if (FLASH_HIST_INFLIGHT) return;
    var tok = aiTok();
    if (!tok) return;
    FLASH_HIST_INFLIGHT = true;
    var ac = new AbortController();
    var tm = setTimeout(function () { ac.abort(); }, 30000);
    fetch(FLASH_HIST_ENDPOINT + '?limit=21', { headers: { 'Authorization': 'Bearer ' + tok }, signal: ac.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(tm);
        FLASH_HIST_INFLIGHT = false;
        if (j && j.ok) {
          setCachedFlashHist({ ts: Date.now(), latest: j.latest, history: j.history || [] });
          if (UI.view === 'discrep') render();
        }
      })
      .catch(function () { clearTimeout(tm); FLASH_HIST_INFLIGHT = false; });
  }

  function markAlertsRead(ids) {
    var tok = null; tok = aiTok();
    if (!tok) return;
    fetch(ALFRED_ALERTS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify(ids === 'all' ? { markAllRead: true } : { markRead: ids }) })
      .then(function () {
        try { localStorage.removeItem(ALFRED_ALERTS_CACHE_KEY); } catch (e) {}
        maybeFetchAlerts(true);
      });
  }

  /* ---- rendering ---- */
  function renderAlfredAction(a) {
    var dec = alfredDecisionFor(a.id);
    var klass = dec ? (' ' + dec.state) : '';
    var confPct = Math.round((a.confidence || 0) * 100);
    var impactStr = a.revenue_impact_gbp ? ('+' + gbp(a.revenue_impact_gbp)) : '';
    var cat = a.category || 'pricing';
    var done = '';
    if (dec) {
      var lbl = { approved: '✓ Approved', rejected: '✗ Rejected', snoozed: '⏱ Snoozed', edited: '✎ Edited' }[dec.state] || dec.state;
      var cls = dec.state === 'rejected' ? ' rej' : (dec.state === 'snoozed' ? ' snz' : '');
      done = '<div class="rv-alf-done' + cls + '">' + lbl + (dec.note ? ' — ' + esc(dec.note) : '') + '</div>';
    }
    return (
      '<div class="rv-alf-act' + klass + '">' +
        '<div class="top">' +
          '<h4>' + esc(a.title) + '</h4>' +
          '<span class="rv-alf-cat ' + cat + '">' + esc(cat) + '</span>' +
        '</div>' +
        (a.scope ? '<div class="rv-alf-scope">📅 ' + esc(a.scope) + '</div>' : '') +
        '<div class="rv-alf-line"><b>Observed</b> ' + esc(a.observation || '') + '</div>' +
        '<div class="rv-alf-line"><b>Reasoning</b> ' + esc(a.reasoning || '') + '</div>' +
        '<div class="rv-alf-action-text"><b>ARIA suggests</b> — ' + esc(a.action || '') + '</div>' +
        '<div class="rv-alf-meter">' +
          '<span>Confidence</span>' +
          '<span class="bar"><span class="fill" style="width:' + confPct + '%"></span></span>' +
          '<span>' + confPct + '%</span>' +
          (impactStr ? '<span style="margin-left:auto" class="impact">' + impactStr + '</span>' : '') +
        '</div>' +
        (done ? done :
        '<div class="rv-alf-btns">' +
          '<button class="rv-alf-btn approve" data-rv-alf-dec="' + esc(a.id) + '" data-rv-alf-state="approved">Approve</button>' +
          '<button class="rv-alf-btn reject" data-rv-alf-dec="' + esc(a.id) + '" data-rv-alf-state="rejected">Reject</button>' +
          '<button class="rv-alf-btn snooze" data-rv-alf-dec="' + esc(a.id) + '" data-rv-alf-state="snoozed">Snooze 24h</button>' +
          '<button class="rv-alf-btn edit" data-rv-alf-edit="' + esc(a.id) + '">Edit</button>' +
        '</div>') +
      '</div>'
    );
  }

  function renderAlfredBriefBody(briefDoc) {
    var b = briefDoc.brief || {};
    var genAt = briefDoc.generatedAt ? fmtAgo(new Date(briefDoc.generatedAt).getTime()) : '—';
    var actions = Array.isArray(b.priority_actions) ? b.priority_actions : [];

    var heroHtml = (
      '<div class="rv-alf-hero">' +
        '<h2><img src="img/aria.png" style="width:22px;height:22px;vertical-align:-5px;margin-right:6px;border-radius:5px"> ARIA · Morning Brief · ' + esc(briefDoc.date || '') + '</h2>' +
        '<p class="headline">' + esc(b.headline || 'ARIA is preparing your brief.') + '</p>' +
        (b.position ? '<p class="position">' + esc(b.position) + '</p>' : '') +
        '<div class="meta">' +
          '<span><b>Generated</b> ' + genAt + '</span>' +
          '<span><b>Priority actions</b> ' + actions.length + '</span>' +
          '<span><b>Potential upside</b> ' + gbp(actions.reduce(function (t, a) { return t + (a.revenue_impact_gbp || 0); }, 0)) + '</span>' +
          (briefDoc.sources && briefDoc.sources.length ? '<span><b>Sources</b> ' + briefDoc.sources.length + ' web citations</span>' : '') +
        '</div>' +
        '<div style="margin-top:16px">' +
          '<button class="rv-btn primary" data-rv-alf-refresh>Refresh ARIA</button>' +
          '<button class="rv-btn" data-rv-alf-pdf>📄 Download Brief as PDF</button>' +
          '<button class="rv-btn" data-rv-view="calendar">Open Calendar</button>' +
          '<button class="rv-btn" data-rv-view="agent">Ask ARIA a question</button>' +
          '<span data-rv-alf-status style="margin-left:12px;font-size:12px;opacity:.7"></span>' +
        '</div>' +
      '</div>'
    );

    // Alerts panel
    var ac = getCachedAlerts();
    var alerts = ac && Array.isArray(ac.alerts) ? ac.alerts : [];
    var alertsHtml = '';
    if (alerts.length) {
      alertsHtml = (
        '<div class="rv-alf-section">ARIA noticed · ' + alerts.length + '</div>' +
        '<div class="rv-alf-alerts-panel">' +
          alerts.slice(0, 6).map(function (a) {
            var sev = a.severity || 'medium';
            return '<div class="rv-alf-alert-item ' + esc(sev) + '"><span class="dot"></span><div><b>' + esc(a.title || '') + '</b><div class="dtl">' + esc(a.detail || '') + '</div><div class="meta">' + esc(a.date || '') + ' · ' + esc(a.kind || '') + ' · ' + fmtAgo(a.createdAt || Date.now()) + '</div></div></div>';
          }).join('') +
          (alerts.length ? '<div style="padding:10px 16px;background:#fafaf6;text-align:right"><button class="rv-alf-btn" data-rv-alf-alerts-mark-read>Mark all as read</button></div>' : '') +
        '</div>'
      );
    }

    // v39.2: Market Watch chart — current BAR vs comp median vs ARIA’s suggested rate
    var actionDates = {};
    actions.forEach(function (a) {
      var m = /(\d{4}-\d{2}-\d{2})/.exec(a.scope || '');
      if (m) actionDates[m[1]] = true;
    });
    var marketHtml = (
      '<div class="rv-alf-section">Market Watch · next 30 nights — current BAR · comp median · ARIA\'s suggested</div>' +
      '<div class="rv-alf-market-card">' +
        '<div class="rv-alf-market-legend">' +
          '<span><i style="background:#86847d"></i>Current BAR</span>' +
          '<span><i style="background:#eb6834"></i>Comp median</span>' +
          '<span><i style="background:#2ba57a"></i>ARIA\'s suggested</span>' +
          '<span><i style="background:#d4a94e;border-radius:50%"></i>ARIA recommends action</span>' +
          '<span><i style="background:#c0362b;border-radius:50%"></i>95%+ occupancy (sold)</span>' +
        '</div>' +
        '<div class="rv-alf-market-chart"><canvas id="rv-alf-market" data-action-dates="' + esc(JSON.stringify(actionDates)) + '"></canvas></div>' +
        '<div class="rv-alf-market-note" id="rv-alf-market-note"></div>' +
      '</div>'
    );

    // Priority actions
    var actionsHtml = '';
    if (actions.length) {
      actionsHtml = (
        '<div class="rv-alf-section">Priority actions · ranked by potential upside</div>' +
        '<div class="rv-alf-grid">' + actions.map(renderAlfredAction).join('') + '</div>'
      );
    } else {
      actionsHtml = '<div class="rv-alf-empty"><h3>Nothing worth flagging this morning, sir.</h3><p>ARIA found no priority actions in the current data.</p></div>';
    }

    // Opportunities + risks
    var opps = Array.isArray(b.opportunities) ? b.opportunities : [];
    var risks = Array.isArray(b.risks) ? b.risks : [];
    var listsHtml = '';
    if (opps.length || risks.length) {
      listsHtml = (
        '<div class="rv-alf-section">Opportunities &amp; risks</div>' +
        '<div class="rv-alf-lists">' +
          '<div class="rv-alf-list"><h3>↑ Opportunities</h3>' +
            (opps.length ? '<ul>' + opps.map(function (o) {
              return '<li><b>' + esc(o.title) + '</b>' + esc(o.detail) + (o.dates ? '<div class="dt">' + esc(o.dates) + '</div>' : '') + '</li>';
            }).join('') + '</ul>' : '<p style="color:#7b8494;font-size:13px;margin:0">None noted.</p>') +
          '</div>' +
          '<div class="rv-alf-list"><h3>⚠ Risks</h3>' +
            (risks.length ? '<ul>' + risks.map(function (r) {
              return '<li><b>' + esc(r.title) + '</b>' + esc(r.detail) + (r.mitigation ? '<div class="mit">→ ' + esc(r.mitigation) + '</div>' : '') + '</li>';
            }).join('') + '</ul>' : '<p style="color:#7b8494;font-size:13px;margin:0">None noted.</p>') +
          '</div>' +
        '</div>'
      );
    }

    // Pace commentary + watchlist
    var paceHtml = '';
    if (b.pace_commentary) paceHtml += '<div class="rv-alf-pace"><b>Pace commentary</b>' + esc(b.pace_commentary) + '</div>';
    var watch = Array.isArray(b.watchlist) ? b.watchlist : [];
    if (watch.length) {
      paceHtml += (
        '<div class="rv-alf-section">Watchlist · nights to monitor</div>' +
        '<div class="rv-alf-watch">' + watch.map(function (w) {
          return '<div class="chip"><b>' + esc(w.date) + '</b>' + esc(w.note) + '</div>';
        }).join('') + '</div>'
      );
    }

    // Scorecard
    var sc = getCachedScore();
    var scoreHtml = '';
    if (sc && sc.scorecard && sc.scorecard.rolling && sc.scorecard.rolling.total) {
      var r = sc.scorecard.rolling;
      scoreHtml = (
        '<div class="rv-alf-section">Scorecard · last ' + (r.days || 14) + ' days</div>' +
        '<div class="rv-alf-scorecard">' +
          '<p style="font-size:13px;margin:0;color:#52514e">Every recommendation ARIA has made, with your verdict and the realised outcome. The audit trail matters.</p>' +
          '<div class="tiles">' +
            '<div class="st"><div class="l">Actions proposed</div><div class="v">' + r.total + '</div></div>' +
            '<div class="st"><div class="l">Approval rate</div><div class="v">' + r.approvalRate + '%</div></div>' +
            '<div class="st"><div class="l">Approved</div><div class="v" style="color:#1a6442">' + (r.approved + r.edited) + '</div></div>' +
            '<div class="st"><div class="l">Rejected</div><div class="v" style="color:#8a1e15">' + r.rejected + '</div></div>' +
            '<div class="st"><div class="l">Potential revenue</div><div class="v">' + gbp(r.potentialRevenue) + '</div></div>' +
            '<div class="st"><div class="l">Actioned revenue</div><div class="v" style="color:#1a6442">' + gbp(r.actionedRevenue) + '</div></div>' +
          '</div>' +
        '</div>'
      );
    }

    // Learnings
    var learnObj = getCachedLearn();
    var learnHtml = '';
    if (learnObj && learnObj.learnings && Array.isArray(learnObj.learnings.patterns) && learnObj.learnings.patterns.length) {
      var ll = learnObj.learnings;
      learnHtml = (
        '<div class="rv-alf-learn">' +
          '<h3>What ARIA has learned about you</h3>' +
          '<p class="sub">Distilled from your last ' + (ll.windowDays || 30) + ' days of decisions · ARIA adjusts her future briefs accordingly</p>' +
          '<ul>' + ll.patterns.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        '</div>'
      );
    }

    // Sources
    var sourcesHtml = '';
    if (Array.isArray(briefDoc.sources) && briefDoc.sources.length) {
      sourcesHtml = (
        '<div class="rv-alf-section">ARIA\'s sources</div>' +
        '<div style="font-size:12.5px;color:#52514e;line-height:1.75">' +
          briefDoc.sources.slice(0, 10).map(function (s, i) {
            return '[' + (i + 1) + '] <a href="' + esc(s.uri) + '" target="_blank" rel="noopener" style="color:#1F7A8C">' + esc(s.title) + '</a>';
          }).join(' · ') +
        '</div>'
      );
    }

    return heroHtml + alertsHtml + marketHtml + actionsHtml + listsHtml + paceHtml + scoreHtml + learnHtml + sourcesHtml;
  }

  /* v39.3 — Download the current brief as a PDF.
     Opens a new window with a print-optimised layout and triggers window.print().
     The user's browser handles the actual "Save as PDF" step. */
  function downloadAlfredPDF() {
    var cached = getCachedAlfredBrief();
    if (!cached || !cached.brief) { alert('No brief to download — ARIA hasn\'t prepared one yet.'); return; }
    var b = cached.brief.brief || {};
    var date = cached.brief.date || iso(new Date());
    var gen = cached.brief.generatedAt ? new Date(cached.brief.generatedAt).toLocaleString('en-GB') : '';
    var actions = Array.isArray(b.priority_actions) ? b.priority_actions : [];
    var opps = Array.isArray(b.opportunities) ? b.opportunities : [];
    var risks = Array.isArray(b.risks) ? b.risks : [];
    var watch = Array.isArray(b.watchlist) ? b.watchlist : [];
    var decisions = getAlfredDecisions();

    function catBadge(c) { return '<span style="font-size:9px;font-weight:700;letter-spacing:.3px;padding:2px 6px;border-radius:3px;background:#eef3f8;color:#1a3b60;text-transform:uppercase">' + esc(c || '') + '</span>'; }

    var html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>ARIA\'s Morning Brief · ' + esc(date) + '</title>' +
      '<style>' +
      '@page{size:A4;margin:14mm 14mm 16mm 14mm}' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;color:#1a2238;line-height:1.5;font-size:11pt;margin:0}' +
      '.hdr{border-bottom:2px solid #1a2238;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}' +
      '.hdr h1{margin:0;font-size:22pt;font-weight:700;letter-spacing:-.3px}' +
      '.hdr .sub{font-size:10pt;color:#52514e;margin-top:4px}' +
      '.hdr .meta{font-size:9pt;color:#7b8494;text-align:right}' +
      '.headline{font-size:14pt;font-weight:600;line-height:1.4;margin:12px 0 4px;color:#1a2238}' +
      '.position{font-size:11pt;color:#2c3440;margin-bottom:16px}' +
      '.section{margin-top:16px;font-size:9.5pt;font-weight:700;letter-spacing:.5px;color:#52514e;text-transform:uppercase;border-bottom:1px solid #d4d2cb;padding-bottom:4px;margin-bottom:10px}' +
      '.action{border:1px solid #d4d2cb;border-radius:6px;padding:11px 14px;margin-bottom:10px;page-break-inside:avoid}' +
      '.action.approved{border-color:#2ba57a;background:#f4fbf7}' +
      '.action.rejected{border-color:#c0362b;background:#fdf6f5}' +
      '.action.snoozed{border-color:#eb6834;background:#fdf8f3}' +
      '.action h3{margin:0 0 4px;font-size:12pt;font-weight:700}' +
      '.action .scope{font-size:9.5pt;color:#7b8494;margin-bottom:8px}' +
      '.action .line{margin:4px 0;font-size:10.5pt}' +
      '.action .line b{font-weight:600;color:#52514e;font-size:9pt;text-transform:uppercase;letter-spacing:.3px;display:inline-block;min-width:80px}' +
      '.action .move{background:#fdf8ee;border-left:3px solid #d4a94e;padding:8px 10px;margin:8px 0;font-weight:600;font-size:11pt}' +
      '.action .meta{display:flex;gap:16px;margin-top:8px;font-size:9.5pt;color:#52514e;border-top:1px solid #efece5;padding-top:8px}' +
      '.action .meta b{font-weight:700;color:#1a2238}' +
      '.action .verdict{margin-top:8px;font-size:9.5pt;font-weight:700;padding:5px 8px;border-radius:4px;display:inline-block}' +
      '.action .verdict.a{color:#1a6442;background:#e6f4ee}' +
      '.action .verdict.r{color:#8a1e15;background:#fbe9e7}' +
      '.action .verdict.s{color:#9d4712;background:#fdf0e6}' +
      '.lists{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px}' +
      '.lists h4{margin:0 0 6px;font-size:11pt;color:#1a2238}' +
      '.lists ul{margin:0;padding-left:18px}' +
      '.lists li{margin-bottom:6px;font-size:10pt;line-height:1.4}' +
      '.lists li b{font-weight:700}' +
      '.pace{background:#fdfcf7;border:1px solid #e9e3ca;border-radius:6px;padding:10px 14px;margin:12px 0;font-size:10.5pt;line-height:1.5}' +
      '.watch{display:flex;gap:8px;flex-wrap:wrap}' +
      '.watch .c{border:1px solid #d4d2cb;border-radius:5px;padding:5px 10px;font-size:9.5pt}' +
      '.watch .c b{display:block;font-weight:700;font-size:9.5pt}' +
      '.sum{background:#1a2238;color:#fff;border-radius:8px;padding:14px 18px;margin:16px 0}' +
      '.sum .total{font-size:20pt;font-weight:700;margin:4px 0}' +
      '.sum .lbl{font-size:9.5pt;opacity:.85;text-transform:uppercase;letter-spacing:.5px}' +
      '.sum .brk{font-size:10pt;opacity:.85;margin-top:6px}' +
      '.footer{margin-top:24px;padding-top:12px;border-top:1px solid #d4d2cb;font-size:9pt;color:#7b8494;text-align:center}' +
      '.sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}' +
      '.sig .line{border-top:1px solid #1a2238;padding-top:6px;font-size:9.5pt;color:#52514e}' +
      '</style></head><body>' +

      '<div class="hdr"><div><h1>ARIA\'s Morning Brief</h1><div class="sub">Brandon Hall Hotel &amp; Spa · Revenue Management</div></div>' +
      '<div class="meta">Date: <b>' + esc(date) + '</b><br>Generated: ' + esc(gen) + '<br>Model: ' + esc(cached.brief.model || 'gemini') + '</div></div>' +

      '<p class="headline">' + esc(b.headline || '') + '</p>' +
      '<p class="position">' + esc(b.position || '') + '</p>';

    // Summary tile
    var totalImpact = actions.reduce(function (t, a) { return t + (a.revenue_impact_gbp || 0); }, 0);
    var approvedImpact = actions.filter(function (a) { var d = decisions[a.id]; return d && (d.state === 'approved' || d.state === 'edited'); }).reduce(function (t, a) { return t + (a.revenue_impact_gbp || 0); }, 0);
    html += '<div class="sum"><div class="lbl">Potential upside this morning</div><div class="total">' + gbp(totalImpact) + '</div>' +
      '<div class="brk">' + actions.length + ' priority actions · ' + opps.length + ' opportunities · ' + risks.length + ' risks · approved so far: ' + gbp(approvedImpact) + '</div></div>';

    // Priority actions
    if (actions.length) {
      html += '<div class="section">Priority actions · ranked by revenue impact</div>';
      actions.forEach(function (a) {
        var dec = decisions[a.id];
        var klass = dec ? ' ' + dec.state : '';
        var conf = Math.round((a.confidence || 0) * 100);
        html += '<div class="action' + klass + '">' +
          '<h3>' + esc(a.title) + ' &nbsp; ' + catBadge(a.category) + '</h3>' +
          (a.scope ? '<div class="scope">📅 ' + esc(a.scope) + '</div>' : '') +
          '<div class="line"><b>Observed</b> ' + esc(a.observation) + '</div>' +
          '<div class="line"><b>Reasoning</b> ' + esc(a.reasoning) + '</div>' +
          '<div class="move">→ ' + esc(a.action) + '</div>' +
          '<div class="meta"><span><b>Confidence</b> ' + conf + '%</span>' +
          '<span><b>Revenue impact</b> ' + gbp(a.revenue_impact_gbp || 0) + '</span>' +
          '<span><b>Effort</b> ' + esc(a.effort) + '</span></div>' +
          (dec ? '<div class="verdict ' + (dec.state === 'approved' ? 'a' : dec.state === 'rejected' ? 'r' : 's') + '">' +
            { approved: '✓ APPROVED', rejected: '✗ REJECTED', snoozed: '⏱ SNOOZED', edited: '✎ EDITED' }[dec.state] +
            (dec.note ? ' — ' + esc(dec.note) : '') + '</div>' : '') +
          '</div>';
      });
    }

    // Opps + risks
    if (opps.length || risks.length) {
      html += '<div class="section">Opportunities &amp; risks</div><div class="lists">' +
        '<div><h4>↑ Opportunities</h4>' +
        (opps.length ? '<ul>' + opps.map(function (o) { return '<li><b>' + esc(o.title) + '</b> — ' + esc(o.detail) + (o.dates ? ' <i>(' + esc(o.dates) + ')</i>' : '') + '</li>'; }).join('') + '</ul>' : '<p>None noted.</p>') +
        '</div><div><h4>⚠ Risks</h4>' +
        (risks.length ? '<ul>' + risks.map(function (r) { return '<li><b>' + esc(r.title) + '</b> — ' + esc(r.detail) + (r.mitigation ? '<br><i>→ ' + esc(r.mitigation) + '</i>' : '') + '</li>'; }).join('') + '</ul>' : '<p>None noted.</p>') +
        '</div></div>';
    }

    // Pace + watchlist
    if (b.pace_commentary) html += '<div class="section">Pace commentary</div><div class="pace">' + esc(b.pace_commentary) + '</div>';
    if (watch.length) html += '<div class="section">Watchlist · nights to monitor</div><div class="watch">' + watch.map(function (w) { return '<div class="c"><b>' + esc(w.date) + '</b>' + esc(w.note) + '</div>'; }).join('') + '</div>';

    // Signatures for the audit trail
    html += '<div class="sig"><div class="line">Actioned by (Front Office)<br><br><br></div><div class="line">Reviewed by (CCO)<br><br><br></div></div>';
    html += '<div class="footer">ARIA · Advanced Revenue Intelligence Agent · Brandon Hall Hotel &amp; Spa<br>Not a decision document — recommendations for review by a human revenue manager.</div>';
    html += '</body></html>';

    var w = window.open('', 'alfred-brief', 'width=820,height=900');
    if (!w) { alert('Pop-up blocked — allow pop-ups for this site to download the brief.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 400);
  }

  /* v39.2 — Market Watch line chart on the Alfred tab.
     Three series over the next 30 nights: current BAR, comp median, ARIA’s suggested rate.
     Highlights nights ARIA flagged for action, plus nights at 95%+ occupancy. */
  function drawAlfredMarketChart() {
    if (!window.Chart) return;
    var canvas = document.getElementById('rv-alf-market');
    if (!canvas) return;
    try { buildNights(); } catch (e) {}
    var nights = (typeof NIGHTS !== 'undefined' && NIGHTS) ? NIGHTS.slice(0, 30) : [];
    if (!nights.length) return;

    // Real on-books cache
    var liveBooks = getCachedBooks();
    var compCache = getCachedComp();

    var labels = nights.map(function (n) { return shortD(n.d); });

    // Row 1 — Current BAR (Classic double as benchmark)
    var currentBar = nights.map(function (n) {
      try {
        var r = nightComputedFor('classic_dbl', n);
        return r && r.current ? r.current : null;
      } catch (e) { return null; }
    });

    // Row 2 — Comp median (from SerpApi cache if present, pseudo otherwise)
    function pseudo(s) { var x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); }
    var compMedian = nights.map(function (n, ni) {
      if (compCache && compCache.byDate && compCache.byDate[n.d]) {
        var hotels = compCache.byDate[n.d];
        var rates = Object.keys(hotels).map(function (k) { return +(hotels[k] && hotels[k].rate) || 0; }).filter(function (r) { return r > 0; });
        if (rates.length) { rates.sort(function (a, b) { return a - b; }); return rates[Math.floor(rates.length / 2)]; }
      }
      // graceful fallback — demo comp
      var dowLift = [0.86, 0.85, 0.92, 0.96, 1.04, 1.18, 1.12][n.day];
      var drift = 1 + (pseudo(ni * 17) - 0.5) * 0.08;
      return Math.round(157 * drift * dowLift);
    });

    // Row 3 — ARIA’s suggested (pricing engine recommendation for Classic double)
    var suggested = nights.map(function (n) {
      try {
        var r = nightComputedFor('classic_dbl', n);
        return r && r.recommended ? r.recommended : null;
      } catch (e) { return null; }
    });

    // Point markers for action nights (gold) and sellout nights (red)
    var actionDates = {};
    try { actionDates = JSON.parse(canvas.getAttribute('data-action-dates') || '{}'); } catch (e) {}
    var pointColors = nights.map(function (n) {
      if (actionDates[n.d]) return '#d4a94e';
      if (liveBooks && liveBooks.byDate && liveBooks.byDate[n.d] && liveBooks.byDate[n.d].totals && liveBooks.byDate[n.d].totals.rooms / 114 >= 0.95) return '#c0362b';
      return 'transparent';
    });
    var pointRadius = nights.map(function (n) {
      if (actionDates[n.d]) return 6;
      if (liveBooks && liveBooks.byDate && liveBooks.byDate[n.d] && liveBooks.byDate[n.d].totals && liveBooks.byDate[n.d].totals.rooms / 114 >= 0.95) return 5;
      return 0;
    });

    var datasets = [
      { label: 'Current BAR', data: currentBar, borderColor: '#86847d', backgroundColor: '#86847d22', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, tension: 0 },
      { label: 'Comp median', data: compMedian, borderColor: '#eb6834', backgroundColor: '#eb683422', borderWidth: 2, pointRadius: 2, tension: 0.25 },
      { label: 'ARIA\'s suggested', data: suggested, borderColor: '#2ba57a', backgroundColor: '#2ba57a22', borderWidth: 3, pointRadius: pointRadius, pointBackgroundColor: pointColors, pointBorderColor: pointColors, pointBorderWidth: 2, tension: 0.2 }
    ];

    if (window.__alfMarketChart) { try { window.__alfMarketChart.destroy(); } catch (e) {} }
    window.__alfMarketChart = new Chart(canvas, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (c) { return c.dataset.label + ': £' + (c.parsed.y != null ? Math.round(c.parsed.y) : '—'); },
              afterBody: function (ctx) {
                if (!ctx || !ctx[0]) return '';
                var d = nights[ctx[0].dataIndex];
                if (!d) return '';
                var book = (liveBooks && liveBooks.byDate && liveBooks.byDate[d.d] && liveBooks.byDate[d.d].totals) ? liveBooks.byDate[d.d].totals.rooms : null;
                var lines = [];
                if (book !== null) lines.push('On books: ' + book + ' / 114 (' + Math.round((book / 114) * 100) + '%)');
                if (actionDates[d.d]) lines.push('ARIA flagged this night');
                return lines.join('\n');
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#ebe9e3' }, border: { display: false }, ticks: { callback: function (v) { return '£' + v; } } }
        }
      }
    });

    // Note under the chart — summarise the gap
    var note = document.getElementById('rv-alf-market-note');
    if (note) {
      var comp14 = compMedian.slice(0, 14).reduce(function (t, v) { return t + v; }, 0) / 14;
      var sug14 = suggested.slice(0, 14).filter(function (v) { return v != null; });
      var sugAvg = sug14.length ? sug14.reduce(function (t, v) { return t + v; }, 0) / sug14.length : 0;
      var cur14 = currentBar.slice(0, 14).filter(function (v) { return v != null; });
      var curAvg = cur14.length ? cur14.reduce(function (t, v) { return t + v; }, 0) / cur14.length : 0;
      var gap = sugAvg - comp14;
      var vs = sugAvg - curAvg;
      var compSource = (compCache && compCache.byDate && Object.keys(compCache.byDate).length) ? 'live SerpApi (' + (compCache.serverTs ? fmtAgo(compCache.serverTs) : 'cached') + ')' : 'demo data — SerpApi will populate on the next daily refresh';
      note.innerHTML =
        '<b>Next 14 nights</b> · ARIA suggests avg <b>£' + Math.round(sugAvg) + '</b> · ' +
        (vs >= 0 ? '<span style="color:#1a6442">+£' + Math.round(vs) + ' vs current BAR</span>' : '<span style="color:#c0362b">−£' + Math.round(-vs) + ' vs current BAR</span>') + ' · ' +
        (gap >= 0 ? '<span style="color:#1a6442">+£' + Math.round(gap) + ' above comp median</span>' : '<span style="color:#c0362b">−£' + Math.round(-gap) + ' below comp median</span>') +
        '<br><span style="opacity:.6;font-size:11px">Comp source: ' + esc(compSource) + '</span>';
    }
  }

  function viewAlfred() {
    var cached = getCachedAlfredBrief();
    var brief = cached && cached.brief ? cached.brief : null;
    var header = hero();          // keep the standard HosREV hero for consistency
    var tabs = viewTabs();
    var body;
    if (!brief) {
      body = (
        '<div class="rv-alf-loading">' +
          '<div style="font-size:48px;margin-bottom:8px">🎩</div>' +
          '<p>ARIA is preparing your morning brief…</p>' +
          '<p style="font-size:12px;opacity:.7">On first run this takes 30–60 seconds while he reads the overnight data.</p>' +
          '<p style="margin-top:16px"><button class="rv-alf-btn" data-rv-alf-refresh>Ask ARIA to begin</button></p>' +
        '</div>'
      );
    } else {
      body = renderAlfredBriefBody(brief);
    }
    return header + tabs + body;
  }

  function render() {
    injectCSS();
    try { snapshotForAccuracy(); reconcileAccuracy(); } catch (e) {}
    try { maybeFetchBooks(); } catch (e) {}
    /* v39 — background fetch ARIA’s materials so the first paint of the tab is instant */
    try { maybeFetchAlerts(); } catch (e) {}
    try { if (UI.view === 'alfred') { maybeFetchAlfredBrief(); maybeFetchScorecard(); maybeFetchLearnings(); } } catch (e) {}
    /* v39.14 — background fetch for 12-month forecast, flash history, team input, morning view, notif users */
    try { if (UI.view === 'twelve')  maybeFetchForecast(); } catch (e) {}
    try { if (UI.view === 'discrep') maybeFetchFlashHist(); } catch (e) {}
    try { if (UI.view === 'team')    maybeFetchTeamInput(); } catch (e) {}
    try { if (UI.view === 'morning') { maybeFetchComp(); maybeFetchBooks(); } } catch (e) {}
    try { if (UI.view === 'settings') maybeFetchNotifUsers(); } catch (e) {}
    var el = $('pf-rev');
    if (!el) return;
    var view = UI.view;
    var html = '<div class="rv-wrap">';
    if (view === 'morning')       html += viewMorning();
    else if (view === 'alfred')       html += viewAlfred();
    else if (view === 'dash')         html += viewDash();
    else if (view === 'agent')    html += viewAgent();
    else if (view === 'calendar') html += viewCalendar();
    else if (view === 'twelve')   html += viewTwelveMonth();
    else if (view === 'bulk')     html += viewBulk();
    else if (view === 'groupq')   html += viewGroupOffer();
    else if (view === 'discrep')  html += viewDiscrepancies();
    else if (view === 'team')     html += viewTeam();
    else if (view === 'market')   html += viewMarket();
    else if (view === 'settings') html += viewSettings();
    html += '</div>';
    el.innerHTML = html;
    if (view === 'market')   setTimeout(function () { drawForecastCharts(); drawTrendChart(); drawThenNowChart(); }, 20);
    if (view === 'agent')    setTimeout(restoreAgentHistory, 20);
    if (view === 'alfred')   setTimeout(function () { try { drawAlfredMarketChart(); } catch (e) {} }, 40);
    if (view === 'twelve')   setTimeout(function () { try { drawTwelveMonthChart(); } catch (e) {} }, 40);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;

    // AI refresh — clear cache and re-ask Gemini
    if (t.closest('[data-rv-ai-refresh]')) {
      try { localStorage.removeItem(AI_CACHE_KEY); } catch (e) {}
      var modeEl = document.getElementById('rv-ai-mode');
      if (modeEl) modeEl.textContent = 'Asking Gemini…';
      render();
      return;
    }

    // Agent — prebuilt question click
    var aq = t.closest('[data-rv-agent-q]');
    if (aq) {
      var key = aq.getAttribute('data-rv-agent-q');
      var parts = key.split('|'); var cat = parts[0]; var i = +parts[1];
      var cats = agentCategories();
      var q = null;
      cats.forEach(function (c) { if (c.name === cat) q = c.items[i]; });
      if (q) askAgent(q.q);
      return;
    }
    // Agent — ask button (free text)
    if (t.closest('[data-rv-agent-ask]')) {
      var ta = document.getElementById('rv-ag-text');
      var q2 = ta && ta.value ? ta.value.trim() : '';
      if (q2) { askAgent(q2); if (ta) ta.value = ''; }
      return;
    }
    // Agent — clear history
    if (t.closest('[data-rv-agent-clear]')) {
      if (confirm('Clear all Agent conversation history?')) {
        try { localStorage.removeItem(AGENT_HIST_KEY); } catch (e) {}
        render();
      }
      return;
    }

    // Events — force refresh via Gemini
    if (t.closest('[data-rv-events-refresh]')) {
      try { localStorage.removeItem(EVENTS_CACHE_KEY); } catch (e) {}
      maybeFetchEvents(true);
      var mel = document.querySelector('#pf-rev .rv-ai-mode');
      if (mel) mel.textContent = 'Researching events via Gemini + Google Search…';
      return;
    }

    // v37: Build/rebuild Day Plan
    if (t.closest('[data-rv-plan-build]')) { try { localStorage.removeItem(PLAN_CACHE_KEY); } catch (e) {} buildDayPlan(); return; }
    // v37: Apply single plan day
    var pa = t.closest('[data-rv-plan-apply]');
    if (pa) { applyPlanDay(+pa.getAttribute('data-rv-plan-apply')); return; }
    if (t.closest('[data-rv-plan-apply-all]')) { applyAllPlanDays(false); return; }
    if (t.closest('[data-rv-plan-apply-weekends]')) { applyAllPlanDays(true); return; }

    // Bulk action
    var ac = t.closest('[data-rv-act]');
    if (ac) { runAction(ac.getAttribute('data-rv-act')); return; }

    // Export CSV
    if (t.closest('[data-rv-csv]')) { exportCsv(); return; }

    // Reset settings to defaults
    if (t.closest('[data-rv-reset]')) {
      if (confirm('Reset all costs, weights and comp weights to the defaults from the brief?')) {
        SETTINGS.commission = 0.14; SETTINGS.variable = 18; SETTINGS.ancillary = 14; SETTINGS.maxDailyChange = 20; SETTINGS.sundayFloor = 65;
        SETTINGS.weights = { comp: 4, forecast: 4, events: 2, pickup: 3 };
        var defs = { coombe: 5, dthilton: 5, windmill: 4, ramada: 4, novotel: 4, chesford: 1, nailcote: 1, mallory: 1 };
        COMP_SET.forEach(function (c) { if (defs[c.id] != null) c.weight = defs[c.id]; });
        persistSettings(); persistCompWeights(); bustCache(); render();
      }
      return;
    }

    // Tab switch
    var vb = t.closest('[data-rv-view]');
    if (vb) { UI.view = vb.getAttribute('data-rv-view'); render(); return; }

    // v39.14 — Forecast rebuild (soft; just re-fetches cached doc)
    if (t.closest('[data-rv-fc-rebuild]')) {
      try { localStorage.removeItem(FORECAST_CACHE_KEY); } catch (e) {}
      var fbBtn = t.closest('[data-rv-fc-rebuild]');
      if (fbBtn) { fbBtn.disabled = true; fbBtn.textContent = 'Refreshing…'; }
      maybeFetchForecast(true);
      setTimeout(function () { if (fbBtn) { fbBtn.disabled = false; fbBtn.textContent = 'Rebuild forecast'; } render(); }, 1200);
      return;
    }
    // v39.14 — Discrepancies refresh
    if (t.closest('[data-rv-flash-refresh]')) {
      try { localStorage.removeItem(FLASH_HIST_CACHE_KEY); } catch (e) {}
      var fBtn = t.closest('[data-rv-flash-refresh]');
      if (fBtn) { fBtn.disabled = true; fBtn.textContent = 'Refreshing…'; }
      maybeFetchFlashHist(true);
      setTimeout(function () { if (fBtn) { fBtn.disabled = false; fBtn.textContent = 'Refresh'; } render(); }, 1200);
      return;
    }
    // v39.14 — Team input refresh
    if (t.closest('[data-rv-team-refresh]')) {
      try { localStorage.removeItem(TEAM_INPUT_CACHE_KEY); } catch (e) {}
      var tBtn = t.closest('[data-rv-team-refresh]');
      var origText = tBtn ? tBtn.textContent : 'Refresh';
      if (tBtn) { tBtn.disabled = true; tBtn.textContent = 'Checking…'; }
      maybeFetchTeamInput(true);
      setTimeout(function () { if (tBtn) { tBtn.disabled = false; tBtn.textContent = origText; } render(); }, 1200);
      return;
    }
    // v39.14 — Morning View refresh comp rates
    if (t.closest('[data-rv-mv-refresh]')) {
      try { localStorage.removeItem(COMP_CACHE_KEY); } catch (e) {}
      var mvBtn = t.closest('[data-rv-mv-refresh]');
      if (mvBtn) { mvBtn.disabled = true; mvBtn.textContent = 'Refreshing…'; }
      maybeFetchComp();
      setTimeout(function () { if (mvBtn) { mvBtn.disabled = false; mvBtn.textContent = 'Refresh comp rates'; } render(); }, 1500);
      return;
    }
    // v39.14 — Morning View one-click approve suggestion
    var mvA = t.closest('[data-rv-mv-approve]');
    if (mvA) {
      var mvDate = mvA.getAttribute('data-rv-mv-approve');
      var mvPrice = +mvA.getAttribute('data-rv-mv-price');
      // Store as a Calendar decision so it flows into the existing decision log
      setDecision('classic_dbl', mvDate, 'apply', mvPrice);
      mvA.disabled = true;
      mvA.textContent = '✓ Set';
      mvA.style.background = '#1a6442';
      return;
    }
    // v39.14 — Bulk Rates save pattern / download CSV / copy for rezlynx
    if (t.closest('[data-rv-bulk-save]')) {
      var pat = getBulkPattern();
      ['mon','tue','wed','thu','fri','sat','sun'].forEach(function (k) {
        var el = document.querySelector('[data-rv-bulk-dow="' + k + '"]');
        if (el) pat[k] = +el.value || pat[k];
      });
      var dEl = document.querySelector('[data-rv-bulk-days]');
      if (dEl) pat.days = +dEl.value || 90;
      var sEl = document.querySelector('[data-rv-bulk-skip]');
      pat.skipEvents = !!(sEl && sEl.checked);
      setBulkPattern(pat);
      render();
      return;
    }
    if (t.closest('[data-rv-bulk-csv]')) {
      var P = getBulkPattern();
      buildNights();
      var batch = NIGHTS.slice(0, Math.max(7, Math.min(365, +P.days || 90))).map(function (n) {
        var dow = (new Date(n.d + 'T00:00:00Z')).getUTCDay();
        var key = ['sun','mon','tue','wed','thu','fri','sat'][dow];
        var newPrice = +P[key] || 0;
        var skip = P.skipEvents && n.eventScore && n.eventScore > 1.5;
        return { d: n.d, dow: dow, newPrice: skip ? '' : newPrice, skip: skip };
      }).filter(function (b) { return !b.skip && b.newPrice > 0; });
      var csv = 'Date,DayOfWeek,RateCode,NewRate\n' + batch.map(function (b) {
        return b.d + ',' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][b.dow] + ',BAR,' + b.newPrice;
      }).join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'brandon-bulk-rates-' + (new Date().toISOString().slice(0, 10)) + '.csv';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      return;
    }
    if (t.closest('[data-rv-bulk-rezlynx]')) {
      var P2 = getBulkPattern();
      buildNights();
      var lines = NIGHTS.slice(0, Math.max(7, Math.min(365, +P2.days || 90))).map(function (n) {
        var dow = (new Date(n.d + 'T00:00:00Z')).getUTCDay();
        var key = ['sun','mon','tue','wed','thu','fri','sat'][dow];
        var newPrice = +P2[key] || 0;
        var skip = P2.skipEvents && n.eventScore && n.eventScore > 1.5;
        if (skip || !newPrice) return null;
        return n.d + '\t' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow] + '\tBAR\t£' + newPrice;
      }).filter(Boolean).join('\n');
      try {
        navigator.clipboard.writeText(lines).then(function () {
          var btn = t.closest('[data-rv-bulk-rezlynx]');
          var orig = btn.textContent;
          btn.textContent = '✓ Copied';
          setTimeout(function () { btn.textContent = orig; }, 1500);
        });
      } catch (e) { alert('Copy failed — use CSV download instead.'); }
      return;
    }
    // v39.14 — Group Offer input changes
    var grpEl = t.closest('[data-rv-grp]');
    if (grpEl) { /* handled by input listener below */ }

    // v39.14 — Notification user: add
    if (t.closest('[data-rv-notif-add]')) {
      var nmEl = document.getElementById('rv-notif-name');
      var emEl = document.getElementById('rv-notif-email');
      var rlEl = document.getElementById('rv-notif-role');
      var payload = {
        name: nmEl ? nmEl.value.trim() : '',
        email: emEl ? emEl.value.trim() : '',
        role: rlEl ? rlEl.value.trim() : '',
        subs: { dailyBrief: true, rateActionBrief: false, watchdog: true, ariaAlerts: false }
      };
      if (!payload.email) { alert('Email is required'); return; }
      var btn = t.closest('[data-rv-notif-add]');
      btn.disabled = true; btn.textContent = 'Adding…';
      postNotifUser(payload).then(function (r) {
        btn.disabled = false; btn.textContent = 'Add user';
        if (!r.ok) { alert('Add failed: ' + (r.error || 'unknown')); return; }
        try { localStorage.removeItem(NOTIF_USERS_CACHE_KEY); } catch (e) {}
        maybeFetchNotifUsers(true);
      });
      return;
    }
    // v39.14 — Notification user: delete
    var nDel = t.closest('[data-rv-notif-del]');
    if (nDel) {
      var em = nDel.getAttribute('data-rv-notif-del');
      if (!confirm('Remove ' + em + ' from the notification list?')) return;
      deleteNotifUser(em).then(function (r) {
        if (!r.ok) { alert('Delete failed: ' + (r.error || 'unknown')); return; }
        try { localStorage.removeItem(NOTIF_USERS_CACHE_KEY); } catch (e) {}
        maybeFetchNotifUsers(true);
      });
      return;
    }
    // v39.14 — Notification user: toggle a subscription
    var tgl = t.closest('[data-rv-notif-toggle]');
    if (tgl) {
      var parts = tgl.getAttribute('data-rv-notif-toggle').split('|');
      var emailT = parts[0], reportKey = parts[1];
      var checked = tgl.checked;
      var c = getCachedNotifUsers();
      var u = c && c.users ? c.users.filter(function (x) { return x.email === emailT; })[0] : null;
      if (!u) return;
      var subs = Object.assign({}, u.subs || {}); subs[reportKey] = checked;
      // Optimistic update
      u.subs = subs;
      setCachedNotifUsers(c);
      postNotifUser({ email: emailT, name: u.name, role: u.role, subs: subs }).then(function (r) {
        if (!r.ok) { alert('Update failed: ' + (r.error || 'unknown')); maybeFetchNotifUsers(true); }
      });
      return;
    }

    /* ---- v39 Alfred handlers ---- */
    // Alfred — refresh the brief (clear cache, re-generate)
    if (t.closest('[data-rv-alf-refresh]')) {
      try { localStorage.removeItem(ALFRED_BRIEF_CACHE_KEY); } catch (e) {}
      ALFRED_BRIEF_INFLIGHT = false;   // v39.1: always allow a click to retry
      // immediate visible feedback so user knows the click landed
      var btn = t.closest('[data-rv-alf-refresh]');
      if (btn) { btn.disabled = true; btn.textContent = 'Asking ARIA…'; }
      var loadEl = document.querySelector('.rv-alf-loading p');
      if (loadEl) loadEl.textContent = 'ARIA is reading your overnight data…';
      refreshAlfredBrief();
      return;
    }
    // Alfred — approve / reject / snooze decision
    var alfDec = t.closest('[data-rv-alf-dec]');
    if (alfDec) {
      var actionId = alfDec.getAttribute('data-rv-alf-dec');
      var state = alfDec.getAttribute('data-rv-alf-state');
      var cached = getCachedAlfredBrief();
      if (!cached || !cached.brief || !cached.brief.brief) return;
      var brief = cached.brief;
      var action = (brief.brief.priority_actions || []).filter(function (a) { return a.id === actionId; })[0];
      if (!action) return;
      setAlfredDecisionLocal(actionId, state, '');
      postAlfredDecision({
        briefId: brief.date, actionId: actionId, actionTitle: action.title,
        category: action.category, date: (action.scope.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
        state: state, note: '', confidence: action.confidence, impact: action.revenue_impact_gbp,
        user: 'Ajay'
      });
      render();
      return;
    }
    // Alfred — open edit input for an action
    var alfEdit = t.closest('[data-rv-alf-edit]');
    if (alfEdit) {
      var editId = alfEdit.getAttribute('data-rv-alf-edit');
      var row = alfEdit.closest('.rv-alf-act');
      if (!row) return;
      var inputHtml = (
        '<div style="margin-top:10px">' +
          '<input class="rv-alf-note-input" type="text" data-rv-alf-note-for="' + esc(editId) + '" placeholder="How would you edit this action? (e.g. &quot;raise £5 not £8&quot;)">' +
          '<div class="rv-alf-btns" style="margin-top:6px">' +
            '<button class="rv-alf-btn approve" data-rv-alf-note-save="' + esc(editId) + '">Save edit</button>' +
            '<button class="rv-alf-btn" data-rv-alf-note-cancel="' + esc(editId) + '">Cancel</button>' +
          '</div>' +
        '</div>'
      );
      var btnWrap = row.querySelector('.rv-alf-btns');
      if (btnWrap) {
        btnWrap.style.display = 'none';
        btnWrap.insertAdjacentHTML('afterend', inputHtml);
        var inp = row.querySelector('[data-rv-alf-note-for="' + editId + '"]');
        if (inp) inp.focus();
      }
      return;
    }
    // Alfred — save edited action
    var alfSave = t.closest('[data-rv-alf-note-save]');
    if (alfSave) {
      var sid = alfSave.getAttribute('data-rv-alf-note-save');
      var inp = document.querySelector('[data-rv-alf-note-for="' + sid + '"]');
      var note = inp ? inp.value.trim() : '';
      var cached2 = getCachedAlfredBrief();
      if (!cached2 || !cached2.brief) return;
      var brief2 = cached2.brief;
      var action2 = (brief2.brief.priority_actions || []).filter(function (a) { return a.id === sid; })[0];
      if (!action2) return;
      setAlfredDecisionLocal(sid, 'edited', note);
      postAlfredDecision({
        briefId: brief2.date, actionId: sid, actionTitle: action2.title,
        category: action2.category, date: (action2.scope.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
        state: 'edited', note: note, editedAction: note,
        confidence: action2.confidence, impact: action2.revenue_impact_gbp, user: 'Ajay'
      });
      render();
      return;
    }
    // Alfred — cancel edit
    var alfCancel = t.closest('[data-rv-alf-note-cancel]');
    if (alfCancel) { render(); return; }
    // Alfred — mark all alerts read
    if (t.closest('[data-rv-alf-alerts-mark-read]')) {
      markAlertsRead('all');
      return;
    }
    // Alfred — download brief as PDF (via browser print dialog with print stylesheet)
    if (t.closest('[data-rv-alf-pdf]')) {
      downloadAlfredPDF();
      return;
    }

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
    // v39.14 — Group Offer input changes (date/rooms/rate/nights)
    var grpKey = t.getAttribute('data-rv-grp');
    if (grpKey) {
      var G = getGroupInput();
      if (grpKey === 'date') G[grpKey] = t.value;
      else G[grpKey] = Math.max(1, parseInt(t.value, 10) || 1);
      setGroupInput(G);
      clearTimeout(editDebounce);
      editDebounce = setTimeout(function () { render(); }, 300);
      return;
    }
  });

  // Override typed-rate input: Enter commits, Esc closes
  document.addEventListener('keydown', function (e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var key = t.getAttribute('data-rv-over-in');
    if (key) {
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
      return;
    }
    // Agent — Cmd/Ctrl+Enter submits the free-text question
    if (t.id === 'rv-ag-text' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      var q = t.value.trim();
      if (q) { askAgent(q); t.value = ''; }
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
