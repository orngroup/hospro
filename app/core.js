/* ============================================================
   HosPRO Mobile — core: users, departments, login, router,
   shared helpers (Firestore, photos, sheets, toast).
   Loads after: firebase-app-compat, firebase-firestore-compat,
   firebase-config.js, hoshouse-config.js (the shared HH store).
   ============================================================ */
(function(){
"use strict";

/* ---------- icon set (inline SVG, 24px grid, stroke) ---------- */
const ICONS={
  home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  overview:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  house:'<path d="M4 20h16"/><path d="M6 20V9l6-5 6 5v11"/><path d="M10 20v-5h4v5"/><path d="M9 12h6"/>',
  fix:'<path d="M14.7 6.3a4 4 0 0 0-5.3 5L4 16.7 7.3 20l5.4-5.4a4 4 0 0 0 5-5.3l-2.5 2.5-2.1-.6-.6-2.1z"/>',
  rec:'<path d="M4 18h16"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M12 11V9"/><path d="M10 9h4"/>',
  fb:'<path d="M7 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M9 13v8"/><path d="M16 3c-2 1.5-2 6 0 8v10"/>',
  sales:'<path d="M4 19l5-6 4 3 7-8"/><path d="M16 8h4v4"/>',
  fire:'<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>',
  comp:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  rota:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  management:'<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19l1-5.8L3.5 9.2l5.9-.9z"/>',
  housekeeping:'<path d="M14 3l-5 5"/><path d="M9 8l-5 5 4 4 5-5z"/><path d="M4 13l4 4"/><path d="M14 3l7 7"/>',
  maintenance:'<path d="M14.7 6.3a4 4 0 0 0-5.3 5L4 16.7 7.3 20l5.4-5.4a4 4 0 0 0 5-5.3l-2.5 2.5-2.1-.6-.6-2.1z"/>',
  reception:'<path d="M4 18h16"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M12 11V9"/><path d="M10 9h4"/>',
  fbdept:'<path d="M7 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M9 13v8"/><path d="M16 3c-2 1.5-2 6 0 8v10"/>',
  salesdept:'<path d="M4 19l5-6 4 3 7-8"/><path d="M16 8h4v4"/>'
};
function icon(name, size){ const p=ICONS[name]; if(!p) return esc(name); return `<svg viewBox="0 0 24 24" width="${size||22}" height="${size||22}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`; }

/* ---------- departments ---------- */
const DEPTS = {
  management:   { id:'management',   name:'Management',     icon:'management', colour:'#1F3864', desc:'Directors & managers' },
  housekeeping: { id:'housekeeping', name:'Housekeeping',   icon:'housekeeping', colour:'#2E6B5E', desc:'Rooms & public areas' },
  maintenance:  { id:'maintenance',  name:'Maintenance',    icon:'maintenance', colour:'#EA7A1E', desc:'Fixers & engineers' },
  reception:    { id:'reception',    name:'Reception',      icon:'reception', colour:'#3B6585', desc:'Front office & nights' },
  fb:           { id:'fb',           name:'Food & Beverage',icon:'fbdept', colour:'#6E4E7A', desc:'Restaurant, bar & kitchen' },
  sales:        { id:'sales',        name:'Sales & Events', icon:'salesdept', colour:'#7A6538', desc:'Enquiries & marketing' }
};
const DEPT_ORDER = ['management','housekeeping','maintenance','reception','fb','sales'];

/* ---------- modules (what a tile opens) ---------- */
const MODULES = [
  { id:'manage', name:'Overview',        icon:'overview', colour:'#1F3864', desc:'Every department at a glance', tiers:['admin'] },
  { id:'house',  name:'Housekeeping',    icon:'house', colour:'#2E6B5E', desc:'Rooms, cleaning & checks' },
  { id:'fix',    name:'Maintenance',     icon:'fix', colour:'#EA7A1E', desc:'Faults, jobs & costs' },
  { id:'rec',    name:'Reception',       icon:'rec', colour:'#3B6585', desc:'Reports, requests & incidents' },
  { id:'fb',     name:'Food & Beverage', icon:'fb', colour:'#6E4E7A', desc:'Daily figures & menus' },
  { id:'sales',  name:'Sales & Events',  icon:'sales', colour:'#7A6538', desc:'Enquiries & pipeline' },
  { id:'fire',   name:'Fire Safety',     icon:'fire', colour:'#B3261E', desc:'Alarm tests, drills & checks' },
  { id:'comp',   name:'Compliance',      icon:'comp', colour:'#4B5288', desc:'Scheduled tasks & actions' },
  { id:'rota',   name:'My Rota',         icon:'rota', colour:'#55744F', desc:'Shifts & attendance' }
];

/* What each department can open. Managers (tier admin) open everything. */
const DEPT_MODULES = {
  management:   ['manage','house','fix','rec','fb','sales','fire','comp','rota'],
  housekeeping: ['house','fix','rota'],
  maintenance:  ['fix','fire','comp','rota'],
  reception:    ['rec','house','fix','fire','rota'],
  fb:           ['fb','fix','fire','rota'],
  sales:        ['sales','fire','rota']
};

/* ---------- user directory (seed) ----------
   Carries over today's PINs: HosFIX (Raj 0000, Ajay 1111, Glenn 2222, Herman 3333,
   Pete 4444) and HosHOUSE (Ruth 1001, Laith 1016). Reporters keep today's default
   (9999) until changed in Settings → Users. Housekeepers are merged in at runtime
   from the shared HosHOUSE staff list so there is one source of truth.
   hhId  = the HosHOUSE account this person uses (auto sign-in there).
   fixId = the HosFIX id used in hosfix_jobs assignees / createdBy.          */
const SEED_USERS = [
  { id:'raj',     name:'Raj Kumar',        dept:'management',   tier:'admin',   role:'Property Director',       pin:'0000', fixId:'raj',    colour:'#1a2b3a', approver:true, portal:'raj.kumar' },
  { id:'ajay',    name:'Ajay Kawa',        dept:'management',   tier:'admin',   role:'Director',                pin:'1111', fixId:'ajay',   hhId:'ajay',  colour:'#c78a3b', approver:true, portal:'ajay.kawa' },
  { id:'alia',    name:'Alia Taub',        dept:'management',   tier:'admin',   role:'Director',                pin:'5555', fixId:'alia',   colour:'#5a8fc7', approver:true, portal:'alia.taub' },
  { id:'glenn',   name:'Glenn Randell',    dept:'management',   tier:'admin',   role:'Maintenance Manager',     pin:'2222', fixId:'glenn',  colour:'#b8860b', fixer:true, approver:true },
  { id:'ruth',    name:'Ruth Addison',     dept:'housekeeping', tier:'lead',    role:'Head of Housekeeping',    pin:'1001', fixId:'ruth',   hhId:'ruth',  colour:'#be185d' },
  { id:'laith',   name:'Laith Hardy',      dept:'housekeeping', tier:'lead',    role:'Operations',              pin:'1016', fixId:'laith',  hhId:'laith', colour:'#8b5cf6', portal:'laith.hardy' },
  { id:'herman',  name:'Herman Charles',   dept:'maintenance',  tier:'fixer',   role:'Multi-trader (non-electrical)', pin:'3333', fixId:'herman', colour:'#2a6a4a', fixer:true },
  { id:'pete',    name:'Pete',             dept:'maintenance',  tier:'fixer',   role:'Multi-trader (electrical)', pin:'4444', fixId:'pete',   colour:'#20b2a2', fixer:true },
  { id:'patrik',  name:'Patrik Vlach',     dept:'reception',    tier:'lead',    role:'Front Office Manager',    pin:'9999', fixId:'patrik', colour:'#6366f1', portal:'patrik.vlach' },
  { id:'aghil',   name:'Aghil Joy',        dept:'reception',    tier:'staff',   role:'Reception',               pin:'9999', fixId:'aghil',  colour:'#0ea5e9' },
  { id:'manjusha',name:'Manjusha',         dept:'reception',    tier:'staff',   role:'Front Desk',              pin:'9999', fixId:'manjusha', colour:'#f59e0b' },
  { id:'manju',   name:'Manju',            dept:'reception',    tier:'staff',   role:'Front Desk',              pin:'9999', fixId:'manju',  colour:'#f97316' },
  { id:'alice',   name:'Alice Grace',      dept:'reception',    tier:'staff',   role:'Reception',               pin:'9999', fixId:'alice',  colour:'#ec4899' },
  { id:'alan',    name:'Alan',             dept:'reception',    tier:'staff',   role:'Night Porter',            pin:'9999', fixId:'alan',   colour:'#64748b' },
  { id:'jomy',    name:'Jomy',             dept:'fb',           tier:'lead',    role:'Bar Manager',             pin:'9999', fixId:'jomy',   colour:'#0891b2' },
  { id:'david',   name:'David',            dept:'fb',           tier:'lead',    role:'Head Chef',               pin:'9999', fixId:'david',  colour:'#dc2626' },
  { id:'natalie', name:'Natalie Freeman',  dept:'sales',        tier:'staff',   role:'Events',                  pin:'9999', fixId:'natalie',colour:'#a855f7', portal:'natalie.freeman' },
  { id:'nicola',  name:'Nicola Cartwright',dept:'sales',        tier:'lead',    role:'Marketing',               pin:'9999', fixId:'nicola', colour:'#d946ef', portal:'nicola.cartwright' },
  { id:'veronica',name:'Veronica Webb',    dept:'sales',        tier:'staff',   role:'Admin',                   pin:'9999', fixId:'veronica', colour:'#14b8a6', portal:'veronica.webb' }
];
const APPROVAL_THRESHOLD = 50;           // £ — jobs above this need manager approval
const DEFAULT_FIXERS = ['herman','pete']; // default assignees for new maintenance jobs

/* ---------- Firebase ---------- */
let db=null, ready=false;
try{
  if(typeof firebase!=='undefined' && typeof firebaseConfig!=='undefined'){
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db=firebase.firestore(); ready=true;
  }
}catch(e){ console.warn('HosPRO Firebase init:', e&&e.message); }

/* ---------- tiny helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO=()=>new Date().toLocaleDateString('en-CA');
const nowISO=()=>new Date().toISOString();
const gbp=n=>'£'+(Math.round((+n||0)*100)/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate=(d,opts)=>{ if(!d) return ''; const x=(d.length===10)?new Date(d+'T12:00'):new Date(d); if(isNaN(x)) return String(d); return x.toLocaleDateString('en-GB',opts||{weekday:'short',day:'numeric',month:'short'}); };
const fmtTime=d=>{ if(!d) return ''; const x=new Date(d); return isNaN(x)?'':x.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); };
const fmtDT=d=>fmtDate(d)+(d&&String(d).length>10?' '+fmtTime(d):'');
const ago=d=>{ if(!d) return ''; const ms=Date.now()-new Date(d).getTime(); if(isNaN(ms)) return ''; const m=Math.floor(ms/60000); if(m<1) return 'just now'; if(m<60) return m+' min ago'; const h=Math.floor(m/60); if(h<24) return h+'h ago'; const dd=Math.floor(h/24); return dd+'d ago'; };
const mmss=s=>{ s=Math.max(0,Math.floor(s)); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), x=s%60; return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0'); };
const uid=p=>(p||'HP')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const initials=n=>String(n||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const avatar=(u,sz)=>`<span class="avatar" style="background:${esc((u&&u.colour)||'#64748b')}${sz?';width:'+sz+'px;height:'+sz+'px;font-size:'+Math.round(sz*.38)+'px':''}">${esc(initials(u&&u.name))}</span>`;
function lsGet(k,d){ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

let _toastT=null;
function toast(msg,ms){ const t=$('toast'); if(!t) return; t.textContent=msg; t.style.display='block'; clearTimeout(_toastT); _toastT=setTimeout(()=>{ t.style.display='none'; },ms||2600); }

/* ---------- bottom sheet ---------- */
function sheet(html, opts){
  const o=$('overlay'); o.style.display='block';
  o.innerHTML=`<div class="shback" onclick="HP.closeSheet()"></div><div class="sheet"><div class="grab"></div>${opts&&opts.title?`<div class="hd"><div class="t">${opts.title}</div><button class="x" onclick="HP.closeSheet()">×</button></div>`:''}${html}</div>`;
  document.body.style.overflow='hidden';
  return o.querySelector('.sheet');
}
function closeSheet(){ const o=$('overlay'); o.style.display='none'; o.innerHTML=''; document.body.style.overflow=''; }
function confirmSheet(title, body, okLabel, cb, cls){
  sheet(`<div style="font-size:14.5px;color:var(--ink);margin:4px 0 2px">${body}</div><div class="btnrow"><button class="btn ghost" onclick="HP.closeSheet()">Cancel</button><button class="btn ${cls||''}" id="hp-confirm-ok">${esc(okLabel||'Confirm')}</button></div>`,{title});
  $('hp-confirm-ok').onclick=()=>{ closeSheet(); cb(); };
}

/* ---------- photo capture (compress to ~900px JPEG) ---------- */
function capturePhoto(caption, opts){
  opts=opts||{};
  return new Promise(resolve=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; if(!opts.gallery) inp.capture='environment';
    inp.style.display='none'; document.body.appendChild(inp);
    let done=false; const finish=v=>{ if(done) return; done=true; try{ document.body.removeChild(inp); }catch(e){} resolve(v); };
    inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f){ finish(null); return; }
      const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
        const max=opts.max||900; let w=img.width,h=img.height; const sc=Math.min(1,max/Math.max(w,h)); w=Math.round(w*sc); h=Math.round(h*sc);
        const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.drawImage(img,0,0,w,h);
        if(caption){ x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(0,h-26,w,26); x.fillStyle='#fff'; x.font='bold 13px sans-serif'; x.fillText(caption+' · '+new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),8,h-9); }
        finish(c.toDataURL('image/jpeg',opts.q||0.62)); }; img.onerror=()=>finish(null); img.src=r.result; };
      r.onerror=()=>finish(null); r.readAsDataURL(f); };
    // if the picker is dismissed we never get onchange; clear up on next focus
    window.addEventListener('focus',()=>setTimeout(()=>finish(null),1500),{once:true});
    inp.click();
  });
}
function viewPhoto(src, title){
  sheet(`<img src="${src}" style="width:100%;border-radius:12px;max-height:78dvh;object-fit:contain;background:#000">`,{title:esc(title||'Photo')});
}

