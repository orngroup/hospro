/* ============================================================
   HosPRO Mobile — Maintenance (HosFIX) module — clean rebuild
   Reads/writes the shared hosfix_jobs collection (same schema as
   the previous HosFIX app, so both can run side by side).
   Extra photos (before / after / receipts) go to hosfix_photos so
   job documents stay small. Time logs go to hosfix_timelogs.
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,nowISO,toast,sheet,closeSheet,confirmSheet,capturePhoto,viewPhoto,registerView,go,back,refresh,topbar,bnav,setBadge,Store,Users,gbp,fmtDate,fmtDT,ago,mmss,avatar,uid}=HP;

const CLEAN_FROM='2026-10-10T10:00:00.000Z';   // clean-start cutoff (same as HosFIX)
const AREAS={
  bedrooms:{label:'Bedrooms',icon:'🛏️'}, meeting_events:{label:'Meeting & Events',icon:'🎪',locs:['Wolston Suite','Brandon Suite','Brandon Suite 1','Brandon Suite 2','Beech Room','Hunt Room','Warwick Room','Boardroom','Event Lawn','Marquee Area']},
  food_beverage:{label:'Food & Beverage',icon:'fb',locs:['Restaurant','Bar','Private Dining','Terrace','Kitchen']},
  spa:{label:'Spa & Leisure',icon:'💆',locs:['Spa','Pool','Gym','Treatment Room 1','Treatment Room 2','Sauna','Steam Room']},
  public_areas:{label:'Public Areas',icon:'🏛️',locs:['Reception','Lobby','Corridors (Ground)','Corridors (First)','Corridors (Second)','Lift','Gents WC','Ladies WC','Accessible WC','Main Entrance','Staff Areas','Cellar/Store']},
  external:{label:'External / Grounds',icon:'🌳',locs:['Car Park','Gardens','Woodlands','External Walls','Roof','Outbuildings']},
  maintenance:{label:'Maintenance Areas',icon:'fix',locs:['Boiler Room','Plant Room','Electrical Cupboard','Linen Store','Bin Store','Cellar']}
};
const SUITES=['Beech Suite','Brandon Suite 1','Brandon Suite 2','Hunt Room','Warwick Room','Wolston Suite','Junior Suite','Accessible Room'];
function bedroomLocs(){ let rooms=[]; try{ rooms=HH.defaultRooms().map(r=>'Room '+r.room); }catch(e){ for(let i=1;i<=120;i++) rooms.push('Room '+i); } return rooms.concat(SUITES); }
const WORK_TYPES=[['plumbing','Plumbing','🔧'],['electrical','Electrical','⚡'],['decorating','Decorating / Painting','🎨'],['carpentry','Carpentry / Joinery','🪚'],['hvac','Heating / Air con','🌡️'],['appliance','Appliance / TV','📺'],['furniture','Furniture / Fixtures','🪑'],['grounds','Grounds / External','🌳'],['safety','Fire / Safety','🔥'],['other','Other','🛠️']];
const PRIOS=[['low','Low'],['medium','Medium'],['high','High'],['urgent','Urgent']];
const STATUS_LABEL={'not-started':'Not started','in-progress':'In progress','pending_approval':'Awaiting approval','complete':'Complete','cancelled':'Cancelled'};
const STATUS_CLS={'not-started':'ns','in-progress':'ip','pending_approval':'pa','complete':'co','cancelled':'ca'};

const F={ jobs:[], unwatch:null, filter:'open', q:'', tick:null };
function meFix(){ return HP.ME?(HP.ME.fixId||HP.ME.id):''; }
function isMgr(){ return HP.isAdmin(); }
function isFixer(){ return !!(HP.ME&&(HP.ME.tier==='fixer'||HP.ME.fixer)); }
function isApprover(){ return !!(HP.ME&&HP.ME.approver); }
function visibleJobs(){
  const me=meFix();
  if(isMgr()) return F.jobs.slice();
  if(isFixer()) return F.jobs.filter(j=>(j.assignees||[]).includes(me));
  return F.jobs.filter(j=>j.createdBy===me||j.createdBy===HP.ME.id||j.reportedBy===HP.ME.name);
}
function jobCost(j){ let c=+j.cost||0; const m=(j.materials||[]).reduce((t,x)=>t+(+x.cost||(+x.qty||1)*(+x.tradePrice||0)),0); const r=(j.receipts||[]).reduce((t,x)=>t+(+x.amount||0),0); return Math.max(c, m+r); }
function timerSecs(j){ const t=j.timer; if(!t) return Math.round((j.totalTimeMins||0)*60); let ms=t.accumulatedMs||0; if(t.state==='running'&&t.currentStart) ms+=Date.now()-new Date(t.currentStart).getTime(); return Math.round(ms/1000); }
function assigneeNames(j){ return (j.assignees||[]).map(a=>Users.nameOf(a).split(' ')[0]).join(', ')||'Unassigned'; }
function urgentOpen(){ return visibleJobs().filter(j=>j.priority==='urgent'&&!['complete','cancelled'].includes(j.status)); }

function startWatch(){
  if(F.unwatch||!Store.ready) return;
  F.unwatch=Store.watch('hosfix_jobs', list=>{
    F.jobs=list.filter(j=>String(j.createdAt||'')>=CLEAN_FROM).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const open=visibleJobs().filter(j=>!['complete','cancelled'].includes(j.status));
    const urg=open.filter(j=>j.priority==='urgent').length;
    setBadge('fix', open.length, urg?'':open.length?'amber':'ok');
    document.dispatchEvent(new CustomEvent('hp:fix',{detail:F.jobs}));
    if((location.hash||'').indexOf('#fix')===0) refresh();
  });
}
document.addEventListener('hp:login',()=>{ if(HP.canOpen('fix')) startWatch(); });
document.addEventListener('hp:logout',()=>{ if(F.unwatch){ try{ F.unwatch(); }catch(e){} F.unwatch=null; } F.jobs=[]; });

/* ---------- save helpers ---------- */
async function saveJob(j, note){
  j.updatedAt=nowISO(); j.updatedBy=meFix();
  if(note){ j.notes=j.notes||[]; j.notes.push({text:note, by:HP.ME.name, at:nowISO()}); }
  const copy=Object.assign({},j); delete copy._id;
  if(JSON.stringify(copy).length>900000){ copy.photos=[]; copy.photosLocalOnly=true; }
  return Store.set('hosfix_jobs', j.id, copy, false);
}
async function addJobPhoto(j, kind, caption){
  const du=await capturePhoto(caption||(j.location||'')+' · '+kind); if(!du) return false;
  const id=j.id+'__'+kind+'__'+Date.now();
  const ok=await Store.set('hosfix_photos', id, {id, jobId:j.id, kind, dataUrl:du, by:HP.ME.name, byId:meFix(), at:nowISO()}, false);
  if(ok){ j.photoCount=(j.photoCount||0)+1; j[kind+'Photos']=(j[kind+'Photos']||0)+1; await saveJob(j, (kind==='before'?'Before photo':kind==='after'?'After photo':kind==='receipt'?'Receipt photo':'Photo')+' added'); }
  return ok;
}

