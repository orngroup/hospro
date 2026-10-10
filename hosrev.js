/* ============================================================
   HosREV — Revenue management module for HosPRO
   Ninth module. Reads on-the-books, competitor rates, local
   events and our own diary; recommends a rate per room type
   per night that maximises NET room profit, with guardrails
   and human approval.

   Phase 1: recommend + approve. No automatic rate push yet.

   Data model (Firestore collections, local fallback):
     hosrev_settings/config   — room types, rate rules, costs,
                                 commission, budget, comp set,
                                 locked dates, general settings
     hosrev_books/<date>      — on-the-books snapshot per night
     hosrev_comp/<date>       — competitor rates per night
     hosrev_events/<id>       — local + own events
     hosrev_decisions/<id>    — approve / override log

   Loads BEFORE app.js so these render functions exist when
   app.js builds RENDER_MAP.
   ============================================================ */

/* ---------- Store: Firestore with localStorage fallback ---------- */
const HosrevStore = {
  _settings: null,
  _books: {},     // date -> {rooms, sold, byType, revenue, ooo, held}
  _comp: {},      // date -> [{hotel, rate}]
  _events: [],
  _decisions: [],

  _lsGet(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
  _lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} },

  /* --- settings --- */
  async loadSettings(){
    if(typeof FB!=="undefined" && FB.ready && FB.user){
      try{ const d=await FB.db.collection("hosrev_settings").doc("config").get();
        if(d.exists){ this._settings=d.data(); return this._settings; } }catch(e){ console.warn("hosrev settings:",e.message); }
    }
    this._settings = this._lsGet("hosrev_settings", null) || HOSREV_DEFAULTS();
    return this._settings;
  },
  async saveSettings(s){
    this._settings=s; this._lsSet("hosrev_settings", s);
    if(typeof FB!=="undefined" && FB.ready && FB.user){
      try{ await FB.db.collection("hosrev_settings").doc("config").set(s); }catch(e){ console.warn("hosrev save:",e.message); }
    }
  },
  settings(){ return this._settings || (this._settings = this._lsGet("hosrev_settings", null) || HOSREV_DEFAULTS()); },

  /* --- on-the-books (per-night snapshot) --- */
  books(date){ return this._books[date] || null; },
  setBooks(map){ this._books = map; this._lsSet("hosrev_books", map); },
  loadBooksLocal(){ this._books = this._lsGet("hosrev_books", {}); if(!Object.keys(this._books).length){ this._books = HOSREV_SEED_BOOKS(); this._lsSet("hosrev_books", this._books); } },

  /* --- competitor rates --- */
  comp(date){ return this._comp[date] || []; },
  setComp(map){ this._comp = map; this._lsSet("hosrev_comp", map); },
  loadCompLocal(){ this._comp = this._lsGet("hosrev_comp", {}); if(!Object.keys(this._comp).length){ this._comp = HOSREV_SEED_COMP(); this._lsSet("hosrev_comp", this._comp); } },

  /* --- events --- */
  events(){ return this._events; },
  loadEventsLocal(){ this._events = this._lsGet("hosrev_events", null) || HOSREV_SEED_EVENTS(); this._lsSet("hosrev_events", this._events); },
  addEvent(ev){ this._events.unshift(ev); this._lsSet("hosrev_events", this._events);
    if(typeof FB!=="undefined" && FB.ready && FB.user){ try{ FB.db.collection("hosrev_events").add(ev); }catch{} } },

  /* --- decisions (approve / override) --- */
  decisions(){ return this._decisions; },
  loadDecisionsLocal(){ this._decisions = this._lsGet("hosrev_decisions", []); },
  logDecision(d){ d.when=new Date().toISOString(); d.by=(typeof SESSION!=="undefined"&&SESSION&&SESSION.name)||"—";
    this._decisions.unshift(d); this._lsSet("hosrev_decisions", this._decisions);
    if(typeof FB!=="undefined" && FB.ready && FB.user){ try{ FB.db.collection("hosrev_decisions").add(d); }catch{} } },
  decisionFor(date, type){ return this._decisions.find(d=>d.date===date && d.roomType===type) || null; },

  init(){ this.settings(); this.loadBooksLocal(); this.loadCompLocal(); this.loadEventsLocal(); this.loadDecisionsLocal(); }
};

