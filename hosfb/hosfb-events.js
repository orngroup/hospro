/* HosF&B — event costing. Events live in hosfb/events { items:{ id:{...} } }. */
(function(){
addTab('events','Events',vEvents);
function vEvents(){
  const evs=Object.values(S.events).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  return `<div class="row"><div class="grow"></div><button class="btn" onclick="editEvent()">Cost a new event</button></div>
  <div class="card"><h2>Event costing</h2><p class="sub">Cost a wedding, party or function from dishes already in HosF&amp;B or from custom items, then add staff and other costs to see the profit.</p>
  <div class="scroll"><table><tr><th>Event</th><th>Date</th><th class="n">Guests</th><th class="n">Price a head</th><th class="n">Sales (net)</th><th class="n">Food cost</th><th class="n">Food GP</th><th class="n">Profit</th><th class="n">Margin</th></tr>
  ${evs.map(e=>{ const r=C.eventPL(e,S); return `<tr class="click" onclick="editEvent('${e.id}')"><td><strong>${esc(e.name)}</strong>${r.uncosted?` <span class="pill warn">${r.uncosted} not costed</span>`:''}</td><td>${e.date?fmtDate(e.date):''}</td><td class="n">${e.covers||0}</td><td class="n">${gbp(e.pricePerHead)}</td><td class="n">${gbp(r.sales)}</td><td class="n">${gbp(r.food)}</td><td class="n ${gpClass(r.foodGP)}">${pct(r.foodGP)}</td><td class="n">${gbp(r.profit)}</td><td class="n">${pct(r.margin)}</td></tr>`; }).join('')||'<tr><td colspan="9" class="muted">No events costed yet.</td></tr>'}</table></div></div>`;
}
window.editEvent=function(id){
  draft=id?JSON.parse(JSON.stringify(S.events[id])):{id:uid('e'),name:'',date:'',covers:null,pricePerHead:null,lines:[],extras:[],staff:[],_new:true};
  const e=draft; e.lines=e.lines||[]; e.extras=e.extras||[]; e.staff=e.staff||[];
  openSheet(`<h2>${e._new?'Cost a new event':esc(e.name)}</h2><div class="fg">
   <label class="full">Event name<input id="e-name" value="${esc(e.name)}" placeholder="For example: Smith wedding breakfast"></label>
   <label>Date<input id="e-date" type="date" value="${esc(e.date||'')}"></label>
   <label>Guests<input id="e-covers" type="number" min="0" value="${e.covers==null?'':e.covers}" oninput="draft.covers=num(this.value);evTotals()"></label>
   <label>Price a head (£, including VAT)<input id="e-price" type="number" step="0.01" value="${e.pricePerHead==null?'':e.pricePerHead}" oninput="draft.pricePerHead=num(this.value);evTotals()"></label>
   <label>Start from a menu<select id="e-menu" onchange="evFromMenu(this.value);this.value=''"><option value="">Choose a menu to copy its dishes…</option>${menus().map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label></div>
   <h3>Food</h3><div id="e-lines"></div>
   <div class="row" style="margin-top:8px"><button class="btn ghost sm" onclick="evAdd('dish')">Add a dish</button><button class="btn ghost sm" onclick="evAdd('custom')">Add a custom item</button></div>
   <h3>Staff for this event</h3><div id="e-staff"></div><button class="btn ghost sm" style="margin-top:8px" onclick="draft.staff.push({desc:'',hours:null,rate:null});evUI()">Add staff</button>
   <h3>Other costs</h3><div id="e-extras"></div><button class="btn ghost sm" style="margin-top:8px" onclick="draft.extras.push({name:'',total:null});evUI()">Add a cost</button>
   <h3>Summary</h3><div id="e-sum"></div>
   <div class="foot"><div>${e._new?'':`<button class="btn danger" onclick="delEvent('${e.id}')">Delete</button>`}</div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" onclick="saveEvent()">Save</button></div></div>`);
  evUI();
};
window.evFromMenu=function(mid){ const m=S.menus[mid]; if(!m) return; const cov=draft.covers||0;
  const by={}; m.items.forEach(i=>{ if(S.dishes[i.dishId]) (by[i.course]=by[i.course]||[]).push(i.dishId); });
  Object.values(by).forEach(ids=>ids.forEach(d=>{ if(!draft.lines.some(l=>l.dishId===d)) draft.lines.push({dishId:d,qty:cov?Math.round(cov/ids.length):0}); }));
  evUI(); };
window.evAdd=function(kind){ const ds=dishes(); if(kind==='dish'){ if(!ds.length) return; draft.lines.push({dishId:ds[0].id,qty:draft.covers||0}); } else draft.lines.push({name:'',cost:null,qty:draft.covers||0}); evUI(); };
window.evUI=function(){ const e=draft, ds=dishes();
  $('e-lines').innerHTML=e.lines.length?`<div class="scroll"><table><tr><th>Item</th><th>Portions</th><th class="n">Cost a portion</th><th class="n">Total</th><th></th></tr>${e.lines.map((l,i)=>`<tr><td>${l.dishId?`<select onchange="draft.lines[${i}].dishId=this.value;evUI()">${ds.map(d=>`<option value="${d.id}" ${d.id===l.dishId?'selected':''}>${esc(d.name)}</option>`).join('')}</select>`:`<input placeholder="Custom item" value="${esc(l.name||'')}" oninput="draft.lines[${i}].name=this.value">`}</td>
     <td><input type="number" min="0" value="${l.qty==null?'':l.qty}" oninput="draft.lines[${i}].qty=num(this.value)||0;evTotals()"></td>
     <td class="n">${l.dishId?`<span id="el-c${i}"></span>`:`<input type="number" step="0.01" placeholder="£" value="${l.cost==null?'':l.cost}" oninput="draft.lines[${i}].cost=num(this.value);evTotals()">`}</td>
     <td class="n" id="el-t${i}"></td><td><button class="btn ghost sm" onclick="draft.lines.splice(${i},1);evUI()">✕</button></td></tr>`).join('')}</table></div>`:'<p class="muted small">No food yet. Start from a menu or add items.</p>';
  $('e-staff').innerHTML=e.staff.map((x,i)=>`<div class="fg" style="margin-bottom:6px;grid-template-columns:2fr 1fr 1fr auto"><input placeholder="For example: 4 waiting staff" value="${esc(x.desc||'')}" oninput="draft.staff[${i}].desc=this.value"><input type="number" step="0.25" placeholder="Total hours" value="${x.hours==null?'':x.hours}" oninput="draft.staff[${i}].hours=num(this.value);evTotals()"><input type="number" step="0.01" placeholder="£ an hour" value="${x.rate==null?'':x.rate}" oninput="draft.staff[${i}].rate=num(this.value);evTotals()"><button class="btn ghost sm" onclick="draft.staff.splice(${i},1);evUI()">✕</button></div>`).join('');
  $('e-extras').innerHTML=e.extras.map((x,i)=>`<div class="fg" style="margin-bottom:6px;grid-template-columns:2fr 1fr auto"><input placeholder="For example: linen hire" value="${esc(x.name||'')}" oninput="draft.extras[${i}].name=this.value"><input type="number" step="0.01" placeholder="£ total" value="${x.total==null?'':x.total}" oninput="draft.extras[${i}].total=num(this.value);evTotals()"><button class="btn ghost sm" onclick="draft.extras.splice(${i},1);evUI()">✕</button></div>`).join('');
  evTotals(); };
window.evTotals=function(){ const r=C.eventPL(draft,S);
  r.lines.forEach((l,i)=>{ const c=$('el-c'+i); if(c) c.innerHTML=l.estCost==null?'<span class="pill warn">Not costed</span>':gbp(l.estCost); const t=$('el-t'+i); if(t) t.textContent=gbp(l.estTotal); });
  const row=(a,b,cls)=>`<tr><td>${a}</td><td class="n ${cls||''}">${b}</td></tr>`;
  $('e-sum').innerHTML=`<table>${row('Sales, net of VAT ('+(draft.covers||0)+' guests at '+gbp(r.net)+')',gbp(r.sales))}${row('Food cost (chef\'s costs)'+(r.uncosted?' – '+r.uncosted+' item(s) not costed yet':''),gbp(r.food))}${r.foodAct!=null?row('Food cost at prices paid',gbp(r.foodAct)):''}${row('Staff',gbp(r.staff))}${row('Other costs',gbp(r.other))}
   <tr class="tot"><td>Profit</td><td class="n">${gbp(r.profit)}</td></tr>${row('Food GP',pct(r.foodGP),gpClass(r.foodGP))}${row('Margin after staff and other costs',pct(r.margin))}${row('Food cost a head',gbp(r.perHeadFood))}${row('All costs a head',gbp(r.perHeadCost))}</table>`; };
window.saveEvent=async function(){ const e=draft; e.name=$('e-name').value.trim(); if(!e.name){ alert('Add the event name.'); return; } e.date=$('e-date').value; e.covers=num($('e-covers').value)||0; e.pricePerHead=num($('e-price').value);
  e.lines=e.lines.filter(l=>l.dishId||l.name); e.extras=e.extras.filter(x=>x.name||x.total); e.staff=e.staff.filter(x=>x.desc||x.hours); delete e._new; await Data.put('events',e); closeSheet(); };
window.delEvent=async function(id){ if(confirm('Delete this event costing?')){ await Data.del('events',id); closeSheet(); } };
})();
