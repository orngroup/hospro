/* ============================================================
   FIREBASE STORE — auth + Firestore with live sync
   Falls back to localStorage (demo mode) if Firebase is
   unavailable or not configured.
   ============================================================ */
let FB = { ready:false, auth:null, db:null, user:null };

(function initFirebase(){
  try{
    if(typeof firebase==="undefined" || !firebaseConfig || firebaseConfig.apiKey.startsWith("YOUR_")){
      console.info("Firebase not configured — running in demo mode.");
      return;
    }
    firebase.initializeApp(firebaseConfig);
    FB.auth = firebase.auth();
    FB.db = firebase.firestore();
    FB.ready = true;
    console.info("Firebase connected:", firebaseConfig.projectId);
  }catch(e){ console.warn("Firebase init failed, demo mode:", e.message); FB.ready=false; }
})();

/* ---- AUTH ---- */
async function fbSignIn(userKey, code){
  if(!FB.ready) return { ok:false, demo:true };
  const map = (typeof FB_LOGINS!=="undefined") ? FB_LOGINS[userKey] : null;
  if(!map) return { ok:false, error:"Unknown user" };
  if(code.toUpperCase()!==map.code) return { ok:false, error:"Incorrect access code" };
  try{
    await FB.auth.signInWithEmailAndPassword(map.email, map.pw);
    FB.user = map;
    return { ok:true, name:map.name };
  }catch(e){
    // common: user not created yet in Firebase console
    if(e.code==="auth/user-not-found" || e.code==="auth/invalid-credential")
      return { ok:false, error:"Account not set up in Firebase yet — see README step 5." };
    if(e.code==="auth/wrong-password")
      return { ok:false, error:"Password mismatch — check the padded password in Firebase." };
    return { ok:false, error:e.message };
  }
}
async function fbSignOut(){ if(FB.ready && FB.auth) try{ await FB.auth.signOut(); }catch{} FB.user=null; }

/* Public chat page has no login. To let it write an enquiry under the
   auth-only Firestore rules, sign in anonymously first. Requires
   Anonymous sign-in to be enabled in Firebase Auth. */
async function fbEnsureAnon(){
  if(!FB.ready) return false;
  if(FB.auth.currentUser) return true;
  try{ await FB.auth.signInAnonymously(); return true; }
  catch(e){ console.warn("Anon sign-in unavailable:", e.message); return false; }
}

/* ---- FIRESTORE ENQUIRY STORE ----
   Mirrors the demo Store API but backed by Firestore with a live
   listener. Falls back to the localStorage Store if not ready. */
const FBStore = {
  _cache: [],
  _listeners: [],
  live:false,

  onChange(cb){ this._listeners.push(cb); },
  _emit(){ this._listeners.forEach(cb=>cb(this._cache)); },

  start(){
    if(!FB.ready || !FB.user){ return false; }
    if(this.live) return true;
    this.live=true;
    FB.db.collection("enquiries").orderBy("created","desc")
      .onSnapshot(snap=>{
        this._cache = snap.docs.map(d=>({ id:d.id, ...d.data() }));
        this._emit();
      }, err=>{ console.warn("Firestore listener error:", err.message); });
    return true;
  },
  all(){ return this._cache; },
  async add(e){
    e.created = e.created || new Date().toISOString();
    e.status = e.status || "new";
    if(FB.ready && FB.user){
      const ref = await FB.db.collection("enquiries").add(e);
      return { id:ref.id, ...e };
    }
    return Store.add(e); // fallback
  },
  async update(id, patch){
    if(FB.ready && FB.user){ await FB.db.collection("enquiries").doc(id).update(patch); return; }
    Store.update(id, patch);
  },
  async seedOnce(samples){
    // only seed if the collection is empty AND not seeded before
    if(!FB.ready || !FB.user) return;
    const snap = await FB.db.collection("enquiries").limit(1).get();
    if(!snap.empty) return; // already has data
    const flag = await FB.db.collection("meta").doc("seeded").get();
    if(flag.exists) return;
    const batch = FB.db.batch();
    samples.forEach(s=>{ const ref=FB.db.collection("enquiries").doc();
      batch.set(ref, { ...s, created:s.created||new Date().toISOString(), status:s.status||"new" }); });
    batch.set(FB.db.collection("meta").doc("seeded"), { at:new Date().toISOString() });
    await batch.commit();
  }
};

