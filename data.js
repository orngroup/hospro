/* ============================================================
   BRANDON HALL PORTAL — DATA FILE
   Edit this file to update rooms, packages and pricing.
   AV / equipment values are DUMMY placeholders — overwrite
   from the M&E audit list when it arrives.
   Carbon values are ESTIMATED by model (see carbonModel()).
   ============================================================ */

const LOCATIONS = [
  {
    id: "brandon-hall",
    name: "Brandon Hall Hotel & Spa",
    town: "Coventry",
    address: "Main Street, Brandon, Coventry CV8 3FW",
    active: true
  }
  // future venues drop in here
];

/* ---- ROOMS (from Brandon_Hall_Sizes.xlsx) ----
   cap = capacity by layout; blank in source = null
   avStub / equipStub = DUMMY, replace from M&E audit    */
const ROOMS = [
  { id:"allkins",       name:"Allkins",        m2:53,  length:null, width:null, cap:{ boardroom:26, ushape:20, theatre:30, cabaret:null, reception:40 } },
  { id:"beech",         name:"Beech",          m2:43,  length:8.51, width:5.19, cap:{ boardroom:16, ushape:16, theatre:16, cabaret:20,  reception:40 } },
  { id:"brandon-1",     name:"Brandon 1",      m2:54,  length:13.26,width:6.55, cap:{ boardroom:26, ushape:26, theatre:26, cabaret:30,  reception:60 } },
  { id:"brandon-2",     name:"Brandon 2",      m2:76,  length:9.23, width:6.08, cap:{ boardroom:36, ushape:30, theatre:40, cabaret:60,  reception:100 } },
  { id:"brandon-suite", name:"Brandon Suite",  m2:130, length:null, width:null, combined:"Brandon 1 + Brandon 2", cap:{ boardroom:36, ushape:30, theatre:40, cabaret:90, reception:100 } },
  { id:"hunt",          name:"Hunt",           m2:49,  length:6.63, width:5.33, cap:{ boardroom:14, ushape:12, theatre:12, cabaret:0,   reception:25 } },
  { id:"johnson",       name:"Johnson",        m2:23,  length:5.08, width:4.22, cap:{ boardroom:10, ushape:10, theatre:10, cabaret:null,reception:10 } },
  { id:"jones",         name:"Jones",          m2:40,  length:8.20, width:4.88, cap:{ boardroom:14, ushape:10, theatre:10, cabaret:null,reception:20 } },
  { id:"parke",         name:"Parke",          m2:40,  length:6.98, width:6.67, cap:{ boardroom:17, ushape:16, theatre:16, cabaret:null,reception:40 } },
  { id:"warwick",       name:"Warwick",        m2:27,  length:5.7,  width:4.65, cap:{ boardroom:10, ushape:10, theatre:12, cabaret:0,   reception:20 } },
  { id:"wolston-1",     name:"Wolston 1",      m2:37,  length:7.91, width:4.75, cap:{ boardroom:14, ushape:12, theatre:12, cabaret:20,  reception:30 } },
  { id:"wolston-2",     name:"Wolston 2",      m2:38,  length:5.75, width:5.0,  cap:{ boardroom:14, ushape:12, theatre:12, cabaret:20,  reception:30 } },
  { id:"wolston-3",     name:"Wolston 3",      m2:24,  length:5.3,  width:4.75, cap:{ boardroom:10, ushape:10, theatre:12, cabaret:10,  reception:24 } },
  { id:"wolston-suite", name:"Wolston Suite",  m2:88,  length:17.9, width:4.75, cap:{ boardroom:30, ushape:28, theatre:35, cabaret:50,  reception:80 } },
  { id:"woodlands",     name:"Woodlands",      m2:279, length:19.0, width:13.05, cap:{ boardroom:112,ushape:90, theatre:120,cabaret:200, reception:280 } },
  { id:"woodlands-1",   name:"Woodlands 1",    m2:140, length:9.5,  width:13.05, cap:{ boardroom:50, ushape:40, theatre:55, cabaret:90,  reception:120 } },
  { id:"woodlands-2",   name:"Woodlands 2",    m2:140, length:19.5, width:13.05, cap:{ boardroom:50, ushape:40, theatre:55, cabaret:90,  reception:120 } }
];

/* ---- ROOM HIRE (from Meeting Packages sheet, inc VAT) ---- */
const ROOM_HIRE = {
  "allkins":{half:250,full:350}, "beech":{half:300,full:450},
  "brandon-1":{half:500,full:750}, "brandon-2":{half:300,full:400},
  "brandon-suite":{half:500,full:850}, "hunt":{half:350,full:450},
  "johnson":{half:250,full:350}, "jones":{half:250,full:350},
  "parke":{half:250,full:350}, "warwick":{half:250,full:350},
  "wolston-suite":{half:250,full:350}, "wolston-1":{half:250,full:350},
  "wolston-2":{half:250,full:350}, "wolston-3":{half:250,full:350},
  "woodlands":{half:750,full:1200}, "woodlands-1":{half:550,full:850},
  "woodlands-2":{half:550,full:850}
};

/* ---- EVENT TYPES + recommended layout ---- */
const EVENT_TYPES = [
  { id:"meeting",       label:"Meeting / Conference", icon:"📊", preferredLayouts:["boardroom","ushape","theatre"] },
  { id:"wedding",       label:"Wedding",              icon:"💍", preferredLayouts:["cabaret","reception","theatre"] },
  { id:"baby-shower",   label:"Baby Shower",          icon:"🍼", preferredLayouts:["cabaret","reception"] },
  { id:"birthday",      label:"Birthday Party",       icon:"🎂", preferredLayouts:["cabaret","reception"] },
  { id:"celebration",   label:"Celebration Party",    icon:"🥂", preferredLayouts:["cabaret","reception"] },
  { id:"funeral",       label:"Celebration of Life",  icon:"🕊️", preferredLayouts:["cabaret","theatre"] },
  { id:"christmas",     label:"Christmas / NYE",      icon:"🎄", preferredLayouts:["cabaret","reception"] }
];

/* ---- RECOMMENDED EQUIPMENT PER EVENT TYPE ----
   DUMMY DATA — replace from the M&E audit list.
   Rooms flag what they physically support separately (avSupport). */
const EVENT_EQUIPMENT = {
  "meeting":     ["LCD projector & screen","Flipchart & pens","PA system (on request)","ClickShare / wireless present","Delegate WiFi"],
  "wedding":     ["PA system & microphones","Screen for slideshow","Uplighting","DJ (Sound Kicks) £385+VAT","Dancefloor (on request)"],
  "baby-shower": ["Screen for slideshow","Background music / speakers","Cake table"],
  "birthday":    ["PA & microphone","Speakers","Screen","Dancefloor (on request)"],
  "celebration": ["PA & microphone","Speakers","Screen","DJ (Sound Kicks)"],
  "funeral":     ["PA & microphone","Screen for tribute slideshow","Background music"],
  "christmas":   ["DJ (Sound Kicks) £385+VAT","Staging (on request)","PA & microphones","Uplighting"]
};

/* ---- À LA CARTE ADD-ONS (from ADDITIONAL PRICING, inc where stated) ---- */
const ADDONS = [
  { cat:"Beverages & Breaks", items:[
    { name:"Tea, coffee & cookies/biscuits", price:3.75, unit:"pp" },
    { name:"Tea, coffee & pastries", price:5.50, unit:"pp" },
    { name:"Danish pastries", price:4.50, unit:"pp" },
    { name:"Unlimited tea/coffee", price:10, unit:"pp" },
    { name:"Breakfast rolls", price:8, unit:"pp" },
    { name:"Jugs of juice (apple/orange)", price:7.50, unit:"jug" },
    { name:"Jugs of squash/cordial", price:3.50, unit:"jug" },
    { name:"Mini bar fridge (up to 10 cans)", price:25, unit:"each" },
    { name:"Can of soft drink", price:2.50, unit:"each" },
    { name:"Mineral water still 750ml", price:4.70, unit:"btl" },
    { name:"Mineral water sparkling 750ml", price:4.70, unit:"btl" },
    { name:"Small water 330ml", price:2.70, unit:"btl" },
    { name:"Arrival drink (wine/beer/soft)", price:7.50, unit:"pp" },
    { name:"Glass of Prosecco 125ml", price:8, unit:"glass" },
    { name:"House wine (white/red/rosé)", price:30, unit:"btl" },
    { name:"Prosecco (from)", price:36, unit:"btl" },
    { name:"Bucket of beer (6 bottles)", price:30, unit:"bucket" },
    { name:"Cocktails", price:10.50, unit:"each" }
  ]},
  { cat:"Food", items:[
    { name:"Restaurant cold buffet lunch", price:19.50, unit:"pp" },
    { name:"Restaurant hot buffet lunch", price:25, unit:"pp" },
    { name:"Sandwich lunch with crisps", price:12, unit:"pp" },
    { name:"Sandwich lunch with chips", price:14, unit:"pp" },
    { name:"Soup and sandwich lunch", price:13, unit:"pp" },
    { name:"Bacon & egg rolls", price:8, unit:"pp" },
    { name:"Breakfast (individual, <15)", price:18.50, unit:"pp" },
    { name:"Group breakfast (min 15)", price:15, unit:"pp" },
    { name:"Fruit platter", price:15, unit:"each" },
    { name:"Bowl of fruit", price:8, unit:"each" },
    { name:"Canapés (3 per person)", price:10, unit:"pp" },
    { name:"Cheese platter", price:12, unit:"each" }
  ]},
  { cat:"Equipment & AV", items:[
    { name:"DJ (Sound Kicks)", price:385, unit:"event", note:"+VAT, on request" },
    { name:"Speakers", price:80, unit:"event" },
    { name:"Corkage still wine", price:18, unit:"btl" },
    { name:"Corkage sparkling", price:28, unit:"btl" },
    { name:"Corkage champagne", price:40, unit:"btl" }
  ]}
];

