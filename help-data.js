/* ============================================================
   HosPRO — Help library (v2, foolproof)
   Powers the Help Centre page (sidebar + guide) and the floating "?".
   Each entry: { t:title, w:what it's for, h:[step-by-step],
                 see:"what you'll see", tip:[tips], img:"<HELP_SVG key>" }
   ============================================================ */

/* ---- Simple annotated illustrations (inline SVG, theme-safe) ---- */
const HELP_SVG = {
  layout: `<svg viewBox="0 0 520 300" width="100%" style="max-width:520px;border:1px solid #e4e9ef;border-radius:10px;background:#fff">
    <rect x="0" y="0" width="520" height="300" fill="#f6f8fa"/>
    <rect x="0" y="0" width="520" height="40" fill="#1a2b3a"/>
    <text x="14" y="25" fill="#fff" font-size="13" font-weight="700" font-family="Arial">HosPRO</text>
    <rect x="360" y="9" width="58" height="22" rx="6" fill="#2a3b4d"/><text x="368" y="24" fill="#cdd8e4" font-size="11" font-family="Arial">❔ Help</text>
    <rect x="424" y="9" width="44" height="22" rx="6" fill="#1e6b2f"/><text x="432" y="24" fill="#fff" font-size="11" font-family="Arial">Live</text>
    <rect x="0" y="40" width="150" height="260" fill="#223647"/>
    <text x="14" y="70" fill="#9fb2c6" font-size="11" font-family="Arial">Menu</text>
    <rect x="12" y="80" width="126" height="18" rx="4" fill="#2f4859"/><rect x="12" y="104" width="126" height="18" rx="4" fill="#2f4859"/><rect x="12" y="128" width="126" height="18" rx="4" fill="#2f4859"/>
    <rect x="170" y="60" width="330" height="60" rx="8" fill="#fff" stroke="#e4e9ef"/>
    <rect x="170" y="132" width="158" height="140" rx="8" fill="#fff" stroke="#e4e9ef"/>
    <rect x="342" y="132" width="158" height="140" rx="8" fill="#fff" stroke="#e4e9ef"/>
    <circle cx="486" cy="270" r="18" fill="#1a2b3a"/><text x="480" y="276" fill="#fff" font-size="16" font-weight="700" font-family="Arial">?</text>
    <text x="150" y="150" fill="#1a2b3a" font-size="11" font-family="Arial" text-anchor="end"></text>
    <line x1="470" y1="30" x2="398" y2="30" stroke="#b4231f" stroke-width="1.5"/><text x="300" y="300" fill="#b4231f" font-size="10" font-family="Arial">↑ Help button &amp; Live badge (top-right)</text>
    <text x="360" y="260" fill="#b4231f" font-size="10" font-family="Arial" text-anchor="end">? on every page →</text>
  </svg>`,
  login: `<svg viewBox="0 0 320 210" width="100%" style="max-width:320px;border:1px solid #e4e9ef;border-radius:10px;background:#eef1f5">
    <rect x="60" y="20" width="200" height="170" rx="12" fill="#fff" stroke="#e4e9ef"/>
    <text x="160" y="52" text-anchor="middle" fill="#1a2b3a" font-size="13" font-weight="700" font-family="Arial">Sign in</text>
    <text x="80" y="80" fill="#6b7280" font-size="10" font-family="Arial">Your name</text>
    <rect x="80" y="86" width="160" height="26" rx="6" fill="#f6f8fa" stroke="#d7dde4"/><text x="90" y="103" fill="#1a2b3a" font-size="11" font-family="Arial">Ajay Kawa ▾</text>
    <text x="80" y="128" fill="#6b7280" font-size="10" font-family="Arial">Code</text>
    <rect x="80" y="134" width="160" height="26" rx="6" fill="#f6f8fa" stroke="#d7dde4"/><text x="90" y="151" fill="#1a2b3a" font-size="11" font-family="Arial">• • • •</text>
    <rect x="80" y="168" width="160" height="14" rx="4" fill="#1a2b3a"/>
  </svg>`,
  hkflow: `<svg viewBox="0 0 520 90" width="100%" style="max-width:520px">
    <g font-family="Arial">
    <rect x="4" y="20" width="150" height="50" rx="9" fill="#e4edf4" stroke="#3B6585"/><text x="79" y="42" text-anchor="middle" fill="#1a2b3a" font-size="12" font-weight="700">1 · Reception</text><text x="79" y="58" text-anchor="middle" fill="#5b6b7b" font-size="10">picks the rooms</text>
    <text x="166" y="50" font-size="18" fill="#8296a8">→</text>
    <rect x="185" y="20" width="150" height="50" rx="9" fill="#e3f0ec" stroke="#2E6B5E"/><text x="260" y="42" text-anchor="middle" fill="#1a2b3a" font-size="12" font-weight="700">2 · Housekeeper</text><text x="260" y="58" text-anchor="middle" fill="#5b6b7b" font-size="10">cleans on phone</text>
    <text x="347" y="50" font-size="18" fill="#8296a8">→</text>
    <rect x="366" y="20" width="150" height="50" rx="9" fill="#f4ece0" stroke="#8a5a2b"/><text x="441" y="42" text-anchor="middle" fill="#1a2b3a" font-size="12" font-weight="700">3 · Manager</text><text x="441" y="58" text-anchor="middle" fill="#5b6b7b" font-size="10">sees it live</text>
    </g></svg>`,
  quoteflow: `<svg viewBox="0 0 520 90" width="100%" style="max-width:520px"><g font-family="Arial" font-size="10">
    <rect x="2" y="25" width="92" height="40" rx="8" fill="#eef2f8" stroke="#6E4E7A"/><text x="48" y="49" text-anchor="middle" fill="#1a2b3a" font-weight="700">Enquiry</text>
    <text x="98" y="49" fill="#8296a8">→</text>
    <rect x="112" y="25" width="92" height="40" rx="8" fill="#eef2f8" stroke="#6E4E7A"/><text x="158" y="49" text-anchor="middle" fill="#1a2b3a" font-weight="700">Build quote</text>
    <text x="208" y="49" fill="#8296a8">→</text>
    <rect x="222" y="25" width="92" height="40" rx="8" fill="#eef2f8" stroke="#6E4E7A"/><text x="268" y="49" text-anchor="middle" fill="#1a2b3a" font-weight="700">Send link</text>
    <text x="318" y="49" fill="#8296a8">→</text>
    <rect x="332" y="25" width="92" height="40" rx="8" fill="#e9f5ef" stroke="#2a6a4a"/><text x="378" y="49" text-anchor="middle" fill="#1a2b3a" font-weight="700">Accepted</text>
    <text x="428" y="49" fill="#8296a8">→</text>
    <rect x="440" y="25" width="78" height="40" rx="8" fill="#f4ece0" stroke="#8a5a2b"/><text x="479" y="45" text-anchor="middle" fill="#1a2b3a" font-weight="700">Proforma</text><text x="479" y="57" text-anchor="middle" fill="#5b6b7b">+ contract</text>
    </g></svg>`,
  tap: `<svg viewBox="0 0 320 120" width="100%" style="max-width:320px"><rect x="0" y="0" width="320" height="120" fill="#f6f8fa" rx="10"/>
    <circle cx="250" cy="80" r="26" fill="#1a2b3a"/><text x="250" y="90" text-anchor="middle" fill="#fff" font-size="26" font-weight="700" font-family="Arial">?</text>
    <text x="40" y="55" fill="#1a2b3a" font-size="13" font-weight="700" font-family="Arial">Stuck on any page?</text>
    <text x="40" y="76" fill="#5b6b7b" font-size="11" font-family="Arial">Tap the round ? button</text>
    <text x="40" y="92" fill="#5b6b7b" font-size="11" font-family="Arial">(bottom-right) for a guide.</text>
    <path d="M150 84 q40 10 72 0" stroke="#b4231f" fill="none" stroke-width="1.5" marker-end="url(#ah)"/>
    <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#b4231f"/></marker></defs>
  </svg>`
};

