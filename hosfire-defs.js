/* ============================================================
   HosFIRE — definitions (checks, rota, regulations)
   Brandon Hall Hotel and Spa. Standalone module: this file and
   hosfire.js are only loaded by hosfire.html.
   ============================================================ */

/* People who can sign in to HosFIRE.
   Everyone in FB_LOGINS (except spare slots) plus the extra logins below.
   Glenn Randell needs his own Firebase Auth account created ONCE:
   Firebase Console → Authentication → Add user → email and password below.
   The same email is allowed in firestore.rules (isFire). */
const HF_EXTRA_LOGINS = {
  "glenn.randell": { email: "glenn.randell@brandonhall.portal", pw: "BHGR-Fire-2026!", code: "BHGR", name: "Glenn Randell" }
};

/* Fire safety managers: can load the starting data, enter past records
   from a source, delete actions and documents. Others record checks and
   update actions. */
const HF_ADMINS = ["glenn.randell", "ajay.kawa", "raj.kumar", "alia.taub", "patrik.vlach"];

/* The named Fire Safety Manager (shown in the header, dashboard and inspector pack). */
const HF_FIRE_MANAGER = { key: "glenn.randell", name: "Glenn Randell", role: "Maintenance Manager" };

/* Extra access code asked for when someone arrives already signed in to HosPRO
   (from the HosFIRE tile). Light gate only — the real protection is the login
   and the Firestore rules. Remembered until the browser tab is closed. */
const HF_ACCESS_CODE = "999";

/* The four fire marshals. Weekly test rota: the day rotates Mon → Tue → Wed
   and the marshal rotates each week, starting on HF_ROTA_START. */
const HF_MARSHALS = ["Patrik Vlach", "Veronica Webb", "Laith Hardy", "Glenn Randell"];
const HF_ROTA_START = "2026-10-26";          // a Monday
/* Back-records: weeks and months from this date up to the rota start are
   listed on the Back-records tab so each one can be entered from Saeker. */
const HF_BACKFILL_FROM = "2026-02-02";   // Monday 2 Feb 2026
const HF_ROTA_DAYS = ["Monday", "Tuesday", "Wednesday"];

const HF_HOTEL = {
  name: "Brandon Hall Hotel and Spa",
  address: "Main Street, Brandon, Coventry CV8 3FW",
  fra: { date: "2026-02-27", signed: "2026-03-16", assessor: "Gareth Jones (MIFSM, BS 8674), Soldorlet", ref: "FRA-858B0F2E", rating: "Medium – At Risk (likelihood medium, consequence moderate harm, score 4)", review: "2027-02-27", standard: "BS 9792:2025 Type 3", rev1: "Revision 1 dated 16 Oct 2026" },
  inspection: { date: "2026-10-27", time: "10:30", inspector: "Ranjit Bahi", body: "Warwickshire Fire and Rescue Service", ref: "01/018384/RB0093/CF" }
};

/* ── Check types ──────────────────────────────────────────────
   freq: daily | weekly | monthly | event
   items: [key, label, must]   (must = red ★ — cannot be skipped)
   fields: [key, label, type, required] type: text | number | select:a|b|c | textarea */
