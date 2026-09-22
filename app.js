/* ============================================================
   BRANDON HALL SALES PORTAL — app logic
   Runs in DEMO MODE (localStorage) until Firebase is wired up.
   To enable Firebase: fill firebase-config.js, uncomment the
   Firebase SDK block in index.html, and set USE_FIREBASE=true.
   ============================================================ */
const USE_FIREBASE = false;

const USERS = {
  "ajay.kawa":        { name:"Ajay Kawa",        code:"BHAK", role:"admin" },
  "raj.kumar":        { name:"Raj Kumar",        code:"BHRK", role:"admin" },
  "alia.taub":        { name:"Alia Taub",        code:"BHAT", role:"admin" },
  "nicola.cartwright":{ name:"Nicola Cartwright", code:"BHNC", role:"admin" }
};

const LAYOUT_LABELS = { boardroom:"Boardroom", ushape:"U-Shape",
  theatre:"Theatre", cabaret:"Cabaret", reception:"Reception" };

const $  = s => document.querySelector(s);
const el = (t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const money = n => "£"+Number(n).toLocaleString("en-GB",{minimumFractionDigits:0,maximumFractionDigits:2});

/* ---------- simple demo store ---------- */
const Store = {
  key:"bh_enquiries",
  all(){ try{return JSON.parse(localStorage.getItem(this.key))||[]}catch{return[]} },
  save(list){ localStorage.setItem(this.key, JSON.stringify(list)); },
  add(e){ const l=this.all(); e.id="ENQ-"+Date.now().toString(36).toUpperCase();
    e.created=new Date().toISOString(); e.status=e.status||"new"; l.unshift(e); this.save(l); return e; },
  update(id,patch){ const l=this.all(); const i=l.findIndex(x=>x.id===id);
    if(i>-1){ Object.assign(l[i],patch); this.save(l);} },
  seed(){
    // migrate any old-status enquiries to the new stage model
    const oldMap={ new:"enquiry", contacted:"provisional", quoted:"provisional", won:"confirmed", lost:"cancelled" };
    let l=this.all(), changed=false;
    l.forEach(e=>{ if(oldMap[e.status]){ e.status=oldMap[e.status]; changed=true; }
      if(!e.owner){ e.owner=ENQ_OWNERS[0]; changed=true; } });
    if(changed) this.save(l);
    if(localStorage.getItem("bh_seeded_v2"))return;
    const samples=(typeof SEED_SAMPLES!=="undefined")?SEED_SAMPLES:[];
    samples.forEach(s=>{ const item=Object.assign({},s); item.id="ENQ-"+Math.random().toString(36).slice(2,8).toUpperCase();
      item.created=new Date(Date.now()-Math.random()*20*864e5).toISOString(); l.push(item); });
    this.save(l); localStorage.setItem("bh_seeded_v2","1");
  }
};

let SESSION=null, CURRENT_TAB="home";

/* ============================================================ AUTH */
$("#lg-btn").onclick = async ()=>{
  const u=$("#lg-user").value, pw=$("#lg-pw").value.trim().toUpperCase();
  const err=$("#lg-err"); err.textContent="";
  if(!u){ err.textContent="Please select your name."; return; }
  const user=USERS[u];
  if(!user){ err.textContent="Unknown user."; return; }

  const btn=$("#lg-btn"); btn.disabled=true; const label=btn.textContent; btn.textContent="Signing in…";
  // Try Firebase first; fall back to demo (local) auth
  if(FB.ready){
    const r=await fbSignIn(u, pw);
    if(r.ok){ SESSION=user; SESSION._key=u; enterApp(user); btn.disabled=false; btn.textContent=label; return; }
    if(!r.demo){ err.textContent=r.error||"Sign-in failed."; btn.disabled=false; btn.textContent=label; return; }
  }
  // demo fallback
  if(pw!==user.code){ err.textContent="Incorrect access code."; btn.disabled=false; btn.textContent=label; return; }
  SESSION=user; SESSION._key=u; enterApp(user); btn.disabled=false; btn.textContent=label;
};
function enterApp(user){
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#tb-who").textContent=user.name;
  const av=$("#sf-avatar"); if(av) av.textContent=(user.name||"").split(" ").map(w=>w[0]).join("").slice(0,2);
  const badge=$("#tb-mode"); if(badge) badge.textContent = FB.ready? "Live" : "Demo";
  boot();
}
$("#lg-pw").addEventListener("keydown",e=>{ if(e.key==="Enter")$("#lg-btn").click(); });
$("#tb-logout").onclick=async ()=>{ await fbSignOut(); SESSION=null; $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden"); $("#lg-pw").value=""; };

/* ============================================================ ROUTING */
/* DB facade: Firebase when live, localStorage in demo mode */
const DB = {
  live(){ return FB.ready && FB.user; },
  all(){ return this.live()? FBStore.all() : Store.all(); },
  async add(e){ return this.live()? FBStore.add(e) : Store.add(e); },
  async update(id,patch){ return this.live()? FBStore.update(id,patch) : Store.update(id,patch); }
};

const SEED_SAMPLES=[
  { name:"Dairy Carbon Network", company:"via arrangeMY", email:"maria.hamblin@arrangemy.com", phone:"01905 610016",
    event:"meeting", date:"2026-11-18", pax:7, room:"", source:"arrangeMY / agent", status:"enquiry",
    owner:"Nicola Cartwright", value:1200, followUp:"2026-09-16", budget:"£40–45 DDR", accommodation:"yes",
    notes:"2-day team meeting · Layout: Horseshoe · AV: TV/projector, laptop share, Teams call, flipchart, water · Dinner 7 delegates · DBB overnight · 12% commission" },
  { name:"Andre Brissett", email:"brissett44@outlook.com", phone:"+447355574227",
    event:"wedding", date:"2026-11-23", pax:75, room:"", source:"Hitched", status:"enquiry",
    owner:"Natalie Freeman", value:0, followUp:"2026-09-16",
    notes:"Country wedding, West Midlands · 60–90 guests · Requested packages info" },
  { name:"Dominic Hillyard", email:"dominic_hillyard@outlook.com", phone:"07534325007",
    event:"wedding", date:"2027-08-01", pax:55, room:"brandon-suite", source:"Website", status:"provisional",
    owner:"Natalie Freeman", value:8500, followUp:"2026-09-20", accommodation:"yes",
    notes:"All-in-one ceremony + reception + party · ~50 day & evening · ~10 rooms · Proposal sent, viewing offered" },
  { name:"Rebekah Stretton", email:"rebekah.stretton@gmail.com", phone:"07505174898",
    event:"wedding", date:"2026-03-29", pax:50, room:"", source:"Website", status:"enquiry",
    owner:"Natalie Freeman", value:0, accommodation:"yes" },
  { name:"Samantha Courtnell", email:"samcourtnell@outlook.com", phone:"07870672918",
    event:"wedding", date:"2027-06-01", pax:90, room:"", source:"Website", status:"enquiry",
    owner:"Nicola Cartwright", value:0, accommodation:"yes", notes:"Wants spaces, prices, sample menus" }
];

async function boot(){
  if(DB.live()){
    FBStore.start();                       // begin live Firestore sync
    await FBStore.seedOnce(SEED_SAMPLES);   // seed only if empty
    FBStore.onChange(()=>{ if(CURRENT_TAB==="pipeline") render(); });
    if(typeof MktStore!=="undefined"){ MktStore.start();
      MktStore.onChange(()=>{ if(CURRENT_TAB==="marketing") render(); }); }
    if(typeof CorpGuestStore!=="undefined"){ CorpGuestStore.start();
      CorpGuestStore.onChange(()=>{ if(CURRENT_TAB==="corpdb") render(); }); }
    if(typeof FeedbackStore!=="undefined"){ FeedbackStore.start();
      FeedbackStore.onChange(()=>{ if(CURRENT_TAB==="feedback") render(); }); }
    if(typeof ContractStore!=="undefined"){ ContractStore.start();
      ContractStore.onChange(()=>{ if(CURRENT_TAB==="contracts") render(); }); }
  } else {
    Store.seed();
  }
  buildSidebar();
  render();
}
function buildSidebar(){
  const nav=$("#sf-nav"); if(!nav)return;
  const mods=userModules(SESSION?._key||"ajay.kawa");
  let html=`<button class="sf-nav-item sf-home" data-go="home"><span class="sf-ico">🏠</span> Home</button>`;
  mods.forEach(m=>{
    html+=`<div class="sf-nav-group">
      <div class="sf-nav-head" style="--mc:${m.colour}"><span class="sf-mdot" style="background:${m.colour}"></span>${m.name}</div>`;
    m.tabs.forEach(t=>{ const meta=TAB_META[t]; if(!meta)return;
      html+=`<button class="sf-nav-item" data-go="${t}"><span class="sf-ico">${meta.icon}</span> ${meta.label}</button>`; });
    html+=`</div>`;
  });
  nav.innerHTML=html;
  nav.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>switchTab(b.dataset.go));
  const s=$("#sf-settings"); if(s) s.onclick=()=>switchTab("admin");
  const lg=$("#sf-logo-home"); if(lg) lg.onclick=()=>switchTab("home");
}
function syncSidebar(){
  document.querySelectorAll("#sf-nav [data-go]").forEach(b=>
    b.classList.toggle("active", b.dataset.go===CURRENT_TAB));
}
function render(){
  const v=$("#view"); v.innerHTML="";
  document.body.classList.toggle("home-active", CURRENT_TAB==="home");
  syncSidebar();
  ({home:renderHome, rooms:renderRooms, dining:renderDining, pipeline:renderPipeline, corprates:renderCorpRates, packages:renderPackages, suppliers:renderSuppliers, quote:renderQuote,
    profit:renderProfit, chat:renderChat, mne:renderMnE, marketing:renderMarketing, social:renderSocial, menu:renderMenuBuilder, brochure:renderBrochureBuilder, tasks:renderTasks, insight:renderInsight, precheckin:renderPrecheckinSetup, corpdb:renderCorpDb, feedback:renderFeedback, contracts:renderContracts, admin:renderAdmin }[CURRENT_TAB]||renderRooms)(v);
}

/* ============================================================ ROOMS */
let roomFilter={ event:"", pax:"" };
function renderRooms(v){
  v.appendChild(head("Meeting & Event Rooms",
    "Pick an event type and headcount to see which rooms fit and how to lay them out."));
  const gal=el("div","gallery");
  gal.innerHTML=GALLERY.meetings.slice(0,4).map(u=>`<img src="${u}" loading="lazy" onerror="this.style.display='none'">`).join("");
  v.appendChild(gal);

  const bar=el("div","filters");
  bar.innerHTML=`<span class="lbl">Event type</span>`;
  const chips=el("div","chips");
  chips.appendChild(makeChip("All events","",roomFilter.event===""));
  EVENT_TYPES.forEach(et=>chips.appendChild(makeChip(et.icon+" "+et.label,et.id,roomFilter.event===et.id)));
  chips.querySelectorAll(".chip").forEach(c=>c.onclick=()=>{roomFilter.event=c.dataset.val;renderRooms(v);});
  bar.appendChild(chips);
  const paxWrap=el("div","",`<span class="lbl" style="margin-right:8px">Guests</span>`);
  const pax=el("input"); pax.type="number"; pax.min=0; pax.placeholder="e.g. 40";
  pax.value=roomFilter.pax; pax.style.width="90px";
  pax.oninput=()=>{roomFilter.pax=pax.value;refreshRoomFit(v);};
  paxWrap.appendChild(pax); bar.appendChild(paxWrap);
  v.appendChild(bar);

  const grid=el("div","room-grid"); grid.id="room-grid";
  ROOMS.forEach(r=>grid.appendChild(roomCard(r)));
  v.appendChild(grid);
  refreshRoomFit(v);
}
function makeChip(label,val,on){ const c=el("button","chip"+(on?" on":""),label); c.dataset.val=val; return c; }

function bestLayout(room,eventId){
  const et=EVENT_TYPES.find(e=>e.id===eventId);
  const order= et? et.preferredLayouts : ["theatre","cabaret","reception","boardroom","ushape"];
  for(const lay of order){ if(room.cap[lay]) return lay; }
  return Object.keys(room.cap).find(k=>room.cap[k])||"reception";
}
function maxCap(room){ return Math.max(...Object.values(room.cap).filter(n=>n!=null)); }

function roomCard(r){
  const c=el("div","room-card"); c.dataset.id=r.id;
  const caps=Object.entries(r.cap).filter(([,n])=>n!=null&&n>0)
    .map(([k,n])=>`<span class="cap-pill"><b>${n}</b> ${LAYOUT_LABELS[k]}</span>`).join("");
  c.innerHTML=`<img class="thumb" src="${roomImage(r)}" alt="${r.name}" loading="lazy"
      onerror="this.style.display='none'">
    <h3>${r.name}</h3><div class="m2">${r.m2} m²${r.combined?" · "+r.combined:""}</div>
    <div class="caps">${caps}</div><div class="fit" data-fit></div>`;
  c.onclick=()=>openRoom(r);
  return c;
}
function refreshRoomFit(v){
  const pax=parseInt(roomFilter.pax)||0;
  document.querySelectorAll(".room-card").forEach(card=>{
    const r=ROOMS.find(x=>x.id===card.dataset.id); const fit=card.querySelector("[data-fit]");
    if(!pax){ fit.textContent=""; card.classList.remove("dim"); return; }
    const lay=bestLayout(r,roomFilter.event); const cap=r.cap[lay]||maxCap(r);
    if(maxCap(r)>=pax){ fit.className="fit yes";
      fit.textContent=`✓ Fits ${pax} — best as ${LAYOUT_LABELS[lay]} (${cap})`; card.classList.remove("dim"); }
    else { fit.className="fit no"; fit.textContent=`✗ Max ${maxCap(r)} — too small`; card.classList.add("dim"); }
  });
}

let roomModalLayout="theatre";
function openRoom(r){
  const pax=parseInt(roomFilter.pax)||Math.round(maxCap(r)*0.6);
  const evId=roomFilter.event||"meeting";
  const et=EVENT_TYPES.find(e=>e.id===evId);
  const lay=bestLayout(r,evId);
  roomModalLayout=lay;
  const carbon=carbonModel(r,evId,pax);
  const equip=EVENT_EQUIPMENT[evId]||[];
  const hire=ROOM_HIRE[r.id];
  const tech=roomTech(r);

  const caps=Object.entries(r.cap).filter(([,n])=>n!=null).map(([k,n])=>
    `<tr class="${k===lay?"best":""}"><td>${LAYOUT_LABELS[k]}</td><td>${n||"—"}</td></tr>`).join("");
  const layoutBtns=Object.keys(r.cap).filter(k=>r.cap[k]!=null)
    .map(k=>`<button class="${k===lay?"on":""}" data-lay="${k}">${LAYOUT_LABELS[k]} (${r.cap[k]})</button>`).join("");
  const techItems=TECH_FIELDS.map(([key,label])=>{
    const on=tech[key]; const val=(key==="screen")?on:on;
    return `<div class="tech-item ${on?"yes":"no"}"><span class="ic">${on?"✓":"—"}</span>
      <span>${label}${key==="screen"&&typeof on==="string"?": "+on:""}</span></div>`;
  }).join("");

  const body=`
    <img class="room-hero" src="${roomImage(r)}" alt="${r.name}" onerror="this.style.display='none'">
    <div class="detail-row">
      <div class="stat"><div class="k">Floor area</div><div class="v">${r.m2}<small> m²</small></div></div>
      ${r.length?`<div class="stat"><div class="k">Dimensions</div><div class="v">${r.length}<small>×</small>${r.width}<small> m</small></div></div>`:""}
      <div class="stat"><div class="k">Max capacity</div><div class="v">${maxCap(r)}</div></div>
      ${hire?`<div class="stat"><div class="k">Room hire</div><div class="v">${money(hire.full)}<small>/day</small></div></div>`:""}
    </div>

    <div class="sec-title">Recommended for ${et.icon} ${et.label}</div>
    <p style="font-size:14px;margin-bottom:6px">Best laid out as <b>${LAYOUT_LABELS[lay]}</b> (seats ${r.cap[lay]||maxCap(r)}).</p>

    <div class="sec-title">Seating layouts</div>
    <div class="layout-tabs" id="rm-laytabs">${layoutBtns}</div>
    <div class="layout-view"><div id="rm-layview">${seatingSVG(r,lay,r.cap[lay])}</div>
      <div class="desc" id="rm-laydesc">${LAYOUT_INFO[lay].desc}</div></div>

    <div class="sec-title">Capacity by layout</div>
    <table class="cap-table">${caps}</table>

    <div class="sec-title">Tech &amp; connectivity</div>
    <div class="tech-grid">${techItems}</div>
    ${tech.notes?`<p style="font-size:13px;color:var(--muted);margin-top:8px">${tech.notes}</p>`:""}

    <div class="sec-title">Recommended equipment <span class="dummy-tag">DUMMY — awaiting M&E audit</span></div>
    <ul class="equip-list">${equip.map(e=>`<li>${e}</li>`).join("")}</ul>

    <div class="sec-title">Estimated carbon footprint</div>
    <div class="carbon-box">
      <div class="big">${carbon.total} kg CO₂e</div>
      <div class="split">Room energy ≈ ${carbon.room} kg · Catering ≈ ${carbon.catering} kg
        (${carbon.perHead} kg/head × ${pax} guests)</div>
      <div class="split" style="margin-top:6px;font-style:italic">Estimated from floor area, occupancy &amp; event type — indicative only.</div>
    </div>

    <div class="dual-btn">
      <button class="btn" id="rm-quote">Start a quote</button>
      <button class="btn ghost" id="rm-enq">Log an enquiry</button>
    </div>`;
  showModal(r.name, `${r.m2} m² · ${r.combined||"Function room"}`, body);

  // interactive layout switcher
  document.querySelectorAll("#rm-laytabs button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#rm-laytabs button").forEach(x=>x.classList.toggle("on",x===b));
    const k=b.dataset.lay;
    $("#rm-layview").innerHTML=seatingSVG(r,k,r.cap[k]);
    $("#rm-laydesc").textContent=LAYOUT_INFO[k].desc;
  });
  $("#rm-quote").onclick=()=>{ closeModal(); prefill={room:r.id,event:evId,pax}; switchTab("quote"); };
  $("#rm-enq").onclick=()=>{ closeModal(); openEnquiryForm({room:r.id,event:evId}); };
}
function switchTab(t){ CURRENT_TAB=t; render(); }

/* ============================================================ PACKAGES */
function renderPackages(v){
  v.appendChild(head("Packages & Pricing","Delegate rates, event packages and à la carte add-ons. All prices include VAT unless noted."));
  const grid=el("div","pkg-grid");
  PACKAGES.forEach(p=>{
    const card=el("div","pkg-card");
    card.innerHTML=`<h3>${p.name}</h3>
      <div class="price">from <b>${money(p.from)}</b> ${p.per==="pp"?"per person":""}</div>
      <ul>${p.includes.map(i=>`<li>${i}</li>`).join("")}</ul>
      <div class="min">Minimum ${p.min} ${p.min>1?"guests":"guest"}</div>`;
    grid.appendChild(card);
  });
  v.appendChild(grid);

  // add-ons
  v.appendChild(el("div","sec-title",`À la carte add-ons`));
  ADDONS.forEach(group=>{
    v.appendChild(el("h4","",`<span style="font-family:var(--serif);font-size:18px;color:var(--gold-dk);display:block;margin:14px 0 8px">${group.cat}</span>`));
    const t=el("table","data-table");
    t.innerHTML=`<tr><th>Item</th><th style="text-align:right">Price</th><th>Per</th></tr>`+
      group.items.map(i=>`<tr><td>${i.name}${i.note?` <span class="qs-sub">(${i.note})</span>`:""}</td>
        <td style="text-align:right">${money(i.price)}</td><td>${i.unit}</td></tr>`).join("");
    v.appendChild(t);
  });

  // ---- Christmas dynamic pricing ----
  v.appendChild(el("div","sec-title","Christmas & New Year — live pricing"));
  const xmasWrap=el("div","xmas-tool");
  xmasWrap.innerHTML=`
    <div class="xmas-controls">
      <div><label>Package</label><select id="xmas-pkg">${XMAS_PACKAGES.map(p=>`<option value="${p.id}">${p.name} (${p.dates})</option>`).join("")}</select></div>
      <div><label>Guests</label><input id="xmas-pax" type="number" min="1" value="80"></div>
    </div>
    <div id="xmas-out"></div>`;
  v.appendChild(xmasWrap);
  const calcXmas=()=>{
    const p=XMAS_PACKAGES.find(x=>x.id===$("#xmas-pkg").value);
    const pax=parseInt($("#xmas-pax").value)||0;
    const rows=p.lines.map(([label,cost])=>`<tr><td>${label}</td><td style="text-align:right">${cost?money(cost):"incl."}</td></tr>`).join("");
    const total=p.pp*pax;
    $("#xmas-out").innerHTML=`
      <table class="data-table" style="margin-top:12px">
        <tr><th>Included</th><th style="text-align:right">Per head</th></tr>${rows}
        <tr style="background:#eef2f8;font-weight:700"><td>Per person</td><td style="text-align:right">${money(p.pp)}</td></tr>
      </table>
      <div class="xmas-total">Total for <b>${pax}</b> guests: <span>${money(total)}</span>
        ${p.min>1?`<span class="xmas-min">Min ${p.min} guests</span>`:""}</div>`;
  };
  $("#xmas-pkg").onchange=calcXmas; $("#xmas-pax").oninput=calcXmas; calcXmas();
}

/* ============================================================ QUOTE BUILDER */
let prefill=null;
let QUOTE_ROOMS=[]; // array of function/room-booking line items
function newRoomLine(pre){
  return { fnType: pre?.fnType||"meeting", label: pre?.label||"", time: pre?.time||"",
    room: pre?.room || ROOMS[0].id, date: pre?.date||"", layout: pre?.layout||"theatre",
    pax: pre?.pax || 40, hire: pre?.hire||"full", pkg: pre?.pkg||"" };
}
function applyEventTemplate(tplId){
  const tpl=EVENT_TEMPLATES[tplId]; if(!tpl)return;
  QUOTE_ROOMS=tpl.functions.map(f=>newRoomLine({ fnType:f.type, label:f.label, time:f.time,
    room:ROOMS[0].id, layout:f.layout, hire:f.hire, pkg:f.pkg, pax:40 }));
}
function renderQuote(v){
  v.appendChild(head("Create a Quote","Build a multi-room, multi-function quote — a line for each function (meeting, lunch, break…) with its own room, time, layout and package. Load an event template to start fast."));
  if(!QUOTE_ROOMS.length) QUOTE_ROOMS=[newRoomLine(prefill)];
  if(prefill){ QUOTE_ROOMS=[newRoomLine(prefill)]; }
  const preEvent = prefill?.event || "wedding";
  prefill=null;

  const wrap=el("div","quote-layout");
  // left: form
  const left=el("div","quote-panel");
  left.innerHTML=`<h3>Customer</h3>
    <div class="form-grid">
      <div><label>Customer name</label><input id="q-name" placeholder="Full name"></div>
      <div><label>Company (optional)</label><input id="q-co" placeholder="Company"></div>
      <div><label>Email</label><input id="q-email" type="email" placeholder="name@email.com"></div>
      <div><label>Phone</label><input id="q-phone" placeholder="Phone"></div>
      <div><label>Event type</label><select id="q-event">${EVENT_TYPES.map(e=>`<option value="${e.id}" ${e.id===preEvent?"selected":""}>${e.label}</option>`).join("")}</select></div>
      <div><label>Main event date</label><input id="q-date" type="date"></div>
    </div>

    <div class="tmpl-row" style="margin-top:16px">
      <label>Event template</label>
      <select id="q-template"><option value="">Start blank</option>${Object.entries(EVENT_TEMPLATES).map(([k,t])=>`<option value="${k}">${t.label}</option>`).join("")}</select>
      <button class="btn sm" id="q-applytpl" type="button">Load</button>
    </div>

    <div class="rooms-head">
      <h3 style="margin-top:22px">Functions &amp; spaces</h3>
      <button class="btn sm" id="q-addroom">+ Add function</button>
    </div>
    <div id="q-roomlines"></div>

    <h3 style="margin-top:22px">Add-ons <span class="qs-sub">(applied across the whole quote)</span></h3>
    <div id="q-addons"></div>`;
  wrap.appendChild(left);

  // right: summary
  const right=el("div","quote-panel quote-summary");
  right.innerHTML=`<h3>Quote summary</h3><div id="q-summary"></div>
    <button class="btn block" id="q-brochure" style="margin-top:16px">Download brochure &amp; quote</button>
    <button class="btn ghost block" id="q-pdf" style="margin-top:8px">Simple quote only</button>
    <button class="btn ghost block" id="q-kitchen" style="margin-top:8px">Kitchen / ops sheet</button>
    <button class="btn ghost block" id="q-save" style="margin-top:8px">Save as enquiry</button>`;
  wrap.appendChild(right);
  v.appendChild(wrap);

  renderRoomLines();

  // add-ons list
  const ad=$("#q-addons");
  ADDONS.forEach(g=>{
    ad.appendChild(el("div","qs-sub",`<b style="color:var(--gold-dk)">${g.cat}</b>`));
    g.items.forEach((item,idx)=>{
      const key=g.cat+"|"+idx;
      const row=el("div","addon-row");
      row.innerHTML=`<span class="an">${item.name}</span><span class="ap">${money(item.price)}/${item.unit}</span>`;
      const qty=el("input"); qty.type="number"; qty.min=0; qty.value=0; qty.dataset.key=key;
      qty.dataset.price=item.price; qty.dataset.name=item.name; qty.dataset.unit=item.unit;
      qty.oninput=recalcQuote; row.appendChild(qty); ad.appendChild(row);
    });
  });

  $("#q-addroom").onclick=()=>{ QUOTE_ROOMS.push(newRoomLine()); renderRoomLines(); recalcQuote(); };
  $("#q-applytpl").onclick=()=>{ const t=$("#q-template").value; if(t){ applyEventTemplate(t);
    const tpl=EVENT_TEMPLATES[t]; if(tpl && tpl.event) $("#q-event").value=tpl.event;
    renderRoomLines(); recalcQuote(); } };
  $("#q-event").addEventListener("change",recalcQuote);
  recalcQuote();
  $("#q-pdf").onclick=downloadQuotePDF;
  $("#q-brochure").onclick=downloadBrochurePDF;
  $("#q-kitchen").onclick=downloadKitchenSheet;
  $("#q-save").onclick=saveQuoteAsEnquiry;
}