/* ---------- users ---------- */
const Users = {
  list: [],            // merged directory
  overrides: {},       // hospro_app/users (pin/name/dept edits saved in-app)
  async load(){
    let ov={};
    if(ready){ try{ const d=await db.collection('hospro_app').doc('users').get(); if(d.exists) ov=d.data()||{}; }catch(e){ console.warn('app_users',e&&e.code); } }
    this.overrides = ov; lsSet('hp_users_ov', ov);
    this.build();
  },
  build(){
    const ov=this.overrides||lsGet('hp_users_ov',{});
    const out=SEED_USERS.map(u=>Object.assign({},u));
    // housekeepers from the shared HosHOUSE staff list (one source of truth for PINs there)
    try{ (window.HH?HH.staff:[]).forEach(s=>{
      if((s.status||'active')==='left') return;
      const have=out.find(u=>u.hhId===s.id);
      if(have){ have.hhPin=String(s.pin||''); if(have.dept==='housekeeping') have.pin=String(s.pin||have.pin); return; }
      out.push({ id:'hk_'+s.id, name:s.name, dept:'housekeeping', tier:s.lead?'lead':'staff', role:s.lead?'Housekeeping lead':'Housekeeper', pin:String(s.pin||''), hhId:s.id, hhPin:String(s.pin||''), colour:'#2E6B5E' });
    }); }catch(e){}
    // extra users added in-app + per-user overrides
    (ov.extra||[]).forEach(u=>{ if(u&&u.id&&!out.some(x=>x.id===u.id)) out.push(Object.assign({tier:'staff',colour:'#64748b'},u)); });
    out.forEach(u=>{ const p=(ov.users||{})[u.id]; if(p){ if(p.pin) u.pin=String(p.pin); if(p.name) u.name=p.name; if(p.dept) u.dept=p.dept; if(p.tier) u.tier=p.tier; if(p.role) u.role=p.role; if(p.disabled) u.disabled=true; } });
    this.list=out.filter(u=>!u.disabled);
    return this.list;
  },
  byId(id){ return this.list.find(u=>u.id===id)||null; },
  byFixId(id){ return this.list.find(u=>u.fixId===id)||this.list.find(u=>u.id===id)||null; },
  byDept(d){ return this.list.filter(u=>u.dept===d).sort((a,b)=>(a.tier==='admin'||a.tier==='lead'?0:1)-(b.tier==='admin'||b.tier==='lead'?0:1)||a.name.localeCompare(b.name)); },
  fixers(){ return this.list.filter(u=>u.fixer); },
  approvers(){ return this.list.filter(u=>u.approver); },
  nameOf(idOrFix){ const u=this.byId(idOrFix)||this.byFixId(idOrFix); return u?u.name:(idOrFix||''); },
  async save(patch){ // patch = { users:{id:{pin,..}}, extra:[...] } merged into meta/app_users
    const cur=Object.assign({users:{},extra:[]},this.overrides||{});
    if(patch.users){ Object.keys(patch.users).forEach(id=>{ cur.users[id]=Object.assign({},cur.users[id]||{},patch.users[id]); }); }
    if(patch.extra){ cur.extra=patch.extra; }
    this.overrides=cur; lsSet('hp_users_ov',cur);
    if(ready){ try{ await db.collection('hospro_app').doc('users').set(cur); }catch(e){ toast('Could not save users: '+(e&&e.code)); } }
    this.build();
  }
};

