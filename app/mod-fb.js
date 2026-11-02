/* ============================================================
   HosPRO Mobile — Food & Beverage module
   Daily figures → fb_submissions (same shape as fb-entry.html, so the
   desktop F&B tracker picks them up unchanged) + fb_daily (readable copy)
   Daily checks → fb_checks (fridge temps, opening/closing sign-off)
   Menus → fb_menus (items & 86'd list) + the published menu PDFs
   Faults → HosFIX jobs in the Food & Beverage area
   ============================================================ */
(function(){
"use strict";
const {$,esc,todayISO,nowISO,toast,sheet,closeSheet,registerView,go,refresh,topbar,bnav,setBadge,Store,gbp,fmtDate,fmtDT,ago,uid}=HP;

const LINES=[{id:'breakfast',name:'Breakfast',outlet:'The Clarendon Restaurant'},{id:'lunch',name:'Lunch',outlet:'The Clarendon Restaurant'},{id:'aftertea',name:'Afternoon tea',outlet:'The Clarendon Restaurant'},{id:'dinner',name:'Dinner',outlet:'The Clarendon Restaurant'},{id:'bar',name:'Bar & lounge',outlet:'The Clarendon Bar'},{id:'roomservice',name:'Room service',outlet:'Room service'},{id:'banqueting',name:'Banqueting & events',outlet:'Events'},{id:'spa',name:'Spa café',outlet:'Spa'}];
const CHECKS={
  opening:['Fridges & freezers in temperature (log below)','Hand-wash stations stocked','Date labels checked, out-of-date stock removed','Restaurant & bar set and clean','Allergen folder on hand'],
  closing:['Kitchen cleaned down & surfaces sanitised','Fridges closed, temperatures logged','Bins out, floors mopped','Gas & equipment off','Bar stock secured, tills cashed up']
};
const FRIDGES=['Walk-in fridge','Walk-in freezer','Dairy fridge','Meat fridge','Bar fridge 1','Bar fridge 2','Dessert fridge'];
const MENU_PDFS=[['The Clarendon — From the grill','clarendon-from-the-grill.pdf'],['The Clarendon — Sunday lunch','clarendon-sunday-lunch.pdf'],['The Clarendon — Desserts','clarendon-desserts.pdf'],['The Clarendon — The bar','clarendon-the-bar.pdf'],['Children\'s menu','clarendon-childrens-menu.pdf'],['Festive afternoon tea','festive-afternoon-tea.pdf'],['Christmas party nights','festive-christmas-party-nights.pdf'],['Christmas at Brandon Hall','festive-christmas-at-brandon-hall.pdf'],['New Year\'s Eve dinner','festive-new-years-eve-dinner.pdf']];

const B={ subs:[], checks:[], menu:[], un:[] };
function startWatch(){
  if(B.un.length||!Store.ready) return;
  const from=new Date(Date.now()-45*864e5).toLocaleDateString('en-CA');
  B.un.push(Store.watch('fb_daily', l=>{ B.subs=l.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.submittedAt).localeCompare(String(a.submittedAt))); bump(); }, q=>q.where('date','>=',from)));
  B.un.push(Store.watch('fb_checks', l=>{ B.checks=l.sort((a,b)=>String(b.date).localeCompare(String(a.date))); bump(); }, q=>q.where('date','>=',from)));
  B.un.push(Store.watch('fb_menus', l=>{ B.menu=l.sort((a,b)=>String(a.section||'').localeCompare(String(b.section||''))||String(a.name||'').localeCompare(String(b.name||''))); bump(); }));
}
function bump(){ const t=todayISO(); const hasToday=B.subs.some(s=>s.date===t); setBadge('fb', hasToday?'':'!', hasToday?'ok':'amber'); document.dispatchEvent(new CustomEvent('hp:fb')); if((location.hash||'').indexOf('#fb')===0) refresh(); }
document.addEventListener('hp:login',()=>{ if(HP.canOpen('fb')) startWatch(); });
document.addEventListener('hp:logout',()=>{ B.un.forEach(u=>{ try{ u(); }catch(e){} }); B.un=[]; });