/* ---------- create a job ---------- */
function newJob(pre){
  pre=pre||{};
  const N={ area:pre.area||(pre.room?'bedrooms':'bedrooms'), location:pre.location||(pre.room?('Room '+pre.room):''), room:pre.room||'', roomType:pre.roomType||'', description:pre.description||'', workType:'', priority:pre.priority||'medium', photo:null, cost:'', assignees:HP.DEFAULT_FIXERS.slice(), source:pre.source||(HP.ME.dept==='reception'?'Reception':HP.ME.dept==='housekeeping'?'HosHOUSE':HP.ME.dept==='fb'?'F&B':'HosPRO'), date:pre.date||todayISO() };
  F.N=N; renderNew();
}
function renderNew(){
  const N=F.N; const A=AREAS[N.area]; const locs=N.area==='bedrooms'?bedroomLocs():(A.locs||[]);
  sheet(`<label class="lbl">Where</label>
    <div class="scrollx">${Object.keys(AREAS).map(k=>`<button class="qchip ${N.area===k?'on':''}" onclick="HP.FIX.nArea('${k}')">${AREAS[k].icon} ${esc(AREAS[k].label)}</button>`).join('')}</div>
    <select class="inp" id="nj-loc" onchange="HP.FIX.nSet('location',this.value)"><option value="">Choose a location…</option>${locs.map(l=>`<option ${N.location===l?'selected':''}>${esc(l)}</option>`).join('')}<option value="__other" ${N.location&&!locs.includes(N.location)?'selected':''}>Other / type it…</option></select>
    ${N.location&&!locs.includes(N.location)?`<input class="inp" style="margin-top:8px" id="nj-loc2" placeholder="Describe the location" value="${esc(N.location==='__other'?'':N.location)}" oninput="HP.FIX.nSet('location',this.value)">`:''}
    <label class="lbl">What's the fault?</label><textarea class="inp" id="nj-desc" placeholder="e.g. Shower mixer dripping constantly" oninput="HP.FIX.nSet('description',this.value)">${esc(N.description)}</textarea>
    <label class="lbl">Type of work</label><div class="scrollx">${WORK_TYPES.map(w=>`<button class="qchip ${N.workType===w[0]?'on':''}" onclick="HP.FIX.nSet('workType','${w[0]}');HP.FIX.renderNew()">${w[2]} ${esc(w[1])}</button>`).join('')}</div>
    <label class="lbl">Priority</label><div class="seg">${PRIOS.map(p=>`<button class="${N.priority===p[0]?'on '+p[0]:''}" onclick="HP.FIX.nSet('priority','${p[0]}');HP.FIX.renderNew()">${p[1]}</button>`).join('')}</div>
    ${isMgr()||isFixer()?`<label class="lbl">Assign to</label><div class="chips">${Users.fixers().map(u=>`<button class="qchip ${N.assignees.includes(u.fixId)?'on':''}" onclick="HP.FIX.nToggle('${u.fixId}')">${esc(u.name.split(' ')[0])}</button>`).join('')}</div>
    <label class="lbl">Estimated cost <span>£ · over ${gbp(HP.APPROVAL_THRESHOLD)} needs manager approval</span></label><input class="inp" id="nj-cost" inputmode="decimal" placeholder="0.00" value="${esc(N.cost)}" oninput="HP.FIX.nSet('cost',this.value)">`:''}
    <label class="lbl">Photo</label>
    <div class="photos">${N.photo?`<div class="ph" onclick="HP.viewPhoto(HP.FIX.N.photo,'Fault photo')"><img src="${N.photo}"><div class="cap">Fault</div></div>`:''}<button class="add" onclick="HP.FIX.nPhoto()"><b>📷</b>${N.photo?'Retake':'Take photo'}</button></div>
    <button class="btn fix" id="nj-send" onclick="HP.FIX.nSubmit()">🔧 Raise job${N.assignees.length?' → '+N.assignees.map(a=>Users.nameOf(a).split(' ')[0]).join(' & '):''}</button>`,{title:'Report a fault'});
}
async function nSubmit(){
  const N=F.N; const desc=(N.description||'').trim();
  if(!N.location||N.location==='__other'){ toast('Choose a location'); return; }
  if(!desc){ toast('Describe the fault'); return; }
  const b=$('nj-send'); if(b){ b.disabled=true; b.textContent='Sending…'; }
  const cost=parseFloat(N.cost)||0; const needsApproval=cost>HP.APPROVAL_THRESHOLD&&!isApprover();
  const room=N.area==='bedrooms'?N.location.replace(/^Room\s+/i,''):'';
  const id='HP'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), now=nowISO();
  const job={ id, title:(N.location+' — '+desc.slice(0,48)), area:N.area, areaLabel:AREAS[N.area].label, location:N.location, workType:N.workType||'',
    description:desc+'\n\nReported by '+HP.ME.name+'\nSource: '+N.source+' · '+N.location+(N.roomType?' · '+N.roomType:''),
    status:needsApproval?'pending_approval':'not-started', priority:N.priority, assignees:N.assignees.length?N.assignees:HP.DEFAULT_FIXERS.slice(), cost, module:'maintenance',
    photos:N.photo?[N.photo]:[], materials:[], notes:[{text:'Job raised'+(needsApproval?' — awaiting approval (over '+gbp(HP.APPROVAL_THRESHOLD)+')':''), by:HP.ME.name, at:now}], receipts:[],
    createdAt:now, updatedAt:now, createdBy:meFix(), reportedBy:HP.ME.name, source:N.source, room, roomType:N.roomType||'', reportedDate:N.date||todayISO(), approvedBy:null, approvedAt:null, completedAt:null };
  const ok=await Store.set('hosfix_jobs', id, job, false);
  if(!ok){ if(b){ b.disabled=false; b.textContent='Try again'; } return; }
  if(room && N.source==='HosHOUSE' && window.HH){ try{ await HH.updateRoom(N.date||todayISO(), room, {maintenance:desc, maintJobId:id, maintSentAt:Date.now()}); }catch(e){} }
  closeSheet(); toast('🔧 Job raised for '+N.location); F.N=null;
  if(F.onCreated){ try{ F.onCreated(job); }catch(e){} F.onCreated=null; }
}