/* ---------- home-screen icon: the department's own HosPRO tile ---------- */
function setAppIcon(dept){
  const d=DEPTS[dept]?dept:'';
  const man=document.querySelector('link[rel="manifest"]'), ati=document.querySelector('link[rel="apple-touch-icon"]');
  if(man) man.setAttribute('href', d?('app-manifest-'+d+'.json'):'app-manifest.json');
  if(ati) ati.setAttribute('href', d?('assets/app/icon-'+d+'-180.png'):'assets/app/icon-180.png');
  const t=document.querySelector('meta[name="apple-mobile-web-app-title"]'); if(t) t.setAttribute('content', d?('HosPRO '+DEPTS[d].name.split(' ')[0]):'HosPRO');
}

/* ---------- session ---------- */
let ME=null;
function isAdmin(){ return !!(ME&&ME.tier==='admin'); }
function isLead(){ return !!(ME&&(ME.tier==='admin'||ME.tier==='lead')); }
function canOpen(modId){
  if(!ME) return false;
  if(ME.tier==='admin') return true;
  const allowed=DEPT_MODULES[ME.dept]||[];
  const m=MODULES.find(x=>x.id===modId); if(!m) return false;
  if(m.tiers && !m.tiers.includes(ME.tier)) return false;
  return allowed.includes(modId);
}
function myModules(){ return MODULES.filter(m=>canOpen(m.id)); }

