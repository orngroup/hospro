/* THE CLARENDON CLUB — site settings
   Public web settings only (the same Firebase web config every HosPRO page uses).
   Secrets (back-office PIN, tablet set-up code, Resend key) live in Cloud Functions, never here. */
window.CLUB_CONFIG = {
  demo: false,                       // true = runs entirely in this browser with sample data (preview / training)
  firebase: {
    apiKey: "AIzaSyDnPWrPGInDRTCF1Go710XC_8_77l_72i0",
    authDomain: "brandonhall-7bdef.firebaseapp.com",
    projectId: "brandonhall-7bdef",
    storageBucket: "brandonhall-7bdef.firebasestorage.app",
    messagingSenderId: "391317900568",
    appId: "1:391317900568:web:643c9d6691f7f16d65226d"
  },
  region: "europe-west1",
  vapidKey: "BEBKqO0IojcBixBGbEb8hH-aCuy9J6MwQct5dp08xs6J2CjpPEStpSNoJuDpqHcvWuYpRviNVzfDKy4gQUigQPI",
  joinUrl: "https://brandon.hospro.co.uk/club/",           // printed on the table talkers
  bookUrl: "https://brandon.hospro.co.uk/hosfb/book.html", // "Book a table" button
  websiteUrl: "https://www.brandonhallhotelandspa.com/"
};
