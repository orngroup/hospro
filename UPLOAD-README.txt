BRANDON HALL PORTAL — UPDATE (upload all to your brandonme repo)
================================================================
Upload these 8 files, letting GitHub overwrite the existing ones.
Two are NEW pages: quote.html and sign.html.

FILES
  app.js            Main app logic (deal tracker, M&E printouts, contracts)
  index.html        Shell + all styles
  data.js           Data (M&E full equipment lists, contract T&Cs, bar events)
  firebase-store.js Stores (contracts, quotes, feedback)
  firestore.rules   Security rules — PASTE into Firebase console
  quote.html        NEW — client quote view + accept page
  sign.html         NEW — client agreement e-signature page
  feedback.html     Guest feedback page (bigger logo)

WHAT'S IN THIS UPDATE
  - Deal workflow: Issue quote -> client accepts -> issue agreement ->
    client signs -> counter-sign -> confirmed (tracked on each enquiry)
  - Full T&Cs on quotes + built-in e-signature (client + counter-sign)
  - M&E: full equipment list for ALL 10 rooms + print requirements list
    + supplier quote-request (RFQ) buttons
  - Bar sporting/TV events calendar (Oct 2026 - Mar 2027)
  - Space held in Guestline tracking + chase emails
  - Enlarged BH logo on feedback card & QR poster

AFTER UPLOAD
  - Firebase console: paste firestore.rules (adds quotes + contracts)
  - Hard refresh (Cmd+Shift+R)