/* ---------- login screen ---------- */
let L={ step:0, dept:null, user:null, pin:'' };
function renderLogin(){
  const el=$('login'); if(!el) return;
  const steps=`<div class="steps">${[0,1,2].map(i=>`<span class="${L.step===i?'on':''}"></span>`).join('')}</div>`;
  if(L.step===0){
    el.innerHTML=`<img class="logo" src="assets/logos/logo---blue-transparent.png" alt="Brandon Hall" onerror="this.style.display='none'"><h1>HosPRO</h1><p>Brandon Hall Hotel &amp; Spa · choose your department</p>${steps}
      <div class="deptgrid">${DEPT_ORDER.map(d=>{ const D=DEPTS[d]; const n=Users.byDept(d).length; if(!n) return ''; return `<button class="dept" onclick="HP.loginDept('${d}')"><span class="ic" style="background:${D.colour}">${icon(D.icon,20)}</span><span>${esc(D.name)}<small>${esc(D.desc)}</small></span></button>`; }).join('')}</div>
      <div style="margin-top:18px"><a class="linkbtn" href="index.html">Desktop portal →</a></div>`;
  } else if(L.step===1){
    const D=DEPTS[L.dept];
    el.innerHTML=`<h1 style="margin-top:calc(8px + var(--safe-top))"><span style="display:inline-grid;place-items:center;width:38px;height:38px;border-radius:11px;background:${D.colour};color:#fff;vertical-align:middle;margin-right:6px">${icon(D.icon,21)}</span>${esc(D.name)}</h1><p>Tap your name</p>${steps}
      <div class="namelist">${Users.byDept(L.dept).map(u=>`<button onclick="HP.loginUser('${esc(u.id)}')">${avatar(u)}<span>${esc(u.name)}</span><small>${esc(u.role||'')}</small></button>`).join('')}</div>
      <button class="linkbtn" onclick="HP.loginBack()">← Departments</button>`;
  } else {
    const u=L.user;
    el.innerHTML=`<div style="margin-top:calc(8px + var(--safe-top))">${avatar(u,56)}</div><h1 style="margin-top:8px">${esc(u.name)}</h1><p>${esc(DEPTS[u.dept].name)} · enter your 4-digit PIN</p>${steps}
      <div class="pindisp" id="pindisp">${'•'.repeat(L.pin.length)}</div><div class="lgmsg" id="lgmsg"></div>
      <div class="pinpad">${['1','2','3','4','5','6','7','8','9','⌫','0','OK'].map(k=>`<button class="${k==='OK'?'ok':''}" onclick="HP.loginKey('${k}')">${k}</button>`).join('')}</div>
      <button class="linkbtn" onclick="HP.loginBack()">← Not you?</button>`;
  }
}
function loginDept(d){ L.dept=d; L.step=1; L.pin=''; renderLogin(); }
function loginUser(id){ L.user=Users.byId(id); if(!L.user) return; L.step=2; L.pin=''; renderLogin(); }
function loginBack(){ L.pin=''; L.step=Math.max(0,L.step-1); renderLogin(); }
function loginKey(k){
  if(k==='⌫') L.pin=L.pin.slice(0,-1);
  else if(k==='OK'){ doLogin(); return; }
  else if(L.pin.length<4) L.pin+=k;
  $('pindisp').textContent='•'.repeat(L.pin.length);
  if(L.pin.length===4) setTimeout(doLogin,120);
}
function doLogin(){
  const u=L.user; if(!u) return;
  const ok = String(u.pin)===L.pin || (u.hhPin && String(u.hhPin)===L.pin);
  if(!ok){ $('lgmsg').textContent='Wrong PIN — try again.'; L.pin=''; $('pindisp').textContent=''; if(navigator.vibrate) navigator.vibrate(80); return; }
  signIn(u);
}
function rememberSession(u){
  // stays signed in on this phone for 14 days (like an installed app); Sign out clears it
  try{ sessionStorage.setItem('hp_me',u.id); localStorage.setItem('hp_pref',u.id); localStorage.setItem('hp_session',JSON.stringify({id:u.id,at:Date.now()}));
       if(u.hhId){ sessionStorage.setItem('hh_me',u.hhId); localStorage.setItem('hp_hh',u.hhId); localStorage.setItem('hh_pref',u.hhId); } else { localStorage.removeItem('hp_hh'); } }catch(e){}
}
function signIn(u){
  ME=u; L={step:0,dept:null,user:null,pin:''};
  rememberSession(u); setAppIcon(u.dept);
  document.dispatchEvent(new CustomEvent('hp:login',{detail:u}));
  setTheme('');
  go(u.tier==='admin'?'manage':'home');
}
function signOut(){
  try{ sessionStorage.removeItem('hp_me'); sessionStorage.removeItem('hh_me'); localStorage.removeItem('hp_session'); localStorage.removeItem('hp_hh'); }catch(e){}
  document.dispatchEvent(new CustomEvent('hp:logout'));
  ME=null; L={step:0,dept:null,user:null,pin:''}; go('login');
}

