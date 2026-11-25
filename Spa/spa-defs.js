/* ============================================================
   HosSPA Compliance — shared definitions
   Used by /spa/ (staff QR check pages) and the Compliance tab
   in hosspa.html (manager records).
   Source: Brandon Hall Health, Safety & Operations Manual v1.1
   Data: Firestore collection "hosfire_spa" (kiosk sign-in, as
   HosKitchen). Records: kind "record". Registers (training,
   COSHH, actions, limits): kind "register".
   ============================================================ */
var HS_COL = "hosfire_spa";
var HS_CODE = "777";            /* staff code for the QR pages — change here */
var HS_MGR_CODE = "2222";       /* manager code for sign-off and registers */
var HS_BASE = "https://brandon.hospro.co.uk/spa/";
var HS_VERSION = "1.1";

/* ── check points (one QR poster each) — lean set replacing the Granite handbook ── */
var HS_POINTS = [
  { id: "desk",     name: "Health Club Reception", icon: "🛎", forms: ["open", "walk", "close", "weekly", "monthly", "report"] },
  { id: "pool",     name: "Poolside",              icon: "🏊", forms: ["pooltest", "walk", "clean", "report"], area: "Poolside" },
  { id: "plant",    name: "Plant Room",            icon: "⚙️", forms: ["pooltest", "weekly", "report"], restricted: true },
  { id: "thermal",  name: "Sauna & Steam Room",    icon: "🔥", forms: ["clean", "report"], areas: ["Sauna", "Steam room"] },
  { id: "changing", name: "Changing Rooms",        icon: "🚿", forms: ["clean", "report"], areas: ["Male changing room", "Female changing room", "Accessible / family changing"] },
  { id: "gym",      name: "Gym",                   icon: "🏋️", forms: ["clean", "report"], area: "Gym" },
  { id: "treat",    name: "Treatment Rooms",       icon: "💆", forms: ["clean", "report"], area: "Treatment rooms" }
];

/* cleaning areas → tasks (weekly target from the site cleaning schedule) */
var HS_AREAS = {
  "Poolside": [["Poolside floors and drains clean, no standing water", "daily"], ["Full poolside clean — loungers out, squeegee entrances and poolside shower, pool edge, drains", "3× weekly"], ["Hoover window cills and wipe ledgers", "1× weekly"], ["Rails, steps and handrails cleaned and polished", "daily"], ["No glass or hazards; blue shoe covers at entrance", "daily"]],
  "Sauna": [["Seating and contact points wiped", "daily"], ["Deep clean — all seating, contact points and floor", "3× weekly"], ["Nothing on or near the heater; guard secure", "daily"], ["Timer, controls and emergency call working", "daily"]],
  "Steam room": [["Surfaces and floor rinsed", "daily"], ["Deep clean — scrub seating and corners, clean floor (washroom cleaner)", "3× weekly"], ["Drain clear; no scalding outlets", "daily"], ["Door, ventilation and emergency call working", "daily"]],
  "Male changing room": [["Floors hoovered and mopped, no standing water", "daily"], ["Showers — walls, heads and floor", "4× weekly"], ["Toilets, urinals and sinks", "4× weekly"], ["Drains — grilles lifted, hair removed", "2× weekly"], ["Lockers emptied, cleaned (valuables to lost property)", "3× weekly"], ["Bins emptied; soap, paper and towels stocked", "daily"], ["Mirrors, glass and vents", "daily"]],
  "Female changing room": [["Floors hoovered and mopped, no standing water", "daily"], ["Showers — walls, heads and floor", "4× weekly"], ["Toilets and sinks; sanitary bins", "4× weekly"], ["Drains — grilles lifted, hair removed", "2× weekly"], ["Lockers emptied, cleaned (valuables to lost property)", "3× weekly"], ["Bins emptied; soap, paper and towels stocked", "daily"], ["Mirrors, glass and vents", "daily"]],
  "Accessible / family changing": [["Floor, shower, toilet and basin cleaned", "4× weekly"], ["Baby-change and grab rails cleaned", "daily"], ["Pull cord hanging free and working", "daily"], ["Consumables stocked", "daily"]],
  "Gym": [["All equipment wiped down — cardio, resistance, free weights", "5× weekly"], ["Floors hoovered — under machines, racks, studio and track", "3× weekly"], ["Stairwell glass panels cleaned", "3× weekly"], ["Gym reset — weights racked, walkways clear", "daily"], ["Wipes and sanitiser stocked; bins emptied", "daily"]],
  "Treatment rooms": [["Couches and surfaces sanitised", "daily"], ["Clean linen; used linen removed", "daily"], ["Heated equipment safe and at the right setting", "daily"], ["Products labelled, closed and in date; waste disposed of", "daily"]]
};
var HS_AREA_LIST = Object.keys(HS_AREAS);

