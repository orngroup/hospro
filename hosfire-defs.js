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
const HF_ACTION_CATS = ["FRA action", "Training", "Leader Systems", "Emergency lighting", "Electrical and lighting", "Gas appliances", "Extinguishers", "Saeker", "Inspection", "Records", "Other"];

const HF_DOC_CATS = ["Fire risk assessment", "Inspection / enforcement", "Policy and procedure", "Contract", "Certificate / report", "Quote", "Correspondence", "Statement", "Form", "Manual (equipment)", "Training", "Photo / evidence", "Floor plan", "Other"];

const HF_COURSES = [
  ["induction", "Fire induction", 0],
  ["refresher", "Annual refresher", 12],
  ["marshal", "Fire marshal course", 36],
  ["extinguisher", "Extinguisher use", 12],
  ["procedure", "Fire procedure briefing signed", 12],
  ["drill", "Last drill taken part in", 12],
  ["reception", "Reception alarm procedure briefing", 12, ["reception", "nights"]],   // reception and night staff only
  ["monthly", "Monthly fire refresher", 1]
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
    ["Calling the fire service", "Staff must call 999 on every activation and never assume a monitoring service has called (whether the alarm is also remotely monitored is being confirmed with Leader Systems)."],
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
    ["999", "How the fire service is called (staff call 999 on every activation; monitoring position being confirmed)", "Regulations / procedure"]]},
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

/* Site facts confirmed by Glenn Randell, 26 Oct 2026 (used when Settings → Site facts is blank) */
const HF_SITE_DEFAULT = {
  assembly: "Out of the front door, turn right, across the car park (moving this week — drop-kerb works)",
  mainPanel: "Main entrance, down the disabled ramp",
  spaPanel: "Spa (Granite Leisure — their team leaders maintain it and keep its logs)",
  granite: "Aiden — 07301 067739",
  leaderPhone: "01788 542 220"
};

/* ── Shared front-desk / training login (kiosk) ─────────────────────
   Used by hosfire-checks.html and hosfire-training.html so front desk and
   all staff can record checks and training without their own login.
   Create ONCE in Firebase Console → Authentication → Add user (email and
   password below); the email is allowed in firestore.rules (isFire). Each
   record still carries the name of the person who did it. */
const HF_KIOSK = { email: "fire.kiosk@brandonhall.portal", pw: "BHFK-Kiosk-2026!", name: "HosFIRE kiosk" };
const HF_KIOSK_CODE = "999";

/* ── Staff fire safety training (HosFIRE Training) ────────────────────
   Based on the Regulatory Reform (Fire Safety) Order 2005 (Art. 21 —
   training at induction and repeated periodically), HM Government
   "Fire safety risk assessment: sleeping accommodation" and fire and
   rescue service guidance. Hotel details come from Site facts. */
