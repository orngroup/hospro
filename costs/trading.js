/* Brandon Hall — Trading tab. Reads Rezlynx (Guestline) reports held in data/trading-data.js,
   compares them with the management accounts forecast and Xero purchases. */
(function () {
  'use strict';
  var ROOMS = 120;             // lettable bedrooms (management accounts and Manager's Flash)
  var VAT = 1.2;
  var T = window.TradingEngine, S = window.TRADING_DATA || {}, month = null, chart = null, changed = false;
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gbp(v, dp) { if (v === null || v === undefined || !isFinite(v)) return '–'; return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function num(v) { return v === null || !isFinite(v) ? '–' : Math.round(v).toLocaleString('en-GB'); }
  function pc(v) { return v === null || !isFinite(v) ? '–' : (v * 100).toFixed(1) + '%'; }
  function mlabel(m) { return MN[+m.slice(5) - 1] + ' ' + m.slice(0, 4); }
  function dlabel(d) { return d.slice(8) + ' ' + MN[+d.slice(5, 7) - 1]; }
  function when(ts) { return ts ? ts.slice(8, 10) + ' ' + MN[+ts.slice(5, 7) - 1] + ' ' + ts.slice(11, 16) : '–'; }
  function tile(l, v, d) { return '<div class="tile"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + (d || '') + '</div></div>'; }
  function net(v) { return (S.af && S.af.basis === 'net') ? v : v / VAT; }

  function agg(rows) {
    var a = { nights: rows.length, rooms: 0, acc: 0, fb: 0, oth: 0, guests: 0, roos: 0, dfs: 0, blocks: 0, listed: 0, busyRoos: 0 };
    rows.forEach(function (r) {
      a.rooms += r.rooms; a.acc += net(r.acc); a.fb += net(r.fb); a.oth += net(r.oth); a.guests += r.ad + r.ch; a.roos += r.roos; a.dfs += r.dfs; a.blocks += r.blocks; a.listed += r.listed;
      if (r.roos && r.rooms / ROOMS >= 0.7) a.busyRoos += r.roos;
    });
    a.avail = rows.length * ROOMS; a.total = a.acc + a.fb + a.oth;
    a.occ = a.avail ? a.rooms / a.avail : null; a.adr = a.rooms ? a.acc / a.rooms : null;
    a.revpar = a.avail ? a.acc / a.avail : null; a.trevpar = a.avail ? a.total / a.avail : null;
    return a;
  }
  function asOfDay() { return S.af ? S.af.asOf.slice(0, 10) : ''; }
  function rowsFor(m, part) {
    var cut = asOfDay();
    return (S.af ? S.af.rows : []).filter(function (r) { return r.d.slice(0, 7) === m && (part === 'actual' ? r.d < cut : part === 'books' ? r.d >= cut : true); });
  }
  function pePeriod(type, m) {
    var best = null; Object.keys(S.pe || {}).forEach(function (k) { var p = S.pe[k]; if (p.type === type && (!m || p.from.slice(0, 7) === m) && (!best || p.from > best.from)) best = p; });
    return best;
  }
  function peGroup(p, g) { var x = (p.groups || []).filter(function (q) { return q.g === g; })[0]; return x || { lines: [], total: [0, 0, 0] }; }
  function forecast(m) {
    var P = window.Profit && window.Profit.data ? window.Profit.data() : null; if (!P || !P.IDS.length) return null;
    var fc = P.M[P.IDS[P.IDS.length - 1]].forecast; if (!fc || !fc.months) return null;
    var i = fc.months.indexOf(MN[+m.slice(5) - 1] + '-' + m.slice(2, 4)); if (i === -1) return null;
    var g = function (l) { var r = fc.rows.filter(function (x) { return x.label === l; })[0]; return r ? r.m[i] : null; };
    return { rooms: g('Rooms - Revenue'), fb: g('F & B - Revenue'), other: (g('Leisure - Revenue') || 0) + (g('Other Hotel Revenue - Revenue') || 0), total: g('TOTAL REVENUE'), actual: i < fc.actualCount };
  }

  /* ---------- sections ---------- */
  function feedPanel() {
    var last = {}; (S.received || []).forEach(function (r) { var k = r.kind === 'pe' ? 'pe' : r.kind; if (!last[k]) last[k] = r; });
    var now = Date.now();
    var line = function (name, what, r, how) {
      var age = r ? (now - Date.parse(r.ts)) / 36e5 : null;
      var st = !r ? '<span class="pill">Not received yet</span>' : age > 36 ? '<span class="pill warn">Stale — ' + Math.round(age / 24) + ' days old</span>' : '<span class="pill good">Up to date</span>';
      return '<tr><td><b>' + name + '</b></td><td>' + what + '</td><td>' + (r ? when(r.ts) : '–') + '</td><td>' + (r ? esc(r.file) : '–') + '</td><td>' + st + '</td><td style="color:#52514e">' + how + '</td></tr>';
    };
    return '<div class="card"><h2>Data received from Guestline</h2><p class="sub">When each Rezlynx report last reached the dashboard</p><div class="scroll"><table><tr><th>Report</th><th>Used for</th><th>Last received</th><th>File</th><th>Status</th><th>How it arrives</th></tr>' +
      line('Actual & Forecast', 'Occupancy, rate, revenue by night, forward bookings', last.af, 'Loaded by hand today; daily email scheduled 07:00') +
      line('Period End / End of Day', 'Revenue by outlet, payments, deposits, debtors', last.pe, 'Loaded by hand today; End of Day email set up') +
      line('Manager’s Flash', 'Cross-check of headline KPIs', last.flash, 'Daily email subscription') +
      line('Booking Source', 'Channels and OTA share', last.bs, 'Daily email scheduled 07:00') +
      line('Key Performance', 'KPI cross-check', last.kp, 'Daily email scheduled 07:00') +
      line('Deposits', 'Deposits held', last.dep, 'Daily email scheduled 07:00') +
      '</table></div><p class="note">The scheduled emails arrive as PDFs in Gmail. Until the Gmail link is switched on, drop the exported CSV or Excel files into the box at the bottom of this tab.</p></div>';
  }

  function observations(m, act, bks) {
    var o = [], all = (S.af ? S.af.rows : []), cut = asOfDay();
    var past = all.filter(function (r) { return r.d < cut; });
    var byDow = {}; past.forEach(function (r) { (byDow[r.dow] = byDow[r.dow] || []).push(r); });
    var dows = Object.keys(byDow).map(function (k) { var a = agg(byDow[k]); return [k, a.occ, a.adr]; }).sort(function (a, b) { return a[1] - b[1]; });
    if (dows.length > 3) o.push(['warn', dows[0][0] + ' is the weak night', dows[0][0] + 's are running at ' + pc(dows[0][1]) + ' occupancy against ' + pc(dows[dows.length - 1][1]) + ' on ' + dows[dows.length - 1][0] + 's. A Sunday-night offer for leisure guests or contractors is the clearest gap to fill.']);
    if (act.roos) o.push([act.busyRoos ? 'bad' : 'warn', num(act.roos) + ' room nights out of service so far this month', (act.busyRoos ? num(act.busyRoos) + ' of them fell on nights when the hotel was at least 70% full, so they may have cost sales. ' : 'None fell on nights above 70% occupancy. ') + 'At this month’s average rate, each out-of-service room that could have sold is worth about ' + gbp(act.adr) + ' a night.']);
    var soft = all.filter(function (r) { return r.d >= cut && r.rooms / ROOMS < 0.25; }).slice(0, 400);
    var next30 = soft.filter(function (r) { return (Date.parse(r.d) - Date.parse(cut)) / 864e5 <= 30; });
    if (next30.length) o.push(['warn', next30.length + ' nights in the next 30 days are under 25% booked', 'Softest: ' + next30.slice().sort(function (a, b) { return a.rooms - b.rooms; }).slice(0, 5).map(function (r) { return dlabel(r.d) + ' (' + r.rooms + ' rooms)'; }).join(', ') + '. These are the dates for the quiet-date plan.']);
    if (bks.nights && bks.listed) { var sh = bks.blocks / bks.listed; if (sh > 0.3) o.push(['warn', 'The rest of ' + mlabel(m) + ' leans on group blocks', pc(sh) + ' of the room nights listed for the remaining nights are group block allocations, which only count once rooms are picked up. Check pick-up and release dates with the group organisers.']); }
    var pe = pePeriod('month', m);
    if (pe && act.guests) {
      var brk = (peGroup(pe, 'FOOD').lines.filter(function (l) { return l[0] === 'RES1_BRK'; })[0] || [0, 0, 0])[2];
      var bev = peGroup(pe, 'BEVERAGE'), bar = 0, rest = 0;
      bev.lines.forEach(function (l) { if (/^BAR/.test(l[0])) bar += l[2]; if (/^RES/.test(l[0])) rest += l[2]; });
      if (brk) o.push(['good', 'Breakfast is worth ' + gbp(brk / act.guests, 2) + ' a guest', gbp(brk) + ' of breakfast revenue across ' + num(act.guests) + ' guest nights. If most rates include breakfast, check the amount allocated to food per guest is what you intend.']);
      if (bar + rest) o.push(['warn', 'Only ' + pc(bar / (bar + rest)) + ' of drinks sales are rung through the bar', gbp(rest) + ' of drinks are posted to the restaurant and ' + gbp(bar) + ' to the bar. If the bar is busier than that suggests, drinks are being rung on the restaurant till, which blurs bar margin.']);
    }
    if (act.rooms) o.push(['good', 'Guests spend ' + gbp(act.fb / act.rooms, 2) + ' on food and drink per occupied room', 'That is ' + gbp(act.fb / act.guests, 2) + ' a guest. Raising dinner take-up among in-house guests is the lowest-cost way to lift it.']);
    return '<div class="card"><h2>What the numbers suggest</h2><p class="sub">Worked out automatically from the latest data</p>' + o.map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div>';
  }

  function render() {
    var el = $('pf-trading');
    if (!S.af || !S.af.rows.length) { el.innerHTML = feedPanel() + loader(); wire(); return; }
    var months = {}; S.af.rows.forEach(function (r) { months[r.d.slice(0, 7)] = 1; }); months = Object.keys(months).sort();
    var cut = asOfDay(); if (!month || months.indexOf(month) === -1) month = months.indexOf(cut.slice(0, 7)) !== -1 ? cut.slice(0, 7) : months[0];
    var act = agg(rowsFor(month, 'actual')), bks = agg(rowsFor(month, 'books')), all = agg(rowsFor(month));
    var fc = forecast(month), isCur = month === cut.slice(0, 7), main = act.nights ? act : bks;
    var h = '<div class="filters"><label>Month<select id="tr-month">' + months.map(function (m) { return '<option value="' + m + '"' + (m === month ? ' selected' : '') + '>' + mlabel(m) + '</option>'; }).join('') + '</select></label>' +
      '<span class="note" style="margin:0 0 6px">Rezlynx Actual & Forecast as at ' + when(S.af.asOf) + '. Nights before ' + dlabel(cut) + ' are actual; later nights are what is on the books. Figures net of VAT; occupancy on ' + ROOMS + ' rooms.</span></div>';

    h += '<div class="tiles">' +
      tile('Occupancy' + (act.nights ? ', actual' : ', on the books'), pc(main.occ), num(main.rooms) + ' room nights over ' + main.nights + ' nights') +
      tile('Average daily rate', gbp(main.adr, 2), gbp(main.adr * VAT, 2) + ' including VAT') +
      tile('RevPAR', gbp(main.revpar, 2), 'rooms revenue per available room') +
      tile('TRevPAR', gbp(main.trevpar, 2), 'all revenue per available room') +
      tile('Guests', num(main.guests), main.rooms ? (main.guests / main.rooms).toFixed(2) + ' per occupied room' : '') +
      tile('F&B per occupied room', gbp(main.rooms ? main.fb / main.rooms : null, 2), gbp(main.guests ? main.fb / main.guests : null, 2) + ' per guest') +
      tile('Rooms out of service', num(act.roos + bks.roos), 'room nights this month' + (act.busyRoos ? ' · ' + num(act.busyRoos) + ' on busy nights' : '')) + '</div>';

    // projection
    var pr = [['Rooms', act.acc, bks.acc, fc && fc.rooms], ['Food and beverage', act.fb, bks.fb, fc && fc.fb], ['Other', act.oth, bks.oth, fc && fc.other], ['Total', act.total, bks.total, fc && fc.total]];
    h += '<div class="grid g2"><div class="card"><h2>Where ' + mlabel(month) + ' is heading</h2><p class="sub">Actual so far plus what is already on the books, against the forecast in the management accounts</p><div class="scroll"><table><tr><th></th><th class="n">Actual</th><th class="n">On the books</th><th class="n">Month so far</th><th class="n">Accounts ' + (fc && fc.actual ? 'actual' : 'forecast') + '</th><th class="n">Gap</th></tr>' +
      pr.map(function (r, i) { var t = r[1] + r[2], g = r[3] === null || r[3] === undefined || !fc ? null : t - r[3]; return '<tr' + (i === 3 ? ' class="tot"' : '') + '><td>' + r[0] + '</td><td class="n">' + gbp(r[1]) + '</td><td class="n">' + gbp(r[2]) + '</td><td class="n">' + gbp(t) + '</td><td class="n">' + (fc ? gbp(r[3]) : '–') + '</td><td class="n">' + (g === null ? '–' : '<span class="' + (g >= 0 ? 'down' : 'up') + '">' + (g >= 0 ? '+' : '−') + gbp(Math.abs(g)) + '</span>') + '</td></tr>'; }).join('') +
      '</table></div><p class="note">' + (isCur ? 'On-the-books food and beverage only includes what is pre-booked with rooms, so the F&B gap will narrow as the month trades. ' : '') + 'Rooms on the books: ' + num(all.rooms) + ' room nights, ' + pc(all.occ) + ' for the month.' + pickupNote() + '</p></div>';

    h += '<div class="card"><h2>Occupancy by night</h2><p class="sub">' + mlabel(month) + ', % of ' + ROOMS + ' rooms</p><div class="legend"><span><i style="background:#1baf7a"></i>Actual</span><span><i style="background:#b9b7af"></i>On the books</span></div><div class="chartbox"><canvas id="tr-c1"></canvas></div></div></div>';

    // day of week + forward
    var past = S.af.rows.filter(function (r) { return r.d < cut; }), byDow = {};
    past.forEach(function (r) { (byDow[r.dow] = byDow[r.dow] || []).push(r); });
    var order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    h += '<div class="grid g2"><div class="card"><h2>Pattern by day of the week</h2><p class="sub">Actual nights, ' + (past.length ? dlabel(past[0].d) + ' to ' + dlabel(past[past.length - 1].d) : '') + '</p><div class="scroll"><table><tr><th>Night</th><th class="n">Occupancy</th><th class="n">Rate</th><th class="n">RevPAR</th><th class="n">F&B per room</th><th class="n">Out of service</th></tr>' +
      order.filter(function (d) { return byDow[d]; }).map(function (d) { var a = agg(byDow[d]); return '<tr><td>' + d + '</td><td class="n"><span class="bar-cell" style="width:' + Math.round(a.occ * 60) + 'px;background:#1baf7a"></span>' + pc(a.occ) + '</td><td class="n">' + gbp(a.adr, 2) + '</td><td class="n">' + gbp(a.revpar, 2) + '</td><td class="n">' + gbp(a.rooms ? a.fb / a.rooms : null, 2) + '</td><td class="n">' + num(a.roos / a.nights) + ' a night</td></tr>'; }).join('') + '</table></div></div>';

    h += '<div class="card"><h2>Looking ahead</h2><p class="sub">What is on the books for each month in the feed</p><div class="scroll"><table><tr><th>Month</th><th class="n">Nights</th><th class="n">Rooms booked</th><th class="n">Occupancy</th><th class="n">Rate</th><th class="n">Rooms revenue</th><th class="n">Nights under 25%</th><th class="n">Group block share</th></tr>' +
      months.map(function (m) { var r = rowsFor(m, m === cut.slice(0, 7) ? 'books' : (m < cut.slice(0, 7) ? 'actual' : 'all')), a = agg(r); if (!r.length) return ''; var softN = r.filter(function (x) { return x.rooms / ROOMS < 0.25; }).length; return '<tr><td>' + mlabel(m) + (m === cut.slice(0, 7) ? ' (remaining)' : '') + '</td><td class="n">' + a.nights + '</td><td class="n">' + num(a.rooms) + '</td><td class="n">' + pc(a.occ) + '</td><td class="n">' + gbp(a.adr, 2) + '</td><td class="n">' + gbp(a.acc) + '</td><td class="n">' + softN + '</td><td class="n">' + (a.listed ? pc(a.blocks / a.listed) : '–') + '</td></tr>'; }).join('') +
      '</table></div><p class="note">Group block share = block allocations as a share of all room nights listed. Blocks only become sold rooms when picked up.</p></div></div>';

    // outlets
    var pe = pePeriod('month', month), wk = pePeriod('week');
    if (pe) {
      var lines = []; pe.groups.forEach(function (g) { g.lines.forEach(function (l) { if (Math.abs(l[2]) > 0.005) lines.push([g.g, l[0], l[1], l[2]]); }); });
      var tot = pe.total ? pe.total[0] : 0, wkv = {}; if (wk) wk.groups.forEach(function (g) { g.lines.forEach(function (l) { wkv[l[0]] = l[2]; }); });
      var GN = { ACCOM: 'Rooms', BEVERAGE: 'Drinks', FOOD: 'Food', CONFERENCE: 'Conference', MISC: 'Miscellaneous', SUNDRIES: 'Sundries' };
      h += '<div class="grid g2"><div class="card"><h2>Revenue by outlet</h2><p class="sub">Rezlynx Period End, month from ' + dlabel(pe.from) + ' (' + esc(pe.status.toLowerCase()) + ' period), net of VAT, as at ' + when(pe.asOf) + '</p><div class="scroll"><table><tr><th>Area</th><th>Line</th><th class="n">Month to date</th><th class="n">Share</th>' + (wk ? '<th class="n">Week from ' + dlabel(wk.from) + '</th>' : '') + '</tr>' +
        lines.sort(function (a, b) { return b[3] - a[3]; }).map(function (l) { return '<tr><td>' + (GN[l[0]] || l[0]) + '</td><td>' + esc(l[2]) + ' <span style="color:#86847d">' + esc(l[1]) + '</span></td><td class="n">' + gbp(l[3]) + '</td><td class="n">' + pc(l[3] / tot) + '</td>' + (wk ? '<td class="n">' + gbp(wkv[l[1]] || 0) + '</td>' : '') + '</tr>'; }).join('') +
        '<tr class="tot"><td colspan="2">Total</td><td class="n">' + gbp(tot) + '</td><td class="n">100.0%</td>' + (wk ? '<td class="n">' + gbp(wk.total ? wk.total[0] : 0) + '</td>' : '') + '</tr></table></div></div>';

      // sales vs Xero
      var TX = window.CostsApp ? window.CostsApp.tx() : [], xs = function (f) { var s = 0, last = ''; TX.forEach(function (t) { if (t.month === month && f(t)) { s += t.net; if (t.date > last) last = t.date; } }); return [s, last]; };
      var xf = xs(function (t) { return t.dept === 'Restaurant' && ['Food', 'Hot beverages', 'Beverages'].indexOf(t.section) !== -1 && t.cat !== 'Alcohol (coded to restaurant)'; });
      var xb = xs(function (t) { return t.dept === 'Bar' || t.cat === 'Alcohol (coded to restaurant)'; });
      var xl = xs(function (t) { return t.section === 'Linen & laundry'; }), xh = xs(function (t) { return t.section === 'Housekeeping' || t.section === 'Guest supplies'; });
      var fs = peGroup(pe, 'FOOD').total[0], bs = peGroup(pe, 'BEVERAGE').total[0];
      var row = function (n1, s, x) { return '<tr><td>' + n1 + '</td><td class="n">' + gbp(s) + '</td><td class="n">' + gbp(x[0]) + '</td><td class="n">' + (s ? pc(x[0] / s) : '–') + '</td><td class="n">' + gbp(s - x[0]) + '</td></tr>'; };
      h += '<div><div class="card"><h2>Sales against purchases</h2><p class="sub">Rezlynx sales beside Xero purchases for ' + mlabel(month) + '</p><div class="scroll"><table><tr><th></th><th class="n">Sales (Rezlynx)</th><th class="n">Purchases (Xero)</th><th class="n">Purchases % of sales</th><th class="n">Sales less purchases</th></tr>' + row('Food', fs, xf) + row('Drinks', bs, xb) +
        '</table></div><table style="margin-top:10px"><tr><th></th><th class="n">Xero cost</th><th class="n">Per room sold</th></tr><tr><td>Linen and laundry</td><td class="n">' + gbp(xl[0]) + '</td><td class="n">' + (xl[0] && act.rooms ? gbp(xl[0] / act.rooms, 2) : '–') + '</td></tr><tr><td>Housekeeping and guest supplies</td><td class="n">' + gbp(xh[0]) + '</td><td class="n">' + (act.rooms ? gbp(xh[0] / act.rooms, 2) : '–') + '</td></tr></table>' +
        '<p class="note">Xero is loaded to ' + (xf[1] || xb[1] ? dlabel(xf[1] > xb[1] ? xf[1] : xb[1]) : 'an earlier date') + ' and purchases are not the same as stock used, so read this as a direction, not a margin. Drinks purchases are after keg return credits. Linen is invoiced at month end, so it shows once that invoice is in Xero.</p></div>';

      var pg = {}; pe.payments.forEach(function (p) { var k = /^Z_/.test(p[0]) ? 'Till (EPoS)' : /^PDQ/.test(p[0]) ? 'Card machine at reception' : /^MOTO/.test(p[0]) ? 'Card by phone or on file' : /^ECOM/.test(p[0]) ? 'Online payment' : p[0] === 'BACS' ? 'Bank transfer' : 'Other'; pg[k] = (pg[k] || 0) + -p[2]; });
      var amex = 0, cards = 0; pe.payments.forEach(function (p) { if (/AMEX/.test(p[0])) amex += -p[2]; if (/^(Z_|PDQ|MOTO|ECOM)/.test(p[0])) cards += -p[2]; });
      var paid = Object.keys(pg).reduce(function (s, k) { return s + pg[k]; }, 0);
      h += '<div class="card"><h2>Cash position</h2><p class="sub">From the same Period End report, including VAT</p><table><tr><td>Deposits held for future stays</td><td class="n"><b>' + gbp(-(pe.other.DEP_BAL_ACT || 0)) + '</b></td></tr><tr><td>Deposits received this month</td><td class="n">' + gbp(-(pe.other.DEP_RECVD || 0)) + '</td></tr><tr><td>Owed by account customers (ledger)</td><td class="n"><b>' + gbp(pe.other.LEDG_BAL_ACT || 0) + '</b></td></tr><tr><td>Payments taken this month</td><td class="n">' + gbp(paid) + '</td></tr>' +
        Object.keys(pg).filter(function (k) { return pg[k]; }).sort(function (a, b) { return pg[b] - pg[a]; }).map(function (k) { return '<tr><td style="color:#52514e">&nbsp;&nbsp;&nbsp;' + k + '</td><td class="n">' + gbp(pg[k]) + ' · ' + pc(pg[k] / paid) + '</td></tr>'; }).join('') +
        '<tr><td>American Express share of card payments</td><td class="n">' + pc(cards ? amex / cards : null) + '</td></tr></table></div></div></div>';
    } else {
      h += '<div class="card"><h2>Revenue by outlet</h2><p class="sub">No Period End report has been loaded for ' + mlabel(month) + '.</p></div>';
    }
    h += observations(month, act, bks) + feedPanel() + loader();
    el.innerHTML = h; wire(); drawChart();
  }
  function pickupNote() {
    var d = Object.keys(S.snaps || {}).sort(); if (d.length < 2) return ' Pickup (rooms gained since the last report) starts once a second day’s report has been loaded.';
    var a = S.snaps[d[d.length - 2]], b = S.snaps[d[d.length - 1]], rooms = 0, rev = 0;
    Object.keys(b).forEach(function (k) { if (a[k]) { rooms += b[k][0] - a[k][0]; rev += (b[k][1] - a[k][1]); } });
    return ' Pickup since ' + dlabel(d[d.length - 2]) + ': ' + (rooms >= 0 ? '+' : '') + rooms + ' room nights, ' + gbp(net(rev)) + ' rooms revenue across future dates.';
  }
  function drawChart() {
    var rows = rowsFor(month), cut = asOfDay(); if (!$('tr-c1')) return;
    if (chart) chart.destroy();
    chart = new Chart($('tr-c1'), { type: 'bar', data: { labels: rows.map(function (r) { return +r.d.slice(8); }), datasets: [{ data: rows.map(function (r) { return +(r.rooms / ROOMS * 100).toFixed(1); }), backgroundColor: rows.map(function (r) { return r.d < cut ? '#1baf7a' : '#b9b7af'; }), borderRadius: 3, maxBarThickness: 22 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function (it) { var r = rows[it[0].dataIndex]; return r.dow + ' ' + dlabel(r.d); }, label: function (c) { var r = rows[c.dataIndex]; return [c.parsed.y + '% · ' + r.rooms + ' rooms', 'Rate ' + gbp(r.rooms ? net(r.acc) / r.rooms : null, 2), r.roos ? r.roos + ' out of service' : '']; } } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return v + '%'; } } } } } });
  }

  /* ---------- loading new files ---------- */
  function loader() {
    return '<div class="card"><h2>Load Rezlynx reports</h2><p class="sub">Choose the Actual & Forecast CSV and Period End Excel files exported from Rezlynx. Any number at once.</p><p><input type="file" id="tr-up" multiple accept=".csv,.xls,.xlsx"></p><p class="note" id="tr-msg"></p><p><button class="btn" id="tr-dl"' + (changed ? '' : ' disabled') + '>Download trading-data.js</button></p><p class="note">The tab refreshes on your screen straight away. To update it for everyone, replace <code>costs/data/trading-data.js</code> in the repository with the downloaded file.</p></div>';
  }
  function stampFromName(name) {
    var m = name.match(/_(\d{4})(\d\d)(\d\d)_(\d\d)(\d\d)/); if (m) return m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5];
    var mo = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    m = name.match(/(\d{1,2})_(\w{3})_(\d{4})__(\d\d)_(\d\d)/); if (m && mo[m[2]]) return m[3] + '-' + mo[m[2]] + '-' + ('0' + m[1]).slice(-2) + 'T' + m[4] + ':' + m[5];
    var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  }
  function wire() {
    var s = $('tr-month'); if (s) s.onchange = function () { month = s.value; render(); };
    var dl = $('tr-dl'); if (dl) dl.onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['/* Rezlynx trading data — replace this file to update the Trading tab */\nwindow.TRADING_DATA = ' + JSON.stringify(S) + ';\n'], { type: 'text/javascript' })); a.download = 'trading-data.js'; document.body.appendChild(a); a.click(); a.remove(); };
    var up = $('tr-up'); if (up) up.onchange = function () { if (up.files.length) load(up.files); };
  }
  function load(files) {
    var msg = [], left = files.length, done = function () { if (--left === 0) { changed = true; render(); $('tr-msg').innerHTML = msg.map(esc).join('<br>'); } };
    var withXlsx = function (cb) { if (window.XLSX) return cb(); var sc = document.createElement('script'); sc.src = 'vendor/xlsx.full.min.js'; sc.onload = cb; document.head.appendChild(sc); };
    Array.prototype.forEach.call(files, function (f) {
      var fr = new FileReader(), meta = { asOf: stampFromName(f.name), file: f.name, basis: 'gross' };
      if (/\.csv$/i.test(f.name)) {
        fr.onload = function () { if (T.isAF(fr.result)) { var p = T.parseAF(fr.result); S = T.merge(S, 'af', p, meta); msg.push(f.name + ': Actual & Forecast, ' + p.length + ' nights'); } else msg.push(f.name + ': not a report this tab reads yet'); done(); };
        fr.readAsText(f);
      } else {
        fr.onload = function () { withXlsx(function () { try { var wb = XLSX.read(fr.result), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }); if (T.isPE(aoa)) { var p = T.parsePE(aoa); S = T.merge(S, 'pe', p, meta); msg.push(f.name + ': Period End (' + p.type + ' from ' + p.from + ')'); } else msg.push(f.name + ': not a report this tab reads yet'); } catch (e) { msg.push(f.name + ': could not be read'); } done(); }); };
        fr.readAsArrayBuffer(f);
      }
    });
  }
  if (window.Profit && window.Profit.register) window.Profit.register('trading', render);
})();