/* ---------- Default settings (editable on the Settings screen) ---------- */
function HOSREV_DEFAULTS(){
  return {
    roomTypes:[
      { name:"Classic Double", rooms:40, floor:79,  ceiling:249, bar:119 },
      { name:"Superior Double",rooms:34, floor:89,  ceiling:279, bar:139 },
      { name:"Feature / Four-Poster", rooms:16, floor:109, ceiling:329, bar:169 },
      { name:"Twin", rooms:26, floor:79, ceiling:239, bar:119 },
      { name:"Accessible", rooms:4, floor:79, ceiling:239, bar:119 }
    ],
    costPerRoom:28.0,           // housekeeping + laundry + amenities + energy
    commission:[                // % of rate, by channel, with share of nights
      { channel:"Direct website", pct:0.00, share:0.28 },
      { channel:"Phone / email direct", pct:0.00, share:0.10 },
      { channel:"Booking.com", pct:0.15, share:0.34 },
      { channel:"Expedia", pct:0.15, share:0.10 },
      { channel:"GDS / corporate", pct:0.10, share:0.12 },
      { channel:"Agents / tour operators", pct:0.12, share:0.06 }
    ],
    extraProfitPerRoom:22.0,    // avg food+drink+spa PROFIT per occupied room (Total Venue Value)
    general:{ window:30, maxWindow:365, quietThreshold:0.55, compressionPct:0.12, maxDailyChangePct:0.15, currency:"GBP" },
    lockedDates:[ { from:"2026-12-24", to:"2026-12-26", rate:189, reason:"Christmas package (3 nights)" } ]
  };
}