/* ---------- list / dashboard ---------- */
function filtered(){
  let L=visibleJobs(); const q=(F.q||'').toLowerCase();
  if(F.filter==='open') L=L.filter(j=>!['complete','cancelled'].includes(j.status));
  else if(F.filter==='mine') L=L.filter(j=>(j.assignees||[]).includes(meFix())&&!['complete','cancelled'].includes(j.status));
  else if(F.filter==='urgent') L=L.filter(j=>j.priority==='urgent'&&!['complete','cancelled'].includes(j.status));
  else if(F.filter==='approval') L=L.filter(j=>j.status==='pending_approval');
  else if(F.filter==='progress') L=L.filter(j=>j.status==='in-progress');
  else if(F.filter==='done') L=L.filter(j=>j.status==='complete');
  if(q) L=L.filter(j=>[j.title,j.location,j.description,j.areaLabel,j.reportedBy,j.id].join(' ').toLowerCase().includes(q));
  const pr={urgent:0,high:1,medium:2,low:3};
  if(F.filter!=='done') L.sort((a,b)=>(pr[a.priority]??2)-(pr[b.priority]??2)||String(b.createdAt).localeCompare(String(a.createdAt)));
  return L;
}
function jobCard(j){
  const open=!['complete','cancelled'].includes(j.status);
  return `<div class="card tap ${j.priority==='urgent'&&open?'urgent':''}" onclick="HP.go('fix/job',{id:'${esc(j.id)}'})">
    <div class="row"><div class="grow"><div class="ttl">${esc(j.location||j.areaLabel||'')}</div><div class="sub">${esc((j.description||'').split('\n')[0].slice(0,90))}</div></div><span class="pill ${j.priority||'medium'}">${esc((j.priority||'medium').toUpperCase())}</span></div>
    <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px"><span class="pill ${STATUS_CLS[j.status]||'ns'}">${STATUS_LABEL[j.status]||j.status}</span>${j.timer&&j.timer.state==='running'?'<span class="pill ip">⏱ running</span>':''}<span class="sub">👤 ${esc(assigneeNames(j))}</span><span class="sub" style="margin-left:auto">${esc(j.source||'')} · ${ago(j.createdAt)}</span></div>
  </div>`;
}
registerView('fix',{ render(el){
  const all=visibleJobs(); const open=all.filter(j=>!['complete','cancelled'].includes(j.status));
  const urgent=open.filter(j=>j.priority==='urgent').length, ip=open.filter(j=>j.status==='in-progress').length, pa=all.filter(j=>j.status==='pending_approval').length;
  const doneWeek=all.filter(j=>j.status==='complete'&&j.completedAt&&Date.now()-new Date(j.completedAt)<7*864e5).length;
  const mine=open.filter(j=>(j.assignees||[]).includes(meFix())).length;
  const chips=[['open','Open',open.length],['mine','Mine',mine],['urgent','Urgent',urgent],['progress','In progress',ip]].concat(isMgr()?[['approval','Approvals',pa]]:[]).concat([['done','Done',all.filter(j=>j.status==='complete').length],['all','All',all.length]]);
  const L=filtered();
  el.innerHTML=topbar({mod:'fix',title:isFixer()&&!isMgr()?'My jobs':'Maintenance',sub:esc(HP.ME.name)+(isMgr()?' · manager view':isFixer()?' · fixer view':' · my reports'),action:isMgr()?{label:'Report ▸',onclick:"HP.go('fix/report')"}:null})+`<div class="wrap">
    <div class="stats four"><div class="stat ${urgent?'bad':''}"><div class="n">${urgent}</div><div class="l">Urgent</div></div><div class="stat"><div class="n">${open.length}</div><div class="l">Open</div></div><div class="stat"><div class="n" style="color:#0e7490">${ip}</div><div class="l">In progress</div></div><div class="stat good"><div class="n">${doneWeek}</div><div class="l">Done · 7 days</div></div></div>
    ${pa&&isMgr()?`<div class="note" onclick="HP.FIX.setFilter('approval')">⚠️ ${pa} job${pa>1?'s':''} waiting for cost approval — tap to review</div>`:''}
    <input class="inp" placeholder="Search jobs…" value="${esc(F.q)}" oninput="HP.FIX.search(this.value)">
    <div class="scrollx" style="margin-top:8px">${chips.map(c=>`<button class="qchip ${F.filter===c[0]?'on':''}" onclick="HP.FIX.setFilter('${c[0]}')">${esc(c[1])} <b>${c[2]}</b></button>`).join('')}</div>
    <div id="fix-list">${L.length?L.map(jobCard).join(''):'<div class="empty">No jobs here.</div>'}</div>
  </div>
  <button class="btn fix" style="position:fixed;right:16px;bottom:calc(76px + var(--safe-bot));width:auto;border-radius:30px;padding:14px 20px;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:25" onclick="HP.FIX.newJob()">＋ Report a fault</button>
  ${bnav([{id:'jobs',icon:'fix',label:'Jobs',onclick:"HP.go('fix')"},{id:'home',icon:'home',label:'Home',onclick:"HP.go('home')"}].concat(isMgr()?[{id:'report',icon:'comp',label:'Reports',onclick:"HP.go('fix/report')"}]:[]),'jobs')}`;
}});
function setFilter(f){ F.filter=f; refresh(); }
function search(q){ F.q=q; const box=$('fix-list'); if(box){ const L=filtered(); box.innerHTML=L.length?L.map(jobCard).join(''):'<div class="empty">No jobs match.</div>'; } }

