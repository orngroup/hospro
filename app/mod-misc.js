/* ============================================================
   HosPRO Mobile — Fire Safety, Compliance and My Rota modules
   Fire: alarm tests / drills / activations logged in hosrec_fire
   (shared with Reception) + the full HosFIRE checks app in a frame.
   Compliance: scheduled tasks live in FixRay; the old HosFIX
   compliance screens stay reachable as a fallback.
   Rota: the published rota page (my-rota.html) in a frame.
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,toast,registerView,go,refresh,topbar,bnav,openFrame,fmtDate}=HP;

function daysSince(rec){ return rec?Math.floor((Date.now()-new Date(rec.when?rec.when:rec.at))/864e5):null; }
registerView('fire',{ render(el){
  const F=(HP.REC&&HP.REC.data.fire)||[];
  const lastTest=F.find(f=>f.kind==='test'), lastDrill=F.find(f=>f.kind==='drill'), lastAct=F.find(f=>f.kind==='activation');
  const dt=daysSince(lastTest), dd=daysSince(lastDrill);
  const month=todayISO().slice(0,7); const acts=F.filter(f=>f.kind==='activation'&&String(f.date||'').slice(0,7)===month).length;
  const tests=F.filter(f=>f.kind==='test').slice(0,12);
  el.innerHTML=topbar({mod:'fire',title:'Fire Safety',sub:'Tests, drills & checks',action:{label:'HosFIRE app ↗',onclick:"HP.MISC.hosfire()"}})+`<div class="wrap">
    <div class="stats"><div class="stat ${dt==null||dt>7?'bad':'good'}"><div class="n">${dt==null?'—':dt+'d'}</div><div class="l">Since alarm test</div></div><div class="stat ${dd==null||dd>182?'bad':dd>150?'warn':'good'}"><div class="n">${dd==null?'—':dd+'d'}</div><div class="l">Since drill</div></div><div class="stat ${acts?'warn':'good'}"><div class="n">${acts}</div><div class="l">Activations this month</div></div></div>
    ${dt==null||dt>7?`<div class="note bad">Weekly alarm test is due. Test a different call point each week and log it here.</div>`:''}
    ${dd==null||dd>182?`<div class="note">Evacuation drills should run at least every six months${lastDrill?' — last one '+esc(fmtDate(lastDrill.when||lastDrill.at,{day:'numeric',month:'short',year:'numeric'})):' — none logged yet'}.</div>`:''}
    <div class="modgrid">
      <button class="tile" onclick="HP.REC.fireSheet('test')"><span class="ic" style="background:var(--fire)">🔔</span><div><div class="nm">Log alarm test</div><div class="ds">Weekly call-point test</div></div></button>
      <button class="tile" onclick="HP.REC.fireSheet('drill')"><span class="ic" style="background:#c45c00">🏃</span><div><div class="nm">Log a drill</div><div class="ds">Evacuation & roll call</div></div></button>
      <button class="tile" onclick="HP.REC.fireSheet('activation')"><span class="ic" style="background:#8b2e2e">🚨</span><div><div class="nm">Alarm activation</div><div class="ds">Cause, evacuation, brigade</div></div></button>
      <button class="tile" onclick="HP.REC.fireSheet('check')"><span class="ic" style="background:var(--ok)">✅</span><div><div class="nm">Safety check</div><div class="ds">Doors, extinguishers, lighting</div></div></button>
    </div>
    <div class="sect">Call points tested recently</div>
    <div class="card"><div class="chips">${tests.map(t=>`<span class="qchip ${t.ok===false?'':'on'}" style="${t.ok===false?'border-color:var(--red);color:var(--red)':''}">${esc(t.callPoint||t.zone||'?')} <b>${esc(fmtDate(t.when||t.at,{day:'numeric',month:'short'}))}</b></span>`).join('')||'<span class="sub">No tests logged yet.</span>'}</div><div class="sub">Rotate through every call point so each is tested in turn.</div></div>
    <div class="sect">All records</div>
    ${F.slice(0,40).map(HP.REC.fireCard).join('')||'<div class="empty">Nothing logged yet.</div>'}
    <button class="btn ghost" onclick="HP.MISC.hosfire()">Open the HosFIRE checks app</button>
    <div class="sub" style="text-align:center;margin-top:6px">Fire risk assessment actions, registers and sign-offs live in HosFIRE.</div>
  </div>${bnav([{id:'fire',icon:'🔥',label:'Fire',onclick:"HP.go('fire')"},{id:'rec',icon:'🛎️',label:'Reception',onclick:"HP.go('rec')"},{id:'home',icon:'🏠',label:'Home',onclick:"HP.go('home')"}],'fire')}`;
}});
HP_MODULE_OPEN.fire=()=>go('fire');
function hosfire(){ openFrame({mod:'fire',title:'HosFIRE',sub:'Fire safety checks',url:'hosfire-mobile.html',openNew:true}); }

registerView('comp',{ render(el){
  const F=(HP.REC&&HP.REC.data.fire)||[]; const checks=F.filter(f=>f.kind==='check').slice(0,10);
  el.innerHTML=topbar({mod:'comp',title:'Compliance',sub:'Scheduled tasks & actions'})+`<div class="wrap">
    <div class="card"><div class="ttl">Scheduled maintenance &amp; compliance tasks</div><div class="sub">The 33 scheduled tasks (14 internal, 19 external contractors) run in FixRay — boiler service, gas safety, PAT, lifts, extract cleaning and the rest. Open it to tick off and evidence work.</div><a class="btn comp" style="display:block;text-align:center;text-decoration:none;background:var(--comp)" href="https://fixray.app" target="_blank" rel="noopener">Open FixRay ↗</a></div>
    <div class="card"><div class="ttl">Fire safety</div><div class="sub">Weekly alarm tests, drills and checks are logged in the Fire Safety module.</div><button class="btn ghost" onclick="HP.go('fire')">Fire Safety ›</button></div>
    ${checks.length?`<div class="sect">Recent safety checks</div>${checks.map(HP.REC.fireCard).join('')}`:''}
    ${HP.isAdmin()?`<div class="card"><div class="ttl">Previous compliance screens</div><div class="sub">The old HosFIX compliance tasks and actions (kept as a fallback).</div><button class="btn ghost" onclick="HP.MISC.oldFix()">Open old HosFIX app</button></div>`:''}
  </div>${bnav([{id:'comp',icon:'📋',label:'Compliance',onclick:"HP.go('comp')"},{id:'fire',icon:'🔥',label:'Fire',onclick:"HP.go('fire')"},{id:'home',icon:'🏠',label:'Home',onclick:"HP.go('home')"}],'comp')}`;
}});
function oldFix(){ const u=HP.ME; openFrame({mod:'fix',title:'HosFIX (previous app)',sub:u.name,url:'hosmain.html'+(u.fixId?'?u='+encodeURIComponent(u.fixId):''),openNew:true}); }

HP_MODULE_OPEN.rota=()=>{ openFrame({title:'My Rota',sub:'Published rota · '+HP.ME.name,url:'my-rota.html',openNew:true}); };

HP.MISC={ hosfire, oldFix };
})();
