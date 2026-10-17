/* ============================================================
   HosHouse — shared config + store for the housekeeping pages
   (reception form, housekeeper app, management dashboard).
   Backs onto the same Firebase project (brandonhall-7bdef);
   falls back to localStorage so it still works offline / before
   the Firestore rules are deployed.

   Pages that include this also include, in order:
     firebase-app-compat.js, firebase-firestore-compat.js,
     firebase-config.js, then this file.
   ============================================================ */
(function(){
  "use strict";

  // ---- 15 housekeeping staff (from the rota). PIN is editable in Admin. ----
  const HK_STAFF = [
    { id:"ruth",       name:"Ruth Addison",     pin:"1001", lead:true },
    { id:"aryan",      name:"Aryan",            pin:"1002" },
    { id:"lara",       name:"Lara Jervis",      pin:"1003" },
    { id:"rahul",      name:"Rahul Reghunath",  pin:"1004" },
    { id:"jitendra",   name:"Jitendra",         pin:"1005" },
    { id:"manoj",      name:"Manoj",            pin:"1006" },
    { id:"tushar",     name:"Tushar Ambekar",   pin:"1007" },
    { id:"allen",      name:"Allen",            pin:"1008" },
    { id:"hassen",     name:"Hassen",           pin:"1009" },
    { id:"satya",      name:"Satya",            pin:"1010" },
    { id:"ayomide",    name:"Ayomidipupo",      pin:"1011" },
    { id:"yaya",       name:"Yaya",             pin:"1012" },
    { id:"edwin",      name:"Edwin",            pin:"1013" },
    { id:"dushyanth",  name:"Dushyanth",        pin:"1014" },
    { id:"anisha",     name:"Anisha",           pin:"1015" }
  ];

  // ---- Checklist each room is cleaned against ----
  const CHECKLIST = ["Bed","Bathroom","Floor","Surfaces","Bins","Amenities","Mini-bar"];

  // ---- Room-type options reception can tag a room with (daily clean status) ----
  const ROOM_TYPES = ["Departure","Stayover","Arrival-ready"];

  // ---- Room categories (from Guestline). code = what shows on the box;
  //      label = friendly name; n = how many of that category the hotel has.
  //      Total = 120 bedrooms. ----
  const ROOM_CATS = [
    { code:"CLA_DBL",     label:"Classic Double",             n:25 },
    { code:"CLA_TWN",     label:"Classic Twin",               n:21 },
    { code:"EXE_DBL",     label:"Executive Double",           n:48 },
    { code:"EXE_DBL_ACC", label:"Executive Double (Access.)", n:3  },
    { code:"EXE_TRP",     label:"Executive Triple",           n:5  },
    { code:"EXE_TWN",     label:"Executive Twin",             n:5  },
    { code:"EXE_TWN_ACC", label:"Executive Twin (Access.)",   n:1  },
    { code:"JSUI",        label:"Junior Suite",               n:4  },
    { code:"PRE_DBL",     label:"Premier Double",             n:8  }
  ];

  // ---- Default room list — PLACEHOLDER numbers with the REAL category mix
  //      (120 rooms). Replace the numbers with the real Guestline list in
  //      Admin → Room list (one "number,CATEGORY" per line). Reception sets the
  //      daily clean type (Departure/Stayover/Arrival-ready) each morning. ----
  function defaultRooms(){
    const out=[]; let n=1;
    ROOM_CATS.forEach(c=>{ for(let i=0;i<c.n;i++){ out.push({ room:String(n++), cat:c.code }); } });
    return out;
  }

  // ---- Defaults (overridable from Admin, stored in hoshouse_config/current) ----
  const DEFAULTS = {
    rooms: defaultRooms(),
    windowMin: 30,                 // minutes allowed per room
    amberMin: 25,                  // timer goes amber here
    geo: {
      enabled: true,
      hardBlock: false,            // false = log & flag only (safe default); true = block off-site actions
      lat: 52.3783, lng: -1.3870,  // approximate Brandon pin — set exactly from Admin ("use my location")
      radiusM: 200
    }
  };

  const LS_CFG = "hoshouse_cfg";
  const todayISO = ()=> new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  // ---- Firebase init (shared project) ----
  let db=null, ready=false;
  try{
    if(typeof firebase!=="undefined" && typeof firebaseConfig!=="undefined"){
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.firestore(); ready = true;
    }
  }catch(e){ console.warn("HosHouse Firebase init:", e && e.message); ready=false; }

  function lsGet(k,d){ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(e){ return d; } }
  function lsSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  const HH = {
    checklist: CHECKLIST,
    roomTypes: ROOM_TYPES,
    roomCats: ROOM_CATS,
    catLabel(code){ const c=ROOM_CATS.find(x=>x.code===code); return c?c.label:(code||''); },
    ready, db,
    todayISO,
    // staff lives in the shared config so add/remove propagates to every device
    get staff(){ return this.cfg().staff; },
    staffById(id){ return this.cfg().staff.find(s=>s.id===id)||null; },
    slugId(name){ let base=(name||'staff').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,12)||'staff';
      let id=base, n=1; const have=this.cfg().staff; while(have.some(s=>s.id===id)){ id=base+(++n); } return id; },
    nextPin(){ const used=new Set(this.cfg().staff.map(s=>String(s.pin))); let p=1001; while(used.has(String(p))) p++; return String(p); },
    async addStaff(name, pin){
      const c=this.cfg(); name=(name||'').trim(); if(!name) return null;
      const rec={ id:this.slugId(name), name, pin: pin?String(pin):this.nextPin() };
      c.staff=(c.staff||[]).concat([rec]); await this.saveCfg(c); return rec;
    },
    async updateStaff(id, patch){ const c=this.cfg(); const s=(c.staff||[]).find(x=>x.id===id); if(!s) return null; Object.assign(s,patch); await this.saveCfg(c); return s; },
    async removeStaff(id){ const c=this.cfg(); c.staff=(c.staff||[]).filter(s=>s.id!==id); await this.saveCfg(c); return true; },

    // ----- config (room list + settings) -----
    _cfg: null,
    cfg(){ if(!this._cfg) this._cfg = Object.assign({}, DEFAULTS, lsGet(LS_CFG, {}));
           this._cfg.geo = Object.assign({}, DEFAULTS.geo, this._cfg.geo||{});
           if(!Array.isArray(this._cfg.rooms) || !this._cfg.rooms.length) this._cfg.rooms = DEFAULTS.rooms;
           if(!Array.isArray(this._cfg.staff) || !this._cfg.staff.length) this._cfg.staff = HK_STAFF.map(s=>Object.assign({},s));
           return this._cfg; },
    async loadCfg(){
      if(ready){ try{ const d=await db.collection("hoshouse_config").doc("current").get();
        if(d.exists){ this._cfg = Object.assign({}, DEFAULTS, d.data()); lsSet(LS_CFG, this._cfg); } }catch(e){ console.warn("cfg load",e&&e.code); } }
      return this.cfg();
    },
    async saveCfg(cfg){
      this._cfg = Object.assign({}, DEFAULTS, cfg); lsSet(LS_CFG, this._cfg);
      if(ready){ try{ await db.collection("hoshouse_config").doc("current").set(this._cfg); }catch(e){ console.warn("cfg save",e&&e.code); } }
      return this._cfg;
    },

    // ----- the day's rooms (one doc per room: hoshouse_rooms/<date>__<room>) -----
    docId(date,room){ return date+"__"+room; },
    blankRoom(date,room,type,cat,note){
      return { date, room:String(room), type:type||"Departure", cat:cat||"", status:"pending",
               housekeeper:"", housekeeperName:"", startAt:null, finishAt:null, durationSec:0,
               checklist:{}, geoStartOk:null, geoFinishOk:null, notes:note||"", updatedAt:Date.now() };
    },
    // Reception: set the whole day's list (adds new, leaves existing progress alone, removes de-selected pending ones)
    async setDayRooms(date, picks /* [{room,type,cat,note}] */){
      const want = new Set(picks.map(p=>String(p.room)));
      if(ready){
        try{
          const snap = await db.collection("hoshouse_rooms").where("date","==",date).get();
          const have = {}; snap.forEach(d=>have[d.data().room]=d.data());
          const batch = db.batch();
          picks.forEach(p=>{ const r=String(p.room); const note=p.note||"";
            if(!have[r]){ batch.set(db.collection("hoshouse_rooms").doc(this.docId(date,r)), this.blankRoom(date,r,p.type,p.cat,note)); }
            else if(have[r].status==="pending" && (have[r].type!==p.type || (have[r].notes||"")!==note)){ batch.update(db.collection("hoshouse_rooms").doc(this.docId(date,r)), {type:p.type, notes:note, updatedAt:Date.now()}); }
          });
          snap.forEach(d=>{ const r=d.data(); if(!want.has(r.room) && r.status==="pending"){ batch.delete(db.collection("hoshouse_rooms").doc(this.docId(date,r.room))); } });
          await batch.commit();
          return true;
        }catch(e){ console.warn("setDayRooms live",e&&e.code); }
      }
      // local fallback
      const key="hoshouse_day_"+date; const have=lsGet(key,{});
      const map={}; picks.forEach(p=>{ const r=String(p.room);
        map[r] = have[r] && have[r].status!=="pending" ? have[r] : (have[r]||this.blankRoom(date,r,p.type,p.cat,p.note||""));
        if(map[r].status==="pending"){ map[r].type=p.type; map[r].notes=p.note||""; }
      });
      lsSet(key,map); return true;
    },
    async getDayRooms(date){
      if(ready){ try{ const snap=await db.collection("hoshouse_rooms").where("date","==",date).get();
        return snap.docs.map(d=>d.data()).sort((a,b)=>(+a.room||0)-(+b.room||0)); }catch(e){ console.warn("getDayRooms",e&&e.code); } }
      const map=lsGet("hoshouse_day_"+date,{}); return Object.values(map).sort((a,b)=>(+a.room||0)-(+b.room||0));
    },
    watchDay(date, cb){
      if(ready){ try{ return db.collection("hoshouse_rooms").where("date","==",date)
        .onSnapshot(s=>cb(s.docs.map(d=>d.data()).sort((a,b)=>(+a.room||0)-(+b.room||0))), e=>console.warn("watch",e&&e.code)); }catch(e){} }
      // local: poll
      const tick=()=>cb(Object.values(lsGet("hoshouse_day_"+date,{})).sort((a,b)=>(+a.room||0)-(+b.room||0)));
      tick(); const h=setInterval(tick,4000); return ()=>clearInterval(h);
    },
    async updateRoom(date, room, patch){
      patch.updatedAt=Date.now();
      if(ready){ try{ await db.collection("hoshouse_rooms").doc(this.docId(date,room)).set(patch,{merge:true}); return true; }catch(e){ console.warn("updateRoom",e&&e.code); } }
      const key="hoshouse_day_"+date; const map=lsGet(key,{}); map[String(room)]=Object.assign(map[String(room)]||this.blankRoom(date,room),patch); lsSet(key,map); return true;
    },

    // ----- geo helper -----
    distanceM(lat1,lng1,lat2,lng2){
      const R=6371000, toR=x=>x*Math.PI/180;
      const dLat=toR(lat2-lat1), dLng=toR(lng2-lng1);
      const a=Math.sin(dLat/2)**2 + Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLng/2)**2;
      return 2*R*Math.asin(Math.sqrt(a));
    },
    checkGeo(){ // -> Promise<{ok, distance, blocked, skipped}>
      return new Promise(resolve=>{
        const g=this.cfg().geo;
        if(!g.enabled || !navigator.geolocation){ resolve({ok:true, skipped:true, blocked:false}); return; }
        navigator.geolocation.getCurrentPosition(
          pos=>{ const d=this.distanceM(pos.coords.latitude,pos.coords.longitude,g.lat,g.lng);
            const ok=d<=g.radiusM; resolve({ok, distance:Math.round(d), blocked: (!ok && g.hardBlock)}); },
          ()=>resolve({ok:false, error:true, blocked:false}),   // permission denied -> allow but flag
          { enableHighAccuracy:true, timeout:8000, maximumAge:30000 }
        );
      });
    }
  };

  window.HH = HH;
})();