/* ── competencies (training matrix columns) ── */
var HS_COMPS = [
  ["induct", "Induction & site tour"], ["eap", "Emergency action plan"], ["rescue", "Pool supervision & rescue"],
  ["cpr", "CPR & AED"], ["firstaid", "First aid"], ["water", "Water testing"], ["plant", "Pool plant operation"],
  ["coshh", "COSHH & chemicals"], ["fire", "Fire & evacuation"], ["safeg", "Safeguarding & missing person"],
  ["incident", "Incident reporting"], ["manual", "Manual handling"], ["clean", "Cleaning & infection control"],
  ["openclose", "Opening & closing"]
];

/* ── the eight staff forms ── */
var HS_FORMS = [
  { id: "open", ref: "BHS-01", name: "Opening checks", icon: "🌅", daily: true, freq: "Every day, before anyone is let in", sec: "4",
    items: ["Doors unlocked, lights on — nobody in the building overnight, no lockers left in use", "Emergency exits and escape routes clear", "Fire extinguishers in place",
      "First-aid kit stocked; AED status light shows ready", "Rescue equipment in place (reach pole, throw bag, spinal board)", "Panic and emergency alarms tested — poolside, sauna, steam, toilets, pull cords",
      "Pool vacuum removed; poolside clear, no slip hazards, no glass", "Pool water clear — sump visible — and today's first pool test done", "Sauna and steam room switched on and safe (guards, timers, doors)",
      "Changing rooms checked, floors hoovered, consumables topped up", "Gym reset; powered equipment on and visually safe", "Blue shoe covers at poolside entrance; PPE available",
      "Plant room and chemical store locked", "Competent pool supervision / emergency cover on duty", "Yesterday's defects and restrictions briefed"],
    fields: [{ k: "decision", t: "select", l: "Opening decision", o: ["Open", "Restricted opening", "Remain closed"], req: true },
      { k: "restrict", t: "text", l: "If restricted or closed — what and why" }, { k: "authBy", t: "text", l: "Authorised by (Duty Manager)", req: true }] },
  { id: "pooltest", ref: "BHS-04", name: "Pool test & plant check", icon: "🧪", daily: true, auth: "water", freq: "Before opening and through the day at the frequency in the water-treatment plan", sec: "6",
    water: true, items: ["Test kit clean, in date and used to its instructions", "Chlorine and acid tanks topped up; balance tank managed", "Dosing panel — no alarms, calibrated", "Chlorine lines and pH system checked", "No contamination, odour or cloudiness"] },
  { id: "walk", ref: "BHS-03", name: "Headcount & walkround", icon: "👣", quick: true, freq: "Every 30 minutes while open, after any incident and at closing", sec: "5",
    items: ["Poolside safe — behaviour, no hazards, numbers within limit", "Sauna and steam safe — nothing near heaters, users well", "Changing rooms and toilets safe and clean", "Emergency equipment in place"],
    fields: [{ k: "users", t: "number", l: "People in the pool", req: true }, { k: "saunaT", t: "number", l: "Sauna °C" }, { k: "steamT", t: "number", l: "Steam °C" },
      { k: "wc", t: "select", l: "Water clear — sump visible?", o: ["Yes", "No — act now"], req: true }, { k: "how", t: "select", l: "Check type", o: ["In person", "CCTV (only at :15 / :45 if the risk assessment allows)"] }],
    note: "Quick check — no signature needed. A headcount never replaces active supervision." },
  { id: "clean", ref: "BHS-05", name: "Cleaning log", icon: "🧽", daily: true, freq: "Each area at least daily; deep-clean tasks at the weekly frequency shown", sec: "10", clean: true,
    fields: [{ k: "product", t: "text", l: "Product / dilution used", req: true }] },
  { id: "close", ref: "BHS-02", name: "Closing checks", icon: "🌙", daily: true, freq: "Every day at closing", sec: "5",
    items: ["Cash-up done at last entry", "Members told to leave the pool; everyone out — pool, sauna, steam, gym, changing rooms, toilets", "Sauna and steam room shut down and cleaned",
      "Pool vacuum placed; poolside floors and showers cleaned", "Changing-room showers cleaned, floors mopped and squeegeed, bins emptied, no lockers in use",
      "Lights, music, AC, TVs and treadmills off", "Escape routes clear; first-aid kit stocked; extinguishers in place", "Plant room and chemical store locked; alarm set"],
    fields: [{ k: "headcount", t: "number", l: "People left in the building at final check", req: true }, { k: "handover", t: "text", l: "Handover for the opening team" }] },
  { id: "weekly", ref: "BHS-06", name: "Weekly checks", icon: "🗓", weekly: true, freq: "Once a week", sec: "8",
    items: ["Rescue equipment — throw bag, reach pole: present and serviceable", "All alarms tested — poolside, sauna and steam, toilets, accessible pull cords", "Pool swept / vacuumed",
      "Main filter backwashed (2× weekly) and recorded", "Strainer baskets, probes and filters cleaned", "Stainless steel wiped",
      "Chemical store: containers closed and labelled, calcium hypochlorite kept apart from acid, spill kit and eyewash in date, SDS file present",
      "Gym equipment maintenance — fixings, cables, belts, pins, grips, safety hooks and clips (cardio, resistance, free weights)", "Vending and retail stock rotated; cleaning cupboard tidy"],
    fields: [{ k: "incoming", t: "text", l: "Incoming water test (pH, TDS, temp, alkalinity) — authorised person" }, { k: "balance", t: "text", l: "Water balance index result" }],
    note: "Any alarm or equipment that fails: report it with BHS-08 straight away." },
  { id: "monthly", ref: "BHS-07", name: "Monthly checks", icon: "📅", monthly: true, freq: "Once a month", sec: "13",
    items: ["PPE — apron, goggles, gloves, wellingtons, respirator: available, clean, undamaged", "Legionella — shower heads descaled (male, female, accessible, plant room)",
      "Legionella — tap temperatures checked and recorded", "First-aid stock counted and reordered", "Emergency lighting monthly flick test (all areas)",
      "Pool scumlines and drains scrubbed; poolside floors scrubbed, algae removed"],
    fields: [{ k: "drill", t: "select", l: "Evacuation / fire drill this month?", o: ["Yes", "No — due (one every 6 months)", "Not due"] }, { k: "temps", t: "text", l: "Tap temperatures (where / °C)" }] },
  { id: "report", ref: "BHS-08", name: "Report a problem", icon: "⚠️", freq: "Straight away — defects, incidents and near misses", sec: "9", status: true,
    fields: [{ k: "type", t: "select", l: "What kind of problem?", o: ["Defect / broken equipment", "Near miss", "Minor injury", "Serious injury / medical emergency", "Contamination (pool)", "Chemical spill / exposure", "Safeguarding concern", "Missing person", "Unauthorised access", "Plant / power failure", "Other"], req: true },
      { k: "location", t: "text", l: "Where", req: true }, { k: "what", t: "area", l: "What happened / what is wrong", req: true }, { k: "controlled", t: "text", l: "What you did to make it safe", req: true },
      { k: "removed", t: "select", l: "Equipment or area taken out of use?", o: ["Yes — labelled", "Not needed", "No — needs doing"] }, { k: "people", t: "text", l: "Person(s) involved — initials only" },
      { k: "firstaid", t: "text", l: "First aid / emergency services" }, { k: "notified", t: "text", l: "Duty Manager told (name)", req: true }],
    note: "Serious incidents: call 999 first. Do not record health details or full names of customers here." }
];

