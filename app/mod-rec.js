/* ============================================================
   HosPRO Mobile — Reception (HosREC) module
   Report a maintenance fault → HosFIX job (hosfix_jobs)
   Report a housekeeping issue → flagged on today's room (hoshouse_rooms)
   Guest requests, incidents, fire alarm tests & drills → hosrec_* collections
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,nowISO,toast,sheet,closeSheet,confirmSheet,capturePhoto,viewPhoto,registerView,go,refresh,topbar,bnav,setBadge,Store,Users,fmtDate,fmtTime,fmtDT,ago,uid}=HP;

const R={ requests:[], incidents:[], fire:[], un:[] };
const INCIDENT_TYPES=[['accident','Accident / injury','🩹'],['illness','Guest illness','🤒'],['security','Security','🔒'],['theft','Theft / loss','💼'],['damage','Damage','💥'],['complaint','Serious complaint','😠'],['alarm','Fire alarm activation','🚨'],['spill','Spill / hazard','⚠️'],['other','Other','📝']];
const FIRE_KINDS=[['test','Weekly alarm test','🔔'],['drill','Evacuation drill','🏃'],['activation','Alarm activation','🚨'],['check','Fire safety check','✅']];
const REQ_TYPES=[['guest','Guest request','🛎️'],['housekeeping','Housekeeping issue','🧹'],['lost','Lost property enquiry','🧳'],['message','Message / handover','📝']];

function startWatch(){
  if(R.un.length||!Store.ready) return;
  R.un.push(Store.watch('hosrec_requests', l=>{ R.requests=l.sort((a,b)=>String(b.at).localeCompare(String(a.at))); badge(); bump(); }, q=>q.where('date','>=',new Date(Date.now()-14*864e5).toLocaleDateString('en-CA'))));
  R.un.push(Store.watch('hosrec_incidents', l=>{ R.incidents=l.sort((a,b)=>String(b.at).localeCompare(String(a.at))); bump(); }, q=>q.orderBy('at','desc').limit(100)));
  R.un.push(Store.watch('hosrec_fire', l=>{ R.fire=l.sort((a,b)=>String(b.at).localeCompare(String(a.at))); bump(); }, q=>q.orderBy('at','desc').limit(100)));
}
function badge(){ const open=R.requests.filter(x=>x.status==='open').length; setBadge('rec', open, open?'amber':'ok'); }
function bump(){ document.dispatchEvent(new CustomEvent('hp:rec')); if((location.hash||'').indexOf('#rec')===0||location.hash==='#fire') refresh(); }
document.addEventListener('hp:login',()=>{ if(HP.canOpen('rec')||HP.canOpen('fire')||HP.isAdmin()) startWatch(); });
document.addEventListener('hp:logout',()=>{ R.un.forEach(u=>{ try{ u(); }catch(e){} }); R.un=[]; });

/* ---------- home ---------- */
registerView('rec',{ render(el){
  const open=R.requests.filter(x=>x.status==='open'); const today=todayISO();
  const rooms=(HP.HOUSE&&HP.HOUSE.rooms)||[]; const R0=rooms.filter(r=>!r.area); const done=R0.filter(r=>r.status==='done').length;
  const fixOpen=HP.FIX?HP.FIX.visibleJobs().filter(j=>!['complete','cancelled'].includes(j.status)):[];
  const lastTest=R.fire.find(f=>f.kind==='test'); const lastDrill=R.fire.find(f=>f.kind==='drill');
  const testAge=lastTest?Math.floor((Date.now()-new Date(lastTest.at))/864e5):null;
  el.innerHTML=topbar({mod:'rec',title:'Reception',sub:esc(HP.ME.name)+' · '+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})})+`<div class="wrap">
    <div class="stats four"><div class="stat"><div class="n">${done}/${R0.length}</div><div class="l">Rooms ready</div></div><div class="stat ${open.length?'warn':''}"><div class="n">${open.length}</div><div class="l">Open requests</div></div><div class="stat ${fixOpen.filter(j=>j.priority==='urgent').length?'bad':''}"><div class="n">${fixOpen.length}</div><div class="l">Faults open</div></div><div class="stat ${testAge==null||testAge>7?'bad':'good'}"><div class="n">${testAge==null?'—':testAge+'d'}</div><div class="l">Since alarm test</div></div></div>
    ${testAge==null||testAge>7?`<div class="note bad">Weekly fire alarm test ${testAge==null?'not logged yet':'overdue — last one '+testAge+' days ago'}. <button class="btn sm red" onclick="HP.REC.fireSheet('test')">Log test</button></div>`:''}
    <div class="sect">Report</div>
    <div class="modgrid">
      <button class="tile" onclick="HP.FIX.newJob({source:'Reception'})"><span class="ic" style="background:var(--fix)">🔧</span><div><div class="nm">Maintenance fault</div><div class="ds">Goes straight to the fixers</div></div></button>
      <button class="tile" onclick="HP.REC.hkSheet()"><span class="ic" style="background:var(--house)">🧹</span><div><div class="nm">Housekeeping issue</div><div class="ds">Room needs attention / re-doing</div></div></button>
      <button class="tile" onclick="HP.REC.reqSheet('guest')"><span class="ic" style="background:var(--rec)">🛎️</span><div><div class="nm">Guest request</div><div class="ds">Log and track to done</div></div></button>
      <button class="tile" onclick="HP.REC.incidentSheet()"><span class="ic" style="background:#8b2e2e">🩹</span><div><div class="nm">Incident</div><div class="ds">Accident, security, damage…</div></div></button>
      <button class="tile" onclick="HP.REC.fireSheet('test')"><span class="ic" style="background:var(--fire)">🔔</span><div><div class="nm">Fire alarm test</div><div class="ds">Weekly call-point test</div></div></button>
      <button class="tile" onclick="HP.REC.fireSheet('drill')"><span class="ic" style="background:#c45c00">🏃</span><div><div class="nm">Fire drill</div><div class="ds">Evacuation drill record</div></div></button>
    </div>
    <div class="sect">Room status <span class="r" onclick="HP.go('house')">Full board ›</span></div>
    <div class="rgrid">${R0.slice(0,36).map(r=>`<button class="${r.status==='done'?'done':r.status==='in_progress'?'ip':r.status==='blocked'?'blk':''}" onclick="HP.HOUSE.room('${esc(r.room)}')">${esc(r.room)}</button>`).join('')||'<div class="sub" style="grid-column:1/-1">No rooms set for today yet.</div>'}</div>
    ${R0.length>36?`<button class="btn ghost sm" style="margin-top:8px" onclick="HP.go('house')">See all ${R0.length} rooms</button>`:''}
    <div class="sect">Open requests <span class="r" onclick="HP.go('rec/log')">All logs ›</span></div>
    ${open.slice(0,8).map(reqCard).join('')||'<div class="empty">Nothing open — nice.</div>'}
  </div>${bnav([{id:'rec',icon:'🛎️',label:'Reception',onclick:"HP.go('rec')"},{id:'log',icon:'📒',label:'Logs',onclick:"HP.go('rec/log')"},{id:'home',icon:'🏠',label:'Home',onclick:"HP.go('home')"}],'rec')}`;
}});

