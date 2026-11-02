/* ============================================================
   HosPRO Mobile — Sales & Events module
   The shared enquiries pipeline (Firestore `enquiries`) used by the
   desktop portal's HosSALES. Needs a portal login (signed in silently
   for people who have one — see HP.portalAuth).
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,nowISO,toast,sheet,closeSheet,confirmSheet,registerView,go,refresh,topbar,bnav,setBadge,Store,gbp,fmtDate,fmtDT,ago}=HP;

const STAGES=[['enquiry','Enquiry'],['provisional','Provisional'],['confirmed','Confirmed'],['cancelled','Cancelled']];
const EVENTS=[['wedding','Wedding','💍'],['meeting','Meeting / Conference','💼'],['birthday','Birthday Party','🎂'],['celebration','Celebration Party','🥂'],['funeral','Celebration of Life','🕊️'],['christmas','Christmas / NYE','🎄'],['other','Other','📌']];
const SOURCES=['Website','Events chat','Hitched','arrangeMY / agent','Phone','Email','Walk-in','Referral','BOB / Rezlynx','Other'];
const OWNERS=['Nicola Cartwright','Natalie Freeman','Ajay Kawa','Raj Kumar','Alia Taub'];

const S={ list:[], un:null, auth:null, filter:'open', q:'' };
async function startWatch(){
  if(S.un||!Store.ready) return;
  S.auth=await HP.portalAuth();
  if(!S.auth){ S.list=[]; document.dispatchEvent(new CustomEvent('hp:sales')); if((location.hash||'').indexOf('#sales')===0) refresh(); return; }
  S.un=Store.watch('enquiries', l=>{ S.list=l; const open=l.filter(e=>['enquiry','provisional'].includes(e.status)); const over=open.filter(e=>e.followUp&&e.followUp<todayISO()).length; setBadge('sales', over||open.length, over?'':'amber'); document.dispatchEvent(new CustomEvent('hp:sales')); if((location.hash||'').indexOf('#sales')===0) refresh(); });
}
document.addEventListener('hp:login',()=>{ if(HP.canOpen('sales')) startWatch(); });
document.addEventListener('hp:logout',()=>{ if(S.un){ try{ S.un(); }catch(e){} } S.un=null; S.list=[]; S.auth=null; });

function evOf(e){ return EVENTS.find(x=>x[0]===(e.event||e.eventType))||EVENTS[EVENTS.length-1]; }
function filtered(){
  let L=S.list.slice(); const q=S.q.toLowerCase(); const t=todayISO();
  if(S.filter==='open') L=L.filter(e=>['enquiry','provisional'].includes(e.status));
  else if(S.filter==='overdue') L=L.filter(e=>['enquiry','provisional'].includes(e.status)&&e.followUp&&e.followUp<t);
  else if(S.filter==='mine') L=L.filter(e=>e.owner===HP.ME.name&&['enquiry','provisional'].includes(e.status));
  else if(S.filter==='confirmed') L=L.filter(e=>e.status==='confirmed'&&(e.date||'')>=t);
  else if(S.filter==='upcoming') L=L.filter(e=>e.status!=='cancelled'&&(e.date||'')>=t).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(q) L=L.filter(e=>[e.name,e.company,e.email,e.phone,e.notes,e.event,e.owner].join(' ').toLowerCase().includes(q));
  if(S.filter!=='upcoming') L.sort((a,b)=>String(b.created||'').localeCompare(String(a.created||'')));
  return L;
}
function card(e){ const E=evOf(e); const t=todayISO(); const over=['enquiry','provisional'].includes(e.status)&&e.followUp&&e.followUp<t;
  return `<div class="card tap ${over?'urgent':''}" onclick="HP.SALES.open('${esc(e.id)}')"><div class="row"><div class="grow"><div class="ttl">${E[2]} ${esc(e.name||e.company||'Enquiry')}${e.company&&e.name?` <span class="sub" style="display:inline">· ${esc(e.company)}</span>`:''}</div><div class="sub">${esc(E[1])}${e.date?' · '+esc(fmtDate(e.date,{day:'numeric',month:'short',year:'numeric'})):''}${e.pax?' · '+esc(e.pax)+' guests':''}</div></div><div style="text-align:right">${e.value?`<div class="money">${gbp(e.value).replace('.00','')}</div>`:''}<span class="pill ${e.status==='confirmed'?'co':e.status==='provisional'?'ip':e.status==='cancelled'?'ca':'pa'}">${esc((STAGES.find(s=>s[0]===e.status)||[,'Enquiry'])[1])}</span></div></div><div class="sub" style="margin-top:6px">${esc(e.owner||'Unassigned')}${e.followUp?' · follow up '+(over?'<b style="color:var(--red)">overdue '+esc(fmtDate(e.followUp))+'</b>':esc(fmtDate(e.followUp))):''} · ${esc(e.source||'')}</div></div>`; }

registerView('sales',{ render(el){
  if(S.auth===false){ el.innerHTML=topbar({mod:'sales',title:'Sales & Events'})+`<div class="wrap"><div class="note info">The enquiries pipeline needs a desktop-portal login behind the scenes. Ask Ajay to link your HosPRO account to a portal login (Settings → Users) and sign in again.</div><a class="btn sales" href="index.html" target="_blank" style="display:block;text-align:center;text-decoration:none">Open the desktop portal</a></div>`; return; }
  const t=todayISO(); const open=S.list.filter(e=>['enquiry','provisional'].includes(e.status)); const over=open.filter(e=>e.followUp&&e.followUp<t);
  const conf=S.list.filter(e=>e.status==='confirmed'&&(e.date||'')>=t); const pipe=open.reduce((s,e)=>s+(+e.value||0),0);
  const month=t.slice(0,7); const newMonth=S.list.filter(e=>String(e.created||'').slice(0,7)===month).length;
  const chips=[['open','Open',open.length],['overdue','Overdue',over.length],['mine','Mine',open.filter(e=>e.owner===HP.ME.name).length],['confirmed','Confirmed',conf.length],['upcoming','Upcoming',S.list.filter(e=>e.status!=='cancelled'&&(e.date||'')>=t).length],['all','All',S.list.length]];
  const L=filtered();
  el.innerHTML=topbar({mod:'sales',title:'Sales & Events',sub:esc(HP.ME.name),action:{label:'＋ Enquiry',onclick:'HP.SALES.newSheet()'}})+`<div class="wrap">
    <div class="stats four"><div class="stat"><div class="n">${open.length}</div><div class="l">Open</div></div><div class="stat ${over.length?'bad':'good'}"><div class="n">${over.length}</div><div class="l">Overdue</div></div><div class="stat"><div class="n">${gbp(pipe).replace('.00','')}</div><div class="l">Pipeline</div></div><div class="stat"><div class="n">${newMonth}</div><div class="l">New this month</div></div></div>
    <input class="inp" placeholder="Search name, company, email…" value="${esc(S.q)}" oninput="HP.SALES.search(this.value)">
    <div class="scrollx" style="margin-top:8px">${chips.map(c=>`<button class="qchip ${S.filter===c[0]?'on':''}" onclick="HP.SALES.filter('${c[0]}')">${c[1]} <b>${c[2]}</b></button>`).join('')}</div>
    <div id="sales-list">${L.map(card).join('')||'<div class="empty">Nothing here.</div>'}</div>
  </div>${bnav([{id:'sales',icon:'sales',label:'Pipeline',onclick:"HP.go('sales')"},{id:'home',icon:'home',label:'Home',onclick:"HP.go('home')"}],'sales')}`;
}});
function filter(f){ S.filter=f; refresh(); }
function search(q){ S.q=q; const b=$('sales-list'); if(b){ const L=filtered(); b.innerHTML=L.map(card).join('')||'<div class="empty">No matches.</div>'; } }

function formHtml(e){ e=e||{};
  return `<div class="two"><div><label class="lbl">Contact name</label><input class="inp" id="en-name" value="${esc(e.name||'')}"></div><div><label class="lbl">Company <span>optional</span></label><input class="inp" id="en-co" value="${esc(e.company||'')}"></div></div>
    <div class="two"><div><label class="lbl">Email</label><input class="inp" id="en-email" type="email" value="${esc(e.email||'')}"></div><div><label class="lbl">Phone</label><input class="inp" id="en-phone" type="tel" value="${esc(e.phone||'')}"></div></div>
    <label class="lbl">Event</label><select class="inp" id="en-event">${EVENTS.map(x=>`<option value="${x[0]}" ${(e.event||'wedding')===x[0]?'selected':''}>${x[2]} ${x[1]}</option>`).join('')}</select>
    <div class="three"><div><label class="lbl">Event date</label><input class="inp" type="date" id="en-date" value="${esc(e.date||'')}"></div><div><label class="lbl">Guests</label><input class="inp" id="en-pax" inputmode="numeric" value="${esc(e.pax||'')}"></div><div><label class="lbl">Value £</label><input class="inp" id="en-value" inputmode="decimal" value="${esc(e.value||'')}"></div></div>
    <div class="two"><div><label class="lbl">Source</label><select class="inp" id="en-source">${SOURCES.map(s=>`<option ${(e.source||'Phone')===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div><label class="lbl">Owner</label><select class="inp" id="en-owner">${[...new Set(OWNERS.concat([HP.ME.name]))].map(o=>`<option ${(e.owner||HP.ME.name)===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div></div>
    <label class="lbl">Follow up on</label><input class="inp" type="date" id="en-fu" value="${esc(e.followUp||new Date(Date.now()+2*864e5).toLocaleDateString('en-CA'))}">
    <label class="lbl">Notes</label><textarea class="inp" id="en-notes">${esc(e.notes||'')}</textarea>`; }
function newSheet(){ sheet(formHtml()+`<button class="btn sales" onclick="HP.SALES.create()">Add to pipeline</button>`,{title:'New enquiry'}); }
function readForm(){ return { name:$('en-name').value.trim(), company:$('en-co').value.trim(), email:$('en-email').value.trim(), phone:$('en-phone').value.trim(), event:$('en-event').value, date:$('en-date').value, pax:parseInt($('en-pax').value)||null, value:Math.round(parseFloat($('en-value').value)||0), source:$('en-source').value, owner:$('en-owner').value, followUp:$('en-fu').value, notes:$('en-notes').value.trim() }; }
async function create(){
  const f=readForm(); if(!f.name&&!f.company){ toast('Add a name or company'); return; }
  const rec=Object.assign(f,{ status:'enquiry', pipeStage:'prospect', enquiryDate:todayISO(), created:nowISO(), createdBy:HP.ME.name, log:[{text:'Enquiry logged on HosPRO Mobile',by:HP.ME.name,at:nowISO()}] });
  try{ await Store.db.collection('enquiries').add(JSON.parse(JSON.stringify(rec))); closeSheet(); toast('Added to the pipeline'); }catch(e){ toast('Could not save: '+((e&&e.code)||'error')); }
}
function open(id){
  const e=S.list.find(x=>x.id===id); if(!e) return; const E=evOf(e);
  sheet(`<div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill ${e.status==='confirmed'?'co':e.status==='provisional'?'ip':e.status==='cancelled'?'ca':'pa'}">${esc((STAGES.find(s=>s[0]===e.status)||[,'Enquiry'])[1])}</span><span class="pill light">${E[2]} ${esc(E[1])}</span>${e.value?`<span class="money">${gbp(e.value)}</span>`:''}</div>
    <div class="kv" style="margin-top:10px">${e.company?`<b>Company</b><span>${esc(e.company)}</span>`:''}${e.email?`<b>Email</b><span><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></span>`:''}${e.phone?`<b>Phone</b><span><a href="tel:${esc(e.phone)}">${esc(e.phone)}</a></span>`:''}${e.date?`<b>Event date</b><span>${esc(fmtDate(e.date,{weekday:'short',day:'numeric',month:'short',year:'numeric'}))}</span>`:''}${e.pax?`<b>Guests</b><span>${esc(e.pax)}</span>`:''}<b>Owner</b><span>${esc(e.owner||'—')}</span><b>Source</b><span>${esc(e.source||'—')}</span><b>Follow up</b><span>${e.followUp?esc(fmtDate(e.followUp)):'—'}</span><b>Logged</b><span>${esc(fmtDate(e.enquiryDate||e.created))}</span></div>
    ${e.notes?`<div class="card" style="white-space:pre-wrap;font-size:14px">${esc(e.notes)}</div>`:''}
    ${(e.log||[]).length?`<div class="tl">${e.log.slice().reverse().slice(0,8).map(l=>`<div class="ev">${esc(l.text)}<div class="w">${esc(l.by||'')} · ${esc(fmtDT(l.at))}</div></div>`).join('')}</div>`:''}
    <label class="lbl">Move to</label><div class="seg">${STAGES.map(s=>`<button class="${e.status===s[0]?'on':''}" onclick="HP.SALES.stage('${e.id}','${s[0]}')">${s[1]}</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><input class="inp" id="en-log" placeholder="Add a note / call outcome…"><button class="btn sm sales" onclick="HP.SALES.addLog('${e.id}')">Add</button></div>
    <div class="two" style="margin-top:8px"><div><label class="lbl">Next follow-up</label><input class="inp" type="date" id="en-fu2" value="${esc(e.followUp||'')}" onchange="HP.SALES.setFU('${e.id}',this.value)"></div><div><label class="lbl">Owner</label><select class="inp" onchange="HP.SALES.setOwner('${e.id}',this.value)">${[...new Set(OWNERS.concat([HP.ME.name,e.owner].filter(Boolean)))].map(o=>`<option ${e.owner===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div></div>
    <button class="btn ghost" onclick="HP.SALES.editSheet('${e.id}')">Edit details</button>`,{title:esc(e.name||e.company||'Enquiry')});
}
async function patch(id,p,note){ const e=S.list.find(x=>x.id===id); if(!e) return; if(note){ p.log=(e.log||[]).concat([{text:note,by:HP.ME.name,at:nowISO()}]); } try{ await Store.db.collection('enquiries').doc(id).update(JSON.parse(JSON.stringify(p))); Object.assign(e,p); }catch(err){ toast('Could not save: '+((err&&err.code)||'error')); } }
async function stage(id,s){ await patch(id,{status:s},'Moved to '+(STAGES.find(x=>x[0]===s)||[,s])[1]); open(id); }
async function addLog(id){ const v=($('en-log').value||'').trim(); if(!v) return; await patch(id,{},v); open(id); }
async function setFU(id,v){ await patch(id,{followUp:v},'Follow-up set for '+fmtDate(v)); toast('Follow-up updated'); }
async function setOwner(id,v){ await patch(id,{owner:v},'Owner changed to '+v); toast('Owner updated'); }
function editSheet(id){ const e=S.list.find(x=>x.id===id); if(!e) return; sheet(formHtml(e)+`<button class="btn sales" onclick="HP.SALES.saveEdit('${id}')">Save changes</button>`,{title:'Edit enquiry'}); }
async function saveEdit(id){ const f=readForm(); await patch(id,f,'Details updated'); closeSheet(); toast('Saved'); }

HP.SALES={ filter, search, newSheet, create, open, stage, addLog, setFU, setOwner, editSheet, saveEdit, data:S, STAGES, EVENTS };
})();
