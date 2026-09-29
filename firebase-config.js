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
  "patrik.vlach":       { email:"patrik.vlach@brandonhall.portal",       pw:"3vjCLX5sAAIAKvI8", code:"BHPV", name:"Patrik Vlach" }
};