/* water parameters (no default limits — limits must be approved by the competent person) */
var HS_WATER = [
  { k: "fc", l: "Free chlorine (mg/l)", lim: ["fcMin", "fcMax"] },
  { k: "cc", l: "Combined chlorine (mg/l)", lim: [null, "ccMax"] },
  { k: "ph", l: "pH", lim: ["phMin", "phMax"] },
  { k: "temp", l: "Water temperature (°C)", lim: ["tMin", "tMax"] }
];
var HS_POOLS = { pool: "Swimming pool", spapool: "Spa pool (only if one exists — to confirm)" };

/* ── starting registers (from the GM's instruction of 25 Nov 2026) ── */
var HS_SEED_COSHH = [
  { product: "HTH Calcium Hypochlorite Easiflo Tablets", use: "Pool disinfection (plant room)", supplier: "Complete Pool Controls Ltd (CPC)", size: "", sdsRev: "2021-04-27", status: "Assessment not started", notes: "SDS revision 6 (27 Apr 2021) — check it is the latest. Danger: oxidiser (may intensify fire), harmful if swallowed, causes severe skin burns and eye damage, very toxic to aquatic life. Do not use with other products — may release chlorine gas. Keep away from acids and combustibles; never mix." },
  { product: "Pool pH correction acid (product to confirm)", use: "Pool pH dosing (plant room)", supplier: "", size: "", sdsRev: "", status: "Assessment not started", notes: "Acid tank referred to on the walkround sheet but no SDS supplied. Must be segregated from calcium hypochlorite." },
  { product: "CoreClean 2H All Purpose Cleaner", use: "General cleaning", supplier: "Mirius (Coventry Chemicals Ltd)", size: "5 litres", sdsRev: "2025-08-26", status: "Assessment not started", notes: "Product no. 800-282-0011. Eye Irrit. 2 (H319)." },
  { product: "GP Lemon Gel", use: "Multi-purpose floor cleaning", supplier: "Evans Vanodine International plc", size: "", sdsRev: "2026-04-01", status: "Assessment not started", notes: "Product code A198 EV, version 6. Eye Irrit. 2; Aquatic Chronic 3." },
  { product: "Washroom cleaner (\"Sani der Q\" — name to confirm)", use: "Steam room and showers (per cleaning schedule)", supplier: "", size: "", sdsRev: "", status: "Assessment not started", notes: "Named on the weekly cleaning schedule; no SDS supplied." },
  { product: "Aqueous Shampoo / Liquid Soap SH701", use: "Changing-room dispensers", supplier: "Sabel Cosmetics", size: "", sdsRev: "2014-02-17", status: "Assessment not started", notes: "SDS issued 17 Feb 2014, review date 17 Feb 2016 — out of date; obtain current SDS. Irritating to eyes; harmful if swallowed." },
  { product: "Coconut Hair & Bodywash", use: "Changing-room dispensers", supplier: "Bartons Body Care", size: "", sdsRev: "", status: "Assessment not started", notes: "Product safety data sheet undated. Potentially irritating to eyes." }
];
var HS_SEED_ACTIONS = [
  ["Confirm approved operating limits, test frequency and method for pool and spa pool", "Competent pool-plant / water-treatment person", "Pool and spa remain closed unless a competent person confirms limits for the day"],
  ["Obtain current water-treatment plan, PWTAG-aligned operating procedure and microbiological records", "Health Club Manager", "Daily tests recorded; results reviewed by Duty Manager"],
  ["Obtain Legionella risk assessment and control records (HSG282 for spa pool)", "Health Club Manager", "Spa pool not opened without competent confirmation"],
  ["Complete site-specific COSHH assessments for every product held, signed by a competent person", "COSHH assessor", "Only trained staff use chemicals; current SDS available"],
  ["Collect latest supplier SDS for each product (revision date, container size, supplier)", "Health Club Manager", "Existing SDS kept in COSHH file until replaced"],
  ["Confirm eyewash, spill kit and emergency contacts at plant room and chemical store", "Maintenance (Glenn)", "Portable eyewash at store entrance"],
  ["Joint site walk-round — Glenn and Health Club Manager (Appendix G)", "Glenn / Health Club Manager", "Daily opening checklist in force"],
  ["Complete site-specific contact page (numbers, contractors, A&E, isolation points)", "General Manager", "Reception holds emergency numbers"],
  ["Confirm duty-holder split between Brandon Hall and Granite Leisure (lease)", "General Manager", "Both parties' managers named on contact page"],
  ["Build staff training matrix with evidence and expiry for all spa staff", "Health Club Manager", "Only listed, authorised staff test water or handle chemicals"],
  ["Confirm member health-form wording, reviewer, storage, access, retention and destruction", "General Manager", "Completed forms kept locked at reception, not on the shared drive"],
  ["Display HSE information notice and brief staff", "Health Club Manager", "—"],
  ["Confirm whether Brandon Hall has a spa pool (Granite handbook says none) and remove spa-pool checks if not", "General Manager / Health Club Manager", "Spa-pool forms not used until confirmed"],
  ["Confirm sauna and plant-room alarms repaired and tested (recorded not working, week of 28 Sep 2026)", "Maintenance (Glenn)", "Sauna checked in person at every walkround"],
  ["Review pool test records w/c 28 Sep 2026 — free chlorine readings in the red band with no recorded closure", "Competent pool-plant person / Health Club Manager", "Out-of-range procedure briefed to all staff"],
  ["Replace out-of-date SDSs (shampoo 2014; calcium hypochlorite 2021) and obtain missing SDSs (pool acid, washroom cleaner)", "Health Club Manager", "Existing SDS kept until replaced"],
  ["Complete blank monthly tasks (PPE, Legionella shower descale and temperatures, first-aid stock, emergency lighting, drill)", "Health Club Manager", "Monthly checks now on HosSPA (BHS-07)"],
  ["Store completed guest / day-pass sign-in sheets securely (personal data) and agree retention", "General Manager", "Kept at reception out of public view"],
  ["Set and record the maximum bather load for the pool", "Health Club Manager / GM", "Duty Manager limits numbers"]
];

