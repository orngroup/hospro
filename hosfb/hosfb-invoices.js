/* HosF&B — invoices. Enter a supplier invoice line by line, or photograph it and have it read
   (the photo reader needs the hosfbReadInvoice cloud function – see hosfb-functions/README.md).
   Each saved line becomes a "price paid" and updates the ingredient's last price.
   Matches between a supplier's wording and an ingredient are remembered in hosfb/matches. */
(function(){
let inv=null;
const mkey=(sup,desc)=>(normName(sup)+'_'+normName(desc)).replace(/\s+/g,'_').slice(0,140)||'x';
const base=VIEWS.purchases;
VIEWS.purchases=function(){ const h=base();
  return h.replace('<button class="btn" onclick="editPurchase()">Record a price paid</button>',
   `<button class="btn" onclick="invStart()">Enter an invoice</button><button class="btn jade" onclick="invPhoto()">Read an invoice photo</button><button class="btn ghost" onclick="editPurchase()">One price only</button>`)
   .replace('Enter lines from supplier invoices here for now. The next step is photographing the invoice and having it read automatically.','Every invoice line saved, newest first.'); };
window.invStart=function(data){ inv=Object.assign({supplier:'',invoice:'',date:today(),lines:[]},data||{}); if(!inv.lines.length) inv.lines.push({desc:'',ingId:'',qty:null,total:null});
  inv.lines.forEach(l=>{ if(!l.ingId){ const m=S.matches[mkey(inv.supplier,l.desc)]; if(m&&S.ingredients[m.ingId]){ l.ingId=m.ingId; if(m.factor&&l.srcQty) l.qty=Math.round(l.srcQty*m.factor*1000)/1000; }
      else { const d=Object.values(S.ingredients).find(i=>normName(i.name)===normName(l.desc)); if(d) l.ingId=d.id; } } });
  openSheet(`<h2>Supplier invoice</h2><div class="fg"><label>Supplier<input id="v-sup" value="${esc(inv.supplier)}" onchange="inv_set('supplier',this.value)"></label><label>Invoice number<input id="v-no" value="${esc(inv.invoice)}" onchange="inv_set('invoice',this.value)"></label><label>Invoice date<input id="v-date" type="date" value="${esc(inv.date)}" onchange="inv_set('date',this.value)"></label></div>
   <h3>Lines</h3><p class="muted small" style="margin:0 0 8px">For each line choose the ingredient, the quantity in that ingredient's unit (for example a 5 kg case is 5) and the line total before VAT. Lines left on “Skip” are ignored.</p><div id="v-lines"></div>
   <button class="btn ghost sm" style="margin-top:8px" onclick="inv_add()">Add a line</button>
   <div class="foot"><div id="v-sum" class="muted small"></div><div><button class="btn ghost" onclick="closeSheet()">Cancel</button> <button class="btn" onclick="invSave()">Save prices</button></div></div>`);
  invUI(); };
window.inv_set=(k,v)=>{ inv[k]=v.trim(); };
window.inv_add=()=>{ inv.lines.push({desc:'',ingId:'',qty:null,total:null}); invUI(); };
window.inv_line=(i,k,v)=>{ const l=inv.lines[i]; if(k==='ingId'&&v==='__new'){ const name=(l.desc||'').trim()||prompt('Name of the new ingredient'); if(!name) { invUI(); return; }
    const ing={id:uid('i'),name,cat:'',supplier:inv.supplier||'',unit:'kg',estPrice:null,actPrice:null,yield:100,allergens:[]}; Data.put('ingredients',ing); l.ingId=ing.id; invUI(); return; }
  l[k]=(k==='qty'||k==='total')?num(v):v; if(k==='ingId') invUI(); else invCalc(); };
function invUI(){ const il=ings();
  $('v-lines').innerHTML=`<div class="scroll"><table><tr><th>On the invoice</th><th>Ingredient</th><th>Quantity</th><th>Line total (£)</th><th class="n">Price a unit</th><th></th></tr>${inv.lines.map((l,i)=>{ const ing=S.ingredients[l.ingId];
    return `<tr><td><input value="${esc(l.desc||'')}" placeholder="Description" onchange="inv_line(${i},'desc',this.value)">${l.src?`<span class="muted small">${esc(l.src)}</span>`:''}</td>
     <td><select onchange="inv_line(${i},'ingId',this.value)"><option value="">Skip</option>${il.map(x=>`<option value="${x.id}" ${x.id===l.ingId?'selected':''}>${esc(x.name)} (${esc(x.unit)})</option>`).join('')}<option value="__new">+ New ingredient from this line</option></select></td>
     <td><input type="number" step="any" inputmode="decimal" style="width:90px" value="${l.qty==null?'':l.qty}" oninput="inv_line(${i},'qty',this.value)"> <span class="muted small">${ing?esc(ing.unit):''}</span></td>
     <td><input type="number" step="0.01" inputmode="decimal" style="width:100px" value="${l.total==null?'':l.total}" oninput="inv_line(${i},'total',this.value)"></td>
     <td class="n" id="v-p${i}"></td><td><button class="btn ghost sm" onclick="inv.lines.splice(${i},1);invUI()">✕</button></td></tr>`; }).join('')}</table></div>`;
  window.inv=inv; invCalc(); }
window.invUI=invUI;
function invCalc(){ let n=0, tot=0; inv.lines.forEach((l,i)=>{ const ing=S.ingredients[l.ingId], ok=ing&&l.qty>0&&l.total>0, up=ok?l.total/l.qty:null; if(ok){ n++; tot+=l.total; }
    const v=ok&&ing.estPrice>0?(up-ing.estPrice)/ing.estPrice*100:null; const e=$('v-p'+i); if(e) e.innerHTML=up==null?'–':gbp(up)+(v==null?'':` <span class="pill ${v>S.settings.flagPct?'bad':v<0?'good':''}">${v>0?'+':''}${pct(v)} v estimate</span>`); });
  $('v-sum').textContent=n+' line(s) ready, '+gbp(tot)+' before VAT'; }
window.invSave=async function(){ const good=inv.lines.filter(l=>S.ingredients[l.ingId]&&l.qty>0&&l.total>0); if(!good.length){ alert('Choose an ingredient and enter the quantity and total for at least one line.'); return; }
  const touched=new Set(); let i=0;
  for(const l of good){ const p={id:uid('p')+(i++),date:inv.date||today(),supplier:inv.supplier,invoice:inv.invoice,ingId:l.ingId,qty:l.qty,total:l.total,unitPrice:Math.round(l.total/l.qty*10000)/10000,desc:l.desc||''}; await Data.put('purchases',p); touched.add(l.ingId);
    if(l.desc){ await Data.put('matches',{id:mkey(inv.supplier,l.desc),ingId:l.ingId,factor:l.srcQty>0?l.qty/l.srcQty:null,desc:l.desc,supplier:inv.supplier}); } }
  for(const id of touched) await applyLatest(id);
  closeSheet(); };

/* ---------- photo reader ---------- */
window.invPhoto=function(){ if(!S.settings.fnBase){ openSheet(`<h2>Read an invoice photo</h2><p>This needs the HosF&amp;B cloud function to be switched on first. The steps are in <strong>hosfb-functions/README.md</strong>; once it is deployed, paste its address into All tools → Settings.</p><p class="muted">Until then, use “Enter an invoice” to type the lines.</p><div class="foot"><div></div><button class="btn" onclick="closeSheet()">Close</button></div>`); return; }
  openSheet(`<h2>Read an invoice photo</h2><p class="sub">Take a clear photo of the whole invoice, or choose a PDF. The lines are read for you to check before anything is saved.</p><input id="v-file" type="file" accept="image/*,application/pdf" capture="environment" onchange="invRead(this.files[0])"><p id="v-msg" class="muted"></p><div class="foot"><div></div><button class="btn ghost" onclick="closeSheet()">Cancel</button></div>`); };
window.invRead=async function(f){ if(!f) return; if(f.size>8*1024*1024){ $('v-msg').textContent='That file is over 8 MB. Take the photo at a lower quality or split the PDF.'; return; }
  $('v-msg').textContent='Reading the invoice… this takes up to half a minute.';
  try{ const b64=await new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]); r.onerror=no; r.readAsDataURL(f); });
    const res=await fetch(S.settings.fnBase+'/hosfbReadInvoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mediaType:f.type||'image/jpeg',data:b64})});
    const j=await res.json(); if(!res.ok) throw new Error(j.error||('Error '+res.status));
    invStart({supplier:j.supplier||'',invoice:j.invoiceNumber||'',date:j.date||today(),lines:(j.lines||[]).map(l=>({desc:l.description||'',src:[l.quantity!=null?l.quantity+' × '+(l.pack||l.unit||''):'',l.unitPrice!=null?'at '+gbp(l.unitPrice):''].filter(Boolean).join(' '),srcQty:l.quantity||null,qty:l.totalWeightOrVolume||null,total:l.lineTotal==null?null:l.lineTotal,ingId:''}))});
  }catch(e){ $('v-msg').innerHTML='<span class="bad">Could not read it: '+esc(e.message)+'</span>'; } };
})();