/* ---------- job detail ---------- */
registerView('fix/job',{ render(el,p){
  const j=F.jobs.find(x=>x.id===p.id); if(!j){ el.innerHTML=topbar({mod:'fix',title:'Job'})+'<div class="wrap empty">Loading job…</div>'; return; }
  const me=meFix(); const mine=(j.assignees||[]).includes(me); const mgr=isMgr(); const canWork=mgr||mine;
  const open=!['complete','cancelled'].includes(j.status); const secs=timerSecs(j); const running=j.timer&&j.timer.state==='running';
  const cost=jobCost(j); const over=cost>HP.APPROVAL_THRESHOLD;
  el.innerHTML=topbar({mod:'fix',title:esc(j.location||j.areaLabel||'Job'),sub:esc(j.areaLabel||'')+' · '+esc(j.id),backTo:'fix'})+`<div class="wrap">
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:10px"><span class="pill ${STATUS_CLS[j.status]||'ns'}">${STATUS_LABEL[j.status]||j.status}</span><span class="pill ${j.priority||'medium'}">${esc((j.priority||'medium').toUpperCase())}</span>${j.workType?`<span class="pill light">${esc((WORK_TYPES.find(w=>w[0]===j.workType)||[,j.workType])[1])}</span>`:''}${j.source?`<span class="pill light">${esc(j.source)}</span>`:''}</div>
    <div class="card"><div style="white-space:pre-wrap;font-size:15px">${esc(j.description||'')}</div>
      <div class="kv" style="margin-top:10px"><b>Reported</b><span>${esc(fmtDT(j.createdAt))}${j.reportedBy?' · '+esc(j.reportedBy):''}</span><b>Assigned to</b><span>${esc((j.assignees||[]).map(a=>Users.nameOf(a)).join(', ')||'Unassigned')}</span>${j.startedAt?`<b>Started</b><span>${esc(fmtDT(j.startedAt))}</span>`:''}${j.completedAt?`<b>Completed</b><span>${esc(fmtDT(j.completedAt))}${j.completedBy?' · '+esc(j.completedBy):''}</span>`:''}${j.approvedAt?`<b>Approved</b><span>${esc(fmtDT(j.approvedAt))} · ${esc(j.approvedBy||'')}</span>`:''}</div>
      ${(j.photos||[]).length?`<div class="photos">${j.photos.map((p,i)=>`<div class="ph" onclick="HP.FIX.viewJobPhoto('${esc(j.id)}',${i})"><img src="${p}"><div class="cap">Fault</div></div>`).join('')}</div>`:''}
      <div class="photos" id="fj-photos"></div>
    </div>

    ${j.status==='pending_approval'?`<div class="note">${isApprover()?`This job is over ${gbp(HP.APPROVAL_THRESHOLD)} (${gbp(cost)}) and needs your approval before work starts.`:`Waiting for a manager to approve the cost (${gbp(cost)}).`}</div>${isApprover()?`<div class="btnrow"><button class="btn red" onclick="HP.FIX.cancel('${j.id}')">Decline</button><button class="btn ok" onclick="HP.FIX.approve('${j.id}')">✓ Approve ${gbp(cost)}</button></div>`:''}`:''}

    ${open&&j.status!=='pending_approval'&&canWork?`<div class="card" style="text-align:center"><div class="sub">Time on job</div><div class="timer ${running?'':''}" id="fj-timer">${mmss(secs)}</div>
      <div class="btnrow">${!running?`<button class="btn ok" onclick="HP.FIX.timer('${j.id}','start')">▶ ${j.timer||j.startedAt?'Resume':'Start job'}</button>`:`<button class="btn amber" onclick="HP.FIX.timer('${j.id}','pause')">⏸ Pause</button>`}<button class="btn ghost" onclick="HP.FIX.addPhoto('${j.id}','${j.beforePhotos?'progress':'before'}')">📷 ${j.beforePhotos?'Progress photo':'Before photo'}</button></div>
      ${over&&!j.approvedAt&&!isApprover()?`<div class="note" style="margin-top:10px">Costs now ${gbp(cost)} — over the ${gbp(HP.APPROVAL_THRESHOLD)} limit. <button class="btn sm amber" onclick="HP.FIX.requestApproval('${j.id}')">Send for approval</button></div>`:''}
      <button class="btn fix" onclick="HP.FIX.completeSheet('${j.id}')">✓ Complete job</button></div>`:''}

    <div class="sect">Costs &amp; materials <span class="r">${gbp(cost)}</span></div>
    <div class="card">${(j.materials||[]).map((m,i)=>`<div class="line"><span>${esc(m.name)} × ${m.qty||1}${m.supplier?' <span class="sub">'+esc(m.supplier)+'</span>':''}</span><span class="money">${gbp(m.cost||(m.qty||1)*(m.tradePrice||0))}</span></div>`).join('')}
      ${(j.receipts||[]).map((r,i)=>`<div class="line"><span>🧾 ${esc(r.desc||'Receipt')}${r.photoId?` <a href="#" onclick="event.preventDefault();HP.FIX.viewReceipt('${esc(r.photoId)}')">view</a>`:''}<span class="sub" style="display:block">${esc(r.by||'')} · ${esc(fmtDate(r.at))}</span></span><span class="money">${gbp(r.amount)}</span></div>`).join('')}
      ${!(j.materials||[]).length&&!(j.receipts||[]).length?`<div class="sub">${j.cost?'Estimate '+gbp(j.cost):'No costs logged yet.'}</div>`:''}
      ${open&&canWork?`<div class="btnrow"><button class="btn ghost sm" style="flex:1" onclick="HP.FIX.materialSheet('${j.id}')">＋ Material</button><button class="btn ghost sm" style="flex:1" onclick="HP.FIX.receiptSheet('${j.id}')">＋ Receipt</button></div>`:''}</div>

    ${mgr&&open?`<div class="sect">Manage</div><div class="card"><div class="btnrow"><button class="btn ghost sm" style="flex:1" onclick="HP.FIX.assignSheet('${j.id}')">⇄ Reassign</button><button class="btn ghost sm" style="flex:1" onclick="HP.FIX.prioritySheet('${j.id}')">Priority</button><button class="btn ghost sm" style="flex:1;color:var(--red)" onclick="HP.FIX.cancel('${j.id}')">Cancel job</button></div></div>`:''}
    ${mgr&&!open?`<button class="btn ghost" onclick="HP.FIX.reopen('${j.id}')">Reopen job</button>`:''}

    <div class="sect">Notes &amp; history</div>
    <div class="card"><div class="tl">${(j.notes||[]).slice().reverse().map(n=>`<div class="ev">${esc(n.text)}<div class="w">${esc(n.by||'')} · ${esc(fmtDT(n.at))}</div></div>`).join('')||'<div class="sub">No notes yet.</div>'}</div>
      ${open?`<div class="row" style="margin-top:8px"><input class="inp" id="fj-note" placeholder="Add a note…"><button class="btn sm" onclick="HP.FIX.addNote('${j.id}')">Add</button></div>`:''}</div>
  </div>`;
  loadJobPhotos(j);
  clearInterval(F.tick); if(running) F.tick=setInterval(()=>{ const t=$('fj-timer'); if(t) t.textContent=mmss(timerSecs(j)); else clearInterval(F.tick); },1000);
}});
async function loadJobPhotos(j){
  const box=$('fj-photos'); if(!box) return;
  const ph=await Store.query('hosfix_photos', q=>q.where('jobId','==',j.id));
  ph.sort((a,b)=>String(a.at).localeCompare(String(b.at)));
  F.photos=ph;
  box.innerHTML=ph.filter(p=>p.kind!=='receipt').map(p=>`<div class="ph" onclick="HP.viewPhoto('${p.dataUrl}','${esc(p.kind)} · ${esc(p.by||'')}')"><img src="${p.dataUrl}"><div class="cap">${esc(p.kind)} · ${esc(fmtDate(p.at))}</div></div>`).join('');
}
function viewJobPhoto(id,i){ const j=F.jobs.find(x=>x.id===id); if(j&&j.photos&&j.photos[i]) viewPhoto(j.photos[i],'Fault photo'); }
async function viewReceipt(photoId){ const p=(F.photos||[]).find(x=>x.id===photoId)||await Store.get('hosfix_photos',photoId); if(p) viewPhoto(p.dataUrl,'Receipt'); else toast('Receipt photo not found'); }

