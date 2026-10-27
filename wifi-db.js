/* ============================================================
   HosMARKETING — Guest Database (Individuals)
   Everyone who signs in to the free guest Wi-Fi at
   https://www.brandonhallhotelandspa.com/wifi/ lands in Firestore
   collection "wifi_signups". This tab is the dashboard, the
   searchable list and the newsletter export.
   Loaded before app.js; app.js registers window.renderWifiDb.
   Exposes window.WifiGuests { rows(), people(), stats() } for the
   module home tiles.
   ============================================================ */
(function(){
  const WIFI_URL = "https://www.brandonhallhotelandspa.com/wifi/";
  const COL = { brand:"#9C4F63", navy:"#1a2b3a", teal:"#2B726A", blue:"#3B6585", gold:"#7A6538", grey:"#8296a8", line:"#e4e9ef" };
  const W = { rows:[], live:false, q:"", reason:"all", staying:"all", consent:"all", period:"30", from:"", to:"", town:"all", listeners:[], apNames:{}, apLoaded:false, page:0, per:25 };
  const REASONS = ["Hotel stay","Spa","Restaurant or bar","Wedding or party","Meeting or conference"];
  const device = ua => /iPhone|iPad|iPod/i.test(ua||"") ? "iPhone / iPad" : /Android/i.test(ua||"") ? "Android" : /Macintosh/i.test(ua||"") ? "Mac" : /Windows/i.test(ua||"") ? "Windows laptop" : ua ? "Other" : "";
  const apName = mac => W.apNames[(mac||"").toLowerCase()] || "";
  function loadApNames(){ if(W.apLoaded || typeof FB==="undefined" || !FB.ready || !FB.user) return; W.apLoaded=true;
    FB.db.collection("meta").doc("ap_names").onSnapshot(d=>{ W.apNames = (d.exists && d.data().names) || {}; paint(); }, ()=>{}); }

  const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = iso => { try{ return new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }catch(e){ return iso||"—"; } };
  const dayKey = iso => { const d=new Date(iso); return isNaN(d)?"":d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
  const todayKey = () => dayKey(new Date().toISOString());
  const niceTown = t => (t||"").trim().replace(/\s+/g," ").toLowerCase().replace(/(^|[\s-])\S/g, c=>c.toUpperCase());

  function startLive(){
    if(W.live) return;
    if(typeof FB==="undefined" || !FB.ready || !FB.user){ return; }
    W.live = true; loadApNames();
    FB.db.collection("wifi_signups").orderBy("created","desc").limit(10000)
      .onSnapshot(snap=>{ W.rows = snap.docs.map(d=>({id:d.id, ...d.data()})); paint(); W.listeners.forEach(fn=>{ try{ fn(); }catch(e){} }); },
        err=>{ console.warn("wifi_signups:", err.message); const b=document.getElementById("wf-list"); if(b) b.innerHTML=`<div class="admin-note">Could not load sign-ups: ${esc(err.message)}. Check the Firestore rules for <b>wifi_signups</b> have been published.</div>`; });
  }

  /* one row per email address (latest details), with visit count */
  function people(rows){
    const m = new Map();
    [...(rows||W.rows)].sort((a,b)=>(a.created||"").localeCompare(b.created||"")).forEach(r=>{
      const k = (r.email||"").toLowerCase(); if(!k) return;
      const p = m.get(k) || { email:k, visits:0, first:r.created, name:r.name||"", title:"", firstName:r.firstName||"", lastName:r.lastName||"", reason:"", purpose:r.purpose||"", staying:r.staying||"", town:"", device:"", marketing:false, consentAt:"", reasons:{} };
      p.visits++; p.last = r.created; p.name = r.name||p.name; p.firstName = r.firstName||p.firstName; p.lastName = r.lastName||p.lastName;
      if(r.title && r.title!=="n/a") p.title = r.title;
      if(r.reason){ p.reason = r.reason; p.reasons[r.reason]=(p.reasons[r.reason]||0)+1; }
      p.purpose = r.purpose||p.purpose; p.staying = r.staying||p.staying; p.town = niceTown(r.town)||p.town; p.device = device(r.userAgent)||p.device;
      if(r.marketing){ p.marketing = true; p.consentAt = r.consentAt||r.created; }
      m.set(k,p);
    });
    return [...m.values()].sort((a,b)=>(b.last||"").localeCompare(a.last||""));
  }

  function range(){
    const now = new Date(); let from=0, to=Infinity;
    if(W.period==="today"){ from=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); }
    else if(W.period==="7"){ from=Date.now()-7*864e5; }
    else if(W.period==="30"){ from=Date.now()-30*864e5; }
    else if(W.period==="month"){ from=new Date(now.getFullYear(),now.getMonth(),1).getTime(); }
    else if(W.period==="custom"){ if(W.from) from=new Date(W.from).getTime(); if(W.to) to=new Date(W.to).getTime()+864e5-1; }
    return [from,to];
  }
  /* sign-in records inside the chosen date range (for the charts) */
  function rowsInRange(){ const [f,t]=range(); return W.rows.filter(r=>{ const ts=new Date(r.created).getTime(); return ts>=f && ts<=t; }); }
  /* people whose LAST visit is in range and who match the other filters (for the table/export) */
  function filtered(){
    const q = W.q.toLowerCase(); const [f,t]=range();
    return people().filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.email.includes(q) || p.town.toLowerCase().includes(q)) &&
      (W.reason==="all" || p.reason===W.reason || (W.reason==="none" && !p.reason)) &&
      (W.staying==="all" || p.staying===W.staying) &&
      (W.consent==="all" || (W.consent==="yes" ? p.marketing : !p.marketing)) &&
      (W.town==="all" || p.town===W.town) &&
      (()=>{ const ts=new Date(p.last).getTime(); return ts>=f && ts<=t; })());
  }

  window.WifiGuests = {
    rows:()=>W.rows, people:()=>people(), load:startLive, onChange:fn=>W.listeners.push(fn), dayKey, people7:()=>people(W.rows.filter(r=>new Date(r.created).getTime()>Date.now()-7*864e5)),
    stats(){ const all=people(); const tk=todayKey();
      return { guests:all.length, optins:all.filter(p=>p.marketing).length, today:all.filter(p=>dayKey(p.first)===tk).length }; }
  };

  /* ---------- tiny SVG charts (no library) ---------- */
  function barChart(series, opts){   // series: [{label, value}], vertical bars
    const w=opts.w||600, h=opts.h||150, pad=26, bw=Math.max(4,(w-pad*2)/series.length-3);
    const max=Math.max(1,...series.map(s=>s.value));
    const bars=series.map((s,i)=>{ const x=pad+i*((w-pad*2)/series.length), bh=(s.value/max)*(h-40), y=h-24-bh;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${opts.colour||COL.brand}" opacity="${s.value?1:.25}"><title>${esc(s.title||s.label)}: ${s.value}</title></rect>`+
        (s.value?`<text x="${x+bw/2}" y="${y-4}" font-size="9" text-anchor="middle" fill="#5b6b7b">${s.value}</text>`:"")+
        ((i%opts.every===0||series.length<=14)?`<text x="${x+bw/2}" y="${h-8}" font-size="9" text-anchor="middle" fill="#8296a8">${esc(s.label)}</text>`:""); }).join("");
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block">${bars}</svg>`;
  }
  function splitBar(parts){   // parts: [{label,value,colour}] → one stacked horizontal bar + legend
    const total=parts.reduce((s,p)=>s+p.value,0)||1; let x=0;
    const segs=parts.map(p=>{ const w=(p.value/total)*100; const s=`<div title="${esc(p.label)}: ${p.value}" style="width:${w}%;background:${p.colour};height:100%"></div>`; x+=w; return s; }).join("");
    const leg=parts.map(p=>`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:12px;color:#374151"><i style="width:10px;height:10px;border-radius:3px;background:${p.colour};display:inline-block"></i>${esc(p.label)} <b>${p.value}</b> <span style="color:#8296a8">(${Math.round(p.value/total*100)}%)</span></span>`).join("");
    return `<div style="display:flex;height:16px;border-radius:8px;overflow:hidden;background:#eef1f4;margin:8px 0 10px">${segs}</div><div>${leg}</div>`;
  }
  function hBars(items, colour){  // items: [{label,value}] top-N horizontal
    const max=Math.max(1,...items.map(i=>i.value));
    return items.length ? items.map(i=>`<div style="display:grid;grid-template-columns:150px 1fr 36px;gap:8px;align-items:center;font-size:12px;margin:4px 0">
      <span style="color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(i.label)}">${esc(i.label)}</span>
      <div style="background:#eef1f4;border-radius:5px;height:12px"><div style="width:${i.value/max*100}%;background:${colour};height:100%;border-radius:5px"></div></div>
      <b style="text-align:right">${i.value}</b></div>`).join("") : `<div class="qs-sub">No towns recorded yet — the question was added to the sign-in page; new guests will start to fill this in.</div>`;
  }

  const sel = (id,opts) => `<select id="${id}" style="padding:9px 10px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato;background:#fff">${opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>`;
  const card = (title, body, extra="") => `<div style="background:#fff;border:1px solid ${COL.line};border-radius:12px;padding:14px 16px;${extra}"><div style="font:700 13px Lato;color:${COL.navy};margin-bottom:6px">${title}</div>${body}</div>`;

  window.renderWifiDb = function(v){
    startLive();
    v.innerHTML = `
      <div class="page-head" style="margin-bottom:6px">
        <h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">👥 Guest Database <span style="font-weight:400;color:#8296a8;font-size:15px">— individuals</span></h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:70em">Every individual who signs in to the free guest Wi-Fi — residents, spa, restaurant, wedding and conference guests. Guests who ticked the newsletter box are your mailing list; export them and import into Mailchimp. Each person appears once, with how many times they've visited. Corporate accounts live in HosVENUE → Corporate Database.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0 12px">
        ${sel("wf-period",[["today","Today"],["7","Last 7 days"],["30","Last 30 days"],["month","This month"],["all","All time"],["custom","Custom dates…"]])}
        <span id="wf-custom" style="display:none;gap:6px;align-items:center"><input id="wf-from" type="date" style="padding:8px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato"> <span style="color:#8296a8">to</span> <input id="wf-to" type="date" style="padding:8px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato"></span>
        ${sel("wf-staying",[["all","Residents & visitors"],["Staying","Residents only"],["Visiting","Visitors only"]])}
        ${sel("wf-reason",[["all","All reasons"]].concat(REASONS.map(r=>[r,r])).concat([["none","Not asked (older sign-ups)"]]))}
        ${sel("wf-consent",[["all","All guests"],["yes","Newsletter opt-in only"],["no","No marketing consent"]])}
        <select id="wf-town" style="padding:9px 10px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato;background:#fff"><option value="all">All towns</option></select>
      </div>
      <div id="wf-tiles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:0 0 12px"></div>
      <div id="wf-charts" style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:14px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 10px">
        <input id="wf-q" placeholder="Search name, email or town…" style="flex:1 1 240px;padding:9px 12px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato">
        <span id="wf-count" style="font-size:12.5px;color:#8296a8"></span>
        <button id="wf-csv" class="btn sm">⬇ Export CSV</button>
        <button id="wf-xlsx" class="btn sm ghost">⬇ Export Excel</button>
      </div>
      <div id="wf-list"></div>
      <details style="margin-top:18px"><summary style="cursor:pointer;font:700 13px Lato;color:#1a2b3a">Access points — name the areas of the hotel</summary>
        <div class="quote-panel" style="margin-top:8px">
          <p class="qs-sub">Each sign-in records which Wi-Fi access point served the guest. Give each one a name (Spa, Clarendon, East Wing…) and the "Where in the hotel" chart uses it. Quest IT can supply the list of access points and their MAC addresses.</p>
          <div id="wf-aps"></div>
        </div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font:700 13px Lato;color:#1a2b3a">Welcome page &amp; set-up</summary>
        <div class="quote-panel" style="margin-top:8px">
          <p class="qs-sub">Guests on <b>Brandon Hall FREE WIFI</b> are sent to this page by the UniFi system (managed by Quest IT). Our relay server then authorises them for 8 hours.</p>
          <div class="embed-box">${WIFI_URL}<button class="cp" id="wf-copy">Copy</button></div>
          <div class="dual-btn" style="margin-top:10px"><a class="btn sm ghost" href="${WIFI_URL}?preview=1" target="_blank" rel="noopener">Preview the page ↗</a></div>
          <div class="admin-note" style="margin-top:12px">Full technical notes are in the project document <i>guest-wifi-portal</i>. Relay: Google Cloud VM "wifi-portal" (35.246.122.196). If guests report they can't get online, check UniFi with Quest first; the sign-in page and this database are independent of the hand-back.</div>
        </div></details>`;
    const on=(id,ev,fn)=>{ const e=document.getElementById(id); if(e) e[ev]=fn; };
    on("wf-q","oninput",e=>{ W.q=e.target.value; W.page=0; paint(); });
    ["reason","staying","consent","town"].forEach(k=>on("wf-"+k,"onchange",e=>{ W[k]=e.target.value; W.page=0; paint(); }));
    on("wf-period","onchange",e=>{ W.period=e.target.value; W.page=0; document.getElementById("wf-custom").style.display=W.period==="custom"?"inline-flex":"none"; paint(); });
    on("wf-from","onchange",e=>{ W.from=e.target.value; W.page=0; paint(); }); on("wf-to","onchange",e=>{ W.to=e.target.value; W.page=0; paint(); });
    on("wf-copy","onclick",function(){ navigator.clipboard?.writeText(WIFI_URL); this.textContent="Copied"; });
    on("wf-csv","onclick",()=>exportRows("csv")); on("wf-xlsx","onclick",()=>exportRows("xlsx"));
    document.getElementById("wf-period").value=W.period;
    paint();
  };

  function paint(){
    const box = document.getElementById("wf-list"); if(!box) return;
    const all = people(), inRange = rowsInRange(), pr = people(inRange), rows = filtered();
    const tk = todayKey();
    const todayN = W.rows.filter(r=>dayKey(r.created)===tk).length;
    const days = {}; inRange.forEach(r=>{ const k=dayKey(r.created); if(k) days[k]=(days[k]||0)+1; });
    const nDays = Math.max(1, Object.keys(days).length);
    const optins = pr.filter(p=>p.marketing).length;

    const tile = (n,l,c,sub) => `<div style="background:#fff;border:1px solid ${COL.line};border-radius:12px;padding:12px 14px"><div style="font:800 23px Lato;color:${c||COL.brand}">${n}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${l}</div>${sub?`<div style="font-size:11px;color:#5b6b7b;margin-top:3px">${sub}</div>`:""}</div>`;
    const newToday = all.filter(p=>dayKey(p.first)===tk).length;
    const newInRange = (()=>{ const [f,t]=range(); return all.filter(p=>{ const ts=new Date(p.first).getTime(); return ts>=f && ts<=t; }).length; })();
    document.getElementById("wf-tiles").innerHTML =
      tile(newToday,"New guests today",COL.brand, `${todayN} connection${todayN===1?"":"s"} incl. repeats`) +
      tile(pr.length,"Guests in period",COL.navy, `${newInRange} new · ${(pr.length/nDays).toFixed(1)} per day`) +
      tile(all.length,"Emails on file",COL.teal, `${all.filter(p=>p.marketing).length} on the newsletter list`) +
      tile(optins,"Newsletter opt-ins","#166534", pr.length?`${Math.round(optins/pr.length*100)}% of guests in period`:"") +
      tile(pr.filter(p=>p.staying==="Staying").length,"Residents",COL.blue) +
      tile(pr.filter(p=>p.staying==="Visiting").length,"Visitors",COL.gold);

    /* charts */
    const [f,t] = range(); const span = (W.period==="all") ? 30 : Math.min(60, Math.max(1, Math.ceil(((t===Infinity?Date.now():t)-(f||Date.now()-30*864e5))/864e5)));
    const series=[]; for(let i=span-1;i>=0;i--){ const d=new Date((t===Infinity?Date.now():t)-i*864e5); const k=dayKey(d.toISOString());
      series.push({ label:d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}), title:d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}), value:days[k]||0 }); }
    const towns = {}; pr.forEach(p=>{ if(p.town) towns[p.town]=(towns[p.town]||0)+1; });
    const topTowns = Object.entries(towns).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value}));
    document.getElementById("wf-charts").innerHTML =
      card(`Connections per day <span style="font-weight:400;color:#8296a8">— includes guests reconnecting · ${W.period==="today"?"today":W.period==="all"?"last 30 days":"selected period"}</span>`, barChart(series,{every:Math.ceil(series.length/10)})) +
      `<div style="display:grid;gap:12px">
        ${card("Residents vs visitors", splitBar([{label:"Residents",value:pr.filter(p=>p.staying==="Staying").length,colour:COL.blue},{label:"Visitors",value:pr.filter(p=>p.staying==="Visiting").length,colour:COL.gold},{label:"Not asked",value:pr.filter(p=>!p.staying).length,colour:"#cfd6de"}].filter(x=>x.value)))}
        ${card("Device", splitBar([["iPhone / iPad","#1a2b3a"],["Android","#2B726A"],["Mac","#3B6585"],["Windows laptop","#7A6538"],["Other","#cfd6de"]].map(([l,c])=>({label:l,value:pr.filter(p=>p.device===l).length,colour:c})).filter(x=>x.value)))}
      </div>` +
      card("What brings guests here", hBars(REASONS.map(r=>({label:r,value:pr.filter(p=>p.reason===r).length})).filter(x=>x.value).sort((a,b)=>b.value-a.value), COL.teal) + (pr.filter(p=>!p.reason).length?`<div class="qs-sub" style="margin-top:6px">${pr.filter(p=>!p.reason).length} older sign-ups were asked leisure/business instead.</div>`:"")) +
      card("Where in the hotel <span style='font-weight:400;color:#8296a8'>— by access point</span>", (()=>{ const c={}; inRange.forEach(r=>{ const k=(r.ap||"").toLowerCase(); if(k) c[k]=(c[k]||0)+1; });
          const items=Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([mac,n])=>({label:apName(mac)||mac, value:n}));
          return items.length ? hBars(items.slice(0,10), COL.blue) + (Object.keys(c).some(k=>!apName(k))?`<div class="qs-sub" style="margin-top:6px">Unnamed access points show as codes — name them in <b>Access points</b> below.</div>`:"") : `<div class="qs-sub">No access-point data in this period.</div>`; })()) +
      card("Busiest days", barChart(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i)=>({label:d,value:inRange.filter(r=>((new Date(r.created).getDay()+6)%7)===i).length})),{h:120,every:1,colour:COL.navy})) +
      card("Busiest times of day", barChart(Array.from({length:12},(_,i)=>({label:(i*2)+":00",value:inRange.filter(r=>Math.floor(new Date(r.created).getHours()/2)===i).length})),{h:120,every:1,colour:COL.gold})) +
      card("Where guests come from <span style='font-weight:400;color:#8296a8'>— top towns</span>", hBars(topTowns, COL.brand), "grid-column:1/-1");

    /* town filter options */
    const ts=document.getElementById("wf-town"); if(ts){ const cur=ts.value; const allTowns=[...new Set(all.map(p=>p.town).filter(Boolean))].sort();
      ts.innerHTML=`<option value="all">All towns</option>`+allTowns.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(""); ts.value=allTowns.includes(cur)?cur:"all"; if(ts.value!==W.town) W.town=ts.value; }

    const apBox=document.getElementById("wf-aps");
    if(apBox && !apBox.contains(document.activeElement)){ const seen={}; W.rows.forEach(r=>{ const k=(r.ap||"").toLowerCase(); if(k){ seen[k]=seen[k]||{n:0,last:""}; seen[k].n++; if(r.created>seen[k].last) seen[k].last=r.created; } });
      const macs=Object.keys(seen).sort((a,b)=>seen[b].n-seen[a].n);
      const sig=macs.join("|")+"#"+JSON.stringify(W.apNames); if(apBox.dataset.sig!==sig){ apBox.dataset.sig=sig;
      apBox.innerHTML = macs.length ? `<table class="data-table"><tr><th>Access point</th><th>Name / area</th><th>Sign-ins</th><th>Last used</th></tr>${macs.map(mac=>`<tr><td style="font-family:monospace">${esc(mac)}</td><td><input data-ap="${esc(mac)}" value="${esc(W.apNames[mac]||"")}" placeholder="e.g. Spa reception" style="width:100%;padding:6px 9px;border:1px solid #d9e0e7;border-radius:7px;font:13px Lato"></td><td>${seen[mac].n}</td><td>${fmt(seen[mac].last)}</td></tr>`).join("")}</table><button id="wf-apsave" class="btn sm" style="margin-top:8px">Save names</button>` : `<div class="qs-sub">No access-point identifiers received yet.</div>`;
      const sv=document.getElementById("wf-apsave"); if(sv) sv.onclick=async()=>{ const names={}; apBox.querySelectorAll("[data-ap]").forEach(i=>{ if(i.value.trim()) names[i.dataset.ap]=i.value.trim(); });
        try{ await FB.db.collection("meta").doc("ap_names").set({names},{merge:false}); toastMsg("Access point names saved"); }catch(e){ toastMsg("Could not save: "+e.message); } }; } }
    const cnt=document.getElementById("wf-count"); if(cnt) cnt.textContent = `${rows.length} guest${rows.length===1?"":"s"} match`;
    if(!W.live && (typeof FB==="undefined" || !FB.ready || !FB.user)){ box.innerHTML = `<div class="admin-note">Sign in to the portal to see live sign-ups.</div>`; return; }
    if(!rows.length){ box.innerHTML = `<div class="qs-sub" style="padding:18px 4px">${all.length ? "No guests match those filters." : "No sign-ups yet."}</div>`; return; }
    const pages = Math.max(1, Math.ceil(rows.length / W.per)); if(W.page >= pages) W.page = pages-1;
    const start = W.page*W.per, slice = rows.slice(start, start+W.per);
    const pager = () => pages<=1 ? "" : `<div style="display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin:10px 0;font-size:12.5px;color:#5b6b7b">
      <span style="margin-right:6px">Showing ${start+1}–${Math.min(start+W.per,rows.length)} of ${rows.length}</span>
      <button class="btn sm ghost wf-pg" data-pg="${W.page-1}" ${W.page===0?"disabled":""}>‹ Prev</button>
      ${Array.from({length:pages},(_,i)=>i).filter(i=>i===0||i===pages-1||Math.abs(i-W.page)<=2).reduce((acc,i,idx,arr)=>{ if(idx && i-arr[idx-1]>1) acc.push(`<span>…</span>`); acc.push(`<button class="btn sm ${i===W.page?"":"ghost"} wf-pg" data-pg="${i}">${i+1}</button>`); return acc; },[]).join("")}
      <button class="btn sm ghost wf-pg" data-pg="${W.page+1}" ${W.page>=pages-1?"disabled":""}>Next ›</button></div>`;
    box.innerHTML = pager() + `<div style="overflow-x:auto"><table class="data-table">
      <tr><th>Name</th><th>Email</th><th>Town</th><th>Reason</th><th>Staying</th><th>Newsletter</th><th>Visits</th><th>Last seen</th><th>First seen</th></tr>
      ${slice.map(p=>`<tr data-email="${esc(p.email)}" style="cursor:pointer" title="Click to edit">
        <td style="font-weight:700;color:#1a2b3a">${p.title?esc(p.title)+" ":""}${esc(p.name)} <span style="color:#c9a978;font-size:11px">✎</span></td>
        <td><a href="mailto:${esc(p.email)}" style="color:#2F7A72" onclick="event.stopPropagation()">${esc(p.email)}</a></td>
        <td>${esc(p.town||"—")}</td>
        <td>${esc(p.reason||p.purpose||"—")}</td>
        <td>${p.staying==="Staying"?"Resident":p.staying==="Visiting"?"Visitor":"—"}</td>
        <td>${p.marketing ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700">Yes</span>` : `<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:11.5px">No</span>`}</td>
        <td>${p.visits}</td>
        <td style="white-space:nowrap">${fmt(p.last)}</td>
        <td style="white-space:nowrap;color:#8296a8">${fmt(p.first)}</td>
      </tr>`).join("")}
    </table></div>` + pager();
    box.querySelectorAll("tr[data-email]").forEach(tr=>tr.onclick=()=>openGuest(tr.dataset.email));
    box.querySelectorAll(".wf-pg").forEach(b=>b.onclick=()=>{ W.page=+b.dataset.pg; paint(); box.scrollIntoView({behavior:"smooth",block:"start"}); });
  }

  /* ---------- edit / delete a guest (applies to every sign-in record for that email) ---------- */
  function openGuest(email){
    const p = people().find(x=>x.email===email); if(!p || typeof showModal!=="function") return;
    const recs = W.rows.filter(r=>(r.email||"").toLowerCase()===email);
    const f = (id,label,val,type="text") => `<label style="display:block;font-size:11.5px;font-weight:700;color:#8296a8;text-transform:uppercase;letter-spacing:.3px;margin:10px 0 4px">${label}</label><input id="${id}" type="${type}" value="${esc(val)}" style="width:100%;padding:9px 11px;border:1px solid #d9e0e7;border-radius:9px;font:13.5px Lato">`;
    const selx = (id,label,val,opts) => `<label style="display:block;font-size:11.5px;font-weight:700;color:#8296a8;text-transform:uppercase;letter-spacing:.3px;margin:10px 0 4px">${label}</label><select id="${id}" style="width:100%;padding:9px 11px;border:1px solid #d9e0e7;border-radius:9px;font:13.5px Lato;background:#fff">${opts.map(([v,l])=>`<option value="${v}" ${v===val?"selected":""}>${l}</option>`).join("")}</select>`;
    showModal(esc(p.name||p.email), `${p.visits} visit${p.visits===1?"":"s"} · first seen ${fmt(p.first)} · last seen ${fmt(p.last)}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div>${selx("gd-title","Title",p.title||"",[["","—"],["Mr","Mr"],["Mrs","Mrs"],["Ms","Ms"],["Miss","Miss"],["Dr","Dr"],["Mx","Mx"]])}</div>
        <div>${selx("gd-reason","What brought them here",p.reason||"",[["","—"]].concat(REASONS.map(r=>[r,r])))}</div>
        <div>${f("gd-first","First name",p.firstName||p.name.split(" ")[0]||"")}</div>
        <div>${f("gd-last","Last name",p.lastName||p.name.split(" ").slice(1).join(" "))}</div>
        <div style="grid-column:1/-1">${f("gd-email","Email",p.email,"email")}</div>
        <div>${f("gd-town","Town / city",p.town||"")}</div>
        <div>${selx("gd-staying","Staying",p.staying||"",[["","Not asked"],["Staying","Resident"],["Visiting","Visitor"]])}</div>
        <div>${selx("gd-purpose","Purpose",p.purpose||"",[["","—"],["Leisure","Leisure"],["Business","Business"]])}</div>
        <div>${selx("gd-mkt","Newsletter",p.marketing?"1":"0",[["1","Opted in"],["0","Not opted in / unsubscribed"]])}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px">
        <button id="gd-save" class="btn sm">💾 Save changes</button>
        <button id="gd-unsub" class="btn sm ghost">✉️ Unsubscribe</button>
        <span style="flex:1"></span>
        <button id="gd-del" class="btn sm ghost" style="color:#991b1b;border-color:#f3c5c5">🗑 Delete guest</button>
      </div>
      <div class="admin-note" style="margin-top:12px">Changes apply to all ${recs.length} sign-in record${recs.length===1?"":"s"} for this email. Delete removes them permanently — use it for test entries or a guest who asks to be forgotten.</div>`);
    const g = id => document.getElementById(id);
    const batchUpdate = async (patch) => {
      const b = FB.db.batch(); recs.forEach(r=>b.update(FB.db.collection("wifi_signups").doc(r.id), patch)); await b.commit();
    };
    g("gd-save").onclick = async ()=>{
      const first=g("gd-first").value.trim(), last=g("gd-last").value.trim(), em=g("gd-email").value.trim().toLowerCase();
      if(!em.includes("@")) return toastMsg("Please enter a valid email");
      const mk = g("gd-mkt").value==="1";
      const patch = { title:g("gd-title").value, reason:g("gd-reason").value, firstName:first, lastName:last, name:(first+" "+last).trim(), email:em, town:g("gd-town").value.trim(), staying:g("gd-staying").value, purpose:g("gd-purpose").value, marketing:mk, editedAt:new Date().toISOString(), editedBy:(FB.user&&FB.user.name)||"" };
      if(mk && !p.marketing) patch.consentAt = new Date().toISOString();
      try{ await batchUpdate(patch); closeModal(); toastMsg("Guest updated"); }catch(e){ toastMsg("Could not save: "+e.message); }
    };
    g("gd-unsub").onclick = async ()=>{ try{ await batchUpdate({ marketing:false, unsubscribedAt:new Date().toISOString(), editedBy:(FB.user&&FB.user.name)||"" }); closeModal(); toastMsg("Removed from the newsletter list"); }catch(e){ toastMsg("Could not update: "+e.message); } };
    g("gd-del").onclick = async ()=>{
      if(!confirm(`Delete ${p.name||p.email} and all ${recs.length} sign-in record(s)? This cannot be undone.`)) return;
      try{ const b=FB.db.batch(); recs.forEach(r=>b.delete(FB.db.collection("wifi_signups").doc(r.id))); await b.commit(); closeModal(); toastMsg("Guest deleted"); }catch(e){ toastMsg("Could not delete: "+e.message); }
    };
  }
  function toastMsg(m){ if(typeof toast==="function") toast(m); else alert(m); }

  function exportRows(kind){
    const rows = filtered();
    const head = ["Title","First name","Last name","Email","Town","Reason","Staying","Purpose","Device","Newsletter opt-in","Consent date","Visits","First seen","Last seen"];
    const data = rows.map(p=>[p.title||"", p.firstName||p.name.split(" ")[0], p.lastName||p.name.split(" ").slice(1).join(" "), p.email, p.town||"", p.reason||"", p.staying==="Staying"?"Resident":p.staying==="Visiting"?"Visitor":"", p.purpose||"", p.device||"", p.marketing?"Yes":"No", p.marketing?fmt(p.consentAt):"", p.visits, fmt(p.first), fmt(p.last)]);
    const stamp = new Date().toISOString().slice(0,10);
    if(kind==="xlsx" && typeof XLSX!=="undefined"){
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws["!cols"] = [{wch:6},{wch:16},{wch:18},{wch:34},{wch:16},{wch:20},{wch:10},{wch:10},{wch:14},{wch:16},{wch:20},{wch:7},{wch:20},{wch:20}];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Guests");
      XLSX.writeFile(wb, `brandon-hall-guests-${stamp}.xlsx`); return;
    }
    const csv = [head, ...data].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download = `brandon-hall-guests-${stamp}.csv`; a.click();
  }
})();
