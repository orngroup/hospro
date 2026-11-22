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
    fb: '<path d="M17 11v9a4 4 0 0 0 8 0v-9M21 11v28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M33 39V11c-4 3-5 8-5 14h5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    actions: '<path d="M28 9L14 28h9l-2 13 15-20h-9z"/>',
    data: '<ellipse cx="25" cy="15" rx="12" ry="5"/><path d="M13 15v10c0 3 5 5 12 5s12-2 12-5V15M13 25v10c0 3 5 5 12 5s12-2 12-5V25" fill="none" stroke="#fff" stroke-width="3"/>',
    update: '<path d="M25 33V14M17 21l8-8 8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 31v6h26v-6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  var COL = { trading: '#b3261e', demand: '#7a4fc4', profit: '#1a8f63', labour: '#2a78c8', kpi: '#eb6834', stock: '#0f8f95', explore: '#52606d', bar: '#b9791a', rooms: '#3f5bbf', save: '#c2417a', accounts: '#1f3d36', brief: '#6b7a2a', update: '#86847d', fb: '#c2417a', actions: '#d0362b', data: '#1a2b3a', rev: '#1F7A8C' };
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
    obs.push([a.net[0] < 0 ? 'bad' : 'good', 'Xero shows a ' + (a.net[0] < 0 ? 'loss' : 'profit') + ' of ' + gbp(Math.abs(a.net[0])) + ' for ' + esc(A.cols[0]), 'Against a profit of ' + gbp(a.net[1]) + ' in ' + esc(A.cols[1]) + '. Sales fell ' + gbp(inc[1] - inc[0]) + ' and costs rose ' + gbp((a['Cost of Sales'][0] + a['Operating Expenses'][0]) - (a['Cost of Sales'][1] + a['Operating Expenses'][1])) + '.', 'pf-profit']);
    if (sal[1] > sal[2] * 1.15) obs.push(['bad', 'Salaries rose ' + gbp(sal[1] - sal[2]) + ' in a month', gbp(sal[1]) + ' in ' + esc(A.cols[0]) + ' against ' + gbp(sal[2]) + ', which is ' + pc(sal[1] / inc[0]) + ' of sales. Check whether two pay runs or back pay landed in the same month before reading it as a trend.', 'pf-profit']);
    if (com[1]) obs.push(['warn', 'Commission took ' + pc(com[1] / inc[0]) + ' of sales', gbp(com[1]) + ' of marketing commission in ' + esc(A.cols[0]) + ', up from ' + gbp(com[2]) + '. This is the cost of the booking-site share shown under Channels & rates.', 'pf-demand']);
    if (ut[1]) obs.push(['warn', 'Energy is ' + pc(ut[1] / inc[0]) + ' of sales', gbp(ut[1]) + ' for light, power and heating in the month; ' + gbp(ut[3]) + ' in the year to date.', 'pf-profit']);
    var over = ap.totals.slice(1).reduce(function (s, v) { return s + v; }, 0), hm = ap.top.filter(function (r) { return r[0] === 'HMRC'; })[0];
    obs.push(['bad', gbp(ap.total) + ' is owed to suppliers, ' + gbp(over) + ' of it overdue', 'Creditors were ' + gbp(S0.Creditors[1]) + ' a month earlier. Average time to pay is ' + Math.round(S0['Average creditor days'][0]) + ' days.' + (hm ? ' HMRC is the largest balance at ' + gbp(hm[1]) + ', with ' + gbp(hm[2]) + ' more than a month overdue.' : ''), 'pf-profit']);
    obs.push([S0['Short term cash forecast'][0] < 0 ? 'bad' : 'good', 'Cash at bank is ' + gbp(S0['Closing bank balance'][0]), 'Xero’s short-term cash forecast (cash plus money due in, less bills due) stands at ' + gbp(S0['Short term cash forecast'][0]) + '.', 'pf-profit']);
    return obs;
  }
  function renderAccounts(target, prefix) {
    var a = acc(), el = $(target || 'pf-profit'); prefix = prefix || ''; if (!a) { el.innerHTML = '<div class="card"><h2>No Xero management report loaded</h2></div>'; return; }
    var A = a.A, c = A.cols, inc = a['Trading Income'], S0 = A.summary;
    function sec(k, title) { return '<tr class="tot"><td colspan="5">' + title + '</td></tr>' + A.pl[k].filter(function (r) { return r[1] || r[2] || r[3]; }).map(function (r) { var d = r[1] - r[2]; return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + gbp(r[2]) + '</td><td class="n">' + (Math.abs(d) < 1 ? '–' : (d > 0 ? '+' : '−') + gbp(Math.abs(d))) + '</td><td class="n">' + gbp(r[3]) + '</td></tr>'; }).join(''); }
    function tot(l, v) { return '<tr class="tot"><td>' + l + '</td><td class="n">' + gbp(v[0]) + '</td><td class="n">' + gbp(v[1]) + '</td><td class="n">' + (v[0] - v[1] >= 0 ? '+' : '−') + gbp(Math.abs(v[0] - v[1])) + '</td><td class="n">' + gbp(v[2]) + '</td></tr>'; }
    var h = '<div class="card"><h2>What the Xero accounts show</h2><p class="sub">Xero Management Report for the month ended ' + esc(A.period) + ' · click an item to read it in full</p><div class="find2">' + accObs(a).map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div>';
    h += '<div class="tiles">' + tile('Sales, ' + esc(c[0]), gbp(inc[0]), gbp(inc[1]) + ' in ' + esc(c[1])) + tile('Gross profit', gbp(a.gp[0]), pc(a.gp[0] / inc[0]) + ' of sales') + tile(a.net[0] < 0 ? 'Loss for the month' : 'Profit for the month', gbp(a.net[0]), gbp(a.net[1]) + ' in ' + esc(c[1])) + tile('Year to date', gbp(a.net[2]), 'on sales of ' + gbp(inc[2])) + tile('Cash at bank', gbp(S0['Closing bank balance'][0]), 'month movement ' + gbp(S0['Cash surplus (deficit)'][0])) + tile('Owed to suppliers', gbp(A.ap.total), Math.round(S0['Average creditor days'][0]) + ' days to pay on average') + '</div>';
    h += '<div class="grid g2"><div class="card"><h2>Profit and loss</h2><p class="sub">As coded in Xero, net of VAT</p><div class="scroll"><table><tr><th>Account</th><th class="n">' + esc(c[0]) + '</th><th class="n">' + esc(c[1]) + '</th><th class="n">Change</th><th class="n">' + esc(c[2]) + '</th></tr>' +
      sec('Trading Income', 'Income') + tot('Total income', inc) + sec('Cost of Sales', 'Cost of sales') + tot('Gross profit', a.gp) + sec('Other Income', 'Other income') + sec('Operating Expenses', 'Operating expenses') + tot('Total operating expenses', a['Operating Expenses']) + tot('Net profit (loss)', a.net) + '</table></div></div><div>';
    var mv = []; ['Cost of Sales', 'Operating Expenses'].forEach(function (k) { A.pl[k].forEach(function (r) { mv.push([r[0], r[1] - r[2], r[1], r[2]]); }); }); mv.sort(function (x, y) { return Math.abs(y[1]) - Math.abs(x[1]); });
    h += '<div class="card"><h2>Biggest cost movements</h2><p class="sub">' + esc(c[0]) + ' against ' + esc(c[1]) + '</p><table><tr><th>Account</th><th class="n">' + esc(c[0]) + '</th><th class="n">' + esc(c[1]) + '</th><th class="n">Change</th></tr>' + mv.slice(0, 9).map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[2]) + '</td><td class="n">' + gbp(r[3]) + '</td><td class="n"><span class="' + (r[1] > 0 ? 'up' : 'down') + '">' + (r[1] > 0 ? '+' : '−') + gbp(Math.abs(r[1])) + '</span></td></tr>'; }).join('') + '</table></div>';
    h += '<div class="card"><h2>Balance sheet</h2><p class="sub">Summary; individual loans are grouped</p><table><tr><th></th><th class="n">' + esc(A.bs.cols[0]) + '</th><th class="n">' + esc(A.bs.cols[1]) + '</th></tr>' + A.bs.lines.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + gbp(r[2]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Net assets</td><td class="n">' + gbp(S0['Net assets'][0]) + '</td><td class="n"></td></tr></table></div></div></div>';
    var ap = A.ap;
    h += '<div class="grid g2"><div class="card"><h2>What is owed to suppliers, by age</h2><p class="sub">' + ap.count + ' suppliers, ' + gbp(ap.total) + ' in total</p><div class="chartbox" style="height:230px"><canvas id="ac-c1"></canvas></div></div><div class="card"><h2>Largest balances owed</h2><p class="sub">Top 12 by amount</p><div class="scroll" style="max-height:290px"><table><tr><th>Supplier</th><th class="n">Owed</th><th class="n">Over a month overdue</th></tr>' + ap.top.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + (r[2] > 0.5 ? gbp(r[2]) : '–') + '</td></tr>'; }).join('') + '</table></div></div></div>';
    h += '<p class="note">This month comes from Xero’s own management report: one sales line and no departments, budget or occupancy. Choose an earlier month above for departmental profit from the management accounts. Debtors: ' + gbp(A.ar.total) + ' across ' + A.ar.count + ' accounts, ' + gbp(A.ar.older) + ' of it more than three months old.</p>';
    el.innerHTML = prefix + h;
    if (window.__acChart) window.__acChart.destroy();
    window.__acChart = new Chart($('ac-c1'), { type: 'bar', data: { labels: ap.buckets, datasets: [{ data: ap.totals, backgroundColor: ap.totals.map(function (v, i) { return i === 0 ? '#1baf7a' : i < 2 ? '#e3a43a' : '#d0362b'; }), borderRadius: 4, maxBarThickness: 48 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (x) { return gbp(x.parsed.y); } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return '£' + Math.round(v / 1000) + 'k'; } } } } } });
  }
  /* staff rooms: out of service on purpose. Add room numbers here to set them for everyone; ticks made on screen are kept in the browser. */
  var STAFF_ROOMS = [], SKEY2 = 'hosbusiness_staff_rooms';
  function staffRooms() { var a = STAFF_ROOMS.slice(); try { JSON.parse(localStorage.getItem(SKEY2) || '[]').forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); } catch (e) {} return a; }
  window.HubStaff = staffRooms;
  function brkTile(S, yd) {
    var P = S.x && S.x.postings; if (!P) return ctile('pf-fb', 'Breakfasts', '–', 'needs the Rezlynx Postings report');
    var dk = Object.keys(P.byDay).sort(), k = yd && P.byDay[yd.d] ? yd.d : dk[dk.length - 1], d = P.byDay[k], tot = 0, days = 0; dk.forEach(function (x) { var b = (P.byDay[x].bi || 0) + (P.byDay[x].bp || 0); if (P.byDay[x].bi !== undefined || P.byDay[x].bp !== undefined) { tot += b; days++; } });
    return '<button class="tile click" data-fb="brk"><div class="l">Breakfasts · ' + DOWN[new Date(k + 'T12:00:00').getDay()].slice(0, 3) + ' ' + dlabel(k) + '</div><div class="v">' + num(d.bi) + ' <small>in the rate</small> <span>' + num(Math.max(0, d.bp || 0)) + ' paid</span></div><div class="d">' + gbp((d.biv || 0) + (d.bpv || 0)) + ' revenue · ' + (days ? (tot / days).toFixed(0) : '–') + ' a day on average</div></button>';
  }
  function mealTile(S, cut) {
    var rt = S.x && S.x.rates, d = rt && rt.byDay ? rt.byDay[cut] : null;
    if (!d) return ctile('pf-fb', 'Meal plans tonight', '–', rt ? 'Daily Rate Analysis does not cover today · load a new export' : 'needs the Daily Rate Analysis export');
    var dbb = d.dbb || 0, bb = d.bb || 0;
    return ctile('pf-fb', 'Meal plans tonight', num(dbb) + ' <small>DBB</small> <span>' + num(bb) + ' B&amp;B</span>', num(dbb + bb) + ' rooms with breakfast · ' + num(dbb) + ' with dinner · ' + num((d.ro || 0) + (d.other || 0)) + ' room only or no charge · as booked ' + when(rt.asOf));
  }
  function oosTile(S, to, R, yd, act) {
    var T = window.Trading, r = yd || to; if (!r) return ctile('pf-trading', 'Rooms out of service', '–', '');
    var adr = r.rooms ? T.net(r.acc) / r.rooms : 0, lost = r.roos * adr;
    return ctile('pf-trading', 'Rooms out of service · ' + r.dow.slice(0, 3) + ' ' + dlabel(r.d), num(r.roos) + ' <small>rooms</small> <span>' + gbp(lost) + '</span>', 'valued at that night’s ADR of ' + gbp(adr, 2) + (act ? ' · ' + gbp(act.roosVal) + ' so far this month' : '') + ' · plus ' + T.STAFF + ' staff rooms (' + gbp(T.STAFF * T.STAFF_RATE) + ' a night) and ' + T.STORE + ' storage');
  }
  function rp(rooms, share) { return num(rooms) + ' <small>rooms</small> <span>' + pc(share) + '</span>'; }
  function ctile(go, l, v, d) { return '<button class="tile click" data-go="' + go + '"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + (d || '') + '</div></button>'; }
  function tile(l, v, d) { return '<div class="tile"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + (d || '') + '</div></div>'; }

  /* ---------- highlights shared by the hub, the drawer and the Action Centre ---------- */
  function highlights() {
    var T = window.Trading, S = T ? T.S() : {}, a = acc(), hl = [];
    if (S.af && S.af.rows.length) {
      var cut = T.asOfDay(), m = cut.slice(0, 7), act = T.agg(T.rowsFor(m, 'actual')), bks = T.agg(T.rowsFor(m, 'books'));
      T.observations(m, act, bks, true).forEach(function (o) { hl.push([o[0], o[1], o[2], 'pf-trading', 'Guestline']); });
      var X = S.x || {};
      if (X.company) { var ota = 0; X.company.rows.forEach(function (r) { if (/^(BOOK|EXPE)/.test(r.ref)) ota += r.rn; }); hl.push(['bad', pc(ota / X.company.total.rn) + ' of room nights come through Booking.com and Expedia', 'Commission is paid on all of it. Moving bookings to the hotel’s own website is the largest single saving available.', 'pf-demand', 'Guestline']); }
      if (X.overrides && X.overrides.byOp['Automatic (system)'] && X.overrides.byOp['Automatic (system)'].diff < 0) { var au = X.overrides.byOp['Automatic (system)']; hl.push(['bad', 'Automatic rate cuts of ' + pc(-au.diff / au.pre) + ' on ' + num(au.c) + ' bookings', gbp(-au.diff) + ' taken off rates between ' + dlabel(X.overrides.from) + ' and ' + dlabel(X.overrides.to) + '. Confirm which booking-site promotions are switched on.', 'pf-demand', 'Guestline']); }
      if (X.rooms) { var stf = staffRooms(), lo = X.rooms.oos.filter(function (o) { return stf.indexOf(o.id) < 0 && o.since && (Date.parse(X.rooms.asOf.slice(0, 10)) - Date.parse(o.since)) / 864e5 > 30; }); if (lo.length) hl.push(['bad', lo.length + ' rooms have been out of service for over 30 days', 'Rooms ' + lo.map(function (o) { return o.id; }).join(', ') + '. Each is a room that cannot be sold.', 'pf-demand', 'Guestline']); }
      if (X.cancels) { var c0 = X.cancels.byLead['On the day'] || { c: 0, lost: 0 }, c1 = X.cancels.byLead['1 to 2 days before'] || { c: 0, lost: 0 }; hl.push(['warn', num(c0.c + c1.c) + ' bookings cancelled within two days of arrival', gbp(c0.lost + c1.lost) + ' at booked value over the past year. Check which rates allow free cancellation that late.', 'pf-demand', 'Guestline']); }
    }
    if (a) accObs(a).forEach(function (o) { hl.push([o[0], o[1], o[2], o[3], 'Xero']); });
    return { bad: hl.filter(function (x) { return x[0] === 'bad'; }), warn: hl.filter(function (x) { return x[0] !== 'bad'; }) };
  }
  var DKEY = 'hosbusiness_done';
  function doneMap() { try { return JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch (e) { return {}; } }
  function hid(t) { var x = 0, tx = String(t).replace(/<[^>]+>/g, ''); for (var i = 0; i < tx.length; i++) x = (x * 31 + tx.charCodeAt(i)) >>> 0; return 'a' + x.toString(36); }
  function savings() { var out = []; document.querySelectorAll('#t-save .finding').forEach(function (f) { var h3 = f.querySelector('h3'), p = f.querySelector('p'); if (h3) out.push([f.classList.contains('good') ? 'good' : 'warn', h3.innerHTML, p ? p.innerHTML : '', 'save', 'Xero costs']); }); return out; }
  function hlList(list, cls) {
    var D = doneMap(), open = list.filter(function (x) { return !D[hid(x[1])]; }), done = list.filter(function (x) { return D[hid(x[1])]; });
    var one = function (x, isDone) { var id = hid(x[1]); return '<div class="act ' + (cls || x[0]) + (isDone ? ' done' : '') + '"><label class="tick" title="Tick when dealt with"><input type="checkbox" data-done="' + id + '"' + (isDone ? ' checked' : '') + '><span></span></label><div class="act-b" data-go="' + x[3] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p><span class="hp-src">' + x[4] + ' · open page</span></div></div>'; };
    return list.length ? open.map(function (x) { return one(x, false); }).join('') + (done.length ? '<p class="act-done">Ticked off (' + done.length + ')</p>' + done.map(function (x) { return one(x, true); }).join('') : '') : '<p class="note">Nothing here.</p>';
  }
  function openCount(list) { var D = doneMap(); return list.filter(function (x) { return !D[hid(x[1])]; }).length; }
  function drawer(kind) {
    var H = highlights(), d = $('drawer'), list = kind === 'bad' ? H.bad : H.warn;
    d.innerHTML = '<div class="dr-h"><div><h2>' + (kind === 'bad' ? 'Actions' : 'Watch list') + '</h2><p>' + list.length + ' items, worked out from the latest data</p></div><button class="dr-x" aria-label="Close">×</button></div><div class="dr-b">' + hlList(list, kind === 'bad' ? 'bad' : null) + '</div><div class="dr-f"><button class="btn" data-go="pf-actions">Open the Action Centre</button></div>';
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() { document.body.classList.remove('drawer-open'); }

  /* ---------- Hub ---------- */
  var CARDS = [['pf-trading', 'trading', 'Trading', 'Occupancy, rate, RevPAR and revenue by night'], ['pf-demand', 'demand', 'Channels & rates', 'Booking sources, rate plans, cancellations, no-shows'], ['pf-fb', 'fb', 'Food & beverage', 'Sales by outlet and meal against what was bought'], ['pf-profit', 'profit', 'Profitability', 'Revenue, costs and profit by month and department'], ['pf-labour', 'labour', 'Labour', 'Payroll by department, agency and employer costs'], ['pf-trends', 'kpi', 'Trends', 'ADR, RevPAR, TRevPAR, revenue and costs over time'], ['pf-stock', 'stock', 'Purchased vs consumed', 'Purchases against cost of sales in the accounts'], ['explore', 'explore', 'Supplier costs', 'Every cost line by supplier, type, section and month'], ['bar', 'bar', 'Bar & keg prices', 'Keg price history and market comparison'], ['rooms', 'rooms', 'Rooms, linen & housekeeping', 'Linen, cleaning, guest supplies and waste'], ['pf-actions', 'actions', 'Action Centre', 'Actions, watch list, savings and checks'], ['pf-data', 'data', 'Data & reports', 'What has been imported, when, and the Gmail feed']];
  /* card photographs: add a file to costs/img and name it here, e.g. trading: 'card-trading.jpg' */
  var CARD_IMG = {}, CARD_DEFAULT = 'card-default.jpg';
  var TITLES = { 'pf-kpi': 'Trends · Monthly KPI tables', 'pf-home': 'Hub', 'pf-brief': 'Project brief', 'pf-help': 'How figures are worked out', save: 'Action Centre · Savings & checks', update: 'Data & reports · Load Xero exports' };
  CARDS.forEach(function (c) { TITLES[c[0]] = c[2]; });
  function renderHome() {
    var el = $('pf-home'), T = window.Trading, S = T ? T.S() : {}, a = acc(), PD = window.Profit.data(), h = '', card = {}, H = highlights();
    var who = (window.Profit.user() || '').split(/\s+/)[0], hr = new Date().getHours();

    /* v39.10 — Manager's Flash slot. Fills in asynchronously via fetchManagerFlash(). */
    h += '<div id="mf-slot" class="mf-slot"><div class="mf-load">🎩 ARIA is preparing your Manager\'s Flash…</div></div>';

    h += '<div class="hp-hero"><div><h2>' + (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + (who ? ', ' + esc(who) : '') + '</h2><p>Business intelligence for Brandon Hall Hotel &amp; Spa: trading, profit and costs in one place</p></div>' +
      '<div class="hp-btns"><button class="pillbtn bad" data-drawer="bad"><b>' + openCount(H.bad) + '</b>Actions</button><button class="pillbtn warn" data-drawer="warn"><b>' + openCount(H.warn) + '</b>Watch list</button><button class="iconbtn" data-go="pf-brief" title="Project brief">' + icon('brief', 30) + '<span>Project brief</span></button><button class="iconbtn" data-go="pf-help" title="How figures are worked out">' + icon('kpi', 30) + '<span>How it’s worked out</span></button></div></div>';
    var today = '', mark = h.length;
    if (S.af && S.af.rows.length) {
      var cut = T.asOfDay(), m = cut.slice(0, 7), rows = S.af.rows, R = T.ROOMS, to = rows.filter(function (r) { return r.d === cut; })[0], yd = rows.filter(function (r) { return r.d < cut; }).slice(-1)[0];
      var act = T.agg(T.rowsFor(m, 'actual')), bks = T.agg(T.rowsFor(m, 'books')), all = T.agg(T.rowsFor(m));
      var nx = rows.filter(function (r) { return r.d >= cut; }).slice(0, 14), n7 = T.agg(nx.slice(0, 7)), oos = S.x && S.x.rooms ? S.x.rooms.oos.length : (to ? to.roos : null);
      var rate = function (r) { return r && r.rooms ? T.net(r.acc) / r.rooms : null; };
      var age = Math.floor((Date.now() - Date.parse(S.af.asOf.slice(0, 10))) / 864e5), yrev = yd ? T.net(yd.acc + yd.fb + yd.oth) : null;
      today = '<div class="hp-today"><div class="hp-th">' + icon('trading', 38) + '<div><h3>Latest trading position</h3><p>Last full day: ' + (yd ? yd.dow + ' ' + dlabel(yd.d) : '–') + ' · from the Guestline report received ' + when(S.af.asOf) + '</p></div>' + (age >= 1 ? '<span class="pill warn" style="margin-left:auto">Report is ' + age + ' day' + (age > 1 ? 's' : '') + ' old · load the latest to update</span>' : '') + '<button class="hp-link" style="display:none" data-go="pf-trading"' + (age >= 1 ? ' style="margin-left:10px"' : '') + '>Open Trading</button></div><div class="tiles">' +
        ctile('pf-trading', 'Yesterday · ' + (yd ? yd.dow.slice(0, 3) + ' ' + dlabel(yd.d) : ''), yd ? rp(yd.rooms, yd.rooms / R) : '–', yd ? 'of ' + R + ' rooms · ' + pc(yd.rooms / T.LETTABLE) + ' of the ' + T.LETTABLE + ' to sell · ' + gbp(rate(yd), 2) + ' ADR' : '') +
        ctile('pf-trading', 'Yesterday’s revenue', gbp(yrev), yd ? 'rooms ' + gbp(T.net(yd.acc)) + ' · F&amp;B ' + gbp(T.net(yd.fb)) + ' · other ' + gbp(T.net(yd.oth)) : '') +
        ctile('pf-trading', 'Month to date', gbp(act.total), num(act.rooms) + ' room nights · ' + pc(act.occ) + ' occupancy · ' + gbp(act.adr, 2) + ' ADR') +
        ctile('pf-trading', 'Tonight, on the books', to ? rp(to.rooms, to.rooms / R) : '–', to ? gbp(rate(to), 2) + ' ADR · ' + gbp(T.net(to.acc)) + ' rooms revenue' : '') +
        (to && to.arr !== undefined ? ctile('pf-trading', 'Arrivals and departures today', num(to.arr) + ' <small>in</small> <span>' + num(to.dep) + ' out</span>', 'rooms arriving and leaving, from this morning’s report') : ctile('pf-trading', 'Month, with bookings held', gbp(act.total + bks.total), pc(all.occ) + ' occupancy for the month')) +
        mealTile(S, cut) + brkTile(S, yd) +
        ctile('pf-trading', 'Next 7 nights, on the books', rp(n7.rooms, n7.occ), 'room nights of ' + num(R * 7) + ' · ' + gbp(n7.acc) + ' rooms revenue') +
        oosTile(S, to, R, yd, act) + ctile('pf-trading', 'Month, with bookings held', gbp(act.total + bks.total), pc(all.occ) + ' occupancy for the month') + '</div>' +
        '<div class="hp-chart"><div class="hp-key" id="hp-key"></div><div class="hp-plot"><canvas id="hp-c1"></canvas></div></div><p class="note" style="margin:8px 0 0">14 nights back and 14 ahead, net of VAT. Revenue is what Guestline posted for each day: rooms, food and beverage (restaurant and bar together) and other (events, spa and sundries). Solid is actual; dotted, right of the “report date” line, is what is on the books so far. Click a name in the key to hide or show its line.</p></div>';
      card.kpi = 'RevPAR ' + gbp(act.revpar, 2) + ' · TRevPAR ' + gbp(act.trevpar, 2) + ' this month'; card.trading = pc(act.occ) + ' occupancy · ' + gbp(act.adr, 2) + ' ADR this month'; card.rooms = num(oos) + ' rooms out of service';
      var X = S.x || {}; if (X.company) { var ota = 0; X.company.rows.forEach(function (r) { if (/^(BOOK|EXPE)/.test(r.ref)) ota += r.rn; }); card.demand = pc(ota / X.company.total.rn) + ' of room nights via booking sites'; }
      var pe = T.pePeriod('month', m); if (pe) card.fb = gbp(T.peGroup(pe, 'FOOD').total[0] + T.peGroup(pe, 'BEVERAGE').total[0]) + ' food and drink sales this month';
    }
    if (PD && PD.IDS && PD.IDS.length) {
      var id = PD.IDS[PD.IDS.length - 1], mo = PD.M[id], row = function (l) { var f = (mo.pl || []).filter(function (r) { return r.label === l; })[0]; return f ? f.ma : null; };
      var rev = row('TOTAL REVENUE'), man = row('Total Manning');
      card.profit = PD.XM ? PD.XM.label.split(' ')[0] + ': ' + (PD.XM.cur.net < 0 ? 'loss of ' : 'profit of ') + gbp(Math.abs(PD.XM.cur.net)) + ' on ' + gbp(PD.XM.cur.rev) : PD.LABEL[id] + ': EBITDA ' + gbp(row('EBITDA'));
      card.labour = PD.XM ? 'Payroll ' + pc(PD.XM.cur.pay / PD.XM.cur.rev) + ' of sales, ' + PD.XM.label.split(' ')[0] : (man && rev ? 'Payroll ' + pc(man / rev) + ' of revenue' : ''); 
    }
    if (window.CostsApp) { var tx = window.CostsApp.tx(), t = 0; tx.forEach(function (r) { t += r.net || 0; }); if (t) card.explore = gbp(t) + ' of supplier costs analysed'; }
    h = h.slice(0, mark) + today + h.slice(mark);
    card.actions = openCount(H.bad) + ' actions · ' + openCount(H.warn) + ' to watch'; card.data = (S.received ? S.received.length : 0) + ' Guestline reports on record';
    h += '<div class="hp-cards">' + CARDS.map(function (c) { return '<button class="hp-card' + (c[1] === 'trading' ? ' hot' : '') + '" data-go="' + c[0] + '" style="--c:' + COL[c[1]] + ';--img:url(img/' + (CARD_IMG[c[1]] || CARD_DEFAULT) + ')">' + icon(c[1]) + '<span><b>' + c[2] + '</b><small>' + c[3] + '</small>' + (card[c[1]] ? '<em>' + esc(card[c[1]]) + '</em>' : '') + '</span></button>'; }).join('') + '</div>' +
      '<p class="hp-foot"><a data-go="pf-data">Data references</a> · where every figure comes from and when it was imported &nbsp;|&nbsp; <a data-go="pf-help">How figures are worked out</a> &nbsp;|&nbsp; <a data-go="pf-brief">Project brief</a></p>';
    el.innerHTML = h;
    hubChart();
    try { fetchAndRenderFlash(); } catch (e) {}
  }

  /* ============================================================
     v39.10 — Manager's Flash section
     ============================================================ */

  var FN_BASE = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/';
  var MF_CACHE_KEY = 'hosbusiness_mf_cache';
  var MF_CACHE_TTL = 30 * 60 * 1000;
  var MF_INFLIGHT = false;

  function mfToken() { try { return localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) { return null; } }
  function mfGetCache() { try { var o = JSON.parse(localStorage.getItem(MF_CACHE_KEY) || 'null'); if (!o) return null; return o; } catch (e) { return null; } }
  function mfSetCache(o) { try { localStorage.setItem(MF_CACHE_KEY, JSON.stringify(o)); } catch (e) {} }

  function mfGbp(n) { if (n == null || !isFinite(n)) return '–'; return (n < 0 ? '−' : '') + '£' + Math.abs(Math.round(n)).toLocaleString('en-GB'); }
  function mfGbpDp(n) { if (n == null || !isFinite(n)) return '–'; return (n < 0 ? '−' : '') + '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function mfPct(n) { if (n == null) return '–'; return (n * 100).toFixed(1) + '%'; }
  function mfNum(n) { if (n == null) return '–'; return Number(n).toLocaleString('en-GB'); }

  function fetchAndRenderFlash() {
    var slot = document.getElementById('mf-slot');
    if (!slot) return;
    var tok = mfToken();
    if (!tok) { slot.innerHTML = ''; return; }
    var cached = mfGetCache();
    if (cached && cached.ts && (Date.now() - cached.ts) < MF_CACHE_TTL && cached.flash) {
      slot.innerHTML = renderFlash(cached.flash, cached.commentary);
      // refresh in background
      refreshFlash(true);
    } else {
      refreshFlash(false);
    }
  }

  function refreshFlash(silent) {
    if (MF_INFLIGHT) return;
    var tok = mfToken(); if (!tok) return;
    MF_INFLIGHT = true;
    var slot = document.getElementById('mf-slot');
    // First fetch the data (fast — no Gemini)
    fetch(FN_BASE + 'managerFlash', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.flash) throw new Error('bad flash response');
        var cached = mfGetCache() || {};
        cached.ts = Date.now(); cached.flash = j.flash;
        mfSetCache(cached);
        if (slot) slot.innerHTML = renderFlash(j.flash, cached.commentary);
        // Then fetch the commentary (slower — triggers Gemini). Only if we don't have a fresh one.
        if (!cached.commentary || !cached.commentaryTs || (Date.now() - cached.commentaryTs) > 60 * 60 * 1000) {
          return fetch(FN_BASE + 'managerFlashCommentary', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: '{}'
          }).then(function (r) { return r.json(); }).then(function (j2) {
            if (j2 && j2.ok) {
              cached.commentary = j2.commentary; cached.briefHeadline = j2.briefHeadline; cached.commentaryTs = Date.now();
              mfSetCache(cached);
              if (slot) slot.innerHTML = renderFlash(j2.flash || cached.flash, j2.commentary, j2.briefHeadline);
            }
          }).catch(function () {});
        }
      })
      .catch(function () {
        if (slot && !silent) slot.innerHTML = '<div class="mf-err">Manager\'s Flash couldn\'t be loaded. The hub session may have expired.</div>';
      })
      .finally(function () { MF_INFLIGHT = false; });
  }

  function renderFlash(flash, commentary, briefHeadline) {
    if (!flash) return '';
    var d = flash.day, w = flash.week, m = flash.month, y = flash.year, la = flash.lookAhead;
    var dow = flash.dow || [], t7 = flash.trailing7 || [], items = flash.items || null;
    var dateHuman = flash.forDate ? new Date(flash.forDate + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

    function cell(v, f) { return '<td class="mf-n">' + (f ? f(v) : v) + '</td>'; }
    function rrow(label, da, wa, ma, ya, f) {
      return '<tr><td class="mf-l">' + esc(label) + '</td>' + cell(da, f) + cell(wa, f) + cell(ma, f) + cell(ya, f) + '</tr>';
    }

    // ARIA Commentary — four paragraphs
    var commentaryHtml = '';
    if (commentary) {
      commentaryHtml = '<div class="mf-com"><div class="mf-com-hd">🎩 ARIA · Daily Commentary</div>' +
        (commentary.overnight ? '<p><b>Overnight.</b> ' + esc(commentary.overnight) + '</p>' : '') +
        (commentary.period ? '<p><b>Period view.</b> ' + esc(commentary.period) + '</p>' : '') +
        (commentary.weekday ? '<p><b>Weekday pattern.</b> ' + esc(commentary.weekday) + '</p>' : '') +
        (commentary.ahead ? '<p><b>Ahead.</b> ' + esc(commentary.ahead) + '</p>' : '') +
        '</div>';
    }

    // Spotlight deep-dive (rotating lens, varies daily)
    var spotlightHtml = '';
    if (commentary && commentary.spotlight) {
      spotlightHtml = '<div class="mf-spot"><div class="mf-spot-hd">🔎 Today\'s spotlight</div>' +
        '<p>' + esc(commentary.spotlight) + '</p></div>';
    }

    // Flags row — anomalies / wins / misses
    var flagsHtml = '';
    if (commentary && ((commentary.anomalies || []).length || (commentary.wins || []).length || (commentary.misses || []).length)) {
      var flagCols = '';
      if (commentary.anomalies && commentary.anomalies.length) {
        flagCols += '<div class="mf-flag mf-flag-anom"><div class="mf-flag-hd">⚡ Anomalies spotted</div><ul>' +
          commentary.anomalies.slice(0, 4).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
      }
      if (commentary.wins && commentary.wins.length) {
        flagCols += '<div class="mf-flag mf-flag-win"><div class="mf-flag-hd">✓ Wins</div><ul>' +
          commentary.wins.slice(0, 3).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
      }
      if (commentary.misses && commentary.misses.length) {
        flagCols += '<div class="mf-flag mf-flag-miss"><div class="mf-flag-hd">⚠ Watch-items</div><ul>' +
          commentary.misses.slice(0, 3).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
      }
      flagsHtml = '<div class="mf-flags">' + flagCols + '</div>';
    }

    // Departmental actions
    var actionsHtml = '';
    if (commentary && commentary.actions && commentary.actions.length) {
      actionsHtml = '<h3 class="mf-sh">Actions for today · by department</h3><div class="mf-acts">' +
        commentary.actions.map(function (a) {
          var dept = (a.dept || '').replace(/[^a-z]/gi, '').toLowerCase();
          var pri  = ((a.priority || 'medium') + '').toLowerCase();
          return '<div class="mf-act mf-act-' + dept + '">' +
            '<div class="mf-act-top">' +
              '<div class="mf-act-dept">' + esc(a.dept || '') + (a.owner ? ' · ' + esc(a.owner) : '') + '</div>' +
              '<span class="mf-act-pri mf-pri-' + pri + '">' + esc((a.priority || 'med').slice(0,4).toUpperCase()) + '</span>' +
            '</div>' +
            '<div class="mf-act-text">' + esc(a.action || '') + '</div>' +
            (a.why ? '<div class="mf-act-why">Why: ' + esc(a.why) + '</div>' : '') +
          '</div>';
        }).join('') +
      '</div>';
    }

    var briefHtml = briefHeadline ? '<div class="mf-brief"><b>ARIA\'s brief today:</b> ' + esc(briefHeadline) + '</div>' : '';

    // KPI row
    var kpiHtml = '<div class="mf-kpi">' +
      '<div class="mf-kpi-t mf-kpi-occ"><div class="mf-kpi-l">Occupancy</div><div class="mf-kpi-v">' + mfPct(d.occ) + '</div><div class="mf-kpi-s">' + d.sold + ' of ' + d.stock + ' rooms</div></div>' +
      '<div class="mf-kpi-t mf-kpi-adr"><div class="mf-kpi-l">ADR (net)</div><div class="mf-kpi-v">' + mfGbpDp(d.adrNet) + '</div><div class="mf-kpi-s">accommodation</div></div>' +
      '<div class="mf-kpi-t mf-kpi-rev"><div class="mf-kpi-l">RevPAR</div><div class="mf-kpi-v">' + mfGbpDp(d.revparNet) + '</div><div class="mf-kpi-s">net, per available room</div></div>' +
      '<div class="mf-kpi-t mf-kpi-tot"><div class="mf-kpi-l">Total Revenue</div><div class="mf-kpi-v">' + mfGbp(d.revNet) + '</div><div class="mf-kpi-s">TRevPAR ' + mfGbpDp(d.trevparNet) + '</div></div>' +
      '</div>';

    // Last 7 nights mini chart
    var chartHtml = '';
    if (t7 && t7.length) {
      var maxRev = 1; t7.forEach(function (x) { var r = +x.rev || 0; if (r > maxRev) maxRev = r; });
      chartHtml = '<h3 class="mf-sh">Last 7 nights · total revenue</h3><div class="mf-chart">' +
        t7.map(function (x) {
          var h = Math.round(((+x.rev || 0) / maxRev) * 110);
          var cls = (x.d === flash.forDate) ? ' mf-bar-y' : '';
          var dd = (x.d || '').slice(8) + '/' + (x.d || '').slice(5, 7);
          return '<div class="mf-bar-col"><div class="mf-bar-v">' + mfGbp(x.rev) + '</div><div class="mf-bar' + cls + '" style="height:' + h + 'px"></div><div class="mf-bar-dow">' + esc(x.dow) + '</div><div class="mf-bar-d">' + esc(dd) + '</div></div>';
        }).join('') +
      '</div>';
    }

    // F&B breakdown
    var fbHtml = '<h3 class="mf-sh">Food &amp; Beverage</h3>' +
      '<table class="mf-t"><thead><tr><th>Metric</th><th>Day</th><th>WTD</th><th>MTD</th><th>YTD</th></tr></thead><tbody>' +
        rrow('Total F&B', d.fbNet, w.fbNet, m.fbNet, y.fbNet, mfGbp) +
        rrow('— Food', d.foodNet, w.foodNet, m.foodNet, y.foodNet, mfGbp) +
        rrow('— Beverage', d.bevNet, w.bevNet, m.bevNet, y.bevNet, mfGbp) +
        rrow('— Conference', d.confNet, w.confNet, m.confNet, y.confNet, mfGbp) +
        rrow('F&B per occupied room', d.perRoomFB, w.perRoomFB, m.perRoomFB, y.perRoomFB, mfGbpDp) +
      '</tbody></table>';

    // Yesterday's items
    var itemsHtml = '';
    if (items) {
      var ps = items.postingSplit || {};
      var total = ((ps.till && ps.till.rev) || 0) + ((ps.roomCharge && ps.roomCharge.rev) || 0) + ((ps.manual && ps.manual.rev) || 0);
      var tillPct = total ? Math.round((ps.till.rev / total) * 100) : 0;
      var roomPct = total ? Math.round((ps.roomCharge.rev / total) * 100) : 0;
      var manPct  = total ? Math.round((ps.manual.rev / total) * 100) : 0;
      itemsHtml = '<h3 class="mf-sh">Yesterday\'s restaurant &amp; bar · how it was posted</h3>' +
        '<div class="mf-posts">' +
          '<div class="mf-post mf-post-till"><div class="mf-post-l">Till · paid direct</div><div class="mf-post-v">' + mfGbp(ps.till ? ps.till.rev : 0) + '</div><div class="mf-post-s">' + (ps.till ? ps.till.qty : 0) + ' lines · ' + tillPct + '%</div></div>' +
          '<div class="mf-post mf-post-room"><div class="mf-post-l">Charged to room</div><div class="mf-post-v">' + mfGbp(ps.roomCharge ? ps.roomCharge.rev : 0) + '</div><div class="mf-post-s">' + (ps.roomCharge ? ps.roomCharge.qty : 0) + ' lines · ' + roomPct + '%</div></div>' +
          '<div class="mf-post mf-post-man"><div class="mf-post-l">Posted by hand</div><div class="mf-post-v">' + mfGbp(ps.manual ? ps.manual.rev : 0) + '</div><div class="mf-post-s">' + (ps.manual ? ps.manual.qty : 0) + ' lines · ' + manPct + '%</div></div>' +
        '</div>';

      if (items.topByRev && items.topByRev.length) {
        itemsHtml += '<h3 class="mf-sh">Top items sold yesterday · by revenue</h3>' +
          '<table class="mf-t mf-items"><thead><tr><th>Code</th><th>Item</th><th class="mf-n">Qty</th><th class="mf-n">Net</th></tr></thead><tbody>' +
            items.topByRev.map(function (it) {
              return '<tr><td class="mf-code">' + esc(it.code || '') + '</td><td>' + esc(it.name || '') + '</td>' +
                '<td class="mf-n">' + (it.qty || 0) + '</td><td class="mf-n"><b>' + mfGbp(it.net) + '</b></td></tr>';
            }).join('') +
          '</tbody></table>';
      }
    }

    // DOW table
    var dowHtml = '';
    if (dow.length) {
      dowHtml = '<h3 class="mf-sh">Weekday pattern · last 30 days</h3>' +
        '<table class="mf-t"><thead><tr><th>Weekday</th><th class="mf-n">Sampled</th><th class="mf-n">Occ</th><th class="mf-n">ADR</th><th class="mf-n">RevPAR</th><th class="mf-n">Revenue</th></tr></thead><tbody>' +
          dow.map(function (x) {
            return '<tr><td class="mf-l"><b>' + esc(x.day) + '</b></td><td class="mf-n">' + x.n + '</td>' +
              '<td class="mf-n">' + (x.occ != null ? mfPct(x.occ) : '–') + '</td>' +
              '<td class="mf-n">' + (x.adr != null ? mfGbpDp(x.adr) : '–') + '</td>' +
              '<td class="mf-n">' + (x.revpar != null ? mfGbpDp(x.revpar) : '–') + '</td>' +
              '<td class="mf-n"><b>' + (x.rev != null ? mfGbp(x.rev) : '–') + '</b></td></tr>';
          }).join('') +
        '</tbody></table>';
    }

    var laHtml = '';
    if (la) {
      var laItems = [
        ['Today', la.today], ['Next 7 nights', la.next7], ['Next 4 weeks', la.next28],
        ['End of month', la.monthEnd], ['End of year', la.yearEnd]
      ];
      laHtml = '<div class="mf-la"><div class="mf-la-hd">Look Ahead · occupancy</div><div class="mf-la-row">' +
        laItems.map(function (x) { return '<div class="mf-la-t"><div class="mf-la-l">' + x[0] + '</div><div class="mf-la-v">' + mfPct(x[1]) + '</div></div>'; }).join('') +
        '</div></div>';
    }

    return (
      '<div class="mf-card">' +
        '<div class="mf-hd">' +
          '<div><div class="mf-hd-kicker">Daily Business Update · ' + esc(flash.hotel) + '</div>' +
          '<h2>' + esc(dateHuman) + '</h2></div>' +
          '<div class="mf-hd-r"><button class="mf-btn" data-mf-refresh>↻ Refresh</button></div>' +
        '</div>' +
        commentaryHtml +
        spotlightHtml +
        flagsHtml +
        briefHtml +
        actionsHtml +
        kpiHtml +
        '<h3 class="mf-sh">Revenue · net of VAT</h3>' +
        '<table class="mf-t"><thead><tr><th>Metric</th><th>Day</th><th>WTD</th><th>MTD</th><th>YTD</th></tr></thead><tbody>' +
          rrow('Total revenue', d.revNet, w.revNet, m.revNet, y.revNet, mfGbp) +
          rrow('— Accommodation', d.accomNet, w.accomNet, m.accomNet, y.accomNet, mfGbp) +
          rrow('— Food & Beverage', d.fbNet, w.fbNet, m.fbNet, y.fbNet, mfGbp) +
          rrow('— Conference', d.confNet, w.confNet, m.confNet, y.confNet, mfGbp) +
          rrow('— Misc & Sundries', (d.otherNet - d.confNet), (w.otherNet - w.confNet), (m.otherNet - m.confNet), (y.otherNet - y.confNet), mfGbp) +
          rrow('Payments received', d.payments, w.payments, m.payments, y.payments, mfGbp) +
        '</tbody></table>' +
        fbHtml +
        itemsHtml +
        chartHtml +
        dowHtml +
        '<h3 class="mf-sh">Rooms &amp; rates</h3>' +
        '<table class="mf-t"><thead><tr><th>Metric</th><th>Day</th><th>WTD</th><th>MTD</th><th>YTD</th></tr></thead><tbody>' +
          rrow('Rooms sold', d.sold, w.sold, m.sold, y.sold, mfNum) +
          rrow('Occupancy %', d.occ, w.occ, m.occ, y.occ, mfPct) +
          rrow('ADR (net)', d.adrNet, w.adrNet, m.adrNet, y.adrNet, mfGbpDp) +
          rrow('RevPAR (net)', d.revparNet, w.revparNet, m.revparNet, y.revparNet, mfGbpDp) +
          rrow('TRevPAR (net)', d.trevparNet, w.trevparNet, m.trevparNet, y.trevparNet, mfGbpDp) +
          rrow('Revenue / occupied room', d.perRoom, w.perRoom, m.perRoom, y.perRoom, mfGbpDp) +
          rrow('F&B / occupied room', d.perRoomFB, w.perRoomFB, m.perRoomFB, y.perRoomFB, mfGbpDp) +
          rrow('Total guests', d.sleepers, w.sleepers, m.sleepers, y.sleepers, mfNum) +
          rrow('Rooms OOS', d.oos, w.oos, m.oos, y.oos, mfNum) +
          rrow('Rooms DFS', d.dfs, w.dfs, m.dfs, y.dfs, mfNum) +
        '</tbody></table>' +
        laHtml +
        '<div class="mf-ft">All figures net of VAT. WTD = Monday to yesterday. MTD = 1st of month to yesterday. YTD = 1 January to yesterday. Items shown from Rezlynx POS postings; manual entries carry no item name so are shown as totals only. · Live from the Guestline API feed and ARIA.</div>' +
      '</div>'
    );
  }

  // Refresh click
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('[data-mf-refresh]')) {
      try { localStorage.removeItem(MF_CACHE_KEY); } catch (err) {}
      refreshFlash(false);
    }
  });

  // Inject Manager's Flash CSS once
  (function () {
    if (document.getElementById('mf-css')) return;
    var s = document.createElement('style'); s.id = 'mf-css';
    s.textContent = [
      '.mf-slot{max-width:1680px;margin:0 auto 18px}',
      '.mf-load{background:#fff;border:1px dashed #d4d2cb;border-radius:12px;padding:30px;text-align:center;color:#7b8494;font-size:14px}',
      '.mf-err{background:#fdf6f5;border:1px solid #c0362b;border-radius:12px;padding:16px;color:#8a1e15;font-size:13px}',
      '.mf-card{background:#fff;border:1px solid #e4e2dc;border-radius:14px;padding:22px 26px;box-shadow:0 2px 8px rgba(8,16,26,.05)}',
      '.mf-hd{display:flex;align-items:flex-start;gap:16px;border-bottom:1px solid #efece5;padding-bottom:12px;margin-bottom:16px}',
      '.mf-hd-kicker{font-size:11px;font-weight:700;letter-spacing:.5px;color:#9d7d5f;text-transform:uppercase}',
      '.mf-hd h2{margin:3px 0 0;font-size:20px;font-weight:700;color:#1a2238;letter-spacing:-.2px}',
      '.mf-hd-r{margin-left:auto}',
      '.mf-btn{background:#eef3f8;border:1px solid #d4d2cb;color:#2c3440;padding:7px 12px;border-radius:6px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600}',
      '.mf-btn:hover{background:#eceae3}',
      '.mf-com{background:#eef7f9;border:1px solid #c8d9dd;border-left:4px solid #C7A87A;border-radius:6px;padding:14px 16px;margin-bottom:16px}',
      '.mf-com-hd{font-size:11px;font-weight:700;letter-spacing:.5px;color:#8a6e3f;text-transform:uppercase;margin-bottom:8px}',
      '.mf-com p{margin:0 0 8px;font-size:13.5px;line-height:1.55;color:#2c3440}',
      '.mf-com p:last-child{margin-bottom:0}',
      '.mf-com p b{color:#1a2238}',
      '.mf-brief{background:#eef3f8;border-left:3px solid #1F7A8C;border-radius:6px;padding:9px 12px;font-size:13px;color:#2c3440;margin-bottom:16px}',
      '.mf-brief b{color:#1a3b60;font-weight:700}',
      '.mf-sh{font-size:12px;font-weight:700;letter-spacing:.4px;color:#52514e;text-transform:uppercase;margin:16px 0 8px}',
      '.mf-t{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:6px}',
      '.mf-t th{background:#eef3f8;text-align:left;padding:8px 12px;font-size:11px;letter-spacing:.3px;font-weight:600;color:#52514e;text-transform:uppercase;border-bottom:1px solid #c8d9dd}',
      '.mf-t th:not(:first-child){text-align:right}',
      '.mf-t td{padding:7px 12px;border-bottom:1px solid #f1efe9;font-size:13.5px;color:#2c3440}',
      '.mf-t td.mf-l{color:#52514e}',
      '.mf-t td.mf-n{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#1a2238}',
      '.mf-t tr:hover td{background:#fafaf6}',
      '.mf-la{margin-top:16px;padding:14px 16px;background:#eef3f8;border-radius:8px}',
      '.mf-la-hd{font-size:11px;font-weight:700;letter-spacing:.5px;color:#52514e;text-transform:uppercase;margin-bottom:10px}',
      '.mf-la-row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
      '.mf-la-t{background:#fff;border:1px solid #c8d9dd;border-radius:6px;padding:10px;text-align:center}',
      '.mf-la-l{font-size:10.5px;color:#7b8494;text-transform:uppercase;letter-spacing:.3px;font-weight:600}',
      '.mf-la-v{font-size:19px;font-weight:700;color:#1a2238;margin-top:3px}',
      '.mf-ft{font-size:11px;color:#7b8494;margin-top:14px;padding-top:12px;border-top:1px solid #efece5;line-height:1.5}',
      // KPI row
      '.mf-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 18px}',
      '.mf-kpi-t{padding:14px 12px;border-radius:8px;text-align:center;color:#fff}',
      '.mf-kpi-occ{background:#1a2238}',
      '.mf-kpi-adr{background:#1F7A8C}',
      '.mf-kpi-rev{background:#145866}',
      '.mf-kpi-tot{background:#0f1424}',
      '.mf-kpi-l{font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;font-weight:700;opacity:.85}',
      '.mf-kpi-v{font-size:22px;font-weight:800;margin-top:3px;letter-spacing:-.2px}',
      '.mf-kpi-s{font-size:10.5px;margin-top:2px;opacity:.78}',
      // Mini chart
      '.mf-chart{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-items:end;height:170px;padding:10px 0;margin-bottom:6px}',
      '.mf-bar-col{text-align:center;display:flex;flex-direction:column;align-items:center;height:100%}',
      '.mf-bar-v{font-size:11px;font-weight:700;color:#1a2238;margin-bottom:4px}',
      '.mf-bar{width:36px;background:#1F7A8C;border-radius:4px 4px 0 0;margin-top:auto}',
      '.mf-bar-y{background:#1a2238}',
      '.mf-bar-dow{font-size:10.5px;font-weight:600;color:#52514e;margin-top:5px}',
      '.mf-bar-d{font-size:10px;color:#7b8494}',
      // Posting split cards
      '.mf-posts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}',
      '.mf-post{padding:12px 14px;border-radius:6px;text-align:center}',
      '.mf-post-till{background:#eef7f9;border:1px solid #b9d4da}',
      '.mf-post-room{background:#eef3f8;border:1px solid #c8d9dd}',
      '.mf-post-man{background:#f3f6f8;border:1px solid #d4dde3}',
      '.mf-post-l{font-size:10.5px;color:#145866;text-transform:uppercase;font-weight:700;letter-spacing:.3px}',
      '.mf-post-room .mf-post-l{color:#1a3b60}',
      '.mf-post-man .mf-post-l{color:#52647a}',
      '.mf-post-v{font-size:18px;color:#1a2238;font-weight:700;margin-top:4px}',
      '.mf-post-s{font-size:11px;color:#52514e;margin-top:2px}',
      // Items table
      '.mf-items .mf-code{color:#7b8494;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}',
      // Spotlight (gradient card)
      '.mf-spot{background:#1a2238;color:#fff;border-radius:6px;padding:16px 20px;margin-bottom:16px}',
      '.mf-spot-hd{font-size:11px;font-weight:700;letter-spacing:.8px;color:#C7A87A;text-transform:uppercase;margin-bottom:9px}',
      '.mf-spot p{margin:0;font-size:14px;line-height:1.65;color:rgba(255,255,255,.95)}',
      // Flags row (anomalies / wins / misses)
      '.mf-flags{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px}',
      '.mf-flag{padding:13px 16px;border-radius:8px;border:1px solid}',
      '.mf-flag ul{margin:0;padding-left:16px;font-size:12.5px;color:#2c3440;line-height:1.5}',
      '.mf-flag li{margin-bottom:4px}',
      '.mf-flag-hd{font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:7px}',
      '.mf-flag-anom{background:#fdf6f5;border-color:#f0d6d2}.mf-flag-anom .mf-flag-hd{color:#8a1e15}',
      '.mf-flag-win{background:#f0f6ea;border-color:#d4e3c3}.mf-flag-win .mf-flag-hd{color:#486128}',
      '.mf-flag-miss{background:#fffbe8;border-color:#ecd584}.mf-flag-miss .mf-flag-hd{color:#7a5f0b}',
      // Action cards grid
      '.mf-acts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:6px}',
      '.mf-act{padding:13px 16px;border-radius:6px;border:1px solid #c8d9dd;border-left:4px solid #1F7A8C;background:#eef3f8}',
      '.mf-act-top{display:flex;align-items:center;gap:8px;margin-bottom:5px}',
      '.mf-act-dept{font-size:10.5px;font-weight:700;letter-spacing:.3px;color:#52514e;text-transform:uppercase;flex:1}',
      '.mf-act-pri{display:inline-block;padding:2px 7px;color:#fff;font-size:9px;font-weight:700;letter-spacing:.3px;border-radius:9px;text-transform:uppercase}',
      '.mf-pri-high{background:#c0362b}.mf-pri-medium{background:#1F7A8C}.mf-pri-low{background:#7b8494}',
      '.mf-act-text{font-size:13.5px;color:#2c3440;font-weight:600;line-height:1.45}',
      '.mf-act-why{font-size:11.5px;color:#52514e;margin-top:4px;font-style:italic;line-height:1.45}',
      '.mf-act-frontoffice{background:#eef3f8;border-color:#c8d9dd;border-left-color:#1a3b60}.mf-act-frontoffice .mf-act-dept{color:#1a3b60}',
      '.mf-act-kitchen{background:#eef7f9;border-color:#b9d4da;border-left-color:#145866}.mf-act-kitchen .mf-act-dept{color:#145866}',
      '.mf-act-fb{background:#eef3f8;border-color:#c8d9dd;border-left-color:#1F7A8C}.mf-act-fb .mf-act-dept{color:#1F7A8C}',
      '.mf-act-housekeeping{background:#eff7f0;border-color:#c3dcc7;border-left-color:#486128}.mf-act-housekeeping .mf-act-dept{color:#486128}',
      '.mf-act-events{background:#f1eef8;border-color:#cfc5e2;border-left-color:#4a3a7a}.mf-act-events .mf-act-dept{color:#4a3a7a}',
      '.mf-act-revenue{background:#1a2238;color:#fff;border-color:#1a2238;border-left-color:#C7A87A}',
      '.mf-act-revenue .mf-act-dept{color:#C7A87A}.mf-act-revenue .mf-act-text{color:#fff}.mf-act-revenue .mf-act-why{color:rgba(255,255,255,.75)}',
      '@media (max-width:1100px){.mf-flags,.mf-acts{grid-template-columns:1fr}}',
      '@media (max-width:1100px){.mf-kpi{grid-template-columns:repeat(2,1fr)}.mf-posts{grid-template-columns:1fr}}',
      '@media (max-width:720px){.mf-la-row{grid-template-columns:repeat(2,1fr)}.mf-chart{grid-template-columns:repeat(7,1fr);height:140px}.mf-bar{width:22px}}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  var hubC = null;
  function hubChart() {
    var T = window.Trading, S = T ? T.S() : {}; if (hubC) { hubC.destroy(); hubC = null; } if (!$('hp-c1') || !S.af) return;
    var cut = T.asOfDay(), R = T.ROOMS, L = T.LETTABLE || 114, all = S.af.rows, i0 = -1; all.forEach(function (r, i) { if (r.d === cut) i0 = i; }); if (i0 < 0) i0 = all.length - 1;
    var rows = all.slice(Math.max(0, i0 - 14), i0 + 15), ti = rows.map(function (r) { return r.d; }).indexOf(cut), cx = S.x && S.x.cancels && S.x.cancels.byDay ? S.x.cancels.byDay : null;
    var BK = S.x && S.x.postings ? S.x.postings.byDay : null;
    var SER = [['ADR', '#2a78d6', 'y1', function (r) { return r.rooms ? T.net(r.acc) / r.rooms : null; }, function (v) { return gbp(v, 2); }],
      ['RevPAR', '#eb6834', 'y1', function (r) { return T.net(r.acc) / L; }, function (v) { return gbp(v, 2); }],
      ['TRevPAR', '#1baf7a', 'y1', function (r) { return T.net(r.acc + r.fb + r.oth) / L; }, function (v) { return gbp(v, 2); }],
      ['Rooms revenue', '#0f8f95', 'y4', function (r) { return T.net(r.acc); }, function (v) { return gbp(v); }],
      ['Food and beverage total', '#c2417a', 'y4', function (r) { return T.net(r.fb); }, function (v) { return gbp(v); }],
      ['Food', '#e3a43a', 'y4', function (r) { var d = S.daily && S.daily[r.d]; return d && r.d < cut ? d.food : null; }, function (v) { return gbp(v); }],
      ['Beverage', '#7a4fc4', 'y4', function (r) { var d = S.daily && S.daily[r.d]; return d && r.d < cut ? d.bev : null; }, function (v) { return gbp(v); }],
      ['Breakfast revenue', '#1a2b3a', 'y4', function (r) { var d = BK && BK[r.d]; return d ? d.biv + d.bpv : null; }, function (v) { return gbp(v); }],
      ['Other revenue', '#7b8494', 'y4', function (r) { return T.net(r.oth); }, function (v) { return gbp(v); }],
      ['Out of service, lost at ADR', '#b3261e', 'y4', function (r) { return r.rooms ? r.roos * T.net(r.acc) / r.rooms : null; }, function (v) { return gbp(v); }],
      ['Occupancy', '#6250d6', 'y2', function (r) { return r.rooms / L * 100; }, function (v) { return Math.round(v * L / 100) + ' rooms · ' + v.toFixed(1) + '%'; }],
      ['Rooms out of service', '#b3261e', 'y3', function (r) { return r.roos; }, function (v) { return Math.round(v) + ''; }, function (r) { return r.roos + (r.rooms ? ' · ' + gbp(r.roos * T.net(r.acc) / r.rooms) : ''); }],
      ['Staff rooms', '#8a6d3b', 'y3', function () { return T.STAFF; }, function (v) { return Math.round(v) + ' · ' + gbp(v * T.STAFF_RATE); }],
      ['Breakfasts in the rate', '#1a8f63', 'y3', function (r) { var d = BK && BK[r.d]; return d ? d.bi : null; }, function (v) { return Math.round(v) + ''; }],
      ['Breakfasts paid on the day', '#2a78d6', 'y3', function (r) { var d = BK && BK[r.d]; return d ? d.bp : null; }, function (v) { return Math.round(v) + ''; }],
      ['Cancellations made', '#b9791a', 'y3', function (r) { return cx && r.d < cut ? (cx[r.d] || 0) : null; }, function (v) { return Math.round(v) + ''; }]];
    var GR = [['y4', 'Revenue for the day', 4], ['y1', '£ per room', 3], ['y2', '% of ' + L + ' lettable', 2], ['y3', 'Number', 3]];
    var tv = rows[ti - 1] || rows[ti] || rows[rows.length - 1];
    $('hp-key').innerHTML = GR.map(function (g) { return '<div class="hp-kg" style="flex:' + g[2] + '"><small>' + g[1] + '</small>' + SER.map(function (x, k) { if (x[2] !== g[0]) return ''; var v = x[3](tv); return '<button data-ser="' + k + '"><i style="background:' + x[1] + '"></i><span>' + x[0] + '</span><b>' + (v === null || v === undefined ? '–' : x[5] ? x[5](tv) : x[4](v)) + '</b></button>'; }).join('') + '</div>'; }).join('') + '<small class="hp-kn">Figures in the key are for ' + tv.dow + ' ' + dlabel(tv.d) + ', the last full day. ' + R + ' rooms: ' + T.LETTABLE + ' to sell, ' + T.STAFF + ' staff rooms at ' + gbp(T.STAFF_RATE) + ' a night, ' + T.STORE + ' storage room at £0. Rooms out of service are valued at that night’s ADR.</small>';
    var scales = { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 15 } } };
    GR.slice().reverse().forEach(function (g) { var gi = g[0] === 'y1' ? 0 : g[0] === 'y2' ? 1 : g[0] === 'y4' ? 3 : 2; scales[g[0]] = { stack: 's', stackWeight: g[2], offset: true, beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, afterFit: function (a) { a.width = 52; }, ticks: { maxTicksLimit: gi ? 3 : 4, callback: function (v) { return gi === 3 ? (v >= 1000 ? '£' + v / 1000 + 'k' : '£' + v) : gi === 0 ? '£' + v : gi === 1 ? v + '%' : v; } } }; });
    scales.y2.max = 100; scales.y4.min = 0;
    hubC = new Chart($('hp-c1'), { type: 'line', data: { labels: rows.map(function (r) { return r.dow.slice(0, 3) + ' ' + +r.d.slice(8); }), datasets: SER.map(function (x) { return { label: x[0], yAxisID: x[2], data: rows.map(function (r) { var v = x[3](r); return v === null || v === undefined ? null : +(+v).toFixed(2); }), borderColor: x[1], backgroundColor: x[1], borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25, spanGaps: false, segment: { borderDash: function (c) { return ti >= 0 && c.p1DataIndex > ti ? [4, 3] : undefined; } } }; }) },
      options: { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, onClick: function () { go('pf-trading'); }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function (it) { var r = rows[it[0].dataIndex]; return r.dow + ' ' + dlabel(r.d) + (r.d > cut ? ' (on the books)' : r.d === cut ? ' (tonight)' : ''); }, label: function (c) { var x = SER[c.datasetIndex]; return c.dataset.label + ': ' + (x[5] ? x[5](rows[c.dataIndex]) : x[4](c.parsed.y)); }, afterBody: function (it) { var r = rows[it[0].dataIndex]; return ['', 'Of the ' + T.LETTABLE + ' rooms to sell: ' + (r.rooms / T.LETTABLE * 100).toFixed(1) + '% sold', 'Staff rooms: ' + T.STAFF + ' at ' + gbp(T.STAFF_RATE) + ' = ' + gbp(T.STAFF * T.STAFF_RATE) + ' · storage: ' + T.STORE + ' at £0']; } } } }, scales: scales },
      plugins: [{ id: 'today', afterDraw: function (ch) { if (ti < 0) return; var x = ch.scales.x.getPixelForValue(ti), a = ch.chartArea, c = ch.ctx; c.save(); c.strokeStyle = '#1a2b3a'; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x, a.top); c.lineTo(x, a.bottom); c.stroke(); c.setLineDash([]); c.fillStyle = '#1a2b3a'; c.font = '600 11px Manrope, sans-serif'; c.textAlign = 'center'; c.fillText('report date', x, a.top + 10); c.restore(); } }] });
  }

  /* ---------- Action Centre ---------- */
  function renderActions() {
    var H = highlights(), sv = savings();
    var col = function (title, sub, cls, list, c, extra) { return '<div class="ac-col" style="--c:' + c + '"><div class="ac-h"><h2>' + title + '</h2><b>' + openCount(list) + '</b></div><p class="sub">' + sub + '</p>' + hlList(list, cls) + (extra || '') + '</div>'; };
    $('pf-actions').innerHTML = '<div class="filters"><span class="note" style="margin:0">Rebuilt from the latest data each time a report is loaded. Tick an item when it has been dealt with; click its text to open the page behind it. Ticks are kept in this browser only.</span><button class="btn ghost" id="ac-reset" style="margin-left:auto">Clear all ticks</button></div>' +
      '<div class="ac-grid">' + col('Act now', 'Costing money or sales today', 'bad', H.bad, '#b3261e') + col('Watch list', 'Worth keeping an eye on', null, H.warn, '#b9791a') + col('Savings &amp; checks', 'From the supplier cost review', null, sv, '#1a8f63', '<p style="margin-top:12px"><button class="btn" data-go="save">Open the full savings &amp; checks page</button></p>') + '</div>';
  }

  /* ---------- Food & beverage ---------- */
  var fbCharts = [];
  var fbView = 'over', DOWN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fbSeg(P) { var TP = window.Trading && window.Trading.S().x ? window.Trading.S().x.plu : null; return '<div class="segs">' + [['over', 'Overview'], ['term', 'By terminal'], ['brk', 'Breakfast'], ['menu', 'What we sell']].map(function (v) { var off = v[0] === 'term' ? !TP : (v[0] !== 'over' && !P); return '<button class="' + (fbView === v[0] ? 'on' : '') + '" data-fb="' + v[0] + '"' + (off ? ' disabled title="' + (v[0] === 'term' ? 'Needs the till item sales reports' : 'Needs the Rezlynx Postings report') + '"' : '') + '>' + v[1] + '</button>'; }).join('') + '</div>'; }
  function dshort(k) { return +k.slice(8) + ' ' + MN[+k.slice(5, 7) - 1]; }
  function postingsNote(P) { return '<p class="note">Source: Rezlynx Postings report, ' + dlabel(P.from) + ' to ' + dlabel(P.to) + ' ' + P.to.slice(0, 4) + ', run ' + when(P.asOf) + '. Net of VAT. It covers the restaurant, room service and breakfast codes; bar till sales (analysis code BAR1BEV) are not in this export. Deleted postings (' + P.deleted.c + ', ' + gbp(P.deleted.v) + ') are left out; refunds and adjustments (' + P.refunds.c + ', ' + gbp(P.refunds.v) + ') are netted off. Guest names are not kept. Guestline cannot email this report, so it is exported by hand.</p>'; }
  function renderBrk(el, S, P) {
    var dk = Object.keys(P.byDay).sort(), T0 = { bi: 0, biv: 0, bp: 0, bpv: 0 }; dk.forEach(function (k) { var d = P.byDay[k]; T0.bi += d.bi; T0.biv += d.biv; T0.bp += d.bp; T0.bpv += d.bpv; });
    var n = dk.length, all = T0.bi + T0.bp, rev = T0.biv + T0.bpv, last = dk[dk.length - 1], L = P.byDay[last], h = fbSeg(P);
    var byD = {}; (S.af ? S.af.rows : []).forEach(function (r) { byD[r.d] = r; });
    h += '<div class="tiles">' + tile('Breakfasts served', num(all), dlabel(P.from) + ' to ' + dlabel(P.to) + ' · ' + (all / n).toFixed(0) + ' a day') + tile('Included in the room rate', num(T0.bi), gbp(T0.biv) + ' · ' + gbp(T0.biv / T0.bi, 2) + ' each, net') + tile('Paid on the day', num(T0.bp), gbp(T0.bpv) + ' · ' + gbp(T0.bp ? T0.bpv / T0.bp : null, 2) + ' each, net') + tile('Paid on the day, share', pc(T0.bp / all), (T0.bp / n).toFixed(1) + ' a day on average') + tile('Breakfast revenue', gbp(rev), gbp(rev / n) + ' a day') + tile('Latest day · ' + dlabel(last), num(L.bi + L.bp), num(L.bi) + ' included · ' + num(L.bp) + ' paid · ' + gbp(L.biv + L.bpv)) + '</div>';
    var obs = [], pp = P.brkPrice, inc = Object.keys(pp).filter(function (k) { return /^inc/.test(k) && pp[k].c >= 20 && parseFloat(k.slice(4)) > 5; }).sort(function (a, b) { return pp[b].c - pp[a].c; });
    obs.push(['warn', 'Only ' + pc(T0.bp / all) + ' of breakfasts are paid for on the day', num(T0.bp) + ' in ' + n + ' days, about ' + (T0.bp / n).toFixed(1) + ' a morning, averaging ' + gbp(T0.bp ? T0.bpv / T0.bp * 1.2 : null, 2) + ' including VAT. Each room-only guest who adds breakfast is worth ' + gbp(T0.bp ? T0.bpv / T0.bp : null, 2) + ' net, so offering it at check-in is the quickest gain.']);
    if (inc.length > 1) obs.push(['warn', 'Included breakfasts are posted at ' + inc.length + ' different prices', inc.map(function (k) { return '£' + k.slice(4) + ' (' + num(pp[k].c) + ')'; }).join(', ') + ', including VAT. The price is how much of each room rate is counted as food rather than rooms, so it changes the restaurant’s reported sales. Check the higher ones are intended.']);
    var wd = [0, 0, 0, 0, 0, 0, 0], wn = [0, 0, 0, 0, 0, 0, 0]; dk.forEach(function (k) { var w = new Date(k + 'T12:00:00').getDay(); wd[w] += P.byDay[k].bi + P.byDay[k].bp; wn[w]++; });
    var hi = 0, lo = 0; wd.forEach(function (v, i) { if (wn[i] && v / wn[i] > wd[hi] / wn[hi]) hi = i; if (wn[i] && v / wn[i] < wd[lo] / wn[lo]) lo = i; });
    obs.push(['good', DOWN[hi] + ' is the busiest breakfast, ' + DOWN[lo] + ' the quietest', (wd[hi] / wn[hi]).toFixed(0) + ' against ' + (wd[lo] / wn[lo]).toFixed(0) + ' on average. Breakfast follows the previous night’s occupancy, so the kitchen rota can be set from the room count the evening before.']);
    h += '<div class="card"><h2>What the breakfast figures show</h2><p class="sub">Click an item to read it in full</p><div class="find2">' + obs.map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div>';
    h += '<div class="card"><h2>Breakfasts by day</h2><p class="sub">Number served each morning: included in the room rate, and paid for on the day</p><div class="legend" id="bk-1-leg"></div><div class="chartbox" style="height:280px"><canvas id="bk-1"></canvas></div></div>';
    h += '<div class="grid g2"><div class="card"><h2>Breakfast revenue by day</h2><p class="sub">Net of VAT</p><div class="legend" id="bk-2-leg"></div><div class="chartbox" style="height:240px"><canvas id="bk-2"></canvas></div></div><div class="card"><h2>Prices charged</h2><p class="sub">Per breakfast, including VAT</p><table><tr><th>Type</th><th class="n">Price</th><th class="n">Breakfasts</th><th class="n">Share</th></tr>' + Object.keys(pp).sort(function (a, b) { return pp[b].c - pp[a].c; }).slice(0, 7).map(function (k) { return '<tr><td>' + (/^inc/.test(k) ? 'Included in the rate' + (parseFloat(k.slice(4)) <= 5 ? ' (child)' : '') : 'Paid on the day') + '</td><td class="n">£' + k.replace(/^\w+ /, '') + '</td><td class="n">' + num(pp[k].c) + '</td><td class="n">' + pc(pp[k].c / all) + '</td></tr>'; }).join('') + '</table><p class="note">“Included” is the amount Rezlynx moves from the room rate to the restaurant for each guest on a breakfast-inclusive rate.</p></div></div>';
    h += '<div class="card"><h2>Day by day</h2><p class="sub">Latest first</p><div class="scroll" style="max-height:360px"><table><tr><th>Morning</th><th class="n">Included</th><th class="n">Paid on the day</th><th class="n">Total</th><th class="n">Included revenue</th><th class="n">Paid revenue</th><th class="n">Total revenue</th><th class="n">Rooms sold the night before</th><th class="n">Breakfasts per room</th></tr>' + dk.slice().reverse().map(function (k) { var d = P.byDay[k], pv = new Date(k + 'T12:00:00Z'); pv.setUTCDate(pv.getUTCDate() - 1); var a = byD[pv.toISOString().slice(0, 10)], tt = d.bi + d.bp; return '<tr><td>' + DOWN[new Date(k + 'T12:00:00').getDay()].slice(0, 3) + ' ' + dshort(k) + '</td><td class="n">' + num(d.bi) + '</td><td class="n">' + num(d.bp) + '</td><td class="n"><b>' + num(tt) + '</b></td><td class="n">' + gbp(d.biv) + '</td><td class="n">' + gbp(d.bpv) + '</td><td class="n">' + gbp((d.biv || 0) + (d.bpv || 0)) + '</td><td class="n">' + (a ? num(a.rooms) : '–') + '</td><td class="n">' + (a && a.rooms ? (tt / a.rooms).toFixed(2) : '–') + '</td></tr>'; }).join('') + '</table></div></div>' + postingsNote(P);
    el.innerHTML = h;
    var lab = dk.map(dshort);
    lines('bk-1', 'bk-1-leg', lab, [['Included in the rate', dk.map(function (k) { return P.byDay[k].bi; })], ['Paid on the day', dk.map(function (k) { return P.byDay[k].bp; })]], function (v) { return Math.round(v) + ''; }, null, fbCharts);
    lines('bk-2', 'bk-2-leg', lab, [['Included in the rate', dk.map(function (k) { return P.byDay[k].biv; })], ['Paid on the day', dk.map(function (k) { return P.byDay[k].bpv; })]], function (v) { return gbp(v); }, null, fbCharts);
  }
  function renderMenu(el, S, P) {
    var dk = Object.keys(P.byDay).sort(), n = dk.length, T0 = { brk: 0, lun: 0, din: 0, bev: 0, rs: 0 }; dk.forEach(function (k) { var d = P.byDay[k]; T0.brk += d.biv + d.bpv; T0.lun += d.lun; T0.din += d.din; T0.bev += d.bev; T0.rs += d.rs; });
    var tot = T0.brk + T0.lun + T0.din + T0.bev + T0.rs, h = fbSeg(P), SX = P.sect;
    h += '<div class="tiles">' + tile('Restaurant sales', gbp(tot), dlabel(P.from) + ' to ' + dlabel(P.to) + ' · ' + gbp(tot / n) + ' a day') + tile('Dinner food', gbp(T0.din), pc(T0.din / tot) + ' · ' + gbp(T0.din / n) + ' a day') + tile('Drinks', gbp(T0.bev), pc(T0.bev / tot) + ' · ' + gbp(T0.bev / n) + ' a day') + tile('Breakfast', gbp(T0.brk), pc(T0.brk / tot) + ' · ' + gbp(T0.brk / n) + ' a day') + tile('Lunch food', gbp(T0.lun), pc(T0.lun / tot) + ' · ' + gbp(T0.lun / n) + ' a day') + tile('Room service', gbp(T0.rs), pc(T0.rs / tot)) + '</div>';
    var obs = [], dn = SX.din.top, bv = SX.bev.top, pint = bv.filter(function (x) { return /pint|moretti|guinness|cruzcampo|neck oil|cider/i.test(x[0]); }), pq = 0, pv = 0; pint.forEach(function (x) { pq += x[1]; pv += x[2]; });
    obs.push(['bad', 'Lunch brings in ' + gbp(T0.lun / n) + ' of food a day', gbp(T0.lun) + ' of lunch food in ' + n + ' days, against ' + gbp(T0.din) + ' at dinner. With the restaurant staffed anyway, lunch is the clearest gap: a short fixed-price lunch, afternoon tea or a meetings lunch offer would all show here.']);
    if (dn[0]) obs.push(['good', esc(dn[0][0]) + ' is the best-selling dish', num(dn[0][1]) + ' sold for ' + gbp(dn[0][2]) + '. The top five dinner dishes (' + dn.slice(0, 5).map(function (x) { return esc(x[0]); }).join(', ') + ') make ' + pc(dn.slice(0, 5).reduce(function (a, x) { return a + x[2]; }, 0) / SX.din.net) + ' of dinner food sales. These are the dishes to cost first in the kitchen costing tool.']);
    if (pq) obs.push(['good', 'Draught beer and cider lead the drinks', num(pq) + ' pints and beers among the top sellers, worth ' + gbp(pv) + ' (' + pc(pv / SX.bev.net) + ' of drinks). ' + esc(bv[0][0]) + ' is first with ' + num(bv[0][1]) + '.']);
    obs.push(['warn', 'Drinks outsell dinner food', gbp(T0.bev) + ' of drinks against ' + gbp(T0.din) + ' of dinner food. Drinks usually carry the better margin. Look down the dinner table for starters, sides and desserts: they are a small share of food sales, so there is room to sell more of them with each main.']);
    obs.push(['warn', 'Room service is almost unused', gbp(T0.rs) + ' in ' + n + ' days. Either promote it in the rooms or stop carrying the cost of offering it.']);
    obs.push(['warn', 'The same item is keyed under several names', SX.din.items + ' dinner names and ' + SX.bev.items + ' drink names appear, with duplicates such as “10OZ Ribeye” and “Ribeye Steak”, or one wine listed three ways. Tidying the till buttons would make this report, and stock control, far easier to read.']);
    h += '<div class="card"><h2>What the postings show</h2><p class="sub">Click an item to read it in full</p><div class="find2">' + obs.map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div>';
    h += '<div class="card"><h2>Sales by day</h2><p class="sub">Net of VAT</p><div class="legend" id="mn-1-leg"></div><div class="chartbox" style="height:290px"><canvas id="mn-1"></canvas></div></div>';
    var tbl = function (title, sub, sx, k) { return '<div class="card"><h2>' + title + '</h2><p class="sub">' + sub + ' · ' + sx.items + ' different names on the till</p><div class="scroll" style="max-height:440px"><table><tr><th>Item</th><th class="n">Sold</th><th class="n">Sales</th><th class="n">Average price</th><th class="n">Share</th></tr>' + sx.top.slice(0, k).map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td class="n">' + num(x[1]) + '</td><td class="n">' + gbp(x[2]) + '</td><td class="n">' + gbp(x[1] ? x[2] / x[1] : null, 2) + '</td><td class="n"><span class="bar-cell" style="width:' + Math.round(x[2] / sx.top[0][2] * 60) + 'px"></span>' + pc(x[2] / sx.net) + '</td></tr>'; }).join('') + '</table></div></div>'; };
    h += '<div class="grid g2">' + tbl('Dinner: what sells', 'Top 25 dishes by sales', SX.din, 25) + tbl('Drinks: what sells', 'Top 25 by sales, restaurant tills', SX.bev, 25) + '</div>';
    h += '<div class="grid g2">' + tbl('Lunch: what sells', 'Top 15 by sales', SX.lun, 15) + '<div><div class="card"><h2>Sales by time of day</h2><p class="sub">When food and drink are rung through the tills</p><div class="chartbox" style="height:230px"><canvas id="mn-2"></canvas></div></div><div class="card"><h2>Average day of the week</h2><p class="sub">Food and drink excluding breakfast</p><div class="chartbox" style="height:200px"><canvas id="mn-3"></canvas></div></div></div></div>' + postingsNote(P);
    el.innerHTML = h;
    var r0 = function (f) { return dk.map(function (k) { return Math.round(f(P.byDay[k])); }); };
    lines('mn-1', 'mn-1-leg', dk.map(dshort), [['Dinner food', r0(function (d) { return d.din; })], ['Drinks', r0(function (d) { return d.bev; })], ['Breakfast', r0(function (d) { return d.biv + d.bpv; })], ['Lunch food', r0(function (d) { return d.lun; })]], function (v) { return gbp(v); }, null, fbCharts);
    var bar = function (id, labels, data, col) { fbCharts.push(new Chart($(id), { type: 'bar', data: { labels: labels, datasets: [{ data: data, backgroundColor: col, borderRadius: 4, maxBarThickness: 34 }] }, options: { maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return gbp(c.parsed.y); } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: function (v) { return v >= 1000 ? '£' + v / 1000 + 'k' : '£' + v; } } } } } })); };
    var hrs = []; for (var hh = 7; hh <= 23; hh++) hrs.push(('0' + hh).slice(-2));
    bar('mn-2', hrs.map(function (x) { return +x + ':00'; }), hrs.map(function (x) { var o = P.byHour[x] || {}; return Math.round((o.food || 0) + (o.bev || 0)); }), '#c2417a');
    var wv = [0, 0, 0, 0, 0, 0, 0], wn = [0, 0, 0, 0, 0, 0, 0]; dk.forEach(function (k) { var w = new Date(k + 'T12:00:00').getDay(), d = P.byDay[k]; wv[w] += d.lun + d.din + d.bev + d.rs; wn[w]++; });
    var ord = [1, 2, 3, 4, 5, 6, 0]; bar('mn-3', ord.map(function (i) { return DOWN[i].slice(0, 3); }), ord.map(function (i) { return wn[i] ? Math.round(wv[i] / wn[i]) : 0; }), '#1a8f63');
  }
  /* ---------- food by terminal (till item sales reports) ---------- */
  function termSum(TP) {
    var o = { cell: {}, meal: {}, place: {}, net: 0, gross: 0, adj: 0, qty: 0, from: '', to: '', asOf: TP.asOf };
    Object.keys(TP.terms).forEach(function (k) { var t = TP.terms[k], m = t.meal || 'Other', p = t.place || k; o.cell[m + '|' + p] = t; o.meal[m] = (o.meal[m] || 0) + t.net; o.place[p] = (o.place[p] || 0) + t.net; o.net += t.net; o.gross += t.gross; o.adj += t.adj; o.qty += t.qty; if (!o.from || t.from < o.from) o.from = t.from; if (t.to > o.to) o.to = t.to; });
    o.meals = ['Breakfast', 'Lunch', 'Dinner', 'Other'].filter(function (m) { return o.meal[m] !== undefined; }); o.places = Object.keys(o.place).sort(function (a, b) { return o.place[b] - o.place[a]; });
    return o;
  }
  function termMatrix(TP, compact) {
    var o = termSum(TP), g = function (m, p) { var c = o.cell[m + '|' + p]; return c ? c.net : null; };
    return '<table><tr><th>' + (compact ? 'Food, net of VAT' : '') + '</th>' + o.places.map(function (p) { return '<th class="n">' + esc(p) + ' till</th>'; }).join('') + '<th class="n">Both</th><th class="n">Share</th></tr>' +
      o.meals.map(function (m) { return '<tr><td><b>' + m + '</b></td>' + o.places.map(function (p) { return '<td class="n">' + gbp(g(m, p)) + '</td>'; }).join('') + '<td class="n"><b>' + gbp(o.meal[m]) + '</b></td><td class="n">' + pc(o.meal[m] / o.net) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>Total</td>' + o.places.map(function (p) { return '<td class="n">' + gbp(o.place[p]) + '</td>'; }).join('') + '<td class="n">' + gbp(o.net) + '</td><td class="n">100.0%</td></tr>' +
      '<tr><td>Share</td>' + o.places.map(function (p) { return '<td class="n">' + pc(o.place[p] / o.net) + '</td>'; }).join('') + '<td class="n"></td><td class="n"></td></tr></table>';
  }
  window.HubTermCard = function () {
    var T = window.Trading, TP = T && T.S().x ? T.S().x.plu : null; if (!TP) return '';
    var o = termSum(TP);
    return '<div class="card"><h2>Food sales by terminal</h2><p class="sub">Till item sales, ' + dlabel(o.from) + ' to ' + dlabel(o.to) + ' ' + o.to.slice(0, 4) + ', net of VAT · the restaurant and bar tills, lunch and dinner</p>' + termMatrix(TP, true) + '<p style="margin:12px 0 0"><button class="btn" data-fb="term">Open the detail by terminal</button></p></div>';
  };
  function renderTerm(el, S, P) {
    var TP = S.x.plu, o = termSum(TP), h = fbSeg(P), days = Math.round((Date.parse(o.to) - Date.parse(o.from)) / 864e5) + 1;
    var rest = o.place.Restaurant || 0, barv = o.place.Bar || 0, lb = o.cell['Lunch|Bar'], lr = o.cell['Lunch|Restaurant'], db = o.cell['Dinner|Bar'], dr = o.cell['Dinner|Restaurant'];
    h += '<div class="filters"><span class="note" style="margin:0">Till item sales reports (PLU sales), ' + dlabel(o.from) + ' to ' + dlabel(o.to) + ' ' + o.to.slice(0, 4) + ', loaded ' + when(o.asOf) + '. Food items, net of VAT. One report per till and meal period.</span></div>';
    h += '<div class="tiles">' + tile('Food through the tills', gbp(o.net), days + ' days · ' + gbp(o.net / days) + ' a day') + tile('Restaurant till', gbp(rest), pc(rest / o.net) + ' of food') + tile('Bar till', gbp(barv), pc(barv / o.net) + ' of food') + tile('Lunch, both tills', gbp(o.meal.Lunch), pc((o.meal.Lunch || 0) / o.net) + ' · ' + gbp((o.meal.Lunch || 0) / days) + ' a day') + tile('Dinner, both tills', gbp(o.meal.Dinner), pc((o.meal.Dinner || 0) / o.net) + ' · ' + gbp((o.meal.Dinner || 0) / days) + ' a day') + tile('Discounts and adjustments', gbp(o.adj), pc(-o.adj / o.gross) + ' of the menu price, including VAT') + '</div>';
    var obs = [];
    if (lb && lr) obs.push(['warn', pc(lb.net / (lb.net + lr.net)) + ' of lunch food is sold at the bar, not the restaurant', gbp(lb.net) + ' on the bar till against ' + gbp(lr.net) + ' on the restaurant till in ' + days + ' days. The restaurant takes about ' + gbp(lr.net / days) + ' of food a lunchtime, so opening it for lunch is hard to justify on these figures; a bar lunch menu is where the trade already is.']);
    if (db && dr) obs.push(['good', 'At dinner the restaurant takes ' + pc(dr.net / (dr.net + db.net)) + ' of food', gbp(dr.net) + ' on the restaurant till and ' + gbp(db.net) + ' on the bar till. So ' + pc(db.net / (dr.net + db.net)) + ' of dinner food is eaten in the bar, which is worth knowing when setting staff for each room.']);
    var worst = Object.keys(TP.terms).map(function (k) { return [k, TP.terms[k]]; }).filter(function (x) { return x[1].gross > 0; }).sort(function (a, b) { return a[1].adj - b[1].adj; })[0];
    if (worst && worst[1].adj < 0) obs.push(['warn', 'Most discounting is on ' + esc(worst[0]), gbp(-worst[1].adj) + ' taken off ' + gbp(worst[1].gross) + ' of menu price (' + pc(-worst[1].adj / worst[1].gross) + '), including VAT. Across all four it is ' + gbp(-o.adj) + '. The item tables show which dishes are being discounted.']);
    var allI = {}; Object.keys(TP.terms).forEach(function (k) { TP.terms[k].items.forEach(function (it) { var a = allI[it[0]] = allI[it[0]] || { q: 0, v: 0, adj: 0, by: {} }; a.q += it[1]; a.v += it[4]; a.adj += it[3]; a.by[k] = it; }); });
    var rank = Object.keys(allI).map(function (k) { return [k, allI[k]]; }).sort(function (a, b) { return b[1].v - a[1].v; });
    if (rank[0]) obs.push(['good', esc(rank[0][0]) + ' is the best seller overall', gbp(rank[0][1].v) + ' in total, ' + pc(rank[0][1].v / o.net) + ' of all food through the tills. The top five dishes (' + rank.slice(0, 5).map(function (x) { return esc(x[0]); }).join(', ') + ') make ' + pc(rank.slice(0, 5).reduce(function (a, x) { return a + x[1].v; }, 0) / o.net) + '.']);
    h += '<div class="card"><h2>What the tills show</h2><p class="sub">Click an item to read it in full</p><div class="find2">' + obs.map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div>';
    h += '<div class="grid g2"><div class="card"><h2>Food by till and meal</h2><p class="sub">Net of VAT</p>' + termMatrix(TP) + '</div><div class="card"><h2>Lunch and dinner by till</h2><p class="sub">Net of VAT</p><div class="legend" id="tm-1-leg"></div><div class="chartbox" style="height:230px"><canvas id="tm-1"></canvas></div></div></div>';
    var keys = Object.keys(TP.terms).sort(function (a, b) { return TP.terms[b].net - TP.terms[a].net; });
    var tbl = function (k) { var t = TP.terms[k]; return '<div class="card"><h2>' + esc(k) + '</h2><p class="sub">' + gbp(t.net) + ' net · ' + num(t.qty) + ' items · discounts ' + gbp(t.adj) + '</p><div class="scroll" style="max-height:380px"><table><tr><th>Item</th><th class="n">Sold</th><th class="n">Sales (net)</th><th class="n">Discount</th><th class="n">Share</th></tr>' + t.items.filter(function (it) { return it[4] || it[3]; }).slice(0, 15).map(function (it) { return '<tr><td>' + esc(it[0]) + '</td><td class="n">' + num(it[1]) + '</td><td class="n">' + gbp(it[4]) + '</td><td class="n">' + (it[3] ? gbp(it[3]) : '–') + '</td><td class="n"><span class="bar-cell" style="width:' + Math.round(it[4] / t.items[0][4] * 50) + 'px"></span>' + pc(it[4] / t.net) + '</td></tr>'; }).join('') + '</table></div></div>'; };
    h += '<div class="grid g2">' + keys.slice(0, 2).map(tbl).join('') + '</div><div class="grid g2">' + keys.slice(2, 4).map(tbl).join('') + '</div>';
    h += '<div class="card"><h2>The same dish across the tills</h2><p class="sub">Top 15 dishes by sales; number sold on each till</p><div class="scroll"><table><tr><th>Dish</th>' + keys.map(function (k) { return '<th class="n">' + esc(k) + '</th>'; }).join('') + '<th class="n">Sold</th><th class="n">Sales (net)</th><th class="n">Discount</th></tr>' + rank.slice(0, 15).map(function (x) { return '<tr><td>' + esc(x[0]) + '</td>' + keys.map(function (k) { var it = x[1].by[k]; return '<td class="n">' + (it ? num(it[1]) : '–') + '</td>'; }).join('') + '<td class="n"><b>' + num(x[1].q) + '</b></td><td class="n">' + gbp(x[1].v) + '</td><td class="n">' + (x[1].adj ? gbp(x[1].adj) : '–') + '</td></tr>'; }).join('') + '</table></div></div>';
    var rz = null; if (P) { rz = 0; Object.keys(P.byDay).forEach(function (k) { if (k >= o.from && k <= o.to) rz += P.byDay[k].lun + P.byDay[k].din; }); }
    h += '<p class="note">The till report does not name its terminal, so the hub reads it from the file name: keep “Lunch” or “Dinner” and “restaurant” or “bar” in the name when saving. Quantities are as the till reports them; some lines show a value with a quantity of 0. The report itself warns that open tabs affect the figures.' + (rz !== null ? ' For the same dates Rezlynx shows ' + gbp(rz) + ' of lunch and dinner food posted against ' + gbp(o.net) + ' on the tills; the two are not expected to match exactly until open tabs are closed and posted.' : '') + ' These reports are exported by hand.</p>';
    el.innerHTML = h;
    var PALT = ['#1a8f63', '#b9791a', '#2a78d6'];
    if ($('tm-1-leg')) $('tm-1-leg').innerHTML = o.places.map(function (p, i) { return '<span><i style="background:' + PALT[i % 3] + '"></i>' + esc(p) + ' till</span>'; }).join('');
    fbCharts.push(new Chart($('tm-1'), { type: 'bar', data: { labels: o.meals, datasets: o.places.map(function (p, i) { return { label: p + ' till', data: o.meals.map(function (m) { var c = o.cell[m + '|' + p]; return c ? Math.round(c.net) : 0; }), backgroundColor: PALT[i % 3], borderRadius: 4, maxBarThickness: 54 }; }) }, options: { maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + gbp(c.parsed.y); } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: function (v) { return v >= 1000 ? '£' + v / 1000 + 'k' : '£' + v; } } } } } }));
  }
  /* v39.10 — Covers section at top of F&B tab. Reads from backend /fbCovers endpoint.
     Breakfast is exact from gl_days.bk counter; lunch/dinner are inferred from main-course items in gl_items. */
  var FB_COVERS_CACHE = null, FB_COVERS_INFLIGHT = false;
  var FB_FN_BASE = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/';
  function fbTok() { try { return localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) { return null; } }
  function fbGbp(n) { return (n == null || isNaN(n)) ? '–' : '£' + Math.round(n).toLocaleString('en-GB'); }
  function fbGbpDp(n) { return (n == null || isNaN(n)) ? '–' : '£' + (+n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fbGlTick() { return '<span style="display:inline-block;width:8px;height:8px;background:#1a8f63;border-radius:50%;margin-left:8px;vertical-align:middle;position:relative;top:-2px" title="Live from Guestline API"></span><span style="font-size:11px;color:#1a8f63;margin-left:6px;font-weight:600;letter-spacing:.2px;text-transform:uppercase">Guestline API</span>'; }
  function fbCoversHtml(data) {
    if (!data || !data.totals) return '<div class="card"><h2>Covers · last 30 days ' + fbGlTick() + '</h2><p class="sub">Loading…</p></div>';
    var t = data.totals, d = t.derived || {};
    var h = '<div class="card"><h2>Covers · last ' + t.nights + ' days ' + fbGlTick() + '</h2>' +
      '<p class="sub">Three cover counts per day, worked out from the live POS feed: breakfast counted from priced breakfast items; lunch and dinner inferred from main-course items. Sides, desserts and drinks aren\'t counted as covers. A diner who skipped a main won\'t register; two sharing one main show as one. For an exact per-clerk cover count we\'re waiting on Glen to export the Rezlynx POS cover report.</p>' +
      '<div class="tiles">' +
        '<div class="tile"><div class="l">Breakfast covers</div><div class="v">' + (t.breakfast.covers).toLocaleString('en-GB') + '</div><div class="d">avg spend ' + fbGbpDp(d.breakfastAvg) + ' · ' + fbGbp(t.breakfast.revenue) + ' total</div></div>' +
        '<div class="tile"><div class="l">Lunch covers</div><div class="v">' + (t.lunch.covers).toLocaleString('en-GB') + '</div><div class="d">avg ' + fbGbpDp(d.lunchAvg) + ' · ' + fbGbp(t.lunch.revenue) + ' food only</div></div>' +
        '<div class="tile"><div class="l">Dinner covers</div><div class="v">' + (t.dinner.covers).toLocaleString('en-GB') + '</div><div class="d">avg ' + fbGbpDp(d.dinnerAvg) + ' · ' + fbGbp(t.dinner.revenue) + ' food only</div></div>' +
        '<div class="tile"><div class="l">Covers total</div><div class="v">' + (d.totalCovers || 0).toLocaleString('en-GB') + '</div><div class="d">avg ' + Math.round((d.totalCovers || 0) / Math.max(1, t.nights)) + ' per day over ' + t.nights + ' days</div></div>' +
        '<div class="tile"><div class="l">Beverage · Restaurant till</div><div class="v">' + fbGbp(t.beverage.restaurant.revenue) + '</div><div class="d">' + ((1 - d.barBeverageShare) * 100).toFixed(0) + '% of total beverage</div></div>' +
        '<div class="tile"><div class="l">Beverage · Bar till</div><div class="v">' + fbGbp(t.beverage.bar.revenue) + '</div><div class="d">' + (d.barBeverageShare * 100).toFixed(0) + '% of total beverage</div></div>' +
      '</div>' +
      '<p class="sub" style="margin-top:16px">Covers per day · newest first</p>' +
      '<div class="scroll" style="max-height:360px"><table><thead><tr><th>Date</th><th class="n">Breakfast</th><th class="n">Lunch</th><th class="n">Dinner</th><th class="n">Total</th><th class="n">Food rev</th><th class="n">Bev rev</th><th class="n">£/cover</th></tr></thead><tbody>' +
        data.daily.slice().reverse().map(function (x) {
          var tot = x.breakfast.covers + x.lunch.covers + x.dinner.covers;
          var foodRev = x.breakfast.revenue + x.lunch.revenue + x.dinner.revenue;
          var bevRev = x.beverage.restaurant.revenue + x.beverage.bar.revenue;
          var totRev = foodRev + bevRev;
          var avg = tot > 0 ? totRev / tot : 0;
          var dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(x.date + 'T12:00:00').getDay()];
          return '<tr><td>' + dow + ' ' + x.date.slice(8) + '/' + x.date.slice(5, 7) + '</td>' +
            '<td class="n">' + x.breakfast.covers + '</td>' +
            '<td class="n">' + x.lunch.covers + '</td>' +
            '<td class="n">' + x.dinner.covers + '</td>' +
            '<td class="n"><b>' + tot + '</b></td>' +
            '<td class="n">' + fbGbp(foodRev) + '</td>' +
            '<td class="n">' + fbGbp(bevRev) + '</td>' +
            '<td class="n">' + fbGbpDp(avg) + '</td></tr>';
        }).join('') +
      '</tbody></table></div>' +
    '</div>';
    return h;
  }
  function fetchFbCovers(onDone) {
    if (FB_COVERS_INFLIGHT) return;
    var tok = fbTok(); if (!tok) { onDone('<div class="card"><h2>Covers</h2><p class="sub">Sign in again to load covers data</p></div>'); return; }
    FB_COVERS_INFLIGHT = true;
    fetch(FB_FN_BASE + 'fbCovers?days=30', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) { FB_COVERS_INFLIGHT = false; if (j && j.ok) { FB_COVERS_CACHE = j; onDone(fbCoversHtml(j)); } else onDone('<div class="card"><h2>Covers</h2><p class="sub">Could not load covers — ' + ((j && j.error) || 'unknown error') + '</p></div>'); })
      .catch(function (e) { FB_COVERS_INFLIGHT = false; onDone('<div class="card"><h2>Covers</h2><p class="sub">Network issue loading covers</p></div>'); });
  }

  function renderFb() {
    var el = $('pf-fb'), T = window.Trading, S = T ? T.S() : {}; fbCharts.forEach(function (c) { c.destroy(); }); fbCharts = [];
    if (!S.af) { el.innerHTML = '<div class="card"><h2>No Guestline data loaded</h2></div>'; return; }
    var P = S.x && S.x.postings; if (!P && (fbView === 'brk' || fbView === 'menu')) fbView = 'over';
    if (fbView === 'term' && !(S.x && S.x.plu)) fbView = 'over';
    if (fbView === 'term') return renderTerm(el, S, P); if (fbView === 'brk') return renderBrk(el, S, P); if (fbView === 'menu') return renderMenu(el, S, P);
    var cut = T.asOfDay(), m = cut.slice(0, 7), pe = T.pePeriod('month', m), act = T.agg(T.rowsFor(m, 'actual')), h = '';
    if (!pe) { el.innerHTML = '<div class="card"><h2>No Period End report for this month</h2><p class="sub">Food and drink sales by outlet come from the Rezlynx Period End / End of Day report.</p></div>'; return; }
    var F = T.peGroup(pe, 'FOOD'), B = T.peGroup(pe, 'BEVERAGE'), food = F.total[0], bev = B.total[0], tot = food + bev;
    var lines = F.lines.map(function (l) { return [l[1], l[2], 'Food', l[0]]; }).concat(B.lines.map(function (l) { return [l[1], l[2], 'Drinks', l[0]]; })).filter(function (l) { return l[1] > 0.5; }).sort(function (x, y) { return y[1] - x[1]; });
    var meal = { Breakfast: 0, Lunch: 0, Dinner: 0, 'Bar': 0, 'Room service and other': 0 };
    lines.forEach(function (l) { var c = l[3]; var k = /BRK/.test(c) ? 'Breakfast' : /LUN/.test(c) ? 'Lunch' : /DIN/.test(c) ? 'Dinner' : /^BAR/.test(c) ? 'Bar' : 'Room service and other'; meal[k] += l[1]; });
    var bar = 0; B.lines.forEach(function (l) { if (/^BAR/.test(l[0])) bar += l[2]; });
    h += fbSeg(P) + '<div class="filters"><span class="note" style="margin:0">' + MN[+m.slice(5) - 1] + ' ' + m.slice(0, 4) + ' to date, from the Rezlynx Period End report received ' + when(pe.asOf) + '. Net of VAT.</span></div>';
    h += '<div class="tiles">' + tile('Food and drink sales', gbp(tot), 'month to date') + tile('Food', gbp(food), pc(food / tot) + ' of the total') + tile('Drinks', gbp(bev), pc(bev / tot) + ' of the total') + tile('Per occupied room', gbp(act.rooms ? tot / act.rooms : null, 2), num(act.rooms) + ' room nights') + tile('Per guest', gbp(act.guests ? tot / act.guests : null, 2), num(act.guests) + ' guest nights') + tile('Drinks rung on the bar till', pc(bev ? bar / bev : null), gbp(bar) + ' of ' + gbp(bev)) + '</div>';
    h += '<div class="grid g2"><div class="card"><h2>Sales by line</h2><p class="sub">Every food and drink analysis code with sales this month · green is food, amber is drinks</p><div class="chartbox" style="height:' + Math.max(220, lines.length * 30) + 'px"><canvas id="fb-c1"></canvas></div></div><div><div class="card"><h2>Sales by meal period</h2><p class="sub">Food and drink together</p><div class="chartbox" style="height:220px"><canvas id="fb-c2"></canvas></div></div>';
    var TX = window.CostsApp ? window.CostsApp.tx() : [], xs = function (f) { var s2 = 0; TX.forEach(function (t) { if (t.month === m && f(t)) s2 += t.net; }); return s2; };
    var xf = xs(function (t) { return t.dept === 'Restaurant' && ['Food', 'Hot beverages', 'Beverages'].indexOf(t.section) !== -1 && t.cat !== 'Alcohol (coded to restaurant)'; }), xb = xs(function (t) { return t.dept === 'Bar' || t.cat === 'Alcohol (coded to restaurant)'; });
    var rw = function (n1, s2, x) { return '<tr><td>' + n1 + '</td><td class="n">' + gbp(s2) + '</td><td class="n">' + gbp(x) + '</td><td class="n">' + (s2 ? pc(x / s2) : '–') + '</td></tr>'; };
    h += '<div class="card"><h2>Sales against purchases</h2><p class="sub">Rezlynx sales beside Xero supplier invoices for the same month</p><table><tr><th></th><th class="n">Sales</th><th class="n">Purchases</th><th class="n">Purchases % of sales</th></tr>' + rw('Food', food, xf) + rw('Drinks', bev, xb) + '</table><p class="note">Purchases are invoices dated in the month, not stock used, and Xero may be behind. Read it as a direction, not a margin.</p></div></div></div>';
    var rtx = S.x && S.x.rates;
    if (rtx && rtx.byDay && Object.keys(rtx.byDay).length) { var byD = {}; S.af.rows.forEach(function (r) { byD[r.d] = r; }); h += '<div class="card"><h2>Meal plans by night</h2><p class="sub">Rooms on each basis, from the Daily Rate Analysis export run ' + when(rtx.asOf) + '. DBB is dinner, bed and breakfast.</p><table><tr><th>Night</th><th class="n">Dinner, bed and breakfast</th><th class="n">Bed and breakfast</th><th class="n">Room only or no charge</th><th class="n">Rooms with breakfast next morning</th><th class="n">Breakfast guests (estimate)</th><th class="n">Dinner-inclusive guests (estimate)</th></tr>' + Object.keys(rtx.byDay).sort().map(function (k) { var d = rtx.byDay[k], a = byD[k], gpr = a && a.rooms ? (a.ad + a.ch) / a.rooms : null, bk = (d.dbb || 0) + (d.bb || 0); return '<tr><td>' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(k + 'T12:00:00').getDay()] + ' ' + dlabel(k) + '</td><td class="n">' + num(d.dbb || 0) + '</td><td class="n">' + num(d.bb || 0) + '</td><td class="n">' + num((d.ro || 0) + (d.other || 0)) + '</td><td class="n"><b>' + num(bk) + '</b></td><td class="n">' + (gpr ? num(bk * gpr) : '–') + '</td><td class="n">' + (gpr ? num((d.dbb || 0) * gpr) : '–') + '</td></tr>'; }).join('') + '</table><p class="note">The report counts rooms, not people. Guest estimates multiply rooms by that night’s average guests per room, so treat them as a guide for the kitchen, not a cover count. Guestline cannot email this report, so it needs exporting by hand.</p></div>'; }
    if (S.daily) { var dk = Object.keys(S.daily).sort().slice(-14).reverse(); if (dk.length) h += '<div class="card"><h2>Food and beverage by day <span style="display:inline-block;width:8px;height:8px;background:#1a8f63;border-radius:50%;margin-left:8px;vertical-align:middle;position:relative;top:-2px" title="Live from Guestline API"></span><span style="font-size:11px;color:#1a8f63;margin-left:6px;font-weight:600;letter-spacing:.2px;text-transform:uppercase">Guestline API</span></h2><p class="sub">From Guestline’s End of Day and Key Performance emails, net of VAT, latest first</p><div class="scroll" style="max-height:330px"><table><tr><th>Day</th><th class="n">Food</th><th class="n">Beverage</th><th class="n">Food and beverage</th><th class="n">Rooms sold</th><th class="n">Per occupied room</th><th class="n">All revenue</th></tr>' + dk.map(function (k) { var d = S.daily[k], fbv = (d.food || 0) + (d.bev || 0); return '<tr><td>' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(k + 'T12:00:00').getDay()] + ' ' + dlabel(k) + '</td><td class="n">' + gbp(d.food) + '</td><td class="n">' + gbp(d.bev) + '</td><td class="n">' + gbp(fbv) + '</td><td class="n">' + num(d.rooms) + '</td><td class="n">' + gbp(d.rooms ? fbv / d.rooms : null, 2) + '</td><td class="n">' + gbp(d.net) + '</td></tr>'; }).join('') + '</table></div><p class="note">Guestline groups revenue as food, beverage, conference, miscellaneous and sundries each day. The split between restaurant and bar tills is only in the month-to-date Period End report above.</p></div>'; }
    h += window.HubTermCard();
    h += '<div class="card"><h2>Food and drink sales by night <span style="display:inline-block;width:8px;height:8px;background:#1a8f63;border-radius:50%;margin-left:8px;vertical-align:middle;position:relative;top:-2px" title="Live from Guestline API"></span><span style="font-size:11px;color:#1a8f63;margin-left:6px;font-weight:600;letter-spacing:.2px;text-transform:uppercase">Guestline API</span></h2><p class="sub">From the Actual &amp; Forecast report; nights after ' + dlabel(cut) + ' show only what is pre-booked with rooms</p><div class="chartbox" style="height:220px"><canvas id="fb-c3"></canvas></div></div>';
    var X = S.x || {};
    if (X.company) { var top = X.company.rows.slice(0, 8); h += '<div class="grid g2"><div class="card"><h2>Food and drink on the bill, by booking source</h2><p class="sub">Rezlynx Company report, ' + esc(X.company.period.replace('(Actual) ', '')) + ', including VAT</p><table><tr><th>Source</th><th class="n">Room nights</th><th class="n">F&amp;B on the bill</th><th class="n">F&amp;B per room night</th></tr>' + top.map(function (r) { return '<tr><td>' + esc(r.ref) + '</td><td class="n">' + num(r.rn) + '</td><td class="n">' + gbp(r.fb) + '</td><td class="n">' + gbp(r.fb / r.rn, 2) + '</td></tr>'; }).join('') + '</table></div>'; }
    else h += '<div class="grid g2"><div></div>';
    h += '<div class="card"><h2>What is still missing for food and drink</h2><p class="sub">Rezlynx only sees totals posted from the tills</p><div class="finding warn"><h3>Exact covers per clerk</h3><p>Rezlynx only assigns covers to the clerk who opens a table, so servers who join later show zero. We now infer covers above from main-course items in the POS feed as an interim measure. Asking Glen for a per-meal or per-service cover report.</p></div><div class="finding warn"><h3>Voids and discounts</h3><p>The Clerk Function Counts report shows totals per operator; we are working on scheduling it weekly into HosBUSINESS.</p></div><div class="finding warn"><h3>Events and functions</h3><p>Weddings, conferences and private dining appear only as provisional revenue in the market segment forecast. An event-by-event revenue report would separate them from the restaurant.</p></div></div></div>';
    // v39.10: prepend covers section, then fetch async
    h = '<div id="fb-covers-slot"><div class="card"><h2>Covers · last 30 days</h2><p class="sub">Loading…</p></div></div>' + h;
    el.innerHTML = h;
    if (FB_COVERS_CACHE) { var slot = $('fb-covers-slot'); if (slot) slot.innerHTML = fbCoversHtml(FB_COVERS_CACHE); }
    else fetchFbCovers(function (html) { var slot = $('fb-covers-slot'); if (slot) slot.innerHTML = html; });
    var opt = function (horiz, f) { return { indexAxis: horiz ? 'y' : 'x', maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return gbp(horiz ? c.parsed.x : c.parsed.y); } } } }, scales: { x: { grid: horiz ? { color: '#ebe9e3', drawTicks: false } : { display: false }, border: { display: false }, ticks: horiz ? { callback: f, maxTicksLimit: 6 } : {} }, y: { grid: horiz ? { display: false } : { color: '#ebe9e3', drawTicks: false }, border: { display: false }, beginAtZero: true, ticks: horiz ? {} : { callback: f, maxTicksLimit: 5 } } } }; }, k = function (v) { return '£' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v); };
    fbCharts.push(new Chart($('fb-c1'), { type: 'bar', data: { labels: lines.map(function (l) { return l[0]; }), datasets: [{ data: lines.map(function (l) { return Math.round(l[1]); }), backgroundColor: lines.map(function (l) { return l[2] === 'Food' ? '#1a8f63' : '#b9791a'; }), borderRadius: 4, maxBarThickness: 20 }] }, options: opt(true, k) }));
    var mk = Object.keys(meal).filter(function (x) { return meal[x] > 0.5; });
    fbCharts.push(new Chart($('fb-c2'), { type: 'bar', data: { labels: mk, datasets: [{ data: mk.map(function (x) { return Math.round(meal[x]); }), backgroundColor: '#c2417a', borderRadius: 4, maxBarThickness: 46 }] }, options: opt(false, k) }));
    var rows = T.rowsFor(m);
    fbCharts.push(new Chart($('fb-c3'), { type: 'bar', data: { labels: rows.map(function (r) { return +r.d.slice(8); }), datasets: [{ data: rows.map(function (r) { return Math.round(T.net(r.fb)); }), backgroundColor: rows.map(function (r) { return r.d < cut ? '#c2417a' : '#b9b7af'; }), borderRadius: 3, maxBarThickness: 22 }] }, options: opt(false, k) }));
  }

  /* ---------- Trends ---------- */
  var trCharts = [], trRange = '90';
  function lines(id, legId, labels, series, fmt, note, store) {
    if (!$(id)) return; var PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6'];
    if ($(legId)) $(legId).innerHTML = series.map(function (x, i) { return '<span><i style="background:' + PAL[i] + '"></i>' + x[0] + '</span>'; }).join('') + (note ? '<span style="color:#86847d">' + note + '</span>' : '');
    (store || trCharts).push(new Chart($(id), { type: 'line', data: { labels: labels, datasets: series.map(function (x, i) { return { label: x[0], data: x[1], borderColor: PAL[i], backgroundColor: PAL[i], borderWidth: 2, pointRadius: labels.length > 20 ? 0 : 3, pointHoverRadius: 5, tension: 0.25, spanGaps: true }; }) }, options: { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + fmt(c.parsed.y); } } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return fmt(v, 1); }, maxTicksLimit: 6 } } } } }));
  }
  function renderTrends() {
    var el = $('pf-trends'), T = window.Trading, S = T ? T.S() : {}, PD = window.Profit.data(), h = ''; trCharts.forEach(function (c) { c.destroy(); }); trCharts = [];
    var rows = [], cut = '';
    if (S.af && S.af.rows.length) {
      cut = T.asOfDay(); var all = S.af.rows, day = function (n) { var d = new Date(cut); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      rows = trRange === 'all' ? all : trRange === 'past' ? all.filter(function (r) { return r.d < cut; }) : all.filter(function (r) { return r.d >= day(-30) && r.d <= day(+trRange); });
      var opt = [['30', 'Last 30 nights and next 30'], ['90', 'Last 30 nights and next 90'], ['365', 'Last 30 nights and next 12 months'], ['past', 'Actual nights only'], ['all', 'Everything loaded']];
      h += '<div class="filters"><label>Dates<select id="tr-range">' + opt.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === trRange ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label><span class="note" style="margin:0 0 6px">Guestline Actual &amp; Forecast, ' + dlabel(all[0].d) + ' ' + all[0].d.slice(0, 4) + ' to ' + dlabel(all[all.length - 1].d) + ' ' + all[all.length - 1].d.slice(0, 4) + ', net of VAT. Nights from ' + dlabel(cut) + ' onwards are bookings held so far, so they rise as the date approaches.</span><button class="btn ghost" data-go="pf-kpi" style="margin-left:auto">Monthly KPI tables</button></div>';
      h += '<div class="card"><h2>ADR, RevPAR and TRevPAR by date</h2><p class="sub">' + (rows.length ? dlabel(rows[0].d) + ' to ' + dlabel(rows[rows.length - 1].d) + ' ' + rows[rows.length - 1].d.slice(0, 4) : '') + ' · the boxes are the average across these dates</p><div class="tiles" style="margin-bottom:10px">' + T.avgTiles(rows) + '</div><div class="legend" id="tn-1-leg"></div><div class="chartbox" style="height:320px"><canvas id="tn-1"></canvas></div></div>';
      h += '<div class="grid g2"><div class="card"><h2>Occupancy by date</h2><p class="sub">% of ' + T.ROOMS + ' rooms</p><div class="legend" id="tn-2-leg"></div><div class="chartbox" style="height:240px"><canvas id="tn-2"></canvas></div></div><div class="card"><h2>Food and drink per occupied room, by date</h2><p class="sub">Actual nights only</p><div class="legend" id="tn-3-leg"></div><div class="chartbox" style="height:240px"><canvas id="tn-3"></canvas></div></div></div>';
    }
    if (PD && PD.IDS && PD.IDS.length) {
      h += '<div class="srcbar"><b>Monthly figures</b><span class="chip h7">7H management accounts</span>' + esc(PD.LABEL[PD.IDS[0]]) + ' to ' + esc(PD.LABEL[PD.IDS[PD.IDS.length - 1]]) + (PD.XM ? '<span class="chip xero">Xero</span>' + esc(PD.XM.label) + ' (totals only)' : '') + '</div>';
      h += '<div class="grid g2"><div class="card"><h2>Revenue, payroll and net result by month</h2><p class="sub">Net operating profit from the 7H accounts; net profit from Xero for the latest month</p><div class="legend" id="tn-4-leg"></div><div class="chartbox" style="height:260px"><canvas id="tn-4"></canvas></div></div><div class="card"><h2>ADR, RevPAR and TRevPAR by month</h2><p class="sub">From the statistics in the 7H management accounts</p><div class="legend" id="tn-5-leg"></div><div class="chartbox" style="height:260px"><canvas id="tn-5"></canvas></div></div></div>';
    }
    var TX = window.CostsApp ? window.CostsApp.tx() : [];
    h += '<div class="grid g2">' + (TX.length ? '<div class="card"><h2>Supplier costs by month</h2><p class="sub">Xero cost accounts, net of VAT</p><div class="legend" id="tn-6-leg"></div><div class="chartbox" style="height:240px"><canvas id="tn-6"></canvas></div></div>' : '') + (S.x && S.x.cancels ? '<div class="card"><h2>Cancellations by month</h2><p class="sub">Rezlynx Cancellations report, by month cancelled</p><div class="legend" id="tn-7-leg"></div><div class="chartbox" style="height:240px"><canvas id="tn-7"></canvas></div></div>' : '') + '</div>';
    el.innerHTML = h;
    var g0 = function (v) { return '£' + Math.round(v).toLocaleString('en-GB'); }, gk = function (v, ax) { return ax && Math.abs(v) >= 1000 ? (v < 0 ? '−' : '') + '£' + Math.abs(v / 1000).toFixed(0) + 'k' : gbp(v); }, p0 = function (v) { return Math.round(v) + '%'; };
    if (rows.length) {
      T.tri('tn-1', 'tn-1-leg', rows, trCharts);
      var lab = rows.map(function (r) { return rows.length > 62 ? dlabel(r.d) : +r.d.slice(8) + ' ' + MN[+r.d.slice(5, 7) - 1]; });
      lines('tn-2', 'tn-2-leg', lab, [['Occupancy', rows.map(function (r) { return +(r.rooms / T.ROOMS * 100).toFixed(1); })]], p0, 'from ' + dlabel(cut) + ': on the books');
      var past = rows.filter(function (r) { return r.d < cut; });
      lines('tn-3', 'tn-3-leg', past.map(function (r) { return +r.d.slice(8) + ' ' + MN[+r.d.slice(5, 7) - 1]; }), [['Food and drink per occupied room', past.map(function (r) { return r.rooms ? +(T.net(r.fb) / r.rooms).toFixed(2) : null; })]], function (v) { return gbp(v, 2); });
    }
    if (PD && PD.IDS && PD.IDS.length) {
      var ids = PD.IDS, get = function (l) { return ids.map(function (id) { var f = (PD.M[id].pl || []).filter(function (r) { return r.label === l; })[0]; return f ? f.ma : null; }); }, ml = ids.map(function (id) { return MN[+id.slice(5) - 1] + ' ' + id.slice(2, 4); });
      var rev = get('TOTAL REVENUE'), pay = get('Total Manning'), np = get('Net Operating Profit'), ml2 = ml.slice();
      if (PD.XM) { ml2.push(MN[+PD.XM.id.slice(5) - 1] + ' ' + PD.XM.id.slice(2, 4) + ' (Xero)'); rev = rev.concat([PD.XM.cur.rev]); pay = pay.concat([PD.XM.cur.pay]); np = np.concat([PD.XM.cur.net]); }
      lines('tn-4', 'tn-4-leg', ml2, [['Revenue', rev], ['Payroll', pay], ['Net result', np]], gk);
      lines('tn-5', 'tn-5-leg', ml, [['ADR', get('Average Daily Rate')], ['RevPAR', get('REVPAR')], ['TRevPAR', get('TREVPAR')]], function (v) { return gbp(v, 2); });
    }
    if (TX.length && $('tn-6')) { var mm = {}, dp = {}; TX.forEach(function (t) { mm[t.month] = 1; dp[t.dept] = 1; }); var mk = Object.keys(mm).sort(), dk = Object.keys(dp).sort(); lines('tn-6', 'tn-6-leg', mk.map(function (m) { return MN[+m.slice(5) - 1] + ' ' + m.slice(2, 4); }), dk.map(function (d) { return [d, mk.map(function (m) { var v = 0; TX.forEach(function (t) { if (t.month === m && t.dept === d) v += t.net; }); return Math.round(v); })]; }), gk, 'latest month is part-loaded'); }
    if (S.x && S.x.cancels && $('tn-7')) { var cm = Object.keys(S.x.cancels.byMonth).sort(); lines('tn-7', 'tn-7-leg', cm.map(function (m) { return MN[+m.slice(5) - 1] + ' ' + m.slice(2, 4); }), [['Cancellations', cm.map(function (m) { return S.x.cancels.byMonth[m].c; })]], function (v) { return Math.round(v); }); }
  }

  /* ---------- live feed: the Gmail script hands over the latest Guestline reports ---------- */
  var feed = { status: 'off', note: 'Gmail feed not connected' };
  function feedUrl() { try { return localStorage.getItem(GKEY) || ''; } catch (e) { return ''; } }
  function chip() { var c = $('feed-chip'); if (!c) return; var g = window.GuestlineFeed && window.GuestlineFeed.info(); if (g && g.days) { c.className = 'feed-chip ' + g.status; c.textContent = g.note; return; } c.className = 'feed-chip ' + feed.status; c.textContent = feed.note; }
  /* Guestline API feed (guestline-feed.js): closed days straight from Guestline, laid over whatever the emails supplied */
  function glFeed() { var G = window.GuestlineFeed; if (!G) return; return G.load().then(function (n) { if (n) rerender(); }); }
  function addScript(src) { return new Promise(function (ok, bad) { if (window.pdfjsLib) return ok(); var x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = bad; document.head.appendChild(x); }); }
  function pdfCells(b64) {
    var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    return window.pdfjsLib.getDocument({ data: u }).promise.then(function (doc) {
      var out = [], chain = Promise.resolve();
      for (var p = 1; p <= doc.numPages; p++) (function (pn) { chain = chain.then(function () { return doc.getPage(pn); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
        var by = {}; tc.items.forEach(function (it) { var t = (it.str || '').trim(); if (!t) return; var y = Math.round(it.transform[5] / 3) * 3; (by[y] = by[y] || []).push([it.transform[4], t]); });
        Object.keys(by).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) { out.push(by[y].sort(function (a, b) { return a[0] - b[0]; }).map(function (c) { return c[1]; })); });
      }); })(p);
      return chain.then(function () { return out; });
    });
  }
  function stampOf(name, received) { var m = /(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)\d\d\.pdf$/i.exec(name || ''); if (m) return m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5]; var d = new Date(received); return isNaN(d) ? String(received).replace(' ', 'T').slice(0, 16) : new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }
  function rerender() { var on = document.querySelector('section.tab.on'); if (on && on.id.indexOf('t-pf-') === 0 && window.Profit.signedIn()) window.Profit.show(on.id.slice(5)); }
  function liveFeed() {
    var u = feedUrl(), T = window.Trading, TE = window.TradingEngine;
    if (!u || !T || !TE) { feed = { status: 'off', note: 'Gmail feed not connected' }; chip(); return Promise.resolve(); }
    feed = { status: 'busy', note: 'Checking Guestline emails…' }; chip();
    return fetch(u + (u.indexOf('?') < 0 ? '?' : '&') + 'data=1').then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) throw new Error(j.error);
      if (!j.files) { feed = { status: 'warn', note: 'Gmail script needs updating' }; chip(); return; }
      var keep = { messages: j.messages || [], version: j.version || 2 };
      if (j.tracker) { var tk0 = ticks(); Object.keys(j.tracker).forEach(function (k) { tk0[k] = 1; }); setTicks(tk0); }
      if (j.store) { var st = j.store, S0 = T.S(); S0.x = S0.x || {}; S0.pe = S0.pe || {}; S0.received = S0.received || [];
        Object.keys(st.x || {}).forEach(function (k) { if (!S0.x[k] || (st.x[k].asOf || '') > (S0.x[k].asOf || '')) S0.x[k] = st.x[k]; });
        Object.keys(st.pe || {}).forEach(function (k) { if (!S0.pe[k] || (st.pe[k].asOf || '') > (S0.pe[k].asOf || '')) S0.pe[k] = st.pe[k]; });
        (st.received || []).forEach(function (r) { if (!S0.received.some(function (q) { return q.kind === r.kind && q.ts === r.ts; })) S0.received.push(r); });
        S0.received.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; }); }
      var S = T.S(), got = [], chain = addScript('vendor/pdf.min.js');
      (j.files || []).filter(function (f) { return f.b64; }).sort(function (a, b) { return a.report < b.report ? 1 : -1; }).forEach(function (f) {   // Key Performance first, then Actual & Forecast
        chain = chain.then(function () { return pdfCells(f.b64); }).then(function (cells) {
          var asOf = stampOf(f.name, f.received);
          if (TE.isKPCells(cells)) { TE.mergeDaily(S, TE.parseKPCells(cells), { kind: 'kp', asOf: asOf, file: f.name }); got.push('Key Performance'); }
          else if (TE.isAFCells(cells)) { var rows = TE.parseAFCells(cells); if (rows.length && (!S.af || asOf > S.af.asOf)) { TE.merge(S, 'af', rows, { asOf: asOf, file: f.name, basis: 'net' }); if (T.resetMonth) T.resetMonth(); } got.push('Actual & Forecast'); }
        });
      });
      return chain.then(function () {
        (j.texts || []).slice().reverse().forEach(function (t) { if (!TE.isEODText(t.body || '')) return; var e = TE.parseEODText(t.body); if (!e) return; var d = {}; d[e.day] = e.d; TE.mergeDaily(S, d, { kind: 'eod', asOf: e.closed + 'T03:45', file: t.subject, mtd: e.mtd, to: e.day }); if (got.indexOf('End of Day') < 0) got.push('End of Day'); });
        feed = { status: 'ok', note: 'Guestline feed · ' + (S.af ? when(S.af.asOf) : 'no report yet'), got: got, messages: keep.messages, version: keep.version }; chip(); rerender();
      });
    }).catch(function (e) { feed = { status: 'bad', note: 'Gmail feed could not be read' }; chip(); });
  }

  /* ---------- report tracker ---------- */
  var TRK_START = '2026-11-16', TKEY = 'hosbusiness_track';
  var TRK = [
    ['auto', 'af', 'Actual & Forecast', 'Email, 07:00', 'Actual & Forecast', 1], ['auto', 'kp', 'Key Performance', 'Email, 07:00', 'Key Performance', 1], ['auto', 'eod', 'End of Day', 'Email, about 03:45', 'End of Day', 1],
    ['auto', 'flash', 'Manager’s Flash', 'Email, morning', "Manager's Flash", 1], ['auto', 'bs', 'Booking Source', 'Email, 07:00 · arrives empty, schedule needs fixing', 'Booking Source', 1], ['auto', 'dep', 'Deposits', 'Email, 07:00 · not used (guest names)', 'Deposits', 1],
    ['manual', 'plu', 'Till item sales (lunch and dinner, restaurant and bar)', 'Till export, four files · weekly', null, 7], ['manual', 'pe', 'Period End', 'Rezlynx export · weekly', null, 7], ['manual', 'postings', 'Postings', 'Rezlynx export · weekly', null, 7], ['manual', 'rates', 'Daily Rate Analysis', 'Rezlynx export · weekly', null, 7],
    ['manual', 'company', 'Company', 'Rezlynx export · weekly', null, 7], ['manual', 'cancels', 'Cancellations', 'Rezlynx export · weekly', null, 7], ['manual', 'noshows', 'No Shows', 'Rezlynx export · weekly', null, 7],
    ['manual', 'overrides', 'Rate Override', 'Rezlynx export · weekly', null, 7], ['manual', 'rooms', 'Room Usage', 'Rezlynx export · weekly', null, 7], ['manual', 'segments', 'Revenue By Market Segment', 'Rezlynx export · monthly', null, 31],
    ['manual', 'blocks', 'Block Forecast', 'Rezlynx export · monthly', null, 31], ['manual', 'xero-costs', 'Xero cost accounts (bar, restaurant, rooms)', 'Xero export · monthly', null, 31],
    ['manual', 'xero-mr', 'Xero Management Report', 'Xero export · monthly', null, 31], ['manual', 'acc-7h', '7H management accounts', 'Workbook into the P&amp;L dashboard · monthly', null, 31]
  ];
  function ticks() { try { return JSON.parse(localStorage.getItem(TKEY) || '{}'); } catch (e) { return {}; } }
  function setTicks(o) { try { localStorage.setItem(TKEY, JSON.stringify(o)); } catch (e) {} }
  function isoDay(v) { var d = new Date(v); if (isNaN(d)) return String(v).slice(0, 10); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function tracker() {
    var T = window.Trading, S = T ? T.S() : {}, tk = ticks(), now = new Date(), today = isoDay(now), days = [], d = new Date(TRK_START + 'T12:00:00');
    while (isoDay(d) <= today) { days.push(isoDay(d)); d.setDate(d.getDate() + 1); } days = days.slice(-90);
    var known = feed.status === 'ok' && !!feed.messages;
    var mail = {}; (feed.messages || []).forEach(function (m) { var rep = m.report; if ((!rep || rep === 'Not recognised') && /\bEOD\b/i.test(m.subject || '')) rep = 'End of Day'; mail[rep + '|' + isoDay(m.received)] = 1; });
    var up = {}; (S.received || []).forEach(function (r) { var k = r.kind === 'pe' && /EOD/i.test(r.file || '') ? 'eod' : r.kind; up[k + '|' + String(r.ts).slice(0, 10)] = 1; });
    var gen = window.COSTS_DATA && window.COSTS_DATA.generated ? isoDay(window.COSTS_DATA.generated) : ''; if (gen) up['xero-costs|' + (gen < TRK_START ? TRK_START : gen)] = 1; if (window.ACCOUNTS_DATA) up['xero-mr|' + TRK_START] = 1;
    var head = '<tr><th class="rt-name">Report</th><th class="rt-st">Status</th>' + days.map(function (k) { var dt = new Date(k + 'T12:00:00'); return '<th class="rt-d' + (k === today ? ' today' : '') + (dt.getDay() === 1 ? ' wk' : '') + '">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dt.getDay()] + '<b>' + dt.getDate() + '</b><i>' + MN[dt.getMonth()] + '</i></th>'; }).join('') + '</tr>';
    var row = function (r) {
      var auto = r[0] === 'auto', last = '', cells = days.map(function (k) {
        var id = r[1] + '|' + k, got = auto ? (mail[r[4] + '|' + k] || up[id]) : (tk[id] || up[id]); if (got) last = k;
        if (auto) { var late = k < today || (k === today && now.getHours() >= 8); return '<td class="rt-d' + (k === today ? ' today' : '') + '">' + (!known && !got ? '<span class="rt-na" title="' + (feed.status === 'busy' ? 'Checking the Gmail log' : 'Gmail feed not connected') + '">…</span>' : got ? '<span class="rt-ok" title="Received ' + dlabel(k) + '">✓</span>' : k === TRK_START ? '<span class="rt-na" title="Before the email feed started">–</span>' : late ? '<span class="rt-miss" title="Not received">✕</span>' : '<span class="rt-na" title="Not due yet">·</span>') + '</td>'; }
        return '<td class="rt-d' + (k === today ? ' today' : '') + '"><label class="tick sm" title="' + esc(r[2].replace(/&amp;/g, '&')) + ', ' + dlabel(k) + '"><input type="checkbox" data-trk="' + id + '"' + (got ? ' checked' : '') + (up[id] ? ' data-up="1"' : '') + '><span></span></label></td>';
      }).join('');
      var age = last ? Math.round((Date.parse(today) - Date.parse(last)) / 864e5) : null, st = auto ? (!known ? '<span class="pill">' + (feed.status === 'busy' ? 'Checking…' : feed.status === 'bad' ? 'Feed could not be read' : 'Feed not connected') + '</span>' : age === 0 ? '<span class="pill good">Received today</span>' : age === null ? '<span class="pill">Not received yet</span>' : '<span class="pill warn">Last ' + dlabel(last) + '</span>') : (age === null ? '<span class="pill warn">Not loaded yet</span>' : age > r[5] ? '<span class="pill bad">Due · last ' + dlabel(last) + '</span>' : '<span class="pill good">Up to date · ' + dlabel(last) + '</span>');
      return '<tr><td class="rt-name"><b>' + r[2] + '</b><small>' + r[3] + '</small></td><td class="rt-st">' + st + '</td>' + cells + '</tr>';
    };
    var sec = function (t, n) { return '<tr class="rt-sec"><td class="rt-name">' + t + '</td><td class="rt-st"></td><td colspan="' + days.length + '">' + n + '</td></tr>'; };
    var synced = feed.version >= 3;
    return '<div class="card"><h2>Report tracker</h2><p class="sub">Every report the hub uses, by day from ' + dlabel(TRK_START) + '. Emailed reports tick themselves when they arrive. For the others, tick the day you exported and loaded them; loading a file here ticks it for you.</p>' +
      '<div class="rt-wrap" id="rt-wrap"><table class="rt">' + head + sec('Arrive by email', 'ticked automatically from the Gmail log') + TRK.filter(function (r) { return r[0] === 'auto'; }).map(row).join('') + sec('Exported by hand', 'tick when loaded') + TRK.filter(function (r) { return r[0] === 'manual'; }).map(row).join('') + '</table></div>' +
      '<div class="rt-up"><div><b>Load exported reports</b><p>Rezlynx exports (Excel or CSV) and the four till item sales files: Period End, Postings, Daily Rate Analysis, Company, Cancellations, No Shows, Rate Override, Room Usage, Market Segment, Block Forecast, Actual &amp; Forecast. Any number at once.</p></div><label class="btn" for="rt-file">Choose files</label><input type="file" id="rt-file" multiple accept=".csv,.xls,.xlsx" hidden></div><div id="rt-msg" class="rt-msg">' + (trkMsg || '') + '</div>' +
      '<p class="note">' + (synced ? 'Ticks and loaded reports are saved online through the Gmail script, so every director sees the same.' : feedUrl() ? 'Ticks are kept in this browser until the Gmail script is updated to version 3; after that they are saved online for everyone.' : 'Ticks are kept in this browser only. Connect the Gmail script below to save them online.') + ' Xero and 7H files are loaded on their own pages (Supplier costs and the P&amp;L dashboard); tick them here once done.</p></div>';
  }
  var trkMsg = '';
  function saveOnline() {
    var u = feedUrl(), T = window.Trading; if (!u || !T || !(feed.version >= 3)) return Promise.resolve(false);
    var S = T.S(), m = /[?&]key=([^&]+)/.exec(u), body = { key: m ? decodeURIComponent(m[1]) : '', store: { savedAt: new Date().toISOString(), x: S.x || {}, pe: S.pe || {}, received: (S.received || []).filter(function (r) { return ['af', 'kp'].indexOf(r.kind) < 0 && !/EOD/i.test(r.file || ''); }).slice(0, 60) } };
    return fetch(u.split('?')[0], { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) { return !!j.ok; }).catch(function () { return false; });
  }
  window.HubLoaded = function (msg) {
    var ok = (msg || []).filter(function (x) { return !/not a report/.test(x); }).length;
    trkMsg = (msg || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
    saveOnline().then(function (saved) {
      trkMsg += ok ? (saved ? '<div class="ok">Saved online. Every director will see these on their next sign-in.</div>' : '<div class="warn">Loaded in this browser only. To keep them, either update the Gmail script to version 3, or use “Download trading-data.js” on the Trading page and upload it to the repo.</div>') : '';
      if (document.querySelector('#t-pf-data.on')) renderData();
    });
  };

  /* ---------- Data & reports ---------- */
  var KIND = { plu: ['Till item sales by terminal', 'Food by till and meal period'], postings: ['Postings', 'Breakfasts, dishes and drinks sold'], kp: ['Key Performance', 'Daily revenue by group, balances'], af: ['Actual & Forecast', 'Occupancy, rate and revenue by night'], pe: ['Period End / End of Day', 'Revenue by outlet, payments, deposits'], company: ['Company', 'Booking sources'], segments: ['Forecast Revenue By Market Segment', 'Segment mix on the books'], rates: ['Daily Rate Analysis', 'Rate plans sold'], cancels: ['Cancellations', 'Cancellations and notice given'], noshows: ['No Shows', 'No-show rooms'], overrides: ['Rate Override', 'Rates changed from the plan'], blocks: ['Block Forecast', 'Group blocks held'], rooms: ['Room Usage', 'Room stock and out of service'], bizdone: ['Business Done', 'Not used'], commission: ['Agent Commission', 'Not used (report was empty)'] };
  var GKEY = 'hosbusiness_gmail_feed';
  function gmailBox() { var u = ''; try { u = localStorage.getItem(GKEY) || ''; } catch (e) {} return '<div class="card"><h2>Daily emails from Guestline</h2><p class="sub">Shows what arrived in the Gmail inbox, once the Gmail script is installed. Paste the script’s web address here; it is kept in this browser only.</p><div class="filters" style="margin:0"><label style="flex:1">Gmail script web address<input type="url" id="gm-url" value="' + esc(u) + '" placeholder="https://script.google.com/macros/s/…/exec?key=…" style="width:100%;max-width:none"></label><button class="btn" id="gm-go">Check now</button></div><div id="gm-out"><p class="note">' + (u ? 'Checking…' : 'Not connected yet. Until it is, load exported reports by hand on the Trading page.') + '</p></div></div>'; }
  function gmailCheck() {
    var u = ($('gm-url').value || '').trim(), out = $('gm-out'); try { localStorage.setItem(GKEY, u); } catch (e) {}
    if (!u) { out.innerHTML = '<p class="note">Paste the web address first.</p>'; return; }
    out.innerHTML = '<p class="note">Checking…</p>';
    fetch(u).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) { out.innerHTML = '<div class="finding bad"><h3>The script answered with an error</h3><p>' + esc(j.error) + '</p></div>'; return; }
      var rows = j.messages || [], iso = function (v) { var d = new Date(v); if (isNaN(d)) return String(v); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }, now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
      rows.forEach(function (r) { r.when = iso(r.received); if ((!r.report || r.report === 'Not recognised') && /\bEOD\b|end of day/i.test(r.subject || '')) r.report = 'End of Day'; });
      var n = rows.filter(function (r) { return r.when.slice(0, 10) === today; }).length;
      out.innerHTML = '<div class="finding ' + (n ? 'good' : 'warn') + '"><h3>' + (n ? n + ' Guestline email' + (n > 1 ? 's' : '') + ' received today' : 'No Guestline emails received today yet') + '</h3><p>Last checked by the script: ' + esc(j.lastRun || 'not yet run') + '. ' + rows.length + ' emails on record. The hub reads Actual &amp; Forecast, Key Performance and End of Day from these automatically. Attachments are also kept in the Google Drive folder “HosBUSINESS Guestline feed”.</p></div>' + (rows.length ? '<div class="scroll" style="max-height:340px"><table><tr><th>Received</th><th>Report</th><th>Subject</th><th>Attachments</th></tr>' + rows.map(function (r) { return '<tr><td style="white-space:nowrap">' + esc(r.when) + '</td><td><b>' + esc(r.report || '–') + '</b></td><td>' + esc(r.subject || '') + '</td><td>' + esc(r.attachments || 'none') + '</td></tr>'; }).join('') + '</table></div>' : '');
    }).catch(function () { out.innerHTML = '<div class="finding bad"><h3>Could not reach the Gmail script</h3><p>Check the address is the full web app address ending in /exec with ?key=… and that the script is deployed for “Anyone”.</p></div>'; });
  }
  function renderData() {
    var T = window.Trading, S = T ? T.S() : {}, PD = window.Profit.data(), A = window.ACCOUNTS_DATA, C = window.COSTS_DATA, refs = [];
    (S.received || []).slice().sort(function (x, y) { return x.ts < y.ts ? 1 : -1; }).forEach(function (r) { var k = KIND[r.kind] || [r.kind, '']; refs.push(['Guestline Rezlynx', k[0], r.file, when(r.ts), k[1]]); });
    if (C) { var tx = window.CostsApp ? window.CostsApp.tx() : [], by = {}; tx.forEach(function (t) { by[t.dept] = (by[t.dept] || 0) + 1; }); refs.push(['Xero', 'Account Transactions: Bar Costs (Drinks), Restaurant Costs, Room Costs (Linen and Materials)', 'three exports, ' + (C.rows ? C.rows.length : tx.length) + ' lines', esc(C.generated || ''), 'Supplier costs, keg prices, linen, savings']); }
    if (A) refs.push(['Xero', 'Management Report', 'month ended ' + A.period, '16 Nov', 'Profitability (latest month), cash, creditors']);
    if (PD && PD.IDS) refs.push(['Management accounts', 'Departmental accounts workbook, one per month', PD.IDS.map(function (id) { return PD.LABEL[id].split(' ')[0].slice(0, 3); }).join(', ') + ' ' + PD.IDS[PD.IDS.length - 1].slice(0, 4), 'via the P&amp;L dashboard', 'Profitability, labour, KPIs, budget and forecast']);
    refs.push(['Market research', 'Wholesale keg and supply prices checked online', '–', '14 Nov', 'Bar &amp; keg prices, savings']);
    $('pf-data').innerHTML = tracker() + gmailBox() + (T && T.feedPanel ? T.feedPanel() : '') +
      '<div class="card"><h2>Data references</h2><p class="sub">Every report imported into HosBUSINESS, newest first, and what it feeds</p><div class="scroll"><table><tr><th>System</th><th>Report</th><th>File or period</th><th>Run or loaded</th><th>Used for</th></tr>' + refs.map(function (r) { return '<tr><td>' + r[0] + '</td><td><b>' + esc(r[1]) + '</b></td><td style="word-break:break-all">' + esc(r[2]) + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>'; }).join('') + '</table></div></div>' +
      '<div class="card"><h2>Load new data</h2><p class="sub">Until the Gmail feed is live, files are loaded by hand</p><p><button class="btn" data-go="pf-trading">Load Guestline reports (bottom of the Trading page)</button> &nbsp; <button class="btn" data-go="update">Load Xero cost exports</button></p></div>';
    var u = ''; try { u = localStorage.getItem(GKEY) || ''; } catch (e) {} if (u) gmailCheck();
    var w = $('rt-wrap'); if (w) w.scrollLeft = w.scrollWidth;
  }

  /* ---------- explanations ---------- */
  var TERMS = [
    ['Occupancy', 'Rooms sold ÷ rooms. Brandon Hall has 120 rooms: 114 to sell, 5 staff rooms (staff pay £11 a night each, £55 a night in all) and 1 storage room at £0. The headline percentage is on all 120, the figure the management accounts use; the share of the 114 rooms to sell is shown beside it. Guestline’s own percentage uses fewer rooms, so it reads higher.'],
    ['ADR', 'Average daily rate: rooms revenue (net of VAT) ÷ rooms sold. What a sold room earned on average.'],
    ['RevPAR', 'Revenue per available room: rooms revenue ÷ all 120 rooms, sold or not. It equals occupancy × ADR, so it shows whether a rate rise cost more in empty rooms than it gained.'],
    ['TRevPAR', 'Total revenue per available room: rooms, food, drink and other revenue ÷ 120 rooms. Shows what the whole hotel earns per room, not only the bedroom.'],
    ['GOPPAR', 'Gross operating profit per available room: profit before fixed costs ÷ rooms available.'],
    ['Room nights', 'One room sold for one night. Two rooms for three nights is six room nights.'],
    ['On the books', 'Bookings already held for future nights. It grows as the date approaches, so it is a floor, not a forecast.'],
    ['Pickup', 'Room nights gained for future dates since the previous report. Needs two days of reports.'],
    ['Out of service', 'Rooms taken off sale for repair (Rezlynx: ROOS). “Deduct from stock” (DFS) rooms are removed from the count altogether.'],
    ['Group block', 'Rooms held for a group. They only become sales when the group’s guests are named (picked up).'],
    ['Lead time', 'Days between the booking being made and arrival.'],
    ['Gross profit', 'Revenue less the direct cost of what was sold (food, drink, linen, commission in Xero’s layout).'],
    ['Departmental profit', 'A department’s revenue less its cost of sales, its own payroll and its other expenses.'],
    ['Gross operating profit', 'All departmental profit less undistributed costs: administration, sales and marketing, energy, maintenance. Often shortened to GOP.'],
    ['EBITDA', 'Earnings before interest, tax, depreciation and amortisation: gross operating profit less insurance, property tax and rent.'],
    ['Net operating profit', 'EBITDA less the furniture reserve and management fee.'],
    ['Creditor days', 'Average number of days taken to pay suppliers, as calculated by Xero.']
  ];
  var CALCS = [
    ['Net of VAT', 'Guestline’s Actual &amp; Forecast export is including VAT, so every revenue figure from it is divided by 1.2. Period End figures are already net. Checked against the Manager’s Flash for 1–15 November: rooms revenue £80,204 on both.'],
    ['Rooms sold', 'Taken as the export’s occupancy % × its rooms in stock for the night. The export’s own “sold” column also counts unnamed group block rooms, which overstates sales.'],
    ['Where the month is heading', 'Actual revenue for nights already traded + revenue on the books for the remaining nights, compared with the forecast in the management accounts. Food and drink on the books is only what is pre-booked with rooms, so that gap closes as the month trades.'],
    ['Food and drink per guest or room', 'Food and drink sales ÷ guest nights or ÷ occupied room nights for the same dates.'],
    ['Booking-site share', 'Room nights on the Booking.com and Expedia company codes ÷ all room nights on the Rezlynx Company report.'],
    ['Rate overrides', 'Rate before the override less rate after, added up by who applied it. “Automatic” is the Rezlynx system user.'],
    ['Cancellation notice', 'Arrival date less the date the booking was cancelled, grouped into bands. The value is Rezlynx’s estimate for the cancelled stay; many of those rooms are resold.'],
    ['Rooms out of service, lost revenue', 'Rooms out of service that night (Actual & Forecast report) × that night’s ADR. It is what those rooms would have earned at the average rate actually achieved; on a quiet night they might not all have sold.'],
    ['Staff rooms', '5 rooms × £11 a night paid by staff = £55 a night. They are not counted as rooms sold.'],
    ['Rooms out of service over 30 days', 'Report date less the out-of-service start date on the Room Usage report.'],
    ['Purchases % of sales', 'Xero supplier invoices dated in the month ÷ Rezlynx sales for the month. Invoices are not the same as stock used, so it is a direction rather than a true margin.'],
    ['Overdue creditors', 'Everything on Xero’s aged payables report past its due date, including the “under one month” column.'],
    ['Cumulative totals with October', 'Management accounts for March to September, plus October’s revenue, payroll and net result from Xero. Departmental profit, gross operating profit and EBITDA stop at September because Xero has no departments.'],
    ['Payroll in Xero', 'Salaries + employer’s National Insurance + pension costs + direct wages.'],
    ['Keg and supplier prices', 'Unit prices read from the invoice line descriptions in Xero; market prices from wholesaler websites on 14 November.']
  ];
  function renderHelp() {
    $('pf-help').innerHTML = '<div class="grid g2"><div class="card"><h2>What the terms mean</h2><p class="sub">These also appear when you hover over an ⓘ on any page</p><table>' + TERMS.map(function (t) { return '<tr><td style="white-space:nowrap;vertical-align:top"><b>' + t[0] + '</b></td><td>' + t[1] + '</td></tr>'; }).join('') + '</table></div><div class="card"><h2>How the figures are worked out</h2><p class="sub">Every calculation made by the hub rather than taken straight from a report</p><table>' + CALCS.map(function (t) { return '<tr><td style="vertical-align:top;min-width:150px"><b>' + t[0] + '</b></td><td>' + t[1] + '</td></tr>'; }).join('') + '</table></div></div>';
  }
  /* add an ⓘ beside known terms in tiles and table headings */
  var TIPS = TERMS.map(function (t) { return [new RegExp('^(' + t[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (t[0] === 'ADR' ? '|Average daily rate|Rate' : t[0] === 'Gross operating profit' ? '|GOP' : '') + ')\\b', 'i'), t[1]]; });
  function annotate(root) {
    (root || document).querySelectorAll('.tile .l, th').forEach(function (n) {
      if (n.dataset.tip) return; n.dataset.tip = '1'; var tx = n.textContent.trim();
      for (var i = 0; i < TIPS.length; i++) if (TIPS[i][0].test(tx)) { var s = document.createElement('span'); s.className = 'tip'; s.tabIndex = 0; s.textContent = 'ⓘ'; s.setAttribute('data-tip', TIPS[i][1].replace(/&amp;/g, '&')); n.appendChild(s); break; }
    });
  }

  /* ---------- shell: sign-in, top bar, navigation ---------- */
  function go(tab) { closeDrawer(); if (tab === 'pf-trading' && document.querySelector('#t-pf-home.on') && window.Trading && window.Trading.resetMonth) window.Trading.resetMonth(); var b = document.querySelector('#nav button[data-t="' + tab + '"]'); if (b) b.click(); window.scrollTo(0, 0); }
  function crumb(tab) {
    var c = $('crumb'); if (!c) return;
    document.body.classList.toggle('at-home', tab === 'pf-home');
    c.innerHTML = tab === 'pf-home' ? '' : '<button class="back" data-go="pf-home">← Hub</button><b>' + (TITLES[tab] || '') + '</b><select id="jump" aria-label="Go to page"><option value="">Go to…</option>' + CARDS.map(function (x) { return '<option value="' + x[0] + '">' + x[2] + '</option>'; }).join('') + '</select>';
  }
  function unlock() { var ok = window.Profit.signedIn(); document.body.classList.toggle('locked', !ok); if (ok && $('who')) $('who').textContent = window.Profit.user(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var d = t.closest('[data-drawer]'); if (d) { drawer(d.getAttribute('data-drawer')); return; }
    if (t.closest('.dr-x') || t.id === 'scrim') { closeDrawer(); return; }
    var a = t.closest('[data-ac]'); if (a) { acView = a.getAttribute('data-ac'); if (!document.querySelector('#t-pf-actions.on')) go('pf-actions'); else renderActions(); return; }
    var fv = t.closest('[data-fb]'); if (fv && !fv.disabled) { fbView = fv.getAttribute('data-fb'); if (!document.querySelector('#t-pf-fb.on')) go('pf-fb'); else renderFb(); window.scrollTo(0, 0); return; }
    if (t.id === 'gm-go') { gmailCheck(); liveFeed().then(glFeed); return; }
    var f2 = t.closest('.find2 .finding'); if (f2) { f2.classList.toggle('open'); return; }
    var ks = t.closest('[data-ser]'); if (ks && hubC) { var k = +ks.getAttribute('data-ser'), vis = hubC.isDatasetVisible(k); hubC.setDatasetVisibility(k, !vis); hubC.update(); ks.classList.toggle('off', vis); return; }
    if (t.id === 'ac-reset') { try { localStorage.removeItem(DKEY); } catch (e2) {} renderActions(); return; }
    if (t.closest('.tick')) return;
    if (t.id === 'signout') { window.Profit.signOut(); return; }
    var g = t.closest('[data-go]'); if (g) { go(g.getAttribute('data-go')); return; }
    var nb = t.closest('#nav button'); if (nb) crumb(nb.dataset.t);
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'jump' && t.value) go(t.value);
    if (t.id === 'rt-file' && t.files && t.files.length && window.Trading) { $('rt-msg').innerHTML = '<div>Reading ' + t.files.length + ' file' + (t.files.length > 1 ? 's' : '') + '…</div>'; window.Trading.loadFiles(t.files); return; }
    if (t.dataset && t.dataset.trk) { if (t.dataset.up && !t.checked) { t.checked = true; return; } var tk1 = ticks(); if (t.checked) tk1[t.dataset.trk] = 1; else delete tk1[t.dataset.trk]; setTicks(tk1); var fu = feedUrl(); if (fu && feed.version >= 3) fetch(fu + '&tick=' + encodeURIComponent(t.dataset.trk + '|' + (t.checked ? 1 : 0))).catch(function () {}); var sl = $('rt-wrap') ? $('rt-wrap').scrollLeft : 0; renderData(); if ($('rt-wrap')) $('rt-wrap').scrollLeft = sl; return; }
    if (t.dataset && t.dataset.staff) { var cur = []; try { cur = JSON.parse(localStorage.getItem(SKEY2) || '[]'); } catch (e3) {} var ix = cur.indexOf(t.dataset.staff); if (t.checked && ix < 0) cur.push(t.dataset.staff); if (!t.checked && ix >= 0) cur.splice(ix, 1); try { localStorage.setItem(SKEY2, JSON.stringify(cur)); } catch (e4) {} rerender(); return; }
    if (t.id === 'tr-range') { trRange = t.value; renderTrends(); }
    if (t.dataset && t.dataset.done) { var D = doneMap(); if (t.checked) D[t.dataset.done] = new Date().toISOString().slice(0, 10); else delete D[t.dataset.done]; try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (e2) {} if (document.querySelector('#t-pf-actions.on')) renderActions(); else { var a = t.closest('.act'); if (a) a.classList.toggle('done', t.checked); } }
  });
  document.addEventListener('hub-signin', function () { unlock(); liveFeed().then(glFeed); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  window.HubAccounts = renderAccounts;
  if (window.Profit && window.Profit.register) { ['home', renderHome, 'actions', renderActions, 'fb', renderFb, 'data', renderData, 'help', renderHelp, 'trends', renderTrends].forEach(function (v, i, arr) { if (i % 2 === 0) window.Profit.register(v, arr[i + 1]); }); }
  document.addEventListener('DOMContentLoaded', function () {
    unlock(); crumb('pf-home'); if (window.Profit.signedIn()) liveFeed().then(glFeed); else chip();
    var sv = $('t-save'); if (sv && !sv.querySelector('.segs')) sv.insertAdjacentHTML('afterbegin', '<div id="save-pills"></div>');
    new MutationObserver(function () { annotate(document.querySelector('main')); var sp = $('save-pills'); if (sp && !sp.firstChild && window.Profit.signedIn()) sp.innerHTML = '<p style="margin:0 0 14px"><button class="btn ghost" data-go="pf-actions">← Back to the Action Centre</button></p>'; }).observe(document.querySelector('main'), { childList: true, subtree: true });
  });
})();
