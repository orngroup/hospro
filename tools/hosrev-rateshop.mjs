#!/usr/bin/env node
/* ============================================================
   HosREV rate-shopper — SerpApi Google Hotels collector
   ------------------------------------------------------------
   Pulls the real displayed consumer nightly rate for Brandon
   Hall and its competitor set from Google Hotels (via SerpApi),
   adds a derived "Booking Genius" rate (shown − 10%), and writes
   hosrev-comp.json for the HosREV module to read.

   Run by .github/workflows/hosrev-rateshop.yml on a schedule.
   Needs the SERPAPI_KEY environment variable (a GitHub secret).

   Output shape (what hosrev.js expects):
   {
     "pulled": "2026-10-17T19:30:00.000Z",
     "source": "SerpApi Google Hotels",
     "mock": false,
     "geniusPct": 0.10,
     "byDate": {
       "2026-10-24": [
         { "hotel": "Brandon Hall Hotel and Spa", "own": true,
           "rate": 73, "genius": 66, "beforeTax": 61 },
         { "hotel": "Coombe Abbey Hotel", "rate": 140, "genius": 126, "beforeTax": 115 },
         ...
       ],
       ...
     }
   }
   ============================================================ */

// ---- Settings (override with env vars in the workflow if needed) ----
const API_KEY     = process.env.SERPAPI_KEY || "";
const DAYS_AHEAD  = parseInt(process.env.DAYS_AHEAD || "30", 10);   // how many check-in dates to shop
const ADULTS      = parseInt(process.env.ADULTS || "2", 10);
const CURRENCY    = process.env.CURRENCY || "GBP";
const GL          = process.env.GL || "uk";
const HL          = process.env.HL || "en";
const GENIUS_PCT  = 0.10;                                           // Booking Genius member discount
const OUT_FILE    = process.env.OUT_FILE || "hosrev-comp.json";

// Own hotel (shopped too, so we see our own position)
const OWN = { hotel: "Brandon Hall Hotel and Spa", match: ["brandon", "hall"], own: true };

// Competitor set — Patrik's list. `match` = all keywords must appear in the
// candidate name; `exclude` = none may appear (to disambiguate look-alikes).
const COMPETITORS = [
  { hotel: "Coombe Abbey Hotel",                               match: ["coombe", "abbey"] },
  { hotel: "DoubleTree by Hilton Coventry",                    match: ["doubletree", "coventry"], exclude: ["arena"] },
  { hotel: "Windmill Village Hotel, Golf Club & Spa",          match: ["windmill", "village"] },
  { hotel: "Novotel Coventry",                                 match: ["novotel", "coventry"] },
  { hotel: "Ramada Hotel & Suites by Wyndham Coventry",        match: ["ramada"] },
  { hotel: "Chesford Grange",                                  match: ["chesford", "grange"] },
  { hotel: "Nailcote Hall",                                    match: ["nailcote"] },
  { hotel: "Mallory Court",                                    match: ["mallory", "court"] },
];
const ALL = [OWN, ...COMPETITORS];

// ---- helpers ----
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const iso  = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function matchesTarget(name, t){
  const n = norm(name);
  if (t.exclude && t.exclude.some(k => n.includes(k))) return false;
  return t.match.every(k => n.includes(k));
}

let SEARCHES = 0;
async function serp(params){
  const url = "https://serpapi.com/search.json?" + new URLSearchParams(params).toString();
  SEARCHES++;
  for (let attempt = 1; attempt <= 3; attempt++){
    try{
      const r = await fetch(url);
      if (r.status === 429){ await sleep(2000 * attempt); continue; }   // rate limited — back off
      const j = await r.json();
      if (j.error) { console.warn("  SerpApi error:", j.error); return null; }
      return j;
    }catch(e){ console.warn("  fetch failed:", e.message); await sleep(1000 * attempt); }
  }
  return null;
}

/* Harvest every hotel + rate from a SerpApi response into a map keyed by
   normalised name. Prefers the clean `properties` rate; falls back to `ads`. */
function harvest(j, into){
  if (!j) return into;
  (j.properties || []).forEach(p => {
    const rate = p.rate_per_night && p.rate_per_night.extracted_lowest;
    if (!rate) return;
    into[norm(p.name)] = { name: p.name, rate,
      beforeTax: (p.rate_per_night && p.rate_per_night.extracted_before_taxes_fees) || null };
  });
  (j.ads || []).forEach(a => {
    const k = norm(a.name);
    if (into[k] || !a.extracted_price) return;   // don't overwrite a cleaner properties rate
    into[k] = { name: a.name, rate: a.extracted_price, beforeTax: null };
  });
  return into;
}

function pick(found, target){
  const hit = Object.values(found).find(c => matchesTarget(c.name, target));
  return hit || null;
}

async function shopDate(checkIn){
  const checkOut = iso(addDays(new Date(checkIn + "T12:00:00Z"), 1));
  const base = { engine: "google_hotels", gl: GL, hl: HL, currency: CURRENCY,
                 check_in_date: checkIn, check_out_date: checkOut, adults: String(ADULTS), api_key: API_KEY };

  // One broad search on our own hotel usually returns the Coventry cluster too.
  const found = {};
  harvest(await serp({ ...base, q: OWN.hotel + " Coventry" }), found);

  const out = [];
  for (const t of ALL){
    let hit = pick(found, t);
    if (!hit){                                   // not in the cluster — targeted search
      harvest(await serp({ ...base, q: t.hotel }), found);
      hit = pick(found, t);
    }
    if (!hit){ console.warn(`  [${checkIn}] no rate for ${t.hotel}`); continue; }
    const rate = Math.round(hit.rate);
    out.push({ hotel: t.hotel, ...(t.own ? { own: true } : {}),
      rate, genius: Math.round(rate * (1 - GENIUS_PCT)),
      ...(hit.beforeTax ? { beforeTax: Math.round(hit.beforeTax) } : {}) });
  }
  return out;
}

async function main(){
  if (!API_KEY){ console.error("SERPAPI_KEY is not set — aborting."); process.exit(1); }
  const today = new Date();
  const byDate = {};
  console.log(`Rate-shopping ${ALL.length} hotels across ${DAYS_AHEAD} check-in dates…`);
  for (let i = 0; i < DAYS_AHEAD; i++){
    const d = iso(addDays(today, i + 1));          // start from tomorrow's check-in
    const rows = await shopDate(d);
    if (rows.length) byDate[d] = rows;
    if ((i + 1) % 5 === 0) console.log(`  …${i + 1}/${DAYS_AHEAD} dates, ${SEARCHES} searches so far`);
  }

  const payload = {
    pulled: new Date().toISOString(),
    source: "SerpApi Google Hotels",
    mock: false,
    geniusPct: GENIUS_PCT,
    searches: SEARCHES,
    byDate,
  };
  const fs = await import("node:fs");
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 1));
  console.log(`\nDone. ${Object.keys(byDate).length} dates written to ${OUT_FILE}. Total searches: ${SEARCHES}.`);
}
main().catch(e => { console.error(e); process.exit(1); });