/* ---------- Seed data (clearly flagged demo until Guestline + rate feed connect) ---------- */
function HOSREV_todayISO(){ return new Date().toISOString().slice(0,10); }
function HOSREV_addDays(iso, n){ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function HOSREV_dow(iso){ return new Date(iso+"T00:00:00").getDay(); } // 0 Sun .. 6 Sat

function HOSREV_SEED_BOOKS(){
  const map={}; const total=120; const start=HOSREV_todayISO();
  for(let i=0;i<40;i++){
    const d=HOSREV_addDays(start,i); const dow=HOSREV_dow(d);
    // weekends and lead-time build a plausible curve
    const base = (dow===5||dow===6) ? 0.70 : (dow===0?0.40:0.52);
    const lead = Math.max(0.25, 1 - i*0.018);
    const sold = Math.round(total * base * lead * (0.9+Math.random()*0.2));
    map[d] = { rooms:total, sold:Math.min(sold,total), revenue:Math.round(sold*(120+(dow>=5?35:0))), ooo:(i%11===0?2:0), held:(dow===6?14:0), demo:true };
  }
  return map;
}
function HOSREV_SEED_COMP(){
  const map={}; const start=HOSREV_todayISO();
  const hotels=["Coombe Abbey","Macdonald Ansty Hall","Chesford Grange","Nailcote Hall","DoubleTree Coventry","Mallory Court"];
  for(let i=0;i<40;i++){
    const d=HOSREV_addDays(start,i); const dow=HOSREV_dow(d);
    const wk=(dow===5||dow===6)?1.22:1.0;
    map[d]=hotels.map((h,idx)=>({ hotel:h, rate:Math.round((115+idx*14)*wk*(0.95+Math.random()*0.12)) }));
  }
  return map;
}
function HOSREV_SEED_EVENTS(){
  return [
    { date:"2026-10-24", name:"Coventry City v Fulham", venue:"CBS Arena", type:"Football", impact:4, attendance:28000, demo:true },
    { date:"2026-10-31", name:"Coventry City v Sunderland", venue:"CBS Arena", type:"Football", impact:4, attendance:28000, demo:true },
    { date:"2026-11-21", name:"Coventry City v Crystal Palace", venue:"CBS Arena", type:"Football", impact:4, attendance:30000, demo:true },
    { date:"2026-11-29", name:"Winter Tattoo Festival", venue:"CBS Arena", type:"Exhibition", impact:3, attendance:6000, demo:true },
    { date:"2026-12-24", name:"Christmas package", venue:"Brandon Hall", type:"Own", impact:5, attendance:0, demo:true }
  ];
}

/* ============================================================
   PRICING ENGINE  (maths sets the price; the brief explains it)
   Profit(p) = ( p(1-c) - v + a ) * min( D(p), C )
   ============================================================ */
function hosrevCommissionBlend(s){
  const c=s.commission||[]; const tot=c.reduce((a,x)=>a+(x.share||0),0)||1;
  return c.reduce((a,x)=>a+(x.pct||0)*(x.share||0),0)/tot;
}
function hosrevEventScore(date, events){
  const e=(events||[]).filter(x=>x.date===date);
  if(!e.length) return 0;
  return Math.max(...e.map(x=>x.impact||0));
}
function hosrevLockedFor(date, s){
  return (s.lockedDates||[]).find(l=>date>=l.from && date<=l.to) || null;
}
/* Forecast final occupancy for a night: booked + expected remaining pickup,
   lifted by event score and competitor compression. 0..1 */
function hosrevForecastOcc(date, idx, book, compMedian, ourRate, s, events){
  if(!book || !book.rooms) return 0;
  const cap = book.rooms - (book.ooo||0);
  const bookedOcc = book.sold / cap;
  const lead = idx;                                   // nights out
  const dow = HOSREV_dow(date);
  // typical share of final bookings still to come, by lead time
  const toCome = Math.min(0.55, 0.02*lead + (dow>=5?0.05:0.10));
  let fc = bookedOcc + toCome*(1-bookedOcc);
  const ev = hosrevEventScore(date, events);
  fc += ev*0.03;                                      // event lift
  // competitor signal: if we are well below median, more pickup; above, less
  if(compMedian){ const rel=(ourRate-compMedian)/compMedian; fc -= rel*0.25; }
  return Math.max(0, Math.min(1, fc));
}
/* Core recommendation for one room type on one night */
function hosrevRecommend(date, idx, rt, s, book, comp, events){
  const cap = (book? (book.rooms-(book.ooo||0)) : rt.rooms) ;
  const held = book? (book.held||0) : 0;
  const sellable = Math.max(0, cap - held);
  const c = hosrevCommissionBlend(s);
  const v = s.costPerRoom||0;
  const a = s.extraProfitPerRoom||0;
  const rates = (comp||[]).map(x=>x.rate).filter(Boolean).sort((x,y)=>x-y);
  const compMedian = rates.length ? rates[Math.floor(rates.length/2)] : rt.bar;
  const current = rt.bar;
  const ev = hosrevEventScore(date, events);
  const locked = hosrevLockedFor(date, s);

  // search floor..ceiling for the price with highest expected net profit
  let best={p:current, profit:-1, occ:0};
  for(let p=rt.floor; p<=rt.ceiling; p++){
    // demand response: relative to comp median, with event-sensitised elasticity
    const rel = compMedian? (p-compMedian)/compMedian : 0;
    const elasticity = (HOSREV_dow(date)>=5? 0.9 : 1.3) - ev*0.12; // event nights less elastic
    let occ = hosrevForecastOcc(date, idx, book, compMedian, p, s, events);
    occ = Math.max(0, Math.min(1, occ * (1 - elasticity*rel)));
    const demandRooms = occ * sellable;
    const perRoom = p*(1-c) - v + a;
    const profit = perRoom * Math.min(demandRooms, sellable);
    if(profit>best.profit) best={p, profit, occ};
  }
  // guardrails
  let rec = best.p;
  const maxChange = Math.round(current * (s.general?.maxDailyChangePct||0.15));
  if(rec > current+maxChange) rec = current+maxChange;
  if(rec < current-maxChange) rec = current-maxChange;
  rec = Math.max(rt.floor, Math.min(rt.ceiling, rec));
  if(locked && locked.rate) rec = locked.rate;

  // reasons
  const reasons=[];
  if(locked) reasons.push(`Locked: ${locked.reason}`);
  if(ev>=4) reasons.push(`Major event (${events.find(e=>e.date===date)?.name||"event"} nearby)`);
  else if(ev>0) reasons.push(`Local event, impact ${ev}/5`);
  if(compMedian){ const d=Math.round(rec-compMedian);
    reasons.push(`Comp median £${compMedian}${d>=0?` (we are £${d} above)`:` (we are £${-d} below)`}`); }
  if(best.occ>=0.9) reasons.push(`High forecast occupancy (${Math.round(best.occ*100)}%)`);
  else if(best.occ<=0.5) reasons.push(`Soft night (${Math.round(best.occ*100)}% forecast)`);
  if(!reasons.length) reasons.push("Matched to demand and comp set");

  const perRoomNet = rec*(1-c) - v + a;
  return {
    date, roomType:rt.name, current, rec, compMedian,
    change: rec-current, changePct: current? (rec-current)/current : 0,
    forecastOcc: best.occ, netPerRoom: perRoomNet, eventScore:ev,
    confidence: ev>=4?"High": (Math.abs(rec-current)>maxChange*0.8?"Medium":"High"),
    reasons: reasons.slice(0,3), locked:!!locked
  };
}

/* ---------- small helpers that mirror app.js style ---------- */
function hrEl(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
function hrMoney(n){ return "£"+Math.round(n).toLocaleString("en-GB"); }
function hrDowName(iso){ return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][HOSREV_dow(iso)]; }
function hrFmtDate(iso){ const d=new Date(iso+"T00:00:00"); return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}); }

