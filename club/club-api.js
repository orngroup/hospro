/* THE CLARENDON CLUB — data layer for the three screens.
   Live: Firebase (Cloud Functions callables + a read-only card document).
   Demo: the same ClubService rules running in this browser (localStorage). */
(function () {
  'use strict';
  const C = window.CLUB_CONFIG || {};
  const S = window.ClubService;
  const DEMO = !!C.demo || /[?&]demo=1/.test(location.search);
  const rand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; return Array.from(a, b => ch[b % ch.length]).join(''); };
  const err = (e) => { const o = new Error((e && e.message) || 'Something went wrong'); o.code = (e && (e.details && e.details.code || e.code)) || 'error'; return o; };

  let api;
  if (DEMO) {
    /* ---------- demo: localStorage store ---------- */
    const KEY = 'clarendon_club_demo_v1';
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return MEM; } };
    let MEM = {};
    const save = (db) => { MEM = db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
    const clone = o => o == null ? null : JSON.parse(JSON.stringify(o));
    const store = {
      get: async (c, i) => clone((load()[c] || {})[i]),
      set: async (c, i, o) => { const db = load(); (db[c] = db[c] || {})[i] = clone(o); save(db); },
      del: async (c, i) => { const db = load(); if (db[c]) delete db[c][i]; save(db); },
      list: async (c, w) => Object.values(load()[c] || {}).filter(o => S.matchWhere(o, w)).map(clone)
    };
    let T = null;
    const DEMO_ROSTER = [
      { code: '1001', name: 'Demo Waiter', pinHash: S.clockHash('1234', '1001') },
      { code: '1002', name: 'Demo Supervisor', pinHash: S.clockHash('5678', '1002') }
    ];
    const ctx = {
      demo: true, now: () => T || Date.now(), rand, hash: async s => 'h' + S.clockHash(s, 'device'),
      roster: async () => DEMO_ROSTER, adminPin: '1234', deviceCode: 'DEMO',
      cardLink: id => location.href.split('#')[0].replace(/[^/]*$/, '') + 'index.html?c=' + id,
      push: async tokens => ({ sent: tokens.length })
    };
    const svc = S.create(store, ctx);
    async function seed() {
      if ((await store.list('club_members')).length) return;
      const now = Date.now(), D = 86400000;
      const people = [
        ['Mrs', 'Sarah', 'Hughes', 'CV8 3FW', 'Local resident', 26, [62, 48, 95]],
        ['Mr', 'Daniel', 'Okafor', 'CV3 2AB', 'Hotel guest', 20, [134]],
        ['Ms', 'Priya', 'Shah', 'CV21 4LP', 'Spa member', 14, [41, 57]],
        ['Mr', 'Tom', 'Bennett', 'CV8 2JQ', 'Local resident', 9, [88, 72, 66, 54]],
        ['Miss', 'Ellie', 'Morgan', 'LE10 1XX', 'Visiting on business', 5, [38]],
        ['Dr', 'James', 'Carter', 'CV2 5DD', 'Local resident', 2, []]
      ];
      const dev = await svc.activateDevice('DEMO', 'Restaurant tablet 1'); const dk = { deviceId: dev.deviceId, key: dev.deviceKey };
      for (const [title, first, last, pc, rel, ago, bills] of people) {
        T = now - ago * D - 3 * 3600000;
        const r = await svc.register({ title, first, last, email: first.toLowerCase() + '.' + last.toLowerCase() + '@example.com', mobile: '0770090' + String(1000 + Math.floor(Math.random() * 8999)),
          postcode: pc, relationship: rel, visitFreq: 'Twice a month', occasions: ['Family meals'], heardFrom: 'Table card', over18: true, terms: true, marketing: Math.random() > .3, source: 'table' });
        let day = ago;
        for (let i = 0; i < bills.length; i++) {
          day = Math.max(0, day - (i === 0 ? 0 : 3 + Math.floor(Math.random() * 3)));
          T = now - day * D - 2 * 3600000;
          const m = await store.get('club_members', r.memberNo); const b = S.balances(m, T);
          await svc.staff({ deviceId: dk.deviceId, deviceKey: dk.key, empNo: '1001', pin: '2222', action: 'settle', memberNo: r.memberNo, bill: bills[i], use: i % 2 === 0 ? Math.min(b.available, bills[i]) : 0 });
        }
      }
      T = null;
      await svc.admin({ pin: '1234', action: 'offers', save: { title: 'Sunday lunch for members', body: 'Double credit (10% back) on Sunday lunch in The Clarendon throughout December. Show your card when you pay.', validTo: '2026-12-31', days: 'Sundays', tag: 'Double credit', active: true } });
      await svc.admin({ pin: '1234', action: 'offers', save: { title: 'Birthday treat', body: 'Celebrating with us? Members receive a complimentary dessert during their birthday month. Just let your server know.', tag: 'Members only', active: true } });
    }
    const ready = seed();
    const wrap = fn => async (...a) => { await ready; try { return await fn(...a); } catch (e) { throw err(e); } };
    api = {
      mode: 'demo',
      register: wrap(p => svc.register(p)),
      recover: wrap(e => svc.recover(e)),
      account: wrap((id, a, d) => svc.account(id, a, d)),
      offers: wrap(() => svc.offersPublic()),
      activate: wrap((code, name) => svc.activateDevice(code, name)),
      staff: wrap(p => svc.staff(p)),
      admin: wrap(p => svc.admin(p)),
      watchCard(cardId, cb, onErr) {
        let last = '';
        const tick = async () => { await ready; const c = await store.get('club_cards', cardId); const s = JSON.stringify(c); if (s !== last) { last = s; c ? cb(c) : onErr && onErr(err({ code: 'not-found', message: 'Card not found' })); } };
        tick(); const iv = setInterval(tick, 900); return () => clearInterval(iv);
      },
      pushSupported: () => false,
      enablePush: async () => { throw err({ code: 'demo', message: 'Offer alerts work on the live site once the card is on your home screen.' }); },
      demoHint: { device: 'DEMO', staff: '1001 / PIN 2222', admin: '1234' }
    };
  } else {
    /* ---------- live: Firebase ---------- */
    if (!firebase.apps.length) firebase.initializeApp(C.firebase);
    const db = firebase.firestore();
    const fns = firebase.app().functions(C.region || 'europe-west1');
    const call = name => async data => { try { return (await fns.httpsCallable(name)(data)).data; } catch (e) { throw err(e); } };
    const g = call('clubGuest'), st = call('clubStaff'), ad = call('clubAdmin');
    api = {
      mode: 'live',
      register: p => g({ action: 'register', profile: p }),
      recover: email => g({ action: 'recover', email }),
      account: (cardId, action, data) => g({ action: 'account', cardId, sub: action, data }),
      offers: async () => {
        const k = S.dayKey(Date.now());
        const snap = await db.collection('club_offers').where('active', '==', true).get();
        return snap.docs.map(d => d.data()).filter(o => (!o.validFrom || o.validFrom <= k) && (!o.validTo || o.validTo >= k));
      },
      activate: (code, name) => st({ action: 'activate', code, name }),
      staff: p => st(p),
      admin: p => ad(p),
      watchCard(cardId, cb, onErr) {
        return db.collection('club_cards').doc(cardId).onSnapshot(d => d.exists ? cb(d.data()) : onErr && onErr(err({ code: 'not-found', message: 'Card not found' })), e => onErr && onErr(err(e)));
      },
      pushSupported: () => 'serviceWorker' in navigator && 'Notification' in window && firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported(),
      async enablePush(cardId) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw err({ code: 'denied', message: 'Notifications are switched off for this site in your phone settings.' });
        const reg = await navigator.serviceWorker.register('sw.js');
        await navigator.serviceWorker.ready;
        const token = await firebase.messaging().getToken({ vapidKey: C.vapidKey, serviceWorkerRegistration: reg });
        if (!token) throw err({ code: 'token', message: 'Could not switch on alerts. Try again from the home-screen icon.' });
        await api.account(cardId, 'push', { token });
        return true;
      }
    };
  }
  window.ClubAPI = api;

  /* ---------- small shared UI helpers ---------- */
  window.CC = {
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    gbp: x => '£' + (Math.round((Number(x) || 0) * 100) / 100).toFixed(2),
    date: (ts, o) => new Date(ts).toLocaleDateString('en-GB', Object.assign({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }, o || {})),
    time: ts => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }),
    memberNo: n => String(n || '').replace(/(\d{3})(\d{3})/, '$1 $2'),
    qrSvg(text, px) {
      const q = qrcode(0, 'M'); q.addData(text); q.make();
      const n = q.getModuleCount(), m = 2, size = n + m * 2; let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + (px || 240) + '" height="' + (px || 240) + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#1d2a36"/></svg>';
    },
    toast(msg, kind) {
      let t = document.getElementById('cc-toast'); if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
      t.textContent = msg; t.className = 'show ' + (kind || ''); clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 3600);
    },
    demo: DEMO
  };
})();
