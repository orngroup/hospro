/* ============================================================
   HosSTUDIO — SOCIAL REQUESTS
   ------------------------------------------------------------
   The queue of social-media post requests submitted from the
   public form at /mktrequest. Staff open each one, see the full
   brief, images and files, set its status through the workflow,
   add internal notes and copy a clean brief to send to Nicola.
   Collection: mkt_requests (Firestore).
   ============================================================ */
(function(){
  const STAGES = [
    {k:"new",       label:"New",              col:"#b3261e", tint:"#fdecea"},
    {k:"collated",  label:"Collated",         col:"#9a6b00", tint:"#fff7e6"},
    {k:"briefed",   label:"Briefed to Nicola",col:"#6E4E7A", tint:"#efe7f2"},
    {k:"scheduled", label:"Scheduled",        col:"#1F7A8C", tint:"#e2f0f3"},
    {k:"posted",    label:"Posted",           col:"#1e6b2f", tint:"#eaf4ee"},
    {k:"archived",  label:"Archived",         col:"#64748b", tint:"#eef2f7"}
  ];
  const stg = k => STAGES.find(s=>s.k===k) || STAGES[0];

  const SR = { rows:[], filter:"open", live:false, openId:null, demo:false };

  function hasFB(){ return typeof FB!=="undefined" && FB.ready && FB.db; }

  function startLive(){
    if(SR.live) return;
    if(!hasFB()){ SR.demo=true; SR.live=true; loadDemo(); return; }
    SR.live=true;
    try{
      FB.db.collection("mkt_requests").onSnapshot(snap=>{
        SR.rows = snap.docs.map(d=>Object.assign({id:d.id}, d.data())).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
        paint();
      }, err=>{ console.warn("mkt_requests listen failed:", err&&err.code); SR.demo=true; loadDemo(); });
    }catch(e){ SR.demo=true; loadDemo(); }
  }
  function loadDemo(){
    try{ SR.rows = JSON.parse(localStorage.getItem("mkt_requests_demo")||"[]"); }catch(e){ SR.rows=[]; }
    paint();
  }
  function saveDemo(){ try{ localStorage.setItem("mkt_requests_demo", JSON.stringify(SR.rows)); }catch(e){} }

  async function update(id, patch){
    const r = SR.rows.find(x=>x.id===id); if(r) Object.assign(r, patch);
    if(SR.demo || !hasFB()){ saveDemo(); paint(); return; }
    try{ await FB.db.collection("mkt_requests").doc(id).update(Object.assign({updatedAt:Date.now()}, patch)); }
    catch(e){ alert("Couldn't save that change: "+(e&&e.code||e.message)); }
  }
  async function remove(id){
    if(SR.demo || !hasFB()){ SR.rows=SR.rows.filter(x=>x.id!==id); saveDemo(); SR.openId=null; paint(); return; }
    try{ await FB.db.collection("mkt_requests").doc(id).delete(); SR.openId=null; }
    catch(e){ alert("Couldn't delete: "+(e&&e.code||e.message)); }
  }

  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const nl2br = s => esc(s).replace(/\n/g,"<br>");
  function fmtD(d){ if(!d) return "—"; try{ return new Date((""+d).length>10?d:d+"T12:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); }catch(e){ return d; } }
  function ago(ms){ if(!ms) return ""; const h=(Date.now()-ms)/3.6e6; if(h<1) return Math.max(1,Math.round(h*60))+"m ago"; if(h<24) return Math.round(h)+"h ago"; return Math.round(h/24)+"d ago"; }
  function linkify(s){ return esc(s).replace(/\n/g,"<br>").replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:#2B726A">$1</a>'); }

  // ---------- shell ----------
  window.renderSocialReq = function(v){
    startLive();
    v.innerHTML = `
      <div class="page-head" style="margin-bottom:6px">
        <h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">📨 Social Requests</h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:64em">Every social-media post request from the team lands here — one card each, so nothing is missed or duplicated. Open a request to see the full brief, then work it through the stages and brief Nicola from a single place. Requests come in via <b>brandon.hospro.co.uk/mktrequest</b> (no login needed).</p>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:10px 0 4px">
        <button id="sr-copylink" style="padding:9px 14px;border:1px solid #2B726A;background:#fff;color:#2B726A;border-radius:9px;font:700 12.5px Lato;cursor:pointer">🔗 Copy request-form link</button>
        <span style="font-size:12px;color:#8296a8">Share this with the team instead of taking requests by email.</span>
      </div>
      <div id="sr-tiles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px;margin:12px 0"></div>
      <div id="sr-filters" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px"></div>
      <div id="sr-list"></div>
      <div id="sr-detail"></div>`;
    document.getElementById("sr-copylink").onclick = function(){
      const url="https://brandon.hospro.co.uk/mktrequest";
      (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(
        ()=>{ this.textContent="✓ Link copied"; setTimeout(()=>this.textContent="🔗 Copy request-form link",1600); },
        ()=>{ prompt("Copy the form link:", url); });
    };
    paint();
  };

  function paint(){
    const listBox=document.getElementById("sr-list"); if(!listBox) return; // tab not visible
    // tiles
    const count=k=>SR.rows.filter(r=>r.status===k).length;
    const tiles=[["new","New"],["collated","Collated"],["briefed","Briefed"],["scheduled","Scheduled"],["posted","Posted"]]
      .map(([k,l])=>{ const s=stg(k); return `<div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:12px 14px">
        <div style="font:800 23px Lato;color:${s.col}">${count(k)}</div>
        <div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${l}</div></div>`; }).join("");
    document.getElementById("sr-tiles").innerHTML=tiles;

    // filters
    const fdefs=[["open","To action"],["all","All"]].concat(STAGES.map(s=>[s.k,s.label]));
    document.getElementById("sr-filters").innerHTML = fdefs.map(([k,l])=>{
      const on=SR.filter===k;
      return `<button data-f="${k}" style="padding:6px 12px;border:1px solid ${on?'#2B726A':'#d7dde4'};background:${on?'#2B726A':'#fff'};color:${on?'#fff':'#45586b'};border-radius:999px;font:700 12px Lato;cursor:pointer">${l}</button>`;
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("#sr-filters button"),b=>b.onclick=()=>{ SR.filter=b.dataset.f; paint(); });

    // list
    let rows=SR.rows.slice();
    if(SR.filter==="open") rows=rows.filter(r=>["new","collated"].includes(r.status));
    else if(SR.filter!=="all") rows=rows.filter(r=>r.status===SR.filter);

    if(!rows.length){
      listBox.innerHTML=`<div style="padding:30px;text-align:center;color:#8296a8;background:#fff;border:1px solid #e4e9ef;border-radius:14px">
        ${SR.rows.length? "Nothing in this view." : "No requests yet. Share <b>brandon.hospro.co.uk/mktrequest</b> with the team and they'll appear here."}</div>`;
    } else {
      listBox.innerHTML = rows.map(cardHTML).join("");
      Array.prototype.forEach.call(listBox.querySelectorAll("[data-open]"), el=>el.onclick=()=>{ SR.openId=el.dataset.open; renderDetail(); });
    }
    renderDetail();
  }

  function cardHTML(r){
    const s=stg(r.status);
    const nFiles=(r.files||[]).length;
    const chans=(r.channels||[]).join(" · ");
    return `<div data-open="${esc(r.id)}" style="background:#fff;border:1px solid #e4e9ef;border-left:4px solid ${s.col};border-radius:12px;padding:13px 15px;margin-bottom:10px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.04)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="min-width:0">
          <div style="font:800 15px Lato;color:#1a2b3a;overflow:hidden;text-overflow:ellipsis">${esc(r.concept||"(no title)")}</div>
          <div style="font-size:12px;color:#5b6b7b;margin-top:3px">
            ${r.category?('<b>'+esc(r.category)+'</b> · '):''}${esc(r.requestedBy||"—")}${r.dept?(' · '+esc(r.dept)):''}
          </div>
        </div>
        <span style="flex:none;background:${s.tint};color:${s.col};font:800 10.5px Lato;text-transform:uppercase;letter-spacing:.4px;padding:4px 9px;border-radius:999px">${s.label}</span>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:#8296a8;margin-top:9px">
        <span>🗓 ${esc(r.ref||"")}</span>
        ${chans?('<span>📣 '+esc(chans)+'</span>'):''}
        ${r.idealDate?('<span>🎯 Ideal '+fmtD(r.idealDate)+'</span>'):''}
        ${r.neededBy?('<span>⏰ By '+fmtD(r.neededBy)+'</span>'):''}
        ${nFiles?('<span>📎 '+nFiles+' file'+(nFiles>1?'s':'')+'</span>'):''}
        <span style="margin-left:auto">${ago(r.createdAt)}</span>
      </div></div>`;
  }

  function fileChip(f){
    const isImg=/^image\//.test(f.type)||f.dataUrl&&/^data:image/.test(f.dataUrl);
    const src=f.url||f.dataUrl;
    if(isImg && src) return `<a href="${esc(src)}" target="_blank" rel="noopener" title="${esc(f.name)}"><img src="${esc(src)}" style="width:92px;height:92px;object-fit:cover;border-radius:10px;border:1px solid #e1e8f1"></a>`;
    const label=esc(f.name||"file");
    if(src) return `<a href="${esc(src)}" ${f.dataUrl?('download="'+label+'"'):'target="_blank" rel="noopener"'} style="display:inline-flex;align-items:center;gap:7px;background:#f5f8fc;border:1px solid #e1e8f1;border-radius:9px;padding:9px 12px;font-size:12.5px;color:#2B726A;font-weight:700;text-decoration:none">📎 ${label}</a>`;
    return `<span style="display:inline-flex;align-items:center;gap:7px;background:#fdecea;border:1px solid #f3c0ba;border-radius:9px;padding:9px 12px;font-size:12px;color:#b3261e">⚠ ${label} (not attached)</span>`;
  }

  function fieldBlock(label,html){ if(!html||!String(html).trim()) return ""; return `<div style="margin-top:13px"><div style="font:800 11px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">${label}</div><div style="font-size:13.5px;color:#1f2a37;line-height:1.55">${html}</div></div>`; }

  function renderDetail(){
    const box=document.getElementById("sr-detail"); if(!box) return;
    if(!SR.openId){ box.innerHTML=""; return; }
    const r=SR.rows.find(x=>x.id===SR.openId);
    if(!r){ box.innerHTML=""; return; }
    const s=stg(r.status);
    const files=(r.files||[]);
    const stageBtns=STAGES.map(st=>`<button data-stage="${st.k}" style="padding:7px 12px;border:1px solid ${r.status===st.k?st.col:'#d7dde4'};background:${r.status===st.k?st.col:'#fff'};color:${r.status===st.k?'#fff':'#45586b'};border-radius:8px;font:700 12px Lato;cursor:pointer">${st.label}</button>`).join("");

    box.innerHTML=`
      <div style="position:fixed;inset:0;background:rgba(18,30,48,.45);z-index:900" id="sr-ovl"></div>
      <div style="position:fixed;top:0;right:0;bottom:0;width:min(640px,100%);background:#f7f9fc;z-index:901;box-shadow:-8px 0 30px rgba(0,0,0,.2);overflow:auto">
        <div style="position:sticky;top:0;background:linear-gradient(135deg,#1F3864,#2a4a80);color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;z-index:2">
          <div style="min-width:0">
            <div style="font-size:11px;letter-spacing:1px;opacity:.8">${esc(r.ref||"")} · ${fmtD(r.createdDate||r.createdAt)}</div>
            <div style="font:800 18px Lato;margin-top:2px">${esc(r.concept||"(no title)")}</div>
            <div style="font-size:12.5px;opacity:.9;margin-top:3px">${esc(r.requestedBy||"—")}${r.email?(' · '+esc(r.email)):''}${r.dept?(' · '+esc(r.dept)):''}</div>
          </div>
          <button id="sr-close" style="flex:none;background:rgba(255,255,255,.15);border:none;color:#fff;width:34px;height:34px;border-radius:8px;font-size:20px;cursor:pointer">×</button>
        </div>
        <div style="padding:16px 18px 40px">
          <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:14px 16px">
            <div style="font:800 11px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px">Stage</div>
            <div style="display:flex;gap:7px;flex-wrap:wrap">${stageBtns}</div>
          </div>

          <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:14px 16px;margin-top:12px">
            ${fieldBlock("Campaign / event", r.category?esc(r.category):"")}
            ${fieldBlock("Channels", (r.channels||[]).length?esc(r.channels.join(" · ")):"")}
            ${fieldBlock("Content wording / text", r.wording?nl2br(r.wording):"")}
            ${fieldBlock("Call to action", r.cta?esc(r.cta):"")}
            ${fieldBlock("Preferred images (described)", r.prefImages?nl2br(r.prefImages):"")}
            ${fieldBlock("Based on brochure", r.brochure?esc(r.brochure):"")}
            ${fieldBlock("Relevant links", r.links?linkify(r.links):"")}
            ${fieldBlock("Ideal post date", r.idealDate?fmtD(r.idealDate):"")}
            ${fieldBlock("Needed by", r.neededBy?fmtD(r.neededBy):"")}
            ${fieldBlock("Timing / push notes", r.push?nl2br(r.push):"")}
            ${r.uploadNote?('<div style="margin-top:12px;font-size:12px;color:#b3261e;background:#fdecea;border:1px solid #f3c0ba;border-radius:8px;padding:8px 10px">⚠ '+esc(r.uploadNote)+'</div>'):''}
          </div>

          ${files.length?`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:14px 16px;margin-top:12px">
            <div style="font:800 11px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:9px">Images &amp; files (${files.length})</div>
            <div style="display:flex;gap:9px;flex-wrap:wrap">${files.map(fileChip).join("")}</div></div>`:""}

          <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:14px 16px;margin-top:12px">
            <div style="font:800 11px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Internal notes</div>
            <textarea id="sr-notes" style="width:100%;min-height:70px;padding:10px;border:1px solid #d7dde4;border-radius:8px;font:inherit;font-size:13px" placeholder="Notes for the team — what's agreed, who's doing it, any changes.">${esc(r.notes||"")}</textarea>
            <button id="sr-savenotes" style="margin-top:8px;padding:8px 14px;border:1px solid #2B726A;background:#fff;color:#2B726A;border-radius:8px;font:700 12px Lato;cursor:pointer">Save notes</button>
          </div>

          <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:14px">
            <button id="sr-brief" style="flex:1;min-width:200px;padding:12px 16px;border:none;background:#6E4E7A;color:#fff;border-radius:10px;font:800 13px Lato;cursor:pointer">📋 Copy brief &amp; mark briefed to Nicola</button>
            <button id="sr-del" style="padding:12px 14px;border:1px solid #e4b4b0;background:#fff;color:#b3261e;border-radius:10px;font:700 12.5px Lato;cursor:pointer">Delete</button>
          </div>
        </div>
      </div>`;

    const close=()=>{ SR.openId=null; renderDetail(); };
    document.getElementById("sr-ovl").onclick=close;
    document.getElementById("sr-close").onclick=close;
    Array.prototype.forEach.call(box.querySelectorAll("[data-stage]"),b=>b.onclick=()=>update(r.id,{status:b.dataset.stage}));
    document.getElementById("sr-savenotes").onclick=function(){ update(r.id,{notes:document.getElementById("sr-notes").value}); this.textContent="✓ Saved"; setTimeout(()=>this.textContent="Save notes",1500); };
    document.getElementById("sr-del").onclick=()=>{ if(confirm("Delete this request permanently?")) remove(r.id); };
    document.getElementById("sr-brief").onclick=function(){
      const brief=briefText(r);
      const self=this;
      (navigator.clipboard?navigator.clipboard.writeText(brief):Promise.reject()).then(
        ()=>{ update(r.id,{status:"briefed", briefedAt:Date.now()}); self.textContent="✓ Copied — now paste to Nicola"; setTimeout(()=>self.textContent="📋 Copy brief & mark briefed to Nicola",2200); },
        ()=>{ update(r.id,{status:"briefed", briefedAt:Date.now()}); prompt("Copy this brief and send to Nicola:", brief); });
    };
  }

  function briefText(r){
    const L=[];
    L.push("SOCIAL POST BRIEF — "+(r.concept||"")+"  ["+(r.ref||"")+"]");
    if(r.category)  L.push("Campaign/event: "+r.category);
    if((r.channels||[]).length) L.push("Channels: "+r.channels.join(", "));
    if(r.idealDate) L.push("Ideal post date: "+fmtD(r.idealDate));
    if(r.neededBy)  L.push("Needed by: "+fmtD(r.neededBy));
    L.push("");
    if(r.wording)   L.push("WORDING / TEXT:\n"+r.wording);
    if(r.cta)       L.push("\nCALL TO ACTION: "+r.cta);
    if(r.prefImages)L.push("\nPREFERRED IMAGES: "+r.prefImages);
    if(r.brochure)  L.push("BASED ON BROCHURE: "+r.brochure);
    if(r.links)     L.push("\nLINKS:\n"+r.links);
    if(r.push)      L.push("\nTIMING / PUSH: "+r.push);
    const files=(r.files||[]).filter(f=>f.url);
    if(files.length){ L.push("\nFILES:"); files.forEach(f=>L.push("• "+f.name+": "+f.url)); }
    L.push("\nRequested by: "+(r.requestedBy||"")+(r.email?(" ("+r.email+")"):"")+(r.dept?(" — "+r.dept):""));
    return L.join("\n");
  }
})();
