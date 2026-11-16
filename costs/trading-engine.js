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
      var snap = {}; parsed.forEach(function (r) { if (r.d >= day) snap[r.d] = [r.rooms, Math.round(r.acc)]; });
      store.snaps[day] = snap;
    }
    if (kind === 'pe') { parsed.asOf = meta.asOf; store.pe[parsed.type + '|' + parsed.from] = parsed; }
    store.received.unshift({ ts: meta.asOf, kind: kind, file: meta.file, rows: kind === 'af' ? parsed.length : parsed.groups.length });
    store.received = store.received.slice(0, 60);
    return store;
  }

  var api = { csv: csv, isAF: isAF, parseAF: parseAF, isPE: isPE, parsePE: parsePE, merge: merge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TradingEngine = api;
})(typeof window !== 'undefined' ? window : this);