function totals(s){ let f=0,b=0,fc=0,dc=0; Object.values(s.sales||{}).forEach(v=>{ f+=+v.food||0; b+=+v.bev||0; fc+=+v.foodCov||0; dc+=+v.drinkCov||0; }); return {f,b,fc,dc,t:f+b}; }
function dayTotals(date){ const out={f:0,b:0,fc:0,dc:0,t:0,n:0}; B.subs.filter(s=>s.date===date).forEach(s=>{ const x=totals(s); out.f+=x.f; out.b+=x.b; out.fc+=x.fc; out.dc+=x.dc; out.t+=x.t; out.n++; }); return out; }
function weekTotals(){ const out={t:0,fc:0,dc:0,days:0}; const seen={}; for(let i=0;i<7;i++){ const d=new Date(Date.now()-i*864e5).toLocaleDateString('en-CA'); const x=dayTotals(d); if(x.n){ out.t+=x.t; out.fc+=x.fc; out.dc+=x.dc; out.days++; } } return out; }

registerView('fb',{ render(el){
  const t=todayISO(), td=dayTotals(t), y=dayTotals(new Date(Date.now()-864e5).toLocaleDateString('en-CA')), wk=weekTotals();
  const todayChecks=B.checks.filter(c=>c.date===t); const op=todayChecks.find(c=>c.kind==='opening'), cl=todayChecks.find(c=>c.kind==='closing');
  const off=B.menu.filter(m=>m.off);
  el.innerHTML=topbar({mod:'fb',title:'Food & Beverage',sub:esc(HP.ME.name)+' · '+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})})+`<div class="wrap">
    <div class="stats four"><div class="stat ${td.n?'good':''}"><div class="n">${td.n?gbp(td.t).replace('.00',''):'—'}</div><div class="l">Today's sales</div></div><div class="stat"><div class="n">${td.fc+td.dc||'—'}</div><div class="l">Covers today</div></div><div class="stat"><div class="n">${y.n?gbp(y.t).replace('.00',''):'—'}</div><div class="l">Yesterday</div></div><div class="stat"><div class="n">${gbp(wk.t).replace('.00','')}</div><div class="l">Last 7 days</div></div></div>
    ${!td.n?`<div class="note">Today's figures haven't been entered yet. <button class="btn sm fb" onclick="HP.FB.figuresSheet()">Enter figures</button></div>`:''}
    <div class="modgrid">
      <button class="tile" onclick="HP.FB.figuresSheet()"><span class="ic" style="background:var(--fb)">💷</span><div><div class="nm">Daily figures</div><div class="ds">Sales, covers & invoices</div></div></button>
      <button class="tile" onclick="HP.FB.checkSheet('${op?(cl?'closing':'closing'):'opening'}')"><span class="ic" style="background:${op&&cl?'var(--ok)':'var(--amber)'}">✅</span><div><div class="nm">Daily checks</div><div class="ds">${op?(cl?'Opening ✓ · Closing ✓':'Opening ✓ · closing to do'):'Opening check to do'}</div></div></button>
      <button class="tile" onclick="HP.go('fb/menus')"><span class="ic" style="background:#8c5a2b">📖</span><div><div class="nm">Menus</div><div class="ds">${off.length?off.length+' item'+(off.length>1?'s':'')+' off today':'Menus & 86 list'}</div></div><span class="badge ${off.length?'':'ok'}" style="${off.length?'':'display:none'}">${off.length}</span></button>
      <button class="tile" onclick="HP.FIX.newJob({area:'food_beverage',source:'F&B'})"><span class="ic" style="background:var(--fix)">🔧</span><div><div class="nm">Report a fault</div><div class="ds">Kitchen, bar, restaurant</div></div></button>
    </div>
    <div class="sect">Recent figures <span class="r" onclick="HP.go('fb/history')">History ›</span></div>
    ${B.subs.slice(0,5).map(subCard).join('')||'<div class="empty">No figures yet — enter today\'s to start the record.</div>'}
  </div>${bnav([{id:'fb',icon:'fb',label:'F&B',onclick:"HP.go('fb')"},{id:'hist',icon:'sales',label:'History',onclick:"HP.go('fb/history')"},{id:'menus',icon:'comp',label:'Menus',onclick:"HP.go('fb/menus')"},{id:'home',icon:'home',label:'Home',onclick:"HP.go('home')"}],'fb')}`;
}});
function subCard(s){ const x=totals(s); const inv=(s.invoices||[]).reduce((t,i)=>t+(+i.net||0),0);
  return `<div class="card"><div class="row"><div class="grow"><div class="ttl">${esc(fmtDate(s.date,{weekday:'short',day:'numeric',month:'short'}))}</div><div class="sub">Food ${gbp(x.f)} · Drink ${gbp(x.b)} · ${x.fc+x.dc} covers${inv?' · invoices '+gbp(inv):''}</div>${s.notes?`<div class="sub">${esc(s.notes)}</div>`:''}</div><span class="money">${gbp(x.t)}</span></div><div class="sub" style="margin-top:4px">${esc(s.by||'')} · ${ago(s.submittedAt)}</div></div>`; }

