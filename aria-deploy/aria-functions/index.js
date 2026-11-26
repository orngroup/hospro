/* ARIA functions — v1 (26 Nov 2026)
   Codebase "aria". Deployed on its own with:  firebase deploy --only functions:aria
   It adds ONE new function, ariaAsk. It does not change, replace or redeploy any existing function.
   It reads hotel data only through the existing HosBUSINESS endpoints, using the signed-in user's own token,
   so it can see exactly what that user can already see in HosBUSINESS and nothing more.
   It writes nothing to Firestore in v1. */
'use strict';
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Core = require('./aria-core.js');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY'); // the key the existing HosREV agent already uses
const FN = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/';
const MODEL = 'gemini-2.0-flash';
const ALLOWED_ORIGINS = ['https://brandon.hospro.co.uk', 'https://orngroup.github.io', 'http://localhost:8080'];

/* ---------- read-only data source over the existing endpoints ---------- */
function source(token) {
  const H = { Authorization: 'Bearer ' + token };
  async function get(path) {
    const r = await fetch(FN + path, { headers: H });
    if (r.status === 401 || r.status === 403) { const e = new Error('signin'); e.code = 401; throw e; }
    const j = await r.json().catch(() => null);
    return j;
  }
  return {
    days: async () => { const j = await get('glData'); return j && Array.isArray(j.days) ? { days: j.days.filter(d => d && d.d && d.ok !== false), to: j.to, built: j.built } : null; },
    forward: async () => { const j = await get('glAFGet'); if (!j || !j.ok || !j.csv) return null; return { rows: parseAF(j.csv), asOf: j.asOf, source: j.source }; },
    items: async (date) => { const j = await get('glItems?date=' + encodeURIComponent(date)); return j && j.ok ? j : null; },
    comp: async () => { const j = await get('hosrevComp'); return j && j.ok && j.snapshot ? { nights: j.snapshot.nights || [], ts: j.snapshot.ts || j.ts || null } : null; },
    tills: async () => null,     // till PLU report lives in the HosBUSINESS page data in v1; ARIA reads it in a later stage
    mealplan: async () => null,  // meal plan export: same
    flash: async () => { try { const j = await get('managerFlash'); return j && j.ok ? j.flash || j : null; } catch (e) { return null; } }
  };
}

/* Actual & Forecast CSV -> rows (same reading as HosBUSINESS trading-engine.js parseAF) */
function parseAF(text) {
  const rows = String(text).trim().split(/\r?\n/).map(l => { const o = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; });
  const h = rows[0] || [], ix = {}; h.forEach((k, i) => { ix[String(k).trim()] = i; });
  const n = v => { const x = parseFloat(String(v == null ? '' : v).replace(/[£,%\s]/g, '')); return isFinite(x) ? x : 0; };
  const iso = s => { s = String(s || '').trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : null; };
  const out = [];
  rows.slice(1).forEach(r => {
    const d = iso(r[ix.Date]); if (!d) return;
    const stock = n(r[ix.InStock]), occ = n(r[ix.Occ]);
    out.push({ d, listed: n(r[ix.Total]), blocks: n(r[ix.Blocks]), occPct: occ, rooms: Math.round(occ / 100 * (stock || 120)), ad: n(r[ix.Ad]), ch: n(r[ix.Ch]), acc: n(r[ix.Accomm]), fb: n(r[ix.FB]), oth: n(r[ix.Other]), roos: n(r[ix.ROOS]) });
  });
  return out;
}

/* ---------- Gemini tool loop ---------- */
function declarations(tools) {
  return Object.keys(tools).map(name => {
    const t = tools[name], props = {};
    Object.keys(t.params || {}).forEach(k => { const p = t.params[k]; props[k] = { type: 'STRING', description: p.description || '' }; if (p.enum) props[k].enum = p.enum; });
    const d = { name, description: t.description };
    if (Object.keys(props).length) d.parameters = { type: 'OBJECT', properties: props, required: t.required || [] };
    return d;
  });
}