const HF_TRAIN_INDUCTION = {
  key: "induction", title: "Fire safety induction", mins: 15, pass: 8,
  slides: [
    ["Why fire safety matters", ["Hotels are high risk: guests are asleep, don't know the building and may need help to get out.", "The law (Regulatory Reform (Fire Safety) Order 2005) says every member of staff must be trained when they start and regularly after that.", "You must follow the hotel's fire procedures, take care of your own safety and others', and report anything unsafe straight away."]],
    ["How fires start", ["Fire needs three things: heat, fuel and oxygen. Take one away and the fire goes out.", "Common causes in hotels: cooking, faulty or overloaded electrics, tumble-dryer lint, smoking, candles, and deliberate fire-setting (arson).", "Most fires can be prevented by good housekeeping and reporting faults early."]],
    ["Preventing fire — every day", ["Never wedge or prop open a fire door. Fire doors hold back fire and smoke.", "Keep corridors, stairs and fire exits clear — no trolleys, linen or boxes.", "Don't overload sockets; report damaged plugs, cables and appliances.", "Clean dryer lint filters after every load. Keep bins and rubbish away from the building.", "No smoking except in the designated area. Candles only in approved enclosed holders."]],
    ["If you discover a fire", ["Raise the alarm: break the nearest red fire alarm call point.", "Get out and close doors behind you to hold the fire back.", "Only use an extinguisher if the fire is small, you are trained, and your way out is behind you. If in doubt, get out.", "Tell the duty manager or reception where the fire is."]],
    ["When the alarm sounds", ["Brandon Hall uses SIMULTANEOUS evacuation: everyone leaves as soon as the alarm sounds.", "Leave by the nearest safe exit. Never use the lift.", "Help guests out of your area; close doors as you go. Don't stop to collect belongings.", "Go to the assembly point: {assembly}. Report to the duty manager for the roll call.", "Never go back in until the fire service says it is safe."]],
    ["Calling 999", ["Reception (or whoever is free first at night) calls 999 on EVERY activation. Never assume someone else has called.", "Say: “Fire and Rescue please. Brandon Hall Hotel and Spa, Main Street, Brandon, Coventry CV8 3FW. The fire alarm is sounding in [zone / area]. [Smoke or fire seen or not]. People at risk: [number / anyone needing help].”", "Stay on the line if it is safe and answer their questions."]],
    ["Helping guests", ["Some guests need help to get out — wheelchair users, people with sight or hearing loss, children, guests who may have been drinking.", "Guests who need help are identified at check-in and have a plan (PEEP). Reception and night staff know who they are.", "Knock on doors and call out as you leave your area. Tell the duty manager about anyone you could not reach — never put yourself at risk."]],
    ["Escape routes, signs and lighting", ["Green running-man signs show the way out. Emergency lights come on if the power fails.", "Final exit doors must open easily from inside and never be locked or blocked while the building is in use.", "Report any exit that is blocked, a sign that is not lit, or an emergency light that is out."]],
    ["Fire extinguishers", ["Red label — water: paper, wood, fabric. Cream — foam: as water plus flammable liquids. Black — CO₂: electrical equipment. Blue — powder (plant rooms). Yellow — wet chemical: cooking oil fires. Fire blanket: small pan fires.", "Never use water on electrical equipment or cooking oil.", "P-A-S-S: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep side to side.", "Your safety comes first. If the fire is not out in a few seconds, leave and close the door."]],
    ["Your area", ["Kitchen: never leave cooking unattended; know the gas shut-off and the fire blanket; keep filters clean.", "Housekeeping and laundry: clean lint filters, don't overload dryers, keep linen away from heaters and lights.", "Reception: keep the guest list and sign-in sheets ready, call 999, meet the fire service.", "Spa: clear the pool, sauna and treatment rooms; guests leave as they are; robes and towels at the exit.", "Fire Safety Manager: {manager}. Fire marshals: {marshals}."]]
  ],
  quiz: [
    ["The fire alarm sounds. What do you do?", ["Leave by the nearest safe exit and go to the assembly point", "Wait to see if it stops", "Finish what you are doing, then go"], 0],
    ["Who calls 999 when the fire alarm goes off?", ["Reception (or whoever is free first at night) — on every activation", "Nobody — the alarm calls the fire service", "Only the manager, once the fire is confirmed"], 0],
    ["A fire door is wedged open with a door stop. What should you do?", ["Remove the wedge and let the door close; report it", "Leave it — it helps with deliveries", "Only close it at night"], 0],
    ["Can you use the lift during a fire alarm?", ["No — use the stairs and fire exits", "Yes, if it is working", "Only to help guests"], 0],
    ["Which extinguisher should be used on an electrical fire?", ["CO₂ (black label)", "Water (red label)", "Foam (cream label)"], 0],
    ["What should you never use on a cooking oil (chip pan) fire?", ["Water", "A fire blanket", "A wet chemical extinguisher"], 0],
    ["When should you try to put out a fire yourself?", ["Only if it is small, you are trained and your way out is behind you", "Always — to protect the hotel", "Never — even if it is tiny"], 0],
    ["Where is the assembly point?", ["{assembly}", "In the hotel reception", "In the car park at the back of the spa"], 0],
    ["A guest uses a wheelchair and is staying on the first floor. What should you know?", ["They should have an evacuation plan (PEEP); tell the duty manager where they are", "Nothing — they will use the lift", "They should stay in their room"], 0],
    ["You find a fire exit blocked with boxes. What do you do?", ["Clear it if safe and report it straight away", "Leave it for maintenance", "Use a different exit and say nothing"], 0]
  ]
};
const HF_TRAIN_MONTHLY = [
  ["Fire doors", ["Fire doors hold back fire and smoke for at least 30 minutes — but only when closed.", "Never wedge or prop them open. Report doors that don't close fully, damaged seals or missing signs."], [["Why must fire doors be kept closed?", ["They hold back fire and smoke", "To keep the heat in", "For guest privacy"], 0], ["A fire door won't close on its own. What do you do?", ["Report it to maintenance straight away", "Wedge it closed", "Ignore it"], 0], ["Can fire doors be propped open with a fire extinguisher?", ["Never", "Yes, during busy times", "Only in the daytime"], 0]]],
  ["Escape routes and exits", ["Corridors, stairs and fire exits must be clear at all times.", "Final exit doors must open from inside without a key while the hotel is in use."], [["Where can trolleys be left?", ["Never on escape routes or in front of exits", "In stairwells", "In front of fire doors"], 0], ["A final exit is locked while guests are in. What do you do?", ["Unlock it if allowed and report it immediately", "Leave it", "Put a sign on it"], 0], ["What does the green running-man sign show?", ["The way out", "The lift", "A staff area"], 0]]],
  ["Raising the alarm and calling 999", ["Break the nearest red call point if you see a fire.", "Reception calls 999 on every activation — never assume someone else has."], [["How do you raise the alarm?", ["Break the nearest red call point", "Phone housekeeping", "Shout and wait"], 0], ["Who calls 999?", ["Reception — on every activation", "The guest", "Nobody"], 0], ["What address do you give?", ["Brandon Hall Hotel and Spa, Main Street, Brandon, Coventry CV8 3FW", "Just 'the hotel'", "The postcode only"], 0]]],
  ["Fire extinguishers and blankets", ["Red = water, cream = foam, black = CO₂, blue = powder, yellow = wet chemical.", "Only tackle a small fire if trained and your exit is behind you. P-A-S-S."], [["Which extinguisher for a computer fire?", ["CO₂ (black)", "Water (red)", "Foam (cream)"], 0], ["What does P-A-S-S stand for?", ["Pull, Aim, Squeeze, Sweep", "Point, Ask, Spray, Stop", "Push, Aim, Shoot, Start"], 0], ["Used an extinguisher? What next?", ["Report it so it can be replaced", "Put it back", "Nothing"], 0]]],
  ["Kitchen fire safety", ["Never leave cooking unattended. Keep extract filters clean.", "Know where the gas shut-off and fire blanket are. Never use water on oil."], [["Chip pan fire — what do you do?", ["Turn off the heat if safe, use the fire blanket or wet chemical, raise the alarm", "Throw water on it", "Carry the pan outside"], 0], ["How often are grease filters cleaned?", ["At least weekly", "Once a year", "Never"], 0], ["Where is the kitchen fire blanket?", ["Next to the cooking range — know where it is", "In the office", "There isn't one"], 0]]],
  ["Electrical safety", ["Don't overload sockets or daisy-chain extension leads.", "Report damaged plugs, cables or appliances and stop using them."], [["You see a scorched plug. What do you do?", ["Stop using it and report it", "Use it carefully", "Tape it up"], 0], ["Is it OK to plug an extension lead into another?", ["No", "Yes", "Only in bedrooms"], 0], ["Which extinguisher for electrical fires?", ["CO₂", "Water", "Foam"], 0]]],
  ["Housekeeping, laundry and storage", ["Clean dryer lint filters after every load; don't leave dryers running unattended at the end of a shift.", "Keep linen and chemicals away from heaters, lights and electrical panels."], [["When should dryer lint filters be cleaned?", ["After every load", "Once a week", "When full"], 0], ["Can linen be stored in a plant room?", ["No", "Yes", "Only overnight"], 0], ["A trolley is blocking a corridor. What do you do?", ["Move it out of the escape route", "Leave it", "Cover it"], 0]]],
  ["Helping guests and night time", ["Guests needing help to evacuate are identified at check-in (PEEP); night staff know who they are.", "At night there are fewer staff — knock on doors and call out as you leave."], [["Who needs a PEEP?", ["Anyone who may need help to get out", "Every guest", "Only staff"], 0], ["At night, who calls 999?", ["Whoever is free first — on every activation", "The guest", "Nobody until morning"], 0], ["You cannot reach a guest. What do you do?", ["Tell the duty manager and the fire service where they are", "Go back in for them", "Wait outside their door"], 0]]],
  ["Evacuation and the assembly point", ["Simultaneous evacuation — everyone leaves when the alarm sounds. Never use the lift.", "Go to the assembly point: {assembly}. Never go back in."], [["When do you leave the building?", ["As soon as the alarm sounds", "When told by a guest", "After 5 minutes"], 0], ["Where is the assembly point?", ["{assembly}", "Reception", "The bar"], 0], ["When can you go back in?", ["Only when the fire service says it is safe", "When the alarm stops", "After 10 minutes"], 0]]],
  ["Smoking, candles and events", ["Smoking only in the designated area; bins for cigarette ends.", "Candles only in enclosed holders, away from drapes and exits. Check event numbers against the room's limit."], [["Are naked flames allowed on tables at events?", ["Only in enclosed holders, away from drapes", "Yes, anywhere", "Only on the bar"], 0], ["Where can staff smoke?", ["Only in the designated area", "Anywhere outside", "In the plant room"], 0], ["An event has more guests than the room limit. What do you do?", ["Tell the duty manager straight away", "Nothing", "Open more doors"], 0]]],
  ["Arson prevention", ["Keep bins and rubbish away from the building and lock bin stores.", "Report anyone acting suspiciously and any small fires or burn marks."], [["Where should large bins be kept?", ["Away from the building, secured", "Against the wall by a door", "In a corridor"], 0], ["You find burn marks in a toilet. What do you do?", ["Report it to the duty manager", "Clean it up", "Ignore it"], 0], ["Why keep combustible rubbish away from doors?", ["It could be set alight and block the exit", "It looks untidy", "No reason"], 0]]],
  ["Contractors and hot work", ["Contractors sign in, are told the fire procedure and sign out.", "Hot work (welding, grinding, blow-torches) needs a hot work permit from the hotel before it starts."], [["What does hot work need before it starts?", ["A hot work permit from the hotel", "Nothing", "A phone call"], 0], ["Who tells contractors the fire procedure?", ["The person signing them in", "Nobody", "The guest"], 0], ["A contractor is grinding without a permit. What do you do?", ["Ask them to stop and tell the duty manager", "Let them carry on", "Open a window"], 0]]]
];
const hfMonthlyTopic = (d) => HF_TRAIN_MONTHLY[(new Date(d || Date.now())).getMonth() % 12];
