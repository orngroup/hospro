HosHOUSE (housekeeping) — upload these 3 files to the site root (replace each):
  app.js
  hoshouse.html
  hoshouse-config.js

What's new in this build:
  1. Vacant / Occupied per room (+ V/O on the room grid; housekeeper sees it).
  2. Desktop allocate: Auto-distribute OR "Assign each room" (per-room, mirrors the app).
  3. Editable public areas (Manage areas -> add/remove).
  4. Daily Occupancy % on the desktop "Today" bar + a set-once Total rooms figure
     -> shows rooms occupied / left to sell. Management overview gets an
     "Occupancy vs rooms cleaned" chart + avg-occupancy tile.

No data affected - all data lives in Firestore; these are code-only, merge-safe changes.
No Firestore rules change needed.