const HF_CHECKS = [
  { id: "weekly_alarm", ref: "BHH-FS-01", name: "Weekly fire alarm test", short: "Alarm test", freq: "weekly", owner: "Fire marshal (rota)", std: "BS 5839-1 cl. 45.2",
    intro: "Tell reception and the duty manager first. Operate one manual call point (a different one each week, in rotation). If the alarm is not heard everywhere or the panel shows a fault, report it to Leader Systems the same day.",
    fields: [["callpoint", "Call point number and location", "text", true], ["zone", "Zone", "text", true], ["time", "Time of test", "time", true]],
    items: [["panel", "Panel showed the alarm for the correct zone", true], ["sounders", "Sounders heard in all areas (including spa and Woodlands)", true],
            ["reset", "Panel reset and showing normal", true], ["logbook", "Entry made in the fire alarm logbook at the panel", true],
            ["release", "Door hold-open devices released on alarm", false]] },
  { id: "daily", ref: "BHH-FS-02", name: "Daily fire safety checks", short: "Daily", freq: "daily", owner: "Duty manager / night porter", std: "RRO 2005 Art. 14 and 17",
    intro: "At the start of each day. Any blocked exit or panel fault is put right or reported immediately.",
    fields: [],
    items: [["exits", "Final exits unlocked and clear", true], ["routes", "Escape routes and corridors clear", true], ["panel", "Fire alarm panel normal (no faults)", true],
            ["doors", "Fire doors shut, not wedged", true], ["signs", "Exit signs lit", false], ["ext", "Extinguishers in place", false], ["assembly", "Route to the assembly point clear", false]] },
  { id: "el_weekly", ref: "BHH-FS-03A", name: "Emergency lighting weekly visual check", short: "EL weekly", freq: "weekly", owner: "Maintenance", std: "BS 5266-1",
    intro: "Walk the building and check the green indicator LED on each self-contained fitting.",
    fields: [["failed", "Failed fittings (location / number)", "textarea", false]],
    items: [["leds", "All indicator LEDs showing healthy", true], ["reported", "Any failures reported to the contractor", false]] },
  { id: "el_monthly", ref: "BHH-FS-03B", name: "Emergency lighting monthly function test", short: "EL monthly", freq: "monthly", owner: "Maintenance", std: "BS 5266-1 cl. 12",
    intro: "Switch each circuit to battery with the test key for a short period. Check every fitting lights, then restore mains and check the LEDs come back on.",
    fields: [["areas", "Areas / circuits tested", "textarea", true], ["count", "Fittings tested (number)", "number", true], ["failed", "Failed fitting numbers and locations", "textarea", false]],
    items: [["lit", "All fittings lit on test", true], ["restored", "All LEDs back on after the test", true], ["signs", "Exit signs lit on battery", true]] },
  { id: "doors_weekly", ref: "BHH-FS-04A", name: "Fire door weekly check", short: "Doors weekly", freq: "weekly", owner: "Maintenance", std: "RRO 2005 Art. 17; FSO guidance",
    intro: "Check the fire doors on escape routes and stair enclosures.",
    fields: [["defects", "Defects found (door / location)", "textarea", false]],
    items: [["close", "All doors close fully and latch", true], ["holdopen", "Hold-open devices release on alarm test", true], ["wedge", "No doors wedged or propped open", true]] },
  { id: "doors_monthly", ref: "BHH-FS-04B", name: "Fire door monthly detailed check", short: "Doors monthly", freq: "monthly", owner: "Maintenance", std: "BS 9999 / FSO guidance",
    intro: "Detailed check of a sample of fire doors, including bedroom doors. Record the doors checked.",
    fields: [["doors", "Doors checked (numbers / locations)", "textarea", true], ["defects", "Defects and action", "textarea", false]],
    items: [["close", "Close and latch from any angle", true], ["seals", "Intumescent seals and smoke strips intact", true], ["gaps", "No damage, gaps over 4 mm or missing parts", true], ["signs", "Fire door signage in place", false]] },
  { id: "extinguishers", ref: "BHH-FS-05", name: "Fire extinguisher monthly check", short: "Extinguishers", freq: "monthly", owner: "Maintenance", std: "BS 5306-3",
    intro: "Check every extinguisher and fire blanket. Report any missing, discharged or damaged unit to the contractor the same day.",
    fields: [["checked", "Number of units checked", "number", true], ["issues", "Units with issues (number / location)", "textarea", false]],
    items: [["place", "All in place, visible and signed", true], ["pins", "Pins and tamper tags intact", true], ["gauge", "Gauges in the green (where fitted)", false], ["label", "Service labels in date", true], ["blankets", "Fire blankets in place (kitchens, spa)", false]] },
  { id: "kitchen", ref: "BHH-FS-06", name: "Kitchen extract and suppression weekly check", short: "Kitchen", freq: "weekly", owner: "Head chef", std: "TR19 Grease; RRO 2005",
    intro: "Extraction must be running before cooking starts. Grease filters cleaned at least weekly.",
    fields: [["kitchen", "Kitchen", "select:Main kitchen|Woodlands kitchen|Both", true]],
    items: [["filters", "Grease filters removed and cleaned", true], ["canopy", "Canopy wiped down", false], ["nozzles", "Suppression nozzle caps in place", true], ["gas", "Gas shut-off accessible and labelled", true], ["blanket", "Fire blanket and wet chemical extinguisher in place", true]] },
  { id: "laundry", ref: "BHH-FS-07", name: "Laundry lint and dryer check", short: "Laundry", freq: "daily", owner: "Housekeeping lead", std: "FRA action A19",
    intro: "Spontaneous combustion of hot linen is a known hotel fire cause. Never leave dryers running or hot linen piled when the laundry is unattended.",
    fields: [],
    items: [["lint", "Lint filters cleaned after every load", true], ["clear", "Area around dryers clear of linen and combustibles", true], ["cool", "Dryers off and linen cooled and spread before leaving", true]] },
  { id: "spa", ref: "BHH-FS-23", name: "Spa and leisure weekly fire check", short: "Spa", freq: "weekly", owner: "Spa manager", std: "RRO 2005 Art. 22 (shared areas)",
    intro: "Spa areas are shared with Granite Leisure. Pass any issue to them and record it here.",
    fields: [["issues", "Issues found / passed to Granite Leisure", "textarea", false]],
    items: [["sauna", "Sauna heater guard in place; nothing stored on or near the heater", true], ["towels", "No towels or linen drying on heaters", true],
            ["chem", "Pool chemicals stored apart (acids away from chlorine) and the store locked", true], ["plant", "Plant room clear of combustible storage", true],
            ["exits", "Spa fire exits and changing room routes clear", true], ["alarm", "Fire alarm sounder audible / visual beacon working in wet areas (from last weekly test)", false],
            ["steam", "Steam room generator and controls area clear; no storage", true], ["robes", "Robes / towels available at the spa exit for guests evacuated from wet areas", false],
            ["treat", "Treatment rooms: no candles left unattended; wax heaters and electrics switched off when not in use", true],
            ["count", "Spa reception can produce a list of guests in the spa (for roll call)", true]] },
  { id: "co_alarm", ref: "BHH-FS-24", name: "Plant room CO alarm and gas check", short: "Gas / CO", freq: "monthly", owner: "Maintenance", std: "Gas Safety (Installation and Use) Regs 1998",
    intro: "Test the carbon monoxide alarm(s) in the boiler plant room and check appliances under a warning notice are still isolated.",
    fields: [["notes", "Notes", "textarea", false]],
    items: [["co", "CO alarm tested and working", true], ["isolated", "Appliances under a warning notice still isolated and labelled", true], ["clear", "Plant room clear of storage", true], ["valve", "Emergency gas control valve accessible and labelled", true]] },
  { id: "walkround", ref: "BHH-FS-08", name: "Monthly fire safety walk-round (manager)", short: "Walk-round", freq: "monthly", owner: "Manager", std: "RRO 2005 Art. 11",
    intro: "The manager's monthly check that the system is working. Any 'fail' becomes an action.",
    fields: [["rooms", "Bedrooms sampled for fire action notices", "text", false]],
    items: [["logbook", "Fire alarm logbook up to date; every false alarm recorded with its cause", true], ["el", "Emergency lighting weekly and monthly checks done", true],
            ["doors", "Fire door checks done", true], ["ext", "Extinguisher monthly check done", true], ["daily", "Daily checks completed every day", true],
            ["routes", "Escape routes, final exits and route to the assembly point clear", true], ["co", "Plant room CO alarm tested", true],
            ["gas", "Gas appliances under a warning notice still isolated", true], ["induction", "New staff this month given fire induction", true],
            ["drill", "Fire drill due? (twice a year, including night staff)", true], ["notices", "Fire action notices in sampled bedrooms, including 'do not use the lift'", false],
            ["signs", "Exit signs lit and visible", false], ["logs", "Kitchen, laundry and spa logs completed", false], ["bins", "Bins stored away from the building", false],
            ["elec", "No overloaded sockets or damaged leads", false], ["hotwork", "Hot work permits used where needed", false], ["peeps", "PEEPs completed and night staff told", false],
            ["contract", "Contractor services due next month booked", false], ["fra", "Changes to the building or its use passed to the fire risk assessor", false],
            ["granite", "Shared-area issues passed to Granite Leisure", false]] },
  { id: "drill", ref: "BHH-FS-12", name: "Fire drill / evacuation", short: "Drill", freq: "event", owner: "Manager / fire marshals", std: "RRO 2005 Art. 21",
    intro: "At least twice a year, including one with night staff. Record what really happened, including anything that went wrong.",
    fields: [["shift", "Day or night drill", "select:Day|Night", true], ["time", "Time alarm started", "time", true], ["evac", "Evacuation time (minutes)", "number", true],
             ["staff", "Staff taking part (number)", "number", true], ["names", "Marshals and staff taking part", "textarea", true], ["issues", "Issues found and actions", "textarea", false]],
    items: [["heard", "Alarm heard in every area", true], ["panel", "Duty manager went to the panel and identified the zone", true], ["call", "999 call made (simulated) with the correct address and location", true],
            ["sweep", "Allocated areas swept and doors closed behind", true], ["lift", "Lift not used", true], ["peep", "Guests needing assistance helped as set out in their PEEP", true],
            ["rollcall", "Roll call completed (arrivals list, staff rota, sign-in book)", true], ["meet", "Person named to meet the fire service", true],
            ["reentry", "Nobody re-entered before the all-clear", true], ["reset", "Panel reset and drill entered in the logbook", true]] },
  { id: "alarm_event", ref: "BHH-FS-10", name: "Fire alarm event / false alarm / fault", short: "Alarm event", freq: "event", owner: "Duty manager", std: "BS 5839-1 cl. 48",
    intro: "Record every activation (real, false or unwanted) and every fault shown on the panel.",
    fields: [["time", "Time", "time", true], ["kind", "Type", "select:Fire|False alarm|Unwanted alarm (e.g. steam, cooking)|Fault|Disablement / isolation", true],
             ["zone", "Zone / device", "text", true], ["cause", "Cause", "textarea", true], ["call999", "999 called", "select:Yes|No", true],
             ["frs", "Fire service attended", "select:Yes|No", true], ["action", "Action taken / reset by", "textarea", true]],
    items: [] },
  { id: "event", ref: "BHH-FS-25", name: "Pre-event fire safety check (venue booking)", short: "Event", freq: "event", owner: "Events / duty manager", std: "RRO 2005 Art. 14, 15; approved premises",
    intro: "Before every event, wedding ceremony or function room booking. Check the numbers against the room's fire occupancy limit and the layout keeps every exit clear.",
    fields: [["venue", "Room / venue", "venue", true], ["bookingRef", "Booking reference / client", "text", true], ["eventType", "Type", "select:Wedding ceremony|Wedding breakfast / reception|Meeting / conference|Dinner / party|Funeral / celebration of life|Other", true],
             ["guests", "Number of guests and staff in the room", "number", true], ["layout", "Layout", "select:boardroom|ushape|theatre|cabaret|reception", true], ["time", "Event start time", "time", false],
             ["marshal", "Fire marshal / duty manager on duty", "text", true]],
    items: [["capacity", "Numbers are within the room's fire occupancy limit for this layout", true], ["exits", "All exits and routes clear of tables, staging, AV, prams and coats", true],
            ["signs", "Exit signs visible (not covered by drapes or décor)", true], ["doors", "Fire doors not wedged or propped", true],
            ["flames", "No naked flames, or candles only in approved enclosed holders", true], ["decor", "Drapes and décor flame-retardant (supplier certificate seen) — N/A if none", false],
            ["elec", "Supplier electrical equipment visibly safe and PAT-tested; no trailing leads across exits", true], ["brief", "Event lead / organiser told the evacuation route, assembly point and not to use the lift", true],
            ["peep", "Guests needing assistance identified and plan agreed (PEEP)", true], ["contractors", "Outside suppliers signed in and given the fire information", false]] },
  { id: "contractor", ref: "BHH-FS-11", name: "Contractor visit / service", short: "Contractor", freq: "event", owner: "Maintenance", std: "BS 5839-1 / 5266-1 / 5306-3",
    intro: "Record every contractor visit for a fire safety system. Upload the certificate in the Certificates tab.",
    fields: [["contractor", "Contractor and engineer", "text", true], ["system", "System", "select:Fire alarm|Emergency lighting|Extinguishers|Kitchen suppression (Ansul)|Gas|Electrical|Fire doors|Kitchen extract|Other", true],
             ["jobref", "Certificate / job reference", "text", true], ["result", "Result", "select:Satisfactory|Satisfactory with defects|Unsatisfactory", true],
             ["defects", "Defects left open", "textarea", false], ["next", "Next visit due", "date", false]],
    items: [] }
];

