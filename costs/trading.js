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
      [['company', 'Company', 'Booking sources and accounts'], ['segments', 'Revenue By Market Segment', 'Segment mix on the books'], ['rates', 'Daily Rate Analysis', 'Rate plans being sold'], ['cancels', 'Cancellations', 'Cancellations and notice given'], ['noshows', 'No Shows', 'No-show rooms'], ['overrides', 'Rate Override', 'Rates changed from the plan'], ['blocks', 'Block Forecast', 'Group blocks held'], ['rooms', 'Room Usage', 'Room stock and rooms out of service']].map(function (r) { return line(r[1], r[2], last[r[0]], 'Exported by hand; weekly is enough'); }).join('') +
      '</table></div><p class="note">The scheduled emails arrive as PDFs in Gmail. Until the Gmail link is switched on, drop the exported CSV or Excel files into the box at the bottom of this tab.</p></div>';
  }

  function observations(m, act, bks, raw) {
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
    if (raw) return o;
    return '<div class="card"><h2>What the numbers suggest</h2><p class="sub">Worked out automatically from the latest data · click an item to read it in full</p><div class="find2">' + o.map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div>';
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

    h += '<div class="card"><h2>Rate and revenue per room by date, ' + mlabel(month) + '</h2><p class="sub">Net of VAT. Solid lines are actual nights, dotted lines are what is on the books so far. The boxes are the average for the month.</p><div class="tiles" style="margin-bottom:10px">' + avgTiles(rowsFor(month)) + '</div><div class="legend" id="tr-l1-leg"></div><div class="chartbox" style="height:300px"><canvas id="tr-l1"></canvas></div></div>';
    h += '<div class="card"><h2>Every month in the feed</h2><p class="sub">' + mlabel(months[0]) + ' to ' + mlabel(months[months.length - 1]) + ': actual where traded, otherwise on the books</p><div class="grid g3" style="margin:0"><div><div class="chartbox" style="height:210px"><canvas id="tr-m1"></canvas></div></div><div><div class="chartbox" style="height:210px"><canvas id="tr-m2"></canvas></div></div><div><div class="chartbox" style="height:210px"><canvas id="tr-m3"></canvas></div></div></div></div>';
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
  var extra = [];
  var L3 = [['ADR', '#2a78d6'], ['RevPAR', '#eb6834'], ['TRevPAR', '#1baf7a']];
  function avgTiles(rows) { var a = agg(rows); return tile('ADR', gbp(a.adr, 2), 'average for ' + a.nights + ' nights') + tile('RevPAR', gbp(a.revpar, 2), 'rooms revenue ÷ ' + ROOMS + ' rooms') + tile('TRevPAR', gbp(a.trevpar, 2), 'all revenue ÷ ' + ROOMS + ' rooms') + tile('Occupancy', pc(a.occ), num(a.rooms) + ' room nights'); }
  /* three £ measures on one axis: ADR, RevPAR, TRevPAR by date */
  function tri(id, legId, rows, store) {
    if (!$(id)) return; var cut = asOfDay(), df = null; rows.forEach(function (r, i) { if (df === null && r.d >= cut) df = i; });
    var vals = [rows.map(function (r) { return r.rooms ? +(net(r.acc) / r.rooms).toFixed(2) : null; }), rows.map(function (r) { return +(net(r.acc) / ROOMS).toFixed(2); }), rows.map(function (r) { return +(net(r.acc + r.fb + r.oth) / ROOMS).toFixed(2); })];
    var many = rows.length > 62;
    if ($(legId)) $(legId).innerHTML = L3.map(function (l) { return '<span><i style="background:' + l[1] + '"></i>' + l[0] + '</span>'; }).join('') + '<span style="color:#86847d">dotted = on the books</span>';
    store.push(new Chart($(id), { type: 'line', data: { labels: rows.map(function (r) { return many ? dlabel(r.d) + (r.d.slice(8) === '01' ? ' ' + r.d.slice(2, 4) : '') : +r.d.slice(8); }), datasets: L3.map(function (l, k) { return { label: l[0], data: vals[k], borderColor: l[1], backgroundColor: l[1], borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25, spanGaps: true, segment: { borderDash: function (c) { return df !== null && c.p1DataIndex >= df ? [4, 3] : undefined; } } }; }) },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function (it) { var r = rows[it[0].dataIndex]; return r.dow + ' ' + dlabel(r.d) + ' ' + r.d.slice(0, 4) + (r.d >= cut ? ' (on the books)' : ''); }, label: function (c) { return c.dataset.label + ': ' + gbp(c.parsed.y, 2); }, afterBody: function (it) { var r = rows[it[0].dataIndex]; return 'Occupancy: ' + pc(r.rooms / ROOMS) + ' · ' + r.rooms + ' rooms'; } } } },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return '£' + v; }, maxTicksLimit: 6 } } } } }));
  }
  function small(id, type, labels, data, title, fmt, tips, dashFrom, colour) {
    if (!$(id)) return;
    var ds = { data: data, borderColor: colour, backgroundColor: type === 'bar' ? data.map(function (v, i) { return dashFrom !== null && i >= dashFrom ? '#b9b7af' : colour; }) : colour, borderWidth: type === 'bar' ? 0 : 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25, spanGaps: true, borderRadius: 3, maxBarThickness: 22 };
    if (type === 'line' && dashFrom !== null) ds.segment = { borderDash: function (c) { return c.p1DataIndex >= dashFrom ? [3, 3] : undefined; }, borderColor: function (c) { return c.p1DataIndex >= dashFrom ? '#86847d' : colour; } };
    extra.push(new Chart($(id), { type: type, data: { labels: labels, datasets: [ds] }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, title: { display: true, text: title, align: 'start', color: '#141413', font: { weight: '600', size: 13 } }, tooltip: { callbacks: { title: function (it) { return tips[it[0].dataIndex]; }, label: function (c) { return fmt(c.parsed.y); } } } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return fmt(v); }, maxTicksLimit: 5 } } } } }));
  }
  function drawTrends() {
    extra.forEach(function (c) { c.destroy(); }); extra = [];
    var rows = rowsFor(month), cut = asOfDay(), df = null; rows.forEach(function (r, i) { if (df === null && r.d >= cut) df = i; });
    var lab = rows.map(function (r) { return +r.d.slice(8); }), tips = rows.map(function (r) { return r.dow + ' ' + dlabel(r.d) + (r.d >= cut ? ' (on the books)' : ''); });
    var g0 = function (v) { return '£' + Math.round(v); }, g2 = function (v) { return gbp(v, 2); }, p0 = function (v) { return Math.round(v) + '%'; };
    tri('tr-l1', 'tr-l1-leg', rows, extra);
    var ms = {}; S.af.rows.forEach(function (r) { (ms[r.d.slice(0, 7)] = ms[r.d.slice(0, 7)] || []).push(r); });
    var mk = Object.keys(ms).sort(), ag = mk.map(function (m) { return agg(ms[m]); }), mf = null; mk.forEach(function (m, i) { if (mf === null && m > cut.slice(0, 7)) mf = i; });
    var ml = mk.map(function (m) { return MN[+m.slice(5) - 1] + ' ' + m.slice(2, 4); }), mt = mk.map(function (m, i) { return mlabel(m) + (mf !== null && i >= mf ? ' (on the books)' : ''); });
    small('tr-m1', 'bar', ml, ag.map(function (a) { return Math.round(a.acc); }), 'Rooms revenue by month', function (v) { return v >= 1000 ? '£' + Math.round(v / 1000) + 'k' : '£' + Math.round(v); }, mt, mf, '#2a78c8');
    small('tr-m2', 'bar', ml, ag.map(function (a) { return +(a.occ * 100).toFixed(1); }), 'Occupancy by month', p0, mt, mf, '#1baf7a');
    small('tr-m3', 'line', ml, ag.map(function (a) { return a.rooms ? +a.adr.toFixed(2) : null; }), 'Average daily rate by month', g0, mt, mf, '#eb6834');
  }
  function drawChart() {
    drawTrends();
    var rows = rowsFor(month), cut = asOfDay(); if (!$('tr-c1')) return;
    if (chart) chart.destroy();
    chart = new Chart($('tr-c1'), { type: 'bar', data: { labels: rows.map(function (r) { return +r.d.slice(8); }), datasets: [{ data: rows.map(function (r) { return +(r.rooms / ROOMS * 100).toFixed(1); }), backgroundColor: rows.map(function (r) { return r.d < cut ? '#1baf7a' : '#b9b7af'; }), borderRadius: 3, maxBarThickness: 22 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function (it) { var r = rows[it[0].dataIndex]; return r.dow + ' ' + dlabel(r.d); }, label: function (c) { var r = rows[c.dataIndex]; return [c.parsed.y + '% · ' + r.rooms + ' rooms', 'Rate ' + gbp(r.rooms ? net(r.acc) / r.rooms : null, 2), r.roos ? r.roos + ' out of service' : '']; } } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false }, ticks: { callback: function (v) { return v + '%'; } } } } } });
  }

  /* ---------- loading new files ---------- */
  function loader() {
    return '<div class="card"><h2>Load Rezlynx reports</h2><p class="sub">Choose files exported from Rezlynx: Actual & Forecast (CSV), Period End, Company, Cancellations, No Shows, Rate Override, Daily Rate Analysis, Forecast Revenue By Market Segment, Block Forecast and Room Usage (Excel). Any number at once.</p><p><input type="file" id="tr-up" multiple accept=".csv,.xls,.xlsx"></p><p class="note" id="tr-msg"></p><p><button class="btn" id="tr-dl"' + (changed ? '' : ' disabled') + '>Download trading-data.js</button></p><p class="note">The tab refreshes on your screen straight away. To update it for everyone, replace <code>costs/data/trading-data.js</code> in the repository with the downloaded file.</p></div>';
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
        fr.onload = function () { withXlsx(function () { try { var wb = XLSX.read(fr.result), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }); if (T.isPE(aoa)) { var p = T.parsePE(aoa); S = T.merge(S, 'pe', p, meta); msg.push(f.name + ': Period End (' + p.type + ' from ' + p.from + ')'); } else { var rep = T.readReport(aoa); if (rep) { S = T.mergeReport(S, rep, meta); msg.push(f.name + ': ' + (rep.skipped ? 'recognised, nothing used from it yet' : 'loaded (' + rep.kind + ')')); } else msg.push(f.name + ': not a report this tab reads yet'); } } catch (e) { msg.push(f.name + ': could not be read'); } done(); }); };
        fr.readAsArrayBuffer(f);
      }
    });
  }

  /* ---------- Channels & rates view ---------- */
  var KNOWN = { BOOK: 'Booking.com', EXPE: 'Expedia', PERK: 'TravelPerk', MIKI: 'Miki Travel' };
  function coName(ref) { var k = Object.keys(KNOWN).filter(function (x) { return ref.indexOf(x) === 0; })[0]; return k ? KNOWN[k] + ' <span style="color:#86847d">' + esc(ref) + '</span>' : esc(ref); }
  function src(x) { return x ? ' · report run ' + when(x.asOf) : ''; }
  function objRows(o, val) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return val(b[1]) - val(a[1]); }); }
  function renderDemand() {
    var X = S.x || {}, h = '', obs = [];
    if (!Object.keys(X).length) { $('pf-demand').innerHTML = '<div class="card"><h2>No channel or rate reports loaded yet</h2><p class="sub">Load them on the Trading tab.</p></div>'; return; }

    if (X.company) {
      var c = X.company, T0 = c.total, ota = 0; c.rows.forEach(function (r) { if (/^(BOOK|EXPE)/.test(r.ref)) ota += r.rn; });
      var top = c.rows[0];
      h += '<div class="tiles">' + tile('Room nights, all sources', num(T0.rn), esc(c.period.replace('(Actual) ', ''))) + tile('Booking.com and Expedia', pc(ota / T0.rn), num(ota) + ' room nights') +
        tile('Largest single source', pc(top.rn / T0.rn), (KNOWN[top.ref.slice(0, 4)] || esc(top.ref))) + tile('Cancelled room nights', num(T0.lostNights), gbp(T0.lostRev) + ' estimated value') + tile('Sources with bookings', c.rows.length, '') + '</div>';
      h += '<div class="card"><h2>Where bookings come from</h2><p class="sub">Rezlynx Company report, ' + esc(c.period.replace('(Actual) ', '')) + ', revenue as reported (including VAT)' + src(c) + '</p><div class="scroll" style="max-height:470px"><table><tr><th>Source</th><th class="n">Arrivals</th><th class="n">Room nights</th><th class="n">Share</th><th class="n">Room rate</th><th class="n">Rooms revenue</th><th class="n">F&B on the bill</th><th class="n">F&B per night</th><th class="n">Booked ahead</th><th class="n">Nights per stay</th><th class="n">Cancelled nights</th></tr>' +
        c.rows.slice(0, 25).map(function (r) { return '<tr><td>' + coName(r.ref) + '</td><td class="n">' + num(r.arr) + '</td><td class="n">' + num(r.rn) + '</td><td class="n"><span class="bar-cell" style="width:' + Math.round(r.rn / T0.rn * 120) + 'px"></span>' + pc(r.rn / T0.rn) + '</td><td class="n">' + gbp(r.rate, 2) + '</td><td class="n">' + gbp(r.acc) + '</td><td class="n">' + gbp(r.fb) + '</td><td class="n">' + gbp(r.fb / r.rn, 2) + '</td><td class="n">' + r.lead.toFixed(0) + ' days</td><td class="n">' + r.stay.toFixed(2) + '</td><td class="n">' + num(r.lostNights) + '</td></tr>'; }).join('') +
        '<tr class="tot"><td>All sources</td><td class="n"></td><td class="n">' + num(T0.rn) + '</td><td class="n">100.0%</td><td class="n">' + gbp(T0.acc / T0.rn, 2) + '</td><td class="n">' + gbp(T0.acc) + '</td><td class="n">' + gbp(T0.fb) + '</td><td class="n">' + gbp(T0.fb / T0.rn, 2) + '</td><td class="n" colspan="2"></td><td class="n">' + num(T0.lostNights) + '</td></tr></table></div><p class="note">Top 25 of ' + c.rows.length + ' sources. The report lists reference codes only; names are shown where the code is unmistakable.</p></div>';
      obs.push(['bad', pc(ota / T0.rn) + ' of room nights come through Booking.com and Expedia', 'That is ' + num(ota) + ' room nights and ' + gbp(c.rows.filter(function (r) { return /^(BOOK|EXPE)/.test(r.ref); }).reduce(function (s2, r) { return s2 + r.acc; }, 0)) + ' of rooms revenue on which commission is paid. Every point of that business moved to the hotel’s own website keeps the commission. The Agent Commission report came back empty, so the commission cost itself is not yet visible in Rezlynx.']);
    }
    h += '<div class="grid g2">';
    if (X.segments) {
      var sg = X.segments, tr = sg.rows.reduce(function (s2, r) { return s2 + r.rooms; }, 0), ta = sg.rows.reduce(function (s2, r) { return s2 + r.acc; }, 0);
      h += '<div class="card"><h2>Market segments on the books</h2><p class="sub">' + dlabel(sg.from) + ' to ' + dlabel(sg.to) + ', ' + (sg.basis === 'gross' ? 'including VAT' : 'net') + src(sg) + '</p><div class="scroll"><table><tr><th>Segment code</th><th class="n">Rooms</th><th class="n">Share</th><th class="n">Rooms revenue</th><th class="n">Rate</th><th class="n">F&B and other</th><th class="n">Not yet confirmed</th></tr>' +
        sg.rows.map(function (r) { return '<tr><td><b>' + esc(r.seg) + '</b></td><td class="n">' + num(r.rooms) + '</td><td class="n">' + pc(r.rooms / tr) + '</td><td class="n">' + gbp(r.acc) + '</td><td class="n">' + gbp(r.rooms ? r.acc / r.rooms : null, 2) + '</td><td class="n">' + gbp(r.fb) + '</td><td class="n">' + num(r.reserved + r.allot) + '</td></tr>'; }).join('') +
        '<tr class="tot"><td>Total</td><td class="n">' + num(tr) + '</td><td class="n">100.0%</td><td class="n">' + gbp(ta) + '</td><td class="n">' + gbp(ta / tr, 2) + '</td><td class="n" colspan="2"></td></tr></table></div><p class="note">Codes are shown as set up in Rezlynx. “Not yet confirmed” = provisional, reserved and allotment rooms, which only become sales when picked up.</p></div>';
    }
    if (X.rates) {
      var ra = X.rates, fam = objRows(ra.byFamily, function (v) { return v.n; }), brd = objRows(ra.byBoard, function (v) { return v.n; });
      h += '<div class="card"><h2>Rates being sold</h2><p class="sub">Daily Rate Analysis, ' + esc(ra.range) + ': ' + num(ra.nights) + ' room nights at an average ' + gbp(ra.value / ra.nights, 2) + src(ra) + '</p><div class="scroll"><table><tr><th>Rate plan group</th><th class="n">Room nights</th><th class="n">Share</th><th class="n">Average rate</th></tr>' +
        fam.map(function (f) { return '<tr><td><b>' + esc(f[0]) + '</b></td><td class="n">' + num(f[1].n) + '</td><td class="n">' + pc(f[1].n / ra.nights) + '</td><td class="n">' + gbp(f[1].n ? f[1].v / f[1].n : null, 2) + '</td></tr>'; }).join('') + '</table><table style="margin-top:10px"><tr><th>Meal basis</th><th class="n">Room nights</th><th class="n">Share</th><th class="n">Average rate</th></tr>' +
        brd.map(function (f) { return '<tr><td>' + esc(f[0]) + '</td><td class="n">' + num(f[1].n) + '</td><td class="n">' + pc(f[1].n / ra.nights) + '</td><td class="n">' + gbp(f[1].n ? f[1].v / f[1].n : null, 2) + '</td></tr>'; }).join('') + '</table></div><p class="note">Rate plan group is the first part of the Rezlynx rate code (OTA_BB is grouped under OTA).</p></div>';
      var dbb = ra.byBoard['Dinner, bed and breakfast']; if (dbb) obs.push(['warn', 'Only ' + pc(dbb.n / ra.nights) + ' of room nights include dinner', num(dbb.n) + ' of ' + num(ra.nights) + ' room nights in ' + esc(ra.range) + ' are on a dinner-inclusive rate. Dinner packages on the website and at check-in are the direct route to more restaurant covers.']);
    }
    h += '</div><div class="grid g2">';
    if (X.cancels) {
      var cn = X.cancels, lm = Object.keys(cn.byMonth).sort(), late = (cn.byLead['On the day'] || { c: 0, lost: 0 }), l2 = (cn.byLead['1 to 2 days before'] || { c: 0, lost: 0 });
      var order = ['On the day', '1 to 2 days before', '3 to 7 days before', '8 to 30 days before', 'Over 30 days before'];
      h += '<div class="card"><h2>Cancellations</h2><p class="sub">' + num(cn.count) + ' cancellations, ' + dlabel(cn.from) + ' ' + cn.from.slice(0, 4) + ' to ' + dlabel(cn.to) + ' ' + cn.to.slice(0, 4) + '; estimated value ' + gbp(cn.lost) + src(cn) + '</p><div class="scroll"><table><tr><th>How close to arrival</th><th class="n">Cancellations</th><th class="n">Share</th><th class="n">Estimated value</th></tr>' +
        order.filter(function (k) { return cn.byLead[k]; }).map(function (k) { var v = cn.byLead[k]; return '<tr><td>' + k + '</td><td class="n">' + num(v.c) + '</td><td class="n">' + pc(v.c / cn.count) + '</td><td class="n">' + gbp(v.lost) + '</td></tr>'; }).join('') + '</table>' +
        '<table style="margin-top:10px"><tr><th>Booked through</th><th class="n">Cancellations</th><th class="n">Estimated value</th></tr>' + objRows(cn.byAgent, function (v) { return v.c; }).slice(0, 6).map(function (a) { return '<tr><td>' + coName(a[0]) + '</td><td class="n">' + num(a[1].c) + '</td><td class="n">' + gbp(a[1].lost) + '</td></tr>'; }).join('') + '</table></div><div class="chartbox" style="height:200px;margin-top:10px"><canvas id="tr-c2"></canvas></div><p class="note">Estimated value is Rezlynx’s figure for the cancelled booking; many cancelled rooms are resold, so it is not money lost.</p></div>';
      obs.push(['warn', num(late.c + l2.c) + ' bookings were cancelled within two days of arrival', 'Worth ' + gbp(late.lost + l2.lost) + ' at booked value, ' + num(late.c) + ' of them on the day itself. These are the hardest rooms to resell; check which rate plans allow free cancellation that late.']);
    }
    h += '<div>';
    if (X.noshows) {
      var ns = X.noshows, nf = objRows(ns.byFamily, function (v) { return v.c; });
      h += '<div class="card"><h2>No-shows</h2><p class="sub">' + num(ns.count) + ' no-show rooms on the report' + src(ns) + '</p><table><tr><th>Rate plan group</th><th class="n">No-shows</th><th class="n">Share</th></tr>' + nf.slice(0, 6).map(function (f) { return '<tr><td>' + esc(f[0]) + '</td><td class="n">' + num(f[1].c) + '</td><td class="n">' + pc(f[1].c / ns.count) + '</td></tr>'; }).join('') + '</table><p class="note">By arrival month: ' + Object.keys(ns.byMonth).sort().map(function (m) { return mlabel(m).slice(0, 3) + ' ' + ns.byMonth[m].c; }).join(' · ') + '.</p></div>';
      var pe = pePeriod('month'); var nsRev = pe ? (peGroup(pe, 'ACCOM').lines.filter(function (l) { return l[0] === 'NO_SHOW'; })[0] || [0, 0, 0])[2] : null;
      if (nf[0]) obs.push(['warn', pc(nf[0][1].c / ns.count) + ' of no-shows are on ' + esc(nf[0][0]) + ' rates', num(ns.count) + ' no-show rooms in total.' + (nsRev !== null ? ' No-show charges collected this month: ' + gbp(nsRev) + '.' : '') + ' Check that no-shows are being charged and reported back to the booking site.']);
    }
    if (X.overrides) {
      var ov = X.overrides, au = ov.byOp['Automatic (system)'], st = ov.byOp.Staff;
      h += '<div class="card"><h2>Rate overrides</h2><p class="sub">' + num(ov.count) + ' overrides applied ' + dlabel(ov.from) + ' to ' + dlabel(ov.to) + ' ' + ov.to.slice(0, 4) + ', including VAT' + src(ov) + '</p><table><tr><th></th><th class="n">Overrides</th><th class="n">Rate before</th><th class="n">Rate after</th><th class="n">Change</th></tr>' +
        (au ? '<tr><td>Applied automatically</td><td class="n">' + num(au.c) + '</td><td class="n">' + gbp(au.pre) + '</td><td class="n">' + gbp(au.post) + '</td><td class="n">' + gbp(au.diff) + ' (' + pc(au.diff / au.pre) + ')</td></tr>' : '') +
        (st ? '<tr><td>Applied by staff (' + ov.staffUsers + ' users)</td><td class="n">' + num(st.c) + '</td><td class="n">' + gbp(st.pre) + '</td><td class="n">' + gbp(st.post) + '</td><td class="n">' + gbp(st.diff) + '</td></tr>' : '') + '</table>' +
        '<table style="margin-top:10px"><tr><th>Rate plan</th><th class="n">Overrides</th><th class="n">Change</th><th class="n">% of rate</th></tr>' + objRows(ov.byPlan, function (v) { return -v.diff; }).filter(function (p) { return p[1].diff < 0; }).slice(0, 6).map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td class="n">' + num(p[1].c) + '</td><td class="n">' + gbp(p[1].diff) + '</td><td class="n">' + pc(p[1].diff / p[1].pre) + '</td></tr>'; }).join('') + '</table><p class="note">Staff user names are not stored here. Staff overrides in this period raised rates overall, which usually means prices keyed for groups or events.</p></div>';
      if (au && au.diff < 0) obs.push(['bad', 'Automatic overrides cut rates by ' + pc(-au.diff / au.pre) + ' in five days', num(au.c) + ' bookings between ' + dlabel(ov.from) + ' and ' + dlabel(ov.to) + ' had their rate reduced automatically, by ' + gbp(-au.diff) + ' in total. This pattern normally comes from discounts and promotions switched on with the booking sites, on top of commission. Confirm which promotions are active and whether they are intended.']);
    }
    h += '</div></div><div class="grid g2">';
    if (X.rooms) {
      var rm = X.rooms, ty = objRows(rm.byType, function (v) { return v.c; });
      h += '<div class="card"><h2>Rooms and room types</h2><p class="sub">' + rm.total + ' rooms on the Room Usage report: ' + Object.keys(rm.byStatus).map(function (k) { return rm.byStatus[k] + ' ' + k.toLowerCase(); }).join(', ') + src(rm) + '</p><table><tr><th>Room type</th><th class="n">Rooms</th><th class="n">Out of service now</th></tr>' + ty.map(function (t2) { return '<tr><td>' + esc(t2[1].desc || t2[0]) + ' <span style="color:#86847d">' + esc(t2[0]) + '</span></td><td class="n">' + t2[1].c + '</td><td class="n">' + (t2[1].oos || '–') + '</td></tr>'; }).join('') + '</table><p class="note">This report shows the room stock, not nights sold per type. Sales by room type need the Daily Rate Analysis displayed by room type, or the Occupancy report.</p></div>';
      var staff = window.HubStaff ? window.HubStaff() : [], nst = rm.oos.filter(function (o) { return staff.indexOf(o.id) !== -1; }).length;
      h += '<div class="card"><h2>Rooms out of service now</h2><p class="sub">' + rm.oos.length + ' rooms' + (nst ? ': ' + nst + ' staff rooms and ' + (rm.oos.length - nst) + ' others' : '') + src(rm) + ' · tick the rooms used by staff</p><div class="scroll" style="max-height:330px"><table><tr><th>Staff room</th><th>Room</th><th>Type</th><th>Out of service from</th><th>Back in service</th><th>Last guest left</th></tr>' + rm.oos.map(function (o) { return '<tr><td><label class="tick" title="Tick if this is a staff room"><input type="checkbox" data-staff="' + esc(o.id) + '"' + (staff.indexOf(o.id) !== -1 ? ' checked' : '') + '><span></span></label></td><td><b>' + esc(o.id) + '</b></td><td>' + esc(o.desc) + '</td><td>' + (o.since ? dlabel(o.since) + ' ' + o.since.slice(0, 4) : '–') + '</td><td>' + (o.until ? dlabel(o.until) + ' ' + o.until.slice(0, 4) : 'no date set') + '</td><td>' + (o.lastDep ? dlabel(o.lastDep) + ' ' + o.lastDep.slice(0, 4) : '–') + '</td></tr>'; }).join('') + '</table></div></div>';
      var longO = rm.oos.filter(function (o) { return staff.indexOf(o.id) === -1 && o.since && (Date.parse(rm.asOf.slice(0, 10)) - Date.parse(o.since)) / 864e5 > 30; });
      if (longO.length) obs.push(['bad', longO.length + ' room' + (longO.length > 1 ? 's have' : ' has') + ' an out-of-service date more than 30 days old', 'Room' + (longO.length > 1 ? 's ' : ' ') + longO.map(function (o) { return o.id; }).join(', ') + '. Check with maintenance whether these are still genuinely unavailable; each is a room that cannot be sold.']);
    }
    h += '</div>';
    if (X.blocks && X.blocks.months) {
      var bm = X.blocks.months, bk = Object.keys(bm).sort(function (a, b) { return Date.parse('1 ' + a) - Date.parse('1 ' + b); }), pn = 0, pl = [];
      h += '<div class="card"><h2>Group blocks held</h2><p class="sub">Block Forecast report, ' + bk.join(', ') + src(X.blocks) + '</p><table><tr><th>Month</th><th>Block</th><th>Group</th><th>Status</th><th>Dates</th><th class="n">Rooms a night</th><th class="n">Room nights held</th></tr>' + bk.map(function (mth) { return bm[mth].rows.map(function (b) { if (/Provisional/.test(b.status)) { pn += b.total; pl.push(esc(b.name) + ' (' + num(b.total) + ', ' + esc(mth) + ')'); } return '<tr><td>' + esc(mth) + '</td><td>' + esc(b.ref) + '</td><td><b>' + esc(b.name) + '</b></td><td><span class="pill ' + (/Provisional/.test(b.status) ? 'warn' : 'good') + '">' + esc(b.status) + '</span></td><td>' + (b.first === b.last ? b.first : b.first + ' to ' + b.last) + '</td><td class="n">' + Math.round(b.total / b.nights) + '</td><td class="n">' + num(b.total) + '</td></tr>'; }).join(''); }).join('') + '</table><p class="note">One export per month in Rezlynx; load each month you want to see.</p></div>';
      if (pn) obs.push(['warn', num(pn) + ' room nights are held for provisional groups', pl.join(', ') + '. Until they are confirmed these rooms are off sale to other guests; agree release dates.']);
    }
    $('pf-demand').innerHTML = '<div class="card"><h2>What these reports suggest</h2><p class="sub">Worked out automatically from the latest reports loaded · click an item to read it in full</p><div class="find2">' + obs.map(function (x) { return '<div class="finding ' + x[0] + '"><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('') + '</div></div>' + h +
      '<p class="note">Guest names in the Rezlynx reports are not stored: each report is reduced to totals when it is loaded. To refresh, load new exports on the Trading tab.</p>';
    if (X.cancels && $('tr-c2')) { var mm = Object.keys(X.cancels.byMonth).sort(); if (chart2) chart2.destroy(); chart2 = new Chart($('tr-c2'), { type: 'bar', data: { labels: mm.map(function (m) { return MN[+m.slice(5) - 1] + ' ' + m.slice(2, 4); }), datasets: [{ data: mm.map(function (m) { return X.cancels.byMonth[m].c; }), backgroundColor: '#eb6834', borderRadius: 3, maxBarThickness: 26 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Cancellations by month cancelled', align: 'start', font: { weight: '500' } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#ebe9e3', drawTicks: false }, border: { display: false } } } } }); }
  }
  var chart2 = null;

  window.Trading = { resetMonth: function () { month = null; }, feedPanel: feedPanel, tri: tri, avgTiles: avgTiles, S: function () { return S; }, agg: agg, rowsFor: rowsFor, asOfDay: asOfDay, observations: observations, ROOMS: ROOMS, net: net, pePeriod: pePeriod, peGroup: peGroup };
  if (window.Profit && window.Profit.register) { window.Profit.register('trading', render); window.Profit.register('demand', renderDemand); }
})();