/* ---------- router ---------- */
const VIEWS={};     // id -> {render(el,params), title}
let CUR=null, HIST=[];
function registerView(id, def){ VIEWS[id]=def; }
function go(id, params, replace){
  if(id!=='login' && !ME){ id='login'; }
  if(id!=='login' && id!=='home' && !canOpen(id.split('/')[0]) && !VIEWS[id]?.free){ toast('Not available for your role'); id='home'; }
  const main=$('main'); const prev=CUR;
  CUR={id,params:params||{}};
  if(!replace && prev && prev.id!==id) HIST.push(prev);
  if(HIST.length>30) HIST.shift();
  document.querySelectorAll('.framewrap').forEach(f=>f.remove());
  if(id==='login'){ $('login').classList.remove('hidden'); main.classList.add('hidden'); setTheme(''); renderLogin(); window.scrollTo(0,0); return; }
  $('login').classList.add('hidden'); main.classList.remove('hidden'); if(id==='home'||id==='settings') setTheme('');
  main.classList.remove('fade'); void main.offsetWidth; main.classList.add('fade');
  const v=VIEWS[id]; if(!v){ main.innerHTML=`<div class="topbar"><button class="back" onclick="HP.back()">‹</button><div class="ttl"><div class="t">Not found</div></div></div><div class="wrap empty">That screen doesn't exist yet.</div>`; return; }
  main.innerHTML=''; window.scrollTo(0,0);
  try{ v.render(main, CUR.params); }catch(e){ console.error(e); main.innerHTML=`<div class="topbar"><button class="back" onclick="HP.back()">‹</button><div class="ttl"><div class="t">Something went wrong</div></div></div><div class="wrap"><div class="note bad">${esc(e&&e.message)}</div><button class="btn" onclick="HP.go('home')">Home</button></div>`; }
  try{ history.replaceState({id},'' ,'#'+id); }catch(e){}
}
function back(){ const p=HIST.pop(); if(p) go(p.id,p.params,true); else go('home',null,true); }
function refresh(){ if(CUR) go(CUR.id,CUR.params,true); }
const THEME={house:'#2E6B5E',fix:'#965638',rec:'#3B6585',fb:'#6E4E7A',sales:'#7A6538',fire:'#B3261E',comp:'#4B5288'};
function setTheme(mod){ const m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content',THEME[mod]||'#1F3864'); }
function topbar(opts){
  setTheme(opts.mod||'');
  const cls=opts.mod?' mod-'+opts.mod:'';
  return `<div class="topbar${cls}"><button class="back" onclick="${opts.backTo?`HP.go('${opts.backTo}')`:'HP.back()'}" aria-label="Back">‹</button><div class="ttl"><div class="t">${opts.title||''}</div>${opts.sub?`<div class="u">${opts.sub}</div>`:''}</div>${opts.action?`<button class="act" onclick="${opts.action.onclick}">${opts.action.label}</button>`:''}</div>`;
}
function bnav(items, active){
  return `<div class="bnav">${items.map(i=>`<button class="${i.id===active?'on':''}" onclick="${i.onclick}"><span class="i">${icon(i.icon,21)}</span>${esc(i.label)}${i.badge?`<span class="bb">${i.badge}</span>`:''}</button>`).join('')}</div>`;
}
/* iframe module: existing apps are shown inside the shell, auto signed-in where possible */
function openFrame(opts){
  document.querySelectorAll('.framewrap').forEach(f=>f.remove());
  const w=document.createElement('div'); w.className='framewrap';
  w.innerHTML=`<div class="topbar${opts.mod?' mod-'+opts.mod:''}"><button class="back" onclick="HP.closeFrame()">‹ Home</button><div class="ttl"><div class="t">${esc(opts.title)}</div>${opts.sub?`<div class="u">${esc(opts.sub)}</div>`:''}</div>${opts.openNew?`<a class="act" href="${esc(opts.url)}" target="_blank" rel="noopener" style="text-decoration:none">Open ↗</a>`:''}</div><iframe src="${esc(opts.url)}" allow="camera;microphone;geolocation" title="${esc(opts.title)}"></iframe>`;
  document.body.appendChild(w);
}
function closeFrame(){ document.querySelectorAll('.framewrap').forEach(f=>f.remove()); go('home',null,true); }

/* ---------- home ---------- */
const HOME_BADGES={};  // module id -> {n, cls}
function setBadge(mod, n, cls){ HOME_BADGES[mod]={n,cls}; const el=document.querySelector('[data-tile="'+mod+'"] .badge'); if(el){ el.textContent=n||''; el.style.display=n?'block':'none'; el.className='badge '+(cls||''); } }
registerView('home',{ render(el){
  const h=new Date().getHours(); const greet=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  const mods=myModules();
  el.innerHTML=`<div class="topbar home"><div class="ttl"><div class="t">${greet}, ${esc(ME.name.split(' ')[0])}</div><div class="u">${esc(DEPTS[ME.dept].name)}${ME.role?' · '+esc(ME.role):''} · ${esc(new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}))}</div></div><button class="act av" onclick="HP.go('settings')" aria-label="Settings">${avatar(ME,34)}</button></div>
  <div class="wrap">
    <div class="modgrid">${mods.map(m=>`<button class="tile" data-tile="${m.id}" onclick="HP.open('${m.id}')"><span class="ic" style="background:${m.colour}">${icon(m.icon,21)}</span><span class="badge" style="display:none"></span><div><div class="nm">${esc(m.name)}</div><div class="ds">${esc(m.desc)}</div></div></button>`).join('')}</div>
    <div id="home-feed"></div>
  </div>${homeNav('home')}`;
  Object.keys(HOME_BADGES).forEach(k=>setBadge(k,HOME_BADGES[k].n,HOME_BADGES[k].cls));
  document.dispatchEvent(new CustomEvent('hp:home',{detail:{el:$('home-feed')}}));
}});

function homeNav(active){
  const items=[{id:'home',icon:'home',label:'Home',onclick:"HP.go('home')"}];
  if(isAdmin()) items.unshift({id:'manage',icon:'overview',label:'Overview',onclick:"HP.go('manage')"});
  items.push({id:'settings',icon:'settings',label:'Settings',onclick:"HP.go('settings')"});
  return bnav(items,active);
}
/* ---------- settings (users & PINs — managers only edit) ---------- */
registerView('settings',{ free:true, render(el){
  const admin=isAdmin();
  el.innerHTML=topbar({title:'Settings',sub:esc(ME.name),backTo:'home'})+`<div class="wrap">
    <div class="card"><div class="row"><img src="assets/app/icon-${esc(ME.dept)}-192.png" style="width:56px;height:56px;border-radius:14px;flex:0 0 auto" alt=""><div class="grow"><div class="ttl">Install on your phone</div><div class="sub">iPhone: Share → "Add to Home Screen". Android: menu → "Install app". You'll get the ${esc(DEPTS[ME.dept].name)} HosPRO icon.</div></div></div><button class="btn ghost" id="hp-install" style="display:none">Install HosPRO</button></div>
    <div class="card"><div class="ttl">Change my PIN</div><div class="sub">4 digits. This is how you sign in on every HosPRO screen.</div>
      <div class="two" style="margin-top:8px"><input class="inp" id="st-pin1" inputmode="numeric" maxlength="4" placeholder="New PIN"><input class="inp" id="st-pin2" inputmode="numeric" maxlength="4" placeholder="Repeat"></div><button class="btn sm" style="margin-top:8px" onclick="HP.changePin()">Save PIN</button></div>
    ${admin?`<div class="sect">Team &amp; access <span class="r" onclick="HP.addUserSheet()">+ Add person</span></div>
      ${DEPT_ORDER.map(d=>{ const us=Users.byDept(d); if(!us.length) return ''; return `<div class="card"><div class="ttl row"><span style="width:26px;height:26px;border-radius:7px;background:${DEPTS[d].colour};color:#fff;display:inline-grid;place-items:center">${icon(DEPTS[d].icon,15)}</span>${esc(DEPTS[d].name)}</div>${us.map(u=>`<div class="line"><span class="row">${avatar(u,26)}<span><b>${esc(u.name)}</b><span class="sub" style="display:block">${esc(u.role||'')} · ${esc(u.tier)}${u.hhId?' · HosHOUSE ✓':''}</span></span></span><button class="btn sm ghost" onclick="HP.editUserSheet('${esc(u.id)}')">Edit</button></div>`).join('')}</div>`; }).join('')}
      <div class="note info">Housekeepers and their PINs come from the HosHOUSE staff list (Manage → Staff) so there is one list. Everyone else is managed here and saved for all devices.</div>`:''}
    <div class="card"><div class="ttl">Other apps</div><div class="sub">The previous apps stay available as a fallback.</div><div class="chips"><a class="qchip" href="hoshouse.html" target="_blank">HosHOUSE</a><a class="qchip" href="hosmain.html" target="_blank">HosFIX (old)</a><a class="qchip" href="hosfire-mobile.html" target="_blank">HosFIRE</a><a class="qchip" href="index.html" target="_blank">Desktop portal</a><a class="qchip" href="https://fixray.app" target="_blank">FixRay ↗</a></div></div>
    <button class="btn ghost" style="color:var(--red)" onclick="HP.signOut()">Sign out of HosPRO</button>
    <div class="sub" style="text-align:center;margin-top:14px">HosPRO Mobile v${esc(window.HP_VERSION||'1')}</div>
  </div>${homeNav('settings')}`;
  if(window._hpInstallEvt){ const b=$('hp-install'); b.style.display='block'; b.onclick=()=>{ window._hpInstallEvt.prompt(); }; }
}});
async function changePin(){
  const a=($('st-pin1').value||'').replace(/\D/g,''), b=($('st-pin2').value||'').replace(/\D/g,'');
  if(a.length!==4||a!==b){ toast('PINs must match and be 4 digits'); return; }
  if(ME.hhId && ME.dept==='housekeeping' && window.HH){ try{ await HH.updateStaff(ME.hhId,{pin:a}); }catch(e){} }
  await Users.save({users:{[ME.id]:{pin:a}}});
  ME.pin=a; toast('PIN updated');
}
function editUserSheet(id){
  const u=Users.byId(id); if(!u) return;
  sheet(`<label class="lbl">Name</label><input class="inp" id="eu-name" value="${esc(u.name)}">
    <label class="lbl">Role / job title</label><input class="inp" id="eu-role" value="${esc(u.role||'')}">
    <div class="two"><div><label class="lbl">Department</label><select class="inp" id="eu-dept">${DEPT_ORDER.map(d=>`<option value="${d}" ${u.dept===d?'selected':''}>${esc(DEPTS[d].name)}</option>`).join('')}</select></div>
    <div><label class="lbl">Access level</label><select class="inp" id="eu-tier">${[['admin','Manager — sees all'],['lead','Department lead'],['staff','Team member'],['fixer','Fixer (own jobs)']].map(t=>`<option value="${t[0]}" ${u.tier===t[0]?'selected':''}>${t[1]}</option>`).join('')}</select></div></div>
    <label class="lbl">PIN <span>4 digits${u.hhId?' · also updates HosHOUSE':''}</span></label><input class="inp" id="eu-pin" inputmode="numeric" maxlength="4" value="${esc(u.pin||'')}">
    <div class="btnrow"><button class="btn red" onclick="HP.removeUser('${esc(u.id)}')">Remove</button><button class="btn" onclick="HP.saveUser('${esc(u.id)}')">Save</button></div>`,{title:'Edit '+esc(u.name)});
}
async function saveUser(id){
  const u=Users.byId(id); const pin=($('eu-pin').value||'').replace(/\D/g,'');
  if(pin.length!==4){ toast('PIN must be 4 digits'); return; }
  const patch={name:$('eu-name').value.trim()||u.name, role:$('eu-role').value.trim(), dept:$('eu-dept').value, tier:$('eu-tier').value, pin};
  if(u.hhId && window.HH){ try{ await HH.updateStaff(u.hhId,{pin, name:patch.name}); }catch(e){} }
  await Users.save({users:{[id]:patch}}); closeSheet(); toast('Saved'); refresh();
}
async function removeUser(id){
  const u=Users.byId(id); if(!u) return;
  if(u.id===ME.id){ toast("You can't remove yourself"); return; }
  confirmSheet('Remove '+esc(u.name)+'?','They will no longer be able to sign in to HosPRO Mobile.'+(u.hhId?' Their HosHOUSE account is not changed.':''),'Remove',async()=>{ await Users.save({users:{[id]:{disabled:true}}}); toast('Removed'); refresh(); },'red');
}
function addUserSheet(){
  sheet(`<label class="lbl">Name</label><input class="inp" id="au-name" placeholder="Full name">
    <label class="lbl">Role / job title</label><input class="inp" id="au-role" placeholder="e.g. Receptionist">
    <div class="two"><div><label class="lbl">Department</label><select class="inp" id="au-dept">${DEPT_ORDER.map(d=>`<option value="${d}">${esc(DEPTS[d].name)}</option>`).join('')}</select></div>
    <div><label class="lbl">Access level</label><select class="inp" id="au-tier"><option value="staff">Team member</option><option value="lead">Department lead</option><option value="fixer">Fixer (own jobs)</option><option value="admin">Manager — sees all</option></select></div></div>
    <label class="lbl">PIN <span>4 digits</span></label><input class="inp" id="au-pin" inputmode="numeric" maxlength="4" placeholder="e.g. 2468">
    <div class="note info">Housekeepers are added in Housekeeping → Manage → Staff instead, so they get a HosHOUSE account too.</div>
    <button class="btn" onclick="HP.addUser()">Add person</button>`,{title:'Add a person'});
}
async function addUser(){
  const name=$('au-name').value.trim(), pin=($('au-pin').value||'').replace(/\D/g,'');
  if(!name){ toast('Add a name'); return; } if(pin.length!==4){ toast('PIN must be 4 digits'); return; }
  let base=name.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,12)||'user', id=base, n=1; while(Users.byId(id)||SEED_USERS.some(u=>u.id===id)) id=base+(++n);
  const extra=((Users.overrides||{}).extra||[]).concat([{id, name, role:$('au-role').value.trim(), dept:$('au-dept').value, tier:$('au-tier').value, pin, fixId:id, colour:['#0ea5e9','#f59e0b','#ec4899','#14b8a6','#a855f7','#64748b'][Math.floor(Math.random()*6)]}]);
  await Users.save({extra}); closeSheet(); toast('Added '+name); refresh();
}

