/* ============================================================
   HosPRO Mobile — Manager / Director overview
   One screen across every department, drill-down to each module,
   and a printable daily operations report.
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,toast,registerView,go,refresh,topbar,bnav,gbp,fmtDate,fmtDT,ago,mmss}=HP;

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
  s.fx.urgent.forEach(j=>A.push({lvl:'bad',icon:'🔧',text:'Urgent: '+(j.location||'')+' — '+(j.description||'').split('\n')[0].slice(0,60),go:"HP.go('fix/job',{id:'"+j.id+"'})"}));
  if(s.fx.approval.length) A.push({lvl:'warn',icon:'💷',text:s.fx.approval.length+' maintenance job'+(s.fx.approval.length>1?'s':'')+' waiting for cost approval',go:"HP.FIX.setFilter('approval');HP.go('fix')"});
  s.hk.blocked.forEach(r=>A.push({lvl:'warn',icon:'🚪',text:'Room '+r.room+" couldn't be started"+(r.replaced?' — '+r.replaced:''),go:"HP.go('house')"}));
  if(s.hk.maint.length) A.push({lvl:'warn',icon:'🧹',text:s.hk.maint.length+' room'+(s.hk.maint.length>1?'s':'')+' with maintenance noted but no job raised',go:"HP.go('house')"});
  if(s.rec.testAge==null||s.rec.testAge>7) A.push({lvl:'bad',icon:'🔔',text:'Weekly fire alarm test '+(s.rec.testAge==null?'not logged':'overdue ('+s.rec.testAge+' days)'),go:"HP.go('fire')"});
  s.rec.incidentsOpen.slice(0,3).forEach(x=>A.push({lvl:'warn',icon:'🩹',text:'Open incident: '+(x.typeLabel||'')+(x.where?' at '+x.where:''),go:"HP.REC.incOpen('"+x.id+"')"}));
  s.rec.open.filter(x=>x.urgent).forEach(x=>A.push({lvl:'warn',icon:'🛎️',text:'Urgent request: '+(x.room?'Room '+x.room+' · ':'')+x.title,go:"HP.REC.reqOpen('"+x.id+"')"}));
  if(s.fb&&!s.fb.today.n&&new Date().getHours()>=22) A.push({lvl:'warn',icon:'🍽️',text:"Today's F&B figures not entered yet",go:"HP.go('fb')"});
  if(s.sales.overdue) A.push({lvl:'warn',icon:'📈',text:s.sales.overdue+' sales follow-up'+(s.sales.overdue>1?'s':'')+' overdue',go:"HP.SALES.filter('overdue');HP.go('sales')"});
  if(s.fx.stale.length) A.push({lvl:'info',icon:'⏳',text:s.fx.stale.length+' job'+(s.fx.stale.length>1?'s':'')+' not started after 3+ days',go:"HP.go('fix')"});
  return A;
}

registerView('manage',{ render(el){
  const s=snapshot(); const A=attention(s); const pct=s.hk.total?Math.round(s.hk.done/s.hk.total*100):0;
  el.innerHTML=topbar({title:'Overview',sub:esc(HP.ME.name)+' · '+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),action:{label:'Daily report',onclick:'HP.MANAGE.printReport()'}})+`<div class="wrap">
    <div class="sect">Needs attention <span class="r">${A.length?A.length+' item'+(A.length>1?'s':''):'all clear'}</span></div>
    ${A.length?A.slice(0,8).map(a=>`<div class="card tap" style="padding:10px 12px;border-left:4px solid ${a.lvl==='bad'?'var(--red)':a.lvl==='warn'?'var(--amber)':'var(--rec)'}" onclick="${a.go}"><div class="row"><span style="font-size:18px">${a.icon}</span><div class="grow" style="font-size:14px;font-weight:700">${esc(a.text)}</div><span class="sub">›</span></div></div>`).join(''):'<div class="note ok">Nothing urgent across the hotel right now.</div>'}

    <div class="sect">🧹 Housekeeping <span class="r" onclick="HP.go('house')">Open ›</span></div>
    <div class="card tap" onclick="HP.go('house')"><div class="row"><div class="grow"><div class="ttl">${s.hk.done} of ${s.hk.total} rooms done</div><div class="sub">${s.hk.ip} in progress · ${s.hk.blocked.length} couldn't start · ${s.hk.lost} lost property</div></div><span class="money">${pct}%</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>

    <div class="sect">🔧 Maintenance <span class="r" onclick="HP.go('fix')">Open ›</span></div>
    <div class="stats four" onclick="HP.go('fix')"><div class="stat ${s.fx.urgent.length?'bad':''}"><div class="n">${s.fx.urgent.length}</div><div class="l">Urgent</div></div><div class="stat"><div class="n">${s.fx.open.length}</div><div class="l">Open</div></div><div class="stat ${s.fx.approval.length?'warn':''}"><div class="n">${s.fx.approval.length}</div><div class="l">To approve</div></div><div class="stat good"><div class="n">${s.fx.doneToday}</div><div class="l">Done today</div></div></div>
    <div class="sub" style="margin:-4px 2px 8px">Costs logged this month: <b>${gbp(s.fx.costMonth)}</b> · ${s.fx.ip} in progress now</div>

    <div class="sect">🛎️ Reception <span class="r" onclick="HP.go('rec')">Open ›</span></div>
    <div class="stats four" onclick="HP.go('rec')"><div class="stat ${s.rec.open.length?'warn':'good'}"><div class="n">${s.rec.open.length}</div><div class="l">Open requests</div></div><div class="stat ${s.rec.incidentsOpen.length?'bad':'good'}"><div class="n">${s.rec.incidentsOpen.length}</div><div class="l">Open incidents</div></div><div class="stat ${s.rec.testAge==null||s.rec.testAge>7?'bad':'good'}"><div class="n">${s.rec.testAge==null?'—':s.rec.testAge+'d'}</div><div class="l">Since alarm test</div></div><div class="stat ${s.rec.activationsMonth?'warn':'good'}"><div class="n">${s.rec.activationsMonth}</div><div class="l">Alarm activations</div></div></div>

    ${s.fb?`<div class="sect">🍽️ Food &amp; Beverage <span class="r" onclick="HP.go('fb')">Open ›</span></div>
    <div class="stats four" onclick="HP.go('fb')"><div class="stat ${s.fb.today.n?'good':''}"><div class="n">${s.fb.today.n?gbp(s.fb.today.t).replace('.00',''):'—'}</div><div class="l">Today</div></div><div class="stat"><div class="n">${s.fb.today.fc+s.fb.today.dc||'—'}</div><div class="l">Covers</div></div><div class="stat"><div class="n">${gbp(s.fb.week.t).replace('.00','')}</div><div class="l">7 days</div></div><div class="stat ${s.fb.checks.length===2?'good':'warn'}"><div class="n">${s.fb.checks.length}/2</div><div class="l">Checks</div></div></div>`:''}

    <div class="sect">📈 Sales &amp; Events <span class="r" onclick="HP.go('sales')">Open ›</span></div>
    ${s.sales.auth===false?'<div class="note info">Sales pipeline needs your portal login — open the module for details.</div>':`<div class="stats four" onclick="HP.go('sales')"><div class="stat"><div class="n">${s.sales.open}</div><div class="l">Open</div></div><div class="stat ${s.sales.overdue?'bad':'good'}"><div class="n">${s.sales.overdue}</div><div class="l">Overdue</div></div><div class="stat"><div class="n">${gbp(s.sales.pipeline).replace('.00','')}</div><div class="l">Pipeline</div></div><div class="stat"><div class="n">${s.sales.confirmedUpcoming}</div><div class="l">Confirmed ahead</div></div></div>`}
    <button class="btn" onclick="HP.MANAGE.printReport()">📄 Daily operations report (PDF)</button>
  </div>${bnav([{id:'manage',icon:'📊',label:'Overview',onclick:"HP.go('manage')"},{id:'home',icon:'🏠',label:'Home',onclick:"HP.go('home')"},{id:'settings',icon:'⚙︎',label:'Settings',onclick:"HP.go('settings')"}],'manage')}`;
}});
['hp:house','hp:fix','hp:rec','hp:fb','hp:sales'].forEach(ev=>document.addEventListener(ev,()=>{ if(location.hash==='#manage'||location.hash==='#home') refresh(); }));

/* home feed — a short "needs attention" list for everyone, scoped to what they can open */
document.addEventListener('hp:home',e=>{
  const box=e.detail.el; if(!box) return;
  const s=snapshot(); const A=attention(s).filter(a=>{ const m=(a.go.match(/HP\.go\('([a-z]+)/)||[])[1]||(a.go.indexOf('HP.REC')===0?'rec':a.go.indexOf('HP.SALES')===0?'sales':a.go.indexOf('HP.FIX')===0?'fix':''); return !m||HP.canOpen(m); });
  if(!A.length) return;
  box.innerHTML=`<div class="sect">Needs attention</div>`+A.slice(0,5).map(a=>`<div class="card tap" style="padding:10px 12px;border-left:4px solid ${a.lvl==='bad'?'var(--red)':a.lvl==='warn'?'var(--amber)':'var(--rec)'}" onclick="${a.go}"><div class="row"><span style="font-size:18px">${a.icon}</span><div class="grow" style="font-size:14px;font-weight:700">${esc(a.text)}</div><span class="sub">›</span></div></div>`).join('');
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
HP.MANAGE={ snapshot, attention, printReport };
})();