/* ---------- daily figures (same shape as fb-entry.html → fb_submissions) ---------- */
function figuresSheet(){
  B.inv=0;
  sheet(`<label class="lbl">Date</label><input class="inp" type="date" id="fg-date" value="${todayISO()}">
    <div class="sub" style="margin:8px 0 4px">£ net sales and covers per outlet — leave blank where there was no service.</div>
    <div class="card" style="padding:8px 10px">${LINES.map(l=>`<div class="line" style="flex-wrap:wrap"><span style="flex-basis:100%"><b>${esc(l.name)}</b> <span class="sub" style="display:inline">${esc(l.outlet)}</span></span>
      <div class="two" style="flex-basis:100%;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px"><input class="inp" style="padding:8px" inputmode="decimal" data-l="${l.id}" data-k="food" placeholder="Food £" oninput="HP.FB.sum()"><input class="inp" style="padding:8px" inputmode="decimal" data-l="${l.id}" data-k="bev" placeholder="Drink £" oninput="HP.FB.sum()"><input class="inp" style="padding:8px" inputmode="numeric" data-l="${l.id}" data-k="foodCov" placeholder="Food cov" oninput="HP.FB.sum()"><input class="inp" style="padding:8px" inputmode="numeric" data-l="${l.id}" data-k="drinkCov" placeholder="Drink cov" oninput="HP.FB.sum()"></div></div>`).join('')}</div>
    <div class="stats"><div class="stat"><div class="n" id="fg-tf">£0</div><div class="l">Food</div></div><div class="stat"><div class="n" id="fg-tb">£0</div><div class="l">Drink</div></div><div class="stat"><div class="n" id="fg-tc">0</div><div class="l">Covers</div></div></div>
    <div class="sect">Supplier invoices received <span class="r" onclick="HP.FB.addInv()">+ Add</span></div><div id="fg-invs"></div>
    <label class="lbl">Notes</label><textarea class="inp" id="fg-notes" style="min-height:56px" placeholder="Events, weather, anything unusual"></textarea>
    <button class="btn fb" id="fg-go" onclick="HP.FB.figuresSave()">Send figures to HosPRO</button>`,{title:'Daily F&B figures'});
}
function sum(){ let f=0,b=0,c=0; document.querySelectorAll('#overlay input[data-l]').forEach(i=>{ const v=parseFloat(String(i.value).replace(/[£,\s]/g,''))||0; if(i.dataset.k==='food') f+=v; else if(i.dataset.k==='bev') b+=v; else c+=v; }); $('fg-tf').textContent=gbp(f); $('fg-tb').textContent=gbp(b); $('fg-tc').textContent=c; }
function addInv(){ const d=document.createElement('div'); d.className='card'; d.style.padding='10px'; d.innerHTML=`<div class="two"><input class="inp i-sup" placeholder="Supplier"><select class="inp i-cat"><option>Food</option><option>Beverage</option><option>Non-F&amp;B</option></select></div><div class="two" style="margin-top:6px"><input class="inp i-net" inputmode="decimal" placeholder="Net £"><input class="inp i-no" placeholder="Invoice no."></div><button class="linkbtn" onclick="this.parentElement.remove()">Remove</button>`; $('fg-invs').appendChild(d); }
async function figuresSave(){
  const date=$('fg-date').value; if(!date){ toast('Pick the date'); return; }
  const sales={}; document.querySelectorAll('#overlay input[data-l]').forEach(i=>{ if(i.value==='') return; (sales[i.dataset.l]=sales[i.dataset.l]||{})[i.dataset.k]=parseFloat(String(i.value).replace(/[£,\s]/g,''))||0; });
  const invoices=[...document.querySelectorAll('#fg-invs .card')].map(x=>({supplier:x.querySelector('.i-sup').value.trim(),cat:x.querySelector('.i-cat').value,net:parseFloat(x.querySelector('.i-net').value)||0,no:x.querySelector('.i-no').value.trim()})).filter(i=>i.supplier||i.net);
  if(!Object.keys(sales).length&&!invoices.length){ toast('Enter at least one figure'); return; }
  const b=$('fg-go'); b.disabled=true; b.textContent='Sending…';
  // fb_submissions is what the desktop F&B tracker reads — its rule only accepts exactly these keys
  const sub={date, by:HP.ME.name, sales, invoices, notes:($('fg-notes').value||'').trim().slice(0,500), submittedAt:nowISO(), status:'new'};
  let ok=false; try{ await Store.db.collection('fb_submissions').add(sub); ok=true; }catch(e){ console.warn('fb_submissions',e&&e.code); toast('Could not send to the tracker: '+((e&&e.code)||'error')); }
  // fb_daily is the copy the mobile app reads back (open rule, like the housekeeping data)
  const rec=Object.assign({}, sub, {id:uid('FD'), byId:HP.ME.id, source:'HosPRO Mobile'});
  const ok2=await Store.set('fb_daily',rec.id,rec,false);
  if(ok||ok2){ closeSheet(); toast('Figures sent'); } else { b.disabled=false; b.textContent='Try again'; }
}