/* ============================================================ RENDER: Dashboard + AI brief */
function renderRevDash(v){
  HosrevStore.init();
  const s=HosrevStore.settings(); const start=HOSREV_todayISO();
  const rt=s.roomTypes[0];
  // build 30-night recommendations for the lead room type to drive the brief
  const recs=[];
  for(let i=0;i<(s.general.window||30);i++){
    const d=HOSREV_addDays(start,i);
    recs.push(hosrevRecommend(d, i, rt, s, HosrevStore.books(d), HosrevStore.comp(d), HosrevStore.events()));
  }
  const movers = recs.filter(r=>Math.abs(r.changePct)>=0.05).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,5);
  const quiet = recs.filter(r=>r.forecastOcc<=(s.general.quietThreshold||0.55)).slice(0,5);
  const demo = HosrevStore.books(start)?.demo;

  v.innerHTML = `
    <div class="page-head"><h2>HosREV — Today at a glance</h2>
      <p>Maximising net room margin across the next ${s.general.window} nights. ${demo?'<b style="color:#c07a3e">Demo data</b> — connect Guestline and a rate feed to go live.':''}</p></div>
    <div class="hr-brief">
      <div class="hr-brief-h">🧠 Morning brief — ${new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
      <p>${hosrevBriefText(recs, movers, quiet, s)}</p>
    </div>
    <div class="sf-stats6" style="margin-top:16px">
      ${hrStat("📅","Nights priced", s.general.window)}
      ${hrStat("⬆️","Rate moves suggested", movers.length)}
      ${hrStat("🌙","Quiet nights flagged", quiet.length)}
      ${hrStat("💷","Avg suggested rate", hrMoney(recs.reduce((a,r)=>a+r.rec,0)/recs.length))}
      ${hrStat("📊","Comp median (avg)", hrMoney(recs.reduce((a,r)=>a+(r.compMedian||0),0)/recs.length))}
      ${hrStat("🎟","Event nights", HosrevStore.events().filter(e=>e.date>=start).length)}
    </div>
    <div class="hr-cols">
      <div class="sf-panel">
        <div class="sf-panel-head"><h3>Dates needing a decision</h3><a class="sf-link" onclick="switchTab('revCalendar')">Open calendar →</a></div>
        ${movers.length? movers.map(r=>`
          <div class="hr-rowline">
            <div><b>${hrDowName(r.date)} ${hrFmtDate(r.date)}</b> · ${r.roomType}</div>
            <div class="hr-move ${r.change>=0?'up':'down'}">${r.change>=0?'▲':'▼'} ${hrMoney(r.current)} → <b>${hrMoney(r.rec)}</b></div>
          </div>`).join("") : '<p class="hr-muted">No material changes suggested — current rates look right.</p>'}
      </div>
      <div class="sf-panel">
        <div class="sf-panel-head"><h3>Quiet nights to fill</h3><a class="sf-link" onclick="switchTab('revForecast')">Forecast →</a></div>
        ${quiet.length? quiet.map(r=>`
          <div class="hr-rowline">
            <div><b>${hrDowName(r.date)} ${hrFmtDate(r.date)}</b></div>
            <div class="hr-muted">${Math.round(r.forecastOcc*100)}% forecast · try an offer</div>
          </div>`).join("") : '<p class="hr-muted">No soft nights in the window — healthy pickup.</p>'}
      </div>
    </div>`;
}
function hosrevBriefText(recs, movers, quiet, s){
  const avg = recs.reduce((a,r)=>a+r.rec,0)/recs.length;
  let txt = `Across the next ${s.general.window} nights the engine suggests an average rate of <b>${hrMoney(avg)}</b>. `;
  if(movers.length){ const m=movers[0];
    txt += `The biggest call is <b>${hrDowName(m.date)} ${hrFmtDate(m.date)}</b>: ${m.reasons[0]}, move ${m.roomType} from ${hrMoney(m.current)} to <b>${hrMoney(m.rec)}</b> (${m.change>=0?'+':''}${Math.round(m.changePct*100)}%). `; }
  else txt += `No material rate changes are needed today. `;
  if(quiet.length) txt += `${quiet.length} night${quiet.length>1?'s are':' is'} soft and worth a targeted offer. `;
  return txt;
}
function hrStat(ic,k,val){ return `<div class="sf-stat"><div class="sf-stat-ic" style="background:#E2F0F3">${ic}</div><div><span class="sf-stat-v">${val}</span><span class="sf-stat-k">${k}</span></div></div>`; }

