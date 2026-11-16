/* Brandon Hall — Rezlynx (Guestline) report readers for the Trading tab.
   Used by the dashboard in the browser and by the build script in Node. */
(function (root) {
  'use strict';

  function csv(text) {
    var rows = [], row = [], cur = '', q = false;
    text = String(text).replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function iso(dmy) { var p = String(dmy).split('/'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : null; }
  function n(v) { var x = parseFloat(String(v).replace(/,/g, '')); return isNaN(x) ? 0 : x; }

  /* Actual & Forecast CSV -> one record per night */
  function isAF(text) { return /^﻿?Date,DayOfWeek,Avail,Total,Indv,Multi,Blocks,Occ,/.test(String(text).slice(0, 80)); }
  function parseAF(text) {
    var rows = csv(text), h = rows[0], ix = {};
    h.forEach(function (k, i) { ix[k.trim()] = i; });
    var out = [];
    rows.slice(1).forEach(function (r) {
      var d = iso(r[ix.Date]); if (!d) return;
      var stock = n(r[ix.InStock]), occ = n(r[ix.Occ]);
      out.push({ d: d, dow: r[ix.DayOfWeek], listed: n(r[ix.Total]), indv: n(r[ix.Indv]), multi: n(r[ix.Multi]), blocks: n(r[ix.Blocks]),
        occPct: occ, rooms: Math.round(occ / 100 * stock), ad: n(r[ix.Ad]), ch: n(r[ix.Ch]),
        acc: n(r[ix.Accomm]), fb: n(r[ix.FB]), oth: n(r[ix.Other]), roos: n(r[ix.ROOS]), dfs: n(r[ix.DFS]), stock: stock });
    });
    return out;
  }

  /* Period End workbook (array of rows) -> revenue by analysis code, payments, deposits, ledger */
  function isPE(aoa) { return aoa && aoa[1] && String(aoa[1][0] || aoa[1].join(' ')).indexOf('Period Status') !== -1 || (aoa || []).slice(0, 6).some(function (r) { return (r || []).join(' ').indexOf('Period ID') !== -1; }); }
  function parsePE(aoa) {
    var clean = aoa.map(function (r) { return (r || []).filter(function (c) { return c !== '' && c !== null && c !== undefined; }); });
    var pe = { type: '', id: '', opened: '', closed: '', status: '', groups: [], total: null, payments: [], other: {} };
    var sec = '', grp = null;
    clean.forEach(function (r) {
      if (!r.length) return;
      var a = String(r[0]);
      if (/^Page \d+ of/.test(a)) return;
      if (a === 'Brandon Hall Hotel and Spa' || /Hotel/.test(a) && r.length === 2 && /^End of/.test(String(r[1]))) { if (!pe.type) pe.type = String(r[1]).replace('End of ', '').toLowerCase(); return; }
      if (a === 'Period Status') { pe.status = String(r[1]); return; }
      if (a === 'Period ID') { pe.id = String(r[1]); return; }
      if (a === 'Period Opened') { pe.opened = String(r[1]); pe.closed = String(r[3] || ''); return; }
      if (r.length === 1 && typeof r[0] === 'string') { sec = a; grp = null; return; }
      if (sec === 'Analysis Codes Revenue') {
        if (r[1] === 'Code' && r[2] === 'Description') { grp = { g: a, lines: [], total: null }; pe.groups.push(grp); return; }
        if (a === 'Totals') { pe.total = [r[1], r[2], r[3]]; return; }
        if (r[1] === 'Total' && grp && a === grp.g) { grp.total = [r[2], r[3], r[4]]; return; }
        if (grp && typeof r[2] === 'number') { grp.lines.push([a, String(r[1]), r[2], r[3], r[4]]); return; }
        return;
      }
      if (sec === 'Payment Totals') { if (typeof r[r.length - 1] === 'number' && r.length >= 3) pe.payments.push([a, String(r[1]), r[2]]); return; }
      if (typeof r[r.length - 1] === 'number' && r.length >= 3 && /^[A-Z_]+$/.test(a)) pe.other[a] = r[2];
    });
    var m = pe.opened.match(/(\d\d)\/(\d\d)\/(\d{4})/); pe.from = m ? m[3] + '-' + m[2] + '-' + m[1] : '';
    return pe;
  }

  /* Merge a newly read file into the stored trading data */
  function merge(store, kind, parsed, meta) {
    store = store || {}; store.received = store.received || []; store.snaps = store.snaps || {}; store.pe = store.pe || {};
    var day = meta.asOf.slice(0, 10);
    if (kind === 'af') {
      var have = {}; (store.af && store.af.rows || []).forEach(function (r) { have[r.d] = r; });
      parsed.forEach(function (r) { have[r.d] = r; });
      store.af = { asOf: meta.asOf, basis: meta.basis || 'gross', rows: Object.keys(have).sort().map(function (k) { return have[k]; }) };
      var snap = {}; parsed.forEach(function (r) { if (r.d >= day && (r.rooms || r.acc)) snap[r.d] = [r.rooms, Math.round(r.acc)]; });
      store.snaps[day] = snap;
      /* a long forecast range makes each daily snapshot large: keep 45 days of dailies, then one a week */
      var ks = Object.keys(store.snaps).sort(), cut = ks.length - 45;
      ks.forEach(function (k, i) { if (i < cut && new Date(k).getDay() !== 1) delete store.snaps[k]; });
    }
    if (kind === 'pe') { parsed.asOf = meta.asOf; store.pe[parsed.type + '|' + parsed.from] = parsed; }
    store.received.unshift({ ts: meta.asOf, kind: kind, file: meta.file, rows: kind === 'af' ? parsed.length : parsed.groups.length });
    store.received = store.received.slice(0, 60);
    return store;
  }


  /* ---------- other Rezlynx reports: aggregated on load, no guest names kept ---------- */
  var MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  function d2(s) { var m = String(s).match(/(\d{1,2})\/(\w{3})\/(\d{4})/); if (m && MON[m[2]]) return m[3] + '-' + MON[m[2]] + '-' + ('0' + m[1]).slice(-2); m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function bump(o, k, f) { o[k] = o[k] || {}; Object.keys(f).forEach(function (x) { o[k][x] = (o[k][x] || 0) + f[x]; }); }
  function flat(r) { return (r || []).map(function (c) { return String(c === null || c === undefined ? '' : c); }); }
  function title(aoa) { return aoa.slice(0, 5).map(function (r) { return flat(r).join(' '); }).join(' | '); }
  function family(plan) { return String(plan).split('_')[0] || 'Other'; }
  function board(plan) { var p = String(plan); return /_DBB/.test(p) ? 'Dinner, bed and breakfast' : /_BB/.test(p) ? 'Bed and breakfast' : /_RO/.test(p) ? 'Room only' : 'Other'; }

  function readReport(aoa) {
    var t = title(aoa), out;
    if (/Company Report/.test(t)) {
      out = { kind: 'company', period: flat(aoa[0]).join('').trim(), rows: [], total: {} };
      for (var i = 6; i < aoa.length; i++) {
        var r = aoa[i] || [], nx = aoa[i + 1] || [];
        if (r[0] === 'Grand Total') { out.total = { acc: n(r[5]), fb: n(r[6]), oth: n(r[7]), lostRev: n(r[18]), rn: n(nx[2]), tot: n(nx[8]), lostNights: n(nx[17]) }; break; }
        if (typeof r[5] !== 'number' || !n(r[2])) continue;
        out.rows.push({ ref: String(r[0] || '').trim() || '(no company)', arr: n(r[1]), rn: n(r[2]), acc: r[5], fb: n(r[6]), oth: n(r[7]), tot: n(r[8]), lead: n(r[12]), stay: n(r[13]), rate: n(r[14]), lostRev: n(r[18]), lostNights: n(nx[17]) });
      }
      out.rows.sort(function (a, b) { return b.rn - a.rn; });
    } else if (/Rate Override Report/.test(t)) {
      out = { kind: 'overrides', count: 0, down: 0, up: 0, pre: 0, post: 0, byPlan: {}, byOp: {}, byMonth: {}, from: '', to: '' };
      aoa.forEach(function (r) {
        if (!r || typeof r[11] !== 'number' || typeof r[13] !== 'number' || !r[9]) return;
        var d = d2(r[1]), diff = r[13], f = { c: 1, pre: r[11], post: r[12], diff: diff };
        out.count++; out.pre += r[11]; out.post += r[12]; if (diff < 0) out.down += diff; else out.up += diff;
        var op = String(r[0]).replace(/\s+/g, ''); out._ops = out._ops || {}; if (!/^RMLYNX/.test(op)) out._ops[op] = 1;
        bump(out.byPlan, String(r[9]), f); bump(out.byOp, /^RMLYNX/.test(op) ? 'Automatic (system)' : 'Staff', f); bump(out.byMonth, d.slice(0, 7), f);
        if (d && (!out.from || d < out.from)) out.from = d; if (d > out.to) out.to = d;
      });
      out.staffUsers = Object.keys(out._ops || {}).length; delete out._ops;
    } else if (/Room Usage/.test(t)) {
      out = { kind: 'rooms', total: 0, byType: {}, byStatus: {}, oos: [] };
      aoa.forEach(function (r) {
        if (!r || !r[4] || r[0] === 'Room ID' || !/^\d+$/.test(String(r[0]).trim())) return;
        out.total++; var st = String(r[8] || '').trim();
        bump(out.byType, String(r[4]), { c: 1, oos: /out of service/i.test(st) ? 1 : 0 }); out.byStatus[st] = (out.byStatus[st] || 0) + 1;
        out.byType[String(r[4])].desc = String(r[2]);
        if (/out of service/i.test(st)) out.oos.push({ id: String(r[0]), desc: String(r[2]), floor: String(r[6] || ''), since: d2(r[12]), until: d2(r[14]), lastDep: d2(r[16]) });
      });
    } else if (/Cancellations Report/.test(t)) {
      out = { kind: 'cancels', count: 0, lost: 0, byMonth: {}, byAgent: {}, byLead: {}, from: '', to: '' };
      for (var j = 0; j < aoa.length; j++) {
        var c = aoa[j] || [], d = aoa[j + 1] || [];
        if (!/^CN\d+/.test(String(c[0])) || typeof c[18] !== 'number') continue;
        var cd = d2(c[1]), ad = d2(d[11]), lead = cd && ad ? Math.round((Date.parse(ad) - Date.parse(cd)) / 864e5) : null;
        var bk = lead === null ? 'Unknown' : lead <= 0 ? 'On the day' : lead <= 2 ? '1 to 2 days before' : lead <= 7 ? '3 to 7 days before' : lead <= 30 ? '8 to 30 days before' : 'Over 30 days before';
        var f2 = { c: 1, lost: c[18] };
        out.count++; out.lost += c[18]; bump(out.byMonth, cd.slice(0, 7), f2); bump(out.byAgent, String(d[6] || '').trim() || '(direct or no agent)', f2); bump(out.byLead, bk, f2);
        if (cd && (!out.from || cd < out.from)) out.from = cd; if (cd > out.to) out.to = cd;
      }
    } else if (/No Shows Report/.test(t)) {
      out = { kind: 'noshows', count: 0, byMonth: {}, byFamily: {} };
      for (var k = 0; k < aoa.length; k++) {
        var a = aoa[k] || [], b = aoa[k + 1] || [];
        if (!/^BK\d+/.test(String(a[6])) || !a[20]) continue;
        out.count++; bump(out.byMonth, d2(b[10]).slice(0, 7), { c: 1 }); bump(out.byFamily, family(a[20]), { c: 1 });
      }
    } else if (/Daily Rate Analysis/.test(t)) {
      out = { kind: 'rates', range: flat(aoa[0])[1] || '', nights: 0, value: 0, byPlan: {}, byFamily: {}, byBoard: {} };
      aoa.forEach(function (r) {
        if (!r || !/^BK\d+/.test(String(r[0]))) return;
        for (var x = 1; x < r.length; x++) { var m = String(r[x] || '').match(/^([A-Z0-9_]+)\s*\n\s*([\d.]+)/); if (!m) continue; var f = { n: 1, v: parseFloat(m[2]) }; out.nights++; out.value += f.v; bump(out.byPlan, m[1], f); bump(out.byFamily, family(m[1]), f); bump(out.byBoard, board(m[1]), f); }
      });
    } else if (/Forecast Revenue By Market Segment/.test(t)) {
      var fr = flat(aoa[1]), to = flat(aoa[2]);
      out = { kind: 'segments', from: d2(fr[fr.indexOf('From') + 1] || fr.join(' ')), to: d2(to[to.indexOf('To') + 1] || to.join(' ')), basis: /Gross/.test(to.join(' ')) ? 'gross' : 'net', rows: [] };
      aoa.forEach(function (r) { if (!r || typeof r[6] !== 'number' || !r[0] || /^(Total|Avg)/.test(String(r[0]))) return; out.rows.push({ seg: String(r[0]), acc: r[6], fb: n(r[12]), rooms: n(r[18]), confirmed: n(r[14]), reserved: n(r[16]), allot: n(r[17]) }); });
      out.rows.sort(function (a, b) { return b.acc - a.acc; });
    } else if (/Block Forecast Report/.test(t)) {
      out = { kind: 'blocks', month: flat(aoa[1]).join('').trim(), rows: [] };
      aoa.forEach(function (r) { if (!r || !/^G[A-Z]\d+/.test(String(r[0]))) return; var days = []; for (var x = 4; x < 35; x++) if (n(r[x])) days.push(x - 3); out.rows.push({ ref: String(r[0]), name: String(r[1]), status: String(r[3]).replace(/\s+/g, ' '), total: n(r[35]), first: days[0], last: days[days.length - 1], nights: days.length }); });
    } else if (/Business Done Report/.test(t)) { out = { kind: 'bizdone', skipped: true };
    } else if (/Agent Commission Report/.test(t)) { out = { kind: 'commission', skipped: true };
    } else return null;
    return out;
  }
  function mergeReport(store, rep, meta) {
    store = store || {}; store.x = store.x || {}; store.received = store.received || [];
    if (rep.kind === 'blocks' && !rep.skipped) {
      /* one export per month: keep every month loaded, newest export of each */
      var prev = store.x.blocks && store.x.blocks.months ? store.x.blocks.months : {};
      prev[rep.month] = { rows: rep.rows, asOf: meta.asOf };
      store.x.blocks = { kind: 'blocks', months: prev, asOf: meta.asOf, file: meta.file };
    } else if (!rep.skipped) { rep.asOf = meta.asOf; rep.file = meta.file; store.x[rep.kind] = rep; }
    store.received.unshift({ ts: meta.asOf, kind: rep.kind, file: meta.file, rows: rep.count || (rep.rows ? rep.rows.length : rep.total || rep.nights || 0) });
    store.received = store.received.slice(0, 60);
    return store;
  }

  var api = { csv: csv, isAF: isAF, parseAF: parseAF, isPE: isPE, parsePE: parsePE, merge: merge, readReport: readReport, mergeReport: mergeReport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TradingEngine = api;
})(typeof window !== 'undefined' ? window : this);
