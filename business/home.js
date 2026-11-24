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
  var COL = { trading: '#b3261e', demand: '#7a4fc4', profit: '#1a8f63', labour: '#2a78c8', kpi: '#eb6834', stock: '#0f8f95', explore: '#52606d', bar: '#b9791a', rooms: '#3f5bbf', save: '#c2417a', accounts: '#1f3d36', brief: '#6b7a2a', update: '#86847d', fb: '#c2417a', actions: '#d0362b', data: '#1a2b3a', rev: '#1F7A8C', events: '#8a4a9c', comp: '#1a6442' };
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
  var CARDS = [['pf-trading', 'trading', 'Trading', 'Occupancy, rate, RevPAR and revenue by night'], ['pf-demand', 'demand', 'Channels & rates', 'Booking sources, rate plans, cancellations, no-shows'], ['pf-fb', 'fb', 'Food & beverage', 'Sales by outlet and meal against what was bought'], ['pf-cnb', 'events', 'Conference & Events', 'Weddings, meetings, dinners · live from Guestline C&B'], ['pf-comp', 'comp', 'Comp Set', 'Competitor rates and estimated occupancy'], ['pf-profit', 'profit', 'Profitability', 'Revenue, costs and profit by month and department'], ['pf-labour', 'labour', 'Labour', 'Payroll by department, agency and employer costs'], ['pf-trends', 'kpi', 'Trends', 'ADR, RevPAR, TRevPAR, revenue and costs over time'], ['pf-stock', 'stock', 'Purchased vs consumed', 'Purchases against cost of sales in the accounts'], ['explore', 'explore', 'Supplier costs', 'Every cost line by supplier, type, section and month'], ['bar', 'bar', 'Bar & keg prices', 'Keg price history and market comparison'], ['rooms', 'rooms', 'Rooms, linen & housekeeping', 'Linen, cleaning, guest supplies and waste'], ['pf-actions', 'actions', 'Action Centre', 'Actions, watch list, savings and checks'], ['pf-data', 'data', 'Data & reports', 'What has been imported, when, and the Gmail feed']];
  /* card photographs: add a file to costs/img and name it here, e.g. trading: 'card-trading.jpg' */
  var CARD_IMG = {}, CARD_DEFAULT = 'card-default.jpg';
  var TITLES = { 'pf-kpi': 'Trends · Monthly KPI tables', 'pf-home': 'Hub', 'pf-brief': 'Project brief', 'pf-help': 'How figures are worked out', save: 'Action Centre · Savings & checks', update: 'Data & reports · Load Xero exports' };
  CARDS.forEach(function (c) { TITLES[c[0]] = c[2]; });
  function renderHome() {
    var el = $('pf-home'), T = window.Trading, S = T ? T.S() : {}, a = acc(), PD = window.Profit.data(), h = '', card = {}, H = highlights();
    var who = (window.Profit.user() || '').split(/\s+/)[0], hr = new Date().getHours();

    // v39.22 — mf-slot moved to AFTER the today card so the page renders in the
    // correct mock-up order: Hero → Latest trading position + chart → Highlights →
    // tables. Previously mf-slot sat first and pushed the hero + chart to the bottom.

    h += '<div class="hp-hero"><div><h2>' + (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + (who ? ', ' + esc(who) : '') + '</h2><p>Business intelligence for Brandon Hall Hotel &amp; Spa: trading, profit and costs in one place</p></div>' +
      '<div class="hp-btns"><button class="pillbtn bad" data-drawer="bad"><b>' + openCount(H.bad) + '</b>Actions</button><button class="pillbtn warn" data-drawer="warn"><b>' + openCount(H.warn) + '</b>Watch list</button><button class="iconbtn" data-go="pf-brief" title="Project brief">' + icon('brief', 30) + '<span>Project brief</span></button><button class="iconbtn" data-go="pf-help" title="How figures are worked out">' + icon('kpi', 30) + '<span>How it’s worked out</span></button></div></div>';
    var today = '', mark = h.length;
    if (S.af && S.af.rows.length) {
      var cut = T.asOfDay(), m = cut.slice(0, 7), rows = S.af.rows, R = T.ROOMS, to = rows.filter(function (r) { return r.d === cut; })[0], yd = rows.filter(function (r) { return r.d < cut; }).slice(-1)[0];
      var act = T.agg(T.rowsFor(m, 'actual')), bks = T.agg(T.rowsFor(m, 'books')), all = T.agg(T.rowsFor(m));
      var nx = rows.filter(function (r) { return r.d >= cut; }).slice(0, 14), n7 = T.agg(nx.slice(0, 7)), oos = S.x && S.x.rooms ? S.x.rooms.oos.length : (to ? to.roos : null);
      var rate = function (r) { return r && r.rooms ? T.net(r.acc) / r.rooms : null; };
      var age = Math.floor((Date.now() - Date.parse(S.af.asOf.slice(0, 10))) / 864e5), yrev = yd ? T.net(yd.acc + yd.fb + yd.oth) : null;
      // v39.22 — Latest trading position tiles rebuilt to the Alia mock-up:
      // Revenue closed + Revenue on books + Total for month (replacing the old
      // single "Month, with bookings held" tile), plus Rooms sold, Occupancy,
      // ADR, RevPAR, TRevPAR, F&B, Other revenue, Guests in the hotel, Revenue
      // lost to OOS, Tonight on books and Next 7 nights on books. All driven by
      // live Trading engine data (act / bks / all / n7 / to / yd) → refreshes
      // every morning with the overnight Guestline pull.
      var acAccom = T.net(act.acc), acFB = T.net(act.fb), acOth = T.net(act.oth);
      var monthTotal = act.total + bks.total;
      var fbPerRoom = act.rooms ? acFB / act.rooms : 0;
      var oosCount = act.roos || 0;
      var oosLost = oosCount * (act.adr || 0);
      var ydSleepers = yd && yd.sleepers ? yd.sleepers : (to && to.sleepers ? to.sleepers : 0);
      var ydAdults = Math.round(ydSleepers * 0.9), ydChildren = Math.round(ydSleepers * 0.09), ydInfants = Math.max(0, ydSleepers - ydAdults - ydChildren);
      var monthName = new Date(cut + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      var stockMonth = act.rooms && act.occ ? Math.round(act.rooms / act.occ) : 0;

      // Tile helper matching the ctile() shape (.tile with .l / .v / .d children)
      // so it slots into the existing .tiles grid with the same styling.
      function t2(h, v, s) {
        return '<div class="tile"><div class="l">' + h + '</div><div class="v">' + v + '</div><div class="d">' + (s || '') + '</div></div>';
      }

      // Defensive accessors — bks/all/n7 can be partially empty when the forward
      // pull hasn't landed yet. Default to 0 so the tiles always render.
      var bksTotal = (bks && bks.total) || 0, bksRooms = (bks && bks.rooms) || 0;
      var allOcc = (all && all.occ) || 0;
      var n7Rooms = (n7 && n7.rooms) || 0, n7Occ = (n7 && n7.occ) || 0, n7Acc = (n7 && n7.acc) || 0;
      var mTotal = (act && act.total) || 0, mRooms = (act && act.rooms) || 0;
      var monthForecastTotal = mTotal + bksTotal;

      today = '<div class="hp-today"><div class="hp-th">' + icon('trading', 38) + '<div><h3>Latest trading position</h3><p>' + esc(monthName) + ' · from the Guestline report received ' + when(S.af.asOf) + '</p></div>' + (age >= 1 ? '<span class="pill warn" style="margin-left:auto">Report is ' + age + ' day' + (age > 1 ? 's' : '') + ' old · load the latest to update</span>' : '') + '<button class="hp-link" style="display:none" data-go="pf-trading"' + (age >= 1 ? ' style="margin-left:10px"' : '') + '>Open Trading</button></div><div class="tiles">' +
        // ─── Row 1: THREE REVENUE BOXES (what you asked for) ────────────────
        t2('Revenue closed', gbp(mTotal), num(mRooms) + ' rooms sold · actual from Guestline') +
        t2('Revenue on books', gbp(bksTotal), num(bksRooms) + ' rooms forward · confirmed bookings') +
        t2('Total for month', gbp(monthForecastTotal), pc(allOcc) + ' occupancy · closed + on books') +
        // ─── Row 2: Operating KPIs ─────────────────────────────────────────
        t2('Rooms sold', '<b>' + num(mRooms) + '</b>' + (stockMonth ? ' <span style="color:#7b8494;font-weight:500">of ' + num(stockMonth) + '</span>' : ''), pc(act.occ) + ' occupancy on ' + T.LETTABLE + ' lettable · ' + gbp(acAccom) + ' accommodation') +
        t2('Occupancy', pc(act.occ), num(mRooms) + (stockMonth ? ' of ' + num(stockMonth) + ' lettable' : '')) +
        t2('ADR', gbp(act.adr, 2), 'average daily rate net of VAT') +
        t2('RevPAR', gbp(act.revpar, 2), 'rooms revenue ÷ ' + T.LETTABLE + ' lettable') +
        t2('TRevPAR', gbp(act.trevpar, 2), 'all revenue ÷ ' + T.LETTABLE + ' lettable') +
        t2('Food &amp; Beverage', gbp(acFB), gbp(fbPerRoom, 2) + ' per room sold') +
        t2('Other revenue', gbp(acOth), 'room hire, conference, misc, sundries') +
        t2('Guests in the hotel', '<b>' + num(ydSleepers) + '</b>', ydAdults + ' adults · ' + ydChildren + ' children · ' + ydInfants + ' infants') +
        t2('Revenue lost to OOS', gbp(oosLost), num(oosCount) + ' room-nights × that night\'s ADR') +
        t2('Tonight, on the books', to ? '<b>' + num(to.rooms) + '</b> rooms' : '—', to ? gbp(rate(to), 2) + ' ADR · ' + gbp(T.net(to.acc)) + ' rooms revenue' : 'data pending') +
        t2('Next 7 nights, on the books', '<b>' + num(n7Rooms) + '</b> rooms · ' + pc(n7Occ), gbp(n7Acc) + ' rooms revenue') +
        '</div>' +
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
    // v39.22 — mf-slot (Manager's Flash → Highlights + tables + F&B overview) now
    // renders RIGHT HERE, after the today card (hero + trading tiles + big chart).
    h += '<div id="mf-slot" class="mf-slot"><div class="mf-load">🎩 ARIA is preparing your Manager\'s Flash…</div></div>';
    card.actions = openCount(H.bad) + ' actions · ' + openCount(H.warn) + ' to watch'; card.data = (S.received ? S.received.length : 0) + ' Guestline reports on record';
    h += '<div class="hp-cards">' + CARDS.map(function (c) { return '<button class="hp-card' + (c[1] === 'trading' ? ' hot' : '') + '" data-go="' + c[0] + '" style="--c:' + COL[c[1]] + ';--img:url(img/' + (CARD_IMG[c[1]] || CARD_DEFAULT) + ')">' + icon(c[1]) + '<span><b>' + c[2] + '</b><small>' + c[3] + '</small>' + (card[c[1]] ? '<em>' + esc(card[c[1]]) + '</em>' : '') + '</span></button>'; }).join('') + '</div>' +
      '<p class="hp-foot"><a data-go="pf-data">Data references</a> · where every figure comes from and when it was imported &nbsp;|&nbsp; <a data-go="pf-help">How figures are worked out</a> &nbsp;|&nbsp; <a data-go="pf-brief">Project brief</a></p>';
    el.innerHTML = h;
    hubChart();
    try { fetchAndRenderFlash(); } catch (e) {}
  }

  /* ============================================================
     v39.9 — Manager's Flash section
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
        /* v39.30 — expose flash globally so the coloured revenue boxes in
           hosbusiness-v13.js can read from the authoritative monthForecast
           figures (same source Alia uses) instead of rebuilding them. */
        window.LATEST_FLASH = j.flash;
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

  /* v39.18 — tooltip helper. Produces an ⓘ icon with hover-expanded info panel.
     `title` is the bold headline, `body` is the full explanation (HTML-safe via esc), `formula` an optional formula line. */
  function mfTip(title, body, formula) {
    return '<span class="mf-i" tabindex="0" title="' + esc(title + ' — ' + body) + '">i' +
      '<span class="mf-tt"><b>' + esc(title) + '</b><br>' + esc(body) +
      (formula ? '<div class="mf-tt-f">Formula: ' + esc(formula) + '</div>' : '') +
      '</span></span>';
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

    // v39.22 — Full "Latest trading position" KPI grid, Alia-report style.
    // Replaces the earlier Actual/On-books/Month-end tiles. Thirteen compact tiles
    // across two rows: revenue, rooms sold, occupancy, ADR, RevPAR, TRevPAR, F&B,
    // Other revenue, Guests, OOS lost, Tonight on books, Next 7 nights on books,
    // Month with bookings held. All MTD, from gl_days + hosrev_books feeds.
    var mf = flash.monthForecast;
    var tm = flash.twelveMonth;
    var tradingHtml = '';
    if (m && mf && mf.monthEnd) {
      var monthName = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      var asOf = mf.asOf ? new Date(mf.asOf) : new Date();
      var asOfLabel = asOf.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' + asOf.toLocaleTimeString('en-GB').slice(0, 5);
      var mNights = mf.actual ? mf.actual.nights : 0;
      // Stock for the month = nights × 114 lettable
      var stockMonth = mNights > 0 ? mNights * 114 : 0;
      var occPctM = (m.occ || 0) * 100;
      var accomNetM = m.accomNet || 0;
      // Tile 10 — OOS revenue lost MTD: m.oos nights × MTD ADR
      var oosLost = (m.oos || 0) * (m.adrNet || 0);
      // Tile 11 & 12 — tonight & next 7 nights on-books (from hosrev_books surfaced in flash.onBooksTonight / flash.next7)
      var tonight = flash.onBooksTonight || null;
      var next7 = flash.onBooksNext7 || null;
      // Tile 13 — Month-end forecast ("Nov with bookings held")
      var monthHeld = mf.monthEnd.total || 0;
      var monthHeldOcc = ((mf.monthEnd.occPct || 0) * 100).toFixed(1);
      // Tile 7 — F&B revenue (MTD)
      var fbPerRoom = (m.sold || 0) > 0 ? (m.fbNet || 0) / m.sold : 0;
      // Tile 8 — Other revenue (= total - accom - F&B)
      var otherRev = (m.revNet || 0) - (m.accomNet || 0) - (m.fbNet || 0);
      // Guests in the hotel — use yesterday's sleeper count
      var sleepers = d.sleepers || 0;
      var adults = Math.round(sleepers * 0.9), children = Math.round(sleepers * 0.09), infants = Math.max(0, sleepers - adults - children);

      // Tile render helper
      function tp(lbl, val, sub) {
        return '<div class="mf-tp">' +
          '<div class="mf-tp-l">' + lbl + '</div>' +
          '<div class="mf-tp-v">' + val + '</div>' +
          (sub ? '<div class="mf-tp-s">' + sub + '</div>' : '') +
        '</div>';
      }

      tradingHtml =
        '<div class="mf-trading-card">' +
          '<div class="mf-trading-hd">' +
            '<div><span class="mf-trading-dot"></span>Latest trading position <span class="mf-trading-live">Guestline API</span></div>' +
            '<div class="mf-trading-ts">' + esc(monthName) + ' · from the Guestline report received ' + esc(asOfLabel) + '</div>' +
          '</div>' +

          // 13-tile KPI grid (two rows of ~7 tiles via auto-flow grid)
          '<div class="mf-tp-grid">' +
            tp(monthName + ' revenue', mfGbp(m.revNet || 0), mNights + ' nights · ' + (m.sold || 0) + ' room nights') +
            tp('Rooms sold', '<b>' + (m.sold || 0).toLocaleString('en-GB') + '</b>' + (stockMonth ? ' <span class="mf-tp-dim">of ' + stockMonth.toLocaleString('en-GB') + '</span>' : ''),
               (stockMonth ? occPctM.toFixed(1) + '% occupancy on 114 lettable · ' : '') + mfGbp(accomNetM) + ' accommodation') +
            tp('Occupancy', occPctM.toFixed(1) + '%', (m.sold || 0) + ' of ' + (stockMonth || 'n/a') + ' lettable') +
            tp('ADR', mfGbp(m.adrNet || 0), 'average daily rate net of VAT') +
            tp('RevPAR', mfGbp(m.revparNet || 0), 'rooms revenue ÷ 114 lettable') +
            tp('TRevPAR', mfGbp(m.trevparNet || 0), 'all revenue ÷ 114 lettable') +
            tp('Food &amp; Beverage', mfGbp(m.fbNet || 0), '£' + fbPerRoom.toFixed(2) + ' per room sold') +
            tp('Other revenue', mfGbp(otherRev), 'room hire, conference, misc, sundries') +
            tp('Guests in the hotel', '<b>' + sleepers + '</b>', adults + ' adults · ' + children + ' children · ' + infants + ' infants') +
            tp('Revenue lost to OOS', mfGbp(oosLost), (m.oos || 0) + ' room-nights × that night\'s ADR') +
            tp('Tonight, on the books', (tonight ? '<b>' + tonight.rooms + '</b> rooms' : '—'),
               (tonight ? mfGbp(tonight.adr) + ' ADR · ' + mfGbp(tonight.revenueNet) + ' revenue' : 'data pending')) +
            tp('Next 7 nights, on the books', (next7 ? '<b>' + next7.rooms + '</b> rooms · ' + ((next7.occPct || 0) * 100).toFixed(1) + '%' : '—'),
               (next7 ? mfGbp(next7.revenueNet) + ' rooms revenue' : 'data pending')) +
            tp(new Date().toLocaleDateString('en-GB', { month: 'short' }) + ', with bookings held', mfGbp(monthHeld), monthHeldOcc + '% occupancy for the month') +
          '</div>' +
        '</div>';
    }

    // Highlights strip — 3 populated now, booking-source / segment markers reserved for later feeds
    var highlightsHtml = '';
    if (m && d) {
      var avgSold = mNights > 0 ? (m.sold || 0) / mNights : 0;
      var oosLostH = (m.oos || 0) * (m.adrNet || 0);
      // Yesterday vs same-day-last-week
      var daySelf = d.revNet || 0;
      var dayLW = (flash.sameDayLastWeek && flash.sameDayLastWeek.revNet) || null;
      var vsLWPct = (dayLW && dayLW > 0) ? ((daySelf - dayLW) / dayLW * 100) : null;
      var vsLWTxt = dayLW ? ('Sun ' + mfGbp(dayLW)) : 'no prior week data';
      highlightsHtml =
        '<div class="mf-hi-card">' +
          '<div class="mf-hi-hd">Highlights <span class="mf-trading-live">Guestline API</span></div>' +
          '<div class="mf-hi-grid">' +
            '<div class="mf-hi-t"><div class="mf-hi-l">Yesterday vs same day last week</div>' +
              '<div class="mf-hi-v">' + mfGbp(daySelf) + (vsLWPct != null ? ' <span class="' + (vsLWPct >= 0 ? 'mf-up' : 'mf-down') + '">' + (vsLWPct >= 0 ? '+' : '') + vsLWPct.toFixed(1) + '%</span>' : '') + '</div>' +
              '<div class="mf-hi-s">' + esc(vsLWTxt) + '</div>' +
            '</div>' +
            '<div class="mf-hi-t"><div class="mf-hi-l">Average rooms sold</div>' +
              '<div class="mf-hi-v">' + avgSold.toFixed(1) + ' of 114 lettable</div>' +
              '<div class="mf-hi-s">Across ' + mNights + ' nights (' + esc(monthName) + ')</div>' +
            '</div>' +
            '<div class="mf-hi-t"><div class="mf-hi-l">Out-of-service revenue lost</div>' +
              '<div class="mf-hi-v">' + mfGbp(oosLostH) + '</div>' +
              '<div class="mf-hi-s">' + (m.oos || 0) + ' room-nights at the period ADR of ' + mfGbp(m.adrNet || 0) + '</div>' +
            '</div>' +
            '<div class="mf-hi-t"><div class="mf-hi-l">Top booking source yesterday</div>' +
              '<div class="mf-hi-v">' + ((flash.topSource && flash.topSource.name) || '—') + (flash.topSource && flash.topSource.revenue ? ' · ' + mfGbp(flash.topSource.revenue) : '') + '</div>' +
              '<div class="mf-hi-s">' + ((flash.topSource) ? 'Accommodation revenue through this channel' : 'booking-source feed pending') + '</div>' +
            '</div>' +
            '<div class="mf-hi-t"><div class="mf-hi-l">Top segment yesterday</div>' +
              '<div class="mf-hi-v">' + ((flash.topSegment && flash.topSegment.name) || '—') + (flash.topSegment && flash.topSegment.rooms ? ' · ' + flash.topSegment.rooms + ' rooms' : '') + '</div>' +
              '<div class="mf-hi-s">' + ((flash.topSegment && flash.topSegment.pct) ? (flash.topSegment.pct * 100).toFixed(1) + '% of rooms sold' : 'segment feed pending') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    // 12-month forecast banner — one line, clickable
    var tmHtml = '';
    if (tm && tm.rollup) {
      var vsLY12 = tm.rollup.vsLYPct;
      var vsLY12Html = (vsLY12 == null) ? '' :
        '<span style="color:' + (vsLY12 >= 0 ? '#1a6442' : '#8a1e15') + ';font-weight:700">' + (vsLY12 >= 0 ? '▲ +' : '▼ ') + (vsLY12 * 100).toFixed(1) + '%</span>';
      tmHtml =
        '<div class="mf-12m">' +
          '<div class="mf-12m-l">Next 12 months forecast · <b>' + mfGbp(tm.rollup.forecastTotal || 0) + '</b> vs LY ' + mfGbp(tm.rollup.lyTotal || 0) + ' ' + vsLY12Html + '</div>' +
          '<div class="mf-12m-r">On books: <b>' + mfGbp(tm.rollup.onBooksTotal || 0) + '</b> · ' + (tm.rollup.rooms || 0) + ' rooms forward</div>' +
        '</div>';
    }

    // KPI row — now labelled DAY so the headline Month-end projection isn't confused with it
    var kpiHtml = '<div class="mf-kpi-h">Yesterday · ' + esc(flash.forDate ? new Date(flash.forDate + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : '') + '</div>' +
      '<div class="mf-kpi">' +
      '<div class="mf-kpi-t mf-kpi-occ"><div class="mf-kpi-l">Occupancy</div><div class="mf-kpi-v">' + mfPct(d.occ) + '</div><div class="mf-kpi-s">' + d.sold + ' of ' + d.stock + ' rooms</div></div>' +
      '<div class="mf-kpi-t mf-kpi-adr"><div class="mf-kpi-l">ADR (net)</div><div class="mf-kpi-v">' + mfGbpDp(d.adrNet) + '</div><div class="mf-kpi-s">accommodation</div></div>' +
      '<div class="mf-kpi-t mf-kpi-rev"><div class="mf-kpi-l">RevPAR</div><div class="mf-kpi-v">' + mfGbpDp(d.revparNet) + '</div><div class="mf-kpi-s">net, per available room</div></div>' +
      '<div class="mf-kpi-t mf-kpi-tot"><div class="mf-kpi-l">Day revenue</div><div class="mf-kpi-v">' + mfGbp(d.revNet) + '</div><div class="mf-kpi-s">TRevPAR ' + mfGbpDp(d.trevparNet) + '</div></div>' +
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

    // F&B breakdown — v39.20: dropped the inner "Food & Beverage" sub-heading;
    // the parent "Food & Beverage Overview" section header sits immediately above.
    var fbHtml = '<table class="mf-t"><thead><tr><th>Metric</th><th>Day</th><th>WTD</th><th>MTD</th><th>YTD</th></tr></thead><tbody>' +
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
        // v39.22 — removed the "DAILY BUSINESS UPDATE" header and the duplicate
        // Latest trading position grid. The top of the Business Today page already
        // renders the Latest trading position card (13 tiles + big multi-series line
        // chart) from the `today` function. Keeping them in both was duplication.
        //
        // What stays in this renderFlash block: Highlights, 12-month forecast banner,
        // Revenue · net of VAT table, F&B Overview, posting split, items, charts and
        // Rooms & Rates. Everything below in the exact mock-up order (1 → 1A → 2 → 3).
        '<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px">' +
          '<a href="#revenue" class="mf-btn" style="text-decoration:none">ARIA commentary &amp; actions →</a>' +
          '<button class="mf-btn" data-mf-refresh>↻ Refresh</button>' +
        '</div>' +
        /* tradingHtml removed — already in the `today` card at the top of the page */
        highlightsHtml +
        tmHtml +
        '' + /* kpiHtml removed in v39.22 — info already in the trading tiles above */
        '<h3 class="mf-sh">Revenue · net of VAT' +
          mfTip('Revenue — net of VAT', 'All figures exclude 20% VAT. Day = yesterday\'s close. WTD = Monday of this week to yesterday. MTD = 1st of month to yesterday. YTD = 1 January to yesterday. Comes from the Guestline Rezlynx daily financial feed (gl_days collection) — populated by the 05:00 overnight pull.',
            'Net = Gross − VAT, pulled from Rezlynx analysis-code groups (ACCOM, FOOD, BEVERAGE, CONFERENCE, MISC, SUNDRIES)') +
        '</h3>' +
        '<table class="mf-t"><thead><tr><th>Metric</th><th>Day</th><th>WTD</th><th>MTD</th><th>YTD</th></tr></thead><tbody>' +
          rrow('Total revenue', d.revNet, w.revNet, m.revNet, y.revNet, mfGbp) +
          rrow('— Accommodation', d.accomNet, w.accomNet, m.accomNet, y.accomNet, mfGbp) +
          rrow('— Food & Beverage', d.fbNet, w.fbNet, m.fbNet, y.fbNet, mfGbp) +
          rrow('— Conference', d.confNet, w.confNet, m.confNet, y.confNet, mfGbp) +
          rrow('— Misc & Sundries', (d.otherNet - d.confNet), (w.otherNet - w.confNet), (m.otherNet - m.confNet), (y.otherNet - y.confNet), mfGbp) +
          rrow('Payments received', d.payments, w.payments, m.payments, y.payments, mfGbp) +
        '</tbody></table>' +
        // v39.20 — new section heading before F&B block so it's clearly its own area
        // v39.22 — Reordered per mock-up (image 2 before image 3):
        //   (2) Weekday pattern → Rooms & Rates → Look Ahead Occupancy
        //   (3) Food & Beverage Overview → Yesterday's posting → Top items
        dowHtml +
        '<h3 class="mf-sh">Rooms &amp; rates' +
          mfTip('Rooms & rates', 'ADR, RevPAR, TRevPAR and per-room productivity metrics. All based on 114 lettable rooms (120 total minus 5 staff + 1 storage). Rooms sold comes from Rezlynx overnight audit.',
            'ADR = Accom revenue ÷ rooms sold · RevPAR = Accom revenue ÷ 114 lettable · TRevPAR = Total revenue ÷ 114') +
        '</h3>' +
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
        // (3) Food & Beverage Overview
        '<h3 class="mf-sh mf-sh-fb" style="margin-top:28px;border-top:2px solid #C7A87A;padding-top:16px;font-size:17px">Food &amp; Beverage Overview' +
          mfTip('Food & Beverage Overview', 'F&B revenue, covers, posting split and spend per cover. Covers the restaurant, bar and conference F&B. Food cost margin is in the F&B tab under Food Margins.',
            'F&B per occupied room = (Food + Beverage Net) ÷ rooms sold') +
        '</h3>' +
        fbHtml +
        itemsHtml +
        chartHtml +
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
      /* v39.18 — info tooltips for section headers. Hover the ⓘ icon to see
         what the data is and how it's calculated. Accessible via title fallback. */
      '.mf-i{display:inline-block;width:14px;height:14px;line-height:14px;text-align:center;border-radius:50%;background:#c8d9dd;color:#1a3b60;font-size:10px;font-weight:700;cursor:help;position:relative;margin-left:6px;vertical-align:middle;font-style:italic}',
      '.mf-i:hover{background:#1F7A8C;color:#fff}',
      '.mf-i .mf-tt{display:none;position:absolute;top:22px;left:-10px;width:300px;background:#1a2238;color:#fff;font-size:12px;font-weight:400;font-style:normal;line-height:1.5;padding:10px 12px;border-radius:6px;box-shadow:0 6px 16px rgba(0,0,0,.25);z-index:100;text-align:left;letter-spacing:0}',
      '.mf-i:hover .mf-tt{display:block}',
      '.mf-i .mf-tt b{color:#C7A87A}',
      '.mf-i .mf-tt .mf-tt-f{font-size:11px;color:#9bb5c8;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.15)}',
      '.mf-kpi-h{font-size:11px;font-weight:700;letter-spacing:.4px;color:#52647a;text-transform:uppercase;margin:18px 0 6px}',
      '.mf-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 18px}',
      /* v39.17 — Month-end projection headline */
      // v39.20 — "Latest trading position" card (replaces the old mf-proj block).
      // Lighter, Alia-style 3-box split: Revenue closed · Revenue on books · Month so far.
      '.mf-trading{background:#fff;border:1px solid #e4e2dc;border-left:4px solid #C7A87A;border-radius:10px;padding:16px 20px;margin-bottom:14px;box-shadow:0 1px 4px rgba(8,16,26,.04)}',
      '.mf-trading-hd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:700;color:#1a2238;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #efece5;flex-wrap:wrap;gap:8px}',
      '.mf-trading-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}',
      '.mf-trading-box{padding:14px 16px;border-radius:8px;border:1px solid #e4e2dc;background:#fdfbf6}',
      '.mf-tb-closed{background:#eef7f9;border-color:#b9d4da}',
      '.mf-tb-books{background:#eef3f8;border-color:#c8d9dd}',
      '.mf-tb-month{background:#1a2238;border-color:#1a2238;color:#fff}',
      '.mf-tb-l{font-size:10.5px;font-weight:700;letter-spacing:.4px;color:#52514e;text-transform:uppercase;margin-bottom:4px}',
      '.mf-tb-month .mf-tb-l{color:#C7A87A}',
      '.mf-tb-v{font-size:26px;font-weight:800;letter-spacing:-.4px;color:#1a2238;margin:2px 0}',
      '.mf-tb-month .mf-tb-v{color:#fff}',
      '.mf-tb-s{font-size:11.5px;color:#7b8494;margin-top:2px}',
      '.mf-tb-month .mf-tb-s{color:#bfdde3}',
      '.mf-trading-ft{font-size:11px;color:#7b8494;padding-top:8px;border-top:1px solid #efece5;line-height:1.5}',
      // v39.22 — Latest trading position card + 13-tile KPI grid (Alia-style)
      '.mf-trading-card{background:#fdfbf6;border:1px solid #e4e2dc;border-left:4px solid #C7A87A;border-radius:10px;padding:16px 20px;margin-bottom:14px}',
      '.mf-trading-card .mf-trading-hd{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;border-bottom:none;padding-bottom:0;margin-bottom:12px}',
      '.mf-trading-card .mf-trading-hd>div:first-child{font-size:14px;font-weight:700;color:#1a2238}',
      '.mf-trading-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#1a7f4b;margin-right:8px;vertical-align:middle;box-shadow:0 0 0 3px rgba(26,127,75,.18)}',
      '.mf-trading-live{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.3px;color:#1a7f4b;background:#e8f3ec;border:1px solid #c3dcc7;padding:2px 7px;border-radius:12px;margin-left:8px;text-transform:uppercase;vertical-align:middle}',
      '.mf-trading-ts{font-size:12px;color:#7b8494}',
      '.mf-tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1px;background:#e4e2dc;border:1px solid #e4e2dc;border-radius:8px;overflow:hidden}',
      '.mf-tp{background:#fff;padding:12px 14px;min-height:72px}',
      '.mf-tp-l{font-size:11px;color:#52647a;margin-bottom:4px;line-height:1.3}',
      '.mf-tp-v{font-size:19px;font-weight:700;color:#1a2238;letter-spacing:-.2px;line-height:1.1;margin-bottom:3px}',
      '.mf-tp-v b{font-weight:800}',
      '.mf-tp-dim{color:#7b8494;font-weight:500;font-size:14px}',
      '.mf-tp-s{font-size:11px;color:#7b8494;line-height:1.35}',
      // Highlights card
      '.mf-hi-card{background:#fff;border:1px solid #e4e2dc;border-radius:10px;padding:14px 18px;margin-bottom:14px}',
      '.mf-hi-hd{font-size:12px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:#1a2238;margin-bottom:10px}',
      '.mf-hi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}',
      '.mf-hi-t{padding:4px 2px}',
      '.mf-hi-l{font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:#7b8494;margin-bottom:4px}',
      '.mf-hi-v{font-size:16px;font-weight:700;color:#1a2238;line-height:1.2;margin-bottom:3px}',
      '.mf-hi-s{font-size:11px;color:#52647a;line-height:1.35}',
      '.mf-up{color:#1a7f4b;font-weight:700;font-size:13px}',
      '.mf-down{color:#8a1e15;font-weight:700;font-size:13px}',
      // Legacy mf-proj block kept for anywhere it may still be referenced.
      '.mf-proj{background:linear-gradient(135deg,#1a2238 0%,#145866 100%);color:#fff;border-radius:12px;padding:20px 22px;margin-bottom:14px;box-shadow:0 4px 14px rgba(20,34,56,.18)}',
      '.mf-proj-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px;flex-wrap:wrap}',
      '.mf-proj-k{font-size:11px;font-weight:700;letter-spacing:.8px;color:#C7A87A;text-transform:uppercase;margin-bottom:3px}',
      '.mf-proj-sub{font-size:12px;color:#bfdde3;margin-top:3px}',
      '.mf-proj-ly{text-align:right;background:rgba(255,255,255,.08);padding:8px 14px;border-radius:8px}',
      '.mf-proj-ly-l{font-size:10px;font-weight:700;letter-spacing:.4px;color:#9bb5c8;text-transform:uppercase}',
      '.mf-proj-ly-v{font-size:14px;font-weight:700;margin-top:2px;color:#fff}',
      '.mf-proj-row{display:grid;grid-template-columns:1fr auto 1fr auto 1.2fr;align-items:center;gap:10px;margin-bottom:12px}',
      '.mf-proj-t{padding:14px 16px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);text-align:left}',
      '.mf-proj-end{background:#C7A87A !important;color:#1a2238 !important;border-color:transparent !important}',
      '.mf-proj-end .mf-proj-l{color:#5a4320 !important}',
      '.mf-proj-end .mf-proj-s{color:#5a4320 !important;opacity:.85}',
      '.mf-proj-plus{font-size:28px;font-weight:300;color:#9bb5c8;text-align:center}',
      '.mf-proj-l{font-size:10.5px;font-weight:700;letter-spacing:.4px;color:#9bb5c8;text-transform:uppercase;margin-bottom:4px}',
      '.mf-proj-v{font-size:30px;font-weight:800;letter-spacing:-.4px;margin:2px 0;color:#fff}',
      '.mf-proj-s{font-size:11px;color:#9bb5c8;margin-top:2px}',
      '.mf-proj-ft{font-size:11.5px;color:#bfdde3;line-height:1.55;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)}',
      '.mf-proj-ft b{color:#fff}',
      '@media (max-width:900px){.mf-proj-row{grid-template-columns:1fr !important}.mf-proj-plus{display:none}}',
      /* 12-month strip */
      '.mf-12m{background:#eef3f8;border:1px solid #c8d9dd;border-left:4px solid #1F7A8C;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;color:#2c3440}',
      '.mf-12m b{color:#1a2238}',
      '.mf-12m-r{color:#52647a;font-size:12px}',
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
  // v39.16: added Food Costs sub-tab (invoice upload + mapping + margin)
  function fbSeg(P) { var TP = window.Trading && window.Trading.S().x ? window.Trading.S().x.plu : null; return '<div class="segs">' + [['over', 'Overview'], ['cov', 'Covers'], ['costs', 'Food Costs'], ['margins', 'Food Margins'], ['tillv', 'Till Verification'], ['fbdisc', 'F&B Discrepancies'], ['disc', 'Discount impact'], ['term', 'By terminal'], ['brk', 'Breakfast'], ['menu', 'What we sell']].map(function (v) { var off = v[0] === 'term' ? !TP : ((v[0] === 'brk' || v[0] === 'menu') && !P); return '<button class="' + (fbView === v[0] ? 'on' : '') + '" data-fb="' + v[0] + '"' + (off ? ' disabled title="' + (v[0] === 'term' ? 'Needs the till item sales reports' : 'Needs the Rezlynx Postings report') + '"' : '') + '>' + v[1] + '</button>'; }).join('') + '</div>'; }
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
  /* v39.9 — Covers section at top of F&B tab. Reads from backend /fbCovers endpoint.
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

  /* v39.13 — Covers sub-tab renderer. Shows the covers card (from fbCovers endpoint) as its own tab. */
  function renderCov(el, S, P) {
    var h = fbSeg(P);
    h += '<div id="fb-covers-slot"><div class="card"><h2>Covers · last 30 days ' + fbGlTick() + '</h2><p class="sub">Loading…</p></div></div>';
    el.innerHTML = h;
    if (FB_COVERS_CACHE) { var slot = $('fb-covers-slot'); if (slot) slot.innerHTML = fbCoversHtml(FB_COVERS_CACHE); }
    else fetchFbCovers(function (html) { var slot = $('fb-covers-slot'); if (slot) slot.innerHTML = html; });
  }

  /* v39.14 — Discount impact section. Reads from TP.terms (Postings report)
     for discount totals + item-level breakdown. Awaits start-date input to
     drive the before/after analysis. */
  var DISCOUNT_SETTINGS_KEY = 'hosbusiness_discount_settings';
  function getDiscSettings() {
    try { var o = JSON.parse(localStorage.getItem(DISCOUNT_SETTINGS_KEY) || 'null'); if (o) return o; } catch (e) {}
    return { startDate: '2026-11-01', scope: '15% off food, all diners', pct: 15 };
  }
  function setDiscSettings(s) { try { localStorage.setItem(DISCOUNT_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }

  function renderDisc(el, S, P) {
    var settings = getDiscSettings();
    var h = fbSeg(P);
    var TP = S.x && S.x.plu ? S.x.plu : null;

    // Total discount from Postings report (TP.terms[k].adj)
    var totalDisc = 0, totalGross = 0, totalNet = 0, termSplit = {};
    if (TP) {
      Object.keys(TP.terms).forEach(function (k) {
        var t = TP.terms[k];
        totalDisc += t.adj || 0;
        totalGross += t.gross || 0;
        totalNet += t.net || 0;
        termSplit[k] = { adj: t.adj || 0, gross: t.gross || 0, net: t.net || 0, items: t.items || [] };
      });
    }
    var discPct = totalGross > 0 ? -totalDisc / totalGross : 0;
    var days = TP ? Math.round((Date.parse(TP.to || P.to) - Date.parse(TP.from || P.from)) / 864e5) + 1 : 0;

    // Top discounted items across all tills
    var allDiscItems = [];
    if (TP) {
      Object.keys(TP.terms).forEach(function (k) {
        (TP.terms[k].items || []).forEach(function (it) {
          if (it[3] && it[3] < 0) allDiscItems.push({ name: it[0], qty: it[1], net: it[4], disc: it[3], till: k });
        });
      });
    }
    allDiscItems.sort(function (a, b) { return a.disc - b.disc; }); // most negative first
    var topDisc = allDiscItems.slice(0, 15);

    h += (
      // Config strip
      '<div class="card"><h2>Food discount tracker</h2><p class="sub">Measures the ongoing 15% food discount — how much we are giving away, which tills, which dishes, and whether it is driving incremental covers. Awaits start-date to split before / after.</p>' +
        '<div class="filters" style="margin:12px 0 0">' +
          '<label>Discount start date <input type="date" id="disc-start" value="' + (settings.startDate || '') + '" style="margin-left:6px"></label>' +
          '<label>Discount % <input type="number" id="disc-pct" value="' + settings.pct + '" min="0" max="100" style="width:60px;margin-left:6px"></label>' +
          '<label style="flex:1;min-width:300px">Scope <input type="text" id="disc-scope" value="' + (settings.scope || '') + '" placeholder="e.g. 15% off food for in-house guests, lunch & dinner" style="width:100%"></label>' +
          '<button class="btn" id="disc-save">Save</button>' +
        '</div>' +
      '</div>' +

      // Totals tiles
      (TP ? (
        '<div class="tiles">' +
          tile('Total discount given', gbp(-totalDisc), 'Over ' + days + ' days from Postings report') +
          tile('Discount %', pc(discPct) + ' of gross', 'of £' + Math.round(totalGross).toLocaleString('en-GB') + ' menu price incl VAT') +
          tile('Daily average', gbp(days > 0 ? -totalDisc / days : 0), 'given away per day') +
          tile('Estimated annual run-rate', gbp(days > 0 ? (-totalDisc / days) * 365 : 0), 'at current pace') +
        '</div>'
      ) : '<div class="card"><h2>No Postings data loaded yet</h2><p class="sub">Discount totals come from the Rezlynx Postings report. Ask Glen to upload the latest report via the <em>Costs</em> tab, or wait for Gary to wire the automatic feed.</p></div>') +

      // By till
      (TP ? (
        '<div class="card"><h2>Discount by till</h2><p class="sub">Where the money is going</p>' +
          '<table><tr><th>Till</th><th class="n">Gross sales</th><th class="n">Discount given</th><th class="n">% of gross</th><th class="n">Net sales</th></tr>' +
          Object.keys(termSplit).sort(function (a, b) { return termSplit[a].adj - termSplit[b].adj; }).map(function (k) {
            var t = termSplit[k];
            var pct = t.gross > 0 ? -t.adj / t.gross : 0;
            return '<tr><td>' + esc(k) + '</td><td class="n">' + gbp(t.gross) + '</td><td class="n" style="color:#c0392b">' + gbp(t.adj) + '</td><td class="n">' + pc(pct) + '</td><td class="n">' + gbp(t.net) + '</td></tr>';
          }).join('') +
          '</table>' +
        '</div>'
      ) : '') +

      // Before / after — needs start date
      '<div class="card"><h2>Before vs after · did it work?</h2>' +
        (!settings.startDate ? (
          '<p class="sub">Set the discount start date above to run the before/after analysis — this compares F&amp;B revenue per occupied room, total covers, and total F&amp;B revenue in the equivalent windows before and after the discount launch.</p>' +
          '<p class="sub"><em>Waiting on start date input to compute.</em></p>'
        ) : (function () {
          // Simple before/after using S.af rows (closed-day actuals)
          var rows = (S.af && S.af.rows) ? S.af.rows : [];
          var start = settings.startDate;
          var after = rows.filter(function (r) { return r.d >= start; });
          var before = rows.filter(function (r) { return r.d < start; });
          var N = after.length;
          var beforeSlice = before.slice(-N);
          var sumFB = function (arr) { return arr.reduce(function (t, r) { return t + (r.food || 0) + (r.bev || 0); }, 0); };
          var sumRooms = function (arr) { return arr.reduce(function (t, r) { return t + (r.sold || 0); }, 0); };
          var bFB = sumFB(beforeSlice), aFB = sumFB(after);
          var bRm = sumRooms(beforeSlice), aRm = sumRooms(after);
          var bPerRm = bRm > 0 ? bFB / bRm : 0, aPerRm = aRm > 0 ? aFB / aRm : 0;
          var deltaFB = aFB - bFB, deltaPerRm = aPerRm - bPerRm;
          var verdict = deltaPerRm > 2 ? 'Likely working — F&B per occupied room lifted £' + deltaPerRm.toFixed(2) + ' vs the equivalent earlier window' :
                        deltaPerRm < -2 ? 'Not covering the give-away — F&B per room DOWN £' + Math.abs(deltaPerRm).toFixed(2) + ' vs the earlier window, plus we give £' + Math.round(-totalDisc / days).toLocaleString('en-GB') + '/day away' :
                        'Inconclusive — F&B per occupied room changed by only £' + deltaPerRm.toFixed(2) + ' either way';
          return '<p class="sub">Comparing the ' + N + ' nights since ' + start + ' vs the ' + N + ' nights immediately before.</p>' +
            '<div class="tiles">' +
              tile('F&B — after', gbp(aFB), aRm + ' occupied rooms · ' + gbp(aPerRm, 2) + ' per room') +
              tile('F&B — before', gbp(bFB), bRm + ' occupied rooms · ' + gbp(bPerRm, 2) + ' per room') +
              tile('F&B per room change', (deltaPerRm >= 0 ? '+' : '') + gbp(deltaPerRm, 2), 'with ' + settings.pct + '% discount active') +
              tile('Total F&B change', (deltaFB >= 0 ? '+' : '') + gbp(deltaFB), N + ' nights each side') +
            '</div>' +
            '<div class="finding ' + (deltaPerRm > 2 ? 'good' : deltaPerRm < -2 ? 'bad' : 'warn') + '"><h3>Verdict</h3><p>' + esc(verdict) + '</p></div>';
        })()) +
      '</div>' +

      // Top discounted items
      (topDisc.length ? (
        '<div class="card"><h2>Top 15 most-discounted dishes</h2><p class="sub">Sorted by total discount £. Discount is shown as a negative number (£ given away)</p>' +
          '<table><tr><th>Dish</th><th>Till</th><th class="n">Qty sold</th><th class="n">Net sales</th><th class="n">Discount</th><th class="n">% off</th></tr>' +
          topDisc.map(function (d) {
            var pct = d.net > 0 ? -d.disc / (d.net + -d.disc) : 0;
            return '<tr><td>' + esc(d.name) + '</td><td>' + esc(d.till) + '</td><td class="n">' + d.qty + '</td><td class="n">' + gbp(d.net) + '</td><td class="n" style="color:#c0392b">' + gbp(d.disc) + '</td><td class="n">' + pc(pct) + '</td></tr>';
          }).join('') +
          '</table>' +
        '</div>'
      ) : '')
    );

    el.innerHTML = h;

    // Wire the save handler
    var sBtn = document.getElementById('disc-save');
    if (sBtn) sBtn.onclick = function () {
      var startEl = document.getElementById('disc-start');
      var pctEl = document.getElementById('disc-pct');
      var scopeEl = document.getElementById('disc-scope');
      var newSettings = { startDate: startEl ? startEl.value : '', pct: pctEl ? +pctEl.value : 15, scope: scopeEl ? scopeEl.value : '' };
      setDiscSettings(newSettings);
      renderFb();
    };
  }

  /* v39.15 — F&B Discrepancies sub-tab. Pulls issues from live gl_days + Postings report. */
  function renderFbDisc(el, S, P) {
    var h = fbSeg(P);
    var TP = S.x && S.x.plu ? S.x.plu : null;
    var rows = (S.af && S.af.rows) ? S.af.rows : [];
    var discSettings = getDiscSettings();

    // Compute discrepancies
    var findings = [];

    // 1. Discount running above threshold
    if (TP) {
      var totalDisc = 0, totalGross = 0;
      Object.keys(TP.terms).forEach(function (k) { totalDisc += TP.terms[k].adj || 0; totalGross += TP.terms[k].gross || 0; });
      var discPct = totalGross > 0 ? -totalDisc / totalGross : 0;
      if (discPct > (discSettings.pct || 15) / 100 * 1.2) {
        findings.push({
          cat: 'anom', severity: 'high',
          title: 'Discount running ' + pc(discPct) + ' of gross — above target ' + (discSettings.pct || 15) + '%',
          detail: 'Total discount of ' + gbp(-totalDisc) + ' on ' + gbp(totalGross) + ' menu price (incl VAT). Target is ' + (discSettings.pct || 15) + '%; current is ' + Math.round(discPct * 100) + '%. Consider tightening eligibility, or raise menu prices to compensate.',
          figures: ['Given away: ' + gbp(-totalDisc), 'Of: ' + gbp(totalGross), '%: ' + pc(discPct)]
        });
      }
    }

    // 2. Till-level discount concentration
    if (TP) {
      var worst = null;
      Object.keys(TP.terms).forEach(function (k) {
        var t = TP.terms[k];
        if (!t.gross) return;
        var p = -t.adj / t.gross;
        if (!worst || p > worst.pct) worst = { till: k, adj: t.adj, gross: t.gross, pct: p };
      });
      if (worst && worst.pct > 0.15) {
        findings.push({
          cat: 'miss', severity: 'medium',
          title: worst.till + ' discounted at ' + pc(worst.pct) + ' of menu price',
          detail: 'The ' + worst.till + ' till has the highest discount rate — ' + gbp(-worst.adj) + ' taken off ' + gbp(worst.gross) + '. If this is intentional (loyalty, residents, staff), fine. If not, review the discount buttons on that terminal with Glen.',
          figures: ['Discount: ' + gbp(-worst.adj), 'Gross: ' + gbp(worst.gross), '%: ' + pc(worst.pct)]
        });
      }
    }

    // 3. Specific dishes with very heavy discount
    if (TP) {
      var heavyItems = [];
      Object.keys(TP.terms).forEach(function (k) {
        (TP.terms[k].items || []).forEach(function (it) {
          if (!it[3] || !it[4]) return;
          var disc = -it[3], sold = it[4] + -it[3];
          if (sold <= 0) return;
          var pct = disc / sold;
          if (pct > 0.25 && disc > 50) heavyItems.push({ name: it[0], till: k, qty: it[1], sold: sold, disc: disc, pct: pct });
        });
      });
      heavyItems.sort(function (a, b) { return b.disc - a.disc; });
      if (heavyItems.length) {
        findings.push({
          cat: 'miss', severity: 'low',
          title: heavyItems.length + ' dish' + (heavyItems.length === 1 ? '' : 'es') + ' discounted >25% of menu price',
          detail: heavyItems.slice(0, 5).map(function (x) { return x.name + ' (' + x.till + '): ' + x.qty + ' sold, ' + gbp(x.disc) + ' discount — ' + pc(x.pct); }).join(' · ') + (heavyItems.length > 5 ? ' …plus ' + (heavyItems.length - 5) + ' more' : ''),
          figures: heavyItems.slice(0, 3).map(function (x) { return x.name + ': ' + gbp(x.disc); })
        });
      }
    }

    // 4. F&B per occupied room trend — last 7 vs prior 7
    if (rows.length >= 14) {
      var tail = rows.slice(-14);
      var l7 = tail.slice(-7), p7 = tail.slice(0, 7);
      var fbPer = function (arr) {
        var fb = 0, rm = 0;
        arr.forEach(function (r) { fb += (r.food || 0) + (r.bev || 0); rm += r.sold || 0; });
        return rm > 0 ? fb / rm : 0;
      };
      var now7 = fbPer(l7), prev7 = fbPer(p7);
      var delta = prev7 > 0 ? (now7 - prev7) / prev7 : 0;
      if (delta < -0.10) {
        findings.push({
          cat: 'anom', severity: 'high',
          title: 'F&B per occupied room DOWN ' + pc(-delta) + ' vs prior 7',
          detail: 'Last 7 nights averaged ' + gbp(now7, 2) + ' F&B per occupied room vs ' + gbp(prev7, 2) + ' the prior 7 (' + pc(delta) + '). Likely causes: softer dining demand, more room-only bookings, or Glen\'s pricing/menu change not holding attach rate.',
          figures: ['Now: ' + gbp(now7, 2) + '/room', 'Prev: ' + gbp(prev7, 2) + '/room', 'Δ: ' + pc(delta)]
        });
      } else if (delta > 0.10) {
        findings.push({
          cat: 'win', severity: 'info',
          title: 'F&B per occupied room UP ' + pc(delta) + ' vs prior 7',
          detail: 'F&B per occupied room lifted from ' + gbp(prev7, 2) + ' to ' + gbp(now7, 2) + '. If the discount launched 1 Nov and this covers the discounted window, it\'s a strong signal that the discount is driving incremental covers — see the Discount Impact tab for the full before/after.',
          figures: ['Now: ' + gbp(now7, 2) + '/room', 'Prev: ' + gbp(prev7, 2) + '/room', 'Δ: +' + pc(delta)]
        });
      }
    }

    // 5. Covers below trend (if covers data available)
    if (window.FB_COVERS_CACHE && window.FB_COVERS_CACHE.days) {
      var days = window.FB_COVERS_CACHE.days;
      if (days.length >= 14) {
        var sumCov = function (arr) {
          return arr.reduce(function (t, d) { return t + ((d.breakfast || 0) + (d.lunch || 0) + (d.dinner || 0)); }, 0);
        };
        var cv7 = sumCov(days.slice(-7)), cvP = sumCov(days.slice(-14, -7));
        var cvDelta = cvP > 0 ? (cv7 - cvP) / cvP : 0;
        if (cvDelta < -0.08) {
          findings.push({
            cat: 'anom', severity: 'medium',
            title: 'Covers down ' + pc(-cvDelta) + ' vs prior 7 nights',
            detail: 'Last 7 nights served ' + cv7 + ' covers vs ' + cvP + ' the prior 7. Review with Glen: is it an occupancy effect (fewer in-house guests) or an attach-rate effect (same guests eating out elsewhere)?',
            figures: ['Last 7: ' + cv7 + ' covers', 'Prior 7: ' + cvP + ' covers', 'Δ: ' + pc(cvDelta)]
          });
        }
      }
    }

    // Render
    h += (
      '<div class="card"><h2>F&B Discrepancies &amp; watch-items</h2>' +
        '<p class="sub">ARIA auto-scans the F&B data for anomalies — discount concentration, specific dishes losing money, cover trend shifts, attach-rate changes. Click any finding to expand.</p>' +
        (findings.length === 0 ? (
          '<div class="finding good"><h3>Nothing to flag today</h3><p>F&B signals are within normal patterns. Keep an eye on the Discount Impact tab for the ongoing before/after on the 15% food discount.</p></div>'
        ) : (
          '<div style="margin-top:10px">' +
            findings.map(function (f) {
              var clr = f.cat === 'anom' ? '#8a1e15' : (f.cat === 'win' ? '#1a6442' : '#7a5f0b');
              var bg = f.cat === 'anom' ? '#fdf6f5' : (f.cat === 'win' ? '#f0f6ea' : '#fffbe8');
              var bd = f.cat === 'anom' ? '#f0d6d2' : (f.cat === 'win' ? '#d4e3c3' : '#ecd584');
              var icon = f.cat === 'anom' ? '⚡' : (f.cat === 'win' ? '✓' : '⚠');
              var sev = f.severity === 'high' ? '<span style="background:#c0362b;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-left:6px">HIGH</span>' : (f.severity === 'medium' ? '<span style="background:#eb6834;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-left:6px">MED</span>' : '');
              return '<details style="margin:6px 0;padding:0;background:' + bg + ';border:1px solid ' + bd + ';border-left:3px solid ' + clr + ';border-radius:6px">' +
                '<summary style="cursor:pointer;padding:12px 14px;font-size:13.5px;color:#1a2238;font-weight:600;list-style:none">' +
                  '<span style="color:' + clr + ';margin-right:6px">' + icon + '</span>' + esc(f.title) + sev +
                  '<span style="float:right;color:#7b8494;font-size:11px;margin-left:8px">▸ details</span>' +
                '</summary>' +
                '<div style="padding:4px 16px 14px;border-top:1px solid ' + bd + ';margin-top:4px">' +
                  '<p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#2c3440">' + esc(f.detail) + '</p>' +
                  (f.figures && f.figures.length ? '<p style="margin:10px 0 0;font-size:11.5px;color:#7b8494"><b>Key figures:</b> ' + f.figures.map(function (x) { return '<span style="background:#fff;padding:2px 6px;border-radius:3px;margin-right:4px;font-family:monospace;color:#1a2238">' + esc(x) + '</span>'; }).join(' ') + '</p>' : '') +
                '</div>' +
              '</details>';
            }).join('') +
          '</div>'
        )) +
      '</div>' +

      // Context cards
      '<div class="grid g2" style="margin-top:14px">' +
        '<div class="card"><h2>What this watches for</h2><ul style="margin:8px 0;padding-left:20px;font-size:13px;line-height:1.7">' +
          '<li>Discount % of gross above your target (currently ' + (discSettings.pct || 15) + '%)</li>' +
          '<li>Single till discounting above 15% of its gross</li>' +
          '<li>Individual dishes being discounted >25% from menu price</li>' +
          '<li>F&B per occupied room trend shifts (±10% vs prior 7 nights)</li>' +
          '<li>Cover count trend shifts (±8% vs prior 7 nights)</li>' +
        '</ul></div>' +
        '<div class="card"><h2>Coming next (when data lands)</h2><ul style="margin:8px 0;padding-left:20px;font-size:13px;line-height:1.7">' +
          '<li><b>Dish-level GP%</b> — needs food invoices (upload folder when ready)</li>' +
          '<li><b>Stock-on-hand</b> — bought vs sold reconciliation</li>' +
          '<li><b>Waste tracking</b> — unaccounted stock as a weekly anomaly</li>' +
          '<li><b>Breakfast attach rate</b> — vs expected based on in-house guests</li>' +
          '<li><b>Live postings scan</b> — tag discount lines from gl_items feed automatically (needs discount analysis code from Glen)</li>' +
        '</ul></div>' +
      '</div>'
    );

    el.innerHTML = h;
  }

  /* v39.16 — Food Costs sub-tab. Upload PDF invoices, view parsed line items,
     map supplier items to POS items, see aggregate spend. */
  var FB_COSTS_CACHE = null;
  function fetchFbCosts(cb) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) { cb({ error: 'Sign in required' }); return; }
    fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbInvoicesGet', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) { FB_COSTS_CACHE = j; cb(j); })
      .catch(function (e) { cb({ error: String(e) }); });
  }
  function uploadFbInvoices(files, onProgress) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) return Promise.reject(new Error('Sign in required'));
    var fd = new FormData();
    for (var i = 0; i < files.length; i++) fd.append('invoice' + i, files[i], files[i].name);
    return fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbInvoiceUpload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok }, body: fd })
      .then(function (r) { return r.json(); });
  }
  function setFbMapping(payload) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) return Promise.reject(new Error('Sign in required'));
    return fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbMappingSet', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }
  function suggestMapping(supplierItemName) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) return Promise.reject(new Error('Sign in required'));
    return fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbMappingSuggest', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ supplierItemName: supplierItemName }) })
      .then(function (r) { return r.json(); });
  }

  function renderFoodCosts(el, S, P) {
    var h = fbSeg(P);
    var cache = FB_COSTS_CACHE;
    var invoices = cache && cache.invoices ? cache.invoices : null;
    var aggregated = cache && cache.aggregated ? cache.aggregated : [];
    var mappings = cache && cache.mappings ? cache.mappings : {};
    var totalSpend = (aggregated || []).reduce(function (t, x) { return t + (x.totalSpend || 0); }, 0);
    var uniqueItems = (aggregated || []).length;
    var mappedCount = Object.keys(mappings).length;

    h += (
      '<div class="card"><h2>Food costs · supplier invoices</h2>' +
        '<p class="sub">Upload supplier PDFs (Bosworth, Philip Dennis — more suppliers added as needed). Line items are parsed automatically and stored for GP% calculation. Veronica\'s existing invoice stack can be bulk-uploaded in one go.</p>' +

        // v39.21 — POS menu-items CSV download, so Ajay/Veronica can manually map
        // supplier items to the real POS codes. Pulls last 90 days from gl_items.
        '<div style="padding:12px 16px;background:#eef3f8;border-left:3px solid #1F7A8C;border-radius:6px;margin:14px 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
          '<div style="flex:1;min-width:220px"><b style="color:#1a3b60">POS menu items reference</b>' +
            '<div style="font-size:12px;color:#52647a;margin-top:2px">Every unique POS code we\'ve seen sold in the last 90 days — download as CSV for mapping against supplier items.</div>' +
          '</div>' +
          '<button class="btn" id="fb-pos-csv" style="background:#1F7A8C;color:#fff;border:0;padding:8px 18px;border-radius:5px;font-weight:600;cursor:pointer">📥 Download POS items CSV</button>' +
        '</div>' +

        // Upload zone
        '<div id="fb-upload-zone" style="padding:30px;border:2px dashed #BB9979;border-radius:12px;background:#fdf8ee;text-align:center;cursor:pointer;margin:14px 0">' +
          '<div style="font-size:30px;margin-bottom:8px">📄</div>' +
          '<div style="font-size:15px;font-weight:600;color:#1a2b3a">Drop PDF invoices here, or click to browse</div>' +
          '<div style="font-size:12px;color:#7b8494;margin-top:4px">Supports multiple files · one or many</div>' +
          '<input type="file" id="fb-upload-input" multiple accept="application/pdf" style="display:none">' +
          '<div id="fb-upload-progress" style="margin-top:10px;font-size:12px;color:#1F7A8C;font-weight:600"></div>' +
        '</div>' +

        // Summary tiles
        (invoices === null ? '<div style="padding:16px;text-align:center;color:#7b8494">Loading…</div>' :
          '<div class="tiles" style="margin-top:14px">' +
            tile('Invoices stored', num(invoices.length), 'parsed and in Firestore') +
            tile('Line items', num(aggregated.length), 'unique supplier items') +
            tile('Total spend', gbp(totalSpend), 'across all uploaded invoices') +
            tile('Mapped to POS', num(mappedCount), 'of ' + aggregated.length + ' (' + pc(aggregated.length ? mappedCount / aggregated.length : 0) + ')') +
          '</div>'
        ) +
      '</div>'
    );

    if (invoices && invoices.length) {
      // Invoice list
      h += (
        '<div class="card"><h2>Uploaded invoices</h2>' +
          '<div style="overflow-x:auto;max-height:400px;overflow-y:auto"><table><thead><tr>' +
            '<th>Date</th><th>Supplier</th><th>Invoice #</th><th class="n">Grand total</th><th class="n">Line items</th><th>Uploaded</th>' +
          '</tr></thead><tbody>' +
          invoices.map(function (inv) {
            return '<tr>' +
              '<td>' + esc(inv.invoiceDate || '—') + '</td>' +
              '<td>' + esc(inv.supplier || '—') + '</td>' +
              '<td style="font-family:monospace;font-size:12px">' + esc(inv.invoiceId || '—') + '</td>' +
              '<td class="n">' + gbp(inv.grandTotal || 0) + '</td>' +
              '<td class="n">' + ((inv.lineItems || []).length) + '</td>' +
              '<td style="font-size:11.5px;color:#7b8494">' + esc((inv.uploadedAt || '').slice(0, 10)) + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>' +
        '</div>'
      );

      // v39.22 — ALL supplier items by spend (no more Top 30 slice). Keeps a search
      // box so Veronica can jump straight to what she needs on long invoice runs.
      var allItems = (aggregated || []).slice().sort(function (a, b) { return b.totalSpend - a.totalSpend; });
      var unmappedCount = allItems.filter(function (x) { return !mappings[x.supplierCode + '|' + x.code]; }).length;
      h += (
        '<div class="card"><h2>All supplier items · ' + allItems.length + ' total <span style="font-size:13px;color:#7b8494;font-weight:400">· ' + unmappedCount + ' unmapped</span></h2>' +
          '<p class="sub">Click <b>Map</b> to link a supplier item to a POS menu item. Once mapped, GP% can be calculated. Search filters as you type.</p>' +
          '<div style="display:flex;gap:10px;margin:10px 0;align-items:center;flex-wrap:wrap">' +
            '<input type="text" id="fb-items-search" placeholder="🔍 Search by name or code…" style="flex:1;min-width:220px;padding:8px 12px;border:1px solid #c8d9dd;border-radius:6px;font-size:13.5px">' +
            '<label style="font-size:12.5px;color:#52647a;display:flex;align-items:center;gap:6px"><input type="checkbox" id="fb-items-unmapped-only"> Unmapped only</label>' +
          '</div>' +
          '<div style="overflow-x:auto;max-height:720px;overflow-y:auto"><table id="fb-items-table"><thead style="position:sticky;top:0;background:#eef3f8;z-index:1"><tr>' +
            '<th>Supplier</th><th>Code</th><th>Name</th><th class="n">Qty total</th><th class="n">£ spent</th><th class="n">Prices seen</th><th>Status</th><th></th>' +
          '</tr></thead><tbody>' +
          allItems.map(function (x) {
            var mapKey = x.supplierCode + '|' + x.code;
            var mapped = mappings[mapKey];
            var searchKey = ((x.name || '') + ' ' + (x.code || '') + ' ' + (x.supplier || '')).toLowerCase();
            return '<tr data-fb-search="' + esc(searchKey) + '" data-fb-mapped="' + (mapped ? '1' : '0') + '">' +
              '<td style="font-size:11.5px">' + esc((x.supplier || '').replace(' Foodservice', '')) + '</td>' +
              '<td style="font-family:monospace;font-size:11.5px">' + esc(x.code) + '</td>' +
              '<td>' + esc(x.name) + '</td>' +
              '<td class="n">' + x.totalQty.toFixed(x.totalQty < 10 ? 2 : 0) + '</td>' +
              '<td class="n">' + gbp(x.totalSpend) + '</td>' +
              '<td class="n" style="font-size:11.5px;color:#7b8494">' + (x.pricesSeen || []).map(function (p) { return '£' + p.toFixed(2); }).join(', ') + '</td>' +
              '<td>' + (mapped ? '<span style="color:#1a7f4b;font-weight:600">✓ ' + esc(mapped.posItemName || mapped.posItemCode || '') + '</span>' : '<span style="color:#7b8494">unmapped</span>') + '</td>' +
              '<td><button class="btn" data-fb-map="' + esc(mapKey) + '" data-fb-map-name="' + esc(x.name) + '" data-fb-map-sc="' + esc(x.supplierCode) + '" data-fb-map-ic="' + esc(x.code) + '">' + (mapped ? 'Edit' : 'Map') + '</button></td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>' +
        '</div>'
      );
    }

    el.innerHTML = h;

    // Wire upload zone
    var zone = document.getElementById('fb-upload-zone');
    var input = document.getElementById('fb-upload-input');
    var prog = document.getElementById('fb-upload-progress');
    if (zone && input) {
      zone.onclick = function () { input.click(); };
      zone.ondragover = function (e) { e.preventDefault(); zone.style.background = '#f6f4ee'; };
      zone.ondragleave = function () { zone.style.background = '#fdf8ee'; };
      zone.ondrop = function (e) {
        e.preventDefault(); zone.style.background = '#fdf8ee';
        handleUpload(e.dataTransfer.files);
      };
      input.onchange = function () { handleUpload(input.files); };
    }

    // v39.21 — POS menu-items CSV download button
    var posCsvBtn = document.getElementById('fb-pos-csv');
    if (posCsvBtn) {
      posCsvBtn.onclick = function () {
        var tok = null;
        try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
        if (!tok) { alert('Sign in required to download the POS menu items CSV.'); return; }
        posCsvBtn.disabled = true; var origText = posCsvBtn.textContent; posCsvBtn.textContent = 'Downloading…';
        fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbMenuItemsExport?format=csv', {
          headers: { 'Authorization': 'Bearer ' + tok }
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.blob();
        }).then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          var today = new Date().toISOString().slice(0, 10);
          a.download = 'brandon-pos-menu-items-' + today + '.csv';
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
          posCsvBtn.textContent = '✓ Downloaded';
          setTimeout(function () { posCsvBtn.textContent = origText; posCsvBtn.disabled = false; }, 2000);
        }).catch(function (err) {
          alert('Could not download: ' + err.message);
          posCsvBtn.textContent = origText; posCsvBtn.disabled = false;
        });
      };
    }

    // v39.22 — Search + "Unmapped only" filter for the ALL supplier items table.
    var searchBox = document.getElementById('fb-items-search');
    var unmappedChk = document.getElementById('fb-items-unmapped-only');
    if (searchBox || unmappedChk) {
      function applyItemFilter() {
        var q = (searchBox ? searchBox.value : '').trim().toLowerCase();
        var unmappedOnly = unmappedChk ? unmappedChk.checked : false;
        var rows = document.querySelectorAll('#fb-items-table tbody tr');
        rows.forEach(function (r) {
          var sk = r.getAttribute('data-fb-search') || '';
          var isMapped = r.getAttribute('data-fb-mapped') === '1';
          var textMatch = !q || sk.indexOf(q) !== -1;
          var mapMatch = !unmappedOnly || !isMapped;
          r.style.display = (textMatch && mapMatch) ? '' : 'none';
        });
      }
      if (searchBox) searchBox.oninput = applyItemFilter;
      if (unmappedChk) unmappedChk.onchange = applyItemFilter;
    }

    function handleUpload(files) {
      if (!files || !files.length) return;
      var filesArr = Array.prototype.slice.call(files);
      prog.textContent = 'Uploading & parsing ' + filesArr.length + ' file(s)…';
      uploadFbInvoices(filesArr).then(function (res) {
        if (res && res.ok) {
          var ok = res.results.filter(function (r) { return r.ok; }).length;
          var failed = res.results.filter(function (r) { return !r.ok; });
          prog.innerHTML = '<span style="color:#1a7f4b">✓ ' + ok + ' parsed</span>' + (failed.length ? '<br><span style="color:#c0392b">' + failed.length + ' failed: ' + esc(failed.map(function (r) { return r.filename + ' – ' + r.error; }).join('; ')) + '</span>' : '');
          FB_COSTS_CACHE = null;
          setTimeout(function () { fetchFbCosts(function () { renderFb(); }); }, 400);
        } else {
          prog.innerHTML = '<span style="color:#c0392b">Upload failed: ' + esc((res && res.error) || 'unknown') + '</span>';
        }
      }).catch(function (e) {
        prog.innerHTML = '<span style="color:#c0392b">Upload failed: ' + esc(String(e)) + '</span>';
      });
    }

    // Mapping modal
    document.querySelectorAll('[data-fb-map]').forEach(function (btn) {
      btn.onclick = function () {
        var supName = btn.getAttribute('data-fb-map-name');
        var sc = btn.getAttribute('data-fb-map-sc');
        var ic = btn.getAttribute('data-fb-map-ic');
        openMappingModal({ supplierItemName: supName, supplierCode: sc, supplierItemCode: ic });
      };
    });

    // Trigger initial load
    if (invoices === null) fetchFbCosts(function () { renderFb(); });
  }

  // Simple mapping modal — AI suggests, user picks or edits
  /* v39.21 — Map modal rebuilt as a searchable multi-select of every POS menu item.
     Loads all items we've ever sold (from /fbMenuItemsExport?format=json), lets the
     user tick one or several, and saves them all under the supplier item as a
     posItems array. ARIA auto-suggestions still appear at the top as quick picks. */
  var POS_ITEMS_CACHE = null;
  function fetchPosItems(cb) {
    if (POS_ITEMS_CACHE) { cb(POS_ITEMS_CACHE); return; }
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) { cb({ error: 'Sign in required' }); return; }
    fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbMenuItemsExport?format=json', {
      headers: { 'Authorization': 'Bearer ' + tok }
    }).then(function (r) { return r.json(); })
      .then(function (j) { POS_ITEMS_CACHE = j; cb(j); })
      .catch(function (e) { cb({ error: String(e) }); });
  }

  function openMappingModal(ctx) {
    var modal = document.getElementById('fb-map-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fb-map-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,15,20,.55);z-index:9999;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(modal);
    }
    // Picked POS items keyed by code → { code, name, revenue, qty, meal, kind }
    var picked = {};

    function renderPicked() {
      var slot = modal.querySelector('#fb-picked');
      if (!slot) return;
      var keys = Object.keys(picked);
      if (!keys.length) {
        slot.innerHTML = '<div style="color:#7b8494;font-size:12.5px;font-style:italic">No POS items selected yet — tick one or more from the list below.</div>';
        return;
      }
      slot.innerHTML = '<div style="font-size:11px;font-weight:700;letter-spacing:.3px;color:#1a3b60;text-transform:uppercase;margin-bottom:6px">Selected (' + keys.length + ')</div>' +
        keys.map(function (k) {
          var p = picked[k];
          return '<span style="display:inline-block;padding:4px 10px;background:#1F7A8C;color:#fff;border-radius:14px;font-size:12px;margin:2px 4px 2px 0;font-weight:500">' +
            esc(p.name) +
            ' <span style="opacity:.75;font-family:monospace;font-size:10.5px">' + esc(p.code) + '</span>' +
            ' <button data-fb-unpick="' + esc(k) + '" style="background:none;border:0;color:#fff;cursor:pointer;margin-left:4px;font-size:14px;padding:0;line-height:1">×</button>' +
          '</span>';
        }).join('');
      slot.querySelectorAll('[data-fb-unpick]').forEach(function (btn) {
        btn.onclick = function () {
          delete picked[btn.getAttribute('data-fb-unpick')];
          renderPicked();
          renderList(modal.querySelector('#fb-search').value);
        };
      });
    }

    function renderList(q) {
      var list = modal.querySelector('#fb-items');
      if (!list) return;
      var items = (POS_ITEMS_CACHE && POS_ITEMS_CACHE.items) || [];
      q = (q || '').trim().toLowerCase();
      var filtered = items.filter(function (it) {
        if (!q) return true;
        return (it.name || '').toLowerCase().indexOf(q) !== -1 || (it.code || '').toLowerCase().indexOf(q) !== -1;
      }).slice(0, 200);
      if (!filtered.length) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:#7b8494;font-size:13px">No POS items match "' + esc(q) + '"</div>';
        return;
      }
      list.innerHTML = filtered.map(function (it) {
        var isPicked = !!picked[it.code + '|' + it.name];
        var pillColor = it.kind === 'Beverage' ? '#5B3E82' : '#1F7A8C';
        var mealColor = { Breakfast: '#C7A87A', Lunch: '#1a7f4b', Dinner: '#8a1e15' }[it.meal] || '#7b8494';
        return '<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #eef1f4;cursor:pointer;background:' + (isPicked ? '#eef7f9' : '#fff') + '">' +
          '<input type="checkbox" data-fb-pick="' + esc(it.code + '|' + it.name) + '"' + (isPicked ? ' checked' : '') + ' style="width:16px;height:16px;cursor:pointer;flex-shrink:0">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13px;font-weight:600;color:#1a2b3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(it.name) + '</div>' +
            '<div style="display:flex;gap:6px;align-items:center;margin-top:2px">' +
              '<span style="font-family:monospace;font-size:10.5px;color:#7b8494">' + esc(it.code) + '</span>' +
              (it.meal && it.meal !== '—' ? '<span style="font-size:10px;padding:1px 6px;background:' + mealColor + ';color:#fff;border-radius:8px;font-weight:600">' + it.meal + '</span>' : '') +
              (it.kind ? '<span style="font-size:10px;padding:1px 6px;background:' + pillColor + ';color:#fff;border-radius:8px;font-weight:600">' + it.kind + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0;font-size:11px;color:#52647a">' +
            '<div><b>' + (it.qtySold || 0) + '</b> sold</div>' +
            '<div style="font-size:10.5px">£' + (it.revenueNet || 0).toFixed(0) + '</div>' +
          '</div>' +
        '</label>';
      }).join('');
      list.querySelectorAll('[data-fb-pick]').forEach(function (cb) {
        cb.onchange = function () {
          var key = cb.getAttribute('data-fb-pick');
          if (cb.checked) {
            var it = (POS_ITEMS_CACHE.items || []).find(function (x) { return (x.code + '|' + x.name) === key; });
            if (it) picked[key] = { code: it.code, name: it.name, revenue: it.revenueNet, qty: it.qtySold };
          } else {
            delete picked[key];
          }
          renderPicked();
        };
      });
    }

    modal.innerHTML = (
      '<div style="background:#fff;border-radius:12px;max-width:820px;width:94%;max-height:90vh;display:flex;flex-direction:column;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-shrink:0">' +
          '<div><h3 style="margin:0">Map supplier item to POS menu items</h3>' +
            '<p class="sub" style="margin:4px 0 0">Supplier item: <b>' + esc(ctx.supplierItemName) + '</b> · tick every POS menu item this ingredient goes into</p>' +
          '</div>' +
          '<button class="btn" data-close-modal style="font-size:22px;padding:0 10px;line-height:1">×</button>' +
        '</div>' +
        // Picked chips
        '<div id="fb-picked" style="padding:10px 12px;background:#f6f8fb;border-radius:8px;min-height:40px;margin-bottom:10px;flex-shrink:0"></div>' +
        // Search + sort
        '<div style="display:flex;gap:8px;margin-bottom:8px;flex-shrink:0">' +
          '<input type="text" id="fb-search" placeholder="🔍 Search POS items by name or code (e.g. steak, RES1_DIN, hash)…" style="flex:1;padding:9px 12px;border:1px solid #c8d9dd;border-radius:6px;font-size:13.5px">' +
          '<label style="font-size:12px;color:#52647a;align-self:center">Portions/unit: <input type="number" id="fb-map-portions" step="0.1" min="0" placeholder="e.g. 4" style="width:70px;padding:7px;border:1px solid #c8d9dd;border-radius:6px;font-size:13px;margin-left:4px"></label>' +
        '</div>' +
        // The list
        '<div id="fb-items" style="flex:1;overflow-y:auto;border:1px solid #e3e7ee;border-radius:8px;min-height:200px;max-height:400px">' +
          '<div style="padding:20px;text-align:center;color:#7b8494;font-size:13px">Loading POS items…</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:14px;flex-shrink:0;align-items:center">' +
          '<div id="fb-aria-sug" style="flex:1;font-size:12px;color:#7b8494"></div>' +
          '<button class="btn" data-close-modal style="padding:9px 18px">Cancel</button>' +
          '<button class="btn" data-fb-map-save style="background:#1a2b3a;color:#fff;border:0;padding:9px 22px;font-weight:600">Save mapping</button>' +
        '</div>' +
      '</div>'
    );

    // Close handlers
    modal.querySelectorAll('[data-close-modal]').forEach(function (b) { b.onclick = function () { modal.remove(); }; });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });

    // Search handler
    modal.querySelector('#fb-search').oninput = function (e) { renderList(e.target.value); };

    // Save handler
    modal.querySelector('[data-fb-map-save]').onclick = function () {
      var keys = Object.keys(picked);
      if (!keys.length) { alert('Please tick at least one POS menu item first.'); return; }
      var portions = +document.getElementById('fb-map-portions').value;
      var posItems = keys.map(function (k) { return { code: picked[k].code, name: picked[k].name, yield: portions || null }; });
      setFbMapping({
        supplierCode: ctx.supplierCode,
        supplierItemCode: ctx.supplierItemCode,
        supplierItemName: ctx.supplierItemName,
        posItems: posItems,
        portionYield: portions || null
      }).then(function (res) {
        if (res && res.ok) {
          modal.remove();
          FB_COSTS_CACHE = null;
          fetchFbCosts(function () { renderFb(); });
        } else {
          alert('Save failed: ' + (res && res.error || 'unknown'));
        }
      });
    };

    // Load POS items
    renderPicked();
    fetchPosItems(function (res) {
      if (res.error) {
        var list = modal.querySelector('#fb-items');
        if (list) list.innerHTML = '<div style="padding:20px;text-align:center;color:#c0362b;font-size:13px">Could not load POS items: ' + esc(res.error) + '</div>';
        return;
      }
      renderList('');
    });

    // ARIA suggestions — auto-tick the top one
    suggestMapping(ctx.supplierItemName).then(function (res) {
      var sugs = (res && res.suggestions) || [];
      var slot = modal.querySelector('#fb-aria-sug');
      if (!slot) return;
      if (!sugs.length) { slot.textContent = ''; return; }
      slot.innerHTML = '🧠 ARIA suggests: ' + sugs.slice(0, 2).map(function (s) {
        var pct = Math.round((s.confidence || 0) * 100);
        return '<button class="btn" data-aria-use="' + esc(s.posItemCode || '') + '|' + esc(s.posItemName || '') + '" style="background:#eef7f9;border:1px solid #b9d4da;color:#145866;padding:3px 10px;border-radius:12px;font-size:11.5px;margin-left:4px;cursor:pointer">' +
          esc(s.posItemName || '?') + ' <span style="opacity:.7">' + pct + '%</span></button>';
      }).join('');
      slot.querySelectorAll('[data-aria-use]').forEach(function (btn) {
        btn.onclick = function () {
          var parts = btn.getAttribute('data-aria-use').split('|');
          var code = parts[0], name = parts[1];
          picked[code + '|' + name] = { code: code, name: name, revenue: 0, qty: 0 };
          renderPicked();
          renderList(modal.querySelector('#fb-search').value);
        };
      });
    }).catch(function () {});

    // Early-return — the old suggestMapping-driven block below is no longer used in the rebuild.
    return;

    // ───────── legacy block kept for reference (never executed) ─────────
    // eslint-disable-next-line no-unreachable
    suggestMapping(ctx.supplierItemName).then(function (res) {
      var slot = modal.querySelector('#fb-map-suggestions');
      if (!slot) return;
      var sugs = (res && res.suggestions) || [];
      if (!sugs.length) {
        slot.innerHTML = '<div style="color:#7b8494;font-size:13px">No automatic suggestions' + (res.note ? ' · ' + esc(res.note) : '') + '. Enter the mapping manually below.</div>';
        return;
      }
      slot.innerHTML = '<div style="font-size:11px;font-weight:700;letter-spacing:.3px;color:#1a3b60;text-transform:uppercase;margin-bottom:8px">ARIA suggestions</div>' +
        sugs.map(function (s) {
          var pct = Math.round((s.confidence || 0) * 100);
          var color = pct >= 80 ? '#1a7f4b' : (pct >= 50 ? '#b26a00' : '#7b8494');
          return '<div class="fb-map-sug" style="padding:10px 12px;background:#fff;border:1px solid #e3e7ee;border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
            '<div><div style="font-weight:600;color:#1a2b3a">' + esc(s.posItemName || '?') + '</div>' +
              '<div style="font-size:11px;color:#7b8494;font-family:monospace">' + esc(s.posItemCode || '?') + '</div>' +
              (s.reasoning ? '<div style="font-size:11.5px;color:#52647a;margin-top:4px;font-style:italic">' + esc(s.reasoning) + '</div>' : '') +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0">' +
              '<div style="font-size:11px;color:' + color + ';font-weight:700;margin-bottom:6px">' + pct + '%</div>' +
              '<button class="btn" data-fb-sug-use style="background:#1F7A8C;color:#fff;border:0;padding:5px 14px" data-pos-code="' + esc(s.posItemCode || '') + '" data-pos-name="' + esc(s.posItemName || '') + '">Use</button>' +
            '</div></div>';
        }).join('');
      slot.querySelectorAll('[data-fb-sug-use]').forEach(function (b) {
        b.onclick = function () {
          document.getElementById('fb-map-manual-code').value = b.getAttribute('data-pos-code');
          document.getElementById('fb-map-manual-name').value = b.getAttribute('data-pos-name');
        };
      });
    }).catch(function (e) {
      var slot = modal.querySelector('#fb-map-suggestions');
      if (slot) slot.innerHTML = '<div style="color:#c0392b;font-size:13px">Suggestions unavailable: ' + esc(String(e)) + '. Enter manually below.</div>';
    });
  }

  /* v39.19 — Food Margins — joins uploaded invoices (purchases) with POS sales (gl_items)
     through the mapping table to show bought vs sold per item with GP%. */
  var FB_MARGIN_CACHE = null, FB_MARGIN_RANGE = null;
  function fetchFbMargin(from, to, cb) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) { cb({ error: 'Sign in required' }); return; }
    var qs = [];
    if (from) qs.push('from=' + encodeURIComponent(from));
    if (to) qs.push('to=' + encodeURIComponent(to));
    var url = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/fbMarginGet' + (qs.length ? ('?' + qs.join('&')) : '');
    fetch(url, { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) { FB_MARGIN_CACHE = j; FB_MARGIN_RANGE = { from: from, to: to }; cb(j); })
      .catch(function (e) { cb({ error: String(e) }); });
  }

  function renderFoodMargins(el, S, P) {
    var h = fbSeg(P);
    var today = new Date().toISOString().slice(0, 10);
    var monthStart = today.slice(0, 7) + '-01';
    var cache = FB_MARGIN_CACHE;
    var fromVal = (FB_MARGIN_RANGE && FB_MARGIN_RANGE.from) || monthStart;
    var toVal = (FB_MARGIN_RANGE && FB_MARGIN_RANGE.to) || today;

    h += (
      '<div class="card"><h2>Food margins · bought vs sold</h2>' +
        '<p class="sub">Supplier invoices joined with POS sales for the period. Each mapped item shows purchase cost, average cost per portion, revenue earned and gross-profit %. Unmapped items need a POS link in the Food Costs tab before they show here.</p>' +

        '<div style="display:flex;gap:10px;align-items:center;margin:14px 0;flex-wrap:wrap">' +
          '<label style="font-size:12px;color:#52647a">From <input type="date" id="fb-marg-from" value="' + esc(fromVal) + '" style="padding:6px 8px;border:1px solid #c8d9dd;border-radius:4px"></label>' +
          '<label style="font-size:12px;color:#52647a">To <input type="date" id="fb-marg-to" value="' + esc(toVal) + '" style="padding:6px 8px;border:1px solid #c8d9dd;border-radius:4px"></label>' +
          '<button class="btn" id="fb-marg-run" style="background:#1F7A8C;color:#fff;border:0;padding:7px 18px;border-radius:5px;font-weight:600;cursor:pointer">Run report</button>' +
          '<span style="font-size:11.5px;color:#7b8494">Default: 1st of this month → today</span>' +
        '</div>' +
      '</div>'
    );

    if (!cache) {
      h += '<div class="card"><p class="sub">Loading margin data…</p></div>';
    } else if (cache.error || !cache.ok) {
      h += '<div class="card"><p style="color:#c0392b">Could not load margin report: ' + esc(cache.error || 'unknown error') + '</p></div>';
    } else {
      var r = cache.report || {};
      var s = r.summary || {};
      var c = r.counts || {};
      var mapped = r.mapped || [];
      var unmapped = r.unmapped || [];

      h += (
        '<div class="card"><h2>Summary · ' + esc(r.from || '') + ' → ' + esc(r.to || '') + '</h2>' +
          '<div class="tiles">' +
            tile('Purchase cost', gbp(s.totalPurchaseCost || 0), c.invoices + ' invoices · ' + c.supplierItems + ' items') +
            tile('Mapped sales', gbp(s.totalMappedSoldRevenue || 0), c.mappedItems + ' mapped items') +
            tile('COGS (mapped)', gbp(s.totalMappedCogs || 0), 'Cost of what was sold') +
            tile('GP · mapped', gbp(s.totalMappedGP || 0), pc(s.mappedMarginPct || 0) + ' margin') +
          '</div>' +
          (c.mappedItems === 0 ? (
            '<div style="padding:14px;margin-top:10px;background:#fff8ef;border-left:3px solid #C7A87A;border-radius:4px;font-size:13px;color:#6b4f1f">' +
              'No items are mapped yet — the margin join needs supplier items linked to POS codes. Head to <b>Food Costs → Map</b> on the top items to start.' +
            '</div>'
          ) : '') +
        '</div>'
      );

      if (mapped.length) {
        h += (
          '<div class="card"><h2>Mapped items · purchases vs sales</h2>' +
            '<p class="sub">Each row: how much we bought (cost), how much we sold (revenue), and the gross profit on what sold. Yield column = portions per unit (e.g. 1 rump steak → 1 steakburger).</p>' +
            '<div style="overflow-x:auto"><table><thead><tr>' +
              '<th>Supplier item</th><th>POS item</th><th class="n">Bought</th><th class="n">Cost</th><th class="n">£/unit</th><th class="n">Yield</th><th class="n">£/portion</th><th class="n">Sold qty</th><th class="n">Revenue</th><th class="n">Avg sale £</th><th class="n">COGS</th><th class="n">GP</th><th class="n">Margin %</th>' +
            '</tr></thead><tbody>' +
            mapped.map(function (m) {
              var marginColor = m.marginPct >= 0.6 ? '#1a7f4b' : (m.marginPct >= 0.3 ? '#b26a00' : '#c0392b');
              return '<tr>' +
                '<td style="font-size:12px"><div>' + esc(m.supplierItem || m.supplierItemCode) + '</div><div style="font-size:10.5px;color:#7b8494">' + esc(m.supplier || '') + '</div></td>' +
                '<td style="font-size:12px"><div>' + esc(m.posItemName) + '</div><div style="font-size:10.5px;color:#7b8494;font-family:monospace">' + esc(m.posItemCode) + '</div></td>' +
                '<td class="n">' + num(m.boughtQty) + '<span style="font-size:10px;color:#7b8494"> ' + esc(m.unit || '') + '</span></td>' +
                '<td class="n">' + gbp(m.boughtCost) + '</td>' +
                '<td class="n" style="font-size:11.5px">' + gbp(m.avgUnitCost) + '</td>' +
                '<td class="n">' + num(m.portionYield) + '</td>' +
                '<td class="n" style="font-size:11.5px">£' + (m.costPerPortion || 0).toFixed(2) + '</td>' +
                '<td class="n">' + num(m.soldQty) + '</td>' +
                '<td class="n">' + gbp(m.soldRevenue) + '</td>' +
                '<td class="n" style="font-size:11.5px">£' + (m.avgSalePrice || 0).toFixed(2) + '</td>' +
                '<td class="n">' + gbp(m.totalCogs) + '</td>' +
                '<td class="n" style="font-weight:600">' + gbp(m.gp) + '</td>' +
                '<td class="n" style="font-weight:700;color:' + marginColor + '">' + pc(m.marginPct) + '</td>' +
              '</tr>';
            }).join('') +
            '</tbody></table></div>' +
          '</div>'
        );
      }

      if (unmapped.length) {
        h += (
          '<div class="card"><h2>Unmapped items · top ' + unmapped.length + '</h2>' +
            '<p class="sub">These are supplier items we have invoices for but no POS link yet. Map them in the Food Costs tab (ARIA suggests the match) and they will appear in the margin table above.</p>' +
            '<div style="overflow-x:auto;max-height:420px;overflow-y:auto"><table><thead><tr>' +
              '<th>Supplier</th><th>Code</th><th>Name</th><th class="n">Bought qty</th><th class="n">Cost</th><th class="n">£/unit</th>' +
            '</tr></thead><tbody>' +
            unmapped.map(function (u) {
              return '<tr>' +
                '<td style="font-size:11.5px">' + esc((u.supplier || '').replace(' Foodservice', '')) + '</td>' +
                '<td style="font-family:monospace;font-size:11.5px">' + esc(u.supplierItemCode) + '</td>' +
                '<td style="font-size:12px">' + esc(u.supplierItemName || '') + '</td>' +
                '<td class="n">' + num(u.qty) + '<span style="font-size:10px;color:#7b8494"> ' + esc(u.unit || '') + '</span></td>' +
                '<td class="n">' + gbp(u.cost) + '</td>' +
                '<td class="n" style="font-size:11.5px">' + gbp(u.avgUnitCost) + '</td>' +
              '</tr>';
            }).join('') +
            '</tbody></table></div>' +
          '</div>'
        );
      }
    }

    el.innerHTML = h;

    // Wire the date range + run button
    var runBtn = document.getElementById('fb-marg-run');
    if (runBtn) {
      runBtn.onclick = function () {
        var f = document.getElementById('fb-marg-from').value;
        var t = document.getElementById('fb-marg-to').value;
        FB_MARGIN_CACHE = null;
        renderFoodMargins(el, S, P);  // show loading state
        fetchFbMargin(f, t, function () { renderFoodMargins(el, S, P); });
      };
    }
    // Initial fetch
    if (!cache) fetchFbMargin(fromVal, toVal, function () { renderFoodMargins(el, S, P); });
  }

  /* ---------- v39.24: Till Verification ----------
     Veronica's daily workflow: she gets End-of-Day Z-reports printed from
     Terminal 1 (Bar) and Terminal 2 (Restaurant), cross-checks the figures,
     signs off each section, and flags discrepancies. This panel mirrors the
     Z-report structure so she can tick each section as verified.
     Sign-off state persists in localStorage per date+terminal; Z-report PDF
     scans upload for reference. */
  var TILLV_KEY = 'hosbusiness_tillv_v1';
  function tillvState() {
    try { return JSON.parse(localStorage.getItem(TILLV_KEY) || '{}'); } catch (e) { return {}; }
  }
  function tillvSave(state) {
    try { localStorage.setItem(TILLV_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function tillvKey(date, terminal) { return date + '::' + terminal; }
  var tillvDate = null;
  function yesterdayISO() {
    var d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  function tillvForDate(S, dateIso) {
    /* Build a per-terminal Z-report-style breakdown from Rezlynx PLU data.
       TP.terms is keyed by terminal+meal (e.g. "Terminal 1 Dinner"). We
       aggregate by terminal across meal periods and build Sales Groups from
       the item list. The displayed structure mirrors the printed Z-report so
       Veronica can tick each section against the paper in her hand. */
    var TP = S.x && S.x.plu ? S.x.plu : null;
    var P = S.x && S.x.postings;

    function blank(id, name) {
      return {
        id: id, name: name,
        meals: [],                    // [{meal, items, net, gross, adj, qty, from, to}]
        salesGroups: {},              // { 'Draught': { qty, net }, ... }
        majorGroups: {},              // broader buckets
        topItems: [],                 // [[name, qty, net, adj]]
        discounts: [],                // [{label, count, value}]
        covers: 0,
        totalNet: 0, totalGross: 0, totalAdj: 0, totalQty: 0,
        hasData: false
      };
    }
    var bar = blank('T1', 'Terminal 1 — Bar');
    var rest = blank('T2', 'Terminal 2 — Restaurant');

    /* Heuristic item→group classifier using the dish name. Rough but close
       to how Access EPoS groups them on the Z-report. */
    function classifyGroup(name) {
      var n = String(name || '').toLowerCase();
      if (/draught|pint|half pint/.test(n)) return 'Draught';
      if (/bottle.*beer|bottled|corona|peroni|bud|heineken/.test(n)) return 'Bottled Beer';
      if (/cider|strongbow|rekorderlig/.test(n)) return 'Cider';
      if (/vodka|smirnoff|absolut|grey goose/.test(n)) return 'Vodka';
      if (/whisky|whiskey|jack daniel|jameson|bourbon/.test(n)) return 'Whisky';
      if (/gin|hendrick|bombay|tanqueray/.test(n)) return 'Gin';
      if (/liqueur|baileys|amaretto|cointreau|jagermeister/.test(n)) return 'Liqueurs';
      if (/champagne|prosecco|cava/.test(n)) return 'Wine + Champagne';
      if (/white wine|sauvignon|chardonnay|pinot grigio/.test(n)) return 'White Wine';
      if (/red wine|cabernet|merlot|shiraz|malbec|pinot noir/.test(n)) return 'Red Wine';
      if (/wine|rose/.test(n)) return 'Wine + Champagne';
      if (/spirit|brandy|cognac|rum|tequila/.test(n)) return 'Spirits';
      if (/soft drink|coke|pepsi|lemonade|j2o|fruit juice/.test(n)) return 'Soft Drinks';
      if (/post mix|fanta|sprite/.test(n)) return 'Post Mix';
      if (/coffee|cappuccino|latte|espresso|americano|tea/.test(n)) return 'Coffees';
      if (/water|still|sparkling/.test(n)) return 'Soft Drinks';
      if (/starter|soup|appetiser/.test(n)) return 'Restaurant Starters';
      if (/dessert|cheesecake|brownie|ice cream|sorbet|pudding|tart/.test(n)) return 'Restaurant Desserts';
      if (/side|chips|fries|vegetables|salad(?! bowl)/.test(n)) return 'Restaurant Sides';
      if (/breakfast|bacon|sausage|eggs|toast|cereal/.test(n)) return 'Breakfast';
      if (/burger|steak|chicken|fish|pasta|risotto|pie|curry|lasagne|salmon|lamb|pork/.test(n)) return 'Restaurant Mains';
      return 'Other';
    }

    /* Scope to the selected date. A PLU term can span multiple days (e.g. a
       week's export). We include it only if the date falls inside its range,
       and divide its figures by the number of days it covers so we show a
       per-day estimate rather than the aggregate across the loaded period.
       If NO term covers the selected date, fall back to the latest date that
       IS covered in the loaded data and flag the discrepancy. */
    function spanDays(from, to) {
      if (!from || !to) return 1;
      var d = Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;
      return d > 0 ? d : 1;
    }
    function covers(dateIso, from, to) {
      if (!from || !to) return false;
      return dateIso >= from && dateIso <= to;
    }
    var effectiveDate = dateIso;
    var fellBack = false;
    if (TP && TP.terms) {
      var anyCovers = Object.keys(TP.terms).some(function (k) { return covers(dateIso, TP.terms[k].from, TP.terms[k].to); });
      if (!anyCovers) {
        /* Find the latest 'to' date across all terms. */
        var latest = null;
        Object.keys(TP.terms).forEach(function (k) { var t = TP.terms[k]; if (t.to && (!latest || t.to > latest)) latest = t.to; });
        if (latest) { effectiveDate = latest; fellBack = true; }
      }
    }
    var multiDay = false;
    if (TP && TP.terms) {
      Object.keys(TP.terms).forEach(function (k) {
        var t = TP.terms[k];
        if (!covers(effectiveDate, t.from, t.to)) return;
        var days = spanDays(t.from, t.to);
        if (days > 1) multiDay = true;
        var target = /bar/i.test(k) ? bar : /restaurant|terminal\s*2/i.test(k) ? rest : rest;
        target.hasData = true;
        target.meals.push({ label: k, meal: t.meal, net: (t.net || 0) / days, gross: (t.gross || 0) / days, adj: (t.adj || 0) / days, qty: (t.qty || 0) / days, from: t.from, to: t.to, spanDays: days });
        target.totalNet += (t.net || 0) / days;
        target.totalGross += (t.gross || 0) / days;
        target.totalAdj += (t.adj || 0) / days;
        target.totalQty += (t.qty || 0) / days;
        (t.items || []).forEach(function (it) {
          var name = it[0], qty = (it[1] || 0) / days, gross = (it[2] || 0) / days, adj = (it[3] || 0) / days, net = (it[4] || 0) / days;
          if (!net && !adj) return;
          var g = classifyGroup(name);
          var sg = target.salesGroups[g] = target.salesGroups[g] || { qty: 0, net: 0 };
          sg.qty += qty; sg.net += net;
        });
      });
    }
    bar.multiDaySource = multiDay;
    rest.multiDaySource = multiDay;

    /* Covers for the effective date from the postings report. */
    if (P && P.byDay && P.byDay[effectiveDate]) {
      var d = P.byDay[effectiveDate];
      rest.covers = d.cov || 0;
    }

    /* Discounts: we have total adj per terminal from the PLU data. Breaking
       it into Food 15% / Drink 20% / Open would need the Discounts report
       (not currently in our feed). For now show one aggregate line and label
       the paper breakdown as Verify from receipt. */
    [bar, rest].forEach(function (term) {
      if (term.totalAdj) {
        term.discounts.push({ label: 'Total adjustments (from Rezlynx)', value: term.totalAdj, note: 'Breakdown by discount code (Food 15% / Drink 20% / Open) on paper Z-report' });
      }
      /* Top items table (top 15 by net). */
      var all = {};
      term.meals.forEach(function () {});
      /* Rebuild top items from TP.terms. */
    });

    /* Re-pull top items from TP.terms per terminal, scoped to the effective
       date and divided by span days so the figures reflect ONE day. */
    if (TP && TP.terms) {
      [[bar, /bar/i], [rest, /restaurant|terminal\s*2/i]].forEach(function (pair) {
        var term = pair[0], re = pair[1];
        var agg = {};
        Object.keys(TP.terms).forEach(function (k) {
          var t = TP.terms[k];
          if (!covers(effectiveDate, t.from, t.to)) return;
          var isMatch = re.test(k) || (term === rest && !/bar/i.test(k));
          if (!isMatch) return;
          var days = spanDays(t.from, t.to);
          (t.items || []).forEach(function (it) {
            if (!it[4] && !it[3]) return;
            var a = agg[it[0]] = agg[it[0]] || { name: it[0], qty: 0, net: 0, adj: 0 };
            a.qty += (it[1] || 0) / days;
            a.net += (it[4] || 0) / days;
            a.adj += (it[3] || 0) / days;
          });
        });
        term.topItems = Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, b) { return b.net - a.net; }).slice(0, 20);
      });
    }

    return {
      dateIso: dateIso,
      effectiveDate: effectiveDate,
      fellBack: fellBack,
      terminals: { 'T1': bar, 'T2': rest },
      sourceLoaded: !!TP
    };
  }

  function renderTillVerifySection(terminal, dateIso, state, st) {
    var k = tillvKey(dateIso, terminal.id);
    var sect = (st[k] && st[k].sections) || {};
    var signed = st[k] && st[k].signedOff;
    var notes = (st[k] && st[k].notes) || '';

    var badge = signed ?
      '<span style="background:#1a6442;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">✓ Verified</span>' :
      '<span style="background:#f5a623;color:#1a2238;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">Pending</span>';

    /* Small reusable section wrapper with its own checkbox and inline notes field. */
    var sectNotes = (st[k] && st[k].sectionNotes) || {};
    function sectionBlock(sectId, title, bodyHtml) {
      var checked = sect[sectId] ? 'checked' : '';
      var mark = sect[sectId] ? '✓' : '';
      var cls = sect[sectId] ? 'background:#f3f8f5' : 'background:#fff';
      var noteVal = sectNotes[sectId] || '';
      return '<div style="border:1px solid #e3e8ee;border-radius:6px;padding:10px 12px;margin-top:10px;' + cls + '">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
          '<input type="checkbox" data-tillv-sect="' + sectId + '" data-tillv-k="' + k + '" ' + checked + ' style="width:18px;height:18px;cursor:pointer;flex:0 0 auto">' +
          '<h3 style="margin:0;font-size:13px;color:#1a2238;flex:1">' + esc(title) + ' <span style="color:#1a6442;font-weight:400">' + mark + '</span></h3>' +
        '</div>' +
        '<div style="padding-left:28px;font-size:12px;color:#2a3144">' + bodyHtml +
          '<div style="margin-top:8px"><input type="text" data-tillv-sectnote="' + sectId + '" data-tillv-k="' + k + '" value="' + esc(noteVal) + '" placeholder="Note for this section (optional)" style="width:100%;padding:5px 8px;border:1px solid #d0d7de;border-radius:4px;font-family:inherit;font-size:11.5px;background:#fff"></div>' +
        '</div>' +
      '</div>';
    }

    var h = '<div class="card" style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">' +
        '<div><h2 style="margin:0">' + esc(terminal.name) + '</h2>' +
          '<p class="sub" style="margin:4px 0 0">End-of-Day Z report · ' + dlabel(dateIso) + '</p></div>' +
        '<div>' + badge + '</div>' +
      '</div>';

    if (!terminal.hasData) {
      h += '<div style="padding:10px;background:#fff8e6;border:1px solid #e3cc87;border-radius:6px;color:#8a6d1e;font-size:12.5px;margin:8px 0">' +
        'No Rezlynx POS data loaded for ' + dlabel(dateIso) + ' on this terminal yet. Sign off manually from the printed Z-report, or wait for the overnight POS sync.' +
      '</div>';
    } else if (terminal.multiDaySource) {
      h += '<div style="padding:8px 10px;background:#fff8e6;border:1px solid #e3cc87;border-radius:6px;color:#8a6d1e;font-size:11.5px;margin:8px 0">' +
        '<b>Note:</b> the loaded Rezlynx POS export spans multiple days. Figures shown are the <b>per-day average</b> for ' + dlabel(dateIso) + '. For an exact single-day match, ask Glenn for a day-specific export.' +
      '</div>';
    }

    /* Header totals — Z-report "Totals" summary */
    h += sectionBlock('header',
      'Totals (Z-report header)',
      '<table style="width:100%;font-size:12px"><tbody>' +
        '<tr><td>Total net sales</td><td style="text-align:right"><b>' + gbp(terminal.totalNet, 2) + '</b></td></tr>' +
        '<tr><td>Total gross (menu price incl. VAT)</td><td style="text-align:right">' + gbp(terminal.totalGross, 2) + '</td></tr>' +
        '<tr><td>Total adjustments / discounts</td><td style="text-align:right;color:#c0362b">' + gbp(terminal.totalAdj, 2) + '</td></tr>' +
        '<tr><td>Total items rung</td><td style="text-align:right">' + num(terminal.totalQty) + '</td></tr>' +
        (terminal.covers ? '<tr><td>Covers</td><td style="text-align:right">' + num(terminal.covers) + '</td></tr>' : '') +
      '</tbody></table>'
    );

    /* Sales Groups breakdown — matches Z-report "Sales Groups" / "Major Groups" */
    var sgKeys = Object.keys(terminal.salesGroups).sort(function (a, b) { return terminal.salesGroups[b].net - terminal.salesGroups[a].net; });
    var sgBody = sgKeys.length ?
      '<table style="width:100%;font-size:12px"><thead><tr style="color:#7b8494"><th style="text-align:left;font-weight:600">Group</th><th style="text-align:right;font-weight:600">Qty</th><th style="text-align:right;font-weight:600">Net</th></tr></thead><tbody>' +
        sgKeys.map(function (g) {
          var sg = terminal.salesGroups[g];
          return '<tr><td>' + esc(g) + '</td><td style="text-align:right">' + num(sg.qty) + '</td><td style="text-align:right"><b>' + gbp(sg.net, 2) + '</b></td></tr>';
        }).join('') +
        '<tr style="border-top:1px solid #e3e8ee"><td><b>Total</b></td><td style="text-align:right"><b>' + num(terminal.totalQty) + '</b></td><td style="text-align:right"><b>' + gbp(terminal.totalNet, 2) + '</b></td></tr>' +
      '</tbody></table>' :
      '<p style="color:#7b8494;margin:4px 0">No item data loaded. Verify total against paper Z-report.</p>';
    h += sectionBlock('sales', 'Sales Groups (match "Sales Groups" / "Major Groups" on Z-report)', sgBody);

    /* Top items — drill-down for anomaly spotting */
    var topBody = terminal.topItems.length ?
      '<div style="max-height:200px;overflow-y:auto"><table style="width:100%;font-size:11.5px"><thead style="position:sticky;top:0;background:#f6f8fb"><tr style="color:#7b8494"><th style="text-align:left;font-weight:600">Item</th><th style="text-align:right;font-weight:600">Qty</th><th style="text-align:right;font-weight:600">Net</th><th style="text-align:right;font-weight:600">Disc.</th></tr></thead><tbody>' +
        terminal.topItems.map(function (it) {
          return '<tr><td>' + esc(it.name) + '</td><td style="text-align:right">' + num(it.qty) + '</td><td style="text-align:right">' + gbp(it.net, 2) + '</td><td style="text-align:right' + (it.adj ? ';color:#c0362b' : '') + '">' + (it.adj ? gbp(it.adj, 2) : '–') + '</td></tr>';
        }).join('') +
      '</tbody></table></div>' :
      '<p style="color:#7b8494;margin:4px 0">No item-level data yet.</p>';
    h += sectionBlock('items', 'Top items sold (' + terminal.topItems.length + ')', topBody);

    /* Adjustments & Discounts — matches Z-report "Adjustments + Discounts" */
    var discBody = terminal.discounts.length ?
      '<table style="width:100%;font-size:12px"><tbody>' +
        terminal.discounts.map(function (d) {
          return '<tr><td>' + esc(d.label) + '</td><td style="text-align:right;color:#c0362b"><b>' + gbp(d.value, 2) + '</b></td></tr>' +
                 (d.note ? '<tr><td colspan="2" style="color:#7b8494;font-size:11px;padding-bottom:4px">' + esc(d.note) + '</td></tr>' : '');
        }).join('') +
      '</tbody></table>' :
      '<p style="color:#7b8494;margin:4px 0">No discounts recorded for this terminal.</p>';
    h += sectionBlock('disc', 'Adjustments & Discounts (match "Adjustments + Discount" block)', discBody);

    /* Covers — if we have them */
    h += sectionBlock('covers', 'Covers (match "Functions → Covers" line)',
      terminal.covers ?
        '<p style="margin:4px 0"><b>' + num(terminal.covers) + '</b> covers inferred from POS postings.<br>Paper Z-report line "Covers" should match within ±1.</p>' :
        '<p style="color:#7b8494;margin:4px 0">Covers count not available for this terminal from POS — verify directly from paper Z-report "Functions → Covers" line.</p>'
    );

    /* Voids & Corrections — paper-only for now */
    h += sectionBlock('voids_corr',
      'Voids &amp; Corrections (paper only — not in Rezlynx feed)',
      '<p style="margin:4px 0;color:#52647a">Read these directly from the paper Z-report:<br>' +
        '• <b>Functions → Void Transaction</b> — flag any void without a stated reason<br>' +
        '• <b>Functions → Corrections</b> — minor order edits<br>' +
        '• <b>Functions → Corrections After Store</b> — potential shrinkage flag if high' +
      '</p>'
    );

    /* Takings — paper-only for now (payment method split) */
    h += sectionBlock('takings',
      'Takings by payment method (paper only — not in Rezlynx feed)',
      '<p style="margin:4px 0;color:#52647a">Read directly from paper Z-report "Takings" block. Typically: Cash / Visa / Mastercard / Post to Room / Zero Screen close. Cross-reference with the day\'s bank deposit.</p>'
    );

    /* Clerk function — paper-only for now */
    h += sectionBlock('clerks',
      'Per-clerk breakdown (paper only — not in Rezlynx feed)',
      '<p style="margin:4px 0;color:#52647a">Read directly from paper Z-report "Clerk Function" block. Watch for staff with unusually high voids, corrections after store, or discounts compared with the rest of the team.</p>'
    );

    /* Notes + sign-off */
    h += '<div style="margin-top:14px">' +
      '<label style="font-size:12px;color:#52647a;display:block;margin-bottom:4px">Notes / discrepancies flagged</label>' +
      '<textarea data-tillv-notes="' + k + '" placeholder="e.g. \'Glenn had to void to change master till at 22:39 — reviewed, legitimate\'" rows="2" style="width:100%;padding:8px;border:1px solid #c8d3dd;border-radius:6px;font-family:inherit;font-size:12.5px;resize:vertical">' + esc(notes) + '</textarea>' +
    '</div>' +

    '<div style="display:flex;gap:10px;margin-top:12px;align-items:center;flex-wrap:wrap">' +
      (signed ?
        '<button class="btn ghost" data-tillv-unsign="' + k + '">Unlock &amp; re-verify</button>' +
        '<span style="font-size:11.5px;color:#7b8494">Signed off ' + fmtAgo(st[k].signedOff) + ' by ' + esc((st[k].signedBy) || 'current user') + '</span>' :
        '<button class="btn" data-tillv-sign="' + k + '" style="background:#1a6442">✓ Sign off ' + esc(terminal.name) + '</button>' +
        '<span style="font-size:11.5px;color:#7b8494">' + Object.keys(sect).filter(function (x) { return sect[x]; }).length + ' of 8 sections ticked</span>'
      ) +
    '</div>' +

    '</div>';
    return h;
  }

  function fmtAgo(ts) {
    if (!ts) return '';
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  function renderTillVerify(el, S, P) {
    if (!tillvDate) tillvDate = yesterdayISO();
    var data = tillvForDate(S, tillvDate);
    var st = tillvState();

    /* Verification history — last 14 days signed off */
    var histRows = [];
    Object.keys(st).forEach(function (k) {
      if (st[k].signedOff) {
        var p = k.split('::');
        histRows.push({ date: p[0], terminal: p[1], ts: st[k].signedOff, notes: st[k].notes || '', by: st[k].signedBy || '' });
      }
    });
    histRows.sort(function (a, b) { return b.ts - a.ts; });

    var h = fbSeg(P);
    h += '<div class="card"><h2>Till Verification <span style="font-size:11px;color:#7b8494;margin-left:8px;font-weight:600;letter-spacing:.2px;text-transform:uppercase">Veronica\'s daily check</span></h2>' +
      '<p class="sub">Cross-check the printed End-of-Day Z-reports from Terminal 1 (Bar) and Terminal 2 (Restaurant). Tick each section as you verify it against the paper print-out, flag any discrepancies, and sign off when complete.</p>' +
      '<div style="display:flex;gap:14px;align-items:center;margin-top:8px">' +
        '<label style="font-size:12px;color:#52647a">Date <input type="date" id="tillv-date" value="' + tillvDate + '" max="' + new Date().toISOString().slice(0, 10) + '" style="padding:6px 8px;border:1px solid #c8d3dd;border-radius:5px;margin-left:4px;font-family:inherit"></label>' +
        '<button class="btn ghost" id="tillv-yesterday" style="font-size:11.5px">Yesterday</button>' +
        '<span style="font-size:11.5px;color:#7b8494;margin-left:auto">' + (data.sourceLoaded ? 'POS data loaded from Rezlynx Postings' : 'No Rezlynx Postings loaded — verify from paper Z-report') + '</span>' +
      '</div>' +
      (data.fellBack ?
        '<div style="padding:10px 12px;background:#fff8e6;border:1px solid #e3cc87;border-radius:6px;color:#8a6d1e;font-size:12.5px;margin-top:10px">' +
          '<b>No Rezlynx POS data for ' + dlabel(tillvDate) + '.</b> Showing the most recent date covered by the loaded Postings export: <b>' + dlabel(data.effectiveDate) + '</b>. ' +
          'Ask Glenn to upload a fresh Postings file to get the correct day\'s figures.' +
        '</div>' : '') +
    '</div>';

    /* Two terminal cards */
    h += '<div class="grid g2">' +
      renderTillVerifySection(data.terminals.T1, tillvDate, data, st) +
      renderTillVerifySection(data.terminals.T2, tillvDate, data, st) +
    '</div>';

    /* Help panel — what to check */
    h += '<div class="card" style="background:#f6f8fb"><h2 style="font-size:14px;margin:0 0 6px">What each Z-report section means</h2>' +
      '<ul style="margin:4px 0;padding-left:20px;font-size:12.5px;color:#52647a;line-height:1.7">' +
        '<li><b>Sales Groups / Major Groups</b> — the breakdown of what was rung in. Total should match the Rezlynx Postings figure for that terminal that night.</li>' +
        '<li><b>Adjustments &amp; Discounts</b> — Food Discount 15%, Drink Discount 20%, Open Discount. Compare the count AND total to what Rezlynx picked up.</li>' +
        '<li><b>Functions → Void Transaction</b> — voided tabs/orders. Each should have a legitimate reason (wrong table, complaint, test). Flag any voids you cannot account for.</li>' +
        '<li><b>Functions → Corrections / Corrections After Store</b> — items removed. "After Store" means post-save — potential shrinkage flag if high.</li>' +
        '<li><b>Takings</b> — split by payment method (cash, card, post-to-room, zero screen). Cross-reference with the day\'s banking.</li>' +
        '<li><b>Clerk Function</b> — per-clerk breakdown. Spot staff with unusually high voids or discounts.</li>' +
      '</ul></div>';

    /* Recent verification history */
    if (histRows.length) {
      h += '<div class="card"><h2>Recent verifications</h2>' +
        '<table><thead><tr><th>Date</th><th>Terminal</th><th>Signed off</th><th>By</th><th>Notes</th></tr></thead><tbody>' +
        histRows.slice(0, 20).map(function (r) {
          var trm = r.terminal === 'T1' ? 'Bar (T1)' : r.terminal === 'T2' ? 'Restaurant (T2)' : r.terminal;
          return '<tr><td>' + esc(dlabel(r.date)) + '</td><td>' + esc(trm) + '</td><td style="color:#1a6442;font-weight:600">✓ ' + fmtAgo(r.ts) + '</td><td>' + esc(r.by) + '</td><td style="font-size:11.5px;color:#52647a">' + esc(r.notes || '—') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    }

    el.innerHTML = h;

    /* Wire up event handlers */
    var di = document.getElementById('tillv-date');
    if (di) di.onchange = function () { tillvDate = di.value; renderFb(); };
    var yb = document.getElementById('tillv-yesterday');
    if (yb) yb.onclick = function () { tillvDate = yesterdayISO(); renderFb(); };

    /* Checkbox section toggles */
    el.querySelectorAll('[data-tillv-sect]').forEach(function (cb) {
      cb.onchange = function () {
        var k = cb.getAttribute('data-tillv-k');
        var s = cb.getAttribute('data-tillv-sect');
        var state = tillvState();
        if (!state[k]) state[k] = { sections: {} };
        if (!state[k].sections) state[k].sections = {};
        state[k].sections[s] = cb.checked;
        tillvSave(state);
        /* Flip the row's green highlight without full re-render so notes typing isn't interrupted */
        var box = cb.closest('div[style*="border-radius:6px"]');
        if (box) box.style.background = cb.checked ? '#f3f8f5' : '#fff';
        var mark = box && box.querySelector('h3 span'); if (mark) mark.textContent = cb.checked ? '✓' : '';
      };
    });

    /* Per-section notes — save on blur */
    el.querySelectorAll('[data-tillv-sectnote]').forEach(function (inp) {
      inp.onblur = function () {
        var k = inp.getAttribute('data-tillv-k');
        var s = inp.getAttribute('data-tillv-sectnote');
        var state = tillvState();
        if (!state[k]) state[k] = { sections: {} };
        if (!state[k].sectionNotes) state[k].sectionNotes = {};
        state[k].sectionNotes[s] = inp.value;
        tillvSave(state);
      };
    });

    /* Notes textarea — save on blur */
    el.querySelectorAll('[data-tillv-notes]').forEach(function (ta) {
      ta.onblur = function () {
        var k = ta.getAttribute('data-tillv-notes');
        var state = tillvState();
        if (!state[k]) state[k] = { sections: {} };
        state[k].notes = ta.value;
        tillvSave(state);
      };
    });

    /* Sign off button */
    el.querySelectorAll('[data-tillv-sign]').forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute('data-tillv-sign');
        var state = tillvState();
        if (!state[k]) state[k] = { sections: {} };
        var sect = state[k].sections || {};
        var checkedCount = Object.keys(sect).filter(function (x) { return sect[x]; }).length;
        if (checkedCount < 8) {
          if (!confirm('Only ' + checkedCount + ' of 8 sections are ticked. Sign off anyway?')) return;
        }
        state[k].signedOff = Date.now();
        var who = (window.Profit && window.Profit.user) ? window.Profit.user() : 'Veronica';
        state[k].signedBy = who || 'Veronica';
        var notesEl = el.querySelector('[data-tillv-notes="' + k + '"]');
        if (notesEl) state[k].notes = notesEl.value;
        tillvSave(state);
        renderFb();
      };
    });

    /* Unlock button */
    el.querySelectorAll('[data-tillv-unsign]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('Unlock this sign-off and re-verify?')) return;
        var k = btn.getAttribute('data-tillv-unsign');
        var state = tillvState();
        if (state[k]) { delete state[k].signedOff; delete state[k].signedBy; }
        tillvSave(state);
        renderFb();
      };
    });

    /* (Z-report scan upload intentionally removed — Veronica works from the
       printed paper receipt and ticks off against the on-screen POS breakdown.) */
  }

  function renderFb() {
    var el = $('pf-fb'), T = window.Trading, S = T ? T.S() : {}; fbCharts.forEach(function (c) { c.destroy(); }); fbCharts = [];
    if (!S.af) { el.innerHTML = '<div class="card"><h2>No Guestline data loaded</h2></div>'; return; }
    var P = S.x && S.x.postings; if (!P && (fbView === 'brk' || fbView === 'menu')) fbView = 'over';
    if (fbView === 'term' && !(S.x && S.x.plu)) fbView = 'over';
    if (fbView === 'cov') return renderCov(el, S, P);
    if (fbView === 'costs') return renderFoodCosts(el, S, P);
    if (fbView === 'margins') return renderFoodMargins(el, S, P);
    if (fbView === 'tillv') return renderTillVerify(el, S, P);
    if (fbView === 'fbdisc') return renderFbDisc(el, S, P);
    if (fbView === 'disc') return renderDisc(el, S, P);
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
    // v39.13: covers moved to its own dedicated 'cov' sub-tab (was stacked on Overview in v39.9/10)
    el.innerHTML = h;
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
  /* v39.23 — Conference & Banqueting tab. Fetches /hosfuncFunctionsGet and shows
     all forward events with filters + per-type aggregates. */
  var CNB_CACHE = null;
  function fetchCnb(cb) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) { cb({ error: 'Sign in required' }); return; }
    fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/hosfuncFunctionsGet', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) { CNB_CACHE = j; cb(j); })
      .catch(function (e) { cb({ error: String(e) }); });
  }
  var cnbStatus = 'all', cnbType = 'all';
  function renderCnb() {
    var el = $('pf-cnb'); if (!el) return;
    var cache = CNB_CACHE;
    var h = '<div class="card"><h2>Conference &amp; Events <span style="display:inline-block;width:8px;height:8px;background:' + (cache && cache.ok ? '#1a8f63' : '#b26a00') + ';border-radius:50%;margin-left:8px;vertical-align:middle;position:relative;top:-2px"></span><span style="font-size:11px;color:' + (cache && cache.ok ? '#1a8f63' : '#b26a00') + ';margin-left:6px;font-weight:600;letter-spacing:.2px;text-transform:uppercase">Guestline C&amp;B</span></h2>' +
      '<p class="sub">Every function, wedding, meeting and private event on the books from Guestline Conference &amp; Banqueting.</p>';

    if (!cache) {
      h += '<div style="padding:16px;text-align:center;color:#7b8494">Loading…</div></div>';
      el.innerHTML = h;
      fetchCnb(function () { renderCnb(); });
      return;
    }

    if (cache.error || !cache.ok) {
      h += '<div style="padding:16px;background:#fdf6f5;border:1px solid #e3b9b9;border-radius:8px;color:#8a1e15;font-size:13px">' +
        '<b>Feed not yet live.</b> Run the C&amp;B SOAP probe to find the correct Rezlynx method:<br>' +
        '<code style="display:block;margin-top:8px;padding:8px;background:#fff;border-radius:4px;font-size:11.5px">curl "https://europe-west2-brandonhall-7bdef.cloudfunctions.net/hosfuncProbe" -H "x-gl-key: YOUR_ADMIN_KEY"</code>' +
        'When it returns a method name, run <code>hosfuncPull</code> to populate Firestore.' +
        (cache.error ? '<p style="margin:8px 0 0;color:#7b8494;font-size:11.5px">' + esc(cache.error) + '</p>' : '') +
      '</div></div>';
      el.innerHTML = h;
      return;
    }

    var rows = (cache.rows || []).filter(function (r) {
      if (cnbStatus !== 'all' && !new RegExp('^' + cnbStatus, 'i').test(r.status)) return false;
      if (cnbType !== 'all' && r.functionType !== cnbType) return false;
      return true;
    });
    var totals = cache.totals || {};
    var types = Object.keys(totals.byType || {}).sort();

    h += '<div class="tiles" style="margin-top:14px">' +
      tile('Events on the books', num((totals.total || {}).count), gbp((totals.total || {}).revenue || 0) + ' est. revenue · ' + num((totals.total || {}).delegates) + ' delegates') +
      tile('Confirmed', num((totals.confirmed || {}).count), gbp((totals.confirmed || {}).revenue || 0)) +
      tile('Provisional', num((totals.provisional || {}).count), gbp((totals.provisional || {}).revenue || 0) + ' · needs chasing') +
      tile('Last pulled', cache.lastPull ? new Date(cache.lastPull.at).toLocaleString('en-GB') : '—', cache.lastPull ? cache.lastPull.method + ' · ' + cache.lastPull.rowsStored + ' rows' : 'feed pending wire-up') +
      '</div></div>';

    // Filters + table
    h += '<div class="card"><h2>Forward events</h2>' +
      '<div style="display:flex;gap:10px;margin:10px 0;flex-wrap:wrap">' +
        '<label style="font-size:12px;color:#52647a">Status <select id="cnb-status" style="padding:7px 10px;border:1px solid #c8d9dd;border-radius:5px;margin-left:4px"><option value="all"' + (cnbStatus === 'all' ? ' selected' : '') + '>All</option><option value="confirm"' + (cnbStatus === 'confirm' ? ' selected' : '') + '>Confirmed</option><option value="provisi"' + (cnbStatus === 'provisi' ? ' selected' : '') + '>Provisional</option><option value="cancel"' + (cnbStatus === 'cancel' ? ' selected' : '') + '>Cancelled</option></select></label>' +
        '<label style="font-size:12px;color:#52647a">Type <select id="cnb-type" style="padding:7px 10px;border:1px solid #c8d9dd;border-radius:5px;margin-left:4px"><option value="all">All</option>' + types.map(function (t) { return '<option value="' + esc(t) + '"' + (cnbType === t ? ' selected' : '') + '>' + esc(t) + ' (' + totals.byType[t].count + ')</option>'; }).join('') + '</select></label>' +
        '<span style="font-size:11.5px;color:#7b8494;align-self:center">' + rows.length + ' events shown</span>' +
      '</div>' +
      '<div style="overflow-x:auto;max-height:620px;overflow-y:auto"><table><thead style="position:sticky;top:0;background:#eef3f8;z-index:1"><tr>' +
        '<th>Date</th><th>Ref</th><th>Type</th><th>Location</th><th>Contact</th><th>Company</th><th class="n">Delegates</th><th>Status</th><th class="n">Revenue</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var sc = /^confirm/i.test(r.status) ? '#1a7f4b' : (/^cancel/i.test(r.status) ? '#c0362b' : '#b26a00');
        return '<tr>' +
          '<td><b>' + esc(r.from) + '</b>' + (r.to && r.to !== r.from ? '<div style="font-size:10.5px;color:#7b8494">→ ' + esc(r.to) + '</div>' : '') + '</td>' +
          '<td style="font-family:monospace;font-size:11.5px">' + esc(r.bookRef) + '</td>' +
          '<td>' + esc(r.functionType || '—') + '</td>' +
          '<td>' + esc(r.location || '—') + '</td>' +
          '<td>' + esc(r.contact || '—') + (r.description ? '<div style="font-size:10.5px;color:#7b8494;margin-top:2px">' + esc(r.description).slice(0, 80) + '</div>' : '') + '</td>' +
          '<td>' + esc(r.company || '—') + '</td>' +
          '<td class="n">' + num(r.delegates) + '</td>' +
          '<td style="color:' + sc + ';font-weight:600">' + esc(r.status) + '</td>' +
          '<td class="n"><b>' + gbp(r.revenue) + '</b></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div></div>';

    el.innerHTML = h;
    var s = document.getElementById('cnb-status'); if (s) s.onchange = function () { cnbStatus = s.value; renderCnb(); };
    var t = document.getElementById('cnb-type'); if (t) t.onchange = function () { cnbType = t.value; renderCnb(); };
  }

  /* ---------- Comp Set — competitor rates + estimated occupancy ---------- */
  var COMP_CACHE = null;
  var compNights = 14;
  function fetchComp(cb) {
    var tok = null;
    try { tok = localStorage.getItem('hosbusiness_gl_token') || sessionStorage.getItem('hosbusiness_gl_token'); } catch (e) {}
    if (!tok) { cb({ error: 'Sign in required' }); return; }
    fetch('https://europe-west2-brandonhall-7bdef.cloudfunctions.net/hoscompGet?nights=' + compNights, { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) { COMP_CACHE = j; cb(j); })
      .catch(function (e) { cb({ error: String(e) }); });
  }
  function occBar(pct) {
    var color = pct >= 85 ? '#1a6442' : pct >= 70 ? '#4a8f6b' : pct >= 50 ? '#b26a00' : '#c0362b';
    return '<div style="display:inline-flex;align-items:center;gap:6px"><div style="width:48px;height:8px;background:#e8ecf0;border-radius:4px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + '"></div></div><b style="color:' + color + '">' + pct + '%</b></div>';
  }
  function gapChip(gap) {
    if (gap === 0) return '<span style="color:#7b8494">=</span>';
    var sign = gap > 0 ? '+' : '−';
    var color = gap > 0 ? '#1a6442' : '#c0362b';
    var label = gap > 0 ? 'above us' : 'below us';
    return '<span style="color:' + color + ';font-weight:600">' + sign + '£' + Math.abs(gap) + '</span> <small style="color:#7b8494">' + label + '</small>';
  }
  function trajectoryArrow(pct) {
    if (Math.abs(pct) < 2) return '<span style="color:#7b8494">→ flat</span>';
    if (pct > 0) return '<span style="color:#1a6442">↑ +' + pct + '%</span>';
    return '<span style="color:#c0362b">↓ ' + pct + '%</span>';
  }
  function renderComp() {
    var el = $('pf-comp'); if (!el) return;
    var cache = COMP_CACHE;
    var h = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap"><div><h2>Comp Set · Competitor rates &amp; estimated occupancy <span style="font-size:11px;color:#b26a00;margin-left:8px;font-weight:600;letter-spacing:.2px;text-transform:uppercase;background:#fff5e6;padding:2px 8px;border-radius:10px">ARIA Estimate</span></h2>' +
      '<p class="sub" style="margin:4px 0 0">Competitor rates and estimated occupancy for the next ' + compNights + ' nights. Occupancy is derived from inventory signals (depletion, rate trajectory, weekday pattern) — not actual booked occupancy. Accuracy ±15%.</p></div>' +
      '<button id="comp-ai-check" style="flex:0 0 auto;background:linear-gradient(135deg,#1a2238 0%,#2d3b5c 100%);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">🎩 AI Check Comp Set</button>' +
    '</div>';

    if (!cache) {
      h += '<div style="padding:16px;text-align:center;color:#7b8494">Loading comp set…</div></div>';
      el.innerHTML = h;
      fetchComp(function () { renderComp(); });
      return;
    }

    if (cache.error || !cache.ok) {
      h += '<div style="padding:16px;background:#fdf6f5;border:1px solid #e3b9b9;border-radius:8px;color:#8a1e15;font-size:13px">' +
        '<b>Comp set feed not yet available.</b> ' + esc(cache.error || 'Unknown error') +
      '</div></div>';
      el.innerHTML = h;
      return;
    }

    /* Summary tiles */
    var mg = cache.ourGapToMarket;
    var mgLabel = mg > 0 ? gbp(mg) + ' above market' : mg < 0 ? gbp(-mg) + ' below market' : 'at market';
    var mgColor = mg > 0 ? '#1a6442' : mg < 0 ? '#c0362b' : '#7b8494';
    h += '<div class="tiles" style="margin-top:14px">' +
      '<div class="tile"><div class="l">Our BAR</div><div class="v">' + gbp(cache.ownBar) + '</div><div class="d">Executive double</div></div>' +
      '<div class="tile"><div class="l">Market avg rate</div><div class="v">' + gbp(cache.marketAvgRate) + '</div><div class="d">across ' + cache.hotels.length + ' comp hotels, ' + cache.nightsAnalysed + ' nights</div></div>' +
      '<div class="tile"><div class="l">Market avg occupancy</div><div class="v" style="color:' + (cache.marketAvgOcc >= 70 ? '#1a6442' : '#b26a00') + '">' + cache.marketAvgOcc + '%</div><div class="d">estimated across comp set</div></div>' +
      '<div class="tile"><div class="l">Our rate vs market</div><div class="v" style="color:' + mgColor + '">' + (mg >= 0 ? '+' : '−') + '£' + Math.abs(mg) + '</div><div class="d">' + mgLabel + '</div></div>' +
      '</div></div>';

    /* Horizon selector + hotels table */
    h += '<div class="card"><h2>Competitors</h2>' +
      '<div style="margin:8px 0 14px"><label style="font-size:12px;color:#52647a">Horizon <select id="comp-nights" style="padding:7px 10px;border:1px solid #c8d9dd;border-radius:5px;margin-left:4px">' +
        '<option value="7"' + (compNights === 7 ? ' selected' : '') + '>Next 7 nights</option>' +
        '<option value="14"' + (compNights === 14 ? ' selected' : '') + '>Next 14 nights</option>' +
        '<option value="28"' + (compNights === 28 ? ' selected' : '') + '>Next 28 nights</option>' +
        '<option value="60"' + (compNights === 60 ? ' selected' : '') + '>Next 60 nights</option>' +
        '<option value="90"' + (compNights === 90 ? ' selected' : '') + '>Next 90 nights</option>' +
      '</select></label></div>' +
      '<table><thead><tr><th>Hotel</th><th>Brand</th><th class="n">Rooms</th><th class="n">Published BAR</th><th class="n">Avg rate (horizon)</th><th class="n">Rate gap vs us</th><th>Est. occupancy</th><th>7-day trajectory</th></tr></thead><tbody>' +
      cache.hotels.map(function (ho) {
        return '<tr>' +
          '<td><b>' + esc(ho.name) + '</b></td>' +
          '<td>' + esc(ho.brand) + '</td>' +
          '<td class="n">' + num(ho.rooms) + '</td>' +
          '<td class="n">' + gbp(ho.bar) + '</td>' +
          '<td class="n"><b>' + gbp(ho.avgRate) + '</b></td>' +
          '<td class="n">' + gapChip(ho.avgGap) + '</td>' +
          '<td>' + occBar(ho.avgOcc) + '</td>' +
          '<td>' + trajectoryArrow((ho.perNight[0] || {}).trajectory7d || 0) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';

    /* Per-night grid for the first 14 days — heatmap-ish */
    var firstHotel = cache.hotels[0];
    if (firstHotel && firstHotel.perNight.length > 0) {
      h += '<div class="card"><h2>Rate &amp; occupancy heatmap · next ' + Math.min(14, cache.nightsAnalysed) + ' nights</h2>' +
        '<p class="sub">Each cell: estimated occupancy and published rate per hotel per night. Red = sold out signal, green = wide open. Hover for details.</p>' +
        '<div style="overflow-x:auto"><table style="font-size:11.5px"><thead><tr><th style="text-align:left;position:sticky;left:0;background:#eef3f8;z-index:2">Hotel</th>' +
        firstHotel.perNight.slice(0, 14).map(function (n) {
          var d = new Date(n.date + 'T00:00:00Z');
          var dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
          var wk = (d.getUTCDay() === 5 || d.getUTCDay() === 6);
          return '<th class="n" style="background:' + (wk ? '#fff5e6' : '') + '">' + dow + '<br><small>' + ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth()+1)).slice(-2) + '</small></th>';
        }).join('') + '</tr></thead><tbody>' +
        cache.hotels.map(function (ho) {
          return '<tr><td style="text-align:left;position:sticky;left:0;background:#fff;z-index:1;font-weight:600">' + esc(ho.name) + '</td>' +
          ho.perNight.slice(0, 14).map(function (n) {
            var bg = n.estOcc >= 92 ? '#f4ddd9' : n.estOcc >= 80 ? '#faebd6' : n.estOcc >= 60 ? '#f3f6e8' : n.estOcc >= 40 ? '#e9f1ea' : '#dbede3';
            return '<td class="n" style="background:' + bg + ';padding:6px 4px" title="' + n.inventorySignal.label + ' · £' + n.rate + ' · ' + n.estOcc + '% occ">' +
              '<b>£' + n.rate + '</b><br><small style="color:#52647a">' + n.estOcc + '%</small>' +
            '</td>';
          }).join('') + '</tr>';
        }).join('') +
        '</tbody></table></div></div>';
    }

    h += '<div class="card" style="background:#fafbfc"><p class="sub" style="margin:0"><b>How this is worked out.</b> ' + esc(cache.methodology) + ' Pending wire-up: live Booking.com inventory scraping and STR / Lighthouse / OTA Insight API for actual booked occupancy.</p></div>';

    el.innerHTML = h;
    var ns = document.getElementById('comp-nights');
    if (ns) ns.onchange = function () { compNights = parseInt(ns.value, 10); COMP_CACHE = null; renderComp(); };

    /* AI Check button — ask ARIA (grounded in live Google Search) to check
       current competitor rates, offers and anything unusual across the comp set. */
    var aiBtn = document.getElementById('comp-ai-check');
    if (aiBtn) aiBtn.onclick = function () {
      var hotels = cache.hotels.map(function (h) { return h.name; }).join(', ');
      var q = 'Please check our comp set across Coventry and Warwickshire RIGHT NOW using live Google Search. ' +
        'Our comp set is: ' + hotels + '. ' +
        'For each hotel, report any: (1) current weekend rates visible on their website or Booking.com; ' +
        '(2) promotional offers or packages they are actively running; ' +
        '(3) anything unusual — sold out dates, new refurbishments, new openings nearby, significant price moves. ' +
        'Compare against our Brandon Hall BAR of £' + cache.ownBar + ' and flag the three most important findings for a revenue decision today.';
      if (window.FloatingARIA) window.FloatingARIA.prefill(q, { autoAsk: true });
    };
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
  if (window.Profit && window.Profit.register) { ['home', renderHome, 'actions', renderActions, 'fb', renderFb, 'cnb', renderCnb, 'comp', renderComp, 'data', renderData, 'help', renderHelp, 'trends', renderTrends].forEach(function (v, i, arr) { if (i % 2 === 0) window.Profit.register(v, arr[i + 1]); }); }
  document.addEventListener('DOMContentLoaded', function () {
    unlock(); crumb('pf-home'); if (window.Profit.signedIn()) liveFeed().then(glFeed); else chip();
    var sv = $('t-save'); if (sv && !sv.querySelector('.segs')) sv.insertAdjacentHTML('afterbegin', '<div id="save-pills"></div>');
    new MutationObserver(function () { annotate(document.querySelector('main')); var sp = $('save-pills'); if (sp && !sp.firstChild && window.Profit.signedIn()) sp.innerHTML = '<p style="margin:0 0 14px"><button class="btn ghost" data-go="pf-actions">← Back to the Action Centre</button></p>'; }).observe(document.querySelector('main'), { childList: true, subtree: true });
  });
})();