/* ---------- actions ---------- */
function jobById(id){ return F.jobs.find(x=>x.id===id); }
async function timer(id, action){
  const j=jobById(id); if(!j) return; const now=nowISO(); j.timer=j.timer||{state:'paused',accumulatedMs:0,currentStart:null};
  if(action==='start'){ if(j.timer.state==='running') return; j.timer.state='running'; j.timer.currentStart=now; const first=!j.startedAt; j.startedAt=j.startedAt||now; j.status='in-progress'; j.startedBy=j.startedBy||HP.ME.name;
    await saveJob(j, first?'Job started':'Job resumed'); if(first) await Store.add('hosfix_timelogs',{jobId:j.id,userId:meFix(),user:HP.ME.name,event:'start',at:now}); }
  else { if(j.timer.state!=='running') return; j.timer.accumulatedMs=(j.timer.accumulatedMs||0)+(Date.now()-new Date(j.timer.currentStart).getTime()); j.timer.state='paused'; j.timer.currentStart=null; await saveJob(j,'Job paused'); }
  refresh();
}
async function addPhoto(id, kind){ const j=jobById(id); if(!j) return; const ok=await addJobPhoto(j, kind, (j.location||'')+' · '+kind); if(ok){ toast('Photo saved'); refresh(); } }
async function addNote(id){ const j=jobById(id); const v=($('fj-note').value||'').trim(); if(!j||!v) return; await saveJob(j, v); refresh(); }
function materialSheet(id){
  sheet(`<label class="lbl">Item</label><input class="inp" id="mt-name" placeholder="e.g. Shower mixer cartridge"><div class="two"><div><label class="lbl">Qty</label><input class="inp" id="mt-qty" inputmode="numeric" value="1"></div><div><label class="lbl">Cost £ <span>total</span></label><input class="inp" id="mt-cost" inputmode="decimal" placeholder="0.00"></div></div><label class="lbl">Supplier <span>optional</span></label><input class="inp" id="mt-sup" placeholder="e.g. Screwfix"><button class="btn fix" onclick="HP.FIX.addMaterial('${id}')">Add material</button>`,{title:'Material / stock used'});
}
async function addMaterial(id){ const j=jobById(id); const name=($('mt-name').value||'').trim(); if(!j||!name){ toast('Add the item name'); return; } j.materials=j.materials||[]; j.materials.push({name, qty:parseInt($('mt-qty').value)||1, cost:parseFloat($('mt-cost').value)||0, supplier:($('mt-sup').value||'').trim(), by:HP.ME.name, at:nowISO()}); j.cost=jobCost(j); closeSheet(); await saveJob(j,'Material added: '+name); refresh(); }
function receiptSheet(id){
  F.rcpt=null;
  sheet(`<label class="lbl">What for</label><input class="inp" id="rc-desc" placeholder="e.g. Toolstation — fittings"><label class="lbl">Amount £</label><input class="inp" id="rc-amt" inputmode="decimal" placeholder="0.00"><div class="photos" id="rc-ph"><button class="add" onclick="HP.FIX.receiptPhoto()"><b>📷</b>Photo of receipt</button></div><button class="btn fix" onclick="HP.FIX.addReceipt('${id}')">Save receipt</button>`,{title:'Add a receipt'});
}
async function receiptPhoto(){ const du=await capturePhoto('Receipt'); if(du){ F.rcpt=du; const b=$('rc-ph'); if(b) b.innerHTML=`<div class="ph"><img src="${du}"><div class="cap">Receipt</div></div><button class="add" onclick="HP.FIX.receiptPhoto()"><b>📷</b>Retake</button>`; } }
async function addReceipt(id){ const j=jobById(id); const desc=($('rc-desc').value||'').trim(), amt=parseFloat($('rc-amt').value)||0; if(!j||!desc){ toast('Say what the receipt is for'); return; }
  let photoId=null; if(F.rcpt){ photoId=j.id+'__receipt__'+Date.now(); await Store.set('hosfix_photos',photoId,{id:photoId,jobId:j.id,kind:'receipt',dataUrl:F.rcpt,by:HP.ME.name,byId:meFix(),at:nowISO()},false); }
  j.receipts=j.receipts||[]; j.receipts.push({desc, amount:amt, photoId, by:HP.ME.name, at:nowISO()}); j.cost=jobCost(j); closeSheet(); await saveJob(j,'Receipt added: '+desc+' '+gbp(amt)); refresh(); }
