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
  const W = { rows:[], live:false, q:"", purpose:"all", staying:"all", consent:"all", period:"30", from:"", to:"", town:"all" };

  const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = iso => { try{ return new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }catch(e){ return iso||"—"; } };
  const dayKey = iso => { const d=new Date(iso); return isNaN(d)?"":d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
  const todayKey = () => dayKey(new Date().toISOString());
  const niceTown = t => (t||"").trim().replace(/\s+/g," ").toLowerCase().replace(/(^|[\s-])\S/g, c=>c.toUpperCase());

  function startLive(){
    if(W.live) return;
    if(typeof FB==="undefined" || !FB.ready || !FB.user){ return; }
    W.live = true;
    FB.db.collection("wifi_signups").orderBy("created","desc").limit(10000)
      .onSnapshot(snap=>{ W.rows = snap.docs.map(d=>({id:d.id, ...d.data()})); paint(); },
        err=>{ console.warn("wifi_signups:", err.message); const b=document.getElementById("wf-list"); if(b) b.innerHTML=`<div class="admin-note">Could not load sign-ups: ${esc(err.message)}. Check the Firestore rules for <b>wifi_signups</b> have been published.</div>`; });
  }

  /* one row per email address (latest details), with visit count */
  function people(rows){
    const m = new Map();
    [...(rows||W.rows)].sort((a,b)=>(a.created||"").localeCompare(b.created||"")).forEach(r=>{
      const k = (r.email||"").toLowerCase(); if(!k) return;
      const p = m.get(k) || { email:k, visits:0, first:r.created, name:r.name||"", firstName:r.firstName||"", lastName:r.lastName||"", purpose:r.purpose||"", staying:r.staying||"", town:"", marketing:false, consentAt:"" };
      p.visits++; p.last = r.created; p.name = r.name||p.name; p.firstName = r.firstName||p.firstName; p.lastName = r.lastName||p.lastName;
      p.purpose = r.purpose||p.purpose; p.staying = r.staying||p.staying; p.town = niceTown(r.town)||p.town;
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
      (W.purpose==="all" || p.purpose===W.purpose) &&
      (W.staying==="all" || p.staying===W.staying) &&
      (W.consent==="all" || (W.consent==="yes" ? p.marketing : !p.marketing)) &&
      (W.town==="all" || p.town===W.town) &&
      (()=>{ const ts=new Date(p.last).getTime(); return ts>=f && ts<=t; })());
  }

  window.WifiGuests = {
    rows:()=>W.rows, people:()=>people(),
    stats(){ const all=people(); const tk=todayKey();
      return { guests:all.length, optins:all.filter(p=>p.marketing).length, today:W.rows.filter(r=>dayKey(r.created)===tk).length }; }
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
    return items.length ? items.map(i=>`<div style="display:grid;grid-template-columns:120px 1fr 36px;gap:8px;align-items:center;font-size:12px;margin:4px 0">
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
        ${sel("wf-purpose",[["all","Leisure & business"],["Leisure","Leisure only"],["Business","Business only"]])}
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
      <details style="margin-top:18px"><summary style="cursor:pointer;font:700 13px Lato;color:#1a2b3a">Welcome page &amp; set-up</summary>
        <div class="quote-panel" style="margin-top:8px">
          <p class="qs-sub">Guests on <b>Brandon Hall FREE WIFI</b> are sent to this page by the UniFi system (managed by Quest IT). Our relay server then authorises them for 8 hours.</p>
          <div class="embed-box">${WIFI_URL}<button class="cp" id="wf-copy">Copy</button></div>
          <div class="dual-btn" style="margin-top:10px"><a class="btn sm ghost" href="${WIFI_URL}?preview=1" target="_blank" rel="noopener">Preview the page ↗</a></div>
          <div class="admin-note" style="margin-top:12px">Full technical notes are in the project document <i>guest-wifi-portal</i>. Relay: Google Cloud VM "wifi-portal" (35.246.122.196). If guests report they can't get online, check UniFi with Quest first; the sign-in page and this database are independent of the hand-back.</div>
        </div></details>`;
    const on=(id,ev,fn)=>{ const e=document.getElementById(id); if(e) e[ev]=fn; };
    on("wf-q","oninput",e=>{ W.q=e.target.value; paint(); });
    ["purpose","staying","consent","town"].forEach(k=>on("wf-"+k,"onchange",e=>{ W[k]=e.target.value; paint(); }));
    on("wf-period","onchange",e=>{ W.period=e.target.value; document.getElementById("wf-custom").style.display=W.period==="custom"?"inline-flex":"none"; paint(); });
    on("wf-from","onchange",e=>{ W.from=e.target.value; paint(); }); on("wf-to","onchange",e=>{ W.to=e.target.value; paint(); });
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
    document.getElementById("wf-tiles").innerHTML =
      tile(todayN,"Sign-ups today",COL.brand) +
      tile(inRange.length,"Sign-ins in period",COL.navy, `${(inRange.length/nDays).toFixed(1)} per day`) +
      tile(pr.length,"Emails captured",COL.teal, `${all.length} all time`) +
      tile(optins,"Newsletter opt-ins","#166534", pr.length?`${Math.round(optins/pr.length*100)}% of guests`:"") +
      tile(pr.filter(p=>p.staying==="Staying").length,"Residents",COL.blue) +
      tile(pr.filter(p=>p.staying==="Visiting").length,"Visitors",COL.gold);

    /* charts */
    const [f,t] = range(); const span = (W.period==="all") ? 30 : Math.min(60, Math.max(1, Math.ceil(((t===Infinity?Date.now():t)-(f||Date.now()-30*864e5))/864e5)));
    const series=[]; for(let i=span-1;i>=0;i--){ const d=new Date((t===Infinity?Date.now():t)-i*864e5); const k=dayKey(d.toISOString());
      series.push({ label:d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}), title:d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}), value:days[k]||0 }); }
    const towns = {}; pr.forEach(p=>{ if(p.town) towns[p.town]=(towns[p.town]||0)+1; });
    const topTowns = Object.entries(towns).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value}));
    document.getElementById("wf-charts").innerHTML =
      card(`Sign-ins per day <span style="font-weight:400;color:#8296a8">— ${W.period==="today"?"today":W.period==="all"?"last 30 days":"selected period"}</span>`, barChart(series,{every:Math.ceil(series.length/10)})) +
      `<div style="display:grid;gap:12px">
        ${card("Residents vs visitors", splitBar([{label:"Residents",value:pr.filter(p=>p.staying==="Staying").length,colour:COL.blue},{label:"Visitors",value:pr.filter(p=>p.staying==="Visiting").length,colour:COL.gold},{label:"Not asked",value:pr.filter(p=>!p.staying).length,colour:"#cfd6de"}].filter(x=>x.value)))}
        ${card("Leisure vs business", splitBar([{label:"Leisure",value:pr.filter(p=>p.purpose==="Leisure").length,colour:COL.teal},{label:"Business",value:pr.filter(p=>p.purpose==="Business").length,colour:COL.brand}].filter(x=>x.value)))}
      </div>` +
      card("Where guests come from <span style='font-weight:400;color:#8296a8'>— top towns</span>", hBars(topTowns, COL.brand), "grid-column:1/-1");

    /* town filter options */
    const ts=document.getElementById("wf-town"); if(ts){ const cur=ts.value; const allTowns=[...new Set(all.map(p=>p.town).filter(Boolean))].sort();
      ts.innerHTML=`<option value="all">All towns</option>`+allTowns.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(""); ts.value=allTowns.includes(cur)?cur:"all"; if(ts.value!==W.town) W.town=ts.value; }

    const cnt=document.getElementById("wf-count"); if(cnt) cnt.textContent = `${rows.length} guest${rows.length===1?"":"s"} match`;
    if(!W.live && (typeof FB==="undefined" || !FB.ready || !FB.user)){ box.innerHTML = `<div class="admin-note">Sign in to the portal to see live sign-ups.</div>`; return; }
    if(!rows.length){ box.innerHTML = `<div class="qs-sub" style="padding:18px 4px">${all.length ? "No guests match those filters." : "No sign-ups yet."}</div>`; return; }
    box.innerHTML = `<div style="overflow-x:auto"><table class="data-table">
      <tr><th>Name</th><th>Email</th><th>Town</th><th>Staying</th><th>Visit</th><th>Newsletter</th><th>Visits</th><th>Last seen</th><th>First seen</th></tr>
      ${rows.slice(0,500).map(p=>`<tr>
        <td style="font-weight:700;color:#1a2b3a">${esc(p.name)}</td>
        <td><a href="mailto:${esc(p.email)}" style="color:#2F7A72">${esc(p.email)}</a></td>
        <td>${esc(p.town||"—")}</td>
        <td>${p.staying==="Staying"?"Resident":p.staying==="Visiting"?"Visitor":"—"}</td>
        <td>${esc(p.purpose||"—")}</td>
        <td>${p.marketing ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700">Yes</span>` : `<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:11.5px">No</span>`}</td>
        <td>${p.visits}</td>
        <td style="white-space:nowrap">${fmt(p.last)}</td>
        <td style="white-space:nowrap;color:#8296a8">${fmt(p.first)}</td>
      </tr>`).join("")}
    </table></div>${rows.length>500?`<p class="qs-sub">Showing the first 500 of ${rows.length} — narrow the filters or export for the full list.</p>`:""}`;
  }

  function exportRows(kind){
    const rows = filtered();
    const head = ["First name","Last name","Email","Town","Staying","Purpose","Newsletter opt-in","Consent date","Visits","First seen","Last seen"];
    const data = rows.map(p=>[p.firstName||p.name.split(" ")[0], p.lastName||p.name.split(" ").slice(1).join(" "), p.email, p.town||"", p.staying==="Staying"?"Resident":p.staying==="Visiting"?"Visitor":"", p.purpose||"", p.marketing?"Yes":"No", p.marketing?fmt(p.consentAt):"", p.visits, fmt(p.first), fmt(p.last)]);
    const stamp = new Date().toISOString().slice(0,10);
    if(kind==="xlsx" && typeof XLSX!=="undefined"){
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws["!cols"] = [{wch:16},{wch:18},{wch:34},{wch:16},{wch:10},{wch:10},{wch:16},{wch:20},{wch:7},{wch:20},{wch:20}];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Guests");
      XLSX.writeFile(wb, `brandon-hall-guests-${stamp}.xlsx`); return;
    }
    const csv = [head, ...data].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download = `brandon-hall-guests-${stamp}.csv`; a.click();
  }
})();