function renderRoomLines(){
  const box=$("#q-roomlines"); if(!box)return;
  box.innerHTML="";
  QUOTE_ROOMS.forEach((line,i)=>{
    const room=ROOMS.find(r=>r.id===line.room);
    const tech=room?roomTech(room):{};
    const ft=FUNCTION_TYPES.find(f=>f.id===line.fnType)||FUNCTION_TYPES[0];
    const card=el("div","room-line");
    card.innerHTML=`
      <div class="rl-head">
        <span class="rl-num">${ft.icon} Function ${i+1}</span>
        ${QUOTE_ROOMS.length>1?`<button class="rl-del" data-i="${i}" title="Remove">×</button>`:""}</div>
      <div class="rl-fnrow">
        <div><label>Function type</label><select data-i="${i}" data-f="fnType">${FUNCTION_TYPES.map(f=>`<option value="${f.id}" ${f.id===line.fnType?"selected":""}>${f.icon} ${f.label}</option>`).join("")}</select></div>
        <div><label>Label (optional)</label><input type="text" data-i="${i}" data-f="label" value="${(line.label||"").replace(/"/g,'&quot;')}" placeholder="e.g. Morning session"></div>
        <div><label>Time</label><input type="time" data-i="${i}" data-f="time" value="${line.time||""}"></div>
      </div>
      <div class="rl-body">
        <img class="rl-img" src="${room?roomImage(room):""}" alt="${room?room.name:""}" loading="lazy" onerror="this.style.display='none'">
        <div class="rl-grid">
          <div><label>Room / space</label><select data-i="${i}" data-f="room">${ROOMS.map(r=>`<option value="${r.id}" ${r.id===line.room?"selected":""}>${r.name} (${r.m2}m²)</option>`).join("")}</select></div>
          <div><label>Date / day</label><input type="date" data-i="${i}" data-f="date" value="${line.date}"></div>
          <div><label>Layout</label><select data-i="${i}" data-f="layout">${Object.entries(LAYOUT_LABELS).map(([k,l])=>`<option value="${k}" ${k===line.layout?"selected":""}>${l}</option>`).join("")}</select></div>
          <div><label>Guests</label><input type="number" min="1" data-i="${i}" data-f="pax" value="${line.pax}"></div>
          <div><label>Hire basis</label><select data-i="${i}" data-f="hire"><option value="full" ${line.hire==="full"?"selected":""}>Full day</option><option value="half" ${line.hire==="half"?"selected":""}>Half day</option><option value="none" ${line.hire==="none"?"selected":""}>None (incl.)</option></select></div>
          <div><label>Package</label><select data-i="${i}" data-f="pkg"><option value="">Room hire only</option>${PACKAGES.map(p=>`<option value="${p.id}" ${p.id===line.pkg?"selected":""}>${p.name} (${money(p.from)}pp)</option>`).join("")}</select></div>
        </div>
      </div>
      ${room?`<div class="rl-spec">${room.m2} m²${room.length?` · ${room.length}×${room.width}m`:""} · max ${maxCap(room)} · ${tech.screen||"Screen"}${tech.wirelessShare?" · ClickShare":""}${tech.videoCall?" · Video-call ready":""}</div>`:""}
      <div class="rl-menu">
        <button class="menu-toggle" data-i="${i}" type="button">🍽️ Menu items${(line.menu&&line.menu.length)?` (${line.menu.length})`:""}</button>
        <div class="menu-panel hidden" id="menu-panel-${i}"></div>
      </div>`;
    box.appendChild(card);
  });
  // menu toggles
  box.querySelectorAll(".menu-toggle").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; const panel=$("#menu-panel-"+i);
    panel.classList.toggle("hidden");
    if(!panel.dataset.built){ panel.innerHTML=Object.entries(MENU_ITEMS).map(([cat,items])=>
      `<div class="menu-cat"><b>${cat}</b>${items.map(it=>{
        const on=(QUOTE_ROOMS[i].menu||[]).includes(it);
        return `<label class="menu-chk"><input type="checkbox" data-mi="${i}" value="${it.replace(/"/g,'&quot;')}" ${on?"checked":""}> ${it}</label>`;
      }).join("")}</div>`).join("");
      panel.dataset.built="1";
      panel.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.onchange=()=>{
        const ri=+cb.dataset.mi; QUOTE_ROOMS[ri].menu=QUOTE_ROOMS[ri].menu||[];
        if(cb.checked){ if(!QUOTE_ROOMS[ri].menu.includes(cb.value)) QUOTE_ROOMS[ri].menu.push(cb.value); }
        else { QUOTE_ROOMS[ri].menu=QUOTE_ROOMS[ri].menu.filter(x=>x!==cb.value); }
        b.textContent=`🍽️ Menu items${QUOTE_ROOMS[ri].menu.length?` (${QUOTE_ROOMS[ri].menu.length})`:""}`;
      });
    }
  });
  box.querySelectorAll("[data-f]").forEach(inp=>inp.addEventListener("input",e=>{
    const i=+e.target.dataset.i, f=e.target.dataset.f;
    QUOTE_ROOMS[i][f] = (f==="pax")? (parseInt(e.target.value)||0) : e.target.value;
    if(f==="fnType") renderRoomLines();
    recalcQuote();
  }));
  box.querySelectorAll(".rl-del").forEach(b=>b.onclick=()=>{
    QUOTE_ROOMS.splice(+b.dataset.i,1); renderRoomLines(); recalcQuote();
  });
}

function fnLabel(line){
  const ft=FUNCTION_TYPES.find(f=>f.id===line.fnType);
  const base=line.label|| (ft?ft.label:"Function");
  return line.time? `${line.time} ${base}` : base;
}
function gatherQuote(){
  const evId=$("#q-event").value;
  const lines=[];
  let totalPax=0;
  QUOTE_ROOMS.forEach(line=>{
    const room=ROOMS.find(r=>r.id===line.room); if(!room)return;
    const pax=parseInt(line.pax)||0; totalPax+=pax;
    const dateStr=line.date? " ("+new Date(line.date).toLocaleDateString("en-GB")+")" : "";
    const fl=fnLabel(line);
    const pkg=PACKAGES.find(p=>p.id===line.pkg);
    if(pkg){ lines.push({label:`${fl} · ${pkg.name} — ${room.name}${dateStr} × ${pax}`, amt:pkg.from*pax, sub:`${money(pkg.from)}pp`}); }
    if(line.hire!=="none" && ROOM_HIRE[room.id]){
      lines.push({label:`${fl} · Room hire — ${room.name} (${line.hire} day)${dateStr}`, amt:ROOM_HIRE[room.id][line.hire]});
    }
  });
  document.querySelectorAll("#q-addons input").forEach(q=>{
    const n=parseInt(q.value)||0; if(n>0){
      const price=parseFloat(q.dataset.price);
      lines.push({label:`${q.dataset.name} × ${n} ${q.dataset.unit}`, amt:price*n});
    }
  });
  const subtotal=lines.reduce((s,l)=>s+l.amt,0);
  let carbonTotal=0;
  QUOTE_ROOMS.forEach(line=>{ const room=ROOMS.find(r=>r.id===line.room);
    if(room) carbonTotal += carbonModel(room,evId,parseInt(line.pax)||0).total; });
  const primaryRoom=ROOMS.find(r=>r.id===QUOTE_ROOMS[0]?.room)||ROOMS[0];
  return { rooms:QUOTE_ROOMS, room:primaryRoom, evId, pax:totalPax, lines, subtotal,
    carbon:{ total:carbonTotal },
    customer:{ name:$("#q-name")?.value||"", co:$("#q-co")?.value||"",
      email:$("#q-email")?.value||"", phone:$("#q-phone")?.value||"",
      date:$("#q-date")?.value||"" }};
}
function recalcQuote(){
  const q=gatherQuote(); const s=$("#q-summary"); if(!s)return;
  s.innerHTML = q.lines.length
    ? q.lines.map(l=>`<div class="qs-line"><span>${l.label}${l.sub?` <span class="qs-sub">${l.sub}</span>`:""}</span><span>${money(l.amt)}</span></div>`).join("")
      +`<div class="qs-line total"><span>Total</span><span>${money(q.subtotal)}</span></div>
        <div class="qs-sub">${QUOTE_ROOMS.length} room${QUOTE_ROOMS.length>1?"s":""} · ${q.pax} total guests · inc VAT where applicable.</div>
        <div class="carbon-quote">Estimated carbon: <b>${q.carbon.total} kg CO₂e</b> across all spaces</div>`
    : `<div class="qs-sub">Add a room, package or add-ons to build the quote.</div>`;
}

/* ============================================================ QUOTE PDF (print-to-PDF) */
function downloadQuotePDF(){
  const q=gatherQuote();
  if(!q.customer.name){ alert("Please enter the customer name first."); return; }
  const et=EVENT_TYPES.find(e=>e.id===q.evId);
  const ref="BH-Q-"+Date.now().toString(36).toUpperCase();
  const win=window.open("","_blank");
  const rows=q.lines.map(l=>`<tr><td>${l.label}</td><td style="text-align:right">${money(l.amt)}</td></tr>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ref}</title>
    <style>
      @page{margin:22mm}
      body{font-family:'Inter',Arial,sans-serif;color:#241f1b;font-size:12px;line-height:1.5}
      .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #BB9979;padding-bottom:14px}
      h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#241f1b;margin:0}
      .muted{color:#8a8178;font-size:11px}
      h2{font-family:'Cormorant Garamond',serif;font-size:18px;margin:22px 0 8px;color:#9d7d5f}
      table{width:100%;border-collapse:collapse;margin-top:6px}
      td,th{padding:8px 6px;border-bottom:1px solid #e5ddd2;text-align:left}
      .total td{border-top:2px solid #241f1b;font-weight:700;font-size:15px;border-bottom:none}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:8px}
      .grid div{font-size:12px}.grid b{color:#3a332c}
      .carbon{background:#eef5ec;border-radius:8px;padding:10px 14px;margin-top:16px;color:#4a6147;font-size:12px}
      .foot{margin-top:30px;font-size:10.5px;color:#8a8178;border-top:1px solid #e5ddd2;padding-top:12px}
    </style></head><body>
    <div class="top">
      <div><h1>Brandon Hall Hotel &amp; Spa</h1><div class="muted">Main Street, Brandon, Coventry CV8 3FW</div></div>
      <div style="text-align:right"><div class="muted">Quotation</div><b>${ref}</b><br><span class="muted">${new Date().toLocaleDateString("en-GB")}</span></div>
    </div>
    <h2>Prepared for</h2>
    <div class="grid">
      <div><b>${q.customer.name}</b></div><div>${q.customer.co||""}</div>
      <div>${q.customer.email||""}</div><div>${q.customer.phone||""}</div>
    </div>
    <h2>Event</h2>
    <div class="grid">
      <div><b>Type:</b> ${et.label}</div><div><b>Date:</b> ${q.customer.date?new Date(q.customer.date).toLocaleDateString("en-GB"):"TBC"}</div>
      <div><b>Room:</b> ${q.room.name} (${q.room.m2} m²)</div><div><b>Guests:</b> ${q.pax}</div>
    </div>
    <h2>Costs</h2>
    <table>${rows}<tr class="total"><td>Total (inc. VAT where applicable)</td><td style="text-align:right">${money(q.subtotal)}</td></tr></table>
    <div class="carbon">Estimated event carbon footprint: <b>${q.carbon.total} kg CO₂e</b> — indicative estimate from room size, occupancy and event type.</div>
    <div class="foot">This quotation is valid for 14 days and subject to availability. Prices include VAT at the current rate unless otherwise stated. Rates are non-commissionable. Cancellation terms are per individual contract.<br>
    Brandon Hall Hotel &amp; Spa · Sales: nicola.cartwright@brandonhallhotelandspa.com</div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`);
  win.document.close();
}

function downloadBrochurePDF(){
  const q=gatherQuote();
  if(!q.customer.name){ alert("Please enter the customer name first."); return; }
  const et=EVENT_TYPES.find(e=>e.id===q.evId);
  const ref="BH-P-"+Date.now().toString(36).toUpperCase();
  const rows=q.lines.map(l=>`<tr><td>${l.label}</td><td style="text-align:right">${money(l.amt)}</td></tr>`).join("");
  const hero=roomImage(q.room);
  const gallery=GALLERY.weddings.slice(0,3).map(u=>`<img src="${u}" style="width:32%;height:90px;object-fit:cover;border-radius:6px">`).join("");

  // per-room booking blocks with seating diagrams
  const roomBlocks=q.rooms.map((line,idx)=>{
    const room=ROOMS.find(r=>r.id===line.room); if(!room)return"";
    const pax=parseInt(line.pax)||0;
    const dateStr=line.date? new Date(line.date).toLocaleDateString("en-GB") : "Date TBC";
    const pkg=PACKAGES.find(p=>p.id===line.pkg);
    const svg=seatingSVG(room,line.layout,pax).replace(/background:#fbfaf7/,'background:#fff');
    return `<div class="room-block">
      <h3 class="rb-title">${room.name} <span>· ${dateStr} · ${LAYOUT_LABELS[line.layout]} · ${pax} guests</span></h3>
      ${pkg?`<div class="rb-pkg">${pkg.name}</div>`:""}
      <div style="max-width:440px;margin:8px auto 0">${svg}</div>
    </div>`;
  }).join("");

  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ref}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      @page{margin:0}
      body{font-family:'Inter',Arial,sans-serif;color:#1a2230;font-size:12px;line-height:1.5;margin:0}
      .page{padding:22mm;page-break-after:always;min-height:257mm}
      .page:last-child{page-break-after:auto}
      .cover{background:linear-gradient(160deg,#1a2b47,#101d33);color:#fff;min-height:297mm;padding:0;
        display:flex;flex-direction:column;justify-content:space-between}
      .cover-img{height:44%;width:100%;object-fit:cover;opacity:.9}
      .cover-body{padding:22mm}
      .cover h1{font-family:'Cormorant Garamond',serif;font-size:46px;font-weight:600;margin:0 0 6px;line-height:1.05}
      .cover .sub{color:#BB9979;font-size:16px;letter-spacing:1px}
      .cover .for{margin-top:40px;font-size:14px;color:#c9d1dd}
      .cover .for b{color:#fff;font-size:22px;font-family:'Cormorant Garamond',serif;display:block}
      .cover .foot{padding:22mm;font-size:11px;color:#8a97ab}
      h2{font-family:'Cormorant Garamond',serif;font-size:26px;color:#1a2b47;margin:0 0 4px}
      .rule{height:2px;background:#BB9979;width:60px;margin:8px 0 18px}
      .lead{color:#3a4256;font-size:13px;margin-bottom:16px}
      .grid2{display:flex;gap:6px;margin:12px 0}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      td,th{padding:8px 6px;border-bottom:1px solid #e3e7ee;text-align:left}
      .total td{border-top:2px solid #1a2b47;font-weight:700;font-size:15px;border-bottom:none}
      .box{background:#f7f8fa;border-radius:10px;padding:16px;margin:14px 0}
      .inc{columns:2;font-size:12.5px;margin-top:8px}
      .inc div{margin-bottom:4px}.inc div::before{content:"✓ ";color:#4a7c59;font-weight:700}
      .carbon{background:#eef5ec;border-radius:8px;padding:12px 16px;color:#4a6147;font-size:12px;margin-top:14px}
      .stats{display:flex;gap:14px;margin:14px 0}
      .stats div{flex:1;background:#f7f8fa;border-radius:8px;padding:12px;text-align:center}
      .stats b{display:block;font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a2b47}
      .stats span{font-size:11px;color:#7a8494}
      .room-block{margin:18px 0;padding-bottom:16px;border-bottom:1px solid #e3e7ee}
      .rb-title{font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2b47;margin:0}
      .rb-title span{font-size:13px;color:#7a8494;font-family:'Inter',sans-serif}
      .rb-pkg{display:inline-block;background:#eef2f8;color:#1a2b47;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px;margin-top:6px}
      .foot-note{margin-top:24px;font-size:10px;color:#7a8494;border-top:1px solid #e3e7ee;padding-top:12px}
      .terms{column-count:2;column-gap:24px;font-size:8.5px;line-height:1.45}
      .term{break-inside:avoid;margin-bottom:9px}
      .term b{color:#1a2b47;font-size:9px;display:block;margin-bottom:2px}
      .term p{color:#3a4256;margin:0}
    </style></head><body>
    <!-- COVER -->
    <div class="cover">
      <img class="cover-img" src="${hero}" onerror="this.style.display='none'">
      <div class="cover-body">
        <div class="sub">BRANDON HALL HOTEL &amp; SPA</div>
        <h1>${et.label}<br>Proposal</h1>
        <div class="for">Prepared for<b>${q.customer.name}</b>${q.customer.co?q.customer.co:""}</div>
      </div>
      <div class="foot">Ref ${ref} · ${new Date().toLocaleDateString("en-GB")} · Main Street, Brandon, Coventry CV8 3FW · +44 (0)247 710 2555</div>
    </div>

    <!-- VENUE + ROOMS -->
    <div class="page">
      <h2>Your event at Brandon Hall</h2><div class="rule"></div>
      ${q.evId==="wedding"?`
      <p class="lead">${WEDDING_CONTENT.intro}</p>
      <p class="lead">${WEDDING_CONTENT.suite}</p>
      <div class="grid2">${gallery}</div>
      <h2 style="font-size:18px;margin-top:18px">Why Brandon Hall</h2><div class="rule"></div>
      ${WEDDING_CONTENT.reasons.map(r=>`<div class="box" style="padding:12px 16px;margin:8px 0"><b style="font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2b47">${r.t}</b><div style="font-size:12.5px;color:#3a4256;margin-top:3px">${r.d}</div></div>`).join("")}`
      :`<p class="lead">Set within 17 acres of Warwickshire grounds, Brandon Hall offers elegant spaces for every occasion. Here's our proposal for your ${et.label.toLowerCase()}${q.rooms.length>1?` across ${q.rooms.length} rooms`:""}.</p>
      <div class="grid2">${gallery}</div>`}
      <div class="stats">
        <div><b>${q.rooms.length}</b><span>${q.rooms.length>1?"Rooms":"Room"}</span></div>
        <div><b>${q.pax}</b><span>Total guests</span></div>
        <div><b>${q.carbon.total}</b><span>kg CO₂e</span></div>
      </div>
      <h2 style="font-size:20px;margin-top:20px">Your spaces</h2><div class="rule"></div>
      ${roomBlocks}
    </div>

    <!-- COSTS -->
    <div class="page">
      <h2>Your proposal</h2><div class="rule"></div>
      <table>${rows}<tr class="total"><td>Total (inc. VAT where applicable)</td><td style="text-align:right">${money(q.subtotal)}</td></tr></table>
      <div class="carbon">🌱 Estimated event carbon footprint: <b>${q.carbon.total} kg CO₂e</b> across all spaces — we're committed to sustainable events.</div>
      <div class="foot-note">${TERMS_SHORT}<br><br>
      To confirm, contact our events team: nicola.cartwright@brandonhallhotelandspa.com · +44 (0)247 710 2555</div>
    </div>
    <!-- TERMS & CONDITIONS -->
    <div class="page">
      <h2>Terms &amp; Conditions</h2><div class="rule"></div>
      <div class="terms">${CONTRACT_TERMS.map(t=>`<div class="term"><b>${t.h}</b><p>${t.t}</p></div>`).join("")}</div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
    </body></html>`);
  win.document.close();
}

function saveQuoteAsEnquiry(){
  const q=gatherQuote();
  if(!q.customer.name){ alert("Please enter the customer name first."); return; }
  const roomNote = q.rooms.length>1 ? ` · ${q.rooms.length} functions` : "";
  DB.add({ name:q.customer.name, email:q.customer.email, phone:q.customer.phone,
    company:q.customer.co, event:q.evId, room:q.rooms[0]?.room||"", pax:q.pax, date:q.customer.date,
    value:q.subtotal, status:"provisional", source:"quote builder", owner:SESSION?.name||ENQ_OWNERS[0],
    notes:`Quote built: ${money(q.subtotal)}${roomNote} · ${q.pax} guests` });
  alert("Saved to the pipeline as Provisional.");
}

/* Kitchen / operations sheet — per-function food, covers, timings & layouts */
function downloadKitchenSheet(){
  const q=gatherQuote();
  if(!q.customer.name){ alert("Please enter the customer name first."); return; }
  const et=EVENT_TYPES.find(e=>e.id===q.evId);
  const ref="BH-OPS-"+Date.now().toString(36).toUpperCase();
  // gather food/beverage add-ons selected
  const foodItems=[];
  document.querySelectorAll("#q-addons input").forEach(inp=>{ const n=parseInt(inp.value)||0;
    if(n>0) foodItems.push({name:inp.dataset.name, qty:n, unit:inp.dataset.unit}); });
  const fnRows=q.rooms.map((line,i)=>{
    const room=ROOMS.find(r=>r.id===line.room);
    const ft=FUNCTION_TYPES.find(f=>f.id===line.fnType);
    const pkg=PACKAGES.find(p=>p.id===line.pkg);
    const dateStr=line.date? new Date(line.date).toLocaleDateString("en-GB") : "TBC";
    const menuStr=(line.menu&&line.menu.length)? `<br><span class="sub">Menu: ${line.menu.join(", ")}</span>` : "";
    return `<tr>
      <td>${line.time||"—"}</td>
      <td><b>${ft?ft.icon+" "+ft.label:"Function"}</b>${line.label?`<br><span class="sub">${line.label}</span>`:""}${menuStr}</td>
      <td>${room?room.name:"—"}<br><span class="sub">${LAYOUT_LABELS[line.layout]}</span></td>
      <td style="text-align:center">${line.pax||"—"}</td>
      <td>${dateStr}</td>
      <td>${pkg?pkg.name:"—"}</td></tr>`;
  }).join("");
  // aggregate menu items across functions (chef quantities)
  const menuAgg={};
  q.rooms.forEach(line=>{ if(line.menu) line.menu.forEach(m=>{ menuAgg[m]=(menuAgg[m]||0)+(parseInt(line.pax)||0); }); });
  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ref}</title>
    <style>@page{margin:16mm}body{font-family:'Inter',Arial,sans-serif;color:#1a2230;font-size:12px}
    .top{display:flex;justify-content:space-between;border-bottom:3px solid #1a2b47;padding-bottom:10px;margin-bottom:14px}
    h1{font-family:Georgia,serif;font-size:22px;color:#1a2b47;margin:0}
    .muted{color:#7a8494;font-size:11px}.sub{color:#7a8494;font-size:10.5px}
    h2{font-size:13px;color:#9d7d5f;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#1a2b47;color:#fff;text-align:left;padding:7px 8px;font-size:11px}
    td{padding:7px 8px;border-bottom:1px solid #e3e7ee;vertical-align:top}
    .info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 20px;font-size:12px;margin-bottom:6px}
    .info b{color:#3a4256}
    .note{margin-top:24px;font-size:10px;color:#7a8494;border-top:1px solid #e3e7ee;padding-top:10px}</style></head><body>
    <div class="top"><div><h1>Function / Kitchen Sheet</h1><div class="muted">Brandon Hall Hotel &amp; Spa · Operations</div></div>
      <div style="text-align:right"><b>${ref}</b><br><span class="muted">${new Date().toLocaleDateString("en-GB")}</span></div></div>
    <div class="info">
      <div><b>Client:</b> ${q.customer.name}</div><div><b>Company:</b> ${q.customer.co||"—"}</div><div><b>Event:</b> ${et.label}</div>
      <div><b>Date:</b> ${q.customer.date?new Date(q.customer.date).toLocaleDateString("en-GB"):"TBC"}</div>
      <div><b>Total covers:</b> ${q.pax}</div><div><b>Functions:</b> ${q.rooms.length}</div>
    </div>
    <h2>Running order</h2>
    <table><tr><th>Time</th><th>Function</th><th>Room / Layout</th><th>Covers</th><th>Date</th><th>Package</th></tr>${fnRows}</table>
    ${Object.keys(menuAgg).length?`<h2>Menu — chef quantities</h2>
      <table><tr><th>Dish</th><th style="text-align:center">Covers</th></tr>
      ${Object.entries(menuAgg).map(([m,n])=>`<tr><td>${m}</td><td style="text-align:center">${n}</td></tr>`).join("")}</table>`:""}
    ${foodItems.length?`<h2>Food &amp; beverage items</h2>
      <table><tr><th>Item</th><th style="text-align:center">Qty</th><th>Unit</th></tr>
      ${foodItems.map(f=>`<tr><td>${f.name}</td><td style="text-align:center">${f.qty}</td><td>${f.unit}</td></tr>`).join("")}</table>`:""}
    <h2>Notes for kitchen &amp; ops</h2>
    <table><tr><td style="height:80px;color:#7a8494">Dietary requirements, service timings, allergen notes, special requests…</td></tr></table>
    <div class="note">Internal operations document. English beef/lamb, English pork, British dairy where specified. Confirm final numbers 72h before event.</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  win.document.close();
}

/* ============================================================ SALES PIPELINE (merged) */
const ENQ_STAGES=[["enquiry","Enquiry"],["provisional","Provisional"],["confirmed","Confirmed"],["cancelled","Cancelled"]];
const ENQ_OWNERS=["Nicola Cartwright","Natalie Freeman","Ajay Kawa","Raj Kumar","Alia Taub"];
const ENQ_SOURCES=["Website","Events chat","Hitched","arrangeMY / agent","Phone","Email","Walk-in","Referral","BOB / Rezlynx","Other"];

let PIPE_FILTER={ room:"", event:"", status:"", owner:"", source:"", search:"" };
function pipeFilterActive(){ return Object.values(PIPE_FILTER).some(x=>x); }

function pipelineData(){
  const out=[];
  DB.all().forEach(e=>out.push(Object.assign({_kind:"enquiry"}, e)));
  if(typeof BOB!=="undefined"){
    const map={ prospect:"provisional", confirmed:"confirmed", cancelled:"cancelled" };
    ["prospect","confirmed","cancelled"].forEach(bucket=>{
      BOB[bucket].forEach(r=>out.push({
        _kind:"bob", id:"BOB-"+r.ref, name:r.guest, value:r.value, pax:r.pax,
        room:roomIdFromName(r.room), roomName:r.room, date:r.arrival,
        status:map[bucket], owner:r.operator, source:"BOB / Rezlynx",
        ratePlan:r.ratePlan, ref:r.ref, created:r.arrival||BOB.pulled,
        notes:`Rezlynx ${bucket} · ${r.ratePlan} · ref ${r.ref}` }));
    });
  }
  return out;
}
function roomIdFromName(name){ const r=ROOMS.find(x=>x.name===name); return r?r.id:""; }

function renderPipeline(v){
  const ph=head("Sales Pipeline","Track every enquiry from first contact to confirmed — with conversion, traffic-light status and event-type breakdown.");
  v.appendChild(ph);
  const tb=el("div","pipe-toolbar");
  tb.innerHTML=`<div class="rag-legend">
      <span><i class="rag rag-green"></i>Confirmed</span>
      <span><i class="rag rag-yellow"></i>In progress</span>
      <span><i class="rag rag-amber"></i>Needs chasing</span>
      <span><i class="rag rag-red"></i>Lost</span>
    </div>
    <div class="pipe-actions">
      <button class="btn" id="enq-new">+ New enquiry</button>
      <button class="btn ghost" id="enq-chat">Events chat</button>
      <button class="btn ghost" id="enq-link">Copy chat link</button>
    </div>`;
  v.appendChild(tb);
  $("#enq-new").onclick=()=>openEnquiryForm({});
  $("#enq-chat").onclick=()=>switchTab("chat");
  $("#enq-link").onclick=()=>{ const url=location.href.split("#")[0]+"#events-chat";
    navigator.clipboard?.writeText(url); alert("Shareable events-chat link copied:\n"+url); };

  let allRaw=pipelineData();
  // apply active filter to the WHOLE dashboard (KPIs, charts, conversion, table all move together)
  const scoped = allRaw.filter(e=>{
    const roomName=e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"";
    if(PIPE_FILTER.room && roomName!==PIPE_FILTER.room) return false;
    if(PIPE_FILTER.owner && e.owner!==PIPE_FILTER.owner) return false;
    if(PIPE_FILTER.event && e.event!==PIPE_FILTER.event) return false;
    if(PIPE_FILTER.source && e.source!==PIPE_FILTER.source) return false;
    return true;
  });
  const scopeActive = PIPE_FILTER.room||PIPE_FILTER.owner||PIPE_FILTER.event||PIPE_FILTER.source;
  if(scopeActive){
    const chip=el("div","scope-chip");
    chip.innerHTML=`<span>Filtered: <b>${[PIPE_FILTER.owner,PIPE_FILTER.room,PIPE_FILTER.event?EVENT_TYPES.find(t=>t.id===PIPE_FILTER.event)?.label:"",PIPE_FILTER.source].filter(Boolean).join(" · ")}</b></span><button id="scope-clear">✕ Clear</button>`;
    v.appendChild(chip);
    $("#scope-clear").onclick=()=>{ PIPE_FILTER={room:"",event:"",status:"",owner:"",source:"",search:""}; render(); };
  }
  // dashboard sections read from the scoped set
  allRaw = scoped;

  // ---- KPI cards (on full dataset) ----
  const openAll=allRaw.filter(e=>["enquiry","provisional"].includes(e.status));
  const confAll=allRaw.filter(e=>e.status==="confirmed");
  const today=new Date().toISOString().slice(0,10);
  const overdue=allRaw.filter(e=>e.followUp && e.followUp<today && ["enquiry","provisional"].includes(e.status)).length;
  const kpis=el("div","stat-cards");
  kpis.innerHTML=`
    <div class="stat-card accent"><div class="sc-v">${money(Math.round(openAll.reduce((s,e)=>s+(e.value||0),0)))}</div><div class="sc-k">Open pipeline value</div></div>
    <div class="stat-card"><div class="sc-v">${openAll.length}</div><div class="sc-k">Open opportunities</div></div>
    <div class="stat-card"><div class="sc-v">${money(Math.round(confAll.reduce((s,e)=>s+(e.value||0),0)))}</div><div class="sc-k">Confirmed value</div></div>
    <div class="stat-card"><div class="sc-v">${confAll.length}</div><div class="sc-k">Confirmed</div></div>
    <div class="stat-card"><div class="sc-v">${allRaw.length}</div><div class="sc-k">Total records</div></div>
    <div class="stat-card"><div class="sc-v" style="${overdue?'color:#b3261e':''}">${overdue}</div><div class="sc-k">Follow-ups overdue</div></div>`;
  v.appendChild(kpis);

  // ---- conversion report + lost reasons ----
  const confN=confAll.length, cancN=allRaw.filter(e=>e.status==="cancelled").length;
  const decided=confN+cancN;
  const convRate=decided? Math.round(confN/decided*100):0;
  const lostReasons={};
  allRaw.filter(e=>e.status==="cancelled"&&e.lostReason).forEach(e=>{ lostReasons[e.lostReason]=(lostReasons[e.lostReason]||0)+1; });

  // ==== ACTION LIST — needs chasing (overdue follow-ups), by value ====
  const needsChasing=allRaw.filter(e=>["enquiry","provisional"].includes(e.status) && e.followUp && e.followUp<today)
    .sort((a,b)=>(b.value||0)-(a.value||0));
  const noFollowUp=allRaw.filter(e=>["enquiry","provisional"].includes(e.status) && !e.followUp && (e.value||0)>0)
    .sort((a,b)=>(b.value||0)-(a.value||0));
  const action=el("div","action-panel");
  const fmtD=d=>d?new Date(d).toLocaleDateString("en-GB"):"—";
  action.innerHTML=`<div class="ap-head"><h3>🔴 Needs your attention</h3>
    <span class="ap-sub">${needsChasing.length} overdue · ${noFollowUp.length} with no follow-up set</span></div>
    ${needsChasing.length||noFollowUp.length? `<div class="ap-list">
      ${needsChasing.slice(0,6).map(e=>{ const et=EVENT_TYPES.find(t=>t.id===e.event);
        return `<div class="ap-row" data-id="${e.id}">
          <span class="rag rag-amber"></span>
          <span class="ap-name">${e.name}</span>
          <span class="ap-meta">${et?et.label:(e.ratePlan||"—")} · ${e.owner||"Unassigned"}</span>
          <span class="ap-due overdue">Follow-up due ${fmtD(e.followUp)}</span>
          <span class="ap-val">${e.value?money(Math.round(e.value)):""}</span></div>`; }).join("")}
      ${noFollowUp.slice(0,4).map(e=>{ const et=EVENT_TYPES.find(t=>t.id===e.event);
        return `<div class="ap-row" data-id="${e.id}">
          <span class="rag rag-yellow"></span>
          <span class="ap-name">${e.name}</span>
          <span class="ap-meta">${et?et.label:(e.ratePlan||"—")} · ${e.owner||"Unassigned"}</span>
          <span class="ap-due">No follow-up set</span>
          <span class="ap-val">${e.value?money(Math.round(e.value)):""}</span></div>`; }).join("")}
    </div>` : `<div class="ap-empty">✓ Nothing overdue — every open enquiry has a follow-up scheduled.</div>`}`;
  v.appendChild(action);
  action.querySelectorAll(".ap-row").forEach(row=>row.onclick=()=>{
    const e=allRaw.find(x=>x.id===row.dataset.id); if(e) openEnquiryDetail(e); });

  // ==== SPACE HELD IN GUESTLINE ====
  const held=allRaw.filter(e=>e.spaceHeld && !["cancelled"].includes(e.status));
  if(held.length){
    const fmtD=d=>d?new Date(d).toLocaleDateString("en-GB"):"—";
    const withStatus=held.map(e=>({e,st:holdStatus(e)})).sort((a,b)=>(a.e.holdExpiry||"").localeCompare(b.e.holdExpiry||""));
    const expired=withStatus.filter(x=>x.st==="expired").length;
    const expiring=withStatus.filter(x=>x.st==="expiring").length;
    const hp=el("div","held-panel");
    hp.innerHTML=`<div class="ap-head"><h3>📋 Space held in Guestline</h3>
      <span class="ap-sub">${held.length} held · <span style="color:#c07a3e">${expiring} expiring soon</span> · <span style="color:#b3261e">${expired} to release</span></span></div>
      <div class="ap-list">${withStatus.slice(0,10).map(({e,st})=>{
        const et=EVENT_TYPES.find(t=>t.id===e.event);
        const dot = st==="expired"?"rag-red":st==="expiring"?"rag-amber":"rag-green";
        const note = st==="expired"?"Hold expired — release or confirm":st==="expiring"?"Expiring soon — chase":"Held";
        return `<div class="ap-row" data-id="${e.id}">
          <span class="rag ${dot}"></span>
          <span class="ap-name">${e.name}</span>
          <span class="ap-meta">${et?et.label:(e.ratePlan||"—")}${e.date&&/^\d{4}/.test(e.date)?" · event "+fmtD(e.date):""}</span>
          <span class="ap-due ${st==="expired"?"overdue":""}">${note} · holds to ${fmtD(e.holdExpiry)}</span>
          <span class="ap-val">${e.value?money(Math.round(e.value)):""}</span></div>`;
      }).join("")}</div>`;
    v.appendChild(hp);
    hp.querySelectorAll(".ap-row").forEach(row=>row.onclick=()=>{
      const e=allRaw.find(x=>x.id===row.dataset.id); if(e) openEnquiryDetail(e); });
  }

  // ==== CONVERSION ROW: win-rate + by event type side by side ====
  const convWrap=el("div","conv-wrap");
  // win rate card
  const wrCard=el("div","quote-panel");
  wrCard.innerHTML=`<div class="cc-title" style="margin-top:0">Conversion</div>
    <div class="conv-main" style="margin-top:8px">
      <div class="conv-rate"><span class="cr-v">${convRate}%</span><span class="cr-k">Win rate (of decided)</span></div>
      <div class="conv-bar"><span class="cb-won" style="flex:${confN||0.001}"></span><span class="cb-lost" style="flex:${cancN||0.001}"></span></div>
      <div class="conv-nums"><span class="cn-won">${confN} won</span> · <span class="cn-lost">${cancN} lost</span></div>
    </div>
    ${Object.keys(lostReasons).length?`<div class="lost-reasons" style="margin-top:12px"><span class="lr-label">Lost reasons:</span>${Object.entries(lostReasons).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<span class="lr-pill">${r} <b>${n}</b></span>`).join("")}</div>`:""}`;
  convWrap.appendChild(wrCard);
  // by event type
  const byType={};
  allRaw.forEach(e=>{ const et=EVENT_TYPES.find(t=>t.id===e.event);
    const key = et? et.id : (e.ratePlan?"corporate":"other");
    const label = et? et.label : (e.ratePlan?"Corporate / Rooms":"Other");
    const icon = et? et.icon : "🏢";
    const t=byType[key]||(byType[key]={label,icon,total:0,open:0,won:0,lost:0,wonValue:0});
    t.total++;
    if(e.status==="confirmed"){ t.won++; t.wonValue+=e.value||0; }
    else if(e.status==="cancelled"){ t.lost++; } else t.open++;
  });
  const types=Object.values(byType).sort((a,b)=>b.total-a.total);
  const etPanel=el("div","quote-panel");
  etPanel.innerHTML=`<div class="cc-title" style="margin-top:0">By event type</div>
    <table class="ettable">
      <tr><th>Type</th><th>Open</th><th>Won</th><th>Lost</th><th>Win rate</th></tr>
      ${types.map(t=>{ const dec=t.won+t.lost; const wr=dec?Math.round(t.won/dec*100):0;
        return `<tr class="ettr" data-type="${t.label}">
          <td><b>${t.icon} ${t.label}</b></td><td>${t.open}</td>
          <td class="et-won">${t.won}</td><td class="et-lost">${t.lost}</td>
          <td><div class="et-wrbar"><span style="width:${wr}%"></span></div><span class="et-wr">${wr}%</span></td></tr>`;
      }).join("")}
    </table><p class="qs-sub" style="margin-top:6px">Click a type to filter below.</p>`;
  convWrap.appendChild(etPanel);
  v.appendChild(convWrap);
  etPanel.querySelectorAll(".ettr").forEach(row=>row.onclick=()=>{
    const label=row.dataset.type; const et=EVENT_TYPES.find(t=>t.label===label);
    if(et){ PIPE_FILTER.event=et.id; render(); }
  });

  // ==== charts (collapsible, secondary) ====
  const chartBase=allRaw.filter(e=>["enquiry","provisional","confirmed"].includes(e.status));
  const row1=el("div","chart-row");
  row1.appendChild(clickableChart("Pipeline value by room","room", barChartData(chartBase,e=>e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"—")));
  row1.appendChild(clickableChart("Pipeline value by owner","owner", pieChartData(chartBase,e=>e.owner||"Unassigned")));
  v.appendChild(row1);

  // ---- FILTER BAR ----
  const rooms=[...new Set(allRaw.map(e=>e.roomName||ROOMS.find(r=>r.id===e.room)?.name).filter(Boolean))].sort();
  const owners=[...new Set(allRaw.map(e=>e.owner).filter(Boolean))].sort();
  const sources=[...new Set(allRaw.map(e=>e.source).filter(Boolean))].sort();
  const bar=el("div","filter-bar");
  bar.innerHTML=`
    <input id="fb-search" placeholder="🔍 Search name…" value="${PIPE_FILTER.search}">
    <select id="fb-status"><option value="">All statuses</option>${ENQ_STAGES.map(([s,l])=>`<option value="${s}" ${PIPE_FILTER.status===s?"selected":""}>${l}</option>`).join("")}</select>
    <select id="fb-room"><option value="">All rooms</option>${rooms.map(r=>`<option ${PIPE_FILTER.room===r?"selected":""}>${r}</option>`).join("")}</select>
    <select id="fb-event"><option value="">All event types</option>${EVENT_TYPES.map(t=>`<option value="${t.id}" ${PIPE_FILTER.event===t.id?"selected":""}>${t.label}</option>`).join("")}</select>
    <select id="fb-owner"><option value="">All owners</option>${owners.map(o=>`<option ${PIPE_FILTER.owner===o?"selected":""}>${o}</option>`).join("")}</select>
    <select id="fb-source"><option value="">All sources</option>${sources.map(s=>`<option ${PIPE_FILTER.source===s?"selected":""}>${s}</option>`).join("")}</select>
    ${pipeFilterActive()?`<button class="btn ghost sm" id="fb-clear">Clear</button>`:""}`;
  v.appendChild(bar);
  const setF=(k,val)=>{ PIPE_FILTER[k]=val; renderPipeRows(); updateFilterCount(); };
  $("#fb-search").oninput=e=>setF("search",e.target.value);
  $("#fb-status").onchange=e=>setF("status",e.target.value);
  $("#fb-room").onchange=e=>setF("room",e.target.value);
  $("#fb-event").onchange=e=>setF("event",e.target.value);
  $("#fb-owner").onchange=e=>setF("owner",e.target.value);
  $("#fb-source").onchange=e=>setF("source",e.target.value);
  if($("#fb-clear")) $("#fb-clear").onclick=()=>{ PIPE_FILTER={room:"",event:"",status:"",owner:"",source:"",search:""}; render(); };

  // filtered count + table container
  v.appendChild(el("div","pipe-count",`<span id="pipe-count"></span>`));
  const tableWrap=el("div"); tableWrap.id="pipe-table"; v.appendChild(tableWrap);

  window._pipeAll=allRaw;
  renderPipeRows(); updateFilterCount();
}

function filteredPipe(){
  const today=new Date().toISOString().slice(0,10);
  return (window._pipeAll||[]).filter(e=>{
    const roomName=e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"";
    if(PIPE_FILTER.room && roomName!==PIPE_FILTER.room) return false;
    if(PIPE_FILTER.status && e.status!==PIPE_FILTER.status) return false;
    if(PIPE_FILTER.event && e.event!==PIPE_FILTER.event) return false;
    if(PIPE_FILTER.owner && e.owner!==PIPE_FILTER.owner) return false;
    if(PIPE_FILTER.source && e.source!==PIPE_FILTER.source) return false;
    if(PIPE_FILTER.search && !(e.name||"").toLowerCase().includes(PIPE_FILTER.search.toLowerCase())) return false;
    return true;
  });
}
function updateFilterCount(){
  const c=$("#pipe-count"); if(!c)return;
  const list=filteredPipe();
  const val=list.reduce((s,e)=>s+(e.value||0),0);
  c.innerHTML=`Showing <b>${list.length}</b> of ${(window._pipeAll||[]).length} · total value <b>${money(Math.round(val))}</b>`;
}
const STATUS_LABEL={enquiry:"Enquiry",provisional:"Provisional",confirmed:"Confirmed",cancelled:"Cancelled"};
/* Space-held auto-expiry per Nicola's rules:
   event <1 month away → hold 1 week; 1–8 months → 2 weeks; 8–12+ → 3 weeks.
   Held date defaults to today (when the tick is set). */
function holdExpiry(eventDate, heldFrom){
  const from = heldFrom? new Date(heldFrom) : new Date();
  let weeks = 2;
  if(eventDate && /^\d{4}-\d{2}-\d{2}/.test(eventDate)){
    const months = (new Date(eventDate) - from) / (1000*60*60*24*30.44);
    if(months < 1) weeks = 1;
    else if(months < 8) weeks = 2;
    else weeks = 3;
  }
  const exp = new Date(from); exp.setDate(exp.getDate() + weeks*7);
  return { weeks, expiry: exp.toISOString().slice(0,10) };
}
function holdStatus(e){
  if(!e.spaceHeld) return null;
  const today=new Date().toISOString().slice(0,10);
  const exp=e.holdExpiry||"";
  if(!exp) return "held";
  if(exp<today) return "expired";      // needs cancelling/releasing
  const soon=new Date(); soon.setDate(soon.getDate()+3);
  if(exp<=soon.toISOString().slice(0,10)) return "expiring"; // chase now
  return "held";
}

function ragStatus(e){
  if(e.rag) return e.rag; // manual override wins
  if(e.status==="confirmed") return "green";   // won
  if(e.status==="cancelled") return "red";     // lost
  // in progress (enquiry / provisional): yellow, or amber if follow-up overdue
  const today=new Date().toISOString().slice(0,10);
  if(e.followUp && e.followUp<today) return "amber"; // needs chasing
  return "yellow";
}
function renderPipeRows(){
  const box=$("#pipe-table"); if(!box)return;
  const list=filteredPipe().sort((a,b)=>(b.value||0)-(a.value||0));
  const today=new Date().toISOString().slice(0,10);
  const fmtDate=d=>d?(/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):d):"—";
  if(!list.length){ box.innerHTML=`<div class="empty"><div class="big">No matches</div>Try clearing a filter.</div>`; return; }
  box.innerHTML=`<table class="pipe-table">
    <tr><th title="Status: Red overdue · Amber due soon · Green on track">RAG</th><th>Name</th><th>Status</th><th>Event / Rate</th><th>Room</th><th>Date</th><th>PAX</th><th>Owner</th><th>Last follow-up</th><th>Next follow-up</th><th style="text-align:right">Value</th></tr>`+
    list.slice(0,200).map(e=>{
      const roomName=e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"—";
      const et=EVENT_TYPES.find(t=>t.id===e.event);
      const rag=ragStatus(e);
      const overdueF = e.followUp && e.followUp<today && !["confirmed","cancelled"].includes(e.status);
      return `<tr class="pipe-row" data-id="${e.id}">
        <td><span class="rag rag-${rag}" title="${rag}"></span></td>
        <td class="pr-name">${e.name}${overdueF?' <span class="pr-flag" title="Follow-up overdue">⚠</span>':''}</td>
        <td><span class="status-pill st-${e.status}">${STATUS_LABEL[e.status]||e.status}</span></td>
        <td>${et?et.icon+" "+et.label:(e.ratePlan||"—")}</td>
        <td>${roomName}</td><td>${fmtDate(e.date)}</td><td>${e.pax||"—"}</td>
        <td>${e.owner||"—"}</td>
        <td>${e.lastFollowUp?fmtDate(e.lastFollowUp):"—"}</td>
        <td class="${overdueF?'fu-over':''}">${e.followUp?fmtDate(e.followUp):"—"}</td>
        <td style="text-align:right;font-weight:600">${e.value?money(Math.round(e.value)):"—"}</td></tr>`;
    }).join("")+`</table>${list.length>200?`<div class="qs-sub" style="margin-top:8px">Showing first 200 — narrow with filters to see more.</div>`:""}`;
  box.querySelectorAll(".pipe-row").forEach(row=>row.onclick=()=>{
    const e=list.find(x=>x.id===row.dataset.id); if(e) openEnquiryDetail(e); });
}

/* chart data helpers that return {label,val} sorted */
function barChartData(arr,keyFn,limit=8){
  const m={}; arr.forEach(e=>{ const k=keyFn(e)||"—"; m[k]=(m[k]||0)+(e.value||0); });
  let ent=Object.entries(m).filter(([,val])=>val>0).sort((a,b)=>b[1]-a[1]);
  if(ent.length>limit){ const top=ent.slice(0,limit-1);
    top.push(["Other",ent.slice(limit-1).reduce((s,[,val])=>s+val,0)]); ent=top; }
  return ent.map(([label,val])=>({label,val}));
}
function pieChartData(arr,keyFn,limit=6){ return barChartData(arr,keyFn,limit); }

function clickableChart(title,filterKey,data){
  const card=el("div","chart-card clickable");
  const isBar = data.length>5 || title.includes("room");
  card.innerHTML=`<div class="cc-title">${title} <span class="cc-hint">click to filter</span></div>${isBar?barChart(data):pieChart(data)}`;
  const chooser=el("div","chart-filter-row");
  chooser.innerHTML=data.map(d=>`<button class="cf-btn" data-val="${d.label.replace(/"/g,'&quot;')}">${d.label} · ${money(Math.round(d.val))}</button>`).join("");
  chooser.querySelectorAll(".cf-btn").forEach(b=>b.onclick=(e)=>{ e.stopPropagation();
    if(b.dataset.val==="Other") return;
    PIPE_FILTER[filterKey]=b.dataset.val; render(); });
  card.appendChild(chooser);
  return card;
}
function openEnquiryForm(pre){
  const today=new Date().toISOString().slice(0,10);
  const body=`<div class="form-grid">
    <div><label>Name *</label><input id="e-name" placeholder="Customer name"></div>
    <div><label>Company</label><input id="e-co"></div>
    <div><label>Email</label><input id="e-email" type="email"></div>
    <div><label>Phone</label><input id="e-phone"></div>
    <div><label>Event type</label><select id="e-event">${EVENT_TYPES.map(t=>`<option value="${t.id}" ${pre.event===t.id?"selected":""}>${t.label}</option>`).join("")}</select></div>
    <div><label>Event date</label><input id="e-date" type="date"></div>
    <div><label>Room of interest</label><select id="e-room"><option value="">Any / unsure</option>${ROOMS.map(r=>`<option value="${r.id}" ${pre.room===r.id?"selected":""}>${r.name}</option>`).join("")}</select></div>
    <div><label>Guests</label><input id="e-pax" type="number" min="1"></div>
    <div><label>Owner</label><select id="e-owner">${ENQ_OWNERS.map(o=>`<option ${SESSION&&SESSION.name===o?"selected":""}>${o}</option>`).join("")}</select></div>
    <div><label>Stage</label><select id="e-stage">${ENQ_STAGES.map(([s,l])=>`<option value="${s}">${l}</option>`).join("")}</select></div>
    <div><label>Estimated value (£)</label><input id="e-value" type="number" min="0" placeholder="0"></div>
    <div><label>Source</label><select id="e-source">${ENQ_SOURCES.map(s=>`<option>${s}</option>`).join("")}</select></div>
    <div><label>Follow-up date</label><input id="e-followup" type="date" value="${today}"></div>
    <div></div>
    <div class="full"><label>Allergens &amp; dietary requirements</label><input id="e-allergens" placeholder="e.g. 2 vegetarian, 1 coeliac, 1 nut allergy"></div>
    <div class="full"><label>Notes</label><textarea id="e-notes" rows="3" placeholder="Requirements, budget, questions…"></textarea></div>
  </div>
  <div style="margin-top:18px"><button class="btn" id="e-submit">Save enquiry</button></div>`;
  showModal("New enquiry","Capture and manage a customer enquiry",body);
  $("#e-submit").onclick=()=>{
    const name=$("#e-name").value.trim();
    if(!name){ $("#e-name").focus(); return; }
    DB.add({ name, company:$("#e-co").value, email:$("#e-email").value, phone:$("#e-phone").value,
      event:$("#e-event").value, date:$("#e-date").value, room:$("#e-room").value,
      pax:parseInt($("#e-pax").value)||null, owner:$("#e-owner").value, status:$("#e-stage").value,
      value:parseFloat($("#e-value").value)||0, source:$("#e-source").value, followUp:$("#e-followup").value,
      allergens:$("#e-allergens").value, notes:$("#e-notes").value });
    closeModal(); render();
  };
}
function openEnquiryDetail(e){
  const roomName=e.roomName||ROOMS.find(r=>r.id===e.room)?.name;
  const et=EVENT_TYPES.find(t=>t.id===e.event);
  const fmtDate=d=>d?(/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):d):"—";
  const isBob = e._kind==="bob";
  const body=`<div class="detail-row">
      <div class="stat"><div class="k">${et?"Event":"Rate plan"}</div><div class="v" style="font-size:16px">${et?et.label:(e.ratePlan||"—")}</div></div>
      <div class="stat"><div class="k">${isBob?"PAX":"Guests"}</div><div class="v">${e.pax||"—"}</div></div>
      <div class="stat"><div class="k">Value</div><div class="v">${e.value?money(Math.round(e.value)):"—"}</div></div>
      ${roomName?`<div class="stat"><div class="k">Room</div><div class="v" style="font-size:15px">${roomName}</div></div>`:""}
    </div>
    ${isBob?`<div class="bob-note">📊 From Rezlynx business-on-books (ref ${e.ref}). Editing below promotes it to a managed enquiry.</div>`:""}

    <div class="sec-title">Manage</div>
    <div class="manage-grid">
      <div><label>Owner</label><select id="m-owner">${ENQ_OWNERS.map(o=>`<option ${e.owner===o?"selected":""}>${o}</option>`).join("")}</select></div>
      <div><label>Stage</label><select id="m-stage">${ENQ_STAGES.map(([s,l])=>`<option value="${s}" ${e.status===s?"selected":""}>${l}</option>`).join("")}</select></div>
      <div><label>Value (£)</label><input id="m-value" type="number" min="0" value="${Math.round(e.value)||0}"></div>
      <div><label>Event date</label><input id="m-date" type="date" value="${/^\d{4}-\d{2}-\d{2}/.test(e.date||"")?e.date.slice(0,10):""}"></div>
      <div><label>Follow-up (next)</label><input id="m-followup" type="date" value="${e.followUp||""}"></div>
      <div><label>Source</label><select id="m-source">${ENQ_SOURCES.map(s=>`<option ${e.source===s?"selected":""}>${s}</option>`).join("")}</select></div>
      <div><label>Status flag (RAG)</label><select id="m-rag"><option value="">Auto</option><option value="red" ${e.rag==="red"?"selected":""}>🔴 Red</option><option value="amber" ${e.rag==="amber"?"selected":""}>🟠 Amber</option><option value="green" ${e.rag==="green"?"selected":""}>🟢 Green</option></select></div>
      <div id="m-lostwrap" class="${e.status==="cancelled"?"":"hidden"}"><label>Lost reason</label><select id="m-lost">${LOST_REASONS.map(r=>`<option ${e.lostReason===r?"selected":""}>${r}</option>`).join("")}</select></div>
      <div class="full" style="border-top:1px solid var(--line);padding-top:12px;margin-top:4px">
        <label class="chk-label"><input type="checkbox" id="m-held" ${e.spaceHeld?"checked":""}> <b>Space held in Guestline</b></label>
      </div>
      <div><label>Held from</label><input id="m-heldfrom" type="date" value="${e.heldFrom||new Date().toISOString().slice(0,10)}"></div>
      <div><label>Hold expires <span class="qs-sub" id="m-holdauto"></span></label><input id="m-holdexp" type="date" value="${e.holdExpiry||""}"></div>
    </div>
    <button class="btn sm" id="m-save" style="margin-top:10px">Save changes</button>
    <div class="dual-btn" style="margin-top:10px">
      <button class="btn ghost sm" id="m-chase">✉ Send chase email</button>
      <button class="btn ghost sm" id="m-recalc">↻ Recalculate hold</button>
    </div>

    ${(e.email||e.phone)?`<div class="sec-title">Contact</div>
    <p style="font-size:14px">${e.email||"—"} · ${e.phone||"—"} ${e.company?" · "+e.company:""}</p>`:""}
    ${(e.budget||e.accommodation)?`<p style="font-size:14px;color:var(--muted)">${e.budget?`Budget: ${e.budget} · `:""}${e.accommodation?`Accommodation: ${e.accommodation}`:""}</p>`:""}
    ${e.allergens?`<div class="sec-title">Allergens &amp; dietary ⚠️</div><p style="font-size:14px;line-height:1.6;color:#b3261e">${e.allergens}</p>`:""}
    ${e.notes?`<div class="sec-title">Notes</div><p style="font-size:14px;line-height:1.6">${e.notes}</p>`:""}

    <div class="sec-title">Task checklist ${e._kind==="bob"?"":`<button class="mini-btn" id="m-genlist">${(e.checklist&&e.checklist.length)?"Regenerate":"Generate"}</button>`}</div>
    <div id="m-checklist"></div>

    ${e.costing?`<div class="sec-title">Profitability</div>
      <div class="enq-costing">
        <div><span class="ec-v">${money(Math.round(e.costing.profit))}</span><span class="ec-k">Est. profit</span></div>
        <div><span class="ec-v">${Math.round(e.costing.margin*100)}%</span><span class="ec-k">Margin</span></div>
        <div><span class="ec-v">${money(Math.round(e.costing.perCover))}</span><span class="ec-k">Per cover</span></div>
      </div>
      <p class="qs-sub" style="margin-top:6px">Costed ${new Date(e.costing.at).toLocaleDateString("en-GB")}</p>`:""}
    <div class="dual-btn" style="margin-top:16px">
      <button class="btn" id="enq-cost">${e.costing?"Re-cost this event":"Cost this event"}</button>
      <button class="btn ghost" id="enq-quote">Create a quote</button>
    </div>
    <button class="btn block" id="enq-agreement" style="margin-top:10px;background:#2f6f9e">📝 Generate agreement &amp; send for e-signature</button>
    <div class="qs-sub" style="margin-top:14px">Ref ${e.ref||e.id} · ${e.owner?`owned by ${e.owner}`:""}</div>`;
  showModal(e.name, `${et?et.label:(e.ratePlan||"Enquiry")} · ${isBob?"BOB / Rezlynx":(e.source||"manual")}`, body);

  // show/hide lost reason on stage change
  $("#m-stage").onchange=()=>{ $("#m-lostwrap").classList.toggle("hidden", $("#m-stage").value!=="cancelled"); };

  // checklist rendering
  let checklist = (e.checklist||[]).slice();
  function drawChecklist(){
    const box=$("#m-checklist"); if(!box)return;
    if(!checklist.length){ box.innerHTML=`<p class="qs-sub">No tasks yet${e._kind==="bob"?" (promote to a managed enquiry to add tasks)":" — Generate from the event type."}</p>`; return; }
    const today=new Date().toISOString().slice(0,10);
    box.innerHTML=`<div class="checklist">`+checklist.map((t,i)=>{
      const overdue=!t.done && t.due && t.due<today;
      return `<div class="chk-row ${t.done?"done":""}">
        <input type="checkbox" data-i="${i}" ${t.done?"checked":""}>
        <span class="chk-task">${t.task}</span>
        <span class="chk-due ${overdue?"overdue":""}">${t.due?new Date(t.due).toLocaleDateString("en-GB"):""}</span>
      </div>`; }).join("")+`</div>`;
    box.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.onchange=()=>{
      checklist[+cb.dataset.i].done=cb.checked; drawChecklist(); });
  }
  drawChecklist();
  if($("#m-genlist")) $("#m-genlist").onclick=()=>{
    const bookingDate=new Date(e.created||Date.now());
    const evDate = /^\d{4}-\d{2}-\d{2}/.test(e.date||"")? new Date(e.date) : null;
    checklist = checklistFor(e.event).map(t=>{
      let due;
      if(t.fromBooking){ due=new Date(bookingDate); due.setDate(due.getDate()+Math.abs(t.offset)); }
      else if(evDate){ due=new Date(evDate); due.setDate(due.getDate()-t.offset); }
      return { task:t.task, due: due? due.toISOString().slice(0,10):"", done:false };
    });
    drawChecklist();
  };

  // ---- space-held auto-calc ----
  function refreshHold(){
    const evDate=$("#m-date").value||e.date;
    const from=$("#m-heldfrom").value;
    const calc=holdExpiry(evDate, from);
    const auto=$("#m-holdauto"); if(auto) auto.textContent=`(auto: ${calc.weeks}wk)`;
    return calc;
  }
  if($("#m-held")){
    // pre-fill expiry if held ticked and none set
    if(e.spaceHeld && !e.holdExpiry){ $("#m-holdexp").value=refreshHold().expiry; } else { refreshHold(); }
    $("#m-held").onchange=()=>{ if($("#m-held").checked && !$("#m-holdexp").value){ $("#m-holdexp").value=refreshHold().expiry; } };
    $("#m-recalc").onclick=()=>{ $("#m-holdexp").value=refreshHold().expiry; $("#m-held").checked=true; };
    $("#m-heldfrom").onchange=refreshHold; $("#m-date").addEventListener("change",refreshHold);
  }

  // ---- chase email (to client + copy to team) ----
  if($("#m-chase")) $("#m-chase").onclick=()=>{
    const first=(e.name||"there").split(" ")[0];
    const evLabel=et?et.label:(e.ratePlan||"your event");
    const evDate=(/^\d{4}-\d{2}-\d{2}/.test(e.date||""))?new Date(e.date).toLocaleDateString("en-GB"):"your chosen date";
    const held=$("#m-held")?.checked;
    const exp=$("#m-holdexp")?.value? new Date($("#m-holdexp").value).toLocaleDateString("en-GB"):"";
    const subject=`Brandon Hall Hotel and Spa — your ${evLabel} enquiry`;
    const holdLine = held && exp
      ? `We're currently holding the space and bedrooms for you until ${exp}. As we do have other interest in these dates, I wanted to check in before the hold expires.`
      : `I wanted to check in on your enquiry and see whether there's anything more I can help with.`;
    const body=`Dear ${first},

Thank you again for considering Brandon Hall Hotel and Spa for your ${evLabel} on ${evDate}.

${holdLine}

If you'd like to go ahead, or if you have any questions at all, do let me know and I'll be delighted to help.

Warm regards,
${SESSION?.name||"The Events Team"}
Brandon Hall Hotel and Spa
024 7710 2555 · events@brandonhallhotelandspa.com`;
    const to=e.email? encodeURIComponent(e.email):"";
    const cc=encodeURIComponent("events@brandonhallhotelandspa.com");
    const mailto=`mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href=mailto;
    // log the chase against the enquiry
    const today=new Date().toISOString().slice(0,10);
    const chases=(e.chases||[]).slice(); chases.push({ at:new Date().toISOString(), by:SESSION?.name||"" });
    if(!isBob){ DB.update(e.id,{ chases, lastChase:today }); }
    if($("#m-chaselog")) $("#m-chaselog").textContent=`Last chased: ${new Date().toLocaleDateString("en-GB")} (${chases.length} total)`;
  };

  $("#m-save").onclick=()=>{
    const newFollowUp=$("#m-followup").value;
    // if the follow-up date changed, record the previous one as "last follow-up"
    const lastFollowUp = (e.followUp && newFollowUp!==e.followUp) ? e.followUp : (e.lastFollowUp||"");
    const patch={ owner:$("#m-owner").value, status:$("#m-stage").value,
      value:parseFloat($("#m-value").value)||0, date:$("#m-date").value||e.date,
      followUp:newFollowUp, lastFollowUp, rag:$("#m-rag").value, source:$("#m-source").value, checklist,
      spaceHeld:$("#m-held")?.checked||false, heldFrom:$("#m-heldfrom")?.value||"", holdExpiry:$("#m-holdexp")?.value||"" };
    if($("#m-stage").value==="cancelled") patch.lostReason=$("#m-lost").value;
    if(isBob){
      DB.add(Object.assign({ name:e.name, pax:e.pax, room:e.room, roomName:e.roomName,
        ratePlan:e.ratePlan, ref:e.ref, notes:e.notes, event:e.event||"" }, patch));
    } else {
      DB.update(e.id, patch);
    }
    closeModal(); render();
  };
  $("#enq-cost").onclick=()=>{ closeModal(); profitPrefill={ enquiry:e }; switchTab("profit"); };
  $("#enq-quote").onclick=()=>{ closeModal(); prefill={room:e.room||"woodlands",event:e.event||"wedding",pax:parseInt(e.pax)||40}; switchTab("quote"); };
  if($("#enq-agreement")) $("#enq-agreement").onclick=()=>openAgreementDialog(e);
}

/* ============================================================ ADMIN */
function renderAdmin(v){
  v.appendChild(head("Admin","Reference data, room readiness and competitor benchmarking for the team."));
  v.appendChild(el("div","admin-note",
    `<b>Demo mode.</b> Rooms, rates and packages read from <code>data.js</code>. Enquiries are stored in this browser only until Firebase is connected.`));

  v.appendChild(el("div","sec-title","Users"));
  const ut=el("table","data-table");
  ut.innerHTML=`<tr><th>Name</th><th>Access code</th><th>Role</th></tr>`+
    Object.values(USERS).map(u=>`<tr><td>${u.name}</td><td>${u.code}</td><td>${u.role}</td></tr>`).join("");
  v.appendChild(ut);

  // Room readiness (from M&E audit) — admin only
  v.appendChild(el("div","sec-title","Room readiness (M&E audit)"));
  const rd=el("table","data-table");
  rd.innerHTML=`<tr><th>Room</th><th>Status</th><th>Note</th></tr>`+
    ROOMS.map(r=>{ const t=roomTech(r);
      const status = t.sellable
        ? `<span class="badge-ok">✓ Ready to sell</span>`
        : `<span style="color:#b3261e;font-weight:600">✗ Not ready</span>`;
      return `<tr><td>${r.name}</td><td>${status}</td><td style="font-size:12.5px;color:var(--muted)">${t.adminNote||"—"}</td></tr>`;
    }).join("");
  v.appendChild(rd);

  v.appendChild(el("div","sec-title","Rooms & hire rates"));
  const rt=el("table","data-table");
  rt.innerHTML=`<tr><th>Room</th><th>m²</th><th>Max cap</th><th>Half day</th><th>Full day</th></tr>`+
    ROOMS.map(r=>{const h=ROOM_HIRE[r.id]||{};
      return `<tr><td>${r.name}</td><td>${r.m2}</td><td>${maxCap(r)}</td><td>${h.half?money(h.half):"—"}</td><td>${h.full?money(h.full):"—"}</td></tr>`;}).join("");
  v.appendChild(rt);

  // Competitor benchmarking
  v.appendChild(el("div","sec-title","Competitor benchmarking"));
  v.appendChild(el("p","",`<span style="font-size:13px;color:var(--muted);font-style:italic">${COMPSET_NOTE}</span>`));
  const ct=el("table","data-table");
  ct.innerHTML=`<tr><th>Hotel</th><th>DDR</th><th>24hr</th><th>Wedding</th><th>Christmas</th><th>Afternoon Tea</th><th>Baby Shower</th></tr>`+
    COMPETITORS.map(c=>`<tr${c.us?' style="background:#eef2f8;font-weight:600"':''}>
      <td>${c.name}${c.us?' <span class="feat-tag" style="background:var(--navy)">US</span>':''}</td>
      <td>${c.ddr}</td><td>${c.h24}</td><td>${c.wedding}</td><td>${c.xmas}</td><td>${c.aftTea}</td><td>${c.babyShower}</td></tr>`).join("");
  v.appendChild(ct);
}

/* ============================================================ SUPPLIERS */
function renderSuppliers(v){
  v.appendChild(head("Supplier Directory","Trusted suppliers for DJs, catering, décor and entertainment. External suppliers must provide PLI and PAT certificates before an event."));
  const grid=el("div","sup-grid");
  SUPPLIERS.forEach(s=>{
    const card=el("div","sup-card"+(s.featured?" feat":""));
    const pli = s.compliance.pli===true?`<span class="badge-ok">✓ PLI</span>`:s.compliance.pli===false?`<span class="badge-no">✗ PLI</span>`:`<span class="badge-no">PLI —</span>`;
    const pat = s.compliance.pat===true?`<span class="badge-ok">✓ PAT</span>`:s.compliance.pat===false?`<span class="badge-no">✗ PAT</span>`:`<span class="badge-no">PAT —</span>`;
    card.innerHTML=`<h3>${s.name}${s.featured?`<span class="feat-tag">PREFERRED</span>`:""}</h3>
      <div class="cat">${s.category}</div>
      <div class="blurb">${s.blurb}</div>
      <div class="svc">${s.services.map(x=>`<span>${x}</span>`).join("")}</div>
      ${s.pricing.length?`<table class="cap-table" style="margin-bottom:4px">${s.pricing.map(([k,val])=>`<tr><td>${k}</td><td>${val}</td></tr>`).join("")}</table>`:""}
      <div class="compliance"><b>Compliance:</b> ${pli} ${pat}</div>
      ${s.contact.note?`<p style="font-size:12.5px;color:var(--muted);margin-top:8px">${s.contact.note}</p>`:""}`;
    grid.appendChild(card);
  });
  v.appendChild(grid);
}

/* ============================================================ EVENTS CONCIERGE CHAT */
let BOT={ active:false, steps:[], idx:0, answers:{}, eventType:null };
function renderChat(v){
  v.appendChild(head("Events Concierge","A guided chat that captures complete enquiries and drops them into your dashboard. Share the link or embed the button on the hotel website."));
  const grid=el("div","chat-intro-grid");

  // left: live preview
  const left=el("div");
  left.innerHTML=`<div class="sec-title">Live preview</div>`;
  const frame=el("div","chat-frame"); frame.id="chat-frame";
  left.appendChild(frame);
  grid.appendChild(left);

  // right: share + embed
  const right=el("div");
  const shareUrl=location.href.split("#")[0]+"#events-chat";
  const embed=`<a href="${shareUrl}" target="_blank"
  style="display:inline-flex;align-items:center;gap:8px;background:#1a2b47;color:#fff;
  padding:13px 24px;border-radius:30px;font:600 15px/1 'Inter',sans-serif;
  text-decoration:none;box-shadow:0 4px 14px rgba(26,43,71,.3)">
  💬 Chat to our events specialist</a>`;
  right.innerHTML=`
    <div class="sec-title">Shareable link</div>
    <p style="font-size:14px;margin-bottom:6px">Send this to customers, or use it as the destination for a website button:</p>
    <div class="embed-box">${shareUrl}<button class="cp" data-copy="${shareUrl}">Copy</button></div>

    <div class="sec-title">Website button (copy &amp; paste)</div>
    <p style="font-size:14px;margin-bottom:6px">Paste this HTML anywhere on the hotel website to add the button:</p>
    <div class="embed-box">${embed.replace(/</g,"&lt;")}<button class="cp" data-copy-html>Copy</button></div>

    <div class="sec-title">How it looks</div>
    <div style="padding:20px;background:var(--paper);border-radius:10px;text-align:center">
      <a class="btn-preview" href="${shareUrl}" target="_blank" style="text-decoration:none">Chat to our events specialist</a>
    </div>

    <div class="admin-note" style="margin-top:18px">
      <b>Guided mode.</b> Runs as a smart branching conversation now — no AI key or cost.
      Upgrade to the full Claude-powered assistant later via a Firebase function (see README).
    </div>`;
  grid.appendChild(right);
  v.appendChild(grid);

  right.querySelector("[data-copy]")?.addEventListener("click",e=>{
    navigator.clipboard?.writeText(e.target.dataset.copy); e.target.textContent="Copied"; });
  right.querySelector("[data-copy-html]")?.addEventListener("click",e=>{
    navigator.clipboard?.writeText(embed); e.target.textContent="Copied"; });

  startBot(frame);
}

function startBot(frame){
  BOT={ active:true, steps:[], idx:0, answers:{}, eventType:null, phase:"start" };
  frame.innerHTML=`
    <div class="chat-header">
      <div class="avatar">${BOT_PERSON.avatar}</div>
      <div><div class="ct">${BOT_PERSON.name}</div><div class="cs">${BOT_PERSON.role}</div></div>
      <div class="online"></div></div>
    <div class="chat-body" id="chat-body"></div>
    <div class="chat-opts" id="chat-opts"></div>
    <div class="chat-input" id="chat-input"><input placeholder="Type your message…" id="chat-field">
      <button id="chat-send" aria-label="Send">➤</button></div>`;
  // sequential greeting bubbles, then first question
  let d=400;
  BOT_GREETINGS.forEach((g,i)=>{ setTimeout(()=>botSay(g), d); d+=g.length*18+400; });
  BOT.steps=[...BOT_COMMON_START];
  setTimeout(()=>askNext(), d);
  $("#chat-send").onclick=submitChat;
  $("#chat-field").addEventListener("keydown",e=>{ if(e.key==="Enter")submitChat(); });
}
function typing(cb){ const b=$("#chat-body"); if(!b){cb&&cb();return;}
  const t=el("div","bubble bot typing","<span></span><span></span><span></span>");
  b.appendChild(t); b.scrollTop=b.scrollHeight;
  setTimeout(()=>{ t.remove(); cb&&cb(); }, 650);
}
function botSay(text){ const b=$("#chat-body"); if(!b)return;
  typing(()=>{ const bub=el("div","bubble bot",text.replace(/\n/g,"<br>")); b.appendChild(bub);
    b.scrollTop=b.scrollHeight; }); }
function userSay(text){ const b=$("#chat-body"); if(!b)return;
  const bub=el("div","bubble user",text); b.appendChild(bub); b.scrollTop=b.scrollHeight; }
function fillName(q){ return q.replace("{name}", BOT.answers.name? BOT.answers.name.split(" ")[0] : "there"); }
function askNext(){
  const opts=$("#chat-opts"); opts.innerHTML="";
  if(BOT.idx>=BOT.steps.length){ finishBot(); return; }
  const step=BOT.steps[BOT.idx];
  botSay(fillName(step.q));
  const delay=700;
  setTimeout(()=>{
    if(step.type==="choice"){
      $("#chat-input").style.display="none";
      step.options.forEach(([val,label])=>{ const bt=el("button",null,label);
        bt.onclick=()=>answerStep(step,val,label); opts.appendChild(bt); });
      if(step.optional){ const sk=el("button","skip","Skip"); sk.onclick=()=>answerStep(step,"","— skipped —"); opts.appendChild(sk); }
    } else {
      $("#chat-input").style.display="flex";
      $("#chat-field").value=""; $("#chat-field").focus();
      if(step.optional){ const sk=el("button","skip","Skip this"); sk.onclick=()=>answerStep(step,"","— skipped —"); opts.appendChild(sk); }
    }
  }, delay);
}
function submitChat(){ const f=$("#chat-field"); const val=f.value.trim();
  const step=BOT.steps[BOT.idx]; if(!val && !step.optional)return; answerStep(step,val,val||"— skipped —"); }
function answerStep(step,val,label){
  userSay(label);
  $("#chat-opts").innerHTML="";
  BOT.answers[step.key]=val;
  if(step.key==="eventType"){
    BOT.eventType=val;
    BOT.steps = [...BOT_COMMON_START, ...botFlowFor(val), ...BOT_CONTACT];
  }
  BOT.idx++;
  setTimeout(askNext,450);
}
function finishBot(){
  $("#chat-opts").innerHTML=""; $("#chat-input").style.display="none";
  botSay(fillName(BOT_SIGNOFF));
  const a=BOT.answers;
  const paxGuess = a.pax || a.paxDay || (a.paxEve? a.paxEve : null);
  const record={
    name:a.name||"(via chat)", email:a.email||"", phone:a.phone||"",
    event:a.eventType||"other", date:a.date||"",
    pax: paxGuess? parseInt(paxGuess)||paxGuess : null, room:"", source:"events chat",
    budget:a.budget||"", accommodation:a.accommodation||"",
    notes:[ a.eventName?`Event: ${a.eventName}`:"", a.days?`Days: ${a.days}`:"",
      a.layout?`Layout: ${a.layout}`:"", a.av?`AV: ${a.av}`:"",
      a.catering?`Catering: ${a.catering}`:"", a.style?`Style: ${a.style}`:"",
      a.dateFlex?`Date ${a.dateFlex}`:"", a.paxEve?`Evening guests: ${a.paxEve}`:"",
      a.extras?`Extras: ${a.extras}`:"", a.agent?`Agent/company: ${a.agent}`:"",
      a.notes?`Notes: ${a.notes}`:"" ].filter(Boolean).join(" · ")
  };
  (async()=>{
    // On the public chat page there's no logged-in user; sign in anonymously so
    // the enquiry lands in the shared Firestore. Falls back to demo Store.
    if(FB.ready && !FB.user){ const ok=await fbEnsureAnon();
      if(ok){ try{ await FB.db.collection("enquiries").add({...record,
        created:new Date().toISOString(), status:"new"}); return; }catch(e){ console.warn(e.message); } } }
    DB.add(record);
  })();
  setTimeout(()=>{ const opts=$("#chat-opts");
    const again=el("button",null,"Make another enquiry"); again.onclick=()=>startBot($("#chat-frame"));
    opts.appendChild(again); }, 1400);
}

/* ============================================================ PROFITABILITY TOOL */
let PROFIT=null, profitPrefill=null, profitEnquiry=null;
const ScenarioStore={ key:"bh_scenarios",
  all(){ try{return JSON.parse(localStorage.getItem(this.key))||[]}catch{return[]} },
  save(l){ localStorage.setItem(this.key,JSON.stringify(l)); },
  add(s){ const l=this.all(); s.id="SC-"+Date.now().toString(36).toUpperCase(); l.unshift(s); this.save(l); },
  remove(id){ this.save(this.all().filter(x=>x.id!==id)); } };

function applyTemplate(key){
  const t=PROFIT_TEMPLATES[key]; if(!t)return;
  PROFIT.elements=JSON.parse(JSON.stringify(t.elements));
  PROFIT.payroll=JSON.parse(JSON.stringify(t.payroll));
  PROFIT.controllable=JSON.parse(JSON.stringify(t.controllable));
  PROFIT.bevSpendPP=t.bevSpend; PROFIT._price=t.price; PROFIT._template=key;
}

function renderProfit(v){
  v.appendChild(head("Event Profitability Tool","Price an event and see live profit, margin, break-even and a cost breakdown. Load a template, save scenarios, print a summary."));
  const help=el("div","help-box");
  help.innerHTML=`<button class="help-toggle" id="p-help-t">💡 How to use this tool</button>
    <div class="help-body hidden" id="p-help-b">
      <p><b>1. Start with a template</b> — pick the event type (wedding, meeting, Christmas…) to load typical pricing, food/drink split and staffing. This avoids costing a small meeting on wedding assumptions.</p>
      <p><b>2. Set price &amp; covers</b> — the package price per head and number of guests drive revenue. The beverage on-spend is the estimated bar total on top.</p>
      <p><b>3. Package elements</b> should add up to your package price (the tick confirms it). These split the price into food, drinks, room hire etc. so cost-of-sales is calculated correctly.</p>
      <p><b>4. Payroll</b> — staff × hours × rate. <b>Controllable costs</b> are extras you pay but don't recharge (linen, security).</p>
      <p><b>5. Read the result</b> — the coloured bar shows where the money goes; <b>green ≥50% margin, amber 30–50%, red below</b>. <b>Break-even</b> tells you the minimum covers at this price. Save scenarios to compare options before quoting.</p>
    </div>`;
  v.appendChild(help);
  if(!PROFIT){ PROFIT=JSON.parse(JSON.stringify(PROFIT_DEFAULTS)); PROFIT._price=106.50; PROFIT._template="wedding"; }

  // pre-fill from an enquiry if opened via the dashboard
  profitEnquiry=null; let preName="", preCovers="60";
  if(profitPrefill && profitPrefill.enquiry){
    const e=profitPrefill.enquiry; profitEnquiry=e;
    preName=`${e.name}${e.event?" — "+(EVENT_TYPES.find(t=>t.id===e.event)?.label||""):""}`;
    if(e.pax) preCovers=String(parseInt(e.pax)||60);
    // auto-load the matching template for the enquiry's event type
    applyTemplate(templateForEvent(e.event));
    if(e.costing && e.costing.price) PROFIT._price=e.costing.price;
    profitPrefill=null;
  }
  const prePrice=String(PROFIT._price!=null?PROFIT._price:106.50);
  if(profitEnquiry){
    const banner=el("div","profit-banner",
      `Costing enquiry: <b>${profitEnquiry.name}</b> · ${profitEnquiry.pax||"?"} guests · template auto-loaded. Your result saves back to this enquiry.`);
    v.appendChild(banner);
  }

  const wrap=el("div","profit-layout");
  // ---- inputs ----
  const inp=el("div","profit-inputs");
  inp.innerHTML=`
    <div class="quote-panel">
      <div class="tmpl-row">
        <label>Load template</label>
        <select id="p-template">${Object.entries(PROFIT_TEMPLATES).map(([k,t])=>`<option value="${k}" ${PROFIT._template===k?"selected":""}>${t.label}</option>`).join("")}</select>
        <button class="btn sm" id="p-apply">Apply</button>
      </div>
      <h3>Event</h3>
      <div class="form-grid">
        <div class="full"><label>Event name</label><input id="p-name" placeholder="e.g. Extra Special Wedding" value="${preName.replace(/"/g,'&quot;')}"></div>
        <div><label>Package price per cover (inc VAT)</label><input id="p-price" type="number" value="${prePrice}" step="0.5"></div>
        <div><label>Number of covers</label><input id="p-covers" type="number" value="${preCovers}"></div>
        <div class="full"><label>Est. beverage on-spend (total, inc VAT)</label><input id="p-bev" type="number" value="${PROFIT.bevSpendPP}" step="0.5"></div>
      </div>

      <h3 style="margin-top:20px">Package elements <span class="qs-sub">(per cover, inc VAT)</span></h3>
      <div class="elem-grid" id="p-elements"></div>
      <div class="elem-total" id="p-elemtotal"></div>

      <div class="pay-head" style="display:flex;align-items:center;justify-content:space-between;margin-top:20px">
        <h3 style="margin:0">Event staffing</h3>
        <button class="btn sm" id="p-addrole" type="button">+ Add role</button>
      </div>
      <table class="pay-table" id="p-payroll"></table>
      <div class="pay-total" id="p-paytotal"></div>

      <h3 style="margin-top:20px">Controllable costs <span class="qs-sub">(net of VAT, not recharged)</span></h3>
      <div class="elem-grid" id="p-controllable"></div>

      <h3 style="margin-top:20px">Cost of sales &amp; commission</h3>
      <div class="form-grid">
        <div><label>Food CoS %</label><input id="p-foodcos" type="number" value="${PROFIT.foodCoS*100}" step="1"></div>
        <div><label>Beverage CoS %</label><input id="p-bevcos" type="number" value="${PROFIT.bevCoS*100}" step="1"></div>
        <div><label>Commission %</label><input id="p-comm" type="number" value="${PROFIT.commissionRate*100}" step="1"></div>
        <div><label>VAT %</label><input id="p-vat" type="number" value="${PROFIT.vat*100}" step="1"></div>
      </div>
    </div>`;
  wrap.appendChild(inp);

  // ---- results ----
  const res=el("div","profit-results");
  res.innerHTML=`<div class="quote-panel profit-summary"><h3>Profitability</h3><div id="p-out"></div>
    ${profitEnquiry?`<button class="btn block" id="p-save" style="margin-top:14px">Save costing to ${profitEnquiry.name.split(" ")[0]}'s enquiry</button>`:""}
    <div class="dual-btn"><button class="btn ${profitEnquiry?'ghost':''}" id="p-scenario">Save scenario</button>
    <button class="btn ghost" id="p-print">Print</button></div>
    <div id="p-scenarios"></div></div>`;
  wrap.appendChild(res);
  v.appendChild(wrap);

  // build element inputs
  const elemLabels={ food:"Food", alcohol:"Drinks — Alcoholic", soft:"Drinks — Soft", roomHire:"Room hire",
    dj:"DJ / Music", linen:"Linen hire", toastmaster:"Toastmaster", eveBuffet:"Evening buffet", bedroom:"Bedroom", av:"AV" };
  $("#p-elements").innerHTML=Object.entries(elemLabels).map(([k,l])=>
    `<div class="elem-row"><label>${l}</label><input type="number" data-elem="${k}" value="${PROFIT.elements[k]}" step="0.5"></div>`).join("");
  const ctrlLabels={ equipment:"Equipment rental", linen:"Linen costs", security:"Security", other:"Other" };
  $("#p-controllable").innerHTML=Object.entries(ctrlLabels).map(([k,l])=>
    `<div class="elem-row"><label>${l}</label><input type="number" data-ctrl="${k}" value="${PROFIT.controllable[k]}" step="1"></div>`).join("");
  // payroll / staffing table
  renderPayrollTable();

  // wire all inputs
  v.querySelectorAll("input").forEach(i=>i.addEventListener("input",calcProfit));
  $("#p-apply").onclick=()=>{ applyTemplate($("#p-template").value); switchTab("profit"); };
  $("#p-addrole").onclick=()=>{ PROFIT.payroll.push({role:"New role",rate:13,staff:1,hours:8});
    renderPayrollTable(); calcProfit(); };
  $("#p-print").onclick=printProfit;
  $("#p-scenario").onclick=saveScenario;
  if($("#p-save")) $("#p-save").onclick=()=>{
    const p=gatherProfit();
    DB.update(profitEnquiry.id,{ costing:{ profit:p.profit, margin:p.margin,
      perCover:p.covers?p.profit/p.covers:0, price:p.price, covers:p.covers, at:new Date().toISOString() }});
    alert(`Costing saved to ${profitEnquiry.name}'s enquiry.\nProfit ${money(Math.round(p.profit))} · ${Math.round(p.margin*100)}% margin`);
    switchTab("enquiries");
  };
  renderScenarios();
  calcProfit();
  const ht=$("#p-help-t"); if(ht) ht.onclick=()=>$("#p-help-b").classList.toggle("hidden");
}

function saveScenario(){
  const p=gatherProfit();
  const name=prompt("Name this scenario (e.g. '80 guests', 'Special package'):", p.name||"Scenario");
  if(name===null)return;
  ScenarioStore.add({ name, profit:p.profit, margin:p.margin, covers:p.covers, price:p.price,
    perCover:p.covers?p.profit/p.covers:0, at:new Date().toISOString() });
  renderScenarios();
}
function renderScenarios(){
  const box=$("#p-scenarios"); if(!box)return;
  const list=ScenarioStore.all();
  if(!list.length){ box.innerHTML=""; return; }
  box.innerHTML=`<div class="sec-title" style="margin-top:18px">Saved scenarios</div>`+
    `<table class="scenario-table"><tr><th>Scenario</th><th>Covers</th><th>Profit</th><th>Margin</th><th></th></tr>`+
    list.map(s=>`<tr>
      <td>${s.name}</td><td>${s.covers}</td>
      <td style="color:${s.profit>=0?'var(--ok)':'#b3261e'};font-weight:600">${money(Math.round(s.profit))}</td>
      <td>${Math.round(s.margin*100)}%</td>
      <td><button class="sc-del" data-id="${s.id}">×</button></td></tr>`).join("")+`</table>`;
  box.querySelectorAll(".sc-del").forEach(b=>b.onclick=()=>{ ScenarioStore.remove(b.dataset.id); renderScenarios(); });
}

function renderPayrollTable(){
  const box=$("#p-payroll"); if(!box)return;
  box.innerHTML=`<tr><th>Role</th><th>£/hr</th><th>Staff</th><th>Hrs</th><th>Cost</th><th></th></tr>`+
    PROFIT.payroll.map((p,i)=>`<tr>
      <td><input type="text" class="role-name" data-pay="${i}" data-f="role" value="${(p.role||"").replace(/"/g,'&quot;')}"></td>
      <td><input type="number" data-pay="${i}" data-f="rate" value="${p.rate}" step="0.5"></td>
      <td><input type="number" data-pay="${i}" data-f="staff" value="${p.staff}"></td>
      <td><input type="number" data-pay="${i}" data-f="hours" value="${p.hours}"></td>
      <td data-paycost="${i}">—</td>
      <td><button class="pay-del" data-i="${i}" type="button" title="Remove">×</button></td></tr>`).join("");
  box.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",e=>{
    const i=+e.target.dataset.pay, f=e.target.dataset.f;
    if(f==="role") PROFIT.payroll[i].role=e.target.value; // keep in state so it survives re-render
    calcProfit();
  }));
  box.querySelectorAll(".pay-del").forEach(b=>b.onclick=()=>{
    PROFIT.payroll.splice(+b.dataset.i,1); renderPayrollTable(); calcProfit(); });
}
function gatherProfit(){
  const num=id=>parseFloat($(id)?.value)||0;
  const price=num("#p-price"), covers=num("#p-covers"), bevPP=num("#p-bev");
  const vat=num("#p-vat")/100, foodCoS=num("#p-foodcos")/100, bevCoS=num("#p-bevcos")/100, comm=num("#p-comm")/100;
  const elements={}; document.querySelectorAll("[data-elem]").forEach(i=>elements[i.dataset.elem]=parseFloat(i.value)||0);
  const controllable={}; document.querySelectorAll("[data-ctrl]").forEach(i=>controllable[i.dataset.ctrl]=parseFloat(i.value)||0);
  const payroll=PROFIT.payroll.map((p,i)=>({ role:p.role,
    rate:parseFloat(document.querySelector(`[data-pay="${i}"][data-f="rate"]`)?.value)||0,
    staff:parseFloat(document.querySelector(`[data-pay="${i}"][data-f="staff"]`)?.value)||0,
    hours:parseFloat(document.querySelector(`[data-pay="${i}"][data-f="hours"]`)?.value)||0 }));

  const elemTotal=Object.values(elements).reduce((a,b)=>a+b,0);
  // revenue (inc VAT) — mirrors the spreadsheet exactly.
  // Beverage estimate (bevPP) is treated as a FLAT total spend, not per-cover.
  const revFood=covers*(elements.food+elements.soft);
  const revBev=covers*elements.alcohol + bevPP;
  const revRoom=covers*elements.roomHire;
  const revOther=covers*(elements.dj+elements.linen+elements.toastmaster+elements.eveBuffet+elements.bedroom+elements.av);
  const grossRev=(price*covers)+bevPP;
  // net of VAT
  const netFood=revFood/(1+vat), netBev=revBev/(1+vat), netRoom=revRoom/(1+vat), netOther=revOther/(1+vat);
  const netRev=netFood+netBev+netRoom+netOther;
  // cost of sales
  const cosFood=netFood*foodCoS, cosBev=netBev*bevCoS, cosTotal=cosFood+cosBev;
  // payroll
  const payrollCost=payroll.reduce((s,p)=>s+p.rate*p.staff*p.hours,0);
  payroll.forEach((p,i)=>{ const cell=document.querySelector(`[data-paycost="${i}"]`); if(cell)cell.textContent=money(p.rate*p.staff*p.hours); });
  const ptt=$("#p-paytotal");
  if(ptt){ const heads=payroll.reduce((s,p)=>s+p.staff,0);
    ptt.innerHTML=`<b>${heads}</b> staff · <b>${money(Math.round(payrollCost))}</b> total labour${covers?` · ${money(Math.round(payrollCost/covers))}/cover`:""}`; }
  const ctrlTotal=Object.values(controllable).reduce((a,b)=>a+b,0);
  const commCost=Math.round(netRev*comm*100)/100;
  const profit=netRev-cosTotal-payrollCost-ctrlTotal-commCost;
  const margin=netRev? profit/netRev : 0;
  // break-even: fixed costs (payroll+controllable) vs per-cover contribution (net rev/cover − variable CoS/cover)
  const fixedCost=payrollCost+ctrlTotal;
  const netPerCover=covers? netRev/covers : 0;
  const cosPerCover=covers? cosTotal/covers : 0;
  const contribPerCover=netPerCover-cosPerCover;
  const breakEven=contribPerCover>0? Math.ceil(fixedCost/contribPerCover) : null;
  return { name:$("#p-name")?.value||"Event", price, covers, grossRev, netRev, netFood, netBev, netRoom, netOther,
    cosFood, cosBev, cosTotal, payrollCost, payroll, ctrlTotal, controllable, commCost, profit, margin, elemTotal,
    fixedCost, contribPerCover, breakEven };
}
function calcProfit(){
  const p=gatherProfit(); const out=$("#p-out"); if(!out)return;
  const et=$("#p-elemtotal"); if(et){ const match=Math.abs(p.elemTotal-p.price)<0.5;
    et.innerHTML=`Total package elements: <b>${money(p.elemTotal)}</b> ${match?'<span class="ok-chk">✓ matches price</span>':`<span class="warn-chk">⚠ price is ${money(p.price)}</span>`}`; }
  const profitColour = p.margin>=0.5?"#4a7c59":p.margin>=0.3?"#c07a3e":"#b3261e";

  // stacked cost-vs-profit bar (as % of net revenue)
  const base=Math.max(p.netRev,1);
  const seg=(val,cls,label)=>{ const pct=Math.max(0,val/base*100); return pct>0.5?
    `<div class="bar-seg ${cls}" style="width:${pct}%" title="${label}: ${money(Math.round(val))}"></div>`:""; };
  const profitPct=Math.max(0,p.profit/base*100);
  const bar=`<div class="cost-bar">
    ${seg(p.cosFood,"s-food","Food CoS")}${seg(p.cosBev,"s-bev","Beverage CoS")}
    ${seg(p.payrollCost,"s-pay","Payroll")}${seg(p.ctrlTotal,"s-ctrl","Controllable")}
    ${seg(p.commCost,"s-comm","Commission")}
    <div class="bar-seg ${p.profit>=0?'s-profit':'s-loss'}" style="width:${Math.abs(profitPct)}%" title="Profit"></div>
  </div>
  <div class="bar-legend">
    <span><i class="s-food"></i>Food</span><span><i class="s-bev"></i>Bev</span>
    <span><i class="s-pay"></i>Payroll</span><span><i class="s-ctrl"></i>Controllable</span>
    <span><i class="${p.profit>=0?'s-profit':'s-loss'}"></i>${p.profit>=0?'Profit':'Loss'}</span>
  </div>`;

  const beText = p.breakEven!=null
    ? (p.breakEven<=p.covers
        ? `<span class="be-ok">Break-even at ${p.breakEven} covers</span> — you're ${p.covers-p.breakEven} above it.`
        : `<span class="be-warn">Break-even at ${p.breakEven} covers</span> — ${p.breakEven-p.covers} more needed at this price.`)
    : `<span class="be-warn">No break-even — costs exceed revenue per cover.</span>`;

  out.innerHTML=`
    <div class="profit-hero" style="background:linear-gradient(135deg,${profitColour},${profitColour}dd)">
      <div class="ph-profit">${money(Math.round(p.profit))}</div>
      <div class="ph-label">Estimated event profit</div>
      <div class="ph-margin">${Math.round(p.margin*100)}% margin to sales</div>
    </div>
    ${bar}
    <div class="break-even">${beText}</div>
    <table class="prof-table">
      <tr><td>Gross revenue (inc VAT)</td><td>${money(Math.round(p.grossRev))}</td></tr>
      <tr class="net"><td>Net revenue (ex VAT)</td><td>${money(Math.round(p.netRev))}</td></tr>
      <tr><td>Food cost of sales</td><td class="neg">−${money(Math.round(p.cosFood))}</td></tr>
      <tr><td>Beverage cost of sales</td><td class="neg">−${money(Math.round(p.cosBev))}</td></tr>
      <tr><td>Payroll</td><td class="neg">−${money(Math.round(p.payrollCost))}</td></tr>
      <tr><td>Controllable costs</td><td class="neg">−${money(Math.round(p.ctrlTotal))}</td></tr>
      ${p.commCost?`<tr><td>Commission</td><td class="neg">−${money(Math.round(p.commCost))}</td></tr>`:""}
      <tr class="total"><td>Event profit</td><td>${money(Math.round(p.profit))}</td></tr>
    </table>
    <div class="prof-pp">Profit per cover: <b>${money(p.covers?Math.round(p.profit/p.covers):0)}</b> · Contribution per cover: <b>${money(Math.round(p.contribPerCover))}</b></div>`;
}
function printProfit(){
  const p=gatherProfit();
  const win=window.open("","_blank");
  const payRows=p.payroll.map(r=>`<tr><td>${r.role}</td><td>£${r.rate}/hr × ${r.staff} × ${r.hours}h</td><td style="text-align:right">${money(Math.round(r.rate*r.staff*r.hours))}</td></tr>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Profitability — ${p.name}</title>
    <style>@page{margin:20mm}body{font-family:'Inter',Arial,sans-serif;color:#1a2230;font-size:12px}
    .top{border-bottom:2px solid #1a2b47;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}
    h1{font-family:Georgia,serif;font-size:24px;color:#1a2b47;margin:0}.muted{color:#7a8494;font-size:11px}
    h2{font-size:14px;color:#9d7d5f;margin:18px 0 6px;border-bottom:1px solid #e8dccf;padding-bottom:3px}
    table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #e3e7ee;text-align:left}
    .r{text-align:right}.neg{color:#b3261e}.hero{background:#1a2b47;color:#fff;border-radius:10px;padding:16px;margin:14px 0;text-align:center}
    .hero .big{font-family:Georgia,serif;font-size:32px}.total td{font-weight:700;font-size:14px;border-top:2px solid #1a2b47}</style></head><body>
    <div class="top"><div><h1>Event Profitability</h1><div class="muted">${p.name}</div></div>
      <div class="muted">Brandon Hall Hotel &amp; Spa<br>${new Date().toLocaleDateString("en-GB")}</div></div>
    <div class="hero"><div class="big">${money(Math.round(p.profit))}</div>
      <div>Estimated profit · ${Math.round(p.margin*100)}% margin · ${money(p.covers?Math.round(p.profit/p.covers):0)} per cover</div></div>
    <h2>Revenue</h2><table>
      <tr><td>Package price ${money(p.price)} × ${p.covers} covers + beverage</td><td class="r">${money(Math.round(p.grossRev))} inc VAT</td></tr>
      <tr class="total"><td>Net revenue (ex VAT)</td><td class="r">${money(Math.round(p.netRev))}</td></tr></table>
    <h2>Costs</h2><table>
      <tr><td>Food cost of sales</td><td class="r neg">−${money(Math.round(p.cosFood))}</td></tr>
      <tr><td>Beverage cost of sales</td><td class="r neg">−${money(Math.round(p.cosBev))}</td></tr>
      ${payRows}
      <tr><td>Controllable costs</td><td class="r neg">−${money(Math.round(p.ctrlTotal))}</td></tr>
      ${p.commCost?`<tr><td>Commission</td><td class="r neg">−${money(Math.round(p.commCost))}</td></tr>`:""}
      <tr class="total"><td>Estimated event profit</td><td class="r">${money(Math.round(p.profit))}</td></tr></table>
    <p class="muted" style="margin-top:20px">Internal costing only — not for circulation to customers.</p>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  win.document.close();
}

/* ============================================================ M&E UPGRADE TRACKER */
function renderMnE(v){
  v.appendChild(head("M&E Upgrade — Equipment Tracker","Manage equipment per room: TVs, projectors, connectivity, furniture, power and software. Track needed → ordered → delivered → installed, with cost and supplier."));

  // ---- summary bar (status counts + cost) ----
  let counts={needed:0,ordered:0,delivered:0,installed:0}, total=0, totalCost=0, committedCost=0, outstandingCost=0;
  const bySupplier={};
  ROOMS.forEach(r=>{ MnEState.items(r.id).forEach(it=>{
    counts[it.status]=(counts[it.status]||0)+1; total++;
    const lineCost=(it.cost||0)*(it.qty||1); totalCost+=lineCost;
    if(["ordered","delivered","installed"].includes(it.status)) committedCost+=lineCost; else outstandingCost+=lineCost;
    if(it.supplier){ bySupplier[it.supplier]=(bySupplier[it.supplier]||0)+lineCost; }
  }); });
  const kpis=el("div","stat-cards");
  kpis.innerHTML=`
    <div class="stat-card accent"><div class="sc-v">${money(Math.round(totalCost))}</div><div class="sc-k">Total equipment cost</div></div>
    <div class="stat-card"><div class="sc-v">${money(Math.round(committedCost))}</div><div class="sc-k">Committed (ordered+)</div></div>
    <div class="stat-card"><div class="sc-v" style="color:#b3261e">${money(Math.round(outstandingCost))}</div><div class="sc-k">Outstanding (needed)</div></div>
    <div class="stat-card"><div class="sc-v">${total}</div><div class="sc-k">Total items</div></div>
    <div class="stat-card"><div class="sc-v">${counts.installed}</div><div class="sc-k">Installed</div></div>
    <div class="stat-card"><div class="sc-v">${total?Math.round(counts.installed/total*100):0}%</div><div class="sc-k">Complete</div></div>`;
  v.appendChild(kpis);

  // status progress + supplier breakdown
  const sub=el("div","mne-subbar");
  sub.innerHTML=`
    <div class="mne-progress">
      <span class="mp-seg st-needed" style="flex:${counts.needed||0.001}" title="Needed ${counts.needed}"></span>
      <span class="mp-seg st-ordered" style="flex:${counts.ordered||0.001}" title="Ordered ${counts.ordered}"></span>
      <span class="mp-seg st-delivered" style="flex:${counts.delivered||0.001}" title="Delivered ${counts.delivered}"></span>
      <span class="mp-seg st-installed" style="flex:${counts.installed||0.001}" title="Installed ${counts.installed}"></span>
    </div>
    <div class="mne-legend">
      <span><i class="st-needed"></i>Needed ${counts.needed}</span>
      <span><i class="st-ordered"></i>Ordered ${counts.ordered}</span>
      <span><i class="st-delivered"></i>Delivered ${counts.delivered}</span>
      <span><i class="st-installed"></i>Installed ${counts.installed}</span>
    </div>`;
  v.appendChild(sub);
  if(Object.keys(bySupplier).length){
    const sup=el("div","source-bar");
    sup.innerHTML=`<span class="sb-label">Cost by supplier:</span>`+
      Object.entries(bySupplier).sort((a,b)=>b[1]-a[1]).map(([s,c])=>`<span class="src-pill">${s} <b>${money(Math.round(c))}</b></span>`).join("");
    v.appendChild(sup);
  }

  // ---- per-room panels ----
  ROOMS.forEach(r=>{
    const conf=MNE_ROOMS[r.id];
    const items=MnEState.items(r.id);
    if(!conf && !items.length) return;
    const roomCost=items.reduce((s,it)=>s+(it.cost||0)*(it.qty||1),0);
    const panel=el("div","mne-room");
    const ready = conf? conf.readyToSell : null;
    const readyBadge = ready===true?`<span class="rs-badge rs-yes">✓ Ready to sell</span>`
      : ready===false?`<span class="rs-badge rs-no">✗ Not ready</span>`
      : `<span class="rs-badge rs-tbc">Audit pending</span>`;
    panel.innerHTML=`<div class="mne-head">
        <h3>${r.name} <span class="mne-m2">${r.m2} m²</span></h3>
        ${readyBadge}
        ${roomCost?`<span class="room-cost">${money(Math.round(roomCost))}</span>`:""}
        <button class="btn sm mne-add" data-room="${r.id}">+ Item</button>
      </div>
      ${conf&&conf.currentAV?`<div class="mne-current">Current AV: ${conf.currentAV}</div>`:""}
      ${conf&&conf.comments?`<div class="mne-comment">${conf.comments}</div>`:""}
      <div class="mne-items" id="mne-${r.id}"></div>`;
    v.appendChild(panel);
    renderMnEItems(r.id);
  });

  document.querySelectorAll(".mne-add").forEach(b=>b.onclick=()=>openMnEItemForm(b.dataset.room));
}
function renderMnEItems(roomId){
  const box=$("#mne-"+roomId); if(!box)return;
  const items=MnEState.items(roomId);
  if(!items.length){ box.innerHTML=`<div class="qs-sub" style="padding:8px 0">No items yet — add what this room needs.</div>`; return; }
  box.innerHTML=`<table class="mne-table">
    <tr><th>Item</th><th>Cat</th><th>Size</th><th>Qty</th><th>Unit cost</th><th>Line</th><th>Supplier</th><th>Status</th><th></th></tr>`+
    items.map((it,i)=>{ const line=(it.cost||0)*(it.qty||1);
      return `<tr>
      <td>${it.item}</td><td><span class="cat-pill">${it.cat}</span></td>
      <td>${it.size||"—"}</td><td>${it.qty}</td>
      <td>${it.cost?money(it.cost):"—"}</td><td>${line?money(Math.round(line)):"—"}</td>
      <td>${it.supplier||"—"}</td>
      <td><select class="mne-status ${it.status}" data-room="${roomId}" data-i="${i}">
        ${MNE_STATUSES.map(s=>`<option value="${s}" ${it.status===s?"selected":""}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join("")}
      </select></td>
      <td><button class="mne-del" data-room="${roomId}" data-i="${i}" title="Remove">×</button></td>
    </tr>`;}).join("")+`</table>`;
  box.querySelectorAll(".mne-status").forEach(sel=>sel.onchange=()=>{
    MnEState.setStatus(sel.dataset.room, +sel.dataset.i, sel.value); render(); });
  box.querySelectorAll(".mne-del").forEach(b=>b.onclick=()=>{
    MnEState.remove(b.dataset.room, +b.dataset.i); render(); });
}
function openMnEItemForm(roomId){
  const room=ROOMS.find(r=>r.id===roomId);
  const sizes=['43"','55"','65"','75"','86"','98"','100"'];
  const body=`<div class="form-grid">
    <div><label>Category</label><select id="mi-cat">${MNE_CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select></div>
    <div><label>Item</label><input id="mi-item" placeholder="e.g. 4K Smart TV"></div>
    <div><label>Size (screens)</label><select id="mi-size"><option value="">N/A</option>${sizes.map(s=>`<option>${s}</option>`).join("")}</select></div>
    <div><label>Quantity</label><input id="mi-qty" type="number" min="1" value="1"></div>
    <div><label>Unit cost (£)</label><input id="mi-cost" type="number" min="0" step="0.01" placeholder="0"></div>
    <div><label>Supplier</label><input id="mi-supplier" placeholder="e.g. AV Partner Ltd"></div>
    <div><label>Status</label><select id="mi-status">${MNE_STATUSES.map(s=>`<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join("")}</select></div>
  </div>
  <div style="margin-top:18px"><button class="btn" id="mi-save">Add item</button></div>`;
  showModal(`Add equipment — ${room.name}`,"New M&E item",body);
  $("#mi-save").onclick=()=>{
    const item=$("#mi-item").value.trim(); if(!item){ $("#mi-item").focus(); return; }
    MnEState.add(roomId,{ cat:$("#mi-cat").value, item, size:$("#mi-size").value,
      qty:parseInt($("#mi-qty").value)||1, cost:parseFloat($("#mi-cost").value)||0,
      supplier:$("#mi-supplier").value.trim(), status:$("#mi-status").value });
    closeModal(); render();
  };
}
/* M&E state: seeds from MNE_ROOMS, persists edits to localStorage */
const MnEState={
  key:"bh_mne",
  _store:null,
  load(){ if(this._store)return this._store;
    try{ this._store=JSON.parse(localStorage.getItem(this.key)); }catch{ this._store=null; }
    if(!this._store){ this._store={}; Object.entries(MNE_ROOMS).forEach(([rid,conf])=>{
      this._store[rid]=(conf.items||[]).map(x=>Object.assign({},x)); }); this.save(); }
    return this._store; },
  save(){ localStorage.setItem(this.key, JSON.stringify(this._store)); },
  all(){ return this.load(); },
  items(roomId){ return this.load()[roomId]||[]; },
  add(roomId,item){ this.load(); (this._store[roomId]=this._store[roomId]||[]).push(item); this.save(); },
  remove(roomId,i){ this.load(); this._store[roomId].splice(i,1); this.save(); },
  setStatus(roomId,i,status){ this.load(); this._store[roomId][i].status=status; this.save(); }
};

/* ---- SVG chart builders ---- */
const CHART_COLOURS=["#1a2b47","#BB9979","#4a7c59","#7a9bc4","#c9814f","#9d7d5f","#b0a99f","#d4b483"];
function chartCard(title,svg,wide){
  const c=el("div","chart-card"+(wide?" wide":""));
  c.innerHTML=`<div class="cc-title">${title}</div>${svg}`;
  return c;
}
function barChart(data){
  if(!data.length) return `<div class="qs-sub">No data</div>`;
  const max=Math.max(...data.map(d=>d.val))||1;
  const bw=Math.min(60, 320/data.length), gap=14, h=180, w=data.length*(bw+gap)+20;
  const bars=data.map((d,i)=>{ const bh=(d.val/max)*(h-40); const x=15+i*(bw+gap), y=h-25-bh;
    return `<g>
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${CHART_COLOURS[i%CHART_COLOURS.length]}"/>
      <text x="${x+bw/2}" y="${y-4}" font-size="9" fill="#3a4256" text-anchor="middle">£${Math.round(d.val/1000)}k</text>
      <text x="${x+bw/2}" y="${h-10}" font-size="9" fill="#7a8494" text-anchor="middle">${d.label.length>9?d.label.slice(0,8)+"…":d.label}</text>
    </g>`; }).join("");
  return `<svg viewBox="0 0 ${Math.max(w,300)} ${h}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}
function pieChart(data){
  if(!data.length) return `<div class="qs-sub">No data</div>`;
  const total=data.reduce((s,d)=>s+d.val,0)||1;
  const cx=90,cy=90,r=75; let ang=-Math.PI/2;
  const slices=data.map((d,i)=>{ const frac=d.val/total, a2=ang+frac*Math.PI*2;
    const x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang), x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
    const large=frac>0.5?1:0;
    const path=`M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
    ang=a2; return `<path d="${path}" fill="${CHART_COLOURS[i%CHART_COLOURS.length]}" stroke="#fff" stroke-width="1.5"/>`;
  }).join("");
  const legend=data.map((d,i)=>`<div class="pie-leg"><i style="background:${CHART_COLOURS[i%CHART_COLOURS.length]}"></i>
    ${d.label.length>16?d.label.slice(0,15)+"…":d.label} <b>${Math.round(d.val/total*100)}%</b></div>`).join("");
  return `<div class="pie-wrap"><svg viewBox="0 0 180 180" style="width:160px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg">${slices}</svg>
    <div class="pie-legend">${legend}</div></div>`;
}

/* ============================================================ MARKETING LIBRARY */
let MKT_SECTION="logos";
function renderMarketing(v){
  v.appendChild(head("Marketing Library","All Brandon Hall marketing content in one place — browse, download and upload to each section."));

  // section nav
  const nav=el("div","mkt-nav");
  MKT_SECTIONS.forEach(s=>{
    const uploaded = (typeof MktStore!=="undefined" && MktStore.live)? MktStore.items(s.id).length : 0;
    const count=(MKT_ASSETS[s.id]?.length||0)+uploaded;
    const b=el("button","mkt-tab"+(MKT_SECTION===s.id?" on":""),`${s.icon} ${s.label} <span class="mkt-n">${count}</span>`);
    b.onclick=()=>{ MKT_SECTION=s.id; render(); };
    nav.appendChild(b);
  });
  v.appendChild(nav);

  const sec=MKT_SECTIONS.find(s=>s.id===MKT_SECTION);
  const head2=el("div","mkt-head");
  head2.innerHTML=`<div><h3>${sec.icon} ${sec.label}</h3><p class="qs-sub">${sec.desc}</p></div>
    <button class="btn" id="mkt-upload">⬆ Upload to ${sec.label}</button>`;
  v.appendChild(head2);
  $("#mkt-upload").onclick=()=>openUploadForm(MKT_SECTION);

  // grid: baked-in + uploaded
  const baked=(MKT_ASSETS[MKT_SECTION]||[]).map(a=>Object.assign({_baked:true},a));
  const uploaded=(typeof MktStore!=="undefined" && MktStore.live)? MktStore.items(MKT_SECTION) : [];
  const items=[...uploaded, ...baked];
  if(!items.length){
    v.appendChild(el("div","empty",`<div class="big">Nothing here yet</div>Upload your first ${sec.label.toLowerCase()} asset.`));
    return;
  }
  const grid=el("div","mkt-grid");
  items.forEach(a=>{
    const url=a.url||a.file;
    const card=el("div","mkt-card");
    let preview;
    if(a.type==="image"||a.type==="svg"){
      preview=`<div class="mkt-prev ${a.dark?"dark":""}"><img src="${url}" loading="lazy" onerror="this.parentElement.classList.add('noimg')"></div>`;
    } else if(a.type==="pdf"){
      preview=`<div class="mkt-prev">${a.thumb?`<img src="${a.thumb}" loading="lazy">`:`<div class="mkt-ico">📄</div>`}</div>`;
    } else if(a.type==="video"){
      preview=`<div class="mkt-prev"><div class="mkt-ico">🎬</div></div>`;
    } else if(a.type==="link"){
      preview=`<div class="mkt-prev">${a.thumb?`<img src="${a.thumb}" loading="lazy">`:`<div class="mkt-ico">▶️</div>`}</div>`;
    } else {
      preview=`<div class="mkt-prev"><div class="mkt-ico">📎</div></div>`;
    }
    card.innerHTML=`${preview}
      <div class="mkt-body">
        <div class="mkt-name">${a.name}</div>
        <div class="mkt-meta">${a.type.toUpperCase()}${a.size?` · ${(a.size/1024/1024).toFixed(1)}MB`:""}${a.by?` · ${a.by}`:""}</div>
        <div class="mkt-actions">
          <a class="mkt-btn" href="${url}" target="_blank">${a.type==="link"?"▶ Launch":"View"}</a>
          ${a.type!=="link"?`<a class="mkt-btn" href="${url}" download>Download</a>`:""}
          ${!a._baked?`<button class="mkt-btn del" data-id="${a.id}" data-path="${a.path||""}">Remove</button>`:""}
        </div>
      </div>`;
    grid.appendChild(card);
  });
  v.appendChild(grid);
  grid.querySelectorAll(".del").forEach(b=>b.onclick=async()=>{
    if(confirm("Remove this asset?")){ await MktStore.remove(b.dataset.id); render(); }
  });
}
function openUploadForm(section){
  const sec=MKT_SECTIONS.find(s=>s.id===section);
  const canUp=(typeof MktStore!=="undefined" && MktStore.canUpload && MktStore.canUpload());
  const body=`
    ${!canUp?`<div class="admin-note">Uploads need the portal live (Firebase) and a free Cloudinary account connected. In demo mode you can preview the picker, but files won't save. See README → Marketing uploads.</div>`:""}
    <div class="form-grid">
      <div class="full"><label>Display name (optional)</label><input id="up-name" placeholder="e.g. Summer Spa Flyer"></div>
      <div class="full"><label>File</label><input id="up-file" type="file"></div>
    </div>
    <div id="up-status" class="qs-sub" style="margin-top:10px"></div>
    <div style="margin-top:16px"><button class="btn" id="up-go">Upload to ${sec.label}</button></div>`;
  showModal(`Upload — ${sec.label}`,"Add a marketing asset",body);
  $("#up-go").onclick=async()=>{
    const f=$("#up-file").files[0];
    if(!f){ $("#up-status").textContent="Choose a file first."; return; }
    if(!canUp){ $("#up-status").innerHTML=`<span style="color:var(--warn)">Not connected — see README to enable uploads (free, no billing).</span>`; return; }
    $("#up-status").textContent="Uploading…"; $("#up-go").disabled=true;
    try{ await MktStore.upload(section, f, $("#up-name").value.trim());
      closeModal(); render();
    }catch(e){ $("#up-status").innerHTML=`<span style="color:#b3261e">Upload failed: ${e.message}</span>`; $("#up-go").disabled=false; }
  };
}

/* ============================================================ DINING & BARS */
let DINING_AREA="restaurant";
function renderDining(v){
  v.appendChild(head("Dining & Bars","Our restaurant, bar and terrace — seating plans, capacities and features."));
  const nav=el("div","mkt-nav");
  DINING_AREAS.forEach(a=>{
    const b=el("button","mkt-tab"+(DINING_AREA===a.id?" on":""),`${a.name} <span class="mkt-n">${a.covers}</span>`);
    b.onclick=()=>{ DINING_AREA=a.id; render(); };
    nav.appendChild(b);
  });
  v.appendChild(nav);

  const area=DINING_AREAS.find(a=>a.id===DINING_AREA);
  const panel=el("div","quote-panel");
  panel.innerHTML=`
    <div class="detail-row">
      <div class="stat"><div class="k">Covers</div><div class="v">${area.covers}</div></div>
      <div class="stat" style="flex:3"><div class="k">${area.name}</div><div class="v" style="font-size:15px;font-family:var(--sans);font-weight:400;color:var(--ink-2)">${area.desc}</div></div>
    </div>
    <div class="sec-title">Features</div>
    <div class="chips">${area.features.map(f=>`<span class="chip" style="cursor:default">${f}</span>`).join("")}</div>
    ${area.tables.length?`
      <div class="sec-title">Seating plan</div>
      ${area.key.length?`<div class="rest-key">${area.key.map(([,label])=>`<span>${label}</span>`).join("")}</div>`:""}
      <div class="rest-plan">${restaurantSVG(area)}</div>
      <div class="qs-sub" style="margin-top:8px">${area.tables.length} tables · ${area.covers} covers · tables 201–223</div>
    `:`<div class="sec-title">Seating plan</div><p class="qs-sub">Flexible layout — no fixed plan. Capacity ${area.covers}.</p>`}`;
  v.appendChild(panel);

  // ---- Bar: sporting & TV events calendar ----
  if(area.id==="bar" && typeof BAR_EVENTS!=="undefined"){
    const today=new Date().toISOString().slice(0,10);
    const upcoming=BAR_EVENTS.filter(ev=>ev.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
    const list=upcoming.length?upcoming:BAR_EVENTS;
    const byMonth={};
    list.forEach(ev=>{ const m=new Date(ev.date).toLocaleDateString("en-GB",{month:"long",year:"numeric"});
      (byMonth[m]=byMonth[m]||[]).push(ev); });
    const ep=el("div","quote-panel");
    ep.style.marginTop="16px";
    ep.innerHTML=`<div class="sec-title" style="margin-top:0">📺 Sporting &amp; TV events — plan for busy nights</div>
      <p class="qs-sub" style="margin-bottom:14px">Major fixtures and events that typically fill the bar. High-impact dates flagged — staff and stock up accordingly.</p>
      ${Object.entries(byMonth).map(([month,evs])=>`
        <div class="bar-month">${month}</div>
        ${evs.map(ev=>`<div class="bar-ev ${ev.impact==="high"?"hi":""}">
          <span class="be-date">${new Date(ev.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric"})}</span>
          <span class="be-sport">${ev.sport}</span>
          <span class="be-name">${ev.name}<span class="be-detail">${ev.detail}</span></span>
          ${ev.impact==="high"?`<span class="be-flag">Busy</span>`:""}
        </div>`).join("")}
      `).join("")}
      <p class="qs-sub" style="margin-top:12px">Curated calendar — refresh as fixtures and TV selections are confirmed.</p>`;
    v.appendChild(ep);
  }
}

/* ============================================================ MENU BUILDER */
let MENU={ title:"Set Dinner Menu", subtitle:"", courses:[
  { name:"Starters", items:[] },
  { name:"Mains", items:[] },
  { name:"Desserts", items:[] }
], price:"", footer:"All dishes prepared using English beef & lamb, English pork and British dairy. Please advise of any allergies or dietary requirements." };

function renderMenuBuilder(v){
  v.appendChild(head("Menu Builder","Build a menu on the fly, then produce printable artwork to send or print."));
  const wrap=el("div","quote-layout");

  // left: editor
  const left=el("div","quote-panel");
  left.innerHTML=`<h3>Menu details</h3>
    <div class="form-grid">
      <div><label>Menu title</label><input id="mn-title" value="${MENU.title.replace(/"/g,'&quot;')}"></div>
      <div><label>Subtitle (optional)</label><input id="mn-sub" value="${(MENU.subtitle||'').replace(/"/g,'&quot;')}" placeholder="e.g. Wedding Breakfast"></div>
      <div><label>Price (optional)</label><input id="mn-price" value="${(MENU.price||'').replace(/"/g,'&quot;')}" placeholder="e.g. £35 per person"></div>
    </div>
    <div id="mn-courses"></div>
    <button class="btn ghost sm" id="mn-addcourse" style="margin-top:12px">+ Add course</button>
    <div style="margin-top:16px"><label>Footer note</label><textarea id="mn-footer" rows="2">${MENU.footer}</textarea></div>`;
  wrap.appendChild(left);

  // right: live preview + actions
  const right=el("div","quote-panel");
  right.innerHTML=`<h3>Preview</h3><div id="mn-preview" class="menu-preview"></div>
    <div class="dual-btn"><button class="btn" id="mn-print">Printable artwork</button>
    <button class="btn ghost" id="mn-reset">Reset</button></div>`;
  wrap.appendChild(right);
  v.appendChild(wrap);

  renderMenuCourses();
  ["mn-title","mn-sub","mn-price","mn-footer"].forEach(id=>$("#"+id).addEventListener("input",()=>{
    MENU.title=$("#mn-title").value; MENU.subtitle=$("#mn-sub").value;
    MENU.price=$("#mn-price").value; MENU.footer=$("#mn-footer").value; renderMenuPreview(); }));
  $("#mn-addcourse").onclick=()=>{ MENU.courses.push({name:"New course",items:[]}); renderMenuCourses(); renderMenuPreview(); };
  $("#mn-print").onclick=printMenu;
  $("#mn-reset").onclick=()=>{ MENU={ title:"Set Dinner Menu", subtitle:"", courses:[
    {name:"Starters",items:[]},{name:"Mains",items:[]},{name:"Desserts",items:[]}], price:"",
    footer:MENU.footer }; switchTab("menu"); };
  renderMenuPreview();
}
function renderMenuCourses(){
  const box=$("#mn-courses"); if(!box)return; box.innerHTML="";
  MENU.courses.forEach((course,ci)=>{
    const card=el("div","menu-course");
    card.innerHTML=`<div class="mc-head">
        <input class="mc-name" data-ci="${ci}" value="${course.name.replace(/"/g,'&quot;')}">
        <button class="mc-del" data-ci="${ci}" title="Remove course">×</button></div>
      <div class="mc-items" id="mc-items-${ci}"></div>
      <button class="mc-additem" data-ci="${ci}">+ Add dish</button>`;
    box.appendChild(card);
    const itemsBox=card.querySelector(`#mc-items-${ci}`);
    course.items.forEach((it,ii)=>{
      const row=el("div","mc-item");
      row.innerHTML=`<input class="mi-name" data-ci="${ci}" data-ii="${ii}" value="${(it.name||'').replace(/"/g,'&quot;')}" placeholder="Dish name">
        <input class="mi-desc" data-ci="${ci}" data-ii="${ii}" value="${(it.desc||'').replace(/"/g,'&quot;')}" placeholder="Description (optional)">
        <input class="mi-price" data-ci="${ci}" data-ii="${ii}" value="${(it.price||'').replace(/"/g,'&quot;')}" placeholder="£">
        <button class="mi-del" data-ci="${ci}" data-ii="${ii}">×</button>`;
      itemsBox.appendChild(row);
    });
  });
  // wire
  box.querySelectorAll(".mc-name").forEach(i=>i.oninput=e=>{ MENU.courses[+e.target.dataset.ci].name=e.target.value; renderMenuPreview(); });
  box.querySelectorAll(".mc-del").forEach(b=>b.onclick=()=>{ MENU.courses.splice(+b.dataset.ci,1); renderMenuCourses(); renderMenuPreview(); });
  box.querySelectorAll(".mc-additem").forEach(b=>b.onclick=()=>{ MENU.courses[+b.dataset.ci].items.push({name:"",desc:""}); renderMenuCourses(); renderMenuPreview(); });
  box.querySelectorAll(".mi-name").forEach(i=>i.oninput=e=>{ MENU.courses[+e.target.dataset.ci].items[+e.target.dataset.ii].name=e.target.value; renderMenuPreview(); });
  box.querySelectorAll(".mi-desc").forEach(i=>i.oninput=e=>{ MENU.courses[+e.target.dataset.ci].items[+e.target.dataset.ii].desc=e.target.value; renderMenuPreview(); });
  box.querySelectorAll(".mi-price").forEach(i=>i.oninput=e=>{ MENU.courses[+e.target.dataset.ci].items[+e.target.dataset.ii].price=e.target.value; renderMenuPreview(); });
  box.querySelectorAll(".mi-del").forEach(b=>b.onclick=()=>{ MENU.courses[+b.dataset.ci].items.splice(+b.dataset.ii,1); renderMenuCourses(); renderMenuPreview(); });
}
function renderMenuPreview(){
  const box=$("#mn-preview"); if(!box)return;
  box.innerHTML=`
    <div class="mp-logo">BRANDON HALL</div>
    <div class="mp-sub2">HOTEL &amp; SPA</div>
    <h2 class="mp-title">${MENU.title||""}</h2>
    ${MENU.subtitle?`<div class="mp-subtitle">${MENU.subtitle}</div>`:""}
    ${MENU.courses.map(c=>`
      ${c.items.filter(i=>i.name).length?`<div class="mp-course">${c.name}</div>`:""}
      ${c.items.filter(i=>i.name).map(i=>`<div class="mp-dish"><span class="mp-dn">${i.name}${i.price?`<span class="mp-dp">${i.price}</span>`:""}</span>${i.desc?`<span class="mp-dd">${i.desc}</span>`:""}</div>`).join("")}
    `).join("")}
    ${MENU.price?`<div class="mp-price">${MENU.price}</div>`:""}
    ${MENU.footer?`<div class="mp-footer">${MENU.footer}</div>`:""}`;
}
function printMenu(){
  const win=window.open("","_blank");
  const courses=MENU.courses.map(c=>{
    const items=c.items.filter(i=>i.name); if(!items.length)return"";
    return `<div class="course">${c.name}</div>`+items.map(i=>`<div class="dish"><div class="dn">${i.name}${i.price?`<span class="dp">${i.price}</span>`:""}</div>${i.desc?`<div class="dd">${i.desc}</div>`:""}</div>`).join("");
  }).join("");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${MENU.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
    <style>@page{margin:0}body{margin:0;font-family:'Inter',serif;color:#1a2230}
    .menu{max-width:148mm;min-height:210mm;margin:0 auto;padding:26mm 22mm;text-align:center;
      background:linear-gradient(180deg,#fff,#faf8f4)}
    .logo{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;letter-spacing:3px;color:#1a2b47}
    .sub2{font-size:10px;letter-spacing:4px;color:#BB9979;margin-bottom:30px}
    h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;margin:0 0 4px;color:#1a2b47}
    .subtitle{font-style:italic;color:#7a8494;font-size:14px;margin-bottom:26px}
    .course{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#BB9979;
      margin:26px 0 12px;text-transform:uppercase;letter-spacing:2px;position:relative}
    .course::before,.course::after{content:"";position:absolute;top:50%;width:40px;height:1px;background:#e0d5c5}
    .course::before{left:calc(50% - 90px)}.course::after{right:calc(50% - 90px)}
    .dish{margin-bottom:14px}.dn{font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2230}
    .dn .dp{color:#9d7d5f;font-size:14px;margin-left:8px}
    .dd{font-size:12px;color:#7a8494;font-style:italic;margin-top:2px}
    .price{font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2b47;margin:28px 0 0;font-weight:600}
    .footer{font-size:9.5px;color:#9aa2ad;margin-top:34px;border-top:1px solid #e8dccf;padding-top:14px;line-height:1.5}</style>
    </head><body><div class="menu">
      <div class="logo">BRANDON HALL</div><div class="sub2">HOTEL &amp; SPA</div>
      <h1>${MENU.title||""}</h1>${MENU.subtitle?`<div class="subtitle">${MENU.subtitle}</div>`:""}
      ${courses}
      ${MENU.price?`<div class="price">${MENU.price}</div>`:""}
      ${MENU.footer?`<div class="footer">${MENU.footer}</div>`:""}
    </div><script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  win.document.close();
}

/* ============================================================ CORPORATE RATE PLANNER */
const CorpStore={ key:"bh_corp",
  all(){ try{return JSON.parse(localStorage.getItem(this.key))||[]}catch{return[]} },
  save(l){ localStorage.setItem(this.key,JSON.stringify(l)); },
  addBatch(rows,meta){ const l=this.all(); l.unshift({ id:"WK-"+Date.now().toString(36).toUpperCase(),
    added:new Date().toISOString(), from:meta.from, to:meta.to, rows }); this.save(l); },
  remove(id){ this.save(this.all().filter(x=>x.id!==id)); } };

function renderCorpRates(v){
  v.appendChild(head("Corporate Rate Planner","Shift guests off commissionable OTA bookings onto direct corporate rates. Paste the weekly Guestline arrival list; we flag companies worth a corporate rate."));

  // help / instructions
  const help=el("div","help-box");
  help.innerHTML=`<button class="help-toggle" id="cr-help-t">💡 How this works</button>
    <div class="help-body hidden" id="cr-help-b">
      <p><b>Each week</b>, Patrik pulls the arrival list from Guestline and pastes it below — filtered to show guest name, length of stay, average rate, rate code and company name.</p>
      <p>The planner aggregates by <b>company</b>: total room nights, average rate, OTA vs direct split, and day-of-week pattern.</p>
      <p>Any company over <b>${CORP_THRESHOLD} room nights</b> (annualised) that's booking through OTAs is flagged as a <b>corporate-rate candidate</b> — the ones worth moving onto a direct dynamic rate.</p>
      <p>Paste formats accepted: tab-separated (straight from Guestline/Excel), or comma-separated. Columns in any order with a header row, or in the order: <i>Guest, Nights, Rate, Rate Code, Company</i>.</p>
    </div>`;
  v.appendChild(help);

  // input panel
  const inp=el("div","quote-panel");
  inp.innerHTML=`<h3>Paste weekly arrival list</h3>
    <div class="form-grid" style="margin-bottom:10px">
      <div><label>Week from</label><input id="cr-from" type="date"></div>
      <div><label>Week to</label><input id="cr-to" type="date"></div>
    </div>
    <textarea id="cr-paste" rows="7" placeholder="Paste from Guestline/Excel here…&#10;Guest Name    Nights    Avg Rate    Rate Code    Company&#10;J Smith    3    95.00    CORP01    Jaguar Land Rover&#10;A Patel    2    120.00    BCOM    Deloitte"></textarea>
    <div style="margin-top:12px;display:flex;gap:10px">
      <button class="btn" id="cr-parse">Add to planner</button>
      <span class="qs-sub" id="cr-parsemsg" style="align-self:center"></span>
    </div>`;
  v.appendChild(inp);
  $("#cr-help-t").onclick=()=>$("#cr-help-b").classList.toggle("hidden");
  $("#cr-parse").onclick=()=>{
    const raw=$("#cr-paste").value.trim();
    if(!raw){ $("#cr-parsemsg").textContent="Paste some rows first."; return; }
    const rows=parseArrivals(raw);
    if(!rows.length){ $("#cr-parsemsg").innerHTML='<span style="color:#b3261e">Couldn\'t read any rows — check the format.</span>'; return; }
    CorpStore.addBatch(rows,{from:$("#cr-from").value,to:$("#cr-to").value});
    render();
  };

  // ---- aggregate all weeks ----
  const weeks=CorpStore.all();
  const allRows=[].concat(...weeks.map(w=>w.rows));
  if(!allRows.length){
    v.appendChild(el("div","empty",`<div class="big">No data yet</div>Paste the first weekly arrival list above to build the planner.`));
    return;
  }

  // company aggregation
  const comp={};
  allRows.forEach(r=>{
    const key=r.company||"(unknown)";
    const c=comp[key]||(comp[key]={company:key, nights:0, rateSum:0, rateN:0, ota:0, direct:0, dows:{}, stays:[]});
    c.nights+=r.nights; if(r.rate){ c.rateSum+=r.rate*r.nights; c.rateN+=r.nights; }
    if(isOTARate(r.rateCode)) c.ota+=r.nights; else c.direct+=r.nights;
    c.stays.push(r.nights);
    if(r.dow!=null) c.dows[r.dow]=(c.dows[r.dow]||0)+1;
  });
  const companies=Object.values(comp).map(c=>{
    c.avgRate=c.rateN? c.rateSum/c.rateN : 0;
    c.avgStay=c.stays.length? c.stays.reduce((a,b)=>a+b,0)/c.stays.length : 0;
    // annualise room nights from weeks of data
    c.annualised=Math.round(c.nights/(weeks.length||1)*52);
    c.candidate = c.annualised>=CORP_THRESHOLD && c.ota>0;
    // top day of week
    const dowNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const topDow=Object.entries(c.dows).sort((a,b)=>b[1]-a[1])[0];
    c.pattern=topDow? dowNames[topDow[0]] : "—";
    return c;
  }).sort((a,b)=>b.nights-a.nights);

  const totalNights=allRows.reduce((s,r)=>s+r.nights,0);
  const otaNights=companies.reduce((s,c)=>s+c.ota,0);
  const candidates=companies.filter(c=>c.candidate);

  // ---- KPIs ----
  const kpis=el("div","stat-cards");
  kpis.innerHTML=`
    <div class="stat-card"><div class="sc-v">${companies.length}</div><div class="sc-k">Companies</div></div>
    <div class="stat-card"><div class="sc-v">${totalNights}</div><div class="sc-k">Room nights (${weeks.length} wk${weeks.length>1?"s":""})</div></div>
    <div class="stat-card"><div class="sc-v" style="color:#b3261e">${totalNights?Math.round(otaNights/totalNights*100):0}%</div><div class="sc-k">Booked via OTA</div></div>
    <div class="stat-card accent"><div class="sc-v">${candidates.length}</div><div class="sc-k">Corporate candidates</div></div>
    <div class="stat-card"><div class="sc-v">${money(Math.round(allRows.reduce((s,r)=>s+(r.rate||0)*r.nights,0)/(totalNights||1)))}</div><div class="sc-k">Avg rate</div></div>`;
  v.appendChild(kpis);

  // ---- candidates callout ----
  if(candidates.length){
    const cand=el("div","corp-candidates");
    cand.innerHTML=`<div class="cc-title" style="margin-bottom:10px">🎯 Corporate rate candidates <span class="qs-sub">(over ${CORP_THRESHOLD} annualised room nights, currently on OTA)</span></div>`+
      candidates.map(c=>`<div class="cand-row">
        <div class="cand-name">${c.company}</div>
        <div class="cand-stats">${c.annualised} nights/yr · ${c.ota} OTA nights · avg ${money(Math.round(c.avgRate))}</div>
        <span class="cand-flag">Set up corporate rate</span></div>`).join("");
    v.appendChild(cand);
  }

  // ---- full company table ----
  v.appendChild(el("div","sec-title","All companies"));
  const t=el("table","data-table");
  t.innerHTML=`<tr><th>Company</th><th>Room nights</th><th>Annualised</th><th>Avg stay</th><th>Avg rate</th><th>OTA / Direct</th><th>Peak day</th><th></th></tr>`+
    companies.map(c=>`<tr class="${c.candidate?'cand':''}">
      <td>${c.company}</td><td>${c.nights}</td><td>${c.annualised}</td>
      <td>${c.avgStay.toFixed(1)}</td><td>${c.avgRate?money(Math.round(c.avgRate)):"—"}</td>
      <td>${c.ota} / ${c.direct}</td><td>${c.pattern}</td>
      <td>${c.candidate?'<span class="cand-flag sm">Candidate</span>':''}</td></tr>`).join("");
  v.appendChild(t);

  // ---- weeks log ----
  v.appendChild(el("div","sec-title","Weekly submissions"));
  const wt=el("table","data-table");
  wt.innerHTML=`<tr><th>Reference</th><th>Period</th><th>Rows</th><th>Added</th><th></th></tr>`+
    weeks.map(w=>`<tr><td>${w.id}</td><td>${w.from||"—"} → ${w.to||"—"}</td><td>${w.rows.length}</td>
      <td>${new Date(w.added).toLocaleDateString("en-GB")}</td>
      <td><button class="mne-del wk-del" data-id="${w.id}">×</button></td></tr>`).join("");
  v.appendChild(wt);
  wt.querySelectorAll(".wk-del").forEach(b=>b.onclick=()=>{ if(confirm("Remove this week's data?")){ CorpStore.remove(b.dataset.id); render(); } });
}

/* Parse pasted arrival list — tab or comma separated, header-aware */
function parseArrivals(raw){
  const lines=raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : (lines[0].split(",").length>lines[0].split("\t").length ? "," : "\t");
  // detect header
  let headerMap=null, start=0;
  const first=lines[0].toLowerCase();
  if(/guest|name|night|rate|company|code/.test(first)){
    const cols=lines[0].split(sep).map(s=>s.trim().toLowerCase());
    headerMap={};
    cols.forEach((c,i)=>{
      if(/guest|name/.test(c)) headerMap.guest=i;
      else if(/night|los|length/.test(c)) headerMap.nights=i;
      else if(/rate code|code|plan/.test(c)) headerMap.rateCode=i;
      else if(/rate|adr|price/.test(c)) headerMap.rate=i;
      else if(/company|account|client/.test(c)) headerMap.company=i;
      else if(/arriv|date/.test(c)) headerMap.date=i;
    });
    start=1;
  }
  const rows=[];
  for(let i=start;i<lines.length;i++){
    const p=lines[i].split(sep).map(s=>s.trim());
    if(p.length<2) continue;
    let guest,nights,rate,rateCode,company,date;
    if(headerMap){
      guest=p[headerMap.guest]||""; nights=parseFloat(p[headerMap.nights])||0;
      rate=parseFloat((p[headerMap.rate]||"").replace(/[£$,]/g,""))||0;
      rateCode=p[headerMap.rateCode]||""; company=p[headerMap.company]||"";
      date=headerMap.date!=null?p[headerMap.date]:"";
    } else {
      // positional: Guest, Nights, Rate, RateCode, Company
      guest=p[0]||""; nights=parseFloat(p[1])||0;
      rate=parseFloat((p[2]||"").replace(/[£$,]/g,""))||0;
      rateCode=p[3]||""; company=p.slice(4).join(" ")||"";
    }
    if(!guest && !company) continue;
    let dow=null; if(date){ const d=new Date(date); if(!isNaN(d)) dow=d.getDay(); }
    rows.push({ guest, nights:nights||1, rate, rateCode, company, dow });
  }
  return rows;
}

/* ============================================================ BROCHURE BUILDER */
let BROCHURE=null;
const BrochureStore={ key:"bh_brochures",
  all(){ try{return JSON.parse(localStorage.getItem(this.key))||[]}catch{return[]} },
  save(l){ localStorage.setItem(this.key,JSON.stringify(l)); },
  add(b){ const l=this.all(); l.unshift(b); this.save(l); },
  remove(id){ this.save(this.all().filter(x=>x.id!==id)); } };

function loadBrochureTemplate(key){
  const t=BROCHURE_TEMPLATES[key];
  BROCHURE=JSON.parse(JSON.stringify(t));
  BROCHURE._template=key;
}
function renderBrochureBuilder(v){
  v.appendChild(head("Brochure Builder","Build a branded rate brochure — pick a template, edit the copy, rates and images, preview, then produce a polished PDF and save it with an issue date."));
  if(!BROCHURE) loadBrochureTemplate("meetings");

  // template bar
  const trow=el("div","tmpl-row");
  trow.innerHTML=`<label>Template</label>
    <select id="br-template">${Object.entries(BROCHURE_TEMPLATES).map(([k,t])=>`<option value="${k}" ${BROCHURE._template===k?"selected":""}>${t.title}</option>`).join("")}</select>
    <button class="btn sm" id="br-load">Load</button>`;
  v.appendChild(trow);

  const wrap=el("div","quote-layout");
  // editor
  const left=el("div","quote-panel");
  left.innerHTML=`<h3>Content</h3>
    <div class="form-grid">
      <div><label>Title</label><input id="br-title" value="${(BROCHURE.title||'').replace(/"/g,'&quot;')}"></div>
      <div><label>Subtitle</label><input id="br-sub" value="${(BROCHURE.subtitle||'').replace(/"/g,'&quot;')}"></div>
    </div>
    <div style="margin-top:12px"><label>Intro copy</label><textarea id="br-intro" rows="6">${BROCHURE.intro||''}</textarea></div>

    <div class="rooms-head"><h3 style="margin-top:20px">Rates</h3><button class="btn sm" id="br-addrate">+ Add rate</button></div>
    <div id="br-rates"></div>

    <h3 style="margin-top:20px">Hero image</h3>
    <select id="br-hero" class="br-imgsel">${BROCHURE_IMAGES.map(im=>`<option value="${im.id}" ${BROCHURE.heroImg===im.id?"selected":""}>${im.label}</option>`).join("")}</select>

    <h3 style="margin-top:20px">Feature images <span class="qs-sub">(tick up to 3)</span></h3>
    <div class="br-imggrid" id="br-images"></div>

    <div style="margin-top:16px"><label>Call to action</label><input id="br-cta" value="${(BROCHURE.cta||'').replace(/"/g,'&quot;')}"></div>
    <div style="margin-top:12px"><label>Rates note / footer</label><input id="br-note" value="${(BROCHURE.ratesNote||'').replace(/"/g,'&quot;')}"></div>`;
  wrap.appendChild(left);

  // preview + actions
  const right=el("div","quote-panel");
  right.innerHTML=`<h3>Preview</h3><div id="br-preview" class="br-preview"></div>
    <div class="dual-btn"><button class="btn" id="br-pdf">Produce PDF</button>
    <button class="btn ghost" id="br-save">Save version</button></div>
    <div id="br-saved"></div>`;
  wrap.appendChild(right);
  v.appendChild(wrap);

  renderBrochureRates();
  renderBrochureImages();
  ["br-title","br-sub","br-intro","br-cta","br-note"].forEach(id=>$("#"+id).addEventListener("input",()=>{
    BROCHURE.title=$("#br-title").value; BROCHURE.subtitle=$("#br-sub").value;
    BROCHURE.intro=$("#br-intro").value; BROCHURE.cta=$("#br-cta").value;
    BROCHURE.ratesNote=$("#br-note").value; renderBrochurePreview(); }));
  $("#br-hero").onchange=e=>{ BROCHURE.heroImg=e.target.value; renderBrochurePreview(); };
  $("#br-load").onclick=()=>{ loadBrochureTemplate($("#br-template").value); switchTab("brochure"); };
  $("#br-addrate").onclick=()=>{ BROCHURE.rates.push({name:"New rate",price:"",inc:""}); renderBrochureRates(); renderBrochurePreview(); };
  $("#br-pdf").onclick=produceBrochurePDF;
  $("#br-save").onclick=saveBrochure;
  renderBrochurePreview(); renderSavedBrochures();
}
function renderBrochureRates(){
  const box=$("#br-rates"); if(!box)return; box.innerHTML="";
  BROCHURE.rates.forEach((r,i)=>{
    const card=el("div","menu-course");
    card.innerHTML=`<div class="mc-head">
        <input class="mc-name" data-i="${i}" data-f="name" value="${(r.name||'').replace(/"/g,'&quot;')}" placeholder="Rate name">
        <input class="br-price" data-i="${i}" data-f="price" value="${(r.price||'').replace(/"/g,'&quot;')}" placeholder="Price">
        <button class="mc-del" data-i="${i}">×</button></div>
      <textarea class="br-inc" data-i="${i}" data-f="inc" rows="2" placeholder="Inclusions">${r.inc||''}</textarea>`;
    box.appendChild(card);
  });
  box.querySelectorAll("input,textarea").forEach(inp=>inp.oninput=e=>{
    BROCHURE.rates[+e.target.dataset.i][e.target.dataset.f]=e.target.value; renderBrochurePreview(); });
  box.querySelectorAll(".mc-del").forEach(b=>b.onclick=()=>{ BROCHURE.rates.splice(+b.dataset.i,1); renderBrochureRates(); renderBrochurePreview(); });
}
function renderBrochureImages(){
  const box=$("#br-images"); if(!box)return;
  box.innerHTML=BROCHURE_IMAGES.map(im=>{
    const on=(BROCHURE.images||[]).includes(im.id);
    return `<label class="br-imgopt ${on?'on':''}"><input type="checkbox" data-id="${im.id}" ${on?'checked':''}>
      <img src="${im.file}" loading="lazy" onerror="this.style.opacity=.2"><span>${im.label}</span></label>`;
  }).join("");
  box.querySelectorAll("input").forEach(cb=>cb.onchange=()=>{
    BROCHURE.images=BROCHURE.images||[];
    if(cb.checked){ if(BROCHURE.images.length<3) BROCHURE.images.push(cb.dataset.id); else cb.checked=false; }
    else BROCHURE.images=BROCHURE.images.filter(x=>x!==cb.dataset.id);
    renderBrochureImages(); renderBrochurePreview();
  });
}
function imgFile(id){ return (BROCHURE_IMAGES.find(i=>i.id===id)||{}).file||""; }
function renderBrochurePreview(){
  const box=$("#br-preview"); if(!box)return;
  const hero=imgFile(BROCHURE.heroImg);
  box.innerHTML=`
    <div class="brp-hero" style="background-image:url('${hero}')"><div class="brp-ov"></div>
      <div class="brp-htxt"><div class="brp-logo">BRANDON HALL</div><div class="brp-eyebrow">HOTEL &amp; SPA</div>
        <div class="brp-title">${BROCHURE.title||''}</div><div class="brp-sub">${BROCHURE.subtitle||''}</div></div></div>
    <div class="brp-body">
      <p class="brp-intro">${(BROCHURE.intro||'').split("\n").filter(Boolean)[0]||''}</p>
      <div class="brp-rates">${BROCHURE.rates.map(r=>`<div class="brp-rate"><div class="brp-rn">${r.name} <span>${r.price||''}</span></div><div class="brp-ri">${r.inc||''}</div></div>`).join("")}</div>
    </div>`;
}
function renderSavedBrochures(){
  const box=$("#br-saved"); if(!box)return;
  const list=BrochureStore.all();
  if(!list.length){ box.innerHTML=""; return; }
  box.innerHTML=`<div class="sec-title" style="margin-top:18px">Saved versions</div>`+
    `<table class="scenario-table"><tr><th>Title</th><th>Issued</th><th></th></tr>`+
    list.map(b=>`<tr><td>${b.title}</td><td>${b.issued}</td>
      <td><button class="sc-del" data-id="${b.id}">×</button></td></tr>`).join("")+`</table>`;
  box.querySelectorAll(".sc-del").forEach(b=>b.onclick=()=>{ BrochureStore.remove(b.dataset.id); renderSavedBrochures(); });
}
function saveBrochure(){
  const issued=new Date().toLocaleDateString("en-GB");
  BrochureStore.add({ id:"BR-"+Date.now().toString(36).toUpperCase(), title:BROCHURE.title,
    issued, template:BROCHURE._template, data:JSON.parse(JSON.stringify(BROCHURE)) });
  renderSavedBrochures();
  alert(`Saved "${BROCHURE.title}" — issued ${issued}.`);
}
function produceBrochurePDF(){
  const b=BROCHURE;
  const issued=new Date().toLocaleDateString("en-GB");
  const hero=imgFile(b.heroImg);
  const imgs=(b.images||[]).map(imgFile).filter(Boolean);
  const introPs=(b.intro||"").split("\n").filter(Boolean).map(p=>`<p>${p}</p>`).join("");
  const rates=b.rates.map(r=>`<tr><td class="rn">${r.name}</td><td class="rp">${r.price||""}</td><td class="ri">${r.inc||""}</td></tr>`).join("");
  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${b.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>@page{margin:0}body{margin:0;font-family:'Inter',Arial,sans-serif;color:#1a2230;font-size:12px;line-height:1.55}
    .hero{height:135mm;background:url('${hero}') center/cover;position:relative;display:flex;align-items:flex-end}
    .hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,43,71,.15),rgba(16,29,51,.75))}
    .htxt{position:relative;z-index:2;color:#fff;padding:20mm}
    .logo{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;letter-spacing:4px}
    .eyebrow{font-size:11px;letter-spacing:5px;color:#e8dccf;margin-bottom:14px}
    .htitle{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;line-height:1.05}
    .hsub{font-style:italic;font-size:16px;color:#e8dccf;margin-top:6px}
    .body{padding:18mm 20mm}
    h2{font-family:'Cormorant Garamond',serif;font-size:24px;color:#1a2b47;margin:0 0 4px}
    .rule{height:2px;width:56px;background:#BB9979;margin:8px 0 16px}
    .intro p{color:#3a4256;margin:0 0 10px}
    .imgrow{display:flex;gap:8px;margin:16px 0}
    .imgrow img{width:33.33%;height:52mm;object-fit:cover;border-radius:6px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    td{padding:12px 10px;border-bottom:1px solid #e3e7ee;vertical-align:top}
    .rn{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#1a2b47;width:32%}
    .rp{color:#9d7d5f;font-weight:600;width:20%;font-size:14px}
    .ri{color:#3a4256;font-size:11.5px}
    .cta{background:#1a2b47;color:#fff;border-radius:10px;padding:18px 22px;margin-top:22px;text-align:center;font-size:14px}
    .cta b{font-family:'Cormorant Garamond',serif;font-size:18px;display:block;margin-bottom:4px}
    .foot{margin-top:20px;font-size:10px;color:#7a8494;text-align:center;border-top:1px solid #e8dccf;padding-top:14px}
    .issued{position:absolute;top:14mm;right:16mm;z-index:3;color:#fff;font-size:10px;opacity:.85}</style>
    </head><body>
    <div class="hero"><div class="issued">Issued ${issued}</div>
      <div class="htxt"><div class="logo">BRANDON HALL</div><div class="eyebrow">HOTEL &amp; SPA</div>
        <div class="htitle">${b.title||""}</div><div class="hsub">${b.subtitle||""}</div></div></div>
    <div class="body">
      <h2>Welcome</h2><div class="rule"></div>
      <div class="intro">${introPs}</div>
      ${imgs.length?`<div class="imgrow">${imgs.map(u=>`<img src="${u}">`).join("")}</div>`:""}
      <h2 style="margin-top:18px">Our Rates</h2><div class="rule"></div>
      <table>${rates}</table>
      ${b.ratesNote?`<p style="font-size:10.5px;color:#7a8494;margin-top:10px">${b.ratesNote}</p>`:""}
      ${b.cta?`<div class="cta"><b>${b.cta}</b>+44 (0)247 710 2555 · events@brandonhallhotelandspa.com</div>`:""}
      <div class="foot">Brandon Hall Hotel &amp; Spa · Main Street, Brandon, Wolston, Coventry CV8 3FW · brandonhallhotelandspa.com</div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  win.document.close();
}

/* ============================================================ SOCIAL STUDIO (paste-based, no cost) */
let SOCIAL_IMG=null; // { dataUrl, file }
function renderSocial(v){
  v.appendChild(head("Social Studio","Upload an image and describe your post. We build a ready-to-use prompt — paste it into Claude or ChatGPT, then drop the result back to format it."));

  const help=el("div","help-box");
  help.innerHTML=`<button class="help-toggle" id="soc-help-t">💡 How this works (no cost)</button>
    <div class="help-body hidden" id="soc-help-b">
      <p><b>1.</b> Upload your image and describe what it shows and what you're promoting.</p>
      <p><b>2.</b> Click <b>Build prompt</b> — we write a detailed brief in Brandon Hall's voice.</p>
      <p><b>3.</b> Click <b>Copy</b>, then paste it into <a href="https://claude.ai" target="_blank">Claude.ai</a> or ChatGPT (attach the image too if you like) and send.</p>
      <p><b>4.</b> Paste the caption + hashtags it gives you back into the box below to preview and copy your finished post alongside the image.</p>
      <p>No API key, no cost — uses the Claude/ChatGPT login your team already has.</p>
    </div>`;
  v.appendChild(help);
  $("#soc-help-t").onclick=()=>$("#soc-help-b").classList.toggle("hidden");

  const wrap=el("div","quote-layout");
  // left: inputs
  const left=el("div","quote-panel");
  left.innerHTML=`<h3>1 · Your post</h3>
    <div class="soc-drop" id="soc-drop">
      <input type="file" id="soc-file" accept="image/*" hidden>
      <div id="soc-dropinner"><span class="soc-dropico">📷</span><div>Click to upload an image</div><div class="qs-sub">or drag &amp; drop</div></div>
    </div>
    <div style="margin-top:14px"><label>What's in the image? What are you promoting?</label>
      <textarea id="soc-desc" rows="4" placeholder="e.g. Photo of our spa pool at sunset. We want to promote midweek spa days — £45 including lunch and full use of the leisure facilities."></textarea></div>
    <div class="form-grid" style="margin-top:12px">
      <div><label>Tone</label><select id="soc-tone">
        <option>Warm &amp; welcoming</option><option>Elegant &amp; refined</option><option>Fun &amp; upbeat</option><option>Informative</option><option>Luxury</option></select></div>
      <div><label>Platform</label><select id="soc-platform">
        <option>Instagram / Facebook</option><option>LinkedIn</option><option>X / Twitter</option><option>Any platform</option></select></div>
      <div class="full"><label>Call to action</label><input id="soc-cta" placeholder="e.g. Book now / Link in bio"></div>
    </div>
    <div style="margin-top:16px"><button class="btn" id="soc-build">Build prompt</button></div>
    <div id="soc-promptbox"></div>`;
  wrap.appendChild(left);

  // right: paste result + preview
  const right=el("div","quote-panel");
  right.innerHTML=`<h3>2 · Paste the result</h3>
    <p class="qs-sub" style="margin-bottom:8px">Paste what Claude/ChatGPT gives you here:</p>
    <textarea id="soc-result" rows="5" placeholder="Paste the generated caption and hashtags here…"></textarea>
    <div id="soc-preview" class="soc-preview" style="margin-top:14px"></div>`;
  wrap.appendChild(right);
  v.appendChild(wrap);

  // upload wiring
  const drop=$("#soc-drop"), file=$("#soc-file");
  drop.onclick=()=>file.click();
  file.onchange=e=>handleSocialImage(e.target.files[0]);
  drop.ondragover=e=>{ e.preventDefault(); drop.classList.add("drag"); };
  drop.ondragleave=()=>drop.classList.remove("drag");
  drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove("drag"); if(e.dataTransfer.files[0]) handleSocialImage(e.dataTransfer.files[0]); };
  $("#soc-build").onclick=buildSocialPrompt;
  $("#soc-result").addEventListener("input",renderSocialPreview);
}
function handleSocialImage(f){
  if(!f || !f.type.startsWith("image/"))return;
  const reader=new FileReader();
  reader.onload=e=>{ SOCIAL_IMG={ dataUrl:e.target.result, file:f };
    $("#soc-dropinner").innerHTML=`<img src="${e.target.result}" class="soc-thumb"><div class="qs-sub">${f.name} · click to change</div>`;
    renderSocialPreview();
  };
  reader.readAsDataURL(f);
}
function buildSocialPrompt(){
  const desc=$("#soc-desc").value.trim();
  const box=$("#soc-promptbox");
  if(!desc){ box.innerHTML=`<div class="qs-sub" style="color:var(--warn);margin-top:10px">Please describe the image and what you're promoting.</div>`; return; }
  const tone=$("#soc-tone").value, platform=$("#soc-platform").value, cta=$("#soc-cta").value.trim();
  const prompt=`Write a social media post for Brandon Hall Hotel & Spa — a 4-star country-house hotel and spa set in 17 acres of Warwickshire grounds near Coventry (CV8 3FW), offering weddings, meetings & events, a spa with an 18-metre pool, restaurant and bar, and 120 en-suite bedrooms.

Voice: ${tone.toLowerCase()}, with a touch of understated luxury — warm and genuine, never gimmicky. British English.

Platform: ${platform}.

What's in the image / what we're promoting:
${desc}
${cta?`\nPreferred call to action: ${cta}`:""}

Please provide:
1. A concise, engaging caption (2–4 short sentences) ending with a natural call to action.
2. A line of 8–12 relevant hashtags mixing brand, location and topic (e.g. #BrandonHall #WarwickshireWeddings #CoventryHotel #SpaDay).

${SOCIAL_IMG?"(An image is attached — please reference what's actually shown.)":""}`;
  box.innerHTML=`<div class="soc-prompt" id="soc-prompt">${prompt.replace(/</g,"&lt;")}</div>
    <div class="dual-btn" style="margin-top:10px">
      <button class="btn" id="soc-copyprompt">Copy prompt</button>
      <a class="btn ghost" href="https://claude.ai/new" target="_blank" style="text-align:center;text-decoration:none">Open Claude ↗</a>
    </div>
    ${SOCIAL_IMG?`<p class="qs-sub" style="margin-top:8px">Tip: attach your image in Claude/ChatGPT too, so it can describe what's actually in the photo.</p>`:""}`;
  $("#soc-copyprompt").onclick=()=>{ navigator.clipboard?.writeText(prompt); $("#soc-copyprompt").textContent="Copied ✓";
    setTimeout(()=>{ if($("#soc-copyprompt")) $("#soc-copyprompt").textContent="Copy prompt"; },1500); };
}
function renderSocialPreview(){
  const prev=$("#soc-preview"); if(!prev)return;
  const result=($("#soc-result")?.value||"").trim();
  if(!result && !SOCIAL_IMG){ prev.innerHTML=""; return; }
  // split hashtags (last line/block starting with #) from caption
  let caption=result, tags="";
  const m=result.match(/((?:#[^\s#]+\s*)+)\s*$/);
  if(m){ tags=m[1].trim(); caption=result.slice(0,m.index).trim(); }
  prev.innerHTML=`
    ${SOCIAL_IMG?`<img src="${SOCIAL_IMG.dataUrl}" class="soc-outimg">`:""}
    ${caption?`<div class="soc-caption">${caption.replace(/\n/g,"<br>")}</div>`:""}
    ${tags?`<div class="soc-tags">${tags}</div>`:""}
    ${(caption||tags)?`<div class="dual-btn" style="margin-top:14px"><button class="btn" id="soc-copyfinal">Copy caption + tags</button></div>`:""}`;
  if($("#soc-copyfinal")) $("#soc-copyfinal").onclick=()=>{ navigator.clipboard?.writeText(result);
    $("#soc-copyfinal").textContent="Copied ✓"; setTimeout(()=>{ if($("#soc-copyfinal")) $("#soc-copyfinal").textContent="Copy caption + tags"; },1500); };
}

/* ============================================================ HOME / WELCOME */
function renderHome(v){
  // ---- simple welcome header ----
  const hdr=el("div","sf-welcome");
  hdr.innerHTML=`<h1>Welcome to <span class="hospro-navy">HOS</span><span class="hospro-teal">PRO</span></h1>
    <p>Brandon Hall Hotel and Spa</p>`;
  v.appendChild(hdr);

  // ---- module cards, one even row (exclude insight from home) ----
  const mods=userModules(SESSION?._key||"ajay.kawa").filter(m=>m.id!=="insight");
  const cardRow=el("div","sf-modules");
  cardRow.innerHTML=mods.map(m=>`
    <button class="sf-modcard" data-go="${m.tabs[0]}" style="--mc:${m.colour};--mt:${m.tint}">
      <span class="sf-modico" style="background:${m.colour}">${m.icon}</span>
      <span class="sf-modname">${m.name.replace("PRO","")}<b>PRO</b></span>
      <span class="sf-modcap">${m.caption}</span>
    </button>`).join("");
  v.appendChild(cardRow);
  cardRow.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>switchTab(b.dataset.go));

  // ---- at-a-glance stats ----
  const pipe=(typeof pipelineData==="function")?pipelineData():[];
  const open=pipe.filter(e=>["enquiry","provisional"].includes(e.status));
  const conf=pipe.filter(e=>e.status==="confirmed");
  const today=new Date().toISOString().slice(0,10);
  const weekAgo=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const newThisWeek=pipe.filter(e=>e.created && e.created.slice(0,10)>=weekAgo && !["bob"].includes(e._kind)).length;
  const overdue=pipe.filter(e=>["enquiry","provisional"].includes(e.status) && e.followUp && e.followUp<today).length;
  const upcoming=pipe.filter(e=>e.date && /^\d{4}-\d{2}-\d{2}/.test(e.date) && e.date>=today && e.status!=="cancelled")
    .sort((a,b)=>a.date.localeCompare(b.date));
  const openTasks=(typeof TaskStore!=="undefined")?TaskStore.all().filter(t=>!t.done).length:0;
  const stats=el("div","sf-stats6");
  stats.innerHTML=`
    <button class="sf-stat" data-go="pipeline"><span class="sf-stat-ic" style="background:#eef2f8">📊</span>
      <div><span class="sf-stat-v">${open.length}</span><span class="sf-stat-k">Open enquiries</span></div></button>
    <button class="sf-stat" data-go="pipeline"><span class="sf-stat-ic" style="background:#e6f3ee">💷</span>
      <div><span class="sf-stat-v">${money(Math.round(conf.reduce((s,e)=>s+(e.value||0),0)))}</span><span class="sf-stat-k">Confirmed value</span></div></button>
    <button class="sf-stat" data-go="pipeline"><span class="sf-stat-ic" style="background:#eef7ea">🆕</span>
      <div><span class="sf-stat-v">${newThisWeek}</span><span class="sf-stat-k">New this week</span></div></button>
    <button class="sf-stat" data-go="pipeline"><span class="sf-stat-ic" style="background:#fdeee3">⚠️</span>
      <div><span class="sf-stat-v" style="${overdue?'color:#b3261e':''}">${overdue}</span><span class="sf-stat-k">Overdue follow-ups</span></div></button>
    <button class="sf-stat" data-go="tasks"><span class="sf-stat-ic" style="background:#e8f3e8">✅</span>
      <div><span class="sf-stat-v">${openTasks}</span><span class="sf-stat-k">Open tasks</span></div></button>
    <button class="sf-stat" data-go="pipeline"><span class="sf-stat-ic" style="background:#eef2f8">📅</span>
      <div><span class="sf-stat-v">${upcoming.length}</span><span class="sf-stat-k">Upcoming events</span></div></button>`;
  v.appendChild(stats);
  stats.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>switchTab(b.dataset.go));

  // ---- dashboard grid: priorities · upcoming · mini pipeline snapshot ----
  const grid=el("div","sf-dash-grid");
  const tasks=(typeof TaskStore!=="undefined")?TaskStore.all().filter(t=>!t.done).slice(0,5):[];
  const prioRows = tasks.length? tasks.map(t=>`<div class="sf-prio"><span class="sf-prio-check">☐</span>
      <div class="sf-prio-txt">${t.title}<span class="sf-prio-mod">${t.module||"TaskPRO"}</span></div>
      <span class="sf-prio-due">${t.due||""}</span></div>`).join("")
    : open.slice(0,5).map(e=>`<div class="sf-prio"><span class="sf-prio-check">☐</span>
      <div class="sf-prio-txt">Follow up: ${e.name}<span class="sf-prio-mod">SalesPRO</span></div>
      <span class="sf-prio-due">${e.followUp?fmtDMY(e.followUp):""}</span></div>`).join("");
  const upRows = upcoming.slice(0,5).map(e=>{ const d=new Date(e.date);
    const et=EVENT_TYPES.find(t=>t.id===e.event);
    return `<div class="sf-up"><div class="sf-up-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString("en-GB",{month:"short"}).toUpperCase()}</span></div>
      <div class="sf-up-txt">${e.name}<span class="sf-up-sub">${et?et.label:(e.roomName||"Event")}</span></div></div>`;
  }).join("") || `<div class="qs-sub" style="padding:10px 0">No upcoming events.</div>`;

  // mini pipeline snapshot — value by stage
  const byStage={enquiry:0,provisional:0,confirmed:0};
  pipe.forEach(e=>{ if(byStage[e.status]!=null) byStage[e.status]+=e.value||0; });
  const maxStage=Math.max(byStage.enquiry,byStage.provisional,byStage.confirmed,1);
  grid.innerHTML=`
    <div class="sf-panel">
      <div class="sf-panel-head"><h3>Today's Priorities</h3><button class="sf-link" data-go="tasks">View all</button></div>
      ${prioRows||`<div class="qs-sub" style="padding:10px 0">Nothing outstanding — nice work.</div>`}
    </div>
    <div class="sf-panel">
      <div class="sf-panel-head"><h3>Upcoming Events</h3><button class="sf-link" data-go="pipeline">View all</button></div>
      ${upRows}
    </div>
    <div class="sf-panel">
      <div class="sf-panel-head"><h3>Pipeline Snapshot</h3><button class="sf-link" data-go="pipeline">Open</button></div>
      <div class="snap-row"><span class="snap-k">Enquiry</span><div class="snap-bar"><span style="width:${byStage.enquiry/maxStage*100}%;background:#e8cf4a"></span></div><span class="snap-v">${money(Math.round(byStage.enquiry))}</span></div>
      <div class="snap-row"><span class="snap-k">Provisional</span><div class="snap-bar"><span style="width:${byStage.provisional/maxStage*100}%;background:#e0a030"></span></div><span class="snap-v">${money(Math.round(byStage.provisional))}</span></div>
      <div class="snap-row"><span class="snap-k">Confirmed</span><div class="snap-bar"><span style="width:${byStage.confirmed/maxStage*100}%;background:#4a9d6a"></span></div><span class="snap-v">${money(Math.round(byStage.confirmed))}</span></div>
      <div class="snap-tot">Open pipeline: <b>${money(Math.round(open.reduce((s,e)=>s+(e.value||0),0)))}</b></div>
    </div>`;
  v.appendChild(grid);
  grid.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>switchTab(b.dataset.go));
}
function fmtDMY(d){ return /^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):d; }

/* ============================================================ TASKFLOW */
const TaskStore={ key:"bh_tasks",
  all(){ try{return JSON.parse(localStorage.getItem(this.key))||DEFAULT_TASKS}catch{return DEFAULT_TASKS} },
  save(l){ localStorage.setItem(this.key,JSON.stringify(l)); },
  add(t){ const l=this.all(); l.unshift(Object.assign({id:"T-"+Date.now().toString(36)},t)); this.save(l); },
  toggle(id){ const l=this.all(); const t=l.find(x=>x.id===id); if(t){t.done=!t.done; this.save(l);} },
  remove(id){ this.save(this.all().filter(x=>x.id!==id)); } };
const DEFAULT_TASKS=[
  { id:"T-1", title:"Finalise wedding rooming list", module:"EventsPRO", due:"Due 10:00", done:false },
  { id:"T-2", title:"Approve Q3 corporate proposal", module:"SalesPRO", due:"Due 11:30", done:false },
  { id:"T-3", title:"Check spa maintenance schedule", module:"AssetPRO", due:"Due 14:00", done:false },
  { id:"T-4", title:"Review marketing campaign assets", module:"MarketingPRO", due:"Due 15:00", done:false },
  { id:"T-5", title:"Team briefing", module:"TaskPRO", due:"Due 16:00", done:false }
];
function renderTasks(v){
  v.appendChild(head("Tasks","Team tasks and accountability across every module."));
  const tb=el("div","enq-toolbar");
  tb.innerHTML=`<button class="btn" id="task-new">+ New task</button><div class="spacer"></div>`;
  v.appendChild(tb);
  $("#task-new").onclick=()=>{ const title=prompt("Task:"); if(title){ TaskStore.add({title,module:"TaskPRO",due:"",done:false}); render(); } };
  const list=TaskStore.all();
  const box=el("div","task-list");
  box.innerHTML=list.map(t=>`<div class="task-row ${t.done?'done':''}">
    <button class="task-check" data-id="${t.id}">${t.done?"✓":"☐"}</button>
    <div class="task-txt">${t.title}<span class="task-mod">${t.module||""}</span></div>
    <span class="task-due">${t.due||""}</span>
    <button class="task-del" data-id="${t.id}">×</button></div>`).join("")||`<div class="empty"><div class="big">No tasks</div>Add one to get started.</div>`;
  v.appendChild(box);
  box.querySelectorAll(".task-check").forEach(b=>b.onclick=()=>{ TaskStore.toggle(b.dataset.id); render(); });
  box.querySelectorAll(".task-del").forEach(b=>b.onclick=()=>{ TaskStore.remove(b.dataset.id); render(); });
}

/* ============================================================ INSIGHTFLOW */
function renderInsight(v){
  v.appendChild(head("Insights","At-a-glance analytics across your pipeline and business-on-books."));
  // reuse pipeline data for a quick insight board
  const pipe=(typeof pipelineData==="function")?pipelineData():[];
  const open=pipe.filter(e=>["enquiry","provisional"].includes(e.status));
  const conf=pipe.filter(e=>e.status==="confirmed");
  const lost=pipe.filter(e=>e.status==="cancelled");
  const openVal=open.reduce((s,e)=>s+(e.value||0),0);
  const confVal=conf.reduce((s,e)=>s+(e.value||0),0);
  const kpis=el("div","stat-cards");
  kpis.innerHTML=`
    <div class="stat-card accent"><div class="sc-v">${money(Math.round(openVal))}</div><div class="sc-k">Open pipeline</div></div>
    <div class="stat-card"><div class="sc-v">${open.length}</div><div class="sc-k">Open opportunities</div></div>
    <div class="stat-card"><div class="sc-v">${money(Math.round(confVal))}</div><div class="sc-k">Confirmed value</div></div>
    <div class="stat-card"><div class="sc-v">${conf.length}</div><div class="sc-k">Confirmed</div></div>
    <div class="stat-card"><div class="sc-v">${pipe.length?Math.round(conf.length/pipe.length*100):0}%</div><div class="sc-k">Conversion</div></div>
    <div class="stat-card"><div class="sc-v">${lost.length}</div><div class="sc-k">Cancelled</div></div>`;
  v.appendChild(kpis);
  if(typeof clickableChart==="function" && open.length){
    const row=el("div","chart-row");
    row.appendChild(clickableChart("Pipeline value by owner","owner", pieChartData(pipe.filter(e=>["enquiry","provisional","confirmed"].includes(e.status)),e=>e.owner||"Unassigned")));
    row.appendChild(clickableChart("Pipeline value by room","room", barChartData(pipe.filter(e=>["enquiry","provisional","confirmed"].includes(e.status)),e=>e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"—")));
    v.appendChild(row);
  }
  v.appendChild(el("p","qs-sub",`<span style="font-size:12px">Open the Sales Pipeline for the full filterable view.</span>`));
  const b=el("button","btn"); b.textContent="Go to Sales Pipeline"; b.onclick=()=>switchTab("pipeline"); v.appendChild(b);
}

/* ============================================================ STAYCORP */
function precheckinURL(){ return location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"")+"/precheckin.html"; }

function renderPrecheckinSetup(v){
  v.appendChild(head("Pre Check-in — Setup","Share this link in booking confirmations. Guests complete it before arrival, and every submission builds your corporate guest database."));
  const url=precheckinURL();
  const btn=`<a href="${url}" target="_blank" style="display:inline-block;background:#2f6f9e;color:#fff;padding:12px 24px;border-radius:30px;font:600 15px/1 'Lato',sans-serif;text-decoration:none">Complete your pre check-in →</a>`;

  const panel=el("div","quote-panel");
  panel.innerHTML=`
    <div class="sec-title">Shareable link</div>
    <p class="qs-sub" style="margin-bottom:6px">Paste this into booking confirmation emails:</p>
    <div class="embed-box">${url}<button class="cp" id="pc-copylink">Copy</button></div>

    <div class="sec-title">Email button (copy &amp; paste HTML)</div>
    <div class="embed-box">${btn.replace(/</g,"&lt;")}<button class="cp" id="pc-copybtn">Copy</button></div>

    <div class="sec-title">Suggested email wording</div>
    <div class="embed-box" style="white-space:pre-wrap">Dear guest,

We look forward to welcoming you to Brandon Hall Hotel and Spa. To help us prepare for your stay, please take a moment to complete your pre check-in:

${url}

It only takes a minute and lets us tailor your arrival, dinner and any special requests.

Warm regards,
The Brandon Hall Team<button class="cp" id="pc-copyemail">Copy</button></div>

    <div class="sec-title">How it looks</div>
    <div style="padding:18px;background:var(--paper);border-radius:10px;text-align:center">${btn}</div>

    <div class="admin-note" style="margin-top:16px">Submissions flow into <b>Corporate Database</b>. When the portal is live on Firebase they're shared across the team; in demo mode they save to this browser.</div>`;
  v.appendChild(panel);
  const copy=(id,text,btnEl)=>{ $(id).onclick=()=>{ navigator.clipboard?.writeText(text); btnEl.textContent="Copied"; }; };
  copy("#pc-copylink",url,$("#pc-copylink"));
  const emailBtn=`<a href="${url}" target="_blank" style="display:inline-block;background:#2f6f9e;color:#fff;padding:12px 24px;border-radius:30px;font:600 15px/1 'Lato',sans-serif;text-decoration:none">Complete your pre check-in →</a>`;
  $("#pc-copybtn").onclick=()=>{ navigator.clipboard?.writeText(emailBtn); $("#pc-copybtn").textContent="Copied"; };
  $("#pc-copyemail").onclick=()=>{ navigator.clipboard?.writeText($("#pc-copyemail").parentElement.textContent.replace("Copy","").trim()); $("#pc-copyemail").textContent="Copied"; };
}

/* Public pre-check-in form (no login) */
function openPrecheckinForm(){
  $("#login")?.classList.add("hidden");
  const app=$("#app"); if(app) app.classList.remove("hidden");
  document.querySelector(".sf-sidebar")&&(document.querySelector(".sf-sidebar").style.display="none");
  document.querySelector(".sf-header")&&(document.querySelector(".sf-header").style.display="none");
  const main=document.querySelector(".sf-main"); if(main){ main.style.marginLeft="0"; main.style.padding="0"; }
  document.body.classList.add("pc-public");
  const v=$("#view"); if(!v)return; v.innerHTML=""; v.style.maxWidth="none"; v.style.margin="0"; v.style.padding="0";

  // ---- SPLASH ----
  const splash=el("div","pc-splash");
  splash.innerHTML=`<div class="pc-splash-inner">
      <img src="assets/marketing/logos/logo-gold-transparent.png" class="pc-splash-logo" onerror="this.src='assets/bh-logo.svg'">
      <div class="pc-splash-eyebrow">WELCOME TO</div>
      <h1 class="pc-splash-title">Brandon Hall<br>Hotel and Spa</h1>
      <p class="pc-splash-sub">We look forward to welcoming you. Please take a moment to complete your pre check-in so we can prepare for your stay.</p>
      <button class="pc-begin" id="pc-begin">Begin pre check-in →</button>
    </div>`;
  v.appendChild(splash);
  $("#pc-begin").onclick=()=>{ splash.remove(); showPrecheckinFields(v); };
}
function showPrecheckinFields(v){
  const wrap=el("div","pc-formwrap");
  wrap.innerHTML=`
    <div class="pc-card">
      <img src="assets/marketing/logos/logo-gold-transparent.png" class="pc-card-logo" onerror="this.src='assets/bh-logo.svg'">
      <h3 class="pc-card-title">Pre Check-in</h3>
      <p class="pc-card-sub">Please complete the details below.</p>
      <div class="form-grid" id="pc-fields"></div>
      <div id="pc-msg" class="pc-msg"></div>
      <div style="margin-top:18px"><button class="pc-submit" id="pc-submit">Submit pre check-in</button></div>
    </div>
    <p class="pc-foot">Brandon Hall Hotel and Spa · Main Street, Brandon, Coventry CV8 3FW · 024 7710 2555</p>`;
  v.appendChild(wrap);
  const box=$("#pc-fields");
  box.innerHTML=PRECHECKIN_FIELDS.map(f=>{
    const full = f.type==="textarea"||f.key==="roomReq"||f.key==="dietary"||f.key==="occasion" ? "full":"";
    let input;
    if(f.type==="textarea") input=`<textarea id="pc-${f.key}" rows="2" placeholder="${f.ph||""}"></textarea>`;
    else if(f.type==="select") input=`<select id="pc-${f.key}">${f.opts.map(o=>`<option>${o}</option>`).join("")}</select>`;
    else input=`<input id="pc-${f.key}" type="${f.type}" placeholder="${f.ph||""}">`;
    return `<div class="${full}" data-field="${f.key}"><label>${f.label}${f.req?' *':''}</label>${input}</div>`;
  }).join("");
  const toggleDinner=()=>{ const show=$("#pc-dinner")?.value==="Yes";
    ["dinnerTime","dinnerCovers"].forEach(k=>{ const el2=box.querySelector(`[data-field="${k}"]`); if(el2) el2.style.display=show?"":"none"; }); };
  $("#pc-dinner").onchange=toggleDinner; toggleDinner();
  $("#pc-submit").onclick=async()=>{
    const rec={}; let missing=false;
    PRECHECKIN_FIELDS.forEach(f=>{ const val=$("#pc-"+f.key)?.value?.trim?.()||$("#pc-"+f.key)?.value||"";
      rec[f.key]=val; if(f.req && !val) missing=true; });
    if(missing){ $("#pc-msg").innerHTML=`<span style="color:#ffd9b0">Please complete the required fields (*).</span>`; return; }
    rec.source="pre check-in";
    $("#pc-submit").disabled=true; $("#pc-msg").textContent="Submitting…";
    await CorpGuestStore.add(rec);
    v.innerHTML=`<div class="pc-thanks"><div class="pc-thanks-inner">
      <img src="assets/marketing/logos/logo-gold-transparent.png" class="pc-splash-logo" onerror="this.src='assets/bh-logo.svg'">
      <h1 class="pc-splash-title">Thank you, ${rec.name.split(" ")[0]}</h1>
      <p class="pc-splash-sub">Your pre check-in is complete. We look forward to welcoming you to Brandon Hall Hotel and Spa.</p>
      </div></div>`;
  };
}

/* Corporate database — aggregates pre-check-ins by company */
function renderCorpDb(v){
  v.appendChild(head("Corporate Database","Every pre check-in, grouped by company — room nights, guests and stay patterns to target corporate rates."));
  const list=CorpGuestStore.all();
  if(!list.length){
    v.appendChild(el("div","empty",`<div class="big">No pre check-ins yet</div>Share the pre check-in link (StayCORP → Pre Check-in Setup) to start building the database.`));
    return;
  }
  const nights=r=>{ if(r.checkin&&r.checkout){ const d=(new Date(r.checkout)-new Date(r.checkin))/864e5; return d>0?Math.round(d):1; } return 1; };
  const comp={};
  list.forEach(r=>{ const key=(r.company||"").trim()||"(individual)";
    const c=comp[key]||(comp[key]={company:key, guests:0, nights:0, stays:0, dinners:0, records:[]});
    c.guests+=1; c.nights+=nights(r); c.stays+=1; if(r.dinner==="Yes")c.dinners+=1; c.records.push(r); });
  const companies=Object.values(comp).sort((a,b)=>b.nights-a.nights);
  const totalNights=companies.reduce((s,c)=>s+c.nights,0);
  const corpCandidates=companies.filter(c=>c.company!=="(individual)" && c.nights*12>=CORP_THRESHOLD);

  const kpis=el("div","stat-cards");
  kpis.innerHTML=`
    <div class="stat-card"><div class="sc-v">${list.length}</div><div class="sc-k">Pre check-ins</div></div>
    <div class="stat-card"><div class="sc-v">${companies.filter(c=>c.company!=="(individual)").length}</div><div class="sc-k">Companies</div></div>
    <div class="stat-card accent"><div class="sc-v">${totalNights}</div><div class="sc-k">Room nights captured</div></div>
    <div class="stat-card"><div class="sc-v">${corpCandidates.length}</div><div class="sc-k">Corporate candidates</div></div>`;
  v.appendChild(kpis);

  v.appendChild(el("div","sec-title","Companies"));
  const t=el("table","data-table");
  t.innerHTML=`<tr><th>Company</th><th>Guests</th><th>Room nights</th><th>Annualised</th><th>Dinners</th><th></th></tr>`+
    companies.map(c=>{ const ann=c.nights*12; const cand=c.company!=="(individual)"&&ann>=CORP_THRESHOLD;
      return `<tr class="${cand?'cand':''}"><td>${c.company}</td><td>${c.guests}</td><td>${c.nights}</td>
      <td>${ann}</td><td>${c.dinners}</td><td>${cand?'<span class="cand-flag sm">Corporate candidate</span>':''}</td></tr>`;
    }).join("");
  v.appendChild(t);

  v.appendChild(el("div","sec-title","Recent pre check-ins"));
  const rt=el("table","data-table");
  rt.innerHTML=`<tr><th>Guest</th><th>Company</th><th>Check-in</th><th>Nights</th><th>Dinner</th><th>Dietary</th></tr>`+
    list.slice(0,40).map(r=>`<tr><td>${r.name}</td><td>${r.company||"—"}</td>
      <td>${r.checkin?new Date(r.checkin).toLocaleDateString("en-GB"):"—"}</td><td>${nights(r)}</td>
      <td>${r.dinner==="Yes"?(r.dinnerTime||"Yes"):"—"}</td><td>${r.dietary||"—"}</td></tr>`).join("");
  v.appendChild(rt);
}

/* ============================================================ GUEST FEEDBACK & QR */
function feedbackURL(){ return location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"")+"/feedback.html"; }
function renderFeedback(v){
  v.appendChild(head("Guest Feedback & Review QR","Print the QR for rooms and checkout. Happy guests go to Google; unhappy guests reach you privately."));
  const url=feedbackURL();
  const grid=el("div","chart-row");
  const qp=el("div","quote-panel");
  qp.innerHTML=`<div class="sec-title" style="margin-top:0">Feedback QR — smart routing <span class="qs-sub">(recommended)</span></div>
    <p class="qs-sub" style="margin-bottom:8px">Happy guests → Google review · unhappy guests → private form to you.</p>
    <div id="qr-box" class="qr-box"></div>
    <p class="qs-sub" style="text-align:center;margin-top:10px">Scan to leave feedback</p>
    <div class="embed-box" style="margin-top:12px">${url}<button class="cp" id="fb-copy">Copy</button></div>
    <div class="dual-btn" style="margin-top:12px">
      <button class="btn" id="qr-print">Print poster</button>
      <button class="btn ghost" id="qr-download">Download QR</button>
    </div>
    <div class="sec-title">Direct Google review QR</div>
    <p class="qs-sub" style="margin-bottom:8px">Sends every guest straight to Google. Your official code &amp; link.</p>
    <div class="qr-box" style="max-width:180px;margin:0 auto"><img src="assets/hospro/google-review-qr.png" style="width:160px" alt="Google review QR"></div>
    <div class="embed-box" style="margin-top:10px">https://g.page/r/CWDf8Eg6xklPEBM/review<button class="cp" id="g-copy">Copy</button></div>`;
  grid.appendChild(qp);

  const list=(typeof FeedbackStore!=="undefined")?FeedbackStore.all():[];
  const ip=el("div","quote-panel");
  const avg = list.length? (list.reduce((s,f)=>s+(f.rating||0),0)/list.length).toFixed(1) : "—";
  ip.innerHTML=`<div class="sec-title" style="margin-top:0">Private feedback inbox ${list.length?`(${list.length})`:""}</div>
    ${list.length?`<p class="qs-sub">Average from this channel: <b>${avg} ★</b> · these guests rated below 4 and did NOT go to Google.</p>`:""}
    <div class="fb-list">${list.length? list.slice(0,30).map(f=>`
      <div class="fb-item">
        <div class="fb-top"><span class="fb-stars">${"★".repeat(f.rating||0)}${"☆".repeat(5-(f.rating||0))}</span>
          <span class="fb-date">${new Date(f.created).toLocaleDateString("en-GB")}</span></div>
        <div class="fb-text">${f.text||""}</div>
        ${(f.name||f.contact)?`<div class="fb-contact">${f.name||""}${f.contact?" · "+f.contact:""}</div>`:""}
      </div>`).join("") : `<div class="qs-sub" style="padding:14px 0">No private feedback yet. When a guest rates below 4 stars, their comments arrive here instead of going public.</div>`}</div>`;
  grid.appendChild(ip);
  v.appendChild(grid);

  const qrBox=$("#qr-box"); qrBox.innerHTML="";
  if(typeof QRCode!=="undefined"){
    new QRCode(qrBox,{ text:url, width:200, height:200, colorDark:"#1a2b3a", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.H });
  } else { qrBox.innerHTML=`<div class="qs-sub">QR library not loaded.</div>`; }

  $("#fb-copy").onclick=()=>{ navigator.clipboard?.writeText(url); $("#fb-copy").textContent="Copied"; };
  if($("#g-copy")) $("#g-copy").onclick=()=>{ navigator.clipboard?.writeText("https://g.page/r/CWDf8Eg6xklPEBM/review"); $("#g-copy").textContent="Copied"; };
  $("#qr-download").onclick=()=>{ const im=qrBox.querySelector("img")||qrBox.querySelector("canvas");
    if(im){ const src=im.src||im.toDataURL("image/png"); const a=document.createElement("a"); a.href=src; a.download="brandon-hall-review-qr.png"; a.click(); } };
  $("#qr-print").onclick=()=>printQRPoster(url, qrBox);
}
function printQRPoster(url, qrBox){
  const im=qrBox.querySelector("img")||qrBox.querySelector("canvas");
  const src=im? (im.src||im.toDataURL("image/png")) : "";
  const logo=location.href.split('#')[0].replace(/index\.html$/,'')+"assets/marketing/logos/logo-gold-transparent.png";
  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Review QR</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>@page{margin:0}body{margin:0;font-family:'Lato',sans-serif;text-align:center;
      background:linear-gradient(160deg,#1a2b3a,#0f1f30);color:#fff;min-height:297mm;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30mm}
    .logo{width:230px;margin-bottom:26px}
    .eyebrow{font-size:14px;letter-spacing:6px;color:#c9a978;font-weight:700}
    h1{font-family:'Cormorant Garamond',serif;font-size:56px;margin:14px 0 10px}
    p{font-size:19px;color:#dbe3ec;max-width:420px;line-height:1.5}
    .qr{background:#fff;padding:22px;border-radius:16px;margin:30px 0}
    .qr img{width:260px;height:260px;display:block}
    .scan{font-size:16px;color:#c9a978;font-weight:700;letter-spacing:1px}
    .foot{margin-top:26px;font-size:13px;color:#8ea0b3}</style></head><body>
    <img class="logo" src="${logo}" onerror="this.style.display='none'">
    <div class="eyebrow">YOUR STAY</div>
    <h1>How did we do?</h1>
    <p>We'd love to hear how your stay was. It only takes a moment — and it helps us be even better.</p>
    <div class="qr"><img src="${src}"></div>
    <div class="scan">SCAN TO SHARE YOUR FEEDBACK</div>
    <div class="foot">Brandon Hall Hotel and Spa · Main Street, Brandon, Coventry CV8 3FW</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  win.document.close();
}

/* ============================================================ AGREEMENTS / E-SIGNATURE */
function openAgreementDialog(e){
  const et=EVENT_TYPES.find(t=>t.id===e.event);
  const evDate=(/^\d{4}-\d{2}-\d{2}/.test(e.date||""))?e.date.slice(0,10):"";
  const body=`<p class="qs-sub">Generate a formal agreement with Brandon Hall's full terms and conditions. The client receives a secure link to read, sign and date. You then counter-sign to confirm the event.</p>
    <div class="manage-grid" style="margin-top:12px">
      <div class="full"><label>Client / organisation name</label><input id="ag-name" value="${(e.company||e.name||"").replace(/"/g,'&quot;')}"></div>
      <div class="full"><label>Client email (where the link is sent)</label><input id="ag-email" type="email" value="${e.email||""}"></div>
      <div><label>Event type</label><input id="ag-event" value="${et?et.label:(e.ratePlan||"Event")}"></div>
      <div><label>Event date</label><input id="ag-date" type="date" value="${evDate}"></div>
      <div><label>Total contracted amount (£)</label><input id="ag-value" type="number" value="${Math.round(e.value)||0}"></div>
      <div><label>Room / space</label><input id="ag-room" value="${(e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"").replace(/"/g,'&quot;')}"></div>
      <div><label>Guests / pax</label><input id="ag-pax" value="${e.pax||""}"></div>
      <div><label>Package</label><input id="ag-package" value="${(e.ratePlan||"").replace(/"/g,'&quot;')}"></div>
    </div>
    <div class="full" style="margin-top:8px"><label>Notes / special terms (optional)</label><textarea id="ag-notes" rows="2" placeholder="Any event-specific terms to add to the agreement"></textarea></div>
    <div class="dual-btn" style="margin-top:14px">
      <button class="btn" id="ag-create">Create &amp; get signing link</button>
      <button class="btn ghost" id="ag-preview">Preview agreement</button>
    </div>
    <div id="ag-result" style="margin-top:12px"></div>`;
  showModal("Generate agreement", `${e.name} · ${et?et.label:"Event"}`, body);

  const gather=()=>({
    enquiryId:e.id, client:$("#ag-name").value, clientEmail:$("#ag-email").value,
    eventType:$("#ag-event").value, eventDate:$("#ag-date").value,
    value:parseFloat($("#ag-value").value)||0, room:$("#ag-room").value,
    pax:$("#ag-pax").value, package:$("#ag-package").value, notes:$("#ag-notes").value,
    ref:e.ref||e.id, owner:SESSION?.name||""
  });

  $("#ag-preview").onclick=()=>{ contractHTML(gather(), null, true); };

  $("#ag-create").onclick=async()=>{
    const rec=gather();
    if(!rec.client){ alert("Please enter the client name."); return; }
    $("#ag-create").disabled=true; $("#ag-result").innerHTML=`<p class="qs-sub">Creating…</p>`;
    const id=await ContractStore.create(rec);
    const url=location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"")+"/sign.html?c="+id;
    const subject=`Your agreement — Brandon Hall Hotel and Spa`;
    const emailBody=`Dear ${rec.client.split(" ")[0]},\n\nThank you for confirming your ${rec.eventType} at Brandon Hall Hotel and Spa.\n\nPlease review and sign your agreement using the secure link below. It contains the full details and terms of your booking:\n\n${url}\n\nOnce you've signed, we'll counter-sign to confirm your event.\n\nKind regards,\n${rec.owner||"Events Team"}\nBrandon Hall Hotel and Spa`;
    const mailto=`mailto:${encodeURIComponent(rec.clientEmail)}?cc=${encodeURIComponent("events@brandonhallhotelandspa.com")}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    $("#ag-result").innerHTML=`<div class="embed-box" style="margin-bottom:8px">${url}<button class="cp" id="ag-copy">Copy</button></div>
      <div class="dual-btn"><a class="btn" href="${mailto}">✉ Email link to client</a>
      <button class="btn ghost" id="ag-open">Open signing page</button></div>
      <p class="qs-sub" style="margin-top:8px">✓ Agreement created. Send the link to your client — you'll be able to counter-sign once they've signed.</p>`;
    $("#ag-copy").onclick=()=>{ navigator.clipboard?.writeText(url); $("#ag-copy").textContent="Copied"; };
    $("#ag-open").onclick=()=>window.open(url,"_blank");
  };
}

/* Build the full contract HTML — used for preview (print) and as the sign-page body */
function contractHTML(c, signState, printIt){
  const money2=v=>"£"+(Math.round(v)||0).toLocaleString();
  const fmt=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):(d||"—");
  const terms=CONTRACT_TERMS.map(t=>`<div class="term"><b>${t.h}</b><p>${t.t}</p></div>`).join("");
  const html=`<div class="ct-doc">
    <div class="ct-head"><div class="ct-logo">BRANDON HALL</div><div class="ct-sub">HOTEL &amp; SPA</div></div>
    <h1>Event Agreement</h1>
    <p class="ct-intro">Dear ${(c.client||"Guest").split(" ")[0]}, thank you for confirming your event at Brandon Hall Hotel and Spa. Please read this agreement and sign to confirm your event. On the event sheet you will see the full breakdown of costings and when your final balance is due.</p>
    <table class="ct-details">
      <tr><td>Client / Organisation</td><td>${c.client||"—"}</td></tr>
      <tr><td>Event</td><td>${c.eventType||"—"}${c.package?" · "+c.package:""}</td></tr>
      <tr><td>Date</td><td>${fmt(c.eventDate)}</td></tr>
      <tr><td>Space</td><td>${c.room||"—"}</td></tr>
      <tr><td>Guests</td><td>${c.pax||"—"}</td></tr>
      <tr><td>Total contracted amount</td><td><b>${money2(c.value)}</b> (inc. VAT)</td></tr>
      <tr><td>Booking reference</td><td>${c.ref||"—"}</td></tr>
    </table>
    ${c.notes?`<div class="ct-notes"><b>Additional terms:</b> ${c.notes}</div>`:""}
    <h2>Terms &amp; Conditions</h2>
    <div class="ct-terms">${terms}</div>
    <div class="ct-sign">
      <h2>Signatures</h2>
      <div class="ct-sigrow">
        <div class="ct-sigbox">
          <div class="ct-sigline">${signState&&signState.clientSig?`<span class="ct-sigd">${signState.clientSig}</span>`:""}</div>
          <div class="ct-siglabel">Signed for and on behalf of the Client${signState&&signState.clientDate?` · ${fmt(signState.clientDate)}`:""}</div>
        </div>
        <div class="ct-sigbox">
          <div class="ct-sigline">${signState&&signState.hotelSig?`<span class="ct-sigd">${signState.hotelSig}</span>`:""}</div>
          <div class="ct-siglabel">Signed for and on behalf of Brandon Hall Hotel and Spa${signState&&signState.hotelDate?` · ${fmt(signState.hotelDate)}`:""}</div>
        </div>
      </div>
    </div>
  </div>`;
  if(printIt){
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Agreement — ${c.client||""}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
      <style>${CONTRACT_CSS}</style></head><body>${html}
      <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    win.document.close();
  }
  return html;
}
const CONTRACT_CSS=`@page{margin:18mm}body{font-family:'Lato',sans-serif;color:#2a3644;line-height:1.5;max-width:800px;margin:0 auto;padding:20px}
.ct-head{text-align:center;margin-bottom:8px}.ct-logo{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;letter-spacing:5px;color:#1a2b47}
.ct-sub{font-size:12px;letter-spacing:4px;color:#c9a978;font-weight:700}
h1{font-family:'Cormorant Garamond',serif;font-size:30px;text-align:center;color:#1a2b47;margin:18px 0}
h2{font-family:'Cormorant Garamond',serif;font-size:21px;color:#1a2b47;margin:24px 0 10px;border-bottom:2px solid #eef2f4;padding-bottom:5px}
.ct-intro{font-size:14px;margin-bottom:16px}
.ct-details{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px}
.ct-details td{padding:8px 10px;border-bottom:1px solid #eef2f4}.ct-details td:first-child{color:#7a8494;width:40%}
.ct-notes{background:#f6f8f9;border-radius:8px;padding:12px;font-size:13px;margin-top:10px}
.ct-terms{column-count:2;column-gap:22px;font-size:9px;line-height:1.5;margin-top:8px}
.term{break-inside:avoid;margin-bottom:9px}.term b{color:#1a2b47;font-size:9.5px;display:block}.term p{margin:2px 0 0}
.ct-sigrow{display:flex;gap:30px;margin-top:20px}.ct-sigbox{flex:1}
.ct-sigline{height:50px;border-bottom:2px solid #1a2b47;display:flex;align-items:flex-end;padding-bottom:4px}
.ct-sigd{font-family:'Cormorant Garamond',serif;font-size:26px;color:#1a2b47}
.ct-siglabel{font-size:11px;color:#7a8494;margin-top:6px}`;

/* ============================================================ CONTRACTS / AGREEMENTS (staff) */
function renderContracts(v){
  v.appendChild(head("Agreements","Event agreements sent for e-signature. Track status, counter-sign to confirm, and view signed contracts."));
  const list=(typeof ContractStore!=="undefined")?ContractStore.all():[];
  const fmt=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):(d||"—");

  // status counts
  const awaitingClient=list.filter(c=>!c.clientSig).length;
  const awaitingHotel=list.filter(c=>c.clientSig && !c.hotelSig).length;
  const complete=list.filter(c=>c.clientSig && c.hotelSig).length;

  const stats=el("div","stat-cards");
  stats.innerHTML=`
    <div class="stat-card"><div class="sc-v">${list.length}</div><div class="sc-k">Total agreements</div></div>
    <div class="stat-card"><div class="sc-v">${awaitingClient}</div><div class="sc-k">Awaiting client signature</div></div>
    <div class="stat-card" style="${awaitingHotel?'border-left:3px solid #e0a030':''}"><div class="sc-v" style="${awaitingHotel?'color:#c07a3e':''}">${awaitingHotel}</div><div class="sc-k">Ready to counter-sign</div></div>
    <div class="stat-card"><div class="sc-v" style="color:#4a9d6a">${complete}</div><div class="sc-k">Fully signed</div></div>`;
  v.appendChild(stats);

  if(!list.length){
    const empty=el("div","quote-panel");
    empty.innerHTML=`<p class="qs-sub">No agreements yet. Open an enquiry in the Sales Pipeline and use "Generate agreement &amp; send for e-signature" to create one.</p>`;
    v.appendChild(empty); return;
  }

  const panel=el("div","quote-panel");
  panel.innerHTML=`<div class="tbl-scroll"><table class="ct-table">
    <tr><th>Client</th><th>Event</th><th>Date</th><th>Value</th><th>Status</th><th></th></tr>
    ${list.map(c=>{
      const st = (c.clientSig&&c.hotelSig)?["Fully signed","#4a9d6a"]:
                 (c.clientSig)?["Client signed — counter-sign","#c07a3e"]:
                 ["Awaiting client","#7a8494"];
      return `<tr data-id="${c.id}" class="ct-row">
        <td><b>${c.client||"—"}</b></td>
        <td>${c.eventType||"—"}</td>
        <td>${fmt(c.eventDate)}</td>
        <td>${c.value?money(Math.round(c.value)):"—"}</td>
        <td><span class="ct-pill" style="background:${st[1]}22;color:${st[1]}">${st[0]}</span></td>
        <td><button class="mini-btn ct-open" data-id="${c.id}">Open</button></td>
      </tr>`;
    }).join("")}
  </table></div>`;
  v.appendChild(panel);
  panel.querySelectorAll(".ct-open").forEach(b=>b.onclick=()=>openContractDetail(list.find(c=>c.id===b.dataset.id)));
}

function openContractDetail(c){
  const fmt=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):(d||"—");
  const url=location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"")+"/sign.html?c="+c.id;
  const clientSigned=!!c.clientSig, hotelSigned=!!c.hotelSig;
  const body=`<div class="detail-row">
      <div class="stat"><div class="k">Event</div><div class="v" style="font-size:15px">${c.eventType||"—"}</div></div>
      <div class="stat"><div class="k">Date</div><div class="v" style="font-size:15px">${fmt(c.eventDate)}</div></div>
      <div class="stat"><div class="k">Value</div><div class="v">${c.value?money(Math.round(c.value)):"—"}</div></div>
    </div>
    <div class="sec-title">Signature status</div>
    <div class="sig-status">
      <div class="ss-row ${clientSigned?"done":""}"><span>${clientSigned?"✓":"○"} Client</span>
        <span>${clientSigned?`${c.clientSig} · ${fmt(c.clientDate)}`:"Awaiting signature"}</span></div>
      <div class="ss-row ${hotelSigned?"done":""}"><span>${hotelSigned?"✓":"○"} Brandon Hall</span>
        <span>${hotelSigned?`${c.hotelSig} · ${fmt(c.hotelDate)}`:(clientSigned?"Ready to counter-sign":"Awaiting client first")}</span></div>
    </div>
    ${!clientSigned?`<div class="embed-box" style="margin-top:12px">${url}<button class="cp" id="ct-copy">Copy link</button></div>
      <p class="qs-sub" style="margin-top:6px">Send this link to the client to sign.</p>`:""}
    ${clientSigned && !hotelSigned?`
      <div class="sec-title">Counter-sign to confirm the event</div>
      <div class="manage-grid">
        <div><label>Your name</label><input id="ct-hname" class="ct-sigin" value="${SESSION?.name||""}"></div>
        <div><label>Date</label><input id="ct-hdate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <button class="btn" id="ct-sign" style="margin-top:10px">✓ Counter-sign &amp; confirm event</button>`:""}
    <div class="dual-btn" style="margin-top:14px">
      <button class="btn ghost" id="ct-view">View / print agreement</button>
      ${clientSigned?`<a class="btn ghost" href="${url}" target="_blank">Open signed page</a>`:""}
    </div>
    <div class="qs-sub" style="margin-top:12px">Ref ${c.ref||c.id}</div>`;
  showModal(`Agreement — ${c.client}`, c.eventType||"Event", body);

  if($("#ct-copy")) $("#ct-copy").onclick=()=>{ navigator.clipboard?.writeText(url); $("#ct-copy").textContent="Copied"; };
  if($("#ct-view")) $("#ct-view").onclick=()=>contractHTML(c,{clientSig:c.clientSig,clientDate:c.clientDate,hotelSig:c.hotelSig,hotelDate:c.hotelDate},true);
  if($("#ct-sign")) $("#ct-sign").onclick=async()=>{
    const name=$("#ct-hname").value.trim(), date=$("#ct-hdate").value;
    if(!name){ alert("Please enter your name."); return; }
    $("#ct-sign").disabled=true;
    await ContractStore.sign(c.id,{ hotelSig:name, hotelDate:date, hotelSignedAt:new Date().toISOString(), status:"complete" });
    // also mark the enquiry confirmed if linked
    if(c.enquiryId){ try{ DB.update(c.enquiryId,{ status:"confirmed" }); }catch(e){} }
    closeModal(); render();
  };
}

/* ============================================================ HELPERS */

function head(title,sub){ const h=el("div","page-head"); h.innerHTML=`<h2>${title}</h2>${sub?`<p>${sub}</p>`:""}`; return h; }
function showModal(title,sub,bodyHTML){
  const root=$("#modal-root");
  root.innerHTML=`<div class="modal-bg"><div class="modal">
    <div class="modal-head"><div><h3>${title}</h3><div class="qs-sub">${sub||""}</div></div>
    <button class="close">×</button></div>
    <div class="modal-body">${bodyHTML}</div></div></div>`;
  root.querySelector(".close").onclick=closeModal;
  root.querySelector(".modal-bg").onclick=e=>{ if(e.target.classList.contains("modal-bg"))closeModal(); };
}
function closeModal(){ $("#modal-root").innerHTML=""; }

/* ============================================================ PUBLIC CHAT PAGE
   The shareable link (#events-chat) opens the concierge WITHOUT login,
   so customers can use it straight from the hotel website. */
function openPublicChat(){
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  document.querySelector(".topbar").style.display="none";
  document.querySelector("nav.tabs").style.display="none";
  const v=$("#view"); v.innerHTML="";
  v.style.maxWidth="480px";
  const wrap=el("div"); wrap.style.cssText="padding-top:10px";
  wrap.innerHTML=`<div style="text-align:center;margin-bottom:14px">
    <img src="assets/bh-logo.svg" style="width:90px" alt="Brandon Hall"></div>`;
  const frame=el("div","chat-frame"); frame.id="chat-frame"; frame.style.margin="0 auto";
  wrap.appendChild(frame); v.appendChild(wrap);
  startBot(frame);
}
if(location.hash==="#events-chat"){ window.addEventListener("DOMContentLoaded",openPublicChat); openPublicChat(); }
if(location.hash==="#precheckin-form"){ window.addEventListener("DOMContentLoaded",openPrecheckinForm); openPrecheckinForm(); }
