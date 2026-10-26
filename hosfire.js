/* ============================================================
   HosFIRE — fire safety records for Brandon Hall Hotel and Spa
   Standalone module: loaded only by hosfire.html. Uses its own
   Firestore collections (hosfire_*) and Storage folder (hosfire/),
   so nothing else in HosPRO is read or changed.
   ?demo=1 runs it without Firebase (data kept in this browser only).
   ============================================================ */
(function () {
"use strict";

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (s, n) => { const d = parse(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return ymd(d); };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const mondayOf = (s) => { const d = parse(s); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return ymd(d); };
const fd = (s) => { if (!s) return ""; const d = parse(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fds = (s) => { if (!s) return ""; const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const ms = (t) => (t && t.toMillis ? t.toMillis() : (typeof t === "number" ? t : (t && t.seconds ? t.seconds * 1000 : Date.now())));
const fdt = (t) => { const d = new Date(ms(t)); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const natRef = (a, b) => String(a || "").localeCompare(String(b || ""), "en", { numeric: true });
const DEMO = /[?&]demo=1/.test(location.search);
const CHECK = Object.fromEntries(HF_CHECKS.map((c) => [c.id, c]));

function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function modal(html) {
  const m = document.createElement("div"); m.className = "modal";
  m.innerHTML = `<div class="mbox">${html}</div>`;
  m.close = () => { if (!m.isConnected) return; m.remove(); if (m.onclose) m.onclose(); };
  m.addEventListener("mousedown", (e) => { if (e.target === m) m.close(); });
  document.body.appendChild(m);
  $$("[data-close]", m).forEach((b) => (b.onclick = () => m.close()));
  return m;
}
const pill = (txt) => {
  const map = { "Completed": "p-ok", "In progress": "p-amb", "Not started": "p-red", "High": "p-red", "Medium": "p-amb", "Low": "p-grey",
    "Overdue": "p-red", "Due soon": "p-amb", "OK": "p-ok", "No date": "p-grey", "Done": "p-ok", "Due": "p-amb", "Missed": "p-red", "Planned": "p-navy", "Pass": "p-ok", "Fail": "p-red" };
  return `<span class="pill ${map[txt] || "p-grey"}">${h(txt)}</span>`;
};

/* ---------- logins ---------- */
const LOGINS = {};
Object.entries(typeof FB_LOGINS !== "undefined" ? FB_LOGINS : {}).forEach(([k, v]) => { if (!v.spare) LOGINS[k] = v; });
Object.assign(LOGINS, HF_EXTRA_LOGINS);
const keyByEmail = (e) => Object.keys(LOGINS).find((k) => LOGINS[k].email === e);

/* ---------- store ---------- */
const COLS = { records: "hosfire_records", actions: "hosfire_actions", registers: "hosfire_registers", diary: "hosfire_diary", audit: "hosfire_audit", config: "hosfire_config", sigs: "hosfire_signatures" };
const S = { live: false, user: null, key: null, tab: "dash", data: { records: [], actions: [], registers: [], diary: [], audit: [], config: [], sigs: [] }, f: {} };
let fb = null;

function fbInit() {
  if (DEMO) return false;
  try {
    if (typeof firebase === "undefined" || typeof firebaseConfig === "undefined") return false;
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    fb = { app, auth: firebase.auth(), db: firebase.firestore(), st: firebase.storage ? firebase.storage() : null };
    return true;
  } catch (e) { console.warn("HosFIRE: Firebase not available", e); return false; }
}

const demoKey = "hosfire_demo_v1";
function demoLoad() { try { const j = JSON.parse(localStorage.getItem(demoKey) || "null"); if (j) Object.assign(S.data, j); } catch (e) {} }
function demoSave() { try { localStorage.setItem(demoKey, JSON.stringify(S.data)); } catch (e) {} }

let rerenderT = null;
const rerender = () => { clearTimeout(rerenderT); rerenderT = setTimeout(() => { if (!S.hold) render(); }, 60); };
const unsub = [];
function listen() {
  if (!S.live) { demoLoad(); render(); autoCatchup(); return; }
  Object.entries(COLS).forEach(([k, col]) => {
    unsub.push(fb.db.collection(col).onSnapshot((snap) => {
      S.data[k] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (k === "actions") autoCatchup();
      rerender();
    }, (err) => { console.warn(col, err); if (k === "records") toast("Cannot read HosFIRE data — check the Firestore rules have been published."); }));
  });
}
let catchupT = null;
function autoCatchup() {
  if (!S.user || S.hold) return;
  clearTimeout(catchupT);
  catchupT = setTimeout(async () => {
    const worked = (a) => a.status === "Not started" && ((a.photos || []).length || (typeof a.pct === "number" && a.pct > 0)
      || (a.steps || []).some((x) => x.done && !/starting data/i.test(x.by || ""))
      || (a.history || []).some((x) => x.note && !/starting data|^created$|^edited$/i.test(x.note) && /HosFIRE Mobile|Progress set|Done:/i.test(x.note)));
    const list = S.data.actions.filter(worked);
    for (const a of list) await put("actions", a.id, { status: "In progress", history: (a.history || []).concat([{ at: Date.now(), by: "HosFIRE (automatic)", status: "In progress", note: "Status updated — work had been recorded on this job" }]) });
    if (list.length) audit(`Automatic status update: ${list.map((a) => a.ref).join(", ")} moved to In progress`);
  }, 1500);
}
const stamp = () => ({ byName: S.user.name, byEmail: S.user.email });
const now = () => (S.live ? firebase.firestore.FieldValue.serverTimestamp() : Date.now());
async function add(k, obj) {
  const doc = { ...obj, ...stamp(), createdAt: now() };
  if (S.live) { const r = await fb.db.collection(COLS[k]).add(doc); return r.id; }
  const id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  S.data[k].push({ id, ...doc }); demoSave(); rerender(); return id;
}
async function put(k, id, obj, merge = true) {
  const doc = { ...obj, updatedBy: S.user.name, updatedAt: now() };
  if (S.live) { await fb.db.collection(COLS[k]).doc(id).set(doc, { merge }); return; }
  const i = S.data[k].findIndex((x) => x.id === id);
  if (i >= 0) S.data[k][i] = merge ? { ...S.data[k][i], ...doc } : { id, ...doc }; else S.data[k].push({ id, ...doc });
  demoSave(); rerender();
}
async function del(k, id) {
  if (S.live) { await fb.db.collection(COLS[k]).doc(id).delete(); return; }
  S.data[k] = S.data[k].filter((x) => x.id !== id); demoSave(); rerender();
}
function audit(what, ref) { add("audit", { what, ref: ref || "" }).catch(() => {}); }
async function upload(folder, file) {
  if (!S.live || !fb.st) throw new Error("File upload needs the live system (not demo mode).");
  if (file.size > 25 * 1024 * 1024) throw new Error("File is over 25 MB.");
  const safe = file.name.replace(/[^\w.\- ]+/g, "_");
  const path = `hosfire/${folder}/${Date.now()}_${safe}`;
  await fb.st.ref(path).put(file, { contentType: file.type || "application/octet-stream" });
  return { path, name: file.name, size: file.size, uploadedBy: S.user.name, uploadedAt: Date.now() };
}
async function openFile(f) {
  if (!f || !f.path) return;
  try { const url = await fb.st.ref(f.path).getDownloadURL(); window.open(url, "_blank", "noopener"); }
  catch (e) { toast("Could not open the file: " + e.message); }
}
const isAdmin = () => HF_ADMINS.includes(S.key) || (DEMO && S.key);
const reg = (kind) => S.data.registers.filter((r) => r.kind === kind);
const cfg = () => S.data.config.find((c) => c.id === "main") || {};
const marshals = () => (cfg().marshals && cfg().marshals.length ? cfg().marshals : HF_MARSHALS);
const rotaStart = () => cfg().rotaStart || HF_ROTA_START;

/* ---------- rota ---------- */
function rotaWeek(i) {
  const wc = addDays(rotaStart(), 7 * i);
  const off = ((i % 3) + 3) % 3, m = marshals();
  return { i, wc, day: addDays(wc, off), dayName: HF_ROTA_DAYS[off], marshal: m[((i % m.length) + m.length) % m.length] };
}
const rotaIndex = (s) => Math.floor(daysBetween(rotaStart(), mondayOf(s)) / 7);
const recs = (type) => S.data.records.filter((r) => r.type === type && !r.correctionOf);
const effective = (r) => S.data.records.find((x) => x.correctionOf === r.id) || r;
function weekStatus(w) {
  const done = recs("weekly_alarm").filter((r) => r.date >= w.wc && r.date <= addDays(w.wc, 6)).sort((a, b) => natRef(a.date, b.date));
  if (done.length) return { st: "Done", rec: done[0] };
  if (today() > addDays(w.wc, 6)) return { st: "Missed" };
  if (today() > w.day) return { st: "Overdue" };
  if (today() >= w.wc) return { st: "Due" };
  return { st: "Planned" };
}

/* ---------- check status ---------- */
function periodStart(freq, d = today()) { if (freq === "daily") return d; if (freq === "weekly") return mondayOf(d); if (freq === "monthly") return d.slice(0, 8) + "01"; return null; }
function checkStatus(c) {
  const all = recs(c.id).sort((a, b) => natRef(b.date, a.date));
  const last = all[0];
  if (c.freq === "event") return { st: last ? "Recorded" : "None yet", last };
  const ps = periodStart(c.freq);
  const done = all.find((r) => r.date >= ps);
  return { st: done ? "Done" : "Due", last, done };
}
function resultOf(r) {
  const vals = Object.values(r.items || {});
  const fails = vals.filter((v) => v === "fail").length;
  return fails ? `${fails} fail${fails > 1 ? "s" : ""}` : (vals.length ? "All pass" : "Recorded");
}

/* ---------- certificates ---------- */
function certState(c) {
  if (!c.last || !c.months) return { next: "", st: "No date" };
  const next = addMonths(c.last, Number(c.months));
  const d = daysBetween(today(), next);
  return { next, st: d < 0 ? "Overdue" : d <= 30 ? "Due soon" : "OK", days: d };
}

/* ---------- action progress (from its steps) ---------- */
function progressOf(a) {
  if (a.status === "Completed") return 100;
  if (typeof a.pct === "number" && a.pct !== null) return a.pct;
  const st = a.steps || [];
  if (st.length) return Math.round((st.filter((x) => x.done).length / st.length) * 100);
  return a.status === "Completed" ? 100 : 0;
}
const progBar = (pc, w = 120) => `<div title="${pc}% complete" style="display:flex;align-items:center;gap:6px"><div style="width:${w}px;height:8px;background:#ebe7df;border-radius:4px;overflow:hidden"><div style="width:${pc}%;height:100%;background:${pc >= 100 ? "var(--c-done)" : pc > 0 ? "var(--c-prog)" : "transparent"};border-radius:4px"></div></div><b style="font-size:12px">${pc}%</b></div>`;

/* ---------- simple accessible bar charts (HTML, hover titles, legend) ---------- */
const SC = { "Completed": "var(--c-done)", "In progress": "var(--c-prog)", "Not started": "var(--c-not)" };
function stackedBars(rows, keys) { // rows: [{label, counts:{key:n}}]
  const max = Math.max(1, ...rows.map((r) => keys.reduce((t, k) => t + (r.counts[k] || 0), 0)));
  return `<div class="legend">${keys.map((k) => `<span><i style="background:${SC[k]}"></i>${h(k)}</span>`).join("")}</div>
  ${rows.map((r) => { const tot = keys.reduce((t, k) => t + (r.counts[k] || 0), 0);
    return `<div class="bar-row"><div class="bl">${h(r.label)}</div><div class="bt"><div class="bs" style="width:${(tot / max) * 100}%">${keys.filter((k) => r.counts[k]).map((k) =>
      `<div class="seg2" style="flex:${r.counts[k]};background:${SC[k]}" title="${h(r.label)} — ${h(k)}: ${r.counts[k]}">${r.counts[k]}</div>`).join("")}</div></div><div class="bv">${tot}</div></div>`; }).join("")}`;
}
function simpleBars(rows, unit = "%", max = 100, color = "var(--navy)") { // rows: [{label, value, note}]
  return rows.map((r) => `<div class="bar-row" title="${h(r.label)}: ${r.value}${unit}${r.note ? " — " + h(r.note) : ""}"><div class="bl">${h(r.label)}</div><div class="bt"><div class="bs" style="width:${Math.max(0, Math.min(100, (r.value / max) * 100))}%;background:${color};border-radius:0 4px 4px 0"></div></div><div class="bv">${r.value}${unit}${r.note ? `<span class="muted"> ${h(r.note)}</span>` : ""}</div></div>`).join("");
}

/* ============================================================ LOGIN */
function buildLogin() {
  const sel = $("#lg-user");
  sel.innerHTML = `<option value="">Choose your name…</option>` + Object.entries(LOGINS).sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([k, v]) => `<option value="${h(k)}">${h(v.name)}</option>`).join("");
  try { const last = localStorage.getItem("hosfire_last_user"); if (last && LOGINS[last]) sel.value = last; } catch (e) {}
  $("#lg-code").placeholder = "HosFIRE code";
  $("#lg-code").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#lg-go").click(); });
  $("#lg-go").onclick = async () => {
    const k = sel.value, code = $("#lg-code").value.trim().toUpperCase(), err = $("#lg-err");
    err.textContent = "";
    if (!k) { err.textContent = "Choose your name."; return; }
    const m = LOGINS[k];
    if (code !== HF_ACCESS_CODE && code !== String(m.code).toUpperCase()) { err.textContent = "Incorrect access code."; return; }
    try { sessionStorage.setItem("hosfire_gate", "1"); localStorage.setItem("hosfire_last_user", k); } catch (e) {}
    if (!S.live) { enter(k); return; }
    try { await fb.auth.signInWithEmailAndPassword(m.email, m.pw); /* onAuthStateChanged enters */ }
    catch (e) {
      err.textContent = (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential" || e.code === "auth/invalid-login-credentials")
        ? "This login has not been set up in Firebase yet. Ask Ajay (Settings tab shows how)." : e.message;
    }
  };
  $("#logout").onclick = async (e) => { e.preventDefault(); unsub.splice(0).forEach((u) => u()); if (S.live) await fb.auth.signOut(); location.reload(); };
}
function gate(k) {
  let ok = false; try { ok = sessionStorage.getItem("hosfire_gate") === "1"; } catch (e) {}
  if (ok) { enter(k); return; }
  const card = $(".lgcard");
  card.innerHTML = `<img src="assets/marketing/logos/logo-blue-transparent.png" onerror="this.src='assets/bh-logo.svg'" alt="Brandon Hall">
    <h1>Hos<span>FIRE</span></h1><p>Signed in as <b>${h(LOGINS[k].name)}</b></p>
    <label>HosFIRE access code</label><input id="gt-code" type="password" inputmode="numeric" autocomplete="off" autofocus>
    <button class="btn red block" id="gt-go">Open HosFIRE</button><div class="err" id="gt-err"></div>
    <p class="muted" style="margin-top:10px"><a href="index.html">← Back to HosPRO</a></p>`;
  const go = () => { if ($("#gt-code").value.trim() === HF_ACCESS_CODE) { try { sessionStorage.setItem("hosfire_gate", "1"); } catch (e) {} enter(k); } else $("#gt-err").textContent = "Incorrect code."; };
  $("#gt-go").onclick = go; $("#gt-code").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }); setTimeout(() => $("#gt-code").focus(), 50);
}
function enter(k) {
  try { sessionStorage.setItem("hosfire_gate", "1"); } catch (e) {}
  S.key = k; S.user = LOGINS[k];
  if (location.hash === "#sign") S.tab = "sign";
  $("#login").classList.add("hide"); $("#app").classList.remove("hide");
  $("#who-name").textContent = S.user.name;
  const b = $("#mode-badge"); b.textContent = !S.live ? "DEMO" : k === HF_FIRE_MANAGER.key ? "Fire Safety Manager" : isAdmin() ? "Admin" : "Fire team"; if (!S.live) b.classList.add("demo");
  const sub = $("header .sub"); if (sub) sub.innerHTML = `Fire Safety Manager: <b>${h(HF_FIRE_MANAGER.name)}</b> · ${h(HF_HOTEL.name)}`;
  listen();
}

/* ============================================================ NAV */
const TABS = [
  ["dash", "Dashboard"], ["procs", "Procedures"], ["checks", "Record a check"], ["log", "Logbook"], ["rota", "Weekly tests"], ["back", "Back-records"], ["actions", "Actions"],
  ["audit", "Audit readiness"], ["venues", "Venues & events"], ["certs", "Certificates"], ["docs", "Documents"], ["training", "Training"], ["drills", "Drills, PEEPs, permits"],
  ["diary", "Diary"], ["regs", "Regulations"], ["pack", "Inspector pack"], ["settings", "Settings"]
];
/* Side navigation, grouped into sections */
const NAV = [
  ["Overview", [["focus", "🎯", "Inspection focus"], ["dash", "📊", "Dashboard"], ["procs", "🔥", "Procedures"], ["audit", "✅", "Audit readiness"], ["diary", "📅", "Diary"]]],
  ["Checks and records", [["checks", "📝", "Record a check"], ["rota", "🔔", "Weekly tests"], ["log", "📖", "Logbook"], ["back", "🗂", "Back-records"], ["drills", "🚪", "Drills, PEEPs, permits"]]],
  ["Actions and contractors", [["actions", "📋", "Actions"], ["certs", "📜", "Certificates"], ["venues", "💍", "Venues & events"]]],
  ["People", [["training", "🎓", "Training"]]],
  ["Library", [["sign", "✍️", "Signatures"], ["docs", "📁", "Documents"], ["regs", "⚖️", "Regulations"], ["pack", "🖨", "Inspector pack"]]],
  ["Admin", [["settings", "⚙️", "Settings"]]]
];
function placeNav() { const hh = ($("header") || {}).offsetHeight || 66; const nv = $("#nav"); if (!nv) return; nv.style.top = hh + "px"; nv.style.height = window.innerWidth > 900 ? `calc(100vh - ${hh}px)` : ""; }
function nav() {
  const badge = { actions: S.data.actions.filter((a) => a.status !== "Completed" && a.priority === "High").length,
    checks: HF_CHECKS.filter((c) => c.freq !== "event" && checkStatus(c).st === "Due").length, sign: myToSign().length, focus: focusLists().before.filter((a) => a.status !== "Completed").length };
  $("#nav").innerHTML = NAV.map(([g, items]) => `<div class="ng">${g}</div>` + items.map(([k, i, l]) => `<button data-t="${k}" class="${S.tab === k ? "on" : ""}"><span class="ni">${i}</span>${l}${badge[k] ? `<span class="nb" title="${k === "actions" ? "High-priority actions open" : k === "focus" ? "Jobs to finish before the inspection" : "Checks due now"}">${badge[k]}</span>` : ""}</button>`).join("")).join("");
  $$("#nav button").forEach((b) => (b.onclick = () => { S.tab = b.dataset.t; $("#nav").classList.remove("open"); render(); window.scrollTo(0, 0); }));
  const mb = $("#menu-btn"); if (mb) mb.onclick = () => $("#nav").classList.toggle("open");
  placeNav(); if (!window._hfNavRs) { window._hfNavRs = 1; window.addEventListener("resize", placeNav); }
}
function render() {
  if (!S.user) return;
  nav();
  const v = $("#view");
  const fn = VIEWS[S.tab] || VIEWS.dash;
  v.innerHTML = fn();
  (BIND[S.tab] || (() => {}))(v);
}

/* ============================================================ DASHBOARD */
const VIEWS = {}, BIND = {};
VIEWS.dash = () => {
  const A = S.data.actions;
  const open = A.filter((a) => a.status !== "Completed");
  const highOpen = open.filter((a) => a.priority === "High");
  const done = A.filter((a) => a.status === "Completed").length;
  const certs = reg("cert").map((c) => ({ ...c, ...certState(c) }));
  const overdue = certs.filter((c) => c.st === "Overdue");
  const soon = certs.filter((c) => c.st === "Due soon");
  const wi = rotaIndex(today()), w = wi >= 0 ? rotaWeek(wi) : rotaWeek(0), ws = weekStatus(w);
  const insp = HF_HOTEL.inspection, dIns = daysBetween(today(), insp.date);
  const due = HF_CHECKS.filter((c) => c.freq !== "event").map((c) => ({ c, s: checkStatus(c) }));
  const dueNow = due.filter((x) => x.s.st === "Due");
  const recent = S.data.records.slice().sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).slice(0, 8);
  const drills = recs("drill").filter((r) => r.date >= addMonths(today(), -12));
  const empty = !A.length && !reg("cert").length;
  return `
  <h2>Fire safety <span class="fl">dashboard</span></h2>
  <p class="lead">${h(HF_HOTEL.name)} · ${fd(today())}</p>
  ${myToSign().length ? `<div class="warn"><b>✍️ ${myToSign().length} document${myToSign().length > 1 ? "s" : ""} waiting for your signature.</b> <a href="#" data-go="sign">Sign now →</a></div>` : ""}
  ${empty ? `<div class="warn"><b>No starting data loaded yet.</b> ${isAdmin() ? `Go to <a href="#" data-go="settings">Settings</a> and load the HosFIRE starting data file.` : "Ask a fire safety manager to load the starting data."}</div>` : ""}
  ${dIns >= 0 && dIns <= 60 ? `<div class="warn"><b>Fire Safety Order audit: ${fd(insp.date)} at ${h(insp.time)}</b> — ${h(insp.inspector)}, ${h(insp.body)} (ref ${h(insp.ref)}). ${dIns === 0 ? "Today." : dIns + " day" + (dIns > 1 ? "s" : "") + " to go."}</div>` : ""}
  ${(() => { const ar = auditScore(); const overall = A.length ? Math.round(A.reduce((t, a) => t + progressOf(a), 0) / A.length) : 0;
    return `<div class="grid g5">
    <div class="card tile ${ar.pc >= 80 ? "g" : ar.pc >= 50 ? "a" : "r"}" data-go="audit" style="cursor:pointer"><div class="n">${ar.pc}%</div><div class="l">Audit readiness (${ar.ready} of ${ar.total} ready)</div></div>
    <div class="card tile r" data-go="actions" data-goset="open|High" style="cursor:pointer"><div class="n">${highOpen.length}</div><div class="l">High-priority actions open</div></div>
    <div class="card tile a" data-go="actions" data-goset="open|" style="cursor:pointer"><div class="n">${open.length}</div><div class="l">Actions open (of ${A.length})</div></div>
    <div class="card tile" data-go="actions" data-goset="|" style="cursor:pointer"><div class="n">${overall}%</div><div class="l">Overall action progress</div></div>
    <div class="card tile ${overdue.length ? "r" : "g"}" data-go="certs" style="cursor:pointer"><div class="n">${overdue.length}</div><div class="l">Certificates overdue${soon.length ? ` · ${soon.length} due soon` : ""}</div></div>
  </div>`; })()}
  ${A.length ? (() => {
    const cats = HF_ACTION_CATS.filter((c) => A.some((a) => a.category === c));
    const byCat = cats.map((c) => { const l = A.filter((a) => a.category === c); return { label: c, counts: Object.fromEntries(HF_STATUS.map((s) => [s, l.filter((a) => a.status === s).length])) }; });
    const prog = cats.map((c) => { const l = A.filter((a) => a.category === c); return { label: c, value: Math.round(l.reduce((t, a) => t + progressOf(a), 0) / l.length), note: `(${l.length})` }; });
    const ar = HF_AUDIT.map((g) => { const sc = auditScore(g); return { label: g.t.replace(/ \(.*\)$/, "").replace(/^Function rooms, events and room bookings/, "Events & rooms").replace(/^People: /, "").replace(/^Fire risk assessment and management/, "FRA & management").replace(/^Firefighting equipment and hazards/, "Equipment & hazards").replace(/^Escape routes, doors and lighting/, "Escape, doors, lighting"), value: sc.pc }; });
    const bw = backWeeks(), bm = {}; bw.forEach((wc) => { const k = wc.slice(0, 7); bm[k] = bm[k] || { n: 0, d: 0 }; bm[k].n++; if (inRange("weekly_alarm", wc, addDays(wc, 6)).length) bm[k].d++; });
    return `<div class="grid g4c" style="margin-top:12px">
      <div class="card"><h3 style="margin-top:0">Action status by category</h3>${stackedBars(byCat, HF_STATUS)}</div>
      <div class="card"><h3 style="margin-top:0">Progress by category</h3><p class="muted" style="margin-top:-4px">Average % complete</p>${simpleBars(prog)}</div>
      <div class="card"><h3 style="margin-top:0">Audit readiness by area</h3><p class="muted" style="margin-top:-4px">From the Audit readiness tab</p>${simpleBars(ar, "%", 100, "var(--red)")}</div>
      <div class="card"><h3 style="margin-top:0">Weekly alarm tests evidenced</h3><p class="muted" style="margin-top:-4px">Feb–Oct 2026, weeks with a back-record</p>
        ${simpleBars(Object.keys(bm).map((k) => ({ label: `${MON[+k.slice(5) - 1]} ${k.slice(0, 4)}`, value: bm[k].d, note: `of ${bm[k].n}` })), "", 5, "var(--navy)")}</div>
    </div>`; })() : ""}
  <div class="grid g2" style="margin-top:12px">
    <div class="card">
      <h3 style="margin-top:0">This week's fire alarm test</h3>
      ${wi < 0 ? `<p class="muted">Rota starts ${fd(rotaStart())}. First test: ${h(w.dayName)} ${fds(w.day)} — ${h(w.marshal)}.</p>` : `
      <div class="row"><div class="grow"><b>${h(w.dayName)} ${fds(w.day)}</b><br><span class="muted">Planned marshal: ${h(w.marshal)}</span></div>${pill(ws.st)}</div>
      ${ws.rec ? `<p class="muted">Done by ${h(ws.rec.byName)} on ${fd(ws.rec.date)} at ${h((ws.rec.fields || {}).time || "")} — call point ${h((ws.rec.fields || {}).callpoint || "")}.</p>` : `<button class="btn red sm" data-rec="weekly_alarm" style="margin-top:8px">Record this week's test</button>`}`}
      <h3>Checks due now</h3>
      ${dueNow.length ? dueNow.map((x) => `<div class="row" style="padding:4px 0;border-bottom:1px solid var(--line)"><div class="grow">${h(x.c.name)} <span class="muted">· ${h(x.c.freq)}</span></div><button class="btn sm ghost" data-rec="${x.c.id}">Record</button></div>`).join("") : `<p class="muted">All daily, weekly and monthly checks are recorded for this period.</p>`}
      <h3>Drills in the last 12 months</h3>
      <p>${drills.length} recorded · day ${drills.filter((d) => (d.fields || {}).shift === "Day").length} · night ${drills.filter((d) => (d.fields || {}).shift === "Night").length} ${drills.filter((d) => (d.fields || {}).shift === "Night").length ? "" : pill("Night drill needed")}</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Open high-priority actions</h3>
      ${highOpen.length ? highOpen.sort((a, b) => natRef(a.ref, b.ref)).map((a) => `<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)"><b style="flex:0 0 40px">${h(a.ref)}</b><div style="flex:1">${h(a.title)}</div><div style="flex:0 0 auto">${progBar(progressOf(a), 50)}</div></div>`).join("") : `<p class="muted">None.</p>`}
    </div>
  </div>
  <h3 class="row"><span class="grow">Our fire procedure at a glance</span><a href="#" data-go="procs" style="font-size:13px;color:var(--red)">All procedures →</a></h3>
  ${procStrip()}
  <h3>Latest entries</h3>
  ${recent.length ? `<div class="tw"><table><tr><th>Check</th><th>Date</th><th>Result</th><th>By</th><th>Entered</th></tr>
    ${recent.map((r) => `<tr><td>${h((CHECK[r.type] || {}).name || r.type)}${r.imported ? `<span class="imp">PAST RECORD</span>` : ""}</td><td>${fds(r.date)}</td><td>${h(resultOf(r))}</td><td>${h(r.byName)}</td><td class="muted">${fdt(r.createdAt)}</td></tr>`).join("")}</table></div>` : `<p class="muted">Nothing recorded yet.</p>`}`;
};
BIND.dash = (v) => { bindRec(v); $$("[data-go]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault();
  if (a.dataset.goset !== undefined) { const [st, pr] = a.dataset.goset.split("|"); S.f.act = { cat: "", st, q: "", pri: pr || "" }; }
  S.tab = a.dataset.go; render(); window.scrollTo(0, 0); })); };
function bindRec(v) { $$("[data-rec]", v).forEach((b) => (b.onclick = () => openCheck(b.dataset.rec))); }

/* ============================================================ RECORD A CHECK */
VIEWS.checks = () => {
  const groups = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["event", "When it happens"]];
  return `<h2>Record a <span class="fl">check</span></h2>
  <p class="lead">Record the check when you do it. Your name, the date and the time you saved it are recorded automatically. Items marked <b style="color:var(--red)">★</b> must be checked every time.</p>
  ${groups.map(([f, l]) => `<h3>${l}</h3><div class="grid g4">${HF_CHECKS.filter((c) => c.freq === f).map((c) => {
    const s = checkStatus(c);
    return `<div class="card" style="border-top:4px solid ${s.st === "Due" ? "var(--red)" : "var(--navy)"}">
      <div class="row"><b class="grow">${h(c.name)}</b>${f === "event" ? "" : pill(s.st)}</div>
      <div class="muted">${h(c.ref)} · ${h(c.owner)}</div>
      <div class="muted">Last: ${s.last ? `${fds(s.last.date)} (${h(s.last.byName)})` : "none"}</div>
      <button class="btn ${s.st === "Due" ? "red" : ""} sm" data-rec="${c.id}" style="margin-top:8px">Record</button></div>`;
  }).join("")}</div>`).join("")}
  ${isAdmin() ? `<h3>Records from before HosFIRE</h3><div class="note">Past records can be entered only as a copy of something recorded at the time (panel event log, Saeker, a paper form, a contractor report). Each one is labelled <span class="imp">PAST RECORD</span> with its source and the date it was entered, in the logbook and in the inspector pack.</div>
  <button class="btn ghost" id="past-btn">Enter a past record from a source</button>` : ""}`;
};
BIND.checks = (v) => { bindRec(v); const p = $("#past-btn", v); if (p) p.onclick = () => openCheck(null, { past: true }); };

function openCheck(typeId, opt = {}) {
  const past = !!opt.past;
  const typeSel = past ? `<label>Check type</label><select data-k="__type">${HF_CHECKS.map((c) => `<option value="${c.id}" ${c.id === typeId ? "selected" : ""}>${h(c.name)}</option>`).join("")}</select>` : "";
  const m = modal(`<h3>${past ? "Enter a past record from a source" : h(CHECK[typeId].name)}</h3>${typeSel}<div id="ck-body"></div>
    <div class="row" style="margin-top:14px"><button class="btn red" id="ck-save">Save record</button><button class="btn ghost" data-close>Cancel</button></div><div class="err" id="ck-err"></div>`);
  const body = $("#ck-body", m);
  const draw = (id) => {
    const c = CHECK[id];
    const w = id === "weekly_alarm" ? rotaWeek(rotaIndex(today())) : null;
    body.innerHTML = `
      <p class="muted">${h(c.ref)} · ${h(c.std)} · ${h(c.owner)}</p>
      <div class="note">${h(c.intro)}</div>
      ${w && !past && rotaIndex(today()) >= 0 ? `<p class="muted">Rota this week: <b>${h(w.dayName)} ${fds(w.day)}</b>, planned marshal <b>${h(w.marshal)}</b>. If you are covering, record it under your own name.</p>` : ""}
      ${past && opt.min ? `<p><b>Period: ${fds(opt.min)} to ${fds(opt.max)}</b> — pick the date shown in Saeker.</p>` : ""}
      ${past ? `<div class="warn">Copy only what the source shows. Do not fill in anything the source does not record — leave it as "N/A" with a note.</div>
        <div class="f2"><div><label>Source</label><select data-k="__source">${HF_SOURCES.map((s) => `<option>${h(s)}</option>`).join("")}</select></div>
        <div><label>Source reference (Saeker task ID, page or event number)</label><input data-k="__sourceRef" placeholder="e.g. Saeker task 10482"></div></div>
        <label>Name of the person who did the check (as shown in the source)</label><input data-k="__doneBy">
        <div class="f2"><div><label>Scanned testing sheet (if from a paper sheet)</label><select data-k="__scan"><option value="">None</option>${reg("scan").filter((x) => !x.checkType || x.checkType === id).sort((a, b) => natRef(b.period, a.period)).map((x) => `<option value="${x.id}">${h(x.title)}</option>`).join("")}</select></div>
        <div><label>…or upload the scan now</label><input type="file" data-k="__scanfile" accept="image/*,.pdf"></div></div>` : ""}
      <div class="f2"><div><label>Date of the check</label><input type="date" data-k="__date" value="${past ? "" : today()}" ${past ? `min="${h(opt.min || "")}" max="${h(opt.max && opt.max < today() ? opt.max : addDays(today(), -1))}"` : `min="${addDays(today(), -7)}" max="${today()}"`}></div><div></div></div>
      ${!past ? `<p class="muted" style="margin-top:2px">You can record a check up to 7 days late. The time you save it is shown next to it.</p>` : ""}
      ${c.fields.map(([k, l, t, req]) => {
        const lab = `<label>${h(l)}${req ? ' <b style="color:var(--red)">*</b>' : ""}</label>`;
        if (t === "venue") return lab + `<select data-f="${k}"><option value="">Choose…</option>${reg("venue").sort((a, b) => natRef(a.name, b.name)).map((x) => `<option>${h(x.name)}</option>`).join("")}<option>Other (write in notes)</option></select>`;
        if (t.startsWith("select:")) return lab + `<select data-f="${k}"><option value="">Choose…</option>${t.slice(7).split("|").map((o) => `<option>${h(o)}</option>`).join("")}</select>`;
        if (t === "textarea") return lab + `<textarea data-f="${k}"></textarea>`;
        return lab + `<input type="${t === "number" ? "number" : t === "time" ? "time" : t === "date" ? "date" : "text"}" data-f="${k}">`;
      }).join("")}
      ${c.items.length ? `<label style="margin-top:14px">Checks</label>` : ""}
      ${c.items.map(([k, l, must]) => `<div class="chk ${must ? "must" : ""}"><div class="t">${must ? '<b style="color:var(--red)">★</b> ' : ""}${h(l)}</div>
        <div class="seg" data-i="${k}"><button data-v="pass" class="pass">Pass</button><button data-v="fail" class="fail">Fail</button><button data-v="na" class="na">N/A</button></div></div>`).join("")}
      <label>Notes (required for any Fail or N/A)</label><textarea data-k="__notes"></textarea>
      ${c.items.length ? `<label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" data-k="__mkact" checked style="width:auto"> Create an action for each Fail</label>` : ""}
      <label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" data-k="__confirm" style="width:auto">
        ${past ? "I confirm this is copied from the source named above and nothing has been added." : "I confirm I carried out this check myself on the date shown."}</label>`;
    const sc = $("[data-k=__scan]", body), sf = $("[data-k=__scanfile]", body);
    const toPaper = () => { const so = $("[data-k=__source]", body); if (so) so.value = HF_SOURCES.find((x) => /paper/i.test(x)); const sr = $("[data-k=__sourceRef]", body); if (sr && !sr.value && sc && sc.value) sr.value = sc.options[sc.selectedIndex].text; };
    if (sc) sc.onchange = toPaper; if (sf) sf.onchange = toPaper;
    $$(".seg", body).forEach((sg) => $$("button", sg).forEach((b) => (b.onclick = () => { $$("button", sg).forEach((x) => x.classList.remove("on")); b.classList.add("on"); })));
  };
  const typeEl = $("[data-k=__type]", m);
  draw(typeId || (typeEl && typeEl.value) || HF_CHECKS[0].id);
  if (typeEl) typeEl.onchange = () => draw(typeEl.value);
  $("#ck-save", m).onclick = async () => {
    const id = typeEl ? typeEl.value : typeId, c = CHECK[id], err = $("#ck-err", m);
    const val = (k) => { const el = $(`[data-k=${k}]`, m); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };
    const date = val("__date"), notes = val("__notes");
    const fields = {}; $$("[data-f]", m).forEach((el) => (fields[el.dataset.f] = el.value.trim()));
    const items = {}; $$(".seg", m).forEach((sg) => { const on = $("button.on", sg); items[sg.dataset.i] = on ? on.dataset.v : ""; });
    if (!date) return (err.textContent = "Enter the date of the check.");
    if (!past && (date > today() || date < addDays(today(), -7))) return (err.textContent = "Date must be within the last 7 days. Older records go in as past records from a source.");
    if (past && date >= today()) return (err.textContent = "A past record must be dated before today.");
    const missF = c.fields.filter(([k, , , req]) => req && !fields[k]).map(([, l]) => l);
    if (missF.length) return (err.textContent = "Please complete: " + missF.join(", "));
    const missI = c.items.filter(([k]) => !items[k]).map(([, l]) => l);
    if (missI.length) return (err.textContent = `Answer every check (${missI.length} not answered).`);
    if (Object.values(items).some((x) => x === "fail" || x === "na") && !notes) return (err.textContent = "Add a note explaining each Fail or N/A.");
    if (past && (!val("__sourceRef") || !val("__doneBy"))) return (err.textContent = "Give the source reference and the name shown in the source.");
    if (!val("__confirm")) return (err.textContent = "Tick the confirmation box.");
    const rec = { type: id, ref: c.ref, date, fields, items, notes };
    if (id === "event") {
      const vn = reg("venue").find((x) => x.name === fields.venue), lim = vn && vn.fire && Number(vn.fire[fields.layout]);
      if (lim && Number(fields.guests) > lim) {
        if (items.capacity === "pass") return (err.textContent = `${fields.guests} is over the fire limit of ${lim} for ${fields.venue} (${fields.layout}). Reduce numbers or mark "Numbers within limit" as Fail.`);
        rec.overCapacity = { limit: lim };
      }
    }
    if (id === "weekly_alarm") { const w = rotaWeek(rotaIndex(date)); if (w.i >= 0) rec.rota = { wc: w.wc, plannedDay: w.day, plannedMarshal: w.marshal }; }
    if (past) Object.assign(rec, { imported: true, source: val("__source"), sourceRef: val("__sourceRef"), doneBy: val("__doneBy") });
    try {
      $("#ck-save", m).disabled = true;
      if (past) {
        const sfi = $("[data-k=__scanfile]", m);
        if (sfi && sfi.files[0]) {
          err.textContent = "Uploading scan…";
          const file = await upload("scans", sfi.files[0]);
          rec.scanId = await add("registers", { kind: "scan", title: `${c.name} — ${sfi.files[0].name}`, checkType: id, period: date.slice(0, 7), file });
          rec.scanFile = file;
        } else if (val("__scan")) { const sx = S.data.registers.find((x) => x.id === val("__scan")); rec.scanId = sx.id; rec.scanFile = sx.file || null; }
      }
      const rid = await add("records", rec);
      if (val("__mkact") && !past) {
        for (const [k, l] of c.items.filter(([k]) => items[k] === "fail")) {
          await add("actions", { ref: nextRef("C"), title: `${c.short}: ${l} — failed`, detail: notes, category: "Other", priority: "High", owner: "", due: addDays(today(), 7),
            status: "Not started", source: `${c.ref} on ${fds(date)}`, recordId: rid, history: [{ at: Date.now(), by: S.user.name, status: "Not started", note: "Raised from a failed check" }] });
        }
      }
      m.close(); toast("Saved under " + S.user.name);
    } catch (e) { $("#ck-save", m).disabled = false; err.textContent = "Could not save: " + e.message; }
  };
}
function nextRef(prefix) {
  const n = S.data.actions.map((a) => String(a.ref || "")).filter((r) => r.startsWith(prefix)).map((r) => parseInt(r.slice(prefix.length), 10) || 0);
  return prefix + (Math.max(0, ...n) + 1);
}

/* ============================================================ LOGBOOK */
VIEWS.log = () => {
  const f = S.f.log || (S.f.log = { type: "", month: "", q: "" });
  const months = Array.from(new Set(S.data.records.map((r) => (r.date || "").slice(0, 7)))).sort().reverse();
  let rows = S.data.records.filter((r) => !r.correctionOf).slice();
  if (f.type) rows = rows.filter((r) => r.type === f.type);
  if (f.month) rows = rows.filter((r) => (r.date || "").startsWith(f.month));
  if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter((r) => JSON.stringify([r.byName, r.doneBy, r.notes, r.fields, r.source, r.sourceRef]).toLowerCase().includes(q)); }
  rows.sort((a, b) => natRef(b.date, a.date) || ms(b.createdAt) - ms(a.createdAt));
  return `<h2>Fire safety <span class="fl">logbook</span></h2>
  <p class="lead">Every check, test, drill and alarm event. Records cannot be edited or deleted — a mistake is put right with a correction, which keeps the original.</p>
  <div class="row" style="margin-bottom:10px">
    <select id="lf-type" style="width:auto"><option value="">All checks</option>${HF_CHECKS.map((c) => `<option value="${c.id}" ${f.type === c.id ? "selected" : ""}>${h(c.name)}</option>`).join("")}</select>
    <select id="lf-month" style="width:auto"><option value="">All months</option>${months.map((mo) => `<option ${f.month === mo ? "selected" : ""} value="${mo}">${MON[+mo.slice(5) - 1]} ${mo.slice(0, 4)}</option>`).join("")}</select>
    <input id="lf-q" placeholder="Search name, note, call point…" value="${h(f.q)}" style="width:240px">
    <span class="muted">${rows.length} record${rows.length === 1 ? "" : "s"}</span>
  </div>
  <div class="tw"><table><tr><th>Date</th><th>Check</th><th>Detail</th><th>Result</th><th>Done by</th><th>Saved</th></tr>
  ${rows.map((r) => { const c = CHECK[r.type] || { name: r.type }; const corr = S.data.records.find((x) => x.correctionOf === r.id);
    const fl = r.fields || {};
    const det = r.type === "weekly_alarm" ? `Call point ${h(fl.callpoint)} · zone ${h(fl.zone)} · ${h(fl.time)}` : r.type === "drill" ? `${h(fl.shift)} · ${h(fl.evac)} min · ${h(fl.staff)} staff` : r.type === "alarm_event" ? `${h(fl.kind)} · ${h(fl.zone)}` : r.type === "contractor" ? `${h(fl.contractor)} · ${h(fl.jobref)}` : h((r.notes || "").slice(0, 70));
    const late = !r.imported && daysBetween(r.date, ymd(new Date(ms(r.createdAt)))) > 0;
    return `<tr data-id="${r.id}" style="cursor:pointer"><td><b>${fds(r.date)}</b></td><td>${h(c.name)}${r.imported ? `<span class="imp">PAST RECORD</span>` : ""}${corr ? `<span class="imp" style="background:var(--ambbg);color:var(--amber)">CORRECTED</span>` : ""}</td>
      <td>${det}</td><td>${resultOf(effective(r)).includes("fail") ? pill(resultOf(effective(r))) : h(resultOf(effective(r)))}</td><td>${h(r.imported ? r.doneBy : r.byName)}</td>
      <td class="muted">${fdt(r.createdAt)}${late ? " (late)" : ""}${r.imported ? `<br>by ${h(r.byName)} from ${h(r.source)}` : ""}</td></tr>`; }).join("") || `<tr><td colspan="6" class="muted">No records.</td></tr>`}
  </table></div>`;
};
BIND.log = (v) => {
  const f = S.f.log;
  $("#lf-type", v).onchange = (e) => { f.type = e.target.value; render(); };
  $("#lf-month", v).onchange = (e) => { f.month = e.target.value; render(); };
  $("#lf-q", v).onchange = (e) => { f.q = e.target.value; render(); };
  $$("tr[data-id]", v).forEach((tr) => (tr.onclick = () => viewRecord(tr.dataset.id)));
};
function recordHTML(r) {
  const c = CHECK[r.type] || { name: r.type, fields: [], items: [] };
  return `<table>
    <tr><td style="width:38%"><b>Date of check</b></td><td>${fd(r.date)}</td></tr>
    <tr><td><b>Done by</b></td><td>${h(r.imported ? r.doneBy : r.byName)}</td></tr>
    <tr><td><b>Saved</b></td><td>${fdt(r.createdAt)} by ${h(r.byName)}</td></tr>
    ${r.imported ? `<tr><td><b>Source</b></td><td>${h(r.source)} — ${h(r.sourceRef)}</td></tr>` : ""}
    ${r.rota ? `<tr><td><b>Rota</b></td><td>Planned ${fds(r.rota.plannedDay)} · ${h(r.rota.plannedMarshal)}</td></tr>` : ""}
    ${c.fields.map(([k, l]) => `<tr><td><b>${h(l)}</b></td><td>${h((r.fields || {})[k])}</td></tr>`).join("")}
    ${c.items.map(([k, l, must]) => `<tr><td>${must ? "★ " : ""}${h(l)}</td><td>${pill({ pass: "Pass", fail: "Fail", na: "N/A" }[(r.items || {})[k]] || "—")}</td></tr>`).join("")}
    <tr><td><b>Notes</b></td><td>${h(r.notes)}</td></tr></table>`;
}
function viewRecord(id) {
  const r = S.data.records.find((x) => x.id === id); if (!r) return;
  const corr = S.data.records.filter((x) => x.correctionOf === id);
  const m = modal(`<h3>${h((CHECK[r.type] || {}).name || r.type)}${r.imported ? ' <span class="imp">PAST RECORD</span>' : ""}</h3>${recordHTML(r)}
    ${corr.map((c) => `<div class="note"><b>Correction</b> saved ${fdt(c.createdAt)} by ${h(c.byName)}:<br>${h(c.notes)}</div>`).join("")}
    ${r.scanFile ? `<p><a href="#" id="scan-open">📎 View the scanned testing sheet</a></p>` : ""}
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="corr">Add a correction</button><button class="btn" data-close>Close</button></div>`);
  const so = $("#scan-open", m); if (so) so.onclick = (e) => { e.preventDefault(); openFile(r.scanFile); };
  $("#corr", m).onclick = () => {
    m.close();
    const m2 = modal(`<h3>Correction</h3><p class="muted">The original record stays as it is. Explain what was wrong and what is correct.</p>
      <textarea id="cn"></textarea><div class="row" style="margin-top:10px"><button class="btn red" id="cs">Save correction</button><button class="btn ghost" data-close>Cancel</button></div>`);
    $("#cs", m2).onclick = async () => {
      const t = $("#cn", m2).value.trim(); if (!t) return;
      await add("records", { type: r.type, date: r.date, correctionOf: r.id, notes: t, fields: r.fields || {}, items: r.items || {} });
      m2.close(); toast("Correction saved");
    };
  };
}

/* ============================================================ WEEKLY TESTS (rota) */
VIEWS.rota = () => {
  const ci = Math.max(0, rotaIndex(today()));
  const from = Math.max(0, ci - 6), to = ci + 20;
  const weeks = []; for (let i = from; i <= to; i++) weeks.push(rotaWeek(i));
  const pre = recs("weekly_alarm").filter((r) => r.date < rotaStart()).sort((a, b) => natRef(b.date, a.date));
  const ms4 = marshals();
  return `<h2>Weekly fire alarm <span class="fl">tests</span></h2>
  <p class="lead">One call point each week (BS 5839-1). The day rotates Monday → Tuesday → Wednesday and the marshal rotates each week. If the planned marshal is away, another marshal does the test under their own name.</p>
  <div class="grid g4" style="margin-bottom:12px">${ms4.map((n) => { const mine = recs("weekly_alarm").filter((r) => (r.imported ? r.doneBy : r.byName) === n);
    return `<div class="card tile"><div class="l">${h(n)}</div><div class="n" style="font-size:24px">${mine.length}</div><div class="muted">tests recorded · last ${mine.length ? fds(mine.sort((a, b) => natRef(b.date, a.date))[0].date) : "—"}</div></div>`; }).join("")}</div>
  <div class="tw"><table><tr><th>Week commencing</th><th>Planned day</th><th>Planned marshal</th><th>Status</th><th>Actual test</th><th>Done by</th></tr>
  ${weeks.map((w) => { const s = weekStatus(w); const r = s.rec; const fl = (r && r.fields) || {};
    return `<tr style="${w.i === ci ? "background:#fff7f5" : ""}"><td>${fds(w.wc)}${w.i === ci ? " <b style='color:var(--red)'>this week</b>" : ""}</td><td>${h(w.dayName)} ${fds(w.day)}</td><td>${h(w.marshal)}</td><td>${pill(s.st)}</td>
    <td>${r ? `${fd(r.date)} ${h(fl.time || "")} · CP ${h(fl.callpoint || "")}` : (s.st === "Due" || s.st === "Overdue") ? `<button class="btn red sm" data-rec="weekly_alarm">Record</button>` : ""}</td><td>${r ? h(r.imported ? r.doneBy : r.byName) : ""}</td></tr>`; }).join("")}
  </table></div>
  <h3>Before the rota started (${fds(rotaStart())})</h3>
  ${pre.length ? `<div class="tw"><table><tr><th>Date</th><th>Call point</th><th>Done by</th><th>Source</th></tr>${pre.map((r) => `<tr><td>${fd(r.date)}</td><td>${h((r.fields || {}).callpoint)}</td><td>${h(r.imported ? r.doneBy : r.byName)}</td><td>${r.imported ? `<span class="imp">PAST RECORD</span> ${h(r.source)} — ${h(r.sourceRef)}` : "Recorded in HosFIRE"}</td></tr>`).join("")}</table></div>`
    : `<p class="muted">None entered. Tests carried out before the rota started can be entered from the panel event log or Saeker by a fire safety manager (Record a check → Enter a past record from a source).</p>`}`;
};
BIND.rota = bindRec;


/* ============================================================ BACK-RECORDS (Feb 2026 → rota start) */
const BACK_WEEKLY = ["weekly_alarm", "el_weekly", "doors_weekly", "kitchen", "spa"];
const BACK_MONTHLY = ["el_monthly", "doors_monthly", "extinguishers", "co_alarm", "walkround"];
function backWeeks() { const out = []; for (let wc = mondayOf(HF_BACKFILL_FROM); wc < rotaStart() && wc <= today(); wc = addDays(wc, 7)) out.push(wc); return out; }
function backMonths() { const out = []; for (let m = HF_BACKFILL_FROM.slice(0, 8) + "01"; m < rotaStart() && m <= today(); m = addMonths(m, 1)) out.push(m); return out; }
const inRange = (type, a, b) => recs(type).filter((r) => r.date >= a && r.date <= b);
VIEWS.back = () => {
  const W = backWeeks(), M = backMonths();
  const cell = (type, a, b) => { const r = inRange(type, a, b); return r.length ? `<td style="background:var(--okbg)"><b style="color:var(--ok)">✓ ${fds(r[0].date).replace(/ \d{4}$/, "")}${r[0].scanFile ? " 📎" : ""}</b><br><span class="muted">${h(r[0].doneBy || r[0].byName)}</span></td>`
    : `<td>${isAdmin() ? `<button class="btn sm ghost" data-bf="${type}" data-a="${a}" data-b="${b}">Enter</button>` : `<span class="muted">—</span>`}</td>`; };
  const doneW = W.filter((wc) => inRange("weekly_alarm", wc, addDays(wc, 6)).length).length;
  return `<h2>Back-records <span class="fl">February to October 2026</span></h2>
  <p class="lead">Every week and month from ${fd(HF_BACKFILL_FROM)} until the rota starts on ${fds(rotaStart())}. A slot turns green only when a record is entered from evidence — a scanned testing sheet (📎) or Saeker — so the inspector can see exactly what is evidenced.</p>
  <div class="grid g4" style="margin-bottom:12px">
    <div class="card tile ${doneW === W.length ? "g" : "a"}"><div class="n">${doneW} / ${W.length}</div><div class="l">Weekly alarm tests entered</div></div>
    <div class="card tile"><div class="n">${S.data.records.filter((r) => r.imported && r.date < rotaStart()).length}</div><div class="l">Back-records entered in total</div></div>
  </div>
  ${isAdmin() ? `<div class="card" style="margin-bottom:14px"><h3 style="margin-top:0">Fastest way: import the Saeker export</h3>
    <p class="muted">Export the completed tasks from Saeker as a CSV file (Feb 2026 to date) and load it here. You match each Saeker task name to a HosFIRE check, then every completed task becomes a back-record with its Saeker reference. Nothing is created for weeks Saeker does not show.</p>
    <input type="file" id="sk-file" accept=".csv,text/csv"><div id="sk-map"></div></div>
  <div class="card" style="margin-bottom:14px"><h3 style="margin-top:0">Scanned testing sheets</h3>
    <p class="muted">Upload each scanned sheet with the check and month it covers. Then click "Enter" in the grid below and pick the scan: every entry made from it links back to the sheet, and the inspector pack lists it as the source.</p>
    <div class="f2"><div><label>Check on the sheet</label><select id="sc-type"><option value="">Several / mixed</option>${HF_CHECKS.map((c) => `<option value="${c.id}">${h(c.name)}</option>`).join("")}</select></div>
    <div><label>Month covered</label><input type="month" id="sc-month" min="2026-02" max="${today().slice(0, 7)}"></div></div>
    <label>Scanned files (PDF or photos — you can choose several)</label><input type="file" id="sc-files" multiple accept="image/*,.pdf">
    <button class="btn red" id="sc-up" style="margin-top:8px">Upload scans</button> <span class="muted" id="sc-msg"></span>
    ${reg("scan").length ? `<div class="tw" style="margin-top:10px"><table><tr><th>Scan</th><th>Check</th><th>Month</th><th>Entries made from it</th><th></th></tr>
    ${reg("scan").sort((a, b) => natRef(a.period, b.period)).map((x) => { const n = S.data.records.filter((r) => r.scanId === x.id).length;
      return `<tr><td>${h(x.title)}</td><td>${h((CHECK[x.checkType] || {}).name || "Several")}</td><td>${x.period ? MON[+x.period.slice(5) - 1] + " " + x.period.slice(0, 4) : ""}</td><td>${n ? n : pill("None yet")}</td><td>${x.file ? `<a href="#" data-scan="${x.id}">View</a>` : ""}</td></tr>`; }).join("")}</table></div>` : ""}
  </div>
  <div class="card" style="margin-bottom:14px"><h3 style="margin-top:0">Import transcribed paper sheets</h3>
    <p class="muted">For a batch of scanned sheets that has been typed up into a HosFIRE paper-sheets file (.json). Choose the .json file <b>and</b> all the single-page PDFs together. Every sheet is uploaded as a scan; a past record is created only for the rows you tick. Rows with an overwritten date or no name are left unticked — the person who did the check confirms the date and name before you tick them.</p>
    <input type="file" id="pi-files" multiple accept=".json,application/json,.pdf,application/pdf"><div id="pi-box"></div></div>` : ""}
  <h3>Weekly checks</h3>
  <div class="tw"><table><tr><th>Week commencing</th>${BACK_WEEKLY.map((t) => `<th>${h(CHECK[t].short)}</th>`).join("")}</tr>
  ${W.map((wc) => `<tr><td><b>${fds(wc)}</b></td>${BACK_WEEKLY.map((t) => cell(t, wc, addDays(wc, 6))).join("")}</tr>`).join("")}</table></div>
  <h3>Monthly checks</h3>
  <div class="tw"><table><tr><th>Month</th>${BACK_MONTHLY.map((t) => `<th>${h(CHECK[t].short)}</th>`).join("")}</tr>
  ${M.map((m) => `<tr><td><b>${MON[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}</b></td>${BACK_MONTHLY.map((t) => cell(t, m, addDays(addMonths(m, 1), -1))).join("")}</tr>`).join("")}</table></div>`;
};
/* Import a typed-up batch of paper sheets (hosfire-paper-sheets JSON + one PDF per sheet) */
function bindPaperImport(v) {
  const inp = $("#pi-files", v), box = $("#pi-box", v); if (!inp) return;
  inp.onchange = async () => {
    const files = Array.from(inp.files), jf = files.find((f) => /\.json$/i.test(f.name));
    if (!jf) { box.innerHTML = `<p class="err">Include the .json file with the PDFs.</p>`; return; }
    let man; try { man = JSON.parse(await jf.text()); } catch (e) { box.innerHTML = `<p class="err">The .json file could not be read.</p>`; return; }
    if (man.kind !== "hosfire-paper-sheets" || !Array.isArray(man.entries)) { box.innerHTML = `<p class="err">This is not a HosFIRE paper-sheets file.</p>`; return; }
    S.hold = true;
    const pdf = {}; files.forEach((f) => (pdf[f.name] = f));
    const E = man.entries.map((e, i) => {
      const scan = reg("scan").find((x) => x.sourceFile === e.file);
      const rec = S.data.records.find((r) => r.imported && r.sourceRef === e.sourceRef);
      return { ...e, i, f: pdf[e.file], scan, rec };
    });
    const missing = E.filter((e) => !e.f && !e.scan).length;
    box.innerHTML = `<p class="muted">${E.length} sheets in ${h(jf.name)} · ${E.filter((e) => e.ready).length} ready to import · ${E.filter((e) => e.type && !e.ready).length} need a date or name confirmed · ${E.filter((e) => !e.type).length} scan only${missing ? ` · <b style="color:var(--red)">${missing} PDF${missing === 1 ? "" : "s"} not chosen</b>` : ""}</p>
    <div class="tw"><table><tr><th>Import</th><th>Sheet</th><th>Check</th><th>Date on sheet</th><th>Date</th><th>Done by</th><th>Points to check</th></tr>
    ${E.map((e) => `<tr ${e.rec ? 'style="opacity:.55"' : ""}><td>${!e.type ? "Scan only" : e.rec ? pill("Done") : `<input type="checkbox" data-pp="${e.i}" style="width:auto" ${e.ready ? "checked" : ""}>`}</td>
      <td>${h(e.sourceRef)}${e.f ? ` <a href="#" data-ppv="${e.i}">view</a>` : e.scan ? " (held)" : ' <span style="color:var(--red)">PDF missing</span>'}</td>
      <td>${h(e.type ? CHECK[e.type].short : e.title)}${e.fields && e.fields.callpoint ? `<br><span class="muted">${h(e.fields.callpoint)}</span>` : ""}</td>
      <td>${h(e.dateRead)}</td>
      <td>${e.type && !e.rec ? `<input type="date" data-ppd="${e.i}" value="${h(e.date || "")}" max="${addDays(today(), -1)}" style="min-width:130px">` : fds(e.date || "") || "—"}</td>
      <td>${e.type && !e.rec ? `<input data-ppn="${e.i}" value="${h(e.doneBy || "")}" placeholder="${e.signed ? "Signed — name not printed" : "Not signed"}" style="min-width:130px">` : h(e.doneBy || (e.rec && e.rec.doneBy) || "—")}</td>
      <td style="font-size:12px">${e.flags.length ? e.flags.map((x) => `• ${h(x)}`).join("<br>") : '<span class="muted">Clear, named and signed</span>'}</td></tr>`).join("")}</table></div>
    <label class="row" style="text-transform:none;font-size:14px;color:var(--ink);margin-top:10px"><input type="checkbox" id="pi-ok" style="width:auto">
      I have compared each ticked row with its scan. Any date or name not clear on the sheet has been confirmed by the person who did the check.</label>
    <button class="btn ghost sm" id="pi-all" style="margin-top:8px">Tick all rows</button> <button class="btn ghost sm" id="pi-none" style="margin-top:8px">Untick all</button><br>
    <button class="btn red" id="pi-go" style="margin-top:8px">Upload scans and create ticked records</button> <button class="btn ghost" id="pi-x">Cancel</button> <span class="muted" id="pi-msg"></span>`;
    $$("[data-ppv]", box).forEach((a) => (a.onclick = (ev) => { ev.preventDefault(); window.open(URL.createObjectURL(E[+a.dataset.ppv].f), "_blank"); }));
    $("#pi-all", box).onclick = () => $$("[data-pp]", box).forEach((c) => (c.checked = true));
    $("#pi-none", box).onclick = () => $$("[data-pp]", box).forEach((c) => (c.checked = false));
    $("#pi-x", box).onclick = () => { S.hold = false; inp.value = ""; render(); };
    $("#pi-go", box).onclick = async () => {
      const msg = $("#pi-msg", box);
      const pick = E.filter((e) => e.type && !e.rec && $(`[data-pp="${e.i}"]`, box) && $(`[data-pp="${e.i}"]`, box).checked);
      for (const e of pick) {
        e.useDate = $(`[data-ppd="${e.i}"]`, box).value; e.useBy = $(`[data-ppn="${e.i}"]`, box).value.trim();
        if (!e.useDate || e.useDate >= today()) { msg.textContent = `${e.sourceRef}: enter a past date, or untick it.`; return; }
        if (!e.useBy) { msg.textContent = `${e.sourceRef}: enter who did the check, or untick it.`; return; }
      }
      if (pick.length && !$("#pi-ok", box).checked) { msg.textContent = "Tick the confirmation box."; return; }
      $("#pi-go", box).disabled = true; let ns = 0, nr = 0;
      try {
        for (const e of E) {
          if (!e.scan && e.f) {
            msg.textContent = `Uploading scan ${ns + 1}…`;
            const file = S.live ? await upload("scans", e.f) : null;
            const sid = await add("registers", { kind: "scan", title: `${e.title} — ${e.sourceRef} (sheet date ${e.dateRead})`, checkType: e.type || "", period: (e.date || "2026-08").slice(0, 7),
              file, sourceFile: e.file, flags: e.flags || [] });
            e.scan = { id: sid, file }; ns++;
          }
        }
        for (const e of pick) {
          if (!e.scan) continue;
          const extra = [];
          if (!e.dateClear || e.useDate !== e.date) extra.push(`Date ${fds(e.useDate)} confirmed on import by ${S.user.name}; the sheet reads "${e.dateRead}".`);
          if (e.useBy !== (e.doneBy || "")) extra.push(`Name "${e.useBy}" confirmed on import by ${S.user.name}; ${e.doneBy ? `the sheet reads "${e.doneBy}"` : e.signed ? "the sheet is signed but no name is printed" : "the sheet has no name or signature"}.`);
          await add("records", { type: e.type, ref: CHECK[e.type].ref, date: e.useDate, fields: e.fields || {}, items: e.items || {}, notes: [e.notes, ...extra].join(" "),
            imported: true, source: man.source || HF_SOURCES.find((x) => /paper/i.test(x)), sourceRef: e.sourceRef, doneBy: e.useBy, scanId: e.scan.id, scanFile: e.scan.file || null });
          nr++; msg.textContent = `Created ${nr} of ${pick.length} records…`;
        }
        audit(`Paper sheets imported from ${jf.name}: ${ns} scan(s) uploaded, ${nr} past record(s) created`);
        S.hold = false; inp.value = ""; render(); toast(`${ns} scans uploaded · ${nr} records created`);
      } catch (err) { $("#pi-go", box).disabled = false; msg.textContent = "Stopped: " + err.message + " — run it again; anything already done is skipped."; }
    };
  };
}
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
function parseDateTime(s) {
  s = String(s || "").trim(); let m, d = null, t = "";
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) d = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) d = `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const tm = s.match(/(\d{1,2}):(\d{2})/); if (tm && d) t = `${pad(tm[1])}:${tm[2]}`;
  return d && parse(d) && !isNaN(parse(d)) ? { d, t } : null;
}
BIND.back = (v) => {
  $$("[data-bf]", v).forEach((b) => (b.onclick = () => openCheck(b.dataset.bf, { past: true, min: b.dataset.a, max: b.dataset.b })));
  $$("[data-scan]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openFile(S.data.registers.find((x) => x.id === a.dataset.scan).file); }));
  const up = $("#sc-up", v);
  if (up) up.onclick = async () => {
    const files = Array.from($("#sc-files", v).files), type = $("#sc-type", v).value, mo = $("#sc-month", v).value, msg = $("#sc-msg", v);
    if (!files.length || !mo) { msg.textContent = "Choose the month and at least one file."; return; }
    S.hold = true; let n = 0;
    try {
      for (const f of files) { msg.textContent = `Uploading ${n + 1} of ${files.length}…`; const file = await upload("scans", f);
        await add("registers", { kind: "scan", title: `${type ? CHECK[type].short : "Testing sheet"} ${MON[+mo.slice(5) - 1]} ${mo.slice(0, 4)} — ${f.name}`, checkType: type, period: mo, file }); n++; }
      audit(`Uploaded ${n} scanned testing sheet(s) for ${mo}`);
      S.hold = false; render(); toast(`${n} scan${n === 1 ? "" : "s"} uploaded`);
    } catch (e) { S.hold = false; render(); toast("Upload stopped: " + e.message); }
  };
  bindPaperImport(v);
  const fi = $("#sk-file", v); if (!fi) return;
  fi.onchange = async () => {
    const file = fi.files[0]; if (!file) return;
    const rows = parseCSV(await file.text()); if (rows.length < 2) { $("#sk-map", v).innerHTML = `<p class="err">No rows found in the file.</p>`; return; }
    const head = rows[0], data = rows.slice(1);
    const pick = (res) => { for (const re of res) { const i = head.findIndex((x) => re.test(x.trim())); if (i >= 0) return i; } return -2; };
    const G = { date: pick([/^(completed|done) ?(date|on|at)/i, /date/i, /^completed$/i]), task: pick([/^task( name| title)?$/i, /title|task name/i, /^(name|check)$/i, /task/i]),
      by: pick([/completed by|done by/i, /^(user|staff|assignee|by)$/i, /assign|user|staff/i]), ref: pick([/task ?id|^id$/i, /ref|number|no\.?$/i]), status: pick([/status|state/i]) };
    const colSel = (id, label, g, optional) => `<div><label>${label}</label><select id="${id}">${optional ? `<option value="-1">(none)</option>` : ""}${head.map((x, i) => `<option value="${i}" ${i === g ? "selected" : ""}>${h(x)}</option>`).join("")}</select></div>`;
    const box = $("#sk-map", v);
    box.innerHTML = `<p class="muted">${data.length} rows in ${h(file.name)}. Choose the columns:</p>
      <div class="f2">${colSel("sk-date", "Date completed", G.date)}${colSel("sk-task", "Task name", G.task)}
      ${colSel("sk-by", "Completed by", G.by)}${colSel("sk-ref", "Saeker task ID / reference", G.ref, true)}
      ${colSel("sk-status", "Status column (optional)", G.status, true)}<div><label>Status value meaning completed</label><input id="sk-done" value="Completed"></div></div>
      <button class="btn" id="sk-next" style="margin-top:10px">Next: match task names</button><div id="sk-tasks"></div>`;
    $("#sk-next", box).onclick = () => {
      const ci = (id) => +$("#" + id, box).value;
      const [cD, cT, cB, cR, cS] = ["sk-date", "sk-task", "sk-by", "sk-ref", "sk-status"].map(ci), doneVal = $("#sk-done", box).value.trim().toLowerCase();
      const ok = data.filter((r) => cS < 0 || String(r[cS] || "").trim().toLowerCase() === doneVal);
      const names = Array.from(new Set(ok.map((r) => String(r[cT] || "").trim()).filter(Boolean))).sort();
      const auto = (n) => { const x = n.toLowerCase();
        if (/alarm|call ?point|mcp/.test(x) && !/event|false/.test(x)) return "weekly_alarm"; if (/emergency light|e\.?l\.?\b/.test(x)) return /month/.test(x) ? "el_monthly" : "el_weekly";
        if (/door/.test(x)) return /month/.test(x) ? "doors_monthly" : "doors_weekly"; if (/extinguish/.test(x)) return "extinguishers"; if (/extract|filter|kitchen|ansul/.test(x)) return "kitchen";
        if (/lint|dryer|laundry/.test(x)) return "laundry"; if (/spa|sauna|pool/.test(x)) return "spa"; if (/\bco\b|carbon|gas/.test(x)) return "co_alarm"; if (/drill|evacuat/.test(x)) return "drill";
        if (/walk|audit|inspection/.test(x)) return "walkround"; if (/daily|exit|route/.test(x)) return "daily"; return ""; };
      $("#sk-tasks", box).innerHTML = `<p class="muted">${ok.length} completed rows, ${names.length} different task names. Match each to a HosFIRE check, or leave as "Ignore".</p>
        <div class="tw"><table><tr><th>Saeker task name</th><th>Rows</th><th>HosFIRE check</th></tr>${names.map((n, i) => `<tr><td>${h(n)}</td><td>${ok.filter((r) => String(r[cT]).trim() === n).length}</td>
        <td><select data-tn="${i}"><option value="">Ignore</option>${HF_CHECKS.map((c) => `<option value="${c.id}" ${auto(n) === c.id ? "selected" : ""}>${h(c.name)}</option>`).join("")}</select></td></tr>`).join("")}</table></div>
        <label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="sk-conf" style="width:auto"> I confirm this file is an export from Saeker and has not been edited.</label>
        <button class="btn red" id="sk-go" style="margin-top:8px">Import</button> <span class="muted" id="sk-msg"></span>`;
      $("#sk-go", box).onclick = async () => {
        const msg = $("#sk-msg", box); if (!$("#sk-conf", box).checked) { msg.textContent = "Tick the confirmation box."; return; }
        const map = {}; $$("[data-tn]", box).forEach((s) => { if (s.value) map[names[+s.dataset.tn]] = s.value; });
        let n = 0, skip = 0, bad = 0; $("#sk-go", box).disabled = true; S.hold = true;
        for (let i = 0; i < data.length; i++) {
          const r = data[i]; if (!ok.includes(r)) continue;
          const type = map[String(r[cT] || "").trim()]; if (!type) continue;
          const dt = parseDateTime(r[cD]); if (!dt || dt.d >= today()) { bad++; continue; }
          const sref = `${file.name} row ${i + 2}${cR >= 0 && r[cR] ? " · Saeker " + String(r[cR]).trim() : ""}`;
          if (S.data.records.some((x) => x.type === type && x.date === dt.d && x.sourceRef === sref)) { skip++; continue; }
          await add("records", { type, ref: CHECK[type].ref, date: dt.d, fields: dt.t ? { time: dt.t } : {}, items: {}, imported: true, source: "Saeker task history",
            sourceRef: sref, doneBy: String(r[cB] || "").trim(), saekerTask: String(r[cT]).trim(),
            notes: `Saeker shows task "${String(r[cT]).trim()}" completed. Individual check items were not recorded in Saeker.` });
          n++; if (n % 20 === 0) msg.textContent = `Imported ${n}…`;
        }
        audit(`Saeker import from ${file.name}: ${n} back-records${skip ? `, ${skip} already there` : ""}${bad ? `, ${bad} rows with no usable date` : ""}`);
        S.hold = false; render();
        const done = `Imported ${n} back-records from Saeker${skip ? `, ${skip} already there` : ""}${bad ? `, ${bad} rows skipped (no usable date)` : ""}.`;
        modal(`<h3>Saeker import finished</h3><p>${h(done)}</p><button class="btn" data-close>OK</button>`);
      };
    };
  };
};

/* ============================================================ ACTIONS */
VIEWS.actions = () => {
  const f = S.f.act || (S.f.act = { cat: "", st: "open", q: "" });
  let rows = S.data.actions.slice();
  if (f.cat) rows = rows.filter((a) => a.category === f.cat);
  if (f.pri) rows = rows.filter((a) => a.priority === f.pri);
  if (f.st === "open") rows = rows.filter((a) => a.status !== "Completed"); else if (f.st) rows = rows.filter((a) => a.status === f.st);
  if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter((a) => JSON.stringify([a.ref, a.title, a.detail, a.owner, a.notes]).toLowerCase().includes(q)); }
  const pr = { High: 0, Medium: 1, Low: 2 }, so = { "Not started": 0, "In progress": 1, "Completed": 2 };
  rows.sort((a, b) => (so[a.status] - so[b.status]) || (pr[a.priority] - pr[b.priority]) || natRef(a.ref, b.ref));
  const cnt = (s) => S.data.actions.filter((a) => a.status === s).length;
  return `<h2>Action <span class="fl">tracker</span></h2>
  <p class="lead">Every fire safety action in one line: FRA actions A1–A19, Leader Systems work, emergency lighting, gas appliances and anything raised from a failed check. Change the status in the line; each change is logged with your name.</p>
  <div class="grid g4" style="margin-bottom:12px">
    <div class="card tile ctile ${f.st === "" ? "on" : ""}" data-ast=""><div class="n">${S.data.actions.length ? Math.round(S.data.actions.reduce((t, a) => t + progressOf(a), 0) / S.data.actions.length) : 0}%</div><div class="l">Overall progress — show all ${S.data.actions.length}</div></div>
    <div class="card tile r ctile ${f.st === "Not started" ? "on" : ""}" data-ast="Not started"><div class="n">${cnt("Not started")}</div><div class="l">Not started</div></div>
    <div class="card tile a ctile ${f.st === "In progress" ? "on" : ""}" data-ast="In progress"><div class="n">${cnt("In progress")}</div><div class="l">In progress</div></div>
    <div class="card tile g ctile ${f.st === "Completed" ? "on" : ""}" data-ast="Completed"><div class="n">${cnt("Completed")}</div><div class="l">Completed</div></div>
  </div>
  <div class="tabs2">${["", ...HF_ACTION_CATS].map((c) => `<button data-cat="${h(c)}" class="${f.cat === c ? "on" : ""}">${c || "All"} (${c ? S.data.actions.filter((a) => a.category === c).length : S.data.actions.length})</button>`).join("")}</div>
  <div class="row" style="margin-bottom:10px">
    <select id="af-st" style="width:auto">${[["open", "Open (not completed)"], ["", "All statuses"], ...HF_STATUS.map((s) => [s, s])].map(([v, l]) => `<option value="${v}" ${f.st === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <input id="af-q" placeholder="Search…" value="${h(f.q)}" style="width:220px">${f.pri ? `<span class="pill p-red">${h(f.pri)} priority only <a href="#" id="af-pri" style="color:inherit">✕</a></span>` : ""}<div class="grow"></div>
    <button class="btn red" id="a-new">+ Add action</button>
  </div>
  <div class="tw"><table><tr><th style="width:56px">Ref</th><th>Action</th><th>Category</th><th>Priority</th><th>Owner</th><th>Due</th><th style="width:150px">Status</th><th style="width:150px">Progress</th><th>Last update</th></tr>
  ${rows.map((a) => { const late = a.due && a.status !== "Completed" && a.due < today(); const last = (a.history || []).slice(-1)[0];
    const sc = HF_SOURCE_OF(a);
    return `<tr style="box-shadow:inset 4px 0 0 ${sc.color}"><td><b style="color:${sc.color}">${h(a.ref)}</b><div><span class="pill" style="background:${sc.color};color:#fff;font-size:10px">${h(sc.label)}</span></div></td><td><a href="#" data-edit="${a.id}" style="color:var(--navy);font-weight:700;text-decoration:none">${h(a.title)}</a>${(a.photos || []).length ? ` <span class="pill p-navy" title="Photos from HosFIRE Mobile">📷 ${a.photos.length}</span>` : ""}${a.notes ? `<div class="muted">${h(a.notes)}</div>` : ""}</td>
    <td class="muted">${h(a.category)}</td><td>${pill(a.priority)}</td><td>${h(a.owner)}</td><td style="${late ? "color:var(--red);font-weight:700" : ""}">${a.due ? fds(a.due) : ""}</td>
    <td><select data-st="${a.id}" style="padding:6px;font-weight:700;color:${a.status === "Completed" ? "var(--ok)" : a.status === "In progress" ? "var(--amber)" : "var(--red)"}">${HF_STATUS.map((s) => `<option ${a.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td>
    <td><div class="pct">${[0, 25, 50, 75, 100].map((n) => `<button data-pct="${a.id}" data-n="${n}" class="${progressOf(a) === n ? "on" : ""}" title="Set ${n}%">${n}</button>`).join("")}</div>
    <a href="#" data-edit="${a.id}" style="text-decoration:none;color:inherit">${progBar(progressOf(a), 80)}${typeof a.pct === "number" && a.pct !== null && a.status !== "Completed" ? `<span class="muted">set by hand</span>` : (a.steps || []).length ? `<span class="muted">${a.steps.filter((x) => x.done).length} of ${a.steps.length} steps</span>` : ""}</a></td>
    <td class="muted">${last ? `${fdt(last.at)}<br>${h(last.by)}` : ""}</td></tr>`; }).join("") || `<tr><td colspan="9" class="muted">No actions match.</td></tr>`}
  </table></div>`;
};
BIND.actions = (v) => {
  const f = S.f.act;
  $$("[data-cat]", v).forEach((b) => (b.onclick = () => { f.cat = b.dataset.cat; render(); }));
  $$("[data-ast]", v).forEach((b) => (b.onclick = () => { f.st = b.dataset.ast; f.cat = ""; f.pri = ""; render(); const t = $(".tw", v); if (t) t.scrollIntoView({ behavior: "smooth" }); }));
  $("#af-st", v).onchange = (e) => { f.st = e.target.value; render(); };
  $("#af-q", v).onchange = (e) => { f.q = e.target.value; render(); };
  const ap = $("#af-pri", v); if (ap) ap.onclick = (e) => { e.preventDefault(); f.pri = ""; render(); };
  $("#a-new", v).onclick = () => editAction(null);
  $$("[data-edit]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); editAction(a.dataset.edit); }));
  $$("[data-pct]", v).forEach((b) => (b.onclick = async () => {
    const a = S.data.actions.find((x) => x.id === b.dataset.pct), n = +b.dataset.n;
    const status = n === 100 ? "Completed" : n === 0 ? (a.status === "Completed" ? "In progress" : a.status) : "In progress";
    const upd = { pct: n, status, history: (a.history || []).concat([{ at: Date.now(), by: S.user.name, status, note: `Progress set to ${n}%` }]) };
    if (status === "Completed" && a.status !== "Completed") upd.completedOn = today();
    await put("actions", a.id, upd); audit(`Action ${a.ref} progress → ${n}%`, a.ref); toast(`${a.ref}: ${n}%`);
  }));
  $$("[data-st]", v).forEach((s) => (s.onchange = () => {
    const a = S.data.actions.find((x) => x.id === s.dataset.st);
    const status = s.value;
    const m = modal(`<h3>${h(a.ref)} → ${h(status)}</h3><label>What has been done / evidence (optional)</label><textarea id="sn" placeholder="e.g. Leader job sheet T-09110 filed; photo uploaded to Documents"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn red" id="ss">Save</button><button class="btn ghost" data-close>Cancel</button></div>`);
    m.onclose = render;
    $("#ss", m).onclick = async () => {
      const note = $("#sn", m).value.trim();
      const history = (a.history || []).concat([{ at: Date.now(), by: S.user.name, status, note }]);
      const upd = { status, history }; if (status === "Completed") upd.completedOn = today();
      if (note) upd.notes = note;
      await put("actions", a.id, upd); audit(`Action ${a.ref} status → ${status}${note ? ": " + note : ""}`, a.ref); m.close(); toast("Updated");
    };
  }));
};
/* ============================================================ INSPECTION FOCUS */
function focusLists() {
  const ins = HF_HOTEL.inspection.date, open = (a) => a.status !== "Completed";
  const isBefore = (a) => ["Inspection", "Records"].includes(a.category) || (a.due && a.due <= ins);
  const before = S.data.actions.filter((a) => isBefore(a) && (open(a) || (a.completedOn || "") >= addDays(ins, -14)));
  const high = S.data.actions.filter((a) => open(a) && !isBefore(a) && a.priority === "High");
  return { before, high };
}
VIEWS.focus = () => {
  const ins = HF_HOTEL.inspection, { before, high } = focusLists();
  const at = parse(ins.date); const [hh, mm] = ins.time.split(":"); at.setHours(+hh, +mm, 0, 0);
  const hrs = Math.round((at - Date.now()) / 36e5), when = hrs > 48 ? `in ${Math.round(hrs / 24)} days` : hrs > 0 ? `in ${hrs} hour${hrs === 1 ? "" : "s"}` : "today";
  const done = before.filter((a) => a.status === "Completed").length, pc = before.length ? Math.round((done / before.length) * 100) : 100;
  const ord = (a, b) => (a.status === "Completed") - (b.status === "Completed") || natRef(a.due || "9999", b.due || "9999") || ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]) || natRef(a.ref, b.ref);
  const late = (a) => a.status !== "Completed" && a.due && a.due < today();
  const row = (a) => { const last = (a.history || []).filter((x) => x.note && !/starting data/i.test(x.note)).slice(-1)[0];
    return `<tr class="fx-row ${a.status === "Completed" ? "fx-done" : ""}" data-edit="${a.id}" title="Open this job">
      <td style="width:34px;font-size:18px;text-align:center">${a.status === "Completed" ? "✅" : a.status === "In progress" ? "🟠" : "⭕"}</td>
      <td><b>${h(a.ref)}</b> ${h(a.title)}${a.notes ? `<div class="muted" style="font-size:12px">${h(a.notes)}</div>` : ""}${last && last.note ? `<div style="font-size:12px;color:var(--navy)">Latest: ${h(last.note)} <span class="muted">(${h(last.by || "")}${last.at ? ", " + fdt(last.at) : ""})</span></div>` : ""}</td>
      <td>${h(a.owner || "—")}</td><td>${a.due ? `<span style="${late(a) ? "color:var(--red);font-weight:800" : ""}">${fds(a.due)}${late(a) ? " · late" : ""}</span>` : '<span class="muted">—</span>'}</td>
      <td>${pill(a.priority)}</td><td>${pill(a.status)}<div class="muted" style="font-size:11px">${progressOf(a)}%</div></td></tr>`; };
  const tbl = (L) => `<div class="tw"><table><tr><th></th><th>Job</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th></tr>${L.sort(ord).map(row).join("") || `<tr><td colspan="6" class="muted">Nothing here.</td></tr>`}</table></div>`;
  // readiness checks (not jobs)
  const site = cfg().site || {}, miss = [["assembly", "assembly point"], ["mainPanel", "main panel location"], ["spaPanel", "spa panel location"], ["granite", "Granite Leisure contact"]].filter(([k]) => !site[k]).map(([, l]) => l);
  const flagged = reg("scan").filter((x) => (x.flags || []).length && x.checkType && !S.data.records.some((r) => r.scanId === x.id)).length;
  const RC = HF_COURSES.find((c) => c[0] === "reception"), TR = reg("training"), rc = TR.filter((t) => courseApplies(t, RC)), rcOk = rc.filter((t) => (t.courses || {}).reception).length;
  const sg = signItems().filter((x) => !x.sig).length, notReady = HF_AUDIT.flatMap((g) => g.items).filter(([id]) => ((S.data.registers.find((r) => r.id === "audit-" + id) || {}).status || "Not ready") !== "Ready").length;
  const packed = S.data.audit.some((x) => /Inspector pack/.test(x.what || "") && ms(x.createdAt) >= parse(addDays(ins.date, -1)).getTime());
  const chk = [
    [!miss.length, "Site facts on the procedure pages", miss.length ? `Still blank: ${miss.join(", ")}` : "All filled in", "settings"],
    [!flagged, "Paper sheets confirmed and entered", flagged ? `${flagged} sheet${flagged === 1 ? "" : "s"} waiting for a confirmed date or name` : "All entered or none waiting", "back"],
    [rc.length && rcOk === rc.length, "Reception and night staff briefed on the alarm procedure", `${rcOk} of ${rc.length} recorded`, "training"],
    [!sg, "Signatures", sg ? `${sg} still to sign` : "All signed", "sign"],
    [!notReady, "Audit readiness checklist", notReady ? `${notReady} item${notReady === 1 ? "" : "s"} not marked Ready` : "All ready", "audit"],
    [packed, "Inspector pack printed and in the binder", packed ? "Printed since yesterday" : "Print it last, after today's updates", "pack"]];
  return `<div class="row"><div class="grow"><h2>Inspection <span class="fl">focus</span></h2>
    <p class="lead"><b>${fd(ins.date)} at ${h(ins.time)}</b> (${when}) — ${h(ins.inspector)}, ${h(ins.body)}. Everything to finish or have ready, in one place. Click any job to open it and update it.</p></div></div>
  <div class="grid g4" style="margin-bottom:12px">
    <div class="card tile ${pc === 100 ? "g" : "a"}"><div class="n">${done} / ${before.length}</div><div class="l">Jobs for the inspection done</div><div class="fx-bar"><i style="width:${pc}%"></i></div></div>
    <div class="card tile ${before.filter(late).length ? "r" : "g"}"><div class="n">${before.filter(late).length}</div><div class="l">Past their due date</div></div>
    <div class="card tile ${high.length ? "r" : "g"}"><div class="n">${high.length}</div><div class="l">Other high-priority jobs open</div></div>
    <div class="card tile ${chk.every((c) => c[0]) ? "g" : "a"}"><div class="n">${chk.filter((c) => c[0]).length} / ${chk.length}</div><div class="l">Readiness checks done</div></div>
  </div>
  <h3>1. Finish before the inspection</h3><p class="muted">Inspection and records jobs, and anything due by ${fds(ins.date)}. Completed ones stay listed (ticked) so you can see progress.</p>${tbl(before)}
  <h3>2. Have ready for the inspector</h3>
  <div class="tw"><table>${chk.map(([ok, t, d, tab]) => `<tr class="fx-row" data-gotab="${tab}" title="Open"><td style="width:34px;font-size:18px;text-align:center">${ok ? "✅" : "⭕"}</td><td><b>${h(t)}</b><div class="muted" style="font-size:12px">${h(d)}</div></td><td style="text-align:right;color:var(--navy);font-weight:700">Open →</td></tr>`).join("")}</table></div>
  <h3>3. Other high-priority jobs — be ready to explain</h3><p class="muted">These will not all be finished by tomorrow. What matters is that each one has an owner, a due date and an up-to-date note of where it stands.</p>${tbl(high)}`;
};
BIND.focus = (v) => {
  $$("[data-edit]", v).forEach((r) => (r.onclick = () => editAction(r.dataset.edit)));
  $$("[data-gotab]", v).forEach((r) => (r.onclick = () => { S.tab = r.dataset.gotab; render(); window.scrollTo(0, 0); }));
};
function editAction(id) {
  const a = id ? S.data.actions.find((x) => x.id === id) : { ref: nextRef("N"), status: "Not started", priority: "Medium", category: "Other" };
  const sel = (k, opts) => `<select data-k="${k}">${opts.map((o) => `<option ${a[k] === o ? "selected" : ""}>${h(o)}</option>`).join("")}</select>`;
  const m = modal(`<h3>${id ? "Edit action " + h(a.ref) : "New action"}</h3>
    <div class="f2"><div><label>Ref</label><input data-k="ref" value="${h(a.ref)}"></div><div><label>Category</label>${sel("category", HF_ACTION_CATS)}</div></div>
    <label>Action</label><input data-k="title" value="${h(a.title)}">
    <label>Detail</label><textarea data-k="detail">${h(a.detail)}</textarea>
    <div class="f2"><div><label>Priority</label>${sel("priority", HF_PRIORITY)}</div><div><label>Status</label>${sel("status", HF_STATUS)}</div>
    <div><label>Owner</label><input data-k="owner" value="${h(a.owner)}"></div><div><label>Contractor</label><input data-k="contractor" value="${h(a.contractor)}"></div>
    <div><label>Due date</label><input type="date" data-k="due" value="${h(a.due)}"></div><div><label>Source</label><input data-k="source" value="${h(a.source)}"></div></div>
    ${(a.photos || []).length ? `<label>Photos from the app (${a.photos.length})</label><div id="ph" style="display:flex;gap:8px;flex-wrap:wrap"></div>` : ""}
    <label>Progress steps</label><div id="steps"></div>
    <div class="row"><input id="step-new" placeholder="Add a step, e.g. Quote approved" class="grow" style="width:auto;flex:1"><button class="btn sm ghost" id="step-add">Add step</button></div>
    <label>Latest note</label><textarea data-k="notes">${h(a.notes)}</textarea>
    ${(a.history || []).length ? `<label>History</label><div class="tw"><table>${a.history.slice().reverse().map((x) => `<tr><td class="muted" style="width:150px">${fdt(x.at)}</td><td>${h(x.by)}</td><td>${pill(x.status)}</td><td>${h(x.note)}</td></tr>`).join("")}</table></div>` : ""}
    <div class="row" style="margin-top:12px"><button class="btn red" id="as">Save</button><button class="btn ghost" data-close>Cancel</button><div class="grow"></div>${id && isAdmin() ? `<button class="btn ghost" id="ad" style="color:var(--red)">Delete</button>` : ""}</div><div class="err" id="ae"></div>`);
  const steps = JSON.parse(JSON.stringify(a.steps || [])), was = JSON.stringify(steps);
  if ((a.photos || []).length && S.live && fb.st) {
    a.photos.forEach(async (ph) => { try { const url = await fb.st.ref(ph.path).getDownloadURL();
      const el = document.createElement("a"); el.href = url; el.target = "_blank"; el.title = `${ph.caption || ""} — ${ph.by}, ${fdt(ph.at)}`;
      el.innerHTML = `<img src="${url}" style="width:96px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">`; const box = $("#ph", m); if (box) box.appendChild(el); } catch (e) {} });
  }
  const drawSteps = () => {
    const pc = steps.length ? Math.round((steps.filter((x) => x.done).length / steps.length) * 100) : null;
    $("#steps", m).innerHTML = (pc === null ? `<p class="muted">No steps yet. Add the steps needed to close this action; progress is worked out from them.</p>` : progBar(pc, 200)) +
      steps.map((x, i) => `<div class="chk"><input type="checkbox" data-si="${i}" ${x.done ? "checked" : ""} style="width:auto"><div class="t">${h(x.t)}${x.done && x.by ? `<br><span class="muted">Done ${x.on ? fds(x.on) : ""} · ${h(x.by)}</span>` : ""}</div><button class="btn sm ghost" data-sd="${i}" title="Remove step">✕</button></div>`).join("");
    $$("[data-si]", m).forEach((cb) => (cb.onchange = () => { const x = steps[+cb.dataset.si]; x.done = cb.checked; x.by = cb.checked ? S.user.name : ""; x.on = cb.checked ? today() : ""; drawSteps(); }));
    $$("[data-sd]", m).forEach((b) => (b.onclick = () => { steps.splice(+b.dataset.sd, 1); drawSteps(); }));
  };
  drawSteps();
  $("#step-add", m).onclick = () => { const t = $("#step-new", m).value.trim(); if (!t) return; steps.push({ t, done: false }); $("#step-new", m).value = ""; drawSteps(); };
  $("#as", m).onclick = async () => {
    const o = {}; $$("[data-k]", m).forEach((el) => (o[el.dataset.k] = el.value.trim()));
    if (!o.title) return ($("#ae", m).textContent = "Enter the action.");
    o.steps = steps; if (JSON.stringify(steps) !== was) o.pct = null;
    if (JSON.stringify(steps) !== was && steps.length) {
      const allDone = steps.every((x) => x.done), any = steps.some((x) => x.done);
      if (allDone && o.status !== "Completed") o.status = "Completed";
      else if (!allDone && any && o.status === "Not started") o.status = "In progress";
      if (!o.notes || o.notes === (a.notes || "")) { const nd = steps.filter((x, i) => x.done && !((a.steps || [])[i] || {}).done).map((x) => x.t); if (nd.length) o.notes = "Done: " + nd.join("; "); }
    }
    if (!id || o.status !== a.status || o.notes !== (a.notes || "")) o.history = (a.history || []).concat([{ at: Date.now(), by: S.user.name, status: o.status, note: id ? (o.notes !== (a.notes || "") ? o.notes : "Edited") : "Created" }]);
    if (o.status === "Completed" && a.status !== "Completed") o.completedOn = today();
    if (id) await put("actions", id, o); else await add("actions", o);
    audit(`${id ? "Edited" : "Added"} action ${o.ref}: ${o.title}`, o.ref); m.close(); toast("Saved");
  };
  const d = $("#ad", m); if (d) d.onclick = async () => { if (!confirmBox(m, "Delete this action? It will be removed from the tracker.")) return; await del("actions", id); audit(`Deleted action ${a.ref}`, a.ref); m.close(); };
}
function confirmBox(m, msg) { const e = $(".err", m); if (e && e.dataset.sure !== "1") { e.textContent = msg + " Press again to confirm."; e.dataset.sure = "1"; return false; } return true; }

/* ============================================================ AUDIT READINESS */
function auditScore(group) {
  const items = group ? group.items : HF_AUDIT.flatMap((g) => g.items);
  const st = (id) => (S.data.registers.find((r) => r.id === "audit-" + id) || {}).status || "Not ready";
  const pts = items.reduce((t, [id]) => t + ({ "Ready": 1, "Partly ready": 0.5 }[st(id)] || 0), 0);
  return { pc: items.length ? Math.round((pts / items.length) * 100) : 0, ready: items.filter(([id]) => st(id) === "Ready").length, total: items.length };
}
VIEWS.audit = () => {
  const get = (id) => S.data.registers.find((r) => r.id === "audit-" + id) || {};
  const sc = auditScore();
  return `<h2>Audit <span class="fl">readiness</span></h2>
  <p class="lead">What the fire safety officer will look at during the Fire Safety Order audit — including the spa and the function / ceremony rooms. Mark each one and note where the evidence is.</p>
  <div class="grid g5" style="margin-bottom:12px">
    <div class="card tile ${sc.pc >= 80 ? "g" : sc.pc >= 50 ? "a" : "r"}"><div class="n">${sc.pc}%</div><div class="l">Overall readiness</div></div>
    ${["Ready", "Partly ready", "Not ready"].map((x, i) => `<div class="card tile ${["g", "a", "r"][i]}"><div class="n">${HF_AUDIT.flatMap((g) => g.items).filter(([id]) => (get(id).status || "Not ready") === x).length}</div><div class="l">${x}</div></div>`).join("")}
  </div>
  ${HF_AUDIT.map((g) => { const gs = auditScore(g); return `<h3 class="row"><span class="grow">${h(g.t)}</span><span style="font-size:13px">${progBar(gs.pc, 120)}</span></h3>
  <div class="tw"><table><tr><th>What he will look at</th><th style="width:170px">Where the evidence is</th><th style="width:260px">Status</th><th style="width:28%">Notes</th></tr>
  ${g.items.map(([id, t, ev]) => { const r = get(id), st = r.status || "Not ready"; return `<tr><td>${h(t)}</td><td class="muted">${h(ev)}</td>
    <td><div class="seg">${HF_READY.map((x) => `<button data-au="${id}" data-v="${x}" class="${st === x ? "on " + (x === "Ready" ? "pass" : x === "Not ready" ? "fail" : "na") : ""}" style="font-size:12px">${x}</button>`).join("")}</div>
    ${r.updatedBy ? `<div class="muted" style="font-size:11px;margin-top:3px">${h(r.updatedBy)} · ${fdt(r.updatedAt)}</div>` : ""}</td>
    <td><input data-aun="${id}" value="${h(r.note)}" placeholder="e.g. in the red folder, tab 3"></td></tr>`; }).join("")}</table></div>`; }).join("")}`;
};
BIND.audit = (v) => {
  $$("[data-au]", v).forEach((b) => (b.onclick = async () => { await put("registers", "audit-" + b.dataset.au, { kind: "audit", status: b.dataset.v }); audit(`Audit readiness: ${b.dataset.au} → ${b.dataset.v}`); }));
  $$("[data-aun]", v).forEach((i) => (i.onchange = async () => { await put("registers", "audit-" + i.dataset.aun, { kind: "audit", note: i.value.trim() }); }));
};

/* ============================================================ VENUES & EVENTS */
const LAYOUTS = [["boardroom", "Boardroom"], ["ushape", "U-shape"], ["theatre", "Theatre"], ["cabaret", "Cabaret"], ["reception", "Reception"]];
VIEWS.venues = () => {
  const V = reg("venue").sort((a, b) => natRef(a.name, b.name));
  const ev = recs("event").sort((a, b) => natRef(b.date, a.date));
  return `<h2>Venues and <span class="fl">events</span></h2>
  <p class="lead">Fire information for every function and ceremony room, and a pre-event fire check for each booking. The fire limit is the maximum number agreed with the fire risk assessor; until it is confirmed, the sales capacity is shown for reference only.</p>
  <div class="row" style="margin-bottom:10px"><button class="btn red" data-rec="event">Record a pre-event check</button><div class="grow"></div>${isAdmin() ? `<button class="btn ghost" id="v-new">+ Add room</button>` : ""}</div>
  <div class="tw"><table><tr><th>Room</th><th>Ceremony licence</th><th>Exits</th><th>Alarm zone</th><th>Fire limit by layout<br><span style="font-weight:400;text-transform:none">(sales capacity)</span></th><th>Last event check</th></tr>
  ${V.map((x) => { const last = ev.find((e) => (e.fields || {}).venue === x.name);
    return `<tr><td><a href="#" data-v="${x.id}" style="color:var(--navy);font-weight:700;text-decoration:none">${h(x.name)}</a>${x.m2 ? `<div class="muted">${h(x.m2)} m²</div>` : ""}</td><td>${x.ceremony ? h(x.ceremony) : '<span class="muted">—</span>'}</td>
    <td>${h(x.exits || "—")}</td><td>${h(x.zone || "—")}</td>
    <td style="font-size:12px">${LAYOUTS.map(([k, l]) => { const f = (x.fire || {})[k], sc = (x.sales || {})[k]; return sc || f ? `<span style="white-space:nowrap">${l}: <b style="color:${f ? "var(--ok)" : "var(--amber)"}">${f || "?"}</b> <span class="muted">(${sc || "–"})</span></span>` : ""; }).filter(Boolean).join(" · ")}</td>
    <td>${last ? `${fds(last.date)}<br><span class="muted">${h((last.fields || {}).bookingRef)}</span>` : '<span class="muted">None</span>'}</td></tr>`; }).join("") || `<tr><td colspan="6" class="muted">No rooms yet — load the starting data or add a room.</td></tr>`}
  </table></div>
  <h3>Pre-event checks</h3>
  <div class="tw"><table><tr><th>Date</th><th>Room</th><th>Booking</th><th>Type</th><th>Guests</th><th>Result</th><th>Checked by</th></tr>
  ${ev.map((e) => { const f = e.fields || {}; return `<tr data-id="${e.id}" style="cursor:pointer"><td>${fds(e.date)}</td><td>${h(f.venue)}</td><td>${h(f.bookingRef)}</td><td>${h(f.eventType)}</td><td>${h(f.guests)} ${h(f.layout)}${e.overCapacity ? " " + pill("Over limit") : ""}</td><td>${h(resultOf(e))}</td><td>${h(e.byName)}</td></tr>`; }).join("") || `<tr><td colspan="7" class="muted">No pre-event checks yet.</td></tr>`}
  </table></div>`;
};
BIND.venues = (v) => {
  bindRec(v);
  $$("tr[data-id]", v).forEach((tr) => (tr.onclick = () => viewRecord(tr.dataset.id)));
  const edit = (id) => {
    const x = id ? S.data.registers.find((r) => r.id === id) : { kind: "venue", fire: {}, sales: {} };
    const m = modal(`<h3>${id ? h(x.name) : "Add room"}</h3>
      <div class="f2"><div><label>Room name</label><input data-k="name" value="${h(x.name)}"></div><div><label>Floor area (m²)</label><input data-k="m2" value="${h(x.m2)}"></div>
      <div><label>On the marriage licence (ceremony room)</label><select data-k="ceremony">${["", "Yes", "Applied for", "No"].map((o) => `<option ${x.ceremony === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
      <div><label>Number of exits</label><input data-k="exits" value="${h(x.exits)}"></div>
      <div><label>Fire alarm zone</label><input data-k="zone" value="${h(x.zone)}"></div><div><label>Assembly point</label><input data-k="assembly" value="${h(x.assembly)}"></div></div>
      <label>Fire occupancy limit by layout (agreed with the fire risk assessor)</label>
      <div class="f2">${LAYOUTS.map(([k, l]) => `<div><label style="text-transform:none">${l} <span class="muted">(sales ${h((x.sales || {})[k] || "–")})</span></label><input type="number" data-fl="${k}" value="${h((x.fire || {})[k])}"></div>`).join("")}</div>
      <label>Notes (escape routes, layout rules, refuges)</label><textarea data-k="notes">${h(x.notes)}</textarea>
      <div class="row" style="margin-top:12px"><button class="btn red" id="vs">Save</button><button class="btn ghost" data-close>Cancel</button></div><div class="err"></div>`);
    $("#vs", m).onclick = async () => {
      const o = { kind: "venue", fire: {}, sales: x.sales || {} }; $$("[data-k]", m).forEach((el) => (o[el.dataset.k] = el.value.trim()));
      $$("[data-fl]", m).forEach((el) => { if (el.value) o.fire[el.dataset.fl] = Number(el.value); });
      if (!o.name) return;
      if (id) await put("registers", id, o); else await add("registers", o);
      audit(`Venue ${o.name} updated`); m.close(); toast("Saved");
    };
  };
  const nb = $("#v-new", v); if (nb) nb.onclick = () => edit(null);
  $$("[data-v]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); edit(a.dataset.v); }));
};

/* ============================================================ SIGNATURES */
/* Each person signs for themselves, on their own login: a drawn signature, the time,
   and their account are stored together and can never be edited or deleted. */
const sigsFor = (docId) => S.data.sigs.filter((x) => x.docId === docId);
const sigOf = (docId, role, who) => S.data.sigs.find((x) => x.docId === docId && x.role === role && x.signerKey === who);
function signItems() {
  const out = [];
  Object.entries(HF_SIGN_REQ).forEach(([docId, req]) => {
    const d = S.data.registers.find((r) => r.id === docId) || { id: docId, title: docId };
    req.forEach((q) => out.push({ docId, title: d.title, version: d.version || "", file: d.file, ...q, sig: sigOf(docId, q.role, q.who || "ext:" + q.ext) }));
  });
  HF_RETRO.forEach(([k, n]) => { const st = S.data.registers.find((r) => r.id === "retro-" + k);
    out.push({ docId: "retro-" + k, title: `Retrospective statement — ${n} (BHH-FS-22)`, version: st && st.writtenOn ? "written " + fds(st.writtenOn) : "not written yet", who: k, role: "Fire marshal", retro: true, written: !!(st && st.rows && st.rows.length), sig: sigOf("retro-" + k, "Fire marshal", k) }); });
  return out;
}
const myToSign = () => (S.key ? signItems().filter((x) => x.who === S.key && !x.sig) : []);
function sigPad(m) {
  const c = $("canvas", m), ctx = c.getContext("2d"); let down = false, drawn = false;
  const r = window.devicePixelRatio || 1; c.width = c.clientWidth * r; c.height = c.clientHeight * r; ctx.scale(r, r);
  ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.strokeStyle = "#14243A";
  const pos = (e) => { const b = c.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return [t.clientX - b.left, t.clientY - b.top]; };
  const start = (e) => { e.preventDefault(); down = true; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { if (!down) return; e.preventDefault(); const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); drawn = true; };
  const end = () => (down = false);
  c.addEventListener("mousedown", start); c.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
  c.addEventListener("touchstart", start, { passive: false }); c.addEventListener("touchmove", move, { passive: false }); c.addEventListener("touchend", end);
  return { clear: () => { ctx.clearRect(0, 0, c.width, c.height); drawn = false; }, has: () => drawn, png: () => c.toDataURL("image/png") };
}
function signModal(item, after, witness) {
  const signer = witness ? { key: item.who, name: (LOGINS[item.who] || {}).name || item.who } : { key: S.key, name: S.user.name };
  const m = modal(`<h3>Sign: ${h(item.title)}</h3>
    ${witness ? `<div class="note"><b>Signing in person.</b> ${h(signer.name)} must be with you and draw their own signature on this screen. You confirm that you saw them sign.</div>` : ""}
    <div class="tw" style="margin:6px 0 10px"><table>
      <tr><td style="width:34%"><b>Signing as</b></td><td>${h(item.role)}</td></tr>
      <tr><td><b>Name</b></td><td>${h(signer.name)}</td></tr>
      <tr><td><b>Date</b></td><td>${fd(today())} <span class="muted">(filled in automatically)</span></td></tr>
      ${item.version ? `<tr><td><b>Document version</b></td><td>${h(item.version)}</td></tr>` : ""}</table></div>
    ${item.file ? `<p><button class="btn ghost" id="sg-open">📄 Open the document to read it first</button></p>` : ""}
    <label>Your signature — draw it below with your finger or mouse</label>
    <canvas style="width:100%;height:160px;border:1.5px dashed var(--line);border-radius:10px;background:#fff;touch-action:none"></canvas>
    <div class="row"><button class="btn sm ghost" id="sg-clear">Clear</button></div>
    <label>${h(signer.name)}'s personal code <span class="muted" style="text-transform:none">(not 999 — only the signer should know it)</span></label><input id="sg-code" type="password" autocomplete="off" style="max-width:200px">
    <label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="sg-ok" style="width:auto"><span>I, <b>${h(signer.name)}</b>, have read this document and this is my signature as ${h(item.role)}.</span></label>
    ${witness ? `<label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="sg-wit" style="width:auto"><span>I, <b>${h(S.user.name)}</b>, saw ${h(signer.name)} sign this in person on ${fd(today())}.</span></label>` : ""}
    <div class="row" style="margin-top:12px"><button class="btn red" id="sg-go">Sign</button><button class="btn ghost" data-close>Cancel</button></div><div class="err" id="sg-e"></div>`);
  const pad = sigPad(m);
  const op = $("#sg-open", m); if (op) op.onclick = (e) => { e.preventDefault(); openFile(item.file); };
  $("#sg-clear", m).onclick = () => pad.clear();
  $("#sg-go", m).onclick = async () => {
    const e = $("#sg-e", m);
    if (!pad.has()) return (e.textContent = "Draw your signature.");
    const pc = String((LOGINS[signer.key] || {}).code || "").toUpperCase();
    if (pc && $("#sg-code", m).value.trim().toUpperCase() !== pc) return (e.textContent = `Enter ${signer.name}'s personal code.`);
    if (!$("#sg-ok", m).checked) return (e.textContent = "Tick the declaration.");
    if (witness && !$("#sg-wit", m).checked) return (e.textContent = "Tick the witness confirmation.");
    try {
      $("#sg-go", m).disabled = true;
      await add("sigs", { docId: item.docId, docTitle: item.title, version: item.version || "", role: item.role, signerKey: signer.key, name: signer.name, sig: pad.png(), signedOn: today(), device: navigator.userAgent.slice(0, 120),
        method: witness ? "in person" : "own login", ...(witness ? { witness: S.user.name } : {}) });
      audit(`Signed: ${item.title} — ${item.role} — ${signer.name}${witness ? ` (in person, witnessed by ${S.user.name})` : ""}`); m.close(); toast("Signed"); if (after) after();
    } catch (err) { $("#sg-go", m).disabled = false; e.textContent = "Could not sign: " + err.message; }
  };
}
function paperModal(item) {
  const nm = item.ext || (LOGINS[item.who] || {}).name || item.who;
  const m = modal(`<h3>Record a paper signature</h3><p class="muted">${h(item.title)} · ${h(item.role)}</p>
    <p>Use this when <b>${h(nm)}</b> has signed the printed document. Upload the scan or photo of the signed page as the evidence.</p>
    <div class="f2"><div><label>Signed by (name as written)</label><input id="pp-n" value="${h(item.ext ? "" : nm)}" placeholder="${h(item.ext ? "e.g. name of the Granite Leisure manager" : "")}"></div>
    <div><label>Date on the signed page</label><input type="date" id="pp-d" value="${h(item.date || (/^Prepared/.test(item.role) ? "2026-10-25" : /^Approved|^Signatory/.test(item.role) ? "2026-10-26" : today()))}"><div class="muted" style="font-size:11px">${item.date ? "Date typed on the document — change it if they wrote a different date" : "Today's date — change it to the date written on the page"}</div></div></div>
    <label>Scan or photo of the signed page</label><input type="file" id="pp-f" accept="image/*,.pdf">
    <label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="pp-ok" style="width:auto"><span>I confirm this is a true copy of the document as signed by ${h(nm)}.</span></label>
    <div class="row" style="margin-top:12px"><button class="btn red" id="pp-go">Save paper signature</button><button class="btn ghost" data-close>Cancel</button></div><div class="err" id="pp-e"></div>`);
  $("#pp-go", m).onclick = async () => {
    const e = $("#pp-e", m), n = $("#pp-n", m).value.trim(), d = $("#pp-d", m).value, f = $("#pp-f", m).files[0];
    if (!n || !d) return (e.textContent = "Enter the name and the date on the page.");
    if (!f) return (e.textContent = "Upload the signed page.");
    if (!$("#pp-ok", m).checked) return (e.textContent = "Tick the confirmation.");
    try {
      $("#pp-go", m).disabled = true; e.textContent = "Uploading…";
      const file = await upload("signed", f);
      await add("sigs", { docId: item.docId, docTitle: item.title, version: item.version || "", role: item.role, signerKey: item.who || "ext:" + item.ext, name: n, signedOn: d, method: "paper", file, recordedBy: S.user.name });
      audit(`Paper signature recorded: ${item.title} — ${item.role} — ${n} (${d})`); m.close(); toast("Paper signature saved");
    } catch (err) { $("#pp-go", m).disabled = false; e.textContent = err.message; }
  };
}
function sigCertHTML(docId) {
  const items = signItems().filter((x) => x.docId === docId); const first = items[0] || {};
  const st = S.data.registers.find((r) => r.id === docId) || {};
  const retro = docId.startsWith("retro-") ? `<h2>Statement</h2><p><b>Fire marshal:</b> ${h(st.name || "")} · <b>Period covered:</b> February 2026 to 25 October 2026 · <b>Written on:</b> ${st.writtenOn ? fd(st.writtenOn) : "—"}</p>
    <p style="font-style:italic">This statement was written on the date shown about tests and drills carried out earlier in 2026. It is not a record made at the time. Each line lists the source that supports it.</p>
    <table><tr><th>Date</th><th>Test or drill</th><th>Call point / area</th><th>Source</th><th>Certain / probable</th></tr>${(st.rows || []).map((r) => `<tr><td>${r.date ? fds(r.date) : ""}</td><td>${h(r.what)}</td><td>${h(r.area)}</td><td>${h(r.source)}${r.ref ? " — " + h(r.ref) : ""}</td><td>${h(r.cert)}</td></tr>`).join("") || `<tr><td colspan="5">No entries.</td></tr>`}</table>
    ${st.notes ? `<p>${h(st.notes)}</p>` : ""}<p>I confirm that this statement is true to the best of my knowledge and is based on the sources listed.</p>` : "";
  return `<div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #B3261E;padding-bottom:6px;margin-bottom:10px"><img src="assets/marketing/logos/logo-blue-transparent.png" style="height:48px" onerror="this.style.display='none'"><div><h1 style="margin:0">${docId.startsWith("retro-") ? "Fire marshal retrospective statement" : "Signature certificate"}</h1><div>${h(HF_HOTEL.name)}</div></div></div>
    <table><tr><td style="width:28%"><b>Document</b></td><td>${h(first.title || docId)}</td></tr><tr><td><b>Version</b></td><td>${h(first.version || "")}</td></tr></table>
    ${retro}<h2>Signatures</h2><table><tr><th>Role</th><th>Name</th><th>Signature</th><th>Signed</th></tr>
    ${items.map((x) => x.sig ? `<tr><td>${h(x.role)}</td><td>${h(x.sig.name)}</td><td>${x.sig.sig ? `<img src="${x.sig.sig}" style="height:54px">` : "Signed on paper — scan held in HosFIRE"}</td><td>${x.sig.method === "paper" ? `${fds(x.sig.signedOn)}<br><span style="font-size:9px">paper signature recorded by ${h(x.sig.recordedBy || x.sig.byName)} on ${fdt(x.sig.createdAt)}</span>` : `${fdt(x.sig.createdAt)}<br><span style="font-size:9px">${x.sig.method === "in person" ? `signed in person, witnessed by ${h(x.sig.witness)} (${h(x.sig.byEmail)})` : `signed electronically in HosFIRE (${h(x.sig.byEmail)})`}</span>`}</td></tr>`
      : `<tr><td>${h(x.role)}</td><td>${h(x.ext || (LOGINS[x.who] || {}).name || "")}</td><td style="height:54px">${x.ext ? "Sign on paper" : "Not yet signed"}</td><td></td></tr>`).join("")}</table>
    <p style="font-size:10px;color:#555;margin-top:10px">Electronic signatures were drawn by each signer themselves — on their own HosFIRE login, or in person with the named witness present. Each is stored with the signer's account and the time it was made, and cannot be edited or deleted. Produced ${fdt(Date.now())} by ${h(S.user.name)}.</p>`;
}
VIEWS.sign = () => {
  const items = signItems(), mine = myToSign();
  const docs = [...new Set(items.map((x) => x.docId))];
  const signed = items.filter((x) => x.sig).length, internal = items.filter((x) => x.who).length;
  return `<h2>Signatures</h2>
  <p class="lead">Every document that needs signing, who signs it and where it stands. People sign on their own HosFIRE login (computer or phone) by drawing their signature; outside parties sign on paper and the signed copy is uploaded to the document.</p>
  <div class="grid g5" style="margin-bottom:12px">
    <div class="card tile ${mine.length ? "r" : "g"}"><div class="n">${mine.length}</div><div class="l">Waiting for your signature</div></div>
    <div class="card tile g"><div class="n">${signed}/${internal}</div><div class="l">Electronic signatures done</div></div>
    <div class="card tile"><div class="n">${docs.length}</div><div class="l">Documents</div></div>
    <div class="card tile a"><div class="n">${items.filter((x) => x.ext).length}</div><div class="l">Paper signatures (outside parties)</div></div>
  </div>
  ${mine.length ? `<div class="warn"><b>${mine.length} waiting for you:</b> ${mine.map((x) => h(x.title)).join(" · ")}</div>` : ""}
  <div class="tw"><table><tr><th>Document</th><th>Signer</th><th>Role</th><th>Status</th><th></th></tr>
  ${docs.map((id) => { const rows = items.filter((x) => x.docId === id);
    return rows.map((x, i) => `<tr>${i === 0 ? `<td rowspan="${rows.length}"><b>${h(x.title)}</b><div class="muted">${h(x.version)}</div>${x.file ? `<button class="btn sm ghost" data-docopen="${id}" style="margin-top:6px">📄 Open document</button> ` : x.retro ? "" : `<div class="muted" style="font-size:11px;margin-top:4px">File not uploaded yet</div>`}${rows.some((y) => y.sig) ? `<button class="btn sm ghost" data-cert="${id}" style="margin-top:6px">⬇ ${x.retro ? "Statement" : "Signature certificate"} (PDF)</button>` : ""}</td>` : ""}
      <td>${h(x.ext || (LOGINS[x.who] || {}).name || x.who)}</td><td class="muted">${h(x.role)}</td>
      <td>${x.sig ? `${pill("Done")} <span class="muted">${x.sig.method === "paper" ? "paper · " + fds(x.sig.signedOn) : fdt(x.sig.createdAt)}${x.sig.method === "in person" ? " · in person" : ""}</span>${x.sig.file ? ` <a href="#" data-sfile="${x.sig.id}">scan</a>` : ""}` : x.ext ? `<span class="pill p-amb">Paper — upload signed copy</span>` : x.retro && !x.written ? `<span class="pill p-red">Statement not written</span>` : `<span class="pill p-red">Awaiting signature</span>`}</td>
      <td>${x.sig ? "" : x.ext ? (isAdmin() ? `<button class="btn sm ghost" data-paper="${x.docId}|${i}">📎 Record paper signature</button>` : "") : x.who === S.key ? (x.retro ? `<button class="btn sm red" data-retro="${x.who}">${x.written ? "Review and sign" : "Write my statement"}</button>` : `<button class="btn sm red" data-sign="${x.docId}|${i}">✍️ Sign</button>`) : (isAdmin() && !x.retro ? `<button class="btn sm red" data-admsign="${x.docId}|${i}">✍️ Sign</button>` : `<button class="btn sm ghost" data-other="${x.who}">✍️ Sign</button>`)}</td></tr>`).join(""); }).join("")}
  </table></div>
  <p class="muted" style="margin-top:8px">Signatures are made by each person on their own login only. Nobody can sign for someone else, and signed entries cannot be changed.</p>`;
};
BIND.sign = (v) => {
  const items = signItems();
  $$("[data-sign]", v).forEach((b) => (b.onclick = () => { const [id, i] = b.dataset.sign.split("|"); signModal(items.filter((x) => x.docId === id)[+i]); }));
  $$("[data-cert]", v).forEach((b) => (b.onclick = () => { $("#print").innerHTML = sigCertHTML(b.dataset.cert); setTimeout(() => window.print(), 300); }));
  $$("[data-retro]", v).forEach((b) => (b.onclick = () => retroModal(b.dataset.retro)));
  $$("[data-paper]", v).forEach((b) => (b.onclick = () => { const [id, i] = b.dataset.paper.split("|"); paperModal(items.filter((x) => x.docId === id)[+i]); }));
  $$("[data-sfile]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); const sg = S.data.sigs.find((x) => x.id === a.dataset.sfile); if (sg && sg.file) openFile(sg.file); }));
  $$("[data-admsign]", v).forEach((b) => (b.onclick = () => {
    const [id, i] = b.dataset.admsign.split("|"), it = items.filter((x) => x.docId === id)[+i], nm = (LOGINS[it.who] || {}).name || it.who;
    const link = location.href.split("#")[0].replace(/\?.*$/, "") + "#sign";
    const m = modal(`<h3>${h(it.title)}</h3><p class="muted">${h(it.role)} · <b>${h(nm)}</b></p>
      <div class="grid g2" style="margin-top:8px">
        <div class="card"><b>✍️ Sign in person</b><p class="muted">${h(nm)} is with you and draws their signature on this screen. You confirm you saw them sign.</p><button class="btn red" id="ad-in">Sign in person now</button></div>
        <div class="card"><b>📎 Record a paper signature</b><p class="muted">${h(nm)} has signed the printed copy. Upload the scan of the signed page.</p><button class="btn" id="ad-pp">Upload signed page</button></div>
        <div class="card"><b>🔗 Send them the link</b><p class="muted">They sign on their own login or phone; name and date are filled in.</p><button class="btn ghost" id="ad-ln">Copy link</button></div>
      </div><div class="row" style="margin-top:12px"><button class="btn ghost" data-close>Close</button></div>`);
    $("#ad-in", m).onclick = () => { m.close(); signModal(it, null, true); };
    $("#ad-pp", m).onclick = () => { m.close(); paperModal(it); };
    $("#ad-ln", m).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(link); toast("Link copied"); };
  }));
  $$("[data-docopen]", v).forEach((b) => (b.onclick = () => { const d = S.data.registers.find((r) => r.id === b.dataset.docopen); if (d && d.file) openFile(d.file); }));
  $$("[data-other]", v).forEach((b) => (b.onclick = () => {
    const nm = (LOGINS[b.dataset.other] || {}).name || b.dataset.other, link = location.href.split("#")[0].replace(/\?.*$/, "") + "#sign";
    const m = modal(`<h3>${h(nm)} needs to sign this</h3><p>A signature only counts if the person makes it themselves, so ${h(nm)} signs on their own HosFIRE login (computer or the HosFIRE Mobile app). Their name and today's date are filled in for them — they just draw their signature and confirm.</p>
      <p>Send them this link:</p><div class="row"><input id="ol" value="${h(link)}" readonly class="grow" style="width:auto;flex:1"><button class="btn" id="oc">Copy</button></div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" data-close>Close</button></div>`);
    $("#oc", m).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(link); toast("Link copied"); };
  }));
};
function retroModal(k) {
  const id = "retro-" + k, st = S.data.registers.find((r) => r.id === id) || { rows: [] };
  const rows = JSON.parse(JSON.stringify(st.rows || []));
  const m = modal(`<h3>My retrospective statement (BHH-FS-22)</h3>
    <div class="warn">Write only what you can support from a source, and list the source on each line. Leave out anything you cannot support. This statement is dated today — it is not a record made at the time.</div>
    <p class="muted">Period covered: February 2026 to 25 October 2026 · Written on: <b>${fd(today())}</b></p>
    <div id="rt-rows"></div><button class="btn sm ghost" id="rt-add">+ Add a line</button>
    <label>Anything else to add</label><textarea id="rt-n">${h(st.notes || "")}</textarea>
    <div class="row" style="margin-top:12px"><button class="btn red" id="rt-save">Save and sign</button><button class="btn ghost" id="rt-draft">Save draft</button><button class="btn ghost" data-close>Cancel</button></div><div class="err" id="rt-e"></div>`);
  const draw = () => {
    $("#rt-rows", m).innerHTML = `<div class="tw"><table><tr><th>Date</th><th>Test or drill carried out</th><th>Call point / area</th><th>Source that confirms it</th><th>Source ref</th><th>Certain / probable</th><th></th></tr>${rows.map((r, i) => `<tr>
      <td><input type="date" data-r="${i}|date" value="${h(r.date)}" max="2026-10-25" min="2026-02-01" style="width:140px"></td>
      <td><select data-r="${i}|what">${["Weekly fire alarm test", "Fire drill", "Emergency lighting check", "Fire door check", "Extinguisher check", "Other"].map((o) => `<option ${r.what === o ? "selected" : ""}>${o}</option>`).join("")}</select></td>
      <td><input data-r="${i}|area" value="${h(r.area)}"></td>
      <td><select data-r="${i}|source">${["Paper testing sheet", ...HF_SOURCES.filter((x) => !/retrospective/i.test(x)), "My diary / phone / photos", "Duty handover notes"].map((o) => `<option ${r.source === o ? "selected" : ""}>${h(o)}</option>`).join("")}</select></td>
      <td><input data-r="${i}|ref" value="${h(r.ref)}" placeholder="page / task no."></td>
      <td><select data-r="${i}|cert">${["Certain", "Probable"].map((o) => `<option ${r.cert === o ? "selected" : ""}>${o}</option>`).join("")}</select></td>
      <td><button class="btn sm ghost" data-rd="${i}">✕</button></td></tr>`).join("") || `<tr><td colspan="7" class="muted">No lines yet.</td></tr>`}</table></div>`;
    $$("[data-r]", m).forEach((el) => (el.onchange = () => { const [i, f] = el.dataset.r.split("|"); rows[+i][f] = el.value; }));
    $$("[data-rd]", m).forEach((b) => (b.onclick = () => { rows.splice(+b.dataset.rd, 1); draw(); }));
  };
  draw();
  $("#rt-add", m).onclick = () => { rows.push({ date: "", what: "Weekly fire alarm test", area: "", source: "Paper testing sheet", ref: "", cert: "Certain" }); draw(); };
  const save = async (sign) => {
    const e = $("#rt-e", m);
    if (rows.some((r) => !r.date || !r.source)) return (e.textContent = "Every line needs a date and a source.");
    if (sign && !rows.length) return (e.textContent = "Add at least one line, or save a draft.");
    await put("registers", id, { kind: "retro", name: S.user.name, rows, notes: $("#rt-n", m).value.trim(), writtenOn: today() });
    audit(`Retrospective statement ${sign ? "saved for signing" : "draft saved"}: ${S.user.name}`); m.close();
    if (sign) setTimeout(() => signModal({ docId: id, title: `Retrospective statement — ${S.user.name} (BHH-FS-22)`, version: "written " + fds(today()), role: "Fire marshal" }), 200);
    else toast("Draft saved");
  };
  $("#rt-save", m).onclick = () => save(true); $("#rt-draft", m).onclick = () => save(false);
}

/* ============================================================ CERTIFICATES */
VIEWS.certs = () => {
  const rows = reg("cert").map((c) => ({ ...c, ...certState(c) })).sort((a, b) => natRef(a.ref, b.ref));
  return `<h2>Certificates and <span class="fl">service dates</span></h2>
  <p class="lead">Every contractor certificate, when it was last done and when it is next due. Upload the certificate PDF against each line.</p>
  <div class="row" style="margin-bottom:10px"><div class="grow"></div><button class="btn red" id="c-new">+ Add certificate</button></div>
  <div class="tw"><table><tr><th>Ref</th><th>Certificate</th><th>Contractor</th><th>Last done</th><th>Interval</th><th>Next due</th><th>Status</th><th>Certificate no.</th><th>File</th></tr>
  ${rows.map((c) => `<tr><td><b>${h(c.ref)}</b></td><td><a href="#" data-c="${c.id}" style="color:var(--navy);font-weight:700;text-decoration:none">${h(c.name)}</a>${c.notes ? `<div class="muted">${h(c.notes)}</div>` : ""}</td>
    <td>${h(c.contractor)}</td><td>${c.last ? fds(c.last) : "—"}</td><td>${c.months ? c.months + " months" : ""}</td><td>${c.next ? fds(c.next) : ""}</td><td>${pill(c.st)}</td><td>${h(c.certRef)}</td>
    <td>${c.file ? `<a href="#" data-open="${c.id}">View</a>` : `<span class="muted">Not uploaded</span>`}</td></tr>`).join("") || `<tr><td colspan="9" class="muted">No certificates yet.</td></tr>`}
  </table></div>`;
};
BIND.certs = (v) => {
  $("#c-new", v).onclick = () => editReg("cert", null);
  $$("[data-c]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); editReg("cert", a.dataset.c); }));
  $$("[data-open]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openFile(S.data.registers.find((x) => x.id === a.dataset.open).file); }));
};

/* generic register editor (cert, doc, peep, permit) */
const REG_FIELDS = {
  cert: [["ref", "Ref"], ["name", "Certificate / service"], ["contractor", "Contractor"], ["last", "Last done", "date"], ["months", "Interval (months)", "number"], ["certRef", "Certificate / job number"], ["notes", "Notes", "textarea"]],
  doc: [["title", "Title"], ["cat", "Category", "select", HF_DOC_CATS], ["date", "Date of document", "date"], ["version", "Version / revision"], ["author", "Author / issued by"], ["notes", "Notes", "textarea"]],
  peep: [["guest", "Guest name / room"], ["needs", "Assistance needed"], ["plan", "Evacuation plan (who helps, route, refuge)", "textarea"], ["from", "From", "date"], ["to", "To", "date"], ["told", "Night staff told (name)"]],
  permit: [["no", "Permit number"], ["date", "Date", "date"], ["location", "Location"], ["work", "Work being done"], ["contractor", "Contractor / person doing the work"], ["authorisedBy", "Authorised by (hotel staff — not the contractor)"], ["watchEnd", "Fire watch ended (time)", "time"], ["closed", "Permit closed", "select", ["No", "Yes"]]]
};
const REG_FOLDER = { cert: "certificates", doc: "documents", peep: "peeps", permit: "permits" };
function editReg(kind, id) {
  const r = id ? S.data.registers.find((x) => x.id === id) : { kind };
  const fields = REG_FIELDS[kind];
  const m = modal(`<h3>${id ? "Edit" : "Add"} ${{ cert: "certificate", doc: "document", peep: "PEEP", permit: "hot work permit" }[kind]}</h3>
    ${fields.map(([k, l, t, opts]) => `<label>${h(l)}</label>${t === "textarea" ? `<textarea data-k="${k}">${h(r[k])}</textarea>` : t === "select" ? `<select data-k="${k}">${opts.map((o) => `<option ${r[k] === o ? "selected" : ""}>${h(o)}</option>`).join("")}</select>` : `<input type="${t || "text"}" data-k="${k}" value="${h(r[k])}">`}`).join("")}
    ${kind === "cert" || kind === "doc" || kind === "permit" ? `<label>File (PDF, photo or Word, up to 25 MB)</label>${r.file ? `<p class="muted">Current: <a href="#" id="rf-open">${h(r.file.name)}</a> · uploaded by ${h(r.file.uploadedBy)}. Choosing a new file replaces the link (the old file is kept in storage).</p>` : ""}<input type="file" id="rf">` : ""}
    <div class="row" style="margin-top:12px"><button class="btn red" id="rs">Save</button><button class="btn ghost" data-close>Cancel</button><div class="grow"></div>${id && isAdmin() ? `<button class="btn ghost" id="rd" style="color:var(--red)">Delete</button>` : ""}</div><div class="err" id="re"></div>`);
  const fo = $("#rf-open", m); if (fo) fo.onclick = (e) => { e.preventDefault(); openFile(r.file); };
  $("#rs", m).onclick = async () => {
    const o = { kind }; $$("[data-k]", m).forEach((el) => (o[el.dataset.k] = el.value.trim()));
    try {
      $("#rs", m).disabled = true;
      const fi = $("#rf", m); if (fi && fi.files[0]) { $("#re", m).textContent = "Uploading…"; o.file = await upload(REG_FOLDER[kind], fi.files[0]); }
      if (id) await put("registers", id, o); else await add("registers", o);
      audit(`${id ? "Updated" : "Added"} ${kind}: ${o.name || o.title || o.guest || o.no || ""}${o.file ? " (file uploaded)" : ""}`);
      m.close(); toast("Saved");
    } catch (e) { $("#rs", m).disabled = false; $("#re", m).textContent = e.message; }
  };
  const d = $("#rd", m); if (d) d.onclick = async () => { if (!confirmBox(m, "Delete this entry?")) return; await del("registers", id); audit(`Deleted ${kind} ${r.name || r.title || ""}`); m.close(); };
}

/* ============================================================ DOCUMENTS */
VIEWS.docs = () => {
  const f = S.f.doc || (S.f.doc = { cat: "" });
  let rows = reg("doc"); if (f.cat) rows = rows.filter((d) => d.cat === f.cat);
  rows.sort((a, b) => natRef(a.cat, b.cat) || natRef(b.date, a.date));
  return `<h2>Documents and <span class="fl">policies</span></h2>
  <p class="lead">Fire risk assessments (Soldorlet), the fire service letter, policies and procedures, contracts, statements and quotes. Files are stored privately in HosFIRE, never in the website code.</p>
  <div class="tabs2">${["", ...HF_DOC_CATS].map((c) => `<button data-dc="${h(c)}" class="${f.cat === c ? "on" : ""}">${c || "All"} (${c ? reg("doc").filter((d) => d.cat === c).length : reg("doc").length})</button>`).join("")}</div>
  <div class="row" style="margin-bottom:10px"><div class="grow"></div><button class="btn ghost" id="d-bulk">⬆ Upload several files</button><button class="btn red" id="d-new">+ Add document</button></div>
  <div class="tw"><table><tr><th>Document</th><th>Category</th><th>Date</th><th>Version</th><th>Issued by</th><th>File</th></tr>
  ${rows.map((d) => `<tr><td><a href="#" data-d="${d.id}" style="color:var(--navy);font-weight:700;text-decoration:none">${h(d.title)}</a>${d.notes ? `<div class="muted">${h(d.notes)}</div>` : ""}</td><td><select data-dcat="${d.id}" style="padding:5px 6px;font-size:13px;width:auto;max-width:170px">${(HF_DOC_CATS.includes(d.cat) ? HF_DOC_CATS : [d.cat, ...HF_DOC_CATS]).map((c) => `<option ${c === d.cat ? "selected" : ""}>${h(c)}</option>`).join("")}</select></td><td>${d.date ? fds(d.date) : ""}</td><td>${h(d.version)}</td><td>${h(d.author)}</td>
    <td>${d.file ? `<a href="#" data-open="${d.id}">View</a>` : `<span class="pill p-amb">Upload</span>`}</td></tr>`).join("") || `<tr><td colspan="6" class="muted">No documents.</td></tr>`}
  </table></div>`;
};
BIND.docs = (v) => {
  $$("[data-dc]", v).forEach((b) => (b.onclick = () => { S.f.doc.cat = b.dataset.dc; render(); }));
  $("#d-new", v).onclick = () => editReg("doc", null);
  $("#d-bulk", v).onclick = bulkUpload;
  $$("[data-dcat]", v).forEach((sl) => (sl.onchange = async () => { await put("registers", sl.dataset.dcat, { cat: sl.value }); toast("Moved to " + sl.value); }));
  $$("[data-d]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); editReg("doc", a.dataset.d); }));
  $$("[data-open]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openFile(S.data.registers.find((x) => x.id === a.dataset.open).file); }));
};

/* Upload many files at once. A file named "doc-fra-rev1__Anything.pdf" (or
   "doc-eicr+cert-06__…") is attached to those entries; any other file becomes
   a new document named after the file. */
function bulkUpload() {
  const m = modal(`<h3>Upload several files</h3>
    <p class="muted">Choose all the files at once (you can select a whole folder's contents). Files from the "HosFIRE documents to upload" folder are matched to their entries automatically; any other file is added as a new document.</p>
    <div class="f2"><div><label>Category for new files</label><select id="bu-cat">${HF_DOC_CATS.map((c) => `<option ${c === "Other" ? "selected" : ""}>${h(c)}</option>`).join("")}</select></div><div></div></div>
    <input type="file" id="bu-f" multiple><div id="bu-list" class="muted" style="margin-top:8px"></div>
    <div class="row" style="margin-top:12px"><button class="btn red" id="bu-go">Upload</button><button class="btn ghost" data-close>Close</button></div><div class="err" id="bu-msg"></div>`);
  const fi = $("#bu-f", m);
  const plan = () => Array.from(fi.files).map((f) => { const i = f.name.indexOf("__"); const ids = i > 0 ? f.name.slice(0, i).split("+") : [];
    const known = ids.filter((id) => S.data.registers.some((r) => r.id === id)); return { f, ids, known, title: (i > 0 ? f.name.slice(i + 2) : f.name).replace(/\.[^.]+$/, "") }; });
  fi.onchange = () => { const P = plan(); $("#bu-list", m).innerHTML = `${P.length} files · ${P.filter((x) => x.known.length).length} match existing entries · ${P.filter((x) => !x.known.length).length} will be new documents`; };
  $("#bu-go", m).onclick = async () => {
    const P = plan(), msg = $("#bu-msg", m); if (!P.length) { msg.textContent = "Choose the files first."; return; }
    $("#bu-go", m).disabled = true; S.hold = true; let n = 0, fail = 0;
    for (const x of P) {
      msg.textContent = `Uploading ${n + fail + 1} of ${P.length}: ${x.title}`;
      try {
        const file = await upload("documents", x.f);
        if (x.known.length) { for (const id of x.known) await put("registers", id, { file }); }
        else {
          const kind = x.ids[0] && x.ids[0].startsWith("cert-") ? "cert" : "doc";
          await (x.ids[0] ? put("registers", x.ids[0], { kind, title: x.title, cat: $("#bu-cat", m).value, date: "", version: "", author: "", file }) : add("registers", { kind: "doc", title: x.title, cat: $("#bu-cat", m).value, date: "", version: "", author: "", file }));
        }
        n++;
      } catch (e) { fail++; console.warn(x.f.name, e); }
    }
    audit(`Bulk upload: ${n} file(s)${fail ? `, ${fail} failed` : ""}`);
    S.hold = false; render(); m.close();
    modal(`<h3>Upload finished</h3><p>${n} file${n === 1 ? "" : "s"} uploaded${fail ? `, <b style="color:var(--red)">${fail} failed</b> — try those again` : ""}.</p><button class="btn" data-close>OK</button>`);
  };
}

/* ============================================================ TRAINING */
function courseState(date, months) {
  if (!date) return { st: "missing" };
  if (!months) return { st: "ok" };
  const exp = addMonths(date, months), d = daysBetween(today(), exp);
  return { st: d < 0 ? "expired" : d <= 30 ? "soon" : "ok", exp };
}
const DEPTS = [["", "All departments"], ["admin", "Management / office"], ["reception", "Reception"], ["nights", "Nights"], ["maintenance", "Maintenance"], ["kitchen", "Kitchen"], ["bar", "Bar"], ["restaurant", "Restaurant / F&B"], ["housekeeping", "Housekeeping"], ["spa", "Spa"], ["other", "Other"]];
const deptName = (d) => (DEPTS.find((x) => x[0] === d) || [d, d || "—"])[1];
const evOf = (t, k) => ((t.ev || {})[k]) || {};
VIEWS.training = () => {
  const f = S.f.trn || (S.f.trn = { dept: "", q: "", show: "all" });
  const all = reg("training");
  let rows = all.slice();
  if (f.dept) rows = rows.filter((t) => (t.dept || "other") === f.dept);
  if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter((t) => `${t.name} ${t.role}`.toLowerCase().includes(q)); }
  if (f.show === "gaps") rows = rows.filter((t) => !(t.courses || {}).induction || !evOf(t, "induction").confirmed || courseState((t.courses || {}).refresher, 12).st !== "ok");
  if (f.show === "unconfirmed") rows = rows.filter((t) => (t.courses || {}).induction && !evOf(t, "induction").confirmed);
  rows.sort((a, b) => (b.marshal ? 1 : 0) - (a.marshal ? 1 : 0) || natRef(a.dept, b.dept) || natRef(a.name, b.name));
  const n = all.length, ind = all.filter((t) => (t.courses || {}).induction).length, conf = all.filter((t) => evOf(t, "induction").confirmed).length;
  const ref = all.filter((t) => courseState((t.courses || {}).refresher, 12).st === "ok").length;
  const proc = all.filter((t) => (t.courses || {}).procedure).length;
  const night = all.filter((t) => t.shift === "Night"), nightOk = night.filter((t) => (t.courses || {}).induction).length;
  const RC = HF_COURSES.find((c) => c[0] === "reception"), recp = all.filter((t) => courseApplies(t, RC)), recpOk = recp.filter((t) => (t.courses || {}).reception).length;
  const bg = { missing: "#f4f4f4", ok: "var(--okbg)", soon: "var(--ambbg)", expired: "var(--redbg)" };
  const pc = (a) => (n ? Math.round((a / n) * 100) : 0);
  return `<div class="row"><div class="grow"><h2>Training <span class="fl">matrix</span></h2>
  <p class="lead">Fire training for every member of staff (RRO 2005 Art. 21): induction, annual refresher, fire marshal course, extinguisher use, the Fire Action Procedure briefing and drills. A date shows training was given; <b>✓</b> means the evidence (signed attendance sheet or certificate) has been seen.</p></div>
  <div class="row"><button class="btn ghost" id="t-cards">🪪 Training cards (PDF)</button><button class="btn ghost" id="t-records">📄 Attendance records (PDF)</button><button class="btn red" id="t-session">+ Record a training session</button></div></div>
  <div class="grid g6" style="margin-bottom:12px">
    <div class="card tile"><div class="n">${n}</div><div class="l">Staff on the matrix</div></div>
    <div class="card tile ${pc(ind) >= 90 ? "g" : "a"}"><div class="n">${pc(ind)}%</div><div class="l">Fire training recorded (${ind})</div></div>
    <div class="card tile ${pc(conf) >= 90 ? "g" : "r"}"><div class="n">${pc(conf)}%</div><div class="l">Evidence confirmed (${conf})</div></div>
    <div class="card tile ${pc(proc) >= 90 ? "g" : "r"}"><div class="n">${proc}</div><div class="l">Briefed on Fire Action Procedure</div></div>
    <div class="card tile ${night.length && nightOk === night.length ? "g" : "r"}"><div class="n">${nightOk}/${night.length}</div><div class="l">Night staff trained</div></div>
    <div class="card tile ${recp.length && recpOk === recp.length ? "g" : "r"}"><div class="n">${recpOk}/${recp.length}</div><div class="l">Reception &amp; nights briefed on the alarm procedure</div></div>
  </div>
  <div class="grid g4" style="margin-bottom:12px">${marshals().map((nm) => { const t = all.find((r) => r.name === nm) || { courses: {} }; const c = t.courses || {};
    return `<div class="card tile ${c.marshal ? "g" : "r"}"><div class="l">Fire marshal</div><div style="font-weight:900;font-size:17px;color:var(--navy)">${h(nm)}</div><div class="muted">Marshal course: ${c.marshal ? fds(c.marshal) : "date not recorded"}</div></div>`; }).join("")}</div>
  <div class="row" style="margin-bottom:10px">
    <select id="tf-dept" style="width:auto">${DEPTS.map(([k, l]) => `<option value="${k}" ${f.dept === k ? "selected" : ""}>${l}${k ? ` (${all.filter((t) => (t.dept || "other") === k).length})` : ""}</option>`).join("")}</select>
    <select id="tf-show" style="width:auto">${[["all", "Everyone"], ["gaps", "Gaps only"], ["unconfirmed", "Date recorded, evidence not confirmed"]].map(([k, l]) => `<option value="${k}" ${f.show === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <input id="tf-q" placeholder="Search name or role" value="${h(f.q)}" style="width:220px"><span class="muted">${rows.length} shown</span><div class="grow"></div>
    <button class="btn ghost" id="t-new">+ Add staff member</button>
  </div>
  <div class="tw"><table><tr><th>Name</th><th>Role / department</th><th>Shift</th><th>Started</th>${HF_COURSES.map(([, l, mo]) => `<th>${h(l)}${mo ? `<br><span style="font-weight:400;text-transform:none">every ${mo} months</span>` : ""}</th>`).join("")}<th>Card</th></tr>
  ${rows.map((t) => `<tr><td><a href="#" data-t="${t.id}" style="color:var(--navy);font-weight:700;text-decoration:none">${h(t.name)}</a>${t.marshal ? ` <span class="pill p-red">Marshal</span>` : ""}${t.note ? `<div class="muted" style="font-size:11px">${h(t.note)}</div>` : ""}</td>
    <td>${h(t.role)}<div class="muted" style="font-size:11px">${h(deptName(t.dept))}</div></td><td>${h(t.shift || "")}</td><td>${t.start ? fds(t.start) : '<span class="muted">—</span>'}</td>
    ${HF_COURSES.map((cc) => { const [k, , mo] = cc; if (!courseApplies(t, cc)) return `<td class="muted" style="text-align:center">n/a</td>`; const d = (t.courses || {})[k]; const st = courseState(d, mo); const ev = evOf(t, k);
      return `<td class="tcell" data-cell="${t.id}|${k}" title="Click to add or change the date" style="background:${bg[st.st]};cursor:pointer">${d ? `${fds(d)} ${ev.confirmed ? '<b style="color:var(--ok)" title="Evidence seen">✓</b>' : '<span title="Evidence not yet confirmed" style="color:var(--amber);font-weight:900">?</span>'}<br><a href="#" data-ccard="${t.id}|${k}" title="Download the card for this course" style="text-decoration:none;font-size:12px">🪪 card</a>` : "—"}${st.exp && st.st !== "ok" ? `<br><small>due ${fds(st.exp)}</small>` : ""}</td>`; }).join("")}
    <td>${Object.values(t.courses || {}).some(Boolean) ? `<button class="btn sm ghost" data-card="${t.id}" title="All training on one card">🪪 Card</button>` : '<span class="muted">—</span>'}</td></tr>`).join("") || `<tr><td colspan="${5 + HF_COURSES.length}" class="muted">No staff match.</td></tr>`}
  </table></div>
  <p class="muted" style="margin-top:8px">Click any training cell to add or change a date. ✓ evidence seen · <b style="color:var(--amber)">?</b> date recorded, evidence still to be confirmed · green in date · amber due within 30 days · red overdue · grey no record.</p>`;
};
BIND.training = (v) => {
  const f = S.f.trn;
  $("#tf-dept", v).onchange = (e) => { f.dept = e.target.value; render(); };
  $("#tf-show", v).onchange = (e) => { f.show = e.target.value; render(); };
  $("#tf-q", v).onchange = (e) => { f.q = e.target.value; render(); };
  const edit = (id) => {
    const t = id ? S.data.registers.find((x) => x.id === id) : { kind: "training", courses: {}, ev: {} };
    const m = modal(`<h3>${id ? h(t.name) : "Add staff member"}</h3>
      <div class="f2"><div><label>Name</label><input data-k="name" value="${h(t.name)}"></div><div><label>Role</label><input data-k="role" value="${h(t.role)}"></div>
      <div><label>Department</label><select data-k="dept">${DEPTS.slice(1).map(([k, l]) => `<option value="${k}" ${t.dept === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div><label>Shift</label><select data-k="shift">${["Day", "Night", "Both"].map((x) => `<option ${t.shift === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div><label>Start date</label><input type="date" data-k="start" value="${h(t.start)}"></div>
      <div><label>Fire marshal</label><select data-k="marshal"><option value="">No</option><option value="1" ${t.marshal ? "selected" : ""}>Yes</option></select></div></div>
      <label>Training</label>
      <div class="tw"><table><tr><th>Course</th><th>Date given</th><th>Evidence seen</th></tr>${HF_COURSES.map(([k, l]) => { const ev = evOf(t, k);
        return `<tr><td>${h(l)}</td><td><input type="date" data-c="${k}" value="${h((t.courses || {})[k])}"></td><td><label class="row" style="text-transform:none;margin:0;font-size:13px;color:var(--ink)"><input type="checkbox" data-e="${k}" ${ev.confirmed ? "checked" : ""} style="width:auto"> ${ev.confirmed ? `by ${h(ev.by || "")} ${ev.at ? fds(ev.at) : ""}` : "Confirm"}</label></td></tr>`; }).join("")}</table></div>
      <label>Note</label><input data-k="note" value="${h(t.note)}">
      <p class="muted">Only enter a date when the training was actually given. Tick "Evidence seen" once you have the signed attendance sheet or certificate (upload it with "Record a training session" or in Documents).</p>
      <div class="row" style="margin-top:12px"><button class="btn red" id="ts">Save</button><button class="btn ghost" data-close>Cancel</button><div class="grow"></div>${id && isAdmin() ? `<button class="btn ghost" id="td" style="color:var(--red)">Delete</button>` : ""}</div><div class="err"></div>`);
    $("#ts", m).onclick = async () => {
      const o = { kind: "training", courses: {}, ev: JSON.parse(JSON.stringify(t.ev || {})) };
      $$("[data-k]", m).forEach((el) => (o[el.dataset.k] = el.value.trim())); o.marshal = !!o.marshal;
      $$("[data-c]", m).forEach((el) => (o.courses[el.dataset.c] = el.value));
      $$("[data-e]", m).forEach((el) => { const k = el.dataset.e, was = !!(o.ev[k] || {}).confirmed;
        if (el.checked && !was) o.ev[k] = { ...(o.ev[k] || {}), confirmed: true, by: S.user.name, at: today() };
        if (!el.checked && was) o.ev[k] = { ...(o.ev[k] || {}), confirmed: false }; });
      if (!o.name) return;
      if (id) await put("registers", id, o, false); else await add("registers", o);
      audit(`Training record ${id ? "updated" : "added"}: ${o.name}`); m.close(); toast("Saved");
    };
    const d = $("#td", m); if (d) d.onclick = async () => { if (!confirmBox(m, "Delete this person from the matrix?")) return; await del("registers", id); m.close(); };
  };
  $("#t-new", v).onclick = () => edit(null);
  $$("[data-cell]", v).forEach((td) => (td.onclick = () => {
    const [id, k] = td.dataset.cell.split("|"), t = S.data.registers.find((x) => x.id === id), ev = evOf(t, k), lab = HF_COURSES.find((c) => c[0] === k)[1];
    const m = modal(`<h3>${h(t.name)} — ${h(lab)}</h3>
      <div class="f2"><div><label>Date training was given</label><input type="date" id="tc-d" max="${today()}" value="${h((t.courses || {})[k])}"></div><div><label>Trainer</label><input id="tc-t" value="${h(ev.trainer || HF_FIRE_MANAGER.name)}"></div></div>
      <label>Signed attendance sheet or certificate (optional)</label><input type="file" id="tc-f" accept="image/*,.pdf">
      <label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="tc-c" ${ev.confirmed ? "checked" : ""} style="width:auto"> Evidence seen (signed sheet or certificate)</label>
      ${ev.note ? `<p class="muted">${h(ev.note)}</p>` : ""}
      <div class="row" style="margin-top:12px"><button class="btn red" id="tc-s">Save</button><button class="btn ghost" data-close>Cancel</button><div class="grow"></div><button class="btn ghost" id="tc-x" style="color:var(--red)">Clear date</button></div><div class="err" id="tc-e"></div>`);
    const save = async (clear) => {
      try {
        const courses = { ...(t.courses || {}) }, evs = { ...(t.ev || {}) };
        if (clear) { delete courses[k]; delete evs[k]; }
        else {
          const d = $("#tc-d", m).value; if (!d) { $("#tc-e", m).textContent = "Enter the date."; return; }
          let sheet = (evs[k] || {}).sheet || ""; const fi = $("#tc-f", m).files[0];
          if (fi) { $("#tc-e", m).textContent = "Uploading…"; const up = await upload("training", fi); sheet = up.path;
            await add("registers", { kind: "doc", title: `Training evidence — ${t.name} — ${lab} — ${fds(d)}`, cat: "Training", date: d, version: "", author: $("#tc-t", m).value.trim(), file: up }); }
          courses[k] = d;
          const conf = $("#tc-c", m).checked;
          evs[k] = { ...(evs[k] || {}), confirmed: conf, trainer: $("#tc-t", m).value.trim(), sheet, ...(conf && !(evs[k] || {}).confirmed ? { by: S.user.name, at: today() } : {}) };
        }
        await put("registers", id, { courses, ev: evs }); audit(`Training ${clear ? "cleared" : "updated"}: ${t.name} — ${lab}`); m.close(); toast("Saved");
      } catch (e) { $("#tc-e", m).textContent = e.message; }
    };
    $("#tc-s", m).onclick = () => save(false); $("#tc-x", m).onclick = () => save(true);
  }));
  const cardHTML = (t) => { const c = t.courses || {}; const done = HF_COURSES.filter(([k]) => c[k]);
    return `<div class="tcard"><div class="tch"><img src="assets/marketing/logos/logo-blue-transparent.png" onerror="this.style.display='none'"><div><b>Fire safety training card</b><span>${h(HF_HOTEL.name)}</span></div></div>
      <div class="tcn">${h(t.name)}${t.marshal ? ' <span class="tcm">FIRE MARSHAL</span>' : ""}</div><div class="tcr">${h(t.role)} · ${h(deptName(t.dept))}${t.shift === "Night" ? " · Night" : ""}</div>
      <table>${done.map(([k, l, mo]) => { const ev = evOf(t, k), st = courseState(c[k], mo); return `<tr><td>${h(l)}</td><td>${fds(c[k])}</td><td>${mo ? "due " + fds(addMonths(c[k], mo)) : ""}</td><td>${ev.confirmed ? "✓ verified" : "to confirm"}</td></tr>`; }).join("") || `<tr><td colspan="4">No training recorded yet</td></tr>`}</table>
      <div class="tcf">Fire Safety Manager: ${h(HF_FIRE_MANAGER.name)} · Printed ${fds(today())} from HosFIRE</div></div>`; };
  const printCards = (list, title) => { $("#print").innerHTML = `<div class="tcards">${list.map(cardHTML).join("")}</div>`; audit(`Training cards printed: ${title}`); setTimeout(() => window.print(), 300); };
  $$("[data-card]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); e.stopPropagation(); const t = S.data.registers.find((x) => x.id === a.dataset.card); printCards([t], t.name); }));
  const courseCard = (t, k) => { const [, l, mo] = HF_COURSES.find((c) => c[0] === k), d = (t.courses || {})[k], ev = evOf(t, k);
    return `<div class="tcard"><div class="tch"><img src="assets/marketing/logos/logo-blue-transparent.png" onerror="this.style.display='none'"><div><b>Fire training — completed</b><span>${h(HF_HOTEL.name)}</span></div></div>
      <div class="tcn">${h(t.name)}${t.marshal ? ' <span class="tcm">FIRE MARSHAL</span>' : ""}</div><div class="tcr">${h(t.role)} · ${h(deptName(t.dept))}</div>
      <table><tr><td><b>Course</b></td><td>${h(l)}</td></tr><tr><td><b>Completed</b></td><td>${fd(d)}</td></tr>
      <tr><td><b>Trainer</b></td><td>${h(ev.trainer || "")}</td></tr><tr><td><b>Next due</b></td><td>${mo ? fds(addMonths(d, mo)) : "No renewal"}</td></tr>
      <tr><td><b>Evidence</b></td><td>${ev.confirmed ? "✓ verified — signed sheet / certificate seen" : "to confirm — signed sheet not yet seen"}</td></tr></table>
      <div class="tcf">Fire Safety Manager: ${h(HF_FIRE_MANAGER.name)} · Printed ${fds(today())} from HosFIRE</div></div>`; };
  $$("[data-ccard]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); e.stopPropagation();
    const [id, k] = a.dataset.ccard.split("|"), t = S.data.registers.find((x) => x.id === id);
    $("#print").innerHTML = `<div class="tcards">${courseCard(t, k)}</div>`; audit(`Training card printed: ${t.name} — ${k}`); setTimeout(() => window.print(), 300); }));
  $("#t-cards", v).onclick = () => {
    const all = reg("training");
    const m = modal(`<h3>Training cards</h3><p class="muted">A small card for each person showing their fire training, dates, when it is due and whether the evidence is verified. Eight cards print on each A4 page — choose "Save as PDF" to download.</p>
      <div class="f2"><div><label>Who</label><select id="tk-w"><option value="done">Everyone with training recorded (${all.filter((t) => (t.courses || {}).induction).length})</option><option value="verified">Only fully verified (${all.filter((t) => (t.courses || {}).induction && evOf(t, "induction").confirmed).length})</option><option value="all">Everyone (${all.length})</option></select></div>
      <div><label>Department</label><select id="tk-d">${DEPTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div></div>
      <div class="row" style="margin-top:12px"><button class="btn red" id="tk-go">⬇ Download cards (PDF)</button><button class="btn ghost" data-close>Close</button></div>`);
    $("#tk-go", m).onclick = () => { const w = $("#tk-w", m).value, d = $("#tk-d", m).value;
      let L = all.filter((t) => w === "all" || (t.courses || {}).induction); if (w === "verified") L = L.filter((t) => evOf(t, "induction").confirmed); if (d) L = L.filter((t) => (t.dept || "other") === d);
      L.sort((a, b) => natRef(a.dept, b.dept) || natRef(a.name, b.name)); m.close(); printCards(L, `${L.length} cards`); };
  };
  $("#t-records", v).onclick = () => {
    const sess = {};
    reg("training").forEach((t) => Object.entries(t.courses || {}).forEach(([k, d]) => { if (!d) return; const key = k + "|" + d; (sess[key] = sess[key] || []).push(t); }));
    const keys = Object.keys(sess).sort((a, b) => natRef(b.split("|")[1], a.split("|")[1]));
    const m = modal(`<h3>Training attendance records</h3><p class="muted">One record for each course and date recorded on the matrix. Download it as a PDF (choose "Save as PDF" in the print window) for the inspector or the staff file.</p>
      <div class="tw"><table><tr><th>Date</th><th>Course</th><th>Staff</th><th>Evidence seen</th><th></th></tr>
      ${keys.map((key) => { const [k, d] = key.split("|"), L = sess[key], c = L.filter((t) => evOf(t, k).confirmed).length;
        return `<tr><td>${fds(d)}</td><td>${h(HF_COURSES.find((x) => x[0] === k)[1])}</td><td>${L.length}</td><td>${c === L.length ? pill("Done") : `${c} of ${L.length}`}</td><td><button class="btn sm" data-pdf="${key}">⬇ PDF</button></td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">No training dates recorded yet.</td></tr>`}</table></div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" id="t-allpdf">⬇ Full training matrix (PDF)</button><div class="grow"></div><button class="btn" data-close>Close</button></div>`);
    const head = (title) => `<div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #B3261E;padding-bottom:6px;margin-bottom:10px"><img src="assets/marketing/logos/logo-blue-transparent.png" style="height:48px" onerror="this.style.display='none'"><div><h1 style="margin:0">${title}</h1><div>${h(HF_HOTEL.name)} · ${h(HF_HOTEL.address)}</div></div></div>`;
    const foot = `<p style="font-size:10px;color:#555;margin-top:10px">Produced from HosFIRE on ${fdt(Date.now())} by ${h(S.user.name)}. “Evidence seen” means the signed attendance sheet or certificate has been checked; “To confirm” means the training is recorded but the signed sheet has not yet been seen.</p>`;
    const sign = `<table style="margin-top:14px"><tr><th>Sign-off</th><th>Name</th><th>Signature</th><th>Date</th></tr><tr><td>Trainer</td><td></td><td style="height:34px"></td><td></td></tr><tr><td>Fire Safety Manager</td><td>${h(HF_FIRE_MANAGER.name)}</td><td></td><td></td></tr><tr><td>Manager</td><td>Patrik Vlach</td><td></td><td></td></tr></table>`;
    $$("[data-pdf]", m).forEach((b) => (b.onclick = () => {
      const [k, d] = b.dataset.pdf.split("|"), L = sess[b.dataset.pdf].slice().sort((a, b2) => natRef(a.dept, b2.dept) || natRef(a.name, b2.name)), lab = HF_COURSES.find((x) => x[0] === k)[1];
      const trainers = [...new Set(L.map((t) => evOf(t, k).trainer).filter(Boolean))].join(", ") || "";
      $("#print").innerHTML = head("Fire training attendance record") + `<table><tr><td style="width:30%"><b>Course</b></td><td>${h(lab)}</td></tr><tr><td><b>Date</b></td><td>${fd(d)}</td></tr><tr><td><b>Trainer</b></td><td>${h(trainers)}</td></tr><tr><td><b>Attendees</b></td><td>${L.length}</td></tr></table>
        <h2>Attendees</h2><table><tr><th>#</th><th>Name</th><th>Role</th><th>Department</th><th>Shift</th><th>Evidence</th><th style="width:22%">Signature</th></tr>${L.map((t, i) => `<tr><td>${i + 1}</td><td>${h(t.name)}</td><td>${h(t.role)}</td><td>${h(deptName(t.dept))}</td><td>${h(t.shift || "")}</td><td>${evOf(t, k).confirmed ? "Evidence seen" : "To confirm"}</td><td style="height:26px"></td></tr>`).join("")}</table>` + sign + foot;
      audit(`Attendance record PDF: ${lab} ${d}`); setTimeout(() => window.print(), 300);
    }));
    $("#t-allpdf", m).onclick = () => {
      const all = reg("training").sort((a, b) => natRef(a.dept, b.dept) || natRef(a.name, b.name));
      $("#print").innerHTML = head("Staff fire training matrix") + `<table><tr><th>Name</th><th>Role</th><th>Dept</th><th>Shift</th>${HF_COURSES.map((c) => `<th>${h(c[1])}</th>`).join("")}</tr>${all.map((t) => `<tr><td>${h(t.name)}${t.marshal ? " (marshal)" : ""}</td><td>${h(t.role)}</td><td>${h(deptName(t.dept))}</td><td>${h(t.shift || "")}</td>${HF_COURSES.map((cc) => { const k = cc[0]; if (!courseApplies(t, cc)) return "<td>n/a</td>"; const d = (t.courses || {})[k]; return `<td>${d ? fds(d) + (evOf(t, k).confirmed ? " ✓" : " (to confirm)") : "—"}</td>`; }).join("")}</tr>`).join("")}</table>` + foot;
      audit("Training matrix PDF"); setTimeout(() => window.print(), 300);
    };
  };
  $$("[data-t]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); edit(a.dataset.t); }));
  $("#t-session", v).onclick = () => {
    const staff = reg("training").sort((a, b) => natRef(a.dept, b.dept) || natRef(a.name, b.name));
    const groups = {}; staff.forEach((t) => (groups[t.dept || "other"] = groups[t.dept || "other"] || []).push(t));
    const m = modal(`<h3>Record a training session</h3>
      <p class="muted">Use this for a real session that has taken place. Everyone you tick gets the date on the matrix, and the signed attendance sheet is stored as the evidence.</p>
      <div class="f2"><div><label>Course</label><select id="ss-c">${HF_COURSES.map(([k, l]) => `<option value="${k}">${h(l)}</option>`).join("")}</select></div>
      <div><label>Date of the session</label><input type="date" id="ss-d" max="${today()}"></div>
      <div><label>Trainer</label><input id="ss-t" value="${h(HF_FIRE_MANAGER.name)}"></div><div><label>Signed attendance sheet (photo or PDF)</label><input type="file" id="ss-f" accept="image/*,.pdf"></div></div>
      <label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="ss-conf" checked style="width:auto"> Mark as evidence seen (I have the signed attendance sheet)</label>
      <label>Who attended</label>
      ${Object.keys(groups).map((g) => `<div style="margin:6px 0"><label class="row" style="text-transform:none;font-size:13px;color:var(--navy);margin:0"><input type="checkbox" data-g="${g}" style="width:auto"> <b>${h(deptName(g))}</b> (select all)</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:2px 10px;padding-left:22px">${groups[g].map((t) => `<label class="row" style="text-transform:none;font-size:13px;color:var(--ink);margin:0"><input type="checkbox" data-p="${t.id}" data-pg="${g}" style="width:auto"> ${h(t.name)}</label>`).join("")}</div></div>`).join("")}
      <div class="row" style="margin-top:12px"><button class="btn red" id="ss-go">Save session</button><button class="btn ghost" data-close>Cancel</button></div><div class="err" id="ss-e"></div>`);
    $$("[data-g]", m).forEach((g) => (g.onchange = () => $$(`[data-pg="${g.dataset.g}"]`, m).forEach((x) => (x.checked = g.checked))));
    $("#ss-go", m).onclick = async () => {
      const k = $("#ss-c", m).value, d = $("#ss-d", m).value, tr = $("#ss-t", m).value.trim(), conf = $("#ss-conf", m).checked, e = $("#ss-e", m);
      const who = $$("[data-p]", m).filter((x) => x.checked).map((x) => x.dataset.p);
      if (!d) return (e.textContent = "Enter the date of the session.");
      if (!who.length) return (e.textContent = "Tick who attended.");
      try {
        $("#ss-go", m).disabled = true; S.hold = true;
        let sheet = null; const fi = $("#ss-f", m).files[0];
        if (fi) { e.textContent = "Uploading the attendance sheet…"; sheet = await upload("training", fi);
          await add("registers", { kind: "doc", title: `Training attendance — ${HF_COURSES.find((c) => c[0] === k)[1]} — ${fds(d)}`, cat: "Training", date: d, version: "", author: tr, notes: `${who.length} attendees`, file: sheet }); }
        for (const id of who) {
          const t = S.data.registers.find((x) => x.id === id); const courses = { ...(t.courses || {}), [k]: d };
          const ev = { ...(t.ev || {}), [k]: { confirmed: conf, by: S.user.name, at: today(), trainer: tr, sheet: sheet ? sheet.path : (((t.ev || {})[k]) || {}).sheet || "" } };
          await put("registers", id, { courses, ev });
        }
        audit(`Training session recorded: ${HF_COURSES.find((c) => c[0] === k)[1]} on ${d}, ${who.length} staff${sheet ? ", attendance sheet uploaded" : ""}`);
        S.hold = false; render(); m.close(); toast(`${who.length} staff updated`);
      } catch (err) { S.hold = false; $("#ss-go", m).disabled = false; e.textContent = err.message; }
    };
  };
};

/* ============================================================ DRILLS, PEEPs, PERMITS */
VIEWS.drills = () => {
  const dr = recs("drill").sort((a, b) => natRef(b.date, a.date));
  const yr = dr.filter((d) => d.date >= addMonths(today(), -12));
  const peeps = reg("peep").sort((a, b) => natRef(b.from, a.from));
  const permits = reg("permit").sort((a, b) => natRef(b.date, a.date));
  return `<h2>Drills, PEEPs and <span class="fl">hot work permits</span></h2>
  <h3>Fire drills</h3>
  <p class="muted">At least twice a year, with at least one involving night staff. Last 12 months: ${yr.length} drill${yr.length === 1 ? "" : "s"} (day ${yr.filter((d) => (d.fields || {}).shift === "Day").length}, night ${yr.filter((d) => (d.fields || {}).shift === "Night").length}).</p>
  <button class="btn red sm" data-rec="drill">Record a drill</button>
  <div class="tw" style="margin-top:8px"><table><tr><th>Date</th><th>Day / night</th><th>Evacuation time</th><th>Staff</th><th>Issues</th><th>Recorded by</th></tr>
  ${dr.map((d) => { const f = d.fields || {}; return `<tr data-id="${d.id}" style="cursor:pointer"><td>${fd(d.date)}${d.imported ? `<span class="imp">PAST RECORD</span>` : ""}</td><td>${h(f.shift)}</td><td>${h(f.evac)} min</td><td>${h(f.staff)}</td><td>${h(f.issues)}</td><td>${h(d.imported ? d.doneBy : d.byName)}</td></tr>`; }).join("") || `<tr><td colspan="6" class="muted">No drills recorded.</td></tr>`}
  </table></div>
  <h3>Guest PEEPs (personal emergency evacuation plans)</h3>
  <button class="btn red sm" data-new="peep">+ Add PEEP</button>
  <div class="tw" style="margin-top:8px"><table><tr><th>Guest / room</th><th>Assistance</th><th>Plan</th><th>Stay</th><th>Night staff told</th></tr>
  ${peeps.map((p) => `<tr><td><a href="#" data-r="${p.id}" data-kind="peep">${h(p.guest)}</a></td><td>${h(p.needs)}</td><td>${h(p.plan)}</td><td>${fds(p.from)} – ${fds(p.to)}</td><td>${h(p.told)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">None recorded.</td></tr>`}
  </table></div>
  <h3>Hot work permits</h3>
  <div class="note">The person who authorises a permit must be a member of hotel staff, not the contractor doing the work.</div>
  <button class="btn red sm" data-new="permit">+ Add permit</button>
  <div class="tw" style="margin-top:8px"><table><tr><th>No.</th><th>Date</th><th>Location / work</th><th>Contractor</th><th>Authorised by</th><th>Fire watch ended</th><th>Closed</th></tr>
  ${permits.map((p) => `<tr><td><a href="#" data-r="${p.id}" data-kind="permit">${h(p.no || "—")}</a></td><td>${fds(p.date)}</td><td>${h(p.location)}<br><span class="muted">${h(p.work)}</span></td><td>${h(p.contractor)}</td><td>${h(p.authorisedBy)}${p.authorisedBy && p.contractor && p.authorisedBy.trim().toLowerCase() === p.contractor.trim().toLowerCase() ? " " + pill("Same as contractor") : ""}</td><td>${h(p.watchEnd)}</td><td>${pill(p.closed === "Yes" ? "Done" : "Due")}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">None recorded.</td></tr>`}
  </table></div>`;
};
BIND.drills = (v) => {
  bindRec(v);
  $$("tr[data-id]", v).forEach((tr) => (tr.onclick = () => viewRecord(tr.dataset.id)));
  $$("[data-new]", v).forEach((b) => (b.onclick = () => editReg(b.dataset.new, null)));
  $$("[data-r]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); editReg(a.dataset.kind, a.dataset.r); }));
};

/* ============================================================ DIARY */
function diaryItems(from, to) {
  const out = [];
  const push = (date, title, kind, extra = {}) => { if (date >= from && date <= to) out.push({ date, title, kind, ...extra }); };
  // weekly alarm tests
  for (let i = Math.max(0, rotaIndex(from)); ; i++) { const w = rotaWeek(i); if (w.wc > to) break; const s = weekStatus(w); push(w.day, `Weekly fire alarm test — ${w.marshal}`, "Weekly test", { st: s.st }); }
  // monthly checks: first Monday of each month
  let mo = from.slice(0, 8) + "01";
  while (mo <= to) {
    let d = mo; while (parse(d).getDay() !== 1) d = addDays(d, 1);
    HF_CHECKS.filter((c) => c.freq === "monthly").forEach((c) => { const done = recs(c.id).some((r) => r.date.slice(0, 7) === mo.slice(0, 7)); push(d, `${c.name} (during ${MON[+mo.slice(5, 7) - 1]})`, "Monthly check", { st: done ? "Done" : (today() > addMonths(mo, 1) ? "Missed" : "Due") }); });
    mo = addMonths(mo, 1);
  }
  // certificates next due
  reg("cert").forEach((c) => { const s = certState(c); if (s.next) push(s.next < from ? from : s.next, `${c.name} due${s.next < from ? " (overdue since " + fds(s.next) + ")" : ""}`, "Contractor", { st: s.st }); });
  // actions due
  S.data.actions.filter((a) => a.due && a.status !== "Completed").forEach((a) => push(a.due, `${a.ref}: ${a.title}`, "Action due", { st: a.status }));
  // inspection
  push(HF_HOTEL.inspection.date, `Fire Safety Order audit ${HF_HOTEL.inspection.time} — ${HF_HOTEL.inspection.inspector}`, "Inspection");
  // custom
  S.data.diary.forEach((d) => push(d.date, d.title, d.kind || "Diary", { id: d.id, who: d.who, st: d.done ? "Done" : "Planned" }));
  return out.sort((a, b) => natRef(a.date, b.date));
}
VIEWS.diary = () => {
  const from = mondayOf(addDays(today(), -14)), to = addDays(mondayOf(today()), 7 * 16 + 6);
  const items = diaryItems(from, to);
  const weeks = {}; items.forEach((it) => { const k = mondayOf(it.date); (weeks[k] = weeks[k] || []).push(it); });
  return `<h2>Fire safety <span class="fl">diary</span></h2>
  <p class="lead">Weekly tests, monthly checks, contractor visits, certificates falling due, action deadlines and drills — two weeks back and sixteen weeks ahead.</p>
  <div class="row" style="margin-bottom:10px"><div class="grow"></div><button class="btn red" id="dy-new">+ Add to diary (drill, visit, training…)</button></div>
  ${Object.keys(weeks).sort().map((k) => `<div class="wk"><h4>Week commencing ${fd(k)}${k === mondayOf(today()) ? " — this week" : ""}</h4>
    ${weeks[k].map((it) => `<div class="di"><div class="d">${DOW[parse(it.date).getDay()]} ${parse(it.date).getDate()} ${MON[parse(it.date).getMonth()]}</div><div class="x">${h(it.title)}${it.who ? ` <span class="muted">· ${h(it.who)}</span>` : ""}<br><span class="muted">${h(it.kind)}</span></div>
      <div>${it.st ? pill(it.st === "Overdue" && it.kind === "Weekly test" ? "Overdue" : it.st) : ""}${it.id ? ` <button class="btn sm ghost" data-dd="${it.id}">${it.st === "Done" ? "Undo" : "Mark done"}</button>` : ""}</div></div>`).join("")}</div>`).join("")}`;
};
BIND.diary = (v) => {
  $("#dy-new", v).onclick = () => {
    const m = modal(`<h3>Add to diary</h3><div class="f2"><div><label>Date</label><input type="date" data-k="date" value="${today()}"></div>
      <div><label>Type</label><select data-k="kind">${["Fire drill (day)", "Fire drill (night)", "Contractor visit", "Training", "Meeting", "Other"].map((o) => `<option>${o}</option>`).join("")}</select></div></div>
      <label>What</label><input data-k="title"><label>Who</label><input data-k="who">
      <div class="row" style="margin-top:12px"><button class="btn red" id="ys">Save</button><button class="btn ghost" data-close>Cancel</button></div>`);
    $("#ys", m).onclick = async () => { const o = {}; $$("[data-k]", m).forEach((el) => (o[el.dataset.k] = el.value.trim())); if (!o.title || !o.date) return; await add("diary", o); m.close(); };
  };
  $$("[data-dd]", v).forEach((b) => (b.onclick = async () => { const d = S.data.diary.find((x) => x.id === b.dataset.dd); await put("diary", d.id, { done: !d.done }); }));
};

/* ============================================================ REGULATIONS */

/* ============================================================ PROCEDURES (infographics) */
/* Drawn from the Fire Action Procedure (BHH-ST-02) and the Fire Safety Manual v1.1.
   Site facts (assembly point, panel locations, contacts) are set in Settings. */
const siteFact = (k, fallback) => { const v = (cfg().site || {})[k]; return v ? h(v) : `<span class="tbc">${fallback || "to be confirmed"}</span>`; };
const ADDR = "Brandon Hall Hotel and Spa, Main Street, Brandon, Coventry CV8 3FW";
function procStrip() {
  const tile = (n, icon, t, d, col) => `<a href="#" data-go="procs" class="pstrip" style="--c:${col}"><div class="pn">${n}</div><div class="pi">${icon}</div><b>${t}</b><span>${d}</span></a>`;
  return `<div class="pstrip-row">
    ${tile(1, "🔥", "Discover a fire", "Break the nearest call point. Leave, closing doors behind you.", "#B3261E")}
    ${tile(2, "📞", "Call 999 — every time", "Our alarm is <b>not monitored</b>. Reception (or anyone alone) calls 999.", "#C62828")}
    ${tile(3, "🧭", "Duty manager to the panel", "Identify the zone, take charge, sweep teams go.", "#2C3E50")}
    ${tile(4, "🚪", "Get everyone out", "Everyone leaves at once. Never use the lift.", "#1D4E89")}
    ${tile(5, "📋", "Assembly point & roll call", `${siteFact("assembly", "assembly point to be confirmed")}. Nobody goes back in.`, "#1E8A55")}
  </div>`;
}
VIEWS.procs = () => {
  const card = (icon, title, src, body, col = "var(--red)") => `<div class="pcard" style="--c:${col}"><div class="ph"><span class="pic">${icon}</span><div><h3>${title}</h3><div class="psrc">Source: ${src}</div></div></div>${body}</div>`;
  const steps = (arr) => `<ol class="psteps">${arr.map(([t, d]) => `<li><b>${t}</b>${d ? `<span>${d}</span>` : ""}</li>`).join("")}</ol>`;
  const roles = (arr) => `<div class="proles">${arr.map(([r, w, d]) => `<div class="prole"><div class="prr">${r}</div><div class="prw">${w}</div><div class="prd">${d}</div></div>`).join("")}</div>`;
  return `<div class="row"><div class="grow"><h2>Fire <span class="fl">procedures</span></h2>
    <p class="lead">What every member of staff does, in pictures. Taken from our Fire Action Procedure (BHH-ST-02), the Fire Safety Manual and the Reception Fire Alarm Activation Procedure — when those change, update them here too.</p></div>
    <button class="btn ghost" id="pr-print">🖨 Print as posters</button></div>
  <div class="pkeys">
    <div><b>Simultaneous evacuation</b><span>Everyone leaves when the alarm sounds</span></div>
    <div style="--c:#C62828"><b>Alarm NOT monitored</b><span>Staff call 999 on every activation</span></div>
    <div style="--c:#1D4E89"><b>Never use the lift</b><span>Stairs and final exits only</span></div>
    <div style="--c:#1E8A55"><b>Assembly point</b><span>${siteFact("assembly")}</span></div>
  </div>
  <div class="pgrid">
  ${card("🔥", "1. If you discover a fire", "BHH-ST-02 §1 · Manual §8", steps([
    ["Raise the alarm", "Break the nearest red call point."],
    ["Get out, close doors", "Leave the area and close doors behind you to hold the fire back."],
    ["Only tackle it if safe", "Small fire, you are trained, and your way out is behind you — otherwise leave it."],
    ["Report to the duty manager", "At the fire alarm panel or at the assembly point."]]))}
  ${card("📞", "2. Calling the fire service", "BHH-ST-02 §2 · Manual §7–8", `<div class="pbig">999</div>
    <p style="text-align:center;margin:4px 0 10px">on <b>every</b> activation — our alarm does not call the fire service for us.</p>
    <div class="psay">“Fire at <b>${ADDR}</b>. The panel shows <b>[zone / location]</b>.”</div>
    <p class="muted" style="margin-top:8px">Reception makes the call in the day. At night, night staff 1 — or anyone working alone calls first.</p>`, "#C62828")}
  ${card("🏨", "3. When the alarm sounds — day", "BHH-ST-02 §2", roles([
    ["In charge", "Duty manager", "To the panel at " + siteFact("mainPanel", "main panel — location tbc") + ". Identify zone and device. Take control."],
    ["999 call", "Reception", "Call 999. Take arrivals list, staff rota and sign-in sheets to the assembly point."],
    ["Sweep bedrooms", "Allocated staff", "Walk your corridors, direct guests to the nearest exit, close doors. No lift."],
    ["Sweep public areas", "Allocated staff", "Bar, restaurant, Brandon & Wolston suites, meeting rooms, WCs."],
    ["Kitchen", "Head / senior chef", "Turn off cooking and gas if safe. Leave by the nearest exit."],
    ["Guests needing help", "Allocated staff", "Follow each guest's PEEP. Check refuge points."],
    ["Meet the fire service", "Named person", "At the main entrance with the guest list, panel information and anyone missing."]]), "#2C3E50")}
  ${card("🌙", "4. When the alarm sounds — night (2 staff)", "BHH-ST-02 §3 · Manual §22", roles([
    ["Night staff 1", "Night manager / porter", "Panel → identify zone → call 999 → guest list to the assembly point → meet the fire service."],
    ["Night staff 2", "Second night staff", "Sweep bedroom wings from the affected zone outwards, knocking on doors. Help guests with a PEEP."],
    ["Working alone", "Anyone", "<b>Call 999 first</b>, then the panel, then wake the affected wing. Tell the fire service what has not been checked."]]) +
    `<p class="muted" style="margin-top:8px">Night fire patrol after midnight: routes clear, exits unlocked, fire doors shut, panel normal, laundry and kitchen off.</p>`, "#1D4E89")}
  ${card("📋", "5. Assembly point and roll call", "BHH-ST-02 §4", steps([
    ["Go to the assembly point", siteFact("assembly")],
    ["Roll call", "Guest arrivals list, staff rota, visitor and contractor sign-in, spa sign-in sheet."],
    ["Report anyone missing", "Name and room number to the fire service."],
    ["Nobody goes back in", "Until the fire service gives the all-clear."]]), "#1E8A55")}
  ${card("🧖", "6. Spa, pool, gym and Woodlands", "BHH-ST-02 §5 · Manual §26", `${steps([
    ["Shared alarm", "Granite Leisure staff evacuate their areas under their own procedure."],
    ["Wet and in robes", "Clear the pool hall, sauna, steam room and changing rooms first. Robes and towels for guests outside."],
    ["Report in", "Granite Leisure report to the hotel duty manager at the assembly point, with the spa sign-in list."]])}
    <p class="muted">Granite Leisure contact: ${siteFact("granite")}</p>`, "#00897B")}
  ${card("💍", "7. Events, weddings and ceremonies", "Manual §24 · pre-event check BHH-FS-25", steps([
    ["Numbers within the room's fire limit", "See Venues & events. Never exceed it."],
    ["Exits, signs and gangways clear", "Layouts keep every route to a final exit open."],
    ["No naked flames", "Candles only in enclosed holders, away from drapes and exits. No pyrotechnics or haze without written agreement."],
    ["Brief the organiser", "Exits, assembly point, no lift. Suppliers sign in and get the fire information."]]), "#6A3FA0")}
  ${card("🔁", "8. After every activation", "BHH-ST-02 §6 · Manual §19", steps([
    ["Do not reset until the cause is found", "Duty manager checks the zone first."],
    ["Record it", "HosFIRE → Record a check → Fire alarm event (cause, 999 called, fire service attended)."],
    ["Repeat false alarm or fault?", "Report to Leader Systems the same day: " + (h((cfg().site || {}).leaderPhone || "01788 542 220")) + "."],
    ["Impairments", "Any isolation is authorised by the duty manager, logged with interim measures, and restored before the contractor leaves."]]), "#B36B00")}
  ${card("🔔", "9. Weekly fire alarm test", "Manual §7 · BS 5839-1", steps([
    ["Tell reception and the duty manager", ""],
    ["Operate one call point", "A different one each week, in rotation. Planned day and marshal are on the Weekly tests tab."],
    ["Check", "Panel shows the zone · sounders heard everywhere · panel reset · logbook entry."],
    ["Record it in HosFIRE", "Record a check → Weekly fire alarm test (or HosFIRE Mobile)."]]), "#1D4E89")}
  ${card("🛎️", "10. Reception — when the alarm sounds", "Reception Fire Alarm Activation Procedure (Front Office, Oct 2026)", steps(HF_RECEPTION_STEPS), "#C62828")}
  </div>`;
};
BIND.procs = (v) => {
  $$("[data-go]", v).forEach((a) => (a.onclick = (e) => { e.preventDefault(); S.tab = a.dataset.go; render(); }));
  $("#pr-print", v).onclick = () => {
    $("#print").innerHTML = `<div class="pposter"><div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #B3261E;padding-bottom:6px;margin-bottom:10px"><img src="assets/marketing/logos/logo-blue-transparent.png" style="height:48px" onerror="this.style.display='none'"><h1 style="margin:0">Brandon Hall Hotel and Spa — Fire procedures</h1></div>${$(".pkeys", v).outerHTML}<div class="pgrid">${$$(".pcard", v).map((c) => c.outerHTML).join("")}</div><p style="font-size:10px;color:#555">From the Fire Action Procedure (BHH-ST-02) and Fire Safety Manual v1.1. Printed ${fdt(Date.now())}.</p></div>`;
    setTimeout(() => window.print(), 300);
  };
};


VIEWS.regs = () => `<h2>Regulations and <span class="fl">standards</span></h2>
  <p class="lead">What the law and the British Standards require, and how HosFIRE records each one. This is a summary for the team, not legal advice.</p>
  ${HF_REGS.map((g) => `<h3>${h(g.t)}</h3><div class="tw"><table>${g.items.map(([a, b]) => `<tr><td style="width:210px"><b>${h(a)}</b></td><td>${h(b)}</td></tr>`).join("")}</table></div>`).join("")}
  <h3>Our checks</h3>
  <div class="tw"><table><tr><th>Ref</th><th>Check</th><th>How often</th><th>Who</th><th>Standard</th></tr>
  ${HF_CHECKS.map((c) => `<tr><td>${h(c.ref)}</td><td>${h(c.name)}</td><td>${h({ daily: "Daily", weekly: "Weekly", monthly: "Monthly", event: "Each time" }[c.freq])}</td><td>${h(c.owner)}</td><td class="muted">${h(c.std)}</td></tr>`).join("")}</table></div>
  <h3>Contractor intervals</h3>
  <div class="tw"><table>${HF_CALENDAR.map((c) => `<tr><td>${h(c.what)}</td><td>Every ${c.every} months</td></tr>`).join("")}</table></div>`;

/* ============================================================ INSPECTOR PACK */
const PACK_SECS = [["cover", "Cover and contents"], ["summary", "1. Summary, people and contacts"], ["gaps", "2. Known gaps and what we are doing"], ["actions", "3. Fire risk assessment and action tracker"],
  ["procs", "4. Fire procedures (incl. reception procedure)"], ["plans", "5. Floor plans and escape routes"], ["weekly", "6. Weekly fire alarm tests"], ["records", "7. Daily, monthly and other check records"], ["scans", "8. Scanned paper sheets held"],
  ["certs", "9. Certificates and contractor servicing"], ["drills", "10. Fire drills"], ["training", "11. Training matrix"], ["docs", "12. Documents and signatures"],
  ["venues", "13. Function rooms and event checks"], ["audit", "14. Audit readiness checklist"], ["regs", "15. Regulations summary"], ["visit", "16. Inspection visit record (for the inspector)"]];
VIEWS.pack = () => {
  const f = S.f.pack || (S.f.pack = { from: HF_BACKFILL_FROM, to: today() });
  return `<h2>Inspector <span class="fl">pack</span></h2>
  <p class="lead">One printable binder built from the live records, with our logo, a contents page and numbered tabs. In the print window choose your printer, or "Save as PDF". Past records entered from a source are labelled as such.</p>
  <div class="card" style="border-left:6px solid var(--red)"><h3 style="margin-top:0">Print everything</h3>
    <p class="muted">All ${PACK_SECS.length} sections, records from ${fd(HF_BACKFILL_FROM)} to today. Print it after the day's updates are in so the action tracker is current.</p>
    <button class="btn red" id="pk-all">🖨 Print the full inspector pack</button></div>
  <details class="card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">Choose sections or dates</summary>
  <div class="f2" style="margin-top:10px"><div><label>Records from</label><input type="date" id="pk-from" value="${f.from}"></div><div><label>Records to</label><input type="date" id="pk-to" value="${f.to}"></div></div>
  <label>Sections</label>${PACK_SECS.map(([k, l]) => `<label class="row" style="text-transform:none;font-size:14px;color:var(--ink);margin:4px 0"><input type="checkbox" data-sec="${k}" checked style="width:auto"> ${l}</label>`).join("")}
  <button class="btn" id="pk-go" style="margin-top:10px">Print selected sections</button></details>`;
};
BIND.pack = (v) => {
  const go = async (from, to, on) => {
    S.planUrls = {};
    if (on.plans && S.live && fb.st) { toast("Preparing floor plans…");
      for (const d of reg("doc").filter((x) => x.cat === "Floor plan" && x.file && x.file.path)) { try { S.planUrls[d.id] = await fb.st.ref(d.file.path).getDownloadURL(); } catch (e) {} } }
    $("#print").innerHTML = packHTML(from, to, on); audit(`Inspector pack printed (${from} to ${to})`);
    const imgs = $$("#print img"); await Promise.all(imgs.map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));
    setTimeout(() => window.print(), 300);
  };
  $("#pk-all", v).onclick = () => go(HF_BACKFILL_FROM, today(), Object.fromEntries(PACK_SECS.map(([k]) => [k, true])));
  $("#pk-go", v).onclick = () => {
    const from = $("#pk-from", v).value, to = $("#pk-to", v).value; S.f.pack = { from, to };
    go(from, to, Object.fromEntries($$("[data-sec]", v).map((c) => [c.dataset.sec, c.checked])));
  };
};
function packHTML(from, to, on) {
  const ins = HF_HOTEL.inspection, LOGO = "assets/marketing/logos/logo-blue-transparent.png";
  const A = S.data.actions.slice().sort((a, b) => natRef(a.category, b.category) || natRef(a.ref, b.ref));
  const R = S.data.records.filter((r) => !r.correctionOf && r.date >= from && r.date <= to).sort((a, b) => natRef(a.date, b.date));
  const tbl = (heads, rows) => `<table><tr>${heads.map((x) => `<th>${h(x)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${heads.length}">None in this period.</td></tr>`}</table>`;
  const src = (r) => (r.imported ? ` <i>(past record entered ${fdt(r.createdAt)} from: ${h(r.source)} — ${h(r.sourceRef)}${r.scanFile ? "; scanned sheet held in HosFIRE" : ""})</i>` : "");
  const secs = PACK_SECS.filter(([k]) => on[k] && k !== "cover");
  const sec = (k, extra = "") => { const l = (PACK_SECS.find((x) => x[0] === k) || [k, k])[1], m = l.match(/^(\d+)\.\s*(.*)$/);
    return `<div class="pk-sec"><div class="pk-run"><img src="${LOGO}" onerror="this.style.display='none'"><span>${h(HF_HOTEL.name)} · Fire safety records</span><span>Tab ${m ? m[1] : ""}</span></div>
      <h2 class="pk-h"><span class="pk-tab">${m ? m[1] : ""}</span>${h(m ? m[2] : l)}</h2>${extra}`; };
  const end = "</div>";
  const tbc = (k) => { const v = (cfg().site || {})[k]; return v ? h(v) : "<i>to be confirmed</i>"; };
  const sigs = signItems();
  let out = "";

  if (on.cover) {
    out += `<div class="pk-cover"><img src="${LOGO}" onerror="this.style.display='none'">
      <div class="pk-kick">Fire safety records</div><h1>Inspector pack</h1><div class="pk-hotel">${h(HF_HOTEL.name)}<br>${h(HF_HOTEL.address)}</div>
      <table class="pk-ct">
        <tr><td>Inspection</td><td><b>${fd(ins.date)} at ${h(ins.time)}</b></td></tr>
        <tr><td>Inspecting officer</td><td>${h(ins.inspector)}, ${h(ins.body)}</td></tr>
        <tr><td>Reference</td><td>${h(ins.ref)}</td></tr>
        <tr><td>Fire Safety Manager</td><td>${h(HF_FIRE_MANAGER.name)}</td></tr>
        <tr><td>Management approval</td><td>Patrik Vlach, Front Office Manager</td></tr>
        <tr><td>Fire marshals</td><td>${h(marshals().join(", "))}</td></tr>
        <tr><td>Records covered</td><td>${fd(from)} to ${fd(to)}</td></tr>
        <tr><td>Produced</td><td>${fdt(Date.now())} by ${h(S.user.name)}, from HosFIRE (live records)</td></tr></table>
      <h3>Contents</h3><table class="pk-toc">${secs.map(([, l]) => { const m = l.match(/^(\d+)\.\s*(.*)$/); return `<tr><td class="pk-tn">${m ? m[1] : ""}</td><td>${h(m ? m[2] : l)}</td></tr>`; }).join("")}</table>
      <p class="pk-note">Records made in HosFIRE are saved under the name of the person who made them, with the date and time, and cannot be edited — corrections are added as new records. Records from before HosFIRE are labelled as past records with their source (paper sheet, Saeker or contractor report).</p></div>`;
  }

  if (on.summary) {
    const open = A.filter((a) => a.status !== "Completed");
    out += sec("summary") + tbl(["Item", "Position"], [
      ["Premises", `${h(HF_HOTEL.name)}, ${h(HF_HOTEL.address)}`],
      ["Fire Safety Manager", h(HF_FIRE_MANAGER.name) + " (" + h(HF_FIRE_MANAGER.role) + ")"],
      ["Fire marshals", h(marshals().join(", "))],
      ["Evacuation strategy", "Simultaneous evacuation. The alarm is <b>not monitored</b>: staff call 999 on every activation."],
      ["Assembly point", tbc("assembly")], ["Main fire alarm panel", tbc("mainPanel")], ["Spa panel", tbc("spaPanel")],
      ["Fire alarm contractor", `Leader Systems — fault line ${tbc("leaderPhone")}`], ["Spa and leisure operator", `Granite Leisure — ${tbc("granite")}`],
      ["Fire risk assessment", (() => { const F = HF_HOTEL.fra; return `${fd(F.date)} by ${h(F.assessor)} — ${h(F.standard)}, ref ${h(F.ref)}, signed ${fds(F.signed)}. Risk rating: <b>${h(F.rating)}</b>. Review due ${fds(F.review)}. ${h(F.rev1)} also held.`; })()],
      ["Audit readiness (self-assessed)", auditScore().pc + "%"],
      ["Actions", `${A.length} total · ${A.filter((a) => a.status === "Completed").length} completed · ${A.filter((a) => a.status === "In progress").length} in progress · ${A.filter((a) => a.status === "Not started").length} not started · ${open.filter((a) => a.priority === "High").length} high-priority open`],
      ["Weekly alarm tests in period", String(R.filter((r) => r.type === "weekly_alarm").length)],
      ["Check records in period", String(R.length) + ` (of which ${R.filter((r) => r.imported).length} past records entered from a source)`],
      ["Drills in period", String(R.filter((r) => r.type === "drill").length)]]) + end;
  }

  if (on.gaps) {
    const G = [];
    const hi = A.filter((a) => a.status !== "Completed" && a.priority === "High");
    if (hi.length) G.push(["High-priority actions still open", hi.map((a) => `<b>${h(a.ref)}</b> ${h(a.title)} — ${h(a.status)}${a.due ? ", due " + fds(a.due) : ""}${a.owner ? " (" + h(a.owner) + ")" : ""}`).join("<br>"), "Owner and due date for each in the action tracker (tab 3)."]);
    const W = backWeeks().filter((wc) => wc >= from && !inRange("weekly_alarm", wc, addDays(wc, 6)).length);
    if (W.length) G.push(["Weekly fire alarm tests with no record", `${W.length} week${W.length === 1 ? "" : "s"} between ${fds(W[0])} and ${fds(W[W.length - 1])} have no test record we can evidence.`, "Testing on a fixed weekly rota with named marshals from 26 Oct 2026, recorded in HosFIRE on the day. Panel event log to be obtained from Leader Systems to evidence earlier tests."]);
    const certs = reg("cert").filter((c) => certState(c).st !== "OK");
    if (certs.length) G.push(["Certificates overdue, due or without a date", certs.map((c) => `${h(c.ref)} ${h(c.name)} — ${h(certState(c).st)}`).join("<br>"), "Contractor visits being booked; see tabs 3 and 9."]);
    const TR = reg("training"), noT = TR.filter((t) => !(t.courses || {}).induction), unc = TR.filter((t) => (t.courses || {}).induction && !evOf(t, "induction").confirmed);
    const RC = HF_COURSES.find((c) => c[0] === "reception"), rc = TR.filter((t) => courseApplies(t, RC) && !(t.courses || {}).reception);
    if (noT.length || unc.length || rc.length) G.push(["Training records", [noT.length ? `${noT.length} staff with no fire training date recorded (mostly joined after the 1 Mar 2026 session).` : "", unc.length ? `${unc.length} staff with a training date but the signed attendance sheet not yet seen.` : "", rc.length ? `${rc.length} reception / night staff not yet briefed on the Reception Fire Alarm Activation Procedure.` : ""].filter(Boolean).join("<br>"), "Induction for new starters and reception briefing being given and recorded with signed attendance sheets (tab 11)."]);
    const os = sigs.filter((x) => !x.sig);
    if (os.length) G.push(["Documents awaiting signature", `${os.length} signature${os.length === 1 ? "" : "s"} outstanding: ` + [...new Set(os.map((x) => x.title))].map(h).join("; "), "Being signed by the named people (tab 12)."]);
    const fl = reg("scan").filter((x) => (x.flags || []).length && !S.data.records.some((r) => r.scanId === x.id));
    const fc = (re) => fl.filter((x) => (x.flags || []).some((f) => re.test(f))).length;
    if (fl.length) G.push(["Paper sheets not entered as records", `${fl.length} scanned sheet${fl.length === 1 ? "" : "s"} held but not entered: ${[[/overwritten/i, "date overwritten"], [/not signed/i, "not signed or no name"], [/no printed/i, "signed but no printed name"], [/do not follow the order/i, "call-point test dates out of rotation order"], [/competent person/i, "contractor/competent person not named"]].map(([re, l]) => { const n = fc(re); return n ? `${n} ${l}` : ""; }).filter(Boolean).join(" · ")}. Each sheet and its points are listed in tab 8.`, "The scans are held as found (tab 8). They are entered as records only where the person who did the check confirms the date and name. Paper checks are replaced by HosFIRE from 26 Oct 2026."]);
    const nr = HF_AUDIT.flatMap((g) => g.items).filter(([id]) => ((S.data.registers.find((r) => r.id === "audit-" + id) || {}).status || "Not ready") !== "Ready");
    if (nr.length) G.push(["Audit checklist items not yet fully ready", `${nr.length} of ${HF_AUDIT.flatMap((g) => g.items).length} — listed in tab 14.`, "Being worked through by the Fire Safety Manager."]);
    out += sec("gaps", `<p>Where our records are incomplete, we say so here rather than leave it to be found. Each gap has an action.</p>`) + tbl(["Gap", "Detail", "What we are doing"], G) + end;
  }

  if (on.plans) { const P = reg("doc").filter((x) => x.cat === "Floor plan").sort((a, b) => natRef(b.title, a.title));
    out += sec("plans", `<p>Escape routes and final exits as shown on the plans in the fire risk assessment (${fd(HF_HOTEL.fra.date)}). Main fire alarm panel: ${(cfg().site || {}).mainPanel ? h(cfg().site.mainPanel) : "<i>to be confirmed</i>"}. Assembly point: ${(cfg().site || {}).assembly ? h(cfg().site.assembly) : "<i>to be confirmed</i>"}.</p>`)
      + (P.length ? P.map((d) => `<div style="break-inside:avoid;margin-bottom:6mm"><h3>${h(d.title)}</h3>${(S.planUrls || {})[d.id] ? `<img src="${S.planUrls[d.id]}" style="width:100%;max-height:235mm;object-fit:contain;border:1px solid #ccc">` : `<p class="muted">Held in HosFIRE → Documents${d.file ? "" : " (file to upload)"}. Print it from there if it does not show here.</p>`}</div>`).join("") : "<p>No floor plans uploaded yet (HosFIRE → Documents, category Floor plan).</p>") + end; }
  if (on.actions) out += sec("actions") + tbl(["Ref", "Action", "Category", "Priority", "Owner", "Due", "Status", "Progress", "Latest note"], A.map((a) => [`<b>${h(a.ref)}</b>`, h(a.title), h(a.category), h(a.priority), h(a.owner), a.due ? fds(a.due) : "", `<b>${h(a.status)}</b>${a.completedOn ? "<br>" + fds(a.completedOn) : ""}`, `${progressOf(a)}%${(a.steps || []).length ? `<br>${a.steps.filter((x) => x.done).length}/${a.steps.length} steps` : ""}`, h(a.notes)])) + end;

  if (on.procs) { const pv = VIEWS.procs(); out += sec("procs") + `<div class="pposter">${pv.slice(pv.indexOf('<div class="pkeys">'))}</div>` + end; }

  if (on.weekly) {
    const W = R.filter((r) => r.type === "weekly_alarm");
    out += sec("weekly", `<p>BS 5839-1 cl. 45.2 — one manual call point each week, in rotation.</p>`) + tbl(["Date", "Time", "Call point", "Zone", "Panel", "Sounders", "Reset", "Logbook", "Done by", "Planned (rota)"], W.map((r) => { const f = r.fields || {}, i = r.items || {}; const t = (k) => ({ pass: "✓", fail: "✗", na: "N/A" }[i[k]] || "");
      return [fd(r.date) + src(r), h(f.time), h(f.callpoint), h(f.zone), t("panel"), t("sounders"), t("reset"), t("logbook"), h(r.imported ? r.doneBy : r.byName), r.rota ? `${fds(r.rota.plannedDay)} · ${h(r.rota.plannedMarshal)}` : ""]; })) + end;
  }
  if (on.records) out += sec("records") + tbl(["Date", "Check", "Result", "Done by", "Saved", "Notes"], R.filter((r) => r.type !== "weekly_alarm").map((r) => [fds(r.date), h((CHECK[r.type] || {}).name || r.type) + src(r), h(resultOf(effective(r))), h(r.imported ? r.doneBy : r.byName), fdt(r.createdAt), h(r.notes) + (S.data.records.find((x) => x.correctionOf === r.id) ? " <i>(corrected)</i>" : "")])) + end;
  if (on.scans) out += sec("scans", `<p>Original paper testing sheets, scanned and held in HosFIRE exactly as found. "Records made" shows how many HosFIRE records were entered from each sheet.</p>`) + tbl(["Sheet", "Check", "Month", "Records made", "Points noted"], reg("scan").sort((a, b) => natRef(a.title, b.title)).map((x) => [h(x.title), h((CHECK[x.checkType] || {}).name || "—"), x.period ? MON[+x.period.slice(5) - 1] + " " + x.period.slice(0, 4) : "", String(S.data.records.filter((r) => r.scanId === x.id).length), (x.flags || []).map(h).join("<br>")])) + end;
  if (on.certs) out += sec("certs") + tbl(["Ref", "Certificate", "Contractor", "Last done", "Next due", "Status", "Cert no."], reg("cert").sort((a, b) => natRef(a.ref, b.ref)).map((c) => { const s = certState(c); return [h(c.ref), h(c.name) + (c.notes ? `<br><i>${h(c.notes)}</i>` : ""), h(c.contractor), c.last ? fds(c.last) : "—", s.next ? fds(s.next) : "", s.st, h(c.certRef)]; })) + end;
  if (on.drills) out += sec("drills") + tbl(["Date", "Day / night", "Evacuation time", "Staff", "Issues"], R.filter((r) => r.type === "drill").map((r) => { const f = r.fields || {}; return [fd(r.date) + src(r), h(f.shift), h(f.evac) + " min", h(f.staff), h(f.issues)]; })) + end;
  if (on.training) out += sec("training", `<p>✓ = signed attendance sheet or certificate seen. "to confirm" = date recorded, evidence not yet seen. n/a = course does not apply to that role.</p>`) + tbl(["Name", "Role", "Shift", ...HF_COURSES.map((c) => c[1])], reg("training").sort((a, b) => natRef(a.dept, b.dept) || natRef(a.name, b.name)).map((t) => [h(t.name) + (t.marshal ? " (marshal)" : ""), h(t.role), h(t.shift), ...HF_COURSES.map((cc) => { const k = cc[0]; if (!courseApplies(t, cc)) return "n/a"; const d = (t.courses || {})[k]; return d ? fds(d) + (evOf(t, k).confirmed ? " ✓" : " <i>to confirm</i>") : "—"; })])) + end;
  if (on.docs) out += sec("docs") + tbl(["Document", "Category", "Date", "Version", "Issued by", "Held"], reg("doc").filter((d) => d.cat !== "Training").sort((a, b) => natRef(a.cat, b.cat) || natRef(a.title, b.title)).map((d) => [h(d.title), h(d.cat), d.date ? fds(d.date) : "", h(d.version), h(d.author), d.file ? "Yes (HosFIRE)" : "Paper / to upload"]))
    + `<h3>Signatures</h3>` + tbl(["Document", "Role", "Signed by", "Status"], sigs.map((x) => [h(x.title), h(x.role), h(x.sig ? x.sig.name : (LOGINS[x.who] || {}).name || x.ext || x.who || ""), x.sig ? (x.sig.method === "paper" ? `Signed on paper ${fds(x.sig.signedOn)}` : `Signed ${fdt(x.sig.createdAt)}${x.sig.method === "in person" ? " (in person, witnessed)" : ""}`) : "<b>Awaiting signature</b>"])) + end;
  if (on.venues) out += sec("venues") + tbl(["Room", "Ceremony licence", "Exits", "Zone", "Fire limit by layout (sales capacity)"], reg("venue").sort((a, b) => natRef(a.name, b.name)).map((x) => [h(x.name), h(x.ceremony || ""), h(x.exits || ""), h(x.zone || ""), LAYOUTS.map(([k, l]) => ((x.sales || {})[k] || (x.fire || {})[k]) ? `${l}: ${(x.fire || {})[k] || "to confirm"} (${(x.sales || {})[k] || "–"})` : "").filter(Boolean).join("; ")]))
    + `<h3>Pre-event checks in period</h3>` + tbl(["Date", "Room", "Booking", "Guests", "Result", "By"], R.filter((r) => r.type === "event").map((r) => { const f = r.fields || {}; return [fds(r.date), h(f.venue), h(f.bookingRef), h(f.guests) + " " + h(f.layout), h(resultOf(r)), h(r.byName)]; })) + end;
  if (on.audit) out += sec("audit") + HF_AUDIT.map((g) => `<h3>${h(g.t)} — ${auditScore(g).pc}%</h3>${tbl(["Item", "Evidence", "Status", "Notes"], g.items.map(([id, t, ev]) => { const r = S.data.registers.find((x) => x.id === "audit-" + id) || {}; return [h(t), h(ev), `<b>${h(r.status || "Not ready")}</b>`, h(r.note)]; }))}`).join("") + end;
  if (on.regs) out += sec("regs") + HF_REGS.map((g) => `<h3>${h(g.t)}</h3>${tbl(["", ""], g.items.map(([a, b]) => [`<b>${h(a)}</b>`, h(b)]))}`).join("") + end;
  if (on.visit) {
    const line = (l, n = 1) => `<tr><td style="width:32%"><b>${l}</b></td><td>${"<div class='pk-line'></div>".repeat(n)}</td></tr>`;
    out += sec("visit", `<p>For the inspecting officer's use.</p>`) + `<table class="pk-form">${line("Date and time of visit")}${line("Inspecting officer")}${line("Hotel representatives present", 2)}${line("Areas inspected", 3)}${line("Records reviewed", 3)}${line("Observations", 5)}${line("Actions required and timescales", 5)}${line("Inspecting officer signature")}${line("Hotel representative name and signature")}</table>` + end;
  }
  return `<div class="pk">${out}</div>`;
}

/* ============================================================ SETTINGS */
VIEWS.settings = () => {
  const c = cfg();
  const au = S.data.audit.slice().sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).slice(0, 40);
  return `<h2>Settings</h2>
  ${!isAdmin() ? `<p class="muted">Only fire safety managers can change settings.</p>` : `
  <div class="card"><h3 style="margin-top:0">Load starting data</h3>
  <p class="muted">Loads the actions, certificates, document list, training matrix and diary from the HosFIRE starting data file (hosfire-seed.json). Items already in HosFIRE are left alone unless you tick "replace". Check records are never loaded this way.</p>
  <input type="file" id="seed-file" accept=".json"><label class="row" style="text-transform:none;font-size:14px;color:var(--ink)"><input type="checkbox" id="seed-over" style="width:auto"> Replace items that already exist (same ID)</label>
  <button class="btn red" id="seed-go">Load</button> <span id="seed-msg" class="muted"></span>
  <p class="muted">Loaded version: ${h(c.seedVersion || "none")}</p></div>
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Catch up job statuses</h3>
  <p class="muted">Moves any job that has had work recorded on it (a note, photo, ticked step or %) but still says "Not started" to "In progress". Nothing else is changed and nothing is deleted.</p>
  <button class="btn" id="catchup">Check jobs</button> <span class="muted" id="catchup-msg"></span></div>
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Site facts used on the procedure pages</h3>
  <div class="f2">${[["assembly", "Assembly point"], ["mainPanel", "Main fire alarm panel location"], ["spaPanel", "Spa panel location"], ["granite", "Granite Leisure contact (name, phone)"], ["leaderPhone", "Leader Systems fault line"]].map(([k, l]) => `<div><label>${l}</label><input data-site="${k}" value="${h((cfg().site || {})[k] || "")}"></div>`).join("")}</div>
  <button class="btn" id="site-save">Save site facts</button></div>
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Fire marshals and rota</h3>
  <div class="f2"><div><label>Marshals, in rota order (one per line)</label><textarea id="st-m" rows="4">${h(marshals().join("\n"))}</textarea></div>
  <div><label>Rota starts (Monday)</label><input type="date" id="st-r" value="${h(rotaStart())}"><p class="muted">Changing these changes the planned rota for every week, past and future. Recorded tests are not affected.</p></div></div>
  <button class="btn" id="st-save">Save</button></div>
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Backup</h3><p class="muted">Download everything in HosFIRE as a JSON file.</p><button class="btn ghost" id="bk">Download backup</button></div>`}
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Logins</h3>
  <p class="muted">HosFIRE uses the HosPRO logins. Glenn Randell has a HosFIRE-only login: create it once in Firebase Console → Authentication → Add user with email <code>${h(HF_EXTRA_LOGINS["glenn.randell"].email)}</code>. His access code is ${h(HF_EXTRA_LOGINS["glenn.randell"].code)}.</p></div>
  <h3>Change log</h3>
  <div class="tw"><table><tr><th>When</th><th>Who</th><th>What</th></tr>${au.map((a) => `<tr><td class="muted">${fdt(a.createdAt)}</td><td>${h(a.byName)}</td><td>${h(a.what)}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Nothing yet.</td></tr>`}</table></div>`;
};
BIND.settings = (v) => {
  if (!isAdmin()) return;
  $("#seed-go", v).onclick = async () => {
    const fi = $("#seed-file", v).files[0], msg = $("#seed-msg", v); if (!fi) { msg.textContent = "Choose the file first."; return; }
    try {
      const j = JSON.parse(await fi.text()); const over = $("#seed-over", v).checked; let n = 0, skip = 0; S.hold = true;
      for (const k of ["actions", "registers", "diary"]) {
        for (const it of j[k] || []) {
          const { id, ...rest } = it; if (!id) continue;
          const ex = S.data[k].find((x) => x.id === id);
          // Documents / certificates already there (e.g. uploaded before the list was loaded): take the
          // title, category, date etc. from the starting data but keep the uploaded file.
          if (ex && k === "registers" && (rest.kind === "doc" || rest.kind === "cert")) {
            const meta = {}; ["kind", "title", "name", "ref", "cat", "date", "version", "author", "contractor", "last", "months", "certRef", "notes"].forEach((f) => { if (rest[f] !== undefined && rest[f] !== "") meta[f] = rest[f]; });
            await put(k, id, meta); n++; continue;
          }
          if (ex && k === "registers" && rest.kind === "training") {
            const patch = {}; ["role", "dept", "start", "shift", "note"].forEach((f) => { if (!ex[f] && rest[f]) patch[f] = rest[f]; });
            if (rest.marshal && !ex.marshal) patch.marshal = true;
            const courses = { ...(ex.courses || {}) }, ev = { ...(ex.ev || {}) };
            Object.entries(rest.courses || {}).forEach(([c, d]) => { if (d && !courses[c]) { courses[c] = d; if ((rest.ev || {})[c] && !ev[c]) ev[c] = rest.ev[c]; } });
            patch.courses = courses; patch.ev = ev;
            await put(k, id, patch); n++; continue;
          }
          if (!over && ex) { skip++; continue; }
          await put(k, id, { ...rest, seeded: j.version || true, ...(k === "actions" && !rest.history ? { history: [{ at: Date.now(), by: S.user.name, status: rest.status, note: "Loaded from starting data" }] } : {}) }, false); n++;
        }
      }
      await put("config", "main", { seedVersion: j.version || "", marshals: (j.config && j.config.marshals) || marshals(), rotaStart: (j.config && j.config.rotaStart) || rotaStart() });
      audit(`Starting data ${j.version || ""} loaded: ${n} items${skip ? `, ${skip} already there` : ""}`);
      S.hold = false; render();
      modal(`<h3>Starting data loaded</h3><p>Loaded ${n} items${skip ? `, ${skip} already there (left alone)` : ""}.</p><button class="btn" data-close>OK</button>`);
    } catch (e) { S.hold = false; render(); toast("Could not load: " + e.message); }
  };
  $("#catchup", v).onclick = async () => {
    const worked = (a) => a.status === "Not started" && ((a.photos || []).length || (typeof a.pct === "number" && a.pct > 0)
      || (a.steps || []).some((x) => x.done && !/starting data/i.test(x.by || ""))
      || (a.history || []).some((x) => !/starting data|^created$/i.test(x.note || "") && x.note));
    const list = S.data.actions.filter(worked), msg = $("#catchup-msg", v);
    if (!list.length) { msg.textContent = "All job statuses are up to date."; return; }
    S.hold = true;
    for (const a of list) await put("actions", a.id, { status: "In progress", history: (a.history || []).concat([{ at: Date.now(), by: S.user.name, status: "In progress", note: "Status caught up — work had been recorded on this job" }]) });
    audit(`Status catch-up: ${list.length} job(s) moved to In progress (${list.map((a) => a.ref).join(", ")})`);
    S.hold = false; render(); toast(`${list.length} job${list.length === 1 ? "" : "s"} moved to In progress: ${list.map((a) => a.ref).join(", ")}`);
  };
  $("#site-save", v).onclick = async () => { const site = {}; $$("[data-site]", v).forEach((i) => (site[i.dataset.site] = i.value.trim())); await put("config", "main", { site }); audit("Site facts updated"); toast("Saved"); };
  $("#st-save", v).onclick = async () => {
    const ml = $("#st-m", v).value.split("\n").map((x) => x.trim()).filter(Boolean); const rs = $("#st-r", v).value;
    if (!ml.length || !rs || parse(rs).getDay() !== 1) { toast("Enter marshals and a Monday start date"); return; }
    await put("config", "main", { marshals: ml, rotaStart: rs }); audit(`Rota changed: ${ml.join(", ")} from ${rs}`); toast("Saved");
  };
  $("#bk", v).onclick = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), by: S.user.name, data: S.data }, (k, val) => (val && val.toMillis ? val.toMillis() : val), 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `hosfire-backup-${today()}.json`; a.click();
  };
};

/* ============================================================ START */
document.addEventListener("DOMContentLoaded", () => {
  S.live = fbInit();
  buildLogin();
  if (DEMO) { const b = document.createElement("p"); b.className = "muted"; b.style.color = "#B3261E"; b.textContent = "DEMO MODE — nothing is saved to HosPRO. Data stays in this browser only."; $(".lgcard").appendChild(b); }
  if (S.live) fb.auth.onAuthStateChanged((u) => { if (u && !S.user) { const k = keyByEmail(u.email); if (k) gate(k); } });
});
})();
