/* ARIA core — v1 (26 Nov 2026)
   One definition of every metric, and the tools ARIA answers through.
   The same file runs in the ARIA cloud function (Node) and in the browser preview.
   It never talks to the network itself: it is handed a data source (DS) with these async methods:
     days()            -> { days:[glData day], to, built }          closed trading days from Guestline
     forward()         -> { rows:[A&F row], asOf, source }          nights on the books (Actual & Forecast)
     items(date)       -> { items:[{c,d,e,by,q,n,g}] } | null       item lines for one closed day
     tills()           -> { terms:{name:{meal,place,from,to,qty,gross,adj,net,items:[[name,qty,gross,adj,net]]}}, asOf } | null
     mealplan()        -> { rows:[{d,ro,bb,dbb,total,breakfasts,dinners,guests}], asOf } | null
     comp()            -> { nights:[{date, hotels:{id:{rate,name?}}}], ts } | null
     flash()           -> Manager's Flash object | null
   Rules carried over from HosBUSINESS (as shown live on 26 Nov 2026): occupancy, RevPAR and TRevPAR on 114 lettable rooms
   (120 rooms less 5 staff rooms and 1 storage room); occupancy on all 120 also given; revenue net of VAT; rooms revenue = accommodation
   group less room hire (Actual & Forecast basis); ADR = rooms revenue / rooms sold;
   breakfasts belong to the morning after the trading day they are posted in. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AriaCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HOTEL = { id: 'brandon-hall', name: 'Brandon Hall Hotel & Spa', rooms: 120, lettable: 114, tz: 'Europe/London' };
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- metric catalogue: what each figure means, said once ---------- */
  var METRICS = {
    revenue: { label: 'Total revenue', unit: 'gbp', def: 'All departments, net of VAT, for the trading day (End of Day basis).' },
    roomsRevenue: { label: 'Rooms revenue', unit: 'gbp', def: 'Accommodation group less room hire, net of VAT (Actual & Forecast basis).' },
    fb: { label: 'F&B revenue', unit: 'gbp', def: 'Food plus beverage analysis groups, net of VAT.' },
    food: { label: 'Food', unit: 'gbp', def: 'Food analysis group, net of VAT.' },
    beverage: { label: 'Beverage', unit: 'gbp', def: 'Beverage analysis group, net of VAT.' },
    other: { label: 'Other revenue', unit: 'gbp', def: 'Room hire, conference, miscellaneous and sundries, net of VAT.' },
    roomsSold: { label: 'Rooms sold', unit: 'n', def: 'Occupied rooms for the night (Guestline End of Day).' },
    occ: { label: 'Occupancy', unit: 'pct', def: 'Rooms sold ÷ 114 lettable rooms (120 less 5 staff rooms and 1 storage room), as HosBUSINESS shows it.' },
    occ120: { label: 'Occupancy on all 120', unit: 'pct', def: 'Rooms sold ÷ all 120 rooms, the basis of the management accounts.' },
    occGL: { label: 'Occupancy (Guestline)', unit: 'pct', def: 'Guestline\'s own figure, on rooms available after out-of-service and deducted rooms.' },
    adr: { label: 'ADR', unit: 'gbp', def: 'Rooms revenue ÷ rooms sold.' },
    revpar: { label: 'RevPAR', unit: 'gbp', def: 'Rooms revenue ÷ 114 lettable rooms.' },
    trevpar: { label: 'TRevPAR', unit: 'gbp', def: 'Total revenue ÷ 114 lettable rooms.' },
    sleepers: { label: 'Guests', unit: 'n', def: 'Sleepers in house for the night.' },
    oos: { label: 'Out of service', unit: 'n', def: 'Rooms out of service that night.' },
    breakfasts: { label: 'Breakfasts', unit: 'n', def: 'Included breakfasts eaten that morning (posted the trading day before).' },
    onBooks: { label: 'Rooms on the books', unit: 'n', def: 'Rooms booked for a future night, from the 06:00 Actual & Forecast; includes held group block rooms.' },
    projected: { label: 'Projected rooms', unit: 'n', def: 'Six-month average of final rooms sold for the same weekday, the HosBUSINESS projection; never below what is already on the books.' }
  };

  /* ---------- small helpers ---------- */
  function r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
  function num(n) { n = Number(n); return isFinite(n) ? n : 0; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var t = new Date(s + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return iso(t); }
  function dow(s) { return DOW[new Date(s + 'T12:00:00Z').getUTCDay()]; }
  function label(s) { return dow(s) + ' ' + Number(s.slice(8)) + ' ' + MON[Number(s.slice(5, 7)) - 1]; }
  function shortLabel(s) { return Number(s.slice(8)) + ' ' + MON[Number(s.slice(5, 7)) - 1]; }
  function todayLondon(now) {
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: HOTEL.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return f.format(now || new Date());
  }
  function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function within(s, a, b) { return s >= a && s <= b; }
  function sum(rows, k) { return r2(rows.reduce(function (t, r) { return t + num(r[k]); }, 0)); }
  function gbp(n) { if (n === null || n === undefined || !isFinite(n)) return '—'; var v = Math.round(n); return (v < 0 ? '-£' : '£') + Math.abs(v).toLocaleString('en-GB'); }
  function gbp2(n) { if (n === null || n === undefined || !isFinite(n)) return '—'; return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return n === null || n === undefined || !isFinite(n) ? '—' : (Math.round(n * 10) / 10).toFixed(1) + '%'; }

  /* ---------- one closed Guestline day -> ARIA's day facts ---------- */
  function dayFacts(x) {
    var g = x.g || {}, c = x.c || {}, hire = num(c.ROOM_HIRE);
    var roomsRev = r2(num(g.A) - hire), sold = num(x.so), net = num(x.net);
    var food = g.F === undefined ? null : r2(g.F), bev = g.B === undefined ? null : r2(g.B);
    return {
      d: x.d, dow: dow(x.d), closedOn: x.cl || null,
      revenue: r2(net), roomsRevenue: roomsRev, accomGroup: r2(g.A || 0),
      fb: g.FB !== undefined ? r2(g.FB) : r2(num(g.F) + num(g.B)), food: food, beverage: bev,
      other: r2(hire + num(g.C) + num(g.M) + num(g.S)),
      roomsSold: sold, occ: r2(sold / HOTEL.lettable * 100), occ120: r2(sold / HOTEL.rooms * 100), occGL: x.pct === undefined ? null : r2(x.pct),
      adr: sold ? r2(roomsRev / sold) : null, revpar: r2(roomsRev / HOTEL.lettable), trevpar: r2(net / HOTEL.lettable),
      sleepers: x.sl === undefined ? null : num(x.sl), oos: x.oo === undefined ? null : num(x.oo), dfs: x.df === undefined ? null : num(x.df),
      breakfastsIncluded: x.bk ? num(x.bk[0]) : null, breakfastsPaid: x.bk ? num(x.bk[2]) : null,
      breakfastsServed: x.bks != null ? num(x.bks) : x.bk ? num(x.bk[0]) + num(x.bk[2]) : null,
      lunch: r2(num(c.RES1_LUN) + num(c.BAR1_LUN)), dinner: r2(num(c.RES1_DIN) + num(c.BAR1_DIN)),
      breakfastSales: r2(num(c.RES1_BRK)), roomService: r2(num(c.RS_FOOD) + num(c.RS_BEV))
    };
  }
  function totals(rows) {
    var n = rows.length, sold = sum(rows, 'roomsSold'), rr = sum(rows, 'roomsRevenue'), rev = sum(rows, 'revenue');
    var hasFood = rows.every(function (r) { return r.food !== null; });
    return {
      nights: n, revenue: rev, roomsRevenue: rr, fb: sum(rows, 'fb'),
      food: hasFood ? sum(rows, 'food') : null, beverage: hasFood ? sum(rows, 'beverage') : null, other: sum(rows, 'other'),
      roomsSold: sold, occ: n ? r2(sold / (HOTEL.lettable * n) * 100) : null, occ120: n ? r2(sold / (HOTEL.rooms * n) * 100) : null,
      adr: sold ? r2(rr / sold) : null, revpar: n ? r2(rr / (HOTEL.lettable * n)) : null, trevpar: n ? r2(rev / (HOTEL.lettable * n)) : null,
      sleepers: rows.every(function (r) { return r.sleepers !== null; }) ? sum(rows, 'sleepers') : null
    };
  }

  /* ---------- outlets from analysis codes ---------- */
  function outletOf(code) {
    code = String(code || '');
    if (/^RES1BEV|^REST_BEV/.test(code)) return 'Restaurant drinks';
    if (/^RES1_BRK/.test(code)) return 'Breakfast';
    if (/^RES1_/.test(code)) return 'Restaurant food';
    if (/^BAR1BEV|^BAR_BER|^SOFT_BEV/.test(code)) return 'Bar drinks';
    if (/^BAR1_/.test(code)) return 'Bar food';
    if (/^RS_/.test(code)) return 'Room service';
    if (/^FUN_|^CON_|^BAR2/.test(code)) return 'Events and functions';
    if (/^AFT_TEA/.test(code)) return 'Afternoon tea';
    if (/^ACCOM|^ROOM_HIRE|^NO_SHOW|^UPGRADE|^CANCEL/.test(code)) return 'Rooms';
    return 'Other';
  }

  /* ---------- range helpers ---------- */
  function closedRange(days, from, to) { return days.filter(function (x) { return within(x.d, from, to); }).map(dayFacts); }
  function lastClosed(days) { return days.length ? days[days.length - 1].d : null; }
  function periodBounds(period, days, today, from, to) {
    var last = lastClosed(days) || addDays(today, -1);
    var y = last.slice(0, 4), m = last.slice(0, 7);
    switch (period) {
      case 'yesterday': case 'last_night': return { from: last, to: last, label: label(last) };
      case 'last_7_days': return { from: addDays(last, -6), to: last, label: 'Last 7 nights to ' + shortLabel(last) };
      case 'week_to_date': {
        var wd = new Date(last + 'T12:00:00Z').getUTCDay(), back = (wd + 6) % 7;
        return { from: addDays(last, -back), to: last, label: 'Week to date (Mon to ' + shortLabel(last) + ')' };
      }
      case 'month_to_date': return { from: m + '-01', to: last, label: MON[Number(m.slice(5)) - 1] + ' to ' + shortLabel(last) };
      case 'last_month': {
        var first = m + '-01', prevLast = addDays(first, -1), pm = prevLast.slice(0, 7);
        return { from: pm + '-01', to: prevLast, label: MON[Number(pm.slice(5)) - 1] + ' ' + pm.slice(0, 4) };
      }
      case 'year_to_date': return { from: y + '-01-01', to: last, label: 'Year to ' + shortLabel(last) };
      default: return { from: validDate(from) ? from : last, to: validDate(to) ? to : last, label: shortLabel(validDate(from) ? from : last) + ' to ' + shortLabel(validDate(to) ? to : last) };
    }
  }

  /* projection: six-month weekday average of final rooms sold (HosBUSINESS v27 model) */
  function dowAverages(days, upTo) {
    var start = addDays(upTo, -183), acc = {};
    days.forEach(function (x) {
      if (x.d <= upTo && x.d > start) { var k = dow(x.d); (acc[k] = acc[k] || []).push(num(x.so)); }
    });
    var out = {}; Object.keys(acc).forEach(function (k) { var a = acc[k]; if (a.length >= 2) out[k] = Math.round(a.reduce(function (s, v) { return s + v; }, 0) / a.length); });
    out._weeks = Math.max.apply(null, Object.keys(acc).map(function (k) { return acc[k].length; }).concat([0]));
    return out;
  }

  /* ---------- views (what the results panel draws; built from data, never from AI wording) ---------- */
  function kpis(title, items, meta) { return Object.assign({ type: 'kpis', title: title, items: items }, meta || {}); }
  function table(title, columns, rows, meta) { return Object.assign({ type: 'table', title: title, columns: columns, rows: rows }, meta || {}); }
  function chart(kind, title, x, series, fmt, meta) { return Object.assign({ type: kind, title: title, x: x, series: series, fmt: fmt }, meta || {}); }

  /* ---------- tools ---------- */
  function makeTools(DS, opts) {
    opts = opts || {};
    var now = opts.now || new Date();
    var cache = {};
    function get(name) { if (!cache[name]) cache[name] = Promise.resolve(DS[name] ? DS[name]() : null).catch(function (e) { if (e && e.code === 401) throw e; return null; }); return cache[name]; }
    function today() { return todayLondon(now); }

    var tools = {};

    tools.trading_summary = {
      description: 'Revenue, rooms sold, occupancy, ADR, RevPAR, F&B and other revenue for closed trading days (actuals from Guestline). Use for "last night", "yesterday", "this week", "month to date", "last month", "year to date" or any past dates.',
      params: { period: { type: 'string', enum: ['yesterday', 'last_7_days', 'week_to_date', 'month_to_date', 'last_month', 'year_to_date', 'custom'], description: 'Which period' }, from: { type: 'string', description: 'YYYY-MM-DD, only for custom' }, to: { type: 'string', description: 'YYYY-MM-DD, only for custom' } },
      required: ['period'],
      run: function (a) {
        return get('days').then(function (D) {
          var days = (D && D.days) || [];
          if (!days.length) return { error: 'No closed trading days available from Guestline.' };
          var b = periodBounds(a.period, days, today(), a.from, a.to);
          var rows = closedRange(days, b.from, b.to);
          if (!rows.length) return { error: 'No closed days between ' + b.from + ' and ' + b.to + '. Guestline data runs ' + days[0].d + ' to ' + lastClosed(days) + '.' };
          var t = totals(rows);
          var have = {}; rows.forEach(function (r) { have[r.d] = 1; });
          var missing = []; for (var dd = b.from; dd <= b.to && missing.length < 400; dd = addDays(dd, 1)) if (!have[dd]) missing.push(dd);
          var meta = { source: 'Guestline End of Day' + (missing.length ? ' · ' + missing.length + ' night' + (missing.length > 1 ? 's' : '') + ' missing from the feed' : ''), asOf: lastClosed(days) };
          var view = kpis(b.label, [
            { label: 'Revenue', value: gbp(t.revenue), sub: 'net of VAT' },
            { label: 'Rooms sold', value: String(t.roomsSold), sub: (rows.length > 1 ? 'room nights' : 'of 114 lettable') },
            { label: 'Occupancy', value: pct(t.occ), sub: 'on 114 lettable · ' + pct(t.occ120) + ' on 120' },
            { label: 'ADR', value: gbp2(t.adr) },
            { label: 'RevPAR', value: gbp2(t.revpar) },
            { label: 'Rooms revenue', value: gbp(t.roomsRevenue) },
            { label: 'F&B', value: gbp(t.fb), sub: t.food !== null ? 'food ' + gbp(t.food) + ' · drink ' + gbp(t.beverage) : '' },
            { label: 'Other', value: gbp(t.other), sub: 'hire, conference, sundries' }
          ], meta);
          var views = [view];
          if (rows.length > 1 && rows.length <= 62) {
            views.push(chart('bar', 'Revenue by night', rows.map(function (r) { return shortLabel(r.d); }), [{ name: 'Rooms', values: rows.map(function (r) { return r.roomsRevenue; }) }, { name: 'F&B', values: rows.map(function (r) { return r.fb; }) }, { name: 'Other', values: rows.map(function (r) { return r.other; }) }], 'gbp', Object.assign({ stacked: true }, meta)));
            views.push(table('Night by night', [
              { key: 'night', label: 'Night' }, { key: 'rooms', label: 'Rooms', align: 'r' }, { key: 'occ', label: 'Occ', align: 'r' },
              { key: 'adr', label: 'ADR', align: 'r' }, { key: 'fb', label: 'F&B', align: 'r' }, { key: 'rev', label: 'Revenue', align: 'r' }],
              rows.map(function (r) { return { night: label(r.d), rooms: String(r.roomsSold), occ: pct(r.occ), adr: gbp2(r.adr), fb: gbp(r.fb), rev: gbp(r.revenue) }; }), meta));
          }
          return {
            period: b, totals: t,
            nights: rows.length <= 31 ? rows.map(function (r) { return { d: r.d, dow: r.dow, revenue: r.revenue, roomsSold: r.roomsSold, occ: r.occ, adr: r.adr, roomsRevenue: r.roomsRevenue, fb: r.fb, food: r.food, beverage: r.beverage, other: r.other, breakfastsServed: r.breakfastsServed }; }) : undefined,
            breakfastsServed: rows.every(function (r) { return r.breakfastsServed !== null; }) ? rows.reduce(function (t, r) { return t + r.breakfastsServed; }, 0) : null,
            missingNights: missing.length ? missing : undefined, warning: missing.length ? 'Totals exclude ' + missing.length + ' night(s) with no closed data: ' + missing.slice(0, 10).join(', ') + (missing.length > 10 ? '…' : '') + '. Say so in the answer.' : undefined,
            source: meta.source, lastClosedDay: meta.asOf, _views: views
          };
        });
      }
    };

    tools.forward_nights = {
      description: 'Future nights on the books: rooms booked, occupancy on 114 lettable rooms, rooms revenue and F&B already booked, adults and children, group block rooms, plus the projected final rooms from the weekday trend, and breakfasts and dinners from the meal plan where available. Use for "next 7 days", "next week", "December", "occupancy on 11 Dec", forecasts.',
      params: { from: { type: 'string', description: 'YYYY-MM-DD, first night' }, to: { type: 'string', description: 'YYYY-MM-DD, last night' } },
      required: ['from', 'to'],
      run: function (a) {
        return Promise.all([get('forward'), get('days'), get('mealplan')]).then(function (res) {
          var F = res[0], D = res[1], MP = res[2];
          var from = validDate(a.from) ? a.from : today(), to = validDate(a.to) ? a.to : addDays(from, 6);
          if (to < from) { var t = to; to = from; from = t; }
          var rows = ((F && F.rows) || []).filter(function (r) { return within(r.d, from, to); });
          if (!rows.length) return { error: 'No nights on the books between ' + from + ' and ' + to + '. The Actual & Forecast covers ' + (F && F.rows && F.rows.length ? F.rows[0].d + ' to ' + F.rows[F.rows.length - 1].d : 'no dates') + '.' };
          var days = (D && D.days) || [], last = lastClosed(days) || addDays(today(), -1);
          var avg = dowAverages(days, last);
          var mp = {}; ((MP && MP.rows) || []).forEach(function (r) { mp[r.d] = r; });
          var out = rows.map(function (r) {
            var rooms = num(r.rooms), proj = avg[dow(r.d)] !== undefined ? Math.max(rooms, avg[dow(r.d)]) : null, m = mp[r.d];
            return { d: r.d, dow: dow(r.d), onBooks: rooms, occ: r2(rooms / HOTEL.lettable * 100), projected: proj, projectedOcc: proj === null ? null : r2(proj / HOTEL.lettable * 100),
              roomsRevenue: r2(num(r.acc)), fb: r2(num(r.fb)), blocks: num(r.blocks), adults: num(r.ad), children: num(r.ch), arrivals: r.arr === undefined ? null : num(r.arr), departures: r.dep === undefined ? null : num(r.dep),
              breakfasts: m ? m.breakfasts : null, dinners: m ? m.dinners : null, past: r.d <= last };
          });
          var meta = { source: 'Guestline Actual & Forecast' + (F && F.asOf ? ' (' + String(F.asOf).replace('T', ' ').slice(0, 16) + ')' : ''), asOf: F && F.asOf };
          var onB = sum(out, 'onBooks'), n = out.length;
          var views = [
            kpis(shortLabel(from) + ' to ' + shortLabel(to) + ' · on the books', [
              { label: 'Rooms on the books', value: String(onB), sub: n + ' nights' },
              { label: 'Occupancy on the books', value: pct(onB / (HOTEL.lettable * n) * 100), sub: 'on 114 lettable' },
              { label: 'Projected occupancy', value: out.every(function (r) { return r.projected !== null; }) ? pct(sum(out, 'projected') / (HOTEL.lettable * n) * 100) : '—', sub: 'weekday trend' },
              { label: 'Rooms revenue booked', value: gbp(sum(out, 'roomsRevenue')) },
              { label: 'Block rooms held', value: String(sum(out, 'blocks')) },
              (function () { var have = out.filter(function (r) { return r.breakfasts !== null; }); return { label: 'Breakfasts booked', value: have.length ? String(have.reduce(function (s, r) { return s + r.breakfasts; }, 0)) : '—', sub: !have.length ? 'meal plan not loaded for these dates' : have.length < out.length ? 'nights to ' + shortLabel(have[have.length - 1].d) + ' only' : 'for the following mornings' }; })()
            ], meta),
            chart('bar', 'Occupancy by night', out.map(function (r) { return r.dow + ' ' + Number(r.d.slice(8)); }), [{ name: 'On the books', values: out.map(function (r) { return r.occ; }) }, { name: 'Projected', values: out.map(function (r) { return r.projectedOcc; }) }], 'pct', meta),
            table('Night by night', [
              { key: 'night', label: 'Night' }, { key: 'rooms', label: 'On books', align: 'r' }, { key: 'occ', label: 'Occ', align: 'r' }, { key: 'proj', label: 'Projected', align: 'r' },
              { key: 'blocks', label: 'Blocks', align: 'r' }, { key: 'rr', label: 'Rooms £', align: 'r' }, { key: 'bk', label: 'Breakfasts next am', align: 'r' }],
              out.map(function (r) { return { night: label(r.d), rooms: String(r.onBooks), occ: pct(r.occ), proj: r.projected === null ? '—' : r.projected + ' (' + pct(r.projectedOcc) + ')', blocks: String(r.blocks), rr: gbp(r.roomsRevenue), bk: r.breakfasts === null ? '—' : String(r.breakfasts) }; }), meta)
          ];
          return { from: from, to: to, nights: out.slice(0, 62), truncated: out.length > 62, source: meta.source, note: 'On the books includes group block rooms not yet named. Projected = average final rooms for the same weekday over the last ' + (avg._weeks >= 26 ? 'six months' : avg._weeks + ' weeks of closed days') + ', never below the books. Breakfasts are those booked for the following morning.', _views: views };
        });
      }
    };

    tools.fb_sales = {
      description: 'Food and drink sold on one closed trading day by outlet (restaurant, bar, breakfast, room service, events) and the best-selling items, from Guestline postings. Use for "what did we sell last night", "restaurant takings", "bar sales", "top dishes".',
      params: { date: { type: 'string', description: 'YYYY-MM-DD trading day; omit for the last closed day' }, outlet: { type: 'string', description: 'Optional: restaurant, bar, breakfast, room service, events' } },
      required: [],
      run: function (a) {
        return get('days').then(function (D) {
          var days = (D && D.days) || [], date = validDate(a.date) ? a.date : lastClosed(days);
          if (!date) return { error: 'No closed days yet.' };
          return Promise.resolve(DS.items ? DS.items(date) : null).catch(function (e) { if (e && e.code === 401) throw e; return null; }).then(function (I) {
            var lines = (I && I.items) || [];
            var meta = { source: 'Guestline postings for ' + label(date), asOf: date };
            if (!lines.length) {
              var x = days.filter(function (k) { return k.d === date; })[0];
              if (!x) return { error: 'No trading data for ' + date + '.' };
              var f = dayFacts(x), split = f.lunch + f.dinner + f.breakfastSales + f.roomService > 0;
              var ks = [{ label: 'Food', value: gbp(f.food) }, { label: 'Drink', value: gbp(f.beverage) }, { label: 'F&B total', value: gbp(f.fb) }];
              if (split) ks = ks.concat([{ label: 'Lunch', value: gbp(f.lunch) }, { label: 'Dinner', value: gbp(f.dinner) }, { label: 'Breakfast', value: gbp(f.breakfastSales) }]);
              return { date: date, food: f.food, beverage: f.beverage, fb: f.fb, byMeal: split ? { lunch: f.lunch, dinner: f.dinner, breakfast: f.breakfastSales, roomService: f.roomService } : undefined,
                note: 'Item-by-item lines are not available for this day, so outlets and dishes cannot be shown; these are the department totals. For dishes by till, use the till report.', _views: [kpis('F&B · ' + label(date), ks, meta)] };
            }
            var by = {}, items = {};
            lines.forEach(function (l) {
              var o = outletOf(l.c); if (o === 'Rooms') return;
              by[o] = r2((by[o] || 0) + num(l.n));
              var k = o + '|' + (l.d || l.c); var it = items[k] || (items[k] = { item: l.d || l.c, outlet: o, qty: 0, net: 0 });
              it.qty += num(l.q); it.net = r2(it.net + num(l.n));
            });
            var want = String(a.outlet || '').toLowerCase();
            var list = Object.keys(items).map(function (k) { return items[k]; }).filter(function (it) { return !want || it.outlet.toLowerCase().indexOf(want) !== -1; }).sort(function (p, q) { return q.net - p.net; });
            var outlets = Object.keys(by).map(function (k) { return { outlet: k, net: by[k] }; }).sort(function (p, q) { return q.net - p.net; });
            var total = r2(outlets.reduce(function (s, o) { return s + o.net; }, 0));
            return {
              date: date, totalFB: total, byOutlet: outlets, topItems: list.slice(0, 15), note: 'Net of VAT. The bar till posts some food under restaurant codes until Guestline remaps it.',
              _views: [
                chart('bar', 'Sales by outlet · ' + label(date), outlets.map(function (o) { return o.outlet; }), [{ name: 'Net sales', values: outlets.map(function (o) { return o.net; }) }], 'gbp', Object.assign({ horizontal: true }, meta)),
                table('Best sellers' + (want ? ' · ' + a.outlet : ''), [{ key: 'item', label: 'Item' }, { key: 'outlet', label: 'Outlet' }, { key: 'qty', label: 'Qty', align: 'r' }, { key: 'net', label: 'Net', align: 'r' }],
                  list.slice(0, 15).map(function (it) { return { item: it.item, outlet: it.outlet, qty: String(it.qty), net: gbp2(it.net) }; }), meta)
              ]
            };
          });
        });
      }
    };

    tools.till_sales = {
      description: 'Food sales by till terminal and meal period (Restaurant or Bar till, Lunch or Dinner) with the top dishes on each till, from the tills\' PLU sales report (month to date, exported by hand). Use for "till", "terminal", "lunch on the bar till", "which dish sells best".',
      params: { terminal: { type: 'string', description: 'Optional filter, e.g. "Bar", "Restaurant", "Dinner"' } },
      required: [],
      run: function (a) {
        return get('tills').then(function (T) {
          if (!T || !T.terms) return { error: 'No till report loaded.' };
          var names = Object.keys(T.terms), want = String(a.terminal || '').toLowerCase();
          var terms = names.map(function (k) { var t = T.terms[k]; return { terminal: k, meal: t.meal, place: t.place, from: t.from, to: t.to, qty: t.qty, net: r2(t.net), discounts: r2(t.adj), top: (t.items || []).slice(0, 5).map(function (i) { return { item: i[0], qty: i[1], net: r2(i[4]) }; }) }; })
            .filter(function (t) { return !want || t.terminal.toLowerCase().indexOf(want) !== -1; });
          var from = terms.length ? terms[0].from : '', to = terms.length ? terms[0].to : '';
          var meta = { source: 'Till PLU sales report, ' + (from ? shortLabel(from) + ' to ' + shortLabel(to) : ''), asOf: to };
          var allItems = {};
          names.forEach(function (k) { (T.terms[k].items || []).forEach(function (i) { var e = allItems[i[0]] || (allItems[i[0]] = { item: i[0], qty: 0, net: 0 }); e.qty += num(i[1]); e.net = r2(e.net + num(i[4])); }); });
          var best = Object.keys(allItems).map(function (k) { return allItems[k]; }).sort(function (p, q) { return q.net - p.net; }).slice(0, 10);
          return { period: { from: from, to: to }, terminals: terms, bestSellersAllTills: best, note: 'Food only, month to date, net of VAT; open tabs can change these figures.',
            _views: [chart('bar', 'Food sales by till', terms.map(function (t) { return t.terminal; }), [{ name: 'Net', values: terms.map(function (t) { return t.net; }) }], 'gbp', Object.assign({ horizontal: true }, meta)),
              table('Best sellers across the tills', [{ key: 'item', label: 'Dish' }, { key: 'qty', label: 'Qty', align: 'r' }, { key: 'net', label: 'Net', align: 'r' }], best.map(function (b) { return { item: b.item, qty: String(b.qty), net: gbp(b.net) }; }), meta)] };
        });
      }
    };

    tools.breakfasts = {
      description: 'Breakfasts and dinners by morning or night from the meal plan (room only, B&B, DBB), with adults and children. Use for "how many breakfasts next week", "dinners booked", "covers expected".',
      params: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['from', 'to'],
      run: function (a) {
        return get('mealplan').then(function (MP) {
          var rows = ((MP && MP.rows) || []).filter(function (r) { return within(r.d, a.from, a.to); });
          if (!rows.length) return { error: 'The meal plan on file covers ' + (MP && MP.rows && MP.rows.length ? MP.rows[0].d + ' to ' + MP.rows[MP.rows.length - 1].d : 'no dates') + '; nothing between ' + a.from + ' and ' + a.to + '. A new Meal Plan export from Rezlynx extends it.' };
          var meta = { source: 'Rezlynx Meal Plan export' + (MP.asOf ? ' (' + String(MP.asOf).slice(0, 10) + ')' : ''), asOf: MP.asOf };
          var out = rows.map(function (r) { return { d: r.d, dow: dow(r.d), rooms: r.total && r.total.rm, guests: r.guests, breakfasts: r.breakfasts, dinners: r.dinners, bb: r.bb && r.bb.rm, dbb: r.dbb && r.dbb.rm, ro: r.ro && r.ro.rm }; });
          return { nights: out, totals: { breakfasts: sum(out, 'breakfasts'), dinners: sum(out, 'dinners') }, note: 'Breakfasts = adults and children on B&B and DBB (infants free). The row date is the night; its breakfasts are eaten the next morning.',
            _views: [chart('bar', 'Breakfasts and dinners booked', out.map(function (r) { return r.dow + ' ' + Number(r.d.slice(8)); }), [{ name: 'Breakfasts', values: out.map(function (r) { return r.breakfasts; }) }, { name: 'Dinners', values: out.map(function (r) { return r.dinners; }) }], 'n', meta),
              table('By night', [{ key: 'night', label: 'Night' }, { key: 'rooms', label: 'Rooms', align: 'r' }, { key: 'guests', label: 'Guests', align: 'r' }, { key: 'b', label: 'Breakfasts', align: 'r' }, { key: 'dn', label: 'Dinners', align: 'r' }],
                out.map(function (r) { return { night: label(r.d), rooms: String(r.rooms), guests: String(r.guests), b: String(r.breakfasts), dn: String(r.dinners) }; }), meta)] };
        });
      }
    };

    tools.comp_rates = {
      description: 'Competitor rates by night from the HosREV rate shopper (Google Hotels), with the median of the comp set. Use for "what is my comp set doing", "rival rates next week", "are we cheaper".',
      params: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['from', 'to'],
      run: function (a) {
        return get('comp').then(function (C) {
          var nights = ((C && C.nights) || []).filter(function (n) { return within(n.date, a.from, a.to); });
          if (!nights.length) return { error: 'No shopped competitor rates for ' + a.from + ' to ' + a.to + (C && C.nights && C.nights.length ? '; the last shop covers ' + C.nights[0].date + ' to ' + C.nights[C.nights.length - 1].date : '; the rate shopper has no current data (its monthly quota resets on 1 December)') + '.' };
          var hotels = {};
          nights.forEach(function (n) { Object.keys(n.hotels || {}).forEach(function (k) { hotels[k] = (n.hotels[k] && n.hotels[k].name) || k; }); });
          var ids = Object.keys(hotels);
          var meta = { source: 'HosREV rate shopper' + (C.ts ? ' (' + String(C.ts).slice(0, 10) + ')' : ''), asOf: C.ts };
          var rows = nights.map(function (n) {
            var rates = ids.map(function (k) { return n.hotels[k] && +n.hotels[k].rate || null; });
            var v = rates.filter(function (x) { return x; }).sort(function (p, q) { return p - q; });
            var med = v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null;
            return { d: n.date, rates: rates, median: med };
          });
          var cols = [{ key: 'night', label: 'Night' }].concat(ids.map(function (k, i) { return { key: 'h' + i, label: hotels[k], align: 'r' }; })).concat([{ key: 'med', label: 'Median', align: 'r' }]);
          return { hotels: ids.map(function (k) { return hotels[k]; }), nights: rows.slice(0, 31).map(function (r) { var o = { d: r.d, median: r.median }; ids.forEach(function (k, i) { o[hotels[k]] = r.rates[i]; }); return o; }), source: meta.source,
            _views: [chart('line', 'Rival rates by night', rows.map(function (r) { return shortLabel(r.d); }), ids.map(function (k, i) { return { name: hotels[k], values: rows.map(function (r) { return r.rates[i]; }) }; }).concat([{ name: 'Median', values: rows.map(function (r) { return r.median; }), strong: true }]), 'gbp', meta),
              table('Rates by night', cols, rows.map(function (r) { var o = { night: label(r.d), med: gbp(r.median) }; r.rates.forEach(function (v, i) { o['h' + i] = gbp(v); }); return o; }), meta)] };
        });
      }
    };

    tools.metric_definitions = {
      description: 'How ARIA defines each figure (occupancy, ADR, RevPAR, rooms revenue, projections). Use when asked how something is worked out.',
      params: {}, required: [],
      run: function () { return Promise.resolve({ hotel: HOTEL, metrics: METRICS }); }
    };

    return tools;
  }

  /* compact a tool result for the AI: drop the views (the panel gets those directly) */
  function forModel(res) { var o = {}; Object.keys(res || {}).forEach(function (k) { if (k !== '_views') o[k] = res[k]; }); return o; }

  function instructions(opts) {
    opts = opts || {};
    var t = todayLondon(opts.now), wd = new Date(t + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
    return [
      'You are ARIA, the hotel intelligence assistant inside HosPRO for ' + HOTEL.name + ' (' + HOTEL.rooms + ' rooms, ' + HOTEL.lettable + ' lettable). Today is ' + wd + ' ' + t + ' (UK).',
      'Answer questions about the hotel using ONLY the tools. Call the tools first; never guess or invent a figure. If the tools cannot answer, say exactly what is missing.',
      'Dates: "last night" or "yesterday" = the last closed trading day. "Next week" = next Monday to Sunday. "Next 7 days" = today plus six nights. A month name means that whole month. Use YYYY-MM-DD in tool calls.',
      'When you are done, reply with ONLY one JSON object, no other text:',
      '{"answer": string, "points": [{"label": string, "value": string, "note": string}], "show": [string], "basis": string}',
      'answer: one plain sentence under 25 words with the key figure. points: 2 to 6 rows of hard figures copied exactly from tool results (label = date, metric or item; value = the figure; note optional, under 12 words). show: the view ids to display, most useful first (each tool result lists its view ids). basis: one short line on the source and date of the figures.',
      'Style: UK English, plain, specific, like a revenue manager\'s note to the GM. No "I", no hype, no hedging words, no exclamation marks, no markdown. Money as £ with commas; occupancy as % on 114 lettable rooms (the HosBUSINESS headline); give the figure on all 120 only when asked.'
    ].join('\n');
  }

  return { HOTEL: HOTEL, METRICS: METRICS, makeTools: makeTools, forModel: forModel, instructions: instructions, dayFacts: dayFacts, totals: totals, outletOf: outletOf, periodBounds: periodBounds, todayLondon: todayLondon, addDays: addDays, label: label, fmt: { gbp: gbp, gbp2: gbp2, pct: pct } };
});
