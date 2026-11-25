/* =====================================================================
   THE CLARENDON CLUB — shared rules engine + service
   Brandon Hall Hotel & Spa · HosPRO
   ---------------------------------------------------------------------
   One copy of the business rules, used in two places:
     • club-functions/ (Cloud Functions, live)  — store = Firestore
     • club-api.js demo mode (browser preview)   — store = localStorage
   Keep the copy in club-functions/ identical to this file.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ClubService = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY = 86400000;
  const DEFAULTS = {
    programme: 'The Clarendon Club',
    earnPct: 5,              // % of the amount paid returned as credit
    welcomeAmount: 5,        // £ welcome voucher on joining
    welcomeDays: 30,         // welcome voucher validity
    creditDays: 60,          // each credit amount is valid this many days from the visit it was earned
    creditNextVisit: true,   // earned credit can be spent from the next day, not on the same bill
    maxBill: 5000,           // sanity limit on a single bill
    voidMinutes: 30,         // staff may void their own transaction within this window
    autoLockSeconds: 90      // waiter tablet signs the waiter out after this idle time
  };

  /* ---------- helpers ---------- */
  const r2 = x => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const gbp = x => '£' + r2(x).toFixed(2);
  const fmtDay = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  function dayKey(ts) { const p = fmtDay.formatToParts(new Date(ts)); const g = t => p.find(x => x.type === t).value; return g('year') + '-' + g('month') + '-' + g('day'); }
  function londonMidnight(dateStr) {
    const t = Date.parse(dateStr + 'T00:00:00Z');
    for (const g of [t, t - 3600000, t + 3600000]) if (dayKey(g) === dateStr && dayKey(g - 1) !== dateStr) return g;
    return t;
  }
  function nextDayStart(ts) { return londonMidnight(dayKey(ts + DAY)); }
  function addDaysKey(key, n) { const d = new Date(Date.parse(key + 'T12:00:00Z') + n * DAY); return d.toISOString().slice(0, 10); }
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n || 120);
  const normEmail = e => clean(e, 160).toLowerCase();
  const normMobile = m => { let d = String(m || '').replace(/[^\d+]/g, ''); if (d.startsWith('+44')) d = '0' + d.slice(3); if (d.startsWith('44') && d.length === 12) d = '0' + d.slice(2); return d.replace(/\D/g, ''); };
  /* identical to clockHash() in HosPEOPLE / hostime.html — staff sign in with their HosTIME clock-in PIN */
  function clockHash(pin, code) { const s = String(code).toLowerCase() + ':' + String(pin) + ':bhclock'; let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(16); }
  class ClubError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  const fail = (code, msg) => { throw new ClubError(code, msg); };

  /* ---------- credit lots ----------
     Every amount a member holds is a "lot": the welcome voucher, credit earned on a
     visit, or a manager adjustment. Each lot has its own expiry, so 60-day validity
     is exact. Spending uses the lot that expires soonest first. */
  function lotState(l, now) {
    if (l.remaining <= 0.0049) return 'used';
    if (now >= l.expires) return 'expired';
    if (now < l.availableFrom) return 'pending';
    return 'active';
  }
  function balances(m, now) {
    let available = 0, pending = 0, voucher = 0, credit = 0, soon = null;
    const vouchers = [];
    for (const l of m.lots || []) {
      const st = lotState(l, now);
      if (st === 'active') {
        available += l.remaining;
        if (l.type === 'welcome') { voucher += l.remaining; vouchers.push({ label: 'Welcome voucher', amount: r2(l.remaining), expires: l.expires }); }
        else credit += l.remaining;
        if (!soon || l.expires < soon.date) soon = { amount: l.remaining, date: l.expires };
        else if (soon && dayKey(l.expires) === dayKey(soon.date)) soon.amount += l.remaining;
      } else if (st === 'pending') pending += l.remaining;
    }
    return { available: r2(available), pending: r2(pending), voucher: r2(voucher), credit: r2(credit), vouchers,
      expiringNext: soon ? { amount: r2(soon.amount), date: soon.date } : null };
  }
  function expireLots(m, now) {
    let amt = 0;
    for (const l of m.lots || []) if (l.remaining > 0.0049 && now >= l.expires) { amt += l.remaining; l.expiredAmount = r2(l.remaining); l.remaining = 0; }
    // keep the member document small: drop lots spent or expired more than a year ago
    m.lots = (m.lots || []).filter(l => l.remaining > 0.0049 || now - l.expires < 365 * DAY);
    return r2(amt);
  }
  function consume(m, amount, now) {
    let left = r2(amount); const used = [];
    const lots = (m.lots || []).filter(l => lotState(l, now) === 'active').sort((a, b) => a.expires - b.expires);
    for (const l of lots) { if (left <= 0) break; const take = r2(Math.min(l.remaining, left)); l.remaining = r2(l.remaining - take); left = r2(left - take); used.push({ lot: l.id, amount: take, type: l.type }); }
    if (left > 0.0049) fail('not-enough', 'Not enough credit');
    return used;
  }

  /* ---------- profile ---------- */
  const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Mx', 'Dr', 'Prefer not to say'];
  function validateProfile(p) {
    const e = {};
    const out = {
      title: TITLES.includes(p.title) ? p.title : '',
      first: clean(p.first, 40), last: clean(p.last, 40),
      email: normEmail(p.email), mobile: clean(p.mobile, 20), mobileNorm: normMobile(p.mobile),
      birthDay: Math.max(0, Math.min(31, parseInt(p.birthDay, 10) || 0)), birthMonth: Math.max(0, Math.min(12, parseInt(p.birthMonth, 10) || 0)),
      postcode: clean(p.postcode, 10).toUpperCase(),
      relationship: clean(p.relationship, 40), visitFreq: clean(p.visitFreq, 40),
      occasions: Array.isArray(p.occasions) ? p.occasions.slice(0, 8).map(x => clean(x, 30)) : [],
      dietary: clean(p.dietary, 80), heardFrom: clean(p.heardFrom, 40),
      marketing: !!p.marketing, over18: !!p.over18, terms: !!p.terms
    };
    if (!out.title) e.title = 'Choose a title';
    if (!out.first) e.first = 'Enter your first name';
    if (!out.last) e.last = 'Enter your last name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) e.email = 'Enter a valid email address';
    if (!/^0\d{9,10}$/.test(out.mobileNorm)) e.mobile = 'Enter a UK mobile number';
    if ((out.birthDay && !out.birthMonth) || (!out.birthDay && out.birthMonth)) e.birthDay = 'Choose both day and month, or leave both blank';
    if (!out.over18) e.over18 = 'Membership is for over-18s';
    if (!out.terms) e.terms = 'Please accept the terms';
    return { profile: out, errors: e };
  }

  function cardView(m, s, now) {
    const b = balances(m, now);
    return {
      memberNo: m.memberNo, qr: 'CC1|' + m.memberNo + '|' + m.cardId.slice(0, 4),
      title: m.title, first: m.first, last: m.last, email: m.email, joined: m.joined, status: m.status,
      marketing: !!m.marketing, push: (m.pushTokens || []).length > 0,
      available: b.available, pending: b.pending, voucher: b.voucher, credit: b.credit, vouchers: b.vouchers, expiringNext: b.expiringNext,
      visits: m.visits || 0, totalEarned: r2(m.totalEarned || 0), totalSaved: r2(m.totalRedeemed || 0),
      earnPct: s.earnPct, creditDays: s.creditDays,
      history: (m.history || []).slice(-30).reverse(),
      updatedAt: now
    };
  }
  function staffView(m, s, now) {
    const b = balances(m, now);
    return { memberNo: m.memberNo, name: [m.title === 'Prefer not to say' ? '' : m.title, m.first, m.last].filter(Boolean).join(' '),
      first: m.first, status: m.status, joined: m.joined, visits: m.visits || 0, lastVisit: m.lastVisit || null,
      available: b.available, pending: b.pending, voucher: b.voucher, credit: b.credit, vouchers: b.vouchers, expiringNext: b.expiringNext,
      dietary: m.dietary || '', occasion: birthdayNote(m, now), earnPct: s.earnPct };
  }
  function birthdayNote(m, now) {
    if (!m.birthMonth) return '';
    const k = dayKey(now); const mo = +k.slice(5, 7), d = +k.slice(8, 10);
    if (m.birthMonth === mo && m.birthDay === d) return 'Birthday today';
    if (m.birthMonth === mo) return 'Birthday this month';
    return '';
  }
  function pushHistory(m, h) { m.history = (m.history || []).concat([h]).slice(-60); }

  /* =====================================================================
     SERVICE — store adapter must provide:
       get(col,id) → obj|null   set(col,id,obj)   del(col,id)
       list(col, where?) → [obj]   where = [[field, '=='|'>='|'<=', value], …]
     ctx (from the host) provides:
       now()  rand(n)  hash(str)  roster() → [{code,name,pinHash?}]
       adminPin  deviceCode  push(tokens,{title,body,url}) → {sent}
       sendCardEmail(member, link) (optional)   cardLink(cardId)
     ===================================================================== */
  function create(store, ctx) {
    const now = () => ctx.now();
    async function settings() { return Object.assign({}, DEFAULTS, (await store.get('club_settings', 'main')) || {}); }
    async function saveMember(m) {
      const s = await settings(); const t = now();
      await store.set('club_members', m.memberNo, m);
      await store.set('club_cards', m.cardId, cardView(m, s, t));
    }
    async function memberByNo(no) { const m = await store.get('club_members', String(no || '').replace(/\D/g, '')); return m; }
    async function guard(key, max, minutes) {
      const g = (await store.get('club_meta', 'guard_' + key)) || { n: 0, until: 0 };
      if (g.until > now()) fail('locked', 'Too many attempts. Try again in ' + Math.ceil((g.until - now()) / 60000) + ' minutes.');
      return {
        bad: async () => { g.n = (g.n || 0) + 1; if (g.n >= max) { g.until = now() + minutes * 60000; g.n = 0; } await store.set('club_meta', 'guard_' + key, g); },
        ok: async () => { if (g.n) await store.set('club_meta', 'guard_' + key, { n: 0, until: 0 }); }
      };
    }
    async function newTxId() { return 'T' + dayKey(now()).replace(/-/g, '') + '-' + ctx.rand(6).toUpperCase(); }
    async function newCode() {
      for (let i = 0; i < 20; i++) {
        const c = 'CC-' + String(1000 + Math.floor(Math.random() * 9000));
        const k = dayKey(now()) + '_' + c;
        if (!(await store.get('club_codes', k))) return c;
      }
      return 'CC-' + ctx.rand(5).toUpperCase();
    }

    /* ---------------- guest ---------------- */
    async function register(input) {
      const { profile: p, errors } = validateProfile(input || {});
      if (Object.keys(errors).length) fail('invalid', JSON.stringify(errors));
      const ek = 'e_' + p.email.replace(/[^a-z0-9]/g, '_'), mk = 'm_' + p.mobileNorm;
      const e1 = await store.get('club_keys', ek), m1 = await store.get('club_keys', mk);
      if (e1 || m1) fail('exists', e1 ? 'This email address is already a member.' : 'This mobile number is already a member.');
      const s = await settings(); const t = now();
      let memberNo; for (let i = 0; i < 30; i++) { memberNo = String(100000 + Math.floor(Math.random() * 900000)); if (!(await store.get('club_members', memberNo))) break; }
      const m = Object.assign({}, p, {
        memberNo, cardId: ctx.rand(24), joined: t, status: 'active', visits: 0, totalSpend: 0, totalEarned: 0, totalRedeemed: 0,
        lots: [], history: [], pushTokens: [], source: clean(input.source, 40)
      });
      delete m.terms; m.termsAcceptedAt = t;
      if (s.welcomeAmount > 0) {
        m.lots.push({ id: 'W1', type: 'welcome', amount: r2(s.welcomeAmount), remaining: r2(s.welcomeAmount), earnedAt: t, availableFrom: t, expires: londonMidnight(addDaysKey(dayKey(t), s.welcomeDays + 1)) });
        pushHistory(m, { at: t, type: 'welcome', label: 'Welcome voucher added', amount: r2(s.welcomeAmount) });
      }
      await store.set('club_keys', ek, { memberNo }); await store.set('club_keys', mk, { memberNo });
      await saveMember(m);
      await store.set('club_tx', await newTxId(), { type: 'join', memberNo, at: t, day: dayKey(t), welcome: r2(s.welcomeAmount), source: m.source });
      if (ctx.sendCardEmail) { try { await ctx.sendCardEmail(m, ctx.cardLink(m.cardId), 'welcome'); } catch (e) { /* email is a convenience */ } }
      return { cardId: m.cardId, memberNo };
    }
    async function recover(email) {
      const e = normEmail(email); const g = await guard('recover_' + e.replace(/[^a-z0-9]/g, '_'), 5, 60);
      const k = await store.get('club_keys', 'e_' + e.replace(/[^a-z0-9]/g, '_'));
      await g.bad();
      if (!k) return { ok: true };
      const m = await memberByNo(k.memberNo); if (!m || m.status === 'deleted') return { ok: true };
      const link = ctx.cardLink(m.cardId);
      if (ctx.sendCardEmail) await ctx.sendCardEmail(m, link, 'recover');
      return { ok: true, demoLink: ctx.demo ? link : undefined };
    }
    async function memberByCard(cardId) {
      const c = await store.get('club_cards', clean(cardId, 40)); if (!c) fail('not-found', 'Card not found');
      const m = await memberByNo(c.memberNo); if (!m || m.cardId !== cardId) fail('not-found', 'Card not found'); return m;
    }
    async function account(cardId, action, data) {
      const m = await memberByCard(cardId);
      if (action === 'marketing') { m.marketing = !!(data && data.on); }
      else if (action === 'push') { const tok = clean(data && data.token, 400); if (tok && !(m.pushTokens || []).includes(tok)) m.pushTokens = (m.pushTokens || []).concat([tok]).slice(-5); }
      else if (action === 'delete') { m.status = 'delete-requested'; m.deleteRequestedAt = now(); }
      else fail('invalid', 'Unknown action');
      await saveMember(m); return { ok: true };
    }

    /* ---------------- waiter tablet ---------------- */
    async function activateDevice(code, name) {
      const g = await guard('device', 8, 30);
      if (!ctx.deviceCode || String(code) !== String(ctx.deviceCode)) { await g.bad(); fail('denied', 'That set-up code is not right.'); }
      await g.ok();
      const deviceId = 'D' + ctx.rand(10), key = ctx.rand(32);
      await store.set('club_devices', deviceId, { id: deviceId, name: clean(name, 40) || 'Tablet', keyHash: await ctx.hash(key), activatedAt: now(), revoked: false, lastUsed: now() });
      return { deviceId, deviceKey: key, name: clean(name, 40) || 'Tablet' };
    }
    async function staffAuth(p) {
      const d = await store.get('club_devices', clean(p.deviceId, 20));
      if (!d || d.revoked || d.keyHash !== await ctx.hash(String(p.deviceKey || ''))) fail('device', 'This device is not set up for The Clarendon Club. Ask a manager to activate it.');
      const emp = clean(p.empNo, 12).toLowerCase();
      const g = await guard('staff_' + emp.replace(/\W/g, ''), 6, 15);
      const roster = await ctx.roster();
      const st = roster.find(r => String(r.code || '').trim().toLowerCase() === emp);
      if (!st) { await g.bad(); fail('staff', 'Employee number not recognised.'); }
      if (st.pinHash && clockHash(String(p.pin || ''), st.code) !== st.pinHash) { await g.bad(); fail('staff', 'PIN not recognised. Use your HosTIME clock-in PIN.'); }
      await g.ok();
      d.lastUsed = now(); await store.set('club_devices', p.deviceId, d);
      return { code: String(st.code), name: st.name, pinChecked: !!st.pinHash, deviceId: p.deviceId, deviceName: d.name };
    }
    async function lookup(q) {
      q = clean(q, 160);
      let no = '';
      if (q.startsWith('CC1|')) { const parts = q.split('|'); no = parts[1]; const m = await memberByNo(no); if (!m || m.cardId.slice(0, 4) !== parts[2]) fail('not-found', 'Card not recognised.'); return m; }
      if (q.includes('@')) { const k = await store.get('club_keys', 'e_' + normEmail(q).replace(/[^a-z0-9]/g, '_')); no = k && k.memberNo; }
      else if (/^0\d{9,10}$/.test(normMobile(q)) && normMobile(q).length >= 10) { const k = await store.get('club_keys', 'm_' + normMobile(q)); no = k && k.memberNo; }
      else no = q.replace(/\D/g, '');
      const m = no && await memberByNo(no); if (!m) fail('not-found', 'No member found.'); return m;
    }
    async function staff(p) {
      const who = await staffAuth(p); const s = await settings(); const t = now();
      const a = p.action;
      if (a === 'signin') return { staff: who, settings: { earnPct: s.earnPct, autoLockSeconds: s.autoLockSeconds, voidMinutes: s.voidMinutes } };
      if (a === 'lookup') {
        const m = await lookup(p.q);
        if (m.status !== 'active') fail('blocked', m.status === 'blocked' ? 'This membership is on hold. Ask a manager.' : 'This membership is closed.');
        expireLots(m, t); await saveMember(m);
        return { member: staffView(m, s, t) };
      }
      if (a === 'settle') {
        const m = await memberByNo(p.memberNo); if (!m || m.status !== 'active') fail('not-found', 'Member not available.');
        expireLots(m, t);
        const bill = r2(p.bill), use = r2(p.use || 0);
        if (!(bill > 0)) fail('invalid', 'Enter the bill total.');
        if (bill > s.maxBill) fail('invalid', 'Bill total looks too high. Check the amount.');
        if (use < 0) fail('invalid', 'Credit amount not valid.');
        const b = balances(m, t);
        if (use > b.available + 0.0049) fail('not-enough', 'The guest only has ' + gbp(b.available) + ' to spend.');
        if (use > bill) fail('invalid', 'Credit cannot be more than the bill.');
        const used = use > 0 ? consume(m, use, t) : [];
        const paid = r2(bill - use);
        const earned = r2(paid * s.earnPct / 100);
        const txId = await newTxId(); const code = use > 0 ? await newCode() : '';
        if (earned > 0) {
          const from = s.creditNextVisit ? nextDayStart(t) : t;
          m.lots.push({ id: 'E' + txId, type: 'earn', amount: earned, remaining: earned, earnedAt: t, availableFrom: from, expires: londonMidnight(addDaysKey(dayKey(t), s.creditDays + 1)), tx: txId });
        }
        m.visits = (m.visits || 0) + 1; m.totalSpend = r2((m.totalSpend || 0) + paid); m.totalEarned = r2((m.totalEarned || 0) + earned); m.totalRedeemed = r2((m.totalRedeemed || 0) + use); m.lastVisit = t;
        pushHistory(m, { at: t, type: 'visit', tx: txId, bill, used: use, earned, code });
        const tx = { type: 'settle', txId, memberNo: m.memberNo, memberName: m.first + ' ' + m.last, at: t, day: dayKey(t), bill, discount: use, paid, earned, used, code,
          voucherUsed: r2(used.filter(u => u.type === 'welcome').reduce((a, u) => a + u.amount, 0)),
          staffCode: who.code, staffName: who.name, pinChecked: who.pinChecked, deviceId: who.deviceId, deviceName: who.deviceName, voided: false };
        await store.set('club_tx', txId, tx);
        if (code) await store.set('club_codes', dayKey(t) + '_' + code, { txId });
        await saveMember(m);
        return { tx, member: staffView(m, s, t) };
      }
      if (a === 'void') {
        const tx = await store.get('club_tx', clean(p.txId, 40)); if (!tx || tx.type !== 'settle') fail('not-found', 'Transaction not found.');
        if (tx.voided) fail('invalid', 'Already voided.');
        if (tx.staffCode !== who.code) fail('denied', 'Only the waiter who recorded it can void it here. Ask a manager.');
        if (t - tx.at > s.voidMinutes * 60000) fail('denied', 'Too late to void here. Ask a manager to adjust it in the back office.');
        return voidTx(tx, who.name, p.reason);
      }
      if (a === 'today') {
        const day = dayKey(t);
        const list = (await store.list('club_tx', [['day', '==', day]])).filter(x => x.type === 'settle' && x.deviceId === who.deviceId).sort((x, y) => y.at - x.at);
        return { tx: list.slice(0, 60) };
      }
      fail('invalid', 'Unknown action');
    }
    async function voidTx(tx, byName, reason) {
      const t = now(); const m = await memberByNo(tx.memberNo); if (!m) fail('not-found', 'Member not found.');
      for (const u of tx.used || []) { const l = (m.lots || []).find(x => x.id === u.lot); if (l) l.remaining = r2(Math.min(l.amount, l.remaining + u.amount)); }
      const el = (m.lots || []).find(x => x.id === 'E' + tx.txId); let clawback = 0;
      if (el) { clawback = r2(el.amount - el.remaining); el.remaining = 0; el.voided = true; }
      m.visits = Math.max(0, (m.visits || 0) - 1); m.totalSpend = r2((m.totalSpend || 0) - tx.paid); m.totalEarned = r2((m.totalEarned || 0) - tx.earned); m.totalRedeemed = r2((m.totalRedeemed || 0) - tx.discount);
      pushHistory(m, { at: t, type: 'void', tx: tx.txId, label: 'Visit corrected', bill: tx.bill });
      tx.voided = true; tx.voidedAt = t; tx.voidedBy = byName; tx.voidReason = clean(reason, 120); tx.clawbackShortfall = clawback;
      await store.set('club_tx', tx.txId, tx); await saveMember(m);
      return { tx };
    }

    /* ---------------- back office ---------------- */
    async function admin(p) {
      const g = await guard('admin', 8, 30);
      if (!ctx.adminPin || String(p.pin) !== String(ctx.adminPin)) { await g.bad(); fail('denied', 'Back-office PIN not recognised.'); }
      await g.ok();
      const s = await settings(); const t = now(); const a = p.action;
      if (a === 'signin') return { ok: true, settings: s };
      if (a === 'summary') {
        const day = dayKey(t), since7 = t - 7 * DAY, since30 = t - 30 * DAY;
        const members = await store.list('club_members'); const txs = await store.list('club_tx', [['day', '>=', addDaysKey(day, -31)]]);
        let liability = 0, pendingL = 0, expiring14 = 0, vouchersOut = 0;
        for (const m of members) { if (m.status === 'deleted') continue; const b = balances(m, t); liability += b.available; pendingL += b.pending; vouchersOut += b.voucher;
          for (const l of m.lots || []) if (lotState(l, t) !== 'used' && lotState(l, t) !== 'expired' && l.expires - t < 14 * DAY) expiring14 += l.remaining; }
        const live = txs.filter(x => x.type === 'settle' && !x.voided);
        const sum = (arr, f) => r2(arr.reduce((a2, x) => a2 + (x[f] || 0), 0));
        const in30 = live.filter(x => x.at >= since30);
        const days = []; for (let i = 13; i >= 0; i--) { const k = addDaysKey(day, -i); const dl = live.filter(x => x.day === k);
          days.push({ day: k, visits: dl.length, spend: sum(dl, 'paid'), earned: sum(dl, 'earned'), used: sum(dl, 'discount'), joins: txs.filter(x => x.type === 'join' && x.day === k).length }); }
        const active = members.filter(m => m.status === 'active');
        return {
          members: active.length, newWeek: active.filter(m => m.joined >= since7).length, marketing: active.filter(m => m.marketing).length,
          withPush: active.filter(m => (m.pushTokens || []).length).length, repeat: active.filter(m => (m.visits || 0) >= 2).length,
          liability: r2(liability), pending: r2(pendingL), expiring14: r2(expiring14), vouchersOut: r2(vouchersOut),
          visits30: in30.length, spend30: sum(in30, 'paid'), earned30: sum(in30, 'earned'), used30: sum(in30, 'discount'),
          avgBill30: in30.length ? r2(sum(in30, 'bill') / in30.length) : 0,
          welcomeUsed: sum(in30, 'voucherUsed'), days,
          deleteRequests: members.filter(m => m.status === 'delete-requested').map(m => ({ memberNo: m.memberNo, name: m.first + ' ' + m.last, at: m.deleteRequestedAt }))
        };
      }
      if (a === 'members') {
        const q = clean(p.q, 80).toLowerCase();
        const list = (await store.list('club_members')).filter(m => m.status !== 'deleted').filter(m => !q || (m.memberNo + ' ' + m.first + ' ' + m.last + ' ' + m.email + ' ' + m.mobile + ' ' + m.postcode).toLowerCase().includes(q));
        return { members: list.sort((x, y) => y.joined - x.joined).slice(0, 500).map(m => { const b = balances(m, t); return {
          memberNo: m.memberNo, name: m.first + ' ' + m.last, title: m.title, email: m.email, mobile: m.mobile, postcode: m.postcode, joined: m.joined, status: m.status,
          visits: m.visits || 0, spend: r2(m.totalSpend || 0), earned: r2(m.totalEarned || 0), used: r2(m.totalRedeemed || 0), available: b.available, pending: b.pending,
          lastVisit: m.lastVisit || null, marketing: !!m.marketing, push: (m.pushTokens || []).length > 0, relationship: m.relationship, visitFreq: m.visitFreq,
          heardFrom: m.heardFrom, birthMonth: m.birthMonth, birthDay: m.birthDay, occasions: m.occasions, dietary: m.dietary }; }) };
      }
      if (a === 'member') { const m = await memberByNo(p.memberNo); if (!m) fail('not-found', 'Not found'); const tx = (await store.list('club_tx', [['memberNo', '==', m.memberNo]])).sort((x, y) => y.at - x.at);
        return { member: Object.assign({}, m, { cardId: undefined, pushTokens: undefined, balances: balances(m, t) }), tx, cardLink: ctx.cardLink(m.cardId) }; }
      if (a === 'adjust') {
        const m = await memberByNo(p.memberNo); if (!m) fail('not-found', 'Not found');
        const amt = r2(p.amount), reason = clean(p.reason, 120); if (!amt || !reason) fail('invalid', 'Enter an amount and a reason.');
        const txId = await newTxId();
        if (amt > 0) m.lots.push({ id: 'A' + txId, type: 'adjust', amount: amt, remaining: amt, earnedAt: t, availableFrom: t, expires: londonMidnight(addDaysKey(dayKey(t), s.creditDays + 1)) });
        else consume(m, -amt, t);
        pushHistory(m, { at: t, type: 'adjust', label: amt > 0 ? 'Credit added by the team' : 'Credit adjusted by the team', amount: amt });
        await store.set('club_tx', txId, { type: 'adjust', txId, memberNo: m.memberNo, memberName: m.first + ' ' + m.last, at: t, day: dayKey(t), amount: amt, reason, staffName: 'Back office' });
        await saveMember(m); return { ok: true };
      }
      if (a === 'status') {
        const m = await memberByNo(p.memberNo); if (!m) fail('not-found', 'Not found');
        if (p.status === 'deleted') { // GDPR erasure: keep anonymised transactions, remove personal data
          await store.del('club_keys', 'e_' + m.email.replace(/[^a-z0-9]/g, '_')); await store.del('club_keys', 'm_' + m.mobileNorm); await store.del('club_cards', m.cardId);
          await store.set('club_members', m.memberNo, { memberNo: m.memberNo, status: 'deleted', deletedAt: t, cardId: m.cardId, first: 'Deleted', last: 'member', lots: [] });
          return { ok: true };
        }
        if (!['active', 'blocked'].includes(p.status)) fail('invalid', 'Bad status');
        m.status = p.status; await saveMember(m); return { ok: true };
      }
      if (a === 'void') { const tx = await store.get('club_tx', clean(p.txId, 40)); if (!tx || tx.type !== 'settle' || tx.voided) fail('invalid', 'Cannot void that.'); return voidTx(tx, 'Back office', p.reason); }
      if (a === 'tx') {
        const from = p.from || addDaysKey(dayKey(t), -30), to = p.to || dayKey(t);
        return { tx: (await store.list('club_tx', [['day', '>=', from], ['day', '<=', to]])).sort((x, y) => y.at - x.at) };
      }
      if (a === 'recon') {
        const day = p.day || dayKey(t);
        if (p.save) await store.set('club_recon', day, { day, tillDiscount: r2(p.tillDiscount), note: clean(p.note, 200), savedAt: t });
        const tx = (await store.list('club_tx', [['day', '==', day]])).filter(x => x.type === 'settle').sort((x, y) => x.at - y.at);
        const rec = await store.get('club_recon', day);
        const system = r2(tx.filter(x => !x.voided && x.discount > 0).reduce((a2, x) => a2 + x.discount, 0));
        return { day, tx, system, recon: rec, variance: rec ? r2(rec.tillDiscount - system) : null };
      }
      if (a === 'settings') {
        if (p.save) {
          const n = p.save, out = {};
          const num = (k, lo, hi) => { const v = Number(n[k]); if (!(v >= lo && v <= hi)) fail('invalid', k + ' out of range'); out[k] = v; };
          num('earnPct', 0, 50); num('welcomeAmount', 0, 100); num('welcomeDays', 1, 365); num('creditDays', 7, 730); num('maxBill', 50, 50000); num('voidMinutes', 0, 240); num('autoLockSeconds', 30, 900);
          out.creditNextVisit = !!n.creditNextVisit;
          await store.set('club_settings', 'main', Object.assign({}, (await store.get('club_settings', 'main')) || {}, out));
        }
        return { settings: await settings() };
      }
      if (a === 'offers') {
        if (p.save) { const o = p.save; const id = o.id || ('O' + ctx.rand(8));
          const offer = { id, title: clean(o.title, 60), body: clean(o.body, 400), validFrom: clean(o.validFrom, 10), validTo: clean(o.validTo, 10), days: clean(o.days, 60), tag: clean(o.tag, 24), active: !!o.active, updatedAt: t, createdAt: o.createdAt || t, sentAt: o.sentAt || null, sentCount: o.sentCount || 0 };
          if (!offer.title || !offer.body) fail('invalid', 'Offer needs a title and description.');
          await store.set('club_offers', id, offer); }
        if (p.remove) await store.del('club_offers', clean(p.remove, 20));
        if (p.send) {
          const o = await store.get('club_offers', clean(p.send, 20)); if (!o) fail('not-found', 'Offer not found');
          const members = (await store.list('club_members')).filter(m => m.status === 'active' && (m.pushTokens || []).length);
          const tokens = [].concat(...members.map(m => m.pushTokens));
          const r = ctx.push ? await ctx.push(tokens, { title: o.title, body: o.body, url: '#offers' }) : { sent: 0 };
          o.sentAt = t; o.sentCount = r.sent || 0; await store.set('club_offers', o.id, o);
          return { sent: r.sent || 0, members: members.length };
        }
        return { offers: (await store.list('club_offers')).sort((x, y) => y.createdAt - x.createdAt) };
      }
      if (a === 'devices') {
        if (p.revoke) { const d = await store.get('club_devices', p.revoke); if (d) { d.revoked = true; await store.set('club_devices', p.revoke, d); } }
        return { devices: (await store.list('club_devices')).map(d => Object.assign({}, d, { keyHash: undefined })) };
      }
      fail('invalid', 'Unknown action');
    }

    async function daily() {
      const t = now(); let n = 0, amt = 0; const s = await settings();
      for (const m of await store.list('club_members')) {
        if (m.status === 'deleted') continue;
        const before = JSON.stringify(m.lots || []); const e = expireLots(m, t);
        if (e > 0) { amt += e; n++; pushHistory(m, { at: t, type: 'expired', label: 'Credit expired', amount: e }); await store.set('club_tx', await newTxId(), { type: 'expire', memberNo: m.memberNo, at: t, day: dayKey(t), amount: e }); }
        if (e > 0 || before !== JSON.stringify(m.lots)) { await store.set('club_members', m.memberNo, m); }
        await store.set('club_cards', m.cardId, cardView(m, s, t));
      }
      return { expiredMembers: n, expiredAmount: r2(amt) };
    }

    async function offersPublic() {
      const k = dayKey(now());
      return (await store.list('club_offers')).filter(o => o.active && (!o.validFrom || o.validFrom <= k) && (!o.validTo || o.validTo >= k))
        .map(o => ({ id: o.id, title: o.title, body: o.body, validTo: o.validTo, days: o.days, tag: o.tag }));
    }

    return { settings, register, recover, account, activateDevice, staff, admin, daily, offersPublic };
  }

  function matchWhere(o, where) { return (where || []).every(([f, op, v]) => op === '==' ? o[f] === v : op === '>=' ? o[f] >= v : op === '<=' ? o[f] <= v : true); }

  return { matchWhere, DEFAULTS, create, balances, lotState, expireLots, consume, validateProfile, cardView, staffView, dayKey, londonMidnight, nextDayStart, addDaysKey, r2, gbp, clockHash, normMobile, ClubError, TITLES };
});