/* ---------- daily checks ---------- */
function checkSheet(kind){
  kind=kind||'opening'; B.ck={kind, temps:{}};
  sheet(`<div class="seg"><button class="${kind==='opening'?'on':''}" onclick="HP.FB.checkSheet('opening')">🌅 Opening</button><button class="${kind==='closing'?'on':''}" onclick="HP.FB.checkSheet('closing')">🌙 Closing</button></div>
    <div class="sect">Checklist</div>${CHECKS[kind].map((c,i)=>`<label class="check"><input type="checkbox" class="ck-item" data-i="${i}" onchange="this.parentElement.classList.toggle('ok',this.checked)"> ${esc(c)}</label>`).join('')}
    <div class="sect">Fridge / freezer temperatures <span class="r">°C</span></div><div class="card" style="padding:8px 10px">${FRIDGES.map(f=>`<div class="line"><span>${esc(f)}</span><input class="inp" style="width:90px;padding:8px;text-align:center" inputmode="decimal" data-f="${esc(f)}" placeholder="°C"></div>`).join('')}</div>
    <div class="sub">Fridges should be 1–5 °C, freezers −18 °C or below. Anything out of range is flagged and raised as a fault.</div>
    <label class="lbl">Notes</label><textarea class="inp" id="ck-notes" style="min-height:56px"></textarea>
    <button class="btn fb" onclick="HP.FB.checkSave()">Sign off ${kind} check</button>`,{title:'Daily '+kind+' check'});
}
async function checkSave(){
  const kind=B.ck.kind; const items=[...document.querySelectorAll('.ck-item')].map(i=>i.checked); const temps={}; const bad=[];
  document.querySelectorAll('#overlay input[data-f]').forEach(i=>{ if(i.value==='') return; const v=parseFloat(i.value); temps[i.dataset.f]=v; const fz=/freezer/i.test(i.dataset.f); if(fz?v>-15:(v<0||v>8)) bad.push(i.dataset.f+' '+v+'°C'); });
  if(items.some(x=>!x)){ toast('Tick every item or note why'); if(!($('ck-notes').value||'').trim()) return; }
  const rec={ id:todayISO()+'__'+kind+'__'+Date.now(), date:todayISO(), kind, items:CHECKS[kind].map((c,i)=>({text:c,ok:items[i]})), temps, outOfRange:bad, notes:($('ck-notes').value||'').trim(), by:HP.ME.name, byId:HP.ME.id, at:nowISO() };
  const ok=await Store.set('fb_checks',rec.id,rec,false); if(!ok) return;
  closeSheet(); toast(kind+' check signed off');
  if(bad.length){ try{ HP.FIX.newJob({area:'food_beverage',location:'Kitchen',description:'Fridge/freezer out of range: '+bad.join(', '),priority:'high',source:'F&B'}); }catch(e){} }
}

