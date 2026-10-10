/* ============================================================
   BRANDON HALL SALES PORTAL — app logic
   Runs in DEMO MODE (localStorage) until Firebase is wired up.
   To enable Firebase: fill firebase-config.js, uncomment the
   Firebase SDK block in index.html, and set USE_FIREBASE=true.
   ============================================================ */
const USE_FIREBASE = false;

const USERS = {
  "ajay.kawa":        { name:"Ajay Kawa",         code:"BHAK", role:"admin", tier:"admin",  title:"Director" },
  "raj.kumar":        { name:"Raj Kumar",          code:"BHRK", role:"admin", tier:"admin",  title:"Property Director" },
  "alia.taub":        { name:"Alia Taub",          code:"BHAT", role:"admin", tier:"admin",  title:"Director" },
  "nicola.cartwright":{ name:"Nicola Cartwright",  code:"BHNC", role:"admin", tier:"admin",  title:"Events Manager" },
  "natalie.freeman":  { name:"Natalie Freeman",    code:"BHNF", role:"admin", tier:"admin",  title:"Event Executive" },
  "veronica.webb":    { name:"Veronica Webb",      code:"BHVW", role:"admin", tier:"admin",  title:"Finance Assistant" },
  "glenn.randell":    { name:"Glenn Randell",      code:"BHGR", role:"admin", tier:"admin",  title:"Maintenance Manager" },
  "patrik.vlach":     { name:"Patrik Vlach",       code:"BHPV", role:"person",tier:"person", title:"Front Office Manager" },
  "pete":             { name:"Pete",               code:"BHPE", role:"person",tier:"person", title:"Multi-trader (electrical)" },
  "herman.charles":   { name:"Herman Charles",     code:"BHHC", role:"person",tier:"person", title:"Multi-trader" },
  "ruth.addison":     { name:"Ruth Addison",       code:"BHRA", role:"person",tier:"person", title:"Head of Housekeeping" },
  "jomy.joy":         { name:"Jomy Joy",           code:"BHJJ", role:"person",tier:"person", title:"Bar Manager" },
};
const ADMIN_IDS=["ajay.kawa","raj.kumar","alia.taub","nicola.cartwright","natalie.freeman","veronica.webb","glenn.randell"];
const NOTIFY_ON_COMPLETE=["raj.kumar","ajay.kawa","alia.taub","glenn.randell"];

const LAYOUT_LABELS = { boardroom:"Boardroom", ushape:"U-Shape",
  theatre:"Theatre", cabaret:"Cabaret", reception:"Reception" };

const $  = s => document.querySelector(s);
const el = (t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const money = n => "£"+Number(n).toLocaleString("en-GB",{minimumFractionDigits:0,maximumFractionDigits:2});
const money2dp = n => "£"+Number(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});

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
    // one-off: clear the old demo enquiries that were seeded on this computer
    if(localStorage.getItem("bh_seeded_v2") && !localStorage.getItem("bh_demo_cleared")){
      this.save(this.all().filter(e=>!(e.notes||"").includes("[demo]") && !["Dairy Carbon Network","Andre Brissett","Dominic Hillyard","Rebekah Stretton","Samantha Courtnell"].includes(e.name) && !e._seed));
      localStorage.setItem("bh_demo_cleared","1"); }
    if(localStorage.getItem("bh_seeded_v2"))return;
    const samples=(typeof SEED_SAMPLES!=="undefined")?SEED_SAMPLES:[];
    samples.forEach(s=>{ const item=Object.assign({},s); item.id="ENQ-"+Math.random().toString(36).slice(2,8).toUpperCase();
      item.created=new Date(Date.now()-Math.random()*20*864e5).toISOString(); l.push(item); });
    this.save(l); localStorage.setItem("bh_seeded_v2","1");
  }
};

let SESSION=null, CURRENT_TAB="home";

/* ACCESS — open to all authenticated staff */
localStorage.setItem('bh_hospro_approved','1');


/* ============================================================ AUTH */
$("#lg-btn").onclick = async ()=>{
  const uRaw=$("#lg-user").value.trim().toLowerCase();
  const pw=$("#lg-pw")?.value.trim().toUpperCase() || $("#lg-pass")?.value.trim().toUpperCase() || "";
  const err=$("#lg-err"); err.textContent="";
  if(!uRaw){ err.textContent="Please enter your username."; return; }
  const user=USERS[uRaw];
  if(!user){ err.textContent="Username not recognised. Please check and try again."; return; }
  if(pw && user.code && pw!==user.code){ err.textContent="Incorrect password. Please try again."; return; }
  const u=uRaw;

  const btn=$("#lg-btn"); btn.disabled=true; const label=btn.textContent; btn.textContent="Signing in…";
  // Try Firebase first; fall back to demo (local) auth
  if(FB.ready){
    const r=await fbSignIn(u, pw);
    if(r.ok){ SESSION=user; SESSION._key=u; enterApp(user); btn.disabled=false; btn.textContent=label; return; }
    // Users added to the portal after firebase-store.js was written (e.g. Veronica, Natalie) aren't in its
    // FB_LOGINS list, so sign them in to Firebase directly: <username>@brandonhall.portal, password = initials + 2026
    if(!r.demo && /unknown user|not set up|README/i.test(r.error||"") && window.firebase && firebase.auth){
      const email=u+"@brandonhall.portal", tries=[String(user.code||"").replace(/^BH/i,"")+"2026", pw];
      let lastErr="";
      for(const p of tries){
        try{ const auth=(FB&&FB.auth)||(firebase.apps.length?firebase.app().auth():firebase.auth());
          const cred=await auth.signInWithEmailAndPassword(email,p);
          if(cred && cred.user){ try{ FB.user=cred.user; }catch(e){} SESSION=user; SESSION._key=u; enterApp(user); btn.disabled=false; btn.textContent=label; return; } }
        catch(e){ lastErr=(e&&(e.code||e.message))||String(e); console.warn("Direct Firebase sign-in failed:",lastErr); if(e && e.code==="auth/user-not-found"){ break; } }
      }
      err.textContent = /invalid-credential|wrong-password/.test(lastErr) ? "Firebase password doesn't match for "+email+" — set it to "+tries[0]+" in Authentication → Users ("+lastErr+")."
        : /user-not-found/.test(lastErr) ? "This login isn't set up in Firebase yet — add "+email+" under Authentication → Users."
        : "Sign-in failed ("+(lastErr||r.error||"unknown")+").";
      btn.disabled=false; btn.textContent=label; return;
    }
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
  const rl=$("#tb-role"); if(rl && user.title) rl.textContent=user.title;
  const av=$("#sf-avatar"); if(av) av.textContent=(user.name||"").split(" ").map(w=>w[0]).join("").slice(0,2);
  const badge=$("#tb-mode"); if(badge) badge.textContent = FB.ready? "Live" : "Demo";
  boot();
}
$("#lg-pw").addEventListener("keydown",e=>{ if(e.key==="Enter")$("#lg-btn").click(); });
$("#tb-logout").onclick=async ()=>{ if(typeof hrLock==='function') hrLock(true); await fbSignOut(); SESSION=null; $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden"); $("#lg-pw").value=""; };

/* ============================================================ ROUTING */
/* DB facade: Firebase when live, localStorage in demo mode */
const DB = {
  live(){ return FB.ready && FB.user; },
  all(){ return this.live()? FBStore.all() : Store.all(); },
  async add(e){ return this.live()? FBStore.add(e) : Store.add(e); },
  async update(id,patch){ return this.live()? FBStore.update(id,patch) : Store.update(id,patch); }
};

const SEED_SAMPLES=[];   // earlier sample enquiries removed 8 Oct 2026 — the pipeline now comes from the Rezlynx report (bob-data.js)


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
  if(DB.live()){
    // one-off: remove the five earlier sample enquiries now the Rezlynx report is the master
    setTimeout(async()=>{ try{
      const old=["Dairy Carbon Network","Andre Brissett","Dominic Hillyard","Rebekah Stretton","Samantha Courtnell"];
      for(const e of DB.all()){ if(old.includes(e.name) && !e.ref && e.id) await FB.db.collection("enquiries").doc(e.id).delete(); }
    }catch(err){ console.warn("Sample cleanup skipped",err); } }, 4000);
    setTimeout(async()=>{ try{ await fbtApplyImports(); }catch(e){} try{ await fbtImportSubmissions(true); }catch(e){} hpPublishSummary(true); }, 6000);
  }
}
/* ── HosPRO Pocket (mobile.html): a high-level summary published to hospro_public/summary.
   Totals only — no guest contact details, pay or staff personal data. Refreshed when the
   portal opens and after F&B entries, at most every 10 minutes unless forced. ── */
async function hpPublishSummary(force){
  try{
    if(!(typeof FB!=="undefined" && FB.ready && FB.user && FB.db)){ if(force==="loud") toast("Sign in live first, then try again"); return false; }
    const last=+localStorage.getItem("hp_sum_pub")||0;
    if(!force && Date.now()-last<10*60000) return;
    const today=spDK(new Date()), wk=new Date(); wk.setDate(wk.getDate()-7); const wkK=spDK(wk);
    const pipe=pipelineData();
    const open=pipe.filter(e=>["enquiry","provisional"].includes(e.status));
    const sum={ updated:new Date().toISOString(), by:(SESSION&&SESSION.name)||"",
      pipeline:{ open:open.length, openValue:Math.round(open.reduce((t,e)=>t+(+e.value||0),0)),
        confirmedFuture:pipe.filter(e=>e.status==="confirmed"&&(e.date||"")>=today).length,
        confirmedFutureValue:Math.round(pipe.filter(e=>e.status==="confirmed"&&(e.date||"")>=today).reduce((t,e)=>t+(+e.value||0),0)),
        newThisWeek:pipe.filter(e=>(typeof enqDate==="function"?enqDate(e):"")>=wkK).length,
        overdue:pipe.filter(e=>e.followUp&&e.followUp<today&&["enquiry","provisional"].includes(e.status)).length } };
    // Enquiry list for Pocket (tap for details). Business details only — no email addresses or phone numbers.
    const enqList=pipe.filter(e=>e._kind==="enquiry" || ["enquiry","provisional"].includes(e.status))
      .filter(e=>e.status!=="cancelled" && (["enquiry","provisional"].includes(e.status) || (e.date||"")>=today))
      .map(e=>({ id:String(e.id||e.ref||""), name:e.name||"", company:e.company||e.co||"", eventType:e.eventType||e.event||e.fnType||"",
        date:e.date||"", departure:e.departure||"", pax:+e.pax||0, value:Math.round(+e.value||0), status:e.status||"enquiry",
        owner:e.owner||"", followUp:e.followUp||"", source:e.source||"", roomName:e.roomName||"", ref:e.ref||"",
        created:(typeof enqDate==="function"?enqDate(e):"")||"", stage:e.stage||e.dealStage||"", rooms:+e.rooms||0, nights:+e.nights||0 }))
      .sort((a,b)=>(a.date||"9").localeCompare(b.date||"9")).slice(0,150);
    sum.enquiries=enqList;
    // Rooms forecast (from the rota forecast) for occupancy: 3 weeks back to 5 weeks ahead
    try{ const fc=typeof spGetFC==="function"?spGetFC():{}; const a=new Date(); a.setDate(a.getDate()-21); const b=new Date(); b.setDate(b.getDate()+35);
      const out={}; Object.keys(fc).filter(k=>k>=spDK(a)&&k<=spDK(b)).forEach(k=>{ const f=fc[k]||{}; out[k]={rooms:+f.rooms||0,arrivals:+f.arrivals||0,departures:+f.departures||0,stayovers:+f.stayovers||0,breakfastCovers:+f.breakfastCovers||0,dinnerCovers:+f.dinnerCovers||0,revenue:+f.roomRevenue||+f.revenue||0}; });
      sum.fc=out; sum.bedrooms=120; }catch(e){}
    const comp=typeof ALL_COMP_TASKS!=="undefined"?ALL_COMP_TASKS:[], now=new Date();
    sum.compliance={ overdue:comp.filter(t=>t.status!=="done"&&new Date(t.dueDate)<now).length,
      dueSoon:comp.filter(t=>{const d=new Date(t.dueDate);return t.status!=="done"&&d>=now&&d<new Date(now.getTime()+7*864e5);}).length, total:comp.length };
    // F&B month to date
    if(typeof fbtLoad==="function"){
      const y=new Date(); y.setDate(y.getDate()-1);
      if(CURRENT_TAB!=="fbTracker" || !FBT.data) await fbtLoad(fbtMonthKey(y));
      const C=fbtCalc(); const yr=C.rows.find(r=>r.d===spDK(y));
      const pick=o=>({sales:Math.round(o.sales),cost:Math.round(o.cos),gp:isFinite(o.gp)?Math.round(o.gp*10)/10:null,target:o.target,headroom:Math.round(o.headroom),remain:Math.round(o.remainBudget),perDay:Math.round(o.perDay),left:o.left});
      // per-line month to date (breakfast, dinner, bar…)
      const lineTot={}; Object.values((FBT.data&&FBT.data.sales)||{}).forEach(day=>Object.entries(day||{}).forEach(([lid,l])=>{ const t=lineTot[lid]=lineTot[lid]||{food:0,bev:0,covers:0}; t.food+=fbtN(l.food); t.bev+=fbtN(l.bev); t.covers+=fbtN(l.covers); }));
      const nameOf=id=>((FBT.settings&&FBT.settings.lines||[]).find(l=>l.id===id)||{}).name||id;
      sum.fb={ month:FBT.month, food:pick(C.food), bev:pick(C.bev), covers:C.covers, daysIn:C.daysIn, lastEntry:C.lastSales||null,
        purchFood:Math.round(C.food.purch), purchBev:Math.round(C.bev.purch), invoices:(C.inv||[]).length,
        days:C.rows.filter(r=>r.hasSales||r.pf||r.pb).map(r=>({d:r.d,food:Math.round(r.food),bev:Math.round(r.bev),covers:r.covers,pf:Math.round(r.pf),pb:Math.round(r.pb)})),
        lines:Object.entries(lineTot).map(([id,t])=>({id,name:nameOf(id),food:Math.round(t.food),bev:Math.round(t.bev),covers:t.covers})).sort((a,b)=>(b.food+b.bev)-(a.food+a.bev)),
        yesterday: yr&&yr.hasSales?{date:yr.d,food:Math.round(yr.food),bev:Math.round(yr.bev),covers:yr.covers}:null };
      // If nothing is entered yet this month, fall back to the last month that has figures
      if(!C.daysIn && CURRENT_TAB!=="fbTracker"){ const pm=new Date(y.getFullYear(),y.getMonth()-1,15); await fbtLoad(fbtMonthKey(pm)); const P=fbtCalc();
        if(P.daysIn){ sum.fbPrev={ month:FBT.month, food:pick(P.food), bev:pick(P.bev), covers:P.covers, daysIn:P.daysIn, lastEntry:P.lastSales,
          days:P.rows.filter(r=>r.hasSales).map(r=>({d:r.d,food:Math.round(r.food),bev:Math.round(r.bev),covers:r.covers,pf:Math.round(r.pf),pb:Math.round(r.pb)})) }; }
        await fbtLoad(fbtMonthKey(y)); }
    }
    if(typeof FBT!=="undefined" && FBT.settings && FBT.settings.lines) sum.fbLines=FBT.settings.lines.map(l=>({id:l.id,name:l.name,outlet:l.outlet||""}));
    // Firestore refuses undefined values; JSON round-trip strips them (and turns NaN into null)
    const clean=JSON.parse(JSON.stringify(sum));
    await FB.db.collection("hospro_public").doc("summary").set(clean);
    localStorage.setItem("hp_sum_pub", String(Date.now()));
    if(force==="loud") toast("✓ HosPRO Pocket updated — refresh the app on your phone",4000);
    return true;
  }catch(e){ console.warn("Pocket summary not published", e); toast("HosPRO Pocket not updated: "+((e&&(e.code||e.message))||"error"),7000); return false; }
}
function buildSidebar(){ /* sidebar removed */ }

function sfToggleGroup(grpId){
  const el=document.getElementById(grpId);
  const arrow=document.getElementById(grpId+'-arrow');
  if(!el) return;
  const collapsed=el.style.maxHeight==='0px';
  el.style.maxHeight=collapsed?'500px':'0px';
  if(arrow) arrow.style.transform=collapsed?'':'rotate(-90deg)';
}

function syncSidebar(){
  document.querySelectorAll("#sf-nav [data-go]").forEach(b=>{
    const isActive=b.dataset.go===CURRENT_TAB;
    b.style.background=isActive?'rgba(199,138,59,.25)':'';
    b.style.color=isActive?'#c78a3b':'';
  });
}
function syncSidebar(){
  document.querySelectorAll("#sf-nav [data-go]").forEach(b=>
    b.classList.toggle("active", b.dataset.go===CURRENT_TAB));
}
/* ── FixRay mode ──────────────────────────────────────────────────────────
   Maintenance and compliance now run in FixRay. While true, the old HosFIX
   job / compliance data is hidden and these screens show a FixRay placeholder
   until the weekly FixRay CSV import is built. Set to false to bring the old
   HosFIX screens back — nothing has been deleted. */
const HP_FIXRAY_MODE = false;   // FixRay not used — HosFIX / HosCOM are back in use
const HP_FIXRAY_URL  = 'https://fixray.app';
const HP_FIXRAY_HIDDEN_TABS = new Set(["fixDash","fixAllJobs","fixProjects","fixInventory","fixTeam","compDash","compTasks","compActions","compReport"]);
function hpFixrayCard(title, text, compact){
  return `<div style="background:#fff;border-radius:14px;padding:${compact?'16px':'28px'};${compact?'':'max-width:720px;margin:10px auto;'}box-shadow:0 2px 10px rgba(0,0,0,.08);border-left:5px solid #4DA69C;font-family:Lato,sans-serif">
    <div style="font-family:'Cormorant Garamond',serif;font-size:${compact?'20px':'26px'};font-weight:700;color:#1a2b3a;margin-bottom:6px">${title}</div>
    <div style="font-size:13.5px;color:#374151;line-height:1.6;margin-bottom:14px">${text}</div>
    <a href="${HP_FIXRAY_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 18px;background:#3A8A81;color:#fff;border-radius:10px;font:800 13px Lato,sans-serif;text-decoration:none">📱 Open HosFIX app ↗</a>
  </div>`;
}
function hpRenderFixrayPlaceholder(v, tab){
  const comp=/^comp/.test(tab);
  v.innerHTML=hpFixrayCard(hpTabLabel(tab),
    (comp
      ? "Scheduled checks and compliance tasks are now managed in <b>FixRay</b>, including the Saeker schedule."
      : "Maintenance jobs are now logged and managed in <b>FixRay</b>.")+
    " This page will show the figures from FixRay's weekly export once the first import is set up.");
}

/* ── Tab registry (single source of truth for the router) ── */
const RENDER_MAP = {home:renderHome, rooms:renderRooms, dining:renderDining, beverage:renderBeverage, pipeline:renderPipeline, corprates:renderCorpRates, groupconfig:renderGroupConfig, packages:renderPackages, suppliers:renderSuppliers, precheckin:renderPreCheckin, quotes:renderQuotes, brochure:renderBrochure, menu:renderMenu, quote:renderQuote,
    profit:renderProfit, chat:renderChat, mne:renderMnE, marketing:renderMarketing, social:renderSocial, menu:renderMenuBuilder, brochure:renderBrochureBuilder, tasks:renderTasks, insight:renderInsight, precheckin:renderPrecheckinSetup, corpdb:renderCorpDb, feedback:renderFeedback, contracts:renderContracts, payments:renderPayments, quotes:renderQuotesList, admin:renderAdmin,
    compDash:renderCompDash, compTasks:renderCompTasks, compActions:renderCompActions, compReport:renderCompReport,
    fixDash:renderFixDash, fixAllJobs:renderFixAllJobs, fixProjects:renderFixProjects, fixInventory:renderFixInventory, fixTeam:renderFixTeam,
    rotaDash:renderRotaDash, rotaWeek:renderRotaWeek, rotaForecast:renderRotaForecast, rotaMonthly:renderRotaMonthly, rotaSettings:renderRotaSettings, rotaPayroll:renderRotaPayroll, localEvents:renderLocalEvents, fbTracker:renderFBTracker,
    staffDash:renderStaffDash, staffProfiles:renderStaffProfiles, staffLeave:renderStaffLeave, staffLeaveAdmin:renderStaffLeaveAdmin, staffDocs:renderStaffDocs,
    brandDocs:renderBrandDocs, brandLogos:renderBrandLogos, brandCollateral:renderBrandCollateral, brandPhotography:renderBrandPhotography,
    hubDocs:renderHubDocs, hubContracts:renderHubContracts, hubSuppliers:renderHubSuppliers, hubFinance:renderHubFinance, hubHR:renderHubHR,
    revDash:renderRevDash, revCalendar:renderRevCalendar, revCompset:renderRevCompset, revEvents:renderRevEvents, revForecast:renderRevForecast, revImport:renderRevImport, revSettings:renderRevSettings
  };

/* Tabs whose render functions were designed for the dark navy canvas
   (light text, translucent buttons). Every other tab renders on a light
   surface panel so dark text designed for white pages stays readable. */
const HP_DARK_TABS = new Set([
  "brandLogos","brandCollateral","brandPhotography","brandDocs",
  "rotaDash","rotaWeek","rotaForecast","rotaMonthly","rotaSettings","rotaPayroll",
  "staffDash","staffProfiles","staffLeave","staffLeaveAdmin","staffDocs",
  "hubDocs","hubContracts","hubSuppliers","hubFinance","hubHR"
]);

function hpModuleFor(tab){
  const mods = typeof FLOW_MODULES!=="undefined" ? FLOW_MODULES : [];
  return mods.find(m=>(m.tabs||[]).includes(tab)) || null;
}
function hpTabLabel(tab){
  const meta = (typeof TAB_META!=="undefined" && TAB_META[tab]) || null;
  if(meta) return meta.label;
  for(const k in (typeof MODULE_SUBCARDS!=="undefined"?MODULE_SUBCARDS:{})){
    const sc = MODULE_SUBCARDS[k].find(x=>x.tab===tab); if(sc) return sc.label;
  }
  return tab;
}
/* Breadcrumb / module bar: ← Back to module · Home › Module › Tab */
function hpSetSubnav(mod, tab){
  const sn=document.getElementById("sf-subnav"); if(!sn) return;
  let items=(mod && mod.id && typeof MODULE_SUBCARDS!=="undefined" && MODULE_SUBCARDS[mod.id]) || [];
  const fixray = HP_FIXRAY_MODE && mod && (mod.id==="hosfix"||mod.id==="hoscom");
  if(fixray) items=items.filter(sc=>!HP_FIXRAY_HIDDEN_TABS.has(sc.tab));
  if(!items.length && !fixray){ sn.style.display="none"; sn.innerHTML=""; return; }
  sn.style.display="flex";
  sn.style.setProperty("--mod", mod.colour||"#2B726A");
  sn.style.setProperty("--tint", mod.tint||"#E2F1EE");
  sn.innerHTML=items.map(sc=>{ const ok=hpCanTab(sc.tab); return `<button type="button" class="sf-sn${sc.tab===tab?' on':''}" data-tab="${sc.tab}" data-locked="${ok?'':'1'}" title="${ok?sc.label:sc.label+' — restricted'}" style="${ok?'':'opacity:.45;cursor:not-allowed'}">
      <span class="sf-sn-i">${ok?(sc.icon||""):"🔒"}</span><span class="sf-sn-t">${sc.short||sc.label}</span></button>`; }).join("");
  if(fixray) sn.innerHTML+=`<a class="sf-sn" href="${HP_FIXRAY_URL}" target="_blank" rel="noopener" style="text-decoration:none"><span class="sf-sn-i">🔧</span><span class="sf-sn-t">📱 Open HosFIX app ↗</span></a>`;
  sn.querySelectorAll("button.sf-sn").forEach(b=>b.onclick=()=>{ if(b.dataset.locked){ toast('🔒 '+b.title); return; } switchTab(b.dataset.tab); });
  const on=sn.querySelector(".sf-sn.on"); if(on && on.scrollIntoView) try{ on.scrollIntoView({block:"nearest",inline:"nearest"}); }catch(e){}
}
function hpSetBreadcrumb(mod, tab){
  const bc=document.getElementById("sf-breadcrumb"); if(!bc) return;
  hpSetSubnav(mod, tab);
  if(!mod){ bc.style.display="none"; return; }
  bc.style.display="flex";
  const back=document.getElementById("sf-bc-back");
  const lab=document.getElementById("sf-bc-module");
  const tb=document.getElementById("sf-bc-tab");
  if(lab){ lab.textContent=mod.name; lab.onclick=()=>renderModuleLanding(mod.id); lab.style.cursor=tab?"pointer":"default"; }
  if(tb) tb.textContent = tab ? hpTabLabel(tab) : "";
  if(back){
    if(tab){ back.style.display=""; back.innerHTML="← "+mod.name; back.title="Back to "+mod.name+" menu";
      back.onclick=()=>renderModuleLanding(mod.id); }
    else { back.style.display=""; back.innerHTML="← Home"; back.title="Back to home"; back.onclick=()=>switchTab("home"); }
  }
}
function hpRenderError(v, tab, err){
  console.error("[HosPRO] render failed for tab '"+tab+"':", err);
  const box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:14px;padding:28px;max-width:640px;margin:20px auto;box-shadow:0 2px 10px rgba(0,0,0,.08);border-left:4px solid #c45c00;font-family:Lato,sans-serif";
  box.innerHTML=`<div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#1a2b3a;margin-bottom:6px">This screen couldn't load</div>
    <div style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:14px">Something went wrong while opening <b>${hpTabLabel(tab)}</b>. The rest of HosPRO is unaffected — please go back and try again, or let the HosPRO team know.</div>
    <pre style="font-size:11px;background:#f5f7f9;color:#991b1b;padding:10px 12px;border-radius:8px;white-space:pre-wrap;margin-bottom:14px">${String(err&&err.message||err).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</pre>`;
  const btn=document.createElement("button");
  const mod=hpModuleFor(tab);
  btn.textContent = mod ? "← Back to "+mod.name : "← Back to Home";
  btn.style.cssText="padding:9px 18px;background:#1a2b3a;color:#fff;border:none;border-radius:8px;font:700 13px Lato,sans-serif;cursor:pointer";
  btn.onclick=()=> mod ? renderModuleLanding(mod.id) : switchTab("home");
  box.appendChild(btn);
  v.appendChild(box);
}

let HP_NAV_FROM_HISTORY=false;
function hpPushHistory(){
  if(HP_NAV_FROM_HISTORY) return;
  try{ const h="#"+CURRENT_TAB; if(location.hash!==h) history.pushState({tab:CURRENT_TAB},"",h); }catch(e){}
}
window.addEventListener("popstate",e=>{
  if(!SESSION) return;
  const t=(e.state&&e.state.tab)||(location.hash||"#home").slice(1)||"home";
  HP_NAV_FROM_HISTORY=true;
  try{ if(t.indexOf("mod:")===0) renderModuleLanding(t.slice(4)); else { CURRENT_TAB=t; render(); } }
  finally{ HP_NAV_FROM_HISTORY=false; }
});

function render(){
  const v=$("#view");
  v.innerHTML="";
  v.removeAttribute("style");          // clear inline padding left behind by home/landing screens
  v.classList.remove("hp-surface","hp-dark","hp-canvas");
  if(window.scrollY) window.scrollTo(0,0);     // keep the page itself pinned (only .sf-main scrolls)
  { const ap=document.getElementById("app"); if(ap && ap.scrollTop) ap.scrollTop=0; }

  // Module landing pages are routed as "mod:<id>"
  // Restricted modules (e.g. HosPEOPLE: payroll and HR) — block both the landing page and every tab in it
  { const rid=String(CURRENT_TAB).indexOf("mod:")===0 ? CURRENT_TAB.slice(4) : (hpModuleFor(CURRENT_TAB)||{}).id;
    if((rid && !hpCanAccess(rid)) || (String(CURRENT_TAB).indexOf("mod:")!==0 && !hpCanTab(CURRENT_TAB))){ CURRENT_TAB="home"; toast('🔒 That area is restricted. Ask Raj or Ajay if you need access.'); }
  }
  if(String(CURRENT_TAB).indexOf("mod:")===0){ renderModuleLanding(CURRENT_TAB.slice(4)); return; }

  const fn = RENDER_MAP[CURRENT_TAB];
  if(!fn || CURRENT_TAB==="home"){
    CURRENT_TAB="home";
    v.classList.add("hp-canvas");
    hpSetBreadcrumb(null);
    hpPushHistory();
    try{ renderHome(v); }catch(err){ hpRenderError(v,"home",err); }
    return;
  }
  const mod=hpModuleFor(CURRENT_TAB);
  hpSetBreadcrumb(mod||{id:null,name:"HosPRO"}, CURRENT_TAB);
  if(!mod){ const b=document.getElementById("sf-bc-back"); if(b){ b.innerHTML="← Home"; b.onclick=()=>switchTab("home"); } }
  v.classList.add(HP_DARK_TABS.has(CURRENT_TAB) ? "hp-dark" : "hp-surface");
  const sc=document.querySelector("#app .sf-main"); if(sc) sc.scrollTop=0;
  hpPushHistory();
  if(HP_FIXRAY_MODE && HP_FIXRAY_HIDDEN_TABS.has(CURRENT_TAB)){ hpRenderFixrayPlaceholder(v, CURRENT_TAB); return; }
  try{ fn(v); }catch(err){ v.classList.remove("hp-dark"); v.classList.add("hp-surface"); hpRenderError(v,CURRENT_TAB,err); }
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
      <button class="btn" id="rm-quote">Enquire & quote</button>
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
  $("#rm-quote").onclick=()=>{ closeModal(); alert("To build a quote, start from an enquiry in the Sales Pipeline."); switchTab("pipeline"); };
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
let QUOTE_ACC=[];   // accommodation blocks: {label,rooms,rate,nights,basis}
let QUOTE_CUSTOM=[];// custom lines: {label,qty,price}
let QUOTE_PAY=[];   // payment schedule for the current quote
let QUOTE_TOTAL=0;  // latest computed total
let QUOTE_OPTIONS=[]; // collected options (A/B/C) for the proposal
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
let quoteEnquiry=null;  // the enquiry a quote is being built for (required)
function renderQuote(v){
  const e=quoteEnquiry;
  if(!e){
    v.appendChild(head("Create a Quote","Quotes are built from a customer enquiry."));
    const msg=el("div","quote-panel");
    msg.innerHTML=`<div style="text-align:center;padding:30px 20px">
      <div style="font-size:40px;margin-bottom:10px">📋</div>
      <h3 style="margin-bottom:8px">Start from an enquiry</h3>
      <p class="qs-sub" style="max-width:34em;margin:0 auto 18px">Every quote belongs to a customer. Open an enquiry in the Sales Pipeline (or create a new one), then use <b>Build quote</b> — the customer details, payment terms and acceptance all stay linked to that booking.</p>
      <button class="btn" id="q-gopipe">Go to Sales Pipeline</button>
    </div>`;
    v.appendChild(msg);
    $("#q-gopipe").onclick=()=>switchTab("pipeline");
    return;
  }
  const et=EVENT_TYPES.find(t=>t.id===e.event);
  v.appendChild(head(`Quote — ${e.name}`,`Building a quote for this enquiry. Customer, payment terms and issue are all here and stay linked to the booking.`));
  // seed rooms from enquiry if empty
  if(!QUOTE_ROOMS.length){ QUOTE_ROOMS=[newRoomLine({room:e.room||"woodlands",event:e.event||"wedding",pax:parseInt(e.pax)||40})]; }
  const preEvent = e.event || "wedding";

  const wrap=el("div","quote-layout");
  const left=el("div","quote-panel");
  left.innerHTML=`<h3>Customer <span class="qs-sub">(from enquiry)</span></h3>
    <div class="form-grid">
      <div><label>Customer name</label><input id="q-name" value="${(e.name||'').replace(/"/g,'&quot;')}"></div>
      <div><label>Company (optional)</label><input id="q-co" value="${(e.company||'').replace(/"/g,'&quot;')}"></div>
      <div><label>Email</label><input id="q-email" type="email" value="${e.email||''}"></div>
      <div><label>Phone</label><input id="q-phone" value="${e.phone||''}"></div>
      <div><label>Event type</label><select id="q-event">${EVENT_TYPES.map(t=>`<option value="${t.id}" ${t.id===preEvent?"selected":""}>${t.label}</option>`).join("")}</select></div>
      <div><label>Main event date</label><input id="q-date" type="date" value="${/^\d{4}-\d{2}-\d{2}/.test(e.date||'')?e.date.slice(0,10):''}"></div>
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

    <div class="rooms-head">
      <h3 style="margin-top:22px">🛏️ Accommodation</h3>
      <button class="btn sm" id="q-addacc">+ Add bedroom block</button>
    </div>
    <div id="q-acclines"></div>

    <h3 style="margin-top:22px">Add-ons <span class="qs-sub">(applied across the whole quote)</span></h3>
    <div id="q-addons"></div>

    <div class="rooms-head">
      <h3 style="margin-top:22px">✏️ Custom lines <span class="qs-sub">(any bespoke cost)</span></h3>
      <button class="btn sm" id="q-addcustom">+ Add custom line</button>
    </div>
    <div id="q-customlines"></div>

    <h3 style="margin-top:22px">💷 Payment terms</h3>
    <div id="q-pay"></div>
    <div class="dual-btn" style="margin-top:8px">
      <button class="btn ghost sm" id="q-pay-add" type="button">+ Add instalment</button>
      <button class="btn ghost sm" id="q-pay-std" type="button">Use standard schedule</button>
    </div>
    <div id="q-pay-sum" style="margin-top:8px"></div>`;
  wrap.appendChild(left);

  // right: summary
  const right=el("div","quote-panel quote-summary");
  right.innerHTML=`<h3>Quote summary</h3><div id="q-summary"></div>
    <div id="q-options-box"></div>
    <button class="btn block" id="q-addopt" style="margin-top:14px;background:#4a7c59">➕ Add this as an option</button>
    <button class="btn block" id="q-sendlink" style="margin-top:8px;background:#2f6f9e">🔗 Create client proposal link</button>
    <div class="dual-btn" style="margin-top:8px">
      <button class="btn ghost sm" id="q-brochure">Brochure PDF</button>
      <button class="btn ghost sm" id="q-pdf">Simple PDF</button>
    </div>
    <button class="btn ghost block" id="q-kitchen" style="margin-top:8px">Kitchen / ops sheet</button>
    <p class="qs-sub" style="margin-top:10px">Build a version, then <b>Add this as an option</b>. Add a second version for an A/B proposal. The client link shows all options to approve.</p>`;
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
  $("#q-addacc").onclick=()=>{ QUOTE_ACC.push({label:"Bedrooms",rooms:10,rate:130,nights:1,basis:"DBB single"}); renderAccLines(); recalcQuote(); };
  $("#q-addcustom").onclick=()=>{ QUOTE_CUSTOM.push({label:"",qty:1,price:0}); renderCustomLines(); recalcQuote(); };
  renderAccLines(); renderCustomLines();
  $("#q-applytpl").onclick=()=>{ const t=$("#q-template").value; if(t){ applyEventTemplate(t);
    const tpl=EVENT_TEMPLATES[t]; if(tpl && tpl.event) $("#q-event").value=tpl.event;
    renderRoomLines(); recalcQuote(); } };
  $("#q-event").addEventListener("change",recalcQuote);
  recalcQuote();
  $("#q-pdf").onclick=downloadQuotePDF;
  $("#q-brochure").onclick=downloadBrochurePDF;
  if($("#q-sendlink")) $("#q-sendlink").onclick=sendQuoteLink;
  if($("#q-addopt")) $("#q-addopt").onclick=addQuoteOption;
  renderQuoteOptions();
  $("#q-kitchen").onclick=downloadKitchenSheet;

  // ---- payment terms in the quote builder (linked to the enquiry) ----
  QUOTE_PAY = (e.payments||[]).slice();
  function qStd(){
    const total=(typeof QUOTE_TOTAL!=="undefined"?QUOTE_TOTAL:0)||e.value||0;
    const evd=$("#q-date").value||e.date;
    const dd=(off)=>{ if(evd&&/^\d{4}-\d{2}-\d{2}/.test(evd)){ const d=new Date(evd); d.setDate(d.getDate()-off); return d.toISOString().slice(0,10);} return ""; };
    const dep=Math.round(total*0.25);
    return [ {label:"Deposit",pct:25,amount:dep,due:new Date().toISOString().slice(0,10),paid:false},
      {label:"2nd Deposit",pct:25,amount:dep,due:dd(90),paid:false},
      {label:"Full Balance",pct:50,amount:total-dep*2,due:dd(42),paid:false} ];
  }
  function qRenderPay(){
    const box=$("#q-pay"); if(!box) return;
    const total=(typeof QUOTE_TOTAL!=="undefined"?QUOTE_TOTAL:0)||e.value||0;
    if(!QUOTE_PAY.length){ box.innerHTML=`<p class="qs-sub">No schedule yet. Add instalments or use the standard 25/25/50.</p>`; }
    else box.innerHTML=`<table class="pay-table"><tr><th>Instalment</th><th>%</th><th>£</th><th>Due</th><th>Paid</th><th></th></tr>${
      QUOTE_PAY.map((p,i)=>`<tr>
        <td><input class="qpin" data-i="${i}" data-k="label" value="${(p.label||'').replace(/"/g,'&quot;')}"></td>
        <td><input class="qpin" data-i="${i}" data-k="pct" type="number" value="${p.pct||''}" style="width:42px"></td>
        <td><input class="qpin" data-i="${i}" data-k="amount" type="number" value="${p.amount||''}" style="width:78px"></td>
        <td><input class="qpin" data-i="${i}" data-k="due" type="date" value="${p.due||''}"></td>
        <td style="text-align:center"><input class="qpin-paid" data-i="${i}" type="checkbox" ${p.paid?'checked':''}></td>
        <td><button class="mini-btn qpay-del" data-i="${i}">✕</button></td></tr>`).join("")}</table>`;
    const sched=QUOTE_PAY.reduce((s,p)=>s+(+p.amount||0),0), paid=QUOTE_PAY.filter(p=>p.paid).reduce((s,p)=>s+(+p.amount||0),0);
    $("#q-pay-sum").innerHTML=QUOTE_PAY.length?`<div class="pay-sum"><span>Scheduled <b>${money(sched)}</b></span><span>Paid <b style="color:#4a9d6a">${money(paid)}</b></span><span>Outstanding <b style="color:#c07a3e">${money(sched-paid)}</b></span>${sched!==Math.round(total)?`<span class="qs-sub" style="color:#b3261e">⚠ ≠ total ${money(total)}</span>`:''}</div>`:"";
    box.querySelectorAll(".qpin").forEach(inp=>inp.onchange=()=>{ const i=+inp.dataset.i,k=inp.dataset.k;
      QUOTE_PAY[i][k]= (k==='amount'||k==='pct')?parseFloat(inp.value)||0:inp.value;
      if(k==='pct'){ const t=(typeof QUOTE_TOTAL!=="undefined"?QUOTE_TOTAL:0)||e.value||0; QUOTE_PAY[i].amount=Math.round(t*(QUOTE_PAY[i].pct/100)); }
      qRenderPay(); });
    box.querySelectorAll(".qpin-paid").forEach(cb=>cb.onchange=()=>{ QUOTE_PAY[+cb.dataset.i].paid=cb.checked; qRenderPay(); });
    box.querySelectorAll(".qpay-del").forEach(bd=>bd.onclick=()=>{ QUOTE_PAY.splice(+bd.dataset.i,1); qRenderPay(); });
  }
  $("#q-pay-add").onclick=()=>{ QUOTE_PAY.push({label:"Instalment",pct:0,amount:0,due:"",paid:false}); qRenderPay(); };
  $("#q-pay-std").onclick=()=>{ QUOTE_PAY=qStd(); qRenderPay(); };
  window._qRenderPay=qRenderPay;
  qRenderPay();
}

/* Quote spaces: the function rooms plus the restaurant (for lunches/dinners served there, no room hire) */
const QUOTE_RESTAURANT={ id:"clarendon-restaurant", name:"The Clarendon Restaurant", m2:0, length:null, width:null, restaurant:true,
  cap:{ boardroom:null, ushape:null, theatre:null, cabaret:null, reception:null } };
function qSpace(id){ return id===QUOTE_RESTAURANT.id ? QUOTE_RESTAURANT : ROOMS.find(r=>r.id===id); }
/* Packages that already include the meeting / private room hire (DDR, 24-hour, weddings, parties…) */
function pkgIncludesHire(pkg){ return !!pkg && (pkg.id==="24hr" || (pkg.includes||[]).some(t=>/room hire/i.test(t))); }
function renderRoomLines(){
  const box=$("#q-roomlines"); if(!box)return;
  box.innerHTML="";
  QUOTE_ROOMS.forEach((line,i)=>{
    const room=qSpace(line.room);
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
          <div><label>Room / space</label><select data-i="${i}" data-f="room"><optgroup label="Function rooms">${ROOMS.map(r=>`<option value="${r.id}" ${r.id===line.room?"selected":""}>${r.name} (${r.m2}m²)</option>`).join("")}</optgroup>${["lunch","dinner","breakfast","refresh","reception","other"].includes(line.fnType)||line.room===QUOTE_RESTAURANT.id?`<optgroup label="Restaurant"><option value="${QUOTE_RESTAURANT.id}" ${line.room===QUOTE_RESTAURANT.id?"selected":""}>🍽️ ${QUOTE_RESTAURANT.name}</option></optgroup>`:""}</select></div>
          <div><label>Date / day</label><input type="date" data-i="${i}" data-f="date" value="${line.date}"></div>
          <div><label>Layout</label><select data-i="${i}" data-f="layout">${Object.entries(LAYOUT_LABELS).map(([k,l])=>`<option value="${k}" ${k===line.layout?"selected":""}>${l}</option>`).join("")}</select></div>
          <div><label>Guests</label><input type="number" min="1" data-i="${i}" data-f="pax" value="${line.pax}"></div>
          ${room&&room.restaurant?`<div><label>Hire basis</label><div class="qs-sub" style="padding:9px 0;font-weight:700;color:#2F7A72">No room hire — restaurant</div></div>`
            : pkgIncludesHire(PACKAGES.find(p=>p.id===line.pkg))?`<div><label>Hire basis</label><div class="qs-sub" style="padding:9px 0;font-weight:700;color:#2F7A72">✓ Room hire included in package</div></div>`
            : `<div><label>Hire basis</label><select data-i="${i}" data-f="hire"><option value="full" ${line.hire==="full"?"selected":""}>Full day</option><option value="half" ${line.hire==="half"?"selected":""}>Half day</option><option value="none" ${line.hire==="none"?"selected":""}>None (incl.)</option></select></div>`}
          <div><label>Package</label><select data-i="${i}" data-f="pkg"><option value="">Room hire only</option>${PACKAGES.map(p=>`<option value="${p.id}" ${p.id===line.pkg?"selected":""}>${p.name} (${money(p.from)}pp)</option>`).join("")}</select></div>
          ${line.pkg?`<div><label>Rate override £pp <span class="qs-sub">(optional)</span></label><input type="number" min="0" step="0.01" data-i="${i}" data-f="rateOverride" value="${line.rateOverride||""}" placeholder="${money(PACKAGES.find(p=>p.id===line.pkg)?.from||0).replace('£','')}"></div>
          <div><label>Rate note</label><input type="text" data-i="${i}" data-f="rateNote" value="${(line.rateNote||"").replace(/"/g,'&quot;')}" placeholder="e.g. reduced from £40"></div>`:""}
        </div>
      </div>
      ${room&&room.restaurant?`<div class="rl-spec">Served in The Clarendon Restaurant · no room hire or seating plan</div>`:room?`<div class="rl-spec">${room.m2} m²${room.length?` · ${room.length}×${room.width}m`:""} · max ${maxCap(room)} · ${tech.screen||"Screen"}${tech.wirelessShare?" · ClickShare":""}${tech.videoCall?" · Video-call ready":""}</div>`:""}
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
    if(f==="fnType"||f==="pkg"||f==="room") renderRoomLines();
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
function renderAccLines(){
  const box=$("#q-acclines"); if(!box) return;
  const bases=["DBB single","DBB double/twin","B&B single","B&B double/twin","Room only"];
  box.innerHTML=QUOTE_ACC.map((a,i)=>`
    <div class="acc-row">
      <input class="acc-in" data-i="${i}" data-k="label" value="${(a.label||'').replace(/"/g,'&quot;')}" placeholder="e.g. Fri night bedrooms" style="flex:2">
      <input class="acc-in" data-i="${i}" data-k="rooms" type="number" min="0" value="${a.rooms||0}" title="Rooms" style="width:60px">
      <span class="acc-x">×</span>
      <input class="acc-in" data-i="${i}" data-k="rate" type="number" min="0" value="${a.rate||0}" title="£ per room/night" style="width:72px">
      <span class="acc-x">×</span>
      <input class="acc-in" data-i="${i}" data-k="nights" type="number" min="1" value="${a.nights||1}" title="Nights" style="width:52px">
      <select class="acc-in" data-i="${i}" data-k="basis" style="width:130px">${bases.map(b=>`<option ${a.basis===b?"selected":""}>${b}</option>`).join("")}</select>
      <span class="acc-tot">${money((a.rooms||0)*(a.rate||0)*(a.nights||1))}</span>
      <button class="mini-btn acc-del" data-i="${i}">✕</button>
    </div>`).join("") || `<p class="qs-sub">No bedrooms added. Use "+ Add bedroom block" for residential quotes (rooms × rate × nights).</p>`;
  box.querySelectorAll(".acc-in").forEach(inp=>inp.onchange=()=>{ const i=+inp.dataset.i,k=inp.dataset.k;
    QUOTE_ACC[i][k]= (k==='rooms'||k==='rate'||k==='nights')?parseFloat(inp.value)||0:inp.value; renderAccLines(); recalcQuote(); });
  box.querySelectorAll(".acc-del").forEach(b=>b.onclick=()=>{ QUOTE_ACC.splice(+b.dataset.i,1); renderAccLines(); recalcQuote(); });
}
function renderCustomLines(){
  const box=$("#q-customlines"); if(!box) return;
  box.innerHTML=QUOTE_CUSTOM.map((c,i)=>`
    <div class="acc-row">
      <input class="cus-in" data-i="${i}" data-k="label" value="${(c.label||'').replace(/"/g,'&quot;')}" placeholder="Description (e.g. Chef's buffet lunch)" style="flex:2">
      <input class="cus-in" data-i="${i}" data-k="qty" type="number" min="1" value="${c.qty||1}" title="Qty" style="width:56px">
      <span class="acc-x">×</span>
      <input class="cus-in" data-i="${i}" data-k="price" type="number" min="0" step="0.01" value="${c.price||0}" title="£ each" style="width:78px">
      <span class="acc-tot">${money((c.qty||1)*(c.price||0))}</span>
      <button class="mini-btn cus-del" data-i="${i}">✕</button>
    </div>`).join("") || `<p class="qs-sub">No custom lines. Add any bespoke cost — sandwich lunch, extra toilets, marquee, etc.</p>`;
  box.querySelectorAll(".cus-in").forEach(inp=>inp.onchange=()=>{ const i=+inp.dataset.i,k=inp.dataset.k;
    QUOTE_CUSTOM[i][k]= (k==='qty'||k==='price')?parseFloat(inp.value)||0:inp.value; renderCustomLines(); recalcQuote(); });
  box.querySelectorAll(".cus-del").forEach(b=>b.onclick=()=>{ QUOTE_CUSTOM.splice(+b.dataset.i,1); renderCustomLines(); recalcQuote(); });
}
function gatherQuote(){
  const evId=$("#q-event").value;
  const lines=[];
  let totalPax=0;
  QUOTE_ROOMS.forEach(line=>{
    const room=qSpace(line.room); if(!room)return;
    const pax=parseInt(line.pax)||0; totalPax+=pax;
    const dateStr=line.date? " ("+new Date(line.date).toLocaleDateString("en-GB")+")" : "";
    const fl=fnLabel(line);
    const pkg=PACKAGES.find(p=>p.id===line.pkg);
    if(pkg){ const rate=(line.rateOverride&&+line.rateOverride>0)?+line.rateOverride:pkg.from;
      const noteTxt=line.rateNote?` (${line.rateNote})`:(rate!==pkg.from?" (special rate)":"");
      lines.push({label:`${fl} · ${pkg.name} — ${room.name}${dateStr} × ${pax}`, amt:rate*pax, sub:`${money(rate)}pp${noteTxt}`}); }
    if(line.hire!=="none" && ROOM_HIRE[room.id] && !pkgIncludesHire(pkg)){
      lines.push({label:`${fl} · Room hire — ${room.name} (${line.hire} day)${dateStr}`, amt:ROOM_HIRE[room.id][line.hire]});
    }
  });
  document.querySelectorAll("#q-addons input").forEach(q=>{
    const n=parseInt(q.value)||0; if(n>0){
      const price=parseFloat(q.dataset.price);
      lines.push({label:`${q.dataset.name} × ${n} ${q.dataset.unit}`, amt:price*n});
    }
  });
  // accommodation blocks
  (QUOTE_ACC||[]).forEach(a=>{ const amt=(a.rooms||0)*(a.rate||0)*(a.nights||1);
    if(amt>0) lines.push({label:`${a.label||"Bedrooms"} — ${a.rooms} room${a.rooms>1?"s":""} × ${money(a.rate)} × ${a.nights} night${a.nights>1?"s":""} (${a.basis})`, amt, group:"Accommodation"}); });
  // custom lines
  (QUOTE_CUSTOM||[]).forEach(c=>{ const amt=(c.qty||1)*(c.price||0);
    if(c.label && amt>0) lines.push({label:`${c.label}${c.qty>1?` × ${c.qty}`:""}`, amt}); });
  const subtotal=lines.reduce((s,l)=>s+l.amt,0);
  let carbonTotal=0;
  QUOTE_ROOMS.forEach(line=>{ const room=qSpace(line.room);
    if(room && !room.restaurant) carbonTotal += carbonModel(room,evId,parseInt(line.pax)||0).total; });
  const primaryRoom=ROOMS.find(r=>r.id===QUOTE_ROOMS[0]?.room)||ROOMS[0];
  QUOTE_TOTAL=subtotal;
  return { rooms:QUOTE_ROOMS, room:primaryRoom, evId, pax:totalPax, lines, subtotal,
    carbon:{ total:carbonTotal },
    enquiry:quoteEnquiry||null,
    payments:(typeof QUOTE_PAY!=="undefined"?QUOTE_PAY:[]),
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
  if(window._qRenderPay) window._qRenderPay();
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
      .terms-page{page-break-before:always;margin-top:20px}
      .terms{column-count:2;column-gap:20px;font-size:8.5px;line-height:1.45;margin-top:8px}
      .term{break-inside:avoid;margin-bottom:9px}
      .term b{color:#241f1b;font-size:9px;display:block;margin-bottom:2px}
      .term p{color:#3a332c;margin:0}
    </style></head><body>
    <div class="top">
      <div><h1>Brandon Hall Hotel and Spa</h1><div class="muted">Main Street, Brandon, Coventry CV8 3FW</div></div>
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
    <div class="foot">${typeof TERMS_SHORT!=="undefined"?TERMS_SHORT:"This quotation is valid for 14 days and subject to availability."}<br>
    Brandon Hall Hotel and Spa · Sales: nicola.cartwright@brandonhallhotelandspa.com</div>
    <div class="terms-page">
      <h2>Terms &amp; Conditions</h2>
      <div class="terms">${(typeof CONTRACT_TERMS!=="undefined"?CONTRACT_TERMS:[]).map(t=>`<div class="term"><b>${t.h}</b><p>${t.t}</p></div>`).join("")}</div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
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
  const BC_IMG=roomImage("brandon-suite")||hero;
  // pull payment schedule from the linked enquiry (if any)
  q.payments = (q.enquiry&&Array.isArray(q.enquiry.payments))?q.enquiry.payments:(Array.isArray(q.payments)?q.payments:[]);
  const gallery=GALLERY.weddings.slice(0,3).map(u=>`<img src="${u}" style="width:32%;height:90px;object-fit:cover;border-radius:6px">`).join("");

  // per-room booking blocks with seating diagrams
  const roomBlocks=q.rooms.map((line,idx)=>{
    const room=qSpace(line.room); if(!room)return"";
    const pax=parseInt(line.pax)||0;
    const dateStr=line.date? new Date(line.date).toLocaleDateString("en-GB") : "Date TBC";
    const pkg=PACKAGES.find(p=>p.id===line.pkg);
    const svg=room.restaurant?'':seatingSVG(room,line.layout,pax).replace(/background:#fbfaf7/,'background:#fff');
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
      .page{padding:20mm;page-break-after:always}
      .page:last-child{page-break-after:auto}
      .room-block .seat-svg,.room-block svg{max-height:150mm;width:auto;max-width:100%}
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
      .stats span{font-size:11px;color:#374151}
      .room-block{margin:18px 0;padding-bottom:16px;border-bottom:1px solid #e3e7ee}
      .rb-title{font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2b47;margin:0}
      .rb-title span{font-size:13px;color:#374151;font-family:'Inter',sans-serif}
      .rb-pkg{display:inline-block;background:#eef2f8;color:#1a2b47;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px;margin-top:6px}
      .foot-note{margin-top:24px;font-size:10px;color:#374151;border-top:1px solid #e3e7ee;padding-top:12px}
      .terms{column-count:2;column-gap:24px;font-size:8.5px;line-height:1.45}
      .term{break-inside:avoid;margin-bottom:9px}
      .pay-pdf{margin-top:8px}
      .pay-pdf th{font-size:11px;color:#374151;font-weight:600}
      .pay-pdf td{font-size:12.5px}
      .terms-pg{page-break-before:always}
      .cost-page table{margin-bottom:6px}
      .backcover{page-break-before:always;background:linear-gradient(160deg,#1a2b47,#101d33);color:#fff;min-height:297mm;display:flex;flex-direction:column}
      .bc-img{height:42%;width:100%;object-fit:cover;opacity:.85}
      .bc-body{padding:24mm;flex:1}
      .bc-logo{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;letter-spacing:4px}
      .bc-sub{color:#BB9979;font-size:13px;letter-spacing:5px;font-weight:600;margin-top:2px}
      .bc-line{height:2px;background:#BB9979;width:70px;margin:22px 0}
      .bc-intro{font-size:14px;color:#c9d1dd;line-height:1.7;max-width:30em;margin-bottom:34px}
      .bc-contact{display:grid;grid-template-columns:1fr 1fr;gap:20px 30px}
      .bc-contact div{font-size:13px;color:#c9d1dd}
      .bc-contact b{display:block;color:#BB9979;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
      .term b{color:#1a2b47;font-size:9px;display:block;margin-bottom:2px}
      .term p{color:#3a4256;margin:0}
    </style></head><body>
    <!-- COVER -->
    <div class="cover">
      <img class="cover-img" src="${hero}" onerror="this.style.display='none'">
      <div class="cover-body">
        <div class="sub">BRANDON HALL HOTEL AND SPA</div>
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
    <div class="page cost-page">
      <h2>Your proposal</h2><div class="rule"></div>
      <table>${rows}<tr class="total"><td>Total (inc. VAT where applicable)</td><td style="text-align:right">${money(q.subtotal)}</td></tr></table>
      ${q.payments&&q.payments.length?`
      <h2 style="font-size:18px;margin-top:22px">Payment schedule</h2><div class="rule"></div>
      <table class="pay-pdf"><tr><th>Instalment</th><th>Due</th><th style="text-align:right">Amount</th></tr>
        ${q.payments.map(p=>`<tr><td>${p.label||""}</td><td>${p.due&&/^\d{4}-\d{2}-\d{2}/.test(p.due)?new Date(p.due).toLocaleDateString("en-GB"):"On confirmation"}</td><td style="text-align:right">${money(p.amount)}</td></tr>`).join("")}
      </table>`:""}
      <div class="carbon">🌱 Estimated event carbon footprint: <b>${q.carbon.total} kg CO₂e</b> across all spaces — we're committed to sustainable events.</div>
      <div class="foot-note">${TERMS_SHORT}</div>
    </div>
    <!-- TERMS & CONDITIONS -->
    <div class="page terms-pg">
      <h2>Terms &amp; Conditions</h2><div class="rule"></div>
      <div class="terms">${CONTRACT_TERMS.map(t=>`<div class="term"><b>${t.h}</b><p>${t.t}</p></div>`).join("")}</div>
    </div>
    <!-- BACK COVER -->
    <div class="backcover">
      <img class="bc-img" src="${BC_IMG}" onerror="this.style.display='none'">
      <div class="bc-body">
        <div class="bc-logo">BRANDON HALL</div>
        <div class="bc-sub">HOTEL AND SPA</div>
        <div class="bc-line"></div>
        <p class="bc-intro">Thank you for considering Brandon Hall Hotel and Spa. We would be delighted to welcome you and bring your event to life. Please don't hesitate to get in touch — we're here to help every step of the way.</p>
        <div class="bc-contact">
          <div><b>Events Team</b>nicola.cartwright@brandonhallhotelandspa.com</div>
          <div><b>Call us</b>+44 (0)247 710 2555</div>
          <div><b>Find us</b>Main Street, Brandon, Coventry CV8 3FW</div>
          <div><b>Online</b>brandonhallhotelandspa.com</div>
        </div>
      </div>
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
    const room=qSpace(line.room);
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
    .muted{color:#374151;font-size:11px}.sub{color:#374151;font-size:10.5px}
    h2{font-size:13px;color:#9d7d5f;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#1a2b47;color:#fff;text-align:left;padding:7px 8px;font-size:11px}
    td{padding:7px 8px;border-bottom:1px solid #e3e7ee;vertical-align:top}
    .info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 20px;font-size:12px;margin-bottom:6px}
    .info b{color:#3a4256}
    .note{margin-top:24px;font-size:10px;color:#374151;border-top:1px solid #e3e7ee;padding-top:10px}</style></head><body>
    <div class="top"><div><h1>Function / Kitchen Sheet</h1><div class="muted">Brandon Hall Hotel and Spa · Operations</div></div>
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
    <table><tr><td style="height:80px;color:#374151">Dietary requirements, service timings, allergen notes, special requests…</td></tr></table>
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
  const dbRecords=DB.all();
  // Latest Rezlynx business-on-the-books (bob-data.js) is the master: where a managed enquiry
  // has the same booking ref, its value, dates, guests and status are overwritten from the file;
  // owner, follow-ups, notes, checklists and payments stay as the team entered them.
  const bobByRef={};
  const map={ prospect:"provisional", confirmed:"confirmed", cancelled:"cancelled" };
  if(typeof BOB!=="undefined") ["prospect","confirmed","cancelled"].forEach(b=>(BOB[b]||[]).forEach(r=>{ bobByRef[r.ref]=Object.assign({_bucket:b},r); }));
  const used=new Set();
  dbRecords.forEach(e=>{
    const ref=e.ref||e.bobRef||""; const r=ref&&bobByRef[ref];
    if(r){ used.add(ref); out.push(Object.assign({_kind:"enquiry"}, e, { value:r.value, date:r.arrival||e.date, pax:r.pax||e.pax,
      status:r._bucket==="cancelled"?"cancelled":(e.status==="cancelled"?"confirmed":e.status), bookedDate:r.booked, departure:r.departure, rooms:r.rooms,
      roomName:r.room||e.roomName, room:r.room?roomIdFromName(r.room):e.room, ratePlan:r.ratePlan||e.ratePlan })); }
    else out.push(Object.assign({_kind:"enquiry"}, e));
  });
  Object.values(bobByRef).forEach(r=>{
    if(used.has(r.ref)) return;
    out.push({ _kind:"bob", id:"BOB-"+r.ref, name:r.guest, value:r.value, pax:r.pax,
      room:roomIdFromName(r.room), roomName:r.room, date:r.arrival, departure:r.departure, nights:r.nights, rooms:r.rooms,
      status:map[r._bucket], owner:r.operator, source:"BOB / Rezlynx",
      ratePlan:r.ratePlan, ref:r.ref, created:r.bookedAt||r.booked||BOB.pulled, bookedDate:r.booked,
      notes:`Rezlynx ${r._bucket} · ${r.ratePlans&&r.ratePlans.length?r.ratePlans.join(", "):r.ratePlan} · ${r.rooms?r.rooms+" bedroom"+(r.rooms>1?"s":"")+" · ":""}${r.functionRooms&&r.functionRooms.length?r.functionRooms.join(", ")+" · ":""}ref ${r.ref}${r.cancelledValue?` · £${Math.round(r.cancelledValue)} cancelled`:""}`,
      quoteIssued:r.quoteIssued, dealStage:r.dealStage, quoteLink:r.quoteLink, client:r.client, company:r.company, eventType:r.eventType,
      quoteOptions:r.quoteOptions, quotePay:r.quotePay });
  });
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
    <select id="fb-sort" title="Sort the list"><option value="value" ${PIPE_SORT==="value"?"selected":""}>Sort: highest value</option><option value="enq" ${PIPE_SORT==="enq"?"selected":""}>Sort: newest enquiry</option><option value="event" ${PIPE_SORT==="event"?"selected":""}>Sort: soonest event</option></select>
    ${pipeFilterActive()?`<button class="btn ghost sm" id="fb-clear">Clear</button>`:""}`;
  v.appendChild(bar);
  const setF=(k,val)=>{ PIPE_FILTER[k]=val; renderPipeRows(); updateFilterCount(); };
  $("#fb-search").oninput=e=>setF("search",e.target.value);
  $("#fb-status").onchange=e=>setF("status",e.target.value);
  $("#fb-room").onchange=e=>setF("room",e.target.value);
  $("#fb-event").onchange=e=>setF("event",e.target.value);
  $("#fb-owner").onchange=e=>setF("owner",e.target.value);
  $("#fb-source").onchange=e=>setF("source",e.target.value);
  $("#fb-sort").onchange=e=>{ PIPE_SORT=e.target.value; renderPipeRows(); };
  if($("#fb-clear")) $("#fb-clear").onclick=()=>{ PIPE_FILTER={room:"",event:"",status:"",owner:"",source:"",search:""}; render(); };

  // filtered count + table container
  v.appendChild(el("div","pipe-count",`<span id="pipe-count"></span>`));
  const tableWrap=el("div"); tableWrap.id="pipe-table"; v.appendChild(tableWrap);

  window._pipeAll=allRaw;
  renderPipeRows(); updateFilterCount();
}

let PIPE_SORT="value";
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

/* Date the enquiry came in: set on the form, else when it was logged. BOB rows have no enquiry date. */
function enqDate(e){
  if(e.enquiryDate) return e.enquiryDate;
  if(e._kind==="bob") return e.bookedDate||"";
  return e.created ? String(e.created).slice(0,10) : "";
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
  const evK=e=>/^\d{4}-\d{2}-\d{2}/.test(e.date||"")?e.date.slice(0,10):"9999";
  const list=filteredPipe().sort(PIPE_SORT==="enq" ? (a,b)=>(enqDate(b)||"").localeCompare(enqDate(a)||"")
    : PIPE_SORT==="event" ? (a,b)=>evK(a).localeCompare(evK(b)) : (a,b)=>(b.value||0)-(a.value||0));
  const today=new Date().toISOString().slice(0,10);
  const fmtDate=d=>d?(/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):d):"—";
  if(!list.length){ box.innerHTML=`<div class="empty"><div class="big">No matches</div>Try clearing a filter.</div>`; return; }
  box.innerHTML=`<table class="pipe-table">
    <tr><th title="Status: Red overdue · Amber due soon · Green on track">RAG</th><th>Name</th><th>Enquired</th><th>Status</th><th>Event / Rate</th><th>Room</th><th>Event date</th><th>PAX</th><th>Owner</th><th>Last follow-up</th><th>Next follow-up</th><th style="text-align:right">Value</th></tr>`+
    list.slice(0,200).map(e=>{
      const roomName=e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"—";
      const et=EVENT_TYPES.find(t=>t.id===e.event);
      const rag=ragStatus(e);
      const overdueF = e.followUp && e.followUp<today && !["confirmed","cancelled"].includes(e.status);
      return `<tr class="pipe-row" data-id="${e.id}">
        <td><span class="rag rag-${rag}" title="${rag}"></span></td>
        <td class="pr-name">${e.name}${overdueF?' <span class="pr-flag" title="Follow-up overdue">⚠</span>':''}</td>
        <td style="white-space:nowrap">${enqDate(e)?fmtDate(enqDate(e)):"—"}</td>
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
    <div><label>Enquiry date</label><input id="e-enqdate" type="date" value="${today}"></div>
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
      event:$("#e-event").value, enquiryDate:$("#e-enqdate").value||today, date:$("#e-date").value, room:$("#e-room").value,
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
      <div><label>Enquiry date</label><input id="m-enqdate" type="date" value="${enqDate(e)}"></div>
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

    <div class="sec-title">💷 Payment schedule</div>
    <div id="pay-sched"></div>
    <div class="dual-btn" style="margin-top:8px">
      <button class="btn ghost sm" id="pay-add">+ Add instalment</button>
      <button class="btn ghost sm" id="pay-default">Use standard schedule</button>
    </div>
    <div id="pay-summary" style="margin-top:8px"></div>

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

    <div class="sec-title">Deal progress</div>
    <div class="deal-track" id="deal-track"></div>
    <div id="deal-actions" style="margin-top:12px"></div>

    <div class="dual-btn" style="margin-top:14px">
      <button class="btn ghost sm" id="enq-cost">${e.costing?"Re-cost":"Cost event"}</button>
      <button class="btn ghost sm" id="enq-quote">Build quote</button>
    </div>
    <div class="qs-sub" style="margin-top:14px">Ref ${e.ref||e.id}${enqDate(e)?` · enquiry received ${fmtDate(enqDate(e))}`:""} · ${e.owner?`owned by ${e.owner}`:""}</div>`;
  showModal(e.name, `${et?et.label:(e.ratePlan||"Enquiry")} · ${isBob?"BOB / Rezlynx":(e.source||"manual")}`, body);
  renderDealTrack(e);

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

  // ---- payment schedule ----
  let paySched = (e.payments||[]).slice();
  function stdSchedule(){
    const total=parseFloat($("#m-value")?.value)||e.value||0;
    const evDate=$("#m-date")?.value||e.date;
    const dep=Math.round(total*0.25), dep2=Math.round(total*0.25), bal=total-dep-dep2;
    // balance due 6 weeks before event; 2nd deposit ~3 months before
    const dDate=(off)=>{ if(evDate&&/^\d{4}-\d{2}-\d{2}/.test(evDate)){ const d=new Date(evDate); d.setDate(d.getDate()-off); return d.toISOString().slice(0,10);} return ""; };
    return [
      { label:"Deposit", pct:25, amount:dep, due:new Date().toISOString().slice(0,10), paid:false },
      { label:"2nd Deposit", pct:25, amount:dep2, due:dDate(90), paid:false },
      { label:"Full Balance", pct:50, amount:bal, due:dDate(42), paid:false }
    ];
  }
  function renderPaySched(){
    const box=$("#pay-sched"); if(!box) return;
    const total=parseFloat($("#m-value")?.value)||e.value||0;
    if(!paySched.length){ box.innerHTML=`<p class="qs-sub">No schedule set. Add instalments or use the standard 25% / 25% / 50% schedule.</p>`; }
    else{
      box.innerHTML=`<table class="pay-table"><tr><th>Instalment</th><th>%</th><th>Amount £</th><th>Due</th><th>Paid</th><th></th></tr>${
        paySched.map((p,i)=>`<tr>
          <td><input class="pin" data-i="${i}" data-k="label" value="${(p.label||'').replace(/"/g,'&quot;')}"></td>
          <td><input class="pin pin-pct" data-i="${i}" data-k="pct" type="number" value="${p.pct||''}" style="width:44px"></td>
          <td><input class="pin pin-amt" data-i="${i}" data-k="amount" type="number" value="${p.amount||''}" style="width:80px"></td>
          <td><input class="pin" data-i="${i}" data-k="due" type="date" value="${p.due||''}"></td>
          <td style="text-align:center"><input class="pin-paid" data-i="${i}" type="checkbox" ${p.paid?'checked':''}></td>
          <td><button class="mini-btn pay-del" data-i="${i}">✕</button></td>
        </tr>`).join("")}</table>`;
    }
    // summary
    const paid=paySched.filter(p=>p.paid).reduce((s,p)=>s+(+p.amount||0),0);
    const sched=paySched.reduce((s,p)=>s+(+p.amount||0),0);
    const out=sched-paid;
    const today=new Date().toISOString().slice(0,10);
    const overdue=paySched.filter(p=>!p.paid && p.due && p.due<today).reduce((s,p)=>s+(+p.amount||0),0);
    $("#pay-summary").innerHTML = paySched.length? `<div class="pay-sum">
      <span>Scheduled <b>${money(sched)}</b></span><span>Paid <b style="color:#4a9d6a">${money(paid)}</b></span>
      <span>Outstanding <b style="color:${out>0?'#c07a3e':'#4a9d6a'}">${money(out)}</b></span>
      ${overdue>0?`<span style="color:#b3261e">Overdue <b>${money(overdue)}</b></span>`:''}
      ${sched!==Math.round(total)?`<span class="qs-sub" style="color:#b3261e">⚠ schedule (${money(sched)}) ≠ total (${money(total)})</span>`:''}
    </div>`:"";
    // wire
    box.querySelectorAll(".pin").forEach(inp=>inp.onchange=()=>{ const i=+inp.dataset.i, k=inp.dataset.k;
      paySched[i][k]= k==='amount'||k==='pct'? parseFloat(inp.value)||0 : inp.value;
      // if % changed, recompute amount from total
      if(k==='pct'){ const t=parseFloat($("#m-value")?.value)||e.value||0; paySched[i].amount=Math.round(t*(paySched[i].pct/100)); }
      renderPaySched(); });
    box.querySelectorAll(".pin-paid").forEach(cb=>cb.onchange=()=>{ paySched[+cb.dataset.i].paid=cb.checked;
      paySched[+cb.dataset.i].paidDate=cb.checked?new Date().toISOString().slice(0,10):""; renderPaySched(); });
    box.querySelectorAll(".pay-del").forEach(bd=>bd.onclick=()=>{ paySched.splice(+bd.dataset.i,1); renderPaySched(); });
  }
  if($("#pay-add")) $("#pay-add").onclick=()=>{ paySched.push({label:"Instalment",pct:0,amount:0,due:"",paid:false}); renderPaySched(); };
  if($("#pay-default")) $("#pay-default").onclick=()=>{ paySched=stdSchedule(); renderPaySched(); };
  renderPaySched();

  $("#m-save").onclick=()=>{
    const newFollowUp=$("#m-followup").value;
    // if the follow-up date changed, record the previous one as "last follow-up"
    const lastFollowUp = (e.followUp && newFollowUp!==e.followUp) ? e.followUp : (e.lastFollowUp||"");
    const patch={ owner:$("#m-owner").value, status:$("#m-stage").value,
      value:parseFloat($("#m-value").value)||0, date:$("#m-date").value||e.date, enquiryDate:$("#m-enqdate").value||enqDate(e),
      followUp:newFollowUp, lastFollowUp, rag:$("#m-rag").value, source:$("#m-source").value, checklist,
      spaceHeld:$("#m-held")?.checked||false, heldFrom:$("#m-heldfrom")?.value||"", holdExpiry:$("#m-holdexp")?.value||"", payments:paySched };
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
  $("#enq-quote").onclick=()=>{ closeModal(); quoteEnquiry=e; QUOTE_ROOMS=[]; QUOTE_ACC=[]; QUOTE_CUSTOM=[]; QUOTE_PAY=[]; QUOTE_OPTIONS=[]; window._editingQuoteId=null; switchTab("quote"); };
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

// ── Supplier Database — 162 suppliers from Xero contacts ─────────────────────
const SUPPLIER_DB_SEED = [{"id":"sup080","name":"1st Waste Management Consultants Ltd","category":"Cleaning & Waste","email":"","phone":"","city":"Bournemouth","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup101","name":"Bradley Environmental Consultants Ltd","category":"Cleaning & Waste","email":"","phone":"","city":"Halesowen","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup035","name":"Deddington Liquid Waste Disposal","category":"Cleaning & Waste","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup070","name":"H2O Hygienc","category":"Cleaning & Waste","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup068","name":"RDB Pest Control","category":"Cleaning & Waste","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup046","name":"The Best Rubbish Removal","category":"Cleaning & Waste","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup049","name":"Carnoustie Creative","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup116","name":"Choose your event","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup038","name":"Conference Commitions","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup097","name":"Destiny Entertainments","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup149","name":"Green Tourism","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup155","name":"Hitched","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup051","name":"Lighthouse","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup069","name":"Lime Hospitality","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup141","name":"MAV Recordings","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup113","name":"Sixties Retro","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup072","name":"SoundKicks","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup082","name":"The Ink Tree","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup081","name":"The Oompah Band","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup104","name":"Tiffany Lighting","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup036","name":"Venue Directory","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup159","name":"Venue Options Limited","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup065","name":"Visual - Eyes","category":"Entertainment & Marketing","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup088","name":"AVLA","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup066","name":"American Express","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup125","name":"Axiom DWFM","category":"Finance & Insurance","email":"","phone":"","city":"London","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup023","name":"HMRC","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup076","name":"MPLC","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup013","name":"NEST Pension","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup077","name":"NFU Mutual","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup067","name":"PPL PRS","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup111","name":"TV Licencin","category":"Finance & Insurance","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup115","name":"Belair Coffee","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup041","name":"Fishco","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup144","name":"Food Services Support","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup106","name":"Heineken","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup121","name":"LWC","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup083","name":"Matthew Clark","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup003","name":"Midlands Foods","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup114","name":"Mitre","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup052","name":"Mitre / Nisbets Limited","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup100","name":"S10 Supplies Ltd","category":"Food & Beverage","email":"Accounts@s10supplies.co.uk","phone":"","city":"Chelmsford","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup017","name":"SYSCO GB LTD","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup075","name":"Sunrise Farm","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup027","name":"Worcester Produce","category":"Food & Beverage","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup006","name":"Decotel","category":"Linen & Laundry","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup019","name":"Dunelm","category":"Linen & Laundry","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup060","name":"Johnsons Hotel Linen","category":"Linen & Laundry","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup025","name":"Simon Jersey","category":"Linen & Laundry","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup127","name":"Aqualympic","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup147","name":"BHE Refrigeration","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup014","name":"DXN Structured Cabling","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup085","name":"Easy Certs","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup093","name":"Get Licensed LImited","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup137","name":"Heat Assist UK","category":"Maintenance & Contractors","email":"","phone":"","city":"Leicester","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup150","name":"Hinckley Plumbing & Hearing Services Ltd","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup119","name":"Ian Head - Garden","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup034","name":"Keeday Leisure Equipment Ltd","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup056","name":"Kingdom Locksmith","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup160","name":"M.E.I.C Electrical","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup148","name":"Midlands Lock & Glass","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup064","name":"Mulberry Facilities Maintenance Limited","category":"Maintenance & Contractors","email":"mgw@ags-consultancy.biz","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup024","name":"PTSG Techinal","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup030","name":"Quest IT","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup048","name":"RHE Catering Equipment Engineers","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup139","name":"Shield Systems LTD","category":"Maintenance & Contractors","email":"Accounts@shieldsystems.co.uk","phone":"027 208 090 2600","city":"Hayes","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup018","name":"Starflex Contractors","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup053","name":"Superclean Contract Cleaners Limited","category":"Maintenance & Contractors","email":"","phone":"","city":"Coventry","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup123","name":"Warmfix","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup015","name":"Winslow Group","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup096","name":"Zam Secure","category":"Maintenance & Contractors","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup073","name":"A.M Bailey","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup135","name":"AAB","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup021","name":"ASDA","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup032","name":"Alliance","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup059","name":"Amazon","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup126","name":"Ambekar, Tushar","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup007","name":"BOC","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup001","name":"Babu, Niven","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup103","name":"Baby Bottle","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup095","name":"Bennett. Arthur","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup026","name":"Berkeley Scott","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup016","name":"Britania Leasing","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup120","name":"CPS","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup042","name":"Cato Services Limited","category":"Other Suppliers","email":"","phone":"","city":"London","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup087","name":"Chauhan, Dhruvilsinh","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup031","name":"Childs, Lee","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup004","name":"Chivers, Steven","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup039","name":"Contract Labour - Sarah Davie","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup112","name":"Coventry Signs","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup122","name":"Currys Electrical","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup089","name":"D&D Marquee Hire Ltd","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup153","name":"Darryl Frost","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup020","name":"Dhingra, Keshav","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup008","name":"Dosky, Sivar","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup110","name":"Euro King","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup028","name":"Eydens","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup091","name":"Field, Nathan","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup010","name":"Forbes Professional","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup151","name":"GM - Mike Blake","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup099","name":"GTK Group","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup037","name":"Gailarde","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup074","name":"Gerget, Jayan","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup154","name":"Hale, Olivia","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup029","name":"Jervis, Lara","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup002","name":"Lamp Copper UK","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup044","name":"Li, Catarina","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup094","name":"LiveMusic2U","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup161","name":"Mahalingam, Boopathi","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup062","name":"Martins, David","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup084","name":"McDonald Lily","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup158","name":"McGregor, Cameron","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup107","name":"Mellcrest Ltd","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup156","name":"Menu Shop","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup033","name":"Murugapragasam, Aburvan","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup142","name":"Nagaraj, Sanjuna","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup005","name":"Opulen Asset Management","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup133","name":"Patel, Raju","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup128","name":"Playdon, Caitlin","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup012","name":"Premkumar, Amal","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup040","name":"Pughs Plant Hire Ltd","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup079","name":"Rugby Borough Council","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup143","name":"SB Nexus Ltd","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup109","name":"Seton","category":"Other Suppliers","email":"Accounts@seton.co.uk","phone":"027 1295 272482","city":"Banbury","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup162","name":"TAYL","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup011","name":"The Astute Group","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup043","name":"The Direct Tableware","category":"Other Suppliers","email":"accounts@directtableware.com","phone":"044 01763 248008","city":"Royston","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup090","name":"TrustUK Payments Limited","category":"Other Suppliers","email":"","phone":"","city":"London","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup152","name":"Underwood and co","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup134","name":"Vikings","category":"Other Suppliers","email":"","phone":"","city":"Leicester","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup157","name":"Watts, Jaimie-Leigh","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup102","name":"Wellwood Communications","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup022","name":"Whitehead, Bradley","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup092","name":"Wilkins, Alan","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup071","name":"Wilkins, Rowan","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup118","name":"Williams, Harry","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup086","name":"YEC Management Limited","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup009","name":"Yogendranayar, Lingeswaren","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup130","name":"oomph","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup054","name":"wilson gray","category":"Other Suppliers","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup132","name":"7 Hospitality Management","category":"Technology & Systems","email":"","phone":"","city":"Perth","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup124","name":"Click Travel","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup140","name":"Dormakaba","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup057","name":"EProductive","category":"Technology & Systems","email":"info@eproductive.com","phone":"027 1306 875785","city":"Dorking","website":"www.eproductive.com","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup055","name":"Expedia","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup131","name":"Grenke","category":"Technology & Systems","email":"service.birmingham@grenke.co.uk","phone":"027 044 1827 3017-00","city":"Guildford","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup047","name":"Hosted Telecom","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup098","name":"HotelRez","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup138","name":"Leader Systems","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup129","name":"Peoplebank","category":"Technology & Systems","email":"accounts@daxtra.com","phone":"07 131 5641640","city":"Musselburgh","website":"www.peoplebank.com","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup117","name":"ProfitRoom","category":"Technology & Systems","email":"billing@profitroom.co.uk","phone":"","city":"London","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup050","name":"Saeker Limited","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup045","name":"The Access Group","category":"Technology & Systems","email":"","phone":"","city":"Loughborough","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup136","name":"booking.com","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup145","name":"priority","category":"Technology & Systems","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup108","name":"British Gas","category":"Utilities","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup061","name":"Elite Energy Ltd","category":"Utilities","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup146","name":"Everflow","category":"Utilities","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup063","name":"Flint Bishop Limited (British Gas) DD","category":"Utilities","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup078","name":"National Grid","category":"Utilities","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup105","name":"SSE Energy Solutions DD","category":"Utilities","email":"","phone":"","city":"","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]},{"id":"sup058","name":"Smartest Energy","category":"Utilities","email":"","phone":"01903 703400","city":"Worthing","website":"","contact":"","notes":"","status":"active","contracts":[],"lastContact":"","followUp":"","activity":[]}];

const SUPPLIER_CATS = [
  'Food & Beverage','Linen & Laundry','Maintenance & Contractors',
  'Utilities','Technology & Systems','Cleaning & Waste',
  'Finance & Insurance','Entertainment & Marketing','Other Suppliers'
];

function suppGetAll(){
  const stored=localStorage.getItem('bh_suppliers');
  if(stored) return JSON.parse(stored);
  localStorage.setItem('bh_suppliers', JSON.stringify(SUPPLIER_DB_SEED));
  return SUPPLIER_DB_SEED.slice();
}
function suppSave(d){ localStorage.setItem('bh_suppliers', JSON.stringify(d)); }

function renderSuppliers(v){
  v.innerHTML=''; v.style.padding='0';
  const suppliers=suppGetAll();
  const search=window._suppSearch||'', filter=window._suppFilter||'all';
  let filtered=suppliers;
  if(search) filtered=filtered.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.category.toLowerCase().includes(search.toLowerCase()));
  if(filter!=='all') filtered=filtered.filter(s=>s.category===filter);

  const catColours={'Food & Beverage':'#4a9d7f','Linen & Laundry':'#4a86c7','Maintenance & Contractors':'#b8860b',
    'Utilities':'#8b5c8f','Technology & Systems':'#2f6f9e','Cleaning & Waste':'#c45c00',
    'Finance & Insurance':'#991b1b','Entertainment & Marketing':'#c85c6b','Other Suppliers':'#374151'};

  const rows=filtered.map(s=>{
    const col=catColours[s.category]||'#374151';
    const isOverdue=s.followUp&&new Date(s.followUp)<new Date();
    return `<tr onclick="suppOpenAccount('${s.id}')" style="border-bottom:1px solid #e5e7eb;cursor:pointer"
      onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''">
      <td style="padding:10px 12px"><div style="font-size:13px;font-weight:700;color:#1a2b3a">${s.name}</div>
        ${s.contact?`<div style="font-size:11px;color:#374151">${s.contact}</div>`:''}
      </td>
      <td style="padding:10px 8px"><span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${col}20;color:${col}">${s.category}</span></td>
      <td style="padding:10px 8px;font-size:12px;color:#374151">${s.phone||s.email||'—'}</td>
      <td style="padding:10px 8px;font-size:11px;color:${isOverdue?'#991b1b':'#374151'};font-weight:${isOverdue?'700':'400'}">${s.followUp?new Date(s.followUp).toLocaleDateString('en-GB'):'—'}</td>
      <td style="padding:10px 8px"><button onclick="event.stopPropagation();suppOpenAccount('${s.id}')"
        style="padding:5px 10px;border:1.5px solid #1a2b3a;border-radius:7px;background:#fff;font:600 11px Lato;cursor:pointer;color:#1a2b3a">Open →</button></td>
    </tr>`;
  }).join('')||`<tr><td colspan="5" style="padding:20px;text-align:center;color:#374151">No suppliers found</td></tr>`;

  v.innerHTML=`<div style="padding:20px 28px;min-height:100%;background:#f0f4f8">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a">Supplier Database</div>
        <div style="font-size:13px;color:#374151">${filtered.length} of ${suppliers.length} suppliers</div>
      </div>
      <button onclick="suppAddModal()" style="padding:9px 18px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 13px Lato;cursor:pointer">+ Add supplier</button>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input type="text" placeholder="🔍 Search suppliers..." value="${search}"
        oninput="window._suppSearch=this.value;renderSuppliers(document.getElementById('view'))"
        style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
      <select onchange="window._suppFilter=this.value;renderSuppliers(document.getElementById('view'))"
        style="padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
        <option value="all"${filter==='all'?' selected':''}>All categories</option>
        ${SUPPLIER_CATS.map(c=>`<option value="${c}"${filter===c?' selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:14px">
      ${SUPPLIER_CATS.map(cat=>{
        const cnt=suppliers.filter(s=>s.category===cat).length;
        const col=catColours[cat]||'#374151';
        return `<div onclick="window._suppFilter='${cat}';renderSuppliers(document.getElementById('view'))"
          style="padding:8px 10px;border-radius:9px;font-size:11px;font-weight:600;background:${col}15;border:1px solid ${col}30;color:${col};cursor:pointer;text-align:center">
          ${cat}<div style="font-size:14px;font-weight:700;margin-top:2px">${cnt}</div></div>`;
      }).join('')}
    </div>
    <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#1a2b3a">
          ${['Supplier','Category','Contact','Follow-up',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function suppOpenAccount(suppId){
  const suppliers=suppGetAll(), s=suppliers.find(x=>x.id===suppId); if(!s) return;
  const catColours={'Food & Beverage':'#4a9d7f','Linen & Laundry':'#4a86c7','Maintenance & Contractors':'#b8860b',
    'Utilities':'#8b5c8f','Technology & Systems':'#2f6f9e','Cleaning & Waste':'#c45c00',
    'Finance & Insurance':'#991b1b','Entertainment & Marketing':'#c85c6b','Other Suppliers':'#374151'};
  const col=catColours[s.category]||'#374151';
  const contracts=(s.contracts||[]).map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:6px">
    <div><div style="font-size:13px;font-weight:600;color:#1a2b3a">${c.name}</div>
    <div style="font-size:11px;color:#374151">${c.type} · ${c.date}</div></div>
    <button onclick="suppDeleteContract('${suppId}','${c.id}')" style="padding:3px 8px;border:1px solid #fee2e2;border-radius:6px;background:#fff;font:600 10px Lato;color:#991b1b;cursor:pointer">Remove</button>
  </div>`).join('')||'<div style="font-size:12px;color:#374151;padding:8px 0">No contracts filed</div>';
  const activity=(s.activity||[]).slice().reverse().map(a=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
    <div style="font-size:11px;color:#374151;width:80px;flex-shrink:0">${a.date}</div>
    <div style="font-size:12px;color:#1a2b3a">${a.note}</div></div>`).join('')||'<div style="font-size:12px;color:#374151">No activity logged</div>';

  openModal(`<div style="max-height:85vh;overflow-y:auto;padding:4px">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#1a2b3a">${s.name}</div>
        <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${col}20;color:${col}">${s.category}</span>
      </div>
      <button onclick="closeModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#374151">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      ${[['Contact name','contact','text'],['Phone','phone','tel'],['Email','email','email'],['Website','website','url']].map(([l,f,t])=>`
        <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">${l}</label>
          <input type="${t}" value="${s[f]||''}" data-field="${f}" data-id="${suppId}" onchange="suppSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>`).join('')}
      <div>
        <label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Category</label>
        <select data-field="category" data-id="${suppId}" onchange="suppSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
          ${SUPPLIER_CATS.map(c=>`<option value="${c}"${s.category===c?' selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Follow-up date</label>
        <input type="date" value="${s.followUp||''}" data-field="followUp" data-id="${suppId}" onchange="suppSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Notes</label>
      <textarea data-field="notes" data-id="${suppId}" onchange="suppSaveField(this)"
        style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a;min-height:50px;resize:vertical">${s.notes||''}</textarea>
    </div>
    <div style="margin-bottom:12px;padding:10px;background:#f9fafb;border-radius:10px">
      <div style="font-size:10px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Log activity</div>
      <div style="display:flex;gap:8px">
        <input type="text" id="supp-act-note" placeholder="e.g. Renewed contract, price increase agreed"
          style="flex:1;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:12px Lato;color:#1a2b3a">
        <button onclick="suppLogActivity('${suppId}')" style="padding:8px 14px;background:#1a2b3a;color:#fff;border:none;border-radius:7px;font:600 12px Lato;cursor:pointer">Log</button>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-size:10px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Activity log</div>
      ${activity}
    </div>
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:10px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px">Contracts & agreements</div>
        <button onclick="suppAttachContract('${suppId}')" style="padding:5px 10px;background:#4a9d7f;color:#fff;border:none;border-radius:7px;font:600 11px Lato;cursor:pointer">+ Attach</button>
      </div>
      ${contracts}
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="closeModal();renderSuppliers(document.getElementById('view'))"
        style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">✓ Done</button>
      <button onclick="if(confirm('Delete ${s.name}?')){suppDelete('${suppId}');closeModal();}"
        style="padding:11px 16px;border:1.5px solid #fee2e2;border-radius:9px;background:#fff;font:600 12px Lato;color:#991b1b;cursor:pointer">Delete</button>
    </div>
  </div>`);
}

function suppSaveField(el){const s=suppGetAll(),a=s.find(x=>x.id===el.dataset.id);if(!a)return;a[el.dataset.field]=el.value;suppSave(s);toast('Saved ✓');}
function suppLogActivity(id){const note=document.getElementById('supp-act-note')?.value.trim();if(!note)return;const s=suppGetAll(),a=s.find(x=>x.id===id);if(!a)return;if(!a.activity)a.activity=[];a.activity.push({id:'act'+Date.now(),date:new Date().toLocaleDateString('en-GB'),note});a.lastContact=new Date().toISOString().slice(0,10);suppSave(s);closeModal();suppOpenAccount(id);toast('Logged ✓');}
function suppAttachContract(id){openModal(`<div style="padding:4px"><div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Attach contract</div><div style="display:flex;flex-direction:column;gap:10px"><div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Document name</label><input type="text" id="sc-name" placeholder="e.g. Service Agreement 2026" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a"></div><div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Type</label><select id="sc-type" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a"><option>Service agreement</option><option>Contract</option><option>SLA</option><option>Purchase order</option><option>Other</option></select></div></div><div style="display:flex;gap:8px;margin-top:14px"><button onclick="suppDoAttach('${id}')" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Save</button><button onclick="closeModal();suppOpenAccount('${id}')" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button></div></div>`);}
function suppDoAttach(id){const name=document.getElementById('sc-name')?.value.trim();if(!name){toast('Enter a name');return;}const s=suppGetAll(),a=s.find(x=>x.id===id);if(!a)return;if(!a.contracts)a.contracts=[];a.contracts.push({id:'sc'+Date.now(),name,type:document.getElementById('sc-type')?.value||'Other',date:new Date().toLocaleDateString('en-GB')});suppSave(s);closeModal();suppOpenAccount(id);toast('Contract attached ✓');}
function suppDeleteContract(suppId,cId){const s=suppGetAll(),a=s.find(x=>x.id===suppId);if(!a)return;a.contracts=(a.contracts||[]).filter(c=>c.id!==cId);suppSave(s);closeModal();suppOpenAccount(suppId);}
function suppDelete(id){suppSave(suppGetAll().filter(s=>s.id!==id));renderSuppliers(document.getElementById('view'));toast('Deleted');}
function suppAddModal(){openModal(`<div style="padding:4px"><div style="font-size:18px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add supplier</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div style="grid-column:span 2"><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Supplier name</label><input type="text" id="sa-name" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div><div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Category</label><select id="sa-cat" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">${SUPPLIER_CATS.map(c=>`<option>${c}</option>`).join('')}</select></div><div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Phone</label><input type="tel" id="sa-phone" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div></div><div style="display:flex;gap:8px"><button onclick="suppDoAdd()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Add</button><button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button></div></div>`);}
function suppDoAdd(){const name=document.getElementById('sa-name')?.value.trim();if(!name){toast('Enter a name');return;}const s=suppGetAll();s.push({id:'sup'+Date.now(),name,category:document.getElementById('sa-cat')?.value||'Other Suppliers',phone:document.getElementById('sa-phone')?.value||'',email:'',website:'',contact:'',notes:'',status:'active',contracts:[],lastContact:'',followUp:'',activity:[]});suppSave(s);closeModal();renderSuppliers(document.getElementById('view'));toast('✓ '+name+' added');}


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
  const opts=$("#chat-opts"); if(!opts) return;   // user left the chat tab before the timer fired
  opts.innerHTML="";
  if(BOT.idx>=BOT.steps.length){ finishBot(); return; }
  const step=BOT.steps[BOT.idx];
  botSay(fillName(step.q));
  const delay=700;
  setTimeout(()=>{
    if(!$("#chat-opts")||!$("#chat-input")) return;
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
    h1{font-family:Georgia,serif;font-size:24px;color:#1a2b47;margin:0}.muted{color:#374151;font-size:11px}
    h2{font-size:14px;color:#9d7d5f;margin:18px 0 6px;border-bottom:1px solid #e8dccf;padding-bottom:3px}
    table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #e3e7ee;text-align:left}
    .r{text-align:right}.neg{color:#b3261e}.hero{background:#1a2b47;color:#fff;border-radius:10px;padding:16px;margin:14px 0;text-align:center}
    .hero .big{font-family:Georgia,serif;font-size:32px}.total td{font-weight:700;font-size:14px;border-top:2px solid #1a2b47}</style></head><body>
    <div class="top"><div><h1>Event Profitability</h1><div class="muted">${p.name}</div></div>
      <div class="muted">Brandon Hall Hotel and Spa<br>${new Date().toLocaleDateString("en-GB")}</div></div>
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

  const tb=el("div","pipe-toolbar");
  tb.innerHTML=`<div class="rag-legend"><span>Enter unit costs to price up. Print the list, or send a supplier quote request.</span></div>
    <div class="pipe-actions">
      <button class="btn ghost" id="mne-reload" title="Pull in the latest standard items (keeps your entered costs where item names match)">↻ Reload master list</button>
      <button class="btn" id="mne-budget" style="background:#4a7c59">📋 Budget approval sheet</button>
      <button class="btn ghost" id="mne-jobsheet">🔧 Maintenance job sheets</button>
      <button class="btn ghost" id="mne-print-req">🖨 Requirements list</button>
      <button class="btn ghost" id="mne-print-rfq">✉ Supplier RFQ</button>
    </div>`;
  v.appendChild(tb);
  $("#mne-print-req").onclick=()=>printMnE("requirements");
  $("#mne-print-rfq").onclick=()=>printMnE("rfq");
  $("#mne-budget").onclick=printBudgetApproval;
  $("#mne-jobsheet").onclick=printJobSheets;
  $("#mne-reload").onclick=()=>{
    if(!confirm("Reload the master equipment list?\n\nThis adds any new standard items to each room. Your entered costs are kept where the item name matches. Continue?")) return;
    MnEState.mergeMaster(); render();
  };

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
        ${roomCost?`<span class="room-cost">${money2dp(roomCost)}</span>`:""}
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
    <tr><th>Item</th><th>Cat</th><th>Size</th><th>Qty</th><th>Unit cost £</th><th>Line</th><th>Supplier</th><th>Status</th><th></th></tr>`+
    items.map((it,i)=>{ const line=(it.cost||0)*(it.qty||1);
      return `<tr>
      <td>${it.item}</td><td><span class="cat-pill">${it.cat}</span></td>
      <td>${it.size||"—"}</td>
      <td><input class="mne-edit mne-qty" data-room="${roomId}" data-i="${i}" data-k="qty" type="number" min="1" value="${it.qty||1}" style="width:48px"></td>
      <td><input class="mne-edit mne-cost" data-room="${roomId}" data-i="${i}" data-k="cost" type="number" min="0" step="0.01" value="${it.cost||''}" placeholder="0.00" style="width:80px"></td>
      <td class="mne-line">${line?money2dp(line):"—"}</td>
      <td><input class="mne-edit" data-room="${roomId}" data-i="${i}" data-k="supplier" value="${(it.supplier||'').replace(/"/g,'&quot;')}" placeholder="Supplier" style="width:110px"></td>
      <td><select class="mne-status ${it.status}" data-room="${roomId}" data-i="${i}">
        ${MNE_STATUSES.map(s=>`<option value="${s}" ${it.status===s?"selected":""}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join("")}
      </select></td>
      <td><button class="mne-del" data-room="${roomId}" data-i="${i}" title="Remove">×</button></td>
    </tr>`;}).join("")+`</table>`;
  box.querySelectorAll(".mne-status").forEach(sel=>sel.onchange=()=>{
    MnEState.setStatus(sel.dataset.room, +sel.dataset.i, sel.value); render(); });
  box.querySelectorAll(".mne-del").forEach(b=>b.onclick=()=>{
    MnEState.remove(b.dataset.room, +b.dataset.i); render(); });
  // inline edit of qty / cost / supplier — update totals live without re-rendering the row
  box.querySelectorAll(".mne-edit").forEach(inp=>inp.onchange=()=>{
    const room=inp.dataset.room, idx=+inp.dataset.i, k=inp.dataset.k;
    const val=(k==='cost'||k==='qty')?parseFloat(inp.value)||0:inp.value;
    MnEState.setField(room, idx, k, val);
    // update this row's line total
    const it=MnEState.items(room)[idx];
    const line=(it.cost||0)*(it.qty||1);
    const cell=inp.closest("tr")?.querySelector(".mne-line");
    if(cell) cell.textContent = line?money2dp(line):"—";
    // update the room total in the header
    const roomCost=MnEState.items(room).reduce((s,x)=>s+(x.cost||0)*(x.qty||1),0);
    const head=box.closest(".mne-room")?.querySelector(".room-cost");
    if(head) head.textContent = roomCost?money2dp(roomCost):"";
    else if(roomCost){ const h=box.closest(".mne-room")?.querySelector(".mne-head");
      if(h && !h.querySelector(".room-cost")){ const sp=document.createElement("span"); sp.className="room-cost"; sp.textContent=money2dp(roomCost); h.insertBefore(sp, h.querySelector(".mne-add")); } }
  });
}
/* ---- Print M&E requirements list OR supplier quote request (RFQ) ---- */
function printMnE(mode){
  const isRFQ = mode==="rfq";
  const today=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  // gather rooms with items or config
  const rooms=ROOMS.map(r=>({ r, conf:MNE_ROOMS[r.id], items:MnEState.items(r.id) }))
    .filter(x=>x.conf || x.items.length);
  // totals for requirements mode
  let grandItems=0;
  const roomBlocks = rooms.map(({r,conf,items})=>{
    const ready = conf? conf.readyToSell : null;
    const readyTxt = ready===true?"Ready to sell" : ready===false?"NOT ready" : "Audit pending";
    const readyClass = ready===true?"ry":ready===false?"rn":"rt";
    grandItems += items.length;
    const rows = items.length ? items.map(it=>{
      const spec=[it.size,it.cat].filter(Boolean).join(" · ");
      if(isRFQ){
        return `<tr><td>${it.item}</td><td>${it.size||""}</td><td class="c">${it.qty||1}</td><td class="cat">${it.cat}</td><td class="fill"></td><td class="fill"></td><td class="fill"></td></tr>`;
      }
      return `<tr><td>${it.item}</td><td>${it.size||""}</td><td class="c">${it.qty||1}</td><td class="cat">${it.cat}</td><td class="st st-${it.status}">${it.status}</td></tr>`;
    }).join("") : `<tr><td colspan="${isRFQ?7:5}" class="none">No equipment items listed${conf&&conf.currentAV?" · Current AV: "+conf.currentAV:""}</td></tr>`;
    const head = isRFQ
      ? `<tr><th>Item</th><th>Size</th><th class="c">Qty</th><th>Category</th><th>Unit price £</th><th>Total £</th><th>Lead time</th></tr>`
      : `<tr><th>Item</th><th>Size</th><th class="c">Qty</th><th>Category</th><th>Status</th></tr>`;
    return `<div class="room">
      <div class="room-h"><h2>${r.name}</h2>
        <span class="cap">${conf&&conf.capacity?conf.capacity:(r.m2?r.m2+" m²":"")}</span>
        ${!isRFQ?`<span class="ready ${readyClass}">${readyTxt}</span>`:""}
      </div>
      ${conf?`<div class="facilities">
        <span class="fac ${(conf.ac||'').toLowerCase()==='yes'?'y':'n'}">AC: ${conf.ac||'—'}</span>
        <span class="fac ${(conf.usbSockets||'').toLowerCase()==='yes'?'y':'n'}">USB sockets: ${conf.usbSockets||'—'}</span>
        <span class="fac ${(conf.powerAdequate||'').toLowerCase().startsWith('y')?'y':'n'}">Power: ${conf.powerAdequate||'—'}</span>
      </div>`:""}
      ${conf&&conf.currentAV?`<div class="cur"><b>Current AV:</b> ${conf.currentAV}</div>`:""}
      ${!isRFQ && conf&&conf.comments?`<div class="cmt">${conf.comments}</div>`:""}
      <table>${head}${rows}</table>
      ${!isRFQ && conf&&conf.wishlist&&conf.wishlist.length?`<div class="wish"><b>Wish list:</b> ${conf.wishlist.join(" · ")}</div>`:""}
      ${!isRFQ && conf&&conf.socialWishlist&&conf.socialWishlist.length?`<div class="wish social"><b>Social / events wish list:</b> ${conf.socialWishlist.join(" · ")}</div>`:""}
    </div>`;
  }).join("");

  const ddrNote = `<div class="ddr"><b>Included as standard in DDR / 24-hour packages:</b> Screen, HDMI cable, Wi-Fi, pads &amp; pens, flipchart pads &amp; pens, branded notepads.</div>`;

  const title = isRFQ ? "Audio-Visual Equipment — Request for Quotation" : "Meetings &amp; Events — Equipment Requirements";
  const intro = isRFQ
    ? `<p class="intro">Brandon Hall Hotel and Spa invites your quotation for the audio-visual equipment listed below, by room. Please complete the <b>unit price</b>, <b>total</b> and <b>lead time</b> columns and return to <b>events@brandonhallhotelandspa.com</b>. Prices in GBP, please indicate whether inclusive or exclusive of VAT and delivery/installation.</p>`
    : `<p class="intro">Full equipment requirements by room. Standard package inclusions are listed below; this schedule covers the additional / upgrade equipment needed to bring each space to specification.</p>`;

  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${isRFQ?"AV Quote Request":"M&E Requirements"} — Brandon Hall</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>
    @page{margin:16mm}
    body{font-family:'Lato',sans-serif;color:#2a3644;line-height:1.4;max-width:900px;margin:0 auto;padding:16px;font-size:12px}
    .doc-h{text-align:center;border-bottom:3px solid #1a2b47;padding-bottom:12px;margin-bottom:14px}
    .logo{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;letter-spacing:5px;color:#1a2b47}
    .sub{font-size:11px;letter-spacing:4px;color:#c9a978;font-weight:700}
    h1{font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a2b47;margin:12px 0 4px;text-align:center}
    .meta{text-align:center;font-size:11px;color:#374151;margin-bottom:14px}
    .intro{font-size:11.5px;background:#f6f8f9;border-radius:8px;padding:10px 12px;margin-bottom:14px}
    .ddr{font-size:11px;border:1px solid #e3e7ee;border-left:3px solid #c9a978;border-radius:6px;padding:9px 12px;margin-bottom:16px;background:#fffdf9}
    .room{margin-bottom:16px;break-inside:avoid}
    .room-h{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid #e3e7ee;padding-bottom:5px;margin-bottom:6px}
    .room-h h2{font-family:'Cormorant Garamond',serif;font-size:18px;color:#1a2b47;margin:0}
    .cap{font-size:11px;color:#374151;flex:1}
    .ready{font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px}
    .ready.ry{background:#e8f3ee;color:#2a6a4a}.ready.rn{background:#fdecec;color:#b3261e}.ready.rt{background:#eef2f4;color:#374151}
    .cur{font-size:11px;margin-bottom:3px}.cmt{font-size:10.5px;color:#374151;font-style:italic;margin-bottom:5px}
    .facilities{display:flex;gap:8px;margin:4px 0 6px;flex-wrap:wrap}
    .fac{font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px}
    .fac.y{background:#e8f3ee;color:#2a6a4a}.fac.n{background:#fdecec;color:#b3261e}
    .wish{font-size:10px;color:#4a5560;margin-top:6px;padding:6px 9px;background:#f6f8f9;border-radius:5px}
    .wish b{color:#1a2b47}.wish.social{background:#fdf6ee}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1a2b47;color:#fff;text-align:left;padding:6px 8px;font-size:10px;font-weight:700}
    td{padding:5px 8px;border-bottom:1px solid #eef2f4}
    td.c,th.c{text-align:center}
    td.cat{color:#374151;font-size:10px}
    td.st{text-transform:capitalize;font-weight:700}
    .st-needed{color:#b3261e}.st-ordered{color:#c07a3e}.st-delivered{color:#2f6f9e}.st-installed{color:#4a9d6a}
    td.fill{background:#fbfcfd;border:1px solid #e3e7ee;min-width:70px}
    td.none{color:#374151;font-style:italic}
    .foot{margin-top:20px;border-top:1px solid #e3e7ee;padding-top:10px;font-size:10px;color:#374151}
    .sign{margin-top:24px;display:flex;gap:40px}.sign div{flex:1;border-top:1px solid #1a2b47;padding-top:5px;font-size:10px;color:#374151}
    </style></head><body>
    <div class="doc-h"><div class="logo">BRANDON HALL</div><div class="sub">HOTEL AND SPA</div></div>
    <h1>${title}</h1>
    <div class="meta">${isRFQ?"Request for Quotation":"Internal Requirements Schedule"} · ${today}${!isRFQ?` · ${grandItems} items across ${rooms.length} rooms`:""}</div>
    ${intro}
    ${ddrNote}
    ${roomBlocks}
    ${isRFQ?`<div class="sign"><div>Supplier name &amp; signature</div><div>Date</div><div>Quote valid until</div></div>`:""}
    <div class="foot">Brandon Hall Hotel and Spa · Main Street, Brandon, Coventry CV8 3FW · events@brandonhallhotelandspa.com · +44 (0)247 710 2555</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script>
    </body></html>`);
  win.document.close();
}

/* ---- Budget Approval Sheet (master, all rooms) — for Raj Kumar to sign ---- */
function printBudgetApproval(){
  const today=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  let grand=0;
  const rooms=ROOMS.map(r=>({r,items:MnEState.items(r.id).filter(it=>(it.cost||0)>0 || it.item)}))
    .filter(x=>x.items.length);
  const blocks=rooms.map(({r,items})=>{
    const roomTotal=items.reduce((s,it)=>s+(it.cost||0)*(it.qty||1),0);
    grand+=roomTotal;
    const rows=items.map(it=>{ const line=(it.cost||0)*(it.qty||1);
      return `<tr><td>${it.item}</td><td class="c">${it.qty||1}</td><td class="r">${it.cost?money2dp(it.cost):"—"}</td><td class="r">${line?money2dp(line):"—"}</td><td>${it.supplier||""}</td></tr>`;
    }).join("");
    return `<div class="room"><div class="room-h"><h3>${r.name}</h3><span class="rtot">${money2dp(roomTotal)}</span></div>
      <table><tr><th>Item</th><th class="c">Qty</th><th class="r">Unit £</th><th class="r">Line £</th><th>Supplier</th></tr>${rows}</table></div>`;
  }).join("");
  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>M&E Budget Approval — Brandon Hall</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>@page{margin:16mm}body{font-family:'Lato',sans-serif;color:#2a3644;font-size:12px;max-width:900px;margin:0 auto;padding:14px}
    .h{text-align:center;border-bottom:3px solid #1a2b47;padding-bottom:12px;margin-bottom:14px}
    .logo{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;letter-spacing:5px;color:#1a2b47}
    .sub{font-size:11px;letter-spacing:4px;color:#c9a978;font-weight:700}
    h1{font-family:'Cormorant Garamond',serif;font-size:22px;text-align:center;color:#1a2b47;margin:12px 0 4px}
    .meta{text-align:center;font-size:11px;color:#374151;margin-bottom:14px}
    .room{margin-bottom:14px;break-inside:avoid}
    .room-h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e3e7ee;padding-bottom:4px;margin-bottom:5px}
    .room-h h3{font-family:'Cormorant Garamond',serif;font-size:17px;color:#1a2b47}
    .rtot{font-weight:700;color:#1a2b47}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1a2b47;color:#fff;text-align:left;padding:6px 8px;font-size:10px}
    td{padding:5px 8px;border-bottom:1px solid #eef2f4}.c{text-align:center}.r{text-align:right}
    .grand{margin-top:16px;background:#eef5ec;border:1px solid #cfe3c8;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}
    .grand .lbl{font-size:15px;font-weight:700;color:#1a2b47}.grand .amt{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#2a6a4a}
    .approve{margin-top:26px;border-top:2px solid #1a2b47;padding-top:18px}
    .approve h4{font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2b47;margin-bottom:10px}
    .sigrow{display:flex;gap:40px;margin-top:24px}
    .sigbox{flex:1}.sigline{height:44px;border-bottom:1.5px solid #1a2b47}
    .siglabel{font-size:11px;color:#374151;margin-top:5px}
    .foot{margin-top:22px;font-size:10px;color:#374151;text-align:center}
    </style></head><body>
    <div class="h"><div class="logo">BRANDON HALL</div><div class="sub">HOTEL AND SPA</div></div>
    <h1>Meetings &amp; Events — Capital Budget Approval</h1>
    <div class="meta">Equipment &amp; works upgrade · Prepared ${today}</div>
    ${blocks}
    <div class="grand"><span class="lbl">Total capital budget requested</span><span class="amt">${money2dp(grand)}</span></div>
    <div class="approve">
      <h4>Approval</h4>
      <p style="font-size:11.5px;color:#4a5560">The above budget covers the equipment and works required to bring the meeting &amp; events spaces to specification. Approval is requested to proceed with procurement.</p>
      <div class="sigrow">
        <div class="sigbox"><div class="sigline"></div><div class="siglabel">Approved — Raj Kumar (Global COO)</div></div>
        <div class="sigbox"><div class="sigline"></div><div class="siglabel">Date</div></div>
      </div>
    </div>
    <div class="foot">Brandon Hall Hotel and Spa · Main Street, Brandon, Coventry CV8 3FW · 024 7710 2555</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  win.document.close();
}

/* ---- Maintenance Job Sheets (per room) — for the house maintenance team ---- */
function printJobSheets(){
  const today=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  // turn equipment items into install tasks
  const taskVerb=(it)=>{ const n=(it.item||"").toLowerCase();
    if(n.includes("tv")||n.includes("screen")) return "Install & mount";
    if(n.includes("air con")||n.includes("cassette")||n.includes("ac ")) return "Fit";
    if(n.includes("socket")||n.includes("power")) return "Fit / replace";
    if(n.includes("door")||n.includes("lock")) return "Repair";
    if(n.includes("cable")||n.includes("connector")||n.includes("clickshare")) return "Fit / connect";
    return "Install"; };
  const rooms=ROOMS.map(r=>({r,conf:MNE_ROOMS[r.id],items:MnEState.items(r.id)})).filter(x=>x.items.length||x.conf);
  const pages=rooms.map(({r,conf,items})=>{
    const rows=items.map(it=>`<tr><td class="tick">☐</td><td><b>${taskVerb(it)}</b> ${it.item}${it.size?` (${it.size})`:""}</td><td class="c">${it.qty||1}</td><td>${it.supplier||""}</td><td class="note"></td></tr>`).join("")
      || `<tr><td colspan="5" class="none">No equipment tasks listed.</td></tr>`;
    return `<div class="sheet">
      <div class="h"><div class="logo">BRANDON HALL</div><div class="sub">HOTEL AND SPA</div></div>
      <h1>Maintenance Job Sheet</h1>
      <div class="rm">${r.name}${conf&&conf.capacity?` · ${conf.capacity}`:""}</div>
      <div class="meta">Issued ${today} · House Maintenance Team</div>
      ${conf&&conf.comments?`<div class="cmt"><b>Notes:</b> ${conf.comments}</div>`:""}
      <table><tr><th></th><th>Task</th><th class="c">Qty</th><th>Supplier / kit</th><th>Done ✓ / notes</th></tr>${rows}</table>
      <div class="works"><b>Additional works required</b> (decorating, snagging, electrical, other):
        <div class="lines"></div></div>
      <div class="sigrow">
        <div class="sigbox"><div class="sigline"></div><div class="siglabel">Completed by</div></div>
        <div class="sigbox"><div class="sigline"></div><div class="siglabel">Date</div></div>
        <div class="sigbox"><div class="sigline"></div><div class="siglabel">Checked by</div></div>
      </div>
    </div>`;
  }).join("");
  const win=window.open("","_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maintenance Job Sheets — Brandon Hall</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>@page{margin:14mm}body{font-family:'Lato',sans-serif;color:#2a3644;font-size:12px}
    .sheet{max-width:800px;margin:0 auto 0;padding:10px;page-break-after:always}
    .sheet:last-child{page-break-after:auto}
    .h{text-align:center;border-bottom:2px solid #1a2b47;padding-bottom:8px}
    .logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;letter-spacing:4px;color:#1a2b47}
    .sub{font-size:10px;letter-spacing:4px;color:#c9a978;font-weight:700}
    h1{font-family:'Cormorant Garamond',serif;font-size:22px;text-align:center;color:#1a2b47;margin:12px 0 2px}
    .rm{text-align:center;font-size:15px;font-weight:700;color:#1a2b47}
    .meta{text-align:center;font-size:11px;color:#374151;margin-bottom:12px}
    .cmt{font-size:11px;background:#f6f8f9;border-radius:6px;padding:8px 10px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px}
    th{background:#1a2b47;color:#fff;text-align:left;padding:7px 8px;font-size:10.5px}
    td{padding:9px 8px;border-bottom:1px solid #e3e7ee;vertical-align:top}
    .tick{font-size:16px;text-align:center;width:28px}.c{text-align:center}
    .note{min-width:150px}.none{color:#374151;font-style:italic}
    .works{border:1px solid #e3e7ee;border-radius:8px;padding:12px;font-size:12px}
    .works .lines{height:90px;background-image:repeating-linear-gradient(#fff,#fff 27px,#e3e7ee 28px);margin-top:8px}
    .sigrow{display:flex;gap:30px;margin-top:22px}.sigbox{flex:1}
    .sigline{height:40px;border-bottom:1.5px solid #1a2b47}.siglabel{font-size:11px;color:#374151;margin-top:5px}
    </style></head><body>${pages}
    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  win.document.close();
}

function knownMnEItems(){
  const map={};
  Object.values(MNE_ROOMS).forEach(r=>(r.items||[]).forEach(it=>{ if(it.item&&!(it.item in map)) map[it.item]=it.cost||0; }));
  try{ const saved=JSON.parse(localStorage.getItem("bh_mne_items")||"{}"); Object.assign(map,saved); }catch{}
  return map;
}
function rememberMnEItem(name,cost){
  try{ const saved=JSON.parse(localStorage.getItem("bh_mne_items")||"{}"); saved[name]=cost||saved[name]||0;
    localStorage.setItem("bh_mne_items",JSON.stringify(saved)); }catch{}
}
function openMnEItemForm(roomId){
  const room=ROOMS.find(r=>r.id===roomId);
  const sizes=['43"','55"','65"','75"','86"','98"','100"'];
  const known=knownMnEItems();
  const body=`<div class="form-grid">
    <div><label>Category</label><select id="mi-cat">${MNE_CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select></div>
    <div><label>Item</label><input id="mi-item" list="mi-itemlist" placeholder="Type or pick…" autocomplete="off">
      <datalist id="mi-itemlist">${Object.keys(known).sort().map(n=>`<option value="${n.replace(/"/g,'&quot;')}">`).join("")}</datalist></div>
    <div><label>Size (screens)</label><select id="mi-size"><option value="">N/A</option>${sizes.map(s=>`<option>${s}</option>`).join("")}</select></div>
    <div><label>Quantity</label><input id="mi-qty" type="number" min="1" value="1"></div>
    <div><label>Unit cost (£)</label><input id="mi-cost" type="number" min="0" step="0.01" placeholder="0.00"></div>
    <div><label>Supplier</label><input id="mi-supplier" placeholder="e.g. AV Partner Ltd"></div>
    <div><label>Status</label><select id="mi-status">${MNE_STATUSES.map(s=>`<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join("")}</select></div>
  </div>
  <div style="margin-top:18px"><button class="btn" id="mi-save">Add item</button></div>`;
  showModal(`Add equipment — ${room.name}`,"New M&E item",body);
  // auto-fill cost when a known item is picked
  $("#mi-item").oninput=()=>{ const v=$("#mi-item").value.trim(); if(known[v]!=null && !$("#mi-cost").value){ $("#mi-cost").value=known[v]; } };
  $("#mi-save").onclick=()=>{
    const item=$("#mi-item").value.trim(); if(!item){ $("#mi-item").focus(); return; }
    const cost=parseFloat($("#mi-cost").value)||0;
    MnEState.add(roomId,{ cat:$("#mi-cat").value, item, size:$("#mi-size").value,
      qty:parseInt($("#mi-qty").value)||1, cost,
      supplier:$("#mi-supplier").value.trim(), status:$("#mi-status").value });
    rememberMnEItem(item,cost);   // save to dropdown for next time
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
  setStatus(roomId,i,status){ this.load(); this._store[roomId][i].status=status; this.save(); },
  setField(roomId,i,key,val){ this.load(); if(this._store[roomId]&&this._store[roomId][i]){ this._store[roomId][i][key]=val; this.save(); } },
  /* Merge the current MNE_ROOMS master into the store: adds any item (by name)
     a room is missing, without wiping costs/qty the user already entered. */
  mergeMaster(){ this.load();
    Object.entries(MNE_ROOMS).forEach(([rid,conf])=>{
      const existing=this._store[rid]=this._store[rid]||[];
      (conf.items||[]).forEach(mi=>{
        if(!existing.some(x=>x.item===mi.item)){ existing.push(Object.assign({},mi)); }
      });
    });
    this.save();
  }
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
/* ============================================================ BEVERAGE MANAGEMENT (portal dashboard) */
const BevStore={
  levels:null, log:[],
  async load(){
    // start from BEV_PRODUCTS, overlay saved levels
    this.levels={}; (typeof BEV_PRODUCTS!=="undefined"?BEV_PRODUCTS:[]).forEach(p=>this.levels[p.id]={...p});
    let saved=null;
    if(typeof FB!=="undefined"&&FB.ready){ try{ if(!FB.user){ await fbEnsureAnon(); } const d=await FB.db.collection("beverage").doc("levels").get(); if(d.exists) saved=d.data(); }catch(e){} }
    if(!saved){ try{ saved=JSON.parse(localStorage.getItem("bh_bev_levels")||"null"); }catch{} }
    if(saved&&saved.stock){ Object.keys(saved.stock).forEach(id=>{ if(this.levels[id]) this.levels[id].stock=saved.stock[id]; }); }
    if(typeof FB!=="undefined"&&FB.ready){ try{ const q=await FB.db.collection("beverage").doc("levels").collection("log").orderBy("at","desc").limit(500).get(); this.log=q.docs.map(d=>d.data()); }catch(e){} }
    if(!this.log.length){ try{ this.log=JSON.parse(localStorage.getItem("bh_bev_log")||"[]"); }catch{} }
  }
};

// ── Bar & Beverage Stock — seeded 2 Oct 2026 from physical count ─────────────
const BEV_STOCK_SEED = [{"id":"bev001","category":"Beer & Lager","supplier":"Matthew Clark","code":"00026639","name":"Corona 4.5%","pack":"330ml x24","unitPrice":25.09,"qty":5.67,"unit":"bottles","totalValue":142.26,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev002","category":"Beer & Lager","supplier":"Brakes","code":"119918","name":"Peroni Nastro Gluten Free NRB","pack":"330ml x24","unitPrice":37.45,"qty":4.5,"unit":"bottles","totalValue":168.53,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev003","category":"Beer & Lager","supplier":"","code":"","name":"Kopperberg Strawberry & Lime 0%","pack":"12 pack","unitPrice":12.34,"qty":1.42,"unit":"packs","totalValue":17.52,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev004","category":"Beer & Lager","supplier":"Heineken","code":"HK-HEIN00-NRB","name":"Heineken 0.0 NRB","pack":"330ml x24","unitPrice":42.04,"qty":4.21,"unit":"bottles","totalValue":176.99,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev005","category":"Cider","supplier":"Matthew Clark","code":"00033298","name":"Bulmers Red Berry & Lime","pack":"500ml x12","unitPrice":22.85,"qty":0.75,"unit":"bottles","totalValue":17.14,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev006","category":"Kegs","supplier":"Heineken","code":"HK-BEAV50","name":"Beavertown Neck Oil IPA","pack":"50L keg","unitPrice":268.43,"qty":2,"unit":"kegs","totalValue":536.86,"par":2,"lastCount":"2026-10-02","notes":""},{"id":"bev007","category":"Kegs","supplier":"Heineken","code":"HK-CRUZ50","name":"Cruzcampo","pack":"50L keg","unitPrice":133.42,"qty":2,"unit":"kegs","totalValue":266.84,"par":2,"lastCount":"2026-10-02","notes":""},{"id":"bev008","category":"Kegs","supplier":"Heineken","code":"HK-GUINNESS50","name":"Guinness Original","pack":"50L keg","unitPrice":155.82,"qty":2,"unit":"kegs","totalValue":311.64,"par":2,"lastCount":"2026-10-02","notes":""},{"id":"bev009","category":"Kegs","supplier":"Heineken","code":"HK-HEIN00-20","name":"Heineken 0.0","pack":"20L keg","unitPrice":0,"qty":0,"unit":"kegs","totalValue":0,"par":2,"lastCount":"2026-10-02","notes":""},{"id":"bev010","category":"Kegs","supplier":"Heineken","code":"HK-MORETTI50","name":"Birra Moretti","pack":"50L keg","unitPrice":150.26,"qty":3.7,"unit":"kegs","totalValue":555.96,"par":2,"lastCount":"2026-10-02","notes":""},{"id":"bev011","category":"Kegs","supplier":"Heineken","code":"HK-ORCHARD30","name":"Orchard Thieves Apple","pack":"30L keg","unitPrice":83.23,"qty":3.2,"unit":"kegs","totalValue":266.34,"par":2,"lastCount":"2026-10-02","notes":""},{"id":"bev012","category":"Liqueurs","supplier":"Matthew Clark","code":"00010137","name":"Drambuie","pack":"70cl","unitPrice":21.46,"qty":0,"unit":"bottles","totalValue":0.0,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev013","category":"Liqueurs","supplier":"Matthew Clark","code":"00010637","name":"Cointreau","pack":"70cl","unitPrice":20.77,"qty":1,"unit":"bottles","totalValue":20.77,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev014","category":"Liqueurs","supplier":"Matthew Clark","code":"00015527","name":"Disaronno Amaretto","pack":"70cl","unitPrice":17.5,"qty":1,"unit":"bottles","totalValue":17.5,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev015","category":"Liqueurs","supplier":"Matthew Clark","code":"00015530","name":"Baileys Irish Cream","pack":"70cl","unitPrice":13.13,"qty":3,"unit":"bottles","totalValue":39.39,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev016","category":"Liqueurs","supplier":"Matthew Clark","code":"00020110","name":"Aperol Aperitivo","pack":"70cl","unitPrice":11.98,"qty":3,"unit":"bottles","totalValue":35.94,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev017","category":"Liqueurs","supplier":"Matthew Clark","code":"00022497","name":"St Germain Elderflower","pack":"70cl","unitPrice":28.17,"qty":1,"unit":"bottles","totalValue":28.17,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev018","category":"Liqueurs","supplier":"Matthew Clark","code":"00029384","name":"Briot Creme de Cacao Dark","pack":"70cl","unitPrice":23.03,"qty":0.5,"unit":"bottles","totalValue":11.52,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev019","category":"Liqueurs","supplier":"Matthew Clark","code":"00031499","name":"Edinburgh R&G Liqueur 20%","pack":"50cl","unitPrice":10.52,"qty":2,"unit":"bottles","totalValue":21.04,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev020","category":"Liqueurs","supplier":"Matthew Clark","code":"00040723","name":"Kahlua Coffee Liqueur","pack":"70cl","unitPrice":14.52,"qty":2,"unit":"bottles","totalValue":29.04,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev021","category":"Liqueurs","supplier":"Matthew Clark","code":"00045236","name":"Malibu","pack":"1.5L","unitPrice":27.01,"qty":1,"unit":"bottles","totalValue":27.01,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev022","category":"Liqueurs","supplier":"Matthew Clark","code":"00046985","name":"M Briz Cacao Brown 20%","pack":"70cl","unitPrice":9.8,"qty":0,"unit":"bottles","totalValue":0.0,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev023","category":"Liqueurs","supplier":"","code":"","name":"Campari","pack":"70cl","unitPrice":16.75,"qty":1,"unit":"bottles","totalValue":16.75,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev024","category":"Liqueurs","supplier":"","code":"","name":"Martini Rosso","pack":"70cl","unitPrice":10.49,"qty":1.5,"unit":"bottles","totalValue":15.73,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev025","category":"Liqueurs","supplier":"","code":"","name":"Licor 43","pack":"70cl","unitPrice":21.24,"qty":1.2,"unit":"bottles","totalValue":25.49,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev026","category":"Liqueurs","supplier":"","code":"","name":"Coco Real Squeeze Coconut","pack":"","unitPrice":6.49,"qty":1.5,"unit":"bottles","totalValue":9.73,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev027","category":"Soft Drinks & Mixers","supplier":"Matthew Clark","code":"00040437","name":"Britvic Lime Cordial PET","pack":"1L x12","unitPrice":24.67,"qty":0.3,"unit":"cases","totalValue":7.4,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev028","category":"Soft Drinks & Mixers","supplier":"Matthew Clark","code":"00040439","name":"Britvic Blackcurrant Cordial PET","pack":"1L x12","unitPrice":24.67,"qty":1.25,"unit":"cases","totalValue":30.84,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev029","category":"Soft Drinks & Mixers","supplier":"Matthew Clark","code":"00042132","name":"Harrogate Still NRB","pack":"330ml x24","unitPrice":8.77,"qty":3.96,"unit":"cases","totalValue":34.73,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev030","category":"Soft Drinks & Mixers","supplier":"Matthew Clark","code":"00042133","name":"Harrogate Sparkling 750ml NRB","pack":"750ml x12","unitPrice":8.21,"qty":2.92,"unit":"cases","totalValue":23.97,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev031","category":"Soft Drinks & Mixers","supplier":"Matthew Clark","code":"00042134","name":"Harrogate Sparkling 330ml NRB","pack":"330ml x24","unitPrice":8.77,"qty":0.75,"unit":"cases","totalValue":6.58,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev032","category":"Soft Drinks & Mixers","supplier":"Brakes","code":"10734","name":"Folkington's Pure Orange Juice","pack":"250ml","unitPrice":13.49,"qty":58,"unit":"bottles","totalValue":782.42,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev033","category":"Soft Drinks & Mixers","supplier":"Brakes","code":"10735","name":"Folkington's Pure Apple Juice","pack":"250ml","unitPrice":14.49,"qty":37,"unit":"bottles","totalValue":536.13,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev034","category":"Soft Drinks & Mixers","supplier":"Brakes","code":"FT-TONIC","name":"Fever Tree Tonic Water","pack":"200ml x8","unitPrice":17.44,"qty":19.5,"unit":"cases","totalValue":340.08,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev035","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-COKE-NRB","name":"Coca Cola NRB","pack":"330ml x24","unitPrice":32.23,"qty":4.54,"unit":"cases","totalValue":146.32,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev036","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-COKEZERO-NRB","name":"Coca Cola Zero NRB","pack":"330ml x24","unitPrice":30.09,"qty":3.42,"unit":"cases","totalValue":102.91,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev037","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-DIETCOKE-NRB","name":"Diet Coke NRB","pack":"330ml x24","unitPrice":30.18,"qty":7.33,"unit":"cases","totalValue":221.22,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev038","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-FRANKLIN","name":"Franklin Brewed Ginger Beer","pack":"200ml x24","unitPrice":20.45,"qty":1.71,"unit":"cases","totalValue":34.97,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev039","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-FT-LIGHTTON","name":"Fever Tree Light Tonic","pack":"200ml x24","unitPrice":16.94,"qty":6.83,"unit":"cases","totalValue":115.7,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev040","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-FT-PREMLEM","name":"Fever Tree Premium Lemonade","pack":"200ml x24","unitPrice":17.93,"qty":4.67,"unit":"cases","totalValue":83.73,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev041","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-FT-SODA","name":"Fever Tree Soda Water","pack":"200ml x24","unitPrice":16.94,"qty":4.54,"unit":"cases","totalValue":76.91,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev042","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-J2O-APPMAN","name":"J2O Apple & Mango","pack":"275ml x24","unitPrice":27.9,"qty":1.75,"unit":"cases","totalValue":48.82,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev043","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-J2O-APPRASP","name":"J2O Apple & Raspberry","pack":"275ml x24","unitPrice":27.9,"qty":1.63,"unit":"cases","totalValue":45.48,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev044","category":"Soft Drinks & Mixers","supplier":"Heineken","code":"HK-J2O-ORGPAS","name":"J2O Orange & Passionfruit","pack":"275ml x24","unitPrice":27.9,"qty":2.21,"unit":"cases","totalValue":61.66,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev045","category":"Soft Drinks & Mixers","supplier":"","code":"","name":"Schwepps Lime Cordial","pack":"12 pack","unitPrice":22.22,"qty":0.5,"unit":"packs","totalValue":11.11,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev046","category":"Soft Drinks & Mixers","supplier":"","code":"","name":"Moni Watermelon","pack":"","unitPrice":5.49,"qty":1.5,"unit":"bottles","totalValue":8.23,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev047","category":"Soft Drinks & Mixers","supplier":"","code":"","name":"Monin Grenadine","pack":"","unitPrice":5.49,"qty":1.5,"unit":"bottles","totalValue":8.23,"par":24,"lastCount":"2026-10-02","notes":""},{"id":"bev048","category":"Sparkling","supplier":"Matthew Clark","code":"00029604","name":"Galanti Prosecco Frizzante","pack":"75cl x6","unitPrice":7.43,"qty":16,"unit":"bottles","totalValue":118.88,"par":6,"lastCount":"2026-10-02","notes":""},{"id":"bev049","category":"Sparkling","supplier":"","code":"","name":"Galanti Prosecco Ros\u00e9","pack":"75cl x6","unitPrice":7.43,"qty":5,"unit":"bottles","totalValue":37.15,"par":6,"lastCount":"2026-10-02","notes":""},{"id":"bev050","category":"Sparkling","supplier":"Matthew Clark","code":"00044719","name":"Casa Bottega Prosecco","pack":"75cl x6","unitPrice":7.78,"qty":0,"unit":"bottles","totalValue":0.0,"par":6,"lastCount":"2026-10-02","notes":""},{"id":"bev051","category":"Sparkling","supplier":"","code":"","name":"Prosecco Acquerello","pack":"75cl x12","unitPrice":6.29,"qty":20,"unit":"bottles","totalValue":125.8,"par":6,"lastCount":"2026-10-02","notes":""},{"id":"bev052","category":"Sparkling / Champagne","supplier":"Matthew Clark","code":"00011087","name":"Taittinger Brut Reserve","pack":"75cl x6","unitPrice":33.45,"qty":3,"unit":"bottles","totalValue":100.35,"par":6,"lastCount":"2026-10-02","notes":""},{"id":"bev053","category":"Spirits - Cognac","supplier":"Heineken","code":"HK-COURVOISIER","name":"Courvoisier VS 40%","pack":"70cl","unitPrice":24.57,"qty":2.3,"unit":"bottles","totalValue":56.51,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev054","category":"Spirits - Cognac","supplier":"","code":"","name":"Hennessy","pack":"70cl","unitPrice":32.08,"qty":1.5,"unit":"bottles","totalValue":48.12,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev055","category":"Spirits - Cognac","supplier":"","code":"","name":"Remy Martin","pack":"70cl","unitPrice":33.42,"qty":1.6,"unit":"bottles","totalValue":53.47,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev056","category":"Spirits - Gin","supplier":"Matthew Clark","code":"00015492","name":"Bombay Sapphire Gin","pack":"70cl","unitPrice":19.68,"qty":4.3,"unit":"bottles","totalValue":84.62,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev057","category":"Spirits - Gin","supplier":"Matthew Clark","code":"00027837","name":"Gin Mare","pack":"70cl","unitPrice":32.56,"qty":2.7,"unit":"bottles","totalValue":87.91,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev058","category":"Spirits - Gin","supplier":"Matthew Clark","code":"00038189","name":"Edinburgh R&G Gin 40%","pack":"70cl","unitPrice":21.92,"qty":1.3,"unit":"bottles","totalValue":28.5,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev059","category":"Spirits - Gin","supplier":"Matthew Clark","code":"00040240","name":"Tanqueray No.Ten 47.3%","pack":"70cl","unitPrice":28.82,"qty":1,"unit":"bottles","totalValue":28.82,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev060","category":"Spirits - Gin","supplier":"Matthew Clark","code":"00046586","name":"Gordons Pink 35%","pack":"70cl","unitPrice":14.73,"qty":2.75,"unit":"bottles","totalValue":40.51,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev061","category":"Spirits - Gin","supplier":"Heineken","code":"HK-BOMBAY-CITRON","name":"Bombay Citron Presse 37.5%","pack":"70cl","unitPrice":22.45,"qty":1,"unit":"bottles","totalValue":22.45,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev062","category":"Spirits - Gin","supplier":"Heineken","code":"HK-GORDGIN","name":"Gordons Gin 37.5%","pack":"70cl","unitPrice":15.88,"qty":1.3,"unit":"bottles","totalValue":20.64,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev063","category":"Spirits - Gin","supplier":"Heineken","code":"HK-GORDMOR","name":"Gordons Morello Cherry 37.5%","pack":"70cl","unitPrice":17.87,"qty":1.75,"unit":"bottles","totalValue":31.27,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev064","category":"Spirits - Gin","supplier":"Heineken","code":"HK-HENDRICKS","name":"Hendricks Gin 41.4%","pack":"70cl","unitPrice":26.73,"qty":2,"unit":"bottles","totalValue":53.46,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev065","category":"Spirits - Gin","supplier":"","code":"","name":"Pimms","pack":"70cl","unitPrice":16.42,"qty":3,"unit":"bottles","totalValue":49.26,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev066","category":"Spirits - Gin","supplier":"","code":"","name":"Hendricks Orange","pack":"70cl","unitPrice":27.0,"qty":1,"unit":"bottles","totalValue":27.0,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev067","category":"Spirits - Gin","supplier":"Heineken","code":"HK-TANQ-AF","name":"Tanqueray Alcohol Free 0%","pack":"70cl","unitPrice":13.52,"qty":1,"unit":"bottles","totalValue":13.52,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev068","category":"Spirits - Rum","supplier":"Matthew Clark","code":"00015799","name":"Captain Morgan Spiced","pack":"1.5L","unitPrice":31.04,"qty":1.2,"unit":"bottles","totalValue":37.25,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev069","category":"Spirits - Rum","supplier":"","code":"","name":"Captain Morgan Dark Rum","pack":"70cl","unitPrice":15.96,"qty":1.75,"unit":"bottles","totalValue":27.93,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev070","category":"Spirits - Rum","supplier":"","code":"","name":"Captain Morgan Dark Spiced","pack":"70cl","unitPrice":19.91,"qty":1.75,"unit":"bottles","totalValue":34.84,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev071","category":"Spirits - Rum","supplier":"Matthew Clark","code":"00026502","name":"Kraken Black Spiced Rum","pack":"70cl","unitPrice":25.04,"qty":2.2,"unit":"bottles","totalValue":55.09,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev072","category":"Spirits - Rum","supplier":"Heineken","code":"HK-BACARDI","name":"Bacardi Rum 37.5%","pack":"70cl","unitPrice":17.28,"qty":0.25,"unit":"bottles","totalValue":4.32,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev073","category":"Spirits - Tequila","supplier":"Matthew Clark","code":"00047387","name":"Jose Cuervo Esp Gold 35%","pack":"70cl","unitPrice":18.15,"qty":0.75,"unit":"bottles","totalValue":13.61,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev074","category":"Spirits - Tequila","supplier":"Heineken","code":"HK-JC-SILVER","name":"Jose Cuervo Silver 35%","pack":"70cl","unitPrice":19.8,"qty":2,"unit":"bottles","totalValue":39.6,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev075","category":"Spirits - Tequila","supplier":"","code":"","name":"Buen Amigo Gold","pack":"70cl","unitPrice":15.89,"qty":0.9,"unit":"bottles","totalValue":14.3,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev076","category":"Spirits - Tequila","supplier":"","code":"","name":"Buen Amigo Silver","pack":"70cl","unitPrice":15.89,"qty":1.8,"unit":"bottles","totalValue":28.6,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev077","category":"Spirits - Tequila","supplier":"","code":"","name":"Casamigos","pack":"70cl","unitPrice":35.39,"qty":0.8,"unit":"bottles","totalValue":28.31,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev078","category":"Spirits - Vodka","supplier":"Heineken","code":"HK-ABS-BLUE","name":"Absolut Blue 40%","pack":"70cl","unitPrice":16.18,"qty":2.5,"unit":"bottles","totalValue":40.45,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev079","category":"Spirits - Vodka","supplier":"Heineken","code":"HK-ABS-RASP","name":"Absolut Raspberri 38%","pack":"70cl","unitPrice":17.77,"qty":0.75,"unit":"bottles","totalValue":13.33,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev080","category":"Spirits - Vodka","supplier":"Heineken","code":"HK-ABS-VAN","name":"Absolut Vanilia 38%","pack":"70cl","unitPrice":17.82,"qty":2.2,"unit":"bottles","totalValue":39.2,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev081","category":"Spirits - Vodka","supplier":"Heineken","code":"HK-GREYGOOSE","name":"Grey Goose Vodka 40%","pack":"70cl","unitPrice":35.24,"qty":1.7,"unit":"bottles","totalValue":59.91,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev082","category":"Spirits - Vodka","supplier":"Heineken","code":"HK-SMIRNOFF","name":"Smirnoff Red 37.5%","pack":"70cl","unitPrice":13.61,"qty":1,"unit":"bottles","totalValue":13.61,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev083","category":"Spirits - Whiskey","supplier":"Brakes","code":"130920","name":"Jameson Irish Whiskey","pack":"70cl","unitPrice":24.11,"qty":1,"unit":"bottles","totalValue":24.11,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev084","category":"Spirits - Whiskey","supplier":"Heineken","code":"HK-BULLEIT","name":"Bulleit Bourbon 45%","pack":"70cl","unitPrice":25.85,"qty":1,"unit":"bottles","totalValue":25.85,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev085","category":"Spirits - Whiskey","supplier":"Heineken","code":"HK-JD-TENN","name":"Jack Daniels Tennessee 40%","pack":"70cl","unitPrice":20.79,"qty":2,"unit":"bottles","totalValue":41.58,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev086","category":"Spirits - Whiskey","supplier":"","code":"","name":"JD Tennessee Honey","pack":"70cl","unitPrice":24.35,"qty":3.5,"unit":"bottles","totalValue":85.23,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev087","category":"Spirits - Whiskey","supplier":"","code":"","name":"Fireball","pack":"70cl","unitPrice":22.3,"qty":0.8,"unit":"bottles","totalValue":17.84,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev088","category":"Spirits - Whiskey","supplier":"","code":"","name":"Jager","pack":"70cl","unitPrice":21.66,"qty":0.7,"unit":"bottles","totalValue":15.16,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev089","category":"Spirits - Whisky","supplier":"Matthew Clark","code":"00010520","name":"Laphroaig 10yo","pack":"70cl","unitPrice":36.16,"qty":1.65,"unit":"bottles","totalValue":59.66,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev090","category":"Spirits - Whisky","supplier":"Matthew Clark","code":"00018213","name":"Monkey Shoulder Malt","pack":"70cl","unitPrice":21.94,"qty":1,"unit":"bottles","totalValue":21.94,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev091","category":"Spirits - Whisky","supplier":"Matthew Clark","code":"00046437","name":"Glenmorangie Orig 12yo","pack":"70cl","unitPrice":28.33,"qty":1.5,"unit":"bottles","totalValue":42.49,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev092","category":"Spirits - Whisky","supplier":"Matthew Clark","code":"00047689","name":"Famous Grouse Whisky","pack":"70cl","unitPrice":14.2,"qty":0,"unit":"bottles","totalValue":0.0,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev093","category":"Spirits - Whisky","supplier":"Heineken","code":"HK-CHIVAS","name":"Chivas Regal 12yo 40%","pack":"70cl","unitPrice":29.39,"qty":1,"unit":"bottles","totalValue":29.39,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev094","category":"Spirits - Whisky","supplier":"Heineken","code":"HK-GLENFIDDICH","name":"Glenfiddich Special 40%","pack":"70cl","unitPrice":32.17,"qty":4.4,"unit":"bottles","totalValue":141.55,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev095","category":"Spirits - Whisky","supplier":"Heineken","code":"HK-TALISKER","name":"Talisker 10yo 45.8%","pack":"70cl","unitPrice":37.0,"qty":0.8,"unit":"bottles","totalValue":29.6,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev096","category":"Spirits - Whisky","supplier":"","code":"","name":"Dow's Port","pack":"75cl x6","unitPrice":67.5,"qty":0.67,"unit":"bottles","totalValue":45.23,"par":3,"lastCount":"2026-10-02","notes":""},{"id":"bev097","category":"Wine - Red","supplier":"Matthew Clark","code":"00029058","name":"Nederburg HH Motorcycle","pack":"75cl","unitPrice":12.68,"qty":6,"unit":"bottles","totalValue":76.08,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev098","category":"Wine - Red","supplier":"Matthew Clark","code":"00044810","name":"Corte Vigna Merlot","pack":"75cl","unitPrice":4.95,"qty":52,"unit":"bottles","totalValue":257.4,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev099","category":"Wine - Red","supplier":"Matthew Clark","code":"00047057","name":"Nyala Cabernet Sauvignon 12.5%","pack":"75cl","unitPrice":5.09,"qty":13,"unit":"bottles","totalValue":66.17,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev100","category":"Wine - Red","supplier":"","code":"","name":"Club De Campo Malbec","pack":"75cl","unitPrice":7.65,"qty":7.6,"unit":"bottles","totalValue":58.14,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev101","category":"Wine - Red","supplier":"","code":"","name":"St Hallett Shiraz","pack":"75cl","unitPrice":12.43,"qty":23,"unit":"bottles","totalValue":285.89,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev102","category":"Wine - Red","supplier":"","code":"","name":"Rioja","pack":"75cl x6","unitPrice":36.42,"qty":1.5,"unit":"bottles","totalValue":54.63,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev103","category":"Wine - Red","supplier":"","code":"","name":"Bello Pino","pack":"75cl","unitPrice":6.09,"qty":51,"unit":"bottles","totalValue":310.59,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev104","category":"Wine - Ros\u00e9","supplier":"Matthew Clark","code":"00047138","name":"Mirabello Forever Summer 12.5%","pack":"75cl","unitPrice":10.4,"qty":48.9,"unit":"bottles","totalValue":508.56,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev105","category":"Wine - Ros\u00e9","supplier":"Matthew Clark","code":"00048286","name":"Wicked Lady White Zinfandel","pack":"75cl","unitPrice":4.72,"qty":14.9,"unit":"bottles","totalValue":70.33,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev106","category":"Wine - Ros\u00e9","supplier":"","code":"","name":"Bello Ros\u00e9","pack":"75cl","unitPrice":6.09,"qty":30,"unit":"bottles","totalValue":182.7,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev107","category":"Wine - White","supplier":"Matthew Clark","code":"00043818","name":"Icauna Petit Chablis","pack":"75cl","unitPrice":12.0,"qty":6,"unit":"bottles","totalValue":72.0,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev108","category":"Wine - White","supplier":"Matthew Clark","code":"00045856","name":"Nyala Sauvignon Blanc 11%","pack":"75cl","unitPrice":4.81,"qty":24,"unit":"bottles","totalValue":115.44,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev109","category":"Wine - White","supplier":"Matthew Clark","code":"00046063","name":"Vita Lucido Pinot Grigio 10.5%","pack":"75cl","unitPrice":5.11,"qty":42.9,"unit":"bottles","totalValue":219.22,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev110","category":"Wine - White","supplier":"Matthew Clark","code":"00049002","name":"Icauna Chablis","pack":"75cl","unitPrice":13.95,"qty":0,"unit":"bottles","totalValue":0.0,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev111","category":"Wine - White","supplier":"","code":"","name":"Haystack Chardonnay","pack":"75cl","unitPrice":8.16,"qty":4.2,"unit":"bottles","totalValue":34.27,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev112","category":"Wine - White","supplier":"","code":"","name":"Villa Blanche Chardonnay","pack":"75cl","unitPrice":8.89,"qty":8,"unit":"bottles","totalValue":71.12,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev113","category":"Wine - White","supplier":"","code":"","name":"Turtle Bay Sauvignon Blanc","pack":"75cl","unitPrice":8.29,"qty":51,"unit":"bottles","totalValue":422.79,"par":12,"lastCount":"2026-10-02","notes":""},{"id":"bev114","category":"Wine - White","supplier":"","code":"","name":"Serrenello","pack":"75cl","unitPrice":5.49,"qty":4,"unit":"bottles","totalValue":21.96,"par":12,"lastCount":"2026-10-02","notes":""}];

const BEV_CATS = ['Beer & Lager','Cider','Kegs','Spirits - Gin','Spirits - Vodka',
  'Spirits - Rum','Spirits - Whisky','Spirits - Whiskey','Spirits - Tequila',
  'Spirits - Cognac','Liqueurs','Wine - Red','Wine - White','Wine - Rosé',
  'Sparkling','Sparkling / Champagne','Soft Drinks & Mixers'];

function bevGetStock(){
  const stored=localStorage.getItem('bh_bev_stock');
  if(stored) return JSON.parse(stored);
  const seed=BEV_STOCK_SEED.map(s=>Object.assign({},s));
  localStorage.setItem('bh_bev_stock',JSON.stringify(seed));
  return seed;
}
function bevSave(d){ localStorage.setItem('bh_bev_stock',JSON.stringify(d)); }

function renderBeverage(v){
  v.innerHTML=''; v.style.padding='0';
  const stock=bevGetStock();
  const search=window._bevSearch||'', cat=window._bevCat||'all';
  let items=stock;
  if(search) items=items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())||i.category.toLowerCase().includes(search.toLowerCase())||i.supplier.toLowerCase().includes(search.toLowerCase()));
  if(cat!=='all') items=items.filter(i=>i.category===cat);

  const totalVal=stock.reduce((t,i)=>t+i.totalValue,0);
  const lowStock=stock.filter(i=>i.qty<i.par&&i.qty>0).length;
  const outOfStock=stock.filter(i=>i.qty===0).length;
  const lastCount=stock[0]?.lastCount||'';

  // Category totals
  const catTotals={};
  BEV_CATS.forEach(c=>{ const its=stock.filter(i=>i.category===c); catTotals[c]={count:its.length,value:its.reduce((t,i)=>t+i.totalValue,0),low:its.filter(i=>i.qty<i.par&&i.qty>0).length}; });

  const rows=items.map(item=>{
    const isLow=item.qty>0&&item.qty<item.par;
    const isOut=item.qty===0;
    const rowBg=isOut?'#fff5f5':isLow?'#fffbeb':'';
    const qtyCol=isOut?'#991b1b':isLow?'#854d0e':'#166534';
    return `<tr style="border-bottom:1px solid #e5e7eb;${rowBg?'background:'+rowBg:''}">
      <td style="padding:9px 12px">
        <div style="font-size:13px;font-weight:600;color:#1a2b3a">${item.name}</div>
        <div style="font-size:11px;color:#374151">${item.supplier||''}</div>
      </td>
      <td style="padding:9px 8px"><span style="font-size:11px;color:#374151;background:#f3f4f6;padding:2px 7px;border-radius:8px">${item.category}</span></td>
      <td style="padding:9px 8px;font-size:11px;color:#374151">${item.pack||''}</td>
      <td style="padding:9px 8px">
        <div style="display:flex;align-items:center;gap:8px">
          <button onclick="bevAdjQty('${item.id}',-0.25)" style="width:26px;height:26px;border:1.5px solid #d1d5db;border-radius:6px;background:#fff;font:600 13px Lato;cursor:pointer;color:#374151;display:flex;align-items:center;justify-content:center">−</button>
          <input type="number" step="0.25" min="0" value="${item.qty}" data-id="${item.id}"
            onchange="bevUpdateQty(this)"
            style="width:60px;padding:5px;border:1.5px solid #d1d5db;border-radius:6px;font:600 13px Lato;text-align:center;color:${qtyCol}">
          <button onclick="bevAdjQty('${item.id}',0.25)" style="width:26px;height:26px;border:1.5px solid #d1d5db;border-radius:6px;background:#fff;font:600 13px Lato;cursor:pointer;color:#374151;display:flex;align-items:center;justify-content:center">+</button>
        </div>
      </td>
      <td style="padding:9px 8px;font-size:12px;color:#374151">Par: ${item.par}</td>
      <td style="padding:9px 8px;font-size:12px;font-weight:600;color:#1a2b3a">£${item.totalValue.toFixed(2)}</td>
      <td style="padding:9px 8px">
        ${isOut?'<span style="font-size:11px;font-weight:700;color:#991b1b">OUT</span>':isLow?'<span style="font-size:11px;font-weight:700;color:#854d0e">⚠ Low</span>':'<span style="font-size:11px;color:#166534">✓ OK</span>'}
      </td>
    </tr>`;
  }).join('');

  v.innerHTML=`<div style="padding:20px 28px;min-height:100%;background:#f0f4f8">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a">Bar Stock</div>
        <div style="font-size:13px;color:#374151">Last count: ${lastCount ? new Date(lastCount).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '—'} · ${items.length} of ${stock.length} items shown</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="bevImportModal()" style="padding:8px 14px;background:#2f6f9e;color:#fff;border:none;border-radius:8px;font:700 12px Lato;cursor:pointer">📤 Upload count</button>
        <button onclick="bevAddItem()" style="padding:8px 14px;background:#1a2b3a;color:#fff;border:none;border-radius:8px;font:700 12px Lato;cursor:pointer">+ Add item</button>
        <button onclick="bevExport()" style="padding:8px 14px;background:#fff;border:1.5px solid #d1d5db;border-radius:8px;font:700 12px Lato;cursor:pointer;color:#1a2b3a">⬇ Export</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      ${[
        {label:'Total Stock Value',val:'£'+totalVal.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}),col:'#1a2b3a',bg:'#fff'},
        {label:'Items',val:stock.length,col:'#1a2b3a',bg:'#fff'},
        {label:'Low Stock',val:lowStock,col:'#854d0e',bg:'#fffbeb'},
        {label:'Out of Stock',val:outOfStock,col:'#991b1b',bg:'#fff5f5'},
      ].map(s=>`<div style="background:${s.bg};border-radius:10px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <div style="font-size:22px;font-weight:700;color:${s.col}">${s.val}</div>
        <div style="font-size:11px;color:#374151;margin-top:2px">${s.label}</div>
      </div>`).join('')}
    </div>

    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <input type="text" placeholder="🔍 Search..." value="${search}"
        oninput="window._bevSearch=this.value;renderBeverage(document.getElementById('view'))"
        style="flex:1;min-width:180px;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
      <select onchange="window._bevCat=this.value;renderBeverage(document.getElementById('view'))"
        style="padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
        <option value="all"${cat==='all'?' selected':''}>All categories</option>
        ${BEV_CATS.map(c=>`<option value="${c}"${cat===c?' selected':''}>${c} (${catTotals[c]?.count||0})</option>`).join('')}
      </select>
    </div>

    <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#1a2b3a">
          ${['Product','Category','Pack Size','Qty (editable)','Par Level','Value','Status'].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function bevUpdateQty(input){
  const stock=bevGetStock(), id=input.dataset.id, item=stock.find(i=>i.id===id); if(!item) return;
  const newQty=parseFloat(input.value)||0;
  item.qty=Math.max(0,newQty);
  item.totalValue=Math.round(item.qty*item.unitPrice*100)/100;
  item.lastCount=new Date().toISOString().slice(0,10);
  bevSave(stock);
  // Update displayed value
  const row=input.closest('tr');
  if(row){
    const valCell=row.cells[5]; if(valCell) valCell.textContent='£'+item.totalValue.toFixed(2);
    const statCell=row.cells[6];
    if(statCell) statCell.innerHTML=item.qty===0?'<span style="font-size:11px;font-weight:700;color:#991b1b">OUT</span>':item.qty<item.par?'<span style="font-size:11px;font-weight:700;color:#854d0e">⚠ Low</span>':'<span style="font-size:11px;color:#166534">✓ OK</span>';
  }
  toast('Qty updated ✓');
}

function bevAdjQty(id,delta){
  const stock=bevGetStock(), item=stock.find(i=>i.id===id); if(!item) return;
  item.qty=Math.max(0,Math.round((item.qty+delta)*100)/100);
  item.totalValue=Math.round(item.qty*item.unitPrice*100)/100;
  item.lastCount=new Date().toISOString().slice(0,10);
  bevSave(stock);
  renderBeverage(document.getElementById('view'));
}

function bevAddItem(){
  openModal(`<div style="padding:4px"><div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add stock item</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div style="grid-column:span 2"><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Product name</label>
        <input type="text" id="bev-name" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Category</label>
        <select id="bev-cat" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
          ${BEV_CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Supplier</label>
        <input type="text" id="bev-sup" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Unit price (ex-VAT)</label>
        <input type="number" id="bev-price" step="0.01" placeholder="0.00" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Current qty</label>
        <input type="number" id="bev-qty" step="0.25" placeholder="0" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Par level</label>
        <input type="number" id="bev-par" placeholder="6" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:10px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Pack size</label>
        <input type="text" id="bev-pack" placeholder="70cl" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="bevDoAdd()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Add item</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div></div>`);
}

function bevDoAdd(){
  const name=document.getElementById('bev-name')?.value.trim(); if(!name){toast('Enter a name');return;}
  const qty=parseFloat(document.getElementById('bev-qty')?.value)||0;
  const price=parseFloat(document.getElementById('bev-price')?.value)||0;
  const stock=bevGetStock();
  stock.push({id:'bev'+Date.now(),name,category:document.getElementById('bev-cat')?.value||'Other',supplier:document.getElementById('bev-sup')?.value||'',
    pack:document.getElementById('bev-pack')?.value||'',unitPrice:price,qty,totalValue:Math.round(qty*price*100)/100,
    par:parseInt(document.getElementById('bev-par')?.value)||6,lastCount:new Date().toISOString().slice(0,10),notes:''});
  bevSave(stock); closeModal(); renderBeverage(document.getElementById('view')); toast('✓ Item added');
}

function bevExport(){
  const stock=bevGetStock();
  const csv=['Category,Supplier,Product,Pack,Qty,Par,Unit Price,Total Value,Status,Last Count',
    ...stock.map(i=>[i.category,i.supplier,i.name,i.pack,i.qty,i.par,i.unitPrice,i.totalValue.toFixed(2),
      i.qty===0?'OUT':i.qty<i.par?'LOW':'OK',i.lastCount].map(v=>`"${v}"`).join(','))].join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='brandon-hall-bar-stock-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
  toast('✓ Stock exported to CSV');
}

function bevImportModal(){
  openModal(`<div style="padding:4px">
    <div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:8px">📤 Upload stock count</div>
    <div style="font-size:13px;color:#374151;margin-bottom:14px">Upload a CSV with columns: Product, Qty<br>or the same format as the export.</div>
    <input type="file" id="bev-csv-file" accept=".csv" style="width:100%;margin-bottom:12px">
    <div id="bev-import-preview" style="font-size:12px;color:#374151;margin-bottom:12px"></div>
    <div style="display:flex;gap:8px">
      <button onclick="bevProcessImport()" style="flex:1;padding:11px;background:#2f6f9e;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Import & update</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`);
  document.getElementById('bev-csv-file')?.addEventListener('change',function(){
    const f=this.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=e=>{
      const lines=e.target.result.split('\n').slice(1).filter(l=>l.trim());
      document.getElementById('bev-import-preview').textContent='Found '+lines.length+' items in file — click Import to update quantities';
    }; r.readAsText(f);
  });
}

function bevProcessImport(){
  const fileInput=document.getElementById('bev-csv-file');
  if(!fileInput?.files[0]){toast('Please select a CSV file');return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const lines=e.target.result.split('\n').filter(l=>l.trim());
    const stock=bevGetStock();
    let updated=0;
    lines.slice(1).forEach(line=>{
      const cols=line.split(',').map(c=>c.replace(/^"|"$/g,'').trim());
      const nameCol=cols[2]||cols[0]; const qtyCol=parseFloat(cols[4]||cols[1])||0;
      const item=stock.find(i=>i.name.toLowerCase()===nameCol.toLowerCase());
      if(item){ item.qty=qtyCol; item.totalValue=Math.round(item.qty*item.unitPrice*100)/100; item.lastCount=new Date().toISOString().slice(0,10); updated++; }
    });
    bevSave(stock); closeModal();
    renderBeverage(document.getElementById('view'));
    toast('✓ Updated '+updated+' items from import');
  };
  reader.readAsText(fileInput.files[0]);
}


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
    <div class="mp-sub2">HOTEL AND SPA</div>
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
    .subtitle{font-style:italic;color:#374151;font-size:14px;margin-bottom:26px}
    .course{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#BB9979;
      margin:26px 0 12px;text-transform:uppercase;letter-spacing:2px;position:relative}
    .course::before,.course::after{content:"";position:absolute;top:50%;width:40px;height:1px;background:#e0d5c5}
    .course::before{left:calc(50% - 90px)}.course::after{right:calc(50% - 90px)}
    .dish{margin-bottom:14px}.dn{font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2230}
    .dn .dp{color:#9d7d5f;font-size:14px;margin-left:8px}
    .dd{font-size:12px;color:#374151;font-style:italic;margin-top:2px}
    .price{font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a2b47;margin:28px 0 0;font-weight:600}
    .footer{font-size:9.5px;color:#9aa2ad;margin-top:34px;border-top:1px solid #e8dccf;padding-top:14px;line-height:1.5}</style>
    </head><body><div class="menu">
      <div class="logo">BRANDON HALL</div><div class="sub2">HOTEL AND SPA</div>
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

/* ============================================================ GROUP CONFIGURATOR */
function renderGroupConfig(v){
  v.appendChild(head("Group Room Configurator","Enter your party, set your available rooms and pricing — the tool works out the optimal allocation, minimum rooms needed, and total cost with B&B and DBB options."));

  const wrap=el("div"); wrap.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start";

  /* ---- LEFT PANEL: Inputs ---- */
  const left=el("div");

  /* Party */
  left.innerHTML=`
  <div class="quote-panel" style="margin-bottom:14px">
    <h3 style="margin-bottom:12px">👥 Party</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div class="field"><label>Adults</label><input type="number" id="gc-adults" min="0" value="14" style="font-size:16px;font-weight:700"></div>
      <div class="field"><label>Children <span class="qs-sub">(up to 16)</span></label><input type="number" id="gc-children" min="0" value="6"></div>
      <div class="field"><label>Babies <span class="qs-sub">(cot age)</span></label><input type="number" id="gc-babies" min="0" value="2"></div>
    </div>
    <div class="field" style="margin-top:8px"><label>Nights</label>
      <input type="number" id="gc-nights" min="1" value="1" style="width:80px">
    </div>
  </div>

  <div class="quote-panel" style="margin-bottom:14px">
    <h3 style="margin-bottom:4px">🛏️ Available room types</h3>
    <p class="qs-sub" style="margin-bottom:12px">Set how many of each type you have available tonight and their prices. Tick options that apply.</p>
    <div id="gc-room-types"></div>
    <button class="btn ghost sm" id="gc-add-type" style="margin-top:10px">+ Add room type</button>
  </div>

  <div class="quote-panel" style="margin-bottom:14px">
    <h3 style="margin-bottom:12px">🍳 Meal plan prices <span class="qs-sub">(per person per night)</span></h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>B&B rate (pp/night)</label><input type="number" id="gc-bb" min="0" value="75" step="0.01"></div>
      <div class="field"><label>DBB rate (pp/night)</label><input type="number" id="gc-dbb" min="0" value="130" step="0.01"></div>
    </div>
    <p class="qs-sub">Extra bed: £25/night (added automatically when ticked per room type)</p>
  </div>

  <button class="btn block" id="gc-calc" style="background:#4a7c59;font-size:16px;padding:16px">
    🔍 Calculate optimal allocation
  </button>`;

  wrap.appendChild(left);

  /* ---- RIGHT PANEL: Results ---- */
  const right=el("div");
  right.innerHTML=`<div class="quote-panel" id="gc-results">
    <p class="qs-sub" style="padding:20px;text-align:center">Configure your party and rooms, then click <b>Calculate</b>.</p>
  </div>`;
  wrap.appendChild(right);
  v.appendChild(wrap);

  /* ---- Default room types (Brandon Hall typical) ---- */
  let roomTypes=[
    { id:1, name:"Executive Triple",  capacity:3, childCapacity:1, available:1, pricePerRoom:180, hasExtraBed:false, hasSofa:false, hasCot:false, extraBedPrice:25 },
    { id:2, name:"Executive Double",  capacity:2, childCapacity:0, available:8, pricePerRoom:130, hasExtraBed:false, hasSofa:true,  hasCot:false, extraBedPrice:25 },
    { id:3, name:"Executive Twin",    capacity:2, childCapacity:1, available:6, pricePerRoom:130, hasExtraBed:false, hasSofa:true,  hasCot:false, extraBedPrice:25 },
    { id:4, name:"Classic Double",    capacity:2, childCapacity:0, available:4, pricePerRoom:110, hasExtraBed:false, hasSofa:false, hasCot:false, extraBedPrice:25 },
    { id:5, name:"Classic Twin",      capacity:2, childCapacity:1, available:4, pricePerRoom:110, hasExtraBed:false, hasSofa:false, hasCot:false, extraBedPrice:25 },
    { id:6, name:"Junior Suite",      capacity:2, childCapacity:0, available:2, pricePerRoom:220, hasExtraBed:false, hasSofa:true,  hasCot:false, extraBedPrice:25 },
  ];
  let nextId=10;

  function renderTypes(){
    const box=$("#gc-room-types"); if(!box) return;
    box.innerHTML=roomTypes.map((rt,i)=>`
      <div class="gc-rt" data-i="${i}" style="border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;background:var(--paper)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <input class="gc-f" data-k="name" data-i="${i}" value="${rt.name.replace(/"/g,'&quot;')}" style="flex:1;font-weight:700">
          <button class="mini-btn gc-del" data-i="${i}" title="Remove">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
          <div><label class="qs-sub">Adults max</label><input class="gc-f" type="number" data-k="capacity" data-i="${i}" value="${rt.capacity}" min="1"></div>
          <div><label class="qs-sub">Children max</label><input class="gc-f" type="number" data-k="childCapacity" data-i="${i}" value="${rt.childCapacity}" min="0"></div>
          <div><label class="qs-sub">Available</label><input class="gc-f" type="number" data-k="available" data-i="${i}" value="${rt.available}" min="0"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><label class="qs-sub">Room price/night (£)</label><input class="gc-f" type="number" data-k="pricePerRoom" data-i="${i}" value="${rt.pricePerRoom}" min="0" step="0.01"></div>
          <div><label class="qs-sub">Extra bed price/night (£)</label><input class="gc-f" type="number" data-k="extraBedPrice" data-i="${i}" value="${rt.extraBedPrice||25}" min="0" step="0.01"></div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <label class="gc-chk"><input type="checkbox" class="gc-f" data-k="hasExtraBed" data-i="${i}" ${rt.hasExtraBed?"checked":""}> Has extra bed <span class="qs-sub">(+£${rt.extraBedPrice||25}/night)</span></label>
          <label class="gc-chk"><input type="checkbox" class="gc-f" data-k="hasSofa" data-i="${i}" ${rt.hasSofa?"checked":""}> Has sofa bed <span class="qs-sub">(+£25/night)</span></label>
          <label class="gc-chk"><input type="checkbox" class="gc-f" data-k="hasCot" data-i="${i}" ${rt.hasCot?"checked":""}> Cot in room <span class="qs-sub">(free)</span></label>
        </div>
        ${rt.hasExtraBed&&rt.hasCot?`<p style="color:#d0433b;font-size:12px;margin-top:4px">⚠️ Extra bed and cot cannot both be in the same room.</p>`:""}
      </div>`).join("");
    box.querySelectorAll(".gc-f").forEach(inp=>inp.oninput=inp.onchange=()=>{
      const i=+inp.dataset.i, k=inp.dataset.k;
      const v=inp.type==="checkbox"?inp.checked:(inp.type==="number"?parseFloat(inp.value)||0:inp.value);
      roomTypes[i][k]=v;
      // cot + extra bed mutual exclusion
      if((k==="hasExtraBed"&&v&&roomTypes[i].hasCot)||(k==="hasCot"&&v&&roomTypes[i].hasExtraBed)){
        if(k==="hasExtraBed") roomTypes[i].hasCot=false;
        else roomTypes[i].hasExtraBed=false;
        renderTypes();
      }
    });
    box.querySelectorAll(".gc-del").forEach(b=>b.onclick=()=>{ roomTypes.splice(+b.dataset.i,1); renderTypes(); });
  }
  renderTypes();

  $("#gc-add-type").onclick=()=>{
    roomTypes.push({ id:nextId++, name:"Room type", capacity:2, childCapacity:0, available:2, pricePerRoom:130, hasExtraBed:false, hasSofa:false, hasCot:false, extraBedPrice:25 });
    renderTypes();
  };

  /* ---- CALCULATION ENGINE ---- */
  $("#gc-calc").onclick=()=>{
    const adults=parseInt($("#gc-adults").value)||0;
    const children=parseInt($("#gc-children").value)||0;
    const babies=parseInt($("#gc-babies").value)||0;
    const nights=parseInt($("#gc-nights").value)||1;
    const bbRate=parseFloat($("#gc-bb").value)||0;
    const dbbRate=parseFloat($("#gc-dbb").value)||0;

    const result=allocateRooms(adults, children, babies, roomTypes, nights, bbRate, dbbRate);
    renderResults(result, adults, children, babies, nights, bbRate, dbbRate);
  };

  function allocateRooms(adults, children, babies, types, nights, bbRate, dbbRate){
    // Sort: triples first, then by child capacity desc, then by price asc
    const available=types.map((rt,i)=>({...rt, remaining:rt.available})).filter(rt=>rt.available>0);
    available.sort((a,b)=> b.capacity-a.capacity || b.childCapacity-a.childCapacity || a.pricePerRoom-b.pricePerRoom);

    let adultsLeft=adults, childrenLeft=children, babiesLeft=babies;
    const allocation=[], warnings=[];

    // PASS 1: allocate triples for families (adult+child combos)
    available.filter(rt=>rt.capacity>=3 && rt.childCapacity>0).forEach(rt=>{
      while(rt.remaining>0 && adultsLeft>0 && childrenLeft>0){
        const adultsIn=Math.min(rt.capacity, adultsLeft);
        const childrenIn=Math.min(rt.childCapacity, childrenLeft);
        if(adultsIn===0) break;
        const extraBed=(rt.hasExtraBed||rt.hasSofa)&&childrenIn>0;
        const cot=rt.hasCot&&babiesLeft>0&&!extraBed;
        if(cot) babiesLeft--;
        allocation.push({ type:rt.name, adultsIn, childrenIn, babies:cot?1:0, extraBed, pricePerRoom:rt.pricePerRoom, extraBedPrice:extraBed?25:0 });
        adultsLeft-=adultsIn; childrenLeft-=childrenIn; rt.remaining--;
      }
    });

    // PASS 2: doubles/twins with extra bed for remaining children
    available.filter(rt=>rt.capacity>=2 && rt.childCapacity>0 && rt.capacity<3).forEach(rt=>{
      while(rt.remaining>0 && adultsLeft>0 && childrenLeft>0){
        const adultsIn=Math.min(2, adultsLeft);
        const childrenIn=Math.min(rt.childCapacity, childrenLeft);
        const extraBed=(rt.hasExtraBed||rt.hasSofa)&&childrenIn>0;
        const cot=rt.hasCot&&babiesLeft>0&&!extraBed;
        if(cot) babiesLeft--;
        allocation.push({ type:rt.name, adultsIn, childrenIn, babies:cot?1:0, extraBed, pricePerRoom:rt.pricePerRoom, extraBedPrice:extraBed?25:0 });
        adultsLeft-=adultsIn; childrenLeft-=childrenIn; rt.remaining--;
      }
    });

    // PASS 3: remaining children in adult rooms with sofa/extra if available
    available.filter(rt=>rt.childCapacity===0&&(rt.hasExtraBed||rt.hasSofa)).forEach(rt=>{
      while(rt.remaining>0 && adultsLeft>0 && childrenLeft>0){
        const adultsIn=Math.min(rt.capacity, adultsLeft);
        const childrenIn=Math.min(1, childrenLeft);
        const extraBed=childrenIn>0;
        const cot=rt.hasCot&&babiesLeft>0&&!extraBed;
        if(cot) babiesLeft--;
        allocation.push({ type:rt.name, adultsIn, childrenIn, babies:cot?1:0, extraBed, pricePerRoom:rt.pricePerRoom, extraBedPrice:extraBed?25:0 });
        adultsLeft-=adultsIn; childrenLeft-=childrenIn; rt.remaining--;
      }
    });

    // PASS 4: remaining adults in standard rooms
    available.forEach(rt=>{
      while(rt.remaining>0 && adultsLeft>0){
        const adultsIn=Math.min(rt.capacity, adultsLeft);
        const cot=rt.hasCot&&babiesLeft>0;
        if(cot) babiesLeft--;
        allocation.push({ type:rt.name, adultsIn, childrenIn:0, babies:cot?1:0, extraBed:false, pricePerRoom:rt.pricePerRoom, extraBedPrice:0 });
        adultsLeft-=adultsIn; rt.remaining--;
      }
    });

    if(adultsLeft>0) warnings.push(`⚠️ ${adultsLeft} adult${adultsLeft>1?"s":""} could not be allocated — not enough rooms available.`);
    if(childrenLeft>0) warnings.push(`⚠️ ${childrenLeft} child${childrenLeft>1?"ren":""} could not be allocated — add rooms with extra bed / sofa options.`);
    if(babiesLeft>0) warnings.push(`ℹ️ ${babiesLeft} baby${babiesLeft>1?" (cots needed)":""} — allocate cots manually to rooms above.`);

    return { allocation, warnings, nights, bbRate, dbbRate, adults, children, babies };
  }

  function renderResults(r, adults, children, babies, nights, bbRate, dbbRate){
    const box=$("#gc-results"); if(!box) return;
    const totalPeople=adults+children; // babies not counted in meal rate
    const totalAdults=adults;

    // Calculate room cost
    let roomCostPerNight=0, extraBedCostPerNight=0;
    const groups={};
    r.allocation.forEach(a=>{
      const key=`${a.type}|${a.extraBed}`;
      if(!groups[key]) groups[key]={type:a.type, count:0, extraBed:a.extraBed, pricePerRoom:a.pricePerRoom, extraBedPrice:a.extraBedPrice};
      groups[key].count++;
      roomCostPerNight+=a.pricePerRoom;
      if(a.extraBed) extraBedCostPerNight+=(a.extraBedPrice||25);
    });

    const totalRoomCost=(roomCostPerNight+extraBedCostPerNight)*nights;
    const mealsBB=bbRate*totalPeople*nights;
    const mealsDbb=dbbRate*totalPeople*nights;

    const totalBB=totalRoomCost+mealsBB;
    const totalDBB=totalRoomCost+mealsDbb;

    const money=n=>"£"+Number(n).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});

    const roomRows=Object.values(groups).map(g=>`
      <tr><td>${g.type}${g.extraBed?' <span class="qs-sub">+ extra bed</span>':""}</td>
        <td class="r">${g.count}</td>
        <td class="r">${money(g.pricePerRoom+( g.extraBed?g.extraBedPrice:0))}/night</td>
        <td class="r">${money((g.pricePerRoom+(g.extraBed?g.extraBedPrice:0))*g.count)}/night</td></tr>`).join("");

    const warnHTML=r.warnings.map(w=>`<div style="background:#fef3e8;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:13px">${w}</div>`).join("");

    // Detailed allocation list
    const detailRows=r.allocation.map((a,i)=>`
      <tr><td style="color:#374151;font-size:12px">Room ${i+1}</td><td>${a.type}</td>
        <td class="r">${a.adultsIn} adult${a.adultsIn!==1?"s":""}${a.childrenIn?`, ${a.childrenIn} child`:""}${a.babies?`, cot`:""}${a.extraBed?" + extra bed":""}</td>
        <td class="r">${money(a.pricePerRoom+(a.extraBed?a.extraBedPrice:0))}/night</td></tr>`).join("");

    box.innerHTML=`
      ${warnHTML}
      <h3 style="margin-bottom:12px">📊 Optimal allocation</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="stat-card"><div class="sc-v">${r.allocation.length}</div><div class="sc-k">Rooms needed</div></div>
        <div class="stat-card"><div class="sc-v">${adults+children+babies}</div><div class="sc-k">Total guests</div></div>
        <div class="stat-card"><div class="sc-v">${nights}</div><div class="sc-k">Night${nights!==1?"s":""}</div></div>
      </div>

      <div class="tbl-scroll" style="margin-bottom:14px">
        <table class="ct-table"><tr><th>Room type</th><th class="r">Rooms</th><th class="r">Rate/room/night</th><th class="r">Total/night</th></tr>
        ${roomRows}
        <tr style="font-weight:700;border-top:2px solid var(--navy)">
          <td colspan="3">Rooms total (${nights} night${nights!==1?"s":""})</td><td class="r">${money(totalRoomCost)}</td></tr>
        </table>
      </div>

      <h3 style="margin-bottom:10px">💷 Pricing options</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="opt" style="border:1px solid var(--line);border-radius:12px;padding:16px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--navy);font-weight:600">B&B</div>
          <div style="font-size:12px;color:#374151;margin-bottom:8px">${money(bbRate)} per person per night</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td>Rooms</td><td style="text-align:right">${money(totalRoomCost)}</td></tr>
            <tr><td>Breakfast (${totalPeople} guests × ${nights} nights)</td><td style="text-align:right">${money(mealsBB)}</td></tr>
            <tr style="font-weight:700;border-top:1px solid var(--line)"><td>Total</td><td style="text-align:right;font-size:16px;color:var(--navy)">${money(totalBB)}</td></tr>
          </table>
        </div>
        <div class="opt best" style="border:1px solid var(--gold);border-radius:12px;padding:16px;box-shadow:0 4px 16px rgba(201,169,120,.15)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--navy);font-weight:600">Dinner B&B</div>
            <span style="font-size:11px;font-weight:700;background:#E8F4F2;color:#3A8A81;padding:2px 10px;border-radius:10px">Recommended</span>
          </div>
          <div style="font-size:12px;color:#374151;margin-bottom:8px">${money(dbbRate)} per person per night</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td>Rooms</td><td style="text-align:right">${money(totalRoomCost)}</td></tr>
            <tr><td>Dinner, B&B (${totalPeople} guests × ${nights} nights)</td><td style="text-align:right">${money(mealsDbb)}</td></tr>
            <tr style="font-weight:700;border-top:1px solid var(--line)"><td>Total</td><td style="text-align:right;font-size:16px;color:var(--navy)">${money(totalDBB)}</td></tr>
          </table>
        </div>
      </div>

      <h3 style="margin-bottom:8px">🏨 Room by room breakdown</h3>
      <div class="tbl-scroll">
        <table class="ct-table"><tr><th></th><th>Room type</th><th class="r">Occupancy</th><th class="r">Rate/night</th></tr>
        ${detailRows}
        </table>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#374151">
        Extra beds: £25/night · Cots: complimentary · Babies not included in meal plan pricing.
        <br>All rates subject to availability and confirmation.
      </div>
      <button class="btn block" id="gc-print" style="margin-top:14px;background:#1a2b3a">🖨 Print / save allocation</button>`;

    $("#gc-print").onclick=()=>printGroupAllocation(r, adults, children, babies, nights, bbRate, dbbRate, roomRows, detailRows, totalRoomCost, mealsBB, mealsDbb, totalBB, totalDBB, money);
  }

  function printGroupAllocation(r, adults, children, babies, nights, bbRate, dbbRate, roomRows, detailRows, totalRoomCost, mealsBB, mealsDbb, totalBB, totalDBB, money){
    const today=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Group Room Allocation — Brandon Hall</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>@page{margin:14mm}body{font-family:'Lato',sans-serif;color:#2a3644;font-size:12px;max-width:820px;margin:0 auto}
    .h{text-align:center;border-bottom:3px solid #1a2b47;padding-bottom:10px;margin-bottom:14px}
    .logo{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;letter-spacing:5px;color:#1a2b47}
    .sub{font-size:10px;letter-spacing:4px;color:#c9a978;font-weight:700}
    h1{font-family:'Cormorant Garamond',serif;font-size:22px;text-align:center;margin:10px 0 4px}
    .meta{text-align:center;font-size:11px;color:#374151;margin-bottom:14px}
    .facts{display:flex;gap:12px;justify-content:center;margin-bottom:14px}
    .fact{background:#f5f7f9;border-radius:8px;padding:10px 16px;text-align:center}
    .fact b{display:block;font-size:18px;color:#1a2b47;font-family:'Cormorant Garamond',serif}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
    th{background:#1a2b47;color:#fff;text-align:left;padding:6px 8px;font-size:10.5px}
    td{padding:6px 8px;border-bottom:1px solid #eef2f4}.r{text-align:right}
    .opts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
    .opt{border:1px solid #e3e7ee;border-radius:8px;padding:12px}
    .opt.rec{border-color:#c9a978}
    .opt h3{font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2b47;margin-bottom:4px}
    .big{font-size:18px;font-weight:700;color:#1a2b47}
    .foot{margin-top:16px;font-size:10px;color:#374151;text-align:center;border-top:1px solid #e3e7ee;padding-top:8px}
    </style></head><body>
    <div class="h"><div class="logo">BRANDON HALL</div><div class="sub">HOTEL AND SPA</div></div>
    <h1>Group Room Allocation</h1>
    <div class="meta">Prepared ${today}</div>
    <div class="facts">
      <div class="fact"><b>${adults}</b>Adults</div>
      <div class="fact"><b>${children}</b>Children</div>
      <div class="fact"><b>${babies}</b>Babies</div>
      <div class="fact"><b>${r.allocation.length}</b>Rooms</div>
      <div class="fact"><b>${nights}</b>Night${nights!==1?"s":""}</div>
    </div>
    ${r.warnings.map(w=>`<p style="color:#c78a3b;font-size:11px">${w}</p>`).join("")}
    <h2 style="font-family:'Cormorant Garamond',serif;font-size:16px;color:#1a2b47;margin:10px 0 6px">Room by room</h2>
    <table><tr><th>Room</th><th>Type</th><th class="r">Occupancy</th><th class="r">Rate/night</th></tr>${detailRows}</table>
    <div class="opts">
      <div class="opt"><h3>B&B</h3><table>
        <tr><td>Rooms (${nights} night${nights!==1?"s":""})</td><td class="r">${money(totalRoomCost)}</td></tr>
        <tr><td>Breakfast</td><td class="r">${money(mealsBB)}</td></tr>
        <tr><td><b>Total</b></td><td class="r"><b class="big">${money(totalBB)}</b></td></tr>
      </table></div>
      <div class="opt rec"><h3>Dinner B&amp;B ★ Recommended</h3><table>
        <tr><td>Rooms (${nights} night${nights!==1?"s":""})</td><td class="r">${money(totalRoomCost)}</td></tr>
        <tr><td>Dinner, B&amp;B</td><td class="r">${money(mealsDbb)}</td></tr>
        <tr><td><b>Total</b></td><td class="r"><b class="big">${money(totalDBB)}</b></td></tr>
      </table></div>
    </div>
    <div class="foot">Brandon Hall Hotel and Spa · Main Street, Brandon, Coventry CV8 3FW · 024 7710 2555 · All rates indicative, subject to confirmation.</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  }
}

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
      <div class="brp-htxt"><div class="brp-logo">BRANDON HALL</div><div class="brp-eyebrow">HOTEL AND SPA</div>
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
    .foot{margin-top:20px;font-size:10px;color:#374151;text-align:center;border-top:1px solid #e8dccf;padding-top:14px}
    .issued{position:absolute;top:14mm;right:16mm;z-index:3;color:#fff;font-size:10px;opacity:.85}</style>
    </head><body>
    <div class="hero"><div class="issued">Issued ${issued}</div>
      <div class="htxt"><div class="logo">BRANDON HALL</div><div class="eyebrow">HOTEL AND SPA</div>
        <div class="htitle">${b.title||""}</div><div class="hsub">${b.subtitle||""}</div></div></div>
    <div class="body">
      <h2>Welcome</h2><div class="rule"></div>
      <div class="intro">${introPs}</div>
      ${imgs.length?`<div class="imgrow">${imgs.map(u=>`<img src="${u}">`).join("")}</div>`:""}
      <h2 style="margin-top:18px">Our Rates</h2><div class="rule"></div>
      <table>${rates}</table>
      ${b.ratesNote?`<p style="font-size:10.5px;color:#374151;margin-top:10px">${b.ratesNote}</p>`:""}
      ${b.cta?`<div class="cta"><b>${b.cta}</b>+44 (0)247 710 2555 · events@brandonhallhotelandspa.com</div>`:""}
      <div class="foot">Brandon Hall Hotel and Spa · Main Street, Brandon, Wolston, Coventry CV8 3FW · brandonhallhotelandspa.com</div>
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
  const prompt=`Write a social media post for Brandon Hall Hotel and Spa — a 4-star country-house hotel and spa set in 17 acres of Warwickshire grounds near Coventry (CV8 3FW), offering weddings, meetings & events, a spa with an 18-metre pool, restaurant and bar, and 120 en-suite bedrooms.

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
  const mods = userModules(SESSION?._key||"ajay.kawa");
  const groups = typeof MODULE_GROUPS!=="undefined" ? MODULE_GROUPS : [];

  // ── Hide breadcrumb on home ────────────────────────────────────────────────
  const bc = document.getElementById('sf-breadcrumb');
  if(bc) bc.style.display = 'none';

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pipe   = (typeof ENQUIRIES!=="undefined"?ENQUIRIES:[]).filter(e=>['new','proposal','negotiation'].includes(e.stage));
  const conf   = (typeof ENQUIRIES!=="undefined"?ENQUIRIES:[]).filter(e=>e.stage==='confirmed');
  const confVal= conf.reduce((t,e)=>t+(e.totalValue||0),0);
  const thisWk = new Date(); thisWk.setDate(thisWk.getDate()-7);
  const newWk  = (typeof ENQUIRIES!=="undefined"?ENQUIRIES:[]).filter(e=>new Date(e.created)>thisWk).length;
  const overdue= (typeof ALL_ACTIONS!=="undefined"?ALL_ACTIONS:[]).filter(a=>a.status!=="done"&&new Date(a.due)<new Date()).length;
  const tasks  = JSON.parse(localStorage.getItem('sf_tasks')||'[]').filter(t=>t.status!=='done').length;
  const events = (typeof ENQUIRIES!=="undefined"?ENQUIRIES:[]).filter(e=>e.stage==='confirmed').length;

  v.innerHTML = '';
  v.style.padding = '0';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'min-height:100%;background:#1a2b3a';

  // ── Home banner: greeting over the Brandon Hall grounds ────────────────────
  const hr=new Date().getHours(), greet=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const first=(SESSION&&SESSION.name||'').split(' ')[0];
  const homeHero=document.createElement('div');
  homeHero.style.cssText='padding:24px 28px 0';
  homeHero.innerHTML=`<div class="hp-hero hp-hero-home-banner" style="--hero:url('assets/hospro/hero-home.jpg')">
      <div class="hp-hero-in">
        <div>
          <div class="hp-hero-s" style="margin:0 0 6px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#c9a978">Brandon Hall Hotel &amp; Spa</div>
          <div class="hp-hero-t">${greet}${first?', '+first:''}</div>
          <div class="hp-hero-s">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
      </div>
    </div>`;
  wrap.appendChild(homeHero);

  // ── Module cards — 2 rows of 6 ────────────────────────────────────────────
  const cardsSection = document.createElement('div');
  cardsSection.style.cssText = 'padding:28px 28px 0';

  // Build 2 rows of 6 from groups order
  const orderedMods = [];
  groups.forEach(grp => {
    const gm = mods.filter(m => grp.modules.includes(m.id));
    gm.forEach(m => orderedMods.push(m));
  });
  // Any not in groups
  const groupedIds = groups.flatMap(g=>g.modules);
  mods.filter(m=>!groupedIds.includes(m.id)).forEach(m=>orderedMods.push(m));

  // 2 rows: first 6 and second 6
  const row1 = orderedMods;

  [row1].forEach((row, rowIdx) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'hp-modgrid';
    rowDiv.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:16px';
    row.forEach(m => {
      const card = document.createElement('button');
      card.style.cssText = `display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:16px;background:${m.tint||'#F3F5F7'};border:2px solid transparent;border-radius:14px;cursor:pointer;text-align:left;transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,.05);width:100%`;
      card.innerHTML = `
        <div style="width:40px;height:40px;border-radius:10px;background:${m.colour};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${m.icon}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#111827;line-height:1.2">${m.name}</div>
          <div style="font-size:10px;color:#374151;margin-top:3px;line-height:1.4">${m.caption}</div>
        </div>`;
      card.onmouseover = () => { card.style.borderColor=m.colour; card.style.boxShadow='0 4px 14px rgba(0,0,0,.10)'; card.style.transform='translateY(-2px)'; };
      card.onmouseout  = () => { card.style.borderColor='transparent'; card.style.boxShadow='0 1px 3px rgba(0,0,0,.05)'; card.style.transform=''; };
      card.onclick = () => renderModuleLanding(m.id);
      if(!hpCanAccess(m.id)){
        card.style.cssText += ';opacity:.45;filter:grayscale(1);cursor:not-allowed;box-shadow:none';
        card.title = m.name+' is restricted';
        card.insertAdjacentHTML('beforeend','<div style="font-size:10.5px;font-weight:700;color:#374151">🔒 Restricted access</div>');
        card.onmouseover = card.onmouseout = null;
        card.onclick = () => toast('🔒 '+m.name+' is restricted. Ask Raj or Ajay if you need access.');
      }
      rowDiv.appendChild(card);
    });
    cardsSection.appendChild(rowDiv);
  });

  wrap.appendChild(cardsSection);

  // ── Stats bar — full width ─────────────────────────────────────────────────
  const statsBar = document.createElement('div');
  statsBar.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:12px;padding:16px 28px;margin-top:4px';
  const stats = [
    {icon:'📊',val:pipe.length,label:'Open enquiries',colour:'#4a86c7'},
    {icon:'💰',val:'£'+Math.round(confVal/1000)+'k',label:'Confirmed value',colour:'#2a6a4a'},
    {icon:'🆕',val:newWk,label:'New this week',colour:'#4a9d7f'},
    {icon:'⚠️',val:overdue,label:'Overdue follow-ups',colour:'#c78a3b'},
    {icon:'✅',val:tasks,label:'Open tasks',colour:'#8b5c8f'},
    {icon:'📅',val:events,label:'Upcoming events',colour:'#4a86c7'},
  ];
  stats.forEach(s => {
    const sc = document.createElement('div');
    sc.style.cssText = 'background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px';
    sc.innerHTML = `<span style="font-size:22px">${s.icon}</span><div><div style="font-size:22px;font-weight:700;color:${s.colour};line-height:1">${s.val}</div><div style="font-size:11px;color:#374151;margin-top:2px">${s.label}</div></div>`;
    statsBar.appendChild(sc);
  });
  wrap.appendChild(statsBar);


  // ── Dashboard section ────────────────────────────────────────────────────────
  const dash = document.createElement('div');
  dash.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:0 28px 28px';

  // ── Panel helper ─────────────────────────────────────────────────────────────
  function mkPanel(title, icon, colour, content){
    const p = document.createElement('div');
    p.style.cssText = 'background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden';
    p.innerHTML = `<div style="padding:13px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">${icon}</span>
      <span style="font-size:13px;font-weight:700;color:#1a2b3a">${title}</span>
      <div style="width:8px;height:8px;border-radius:50%;background:${colour};margin-left:auto"></div>
    </div>
    <div style="padding:14px 16px">${content}</div>`;
    return p;
  }

  // ── Panel 1: Maintenance jobs ─────────────────────────────────────────────
  const jobs = JSON.parse(localStorage.getItem('hosfix_jobs')||'[]');   // same store as the HosFIX app
  const jobsUrgent  = jobs.filter(j=>j.priority==='urgent'&&j.status!=='complete').length;
  const jobsOpen    = jobs.filter(j=>j.status==='not-started'||j.status==='not_started').length;
  const jobsWIP     = jobs.filter(j=>j.status==='in-progress'||j.status==='in_progress').length;
  const jobsDone    = jobs.filter(j=>j.status==='complete').length;
  const recentJobs  = jobs.filter(j=>j.status!=='complete').sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,4);

  const jobRows = recentJobs.map(j=>`
    <div onclick="switchTab('fixAllJobs')" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f5f7f9;cursor:pointer">
      <div>
        <div style="font-size:12px;font-weight:600;color:#1a2b3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${j.title||'Untitled'}</div>
        <div style="font-size:10px;color:#374151">${j.location||''}</div>
      </div>
      <span style="padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;background:${j.priority==='urgent'?'#fee2e2':(j.status==='in-progress'||j.status==='in_progress')?'#fef9c3':'#f5f7f9'};color:${j.priority==='urgent'?'#991b1b':(j.status==='in-progress'||j.status==='in_progress')?'#854d0e':'#374151'}">${j.priority==='urgent'?'⚡ Urgent':(j.status==='in-progress'||j.status==='in_progress')?'In progress':'Not started'}</span>
    </div>`).join('') || '<div style="font-size:12px;color:#374151;padding:8px 0">No open jobs</div>';

  const maintContent = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">
      ${[['⚡',jobsUrgent,'Urgent','#b3261e','#fee2e2'],['🔵',jobsOpen,'Not started','#1d4ed8','#dbeafe'],['🟡',jobsWIP,'In progress','#854d0e','#fef9c3'],['✅',jobsDone,'Complete','#166534','#dcfce7']].map(([ic,n,l,col,bg])=>`
        <div style="text-align:center;background:${bg};border-radius:8px;padding:8px 4px;cursor:pointer" onclick="switchTab('fixAllJobs')">
          <div style="font-size:18px;font-weight:700;color:${col}">${n}</div>
          <div style="font-size:9px;color:${col};font-weight:600;text-transform:uppercase">${l}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Recent open jobs</div>
    ${jobRows}
    <button onclick="switchTab('fixAllJobs')" style="margin-top:10px;width:100%;padding:8px;border:1.5px solid #1a2b3a;border-radius:8px;background:#fff;font:600 12px Lato;color:#1a2b3a;cursor:pointer">View all jobs →</button>`;

  dash.appendChild(mkPanel('HosFIX — Maintenance','🔧','#965638', HP_FIXRAY_MODE ? '<div style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:12px">Maintenance jobs are now managed in FixRay. Figures will appear here after the first weekly import.</div><a href="'+HP_FIXRAY_URL+'" target="_blank" rel="noopener" style="display:block;text-align:center;padding:9px;border-radius:8px;background:#3A8A81;color:#fff;font:700 12px Lato;text-decoration:none">📱 Open HosFIX app ↗</a>' : maintContent));

  // ── Panel 2: Compliance summary ───────────────────────────────────────────
  const compTasks = typeof ALL_COMP_TASKS!=="undefined" ? ALL_COMP_TASKS : [];
  const now = new Date();
  const compOverdue  = compTasks.filter(t=>t.status!=='done'&&new Date(t.dueDate)<now).length;
  const compDueSoon  = compTasks.filter(t=>{const d=new Date(t.dueDate);return t.status!=='done'&&d>=now&&d<new Date(now.getTime()+7*864e5);}).length;
  const compOnTrack  = compTasks.filter(t=>t.status!=='done'&&new Date(t.dueDate)>=new Date(now.getTime()+7*864e5)).length;
  const compDone     = compTasks.filter(t=>t.status==='done').length;
  const compPct      = compTasks.length>0?Math.round(compDone/compTasks.length*100):0;

  const topOverdue = compTasks.filter(t=>t.status!=='done'&&new Date(t.dueDate)<now)
    .sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).slice(0,4);
  const compRows = topOverdue.map(t=>{
    const days=Math.round((now-new Date(t.dueDate))/(864e5));
    return`<div onclick="switchTab('compTasks')" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f5f7f9;cursor:pointer">
      <div style="font-size:12px;font-weight:600;color:#1a2b3a;max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title||t.name||'Task'}</div>
      <span style="font-size:10px;font-weight:700;color:#991b1b;white-space:nowrap">${days}d overdue</span>
    </div>`;}).join('') || '<div style="font-size:12px;color:#166534;padding:8px 0">✓ No overdue tasks</div>';

  const compContent = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
      ${[['⚠',compOverdue,'Overdue','#991b1b','#fee2e2'],['⏰',compDueSoon,'Due soon','#854d0e','#fef9c3'],['✓',compOnTrack,'On track','#166534','#dcfce7']].map(([ic,n,l,col,bg])=>`
        <div style="text-align:center;background:${bg};border-radius:8px;padding:8px 4px">
          <div style="font-size:20px;font-weight:700;color:${col}">${n}</div>
          <div style="font-size:9px;color:${col};font-weight:600;text-transform:uppercase">${l}</div>
        </div>`).join('')}
    </div>
    <div style="background:#f5f7f9;border-radius:8px;padding:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#374151;margin-bottom:5px">
        <span>Overall compliance</span><span style="font-weight:700;color:${compPct>=80?'#166534':compPct>=50?'#854d0e':'#991b1b'}">${compPct}%</span>
      </div>
      <div style="background:#e5e7eb;border-radius:6px;height:8px">
        <div style="background:${compPct>=80?'#2a6a4a':compPct>=50?'#c78a3b':'#b3261e'};border-radius:6px;height:8px;width:${compPct}%;transition:width .4s"></div>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Most overdue</div>
    ${compRows}
    <button onclick="switchTab('compDash')" style="margin-top:10px;width:100%;padding:8px;border:1.5px solid #1a2b3a;border-radius:8px;background:#fff;font:600 12px Lato;color:#1a2b3a;cursor:pointer">View compliance →</button>`;

  dash.appendChild(mkPanel('HosCOM — Compliance','🛡','#4B5288', HP_FIXRAY_MODE ? '<div style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:12px">Scheduled checks and compliance tasks are now managed in FixRay. Figures will appear here after the first weekly import.</div><a href="'+HP_FIXRAY_URL+'" target="_blank" rel="noopener" style="display:block;text-align:center;padding:9px;border-radius:8px;background:#3A8A81;color:#fff;font:700 12px Lato;text-decoration:none">📱 Open HosFIX app ↗</a>' : compContent));

  // ── Panel 3: HosSHIFT + HosSTAFF snapshot ────────────────────────────────
  const rota = (typeof spGetRota==='function') ? spGetRota() : JSON.parse(localStorage.getItem('sp_rota')||'{}');
  const staffList = (typeof spGetStaff==='function') ? spGetStaff() : JSON.parse(localStorage.getItem('sp_staff')||'[]');
  const todayK = (typeof spDK==='function') ? spDK(new Date()) : new Date().toISOString().slice(0,10);
  const todayRota = rota[todayK]||{};
  const shiftOf = v => String((v&&typeof v==='object')?(v.shift||''):(v||'')).toLowerCase().trim();
  const onDuty  = Object.values(todayRota).filter(v=>{const t=shiftOf(v);return t&&!['off','holiday','sick','in lieu'].includes(t);}).length;
  const onHoliday= Object.values(todayRota).filter(v=>shiftOf(v)==='holiday').length;

  // Leave pending
  const leave = JSON.parse(localStorage.getItem('hs_leave')||'[]');
  const pendingLeave = leave.filter(l=>l.status==='pending').length;

  // Today's dept coverage
  const SP_DEPTS_SNAP = typeof SP_DEPTS!=="undefined" ? SP_DEPTS : [];
  const deptRows = SP_DEPTS_SNAP.slice(0,5).map(dept=>{
    const ds = staffList.filter(s=>s.dept===dept.id);
    const rostered = ds.filter(s=>{const sh=shiftOf(todayRota[s.id]);return sh&&!['off','holiday','sick','in lieu'].includes(sh);}).length;
    const ok = rostered>=1;
    return`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f5f7f9">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${dept.colour};display:inline-block"></span>
        <span style="font-size:12px;color:#1a2b3a;font-weight:600">${dept.name}</span>
      </div>
      <span style="font-size:11px;font-weight:700;color:${ok?'#166534':'#991b1b'}">${rostered} on shift ${ok?'✓':'⚠'}</span>
    </div>`;}).join('');

  const peopleContent = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
      ${[['👷',onDuty,'On shift today','#1d4ed8','#dbeafe'],['🌴',onHoliday,'On holiday','#166534','#dcfce7'],['⏳',pendingLeave,'Leave pending','#854d0e','#fef9c3']].map(([ic,n,l,col,bg])=>`
        <div style="text-align:center;background:${bg};border-radius:8px;padding:8px 4px">
          <div style="font-size:20px;font-weight:700;color:${col}">${n}</div>
          <div style="font-size:9px;color:${col};font-weight:600;text-transform:uppercase">${l}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Today's coverage</div>
    ${deptRows}
    <div style="display:flex;gap:8px;margin-top:10px">
      <button onclick="switchTab('rotaWeek')" style="flex:1;padding:8px;border:1.5px solid #1a2b3a;border-radius:8px;background:#fff;font:600 12px Lato;color:#1a2b3a;cursor:pointer">📋 Rota</button>
      <button onclick="switchTab('staffLeaveAdmin')" style="flex:1;padding:8px;border:1.5px solid #c78a3b;border-radius:8px;background:#fff;font:600 12px Lato;color:#c78a3b;cursor:pointer">🌴 Leave${pendingLeave>0?' ('+pendingLeave+')':''}</button>
    </div>`;

  dash.appendChild(mkPanel('People & Shifts','👥','#4a86c7', hpCanAccess('hospeople') ? peopleContent :
    '<div style="opacity:.6;filter:grayscale(1);text-align:center;padding:26px 10px;font-size:13px;color:#374151">🔒 Staff, rota and payroll are restricted.<br>Ask Raj or Ajay if you need access.</div>'));

  wrap.appendChild(dash);

  // ── Row 2 dashboard: Sales pipeline + Tasks + Events ──────────────────────
  const dash2 = document.createElement('div');
  dash2.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 28px 28px';

  // Sales pipeline panel
  const enqs = typeof ENQUIRIES!=="undefined" ? ENQUIRIES : [];
  const stages = ['new','proposal','negotiation','confirmed','lost'];
  const stageLabels = {new:'New',proposal:'Proposal',negotiation:'Negotiation',confirmed:'Confirmed',lost:'Lost'};
  const stageColours = {new:'#4a86c7',proposal:'#8b5c8f',negotiation:'#c78a3b',confirmed:'#2a6a4a',lost:'#374151'};
  const stageCounts = {};
  stages.forEach(s=>stageCounts[s]=enqs.filter(e=>e.stage===s).length);
  const total = enqs.length||1;

  const pipelineBars = stages.filter(s=>s!=='lost').map(s=>`
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span style="font-weight:600;color:#1a2b3a">${stageLabels[s]}</span>
        <span style="color:#374151">${stageCounts[s]} enquiries</span>
      </div>
      <div style="background:#f0f4f8;border-radius:6px;height:10px">
        <div style="background:${stageColours[s]};border-radius:6px;height:10px;width:${Math.round(stageCounts[s]/total*100)}%;transition:width .4s"></div>
      </div>
    </div>`).join('');

  const recentEnqs = enqs.filter(e=>!['confirmed','lost'].includes(e.stage)).slice(0,3).map(e=>`
    <div onclick="switchTab('pipeline')" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f5f7f9;cursor:pointer">
      <div>
        <div style="font-size:12px;font-weight:600;color:#1a2b3a">${e.company||e.name||'Enquiry'}</div>
        <div style="font-size:10px;color:#374151">${e.eventType||''} · ${e.pax?e.pax+' pax':''}</div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${stageColours[e.stage]||'#374151'}">${stageLabels[e.stage]||e.stage}</span>
    </div>`).join('');

  const salesContent = `
    <div style="margin-bottom:14px">${pipelineBars}</div>
    <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Active enquiries</div>
    ${recentEnqs||'<div style="font-size:12px;color:#374151">No active enquiries</div>'}
    <button onclick="switchTab('pipeline')" style="margin-top:10px;width:100%;padding:8px;border:1.5px solid #4a86c7;border-radius:8px;background:#fff;font:600 12px Lato;color:#4a86c7;cursor:pointer">Open Sales Pipeline →</button>`;

  dash2.appendChild(mkPanel('SalesPRO — Pipeline','📊','#4a86c7',salesContent));

  // Tasks panel
  const taskList = JSON.parse(localStorage.getItem('sf_tasks')||'[]');
  const taskOpen  = taskList.filter(t=>t.status!=='done');
  const taskOverdue= taskOpen.filter(t=>t.due&&new Date(t.due)<now);
  const taskDueSoon= taskOpen.filter(t=>{const d=new Date(t.due);return t.due&&d>=now&&d<new Date(now.getTime()+3*864e5);});
  const taskRows = taskOpen.slice(0,5).map(t=>{
    const isOverdue=t.due&&new Date(t.due)<now;
    const isDueSoon=t.due&&new Date(t.due)>=now&&new Date(t.due)<new Date(now.getTime()+3*864e5);
    return`<div onclick="switchTab('tasks')" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f5f7f9;cursor:pointer">
      <div style="font-size:12px;font-weight:600;color:#1a2b3a;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title||'Task'}</div>
      ${t.due?`<span style="font-size:10px;font-weight:700;white-space:nowrap;color:${isOverdue?'#991b1b':isDueSoon?'#854d0e':'#374151'}">${isOverdue?'Overdue':isDueSoon?'Due soon':new Date(t.due).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>`:''}
    </div>`;}).join('') || '<div style="font-size:12px;color:#166534;padding:8px 0">✓ No open tasks</div>';

  const tasksContent = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
      ${[['⚠',taskOverdue.length,'Overdue','#991b1b','#fee2e2'],['⏰',taskDueSoon.length,'Due soon','#854d0e','#fef9c3'],['📋',taskOpen.length,'Total open','#1d4ed8','#dbeafe']].map(([ic,n,l,col,bg])=>`
        <div style="text-align:center;background:${bg};border-radius:8px;padding:8px 4px">
          <div style="font-size:20px;font-weight:700;color:${col}">${n}</div>
          <div style="font-size:9px;color:${col};font-weight:600;text-transform:uppercase">${l}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Open tasks</div>
    ${taskRows}
    <button onclick="switchTab('tasks')" style="margin-top:10px;width:100%;padding:8px;border:1.5px solid #8b5c8f;border-radius:8px;background:#fff;font:600 12px Lato;color:#8b5c8f;cursor:pointer">Open TaskPRO →</button>`;

  dash2.appendChild(mkPanel('TaskPRO — Open Tasks','✅','#8b5c8f',tasksContent));

  wrap.appendChild(dash2);
  v.appendChild(wrap);
}

// ── MODULE LANDING PAGE — with background image ────────────────────────────────
const MOD_BG = {
  hosops:    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=60",
  hossales:  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=60",
  hosvenue:  "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=1600&q=60",
  hosstudio: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1600&q=60",
  hosbrand:  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=60",
  hospeople: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=60",
  hoshub:    "https://images.unsplash.com/photo-1568667256549-094345857637?w=1600&q=60",
};

function renderModuleLanding(moduleId){
  if(!hpCanAccess(moduleId)){ toast('🔒 That area is restricted. Ask Raj or Ajay if you need access.'); if(CURRENT_TAB!=="home"){ CURRENT_TAB="home"; render(); } return; }
  if(window.scrollY) window.scrollTo(0,0);
  { const ap=document.getElementById("app"); if(ap && ap.scrollTop) ap.scrollTop=0; }
  const v = document.getElementById("view");
  const mods = typeof FLOW_MODULES!=="undefined" ? FLOW_MODULES : [];
  const m = mods.find(x=>x.id===moduleId);
  if(!m){ CURRENT_TAB="home"; render(); return; }

  CURRENT_TAB = "mod:"+moduleId;
  hpPushHistory();

  const subcards = (typeof MODULE_SUBCARDS!=="undefined" && MODULE_SUBCARDS[moduleId]) || [];

  // Breadcrumb: ← Home · Home › Module
  hpSetBreadcrumb(m, null);

  v.removeAttribute("style");
  v.classList.remove("hp-surface","hp-dark");
  v.classList.add("hp-canvas");
  v.innerHTML="";
  v.style.padding="0";

  const bgUrl = MOD_BG[moduleId]||"";

  // Full-height wrapper — solid brand background
  const wrap = document.createElement("div");
  wrap.style.cssText = "min-height:100%;background:#1a2b3a;position:relative";

  // Content layer
  const content = document.createElement("div");
  content.style.cssText = "padding:32px";

  // Module header — hero banner with a Brandon Hall photograph
  const hero = HP_MOD_HERO[moduleId] || "assets/hospro/hero-home.jpg";
  content.innerHTML = `
    <div class="hp-hero" style="--hero:url('${hero}')">
      <div class="hp-hero-in">
        <div class="hp-hero-ico" style="background:${m.colour};box-shadow:0 4px 16px ${m.colour}66">${m.icon}</div>
        <div>
          <div class="hp-hero-t">${m.name}</div>
          <div class="hp-hero-s">${m.caption}</div>
        </div>
        <button onclick="switchTab('home')" class="hp-hero-home">🏠 Home</button>
      </div>
    </div>`;

  // Sub-cards grid — larger cards, 3-4 per row max for readability
  const grid = document.createElement("div");
  grid.className = "hp-subgrid";
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px";

  subcards.forEach(sc => {
    const card = document.createElement("button");
    card.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:22px;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,.9);border-radius:16px;cursor:pointer;text-align:left;transition:all .18s;box-shadow:0 2px 10px rgba(0,0,0,.08);width:100%";
    card.innerHTML = `
      <div style="width:50px;height:50px;border-radius:13px;background:${m.colour};display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 3px 10px ${m.colour}55">${sc.icon}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#1a2b3a;line-height:1.2">${sc.label}</div>
        <div style="font-size:12px;color:#374151;margin-top:5px;line-height:1.5">${sc.desc}</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:#2F7A72;display:flex;align-items:center;gap:4px">Open <span>→</span></div>`;
    card.onmouseover = ()=>{ card.style.background="#fff"; card.style.borderColor=m.colour; card.style.transform="translateY(-4px)"; card.style.boxShadow=`0 12px 28px rgba(0,0,0,.12)`; };
    card.onmouseout  = ()=>{ card.style.background="rgba(255,255,255,.92)"; card.style.borderColor="rgba(255,255,255,.9)"; card.style.transform=""; card.style.boxShadow="0 2px 10px rgba(0,0,0,.08)"; };
    card.onclick = () => switchTab(sc.tab);
    grid.appendChild(card);
  });

  /* card grid replaced by the module sub-nav bar */
  try{ content.appendChild(hpLandingExtras(m)); }catch(e){ console.warn('[HosPRO] landing extras failed',e); }
  wrap.appendChild(content);
  v.appendChild(wrap);
}


function renderStaySolution(sol){
  if(!sol.party.adults && !sol.party.children && !sol.party.infants) return `<p class="qs-sub">Enter a party size above.</p>`;
  const over = sol.leftover.adults||sol.leftover.children||sol.leftover.infants;
  const rows=sol.combo.map(c=>{
    const parts=[];
    if(c.adults) parts.push(`${c.adults} adult${c.adults>1?"s":""}`);
    if(c.children) parts.push(`${c.children} child${c.children>1?"ren":""}`);
    if(c.infants) parts.push(`${c.infants} infant${c.infants>1?"s":""} (cot)`);
    const nums = c.rooms.sort((a,b)=>a-b).join(", ");
    return `<div class="sc-row"><span class="sc-qty">${c.rooms.length}×</span>
      <span class="sc-name">${c.label}</span>
      <span class="sc-fill">${parts.join(" · ")}</span>
      <span class="sc-nums">Rooms ${nums}</span></div>`;
  }).join("");
  return `<div class="sc-solution">
    <div class="sc-head">Suggested allocation — <b>${sol.totalRooms} room${sol.totalRooms>1?"s":""}</b> for
      ${sol.party.adults} adult${sol.party.adults!==1?"s":""}${sol.party.children?`, ${sol.party.children} child${sol.party.children>1?"ren":""}`:""}${sol.party.infants?`, ${sol.party.infants} infant${sol.party.infants>1?"s":""}`:""}${sol.cotsUsed?` · ${sol.cotsUsed} cot${sol.cotsUsed>1?"s":""}`:""}</div>
    ${rows}
    ${over?`<div class="sc-over">⚠ Couldn't place: ${[sol.leftover.adults?sol.leftover.adults+" adults":"",sol.leftover.children?sol.leftover.children+" children":"",sol.leftover.infants?sol.leftover.infants+" infants (no cots left)":""].filter(Boolean).join(", ")}.</div>`:`<div class="sc-ok">✓ Everyone placed. Room numbers are a suggestion (subject to availability). Child = up to ${CHILD_MAX_AGE} yrs; infant = up to ${INFANT_MAX_AGE} yrs (cot).</div>`}
  </div>`;
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

// ── Corporate Database — 66 accounts from 2025 register ──────────────────────
const CORP_DB_SEED = [{"id":"corp001","company":"AGCO","rate":"\u00a387.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp002","company":"Antalis","rate":"\u00a393.00 B&B","contact":"Jim McKenzie","phone":"07979 652518","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp003","company":"Atos","rate":"\u00a390.00 B&B","contact":"","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp004","company":"AP Racing","rate":"\u00a390.00 B&B","contact":"","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp005","company":"APTIV","rate":"\u00a390.00 B&B","contact":"Rosie Smith","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp006","company":"AVL","rate":"\u00a393.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp007","company":"BBC","rate":"\u00a382.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp008","company":"Baader","rate":"\u00a395.00 B&B","contact":"Paula Bains","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp009","company":"Belgrade Theatre","rate":"12% off BAR","contact":"Rich","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp010","company":"Borg Warner","rate":"\u00a393.00 B&B","contact":"Jonathan Weston","phone":"07826 870507","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp011","company":"Caldwell","rate":"\u00a391.00 B&B","contact":"Alastair Wheeler","phone":"02476 437900","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp012","company":"CJC Procurement","rate":"\u00a395.00 B&B","contact":"Chris Cliffe","phone":"","email":"chris@cjcprocurement.co.uk","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp013","company":"Company of Master Jewellers","rate":"\u00a389.00 B&B","contact":"Karen Cobley","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp014","company":"DHL (National)","rate":"\u00a383.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp015","company":"McKesson (Celesio)","rate":"\u00a392.00 B&B","contact":"Michelle Parkes","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp016","company":"Edgetech","rate":"\u00a390.00 B&B","contact":"Claire Fordham","phone":"02476 639931","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp017","company":"Emerald Automotive","rate":"\u00a391.00 B&B","contact":"Ellie Tempest","phone":"01268 247991","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp018","company":"FANUC","rate":"\u00a395.00 B&B","contact":"Martine Padfield","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp019","company":"Fraikin","rate":"\u00a390.00 B&B","contact":"Amanda Goyer / Anita Cook","phone":"02476 472358","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp020","company":"G4S","rate":"\u00a392.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp021","company":"GE Power","rate":"\u00a393.00 B&B","contact":"Jon Wheeler","phone":"07917 072372","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp022","company":"Geely Group","rate":"\u00a392.00 B&B","contact":"Chris Fincham","phone":"02476 572086","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp023","company":"Georg Fischer","rate":"\u00a390.00 B&B","contact":"Stacy Alexander","phone":"02476 533701","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp024","company":"Government","rate":"\u00a380.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp025","company":"HMG Paints","rate":"\u00a396.00 B&B","contact":"Paul Walker","phone":"0161 205 7631","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp026","company":"JLR","rate":"\u00a387.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP. Nic loaded courtesy rate","lastContact":"","followUp":"","agreements":[]},{"id":"corp027","company":"KASAI Group","rate":"\u00a395.00 B&B","contact":"Karen Walmsley","phone":"0191 415 7000","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp028","company":"Keller","rate":"\u00a391.00 B&B","contact":"Deborah Bryan","phone":"02476 511266","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp029","company":"Keoghs","rate":"\u00a392.00 B&B","contact":"Sara Pearce","phone":"01204 677154","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp030","company":"Lear","rate":"\u00a395.00 B&B","contact":"Elizabeth Dennt","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp031","company":"Lorian / GP Strat","rate":"\u00a390.00 B&B","contact":"John Wagstaff","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp032","company":"MACE","rate":"\u00a393.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp033","company":"McCarthy & Stone","rate":"\u00a395.00 B&B","contact":"Becky Booth","phone":"02476 441199","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp034","company":"McLaren","rate":"\u00a390.00 B&B","contact":"Hollie Cosby","phone":"0121 770 8288","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp035","company":"Menzies","rate":"\u00a390.00 B&B","contact":"Cary Martin","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp036","company":"Morgan Sindall via Priority","rate":"\u00a390.00 B&B","contact":"Adam Woods","phone":"","email":"","status":"called","notes":"Contracting","lastContact":"","followUp":"","agreements":[]},{"id":"corp037","company":"Mr Garcha","rate":"\u00a3105.00 B&B Executive","contact":"Mr Garcha","phone":"","email":"deepgarcha@aol.com","status":"inactive","notes":"Contract finished","lastContact":"","followUp":"","agreements":[]},{"id":"corp038","company":"NAEC","rate":"\u00a395.00 B&B","contact":"Kate Varvedo","phone":"","email":"katev@stoneleighevents.com","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp039","company":"N&C Associates","rate":"TBD","contact":"Penny Knifton","phone":"","email":"penny.knifton@westmidlands.police.uk","status":"active","notes":"Rate loaded","lastContact":"","followUp":"","agreements":[]},{"id":"corp040","company":"Orbital Response","rate":"\u00a395.00 B&B","contact":"Michael Harper","phone":"01993 319807","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp041","company":"Orchid Northern Systems","rate":"\u00a385.00 / \u00a390.00 Executive","contact":"Paul Kershaw","phone":"07894 946912","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp042","company":"Penso","rate":"\u00a392.00 B&B","contact":"Mandy Sahota","phone":"02476 217760","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp043","company":"Peugeot","rate":"\u00a387.00 B&B / \u00a3102.00 DBB","contact":"Virginie Goodlad","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp044","company":"Quick Service Logistics","rate":"\u00a390.00 B&B","contact":"Nigel Atkins","phone":"07557 215662","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp045","company":"Real Health","rate":"\u00a394.00 B&B / \u00a3114.00 DBB","contact":"Rory Mcmillen","phone":"02476 996883","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp046","company":"Rob Spiers","rate":"\u00a395.00 B&B","contact":"Rob Spiers","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp047","company":"Royal Mail","rate":"\u00a386.00 B&B","contact":"National Account","phone":"","email":"","status":"rfp","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp048","company":"Ryton","rate":"\u00a392.00 / \u00a375.00","contact":"Nicola Pearson","phone":"0121 712 6061","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp049","company":"Sainsbury's (Coventry)","rate":"\u00a379.00 B&B","contact":"Kevin Wiseman","phone":"07880 796826","email":"","status":"called","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp050","company":"Saint Gobain / Jewsons","rate":"\u00a392.00 B&B","contact":"Catherine Cooper","phone":"02476 438894","email":"","status":"active","notes":"Rate set up loaded","lastContact":"","followUp":"","agreements":[]},{"id":"corp051","company":"Schuropdy","rate":"\u00a390.00 B&B","contact":"Hayley Kinlan","phone":"01749 671709","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp052","company":"SCS","rate":"\u00a387.00 B&B / \u00a3102.00 DBB","contact":"Pauline Preston","phone":"0191 514 6041","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp053","company":"Terry Lindsay","rate":"\u00a382.00 Room only","contact":"Terry Lindsay","phone":"","email":"","status":"active","notes":"Individual","lastContact":"","followUp":"","agreements":[]},{"id":"corp054","company":"TGW","rate":"\u00a391.00 B&B","contact":"Lynn Low","phone":"01858 468855","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp055","company":"The Coventry","rate":"\u00a392.00 B&B","contact":"Vilma Law","phone":"","email":"vilma.law@thecoventry.co.uk","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp056","company":"Triway Solutions","rate":"\u00a391.00 B&B","contact":"Anthony Elkin","phone":"07808 159285","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp057","company":"UK Mail (DHL) via Capita","rate":"\u00a394.00 B&B","contact":"Suzanne Walker","phone":"01753 706070","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp058","company":"VP Defcon","rate":"\u00a387.00 B&B","contact":"Ian Parry","phone":"07714 825777","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp059","company":"Vauxhall via HG","rate":"\u00a387.00 B&B / \u00a3102.00 DBB","contact":"Ben Gash","phone":"","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp060","company":"West Atlantic","rate":"\u00a390.00 B&B","contact":"Amy Rowe","phone":"02476 882679","email":"","status":"rfp","notes":"RFP","lastContact":"","followUp":"","agreements":[]},{"id":"corp061","company":"West Cre8tive","rate":"\u00a392.00 B&B","contact":"Ben Sheared","phone":"","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp062","company":"Whale Tankers","rate":"\u00a390.00 B&B","contact":"Alison Bradnock","phone":"0121 704 5700","email":"","status":"active","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp063","company":"Wolseley","rate":"\u00a390.00 B&B","contact":"Suzie Smith","phone":"01926 705151","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp064","company":"Yazaki","rate":"\u00a395.00 B&B","contact":"Amanda Robinson","phone":"02476 658600","email":"","status":"called","notes":"","lastContact":"","followUp":"","agreements":[]},{"id":"corp065","company":"National Grid","rate":"DDR \u00a335.00 / 24hr \u00a3135.00","contact":"National Account","phone":"","email":"","status":"rfp","notes":"Apr\u2013Mar conference rate","lastContact":"","followUp":"","agreements":[]},{"id":"corp066","company":"Capita Meeting First","rate":"DDR \u00a335.00 / 24hr \u00a3140.00","contact":"National Account","phone":"","email":"","status":"rfp","notes":"Jun\u2013Dec conference rate","lastContact":"","followUp":"","agreements":[]}];

function corpGetAccounts(){
  const stored = localStorage.getItem('bh_corp_accounts');
  if(stored) return JSON.parse(stored);
  localStorage.setItem('bh_corp_accounts', JSON.stringify(CORP_DB_SEED));
  return CORP_DB_SEED.slice();
}
function corpSaveAccounts(d){ localStorage.setItem('bh_corp_accounts', JSON.stringify(d)); }

function renderCorpDb(v){
  v.innerHTML=''; v.style.padding='0';
  const accounts = corpGetAccounts();
  const search   = window._corpSearch||'';
  const filter   = window._corpFilter||'all';
  const sortBy   = window._corpSort||'company';

  let filtered = accounts;
  if(search) filtered = filtered.filter(a=>
    a.company.toLowerCase().includes(search.toLowerCase()) ||
    (a.contact||'').toLowerCase().includes(search.toLowerCase()));
  if(filter!=='all') filtered = filtered.filter(a=>a.status===filter);
  filtered = filtered.sort((a,b)=>a[sortBy]?.localeCompare?.(b[sortBy])||0);

  const statusColours = {
    active:'#dcfce7|#166534', called:'#dbeafe|#1d4ed8',
    rfp:'#fef9c3|#854d0e', inactive:'#f3f4f6|#374151', followup:'#fee2e2|#991b1b'
  };
  const statusLabels = {active:'Active',called:'Called',rfp:'RFP',inactive:'Inactive',followup:'Follow up'}; 

  const overdue = accounts.filter(a=>a.followUp && new Date(a.followUp) < new Date()).length;

  const rows = filtered.map(a=>{
    const [bg,col] = (statusColours[a.status]||'#f3f4f6|#374151').split('|');
    const isOverdue = a.followUp && new Date(a.followUp) < new Date();
    return `<tr onclick="corpOpenAccount('${a.id}')" style="border-bottom:1px solid #e5e7eb;cursor:pointer"
      onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''">
      <td style="padding:10px 12px">
        <div style="font-size:13px;font-weight:700;color:#1a2b3a">${a.company}</div>
        ${a.contact?`<div style="font-size:11px;color:#374151;margin-top:1px">${a.contact}</div>`:''}
      </td>
      <td style="padding:10px 8px;font-size:12px;font-weight:600;color:#1a2b3a">${a.rate||'—'}</td>
      <td style="padding:10px 8px;font-size:12px;color:#374151">${a.phone||'—'}</td>
      <td style="padding:10px 8px">
        <span style="padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;background:${bg};color:${col}">
          ${statusLabels[a.status]||a.status}
        </span>
      </td>
      <td style="padding:10px 8px;font-size:11px;color:${isOverdue?'#991b1b':'#374151'};font-weight:${isOverdue?'700':'400'}">
        ${a.followUp ? (isOverdue?'⚠ ':'') + new Date(a.followUp).toLocaleDateString('en-GB') : '—'}
      </td>
      <td style="padding:10px 8px;font-size:11px;color:#374151">${a.lastContact ? new Date(a.lastContact).toLocaleDateString('en-GB') : '—'}</td>
      <td style="padding:10px 8px">
        <button onclick="event.stopPropagation();corpOpenAccount('${a.id}')"
          style="padding:5px 10px;border:1.5px solid #1a2b3a;border-radius:7px;background:#fff;font:600 11px Lato;cursor:pointer;color:#1a2b3a">Open →</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#374151">No accounts found</td></tr>`;

  v.innerHTML=`<div style="padding:20px 28px;min-height:100%;background:#f0f4f8">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a">Corporate Database</div>
        <div style="font-size:13px;color:#374151">${filtered.length} of ${accounts.length} accounts${overdue>0?` · <b style="color:#991b1b">⚠ ${overdue} follow-ups overdue</b>`:''}</div>
      </div>
      <button onclick="corpAddModal()" style="padding:9px 18px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 13px Lato;cursor:pointer">+ Add account</button>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input type="text" placeholder="🔍 Search company or contact..." value="${search}"
        oninput="window._corpSearch=this.value;renderCorpDb(document.getElementById('view'))"
        style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
      <select onchange="window._corpFilter=this.value;renderCorpDb(document.getElementById('view'))"
        style="padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
        ${['all','active','called','rfp','followup','inactive'].map(s=>`<option value="${s}"${filter===s?' selected':''}>${s==='all'?'All statuses':statusLabels[s]||s}</option>`).join('')}
      </select>
      <select onchange="window._corpSort=this.value;renderCorpDb(document.getElementById('view'))"
        style="padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a;background:#fff">
        <option value="company">Sort: Company A–Z</option>
        <option value="followUp">Sort: Follow-up date</option>
        <option value="lastContact">Sort: Last contacted</option>
      </select>
    </div>

    <!-- Status summary pills -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${Object.entries(statusLabels).map(([k,l])=>{
        const cnt=accounts.filter(a=>a.status===k).length;
        const [bg,col]=(statusColours[k]||'#f3f4f6|#374151').split('|');
        return `<div onclick="window._corpFilter='${k}';renderCorpDb(document.getElementById('view'))"
          style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${bg};color:${col};cursor:pointer">
          ${l} (${cnt})</div>`;
      }).join('')}
    </div>

    <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#1a2b3a">
          ${['Company / Contact','Rate','Phone','Status','Follow-up','Last Contact',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function corpOpenAccount(accountId){
  const accounts=corpGetAccounts(), a=accounts.find(x=>x.id===accountId);
  if(!a) return;
  const [bg,col]=({active:'#dcfce7|#166534',called:'#dbeafe|#1d4ed8',rfp:'#fef9c3|#854d0e',inactive:'#f3f4f6|#374151',followup:'#fee2e2|#991b1b'}[a.status]||'#f3f4f6|#374151').split('|');

  const agreements=(a.agreements||[]).map(ag=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:6px">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1a2b3a">${ag.name}</div>
        <div style="font-size:11px;color:#374151">${ag.type} · Filed ${ag.date}</div>
      </div>
      <button onclick="corpDeleteAgreement('${accountId}','${ag.id}')"
        style="padding:3px 8px;border:1px solid #fee2e2;border-radius:6px;background:#fff;font:600 10px Lato;color:#991b1b;cursor:pointer">Remove</button>
    </div>`).join('') || '<div style="font-size:12px;color:#374151;padding:8px 0">No agreements filed</div>';

  const activityLog=(a.activity||[]).slice().reverse().map(act=>`
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
      <div style="font-size:11px;color:#374151;width:80px;flex-shrink:0">${act.date}</div>
      <div style="font-size:12px;color:#1a2b3a">${act.note}</div>
    </div>`).join('') || '<div style="font-size:12px;color:#374151">No activity logged</div>';

  openModal(`<div style="max-height:85vh;overflow-y:auto;padding:4px">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#1a2b3a">${a.company}</div>
        <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${bg};color:${col}">${a.status}</span>
      </div>
      <button onclick="closeModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#374151">✕</button>
    </div>

    <!-- Edit fields -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${[['Contact name','contact','text'],['Phone','phone','tel'],['Email','email','email'],['Rate','rate','text']].map(([l,f,t])=>`
        <div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">${l}</label>
          <input type="${t}" value="${a[f]||''}" data-field="${f}" data-id="${accountId}" onchange="corpSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>`).join('')}
      <div>
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Status</label>
        <select data-field="status" data-id="${accountId}" onchange="corpSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
          ${['active','called','rfp','followup','inactive'].map(s=>`<option value="${s}"${a.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Follow-up date</label>
        <input type="date" value="${a.followUp||''}" data-field="followUp" data-id="${accountId}" onchange="corpSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Last contacted</label>
        <input type="date" value="${a.lastContact||''}" data-field="lastContact" data-id="${accountId}" onchange="corpSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
      </div>
    </div>

    <div style="margin-bottom:14px">
      <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Notes</label>
      <textarea data-field="notes" data-id="${accountId}" onchange="corpSaveField(this)"
        style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a;min-height:60px;resize:vertical">${a.notes||''}</textarea>
    </div>

    <!-- Log activity -->
    <div style="margin-bottom:14px;padding:12px;background:#f9fafb;border-radius:10px">
      <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Log activity</div>
      <div style="display:flex;gap:8px">
        <input type="text" id="corp-act-note" placeholder="e.g. Called — left voicemail, chasing Q4 rates"
          style="flex:1;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        <button onclick="corpLogActivity('${accountId}')"
          style="padding:8px 14px;background:#1a2b3a;color:#fff;border:none;border-radius:7px;font:600 12px Lato;cursor:pointer">Log</button>
      </div>
    </div>

    <!-- Activity log -->
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Activity log</div>
      ${activityLog}
    </div>

    <!-- Agreements -->
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px">Agreements & documents</div>
        <button onclick="corpAttachAgreement('${accountId}')"
          style="padding:5px 10px;background:#4a9d7f;color:#fff;border:none;border-radius:7px;font:600 11px Lato;cursor:pointer">+ Attach</button>
      </div>
      ${agreements}
    </div>

    <div style="display:flex;gap:8px">
      <button onclick="closeModal();renderCorpDb(document.getElementById('view'))"
        style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">✓ Done</button>
      <button onclick="if(confirm('Delete ${a.company}?')){corpDeleteAccount('${accountId}');closeModal();}"
        style="padding:11px 16px;border:1.5px solid #fee2e2;border-radius:9px;background:#fff;font:600 12px Lato;color:#991b1b;cursor:pointer">Delete</button>
    </div>
  </div>`);
}

function corpSaveField(input){
  const accounts=corpGetAccounts(), a=accounts.find(x=>x.id===input.dataset.id);
  if(!a) return;
  a[input.dataset.field]=input.value;
  corpSaveAccounts(accounts);
  toast('Saved ✓');
}

function corpLogActivity(accountId){
  const note=document.getElementById('corp-act-note')?.value.trim(); if(!note) return;
  const accounts=corpGetAccounts(), a=accounts.find(x=>x.id===accountId); if(!a) return;
  if(!a.activity) a.activity=[];
  a.activity.push({id:'act'+Date.now(), date:new Date().toLocaleDateString('en-GB'), note});
  a.lastContact=new Date().toISOString().slice(0,10);
  corpSaveAccounts(accounts);
  closeModal(); corpOpenAccount(accountId);
  toast('Activity logged ✓');
}

function corpAttachAgreement(accountId){
  openModal(`<div style="padding:4px">
    <div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Attach agreement</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Document name</label>
        <input type="text" id="agr-name" placeholder="e.g. Rate Agreement 2026" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">Type</label>
        <select id="agr-type" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a">
          <option>Rate agreement</option><option>Contract</option><option>NDA</option><option>Email confirmation</option><option>Other</option>
        </select></div>
      <div style="padding:12px;background:#f9fafb;border-radius:8px;border:1.5px dashed #d1d5db;text-align:center;cursor:pointer"
        onclick="toast('File upload: connect cloud storage to enable')">
        <div style="font-size:22px;margin-bottom:4px">📎</div>
        <div style="font-size:12px;font-weight:600;color:#374151">Attach file</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">Connect Google Drive or SharePoint to enable</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="corpDoAttach('${accountId}')" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Save</button>
      <button onclick="closeModal();corpOpenAccount('${accountId}')" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`);
}

function corpDoAttach(accountId){
  const name=document.getElementById('agr-name')?.value.trim(); if(!name){toast('Enter a name');return;}
  const type=document.getElementById('agr-type')?.value||'Other';
  const accounts=corpGetAccounts(), a=accounts.find(x=>x.id===accountId); if(!a) return;
  if(!a.agreements) a.agreements=[];
  a.agreements.push({id:'agr'+Date.now(), name, type, date:new Date().toLocaleDateString('en-GB')});
  corpSaveAccounts(accounts);
  closeModal(); corpOpenAccount(accountId); toast('Agreement attached ✓');
}

function corpDeleteAgreement(accountId, agrId){
  const accounts=corpGetAccounts(), a=accounts.find(x=>x.id===accountId); if(!a) return;
  a.agreements=(a.agreements||[]).filter(ag=>ag.id!==agrId);
  corpSaveAccounts(accounts); closeModal(); corpOpenAccount(accountId);
}

function corpDeleteAccount(accountId){
  corpSaveAccounts(corpGetAccounts().filter(a=>a.id!==accountId));
  renderCorpDb(document.getElementById('view')); toast('Account deleted');
}

function corpAddModal(){
  openModal(`<div style="padding:4px">
    <div style="font-size:18px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add corporate account</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      ${[['Company name','ca-company','text'],['Rate','ca-rate','text'],['Contact name','ca-contact','text'],['Phone','ca-phone','tel'],['Email','ca-email','email']].map(([l,id,t])=>`
        <div${id==='ca-company'?' style="grid-column:span 2"':''}>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">${l}</label>
          <input type="${t}" id="${id}" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="corpDoAdd()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Add account</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`);
}

function corpDoAdd(){
  const company=document.getElementById('ca-company')?.value.trim(); if(!company){toast('Enter company name');return;}
  const accounts=corpGetAccounts();
  const newId='corp'+String(accounts.length+1).padStart(3,'0')+'_'+Date.now();
  accounts.push({id:newId,company,rate:document.getElementById('ca-rate')?.value||'',contact:document.getElementById('ca-contact')?.value||'',
    phone:document.getElementById('ca-phone')?.value||'',email:document.getElementById('ca-email')?.value||'',
    status:'active',notes:'',lastContact:'',followUp:'',agreements:[],activity:[]});
  corpSaveAccounts(accounts); closeModal();
  renderCorpDb(document.getElementById('view')); toast('✓ '+company+' added');
}


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

/* ============================================================ DEAL PROGRESS (Quote → Accepted → Agreement → Signed) */
const DEAL_STAGES = [
  { id:"enquiry",   label:"Enquiry" },
  { id:"quoted",    label:"Quote issued" },
  { id:"accepted",  label:"Accepted" },
  { id:"agreement", label:"Agreement sent" },
  { id:"signed",    label:"Client signed" },
  { id:"confirmed", label:"Confirmed" }
];
function dealStageIndex(e){
  // derive from deal fields + any linked contract + quote acceptance
  const c = (typeof ContractStore!=="undefined") ? ContractStore.all().find(x=>x.enquiryId===e.id) : null;
  const q = (typeof QuoteStore!=="undefined" && e.quoteId) ? QuoteStore.all().find(x=>x.id===e.quoteId) : null;
  if(e.status==="confirmed" || (c&&c.hotelSig)) return 5;
  if(c&&c.clientSig) return 4;
  if(c) return 3;
  if(e.dealStage==="accepted" || e.quoteAccepted || (q&&q.acceptedBy)) return 2;
  if(e.dealStage==="quoted" || e.quoteIssued) return 1;
  return 0;
}
function renderDealTrack(e){
  const box=$("#deal-track"); if(!box) return;
  const idx=dealStageIndex(e);
  box.innerHTML=DEAL_STAGES.map((s,i)=>`
    <div class="ds-step ${i<idx?"done":i===idx?"active":""}">
      <span class="ds-dot">${i<idx?"✓":i+1}</span>
      <span class="ds-lbl">${s.label}</span>
    </div>`).join('<span class="ds-line"></span>');

  const act=$("#deal-actions"); if(!act) return;
  const c = (typeof ContractStore!=="undefined") ? ContractStore.all().find(x=>x.enquiryId===e.id) : null;
  const origin=location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"");

  if(idx===0){
    // Enquiry → issue quote
    act.innerHTML=`<button class="btn block" id="d-quote" style="background:#2f6f9e">1 · Build &amp; issue quote</button>
      <p class="qs-sub" style="margin-top:6px">Opens the quote builder — add rooms, packages, menu and payment terms, then create the client link.</p>`;
    $("#d-quote").onclick=()=>{
      closeModal(); quoteEnquiry=e;
      QUOTE_ROOMS=[]; QUOTE_ACC=[]; QUOTE_CUSTOM=[]; QUOTE_PAY=[]; QUOTE_OPTIONS=[];
      if(e.quoteOptions && e.quoteOptions.length){ QUOTE_OPTIONS=JSON.parse(JSON.stringify(e.quoteOptions)); }
      if(e.quoteAcc && e.quoteAcc.length){ QUOTE_ACC=JSON.parse(JSON.stringify(e.quoteAcc)); }
      if(e.quoteCustom && e.quoteCustom.length){ QUOTE_CUSTOM=JSON.parse(JSON.stringify(e.quoteCustom)); }
      if(e.quotePay && e.quotePay.length){ QUOTE_PAY=JSON.parse(JSON.stringify(e.quotePay)); }
      window._editingQuoteId=null; switchTab("quote");
    };
  } else if(idx===1){
    // Quote issued → awaiting acceptance
    const url = e.quoteLink
      ? `${origin}/${e.quoteLink}`
      : `${origin}/quote.html?q=${e.quoteId||""}`;
    act.innerHTML=`<div class="embed-box" style="margin-bottom:8px">${url}<button class="cp" id="d-copy">Copy</button></div>
      <a class="btn block" href="${url}" target="_blank" style="margin-bottom:8px;text-align:center">Open proposal →</a>
      <p class="qs-sub" style="margin-bottom:8px">Quote issued — awaiting client acceptance. You can mark it accepted once they confirm.</p>
      <button class="btn ghost block" id="d-accept">2 · Mark quote as accepted</button>`;
    $("#d-copy").onclick=()=>{ navigator.clipboard?.writeText(url); $("#d-copy").textContent="Copied ✓"; setTimeout(()=>$("#d-copy").textContent="Copy",1500); };
    $("#d-accept").onclick=async()=>{ DB.update(e.id,{ dealStage:"accepted", quoteAccepted:true, quoteAcceptedAt:new Date().toISOString() });
      const fresh=pipelineData().find(x=>x.id===e.id)||e; Object.assign(e,fresh); renderDealTrack(e); };
  } else if(idx===2){
    // Accepted → issue agreement
    act.innerHTML=`<div class="deal-ok">✓ Quote accepted${e.quoteAcceptedAt?" · "+new Date(e.quoteAcceptedAt).toLocaleDateString("en-GB"):""}</div>
      <button class="btn block" id="d-agreement" style="margin-top:8px;background:#2f6f9e">3 · Issue agreement to sign</button>`;
    $("#d-agreement").onclick=()=>openAgreementDialog(e);
  } else if(idx===3){
    // Agreement sent → awaiting client signature
    const url=`${origin}/sign.html?c=${c.id}`;
    act.innerHTML=`<div class="embed-box" style="margin-bottom:8px">${url}<button class="cp" id="d-copy">Copy</button></div>
      <p class="qs-sub">Agreement sent — awaiting the client's signature.</p>`;
    $("#d-copy").onclick=()=>{ navigator.clipboard?.writeText(url); $("#d-copy").textContent="Copied"; };
  } else if(idx===4){
    // Client signed → counter-sign
    act.innerHTML=`<div class="deal-ok">✓ Client signed${c.clientDate?" · "+new Date(c.clientDate).toLocaleDateString("en-GB"):""} by ${c.clientSig}</div>
      <button class="btn block" id="d-countersign" style="margin-top:8px">4 · Counter-sign &amp; confirm event</button>`;
    $("#d-countersign").onclick=()=>{ closeModal(); switchTab("contracts"); setTimeout(()=>openContractDetail(c),200); };
  } else {
    act.innerHTML=`<div class="deal-ok" style="background:#e8f3ee;color:#2a6a4a">✓ Fully signed &amp; confirmed. Event is on.</div>`;
  }
}
/* Build a FULL rich quote snapshot from the quote builder and save it,
   so quote.html renders the complete proposal (images, rooms, costs, T&Cs). */
function addQuoteOption(){
  const q=gatherQuote();
  if(!q.lines.length){ alert("Build the quote first (add rooms, accommodation or packages), then add it as an option."); return; }
  const letter=String.fromCharCode(65+QUOTE_OPTIONS.length); // A, B, C
  const name=prompt(`Name this option (Option ${letter}):`, guessOptionName(q)||`Option ${letter}`);
  if(name===null) return;
  QUOTE_OPTIONS.push({ label:name||`Option ${letter}`, lines:q.lines.slice(), subtotal:q.subtotal, carbon:q.carbon });
  renderQuoteOptions();
}
function guessOptionName(q){
  const hasPkg=q.lines.some(l=>/Delegate|Package|Wedding/i.test(l.label));
  const hasHire=q.lines.some(l=>/hire/i.test(l.label));
  if(hasPkg) return "Day Delegate Package";
  if(hasHire) return "Room hire & à la carte";
  return "";
}
function renderQuoteOptions(){
  const box=$("#q-options-box"); if(!box) return;
  if(!QUOTE_OPTIONS.length){ box.innerHTML=""; return; }
  box.innerHTML=`<div class="opt-collected"><div class="oc-head">Proposal options (${QUOTE_OPTIONS.length})</div>
    ${QUOTE_OPTIONS.map((o,i)=>`<div class="oc-row"><span class="oc-let">${String.fromCharCode(65+i)}</span>
      <span class="oc-name">${o.label}</span><span class="oc-tot">${money(o.subtotal)}</span>
      <button class="mini-btn oc-del" data-i="${i}">✕</button></div>`).join("")}</div>`;
  box.querySelectorAll(".oc-del").forEach(b=>b.onclick=()=>{ QUOTE_OPTIONS.splice(+b.dataset.i,1); renderQuoteOptions(); });
}

function buildRichQuote(q, id){
  const et=EVENT_TYPES.find(x=>x.id===q.evId);
  const rooms=q.rooms.map(line=>{
    const room=qSpace(line.room); if(!room) return null;
    const pkg=PACKAGES.find(p=>p.id===line.pkg);
    return { id:room.id, name:room.name, m2:room.m2, cap:room.cap||"", restaurant:!!room.restaurant,
      img:roomImage(room), layout:line.layout||"", pax:parseInt(line.pax)||0,
      date:line.date||"", pkg:pkg?{name:pkg.name,from:pkg.from,inc:pkg.includes||pkg.inc||[]}:null,
      hire:line.hire||"none", fn:fnLabel(line), menu:(line.menu||[]) };
  }).filter(Boolean);
  return {
    id, enquiryId:(q.enquiry&&q.enquiry.id)||null,
    client:q.customer.name, clientEmail:q.customer.email, company:q.customer.co,
    eventType:et?et.label:(q.evId||"Event"), evId:q.evId,
    eventDate:q.customer.date||(q.rooms[0]&&q.rooms[0].date)||"",
    pax:q.pax, rooms, lines:q.lines, subtotal:q.subtotal, carbon:q.carbon,
    hero:(q.room?roomImage(q.room):(rooms[0]&&rooms[0].img))||"", gallery:(q.evId==="wedding"?(GALLERY.weddings||[]):(GALLERY.meetings||[])).slice(0,3),
    payments:(q.payments&&q.payments.length)?q.payments:((q.enquiry&&Array.isArray(q.enquiry.payments))?q.enquiry.payments:[]),
    options:(typeof QUOTE_OPTIONS!=="undefined"&&QUOTE_OPTIONS.length)?QUOTE_OPTIONS.slice():null,
    ref:(q.enquiry&&q.enquiry.ref)||quoteRef(q.evId, q.customer.date||(q.rooms[0]&&q.rooms[0].date), q.customer.name), created:new Date().toISOString(), status:"issued"
  };
}
/* Quote reference: [TypeLetter][ddmmyy issue]-[ddmmyyyy event]-[1st3 name]
   e.g. W230926-14072027-HAM  (W=Wedding, M=Meeting, R=Reception, C=Christmas...) */
const EVENT_TYPE_LETTER = { wedding:"W", meeting:"M", "baby-shower":"B", birthday:"P", celebration:"R", funeral:"L", christmas:"C" };
function quoteRef(evId, eventDate, name){
  const L = EVENT_TYPE_LETTER[evId] || "E";
  const iss = new Date();
  const dd=String(iss.getDate()).padStart(2,"0"), mm=String(iss.getMonth()+1).padStart(2,"0"), yy=String(iss.getFullYear()).slice(2);
  const issue = dd+mm+yy;
  let evStr="TBC";
  if(eventDate && /^\d{4}-\d{2}-\d{2}/.test(eventDate)){ const d=new Date(eventDate);
    evStr=String(d.getDate()).padStart(2,"0")+String(d.getMonth()+1).padStart(2,"0")+d.getFullYear(); }
  const nm=(name||"XXX").replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase().padEnd(3,"X");
  return `${L}${issue}-${evStr}-${nm}`;
}

function saveQuoteOnly(){
  const q=gatherQuote();
  if(!q.customer.name){ alert("Please enter the customer name first."); return; }
  if(!q.lines.length){ alert("Add at least one room, package or add-on to the quote."); return; }
  const id = window._editingQuoteId || ("Q-"+Date.now().toString(36).toUpperCase());
  const rich=buildRichQuote(q,id);
  rich.status="saved";
  QuoteStore.create(rich);
  window._editingQuoteId=id;
  // attach to customer profile
  if(typeof CustomerStore!=="undefined") CustomerStore.addQuote(rich);
  // write payments + quote link + stage back to the enquiry
  if(rich.enquiryId && typeof DB!=="undefined"){
    DB.update(rich.enquiryId,{ payments:rich.payments||[], quoteId:id, dealStage:"quoted", quoteIssued:true });
  }
  alert(`Quote saved · Ref ${rich.ref}\n\nYou can now download a PDF or send the client link.`);
}

function sendQuoteLink(){
  const q=gatherQuote();
  if(!q.customer.name){ alert("Please enter the customer name first."); return; }
  if(!q.lines.length){ alert("Add at least one room, package or add-on to the quote."); return; }
  // reuse existing quote id if this builder was opened from a saved quote
  const id = window._editingQuoteId || ("Q-"+Date.now().toString(36).toUpperCase());
  const rich=buildRichQuote(q,id);
  QuoteStore.create(rich);
  if(typeof CustomerStore!=="undefined") CustomerStore.addQuote(rich);
  if(rich.enquiryId && typeof DB!=="undefined"){
    DB.update(rich.enquiryId,{ payments:rich.payments||[], quoteId:id, dealStage:"quoted", quoteIssued:true });
  }
  window._editingQuoteId=id;
  const origin=location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"");
  const url=`${origin}/quote.html?q=${id}`;
  const emailBody=`Dear ${(rich.client||"there").split(" ")[0]},\n\nThank you for your interest in Brandon Hall Hotel and Spa. Please view your proposal — including all the details, costs and terms — and accept it online here:\n\n${url}\n\nOnce you're happy, accepting the quote lets us prepare your formal agreement.\n\nKind regards,\n${SESSION?.name||"The Events Team"}\nBrandon Hall Hotel and Spa`;
  const mailto=`mailto:${encodeURIComponent(rich.clientEmail||"")}?cc=${encodeURIComponent("events@brandonhallhotelandspa.com")}&subject=${encodeURIComponent("Your proposal — Brandon Hall Hotel and Spa")}&body=${encodeURIComponent(emailBody)}`;
  showModal("Client proposal link", rich.client, `
    <p class="qs-sub">A full proposal page has been created for the client — with images, venue &amp; room details, costs, payment schedule and terms — ready to view and accept.</p>
    <div class="embed-box" style="margin-top:10px">${url}<button class="cp" id="sq-copy">Copy</button></div>
    <div class="dual-btn" style="margin-top:10px">
      <a class="btn" href="${mailto}">✉ Email to client</a>
      <button class="btn ghost" id="sq-open">Preview page</button>
    </div>
    ${rich.enquiryId?`<p class="qs-sub" style="margin-top:8px">Linked to the enquiry — acceptance will show on its Deal progress.</p>`:`<p class="qs-sub" style="margin-top:8px">Tip: build quotes from an enquiry (Sales Pipeline) to track acceptance on the deal.</p>`}`);
  $("#sq-copy").onclick=()=>{ navigator.clipboard?.writeText(url); $("#sq-copy").textContent="Copied"; };
  $("#sq-open").onclick=()=>window.open(url,"_blank");
}

function issueQuote(e){
  // create a lightweight quote record (view+accept link). Reuse contract-style store via a quote id on the enquiry.
  const qid = e.quoteId || ("Q-"+Date.now().toString(36).toUpperCase());
  DB.update(e.id,{ dealStage:"quoted", quoteIssued:true, quoteId:qid, quoteIssuedAt:new Date().toISOString() });
  // store the quote snapshot so quote.html can render it
  const et=EVENT_TYPES.find(t=>t.id===e.event);
  const snap={ id:qid, enquiryId:e.id, client:e.company||e.name, clientEmail:e.email||"",
    eventType:et?et.label:(e.ratePlan||"Event"), eventDate:(/^\d{4}-\d{2}-\d{2}/.test(e.date||"")?e.date.slice(0,10):""),
    value:e.value||0, room:e.roomName||ROOMS.find(r=>r.id===e.room)?.name||"", pax:e.pax||"", ref:e.ref||e.id,
    created:new Date().toISOString(), status:"issued" };
  if(typeof QuoteStore!=="undefined") QuoteStore.create(snap);
  const fresh=pipelineData().find(x=>x.id===e.id)||e; Object.assign(e,fresh); renderDealTrack(e);
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
    <div class="ct-head"><div class="ct-logo">BRANDON HALL</div><div class="ct-sub">HOTEL AND SPA</div></div>
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
.ct-details td{padding:8px 10px;border-bottom:1px solid #eef2f4}.ct-details td:first-child{color:#374151;width:40%}
.ct-notes{background:#f6f8f9;border-radius:8px;padding:12px;font-size:13px;margin-top:10px}
.ct-terms{column-count:2;column-gap:22px;font-size:9px;line-height:1.5;margin-top:8px}
.term{break-inside:avoid;margin-bottom:9px}.term b{color:#1a2b47;font-size:9.5px;display:block}.term p{margin:2px 0 0}
.ct-sigrow{display:flex;gap:30px;margin-top:20px}.ct-sigbox{flex:1}
.ct-sigline{height:50px;border-bottom:2px solid #1a2b47;display:flex;align-items:flex-end;padding-bottom:4px}
.ct-sigd{font-family:'Cormorant Garamond',serif;font-size:26px;color:#1a2b47}
.ct-siglabel{font-size:11px;color:#374151;margin-top:6px}`;

/* ============================================================ QUOTES LIST */
let QUOTES_FILTER={status:"",search:""};
function renderQuotesList(v){
  v.appendChild(head("Quotes","Every proposal you've created — open, copy the link, email it, or re-open in the builder."));
  const all=(typeof QuoteStore!=="undefined")?QuoteStore.all():[];
  const origin=location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"");
  const fmt=d=>d&&/^\d{4}-\d{2}-\d{2}/.test((d||"").slice(0,10))?new Date(d).toLocaleDateString("en-GB"):(d?new Date(d).toLocaleDateString("en-GB"):"—");

  // stat cards
  const issued=all.filter(q=>q.status==="issued"||q.status==="saved").length;
  const accepted=all.filter(q=>q.acceptedBy||q.status==="accepted").length;
  const totVal=all.reduce((s,q)=>s+(q.subtotal||q.value||0),0);
  const stats=el("div","stat-cards");
  stats.innerHTML=`
    <div class="stat-card"><div class="sc-v">${all.length}</div><div class="sc-k">Total quotes</div></div>
    <div class="stat-card"><div class="sc-v">${issued}</div><div class="sc-k">Issued / awaiting</div></div>
    <div class="stat-card"><div class="sc-v" style="color:#4a9d6a">${accepted}</div><div class="sc-k">Accepted</div></div>
    <div class="stat-card"><div class="sc-v">${money(Math.round(totVal))}</div><div class="sc-k">Total value</div></div>`;
  v.appendChild(stats);

  if(!all.length){
    const empty=el("div","quote-panel");
    empty.innerHTML=`<p class="qs-sub">No quotes yet. Open an enquiry in the Sales Pipeline and use <b>Build quote</b> — every proposal you create will appear here.</p>`;
    v.appendChild(empty); return;
  }

  // filter bar
  const bar=el("div","pipe-toolbar");
  bar.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <input id="qf-search" placeholder="🔍 Search client / ref…" value="${QUOTES_FILTER.search}" style="padding:9px 12px;border:1px solid var(--line);border-radius:9px;min-width:220px">
    <select id="qf-status" style="padding:9px 12px;border:1px solid var(--line);border-radius:9px">
      <option value="">All statuses</option>
      <option value="issued" ${QUOTES_FILTER.status==="issued"?"selected":""}>Issued / awaiting</option>
      <option value="accepted" ${QUOTES_FILTER.status==="accepted"?"selected":""}>Accepted</option>
      <option value="saved" ${QUOTES_FILTER.status==="saved"?"selected":""}>Draft</option>
    </select></div>`;
  v.appendChild(bar);
  $("#qf-search").oninput=()=>{ QUOTES_FILTER.search=$("#qf-search").value; render(); };
  $("#qf-status").onchange=()=>{ QUOTES_FILTER.status=$("#qf-status").value; render(); };

  // filtered list
  let list=all.slice().sort((a,b)=>(b.created||"").localeCompare(a.created||""));
  if(QUOTES_FILTER.search){ const s=QUOTES_FILTER.search.toLowerCase();
    list=list.filter(q=>`${q.client||""} ${q.ref||""} ${q.company||""}`.toLowerCase().includes(s)); }
  if(QUOTES_FILTER.status){ list=list.filter(q=> QUOTES_FILTER.status==="accepted" ? (q.acceptedBy||q.status==="accepted") : q.status===QUOTES_FILTER.status); }

  const panel=el("div","quote-panel");
  panel.innerHTML=`<div class="tbl-scroll"><table class="ct-table">
    <tr><th>Client</th><th>Ref</th><th>Event</th><th>Date</th><th>Value</th><th>Status</th><th>Actions</th></tr>
    ${list.map(q=>{
      const val=q.subtotal||q.value||0;
      const acc=q.acceptedBy||q.status==="accepted";
      const st = acc?["Accepted","#4a9d6a"] : (q.status==="saved")?["Draft","#7a8494"] : ["Issued","#2f6f9e"];
      const nopt = q.options&&q.options.length?` <span class="qs-sub">(${q.options.length} options)</span>`:"";
      return `<tr class="ct-row">
        <td><b>${q.client||"—"}</b>${q.company?`<br><span class="qs-sub">${q.company}</span>`:""}</td>
        <td style="font-size:12px">${q.ref||q.id}</td>
        <td>${q.eventType||"—"}${nopt}</td>
        <td>${fmt(q.eventDate)}</td>
        <td>${money(Math.round(val))}</td>
        <td><span class="pay-pill" style="background:${st[1]}22;color:${st[1]}">${st[0]}</span></td>
        <td class="q-actions">
          <a class="mini-btn" href="${origin}/quote.html?q=${q.id}" target="_blank" title="Open">Open</a>
          <button class="mini-btn q-copy" data-url="${origin}/quote.html?q=${q.id}" title="Copy link">Copy</button>
          <button class="mini-btn q-email" data-id="${q.id}" title="Email">Email</button>
        </td></tr>`;
    }).join("")}
  </table></div>${list.length?"":`<p class="qs-sub" style="padding:14px">No quotes match your filter.</p>`}`;
  v.appendChild(panel);

  panel.querySelectorAll(".q-copy").forEach(b=>b.onclick=()=>{ navigator.clipboard?.writeText(b.dataset.url); b.textContent="Copied"; setTimeout(()=>b.textContent="Copy",1500); });
  panel.querySelectorAll(".q-email").forEach(b=>b.onclick=()=>{
    const q=all.find(x=>x.id===b.dataset.id); if(!q) return;
    const url=`${origin}/quote.html?q=${q.id}`;
    const body=`Dear ${(q.client||"there").split(" ")[0]},\n\nThank you for your interest in Brandon Hall Hotel and Spa. Please view your proposal and accept it online here:\n\n${url}\n\nKind regards,\n${SESSION?.name||"The Events Team"}\nBrandon Hall Hotel and Spa`;
    window.location.href=`mailto:${encodeURIComponent(q.clientEmail||"")}?cc=${encodeURIComponent("events@brandonhallhotelandspa.com")}&subject=${encodeURIComponent("Your proposal — Brandon Hall Hotel and Spa")}&body=${encodeURIComponent(body)}`;
  });
}

/* ============================================================ PAYMENTS DASHBOARD */
function renderPayments(v){
  v.appendChild(head("Payments","Track deposits and balances across all bookings — what's paid, what's due, and what's overdue."));
  const all=pipelineData().filter(e=>Array.isArray(e.payments)&&e.payments.length);
  const today=new Date().toISOString().slice(0,10);
  const soon=new Date(); soon.setDate(soon.getDate()+30); const soonStr=soon.toISOString().slice(0,10);

  // aggregate
  let totSched=0,totPaid=0,totOut=0,totOverdue=0,dueThisMonth=0;
  const dueRows=[];
  all.forEach(e=>{ e.payments.forEach(p=>{ const amt=+p.amount||0; totSched+=amt;
    if(p.paid){ totPaid+=amt; } else { totOut+=amt;
      if(p.due&&p.due<today){ totOverdue+=amt; dueRows.push({e,p,st:"overdue"}); }
      else if(p.due&&p.due<=soonStr){ dueThisMonth+=amt; dueRows.push({e,p,st:"soon"}); }
      else dueRows.push({e,p,st:"future"});
    }});
  });
  dueRows.sort((a,b)=>(a.p.due||"9999").localeCompare(b.p.due||"9999"));

  const stats=el("div","stat-cards");
  stats.innerHTML=`
    <div class="stat-card"><div class="sc-v">${money(totPaid)}</div><div class="sc-k">Total collected</div></div>
    <div class="stat-card"><div class="sc-v" style="color:#c07a3e">${money(totOut)}</div><div class="sc-k">Outstanding</div></div>
    <div class="stat-card" style="${totOverdue?'border-left:3px solid #b3261e':''}"><div class="sc-v" style="${totOverdue?'color:#b3261e':''}">${money(totOverdue)}</div><div class="sc-k">Overdue</div></div>
    <div class="stat-card"><div class="sc-v">${money(dueThisMonth)}</div><div class="sc-k">Due within 30 days</div></div>`;
  v.appendChild(stats);

  if(!all.length){
    const empty=el("div","quote-panel");
    empty.innerHTML=`<p class="qs-sub">No payment schedules yet. Open an enquiry in the Sales Pipeline and add a payment schedule (deposit / balance) to track it here.</p>`;
    v.appendChild(empty); return;
  }

  const fmt=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?new Date(d).toLocaleDateString("en-GB"):(d||"—");
  const panel=el("div","quote-panel");
  panel.innerHTML=`<div class="sec-title" style="margin-top:0">Upcoming &amp; overdue payments</div>
    <div class="tbl-scroll"><table class="ct-table">
      <tr><th>Client</th><th>Event</th><th>Instalment</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr>
      ${dueRows.slice(0,40).map(({e,p,st})=>{
        const pill = st==="overdue"?["Overdue","#b3261e"]:st==="soon"?["Due soon","#c07a3e"]:["Scheduled","#7a8494"];
        return `<tr class="ct-row" data-id="${e.id}">
          <td><b>${e.name}</b></td><td>${(EVENT_TYPES.find(t=>t.id===e.event)||{}).label||e.ratePlan||"—"}</td>
          <td>${p.label||"—"}</td><td>${money(p.amount)}</td><td>${fmt(p.due)}</td>
          <td><span class="pay-pill" style="background:${pill[1]}22;color:${pill[1]}">${pill[0]}</span></td>
          <td><button class="mini-btn pay-open" data-id="${e.id}">Open</button></td></tr>`;
      }).join("")}
    </table></div>
    <p class="qs-sub" style="margin-top:8px">Showing unpaid instalments, soonest first. Click to open the booking and mark paid.</p>`;
  v.appendChild(panel);
  panel.querySelectorAll(".pay-open").forEach(b=>b.onclick=()=>{ const e=pipelineData().find(x=>x.id===b.dataset.id); if(e) openEnquiryDetail(e); });
}

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

/* ============================================================ HOSCOM — Compliance */
function renderCompDash(v){
  const tasks=JSON.parse(localStorage.getItem('hosfix_comp_tasks')||'[]');
  const actions=JSON.parse(localStorage.getItem('hosfix_comp_actions')||'[]');
  
  function getStatus(t){
    if(t.status==='complete') return 'complete';
    if(!t.due) return 'on-track';
    const parts=t.due.split('/');
    if(parts.length<3) return 'on-track';
    const due=new Date(parseInt(parts[2]),parseInt(parts[1])-1,parseInt(parts[0]));
    const now=new Date(); now.setHours(0,0,0,0);
    const diff=Math.floor((due-now)/86400000);
    if(diff<0) return 'overdue';
    if(diff<=7) return 'due-soon';
    return 'on-track';
  }
  function fmtDue(due){
    if(!due) return '—';
    const parts=due.split('/');
    if(parts.length<3) return due;
    const d=new Date(parseInt(parts[2]),parseInt(parts[1])-1,parseInt(parts[0]));
    const diff=Math.floor((d-new Date().setHours(0,0,0,0))/86400000);
    const nd=new Date(); nd.setHours(0,0,0,0);
    const diffDays=Math.floor((d-nd)/86400000);
    if(diffDays<0) return Math.abs(diffDays)+'d overdue';
    if(diffDays===0) return 'Due today';
    if(diffDays<=7) return 'Due in '+diffDays+'d';
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  }

  const overdue=tasks.filter(t=>getStatus(t)==='overdue');
  const dueSoon=tasks.filter(t=>getStatus(t)==='due-soon');
  const onTrack=tasks.filter(t=>getStatus(t)==='on-track');
  const complete=tasks.filter(t=>t.status==='complete');
  const overdueActions=actions.filter(a=>{
    if(!a.due) return false;
    const parts=a.due.split('/');
    if(parts.length<3) return false;
    const due=new Date(parseInt(parts[2]),parseInt(parts[1])-1,parseInt(parts[0]));
    return due<new Date();
  });
  
  const byPerson={};
  tasks.forEach(t=>(t.assignees||[]).forEach(a=>{
    byPerson[a]=byPerson[a]||{total:0,overdue:0};
    byPerson[a].total++;
    if(getStatus(t)==='overdue') byPerson[a].overdue++;
  }));

  v.innerHTML=`<div style="padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--navy)">Compliance Dashboard</h2>
        <p style="font-size:13px;color:#374151">Brandon Hall Hotel and Spa · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
      </div>
      <a href="https://app.saeker.com" target="_blank" style="padding:9px 16px;border-radius:9px;background:#2a6a4a;color:#fff;font:700 13px sans-serif;text-decoration:none">Saeker ↗</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      ${[['Overdue',overdue.length,'#dc2626'],['Due this week',dueSoon.length,'#d97706'],['On track',onTrack.length,'#16a34a'],['Complete',complete.length,'#6b7280']].map(([l,n,c])=>`
        <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);border-top:4px solid ${c}">
          <div style="font-size:28px;font-weight:700;color:${c}">${n}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${l}</div>
        </div>`).join('')}
    </div>
    ${overdueActions.length?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin-bottom:20px">
      <div style="font-weight:700;color:#dc2626;margin-bottom:6px">⚡ ${overdueActions.length} overdue actions</div>
      <a href="https://app.saeker.com" target="_blank" style="font-size:13px;color:#dc2626">View in Saeker ↗</a>
    </div>`:''}
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--navy);margin-bottom:12px">By person</h3>
    <div style="display:grid;gap:8px;margin-bottom:24px">
      ${Object.entries(byPerson).sort((a,b)=>b[1].overdue-a[1].overdue).map(([name,d])=>`
        <div style="background:#fff;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--navy);display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:14px">${name}</div></div>
          <div style="font-size:13px;color:#6b7280">${d.total} tasks</div>
          ${d.overdue?`<span style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px">${d.overdue} OD</span>`:'<span style="color:#16a34a;font-size:13px;font-weight:700">✓</span>'}
        </div>`).join('')}
    </div>
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--navy);margin-bottom:12px">Most overdue</h3>
    ${overdue.slice(0,8).map(t=>`
      <div style="background:#fff;border-radius:10px;padding:12px 16px;margin-bottom:8px;border-left:4px solid #dc2626;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <div style="font-weight:600;font-size:14px;color:var(--navy);margin-bottom:4px">${t.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px">
          <span style="background:#fef2f2;color:#dc2626;font-weight:700;padding:2px 8px;border-radius:5px">${fmtDue(t.due)}</span>
          ${t.freq?`<span style="background:#f1f5f9;color:#475569;font-weight:600;padding:2px 8px;border-radius:5px">${t.freq}</span>`:''}
          <span style="color:#6b7280">${(t.assignees||[]).join(', ')}</span>
        </div>
      </div>`).join('')}
    ${tasks.length===0?`<div style="text-align:center;padding:40px;color:#6b7280">
      <div style="font-size:48px;margin-bottom:12px">🛡️</div>
      <p>No compliance data yet — it will appear here once compliance tasks are logged.</p>
    </div>`:''}
  </div>`;
}

function renderCompTasks(v){
  v.innerHTML=`<div style="padding:20px;text-align:center">
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--navy);margin-bottom:12px">Scheduled Tasks</div>
    <p style="font-size:14px;color:#374151;margin-bottom:20px">View and manage all 33 scheduled compliance tasks — sortable by priority, category and due date.</p>
    <a href="compliance.html" target="_blank" class="btn" style="background:#2a6a4a;text-decoration:none;display:inline-block;margin-bottom:12px">Open full task list ↗</a>
    <br><a href="hosmain.html" target="_blank" rel="noopener" style="font-size:13px;color:#2a6a4a;font-weight:600;text-decoration:none">📱 Open HosFIX app →</a>
  </div>`;
}

function renderCompActions(v){
  v.innerHTML=`<div style="padding:20px;text-align:center">
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--navy);margin-bottom:12px">Actions</div>
    <p style="font-size:14px;color:#374151;margin-bottom:20px">105 outstanding actions from your Saeker audits — 73 overdue. View, assign and track progress.</p>
    <a href="compliance.html#actions" target="_blank" class="btn" style="background:#2a6a4a;text-decoration:none;display:inline-block">Open actions list ↗</a>
  </div>`;
}

function renderCompReport(v){
  v.innerHTML=`<div style="padding:20px;text-align:center">
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--navy);margin-bottom:12px">Compliance Report</div>
    <p style="font-size:14px;color:#374151;margin-bottom:20px">Full printable report — per person breakdown, overdue items, completed tasks. Ready to print for Saeker update.</p>
    <a href="compliance.html" target="_blank" class="btn" style="background:#2a6a4a;text-decoration:none;display:inline-block">Open &amp; print report ↗</a>
  </div>`;
}

/* ============================================================ HOSFIX — Maintenance Portal Views */
function renderFixDash(v){
  const jobs=JSON.parse(localStorage.getItem('hosfix_jobs')||'[]');
  const open=jobs.filter(j=>j.status!=='complete'&&j.status!=='cancelled');
  const urgent=jobs.filter(j=>(j.priority==='urgent'||j.status==='urgent')&&j.status!=='complete');
  const pending=jobs.filter(j=>j.status==='pending_approval');
  const done=jobs.filter(j=>j.status==='complete');
  const totalCost=jobs.reduce((s,j)=>s+(j.cost||0),0);
  const money=v=>'£'+Number(v||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});

  v.innerHTML=`<div style="padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--navy)">HosFIX — Maintenance</h2>
        <p style="font-size:13px;color:#374151">Brandon Hall Hotel and Spa · Property & Maintenance Management</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="hosmain.html" target="_blank" rel="noopener" class="btn" style="background:#965638;text-decoration:none;font-size:13px;padding:10px 18px">📱 Open HosFIX app ↗</a>
      </div>
    </div>

    ${pending.length?`<div style="background:#fff3e0;border:1px solid #c45c00;border-radius:12px;padding:14px;margin-bottom:18px">
      <div style="font-weight:700;color:#c45c00;margin-bottom:8px">⏳ ${pending.length} job${pending.length>1?'s':''} awaiting cost approval (above £100)</div>
      ${pending.map(j=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid rgba(196,92,0,.15)">
        <span style="font-weight:600">${j.title}</span><span style="color:#c45c00;font-weight:700">${money(j.cost)}</span>
      </div>`).join('')}
    </div>`:''}

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
      ${[['🟠 Urgent',urgent.length,'var(--orange)'],['Open jobs',open.length,'var(--red)'],['Completed',done.length,'var(--green)'],[`Total costs`,money(totalCost),'var(--amber)']].map(([l,v2,c])=>
        `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(26,43,58,.06);border-top:3px solid ${c}">
          <div style="font-family:'Cormorant Garamond',serif;font-size:30px;color:${c};font-weight:600">${v2}</div>
          <div style="font-size:12px;color:#374151;margin-top:4px">${l}</div></div>`
      ).join('')}
    </div>

    ${jobs.length?`
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--navy);margin-bottom:12px">Recent jobs</h3>
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(26,43,58,.05)">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f5f7f9">
          <th style="padding:10px 13px;text-align:left;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase">Job</th>
          <th style="padding:10px 13px;text-align:left;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase">Location</th>
          <th style="padding:10px 13px;text-align:left;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase">Priority</th>
          <th style="padding:10px 13px;text-align:left;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase">Cost</th>
          <th style="padding:10px 13px;text-align:left;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase">Status</th>
        </tr></thead>
        <tbody>${jobs.slice(0,10).map(j=>`<tr style="border-bottom:1px solid #f5f7f9">
          <td style="padding:10px 13px;font-weight:600;color:var(--navy)">${j.title}</td>
          <td style="padding:10px 13px;color:#374151">${j.area||''}${j.location?' · '+j.location:''}</td>
          <td style="padding:10px 13px">
            <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:${j.priority==='urgent'?'#fff0e0':j.priority==='high'?'#fde8e6':j.priority==='medium'?'#fffbe6':'#e8f3ee'};color:${j.priority==='urgent'?'#c45c00':j.priority==='high'?'#b3261e':j.priority==='medium'?'#997300':'#2a6a4a'}">${j.priority}</span>
          </td>
          <td style="padding:10px 13px;color:${j.cost>100?'var(--orange)':'#7a8494'};font-weight:${j.cost>100?700:400}">${money(j.cost)}</td>
          <td style="padding:10px 13px">
            <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:${j.status==='complete'?'#e8f3ee':j.status==='pending_approval'?'#fff0e0':'#e8edf3'};color:${j.status==='complete'?'#2a6a4a':j.status==='pending_approval'?'#c45c00':'#1a2b47'}">${j.status==='complete'?'✓ Done':j.status==='pending_approval'?'⏳ Approval':j.status}</span>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`:`<div style="background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 8px rgba(26,43,58,.05)">
      <div style="font-size:14px;color:#374151">No maintenance jobs logged yet.</div>
      <a href="hosmain.html" target="_blank" rel="noopener" style="display:inline-block;margin-top:12px;padding:11px 20px;background:#965638;color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">Open HosFIX app →</a>
    </div>`}
  </div>`;
}

function renderFixJobs(v){
  v.innerHTML=`<div style="padding:20px;text-align:center">
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--navy);margin-bottom:12px">All Maintenance Jobs</div>
    <p style="font-size:14px;color:#374151;margin-bottom:20px">Log and manage jobs on the mobile app — use the dashboard above for a full overview.</p>
    <a href="hosmain.html" target="_blank" rel="noopener" class="btn" style="background:#965638;text-decoration:none;display:inline-block">📱 Open HosFIX app ↗</a>
  </div>`;
}

function renderFixProjects(v){
  v.innerHTML=`<div style="padding:20px;text-align:center">
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--navy);margin-bottom:12px">Maintenance Projects</div>
    <p style="font-size:14px;color:#374151;margin-bottom:20px">Spa Refurbishment, Woodland Maintenance, Bedroom Refurb and more — manage projects on the mobile app.</p>
    <a href="hosmain.html" target="_blank" rel="noopener" class="btn" style="background:#965638;text-decoration:none;display:inline-block">📱 Open HosFIX app ↗</a>
  </div>`;
}

/* ============================================================ HOSFIX — TEAM & PROFILES (portal only) */
function openPortalJobDetail(jobId){
  const JOBS=JSON.parse(localStorage.getItem('hosfix_jobs')||'[]');
  const j=JOBS.find(x=>x.id===jobId); if(!j) return;
  const HFUSERS=[
    {id:"raj",name:"Raj Kumar",color:"#1a2b3a"},{id:"ajay",name:"Ajay Kawa",color:"#c78a3b"},
    {id:"alia",name:"Alia Taub",color:"#5a8fc7"},{id:"glenn",name:"Glenn Randell",color:"#b8860b"},
    {id:"ruth",name:"Ruth Addison",color:"#be185d"},{id:"patrik",name:"Patrik Vlach",color:"#6366f1"},
    {id:"pete",name:"Pete",color:"#4DA69C"},{id:"jomy",name:"Jomy",color:"#0891b2"},
    {id:"herman",name:"Herman Charles",color:"#2a6a4a"}
  ];
  const assignees=(j.assignees||[]).map(id=>HFUSERS.find(u=>u.id===id)).filter(Boolean);
  const status=j.status==='complete'?'Complete':j.status==='in-progress'?'In progress':j.priority==='urgent'?'URGENT':'Not started';
  const statusCol=j.status==='complete'?'#2a6a4a':j.priority==='urgent'?'#c45c00':j.status==='in-progress'?'#c78a3b':'#b3261e';
  
  // Build modal
  const existing=document.getElementById('portal-job-modal');
  if(existing) existing.remove();
  const modal=document.createElement('div');
  modal.id='portal-job-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;position:relative">
      <button onclick="document.getElementById('portal-job-modal').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#374151">✕</button>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a2b3a;margin-bottom:6px;padding-right:30px">${j.title}</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span style="background:${statusCol}20;color:${statusCol};font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px">${status}</span>
        ${j.areaLabel?'<span style="background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px">📍 '+j.areaLabel+(j.location?' · '+j.location:'')+'</span>':''}
      </div>
      ${j.description?'<p style="font-size:13px;color:#6b7280;margin-bottom:16px;line-height:1.5">'+j.description+'</p>':''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        ${[['Priority',(j.priority||'medium')],['Module',j.module||'maintenance'],['Cost est.','£'+(j.cost||0).toFixed(2)],['Logged',j.createdAt?j.createdAt.slice(0,10):'—'],['Started',j.startedAt?j.startedAt.slice(0,10):'—'],['Completed',j.completedAt?j.completedAt.slice(0,10):'—']].map(([k,v])=>'<div style="background:#f9fafb;border-radius:8px;padding:10px"><div style="font-size:11px;color:#374151;margin-bottom:2px">'+k+'</div><div style="font-weight:700;font-size:13px">'+v+'</div></div>').join('')}
      </div>
      ${assignees.length?'<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#c7d2e0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Assigned to</div><div style="display:flex;gap:8px">'+assignees.map(u=>'<div style="display:flex;align-items:center;gap:7px;background:#f5f7f9;border-radius:20px;padding:5px 12px 5px 5px"><div style="width:28px;height:28px;border-radius:50%;background:'+u.color+';display:grid;place-items:center;font-size:10px;font-weight:700;color:#fff">'+u.name.split(' ').map(w=>w[0]).join('').slice(0,2)+'</div><span style="font-size:13px;font-weight:600">'+u.name+'</span></div>').join('')+'</div></div>':''}
      ${(j.materials||[]).length?'<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#c7d2e0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Materials used</div>'+j.materials.map(m=>'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f7f9;font-size:13px"><span>'+m.name+'</span><span style="font-weight:700">x'+m.qty+' · £'+(m.qty*m.tradePrice).toFixed(2)+'</span></div>').join('')+'</div>':''}
      ${(j.notes||[]).length?'<div><div style="font-size:11px;font-weight:700;color:#c7d2e0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Notes</div>'+j.notes.map(n=>'<div style="background:#f9fafb;border-radius:8px;padding:10px;margin-bottom:6px"><div style="font-size:11px;color:#374151;margin-bottom:3px">'+n.by+' · '+n.at+'</div><div style="font-size:13px">'+n.text+'</div></div>').join('')+'</div>':''}
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

function renderFixTeam(v){
  const HFUSERS=[
    {id:"raj",    name:"Raj Kumar",     role:"Property Director",            color:"#1a2b3a"},
    {id:"glenn",  name:"Glenn Randell", role:"Maintenance Manager",          color:"#b8860b"},
    {id:"ruth",   name:"Ruth Addison",  role:"Housekeeping Manager",         color:"#be185d"},
    {id:"herman", name:"Herman",        role:"Multi-trader (non-electrical)", color:"#2a6a4a"},
    {id:"pete",   name:"Pete",          role:"Multi-trader (electrical)",     color:"#4DA69C"},
    {id:"daniel", name:"Daniel",        role:"General Labour",               color:"#7c3aed"},
  ];
  const JOBS=JSON.parse(localStorage.getItem('hosfix_jobs')||'[]');
  const LOGS=JSON.parse(localStorage.getItem('hosfix_timelogs')||'[]');
  const PROFILES=JSON.parse(localStorage.getItem('hosfix_profiles')||'{}');
  const money=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const inits=n=>n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const totalMins=logs=>logs.reduce((s,l)=>s+(l.durationMins||0),0);

  v.innerHTML=`<div style="padding:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--navy)">HosFIX — Team &amp; Profiles</h2>
        <p style="font-size:13px;color:#374151">Staff profiles, contracted hours, rates and productivity. Edit profiles to update rates.</p>
      </div>
      <a href="hosmain.html" target="_blank" rel="noopener" class="btn" style="background:#965638;text-decoration:none;font-size:13px;padding:10px 18px">📱 Open HosFIX app ↗</a>
    </div>

    <!-- Summary strip -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
      ${[
        ['Total jobs logged',JOBS.length,'var(--navy)'],
        ['Open jobs',JOBS.filter(j=>j.status!=='complete').length,'var(--red)'],
        ['Complete',JOBS.filter(j=>j.status==='complete').length,'var(--green)'],
        ['Total labour cost',money(HFUSERS.reduce((s,u)=>{const p=PROFILES[u.id]||{};const mins=totalMins(LOGS.filter(l=>l.userId===u.id));return s+((mins/60)*(p.costPerHour||0));},0)),'var(--amber)']
      ].map(([l,v2,c])=>`<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(26,43,58,.06);border-top:3px solid ${c}">
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:${c};font-weight:600">${v2}</div>
        <div style="font-size:12px;color:#374151;margin-top:4px">${l}</div></div>`).join('')}
    </div>

    <!-- Staff cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
      ${HFUSERS.map(u=>{
        const p=PROFILES[u.id]||{};
        const myJobs=JOBS.filter(j=>(j.assignees||[]).includes(u.id));
        const myLogs=LOGS.filter(l=>l.userId===u.id);
        const myMins=totalMins(myLogs);
        const myHours=(myMins/60).toFixed(1);
        const myCost=((myMins/60)*(p.costPerHour||0));
        const weekMins=(p.weeklyHours||0)*60;
        const pct=weekMins?Math.min(100,Math.round(myMins/weekMins*100)):0;
        const pctColor=pct>90?'var(--red)':pct>70?'var(--amber)':'var(--green)';
        return `<div style="background:#fff;border-radius:14px;padding:18px;box-shadow:0 2px 8px rgba(26,43,58,.05)">
          <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">
            <div style="width:48px;height:48px;border-radius:50%;background:${u.color};display:grid;place-items:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0">${inits(u.name)}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:16px;color:var(--navy)">${u.name}</div>
              <div style="font-size:12px;color:#374151;margin-top:1px">${u.role}</div>
              ${p.email?`<div style="font-size:12px;color:#374151;margin-top:3px">✉️ <a href="mailto:${p.email}" style="color:#374151">${p.email}</a></div>`:''}
              ${p.mobile?`<div style="font-size:12px;color:#374151;margin-top:1px">📱 ${p.mobile}</div>`:''}
            </div>
            <button onclick="editFixProfile('${u.id}')" style="padding:7px 12px;border-radius:8px;border:1px solid var(--line);background:#fff;font:600 12px 'Lato';cursor:pointer;color:var(--navy)">Edit</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
            ${[
              [myJobs.length,'Total jobs','var(--navy)'],
              [myJobs.filter(j=>j.status!=='complete').length,'Open','var(--amber)'],
              [myJobs.filter(j=>j.status==='complete').length,'Done','var(--green)'],
              [myHours+'h','Time logged','var(--navy)']
            ].map(([val,label,color])=>`<div style="background:#f5f7f9;border-radius:9px;padding:10px;text-align:center">
              <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:${color}">${val}</div>
              <div style="font-size:10px;color:#374151;margin-top:2px">${label}</div>
            </div>`).join('')}
          </div>
          ${p.costPerHour?`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div style="background:#f5f7f9;border-radius:9px;padding:10px;text-align:center">
              <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--amber)">${money(myCost)}</div>
              <div style="font-size:10px;color:#374151;margin-top:2px">Labour cost logged</div>
            </div>
            <div style="background:#f5f7f9;border-radius:9px;padding:10px;text-align:center">
              <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--navy)">£${p.costPerHour}/hr</div>
              <div style="font-size:10px;color:#374151;margin-top:2px">${p.weeklyHours||'?'}h/wk contracted</div>
            </div>
          </div>
          <div style="font-size:11px;color:#374151;margin-bottom:4px">Weekly hours utilisation — ${myHours}h of ${p.weeklyHours||'?'}h (${pct}%)</div>
          <div style="background:#f0f2f5;border-radius:4px;height:8px"><div style="height:8px;border-radius:4px;width:${pct}%;background:${pctColor};transition:.3s"></div></div>`:'<div style="font-size:12px;color:#374151;font-style:italic">Set hourly rate to track costs</div>'}
          ${p.notes?`<div style="font-size:12px;color:#374151;margin-top:8px;font-style:italic;padding-top:8px;border-top:1px solid var(--line)">${p.notes}</div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Wire edit buttons
  HFUSERS.forEach(u=>{
    const btn=v.querySelector(`[onclick="editFixProfile('${u.id}')"]`);
    if(btn) btn.onclick=()=>editFixProfile(u.id, v);
  });
}

function editFixProfile(uid, container){
  const PROFILES=JSON.parse(localStorage.getItem('hosfix_profiles')||'{}');
  const HFUSERS=[
    {id:"raj",name:"Raj Kumar"},{id:"glenn",name:"Glenn Randell"},{id:"ruth",name:"Ruth Addison"},
    {id:"herman",name:"Herman"},{id:"pete",name:"Pete"},{id:"daniel",name:"Daniel"}
  ];
  const u=HFUSERS.find(x=>x.id===uid); const p=PROFILES[uid]||{};
  const modal=el('div'); modal.className='quote-modal-bg'; modal.style.cssText='position:fixed;inset:0;background:rgba(26,43,58,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto">
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--navy);margin-bottom:16px">Edit profile — ${u?.name}</h3>
    <div class="field"><label>Full name</label><input id="ep-name" value="${p.name||u?.name||''}"></div>
    <div class="field"><label>Email</label><input type="email" id="ep-email" value="${p.email||''}" placeholder="name@brandonhallhotelandspa.com"></div>
    <div class="field"><label>Mobile</label><input type="tel" id="ep-mobile" value="${p.mobile||''}" placeholder="07xxx xxxxxx"></div>
    <div class="field"><label>Weekly contracted hours</label><input type="number" id="ep-hours" value="${p.weeklyHours||40}" min="0" max="60" style="width:120px"></div>
    <div class="field"><label>Cost per hour (£)</label><input type="number" id="ep-rate" value="${p.costPerHour||0}" min="0" step="0.50" style="width:120px"></div>
    <div class="field"><label>Notes / qualifications</label><textarea id="ep-notes" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:9px;font:14px 'Lato';min-height:70px">${p.notes||''}</textarea></div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button id="ep-save" class="btn block" style="flex:1">Save profile</button>
      <button onclick="this.closest('.quote-modal-bg').remove()" class="btn ghost" style="flex:1;border:1px solid var(--line);background:#fff;color:var(--navy)">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#ep-save').onclick=()=>{
    PROFILES[uid]={
      name:modal.querySelector('#ep-name').value.trim()||u?.name||'',
      email:modal.querySelector('#ep-email').value.trim(),
      mobile:modal.querySelector('#ep-mobile').value.trim(),
      weeklyHours:parseFloat(modal.querySelector('#ep-hours').value)||0,
      costPerHour:parseFloat(modal.querySelector('#ep-rate').value)||0,
      notes:modal.querySelector('#ep-notes').value.trim(),
    };
    localStorage.setItem('hosfix_profiles',JSON.stringify(PROFILES));
    modal.remove();
    if(container) renderFixTeam(container);
  };
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
}

/* ============================================================ HOSFIX — Inventory (portal) */
function renderFixInventory(v){
  const INVENTORY=JSON.parse(localStorage.getItem('hosfix_inventory')||'[]');
  const money=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const cats=[...new Set(INVENTORY.map(i=>i.category))].sort();
  const lowItems=INVENTORY.filter(i=>i.stock<=i.minStock);
  const totalValue=INVENTORY.reduce((s,i)=>s+(i.stock*i.tradePrice),0);

  v.innerHTML=`<div style="padding:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--navy)">HosFIX — Stock &amp; Inventory</h2>
        <p style="font-size:13px;color:#374151">Maintenance stock levels, trade prices and reorder alerts. Update stock on the mobile app.</p>
      </div>
      <a href="hosmain.html" target="_blank" rel="noopener" class="btn" style="background:#965638;text-decoration:none;font-size:13px;padding:10px 18px">📱 Update stock on app ↗</a>
    </div>

    <!-- Summary -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
      ${[
        ['Total items',INVENTORY.length,'var(--navy)'],
        ['Low / reorder',lowItems.length,'var(--red)'],
        ['Categories',cats.length,'var(--green)'],
        ['Stock value',money(totalValue),'var(--amber)']
      ].map(([l,v2,c])=>`<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(26,43,58,.06);border-top:3px solid ${c}">
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:${c};font-weight:600">${v2}</div>
        <div style="font-size:12px;color:#374151;margin-top:4px">${l}</div></div>`).join('')}
    </div>

    ${lowItems.length?`<div style="background:#fde8e6;border:1px solid var(--red);border-radius:12px;padding:14px;margin-bottom:20px">
      <div style="font-weight:700;color:var(--red);font-size:14px;margin-bottom:8px">⚠️ ${lowItems.length} item${lowItems.length>1?'s':''} at or below minimum stock — reorder needed</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">
        ${lowItems.map(i=>`<div style="background:#fff;border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-weight:600;font-size:13px">${i.name}</div>
          <div style="font-size:11px;color:#374151">${i.supplier}</div></div>
          <div style="text-align:right"><div style="font-weight:700;color:var(--red);font-size:14px">${i.stock} left</div>
          <div style="font-size:11px;color:#374151">min: ${i.minStock}</div></div>
        </div>`).join('')}
      </div>
    </div>`:''}

    <!-- Category tabs -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${['All',...cats].map((c,i)=>`<button onclick="filterInvCat('${c}',this)" style="padding:7px 14px;border-radius:16px;border:1px solid var(--line);background:${i===0?'var(--navy)':'#fff'};color:${i===0?'#fff':'var(--ink)'};font:600 12px 'Lato';cursor:pointer">${c}</button>`).join('')}
    </div>

    <!-- Items grid -->
    <div id="inv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
      ${INVENTORY.map(i=>{
        const isLow=i.stock<=i.minStock;
        const pct=Math.min(100,Math.round(i.stock/(i.minStock*3||1)*100));
        const barCol=isLow?'var(--red)':pct<60?'var(--amber)':'var(--green)';
        return `<div class="inv-card" data-cat="${i.category}" style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 6px rgba(26,43,58,.05);border-left:4px solid ${isLow?'var(--red)':'var(--line)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="flex:1;margin-right:8px">
              <div style="font-weight:700;font-size:13px;color:var(--navy);line-height:1.3">${i.name}</div>
              <div style="font-size:11px;color:#374151;margin-top:3px">${i.supplier}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:${isLow?'var(--red)':'var(--navy)'};font-weight:600;line-height:1">${i.stock}</div>
              <div style="font-size:10px;color:#374151">${i.unit}s</div>
            </div>
          </div>
          <div style="background:#f0f2f5;border-radius:3px;height:4px;margin-bottom:8px">
            <div style="height:4px;border-radius:3px;width:${pct}%;background:${barCol};transition:.3s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#374151">
            <span>${money(i.tradePrice)} / ${i.unit}</span>
            <span>Min: ${i.minStock} · Value: ${money(i.stock*i.tradePrice)}</span>
          </div>
          ${isLow?`<div style="margin-top:6px;padding:5px 8px;background:#fde8e6;border-radius:6px;font-size:11px;color:var(--red);font-weight:600">⚠️ Reorder from ${i.supplier}</div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Wire category filter buttons
  v.querySelectorAll('[onclick^="filterInvCat"]').forEach(btn=>{
    btn.onclick=()=>{
      const cat=btn.textContent;
      v.querySelectorAll('[onclick^="filterInvCat"]').forEach(b=>{b.style.background='#fff';b.style.color='var(--ink)';});
      btn.style.background='var(--navy)'; btn.style.color='#fff';
      v.querySelectorAll('.inv-card').forEach(card=>{
        card.style.display=(cat==='All'||card.dataset.cat===cat)?'':'none';
      });
    };
  });
}

/* ============================================================ HOSFIX — Full Jobs View (portal) */
function renderFixAllJobs(v){
  const JOBS=JSON.parse(localStorage.getItem('hosfix_jobs')||'[]');
  const HFUSERS=[
    {id:"raj",name:"Raj Kumar",color:"#1a2b3a"},{id:"ajay",name:"Ajay Kawa",color:"#c78a3b"},
    {id:"alia",name:"Alia Taub",color:"#5a8fc7"},{id:"glenn",name:"Glenn Randell",color:"#b8860b"},
    {id:"ruth",name:"Ruth Addison",color:"#be185d"},{id:"jomy",name:"Jomy",color:"#0891b2"},{id:"patrik",name:"Patrik Vlach",color:"#6366f1"},
    {id:"pete",name:"Pete",color:"#4DA69C"},{id:"herman",name:"Herman Charles",color:"#2a6a4a"},
  ];
  const money=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const inits=n=>n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const tlCol={urgent:'#c45c00','not-started':'#b3261e','in-progress':'#997300','complete':'#2a6a4a','pending_approval':'#c45c00'};
  const tlLabel={urgent:'🟠 Urgent','not-started':'🔴 Not started','in-progress':'🟡 In progress','complete':'🟢 Complete','pending_approval':'⏳ Approval'};

  const open=JOBS.filter(j=>j.status!=='complete');
  const done=JOBS.filter(j=>j.status==='complete');
  const urgent=JOBS.filter(j=>j.priority==='urgent'&&j.status!=='complete');
  const totalCost=JOBS.reduce((s,j)=>s+(j.cost||0)+(j.labourCost||0),0);

  v.innerHTML=`<div style="padding:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--navy)">All Maintenance Jobs</h2>
        <p style="font-size:13px;color:#374151">${JOBS.length} jobs total · ${open.length} open · ${done.length} complete</p>
      </div>
      <a href="hosmain.html" target="_blank" rel="noopener" class="btn" style="background:#965638;text-decoration:none;font-size:13px;padding:10px 18px">📱 Open HosFIX app ↗</a>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
      ${[
        ['🟠 Urgent',urgent.length,'#c45c00'],
        ['🔴 Not started',JOBS.filter(j=>j.status==='not-started'&&j.priority!=='urgent').length,'var(--red)'],
        ['🟡 In progress',JOBS.filter(j=>j.status==='in-progress').length,'var(--amber)'],
        ['🟢 Complete',done.length,'var(--green)'],
        ['Total cost',money(totalCost),'var(--navy)']
      ].map(([l,v2,c])=>`<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 6px rgba(26,43,58,.05);border-top:3px solid ${c}">
        <div style="font-family:'Cormorant Garamond',serif;font-size:26px;color:${c};font-weight:600">${v2}</div>
        <div style="font-size:11px;color:#374151;margin-top:3px">${l}</div></div>`).join('')}
    </div>

    <!-- Filter row -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px" id="portal-job-filters">
      ${['All','Urgent','Not started','In progress','Complete','Awaiting approval'].map((f,i)=>
        `<button onclick="filterPortalJobs('${f}',this)" style="padding:7px 14px;border-radius:16px;border:1px solid var(--line);background:${i===0?'var(--navy)':'#fff'};color:${i===0?'#fff':'var(--ink)'};font:600 12px 'Lato';cursor:pointer">${f}</button>`
      ).join('')}
    </div>

    <!-- Jobs table -->
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(26,43,58,.05)">
      <table style="width:100%;border-collapse:collapse;font-size:13px" id="portal-jobs-table">
        <thead><tr style="background:#f5f7f9">
          ${['Job','Location','Type','Priority / Status','Assigned','Cost','Logged'].map(h=>
            `<th style="padding:10px 13px;text-align:left;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;white-space:nowrap">${h}</th>`
          ).join('')}
        </tr></thead>
        <tbody>
          ${[...JOBS].sort((a,b)=>{
            const ps={urgent:0,'pending_approval':1,'not-started':2,'in-progress':3,complete:4};
            const pa=a.priority==='urgent'?0:ps[a.status]||2;
            const pb=b.priority==='urgent'?0:ps[b.status]||2;
            return pa-pb;
          }).map(j=>{
            const u=HFUSERS.filter(x=>(j.assignees||[]).includes(x.id));
            const status=j.priority==='urgent'?'urgent':j.status;
            return `<tr class="portal-job-row" data-status="${status}" style="border-bottom:1px solid #f5f7f9;cursor:pointer" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
              <td style="padding:10px 13px;font-weight:600;color:var(--navy);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.title}</td>
              <td style="padding:10px 13px;color:#374151;white-space:nowrap">${j.areaLabel||''}${j.location?' · '+j.location:''}</td>
              <td style="padding:10px 13px;color:#374151;white-space:nowrap">${j.workType||'—'}</td>
              <td style="padding:10px 13px">
                <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:${tlCol[status]||'#e8edf3'}22;color:${tlCol[status]||'#1a2b47'}">${tlLabel[status]||status}</span>
              </td>
              <td style="padding:10px 13px">
                <div style="display:flex;gap:3px">
                  ${u.map(x=>`<div style="width:24px;height:24px;border-radius:50%;background:${x.color};display:grid;place-items:center;font-size:9px;font-weight:700;color:#fff" title="${x.name}">${inits(x.name)}</div>`).join('')}
                </div>
              </td>
              <td style="padding:10px 13px;font-weight:600;color:${(j.cost||0)+(j.labourCost||0)>0?'var(--amber)':'#7a8494'}">${money((j.cost||0)+(j.labourCost||0))}</td>
              <td style="padding:10px 13px;color:#374151;white-space:nowrap">${j.createdAt?.slice(0,10)||'—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;

  // Wire filter buttons
  v.querySelectorAll('#portal-job-filters button').forEach(btn=>{
    btn.onclick=()=>{
      v.querySelectorAll('#portal-job-filters button').forEach(b=>{b.style.background='#fff';b.style.color='var(--ink)';});
      btn.style.background='var(--navy)'; btn.style.color='#fff';
      const f=btn.textContent.toLowerCase().replace(' ','').replace(' ','');
      v.querySelectorAll('.portal-job-row').forEach(row=>{
        const s=row.dataset.status;
        const show = f==='all' || f==='urgent'&&s==='urgent' ||
          f==='notstarted'&&s==='not-started' || f==='inprogress'&&s==='in-progress' ||
          f==='complete'&&s==='complete' || f==='awaitingapproval'&&s==='pending_approval';
        row.style.display=show?'':'none';
      });
    };
  });
}


// ── HosSHIFT / HosSTAFF shared staff storage ──────────────────────────────
const HS_REAL_STAFF = [{"id":"natalie_freeman_4","staffCode":"12941","name":"Natalie Freeman","role":"Event Executive","dept":"admin","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":13.46,"weeklyWage":538.4,"workDays":[1,1,1,1,1,0,0],"standardShift":"09:00-17:30","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-07-27","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Sales & Marketing","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":44.56,"holTakenHrs":72.0,"holOutstandingHrs":-27.44,"holYearEndHrs":80.34,"holAsAt":"2026-10-07"},{"id":"nicola_3","staffCode":"BH002","name":"Nicola Cartwright","role":"Sales Manager","dept":"admin","type":"relief","contract":"Zero hours","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief cover","docs":[],"hrStatus":"not-on-hr"},{"id":"veronica_webb_2","staffCode":"12677","name":"Veronica Webb","role":"Finance Assistant","dept":"admin","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":14.42,"weeklyWage":576.8,"workDays":[1,0,0,1,1,0,0],"standardShift":"08:00-16:00","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-01-06","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Finance","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":116.22,"holTakenHrs":80.0,"holOutstandingHrs":36.22,"holYearEndHrs":144.0,"holAsAt":"2026-10-07"},{"id":"aghil_joy_8","staffCode":"12713","name":"Aghil Joy","role":"Receptionist","dept":"reception","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":12.71,"weeklyWage":508.4,"workDays":[1,0,0,1,1,1,1],"standardShift":"Variable","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-02-03","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Reception","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":120.34,"holTakenHrs":224.0,"holOutstandingHrs":-103.66,"holYearEndHrs":4.12,"holAsAt":"2026-10-07"},{"id":"alice_asumeng_7","staffCode":"12898","name":"Alice Asumeng","role":"Receptionist","dept":"reception","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":12.71,"weeklyWage":508.4,"workDays":[1,1,1,1,0,0,1],"standardShift":"Variable","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-05-13","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Reception","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":90.32,"holTakenHrs":48.0,"holOutstandingHrs":42.32,"holYearEndHrs":150.1,"holAsAt":"2026-10-07"},{"id":"manjusha_ushadevi_6","staffCode":"12685","name":"Manjusha Ushadevi","role":"Reception Supervisor","dept":"reception","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":12.98,"weeklyWage":519.2,"workDays":[0,1,1,1,1,1,0],"standardShift":"Variable","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-01-05","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Reception","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":116.22,"holTakenHrs":56.0,"holOutstandingHrs":60.22,"holYearEndHrs":168.0,"holAsAt":"2026-10-07"},{"id":"patrik_vlach_5","staffCode":"13001","name":"Patrik Vlach","role":"Front Office Manager","dept":"reception","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":14.42,"weeklyWage":576.8,"workDays":[1,1,1,0,1,1,1],"standardShift":"Variable","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-07-27","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Shift lead","docs":[],"hrDept":"Reception","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":44.56,"holTakenHrs":0.0,"holOutstandingHrs":44.56,"holYearEndHrs":152.34,"holAsAt":"2026-10-07"},{"id":"alan_wilkins_9","staffCode":"12893","name":"Alan Wilkins","role":"Nights Supervisor","dept":"nights","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":13.94,"weeklyWage":557.6,"workDays":[1,1,1,1,0,0,1],"standardShift":"23:00-07:00","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-06-01","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Nights","payBasis":"salary","nightWorker":true,"hrStatus":"hr","holAccruedHrs":78.88,"holTakenHrs":104.0,"holOutstandingHrs":-25.12,"holYearEndHrs":82.66,"holAsAt":"2026-10-07"},{"id":"amal_premkumar_10","staffCode":"12839","name":"Amal Premkumar","role":"Night Porter","dept":"nights","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":13.71,"weeklyWage":0.0,"workDays":[0,0,0,0,1,1,0],"standardShift":"23:00-07:00","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-04-16","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Nights","payBasis":"hourly","nightWorker":true,"hrStatus":"hr","holAccruedHrs":103.71,"holTakenHrs":0.0,"holOutstandingHrs":103.71,"holYearEndHrs":105.64,"holAsAt":"2026-10-07"},{"id":"glenn_randell_11","staffCode":"BH010","name":"Glenn Randell","role":"Maintenance Manager","dept":"maintenance","type":"core","contract":"Full-time","contractHrs":40,"hourlyRate":16.0,"weeklyWage":640.0,"workDays":[1,1,1,1,1,0,0],"standardShift":"08:00-16:00","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrStatus":"not-on-hr"},{"id":"herman_charles_13","staffCode":"BH012","name":"Herman Charles","role":"Multi-trader","dept":"maintenance","type":"relief","contract":"Zero hours","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"As required","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Non-electrical","docs":[],"hrStatus":"not-on-hr"},{"id":"pete_12","staffCode":"BH011","name":"Pete","role":"Multi-trader (Elec)","dept":"maintenance","type":"relief","contract":"Zero hours","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"As required","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Electrical","docs":[],"hrStatus":"not-on-hr"},{"id":"david_marshall_16","staffCode":"12906","name":"David Marshall","role":"Kitchen Porter","dept":"kitchen","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[1,1,1,1,1,0,0],"standardShift":"07:00-15:00","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-06-12","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Kitchen","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":61.84,"holTakenHrs":21.0,"holOutstandingHrs":40.84,"holYearEndHrs":43.19,"holAsAt":"2026-10-07"},{"id":"devendra_subedi_14","staffCode":"12803","name":"Devendra Subedi","role":"Junior Sous Chef","dept":"kitchen","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":18.02,"weeklyWage":720.8,"workDays":[0,1,1,1,1,0,1],"standardShift":"05:30-14:00","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-03-09","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Kitchen","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":93.68,"holTakenHrs":16.0,"holOutstandingHrs":77.68,"holYearEndHrs":185.46,"holAsAt":"2026-10-07"},{"id":"nathan_field_17","staffCode":"12949","name":"Nathan Field","role":"Kitchen Porter","dept":"kitchen","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[1,1,1,1,0,1,1],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-07-01","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Kitchen","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":58.49,"holTakenHrs":0.0,"holOutstandingHrs":58.49,"holYearEndHrs":60.66,"holAsAt":"2026-10-07"},{"id":"sajeed_15","staffCode":"BH014","name":"Sajeed","role":"Breakfast Team","dept":"kitchen","type":"relief","contract":"Full-time","contractHrs":24,"hourlyRate":13.8,"weeklyWage":331.2,"workDays":[0,0,0,0,0,0,0],"standardShift":"05:30-14:00","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrStatus":"not-on-hr"},{"id":"jomy_mathai_joy_18","staffCode":"12684","name":"Jomy Mathai Joy","role":"Bar Supervisor","dept":"bar","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":12.98,"weeklyWage":519.2,"workDays":[0,1,1,1,1,1,0],"standardShift":"15:00-23:00","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-01-05","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Bar","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":117.84,"holTakenHrs":0.0,"holOutstandingHrs":117.84,"holYearEndHrs":225.62,"holAsAt":"2026-10-07"},{"id":"rowan_wilkins_19","staffCode":"12943","name":"Rowan Wilkins","role":"Bar Team Member","dept":"bar","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":12.71,"weeklyWage":508.4,"workDays":[1,1,1,0,1,1,0],"standardShift":"Variable","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-07-10","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Bar","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":54.8,"holTakenHrs":48.0,"holOutstandingHrs":6.8,"holYearEndHrs":114.58,"holAsAt":"2026-10-07"},{"id":"anael_nkunga_22","staffCode":"12690","name":"Anael Nkunga","role":"F&B Team Member","dept":"restaurant","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-01-05","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Restaurant","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":26.74,"holTakenHrs":13.75,"holOutstandingHrs":12.99,"holYearEndHrs":12.99,"holAsAt":"2026-10-07"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"betel_elias_44","staffCode":"13078","name":"Betel Elias","role":"F&B Team Member","dept":"restaurant","hrDept":"Restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-08-21","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":6.95,"holTakenHrs":0.0,"holOutstandingHrs":6.95,"holYearEndHrs":6.95,"holAsAt":"2026-10-07"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"caitlin_playdon_40","staffCode":"12872","name":"Caitlin Playdon","role":"F&B Team Member","dept":"restaurant","hrDept":"Restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-05-04","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":25.78,"holTakenHrs":0.0,"holOutstandingHrs":25.78,"holYearEndHrs":26.38,"holAsAt":"2026-10-07"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"cameron_mcgregor_42","staffCode":"12948","name":"Cameron McGregor","role":"F&B Team Member","dept":"restaurant","hrDept":"Restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-07-01","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":4.1,"holTakenHrs":0.0,"holOutstandingHrs":4.1,"holYearEndHrs":4.1,"holAsAt":"2026-10-07"},{"id":"catarina_li_20","staffCode":"BH019","name":"Catarina Li","role":"Assistant Manager","dept":"restaurant","type":"core","contract":"Full-time","contractHrs":40,"hourlyRate":14.0,"weeklyWage":560.0,"workDays":[0,1,1,1,1,1,0],"standardShift":"15:00-23:00","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrStatus":"not-on-hr"},{"id":"darren_28","staffCode":"13083","name":"Darren Younge","role":"F&B Team Member","dept":"restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-08-21","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Restaurant","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":11.96,"holTakenHrs":0.0,"holOutstandingHrs":11.96,"holYearEndHrs":11.96,"holAsAt":"2026-10-07"},{"id":"dhruvilsinh_chauhan_24","staffCode":"12874","name":"Dhruvilsinh Chauhan","role":"Breakfast Team Member","dept":"restaurant","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-05-04","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Restaurant","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":74.8,"holTakenHrs":0.0,"holOutstandingHrs":74.8,"holYearEndHrs":75.52,"holAsAt":"2026-10-07"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"jaimie_leigh_watts_41","staffCode":"12945","name":"Jaimie-Leigh Watts","role":"F&B Team Member","dept":"restaurant","hrDept":"Restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-07-01","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":11.26,"holTakenHrs":0.0,"holOutstandingHrs":11.26,"holYearEndHrs":11.86,"holAsAt":"2026-10-07"},{"id":"jayan_26","staffCode":"13091","name":"Jayan Gerget","role":"F&B Team Member","dept":"restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-08-24","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Restaurant","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":6.94,"holTakenHrs":0.0,"holOutstandingHrs":6.94,"holYearEndHrs":7.6,"holAsAt":"2026-10-07"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"lily_mae_mcdonald_43","staffCode":"13077","name":"Lily-Mae Mcdonald","role":"F&B Team Member","dept":"restaurant","hrDept":"Restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-08-21","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":3.62,"holTakenHrs":0.0,"holOutstandingHrs":3.62,"holYearEndHrs":4.83,"holAsAt":"2026-10-07"},{"id":"manjinder_shergill_21","staffCode":"12687","name":"Manjinder Kaur Shergill","role":"F&B Supervisor","dept":"restaurant","type":"core","contract":"Part-time","contractHrs":30.0,"hourlyRate":12.98,"weeklyWage":389.4,"workDays":[1,1,1,1,1,0,0],"standardShift":"06:00-12:00","leaveAllowance":21.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-01-05","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Restaurant","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":87.16,"holTakenHrs":6.0,"holOutstandingHrs":81.16,"holYearEndHrs":162.0,"holAsAt":"2026-10-07"},{"id":"nevin_29","staffCode":"12942","name":"Nevin Babu","role":"F&B Team Member","dept":"restaurant","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":12.71,"weeklyWage":508.4,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-07-06","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Restaurant","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":57.2,"holTakenHrs":8.0,"holOutstandingHrs":49.2,"holYearEndHrs":156.98,"holAsAt":"2026-10-07"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"olivia_hale_45","staffCode":"13079","name":"Olivia Hale","role":"F&B Team Member","dept":"restaurant","hrDept":"Restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-08-21","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":4.09,"holTakenHrs":0.0,"holOutstandingHrs":4.09,"holYearEndHrs":4.69,"holAsAt":"2026-10-07"},{"id":"reuven_25","staffCode":"13084","name":"Reuven Shergill","role":"F&B Team Member","dept":"restaurant","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-09-01","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Restaurant","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":8.96,"holTakenHrs":0.0,"holOutstandingHrs":8.96,"holYearEndHrs":11.8,"holAsAt":"2026-10-07"},{"id":"sheba_tychicus_23","staffCode":"BH022","name":"Sheba Tychicus","role":"F&B Team Member","dept":"restaurant","type":"core","contract":"Zero hours","contractHrs":0,"hourlyRate":12.0,"weeklyWage":0,"workDays":[0,0,1,1,1,1,1],"standardShift":"06:00-12:00","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrStatus":"not-on-hr"},{"id":"allen_37","staffCode":"13085","name":"Allen Thomas","role":"Housekeeping Team Member","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"09:00-16:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-08-19","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":12.41,"holTakenHrs":0.0,"holOutstandingHrs":12.41,"holYearEndHrs":14.22,"holAsAt":"2026-10-07"},{"id":"arthur_27","staffCode":"13089","name":"Arthur Bennett","role":"Housekeeping Team Member","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-08-01","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Trainee","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":4.48,"holTakenHrs":0.0,"holOutstandingHrs":4.48,"holYearEndHrs":4.48,"holAsAt":"2026-10-07"},{"id":"aryan_31","staffCode":"BH030","name":"Aryan","role":"Housekeeping","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0,"hourlyRate":12.71,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"09:00-16:30","leaveAllowance":28,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrStatus":"not-on-hr"},{"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveUsed":0,"leavePending":0,"probationPassed":false,"dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"id":"ayomidipupo_yoemi_46","staffCode":"13088","name":"Ayomidipupo Yoemi","role":"Housekeeping Team Member","dept":"housekeeping","hrDept":"Room Cleaning","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"payBasis":"hourly","startDate":"2026-08-30","leaveAllowance":0,"nightWorker":false,"hrStatus":"hr","holAccruedHrs":12.05,"holTakenHrs":0.0,"holOutstandingHrs":12.05,"holYearEndHrs":12.05,"holAsAt":"2026-10-07"},{"id":"dushyanth_39","staffCode":"13041","name":"Dushyanth Vuyyuru","role":"Housekeeping Team Member","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[1,1,1,1,1,0,0],"standardShift":"09:00-16:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-08-03","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":31.25,"holTakenHrs":0.0,"holOutstandingHrs":31.25,"holYearEndHrs":33.97,"holAsAt":"2026-10-07"},{"id":"hassen_38","staffCode":"12998","name":"Haseen Muskaan","role":"Housekeeping Team Member","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"09:00-16:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-07-19","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":44.73,"holTakenHrs":0.0,"holOutstandingHrs":44.73,"holYearEndHrs":46.54,"holAsAt":"2026-10-07"},{"id":"jitendra_34","staffCode":"13090","name":"Jitendra Dasnur","role":"Housekeeping Team Member","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"09:00-16:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-09-01","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":11.05,"holTakenHrs":0.0,"holOutstandingHrs":11.05,"holYearEndHrs":11.96,"holAsAt":"2026-10-07"},{"id":"lara_jervis_32","staffCode":"12902","name":"Lara Jervis","role":"Housekeeping Team Member","dept":"housekeeping","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,1,0,1,0,0,1],"standardShift":"09:00-15:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-05-19","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":37.84,"holTakenHrs":23.75,"holOutstandingHrs":14.09,"holYearEndHrs":14.09,"holAsAt":"2026-10-07"},{"id":"manoj_35","staffCode":"13042","name":"Mani Sonti","role":"Housekeeping Team Member","dept":"housekeeping","type":"relief","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[0,0,0,0,0,0,0],"standardShift":"09:00-16:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-08-03","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Relief","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":23.66,"holTakenHrs":0.0,"holOutstandingHrs":23.66,"holYearEndHrs":26.38,"holAsAt":"2026-10-07"},{"id":"rahul_reghunath_33","staffCode":"12666","name":"Rahul Reghunath","role":"Housekeeping Team Member","dept":"housekeeping","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[1,0,1,0,1,1,1],"standardShift":"06:30-14:30","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2025-11-06","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":135.82,"holTakenHrs":0.0,"holOutstandingHrs":135.82,"holYearEndHrs":138.78,"holAsAt":"2026-10-07"},{"id":"ruth_addison_30","staffCode":"12688","name":"Ruth Addison","role":"Head Housekeeper","dept":"housekeeping","type":"core","contract":"Full-time","contractHrs":40.0,"hourlyRate":14.42,"weeklyWage":576.8,"workDays":[0,1,1,1,1,0,1],"standardShift":"09:00-17:00","leaveAllowance":28.0,"leaveUsed":0,"leavePending":0,"probationPassed":true,"startDate":"2026-01-05","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Room Cleaning","payBasis":"salary","nightWorker":false,"hrStatus":"hr","holAccruedHrs":116.22,"holTakenHrs":8.0,"holOutstandingHrs":108.22,"holYearEndHrs":216.0,"holAsAt":"2026-10-07"},{"id":"tushar_ambekar_36","staffCode":"12838","name":"Tushar Ambekar","role":"Housekeeping Team Member","dept":"housekeeping","type":"core","contract":"Zero hours","contractHrs":0.0,"hourlyRate":12.71,"weeklyWage":0.0,"workDays":[1,1,1,1,0,1,0],"standardShift":"09:00-17:00","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"2026-04-01","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"","docs":[],"hrDept":"Room Cleaning","payBasis":"hourly","nightWorker":false,"hrStatus":"hr","holAccruedHrs":71.92,"holTakenHrs":0.0,"holOutstandingHrs":71.92,"holYearEndHrs":74.82,"holAsAt":"2026-10-07"},{"id":"david_head_chef_47","staffCode":"","name":"David (Head Chef)","role":"Head Chef","dept":"kitchen","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"matt_48","staffCode":"","name":"Matt","role":"Chef","dept":"kitchen","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"ashleigh_49","staffCode":"","name":"Ashleigh","role":"Chef","dept":"kitchen","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"noah_50","staffCode":"","name":"Noah","role":"Kitchen Team","dept":"kitchen","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"satya_51","staffCode":"","name":"Satya","role":"Housekeeping (training)","dept":"housekeeping","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"yaya_52","staffCode":"","name":"Yaya","role":"Housekeeping","dept":"housekeeping","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"edwin_53","staffCode":"","name":"Edwin","role":"Housekeeping","dept":"housekeeping","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"},{"id":"anisha_54","staffCode":"","name":"Anisha","role":"Housekeeping","dept":"housekeeping","type":"relief","contract":"Not on HR export","contractHrs":0,"hourlyRate":0,"weeklyWage":0,"workDays":[0,0,0,0,0,0,0],"standardShift":"Variable","leaveAllowance":0,"leaveUsed":0,"leavePending":0,"probationPassed":false,"startDate":"","dob":"","address":"","phone":"","email":"","niNumber":"","emergencyName":"","emergencyPhone":"","emergencyRel":"","notes":"Added from rota w/c 12 Oct 2026","docs":[],"hrStatus":"not-on-hr"}];


/* ============================================================
   HosPEOPLE — HR DATA (HR export import, Xero files, seed update)
   Only work details are kept in this file (it's public). Personal
   details from an HR import are saved on that computer only, and
   bank details, ethnicity, nationality and right-to-work data are
   never stored at all.
   ============================================================ */
const HS_SEED_VERSION='2026-10-09-rota';
const HS_HR_FIELDS=['staffCode','type','name','role','dept','hrDept','contract','contractHrs','hourlyRate','weeklyWage','payBasis','startDate','leaveAllowance','nightWorker','hrStatus','holAccruedHrs','holTakenHrs','holOutstandingHrs','holYearEndHrs','holAsAt'];
const HS_HR_DEPT={'01a':'reception','03a':'nights','05b':'housekeeping','06a':'restaurant','07a':'bar','08a':'kitchen','13a':'admin','14a':'admin'};
const HS_HR_ROLE={'Housekeeping Team Mb':'Housekeeping Team Member','Breakfast Team Mbr':'Breakfast Team Member'};
let hsSeedBusy=false;
/* Bring computers that already have staff saved up to date with the latest HR seed (once per version) */
function hsApplySeedUpdate(){
  // One-off: the 7 Oct import briefly copied contact details into plain browser storage; they now live only in the locked payroll records
  try{ if(!localStorage.getItem('hs_pii_clean_v1')){ const raw=localStorage.getItem('hs_profiles'); if(raw){ const l=JSON.parse(raw);
    l.forEach(x=>{ if(x.hrStatus==='hr') ['dob','address','phone','email','emergencyName','emergencyPhone','emergencyRel','niNumber','annualSalary'].forEach(k=>{ if(k==='annualSalary') return; x[k]=''; }); });
    localStorage.setItem('hs_profiles',JSON.stringify(l)); } localStorage.setItem('hs_pii_clean_v1','1'); } }catch(e){}
  if(hsSeedBusy) return; let ver=''; try{ ver=localStorage.getItem('hs_seed_ver')||''; }catch(e){}
  if(ver===HS_SEED_VERSION) return;
  hsSeedBusy=true;
  try{
    ['sp_staff','hs_profiles'].forEach(key=>{
      const raw=localStorage.getItem(key); if(!raw) return;
      const list=JSON.parse(raw)||[];
      HS_REAL_STAFF.forEach(seed=>{
        const cur=list.find(x=>x.id===seed.id);
        if(cur){ HS_HR_FIELDS.forEach(f=>{ if(seed[f]!==undefined) cur[f]=seed[f]; }); }
        else list.push(JSON.parse(JSON.stringify(seed)));
      });
      list.forEach(x=>{ if(!HS_REAL_STAFF.some(s=>s.id===x.id) && !x.hrStatus) x.hrStatus='not-on-hr'; });
      localStorage.setItem(key, JSON.stringify(list));
    });
    localStorage.setItem('hs_seed_ver', HS_SEED_VERSION);
  }catch(e){ console.warn('Staff seed update failed', e); }
  hsSeedBusy=false;
}
function hsIso(d){ const m=String(d||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''; }
function hsTitle(x){ x=String(x||'').trim(); return (x.length>2 && x===x.toUpperCase()) ? x.charAt(0)+x.slice(1).toLowerCase() : x; }
function hsReadCSVFile(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result||'')); r.onerror=rej; r.readAsText(file); }); }
function hsRowsToObjects(text){
  const rows=spParseCSV(text).filter(r=>r.some(c=>String(c).trim()));
  const head=(rows.shift()||[]).map(h=>String(h).trim());
  return rows.map(r=>{ const o={}; head.forEach((h,i)=>o[h]=String(r[i]==null?'':r[i]).trim()); return o; });
}
function hsKind(objs){ const k=Object.keys(objs[0]||{}); if(k.includes('employee_id')&&k.includes('job_title_desc')) return 'hr'; if(k.includes('holiday_outstanding')) return 'holiday'; return ''; }

/* Import the HR system export (ALL_*.csv) and/or the Holiday & Lieu report */
function hsImportHRModal(){
  showModal('Import from the HR system','Updates Staff Profiles, the rota and payroll',`
    <div style="font-size:13px;color:#1a2b3a;line-height:1.55">
      <p style="margin:0 0 10px">Choose the <b>staff export</b> (ALL_….csv) and, if you have it, the <b>Holiday and Lieu Report</b>. You can pick both at once.</p>
      <ul style="margin:0 0 12px 18px;padding:0;font-size:12.5px;color:#374151">
        <li>Updates job title, department, contract, hours, hourly rate, salary, start date and holiday balances.</li>
        <li>Adds anyone new. Nobody is deleted — people not in the file are flagged so you can check them.</li>
        <li>Personal details, NI numbers, bank details, right to work and emergency contacts go into the <b>locked payroll records</b>, encrypted with the payroll password before they leave this computer.</li>
        <li>Ethnicity, marital status, nationality and gender identity are not kept.</li>
      </ul>
      ${hrUnlocked()?'<div style="font-size:12.5px;color:#166534;margin-bottom:10px">🔓 Payroll records are unlocked — they\'ll be updated with the same password.</div>':`<label style="display:block;font-size:12.5px;font-weight:700;margin-bottom:10px">Payroll password <span style="font-weight:400;color:#4b5563">(the first import sets it)</span><input id="hs-imp-pass" type="password" autocomplete="off" style="display:block;width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;margin-top:4px;font:14px Lato"></label>`}
      <label style="display:inline-block;padding:10px 16px;border-radius:9px;background:#2B726A;color:#fff;font:700 13px Lato;cursor:pointer">📤 Choose CSV file(s)<input type="file" accept=".csv,text/csv" multiple style="display:none" onchange="hsImportHR(this.files)"></label>
      <div id="hs-imp-out" style="margin-top:12px"></div>
    </div>`);
}
async function hsImportHR(files){
  const out=document.getElementById('hs-imp-out'); if(out) out.innerHTML='Reading…';
  let hr=null, hol=null;
  for(const f of files){ const objs=hsRowsToObjects(await hsReadCSVFile(f)); const k=hsKind(objs); if(k==='hr') hr=objs; else if(k==='holiday') hol=objs; }
  if(!hr && !hol){ if(out) out.innerHTML='<div style="color:#b3261e">Those files don\'t look like the HR staff export or the Holiday report.</div>'; return; }
  hsApplySeedUpdate();
  const stores={sp_staff:spGetStaff(), hs_profiles:hsGetProfilesSeeded()};
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
  const find=(list,code,first,last)=>list.find(x=>String(x.staffCode)===String(code))
    || list.find(x=>norm(x.name)===norm(first+last))
    || (list.filter(x=>norm(x.name.split(' ')[0])===norm(first)).length===1 ? list.find(x=>norm(x.name.split(' ')[0])===norm(first)) : null);
  let updated=0, added=[], seen=new Set();
  if(hr) hr.forEach(r=>{
    if(r.leaver_ind==='Y' || r.termination_date) return;
    const first=r.employee_first_name, last=hsTitle(r.employee_last_name), code=r.employee_id;
    const hrs=+r.contract_hours_per_week||0, rate=+r.r1_hourly_rate||0, C=r.contract_type_code==='C';
    const work={ staffCode:code, name:first+' '+last, role:HS_HR_ROLE[r.job_title_desc]||r.job_title_desc, dept:HS_HR_DEPT[r.department_id]||'admin', hrDept:r.department_desc,
      contract:C?'Zero hours':(hrs>=35?'Full-time':'Part-time'), contractHrs:hrs, hourlyRate:rate, weeklyWage:Math.round(hrs*rate*100)/100,
      payBasis:r.payroll_method_code==='S'?'salary':'hourly', annualSalary:+r.salary||0, startDate:hsIso(r.commencement_date),
      leaveAllowance:(+r.holiday_entitlement||0)/8, nightWorker:r.night_worker_ind==='Y', hrStatus:'hr' };
    let isNew=false;
    Object.entries(stores).forEach(([key,list])=>{
      let cur=find(list,code,first,last);
      if(!cur){ isNew=true; cur={ id:(first+'_'+last).toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_'+code, type:C?'relief':'core', workDays:[0,0,0,0,0,0,0], standardShift:'Variable',
        leaveUsed:0, leavePending:0, probationPassed:false, notes:'', docs:[] }; list.push(cur); }
      Object.assign(cur, work);
      seen.add(cur.id);
    });
    if(isNew) added.push(work.name); else updated++;
  });
  let holN=0;
  if(hol) hol.forEach(h=>{
    Object.values(stores).forEach(list=>{ const cur=find(list,h.staff_id,h.first_name,hsTitle(h.family_name)); if(!cur) return;
      Object.assign(cur,{holAccruedHrs:+h.holiday_accrued_to_date||0,holTakenHrs:+h.holiday_taken_to_date||0,holOutstandingHrs:+h.holiday_outstanding||0,holYearEndHrs:+h.year_end_balance||0,holAsAt:h.as_at_date||''});
      if(list===stores.sp_staff) holN++; });
  });
  let notIn=[];
  if(hr){ Object.values(stores).forEach(list=>list.forEach(x=>{ if(!seen.has(x.id)){ x.hrStatus='not-on-hr'; if(list===stores.sp_staff) notIn.push(x.name); } })); }
  spSaveStaff(stores.sp_staff); hsSaveProfiles(stores.hs_profiles);
  try{ localStorage.setItem('hs_hr_imported', new Date().toISOString()); }catch(e){}
  let vaultMsg='';
  if(hr){
    try{ const pi=document.getElementById('hs-imp-pass'); const res=await hrStoreExport(hr, pi&&pi.value);
      vaultMsg=`<div style="margin-top:6px;color:#166534">🔐 Payroll records saved for <b>${res.count}</b> people — ${res.where==='live'?'encrypted in Firebase':'encrypted on this computer only (sign in on the live site to share them)'}.</div>`; }
    catch(e){ vaultMsg=`<div style="margin-top:6px;color:#b3261e">Payroll records NOT saved: ${spEsc(e.message||e)}</div>`; }
  }
  if(out) out.innerHTML=`<div style="background:#E2F1EE;border-radius:10px;padding:12px;font-size:13px">
    ✅ ${hr?`<b>${updated}</b> updated, <b>${added.length}</b> added${added.length?` (${added.map(spEsc).join(', ')})`:''}.`:''} ${hol?`Holiday balances updated for <b>${holN}</b>.`:''}
    ${notIn.length?`<div style="margin-top:6px;color:#9a3412">Not in the HR file (flagged, not deleted): ${notIn.map(spEsc).join(', ')}</div>`:''}${vaultMsg}</div>`;
  if(CURRENT_TAB) setTimeout(()=>{ const v=document.getElementById('view'); if(v && /staffProfiles|rotaPayroll|rotaWeek/.test(CURRENT_TAB)) render(); }, 50);
}

/* ── Xero: employee file (built straight from the HR export, nothing stored) ── */
const XERO_EMP_HEAD=['Title','First Name','Middle Name','Last Name','Date of Birth','Gender','Job Title','Email','Start Date','Address Line 1','Address Line 2','Town / City','County','Postcode','Phone Number','Employee Number','National Insurance Number','National Insurance Category','Taxable pay to date','Total tax to date','Opening NI Category','Gross for NICs','Gross at the LEL','Gross LEL to PT','Gross PT to UEL','NI paid by employee','NI paid by employer','Statutory maternity pay','Statutory paternity pay','Statutory adoption pay','Shared parental pay','Statutory sick pay','Student loan deductions','Pre-tax contributions to date','Post-tax contributions to date','Prior employee number','Postgraduate loan deductions'];
function xeroEmployeeModal(){
  showModal('Xero — employee upload file','Matches Xero\'s Employee Upload Template',`
    <div style="font-size:13px;color:#1a2b3a;line-height:1.55">
      <p style="margin:0 0 10px"><button onclick="closeModal();xeroEmployeeFromVault()" style="padding:9px 14px;border:none;border-radius:8px;background:#7A2E3B;color:#fff;font:700 12.5px Lato;cursor:pointer">🔐 Build from the saved payroll records</button></p>
      <p style="margin:0 0 10px">Or choose an HR staff export (ALL_….csv) and the file is built from that.</p>
      <ul style="margin:0 0 12px 18px;padding:0;font-size:12.5px;color:#374151">
        <li>NI category is set to <b>M</b> for anyone under 21 and <b>A</b> for everyone else — check any apprentices (H) or other categories.</li>
        <li>The year-to-date pay columns are left blank. If staff have already been paid this tax year on another system, fill those in from that system before uploading.</li>
      </ul>
      <label style="display:inline-block;padding:10px 16px;border-radius:9px;background:#13B5EA;color:#fff;font:700 13px Lato;cursor:pointer">📤 Choose HR export<input type="file" accept=".csv,text/csv" style="display:none" onchange="xeroEmployeeBuild(this.files[0])"></label>
      <div id="xe-out" style="margin-top:12px"></div>
    </div>`);
}
async function xeroEmployeeBuild(file){
  const out=document.getElementById('xe-out'); if(!file) return;
  const objs=hsRowsToObjects(await hsReadCSVFile(file));
  if(hsKind(objs)!=='hr'){ if(out) out.innerHTML='<div style="color:#b3261e">That isn\'t the HR staff export (ALL_….csv).</div>'; return; }
  const asAt=new Date(), age=d=>{ const m=String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(!m) return 99; const b=new Date(+m[3],+m[2]-1,+m[1]); let a=asAt.getFullYear()-b.getFullYear(); if(asAt<new Date(asAt.getFullYear(),b.getMonth(),b.getDate())) a--; return a; };
  const warn=[];
  const rows=objs.filter(r=>r.leaver_ind!=='Y' && !r.termination_date).map(r=>{
    const ni=(r.per_national_ins_no||'').toUpperCase().replace(/\s/g,'');
    if(!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/.test(ni)) warn.push(`${r.employee_first_name} ${hsTitle(r.employee_last_name)}: NI number "${ni||'blank'}" doesn't look valid`);
    const cat=age(r.per_birth_date)<21?'M':'A';
    const v={'Title':r.per_title,'First Name':r.employee_first_name,'Middle Name':r.per_second_forename,'Last Name':hsTitle(r.employee_last_name),
      'Date of Birth':r.per_birth_date,'Gender':r.per_sex_desc,'Job Title':HS_HR_ROLE[r.job_title_desc]||r.job_title_desc,'Email':r.email||r.work_email,
      'Start Date':r.commencement_date,'Address Line 1':r.per_address_line_1,'Address Line 2':r.per_address_line_1A,'Town / City':r.per_town,'County':r.per_county,
      'Postcode':r.per_postcode,'Phone Number':r.per_mobile_phone_nbr||r.per_home_phone_nbr,'Employee Number':r.employee_id,
      'National Insurance Number':ni,'National Insurance Category':cat};
    return XERO_EMP_HEAD.map(h=>v[h]==null?'':v[h]);
  });
  spDownload('xero-employee-upload-'+spDK(new Date())+'.csv', [XERO_EMP_HEAD,...rows].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
  if(out) out.innerHTML=`<div style="background:#E8F7FD;border-radius:10px;padding:12px;font-size:13px">✅ <b>${rows.length}</b> employees written to the Xero file. In Xero: Payroll → Employees → Import.
    ${warn.length?`<div style="margin-top:6px;color:#9a3412"><b>Check before uploading:</b><br>${warn.map(spEsc).join('<br>')}</div>`:''}</div>`;
}

/* ── Xero: pay run sheet for the period on screen ──
   Xero UK payroll can't import pay runs from a file, so this lists exactly what to key in
   for each employee (or what to send to the payroll bureau). */
function xeroPaySheet(){
  const P=spPayPeriod(), rows=spPayRows(P.days).filter(r=>r.hrs>0||r.basis==='salary');
  const head=['Employee Number','First Name','Last Name','Department','Pay basis','Earnings rate (Xero)','Hours','Rate','Amount','Holiday days','Sick days','In lieu days','Notes'];
  const data=rows.map(r=>{ const nm=String(r.s.name).split(' ');
    return [r.s.staffCode||'', nm[0], nm.slice(1).join(' '), (SP_DEPTS.find(d=>d.id===r.s.dept)||{}).name||r.s.dept,
      r.basis==='salary'?'Salary':'Hourly', r.basis==='salary'?'Salary':'Ordinary Hours', Math.round(r.hrs*100)/100,
      r.basis==='salary'?'':Math.round(r.rate*100)/100, Math.round(r.gross*100)/100, r.hol, r.sick, r.lieu,
      [r.s.hrStatus==='not-on-hr'?'Not on HR export — check':'', !r.rate&&r.basis!=='salary'?'No hourly rate':''].filter(Boolean).join('; ')]; });
  const tot=rows.reduce((t,r)=>t+r.gross,0);
  data.push(['','','TOTAL','','','',Math.round(rows.reduce((t,r)=>t+r.hrs,0)*100)/100,'',Math.round(tot*100)/100,'','','','']);
  spDownload('xero-pay-run-'+P.file+'.csv', '﻿'+[['Brandon Hall Hotel & Spa — Xero pay run sheet — '+P.label],['Salaried staff: amount is the '+(spPayMode==='week'?'weekly (annual ÷ 52)':'monthly (annual ÷ 12)')+' salary. Hourly staff: paid hours from the approved rota × hourly rate.'],[],head,...data].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
}


/* ============================================================
   HosPEOPLE — PAYROLL & HR RECORDS VAULT
   Full HR details (address, NI number, bank details, right to work,
   emergency contacts, salary) are encrypted in the browser with the
   payroll password (AES-256-GCM, key from PBKDF2-SHA256) and stored in
   Firestore at hr_private/vault. The password is never stored anywhere;
   Firestore rules also limit the document to the HosPEOPLE users.
   Ethnicity, marital status, nationality and gender identity are not kept.
   ============================================================ */
const HR_VAULT={ data:null, pass:null, timer:null, source:'' };
const HR_LOCK_MINS=20;
const hrB64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const hrUnb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hrKey(pass,salt){
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function hrEncrypt(obj,pass){
  const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await hrKey(pass,salt),new TextEncoder().encode(JSON.stringify(obj)));
  return {v:1,salt:hrB64(salt),iv:hrB64(iv),ct:hrB64(ct),updated:new Date().toISOString(),by:(SESSION&&SESSION.name)||''};
}
async function hrDecrypt(blob,pass){
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:hrUnb64(blob.iv)},await hrKey(pass,hrUnb64(blob.salt)),hrUnb64(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
function hrLive(){ return typeof FB!=='undefined' && FB.ready && FB.user && FB.db; }
async function hrLoadBlob(){
  if(hrLive()){
    try{ const d=await FB.db.collection('hr_private').doc('vault').get(); HR_VAULT.source='live'; return d.exists?d.data():null; }
    catch(e){ console.warn('HR vault read failed',e); throw new Error(e.code==='permission-denied'?'Your login is not allowed to read payroll records (check the Firestore rule for hr_private).':'Could not reach the live database.'); }
  }
  HR_VAULT.source='local';
  try{ const s=localStorage.getItem('hr_vault_local'); return s?JSON.parse(s):null; }catch(e){ return null; }
}
async function hrSaveBlob(blob){
  if(hrLive()){ await FB.db.collection('hr_private').doc('vault').set(blob); HR_VAULT.source='live'; return 'live'; }
  localStorage.setItem('hr_vault_local', JSON.stringify(blob)); HR_VAULT.source='local'; return 'local';
}
function hrUnlocked(){ return !!HR_VAULT.data; }
function hrTouch(){ clearTimeout(HR_VAULT.timer); HR_VAULT.timer=setTimeout(hrLock, HR_LOCK_MINS*60000); }
function hrLock(silent){ HR_VAULT.data=null; HR_VAULT.pass=null; clearTimeout(HR_VAULT.timer); if(!silent) toast('🔒 Payroll records locked'); }
function hrRecord(code){ return HR_VAULT.data && HR_VAULT.data.staff ? HR_VAULT.data.staff[String(code)] : null; }

/* Ask for the payroll password; then run after() */
function hrUnlockModal(after, reason){
  if(hrUnlocked()){ hrTouch(); after&&after(); return; }
  window._hrAfter=after||null;
  showModal('🔐 Payroll records','Enter the payroll password',`
    <div style="font-size:13px;color:#1a2b3a;line-height:1.55">
      <p style="margin:0 0 10px">${reason||'Bank details, NI numbers and personal details are locked behind a second password.'}</p>
      <input id="hr-pass" type="password" autocomplete="off" placeholder="Payroll password" onkeydown="if(event.key==='Enter')hrUnlock()" style="width:100%;padding:10px;border:1.5px solid #d1d5db;border-radius:9px;font:14px Lato">
      <button onclick="hrUnlock()" style="margin-top:10px;width:100%;padding:11px;border:none;border-radius:9px;background:#2B726A;color:#fff;font:700 14px Lato;cursor:pointer">Unlock</button>
      <div id="hr-unlock-msg" style="margin-top:10px;font-size:12.5px"></div>
      <div style="font-size:11.5px;color:#4b5563;margin-top:8px">Locks again after ${HR_LOCK_MINS} minutes, when you sign out, or when you press Lock.</div>
    </div>`);
  setTimeout(()=>{ const i=document.getElementById('hr-pass'); if(i) i.focus(); },50);
}
async function hrUnlock(){
  const pass=(document.getElementById('hr-pass')||{}).value||''; const msg=document.getElementById('hr-unlock-msg');
  if(!pass){ if(msg) msg.innerHTML='<span style="color:#b3261e">Enter the password.</span>'; return; }
  if(msg) msg.textContent='Checking…';
  let blob=null;
  try{ blob=await hrLoadBlob(); }catch(e){ if(msg) msg.innerHTML=`<span style="color:#b3261e">${spEsc(e.message)}</span>`; return; }
  if(!blob){ if(msg) msg.innerHTML=`<span style="color:#9a3412">No payroll records saved yet. Use <b>📤 Import HR export</b> in Staff Profiles to add them — you'll set them up with this password.</span>`; return; }
  try{ HR_VAULT.data=await hrDecrypt(blob,pass); HR_VAULT.pass=pass; hrTouch(); }
  catch(e){ if(msg) msg.innerHTML='<span style="color:#b3261e">Wrong password.</span>'; return; }
  closeModal(); toast('🔓 Payroll records unlocked');
  const f=window._hrAfter; window._hrAfter=null; if(f) f(); else if(/staffProfiles|rotaPayroll/.test(CURRENT_TAB)) render();
}

/* Build vault records from the HR export (only the fields payroll/HR need) */
function hrRecordsFromExport(objs){
  const out={};
  objs.forEach(r=>{
    if(!r.employee_id) return;
    out[r.employee_id]={
      employeeNo:r.employee_id, title:r.per_title, first:r.employee_first_name, middle:r.per_second_forename, last:hsTitle(r.employee_last_name),
      knownAs:r.per_known_as_name, sex:r.per_sex_desc, dob:r.per_birth_date,
      jobTitle:HS_HR_ROLE[r.job_title_desc]||r.job_title_desc, department:r.department_desc, category:r.job_category_desc,
      contract:r.contract_type_desc, hoursPerWeek:r.contract_hours_per_week, daysPerWeek:r.contract_days_per_week,
      hourlyRate:r.r1_hourly_rate, rateFrom:r.r1_hourly_rate_effective_date, salary:r.salary, payMethod:r.payroll_method_desc,
      startDate:r.commencement_date, noticeWeeks:r.notice_period_weeks, holidayEntitlementHrs:r.holiday_entitlement,
      overtime:r.overtime_type_desc, nightWorker:r.night_worker_ind, leaver:r.leaver_ind==='Y'||!!r.termination_date, termination:r.termination_date,
      address1:r.per_address_line_1, address2:r.per_address_line_1A, town:r.per_town, county:r.per_county, postcode:r.per_postcode,
      mobile:r.per_mobile_phone_nbr, homePhone:r.per_home_phone_nbr, email:r.email||r.work_email,
      niNumber:(r.per_national_ins_no||'').toUpperCase().replace(/\s/g,''),
      rtwType:r.work_permit_desc, rtwRef:r.work_permit_no, rtwExpiry:r.work_permit_expiry_date,
      ecName:[r.ec_forename,r.ec_surname].filter(Boolean).join(' ').trim(), ecRelationship:r.ec_relationship_desc, ecPhone:r.ec_mobile_nbr||r.ec_phone_nbr,
      sortCode:r.sort_code, accountNo:r.bank_acct_no, accountName:r.account_name, bankName:r.bank_name, payBy:r.pay_method,
      asAt:r.as_at_date
    };
  });
  return out;
}
/* Save HR export into the vault (asks for the password if locked; first save sets it) */
async function hrStoreExport(objs, passFromForm){
  const pass=HR_VAULT.pass||passFromForm;
  if(!pass) throw new Error('Enter the payroll password to save personal and bank details.');
  let existing=HR_VAULT.data;
  if(!existing){
    const blob=await hrLoadBlob();
    if(blob){ try{ existing=await hrDecrypt(blob,pass); }catch(e){ throw new Error('Wrong payroll password.'); } }
  }
  const staff=Object.assign({}, existing&&existing.staff||{}, hrRecordsFromExport(objs));
  const data={staff, imported:new Date().toISOString(), by:(SESSION&&SESSION.name)||''};
  const where=await hrSaveBlob(await hrEncrypt(data,pass));
  HR_VAULT.data=data; HR_VAULT.pass=pass; hrTouch();
  return {count:Object.keys(staff).length, where};
}
async function hrChangePassword(){
  const a=document.getElementById('hr-new1').value, b=document.getElementById('hr-new2').value, m=document.getElementById('hr-pw-msg');
  if(a.length<8){ m.innerHTML='<span style="color:#b3261e">Use at least 8 characters.</span>'; return; }
  if(a!==b){ m.innerHTML='<span style="color:#b3261e">The two passwords don\'t match.</span>'; return; }
  try{ await hrSaveBlob(await hrEncrypt(HR_VAULT.data,a)); HR_VAULT.pass=a; m.innerHTML='<span style="color:#166534">✓ Password changed. Give the new one to the people who need it.</span>'; }
  catch(e){ m.innerHTML='<span style="color:#b3261e">Could not save: '+spEsc(e.message||e)+'</span>'; }
}

/* Full records table */
function hrRecordsView(){
  if(!hrUnlocked()){ hrUnlockModal(hrRecordsView); return; }
  hrTouch();
  const S=HR_VAULT.data.staff||{}, list=Object.values(S).filter(r=>!r.leaver).sort((a,b)=>(a.department||'').localeCompare(b.department||'')||(a.last||'').localeCompare(b.last||''));
  const soon=new Date(); soon.setDate(soon.getDate()+90);
  const ukDate=s=>{ const m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m?new Date(+m[3],+m[2]-1,+m[1]):null; };
  // Only time-limited permissions (visas) expire; for 'Applied & Waiting' the HR date is the check date, not an expiry
  const limited=r=>r.rtwType && !/applied|passport|settled|unknown/i.test(r.rtwType);
  const rtwAlerts=list.filter(r=>{ const d=ukDate(r.rtwExpiry); return limited(r) && d && d<=soon; });
  const waiting=list.filter(r=>/applied/i.test(r.rtwType||''));
  const students=list.filter(r=>/student/i.test(r.rtwType||''));
  const th='padding:7px 8px;font-size:10.5px;text-transform:uppercase;text-align:left;background:#f5f7f9;position:sticky;top:0;white-space:nowrap';
  const td='padding:6px 8px;font-size:12px;border-top:1px solid #eef1f4;white-space:nowrap';
  const cols=[['Emp no','employeeNo'],['Name',r=>`${r.first} ${r.last}`],['Department','department'],['Job title','jobTitle'],['Contract','contract'],['Hrs/wk','hoursPerWeek'],['Rate','hourlyRate'],['Salary',r=>+r.salary?'£'+(+r.salary).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):''],['Pay','payMethod'],['Start','startDate'],['DOB','dob'],['NI number','niNumber'],['Mobile','mobile'],['Email','email'],['Address',r=>[r.address1,r.address2,r.town,r.postcode].filter(Boolean).join(', ')],['Sort code','sortCode'],['Account no','accountNo'],['Account name','accountName'],['Bank','bankName'],['Right to work','rtwType'],['RTW expiry','rtwExpiry'],['Emergency contact',r=>[r.ecName,r.ecRelationship,r.ecPhone].filter(Boolean).join(' · ')]];
  const val=(r,c)=>typeof c[1]==='function'?c[1](r):(r[c[1]]||'');
  window._hrCols=cols; window._hrList=list;
  showModal('🔐 Payroll & HR records',`${list.length} current staff · ${HR_VAULT.source==='live'?'stored encrypted in Firebase':'stored encrypted on this computer only'} · imported ${HR_VAULT.data.imported?new Date(HR_VAULT.data.imported).toLocaleDateString('en-GB'):''}`,`
    <div style="font-size:13px;color:#1a2b3a">
      ${rtwAlerts.length?`<div style="background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;border-radius:9px;padding:9px 12px;margin-bottom:10px"><b>Right-to-work expiring within 90 days:</b> ${rtwAlerts.map(r=>`${spEsc(r.first)} ${spEsc(r.last)} (${spEsc(r.rtwExpiry)})`).join(', ')}</div>`:''}
      ${waiting.length?`<div style="background:#f5f7f9;border:1px solid #e6e8ec;border-radius:9px;padding:9px 12px;margin-bottom:10px"><b>Right-to-work status "Applied &amp; Waiting" in the HR system:</b> ${waiting.length} staff — worth confirming the checks were completed.</div>`:''}
      ${students.length?`<div style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:9px;padding:9px 12px;margin-bottom:10px"><b>Student visas (20 hours a week in term time):</b> ${students.map(r=>`${spEsc(r.first)} ${spEsc(r.last)}`).join(', ')} — the payroll grid flags them if rostered over 20 hours.</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <button onclick="hrExportCSV()" style="padding:8px 14px;border:none;border-radius:8px;background:#2B726A;color:#fff;font:700 12px Lato;cursor:pointer">⬇ Download records (CSV)</button>
        <button onclick="xeroEmployeeFromVault()" style="padding:8px 14px;border:none;border-radius:8px;background:#13B5EA;color:#fff;font:700 12px Lato;cursor:pointer">⬇ Xero employee file</button>
        <button onclick="document.getElementById('hr-pw-box').style.display='block'" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#1a2b3a;font:700 12px Lato;cursor:pointer">Change password</button>
        <button onclick="hrLock();closeModal()" style="padding:8px 14px;border:1px solid #fca5a5;border-radius:8px;background:#fff;color:#991b1b;font:700 12px Lato;cursor:pointer">🔒 Lock</button>
      </div>
      <div id="hr-pw-box" style="display:none;background:#f5f7f9;border-radius:9px;padding:10px;margin-bottom:10px">
        <input id="hr-new1" type="password" placeholder="New payroll password (8+ characters)" style="padding:8px;border:1px solid #d1d5db;border-radius:7px;width:240px">
        <input id="hr-new2" type="password" placeholder="Repeat it" style="padding:8px;border:1px solid #d1d5db;border-radius:7px;width:180px">
        <button onclick="hrChangePassword()" style="padding:8px 12px;border:none;border-radius:7px;background:#1a2b3a;color:#fff;font:700 12px Lato;cursor:pointer">Save</button>
        <span id="hr-pw-msg" style="font-size:12px;margin-left:6px"></span>
      </div>
      <div style="overflow:auto;max-height:60vh;border:1px solid #e6e8ec;border-radius:10px">
        <table style="border-collapse:collapse;min-width:2600px;color:#1a2b3a"><thead><tr>${cols.map(c=>`<th style="${th}">${c[0]}</th>`).join('')}</tr></thead>
        <tbody>${list.map(r=>`<tr>${cols.map(c=>`<td style="${td}">${spEsc(val(r,c))}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>
      <div style="font-size:11.5px;color:#4b5563;margin-top:8px">Downloads contain bank and NI details — keep them off shared drives and delete them when you've finished.</div>
    </div>`);
  const box=document.querySelector('#modal-root .modal'); if(box) box.style.maxWidth='min(1400px,96vw)';
}
function hrExportCSV(){
  const cols=window._hrCols, list=window._hrList; if(!cols) return;
  const val=(r,c)=>typeof c[1]==='function'?c[1](r):(r[c[1]]||'');
  const keep=new Set(['Sort code','Account no','Emp no','Mobile']);  // kept as text so Excel doesn't drop leading zeros
  spDownload('brandon-hall-hr-records-'+spDK(new Date())+'.csv','\ufeff'+[cols.map(c=>c[0]),...list.map(r=>cols.map(c=>{ const x=val(r,c); return keep.has(c[0])&&x?'="'+x+'"':x; }))].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
}
function xeroEmployeeFromVault(){
  if(!hrUnlocked()){ hrUnlockModal(xeroEmployeeFromVault); return; }
  const list=Object.values(HR_VAULT.data.staff||{}).filter(r=>!r.leaver);
  const asAt=new Date(), age=d=>{ const m=String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(!m) return 99; const b=new Date(+m[3],+m[2]-1,+m[1]); let a=asAt.getFullYear()-b.getFullYear(); if(asAt<new Date(asAt.getFullYear(),b.getMonth(),b.getDate())) a--; return a; };
  const rows=list.map(r=>{ const v={'Title':r.title,'First Name':r.first,'Middle Name':r.middle,'Last Name':r.last,'Date of Birth':r.dob,'Gender':r.sex,'Job Title':r.jobTitle,'Email':r.email,
    'Start Date':r.startDate,'Address Line 1':r.address1,'Address Line 2':r.address2,'Town / City':r.town,'County':r.county,'Postcode':r.postcode,'Phone Number':r.mobile||r.homePhone,
    'Employee Number':r.employeeNo,'National Insurance Number':r.niNumber,'National Insurance Category':age(r.dob)<21?'M':'A'};
    return XERO_EMP_HEAD.map(h=>v[h]==null?'':v[h]); });
  spDownload('xero-employee-upload-'+spDK(new Date())+'.csv',[XERO_EMP_HEAD,...rows].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
  const bad=list.filter(r=>!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/.test(r.niNumber||''));
  toast(`✓ Xero file for ${rows.length} employees${bad.length?` — check NI for ${bad.map(r=>r.first).join(', ')}`:''}`, 5000);
}
/* Profile tab: HR & bank details for one person */
function hrProfileSection(p){
  if(!hrUnlocked()) return `<div style="text-align:center;padding:26px 10px">
      <div style="font-size:28px">🔐</div><div style="font-size:13px;color:#374151;margin:6px 0 12px">Personal, NI and bank details are locked.</div>
      <button onclick="hrUnlockModal(()=>hsOpenProfile('${p.id}'))" style="padding:9px 16px;border:none;border-radius:9px;background:#2B726A;color:#fff;font:700 13px Lato;cursor:pointer">Unlock with payroll password</button></div>`;
  hrTouch();
  const r=hrRecord(p.staffCode);
  if(!r) return `<div style="padding:16px;font-size:13px;color:#374151">No HR record for staff ID ${spEsc(p.staffCode)}. ${p.hrStatus==='not-on-hr'?'This person is not on the HR export.':''}</div>`;
  const row=(k,v)=>`<div style="padding:7px 0;border-bottom:1px solid #eef1f4;display:flex;gap:10px;font-size:12.5px"><div style="width:150px;color:#4b5563;flex-shrink:0">${k}</div><div style="color:#1a2b3a;font-weight:600">${spEsc(v||'—')}</div></div>`;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 24px">
    <div>${row('Full name',[r.title,r.first,r.middle,r.last].filter(Boolean).join(' '))}${row('Date of birth',r.dob)}${row('NI number',r.niNumber)}${row('Mobile',r.mobile)}${row('Email',r.email)}${row('Address',[r.address1,r.address2,r.town,r.county,r.postcode].filter(Boolean).join(', '))}${row('Emergency contact',[r.ecName,r.ecRelationship,r.ecPhone].filter(Boolean).join(' · '))}</div>
    <div>${row('Contract',r.contract+(+r.hoursPerWeek?` · ${r.hoursPerWeek}h/wk`:''))}${row('Pay',r.payMethod+(+r.salary?` · £${(+r.salary).toLocaleString('en-GB')} a year`:'')+(r.hourlyRate?` · £${r.hourlyRate}/h`:''))}${row('Start date',r.startDate)}${row('Notice',r.noticeWeeks&&r.noticeWeeks!=='0'?r.noticeWeeks+' weeks':'')}${row('Bank',[r.bankName,r.accountName].filter(Boolean).join(' · '))}${row('Sort code / account',[r.sortCode,r.accountNo].filter(Boolean).join(' · '))}${row('Right to work',[r.rtwType,r.rtwExpiry?(/applied/i.test(r.rtwType||'')?'checked ':'expires ')+r.rtwExpiry:''].filter(Boolean).join(' · '))}</div>
  </div>
  <div style="display:flex;gap:8px;margin-top:12px"><button onclick="hrLock();closeModal()" style="padding:7px 12px;border:1px solid #fca5a5;border-radius:8px;background:#fff;color:#991b1b;font:700 12px Lato;cursor:pointer">🔒 Lock</button></div>`;
}

function spGetStaff(){
  hsApplySeedUpdate();
  const stored = localStorage.getItem('sp_staff');
  if(stored) return JSON.parse(stored);
  // First load - seed from real data
  localStorage.setItem('sp_staff', JSON.stringify(HS_REAL_STAFF));
  return HS_REAL_STAFF.slice();
}
function spSaveStaff(d){ localStorage.setItem('sp_staff', JSON.stringify(d)); }
function hsGetProfilesSeeded(){
  hsApplySeedUpdate();
  const stored = localStorage.getItem('hs_profiles');
  if(stored) return JSON.parse(stored);
  // Build from real staff data
  const profiles = HS_REAL_STAFF.map(s=>({
    ...s,
    leaveUsed:0, leavePending:0,
    docs:[], probationDate:'',
    dob:s.dob||'', address:s.address||'',
    phone:s.phone||'', email:s.email||'',
    niNumber:s.niNumber||'',
    emergencyName:s.emergencyName||'',
    emergencyPhone:s.emergencyPhone||'',
    emergencyRel:s.emergencyRel||'',
  }));
  localStorage.setItem('hs_profiles', JSON.stringify(profiles));
  // Seed initial leave data if none exists
  if(!localStorage.getItem('hs_leave') || JSON.parse(localStorage.getItem('hs_leave')||'[]').length===0){
    localStorage.setItem('hs_leave', JSON.stringify([{"staffId":"veronica_w_2","from":"2026-10-14","to":"2026-10-18","days":5,"reason":"Annual leave","status":"approved","id":"lv_seed_1","submittedAt":"2026-10-01"},{"staffId":"patrik_v_4","from":"2026-10-07","to":"2026-10-07","days":1,"reason":"Annual leave","status":"approved","id":"lv_seed_2","submittedAt":"2026-10-01"},{"staffId":"ruth_a_29","from":"2026-10-21","to":"2026-10-25","days":5,"reason":"Annual leave","status":"pending","id":"lv_seed_3","submittedAt":"2026-10-01"},{"staffId":"devendra_s_13","from":"2026-11-03","to":"2026-11-07","days":5,"reason":"Annual leave","status":"pending","id":"lv_seed_4","submittedAt":"2026-10-01"},{"staffId":"jomy_m_17","from":"2026-10-28","to":"2026-10-29","days":2,"reason":"Annual leave","status":"approved","id":"lv_seed_5","submittedAt":"2026-10-01"},{"staffId":"alice_a_6","from":"2026-09-29","to":"2026-10-03","days":5,"reason":"Annual leave","status":"approved","id":"lv_seed_6","submittedAt":"2026-10-01"},{"staffId":"manjusha_u_5","from":"2026-10-10","to":"2026-10-10","days":1,"reason":"In lieu","status":"approved","id":"lv_seed_7","submittedAt":"2026-10-01"},{"staffId":"catarina_l_19","from":"2026-10-14","to":"2026-10-16","days":3,"reason":"Annual leave","status":"pending","id":"lv_seed_8","submittedAt":"2026-10-01"},{"staffId":"rahul_r_32","from":"2026-11-10","to":"2026-11-14","days":5,"reason":"Annual leave","status":"pending","id":"lv_seed_9","submittedAt":"2026-10-01"},{"staffId":"tushar_a_35","from":"2026-10-05","to":"2026-10-06","days":2,"reason":"Annual leave","status":"approved","id":"lv_seed_10","submittedAt":"2026-10-01"}]));
  }
  return profiles;
}


/* ============================================================ HosSHIFT — Rota & Forecast */

// ── Seed data ─────────────────────────────────────────────────────────────────
const SP_ROTA_SEED = {"2026-09-28":{"veronica_w_2":"08:00-16:00","natalie_f_3":"09:00-17:30","patrik_v_4":"15:00-23:00","manjusha_u_5":"off","alice_a_6":"holiday","aghil_j_7":"07:00-15:00","alan_w_8":"23:00-07:00","amal_p_9":"off","devendra_s_13":"off","sajeed_14":"05:30-14:00","david_m_15":"holiday","nathan_f_16":"17:00-22:00","jomy_m_17":"off","rowan_w_18":"18:00-23:00","catarina_l_19":"off","manjinder_s_20":"06:00-12:00","sheba_t_22":"off","ruth_a_29":"off","rahul_r_32":"06:30-14:30","tushar_a_35":"09:00-17:00","hassen_37":"09:00-16:30","dushyanth_38":"09:00-16:30"},"2026-09-29":{"veronica_w_2":"off","natalie_f_3":"09:00-17:30","patrik_v_4":"07:00-15:00","manjusha_u_5":"15:00-23:00","alice_a_6":"holiday","alan_w_8":"23:00-07:00","devendra_s_13":"05:30-14:00","sajeed_14":"17:00-22:00","nathan_f_16":"07:00-12:00","jomy_m_17":"15:00-23:00","rowan_w_18":"12:00-20:00","catarina_l_19":"15:00-23:00","manjinder_s_20":"06:00-12:00","ruth_a_29":"09:00-17:00","rahul_r_32":"off","lara_j_31":"09:00-15:30","tushar_a_35":"09:00-17:00","hassen_37":"09:00-16:30","dushyanth_38":"09:00-16:30"},"2026-09-30":{"natalie_f_3":"09:00-17:30","patrik_v_4":"07:00-15:00","manjusha_u_5":"15:00-23:00","alice_a_6":"holiday","aghil_j_7":"off","alan_w_8":"23:00-07:00","devendra_s_13":"05:30-14:00","sajeed_14":"17:00-22:00","nathan_f_16":"17:00-22:00","jomy_m_17":"15:00-23:00","rowan_w_18":"12:00-20:00","catarina_l_19":"15:00-23:00","manjinder_s_20":"06:00-12:00","sheba_t_22":"on call","ruth_a_29":"09:00-17:00","rahul_r_32":"06:30-14:30","manoj_34":"09:00-16:30","tushar_a_35":"09:00-17:00","hassen_37":"09:00-16:30","dushyanth_38":"09:00-16:30"},"2026-10-01":{"veronica_w_2":"08:00-16:00","natalie_f_3":"09:00-17:30","aghil_j_7":"15:00-23:00","alan_w_8":"23:00-07:00","devendra_s_13":"05:30-14:00","nathan_f_16":"07:00-12:00","jomy_m_17":"15:00-23:00","catarina_l_19":"15:00-23:00","manjinder_s_20":"06:00-12:00","sheba_t_22":"06:00-12:00","ruth_a_29":"09:00-17:00","tushar_a_35":"09:00-17:00","allen_36":"09:00-15:30","hassen_37":"off","dushyanth_38":"09:00-16:30"},"2026-10-02":{"veronica_w_2":"07:30-15:30","natalie_f_3":"in lieu","patrik_v_4":"07:00-10:00","manjusha_u_5":"15:00-23:00","aghil_j_7":"07:00-15:00","amal_p_9":"23:00-07:00","devendra_s_13":"05:30-14:00","sajeed_14":"17:00-22:00","jomy_m_17":"12:00-20:00","rowan_w_18":"15:00-23:00","catarina_l_19":"15:00-23:00","manjinder_s_20":"06:00-12:00","sheba_t_22":"06:00-12:00","ruth_a_29":"09:00-17:00","aryan_30":"09:00-14:30","rahul_r_32":"06:30-14:30","jitendra_33":"09:00-16:30","tushar_a_35":"off","hassen_37":"09:00-16:30"},"2026-10-03":{"patrik_v_4":"08:00-14:00","manjusha_u_5":"07:00-15:00","alice_a_6":"off","aghil_j_7":"15:00-23:00","amal_p_9":"23:00-07:00","devendra_s_13":"off","sajeed_14":"off","nathan_f_16":"17:00-20:00","jomy_m_17":"12:00-20:00","rowan_w_18":"15:00-23:00","catarina_l_19":"15:00-23:00","sheba_t_22":"06:00-12:00","dhruv_c_23":"07:30-13:00","ruth_a_29":"off","aryan_30":"09:00-16:30","lara_j_31":"off","rahul_r_32":"06:30-14:30","tushar_a_35":"09:00-17:00","allen_36":"on call","hassen_37":"off","dushyanth_38":"off"},"2026-10-04":{"patrik_v_4":"08:00-21:00","alice_a_6":"15:00-23:00","aghil_j_7":"07:00-15:00","alan_w_8":"23:00-07:00","devendra_s_13":"13:30-22:00","nathan_f_16":"08:00-15:00","rowan_w_18":"off","catarina_l_19":"off","sheba_t_22":"06:00-12:00","dhruv_c_23":"07:30-13:00","ruth_a_29":"09:00-17:00","aryan_30":"on call","lara_j_31":"10:00-16:30","rahul_r_32":"06:30-14:30","manoj_34":"09:00-16:30","tushar_a_35":"off","allen_36":"09:00-16:30","hassen_37":"09:00-16:30"}};

const SP_FC_SEED = {"2026-09-28":{"rooms":62,"departures":35,"stayovers":28,"breakfastCovers":94,"dinnerCovers":0},"2026-09-29":{"rooms":52,"departures":9,"stayovers":43,"breakfastCovers":58,"dinnerCovers":0},"2026-09-30":{"rooms":65,"departures":15,"stayovers":50,"breakfastCovers":65,"dinnerCovers":40},"2026-10-01":{"rooms":44,"departures":44,"stayovers":33,"breakfastCovers":69,"dinnerCovers":0},"2026-10-02":{"rooms":24,"departures":42,"stayovers":3,"breakfastCovers":54,"dinnerCovers":0},"2026-10-03":{"rooms":43,"departures":8,"stayovers":16,"breakfastCovers":37,"dinnerCovers":13},"2026-10-04":{"rooms":20,"departures":46,"stayovers":5,"breakfastCovers":70,"dinnerCovers":0}};

const SP_DEPTS = [
  {id:'admin',       name:'Admin / Events',  colour:'#be185d',minTotal:1, shifts:['07:30-15:30', '08:00-16:00', '09:00-17:30'],    note:'Office hours'},
  {id:'reception',   name:'Reception',        colour:'#4a86c7',minTotal:3, shifts:['07:00-15:00', '10:00-18:00', '15:00-23:00'], note:'Min 1 per shift'},
  {id:'nights',      name:'Nights',           colour:'#1a2b3a',minTotal:1, shifts:['23:00-07:00'],                  note:'Night manager covers reception'},
  {id:'maintenance', name:'Maintenance',      colour:'#b8860b',minTotal:0, shifts:['08:00-16:00'],                  note:'As required'},
  {id:'kitchen',     name:'Kitchen',          colour:'#c45c00',minTotal:2, shifts:['05:30-14:00', '06:00-14:00', '06:30-14:00', '07:00-14:00', '07:30-14:00', '09:00-22:00', '13:00-22:00', '17:00-23:00'],    note:'Min 1 chef + 1 KP'},
  {id:'bar',         name:'Bar',              colour:'#8b5c8f',minTotal:2, shifts:['12:00-20:00', '15:00-23:00'],                  note:'Min 2 from 15:00'},
  {id:'restaurant',  name:'Restaurant F&B',   colour:'#4a9d7f',minTotal:2, shifts:['06:00-12:00', '06:00-12:30', '06:00-13:00', '06:30-12:30', '07:00-13:00', '08:00-13:00', '12:00-18:00', '12:00-23:00', '15:00-23:00', '17:00-22:00', '17:30-22:00', '18:00-22:00', '18:00-23:00'],    note:'Breakfast 1:28 · Dinner 1:7'},
  {id:'housekeeping',name:'Housekeeping',     colour:'#2a6a4a',minTotal:1, shifts:['06:30-14:30', '09:00-15:00', '09:00-15:30', '09:00-16:30', '09:00-17:00'],    note:'1 per 12 rooms'},
];

// ── Storage ───────────────────────────────────────────────────────────────────
// The imported rota keys staff as "veronica_w_2" while the staff list uses "veronica_webb_2",
// so no shift ever matched a person. Map rota keys onto real staff ids (once) on read.
function spRotaKeyToStaffId(k, staff){
  if(staff.some(x=>x.id===k)) return k;
  const p=String(k).split('_'), first=p[0], ini=p.length===3?p[1]:'', num=p[p.length-1];
  let c=staff.filter(x=>{ const q=x.id.split('_'); return (q[0]===first||q[0].startsWith(first)) && (!ini || (q.length>2 && q[1].startsWith(ini))); });
  if(c.length>1){ const byNum=c.filter(x=>x.id.split('_').pop()===num); if(byNum.length) c=byNum; }
  return c.length===1 ? c[0].id : k;
}
function spNormaliseRota(rota){
  const staff=spGetStaff(); let changed=false; const out={};
  Object.entries(rota||{}).forEach(([dk,day])=>{
    out[dk]={};
    Object.entries(day||{}).forEach(([k,v])=>{ const id=spRotaKeyToStaffId(k,staff); if(id!==k) changed=true; if(!(id in out[dk])||k===id) out[dk][id]=v; });
  });
  return {rota:out,changed};
}
/* Rota for w/c 12 Oct 2026, from Staff_Rota_12_October_2026.xlsx — applied once on each computer, replacing those 7 days */
const SP_ROTA_IMPORTS=[{key:'2026-10-12', rota:{"2026-10-12":{"veronica_webb_2":"07:30-15:30","nicola_3":"off","natalie_freeman_4":"09:00-17:30","patrik_vlach_5":"off","manjusha_ushadevi_6":"off","alice_asumeng_7":"15:00-23:00","aghil_joy_8":"07:00-15:00","alan_wilkins_9":"23:00-07:00","amal_premkumar_10":"off","devendra_subedi_14":"05:30-14:00","david_head_chef_47":"off","matt_48":"13:00-22:00","ashleigh_49":"13:00-22:00","noah_50":"07:30-14:00","david_marshall_16":"07:30-14:00","nathan_field_17":"17:00-23:00","jomy_mathai_joy_18":"off","rowan_wilkins_19":"15:00-23:00","darren_28":"18:00-23:00","manjinder_shergill_21":"06:00-12:00","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"off","reuven_25":"06:00-12:00","jayan_26":"off","arthur_27":"off","jaimie_leigh_watts_41":"off","caitlin_playdon_40":"17:00-22:00","lily_mae_mcdonald_43":"off","betel_elias_44":"off","nevin_29":"15:00-23:00","olivia_hale_45":"off","ruth_addison_30":"off","aryan_31":"09:00-15:00","lara_jervis_32":"off","rahul_reghunath_33":"06:30-14:30","jitendra_34":"off","manoj_35":"off","tushar_ambekar_36":"09:00-17:00","allen_37":"off","hassen_38":"09:00-17:00","satya_51":"09:00-15:30","ayomidipupo_yoemi_46":"off","yaya_52":"off","edwin_53":"off","dushyanth_39":"09:00-16:30","anisha_54":"09:00-16:30"},"2026-10-13":{"veronica_webb_2":"07:30-15:30","nicola_3":"off","natalie_freeman_4":"09:00-17:30","patrik_vlach_5":"10:00-18:00","manjusha_ushadevi_6":"15:00-23:00","alice_asumeng_7":"07:00-15:00","aghil_joy_8":"off","alan_wilkins_9":"23:00-07:00","amal_premkumar_10":{"shift":"12:00-20:00","dept":"bar"},"devendra_subedi_14":"off","david_head_chef_47":"09:00-22:00","matt_48":"13:00-22:00","ashleigh_49":"05:30-14:00","noah_50":"off","david_marshall_16":"07:30-14:00","nathan_field_17":"17:00-23:00","jomy_mathai_joy_18":"15:00-23:00","rowan_wilkins_19":"off","darren_28":"17:00-22:00","manjinder_shergill_21":"off","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"off","reuven_25":"06:00-13:00","jayan_26":"06:00-13:00","arthur_27":{"shift":"12:00-18:00","dept":"restaurant"},"jaimie_leigh_watts_41":"off","caitlin_playdon_40":"off","lily_mae_mcdonald_43":"12:00-18:00","betel_elias_44":"off","nevin_29":"off","olivia_hale_45":"17:00-22:00","ruth_addison_30":"in lieu","aryan_31":"09:00-15:00","lara_jervis_32":"off","rahul_reghunath_33":"06:30-14:30","jitendra_34":"off","manoj_35":"09:00-16:30","tushar_ambekar_36":"09:00-17:00","allen_37":"off","hassen_38":"09:00-16:30","satya_51":"09:00-15:30","ayomidipupo_yoemi_46":"09:00-15:00","yaya_52":"09:00-16:30","edwin_53":"off","dushyanth_39":"off","anisha_54":"09:00-16:30"},"2026-10-14":{"veronica_webb_2":"07:30-15:30","nicola_3":"off","natalie_freeman_4":"09:00-17:30","patrik_vlach_5":"10:00-18:00","manjusha_ushadevi_6":"15:00-23:00","alice_asumeng_7":"07:00-15:00","aghil_joy_8":"off","alan_wilkins_9":"23:00-07:00","amal_premkumar_10":"off","devendra_subedi_14":"off","david_head_chef_47":"13:00-22:00","matt_48":"13:00-22:00","ashleigh_49":"05:30-14:00","noah_50":"17:00-23:00","david_marshall_16":"07:30-14:00","nathan_field_17":"off","jomy_mathai_joy_18":"15:00-23:00","rowan_wilkins_19":"12:00-20:00","darren_28":"15:00-23:00","manjinder_shergill_21":"off","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"off","reuven_25":"06:00-12:30","jayan_26":"06:00-12:30","arthur_27":"off","jaimie_leigh_watts_41":"off","caitlin_playdon_40":"off","lily_mae_mcdonald_43":"off","betel_elias_44":"off","nevin_29":"12:00-23:00","olivia_hale_45":"off","ruth_addison_30":"in lieu","aryan_31":"off","lara_jervis_32":"off","rahul_reghunath_33":"06:30-14:30","jitendra_34":"09:00-16:30","manoj_35":"off","tushar_ambekar_36":"09:00-17:00","allen_37":"off","hassen_38":"off","satya_51":"off","ayomidipupo_yoemi_46":"off","yaya_52":"09:00-16:30","edwin_53":"off","dushyanth_39":"09:00-16:30","anisha_54":"09:00-16:30"},"2026-10-15":{"veronica_webb_2":"08:00-16:00","nicola_3":"off","natalie_freeman_4":"09:00-17:30","patrik_vlach_5":"10:00-18:00","manjusha_ushadevi_6":"15:00-23:00","alice_asumeng_7":"07:00-15:00","aghil_joy_8":"15:00-23:00","alan_wilkins_9":"23:00-07:00","amal_premkumar_10":"off","devendra_subedi_14":"05:30-14:00","david_head_chef_47":"13:00-22:00","matt_48":"off","ashleigh_49":"13:00-22:00","noah_50":"17:00-23:00","david_marshall_16":"07:30-14:00","nathan_field_17":"off","jomy_mathai_joy_18":"12:00-20:00","rowan_wilkins_19":"15:00-23:00","darren_28":"off","manjinder_shergill_21":"06:00-12:00","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"off","reuven_25":"06:00-12:30","jayan_26":"06:30-12:30","arthur_27":"off","jaimie_leigh_watts_41":"18:00-22:00","caitlin_playdon_40":"off","lily_mae_mcdonald_43":"off","betel_elias_44":"17:00-22:00","nevin_29":"off","olivia_hale_45":"off","ruth_addison_30":"in lieu","aryan_31":"09:00-15:00","lara_jervis_32":"off","rahul_reghunath_33":"off","jitendra_34":"off","manoj_35":"09:00-16:30","tushar_ambekar_36":"09:00-17:00","allen_37":"off","hassen_38":"off","satya_51":"09:00-15:00","ayomidipupo_yoemi_46":"off","yaya_52":"09:00-16:30","edwin_53":"off","dushyanth_39":"09:00-16:30","anisha_54":"09:00-16:30"},"2026-10-16":{"veronica_webb_2":"07:30-15:30","nicola_3":"off","natalie_freeman_4":"09:00-17:30","patrik_vlach_5":"off","manjusha_ushadevi_6":"15:00-23:00","alice_asumeng_7":"off","aghil_joy_8":"07:00-15:00","alan_wilkins_9":"off","amal_premkumar_10":"23:00-07:00","devendra_subedi_14":"06:30-14:00","david_head_chef_47":"13:00-22:00","matt_48":"off","ashleigh_49":"13:00-22:00","noah_50":"off","david_marshall_16":"07:30-14:00","nathan_field_17":"17:00-23:00","jomy_mathai_joy_18":"12:00-20:00","rowan_wilkins_19":"15:00-23:00","darren_28":"18:00-22:00","manjinder_shergill_21":"06:00-12:00","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"off","reuven_25":"06:00-12:30","jayan_26":"off","arthur_27":"off","jaimie_leigh_watts_41":"off","caitlin_playdon_40":"17:30-22:00","lily_mae_mcdonald_43":"off","betel_elias_44":"off","nevin_29":"off","olivia_hale_45":"off","ruth_addison_30":"in lieu","aryan_31":"off","lara_jervis_32":"off","rahul_reghunath_33":"off","jitendra_34":"09:00-16:30","manoj_35":"off","tushar_ambekar_36":"off","allen_37":"off","hassen_38":"09:00-16:30","satya_51":"off","ayomidipupo_yoemi_46":"09:00-15:00","yaya_52":"on call","edwin_53":"off","dushyanth_39":"09:00-16:30","anisha_54":"09:00-16:30"},"2026-10-17":{"veronica_webb_2":"off","nicola_3":"off","natalie_freeman_4":"off","patrik_vlach_5":"10:00-18:00","manjusha_ushadevi_6":"07:00-15:00","alice_asumeng_7":"off","aghil_joy_8":"15:00-23:00","alan_wilkins_9":"off","amal_premkumar_10":"23:00-07:00","devendra_subedi_14":"06:00-14:00","david_head_chef_47":"13:00-22:00","matt_48":"13:00-22:00","ashleigh_49":"off","noah_50":"off","david_marshall_16":"07:30-14:00","nathan_field_17":"17:00-23:00","jomy_mathai_joy_18":"15:00-23:00","rowan_wilkins_19":"12:00-20:00","darren_28":"off","manjinder_shergill_21":"07:00-13:00","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"08:00-13:00","reuven_25":"off","jayan_26":"on call","arthur_27":"off","jaimie_leigh_watts_41":"17:00-22:00","caitlin_playdon_40":"off","lily_mae_mcdonald_43":"off","betel_elias_44":"off","nevin_29":"15:00-23:00","olivia_hale_45":"off","ruth_addison_30":"off","aryan_31":"off","lara_jervis_32":"off","rahul_reghunath_33":"06:30-14:30","jitendra_34":"on call","manoj_35":"09:00-16:30","tushar_ambekar_36":"09:00-17:00","allen_37":"09:00-16:30","hassen_38":"09:00-16:30","satya_51":"off","ayomidipupo_yoemi_46":"on call","yaya_52":"off","edwin_53":"off","dushyanth_39":"off","anisha_54":"off"},"2026-10-18":{"veronica_webb_2":"off","nicola_3":"off","natalie_freeman_4":"off","patrik_vlach_5":"10:00-18:00","manjusha_ushadevi_6":"off","alice_asumeng_7":"15:00-23:00","aghil_joy_8":"07:00-15:00","alan_wilkins_9":"23:00-07:00","amal_premkumar_10":"off","devendra_subedi_14":"06:00-14:00","david_head_chef_47":"off","matt_48":"13:00-22:00","ashleigh_49":"13:00-22:00","noah_50":"07:00-14:00","david_marshall_16":"off","nathan_field_17":"17:00-23:00","jomy_mathai_joy_18":"off","rowan_wilkins_19":"off","darren_28":{"shift":"15:00-23:00","dept":"bar"},"manjinder_shergill_21":"07:00-13:00","anael_nkunga_22":"off","dhruvilsinh_chauhan_24":"08:00-13:00","reuven_25":"off","jayan_26":"on call","arthur_27":"off","jaimie_leigh_watts_41":"off","caitlin_playdon_40":"off","lily_mae_mcdonald_43":"off","betel_elias_44":"off","nevin_29":"15:00-23:00","olivia_hale_45":"off","ruth_addison_30":"09:00-17:00","aryan_31":"on call","lara_jervis_32":"off","rahul_reghunath_33":"06:30-14:30","jitendra_34":"off","manoj_35":"09:00-16:30","tushar_ambekar_36":"off","allen_37":"09:00-16:30","hassen_38":"09:00-16:30","satya_51":"off","ayomidipupo_yoemi_46":"09:00-15:00","yaya_52":"on call","edwin_53":"on call","dushyanth_39":"09:00-16:30","anisha_54":"off"}}, fc:{"2026-10-12":{"rooms":108,"departures":23,"stayovers":14,"arrivals":94,"breakfastCovers":32,"dinnerCovers":4},"2026-10-13":{"rooms":62,"departures":86,"stayovers":22,"arrivals":40,"breakfastCovers":108,"dinnerCovers":11},"2026-10-14":{"rooms":88,"departures":29,"stayovers":33,"arrivals":55,"breakfastCovers":49,"dinnerCovers":10},"2026-10-15":{"rooms":25,"departures":73,"stayovers":15,"arrivals":10,"breakfastCovers":76,"dinnerCovers":0},"2026-10-16":{"rooms":31,"departures":19,"stayovers":6,"arrivals":25,"breakfastCovers":25,"dinnerCovers":4},"2026-10-17":{"rooms":29,"departures":23,"stayovers":8,"arrivals":21,"breakfastCovers":58,"dinnerCovers":8},"2026-10-18":{"rooms":19,"departures":26,"stayovers":3,"arrivals":16,"breakfastCovers":42,"dinnerCovers":0}}}];
function spApplyRotaImports(rota){
  let changed=false;
  SP_ROTA_IMPORTS.forEach(im=>{ const flag='sp_import_'+im.key; try{ if(localStorage.getItem(flag)) return; }catch(e){ return; }
    Object.entries(im.rota).forEach(([dk,day])=>{ rota[dk]=JSON.parse(JSON.stringify(day)); });
    try{ const f=JSON.parse(localStorage.getItem('sp_fc')||'null')||JSON.parse(JSON.stringify(SP_FC_SEED)); Object.entries(im.fc||{}).forEach(([dk,v])=>{ f[dk]=Object.assign({},f[dk]||{},v); }); localStorage.setItem('sp_fc',JSON.stringify(f)); }catch(e){}
    try{ localStorage.setItem(flag,new Date().toISOString()); }catch(e){}
    changed=true; });
  return changed;
}
function spGetRota(){
  const s=localStorage.getItem('sp_rota');
  const raw=s?JSON.parse(s):JSON.parse(JSON.stringify(SP_ROTA_SEED));
  const n=spNormaliseRota(raw);
  const imp=spApplyRotaImports(n.rota);
  if(n.changed||imp){ try{ localStorage.setItem('sp_rota',JSON.stringify(n.rota)); }catch(e){} }
  if(imp) setTimeout(()=>{ if(typeof spQueuePublish==='function') spQueuePublish(); },500);
  return n.rota;
}
function spSaveRota(d)  {localStorage.setItem('sp_rota',   JSON.stringify(d)); if(typeof spQueuePublish==='function') spQueuePublish();}
function spGetFC()      {const s=localStorage.getItem('sp_fc');     return s?JSON.parse(s):JSON.parse(JSON.stringify(SP_FC_SEED));}
function spSaveFC(d)    {localStorage.setItem('sp_fc',     JSON.stringify(d));}
function spGetMonthly() {return JSON.parse(localStorage.getItem('sp_monthly')||'{}');}
function spSaveMonthly(d){localStorage.setItem('sp_monthly',JSON.stringify(d));}

// ── Helpers ───────────────────────────────────────────────────────────────────
let spWeekOffset=0,spFcWeekOffset=0,spMonthOff=0;
function spWeekDates(off){const t=new Date(),m=new Date(t);m.setDate(t.getDate()-((t.getDay()||7)-1)+(off||0)*7);return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d;});}
function spDK(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function spShortFmt(d){return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function spFmt(d){return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function spParseHrs(shift){if(shift&&typeof shift==='object')shift=shift.shift;if(!shift)return 0;shift=String(shift);const s=shift.toLowerCase().trim();if(['off','holiday','sick','','on call','in lieu'].includes(s))return 0;const m=shift.match(/(\d{1,2})[:\.](\d{2})\s*[-]\s*(\d{1,2})[:\.](\d{2})/);if(!m)return 0;let st=+m[1]*60+ +m[2],en=+m[3]*60+ +m[4];if(en<=st)en+=1440;return Math.round((en-st)/60*10)/10;}
function spShiftStyle(shift){if(!shift)return{bg:'#f5f7f9',col:'#374151',border:'#e0e0e0'};const s=shift.toLowerCase().trim();if(s===''||s==='off')return{bg:'#f5f7f9',col:'#374151',border:'#e0e0e0'};if(s==='holiday')return{bg:'#dbeafe',col:'#1d4ed8',border:'#93c5fd'};if(s==='on call')return{bg:'#fef9c3',col:'#854d0e',border:'#fde047'};if(s==='in lieu')return{bg:'#f3e8ff',col:'#7e22ce',border:'#c4b5fd'};if(s==='sick')return{bg:'#fee2e2',col:'#991b1b',border:'#fca5a5'};return{bg:'#dcfce7',col:'#166534',border:'#86efac'};}
function spCalcRequired(fc,deptId){const rooms=fc&&fc.rooms||0,dep=fc&&fc.departures||0,stay=fc&&fc.stayovers||0,bk=fc&&fc.breakfastCovers||Math.round(rooms*1.8),din=fc&&fc.dinnerCovers||0;switch(deptId){case 'reception':return{needed:3,note:'07-15, 15-23, 23-07'};case 'nights':return{needed:1,note:'Night manager 23-07'};case 'kitchen':return{needed:Math.max(2,Math.ceil(bk/28)+(din>0?1:0)),note:bk+' bkfst ÷28'};case 'restaurant':return{needed:Math.max(1,Math.ceil(bk/28))+(din>0?Math.ceil(din/7):0),note:bk+' bkfst, '+din+' dinner'};case 'bar':return{needed:2,note:'Min 2 from 15:00'};case 'housekeeping':{const hrs=(dep*0.542)+(stay*0.333);return{needed:Math.max(1,Math.ceil(hrs/7.5)),note:dep+'dep+'+stay+'stay'};}case 'maintenance':return{needed:1,note:'On call'};case 'admin':return{needed:1,note:'Office hours'};default:return{needed:1,note:''};}}
function spCountRostered(rota,dk,deptId){const staff=spGetStaff().filter(s=>s.dept===deptId),day=rota[dk]||{};return staff.filter(s=>{const v=day[s.id];const sh=String((v&&typeof v==='object')?(v.shift||''):(v||'')).toLowerCase().trim();return sh&&!['off','holiday','sick','in lieu'].includes(sh);}).length;}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
// ── openModal shim ─────────────────────────────────────────────────────────
function openModal(html){ showModal('','',html); }
function toast(msg,dur=2500){
  let t=document.getElementById('hsp-toast');
  if(!t){t=document.createElement('div');t.id='hsp-toast';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a2b3a;color:#fff;padding:10px 20px;border-radius:20px;font:600 13px Lato,sans-serif;z-index:9999;pointer-events:none';
    document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';clearTimeout(t._t);t._t=setTimeout(()=>t.style.opacity='0',dur);
}
function filterInvCat(cat,btn){
  const bar=btn?.parentElement;
  if(bar) bar.querySelectorAll('button').forEach(b=>{b.style.background='#fff';b.style.color='var(--ink,#1a2b3a)';});
  if(btn){btn.style.background='var(--navy,#1a2b3a)';btn.style.color='#fff';}
  const grid=document.getElementById('inv-grid');
  if(grid) grid.querySelectorAll('[data-cat]').forEach(c=>{c.style.display=(cat==='All'||c.dataset.cat===cat)?'':'none';});
}
function filterPortalJobs(filter,btn){
  const bar=document.getElementById('portal-job-filters');
  if(bar) bar.querySelectorAll('button').forEach(b=>{b.style.background='#fff';b.style.color='var(--ink,#1a2b3a)';});
  if(btn){btn.style.background='var(--navy,#1a2b3a)';btn.style.color='#fff';}
  const tbl=document.getElementById('portal-jobs-table');
  if(!tbl) return;
  tbl.querySelectorAll('tbody tr[data-status]').forEach(row=>{
    const s=(row.dataset.status||'').toLowerCase(),p=(row.dataset.priority||'').toLowerCase();
    let show=filter==='All'||(filter==='Urgent'&&(p==='urgent'||s==='urgent'))||(filter==='Not started'&&(s==='open'||s==='not started'))||(filter==='In progress'&&(s==='in progress'||s==='in-progress'))||(filter==='Complete'&&(s==='complete'||s==='completed'))||(filter==='Awaiting approval'&&s.includes('approval'));
    row.style.display=show?'':'none';
  });
}
function spCellChange(sel){
  const k=sel.dataset.dk,sid=sel.dataset.sid,type=sel.dataset.type;
  const rota=spGetRota(),pending=JSON.parse(localStorage.getItem('sp_rota_pending')||'{}');
  const raw=(rota[k]||{})[sid];
  const approved=typeof raw==='object'&&raw!==null?raw:{shift:raw||'off',dept:null};
  const existing=pending[k]?.[sid]||approved;
  if(!pending[k])pending[k]={};
  pending[k][sid]=type==='shift'?{shift:sel.value,dept:existing.dept||null}:{shift:existing.shift||'off',dept:sel.value};
  localStorage.setItem('sp_rota_pending',JSON.stringify(pending));
  renderRotaWeek(document.getElementById('view'));
}
function spApprovePerson(staffId){
  const rota=spGetRota(),pending=JSON.parse(localStorage.getItem('sp_rota_pending')||'{}');
  Object.keys(pending).forEach(dk=>{
    if(pending[dk][staffId]!==undefined){if(!rota[dk])rota[dk]={};rota[dk][staffId]=pending[dk][staffId];delete pending[dk][staffId];if(!Object.keys(pending[dk]).length)delete pending[dk];}
  });
  spSaveRota(rota);localStorage.setItem('sp_rota_pending',JSON.stringify(pending));
  toast('✓ Rota approved');renderRotaWeek(document.getElementById('view'));
}
function spDiscardPerson(staffId){
  const pending=JSON.parse(localStorage.getItem('sp_rota_pending')||'{}');
  Object.keys(pending).forEach(dk=>{delete pending[dk][staffId];if(!Object.keys(pending[dk]).length)delete pending[dk];});
  localStorage.setItem('sp_rota_pending',JSON.stringify(pending));
  renderRotaWeek(document.getElementById('view'));
}
function spApproveAll(){
  const rota=spGetRota(),pending=JSON.parse(localStorage.getItem('sp_rota_pending')||'{}');
  Object.keys(pending).forEach(dk=>{if(!rota[dk])rota[dk]={};Object.assign(rota[dk],pending[dk]);});
  spSaveRota(rota);localStorage.setItem('sp_rota_pending','{}');
  toast('✓ All changes approved');renderRotaWeek(document.getElementById('view'));
}
function spDiscardAll(){
  if(!confirm('Discard all pending rota changes?'))return;
  localStorage.setItem('sp_rota_pending','{}');renderRotaWeek(document.getElementById('view'));
}
function spCellSelect(sel){spCellChange(sel);}
function sendAdminNotification(job,type){
  const notifs=JSON.parse(localStorage.getItem('bh_notifications')||'[]');
  const msg=type==='complete'?'✅ Completed: "'+job.title+'"':'🔧 New job: "'+job.title+'" ['+job.priority+']';
  notifs.unshift({id:'n'+Date.now(),type,jobId:job.id,msg,for:'admin',readBy:[],at:new Date().toISOString()});
  if(notifs.length>100)notifs.splice(100);
  localStorage.setItem('bh_notifications',JSON.stringify(notifs));
  toast(msg);
}
function sendPersonNotification(userId,job){
  const notifs=JSON.parse(localStorage.getItem('bh_notifications')||'[]');
  const n={id:'n'+Date.now(),type:'assigned',jobId:job.id,msg:'📋 Assigned to you: "'+job.title+'"',for:'person',forUser:userId,readBy:[],at:new Date().toISOString()};
  notifs.unshift(n);if(notifs.length>100)notifs.splice(100);
  localStorage.setItem('bh_notifications',JSON.stringify(notifs));
  toast(n.msg);
}


function renderRotaDash(v){
  const rota=spGetRota(),fc=spGetFC(),staff=spGetStaff();
  const today=new Date(),todayK=spDK(today),days=spWeekDates(0),todayFC=fc[todayK]||{};
  let deptCards='';
  SP_DEPTS.forEach(dept=>{
    const req=spCalcRequired(todayFC,dept.id),rostered=spCountRostered(rota,todayK,dept.id),ok=rostered>=req.needed;
    deptCards+=`<div onclick="switchTab('rotaWeek')" style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-left:4px solid ${ok?'#2a6a4a':'#b3261e'};cursor:pointer" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,.12)'" onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,.07)'">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-weight:700;font-size:13px;color:#1a2b3a">${dept.name}</div>
        <span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:${ok?'#dcfce7':'#fee2e2'};color:${ok?'#166534':'#991b1b'}">${ok?'✓ Covered':'⚠ Short'}</span>
      </div>
      <div style="display:flex;gap:14px;font-size:12px;color:#374151">
        <span>Rostered: <b style="color:#1a2b3a">${rostered}</b></span>
        <span>Required: <b style="color:${ok?'#166534':'#991b1b'}">${req.needed}</b></span>
      </div>
      <div style="font-size:11px;color:#374151;margin-top:3px">${req.note}</div>
    </div>`;
  });
  const weekStrip=days.map(d=>{const k=spDK(d),f=fc[k]||{},isT=k===todayK;return`<td style="text-align:center;padding:6px 4px;background:${isT?'#e8f3ee':''};border-radius:6px"><div style="font-weight:700;font-size:14px;color:${f.rooms?'#1a2b3a':'#d1d5db'}">${f.rooms||'—'}</div><div style="font-size:10px;color:#374151">${d.toLocaleDateString('en-GB',{weekday:'short'})}</div></td>`;}).join('');
  v.innerHTML=`<div style="padding:20px 28px;max-width:1300px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">
      <div><div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#ffffff">HosSHIFT Dashboard</div>
      <div style="font-size:13px;color:#a9b8c9">Today · ${today.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="switchTab('rotaWeek')" style="padding:9px 16px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">📋 Weekly Rota</button>
        <button onclick="switchTab('rotaForecast')" style="padding:9px 16px;background:#c78a3b;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">📈 Update Forecast</button>
        <button onclick="spApproveRota()" style="padding:9px 16px;background:#2a6a4a;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">🖨 Print Rota</button>
        <button onclick="switchTab('rotaPayroll')" style="padding:9px 16px;background:#3b5167;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">💷 Payroll</button>
        <button onclick="spShareRotaLink()" style="padding:9px 16px;background:#4DA69C;color:#fff;border:none;border-radius:9px;font:700 13px Lato;cursor:pointer">🔗 Staff rota link</button>
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px">🟢 On site now</div>
        <button onclick="hpFillOnSiteNow()" style="font-size:11px;background:#eef2f5;border:none;border-radius:7px;padding:4px 10px;cursor:pointer;color:#374151;font-weight:600">↻ Refresh</button>
      </div>
      <div id="hp-onsite-body" style="font-size:13px;color:#64707f">Loading live clock-ins…</div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
      <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Rooms In House — This Week</div>
      <table style="width:100%"><tr>${weekStrip}</tr></table>
      <div style="margin-top:10px;display:flex;gap:16px;font-size:12px;flex-wrap:wrap">
        <span style="color:#374151">Today: <b style="color:#1a2b3a">${todayFC.rooms||'—'} rooms</b></span>
        <span style="color:#374151">Departures: <b>${todayFC.departures||'—'}</b></span>
        <span style="color:#374151">Stayovers: <b>${todayFC.stayovers||'—'}</b></span>
        <span style="color:#374151">Bkfst: <b>${todayFC.breakfastCovers||'—'}</b></span>
        <span style="color:#374151">Dinner: <b>${todayFC.dinnerCovers||'—'}</b></span>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:#c7d2e0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Today · Department Staffing</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">${deptCards}</div>
  </div>`;
  hpFillOnSiteNow();
}
/* Live "on site now" from today's QR clock-ins (manager view) */
async function hpFillOnSiteNow(){
  const el=document.getElementById('hp-onsite-body'); if(!el) return;
  if(typeof FB==="undefined" || !FB.ready || !FB.user){ el.innerHTML='<span style="color:#9aa7b5">Live clock-ins appear here once the QR clock-in is published and you are signed in.</span>'; return; }
  const today=new Date().toISOString().slice(0,10);
  try{
    const snap=await FB.db.collection('clock_punches').where('date','==',today).get();
    const by={};
    snap.forEach(d=>{ const r=d.data(); (by[r.staffCode]||(by[r.staffCode]={name:r.name,punches:[]})).punches.push(r); });
    const onSite=[]; let outCount=0;
    Object.values(by).forEach(p=>{ p.punches.sort((a,b)=>String(a.ts||'').localeCompare(String(b.ts||''))); const last=p.punches[p.punches.length-1];
      if(last.type==='in') onSite.push({name:p.name, since:last.time}); else outCount++; });
    onSite.sort((a,b)=>a.name.localeCompare(b.name));
    const esc=s=>typeof spEsc==='function'?spEsc(s):s;
    if(!Object.keys(by).length){ el.innerHTML='<span style="color:#9aa7b5">No clock-ins yet today.</span>'; return; }
    el.innerHTML=`<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:${onSite.length?'12':'0'}px">
        <div><span style="font-size:22px;font-weight:800;color:#166534">${onSite.length}</span> <span style="font-size:12px;color:#64707f">on site</span></div>
        <div><span style="font-size:22px;font-weight:800;color:#64707f">${outCount}</span> <span style="font-size:12px;color:#64707f">clocked out</span></div>
      </div>
      ${onSite.length?'<div style="display:flex;flex-wrap:wrap;gap:8px">'+onSite.map(p=>`<span style="background:#e6f4ee;color:#1d6b4f;border-radius:16px;padding:5px 12px;font-size:12.5px;font-weight:600">🟢 ${esc(p.name)} <span style="color:#4b5563;font-weight:400">since ${esc(p.since)}</span></span>`).join('')+'</div>':'<span style="color:#9aa7b5">Everyone who clocked in has clocked out.</span>'}`;
  }catch(e){ el.innerHTML='<span style="color:#b3261e">Could not load clock-ins: '+e.message+'</span>'; }
}

// ── WEEKLY ROTA ───────────────────────────────────────────────────────────────
function renderRotaWeek(v){
  const rota=spGetRota(), fc=spGetFC(), staff=spGetStaff();
  const days=spWeekDates(spWeekOffset), todayK=spDK(new Date());
  const pending=JSON.parse(localStorage.getItem('sp_rota_pending')||'{}');
  const depts=SP_DEPTS.filter(d=>staff.some(s=>s.dept===d.id));

  // Helper: parse a rota cell (may be string "09:00-17:00" or object {shift,dept})
  const parseCell=val=>{
    if(!val||val==='off'||typeof val==='string') return {shift:val||'off',dept:null};
    if(typeof val==='object') return val;
    return {shift:val,dept:null};
  };

  // Build all-dept options for the covering-dept dropdown
  const deptOpts=SP_DEPTS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');

  // Day headers
  const dayHeads=days.map(d=>{
    const k=spDK(d), f=fc[k]||{}, isT=k===todayK;
    return`<th style="min-width:148px;padding:8px 4px;text-align:center;background:${isT?'#1a2b3a':'#f5f7f9'};color:${isT?'#fff':'#1a2b3a'};font-size:11px;font-weight:700;border-bottom:2px solid #e5e7eb">
      <div>${d.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase()}</div>
      <div style="font-size:10px;opacity:.7">${d.getDate()} ${d.toLocaleDateString('en-GB',{month:'short'})}</div>
      ${f.rooms?`<div style="font-size:10px;margin-top:2px;opacity:.8">🛏 ${f.rooms}</div>`:''}
    </th>`;
  }).join('');

  let rows='';
  depts.forEach(dept=>{
    const deptStaff=staff.filter(s=>s.dept===dept.id);
    if(!deptStaff.length) return;

    const allShifts=(dept.shifts&&dept.shifts.length?dept.shifts:[
      '07:00-15:00','08:00-16:00','09:00-17:00','15:00-23:00','23:00-07:00'
    ]).concat(['off','holiday','on call','sick','in lieu']);

    rows+=`<tr><td colspan="${days.length+3}" style="padding:7px 12px;background:${dept.colour};color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${dept.name}</td></tr>`;

    deptStaff.forEach(s=>{
      const initials=s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      let totalHrs=0;

      const cells=days.map(d=>{
        const k=spDK(d);
        const raw=(rota[k]||{})[s.id];
        const cell=parseCell(raw);
        const pend=pending[k]?.[s.id];  // pending change not yet approved
        const display=pend||cell;
        const sh=display.shift||'off';
        const covDept=display.dept||s.dept;
        const isPending=!!pend;
        const isOff=sh==='off', isHol=sh==='holiday';
        const isOut=sh==='on call'||sh==='sick'||sh==='in lieu';
        const isCover=covDept!==s.dept;  // covering a different dept

        // Colour: pending=amber border, cover=purple tint, holiday=yellow, off=grey, working=green
        const cellBg=isHol?'#fffbeb':isOut?'#fff5f5':isOff?'#f9fafb':isCover?'#f5f0ff':'#f0fdf4';
        const border=isPending?'2px solid #f59e0b':'1px solid #e5e7eb';

        // Calc hours for total
        if(!isOff&&!isHol&&!isOut){
          const m=sh.match(/(\d+):(\d+)-(\d+):(\d+)/);
          if(m){const h=(+m[3]*60+ +m[4]- +m[1]*60- +m[2])/60; totalHrs+=(h<0?h+24:h);}
          else totalHrs+=8;
        }

        const shiftOpts=allShifts.map(x=>`<option value="${x}"${sh===x?' selected':''}>${x}</option>`).join('');
        const deptOptsWithSel=SP_DEPTS.map(dep=>`<option value="${dep.id}"${covDept===dep.id?' selected':''}>${dep.name}</option>`).join('');

        return`<td style="padding:4px 3px;background:${cellBg};border:${border};position:relative">
          ${isPending?`<div style="position:absolute;top:2px;right:3px;width:6px;height:6px;border-radius:50%;background:#f59e0b"></div>`:''}
          ${isCover&&!isPending?`<div style="position:absolute;top:2px;right:3px;font-size:8px;color:#7c3aed;font-weight:700">COVER</div>`:''}
          <select data-dk="${k}" data-sid="${s.id}" data-type="shift"
            onchange="spCellChange(this)"
            style="width:100%;padding:3px 2px;border:1px solid #d1d5db;border-radius:5px;font-size:11px;color:#1a2b3a;background:transparent;cursor:pointer;margin-bottom:3px">
            ${shiftOpts}
          </select>
          <select data-dk="${k}" data-sid="${s.id}" data-type="dept"
            onchange="spCellChange(this)"
            style="width:100%;padding:3px 2px;border:1px solid ${isCover?'#7c3aed':'#d1d5db'};border-radius:5px;font-size:10px;color:${isCover?'#7c3aed':'#374151'};background:transparent;cursor:pointer">
            ${deptOptsWithSel}
          </select>
        </td>`;
      }).join('');

      // Count pending changes for this staff member
      const pendingCount=days.filter(d=>pending[spDK(d)]?.[s.id]).length;

      rows+=`<tr id="row-${s.id}" style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 10px;min-width:160px;background:#fff;position:sticky;left:0;z-index:1;box-shadow:2px 0 4px rgba(0,0,0,.05)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:30px;height:30px;border-radius:50%;background:${dept.colour};flex-shrink:0;display:flex;align-items:center;justify-content:center;font:700 11px Lato;color:#fff">${initials}</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:#1a2b3a">${s.name}</div>
              <div style="font-size:10px;color:#374151">${s.role||''}</div>
            </div>
          </div>
        </td>
        ${cells}
        <td style="padding:6px 8px;text-align:center;font-size:11px;font-weight:700;color:${totalHrs>0?'#166534':'#9ca3af'};background:#fff;white-space:nowrap">${totalHrs>0?totalHrs.toFixed(1)+'h':'—'}</td>
        <td style="padding:4px 6px;background:#fff;min-width:130px">
          <div style="display:flex;flex-direction:column;gap:4px">
            ${pendingCount>0?`
            <button onclick="spApprovePerson('${s.id}')"
              style="padding:5px 8px;background:#166534;color:#fff;border:none;border-radius:7px;font:700 11px Lato;cursor:pointer;white-space:nowrap">
              ✓ Save & Approve (${pendingCount})
            </button>
            <button onclick="spDiscardPerson('${s.id}')"
              style="padding:4px 8px;background:#fff;border:1px solid #fecaca;border-radius:7px;font:600 10px Lato;cursor:pointer;color:#991b1b">
              ✕ Discard
            </button>`:`
            <button onclick="spEditStaffModal('${s.id}')"
              style="padding:5px 8px;border:1px solid #d1d5db;border-radius:7px;background:#fff;font:600 11px Lato;cursor:pointer;color:#374151">
              ✏ Edit
            </button>`}
          </div>
        </td>
      </tr>`;
    });

    // Coverage summary row for this dept
    const coverageRow=days.map(d=>{
      const k=spDK(d), f=fc[k]||{};
      const req=spCalcRequired(f,dept.id);
      // Count rostered in this dept including covers
      let ros=0;
      staff.forEach(s=>{
        const raw=(rota[k]||{})[s.id];
        const pend=pending[k]?.[s.id];
        const cell=parseCell(pend||raw);
        const sh=cell.shift||'off';
        const covDept=cell.dept||s.dept;
        if(covDept===dept.id&&sh!=='off'&&sh!=='holiday'&&sh!=='sick'&&sh!=='in lieu') ros++;
      });
      const ok=ros>=req.needed;
      return`<td style="padding:5px 8px;text-align:center;background:${ok?'#f0fdf4':'#fff5f5'};font-size:11px;font-weight:700;color:${ok?'#166534':'#991b1b'}">${ros}/${req.needed} ${ok?'✓':'⚠'}</td>`;
    }).join('');
    rows+=`<tr style="border-top:2px solid #e5e7eb">
      <td style="padding:5px 12px;background:#f9fafb;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;position:sticky;left:0;background:#f9fafb;z-index:1">Coverage</td>
      ${coverageRow}
      <td colspan="2" style="background:#f9fafb"></td>
    </tr>`;
  });

  // Pending banner
  const totalPending=Object.values(pending).reduce((t,day)=>t+Object.keys(day).length,0);

  v.innerHTML=`<div style="padding:20px 28px">
    ${totalPending>0?`<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;font-weight:700;color:#92400e">⏳ ${totalPending} unsaved change${totalPending!==1?'s':''} — approve by person or use Approve All below</div>
      <div style="display:flex;gap:8px">
        <button onclick="spApproveAll()" style="padding:7px 14px;background:#166534;color:#fff;border:none;border-radius:8px;font:700 12px Lato;cursor:pointer">✓ Approve All</button>
        <button onclick="spDiscardAll()" style="padding:7px 12px;background:#fff;border:1px solid #fecaca;border-radius:8px;font:600 12px Lato;cursor:pointer;color:#991b1b">✕ Discard All</button>
      </div>
    </div>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#fff">Weekly Rota</div>
        <div style="font-size:12px;color:#8fa3b8">w/c ${spShortFmt(days[0])} · Change any shift or department, then Save & Approve per person</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="spWeekOffset--;renderRotaWeek(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font:600 12px Lato">← Prev</button>
        <button onclick="spWeekOffset=0;renderRotaWeek(document.getElementById('view'))" style="padding:7px 14px;border:1px solid #c78a3b;border-radius:8px;background:#c78a3b;color:#fff;cursor:pointer;font:700 12px Lato">This week</button>
        <button onclick="spWeekOffset++;renderRotaWeek(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font:600 12px Lato">Next →</button>
        <button onclick="spAddStaffModal()" style="padding:7px 12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;font:600 12px Lato;cursor:pointer;color:#fff">+ Staff</button>
        <button onclick="spExportCSV()" style="padding:7px 12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;font:600 12px Lato;cursor:pointer;color:#fff">⬇ Export</button>
        <button onclick="switchTab('rotaPayroll')" style="padding:7px 12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;font:600 12px Lato;cursor:pointer;color:#fff">💷 Payroll</button>
        <button onclick="spShareRotaLink()" style="padding:7px 12px;background:#4DA69C;border:1px solid #4DA69C;border-radius:8px;font:700 12px Lato;cursor:pointer;color:#fff">🔗 Staff rota link</button>
      </div>
    </div>
    <div style="font-size:11px;color:#8fa3b8;margin-bottom:10px">
      🟡 Amber border = pending approval &nbsp;·&nbsp; 🟣 Purple = covering another dept &nbsp;·&nbsp; 🟢 Coverage row = rostered vs minimum
    </div>
    <div style="background:#fff;border-radius:12px;overflow:auto;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <table style="width:100%;border-collapse:collapse;min-width:1000px">
        <thead>
          <tr style="background:#f5f7f9">
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;position:sticky;left:0;background:#f5f7f9;z-index:2;min-width:160px">Staff</th>
            ${dayHeads}
            <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;min-width:40px">Hrs</th>
            <th style="padding:10px 8px;min-width:130px"></th>
          </tr>
        </thead>
        <tbody>${rows}${spRotaTotalsRows(days,rota,staff,pending)}</tbody>
      </table>
    </div>
  </div>`;
}




function spUpdateCell(input){const rota=spGetRota(),dk=input.dataset.dk,sid=input.dataset.sid;if(!rota[dk])rota[dk]={};rota[dk][sid]=input.value.trim();spSaveRota(rota);const c=spShiftStyle(input.value.trim());input.style.background=c.bg;input.style.color=c.col;input.style.borderColor=c.border;}

// ── FORECAST ─────────────────────────────────────────────────────────────────
function renderRotaForecast(v){
  const fc=spGetFC(),rota=spGetRota(),days=spWeekDates(spFcWeekOffset);
  const cards=days.map(d=>{
    const k=spDK(d),f=fc[k]||{},isT=k===spDK(new Date());
    const reqs=SP_DEPTS.map(dept=>{const req=spCalcRequired(f,dept.id),ros=spCountRostered(rota,k,dept.id),ok=ros>=req.needed;return`<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #f5f7f9"><span style="color:#374151">${dept.name}</span><span style="font-weight:700;color:${ok?'#166534':'#b91c1c'}">${ros}/${req.needed} ${ok?'✓':'⚠'}</span></div>`;}).join('');
    return`<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);${isT?'border:2px solid #1a2b3a':''}">
      <div style="font-weight:700;font-size:13px;color:#1a2b3a;margin-bottom:10px">${d.toLocaleDateString('en-GB',{weekday:'long'})} <span style="font-size:11px;font-weight:400;color:#374151">${spShortFmt(d)}${isT?' · Today':''}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
        ${[['rooms','🛏 Rooms',f.rooms],['departures','🚪 Departures',f.departures],['stayovers','🔄 Stayovers',f.stayovers],['breakfastCovers','☕ Breakfast covers',f.breakfastCovers],['dinnerCovers','🍽 Dinner covers',f.dinnerCovers]].map(([field,label,val],i)=>`<div${i===4?' style="grid-column:span 2"':''}>
          <label style="font-size:10px;color:#374151;text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:2px">${label}</label>
          <input type="number" value="${val||''}" min="0" placeholder="0" data-dk="${k}" data-field="${field}" oninput="spUpdateFC(this)" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:700 14px Lato;color:#1a2b3a">
        </div>`).join('')}
      </div>
      <div style="border-top:1px solid #eef1f4;padding-top:8px"><div style="font-size:10px;font-weight:700;color:#1a2b3a;text-transform:uppercase;margin-bottom:5px">Required vs Rostered</div><div id="fc-req-${k}">${reqs}</div></div>
    </div>`;
  }).join('');
  v.innerHTML=`<div style="padding:20px 28px;max-width:1300px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div><div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#ffffff">Occupancy Forecast</div>
      <div style="font-size:12px;color:#a9b8c9">Enter rooms sold and covers — staffing requirements update live. Auto-saves as you type.</div></div>
      <div style="display:flex;gap:8px">
        <button onclick="spFcWeekOffset--;renderRotaForecast(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff">← Prev</button>
        <button onclick="spFcWeekOffset=0;renderRotaForecast(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.35);border-radius:8px;background:#2e4156;color:#fff;cursor:pointer;font:600 12px Lato">This week</button>
        <button onclick="spFcWeekOffset++;renderRotaForecast(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff">Next →</button>
        <button onclick="spCreateRotaFromForecast()" style="padding:7px 14px;background:#2a6a4a;color:#fff;border:none;border-radius:8px;font:700 13px Lato;cursor:pointer">⚡ Create draft rota</button>
        <button onclick="switchTab('rotaWeek')" style="padding:7px 12px;background:#2e4156;color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:8px;font:600 12px Lato;cursor:pointer">← Back to Rota</button>
        <button onclick="spShareRotaLink()" style="padding:7px 12px;background:#4DA69C;border:1px solid #4DA69C;border-radius:8px;font:700 12px Lato;cursor:pointer;color:#fff">🔗 Staff rota link</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${cards}</div>
  </div>`;
}

function spUpdateFC(input){
  const fc=spGetFC(), k=input.dataset.dk, field=input.dataset.field;
  if(!fc[k]) fc[k]={};
  const val = parseInt(input.value)||0;
  fc[k][field] = val;
  // Auto-calc breakfast from rooms (always recalc, not just if empty)
  if(field==='rooms'){
    fc[k].breakfastCovers = Math.round(val * 1.8);
    // Update the breakfast input on screen
    const bkInput = document.querySelector(`input[data-dk="${k}"][data-field="breakfastCovers"]`);
    if(bkInput) bkInput.value = fc[k].breakfastCovers;
  }
  spSaveFC(fc);
  // Re-render required vs rostered for this day card only
  const reqDiv = document.getElementById('fc-req-'+k);
  if(reqDiv){
    const rota=spGetRota(), f=fc[k]||{};
    const reqs = (typeof SP_DEPTS!=='undefined'?SP_DEPTS:[]).map(dept=>{
      const req=spCalcRequired(f,dept.id), ros=spCountRostered(rota,k,dept.id), ok=ros>=req.needed;
      return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #f5f7f9">
        <span style="color:#374151">${dept.name}</span>
        <span style="font-weight:700;color:${ok?'#166534':'#b91c1c'}">${ros}/${req.needed} ${ok?'✓':'⚠'}</span>
      </div>`;
    }).join('');
    reqDiv.innerHTML = reqs;
  }
}

// ── MONTHLY ───────────────────────────────────────────────────────────────────
function renderRotaMonthly(v){
  const monthly=spGetMonthly(),fc=spGetFC(),today=new Date();
  const vd=new Date(today.getFullYear(),today.getMonth()+spMonthOff,1);
  const mn=vd.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const dim=new Date(vd.getFullYear(),vd.getMonth()+1,0).getDate(),fd=vd.getDay()||7;
  const mk=`${vd.getFullYear()}-${String(vd.getMonth()+1).padStart(2,'0')}`;
  let tot=0,bkt=0,dint=0;
  for(let i=1;i<=dim;i++){const dk=`${mk}-${String(i).padStart(2,'0')}`,f=monthly[dk]||fc[dk]||{};tot+=f.rooms||0;bkt+=f.breakfastCovers||Math.round((f.rooms||0)*1.8);dint+=f.dinnerCovers||0;}
  let cells='';
  for(let i=1;i<fd;i++)cells+=`<td style="border:1px solid #f0f0f0;background:#fafafa"></td>`;
  for(let day=1;day<=dim;day++){const dk=`${mk}-${String(day).padStart(2,'0')}`,f=monthly[dk]||fc[dk]||{},isT=dk===spDK(today),occ=f.rooms?Math.round(f.rooms/120*100):null,oc=occ===null?'#e0e0e0':occ>=80?'#166534':occ>=50?'#854d0e':'#991b1b';cells+=`<td style="padding:4px;border:1px solid #f0f0f0;vertical-align:top;${isT?'background:#e8f3ee':''}"><div style="font-size:11px;font-weight:700;color:#1a2b3a">${day}</div><input type="number" value="${f.rooms||''}" min="0" max="120" placeholder="—" data-dk="${dk}" data-field="rooms" onchange="spUpdateMonthly(this)" title="Rooms" style="width:100%;padding:2px;border:1px solid #d1d5db;border-radius:4px;font:700 11px Lato;text-align:center;color:${oc}"><input type="number" value="${f.dinnerCovers||''}" min="0" placeholder="din" data-dk="${dk}" data-field="dinnerCovers" onchange="spUpdateMonthly(this)" title="Dinner" style="width:100%;margin-top:2px;padding:2px;border:1px solid #d1d5db;border-radius:4px;font:10px Lato;text-align:center;color:#8b5c8f"></td>`;}
  const end=7-((fd-1+dim)%7);if(end<7)for(let i=0;i<end;i++)cells+=`<td style="border:1px solid #f0f0f0;background:#fafafa"></td>`;
  const allCells=cells.split('</td>').filter(Boolean).map(c=>c+'</td>');let calRows='';for(let i=0;i<allCells.length;i+=7)calRows+=`<tr>${allCells.slice(i,i+7).join('')}</tr>`;
  v.innerHTML=`<div style="padding:20px;max-width:920px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div><div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#ffffff">Monthly Forecast</div>
      <div style="font-size:12px;color:#a9b8c9">Top = rooms · Bottom = dinner covers · Colour = occupancy</div></div>
      <div style="display:flex;gap:7px;align-items:center">
        <button onclick="spMonthOff--;renderRotaMonthly(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff">← Prev</button>
        <b style="padding:0 6px;font-size:14px;color:#ffffff">${mn}</b>
        <button onclick="spMonthOff++;renderRotaMonthly(document.getElementById('view'))" style="padding:7px 12px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;color:#fff">Next →</button>
        <button onclick="spShareRotaLink()" style="padding:7px 12px;background:#4DA69C;border:1px solid #4DA69C;border-radius:8px;font:700 12px Lato;cursor:pointer;color:#fff">🔗 Staff rota link</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      ${[['🛏 Room Nights',tot,'#1a2b3a'],['☕ Est Breakfast',bkt,'#4a9d7f'],['🍽 Dinner Covers',dint,'#8b5c8f']].map(([l,n,c])=>`<div style="background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);text-align:center"><div style="font-size:24px;font-weight:700;color:${c}">${n}</div><div style="font-size:11px;color:#374151;text-transform:uppercase">${l}</div></div>`).join('')}
    </div>
    <div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<th style="padding:5px;text-align:center;font-size:11px;color:#374151">${d}</th>`).join('')}</tr></thead>
        <tbody>${calRows}</tbody>
      </table>
    </div>
  </div>`;
}

function spUpdateMonthly(input){const monthly=spGetMonthly(),fc=spGetFC(),dk=input.dataset.dk,field=input.dataset.field;if(!monthly[dk])monthly[dk]={};monthly[dk][field]=parseInt(input.value)||0;spSaveMonthly(monthly);if(!fc[dk])fc[dk]={};fc[dk][field]=parseInt(input.value)||0;if(field==='rooms'&&!fc[dk].breakfastCovers)fc[dk].breakfastCovers=Math.round((parseInt(input.value)||0)*1.8);spSaveFC(fc);}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function renderRotaSettings(v){
  const staff=spGetStaff();
  const rows=staff.map(s=>{const dept=SP_DEPTS.find(d=>d.id===s.dept)||{name:s.dept,colour:'#4a86c7'};const wkHrs=0;return`<tr style="border-bottom:1px solid #f5f7f9"><td style="padding:8px 10px"><b style="font-size:13px;color:#1a2b3a">${s.name}</b><div style="font-size:11px;color:#374151">${s.role||''} · ${s.staffCode||''}</div></td><td style="padding:8px 6px"><span style="padding:2px 8px;border-radius:8px;font-size:11px;background:${dept.colour}20;color:${dept.colour};font-weight:600">${dept.name}</span></td><td style="padding:8px 6px;font-size:12px;color:#374151">${s.type==='relief'?'Relief':'Core'}</td><td style="padding:8px 6px;font-size:12px;color:#1a2b3a">${s.contractHrs>0?s.contractHrs+'h/wk':'—'}</td><td style="padding:8px 6px;font-size:12px;color:#1a2b3a">${s.hourlyRate>0?'£'+s.hourlyRate+'/h':'—'}</td><td style="padding:8px 6px"><select onchange="spMoveDept('${s.id}',this.value)" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;color:#1a2b3a">${SP_DEPTS.map(d=>`<option value="${d.id}"${s.dept===d.id?' selected':''}>${d.name}</option>`).join('')}</select></td>
      <td style="padding:8px 6px">
        <div style="display:flex;gap:3px">
          ${['M','T','W','T','F','S','S'].map((day,i)=>`<label style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">
            <input type="checkbox" ${(s.workDays||[])[i]?'checked':''} onchange="spToggleWorkDay('${s.id}',${i},this.checked)" style="width:14px;height:14px;accent-color:#2a6a4a">
            <span style="font-size:9px;font-weight:700;color:#374151">${day}</span>
          </label>`).join('')}
        </div>
      </td><td style="padding:8px 6px"><button onclick="spRemoveStaff('${s.id}')" style="padding:3px 8px;border:1px solid #fee2e2;border-radius:6px;background:#fff;color:#991b1b;font-size:11px;cursor:pointer">Remove</button></td></tr>`;}).join('');
  v.innerHTML=`<div style="padding:20px;max-width:1000px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#ffffff;margin-bottom:4px">HosSHIFT Settings</div>
    <div style="font-size:13px;color:#a9b8c9;margin-bottom:18px">${staff.length} staff members · Click name in rota to edit shifts</div>
    <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <b style="font-size:12px;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px">Team</b>
        <button onclick="spAddStaffModal()" style="padding:7px 14px;background:#1a2b3a;color:#fff;border:none;border-radius:8px;font:600 12px Lato;cursor:pointer">+ Add member</button>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f5f7f9">${['Name','Department','Type','Hours','Rate','Move','Working Days',''].map(h=>`<th style="text-align:left;padding:7px 10px;font-size:11px;color:#374151;text-transform:uppercase">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
  </div>`;
}

function spMoveDept(sid,deptId){const staff=spGetStaff(),s=staff.find(x=>x.id===sid);if(s){s.dept=deptId;spSaveStaff(staff);if(typeof toast==='function')toast('Staff updated ✓');}}
function spRemoveStaff(sid){
  if(!confirm('Remove this staff member from the rota and HR records?')) return;
  // Remove from HosSHIFT
  spSaveStaff(spGetStaff().filter(s=>s.id!==sid));
  // Remove from HosSTAFF profiles
  const profiles=JSON.parse(localStorage.getItem('hs_profiles')||'null');
  if(profiles){ localStorage.setItem('hs_profiles',JSON.stringify(profiles.filter(p=>p.id!==sid))); }
  // Remove from leave records
  const leave=JSON.parse(localStorage.getItem('hs_leave')||'[]');
  localStorage.setItem('hs_leave',JSON.stringify(leave.filter(l=>l.staffId!==sid)));
  // Remove from rota
  const rota=spGetRota();
  Object.keys(rota).forEach(dk=>{ if(rota[dk][sid]) delete rota[dk][sid]; });
  spSaveRota(rota);
  if(typeof toast==='function') toast('Staff member removed');
  renderRotaSettings(document.getElementById('view'));
}

// ── ADD STAFF MODAL ───────────────────────────────────────────────────────────
function spAddStaffModal(){
  const deptOpts=SP_DEPTS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  openModal(`<div style="padding:4px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add staff member</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Full name</label>
        <input id="sp-add-name" type="text" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:14px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Role</label>
        <input id="sp-add-role" type="text" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:14px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Department</label>
        <select id="sp-add-dept" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:14px Lato;color:#1a2b3a">${deptOpts}</select></div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Type</label>
          <select id="sp-add-type" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:14px Lato;color:#1a2b3a"><option value="core">Core</option><option value="relief">Relief</option></select></div>
        <div style="flex:1"><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Hours/wk</label>
          <input id="sp-add-hrs" type="number" value="0" min="0" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:14px Lato;color:#1a2b3a"></div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button onclick="spDoAddStaff()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Add to rota</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`);
}

function spDoAddStaff(){
  const name=document.getElementById('sp-add-name')?.value?.trim();
  if(!name){if(typeof toast==='function')toast('Please enter a name');return;}
  const staff=spGetStaff();
  const id=name.toLowerCase().replace(/[^a-z0-9]/g,'_')+'_'+Date.now();
  staff.push({id,staffCode:'BH'+String(staff.length+1).padStart(3,'0'),name,role:document.getElementById('sp-add-role')?.value?.trim()||'',dept:document.getElementById('sp-add-dept')?.value||'admin',type:document.getElementById('sp-add-type')?.value||'core',contractHrs:parseInt(document.getElementById('sp-add-hrs')?.value)||0,hourlyRate:0});
  spSaveStaff(staff);closeModal();if(typeof toast==='function')toast('✓ '+name+' added');
  renderRotaWeek(document.getElementById('view'));
}

function spEditStaffModal(staffId){
  const staff=spGetStaff(), s=staff.find(x=>x.id===staffId); if(!s) return;
  const dept=SP_DEPTS.find(d=>d.id===s.dept)||{name:s.dept,colour:'#1a2b3a',shifts:[]};
  const days=spWeekDates(spWeekOffset), rota=spGetRota();
  const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const workDays = s.workDays || [0,0,0,0,0,0,0];

  const shiftOpts=(dept.shifts.length?dept.shifts:[]).concat(['off','holiday','on call','sick','in lieu']);

  const weekRows=days.map((d,i)=>{
    const k=spDK(d), sh=(rota[k]||{})[s.id]||'off';
    const opts=shiftOpts.map(x=>`<option value="${x}"${sh===x?' selected':''}>${x}</option>`).join('');
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb">
      <div style="width:36px;font-size:12px;font-weight:700;color:#1a2b3a">${DAYS[i]}</div>
      <div style="font-size:11px;color:#374151;width:80px">${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
      <select data-dk="${k}" data-sid="${s.id}" onchange="spCellSelect(this)"
        style="flex:1;padding:7px;border:1.5px solid #d1d5db;border-radius:7px;font:600 12px Lato;color:#1a2b3a;cursor:pointer">
        ${opts}
      </select>
    </div>`;
  }).join('');

  // Working days checkboxes
  const dayChecks=DAYS.map((day,i)=>`
    <label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
      <input type="checkbox" id="wd-${i}-${s.id}" ${workDays[i]?'checked':''}
        onchange="spToggleWorkDay('${s.id}',${i},this.checked)"
        style="width:18px;height:18px;accent-color:#2a6a4a;cursor:pointer">
      <span style="font-size:10px;font-weight:700;color:#374151">${day}</span>
    </label>`).join('');

  const html=`<div style="max-height:85vh;overflow-y:auto;padding:4px">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="width:42px;height:42px;border-radius:50%;background:${dept.colour};display:flex;align-items:center;justify-content:center;font:700 14px Lato;color:#fff">${s.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div>
        <div style="font-size:16px;font-weight:700;color:#1a2b3a">${s.name}</div>
        <div style="font-size:12px;color:#374151">${s.role||''} · ${dept.name}</div>
      </div>
      <button onclick="closeModal()" style="margin-left:auto;background:none;border:none;font-size:20px;cursor:pointer;color:#374151">✕</button>
    </div>

    <!-- Contract details -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;padding:12px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb">
      <div>
        <label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Contract type</label>
        <select id="sp-ct-${s.id}" onchange="spSaveContractField('${s.id}','contract',this.value)"
          style="width:100%;padding:7px;border:1.5px solid #d1d5db;border-radius:7px;font:12px Lato;color:#1a2b3a">
          ${['Full-time','Part-time','Zero hours'].map(c=>`<option${s.contract===c?' selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Hours / week</label>
        <input type="number" id="sp-hrs-${s.id}" value="${s.contractHrs||0}" min="0"
          onchange="spSaveContractField('${s.id}','contractHrs',+this.value)"
          style="width:100%;padding:7px;border:1.5px solid #d1d5db;border-radius:7px;font:600 12px Lato;color:#1a2b3a">
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Hourly rate (£)</label>
        <input type="number" step="0.01" id="sp-rate-${s.id}" value="${s.hourlyRate||''}"
          onchange="spSaveContractField('${s.id}','hourlyRate',+this.value)"
          placeholder="e.g. 12.50"
          style="width:100%;padding:7px;border:1.5px solid #d1d5db;border-radius:7px;font:600 12px Lato;color:#1a2b3a">
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">Standard shift</label>
        <select id="sp-shift-${s.id}" onchange="spSaveContractField('${s.id}','standardShift',this.value)"
          style="width:100%;padding:7px;border:1.5px solid #d1d5db;border-radius:7px;font:12px Lato;color:#1a2b3a">
          <option value="">— select —</option>
          ${(dept.shifts.length?dept.shifts:['07:00-15:00','08:00-16:00','09:00-17:00','15:00-23:00','23:00-07:00']).map(sh=>`<option value="${sh}"${s.standardShift===sh?' selected':''}>${sh}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Working days checkboxes -->
    <div style="margin-bottom:14px;padding:12px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
      <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">✓ Days they work</div>
      <div style="display:flex;justify-content:space-between;gap:4px">
        ${dayChecks}
      </div>
    </div>

    <!-- This week's shifts -->
    <div style="font-size:11px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">This week's shifts</div>
    ${weekRows}

    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="closeModal()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">✓ Done — saves automatically</button>
    </div>
  </div>`;
  openModal(html);
}

function spToggleWorkDay(staffId, dayIdx, checked){
  const staff=spGetStaff(), s=staff.find(x=>x.id===staffId); if(!s) return;
  if(!s.workDays) s.workDays=[0,0,0,0,0,0,0];
  s.workDays[dayIdx] = checked ? 1 : 0;
  spSaveStaff(staff);
  // Also sync to HosSTAFF profiles
  const profiles=JSON.parse(localStorage.getItem('hs_profiles')||'null');
  if(profiles){
    const p=profiles.find(x=>x.id===staffId);
    if(p){ p.workDays=s.workDays; localStorage.setItem('hs_profiles',JSON.stringify(profiles)); }
  }
}

function spSaveContractField(staffId, field, value){
  const staff=spGetStaff(), s=staff.find(x=>x.id===staffId); if(!s) return;
  s[field]=value;
  if(field==='contractHrs') s.weeklyWage=Math.round(value*(s.hourlyRate||0)*100)/100;
  if(field==='hourlyRate')  s.weeklyWage=Math.round((s.contractHrs||0)*value*100)/100;
  spSaveStaff(staff);
  // Sync to HosSTAFF
  const profiles=JSON.parse(localStorage.getItem('hs_profiles')||'null');
  if(profiles){
    const p=profiles.find(x=>x.id===staffId);
    if(p){ p[field]=value; if(field==='contractHrs'||field==='hourlyRate') p.weeklyWage=s.weeklyWage; localStorage.setItem('hs_profiles',JSON.stringify(profiles)); }
  }
  if(typeof toast==='function') toast('✓ Saved');
}


function spCellSelect(sel){const rota=spGetRota(),k=sel.dataset.dk,sid=sel.dataset.sid;if(!rota[k])rota[k]={};rota[k][sid]=sel.value;spSaveRota(rota);}

function spCreateRotaFromForecast(){
  const fc=spGetFC(),staff=spGetStaff(),rota=spGetRota(),days=spWeekDates(spFcWeekOffset);
  days.forEach(d=>{
    const k=spDK(d),f=fc[k]||{};if(!rota[k])rota[k]={};
    const bk=f.breakfastCovers||Math.round((f.rooms||0)*1.8),din=f.dinnerCovers||0,dep=f.departures||0,stay=f.stayovers||0;
    const needs={reception:3,nights:1,kitchen:Math.max(2,Math.ceil(bk/28)+(din>0?1:0)),restaurant:Math.max(1,Math.ceil(bk/28))+(din>0?Math.ceil(din/7):0),bar:2,housekeeping:Math.max(1,Math.ceil(((dep*0.542)+(stay*0.333))/7.5)),maintenance:1,admin:1};
    SP_DEPTS.forEach(dept=>{
      const deptStaff=staff.filter(s=>s.dept===dept.id),needed=needs[dept.id]||0;
      const sorted=[...deptStaff.filter(s=>s.type==='core'),...deptStaff.filter(s=>s.type!=='core')];
      let assigned=0;
      sorted.forEach(s=>{
        const existing=(rota[k][s.id]||'').toLowerCase();
        if(existing&&existing!=='off'&&existing!=='')return;
        if(assigned<needed&&dept.shifts&&dept.shifts.length>0){rota[k][s.id]=dept.shifts[assigned%dept.shifts.length];assigned++;}
        else if(!rota[k][s.id])rota[k][s.id]='off';
      });
    });
  });
  spSaveRota(rota);spWeekOffset=spFcWeekOffset;
  if(typeof toast==='function')toast('✓ Draft rota created — review in Weekly Rota');
  switchTab('rotaWeek');
}

function spApproveRota(){
  const rota=spGetRota(),staff=spGetStaff(),days=spWeekDates(spWeekOffset);
  const weekLabel=`Week commencing ${spShortFmt(days[0])} – ${spShortFmt(days[6])}`;
  let deptSections='';
  SP_DEPTS.forEach(dept=>{
    const ds=staff.filter(s=>s.dept===dept.id);if(!ds.length)return;
    const rows=ds.map(s=>{const shifts=days.map(d=>{const sh=(rota[spDK(d)]||{})[s.id]||'—';return`<td style="border:1px solid #e0e0e0;padding:5px 4px;text-align:center;font-size:10px;white-space:nowrap;background:${sh.includes(':')?'#f0fdf4':sh==='holiday'?'#eff6ff':'#fff'}">${sh}</td>`;}).join('');const wh=days.reduce((t,d)=>t+spParseHrs((rota[spDK(d)]||{})[s.id]||''),0);return`<tr><td style="border:1px solid #e0e0e0;padding:5px 7px;font-size:11px;font-weight:600">${s.name}</td><td style="border:1px solid #e0e0e0;padding:5px 4px;font-size:10px;color:#374151">${s.role||''}</td>${rows}<td style="border:1px solid #e0e0e0;padding:5px 4px;text-align:center;font-size:11px;font-weight:700">${Math.round(wh*10)/10}h</td></tr>`;}).join('');
    deptSections+=`<div style="margin-bottom:16px;break-inside:avoid"><div style="background:${dept.colour};color:#fff;padding:5px 8px;font-size:11px;font-weight:700;text-transform:uppercase;border-radius:4px 4px 0 0">${dept.name}</div><table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0"><thead><tr style="background:#f5f7f9"><th style="border:1px solid #e0e0e0;padding:5px 7px;font-size:10px;text-align:left">Name</th><th style="border:1px solid #e0e0e0;padding:5px;font-size:10px;text-align:left">Role</th>${days.map(d=>`<th style="border:1px solid #e0e0e0;padding:5px 4px;font-size:10px;text-align:center">${d.toLocaleDateString('en-GB',{weekday:'short'})}<br>${spShortFmt(d)}</th>`).join('')}<th style="border:1px solid #e0e0e0;padding:5px 4px;font-size:10px">Hrs</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  });
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Brandon Hall Rota — ${weekLabel}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#1a2b3a}@media print{@page{size:A3 landscape;margin:10mm}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px"><div><h1 style="font-size:18px;margin:0 0 4px">Brandon Hall Hotel & Spa — Staff Rota</h1><h2 style="font-size:13px;color:#374151;font-weight:400;margin:0">${weekLabel} · Approved ${new Date().toLocaleDateString('en-GB')}</h2></div><div style="text-align:right;font-size:11px;color:#374151">HosPRO HosSHIFT<br>CONFIDENTIAL</div></div>${deptSections}<div style="margin-top:16px;font-size:10px;color:#6b7280">Approved by: _________________ Date: _________________</div><script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
}

function spExportCSV(){
  const rota=spGetRota(),staff=spGetStaff(),days=spWeekDates(spWeekOffset);
  let csv='Name,Role,Department,Staff Code,'+days.map(d=>spFmt(d)).join(',')+',Weekly Hrs\n';
  staff.forEach(s=>{const shifts=days.map(d=>(rota[spDK(d)]||{})[s.id]||'off'),hrs=days.reduce((t,d)=>t+spParseHrs((rota[spDK(d)]||{})[s.id]||''),0);csv+=`"${s.name}","${s.role||''}","${s.dept}","${s.staffCode||''}",`+shifts.map(x=>`"${x}"`).join(',')+`,"${Math.round(hrs*10)/10}"\n`;});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'brandon-hall-rota.csv'});a.click();
}


// ── HosBRAND — Brochures & Downloads ─────────────────────────────────────────
const BH_DOCS = [
  { category: "The Clarendon — Menus",
    colour: "#4a9d7f",
    docs: [
      { title:"Restaurant Menu",              icon:"🍽", file:"clarendon-restaurant-menu.pdf",         desc:"Full à la carte restaurant menu" },
      { title:"Lunch Menu",                   icon:"🥗", file:"clarendon-lunch-menu.pdf",              desc:"Clarendon lunch menu" },
      { title:"Dinner, Bed & Breakfast Menu", icon:"🌙", file:"clarendon-dinner-bed-breakfast-menu.pdf",desc:"DBB package menu" },
      { title:"Wine List",                    icon:"🍷", file:"clarendon-wine-list.pdf",               desc:"Full wine list" },
      { title:"Restaurant & Bar Wine List",   icon:"🥂", file:"clarendon-restaurant-bar-wine-list.pdf",desc:"Restaurant & bar wine selection" },
    ]
  },
];

// Base path for uploaded PDFs — served from GitHub Pages root
const BH_PDF_BASE = "/";

function renderBrandDocs(v){
  // Show breadcrumb
  const bc = document.getElementById("sf-breadcrumb");
  const bcLabel = document.getElementById("sf-bc-module");
  const bcTab   = document.getElementById("sf-bc-tab");
  if(bc){ bc.style.display="flex"; }
  if(bcLabel) bcLabel.textContent = "HosBRAND";
  if(bcTab)   bcTab.textContent   = "Brochures & Downloads";

  v.innerHTML = "";
  v.style.padding = "0";

  const wrap = document.createElement("div");
  wrap.style.cssText = "min-height:100%;background:#1a2b3a;padding:28px";

  // Header
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <div style="width:52px;height:52px;border-radius:14px;background:#2e4156;display:flex;align-items:center;justify-content:center;font-size:26px">📁</div>
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#ffffff">HosBRAND</div>
        <div style="font-size:13px;color:#a9b8c9">Brandon Hall Hotel &amp; Spa — Brochures, Menus &amp; Brand Downloads</div>
      </div>
      <button onclick="switchTab('home')" style="margin-left:auto;padding:9px 18px;background:#fff;border:2px solid #e5e7eb;border-radius:10px;font:600 13px Lato;color:#1a2b3a;cursor:pointer">🏠 Home</button>
    </div>`;

  BH_DOCS.forEach(cat => {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom:28px";
    section.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${cat.colour}">
      <span style="width:10px;height:10px;border-radius:50%;background:${cat.colour};display:inline-block"></span>
      <span style="font-size:13px;font-weight:700;color:#c7d2e0;text-transform:uppercase;letter-spacing:.8px">${cat.category}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${cat.docs.map(doc => `
        <div style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.07);border-left:4px solid ${cat.colour};display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:28px;flex-shrink:0">${doc.icon}</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:#1a2b3a;line-height:1.3">${doc.title}</div>
              <div style="font-size:11px;color:#374151;margin-top:3px">${doc.desc}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:auto">
            <a href="${BH_PDF_BASE}${doc.file}" target="_blank" rel="noopener"
              style="flex:1;padding:8px 12px;background:#1a2b3a;color:#fff;border-radius:8px;font:600 12px Lato;text-decoration:none;text-align:center;display:block">
              👁 View
            </a>
            <a href="${BH_PDF_BASE}${doc.file}" download
              style="flex:1;padding:8px 12px;background:#fff;color:#1a2b3a;border:1.5px solid #1a2b3a;border-radius:8px;font:600 12px Lato;text-decoration:none;text-align:center;display:block">
              ⬇ Download
            </a>
          </div>
        </div>`).join("")}
    </div>`;
    wrap.appendChild(section);
  });

  v.appendChild(wrap);
}

/* ============================================================ HOSSTAFF */

// ── Default annual leave entitlements ────────────────────────────────────────
const HS_LEAVE_DEFAULTS = {
  fullTime: 28,  // days statutory + BH
  partTime: 20,
  zeroHours: 0
};

// ── Storage ───────────────────────────────────────────────────────────────────
function hsGetProfiles()  { return hsGetProfilesSeeded(); }
function hsSaveProfiles(d){ localStorage.setItem('hs_profiles',  JSON.stringify(d)); }
function hsGetLeave()     { return JSON.parse(localStorage.getItem('hs_leave')     || '[]'); }
function hsSaveLeave(d)   { localStorage.setItem('hs_leave',     JSON.stringify(d)); }

function hsBuildDefaultProfiles(){
  // Built from real staff register — SP_STAFF_SEED already has all HR fields
  const shift = spGetStaff ? spGetStaff() : [];
  return shift.map(s => ({
    id: s.id,
    staffCode: s.staffCode || 'BH000',
    name: s.name,
    role: s.role || '',
    dept: s.dept,
    type: s.type,
    contract: s.contract || 'Zero hours',
    contractHrs: s.contractHrs || 0,
    hourlyRate: s.hourlyRate || 0,
    weeklyWage: s.weeklyWage || 0,
    workDays: s.workDays || [0,0,0,0,0,0,0],
    standardShift: s.standardShift || '',
    startDate: s.startDate || '',
    probationPassed: s.probationPassed || false,
    probationDate: '',
    dob: s.dob || '',
    address: s.address || '',
    phone: s.phone || '',
    email: s.email || '',
    emergencyName: s.emergencyName || '',
    emergencyPhone: s.emergencyPhone || '',
    emergencyRel: s.emergencyRel || '',
    niNumber: s.niNumber || '',
    leaveAllowance: s.leaveAllowance || 28,
    leaveUsed: s.leaveUsed || 0,
    leavePending: s.leavePending || 0,
    docs: s.docs || [],
    notes: s.notes || ''
  }));
}

function hsGetProfile(staffCode){
  return hsGetProfiles().find(p => p.staffCode === staffCode || p.id === staffCode);
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderStaffDash(v){
  const profiles = hsGetProfiles();
  const leave = hsGetLeave();
  const pending = leave.filter(l => l.status === 'pending');
  const approved = leave.filter(l => l.status === 'approved');
  const today = new Date().toISOString().slice(0,10);
  const onLeave = approved.filter(l => l.from <= today && l.to >= today);

  const depts = {};
  profiles.forEach(p => { depts[p.dept] = (depts[p.dept]||0)+1; });

  const deptCards = Object.entries(depts).map(([d,n]) => {
    const dept = SP_DEPTS ? SP_DEPTS.find(x=>x.id===d) : null;
    return `<div style="background:#fff;border-radius:10px;padding:12px;border-left:4px solid ${dept?.colour||'#4a86c7'}">
      <div style="font-size:20px;font-weight:700;color:#1a2b3a">${n}</div>
      <div style="font-size:12px;color:#374151">${dept?.name||d}</div>
    </div>`;
  }).join('');

  const pendingRows = pending.slice(0,5).map(l => {
    const p = profiles.find(x=>x.id===l.staffId);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e5e7eb">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1a2b3a">${p?.name||'Unknown'}</div>
        <div style="font-size:11px;color:#374151">${l.from} → ${l.to} · ${l.days} day${l.days!==1?'s':''}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="hsApproveLeave('${l.id}')" style="padding:5px 10px;background:#2a6a4a;color:#fff;border:none;border-radius:6px;font:600 11px Lato;cursor:pointer">✓ Approve</button>
        <button onclick="hsDeclineLeave('${l.id}')" style="padding:5px 10px;background:#b3261e;color:#fff;border:none;border-radius:6px;font:600 11px Lato;cursor:pointer">✗ Decline</button>
      </div>
    </div>`;
  }).join('') || '<div style="padding:12px 0;color:#374151;font-size:13px">No pending requests</div>';

  v.innerHTML = `<div style="padding:20px 28px;max-width:1300px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#ffffff">HosSTAFF Dashboard</div>
        <div style="font-size:13px;color:#a9b8c9">${profiles.length} staff members · ${pending.length} leave requests pending</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="switchTab('staffProfiles')" style="padding:9px 16px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">👤 Staff Profiles</button>
        <button onclick="switchTab('staffLeaveAdmin')" style="padding:9px 16px;background:#c78a3b;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">🌴 Leave Requests ${pending.length>0?'<span style="background:#b3261e;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">'+pending.length+'</span>':''}</button>
        <button onclick="hsAddStaffModal()" style="padding:9px 16px;background:#4a86c7;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">+ Add staff</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
        <div style="font-size:32px;font-weight:700;color:#1a2b3a">${profiles.length}</div>
        <div style="font-size:12px;color:#374151;text-transform:uppercase">Total Staff</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
        <div style="font-size:32px;font-weight:700;color:#c78a3b">${pending.length}</div>
        <div style="font-size:12px;color:#374151;text-transform:uppercase">Pending Leave</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
        <div style="font-size:32px;font-weight:700;color:#2a6a4a">${onLeave.length}</div>
        <div style="font-size:12px;color:#374151;text-transform:uppercase">On Leave Today</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
        <div style="font-size:32px;font-weight:700;color:#4a86c7">${profiles.filter(p=>!p.probationPassed&&p.startDate).length}</div>
        <div style="font-size:12px;color:#374151;text-transform:uppercase">On Probation</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
        <div style="font-size:12px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Pending Leave Requests</div>
        ${pendingRows}
        ${pending.length>5?`<button onclick="switchTab('staffLeaveAdmin')" style="margin-top:8px;padding:6px 12px;border:1px solid #1a2b3a;border-radius:7px;background:#fff;font:600 12px Lato;cursor:pointer;color:#1a2b3a">View all ${pending.length} requests →</button>`:''}
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
        <div style="font-size:12px;font-weight:700;color:#1a2b3a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">By Department</div>
        <div style="display:flex;flex-direction:column;gap:8px">${deptCards}</div>
      </div>
    </div>
  </div>`;
}

// ── STAFF PROFILES ─────────────────────────────────────────────────────────────
function renderStaffProfiles(v){
  const profiles = hsGetProfiles();
  const deptFilter = window._hsDeptFilter || 'all';
  const search = window._hsSearch || '';

  let filtered = profiles;
  if(deptFilter !== 'all') filtered = filtered.filter(p => p.dept === deptFilter);
  if(search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.staffCode.toLowerCase().includes(search.toLowerCase()));

  const depts = SP_DEPTS || [];

  const rows = filtered.map(p => {
    const dept = depts.find(d=>d.id===p.dept)||{name:p.dept,colour:'#4a86c7'};
    const leave = hsGetLeave().filter(l=>l.staffId===p.id);
    const leaveUsed = leave.filter(l=>l.status==='approved').reduce((t,l)=>t+l.days,0);
    const leaveRemaining = Math.max(0, p.leaveAllowance - leaveUsed);
    return `<tr onclick="hsOpenProfile('${p.id}')" style="border-bottom:1px solid #e5e7eb;cursor:pointer" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''">
      <td style="padding:10px 12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:${dept.colour};display:flex;align-items:center;justify-content:center;font:700 12px Lato;color:#fff;flex-shrink:0">${p.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#1a2b3a">${p.name}${p.hrStatus==='not-on-hr'?' <span title="Not on the latest HR export — check if they still work here" style="font-size:10px;padding:1px 6px;border-radius:6px;background:#fff7ed;color:#9a3412;font-weight:700">not on HR export</span>':''}</div>
            <div style="font-size:11px;color:#374151">${p.staffCode}${p.startDate?' · started '+new Date(p.startDate+'T12:00').toLocaleDateString('en-GB'):''}</div>
          </div>
        </div>
      </td>
      <td style="padding:10px 8px;font-size:12px;color:#1a2b3a">${p.role||'—'}</td>
      <td style="padding:10px 8px"><span style="padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600;background:${dept.colour}20;color:${dept.colour}">${dept.name}</span></td>
      <td style="padding:10px 8px"><span style="padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600;background:${p.contract==='Full-time'?'#dcfce7':p.contract==='Part-time'?'#dbeafe':'#fef9c3'};color:${p.contract==='Full-time'?'#166534':p.contract==='Part-time'?'#1d4ed8':'#854d0e'}">${p.contract||'—'}</span></td>
      <td style="padding:10px 8px;font-size:12px;color:#1a2b3a">${p.contractHrs>0?p.contractHrs+'h/wk':'—'}</td>
      <td style="padding:10px 8px;font-size:12px">
        ${p.holOutstandingHrs!=null&&p.holOutstandingHrs!==''?`<div style="font-size:11px;color:#374151">Outstanding: <b style="color:${p.holOutstandingHrs<0?'#b3261e':'#166534'}">${spH(p.holOutstandingHrs)}h</b></div>
        <div style="font-size:10px;color:#374151" title="From the HR Holiday report">taken ${spH(p.holTakenHrs||0)}h · as at ${p.holAsAt?new Date(p.holAsAt+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''}</div>`:`<div style="font-size:11px;color:#374151">Remaining: <b style="color:${leaveRemaining<5?'#b3261e':'#166534'}">${leaveRemaining}d</b></div>
        <div style="font-size:10px;color:#374151">of ${p.leaveAllowance}d</div>`}
      </td>
      <td style="padding:10px 8px">
        ${p.probationPassed?'<span style="padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;background:#dcfce7;color:#166534">✓ Passed</span>':'<span style="padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;background:#fef9c3;color:#854d0e">Probation</span>'}
      </td>
      <td style="padding:10px 8px">
        <div style="display:flex;gap:6px">
          <button onclick="event.stopPropagation();hsOpenProfile('${p.id}')" style="padding:5px 10px;border:1.5px solid #1a2b3a;border-radius:7px;background:#fff;font:600 11px Lato;cursor:pointer;color:#1a2b3a">Edit →</button>
          <button onclick="event.stopPropagation();hsDeleteStaff('${p.id}')" style="padding:5px 10px;border:1.5px solid #fee2e2;border-radius:7px;background:#fff;font:600 11px Lato;cursor:pointer;color:#991b1b">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  v.innerHTML = `<div style="padding:20px;max-width:1200px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#ffffff">Staff Profiles</div>
        <div style="font-size:12px;color:#a9b8c9">${filtered.length} of ${profiles.length} staff members</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="hrRecordsView()" style="padding:9px 16px;background:#7A2E3B;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">${hrUnlocked()?'🔓':'🔐'} Payroll &amp; HR records</button>
        <button onclick="hsImportHRModal()" style="padding:9px 16px;background:#2B726A;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">📤 Import HR export</button>
        <button onclick="xeroEmployeeModal()" style="padding:9px 16px;background:#13B5EA;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">Xero employee file</button>
        <button onclick="hsAddStaffModal()" style="padding:9px 16px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">+ Add staff member</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input type="text" placeholder="🔍 Search name or staff ID..." value="${search}"
        oninput="window._hsSearch=this.value;renderStaffProfiles(document.getElementById('view'))"
        style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a">
      <select onchange="window._hsDeptFilter=this.value;renderStaffProfiles(document.getElementById('view'))"
        style="padding:9px 12px;border:1.5px solid #d1d5db;border-radius:9px;font:13px Lato;color:#1a2b3a">
        <option value="all"${deptFilter==='all'?' selected':''}>All departments</option>
        ${(SP_DEPTS||[]).map(d=>`<option value="${d.id}"${deptFilter===d.id?' selected':''}>${d.name}</option>`).join('')}
      </select>
    </div>

    <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#1a2b3a">
          ${['Staff Member','Role','Department','Contract','Hours','Annual Leave','Status',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${rows||'<tr><td colspan="8" style="padding:20px;text-align:center;color:#374151">No staff found</td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
}

// ── STAFF PROFILE DETAIL ──────────────────────────────────────────────────────
function hsOpenProfile(staffId){
  const profiles = hsGetProfiles();
  const p = profiles.find(x=>x.id===staffId || x.staffCode===staffId);
  if(!p) return;
  const dept = (SP_DEPTS||[]).find(d=>d.id===p.dept)||{name:p.dept,colour:'#4a86c7'};
  const leave = hsGetLeave().filter(l=>l.staffId===p.id);
  const leaveApproved = leave.filter(l=>l.status==='approved').reduce((t,l)=>t+l.days,0);
  const leavePending = leave.filter(l=>l.status==='pending').reduce((t,l)=>t+l.days,0);
  const leaveRemaining = Math.max(0, p.leaveAllowance - leaveApproved);

  const leaveHistory = leave.sort((a,b)=>b.from.localeCompare(a.from)).map(l=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:12px">
      <div>
        <b style="color:#1a2b3a">${l.from} → ${l.to}</b>
        <span style="color:#374151"> · ${l.days} days · ${l.reason||'Annual leave'}</span>
      </div>
      <span style="padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;background:${l.status==='approved'?'#dcfce7':l.status==='declined'?'#fee2e2':'#fef9c3'};color:${l.status==='approved'?'#166534':l.status==='declined'?'#991b1b':'#854d0e'}">${l.status}</span>
    </div>`).join('') || '<div style="color:#374151;font-size:12px;padding:8px 0">No leave history</div>';

  const html = `<div style="max-height:85vh;overflow-y:auto;padding:4px">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div style="width:56px;height:56px;border-radius:50%;background:${dept.colour};display:flex;align-items:center;justify-content:center;font:700 18px Lato;color:#fff;flex-shrink:0">${p.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div>
        <div style="font-size:20px;font-weight:700;color:#1a2b3a">${p.name}</div>
        <div style="font-size:13px;color:#374151">${p.role||''} · <span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:${dept.colour}20;color:${dept.colour}">${dept.name}</span></div>
        <div style="font-size:12px;color:#374151;margin-top:2px">Staff ID: <b>${p.staffCode}</b></div>
      </div>
      <button onclick="closeModal()" style="margin-left:auto;background:none;border:none;font-size:22px;cursor:pointer;color:#374151">✕</button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px">
      ${['Personal','Contract','Leave','Documents','🔐 HR & Bank'].map((tab,i)=>`<button onclick="hsProfileTab(this,'${staffId}',${i})" class="hs-ptab" style="padding:8px 14px;border:none;border-bottom:${i===0?'2px solid #1a2b3a':'2px solid transparent'};background:none;font:${i===0?'700':'500'} 13px Lato;color:${i===0?'#1a2b3a':'#374151'};cursor:pointer;margin-bottom:-2px">${tab}</button>`).join('')}
    </div>

    <!-- Tab 0: Personal -->
    <div id="hs-tab-0">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${[
          ['Date of Birth','dob','date'],['Phone','phone','tel'],['Email','email','email'],
          ['NI Number','niNumber','text'],['Start Date','startDate','date'],['Probation Date','probationDate','date']
        ].map(([label,key,type])=>`<div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">${label}</label>
          <input type="${type}" value="${p[key]||''}" data-field="${key}" data-staffid="${staffId}"
            onchange="hsSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>`).join('')}
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Address</label>
        <textarea data-field="address" data-staffid="${staffId}" onchange="hsSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a;min-height:60px;resize:vertical">${p.address||''}</textarea>
      </div>
      <div style="background:#f0f9ff;border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:#1a2b3a;margin-bottom:8px">Emergency Contact</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          ${[['Name','emergencyName'],['Phone','emergencyPhone'],['Relationship','emergencyRel']].map(([label,key])=>`<div>
            <label style="font-size:11px;color:#374151;display:block;margin-bottom:2px">${label}</label>
            <input value="${p[key]||''}" data-field="${key}" data-staffid="${staffId}" onchange="hsSaveField(this)"
              style="width:100%;padding:7px;border:1.5px solid #d1d5db;border-radius:7px;font:12px Lato;color:#1a2b3a">
          </div>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:6px">Working days</label>
        <div style="display:flex;gap:4px">
          ${[0,1,2,3,4,5,6].map(i=>'<span style="display:inline-block;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;background:'+((p.workDays||[])[i]?'#dcfce7':'#f3f4f6')+';color:'+((p.workDays||[])[i]?'#166534':'#374151')+'">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]+'</span>').join('')}
        </div>
        ${p.standardShift?'<div style="font-size:12px;color:#374151;margin-top:6px">Standard shift: <b>'+p.standardShift+'</b></div>':''}
      </div>
      <!-- Working days checkboxes -->
      <div style="margin-bottom:10px;padding:12px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
        <label style="font-size:10px;font-weight:700;color:#166534;display:block;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">✓ Days they work</label>
        <div style="display:flex;justify-content:space-between;gap:4px">
          ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>`<label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" ${(p.workDays||[])[i]?'checked':''}
              onchange="hsToggleWorkDay('${staffId}',${i},this.checked)"
              style="width:18px;height:18px;accent-color:#2a6a4a;cursor:pointer">
            <span style="font-size:10px;font-weight:700;color:#374151">${day}</span>
          </label>`).join('')}
        </div>
        ${p.standardShift?`<div style="font-size:12px;color:#374151;margin-top:8px">Standard shift: <b style="color:#1a2b3a">${p.standardShift}</b></div>`:''}
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Notes</label>
        <textarea data-field="notes" data-staffid="${staffId}" onchange="hsSaveField(this)"
          style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a;min-height:50px;resize:vertical">${p.notes||''}</textarea>
      </div>
    </div>

    <!-- Tab 1: Contract (hidden) -->
    <div id="hs-tab-1" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${[['Role / Job Title','role','text'],['Standard Shift','standardShift','text']].map(([l,k,t])=>`<div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">${l}</label>
          <input type="text" value="${k==='dept_display'?dept.name:(p[k]||'')}}" ${k==='dept_display'?'disabled':''} data-field="${k}" data-staffid="${staffId}" onchange="hsSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>`).join('')}
        <div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Contract Type</label>
          <select data-field="contract" data-staffid="${staffId}" onchange="hsSaveField(this);hsUpdateLeaveAllowance('${staffId}')"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
            ${['Full-time','Part-time','Zero hours'].map(c=>`<option${p.contract===c?' selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Contract Hours/Week</label>
          <input type="number" value="${p.contractHrs||0}" data-field="contractHrs" data-staffid="${staffId}" onchange="hsSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Hourly Rate (£)</label>
          <input type="number" step="0.01" value="${p.hourlyRate||''}" data-field="hourlyRate" data-staffid="${staffId}" onchange="hsSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Annual Leave Allowance (days)</label>
          <input type="number" value="${p.leaveAllowance||0}" data-field="leaveAllowance" data-staffid="${staffId}" onchange="hsSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Staff Type</label>
          <select data-field="type" data-staffid="${staffId}" onchange="hsSaveField(this)"
            style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
            <option${p.type==='core'?' selected':''}>core</option>
            <option${p.type==='relief'?' selected':''}>relief</option>
          </select>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;background:#f9fafb;border-radius:10px;padding:12px">
        <input type="checkbox" id="hs-prob-${staffId}" ${p.probationPassed?'checked':''} data-field="probationPassed" data-staffid="${staffId}" onchange="hsSaveField(this)"
          style="width:18px;height:18px;accent-color:#2a6a4a">
        <label for="hs-prob-${staffId}" style="font-size:13px;font-weight:600;color:#1a2b3a;cursor:pointer">Probation period passed</label>
        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${p.probationPassed?'#dcfce7':'#fef9c3'};color:${p.probationPassed?'#166534':'#854d0e'}">${p.probationPassed?'✓ Passed':'Pending'}</span>
      </div>
    </div>

    <!-- Tab 2: Leave (hidden) -->
    <div id="hs-tab-2" style="display:none">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        <div style="background:#dcfce7;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#166534">${leaveRemaining}</div>
          <div style="font-size:11px;color:#166534;font-weight:600">Days remaining</div>
        </div>
        <div style="background:#fee2e2;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#991b1b">${leaveApproved}</div>
          <div style="font-size:11px;color:#991b1b;font-weight:600">Days used</div>
        </div>
        <div style="background:#fef9c3;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#854d0e">${leavePending}</div>
          <div style="font-size:11px;color:#854d0e;font-weight:600">Days pending</div>
        </div>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:#1a2b3a;text-transform:uppercase;margin-bottom:8px">Leave History</div>
        ${leaveHistory}
      </div>
      <button onclick="hsManagerLeaveModal('${staffId}')" style="padding:9px 16px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">+ Add leave entry</button>
    </div>

    <!-- Tab 3: Documents (hidden) -->
    <div id="hs-tab-3" style="display:none">
      <div style="background:#f0f9ff;border-radius:10px;padding:16px;text-align:center;margin-bottom:12px">
        <div style="font-size:13px;color:#8fa3b8;margin-bottom:8px">Upload documents for this staff member</div>
        <div style="font-size:11px;color:#374151;margin-bottom:12px">Contract · ID · Right to work · DBS · Certificates</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${['Employment Contract','Photo ID','Right to Work','DBS Certificate','Training Certificate','Other'].map(docType=>`<div style="background:#fff;border:1.5px dashed #d1d5db;border-radius:8px;padding:10px;cursor:pointer;text-align:center" onclick="toast('Document upload — connect to file storage to enable')">
            <div style="font-size:20px;margin-bottom:4px">📄</div>
            <div style="font-size:11px;font-weight:600;color:#1a2b3a">${docType}</div>
            <div style="font-size:10px;color:#374151">Click to upload</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div id="hs-tab-4" style="display:none">${hrProfileSection(p)}</div>
  </div>`;

  openModal(html);
}

function hsProfileTab(btn, staffId, tabIdx){
  document.querySelectorAll('.hs-ptab').forEach((b,i)=>{
    b.style.fontWeight = i===tabIdx?'700':'500';
    b.style.color = i===tabIdx?'#1a2b3a':'#374151';
    b.style.borderBottom = i===tabIdx?'2px solid #1a2b3a':'2px solid transparent';
    const tab = document.getElementById('hs-tab-'+i);
    if(tab) tab.style.display = i===tabIdx?'block':'none';
  });
}

function hsToggleWorkDay(staffId, dayIdx, checked){
  const profiles=hsGetProfiles(), p=profiles.find(x=>x.id===staffId); if(!p) return;
  if(!p.workDays) p.workDays=[0,0,0,0,0,0,0];
  p.workDays[dayIdx] = checked ? 1 : 0;
  hsSaveProfiles(profiles);
  // Sync to HosSHIFT
  const staff=spGetStaff?spGetStaff():[];
  const s=staff.find(x=>x.id===staffId);
  if(s){ s.workDays=p.workDays; if(typeof spSaveStaff==='function') spSaveStaff(staff); }
  toast('Saved ✓');
}

function hsSaveField(input){
  const profiles = hsGetProfiles();
  const p = profiles.find(x=>x.id===input.dataset.staffid);
  if(!p) return;
  const field = input.dataset.field;
  const val = input.type==='checkbox' ? input.checked : (input.type==='number' ? (parseFloat(input.value)||0) : input.value);
  p[field] = val;
  hsSaveProfiles(profiles);
  toast('Saved ✓');
}

function hsUpdateLeaveAllowance(staffId){
  const profiles = hsGetProfiles();
  const p = profiles.find(x=>x.id===staffId); if(!p) return;
  p.leaveAllowance = p.contract==='Full-time' ? 28 : p.contract==='Part-time' ? 20 : 0;
  hsSaveProfiles(profiles);
}

// ── LEAVE ADMIN ───────────────────────────────────────────────────────────────
function renderStaffLeaveAdmin(v){
  const leave = hsGetLeave();
  const profiles = hsGetProfiles();
  const filter = window._hsLeaveFilter || 'pending';

  const filtered = filter==='all' ? leave : leave.filter(l=>l.status===filter);
  const sorted = filtered.sort((a,b)=>b.from.localeCompare(a.from));

  const rows = sorted.map(l=>{
    const p = profiles.find(x=>x.id===l.staffId);
    const dept = (SP_DEPTS||[]).find(d=>d.id===p?.dept)||{name:'',colour:'#4a86c7'};
    // Check for conflicts (same dept on same dates)
    const conflicts = leave.filter(other =>
      other.id !== l.id &&
      other.status !== 'declined' &&
      profiles.find(x=>x.id===other.staffId)?.dept === p?.dept &&
      other.from <= l.to && other.to >= l.from
    );
    return `<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 12px">
        <div style="font-size:13px;font-weight:700;color:#1a2b3a">${p?.name||'Unknown'}</div>
        <div style="font-size:11px;color:#374151">${p?.staffCode||''} · <span style="color:${dept.colour};font-weight:600">${dept.name}</span></div>
      </td>
      <td style="padding:10px 8px;font-size:12px;color:#1a2b3a">${l.from}<br><span style="color:#374151">to ${l.to}</span></td>
      <td style="padding:10px 8px;font-size:13px;font-weight:700;color:#1a2b3a">${l.days}d</td>
      <td style="padding:10px 8px;font-size:12px;color:#374151">${l.reason||'Annual leave'}</td>
      <td style="padding:10px 8px">
        ${conflicts.length>0?`<div style="background:#fef9c3;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;color:#854d0e">⚠ ${conflicts.length} conflict${conflicts.length>1?'s':''} in dept</div>`:'<span style="color:#166534;font-size:11px;font-weight:600">✓ No conflicts</span>'}
      </td>
      <td style="padding:10px 8px">
        <span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${l.status==='approved'?'#dcfce7':l.status==='declined'?'#fee2e2':'#fef9c3'};color:${l.status==='approved'?'#166534':l.status==='declined'?'#991b1b':'#854d0e'}">${l.status}</span>
      </td>
      <td style="padding:10px 8px">
        ${l.status==='pending'?`<div style="display:flex;gap:6px">
          <button onclick="hsApproveLeave('${l.id}')" style="padding:5px 10px;background:#2a6a4a;color:#fff;border:none;border-radius:6px;font:600 11px Lato;cursor:pointer">✓ Approve</button>
          <button onclick="hsDeclineLeave('${l.id}')" style="padding:5px 10px;background:#b3261e;color:#fff;border:none;border-radius:6px;font:600 11px Lato;cursor:pointer">✗ Decline</button>
        </div>`:'<span style="font-size:11px;color:#374151">Processed</span>'}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#374151;font-size:13px">No ${filter} leave requests</td></tr>`;

  v.innerHTML = `<div style="padding:20px 28px;max-width:1300px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#ffffff">Leave Management</div>
        <div style="font-size:12px;color:#a9b8c9">${leave.filter(l=>l.status==='pending').length} pending · ${leave.filter(l=>l.status==='approved').length} approved</div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${['pending','approved','declined','all'].map(f=>`<button onclick="window._hsLeaveFilter='${f}';renderStaffLeaveAdmin(document.getElementById('view'))"
          style="padding:7px 12px;border:1.5px solid ${filter===f?'#1a2b3a':'#d1d5db'};border-radius:8px;background:${filter===f?'#1a2b3a':'#fff'};color:${filter===f?'#fff':'#1a2b3a'};font:600 12px Lato;cursor:pointer">
          ${f.charAt(0).toUpperCase()+f.slice(1)}${f==='pending'&&leave.filter(l=>l.status==='pending').length>0?' ('+leave.filter(l=>l.status==='pending').length+')':''}
        </button>`).join('')}
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#1a2b3a">
          ${['Staff Member','Dates','Days','Reason','Conflicts','Status','Action'].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function hsApproveLeave(leaveId){
  const leave = hsGetLeave();
  const l = leave.find(x=>x.id===leaveId); if(!l) return;
  l.status = 'approved'; l.approvedBy = SESSION?._key||'manager'; l.approvedAt = new Date().toISOString().slice(0,10);
  hsSaveLeave(leave); toast('Leave approved ✓');
  renderStaffLeaveAdmin(document.getElementById('view'));
}
function hsDeclineLeave(leaveId){
  const leave = hsGetLeave();
  const l = leave.find(x=>x.id===leaveId); if(!l) return;
  l.status = 'declined'; l.declinedAt = new Date().toISOString().slice(0,10);
  hsSaveLeave(leave); toast('Leave declined');
  renderStaffLeaveAdmin(document.getElementById('view'));
}

function hsManagerLeaveModal(staffId){
  const html=`<div style="padding:4px">
    <div style="font-size:18px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add Leave Entry</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">From</label>
          <input type="date" id="hs-ml-from" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
        <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">To</label>
          <input type="date" id="hs-ml-to" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      </div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Reason</label>
        <select id="hs-ml-reason" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
          <option>Annual leave</option><option>Sick leave</option><option>Compassionate</option><option>Training</option><option>Other</option>
        </select></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="hsDoManagerLeave('${staffId}')" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Save entry</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`;
  openModal(html);
}

function hsDoManagerLeave(staffId){
  const from=document.getElementById('hs-ml-from')?.value;
  const to=document.getElementById('hs-ml-to')?.value;
  if(!from||!to){ toast('Please select dates'); return; }
  const days=Math.max(1,Math.round((new Date(to)-new Date(from))/(1000*60*60*24))+1);
  const leave=hsGetLeave();
  leave.push({id:'lv'+Date.now(),staffId,from,to,days,reason:document.getElementById('hs-ml-reason')?.value||'Annual leave',status:'approved',approvedBy:'manager',approvedAt:new Date().toISOString().slice(0,10)});
  hsSaveLeave(leave);
  closeModal(); toast('Leave entry saved ✓');
}

// ── ADD STAFF FROM HosSTAFF ────────────────────────────────────────────────────
function hsDeleteStaff(staffId){
  const profiles=hsGetProfiles(), p=profiles.find(x=>x.id===staffId);
  if(!p) return;
  if(!confirm('Remove '+p.name+' from all records? This cannot be undone.')) return;
  // Remove from HosSTAFF
  hsSaveProfiles(profiles.filter(x=>x.id!==staffId));
  // Remove from HosSHIFT
  if(typeof spGetStaff==='function'){
    const staff=spGetStaff();
    if(typeof spSaveStaff==='function') spSaveStaff(staff.filter(s=>s.id!==staffId));
  }
  // Remove leave records
  const leave=hsGetLeave();
  hsSaveLeave(leave.filter(l=>l.staffId!==staffId));
  // Remove from rota
  if(typeof spGetRota==='function'){
    const rota=spGetRota();
    Object.keys(rota).forEach(dk=>{ if(rota[dk]&&rota[dk][staffId]) delete rota[dk][staffId]; });
    if(typeof spSaveRota==='function') spSaveRota(rota);
  }
  toast('✓ '+p.name+' removed');
  renderStaffProfiles(document.getElementById('view'));
}

function hsAddStaffModal(){
  const deptOpts=(SP_DEPTS||[]).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  const html=`<div style="padding:4px">
    <div style="font-size:18px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add Staff Member</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      ${[
        ['Full name','hs-n','text'],['Role / Job title','hs-r','text'],
        ['Email','hs-e','email'],['Phone','hs-ph','tel'],
        ['Start date','hs-sd','date'],['Date of birth','hs-dob','date'],
      ].map(([l,id,t])=>`<div${id==='hs-n'?' style="grid-column:span 2"':''}>
        <label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">${l}</label>
        <input type="${t}" id="${id}" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
      </div>`).join('')}
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Department</label>
        <select id="hs-d" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">${deptOpts}</select></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Contract</label>
        <select id="hs-c" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a">
          <option>Full-time</option><option>Part-time</option><option>Zero hours</option>
        </select></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Contract hrs/wk</label>
        <input type="number" id="hs-h" value="0" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px">Hourly rate (£)</label>
        <input type="number" id="hs-hr" step="0.01" style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:7px;font:13px Lato;color:#1a2b3a"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="hsDoAddStaff()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Add to HosSTAFF</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`;
  openModal(html);
}

function hsDoAddStaff(){
  const name=document.getElementById('hs-n')?.value?.trim();
  if(!name){toast('Please enter a name');return;}
  const profiles=hsGetProfiles();
  const id='staff_'+Date.now();
  const contract=document.getElementById('hs-c')?.value||'Zero hours';
  const newP={
    id, staffCode:'BH'+String(profiles.length+1).padStart(3,'0'),
    name, role:document.getElementById('hs-r')?.value||'',
    dept:document.getElementById('hs-d')?.value||'admin',
    email:document.getElementById('hs-e')?.value||'',
    phone:document.getElementById('hs-ph')?.value||'',
    dob:document.getElementById('hs-dob')?.value||'',
    startDate:document.getElementById('hs-sd')?.value||'',
    contract, type:'core',
    contractHrs:parseInt(document.getElementById('hs-h')?.value)||0,
    hourlyRate:parseFloat(document.getElementById('hs-hr')?.value)||0,
    leaveAllowance:contract==='Full-time'?28:contract==='Part-time'?20:0,
    leaveUsed:0,leavePending:0,probationPassed:false,
    probationDate:'',niNumber:'',address:'',
    emergencyName:'',emergencyPhone:'',emergencyRel:'',
    docs:[],notes:''
  };
  profiles.push(newP);
  // Also add to HosSHIFT staff
  const shiftStaff=spGetStaff();
  shiftStaff.push({id,name,role:newP.role,dept:newP.dept,type:'core',contractHrs:newP.contractHrs,hourlyRate:newP.hourlyRate});
  spSaveStaff(shiftStaff);
  hsSaveProfiles(profiles);
  closeModal(); toast('✓ '+name+' added to HosSTAFF');
  renderStaffProfiles(document.getElementById('view'));
}

// Wire render functions
function renderStaffLeave(v){ renderStaffLeaveAdmin(v); }
function renderStaffDocs(v){
  v.innerHTML=`<div style="padding:20px;max-width:800px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#ffffff;margin-bottom:8px">Documents</div>
    <div style="font-size:13px;color:#a9b8c9;margin-bottom:16px">Open a staff profile to upload and manage their documents</div>
    <button onclick="switchTab('staffProfiles')" style="padding:9px 16px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:600 13px Lato;cursor:pointer">← Staff Profiles</button>
  </div>`;
}


// ── HosBRAND — Logos, Photography, Collateral sub-sections ────────────────────

function renderBrandLogos(v){
  v.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:28px;min-height:100%';
  wrap.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">Logos & Brand Assets</div>
      <div style="font-size:13px;color:#8fa3b8">Official Brandon Hall Hotel & Spa brand assets — use approved versions only</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
      ${[
        {title:'Primary Logo — Dark',      desc:'Navy on white · For all print and digital use',              file:'bh-logo.svg',  preview:'🏨'},
        {title:'Primary Logo — Light',     desc:'White on dark · For dark backgrounds',                       file:'bh-logo.svg',  preview:'🏨'},
        {title:'BH Monogram',              desc:'Icon mark only · For social media & app icons',              file:'',             preview:'🔷'},
        {title:'Colour Palette',           desc:'Brand colours: Navy #1A2B3A · Gold #C78A3B · Cream',         file:'',             preview:'🎨'},
        {title:'Brand Guidelines PDF',     desc:'Full brand guidelines — typography, colour, usage rules',    file:'',             preview:'📋'},
        {title:'Email Signature',          desc:'Standard email signature template for all team members',     file:'',             preview:'✉️'},
      ].map(item => `<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px">
        <div style="width:52px;height:52px;border-radius:12px;background:rgba(199,138,59,.2);border:1px solid rgba(199,138,59,.3);display:flex;align-items:center;justify-content:center;font-size:26px">${item.preview}</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#fff">${item.title}</div>
          <div style="font-size:11px;color:#8fa3b8;margin-top:4px;line-height:1.5">${item.desc}</div>
        </div>
        ${item.file ? `<div style="display:flex;gap:8px"><a href="/${item.file}" target="_blank" style="flex:1;padding:7px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:7px;font:600 11px Lato;color:#fff;text-decoration:none;text-align:center">👁 View</a><a href="/${item.file}" download style="flex:1;padding:7px;background:#c78a3b;border:none;border-radius:7px;font:600 11px Lato;color:#fff;text-decoration:none;text-align:center">⬇ Download</a></div>` : `<div style="padding:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:7px;font:11px Lato;color:#8fa3b8;text-align:center">Upload via GitHub to enable download</div>`}
      </div>`).join('')}
    </div>`;
  v.appendChild(wrap);
}

function renderBrandPhotography(v){
  v.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:28px;min-height:100%';
  wrap.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">Photography Library</div>
      <div style="font-size:13px;color:#8fa3b8">Approved hotel photography — bedrooms, venue, gardens, dining, spa</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
      ${['Exterior & Gardens','Bedrooms & Suites','Event Spaces','The Clarendon Restaurant','Spa & Wellness','Weddings & Events','Aerial Photography','Team & Service'].map(cat => `
        <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;cursor:pointer;transition:all .15s"
          onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='rgba(255,255,255,.06)'">
          <div style="font-size:32px;margin-bottom:10px">📷</div>
          <div style="font-size:13px;font-weight:700;color:#fff">${cat}</div>
          <div style="font-size:11px;color:#8fa3b8;margin-top:4px">Upload images to enable library</div>
        </div>`).join('')}
    </div>
    <div style="margin-top:20px;padding:16px;background:rgba(199,138,59,.1);border:1px solid rgba(199,138,59,.3);border-radius:10px">
      <div style="font-size:12px;font-weight:700;color:#c78a3b;margin-bottom:4px">📤 To add photography</div>
      <div style="font-size:12px;color:#8fa3b8">Upload approved hotel images to the GitHub repo in a /photos folder. Contact your HosPRO administrator to enable the image library.</div>
    </div>`;
  v.appendChild(wrap);
}

function renderBrandCollateral(v){
  v.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:28px;min-height:100%';

  const BH_COLLATERAL = [
    { category:"Events & Celebrations", colour:"#8b5c8f", docs:[
      {title:"Party Packages 2026",         icon:"🎉", file:"party-packages-2026.pdf",               desc:"Full event party packages with pricing"},
      {title:"Baby Shower Packages 2026",   icon:"👶", file:"baby-shower-packages-2026.pdf",          desc:"£29.00–£37.50 pp · Private room hire included"},
      {title:"Celebration of Life 2026",    icon:"🕊", file:"celebration-of-life-packages-2026.pdf",  desc:"Warm & respectful · £27.50–£33.00 pp"},
      {title:"Masonic Events 2026",         icon:"🔷", file:"masonic-packages-2026.pdf",              desc:"Masonic gathering packages"},
    ]},
    { category:"Weddings", colour:"#c85c6b", docs:[
      {title:"Weddings 2026",               icon:"💍", file:"wedding-brochure-2026.pdf",              desc:"Full wedding brochure 2026–2027"},
      {title:"Self-Catering Weddings 2026", icon:"🏡", file:"self-catering-wedding-brochure-2026.pdf",desc:"Your venue, your caterer, your way"},
    ]},
    { category:"Meetings & Events", colour:"#2f6f9e", docs:[
      {title:"Meetings & Events Guide",     icon:"🤝", file:"meetings-and-events.pdf",               desc:"Full meetings and events guide"},
    ]},
  ];

  wrap.innerHTML = `<div style="margin-bottom:24px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">Collateral & Brochures</div>
    <div style="font-size:13px;color:#8fa3b8">All event packages, brochures and downloadable sales collateral</div>
  </div>`;

  BH_COLLATERAL.forEach(cat => {
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-bottom:24px';
    sec.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.1)">
      <span style="width:10px;height:10px;border-radius:50%;background:${cat.colour};display:inline-block"></span>
      <span style="font-size:12px;font-weight:700;color:#c7d2e0;text-transform:uppercase;letter-spacing:.8px">${cat.category}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${cat.docs.map(doc => `<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:18px;border-left:3px solid ${cat.colour};display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:26px;flex-shrink:0">${doc.icon}</span>
          <div><div style="font-size:13px;font-weight:700;color:#fff">${doc.title}</div><div style="font-size:11px;color:#8fa3b8;margin-top:3px">${doc.desc}</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/${doc.file}" target="_blank" style="flex:1;padding:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:7px;font:600 11px Lato;color:#fff;text-decoration:none;text-align:center">👁 View</a>
          <a href="/${doc.file}" download style="flex:1;padding:8px;background:#c78a3b;border:none;border-radius:7px;font:600 11px Lato;color:#fff;text-decoration:none;text-align:center">⬇ Download</a>
        </div>
      </div>`).join('')}
    </div>`;
    wrap.appendChild(sec);
  });
  v.appendChild(wrap);
}


/* ============================================================ HosHUB — Document Hub */

const HUB_CATEGORIES = {
  hubContracts: { label:'Contracts & Agreements', icon:'📝', colour:'#8b5c8f',
    types:['Venue contracts','Event agreements','Service level agreements','Supplier contracts','NDAs','Partnership agreements'] },
  hubSuppliers:  { label:'Supplier Agreements', icon:'🏭', colour:'#c45c00',
    types:['Food & beverage suppliers','Linen & laundry','Maintenance contractors','IT & systems','Cleaning services','Utilities'] },
  hubFinance:    { label:'Finance Documents', icon:'💰', colour:'#2f6f9e',
    types:['Invoices','Purchase orders','Monthly P&L reports','Budget plans','Bank statements','Tax documents'] },
  hubHR:         { label:'HR Documents', icon:'👤', colour:'#4a86c7',
    types:['Staff handbook','HR policies','Disciplinary records','Training certificates','Right to work checks','Appraisal records'] },
};

function renderHubDocs(v){
  v.innerHTML=''; v.style.padding='0';
  const saved = JSON.parse(localStorage.getItem('hoshub_docs')||'[]').filter(d=>hpCanTab(d.tab));
  const search = window._hubSearch||'';
  const filtered = search ? saved.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())||d.category.toLowerCase().includes(search.toLowerCase())) : saved;

  const html=`<div style="padding:28px;min-height:100%">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#fff">HosHUB</div>
        <div style="font-size:13px;color:#8fa3b8">Document management · ${saved.length} documents filed</div>
      </div>
      <button onclick="hubUploadModal()" style="padding:9px 18px;background:#4a9d7f;color:#fff;border:none;border-radius:9px;font:700 13px Lato;cursor:pointer">+ File document</button>
    </div>
    <input type="text" placeholder="🔍 Search documents..." value="${search}"
      oninput="window._hubSearch=this.value;renderHubDocs(document.getElementById('view'))"
      style="width:100%;padding:11px 14px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);border-radius:10px;font:13px Lato;color:#fff;outline:none;margin-bottom:20px">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px">
      ${Object.entries(HUB_CATEGORIES).filter(([tab])=>hpCanTab(tab)).map(([tab,cat])=>{
        const count=saved.filter(d=>d.tab===tab).length;
        return `<button onclick="switchTab('${tab}')"
          style="display:flex;align-items:center;gap:12px;padding:16px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;cursor:pointer;text-align:left;transition:all .15s;width:100%"
          onmouseover="this.style.background='rgba(255,255,255,.12)';this.style.borderColor='${cat.colour}'"
          onmouseout="this.style.background='rgba(255,255,255,.06)';this.style.borderColor='rgba(255,255,255,.1)'">
          <span style="font-size:28px">${cat.icon}</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">${cat.label}</div>
            <div style="font-size:11px;color:#8fa3b8;margin-top:2px">${count} document${count!==1?'s':''}</div>
          </div>
        </button>`;
      }).join('')}
    </div>
    ${filtered.length>0?`
    <div style="font-size:11px;font-weight:700;color:#8fa3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Recent documents</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${filtered.slice(0,20).map(d=>`<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:10px">
        <span style="font-size:22px">${HUB_CATEGORIES[d.tab]?.icon||'📄'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</div>
          <div style="font-size:11px;color:#8fa3b8;margin-top:2px">${HUB_CATEGORIES[d.tab]?.label||d.category} · ${d.type||''} · ${d.date||''}</div>
        </div>
        <span style="font-size:11px;color:#4a9d7f;font-weight:700;white-space:nowrap">Filed</span>
      </div>`).join('')}
    </div>`:'<div style="text-align:center;padding:40px 20px"><div style="font-size:48px;margin-bottom:12px">📂</div><div style="font-size:15px;color:#8fa3b8">No documents filed yet</div><div style="font-size:13px;color:#5a7082;margin-top:6px">Click + File document to add your first document</div></div>'}
  </div>`;
  v.innerHTML=html;
}

function renderHubSection(v, tabId){
  v.innerHTML=''; v.style.padding='0';
  const cat = HUB_CATEGORIES[tabId];
  if(!cat){ v.innerHTML='<div style="padding:28px;color:#fff">Section not found</div>'; return; }
  const saved = JSON.parse(localStorage.getItem('hoshub_docs')||'[]').filter(d=>d.tab===tabId);

  v.innerHTML=`<div style="padding:28px;min-height:100%">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#fff">${cat.icon} ${cat.label}</div>
        <div style="font-size:13px;color:#8fa3b8">${saved.length} document${saved.length!==1?'s':''} filed</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="switchTab('hubDocs')" style="padding:8px 14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;font:600 12px Lato;color:#fff;cursor:pointer">← All documents</button>
        <button onclick="hubUploadModal('${tabId}')" style="padding:8px 16px;background:#4a9d7f;color:#fff;border:none;border-radius:8px;font:700 12px Lato;cursor:pointer">+ Add document</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px">
      ${cat.types.map(type=>{
        const count=saved.filter(d=>d.type===type).length;
        return `<div style="padding:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:10px;cursor:pointer"
          onclick="hubUploadModal('${tabId}','${type}')">
          <div style="font-size:12px;font-weight:700;color:#fff">${type}</div>
          <div style="font-size:11px;color:#8fa3b8;margin-top:3px">${count} filed · + Add</div>
        </div>`;
      }).join('')}
    </div>
    ${saved.length>0?`<div style="display:flex;flex-direction:column;gap:8px">
      ${saved.map(d=>`<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:10px">
        <span style="font-size:24px">📄</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#fff">${d.name}</div>
          <div style="font-size:11px;color:#8fa3b8;margin-top:2px">${d.type||''} · Filed ${d.date||''} ${d.notes?'· '+d.notes:''}</div>
        </div>
        <button onclick="hubDeleteDoc('${d.id}')" style="padding:4px 10px;border:1px solid rgba(239,68,68,.4);border-radius:6px;background:transparent;font:600 11px Lato;color:#f87171;cursor:pointer">Remove</button>
      </div>`).join('')}
    </div>`:'<div style="text-align:center;padding:30px;color:#8fa3b8;font-size:13px">No documents in this section yet</div>'}
  </div>`;
}

function renderHubContracts(v){ renderHubSection(v,'hubContracts'); }
function renderHubSuppliers(v) { renderHubSection(v,'hubSuppliers');  }
function renderHubFinance(v)   { renderHubSection(v,'hubFinance');    }
function renderHubHR(v)        { renderHubSection(v,'hubHR');         }

function hubUploadModal(tabId, preType){
  const cat = tabId ? HUB_CATEGORIES[tabId] : null;
  const tabOpts = Object.entries(HUB_CATEGORIES).map(([k,c])=>`<option value="${k}"${tabId===k?' selected':''}>${c.label}</option>`).join('');
  const typeOpts = cat ? cat.types.map(t=>`<option value="${t}"${preType===t?' selected':''}>${t}</option>`).join('') : '';

  openModal(`<div style="padding:4px">
    <div style="font-size:18px;font-weight:700;color:#1a2b3a;margin-bottom:14px">📂 File a document</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Document name</label>
        <input type="text" id="hub-name" placeholder="e.g. Sodexo Supply Agreement 2026" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a"></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Category</label>
        <select id="hub-tab" onchange="hubUpdateTypes(this.value)" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a">
          <option value="">— Select category —</option>${tabOpts}
        </select></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Document type</label>
        <select id="hub-type" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a">
          <option value="">— Select type —</option>${typeOpts}
        </select></div>
      <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Notes (optional)</label>
        <input type="text" id="hub-notes" placeholder="e.g. Expires Dec 2027 · Review Q3" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a"></div>
      <div style="padding:10px;background:#f9fafb;border-radius:8px;border:1.5px dashed #d1d5db;text-align:center;cursor:pointer" onclick="toast('File upload: connect Google Drive or SharePoint to enable cloud storage')">
        <div style="font-size:22px;margin-bottom:4px">📤</div>
        <div style="font-size:12px;font-weight:600;color:#374151">Click to attach file</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">PDF, Word, Excel · Connect cloud storage to enable</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button onclick="hubSaveDoc()" style="flex:1;padding:11px;background:#4a9d7f;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">✓ File document</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div>
  </div>`);
}

function hubUpdateTypes(tabId){
  const cat = HUB_CATEGORIES[tabId];
  const sel = document.getElementById('hub-type');
  if(!sel) return;
  sel.innerHTML = '<option value="">— Select type —</option>' + (cat?cat.types.map(t=>`<option value="${t}">${t}</option>`).join(''):'');
}

function hubSaveDoc(){
  const name  = document.getElementById('hub-name')?.value.trim();
  const tab   = document.getElementById('hub-tab')?.value;
  const type  = document.getElementById('hub-type')?.value;
  const notes = document.getElementById('hub-notes')?.value.trim();
  if(!name||!tab){ toast('Please enter a name and category'); return; }
  const docs = JSON.parse(localStorage.getItem('hoshub_docs')||'[]');
  docs.push({ id:'hub'+Date.now(), name, tab, type, notes, date:new Date().toLocaleDateString('en-GB') });
  localStorage.setItem('hoshub_docs', JSON.stringify(docs));
  closeModal(); toast('✓ Document filed in HosHUB');
  const current = document.getElementById('view');
  if(current) renderHubDocs(current);
}

function hubDeleteDoc(docId){
  if(!confirm('Remove this document record?')) return;
  const docs = JSON.parse(localStorage.getItem('hoshub_docs')||'[]').filter(d=>d.id!==docId);
  localStorage.setItem('hoshub_docs', JSON.stringify(docs));
  const current = document.getElementById('view');
  if(current) renderHubDocs(current);
  toast('Document removed');
}


// ── STUB RENDERERS — sections under development ───────────────────────────────
function renderQuotes(v){
  v.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='padding:28px;min-height:100%;background:#f0f4f8';
  wrap.innerHTML=`
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a;margin-bottom:6px">Quotes & Proposals</div>
    <div style="font-size:13px;color:#374151;margin-bottom:24px">Create and manage event quotes and proposals</div>
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
      <div style="font-size:48px;margin-bottom:12px">📄</div>
      <div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:8px">Quote Builder</div>
      <div style="font-size:13px;color:#374151;margin-bottom:20px">Build event and meeting quotes directly from the HosSALES module.<br>Use the Quote Builder in HosSTUDIO for instant PDF quotes.</div>
      <button onclick="switchTab('quote')" style="padding:10px 22px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Open Quote Builder →</button>
    </div>`;
  v.appendChild(wrap);
}

function renderPreCheckin(v){
  v.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='padding:28px;min-height:100%;background:#f0f4f8';
  const list=JSON.parse(localStorage.getItem('bh_precheckins')||'[]');
  wrap.innerHTML=`
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a;margin-bottom:6px">Pre Check-in Setup</div>
    <div style="font-size:13px;color:#374151;margin-bottom:20px">Corporate guest pre check-in preferences and requirements</div>
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700;color:#1a2b3a">${list.length} pre check-in profiles</div>
        <button onclick="preCheckinAdd()" style="padding:8px 16px;background:#1a2b3a;color:#fff;border:none;border-radius:8px;font:700 12px Lato;cursor:pointer">+ Add profile</button>
      </div>
      ${list.length?list.map(p=>`<div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:13px;font-weight:700;color:#1a2b3a">${p.company}</div>
        <div style="font-size:11px;color:#374151">${p.guest||''} · ${p.room||''} · ${p.notes||''}</div></div>
        <button onclick="preCheckinDelete('${p.id}')" style="padding:4px 10px;border:1px solid #fee2e2;border-radius:6px;background:#fff;font:600 11px Lato;color:#991b1b;cursor:pointer">✕</button>
      </div>`).join(''):'<div style="text-align:center;padding:24px;color:#374151;font-size:13px">No pre check-in profiles yet — add corporate guest preferences above</div>'}
    </div>`;
  v.appendChild(wrap);
}
function preCheckinAdd(){
  openModal(`<div style="padding:4px"><div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:14px">Add pre check-in profile</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${[['Company','pc-co','text'],['Guest name','pc-guest','text'],['Room type preference','pc-room','text'],['Special requirements','pc-notes','text']].map(([l,id,t])=>`
        <div><label style="font-size:11px;font-weight:700;color:#1a2b3a;display:block;margin-bottom:3px;text-transform:uppercase">${l}</label>
        <input type="${t}" id="${id}" style="width:100%;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a"></div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="preCheckinSave()" style="flex:1;padding:11px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Save</button>
      <button onclick="closeModal()" style="padding:11px 16px;border:1.5px solid #d1d5db;border-radius:9px;background:#fff;font:14px Lato;color:#1a2b3a;cursor:pointer">Cancel</button>
    </div></div>`);
}
function preCheckinSave(){
  const list=JSON.parse(localStorage.getItem('bh_precheckins')||'[]');
  list.push({id:'pc'+Date.now(),company:document.getElementById('pc-co')?.value||'',guest:document.getElementById('pc-guest')?.value||'',room:document.getElementById('pc-room')?.value||'',notes:document.getElementById('pc-notes')?.value||''});
  localStorage.setItem('bh_precheckins',JSON.stringify(list));
  closeModal(); renderPreCheckin(document.getElementById('view')); toast('Saved ✓');
}
function preCheckinDelete(id){
  const list=JSON.parse(localStorage.getItem('bh_precheckins')||'[]').filter(p=>p.id!==id);
  localStorage.setItem('bh_precheckins',JSON.stringify(list));
  renderPreCheckin(document.getElementById('view'));
}

function renderBrochure(v){
  v.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='padding:28px;min-height:100%;background:#f0f4f8';
  wrap.innerHTML=`
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a;margin-bottom:6px">Brochure Builder</div>
    <div style="font-size:13px;color:#374151;margin-bottom:24px">Create and customise sales brochures and event collateral</div>
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
      <div style="font-size:48px;margin-bottom:12px">📑</div>
      <div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:8px">Custom Brochure Builder</div>
      <div style="font-size:13px;color:#374151;margin-bottom:8px">Download ready-made brochures from HosBRAND, or use this builder to create custom materials.</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
        <button onclick="switchTab('brandCollateral')" style="padding:10px 18px;background:#8b5c8f;color:#fff;border:none;border-radius:9px;font:700 13px Lato;cursor:pointer">📄 Event Brochures</button>
        <button onclick="switchTab('brandDocs')" style="padding:10px 18px;background:#4a9d7f;color:#fff;border:none;border-radius:9px;font:700 13px Lato;cursor:pointer">🍷 Menus & Wine Lists</button>
      </div>
    </div>`;
  v.appendChild(wrap);
}

function renderMenu(v){
  v.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='padding:28px;min-height:100%;background:#f0f4f8';
  wrap.innerHTML=`
    <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1a2b3a;margin-bottom:6px">Menu Builder</div>
    <div style="font-size:13px;color:#374151;margin-bottom:24px">Manage menus and F&B collateral</div>
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🍽</div>
      <div style="font-size:16px;font-weight:700;color:#1a2b3a;margin-bottom:8px">Clarendon Menus</div>
      <div style="font-size:13px;color:#374151;margin-bottom:16px">View and download all current Clarendon menus and wine lists from HosBRAND.</div>
      <button onclick="switchTab('brandDocs')" style="padding:10px 22px;background:#1a2b3a;color:#fff;border:none;border-radius:9px;font:700 14px Lato;cursor:pointer">Open Menus & Wine Lists →</button>
    </div>`;
  v.appendChild(wrap);
}

/* ============================================================
   SAFETY FALLBACKS — helpers referenced by render functions that
   live in optional/legacy script files. Defined only if missing,
   so a missing file can no longer black-screen a tab.
   ============================================================ */
if(typeof window.feedbackURL!=="function"){
  window.feedbackURL=function(){
    return location.href.split("#")[0].replace(/index\.html$/,"").replace(/\/$/,"")+"/feedback.html";
  };
}
if(typeof window.restaurantSVG!=="function"){
  window.restaurantSVG=function(area){
    const t=(area&&area.tables)||[]; if(!t.length) return "";
    const CW=120, RH=96, PAD=24;
    const cols=Math.max(...t.map(x=>x.c))+1, rows=Math.max(...t.map(x=>x.r))+1;
    const W=cols*CW+PAD*2+(cols>3?30:0), H=rows*RH+PAD*2;
    const gx=c=>PAD+c*CW+(c>=3?30:0)+CW/2, gy=r=>PAD+r*RH+RH/2;
    const shapes=t.map(x=>{
      const cx=gx(x.c), cy=gy(x.r), fill=x.buffet?"#f3e7d7":"#ffffff", stroke="#1a2b3a";
      let tbl;
      if(x.shape==="round") tbl=`<circle cx="${cx}" cy="${cy}" r="24" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
      else if(x.shape==="long") tbl=`<rect x="${cx-44}" y="${cy-20}" width="88" height="40" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
      else tbl=`<rect x="${cx-22}" y="${cy-22}" width="44" height="44" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
      return `${tbl}<text x="${cx}" y="${cy-2}" text-anchor="middle" font-family="Lato,sans-serif" font-size="12" font-weight="700" fill="#1a2b3a">${x.n}</text>
        <text x="${cx}" y="${cy+12}" text-anchor="middle" font-family="Lato,sans-serif" font-size="9.5" fill="#6b7280">${x.seats} seats</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;background:#f8f9fb;border:1px solid #e5e7eb;border-radius:10px" role="img" aria-label="${area.name} seating plan">${shapes}</svg>`;
  };
}

/* ============================================================
   HosFIX JOB SYNC (read-only) — the HosFIX staff app now stores jobs in
   Firestore (hosfix_jobs). Mirror them into localStorage so the
   HosOPS maintenance tabs and the home panel show every job,
   not just jobs logged on this device. Uses a separate named
   Firebase app so it never clashes with firebase-config.js.
   ============================================================ */
/* Clean start for HosFIX: jobs logged before 11:00 UK on 10 Oct 2026 are ignored and cleared from this computer */
const HP_FIX_CLEAN_FROM='2026-10-10T10:00:00.000Z';
function hpOldJob(j){ return !j || !(String(j.createdAt||'')>=HP_FIX_CLEAN_FROM); }
try{ const l=JSON.parse(localStorage.getItem("hosfix_jobs")||"[]"); const k=l.filter(j=>!hpOldJob(j)); if(k.length!==l.length) localStorage.setItem("hosfix_jobs",JSON.stringify(k)); }catch(e){}
(function hosfixJobSync(){
  if(HP_FIXRAY_MODE) return;   // old HosFIX data hidden while FixRay is in use
  try{
    if(typeof firebase==="undefined" || !firebase.initializeApp || !firebase.firestore) return;
    const cfg={ apiKey:"AIzaSyDnPWrPGInDRTCF1Go710XC_8_77l_72i0", authDomain:"brandonhall-7bdef.firebaseapp.com",
      projectId:"brandonhall-7bdef", storageBucket:"brandonhall-7bdef.firebasestorage.app",
      messagingSenderId:"391317900568", appId:"1:391317900568:web:643c9d6691f7f16d65226d" };
    const app=(firebase.apps||[]).find(a=>a.name==="hosfix") || firebase.initializeApp(cfg,"hosfix");
    const stamp=j=>j.updatedAt||j.completedAt||j.createdAt||"";
    firebase.firestore(app).collection("hosfix_jobs").onSnapshot(qs=>{
      let local=[]; try{ local=JSON.parse(localStorage.getItem("hosfix_jobs")||"[]"); }catch(e){}
      const n0=local.length; local=local.filter(j=>!hpOldJob(j)); let changed=local.length!==n0;
      qs.docs.forEach(d=>{
        const r=d.data(); if(!r||!r.id||hpOldJob(r)) return;
        const i=local.findIndex(j=>j.id===r.id);
        if(i<0){ local.push(r); changed=true; }
        else if(stamp(r)>stamp(local[i])){ local[i]=Object.assign({},local[i],r); changed=true; }
      });
      if(!changed) return;
      local.sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      try{ localStorage.setItem("hosfix_jobs",JSON.stringify(local)); }catch(e){}
      const typing=document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      const modalOpen=!!document.querySelector("#modal-root .modal-bg");
      if(SESSION && !typing && !modalOpen && (CURRENT_TAB==="home"||/^fix/.test(CURRENT_TAB))) render();
    }, err=>console.warn("[HosPRO] HosFIX job sync unavailable:", err&&err.message));
  }catch(e){ console.warn("[HosPRO] HosFIX job sync init failed:", e); }
})();

/* ============================================================
   MODULE LANDING EXTRAS — hero photo, "Today at a glance", "Related"
   ============================================================ */
const HP_MOD_HERO = {
  hosfix:    "assets/hospro/hero-hosops.jpg",
  hoscom:    "assets/hospro/hero-hoshub.jpg",   // placeholder until a HosCOM image is supplied
  hossales:  "assets/hospro/hero-hossales.jpg",
  hosvenue:  "assets/hospro/hero-hosvenue.jpg",
  hosstudio: "assets/hospro/hero-hosstudio.jpg",
  hosbrand:  "assets/hospro/hero-hosbrand.jpg",
  hospeople: "assets/hospro/hero-hospeople.jpg",
  hoshub:    "assets/hospro/hero-hoshub.jpg",
};
const HP_HOTEL_PHOTOS = [
  ["exterior-dusk.png","Exterior at dusk"],["exterior-front.png","Front entrance"],["exterior-lawn.png","Lawns"],
  ["terrace.png","Terrace"],["restaurant.png","Restaurant"],["bar-lounge.png","Bar & lounge"],
  ["reception.png","Reception"],["suite-bay.png","Bay suite"],["bedroom-teal.png","Bedroom"],
  ["bedroom-yellow.png","Bedroom"],["pool.png","Pool"]
];

function hpSafe(fn, dflt){ try{ const v=fn(); return (v===undefined||v===null||Number.isNaN(v))?dflt:v; }catch(e){ return dflt; } }
function hpMoney(n){ n=Number(n)||0; return n>=10000 ? "£"+(n/1000).toFixed(n>=100000?0:1).replace(/\.0$/,"")+"k" : "£"+Math.round(n).toLocaleString("en-GB"); }
function hpJobs(){ try{ return JSON.parse(localStorage.getItem("hosfix_jobs")||"[]"); }catch(e){ return []; } }
function hpCompOverdue(){
  const tasks=JSON.parse(localStorage.getItem("hosfix_comp_tasks")||"[]");
  const now=new Date(); now.setHours(0,0,0,0);
  return tasks.filter(t=>{
    if(t.status==="complete"||!t.due) return false;
    const p=String(t.due).split("/"); if(p.length<3) return false;
    return new Date(+p[2],+p[1]-1,+p[0]) < now;
  }).length;
}
function hpDaysAhead(dateStr,days){ if(!dateStr) return false; const d=new Date(dateStr), n=new Date(); n.setHours(0,0,0,0); const e=new Date(n.getTime()+days*864e5); return d>=n && d<e; }

/* Each stat: [value, label, tab to open, accent colour, alert?] */
function hpModuleStats(id){
  const T=new Date(), todayK=T.toISOString().slice(0,10), monthK=todayK.slice(0,7);
  const pipe=()=> (typeof pipelineData==="function") ? pipelineData() : [];
  switch(id){
    case "hosfix": {
      const jobs=hpJobs(), open=jobs.filter(j=>j.status!=="complete");
      const wk=Date.now()-7*864e5;
      return [
        [open.length, "Open maintenance jobs", "fixAllJobs", null],
        [open.filter(j=>j.priority==="urgent").length, "Urgent jobs", "fixAllJobs", null, true],
        [jobs.filter(j=>j.status==="pending_approval").length, "Awaiting cost approval", "fixDash", null, true],
        [jobs.filter(j=>j.status==="complete" && new Date(j.completedAt||0).getTime()>wk).length, "Completed this week", "fixAllJobs", null],
      ];
    }
    case "hoscom": {
      const tasks=hpSafe(()=>JSON.parse(localStorage.getItem("hosfix_comp_tasks")||"[]"),[]);
      const acts=hpSafe(()=>JSON.parse(localStorage.getItem("hosfix_comp_actions")||"[]"),[]);
      const now=new Date(); now.setHours(0,0,0,0);
      const due=t=>{ const p=String(t.due||"").split("/"); return p.length<3?null:new Date(+p[2],+p[1]-1,+p[0]); };
      const open=tasks.filter(t=>t.status!=="complete");
      const soon=open.filter(t=>{ const d=due(t); return d && d>=now && d<new Date(now.getTime()+7*864e5); }).length;
      const pct=tasks.length? Math.round(tasks.filter(t=>t.status==="complete").length/tasks.length*100)+"%" : "—";
      return [
        [hpSafe(hpCompOverdue,0), "Tasks overdue", "compTasks", null, true],
        [soon, "Due in the next 7 days", "compTasks", null],
        [acts.filter(a=>a.status!=="complete"&&a.status!=="closed").length, "Open actions", "compActions", null, true],
        [pct, "Tasks complete", "compDash", null],
      ];
    }
    case "hossales": {
      const p=hpSafe(pipe,[]);
      const open=p.filter(e=>["enquiry","provisional"].includes(e.status));
      return [
        [hpMoney(open.reduce((s,e)=>s+(+e.value||0),0)), "Open pipeline value", "pipeline", "#8b5c8f"],
        [open.filter(e=>e.followUp && e.followUp<todayK).length, "Follow-ups overdue", "pipeline", "#b3261e", true],
        [p.filter(e=>e.status==="confirmed" && String(e.date||"").startsWith(monthK)).length, "Events confirmed this month", "pipeline", "#2a6a4a"],
        [hpSafe(()=>hpMoney(bevGetStock().reduce((s,i)=>s+(+i.totalValue||((+i.qty||0)*(+i.unitPrice||0))),0)),"—"), "Bar stock value", "beverage", null],
      ];
    }
    case "hosvenue": {
      const p=hpSafe(pipe,[]);
      const fb=hpSafe(()=> (typeof FeedbackStore!=="undefined") ? FeedbackStore.all() : [], []);
      const avg=fb.length ? (fb.reduce((s,f)=>s+(+f.rating||0),0)/fb.length).toFixed(1)+"★" : "—";
      return [
        [hpSafe(()=> (spGetFC()[todayK]||{}).rooms || "—","—"), "Rooms in house tonight", "rotaForecast", "#2f6f9e"],
        [hpSafe(()=>corpGetAccounts().length,"—"), "Corporate accounts", "corpdb", "#2f6f9e"],
        [p.filter(e=>e.status==="confirmed" && hpDaysAhead(e.date,7)).length, "Events in the next 7 days", "pipeline", "#8b5c8f"],
        [avg, "Private feedback average", "feedback", "#c78a3b"],
      ];
    }
    case "hosstudio": {
      return [
        [hpSafe(()=>BrochureStore.all().length,0), "Brochures saved", "brochure", "#c85c6b"],
        [hpSafe(()=> (typeof QuoteStore!=="undefined") ? QuoteStore.all().length : "—","—"), "Quotes created", "quotes", "#8b5c8f"],
        [hpSafe(()=>PACKAGES.length,"—"), "Packages to promote", "packages", "#2f6f9e"],
        [hpSafe(()=> (typeof MktStore!=="undefined") ? MktStore.all().length : "—","—"), "Marketing assets", "marketing", "#c78a3b"],
      ];
    }
    case "hospeople": {
      const fc=hpSafe(()=>spGetFC()[todayK]||{},{}), rota=hpSafe(spGetRota,{});
      const depts=(typeof SP_DEPTS!=="undefined")?SP_DEPTS:[];
      const onShift=hpSafe(()=>depts.reduce((s,d)=>s+spCountRostered(rota,todayK,d.id),0),"—");
      const short=hpSafe(()=>depts.filter(d=>spCountRostered(rota,todayK,d.id)<spCalcRequired(fc,d.id).needed).length,"—");
      return [
        [onShift, "On shift today", "rotaDash", "#4a86c7"],
        [short, "Departments short today", "rotaDash", "#b3261e", true],
        [hpSafe(()=>hsGetLeave().filter(l=>l.status==="pending").length,0), "Leave requests pending", "staffLeaveAdmin", "#c78a3b", true],
        [hpSafe(()=>spGetStaff().length,"—"), "Staff on the team", "staffProfiles", "#4a86c7"],
      ];
    }
    case "hoshub": {
      const docs=hpSafe(()=>JSON.parse(localStorage.getItem("hoshub_docs")||"[]"),[]).filter(d=>hpCanTab(d.tab));
      const wk=Date.now()-7*864e5;
      const by=t=>docs.filter(d=>d.tab===t).length;
      return [
        [docs.length, "Documents filed", "hubDocs", "#4a9d7f"],
        [docs.filter(d=>new Date(d.addedAt||d.created||d.date||0).getTime()>wk).length, "Added this week", "hubDocs", "#4a9d7f"],
        [by("hubContracts"), "Contracts & agreements", "hubContracts", "#8b5c8f"],
        hpCanTab("hubFinance") ? [by("hubFinance"), "Finance documents", "hubFinance", "#c78a3b"] : [by("hubSuppliers"), "Supplier agreements", "hubSuppliers", "#c78a3b"],
      ];
    }
  }
  return null;
}

/* Related shortcuts: [tab, label, why] — tabs in other modules */
const HP_RELATED = {
  hosfix:    [["compDash","Compliance","Safety checks linked to the building"],["rotaDash","Staff on shift","Who is on today"],["hubSuppliers","Supplier agreements","Contracts and SLAs for contractors"],["precheckin","Pre check-in","Arrivals and room requests"]],
  hoscom:    [["fixAllJobs","Maintenance jobs","Jobs raised from compliance actions"],["hubHR","HR documents","Policies, training and certificates"],["staffDocs","Staff documents","Right to work and certificates"],["suppliers","Suppliers","Contractor details and insurance"]],
  hossales:  [["rooms","Meeting rooms","Capacities and layouts to quote from"],["packages","Packages & pricing","Delegate rates and event packages"],["brochure","Brochure Builder","Send a branded brochure with the quote"],["corpdb","Corporate database","Account history and contacts"]],
  hosvenue:  [["rotaForecast","Occupancy forecast","Rooms sold drive staffing levels"],["pipeline","Sales pipeline","Upcoming events and enquiries"],["dining","Dining & Banqueting","Restaurant plan and covers"],["brandPhotography","Photography","Approved venue images"]],
  hosstudio: [["brandLogos","Logos & brand assets","Official marks and colour palette"],["brandPhotography","Photography","Approved hotel images"],["brandDocs","Menus & wine lists","Current Clarendon menus"],["quotes","Quotes & proposals","Quotes now live in HosSALES"]],
  hosbrand:  [["brochure","Brochure Builder","Build collateral from these assets"],["menu","Menu Builder","Menus in the house style"],["social","Social Media","Post with approved images"],["marketing","Campaigns","Marketing library and campaigns"]],
  hospeople: [["rotaForecast","Occupancy forecast","Plan shifts from rooms and covers"],["hubHR","HR documents","Policies and handbooks"],["fixTeam","Maintenance team","Trades, hours and rates"],["staffDocs","Staff documents","Right to work, contracts, certificates"]],
  hoshub:    [["contracts","Event agreements","E-signed client agreements in HosSALES"],["suppliers","Supplier database","162 suppliers and contacts"],["staffProfiles","Staff profiles","HR records for each team member"],["brandCollateral","Collateral & brochures","Downloadable sales material"]],
};

function hpLandingExtras(m){
  const box=document.createElement("div");
  box.className="hp-land-extras";
  if(HP_FIXRAY_MODE && (m.id==="hosfix"||m.id==="hoscom")){
    box.innerHTML=`<div class="hp-sec-h">Live in FixRay</div>`+hpFixrayCard(
      m.id==="hosfix"?"Maintenance jobs are run in FixRay":"Scheduled checks are run in FixRay",
      (m.id==="hosfix"?"Staff report and complete jobs in the FixRay app.":"The Saeker schedule is set up as FixRay scheduled jobs.")+
      " Today-at-a-glance figures will return here once the weekly FixRay export is imported. "+(m.id==="hosfix"?"Assets & M&E and Suppliers":"The Task Board")+" in the menu above still work as normal.", true);
    const rel=(HP_RELATED[m.id]||[]).filter(([t])=>RENDER_MAP[t] && !HP_FIXRAY_HIDDEN_TABS.has(t) && hpCanTab(t));
    if(rel.length){
      box.innerHTML+=`<div class="hp-sec-h">Related</div><div class="hp-related">${rel.map(([tab,label,why])=>{ const om=hpModuleFor(tab);
        return `<button class="hp-rel" onclick="switchTab('${tab}')" style="--acc:${om?om.colour:m.colour}"><span class="hp-rel-mod">${om?om.icon+" "+om.name:""}</span><span class="hp-rel-t">${label}</span><span class="hp-rel-w">${why}</span></button>`; }).join("")}</div>`;
    }
    return box;
  }
  // ── At a glance ──
  if(m.id==="hosbrand"){
    box.innerHTML+=`<div class="hp-sec-h">Brandon Hall photography</div>
      <div class="hp-photostrip">${HP_HOTEL_PHOTOS.map(([f,l])=>`<button class="hp-ph" onclick="switchTab('brandPhotography')" title="${l}">
        <img src="assets/hotel/${f}" alt="${l}" loading="lazy" onerror="this.closest('.hp-ph').remove()"><span>${l}</span></button>`).join("")}</div>`;
  } else {
    const stats=hpModuleStats(m.id)||[];
    if(stats.length){
      box.innerHTML+=`<div class="hp-sec-h">Today at a glance</div>
        <div class="hp-glance">${stats.map(([v,l,tab,col,alert])=>{
          const hot = alert && Number(v)>0;
          return `<button class="hp-stat${hot?' hot':''}" onclick="switchTab('${tab}')" style="--acc:${hot?'#b3261e':m.colour}">
            <span class="hp-stat-v">${v}</span><span class="hp-stat-l">${l}</span><span class="hp-stat-go">Open →</span></button>`; }).join("")}</div>`;
    }
  }
  // ── Related ──
  const rel=(HP_RELATED[m.id]||[]).filter(([t])=>RENDER_MAP[t] && hpCanTab(t));
  if(rel.length){
    box.innerHTML+=`<div class="hp-sec-h">Related</div>
      <div class="hp-related">${rel.map(([tab,label,why])=>{
        const om=hpModuleFor(tab);
        return `<button class="hp-rel" onclick="switchTab('${tab}')" style="--acc:${om?om.colour:m.colour}">
          <span class="hp-rel-mod">${om?om.icon+" "+om.name:""}</span>
          <span class="hp-rel-t">${label}</span><span class="hp-rel-w">${why}</span></button>`; }).join("")}</div>`;
  }
  return box;
}


/* ============================================================
   HosPEOPLE — PAYROLL GRID, FINGERPRINT COMPARE, ROTA SHARING
   ============================================================ */

// ── Pay helpers ──────────────────────────────────────────────
function spPaySettings(){
  const d={breakMins:0,breakOverHrs:6,tolerance:0.25};
  try{ return Object.assign(d, JSON.parse(localStorage.getItem('sp_pay_settings')||'{}')); }catch(e){ return d; }
}
function spSavePaySettings(p){ try{ localStorage.setItem('sp_pay_settings', JSON.stringify(p)); }catch(e){} }
function spRate(s){
  const r=+s.hourlyRate||0; if(r) return r;
  if(+s.weeklyWage && +s.contractHrs) return (+s.weeklyWage)/(+s.contractHrs);
  return 0;
}
function spCell(v){
  if(v && typeof v==='object') return {shift:String(v.shift||'off'), dept:v.dept||null};
  return {shift:String(v||'off'), dept:null};
}
/* Paid hours for one rota entry: shift length less the unpaid break (if set) */
function spPaidHrs(v){
  const h=spParseHrs(spCell(v).shift), p=spPaySettings();
  return (p.breakMins>0 && h>p.breakOverHrs) ? Math.max(0, Math.round((h-p.breakMins/60)*100)/100) : h;
}
function spKind(v){
  const s=spCell(v).shift.toLowerCase().trim();
  if(!s||s==='off') return 'off';
  if(['holiday','sick','in lieu','on call'].includes(s)) return s;
  return spParseHrs(s)>0 ? 'work' : 'off';
}
const spH = n => (Math.round((n||0)*100)/100).toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:2});
const spGBP = n => '£'+(Number(n)||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
function spEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function spCsvCell(v){ const s=String(v==null?'':v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function spDownload(name, text, type){
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([text],{type:type||'text/csv;charset=utf-8'})),download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),500);
}

/* Department totals for a set of days. Hours and cost are booked to the department
   the person is working in that day (so cover shifts land in the covering department). */
function spDeptDayTotals(days, rota, staff, pending){
  const out={}; SP_DEPTS.forEach(d=>out[d.id]={});
  days.forEach(d=>{
    const k=spDK(d);
    staff.forEach(s=>{
      const v=(pending&&pending[k]&&pending[k][s.id]!==undefined)?pending[k][s.id]:(rota[k]||{})[s.id];
      if(spKind(v)!=='work') return;
      const c=spCell(v), dep=c.dept||s.dept, h=spPaidHrs(v);
      if(!out[dep]) out[dep]={};
      const t=out[dep][k]||(out[dep][k]={hrs:0,cost:0,people:0});
      t.hrs+=h; t.cost+=h*spRate(s); t.people++;
    });
  });
  return out;
}

/* Rows added to the bottom of the weekly rota: per-department hours & cost per day */
function spRotaTotalsRows(days, rota, staff, pending){
  const tot=spDeptDayTotals(days, rota, staff, pending);
  const cell='padding:6px 6px;text-align:center;font-size:11px;border-top:1px solid #e5e7eb';
  let html=`<tr><td colspan="${days.length+3}" style="padding:9px 12px;background:#1a2b3a;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Daily totals by department · paid hours and staff cost</td></tr>`;
  const grand={}; let gH=0,gC=0;
  SP_DEPTS.forEach(dep=>{
    const row=tot[dep.id]||{}; let wh=0,wc=0;
    const tds=days.map(d=>{
      const t=row[spDK(d)]; const g=grand[spDK(d)]||(grand[spDK(d)]={hrs:0,cost:0});
      if(!t) return `<td style="${cell};color:#9ca3af;background:#fff">—</td>`;
      wh+=t.hrs; wc+=t.cost; g.hrs+=t.hrs; g.cost+=t.cost;
      return `<td style="${cell};background:#fff"><div style="font-weight:700;color:#1a2b3a">${spH(t.hrs)}h</div><div style="color:#374151">${spGBP(t.cost)}</div></td>`;
    }).join('');
    if(!wh) return;
    gH+=wh; gC+=wc;
    html+=`<tr class="sp-tot-row"><td style="padding:6px 12px;position:sticky;left:0;z-index:1;background:#fff;border-top:1px solid #e5e7eb;font-size:12px;font-weight:700;color:#1a2b3a"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${dep.colour};margin-right:6px"></span>${dep.name}</td>${tds}
      <td style="${cell};background:#f9fafb;white-space:nowrap"><div style="font-weight:800;color:#1a2b3a">${spH(wh)}h</div><div style="color:#374151">${spGBP(wc)}</div></td><td style="background:#f9fafb;border-top:1px solid #e5e7eb"></td></tr>`;
  });
  const gtds=days.map(d=>{const g=grand[spDK(d)]||{hrs:0,cost:0};return `<td style="${cell};background:#E2F1EE;border-top:2px solid #2B726A"><div style="font-weight:800;color:#1a2b3a">${spH(g.hrs)}h</div><div style="font-weight:700;color:#2B726A">${spGBP(g.cost)}</div></td>`;}).join('');
  html+=`<tr class="sp-tot-grand"><td style="padding:8px 12px;position:sticky;left:0;z-index:1;background:#E2F1EE;border-top:2px solid #2B726A;font-size:12px;font-weight:800;color:#1a2b3a;text-transform:uppercase">All departments</td>${gtds}
    <td style="${cell};background:#E2F1EE;border-top:2px solid #2B726A;white-space:nowrap"><div style="font-weight:800;color:#1a2b3a">${spH(gH)}h</div><div style="font-weight:800;color:#2B726A">${spGBP(gC)}</div></td><td style="background:#E2F1EE;border-top:2px solid #2B726A"></td></tr>`;
  const p=spPaySettings();
  html+=`<tr><td colspan="${days.length+3}" style="padding:6px 12px;font-size:10.5px;color:#4b5563;background:#fff">Cost = paid hours × hourly rate from Staff Profiles${p.breakMins?` · ${p.breakMins} min unpaid break taken off shifts over ${p.breakOverHrs}h`:''} · includes unsaved changes shown above · excludes employer NI, pension and holiday pay.</td></tr>`;
  return html;
}

// ── Payroll grid (weekly / monthly) ─────────────────────────
let spPayMode='week', spPayOff=0, spCmp=null;
function spPayPeriod(){
  const t=new Date();
  if(spPayMode==='week'){
    const days=spWeekDates(spPayOff);
    return {days, label:'Week commencing '+days[0].toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}), file:'week-'+spDK(days[0])};
  }
  const first=new Date(t.getFullYear(), t.getMonth()+spPayOff, 1, 12);
  const n=new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  const days=Array.from({length:n},(_,i)=>new Date(first.getFullYear(), first.getMonth(), i+1, 12));
  return {days, label:first.toLocaleDateString('en-GB',{month:'long',year:'numeric'}), file:'month-'+spDK(first).slice(0,7)};
}
/* One record per staff member for the period */
function spPayRows(days){
  const rota=spGetRota(), staff=spGetStaff();
  const order=SP_DEPTS.map(d=>d.id);
  return staff.slice().sort((a,b)=>(order.indexOf(a.dept)-order.indexOf(b.dept))||a.name.localeCompare(b.name)).map(s=>{
    const r={s, rate:spRate(s), daily:[], hrs:0, shifts:0, hol:0, sick:0, lieu:0, oncall:0};
    days.forEach(d=>{
      const v=(rota[spDK(d)]||{})[s.id], k=spKind(v), h=k==='work'?spPaidHrs(v):0;
      r.daily.push({k, h, shift:spCell(v).shift});
      if(k==='work'){ r.hrs+=h; r.shifts++; }
      else if(k==='holiday') r.hol++; else if(k==='sick') r.sick++; else if(k==='in lieu') r.lieu++; else if(k==='on call') r.oncall++;
    });
    /* Salaried staff are paid their salary for the period, whatever the rota hours.
       Annual salary comes from the HR import; otherwise hourly rate × contract hours × 52. */
    r.basis = s.payBasis==='salary' ? 'salary' : 'hourly';
    if(r.basis==='salary'){
      const annual = +s.annualSalary || (r.rate*(+s.contractHrs||0)*52);
      r.annual = annual;
      r.gross = spPayMode==='week' ? annual/52 : annual/12;
    } else r.gross=r.hrs*r.rate;
    return r;
  });
}

function renderRotaPayroll(v){
  const P=spPayPeriod(), rows=spPayRows(P.days), ps=spPaySettings();
  const deptName=id=>(SP_DEPTS.find(d=>d.id===id)||{}).name||id;
  const deptCol=id=>(SP_DEPTS.find(d=>d.id===id)||{}).colour||'#6b7280';
  const todayK=spDK(new Date());
  const heads=P.days.map(d=>{const k=spDK(d),we=d.getDay()===0||d.getDay()===6;return `<th style="padding:6px 3px;min-width:${spPayMode==='week'?84:44}px;text-align:center;font-size:10.5px;color:${k===todayK?'#fff':'#1a2b3a'};background:${k===todayK?'#2B726A':we?'#eef2f5':'#f5f7f9'}">${d.toLocaleDateString('en-GB',{weekday:'short'}).slice(0,spPayMode==='week'?3:2)}<div style="font-weight:400;opacity:.8">${d.getDate()}${spPayMode==='week'?' '+d.toLocaleDateString('en-GB',{month:'short'}):''}</div></th>`;}).join('');
  let body='', curDept=null, tot={hrs:0,gross:0,shifts:0,hol:0,sick:0}, dt=null;
  const flushDept=()=>{ if(!dt) return; body+=`<tr><td style="position:sticky;left:0;background:#f3f6f8;padding:6px 10px;font-size:11px;font-weight:800;color:#1a2b3a">${deptName(curDept)} subtotal</td><td colspan="${P.days.length+2}" style="background:#f3f6f8"></td><td style="background:#f3f6f8;text-align:right;padding:6px 8px;font-size:12px;font-weight:800">${spH(dt.hrs)}</td><td style="background:#f3f6f8" colspan="2"></td><td style="background:#f3f6f8;text-align:right;padding:6px 10px;font-size:12px;font-weight:800">${spGBP(dt.gross)}</td></tr>`; };
  rows.forEach(r=>{
    if(r.s.dept!==curDept){ flushDept(); curDept=r.s.dept; dt={hrs:0,gross:0};
      body+=`<tr><td colspan="${P.days.length+7}" style="padding:6px 10px;background:${deptCol(curDept)};color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${deptName(curDept)}</td></tr>`; }
    dt.hrs+=r.hrs; dt.gross+=r.gross; tot.hrs+=r.hrs; tot.gross+=r.gross; tot.shifts+=r.shifts; tot.hol+=r.hol; tot.sick+=r.sick;
    const cells=r.daily.map(c=>{
      const lab=c.k==='work'?spH(c.h):c.k==='holiday'?'HOL':c.k==='sick'?'SICK':c.k==='in lieu'?'LIEU':c.k==='on call'?'OC':'';
      const bg=c.k==='work'?'#f0fdf4':c.k==='holiday'?'#eff6ff':c.k==='sick'?'#fef2f2':c.k==='in lieu'?'#faf5ff':'#fff';
      return `<td title="${spEsc(c.shift)}" style="text-align:center;font-size:11px;padding:5px 2px;background:${bg};color:${c.k==='work'?'#166534':'#374151'};border-left:1px solid #f0f2f4">${lab}</td>`;
    }).join('');
    body+=`<tr style="border-top:1px solid #eef1f4">
      <td style="position:sticky;left:0;background:#fff;padding:6px 10px;min-width:170px;box-shadow:2px 0 4px rgba(0,0,0,.04)"><div style="font-size:12px;font-weight:700;color:#1a2b3a">${spEsc(r.s.name)}${(()=>{ const h=hrUnlocked()&&hrRecord(r.s.staffCode); return h&&/student/i.test(h.rtwType||'')&&spPayMode==='week'&&r.hrs>20?` <span title="Student visa — 20 hours a week in term time" style="font-size:9.5px;padding:1px 5px;border-radius:6px;background:#fef2f2;color:#991b1b;font-weight:700">student: ${spH(r.hrs)}h &gt; 20</span>`:''; })()}${r.s.hrStatus==='not-on-hr'?' <span title="Not on the HR export — check before paying" style="font-size:9.5px;padding:1px 5px;border-radius:6px;background:#fff7ed;color:#9a3412;font-weight:700">not on HR</span>':''}</div><div style="font-size:10px;color:#4b5563">${spEsc(r.s.staffCode||'')} · ${spEsc(r.s.role||'')}</div></td>
      <td style="font-size:11px;padding:5px 8px;color:#374151;white-space:nowrap">${spEsc(r.s.contract||'')}</td>
      ${cells}
      <td style="text-align:center;font-size:11px;padding:5px 6px">${r.shifts}</td>
      <td style="text-align:right;font-size:12px;font-weight:700;padding:5px 8px">${spH(r.hrs)}</td>
      <td style="text-align:right;font-size:11px;padding:5px 8px;color:${r.rate||r.basis==='salary'?'#374151':'#b3261e'}">${r.basis==='salary'?`<span title="${spGBP(r.annual)} a year">Salary</span>`:r.rate?spGBP(r.rate):'No rate'}</td>
      <td style="text-align:center;font-size:11px;padding:5px 6px;color:#374151">${[r.hol?r.hol+' hol':'',r.sick?r.sick+' sick':'',r.lieu?r.lieu+' lieu':''].filter(Boolean).join(' · ')||'—'}</td>
      <td style="text-align:right;font-size:12px;font-weight:800;padding:5px 10px;color:#1a2b3a">${spGBP(r.gross)}</td>
    </tr>`;
  });
  flushDept();
  const noRate=rows.filter(r=>!r.rate&&r.hrs>0&&r.basis!=='salary').length;
  const btn='padding:7px 12px;border-radius:8px;font:700 12px Lato;cursor:pointer;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff';
  const on='padding:7px 14px;border-radius:8px;font:700 12px Lato;cursor:pointer;border:1px solid #4DA69C;background:#4DA69C;color:#fff';

  v.innerHTML=`<div style="padding:20px 28px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px">
      <div><div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#fff">Payroll Hours &amp; Costs</div>
        <div style="font-size:13px;color:#a9b8c9">${P.label} · from the approved rota</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button style="${spPayMode==='week'?on:btn}" onclick="spPayMode='week';spPayOff=0;spCmp=null;renderRotaPayroll(document.getElementById('view'))">Weekly</button>
        <button style="${spPayMode==='month'?on:btn}" onclick="spPayMode='month';spPayOff=0;spCmp=null;renderRotaPayroll(document.getElementById('view'))">Monthly</button>
        <button style="${btn}" onclick="spPayOff--;renderRotaPayroll(document.getElementById('view'))">← Prev</button>
        <button style="${btn}" onclick="spPayOff=0;renderRotaPayroll(document.getElementById('view'))">${spPayMode==='week'?'This week':'This month'}</button>
        <button style="${btn}" onclick="spPayOff++;renderRotaPayroll(document.getElementById('view'))">Next →</button>
        <button style="${btn}" onclick="spShareRotaLink()">🔗 Staff rota link</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px">
      ${[['Staff with hours',rows.filter(r=>r.hrs>0).length],['Shifts',tot.shifts],['Paid hours',spH(tot.hrs)],['Gross pay',spGBP(tot.gross)],['Holiday / sick days',tot.hol+' / '+tot.sick]].map(([l,n])=>`<div style="background:#fff;border-radius:12px;padding:12px 14px"><div style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.4px">${l}</div><div style="font-size:22px;font-weight:800;color:#1a2b3a;margin-top:2px">${n}</div></div>`).join('')}
    </div>

    <div style="background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:#1a2b3a">
      <b>Export for payroll:</b>
      <button onclick="spPayExport('xlsx')" style="padding:8px 14px;border:none;border-radius:8px;background:#2B726A;color:#fff;font:700 12px Lato;cursor:pointer">⬇ Excel</button>
      <button onclick="spPayExport('csv')" style="padding:8px 14px;border:1px solid #2B726A;border-radius:8px;background:#fff;color:#2B726A;font:700 12px Lato;cursor:pointer">⬇ CSV</button>
      <span style="width:1px;height:22px;background:#e5e7eb"></span>
      <b>Xero:</b>
      <button onclick="xeroPaySheet()" style="padding:8px 14px;border:none;border-radius:8px;background:#13B5EA;color:#fff;font:700 12px Lato;cursor:pointer">⬇ Pay run sheet</button>
      <button onclick="xeroEmployeeModal()" style="padding:8px 14px;border:1px solid #13B5EA;border-radius:8px;background:#fff;color:#0b7fa6;font:700 12px Lato;cursor:pointer">Employee upload file</button>
      <button onclick="hsImportHRModal()" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#1a2b3a;font:700 12px Lato;cursor:pointer">📤 Import HR export</button>
      <button onclick="hrRecordsView()" style="padding:8px 14px;border:none;border-radius:8px;background:#7A2E3B;color:#fff;font:700 12px Lato;cursor:pointer">${hrUnlocked()?'🔓':'🔐'} Payroll records</button>
      <span style="flex:1"></span>
      <label style="display:flex;align-items:center;gap:6px">Unpaid break
        <input type="number" min="0" step="5" value="${ps.breakMins}" onchange="const p=spPaySettings();p.breakMins=Math.max(0,+this.value||0);spSavePaySettings(p);renderRotaPayroll(document.getElementById('view'))" style="width:60px;padding:5px;border:1px solid #d1d5db;border-radius:6px"> min on shifts over
        <input type="number" min="0" step="0.5" value="${ps.breakOverHrs}" onchange="const p=spPaySettings();p.breakOverHrs=Math.max(0,+this.value||0);spSavePaySettings(p);renderRotaPayroll(document.getElementById('view'))" style="width:56px;padding:5px;border:1px solid #d1d5db;border-radius:6px"> h</label>
    </div>
    ${noRate?`<div style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:10px;padding:9px 12px;font-size:12.5px;margin-bottom:12px">⚠ ${noRate} staff member${noRate>1?'s have':' has'} hours but no hourly rate — add it in Staff Profiles so costs are complete.</div>`:''}

    <div style="background:#fff;border-radius:12px;overflow:auto;max-height:70vh">
      <table style="border-collapse:collapse;width:100%;min-width:${spPayMode==='week'?1100:1900}px">
        <thead style="position:sticky;top:0;z-index:3"><tr style="background:#f5f7f9">
          <th style="position:sticky;left:0;z-index:4;background:#f5f7f9;padding:8px 10px;text-align:left;font-size:11px;color:#1a2b3a;text-transform:uppercase">Staff</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#1a2b3a;background:#f5f7f9">Contract</th>
          ${heads}
          <th style="padding:8px;font-size:11px;color:#1a2b3a;background:#f5f7f9">Shifts</th>
          <th style="padding:8px;font-size:11px;color:#1a2b3a;text-align:right;background:#f5f7f9">Hours</th>
          <th style="padding:8px;font-size:11px;color:#1a2b3a;text-align:right;background:#f5f7f9">Rate</th>
          <th style="padding:8px;font-size:11px;color:#1a2b3a;background:#f5f7f9">Absence</th>
          <th style="padding:8px 10px;font-size:11px;color:#1a2b3a;text-align:right;background:#f5f7f9">Gross pay</th>
        </tr></thead>
        <tbody>${body}
          <tr style="background:#E2F1EE;border-top:2px solid #2B726A"><td style="position:sticky;left:0;background:#E2F1EE;padding:8px 10px;font-size:12px;font-weight:800;text-transform:uppercase">Total</td><td colspan="${P.days.length+1}"></td>
          <td style="text-align:center;font-weight:800;font-size:12px">${tot.shifts}</td><td style="text-align:right;padding:8px;font-weight:800;font-size:12px">${spH(tot.hrs)}</td><td></td><td></td><td style="text-align:right;padding:8px 10px;font-weight:800;font-size:13px;color:#2B726A">${spGBP(tot.gross)}</td></tr>
        </tbody>
      </table>
    </div>
    <div style="font-size:11px;color:#a9b8c9;margin-top:8px">Hours are paid hours from the approved rota (unsaved rota changes are not included). Gross pay = hours × hourly rate for hourly staff, and the ${spPayMode==='week'?'weekly (annual ÷ 52)':'monthly (annual ÷ 12)'} salary for salaried staff; it excludes employer NI, pension, overtime, holiday pay for hourly staff and tips. Xero UK can't import pay runs from a file, so the pay run sheet lists what to enter for each person. HOL = holiday, SICK = sick, LIEU = day in lieu, OC = on call.</div>

    <div id="sp-cmp-box" style="background:#fff;border-radius:12px;padding:16px;margin-top:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div><div style="font-size:16px;font-weight:800;color:#1a2b3a">Clock-in vs rota</div>
          <div style="font-size:12.5px;color:#4b5563">Load live QR clock-ins, or upload a CSV from the fingerprint system. We match each person and day against the rota and show every difference.</div></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button onclick="spLoadQRClockins()" style="padding:9px 14px;border-radius:8px;background:#2B726A;color:#fff;font:700 12px Lato;cursor:pointer;border:none">📲 Load QR clock-ins</button>
          <button onclick="spClockRosterModal()" style="padding:9px 14px;border-radius:8px;background:#1F7A8C;color:#fff;font:700 12px Lato;cursor:pointer;border:none">🖨 Clock-in QR &amp; PINs</button>
          <label style="padding:9px 14px;border-radius:8px;background:#1a2b3a;color:#fff;font:700 12px Lato;cursor:pointer">📤 Upload CSV<input type="file" accept=".csv,.txt,text/csv" style="display:none" onchange="spCmpLoad(this.files[0])"></label>
          <button onclick="spCmpTemplate()" style="padding:9px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font:700 12px Lato;cursor:pointer;color:#1a2b3a">Sample CSV</button>
        </div>
      </div>
      <div id="sp-cmp-out" style="margin-top:12px"></div>
    </div>
  </div>`;
  if(spCmp) spCmpRender();
}

function spPayExport(fmt){
  const P=spPayPeriod(), rows=spPayRows(P.days), deptName=id=>(SP_DEPTS.find(d=>d.id===id)||{}).name||id;
  const dayHead=P.days.map(d=>d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'2-digit'}));
  const head=['Staff code','Name','Role','Department','Contract',...dayHead,'Shifts','Paid hours','Pay basis','Hourly rate','Holiday days','Sick days','In lieu days','Gross pay'];
  const data=rows.map(r=>[r.s.staffCode||'',r.s.name,r.s.role||'',deptName(r.s.dept),r.s.contract||'',
    ...r.daily.map(c=>c.k==='work'?Math.round(c.h*100)/100:c.k==='off'?'':c.k.toUpperCase()),
    r.shifts, Math.round(r.hrs*100)/100, r.basis==='salary'?'Salary':'Hourly', Math.round(r.rate*100)/100, r.hol, r.sick, r.lieu, Math.round(r.gross*100)/100]);
  const tH=rows.reduce((t,r)=>t+r.hrs,0), tG=rows.reduce((t,r)=>t+r.gross,0);
  data.push(['','TOTAL','','','',...P.days.map(()=>''), rows.reduce((t,r)=>t+r.shifts,0), Math.round(tH*100)/100,'','', rows.reduce((t,r)=>t+r.hol,0), rows.reduce((t,r)=>t+r.sick,0), rows.reduce((t,r)=>t+r.lieu,0), Math.round(tG*100)/100]);
  const fname='brandon-hall-payroll-'+P.file;
  if(fmt==='csv'){
    spDownload(fname+'.csv', '﻿'+[['Brandon Hall Hotel & Spa — Payroll '+P.label],[],head,...data].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
    return;
  }
  spLoadXLSX().then(XLSX=>{
    const ws=XLSX.utils.aoa_to_sheet([['Brandon Hall Hotel & Spa — Payroll '+P.label],[],head,...data]);
    ws['!cols']=head.map((h,i)=>({wch:i===1?24:i===2?22:i===3?16:i<5?12:(i>=5&&i<5+P.days.length)?(P.days.length>7?7:11):12}));
    // Department summary sheet
    const byDept={}; rows.forEach(r=>{const k=deptName(r.s.dept); const t=byDept[k]||(byDept[k]={hrs:0,gross:0,staff:0}); t.hrs+=r.hrs; t.gross+=r.gross; if(r.hrs>0)t.staff++;});
    const ws2=XLSX.utils.aoa_to_sheet([['Department summary — '+P.label],[],['Department','Staff with hours','Paid hours','Gross pay'],...Object.entries(byDept).map(([k,t])=>[k,t.staff,Math.round(t.hrs*100)/100,Math.round(t.gross*100)/100]),['TOTAL','',Math.round(tH*100)/100,Math.round(tG*100)/100]]);
    ws2['!cols']=[{wch:22},{wch:16},{wch:12},{wch:14}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Payroll'); XLSX.utils.book_append_sheet(wb,ws2,'By department');
    XLSX.writeFile(wb, fname+'.xlsx');
  }).catch(()=>{ toast('Excel export unavailable offline — downloading CSV instead'); spPayExport('csv'); });
}
function spLoadXLSX(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=()=>window.XLSX?res(window.XLSX):rej(); s.onerror=rej; document.head.appendChild(s); });
}

// ── Fingerprint CSV compare ─────────────────────────────────
function spParseCSV(text){
  text=text.replace(/^﻿/,'');
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';
  const delim=[',',';','\t'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"') q=true;
    else if(ch===delim){ row.push(cur); cur=''; }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cur); cur=''; if(row.some(c=>c.trim()!=='')) rows.push(row); row=[]; }
    else cur+=ch;
  }
  row.push(cur); if(row.some(c=>c.trim()!=='')) rows.push(row);
  return rows.map(r=>r.map(c=>c.trim()));
}
const SP_CMP_FIELDS=[
  ['name','Staff name',/^(employee|staff|user)?\s*(full\s*)?name$|^employee$|^person$/i],
  ['first','First name',/first\s*name|forename/i],
  ['last','Last name',/last\s*name|surname/i],
  ['code','Staff code / ID',/(staff|emp|employee|user|badge|payroll|ac)\s*(no|number|code|id)|^id$|^code$|^ac-?no\.?$|enroll/i],
  ['date','Date',/^date$|work\s*date|shift\s*date|^day$/i],
  ['in','Clock in',/clock\s*-?in|time\s*in|^in$|check\s*-?in|start|on\s*duty/i],
  ['out','Clock out',/clock\s*-?out|time\s*out|^out$|check\s*-?out|finish|end|off\s*duty/i],
  ['punch','Punch time (single column)',/^(punch|time|date\s*\/?\s*time|datetime|timestamp|log\s*time|att\s*time)$/i],
  ['hours','Total hours',/total|hours|worked|duration/i],
];
function spCmpLoad(file){
  if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    const rows=spParseCSV(String(r.result||''));
    // header row = first row with at least 2 non-numeric cells
    let hi=rows.findIndex(x=>x.filter(c=>c&&isNaN(+c)).length>=2); if(hi<0) hi=0;
    const head=rows[hi]||[], data=rows.slice(hi+1);
    const map={}; const used=new Set();
    SP_CMP_FIELDS.forEach(([k,,re])=>{ const i=head.findIndex((h,ix)=>!used.has(ix)&&re.test(h)); if(i>-1){ map[k]=i; used.add(i);} });
    spCmp={file:file.name, head, data, map, result:null};
    spCmpRender();
  };
  r.readAsText(file);
}
function spCmpTemplate(){
  const staff=spGetStaff().slice(0,3), d=spPayPeriod().days[0];
  const ds=d.toLocaleDateString('en-GB');
  spDownload('fingerprint-sample.csv', 'Staff Code,Name,Date,Clock In,Clock Out,Total Hours\r\n'+staff.map(s=>[s.staffCode||'',s.name,ds,'08:58','17:04','8.1'].map(spCsvCell).join(',')).join('\r\n'));
}
/* Dates: dd/mm/yyyy (UK), yyyy-mm-dd, dd-mm-yy, dd.mm.yyyy, optionally followed by a time */
function spParseDT(s){
  s=String(s||'').trim(); if(!s) return null;
  let m, y, mo, d, hh=null, mi=null;
  if((m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))){ y=+m[1]; mo=+m[2]; d=+m[3]; }
  else if((m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/))){ d=+m[1]; mo=+m[2]; y=+m[3]; if(y<100) y+=2000; }
  else if((m=s.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{2,4})/))){ d=+m[1]; mo=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase())+1; y=+m[3]; if(y<100)y+=2000; }
  const t=s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?/i);
  if(t){ hh=+t[1]; mi=+t[2]; if(t[3]){ const pm=/p/i.test(t[3]); if(pm&&hh<12) hh+=12; if(!pm&&hh===12) hh=0; } }
  return {date: y?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null, mins: hh==null?null:hh*60+mi};
}
function spNorm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function spMatchStaff(code,name,staff){
  if(code){ const c=String(code).trim().toLowerCase(); const hit=staff.find(s=>String(s.staffCode||'').toLowerCase()===c || String(s.clockId||'').toLowerCase()===c); if(hit) return hit; }
  const n=spNorm(name); if(!n) return null;
  let hit=staff.find(s=>spNorm(s.name)===n); if(hit) return hit;
  const p=n.split(' ');
  // "Surname, First" or first + surname initial, or first name only when unique
  hit=staff.filter(s=>{const q=spNorm(s.name).split(' '); return q[0]===p[0] && (p.length===1||q.length===1||q[q.length-1]===p[p.length-1]||q[q.length-1][0]===p[p.length-1][0]);});
  if(hit.length===1) return hit[0];
  hit=staff.filter(s=>{const q=spNorm(s.name).split(' '); return p.length>1 && q[0]===p[p.length-1] && q[q.length-1]===p[0];});
  return hit.length===1?hit[0]:null;
}
function spCmpRun(){
  const C=spCmp, M=C.map, staff=spGetStaff(), rota=spGetRota(), tol=spPaySettings().tolerance;
  const get=(row,k)=>M[k]!=null?row[M[k]]:'';
  const clock={}; const unknown={}; const punches={};
  C.data.forEach(row=>{
    const name=M.name!=null?get(row,'name'):[get(row,'first'),get(row,'last')].filter(Boolean).join(' ');
    const code=get(row,'code');
    if(!name&&!code) return;
    const s=spMatchStaff(code,name,staff);
    const label=(name||code);
    let date=spParseDT(get(row,'date')).date;
    const ins=spParseDT(get(row,'in')), outs=spParseDT(get(row,'out')), pun=spParseDT(get(row,'punch'));
    if(!date) date=(ins&&ins.date)||(pun&&pun.date)||null;
    if(!date) return;
    if(!s){ const u=unknown[label]||(unknown[label]={label,code,days:new Set(),hrs:0}); u.days.add(date); }
    const key=(s?s.id:'?'+label)+'|'+date;
    if(M.punch!=null && M.in==null){ (punches[key]||(punches[key]={s,date,list:[]})).list.push(pun.mins); return; }
    let h=0, first=null, last=null;
    if(ins&&ins.mins!=null&&outs&&outs.mins!=null){ let a=ins.mins,b=outs.mins; if(b<=a) b+=1440; h=(b-a)/60; first=a; last=outs.mins; }
    else if(M.hours!=null){ const raw=get(row,'hours'); const hm=String(raw).match(/^(\d+):(\d{2})$/); h=hm?(+hm[1]+hm[2]/60):(parseFloat(raw)||0); }
    const c=clock[key]||(clock[key]={s,date,hrs:0,first:null,last:null,label});
    c.hrs+=h; if(first!=null&&(c.first==null||first<c.first)) c.first=first; if(last!=null) c.last=last;
    if(!s) unknown[label].hrs+=h;
  });
  Object.entries(punches).forEach(([key,p])=>{
    const l=p.list.filter(x=>x!=null).sort((a,b)=>a-b); let h=0;
    for(let i=0;i+1<l.length;i+=2) h+=(l[i+1]-l[i])/60;
    clock[key]={s:p.s,date:p.date,hrs:h,first:l[0],last:l[l.length-1],odd:l.length%2===1,label:p.s?p.s.name:key.split('|')[0].slice(1)};
    if(!p.s && unknown[clock[key].label]) unknown[clock[key].label].hrs+=h;
  });
  const dates=[...new Set(Object.values(clock).map(c=>c.date))].sort();
  if(!dates.length){ C.result={error:'No dated rows found. Check the Date / Clock in columns are mapped correctly.'}; return; }
  const from=dates[0], to=dates[dates.length-1];
  const lines=[];
  // every rostered shift in the range, plus every clocked day
  const all=new Set(Object.keys(clock).filter(k=>!k.startsWith('?')));
  Object.keys(rota).filter(dk=>dk>=from&&dk<=to).forEach(dk=>Object.keys(rota[dk]||{}).forEach(id=>{ if(spKind(rota[dk][id])==='work') all.add(id+'|'+dk); }));
  all.forEach(key=>{
    const [id,date]=key.split('|'); const s=staff.find(x=>x.id===id); if(!s) return;
    const v=(rota[date]||{})[id], rh=spKind(v)==='work'?spPaidHrs(v):0, c=clock[key], ch=c?Math.round(c.hrs*100)/100:0;
    const diff=Math.round((ch-rh)*100)/100;
    let status='ok', note='';
    if(!c && rh>0){ status='noclock'; note='Rostered but no clock-in'; }
    else if(c && rh===0){ status='unrostered'; note=spKind(v)==='off'?'Clocked in on a day off':'Clocked in while marked '+spCell(v).shift; }
    else if(c && c.odd){ status='diff'; note='Missing clock-out (odd number of punches)'; }
    else if(Math.abs(diff)>tol){ status='diff'; note=diff>0?'Worked more than rota':'Worked less than rota'; }
    const fmt=m=>m==null?'':String(Math.floor((m%1440)/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
    lines.push({s,date,shift:spCell(v).shift,rh,ch,diff,status,note,times:c&&c.first!=null?fmt(c.first)+'–'+fmt(c.last):'',cost:diff*spRate(s)});
  });
  lines.sort((a,b)=>a.s.name.localeCompare(b.s.name)||a.date.localeCompare(b.date));
  C.result={from,to,lines,unknown:Object.values(unknown).map(u=>({label:u.label,code:u.code,days:u.days.size,hrs:u.hrs}))};
}
function spCmpRender(){
  const out=document.getElementById('sp-cmp-out'); if(!out||!spCmp) return;
  const C=spCmp, opts=i=>`<option value="">— not in file —</option>`+C.head.map((h,ix)=>`<option value="${ix}"${C.map[i]===ix?' selected':''}>${spEsc(h||('Column '+(ix+1)))}</option>`).join('');
  const mapUI=`<div style="font-size:12.5px;color:#1a2b3a;margin-bottom:8px"><b>${spEsc(C.file)}</b> · ${C.data.length} rows. Check the columns below match your file, then press Compare.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:10px">
      ${SP_CMP_FIELDS.map(([k,l])=>`<label style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.3px">${l}<select onchange="spCmp.map['${k}']=this.value===''?undefined:+this.value;spCmp.result=null" style="display:block;width:100%;margin-top:3px;padding:6px;border:1px solid #d1d5db;border-radius:6px;font:400 12.5px Lato;color:#1a2b3a;text-transform:none">${opts(k)}</select></label>`).join('')}
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
      <button onclick="spCmpRun();spCmpRender()" style="padding:9px 18px;border:none;border-radius:8px;background:#4DA69C;color:#fff;font:800 13px Lato;cursor:pointer">Compare with rota</button>
      <label style="font-size:12px;color:#374151">Flag differences over <input type="number" step="5" min="0" value="${Math.round(spPaySettings().tolerance*60)}" onchange="const p=spPaySettings();p.tolerance=(+this.value||0)/60;spSavePaySettings(p);if(spCmp.result){spCmpRun();spCmpRender();}" style="width:56px;padding:4px;border:1px solid #d1d5db;border-radius:6px"> minutes</label>
      <button onclick="spCmp=null;document.getElementById('sp-cmp-out').innerHTML=''" style="padding:7px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:600 12px Lato;cursor:pointer;color:#374151">Clear</button>
    </div>`;
  let res='';
  const R=C.result;
  if(R&&R.error) res=`<div style="color:#b3261e;font-weight:700;font-size:13px">${R.error}</div>`;
  else if(R){
    const issues=R.lines.filter(l=>l.status!=='ok');
    const byStaff={}; R.lines.forEach(l=>{const t=byStaff[l.s.id]||(byStaff[l.s.id]={s:l.s,rh:0,ch:0,issues:0,cost:0}); t.rh+=l.rh; t.ch+=l.ch; t.cost+=l.cost; if(l.status!=='ok')t.issues++;});
    const pill={ok:['#dcfce7','#166534','Match'],diff:['#fef3c7','#92400e','Hours differ'],noclock:['#fee2e2','#991b1b','No clock-in'],unrostered:['#e0e7ff','#3730a3','Not on rota']};
    const dfmt=d=>new Date(d+'T12:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    res=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px">
      ${[['Period',dfmt(R.from)+' – '+dfmt(R.to)],['Shifts checked',R.lines.length],['Mismatches',issues.length],['Rota hours',spH(R.lines.reduce((t,l)=>t+l.rh,0))],['Clocked hours',spH(R.lines.reduce((t,l)=>t+l.ch,0))],['Cost difference',spGBP(R.lines.reduce((t,l)=>t+l.cost,0))]].map(([l,n],i)=>`<div style="background:${i===2&&issues.length?'#fef2f2':'#f5f7f9'};border-radius:10px;padding:10px 12px"><div style="font-size:10.5px;font-weight:700;color:#4b5563;text-transform:uppercase">${l}</div><div style="font-size:17px;font-weight:800;color:#1a2b3a">${n}</div></div>`).join('')}
    </div>
    ${R.unknown.length?`<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:9px 12px;font-size:12.5px;color:#9a3412;margin-bottom:10px"><b>Not matched to a staff profile:</b> ${R.unknown.map(u=>spEsc(u.label)+(u.code?' ('+spEsc(u.code)+')':'')+' — '+u.days+' day'+(u.days>1?'s':'')+', '+spH(u.hrs)+'h').join('; ')}. Add their fingerprint ID as the Staff Code in Staff Profiles, or check the name spelling.</div>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 8px;flex-wrap:wrap;gap:8px">
      <div style="font-size:14px;font-weight:800;color:#1a2b3a">${issues.length?issues.length+' mismatch'+(issues.length>1?'es':''):'✅ Everything matches the rota'}</div>
      <div style="display:flex;gap:6px"><label style="font-size:12px;color:#374151;display:flex;gap:5px;align-items:center"><input type="checkbox" id="sp-cmp-all" onchange="document.querySelectorAll('.sp-cmp-ok').forEach(r=>r.style.display=this.checked?'':'none')"> Show matching shifts too</label>
      <button onclick="spCmpExport()" style="padding:7px 12px;border:1px solid #2B726A;border-radius:8px;background:#fff;color:#2B726A;font:700 12px Lato;cursor:pointer">⬇ Export comparison</button></div>
    </div>
    <div style="overflow:auto;max-height:60vh;border:1px solid #eef1f4;border-radius:10px">
    <table style="width:100%;border-collapse:collapse;min-width:820px;font-size:12.5px;color:#1a2b3a">
      <thead style="position:sticky;top:0"><tr style="background:#f5f7f9;text-align:left">${['Staff','Date','Rota shift','Clocked','Rota h','Clocked h','Difference','Cost impact','Status'].map(h=>`<th style="padding:8px;font-size:11px;text-transform:uppercase;color:#1a2b3a">${h}</th>`).join('')}</tr></thead>
      <tbody>${R.lines.map(l=>{const p=pill[l.status];return `<tr class="${l.status==='ok'?'sp-cmp-ok':''}" style="border-top:1px solid #eef1f4;${l.status==='ok'?'display:none':''}">
        <td style="padding:7px 8px;font-weight:700">${spEsc(l.s.name)}</td><td style="padding:7px 8px;white-space:nowrap">${dfmt(l.date)}</td>
        <td style="padding:7px 8px">${spEsc(l.shift)}</td><td style="padding:7px 8px">${l.times||(l.ch?'—':'')}</td>
        <td style="padding:7px 8px;text-align:right">${spH(l.rh)}</td><td style="padding:7px 8px;text-align:right">${spH(l.ch)}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:800;color:${l.diff>0?'#b45309':l.diff<0?'#b3261e':'#166534'}">${l.diff>0?'+':''}${spH(l.diff)}h</td>
        <td style="padding:7px 8px;text-align:right">${l.cost?(l.cost>0?'+':'−')+spGBP(Math.abs(l.cost)):'—'}</td>
        <td style="padding:7px 8px"><span title="${spEsc(l.note)}" style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:${p[0]};color:${p[1]};white-space:nowrap">${p[2]}</span><div style="font-size:11px;color:#4b5563;margin-top:2px">${spEsc(l.note)}</div></td></tr>`;}).join('')}</tbody>
    </table></div>
    <div style="font-size:14px;font-weight:800;color:#1a2b3a;margin:16px 0 8px">By person</div>
    <div style="overflow:auto;border:1px solid #eef1f4;border-radius:10px"><table style="width:100%;border-collapse:collapse;min-width:600px;font-size:12.5px;color:#1a2b3a">
      <thead><tr style="background:#f5f7f9;text-align:left">${['Staff','Rota hours','Clocked hours','Difference','Cost impact','Mismatches'].map(h=>`<th style="padding:8px;font-size:11px;text-transform:uppercase">${h}</th>`).join('')}</tr></thead>
      <tbody>${Object.values(byStaff).sort((a,b)=>b.issues-a.issues||a.s.name.localeCompare(b.s.name)).map(t=>{const d=t.ch-t.rh;return `<tr style="border-top:1px solid #eef1f4"><td style="padding:7px 8px;font-weight:700">${spEsc(t.s.name)}</td><td style="padding:7px 8px">${spH(t.rh)}</td><td style="padding:7px 8px">${spH(t.ch)}</td><td style="padding:7px 8px;font-weight:800;color:${Math.abs(d)<0.01?'#166534':d>0?'#b45309':'#b3261e'}">${d>0?'+':''}${spH(d)}h</td><td style="padding:7px 8px">${Math.abs(t.cost)<0.005?'—':(t.cost>0?'+':'−')+spGBP(Math.abs(t.cost))}</td><td style="padding:7px 8px">${t.issues||'—'}</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  out.innerHTML=mapUI+res;
}
function spCmpExport(){
  const R=spCmp&&spCmp.result; if(!R||!R.lines) return;
  const head=['Staff code','Name','Date','Rota shift','Clocked times','Rota hours','Clocked hours','Difference (h)','Cost impact (£)','Status','Note'];
  const st={ok:'Match',diff:'Hours differ',noclock:'No clock-in',unrostered:'Not on rota'};
  const rows=R.lines.map(l=>[l.s.staffCode||'',l.s.name,l.date,l.shift,l.times,l.rh,Math.round(l.ch*100)/100,l.diff,Math.round(l.cost*100)/100,st[l.status],l.note]);
  R.unknown.forEach(u=>rows.push([u.code||'',u.label,'','','','',Math.round(u.hrs*100)/100,'','','Not matched','No staff profile matched']));
  spDownload('rota-vs-fingerprint-'+R.from+'-to-'+R.to+'.csv','﻿'+[head,...rows].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
}

/* ══════════════════════════════════════════════════════════════
   QR CLOCK-IN  —  wall poster + staff PINs, live punches into the
   same rota-vs-clock reconciliation above.
   Public clock page: clock.html  (writes clock_punches)
   Roster published to clock_roster/current (names, codes, PIN hashes)
   ══════════════════════════════════════════════════════════════ */
/* identical to clockHash() in clock.html — keep in sync */
function clockHash(pin, code){ const s=String(code).toLowerCase()+':'+String(pin)+':bhclock'; let h=5381;
  for(let i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))>>>0; } return h.toString(16); }
function clockUrl(){ try{ return new URL('clock.html', location.href).href; }catch(e){ return 'clock.html'; } }
function clockPins(){ try{ return JSON.parse(localStorage.getItem('bh_clock_pins')||'{}'); }catch{ return {}; } }
function clockSavePins(p){ try{ localStorage.setItem('bh_clock_pins', JSON.stringify(p)); }catch{} }
function clockGeo(){ try{ return JSON.parse(localStorage.getItem('bh_clock_geo')) || {enabled:true,lat:52.3736,lng:-1.3869,radius:250}; }catch{ return {enabled:true,lat:52.3736,lng:-1.3869,radius:250}; } }
function clockSaveGeo(g){ try{ localStorage.setItem('bh_clock_geo', JSON.stringify(g)); }catch{} }
function clockMakePin(existing){ let p; do{ p=String(Math.floor(1000+Math.random()*9000)); }while(existing.has(p)); existing.add(p); return p; }
function clockStaffCode(s){ return (s.staffCode||s.clockId||('BH'+s.id)).toString(); }

/* Build the roster rows with a stable PIN per person */
function clockRoster(){
  const staff=(typeof spGetStaff==='function'?spGetStaff():[]).filter(s=>s&&s.name);
  const pins=clockPins(); const used=new Set(Object.values(pins));
  const rows=staff.map(s=>{
    if(!pins[s.id]){ pins[s.id]=clockMakePin(used); }
    return { id:s.id, name:s.name, code:clockStaffCode(s), pin:pins[s.id] };
  });
  clockSavePins(pins);
  return rows;
}

async function spPublishClockRoster(){
  const rows=clockRoster(), geo=clockGeo();
  const payload={ geo, updated:new Date().toISOString(),
    staff: rows.map(r=>({ name:r.name, code:r.code, pinHash:clockHash(r.pin, r.code) })) };
  if(typeof FB!=="undefined" && FB.ready && FB.user){
    try{ await FB.db.collection('clock_roster').doc('current').set(payload);
      if(typeof toast==='function') toast('✓ Clock-in roster published — the wall QR is now live'); return true; }
    catch(e){ if(typeof toast==='function') toast('Could not publish: '+e.message); return false; }
  }
  if(typeof toast==='function') toast('Sign in required to publish the roster'); return false;
}

function spClockRosterModal(){
  const rows=clockRoster(), geo=clockGeo(), url=clockUrl();
  const old=document.getElementById('clock-modal'); if(old) old.remove();
  const m=document.createElement('div'); m.id='clock-modal';
  m.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(16,28,40,.55);display:grid;place-items:center;padding:18px';
  m.innerHTML=`<div style="background:#fff;border-radius:16px;max-width:620px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.4)">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #eef1f4">
      <div style="font-size:18px;font-weight:800;color:#1a2b3a">Clock-in QR &amp; staff PINs</div>
      <button onclick="document.getElementById('clock-modal').remove()" style="border:none;background:none;font-size:20px;color:#64707f;cursor:pointer">×</button></div>
    <div style="padding:20px 22px">
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
        <div style="text-align:center">
          <div id="clock-qr" style="padding:12px;background:#fff;border:1px solid #e3e7ee;border-radius:12px;display:inline-block"></div>
          <div style="font-size:11px;color:#64707f;margin-top:6px;max-width:200px">Wall poster — staff scan this to clock in on their phone.</div>
          <button onclick="spClockPoster()" style="margin-top:8px;padding:8px 14px;border:none;border-radius:8px;background:#1a2b3a;color:#fff;font:700 12px Lato;cursor:pointer">🖨 Print poster</button>
        </div>
        <div style="flex:1;min-width:230px">
          <div style="font-size:12px;font-weight:700;color:#64707f;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">On-site location check</div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:10px"><input type="checkbox" id="cg-on" ${geo.enabled?'checked':''}> Only accept clock-ins near the hotel</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <label style="font-size:11px;font-weight:700;color:#64707f">Radius (m)<input id="cg-rad" value="${geo.radius}" style="display:block;width:80px;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px"></label>
            <button onclick="spClockUseHere()" style="padding:8px 12px;border:1px solid #2B726A;border-radius:8px;background:#fff;color:#2B726A;font:700 12px Lato;cursor:pointer">📍 Set to here</button>
          </div>
          <div id="cg-coords" style="font-size:11px;color:#64707f;margin-top:6px">${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px">
        <div style="font-size:14px;font-weight:800;color:#1a2b3a">Staff PINs (${rows.length})</div>
        <button onclick="spClockPrintCards()" style="padding:7px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:700 12px Lato;cursor:pointer;color:#1a2b3a">🖨 Print PIN slips</button>
      </div>
      <div style="max-height:260px;overflow:auto;border:1px solid #eef1f4;border-radius:10px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead style="position:sticky;top:0"><tr style="background:#f5f7f9;text-align:left">
            <th style="padding:7px 10px;font-size:11px;text-transform:uppercase;color:#64707f">Name</th>
            <th style="padding:7px 10px;font-size:11px;text-transform:uppercase;color:#64707f">Code</th>
            <th style="padding:7px 10px;font-size:11px;text-transform:uppercase;color:#64707f">PIN</th></tr></thead>
          <tbody>${rows.map(r=>`<tr style="border-top:1px solid #eef1f4">
            <td style="padding:6px 10px;font-weight:600">${(typeof spEsc==='function'?spEsc(r.name):r.name)}</td>
            <td style="padding:6px 10px;color:#4b5563">${r.code}</td>
            <td style="padding:6px 10px;font-weight:800;letter-spacing:2px;font-variant-numeric:tabular-nums">${r.pin}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
        <button onclick="document.getElementById('clock-modal').remove()" style="padding:10px 16px;border:1px solid #d1d5db;border-radius:9px;background:#fff;font:700 13px Lato;cursor:pointer;color:#374151">Close</button>
        <button onclick="spSaveClockGeoThenPublish()" style="padding:10px 18px;border:none;border-radius:9px;background:#2B726A;color:#fff;font:800 13px Lato;cursor:pointer">Save &amp; publish</button>
      </div>
      <div style="font-size:11px;color:#9aa7b5;margin-top:10px">PINs are issued to staff once; the roster stores only a hashed PIN, never the digits. Re-open here any time to see them.</div>
    </div></div>`;
  document.body.appendChild(m);
  try{ new QRCode(document.getElementById('clock-qr'), { text:url, width:180, height:180, correctLevel:QRCode.CorrectLevel.M }); }catch(e){ document.getElementById('clock-qr').textContent='QR unavailable'; }
}
function spClockUseHere(){
  if(!navigator.geolocation){ if(typeof toast==='function') toast('Location not available on this device'); return; }
  navigator.geolocation.getCurrentPosition(p=>{ const g=clockGeo(); g.lat=p.coords.latitude; g.lng=p.coords.longitude; clockSaveGeo(g);
    const el=document.getElementById('cg-coords'); if(el) el.textContent=g.lat.toFixed(4)+', '+g.lng.toFixed(4);
    if(typeof toast==='function') toast('Hotel location set'); }, ()=>{ if(typeof toast==='function') toast('Could not get location'); }, {enableHighAccuracy:true,timeout:8000});
}
function spSaveClockGeoThenPublish(){
  const g=clockGeo(); const on=document.getElementById('cg-on'), rad=document.getElementById('cg-rad');
  if(on) g.enabled=on.checked; if(rad) g.radius=Math.max(30,+rad.value||250); clockSaveGeo(g);
  spPublishClockRoster().then(ok=>{ if(ok){ const m=document.getElementById('clock-modal'); if(m) m.remove(); } });
}
function spClockPoster(){
  const url=clockUrl(); const w=window.open('','_blank'); if(!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Clock-in poster</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
    <style>body{font-family:system-ui,sans-serif;text-align:center;padding:50px 30px;color:#1a2b3a}
    h1{font-size:40px;margin:0}.t{font-size:15px;letter-spacing:3px;color:#2B726A;font-weight:700;text-transform:uppercase}
    #q{margin:30px auto;display:inline-block;padding:20px;border:3px solid #1a2b3a;border-radius:18px}
    p{font-size:20px;color:#374151;margin:8px 0}.big{font-size:26px;font-weight:800;margin-top:20px}
    small{color:#64707f}</style></head><body>
    <div class="t">Brandon Hall Hotel &amp; Spa</div><h1>Staff Clock-in</h1>
    <div id="q"></div>
    <p class="big">📱 Scan with your phone camera</p>
    <p>Then pick your name and enter your PIN to clock <b>IN</b> or <b>OUT</b>.</p>
    <p><small>${url}</small></p>
    <script>new QRCode(document.getElementById('q'),{text:${JSON.stringify(url)},width:300,height:300});setTimeout(()=>window.print(),600);<\/script>
    </body></html>`);
  w.document.close();
}
function spClockPrintCards(){
  const rows=clockRoster(), url=clockUrl(); const w=window.open('','_blank'); if(!w) return;
  const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Staff PIN slips</title>
    <style>body{font-family:system-ui,sans-serif;padding:16px;color:#1a2b3a}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .c{border:1px dashed #9aa7b5;border-radius:10px;padding:12px 14px;page-break-inside:avoid}
    .n{font-size:16px;font-weight:800}.k{font-size:12px;color:#64707f;margin-top:2px}
    .pin{font-size:30px;font-weight:800;letter-spacing:4px;margin-top:6px}
    .u{font-size:10px;color:#64707f;margin-top:6px}</style></head><body>
    <h2>Brandon Hall — Staff clock-in PINs (confidential)</h2>
    <div class="grid">${rows.map(r=>`<div class="c"><div class="n">${esc(r.name)}</div>
      <div class="k">Code ${esc(r.code)}</div><div class="pin">${r.pin}</div>
      <div class="u">Scan the wall poster, pick your name, enter this PIN.</div></div>`).join('')}</div>
    <script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
  w.document.close();
}

/* Pull live QR punches for the current pay period into the reconciliation */
async function spLoadQRClockins(){
  if(typeof FB==="undefined" || !FB.ready || !FB.user){ if(typeof toast==='function') toast('Sign in to load live clock-ins'); return; }
  const out=document.getElementById('sp-cmp-out'); if(out) out.innerHTML='<div style="padding:10px;color:#64707f;font-size:13px">Loading live clock-ins…</div>';
  const P=spPayPeriod(); const from=spDK(P.days[0]), to=spDK(P.days[P.days.length-1]);
  try{
    const snap=await FB.db.collection('clock_punches').where('date','>=',from).where('date','<=',to).get();
    const data=[];
    snap.forEach(d=>{ const r=d.data(); data.push([r.staffCode||'', r.name||'', r.date||'', r.time||'']); });
    if(!data.length){ if(out) out.innerHTML='<div style="background:#eef2f8;border:1px solid #d3deee;border-radius:10px;padding:12px;font-size:13px;color:#2f4a6b">No QR clock-ins recorded for '+from+' to '+to+' yet. Once staff start tapping the poster, they appear here.</div>'; return; }
    data.sort((a,b)=>a[1].localeCompare(b[1])||a[2].localeCompare(b[2])||a[3].localeCompare(b[3]));
    spCmp={ file:'Live QR clock-ins ('+from+' → '+to+')', head:['Staff Code','Name','Date','Punch'],
      data, map:{code:0,name:1,date:2,punch:3}, result:null };
    spCmpRun(); spCmpRender();
  }catch(e){ if(out) out.innerHTML='<div style="color:#b3261e;font-size:13px">Could not load clock-ins: '+e.message+'</div>'; }
}

// ── Staff rota link + publishing the rota for staff phones ───
const HP_PUBLIC_FB={apiKey:"AIzaSyDnPWrPGInDRTCF1Go710XC_8_77l_72i0",authDomain:"brandonhall-7bdef.firebaseapp.com",projectId:"brandonhall-7bdef",storageBucket:"brandonhall-7bdef.firebasestorage.app",messagingSenderId:"391317900568",appId:"1:391317900568:web:643c9d6691f7f16d65226d"};
function hpPublicDb(){
  try{
    if(!window.firebase||!firebase.initializeApp||!firebase.firestore) return null;
    let app; try{ app=firebase.app('hppublic'); }catch(e){ app=firebase.initializeApp(HP_PUBLIC_FB,'hppublic'); }
    return app.firestore();
  }catch(e){ return null; }
}
let spPubTimer=null;
function spQueuePublish(){ clearTimeout(spPubTimer); spPubTimer=setTimeout(()=>spPublishRota(true),2500); }
/* Writes names, roles and shifts only (no pay rates) from 2 weeks back to 10 weeks ahead */
async function spPublishRota(silent){
  const db=hpPublicDb();
  if(!db){ if(!silent) toast('Could not reach the live database — check internet'); return false; }
  const rota=spGetRota(), staff=spGetStaff();
  const from=new Date(); from.setDate(from.getDate()-14); const to=new Date(); to.setDate(to.getDate()+70);
  const fk=spDK(from), tk=spDK(to), out={};
  Object.keys(rota).filter(k=>k>=fk&&k<=tk).forEach(k=>{ out[k]={}; Object.entries(rota[k]||{}).forEach(([id,v])=>{ const c=spCell(v); out[k][id]=c.dept?{shift:c.shift,dept:c.dept}:c.shift; }); });
  try{
    await db.collection('hospro_public').doc('rota').set({
      updated:new Date().toISOString(), by:(SESSION&&SESSION.name)||'',
      staff:staff.map(s=>({id:s.id,staffCode:String(s.staffCode||''),name:s.name,role:s.role||'',dept:s.dept||''})),
      depts:SP_DEPTS.map(d=>({id:d.id,name:d.name})),
      rota:out
    });
    try{ localStorage.setItem('sp_rota_published',new Date().toISOString()); }catch(e){}
    if(!silent) toast('✓ Rota published — staff links are up to date');
    if(typeof hpPublishSummary==='function') setTimeout(()=>hpPublishSummary(true),500);
    const st=document.getElementById('sp-pub-status'); if(st) st.textContent='Last published: just now';
    return true;
  }catch(e){
    console.warn('Rota publish failed',e);
    if(!silent) toast('Publish failed — the Firestore rule for hospro_public may be missing');
    const st=document.getElementById('sp-pub-status'); if(st) st.textContent='Publish failed: '+(e.code||e.message||'error')+' — check the Firestore rule';
    return false;
  }
}
function spRotaBaseUrl(){ return location.origin+location.pathname.replace(/[^\/]*$/,'')+'my-rota.html'; }
function spShareRotaLink(){
  const base=spRotaBaseUrl(), staff=spGetStaff().slice().sort((a,b)=>a.name.localeCompare(b.name));
  const last=localStorage.getItem('sp_rota_published');
  const lastTxt=last?'Last published: '+new Date(last).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Not published from this computer yet';
  const msg=spRotaMsg;
  showModal('Staff rota link','Share with staff by WhatsApp, text or email',`
    <div style="font-size:13px;color:#1a2b3a;line-height:1.5">
      <div style="font-weight:800;margin-bottom:4px">Link for all staff</div>
      <div style="display:flex;gap:6px;margin-bottom:6px"><input id="sp-link-all" readonly value="${base}" style="flex:1;padding:9px;border:1px solid #d1d5db;border-radius:8px;font:13px Lato">
        <button onclick="spCopy(document.getElementById('sp-link-all').value)" style="padding:8px 12px;border:none;border-radius:8px;background:#1a2b3a;color:#fff;font:700 12px Lato;cursor:pointer">Copy</button>
        <a href="https://wa.me/?text=${encodeURIComponent(msg(base))}" target="_blank" rel="noopener" style="padding:8px 12px;border-radius:8px;background:#25D366;color:#fff;font:700 12px Lato;text-decoration:none">WhatsApp</a></div>
      <div style="font-size:12px;color:#4b5563;margin-bottom:14px">Staff pick their name, then see their shifts.</div>
      <div style="font-weight:800;margin-bottom:4px">Personal link (opens straight to one person's shifts)</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <select id="sp-link-person" onchange="spLinkPick(this.value)" style="flex:1;min-width:180px;padding:9px;border:1px solid #d1d5db;border-radius:8px;font:13px Lato">
          ${staff.map(s=>`<option value="${spEsc(s.id)}">${spEsc(s.name)}</option>`).join('')}
        </select></div>
      <div style="display:flex;gap:6px;margin-top:6px"><input id="sp-link-one" readonly value="${base}?staff=${encodeURIComponent(staff[0]?staff[0].id:'')}" style="flex:1;padding:9px;border:1px solid #d1d5db;border-radius:8px;font:13px Lato">
        <button onclick="spCopy(document.getElementById('sp-link-one').value)" style="padding:8px 12px;border:none;border-radius:8px;background:#1a2b3a;color:#fff;font:700 12px Lato;cursor:pointer">Copy</button>
        <a id="sp-link-wa" href="https://wa.me/?text=${encodeURIComponent(msg(base+'?staff='+encodeURIComponent(staff[0]?staff[0].id:'')))}" target="_blank" rel="noopener" style="padding:8px 12px;border-radius:8px;background:#25D366;color:#fff;font:700 12px Lato;text-decoration:none">WhatsApp</a></div>
      <div style="margin-top:16px;padding:12px;border-radius:10px;background:#E2F1EE">
        <div style="font-weight:800">Keep staff links up to date</div>
        <div style="font-size:12.5px;color:#374151;margin:2px 0 8px">The rota is published automatically whenever you Save &amp; Approve. Use this if you want to push it now.</div>
        <button onclick="spPublishRota(false)" style="padding:8px 14px;border:none;border-radius:8px;background:#2B726A;color:#fff;font:700 12px Lato;cursor:pointer">Publish rota now</button>
        <span id="sp-pub-status" style="font-size:12px;color:#374151;margin-left:8px">${lastTxt}</span>
      </div>
    </div>`);
}
function spRotaMsg(u){ return "Hi, here is your Brandon Hall rota link. It always shows your latest shifts for the next two weeks:\n"+u+"\nOpen it and enter your staff ID (the payroll number on your payslip). Tick 'Remember me' and save it to your home screen so it's easy to find."; }
function spLinkPick(id){
  const u=spRotaBaseUrl()+'?staff='+encodeURIComponent(id);
  document.getElementById('sp-link-one').value=u;
  document.getElementById('sp-link-wa').href='https://wa.me/?text='+encodeURIComponent(spRotaMsg(u));
}
function spCopy(t){
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('✓ Link copied')).catch(()=>{ const i=document.createElement('textarea'); i.value=t; document.body.appendChild(i); i.select(); try{document.execCommand('copy'); toast('✓ Link copied');}catch(e){} i.remove(); });
}

/* ============================================================ HosSALES — Local events within 20 miles
   Researched 7 Oct 2026. Distances are straight-line miles from Brandon Hall (CV8 3FW). */
const HP_EVENT_VENUES=[{"name": "Ryton Pools Country Park", "town": "Ryton-on-Dunsmore", "approxMiles": 1.3, "category": "Festival & outdoor", "capacity": "", "url": "https://www.warwickshire.gov.uk/countryparks", "note": "Small outdoor events; country park next to hotel"}, {"name": "Coombe Abbey Park", "town": "Binley, Coventry", "approxMiles": 2.4, "category": "Festival & outdoor", "capacity": "", "url": "https://www.coventry.gov.uk/directory-record/57116/coombe-abbey-park", "note": "Council-run country park; seasonal outdoor events (plus Coombe Abbey Hotel banquets)"}, {"name": "Coventry Cathedral", "town": "Coventry", "approxMiles": 4.3, "category": "Heritage & castle", "capacity": "", "url": "https://www.coventrycathedral.org.uk/events/whats-on", "note": "Concerts, organ recitals, Christmas programme"}, {"name": "HMV Empire", "town": "Coventry", "approxMiles": 4.4, "category": "Comedy & music club", "capacity": "", "url": "https://www.hmvempire.co.uk/", "note": "Approx. 1,200-capacity live music venue; official site could not be fetched"}, {"name": "War Memorial Park (Godiva Festival site)", "town": "Coventry", "approxMiles": 4.4, "category": "Festival & outdoor", "capacity": "", "url": "https://www.godivafestival.com/", "note": "Godiva Festival, early July"}, {"name": "Coventry Transport Museum", "town": "Coventry", "approxMiles": 4.5, "category": "Heritage & castle", "capacity": "", "url": "https://www.transport-museum.com/", "note": "Events and exhibitions; official what's-on URL not fetched"}, {"name": "Belgrade Theatre", "town": "Coventry", "approxMiles": 4.7, "category": "Theatre", "capacity": "c. 850 (main house)", "url": "https://www.belgrade.co.uk/whats-on/", "note": "Main producing theatre; annual panto. Site could not be fetched"}, {"name": "Skydome Arena (Coventry Blaze)", "town": "Coventry", "approxMiles": 4.7, "category": "Arena", "capacity": "c. 3,000", "url": "https://coventryblaze.co.uk/", "note": "Elite League ice hockey; Boxing Day and New Year's Day derbies"}, {"name": "Albany Theatre", "town": "Coventry", "approxMiles": 4.9, "category": "Theatre", "capacity": "c. 650", "url": "https://www.albanytheatre.co.uk/", "note": "Touring shows, comedy, panto (domain confirmed via indexed pages)"}, {"name": "Nick Newbold Stadium (formerly Butts Park Arena)", "town": "Coventry", "approxMiles": 5.0, "category": "Stadium", "capacity": "c. 4,000", "url": "https://coventryrugby.co.uk/", "note": "Coventry Rugby (Champ Rugby) home ground; renamed from Butts Park Arena"}, {"name": "Stoneleigh Park (NAEC Stoneleigh)", "town": "Stoneleigh, Kenilworth", "approxMiles": 5.5, "category": "Exhibition centre", "capacity": "", "url": "https://www.stoneleighpark.co.uk/", "note": "Agricultural/exhibition showground; official site blocked automated fetch"}, {"name": "Coventry Building Society Arena", "town": "Coventry (Longford)", "approxMiles": 5.7, "category": "Stadium", "capacity": "32,609", "url": "https://www.coventrybuildingsocietyarena.co.uk/whats-on", "note": "Coventry City FC (Premier League 2026/27), stadium concerts, exhibitions and conferences"}, {"name": "Warwick Arts Centre", "town": "Coventry (University of Warwick)", "approxMiles": 6.3, "category": "Concert hall", "capacity": "Butterworth Hall c. 1,500", "url": "https://www.warwickartscentre.co.uk/whats-on/events/", "note": "Theatre, comedy, concerts, cinema"}, {"name": "Rugby Theatre", "town": "Rugby", "approxMiles": 6.9, "category": "Theatre", "capacity": "c. 300", "url": "https://www.rugbytheatre.co.uk/rugby-theatre-show-guide/", "note": "Volunteer-run producing theatre"}, {"name": "Talisman Theatre", "town": "Kenilworth", "approxMiles": 7.2, "category": "Theatre", "capacity": "c. 150", "url": "https://www.talismantheatre.co.uk/", "note": "Amateur theatre; not verified"}, {"name": "Kenilworth Castle and Elizabethan Garden", "town": "Kenilworth", "approxMiles": 7.9, "category": "Heritage & castle", "capacity": "", "url": "https://www.english-heritage.org.uk/visit/places/kenilworth-castle/events/", "note": "English Heritage; Knights' Tournament (August bank holiday), fireworks, Halloween, Christmas"}, {"name": "Royal Spa Centre", "town": "Leamington Spa", "approxMiles": 8.3, "category": "Theatre", "capacity": "667 (theatre) + 188 (cinema)", "url": "https://www.warwickdc.gov.uk/royalspacentre/", "note": "Council venue; council page notes intermittent website issues; check status"}, {"name": "The Assembly", "town": "Leamington Spa", "approxMiles": 8.4, "category": "Comedy & music club", "capacity": "c. 1,000", "url": "https://www.assemblyleamington.co.uk/", "note": "Live music venue; official site not verified"}, {"name": "Arbury Hall", "town": "Nuneaton", "approxMiles": 9.2, "category": "Heritage & castle", "capacity": "", "url": "https://www.arburyestate.co.uk/", "note": "Stately home with occasional events and fairs; not verified"}, {"name": "Abbey Theatre", "town": "Nuneaton", "approxMiles": 10.1, "category": "Theatre", "capacity": "c. 280", "url": "https://ents24.com/nuneaton-events/abbey-theatre", "note": "Listing via Ents24; official site not verified"}, {"name": "Warwick Castle", "town": "Warwick", "approxMiles": 10.2, "category": "Heritage & castle", "capacity": "", "url": "https://www.warwick-castle.com/explore/events/", "note": "Seasonal events, Christmas at the Castle, short breaks"}, {"name": "Warwick Racecourse", "town": "Warwick", "approxMiles": 10.3, "category": "Racecourse", "capacity": "", "url": "https://www.thejockeyclub.co.uk/warwick/events-tickets/", "note": "Jump racing; Classic Chase (Jan), Kingmaker (Feb)"}, {"name": "Concordia Theatre", "town": "Hinckley", "approxMiles": 11.1, "category": "Theatre", "capacity": "c. 200", "url": "https://www.hinckley-bosworth.gov.uk/events/full?offset=0", "note": "Community theatre; council events listing used"}, {"name": "Packington Estate", "town": "Meriden", "approxMiles": 11.2, "category": "Festival & outdoor", "capacity": "", "url": "https://www.goodfoodshow.com/", "note": "New home of BBC Gardeners' World Live and the Good Food Festival from 2027; Festival of Sport"}, {"name": "Stanford Hall", "town": "Lutterworth (Leics)", "approxMiles": 11.8, "category": "Festival & outdoor", "capacity": "", "url": "https://www.songkick.com/venues/14803-stanford-hall", "note": "The Long Road country festival (late Aug); car/club rallies"}, {"name": "British Motor Museum", "town": "Gaydon", "approxMiles": 13.7, "category": "Heritage & castle", "capacity": "", "url": "https://www.britishmotormuseum.co.uk/whats-on", "note": "Classic car shows most summer weekends; URL from press, not fetched"}, {"name": "NEC Birmingham", "town": "Birmingham (Marston Green)", "approxMiles": 13.8, "category": "Exhibition centre", "capacity": "20 halls", "url": "https://www.thenec.co.uk/whats-on/", "note": "Crufts, Motorcycle Live, Classic Motor Show, Horse of the Year Show, Invictus Games 2027"}, {"name": "bp pulse LIVE (formerly Resorts World Arena)", "town": "Birmingham (NEC)", "approxMiles": 13.8, "category": "Arena", "capacity": "c. 15,700", "url": "https://www.bppulselive.co.uk/whats-on", "note": "Renamed 2024; major arena tours"}, {"name": "Bosworth Battlefield Heritage Centre", "town": "Sutton Cheney (Leics)", "approxMiles": 14.4, "category": "Heritage & castle", "capacity": "", "url": "https://www.bosworthbattlefield.org.uk/whats-on/", "note": "Bosworth Medieval Festival (August)"}, {"name": "Mallory Park Circuit", "town": "Kirkby Mallory (Leics)", "approxMiles": 15.2, "category": "Festival & outdoor", "capacity": "", "url": "https://www.malloryparkcircuit.com/events/", "note": "Motor racing circuit (cars and bikes)"}, {"name": "Compton Verney", "town": "Compton Verney", "approxMiles": 15.7, "category": "Heritage & castle", "capacity": "", "url": "https://www.comptonverney.org.uk/whats-on/", "note": "Art gallery and park; exhibitions, concerts, outdoor events"}, {"name": "Royal Shakespeare Company (RST, Swan, The Other Place)", "town": "Stratford-upon-Avon", "approxMiles": 18.2, "category": "Theatre", "capacity": "RST c. 1,040", "url": "https://www.rsc.org.uk/whats-on", "note": "Inside 20 miles (approx. 18 mi straight line)"}, {"name": "De Montfort Hall", "town": "Leicester", "approxMiles": 20.8, "category": "Concert hall", "capacity": "c. 2,000", "url": "https://www.demontforthall.co.uk/", "note": "Just outside 20 miles; official site not verified"}, {"name": "Edgbaston Stadium", "town": "Birmingham", "approxMiles": 21.3, "category": "Stadium", "capacity": "c. 25,000", "url": "https://www.edgbaston.com/", "note": "Just outside 20 miles; Ashes Test July 2027"}, {"name": "Birmingham Hippodrome", "town": "Birmingham", "approxMiles": 21.4, "category": "Theatre", "capacity": "c. 1,850", "url": "https://www.birminghamhippodrome.com/", "note": "Just outside 20 miles"}, {"name": "Symphony Hall (B:Music)", "town": "Birmingham", "approxMiles": 22.0, "category": "Concert hall", "capacity": "c. 2,200", "url": "https://bmusic.co.uk/whats-on", "note": "Just outside 20 miles"}, {"name": "Utilita Arena Birmingham", "town": "Birmingham", "approxMiles": 22.2, "category": "Arena", "capacity": "up to 15,800", "url": "https://www.utilitaarenabham.co.uk/", "note": "Just outside 20 miles; official URL not verified (utilitaarena.co.uk is the Newcastle arena)"}];
const HP_EVENT_LISTINGS=[{"name": "Visit Coventry - Events", "url": "https://visitcoventry.co.uk/whats-on/events/", "note": "Official city tourism events hub (verified)"}, {"name": "Visit Coventry - Gigs & Concerts", "url": "https://visitcoventry.co.uk/whats-on/events/gigs-concerts/", "note": "Music listings for Coventry"}, {"name": "Shakespeare's England - What's On", "url": "https://www.shakespeares-england.co.uk/whats-on/", "note": "Official Warwickshire tourism listings; filter by town/date (verified)"}, {"name": "Shakespeare's England - Christmas", "url": "https://www.shakespeares-england.co.uk/whats-on/christmas/", "note": "Festive events across Warwickshire"}, {"name": "Coventry City Council - Events", "url": "https://www.coventry.gov.uk/events", "note": "Council events incl. Christmas market, Godiva Festival, Big Wheel"}, {"name": "Warwick District Council - Events", "url": "https://www.warwickdc.gov.uk/events", "note": "Leamington, Warwick and Kenilworth events incl. Peace Festival"}, {"name": "Ents24 - What's on near Coventry", "url": "https://www.ents24.com/whatson/coventry", "note": "Aggregated gig/show listings with date filter (verified)"}, {"name": "Ents24 - What's on near Warwick", "url": "https://www.ents24.com/whatson/warwick", "note": "Verified"}, {"name": "Ents24 - What's on near Leamington Spa", "url": "https://www.ents24.com/whatson/leamington-spa", "note": "Not fetched"}, {"name": "Skiddle - Coventry events", "url": "https://www.skiddle.com/whats-on/events/Coventry/", "note": "Club nights, gigs, festivals; site blocks automated fetch"}, {"name": "Songkick - Coventry Building Society Arena", "url": "https://www.songkick.com/venues/3849-coventry-building-society-arena", "note": "Concert tracker for the stadium (verified)"}, {"name": "Stereoboard - Coventry venues", "url": "https://www.stereoboard.com/venues/coventry", "note": "Gig listings by venue"}, {"name": "Coventry Telegraph - What's On", "url": "https://www.coventrytelegraph.net/whats-on/", "note": "Local news on shows/events (theatre-news subsection verified)"}, {"name": "What's On Live - Warwickshire", "url": "https://www.whatsonlive.co.uk/warwickshire/", "note": "Regional arts and entertainment magazine"}, {"name": "NEC Group - What's On (all NEC Group venues)", "url": "https://www.thenec.co.uk/whats-on/", "note": "Covers NEC, bp pulse LIVE and Utilita Arena Birmingham (verified)"}, {"name": "Visit Leicester - What's On", "url": "https://www.visitleicester.info/whats-on", "note": "For Hinckley, Lutterworth, Bosworth and Leicester"}];
const HP_EVENT_DATES=[{"name": "Horse of the Year Show 2026", "venue": "NEC Birmingham / bp pulse LIVE", "start": "2026-10-07", "end": "2026-10-11", "url": "https://www.thenec.co.uk/whats-on/", "category": "Equestrian"}, {"name": "Coventry City v Newcastle United (Premier League)", "venue": "Coventry Building Society Arena", "start": "2026-10-12", "end": "2026-10-12", "url": "https://www.teamtalk.com/coventry-city/fixtures", "category": "Football", "note": "Date from one secondary source; confirm with the club"}, {"name": "The Motorhome and Caravan Show", "venue": "NEC Birmingham", "start": "2026-10-13", "end": "2026-10-18", "url": "https://www.thenec.co.uk/whats-on/", "category": "Exhibition"}, {"name": "Westlife (3 nights)", "venue": "bp pulse LIVE", "start": "2026-10-16", "end": "2026-10-18", "url": "https://www.bppulselive.co.uk/whats-on", "category": "Concert"}, {"name": "Coventry City v Fulham (Premier League)", "venue": "Coventry Building Society Arena", "start": "2026-10-24", "end": "2026-10-24", "url": "https://www.teamtalk.com/coventry-city/fixtures", "category": "Football"}, {"name": "The Haunted Castle (Halloween)", "venue": "Warwick Castle", "start": "2026-10-24", "end": "2026-11-01", "url": "https://www.warwick-castle.com/explore/events/", "category": "Seasonal"}, {"name": "Coventry City v Sunderland (Premier League)", "venue": "Coventry Building Society Arena", "start": "2026-10-31", "end": "2026-10-31", "url": "https://www.teamtalk.com/coventry-city/fixtures", "category": "Football"}, {"name": "Stan Mellor Chase Day", "venue": "Warwick Racecourse", "start": "2026-11-03", "end": "2026-11-03", "url": "https://www.thejockeyclub.co.uk/warwick/events-tickets/", "category": "Racing"}, {"name": "Cake International / Simply Christmas / Creative Craft Show", "venue": "NEC Birmingham", "start": "2026-11-05", "end": "2026-11-08", "url": "https://www.thenec.co.uk/whats-on/", "category": "Exhibition"}, {"name": "Round Table Fireworks Spectacular", "venue": "Kenilworth Castle", "start": "2026-11-07", "end": "2026-11-07", "url": "https://www.english-heritage.org.uk/visit/whats-on/kenilworth-castle-roundtable-fireworks-spectacular/", "category": "Seasonal"}, {"name": "Bill Bailey", "venue": "Coventry Building Society Arena", "start": "2026-11-13", "end": "2026-11-13", "url": "https://www.coventrybuildingsocietyarena.co.uk/whats-on", "category": "Comedy"}, {"name": "Lancaster Insurance Classic Motor Show", "venue": "NEC Birmingham", "start": "2026-11-13", "end": "2026-11-15", "url": "https://www.thenec.co.uk/whats-on/", "category": "Exhibition"}, {"name": "Christmas at the Castle", "venue": "Warwick Castle", "start": "2026-11-21", "end": "2027-01-03", "url": "https://www.warwick-castle.com/explore/events/", "category": "Seasonal"}, {"name": "Motorcycle Live", "venue": "NEC Birmingham", "start": "2026-11-21", "end": "2026-11-29", "url": "https://www.thenec.co.uk/whats-on/", "category": "Exhibition"}, {"name": "Festive Good Food Show", "venue": "NEC Birmingham", "start": "2026-11-26", "end": "2026-11-29", "url": "https://www.goodfoodshow.com/", "category": "Exhibition"}, {"name": "The Three Musketeers (RSC Christmas show)", "venue": "Royal Shakespeare Theatre, Stratford-upon-Avon", "start": "2026-11-28", "end": "2027-01-09", "url": "https://www.rsc.org.uk/whats-on", "category": "Theatre"}, {"name": "Sleeping Beauty (pantomime)", "venue": "Birmingham Hippodrome", "start": "2026-12-19", "end": "2027-01-31", "url": "https://www.birminghamhippodrome.com/", "category": "Theatre"}, {"name": "Carols at the Castle", "venue": "Warwick Castle", "start": "2026-12-19", "end": "2026-12-19", "url": "https://www.warwick-castle.com/explore/events/", "category": "Seasonal"}, {"name": "Coventry Rugby v Hartpury (Boxing Day)", "venue": "Nick Newbold Stadium", "start": "2026-12-26", "end": "2026-12-26", "url": "https://coventryrugby.co.uk/news/coventry-rugby-s-2026-27-elior-champ-rugby-fixtures-announced", "category": "Rugby"}, {"name": "Coventry Blaze v Cardiff Devils (Boxing Day)", "venue": "Skydome Arena", "start": "2026-12-26", "end": "2026-12-26", "url": "https://coventryblaze.co.uk/26-27-fixtures-released/", "category": "Ice hockey"}, {"name": "New Year's Eve Raceday", "venue": "Warwick Racecourse", "start": "2026-12-31", "end": "2026-12-31", "url": "https://www.thejockeyclub.co.uk/warwick/events-tickets/", "category": "Racing"}, {"name": "Coventry Blaze v Nottingham Panthers (New Year's Day derby)", "venue": "Skydome Arena", "start": "2027-01-01", "end": "2027-01-01", "url": "https://coventryblaze.co.uk/26-27-fixtures-released/", "category": "Ice hockey"}, {"name": "William Hill Classic Chase Day", "venue": "Warwick Racecourse", "start": "2027-01-16", "end": "2027-01-16", "url": "https://www.thejockeyclub.co.uk/warwick/events-tickets/", "category": "Racing"}, {"name": "Strictly Come Dancing Live Tour", "venue": "Utilita Arena Birmingham", "start": "2027-01-22", "end": "2027-01-24", "url": "https://www.thenec.co.uk/whats-on/", "category": "Live show"}, {"name": "Jack Whitehall - Bad Influence Tour", "venue": "Coventry Building Society Arena", "start": "2027-01-27", "end": "2027-01-27", "url": "https://www.coventrybuildingsocietyarena.co.uk/whats-on", "category": "Comedy"}, {"name": "Kingmaker Chase Day", "venue": "Warwick Racecourse", "start": "2027-02-13", "end": "2027-02-13", "url": "https://www.thejockeyclub.co.uk/warwick/events-tickets/", "category": "Racing"}, {"name": "Caravan, Camping and Motorhome Show", "venue": "NEC Birmingham", "start": "2027-02-16", "end": "2027-02-21", "url": "https://www.thenec.co.uk/whats-on/", "category": "Exhibition"}, {"name": "Crufts 2027", "venue": "NEC Birmingham", "start": "2027-03-04", "end": "2027-03-07", "url": "https://www.crufts.org.uk/", "category": "Exhibition"}, {"name": "YONEX All England Open Badminton Championships", "venue": "Utilita Arena Birmingham", "start": "2027-03-04", "end": "2027-03-14", "url": "https://www.thenec.co.uk/whats-on/", "category": "Sport"}, {"name": "Practical Classics Classic Car & Restoration Show", "venue": "NEC Birmingham", "start": "2027-03-19", "end": "2027-03-21", "url": "https://necrestorationshow.com", "category": "Exhibition"}, {"name": "The Enemy - 20th anniversary homecoming", "venue": "Coventry Building Society Arena", "start": "2027-03-20", "end": "2027-03-20", "url": "https://www.coventrybuildingsocietyarena.co.uk/whats-on", "category": "Concert"}, {"name": "Coventry Rugby v Ealing Trailfinders (Easter)", "venue": "Nick Newbold Stadium", "start": "2027-03-27", "end": "2027-03-27", "url": "https://coventryrugby.co.uk/news/coventry-rugby-s-2026-27-elior-champ-rugby-fixtures-announced", "category": "Rugby"}, {"name": "Coventry Half Marathon", "venue": "Coventry city centre", "start": "2027-04-11", "end": "2027-04-11", "url": "https://www.timeoutdoors.com/events/coventry-half-marathon/half-marathon", "category": "Sport"}, {"name": "BBC Gardeners' World Live (new venue)", "venue": "Packington Estate, Meriden", "start": "2027-06-17", "end": "2027-06-20", "url": "https://www.oswestry.life/article/new-home-for-bbc-gardeners-world-live-and-good-food-show-summer/", "category": "Exhibition"}, {"name": "Good Food Festival (replaces Good Food Show Summer)", "venue": "Packington Estate, Meriden", "start": "2027-06-17", "end": "2027-06-20", "url": "https://www.goodfoodshow.com/", "category": "Festival"}, {"name": "Men's Ashes 3rd Test - England v Australia", "venue": "Edgbaston Stadium", "start": "2027-07-08", "end": "2027-07-12", "url": "https://www.edgbaston.com/media-article/mens-and-womens-ashes-cricket-to-headline-2027-summer-at-edgbaston", "category": "Cricket"}, {"name": "Invictus Games Birmingham 2027", "venue": "NEC Birmingham", "start": "2027-07-10", "end": "2027-07-17", "url": "https://www.invictusgamesfoundation.org/news/invictus-games-birmingham-2027-dates-confirmed", "category": "Sport"}, {"name": "Women's Ashes 3rd ODI", "venue": "Edgbaston Stadium", "start": "2027-07-20", "end": "2027-07-20", "url": "https://www.edgbaston.com/media-article/mens-and-womens-ashes-cricket-to-headline-2027-summer-at-edgbaston", "category": "Cricket"}, {"name": "The Long Road festival", "venue": "Stanford Hall, Lutterworth", "start": "2027-08-26", "end": "2027-08-29", "url": "https://thefestivals.uk/?p=42926", "category": "Festival"}, {"name": "England v New Zealand 1st ODI", "venue": "Edgbaston Stadium", "start": "2027-09-14", "end": "2027-09-14", "url": "https://www.edgbaston.com/media-article/mens-and-womens-ashes-cricket-to-headline-2027-summer-at-edgbaston", "category": "Cricket"}];

const HP_EVENT_VENUES_EXT=[{"name": "Villa Park (Aston Villa)", "town": "Birmingham", "approxMiles": 21.4, "category": "Stadium", "capacity": "42,600", "url": "https://www.avfc.co.uk", "note": "Premier League football — away fans and big concerts in summer", "extended": true}, {"name": "St Andrew's (Birmingham City)", "town": "Birmingham", "approxMiles": 20.0, "category": "Stadium", "capacity": "29,400", "url": "https://www.bcfc.com", "note": "Championship football", "extended": true}, {"name": "O2 Academy Birmingham", "town": "Birmingham", "approxMiles": 21.0, "category": "Comedy & music club", "capacity": "3,000", "url": "https://www.academymusicgroup.com/o2academybirmingham/", "note": "Touring bands most nights", "extended": true}, {"name": "Alexander Stadium", "town": "Birmingham", "approxMiles": 22.9, "category": "Stadium", "capacity": "18,000", "url": "https://www.birmingham.gov.uk/alexanderstadium", "note": "Athletics and stadium events", "extended": true}, {"name": "Cadbury World", "town": "Bournville", "approxMiles": 21.9, "category": "Heritage & castle", "capacity": "", "url": "https://www.cadburyworld.co.uk", "note": "Family attraction — groups and school holidays", "extended": true}, {"name": "Drayton Manor Resort", "town": "Tamworth", "approxMiles": 19.9, "category": "Festival & outdoor", "capacity": "", "url": "https://www.draytonmanor.co.uk", "note": "Theme park — family short breaks", "extended": true}, {"name": "King Power Stadium (Leicester City)", "town": "Leicester", "approxMiles": 19.8, "category": "Stadium", "capacity": "32,300", "url": "https://www.lcfc.com", "note": "Football — away fans", "extended": true}, {"name": "Mattioli Woods Welford Road (Leicester Tigers)", "town": "Leicester", "approxMiles": 20.2, "category": "Stadium", "capacity": "25,800", "url": "https://www.leicestertigers.com", "note": "Premiership rugby", "extended": true}, {"name": "Curve Theatre", "town": "Leicester", "approxMiles": 21.0, "category": "Theatre", "capacity": "1,500", "url": "https://www.curveonline.co.uk", "note": "Musicals and touring shows", "extended": true}, {"name": "cinch Stadium at Franklin's Gardens (Northampton Saints)", "town": "Northampton", "approxMiles": 23.4, "category": "Stadium", "capacity": "15,200", "url": "https://www.northamptonsaints.co.uk", "note": "Premiership rugby", "extended": true}, {"name": "Royal & Derngate", "town": "Northampton", "approxMiles": 24.5, "category": "Theatre", "capacity": "1,200", "url": "https://www.royalandderngate.co.uk", "note": "Touring theatre and comedy", "extended": true}, {"name": "Silverstone Circuit", "town": "Towcester", "approxMiles": 27.2, "category": "Festival & outdoor", "capacity": "150,000+", "url": "https://www.silverstone.co.uk", "note": "British Grand Prix (July) and MotoGP — huge room demand", "extended": true}, {"name": "Donington Park (Download Festival)", "town": "Castle Donington", "approxMiles": 30.7, "category": "Festival & outdoor", "capacity": "100,000+", "url": "https://www.donington-park.co.uk", "note": "Download Festival (June) and race meetings", "extended": true}, {"name": "Molineux Stadium (Wolves)", "town": "Wolverhampton", "approxMiles": 33.1, "category": "Stadium", "capacity": "31,700", "url": "https://www.wolves.co.uk", "note": "Football", "extended": true}, {"name": "The Halls Wolverhampton", "town": "Wolverhampton", "approxMiles": 33.0, "category": "Concert hall", "capacity": "3,000", "url": "https://www.thehallswolverhampton.co.uk", "note": "Concerts and comedy", "extended": true}, {"name": "Motorpoint Arena Nottingham", "town": "Nottingham", "approxMiles": 40.5, "category": "Arena", "capacity": "10,000", "url": "https://www.motorpointarenanottingham.com", "note": "Big-name concerts and ice hockey", "extended": true}, {"name": "Trent Bridge", "town": "Nottingham", "approxMiles": 39.8, "category": "Stadium", "capacity": "17,500", "url": "https://www.trentbridge.co.uk", "note": "Test and county cricket", "extended": true}, {"name": "Theatre Royal & Royal Concert Hall", "town": "Nottingham", "approxMiles": 40.8, "category": "Theatre", "capacity": "2,500", "url": "https://trch.co.uk", "note": "Touring musicals and concerts", "extended": true}, {"name": "Blenheim Palace", "town": "Woodstock", "approxMiles": 37.8, "category": "Heritage & castle", "capacity": "", "url": "https://www.blenheimpalace.com", "note": "Concerts, horse trials and Christmas lights", "extended": true}, {"name": "New Theatre Oxford", "town": "Oxford", "approxMiles": 44.3, "category": "Theatre", "capacity": "1,800", "url": "https://www.atgtickets.com/venues/new-theatre-oxford/", "note": "Touring shows", "extended": true}, {"name": "Cheltenham Racecourse", "town": "Cheltenham", "approxMiles": 42.2, "category": "Racecourse", "capacity": "", "url": "https://www.thejockeyclub.co.uk/cheltenham/", "note": "Cheltenham Festival (March) — very high demand", "extended": true}, {"name": "Milton Keynes Theatre", "town": "Milton Keynes", "approxMiles": 36.6, "category": "Theatre", "capacity": "1,400", "url": "https://www.atgtickets.com/venues/milton-keynes-theatre/", "note": "Touring musicals", "extended": true}, {"name": "Alton Towers Resort", "town": "Alton", "approxMiles": 45.9, "category": "Festival & outdoor", "capacity": "", "url": "https://www.altontowers.com", "note": "Theme park — family breaks", "extended": true}];
let hpEvFilter='All', hpEvRadius=20, hpEvShowPast=false, hpEvFrom='', hpEvTo='', hpEvQuick='all';
function hpEvGetCustom(){ try{ return JSON.parse(localStorage.getItem('hp_local_events')||'[]'); }catch(e){ return []; } }
function hpEvSaveCustom(l){ try{ localStorage.setItem('hp_local_events', JSON.stringify(l)); }catch(e){} }
function hpEvFmt(a,b){
  const o={day:'numeric',month:'short',year:'numeric'}, A=new Date(a+'T12:00'), B=new Date((b||a)+'T12:00');
  if(!b||a===b) return A.toLocaleDateString('en-GB',{weekday:'short',...o});
  return A.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' – '+B.toLocaleDateString('en-GB',o);
}
function hpEvAllVenues(){ return HP_EVENT_VENUES.concat(HP_EVENT_VENUES_EXT).sort((a,b)=>a.approxMiles-b.approxMiles); }
/* Distance for a dated event: from the venue list (first matching venue name), else unknown */
function hpEvMiles(e){
  if(e.miles!=null && e.miles!=='') return +e.miles;
  const v=String(e.venue||'').toLowerCase(); if(!v) return null;
  if(/coventry city centre/.test(v)) return 4.5;
  let best=null;
  hpEvAllVenues().forEach(x=>{ const key=x.name.toLowerCase().replace(/\s*\(.*\)/,'').split(/[,–-]/)[0].trim();
    if(key && (v.includes(key) || key.includes(v.split(/[,/]/)[0].trim()))){ if(best==null||x.approxMiles<best) best=x.approxMiles; } });
  return best;
}
function hpEvRedraw(){ renderLocalEvents(document.getElementById('view')); }
function hpEvSetRadius(r){
  const before=hpEvRadius; hpEvRadius=r; hpEvRedraw();
  if(r>before){
    const nV=hpEvAllVenues().filter(x=>x.approxMiles>before&&x.approxMiles<=r).length;
    const nE=HP_EVENT_DATES.filter(e=>{const m=hpEvMiles(e);return m!=null&&m>before&&m<=r;}).length;
    toast(`Range widened to ${r} miles — ${nV} more venue${nV===1?'':'s'}${nE?` and ${nE} more date${nE===1?'':'s'}`:''} added`, 4000);
  }
}
function hpEvSetQuick(q){
  hpEvQuick=q; const t=new Date(), k=d=>spDK(d);
  if(q==='all'){ hpEvFrom=''; hpEvTo=''; }
  else if(q==='30'){ const e=new Date(t); e.setDate(e.getDate()+30); hpEvFrom=k(t); hpEvTo=k(e); }
  else if(q==='90'){ const e=new Date(t); e.setDate(e.getDate()+90); hpEvFrom=k(t); hpEvTo=k(e); }
  else if(q==='month'){ hpEvFrom=k(new Date(t.getFullYear(),t.getMonth(),1,12)); hpEvTo=k(new Date(t.getFullYear(),t.getMonth()+1,0,12)); }
  else if(q==='next'){ hpEvFrom=k(new Date(t.getFullYear(),t.getMonth()+1,1,12)); hpEvTo=k(new Date(t.getFullYear(),t.getMonth()+2,0,12)); }
  hpEvRedraw();
}
function renderLocalEvents(v){
  const today=spDK(new Date()), esc=spEsc;
  const allV=hpEvAllVenues();
  const cats=['All',...new Set(allV.map(x=>x.category))];
  const venues=allV.filter(x=>x.approxMiles<=hpEvRadius && (hpEvFilter==='All'||x.category===hpEvFilter));
  const custom=hpEvGetCustom().map(e=>Object.assign({custom:true},e));
  const inRadius=e=>{ const m=hpEvMiles(e); return m==null || m<=hpEvRadius; };
  const inDates=e=>{ const st=e.start, en=e.end||e.start;
    if(hpEvFrom && en<hpEvFrom) return false; if(hpEvTo && st>hpEvTo) return false; return true; };
  const events=[...HP_EVENT_DATES,...custom].filter(e=>(hpEvShowPast||(e.end||e.start)>=today) && inRadius(e) && inDates(e)).sort((a,b)=>a.start.localeCompare(b.start));
  const soon=events.filter(e=>{const d=(new Date(e.start+'T12:00')-new Date())/864e5; return d<=60;}).length;
  const card='background:#fff;border:1px solid #e6e8ec;border-radius:12px';
  const chip=(t,on,js)=>`<button onclick="${js}" style="padding:6px 12px;border-radius:16px;border:1px solid ${on?'#6E4E7A':'#d6d9de'};background:${on?'#6E4E7A':'#fff'};color:${on?'#fff':'#1a2b3a'};font:700 12px Lato;cursor:pointer">${t}</button>`;
  const beyond=allV.filter(x=>x.approxMiles>20&&x.approxMiles<=hpEvRadius).length;
  const beyondE=HP_EVENT_DATES.filter(e=>{const m=hpEvMiles(e);return m!=null&&m>20&&m<=hpEvRadius;}).length;
  const inp='padding:7px 9px;border:1px solid #d1d5db;border-radius:8px;font:13px Lato;color:#1a2b3a';
  v.innerHTML=`<div style="padding:22px 26px;max-width:1300px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div><h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;margin:0;color:#1a2b3a">Local Events &amp; Shows</h2>
        <div style="font-size:13px;color:#4b5563">Concerts, shows, sport and exhibitions near Brandon Hall. Use these to sell room + dinner packages to people going to them.</div></div>
      <button onclick="hpEvAdd()" style="padding:9px 16px;border:none;border-radius:9px;background:#6E4E7A;color:#fff;font:700 13px Lato;cursor:pointer">+ Add an event</button>
    </div>

    <div style="${card};padding:14px 16px;margin-bottom:14px;display:grid;gap:10px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:800;color:#1a2b3a;text-transform:uppercase;letter-spacing:.4px;min-width:62px">Range</span>
        ${[20,30,40,50].map(r=>chip(r===20?'20 miles':`${r} miles`,hpEvRadius===r,`hpEvSetRadius(${r})`)).join('')}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:800;color:#1a2b3a;text-transform:uppercase;letter-spacing:.4px;min-width:62px">Dates</span>
        ${[['all','All upcoming'],['30','Next 30 days'],['90','Next 3 months'],['month','This month'],['next','Next month']].map(([k,l])=>chip(l,hpEvQuick===k,`hpEvSetQuick('${k}')`)).join('')}
        <label style="font-size:12.5px;color:#374151">From <input type="date" value="${hpEvFrom}" onchange="hpEvFrom=this.value;hpEvQuick='custom';hpEvRedraw()" style="${inp}"></label>
        <label style="font-size:12.5px;color:#374151">To <input type="date" value="${hpEvTo}" onchange="hpEvTo=this.value;hpEvQuick='custom';hpEvRedraw()" style="${inp}"></label>
        <label style="font-size:12.5px;color:#374151;display:flex;gap:6px;align-items:center"><input type="checkbox" ${hpEvShowPast?'checked':''} onchange="hpEvShowPast=this.checked;hpEvRedraw()"> Include past dates</label>
      </div>
    </div>

    ${hpEvRadius>20?`<div style="background:#FFF7E6;border:1px solid #F5C77E;color:#7a4d00;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:14px">
      <b>Range widened to ${hpEvRadius} miles.</b> This adds <b>${beyond}</b> venue${beyond===1?'':'s'} and <b>${beyondE}</b> dated event${beyondE===1?'':'s'} beyond 20 miles — they're marked <span style="display:inline-block;padding:0 6px;border-radius:8px;background:#F3E8D2;font-weight:700">beyond 20 mi</span>.
      <a href="javascript:void(0)" onclick="hpEvSetRadius(20)" style="color:#6E4E7A;font-weight:700;margin-left:6px">Back to 20 miles</a></div>`:''}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:16px">
      ${[[`Venues within ${hpEvRadius} miles`,allV.filter(x=>x.approxMiles<=hpEvRadius).length],['Key dates shown',events.length],['In the next 60 days',soon],['Listings sites',HP_EVENT_LISTINGS.length]].map(([l,n])=>`<div style="${card};padding:12px 14px"><div style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.4px">${l}</div><div style="font-size:24px;font-weight:800;color:#6E4E7A">${n}</div></div>`).join('')}
    </div>

    <div style="${card};padding:16px;margin-bottom:16px">
      <div style="font-size:16px;font-weight:800;color:#1a2b3a;margin-bottom:10px">Key dates ${hpEvFrom||hpEvTo?`<span style="font-size:12.5px;font-weight:600;color:#4b5563">· ${hpEvFrom?new Date(hpEvFrom+'T12:00').toLocaleDateString('en-GB'):'…'} to ${hpEvTo?new Date(hpEvTo+'T12:00').toLocaleDateString('en-GB'):'…'}</span>`:''}</div>
      <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;color:#1a2b3a;min-width:760px">
        <thead><tr style="background:#f5f7f9;text-align:left">${['Date','Event','Venue','Miles','Type',''].map(h=>`<th style="padding:8px;font-size:11px;text-transform:uppercase">${h}</th>`).join('')}</tr></thead>
        <tbody>${events.map(e=>{const days=Math.round((new Date(e.start+'T12:00')-new Date())/864e5); const m=hpEvMiles(e); return `<tr style="border-top:1px solid #eef1f4${m>20?';background:#FFFBF2':''}">
          <td style="padding:8px;white-space:nowrap;font-weight:700">${hpEvFmt(e.start,e.end)}${days>=0&&days<=30?`<div style="font-size:11px;color:#b45309;font-weight:700">in ${days} day${days===1?'':'s'}</div>`:''}</td>
          <td style="padding:8px;font-weight:700">${esc(e.name)}${e.note?`<div style="font-size:11px;color:#b45309;font-weight:400">${esc(e.note)}</div>`:''}${e.custom?' <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#EFE7F2;color:#6E4E7A">added by team</span>':''}</td>
          <td style="padding:8px">${esc(e.venue)}</td>
          <td style="padding:8px;white-space:nowrap">${m==null?'—':m+' mi'}${m>20?' <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#F3E8D2;color:#7a4d00;font-weight:700">beyond 20 mi</span>':''}</td>
          <td style="padding:8px">${esc(e.category||'')}</td>
          <td style="padding:8px;white-space:nowrap">${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener" style="color:#6E4E7A;font-weight:700">Details ↗</a>`:''}${e.custom?` <button onclick="hpEvDel('${esc(e.id)}')" style="border:none;background:none;color:#b3261e;cursor:pointer;font-size:12px">Remove</button>`:''}</td></tr>`;}).join('')||'<tr><td colspan="6" style="padding:14px;color:#4b5563">No dates in this range. Widen the dates or the mileage.</td></tr>'}</tbody>
      </table></div>
      <div style="font-size:11.5px;color:#4b5563;margin-top:8px">Dates checked on 7 October 2026. Always confirm on the venue's site before promoting a package. Miles are straight-line from Brandon Hall (CV8 3FW). Events added by the team are saved on this computer only.</div>
    </div>

    <div style="${card};padding:16px;margin-bottom:16px">
      <div style="font-size:16px;font-weight:800;color:#1a2b3a;margin-bottom:10px">Venues — what's on pages</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${cats.map(c=>chip(c,hpEvFilter===c,`hpEvFilter='${c.replace(/'/g,"\\'")}';hpEvRedraw()`)).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px">
        ${venues.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:#1a2b3a;border:1px solid #e6e8ec;border-left:4px solid ${x.approxMiles>20?'#D9A441':'#6E4E7A'};border-radius:10px;padding:11px 12px;background:${x.approxMiles>20?'#FFFBF2':'#fff'}">
          <div style="display:flex;justify-content:space-between;gap:8px"><div style="font-weight:800;font-size:13.5px">${esc(x.name)}</div><div style="font-size:12px;font-weight:800;color:${x.approxMiles>20?'#7a4d00':'#6E4E7A'};white-space:nowrap">${x.approxMiles} mi</div></div>
          <div style="font-size:12px;color:#4b5563">${esc(x.town)} · ${esc(x.category)}${x.capacity?' · '+esc(x.capacity):''}</div>
          <div style="font-size:12px;color:#374151;margin-top:4px">${esc(x.note||'')}</div>
          <div style="font-size:12px;color:#6E4E7A;font-weight:700;margin-top:6px">What's on ↗</div></a>`).join('')||'<div style="color:#4b5563;font-size:13px">No venues of this type in range.</div>'}
      </div>
    </div>

    <div style="${card};padding:16px">
      <div style="font-size:16px;font-weight:800;color:#1a2b3a;margin-bottom:10px">Listings sites — check weekly</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px">
        ${HP_EVENT_LISTINGS.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:#1a2b3a;border:1px solid #e6e8ec;border-radius:10px;padding:10px 12px"><div style="font-weight:800;font-size:13px">${esc(x.name)} ↗</div><div style="font-size:12px;color:#4b5563">${esc(x.note||'')}</div></a>`).join('')}
      </div>
    </div>
  </div>`;
}
function hpEvAdd(){
  showModal('Add an event','Saved on this computer for the sales team',`
    <div style="display:grid;gap:10px;font-size:13px;color:#1a2b3a">
      <label>Event name<input id="ev-n" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px"></label>
      <label>Venue<input id="ev-v" list="ev-vl" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px"><datalist id="ev-vl">${HP_EVENT_VENUES.map(x=>`<option value="${spEsc(x.name)}">`).join('')}</datalist></label>
      <div style="display:flex;gap:8px"><label style="flex:1">Start date<input id="ev-s" type="date" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px"></label>
      <label style="flex:1">End date<input id="ev-e" type="date" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px"></label></div>
      <label>Type<input id="ev-c" placeholder="Concert, Theatre, Sport…" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px"></label>
      <label>Link<input id="ev-u" placeholder="https://" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px"></label>
      <button onclick="hpEvSave()" style="padding:10px;border:none;border-radius:9px;background:#6E4E7A;color:#fff;font:700 13px Lato;cursor:pointer">Save event</button>
    </div>`);
}
function hpEvSave(){
  const g=id=>document.getElementById(id).value.trim();
  if(!g('ev-n')||!g('ev-s')){ toast('Add a name and start date'); return; }
  const u=g('ev-u'); const l=hpEvGetCustom();
  l.push({id:'ev'+Date.now().toString(36),name:g('ev-n'),venue:g('ev-v'),start:g('ev-s'),end:g('ev-e')||g('ev-s'),category:g('ev-c'),url:/^https?:\/\//i.test(u)?u:''});
  hpEvSaveCustom(l); closeModal(); renderLocalEvents(document.getElementById('view')); toast('✓ Event added');
}
function hpEvDel(id){ hpEvSaveCustom(hpEvGetCustom().filter(e=>e.id!==id)); renderLocalEvents(document.getElementById('view')); }

/* ============================================================
   HosSALES — F&B DAILY TRACKER
   Daily sales by outlet/service + purchase invoices → month-to-date
   GP against target, spend headroom, run-rate projection.
   Stored in Firestore fb_tracker/<YYYY-MM> (+ fb_tracker/settings),
   falls back to this computer when not signed in live.
   ============================================================ */
const FB_DEFAULT_SETTINGS={ foodTarget:70, bevTarget:75, lines:[
  {id:'breakfast',name:'Breakfast',outlet:'The Clarendon Restaurant'},
  {id:'lunch',name:'Lunch',outlet:'The Clarendon Restaurant'},
  {id:'aftertea',name:'Afternoon tea',outlet:'The Clarendon Restaurant'},
  {id:'dinner',name:'Dinner',outlet:'The Clarendon Restaurant'},
  {id:'bar',name:'Bar & lounge',outlet:'The Clarendon Bar'},
  {id:'roomservice',name:'Room service',outlet:'Room service'},
  {id:'banqueting',name:'Banqueting & events',outlet:'Events'},
  {id:'spa',name:'Spa café',outlet:'Spa'} ] };
const FB_CATS=['Food','Beverage','Non-F&B'];
let FBT={ month:null, data:null, settings:null, src:'', view:'food', saving:null };
function fbtMonthKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function fbtLive(){ return typeof FB!=='undefined' && FB.ready && FB.user && FB.db; }
function fbtEmpty(){ return {sales:{}, invoices:{}, stock:{openFood:'',openBev:'',closeFood:'',closeBev:''}}; }
async function fbtLoad(month){
  FBT.month=month;
  if(fbtLive()){
    try{
      const [m,s]=await Promise.all([FB.db.collection('fb_tracker').doc(month).get(), FB.db.collection('fb_tracker').doc('settings').get()]);
      FBT.data=Object.assign(fbtEmpty(), m.exists?m.data():{}); FBT.settings=Object.assign({},FB_DEFAULT_SETTINGS, s.exists?s.data():{}); FBT.src='live'; return;
    }catch(e){ console.warn('F&B tracker live load failed',e); }
  }
  try{ FBT.data=Object.assign(fbtEmpty(), JSON.parse(localStorage.getItem('fbt_'+month)||'{}')); }catch(e){ FBT.data=fbtEmpty(); }
  try{ FBT.settings=Object.assign({},FB_DEFAULT_SETTINGS, JSON.parse(localStorage.getItem('fbt_settings')||'{}')); }catch(e){ FBT.settings=JSON.parse(JSON.stringify(FB_DEFAULT_SETTINGS)); }
  FBT.src='local';
}
/* Field-level saves so two people entering at once don't overwrite each other */
async function fbtSave(patch, delPaths){
  if(FBT.src==='live' && fbtLive()){
    const ref=FB.db.collection('fb_tracker').doc(FBT.month), upd=Object.assign({},patch);
    (delPaths||[]).forEach(p=>upd[p]=firebase.firestore.FieldValue.delete());
    upd.updated=new Date().toISOString(); upd.by=(SESSION&&SESSION.name)||'';
    try{ await ref.update(upd); }catch(e){ if(e.code==='not-found'){ await ref.set(fbtEmpty()); await ref.update(upd); } else { toast('Could not save to the live database: '+(e.code||e.message)); throw e; } }
  } else { try{ localStorage.setItem('fbt_'+FBT.month, JSON.stringify(FBT.data)); }catch(e){} }
}
async function fbtSaveSettings(){
  if(FBT.src==='live' && fbtLive()){ try{ await FB.db.collection('fb_tracker').doc('settings').set(FBT.settings); }catch(e){ toast('Could not save settings'); } }
  else try{ localStorage.setItem('fbt_settings', JSON.stringify(FBT.settings)); }catch(e){}
}
const fbtN=v=>{ const n=parseFloat(String(v==null?'':v).replace(/[£,\s]/g,'')); return isFinite(n)?n:0; };
const fbtGBP=n=>'£'+(Math.round(n||0)).toLocaleString('en-GB');
const fbtPct=n=>(isFinite(n)?(Math.round(n*10)/10).toFixed(1):'—')+'%';

/* All the numbers for the month */
function fbtCalc(){
  const D=FBT.data, S=FBT.settings, [y,m]=FBT.month.split('-').map(Number), dim=new Date(y,m,0).getDate();
  const days=Array.from({length:dim},(_,i)=>`${FBT.month}-${String(i+1).padStart(2,'0')}`);
  const inv=Object.values(D.invoices||{});
  const rows=days.map(d=>{
    const s=D.sales[d]||{}; let food=0,bev=0,covers=0;
    Object.values(s).forEach(l=>{ food+=fbtN(l.food); bev+=fbtN(l.bev); covers+=fbtN(l.covers); });
    const di=inv.filter(x=>x.date===d), pf=di.filter(x=>x.cat==='Food').reduce((t,x)=>t+fbtN(x.net),0), pb=di.filter(x=>x.cat==='Beverage').reduce((t,x)=>t+fbtN(x.net),0);
    return {d, food, bev, covers, pf, pb, hasSales:Object.keys(s).length>0};
  });
  let cf=0,cb=0,cpf=0,cpb=0; rows.forEach(r=>{ cf+=r.food; cb+=r.bev; cpf+=r.pf; cpb+=r.pb; Object.assign(r,{cf,cb,cpf,cpb}); });
  const lastSales=rows.filter(r=>r.hasSales).map(r=>r.d).pop()||null;
  const daysIn=lastSales?+lastSales.slice(8):0;
  const st=D.stock||{}, hasClose=st.closeFood!==''&&st.closeFood!=null||st.closeBev!==''&&st.closeBev!=null;
  const adj=(open,close)=>fbtN(open)-(close===''||close==null?0:fbtN(close));
  const tF=S.foodTarget/100, tB=S.bevTarget/100;
  const mk=(sales,purch,open,close,t)=>{
    const cos=purch+(hasClose?adj(open,close):0);
    const gp=sales?((sales-cos)/sales*100):NaN;
    const allowed=sales*(1-t); const headroom=allowed-cos;
    const projSales=daysIn?sales/daysIn*dim:0, projPurch=daysIn?purch/daysIn*dim:0;
    const projGP=projSales?((projSales-projPurch)/projSales*100):NaN;
    const remainBudget=projSales*(1-t)-cos, left=dim-daysIn;
    return {sales,purch,cos,gp,allowed,headroom,projSales,projPurch,projGP,remainBudget,perDay:left>0?remainBudget/left:0,left,target:t*100};
  };
  const food=mk(cf,cpf,st.openFood,st.closeFood,tF), bev=mk(cb,cpb,st.openBev,st.closeBev,tB);
  const nonfb=inv.filter(x=>x.cat==='Non-F&B').reduce((t,x)=>t+fbtN(x.net),0);
  const covers=rows.reduce((t,r)=>t+r.covers,0);
  return {rows,days,dim,daysIn,lastSales,food,bev,nonfb,covers,inv,hasClose};
}

function renderFBTracker(v){
  const now=new Date(), def=fbtMonthKey(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1));
  v.innerHTML='<div style="padding:30px;color:#4b5563">Loading F&amp;B figures…</div>';
  fbtApplyImports().catch(()=>{}).then(()=>fbtImportSubmissions(true)).then(()=>fbtLoad(FBT.month||def)).then(()=>{ fbtDraw(v); setTimeout(()=>hpPublishSummary(true),1500); });
}
/* ── Daily form (fb-entry.html): staff without a portal login submit figures to fb_submissions.
   Each new submission is copied into the tracker (that day's sales lines and its invoices)
   the next time anyone opens the portal, then marked imported. ── */
async function fbtImportSubmissions(quiet){
  if(!fbtLive()) return 0;
  let n=0;
  try{
    const q=await FB.db.collection('fb_submissions').where('status','==','new').get();
    if(q.empty) return 0;
    const keep=FBT.month;
    const docs=q.docs.slice().sort((a,b)=>String(a.data().submittedAt||'').localeCompare(String(b.data().submittedAt||'')));
    for(const d of docs){
      const x=d.data(); const date=String(x.date||''); if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) { await d.ref.update({status:'rejected'}); continue; }
      await fbtLoad(date.slice(0,7));
      const day={}; Object.entries(x.sales||{}).forEach(([id,v])=>{ const o={food:fbtN(v.food),bev:fbtN(v.bev),covers:fbtN(v.covers)}; if(o.food||o.bev||o.covers) day[id]=o; });
      const patch={};
      if(Object.keys(day).length){ FBT.data.sales[date]=day; patch['sales.'+date]=day; }
      (Array.isArray(x.invoices)?x.invoices:[]).forEach((iv,i)=>{ if(!iv||!iv.supplier||iv.net==='' ) return;
        const id='sub'+d.id.slice(0,10)+i; const cat=/bev|drink/i.test(iv.cat)?'Beverage':/non/i.test(iv.cat)?'Non-F&B':'Food';
        const rec={id,date,cat,supplier:String(iv.supplier).slice(0,80),no:String(iv.no||'').slice(0,40),net:fbtN(iv.net),notes:String(iv.notes||'').slice(0,200),by:String(x.by||'Daily form').slice(0,60)};
        FBT.data.invoices[id]=rec; patch['invoices.'+id]=rec; });
      if(x.notes){ patch['notes.'+date]=String(x.notes).slice(0,500); }
      if(Object.keys(patch).length) await fbtSave(patch);
      await d.ref.update({status:'imported', importedAt:new Date().toISOString(), importedBy:(SESSION&&SESSION.name)||''});
      n++;
    }
    if(keep && keep!==FBT.month) await fbtLoad(keep);
    if(n){ toast(`✓ ${n} daily F&B form${n>1?'s':''} added to the tracker`,4000); if(typeof hpPublishSummary==='function') hpPublishSummary(true); }
  }catch(e){ console.warn('F&B form import failed',e); FBT.importError=(e&&(e.code||e.message))||'error'; if(!quiet || CURRENT_TAB==='fbTracker') toast('Daily form import failed: '+FBT.importError,6000); }
  return n;
}
/* Figures sent by email, added once (never over the top of a day already entered in the tracker) */
const FBT_IMPORTS=[
  {date:'2026-10-08', note:'From Patrik Vlach, email 9 Oct. Bar = lunch bar (food £21.67, drinks £54.17) + evening bar (food £144.83, drinks £76.25). Restaurant lunch £0.',
   sales:{ breakfast:{food:711.18}, bar:{food:166.50,bev:130.42}, dinner:{food:171.98,bev:80.58} }}
];
async function fbtApplyImports(){
  if(!fbtLive()) return 0; const keep=FBT.month; let n=0;
  for(const im of FBT_IMPORTS){
    try{
      await fbtLoad(im.date.slice(0,7)); if(FBT.src!=='live') continue;
      const have=FBT.data.sales[im.date]; if(have && Object.keys(have).length) continue;
      const day={}; Object.entries(im.sales).forEach(([id,v])=>{ const o={food:+v.food||0,bev:+v.bev||0,covers:+v.covers||0}; if(o.food||o.bev||o.covers) day[id]=o; });
      FBT.data.sales[im.date]=day; await fbtSave({['sales.'+im.date]:day, ['notes.'+im.date]:im.note}); n++;
    }catch(e){ console.warn('F&B import skipped',im.date,e); }
  }
  if(keep) await fbtLoad(keep);
  if(n){ toast(`✓ ${n} day${n>1?'s':''} of emailed F&B figures added to the tracker`,4000); if(CURRENT_TAB==='fbTracker') fbtDraw(); }
  return n;
}
/* See every daily-form submission (newest first) with its status, and import or re-import it */
async function fbtCheckSubs(){
  if(!fbtLive()){ toast('Sign in live to see form submissions'); return; }
  showModal('Daily form submissions','Figures sent from the daily F&B form link','<div id="fbs-body" style="padding:10px;color:#4b5563">Loading…</div>');
  const body=()=>document.getElementById('fbs-body');
  try{
    const q=await FB.db.collection('fb_submissions').get();
    const rows=q.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||''))).slice(0,40);
    if(!rows.length){ body().innerHTML='<div style="padding:6px 2px;font-size:13.5px;color:#1a2b3a;line-height:1.6"><b>No submissions have reached HosPRO yet.</b><br>If Patrik used the form and saw an error (for example “Missing or insufficient permissions”), the Firestore rules weren’t published at the time. Publish the full rules, then ask him to send the figures again. If he sent them another way, enter them with <b>+ Day’s sales</b>.</div>'; return; }
    const tot=x=>{ let f=0,b=0,c=0; Object.values(x.sales||{}).forEach(v=>{ f+=fbtN(v.food); b+=fbtN(v.bev); c+=fbtN(v.covers); }); return {f,b,c}; };
    const pill=s=>`<span style="padding:2px 8px;border-radius:9px;font-size:11px;font-weight:800;background:${s==='imported'?'#dcfce7':s==='new'?'#fef3c7':'#fee2e2'};color:${s==='imported'?'#166534':s==='new'?'#92400e':'#991b1b'}">${s||'?'}</span>`;
    body().innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px;color:#1a2b3a"><thead><tr style="text-align:left;background:#f5f7f9">${['For date','Sent by','Sent','Food','Drink','Covers','Invoices','Status',''].map(h=>`<th style="padding:7px;font-size:11px;text-transform:uppercase">${h}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(x=>{ const t=tot(x); return `<tr style="border-top:1px solid #eef1f4"><td style="padding:7px;font-weight:700">${spEsc(x.date||'')}</td><td style="padding:7px">${spEsc(x.by||'')}</td><td style="padding:7px;white-space:nowrap">${x.submittedAt?new Date(x.submittedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}</td>
        <td style="padding:7px">${fbtGBP(t.f)}</td><td style="padding:7px">${fbtGBP(t.b)}</td><td style="padding:7px">${t.c}</td><td style="padding:7px">${(x.invoices||[]).length}</td><td style="padding:7px">${pill(x.status)}</td>
        <td style="padding:7px"><button onclick="fbtReimport('${x._id}')" style="padding:5px 10px;border:1px solid #d1d5db;border-radius:7px;background:#fff;font:700 12px Lato;cursor:pointer">${x.status==='new'?'Import':'Re-import'}</button></td></tr>`; }).join('')}</tbody></table>
      ${FBT.importError?`<div style="margin-top:10px;color:#991b1b;font-size:12.5px">Last import error: ${spEsc(FBT.importError)}</div>`:''}
      <div style="margin-top:10px;font-size:12px;color:#4b5563">Re-import copies that submission into the tracker again (replacing that day's sales lines). Use it if a day is missing.</div>`;
  }catch(e){ body().innerHTML=`<div style="color:#991b1b;font-size:13px">Could not read submissions: ${spEsc(e.code||e.message||'error')}. Check the Firestore rules include <b>fb_submissions</b> and are published.</div>`; }
}
async function fbtReimport(id){
  try{ await FB.db.collection('fb_submissions').doc(id).update({status:'new'}); FBT.importError=null;
    const n=await fbtImportSubmissions(false);
    if(n){ closeModal(); await fbtLoad(FBT.month); fbtDraw(); } else fbtCheckSubs();
  }catch(e){ toast('Re-import failed: '+(e.code||e.message)); }
}
function fbtDraw(v){
  v=v||document.getElementById('view'); if(!v || CURRENT_TAB!=='fbTracker') return;
  const C=fbtCalc(), S=FBT.settings, F=C.food, B=C.bev;
  const y=new Date(); y.setDate(y.getDate()-1); const yk=spDK(y);
  const monthLabel=new Date(FBT.month+'-15').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const card='background:#fff;border:1px solid #e6e8ec;border-radius:12px';
  const btn='padding:8px 13px;border-radius:8px;font:700 12.5px Lato;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#1a2b3a';
  const pri='padding:9px 15px;border-radius:9px;font:700 13px Lato;cursor:pointer;border:none;background:#6E4E7A;color:#fff';
  const status=(o)=>{ if(!o.sales) return {t:'No sales yet',c:'#4b5563',bg:'#f5f7f9',i:'•'};
    if(o.gp>=o.target) return {t:'On target',c:'#166534',bg:'#dcfce7',i:'✓'};
    if(o.gp>=o.target-3) return {t:'Watch spend',c:'#92400e',bg:'#fef3c7',i:'!'};
    return {t:'Over spend',c:'#991b1b',bg:'#fee2e2',i:'✕'}; };
  const tile=(title,o)=>{ const s=status(o); return `<div style="${card};padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="font-size:15px;font-weight:800;color:#1a2b3a">${title}</div>
        <span style="font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:10px;background:${s.bg};color:${s.c}">${s.i} ${s.t}</span></div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
        <div><div style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase">Sales MTD</div><div style="font-size:22px;font-weight:800;color:#1a2b3a">${fbtGBP(o.sales)}</div></div>
        <div><div style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase">${C.hasClose?'Cost of sales':'Purchases'} MTD</div><div style="font-size:22px;font-weight:800;color:#1a2b3a">${fbtGBP(o.cos)}</div></div>
        <div><div style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase">GP</div><div style="font-size:22px;font-weight:800;color:${s.c}">${o.sales?fbtPct(o.gp):'—'}</div><div style="font-size:11px;color:#4b5563">target ${o.target}%</div></div>
      </div>
      <div style="margin-top:10px;font-size:12.5px;color:#374151;line-height:1.55">
        ${o.sales?`Allowed spend so far at ${o.target}% GP: <b>${fbtGBP(o.allowed)}</b> — ${o.headroom>=0?`<b style="color:#166534">${fbtGBP(o.headroom)} under</b>`:`<b style="color:#991b1b">${fbtGBP(-o.headroom)} over</b>`}.<br>
        ${C.daysIn&&o.left>0?`On current trading the month ends around <b>${fbtGBP(o.projSales)}</b> sales. To finish at ${o.target}% you can spend about <b>${fbtGBP(Math.max(0,o.remainBudget))}</b> more — <b>${fbtGBP(Math.max(0,o.perDay))} a day</b> for the last ${o.left} day${o.left===1?'':'s'}.`:''}`:'Enter sales to see GP.'}
      </div></div>`; };
  // yesterday
  const yRow=C.rows.find(r=>r.d===yk);
  const ySales=FBT.data.sales[yk]||{};
  const months=[]; for(let i=-6;i<=1;i++){ const d=new Date(y.getFullYear(),y.getMonth()+i,1); months.push(fbtMonthKey(d)); }
  v.innerHTML=`<div style="padding:22px 26px;max-width:1300px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div><h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;margin:0;color:#1a2b3a">F&amp;B Sales &amp; Costs</h2>
        <div style="font-size:13px;color:#4b5563">Daily sales by outlet and service, purchase invoices, and month-to-date GP against target. All figures net of VAT.
        <span style="margin-left:6px;font-size:11.5px;padding:2px 8px;border-radius:8px;background:${FBT.src==='live'?'#dcfce7':'#fef3c7'};color:${FBT.src==='live'?'#166534':'#92400e'};font-weight:700">${FBT.src==='live'?'Shared live':'Saved on this computer only'}</span></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <select onchange="FBT.month=this.value;renderFBTracker(document.getElementById('view'))" style="padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font:700 13px Lato;color:#1a2b3a">${months.map(m=>`<option value="${m}" ${m===FBT.month?'selected':''}>${new Date(m+'-15').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</option>`).join('')}</select>
        <button style="${pri}" onclick="fbtSalesModal('${yk.slice(0,7)===FBT.month?yk:FBT.month+'-01'}')">+ Day's sales</button>
        <button style="${pri};background:#C2410C" onclick="fbtInvoiceModal()">+ Invoice</button>
        <button style="${btn}" onclick="fbtUploadModal()">📤 Upload template</button>
        <button style="${btn}" onclick="fbtExport()">⬇ Export month</button>
        <button style="${btn}" onclick="fbtFormLink()">🔗 Daily form link</button>
        <button style="${btn}" onclick="fbtCheckSubs()">📥 Form submissions</button>
        <button style="${btn}" onclick="hpPublishSummary('loud')">📱 Update Pocket</button>
        <button style="${btn}" onclick="fbtSettingsModal()">⚙ Settings</button>
      </div>
    </div>

    <div style="${card};padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-left:4px solid #6E4E7A">
      <div><div style="font-size:12px;font-weight:800;color:#6E4E7A;text-transform:uppercase;letter-spacing:.4px">Yesterday · ${y.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
        ${yRow&&yRow.hasSales?`<div style="font-size:14px;color:#1a2b3a;margin-top:3px">Food <b>${fbtGBP(yRow.food)}</b> · Drink <b>${fbtGBP(yRow.bev)}</b> · Total <b>${fbtGBP(yRow.food+yRow.bev)}</b> · ${yRow.covers} covers · Invoices <b>${fbtGBP(yRow.pf+yRow.pb)}</b></div>
          <div style="font-size:12px;color:#4b5563;margin-top:2px">${S.lines.filter(l=>ySales[l.id]).map(l=>`${spEsc(l.name)} ${fbtGBP(fbtN(ySales[l.id].food)+fbtN(ySales[l.id].bev))}`).join(' · ')}</div>`
        :`<div style="font-size:14px;color:#92400e;margin-top:3px">Yesterday's sales haven't been entered yet.</div>`}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${yRow&&yRow.hasSales?`<button style="${btn}" onclick="fbtShare('wa')">Send on WhatsApp</button><button style="${btn}" onclick="fbtShare('mail')">Email</button><button style="${btn}" onclick="fbtShare('copy')">Copy</button>`:`<button style="${pri}" onclick="fbtSalesModal('${yk}')">Enter yesterday's sales</button>`}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px;margin-bottom:14px">${tile('🍽 Food',F)}${tile('🍷 Beverage',B)}</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px">
      ${[['Total F&B sales',fbtGBP(F.sales+B.sales)],['Covers',C.covers.toLocaleString('en-GB')],['Average spend',C.covers?'£'+((F.sales+B.sales)/C.covers).toFixed(2):'—'],['Days entered',`${C.rows.filter(r=>r.hasSales).length} of ${C.dim}`],['Invoices',`${C.inv.length} · ${fbtGBP(F.purch+B.purch)}`],['Non-F&B purchases',fbtGBP(C.nonfb)]].map(([l,n])=>`<div style="${card};padding:11px 13px"><div style="font-size:10.5px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.4px">${l}</div><div style="font-size:19px;font-weight:800;color:#1a2b3a">${n}</div></div>`).join('')}
    </div>

    <div style="${card};padding:16px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <div><div style="font-size:16px;font-weight:800;color:#1a2b3a">Spend against allowance — ${monthLabel}</div>
          <div style="font-size:12.5px;color:#4b5563">Cumulative purchases vs what you can spend to hit the GP target on the sales taken so far.</div></div>
        <div style="display:flex;gap:6px">${['food','bev'].map(k=>`<button onclick="FBT.view='${k}';fbtDraw()" style="padding:6px 12px;border-radius:16px;border:1px solid ${FBT.view===k?'#6E4E7A':'#d6d9de'};background:${FBT.view===k?'#6E4E7A':'#fff'};color:${FBT.view===k?'#fff':'#1a2b3a'};font:700 12px Lato;cursor:pointer">${k==='food'?'Food':'Beverage'}</button>`).join('')}</div>
      </div>
      <div id="fbt-chart" style="position:relative"></div>
    </div>

    <div style="${card};padding:16px;margin-bottom:14px">
      <div style="font-size:16px;font-weight:800;color:#1a2b3a;margin-bottom:8px">Day by day</div>
      <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px;color:#1a2b3a;min-width:900px">
        <thead><tr style="background:#f5f7f9">${['Date','Food sales','Drink sales','Covers','Food invoices','Drink invoices','Food GP MTD','Drink GP MTD',''].map((h,i)=>`<th style="padding:7px 8px;font-size:10.5px;text-transform:uppercase;text-align:${i===0?'left':'right'}">${h}</th>`).join('')}</tr></thead>
        <tbody>${C.rows.filter(r=>r.d<=spDK(new Date())||r.hasSales||r.pf||r.pb).map(r=>{
          const gF=r.cf?((r.cf-r.cpf)/r.cf*100):NaN, gB=r.cb?((r.cb-r.cpb)/r.cb*100):NaN;
          const col=(g,t)=>!isFinite(g)?'#9ca3af':g>=t?'#166534':g>=t-3?'#92400e':'#991b1b';
          const dd=new Date(r.d+'T12:00');
          return `<tr style="border-top:1px solid #eef1f4${r.hasSales?'':';color:#9ca3af'}">
            <td style="padding:6px 8px;font-weight:700;white-space:nowrap">${dd.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</td>
            <td style="padding:6px 8px;text-align:right">${r.hasSales?fbtGBP(r.food):'—'}</td><td style="padding:6px 8px;text-align:right">${r.hasSales?fbtGBP(r.bev):'—'}</td>
            <td style="padding:6px 8px;text-align:right">${r.hasSales?r.covers:'—'}</td>
            <td style="padding:6px 8px;text-align:right">${r.pf?fbtGBP(r.pf):''}</td><td style="padding:6px 8px;text-align:right">${r.pb?fbtGBP(r.pb):''}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;color:${col(gF,S.foodTarget)}">${r.cf?fbtPct(gF):''}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;color:${col(gB,S.bevTarget)}">${r.cb?fbtPct(gB):''}</td>
            <td style="padding:6px 8px;text-align:right;white-space:nowrap"><button onclick="fbtSalesModal('${r.d}')" style="border:none;background:none;color:#6E4E7A;font:700 12px Lato;cursor:pointer">${r.hasSales?'Edit':'Enter'}</button></td></tr>`; }).join('')}</tbody>
      </table></div>
      <div style="font-size:11.5px;color:#4b5563;margin-top:6px">GP MTD = (sales − ${C.hasClose?'cost of sales':'purchases'}) ÷ sales, month to date. Early in the month it swings a lot because deliveries arrive before the food is sold — the trend matters more than any single day.</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px">
      <div style="${card};padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:16px;font-weight:800;color:#1a2b3a">Invoices this month</div><button style="${btn}" onclick="fbtInvoiceModal()">+ Invoice</button></div>
        <div style="max-height:360px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px;color:#1a2b3a">
          <thead><tr style="background:#f5f7f9">${['Date','Supplier','Type','Inv no','Net',''].map((h,i)=>`<th style="padding:6px 8px;font-size:10.5px;text-transform:uppercase;text-align:${i===4?'right':'left'};position:sticky;top:0;background:#f5f7f9">${h}</th>`).join('')}</tr></thead>
          <tbody>${C.inv.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr style="border-top:1px solid #eef1f4">
            <td style="padding:5px 8px;white-space:nowrap">${new Date(x.date+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td><td style="padding:5px 8px">${spEsc(x.supplier)}</td>
            <td style="padding:5px 8px">${spEsc(x.cat)}</td><td style="padding:5px 8px">${spEsc(x.no||'')}</td><td style="padding:5px 8px;text-align:right;font-weight:700">${fbtGBP(fbtN(x.net))}</td>
            <td style="padding:5px 8px;text-align:right;white-space:nowrap"><button onclick="fbtInvoiceModal('${x.id}')" style="border:none;background:none;color:#6E4E7A;font:700 12px Lato;cursor:pointer">Edit</button></td></tr>`).join('')||'<tr><td colspan="6" style="padding:12px;color:#4b5563">No invoices yet.</td></tr>'}</tbody></table></div>
      </div>
      <div style="${card};padding:16px">
        <div style="font-size:16px;font-weight:800;color:#1a2b3a;margin-bottom:8px">Top suppliers this month</div>
        ${(()=>{ const m={}; C.inv.filter(x=>x.cat!=='Non-F&B').forEach(x=>{ m[x.supplier]=(m[x.supplier]||0)+fbtN(x.net); });
          const e=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8), mx=e.length?e[0][1]:1;
          return e.map(([k,n])=>`<div style="display:grid;grid-template-columns:150px 1fr 70px;gap:8px;align-items:center;margin:6px 0;font-size:12.5px;color:#1a2b3a"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${spEsc(k)}">${spEsc(k)}</div><div style="height:10px;background:#f1f3f5;border-radius:4px"><div style="height:10px;width:${Math.max(2,n/mx*100)}%;background:#eb6834;border-radius:0 4px 4px 0"></div></div><div style="text-align:right;font-weight:700">${fbtGBP(n)}</div></div>`).join('')||'<div style="color:#4b5563;font-size:13px">No invoices yet.</div>'; })()}
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #eef1f4">
          <div style="font-size:13px;font-weight:800;color:#1a2b3a;margin-bottom:4px">Stock take (optional, makes GP exact)</div>
          <div style="font-size:12px;color:#4b5563;margin-bottom:8px">Opening stock = last month's closing. Enter closing stock at month end.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${[['openFood','Opening food stock'],['openBev','Opening drink stock'],['closeFood','Closing food stock'],['closeBev','Closing drink stock']].map(([k,l])=>`<label style="font-size:12px;color:#374151">${l}<input type="number" step="0.01" value="${spEsc((FBT.data.stock||{})[k]??'')}" onchange="fbtStock('${k}',this.value)" style="display:block;width:100%;padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px"></label>`).join('')}</div>
        </div>
      </div>
    </div>
  </div>`;
  fbtChart(C);
}

/* Cumulative purchases vs allowed spend — one axis (£), two series, crosshair tooltip */
function fbtChart(C){
  const box=document.getElementById('fbt-chart'); if(!box) return;
  const k=FBT.view, t=(k==='food'?FBT.settings.foodTarget:FBT.settings.bevTarget)/100;
  const today=spDK(new Date());
  const rows=C.rows.filter(r=>r.d<=today || r.hasSales);
  if(!rows.length || !rows.some(r=>(k==='food'?r.cf:r.cb)||(k==='food'?r.cpf:r.cpb))){ box.innerHTML='<div style="padding:30px;text-align:center;color:#4b5563;font-size:13px">No figures yet for this month.</div>'; return; }
  const P=rows.map(r=>({d:r.d, spend:k==='food'?r.cpf:r.cpb, allow:(k==='food'?r.cf:r.cb)*(1-t)}));
  const W=Math.max(320, box.clientWidth||900), H=260, m={l:56,r:96,t:14,b:28};
  const max=Math.max(...P.map(p=>Math.max(p.spend,p.allow)))*1.1||1;
  const x=i=>m.l+(C.dim<=1?0:i/(C.dim-1))*(W-m.l-m.r), yv=v=>m.t+(1-v/max)*(H-m.t-m.b);
  const ticks=4, step=Math.pow(10,Math.floor(Math.log10(max/ticks))); const nice=Math.ceil(max/ticks/step)*step;
  const grid=Array.from({length:ticks+1},(_,i)=>i*nice).filter(v=>v<=max).map(v=>`<line x1="${m.l}" x2="${W-m.r}" y1="${yv(v)}" y2="${yv(v)}" stroke="#eef1f4"/><text x="${m.l-8}" y="${yv(v)+4}" text-anchor="end" font-size="11" fill="#52514e">${v>=1000?'£'+(v/1000).toFixed(v%1000?1:0)+'k':'£'+v}</text>`).join('');
  const idx=d=>+d.slice(8)-1;
  const path=key=>P.map((p,i)=>`${i?'L':'M'}${x(idx(p.d)).toFixed(1)},${yv(p[key]).toFixed(1)}`).join('');
  const last=P[P.length-1];
  const xt=[1,8,15,22,C.dim].map(d=>`<text x="${x(d-1)}" y="${H-8}" text-anchor="middle" font-size="11" fill="#52514e">${d}</text>`).join('');
  box.innerHTML=`<div style="display:flex;gap:16px;font-size:12px;color:#374151;margin:4px 0 6px">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:3px;background:#eb6834;border-radius:2px"></span>Purchases (cumulative)</span>
      <span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:3px;background:#2a78d6;border-radius:2px"></span>Allowed spend at ${Math.round(t*100)}% GP</span></div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible" role="img" aria-label="Cumulative purchases against allowed spend">
      ${grid}<line x1="${m.l}" x2="${W-m.r}" y1="${yv(0)}" y2="${yv(0)}" stroke="#d1d5db"/>${xt}
      <path d="${path('allow')}" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${path('spend')}" fill="none" stroke="#eb6834" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(idx(last.d))}" cy="${yv(last.allow)}" r="4" fill="#2a78d6" stroke="#fff" stroke-width="2"/>
      <circle cx="${x(idx(last.d))}" cy="${yv(last.spend)}" r="4" fill="#eb6834" stroke="#fff" stroke-width="2"/>
      ${(()=>{ let ya=yv(last.allow)+4, ys=yv(last.spend)+4; if(Math.abs(ya-ys)<15){ const mid=(ya+ys)/2; if(last.allow>=last.spend){ ya=mid-8; ys=mid+8; } else { ya=mid+8; ys=mid-8; } }
        return `<text x="${x(idx(last.d))+9}" y="${ya}" font-size="11.5" font-weight="700" fill="#1a2b3a">${fbtGBP(last.allow)} allowed</text><text x="${x(idx(last.d))+9}" y="${ys}" font-size="11.5" font-weight="700" fill="#1a2b3a">${fbtGBP(last.spend)} spent</text>`; })()}
      <line id="fbt-x" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}" stroke="#9ca3af" stroke-dasharray="3 3" style="display:none"/>
      <rect x="${m.l}" y="${m.t}" width="${W-m.l-m.r}" height="${H-m.t-m.b}" fill="transparent" id="fbt-hit"/>
    </svg>
    <div id="fbt-tip" style="position:absolute;display:none;pointer-events:none;background:#1a2b3a;color:#fff;border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.5;white-space:nowrap"></div>`;
  const svg=box.querySelector('svg'), hit=box.querySelector('#fbt-hit'), xl=box.querySelector('#fbt-x'), tip=box.querySelector('#fbt-tip');
  hit.addEventListener('mousemove',e=>{
    const r=svg.getBoundingClientRect(), sx=(e.clientX-r.left)*W/r.width;
    let best=P[0]; P.forEach(p=>{ if(Math.abs(x(idx(p.d))-sx)<Math.abs(x(idx(best.d))-sx)) best=p; });
    const px=x(idx(best.d)); xl.setAttribute('x1',px); xl.setAttribute('x2',px); xl.style.display='';
    const diff=best.allow-best.spend;
    tip.innerHTML=`<b>${new Date(best.d+'T12:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</b><br>Purchases ${fbtGBP(best.spend)}<br>Allowed ${fbtGBP(best.allow)}<br>${diff>=0?'Under by '+fbtGBP(diff):'Over by '+fbtGBP(-diff)}`;
    tip.style.display='block'; const left=px*r.width/W; tip.style.left=Math.min(left+12, r.width-150)+'px'; tip.style.top='34px';
  });
  hit.addEventListener('mouseleave',()=>{ xl.style.display='none'; tip.style.display='none'; });
}

/* ── Entry forms ── */
function fbtSalesModal(date){
  const S=FBT.settings, cur=(FBT.data.sales||{})[date]||{};
  const inp='width:100%;padding:8px;border:1px solid #d1d5db;border-radius:7px;font:13px Lato;text-align:right';
  showModal('Daily sales','Net of VAT, from the till / Guestline end-of-day report',`
    <div style="font-size:13px;color:#1a2b3a">
      <label style="font-weight:700">Trading date <input id="fbt-date" type="date" value="${date}" onchange="closeModal();fbtSalesModal(this.value)" style="padding:7px;border:1px solid #d1d5db;border-radius:7px;margin-left:6px"></label>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead><tr style="background:#f5f7f9"><th style="padding:6px;text-align:left;font-size:11px">Outlet / service</th><th style="padding:6px;font-size:11px;width:24%">Food £</th><th style="padding:6px;font-size:11px;width:24%">Drink £</th><th style="padding:6px;font-size:11px;width:16%">Covers</th></tr></thead>
        <tbody>${S.lines.map(l=>{ const c=cur[l.id]||{}; return `<tr style="border-top:1px solid #eef1f4"><td style="padding:6px"><b>${spEsc(l.name)}</b><div style="font-size:11px;color:#4b5563">${spEsc(l.outlet||'')}</div></td>
          <td style="padding:4px"><input data-l="${l.id}" data-k="food" type="number" step="0.01" min="0" value="${c.food??''}" style="${inp}" oninput="fbtSumForm()"></td>
          <td style="padding:4px"><input data-l="${l.id}" data-k="bev" type="number" step="0.01" min="0" value="${c.bev??''}" style="${inp}" oninput="fbtSumForm()"></td>
          <td style="padding:4px"><input data-l="${l.id}" data-k="covers" type="number" step="1" min="0" value="${c.covers??''}" style="${inp}"></td></tr>`; }).join('')}
          <tr style="border-top:2px solid #1a2b3a;font-weight:800"><td style="padding:8px 6px">Total</td><td id="fbt-sf" style="padding:8px 6px;text-align:right"></td><td id="fbt-sb" style="padding:8px 6px;text-align:right"></td><td></td></tr></tbody>
      </table>
      <button onclick="fbtSaveSales()" style="margin-top:12px;width:100%;padding:11px;border:none;border-radius:9px;background:#6E4E7A;color:#fff;font:700 14px Lato;cursor:pointer">Save sales</button>
    </div>`);
  fbtSumForm();
}
function fbtSumForm(){ let f=0,b=0; document.querySelectorAll('#modal-root input[data-l]').forEach(i=>{ if(i.dataset.k==='food') f+=fbtN(i.value); if(i.dataset.k==='bev') b+=fbtN(i.value); });
  const a=document.getElementById('fbt-sf'), c=document.getElementById('fbt-sb'); if(a) a.textContent=fbtGBP(f); if(c) c.textContent=fbtGBP(b); }
async function fbtSaveSales(){
  const date=document.getElementById('fbt-date').value; if(!date) return;
  if(date.slice(0,7)!==FBT.month){ await fbtLoad(date.slice(0,7)); }
  const day={}; document.querySelectorAll('#modal-root input[data-l]').forEach(i=>{ if(i.value==='') return; (day[i.dataset.l]=day[i.dataset.l]||{})[i.dataset.k]=fbtN(i.value); });
  FBT.data.sales[date]=day;
  try{ await fbtSave(Object.keys(day).length?{['sales.'+date]:day}:{}, Object.keys(day).length?[]:['sales.'+date]); }catch(e){ return; }
  if(!Object.keys(day).length) delete FBT.data.sales[date];
  closeModal(); toast('✓ Sales saved for '+new Date(date+'T12:00').toLocaleDateString('en-GB')); fbtDraw(); setTimeout(()=>{ if(typeof hpPublishSummary==='function') hpPublishSummary(true); },300);
}
function fbtInvoiceModal(id){
  const x=id?FBT.data.invoices[id]:{date:spDK(new Date()),cat:'Food'};
  const sup=[...new Set(Object.values(FBT.data.invoices||{}).map(i=>i.supplier).concat(FBT.settings.suppliers||[]))].sort();
  const inp='display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px;font:13px Lato';
  showModal(id?'Edit invoice':'Add an invoice','Net of VAT. Use a minus figure for a credit note.',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px;color:#1a2b3a">
      <label>Invoice date<input id="fi-date" type="date" value="${x.date}" style="${inp}"></label>
      <label>Type<select id="fi-cat" style="${inp}">${FB_CATS.map(c=>`<option ${x.cat===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label style="grid-column:1/-1">Supplier<input id="fi-sup" list="fi-sups" value="${spEsc(x.supplier||'')}" style="${inp}"><datalist id="fi-sups">${sup.map(s=>`<option value="${spEsc(s)}">`).join('')}</datalist></label>
      <label>Invoice number<input id="fi-no" value="${spEsc(x.no||'')}" style="${inp}"></label>
      <label>Net amount £<input id="fi-net" type="number" step="0.01" value="${x.net??''}" style="${inp}"></label>
      <label style="grid-column:1/-1">Notes<input id="fi-notes" value="${spEsc(x.notes||'')}" style="${inp}"></label>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="fbtSaveInvoice('${id||''}',true)" style="flex:1;padding:11px;border:none;border-radius:9px;background:#C2410C;color:#fff;font:700 14px Lato;cursor:pointer">Save</button>
      ${id?'':`<button onclick="fbtSaveInvoice('',false)" style="flex:1;padding:11px;border:1px solid #C2410C;border-radius:9px;background:#fff;color:#C2410C;font:700 14px Lato;cursor:pointer">Save &amp; add another</button>`}
      ${id?`<button onclick="fbtDelInvoice('${id}')" style="padding:11px 14px;border:1px solid #fca5a5;border-radius:9px;background:#fff;color:#991b1b;font:700 13px Lato;cursor:pointer">Delete</button>`:''}
    </div>`);
}
async function fbtSaveInvoice(id, close){
  const g=k=>document.getElementById(k).value.trim();
  if(!g('fi-date')||!g('fi-sup')||g('fi-net')===''){ toast('Add the date, supplier and amount'); return; }
  const date=g('fi-date'); if(date.slice(0,7)!==FBT.month){ toast('Saved to '+new Date(date+'T12:00').toLocaleDateString('en-GB',{month:'long'})); }
  const key=date.slice(0,7);
  const rec={id:id||'inv'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), date, cat:g('fi-cat'), supplier:g('fi-sup'), no:g('fi-no'), net:fbtN(g('fi-net')), notes:g('fi-notes'), by:(SESSION&&SESSION.name)||''};
  const keepMonth=FBT.month;
  if(key!==FBT.month){ await fbtLoad(key); }
  if(id && FBT.data.invoices[id] && FBT.data.invoices[id].date.slice(0,7)!==key){ /* moved month: handled as new */ }
  FBT.data.invoices[rec.id]=rec;
  try{ await fbtSave({['invoices.'+rec.id]:rec}); }catch(e){ return; }
  if(key!==keepMonth){ await fbtLoad(keepMonth); }
  toast('✓ Invoice saved'); setTimeout(()=>{ if(typeof hpPublishSummary==='function') hpPublishSummary(true); },300);
  if(close){ closeModal(); fbtDraw(); } else { fbtDraw(); fbtInvoiceModal(); const d=document.getElementById('fi-date'); if(d) d.value=date; }
}
async function fbtDelInvoice(id){
  if(!confirm('Delete this invoice?')) return;
  delete FBT.data.invoices[id];
  try{ await fbtSave({},['invoices.'+id]); }catch(e){ return; }
  closeModal(); fbtDraw();
}
async function fbtStock(k,v){ FBT.data.stock=FBT.data.stock||{}; FBT.data.stock[k]=v===''?'':fbtN(v); try{ await fbtSave({['stock.'+k]:FBT.data.stock[k]}); }catch(e){} fbtDraw(); }

/* ── Settings: GP targets and the sales lines ── */
function fbtSettingsModal(){
  const S=FBT.settings;
  showModal('F&B tracker settings','Targets and the outlets / services you take sales for',`
    <div style="font-size:13px;color:#1a2b3a">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <label>Food GP target %<input id="fs-ft" type="number" step="0.5" value="${S.foodTarget}" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px"></label>
        <label>Drink GP target %<input id="fs-bt" type="number" step="0.5" value="${S.bevTarget}" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:7px;margin-top:3px"></label>
      </div>
      <div style="font-weight:800;margin-bottom:6px">Sales lines</div>
      <div id="fs-lines">${S.lines.map(l=>fbtLineRow(l)).join('')}</div>
      <button onclick="document.getElementById('fs-lines').insertAdjacentHTML('beforeend',fbtLineRow({id:'l'+Date.now().toString(36),name:'',outlet:''}))" style="margin-top:6px;padding:7px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:700 12px Lato;cursor:pointer">+ Add a line</button>
      <div style="font-size:11.5px;color:#4b5563;margin-top:6px">Removing a line hides it from new entries; figures already entered stay in the totals.</div>
      <button onclick="fbtSaveSettingsForm()" style="margin-top:12px;width:100%;padding:11px;border:none;border-radius:9px;background:#6E4E7A;color:#fff;font:700 14px Lato;cursor:pointer">Save settings</button>
    </div>`);
}
function fbtLineRow(l){ return `<div class="fs-line" data-id="${spEsc(l.id)}" style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:6px">
  <input class="fs-n" placeholder="Service, e.g. Dinner" value="${spEsc(l.name)}" style="padding:7px;border:1px solid #d1d5db;border-radius:7px">
  <input class="fs-o" placeholder="Outlet, e.g. The Clarendon" value="${spEsc(l.outlet||'')}" style="padding:7px;border:1px solid #d1d5db;border-radius:7px">
  <button onclick="this.parentElement.remove()" style="border:1px solid #fca5a5;background:#fff;color:#991b1b;border-radius:7px;padding:0 10px;cursor:pointer">✕</button></div>`; }
async function fbtSaveSettingsForm(){
  const S=FBT.settings; S.foodTarget=fbtN(document.getElementById('fs-ft').value)||70; S.bevTarget=fbtN(document.getElementById('fs-bt').value)||75;
  S.lines=[...document.querySelectorAll('#fs-lines .fs-line')].map(r=>({id:r.dataset.id, name:r.querySelector('.fs-n').value.trim(), outlet:r.querySelector('.fs-o').value.trim()})).filter(l=>l.name);
  await fbtSaveSettings(); closeModal(); fbtDraw(); toast('✓ Settings saved');
}

/* ── Templates: download, fill in Excel, upload ── */
function fbtUploadModal(){
  showModal('Upload a template','Fill it in Excel, save as CSV, upload it here',`
    <div style="font-size:13px;color:#1a2b3a;line-height:1.55">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="border:1px solid #e6e8ec;border-radius:10px;padding:12px"><b>Daily sales</b><div style="font-size:12px;color:#4b5563;margin:4px 0 8px">One row per outlet/service per day: Date, Line, Food, Drink, Covers.</div><button onclick="fbtTemplate('sales')" style="padding:7px 12px;border:1px solid #6E4E7A;border-radius:8px;background:#fff;color:#6E4E7A;font:700 12px Lato;cursor:pointer">⬇ Sales template</button></div>
        <div style="border:1px solid #e6e8ec;border-radius:10px;padding:12px"><b>Invoices</b><div style="font-size:12px;color:#4b5563;margin:4px 0 8px">One row per invoice: Date, Supplier, Type (Food / Beverage / Non-F&amp;B), Invoice no, Net.</div><button onclick="fbtTemplate('inv')" style="padding:7px 12px;border:1px solid #C2410C;border-radius:8px;background:#fff;color:#C2410C;font:700 12px Lato;cursor:pointer">⬇ Invoice template</button></div>
      </div>
      <label style="display:inline-block;padding:10px 16px;border-radius:9px;background:#1a2b3a;color:#fff;font:700 13px Lato;cursor:pointer">📤 Upload completed CSV<input type="file" accept=".csv,text/csv" multiple style="display:none" onchange="fbtUpload(this.files)"></label>
      <div id="fbt-up" style="margin-top:10px"></div>
    </div>`);
}
function fbtTemplate(kind){
  const y=new Date(); y.setDate(y.getDate()-1); const ds=y.toLocaleDateString('en-GB');
  if(kind==='sales') spDownload('fb-daily-sales-template.csv',[['Date','Line','Food','Drink','Covers'],...FBT.settings.lines.map(l=>[ds,l.name,'','',''])].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
  else spDownload('fb-invoices-template.csv',[['Date','Supplier','Type','Invoice no','Net','Notes'],[ds,'e.g. Brakes','Food','INV-0001','0.00','']].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
}
async function fbtUpload(files){
  const out=document.getElementById('fbt-up'); let nS=0,nI=0,bad=[];
  const toIso=s=>{ const p=spParseDT(s); return p&&p.date; };
  const startMonth=FBT.month;
  for(const f of files){
    const objs=hsRowsToObjects(await hsReadCSVFile(f)); if(!objs.length) continue;
    const keys=Object.keys(objs[0]).map(k=>k.toLowerCase());
    const get=(o,re)=>{ const k=Object.keys(o).find(k=>re.test(k.toLowerCase())); return k?o[k]:''; };
    if(keys.some(k=>/supplier/.test(k))){
      for(const o of objs){ const d=toIso(get(o,/^date/)), net=get(o,/net|amount|total/); if(!d||!get(o,/supplier/)||net===''){ continue; }
        if(d.slice(0,7)!==FBT.month) await fbtLoad(d.slice(0,7));
        let cat=get(o,/type|cat/)||'Food'; cat=/bev|drink|bar|wine|beer/i.test(cat)?'Beverage':/non/i.test(cat)?'Non-F&B':'Food';
        const rec={id:'inv'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), date:d, cat, supplier:get(o,/supplier/), no:get(o,/inv.*no|number|ref/), net:fbtN(net), notes:get(o,/note/), by:(SESSION&&SESSION.name)||''};
        FBT.data.invoices[rec.id]=rec; await fbtSave({['invoices.'+rec.id]:rec}); nI++; }
    } else if(keys.some(k=>/line|outlet|service/.test(k))){
      const byDay={};
      objs.forEach(o=>{ const d=toIso(get(o,/^date/)), ln=get(o,/line|outlet|service/); if(!d||!ln) return;
        const line=FBT.settings.lines.find(l=>l.name.toLowerCase()===ln.toLowerCase()||l.id===ln.toLowerCase());
        if(!line){ bad.push(ln); return; }
        const food=get(o,/food/), bev=get(o,/drink|bev/), cov=get(o,/cover/);
        if(food===''&&bev===''&&cov==='') return;
        (byDay[d]=byDay[d]||{})[line.id]={food:fbtN(food),bev:fbtN(bev),covers:fbtN(cov)}; });
      for(const [d,day] of Object.entries(byDay)){ if(d.slice(0,7)!==FBT.month) await fbtLoad(d.slice(0,7)); FBT.data.sales[d]=Object.assign(FBT.data.sales[d]||{},day);
        const patch={}; Object.entries(day).forEach(([l,v])=>patch[`sales.${d}.${l}`]=v); await fbtSave(patch); nS++; }
    } else bad.push(f.name+' (not a sales or invoice template)');
  }
  if(FBT.month!==startMonth) await fbtLoad(startMonth);
  if(out) out.innerHTML=`<div style="background:#E2F1EE;border-radius:10px;padding:10px;font-size:13px">✅ ${nS} day${nS===1?'':'s'} of sales and ${nI} invoice${nI===1?'':'s'} added.${bad.length?`<div style="color:#9a3412;margin-top:4px">Skipped: ${[...new Set(bad)].map(spEsc).join(', ')} — line names must match Settings.</div>`:''}</div>`;
  fbtDraw();
}
function fbtExport(){
  const C=fbtCalc(), S=FBT.settings;
  const head=['Date',...S.lines.flatMap(l=>[l.name+' food',l.name+' drink',l.name+' covers']),'Food sales','Drink sales','Covers','Food invoices','Drink invoices','Food GP MTD %','Drink GP MTD %'];
  const rows=C.rows.filter(r=>r.hasSales||r.pf||r.pb).map(r=>{ const s=FBT.data.sales[r.d]||{};
    return [r.d,...S.lines.flatMap(l=>[(s[l.id]||{}).food??'',(s[l.id]||{}).bev??'',(s[l.id]||{}).covers??'']),r.food,r.bev,r.covers,Math.round(r.pf*100)/100,Math.round(r.pb*100)/100,
      r.cf?Math.round((r.cf-r.cpf)/r.cf*1000)/10:'', r.cb?Math.round((r.cb-r.cpb)/r.cb*1000)/10:'']; });
  const inv=[[],['Invoices'],['Date','Supplier','Type','Invoice no','Net','Notes','Entered by'],...C.inv.sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date,x.supplier,x.cat,x.no,x.net,x.notes,x.by])];
  spDownload('fb-tracker-'+FBT.month+'.csv','﻿'+[['Brandon Hall Hotel & Spa — F&B tracker '+FBT.month],[],head,...rows,...inv].map(r=>r.map(spCsvCell).join(',')).join('\r\n'));
}
function fbtShare(how){
  const y=new Date(); y.setDate(y.getDate()-1); const yk=spDK(y); const C=fbtCalc(); const r=C.rows.find(x=>x.d===yk); if(!r) return;
  const s=FBT.data.sales[yk]||{};
  const txt=`Brandon Hall F&B — ${y.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}\n`+
    `Food ${fbtGBP(r.food)} · Drink ${fbtGBP(r.bev)} · Total ${fbtGBP(r.food+r.bev)} · ${r.covers} covers\n`+
    FBT.settings.lines.filter(l=>s[l.id]).map(l=>`${l.name}: ${fbtGBP(fbtN(s[l.id].food)+fbtN(s[l.id].bev))}${s[l.id].covers?' ('+s[l.id].covers+' covers)':''}`).join('\n')+
    `\n\nMonth to date: food ${fbtGBP(C.food.sales)} at ${fbtPct(C.food.gp)} GP (target ${C.food.target}%), drink ${fbtGBP(C.bev.sales)} at ${fbtPct(C.bev.gp)} GP (target ${C.bev.target}%).`+
    (C.food.left>0?`\nFood spend left this month to hit target: about ${fbtGBP(Math.max(0,C.food.remainBudget))} (${fbtGBP(Math.max(0,C.food.perDay))}/day).`:'');
  if(how==='wa') window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  else if(how==='mail') location.href='mailto:?subject='+encodeURIComponent('F&B sales — '+y.toLocaleDateString('en-GB'))+'&body='+encodeURIComponent(txt);
  else spCopy(txt);
}
function fbtFormLink(){
  const u=location.origin+location.pathname.replace(/[^\/]*$/,'')+'fb-entry.html';
  const msg="Hi Patrik, here's the link for the daily bar and restaurant figures. Please enter yesterday's sales (and any invoices) each morning and press Submit — it goes straight into HosPRO:\n"+u;
  showModal('Daily F&B form','For Patrik and the team — no login needed',`
    <div style="font-size:13px;color:#1a2b3a;line-height:1.55">
      <p style="margin:0 0 8px">Whoever does the figures opens this link each morning, picks the date, enters sales by outlet (and any supplier invoices), and presses <b>Submit</b>. The figures land in this tracker automatically the next time anyone opens it.</p>
      <div style="display:flex;gap:6px;margin:10px 0"><input readonly value="${u}" style="flex:1;padding:9px;border:1px solid #d1d5db;border-radius:8px;font:13px Lato">
        <button onclick="spCopy('${u}')" style="padding:8px 12px;border:none;border-radius:8px;background:#1a2b3a;color:#fff;font:700 12px Lato;cursor:pointer">Copy</button>
        <a href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" style="padding:8px 12px;border-radius:8px;background:#25D366;color:#fff;font:700 12px Lato;text-decoration:none">WhatsApp</a></div>
      <button onclick="closeModal();fbtImportSubmissions(false).then(n=>{ if(!n) toast('No new form submissions'); renderFBTracker(document.getElementById('view')); })" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:700 12px Lato;cursor:pointer">↻ Check for new submissions now</button>
    </div>`);
}