/* ---- DELEGATE PACKAGES (from Meeting Packages sheet) ---- */
const PACKAGES = [
  { id:"ddr", name:"Day Delegate Package", per:"pp", from:35, min:10,
    includes:["Main meeting room hire","All-day tea, coffee, biscuits, water","Locally inspired lunch","Pens, pads, flipchart","LCD projector & screen","Complimentary WiFi"] },
  { id:"ddr-light", name:"Day Delegate (Lighter Lunch)", per:"pp", from:29, min:10,
    includes:["Main meeting room hire","All-day tea, coffee, biscuits, water","Sandwich lunch & salad","Pens, pads, flipchart","LCD projector & screen","Complimentary WiFi"] },
  { id:"24hr", name:"24-Hour Delegate Package", per:"pp", from:134, min:10,
    includes:["Everything in Day Delegate","Dinner","Overnight accommodation","Breakfast"] },
  { id:"wedding-classic", name:"Wedding — Classic", per:"pp", from:149, min:50,
    includes:["Private room hire","Arrival drink","White linen napkins & tablecloths","3-course set classic menu","Tea & coffee","Evening buffet"] },
  { id:"wedding-special", name:"Wedding — Special", per:"pp", from:163, min:50,
    includes:["Private room hire","Arrival drink","3-course set menu","½ bottle wine pp","Evening buffet","Tea, coffee & mints"] },
  { id:"celebrate-classic", name:"Celebration Party — Classic", per:"pp", from:40, min:30,
    includes:["Private room hire","2-course sit-down or buffet","White linen","Tea & coffee"] },
  { id:"celebrate-special", name:"Celebration Party — Special", per:"pp", from:53, min:30,
    includes:["Private room hire","Arrival drink","3-course set classic menu","White linen","Tea & coffee"] },
  { id:"xmas-private", name:"Christmas — Private Party", per:"pp", from:68, min:1,
    includes:["Room hire","Arrival drink","3-course menu","DJ","½ bottle wine pp"] }
];

/* ---- CARBON MODEL ----
   ESTIMATE from floor area, occupancy & event type using
   UK hospitality benchmarks. Overwrite room.carbonOverride
   (kg CO2e) in ROOMS above to force a manual figure.       */
function carbonModel(room, eventTypeId, pax) {
  // Benchmarks (indicative, UK hospitality):
  const KWH_PER_M2_DAY = 0.35;        // lighting/HVAC per m² per event-day
  const KG_CO2_PER_KWH = 0.207;       // UK grid factor (BEIS 2024, approx)
  const roomEnergy = room.m2 * KWH_PER_M2_DAY * KG_CO2_PER_KWH;

  // Catering carbon per head varies by event type
  const CATERING = { meeting:2.1, wedding:6.5, "baby-shower":3.0, birthday:3.5,
                     celebration:4.0, funeral:3.0, christmas:6.0 };
  const perHead = CATERING[eventTypeId] ?? 3.0;
  const cateringCarbon = perHead * (pax || 0);

  const total = roomEnergy + cateringCarbon;
  return {
    total: Math.round(total),
    room: Math.round(roomEnergy),
    catering: Math.round(cateringCarbon),
    perHead: perHead
  };
}

/* ============================================================
   PHASE 2 ADDITIONS — images, tech, suppliers, layouts, bot
   ============================================================ */

/* ---- ROOM & GALLERY IMAGES (linked live from hotel site) ----
   These load in a normal browser from the hotel's own server.
   To store locally instead, download and change paths to assets/. */
const IMG = "https://www.brandonhallhotelandspa.com/wp-content/uploads";
const GALLERY = {
  meetings: [
    IMG+"/2025/09/1758893100-1000x667.png",
    IMG+"/2025/09/1758893782-1000x757.png",
    IMG+"/2025/09/1758893922-1000x757.png",
    IMG+"/2025/09/brandon-hall-hotel-spa-warwickshire-brandon-warwickshire-pic-4-1000x750.jpeg",
    IMG+"/2025/09/brandon-hall-hotel-spa-warwickshire-brandon-warwickshire-pic-9-1000x750.jpeg",
    IMG+"/2025/09/brandon-hall-hotel-spa-warwickshire-brandon-warwickshire-pic-5.jpeg"
  ],
  weddings: [
    "assets/weddings/wedding-04.jpg",
    "assets/weddings/wedding-09.jpg",
    "assets/weddings/wedding-13.jpg",
    "assets/weddings/wedding-08.jpg",
    "assets/weddings/wedding-06.jpg"
  ]
};
/* Per-room hero: default to a meetings image; edit to assign specific shots */
function roomImage(room){
  const idx = Math.abs([...room.id].reduce((a,c)=>a+c.charCodeAt(0),0)) % GALLERY.meetings.length;
  return GALLERY.meetings[idx];
}

/* ---- TECH / CONNECTIVITY PER ROOM ----
   REAL DATA from M&E audit (20 Mar 2026). Standard DDR/24hr inclusions
   in every room: screen, HDMI cable, WiFi, pads & pens, flipchart.
   `sellable` and `adminNote` are shown in Admin only. */
const TECH_DEFAULT = {
  screen:"Screen provided", hdmi:true, wirelessShare:false, videoCall:false,
  laptopConnect:true, pa:false, microphones:false, wifi:true, flipchart:true,
  hearingLoop:false, blackout:true, naturalLight:true, notes:"",
  sellable:true, adminNote:""
};
const ROOM_TECH = {
  "brandon-1":{ screen:'98" 4K Smart TV on height-adjustable swivel stand', hdmi:true,
    wirelessShare:true, videoCall:true, notes:'ClickShare, HDMI + USB-C. TV hidden as room doubles for social events.',
    adminNote:'Sell breakout/refreshment area only via Brandon 1 (no separate access).' },
  "brandon-2":{ screen:'98" 4K Smart TV on height-adjustable swivel stand', hdmi:true,
    wirelessShare:true, videoCall:true, notes:'ClickShare, HDMI + USB-C. TV hidden as room doubles for social events.' },
  "brandon-suite":{ screen:'98" 4K Smart TVs (combined)', hdmi:true, wirelessShare:true, videoCall:true, pa:true,
    notes:'ClickShare, HDMI + USB-C across combined suite.' },
  "wolston-suite":{ screen:'75" 4K Smart TV + additional screen on stand', hdmi:true, wirelessShare:true,
    videoCall:true, pa:true, notes:'Long room — second screen so all guests see the presentation. ClickShare, HDMI + USB-C.',
    adminNote:'Partition now removed (was temporary/not soundproof).' },
  "beech":{ screen:'75" 4K Smart TV', hdmi:true, wirelessShare:true, videoCall:true,
    notes:'ClickShare, HDMI + USB-C.', sellable:false,
    adminNote:'NOT READY TO SELL: door needs fixing (attempted break-in, bottom panel broken), ladybird influx to clear, AV & door lock to fix.' },
  "hunt":{ screen:'Wall TV (HDMI compatibility unconfirmed)', hdmi:true, wirelessShare:false, videoCall:false,
    notes:'HDMI + USB-C, flipchart, branded pads & pens.', sellable:false,
    adminNote:'NOT READY TO SELL: damp ceiling; room currently inaccessible.' },
  "warwick":{ screen:'Wall TV (HDMI compatibility unconfirmed)', hdmi:true, wirelessShare:false, videoCall:false,
    notes:'HDMI + USB-C, flipchart, branded pads & pens.', sellable:false,
    adminNote:'NOT READY TO SELL: no corridor lighting; door key not working, room inaccessible.' },
  "johnson":{ adminNote:'AV to be confirmed (audit pending).' },
  "jones":{ adminNote:'AV to be confirmed (audit pending).' },
  "parke":{ adminNote:'AV to be confirmed (audit pending).' },
  "woodlands":{ pa:true, microphones:true, adminNote:'Theatre 28 / conference up to 220. AV to be confirmed.' },
  "woodlands-1":{ pa:true, microphones:true },
  "woodlands-2":{ pa:true, microphones:true }
};
function roomTech(room){ return Object.assign({}, TECH_DEFAULT, ROOM_TECH[room.id]||{}); }

const TECH_FIELDS = [
  ["screen","Screen / display"], ["hdmi","HDMI input"],
  ["wirelessShare","Wireless screen share"], ["videoCall","Video-call capable (Teams/Zoom)"],
  ["laptopConnect","Laptop connection"], ["pa","PA system"],
  ["microphones","Microphones"], ["wifi","Complimentary WiFi"],
  ["flipchart","Flipchart & pens"], ["hearingLoop","Hearing loop"],
  ["blackout","Blackout blinds"], ["naturalLight","Natural light"]
];

/* ---- SUPPLIER FACT SHEETS ---- */
const SUPPLIERS = [
  { id:"sound-kicks", name:"Sound Kicks", category:"DJ / AV / Live Events", featured:true,
    services:["DJ services","PA & sound hire","Live event production","Staging & lighting"],
    pricing:[["DJ (evening)","£385 + VAT"],["Speakers","£80"]],
    contact:{ note:"Book via hotel events team — confirmed on request" },
    compliance:{ pli:true, pat:true }, verified:true,
    blurb:"Preferred DJ and AV supplier for Brandon Hall. Handles DJ sets, PA hire and full live-event production including staging and lighting." },
  { id:"caterer-placeholder", name:"External Caterer (placeholder)", category:"Catering", featured:false,
    services:["To be added"], pricing:[], contact:{ note:"Add supplier details" },
    compliance:{ pli:null, pat:null }, verified:false,
    blurb:"Placeholder. External caterers must provide insurance, food hygiene certificates, PAT testing, food-handler training, menu, alcohol licence, and set-up/clean-up plan (per event FAQs)." },
  { id:"decorator-placeholder", name:"Decorator / Stylist (placeholder)", category:"Décor & Styling", featured:false,
    services:["To be added"], pricing:[], contact:{ note:"Add supplier details" },
    compliance:{ pli:null, pat:null }, verified:false,
    blurb:"Placeholder for chair covers, linen, centrepieces and styling. Note: LED candelabras only — no naked flames. Biodegradable confetti outside only." },
  { id:"entertainment-placeholder", name:"Entertainment (placeholder)", category:"Entertainment", featured:false,
    services:["Bands, performers — to be added"], pricing:[], contact:{ note:"Add supplier details" },
    compliance:{ pli:null, pat:null }, verified:false,
    blurb:"Placeholder for bands and performers (e.g. Oompah band, jazz band, Tread the Boards). External acts need PLI and PAT certificates." },
  { id:"florist-placeholder", name:"Florist (placeholder)", category:"Florals", featured:false,
    services:["To be added"], pricing:[], contact:{ note:"Add supplier details" },
    compliance:{ pli:null, pat:null }, verified:false, blurb:"Placeholder for floral arrangements and installations." }
];

