/* HosF&B — Xero link (screen side). Talks to the hosfbXero… cloud functions.
   The admin key is kept on this device only (never in the database). */
(function(){
const key=()=>localStorage.getItem('hosfb_adminkey')||'';
const base=VIEWS.tools;
VIEWS.tools=function(){ const fn=S.settings.fnBase;
  return base()+`<div class="card"><h2>Xero</h2>${fn?`<p class="sub">Sends a day's food sales to Xero as a draft sales invoice for the accounts team to approve, and can pull supplier bills. Directors only: it needs the admin key chosen when the functions were set up.</p>
   <div class="fg"><label>Admin key (kept on this device only)<input type="password" value="${esc(key())}" onchange="localStorage.setItem('hosfb_adminkey',this.value.trim())"></label>
   <label>Xero sales account code for food<input value="${esc(S.settings.xeroSalesAccount||'')}" placeholder="For example: 200" onchange="Data.settings({xeroSalesAccount:this.value.trim()})"></label></div>
   <div class="row" style="margin-top:12px"><button class="btn" onclick="xeroConnect()">Connect to Xero</button><button class="btn ghost" onclick="xeroStatus()">Check the connection</button></div><p id="x-msg" class="muted"></p>`
   :'<p class="sub">Not set up yet. Deploy the cloud functions (hosfb-functions/README.md), then paste their address into Settings above.</p>'}</div>`; };
async function call(name,opts){ const r=await fetch(S.settings.fnBase+'/'+name,Object.assign({headers:{'Content-Type':'application/json','x-hosfb-key':key()}},opts||{})); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||('Error '+r.status)); return j; }
window.xeroConnect=function(){ if(!key()){ alert('Enter the admin key first.'); return; } window.open(S.settings.fnBase+'/hosfbXeroConnect?key='+encodeURIComponent(key()),'_blank'); };
window.xeroStatus=async function(){ const m=$('x-msg'); m.textContent='Checking…'; try{ const j=await call('hosfbXeroStatus'); m.textContent=j.connected?'Connected to '+j.organisation+'.':'Not connected yet.'; }catch(e){ m.innerHTML='<span class="bad">'+esc(e.message)+'</span>'; } };
window.xeroPost=async function(date,net){ if(!key()){ alert('Enter the admin key on the All tools tab first.'); return; } if(!S.settings.xeroSalesAccount){ alert('Set the Xero sales account code on the All tools tab first.'); return; }
  if(!confirm('Send food sales of '+gbp(net)+' (before VAT) for '+fmtDate(date)+' to Xero as a draft invoice?')) return;
  try{ await call('hosfbXeroPostSales',{method:'POST',body:JSON.stringify({date,net,accountCode:S.settings.xeroSalesAccount})}); alert('Sent. It is in Xero as a draft sales invoice, reference HOSFB-'+date+'.'); }catch(e){ alert('Not sent: '+e.message); } };
})();
