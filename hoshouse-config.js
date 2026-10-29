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

  // ---- Skills a housekeeper can be assigned, and their working status. ----
  const SKILL_TYPES    = ["Departure","Stayover","Arrival-ready"];
  const STAFF_STATUSES = ["active","holiday","left"];

  // ---- housekeeping staff (from the rota). PIN, skills, rating & status
  //      are all editable in the app's Manage area.
  //      skills  = which clean types this person is allocated (any of the 3)
  //      rating  = baseline cleaning rating 1–5 (used to prioritise allocation)
  //      status  = active | holiday | left  (only "active" gets rooms)
  //      lead    = management access (admin dashboard, allocation, ratings) ----
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
    { id:"anisha",     name:"Anisha",           pin:"1015" },
    { id:"laith",      name:"Laith Hardy",      pin:"1016", lead:true },
    { id:"ajay",       name:"Ajay Kawa",        pin:"1017", lead:true }
  ];

  // Fill in defaults for any staff record missing the newer fields, so older
  // saved configs pick up skills/rating/status without a reset.
  function normStaff(s){
    if(!s) return s;
    if(!Array.isArray(s.skills) || !s.skills.length) s.skills = SKILL_TYPES.slice();
    else s.skills = s.skills.filter(x=>SKILL_TYPES.indexOf(x)>=0);
    if(typeof s.rating !== 'number' || s.rating<1 || s.rating>5) s.rating = 3;
    if(STAFF_STATUSES.indexOf(s.status)<0) s.status = 'active';
    return s;
  }
  // Make sure the management leads always exist (owners / managers shouldn't
  // be accidentally removed). Adds any missing lead from the seed list.
  function ensureCoreStaff(staff){
    HK_STAFF.filter(s=>s.lead).forEach(core=>{
      if(!staff.some(s=>s.id===core.id)) staff.push(Object.assign({}, core));
    });
    return staff;
  }
  function canDoType(w, type){
    const sk=w && w.skills; if(!sk || !sk.length) return true;
    return sk.indexOf(type||'Departure')>=0;
  }

  // ---- Summarised checklists (from the Housekeeping Room Standard).
  //      Each item: key, short label, and a one-line "what this means" so the
  //      cleaner knows what the box covers without a long form. ----
  const CHECKLISTS = {
    Departure: [
      {k:"bedroom",   t:"Bedroom",            d:"Rubbish out, bed stripped & made with fresh linen, dusted high-to-low, mirrors smear-free."},
      {k:"dusting",   t:"Dusting",            d:"Wardrobes, tables, window sills, furniture and television — all dusted and wiped down."},
      {k:"tray",      t:"Tea tray & kettle",  d:"Cups & spoons clean, tray refilled (tea, coffee, sugar, milk, biscuits), kettle rinsed."},
      {k:"bathroom",  t:"Bathroom",           d:"Toilet (red cloth only), sink & tap, shower/bath, chrome shiny, mirror & 2 glasses."},
      {k:"towels",    t:"Towels & toiletries",d:"Fresh towels + bath mat, 2 toilet rolls, shower gel / shampoo / soap refilled."},
      {k:"floors",    t:"Floors",             d:"Vacuumed incl. edges & under the bed; hard floor mopped."},
      {k:"fixit",     t:"Fix-it check",       d:"Plugs, bulbs, TV & remote, kettle, hairdryer, hangers; safe open & reset."},
      {k:"amenities", t:"Guest info & extras",d:"Directory, Wi-Fi card, pen & notepad, spare roll & tissues in place."},
      {k:"final",     t:"Final check",        d:"Presentable, windows secure, heating set, lights off, card out, door locked."},
      {k:"dustcheck", t:"Final dust check",   d:"Last sweep for dust — tops of frames, skirtings, lamps, headboard, sockets, TV and ledges. Nothing missed."}
    ],
    Stayover: [
      {k:"rubbish",  t:"Rubbish & liners",   d:"Empty bins, fit new liners. Only clear the bin — never move guest items."},
      {k:"bed",      t:"Bed made",           d:"Bed straightened / made, pillows plumped."},
      {k:"bathroom", t:"Bathroom refreshed", d:"Toilet, sink, shower & chrome wiped; mirror clean."},
      {k:"towels",   t:"Towels & toiletries",d:"Replace towels as needed; top up toiletries & toilet roll."},
      {k:"tray",     t:"Tea tray refilled",  d:"Cups & spoons clean, tray restocked, kettle rinsed."},
      {k:"floors",   t:"Vacuum & mop",       d:"Vacuum the floor; mop any hard floor."},
      {k:"dustcheck",t:"Final dust check",   d:"Last sweep for dust — ledges, lamps, headboard, TV and surfaces. Nothing missed."}
    ],
    "Arrival-ready": [
      {k:"check",   t:"Room check",   d:"Quick look over a made-up room — clean, tidy, nothing missing."},
      {k:"amenity", t:"Amenities",    d:"Towels, toiletries, tea tray and toilet roll all present."},
      {k:"final",   t:"Final check",  d:"Fresh smell, heating set, lights off, card out, door locked."}
    ],
    WC: [
      {k:"pans",    t:"Toilets & urinals", d:"Pans, seats, urinals and cisterns cleaned and disinfected."},
      {k:"sinks",   t:"Sinks & taps",      d:"Sinks, taps and chrome cleaned and shined."},
      {k:"mirrors", t:"Mirrors & surfaces",d:"Mirrors, ledges and partitions wiped smear-free."},
      {k:"floor",   t:"Floor",             d:"Floor swept and mopped, including corners."},
      {k:"bins",    t:"Bins emptied",      d:"All bins and sanitary units emptied, new liners."},
      {k:"stock",   t:"Stocked",           d:"Soap, paper towels and toilet roll topped up."}
    ],
    Reception: [
      {k:"floors",   t:"Floors",           d:"Entrance and lobby floors swept and mopped / vacuumed."},
      {k:"surfaces", t:"Surfaces & desk",  d:"Reception desk, ledges and surfaces dusted and wiped."},
      {k:"glass",    t:"Glass & doors",    d:"Entrance glass and doors cleaned, handles wiped."},
      {k:"seating",  t:"Seating & tidy",   d:"Sofas / chairs straightened, cushions plumped, area tidy."},
      {k:"bins",     t:"Bins",             d:"Bins emptied, new liners."}
    ]
  };
  // which checklist a room/area type uses
  function checklistKeyFor(type){
    if(type==='Stayover') return 'Stayover';
    if(type==='Arrival-ready') return 'Arrival-ready';
    if(type==='Reception') return 'Reception';
    if(/WC|Toilet/i.test(type||'')) return 'WC';
    return 'Departure';
  }
  // target minutes per type (used for timers & efficiency)
  const TARGET_MIN = { Departure:25, Stayover:15, "Arrival-ready":10, "Gents WC":20, "Ladies WC":20, "Accessible WC":10, Reception:20 };

  // ---- Room-type options reception can tag a room with ----
  const ROOM_TYPES = ["Departure","Stayover","Arrival-ready"];
  // ---- Public areas (allocated alongside rooms). Toilets twice a day, reception once. ----
  const PUBLIC_AREAS = [
    { area:"Gents WC",      slots:["AM","PM"] },
    { area:"Ladies WC",     slots:["AM","PM"] },
    { area:"Accessible WC", slots:["AM","PM"] },
    { area:"Reception",     slots:["Daily"]  }
  ];

  // ---- Allocation: map a rota staff id → housekeeper-app id, and work out capacity.
  //      Capacity = (shift minutes − 30 min lunch) ÷ 45 min per room. ----
  const ROTA_TO_HH = {
    ruth_addison_30:'ruth', aryan_31:'aryan', lara_jervis_32:'lara', rahul_reghunath_33:'rahul',
    jitendra_34:'jitendra', manoj_35:'manoj', tushar_ambekar_36:'tushar', allen_37:'allen',
    hassen_38:'hassen', satya_51:'satya', ayomidipupo_yoemi_46:'ayomide', yaya_52:'yaya',
    dushyanth_39:'dushyanth', anisha_54:'anisha', edwin_53:'edwin', laith_hardy_55:'laith'
  };
  function shiftMins(sh){
    if(!sh) return 0; const s=String(sh).toLowerCase().trim();
    if(['off','holiday','sick','in lieu','on call',''].includes(s)) return 0;
    let t=0,m; const rg=/(\d+):(\d+)\s*-\s*(\d+):(\d+)/g;
    while((m=rg.exec(sh))){ let d=(+m[3]*60+ +m[4])-(+m[1]*60+ +m[2]); if(d<0)d+=1440; t+=d; } return t;
  }
  // Skill-, rating- and capacity-aware allocation.
  //   items   = array of {room, type}  (plain strings are treated as Departure)
  //   workers = [{hkId, name, cap, skills, rating}]
  // A room only goes to someone whose skills include that room's clean type.
  // Among eligible people we fill the lightest-loaded first; higher-rated
  // cleaners break ties (and are reached first once everyone is level).
  // Skill-, rating-, capacity- AND floor-aware allocation. Items carry {room,type,floor};
  // rooms are processed floor by floor and kept together, so each cleaner gets a
  // contiguous run on one floor/area rather than rooms scattered across the hotel.
  function distribute(items, workers){
    const plan=workers.map(w=>Object.assign({},w,{items:[]}));
    const norm=items.map(it=> (it && typeof it==='object') ? it : {room:it, type:'Departure', floor:''});
    norm.sort((a,b)=> String(a.floor||'').localeCompare(String(b.floor||'')) || (+a.room||0)-(+b.room||0));
    const onFloor=(w,f)=> w.items.filter(x=>String(x.floor||'')===String(f||'')).length;
    norm.forEach(it=>{
      const eligible=plan.filter(w=>canDoType(w, it.type));
      let pick;
      const under=eligible.filter(w=>w.items.length<w.cap);
      if(under.length){
        under.sort((a,b)=> onFloor(b,it.floor)-onFloor(a,it.floor) || (b.cap-b.items.length)-(a.cap-a.items.length) || (b.rating||3)-(a.rating||3) || a.items.length-b.items.length);
        pick=under[0];
      } else if(eligible.length){
        pick=eligible.slice().sort((a,b)=> onFloor(b,it.floor)-onFloor(a,it.floor) || a.items.length-b.items.length)[0];
      } else if(plan.length){ // nobody is skilled for this type → give to the lightest so it isn't dropped
        pick=plan.slice().sort((a,b)=>a.items.length-b.items.length)[0];
      }
      if(pick) pick.items.push(it);
    });
    return plan;
  }

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

  // ---- Real room inventory (from Guestline, 28 Oct 2026): [room, category code, floor].
  //      Floor: "G" = Ground, "1" = First. 120 bedrooms. ----
  const FLOOR_LABEL = { G:"Ground", "1":"First" };
  const REAL_ROOMS = [
    [1,"CLA_TWN","G"],[2,"CLA_DBL","G"],[3,"CLA_TWN","G"],[4,"CLA_TWN","G"],[5,"CLA_DBL","G"],[6,"CLA_TWN","G"],[7,"CLA_DBL","G"],[8,"CLA_TWN","G"],
    [9,"CLA_DBL","G"],[10,"CLA_TWN","G"],[11,"CLA_DBL","G"],[12,"CLA_TWN","G"],[13,"CLA_DBL","G"],[14,"CLA_TWN","G"],[15,"CLA_DBL","G"],[16,"CLA_TWN","G"],
    [17,"CLA_DBL","G"],[18,"CLA_TWN","G"],[19,"CLA_DBL","G"],[20,"CLA_TWN","G"],[21,"CLA_DBL","1"],[22,"CLA_TWN","1"],[23,"CLA_DBL","1"],[24,"CLA_TWN","1"],
    [25,"CLA_DBL","1"],[26,"CLA_TWN","1"],[27,"CLA_DBL","1"],[28,"CLA_TWN","1"],[29,"CLA_DBL","1"],[30,"CLA_TWN","1"],[31,"CLA_DBL","1"],[32,"CLA_TWN","1"],
    [33,"CLA_DBL","1"],[34,"CLA_TWN","1"],[35,"CLA_DBL","1"],[36,"CLA_TWN","1"],[37,"CLA_DBL","1"],[38,"CLA_TWN","1"],[39,"CLA_DBL","1"],[40,"CLA_TWN","1"],
    [41,"JSUI","G"],[42,"JSUI","G"],[43,"PRE_DBL","G"],[44,"PRE_DBL","G"],[45,"CLA_DBL","G"],[46,"CLA_DBL","G"],[47,"CLA_DBL","G"],[48,"CLA_DBL","G"],
    [49,"PRE_DBL","G"],[50,"JSUI","1"],[51,"CLA_DBL","1"],[52,"PRE_DBL","1"],[53,"PRE_DBL","1"],[54,"PRE_DBL","1"],[61,"CLA_DBL","1"],[62,"JSUI","1"],
    [101,"PRE_DBL","G"],[102,"EXE_DBL","G"],[103,"EXE_DBL_ACC","G"],[104,"EXE_TWN_ACC","G"],[105,"EXE_TWN","G"],[106,"EXE_TWN","G"],[107,"EXE_DBL","G"],[108,"EXE_TWN","G"],
    [109,"EXE_DBL","G"],[110,"EXE_TRP","G"],[111,"EXE_DBL","G"],[112,"EXE_TRP","G"],[113,"EXE_DBL","G"],[114,"EXE_DBL","G"],[115,"EXE_DBL","G"],[116,"EXE_DBL","1"],
    [117,"EXE_DBL","1"],[118,"EXE_DBL","1"],[119,"EXE_DBL","1"],[120,"EXE_DBL","1"],[121,"EXE_DBL","1"],[122,"EXE_DBL","1"],[123,"EXE_DBL","1"],[124,"EXE_DBL","1"],
    [125,"EXE_DBL","1"],[126,"EXE_DBL","1"],[127,"EXE_DBL","1"],[128,"EXE_DBL","1"],[129,"EXE_DBL","1"],[130,"PRE_DBL","1"],[131,"EXE_DBL","G"],[132,"EXE_DBL","G"],
    [133,"EXE_DBL_ACC","G"],[134,"EXE_DBL","G"],[135,"EXE_DBL","G"],[136,"EXE_DBL","G"],[137,"EXE_DBL_ACC","G"],[138,"EXE_DBL","G"],[139,"EXE_DBL","G"],[140,"EXE_DBL","G"],
    [141,"EXE_DBL","G"],[142,"EXE_DBL","G"],[143,"EXE_DBL","G"],[144,"EXE_DBL","G"],[145,"EXE_DBL","G"],[146,"EXE_DBL","G"],[147,"EXE_DBL","G"],[148,"EXE_DBL","G"],
    [149,"EXE_DBL","1"],[150,"EXE_DBL","1"],[151,"EXE_TWN","1"],[152,"EXE_DBL","1"],[153,"EXE_TWN","1"],[154,"EXE_DBL","1"],[155,"EXE_DBL","1"],[156,"EXE_DBL","1"],
    [157,"EXE_DBL","1"],[158,"EXE_DBL","1"],[159,"EXE_DBL","1"],[160,"EXE_DBL","1"],[161,"EXE_DBL","1"],[162,"EXE_TRP","1"],[163,"EXE_TRP","1"],[164,"EXE_TRP","1"]
  ];
  const ROOM_INFO = {}; REAL_ROOMS.forEach(a=>{ ROOM_INFO[String(a[0])]={cat:a[1], floor:a[2]}; });
  function roomInfo(room){ return ROOM_INFO[String(room)] || {cat:"", floor:""}; }
  function floorLabel(f){ return FLOOR_LABEL[f] || (f||""); }

  // ---- Default room list — the real Guestline inventory (room, category, floor) ----
  function defaultRooms(){
    const out=REAL_ROOMS.map(a=>({ room:String(a[0]), cat:a[1], floor:a[2] }));
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
    checklists: CHECKLISTS,
    get checklist(){ return CHECKLISTS.Departure.map(x=>x.t); }, // legacy
    checklistFor(type){ return CHECKLISTS[checklistKeyFor(type)] || CHECKLISTS.Departure; },
    targetMin(type){ return TARGET_MIN[type] || TARGET_MIN[checklistKeyFor(type)] || this.cfg().windowMin || 30; },
    publicAreas: PUBLIC_AREAS,
    roomTypes: ROOM_TYPES,
    skillTypes: SKILL_TYPES,
    staffStatuses: STAFF_STATUSES,
    distribute,              // skill/rating/capacity-aware allocator (shared with the app)
    canDoType,
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
           ensureCoreStaff(this._cfg.staff);          // leads (Ruth, Laith, Ajay) always present
           this._cfg.staff.forEach(normStaff);        // backfill skills / rating / status
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
    roomInfo, floorLabel,
    defaultRooms,            // full room inventory [{room,cat,floor}] — for the bulk picker
    floorOf(room){ return roomInfo(room).floor||""; },
    blankRoom(date,room,type,cat,note){
      const inf=roomInfo(room);
      return { date, room:String(room), type:type||"Departure", cat:cat||inf.cat||"", floor:inf.floor||"", status:"pending",
               housekeeper:"", housekeeperName:"", startAt:null, finishAt:null, durationSec:0,
               checklist:{}, geoStartOk:null, geoFinishOk:null, notes:note||"",
               area:false, slot:"", replaced:"", maintenance:"", lostProperty:"", updatedAt:Date.now() };
    },
    blankArea(date, area, slot){
      const id=area+(slot&&slot!=='Daily'?(' '+slot):'');
      return Object.assign(this.blankRoom(date, id, area.indexOf('WC')>=0?area:'Reception', '', ''), { area:true, slot:slot||'' });
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
          snap.forEach(d=>{ const r=d.data(); if(!want.has(r.room) && r.status==="pending" && !r.area){ batch.delete(db.collection("hoshouse_rooms").doc(this.docId(date,r.room))); } });
          await batch.commit();
          return true;
        }catch(e){ console.warn("setDayRooms live",e&&e.code); }
      }
      // local fallback
      const key="hoshouse_day_"+date; const have=lsGet(key,{});
      const map={};
      Object.values(have).forEach(r=>{ if(r && (r.area || (r.status && r.status!=="pending"))) map[String(r.room)]=r; }); // keep public areas + started/done rooms
      picks.forEach(p=>{ const r=String(p.room);
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
    // rooms across a date range (inclusive). start/end are "YYYY-MM-DD"; both null = all time.
    async getRoomsRange(start, end){
      if(ready){ try{ let q=db.collection("hoshouse_rooms");
        if(start) q=q.where("date",">=",start);
        if(end)   q=q.where("date","<=",end);
        const snap=await q.get(); return snap.docs.map(d=>d.data()); }catch(e){ console.warn("getRoomsRange",e&&e.code); } }
      const out=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i);
        if(k && k.indexOf("hoshouse_day_")===0){ const d=k.slice(13);
          if((!start||d>=start) && (!end||d<=end)){ try{ Object.values(JSON.parse(localStorage.getItem(k)||"{}")).forEach(r=>out.push(r)); }catch(e){} } } } }catch(e){}
      return out;
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
    // Remove a room from the day entirely (management correction — works at any status)
    async removeRoom(date, room){
      if(ready){ try{ await db.collection("hoshouse_rooms").doc(this.docId(date,room)).delete(); return true; }catch(e){ console.warn("removeRoom",e&&e.code); } }
      const key="hoshouse_day_"+date; const map=lsGet(key,{}); delete map[String(room)]; lsSet(key,map); return true;
    },

    // ----- room photos (completion shots + cannot-start door photos) -----
    // rec: { date, room, slot, label, dataUrl, by, byName, kind }
    async addPhoto(rec){
      rec.takenAt = rec.takenAt || Date.now();
      rec.room = String(rec.room);
      const id = rec.date+"__"+rec.room+"__"+rec.slot+"__"+rec.takenAt;
      if(ready){ try{ await db.collection("hoshouse_photos").doc(id).set(rec); return id; }catch(e){ console.warn("addPhoto",e&&e.code); } }
      const key="hoshouse_photos_"+rec.date; const arr=lsGet(key,[]); arr.push(Object.assign({id},rec)); lsSet(key,arr); return id;
    },
    async getRoomPhotos(date, room){
      room=String(room);
      if(ready){ try{ const snap=await db.collection("hoshouse_photos").where("date","==",date).where("room","==",room).get();
        return snap.docs.map(d=>d.data()).sort((a,b)=>(a.takenAt||0)-(b.takenAt||0)); }catch(e){ console.warn("getRoomPhotos",e&&e.code); } }
      return lsGet("hoshouse_photos_"+date,[]).filter(p=>String(p.room)===room).sort((a,b)=>(a.takenAt||0)-(b.takenAt||0));
    },

    // ----- public areas (toilets twice daily, reception once) -----
    async addPublicAreas(date){
      const have=await this.getDayRooms(date);
      const haveIds=new Set(have.map(r=>r.room));
      const add=[];
      PUBLIC_AREAS.forEach(a=> a.slots.forEach(slot=>{ const b=this.blankArea(date,a.area,slot); if(!haveIds.has(b.room)) add.push(b); }));
      if(!add.length) return 0;
      if(ready){ try{ const batch=db.batch(); add.forEach(b=>batch.set(db.collection("hoshouse_rooms").doc(this.docId(date,b.room)), b)); await batch.commit(); return add.length; }catch(e){ console.warn("addAreas",e&&e.code); } }
      const key="hoshouse_day_"+date; const map=lsGet(key,{}); add.forEach(b=>{ map[b.room]=b; }); lsSet(key,map); return add.length;
    },

    // ----- the day's housekeepers from the PUBLISHED rota, with capacity -----
    async rotaWorkers(date){
      let pub=null;
      if(ready){ try{ const d=await db.collection("hospro_public").doc("rota").get(); if(d.exists) pub=d.data(); }catch(e){ console.warn("rota read",e&&e.code); } }
      if(!pub){ try{ pub={ staff:JSON.parse(localStorage.getItem('sp_staff')||'[]'), rota:JSON.parse(localStorage.getItem('sp_rota')||'{}') }; }catch(e){ pub={staff:[],rota:{}}; } }
      const day=(pub.rota||{})[date]||{};
      const hhStaff=this.cfg().staff;
      const out=[];
      (pub.staff||[]).forEach(s=>{
        if(s.dept!=='housekeeping') return;
        const hkId=ROTA_TO_HH[s.id]; if(!hkId) return;
        const raw=day[s.id]; const sh=(raw&&typeof raw==='object')?raw.shift:raw;
        const mins=shiftMins(sh); if(mins<=0) return;
        const cap=Math.max(1, Math.floor((mins-30)/45));
        const hk=hhStaff.find(x=>x.id===hkId);
        if(hk && hk.status && hk.status!=='active') return;   // on holiday / left → skip
        out.push({ hkId, name:hk?hk.name:s.name, shift:sh, mins, cap,
                   skills:(hk&&hk.skills)||SKILL_TYPES.slice(),
                   rating:(hk&&typeof hk.rating==='number')?hk.rating:3 });
      });
      return out;
    },

    // ----- allocate the day's rooms + areas across the rostered housekeepers -----
    async autoAllocate(date){
      const workers=await this.rotaWorkers(date);
      const rooms=(await this.getDayRooms(date)).filter(r=>r.status!=='done' && r.status!=='in_progress');
      if(!workers.length) return { ok:false, reason:'no-staff' };
      if(!rooms.length) return { ok:false, reason:'no-rooms' };
      // rooms first (by number), then areas
      const ordered=rooms.slice().sort((a,b)=>(a.area?1:0)-(b.area?1:0) || (+a.room||0)-(+b.room||0));
      const plan=distribute(ordered.map(r=>({room:r.room, type:r.type, floor:r.floor||roomInfo(r.room).floor})), workers);
      const map={}; plan.forEach(w=>w.items.forEach(it=>{ map[it.room]={hkId:w.hkId, name:w.name}; }));
      const assigns=Object.keys(map).map(room=>({room, hkId:map[room].hkId, hkName:map[room].name}));
      if(ready){ try{ const batch=db.batch(); assigns.forEach(a=>batch.set(db.collection("hoshouse_rooms").doc(this.docId(date,a.room)),{housekeeper:a.hkId, housekeeperName:a.hkName, updatedAt:Date.now()},{merge:true})); await batch.commit(); }
        catch(e){ console.warn("allocate",e&&e.code); return {ok:false, reason:'save', error:e&&e.code}; } }
      else { const key="hoshouse_day_"+date; const m=lsGet(key,{}); assigns.forEach(a=>{ if(m[a.room]){ m[a.room].housekeeper=a.hkId; m[a.room].housekeeperName=a.hkName; } }); lsSet(key,m); }
      return { ok:true, assigned:assigns.length, plan, workers, totalCap:workers.reduce((t,w)=>t+w.cap,0) };
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