/* ---- EVENTS CONCIERGE — Natalie Freeman, warm & personal ----
   Modelled on real enquiries (arrangeMY BOT, Hitched, website leads). */
const BOT_PERSON = { name:"Natalie Freeman", role:"Events Team, Brandon Hall Hotel and Spa",
  avatar:"NF" };
const BOT_GREETINGS = [
  "Hi there! 👋 I'm Natalie from the events team here at Brandon Hall Hotel and Spa.",
  "Lovely to have you — I'd love to help plan your event with us.",
  "I'll just ask you a few quick things so I can put together exactly the right proposal for you. Shall we make a start?"
];

const BOT_COMMON_START = [
  { key:"eventType", q:"First things first — what kind of occasion are you planning?", type:"choice",
    options:[["wedding","💍 Wedding"],["meeting","📊 Meeting / Conference"],["birthday","🎂 Birthday / Celebration"],
      ["baby-shower","🍼 Baby Shower"],["funeral","🕊️ Celebration of Life"],["christmas","🎄 Christmas / NYE"],["other","Something else"]] }
];
const BOT_FLOWS = {
  meeting: [
    { key:"eventName", q:"Wonderful. Does the meeting have a name or reference? (totally fine to skip)", type:"text", optional:true },
    { key:"date", q:"When are you looking to hold it? A date or rough timeframe is perfect.", type:"text" },
    { key:"days", q:"And how many days will you need?", type:"number" },
    { key:"pax", q:"Roughly how many delegates are you expecting?", type:"number" },
    { key:"layout", q:"How would you like the room set up?", type:"choice",
      options:[["boardroom","Boardroom"],["ushape","U-shape / Horseshoe"],["theatre","Theatre"],["cabaret","Cabaret"],["unsure","Not sure yet — happy for advice"]] },
    { key:"av", q:"What AV will you need? Think screens, laptop connection, video calls (Teams/Zoom), flipcharts — just tell me in your own words.", type:"text" },
    { key:"catering", q:"How about food and drink? Arrival tea/coffee, lunch, dinner…?", type:"text" },
    { key:"accommodation", q:"Will any of your delegates need to stay overnight?", type:"choice", options:[["yes","Yes"],["no","No"],["maybe","Possibly"]] },
    { key:"budget", q:"Do you have a day-delegate rate or budget in mind? No worries if not.", type:"text", optional:true },
    { key:"agent", q:"Last one on the event itself — are you booking for a company or as an agency? (skip if it's just you)", type:"text", optional:true }
  ],
  wedding: [
    { key:"date", q:"How exciting! 🥂 When are you hoping to celebrate? A date or a rough time of year is lovely.", type:"text" },
    { key:"dateFlex", q:"And is that date set in stone, or have you got a bit of flexibility?", type:"choice", options:[["fixed","It's fixed"],["flexible","We're flexible"]] },
    { key:"paxDay", q:"Roughly how many guests are you picturing for the day?", type:"number" },
    { key:"paxEve", q:"And for the evening celebration? (skip if you're not sure yet)", type:"number", optional:true },
    { key:"accommodation", q:"Will you and your guests want to stay with us overnight?", type:"choice", options:[["yes","Yes please"],["no","No"],["maybe","Not sure yet"]] },
    { key:"catering", q:"Any early thoughts on the food — a sit-down meal, a buffet, something else? (no wrong answers!)", type:"text", optional:true },
    { key:"budget", q:"Do you have a budget in mind for the day? It helps me tailor things — but do skip if you'd rather.", type:"text", optional:true },
    { key:"extras", q:"Anything on your wishlist? Drinks reception, a band or DJ, styling and décor…", type:"text", optional:true }
  ],
  social: [
    { key:"date", q:"Lovely! What date are you thinking of?", type:"text" },
    { key:"pax", q:"Roughly how many guests will be joining you?", type:"number" },
    { key:"style", q:"What sort of thing are you imagining? A sit-down meal, a buffet, drinks and canapés…?", type:"text" },
    { key:"accommodation", q:"Will anyone need to stay overnight?", type:"choice", options:[["yes","Yes"],["no","No"],["maybe","Not sure"]] },
    { key:"budget", q:"Any budget in mind? Happy to skip this one.", type:"text", optional:true },
    { key:"extras", q:"Anything special you'd like — a DJ, décor, entertainment?", type:"text", optional:true }
  ]
};
const BOT_CONTACT = [
  { key:"name", q:"That's everything I need about the event — thank you! 😊 Could I take your name?", type:"text" },
  { key:"email", q:"Lovely to meet you, {name}! What's the best email to reach you on?", type:"text" },
  { key:"phone", q:"And a phone number, in case it's easier for me to call?", type:"text" },
  { key:"notes", q:"Anything else you'd like me to know before I pass this to the team?", type:"text", optional:true }
];
function botFlowFor(eventType){
  if(eventType==="meeting") return BOT_FLOWS.meeting;
  if(eventType==="wedding") return BOT_FLOWS.wedding;
  return BOT_FLOWS.social;
}
const BOT_SIGNOFF = "Perfect — I've got everything, {name}. I'm passing this straight to our events team and one of us will be in touch very soon with a tailored proposal. Thank you so much for thinking of Brandon Hall — we'd love to host you. 💙\n\n— Natalie";

/* ---- COMPETITOR BENCHMARKING (from Nicola's comp-set sheet) ----
   Brandon Hall's own rates shown alongside for comparison. */
const COMPETITORS = [
  { name:"Brandon Hall", us:true, ddr:"—", h24:"—", wedding:"£55pp (party)", xmas:"£24.95–£29.95", aftTea:"£22.50 / £30", babyShower:"£24.95–£29.95" },
  { name:"Coombe Abbey", ddr:"£45+VAT", h24:"£165+VAT", wedding:"£115–£150pp", xmas:"£74.95", aftTea:"£37", babyShower:"£38–£41" },
  { name:"Chesford Grange", ddr:"£30 inc", h24:"—", wedding:"£84–£99pp", xmas:"£27–£32", aftTea:"£30 / £35", babyShower:"£30–£42" },
  { name:"Nailcote Hall", ddr:"£30 inc", h24:"£160", wedding:"£40–£90pp + hire", xmas:"£59pp", aftTea:"£28–£34", babyShower:"£28–£34" },
  { name:"Windmill Village", ddr:"£48 inc", h24:"£170–£185", wedding:"from £6,495", xmas:"£70pp", aftTea:"£22.50 / £30", babyShower:"£43" },
  { name:"Village Coventry", ddr:"£35 inc", h24:"on request", wedding:"£3,000–£10,000", xmas:"TBC", aftTea:"£21.50–£30", babyShower:"£21.50–£30" }
];
const COMPSET_NOTE = "Nicola's view: priced right for now given our offering; room to push rates later, but not yet.";

/* ---- CHRISTMAS PACKAGES (amended Aug 2026) — dynamic per-head ---- */
const XMAS_PACKAGES = [
  { id:"joiner", name:"Joiner Party Night", pp:55, min:1, dates:"Fri 4th & 18th Dec",
    lines:[["Room hire",3],["Arrival drink",0],["Novelties & décor",2],["3-course menu",28],["DJ",5],["Oompah Band (min 100)",17]] },
  { id:"private", name:"Private Party Night", pp:45, min:30, dates:"Your date",
    lines:[["Room hire",4],["Arrival drink",8],["3-course menu",28],["DJ",5],["½ bottle wine pp",0]] },
  { id:"xmas-lunch", name:"Christmas Lunch (24 Dec)", pp:80, min:1, dates:"24 Dec",
    lines:[["Festive afternoon tea",30],["Dinner",40],["Table décor/linen/crackers",7],["Jazz band (min 70)",20]] },
  { id:"nye", name:"New Year's Eve Gala", pp:195, min:1, dates:"31 Dec",
    lines:[["Bed & breakfast",40],["Prosecco & canapés",13],["4-course gala dinner",65],["Décor/linen/chair covers",16],
      ["Novelties",5],["Staging",5],["Entertainment (DJ/Band)",35],["Midnight Prosecco",6],["Late licence",5],["NYD brunch",5]] }
];

/* ---- UPDATED DDR / ROOM-HIRE-ONLY (Rates sheet) ---- */
const DDR_RATES = { day:35, dayLight:29, h24:124 };
const ROOM_HIRE_ONLY = { // min–max £ per Rates sheet
  "wolston-1":[100,300], "wolston-2":[100,300], "wolston-3":[200,300],
  "beech":[200,400], "brandon-1":[350,1500], "brandon-2":[350,1500]
};

/* ---- EVENT PROFITABILITY MODEL (from their wedding costing tool) ----
   Revenue − food/bev cost of sales − payroll − controllable − commission = profit.
   Defaults mirror the spreadsheet; all editable in the tool. */
const PROFIT_DEFAULTS = {
  vat: 0.20,
  foodCoS: 0.35,        // food cost of sales
  bevCoS: 0.31,         // beverage cost of sales
  bevSpendPP: 10,       // estimated beverage on-spend per cover (inc VAT)
  // package element split (per cover, inc VAT) — editable
  elements: { food:50, alcohol:23, soft:0, roomHire:5, dj:0, linen:1.5, toastmaster:0, eveBuffet:25, bedroom:2, av:0 },
  // payroll roles: rate £/hr (inc NI & pension), default shifts & hours
  payroll: [
    { role:"Manager",    rate:21.8, staff:1, hours:8 },
    { role:"Supervisor", rate:15,   staff:1, hours:8 },
    { role:"Associate",  rate:13,   staff:2, hours:8 },
    { role:"Chef",       rate:22,   staff:2, hours:8 },
    { role:"Steward",    rate:13,   staff:1, hours:4 }
  ],
  controllable: { equipment:0, linen:120, security:0, other:0 },
  commissionRate: 0
};

/* ---- PROFIT TOOL: EVENT-TYPE TEMPLATES ----
   Load the right price + element split + payroll for each event type,
   so the tool doesn't default to wedding assumptions every time. */
