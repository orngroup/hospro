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

/* ── check points (one QR poster each) ── */
var HS_POINTS = [
  { id: "desk",    name: "Health Club Reception",  icon: "🛎", forms: ["open", "close", "walk", "desk"] },
  { id: "pool",    name: "Swimming Pool",          icon: "🏊", forms: ["pooltest", "poolside", "walk"] },
  { id: "spapool", name: "Spa Pool",               icon: "♨️", forms: ["spatest", "walk"] },
  { id: "sauna",   name: "Sauna",                  icon: "🔥", forms: ["sauna"] },
  { id: "steam",   name: "Steam Room",             icon: "💨", forms: ["steam"] },
  { id: "chg-m",   name: "Male Changing Room",     icon: "🚿", forms: ["changing"], area: "Male changing room, showers & toilets" },
  { id: "chg-f",   name: "Female Changing Room",   icon: "🚿", forms: ["changing"], area: "Female changing room, showers & toilets" },
  { id: "chg-a",   name: "Accessible & Family Changing", icon: "♿", forms: ["changing"], area: "Accessible / family changing & toilet" },
  { id: "gym",     name: "Gym",                    icon: "🏋️", forms: ["gym"] },
  { id: "treat",   name: "Treatment Rooms",        icon: "💆", forms: ["treat"] },
  { id: "plant",   name: "Plant Room",             icon: "⚙️", forms: ["plant", "pooltest", "spatest"], restricted: true },
  { id: "chem",    name: "Chemical Store",         icon: "🧪", forms: ["chem"], restricted: true },
  { id: "aed",     name: "First Aid & AED Station", icon: "❤️", forms: ["aed"] }
];

/* ── competencies (training matrix columns) ── */
var HS_COMPS = [
  ["induct", "Induction & site tour"], ["eap", "Emergency action plan"], ["rescue", "Pool supervision & rescue"],
  ["cpr", "CPR & AED"], ["firstaid", "First aid"], ["water", "Water testing"], ["plant", "Pool plant operation"],
  ["coshh", "COSHH & chemicals"], ["fire", "Fire & evacuation"], ["safeg", "Safeguarding & missing person"],
  ["incident", "Incident reporting"], ["manual", "Manual handling"], ["clean", "Cleaning & infection control"],
  ["openclose", "Opening & closing"]
];