/* ============================================================ RENDER: Rate calendar */
let HR_CAL_RT = 0;
function renderRevCalendar(v){
  HosrevStore.init();
  const s=HosrevStore.settings(); const start=HOSREV_todayISO();
  const rt=s.roomTypes[HR_CAL_RT]||s.roomTypes[0];
  const rows=[];
  for(let i=0;i<(s.general.window||30);i++){
    const d=HOSREV_addDays(start,i);
    rows.push(hosrevRecommend(d, i, rt, s, HosrevStore.books(d), HosrevStore.comp(d), HosrevStore.events()));
  }
  v.innerHTML = `
    <div class="page-head"><h2>Rate calendar</h2>
      <p>Recommended rate per night. Approve in one tap, override with a reason, or lock a date.</p></div>
    <div class="hr-rtbar">
      ${s.roomTypes.map((r,i)=>`<button class="hr-pill ${i===HR_CAL_RT?'on':''}" onclick="HR_CAL_RT=${i};render()">${r.name}</button>`).join("")}
    </div>
    <table class="pipe-table hr-cal">
      <thead><tr>
        <th>Night</th><th>On books</th><th>Fcast occ</th><th>Comp median</th>
        <th>Current</th><th>Recommended</th><th>Net / room</th><th>Why</th><th>Decision</th>
      </tr></thead>
      <tbody>
      ${rows.map(r=>{
        const book=HosrevStore.books(r.date); const dec=HosrevStore.decisionFor(r.date, r.roomType);
        const occ=book? Math.round(book.sold/(book.rooms-(book.ooo||0))*100):0;
        const wknd=HOSREV_dow(r.date)>=5;
        return `<tr class="${wknd?'hr-wknd':''}">
          <td><b>${hrDowName(r.date)}</b> ${hrFmtDate(r.date)} ${r.eventScore>=3?'🎟':''}${r.locked?'🔒':''}</td>
          <td>${book?book.sold:'—'}${book&&book.held?` <span class="hr-muted">(+${book.held} held)</span>`:''}</td>
          <td>${Math.round(r.forecastOcc*100)}%</td>
          <td>${r.compMedian?hrMoney(r.compMedian):'—'}</td>
          <td>${hrMoney(r.current)}</td>
          <td><b class="hr-move ${r.change>0?'up':r.change<0?'down':''}">${hrMoney(r.rec)}</b> ${r.change?`<span class="hr-muted">${r.change>0?'+':''}${Math.round(r.changePct*100)}%</span>`:''}</td>
          <td>${hrMoney(r.netPerRoom)}</td>
          <td class="hr-why">${r.reasons.map(x=>`<span class="hr-tag">${x}</span>`).join("")}</td>
          <td class="hr-dec">${dec? `<span class="hr-done">${dec.action==='approve'?'✓ Approved':'✎ '+hrMoney(dec.rate)}</span>`
            : `<button class="mini-btn" onclick="hosrevApprove('${r.date}','${r.roomType.replace(/'/g,"")}',${r.rec})">Approve</button>
               <button class="mini-btn hr-ghost" onclick="hosrevOverride('${r.date}','${r.roomType.replace(/'/g,"")}',${r.rec})">Override</button>`}</td>
        </tr>`;}).join("")}
      </tbody>
    </table>
    <p class="hr-muted" style="margin-top:12px">Decisions are logged with who and when (see Performance scorecard later). No rates are pushed to Guestline in Phase 1.</p>`;
}
function hosrevApprove(date, roomType, rate){
  HosrevStore.logDecision({ date, roomType, action:"approve", rate });
  if(typeof toast==="function") toast(`✓ Approved ${hrMoney(rate)} for ${roomType} on ${hrFmtDate(date)}`);
  render();
}
function hosrevOverride(date, roomType, rec){
  const val=prompt(`Override rate for ${roomType} on ${hrFmtDate(date)} (recommended ${hrMoney(rec)}). Enter new rate £:`, rec);
  if(val==null) return;
  const rate=parseInt(val,10); if(isNaN(rate)) return;
  const why=prompt("Reason for the override (logged):","")||"";
  HosrevStore.logDecision({ date, roomType, action:"override", rate, recommended:rec, reason:why });
  if(typeof toast==="function") toast(`✎ Override saved: ${hrMoney(rate)}`);
  render();
}