/* ---------- open a module tile ---------- */
function open(modId){
  if(!canOpen(modId)){ toast('Not available for your role'); return; }
  const h=window.HP_MODULE_OPEN&&window.HP_MODULE_OPEN[modId];
  if(h) h(); else go(modId);
}

/* ---------- portal sign-in (Firebase Auth) for collections that need a staff login ----------
   Managers and sales staff who have a desktop-portal login are signed in silently so
   the Sales module can read/write the shared enquiries pipeline. Others get a
   friendly message instead of a permission error. */
let _authP=null;
function portalAuth(){
  if(_authP) return _authP;
  _authP=(async()=>{
    try{
      if(!ME||!ME.portal||typeof firebase==='undefined'||!firebase.auth) return false;
      const L=(typeof FB_LOGINS!=='undefined')?FB_LOGINS[ME.portal]:null; if(!L) return false;
      const a=firebase.auth(); if(a.currentUser&&a.currentUser.email===L.email) return true;
      await a.signInWithEmailAndPassword(L.email,L.pw); return true;
    }catch(e){ console.warn('portal auth',e&&e.code); return false; }
  })();
  return _authP;
}
document.addEventListener('hp:logout',()=>{ _authP=null; try{ if(firebase.auth&&firebase.auth().currentUser) firebase.auth().signOut(); }catch(e){} });

