/* ============================================================
   HosPRO Mobile — Manager / Director overview
   One screen across every department, drill-down to each module,
   and a printable daily operations report.
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,toast,registerView,go,refresh,topbar,bnav,gbp,fmtDate,fmtDT,ago,mmss}=HP;
const HH=window.HH;

function snapshot(){
  const t=todayISO();
  const rooms=(HP.HOUSE&&HP.HOUSE.rooms)||[]; const R=rooms.filter(r=>!r.area);
  const hk={ total:R.length, done:R.filter(r=>r.status==='done').length, ip:R.filter(r=>r.status==='in_progress').length, blocked:R.filter(r=>r.status==='blocked'), maint:R.filter(r=>r.maintenance&&!r.maintJobId), lost:R.filter(r=>r.lostProperty||r.lostPhoto).length };
  const jobs=HP.FIX?HP.FIX.jobs():[]; const open=jobs.filter(j=>!['complete','cancelled'].includes(j.status));
  const month=t.slice(0,7);
  const fx={ open, urgent:open.filter(j=>j.priority==='urgent'), approval:jobs.filter(j=>j.status==='pending_approval'), ip:open.filter(j=>j.status==='in-progress').length, doneToday:jobs.filter(j=>j.status==='complete'&&String(j.completedAt||'').slice(0,10)===t).length, costMonth:jobs.filter(j=>String(j.createdAt||'').slice(0,7)===month).reduce((s,j)=>s+HP.FIX.jobCost(j),0), stale:open.filter(j=>Date.now()-new Date(j.createdAt)>3*864e5&&j.status==='not-started') };
  const RD=(HP.REC&&HP.REC.data)||{requests:[],incidents:[],fire:[]};
  const lastTest=RD.fire.find(f=>f.kind==='test'); const testAge=lastTest?Math.floor((Date.now()-new Date(lastTest.when||lastTest.at))/864e5):null;
  const rec={ open:RD.requests.filter(x=>x.status==='open'), incidentsOpen:RD.incidents.filter(x=>x.status==='open'), incidentsToday:RD.incidents.filter(x=>x.date===t).length, testAge, activationsMonth:RD.fire.filter(f=>f.kind==='activation'&&String(f.date||'').slice(0,7)===month).length };
  const fb=HP.FB?{ today:HP.FB.dayTotals(t), week:HP.FB.weekTotals(), checks:HP.FB.data.checks.filter(c=>c.date===t).map(c=>c.kind), off:HP.FB.data.menu.filter(m=>m.off).length }:null;
  const SL=(HP.SALES&&HP.SALES.data.list)||[]; const sOpen=SL.filter(e=>['enquiry','provisional'].includes(e.status));
  const sales={ auth:HP.SALES?HP.SALES.data.auth:null, open:sOpen.length, overdue:sOpen.filter(e=>e.followUp&&e.followUp<t).length, pipeline:sOpen.reduce((s,e)=>s+(+e.value||0),0), confirmedUpcoming:SL.filter(e=>e.status==='confirmed'&&(e.date||'')>=t).length, newMonth:SL.filter(e=>String(e.created||'').slice(0,7)===month).length };
  return {hk,fx,rec,fb,sales};
}
function attention(s){
  const A=[];
  s.fx.urgent.forEach(j=>A.push({lvl:'bad',icon:'fix',text:'Urgent: '+(j.location||'')+' — '+(j.description||'').split('\n')[0].slice(0,60),go:"HP.go('fix/job',{id:'"+j.id+"'})"}));
  if(s.fx.approval.length) A.push({lvl:'warn',icon:'💷',text:s.fx.approval.length+' maintenance job'+(s.fx.approval.length>1?'s':'')+' waiting for cost approval',go:"HP.FIX.setFilter('approval');HP.go('fix')"});
  s.hk.blocked.forEach(r=>A.push({lvl:'warn',icon:'🚪',text:'Room '+r.room+" couldn't be started"+(r.replaced?' — '+r.replaced:''),go:"HP.go('house')"}));
  if(s.hk.maint.length) A.push({lvl:'warn',icon:'🧹',text:s.hk.maint.length+' room'+(s.hk.maint.length>1?'s':'')+' with maintenance noted but no job raised',go:"HP.go('house')"});
  if(s.rec.testAge==null||s.rec.testAge>7) A.push({lvl:'bad',icon:'🔔',text:'Weekly fire alarm test '+(s.rec.testAge==null?'not logged':'overdue ('+s.rec.testAge+' days)'),go:"HP.go('fire')"});
  s.rec.incidentsOpen.slice(0,3).forEach(x=>A.push({lvl:'warn',icon:'🩹',text:'Open incident: '+(x.typeLabel||'')+(x.where?' at '+x.where:''),go:"HP.REC.incOpen('"+x.id+"')"}));
  s.rec.open.filter(x=>x.urgent).forEach(x=>A.push({lvl:'warn',icon:'rec',text:'Urgent request: '+(x.room?'Room '+x.room+' · ':'')+x.title,go:"HP.REC.reqOpen('"+x.id+"')"}));
  if(s.fb&&!s.fb.today.n&&new Date().getHours()>=22) A.push({lvl:'warn',icon:'fb',text:"Today's F&B figures not entered yet",go:"HP.go('fb')"});
  if(s.sales.overdue) A.push({lvl:'warn',icon:'sales',text:s.sales.overdue+' sales follow-up'+(s.sales.overdue>1?'s':'')+' overdue',go:"HP.SALES.filter('overdue');HP.go('sales')"});
  if(s.fx.stale.length) A.push({lvl:'info',icon:'⏳',text:s.fx.stale.length+' job'+(s.fx.stale.length>1?'s':'')+' not started after 3+ days',go:"HP.go('fix')"});
  return A;
}

/* ---------- tiny SVG charts (no library) ---------- */
function barChart(series, labels, opts){
  // series: [{name,colour,values:[]}], labels: [] ; grouped bars
  opts=opts||{}; const W=360,H=opts.h||150,padL=opts.money?38:28,padB=22,padT=8;
  const max=Math.max(1,...series.flatMap(s=>s.values)); const n=labels.length; const gw=(W-padL-6)/n; const bw=Math.max(3,(gw-6)/series.length);
  const y=v=>padT+(H-padT-padB)*(1-v/max);
  const fmt=v=>opts.money?('£'+(v>=1000?(v/1000).toFixed(v>=10000?0:1)+'k':Math.round(v))):String(Math.round(v));
  let g='';
  (max<4?[0,1]:[0,0.5,1]).forEach(f=>{ const yy=y(max*f); g+=`<line x1="${padL}" x2="${W-4}" y1="${yy}" y2="${yy}" stroke="#e5e9ef" stroke-width="1"/><text x="${padL-4}" y="${yy+4}" font-size="9" fill="#6b7280" text-anchor="end">${fmt(max*f)}</text>`; });
  labels.forEach((l,i)=>{ const x0=padL+i*gw+3;
    series.forEach((sr,k)=>{ const v=sr.values[i]||0; const x=x0+k*bw; g+=`<rect x="${x}" y="${y(v)}" width="${bw-1.5}" height="${Math.max(0,y(0)-y(v))}" rx="2" fill="${sr.colour}"/>`; if(v&&opts.valueLabels) g+=`<text x="${x+(bw-1.5)/2}" y="${y(v)-3}" font-size="8.5" fill="#1f2a37" text-anchor="middle" font-weight="700">${fmt(v)}</text>`; });
    g+=`<text x="${x0+(gw-6)/2}" y="${H-7}" font-size="9.5" fill="#6b7280" text-anchor="middle" font-weight="700">${esc(l)}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}
function hBars(items, opts){ // items [{label,value,colour}]
  opts=opts||{}; const max=Math.max(1,...items.map(i=>i.value));
  return `<div style="display:flex;flex-direction:column;gap:6px;padding:2px 4px 6px">${items.map(i=>`<div><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700"><span>${esc(i.label)}</span><span style="color:var(--navy)">${opts.fmt?opts.fmt(i.value):i.value}</span></div><div class="bar" style="margin-top:3px"><i style="width:${Math.round(i.value/max*100)}%;background:${i.colour||'var(--navy)'}"></i></div></div>`).join('')}</div>`;
}
function last7(){ const out=[]; for(let i=6;i>=0;i--){ const d=new Date(Date.now()-i*864e5); out.push({k:d.toLocaleDateString('en-CA'), l:d.toLocaleDateString('en-GB',{weekday:'short'}).slice(0,3)}); } return out; }
const MG={ hist:null, histAt:0, sum:null, sumAt:0, tab:'today' };
async function loadHistory(){
  if(Date.now()-MG.histAt<5*60e3) return;
  MG.histAt=Date.now();
  try{ const d=last7(); MG.hist=await HH.getRoomsRange(d[0].k, d[6].k); }catch(e){ MG.hist=[]; }
  try{ MG.sum=await HP.Store.get('hospro_public','summary'); }catch(e){}
  if(location.hash==='#manage') refresh();
}
document.addEventListener('hp:login',()=>{ if(HP.isAdmin()) loadHistory(); });

registerView('manage',{ render(el){
  const s=snapshot(); const A=attention(s); const pct=s.hk.total?Math.round(s.hk.done/s.hk.total*100):0;
  const days=last7(); const t=todayISO();
  // housekeeping 7 days
  const hist=(MG.hist||[]).filter(r=>!r.area);
  const hkDone=days.map(d=>hist.filter(r=>r.date===d.k&&r.status==='done').length), hkSet=days.map(d=>hist.filter(r=>r.date===d.k).length);
  // maintenance 7 days
  const jobs=HP.FIX?HP.FIX.jobs():[];
  const raised=days.map(d=>jobs.filter(j=>String(j.createdAt||'').slice(0,10)===d.k).length), fixed=days.map(d=>jobs.filter(j=>j.status==='complete'&&String(j.completedAt||'').slice(0,10)===d.k).length);
  const open=jobs.filter(j=>!['complete','cancelled'].includes(j.status)); const byArea={}; open.forEach(j=>{ byArea[j.areaLabel||'Other']=(byArea[j.areaLabel||'Other']||0)+1; });
  // F&B 7 days
  const fbv=HP.FB?days.map(d=>HP.FB.dayTotals(d.k).t):days.map(()=>0);
  // occupancy from the published forecast (Guestline API will replace this)
  const sum=MG.sum||{}; const fc=sum.fc||{}; const beds=sum.bedrooms||120;
  const next7=[]; for(let i=0;i<7;i++){ const d=new Date(Date.now()+i*864e5); const k=d.toLocaleDateString('en-CA'); next7.push({k,l:i===0?'Today':d.toLocaleDateString('en-GB',{weekday:'short'}).slice(0,3),f:fc[k]||null}); }
  const tf=fc[t]||null; const hasFc=next7.some(x=>x.f&&x.f.rooms);
  // sales
  const SL=(HP.SALES&&HP.SALES.data.list)||[]; const stages=[['enquiry','Enquiry','#997300'],['provisional','Provisional','#0e7490'],['confirmed','Confirmed','#2a6a4a']];
  const fbm=sum.fb||null;
  el.innerHTML=topbar({title:'Hotel overview',sub:esc(HP.ME.name)+' · '+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),backTo:'home',action:{label:'Report',onclick:'HP.MANAGE.printReport()'}})+`<div class="wrap">
    <div class="seg" style="margin-bottom:10px">${[['today','Today'],['trends','7 days'],['rooms','Rooms 360°']].map(x=>`<button class="${MG.tab===x[0]?'on':''}" onclick="HP.MANAGE.tab('${x[0]}')">${x[1]}</button>`).join('')}</div>
    ${MG.tab==='today'?`
    <div class="stats four"><div class="stat ${tf&&tf.rooms?'':''}"><div class="n">${tf&&tf.rooms?Math.round(tf.rooms/beds*100)+'%':'—'}</div><div class="l">Occupancy</div></div><div class="stat"><div class="n">${tf?tf.arrivals||0:'—'}</div><div class="l">Arrivals</div></div><div class="stat"><div class="n">${tf?tf.departures||0:'—'}</div><div class="l">Departures</div></div><div class="stat"><div class="n">${tf?tf.stayovers||0:'—'}</div><div class="l">Stayovers</div></div></div>
    ${!tf?'<div class="sub" style="margin:-4px 2px 8px">Occupancy will come live from Guestline once the API is connected (currently from the published forecast).</div>':'<div class="sub" style="margin:-4px 2px 8px">From the portal forecast · live Guestline feed coming</div>'}
    <div class="sect">Needs attention <span class="r">${A.length?A.length+' item'+(A.length>1?'s':''):'all clear'}</span></div>
    ${A.length?A.slice(0,6).map(a=>`<div class="card tap" style="padding:9px 12px;border-left:4px solid ${a.lvl==='bad'?'var(--red)':a.lvl==='warn'?'var(--amber)':'var(--rec)'}" onclick="${a.go}"><div class="row"><span style="display:inline-grid;place-items:center;width:22px;color:var(--navy)">${HP.icon(a.icon,19)}</span><div class="grow" style="font-size:13.5px;font-weight:700">${esc(a.text)}</div><span class="sub">›</span></div></div>`).join(''):'<div class="note ok">Nothing urgent across the hotel right now.</div>'}
    <div class="sect">🧹 Housekeeping <span class="r" onclick="HP.go('house')">Open ›</span></div>
    <div class="card tap" onclick="HP.go('house')"><div class="row"><div class="grow"><div class="ttl">${s.hk.done} of ${s.hk.total} rooms done</div><div class="sub">${s.hk.ip} in progress · ${s.hk.blocked.length} couldn't start · ${s.hk.lost} lost property</div></div><span class="money">${pct}%</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="sect">🔧 Maintenance <span class="r" onclick="HP.go('fix')">Open ›</span></div>
    <div class="stats four" onclick="HP.go('fix')"><div class="stat ${s.fx.urgent.length?'bad':''}"><div class="n">${s.fx.urgent.length}</div><div class="l">Urgent</div></div><div class="stat"><div class="n">${s.fx.open.length}</div><div class="l">Open</div></div><div class="stat ${s.fx.approval.length?'warn':''}"><div class="n">${s.fx.approval.length}</div><div class="l">To approve</div></div><div class="stat good"><div class="n">${s.fx.doneToday}</div><div class="l">Done today</div></div></div>
    <div class="sect">🛎️ Reception <span class="r" onclick="HP.go('rec')">Open ›</span></div>
    <div class="stats four" onclick="HP.go('rec')"><div class="stat ${s.rec.open.length?'warn':'good'}"><div class="n">${s.rec.open.length}</div><div class="l">Requests</div></div><div class="stat ${s.rec.incidentsOpen.length?'bad':'good'}"><div class="n">${s.rec.incidentsOpen.length}</div><div class="l">Incidents</div></div><div class="stat ${s.rec.testAge==null||s.rec.testAge>7?'bad':'good'}"><div class="n">${s.rec.testAge==null?'—':s.rec.testAge+'d'}</div><div class="l">Alarm test</div></div><div class="stat ${s.rec.activationsMonth?'warn':'good'}"><div class="n">${s.rec.activationsMonth}</div><div class="l">Activations</div></div></div>
    ${s.fb?`<div class="sect">🍽️ Food &amp; Beverage <span class="r" onclick="HP.go('fb')">Open ›</span></div>
    <div class="stats four" onclick="HP.go('fb')"><div class="stat ${s.fb.today.n?'good':''}"><div class="n">${s.fb.today.n?gbp(s.fb.today.t).replace('.00',''):'—'}</div><div class="l">Today</div></div><div class="stat"><div class="n">${s.fb.today.fc+s.fb.today.dc||'—'}</div><div class="l">Covers</div></div><div class="stat"><div class="n">${fbm&&fbm.food?gbp((fbm.food.sales||0)+(fbm.bev.sales||0)).replace('.00',''):gbp(s.fb.week.t).replace('.00','')}</div><div class="l">${fbm&&fbm.food?'Month to date':'7 days'}</div></div><div class="stat ${s.fb.checks.length===2?'good':'warn'}"><div class="n">${s.fb.checks.length}/2</div><div class="l">Checks</div></div></div>`:''}
    <div class="sect">📈 Sales &amp; Events <span class="r" onclick="HP.go('sales')">Open ›</span></div>
    ${s.sales.auth===false?'<div class="note info">Sales pipeline needs your portal login — open the module for details.</div>':`<div class="stats four" onclick="HP.go('sales')"><div class="stat"><div class="n">${s.sales.open}</div><div class="l">Open</div></div><div class="stat ${s.sales.overdue?'bad':'good'}"><div class="n">${s.sales.overdue}</div><div class="l">Overdue</div></div><div class="stat"><div class="n">${gbp(s.sales.pipeline).replace('.00','')}</div><div class="l">Pipeline</div></div><div class="stat"><div class="n">${s.sales.confirmedUpcoming}</div><div class="l">Confirmed</div></div></div>`}
    <button class="btn" onclick="HP.MANAGE.printReport()">📄 Daily operations report (PDF)</button>`:''}

    ${MG.tab==='trends'?`
    <div class="chart"><div class="ct">Occupancy — next 7 days <span>${hasFc?'forecast':'no forecast yet'}</span></div>${barChart([{name:'Rooms',colour:'#1F3864',values:next7.map(x=>x.f?+x.f.rooms||0:0)}],next7.map(x=>x.l),{valueLabels:true})}<div class="legend"><span><i style="background:#1F3864"></i>Rooms sold of ${beds}</span>${hasFc?`<span>Arr ${next7.map(x=>x.f?x.f.arrivals||0:0).join('·')}</span>`:''}</div>${hasFc?'':'<div class="sub" style="margin:4px">Guestline API will feed this live.</div>'}</div>
    <div class="chart"><div class="ct">Rooms cleaned — last 7 days <span>${hkDone.reduce((a,b)=>a+b,0)} done</span></div>${barChart([{name:'Set',colour:'#c9d6ea',values:hkSet},{name:'Done',colour:'#2E6B5E',values:hkDone}],days.map(d=>d.l),{valueLabels:true})}<div class="legend"><span><i style="background:#c9d6ea"></i>Rooms set</span><span><i style="background:#2E6B5E"></i>Completed</span></div></div>
    <div class="chart"><div class="ct">Maintenance — raised vs fixed <span>${open.length} open now</span></div>${barChart([{name:'Raised',colour:'#EA7A1E',values:raised},{name:'Fixed',colour:'#2a6a4a',values:fixed}],days.map(d=>d.l),{valueLabels:true})}<div class="legend"><span><i style="background:#EA7A1E"></i>Raised</span><span><i style="background:#2a6a4a"></i>Completed</span></div></div>
    <div class="chart"><div class="ct">Open jobs by area</div>${hBars(Object.keys(byArea).sort((a,b)=>byArea[b]-byArea[a]).map(k=>({label:k,value:byArea[k],colour:'#965638'})))||''}${!Object.keys(byArea).length?'<div class="empty" style="padding:10px">No open jobs.</div>':''}</div>
    <div class="chart"><div class="ct">F&amp;B sales — last 7 days <span>${gbp(fbv.reduce((a,b)=>a+b,0))}</span></div>${barChart([{name:'Sales',colour:'#6E4E7A',values:fbv}],days.map(d=>d.l),{money:true,valueLabels:true})}</div>
    ${fbm&&fbm.days&&fbm.days.length?`<div class="chart"><div class="ct">F&amp;B month to date <span>${esc(fbm.month||'')}</span></div>${hBars([{label:'Food sales',value:fbm.food.sales||0,colour:'#6E4E7A'},{label:'Drink sales',value:fbm.bev.sales||0,colour:'#9c4f63'},{label:'Food purchases',value:fbm.purchFood||0,colour:'#c9d6ea'},{label:'Drink purchases',value:fbm.purchBev||0,colour:'#c9d6ea'}],{fmt:v=>gbp(v).replace('.00','')})}<div class="sub" style="margin:0 4px">GP food ${fbm.food.gp!=null?fbm.food.gp+'%':'—'} · drink ${fbm.bev.gp!=null?fbm.bev.gp+'%':'—'} · ${fbm.covers||0} covers</div></div>`:''}
    <div class="chart"><div class="ct">Sales pipeline by stage</div>${s.sales.auth===false?'<div class="sub" style="margin:4px">Needs a portal login.</div>':hBars(stages.map(st=>({label:st[1],value:SL.filter(e=>e.status===st[0]).length,colour:st[2]})))}</div>
    <div class="chart"><div class="ct">Reception — last 7 days</div>${barChart([{name:'Requests',colour:'#3B6585',values:days.map(d=>((HP.REC&&HP.REC.data.requests)||[]).filter(x=>x.date===d.k).length)},{name:'Incidents',colour:'#8b2e2e',values:days.map(d=>((HP.REC&&HP.REC.data.incidents)||[]).filter(x=>x.date===d.k).length)}],days.map(d=>d.l),{valueLabels:true})}<div class="legend"><span><i style="background:#3B6585"></i>Requests</span><span><i style="background:#8b2e2e"></i>Incidents</span></div></div>`:''}

    ${MG.tab==='rooms'?`
    <div class="card rooms360"><div class="ttl">Room 360° — everything about one room</div><div class="sub">Tap a room, or type a number, to see its cleaning history, maintenance jobs, reception requests and incidents in one place.</div>
      <div class="row" style="margin-top:8px"><input class="inp" id="r360-q" inputmode="numeric" placeholder="Room number or suite" onkeydown="if(event.key==='Enter')HP.MANAGE.room360(this.value)"><button class="btn sm" onclick="HP.MANAGE.room360(document.getElementById('r360-q').value)">Open</button></div>
      <div class="rgrid" style="margin-top:10px">${(()=>{ let rooms=[]; try{ rooms=HH.defaultRooms(); }catch(e){} const today=(HP.HOUSE&&HP.HOUSE.rooms)||[]; return rooms.map(r=>{ const tr=today.find(x=>String(x.room)===String(r.room)); const oj=open.some(j=>String(j.room)===String(r.room)); const cls=tr?(tr.status==='done'?'done':tr.status==='in_progress'?'ip':tr.status==='blocked'?'blk':''):''; return `<button class="${cls}" style="${oj?'box-shadow:inset 0 0 0 2px #EA7A1E':''}" onclick="HP.MANAGE.room360('${r.room}')">${r.room}</button>`; }).join(''); })()}</div>
      <div class="legend" style="margin-top:8px"><span><i style="background:#ecf6f0;border:1px solid #bfe0cc"></i>Cleaned today</span><span><i style="background:#e6f4f7;border:1px solid #a9d6e0"></i>In progress</span><span><i style="background:#fdecea;border:1px solid #f3b0a8"></i>Couldn't start</span><span><i style="background:#fff;border:2px solid #EA7A1E"></i>Open fault</span></div></div>
    <div id="r360-out"></div>`:''}
  </div>${HP.homeNav('manage')}`;
  if(MG.tab==='rooms'&&MG.lastRoom) room360(MG.lastRoom);
}});
function tab(t){ MG.tab=t; refresh(); }
async function room360(room){
  room=String(room||'').trim().replace(/^room\s*/i,''); if(!room) return; MG.lastRoom=room;
  const out=$('r360-out'); if(!out) return; out.innerHTML='<div class="empty">Loading room '+esc(room)+'…</div>';
  const jobs=(HP.FIX?HP.FIX.jobs():[]).filter(j=>String(j.room||'')===room||String(j.location||'').toLowerCase()===('room '+room).toLowerCase()||String(j.location||'').toLowerCase()===room.toLowerCase());
  const reqs=((HP.REC&&HP.REC.data.requests)||[]).filter(x=>String(x.room||'')===room);
  const incs=((HP.REC&&HP.REC.data.incidents)||[]).filter(x=>new RegExp('\\b(room\\s*)?'+room.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test((x.where||'')+' '+(x.who||'')));
  let hist=[]; try{ hist=await HP.Store.query('hoshouse_rooms', q=>q.where('room','==',room)); }catch(e){}
  hist.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const info=(window.HH?HH.roomInfo(room):{})||{};
  const done=hist.filter(r=>r.status==='done'); const avg=done.length?Math.round(done.reduce((t,r)=>t+(r.durationSec||0),0)/done.length/60):0;
  const openJobs=jobs.filter(j=>!['complete','cancelled'].includes(j.status));
  out.innerHTML=`<div class="card"><div class="row"><div class="grow"><div class="ttl" style="font-size:18px">Room ${esc(room)}</div><div class="sub">${esc(window.HH&&info.cat?HH.catLabel(info.cat):'')}${info.floor?' · '+esc(HH.floorLabel(info.floor))+' floor':''}</div></div>${openJobs.length?`<span class="pill urgent">${openJobs.length} open fault${openJobs.length>1?'s':''}</span>`:'<span class="pill co">No open faults</span>'}</div>
      <div class="stats" style="margin-top:10px"><div class="stat"><div class="n">${done.length}</div><div class="l">Cleans logged</div></div><div class="stat"><div class="n">${avg||'—'}</div><div class="l">Avg mins</div></div><div class="stat"><div class="n">${jobs.length}</div><div class="l">Faults ever</div></div></div>
      <div class="btnrow"><button class="btn sm fix" style="flex:1" onclick="HP.FIX.newJob({room:'${esc(room)}',source:'HosPRO'})">🔧 Report fault</button><button class="btn sm house" style="flex:1" onclick="HP.HOUSE.room('${esc(room)}')">🧹 Today's status</button></div></div>
    <div class="sect">Maintenance history</div>${jobs.slice(0,10).map(j=>`<div class="card tap" onclick="HP.go('fix/job',{id:'${esc(j.id)}'})"><div class="row"><div class="grow"><div class="ttl" style="font-size:14px">${esc((j.description||'').split('\n')[0].slice(0,80))}</div><div class="sub">${esc(fmtDate(j.createdAt))} · ${esc(j.source||'')} · ${esc(j.reportedBy||'')}${j.completedAt?' · fixed '+esc(fmtDate(j.completedAt))+' by '+esc(j.completedBy||''):''}</div></div><span class="pill ${j.status==='complete'?'co':j.status==='cancelled'?'ca':j.status==='in-progress'?'ip':j.status==='pending_approval'?'pa':'ns'}">${esc(HP.FIX.STATUS_LABEL[j.status]||j.status)}</span></div></div>`).join('')||'<div class="card sub">No maintenance jobs recorded for this room.</div>'}
    <div class="sect">Cleaning history <span class="r">last ${Math.min(hist.length,14)}</span></div>${hist.slice(0,14).map(r=>`<div class="card" style="padding:9px 12px"><div class="row"><div class="grow"><div class="ttl" style="font-size:14px">${esc(fmtDate(r.date,{weekday:'short',day:'numeric',month:'short'}))} · <span class="pill ${r.type==='Stayover'?'stay':r.type==='Arrival-ready'?'arr':'dep'}">${esc(r.type||'')}</span></div><div class="sub">${esc(r.housekeeperName||'Unallocated')}${r.status==='done'?' · '+Math.round((r.durationSec||0)/60)+' min':''}${r.maintenance?' · 🔧 '+esc(r.maintenance.slice(0,50)):''}${r.lostProperty?' · 🧳 '+esc(r.lostProperty.slice(0,40)):''}${r.replaced?' · '+esc(r.replaced):''}${r.notes?' · '+esc(r.notes.slice(0,50)):''}</div></div><span class="pill ${r.status==='done'?'co':r.status==='in_progress'?'ip':r.status==='blocked'?'urgent':'ns'}">${r.status==='done'?'Done':r.status==='in_progress'?'In progress':r.status==='blocked'?"Can't start":'Pending'}</span></div></div>`).join('')||'<div class="card sub">No cleaning records yet for this room.</div>'}
    ${reqs.length?`<div class="sect">Reception requests</div>${reqs.slice(0,8).map(x=>`<div class="card tap" style="padding:9px 12px" onclick="HP.REC.reqOpen('${esc(x.id)}')"><div class="row"><div class="grow"><div class="ttl" style="font-size:14px">${esc(x.title||'')}</div><div class="sub">${esc(fmtDT(x.at))} · ${esc(x.by||'')}</div></div><span class="pill ${x.status==='open'?'pa':'co'}">${x.status==='open'?'Open':'Done'}</span></div></div>`).join('')}`:''}
    ${incs.length?`<div class="sect">Incidents</div>${incs.slice(0,8).map(x=>`<div class="card tap" style="padding:9px 12px" onclick="HP.REC.incOpen('${esc(x.id)}')"><div class="ttl" style="font-size:14px">${esc(x.typeLabel||'Incident')}</div><div class="sub">${esc(x.when?x.when.replace('T',' '):fmtDT(x.at))} · ${esc((x.description||'').slice(0,80))}</div></div>`).join('')}`:''}`;
  window.scrollTo({top:document.getElementById('r360-out').offsetTop-70,behavior:'smooth'});
}
['hp:house','hp:fix','hp:rec','hp:fb','hp:sales'].forEach(ev=>document.addEventListener(ev,()=>{ if(location.hash==='#manage'||location.hash==='#home') refresh(); }));

/* home feed — a short "needs attention" list for everyone, scoped to what they can open */
document.addEventListener('hp:home',e=>{
  const box=e.detail.el; if(!box) return;
  const s=snapshot(); const A=attention(s).filter(a=>{ const m=(a.go.match(/HP\.go\('([a-z]+)/)||[])[1]||(a.go.indexOf('HP.REC')===0?'rec':a.go.indexOf('HP.SALES')===0?'sales':a.go.indexOf('HP.FIX')===0?'fix':''); return !m||HP.canOpen(m); });
  if(!A.length) return;
  box.innerHTML=`<div class="sect">Needs attention</div>`+A.slice(0,5).map(a=>`<div class="card tap" style="padding:10px 12px;border-left:4px solid ${a.lvl==='bad'?'var(--red)':a.lvl==='warn'?'var(--amber)':'var(--rec)'}" onclick="${a.go}"><div class="row"><span style="display:inline-grid;place-items:center;width:22px;color:var(--navy)">${HP.icon(a.icon,19)}</span><div class="grow" style="font-size:14px;font-weight:700">${esc(a.text)}</div><span class="sub">›</span></div></div>`).join('');
});

function printReport(){
  const s=snapshot(); const t=new Date();
  const jobs=HP.FIX?HP.FIX.jobs():[]; const open=jobs.filter(j=>!['complete','cancelled'].includes(j.status));
  const rooms=(HP.HOUSE&&HP.HOUSE.rooms)||[]; const RD=(HP.REC&&HP.REC.data)||{requests:[],incidents:[],fire:[]};
  const li=a=>a.length?'<ul>'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="m">None</p>';
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Daily operations report — Brandon Hall</title><style>@page{size:A4 landscape;margin:14mm}body{font:11px/1.45 Aptos,Segoe UI,Arial,sans-serif;color:#1f2a37;margin:0}h1{font-size:16px;color:#1F3864;margin:0}h2{font-size:14px;color:#1F3864;margin:14px 0 6px;border-bottom:2px solid #1F3864;padding-bottom:3px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1F3864;padding-bottom:8px}.hd img{height:48px}.g{display:grid;grid-template-columns:1fr 1fr;gap:18px}.k{display:flex;gap:8px;margin:6px 0}.k div{flex:1;border:1px solid #dfe4ea;border-radius:8px;padding:6px;text-align:center}.k b{display:block;font-size:18px;color:#1F3864}ul{margin:4px 0 0 16px;padding:0}.m{color:#6b7280;margin:4px 0}.foot{margin-top:14px;font-size:9px;color:#6b7280}</style></head><body>
  <div class="hd"><div><h1>Daily operations report</h1><div>Brandon Hall Hotel &amp; Spa · ${esc(t.toLocaleString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}))} · prepared by ${esc(HP.ME.name)}</div></div><img src="assets/logos/logo---blue-transparent.png" onerror="this.style.display='none'"></div>
  <div class="g"><div>
    <h2>Housekeeping</h2><div class="k"><div><b>${s.hk.done}/${s.hk.total}</b>Rooms done</div><div><b>${s.hk.ip}</b>In progress</div><div><b>${s.hk.blocked.length}</b>Couldn't start</div><div><b>${s.hk.lost}</b>Lost property</div></div>
    <p><b>Couldn't start:</b></p>${li(s.hk.blocked.map(r=>'Room '+r.room+(r.replaced?' — '+r.replaced:'')))}
    <p><b>Maintenance noted in rooms:</b></p>${li(rooms.filter(r=>r.maintenance).map(r=>'Room '+r.room+' — '+r.maintenance+(r.maintStatus==='complete'?' (fixed)':r.maintJobId?' (job raised)':' (no job yet)')))}
    <h2>Maintenance</h2><div class="k"><div><b>${s.fx.urgent.length}</b>Urgent</div><div><b>${s.fx.open.length}</b>Open</div><div><b>${s.fx.approval.length}</b>To approve</div><div><b>${s.fx.doneToday}</b>Done today</div><div><b>${gbp(s.fx.costMonth)}</b>Costs (month)</div></div>
    ${li(open.slice(0,25).map(j=>(j.priority||'').toUpperCase()+' · '+(j.location||'')+' — '+(j.description||'').split('\n')[0].slice(0,70)+' · '+(HP.FIX.STATUS_LABEL[j.status]||j.status)+' · '+(j.assignees||[]).map(a=>HP.Users.nameOf(a).split(' ')[0]).join(', ')))}
  </div><div>
    <h2>Reception</h2><div class="k"><div><b>${s.rec.open.length}</b>Open requests</div><div><b>${s.rec.incidentsOpen.length}</b>Open incidents</div><div><b>${s.rec.testAge==null?'—':s.rec.testAge+'d'}</b>Since alarm test</div><div><b>${s.rec.activationsMonth}</b>Activations (month)</div></div>
    <p><b>Open requests:</b></p>${li(s.rec.open.map(x=>(x.room?'Room '+x.room+' · ':'')+x.title+(x.urgent?' (URGENT)':'')+' · '+x.by))}
    <p><b>Open incidents:</b></p>${li(s.rec.incidentsOpen.map(x=>(x.typeLabel||'Incident')+(x.where?' at '+x.where:'')+' · '+x.description.slice(0,80)))}
    <p><b>Fire records (latest):</b></p>${li(RD.fire.slice(0,5).map(f=>(f.kindLabel||f.kind)+' · '+(f.when?f.when.replace('T',' '):'')+(f.callPoint?' · '+f.callPoint:'')+(f.zone?' · '+f.zone:'')+(f.kind==='test'?(f.ok===false?' · FAILED':' · passed'):'')))}
    ${s.fb?`<h2>Food &amp; Beverage</h2><div class="k"><div><b>${s.fb.today.n?gbp(s.fb.today.t):'—'}</b>Today's sales</div><div><b>${s.fb.today.fc+s.fb.today.dc||'—'}</b>Covers</div><div><b>${gbp(s.fb.week.t)}</b>Last 7 days</div><div><b>${s.fb.checks.length}/2</b>Daily checks</div></div>`:''}
    <h2>Sales &amp; Events</h2>${s.sales.auth===false?'<p class="m">Pipeline not available without a portal login.</p>':`<div class="k"><div><b>${s.sales.open}</b>Open enquiries</div><div><b>${s.sales.overdue}</b>Overdue follow-ups</div><div><b>${gbp(s.sales.pipeline)}</b>Pipeline value</div><div><b>${s.sales.confirmedUpcoming}</b>Confirmed ahead</div><div><b>${s.sales.newMonth}</b>New this month</div></div>`}
  </div></div>
  <div class="foot">HosPRO Mobile · Brandon Hall Hotel &amp; Spa · ${esc(todayISO())}</div><script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script></body></html>`;
  const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print'); return; } w.document.write(html); w.document.close();
}
HP.MANAGE={ snapshot, attention, printReport, tab, room360, loadHistory };
})();