const PROFIT_TEMPLATES = {
  "wedding": { label:"Wedding (Extra Special)", price:106.50, bevSpend:10,
    elements:{ food:50, alcohol:23, soft:0, roomHire:5, dj:0, linen:1.5, toastmaster:0, eveBuffet:25, bedroom:2, av:0 },
    payroll:[{role:"Manager",rate:21.8,staff:1,hours:8},{role:"Supervisor",rate:15,staff:1,hours:8},
      {role:"Associate",rate:13,staff:2,hours:8},{role:"Chef",rate:22,staff:2,hours:8},{role:"Steward",rate:13,staff:1,hours:4}],
    controllable:{ equipment:0, linen:120, security:0, other:0 } },
  "meeting": { label:"Day Delegate Meeting", price:35, bevSpend:0,
    elements:{ food:18, alcohol:0, soft:0, roomHire:10, dj:0, linen:0, toastmaster:0, eveBuffet:0, bedroom:0, av:0 },
    payroll:[{role:"Manager",rate:21.8,staff:1,hours:4},{role:"Associate",rate:13,staff:1,hours:8},
      {role:"Chef",rate:22,staff:1,hours:6},{role:"Steward",rate:13,staff:1,hours:2}],
    controllable:{ equipment:0, linen:0, security:0, other:0 } },
  "24hr": { label:"24hr Delegate", price:124, bevSpend:5,
    elements:{ food:34, alcohol:0, soft:0, roomHire:10, dj:0, linen:0, toastmaster:0, eveBuffet:0, bedroom:90, av:0 },
    payroll:[{role:"Manager",rate:21.8,staff:1,hours:8},{role:"Associate",rate:13,staff:2,hours:8},
      {role:"Chef",rate:22,staff:2,hours:8},{role:"Steward",rate:13,staff:1,hours:4}],
    controllable:{ equipment:0, linen:0, security:0, other:0 } },
  "christmas": { label:"Christmas Party", price:55, bevSpend:8,
    elements:{ food:28, alcohol:0, soft:0, roomHire:4, dj:5, linen:1, toastmaster:0, eveBuffet:0, bedroom:0, av:0 },
    payroll:[{role:"Manager",rate:21.8,staff:1,hours:6},{role:"Supervisor",rate:15,staff:1,hours:6},
      {role:"Associate",rate:13,staff:2,hours:6},{role:"Chef",rate:22,staff:2,hours:6},{role:"Steward",rate:13,staff:1,hours:4}],
    controllable:{ equipment:0, linen:0, security:0, other:0 } },
  "celebration": { label:"Celebration / Party", price:53, bevSpend:8,
    elements:{ food:35, alcohol:0, soft:0, roomHire:5, dj:0, linen:1, toastmaster:0, eveBuffet:0, bedroom:0, av:0 },
    payroll:[{role:"Manager",rate:21.8,staff:1,hours:6},{role:"Associate",rate:13,staff:2,hours:6},
      {role:"Chef",rate:22,staff:1,hours:6},{role:"Steward",rate:13,staff:1,hours:4}],
    controllable:{ equipment:0, linen:0, security:0, other:0 } },
  "funeral": { label:"Wake / Celebration of Life", price:30, bevSpend:5,
    elements:{ food:20, alcohol:0, soft:0, roomHire:5, dj:0, linen:1, toastmaster:0, eveBuffet:0, bedroom:0, av:0 },
    payroll:[{role:"Manager",rate:21.8,staff:1,hours:4},{role:"Associate",rate:13,staff:1,hours:4},
      {role:"Chef",rate:22,staff:1,hours:4}],
    controllable:{ equipment:0, linen:0, security:0, other:0 } }
};
/* map enquiry event ids to a template */
function templateForEvent(evId){
  if(evId==="meeting") return "meeting";
  if(evId==="wedding") return "wedding";
  if(evId==="christmas") return "christmas";
  if(evId==="funeral") return "funeral";
  if(["birthday","baby-shower","celebration"].includes(evId)) return "celebration";
  return "wedding";
}

/* ============================================================
   M&E UPGRADE — equipment tracker per room
   Source: "M&E as of 20 Mar" sheet. Each item has qty, status
   (needed / ordered / delivered / installed) and optional size.
   ============================================================ */
const MNE_STATUSES = ["needed","ordered","delivered","installed"];
const MNE_CATEGORIES = ["Screen","Projector","Connectivity","Software","Furniture","Power","Stationery","Other"];

/* Standard inclusions every meeting room gets (DDR/24hr standard) */
const MNE_STANDARD = ["Screen","HDMI cable","Wi-Fi","Pads & pens","Flipchart pads & pens","Branded notepads"];

/* Per-room equipment lines from the audit. size only where relevant (TV "). */
const MNE_ROOMS = {
  "brandon-1": { readyToSell:true, capacity:"Cabaret — 5 tables x 40 guests", currentAV:"Projector screen",
    comments:"Sell as part of Brandon 1 as breakout/refreshment area — no access except through Brandon 1. TV hidden as room doubles for social gatherings and corporate meetings.",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'98"', qty:1, status:"needed" },
      { cat:"Furniture", item:"Swivel stand, height-adjustable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" }
    ]},
  "brandon-2": { readyToSell:true, capacity:"Cabaret — 4 tables x 24 guests", currentAV:"No equipment",
    comments:"TV hidden as room doubles for social gatherings and corporate meetings.",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'98"', qty:1, status:"needed" },
      { cat:"Furniture", item:"Swivel stand, height-adjustable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" }
    ]},
  "wolston-suite": { readyToSell:true, capacity:"Cabaret 60 (TBC) / Theatre (TBC)", currentAV:"1 x projector screen, no projector",
    comments:"Long room — additional screen needed so guests can see the presentation. TV hidden as room doubles for social gatherings. Partition wall was temporary (not soundproof — could not host 3 different companies); partition now removed (15/9).",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'75"', qty:1, status:"needed" },
      { cat:"Screen", item:"Additional screen on stand (long room)", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" }
    ]},
  "beech": { readyToSell:false, capacity:"12 boardroom", currentAV:"None",
    comments:"NOT READY: door needs fixing (looks like attempted break-in — bottom panel broken), influx of ladybirds to clear, AV equipment and door lock to fix prior to selling.",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'75"', qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" },
      { cat:"Other", item:"Door repair & lock", qty:1, status:"needed" },
      { cat:"Other", item:"Ladybird clearance", qty:1, status:"needed" }
    ]},
  "hunt": { readyToSell:false, capacity:"14 boardroom", currentAV:"TV on wall (unsure if works / HDMI compatible)",
    comments:"NOT READY: damp ceiling and cannot access the room currently. Images to follow when room accessible.",
    items:[
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Stationery", item:"Flipchart, pads & pens, branded notepads", qty:1, status:"needed" },
      { cat:"Other", item:"Damp ceiling repair", qty:1, status:"needed" }
    ]},
  "warwick": { readyToSell:false, capacity:"10 boardroom", currentAV:"TV on wall (unsure if works / HDMI compatible)",
    comments:"NOT READY: no lights along the corridor (needs rectifying); key not working so cannot enter the room. Images to follow when room accessible.",
    items:[
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Stationery", item:"Flipchart, pads & pens, branded notepads", qty:1, status:"needed" },
      { cat:"Power", item:"Corridor lighting", qty:1, status:"needed" },
      { cat:"Other", item:"Door key/lock repair", qty:1, status:"needed" }
    ]},
  "johnson": { readyToSell:null, capacity:"10 boardroom", currentAV:"To confirm",
    comments:"AV to be audited on access. Standard kit specified below.",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'65"', qty:1, status:"needed" },
      { cat:"Furniture", item:"Swivel stand, height-adjustable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" },
      { cat:"Stationery", item:"Flipchart, pads & pens, branded notepads", qty:1, status:"needed" }
    ]},
  "jones": { readyToSell:null, capacity:"14 boardroom", currentAV:"To confirm",
    comments:"AV to be audited on access. Standard kit specified below.",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'75"', qty:1, status:"needed" },
      { cat:"Furniture", item:"Swivel stand, height-adjustable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" },
      { cat:"Stationery", item:"Flipchart, pads & pens, branded notepads", qty:1, status:"needed" }
    ]},
  "parke": { readyToSell:null, capacity:"17 boardroom", currentAV:"To confirm",
    comments:"AV to be audited on access. Standard kit specified below.",
    items:[
      { cat:"Screen", item:"4K Smart TV", size:'75"', qty:1, status:"needed" },
      { cat:"Furniture", item:"Swivel stand, height-adjustable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable", qty:1, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:1, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" },
      { cat:"Stationery", item:"Flipchart, pads & pens, branded notepads", qty:1, status:"needed" }
    ]},
  "woodlands": { readyToSell:null, capacity:"28 theatre / 220 conference", currentAV:"To confirm",
    comments:"Largest space (up to 220 conference). Requires dual large-format screens or projector + screen so all guests can see. AV to be audited; standard large-room kit specified below.",
    items:[
      { cat:"Screen", item:"4K Smart TV (large format)", size:'98"', qty:2, status:"needed" },
      { cat:"Furniture", item:"Mobile floor stand for screens", qty:2, status:"needed" },
      { cat:"Projector", item:"Full-HD/4K projector (conference mode)", qty:1, status:"needed" },
      { cat:"Screen", item:"Projector screen (large, on stand)", qty:1, status:"needed" },
      { cat:"Connectivity", item:"HDMI cable (long-run)", qty:2, status:"needed" },
      { cat:"Connectivity", item:"USB-C connectors", qty:2, status:"needed" },
      { cat:"Software", item:"ClickShare", qty:1, status:"needed" },
      { cat:"Power", item:"PA / sound system (large room)", qty:1, status:"needed" },
      { cat:"Other", item:"Wireless microphones (handheld + lapel)", qty:2, status:"needed" },
      { cat:"Stationery", item:"Flipchart, pads & pens, branded notepads", qty:1, status:"needed" }
    ]}
};

/* ============================================================
   EVENT FUNCTIONS & TEMPLATES (Guestline-style)
   A quote line can be a "function" — a sub-part of the event
   (meeting, lunch, refreshment break, dinner, reception).
   Templates auto-populate a set of functions.
   ============================================================ */
const FUNCTION_TYPES = [
  { id:"meeting",    label:"Meeting / Session", icon:"📊" },
  { id:"refresh",    label:"Refreshment Break", icon:"☕" },
  { id:"lunch",      label:"Lunch",             icon:"🍽️" },
  { id:"dinner",     label:"Dinner",            icon:"🍷" },
  { id:"reception",  label:"Drinks Reception",  icon:"🥂" },
  { id:"ceremony",   label:"Ceremony",          icon:"💍" },
  { id:"breakfast",  label:"Breakfast",         icon:"🥐" },
  { id:"other",      label:"Other",             icon:"•" }
];