/* ============================================================ RENDER: Competitors */
function renderRevCompset(v){
  HosrevStore.init();
  const s=HosrevStore.settings(); const start=HOSREV_todayISO();
  const rt=s.roomTypes[0];
  const hotels=[...new Set(Object.values(HosrevStore._comp).flat().map(x=>x.hotel))];
  const days=[]; for(let i=0;i<14;i++) days.push(HOSREV_addDays(start,i));
  v.innerHTML = `
    <div class="page-head"><h2>Competitors</h2>
      <p>Our ${rt.name} rate against the comp set for the next 14 nights. Compression alerts fire when a competitor jumps more than ${Math.round((s.general.compressionPct||0.12)*100)}% overnight.</p></div>
    <div class="hr-scroll">
    <table class="pipe-table hr-matrix">
      <thead><tr><th>Hotel</th>${days.map(d=>`<th>${hrDowName(d)}<br>${hrFmtDate(d)}</th>`).join("")}</tr></thead>
      <tbody>
        <tr class="hr-ourrow"><td><b>Brandon Hall (us)</b></td>${days.map(d=>{
          const r=hosrevRecommend(d, days.indexOf(d), rt, s, HosrevStore.books(d), HosrevStore.comp(d), HosrevStore.events());
          return `<td><b>${hrMoney(r.rec)}</b></td>`;}).join("")}</tr>
        ${hotels.map(h=>`<tr><td>${h}</td>${days.map(d=>{
          const rec=HosrevStore.comp(d).find(x=>x.hotel===h); return `<td>${rec?hrMoney(rec.rate):'—'}</td>`;}).join("")}</tr>`).join("")}
        <tr class="hr-medrow"><td><i>Comp median</i></td>${days.map(d=>{
          const rates=HosrevStore.comp(d).map(x=>x.rate).sort((a,b)=>a-b); const m=rates[Math.floor(rates.length/2)];
          return `<td><i>${m?hrMoney(m):'—'}</i></td>`;}).join("")}</tr>
      </tbody>
    </table></div>
    <div class="sf-panel" style="margin-top:16px">
      <div class="sf-panel-head"><h3>Comp set</h3><a class="sf-link" onclick="switchTab('revSettings')">Edit in Settings →</a></div>
      <p class="hr-muted">Rate feed not yet connected — showing demo rates. Phase 1 connects a licensed rate shopper (Lighthouse or Makcorps) so these are live. We never scrape OTAs directly.</p>
    </div>`;
}

/* ============================================================ RENDER: Events */
function renderRevEvents(v){
  HosrevStore.init();
  const start=HOSREV_todayISO();
  const evs=HosrevStore.events().filter(e=>e.date>=start).sort((a,b)=>a.date<b.date?-1:1);
  v.innerHTML = `
    <div class="page-head"><h2>Events &amp; demand drivers</h2>
      <p>Local events within ~20 miles and our own diary, scored 1–5 for pricing impact. Add anything the feed misses.</p></div>
    <button class="btn sm" style="margin-bottom:14px;background:#1F7A8C" onclick="hosrevAddEvent()">+ Add event</button>
    <table class="pipe-table">
      <thead><tr><th>Date</th><th>Event</th><th>Venue</th><th>Type</th><th>Impact</th><th>Attendance</th></tr></thead>
      <tbody>
      ${evs.map(e=>`<tr>
        <td><b>${hrDowName(e.date)}</b> ${hrFmtDate(e.date)}</td>
        <td>${e.name}</td><td>${e.venue||'—'}</td><td>${e.type||'—'}</td>
        <td>${'★'.repeat(e.impact||0)}<span class="hr-muted">${'☆'.repeat(5-(e.impact||0))}</span></td>
        <td>${e.attendance? e.attendance.toLocaleString("en-GB"):'—'}</td></tr>`).join("")}
      </tbody>
    </table>
    <p class="hr-muted" style="margin-top:12px">Phase 2 adds a PredictHQ events feed and weather. Our own weddings and groups will read directly from HosVENUE and HosSALES.</p>`;
}
function hosrevAddEvent(){
  const name=prompt("Event name:"); if(!name) return;
  const date=prompt("Date (YYYY-MM-DD):", HOSREV_todayISO()); if(!date) return;
  const venue=prompt("Venue:","")||"";
  const impact=parseInt(prompt("Impact 1–5:","3"),10)||3;
  HosrevStore.addEvent({ date, name, venue, type:"Manual", impact, attendance:0 });
  if(typeof toast==="function") toast("Event added");
  render();
}