function reqCard(x){ const T=REQ_TYPES.find(t=>t[0]===x.type)||REQ_TYPES[0];
  return `<div class="card tap ${x.urgent?'urgent':''}" onclick="HP.REC.reqOpen('${esc(x.id)}')"><div class="row"><div class="grow"><div class="ttl">${T[2]} ${esc(x.room?'Room '+x.room+' · ':'')}${esc(x.title||T[1])}</div><div class="sub">${esc((x.detail||'').slice(0,90))}</div></div><span class="pill ${x.status==='open'?'pa':'co'}">${x.status==='open'?'Open':'Done'}</span></div><div class="sub" style="margin-top:6px">${esc(x.by||'')} · ${ago(x.at)}${x.doneBy?' · done by '+esc(x.doneBy):''}</div></div>`; }

/* ---------- requests (guest / housekeeping / lost / handover) ---------- */
function reqSheet(type){
  R.q={type:type||'guest', room:'', title:'', detail:'', urgent:false};
  sheet(`<div class="seg">${REQ_TYPES.map(t=>`<button class="${R.q.type===t[0]?'on':''}" onclick="HP.REC.qSet('type','${t[0]}');HP.REC.reqSheetRe()">${t[2]} ${t[1]}</button>`).join('')}</div>
    <div class="two"><div><label class="lbl">Room <span>optional</span></label><input class="inp" id="rq-room" inputmode="numeric" placeholder="e.g. 112" value="${esc(R.q.room)}"></div><div><label class="lbl">Urgent?</label><button class="btn sm ${R.q.urgent?'red':'ghost'}" style="width:100%;padding:12px" onclick="HP.REC.qSet('urgent',!${R.q.urgent});HP.REC.reqSheetRe()">${R.q.urgent?'URGENT':'Normal'}</button></div></div>
    <label class="lbl">What's needed?</label><input class="inp" id="rq-title" placeholder="${R.q.type==='guest'?'e.g. Extra pillows, late checkout':R.q.type==='housekeeping'?'e.g. Room needs re-cleaning':'Short title'}" value="${esc(R.q.title)}">
    <label class="lbl">Details</label><textarea class="inp" id="rq-detail" placeholder="Anything the team needs to know">${esc(R.q.detail)}</textarea>
    <button class="btn rec" onclick="HP.REC.reqSave()">Log request</button>`,{title:'Log a request'});
}
function reqSheetRe(){ R.q.room=$('rq-room')?$('rq-room').value:R.q.room; R.q.title=$('rq-title')?$('rq-title').value:R.q.title; R.q.detail=$('rq-detail')?$('rq-detail').value:R.q.detail; reqSheet(R.q.type); }
async function reqSave(){
  const q=R.q; q.room=($('rq-room').value||'').trim(); q.title=($('rq-title').value||'').trim(); q.detail=($('rq-detail').value||'').trim();
  if(!q.title){ toast('Add a short title'); return; }
  const rec={ id:uid('RQ'), type:q.type, room:q.room, title:q.title, detail:q.detail, urgent:!!q.urgent, status:'open', by:HP.ME.name, byId:HP.ME.id, dept:HP.ME.dept, at:nowISO(), date:todayISO() };
  const ok=await Store.set('hosrec_requests',rec.id,rec,false); if(!ok) return;
  if(q.type==='housekeeping' && q.room && window.HH){ // flag the room for housekeeping today
    try{ const rooms=HP.HOUSE.rooms||[]; const have=rooms.find(r=>String(r.room)===q.room);
      const note='Reception: '+q.title+(q.detail?' — '+q.detail:'');
      if(have){ await HH.updateRoom(todayISO(), q.room, {notes:(have.notes?have.notes+' · ':'')+note, urgent:q.urgent||have.urgent||false, recFlag:true}); }
      else { const b=HH.blankRoom(todayISO(), q.room, 'Stayover', '', note); b.urgent=!!q.urgent; b.recFlag=true; await HH.updateRoom(todayISO(), q.room, b); }
    }catch(e){ console.warn(e); } }
  closeSheet(); toast('Logged'+(q.type==='housekeeping'?' and flagged for housekeeping':''));
}
function hkSheet(){ reqSheet('housekeeping'); }
function reqOpen(id){
  const x=R.requests.find(r=>r.id===id); if(!x) return; const T=REQ_TYPES.find(t=>t[0]===x.type)||REQ_TYPES[0];
  sheet(`<div class="row"><span class="pill ${x.status==='open'?'pa':'co'}">${x.status==='open'?'Open':'Done'}</span>${x.urgent?'<span class="pill urgent">URGENT</span>':''}<span class="pill light">${T[2]} ${T[1]}</span></div>
    <div class="kv" style="margin-top:10px">${x.room?`<b>Room</b><span>${esc(x.room)}</span>`:''}<b>Logged</b><span>${esc(fmtDT(x.at))} · ${esc(x.by||'')}</span>${x.doneAt?`<b>Done</b><span>${esc(fmtDT(x.doneAt))} · ${esc(x.doneBy||'')}</span>`:''}</div>
    <div style="font-size:15px;white-space:pre-wrap">${esc(x.detail||'')}</div>
    ${(x.updates||[]).length?`<div class="tl" style="margin-top:10px">${x.updates.slice().reverse().map(u=>`<div class="ev">${esc(u.text)}<div class="w">${esc(u.by)} · ${esc(fmtDT(u.at))}</div></div>`).join('')}</div>`:''}
    ${x.status==='open'?`<div class="row" style="margin-top:10px"><input class="inp" id="rq-upd" placeholder="Add an update…"><button class="btn sm" onclick="HP.REC.reqUpdate('${x.id}')">Add</button></div><button class="btn ok" onclick="HP.REC.reqDone('${x.id}')">✓ Mark as done</button>`:`<button class="btn ghost" onclick="HP.REC.reqReopen('${x.id}')">Reopen</button>`}`,{title:esc(x.title||T[1])});
}
async function reqUpdate(id){ const x=R.requests.find(r=>r.id===id); const v=($('rq-upd').value||'').trim(); if(!x||!v) return; x.updates=(x.updates||[]).concat([{text:v,by:HP.ME.name,at:nowISO()}]); await Store.set('hosrec_requests',id,{updates:x.updates}); reqOpen(id); }
async function reqDone(id){ await Store.set('hosrec_requests',id,{status:'done',doneBy:HP.ME.name,doneAt:nowISO()}); closeSheet(); toast('Done'); }
async function reqReopen(id){ await Store.set('hosrec_requests',id,{status:'open',doneBy:null,doneAt:null}); closeSheet(); }

