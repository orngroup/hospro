# HosPRO Mobile — build notes (2 November 2026)

One installable app at **brandon.hospro.co.uk/app.html** — a single login, then each person sees only what their department and role allow. Directors see everything.

## What is in this pack (copy over the repo, do not replace it)

| File | What it is |
|---|---|
| `app.html` | The app entry point (PWA shell) |
| `app/app.css` | Shared design system (HosHOUSE look: navy headers, rounded cards, big tap targets) |
| `app/core.js` | User directory by department, PIN login, router, settings (PIN change, add/edit people), shared helpers |
| `app/mod-house.js` | Housekeeping — the full HosHOUSE app signed in automatically for housekeepers; a live room-status board for managers and reception |
| `app/mod-fix.js` | Maintenance — clean rebuild on the shared `hosfix_jobs` data: manager view, fixer view, assign/redeploy, timers, before/after photos, materials, receipts, £50 approval, cancel/reopen, PDF report |
| `app/mod-rec.js` | Reception — maintenance faults, housekeeping issues (flagged on today's room), guest requests, incidents, fire alarm tests, drills, activations, safety checks |
| `app/mod-fb.js` | Food & Beverage — daily figures (feeds the desktop F&B tracker), opening/closing checks with fridge temperatures, menus and 86'd list, F&B faults |
| `app/mod-sales.js` | Sales & Events — the shared enquiries pipeline (needs a portal login behind the scenes, signed in silently) |
| `app/mod-misc.js` | Fire Safety (test/drill status + HosFIRE app), Compliance (FixRay), My Rota |
| `app/mod-manage.js` | Director/manager overview across every department, "needs attention" list, daily operations report (PDF) |
| `app-manifest.json`, `app-sw.js` | Add-to-home-screen + network-first service worker |
| `firestore.rules` | **Must be deployed** — adds the new collections (see below) |
| `hoshouse-config.js` | **Fix:** the live copy was the older version without `raiseFixJob`, so "Report a fault" in HosHOUSE was failing. This is the newer copy (previously uploaded as `hoshouse-config (1).js`). |
| `hoshouse.html` | Two small additions only: shows "✓ Completed by maintenance" on a room once the HosFIX job is signed off |

Nothing else in the repo is changed. `hoshouse.html`, `hosmain.html`, `index.html` all keep working as before. The duplicate `hoshouse (1).html` / `hoshouse-config (1).js` files can be deleted from the repo once this pack is in.

## Deploy steps

1. Copy the files above into the `orngroup/hospro` repo (keep existing files).
2. Deploy the Firestore rules from Cloud Shell:
   `npx -y firebase-tools@latest deploy --only firestore:rules --project brandonhall-7bdef`
   (or paste `firestore.rules` into Firebase Console → Firestore → Rules → Publish).
3. Open `https://brandon.hospro.co.uk/app.html` on a phone → Share → Add to Home Screen.

Without step 2 the app still loads, but saving to the new collections (`hosrec_*`, `hosfix_photos`, `hosfix_timelogs`, `fb_daily`, `fb_checks`, `fb_menus`, `hospro_app`) will show "Save failed: permission-denied".

## Logins (unchanged from today — change any PIN in Settings)

Department → name → 4-digit PIN.

- Management: Raj 0000 · Ajay 1111 · Glenn 2222 · Alia **5555 (new — Alia had no PIN before)**
- Housekeeping: Ruth 1001 · Laith 1016 · housekeepers use their HosHOUSE PINs (one list — managed in HosHOUSE → Manage → Staff)
- Maintenance: Herman 3333 · Pete 4444
- Reception / F&B / Sales: 9999 (the old HosFIX "reporter" default) — change each in Settings → Team & access.

Personal links still work: `app.html?u=herman`.

## Who sees what

| Tier | People | Sees |
|---|---|---|
| Manager (admin) | Raj, Ajay, Alia, Glenn | Overview + every module, approvals, reassign, reports, Settings → Team & access |
| Lead | Ruth, Laith, Patrik, Jomy, David, Nicola | Their department's modules, can close incidents |
| Fixer | Herman, Pete (+ Glenn) | Maintenance: only jobs assigned to them, with timers/photos/costs/complete |
| Staff | everyone else | Their department's modules; can report faults and see their own reports |

Department → modules: Housekeeping (HosHOUSE, Maintenance, Rota) · Maintenance (Maintenance, Fire, Compliance, Rota) · Reception (Reception, Housekeeping board, Maintenance, Fire, Rota) · F&B (F&B, Maintenance, Fire, Rota) · Sales (Sales, Fire, Rota).

## Cross-department flow

- Housekeeping / Reception / F&B report a fault → `hosfix_jobs` (default assignees Herman & Pete; Glenn assignable and can redeploy) → fixers see it instantly → when completed, the room record gets `maintStatus: complete` and HosHOUSE shows "✓ Completed by maintenance".
- Reception "housekeeping issue" with a room number → today's room is flagged (note + urgent) in HosHOUSE and logged in `hosrec_requests`.
- Fire alarm test failure or an alarm activation → an urgent maintenance job is raised automatically.
- F&B fridge temperature out of range → a high-priority maintenance job is raised automatically.
- Managers' Overview and daily report pull all of it together.

## Data (same Firebase project `brandonhall-7bdef`)

Reused as-is: `hosfix_jobs` (same schema as HosFIX, status values `not-started | in-progress | pending_approval | complete | cancelled`), `hoshouse_rooms`, `hoshouse_photos`, `hoshouse_config`, `fb_submissions`, `enquiries`, `hospro_public/rota`.

New (open rules, like the housekeeping collections): `hospro_app/users` (PIN/role overrides), `hosfix_photos` (before/after/receipt photos kept out of the job doc), `hosfix_timelogs`, `hosrec_requests`, `hosrec_incidents`, `hosrec_fire`, `fb_daily`, `fb_checks`, `fb_menus`.

## Decisions taken overnight (easy to change)

- Entry URL `app.html`; old apps kept as fallbacks (Settings → Other apps).
- One PIN per person, carried over from today; housekeeping PINs stay in the HosHOUSE staff list.
- Approval threshold £50; approvers Raj, Ajay, Alia, Glenn.
- Status `in-progress` (hyphen) kept for compatibility with the old HosFIX app.
- Compliance scheduled tasks stay in FixRay (per the October decision); the app links to it.
- The HosHOUSE "report a fault" test code (3132) is untouched; faults raised from HosPRO Mobile need no code.

## Still to do / phase 2

- Real Firebase Auth with role claims and tightened rules (the new collections are open, like today's housekeeping data).
- Push notifications for new/assigned/completed jobs (the old HosFIX Cloud Functions could be pointed at the new app).
- F&B: wastage and stock counts if wanted; Sales: quotes are desktop-only for now.
- Guest-facing fault report page (`hosfix-report.html`) now works again once `hoshouse-config.js` is updated.

## Update 2 Nov 2026 (v2026.11.02b)
- Stays signed in on the phone for 14 days (Sign out is in Settings), so the home-screen icon opens straight to your screens.
- Managers land on the **Hotel overview** (Today / 7 days / Rooms 360°): occupancy, arrivals and departures (from the portal forecast until the Guestline API is live), needs-attention list, 7-day charts for rooms cleaned, maintenance raised vs fixed, open jobs by area, F&B sales and month-to-date, sales pipeline by stage, reception activity; **Rooms 360°** shows one room's full history (cleaning, maintenance, requests, incidents).
- Opening Housekeeping as a manager goes straight into HosHOUSE with no second sign-in (needs the updated `hoshouse.html`); My Rota opens on your own shifts.
- Tighter, more app-like look: compact tiles and stats, bottom navigation on Home/Overview/Settings, module colour in the status bar, screen transitions.

## Update 2 Nov 2026 (v2026.11.02c) — home-screen icons
- New HosPRO app icons in `assets/app/`: a navy tile with the H mark and wordmark, plus one per department (Management, Housekeeping, Maintenance, Reception, Food & Bev, Sales) with the swoosh in the department colour.
- Whoever is signed in gets their department's icon when they add to the home screen (iPhone and Android). Department links also work before sign-in: `app.html?d=housekeeping`, `?d=reception`, `?d=fb`, `?d=sales`, `?d=maintenance`, `?d=management`. The manifests are `app-manifest.json` and `app-manifest-<department>.json`.
- In-app tiles and navigation now use proper line icons in HosPRO colours instead of emoji, so they look the same on every phone.

## Update 2 Nov 2026 (v2026.11.02d) — HosHOUSE
- A room that is already signed off can be opened again ("Open" on the done card): cleaning is locked, but maintenance, items replaced, lost property and "Report a fault" stay live.
- The maintenance "Report" button is on every room at every status, solid brown (green "Fixed ✓" once maintenance has signed the job off).
- The testing code (3132) on "Report a fault" is removed — any housekeeper can raise a fault straight to Herman & Pete.