/* ---------- Firestore convenience ---------- */
const Store={
  get db(){ return db; }, get ready(){ return ready; },
  watch(col, cb, qfn){ if(!ready) { cb([]); return ()=>{}; } let q=db.collection(col); if(qfn) q=qfn(q); return q.onSnapshot(s=>cb(s.docs.map(d=>Object.assign({_id:d.id},d.data()))), e=>{ console.warn(col,e&&e.code); if(e&&e.code==='permission-denied') toast('No access to '+col+' — ask Ajay to check the Firestore rules'); }); },
  async get(col,id){ if(!ready) return null; try{ const d=await db.collection(col).doc(id).get(); return d.exists?Object.assign({_id:d.id},d.data()):null; }catch(e){ console.warn(col,e&&e.code); return null; } },
  async set(col,id,data,merge){ if(!ready){ toast('Offline — not saved'); return false; } try{ await db.collection(col).doc(id).set(JSON.parse(JSON.stringify(data)),{merge:merge!==false}); return true; }catch(e){ console.warn(col,e&&e.code,e&&e.message); toast('Save failed: '+((e&&e.code)||'error')); return false; } },
  async add(col,data){ const id=data.id||uid(); data.id=id; const ok=await this.set(col,id,data,false); return ok?id:null; },
  async del(col,id){ if(!ready) return false; try{ await db.collection(col).doc(id).delete(); return true; }catch(e){ toast('Delete failed'); return false; } },
  async query(col,qfn){ if(!ready) return []; try{ let q=db.collection(col); if(qfn) q=qfn(q); const s=await q.get(); return s.docs.map(d=>Object.assign({_id:d.id},d.data())); }catch(e){ console.warn(col,e&&e.code); return []; } }
};