/* ---------- incidents ---------- */
function incidentSheet(){
  R.inc={type:'accident',photo:null};
  sheet(`<label class="lbl">Type</label><div class="seg">${INCIDENT_TYPES.map(t=>`<button class="${R.inc.type===t[0]?'on':''}" onclick="HP.REC.incType('${t[0]}')">${t[2]} ${t[1]}</button>`).join('')}</div>
    <div class="two"><div><label class="lbl">When</label><input class="inp" type="datetime-local" id="in-when" value="${esc(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16))}"></div><div><label class="lbl">Where</label><input class="inp" id="in-where" placeholder="e.g. Room 112, Car park"></div></div>
    <label class="lbl">People involved <span>names / room numbers / staff</span></label><input class="inp" id="in-who" placeholder="e.g. Mr Smith (Rm 23), Pete">
    <label class="lbl">What happened</label><textarea class="inp" id="in-desc" placeholder="Factual account — what, how, witnesses"></textarea>
    <label class="lbl">Action taken</label><textarea class="inp" id="in-action" placeholder="First aid given, police called, manager informed…" style="min-height:60px"></textarea>
    <label class="check"><input type="checkbox" id="in-injury"> Injury or first aid involved</label>
    <label class="check"><input type="checkbox" id="in-mgr"> Duty manager informed</label>
    <div class="photos" id="in-ph"><button class="add" onclick="HP.REC.incPhoto()"><b>📷</b>Add photo</button></div>
    <button class="btn red" onclick="HP.REC.incSave()">Log incident</button>`,{title:'Log an incident'});
}
function incType(t){ R.inc.type=t; document.querySelectorAll('#overlay .seg button').forEach(b=>b.classList.toggle('on',b.getAttribute('onclick').includes("'"+t+"'"))); }
async function incPhoto(){ const du=await capturePhoto('Incident'); if(du){ R.inc.photo=du; $('in-ph').innerHTML=`<div class="ph"><img src="${du}"><div class="cap">Photo</div></div><button class="add" onclick="HP.REC.incPhoto()"><b>📷</b>Retake</button>`; } }
async function incSave(){
  const desc=($('in-desc').value||'').trim(); if(!desc){ toast('Describe what happened'); return; }
  const rec={ id:uid('IN'), type:R.inc.type, typeLabel:(INCIDENT_TYPES.find(t=>t[0]===R.inc.type)||[])[1]||'', when:$('in-when').value, where:($('in-where').value||'').trim(), who:($('in-who').value||'').trim(), description:desc, action:($('in-action').value||'').trim(), injury:$('in-injury').checked, managerInformed:$('in-mgr').checked, photo:R.inc.photo||null, by:HP.ME.name, byId:HP.ME.id, dept:HP.ME.dept, at:nowISO(), date:todayISO(), status:'open' };
  const ok=await Store.set('hosrec_incidents',rec.id,rec,false); if(ok){ closeSheet(); toast('Incident logged'); }
}
function incOpen(id){ const x=R.incidents.find(r=>r.id===id); if(!x) return;
  sheet(`<div class="row"><span class="pill ${x.status==='open'?'pa':'co'}">${x.status==='open'?'Open':'Closed'}</span>${x.injury?'<span class="pill urgent">Injury</span>':''}${x.managerInformed?'<span class="pill light">Manager informed</span>':''}</div>
    <div class="kv" style="margin-top:10px"><b>When</b><span>${esc(x.when?x.when.replace('T',' '):fmtDT(x.at))}</span><b>Where</b><span>${esc(x.where||'—')}</span><b>People</b><span>${esc(x.who||'—')}</span><b>Logged by</b><span>${esc(x.by||'')} · ${esc(fmtDT(x.at))}</span></div>
    <div class="lbl">What happened</div><div style="white-space:pre-wrap">${esc(x.description||'')}</div>
    <div class="lbl">Action taken</div><div style="white-space:pre-wrap">${esc(x.action||'—')}</div>
    ${x.photo?`<div class="photos"><div class="ph" onclick="HP.viewPhoto('${x.photo}','Incident')"><img src="${x.photo}"></div></div>`:''}
    ${(x.updates||[]).length?`<div class="tl" style="margin-top:10px">${x.updates.slice().reverse().map(u=>`<div class="ev">${esc(u.text)}<div class="w">${esc(u.by)} · ${esc(fmtDT(u.at))}</div></div>`).join('')}</div>`:''}
    <div class="row" style="margin-top:10px"><input class="inp" id="in-upd" placeholder="Add a follow-up note…"><button class="btn sm" onclick="HP.REC.incUpdate('${x.id}')">Add</button></div>
    ${HP.isLead()?(x.status==='open'?`<button class="btn ok" onclick="HP.REC.incClose('${x.id}')">Close incident</button>`:`<button class="btn ghost" onclick="HP.REC.incClose('${x.id}',true)">Reopen</button>`):''}`,{title:esc(x.typeLabel||'Incident')});
}
async function incUpdate(id){ const x=R.incidents.find(r=>r.id===id); const v=($('in-upd').value||'').trim(); if(!x||!v) return; x.updates=(x.updates||[]).concat([{text:v,by:HP.ME.name,at:nowISO()}]); await Store.set('hosrec_incidents',id,{updates:x.updates}); incOpen(id); }
async function incClose(id,reopen){ await Store.set('hosrec_incidents',id,reopen?{status:'open'}:{status:'closed',closedBy:HP.ME.name,closedAt:nowISO()}); closeSheet(); }

