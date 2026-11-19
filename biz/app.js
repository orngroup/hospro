/* HosBIZ — mobile companion for Brandon Hall. Reads the same glData function as HosBUSINESS. */
(function () {
  'use strict';

  var API = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/glData';
  var TKEY = 'hosbiz_token';
  var UKEY = 'hosbiz_user';
  var ROOMS = 120;

  var ROLES = {
    'Raj Kumar':  { init: 'RK', role: 'Global COO' },
    'Ajay Kawa':  { init: 'AK', role: 'Chief Commercial Officer' },
    'Alia Taub':  { init: 'AT', role: 'Leadership Focus' }
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k);
          if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
    catch (e) { return null; }
  }
  function fmtGBP(n) { if (n == null || !isFinite(n)) return '–'; return '£' + Math.round(n).toLocaleString('en-GB'); }
  function fmtGBP2(n) { if (n == null || !isFinite(n)) return '–'; return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtPct(n) { if (n == null || !isFinite(n)) return '–'; return n.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
  function fmtInt(n) { if (n == null || !isFinite(n)) return '–'; return Math.round(n).toLocaleString('en-GB'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function parseDay(s) { return new Date(s + 'T12:00:00Z'); }
  function shift(s, n) { var d = parseDay(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function dowShort(s) { return DOW[parseDay(s).getUTCDay()]; }
  function labelShort(s) { var d = parseDay(s); return DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
  function labelLong(s) { var d = parseDay(s); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function monthLabel(s) { var d = parseDay(s + '-01'); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function sum(arr, f) { var t = 0; for (var i = 0; i < arr.length; i++) t += (f(arr[i]) || 0); return t; }

  /* ---------- token ---------- */
  function getToken() {
    var t = ls(TKEY); if (!t) return null;
    try { return (+t.split('.')[0]) * 1000 > Date.now() + 60000 ? t : null; } catch (e) { return null; }
  }

  /* ---------- derivations ---------- */
  function roomsRev(x) { var hire = (x.c && x.c.ROOM_HIRE) || 0; var A = (x.g && x.g.A) || 0; return A - hire; }
  function fbRev(x) { var g = x.g || {}; return (g.F || 0) + (g.B || 0); }
  function otherRev(x) { var g = x.g || {}, hire = (x.c && x.c.ROOM_HIRE) || 0; return hire + (g.C || 0) + (g.M || 0) + (g.S || 0); }
  function totalRev(x) { return roomsRev(x) + fbRev(x) + otherRev(x); }
  function isClosed(x) { return !!x.cl; }

  /* ---------- state ---------- */
  var S = {
    data: null,          // raw { built, days }
    byDay: {},           // d -> record
    closedDays: [],      // sorted ascending list of closed day strings
    forwardDays: [],     // sorted ascending list of non-closed day strings (today onward)
    latestClosed: null,
    today: null,
    range: 'y',
    view: 'today',
    stale: false,
    off: false
  };

  function indexData(data) {
    S.data = data; S.byDay = {}; S.closedDays = []; S.forwardDays = [];
    (data.days || []).forEach(function (x) {
      if (!x || !x.d) return;
      S.byDay[x.d] = x;
      if (isClosed(x)) S.closedDays.push(x.d); else S.forwardDays.push(x.d);
    });
    S.closedDays.sort(); S.forwardDays.sort();
    S.latestClosed = S.closedDays.length ? S.closedDays[S.closedDays.length - 1] : null;
    S.today = S.latestClosed ? shift(S.latestClosed, 1) : (S.forwardDays[0] || null);
    S.stale = false;
    if (data.built) {
      var age = Date.now() - new Date(data.built).getTime();
      S.stale = age > 26 * 3600 * 1000;
    }
    S.off = false;
  }

  /* ---------- range resolution ---------- */
  function rangeSpan() {
    if (!S.latestClosed) return null;
    var end = S.latestClosed, start;
    if (S.range === 'y') { start = end; }
    else if (S.range === '7') { start = shift(end, -6); }
    else if (S.range === '28') { start = shift(end, -27); }
    else if (S.range === 'mtd') { start = end.slice(0, 8) + '01'; }
    else if (S.range === 'lm') {
      var d = parseDay(end + ''); d.setUTCDate(1); d.setUTCDate(0); // last day of prior month
      end = iso(d); d.setUTCDate(1); start = iso(d);
    }
    return { start: start, end: end };
  }
  function rangeLabel() {
    var s = rangeSpan(); if (!s) return '';
    if (S.range === 'y') return labelLong(s.end);
    return labelShort(s.start) + ' – ' + labelShort(s.end);
  }
  function rangeDays() {
    var s = rangeSpan(); if (!s) return [];
    var out = [], c = s.start;
    while (c <= s.end) {
      var x = S.byDay[c]; if (x && isClosed(x)) out.push(x);
      c = shift(c, 1);
    }
    return out;
  }

  /* ---------- aggregate ---------- */
  function totals(days) {
    var r = sum(days, roomsRev), fb = sum(days, fbRev), oth = sum(days, otherRev);
    var sold = sum(days, function (d) { return d.so || 0; });
    var nights = days.length;
    var avail = ROOMS * nights;
    return {
      nights: nights, sold: sold, avail: avail,
      occ: avail ? (sold / avail) * 100 : 0,
      rooms: r, fb: fb, other: oth, total: r + fb + oth,
      food: sum(days, function (d) { return (d.g && d.g.F) || 0; }),
      bev: sum(days, function (d) { return (d.g && d.g.B) || 0; }),
      adr: sold ? r / sold : 0,
      revpar: nights ? r / (ROOMS * nights) : 0,
      trevpar: nights ? (r + fb + oth) / (ROOMS * nights) : 0,
      bkInRate: sum(days, function (d) { return (d.bk && d.bk[0]) || 0; }),
      bkPaid: sum(days, function (d) { return (d.bk && d.bk[2]) || 0; }),
      bkPaidRev: sum(days, function (d) { return (d.bk && d.bk[3]) || 0; })
    };
  }

  /* ---------- forward helpers ---------- */
  function forwardRecord(d) {
    var x = S.byDay[d]; if (!x) return null;
    return { d: d, so: x.so || 0, rev: roomsRev(x), total: totalRev(x) };
  }
  function forwardSpan(start, days) {
    var out = [], c = start;
    for (var i = 0; i < days; i++) {
      var x = S.byDay[c]; if (x) out.push(x);
      c = shift(c, 1);
    }
    return out;
  }
  function monthSpan(ym) {
    // ym = "YYYY-MM"; sums every day present in feed for that month (closed + forward)
    var d = parseDay(ym + '-01'), month = d.getUTCMonth();
    var out = [], c = iso(d);
    while (c.slice(0, 7) === ym) {
      var x = S.byDay[c]; if (x) out.push(x);
      c = shift(c, 1);
    }
    return out;
  }

  /* ---------- render pieces ---------- */
  function tile(label, value, detail) {
    return '<div class="tile"><div class="l">' + label + '</div><div class="v">' + value + '</div>' +
      (detail ? '<div class="d">' + detail + '</div>' : '') + '</div>';
  }
  function heroBlock(label, when, value, sub) {
    return '<div class="hero"><div class="hl">' + label + '</div>' +
      (when ? '<div class="when">' + when + '</div>' : '') +
      '<div class="rev">' + value + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }

  /* ---------- views ---------- */
  function viewToday() {
    var days = rangeDays();
    if (!days.length) return '<div class="empty">No closed days in this range yet.</div>';
    var t = totals(days);
    var h = heroBlock(
      'Revenue – ' + chipLabel(S.range),
      rangeLabel(),
      fmtGBP(t.rooms + t.fb + t.other),
      fmtPct(t.occ) + ' occupancy &middot; ' + fmtInt(t.sold) + ' rooms sold'
    );
    var g = '<div class="grid2">' +
      tile('Occupancy', fmtPct(t.occ), fmtInt(t.sold) + ' of ' + fmtInt(t.avail) + ' nights') +
      tile('ADR', fmtGBP2(t.adr), 'Rooms revenue per room sold') +
      tile('RevPAR', fmtGBP2(t.revpar), 'Rooms rev &divide; ' + ROOMS + ' rooms') +
      tile('TRevPAR', fmtGBP2(t.trevpar), 'Total rev &divide; ' + ROOMS + ' rooms') +
      tile('F&amp;B revenue', fmtGBP(t.fb), 'Food + beverage') +
      tile('Other revenue', fmtGBP(t.other), 'Room hire, conference, misc') +
      '</div>';

    // Forward look — always as of 07:00 report
    var fwd = forwardLook();
    return h + g + '<div class="section-h">What&rsquo;s next</div>' + fwd;
  }

  function forwardLook() {
    if (!S.today) return '';
    var tonight = S.byDay[S.today];
    var nxt7 = forwardSpan(shift(S.today, 1), 7);
    var mthDays = monthSpan(S.today.slice(0, 7));
    var mthSold = sum(mthDays, function (x) { return x.so || 0; });
    var mthAvail = ROOMS * mthDays.length;
    var mthRooms = sum(mthDays, roomsRev);
    var t7sold = sum(nxt7, function (x) { return x.so || 0; });
    var t7rev = sum(nxt7, roomsRev);
    var tonSold = tonight ? (tonight.so || 0) : 0;
    var tonRev = tonight ? roomsRev(tonight) : 0;

    return '<div class="fwd"><h3>On the books</h3>' +
      '<div class="row"><div class="a">Tonight (' + labelShort(S.today) + ')</div>' +
        '<div class="b">' + fmtInt(tonSold) + ' <small>rooms</small> &middot; ' + fmtGBP(tonRev) + '</div></div>' +
      '<div class="row"><div class="a">Next 7 nights</div>' +
        '<div class="b">' + fmtInt(t7sold) + ' <small>rooms</small> &middot; ' + fmtGBP(t7rev) + '</div></div>' +
      '<div class="row"><div class="a">' + monthLabel(S.today.slice(0, 7)) + ' held</div>' +
        '<div class="b">' + fmtInt(mthSold) + ' <small>of ' + fmtInt(mthAvail) + '</small> &middot; ' + fmtGBP(mthRooms) + '</div></div>' +
      '</div>';
  }

  function viewFB() {
    var days = rangeDays();
    if (!days.length) return '<div class="empty">No closed days in this range yet.</div>';
    var t = totals(days);
    var perOcc = t.sold ? t.fb / t.sold : 0;
    var foodPct = t.fb ? (t.food / t.fb) * 100 : 0;
    var bevPct = t.fb ? (t.bev / t.fb) * 100 : 0;
    var bkTotal = t.bkInRate + t.bkPaid;
    var h = heroBlock(
      'F&amp;B revenue – ' + chipLabel(S.range),
      rangeLabel(),
      fmtGBP(t.fb),
      fmtGBP2(perOcc) + ' per occupied room'
    );
    var g = '<div class="grid2">' +
      tile('Food revenue', fmtGBP(t.food), fmtPct(foodPct) + ' of F&amp;B') +
      tile('Beverage revenue', fmtGBP(t.bev), fmtPct(bevPct) + ' of F&amp;B') +
      tile('Food %', fmtPct(foodPct), 'Share of F&amp;B') +
      tile('Beverage %', fmtPct(bevPct), 'Share of F&amp;B') +
      tile('Breakfasts served', fmtInt(bkTotal), fmtInt(t.bkInRate) + ' in rate &middot; ' + fmtInt(t.bkPaid) + ' paid') +
      tile('Nights in view', fmtInt(t.nights), fmtInt(t.sold) + ' rooms sold') +
      '</div>';
    return h + g;
  }

  function viewOTB() {
    if (!S.today) return '<div class="empty">No forward data yet.</div>';
    var nxt7 = forwardSpan(shift(S.today, 1), 7);
    var sold7 = sum(nxt7, function (x) { return x.so || 0; });
    var rev7 = sum(nxt7, roomsRev);
    var h = heroBlock(
      'Next 7 nights',
      labelShort(shift(S.today, 1)) + ' – ' + labelShort(shift(S.today, 7)),
      fmtInt(sold7) + ' <span style="font-size:18px;font-weight:600;color:#52514e">rooms</span>',
      fmtGBP(rev7) + ' rooms revenue on the books'
    );

    // 14-night list
    var rows = '';
    for (var i = 0; i < 14; i++) {
      var d = shift(S.today, i); // include tonight as first row
      var x = S.byDay[d];
      var so = x ? (x.so || 0) : 0;
      var adr = so ? roomsRev(x) / so : null;
      var marker = (i === 0 ? '<small style="color:#86847d;font-weight:500"> &middot; tonight</small>' : '');
      rows += '<div class="row"><div class="a">' + labelShort(d) + marker + '</div>' +
        '<div class="b">' + (so ? fmtInt(so) : '–') + ' <small>rooms</small> &middot; ' + (so ? fmtGBP2(adr) : '–') + ' <small>ADR</small></div></div>';
    }
    var list = '<div class="fwd"><h3>Next 14 nights</h3>' + rows + '</div>';

    // Monthly table
    var mthHtml = '<div class="fwd" style="background:#fff;color:#1a1a1a;border:1px solid #e4e2dc"><h3 style="color:#86847d">By month</h3>';
    var baseMonth = S.today.slice(0, 7);
    for (var m = 0; m < 6; m++) {
      var ym = shiftMonth(baseMonth, m);
      var md = monthSpan(ym);
      if (!md.length) continue;
      var mSold = sum(md, function (x) { return x.so || 0; });
      var mRooms = sum(md, roomsRev);
      var mAvail = ROOMS * md.length;
      var mOcc = mAvail ? (mSold / mAvail) * 100 : 0;
      mthHtml += '<div class="row" style="border-bottom-color:#e4e2dc">' +
        '<div class="a" style="color:#52514e;font-weight:600">' + monthLabel(ym) + '</div>' +
        '<div class="b" style="color:#1a2b47;font-size:14px">' +
          fmtInt(mSold) + ' <small style="color:#86847d">rms</small> &middot; ' +
          fmtPct(mOcc) + ' &middot; ' +
          fmtGBP(mRooms) +
        '</div></div>';
    }
    mthHtml += '</div>';

    return h + list + '<div class="section-h">On the books by month</div>' + mthHtml;
  }

  function shiftMonth(ym, n) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + pad(m + 1);
  }

  function chipLabel(r) {
    return r === 'y' ? 'Yesterday' : r === '7' ? 'Last 7 days' : r === '28' ? 'Last 28 days'
      : r === 'mtd' ? 'Month to date' : r === 'lm' ? 'Last month' : '';
  }

  /* ---------- feed strip ---------- */
  function paintFeed() {
    var el = $('feed'); if (!el) return;
    el.className = 'feed-strip';
    if (S.off) {
      el.classList.add('off');
      el.textContent = 'Not connected — tap to retry';
      el.onclick = loadData;
    } else if (S.stale && S.data && S.data.built) {
      el.classList.add('stale');
      el.textContent = 'Last updated ' + relTime(S.data.built) + ' — may be stale';
      el.onclick = loadData;
    } else if (S.data && S.data.built) {
      el.textContent = 'Live · updated ' + relTime(S.data.built);
      el.onclick = loadData;
    } else {
      el.textContent = 'Checking feed…';
      el.onclick = null;
    }
  }
  function relTime(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return 'recently';
    var m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    var days = Math.round(h / 24);
    return days + ' d ago';
  }

  /* ---------- paint ---------- */
  function paint() {
    paintFeed();
    if (!S.data) return;
    var html = S.view === 'fb' ? viewFB() : S.view === 'otb' ? viewOTB() : viewToday();
    $('main').innerHTML = html;
    window.scrollTo(0, 0);
  }

  /* ---------- networking ---------- */
  function loadData() {
    var t = getToken();
    if (!t) { showSignIn(); return; }
    $('feed').className = 'feed-strip';
    $('feed').textContent = 'Refreshing…';
    fetch(API, { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { ls(TKEY, null); throw new Error('auth'); }
        if (!r.ok) throw new Error('http');
        return r.json();
      })
      .then(function (j) { indexData(j); paint(); })
      .catch(function (e) {
        if (e && e.message === 'auth') { showSignIn(); return; }
        S.off = true; paintFeed();
      });
  }

  /* ---------- sign-in / out ---------- */
  var selectedUser = null;

  function showSignIn() {
    document.body.classList.remove('ready');
    selectedUser = null;
    Array.prototype.forEach.call(document.querySelectorAll('.lg-user'), function (b) { b.classList.remove('on'); });
    $('pwform').style.display = 'none';
    $('pw').value = '';
    $('err').textContent = '';
  }

  function showApp() {
    var u = ls(UKEY) || '';
    var info = ROLES[u] || { init: (u.slice(0, 1) || '').toUpperCase(), role: '' };
    $('who').textContent = u || '';
    $('avatar').textContent = info.init;
    $('s-name').textContent = u || '';
    $('s-role').textContent = info.role;
    document.body.classList.add('ready');
  }

  function doSignIn(ev) {
    if (ev) ev.preventDefault();
    if (!selectedUser) return;
    var pw = $('pw').value || '';
    if (!pw) { $('err').textContent = 'Enter the password to continue'; return; }
    var btn = $('go');
    btn.disabled = true; btn.textContent = 'Signing in…';
    $('err').textContent = '';
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ u: selectedUser, p: pw })
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        btn.disabled = false; btn.textContent = 'Sign in';
        if (j && j.ok && j.token) {
          ls(TKEY, j.token); ls(UKEY, selectedUser);
          showApp(); loadData();
        } else {
          $('err').textContent = 'Name or password not recognised';
        }
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Sign in';
        $('err').textContent = 'Could not reach the server. Try again.';
      });
  }

  function doSignOut() {
    ls(TKEY, null); ls(UKEY, null);
    S.data = null; S.byDay = {}; S.closedDays = []; S.forwardDays = [];
    closeSheet();
    showSignIn();
  }

  /* ---------- sheet ---------- */
  function openSheet() { $('sheet').classList.add('on'); }
  function closeSheet() { $('sheet').classList.remove('on'); }

  /* ---------- wiring ---------- */
  function wire() {
    // User chips
    Array.prototype.forEach.call(document.querySelectorAll('.lg-user'), function (b) {
      b.addEventListener('click', function () {
        selectedUser = b.getAttribute('data-u');
        Array.prototype.forEach.call(document.querySelectorAll('.lg-user'), function (o) { o.classList.remove('on'); });
        b.classList.add('on');
        $('pwform').style.display = '';
        setTimeout(function () { $('pw').focus(); }, 60);
      });
    });
    $('pwform').addEventListener('submit', doSignIn);

    // Range chips
    Array.prototype.forEach.call(document.querySelectorAll('#chips .chip'), function (b) {
      b.addEventListener('click', function () {
        S.range = b.getAttribute('data-r');
        Array.prototype.forEach.call(document.querySelectorAll('#chips .chip'), function (o) { o.classList.remove('on'); });
        b.classList.add('on');
        paint();
      });
    });

    // Bottom nav
    Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) {
      b.addEventListener('click', function () {
        S.view = b.getAttribute('data-v');
        Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (o) { o.classList.remove('on'); });
        b.classList.add('on');
        paint();
      });
    });

    // Account sheet
    $('avatar').addEventListener('click', openSheet);
    $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) closeSheet(); });
    $('s-close').addEventListener('click', closeSheet);
    $('s-refresh').addEventListener('click', function () { closeSheet(); loadData(); });
    $('s-out').addEventListener('click', doSignOut);
  }

  /* ---------- boot ---------- */
  function boot() {
    wire();
    var t = getToken(), u = ls(UKEY);
    if (t && u && ROLES[u]) { showApp(); loadData(); }
    else { showSignIn(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
