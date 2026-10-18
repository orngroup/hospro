/* ============================================================
   FIREBASE CONFIG — Brandon Hall Portal
   Live project: brandonhall-7bdef
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDnPWrPGInDRTCF1Go710XC_8_77l_72i0",
  authDomain: "brandonhall-7bdef.firebaseapp.com",
  projectId: "brandonhall-7bdef",
  storageBucket: "brandonhall-7bdef.firebasestorage.app",
  messagingSenderId: "391317900568",
  appId: "1:391317900568:web:643c9d6691f7f16d65226d"
};

/* Login mapping — the four accounts.
   Team types their name + short code (BHAK); we map to the
   Firebase email + padded password behind the scenes. */
const FB_LOGINS = {
  "ajay.kawa":         { email:"ajay.kawa@brandonhall.portal",         pw:"BHAK01", code:"BHAK", name:"Ajay Kawa" },
  "raj.kumar":         { email:"raj.kumar@brandonhall.portal",         pw:"BHRK01", code:"BHRK", name:"Raj Kumar" },
  "alia.taub":         { email:"alia.taub@brandonhall.portal",         pw:"BHAT01", code:"BHAT", name:"Alia Taub" },
  "nicola.cartwright": { email:"nicola.cartwright@brandonhall.portal", pw:"BHNC01", code:"BHNC", name:"Nicola Cartwright" },
  "natalie.freeman":    { email:"natalie.freeman@brandonhall.portal",    pw:"zqPdm3tcsTWFJecj", code:"BHNF", name:"Natalie Freeman" },
  "patrik.vlach":       { email:"patrik.vlach@brandonhall.portal",       pw:"3vjCLX5sAAIAKvI8", code:"BHPV", name:"Patrik Vlach" },
  "veronica.webb":      { email:"veronica.webb@brandonhall.portal",      pw:"ukParWZdj9Udkuaw", code:"BHVW", name:"Veronica Webb" },

  /* ── Spare login slots ──────────────────────────────────────────
     Pre-made so new people can be added in Admin → Users without any
     coding. Create each one ONCE in Firebase Console → Authentication
     (email below, password = the code shown here), then assign it to a
     person in the Admin panel. Add more slots here if you run out. */
  "staff1": { email:"staff1@brandonhall.portal", pw:"BHSPARE01", code:"BH01", name:"Spare slot 1", spare:true },
  "staff2": { email:"staff2@brandonhall.portal", pw:"BHSPARE02", code:"BH02", name:"Spare slot 2", spare:true },
  "staff3": { email:"staff3@brandonhall.portal", pw:"BHSPARE03", code:"BH03", name:"Spare slot 3", spare:true },
  "staff4": { email:"staff4@brandonhall.portal", pw:"BHSPARE04", code:"BH04", name:"Spare slot 4", spare:true },
  "staff5": { email:"staff5@brandonhall.portal", pw:"BHSPARE05", code:"BH05", name:"Spare slot 5", spare:true },
  "staff6": { email:"staff6@brandonhall.portal", pw:"BHSPARE06", code:"BH06", name:"Spare slot 6", spare:true },
  "staff7": { email:"staff7@brandonhall.portal", pw:"BHSPARE07", code:"BH07", name:"Spare slot 7", spare:true },
  "staff8": { email:"staff8@brandonhall.portal", pw:"BHSPARE08", code:"BH08", name:"Spare slot 8", spare:true }
};