/* ---- Getting Started (shown first in the Help Centre) ---- */
const HELP_GS = [
  { id:"gs-welcome", t:"Welcome — start here", img:"layout",
    w:"HosPRO is the hotel's management system. This Help Centre explains every part in plain English. Pick a topic from the menu on the left, or search at the top.",
    h:["The dark strip on the left is the menu — click a module (like HosSALES) to open it.","The bar across the very top shows the ❔ Help button and the green 'Live' badge.","The round ? button in the bottom-right corner gives help for whatever page you're on.","If you're not sure where something is, just type what you want in the search box."],
    see:"A left-hand menu, a top bar, and your work in the middle of the screen.",
    tip:["You can't break anything by clicking around — have a look and explore."] },
  { id:"gs-login", t:"How to log in", img:"login",
    w:"How to get into the HosPRO portal.",
    h:["Go to brandon.hospro.co.uk in your web browser.","Choose your name from the list.","Type your 4-letter code (you've been given this — e.g. Ajay's is BHAK).","Click Sign in."],
    see:"A sign-in card with your name and a box for your code.",
    tip:["Forgotten your code? Ask Ajay.","On a phone, add the page to your home screen so it opens like an app."] },
  { id:"gs-getaround", t:"Finding your way around", img:"layout",
    w:"How the screen is laid out, so you always know where you are.",
    h:["Left menu: the modules (Sales, Venue, Revenue, Maintenance, People, etc.). Click one to open it.","Top bar: your name, the Help button and the Live badge.","Middle: whatever you're working on.","Breadcrumb: when you go into a section, a '← Home' link appears at the top to get back."],
    see:"Menu on the left, your work in the middle.",
    tip:["Greyed-out items mean you don't have access — ask Ajay or Raj if you need it."] },
  { id:"gs-help", t:"Getting help on any page", img:"tap",
    w:"Two ways to get help whenever you need it.",
    h:["On any page, tap the round ? button in the bottom-right corner — a guide for that exact page pops up.","Or click ❔ Help at the top to open this Help Centre and browse or search everything."],
    see:"A pop-up with simple steps for the page you're on.",
    tip:["Every page has its own guide — you're never on your own."] }
];

