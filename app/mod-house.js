/* ============================================================
   HosPRO Mobile — Housekeeping module
   • Housekeeping staff: the full HosHOUSE app, signed in
     automatically (nothing re-built, nothing lost).
   • Managers / reception: a live room-status board for today
     (read-only), with the full app one tap away.
   Data: hoshouse_rooms, hoshouse_photos, hoshouse_config/current
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,toast,sheet,closeSheet,registerView,go,topbar,openFrame,setBadge,Store,fmtTime,mmss,avatar}=HP;

/* make sure a manager has a HosHOUSE lead account so the app can auto sign them in */
async function ensureHHAccount(u){
  if(!window.HH) return null;
  if(u.hhId && HH.staffById(u.hhId)) return u.hhId;
  if(u.tier!=='admin') return null;
  try{ await HH.loadCfg(); if(u.hhId && HH.staffById(u.hhId)) return u.hhId;
    const rec=await HH.addStaff(u.name, u.pin);
    if(rec){ await HH.updateStaff(rec.id,{lead:true, rating:3}); u.hhId=rec.id; return rec.id; } }catch(e){ console.warn('ensureHH',e); }
  return null;
}
async function openFullApp(){
  const u=HP.ME;
  const hh=await ensureHHAccount(u);
  if(hh){ try{ sessionStorage.setItem('hh_me',hh); localStorage.setItem('hh_pref',hh); }catch(e){} }
  openFrame({mod:'house', title:'Housekeeping', sub:'HosHOUSE · '+u.name, url:'hoshouse.html'+(hh?'?u='+encodeURIComponent(hh):''), openNew:true});
}

HP.HOUSE={ rooms:[], unwatch:null };
function startWatch(){
  if(HP.HOUSE.unwatch) return;
  if(!window.HH) return;
  HP.HOUSE.unwatch=HH.watchDay(todayISO(), list=>{ HP.HOUSE.rooms=list; const open=list.filter(r=>r.status!=='done').length; setBadge('house', open, open?'amber':'ok'); document.dispatchEvent(new CustomEvent('hp:house', {detail:list})); });
}
document.addEventListener('hp:login',()=>{ if(HP.canOpen('house')) startWatch(); });
document.addEventListener('hp:logout',()=>{ if(HP.HOUSE.unwatch){ try{ HP.HOUSE.unwatch(); }catch(e){} HP.HOUSE.unwatch=null; } });

HP_MODULE_OPEN.house=function(){
  const u=HP.ME;
  if(u.dept==='housekeeping'){ openFullApp(); return; }
  go('house');
};

function statusCls(r){ return r.status==='done'?'done':r.status==='in_progress'?'ip':r.status==='blocked'?'blk':''; }
function typeCls(t){ return t==='Stayover'?'stay':t==='Arrival-ready'?'arr':'dep'; }