/* ---------- history ---------- */
registerView('fb/history',{ render(el){
  const days={}; B.subs.forEach(s=>{ (days[s.date]=days[s.date]||[]).push(s); });
  const list=Object.keys(days).sort().reverse();
  el.innerHTML=topbar({mod:'fb',title:'F&B history',sub:'Last 45 days',backTo:'fb'})+`<div class="wrap">
    ${list.map(d=>{ const t=dayTotals(d); const ck=B.checks.filter(c=>c.date===d); return `<div class="card"><div class="row"><div class="grow"><div class="ttl">${esc(fmtDate(d,{weekday:'long',day:'numeric',month:'short'}))}</div><div class="sub">Food ${gbp(t.f)} · Drink ${gbp(t.b)} · ${t.fc+t.dc} covers · ${t.n} entr${t.n===1?'y':'ies'}${ck.length?' · checks: '+ck.map(c=>c.kind).join(' + '):''}${ck.some(c=>(c.outOfRange||[]).length)?' ⚠️ temps':''}</div></div><span class="money">${gbp(t.t)}</span></div></div>`; }).join('')||'<div class="empty">Nothing yet.</div>'}
    <div class="sub" style="text-align:center;margin-top:10px">Full tracker, targets and month views are in the desktop portal → F&B.</div>
  </div>${bnav([{id:'fb',icon:'fb',label:'F&B',onclick:"HP.go('fb')"},{id:'hist',icon:'sales',label:'History',onclick:"HP.go('fb/history')"},{id:'menus',icon:'comp',label:'Menus',onclick:"HP.go('fb/menus')"},{id:'home',icon:'home',label:'Home',onclick:"HP.go('home')"}],'hist')}`;
}});

