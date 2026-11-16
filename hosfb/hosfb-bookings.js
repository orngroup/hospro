/* HosF&B — table bookings and pre-orders (staff side).
   Bookings: hosfb_bookings/{ref} — guests create them on book.html; only signed-in staff can read.
   Public availability count: hosfb/availability { days: { date: { time: covers } } }.
   Booking rules (times, capacity) live in hosfb/settings.booking. */
(function(){
addTab('bookings','Bookings',vBookings);
const K={date:today(),list:null,auth:null,unsub:null,watching:''};
const STAT={booked:'Booked',seated:'Seated',done:'Finished',cancelled:'Cancelled','no-show':'No-show'};
const live=b=>b.status!=='cancelled'&&b.status!=='no-show';
const col=()=>db.collection('hosfb_bookings');
async function watch(){ if(K.watching===K.date) return; K.watching=K.date; K.list=null;
  if(K.auth===null) K.auth=db?await hosfbStaffAuth():false;
  if(!K.auth){ if(tab==='bookings') render(); return; }
  if(K.unsub) K.unsub(); const d=K.date;
  K.unsub=col().where('date','==',d).onSnapshot(q=>{ if(K.date!==d) return; K.list=q.docs.map(x=>x.data()).sort((a,b)=>String(a.time).localeCompare(String(b.time))); if(tab==='bookings'&&!$('modal').classList.contains('on')) render(); },e=>{ console.warn('bookings',e.code); K.auth=false; if(tab==='bookings') render(); }); }
async function adj(date,time,delta){ if(!delta||!date||!time) return; try{ await db.collection('hosfb').doc('availability').set({days:{[date]:{[time]:firebase.firestore.FieldValue.increment(delta)}}},{merge:true}); }catch(e){ console.warn('availability',e.code); } }
function vBookings(){
  watch(); const cfg=C.bookCfg(S.settings);
  let h=`<div class="card"><div class="row" style="margin:0"><button class="btn ghost sm" onclick="bkDay(-1)">◀</button><input type="date" style="max-width:190px" value="${K.date}" onchange="if(this.value){bkGo(this.value)}"><button class="btn ghost sm" onclick="bkDay(1)">▶</button><button class="btn ghost sm" onclick="bkGo('${today()}')">Today</button><div class="grow"></div>
   <button class="btn ghost" onclick="bkSettings()">Booking settings</button><button class="btn" onclick="bkEdit()">New booking</button></div></div>`;
  if(K.auth===false) return h+`<div class="card"><h2>Bookings need one more set-up step</h2><p class="sub">Guest bookings hold names, phone numbers and allergies, so the database only shows them to signed-in staff. Add the HosF&amp;B service login in Firebase (Authentication → Users → Add user) and publish the new rules – both are in the rules document. Then reload this page.</p></div>`;
  if(!K.list) return h+'<div class="card"><p class="muted">Loading…</p></div>';
  const l=K.list, on=l.filter(live), cov=on.reduce((t,b)=>t+(b.covers||0),0), pre=on.filter(b=>(b.preorder||[]).length), alg=on.filter(b=>b.allergies);
  h+=`<div class="tiles"><div class="tile"><div class="l">${fmtDate(K.date)}</div><div class="v">${on.length} ${on.length===1?'booking':'bookings'}</div><div class="d">${cov} ${cov===1?'guest':'guests'}</div></div>
   <div class="tile"><div class="l">Pre-orders</div><div class="v">${pre.length}</div><div class="d">${pre.length?'<a href="#" onclick="bkChef();return false">Open the chef\'s sheet</a>':'None yet'}</div></div>
   <div class="tile"><div class="l">Allergies flagged</div><div class="v ${alg.length?'bad':''}">${alg.length}</div><div class="d">Shown on the order pad and kitchen screen</div></div>
   <div class="tile"><div class="l">Online booking</div><div class="v ${cfg.on?'good':'warn'}">${cfg.on?'On':'Off'}</div><div class="d">Up to ${cfg.maxPerSlot} guests every ${cfg.slotMins} minutes</div></div></div>
  <div class="card"><div class="scroll"><table><tr><th>Time</th><th>Guest</th><th class="n">Guests</th><th>Table</th><th>Occasion</th><th>Allergies and requests</th><th>Pre-order</th><th>Status</th></tr>
  ${l.map(b=>`<tr class="click" onclick="bkEdit('${b.ref}')" style="${live(b)?'':'opacity:.5'}"><td><strong>${esc(b.time)}</strong></td><td>${esc(b.name)}<br><span class="muted small">${esc(b.ref)} · ${b.source==='web'?'Online':'By phone'}</span></td><td class="n">${b.covers}</td><td>${esc(b.table||'–')}</td><td>${esc(b.occasion||'')}</td>
    <td>${b.allergies?`<span class="bad"><strong>Allergy:</strong> ${esc(b.allergies)}</span><br>`:''}${esc(b.requests||'')}</td><td>${(b.preorder||[]).length?(n=>n+(n===1?' dish':' dishes'))(b.preorder.reduce((t,x)=>t+x.qty,0)):'–'}</td><td><span class="pill ${b.status==='booked'?'good':b.status==='seated'?'warn':''}">${STAT[b.status]||b.status}</span></td></tr>`).join('')||'<tr><td colspan="8" class="muted">No bookings for this day.</td></tr>'}</table></div>
  <p class="muted small" style="margin-top:10px">Guests book at <strong>brandon.hospro.co.uk/hosfb/book.html</strong>. Link to it or embed it on the website's dining page.</p></div>`;
  return h;
}
window.bkGo=d=>{ K.date=d; render(); }; window.bkDay=n=>bkGo(addDays(K.date,n));
window.bkEdit=function(ref){ const cfg=C.bookCfg(S.settings);
  const b=ref?JSON.parse(JSON.stringify(K.list.find(x=>x.ref===ref))):{ref:'',date:K.date,time:'',covers:2,name:'',email:'',phone:'',occasion:'',allergies:'',requests:'',preorder:[],status:'booked',source:'phone',table:'',_new:true}; draft=b; b.preorder=b.preorder||[];
  const slots=[...new Set([...C.bookingSlots(cfg,b.date).map(s=>s.time),b.time].filter(Boolean))].sort();
  openSheet(`<h2>${b._new?'New booking':esc(b.name)+' · '+esc(b.ref)}</h2><div class="fg">
   <label>Date<input id="k-date" type="date" value="${esc(b.date)}"></label><label>Time<input id="k-time" list="k-slots" value="${esc(b.time)}" placeholder="19:00"><datalist id="k-slots">${slots.map(s=>`<option>${s}`).join('')}</datalist></label>
   <label>Guests<input id="k-cov" type="number" min="1" value="${b.covers}"></label><label>Table<input id="k-table" value="${esc(b.table||'')}"></label>
   <label>Name<input id="k-name" value="${esc(b.name)}"></label><label>Telephone<input id="k-phone" type="tel" value="${esc(b.phone||'')}"></label>
   <label>Email<input id="k-email" type="email" value="${esc(b.email||'')}"></label><label>Occasion<input id="k-occ" list="k-occs" value="${esc(b.occasion||'')}"><datalist id="k-occs">${['Birthday','Anniversary','Engagement','Celebration','Business meal'].map(o=>`<option>${o}`).join('')}</datalist></label>
   <label class="full">Allergies or dietary requirements<textarea id="k-alg">${esc(b.allergies||'')}</textarea></label><label class="full">Other requests<textarea id="k-req">${esc(b.requests||'')}</textarea></label>
   <label>Status<select id="k-status">${Object.keys(STAT).map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${STAT[s]}</option>`).join('')}</select></label></div>
   <h3>Pre-order</h3><div id="k-pre"></div><button class="btn ghost sm" style="margin-top:8px" onclick="bkPreAdd()">Add a dish</button>
   <div class="foot"><div>${b._new?'':`<button class="btn danger" onclick="bkDelete('${b.ref}')">Delete</button>`}</div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" onclick="bkSave()">Save</button></div></div>`);
  bkPreUI(); };
window.bkPreAdd=function(){ const ds=dishes(); if(!ds.length) return; draft.preorder.push({dishId:ds[0].id,name:ds[0].name,course:ds[0].course||'',qty:1}); bkPreUI(); };
window.bkPreUI=function(){ const ds=dishes(); $('k-pre').innerHTML=draft.preorder.length?`<table>${draft.preorder.map((l,i)=>`<tr><td><select onchange="bkPreSet(${i},this.value)">${S.dishes[l.dishId]?'':`<option selected>${esc(l.name)}</option>`}${ds.map(d=>`<option value="${d.id}" ${d.id===l.dishId?'selected':''}>${esc(d.name)}</option>`).join('')}</select></td><td style="width:90px"><input type="number" min="1" value="${l.qty}" oninput="draft.preorder[${i}].qty=num(this.value)||1"></td><td style="width:50px"><button class="btn ghost sm" onclick="draft.preorder.splice(${i},1);bkPreUI()">✕</button></td></tr>`).join('')}</table>`:'<p class="muted small">No pre-order.</p>'; };
window.bkPreSet=function(i,id){ const d=S.dishes[id]; if(d) Object.assign(draft.preorder[i],{dishId:id,name:d.name,course:d.course||''}); };
window.bkSave=async function(){ const b=draft, was=b._new?null:K.list.find(x=>x.ref===b.ref);
  Object.assign(b,{date:$('k-date').value,time:$('k-time').value.trim(),covers:num($('k-cov').value)||1,table:$('k-table').value.trim(),name:$('k-name').value.trim(),phone:$('k-phone').value.trim(),email:$('k-email').value.trim(),occasion:$('k-occ').value.trim(),allergies:$('k-alg').value.trim(),requests:$('k-req').value.trim(),status:$('k-status').value});
  if(!b.name||!b.date||!/^\d{1,2}:\d{2}$/.test(b.time)){ alert('Add the guest name, the date and a time such as 19:00.'); return; } b.time=b.time.padStart(5,'0');
  if(b._new){ b.ref='BH'+Math.random().toString(36).slice(2,6).toUpperCase()+String(Date.now()).slice(-2); b.createdAt=new Date().toISOString(); b.createdBy=me.name; delete b._new; }
  b.updatedAt=new Date().toISOString(); b.updatedBy=me.name;
  try{ await col().doc(b.ref).set(b); if(was&&live(was)) await adj(was.date,was.time,-(was.covers||0)); if(live(b)) await adj(b.date,b.time,b.covers); }catch(e){ alert('Could not save the booking ('+(e.code||e.message)+').'); return; }
  if(b.date!==K.date) K.date=b.date; closeSheet(); };
window.bkDelete=async function(ref){ if(!confirm('Delete this booking completely? To keep a record, set its status to Cancelled instead.')) return; const was=K.list.find(x=>x.ref===ref);
  try{ await col().doc(ref).delete(); if(was&&live(was)) await adj(was.date,was.time,-(was.covers||0)); }catch(e){ alert('Could not delete ('+(e.code||e.message)+').'); } closeSheet(); };
window.bkChef=function(){ const on=K.list.filter(live), tot=C.preorderTotals(on), pre=on.filter(b=>(b.preorder||[]).length); let sec=null;
  openSheet(`<h2>Chef's sheet · ${fmtDate(K.date)}</h2><p class="sub">Bookings: ${on.length}. Guests: ${on.reduce((t,b)=>t+(b.covers||0),0)}. Bookings with a pre-order: ${pre.length}.</p>
   <h3>Pre-ordered dishes in total</h3><table>${tot.map(t=>{ let r=''; if(t.course!==sec){ sec=t.course; r=`<tr class="sec"><td colspan="2">${esc(sec||'Other')}</td></tr>`; } return r+`<tr><td>${esc(t.name)}</td><td class="n"><strong>${t.qty}</strong></td></tr>`; }).join('')||'<tr><td class="muted">No pre-orders.</td></tr>'}</table>
   <h3>By booking</h3><table>${on.map(b=>`<tr><td style="width:70px"><strong>${esc(b.time)}</strong></td><td>${esc(b.name)} · ${b.covers} guests${b.table?' · table '+esc(b.table):''}${b.occasion?' · '+esc(b.occasion):''}${b.allergies?`<br><span class="bad"><strong>Allergy:</strong> ${esc(b.allergies)}</span>`:''}${b.requests?'<br>'+esc(b.requests):''}${(b.preorder||[]).length?'<br><span class="muted">'+b.preorder.map(l=>l.qty+' × '+esc(l.name)).join(', ')+'</span>':''}</td></tr>`).join('')}</table>
   <div class="foot"><button class="btn ghost" onclick="window.print()">Print</button><button class="btn" onclick="closeSheet()">Close</button></div>`); };
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
window.bkSettings=function(){ const c=JSON.parse(JSON.stringify(C.bookCfg(S.settings))); draft=c;
  openSheet(`<h2>Booking settings</h2><p class="sub">These decide which times guests are offered on the booking page. Check them against your real opening times before sharing the booking link.</p>
   <div class="fg"><label>Online booking<select id="bs-on"><option value="1" ${c.on?'selected':''}>On</option><option value="0" ${c.on?'':'selected'}>Off (guests are asked to telephone)</option></select></label>
   <label>A table time every (minutes)<input id="bs-step" type="number" min="5" value="${c.slotMins}"></label><label>Most guests arriving at one time<input id="bs-max" type="number" min="1" value="${c.maxPerSlot}"></label>
   <label>Largest party online<input id="bs-party" type="number" min="1" value="${c.maxParty}"></label><label>Stop taking bookings this many hours before<input id="bs-lead" type="number" min="0" step="0.5" value="${c.leadHours}"></label>
   <label>Take bookings up to this many days ahead<input id="bs-ahead" type="number" min="1" value="${c.daysAhead}"></label>
   <label>Pre-ordering<select id="bs-pre"><option value="1" ${c.preorder?'selected':''}>Offered</option><option value="0" ${c.preorder?'':'selected'}>Not offered</option></select></label>
   <label>Email a copy of each online booking to (optional)<input id="bs-mail" type="email" value="${esc(c.notifyEmail||'')}" placeholder="reservations@…"></label>
   <label class="full">Closed dates (one a line, as 2026-12-25)<textarea id="bs-closed">${esc((c.closed||[]).join('\n'))}</textarea></label></div>
   <h3>Menus guests can pre-order from</h3><div class="alg">${menus().map(m=>`<label><input type="checkbox" name="bs-menu" value="${m.id}" ${!c.preorderMenus.length||c.preorderMenus.includes(m.id)?'checked':''}>${esc(m.name)}</label>`).join('')}</div>
   <h3>Services</h3><div id="bs-sv"></div><button class="btn ghost sm" style="margin-top:8px" onclick="draft.services.push({name:'',days:[],from:'18:00',to:'20:30'});bkSvUI()">Add a service</button>
   <div class="foot"><div></div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" onclick="bkSaveSettings()">Save</button></div></div>`); bkSvUI(); };
window.bkSvUI=function(){ $('bs-sv').innerHTML=draft.services.map((s,i)=>`<div class="card" style="padding:10px"><div class="fg" style="grid-template-columns:2fr 1fr 1fr auto"><input placeholder="Name, for example Dinner" value="${esc(s.name)}" oninput="draft.services[${i}].name=this.value"><input type="time" value="${esc(s.from)}" onchange="draft.services[${i}].from=this.value"><input type="time" value="${esc(s.to)}" onchange="draft.services[${i}].to=this.value"><button class="btn ghost sm" onclick="draft.services.splice(${i},1);bkSvUI()">✕</button></div>
   <div class="alg" style="margin-top:8px">${DAYS.map((d,n)=>`<label><input type="checkbox" ${s.days.includes(n)?'checked':''} onchange="bkSvDay(${i},${n},this.checked)">${d}</label>`).join('')}</div><span class="muted small">First and last table time</span></div>`).join(''); };
window.bkSvDay=(i,n,on)=>{ const s=draft.services[i]; s.days=on?[...new Set([...s.days,n])].sort():s.days.filter(x=>x!==n); };
window.bkSaveSettings=async function(){ const c=draft, all=menus().map(m=>m.id), pick=checked('bs-menu');
  Object.assign(c,{on:$('bs-on').value==='1',slotMins:num($('bs-step').value)||30,maxPerSlot:num($('bs-max').value)||1,maxParty:num($('bs-party').value)||10,leadHours:num($('bs-lead').value)||0,daysAhead:num($('bs-ahead').value)||90,preorder:$('bs-pre').value==='1',notifyEmail:$('bs-mail').value.trim(),
    closed:$('bs-closed').value.split(/\s+/).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)),preorderMenus:pick.length===all.length?[]:pick,services:c.services.filter(s=>s.name&&s.days.length)});
  S.settings.booking=c; Data.cache(); if(cloud){ try{ await db.collection('hosfb').doc('settings').update({booking:c}); }catch(e){ try{ await db.collection('hosfb').doc('settings').set({booking:c},{merge:true}); }catch(e2){ alert('Could not save ('+(e2.code||e2.message)+').'); } } } closeSheet(); };
})();