/* Sources allowed when entering a past record (Manager → Enter a past record).
   A past record is only ever a copy of something that was recorded at the time. */
const HF_SOURCES = [
  "Saeker task history",
  "FireClass panel event log (printout)",
  "Paper form / logbook kept at the time",
  "Contractor report or certificate",
  "Email or message sent at the time",
  "Marshal retrospective statement (BHH-FS-22)"
];

const HF_STATUS = ["Not started", "In progress", "Completed"];
const HF_PRIORITY = ["High", "Medium", "Low"];
const HF_ACTION_CATS = ["FRA action", "Leader Systems", "Emergency lighting", "Electrical and lighting", "Gas appliances", "Extinguishers", "Saeker", "Inspection", "Records", "Other"];

const HF_DOC_CATS = ["Fire risk assessment", "Inspection / enforcement", "Policy and procedure", "Contract", "Certificate / report", "Quote", "Correspondence", "Statement", "Form", "Manual (equipment)", "Training", "Photo / evidence", "Floor plan", "Other"];

const HF_COURSES = [
  ["induction", "Fire induction", 0],
  ["refresher", "Annual refresher", 12],
  ["marshal", "Fire marshal course", 36],
  ["extinguisher", "Extinguisher use", 12],
  ["procedure", "Fire procedure briefing signed", 12],
  ["drill", "Last drill taken part in", 12],
  ["reception", "Reception alarm procedure briefing", 12, ["reception", "nights"]]   // reception and night staff only
];
const courseApplies = (t, c) => !c[3] || c[3].includes((t && t.dept) || "other");

