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
const HF_ADMINS = ["ajay.kawa", "raj.kumar", "alia.taub", "patrik.vlach"];

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
            ["exits", "Spa fire exits and changing room routes clear", true], ["alarm", "Fire alarm sounder audible / visual beacon working in wet areas (from last weekly test)", false]] },
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
const HF_ACTION_CATS = ["FRA action", "Leader Systems", "Emergency lighting", "Gas appliances", "Inspection", "Records", "Other"];

const HF_DOC_CATS = ["Fire risk assessment", "Inspection / enforcement", "Policy and procedure", "Contract", "Certificate / report", "Quote", "Statement", "Training", "Other"];

const HF_COURSES = [
  ["induction", "Fire induction", 0],
  ["refresher", "Annual refresher", 12],
  ["marshal", "Fire marshal course", 36],
  ["extinguisher", "Extinguisher use", 12],
  ["procedure", "Fire procedure briefing signed", 12],
  ["drill", "Last drill taken part in", 12]
];

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