/* ============================================================ RENDER: Forecast & margin */
function renderRevForecast(v){
  HosrevStore.init();
  const s=HosrevStore.settings(); const start=HOSREV_todayISO();
  const rt=s.roomTypes[0]; const c=hosrevCommissionBlend(s);
  const rows=[];
  for(let i=0;i<(s.general.window||30);i++){
    const d=HOSREV_addDays(start,i); const book=HosrevStore.books(d);
    const r=hosrevRecommend(d, i, rt, s, book, HosrevStore.comp(d), HosrevStore.events());
    rows.push({ d, book, r });
  }
  const avgOcc = rows.reduce((a,x)=>a+x.r.forecastOcc,0)/rows.length;
  const avgNet = rows.reduce((a,x)=>a+x.r.netPerRoom,0)/rows.length;
  v.innerHTML = `
    <div class="page-head"><h2>Forecast &amp; margin</h2>
      <p>Net room profit = rate − commission − cost per room + extra spend profit. Blended commission ${Math.round(c*100)}%, cost ${hrMoney(s.costPerRoom)}/room, extra ${hrMoney(s.extraProfitPerRoom)}/room.</p></div>
    <div class="sf-stats6" style="margin-bottom:16px">
      ${hrStat("📈","Avg forecast occ", Math.round(avgOcc*100)+"%")}
      ${hrStat("💷","Avg net / room", hrMoney(avgNet))}
      ${hrStat("🧮","Blended commission", Math.round(c*100)+"%")}
      ${hrStat("🌙","Quiet nights", rows.filter(x=>x.r.forecastOcc<=(s.general.quietThreshold||0.55)).length)}
      ${hrStat("💍","Held (weddings)", rows.reduce((a,x)=>a+(x.book?.held||0),0))}
      ${hrStat("🔧","Rooms out of order", rows.reduce((a,x)=>a+(x.book?.ooo||0),0))}
    </div>
    <table class="pipe-table">
      <thead><tr><th>Night</th><th>On books</th><th>Forecast occ</th><th>Rec rate</th><th>Net / room</th><th>Forecast net (room rev)</th></tr></thead>
      <tbody>
      ${rows.map(x=>{ const cap=x.book?(x.book.rooms-(x.book.ooo||0)):rt.rooms;
        const fnet=Math.round(x.r.netPerRoom * x.r.forecastOcc * cap);
        return `<tr class="${HOSREV_dow(x.d)>=5?'hr-wknd':''}">
          <td><b>${hrDowName(x.d)}</b> ${hrFmtDate(x.d)}</td>
          <td>${x.book?x.book.sold:'—'}</td>
          <td>${Math.round(x.r.forecastOcc*100)}%</td>
          <td>${hrMoney(x.r.rec)}</td>
          <td>${hrMoney(x.r.netPerRoom)}</td>
          <td><b>${hrMoney(fnet)}</b></td></tr>`;}).join("")}
      </tbody>
    </table>`;
}

/* ============================================================ RENDER: Guestline import */
function renderRevImport(v){
  HosrevStore.init();
  const dates=Object.keys(HosrevStore._books).sort();
  const demo=HosrevStore.books(HOSREV_todayISO())?.demo;
  v.innerHTML = `
    <div class="page-head"><h2>Guestline import</h2>
      <p>Upload the daily Rezlynx on-the-books export (CSV). Phase 2 replaces this with the Guestline API. A daily snapshot is kept so booking curves build from day one.</p></div>
    <div class="sf-panel">
      <div class="sf-panel-head"><h3>Upload export</h3></div>
      <p class="hr-muted" style="margin-bottom:10px">CSV columns expected: <code>date, rooms_available, rooms_sold, room_revenue, out_of_order, held</code>. Extra columns are ignored.</p>
      <input type="file" id="hr-file" accept=".csv" class="gc-f" style="max-width:360px">
      <button class="btn sm" style="background:#1F7A8C;margin-left:8px" onclick="hosrevImportCsv()">Import</button>
      <div id="hr-import-msg" class="hr-muted" style="margin-top:10px"></div>
    </div>
    <div class="sf-panel" style="margin-top:16px">
      <div class="sf-panel-head"><h3>Data on file</h3>${demo?'<span class="mode-badge" style="background:#fdf0e3;color:#c07a3e">Demo data</span>':''}</div>
      <p>${dates.length} night${dates.length===1?'':'s'} loaded${dates.length?` (${hrFmtDate(dates[0])} – ${hrFmtDate(dates[dates.length-1])})`:''}.
      Data as of <b>${new Date().toLocaleString("en-GB")}</b>.</p>
      ${demo?'<button class="btn sm hr-ghost" style="margin-top:10px" onclick="hosrevClearDemo()">Clear demo data</button>':''}
    </div>`;
}
function hosrevImportCsv(){
  const inp=document.getElementById("hr-file"); const msg=document.getElementById("hr-import-msg");
  if(!inp.files||!inp.files[0]){ msg.textContent="Choose a CSV file first."; return; }
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const lines=rd.result.split(/\r?\n/).filter(l=>l.trim());
      const head=lines[0].split(",").map(h=>h.trim().toLowerCase());
      const ix=n=>head.indexOf(n);
      const map={...HosrevStore._books};
      let n=0;
      for(let i=1;i<lines.length;i++){
        const c=lines[i].split(",");
        const date=(c[ix("date")]||"").trim(); if(!date) continue;
        map[date]={ rooms:+c[ix("rooms_available")]||120, sold:+c[ix("rooms_sold")]||0,
          revenue:+c[ix("room_revenue")]||0, ooo:+c[ix("out_of_order")]||0, held:+c[ix("held")]||0 };
        n++;
      }
      HosrevStore.setBooks(map);
      if(typeof FB!=="undefined" && FB.ready && FB.user){ Object.entries(map).forEach(([d,rec])=>{ try{ FB.db.collection("hosrev_books").doc(d).set({...rec, snapshot:new Date().toISOString()}); }catch{} }); }
      msg.innerHTML=`<b style="color:#2a6a4a">Imported ${n} night${n===1?'':'s'}.</b> Rate calendar is now using live data.`;
    }catch(e){ msg.textContent="Could not read that file: "+e.message; }
  };
  rd.readAsText(inp.files[0]);
}
function hosrevClearDemo(){ localStorage.removeItem("hosrev_books"); localStorage.removeItem("hosrev_comp"); HosrevStore._books={}; HosrevStore._comp={}; render(); }