/* ── Regulations and standards ─────────────────────────────── */
const HF_REGS = [
  { t: "Regulatory Reform (Fire Safety) Order 2005", items: [
    ["Art. 3 / 5", "Responsible person: the employer and anyone with control of the premises. At Brandon Hall: the operator, with the owner and Granite Leisure for shared areas."],
    ["Art. 9", "Suitable and sufficient fire risk assessment, reviewed regularly and after any significant change. Significant findings recorded (5 or more employees or licensed premises)."],
    ["Art. 11", "Fire safety arrangements for planning, organisation, control, monitoring and review, recorded."],
    ["Art. 13", "Fire detection and warning, firefighting equipment, and competent persons to carry out firefighting measures."],
    ["Art. 14", "Emergency routes and exits kept clear, signed and lit by emergency lighting."],
    ["Art. 15", "Procedures for serious and imminent danger, with competent persons nominated to carry out evacuation (fire marshals)."],
    ["Art. 17", "Maintenance: facilities, equipment and devices kept in efficient working order and good repair."],
    ["Art. 18", "Competent persons appointed to assist with preventive and protective measures."],
    ["Art. 19", "Information to employees about risks, measures and procedures."],
    ["Art. 21", "Training: at induction, on exposure to new risks, repeated periodically, in working hours."],
    ["Art. 22", "Co-operation and co-ordination where premises are shared (owner, operator, Granite Leisure)."],
    ["Art. 32", "Offences: failure to comply that places people at risk of death or serious injury."]
  ]},
  { t: "British Standards and guidance used", items: [
    ["BS 5839-1:2017", "Fire alarm: weekly user test of a different call point each week, at a similar time; service by a competent contractor at intervals not exceeding 6 months (we contract quarterly); logbook of all events, tests and faults."],
    ["BS 5266-1:2016", "Emergency lighting: monthly short function test of every fitting; annual full rated-duration (3-hour) test; records kept."],
    ["BS 5306-3:2017", "Portable extinguishers: monthly visual check by the premises; annual basic service by a competent person; extended service / discharge test at set intervals."],
    ["BS 9999 / BS 8214", "Fire doors: self-closing, latching, seals intact, gaps within tolerance; periodic inspection by a competent person (FRA action A12)."],
    ["TR19 Grease (BESA)", "Kitchen extract duct cleaning at intervals based on use (typically 3, 6 or 12 months), with a post-clean report."],
    ["PAS 79-1:2020", "Method used for the fire risk assessment."],
    ["Gas Safety (Installation and Use) Regs 1998", "Annual gas safety check by a Gas Safe engineer; appliances under a warning notice must not be used until made safe."],
    ["Electricity at Work Regs 1989 / BS 7671", "Fixed wiring inspected (EICR) at the recommended interval; portable appliances tested by risk."],
    ["HM Government guide: Sleeping accommodation", "Guidance for hotels: evacuation strategy, night staffing, PEEPs and training for staff on night duty."]
  ]},
  { t: "Our evacuation strategy", items: [
    ["Strategy", "Simultaneous evacuation on the sounding of the alarm."],
    ["Calling the fire service", "The alarm is NOT monitored by a receiving centre. Staff must call 999 on every activation unless the duty manager has confirmed it is a false alarm."],
    ["Assembly point", "As shown on the fire action notices."],
    ["Guests needing assistance", "Personal or general emergency evacuation plans (PEEPs / GEEPs) made at check-in; night staff told."],
    ["Lifts", "Not used for evacuation."]
  ]}
];

