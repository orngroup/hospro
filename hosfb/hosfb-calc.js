/* HosF&B — costing and P&L calculations (shared by the page and its tests).
   All menu prices include VAT; all costs and ingredient prices are before VAT.
   GP% = (net price − food cost) ÷ net price. */
(function(root){
const ALLERGENS={Ce:'Celery',Cr:'Crustaceans',E:'Eggs',F:'Fish',G:'Gluten',L:'Lupin',Mi:'Milk',Mo:'Molluscs',Mu:'Mustard',P:'Peanuts',Se:'Sesame',So:'Soya',Su:'Sulphites',TN:'Tree nuts'};
const SPLIT={starter:25,main:50,dessert:25};
const FACT={kg:1000,g:1,litre:1000,ml:1,each:1};
const FAMILY={kg:['g','kg'],litre:['ml','litre'],each:['each']};
const unitsFor=u=>FAMILY[u]||['each'];
const r2=v=>Math.round(v*100)/100;

/* cost of one recipe line; which = 'est' (chef's price) or 'act' (last paid, falling back to the estimate) */
function lineCost(line,ing,which){
  if(!ing||!(line.qty>0)) return null;
  let price=which==='act'&&ing.actPrice!=null?ing.actPrice:ing.estPrice;
  if(price==null) return null;
  const unit=unitsFor(ing.unit).includes(line.unit)?line.unit:ing.unit;
  const qtyInIngUnit=line.qty*FACT[unit]/FACT[ing.unit];
  return qtyInIngUnit*price/((ing.yield||100)/100);
}
/* cost a portion. Recipe wins over the typed estimate. 'act' returns null unless something actual is known. */
function dishCost(d,S,which){
  const rec=d.recipe||[];
  if(rec.length){
    let tot=0, anyAct=false;
    for(const l of rec){ const ing=S.ingredients[l.ingId]; const c=lineCost(l,ing,which); if(c==null) return null; tot+=c; if(ing.actPrice!=null) anyAct=true; }
    if(which==='act'&&!anyAct) return null;
    return tot/(d.portions||1);
  }
  if(which==='act') return d.actCost==null?null:d.actCost;
  return d.estCost==null?null:d.estCost;
}
function dishAllergens(d,S){
  const s=new Set(d.allergens||[]);
  (d.recipe||[]).forEach(l=>{ const i=S.ingredients[l.ingId]; if(i) (i.allergens||[]).forEach(a=>s.add(a)); });
  return [...s].sort();
}
/* % the last price paid is above (+) or below (−) the chef's estimate */
function ingVar(i){ if(i.actPrice==null||!(i.estPrice>0)) return null; return (i.actPrice-i.estPrice)/i.estPrice*100; }
function courseType(c){ c=String(c||'').toLowerCase();
  if(/starter|savoury/.test(c)) return 'starter';
  if(/dessert|sweet|pudding|scone/.test(c)) return 'dessert';
  if(/main|roast|grill|sunday/.test(c)) return 'main';
  return 'other'; }
/* which menu sections a set price includes; saved choice wins, otherwise a sensible default from its name */
function optionCourses(o,secs){
  if(o.courses) return o.courses.filter(s=>secs.includes(s));
  const l=String(o.label||'').toLowerCase();
  if(/two/.test(l)) return secs.filter(s=>courseType(s)!=='dessert');
  if(/^main$/.test(l.trim())) return secs.filter(s=>courseType(s)==='main'||courseType(s)==='other');
  return secs.slice();
}
const net=(price,S)=>price==null?null:price/(1+(S.settings.vat||0)/100);
const gp=(n,c)=>n==null||c==null||!(n>0)?null:(n-c)/n*100;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

function menuPL(m,S){
  const set=m.mode==='set';
  const lines=m.items.map((it,idx)=>{ const dish=S.dishes[it.dishId]; if(!dish) return null;
    return {idx,dish,course:it.course||dish.course||'Other',price:it.price,sold:it.sold||0,estCost:dishCost(dish,S,'est'),actCost:dishCost(dish,S,'act')}; }).filter(Boolean);
  const secs=[...new Set(lines.map(l=>l.course))];
  const out={lines,options:[],estGP:null,actGP:null,weekSales:0,weekProfit:0};
  if(set){
    const full=(m.setPrices||[]).slice().sort((a,b)=>b.price-a.price)[0];
    const fullSecs=full?optionCourses(full,secs):secs;
    const w={}; let wt=0; fullSecs.forEach(s=>{ const t=courseType(s); w[s]=SPLIT[t]||25; wt+=w[s]; });
    lines.forEach(l=>{ l.price=full&&w[l.course]?r2(full.price*w[l.course]/wt):null; });
    out.options=(m.setPrices||[]).map(o=>{ const inc=optionCourses(o,secs); const n=net(o.price,S);
      let est=0,act=0,best=0,worst=0,ok=true;
      inc.forEach(s=>{ const ls=lines.filter(l=>l.course===s); const e=ls.map(l=>l.estCost).filter(v=>v!=null);
        if(!e.length){ ok=false; return; } est+=avg(e); best+=Math.min(...e); worst+=Math.max(...e);
        const a=ls.map(l=>l.actCost!=null?l.actCost:l.estCost).filter(v=>v!=null); act+=avg(a); });
      const anyAct=inc.some(s=>lines.some(l=>l.course===s&&l.actCost!=null));
      return {label:o.label,price:o.price,net:n,estCost:ok?est:null,estProfit:ok?n-est:null,estGP:ok?gp(n,est):null,
        actProfit:ok&&anyAct?n-act:null,actGP:ok&&anyAct?gp(n,act):null,best:ok?n-best:null,worst:ok?n-worst:null}; });
    const top=out.options.slice().sort((a,b)=>b.price-a.price)[0];
    if(top){ out.estGP=top.estGP; out.actGP=top.actGP; if(top.estProfit!=null&&m.covers>0){ out.weekProfit=top.estProfit*m.covers; out.weekSales=top.net*m.covers; } }
  }
  let nS=0,cS=0,nA=0,cA=0,nU=0,cU=0;
  const anySold=lines.some(l=>l.sold>0);
  lines.forEach(l=>{ l.net=net(l.price,S);
    l.estProfit=l.net!=null&&l.estCost!=null?l.net-l.estCost:null; l.estGP=gp(l.net,l.estCost); l.actGP=gp(l.net,l.actCost);
    l.weekProfit=!set&&l.estProfit!=null?l.estProfit*l.sold:0;
    if(!set&&l.net!=null){ if(l.estCost!=null){ nU+=l.net; cU+=l.estCost; if(l.sold>0){ nS+=l.net*l.sold; cS+=l.estCost*l.sold; } }
      if(l.actCost!=null){ const q=anySold?l.sold:1; nA+=l.net*q; cA+=l.actCost*q; }
      if(l.sold>0){ out.weekSales+=l.net*l.sold; out.weekProfit+=l.weekProfit; } } });
  if(!set){ out.estGP=nS>0?gp(nS,cS):gp(nU,cU); out.actGP=nA>0?gp(nA,cA):null; }
  return out;
}

/* ---------- events ---------- */
/* ev = {covers, pricePerHead (inc VAT), lines:[{dishId | name+cost, qty}], extras:[{name,total}], staff:[{desc,hours,rate}]} */
function eventPL(ev,S){
  const covers=ev.covers||0, n=net(ev.pricePerHead,S), sales=n==null?null:n*covers;
  let est=0, act=0, anyAct=false, uncosted=0;
  const lines=(ev.lines||[]).map(l=>{ const d=l.dishId?S.dishes[l.dishId]:null;
    const e=d?dishCost(d,S,'est'):(l.cost==null?null:l.cost), a=d?dishCost(d,S,'act'):null, q=l.qty||0;
    if(e==null) uncosted++; else est+=e*q; if(a!=null) anyAct=true; act+=(a!=null?a:(e||0))*q;
    return {name:d?d.name:(l.name||'Custom item'),qty:q,estCost:e,actCost:a,estTotal:e==null?null:e*q}; });
  const other=(ev.extras||[]).reduce((t,x)=>t+(x.total||0),0);
  const staff=(ev.staff||[]).reduce((t,x)=>t+(x.hours||0)*(x.rate||0),0);
  const out={lines,covers,net:n,sales,food:est,foodAct:anyAct?act:null,other,staff,uncosted};
  out.foodGP=gp(sales,est); out.profit=sales==null?null:sales-est-other-staff; out.margin=sales>0?out.profit/sales*100:null;
  out.profitAct=sales==null||!anyAct?null:sales-act-other-staff;
  out.perHeadCost=covers>0?(est+other+staff)/covers:null; out.perHeadFood=covers>0?est/covers:null;
  return out;
}
/* ---------- rota and daily P&L ---------- */
/* "07:30-15:30" -> 8 ; "off" or anything else -> 0 ; overnight shifts roll past midnight */
function shiftHours(s,breakMins){
  const m=/^\s*(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\s*$/.exec(String(s||'')); if(!m) return 0;
  let a=+m[1]*60+ +m[2], b=+m[3]*60+ +m[4]; if(b<=a) b+=1440;
  return Math.max(0,(b-a-(breakMins||0))/60);
}
/* rota = hospro_public/rota {staff:[{id,dept}], rota:{date:{staffId:shift}}}; returns hours by dept for one date */
function rotaHours(rota,date,breakMins){
  const out={}, day=(rota&&rota.rota&&rota.rota[date])||null; if(!day) return null;
  (rota.staff||[]).forEach(p=>{ const h=shiftHours(day[p.id],breakMins); if(h>0) out[p.dept]=(out[p.dept]||0)+h; });
  return out;
}
function labourCost(hoursByDept,st){
  if(!hoursByDept) return null; const on=1+(st.onCostPct||0)/100; let t=0, missing=false;
  (st.plDepts||['kitchen','restaurant']).forEach(d=>{ const h=hoursByDept[d]||0; const r=st.rates&&st.rates[d]; if(h>0&&!(r>0)) missing=true; t+=h*(r||0)*on; });
  return {cost:t,missing,hours:(st.plDepts||['kitchen','restaurant']).reduce((x,d)=>x+(hoursByDept[d]||0),0)};
}
/* lines = [{name,dishId,qty,gross}] for one day */
function dayPL(lines,S,labour){
  let sales=0,est=0,act=0,anyAct=false,unmatched=0,uncosted=0,qty=0;
  const rows=lines.map(l=>{ const d=l.dishId?S.dishes[l.dishId]:null; const n=net(l.gross,S)||0; sales+=n; qty+=l.qty||0;
    const e=d?dishCost(d,S,'est'):null, a=d?dishCost(d,S,'act'):null;
    if(!d) unmatched++; else if(e==null) uncosted++;
    if(e!=null) est+=e*l.qty; if(a!=null) anyAct=true; act+=(a!=null?a:(e||0))*l.qty;
    return {name:d?d.name:l.name,dishId:l.dishId||null,qty:l.qty,net:n,cost:e==null?null:e*l.qty,actCost:a==null?null:a*l.qty}; });
  const lab=labour?labour.cost:null;
  return {rows,sales,qty,food:est,foodAct:anyAct?act:null,foodPct:sales>0?est/sales*100:null,labour:lab,labourPct:sales>0&&lab!=null?lab/sales*100:null,
    profit:sales-est-(lab||0),profitAct:anyAct?sales-act-(lab||0):null,unmatched,uncosted};
}

/* ---------- table bookings ---------- */
const BOOK_DEFAULT={on:true,slotMins:30,maxPerSlot:20,maxParty:10,leadHours:2,daysAhead:90,preorder:true,preorderMenus:[],notifyEmail:'',
  services:[{name:'Dinner',days:[0,1,2,3,4,5,6],from:'18:00',to:'20:30'},{name:'Sunday lunch',days:[0],from:'12:00',to:'15:00'}],closed:[]};
const bookCfg=st=>Object.assign({},BOOK_DEFAULT,(st&&st.booking)||{});
const hm=t=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(String(t)); return m?+m[1]*60+ +m[2]:null; };
const fmtHM=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
/* every bookable time on a date: [{time:'18:00',service:'Dinner'}], earliest first */
function bookingSlots(cfg,date){
  if((cfg.closed||[]).includes(date)) return [];
  const dow=new Date(date+'T12:00:00').getDay(), step=Math.max(5,cfg.slotMins||30), out=[];
  (cfg.services||[]).forEach(sv=>{ if(!(sv.days||[]).includes(dow)) return; const a=hm(sv.from), b=hm(sv.to); if(a==null||b==null) return;
    for(let t=a;t<=b;t+=step) if(!out.some(x=>x.time===fmtHM(t))) out.push({time:fmtHM(t),service:sv.name}); });
  return out.sort((x,y)=>x.time.localeCompare(y.time));
}
/* covers still free in a slot; avail = {date:{time:coversBooked}} */
function slotLeft(cfg,avail,date,time){ const used=((avail||{})[date]||{})[time]||0; return Math.max(0,(cfg.maxPerSlot||0)-used); }
/* slots a party can book: enough room, and not inside the lead time (nowMs = Date.now()) */
function openSlots(cfg,avail,date,party,nowMs){
  return bookingSlots(cfg,date).filter(s=>{ const at=new Date(date+'T'+s.time+':00').getTime(); return at-nowMs>=(cfg.leadHours||0)*3600000&&slotLeft(cfg,avail,date,s.time)>=party; });
}
/* totals of pre-ordered dishes across bookings: [{name,course,qty}] */
function preorderTotals(bookings){ const by={};
  bookings.forEach(b=>{ if(b.status==='cancelled'||b.status==='no-show') return; (b.preorder||[]).forEach(l=>{ const k=l.dishId||l.name; const x=by[k]=by[k]||{name:l.name,course:l.course||'',qty:0}; x.qty+=l.qty||0; }); });
  return Object.values(by).sort((a,b)=>String(a.course).localeCompare(String(b.course))||a.name.localeCompare(b.name)); }
const api={ALLERGENS,SPLIT,unitsFor,lineCost,dishCost,dishAllergens,ingVar,courseType,optionCourses,menuPL,eventPL,shiftHours,rotaHours,labourCost,dayPL,net,gp,BOOK_DEFAULT,bookCfg,bookingSlots,slotLeft,openSlots,preorderTotals};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.HOSFB_CALC=api;
})(typeof window!=='undefined'?window:globalThis);