/* ---------- menus & 86 list ---------- */
registerView('fb/menus',{ render(el){
  const secs={}; B.menu.forEach(m=>{ (secs[m.section||'Other']=secs[m.section||'Other']).push?null:null; (secs[m.section||'Other']=secs[m.section||'Other']||[]).push(m); });
  el.innerHTML=topbar({mod:'fb',title:'Menus',sub:'Items, prices & what\'s off',backTo:'fb',action:HP.isLead()?{label:'＋ Item',onclick:'HP.FB.itemSheet()'}:null})+`<div class="wrap">
    <div class="sect">Published menus</div><div class="card">${MENU_PDFS.map(m=>`<div class="line"><span>${esc(m[0])}</span><a class="btn sm ghost" href="${m[1]}" target="_blank" rel="noopener" style="text-decoration:none">Open</a></div>`).join('')}</div>
    <div class="sect">Today's items <span class="r">tap to mark off / on</span></div>
    ${Object.keys(secs).map(s=>`<div class="card"><div class="ttl" style="margin-bottom:6px">${esc(s)}</div>${secs[s].map(m=>`<div class="line" onclick="HP.FB.toggleOff('${esc(m.id)}')" style="cursor:pointer"><span style="${m.off?'text-decoration:line-through;color:var(--muted)':''}">${esc(m.name)}${m.allergens?` <span class="sub" style="display:inline">· ${esc(m.allergens)}</span>`:''}</span><span class="row" style="gap:6px">${m.price!=null&&m.price!==''?`<span class="money">${gbp(m.price)}</span>`:''}<span class="pill ${m.off?'urgent':'co'}">${m.off?'86\'d':'On'}</span>${HP.isLead()?`<button class="linkbtn" style="padding:2px 4px" onclick="event.stopPropagation();HP.FB.itemSheet('${esc(m.id)}')">✎</button>`:''}</span></div>`).join('')}</div>`).join('')||`<div class="empty">No menu items yet.${HP.isLead()?' Add dishes and drinks so the team can mark them off when they run out.':''}</div>`}
  </div>${bnav([{id:'fb',icon:'fb',label:'F&B',onclick:"HP.go('fb')"},{id:'hist',icon:'sales',label:'History',onclick:"HP.go('fb/history')"},{id:'menus',icon:'comp',label:'Menus',onclick:"HP.go('fb/menus')"},{id:'home',icon:'home',label:'Home',onclick:"HP.go('home')"}],'menus')}`;
}});
function itemSheet(id){ const m=id?B.menu.find(x=>x.id===id):null;
  sheet(`<label class="lbl">Item</label><input class="inp" id="mi-name" value="${esc(m?m.name:'')}" placeholder="e.g. Sirloin steak"><div class="two"><div><label class="lbl">Section</label><input class="inp" id="mi-sec" list="mi-secs" value="${esc(m?m.section||'':'')}" placeholder="e.g. From the grill"><datalist id="mi-secs">${[...new Set(B.menu.map(x=>x.section).filter(Boolean))].map(s=>`<option value="${esc(s)}">`).join('')}</datalist></div><div><label class="lbl">Price £</label><input class="inp" id="mi-price" inputmode="decimal" value="${esc(m&&m.price!=null?m.price:'')}"></div></div><label class="lbl">Allergens <span>optional</span></label><input class="inp" id="mi-all" value="${esc(m?m.allergens||'':'')}" placeholder="e.g. gluten, dairy"><div class="btnrow">${m?`<button class="btn red" onclick="HP.FB.itemDelete('${m.id}')">Delete</button>`:''}<button class="btn fb" onclick="HP.FB.itemSave('${m?m.id:''}')">Save</button></div>`,{title:m?'Edit item':'Add menu item'}); }
async function itemSave(id){ const name=($('mi-name').value||'').trim(); if(!name){ toast('Add the item name'); return; } const rec={ id:id||uid('MI'), name, section:($('mi-sec').value||'').trim()||'Other', price:$('mi-price').value===''?'':(parseFloat($('mi-price').value)||0), allergens:($('mi-all').value||'').trim(), updatedAt:nowISO(), by:HP.ME.name }; const old=id?B.menu.find(x=>x.id===id):null; if(old) rec.off=!!old.off; await Store.set('fb_menus',rec.id,rec); closeSheet(); }
async function itemDelete(id){ await Store.del('fb_menus',id); closeSheet(); }
async function toggleOff(id){ const m=B.menu.find(x=>x.id===id); if(!m) return; await Store.set('fb_menus',id,{off:!m.off, offBy:HP.ME.name, offAt:nowISO()}); toast(m.off?'Back on the menu':'Marked as off (86\'d)'); }

HP.FB={ figuresSheet, sum, addInv, figuresSave, checkSheet, checkSave, itemSheet, itemSave, itemDelete, toggleOff, data:B, dayTotals, weekTotals, totals };
})();