/* ── Compliance calendar (fed into the Diary) ───────────────── */
const HF_CALENDAR = [
  { what: "Fire alarm service (Leader Systems)", every: 3, cert: "CERT-01" },
  { what: "Kitchen suppression (Ansul) service", every: 6, cert: "CERT-04" },
  { what: "Emergency lighting annual 3-hour test", every: 12, cert: "CERT-02" },
  { what: "Extinguisher annual service", every: 12, cert: "CERT-03" },
  { what: "Gas safety record (WarmFix)", every: 12, cert: "CERT-05" },
  { what: "Fire risk assessment review", every: 12, cert: "CERT-11" },
  { what: "Fire door inspection", every: 12, cert: "CERT-08" },
  { what: "Kitchen extract duct clean (TR19)", every: 12, cert: "CERT-09" }
];

/* ── What the fire safety officer looks at (Fire Safety Order audit) ──
   Used by the "Audit readiness" tab. [id, what he will ask for / look at, where the evidence is] */
const HF_AUDIT = [
  { t: "Fire risk assessment and management", items: [
    ["fra", "A current fire risk assessment covering the whole premises — hotel, bedrooms, kitchens, spa, Woodlands and the function / ceremony rooms", "Documents"],
    ["fraplan", "Progress on the FRA action plan (A1–A19), with dates and evidence", "Actions"],
    ["rp", "Who the responsible person is, and the named Fire Safety Manager (Glenn Randell)", "Dashboard / Settings"],
    ["coop", "Co-operation with Granite Leisure and the owner for shared areas (spa, Woodlands) — signed responsibilities statement", "Documents (BHH-FS-17)"],
    ["policy", "Fire safety policy and written fire procedure, signed and adopted", "Documents"]]},
  { t: "Fire alarm and detection", items: [
    ["weekly", "Weekly call point tests — logbook showing date, call point, result, who did it", "Weekly tests / Back-records"],
    ["service", "Fire alarm service certificates every 6 months or less (BS 5839-1) — current one", "Certificates"],
    ["faults", "Open faults (sounders, detectors, Chair Room) and what is being done in the meantime", "Actions (A1, A2, L1, L2)"],
    ["false", "False alarm log with causes, and the investigation (reception, bar, restaurant)", "Logbook (alarm events), A6"],
    ["zones", "Zone charts at the panels", "Actions (A4, L3)"],
    ["999", "How the fire service is called (alarm not monitored — staff call 999)", "Regulations / procedure"]]},
  { t: "Escape routes, doors and lighting", items: [
    ["routes", "Escape routes and final exits clear, unlocked and signed — he will walk them", "Daily checks"],
    ["doors", "Fire doors closing and latching, not wedged; bedroom doors; annual inspection", "Fire door checks, A12"],
    ["el", "Emergency lighting monthly tests and annual 3-hour certificate; the 43 failed fittings", "Checks, Certificates, E1–E6"],
    ["notices", "Fire action notices in bedrooms and public areas", "Walk-round, I6"]]},
  { t: "Firefighting equipment and hazards", items: [
    ["ext", "Extinguishers serviced annually and checked monthly", "Certificates, Extinguisher checks"],
    ["kitchen", "Kitchen: suppression (Ansul) serviced, extract duct cleaned (TR19), filters cleaned", "Certificates, Kitchen checks, A10, A18"],
    ["gas", "Gas safety record; the 3 failed appliances isolated or replaced", "Certificates, G1–G4"],
    ["elec", "EICR and PAT current", "Certificates"],
    ["laundry", "Laundry: lint cleaning, dryers not left running", "Laundry checks, A19"],
    ["hotwork", "Hot work permits for contractors", "Drills, PEEPs, permits"],
    ["arson", "Bins and combustible storage away from the building", "Walk-round"]]},
  { t: "Spa and leisure (shared with Granite Leisure)", items: [
    ["spa_fra", "The spa is covered by the FRA and its actions", "Documents / Actions"],
    ["spa_evac", "Spa evacuation procedure — guests in the pool, sauna, steam room, treatment rooms; robes and towels; roll call from spa bookings", "Spa checks / procedure"],
    ["spa_alarm", "Alarm audible / visible in wet areas and treatment rooms", "Weekly tests, Spa checks"],
    ["spa_chem", "Pool chemical store: acids and chlorine kept apart, store locked, signed", "Spa checks"],
    ["spa_heat", "Sauna and steam room heaters: guards, nothing stored, controls", "Spa checks"],
    ["spa_staff", "Spa staff trained and in the drills", "Training"],
    ["spa_panel", "Zone chart at the spa panel", "A4"]]},
  { t: "Function rooms, events and room bookings (approved premises)", items: [
    ["occ", "Maximum occupancy for each function room / ceremony room, agreed with the FRA", "Venues & events"],
    ["layout", "Event layouts keep every exit clear; pre-event check done for each booking", "Venues & events"],
    ["ceremony", "Rooms named on the marriage licence application are covered by the FRA", "Venues & events, I10"],
    ["decor", "Candles, décor and supplier equipment controlled at events", "Pre-event checks"],
    ["bedrooms", "Bedroom bookings: guests needing assistance identified at check-in (PEEP), night staff told", "Drills, PEEPs, permits"]]},
  { t: "People: training, drills and night staff", items: [
    ["train", "Staff fire induction and annual refresher records", "Training"],
    ["marshals", "Fire marshals named and trained", "Training"],
    ["drills", "Drills twice a year, including night staff, with records", "Drills"],
    ["night", "Night staffing: how many, what they do, can they evacuate the building", "Procedure, I9"],
    ["peeps", "PEEPs / refuge arrangements and the refuge communication system", "Drills, PEEPs, permits, A13"]]}
];
const HF_READY = ["Not ready", "Partly ready", "Ready"];

