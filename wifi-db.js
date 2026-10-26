/* ============================================================
   HosSTUDIO — Wi-Fi Guest Database
   Guests who sign in to the free guest Wi-Fi at
   https://www.brandonhallhotelandspa.com/wifi/ land in Firestore
   collection "wifi_signups". This tab lists them, shows the
   newsletter opt-ins and exports to CSV / Excel.
   Loaded before app.js; app.js registers window.renderWifiDb.
   ============================================================ */
(function(){
  const WIFI_URL = "https://www.brandonhallhotelandspa.com/wifi/";
  const W = { rows:[], live:false, q:"", purpose:"all", consent:"all", period:"all" };
  const HOST_COL = "#9C4F63";   // HosSTUDIO colour

  const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = iso => { try{ return new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }catch(e){ return iso||"—"; } };

  function startLive(){
    if(W.live) return;
    if(typeof FB==="undefined" || !FB.ready || !FB.user){ return; }
    W.live = true;
    FB.db.collection("wifi_signups").orderBy("created","desc").limit(5000)
      .onSnapshot(snap=>{ W.rows = snap.docs.map(d=>({id:d.id, ...d.data()})); paint(); },
        err=>{ console.warn("wifi_signups:", err.message); const b=document.getElementById("wf-list"); if(b) b.innerHTML=`<div class="admin-note">Could not load sign-ups: ${esc(err.message)}. Check the Firestore rules for <b>wifi_signups</b> have been published.</div>`; });
  }

  /* one row per email address (latest visit), with visit count */
  function people(){
    const m = new Map();
    [...W.rows].sort((a,b)=>(a.created||"").localeCompare(b.created||"")).forEach(r=>{
      const k = (r.email||"").toLowerCase(); if(!k) return;
      const p = m.get(k) || { email:k, visits:0, first:r.created, name:r.name, firstName:r.firstName||"", lastName:r.lastName||"", purpose:r.purpose, staying:r.staying||"", marketing:false, consentAt:"" };
      p.visits++; p.last = r.created; p.name = r.name||p.name; p.firstName = r.firstName||p.firstName; p.lastName = r.lastName||p.lastName; p.purpose = r.purpose||p.purpose; p.staying = r.staying||p.staying;
      if(r.marketing){ p.marketing = true; p.consentAt = r.consentAt||r.created; }
      m.set(k,p);
    });
    return [...m.values()].sort((a,b)=>(b.last||"").localeCompare(a.last||""));
  }

  function filtered(){
    const q = W.q.toLowerCase();
    const since = W.period==="30" ? Date.now()-30*864e5 : W.period==="month" ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() : 0;
    return people().filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.email.includes(q)) &&
      (W.purpose==="all" || p.purpose===W.purpose) &&
      (W.consent==="all" || (W.consent==="yes" ? p.marketing : W.consent==="no" ? !p.marketing : W.consent==="res" ? p.staying==="Staying" : p.staying==="Visiting")) &&
      (!since || new Date(p.last).getTime() >= since));
  }

  window.renderWifiDb = function(v){
    startLive();
    v.innerHTML = `
      <div class="page-head" style="margin-bottom:6px">
        <h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">📶 Wi-Fi Guest Database</h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:66em">Everyone who signs in to the free guest Wi-Fi lands here — residents, spa, restaurant, wedding and conference guests alike. Guests who ticked the marketing box are your newsletter list; export them to Mailchimp or whichever tool you send from. Each person is shown once, with how many times they've visited.</p>
      </div>
      <div id="wf-tiles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 12px">
        <input id="wf-q" placeholder="Search name or email…" style="flex:1 1 220px;padding:9px 12px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato">
        <select id="wf-purpose" style="padding:9px 10px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato;background:#fff"><option value="all">Leisure &amp; business</option><option value="Leisure">Leisure only</option><option value="Business">Business only</option></select>
        <select id="wf-consent" style="padding:9px 10px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato;background:#fff"><option value="all">All guests</option><option value="res">Residents only</option><option value="vis">Visitors only</option><option value="yes">Newsletter opt-in only</option><option value="no">No marketing consent</option></select>
        <select id="wf-period" style="padding:9px 10px;border:1px solid #d9e0e7;border-radius:9px;font:13px Lato;background:#fff"><option value="all">All time</option><option value="month">This month</option><option value="30">Last 30 days</option></select>
        <button id="wf-csv" class="btn sm">⬇ Export CSV</button>
        <button id="wf-xlsx" class="btn sm ghost">⬇ Export Excel</button>
      </div>
      <div id="wf-list"></div>
      <div class="quote-panel" style="margin-top:18px">
        <div class="sec-title" style="margin-top:0">Welcome page &amp; set-up</div>
        <p class="qs-sub">The Wi-Fi provider points every new connection at this page. Guests enter their details, accept the terms and are let online.</p>
        <div class="embed-box">${WIFI_URL}<button class="cp" id="wf-copy">Copy</button></div>
        <div class="dual-btn" style="margin-top:10px">
          <a class="btn sm ghost" href="${WIFI_URL}?preview=1" target="_blank" rel="noopener">Preview the page ↗</a>
        </div>
        <div class="admin-note" style="margin-top:12px"><b>What to send the Wi-Fi provider:</b> set the Brandon Hall Guest Wi-Fi splash / captive portal to the external URL above, and allow these domains through before login: <b>www.brandonhallhotelandspa.com</b>, <b>www.gstatic.com</b>, <b>firestore.googleapis.com</b>. Ask which system they run (UniFi, Meraki, Aruba, Ruckus…) and for the "approve / grant" URL — that goes into the WIFI settings at the top of <code>wifi/index.html</code>. Until then the page works and records every guest; it simply shows "You're connected" and sends them to the hotel website.</div>
      </div>`;
    document.getElementById("wf-q").oninput = e => { W.q=e.target.value; paint(); };
    ["purpose","consent","period"].forEach(k => document.getElementById("wf-"+k).onchange = e => { W[k]=e.target.value; paint(); });
    document.getElementById("wf-copy").onclick = function(){ navigator.clipboard?.writeText(WIFI_URL); this.textContent="Copied"; };
    document.getElementById("wf-csv").onclick = ()=>exportRows("csv");
    document.getElementById("wf-xlsx").onclick = ()=>exportRows("xlsx");
    paint();
  };

  function paint(){
    const box = document.getElementById("wf-list"); if(!box) return;
    const all = people(), rows = filtered();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const tile = (n,l,c) => `<div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:12px 14px"><div style="font:800 23px Lato;color:${c||HOST_COL}">${n}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${l}</div></div>`;
    document.getElementById("wf-tiles").innerHTML =
      tile(all.length,"Guests on file") +
      tile(all.filter(p=>p.marketing).length,"Newsletter opt-ins","#2B726A") +
      tile(W.rows.filter(r=>new Date(r.created).getTime()>=monthStart).length,"Sign-ins this month","#1a2b3a") +
      tile(all.filter(p=>p.purpose==="Leisure").length,"Leisure","#3B6585") +
      tile(all.filter(p=>p.purpose==="Business").length,"Business","#7A6538");

    if(!W.live && (typeof FB==="undefined" || !FB.ready || !FB.user)){
      box.innerHTML = `<div class="admin-note">Sign in to the portal to see live sign-ups.</div>`; return;
    }
    if(!rows.length){
      box.innerHTML = `<div class="qs-sub" style="padding:18px 4px">${all.length ? "No guests match those filters." : "No sign-ups yet. Once the Wi-Fi provider points the guest Wi-Fi at the welcome page below, every connection appears here automatically."}</div>`; return;
    }
    box.innerHTML = `<div style="overflow-x:auto"><table class="data-table">
      <tr><th>Name</th><th>Email</th><th>Staying</th><th>Visit</th><th>Newsletter</th><th>Visits</th><th>Last seen</th><th>First seen</th></tr>
      ${rows.slice(0,500).map(p=>`<tr>
        <td style="font-weight:700;color:#1a2b3a">${esc(p.name)}</td>
        <td><a href="mailto:${esc(p.email)}" style="color:#2F7A72">${esc(p.email)}</a></td>
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
    const head = ["First name","Last name","Email","Staying","Purpose","Newsletter opt-in","Consent date","Visits","First seen","Last seen"];
    const data = rows.map(p=>[p.firstName||p.name.split(" ")[0], p.lastName||p.name.split(" ").slice(1).join(" "), p.email, p.staying==="Staying"?"Resident":p.staying==="Visiting"?"Visitor":"", p.purpose||"", p.marketing?"Yes":"No", p.marketing?fmt(p.consentAt):"", p.visits, fmt(p.first), fmt(p.last)]);
    const stamp = new Date().toISOString().slice(0,10);
    if(kind==="xlsx" && typeof XLSX!=="undefined"){
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws["!cols"] = [{wch:16},{wch:18},{wch:34},{wch:10},{wch:10},{wch:16},{wch:20},{wch:7},{wch:20},{wch:20}];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Wi-Fi guests");
      XLSX.writeFile(wb, `brandon-hall-wifi-guests-${stamp}.xlsx`); return;
    }
    const csv = [head, ...data].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download = `brandon-hall-wifi-guests-${stamp}.csv`; a.click();
  }
})();
