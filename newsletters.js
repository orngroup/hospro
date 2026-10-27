/* ============================================================
   HosMARKETING — Newsletter Templates
   Branded, email-safe HTML templates (600px, table-based, inline
   styles) the team edits on screen, previews live, saves for the
   team (Firestore "newsletters") and copies into Mailchimp.
   Loaded before app.js; app.js registers window.renderNewsletters.
   ============================================================ */
(function(){
  const SITE = "https://www.brandonhallhotelandspa.com";
  const LOGO = "https://brandon.hospro.co.uk/assets/marketing/logos/logo-gold-transparent.png";
  const IMG = f => `${SITE}/assets/img/${f}`;
  const IMAGES = [["exterior-dusk.jpg","Hotel at dusk"],["exterior-summer.jpg","Hotel in summer"],["grounds-lake.jpg","Grounds & lake"],["lounge-fireplace.jpg","Lounge fireplace"],
    ["restaurant.jpg","The Clarendon restaurant"],["table-setting.jpg","Table setting"],["canapes.jpg","Canapés"],["celebration-drinks.jpg","Celebration drinks"],["bar-lounge.jpg","Bar & lounge"],
    ["pool.jpg","Spa pool"],["suite-bay.jpg","Bay suite"],["bedroom-suite.jpg","Bedroom suite"],["terrace.jpg","Terrace"],
    ["xmas-hero.jpg","Christmas hero"],["xmas-dining.jpg","Christmas dining"],["xmas-party.jpg","Christmas party"],["xmas-nye.jpg","New Year's Eve"],["xmas-tea.jpg","Festive afternoon tea"],
    ["wedding-lawn.jpg","Wedding on the lawn"],["wedding-tree.jpg","Wedding tree"],["suite-dinner.jpg","Suite dinner"],["suite-theatre.jpg","Meeting room theatre"]];
  const COL = { navy:"#1a2b3a", gold:"#c9a978", cream:"#f6f1e9", ink:"#2b2b2b", grey:"#6b7280" };

  const TEMPLATES = {
    news:    { name:"Monthly news", subject:"What's on at Brandon Hall this month", preheader:"Offers, events and a few things we think you'll love.", eyebrow:"NEWS FROM BRANDON HALL", headline:"Hello *|FNAME|*, here's what's on",
               image:"exterior-summer.jpg", intro:"Thank you for visiting us recently. Here's a quick look at what's happening at the hotel this month — we'd love to welcome you back.",
               blocks:[{h:"Sunday lunch at The Clarendon",t:"Three courses of classic British cooking, served from 12 noon every Sunday. Book a table and make an afternoon of it."},{h:"Spa days from £65",t:"Pool, sauna and steam room plus a 25-minute treatment and lunch. The perfect midweek reset."}],
               cta:"Book a table", link:SITE+"/dining/", sign:"The Brandon Hall team" },
    offer:   { name:"Seasonal offer", subject:"A little something for you, *|FNAME|*", preheader:"Our seasonal offer — for guests who've visited us before.", eyebrow:"A SPECIAL OFFER",  headline:"Stay two nights, dine on us",
               image:"suite-bay.jpg", intro:"As a thank-you for visiting, we're offering you a two-night stay with dinner in The Clarendon on your first evening — just quote this email when you book.",
               blocks:[{h:"What's included",t:"Two nights in a classic double, full English breakfast each morning, three-course dinner on night one, and use of the pool, sauna and steam room."},{h:"When",t:"Sunday to Thursday arrivals until the end of March. Subject to availability."}],
               cta:"Book your stay", link:SITE+"/rooms-suites/", sign:"The Brandon Hall team" },
    festive: { name:"Christmas & festive", subject:"Christmas at Brandon Hall — now taking bookings", preheader:"Party nights, festive lunches, Christmas Day and New Year's Eve.", eyebrow:"CHRISTMAS 2026", headline:"Celebrate the season with us",
               image:"xmas-hero.jpg", intro:"From festive afternoon teas to our famous party nights and a Christmas Day lunch to remember, the hotel is dressed and ready. Dates are filling quickly — here are the highlights.",
               blocks:[{h:"Party nights",t:"Three-course dinner, disco until late and a glass of fizz on arrival. Ideal for teams, friends and families."},{h:"Christmas Day lunch",t:"A relaxed, four-course lunch in The Clarendon with all the trimmings — let us do the washing up."},{h:"New Year's Eve gala",t:"Dinner, dancing and a midnight toast on the terrace."}],
               cta:"See the Christmas brochure", link:SITE+"/christmas/", sign:"The Brandon Hall team" },
    events:  { name:"Weddings & events", subject:"Planning a celebration? Come and see Brandon Hall", preheader:"Weddings, parties and meetings in a country-house setting.", eyebrow:"WEDDINGS & EVENTS", headline:"Your celebration, our home",
               image:"wedding-lawn.jpg", intro:"Whether it's a wedding for 150, a milestone birthday or a company away-day, our rooms, lawns and team are here to make it effortless. Come and have a look round.",
               blocks:[{h:"Weddings",t:"Licensed for ceremonies indoors and out, with packages from intimate to grand. Ask about our open-evening dates."},{h:"Meetings & away-days",t:"Flexible rooms for 6 to 200, fast Wi-Fi, proper coffee and day-delegate rates that include lunch."}],
               cta:"Arrange a show round", link:SITE+"/weddings/", sign:"The events team" },
  };

  const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const nl = s => esc(s).replace(/\n/g,"<br>");

  /* ---------- email HTML (table-based, inline styles) ---------- */
  function emailHtml(d){
    const blocks = (d.blocks||[]).filter(b=>b.h||b.t).map(b=>`
      <tr><td style="padding:0 40px 22px 40px;font-family:Georgia,'Times New Roman',serif;">
        ${b.h?`<div style="font-size:19px;color:${COL.navy};font-weight:bold;margin:0 0 6px 0;">${esc(b.h)}</div>`:""}
        ${b.t?`<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${COL.ink};">${nl(b.t)}</div>`:""}
      </td></tr>`).join("");
    return `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.subject)}</title></head>
<body style="margin:0;padding:0;background:${COL.cream};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${COL.cream};">${esc(d.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.cream};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;">
  <tr><td align="center" style="background:${COL.navy};padding:26px 20px 18px 20px;">
    <img src="${LOGO}" width="150" alt="Brandon Hall Hotel and Spa" style="display:block;width:150px;height:auto;border:0;">
    ${d.eyebrow?`<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:4px;color:${COL.gold};padding-top:14px;">${esc(d.eyebrow)}</div>`:""}
  </td></tr>
  ${d.image?`<tr><td><img src="${IMG(d.image)}" width="600" alt="" style="display:block;width:100%;height:auto;border:0;"></td></tr>`:""}
  <tr><td style="padding:34px 40px 10px 40px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;color:${COL.navy};">${esc(d.headline)}</td></tr>
  <tr><td style="padding:0 40px 24px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:${COL.ink};">${nl(d.intro)}</td></tr>
  ${blocks}
  ${d.cta?`<tr><td align="center" style="padding:4px 40px 36px 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:${COL.gold};border-radius:28px;">
      <a href="${esc(d.link||SITE)}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${COL.navy};text-decoration:none;">${esc(d.cta)}</a>
    </td></tr></table></td></tr>`:""}
  <tr><td style="padding:0 40px 30px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${COL.ink};">Warm regards,<br><b>${esc(d.sign||"The Brandon Hall team")}</b></td></tr>
  <tr><td style="background:${COL.navy};padding:24px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#b8c6d6;text-align:center;">
    <b style="color:#ffffff;">Brandon Hall Hotel and Spa</b><br>Main Street, Brandon, Coventry CV8 3FW · <a href="tel:+442477102555" style="color:${COL.gold};text-decoration:none;">024 7710 2555</a><br>
    <a href="${SITE}" style="color:${COL.gold};text-decoration:none;">brandonhallhotelandspa.com</a><br><br>
    You're receiving this because you asked to hear from us when you joined our guest Wi-Fi.<br>
    <a href="*|UNSUB|*" style="color:#b8c6d6;text-decoration:underline;">Unsubscribe</a> · <a href="*|UPDATE_PROFILE|*" style="color:#b8c6d6;text-decoration:underline;">Update preferences</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  }

  /* ---------- state & store ---------- */
  const S = { key:"news", draft:null, saved:[], live:false, savedId:null };
  function fresh(key){ return JSON.parse(JSON.stringify(TEMPLATES[key])); }
  function startLive(){
    if(S.live || typeof FB==="undefined" || !FB.ready || !FB.user) return; S.live=true;
    FB.db.collection("newsletters").orderBy("updated","desc").limit(100).onSnapshot(snap=>{ S.saved=snap.docs.map(d=>({id:d.id,...d.data()})); paintSaved(); }, e=>console.warn("newsletters:",e.message));
  }
  async function save(){
    const d={...S.draft, template:S.key, updated:new Date().toISOString(), by:(typeof FB!=="undefined"&&FB.user)?FB.user.name:""};
    if(typeof FB==="undefined"||!FB.ready||!FB.user){ toastMsg("Sign in to save for the team"); return; }
    if(S.savedId) await FB.db.collection("newsletters").doc(S.savedId).set(d); else { const r=await FB.db.collection("newsletters").add(d); S.savedId=r.id; }
    toastMsg("Saved — the team can open it from Saved newsletters");
  }
  function toastMsg(m){ if(typeof toast==="function") toast(m); else alert(m); }

  /* ---------- UI ---------- */
  const inp = (id,label,val,ph) => `<label style="display:block;font-size:11.5px;font-weight:700;color:#8296a8;text-transform:uppercase;letter-spacing:.3px;margin:10px 0 4px">${label}</label><input id="${id}" value="${esc(val)}" placeholder="${esc(ph||"")}" style="width:100%;padding:9px 11px;border:1px solid #d9e0e7;border-radius:9px;font:13.5px Lato">`;
  const ta  = (id,label,val,rows) => `<label style="display:block;font-size:11.5px;font-weight:700;color:#8296a8;text-transform:uppercase;letter-spacing:.3px;margin:10px 0 4px">${label}</label><textarea id="${id}" rows="${rows||3}" style="width:100%;padding:9px 11px;border:1px solid #d9e0e7;border-radius:9px;font:13.5px Lato;resize:vertical">${esc(val)}</textarea>`;

  window.renderNewsletters = function(v){
    startLive(); if(!S.draft) S.draft=fresh(S.key);
    v.innerHTML=`
      <div class="page-head" style="margin-bottom:6px">
        <h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">✉️ Newsletter Templates</h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:70em">Branded, email-safe templates. Edit the words and picture, check the preview, save for the team, then <b>Copy HTML</b> and paste into a Mailchimp "Code" block (or any email tool). <code>*|FNAME|*</code> becomes the guest's first name in Mailchimp; the unsubscribe links are Mailchimp merge tags too. Send only to guests who ticked the newsletter box — use the Guest Database export with the opt-in filter.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 12px">
        ${Object.entries(TEMPLATES).map(([k,t])=>`<button class="btn sm ${k===S.key?"":"ghost"}" data-tpl="${k}">${t.name}</button>`).join("")}
        <span style="flex:1"></span>
        <button id="nl-save" class="btn sm">💾 Save for team</button>
        <button id="nl-copy" class="btn sm ghost">📋 Copy HTML</button>
        <button id="nl-dl" class="btn sm ghost">⬇ Download .html</button>
        <button id="nl-open" class="btn sm ghost">↗ Open preview</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(300px,420px) 1fr;gap:14px;align-items:start">
        <div id="nl-form" style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:14px 16px"></div>
        <div style="background:#e9ecf0;border:1px solid #e4e9ef;border-radius:12px;padding:10px;position:sticky;top:10px">
          <div style="font-size:11.5px;color:#8296a8;margin:0 4px 6px">Live preview — how it looks in most email apps</div>
          <iframe id="nl-prev" title="Email preview" style="width:100%;height:760px;border:0;border-radius:8px;background:#f6f1e9"></iframe>
        </div>
      </div>
      <div id="nl-saved" style="margin-top:16px"></div>`;
    v.querySelectorAll("[data-tpl]").forEach(b=>b.onclick=()=>{ S.key=b.dataset.tpl; S.draft=fresh(S.key); S.savedId=null; window.renderNewsletters(v); });
    document.getElementById("nl-save").onclick=save;
    document.getElementById("nl-copy").onclick=function(){ navigator.clipboard?.writeText(emailHtml(S.draft)).then(()=>{ this.textContent="✓ Copied"; setTimeout(()=>this.textContent="📋 Copy HTML",1500); }); };
    document.getElementById("nl-dl").onclick=()=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([emailHtml(S.draft)],{type:"text/html"})); a.download=`brandon-hall-${S.key}-newsletter.html`; a.click(); };
    document.getElementById("nl-open").onclick=()=>{ const w=window.open("","_blank"); w.document.write(emailHtml(S.draft)); w.document.close(); };
    paintForm(); paintPreview(); paintSaved();
  };

  function paintForm(){
    const d=S.draft, f=document.getElementById("nl-form"); if(!f) return;
    f.innerHTML = inp("nl-subject","Subject line",d.subject) + inp("nl-pre","Preview text (shows under the subject)",d.preheader) +
      inp("nl-eyebrow","Small heading over the picture",d.eyebrow) +
      `<label style="display:block;font-size:11.5px;font-weight:700;color:#8296a8;text-transform:uppercase;letter-spacing:.3px;margin:10px 0 4px">Picture</label>
       <select id="nl-image" style="width:100%;padding:9px 11px;border:1px solid #d9e0e7;border-radius:9px;font:13.5px Lato;background:#fff"><option value="">No picture</option>${IMAGES.map(([f,l])=>`<option value="${f}" ${f===d.image?"selected":""}>${l}</option>`).join("")}</select>` +
      inp("nl-headline","Headline",d.headline) + ta("nl-intro","Opening paragraph",d.intro,4) +
      `<div style="font-size:11.5px;font-weight:700;color:#8296a8;text-transform:uppercase;letter-spacing:.3px;margin:14px 0 2px">Sections</div><div id="nl-blocks"></div>
       <button id="nl-addblock" class="btn sm ghost" style="margin-top:6px">+ Add a section</button>` +
      inp("nl-cta","Button text",d.cta) + inp("nl-link","Button link",d.link,SITE) + inp("nl-sign","Signed off by",d.sign);
    const bb=document.getElementById("nl-blocks");
    bb.innerHTML=(d.blocks||[]).map((b,i)=>`<div style="border:1px solid #eef1f4;border-radius:9px;padding:8px 10px;margin:6px 0;background:#fafbfc">
        <input data-bh="${i}" value="${esc(b.h)}" placeholder="Section heading" style="width:100%;padding:7px 10px;border:1px solid #d9e0e7;border-radius:8px;font:700 13px Lato;margin-bottom:5px">
        <textarea data-bt="${i}" rows="3" placeholder="Section text" style="width:100%;padding:7px 10px;border:1px solid #d9e0e7;border-radius:8px;font:13px Lato;resize:vertical">${esc(b.t)}</textarea>
        <div style="text-align:right"><a href="#" data-bdel="${i}" style="font-size:12px;color:#991b1b">Remove</a></div></div>`).join("");
    const bind=(id,key)=>{ const e=document.getElementById(id); if(e) e.oninput=()=>{ d[key]=e.value; paintPreview(); }; };
    bind("nl-subject","subject"); bind("nl-pre","preheader"); bind("nl-eyebrow","eyebrow"); bind("nl-headline","headline"); bind("nl-intro","intro"); bind("nl-cta","cta"); bind("nl-link","link"); bind("nl-sign","sign");
    document.getElementById("nl-image").onchange=e=>{ d.image=e.target.value; paintPreview(); };
    bb.querySelectorAll("[data-bh]").forEach(e=>e.oninput=()=>{ d.blocks[+e.dataset.bh].h=e.value; paintPreview(); });
    bb.querySelectorAll("[data-bt]").forEach(e=>e.oninput=()=>{ d.blocks[+e.dataset.bt].t=e.value; paintPreview(); });
    bb.querySelectorAll("[data-bdel]").forEach(e=>e.onclick=ev=>{ ev.preventDefault(); d.blocks.splice(+e.dataset.bdel,1); paintForm(); paintPreview(); });
    document.getElementById("nl-addblock").onclick=()=>{ d.blocks=d.blocks||[]; d.blocks.push({h:"",t:""}); paintForm(); };
  }
  function paintPreview(){ const p=document.getElementById("nl-prev"); if(p) p.srcdoc=emailHtml(S.draft); }
  function paintSaved(){
    const box=document.getElementById("nl-saved"); if(!box) return;
    if(!S.saved.length){ box.innerHTML=""; return; }
    box.innerHTML=`<div class="sec-title">Saved newsletters</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">`+
      S.saved.map(n=>`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:10px;padding:10px 12px">
        <div style="font:700 13px Lato;color:#1a2b3a">${esc(n.subject||"(no subject)")}</div>
        <div style="font-size:11.5px;color:#8296a8;margin:3px 0 8px">${esc(TEMPLATES[n.template]?.name||n.template||"")} · ${new Date(n.updated).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}${n.by?" · "+esc(n.by):""}</div>
        <button class="btn sm ghost" data-open="${n.id}">Open</button> <a href="#" data-del="${n.id}" style="font-size:12px;color:#991b1b;margin-left:8px">Delete</a></div>`).join("")+`</div>`;
    box.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{ const n=S.saved.find(x=>x.id===b.dataset.open); if(!n) return; const {id,updated,by,template,...rest}=n; S.key=template||S.key; S.draft={...fresh(S.key),...rest}; S.savedId=id; window.renderNewsletters(document.getElementById("view")); });
    box.querySelectorAll("[data-del]").forEach(a=>a.onclick=async ev=>{ ev.preventDefault(); if(confirm("Delete this saved newsletter?")) await FB.db.collection("newsletters").doc(a.dataset.del).delete(); });
  }
})();
