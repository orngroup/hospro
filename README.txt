HosHOUSE (housekeeping) — upload these 3 files to the site root (replace each):
  app.js
  hoshouse.html
  hoshouse-config.js

Changes:
  1. Vacant / Occupied per room (+ V/O on the room grid; housekeeper sees it).
  2. Desktop allocate: Auto-distribute OR "Assign each room" (per-room, mirrors the app).
  3. Editable public areas (Manage areas -> add/remove).

No data affected - all housekeeping data lives in Firestore, not these files.
No Firestore rules change needed.