/* ---- MARKETING LIBRARY (Cloudinary uploads + Firestore index) ----
   Uses Cloudinary's free tier (no billing / no Firebase Storage needed).
   Set CLOUDINARY below. Metadata (incl. the file URL) goes to Firestore
   'marketing' so it syncs across the team. */
const CLOUDINARY = {
  cloudName: "YOUR_CLOUD_NAME",      // from cloudinary.com dashboard
  uploadPreset: "brandonhall_unsigned" // create an UNSIGNED preset in Settings → Upload
};
function cloudinaryConfigured(){ return CLOUDINARY.cloudName && !CLOUDINARY.cloudName.startsWith("YOUR_"); }

const MktStore = {
  _cache: [], _listeners: [], live:false,
  onChange(cb){ this._listeners.push(cb); },
  _emit(){ this._listeners.forEach(cb=>cb(this._cache)); },
  start(){
    if(!FB.ready || !FB.user){ return false; }
    if(this.live) return true; this.live=true;
    FB.db.collection("marketing").orderBy("created","desc")
      .onSnapshot(snap=>{ this._cache=snap.docs.map(d=>({id:d.id,...d.data()})); this._emit(); },
        err=>console.warn("Marketing listener:",err.message));
    return true;
  },
  items(section){ return this._cache.filter(m=>m.section===section); },
  canUpload(){ return FB.ready && FB.user && cloudinaryConfigured(); },
  async upload(section, file, name){
    if(!FB.ready || !FB.user) throw new Error("Not signed in");
    if(!cloudinaryConfigured()) throw new Error("Cloudinary not configured — see README");
    // upload the file to Cloudinary (unsigned, free tier)
    const fd=new FormData();
    fd.append("file", file); fd.append("upload_preset", CLOUDINARY.uploadPreset);
    const isImg=file.type.startsWith("image/");
    const endpoint=`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${isImg?"image":"auto"}/upload`;
    const res=await fetch(endpoint,{ method:"POST", body:fd });
    if(!res.ok) throw new Error("Cloudinary upload failed ("+res.status+")");
    const data=await res.json();
    const type = isImg?"image":
                 file.type==="application/pdf"?"pdf":
                 file.type.startsWith("video/")?"video":"file";
    // save metadata to Firestore so the whole team sees it
    await FB.db.collection("marketing").add({ section, name:name||file.name,
      url:data.secure_url, publicId:data.public_id, type, size:file.size,
      created:new Date().toISOString(), by:FB.user.name||"" });
  },
  async remove(id){
    if(!FB.ready || !FB.user) return;
    await FB.db.collection("marketing").doc(id).delete();
    // (Cloudinary asset stays; deletion there needs a signed call — fine for a small team)
  }
};

/* ---- STAYCORP pre-check-in store (Firestore + local fallback) ---- */
const CorpGuestStore = {
  _cache: [], _listeners: [], live:false,
  onChange(cb){ this._listeners.push(cb); },
  _emit(){ this._listeners.forEach(cb=>cb(this._cache)); },
  start(){
    if(!FB.ready || !FB.user){ return false; }
    if(this.live) return true; this.live=true;
    FB.db.collection("precheckin").orderBy("created","desc")
      .onSnapshot(snap=>{ this._cache=snap.docs.map(d=>({id:d.id,...d.data()})); this._emit(); },
        err=>console.warn("Precheckin listener:",err.message));
    return true;
  },
  all(){ return this.live? this._cache : (JSON.parse(localStorage.getItem("bh_precheckin")||"[]")); },
  async add(rec){
    rec.created = rec.created || new Date().toISOString();
    if(FB.ready){
      if(!FB.user){ try{ await fbEnsureAnon(); }catch{} }
      try{ await FB.db.collection("precheckin").add(rec); return; }catch(e){ console.warn(e.message); }
    }
    // local fallback
    const l=JSON.parse(localStorage.getItem("bh_precheckin")||"[]");
    rec.id="PC-"+Date.now().toString(36).toUpperCase(); l.unshift(rec);
    localStorage.setItem("bh_precheckin", JSON.stringify(l));
  }
};

