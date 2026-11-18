/* HosBUSINESS — Guestline API feed.
   Reads closed trading days from the HosPRO feed (a private cloud function) and lays them over the
   Trading store, so past days come straight from Guestline with no emails or exports.
   Future nights still come from the emailed Actual & Forecast until the bookings feed is added.
   Holds no credentials: it uses the name and password typed at the hub sign-in, once, to get a 12-hour token. */
(function (root) {
  'use strict';
  var URL = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/glData';
  var TKEY = 'hosbusiness_gl_token';
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var info = { status: 'off', note: 'Guestline API not connected', days: 0, from: null, to: null };
  var pendingLogin = null, tokenWait = null, cache = null;

  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function shift(d, n) { var t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function dow(d) { return DOW[new Date(d + 'T12:00:00Z').getUTCDay()]; }
  function getToken() { try { var t = root.sessionStorage.getItem(TKEY); if (!t) return null; return (+t.split('.')[0]) * 1000 > Date.now() + 60000 ? t : null; } catch (e) { return null; } }
  function setToken(t) { try { if (t) root.sessionStorage.setItem(TKEY, t); else root.sessionStorage.removeItem(TKEY); } catch (e) {} }

  /* One feed day -> the row and daily record the Trading pages already use.
     Rooms revenue follows Actual & Forecast: the accommodation group less room hire.
     "Other" is room hire, conference, miscellaneous and sundries. Everything is net of VAT. */
  function toRow(x, old) {
    var hire = (x.c && x.c.ROOM_HIRE) || 0;
    var r = old ? JSON.parse(JSON.stringify(old)) : { d: x.d, dow: dow(x.d), listed: x.so, indv: x.so, multi: 0, blocks: 0, ad: x.sl, ch: 0, arr: null, dep: null };
    r.d = x.d; r.dow = r.dow || dow(x.d);
    r.rooms = x.so; r.occPct = x.pct; r.acc = r2(x.g.A - hire); r.fb = r2(x.g.F + x.g.B); r.oth = r2(hire + x.g.C + x.g.M + x.g.S);
    r.roos = x.oo; r.dfs = x.df; r.stock = x.st; r.src = 'api';
    return r;
  }
  function toDaily(x) {
    return { rooms: x.so, occ: x.pct, accom: x.g.A, bev: x.g.B, conf: x.g.C, food: x.g.F, misc: x.g.M, sund: x.g.S, net: x.net,
      deposits: x.dep, ledger: x.led, inhouse: x.ih, paid: x.paid, src: 'api' };
  }

  /* Lay the feed over the store S. Safe to call again after any other source has merged. */
  function apply(S, data) {
    if (!S || !data || !data.days || !data.days.length) return 0;
    var days = data.days.filter(function (x) { return x.ok !== false && x.d; });
    if (!days.length) return 0;
    S.daily = S.daily || {}; S.x = S.x || {};
    if (S.af && S.af.basis !== 'net') {            // never mix gross and net
      (S.af.rows || []).forEach(function (r) { r.acc = r2(r.acc / 1.2); r.fb = r2(r.fb / 1.2); r.oth = r2(r.oth / 1.2); });
      S.af.basis = 'net';
    }
    var last = days[days.length - 1], have = {};
    ((S.af && S.af.rows) || []).forEach(function (r) { have[r.d] = r; });
    var gl = { from: days[0].d, to: last.d, built: data.built, byDay: {} }, brk = {};
    days.forEach(function (x) {
      have[x.d] = toRow(x, have[x.d]);
      S.daily[x.d] = toDaily(x);
      gl.byDay[x.d] = { codes: x.c || {}, seg: x.as || {}, media: x.am || {}, roomsBySeg: x.os || {}, sleepers: x.sl, adr: x.adr, stock: x.st, till: x.tl || null, period: x.p };
      if (x.bk) brk[shift(x.d, 1)] = x.bk;          // breakfasts are eaten the morning after the trading day they are posted in
    });
    /* "As of" is the later of the emailed report and the last day Guestline closed, so closed days always count as actual.
       emailAsOf keeps the date of the emailed forecast, which still supplies the nights ahead. */
    var emailAsOf = S.af ? (S.af.emailAsOf || S.af.asOf) : null, asOf = emailAsOf && emailAsOf > last.cl ? emailAsOf : last.cl;
    S.af = { asOf: asOf, emailAsOf: emailAsOf, basis: 'net', rows: Object.keys(have).sort().map(function (k) { return have[k]; }), apiTo: last.d };
    S.gl = gl;

    /* month to date for the month of the last closed day, only when every day from the 1st is present */
    var m = last.d.slice(0, 7), md = days.filter(function (x) { return x.d.slice(0, 7) === m; });
    if (md.length === +last.d.slice(8) && md[0].d.slice(8) === '01') {
      var rev = { accom: 0, bev: 0, conf: 0, food: 0, misc: 0, sund: 0 };
      md.forEach(function (x) { rev.accom += x.g.A; rev.bev += x.g.B; rev.conf += x.g.C; rev.food += x.g.F; rev.misc += x.g.M; rev.sund += x.g.S; });
      Object.keys(rev).forEach(function (k) { rev[k] = r2(rev[k]); });
      S.eodMtd = { asOf: last.cl, to: last.d, rev: rev, src: 'api' };
    }

    /* food and drink by day, in the shape the Food & beverage page uses */
    var P = S.x.postings = S.x.postings || { byDay: {} }; P.byDay = P.byDay || {};
    days.forEach(function (x) {
      var c = x.c || {}, o = P.byDay[x.d] || {}, b = brk[x.d];
      o.lun = r2((c.RES1_LUN || 0) + (c.BAR1_LUN || 0)); o.din = r2((c.RES1_DIN || 0) + (c.BAR1_DIN || 0));
      o.bev = x.g.B; o.rs = c.RS_FOOD || 0; o.oth = r2(x.g.F - o.lun - o.din - o.rs - (c.RES1_BRK || 0)); o.cov = o.cov || 0;
      if (b) { o.bi = b[0]; o.biv = b[1]; o.bp = b[2]; o.bpv = b[3]; }
      o.src = 'api'; P.byDay[x.d] = o;
    });
    var nb = shift(last.d, 1);                      // the latest morning's breakfasts sit on the day after the last closed day
    if (brk[nb]) { var q = P.byDay[nb] || {}; q.bi = brk[nb][0]; q.biv = brk[nb][1]; q.bp = brk[nb][2]; q.bpv = brk[nb][3]; q.src = 'api'; P.byDay[nb] = q; }
    return days.length;
  }

  function chip() {
    var c = root.document && root.document.getElementById('feed-chip'); if (!c || info.status === 'off') return;
    c.className = 'feed-chip ' + info.status; c.textContent = info.note; c.title = 'Figures for closed days come straight from Guestline';
  }
  function label(d) { var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return +d.slice(8) + ' ' + M[+d.slice(5, 7) - 1]; }

  function signIn(u, p) {
    tokenWait = root.fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u: u, p: p }) })
      .then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok && j.token) { setToken(j.token); return j.token; } setToken(null); return null; })
      .catch(function () { return null; });
    return tokenWait;
  }
  /* Fetch the feed and lay it over the Trading store. Resolves to the number of days applied (0 if unavailable). */
  function load() {
    var T = root.Trading; if (!T || !T.S) return Promise.resolve(0);
    return Promise.resolve(tokenWait).then(function () {
      var t = getToken();
      if (!t) { info = { status: 'warn', note: 'Sign out and in again for live Guestline figures', days: 0 }; chip(); return 0; }
      return root.fetch(URL, { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' }).then(function (r) {
        if (r.status === 401) { setToken(null); throw new Error('expired'); }
        if (!r.ok) throw new Error('feed ' + r.status);
        return r.json();
      }).then(function (data) {
        cache = data;
        var n = apply(T.S(), data);
        if (!n) { info = { status: 'warn', note: 'Guestline API: no days loaded yet', days: 0 }; chip(); return 0; }
        if (T.resetMonth) T.resetMonth();
        info = { status: data.lastOk === false ? 'warn' : 'ok', note: 'Guestline API · to ' + label(data.to) + (data.loading ? ' · loading history' : ''), days: n, from: data.from, to: data.to, built: data.built, loading: !!data.loading };
        chip(); return n;
      });
    }).catch(function (e) { info = { status: 'bad', note: e && e.message === 'expired' ? 'Sign out and in again for live Guestline figures' : 'Guestline API could not be read', days: 0 }; chip(); return 0; });
  }
  /* Re-apply the last download after another source (the emailed reports) has merged. */
  function reapply() { var T = root.Trading; return cache && T && T.S ? apply(T.S(), cache) : 0; }

  if (root.document) {
    /* Catch the name and password as they are typed at the hub sign-in; use them only if the hub accepts them. */
    root.document.addEventListener('submit', function (e) {
      var f = e.target; if (!f || !f.classList || !f.classList.contains('pf-login') || !f.u || !f.p) return;
      pendingLogin = { u: f.u.value.trim().toLowerCase(), p: f.p.value.trim() };
    }, true);
    root.document.addEventListener('hub-signin', function () { if (pendingLogin) { signIn(pendingLogin.u, pendingLogin.p); pendingLogin = null; } }, true);
    var so = function (e) { if (e.target && e.target.id === 'signout') setToken(null); };
    root.document.addEventListener('click', so, true);
  }
  var api = { load: load, apply: apply, reapply: reapply, signIn: signIn, info: function () { return info; }, toRow: toRow, toDaily: toDaily };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GuestlineFeed = api;
})(typeof window !== 'undefined' ? window : this);