/* Event templates — auto-populate quote lines/functions.
   Each function: type, label, time, layout, hire, pkg, addons[] */
const EVENT_TEMPLATES = {
  "ddr-conference": { label:"Day Conference (DDR)", event:"meeting",
    functions:[
      { type:"meeting", label:"Main conference", time:"09:00", layout:"theatre", hire:"full", pkg:"ddr" },
      { type:"refresh", label:"Morning refreshments", time:"11:00", layout:"reception", hire:"none", pkg:"" },
      { type:"lunch", label:"Lunch", time:"13:00", layout:"cabaret", hire:"none", pkg:"" },
      { type:"refresh", label:"Afternoon refreshments", time:"15:00", layout:"reception", hire:"none", pkg:"" }
    ]},
  "conference-syndicate": { label:"Conference with Syndicate", event:"meeting",
    functions:[
      { type:"meeting", label:"Main plenary", time:"09:00", layout:"theatre", hire:"full", pkg:"ddr" },
      { type:"meeting", label:"Syndicate room 1", time:"10:30", layout:"boardroom", hire:"full", pkg:"" },
      { type:"meeting", label:"Syndicate room 2", time:"10:30", layout:"boardroom", hire:"full", pkg:"" },
      { type:"lunch", label:"Lunch", time:"13:00", layout:"cabaret", hire:"none", pkg:"" }
    ]},
  "wedding-full": { label:"Wedding — Full Day", event:"wedding",
    functions:[
      { type:"ceremony", label:"Ceremony", time:"13:00", layout:"theatre", hire:"half", pkg:"" },
      { type:"reception", label:"Drinks reception", time:"14:00", layout:"reception", hire:"none", pkg:"" },
      { type:"dinner", label:"Wedding breakfast", time:"15:30", layout:"cabaret", hire:"none", pkg:"wedding-classic" },
      { type:"reception", label:"Evening reception", time:"19:30", layout:"reception", hire:"none", pkg:"" }
    ]},
  "party-night": { label:"Private Party Night", event:"celebration",
    functions:[
      { type:"reception", label:"Arrival drinks", time:"19:00", layout:"reception", hire:"half", pkg:"" },
      { type:"dinner", label:"Dinner", time:"19:30", layout:"cabaret", hire:"none", pkg:"celebrate-classic" },
      { type:"reception", label:"Evening / DJ", time:"21:30", layout:"reception", hire:"none", pkg:"" }
    ]},
  "24hr": { label:"24hr Residential", event:"meeting",
    functions:[
      { type:"meeting", label:"Day 1 meeting", time:"09:00", layout:"boardroom", hire:"full", pkg:"24hr" },
      { type:"lunch", label:"Day 1 lunch", time:"13:00", layout:"cabaret", hire:"none", pkg:"" },
      { type:"dinner", label:"Dinner", time:"19:00", layout:"cabaret", hire:"none", pkg:"" },
      { type:"breakfast", label:"Breakfast", time:"08:00", layout:"cabaret", hire:"none", pkg:"" },
      { type:"meeting", label:"Day 2 meeting", time:"09:00", layout:"boardroom", hire:"full", pkg:"" }
    ]}
};

/* ============================================================
   TRANSCRIPT-INSPIRED SALES ADDITIONS
   ============================================================ */

/* Lost reasons for cancelled/lost enquiries (Guestline conversion tracking) */
const LOST_REASONS = ["Price / budget","Date unavailable","Went to competitor","No response",
  "Capacity / space","Changed plans","Duplicate enquiry","Other"];

/* Checklist templates per event type — auto-generate task reminders with
   offsets relative to the event date (days before, negative = after). */
const CHECKLIST_TEMPLATES = {
  wedding: [
    { task:"Initial follow-up call", offset:-2, fromBooking:true },
    { task:"Send proposal / brochure", offset:-5, fromBooking:true },
    { task:"Provisional hold / viewing offered", offset:-10, fromBooking:true },
    { task:"Deposit due", offset:60 },
    { task:"Menu tasting", offset:90 },
    { task:"Final numbers & rooming list", offset:14 },
    { task:"Dietary requirements", offset:14 },
    { task:"Final balance due", offset:7 },
    { task:"12-month anniversary card", offset:-365 }
  ],
  meeting: [
    { task:"Initial follow-up", offset:-1, fromBooking:true },
    { task:"Send proposal", offset:-3, fromBooking:true },
    { task:"Confirm AV & layout", offset:14 },
    { task:"Final delegate numbers", offset:5 },
    { task:"Rooming list (if residential)", offset:7 },
    { task:"Dietary requirements", offset:5 },
    { task:"Final balance / PO", offset:3 }
  ],
  celebration: [
    { task:"Initial follow-up", offset:-2, fromBooking:true },
    { task:"Send proposal", offset:-4, fromBooking:true },
    { task:"Deposit due", offset:30 },
    { task:"Final numbers", offset:10 },
    { task:"Dietary requirements", offset:10 },
    { task:"Final balance due", offset:7 }
  ],
  default: [
    { task:"Initial follow-up", offset:-2, fromBooking:true },
    { task:"Send proposal", offset:-4, fromBooking:true },
    { task:"Final numbers", offset:7 },
    { task:"Final balance due", offset:3 }
  ]
};
function checklistFor(eventId){
  if(eventId==="wedding") return CHECKLIST_TEMPLATES.wedding;
  if(eventId==="meeting") return CHECKLIST_TEMPLATES.meeting;
  if(["celebration","birthday","baby-shower","christmas","funeral"].includes(eventId)) return CHECKLIST_TEMPLATES.celebration;
  return CHECKLIST_TEMPLATES.default;
}

/* Menu items selectable per function (for kitchen sheet) */
const MENU_ITEMS = {
  Starters: ["Soup of the day","Chicken liver parfait","Smoked salmon","Beetroot & goat's cheese salad",
    "Prawn cocktail","Melon & Parma ham","Wild mushroom bruschetta"],
  Mains: ["Roast beef & Yorkshire","Chicken supreme","Pan-fried salmon","Slow-braised lamb",
    "Butternut squash risotto (v)","Wild mushroom Wellington (v)","Sea bass fillet"],
  Desserts: ["Sticky toffee pudding","Lemon tart","Chocolate brownie","Cheesecake","Fruit crumble","Cheese board"],
  Buffet: ["Sandwich selection","Hot fork buffet","Cold fork buffet","BBQ selection","Finger buffet","Grazing table"],
  Canapes: ["Mini fish & chips","Smoked salmon blini","Bruschetta","Chicken skewers","Vegetable spring rolls"],
  Refreshments: ["Tea & coffee","Tea, coffee & biscuits","Tea, coffee & pastries","Bacon rolls","Fruit platter"]
};

/* ============================================================
   MARKETING CONTENT LIBRARY
   8 sections. Baked-in assets from OneDrive; uploads add to
   Firebase Storage (see firebase-store.js MktStore).
   ============================================================ */
const MKT_SECTIONS = [
  { id:"logos",       label:"Logos",            icon:"🎨", desc:"Brand marks in every format & colour" },
  { id:"guidelines",  label:"Brand Guidelines", icon:"📘", desc:"How to use the brand" },
  { id:"posters",     label:"Posters & Flyers", icon:"🖼️", desc:"Print & display artwork" },
  { id:"ratecards",   label:"Rate Cards",       icon:"💷", desc:"Agent & trade rate sheets" },
  { id:"photography", label:"Photography",      icon:"📷", desc:"Hotel & event photography" },
  { id:"videos",      label:"Videos",           icon:"🎬", desc:"Promo & venue films" },
  { id:"templates",   label:"Templates",        icon:"📄", desc:"Editable templates & docs" },
  { id:"social",      label:"Social",           icon:"📱", desc:"Social media assets & copy" }
];

/* Baked-in assets. type: image | pdf | svg | video | link.
   thumb optional (falls back to file for images). */
const MKT_ASSETS = {
  logos: [
    { name:"Primary Logo", type:"image", file:"assets/marketing/logos/logo-primary.png" },
    { name:"Blue Logo", type:"image", file:"assets/marketing/logos/logo-blue.png" },
    { name:"Blue — Transparent", type:"image", file:"assets/marketing/logos/logo-blue-transparent.png", dark:true },
    { name:"Gold — Transparent", type:"image", file:"assets/marketing/logos/logo-gold-transparent.png", dark:true },
    { name:"White — Transparent", type:"image", file:"assets/marketing/logos/logo-white-transparent.png", dark:true },
    { name:"Vector Logo (SVG)", type:"svg", file:"assets/marketing/logos/logo-vector.svg" },
    { name:"Vector Blue (SVG)", type:"svg", file:"assets/marketing/logos/logo-vector-blue.svg" },
    { name:"Vector White (SVG)", type:"svg", file:"assets/marketing/logos/logo-vector-white.svg", dark:true }
  ],
  guidelines: [
    { name:"Brand Guidelines", type:"pdf", file:"assets/marketing/guidelines/brand-guidelines.pdf",
      thumb:"assets/marketing/thumbs/brand-guidelines.png" }
  ],
  posters: [
    { name:"Spa Poster — Drinks", type:"image", file:"assets/marketing/posters/spa-poster-drinks.png" },
    { name:"Match Day Accommodation", type:"pdf", file:"assets/marketing/posters/match-day-accommodation.pdf",
      thumb:"assets/marketing/thumbs/match-day-accommodation.png" },
    { name:"TripAdvisor Poster", type:"pdf", file:"assets/marketing/posters/tripadvisor-poster.pdf",
      thumb:"assets/marketing/thumbs/tripadvisor-poster.png" },
    { name:"Business Cards", type:"pdf", file:"assets/marketing/posters/business-cards.pdf",
      thumb:"assets/marketing/thumbs/business-cards.png" }
  ],
  ratecards: [
    { name:"50% Agent/Booker Rates", type:"pdf", file:"assets/marketing/ratecards/agent-rates-50.pdf",
      thumb:"assets/marketing/thumbs/agent-rates-50.png" }
  ],
  photography: [
    { name:"Hotel — Exterior at Dusk", type:"image", file:"assets/hotel/exterior-dusk.png" },
    { name:"Hotel — Front & Lawn", type:"image", file:"assets/hotel/exterior-lawn.png" },
    { name:"Hotel — Entrance", type:"image", file:"assets/hotel/exterior-front.png" },
    { name:"Bedroom — Feature Wall", type:"image", file:"assets/hotel/bedroom-teal.png" },
    { name:"Bedroom — Classic", type:"image", file:"assets/hotel/bedroom-yellow.png" },
    { name:"Suite — Bay Window", type:"image", file:"assets/hotel/suite-bay.png" },
    { name:"Leisure — Swimming Pool", type:"image", file:"assets/hotel/pool.png" },
    { name:"Bar & Lounge", type:"image", file:"assets/hotel/bar-lounge.png" },
    { name:"Restaurant", type:"image", file:"assets/hotel/restaurant.png" },
    { name:"Garden Terrace", type:"image", file:"assets/hotel/terrace.png" },
    { name:"Reception", type:"image", file:"assets/hotel/reception.png" },
    { name:"Wedding — Ceremony", type:"image", file:"assets/weddings/wedding-06.jpg" },
    { name:"Wedding — Styling", type:"image", file:"assets/weddings/wedding-08.jpg" },
    { name:"Wedding — Woodlands Suite", type:"image", file:"assets/weddings/wedding-21.jpg" },
    { name:"Wedding — Gardens", type:"image", file:"assets/weddings/wedding-14.jpg" },
    { name:"Wedding — Table Settings", type:"image", file:"assets/weddings/wedding-07.jpg" },
    { name:"Wedding — Bar & Lounge", type:"image", file:"assets/weddings/wedding-22.jpg" }
  ],
  videos: [],
  templates: [
    { name:"Wedding Presentation (glossy slideshow)", type:"link", file:"assets/marketing/wedding-presentation.html",
      thumb:"assets/marketing/thumbs/wedding-presentation.jpg" }
  ],
  social: []
};