async function requestApproval(id){ const j=jobById(id); if(!j) return; j.status='pending_approval'; j.cost=jobCost(j); await saveJob(j,'Sent for cost approval ('+gbp(j.cost)+')'); toast('Sent for approval'); refresh(); }
async function approve(id){ const j=jobById(id); if(!j) return; j.status=j.startedAt?'in-progress':'not-started'; j.approvedBy=HP.ME.name; j.approvedAt=nowISO(); await saveJob(j,'Cost approved by '+HP.ME.name+' ('+gbp(jobCost(j))+')'); toast('Approved'); refresh(); }
function cancel(id){ confirmSheet('Cancel this job?','It will be kept in the history as cancelled.','Cancel job',async()=>{ const j=jobById(id); if(!j) return; j.status='cancelled'; j.cancelledAt=nowISO(); j.cancelledBy=HP.ME.name; if(j.timer&&j.timer.state==='running'){ j.timer.accumulatedMs=(j.timer.accumulatedMs||0)+(Date.now()-new Date(j.timer.currentStart).getTime()); j.timer.state='paused'; j.timer.currentStart=null; } await saveJob(j,'Job cancelled by '+HP.ME.name); toast('Cancelled'); go('fix'); },'red'); }
async function reopen(id){ const j=jobById(id); if(!j) return; j.status='not-started'; j.completedAt=null; j.completedBy=null; await saveJob(j,'Job reopened by '+HP.ME.name); refresh(); }
function assignSheet(id){ const j=jobById(id); if(!j) return; F.asg=(j.assignees||[]).slice();
  sheet(`<div class="sub" style="margin-bottom:8px">Tap to choose who should do this job. Glenn can take any job himself.</div><div class="namelist" id="as-list">${Users.fixers().map(u=>`<button onclick="HP.FIX.asToggle('${u.fixId}')" style="${F.asg.includes(u.fixId)?'border-color:var(--navy);background:#e8eef7':''}">${avatar(u)}<span>${esc(u.name)}</span><small>${F.asg.includes(u.fixId)?'✓':''}</small></button>`).join('')}</div><button class="btn fix" onclick="HP.FIX.assignSave('${id}')">Save assignment</button>`,{title:'Assign / redeploy'}); }