async function gemini(key, body) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'AI request failed');
  return j;
}

function parseFinal(text) {
  const s = String(text || '').replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return { answer: s.slice(0, 400), points: [], show: [] }; }
}

async function answer(question, history, DS, key) {
  const tools = Core.makeTools(DS);
  const views = [], sources = new Set();
  const contents = [];
  (history || []).slice(-4).forEach(h => { if (h && h.q && h.a) { contents.push({ role: 'user', parts: [{ text: String(h.q).slice(0, 300) }] }); contents.push({ role: 'model', parts: [{ text: String(h.a).slice(0, 400) }] }); } });
  contents.push({ role: 'user', parts: [{ text: String(question).slice(0, 600) }] });
  const base = { systemInstruction: { parts: [{ text: Core.instructions() }] }, tools: [{ functionDeclarations: declarations(tools) }], generationConfig: { temperature: 0.1 } };

  for (let turn = 0; turn < 6; turn++) {
    const j = await gemini(key, Object.assign({ contents }, base));
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const calls = parts.filter(p => p.functionCall);
    if (!calls.length) {
      const out = parseFinal(parts.map(p => p.text || '').join(''));
      const want = Array.isArray(out.show) ? out.show : [];
      const chosen = want.map(id => views.find(v => v.id === id)).filter(Boolean);
      return { answer: out.answer || '', points: (out.points || []).slice(0, 6), basis: out.basis || '', views: chosen.length ? chosen : views.slice(0, 3), sources: Array.from(sources) };
    }
    contents.push({ role: 'model', parts: calls.map(c => ({ functionCall: c.functionCall })) });
    const replies = [];
    for (const c of calls) {
      const t = tools[c.functionCall.name];
      let res;
      try { res = t ? await t.run(c.functionCall.args || {}) : { error: 'Unknown tool' }; }
      catch (e) { if (e.code === 401) throw e; res = { error: 'Could not read that data just now.' }; }
      const ids = [];
      (res._views || []).forEach(v => { v.id = 'v' + (views.length + 1); views.push(v); ids.push(v.id + ': ' + v.type + ' "' + v.title + '"'); if (v.source) sources.add(v.source); });
      const payload = Core.forModel(res); if (ids.length) payload.views = ids;
      replies.push({ functionResponse: { name: c.functionCall.name, response: { content: payload } } });
    }
    contents.push({ role: 'user', parts: replies });
  }
  return { answer: 'That question needed more steps than ARIA allows in one go. Try asking it in two parts.', points: [], views: views.slice(0, 3), sources: Array.from(sources) };
}

exports.ariaAsk = onRequest({ region: 'europe-west2', secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: '512MiB', maxInstances: 5 }, async (req, res) => {
  const origin = req.get('origin') || '';
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') { res.set('Access-Control-Allow-Methods', 'POST'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); return res.status(204).send(''); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  /* Format check only. The token is proved by the existing endpoints: if they refuse it, ARIA refuses too. */
  if (!/^\d+\.[A-Za-z0-9_\-+/=]+$/.test(token)) return res.status(401).json({ ok: false, error: 'Please sign in with your HosBUSINESS login.' });
  const q = String((req.body && req.body.question) || '').trim();
  if (!q || q.length > 600) return res.status(400).json({ ok: false, error: 'Ask a question of up to 600 characters.' });
  try {
    const out = await answer(q, req.body.history, source(token), GEMINI_API_KEY.value());
    res.json(Object.assign({ ok: true, engine: MODEL }, out));
  } catch (e) {
    if (e.code === 401) return res.status(401).json({ ok: false, error: 'Your HosBUSINESS sign-in has expired. Please sign in again.' });
    console.error('ariaAsk', e && e.message);
    res.status(500).json({ ok: false, error: 'ARIA could not answer just now. Please try again.' });
  }
});