/* ============================================================ RENDER: Settings */
function renderRevSettings(v){
  HosrevStore.init();
  const s=HosrevStore.settings();
  v.innerHTML = `
    <div class="page-head"><h2>HosREV settings</h2>
      <p>The one-off setup data. Edit here or import the setup spreadsheet. Changes feed the pricing engine immediately.</p></div>

    <div class="sf-panel"><div class="sf-panel-head"><h3>Room types &amp; rate rules</h3></div>
      <table class="pipe-table"><thead><tr><th>Room type</th><th>Rooms</th><th>Floor £</th><th>Ceiling £</th><th>Current BAR £</th></tr></thead>
      <tbody>${s.roomTypes.map((r,i)=>`<tr>
        <td>${r.name}</td>
        <td><input class="mne-edit hr-in" value="${r.rooms}" onchange="hosrevSet(${i},'rooms',this.value)"></td>
        <td><input class="mne-edit hr-in" value="${r.floor}" onchange="hosrevSet(${i},'floor',this.value)"></td>
        <td><input class="mne-edit hr-in" value="${r.ceiling}" onchange="hosrevSet(${i},'ceiling',this.value)"></td>
        <td><input class="mne-edit hr-in" value="${r.bar}" onchange="hosrevSet(${i},'bar',this.value)"></td>
      </tr>`).join("")}</tbody></table>
    </div>

    <div class="hr-cols" style="margin-top:16px">
      <div class="sf-panel"><div class="sf-panel-head"><h3>Costs &amp; value</h3></div>
        <label class="hr-lbl">Cost per occupied room £
          <input class="mne-edit hr-in" value="${s.costPerRoom}" onchange="hosrevSetG('costPerRoom',this.value)"></label>
        <label class="hr-lbl">Extra profit per room (food, drink, spa) £
          <input class="mne-edit hr-in" value="${s.extraProfitPerRoom}" onchange="hosrevSetG('extraProfitPerRoom',this.value)"></label>
        <p class="hr-muted" style="margin-top:8px">Blended commission from the channel mix: <b>${Math.round(hosrevCommissionBlend(s)*100)}%</b></p>
      </div>
      <div class="sf-panel"><div class="sf-panel-head"><h3>Guardrails</h3></div>
        <label class="hr-lbl">Pricing window (nights)
          <input class="mne-edit hr-in" value="${s.general.window}" onchange="hosrevSetGen('window',this.value)"></label>
        <label class="hr-lbl">Quiet-night threshold (occ %)
          <input class="mne-edit hr-in" value="${Math.round(s.general.quietThreshold*100)}" onchange="hosrevSetGen('quietThreshold',this.value/100)"></label>
        <label class="hr-lbl">Max change per day (%)
          <input class="mne-edit hr-in" value="${Math.round(s.general.maxDailyChangePct*100)}" onchange="hosrevSetGen('maxDailyChangePct',this.value/100)"></label>
      </div>
    </div>

    <div class="sf-panel" style="margin-top:16px"><div class="sf-panel-head"><h3>Channel mix &amp; commission</h3></div>
      <table class="pipe-table"><thead><tr><th>Channel</th><th>Commission %</th><th>Share of nights %</th></tr></thead>
      <tbody>${s.commission.map((ch,i)=>`<tr><td>${ch.channel}</td>
        <td><input class="mne-edit hr-in" value="${Math.round(ch.pct*100)}" onchange="hosrevSetCom(${i},'pct',this.value/100)"></td>
        <td><input class="mne-edit hr-in" value="${Math.round(ch.share*100)}" onchange="hosrevSetCom(${i},'share',this.value/100)"></td></tr>`).join("")}</tbody></table>
    </div>
    <p class="hr-muted" style="margin-top:12px">Saved to this device${(typeof FB!=="undefined"&&FB.ready&&FB.user)?' and synced to the team via Firebase':''}.</p>`;
}
function hosrevSet(i,k,val){ const s=HosrevStore.settings(); s.roomTypes[i][k]=+val||0; HosrevStore.saveSettings(s); }
function hosrevSetG(k,val){ const s=HosrevStore.settings(); s[k]=+val||0; HosrevStore.saveSettings(s); }
function hosrevSetGen(k,val){ const s=HosrevStore.settings(); s.general[k]=+val||0; HosrevStore.saveSettings(s); }
function hosrevSetCom(i,k,val){ const s=HosrevStore.settings(); s.commission[i][k]=+val||0; HosrevStore.saveSettings(s); if(k==='pct')render(); }
