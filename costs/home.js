/* HosProfit — welcome screen and the Accounts (Xero) page. Reads what the other pages already hold. */
(function () {
  'use strict';
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gbp(v, dp) { if (v === null || v === undefined || !isFinite(v)) return '–'; return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function num(v) { return v === null || v === undefined || !isFinite(v) ? '–' : Math.round(v).toLocaleString('en-GB'); }
  function pc(v) { return v === null || v === undefined || !isFinite(v) ? '–' : (v * 100).toFixed(1) + '%'; }
  function dlabel(d) { return +d.slice(8) + ' ' + MN[+d.slice(5, 7) - 1]; }
  function when(ts) { return ts ? +ts.slice(8, 10) + ' ' + MN[+ts.slice(5, 7) - 1] + ' at ' + ts.slice(11, 16) : '–'; }
  function sum(a, i) { return a.reduce(function (s, r) { return s + (r[i] || 0); }, 0); }

  /* ---------- icons: white glyph on a coloured disc ---------- */
  var G = {
    trading: '<rect x="13" y="29" width="6" height="9" rx="1.5"/><rect x="22" y="24" width="6" height="14" rx="1.5"/><rect x="31" y="18" width="6" height="20" rx="1.5"/><path d="M13 22c7-1 13-4 18-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M27 10l6 0 0 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    demand: '<circle cx="25" cy="14" r="4"/><circle cx="13" cy="34" r="4"/><circle cx="37" cy="34" r="4"/><circle cx="25" cy="27" r="3"/><path d="M25 18v6M22.5 28.5l-7 3.5M27.5 28.5l7 3.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
    profit: '<path d="M30 16a7 7 0 0 0-12 3c0 4 0 8-3 13h18" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 25h11" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>',
    labour: '<circle cx="19" cy="17" r="5"/><path d="M10 36c0-7 4-10 9-10s9 3 9 10z"/><circle cx="33" cy="20" r="4"/><path d="M30 36c0-4-1-6-2-8 1-1 3-2 5-2 4 0 7 3 7 10z"/>',
    kpi: '<path d="M11 32a14 14 0 1 1 28 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M25 32l7-10" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="25" cy="32" r="3"/>',
    stock: '<path d="M25 10l13 6v16l-13 6-13-6V16z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M12 16l13 6 13-6M25 22v16" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>',
    explore: '<path d="M10 16h18v16H10z"/><path d="M28 21h7l5 6v5H28z"/><circle cx="17" cy="35" r="3.6" stroke="currentColor" stroke-width="2"/><circle cx="33" cy="35" r="3.6" stroke="currentColor" stroke-width="2"/>',
    bar: '<path d="M15 14h17v19a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4z"/><path d="M32 19h3a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-3" fill="none" stroke="#fff" stroke-width="3"/><path d="M20 20v11M26 20v11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    rooms: '<path d="M10 14v24M10 30h30v8M40 30v-4a5 5 0 0 0-5-5H22v9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="24" r="3"/>',
    save: '<path d="M14 24c0-6 5-10 12-10 6 0 11 4 11 10 0 3-1 5-3 7v5h-5v-3h-6v3h-5v-5c-2-2-4-4-4-7z"/><path d="M22 18h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="23" r="1.6" fill="currentColor"/>',
    accounts: '<path d="M15 10h14l7 7v23H15z"/><path d="M20 22h11M20 27h11M20 32h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    brief: '<path d="M14 13h22v24H14z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M19 21l3 3 6-6M19 31h12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    update: '<path d="M25 33V14M17 21l8-8 8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 31v6h26v-6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  var COL = { trading: '#d0362b', demand: '#7a4fc4', profit: '#1a8f63', labour: '#2a78c8', kpi: '#eb6834', stock: '#0f8f95', explore: '#52606d', bar: '#b9791a', rooms: '#3f5bbf', save: '#c2417a', accounts: '#1f3d36', brief: '#6b7a2a', update: '#86847d' };
  function icon(k, size) { return '<svg viewBox="0 0 50 50" width="' + (size || 46) + '" height="' + (size || 46) + '" aria-hidden="true" style="color:' + COL[k] + ';flex:none"><circle cx="25" cy="25" r="25" fill="' + COL[k] + '"/><g fill="#fff">' + G[k] + '</g></svg>'; }
  function go(tab) { var b = document.querySelector('#nav button[data-t="' + tab + '"]'); if (b) b.click(); window.scrollTo(0, 0); }

  /* ---------- Accounts (Xero) ---------- */
  function acc() {
    var A = window.ACCOUNTS_DATA; if (!A) return null;
    var P = A.pl, o = { A: A };
    ['Trading Income', 'Cost of Sales', 'Other Income', 'Operating Expenses'].forEach(function (k) { o[k] = [1, 2, 3].map(function (i) { return sum(P[k] || [], i); }); });
    o.gp = [0, 1, 2].map(function (i) { return o['Trading Income'][i] - o['Cost of Sales'][i]; });
    o.net = [0, 1, 2].map(function (i) { return o.gp[i] + o['Other Income'][i] - o['Operating Expenses'][i]; });
    o.line = function (n) { var f = null; Object.keys(P).forEach(function (k) { P[k].forEach(function (r) { if (r[0] === n) f = r; }); }); return f || [n, 0, 0, 0]; };
    return o;
  }
  function accObs(a) {
    var A = a.A, obs = [], inc = a['Trading Income'], sal = a.line('Salaries'), com = a.line('Marketing Commission'), ut = a.line('Light, Power, Heating'), ap = A.ap, S0 = A.summary;
    obs.push([a.net[0] < 0 ? 'bad' : 'good', 'Xero shows a ' + (a.net[0] < 0 ? 'loss' : 'profit') + ' of ' + gbp(Math.abs(a.net[0])) + ' for ' + esc(A.cols[0]), 'Against a profit of ' + gbp(a.net[1]) + ' in ' + esc(A.cols[1]) + '. Sales fell ' + gbp(inc[1] - inc[0]) + ' and costs rose ' + gbp((a['Cost of Sales'][0] + a['Operating Expenses'][0]) - (a['Cost of Sales'][1] + a['Operating Expenses'][1])) + '.', 'accounts']);
    if (sal[1] > sal[2] * 1.15) obs.push(['bad', 'Salaries rose ' + gbp(sal[1] - sal[2]) + ' in a month', gbp(sal[1]) + ' in ' + esc(A.cols[0]) + ' against ' + gbp(sal[2]) + ', which is ' + pc(sal[1] / inc[0]) + ' of sales. Check whether two pay runs or back pay landed in the same month before reading it as a trend.', 'accounts']);
    if (com[1]) obs.push(['warn', 'Commission took ' + pc(com[1] / inc[0]) + ' of sales', gbp(com[1]) + ' of marketing commission in ' + esc(A.cols[0]) + ', up from ' + gbp(com[2]) + '. This is the cost of the booking-site share shown under Channels & rates.', 'pf-demand']);
    if (ut[1]) obs.push(['warn', 'Energy is ' + pc(ut[1] / inc[0]) + ' of sales', gbp(ut[1]) + ' for light, power and heating in the month; ' + gbp(ut[3]) + ' in the year to date.', 'accounts']);
    var over = ap.totals.slice(1).reduce(function (s, v) { return s + v; }, 0), hm = ap.top.filter(function (r) { return r[0] === 'HMRC'; })[0];
    obs.push(['bad', gbp(ap.total) + ' is owed to suppliers, ' + gbp(over) + ' of it overdue', 'Creditors were ' + gbp(S0.Creditors[1]) + ' a month earlier. Average time to pay is ' + Math.round(S0['Average creditor days'][0]) + ' days.' + (hm ? ' HMRC is the largest balance at ' + gbp(hm[1]) + ', with ' + gbp(hm[2]) + ' more than a month overdue.' : ''), 'accounts']);
    obs.push([S0['Short term cash forecast'][0] < 0 ? 'bad' : 'good', 'Cash at bank is ' + gbp(S0['Closing bank balance'][0]), 'Xero’s short-term cash forecast (cash plus money due in, less bills due) stands at ' + gbp(S0['Short term cash forecast'][0]) + '.', 'accounts']);
    return obs;
  }
  function renderAccounts() {
    var a = acc(), el = $('pf-accounts'); if (!a) { el.innerHTML = '<div class="card"><h2>No Xero management report loaded</h2></div>'; return; }
    var A = a.A, c = A.cols, inc = a['Trading Income'], S0 = A.summary;
    function sec(k, title) { return '<tr class="tot"><td colspan="5">' + title + '</td></tr>' + A.pl[k].filter(function (r) { return r[1] || r[2] || r[3]; }).map(function (r) { var d = r[1] - r[2]; return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + gbp(r[2]) + '</td><td class="n">' + (Math.abs(d) < 1 ? '–' : (d > 0 ? '+' : '−') + gbp(Math.abs(d))) + '</td><td class="n">' + gbp(r[3]) + '</td></tr>'; }).join(''); }
    function tot(l, v) { return '<tr class="tot"><td>' + l + '</td><td class="n">' + gbp(v[0]) + '</td><td class="n">' + gbp(v[1]) + '</td><td class="n">' + (v[0] - v[1] >= 0 ? '+' : '−') + gbp(Math.abs(v[0] - v[1])) + '</td><td class="n">' + gbp(v[2]) + '</td></tr>'; }
    var h = '<div class="card"><h2>What the Xero accounts show</h2><p class="sub">Xero Management Report for the month ended ' + esc(A.period) + '</p>' + accObs(a).map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div>';
    h += '<div class="tiles">' + tile('Sales, ' + esc(c[0]), gbp(inc[0]), gbp(inc[1]) + ' in ' + esc(c[1])) + tile('Gross profit', gbp(a.gp[0]), pc(a.gp[0] / inc[0]) + ' of sales') + tile(a.net[0] < 0 ? 'Loss for the month' : 'Profit for the month', gbp(a.net[0]), gbp(a.net[1]) + ' in ' + esc(c[1])) + tile('Year to date', gbp(a.net[2]), 'on sales of ' + gbp(inc[2])) + tile('Cash at bank', gbp(S0['Closing bank balance'][0]), 'month movement ' + gbp(S0['Cash surplus (deficit)'][0])) + tile('Owed to suppliers', gbp(A.ap.total), Math.round(S0['Average creditor days'][0]) + ' days to pay on average') + '</div>';
    h += '<div class="grid g2"><div class="card"><h2>Profit and loss</h2><p class="sub">As coded in Xero, net of VAT</p><div class="scroll"><table><tr><th>Account</th><th class="n">' + esc(c[0]) + '</th><th class="n">' + esc(c[1]) + '</th><th class="n">Change</th><th class="n">' + esc(c[2]) + '</th></tr>' +
      sec('Trading Income', 'Income') + tot('Total income', inc) + sec('Cost of Sales', 'Cost of sales') + tot('Gross profit', a.gp) + sec('Other Income', 'Other income') + sec('Operating Expenses', 'Operating expenses') + tot('Total operating expenses', a['Operating Expenses']) + tot('Net profit (loss)', a.net) + '</table></div></div><div>';
    var mv = []; ['Cost of Sales', 'Operating Expenses'].forEach(function (k) { A.pl[k].forEach(function (r) { mv.push([r[0], r[1] - r[2], r[1], r[2]]); }); }); mv.sort(function (x, y) { return Math.abs(y[1]) - Math.abs(x[1]); });
    h += '<div class="card"><h2>Biggest cost movements</h2><p class="sub">' + esc(c[0]) + ' against ' + esc(c[1]) + '</p><table><tr><th>Account</th><th class="n">' + esc(c[0]) + '</th><th class="n">' + esc(c[1]) + '</th><th class="n">Change</th></tr>' + mv.slice(0, 9).map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[2]) + '</td><td class="n">' + gbp(r[3]) + '</td><td class="n"><span class="' + (r[1] > 0 ? 'up' : 'down') + '">' + (r[1] > 0 ? '+' : '−') + gbp(Math.abs(r[1])) + '</span></td></tr>'; }).join('') + '</table></div>';
    h += '<div class="card"><h2>Balance sheet</h2><p class="sub">Summary; individual loans are grouped</p><table><tr><th></th><th class="n">' + esc(A.bs.cols[0]) + '</th><th class="n">' + esc(A.bs.cols[1]) + '</th></tr>' + A.bs.lines.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + gbp(r[2]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Net assets</td><td class="n">' + gbp(S0['Net assets'][0]) + '</td><td class="n"></td></tr></table></div></div></div>';
    var ap = A.ap;
    h += '<div class="grid g2"><div class="card"><h2>What is owed to suppliers, by age</h2><p class="sub">' + ap.count + ' suppliers, ' + gbp(ap.total) + ' in total</p><div class="chartbox" style="height:230px"><canvas id="ac-c1"></canvas></div></div><div class="card"><h2>Largest balances owed</h2><p class="sub">Top 12 by amount</p><div class="scroll" style="max-height:290px"><table><tr><th>Supplier</th><th class="n">Owed</th><th class="n">Over a month overdue</th></tr>' + ap.top.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + (r[2] > 0.5 ? gbp(r[2]) : '–') + '</td></tr>'; }).join('') + '</table></div></div></div>';
    h += '<p class="note">This page is Xero’s own management report: one sales line and no departments, budget or occupancy. Departmental profit stays on the Profitability page, which follows the management accounts workbook. Debtors: ' + gbp(A.ar.total) + ' across ' + A.ar.count + ' accounts, ' + gbp(A.ar.older) + ' of it more than three months old.</p>';
    el.innerHTML = h;
    if (window.__acChart) window.__acChart.destroy();
    window.__acChart = new Chart($('ac-c1'), { type: 'bar', data: { labels: ap.buckets, datasets: [{ data: ap.totals, backgroundColor: ap.totals.map(function (v, i) { return i === 0 ? '#1baf7a' : i < 2 ? '#e3a43a' : '#d0362b'; }), borderRadius: 4, maxBarThickness: 48 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return gbp(x.parsed.y); } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return '£' + Math.round(v / 1000) + 'k'; } } } } } });
  }
  function tile(l, v, d) { return '<div class="tile"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + (d || '') + '</div></div>'; }

  /* ---------- Welcome ---------- */
  function renderHome() {
    var el = $('pf-home'), T = window.Trading, S = T ? T.S() : {}, a = acc(), PD = window.Profit.data(), h = '', hl = [], card = {};
    var who = ''; try { who = sessionStorage.getItem('bhpl_user') || ''; } catch (e) {}
    who = who.split(/\s+/)[0]; who = who ? who.charAt(0).toUpperCase() + who.slice(1).toLowerCase() : '';
    h += '<div class="hp-hero"><div><h2>Welcome to HosProfit' + (who ? ', ' + esc(who) : '') + '</h2><p>Brandon Hall Hotel &amp; Spa · trading, profit and costs in one place</p></div>' + (S.af ? '<div class="hp-stamp">Trading data from Guestline<br><b>' + when(S.af.asOf) + '</b></div>' : '') + '</div>';

    if (S.af && S.af.rows.length) {
      var cut = T.asOfDay(), m = cut.slice(0, 7), rows = S.af.rows, R = T.ROOMS, to = rows.filter(function (r) { return r.d === cut; })[0], yd = rows.filter(function (r) { return r.d < cut; }).slice(-1)[0];
      var act = T.agg(T.rowsFor(m, 'actual')), bks = T.agg(T.rowsFor(m, 'books')), all = T.agg(T.rowsFor(m));
      var nx = rows.filter(function (r) { return r.d >= cut; }).slice(0, 7), n7 = T.agg(nx), oos = S.x && S.x.rooms ? S.x.rooms.oos.length : (to ? to.roos : null);
      var rate = function (r) { return r && r.rooms ? T.net(r.acc) / r.rooms : null; };
      h += '<div class="hp-today"><div class="hp-th">' + icon('trading', 38) + '<div><h3>Trading today</h3><p>' + (to ? to.dow + ' ' + dlabel(cut) : dlabel(cut)) + ', as at the last Guestline report</p></div><button class="hp-link" data-go="pf-trading">Open Trading</button></div><div class="tiles">' +
        tile('Tonight', to ? pc(to.rooms / R) : '–', to ? num(to.rooms) + ' rooms booked at ' + gbp(rate(to), 2) : '') +
        tile('Last night', yd ? pc(yd.rooms / R) : '–', yd ? num(yd.rooms) + ' rooms at ' + gbp(rate(yd), 2) + ' · ' + gbp(T.net(yd.acc + yd.fb + yd.oth)) + ' revenue' : '') +
        tile('Month to date', gbp(act.total), pc(act.occ) + ' occupancy · ' + gbp(act.adr, 2) + ' rate') +
        tile('Month, with bookings held', gbp(act.total + bks.total), pc(all.occ) + ' occupancy for the month') +
        tile('Next 7 nights', pc(n7.occ), num(n7.rooms) + ' room nights · ' + gbp(n7.acc) + ' rooms revenue') +
        tile('Rooms out of service', num(oos), S.x && S.x.rooms ? 'of ' + S.x.rooms.total + ' rooms' : 'tonight') + '</div>' +
        '<div class="hp-week">' + nx.map(function (r) { var o = r.rooms / R; return '<div title="' + r.dow + ' ' + dlabel(r.d) + ': ' + r.rooms + ' rooms"><span>' + Math.round(o * 100) + '%</span><i style="height:' + Math.max(4, Math.round(o * 54)) + 'px;background:' + (o < 0.25 ? '#d0362b' : o < 0.5 ? '#e3a43a' : '#1baf7a') + '"></i><em>' + r.dow.slice(0, 3) + ' ' + +r.d.slice(8) + '</em></div>'; }).join('') + '</div></div>';
      T.observations(m, act, bks, true).forEach(function (o) { hl.push([o[0], o[1], o[2], 'pf-trading']); });
      card.trading = pc(act.occ) + ' occupancy, ' + gbp(act.adr, 2) + ' rate this month'; card.rooms = num(oos) + ' rooms out of service';
      var X = S.x || {};
      if (X.company) { var ota = 0; X.company.rows.forEach(function (r) { if (/^(BOOK|EXPE)/.test(r.ref)) ota += r.rn; }); var sh = ota / X.company.total.rn; card.demand = pc(sh) + ' of room nights via booking sites'; hl.push(['bad', pc(sh) + ' of room nights come through Booking.com and Expedia', 'Commission is paid on all of it. Moving bookings to the hotel’s own website is the largest single saving available.', 'pf-demand']); }
      if (X.overrides && X.overrides.byOp['Automatic (system)'] && X.overrides.byOp['Automatic (system)'].diff < 0) { var au = X.overrides.byOp['Automatic (system)']; hl.push(['bad', 'Automatic rate cuts of ' + pc(-au.diff / au.pre) + ' on ' + num(au.c) + ' bookings', gbp(-au.diff) + ' taken off rates between ' + dlabel(X.overrides.from) + ' and ' + dlabel(X.overrides.to) + '. Confirm which booking-site promotions are switched on.', 'pf-demand']); }
      if (X.rooms) { var lo = X.rooms.oos.filter(function (o) { return o.since && (Date.parse(X.rooms.asOf.slice(0, 10)) - Date.parse(o.since)) / 864e5 > 30; }); if (lo.length) hl.push(['bad', lo.length + ' rooms have been out of service for over 30 days', 'Rooms ' + lo.map(function (o) { return o.id; }).join(', ') + '. Each is a room that cannot be sold.', 'pf-demand']); }
      if (X.cancels) { var c0 = X.cancels.byLead['On the day'] || { c: 0, lost: 0 }, c1 = X.cancels.byLead['1 to 2 days before'] || { c: 0, lost: 0 }; hl.push(['warn', num(c0.c + c1.c) + ' bookings cancelled within two days of arrival', gbp(c0.lost + c1.lost) + ' at booked value over the past year. Check which rates allow free cancellation that late.', 'pf-demand']); }
    }
    if (a) { accObs(a).forEach(function (o) { hl.push([o[0], o[1], o[2], o[3] === 'accounts' ? 'pf-accounts' : o[3]]); }); card.accounts = (a.net[0] < 0 ? 'Loss of ' : 'Profit of ') + gbp(Math.abs(a.net[0])) + ' in ' + a.A.cols[0]; }
    if (PD && PD.IDS && PD.IDS.length) {
      var id = PD.IDS[PD.IDS.length - 1], mo = PD.M[id], row = function (l) { var f = (mo.pl || []).filter(function (r) { return r.label === l; })[0]; return f ? f.ma : null; };
      var rev = row('TOTAL REVENUE'), eb = row('EBITDA'), man = row('Total Manning');
      card.profit = PD.LABEL[id] + ': EBITDA ' + gbp(eb) + ' on ' + gbp(rev); if (man && rev) card.labour = 'Payroll ' + pc(man / rev) + ' of revenue, ' + PD.LABEL[id]; card.kpi = 'RevPAR ' + gbp(row('REVPAR'), 2) + ', ' + PD.LABEL[id];
    }
    if (window.CostsApp) { var tx = window.CostsApp.tx(), t = 0; tx.forEach(function (r) { t += r.net || 0; }); if (t) card.explore = gbp(t) + ' of supplier costs analysed'; }

    var rank = { bad: 0, warn: 1, good: 2 }; hl.sort(function (x, y) { return rank[x[0]] - rank[y[0]]; });
    var bad = hl.filter(function (x) { return x[0] === 'bad'; }), warn = hl.filter(function (x) { return x[0] === 'warn'; }), good = hl.filter(function (x) { return x[0] === 'good'; });
    function col(title, cls, list) { return '<div class="card"><h2>' + title + '</h2><p class="sub">' + list.length + (list.length === 1 ? ' item' : ' items') + '</p>' + (list.length ? list.map(function (x) { return '<div class="finding ' + cls + ' hp-f" data-go="' + x[3] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') : '<p class="note">Nothing here.</p>') + '</div>'; }
    h += '<div class="grid g2">' + col('Act on these', 'bad', bad) + col('Keep an eye on', 'warn', warn.concat(good.map(function (g) { return g; }))) + '</div>';

    var cards = [['pf-trading', 'trading', 'Trading', 'Occupancy, rate, RevPAR and revenue by night from Guestline'], ['pf-demand', 'demand', 'Channels & rates', 'Where bookings come from, rate plans, cancellations, no-shows'], ['pf-profit', 'profit', 'Profitability', 'Revenue against costs and profit for every department'], ['pf-labour', 'labour', 'Labour', 'Payroll by department, agency and employer costs'], ['pf-kpi', 'kpi', 'KPIs', 'Occupancy, rate, RevPAR and cost ratios by month'], ['pf-accounts', 'accounts', 'Accounts (Xero)', 'Monthly profit and loss, cash and what is owed'], ['pf-stock', 'stock', 'Purchased vs consumed', 'Purchases in Xero against cost of sales in the accounts'], ['explore', 'explore', 'Supplier costs', 'Every Xero cost line by supplier, type, section and month'], ['bar', 'bar', 'Bar & keg prices', 'Keg price history and market comparison'], ['rooms', 'rooms', 'Rooms, linen & housekeeping', 'Linen, cleaning, guest supplies and waste'], ['save', 'save', 'Savings & checks', 'Where to buy better, duplicates and miscoded lines'], ['pf-brief', 'brief', 'Alia’s brief', 'The seven points asked for and where each is covered'], ['update', 'update', 'Update data', 'Load new Xero exports']];
    h += '<div class="hp-cards">' + cards.map(function (c) { return '<button class="hp-card' + (c[1] === 'trading' ? ' hot' : '') + '" data-go="' + c[0] + '" style="--c:' + COL[c[1]] + '">' + icon(c[1]) + '<span><b>' + c[2] + '</b><small>' + c[3] + '</small>' + (card[c[1]] ? '<em>' + esc(card[c[1]]) + '</em>' : '') + '</span></button>'; }).join('') + '</div>';
    el.innerHTML = h;
  }
  document.addEventListener('click', function (e) { var t = e.target.closest ? e.target.closest('[data-go]') : null; if (t) go(t.getAttribute('data-go')); });
  if (window.Profit && window.Profit.register) { window.Profit.register('home', renderHome); window.Profit.register('accounts', renderAccounts); }
})();