/* ── customer check-in (public QR at the Health Club entrance) — DRAFT wording for GM approval ── */
var HS_CHECKIN_TYPES = ["Hotel guest", "Day pass / spa day", "Member", "Member's guest", "Other visitor"];
var HS_HEALTH = {
  title: "Personal health statement",
  intro: "Your health and safety matter to us. Please read this before using the pool, spa, sauna, steam room or gym.",
  ours: ["We keep our facilities and equipment in a safe condition and check them throughout the day.", "If you tell us about a disability or a condition that affects how you use the facilities, we will consider what reasonable adjustments we can make.", "A member of staff trained in first aid is always on duty."],
  yours: ["Only exercise within your own ability. If you have a medical condition, are pregnant or are unsure whether exercise is safe for you, take advice from your doctor first.", "Follow the rules, signs and staff instructions, and ask a member of staff if you are unsure how to use any equipment.", "Tell a member of staff straight away if you feel unwell."],
  rules: ["Children under 16 must be accompanied and supervised at all times by an adult aged 18 or over — at least one adult for every two children.", "Children must never be left alone, including in the sauna or steam room.", "Under-16s may not use the sauna, steam room or gym.", "No entry if you are under the influence of alcohol or drugs.", "Shower before using the pool, sauna or steam room.", "Swimwear must be worn in the pool, sauna and steam room.", "No glass in wet areas; no running or diving."]
};
