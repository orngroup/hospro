HosHOUSE — Guest Requests v2 (now inside the app + desktop)
Upload these 3 files to the SITE ROOT (replace existing):
  app.js               -> desktop portal: new "Guest Requests" tab + Today banner
  hoshouse.html        -> mobile app: new Guest Requests screen (housekeepers action it)
  hoshouse-request.html-> request form now uses a ROOM PICKER (no free text)

Firebase: make sure the hoshouse_requests rule is published (from the rules
I gave earlier). No other rule change.

IMPORTANT: these changes are ADDITIVE and only use the hoshouse_requests
collection. No room, cleaning, allocation or occupancy data is touched.