registerView('house',{ render(el){
  const rooms=HP.HOUSE.rooms||[];
  const R=rooms.filter(r=>!r.area), A=rooms.filter(r=>r.area);
  const done=R.filter(r=>r.status==='done').length, ip=R.filter(r=>r.status==='in_progress').length, blk=R.filter(r=>r.status==='blocked').length, pend=R.length-done-ip-blk;
  const byHk={}; R.forEach(r=>{ const k=r.housekeeperName||r.housekeeper||'Unallocated'; (byHk[k]=byHk[k]||{t:0,d:0}); byHk[k].t++; if(r.status==='done') byHk[k].d++; });
  const maint=rooms.filter(r=>r.maintenance);
  const lost=rooms.filter(r=>r.lostProperty||r.lostPhoto);
  el.innerHTML=topbar({mod:'house',title:'Housekeeping today',sub:new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),action:{label:'Full app ↗',onclick:'HP.HOUSE.openFull()'}})+`<div class="wrap">
    ${!R.length?`<div class="note info">No rooms set for today yet. Reception or a housekeeping lead sets the day's rooms in the full HosHOUSE app.</div>`:''}
    <div class="stats four"><div class="stat good"><div class="n">${done}</div><div class="l">Done</div></div><div class="stat"><div class="n" style="color:#0e7490">${ip}</div><div class="l">In progress</div></div><div class="stat"><div class="n">${pend}</div><div class="l">To do</div></div><div class="stat ${blk?'bad':''}"><div class="n">${blk}</div><div class="l">Can't start</div></div></div>
    ${R.length?`<div class="bar"><i style="width:${Math.round(done/R.length*100)}%"></i></div><div class="sub" style="text-align:center;margin:4px 0 8px">${Math.round(done/R.length*100)}% of ${R.length} rooms complete</div>`:''}
    <div class="sect">Rooms <span class="r">tap a room</span></div>
    <div class="rgrid">${R.map(r=>`<button class="${statusCls(r)}" onclick="HP.HOUSE.room('${esc(r.room)}')" title="${esc(r.type)}">${esc(r.room)}</button>`).join('')}</div>
    ${A.length?`<div class="sect">Public areas</div>${A.map(r=>`<div class="card tap" onclick="HP.HOUSE.room('${esc(r.room)}')"><div class="row"><div class="grow"><div class="ttl">${esc(r.room)}</div><div class="sub">${esc(r.housekeeperName||'Unallocated')}</div></div><span class="pill ${r.status==='done'?'co':r.status==='in_progress'?'ip':r.status==='blocked'?'urgent':'ns'}">${r.status==='done'?'Done':r.status==='in_progress'?'In progress':r.status==='blocked'?"Can't start":'To do'}</span></div></div>`).join('')}`:''}
    <div class="sect">By housekeeper</div>
    ${Object.keys(byHk).sort().map(k=>{ const v=byHk[k]; return `<div class="card"><div class="row"><div class="grow"><div class="ttl">${esc(k)}</div><div class="sub">${v.d} of ${v.t} rooms done</div></div><span class="money">${Math.round(v.d/v.t*100)}%</span></div><div class="bar"><i style="width:${Math.round(v.d/v.t*100)}%"></i></div></div>`; }).join('')||'<div class="empty">Nothing allocated yet.</div>'}
    ${maint.length?`<div class="sect">Maintenance reported from rooms</div>${maint.map(r=>`<div class="card"><div class="ttl">Room ${esc(r.room)} ${r.maintJobId?`<span class="pill ${r.maintStatus==='complete'?'co':'pa'}">${r.maintStatus==='complete'?'✓ Fixed':'Job raised'}</span>`:'<span class="pill ns">Not yet sent</span>'}</div><div class="sub">${esc(r.maintenance)}</div>${!r.maintJobId&&HP.canOpen('fix')?`<button class="btn sm fix" style="margin-top:8px" onclick="HP.FIX.newJob({room:'${esc(r.room)}',description:'${esc(r.maintenance).replace(/'/g,'&#39;')}',source:'HosHOUSE',date:'${esc(r.date)}'})">🔧 Raise job</button>`:''}</div>`).join('')}`:''}
    ${lost.length?`<div class="sect">Lost property</div>${lost.map(r=>`<div class="card"><div class="ttl">Room ${esc(r.room)}</div><div class="sub">${esc(r.lostProperty||'Photo attached')}</div></div>`).join('')}`:''}
    <button class="btn house" onclick="HP.HOUSE.openFull()">Open the full HosHOUSE app</button>
    <div class="sub" style="text-align:center;margin-top:8px">Allocation, checklists, photos and reports all live in the full app.</div>
  </div>`;
}});
document.addEventListener('hp:house',()=>{ if(location.hash==='#house') HP.refresh(); });

async function roomSheet(room){
  const r=(HP.HOUSE.rooms||[]).find(x=>String(x.room)===String(room)); if(!r) return;
  const s=sheet(`<div class="row"><span class="pill ${typeCls(r.type)}">${esc(r.type)}</span><span class="pill ${r.status==='done'?'co':r.status==='in_progress'?'ip':r.status==='blocked'?'urgent':'ns'}">${r.status==='done'?'Done':r.status==='in_progress'?'In progress':r.status==='blocked'?"Can't start":'To do'}</span>${r.urgent?'<span class="pill urgent">URGENT</span>':''}</div>
    <div class="kv" style="margin-top:10px"><b>Housekeeper</b><span>${esc(r.housekeeperName||'Unallocated')}</span>${r.cat&&window.HH?`<b>Category</b><span>${esc(HH.catLabel(r.cat))}${r.floor?' · '+esc(HH.floorLabel(r.floor))+' floor':''}</span>`:''}
      ${r.startAt?`<b>Started</b><span>${fmtTime(r.startAt)}</span>`:''}${r.finishAt?`<b>Finished</b><span>${fmtTime(r.finishAt)} · ${mmss(r.durationSec||0)}</span>`:''}
      ${r.notes?`<b>Note</b><span>${esc(r.notes)}</span>`:''}${r.maintenance?`<b>Maintenance</b><span>${esc(r.maintenance)}${r.maintStatus==='complete'?' <span class="pill co">✓ Fixed</span>':r.maintJobId?' <span class="pill pa">Job raised</span>':''}</span>`:''}${r.lostProperty?`<b>Lost property</b><span>${esc(r.lostProperty)}</span>`:''}${r.replaced?`<b>Reason</b><span>${esc(r.replaced)}</span>`:''}</div>
    <div class="sect">Photos</div><div class="photos" id="hs-photos"><div class="empty" style="grid-column:1/-1;padding:12px">Loading…</div></div>
    ${HP.canOpen('fix')?`<button class="btn fix" onclick="HP.closeSheet();HP.FIX.newJob({room:'${esc(r.room)}',roomType:'${esc(r.type)}',source:'${HP.ME.dept==='reception'?'Reception':'HosHOUSE'}'})">🔧 Report a fault in this room</button>`:''}`,{title:'Room '+esc(r.room)});
  try{ const ph=await HH.getRoomPhotos(r.date||todayISO(), r.room); const box=$('hs-photos'); if(!box) return;
    box.innerHTML=ph.length?ph.map(p=>`<div class="ph" onclick="HP.viewPhoto('${p.dataUrl}','Room ${esc(r.room)} · ${esc(p.label||'')}')"><img src="${p.dataUrl}"><div class="cap">${esc(p.label||p.kind||'')}</div></div>`).join(''):'<div class="empty" style="grid-column:1/-1;padding:12px">No photos yet.</div>'; }catch(e){}
}

HP.HOUSE.openFull=openFullApp; HP.HOUSE.room=roomSheet; HP.HOUSE.ensureHHAccount=ensureHHAccount;
})();