/* Who an action came from / sits with — shown as a coloured tag in HosFIRE and
   HosFIRE Mobile. Hotel (our own) actions stay blue. */
const HF_SOURCES_TAG = [
  { key: "leader",    label: "Leader Systems",  color: "#6A3FA0", test: (a) => /leader/i.test(`${a.contractor} ${a.category}`) },
  { key: "warmfix",   label: "WarmFix (gas)",   color: "#8D5524", test: (a) => /warmfix/i.test(a.contractor || "") || a.category === "Gas appliances" },
  { key: "yec",       label: "YEC",             color: "#AD1457", test: (a) => /\byec\b/i.test(a.contractor || "") },
  { key: "soldorlet", label: "Soldorlet (FRA)", color: "#00897B", test: (a) => /soldorlet|gareth/i.test(`${a.contractor} ${a.source}`) || a.category === "FRA action" },
  { key: "saeker",    label: "Saeker",          color: "#E07B00", test: (a) => a.category === "Saeker" },
  { key: "hotel",     label: "Brandon Hall",    color: "#1D4E89", test: () => true }
];
function HF_SOURCE_OF(a) { a = a || {}; return HF_SOURCES_TAG.find((s) => s.test({ contractor: a.contractor || "", category: a.category || "", source: a.source || "" })); }

