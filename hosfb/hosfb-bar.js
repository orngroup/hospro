/* HosF&B — bar stock, stock take, supplier orders and stock-list import.
   The product list and starting stock come from hosfb-stock.js (the stock take workbook of
   7 November 2026), counted in count units: gallons for draught, bottles or units otherwise.
   Live levels: hosfb/barlevels (+ log). Product edits and new products: hosfb/bar.
   Finished stock takes: hosfb/bar/takes. The older bar app (beverage.html) keeps its own list
   in cases and is no longer the master. */
(function(){
addTab('bar','Bar',vBar);
const B={levels:{},loaded:false,view:'stock',q:'',takes:null,take:null,imp:null};
const r2=v=>Math.round(v*100)/100;
function products(){
  const base={}; (typeof HOSFB_STOCK!=='undefined'?HOSFB_STOCK.products:(typeof BEV_PRODUCTS!=='undefined'?BEV_PRODUCTS:[])).forEach(p=>base[p.id]=Object.assign({},p));
  Object.values(S.bar).forEach(o=>{ base[o.id]=Object.assign(base[o.id]||{},o); });
  return Object.values(base).filter(p=>!p.hidden).map(p=>{ if(B.levels[p.id]!=null) p.stock=B.levels[p.id]; p.stock=+p.stock||0; p.price=+p.price||0; p.perCase=+p.perCase||1; return p; })
    .sort((a,b)=>String(a.cat).localeCompare(String(b.cat))||a.name.localeCompare(b.name));
}
async function loadLevels(){
  if(B.loaded) return; B.loaded=true;
  try{ const l=JSON.parse(localStorage.getItem('hosfb_barlevels')||'null'); if(l&&l.stock) B.levels=l.stock; }catch(e){}
  if(db){ try{ db.collection('hosfb').doc('barlevels').onSnapshot(d=>{ if(d.exists&&d.data().stock){ B.levels=d.data().stock; if(tab==='bar'&&!$('modal').classList.contains('on')&&B.view!=='take') render(); } }); }catch(e){} }
  try{ B.take=JSON.parse(localStorage.getItem('hosfb_take')||'null'); }catch(e){}
}
async function saveLevels(changes,logEntry){
  Object.assign(B.levels,changes);
  try{ localStorage.setItem('hosfb_barlevels',JSON.stringify({stock:B.levels,updated:new Date().toISOString()})); }catch(e){}
  if(db&&cloud){ try{ await db.collection('hosfb').doc('barlevels').set({stock:changes,updated:new Date().toISOString()},{merge:true});
    if(logEntry) await sub('barlevels','log').add(logEntry); }catch(e){ alert('Saved on this device, but not to the cloud ('+(e.code||e.message)+').'); } }
}
const sub2=[['stock','Stock'],['take','Stock take'],['orders','Supplier orders'],['history','Past stock takes'],['import','Import a stock list']];
function vBar(){
  loadLevels(); const ps=products();
  const val=ps.reduce((t,p)=>t+p.stock*p.price,0), low=ps.filter(p=>p.par>0?p.stock<p.par:(p.stock>0&&p.stock<2)).length, out=ps.filter(p=>p.stock<=0).length;
  let h=`<div class="tiles"><div class="tile"><div class="l">Stock value</div><div class="v">${gbp(val)}</div><div class="d">${ps.length} products, at cost before VAT</div></div>
   <div class="tile"><div class="l">Low or below par</div><div class="v ${low?'warn':''}">${low}</div><div class="d">See Supplier orders</div></div>
   <div class="tile"><div class="l">Out of stock</div><div class="v ${out?'bad':''}">${out}</div><div class="d">&nbsp;</div></div></div>
   <div class="row"><div class="chips grow">${sub2.map(([k,l])=>`<button class="chip ${B.view===k?'on':''}" onclick="barView('${k}')">${l}</button>`).join('')}</div></div>`;
  return h+({stock:vStock,take:vTake,orders:vOrders,history:vHistory,import:vImport}[B.view])(ps);
}
window.barView=v=>{ B.view=v; if(v==='history'&&!B.takes) loadTakes(); render(); };

/* ---------- stock list ---------- */
function vStock(ps){
  return `<div class="row"><input class="grow" type="search" placeholder="Search products or suppliers" value="${esc(B.q)}" oninput="barSearch(this.value)"><button class="btn" onclick="editProd()">New product</button></div>
  <div class="card"><p class="sub">Tap a product to record a delivery, a breakage or a correction, or to change its details. Quantities are in count units: gallons for draught, bottles or units for everything else (a spirit bottle that is half full counts as 0.5).</p>
  <div class="scroll"><table><tr><th>Product</th><th>Supplier</th><th class="n">Cost a unit</th><th class="n">In stock</th><th class="n">Par</th><th class="n">Value</th></tr><tbody id="bl">${stockRows(ps)}</tbody></table></div></div>`;
}
function stockRows(ps){ const f=B.q.toLowerCase(); let cat=null, h='';
  ps.filter(p=>!f||p.name.toLowerCase().includes(f)||String(p.sup||'').toLowerCase().includes(f)||String(p.cat).toLowerCase().includes(f)).forEach(p=>{
    if(p.cat!==cat){ cat=p.cat; h+=`<tr class="sec"><td colspan="6">${esc(cat)}</td></tr>`; }
    const st=p.stock<=0?'<span class="pill bad">Out</span>':(p.par>0?p.stock<p.par:p.stock<2)?'<span class="pill warn">Low</span>':'';
    h+=`<tr class="click" onclick="editProd('${p.id}')"><td><strong>${esc(p.name)}</strong> ${st}<br><span class="muted small">${esc(p.pack||'')}</span></td><td>${esc(p.sup||'')}</td><td class="n">${gbp(p.price)}</td><td class="n">${r2(p.stock)} ${esc(p.unit||'')}</td><td class="n">${p.par||'–'}</td><td class="n">${gbp(p.stock*p.price)}</td></tr>`; });
  return h||'<tr><td colspan="6" class="muted">Nothing found.</td></tr>'; }
window.barSearch=v=>{ B.q=v; const e=$('bl'); if(e) e.innerHTML=stockRows(products()); };
window.editProd=function(id){
  const p=id?products().find(x=>x.id===id):{id:uid('bev'),cat:'Other',sup:'',code:'',name:'',pack:'',unit:'Case',perCase:1,price:null,stock:0,par:null,_new:true}; draft=Object.assign({},p);
  const cats=[...new Set(products().map(x=>x.cat))];
  openSheet(`<h2>${p._new?'New product':esc(p.name)}</h2>
   ${p._new?'':`<div class="card" style="padding:12px"><strong>In stock: ${r2(p.stock)} ${esc(p.unit||'')}</strong><div class="fg" style="margin-top:8px"><label>Change<select id="mv-type"><option value="delivery">Delivery (add)</option><option value="remove">Used, breakage or waste (take off)</option><option value="set">Correct the count (set to)</option></select></label><label>Quantity (count units)<input id="mv-qty" type="number" step="any" inputmode="decimal"></label><label class="full">Note<input id="mv-note" placeholder="Optional"></label></div><button class="btn jade" style="margin-top:10px" onclick="moveProd('${p.id}')">Update stock</button></div>`}
   <h3>Details</h3><div class="fg"><label class="full">Product<input id="b-name" value="${esc(p.name)}"></label>
   <label>Type<input id="b-cat" list="bcats" value="${esc(p.cat||'')}"><datalist id="bcats">${cats.map(c=>`<option>${esc(c)}`).join('')}</datalist></label>
   <label>Supplier<input id="b-sup" value="${esc(p.sup||'')}"></label><label>Supplier code<input id="b-code" value="${esc(p.code||'')}"></label>
   <label>Pack size<input id="b-pack" value="${esc(p.pack||'')}" placeholder="For example: 330ml x24"></label><label>Order unit<input id="b-unit" value="${esc(p.unit||'')}" placeholder="Case, Bottle, Keg"></label>
   <label>Singles in one order unit<input id="b-per" type="number" min="1" value="${p.perCase||1}"></label>
   <label>Cost an order unit (£, before VAT)<input id="b-price" type="number" step="0.01" value="${p.price==null?'':p.price}"></label>
   <label>Par level (reorder below this)<input id="b-par" type="number" step="any" value="${p.par==null?'':p.par}"></label>
   ${p._new?'<label>Opening stock (order units)<input id="b-stock" type="number" step="any" value="0"></label>':''}</div>
   <div class="foot"><div>${p._new?'':`<button class="btn danger" onclick="hideProd('${p.id}')">Remove product</button>`}</div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" onclick="saveProd()">Save details</button></div></div>`);
};
window.moveProd=async function(id){ const p=products().find(x=>x.id===id), q=num($('mv-qty').value), t=$('mv-type').value; if(q==null||q<0){ alert('Enter the quantity.'); return; }
  const next=Math.max(0,r2(t==='delivery'?p.stock+q:t==='remove'?p.stock-q:q));
  await saveLevels({[id]:next},{id,name:p.name,delta:r2(next-p.stock),type:t==='set'?'adjust':t,staff:me.name,note:$('mv-note').value.trim(),at:new Date().toISOString()}); closeSheet(); };
window.saveProd=async function(){ const p=draft, isNew=p._new; const o={id:p.id,name:$('b-name').value.trim(),cat:$('b-cat').value.trim()||'Other',sup:$('b-sup').value.trim(),code:$('b-code').value.trim(),pack:$('b-pack').value.trim(),unit:$('b-unit').value.trim()||'Unit',perCase:num($('b-per').value)||1,price:num($('b-price').value)||0,par:num($('b-par').value)};
  if(!o.name){ alert('Add the product name.'); return; } await Data.put('bar',o);
  if(isNew){ const st=num($('b-stock').value)||0; await saveLevels({[o.id]:st},{id:o.id,name:o.name,delta:st,type:'new product',staff:me.name,note:'',at:new Date().toISOString()}); } closeSheet(); };
window.hideProd=async function(id){ if(!confirm('Remove this product from the HosF&B stock list? Its history is kept.')) return; const p=products().find(x=>x.id===id); await Data.put('bar',Object.assign({},S.bar[id]||{id},{id,hidden:true,name:p.name})); closeSheet(); };

/* ---------- stock take ---------- */
function saveTakeDraft(){ try{ localStorage.setItem('hosfb_take',JSON.stringify(B.take)); }catch(e){} }
function vTake(ps){
  if(!B.take) return `<div class="card"><h2>Stock take</h2><p class="sub">Count shelf by shelf on a tablet or phone. Nothing changes until you finish, and a count in progress is kept on this device if you close the page.</p><button class="btn" onclick="takeStart()">Start a stock take</button></div>`;
  const t=B.take, done=ps.filter(p=>t.counts[p.id]!=null).length; let cat=null, rows='';
  ps.forEach(p=>{ if(p.cat!==cat){ cat=p.cat; rows+=`<tr class="sec"><td colspan="4">${esc(cat)}</td></tr>`; }
    const c=t.counts[p.id]||{}; const tot=t.counts[p.id]==null?null:r2((c.full||0)+(c.loose||0)/p.perCase), diff=tot==null?null:r2(tot-(t.before[p.id]!=null?t.before[p.id]:p.stock));
    rows+=`<tr><td><strong>${esc(p.name)}</strong><br><span class="muted small">${esc(p.pack||'')} · expected ${r2(t.before[p.id]!=null?t.before[p.id]:p.stock)} ${esc(p.unit||'')}</span></td>
     <td><input type="number" step="any" inputmode="decimal" min="0" placeholder="${esc(p.unit||'Units')}" value="${c.full==null?'':c.full}" oninput="takeSet('${p.id}','full',this.value)"></td>
     <td>${p.perCase>1?`<input type="number" inputmode="numeric" min="0" placeholder="Singles" value="${c.loose==null?'':c.loose}" oninput="takeSet('${p.id}','loose',this.value)">`:''}</td>
     <td class="n" id="tk-${p.id}">${tot==null?'–':tot+' <span class="'+(diff<0?'bad':diff>0?'good':'muted')+' small">('+(diff>0?'+':'')+diff+')</span>'}</td></tr>`; });
  return `<div class="card"><div class="row"><div class="grow"><h2>Stock take in progress</h2><p class="sub" style="margin:0">Started ${new Date(t.startedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} by ${esc(t.by)}. <span id="tk-done">${done}</span> of ${ps.length} counted. Leave a line blank if you have not counted it.</p></div>
   <button class="btn danger sm" onclick="takeCancel()">Discard</button><button class="btn jade" onclick="takeReview()">Finish</button></div>
   <div class="scroll"><table><tr><th>Product</th><th>Count</th><th></th><th class="n">Counted</th></tr>${rows}</table></div></div>`;
}
window.takeStart=function(){ const before={}; products().forEach(p=>before[p.id]=p.stock); B.take={startedAt:new Date().toISOString(),by:me.name,counts:{},before}; saveTakeDraft(); render(); };
window.takeCancel=function(){ if(confirm('Discard this stock take? Counts entered so far will be lost.')){ B.take=null; localStorage.removeItem('hosfb_take'); render(); } };
window.takeSet=function(id,k,v){ const t=B.take, p=products().find(x=>x.id===id); const c=t.counts[id]||{}; c[k]=num(v); if(c.full==null&&c.loose==null) delete t.counts[id]; else t.counts[id]=c; saveTakeDraft();
  const has=t.counts[id]!=null, tot=has?r2((c.full||0)+(c.loose||0)/p.perCase):null, diff=has?r2(tot-(t.before[id]!=null?t.before[id]:p.stock)):null;
  $('tk-'+id).innerHTML=!has?'–':tot+' <span class="'+(diff<0?'bad':diff>0?'good':'muted')+' small">('+(diff>0?'+':'')+diff+')</span>'; $('tk-done').textContent=Object.keys(t.counts).length; };
function takeResult(){ const t=B.take, ps=products(); const lines=[]; let val=0, varVal=0, short=0, over=0;
  ps.forEach(p=>{ if(t.counts[p.id]==null) return; const c=t.counts[p.id], counted=r2((c.full||0)+(c.loose||0)/p.perCase), exp=t.before[p.id]!=null?t.before[p.id]:p.stock, d=r2(counted-exp);
    lines.push({id:p.id,name:p.name,cat:p.cat,unit:p.unit||'',price:p.price,expected:exp,counted,diff:d,diffValue:r2(d*p.price)}); val+=counted*p.price; varVal+=d*p.price; if(d<0) short+=d*p.price; else over+=d*p.price; });
  return {lines,value:r2(val),variance:r2(varVal),short:r2(short),over:r2(over),notCounted:ps.length-lines.length}; }
window.takeReview=function(){ const r=takeResult(); if(!r.lines.length){ alert('Nothing has been counted yet.'); return; }
  const top=r.lines.filter(l=>l.diff!==0).sort((a,b)=>a.diffValue-b.diffValue);
  openSheet(`<h2>Finish the stock take</h2><div class="tiles"><div class="tile"><div class="l">Counted</div><div class="v">${r.lines.length}</div><div class="d">${r.notCounted} not counted (left as they are)</div></div><div class="tile"><div class="l">Value counted</div><div class="v">${gbp(r.value)}</div></div><div class="tile"><div class="l">Difference</div><div class="v ${r.variance<0?'bad':'good'}">${gbp(r.variance)}</div><div class="d">Short ${gbp(r.short)} · over ${gbp(r.over)}</div></div></div>
   <h3>Differences against expected stock</h3><div class="scroll" style="max-height:300px;overflow:auto"><table><tr><th>Product</th><th class="n">Expected</th><th class="n">Counted</th><th class="n">Difference</th><th class="n">Value</th></tr>${top.map(l=>`<tr><td>${esc(l.name)}</td><td class="n">${l.expected}</td><td class="n">${l.counted}</td><td class="n ${l.diff<0?'bad':'good'}">${l.diff>0?'+':''}${l.diff}</td><td class="n">${gbp(l.diffValue)}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Everything counted matches.</td></tr>'}</table></div>
   <p class="muted small">Finishing sets the stock levels in HosF&amp;B to what was counted.</p>
   <div class="foot"><button class="btn ghost" onclick="closeSheet()">Keep counting</button><button class="btn jade" onclick="takeFinish()">Finish and update stock</button></div>`); };
window.takeFinish=async function(){ const r=takeResult(), t=B.take; const changes={}; r.lines.forEach(l=>changes[l.id]=l.counted);
  const rec={id:'take-'+Date.now(),startedAt:t.startedAt,finishedAt:new Date().toISOString(),by:t.by,finishedBy:me.name,value:r.value,variance:r.variance,short:r.short,over:r.over,counted:r.lines.length,notCounted:r.notCounted,lines:r.lines};
  await saveLevels(changes,{id:'stocktake',name:'Stock take ('+r.lines.length+' products)',delta:0,type:'stocktake',staff:me.name,note:'Difference '+gbp(r.variance),at:rec.finishedAt});
  if(db&&cloud){ try{ await sub('bar','takes').doc(rec.id).set(rec); }catch(e){ alert('Stock updated, but the stock take record could not be saved ('+(e.code||e.message)+').'); } }
  try{ const l=JSON.parse(localStorage.getItem('hosfb_takes')||'[]'); l.unshift(rec); localStorage.setItem('hosfb_takes',JSON.stringify(l.slice(0,12))); }catch(e){}
  B.take=null; localStorage.removeItem('hosfb_take'); B.takes=null; B.view='history'; loadTakes(); closeSheet(); };
async function loadTakes(){ let l=[]; try{ l=JSON.parse(localStorage.getItem('hosfb_takes')||'[]'); }catch(e){}
  if(db&&cloud){ try{ const q=await sub('bar','takes').orderBy('finishedAt','desc').limit(24).get(); l=q.docs.map(d=>d.data()); }catch(e){} }
  if(typeof HOSFB_STOCK!=='undefined'&&HOSFB_STOCK.take&&!l.some(t=>t.id===HOSFB_STOCK.take.id)) l.push(HOSFB_STOCK.take); B.takes=l; if(tab==='bar') render(); }
function vHistory(){ const l=B.takes; if(!l) return '<div class="card"><p class="muted">Loading…</p></div>';
  const w=typeof HOSFB_STOCK!=='undefined'&&HOSFB_STOCK.take, x=w&&w.sheet;
  const wk=x?`<div class="card"><h2>Stock take of 7 November 2026</h2><p class="sub">From the stock take workbook, period ${esc(w.period)}. This is the starting stock in HosF&amp;B.</p><div class="tiles">
   <div class="tile"><div class="l">Sales in the period</div><div class="v">${gbp(x.revenue)}</div><div class="d">Workbook figure</div></div><div class="tile"><div class="l">Cost of those sales</div><div class="v">${gbp(x.salesCost)}</div><div class="d">Gross profit ${gbp(x.gp)}</div></div>
   <div class="tile"><div class="l">Bar GP</div><div class="v ${gpClass(x.gpPct)}">${pct(x.gpPct)}</div><div class="d">Workbook figure</div></div><div class="tile"><div class="l">Closing stock at full cost</div><div class="v">${gbp(w.value)}</div><div class="d">The workbook shows ${gbp(x.closing)} because it values spirits by the measure, not the bottle</div></div></div></div>`:'';
  return wk+`<div class="card"><h2>Past stock takes</h2><p class="sub">The difference is counted stock against expected stock, valued at cost. A steady shortfall points to waste, over-pouring or unrecorded sales.</p><div class="scroll"><table><tr><th>Finished</th><th>By</th><th class="n">Counted</th><th class="n">Value</th><th class="n">Difference</th><th class="n">Short</th><th class="n">Over</th><th></th></tr>
  ${l.map((t,i)=>`<tr><td>${new Date(t.finishedAt).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td><td>${esc(t.finishedBy||t.by||'')}</td><td class="n">${t.counted}</td><td class="n">${gbp(t.value)}</td><td class="n ${t.variance<0?'bad':'good'}">${gbp(t.variance)}</td><td class="n">${gbp(t.short)}</td><td class="n">${gbp(t.over)}</td><td><button class="btn ghost sm" onclick="takeShow(${i})">View</button></td></tr>`).join('')||'<tr><td colspan="8" class="muted">No stock takes finished yet.</td></tr>'}</table></div></div>`; }
window.takeShow=function(i){ const t=B.takes[i]; openSheet(`<h2>Stock take, ${new Date(t.finishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</h2><div class="scroll" style="max-height:60vh;overflow:auto"><table><tr><th>Product</th><th class="n">Expected</th><th class="n">Counted</th><th class="n">Difference</th><th class="n">Value</th></tr>${t.lines.map(l=>`<tr><td>${esc(l.name)}</td><td class="n">${l.expected}</td><td class="n">${l.counted}</td><td class="n ${l.diff<0?'bad':l.diff>0?'good':''}">${l.diff>0?'+':''}${l.diff}</td><td class="n">${gbp(l.diffValue)}</td></tr>`).join('')}</table></div><div class="foot"><div></div><button class="btn" onclick="closeSheet()">Close</button></div>`); };

/* ---------- supplier orders ---------- */
function vOrders(ps){ const need=ps.filter(p=>p.par>0&&p.stock<p.par); const noPar=ps.filter(p=>!(p.par>0)).length; const by={};
  need.forEach(p=>(by[p.sup||'No supplier set']=by[p.sup||'No supplier set']||[]).push(p));
  return `<div class="card"><h2>Supplier orders</h2><p class="sub">Products below their par level, grouped by supplier, with the quantity to bring them back to par. ${noPar?noPar+' products have no par level yet – set one on the Stock tab to include them.':''}</p>
  ${Object.keys(by).sort().map(s=>{ const tot=by[s].reduce((t,p)=>t+Math.ceil(p.par-p.stock)*p.price,0); return `<h3>${esc(s)} – about ${gbp(tot)}</h3><div class="scroll"><table><tr><th>Product</th><th>Code</th><th class="n">In stock</th><th class="n">Par</th><th class="n">Order</th><th class="n">Cost</th></tr>${by[s].map(p=>{ const q=Math.ceil(p.par-p.stock); return `<tr><td>${esc(p.name)}<br><span class="muted small">${esc(p.pack||'')}</span></td><td>${esc(p.code||'')}</td><td class="n">${r2(p.stock)}</td><td class="n">${p.par}</td><td class="n"><strong>${q} ${esc(p.unit||'')}</strong></td><td class="n">${gbp(q*p.price)}</td></tr>`; }).join('')}</table></div>`; }).join('')||'<p class="muted">Nothing is below par.</p>'}
  ${need.length?'<button class="btn ghost" style="margin-top:12px" onclick="window.print()">Print the order list</button>':''}</div>`; }

/* ---------- import a stock list ---------- */
function vImport(){ const I=B.imp;
  let h=`<div class="card"><h2>Import a stock list</h2><p class="sub">Upload a spreadsheet (Excel or CSV) of products, for example the latest stock sheet or a supplier price list. Products are matched by supplier code, then by name; anything new is added. Prices, par levels and stock counts update only where the sheet has those columns.</p><input type="file" accept=".xlsx,.xls,.csv" onchange="barImportFile(this.files[0])">`;
  if(I){ const opt=(k,l)=>`<label>${l}<select onchange="B_imp('${k}',this.value)"><option value="-1">Not in this sheet</option>${I.hdr.map((x,i)=>`<option value="${i}" ${I.cols[k]===i?'selected':''}>${esc(x||('Column '+(i+1)))}</option>`).join('')}</select></label>`;
    const pv=importPreview();
    h+=`<h3>Which column is which</h3><div class="fg">${opt('name','Product name')}${opt('code','Supplier code')}${opt('cat','Type')}${opt('sup','Supplier')}${opt('pack','Pack size')}${opt('unit','Order unit')}${opt('perCase','Singles in a unit')}${opt('price','Cost a unit')}${opt('par','Par level')}${opt('stock','Stock count')}</div>
    <p style="margin-top:12px"><strong>${pv.match}</strong> match existing products, <strong>${pv.add}</strong> are new, ${pv.skip} rows skipped (no name).</p>
    <div class="scroll" style="max-height:260px;overflow:auto"><table><tr><th>Product</th><th>Result</th><th class="n">Cost</th><th class="n">Stock</th></tr>${pv.rows.slice(0,60).map(r=>`<tr><td>${esc(r.o.name)}</td><td>${r.existing?'Updates “'+esc(r.existing.name)+'”':'<span class="pill good">New</span>'}</td><td class="n">${r.o.price==null?'–':gbp(r.o.price)}</td><td class="n">${r.stock==null?'–':r.stock}</td></tr>`).join('')}</table></div>
    <div class="row" style="margin-top:12px"><button class="btn" ${I.cols.name<0?'disabled':''} onclick="barImportApply()">Import ${pv.rows.length} products</button><button class="btn ghost" onclick="B_imp_clear()">Cancel</button></div>`; }
  return h+'</div>'; }
window.barImportFile=async function(f){ if(!f) return; try{ const rows=(await readSheet(f)).filter(r=>r.some(c=>String(c).trim()!=='')); if(rows.length<2){ alert('That sheet looks empty.'); return; }
  let hi=0; for(let i=0;i<Math.min(rows.length,15);i++){ if(rows[i].filter(c=>typeof c==='string'&&c.trim()).length>=3){ hi=i; break; } }
  const hdr=rows[hi].map(x=>String(x)); const g=re=>guessCol(hdr,re);
  B.imp={hdr,rows:rows.slice(hi+1),cols:{name:g(/product|^name|description|item/),code:g(/code|sku/),cat:g(/categ|type|group/),sup:hdr.findIndex(x=>/supplier|vendor/i.test(x)&&!/code|sku|ref/i.test(x)),pack:g(/pack|size/),unit:g(/^unit$|order unit|uom/),perCase:g(/per case|singles|units per/),price:g(/price|cost/),par:g(/par|min/),stock:g(/stock|count|qty|quantity|on hand/)}}; render();
  }catch(e){ alert('Could not read that file: '+e.message); } };
window.B_imp=(k,v)=>{ B.imp.cols[k]=+v; render(); }; window.B_imp_clear=()=>{ B.imp=null; render(); };
function importPreview(){ const I=B.imp, ps=products(), c=I.cols; const byCode={}, byName={}; const ck=v=>String(v).trim().toLowerCase().replace(/^0+(?=.)/,''); ps.forEach(p=>{ if(p.code) byCode[ck(p.code)]=p; byName[normName(p.name)]=p; });
  const get=(r,k)=>c[k]>=0?r[c[k]]:undefined, n=v=>{ const x=parseFloat(String(v).replace(/[£,]/g,'')); return isNaN(x)?null:x; };
  const out={rows:[],match:0,add:0,skip:0};
  I.rows.forEach(r=>{ const name=String(get(r,'name')||'').trim(); if(!name){ out.skip++; return; }
    const code=String(get(r,'code')||'').trim(); const ex=(code&&byCode[ck(code)])||byName[normName(name)]||null;
    const o={name}; if(code&&!ex) o.code=code; ['cat','sup','pack','unit'].forEach(k=>{ const v=String(get(r,k)||'').trim(); if(v) o[k]=v; }); ['perCase','price','par'].forEach(k=>{ const v=n(get(r,k)); if(v!=null) o[k]=v; });
    const stock=c.stock>=0?n(get(r,'stock')):null; if(ex) out.match++; else out.add++; out.rows.push({o,existing:ex,stock}); });
  return out; }
window.barImportApply=async function(){ const pv=importPreview(); const changes={}; const items={};
  pv.rows.forEach((r,i)=>{ const id=r.existing?r.existing.id:'bev-i'+Date.now().toString(36)+i; const o=r.existing?Object.assign({},S.bar[id]||{},r.o,{id,name:r.existing.name}):Object.assign({cat:'Other',unit:'Unit',perCase:1,price:0},r.o,{id});
    o.updatedBy=me.id; o.updatedAt=new Date().toISOString(); items[id]=o; S.bar[id]=o; if(r.stock!=null) changes[id]=r.stock; else if(!r.existing) changes[id]=0; });
  Data.cache(); if(cloud){ try{ await db.collection('hosfb').doc('bar').set({items},{merge:true}); }catch(e){ alert('Saved on this device, but not to the cloud ('+(e.code||e.message)+').'); } }
  if(Object.keys(changes).length) await saveLevels(changes,{id:'import',name:'Stock list import ('+pv.rows.length+' products)',delta:0,type:'import',staff:me.name,note:'',at:new Date().toISOString()});
  alert(pv.match+' products updated and '+pv.add+' added.'); B.imp=null; B.view='stock'; render(); };
})();