/* ---------- fire alarm tests, drills, activations ---------- */
const ZONES=['Reception / Lobby','Ground floor bedrooms','First floor bedrooms','Restaurant / Bar','Kitchen','Spa & Leisure','Conference / Events','Staff areas','Plant / Boiler room','Other'];
function fireSheet(kind){
  R.fire1={kind:kind||'test'};
  const k=R.fire1.kind;
  sheet(`<div class="seg">${FIRE_KINDS.map(t=>`<button class="${k===t[0]?'on':''}" onclick="HP.REC.fireSheet('${t[0]}')">${t[2]} ${t[1]}</button>`).join('')}</div>
    <div class="two"><div><label class="lbl">Date &amp; time</label><input class="inp" type="datetime-local" id="fr-when" value="${esc(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16))}"></div><div><label class="lbl">${k==='test'?'Call point / zone':'Zone / area'}</label><select class="inp" id="fr-zone">${ZONES.map(z=>`<option>${esc(z)}</option>`).join('')}</select></div></div>
    ${k==='test'?`<label class="lbl">Call point number <span>rotate weekly</span></label><input class="inp" id="fr-cp" placeholder="e.g. CP 12">
      <label class="check"><input type="checkbox" id="fr-ok" checked> Alarm sounded throughout &amp; panel showed the correct zone</label>
      <label class="check"><input type="checkbox" id="fr-reset" checked> Panel reset and alarm receiving centre informed</label>`:''}
    ${k==='drill'?`<div class="two"><div><label class="lbl">Evacuation time <span>min:sec</span></label><input class="inp" id="fr-time" placeholder="e.g. 3:40"></div><div><label class="lbl">People evacuated</label><input class="inp" id="fr-count" inputmode="numeric" placeholder="approx."></div></div>
      <label class="check"><input type="checkbox" id="fr-roll" checked> Roll call completed at assembly point</label>
      <label class="check"><input type="checkbox" id="fr-issues"> Issues found (describe below)</label>`:''}
    ${k==='activation'?`<label class="lbl">Cause</label><select class="inp" id="fr-cause"><option>False alarm — cooking / steam</option><option>False alarm — aerosol / smoking</option><option>False alarm — contractor / dust</option><option>False alarm — fault</option><option>Genuine — fire</option><option>Unknown</option></select>
      <label class="check"><input type="checkbox" id="fr-evac"> Building evacuated</label><label class="check"><input type="checkbox" id="fr-brigade"> Fire brigade attended</label>`:''}
    ${k==='check'?`<label class="lbl">What was checked</label><input class="inp" id="fr-what" placeholder="e.g. Fire doors, extinguishers, emergency lighting">`:''}
    <label class="lbl">Notes</label><textarea class="inp" id="fr-notes" style="min-height:60px" placeholder="Anything to report or follow up"></textarea>
    <button class="btn red" onclick="HP.REC.fireSave()">Save record</button>`,{title:(FIRE_KINDS.find(t=>t[0]===k)||[])[1]||'Fire record'});
}
async function fireSave(){
  const k=R.fire1.kind; const v=id=>{ const e=$(id); return e?(e.type==='checkbox'?e.checked:(e.value||'').trim()):undefined; };
  const rec={ id:uid('FR'), kind:k, kindLabel:(FIRE_KINDS.find(t=>t[0]===k)||[])[1]||k, when:v('fr-when'), zone:v('fr-zone'), callPoint:v('fr-cp'), ok:v('fr-ok'), reset:v('fr-reset'), evacTime:v('fr-time'), count:v('fr-count'), rollCall:v('fr-roll'), issues:v('fr-issues'), cause:v('fr-cause'), evacuated:v('fr-evac'), brigade:v('fr-brigade'), what:v('fr-what'), notes:v('fr-notes'), by:HP.ME.name, byId:HP.ME.id, at:nowISO(), date:todayISO() };
  Object.keys(rec).forEach(x=>{ if(rec[x]===undefined) delete rec[x]; });
  if(k==='test'&&!rec.callPoint){ toast('Which call point was tested?'); return; }
  const ok=await Store.set('hosrec_fire',rec.id,rec,false);
  if(ok){ closeSheet(); toast('Saved'); if(k==='activation'||(k==='test'&&rec.ok===false)) { try{ HP.FIX.newJob({area:'maintenance',location:'Fire alarm system',description:(k==='activation'?'Fire alarm activation — '+(rec.cause||''):'Fire alarm test failed — '+rec.zone+' '+rec.callPoint)+(rec.notes?'. '+rec.notes:''),priority:'urgent',source:'Reception'}); }catch(e){} } }
}
function fireCard(f){ const K=FIRE_KINDS.find(t=>t[0]===f.kind)||FIRE_KINDS[0]; const bad=(f.kind==='test'&&f.ok===false)||f.kind==='activation'||f.issues;
  return `<div class="card ${bad?'urgent':''}"><div class="row"><div class="grow"><div class="ttl">${K[2]} ${esc(f.kindLabel||K[1])}${f.callPoint?' · '+esc(f.callPoint):''}</div><div class="sub">${esc(f.zone||'')}${f.evacTime?' · evacuated in '+esc(f.evacTime):''}${f.count?' · '+esc(f.count)+' people':''}${f.cause?' · '+esc(f.cause):''}${f.what?' · '+esc(f.what):''}</div>${f.notes?`<div class="sub">${esc(f.notes)}</div>`:''}</div><span class="pill ${bad?'urgent':'co'}">${f.kind==='test'?(f.ok===false?'Failed':'Passed'):f.kind==='drill'?(f.issues?'Issues':'OK'):f.kind==='activation'?(f.brigade?'Brigade':'Logged'):'Done'}</span></div><div class="sub" style="margin-top:6px">${esc(f.when?f.when.replace('T',' '):fmtDT(f.at))} · ${esc(f.by||'')}</div></div>`; }

