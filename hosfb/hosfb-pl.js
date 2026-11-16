/* HosF&B — daily P&L.
   Sales by dish come from the order pad (hosfb/orders/list, closed orders) or from a till export
   uploaded for a day (hosfb/sales/days/{date}); a till upload replaces order-pad sales for that day.
   Labour is rota hours (hospro_public/rota) for the chosen departments x an average hourly rate. */
(function(){
addTab('pl','Daily P&L',vPL);
const P={from:addDays(today(),-6),to:today(),orders:null,till:null,rota:null,loading:false,imp:null,key:''};
const DEPTS=[['kitchen','Kitchen'],['restaurant','Restaurant'],['bar','Bar']];
const st=()=>Object.assign({plDepts:['kitchen','restaurant'],rates:{},onCostPct:0,breakMins:0,plumap:{}},S.settings);
async function load(){ const key=P.from+'|'+P.to; if(P.key===key||P.loading) return; P.loading=true;
  let orders=[], till={}, rota=null;
  if(db){
    try{ const q=await sub('orders','list').where('date','>=',P.from).where('date','<=',P.to).get(); orders=q.docs.map(d=>d.data()); }catch(e){ console.warn('orders',e.code); }
    try{ const q=await sub('sales','days').where('date','>=',P.from).where('date','<=',P.to).get(); q.docs.forEach(d=>till[d.id]=d.data()); }catch(e){ console.warn('sales',e.code); }
    try{ const d=await db.collection('hospro_public').doc('rota').get(); if(d.exists) rota=d.data(); }catch(e){ console.warn('rota',e.code); }
  }
  try{ const l=JSON.parse(localStorage.getItem('hosfb_till')||'{}'); Object.keys(l).forEach(k=>{ if(!till[k]&&k>=P.from&&k<=P.to) till[k]=l[k]; }); }catch(e){}
  Object.assign(P,{orders,till,rota,key,loading:false}); if(tab==='pl') render(); }
function dishByName(name){ const m=st().plumap||{}; const k=normName(name); if(m[k]) return S.dishes[m[k]]?m[k]:null; const d=Object.values(S.dishes).find(x=>normName(x.name)===k); return d?d.id:null; }
function dayLines(date){
  const t=P.till[date];
  if(t) return {source:'Till export',orders:t.orders||null,lines:(t.lines||[]).map(l=>({name:l.name,qty:+l.qty||0,gross:+l.gross||0,dishId:dishByName(l.name)}))};
  const os=(P.orders||[]).filter(o=>o.date===date&&o.status==='closed'); const by={};
  os.forEach(o=>(o.lines||[]).forEach(l=>{ const k=l.dishId||('n:'+l.name); const x=by[k]=by[k]||{name:l.name,dishId:l.dishId&&S.dishes[l.dishId]?l.dishId:dishByName(l.name),qty:0,gross:0}; x.qty+=l.qty||0; x.gross+=(l.qty||0)*(l.price||0); }));
  return {source:os.length?'Order pad':'',orders:os.length,covers:os.reduce((t,o)=>t+(o.covers||0),0),lines:Object.values(by)};
}
function vPL(){
  load(); const s=st();
  let h=`<div class="card"><div class="fg" style="grid-template-columns:repeat(4,minmax(0,1fr))"><label>From<input type="date" value="${P.from}" onchange="plRange('from',this.value)"></label><label>To<input type="date" value="${P.to}" onchange="plRange('to',this.value)"></label>
   <label>&nbsp;<button class="btn ghost" onclick="plImport()">Upload till sales for a day</button></label><label>&nbsp;<button class="btn ghost" onclick="plSettings()">Labour settings</button></label></div></div>`;
  if(P.key!==P.from+'|'+P.to) return h+'<div class="card"><p class="muted">Loading…</p></div>';
  const days=[]; for(let d=P.from; d<=P.to; d=addDays(d,1)){ if(days.length>62) break; const dl=dayLines(d); const hrs=C.rotaHours(P.rota,d,s.breakMins); const lab=C.labourCost(hrs,s); const pl=C.dayPL(dl.lines,S,lab); days.push({d,dl,hrs,lab,pl}); }
  const T=days.reduce((t,x)=>{ t.sales+=x.pl.sales; t.food+=x.pl.food; t.lab+=x.pl.labour||0; t.orders+=x.dl.orders||0; t.un+=x.pl.unmatched; t.unc+=x.pl.uncosted; if(x.pl.foodAct!=null){ t.act+=x.pl.foodAct; t.anyAct=true; } else t.act+=x.pl.food; if(x.lab&&x.lab.missing) t.miss=true; if(x.pl.sales>0&&!x.hrs) t.noRota++; return t; },{sales:0,food:0,act:0,lab:0,orders:0,un:0,unc:0,anyAct:false,miss:false,noRota:0});
  const profit=T.sales-T.food-T.lab;
  const warn=[]; if(T.miss||!Object.keys(s.rates||{}).length) warn.push('No hourly rates are set, so labour shows as £0. Add them in Labour settings.'); if(T.noRota) warn.push(T.noRota+' day(s) with sales have no rota loaded.'); if(T.un) warn.push('Some items sold are not matched to a dish, so they have no food cost. Match them in the table at the bottom.'); if(T.unc) warn.push('Some dishes sold have no cost yet.');
  h+=(warn.length?`<div class="banner">${warn.map(esc).join('<br>')}</div>`:'')+`<div class="tiles">
   <div class="tile"><div class="l">Sales, net of VAT</div><div class="v">${gbp(T.sales)}</div><div class="d">${T.orders?T.orders+(T.orders===1?' order':' orders')+' on the order pad':'&nbsp;'}</div></div>
   <div class="tile"><div class="l">Food cost</div><div class="v">${gbp(T.food)}</div><div class="d">${pct(T.sales?T.food/T.sales*100:null)} of sales${T.anyAct?' · '+gbp(T.act)+' at prices paid':''}</div></div>
   <div class="tile"><div class="l">Labour from the rota</div><div class="v">${gbp(T.lab)}</div><div class="d">${pct(T.sales?T.lab/T.sales*100:null)} of sales · ${s.plDepts.join(', ')}</div></div>
   <div class="tile"><div class="l">Profit after food and labour</div><div class="v ${profit<0?'bad':'good'}">${gbp(profit)}</div><div class="d">${pct(T.sales?profit/T.sales*100:null)} of sales${T.orders?' · '+gbp(profit/T.orders)+' an order':''}</div></div></div>
  <div class="card"><h2>By day</h2><p class="sub">Labour is every rostered hour for the chosen departments, so quiet days show their true cost. Profit an order is the day's profit shared equally across its orders.</p><div class="scroll"><table><tr><th>Day</th><th>Sales from</th><th class="n">Items</th><th class="n">Sales (net)</th><th class="n">Food cost</th><th class="n">Food %</th><th class="n">Rota hours</th><th class="n">Labour</th><th class="n">Profit</th><th class="n">An order</th></tr>
  ${days.map(x=>`<tr class="click" onclick="plDay('${x.d}')"><td>${fmtDate(x.d)}</td><td>${esc(x.dl.source||'–')}</td><td class="n">${x.pl.qty||'–'}</td><td class="n">${x.pl.sales?gbp(x.pl.sales):'–'}</td><td class="n">${x.pl.sales?gbp(x.pl.food):'–'}</td><td class="n">${pct(x.pl.foodPct)}</td><td class="n">${x.lab?Math.round(x.lab.hours*10)/10:'–'}</td><td class="n">${x.lab?gbp(x.lab.cost):'–'}</td><td class="n ${x.pl.profit<0?'bad':''}">${x.pl.sales||x.lab?gbp(x.pl.profit):'–'}</td><td class="n">${x.dl.orders?gbp(x.pl.profit/x.dl.orders):'–'}</td></tr>`).join('')}
  <tr class="tot"><td colspan="3">Total</td><td class="n">${gbp(T.sales)}</td><td class="n">${gbp(T.food)}</td><td class="n">${pct(T.sales?T.food/T.sales*100:null)}</td><td></td><td class="n">${gbp(T.lab)}</td><td class="n">${gbp(profit)}</td><td class="n">${T.orders?gbp(profit/T.orders):'–'}</td></tr></table></div></div>`;
  const by={}; days.forEach(x=>x.pl.rows.forEach(r=>{ const k=r.dishId||('n:'+r.name); const a=by[k]=by[k]||{name:r.name,dishId:r.dishId,qty:0,net:0,cost:0,costed:r.cost!=null}; a.qty+=r.qty; a.net+=r.net; a.cost+=r.cost||0; }));
  const rows=Object.values(by).sort((a,b)=>b.net-a.net);
  h+=`<div class="card"><h2>By dish</h2><p class="sub">What sold in this period, with the profit each dish brought in before labour. A till export may include drinks; they count as sales but have no food cost.</p><div class="scroll"><table><tr><th>Dish</th><th class="n">Sold</th><th class="n">Sales (net)</th><th class="n">Food cost</th><th class="n">Profit</th><th class="n">GP</th></tr>
  ${rows.map(r=>`<tr><td>${esc(r.name)}${r.dishId?'':` <span class="pill warn">Not matched</span> <select style="max-width:210px;display:inline-block;padding:4px 6px;font-size:13px" onchange="plMatch('${esc(normName(r.name))}',this.value)"><option value="">Match to a dish…</option>${dishes().map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select>`}</td><td class="n">${r.qty}</td><td class="n">${gbp(r.net)}</td><td class="n">${r.costed?gbp(r.cost):'–'}</td><td class="n">${r.costed?gbp(r.net-r.cost):'–'}</td><td class="n ${r.costed?gpClass(C.gp(r.net,r.cost)):''}">${r.costed?pct(C.gp(r.net,r.cost)):'–'}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No sales in this period yet. Sales appear when orders are closed on the order pad, or when a till export is uploaded.</td></tr>'}</table></div></div>`;
  return h;
}
window.plRange=(k,v)=>{ if(!v) return; P[k]=v; if(P.from>P.to){ if(k==='from') P.to=v; else P.from=v; } render(); };
window.plMatch=async function(key,dishId){ if(!dishId) return; const m=Object.assign({},st().plumap,{[key]:dishId}); await Data.settings({plumap:m}); render(); };
window.plDay=function(d){ const dl=dayLines(d), s=st(), hrs=C.rotaHours(P.rota,d,s.breakMins), lab=C.labourCost(hrs,s), pl=C.dayPL(dl.lines,S,lab);
  openSheet(`<h2>${fmtDate(d)}</h2><table><tr><td>Sales, net of VAT (${esc(dl.source||'none')})</td><td class="n">${gbp(pl.sales)}</td></tr><tr><td>Food cost at the chef's costs</td><td class="n">${gbp(pl.food)}</td></tr>${pl.foodAct!=null?`<tr><td>Food cost at prices paid</td><td class="n">${gbp(pl.foodAct)}</td></tr>`:''}
   <tr><td>Labour${hrs?' – '+DEPTS.filter(x=>s.plDepts.includes(x[0])).map(x=>x[1]+' '+(Math.round((hrs[x[0]]||0)*10)/10)+' h').join(', '):' – no rota for this day'}</td><td class="n">${lab?gbp(lab.cost):'–'}</td></tr><tr class="tot"><td>Profit after food and labour</td><td class="n">${gbp(pl.profit)}</td></tr>${pl.profitAct!=null?`<tr><td>Profit at prices paid</td><td class="n">${gbp(pl.profitAct)}</td></tr>`:''}</table>
   <h3>Items sold</h3><div class="scroll" style="max-height:300px;overflow:auto"><table><tr><th>Item</th><th class="n">Sold</th><th class="n">Net</th><th class="n">Cost</th></tr>${pl.rows.map(r=>`<tr><td>${esc(r.name)}</td><td class="n">${r.qty}</td><td class="n">${gbp(r.net)}</td><td class="n">${gbp(r.cost)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Nothing sold.</td></tr>'}</table></div>
   <div class="foot"><div>${P.till[d]?`<button class="btn danger" onclick="plDropTill('${d}')">Remove the till upload for this day</button>`:''}</div><div>${S.settings.fnBase&&pl.sales>0&&window.xeroPost?`<button class="btn ghost" onclick="xeroPost('${d}',${Math.round(pl.sales*100)/100})">Send to Xero as a draft</button> `:''}<button class="btn" onclick="closeSheet()">Close</button></div></div>`); };
window.plDropTill=async function(d){ if(!confirm('Remove the uploaded till sales for this day?')) return; delete P.till[d]; try{ const l=JSON.parse(localStorage.getItem('hosfb_till')||'{}'); delete l[d]; localStorage.setItem('hosfb_till',JSON.stringify(l)); }catch(e){}
  if(db&&cloud){ try{ await sub('sales','days').doc(d).delete(); }catch(e){} } closeSheet(); };
window.plSettings=function(){ const s=st();
  openSheet(`<h2>Labour settings</h2><p class="sub">HosF&amp;B uses one average hourly rate for each department, not each person's pay, so no individual pay is stored here. Take the averages from payroll.</p>
   <h3>Departments counted in the food P&amp;L</h3><div class="alg">${DEPTS.map(([k,l])=>`<label><input type="checkbox" name="pl-d" value="${k}" ${s.plDepts.includes(k)?'checked':''}>${l}</label>`).join('')}</div>
   <h3>Average hourly rate (£)</h3><div class="fg">${DEPTS.map(([k,l])=>`<label>${l}<input id="pl-r-${k}" type="number" step="0.01" value="${s.rates[k]==null?'':s.rates[k]}"></label>`).join('')}
   <label>Employer costs on top (%), for example National Insurance and pension<input id="pl-on" type="number" step="0.1" value="${s.onCostPct||0}"></label>
   <label>Unpaid break taken off each shift (minutes)<input id="pl-br" type="number" value="${s.breakMins||0}"></label></div>
   <div class="foot"><div></div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" onclick="plSaveSettings()">Save</button></div></div>`); };
window.plSaveSettings=async function(){ const rates={}; DEPTS.forEach(([k])=>{ const v=num($('pl-r-'+k).value); if(v!=null) rates[k]=v; });
  await Data.settings({plDepts:checked('pl-d'),rates,onCostPct:num($('pl-on').value)||0,breakMins:num($('pl-br').value)||0}); closeSheet(); };

/* ---------- till sales upload ---------- */
window.plImport=function(){ P.imp=null; openSheet(`<h2>Upload till sales for a day</h2><p class="sub">Export the product (PLU) sales report for one day from Access EPoS Manager as CSV or Excel and choose it here. It replaces order-pad sales for that day.</p>
   <div class="fg"><label>Trading day<input id="ti-date" type="date" value="${addDays(today(),-1)}"></label><label>File<input type="file" accept=".csv,.xlsx,.xls" onchange="plImportFile(this.files[0])"></label></div><div id="ti-body"></div>
   <div class="foot"><div></div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" id="ti-go" disabled onclick="plImportSave()">Save these sales</button></div></div>`); };
window.plImportFile=async function(f){ if(!f) return; try{ const rows=(await readSheet(f)).filter(r=>r.some(c=>String(c).trim()!==''));
  let hi=0; for(let i=0;i<Math.min(rows.length,20);i++){ if(rows[i].filter(c=>typeof c==='string'&&c.trim()).length>=2&&rows[i].some(c=>/qty|quant|sold|sales|value|net|gross|amount|total/i.test(String(c)))){ hi=i; break; } }
  const hdr=rows[hi].map(x=>String(x)); P.imp={hdr,rows:rows.slice(hi+1),name:guessCol(hdr,/descr|product|item|plu name|name/),qty:guessCol(hdr,/qty|quant|sold|count/),val:guessCol(hdr,/gross|net|value|sales|amount|total/),incVat:!/net|ex/i.test(hdr[guessCol(hdr,/gross|net|value|sales|amount|total/)]||'')}; plImportUI();
  }catch(e){ alert('Could not read that file: '+e.message); } };
window.plImportSet=(k,v)=>{ P.imp[k]=k==='incVat'?v==='1':+v; plImportUI(); };
function impLines(){ const I=P.imp, vat=1+(S.settings.vat||0)/100, n=v=>{ const x=parseFloat(String(v).replace(/[£,]/g,'')); return isNaN(x)?0:x; }; const by={};
  I.rows.forEach(r=>{ const name=String(r[I.name]||'').trim(), q=n(r[I.qty]); if(!name||!(q>0)||/^total|^grand/i.test(name)) return; const g=I.val>=0?n(r[I.val])*(I.incVat?1:vat):0; const x=by[name]=by[name]||{name,qty:0,gross:0}; x.qty+=q; x.gross+=g; });
  return Object.values(by).map(l=>Object.assign(l,{gross:Math.round(l.gross*100)/100})); }
function plImportUI(){ const I=P.imp; const sel=(k,l)=>`<label>${l}<select onchange="plImportSet('${k}',this.value)"><option value="-1">Not in this file</option>${I.hdr.map((x,i)=>`<option value="${i}" ${I[k]===i?'selected':''}>${esc(x||('Column '+(i+1)))}</option>`).join('')}</select></label>`;
  const ok=I.name>=0&&I.qty>=0, ls=ok?impLines():[], matched=ls.filter(l=>dishByName(l.name)).length;
  $('ti-body').innerHTML=`<h3>Which column is which</h3><div class="fg">${sel('name','Item name')}${sel('qty','Quantity sold')}${sel('val','Sales value')}<label>The sales value<select onchange="plImportSet('incVat',this.value)"><option value="1" ${I.incVat?'selected':''}>includes VAT</option><option value="0" ${I.incVat?'':'selected'}>is before VAT</option></select></label></div>
   ${ok?`<p style="margin-top:12px"><strong>${ls.length}</strong> items, ${matched} matched to HosF&amp;B dishes by name. The rest (drinks, or dishes named differently on the till) can be matched afterwards on the Daily P&amp;L tab.</p><div class="scroll" style="max-height:220px;overflow:auto"><table><tr><th>Item</th><th class="n">Sold</th><th class="n">Value inc. VAT</th><th>Dish</th></tr>${ls.slice(0,80).map(l=>`<tr><td>${esc(l.name)}</td><td class="n">${l.qty}</td><td class="n">${gbp(l.gross)}</td><td>${dishByName(l.name)?'<span class="pill good">Matched</span>':'<span class="pill warn">Not matched</span>'}</td></tr>`).join('')}</table></div>`:'<p class="muted">Choose the item name and quantity columns.</p>'}`;
  $('ti-go').disabled=!ok||!ls.length; }
window.plImportSave=async function(){ const d=$('ti-date').value; if(!d){ alert('Choose the trading day.'); return; } const rec={date:d,source:'till',lines:impLines(),uploadedBy:me.name,uploadedAt:new Date().toISOString()};
  P.till[d]=rec; try{ const l=JSON.parse(localStorage.getItem('hosfb_till')||'{}'); l[d]=rec; localStorage.setItem('hosfb_till',JSON.stringify(l)); }catch(e){}
  if(db&&cloud){ try{ await sub('sales','days').doc(d).set(rec); }catch(e){ alert('Saved on this device, but not to the cloud ('+(e.code||e.message)+').'); } }
  if(d<P.from) P.from=d; if(d>P.to) P.to=d; P.key=''; closeSheet(); };
})();