/* ============================================================
   DINING & BARS — restaurant/bar areas with seating plans
   Restaurant plan from Brandon Hall Restaurant Floorplan PDF.
   Tables: n=number, seats, shape (square/long/round), x/y grid pos.
   ============================================================ */
const DINING_AREAS = [
  {
    id:"restaurant", name:"The Restaurant", covers:94,
    desc:"Main hotel restaurant serving breakfast, lunch and dinner. 23 tables seating 94 covers, with buffet stations and a service counter.",
    features:["Breakfast buffet","À la carte dinner","Private dining options","Garden views"],
    key:[["square","Square · 4 seats"],["long","Long · 6 seats (3 per side)"],["round","Round · 4 seats"]],
    // grid layout approximating the PDF (col,row on a 6-wide grid)
    tables:[
      {n:"201",seats:4,shape:"square",c:0,r:0},{n:"202",seats:4,shape:"square",c:1,r:0},
      {n:"203",seats:4,shape:"square",c:2,r:0},{n:"204",seats:4,shape:"square",c:0,r:1,buffet:true},
      {n:"205",seats:4,shape:"square",c:1,r:1,buffet:true},{n:"206",seats:4,shape:"square",c:2,r:1},
      {n:"207",seats:4,shape:"square",c:0,r:2},{n:"208",seats:4,shape:"square",c:1,r:2},
      {n:"209",seats:4,shape:"square",c:2,r:2},{n:"210",seats:4,shape:"square",c:0,r:3},
      {n:"211",seats:6,shape:"long",c:1,r:3},{n:"212",seats:4,shape:"square",c:3,r:0},
      {n:"213",seats:6,shape:"long",c:4,r:0},{n:"214",seats:4,shape:"square",c:5,r:0},
      {n:"215",seats:4,shape:"square",c:3,r:1},{n:"216",seats:4,shape:"square",c:4,r:1},
      {n:"217",seats:6,shape:"long",c:5,r:1},{n:"218",seats:4,shape:"square",c:3,r:2},
      {n:"219",seats:4,shape:"square",c:4,r:2},{n:"220",seats:4,shape:"square",c:5,r:2},
      {n:"221",seats:4,shape:"square",c:3,r:3},{n:"222",seats:4,shape:"square",c:4,r:3},
      {n:"223",seats:4,shape:"square",c:5,r:3}
    ]
  },
  {
    id:"bar", name:"The Bar & Lounge", covers:60,
    desc:"Relaxed bar and lounge for drinks, light bites and pre-dinner receptions. Flexible lounge seating.",
    features:["Full bar service","Cocktails","Lounge seating","Pre-dinner receptions"],
    key:[], tables:[]
  },
  {
    id:"terrace", name:"Garden Terrace", covers:40,
    desc:"Outdoor terrace overlooking the landscaped gardens — ideal for summer drinks receptions and al fresco dining.",
    features:["Al fresco dining","Drinks receptions","Garden views","Seasonal"],
    key:[], tables:[]
  }
];

/* ---- WEDDING PROPOSAL CONTENT (from Natalie's real responses) ---- */
const WEDDING_CONTENT = {
  intro:"Congratulations on your engagement! What an exciting time it is to plan your wedding celebration. We would love to help you plan and host your special day here at Brandon Hall Hotel & Spa.",
  suite:"Our beautiful Brandon Suite caters for up to 50 guests in the day and a further 75 in the evening. Conveniently located in the main hotel with stunning views over the landscaped gardens — perfect for such a special occasion.",
  reasons:[
    { t:"Exclusive feel, without the exclusive price tag", d:"A stunning country-house setting that feels exclusively yours, at a price that works for you." },
    { t:"Everyone under one roof", d:"Beautiful accommodation means friends and family can stay together — making the celebrations last well into the early hours. And the happy couple can relax in one of our bedroom suites." },
    { t:"Bespoke packages", d:"Be as selective or as extravagant as you like — every wedding is tailored to you." },
    { t:"Ceremony, day & evening", d:"Host your ceremony, wedding breakfast and evening party all in one place." }
  ],
  closing:"We'd love to welcome you to one of our Wedding Showcase open days. Shall I put your date on hold while you decide?",
  contact:"Natalie Freeman · Event Executive · 024 7710 2555 ext 2003 · natalie.freeman@brandonhallhotelandspa.com"
};

/* ============================================================
   CORPORATE RATE PLANNER
   Patrik pastes the weekly Guestline arrival list; we parse it,
   aggregate by company, and flag corporate-rate candidates.
   Goal (Nicola): shift OTA bookings → direct corporate rates.
   ============================================================ */
const CORP_THRESHOLD = 150; // room-nights p.a. to warrant a corporate rate

/* OTA / commissionable rate-code fragments (customise as needed) */
const OTA_MARKERS = ["BOOKING","BCOM","EXPEDIA","EXP","OTA","HOTELS.COM","HCOM","AGODA","LASTMIN","LMIN","THIRD","WHOLESALE","WHL"];
function isOTARate(rateCode){
  const c=(rateCode||"").toUpperCase();
  return OTA_MARKERS.some(m=>c.includes(m));
}

/* ============================================================
   BROCHURE BUILDER — flexible rate-sheet brochures
   Starter templates from real Brandon Hall rates.
   ============================================================ */
const BROCHURE_IMAGES = [
  { id:"exterior-dusk", label:"Exterior at dusk", file:"assets/hotel/exterior-dusk.png" },
  { id:"exterior-lawn", label:"Front & lawn",     file:"assets/hotel/exterior-lawn.png" },
  { id:"exterior",      label:"Entrance",         file:"assets/hotel/exterior-front.png" },
  { id:"pool",          label:"Swimming pool",    file:"assets/hotel/pool.png" },
  { id:"bar",           label:"Bar & lounge",     file:"assets/hotel/bar-lounge.png" },
  { id:"restaurant",    label:"Restaurant",       file:"assets/hotel/restaurant.png" },
  { id:"terrace",       label:"Garden terrace",   file:"assets/hotel/terrace.png" },
  { id:"bedroom",       label:"Bedroom",          file:"assets/hotel/bedroom-teal.png" },
  { id:"suite",         label:"Suite",            file:"assets/hotel/suite-bay.png" },
  { id:"reception",     label:"Reception",        file:"assets/hotel/reception.png" },
  { id:"gardens",       label:"Gardens",          file:"assets/weddings/wedding-14.jpg" },
  { id:"wedding-suite", label:"Woodlands (dressed)", file:"assets/weddings/wedding-21.jpg" },
  { id:"ceremony",      label:"Ceremony",         file:"assets/weddings/wedding-06.jpg" },
  { id:"dining",        label:"Table settings",   file:"assets/weddings/wedding-07.jpg" }
];

