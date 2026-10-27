/* ============================================================
   HosMARKETING — Guest Map (heatmap of where guests come from)
   Uses the "town" answer from the Wi-Fi sign-in. Towns are
   geocoded once via OpenStreetMap (Nominatim) and cached in
   Firestore meta/geo_towns so we never look a town up twice.
   Map tiles: OpenStreetMap via Leaflet (free, no API key).
   Loaded before app.js; app.js registers window.renderGuestMap.
   Also: window.renderMarketingLanding(box) — the HosMARKETING
   landing page (stats + ordered cards).
   ============================================================ */
(function(){
  const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  const LEAFLET_JS  = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  const HEAT_JS     = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
  const HOTEL = { lat:52.383, lng:-1.4061 };
  const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  /* ---- a starter set of towns so the map works instantly; anything else is looked up and cached ---- */
  const KNOWN = { "Coventry":[52.4068,-1.5197],"Rugby":[52.3709,-1.2650],"Leamington Spa":[52.2852,-1.5201],"Royal Leamington Spa":[52.2852,-1.5201],"Warwick":[52.2823,-1.5849],"Kenilworth":[52.3417,-1.5661],
    "Nuneaton":[52.5230,-1.4651],"Birmingham":[52.4862,-1.8904],"Solihull":[52.4118,-1.7776],"Stratford-upon-Avon":[52.1917,-1.7073],"Stratford Upon Avon":[52.1917,-1.7073],"Leicester":[52.6369,-1.1398],"Northampton":[52.2405,-0.9027],
    "Daventry":[52.2578,-1.1628],"Banbury":[52.0629,-1.3398],"Hinckley":[52.5409,-1.3728],"Bedworth":[52.4800,-1.4700],"Lutterworth":[52.4556,-1.2011],"Redditch":[52.3069,-1.9419],"Worcester":[52.1936,-2.2215],
    "Wolverhampton":[52.5870,-2.1288],"Walsall":[52.5862,-1.9829],"Dudley":[52.5120,-2.0810],"Sutton Coldfield":[52.5700,-1.8240],"Tamworth":[52.6330,-1.6950],"Lichfield":[52.6820,-1.8270],"Burton upon Trent":[52.8070,-1.6370],
    "Derby":[52.9225,-1.4746],"Nottingham":[52.9548,-1.1581],"Loughborough":[52.7721,-1.2062],"Milton Keynes":[52.0406,-0.7594],"Oxford":[51.7520,-1.2577],"Cheltenham":[51.8994,-2.0783],"Gloucester":[51.8642,-2.2382],
    "London":[51.5074,-0.1278],"Manchester":[53.4808,-2.2426],"Liverpool":[53.4084,-2.9916],"Leeds":[53.8008,-1.5491],"Sheffield":[53.3811,-1.4701],"Bristol":[51.4545,-2.5879],"Cardiff":[51.4816,-3.1791],
    "Newcastle":[54.9783,-1.6178],"Newcastle upon Tyne":[54.9783,-1.6178],"Edinburgh":[55.9533,-3.1883],"Glasgow":[55.8642,-4.2518],"Reading":[51.4543,-0.9781],"Southampton":[50.9097,-1.4044],"Brighton":[50.8225,-0.1372],
    "Cambridge":[52.2053,0.1218],"Peterborough":[52.5695,-0.2405],"Bedford":[52.1360,-0.4667],"Luton":[51.8787,-0.4200],"Watford":[51.6565,-0.3903],"St Albans":[51.7520,-0.3390],"Stoke-on-Trent":[53.0027,-2.1794],"Stoke":[53.0027,-2.1794],
    "Shrewsbury":[52.7073,-2.7553],"Telford":[52.6766,-2.4469],"Hereford":[52.0565,-2.7160],"Chester":[53.1934,-2.8931],"York":[53.9600,-1.0873],"Norwich":[52.6309,1.2974],"Ipswich":[52.0567,1.1482],"Exeter":[50.7184,-3.5339],
    "Plymouth":[50.3755,-4.1427],"Swindon":[51.5558,-1.7797],"Bath":[51.3758,-2.3599],"Kettering":[52.3986,-0.7286],"Corby":[52.4900,-0.6900],"Wellingborough":[52.3027,-0.6946],"Market Harborough":[52.4780,-0.9200],
    "Bicester":[51.9000,-1.1500],"Brackley":[52.0300,-1.1500],"Towcester":[52.1300,-0.9900],"Southam":[52.2520,-1.3880],"Wolston":[52.3760,-1.3990],"Brandon":[52.3830,-1.4060],"Binley":[52.4000,-1.4600],"Dunchurch":[52.3400,-1.2900],
    "Atherstone":[52.5780,-1.5470],"Coleshill":[52.4990,-1.7070],"Balsall Common":[52.3900,-1.6500],"Meriden":[52.4370,-1.6450],"Evesham":[52.0920,-1.9470],"Bromsgrove":[52.3350,-2.0590],"Kidderminster":[52.3880,-2.2490],"Halesowen":[52.4480,-2.0490] };

  const M = { map:null, heat:null, markers:null, geo:null, mode:"heat", loading:false, looked:new Set() };

  function loadAsset(url, css){ return new Promise((res,rej)=>{
    if(css){ if(document.querySelector(`link[href="${url}"]`)) return res(); const l=document.createElement("link"); l.rel="stylesheet"; l.href=url; l.onload=res; l.onerror=rej; document.head.appendChild(l); }
    else { if(document.querySelector(`script[src="${url}"]`)) return res(); const s=document.createElement("script"); s.src=url; s.onload=res; s.onerror=rej; document.head.appendChild(s); } }); }

  async function geoCache(){
    if(M.geo) return M.geo;
    M.geo = {...KNOWN};
    try{ const d=await FB.db.collection("meta").doc("geo_towns").get(); if(d.exists) Object.assign(M.geo, d.data().towns||{}); }catch(e){}
    return M.geo;
  }
  async function geocode(town){
    if(M.looked.has(town)) return null; M.looked.add(town);
    try{
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(town)}`, { headers:{ "Accept":"application/json" } });
      const j = await r.json(); if(!j.length) return null;
      const ll=[+j[0].lat, +j[0].lon]; M.geo[town]=ll;
      try{ await FB.db.collection("meta").doc("geo_towns").set({ towns:{ [town]:ll } }, { merge:true }); }catch(e){}
      return ll;
    }catch(e){ return null; }
  }

  function townCounts(){
    const c={}; (window.WifiGuests?WifiGuests.people():[]).forEach(p=>{ if(p.town) c[p.town]=(c[p.town]||0)+1; });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]);
  }

  window.renderGuestMap = async function(v){
    if(window.WifiGuests) WifiGuests.load();
    v.innerHTML=`
      <div class="page-head" style="margin-bottom:6px">
        <h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">🗺️ Guest Map <span style="font-weight:400;color:#8296a8;font-size:15px">— where our guests come from</span></h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:70em">Built from the "town or city you're visiting from" answer on the Wi-Fi sign-in. Each town is placed once and remembered; new towns are looked up automatically. Use it to see where business comes from and where to aim local marketing.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 10px">
        <button id="gm-heat" class="btn sm">🔥 Heatmap</button><button id="gm-pins" class="btn sm ghost">📍 Towns &amp; counts</button>
        <span id="gm-status" style="font-size:12.5px;color:#8296a8"></span>
        <span style="flex:1"></span><span style="font-size:11.5px;color:#8296a8">Map © OpenStreetMap contributors</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 260px;gap:12px;align-items:start">
        <div id="gm-map" style="height:560px;border-radius:12px;border:1px solid #e4e9ef;background:#eef1f4"></div>
        <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:12px 14px;max-height:560px;overflow:auto"><div style="font:700 13px Lato;color:#1a2b3a;margin-bottom:6px">Towns</div><div id="gm-list" class="qs-sub">Loading…</div></div>
      </div>`;
    document.getElementById("gm-heat").onclick=()=>{ M.mode="heat"; styleBtns(); draw(); };
    document.getElementById("gm-pins").onclick=()=>{ M.mode="pins"; styleBtns(); draw(); };
    function styleBtns(){ document.getElementById("gm-heat").className="btn sm"+(M.mode==="heat"?"":" ghost"); document.getElementById("gm-pins").className="btn sm"+(M.mode==="pins"?"":" ghost"); }
    try{ await loadAsset(LEAFLET_CSS,true); await loadAsset(LEAFLET_JS); try{ await loadAsset(HEAT_JS); }catch(e){} }
    catch(e){ document.getElementById("gm-map").innerHTML=`<div class="admin-note" style="margin:20px">Map library could not be loaded (no internet?).</div>`; return; }
    M.map = L.map("gm-map",{ scrollWheelZoom:true }).setView([HOTEL.lat,HOTEL.lng], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{ maxZoom:18, attribution:"© OpenStreetMap" }).addTo(M.map);
    L.marker([HOTEL.lat,HOTEL.lng]).addTo(M.map).bindPopup("<b>Brandon Hall Hotel and Spa</b>");
    await geoCache();
    await draw();
    if(window.WifiGuests) WifiGuests.onChange(()=>{ if(document.getElementById("gm-map")) draw(); });
  };

  async function draw(){
    if(!M.map) return;
    const counts = townCounts(); const status=document.getElementById("gm-status");
    // geocode unknown towns one by one (Nominatim asks for ~1 request/second)
    const unknown = counts.filter(([t])=>!M.geo[t] && !M.looked.has(t)).map(([t])=>t);
    for(let i=0;i<unknown.length;i++){ if(status) status.textContent=`Placing ${unknown[i]}… (${i+1}/${unknown.length})`; await geocode(unknown[i]); await new Promise(r=>setTimeout(r,1100)); }
    if(status) status.textContent = counts.length ? `${counts.length} towns · ${counts.reduce((s,[,n])=>s+n,0)} guests placed` : "No towns recorded yet — new sign-ins will appear here.";
    if(M.heat){ M.map.removeLayer(M.heat); M.heat=null; } if(M.markers){ M.map.removeLayer(M.markers); M.markers=null; }
    const pts = counts.filter(([t])=>M.geo[t]).map(([t,n])=>({t,n,ll:M.geo[t]}));
    const max = Math.max(1,...pts.map(p=>p.n));
    if(M.mode==="heat" && L.heatLayer){
      M.heat = L.heatLayer(pts.map(p=>[p.ll[0],p.ll[1],Math.max(.35,p.n/max)]),{ radius:38, blur:28, maxZoom:11, gradient:{0.2:"#3B6585",0.5:"#c9a978",0.8:"#9C4F63",1:"#7a1f3d"} }).addTo(M.map);
    } else {
      M.markers = L.layerGroup(pts.map(p=>L.circleMarker(p.ll,{ radius:8+Math.sqrt(p.n/max)*22, color:"#9C4F63", weight:1.5, fillColor:"#9C4F63", fillOpacity:.45 })
        .bindTooltip(`<b>${esc(p.t)}</b> — ${p.n} guest${p.n===1?"":"s"}`,{ permanent:p.n>=max*0.5, direction:"top", className:"gm-tip" }))).addTo(M.map);
    }
    const list=document.getElementById("gm-list");
    if(list) list.innerHTML = counts.length ? counts.map(([t,n])=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #f0f2f5;font-size:12.5px;cursor:pointer" data-town="${esc(t)}"><span>${esc(t)}${M.geo[t]?"":' <span style="color:#c0392b" title="Could not place">?</span>'}</span><b>${n}</b></div>`).join("") : "No towns yet.";
    list && list.querySelectorAll("[data-town]").forEach(el=>el.onclick=()=>{ const ll=M.geo[el.dataset.town]; if(ll) M.map.setView(ll, 11); });
  }

  /* ============================================================
     HosMARKETING landing page — stats + ordered cards
     ============================================================ */
  window.renderMarketingLanding = function(box, m){
    if(window.WifiGuests){ WifiGuests.load(); WifiGuests.onChange(()=>{ const b=document.getElementById("mk-stats"); if(b) b.innerHTML=statsHtml(); }); }
    const CARDS = [
      ["wifiDb","👥","Guest Database","Every individual from the free Wi-Fi — dashboard, filters, newsletter export"],
      ["guestMap","🗺️","Guest Map","Heatmap of where guests come from"],
      ["newsletters","✉️","Newsletter Templates","Branded emails to edit, preview and send via Mailchimp"],
      ["marketing","📣","Campaigns","Marketing library and campaign assets"],
      ["socialReq","📨","Social Requests","Post requests from the team"],
      ["social","📱","Social Media","Posts and content scheduling"],
      ["brochure","📄","Brochure Builder","Sales brochures and collateral"],
      ["menu","🍽","Menu Builder","Menus in the house style"],
      ["brandLogos","🎨","Logos & Brand","Official logos, colours and guidelines (HosBRAND)"],
      ["brandPhotography","📷","Photography","Approved hotel images (HosBRAND)"],
      ["corpdb","🏢","Corporate Database","Company accounts and contacts (HosVENUE)"],
    ].filter(([t])=>typeof RENDER_MAP==="undefined" || RENDER_MAP[t]).filter(([t])=>typeof hpCanTab!=="function" || hpCanTab(t));
    box.innerHTML = `<div class="hp-sec-h">Guest database at a glance</div><div id="mk-stats" class="hp-glance">${statsHtml()}</div>
      <div class="hp-sec-h">Marketing tools</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px">${CARDS.map(([tab,icon,label,desc],i)=>`
        <button class="hp-rel" onclick="switchTab('${tab}')" style="--acc:${m.colour};${i<3?"border-color:"+m.colour+";":""}">
          <span style="font-size:22px">${icon}</span>
          <span class="hp-rel-t">${label}</span><span class="hp-rel-w">${desc}</span></button>`).join("")}</div>`;
    function statsHtml(){
      const all = window.WifiGuests ? WifiGuests.people() : [], rows = window.WifiGuests ? WifiGuests.rows() : [];
      const tk = window.WifiGuests ? WifiGuests.dayKey(new Date().toISOString()) : "";
      const today = all.filter(p=>WifiGuests.dayKey(p.first)===tk).length;
      const wk = all.filter(p=>new Date(p.first).getTime()>Date.now()-7*864e5).length;
      const opt = all.filter(p=>p.marketing).length, res=all.filter(p=>p.staying==="Staying").length, vis=all.filter(p=>p.staying==="Visiting").length;
      const towns = new Set(all.map(p=>p.town).filter(Boolean)).size;
      const st = (v,l,tab,c) => `<button class="hp-stat" onclick="switchTab('${tab}')" style="--acc:${c}"><span class="hp-stat-v">${v}</span><span class="hp-stat-l">${l}</span><span class="hp-stat-go">Open →</span></button>`;
      return st(all.length,"Guests on file","wifiDb","#9C4F63") + st(opt,`Newsletter opt-ins${all.length?" · "+Math.round(opt/all.length*100)+"%":""}`,"wifiDb","#2B726A") +
        st(today,"New guests today","wifiDb","#1a2b3a") + st(wk,"New guests last 7 days","wifiDb","#3B6585") +
        st(`${res} / ${vis}`,"Residents / visitors","wifiDb","#7A6538") + st(towns,"Towns on the map","guestMap","#9C4F63");
    }
  };
})();
