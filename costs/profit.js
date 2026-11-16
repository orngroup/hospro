/* Brandon Hall — profitability layer for the costs dashboard.
   Reads the management accounts already published for the P&L dashboard (../pl/data/*.json),
   so both pages always show the same figures. Nothing here is typed in or estimated. */
(function () {
  'use strict';
  var PL_BASE = '../pl/data/';
  var HASHES = [{"h": "2a15235d452bd22607956b9fe95c08dde007bd3aa905106b16e00c502051b2df", "d": "Ajay Kawa"}, {"h": "7223e827a6f8c47328b8d5b64e83c463743fa5ae27297bd24e1a3809fed8bf0e", "d": "Ajay Kawa"}, {"h": "a63fc66bb686ce407d9bb35b3b4b8dc6df81c98a664060ad31ecd595f10d2505", "d": "Ajay Kawa"}, {"h": "32d122b94d307fc19250805e78cf9f18fb174812daa6380b68217b7cc30f9499", "d": "Raj Kumar"}, {"h": "b16d51f62f7c3e11376bd4ec62c9e3d0b8a7e6e46ccf269c8ed463a0b590f87c", "d": "Raj Kumar"}, {"h": "e2aa732eaab85363a2d666db0277d99207592a0548e6166256b2ad4a8a42d450", "d": "Raj Kumar"}, {"h": "417609bca4690342f827a904e58fdb5230b94b8ff0bc359302851e48bf7d0400", "d": "Alia Taub"}, {"h": "395e4898e55a1096e77ad3ca70849a8e6f8bc0806cff66ce4ede7a4126adf7f5", "d": "Alia Taub"}, {"h": "29e37fa09b9fe3f22f67899a4fa4697c86c50ac047c2188cc59d3739f85357aa", "d": "Alia Taub"}];
  var SKEY = 'bhpl_user';
  var M = {}, IDS = [], LABEL = {}, loaded = false, loadErr = null;
  var sel = { month: null, cmp: 'budget' };
  var charts = {};
  var PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gbp(n, dp) { if (n === null || n === undefined || isNaN(n)) return '–'; return (n < 0 ? '−' : '') + '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function num(n, dp) { if (n === null || n === undefined || isNaN(n)) return '–'; return n.toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function pc(n, dp) { if (n === null || n === undefined || !isFinite(n)) return '–'; return (n * 100).toFixed(dp === undefined ? 1 : dp) + '%'; }
  function short(id) { var p = id.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+p[1] - 1] + ' ' + p[0].slice(2); }

  /* ---------- reading the accounts ---------- */
  function row(rows, label) { for (var i = 0; i < rows.length; i++) if (!rows[i].head && rows[i].label.trim() === label) return rows[i]; return null; }
  function sect(rows, head) { // rows between a heading and the next heading
    var out = [], on = false;
    rows.forEach(function (r) { if (r.head) { on = r.label.trim() === head; return; } if (/^TOTAL PAYROLL$/.test(r.label.trim())) on = false; if (on) out.push(r); });
    return out;
  }
  function ids() { return sel.month === 'all' ? IDS : [sel.month]; }
  function prevId() { var i = IDS.indexOf(sel.month); return i > 0 ? IDS[i - 1] : null; }
  // v(path fn, label, field) summed over the selected month(s)
  function V(get, label, f, list) {
    var s = 0, any = false;
    (list || ids()).forEach(function (id) { var r = row(get(M[id]), label); if (r && typeof r[f || 'ma'] === 'number') { s += r[f || 'ma']; any = true; } });
    return any ? s : null;
  }
  var PLs = function (d) { return d.pl; }, RM = function (d) { return d.depts.Rooms; }, FB = function (d) { return d.depts['F&B']; },
    LE = function (d) { return d.depts.Leisure; }, OO = function (d) { return d.depts.Other; }, PAY = function (d) { return d.payroll; }, FX = function (d) { return d.fixed; };
  function U(k) { return function (d) { return d.undist[k]; }; }
  function A(get, label, list) { return V(get, label, 'ma', list); }
  function B(get, label, list) { return V(get, label, 'mb', list); }
  function P(get, label) { var p = prevId(); return p ? V(get, label, 'ma', [p]) : null; }

  /* ---------- small render helpers ---------- */
  function varCell(a, b, costLine) {
    if (a === null || b === null) return '<td class="n">–</td>';
    var d = a - b, good = costLine ? d <= 0 : d >= 0;
    if (Math.abs(d) < 0.5) return '<td class="n">–</td>';
    return '<td class="n"><span class="' + (good ? 'down' : 'up') + '">' + (d > 0 ? '+' : '−') + gbp(Math.abs(d)).replace('−', '') + '</span></td>';
  }
  function tile(l, v, d) { return '<div class="tile"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + (d || '') + '</div></div>'; }
  function vs(a, b, costLine, label) {
    if (a === null || b === null || !b) return '';
    var d = a - b, good = costLine ? d <= 0 : d >= 0;
    return '<span class="' + (good ? 'down' : 'up') + '">' + (d >= 0 ? '+' : '−') + gbp(Math.abs(d)).replace('−', '') + '</span> vs ' + label + ' (' + gbp(b) + ')';
  }
  function cmpLabel() { return sel.cmp === 'budget' ? 'budget' : (prevId() ? short(prevId()) : 'previous month'); }
  function C(get, label) { return sel.cmp === 'budget' ? B(get, label) : P(get, label); }
  function mk(id, cfg) { if (charts[id]) charts[id].destroy(); if ($(id)) charts[id] = new Chart($(id), cfg); }
  function legend(id, names, cols) { $(id).innerHTML = names.map(function (n, i) { return '<span><i style="background:' + cols[i] + '"></i>' + esc(n) + '</span>'; }).join(''); }
  var GRID = { color: '#ebe9e3', drawTicks: false }, NOGRID = { display: false };
  function money(v) { return Math.abs(v) >= 10000 ? (v < 0 ? '−' : '') + '£' + Math.abs(v / 1000).toFixed(0) + 'K' : (v < 0 ? '−£' : '£') + Math.abs(v).toLocaleString('en-GB'); }
  function lineChart(id, legId, series, fmt, zero) {
    var ds = series.map(function (s, i) { return { label: s[0], data: s[1], borderColor: PAL[i], backgroundColor: PAL[i], borderWidth: 2, pointRadius: 4, pointBorderColor: '#fcfcfb', pointBorderWidth: 2 }; });
    if (legId) legend(legId, ds.map(function (d) { return d.label; }), ds.map(function (d) { return d.borderColor; }));
    mk(id, { type: 'line', data: { labels: IDS.map(short), datasets: ds }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + fmt(c.parsed.y); } } } },
      scales: { x: { grid: NOGRID }, y: { beginAtZero: zero !== false, grid: GRID, border: { display: false }, ticks: { callback: fmt } } } } });
  }
  function stackChart(id, legId, series) {
    var ds = series.map(function (s, i) { return { label: s[0], data: s[1].map(Math.round), backgroundColor: PAL[i], borderColor: '#fcfcfb', borderWidth: { top: 1, bottom: 1, left: 0, right: 0 }, borderRadius: 2, maxBarThickness: 34 }; });
    legend(legId, ds.map(function (d) { return d.label; }), ds.map(function (d) { return d.backgroundColor; }));
    mk(id, { type: 'bar', data: { labels: IDS.map(short), datasets: ds }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + gbp(c.parsed.y); }, footer: function (it) { var t = 0; it.forEach(function (i) { t += i.parsed.y; }); return 'Total: ' + gbp(t); } } } },
      scales: { x: { stacked: true, grid: NOGRID }, y: { stacked: true, grid: GRID, border: { display: false }, ticks: { callback: money } } } } });
  }
  function per(get, label) { return IDS.map(function (id) { return A(get, label, [id]) || 0; }); }

  /* ---------- controls ---------- */
  function controls() {
    var o = IDS.map(function (id) { return '<option value="' + id + '"' + (id === sel.month ? ' selected' : '') + '>' + esc(LABEL[id]) + '</option>'; }).join('') +
      '<option value="all"' + (sel.month === 'all' ? ' selected' : '') + '>' + short(IDS[0]) + ' to ' + short(IDS[IDS.length - 1]) + ' (cumulative)</option>';
    var h = '<div class="filters"><label>Period<select class="pf-month">' + o + '</select></label>' +
      '<label>Compare with<select class="pf-cmp"><option value="budget"' + (sel.cmp === 'budget' ? ' selected' : '') + '>Budget</option><option value="prev"' + (sel.cmp === 'prev' ? ' selected' : '') + (sel.month === 'all' ? ' disabled' : '') + '>Previous month</option></select></label>' +
      '<span class="note" style="margin:0 0 6px">Source: management accounts, as shown on the P&amp;L dashboard. Accounts are loaded to ' + esc(LABEL[IDS[IDS.length - 1]]) + '. No prior-year figures exist — the accounts begin in ' + esc(LABEL[IDS[0]]) + '.</span></div>';
    return h;
  }

  /* ---------- PROFITABILITY ---------- */
  function renderProfit() {
    var rev = A(PLs, 'TOTAL REVENUE'), goi = A(PLs, 'GROSS OPERATING INCOME'), gop = A(PLs, 'GROSS OPERATING PROFIT'), eb = A(PLs, 'EBITDA'), nop = A(PLs, 'Net Operating Profit'), pay = A(PLs, 'Total Manning');
    var cl = cmpLabel();
    var h = controls() + '<div class="tiles">' +
      tile('Total revenue', gbp(rev), vs(rev, C(PLs, 'TOTAL REVENUE'), false, cl)) +
      tile('Departmental profit', gbp(goi), vs(goi, C(PLs, 'GROSS OPERATING INCOME'), false, cl)) +
      tile('Gross operating profit', gbp(gop), vs(gop, C(PLs, 'GROSS OPERATING PROFIT'), false, cl)) +
      tile('EBITDA', gbp(eb), vs(eb, C(PLs, 'EBITDA'), false, cl)) +
      tile('Net operating profit', gbp(nop), pc(nop / rev) + ' of revenue') +
      tile('Payroll', gbp(pay), pc(pay / rev) + ' of revenue · ' + vs(pay, C(PLs, 'Total Manning'), true, cl)) + '</div>';

    // departments
    var D = [
      { n: 'Rooms', rev: A(RM, 'TOTAL ROOM REVENUE'), bud: B(RM, 'TOTAL ROOM REVENUE'), cos: null, lab: A(RM, 'TOTAL STAFF COSTS'), oth: A(RM, 'TOTAL OTHER EXPENSES'), prof: A(RM, 'NET ROOMS PROFIT'), bprof: B(RM, 'NET ROOMS PROFIT'), pprof: P(RM, 'NET ROOMS PROFIT') },
      { n: 'Food & beverage', rev: A(FB, 'TOTAL F&B REVENUE'), bud: B(FB, 'TOTAL F&B REVENUE'), cos: A(FB, 'TOTAL COST OF SALES'), lab: A(FB, 'TOTAL STAFF COSTS'), oth: A(FB, 'TOTAL OTHER EXPENSES'), prof: A(FB, 'NET F&B PROFIT'), bprof: B(FB, 'NET F&B PROFIT'), pprof: P(FB, 'NET F&B PROFIT') },
      { n: 'Food (restaurant, breakfast, events)', sub: 1, rev: A(FB, 'TOTAL FOOD REVENUE'), bud: B(FB, 'TOTAL FOOD REVENUE'), cos: A(FB, 'Cost of Food Sales') },
      { n: 'Beverage (bar)', sub: 1, rev: A(FB, 'TOTAL BEVERAGE REVENUE'), bud: B(FB, 'TOTAL BEVERAGE REVENUE'), cos: A(FB, 'Cost of Beverage Sales') },
      { n: 'Conference room hire and other', sub: 1, rev: A(FB, 'TOTAL F&B OTHER REVENUE'), bud: B(FB, 'TOTAL F&B OTHER REVENUE'), cos: A(FB, 'Cost of Other F&B Revenue') },
      { n: 'Leisure', rev: A(LE, 'TOTAL LEISURE REVENUE'), bud: B(LE, 'TOTAL LEISURE REVENUE'), cos: null, lab: 0, oth: A(LE, 'TOTAL LEISURE EXPENSES'), prof: A(LE, 'NET LEISURE PROFIT'), bprof: B(LE, 'NET LEISURE PROFIT'), pprof: P(LE, 'NET LEISURE PROFIT') },
      { n: 'Other income', rev: A(OO, 'TOTAL OTHER OPERATED DEPARTMENTS REVENUE'), bud: B(OO, 'TOTAL OTHER OPERATED DEPARTMENTS REVENUE'), cos: null, lab: 0, oth: 0, prof: A(OO, 'NET OTHER OPERATED DEPARTMENTS PROFIT'), bprof: B(OO, 'NET OTHER OPERATED DEPARTMENTS PROFIT'), pprof: P(OO, 'NET OTHER OPERATED DEPARTMENTS PROFIT') }
    ];
    var cp = sel.cmp === 'budget' ? 'Budget profit' : short(prevId() || IDS[0]) + ' profit';
    h += '<div class="card"><h2>Departments: revenue against costs</h2><p class="sub">' + (sel.month === 'all' ? 'Cumulative ' + short(IDS[0]) + ' to ' + short(IDS[IDS.length - 1]) : esc(LABEL[sel.month])) + ' · gross profit = revenue less cost of sales; departmental profit = gross profit less labour and other departmental expenses</p><div class="scroll"><table>' +
      '<tr><th>Department</th><th class="n">Revenue</th><th class="n">Budget revenue</th><th class="n">Cost of sales</th><th class="n">Gross profit</th><th class="n">GP %</th><th class="n">Labour</th><th class="n">Labour % revenue</th><th class="n">Other expenses</th><th class="n">Departmental profit</th><th class="n">Margin</th><th class="n">' + cp + '</th><th class="n">Variance</th></tr>';
    D.forEach(function (d) {
      var gp = d.cos === null ? null : d.rev - d.cos, cmpP = sel.cmp === 'budget' ? d.bprof : d.pprof;
      h += '<tr' + (d.sub ? ' style="color:#52514e"' : '') + '><td>' + (d.sub ? '&nbsp;&nbsp;&nbsp;' + esc(d.n) : '<b>' + esc(d.n) + '</b>') + '</td><td class="n">' + gbp(d.rev) + '</td><td class="n">' + gbp(d.bud) + '</td><td class="n">' + (d.cos === null ? '–' : gbp(d.cos)) + '</td><td class="n">' + (gp === null ? '–' : gbp(gp)) + '</td><td class="n">' + (gp === null || !d.rev ? '–' : pc(gp / d.rev)) + '</td>' +
        (d.sub ? '<td class="n" colspan="2" style="color:#86847d">shared — see Labour</td><td class="n">–</td><td class="n">–</td><td class="n">–</td><td class="n">–</td><td class="n">–</td>' :
          '<td class="n">' + gbp(d.lab) + '</td><td class="n">' + (d.rev && d.lab ? pc(d.lab / d.rev) : '–') + '</td><td class="n">' + gbp(d.oth) + '</td><td class="n"><b>' + gbp(d.prof) + '</b></td><td class="n">' + (d.rev ? pc(d.prof / d.rev) : '–') + '</td><td class="n">' + gbp(cmpP) + '</td>' + varCell(d.prof, cmpP)) + '</tr>';
    });
    h += '<tr class="tot"><td>Total departments</td><td class="n">' + gbp(rev) + '</td><td class="n">' + gbp(B(PLs, 'TOTAL REVENUE')) + '</td><td class="n" colspan="6"></td><td class="n">' + gbp(goi) + '</td><td class="n">' + pc(goi / rev) + '</td><td class="n">' + gbp(C(PLs, 'GROSS OPERATING INCOME')) + '</td>' + varCell(goi, C(PLs, 'GROSS OPERATING INCOME')) + '</tr></table></div>';
    var ev = (A(FB, 'Food Revenue - M&E') || 0) + (A(FB, 'Beverage Revenue - M&E') || 0) + (A(FB, 'Food Revenue - Teas & Coffees') || 0) + (A(FB, 'Conference Room Hire') || 0);
    var evb = (B(FB, 'Food Revenue - M&E') || 0) + (B(FB, 'Beverage Revenue - M&E') || 0) + (B(FB, 'Food Revenue - Teas & Coffees') || 0) + (B(FB, 'Conference Room Hire') || 0);
    h += '<p class="note"><b>Meetings and events</b> are not a separate department in the accounts. Their revenue (M&amp;E food and drink, teas and coffees, room hire) was <b>' + gbp(ev) + '</b> against a budget of ' + gbp(evb) + '; their costs sit inside Food &amp; beverage. Restaurant and bar are reported together as F&amp;B: food and drink gross profit can be separated, but holiday pay, employer costs and other expenses are shared.</p></div>';

    h += '<div class="grid g2"><div class="card"><h2>Revenue by department</h2><p class="sub">Actual, by month</p><div class="legend" id="pf-l1"></div><div class="chartbox"><canvas id="pf-c1"></canvas></div></div>' +
      '<div class="card"><h2>Profit by month</h2><p class="sub">Rooms and F&amp;B departmental profit, and hotel EBITDA</p><div class="legend" id="pf-l2"></div><div class="chartbox"><canvas id="pf-c2"></canvas></div></div></div>';

    // whole hotel
    var L = [
      ['Total revenue', PLs, 'TOTAL REVENUE', 0, 1], ['Rooms profit', PLs, 'Rooms', 0], ['Food & beverage profit', PLs, 'F & B', 0], ['Leisure profit', PLs, 'Leisure', 0], ['Other income', PLs, 'Other Hotel Revenue', 0],
      ['Departmental profit', PLs, 'GROSS OPERATING INCOME', 0, 1],
      ['Administration and general', PLs, 'A & G', 1], ['Sales and marketing', PLs, 'S & M', 1], ['Utilities', PLs, 'Utilities', 1], ['Repairs and maintenance', PLs, 'R & M', 1],
      ['Gross operating profit', PLs, 'GROSS OPERATING PROFIT', 0, 1],
      ['Insurance', PLs, 'Insurance', 1], ['Property tax', PLs, 'Property Tax', 1], ['Other fixed and exceptional items', PLs, 'Other Fixed Costs', 1], ['Rent', PLs, 'Rent', 1],
      ['EBITDA', PLs, 'EBITDA', 0, 1], ['FF&E reserve', PLs, 'FF&E  Reserve', 1], ['Management fee', PLs, 'Total Management Fee', 1], ['Net operating profit', PLs, 'Net Operating Profit', 0, 1]
    ];
    h += '<div class="card"><h2>Whole hotel: from revenue to net operating profit</h2><p class="sub">Including utilities, maintenance, insurance and other overheads</p><div class="scroll"><table><tr><th>Line</th><th class="n">Actual</th><th class="n">% of revenue</th><th class="n">Budget</th><th class="n">vs budget</th>' + (sel.month !== 'all' && prevId() ? '<th class="n">' + short(prevId()) + '</th><th class="n">vs ' + short(prevId()) + '</th>' : '') + '</tr>';
    L.forEach(function (l) {
      var a = A(l[1], l[2]), b = B(l[1], l[2]), p = P(l[1], l[2]);
      h += '<tr' + (l[4] ? ' class="tot"' : '') + '><td>' + (l[4] ? '' : '&nbsp;&nbsp;&nbsp;') + esc(l[0]) + '</td><td class="n">' + gbp(a) + '</td><td class="n">' + (rev ? pc(a / rev) : '–') + '</td><td class="n">' + gbp(b) + '</td>' + varCell(a, b, l[3]) + (sel.month !== 'all' && prevId() ? '<td class="n">' + gbp(p) + '</td>' + varCell(a, p, l[3]) : '') + '</tr>';
    });
    h += '</table></div></div>';

    // biggest overhead lines
    var ov = [];
    ['A&G', 'S&M', 'R&M', 'Utilities'].forEach(function (k) {
      var seen = {}; ids().forEach(function (id) { M[id].undist[k].forEach(function (r) { if (!r.head && !/^TOTAL|CPOR|%/.test(r.label.trim())) seen[r.label.trim()] = 1; }); });
      Object.keys(seen).forEach(function (lab) { ov.push([k, lab, A(U(k), lab) || 0, B(U(k), lab) || 0]); });
    });
    ov.push(['Rooms', 'Rooms - Commissions (travel agents and OTAs)', A(RM, 'Rooms - Commissions') || 0, B(RM, 'Rooms - Commissions') || 0]);
    ['FIX - Rent', 'FIX - Property Tax', 'FIX - Insurance', 'FIX - Management Fees'].forEach(function (l) { ov.push(['Fixed', l, A(FX, l) || 0, B(FX, l) || 0]); });
    ov.sort(function (a, b) { return b[2] - a[2]; });
    h += '<div class="card"><h2>Largest overhead lines</h2><p class="sub">Utilities, maintenance, commissions, insurance and other overheads, largest first</p><div class="scroll" style="max-height:440px"><table><tr><th>Area</th><th>Line</th><th class="n">Actual</th><th class="n">Budget</th><th class="n">vs budget</th></tr>' +
      ov.slice(0, 18).map(function (o) { return '<tr><td>' + o[0] + '</td><td>' + esc(o[1].replace(/^(A&G|S&M|POM|U|FIX|Rooms) - /, '')) + '</td><td class="n">' + gbp(o[2]) + '</td><td class="n">' + gbp(o[3]) + '</td>' + varCell(o[2], o[3], 1) + '</tr>'; }).join('') + '</table></div></div>';

    $('pf-profit').innerHTML = h;
    stackChart('pf-c1', 'pf-l1', [['Rooms', per(PLs, 'Rooms - Revenue')], ['Food & beverage', per(PLs, 'F & B - Revenue')], ['Leisure', per(PLs, 'Leisure - Revenue')], ['Other', per(PLs, 'Other Hotel Revenue - Revenue')]]);
    lineChart('pf-c2', 'pf-l2', [['Rooms profit', per(PLs, 'Rooms')], ['F&B profit', per(PLs, 'F & B')], ['EBITDA', per(PLs, 'EBITDA')]], money, false);
  }

  /* ---------- LABOUR ---------- */
  var PSEC = [['ROOMS', 'Rooms', 'Rooms - Revenue'], ['F&B', 'Food & beverage', 'F & B - Revenue'], ['A&G', 'Administration', null], ['S&M', 'Sales & marketing', null], ['POM', 'Maintenance', null]];
  function secTotal(head, f, list) {
    var s = 0; (list || ids()).forEach(function (id) { sect(M[id].payroll, head).forEach(function (r) { if (/^TOTAL (STAFF COSTS|A&G)$/.test(r.label.trim()) && typeof r[f] === 'number') s += r[f]; }); });
    return s;
  }
  function secLines(head) {
    var seen = [], out = [];
    ids().forEach(function (id) { sect(M[id].payroll, head).forEach(function (r) { var l = r.label.trim(); if (/^TOTAL|%|CPOR|CPAR/.test(l)) return; if (seen.indexOf(l) === -1) seen.push(l); }); });
    seen.forEach(function (l) {
      var a = 0, b = 0, p = 0;
      ids().forEach(function (id) { sect(M[id].payroll, head).forEach(function (r) { if (r.label.trim() === l) { a += r.ma || 0; b += r.mb || 0; } }); });
      if (prevId()) sect(M[prevId()].payroll, head).forEach(function (r) { if (r.label.trim() === l) p += r.ma || 0; });
      out.push([l, a, b, p]);
    });
    return out;
  }
  function renderLabour() {
    var rev = A(PLs, 'TOTAL REVENUE'), pay = A(PAY, 'TOTAL PAYROLL'), payB = B(PAY, 'TOTAL PAYROLL'), cl = cmpLabel();
    var ot = 0, cas = 0, sal = 0, on = 0, agency = 0;
    PSEC.forEach(function (s) { secLines(s[0]).forEach(function (l) { if (/Contract/.test(l[0])) agency += l[1]; else if (/Overtime/.test(l[0])) ot += l[1]; else if (/Casual/.test(l[0])) cas += l[1]; else if (/National Insurance|Pension|Holiday/.test(l[0])) on += l[1]; else if (/Salaried|Wages|Management|Finance/.test(l[0])) sal += l[1]; }); });
    var h = controls() + '<div class="tiles">' +
      tile('Total payroll', gbp(pay), vs(pay, sel.cmp === 'budget' ? payB : P(PAY, 'TOTAL PAYROLL'), true, cl)) +
      tile('Payroll as % of revenue', pc(pay / rev), 'budget ' + pc(payB / B(PLs, 'TOTAL REVENUE'))) +
      tile('Salaried wages', gbp(sal), pc(sal / pay) + ' of payroll') +
      tile('Casual wages', gbp(cas), pc(cas / pay) + ' of payroll') +
      tile('Overtime', gbp(ot), 'paid as overtime in the accounts') +
      tile('Employer costs', gbp(on), 'National Insurance, pension, holiday pay') +
      tile('Agency and contract labour', gbp(agency), 'contracted housekeeping, kitchen and sales') + '</div>';

    h += '<div class="card"><h2>Labour cost by department</h2><p class="sub">Actual against budget, and as a share of the department’s revenue</p><div class="scroll"><table><tr><th>Department</th><th class="n">Actual</th><th class="n">Budget</th><th class="n">vs budget</th><th class="n">Department revenue</th><th class="n">Labour % revenue</th><th class="n">Budget %</th>' + (sel.month !== 'all' && prevId() ? '<th class="n">' + short(prevId()) + '</th>' : '') + '</tr>';
    PSEC.forEach(function (s) {
      var a = secTotal(s[0], 'ma'), b = secTotal(s[0], 'mb'), r = s[2] ? A(PLs, s[2]) : null, rb = s[2] ? B(PLs, s[2]) : null;
      h += '<tr><td><b>' + s[1] + '</b></td><td class="n">' + gbp(a) + '</td><td class="n">' + gbp(b) + '</td>' + varCell(a, b, 1) + '<td class="n">' + (r === null ? '–' : gbp(r)) + '</td><td class="n">' + (r ? pc(a / r) : '–') + '</td><td class="n">' + (rb ? pc(b / rb) : '–') + '</td>' + (sel.month !== 'all' && prevId() ? '<td class="n">' + gbp(secTotal(s[0], 'ma', [prevId()])) + '</td>' : '') + '</tr>';
    });
    h += '<tr class="tot"><td>Total payroll</td><td class="n">' + gbp(pay) + '</td><td class="n">' + gbp(payB) + '</td>' + varCell(pay, payB, 1) + '<td class="n">' + gbp(rev) + '</td><td class="n">' + pc(pay / rev) + '</td><td class="n">' + pc(payB / B(PLs, 'TOTAL REVENUE')) + '</td>' + (sel.month !== 'all' && prevId() ? '<td class="n">' + gbp(P(PAY, 'TOTAL PAYROLL')) + '</td>' : '') + '</tr></table></div></div>';

    h += '<div class="grid g2"><div class="card"><h2>Payroll by department</h2><p class="sub">Actual, by month</p><div class="legend" id="pf-l3"></div><div class="chartbox"><canvas id="pf-c3"></canvas></div></div>' +
      '<div class="card"><h2>Payroll as % of revenue</h2><p class="sub">Whole hotel, Rooms and F&amp;B, by month</p><div class="legend" id="pf-l4"></div><div class="chartbox"><canvas id="pf-c4"></canvas></div></div></div>';

    h += '<div class="card"><h2>Every payroll line</h2><p class="sub">Wages by team and type, overtime, and employer costs — as analysed in the accounts</p><div class="scroll"><table><tr><th>Line</th><th class="n">Actual</th><th class="n">Budget</th><th class="n">vs budget</th>' + (sel.month !== 'all' && prevId() ? '<th class="n">' + short(prevId()) + '</th><th class="n">vs ' + short(prevId()) + '</th>' : '') + '</tr>';
    PSEC.forEach(function (s) {
      var lines = secLines(s[0]); if (!lines.length) return;
      h += '<tr><td colspan="6" style="background:#f5f4f0;font-weight:600">' + s[1] + '</td></tr>';
      lines.forEach(function (l) { if (!l[1] && !l[2] && !l[3]) return; h += '<tr><td>&nbsp;&nbsp;&nbsp;' + esc(l[0].replace(/^(Rooms|F&B|A&G|S&M|POM) - /, '')) + '</td><td class="n">' + gbp(l[1]) + '</td><td class="n">' + gbp(l[2]) + '</td>' + varCell(l[1], l[2], 1) + (sel.month !== 'all' && prevId() ? '<td class="n">' + gbp(l[3]) + '</td>' + varCell(l[1], l[3], 1) : '') + '</tr>'; });
    });
    h += '</table></div><p class="note"><b>Staff hours are not in the accounts</b> — they hold pounds, not hours. Actual hours, lateness and overtime hours by department will come from the HosTIME clock-ins and the approved rota once HosTIME is live; they can then be added here as hours, cost per hour and revenue per labour hour.</p></div>';

    $('pf-labour').innerHTML = h;
    stackChart('pf-c3', 'pf-l3', PSEC.map(function (s) { return [s[1], IDS.map(function (id) { return secTotal(s[0], 'ma', [id]); })]; }));
    var pcs = function (num, den) { return IDS.map(function (id, i) { return den[i] ? +(num[i] / den[i] * 100).toFixed(1) : null; }); };
    lineChart('pf-c4', 'pf-l4', [['Whole hotel', pcs(per(PAY, 'TOTAL PAYROLL'), per(PLs, 'TOTAL REVENUE'))], ['Rooms', pcs(IDS.map(function (id) { return secTotal('ROOMS', 'ma', [id]); }), per(PLs, 'Rooms - Revenue'))], ['Food & beverage', pcs(IDS.map(function (id) { return secTotal('F&B', 'ma', [id]); }), per(PLs, 'F & B - Revenue'))]], function (v) { return v + '%'; });
  }

  /* ---------- KPIs ---------- */
  function renderKpi() {
    var occ = A(PLs, 'Rooms Occupied'), av = A(PLs, 'Rooms Available'), sl = A(PLs, 'Sleepers'), rr = A(RM, 'TOTAL ROOM REVENUE'), fb = A(FB, 'TOTAL F&B REVENUE'), tr = A(PLs, 'TOTAL REVENUE');
    var occB = B(PLs, 'Rooms Occupied'), avB = B(PLs, 'Rooms Available'), slB = B(PLs, 'Sleepers'), rrB = B(RM, 'TOTAL ROOM REVENUE'), fbB = B(FB, 'TOTAL F&B REVENUE');
    var h = controls().replace('<label>Compare with', '<label style="display:none">Compare with') + '<div class="tiles">' +
      tile('Occupancy', pc(occ / av), 'budget ' + pc(occB / avB)) + tile('Rooms sold', num(occ), 'budget ' + num(occB)) + tile('Sleepers', num(sl), 'budget ' + num(slB)) +
      tile('Average daily rate', gbp(rr / occ, 2), 'budget ' + gbp(rrB / occB, 2)) + tile('RevPAR', gbp(rr / av, 2), 'budget ' + gbp(rrB / avB, 2)) +
      tile('F&B spend per occupied room', gbp(fb / occ, 2), 'budget ' + gbp(fbB / occB, 2)) + tile('F&B spend per guest', gbp(fb / sl, 2), 'budget ' + gbp(fbB / slB, 2)) +
      tile('Rooms cost per occupied room', gbp(A(RM, 'TOTAL ROOMS EXPENSES') / occ, 2), 'budget ' + gbp(B(RM, 'TOTAL ROOMS EXPENSES') / occB, 2)) + '</div>';

    var one = function (get, lab) { return function (id) { return A(get, lab, [id]); }; };
    var div = function (a, b) { return function (id) { var x = a(id), y = b(id); return y ? x / y : null; }; };
    var cov = function (id) { return (A(FB, 'Covers - Breakfast', [id]) || 0) + (A(FB, 'Covers - Lunch', [id]) || 0) + (A(FB, 'Covers - Dinner', [id]) || 0) + (A(FB, 'Covers - M&E', [id]) || 0); };
    var K = [
      ['Rooms', null],
      ['Rooms available', one(PLs, 'Rooms Available'), num], ['Rooms sold', one(PLs, 'Rooms Occupied'), num], ['Rooms out of order', one(PLs, 'Rooms Out of Order'), num],
      ['Occupancy', div(one(PLs, 'Rooms Occupied'), one(PLs, 'Rooms Available')), pc], ['Sleepers', one(PLs, 'Sleepers'), num],
      ['Guests per occupied room', div(one(PLs, 'Sleepers'), one(PLs, 'Rooms Occupied')), function (v) { return num(v, 2); }],
      ['Average daily rate', div(one(RM, 'TOTAL ROOM REVENUE'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['RevPAR', div(one(RM, 'TOTAL ROOM REVENUE'), one(PLs, 'Rooms Available')), function (v) { return gbp(v, 2); }],
      ['Total revenue per available room', div(one(PLs, 'TOTAL REVENUE'), one(PLs, 'Rooms Available')), function (v) { return gbp(v, 2); }],
      ['Gross operating profit per available room', div(one(PLs, 'GROSS OPERATING PROFIT'), one(PLs, 'Rooms Available')), function (v) { return gbp(v, 2); }],
      ['Food and beverage', null],
      ['F&B spend per occupied room', div(one(FB, 'TOTAL F&B REVENUE'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['F&B spend per guest', div(one(FB, 'TOTAL F&B REVENUE'), one(PLs, 'Sleepers')), function (v) { return gbp(v, 2); }],
      ['Breakfast covers recorded', one(FB, 'Covers - Breakfast'), num], ['Dinner covers recorded', one(FB, 'Covers - Dinner'), num], ['All covers recorded', cov, num],
      ['Food gross profit %', function (id) { var r = A(FB, 'TOTAL FOOD REVENUE', [id]), c = A(FB, 'Cost of Food Sales', [id]); return r ? (r - c) / r : null; }, pc],
      ['Beverage gross profit %', function (id) { var r = A(FB, 'TOTAL BEVERAGE REVENUE', [id]), c = A(FB, 'Cost of Beverage Sales', [id]); return r ? (r - c) / r : null; }, pc],
      ['Cost per occupied room', null],
      ['All rooms department costs', div(one(RM, 'TOTAL ROOMS EXPENSES'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['Rooms payroll', div(one(RM, 'TOTAL STAFF COSTS'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['Laundry and linen', div(one(RM, 'Rooms - Laundry'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['Cleaning materials', div(one(RM, 'Rooms - Cleaning Materials'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['Guest supplies', div(one(RM, 'Rooms - Guest Supplies'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['Commissions', div(one(RM, 'Rooms - Commissions'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }],
      ['Utilities', div(one(U('Utilities'), 'TOTAL UTILITIES'), one(PLs, 'Rooms Occupied')), function (v) { return gbp(v, 2); }]
    ];
    h += '<div class="card"><h2>Operational KPIs by month</h2><p class="sub">Calculated from the rooms, sleepers, covers and revenue in the accounts</p><div class="scroll"><table><tr><th>Measure</th>' + IDS.map(function (id) { return '<th class="n">' + short(id) + '</th>'; }).join('') + '</tr>';
    K.forEach(function (k) {
      if (!k[1]) { h += '<tr><td colspan="' + (IDS.length + 1) + '" style="background:#f5f4f0;font-weight:600">' + k[0] + '</td></tr>'; return; }
      h += '<tr><td>' + k[0] + '</td>' + IDS.map(function (id) { var v = k[1](id); return '<td class="n">' + (v === null || v === undefined ? '–' : k[2](v)) + '</td>'; }).join('') + '</tr>';
    });
    h += '</table></div><p class="note"><b>Restaurant covers look under-recorded.</b> In ' + esc(LABEL[IDS[IDS.length - 1]]) + ' the accounts show ' + num(A(FB, 'Covers - Breakfast', [IDS[IDS.length - 1]])) + ' breakfast covers against ' + num(A(PLs, 'Sleepers', [IDS[IDS.length - 1]])) + ' sleepers, so spend per cover is not reliable yet. Covers need to come from the till or the HosF&amp;B order pad.</p></div>';
    h += '<div class="grid g2"><div class="card"><h2>Occupancy</h2><p class="sub">Rooms sold ÷ rooms available, %</p><div class="chartbox"><canvas id="pf-c5"></canvas></div></div>' +
      '<div class="card"><h2>Average daily rate and RevPAR</h2><p class="sub">£ per room</p><div class="legend" id="pf-l6"></div><div class="chartbox"><canvas id="pf-c6"></canvas></div></div></div>';
    $('pf-kpi').innerHTML = h;
    var o = per(PLs, 'Rooms Occupied'), a2 = per(PLs, 'Rooms Available'), r2 = per(RM, 'TOTAL ROOM REVENUE');
    lineChart('pf-c5', null, [['Occupancy', o.map(function (x, i) { return a2[i] ? +(x / a2[i] * 100).toFixed(1) : null; })]], function (v) { return v + '%'; });
    lineChart('pf-c6', 'pf-l6', [['Average daily rate', r2.map(function (x, i) { return o[i] ? +(x / o[i]).toFixed(2) : null; })], ['RevPAR', r2.map(function (x, i) { return a2[i] ? +(x / a2[i]).toFixed(2) : null; })]], function (v) { return '£' + v; });
  }

  /* ---------- PURCHASED vs CONSUMED ---------- */
  function renderStock() {
    var TX = window.CostsApp.tx();
    var xs = function (m, f) { var s = 0; TX.forEach(function (t) { if (t.month === m && f(t)) s += t.net; }); return s; };
    var isFood = function (t) { return t.dept === 'Restaurant' && ['Food', 'Hot beverages', 'Beverages'].indexOf(t.section) !== -1 && t.cat !== 'Alcohol (coded to restaurant)'; };
    var isBev = function (t) { return t.dept === 'Bar' || t.cat === 'Alcohol (coded to restaurant)'; };
    var tbl = function (title, revL, cosL, f) {
      var h = '<div class="card"><h2>' + title + '</h2><div class="scroll"><table><tr><th>Month</th><th class="n">Revenue</th><th class="n">Purchased (Xero)</th><th class="n">Purchases % revenue</th><th class="n">Cost of sales in the accounts</th><th class="n">Cost of sales %</th><th class="n">Purchased but not charged</th></tr>';
      var T = [0, 0, 0];
      IDS.forEach(function (id) {
        var r = A(FB, revL, [id]) || 0, c = A(FB, cosL, [id]) || 0, p = xs(id, f); T[0] += r; T[1] += p; T[2] += c;
        h += '<tr><td>' + short(id) + '</td><td class="n">' + gbp(r) + '</td><td class="n">' + gbp(p) + '</td><td class="n">' + (r ? pc(p / r) : '–') + '</td><td class="n">' + gbp(c) + '</td><td class="n">' + (r ? pc(c / r) : '–') + '</td><td class="n">' + (Math.abs(p - c) < 1 ? '–' : '<span class="' + (p - c > 0 ? 'up' : 'down') + '">' + gbp(p - c) + '</span>') + '</td></tr>';
      });
      return h + '<tr class="tot"><td>Total</td><td class="n">' + gbp(T[0]) + '</td><td class="n">' + gbp(T[1]) + '</td><td class="n">' + pc(T[1] / T[0]) + '</td><td class="n">' + gbp(T[2]) + '</td><td class="n">' + pc(T[2] / T[0]) + '</td><td class="n"><b>' + gbp(T[1] - T[2]) + '</b></td></tr></table></div></div>';
    };
    var last = IDS[IDS.length - 1], gapAll = 0;
    IDS.forEach(function (id) { gapAll += xs(id, isFood) + xs(id, isBev) - (A(FB, 'Cost of Food Sales', [id]) || 0) - (A(FB, 'Cost of Beverage Sales', [id]) || 0); });
    var h = '<div class="card"><h2>Purchased against consumed</h2><p class="sub">What Xero shows was bought each month, beside the cost of sales the management accounts charged against that month’s revenue.</p>' +
      '<div class="finding bad"><h3>' + short(IDS[0]) + ' to ' + short(last) + ': the accounts charge ' + gbp(gapAll) + ' less than Xero shows was purchased</h3><p>If the gap is stock on the shelves, it should match a stock count. If it is not — or the purchases are not charged to another line — food and drink margins in the accounts are overstated. In ' + esc(LABEL[last]) + ' the accounts show a beverage cost of sales of <b>' + gbp(A(FB, 'Cost of Beverage Sales', [last]), 2) + '</b> on ' + gbp(A(FB, 'TOTAL BEVERAGE REVENUE', [last])) + ' of drinks revenue, while Xero shows ' + gbp(xs(last, isBev)) + ' of bar purchases that month.</p></div>' +
      '<div class="finding warn"><h3>True consumption needs a month-end stock count</h3><p>Consumed = opening stock + purchases − closing stock. Only one bar stock figure is held so far and there is no food stock count, so this page cannot yet show actual consumption — only the gap to be explained. Once month-end counts are entered through the HosF&amp;B stock take, the stock adjustment and true gross profit can be shown here for each month.</p></div></div>';
    h += tbl('Food', 'TOTAL FOOD REVENUE', 'Cost of Food Sales', isFood) + tbl('Beverage', 'TOTAL BEVERAGE REVENUE', 'Cost of Beverage Sales', isBev);
    h += '<p class="note">Food purchases = food, tea and coffee, juice, water and soft drinks posted to Restaurant Costs in Xero (kitchen consumables, equipment, event hire and the inter-company charge are left out). Beverage purchases = the Bar Costs account plus alcohol posted to Restaurant Costs, after keg credits. Xero dates are invoice dates, so part of any one month’s gap is timing.</p>';
    $('pf-stock').innerHTML = h;
  }

  /* ---------- ALIA'S BRIEF ---------- */
  function renderBrief() {
    var last = LABEL[IDS[IDS.length - 1]], first = LABEL[IDS[0]];
    var R = [
      ['1', 'Revenue against costs', 'Rooms, restaurant, bar and events revenue shown alongside their respective costs.', 'good', 'In place',
        'Profitability tab: revenue, cost of sales, labour, other expenses and profit for Rooms, Food & beverage, Leisure and Other, ' + first + ' to ' + last + '.',
        'Restaurant and bar are one F&B department in the accounts; events are not a department. Food and drink revenue and gross profit are split, and events revenue is shown, but their labour and other costs are shared. A true split needs payroll and expenses coded to restaurant, bar and events.'],
      ['2', 'Labour costs', 'Actual wages, staff hours, overtime and employer costs allocated to each department.', 'warn', 'Partly',
        'Labour tab: wages by department and team (reception, nights, housekeeping, kitchen, restaurant, bar), salaried and casual, overtime pay, National Insurance, pension, holiday pay and agency, against budget.',
        'Staff hours are not in the accounts. They will come from HosTIME clock-ins and the approved rota once HosTIME is live.'],
      ['3', 'Gross profit and departmental profit', 'Food and beverage margins and how much each department contributes.', 'warn', 'In place, with a warning',
        'Profitability tab: gross profit % for food and for beverage, and departmental profit and margin for each department.',
        'The margins use the cost of sales in the accounts, which is far below what Xero shows was purchased — see point 5. Treat F&B margins as provisional.'],
      ['4', 'Operational KPIs', 'Occupancy, rooms sold, sleepers, F&B spend per occupied room and per guest, restaurant covers and cost per occupied room.', 'warn', 'Mostly',
        'KPIs tab: occupancy, rooms sold, sleepers, ADR, RevPAR, F&B spend per occupied room and per guest, and cost per occupied room for payroll, laundry, cleaning, guest supplies, commissions and utilities.',
        'Restaurant covers in the accounts look under-recorded, so covers and spend per cover are not reliable. They need a daily till export or the HosF&B order pad.'],
      ['5', 'Stock adjustments', 'Distinguish what we have purchased from what we have actually consumed during the month.', 'bad', 'Gap identified',
        'Purchased vs consumed tab: Xero purchases beside the cost of sales charged in the accounts, month by month, for food and for beverage.',
        'Actual consumption needs opening and closing stock counts each month. There is one bar stock figure and no food count yet. The HosF&B stock take can supply these.'],
      ['6', 'Budgets and comparisons', 'Actual performance against budget, previous months and last year.', 'warn', 'Partly',
        'Every profitability and labour table shows budget and variance; choose “Previous month” to compare month on month; the charts show every month.',
        'There is no last year to compare with: the accounts start in ' + first + '. Year-on-year comparison becomes possible from ' + first.replace('2026', '2027') + '.'],
      ['7', 'Overall hotel profitability', 'Including utilities, maintenance, commissions, insurance and other overheads.', 'good', 'In place',
        'Profitability tab: revenue down to gross operating profit, EBITDA and net operating profit, with the largest overhead lines listed against budget.',
        'Accounts are loaded to ' + last + '. October onwards appears as soon as the next management accounts are uploaded to the P&L dashboard.']
    ];
    var h = '<div class="card"><h2>Alia’s brief: what is now covered, and what is still missing</h2><p class="sub">Feedback received 15 November 2026: Xero shows what we spend; the dashboard needs to show the actual profitability of each department. Each point below is mapped to where it now sits and what data is still needed.</p><div class="scroll"><table><tr><th>#</th><th>Requested</th><th>Status</th><th>What the dashboard now shows</th><th>Still missing, and where it will come from</th></tr>' +
      R.map(function (r) { return '<tr><td>' + r[0] + '</td><td style="min-width:200px"><b>' + r[1] + '</b><br><span style="color:#52514e">' + r[2] + '</span></td><td><span class="pill ' + r[3] + '">' + r[4] + '</span></td><td style="min-width:260px">' + esc(r[5]) + '</td><td style="min-width:260px">' + esc(r[6]) + '</td></tr>'; }).join('') + '</table></div></div>';
    h += '<div class="card"><h2>Where each figure comes from</h2><div class="scroll"><table><tr><th>Source</th><th>What it provides</th><th>Coverage today</th></tr>' +
      '<tr><td><b>Management accounts</b> (the P&amp;L dashboard data)</td><td>Revenue, cost of sales, payroll, departmental and hotel profit, budget, rooms and sleepers</td><td>' + first + ' to ' + last + '</td></tr>' +
      '<tr><td><b>Xero account transactions</b></td><td>Every purchase by supplier and item for Bar, Restaurant and Rooms; keg and linen prices</td><td>December 2025 to 14 November 2026</td></tr>' +
      '<tr><td><b>HosTIME and the rota</b></td><td>Staff hours, overtime hours, rota against actual</td><td>Not yet — from go-live</td></tr>' +
      '<tr><td><b>HosF&amp;B</b> (stock take, order pad, till upload)</td><td>Month-end stock, covers, sales by dish</td><td>Not yet — built, awaiting first stock take and till data</td></tr>' +
      '<tr><td><b>Guestline</b></td><td>Daily occupancy, rate and revenue</td><td>Not yet — API order in progress</td></tr></table></div></div>';
    $('pf-brief').innerHTML = h;
  }

  /* ---------- sign-in and loading ---------- */
  function sha(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
  function signedIn() { try { return !!sessionStorage.getItem(SKEY); } catch (e) { return false; } }
  function gate(el) {
    el.innerHTML = '<div class="card" style="max-width:420px;margin:40px auto"><h2>Directors’ sign-in</h2><p class="sub">Profitability, labour and KPIs use the management accounts, so they need the same sign-in as the P&amp;L dashboard. Supplier cost tabs stay open.</p>' +
      '<form class="pf-login"><p><label style="font-size:12px;color:#52514e">Name<br><input type="text" name="u" autocomplete="off" style="width:100%;max-width:none"></label></p><p><label style="font-size:12px;color:#52514e">Password<br><input type="password" name="p" autocomplete="off" style="font:inherit;font-size:14px;padding:6px 8px;border:1px solid #e4e2dc;border-radius:7px;width:100%"></label></p><p class="pf-err up" style="font-size:13px;min-height:18px"></p><button class="btn" type="submit">Sign in</button></form></div>';
  }
  function load() {
    if (loaded || loadErr) return Promise.resolve();
    return fetch(PL_BASE + 'index.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('index'); return r.json(); }).then(function (ix) {
      IDS = ix.months.map(function (m) { LABEL[m.id] = m.label; return m.id; });
      return Promise.all(IDS.map(function (id) { return fetch(PL_BASE + id + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { M[id] = d; }); }));
    }).then(function () { loaded = true; sel.month = IDS[IDS.length - 1]; }).catch(function () { loadErr = true; });
  }
  var VIEWS = { profit: renderProfit, labour: renderLabour, kpi: renderKpi, stock: renderStock, brief: renderBrief };
  function show(name) {
    var el = $('pf-' + name); if (!el) return;
    if (!signedIn()) { gate(el); return; }
    el.innerHTML = '<p class="note">Loading the management accounts…</p>';
    load().then(function () {
      if (loadErr) { el.innerHTML = '<div class="card"><h2>Management accounts not found</h2><p class="sub">This tab reads the P&amp;L dashboard’s data from <code>pl/data/</code> on the same site. It works on brandon.hospro.co.uk; it cannot load when the page is opened straight from a folder on a computer.</p></div>'; return; }
      VIEWS[name]();
    });
  }
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.classList) return;
    if (t.classList.contains('pf-month')) { sel.month = t.value; if (sel.month === 'all') sel.cmp = 'budget'; show(current()); }
    if (t.classList.contains('pf-cmp')) { sel.cmp = t.value; show(current()); }
  });
  document.addEventListener('submit', function (e) {
    if (!e.target.classList.contains('pf-login')) return;
    e.preventDefault();
    var f = e.target, u = f.u.value.trim().toLowerCase(), p = f.p.value.trim();
    sha(u + '|' + p).then(function (hx) {
      var ok = HASHES.filter(function (x) { return x.h === hx; })[0];
      if (!ok) { f.querySelector('.pf-err').textContent = 'Name or password not recognised.'; return; }
      sessionStorage.setItem(SKEY, ok.d); show(current());
    });
  });
  function current() { var b = document.querySelector('#nav button.on'); return b ? b.dataset.t.replace('pf-', '') : 'profit'; }
  window.Profit = { show: show, isView: function (n) { return !!VIEWS[n]; }, register: function (n, f) { VIEWS[n] = f; }, data: function () { return { M: M, IDS: IDS, LABEL: LABEL }; } };
})();