/* ---- GUEST FEEDBACK store (Firestore + local fallback) ---- */
const FeedbackStore = {
  _cache: [], _listeners: [], live:false,
  onChange(cb){ this._listeners.push(cb); },
  _emit(){ this._listeners.forEach(cb=>cb(this._cache)); },
  start(){
    if(!FB.ready || !FB.user){ return false; }
    if(this.live) return true; this.live=true;
    FB.db.collection("feedback").orderBy("created","desc")
      .onSnapshot(snap=>{ this._cache=snap.docs.map(d=>({id:d.id,...d.data()})); this._emit(); },
        err=>console.warn("Feedback listener:",err.message));
    return true;
  },
  all(){ return this.live? this._cache : (JSON.parse(localStorage.getItem("bh_feedback")||"[]")); }
};

/* ---- CONTRACTS store (Firestore + local fallback) ---- */
const ContractStore = {
  _cache: [], _listeners: [], live:false,
  onChange(cb){ this._listeners.push(cb); },
  _emit(){ this._listeners.forEach(cb=>cb(this._cache)); },
  start(){
    if(!FB.ready || !FB.user){ return false; }
    if(this.live) return true; this.live=true;
    FB.db.collection("contracts").orderBy("created","desc")
      .onSnapshot(snap=>{ this._cache=snap.docs.map(d=>({id:d.id,...d.data()})); this._emit(); },
        err=>console.warn("Contracts listener:",err.message));
    return true;
  },
  all(){ return this.live? this._cache : (JSON.parse(localStorage.getItem("bh_contracts")||"[]")); },
  async create(rec){
    rec.created=new Date().toISOString(); rec.status="sent";
    if(FB.ready && FB.user){ try{ const ref=await FB.db.collection("contracts").add(rec); return ref.id; }catch(e){ console.warn(e.message); } }
    const l=JSON.parse(localStorage.getItem("bh_contracts")||"[]");
    rec.id="CN-"+Date.now().toString(36).toUpperCase(); l.unshift(rec);
    localStorage.setItem("bh_contracts", JSON.stringify(l)); return rec.id;
  },
  async get(id){
    if(FB.ready){ if(!FB.user){ try{ await fbEnsureAnon(); }catch{} }
      try{ const d=await FB.db.collection("contracts").doc(id).get(); return d.exists?{id:d.id,...d.data()}:null; }catch(e){ console.warn(e.message); } }
    const l=JSON.parse(localStorage.getItem("bh_contracts")||"[]"); return l.find(c=>c.id===id)||null;
  },
  async sign(id, patch){
    if(FB.ready){ if(!FB.user){ try{ await fbEnsureAnon(); }catch{} }
      try{ await FB.db.collection("contracts").doc(id).update(patch); return true; }catch(e){ console.warn(e.message); } }
    const l=JSON.parse(localStorage.getItem("bh_contracts")||"[]");
    const i=l.findIndex(c=>c.id===id); if(i>=0){ Object.assign(l[i],patch); localStorage.setItem("bh_contracts",JSON.stringify(l)); }
    return true;
  }
};

/* ---- QUOTES store (view + accept links) ---- */
const QuoteStore = {
  all(){ return JSON.parse(localStorage.getItem("bh_quotes")||"[]"); },
  async create(rec){
    if(FB.ready && FB.user){ try{ await FB.db.collection("quotes").doc(rec.id).set(rec); }catch(e){ console.warn(e.message); } }
    const l=this.all().filter(q=>q.id!==rec.id); l.unshift(rec); localStorage.setItem("bh_quotes",JSON.stringify(l)); return rec.id;
  },
  async get(id){
    if(FB.ready){ if(!FB.user){ try{ await fbEnsureAnon(); }catch{} }
      try{ const d=await FB.db.collection("quotes").doc(id).get(); if(d.exists) return {id:d.id,...d.data()}; }catch(e){ console.warn(e.message); } }
    return this.all().find(q=>q.id===id)||null;
  },
  async accept(id, patch){
    if(FB.ready){ if(!FB.user){ try{ await fbEnsureAnon(); }catch{} }
      try{ await FB.db.collection("quotes").doc(id).update(patch); return true; }catch(e){ console.warn(e.message); } }
    const l=this.all(); const i=l.findIndex(q=>q.id===id); if(i>=0){ Object.assign(l[i],patch); localStorage.setItem("bh_quotes",JSON.stringify(l)); } return true;
  }
};