/* ---------- logs ---------- */
registerView('rec/log',{ render(el,p){
  const tab=(p&&p.tab)||R.tab||'requests'; R.tab=tab;
  const T={requests:'Requests',incidents:'Incidents',fire:'Fire records'};
  let body='';
  if(tab==='requests') body=R.requests.map(reqCard).join('')||'<div class="empty">No requests in the last 14 days.</div>';
  else if(tab==='incidents') body=R.incidents.map(x=>`<div class="card tap ${x.injury?'urgent':''}" onclick="HP.REC.incOpen('${x.id}')"><div class="row"><div class="grow"><div class="ttl">${esc((INCIDENT_TYPES.find(t=>t[0]===x.type)||['','',''])[2])} ${esc(x.typeLabel||'Incident')}${x.where?' · '+esc(x.where):''}</div><div class="sub">${esc((x.description||'').slice(0,100))}</div></div><span class="pill ${x.status==='open'?'pa':'co'}">${x.status==='open'?'Open':'Closed'}</span></div><div class="sub" style="margin-top:6px">${esc(x.when?x.when.replace('T',' '):fmtDT(x.at))} · ${esc(x.by||'')}</div></div>`).join('')||'<div class="empty">No incidents logged.</div>';
  else body=R.fire.map(fireCard).join('')||'<div class="empty">No fire records yet.</div>';
  el.innerHTML=topbar({mod:'rec',title:'Reception logs',sub:T[tab],backTo:'rec',action:{label:'＋ New',onclick:tab==='requests'?"HP.REC.reqSheet('guest')":tab==='incidents'?"HP.REC.incidentSheet()":"HP.REC.fireSheet('test')"}})+`<div class="wrap">
    <div class="seg">${Object.keys(T).map(k=>`<button class="${tab===k?'on':''}" onclick="HP.go('rec/log',{tab:'${k}'},true)">${T[k]}</button>`).join('')}</div>
    <div style="margin-top:10px">${body}</div></div>${bnav([{id:'rec',icon:'🛎️',label:'Reception',onclick:"HP.go('rec')"},{id:'log',icon:'📒',label:'Logs',onclick:"HP.go('rec/log')"},{id:'home',icon:'🏠',label:'Home',onclick:"HP.go('home')"}],'log')}`;
}});

HP.REC={ reqSheet, reqSheetRe, qSet:(k,v)=>{ R.q[k]=v; }, reqSave, hkSheet, reqOpen, reqUpdate, reqDone, reqReopen, incidentSheet, incType, incPhoto, incSave, incOpen, incUpdate, incClose, fireSheet, fireSave, fireCard, data:R, INCIDENT_TYPES, FIRE_KINDS };
})();