/* ── Documents that need signing, and by whom ──
   who: a HosFIRE login key (signs electronically in HosFIRE), or ext: an outside party
   (signs on paper; upload the signed copy to the document). */
const HF_SIGN_REQ = (() => {
  // date = the date already typed beside that signature on the document
  const G = { who: "glenn.randell", role: "Prepared by (Fire Safety Manager)", date: "2026-10-25" }, P = { who: "patrik.vlach", role: "Approved by (Manager, for 7 Hospitality (UK) Limited)", date: "2026-10-26" };
  const r = {
    "doc-manual": [G, P],
    "doc-st-01": [G, P], "doc-st-02": [G, P], "doc-st-04": [G, P], "doc-st-05": [G, P], "doc-st-06": [G, P], "doc-st-08": [G, P],
    "doc-st-03": [{ ext: "7H Hospitality (owner)", role: "For the owner", date: "2026-10-26" }, P, { ext: "Granite Leisure (tenant)", role: "For Granite Leisure" }],
    "doc-st-07": [G, P, { ext: "Soldorlet — Gareth Jones", role: "Fire risk assessor (agreed)" }],
    "doc-st-09": [{ who: "patrik.vlach", role: "Signatory, for 7 Hospitality (UK) Limited", date: "2026-10-26" }],
    "doc-st-10": [{ who: "glenn.randell", role: "Signatory (Fire Safety Manager)", date: "2026-10-26" }],
    "doc-st-11": [{ who: "glenn.randell", role: "Checked by (Fire Safety Manager)" }, { ext: "WarmFix Ltd engineer", role: "Confirmed by WarmFix" }, { ...P, date: "" }]
  };
  return r;
})();
/* Marshal retrospective statements (BHH-FS-22): each marshal writes and signs their own, online. */
const HF_RETRO = [["patrik.vlach", "Patrik Vlach"], ["veronica.webb", "Veronica Webb"], ["laith.hardy", "Laith Hardy"], ["glenn.randell", "Glenn Randell"]];