/* ── forms ── item: [question] → Pass / Fail / N/A ; fields: typed inputs */
var HS_FORMS = [
  { id: "open", ref: "BHS-01", name: "Opening checklist", icon: "🌅", daily: true, freq: "Before members or guests are let in, every day", sec: "4",
    items: ["Access doors, alarms and security controls working", "No unauthorised person or overnight user present", "Emergency exits clear and unlocked as required",
      "Lighting, ventilation and communication systems working", "First-aid kit present and stocked", "AED present, accessible and status indicator checked",
      "Rescue equipment and emergency phone/radio available", "Poolside clear, clean and free from slip hazards", "Sump/grille covers and visible pool fittings secure",
      "Pool water visually clear and free of contamination", "Pool water tests completed and within approved site limits", "Spa-pool checks completed and within approved site limits",
      "Sauna and steam room safe to open", "Changing rooms, showers and accessible facilities checked", "Gym equipment visually checked and safe to use",
      "Required competent staff and emergency cover present", "Chemical store and plant room secure", "Incidents, defects or restrictions carried forward and briefed"],
    fields: [{ k: "decision", t: "select", l: "Opening decision", o: ["Open", "Restricted opening", "Remain closed"], req: true },
      { k: "restrict", t: "text", l: "If restricted or closed — what and why" }, { k: "authBy", t: "text", l: "Opening authorised by (Duty Manager)", req: true }] },
  { id: "close", ref: "BHS-02", name: "Closing checklist", icon: "🌙", daily: true, freq: "At closing, every day", sec: "5",
    items: ["All users out — pool, spa, sauna, steam, gym, changing rooms and toilets checked", "Sauna and steam room switched off or set as the manufacturer and site procedure require",
      "Spa pool covered / controls set for closure", "Poolside cleared, equipment stowed, no glass or hazards", "Lockers checked, lost property logged",
      "Chemical store and plant room locked", "Doors and windows secured, intruder alarm set", "Incidents, defects and restrictions recorded and handed over"],
    fields: [{ k: "headcount", t: "number", l: "Users remaining in the building at final check", req: true }, { k: "handover", t: "text", l: "Handover notes for the opening team" }] },
  { id: "walk", ref: "BHS-03", name: "Walkaround & headcount", icon: "👣", freq: "At opening, at the intervals in the risk assessment, after any incident and at closing", sec: "5",
    items: ["Access control working — no concerns", "Children or vulnerable users supervised as the rules require", "No slips, trips, spills or contamination",
      "Water clear, no visible debris", "Poolside behaviour within the rules", "Sauna and steam room in safe condition", "Changing rooms in safe, clean condition",
      "Emergency equipment in place"],
    fields: [{ k: "users", t: "number", l: "Pool users (headcount)" }, { k: "staff", t: "number", l: "Staff on duty" }, { k: "escalated", t: "text", l: "Escalated to (if anything found)" }],
    note: "A headcount never replaces active supervision or the emergency evacuation arrangements." },
  { id: "pooltest", ref: "BHS-04", name: "Pool water test", icon: "🧪", daily: true, auth: "water", pool: "pool", freq: "Before opening and at the frequency set by the water-treatment plan", sec: "6",
    water: true, items: ["Test kit clean, in date and used to its instructions", "Main drain visible from poolside", "No contamination, unusual odour or cloudiness"] },
  { id: "spatest", ref: "BHS-05", name: "Spa-pool test & pre-opening checks", icon: "♨️", daily: true, auth: "water", pool: "spapool", freq: "Before opening and at the frequency set by the water-treatment plan (HSG282)", sec: "7",
    water: true, items: ["Test kit clean, in date and used to its instructions", "Jets, circulation, filtration and dosing operating normally", "Covers, steps, handrails and non-slip surfaces safe",
      "User rules displayed, including maximum session time", "Emergency stop and communication available", "No contamination, unusual odour or cloudiness"] },
  { id: "sauna", ref: "BHS-06", name: "Sauna check & clean", icon: "🔥", daily: true, freq: "Before opening and at the cleaning frequency in the cleaning schedule", sec: "7",
    items: ["Heater guard secure, nothing on or near the heater", "Timer and temperature controls working", "Seating and timber undamaged, no splinters or loose fittings",
      "Door opens freely, glass undamaged", "Emergency call / alarm working", "User rules and warning signage displayed", "Surfaces cleaned with the approved product and method"],
    fields: [{ k: "temp", t: "number", l: "Sauna temperature (°C)" }, { k: "product", t: "text", l: "Cleaning product used" }] },
  { id: "steam", ref: "BHS-07", name: "Steam room check & clean", icon: "💨", daily: true, freq: "Before opening and at the cleaning frequency in the cleaning schedule", sec: "7",
    items: ["Steam generator operating normally", "Door seals, opens freely, glass undamaged", "Ventilation working", "No exposed hot surfaces or scalding hazards at outlets",
      "Floor drain clear, no standing water", "Emergency call / alarm working", "User rules and warning signage displayed", "Surfaces cleaned with the approved product and method"],
    fields: [{ k: "temp", t: "number", l: "Steam room temperature (°C)" }, { k: "product", t: "text", l: "Cleaning product used" }] },
  { id: "changing", ref: "BHS-08", name: "Changing room, showers & toilets", icon: "🚿", daily: true, freq: "At least daily and at the intervals in the cleaning schedule", sec: "10",
    items: ["Floors clean, no standing water", "Showers clean, drains clear, water temperature safe", "Toilets and basins clean", "Touch points cleaned — doors, lockers, benches, hand rails",
      "Bins emptied, waste removed", "Soap, paper and sanitiser stocked", "Hair dryers and electrics safe, no damage", "Baby-change / accessible facilities clean and working (if in this area)"],
    fields: [{ k: "product", t: "text", l: "Product / dilution used", req: true }] },
  { id: "poolside", ref: "BHS-09", name: "Poolside check & clean", icon: "🏊", daily: true, freq: "At least daily and at the intervals in the cleaning schedule", sec: "10",
    items: ["Poolside floors and drains clean, no standing water", "Rails, steps and ladders secure and clean", "No glass or prohibited items", "Rescue equipment in place (pole, throw-ring, spinal board)",
      "Depth markings and safety signage visible", "Poolside furniture clean and undamaged", "Outdoor footwear / pram rules being applied"],
    fields: [{ k: "product", t: "text", l: "Product / dilution used", req: true }] },
  { id: "gym", ref: "BHS-10", name: "Gym equipment check & clean", icon: "🏋️", daily: true, freq: "Visual check before opening; cleaning at the intervals in the cleaning schedule", sec: "11",
    items: ["Cables, guards, belts, frames and plugs undamaged", "Treadmill emergency stops / safety keys working", "Free weights and plates stored safely", "Escape routes and machine clearances clear",
      "Touch points and equipment cleaned", "Wipes and sanitiser stocked", "Defective equipment out of service and labelled"],
    fields: [{ k: "out", t: "text", l: "Equipment out of service (if any)" }] },
  { id: "treat", ref: "BHS-11", name: "Treatment rooms check & clean", icon: "💆", daily: true, freq: "Daily and between clients as the spa procedure requires", sec: "10",
    items: ["Couches and surfaces cleaned and sanitised", "Clean linen in use, used linen removed", "Heated equipment (stones, wax, towels) safe and at correct setting",
      "Products labelled, closed and in date", "Clinical / general waste disposed of correctly", "Emergency call working"] },
  { id: "desk", ref: "BHS-12", name: "Reception, touch points & waste", icon: "🛎", daily: true, freq: "Daily and at the intervals in the cleaning schedule", sec: "10",
    items: ["Reception desk and member-access areas clean", "Door handles, card readers, touch points cleaned", "Waste points emptied, bin areas tidy", "Emergency contact numbers displayed and current", "HSE information notice displayed"] },
  { id: "plant", ref: "BHS-13", name: "Plant-room daily checks", icon: "⚙️", daily: true, auth: "plant", freq: "Daily (authorised plant operators only)", sec: "8",
    items: ["Chemical containers labelled and secure", "Dosing lines and alarms checked", "Ventilation operating", "No leaks, corrosion or unusual noise",
      "Pumps, filters and strainers normal", "Boiler / heating system status normal", "Emergency isolation identified and accessible"],
    fields: [{ k: "backwash", t: "select", l: "Backwash carried out today?", o: ["Not scheduled", "Yes — recorded", "Due but not done"] }, { k: "readings", t: "text", l: "Gauge / flow readings (as the plant procedure requires)" }] },
  { id: "chem", ref: "BHS-14", name: "Chemical store check", icon: "🧪", daily: true, auth: "coshh", freq: "Daily (trained and authorised staff only)", sec: "8",
    items: ["Store locked and secure", "Store ventilated, no unusual fumes", "All containers closed, labelled, none decanted unlabelled",
      "Incompatible chemicals segregated — calcium hypochlorite kept away from acids and other chemicals", "Secondary containment in place, no spills or damage",
      "PPE available as the COSHH assessment requires", "Eyewash in date and accessible", "Spill kit present and stocked", "Current SDS file available"],
    fields: [{ k: "stock", t: "text", l: "Stock notes / low items" }] },
  { id: "aed", ref: "BHS-15", name: "First aid, AED & rescue equipment", icon: "❤️", daily: true, freq: "Daily before opening", sec: "9",
    items: ["AED status indicator shows ready", "AED pads and battery in date", "First-aid kit sealed or stocked to the list", "Rescue equipment present and serviceable",
      "Emergency phone / radio working", "Eyewash station stocked and in date", "Emergency contact sheet displayed"] },
  { id: "defect", ref: "BHS-20", name: "Report a defect", icon: "🔧", freq: "Whenever a defect is found", sec: "11", status: true,
    fields: [{ k: "what", t: "text", l: "Equipment or area", req: true }, { k: "defect", t: "area", l: "What is wrong", req: true },
      { k: "removed", t: "select", l: "Taken out of service and labelled?", o: ["Yes", "No — not needed", "No — needs doing"], req: true }, { k: "reportedTo", t: "text", l: "Reported to", req: true }] },
  { id: "incident", ref: "BHS-21", name: "Incident / near miss", icon: "⚠️", freq: "Immediately after any incident or near miss", sec: "9", status: true,
    fields: [{ k: "type", t: "select", l: "Type", o: ["Near miss", "Minor injury", "Serious injury / medical emergency", "Contamination (pool/spa)", "Chemical spill / exposure", "Safeguarding concern", "Missing person", "Unauthorised access", "Plant / power failure", "Other"], req: true },
      { k: "location", t: "text", l: "Location", req: true }, { k: "people", t: "text", l: "Person(s) involved (initials only on this record)" }, { k: "witnesses", t: "text", l: "Witnesses" },
      { k: "what", t: "area", l: "What happened", req: true }, { k: "controlled", t: "text", l: "Immediate danger controlled — how", req: true },
      { k: "firstaid", t: "text", l: "First aid / emergency services" }, { k: "evidence", t: "text", l: "CCTV / evidence preserved" }, { k: "notified", t: "text", l: "Notifications made (Duty Manager, GM)", req: true },
      { k: "reopen", t: "select", l: "Reopening decision", o: ["Not affected", "Area closed — awaiting authorisation", "Reopened with authorisation"] }],
    note: "Do not record health details or full names of members here. Serious incidents: call 999 first. RIDDOR-reportable incidents must be escalated to the General Manager the same day." }
];

