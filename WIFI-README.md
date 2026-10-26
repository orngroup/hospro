# Brandon Hall Guest Wi-Fi — welcome page

**Live URL (once uploaded):** https://brandon.hospro.co.uk/wifi/
**Preview without recording:** https://brandon.hospro.co.uk/wifi/?preview=1

## Files in this zip (copy over the repo, nothing is deleted)
- `wifi/index.html`  — the welcome page guests see (new)
- `wifi-db.js`       — HosSTUDIO → "Wi-Fi Guest Database" tab (new)
- `firestore.rules`  — adds the `wifi_signups` collection (publish in Firebase Console → Firestore → Rules)
- `data.js`, `app.js`, `index.html` — register the new tab (small edits)

## What to tell the Wi-Fi provider
1. Set the **Brandon Hall Guest Wi-Fi** splash page / captive portal to the external URL
   `https://brandon.hospro.co.uk/wifi/` so every new connection is redirected there.
2. Allow these domains through the walled garden (reachable before login):
   `brandon.hospro.co.uk`, `www.gstatic.com`, `firestore.googleapis.com`,
   `fonts.googleapis.com`, `fonts.gstatic.com`
3. Tell us which system they run (UniFi, Cisco Meraki, Aruba, Ruckus, Purple…) and the
   **approval / grant URL** their gateway expects us to send the guest to after the form
   (plus any fixed username/password it needs). Put those into the `WIFI` settings block
   at the top of `wifi/index.html`:
   - `vendor`: `none` (default), `meraki`, `unifi` or `generic`
   - `grantUrl`, `grantMethod` (`GET`/`POST`), `extraFields`
   - `continueUrl`: where guests land afterwards (hotel website)

Until the grant URL is set the page still works and records every guest; it shows
"You're connected" and sends them to the hotel website. Session length, bandwidth and
re-authentication intervals are set on the provider's side.

## What is recorded (Firestore `wifi_signups`)
name, email, purpose (Leisure/Business), marketing opt-in (separate unticked box),
terms accepted + consent timestamp, SSID, device/AP identifiers if the gateway passes them,
returning-visit flag. Returning devices skip the form for 180 days ("Welcome back, …").