/* ---- Per-page guides ---- */
const HELP_CONTENT = {

  home: { t:"Home", w:"Your starting point — the welcome board, the latest notices, quick links to common jobs, and the cards that open each module.",
    h:["Click any module card (HosSALES, HosVENUE, HosREV…) to open that area.","Use the quick-links row for one-tap jobs (create an invoice, open the clock-in).","Watch the board for new enquiry alerts."],
    see:"Module cards and a row of quick links.",
    tip:["Greyed-out cards mean no access for you — ask Ajay or Raj."] },

  /* ---------- HosSALES ---------- */
  pipeline: { t:"Sales Pipeline", img:"quoteflow",
    w:"The heart of sales — every enquiry and deal from first contact to confirmed booking.",
    h:["Each card is one enquiry. Click a card to open it.","Inside, you'll see the customer, the event and the deal progress.","To quote, click 'Build quote' — this opens the Quote Builder for that customer.","Move the deal along as it progresses: enquiry → quoted → accepted → agreement → confirmed.","Add a new enquiry with the + button; search or filter to find existing ones."],
    see:"Columns of enquiry cards by stage.",
    tip:["Always quote from here — it keeps the customer and the acceptance linked to the deal."] },
  quotes: { t:"Quotes & Proposals",
    w:"Every proposal you've made, with its status, plus the jobs to do once a customer accepts.",
    h:["At the top, 'Accepted — ready to convert' lists quotes the customer has said yes to.","For an accepted quote, click 📞 Call, 🧾 Proforma (invoice with bank details), or 📝 Agreement (contract to sign).","Below, use the search or status filter to find any quote.","On a quote row: Open re-opens it, Copy grabs the client link, Email drafts the message."],
    see:"A green 'ready to convert' panel, then a searchable list of all quotes.",
    tip:["A quote only appears here after you've created its client link in the builder."] },
  quote: { t:"Quote Builder", img:"quoteflow",
    w:"Build a full proposal for a customer, then send them a link to view and accept it online.",
    h:["Open it from an enquiry in the Sales Pipeline (click 'Build quote').","Click '+ Add room' for a function room — pick the room, date, layout and number of guests.","Choose a package from the 'Package' dropdown and tick any menu items.","Add bedrooms with '+ Add accommodation' and any one-off costs with '+ Add custom line'.","Set how they pay under 'Payment terms' (or click 'Use standard schedule').","Click '🔤 Spell check' and '📄 View T&Cs' to check it reads right.","Click 'Create client proposal link' — a box opens with three ways to send: Copy link, Download PDF, or WhatsApp.","Use 'Save quote' to keep it, or 'New quote (same client)' to make a second version."],
    see:"The builder on the left, a live quote summary with the total on the right.",
    tip:["Terms & conditions are added automatically — you don't need to attach them.","You can't start a blank quote — always open the customer's enquiry first."] },
  profit: { t:"Profit Tool", w:"A quick profit calculator for an event — check the margin before you commit to a price.",
    h:["Type in the revenue (what they pay) and the costs.","The tool shows the gross profit and the margin %.","Change a price or cost to see the effect."],
    see:"Revenue and cost boxes with a profit figure.",
    tip:["Use it to sanity-check a quote before you send it."] },
  contracts: { t:"Agreements", w:"Formal booking agreements — send the customer a link to sign, then you counter-sign to confirm.",
    h:["Create an agreement from an accepted quote or enquiry.","The customer gets a secure link to read and sign online.","Once they've signed, you counter-sign to confirm.","Track signed and outstanding agreements in the list."],
    see:"A list of agreements with their signing status.",
    tip:["The agreement includes the full terms automatically."] },
  payments: { t:"Payments", w:"Track deposits and balances — what's scheduled, paid, and overdue, across all bookings.",
    h:["The totals at the top show scheduled, paid, outstanding and overdue.","The list shows what's due and when.","Tick instalments as paid when the money comes in."],
    see:"Totals at the top, a due-payments list below.",
    tip:["Schedules come from each quote — they flow in here automatically."] },
  dining: { t:"Dining & Banqueting", w:"Plan food and drink for events — covers, menus and setup.",
    h:["Set the number of covers for food and drink.","Choose menus and note any special requirements."], see:"", tip:[] },
  beverage: { t:"Beverage Management", w:"The bar — drinks lists, packages and stock.",
    h:["Browse and edit drinks and packages.","Track bar stock."], see:"", tip:[] },
  fbTracker: { t:"F&B Sales & Costs", w:"Daily food & beverage figures and gross profit against target.",
    h:["Enter each day's outlet sales and supplier invoices.","See GP% against target."], see:"", tip:["Reception can submit the daily figures from the Home quick link."] },
  localEvents: { t:"Local Events", w:"Concerts, shows and sport nearby that drive demand.",
    h:["Browse upcoming events and their likely impact.","Cross-check with HosREV for busy nights."], see:"", tip:[] },
  chat: { t:"Events Planning", w:"A space to coordinate events with the team.", h:["Keep event notes and discussion together."], see:"", tip:[] },

  /* ---------- HosVENUE ---------- */
  rooms: { t:"Meeting Rooms", w:"Every meeting/event room with sizes, capacities and hire rates.",
    h:["Click a room to see capacities for each layout and a seating diagram.","Check the half-day / full-day hire rates.","Use it to pick the right space for a group."], see:"", tip:["Rates feed the Quote Builder automatically."] },
  groupconfig: { t:"Room Configurator", w:"Work out room layouts and bedroom allocation for a group.",
    h:["Enter the group's numbers and needs.","Use the suggested setup in your quote."], see:"", tip:[] },
  packages: { t:"Packages", w:"Delegate, event and wedding packages, add-ons and Christmas pricing — fully editable.",
    h:["Browse the package cards.","Click 'Edit' on any card to change its name, price, minimum or what's included.","Click 'Add package' to create a new one.","Changes save automatically and appear in the Quote Builder's package list."],
    see:"Cards for each package with an Edit button.", tip:["Edits sync straight through to quotes."] },
  corpdb: { t:"Corporate Database", w:"Your corporate accounts and contacts.",
    h:["Search or browse accounts.","Open one for contacts and agreed rates."], see:"", tip:[] },
  corprates: { t:"Corporate Rates", w:"Negotiated corporate room rates.",
    h:["Review agreed rates.","Update when agreements renew."], see:"", tip:[] },
  precheckin: { t:"Pre Check-in Setup", w:"The online form guests fill in before arrival.",
    h:["Review the fields guests complete.","Share the pre-check-in link with upcoming guests."], see:"", tip:[] },
  feedback: { t:"Guest Feedback & QR", w:"Collect guest feedback via a QR code and form.",
    h:["Display or print the QR code.","Review feedback as it comes in."], see:"", tip:[] },

  /* ---------- HosREV ---------- */
  revDash: { t:"HosREV Dashboard", w:"Your revenue-management home — a morning brief with rate recommendations and quiet nights.",
    h:["Read the morning brief for the headline on pricing and demand.","Check the quiet nights flagged to fill.","Go to the Rate Calendar to approve or adjust."], see:"", tip:["Recommendations are led by competitor rates, reviewed across the next 365 nights."] },
  revCalendar: { t:"Rate Calendar", w:"A night-by-night grid of recommended rates — approve, override or lock each one.",
    h:["Each night shows the recommended rate and the reasons for it.","Click Approve to accept, or type your own rate to override.","Lock a date (e.g. a package) so it's never changed."], see:"A grid of nights and rates.", tip:["Nothing goes to Guestline — you always approve first."] },
  revCompset: { t:"Competitors", img:"quoteflow",
    w:"Your rate vs the competitor set for the next 14 nights, with the Booking Genius rate applied.",
    h:["The bar at the top shows: live or demo, the source (Google Hotels) and when it was last checked.","Each cell shows the competitor's displayed rate with the Genius estimate (−10%) beneath it.","The 'Comp ref' row is the weighted average the engine prices against."],
    see:"A table of hotels down the side, nights across the top, with a status bar above it.",
    tip:["Primary rivals (Novotel, Ramada, Windmill) count more — set weights in HosREV Settings."] },
  revEvents: { t:"Events & Demand", w:"Local events and your diary that drive demand, scored 1–5.",
    h:["Review scored events.","Add one manually with the + button."], see:"", tip:["Events carry a low weight — they're mostly already in competitor rates."] },
  revForecast: { t:"Forecast & Margin", w:"Forecast occupancy and net room profit per night.",
    h:["Review forecast occupancy.","See the profit behind each rate."], see:"", tip:["Better to sell 5 rooms at £100 than 2 at £180."] },
  revImport: { t:"Guestline Import", w:"Bring in on-the-books occupancy from Guestline via a daily CSV.",
    h:["Upload the daily Guestline export.","It feeds the forecast and recommendations.","Repeat daily."], see:"", tip:["A live link is a later upgrade."] },
  revSettings: { t:"HosREV Settings", w:"The engine's rules — room types, floors/ceilings, costs, the competitor set and weights.",
    h:["Set floors and ceilings per room type.","Edit the competitor set and each hotel's weight (1–5).","Set cost per room, commission and the input weights."], see:"", tip:["Sensitive — changes move every recommendation."] },

  /* ---------- HosFIX ---------- */
  fixDash: { t:"Maintenance Dashboard", w:"A live overview of maintenance jobs.",
    h:["See counts: open, urgent, awaiting approval, done this week.","Click a figure to jump to that list.","Approve costs where flagged."], see:"", tip:[] },
  fixAllJobs: { t:"All Jobs", w:"The full list of maintenance jobs.",
    h:["Filter by status or priority.","Open a job to update or complete it.","Raise a new one with the + button."], see:"", tip:[] },
  fixProjects: { t:"Projects", w:"Larger ongoing property projects.", h:["Track progress and linked jobs."], see:"", tip:[] },
  fixInventory: { t:"Stock & Inventory", w:"Parts and materials for maintenance.", h:["Check stock.","Record parts used; reorder when low."], see:"", tip:[] },
  fixTeam: { t:"Team & Profiles", w:"The maintenance team and assignments.", h:["See who's on the team.","Assign jobs."], see:"", tip:[] },
  mne: { t:"Assets & M&E", w:"Equipment and asset tracking.", h:["Browse the asset register.","Record servicing."], see:"", tip:[] },
  suppliers: { t:"Suppliers", w:"Your supplier database.", h:["Search suppliers.","Open one for contact details."], see:"", tip:[] },

  /* ---------- HosCOM ---------- */
  compDash: { t:"Compliance Dashboard", w:"An overview of compliance with a score.", h:["Check the score and red flags.","Drill into tasks and actions."], see:"", tip:[] },
  compTasks: { t:"Scheduled Tasks", w:"Recurring compliance checks and due dates.", h:["See what's due or overdue.","Mark checks complete."], see:"", tip:[] },
  compActions: { t:"Actions", w:"Outstanding compliance actions.", h:["Work through open actions.","Record evidence and close them."], see:"", tip:[] },
  compReport: { t:"Compliance Report", w:"A printable compliance report.", h:["Generate for a period.","Print or save for audits."], see:"", tip:[] },
  tasks: { t:"Tasks", w:"A simple to-do list.", h:["Add tasks and tick them off."], see:"", tip:[] },

  /* ---------- HosPEOPLE ---------- */
  rotaDash: { t:"Shift Dashboard", w:"An overview of staffing and shifts.", h:["See the week at a glance.","Spot gaps."], see:"", tip:[] },
  rotaWeek: { t:"Weekly Rota", w:"Build and view the weekly rota.", h:["Add shifts per person/day.","Publish for the team."], see:"", tip:[] },
  rotaPayroll: { t:"Payroll & Clock-in", w:"Clock-in records and payroll — restricted.", h:["Review clock records.","Reconcile hours."], see:"", tip:["Restricted to Ajay, Raj, Alia, Veronica. Needs the payroll password."] },
  rotaForecast: { t:"Occupancy Forecast", w:"Forecast occupancy to plan staffing.", h:["Review by day.","Staff up/down to match."], see:"", tip:[] },
  rotaMonthly: { t:"Monthly Plan", w:"A month view of shifts.", h:["Plan ahead across the month."], see:"", tip:[] },
  rotaSettings: { t:"Shift Settings", w:"Rota settings and rules.", h:["Set shift patterns and defaults."], see:"", tip:[] },
  staffDash: { t:"Staff Overview", w:"An overview of the team — restricted HR area.", h:["See staff; open a profile."], see:"", tip:["HR-authorised staff only."] },
  staffProfiles: { t:"Staff Profiles", w:"Individual staff records — restricted.", h:["Open a person to view/update.","Manage their documents."], see:"", tip:["HR-authorised staff only."] },
  staffLeave: { t:"Leave Requests", w:"Holiday and leave requests.", h:["Submit or view requests.","Track entitlement."], see:"", tip:[] },
  staffLeaveAdmin: { t:"Approve Leave", w:"Approve or decline leave — restricted.", h:["Review pending requests.","Approve or decline, checking cover."], see:"", tip:["Authorised approvers only."] },
  staffDocs: { t:"Staff Documents", w:"HR documents — restricted.", h:["Upload and manage staff documents."], see:"", tip:["HR-authorised staff only."] },

  /* ---------- HosHUB ---------- */
  hubDocs: { t:"All Documents", w:"The central document hub — everything searchable.", h:["Search or browse by folder.","Open or download.","Drag and drop to upload."], see:"", tip:[] },
  hubContracts: { t:"Contracts & Agreements", w:"Signed contracts, filed.", h:["Find by name or date.","Open or download."], see:"", tip:[] },
  hubSuppliers: { t:"Supplier Agreements", w:"Agreements with suppliers.", h:["Browse agreements.","Check renewal dates."], see:"", tip:[] },
  hubFinance: { t:"Finance Documents", w:"Finance paperwork — restricted.", h:["Find and open finance documents."], see:"", tip:["Finance-authorised staff only."] },
  hubHR: { t:"HR Documents", w:"HR paperwork — restricted.", h:["Find and open HR documents."], see:"", tip:["HR-authorised staff only."] },

  /* ---------- HosMARKETING ---------- */
  wifiDb: { t:"Guest Database", w:"Every individual who signs in to the free guest Wi-Fi — residents and visitors — with a dashboard and your newsletter list.",
    h:["Use the cards and charts for a quick read: sign-ups per day, residents vs visitors, where guests come from.","Filter by date, resident/visitor, leisure/business, newsletter consent or town.","Export CSV or Excel and import into Mailchimp (newsletter opt-ins only)."],
    see:"Dashboard cards and charts above a searchable guest table.", tip:["Only email guests who ticked the newsletter box — the export respects the filter."] },
  newsletters: { t:"Newsletter Templates", w:"Branded email templates you edit on screen, then copy the HTML into Mailchimp (or any email tool).",
    h:["Pick a template, change the words and picture, watch the preview.","Save it for the team, then Copy HTML and paste into a Mailchimp code block.","*|FNAME|* becomes the guest's first name in Mailchimp."],
    see:"Editor on the left, live email preview on the right.", tip:["Keep it short: one picture, one message, one button."] },
  marketing: { t:"Marketing Library", w:"Marketing assets — logos, posters, rate cards, photos, videos, templates.", h:["Browse by section.","Open or download."], see:"", tip:[] },
  social: { t:"Social Studio", w:"Social media assets and captions.", h:["Browse ready posts and captions.","Use them in your scheduling."], see:"", tip:[] },
  brochure: { t:"Brochure Builder", w:"Build printable brochures.", h:["Pick a brochure type and edit it.","Preview, then produce the artwork."], see:"", tip:[] },
  menu: { t:"Menu Builder", w:"Build a menu and produce printable artwork.",
    h:["Pick a template from the dropdown to start (Wedding, Festive, Buffet…).","Edit the courses and dishes; set a title and price.","Watch the live preview on the right.","Click 'Printable artwork' to produce it."],
    see:"An editor on the left, a live menu preview on the right.", tip:["Templates give you a head start — just change the words."] },

  /* ---------- HosBRAND ---------- */
  brandLogos: { t:"Logos & Brand Assets", w:"Official logos in every format, plus brand guidelines.",
    h:["Pick the logo you need (blue, white, gold, vector).","Click View or Download.","Open the brand guidelines PDF for the rules."], see:"Cards for each logo with View/Download.", tip:["Use approved versions only."] },
  brandCollateral: { t:"Collateral & Brochures", w:"Printed collateral ready to use.", h:["Browse and download."], see:"", tip:[] },
  brandPhotography: { t:"Photography Library", w:"Approved hotel photography.",
    h:["Browse by category (Bedrooms, Event Spaces, Bar, Clarendon).","Click a photo to view full size and download."], see:"A grid of photos by category.", tip:["Use these for proposals, social and print."] },
  brandDocs: { t:"All Downloads", w:"Every brand download in one place.", h:["Browse or search; download."], see:"", tip:[] },

  /* ---------- HosHOUSE ---------- */
  hhHub: { t:"Housekeeping Dashboard", img:"hkflow",
    w:"Live housekeeping — rooms cleaned, times, staff efficiency, and the links to the three housekeeping apps.",
    h:["See today's progress: rooms done, in progress, not done, over 30 min and average time.","Use the date picker to look at any day.","Open the reception form, housekeeper app or full manager dashboard from the chips.","Add, remove or recode staff in the full dashboard (Staff tab)."],
    see:"KPI tiles, a progress donut, a per-person bar chart and a staff-efficiency table.",
    tip:["The full manager dashboard uses passcode 4040; reveal staff codes with 1006."] },

  /* ---------- Admin / Insights ---------- */
  admin: { t:"Admin", w:"Portal admin settings.", h:["Adjust settings as needed."], see:"", tip:[] },
  insight: { t:"Insights", w:"Cross-module insights.", h:["Review the headline insights."], see:"", tip:[] }
};

/* ---- Standalone tools (shown in the Tools section) ---- */
const HELP_TOOLS = {
  financialOverview: { t:"Financial Overview (P&L)", w:"The management-accounts P&L dashboard — Ajay, Raj and Alia only.",
    h:["Open it from the Home quick links (one tap for the three of you).","Review the monthly management accounts."], see:"", tip:["Restricted — only Ajay, Raj and Alia."] },
  createInvoice: { t:"Create Invoice", w:"Create and download a customer invoice.",
    h:["Open it from the Home quick links.","Fill in the customer and the lines.","Download the invoice."], see:"", tip:[] },
  clockin: { t:"Staff Clock-in", w:"The public clock-in/out page — scan the wall QR, pick your name, enter your PIN.",
    h:["Scan the QR on the wall (or open clock.html).","Pick your name and type your 4-digit PIN.","Tap IN to start or OUT to finish."], see:"A name picker and a PIN pad.", tip:["If the PIN is wrong, try again — nothing is logged until it's right."] }
};

try{ window.HELP_CONTENT=HELP_CONTENT; window.HELP_TOOLS=HELP_TOOLS; window.HELP_GS=HELP_GS; window.HELP_SVG=HELP_SVG; }catch(e){}