/* water parameters (no default limits — limits must be approved by the competent person) */
var HS_WATER = [
  { k: "fc", l: "Free chlorine (mg/l)", lim: ["fcMin", "fcMax"] },
  { k: "cc", l: "Combined chlorine (mg/l)", lim: [null, "ccMax"] },
  { k: "ph", l: "pH", lim: ["phMin", "phMax"] },
  { k: "temp", l: "Water temperature (°C)", lim: ["tMin", "tMax"] }
];
var HS_POOLS = { pool: "Swimming pool", spapool: "Spa pool" };

/* ── starting registers (from the GM's instruction of 25 Nov 2026) ── */
var HS_SEED_COSHH = [
  { product: "Calcium hypochlorite", use: "Pool / spa disinfection (plant room)", supplier: "", size: "", sdsRev: "", status: "Assessment not started", notes: "Oxidiser — keep away from acids and incompatibles, never mix. Handle per current SDS and pool-plant procedure." },
  { product: "CoreClean 2H", use: "Cleaning", supplier: "", size: "", sdsRev: "", status: "Assessment not started", notes: "" },
  { product: "GP Lemon Gel", use: "Cleaning", supplier: "", size: "", sdsRev: "", status: "Assessment not started", notes: "" },
  { product: "Shampoo / bodywash", use: "Changing-room dispensers", supplier: "", size: "", sdsRev: "", status: "Assessment not started", notes: "" }
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
  ["Obtain source scans of supplied sheets and file in controlled appendix", "Ajay Kawa", "Sheets marked pending identification — not for live use"]
];