function asToggle(fid){ const i=F.asg.indexOf(fid); if(i<0) F.asg.push(fid); else F.asg.splice(i,1); const id=F.jobs.find(j=>true)&&null; document.querySelectorAll('#as-list button').forEach(b=>{ const f=b.getAttribute('onclick').match(/'([^']+)'/)[1]; const on=F.asg.includes(f); b.style.borderColor=on?'var(--navy)':''; b.style.background=on?'#e8eef7':''; b.querySelector('small').textContent=on?'✓':''; }); }
async function assignSave(id){ const j=jobById(id); if(!j) return; if(!F.asg.length){ toast('Choose at least one person'); return; } j.assignees=F.asg.slice(); closeSheet(); await saveJob(j,'Reassigned to '+j.assignees.map(a=>Users.nameOf(a)).join(', ')+' by '+HP.ME.name); toast('Reassigned'); refresh(); }
function prioritySheet(id){ sheet(`<div class="seg" style="flex-direction:column">${PRIOS.map(p=>`<button class="on ${p[0]}" style="padding:14px" onclick="HP.FIX.setPriority('${id}','${p[0]}')">${p[1]}</button>`).join('')}</div>`,{title:'Set priority'}); }
async function setPriority(id,p){ const j=jobById(id); if(!j) return; j.priority=p; closeSheet(); await saveJob(j,'Priority set to '+p); refresh(); }
function completeSheet(id){ const j=jobById(id); if(!j) return; F.after=null;
  sheet(`<div class="sub">Take an "after" photo, add any final notes, then sign off. Time on job: <b>${mmss(timerSecs(j))}</b> · costs <b>${gbp(jobCost(j))}</b></div>
    <div class="photos" id="cp-ph"><button class="add" onclick="HP.FIX.afterPhoto()"><b>📷</b>After photo</button></div>
    <label class="lbl">Completion notes</label><textarea class="inp" id="cp-note" placeholder="What was done, parts used, anything to follow up"></textarea>
    <label class="check"><input type="checkbox" id="cp-safe"> Area left safe and tidy</label>
    <button class="btn ok" onclick="HP.FIX.complete('${id}')">✓ Sign off as complete</button>`,{title:'Complete job'}); }
async function afterPhoto(){ const du=await capturePhoto('After'); if(du){ F.after=du; const b=$('cp-ph'); if(b) b.innerHTML=`<div class="ph"><img src="${du}"><div class="cap">After</div></div><button class="add" onclick="HP.FIX.afterPhoto()"><b>📷</b>Retake</button>`; } }
async function complete(id){
  const j=jobById(id); if(!j) return;
  if(!$('cp-safe').checked){ toast('Confirm the area is left safe'); return; }
  const note=($('cp-note').value||'').trim(); const now=nowISO();
  if(j.timer&&j.timer.state==='running'){ j.timer.accumulatedMs=(j.timer.accumulatedMs||0)+(Date.now()-new Date(j.timer.currentStart).getTime()); j.timer.state='paused'; j.timer.currentStart=null; }
  const mins=Math.round(timerSecs(j)/60);
  if(F.after){ const pid=j.id+'__after__'+Date.now(); await Store.set('hosfix_photos',pid,{id:pid,jobId:j.id,kind:'after',dataUrl:F.after,by:HP.ME.name,byId:meFix(),at:now},false); j.afterPhotos=(j.afterPhotos||0)+1; j.photoCount=(j.photoCount||0)+1; }
  j.status='complete'; j.completedAt=now; j.completedBy=HP.ME.name; j.totalTimeMins=mins; j.cost=jobCost(j); j.safetyConfirmed=true; j.completionNote=note||'';
  closeSheet();
  await saveJob(j,'Job completed'+(mins?' · '+Math.floor(mins/60)+'h '+(mins%60)+'m':'')+(note?' — '+note:''));
  await Store.add('hosfix_timelogs',{jobId:j.id,userId:meFix(),user:HP.ME.name,event:'complete',mins,at:now});
  // flow the result back to the housekeeping room record
  if(j.room && window.HH){ try{ const d=j.reportedDate||String(j.createdAt||'').slice(0,10); await HH.updateRoom(d, j.room, {maintStatus:'complete', maintCompletedAt:Date.now(), maintCompletedBy:HP.ME.name}); }catch(e){} }
  toast('✓ Job complete'); go('fix');
}

/* ---------- report (print / PDF) ---------- */
registerView('fix/report',{ render(el){
  const all=F.jobs; const days=F.rdays||30; const since=new Date(Date.now()-days*864e5).toISOString();
  const inRange=all.filter(j=>String(j.createdAt)>=since);
  const done=inRange.filter(j=>j.status==='complete');
  const open=all.filter(j=>!['complete','cancelled'].includes(j.status));
  const avgFix=done.length?Math.round(done.reduce((t,j)=>t+((new Date(j.completedAt)-new Date(j.createdAt))/36e5),0)/done.length):0;
  const avgResp=done.filter(j=>j.startedAt).length?Math.round(done.filter(j=>j.startedAt).reduce((t,j)=>t+((new Date(j.startedAt)-new Date(j.createdAt))/36e5),0)/done.filter(j=>j.startedAt).length):0;
  const cost=inRange.reduce((t,j)=>t+jobCost(j),0);
  const byArea={}, byFixer={}, bySrc={};
  inRange.forEach(j=>{ byArea[j.areaLabel||'Other']=(byArea[j.areaLabel||'Other']||0)+1; bySrc[j.source||'Other']=(bySrc[j.source||'Other']||0)+1; (j.assignees||[]).forEach(a=>{ const n=Users.nameOf(a); byFixer[n]=byFixer[n]||{t:0,d:0,m:0}; byFixer[n].t++; if(j.status==='complete'){ byFixer[n].d++; byFixer[n].m+=j.totalTimeMins||0; } }); });
  const row=(o,fn)=>Object.keys(o).sort((a,b)=>(fn?fn(o[b])-fn(o[a]):o[b]-o[a])).map(k=>`<div class="line"><span>${esc(k)}</span><b>${fn?fn(o[k]):o[k]}</b></div>`).join('')||'<div class="sub">Nothing yet</div>';
  el.innerHTML=topbar({mod:'fix',title:'Maintenance report',sub:'Last '+days+' days',backTo:'fix',action:{label:'PDF / print',onclick:'HP.FIX.printReport()'}})+`<div class="wrap">
    <div class="seg">${[7,30,90].map(d=>`<button class="${days===d?'on':''}" onclick="HP.FIX.rdays(${d})">${d} days</button>`).join('')}</div>
    <div class="stats four" style="margin-top:10px"><div class="stat"><div class="n">${inRange.length}</div><div class="l">Raised</div></div><div class="stat good"><div class="n">${done.length}</div><div class="l">Completed</div></div><div class="stat ${open.length?'warn':''}"><div class="n">${open.length}</div><div class="l">Open now</div></div><div class="stat"><div class="n">${gbp(cost).replace('.00','')}</div><div class="l">Costs</div></div></div>
    <div class="stats"><div class="stat"><div class="n">${avgResp}h</div><div class="l">Avg response</div></div><div class="stat"><div class="n">${avgFix}h</div><div class="l">Avg time to fix</div></div><div class="stat"><div class="n">${inRange.filter(j=>j.priority==='urgent').length}</div><div class="l">Urgent</div></div></div>
    <div class="sect">By area</div><div class="card">${row(byArea)}</div>
    <div class="sect">By fixer</div><div class="card">${Object.keys(byFixer).map(k=>`<div class="line"><span>${esc(k)}<span class="sub" style="display:block">${byFixer[k].d} of ${byFixer[k].t} complete · ${Math.round(byFixer[k].m/60)}h logged</span></span><b>${byFixer[k].t}</b></div>`).join('')||'<div class="sub">Nothing yet</div>'}</div>
    <div class="sect">By source</div><div class="card">${row(bySrc)}</div>
    <div class="sect">Open jobs</div>${open.map(jobCard).join('')||'<div class="empty">Nothing open.</div>'}
  </div>`;
}});
function rdays(d){ F.rdays=d; refresh(); }
function printReport(){
  const days=F.rdays||30; const since=new Date(Date.now()-days*864e5).toISOString(); const all=F.jobs; const inRange=all.filter(j=>String(j.createdAt)>=since);
  const done=inRange.filter(j=>j.status==='complete'); const open=all.filter(j=>!['complete','cancelled'].includes(j.status));
  const rows=L=>L.map(j=>`<tr><td>${esc(fmtDate(j.createdAt))}</td><td>${esc(j.location||'')}</td><td>${esc((j.description||'').split('\n')[0].slice(0,70))}</td><td>${esc(j.priority||'')}</td><td>${esc(STATUS_LABEL[j.status]||j.status)}</td><td>${esc(assigneeNames(j))}</td><td>${esc(j.source||'')}</td><td>${j.totalTimeMins?Math.round(j.totalTimeMins/6)/10+'h':''}</td><td style="text-align:right">${gbp(jobCost(j))}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Maintenance report — Brandon Hall</title><style>@page{size:A4 landscape;margin:14mm}body{font:11px/1.4 Aptos,Segoe UI,Arial,sans-serif;color:#1f2a37;margin:0}h1{font-size:16px;color:#1F3864;margin:0}h2{font-size:14px;color:#1F3864;margin:16px 0 6px;border-bottom:2px solid #EA7A1E;padding-bottom:3px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1F3864;padding-bottom:8px;margin-bottom:12px}.hd img{height:48px}.kpis{display:flex;gap:10px;margin:8px 0}.k{flex:1;border:1px solid #dfe4ea;border-radius:8px;padding:8px;text-align:center}.k b{display:block;font-size:20px;color:#1F3864}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#1F3864;color:#fff;text-align:left;padding:5px 6px}td{padding:4px 6px;border-bottom:1px solid #e5e9ef;vertical-align:top}tr:nth-child(even) td{background:#f6f8fb}.foot{margin-top:14px;font-size:9px;color:#6b7280}</style></head><body>
    <div class="hd"><div><h1>Maintenance report — last ${days} days</h1><div>Brandon Hall Hotel &amp; Spa · generated ${esc(new Date().toLocaleString('en-GB'))} by ${esc(HP.ME.name)}</div></div><img src="assets/logos/logo---blue-transparent.png" onerror="this.style.display='none'"></div>
    <div class="kpis"><div class="k"><b>${inRange.length}</b>Jobs raised</div><div class="k"><b>${done.length}</b>Completed</div><div class="k"><b>${open.length}</b>Open now</div><div class="k"><b>${inRange.filter(j=>j.priority==='urgent').length}</b>Urgent</div><div class="k"><b>${gbp(inRange.reduce((t,j)=>t+jobCost(j),0))}</b>Costs logged</div></div>
    <h2>Open jobs (${open.length})</h2><table><thead><tr><th>Raised</th><th>Location</th><th>Fault</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Source</th><th>Time</th><th>Cost</th></tr></thead><tbody>${rows(open)}</tbody></table>
    <h2>Completed in period (${done.length})</h2><table><thead><tr><th>Raised</th><th>Location</th><th>Fault</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Source</th><th>Time</th><th>Cost</th></tr></thead><tbody>${rows(done)}</tbody></table>
    <div class="foot">HosPRO Mobile · Maintenance · ${esc(todayISO())}</div><script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script></body></html>`;
  const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print'); return; } w.document.write(html); w.document.close();
}

HP.FIX={ newJob, renderNew, nArea:k=>{ F.N.area=k; F.N.location=''; renderNew(); }, nSet:(k,v)=>{ F.N[k]=v; if(k==='location'&&v==='__other'){ F.N.location='__other'; renderNew(); } }, nToggle:fid=>{ const i=F.N.assignees.indexOf(fid); if(i<0) F.N.assignees.push(fid); else F.N.assignees.splice(i,1); renderNew(); }, nPhoto:async()=>{ const du=await capturePhoto((F.N.location||'Fault')); if(du){ F.N.photo=du; renderNew(); } }, nSubmit,
  get N(){ return F.N; }, setFilter, search, timer, addPhoto, addNote, materialSheet, addMaterial, receiptSheet, receiptPhoto, addReceipt, requestApproval, approve, cancel, reopen, assignSheet, asToggle, assignSave, prioritySheet, setPriority, completeSheet, afterPhoto, complete, rdays, printReport, viewJobPhoto, viewReceipt,
  jobs:()=>F.jobs, visibleJobs, jobCost, STATUS_LABEL, AREAS, onCreated:fn=>{ F.onCreated=fn; } };
})();