const BROCHURE_TEMPLATES = {
  meetings: {
    title:"Meetings & Events", subtitle:"Where history feels like home",
    intro:"Brandon Hall Hotel & Spa offers the perfect balance of professionalism, comfort and memorable surroundings — making it an exceptional choice for meetings and events of all kinds. Set within beautiful landscaped grounds, the venue provides a calm and inspiring environment that encourages productivity, creativity and connection.\n\nWith a range of flexible event spaces, Brandon Hall can accommodate everything from small boardroom meetings to large conferences, celebrations and corporate gatherings. Guests benefit from on-site accommodation, allowing multi-day events to flow seamlessly, while the spa and leisure facilities enhance any event.",
    heroImg:"exterior", images:["meeting-1","meeting-2","gardens"],
    rates:[
      { name:"Midweek Day Delegate", price:"From £35.00", inc:"Meeting room hire, unlimited tea, coffee & water, 2 servings of sweet & savoury items (mid-morning & mid-afternoon), hot & cold lunch options, plasma screen, HDMI cable, flipchart with pads & pens, complimentary WiFi, complimentary car parking" },
      { name:"Weekend Day Delegate", price:"From £30.00", inc:"As Midweek Day Delegate — meeting room hire, unlimited tea, coffee & water, 2 servings mid-morning & mid-afternoon, hot & cold lunch, plasma screen, HDMI cable, flipchart, WiFi, car parking" },
      { name:"24-Hour Delegate", price:"From £155.00", inc:"Everything in the Day Delegate package, plus dinner, 1 night's accommodation and breakfast" }
    ],
    cta:"To arrange a viewing or discuss your event, contact our events team.",
    ratesNote:"All rates include VAT. Rates are 'from' and subject to availability and final numbers."
  },
  weddings: {
    title:"Weddings & Celebrations", subtitle:"Celebrate in countryside style",
    intro:"Congratulations on your engagement! Set in 17 acres of Warwickshire grounds and gardens, Brandon Hall Hotel & Spa is the perfect setting to say \"I do.\" Elegant spaces, warm and welcoming service, and beautiful surroundings — every celebration personal, cared for, and truly yours.\n\nOur beautiful Brandon Suite caters for up to 50 guests in the day and a further 75 in the evening, while the Woodlands Suite hosts up to 280. An exclusive feel, without the exclusive price tag — with everyone under one roof.",
    heroImg:"ceremony", images:["wedding-suite","dining","gardens"],
    rates:[
      { name:"The Essentials", price:"On request", inc:"Dedicated wedding planner, ceremony & reception rooms, wedding breakfast, room hire & setup" },
      { name:"All-Inclusive", price:"On request", inc:"A complete package — drinks reception, three-course dinner, evening reception" },
      { name:"Tailored", price:"On request", inc:"Designed entirely around you — flexible spaces & menus, add the details you choose" }
    ],
    cta:"We'd love to welcome you to a Wedding Showcase open day. Shall we put your date on hold?",
    ratesNote:"Every wedding is unique — speak to our team to shape a package that's right for you."
  },
  christmas: {
    title:"Christmas & New Year", subtitle:"Celebrate the season with us",
    intro:"Make this Christmas one to remember at Brandon Hall Hotel & Spa. From shared party nights to private celebrations and our New Year's Eve gala, we have something for every festive occasion — all in a beautiful country-house setting.",
    heroImg:"gardens", images:["wedding-suite","dining","bar"],
    rates:[
      { name:"Joiner Party Night", price:"From £55.00pp", inc:"Room hire, arrival drink, novelties & décor, 3-course menu, DJ (Oompah band on selected dates)" },
      { name:"Private Party Night", price:"From £45.00pp", inc:"Room hire, arrival drink, 3-course menu, DJ, ½ bottle of wine per person" },
      { name:"New Year's Eve Gala", price:"From £195.00pp", inc:"Bed & breakfast, prosecco & canapés, 4-course gala dinner, entertainment, midnight prosecco, NYD brunch" }
    ],
    cta:"Book early — festive dates fill quickly. Contact our events team to reserve.",
    ratesNote:"All rates include VAT. Minimum numbers apply to private events."
  },
  corporate: {
    title:"Corporate Rates", subtitle:"Direct rates for business guests",
    intro:"Brandon Hall Hotel & Spa offers preferential corporate rates for regular business guests. Enjoy comfortable en-suite accommodation, on-site dining, complimentary parking and WiFi, and easy access to Coventry and the motorway network — all with the convenience of booking direct.",
    heroImg:"exterior", images:["bar","spa","gardens"],
    rates:[
      { name:"Corporate Bed & Breakfast", price:"On request", inc:"En-suite room, full breakfast, complimentary WiFi & parking, preferential direct rate" },
      { name:"Corporate Dinner, Bed & Breakfast", price:"On request", inc:"En-suite room, dinner, full breakfast, WiFi & parking" },
      { name:"Long-Stay / Volume", price:"On request", inc:"Negotiated rate for 150+ room nights per year — contact us to set up an account" }
    ],
    cta:"Set up a corporate account — contact our sales team to discuss your requirements.",
    ratesNote:"Corporate rates are agreed on application and subject to a minimum annual room-night commitment."
  }
};

/* ============================================================
   HOSPRO — modules (sidebar + welcome cards) + role access
   ============================================================ */
const FLOW_MODULES = [
  { id:"events",    name:"EventsPRO",    caption:"Plan. Organise. Deliver.",       icon:"📅", colour:"#4a9d7f", tint:"#e6f3ee", tabs:["chat","dining"] },
  { id:"room",      name:"RoomPRO",      caption:"Keep operations in flow.",       icon:"🛏️", colour:"#4a86c7", tint:"#e6eff8", tabs:["rooms","packages"] },
  { id:"sales",     name:"SalesPRO",     caption:"Leads. Proposals. Growth.",      icon:"📊", colour:"#8b5c8f", tint:"#f1e9f2", tabs:["pipeline","profit","contracts","payments"] },
  { id:"corp",      name:"StayCORP",      caption:"Corporate guests & rates.",       icon:"🏢", colour:"#2f6f9e", tint:"#e6eef5", tabs:["precheckin","corpdb","corprates","feedback"] },
  { id:"marketing", name:"MarketingPRO", caption:"Create. Campaign. Convert.",     icon:"📣", colour:"#c85c6b", tint:"#f8e9eb", tabs:["marketing","social"] },
  { id:"task",      name:"TaskPRO",      caption:"Tasks. Teams. Accountability.",  icon:"✅", colour:"#d4a24a", tint:"#faf1e0", tabs:["tasks"] },
  { id:"asset",     name:"AssetPRO",     caption:"Maintain. Track. Extend.",       icon:"🔧", colour:"#3fa8a0", tint:"#e3f3f1", tabs:["mne","suppliers"] },
  { id:"content",   name:"ContentPRO",   caption:"Brochures. Menus. Collateral.",  icon:"📄", colour:"#5a8fc7", tint:"#e8f0f8", tabs:["quote","brochure","menu"] },
  { id:"insight",   name:"InsightPRO",   caption:"See more. Do more.",             icon:"📈", colour:"#5fa563", tint:"#e8f3e8", tabs:["insight","admin"] }
];

/* Tab metadata (label + icon) for sidebar links and cards */
const TAB_META = {
  home:{label:"Home",icon:"🏠"},
  rooms:{label:"Meeting Rooms",icon:"🚪"}, dining:{label:"Dining & Bars",icon:"🍽️"},
  pipeline:{label:"Sales Pipeline",icon:"📊"},
  packages:{label:"Packages",icon:"📦"}, suppliers:{label:"Suppliers",icon:"🤝"},
  quote:{label:"Create Quote",icon:"🧾"}, profit:{label:"Profit Tool",icon:"💰"},
  contracts:{label:"Agreements",icon:"📝"},
  payments:{label:"Payments",icon:"💷"},
  chat:{label:"Events Chat",icon:"💬"}, mne:{label:"M&E Upgrade",icon:"🖥️"},
  marketing:{label:"Marketing Library",icon:"🖼️"}, menu:{label:"Menu Builder",icon:"📝"},
  brochure:{label:"Brochure Builder",icon:"📕"}, social:{label:"Social Studio",icon:"📱"},
  tasks:{label:"Tasks",icon:"✅"}, insight:{label:"Insights",icon:"📈"},
  precheckin:{label:"Pre Check-in Setup",icon:"📋"}, corpdb:{label:"Corporate Database",icon:"🏢"},
  corprates:{label:"Corporate Rates",icon:"💷"},
  feedback:{label:"Guest Feedback & QR",icon:"⭐"},
  admin:{label:"Admin",icon:"⚙️"}
};

/* Which module a tab belongs to (for sidebar grouping / highlighting) */
function moduleForTab(tab){ return FLOW_MODULES.find(m=>m.tabs.includes(tab)); }

/* Role-based access. "all" or an array of module ids. */
const ROLE_ACCESS = {
  "ajay.kawa":"all", "raj.kumar":"all", "alia.taub":"all", "nicola.cartwright":"all"
};
function userModules(userKey){
  const acc=ROLE_ACCESS[userKey]||"all";
  if(acc==="all") return FLOW_MODULES;
  return FLOW_MODULES.filter(m=>acc.includes(m.id));
}

/* ============================================================
   STAYCORP — pre-check-in form + corporate guest database
   ============================================================ */
const PRECHECKIN_FIELDS = [
  { key:"name",      label:"Full name",            type:"text",  req:true },
  { key:"company",   label:"Company",              type:"text",  req:false },
  { key:"email",     label:"Email",                type:"email", req:true },
  { key:"phone",     label:"Phone",                type:"tel",   req:false },
  { key:"checkin",   label:"Check-in date",        type:"date",  req:true },
  { key:"checkout",  label:"Check-out date",       type:"date",  req:false },
  { key:"arrival",   label:"Estimated arrival time", type:"time", req:false },
  { key:"carReg",    label:"Car registration",     type:"text",  req:false },
  { key:"roomReq",   label:"Room requests / preferences", type:"textarea", req:false, ph:"e.g. quiet room, high floor, twin beds, accessible" },
  { key:"dinner",    label:"Dinner reservation?",  type:"select", opts:["No","Yes"], req:false },
  { key:"dinnerTime",label:"Dinner time",          type:"time",  req:false, showIf:"dinner=Yes" },
  { key:"dinnerCovers",label:"Number of covers",   type:"number",req:false, showIf:"dinner=Yes" },
  { key:"dietary",   label:"Dietary requirements / allergies", type:"text", req:false, ph:"e.g. vegetarian, nut allergy" },
  { key:"occasion",  label:"Special occasion?",    type:"text",  req:false, ph:"e.g. birthday, anniversary" },
  { key:"newsletter",label:"Keep me updated with offers", type:"select", opts:["No","Yes"], req:false }
];

/* ============================================================
   BAR EVENTS CALENDAR — major sporting/TV events a hotel bar
   fills up for. Oct 2026 – Mar 2027. Curated; refresh as fixtures
   and TV selections firm up. impact: high/med.
   ============================================================ */