/* ---------- boot ---------- */
async function boot(){
  try{ if(window.HH) await HH.loadCfg(); }catch(e){}
  await Users.load();
  let saved=(()=>{ try{ return sessionStorage.getItem('hp_me'); }catch(e){ return null; } })();
  if(!saved){ const ss=lsGet('hp_session',null); if(ss&&ss.id&&Date.now()-(ss.at||0)<14*864e5) saved=ss.id; }
  const pre=new URLSearchParams(location.search).get('u');
  const u=saved?Users.byId(saved):null;
  const dq=new URLSearchParams(location.search).get('d'); if(dq&&DEPTS[dq]) setAppIcon(dq);
  if(u && (!pre || pre===u.id)){ ME=u; rememberSession(u); setAppIcon(u.dept); document.dispatchEvent(new CustomEvent('hp:login',{detail:u})); const want=(location.hash||'').slice(1); go(want&&want!=='login'&&VIEWS[want]?want:(u.tier==='admin'?'manage':'home'),null,true); }
  else { if(pre && Users.byId(pre)){ const pu=Users.byId(pre); L.dept=pu.dept; L.user=pu; L.step=2; setAppIcon(pu.dept); } else if(dq&&DEPTS[dq]){ L.dept=dq; L.step=1; } else { const pref=lsGet('hp_pref',null); const lu=typeof pref==='string'?Users.byId(pref):null; if(lu){ L.dept=lu.dept; L.user=lu; L.step=2; } } go('login',null,true); }
  window.addEventListener('popstate',()=>{ if(document.querySelector('.framewrap')) { closeFrame(); return; } back(); });
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('app-sw.js').catch(()=>{}); }
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); window._hpInstallEvt=e; });
}

window.HP={ DEPTS, DEPT_ORDER, MODULES, Users, Store, APPROVAL_THRESHOLD, DEFAULT_FIXERS, portalAuth,
  get ME(){ return ME; }, isAdmin, isLead, canOpen, myModules,
  $, esc, todayISO, nowISO, gbp, fmtDate, fmtTime, fmtDT, ago, mmss, uid, initials, avatar, lsGet, lsSet, toast,
  sheet, closeSheet, confirmSheet, capturePhoto, viewPhoto,
  registerView, go, back, refresh, topbar, bnav, homeNav, openFrame, closeFrame, setBadge, open, setTheme, setAppIcon, icon,
  loginDept, loginUser, loginBack, loginKey, signOut, changePin, editUserSheet, saveUser, removeUser, addUserSheet, addUser,
  boot };
window.HP_MODULE_OPEN={};
})();
