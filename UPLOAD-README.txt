BRANDON HALL PORTAL — COMPLETE CURRENT SET (upload all 8 to brandonme)
======================================================================
Upload ALL of these, overwriting existing. sign.html + quote.html are
NEW pages (add them). Then paste firestore.rules into Firebase console.

  app.js            All logic — incl. T&C-on-quote FIX, deal tracker,
                    M&E printouts, e-signature, bar events, space-held
  index.html        Shell + all styles (deal tracker, contracts styles)
  data.js           M&E full lists (10 rooms), 27 T&C clauses, bar events
  firebase-store.js ContractStore + QuoteStore + FeedbackStore
  firestore.rules   -> PASTE into Firebase console (quotes + contracts)
  quote.html        NEW — client quote view + accept
  sign.html         NEW — client agreement e-signature
  feedback.html     Guest feedback (enlarged logo)

WHY UPLOAD ALL: these files reference each other. app.js uses stores in
firebase-store.js and styles in index.html — uploading one alone can
break a feature. Uploading all 8 guarantees a consistent set.

AFTER: hard refresh (Cmd+Shift+R).