/* ── Reception Fire Alarm Activation Procedure (from Front Office, Oct 2026) ── */
const HF_RECEPTION_STEPS = [
  ["Treat every activation as genuine", "Stop normal duties. If safe and trained, note the zone on the panel — never delay evacuation to investigate. Do not silence, reset or isolate unless authorised."],
  ["Tell the duty manager and marshals", "Using the hotel's emergency communication arrangements."],
  ["Call 999 — Fire and Rescue", "Every time. Do not assume a monitoring service has called. Give hotel name, address, zone, any smoke or fire, people at risk and a callback number."],
  ["Warn and direct guests", "Calmly to the safe exits and assembly point. Never the lifts."],
  ["Take the records — only if safe", "Occupancy report, staff sign-in register, contractor and visitor records. Never delay leaving to fetch paperwork."],
  ["Leave by a safe route", "Do not stay at reception for calls or go to check rooms. Never enter smoke."],
  ["At the assembly point", "Give the duty manager the records, panel details and anyone needing help. Report anyone missing and their last location to the fire service — nobody goes back in."],
  ["Re-entry and recording", "Only when authorised with the fire service's agreement. Record the activation, actions, defects and follow-up."],
  ["Night shift", "Same principles. At handover confirm panel status, known defects, staff register and who calls 999, warns guests, assists and briefs the fire service."]
];