const BAR_EVENTS = [
  // OCTOBER 2026
  { date:"2026-10-11", sport:"⚽", name:"Liverpool v Man City", detail:"Premier League — marquee fixture", impact:"high" },
  { date:"2026-10-18", sport:"🏉", name:"Autumn Rugby Internationals begin", detail:"England Autumn Nations Series", impact:"high" },
  { date:"2026-10-24", sport:"⚽", name:"Chelsea v Tottenham", detail:"Premier League — London derby", impact:"med" },
  { date:"2026-10-25", sport:"🏎️", name:"F1 — Mexico City GP", detail:"Formula 1", impact:"med" },
  { date:"2026-10-31", sport:"⚽", name:"Chelsea v Man United", detail:"Premier League — big six clash", impact:"high" },
  // NOVEMBER 2026
  { date:"2026-11-01", sport:"⚽", name:"Liverpool v Arsenal", detail:"Premier League — title six-pointer", impact:"high" },
  { date:"2026-11-07", sport:"🏉", name:"England v Australia (Autumn)", detail:"Rugby — Twickenham", impact:"high" },
  { date:"2026-11-08", sport:"⚽", name:"Man United v Aston Villa", detail:"Premier League", impact:"med" },
  { date:"2026-11-14", sport:"🏉", name:"England v New Zealand (Autumn)", detail:"Rugby — All Blacks", impact:"high" },
  { date:"2026-11-21", sport:"🥊", name:"Major boxing bill (TBC)", detail:"Typical big fight-night weekend", impact:"med" },
  { date:"2026-11-22", sport:"🏎️", name:"F1 — Las Vegas GP", detail:"Formula 1", impact:"med" },
  { date:"2026-11-28", sport:"⚽", name:"Premier League Saturday", detail:"Full fixture programme", impact:"med" },
  // DECEMBER 2026
  { date:"2026-12-05", sport:"⚽", name:"Premier League — festive run begins", detail:"Busy pre-Christmas fixtures", impact:"med" },
  { date:"2026-12-06", sport:"🏎️", name:"F1 — Abu Dhabi GP (season finale)", detail:"Formula 1 — championship decider", impact:"high" },
  { date:"2026-12-12", sport:"⚽", name:"Premier League Saturday", detail:"Full programme", impact:"med" },
  { date:"2026-12-26", sport:"⚽", name:"Boxing Day fixtures", detail:"Premier League — traditional full card", impact:"high" },
  { date:"2026-12-28", sport:"⚽", name:"Premier League — festive fixtures", detail:"Busy holiday period", impact:"high" },
  // JANUARY 2027
  { date:"2027-01-01", sport:"⚽", name:"New Year's Day fixtures", detail:"Premier League full card", impact:"high" },
  { date:"2027-01-09", sport:"⚽", name:"FA Cup Third Round", detail:"Premier League clubs enter — upsets draw crowds", impact:"med" },
  { date:"2027-01-16", sport:"🏉", name:"Six Nations build-up", detail:"Rugby — championship approaches", impact:"med" },
  { date:"2027-01-18", sport:"🎾", name:"Australian Open (finals week)", detail:"Tennis — Grand Slam", impact:"med" },
  { date:"2027-01-30", sport:"⚽", name:"Premier League Saturday", detail:"Full programme", impact:"med" },
  // FEBRUARY 2027
  { date:"2027-02-06", sport:"🏉", name:"Six Nations Round 1", detail:"Rugby — England open the championship", impact:"high" },
  { date:"2027-02-13", sport:"🏉", name:"Six Nations Round 2", detail:"Rugby", impact:"high" },
  { date:"2027-02-14", sport:"⚽", name:"FA Cup Fourth Round", detail:"Football", impact:"med" },
  { date:"2027-02-27", sport:"🏉", name:"Six Nations Round 3", detail:"Rugby", impact:"high" },
  // MARCH 2027
  { date:"2027-03-07", sport:"🏇", name:"Cheltenham Festival build-up", detail:"Horse racing — huge bar draw", impact:"high" },
  { date:"2027-03-13", sport:"🏉", name:"Six Nations Round 4", detail:"Rugby", impact:"high" },
  { date:"2027-03-16", sport:"🏇", name:"Cheltenham Festival (Gold Cup week)", detail:"Horse racing — peak week", impact:"high" },
  { date:"2027-03-20", sport:"🏉", name:"Six Nations — Super Saturday (final round)", detail:"Rugby — championship finale", impact:"high" }
];

/* ============================================================
   CONTRACT TERMS & CONDITIONS — from Brandon Hall template.
   Used on quote/proposal PDFs and the formal agreement.
   ============================================================ */
const CONTRACT_TERMS = [
  { h:"Taxes & Service Charge", t:"All meeting room, food and beverage, and related services are subject to applicable taxes (currently 20%) and service charge in effect on the date(s) of the event." },
  { h:"Maximum Numbers", t:"The maximum number for the meeting room will decrease should additional equipment and/or additional floor space (i.e. staging) be required. The Hotel may, at its sole discretion, reduce the maximum number for the function suite or for the event more generally if required or advised to do so in line with any legal or regulatory requirement or government guidance." },
  { h:"Car Parking", t:"Car parking at the hotel is on a first come first serve basis and is complimentary for guests attending an event. Please ensure your guests register the vehicle registration number at reception." },
  { h:"Use of Outside Vendors", t:"If the Organization wishes to hire outside vendors to provide any goods or services at the Hotel during the event, the Hotel may, in its sole discretion, require that such vendor provide an indemnification agreement and proof of adequate insurance and compliance with applicable health and safety regulations." },
  { h:"Group Room Night Commitment", t:"The Group Room Night Commitment as stated in this Agreement is the minimum commitment the Organization has agreed to utilize; contracted bedrooms will be charged for. Any additional rooms are strictly subject to availability and will incur additional charges. Room rates are subject to applicable taxes (currently 20%) in effect at the time of check-out." },
  { h:"Attrition", t:"The Hotel is relying upon the Organization's use of the Group Room Night Commitment and the Minimum Spend. A loss will be incurred if actual usage is less than ninety percent (90%) of the commitment. The Hotel allows a ten percent (10%) reduction. Any remaining shortfall will be posted as attrition charges to the Master Account, plus applicable taxes. If actual event revenue is less than the Minimum Spend, forty percent (40%) of the difference will be posted to the Master Account. These charges are due as liquidated damages." },
  { h:"Rooming List", t:"A full rooming list with guest names is required a minimum of twenty-one (21) working days prior to arrival. Rooms without names at this time will be released to general inventory at best available rate and remain subject to the cancellation policy less any attrition." },
  { h:"Check-in Procedure", t:"All rooms will be available for check-in from 3:00pm on the day of arrival and must be vacated by 11:00am on the day of departure." },
  { h:"Advance Payment", t:"Full pre-payment is required prior to arrival, based on the Event Order and Group Room Night Commitment. A cash or credit card authorization may be required to guarantee payment of any additional charges incurred during the event." },
  { h:"Payment — BACS/Bank Transfer", t:"Please arrange payment by bank transfer stating the booking reference on all correspondence. Account name: Brandon Hall Management Limited · Sort Code: 30-98-97 · Account Number: 38757762 · IBAN: GB17LOYD30989738757762 · BIC: LOYDGB21031 · VAT: GB 499558606. If bank details appear to change, verify by phone with your event contact before making any payment." },
  { h:"Cancellation by the Organization", t:"Liquidated damages apply on cancellation, based on working days prior to arrival: 0–3 days — 100% of Group Room Night Commitment, 70% of Minimum Spend and Total Meeting Room Rental; 4–90 days — 90% / 40%; 91–180 days — 80% / 40%; 181–365 days — 70% / 40%; from acceptance to 366+ days — 50% / 40%. All plus applicable taxes and Total Meeting Room Rental." },
  { h:"Cancellation by the Hotel", t:"The Hotel may cancel the event and terminate this Agreement without liability if the event might prejudice the reputation of the Hotel; if there is any deterioration in the Organization's financial situation such that it may not fulfil its obligations; or if the Organization fails to pay any sum when due." },
  { h:"Governing Law & Disputes", t:"This Agreement is governed by the law of England and Wales. Disputes will first be addressed through good faith negotiation; failing that, the courts of England and Wales have exclusive jurisdiction." },
  { h:"Impossibility (Force Majeure)", t:"Performance is subject to termination without liability upon circumstances beyond either party's control (acts of God, war, terrorism, government regulation, disaster, strikes, civil disorder, or curtailment of transport) making it illegal or impossible to provide or use the facilities, conditioned on written notice within ten (10) days of learning of the basis." },
  { h:"Privacy & Data Protection", t:"The Hotel is committed to complying with applicable privacy and data protection laws. The Organization will obtain all necessary rights and permissions before providing any personal data to the Hotel." },
  { h:"Damage", t:"The Organization is responsible to the Hotel for any damage caused to allocated rooms, furnishings, utensils and equipment, or to the Hotel generally, by any act, default or neglect of the Organization or its sub-contractors, employees or guests, and shall pay on demand the amount required to make good such damage." },
  { h:"Intellectual Property", t:"The Organization shall not use any of the Hotel's trademarks or intellectual property without the prior written consent of the Hotel or its management company." },
  { h:"Reputation", t:"The Organization shall not, and will procure that its sub-contractors, employees or guests shall not, do anything which may cause damage to the reputation or good standing of the Hotel or bring it into disrepute." },
  { h:"Changes & Amendments", t:"Any changes, additions, stipulations or deletions will not be binding on the other party unless initialled or otherwise approved in writing by that party." },
  { h:"In-house Equipment", t:"The Hotel will provide, at no charge, a reasonable amount of standard meeting equipment. Special setups depleting in-house stock may be charged at rental cost, or changed to a standard format to avoid additional cost." },
  { h:"Security of Items", t:"The Hotel cannot ensure the security of items left unattended in function rooms. Special arrangements may be made for securing a limited number of valuable items. Security personnel are subject to Hotel approval." },
  { h:"Performance Licences", t:"The Organization is solely responsible for obtaining any necessary licences or permission to perform, broadcast, transmit or display any copyrighted works used at the Hotel." },
  { h:"High-risk Activities", t:"The Hotel has committed facilities based on information given. Should the Hotel determine at any time that the event will include a previously undisclosed high-risk activity (e.g. biological agents, pyrotechnics), it may terminate this Agreement immediately without liability." },
  { h:"Anti-Corruption, Sanctions & Regulatory Laws", t:"The Organization acknowledges the Hotel and its management company may be subject to the UK Bribery Act 2010, the US Foreign Corrupt Practices Act, anti-money-laundering laws, and applicable sanctions/trade-embargo laws, and may take any action necessary to ensure compliance, including immediate termination without liability." },
  { h:"Compliance with Law", t:"This Agreement is subject to all applicable laws, including health and safety codes, alcoholic beverage control laws, disability laws and anti-terrorism laws. Both parties agree to cooperate to ensure compliance." },
  { h:"Entire Agreement", t:"This Agreement contains the entire understanding between the parties and supersedes all prior understandings. No amendment or waiver is effective except in writing duly executed by both parties. The main body prevails over any schedules (but not the Event Order)." },
  { h:"General", t:"Correspondence between the Hotel and the customer, and any consequent booking, will be taken as confirmation of the customer's acceptance of the Hotel's terms and conditions. Once agreed, the function sheet is binding and forms part of the contract. All rates are quoted in GBP inclusive of VAT at the current rate and are therefore liable to change." }
];

/* Short T&C summary line for quote footers */
const TERMS_SHORT = "This proposal is subject to Brandon Hall Hotel and Spa's full terms and conditions (attached). Rates in GBP incl. VAT (currently 20%) and liable to change. Space and rates are held provisionally and subject to availability until confirmed. Cancellation charges apply per the schedule in the terms.";
