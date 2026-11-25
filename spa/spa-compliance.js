/* ============================================================
   HosSPA — Compliance & Records tab (manager view)
   Loaded by hosspa.html. Reads/writes Firestore "hosfire_spa"
   (kiosk sign-in, like HosKitchen); falls back to a demo store
   on this device if Firebase is not reachable or ?demo=1.
   Depends on: spa/spa-defs.js, ovOpen/ovClose from hosspa.html
   ============================================================ */
(function () {
  var ROOT = "#v-compliance";
  var QS = new URLSearchParams(location.search);
  var DK = "hosspa_comp_demo";
  var S = { live: false, demo: false, ready: false, recs: [], regs: [], sub: "today", mgr: false, from: null, to: null, fForm: "", fPool: "pool" };
  var $ = function (s) { return document.querySelector(s); };
  var h = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var ymd = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var today = function () { return ymd(new Date()); };
  var addD = function (s, n) { var d = new Date(s + "T12:00"); d.setDate(d.getDate() + n); return ymd(d); };
  var fd = function (s) { return s ? new Date(s + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""; };
  var F = function (id) { return HS_FORMS.find(function (f) { return f.id === id; }); };
  var P = function (id) { return HS_POINTS.find(function (p) { return p.id === id; }); };
  var fb = null;

  /* ── styles ── */
  var css = document.createElement("style");
  css.textContent = ".hsc .sub{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px}.hsc .sub button{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font:700 13px Lato;color:var(--mut);cursor:pointer}.hsc .sub button.on{background:var(--navy);border-color:var(--navy);color:#fff}" +
    ".hsc .pts{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.hsc .pt{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;box-shadow:var(--shadow)}.hsc .pt h4{font-size:15px;color:var(--navy);margin-bottom:8px}.hsc .pt .ln{display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:4px 0;border-top:1px dashed var(--line)}" +
    ".hsc .ok{color:#1f7a57;font-weight:700}.hsc .bad{color:#b23f3b;font-weight:700}.hsc .due{color:#a7761c;font-weight:700}.hsc .muted{color:var(--mut)}" +
    ".hsc .banner{border-radius:12px;padding:12px 15px;margin-bottom:14px;font-size:13.5px}.hsc .banner.amber{background:#fdf3e3;border-left:4px solid #b7791f}.hsc .banner.red{background:#fbe9e8;border-left:4px solid var(--red)}.hsc .banner.teal{background:#eef6f5;border-left:4px solid var(--teal)}" +
    ".hsc .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.hsc .bar input,.hsc .bar select{border:1px solid var(--line);border-radius:9px;padding:8px 10px;font:inherit;font-size:13px}" +
    ".hsc table td,.hsc table th{vertical-align:top}.hsc .mx td,.hsc .mx th{padding:7px 8px;font-size:12px;text-align:center}.hsc .mx td:first-child,.hsc .mx th:first-child{text-align:left}.hsc .c-ok{background:#e4f3ec}.hsc .c-exp{background:#f6e7e6}.hsc .c-soon{background:#fbf0dd}.hsc .c-none{background:#f7f9f9;color:#b5c2bf}" +
    ".hsc .clickable{cursor:pointer}.hsc .live{display:inline-block;font-size:11px;font-weight:900;padding:4px 10px;border-radius:999px;margin-left:8px;vertical-align:middle}.hsc .live.on{background:#e4f3ec;color:#1f7a57}.hsc .live.demo{background:#fbf0dd;color:#a7761c}" +
    ".hsc-f label{display:block;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--mut);font-weight:700;margin:12px 0 5px}.hsc-f input,.hsc-f select,.hsc-f textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px 11px;font:inherit;font-size:14px}.hsc-f .g{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
    ".hsc-f .ci{display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr;gap:6px;align-items:center;font-size:13px;padding:4px 0;border-bottom:1px dashed var(--line)}.hsc-f .ci input{padding:6px 8px;font-size:12.5px}";
  document.head.appendChild(css);

  /* ── data ── */
  function demoAll() { try { return JSON.parse(localStorage.getItem(DK) || "[]"); } catch (e) { return []; } }
  function demoPut(a) { localStorage.setItem(DK, JSON.stringify(a)); }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("could not load " + src)); }; document.head.appendChild(s); }); }
  function connect() {
    if (QS.get("demo") === "1") return Promise.reject(new Error("demo"));
    var chain = Promise.resolve();
    if (typeof firebase === "undefined") chain = chain.then(function () { return loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"); }).then(function () { return Promise.all([loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"), loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js")]); });
    if (typeof firebaseConfig === "undefined") chain = chain.then(function () { return loadScript("firebase-config.js"); });
    if (typeof HF_KIOSK === "undefined") chain = chain.then(function () { return loadScript("hosfire-defs.js"); });
    return chain.then(function () {
      firebase.apps.length || firebase.initializeApp(firebaseConfig);
      fb = { auth: firebase.auth(), db: firebase.firestore() };
      return fb.auth.currentUser ? null : fb.auth.signInWithEmailAndPassword(HF_KIOSK.email, HF_KIOSK.pw);
    }).then(function () {
      var from = addD(today(), -120);
      fb.db.collection(HS_COL).where("date", ">=", from).onSnapshot(function (q) { S.recs = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (r) { return r.kind === "record"; }); render(); }, function (e) { console.warn(e); S.err = e.message; render(); });
      fb.db.collection(HS_COL).where("kind", "==", "register").onSnapshot(function (q) { S.regs = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); render(); }, function (e) { console.warn(e); });
      S.live = true;
    });
  }
  function useDemo() {
    S.demo = true; var a = demoAll();
    if (!a.some(function (r) { return r.kind === "register"; })) { seedRegisters(true); a = demoAll(); }
    if (!a.some(function (r) { return r.kind === "record"; })) { demoSample(); a = demoAll(); }
    S.recs = a.filter(function (r) { return r.kind === "record"; }); S.regs = a.filter(function (r) { return r.kind === "register"; });
  }
  function refreshDemo() { var a = demoAll(); S.recs = a.filter(function (r) { return r.kind === "record"; }); S.regs = a.filter(function (r) { return r.kind === "register"; }); render(); }
  function put(doc) { /* create or update a document */
    doc.updatedAt = Date.now();
    if (S.demo) { var a = demoAll(), i = doc.id ? a.findIndex(function (x) { return x.id === doc.id; }) : -1; if (i >= 0) a[i] = Object.assign(a[i], doc); else { doc.id = "d" + Date.now() + Math.random().toString(36).slice(2, 5); doc.createdAt = Date.now(); a.push(doc); } demoPut(a); refreshDemo(); return Promise.resolve(doc); }
    var id = doc.id, body = Object.assign({}, doc); delete body.id;
    if (id) return fb.db.collection(HS_COL).doc(id).set(body, { merge: true });
    body.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    return fb.db.collection(HS_COL).add(body);
  }
  function del(id) {
    if (S.demo) { demoPut(demoAll().filter(function (x) { return x.id !== id; })); refreshDemo(); return Promise.resolve(); }
    return fb.db.collection(HS_COL).doc(id).delete();
  }
  function seedRegisters(silentDemo) {
    var docs = [];
    HS_SEED_COSHH.forEach(function (c) { docs.push(Object.assign({ kind: "register", type: "coshh", date: today() }, c)); });
    HS_SEED_ACTIONS.forEach(function (a, i) { docs.push({ kind: "register", type: "action", date: today(), n: i + 1, action: a[0], owner: a[1], interim: a[2], due: "", status: "Open", evidence: "" }); });
    if (silentDemo) { var all = demoAll(); docs.forEach(function (d, i) { d.id = "s" + i + Date.now(); d.createdAt = Date.now(); all.push(d); }); demoPut(all); return Promise.resolve(); }
    return Promise.all(docs.map(put));
  }
  function demoSample() {
    var all = demoAll(), t = today();
    var mk = function (form, pid, time, fails, extra) { var f = F(form), p = P(pid) || {}; return Object.assign({ id: "x" + Math.random().toString(36).slice(2, 9), kind: "record", date: t, time: time, form: form, ref: f.ref, formName: f.name, point: pid, pointName: p.name || "", area: p.area || "", byName: "Demo Staff", fails: fails, items: (f.items || []).map(function (q, i) { return { q: q, r: fails && i === 0 ? "fail" : "pass", note: fails && i === 0 ? "Example fault — demo record" : "" }; }), fields: {}, notes: "", createdAt: Date.now() }, extra || {}); };
    all.push(mk("open", "desk", "06:40", 0, { fields: { decision: "Open", authBy: "Demo Duty Manager" } }));
    all.push(mk("pooltest", "pool", "06:25", 0, { pool: "pool", water: { fc: 1.4, cc: 0.2, ph: 7.3, temp: 29, kit: addD(t, 200), clarity: "Clear", within: "Yes", bathers: 0 } }));
    all.push(mk("sauna", "sauna", "06:50", 0, { fields: { temp: 85, product: "Demo" } }));
    all.push(mk("gym", "gym", "07:05", 1));
    all.push(mk("defect", "gym", "07:06", 0, { status: "open", fields: { what: "Treadmill 3", defect: "Belt slipping (demo)", removed: "Yes", reportedTo: "Duty Manager" } }));
    demoPut(all);
  }

  /* ── helpers ── */
  function mgr(fn) { if (S.mgr) return fn(); var c = prompt("Enter the HosSPA manager code:"); if (c === null) return; if ((c || "").trim() !== HS_MGR_CODE) { alert("Incorrect code"); return; } S.mgr = true; fn(); }
  function recsOn(d) { return S.recs.filter(function (r) { return r.date === d; }); }
  function sortT(a) { return a.slice().sort(function (x, y) { return (y.date + (y.time || "")).localeCompare(x.date + (x.time || "")); }); }
  function reg(type) { return S.regs.filter(function (r) { return r.type === type; }); }
  function limitsFor(pool) { return reg("limits").filter(function (r) { return r.pool === pool && r.approved; }).sort(function (a, b) { return (b.approvedDate || "").localeCompare(a.approvedDate || ""); })[0] || null; }
  function dailyRequired() { var out = []; HS_POINTS.forEach(function (p) { p.forms.forEach(function (fid) { var f = F(fid); if (f.daily && !(p.id === "plant" && f.water)) out.push({ p: p, f: f }); }); }); return out; }
  function isDone(d, p, f) { return recsOn(d).filter(function (r) { return r.form === f.id && (!p.area || r.area === p.area); }); }
  function csv(rows) { return rows.map(function (r) { return r.map(function (c) { c = String(c == null ? "" : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(","); }).join("\n"); }
  function download(name, text) { var b = new Blob([text], { type: "text/csv" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function compState(c) { if (!c || !c.date) return "none"; if (!c.expiry) return "ok"; var t = today(); if (c.expiry < t) return "exp"; if (c.expiry < addD(t, 45)) return "soon"; return "ok"; }

  /* ── render ── */
  function shell() {
    var root = $(ROOT); if (!root) return null;
    var subs = [["today", "Today"], ["records", "Records"], ["water", "Water tests"], ["issues", "Defects & incidents"], ["training", "Training matrix"], ["coshh", "COSHH register"], ["actions", "Actions"], ["limits", "Water limits"], ["qr", "QR check points"]];
    root.innerHTML = '<div class="hsc"><div class="ph"><div><h1>Compliance &amp; records<span class="live ' + (S.live ? "on" : "demo") + '">' + (S.live ? "● LIVE" : "DEMO — this device only") + '</span></h1><p>Daily spa safety checks from the QR points, water tests, defects, incidents, training, COSHH and the pre-operation action list. Based on the Health, Safety &amp; Operations Manual v' + HS_VERSION + '.</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btnx sec" href="spa/' + (S.demo ? "?demo=1" : "") + '" target="_blank" style="text-decoration:none">Open staff checks ↗</a></div></div>' +
      '<div class="sub">' + subs.map(function (s) { return '<button data-s="' + s[0] + '" class="' + (S.sub === s[0] ? "on" : "") + '">' + s[1] + "</button>"; }).join("") + '</div><div id="hsc-body"></div></div>';
    root.querySelectorAll(".sub button").forEach(function (b) { b.onclick = function () { S.sub = b.dataset.s; render(); }; });
    return $("#hsc-body");
  }
  function render() {
    if (!S.ready) return; var body = shell(); if (!body) return;
    var fn = { today: vToday, records: vRecords, water: vWater, issues: vIssues, training: vTraining, coshh: vCoshh, actions: vActions, limits: vLimits, qr: vQR }[S.sub];
    body.innerHTML = fn(); bind(body);
  }

  function vToday() {
    var t = today(), req = dailyRequired(), done = req.filter(function (x) { return isDone(t, x.p, x.f).length; }).length;
    var tr = recsOn(t), fails = tr.filter(function (r) { return r.fails; }).length;
    var open = S.recs.filter(function (r) { return r.status === "open"; }).length;
    var wt = tr.filter(function (r) { return r.water; }).length;
    var tm = reg("training"), expC = 0; tm.forEach(function (p) { HS_COMPS.forEach(function (c) { if (compState(p.comps && p.comps[c[0]]) === "exp") expC++; }); });
    var acts = reg("action").filter(function (a) { return a.status !== "Complete"; }).length;
    var noLim = !limitsFor("pool") || !limitsFor("spapool");
    var unrev = tr.filter(function (r) { return !r.reviewedBy; }).length;
    var html = (noLim ? '<div class="banner red"><b>Water limits not approved.</b> Approved operating limits for the pool and spa pool have not been entered by the competent person. Test results are being recorded but cannot be checked automatically. <a href="#" data-go="limits">Enter approved limits →</a></div>' : "") +
      (S.err ? '<div class="banner red"><b>Cannot read the live records</b> (' + h(S.err) + '). Check the hosfire_spa Firestore rule has been published.</div>' : "") +
      (S.demo ? '<div class="banner amber">Demo mode — records here are examples saved on this device only. On brandon.hospro.co.uk this tab reads the live records.</div>' : "") +
      '<div class="kpis">' + [["Daily checks", done + " / " + req.length, done === req.length ? "ok" : "due", "completed today"], ["Failed checks", fails, fails ? "bad" : "ok", "today"], ["Open defects/incidents", open, open ? "bad" : "ok", "need close-out"], ["Water tests", wt, wt ? "ok" : "due", "today"], ["Training expired", expC, expC ? "bad" : "ok", "competencies"], ["Open actions", acts, acts ? "due" : "ok", "pre-operation list"]].map(function (k) { return '<div class="kpi"><div class="l">' + k[0] + '</div><div class="v">' + k[1] + '</div><div class="d ' + k[2] + '">' + k[3] + "</div></div>"; }).join("") + "</div>" +
      '<div class="bar"><b style="color:var(--navy)">Today by check point</b><span class="muted">· ' + new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + '</span><span style="flex:1"></span>' + (unrev ? '<button class="btnx pri" data-act="signall">Manager sign-off for today (' + unrev + ")</button>" : '<span class="ok">✓ All of today\'s records signed off</span>') + "</div>" +
      '<div class="pts">' + HS_POINTS.map(function (p) {
        return '<div class="pt"><h4>' + p.icon + " " + h(p.name) + "</h4>" + p.forms.concat(["defect", "incident"]).map(function (fid) {
          var f = F(fid), rs = isDone(t, p, f).filter(function (r) { return fid === "defect" || fid === "incident" ? r.point === p.id : true; }); if ((fid === "defect" || fid === "incident") && !rs.length) return ""; if (p.id === "plant" && f.water && !rs.length) return "";
          var last = rs[rs.length - 1];
          var s = !rs.length ? (f.daily ? '<span class="due">Not done</span>' : '<span class="muted">—</span>') : last.fails ? '<span class="bad">' + last.time + " · " + last.fails + " issue" + (last.fails > 1 ? "s" : "") + "</span>" : '<span class="ok">✓ ' + last.time + (rs.length > 1 ? " ×" + rs.length : "") + "</span>";
          return '<div class="ln' + (last ? ' clickable" data-rec="' + last.id : "") + '"><span>' + h(f.name) + "</span>" + s + "</div>";
        }).join("") + "</div>";
      }).join("") + "</div>";
    return html;
  }

  function vRecords() {
    S.from = S.from || addD(today(), -6); S.to = S.to || today();
    var rs = sortT(S.recs.filter(function (r) { return r.date >= S.from && r.date <= S.to && (!S.fForm || r.form === S.fForm); }));
    return '<div class="bar"><label class="muted">From</label><input type="date" id="hsc-from" value="' + S.from + '"><label class="muted">to</label><input type="date" id="hsc-to" value="' + S.to + '"><select id="hsc-form"><option value="">All forms</option>' + HS_FORMS.map(function (f) { return '<option value="' + f.id + '"' + (S.fForm === f.id ? " selected" : "") + ">" + h(f.ref + " " + f.name) + "</option>"; }).join("") + '</select><span style="flex:1"></span><button class="btnx sec" data-act="csv">Export CSV</button><button class="btnx sec" data-act="print">Print / PDF</button></div>' +
      '<div class="card" style="overflow:auto;max-height:640px"><table><thead><tr><th>Date</th><th>Time</th><th>Form</th><th>Point / area</th><th>By</th><th>Result</th><th>Manager review</th></tr></thead><tbody>' +
      (rs.length ? rs.map(function (r) { return '<tr class="clickable" data-rec="' + r.id + '"><td>' + fd(r.date) + "</td><td>" + h(r.time) + "</td><td>" + h((r.ref || "") + " " + (r.formName || "")) + "</td><td>" + h(r.area || r.pointName || "") + "</td><td>" + h(r.byName) + "</td><td>" + (r.fails ? '<span class="tag t-expired">' + r.fails + " issue" + (r.fails > 1 ? "s" : "") + "</span>" : '<span class="tag t-active">OK</span>') + (r.status ? ' <span class="tag ' + (r.status === "open" ? "t-risk" : "t-active") + '">' + h(r.status) + "</span>" : "") + "</td><td>" + (r.reviewedBy ? '<span class="ok">✓ ' + h(r.reviewedBy) + "</span>" : '<span class="muted">Not reviewed</span>') + "</td></tr>"; }).join("") : '<tr><td colspan="7" class="muted">No records in this range.</td></tr>') + "</tbody></table></div>";
  }

  function vWater() {
    var L = limitsFor(S.fPool), rs = sortT(S.recs.filter(function (r) { return r.water && r.pool === S.fPool; })).slice(0, 200);
    var cell = function (v, lo, hi) { if (v == null || v === "") return "<td>—</td>"; var bad = L && ((lo && L[lo] !== "" && L[lo] != null && v < +L[lo]) || (hi && L[hi] !== "" && L[hi] != null && v > +L[hi])); return '<td class="' + (bad ? "bad" : "") + '">' + v + "</td>"; };
    return '<div class="bar"><select id="hsc-pool">' + Object.keys(HS_POOLS).map(function (k) { return '<option value="' + k + '"' + (S.fPool === k ? " selected" : "") + ">" + HS_POOLS[k] + "</option>"; }).join("") + '</select><span style="flex:1"></span><button class="btnx sec" data-act="wcsv">Export CSV</button></div>' +
      (L ? '<div class="banner teal">Approved limits for the ' + HS_POOLS[S.fPool].toLowerCase() + ": free chlorine " + h(L.fcMin) + "–" + h(L.fcMax) + " mg/l · combined ≤ " + h(L.ccMax) + " · pH " + h(L.phMin) + "–" + h(L.phMax) + " · temp " + h(L.tMin) + "–" + h(L.tMax) + " °C — approved by " + h(L.approvedBy) + " (" + h(L.competent) + "), " + fd(L.approvedDate) + "</div>" : '<div class="banner red">No approved limits for the ' + HS_POOLS[S.fPool].toLowerCase() + ". Results are shown without pass/fail checking.</div>") +
      '<div class="card" style="overflow:auto;max-height:640px"><table><thead><tr><th>Date</th><th>Time</th><th>Free Cl</th><th>Comb. Cl</th><th>pH</th><th>Temp</th><th>Clarity</th><th>Bathers</th><th>Within limits</th><th>Action / status</th><th>By</th></tr></thead><tbody>' +
      (rs.length ? rs.map(function (r) { var w = r.water; return '<tr class="clickable" data-rec="' + r.id + '"><td>' + fd(r.date) + "</td><td>" + h(r.time) + "</td>" + cell(w.fc, "fcMin", "fcMax") + cell(w.cc, null, "ccMax") + cell(w.ph, "phMin", "phMax") + cell(w.temp, "tMin", "tMax") + "<td>" + h(w.clarity) + "</td><td>" + h(w.bathers) + '</td><td class="' + (w.within === "Yes" ? "ok" : "bad") + '">' + h(w.within) + "</td><td>" + h(w.poolStatus || "") + (w.reopenBy ? " · reopened by " + h(w.reopenBy) : "") + "</td><td>" + h(r.byName) + "</td></tr>"; }).join("") : '<tr><td colspan="11" class="muted">No tests recorded yet.</td></tr>') + "</tbody></table></div>";
  }

  function vIssues() {
    var rs = sortT(S.recs.filter(function (r) { return r.status || (r.fails && r.form !== "defect" && r.form !== "incident"); }));
    var openList = rs.filter(function (r) { return r.status === "open" || (r.fails && !r.closedNote); });
    var row = function (r) { var issue = r.form === "defect" ? (r.fields.what + " — " + r.fields.defect) : r.form === "incident" ? (r.fields.type + " — " + r.fields.what) : (r.items || []).filter(function (i) { return i.r === "fail"; }).map(function (i) { return i.q + ": " + i.note; }).join("; ") || (r.water ? "Water test outside limits / unsure" : "");
      return '<tr><td>' + fd(r.date) + " " + h(r.time) + "</td><td>" + h(r.formName) + "</td><td>" + h(r.area || r.pointName || (r.fields && r.fields.location) || "") + "</td><td>" + h(issue) + "</td><td>" + h(r.byName) + "</td><td>" + (r.closedNote ? '<span class="ok">Closed</span><div class="muted" style="font-size:12px">' + h(r.closedNote) + " — " + h(r.closedBy) + "</div>" : '<button class="btnx pri" data-close="' + r.id + '">Close out</button>') + ' <button class="btnx sec" data-rec="' + r.id + '">View</button></td></tr>'; };
    return '<div class="banner teal">Every failed check, defect and incident stays here until a manager records the corrective action and closes it out. RIDDOR-reportable incidents must go to the General Manager the same day.</div>' +
      '<div class="card" style="overflow:auto"><table><thead><tr><th>When</th><th>Type</th><th>Where</th><th>Issue</th><th>Reported by</th><th>Close-out</th></tr></thead><tbody>' + (rs.length ? openList.map(row).join("") + rs.filter(function (r) { return openList.indexOf(r) < 0; }).slice(0, 60).map(row).join("") : '<tr><td colspan="6" class="muted">Nothing recorded.</td></tr>') + "</tbody></table></div>";
  }

  function vTraining() {
    var tm = reg("training").sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    return '<div class="bar"><span class="muted">Green = in date · amber = expires within 45 days · red = expired · grey = no evidence. Staff only see water-testing, plant and chemical forms if they hold that competency.</span><span style="flex:1"></span><button class="btnx sec" data-act="tcsv">Export CSV</button><button class="btnx pri" data-act="addperson">+ Add person</button></div>' +
      '<div class="card" style="overflow:auto"><table class="mx"><thead><tr><th>Name / role</th>' + HS_COMPS.map(function (c) { return '<th title="' + h(c[1]) + '" style="writing-mode:vertical-rl;transform:rotate(180deg);height:150px">' + h(c[1]) + "</th>"; }).join("") + "<th>Manager sign-off</th></tr></thead><tbody>" +
      (tm.length ? tm.map(function (p) { return '<tr class="clickable" data-person="' + p.id + '"><td><b>' + h(p.name) + '</b><div class="muted">' + h(p.role || "") + "</div></td>" + HS_COMPS.map(function (c) { var x = p.comps && p.comps[c[0]], s = compState(x); return '<td class="c-' + s + '" title="' + h(x ? ("Achieved " + fd(x.date) + (x.expiry ? " · expires " + fd(x.expiry) : "") + (x.evidence ? " · " + x.evidence : "")) : "No evidence") + '">' + (s === "none" ? "·" : s === "exp" ? "✗" : "✓") + "</td>"; }).join("") + "<td>" + (p.signedBy ? '<span class="ok">' + h(p.signedBy) + "</span>" : '<span class="due">Needed</span>') + "</td></tr>"; }).join("") : '<tr><td colspan="' + (HS_COMPS.length + 2) + '" class="muted">No staff added yet. Add each person who works in the spa, with the evidence and expiry for each competency.</td></tr>') + "</tbody></table></div>";
  }
  function personForm(p) {
    p = p || { comps: {} };
    ovOpen('<div class="mh"><h2>' + (p.id ? "Edit " + h(p.name) : "Add person") + '</h2><button class="x" onclick="ovClose()">✕</button></div><div class="mb hsc-f"><div class="g"><div><label>Name</label><input id="tp-name" value="' + h(p.name) + '"></div><div><label>Role</label><input id="tp-role" value="' + h(p.role) + '" placeholder="e.g. Pool supervisor"></div></div>' +
      '<label>Competencies — date achieved, expiry, evidence (certificate no., course, assessor)</label>' + HS_COMPS.map(function (c) { var x = (p.comps || {})[c[0]] || {}; return '<div class="ci" data-c="' + c[0] + '"><span>' + h(c[1]) + '</span><input type="date" class="d" value="' + h(x.date || "") + '"><input type="date" class="e" value="' + h(x.expiry || "") + '"><input class="v" placeholder="Evidence" value="' + h(x.evidence || "") + '"></div>'; }).join("") +
      '<label>Manager sign-off (name)</label><input id="tp-sign" value="' + h(p.signedBy || "") + '"></div><div class="mf">' + (p.id ? '<button class="btnx del" id="tp-del">Remove</button>' : "") + '<button class="btnx sec" onclick="ovClose()">Cancel</button><button class="btnx pri" id="tp-save">Save</button></div>');
    $("#tp-save").onclick = function () { var comps = {}; document.querySelectorAll(".ci[data-c]").forEach(function (r) { var d = r.querySelector(".d").value; if (d) comps[r.dataset.c] = { date: d, expiry: r.querySelector(".e").value, evidence: r.querySelector(".v").value.trim() }; });
      var n = $("#tp-name").value.trim(); if (!n) { alert("Add a name"); return; } var sb = $("#tp-sign").value.trim();
      put({ id: p.id, kind: "register", type: "training", date: p.date || today(), name: n, role: $("#tp-role").value.trim(), comps: comps, signedBy: sb, signedAt: sb && sb !== p.signedBy ? today() : (p.signedAt || "") }).then(ovClose).catch(function (e) { alert("Not saved: " + e.message); }); };
    if (p.id) $("#tp-del").onclick = function () { if (confirm("Remove " + p.name + " from the training matrix?")) del(p.id).then(ovClose); };
  }

  function vCoshh() {
    var cs = reg("coshh");
    return '<div class="banner amber">A safety data sheet is not a COSHH assessment. Each product must have a site-specific COSHH assessment signed off by a competent person before it is used. Calcium hypochlorite must be stored and handled to the current SDS and pool-plant procedure, away from incompatible materials, and never mixed.</div>' +
      '<div class="bar"><span style="flex:1"></span>' + (cs.length ? "" : '<button class="btnx sec" data-act="seed">Load starting lists</button>') + '<button class="btnx sec" data-act="ccsv">Export CSV</button><button class="btnx pri" data-act="addcoshh">+ Add product</button></div>' +
      '<div class="card" style="overflow:auto"><table><thead><tr><th>Product</th><th>Use / location</th><th>Supplier</th><th>Container</th><th>SDS revision</th><th>COSHH assessment</th><th>Assessor / review</th><th>Notes</th></tr></thead><tbody>' +
      (cs.length ? cs.map(function (c) { var ok = /signed/i.test(c.status || ""); return '<tr class="clickable" data-coshh="' + c.id + '"><td><b>' + h(c.product) + "</b></td><td>" + h(c.use) + "</td><td>" + h(c.supplier || "—") + "</td><td>" + h(c.size || "—") + "</td><td>" + h(c.sdsRev ? fd(c.sdsRev) : "Missing") + '</td><td><span class="tag ' + (ok ? "t-active" : "t-expired") + '">' + h(c.status || "Assessment not started") + "</span></td><td>" + h(c.assessor || "") + (c.review ? '<div class="muted">review ' + fd(c.review) + "</div>" : "") + '</td><td class="muted" style="max-width:260px">' + h(c.notes) + "</td></tr>"; }).join("") : '<tr><td colspan="8" class="muted">No products yet.</td></tr>') + "</tbody></table></div>";
  }
  function coshhForm(c) {
    c = c || {};
    var sts = ["Assessment not started", "Assessment drafted", "Signed off by competent person", "Product withdrawn"];
    ovOpen('<div class="mh"><h2>' + (c.id ? h(c.product) : "Add product") + '</h2><button class="x" onclick="ovClose()">✕</button></div><div class="mb hsc-f"><div class="g"><div><label>Product name</label><input id="cc-product" value="' + h(c.product) + '"></div><div><label>Use / location</label><input id="cc-use" value="' + h(c.use) + '"></div><div><label>Supplier</label><input id="cc-supplier" value="' + h(c.supplier) + '"></div><div><label>Container size</label><input id="cc-size" value="' + h(c.size) + '"></div><div><label>SDS revision date</label><input type="date" id="cc-sdsRev" value="' + h(c.sdsRev) + '"></div><div><label>COSHH assessment status</label><select id="cc-status">' + sts.map(function (s) { return "<option" + (c.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + '</select></div><div><label>Competent assessor</label><input id="cc-assessor" value="' + h(c.assessor) + '"></div><div><label>Review date</label><input type="date" id="cc-review" value="' + h(c.review) + '"></div></div>' +
      '<label>Storage, segregation, ventilation, PPE, dilution, disposal and first-aid (from the assessment)</label><textarea id="cc-notes" rows="4">' + h(c.notes) + '</textarea><label>Staff briefed (names / date)</label><input id="cc-briefed" value="' + h(c.briefed) + '"></div><div class="mf">' + (c.id ? '<button class="btnx del" id="cc-del">Remove</button>' : "") + '<button class="btnx sec" onclick="ovClose()">Cancel</button><button class="btnx pri" id="cc-save">Save</button></div>');
    $("#cc-save").onclick = function () { var d = { id: c.id, kind: "register", type: "coshh", date: c.date || today() }; ["product", "use", "supplier", "size", "sdsRev", "status", "assessor", "review", "notes", "briefed"].forEach(function (k) { d[k] = $("#cc-" + k).value.trim(); }); if (!d.product) { alert("Add a product name"); return; } put(d).then(ovClose).catch(function (e) { alert("Not saved: " + e.message); }); };
    if (c.id) $("#cc-del").onclick = function () { if (confirm("Remove this product?")) del(c.id).then(ovClose); };
  }

  function vActions() {
    var as = reg("action").sort(function (a, b) { return (a.n || 99) - (b.n || 99); });
    return '<div class="banner teal">Actions that must be completed before the spa operates as fully compliant, each with an owner, interim control and completion date (GM instruction, 25 Nov 2026). The manual must not be described as fully compliant until these are closed.</div>' +
      '<div class="bar"><span style="flex:1"></span>' + (as.length ? "" : '<button class="btnx sec" data-act="seed">Load starting lists</button>') + '<button class="btnx sec" data-act="acsv">Export CSV</button><button class="btnx pri" data-act="addaction">+ Add action</button></div>' +
      '<div class="card" style="overflow:auto"><table><thead><tr><th>#</th><th>Action</th><th>Owner</th><th>Interim control</th><th>Due</th><th>Status</th><th>Evidence / close-out</th></tr></thead><tbody>' +
      (as.length ? as.map(function (a) { var late = a.due && a.due < today() && a.status !== "Complete"; return '<tr class="clickable" data-action="' + a.id + '"><td>' + h(a.n) + "</td><td><b>" + h(a.action) + "</b></td><td>" + h(a.owner) + '</td><td class="muted">' + h(a.interim) + '</td><td class="' + (late ? "bad" : "") + '">' + (a.due ? fd(a.due) : '<span class="due">Set date</span>') + '</td><td><span class="tag ' + (a.status === "Complete" ? "t-active" : a.status === "In progress" ? "t-frozen" : "t-risk") + '">' + h(a.status) + "</span></td><td>" + h(a.evidence) + "</td></tr>"; }).join("") : '<tr><td colspan="7" class="muted">No actions yet.</td></tr>') + "</tbody></table></div>";
  }
  function actionForm(a) {
    a = a || { status: "Open", n: reg("action").length + 1 };
    ovOpen('<div class="mh"><h2>Action ' + h(a.n) + '</h2><button class="x" onclick="ovClose()">✕</button></div><div class="mb hsc-f"><label>Action</label><textarea id="ac-action" rows="2">' + h(a.action) + '</textarea><div class="g"><div><label>Owner</label><input id="ac-owner" value="' + h(a.owner) + '"></div><div><label>Due date</label><input type="date" id="ac-due" value="' + h(a.due) + '"></div><div><label>Status</label><select id="ac-status">' + ["Open", "In progress", "Complete"].map(function (s) { return "<option" + (a.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + '</select></div><div><label>Order</label><input id="ac-n" type="number" value="' + h(a.n) + '"></div></div><label>Interim control</label><textarea id="ac-interim" rows="2">' + h(a.interim) + '</textarea><label>Evidence / close-out</label><textarea id="ac-evidence" rows="2">' + h(a.evidence) + '</textarea></div><div class="mf">' + (a.id ? '<button class="btnx del" id="ac-del">Remove</button>' : "") + '<button class="btnx sec" onclick="ovClose()">Cancel</button><button class="btnx pri" id="ac-save">Save</button></div>');
    $("#ac-save").onclick = function () { var d = { id: a.id, kind: "register", type: "action", date: a.date || today() }; ["action", "owner", "due", "status", "interim", "evidence"].forEach(function (k) { d[k] = $("#ac-" + k).value.trim(); }); d.n = +$("#ac-n").value || a.n; if (d.status === "Complete" && !d.evidence) { alert("Record the evidence before marking complete."); return; } put(d).then(ovClose).catch(function (e) { alert("Not saved: " + e.message); }); };
    if (a.id) $("#ac-del").onclick = function () { if (confirm("Remove this action?")) del(a.id).then(ovClose); };
  }

  function vLimits() {
    return '<div class="banner amber"><b>Only the competent pool-plant / water-treatment person sets these.</b> They must be checked against the site risk assessment, plant configuration, manufacturer instructions, PWTAG guidance and HSG282 (spa pool). Do not copy a chart from the supplied sheets until it has been checked. Once approved, staff see the range on the test form and readings outside it are flagged.</div>' +
      '<div class="pts">' + Object.keys(HS_POOLS).map(function (k) { var L = limitsFor(k); return '<div class="pt"><h4>' + HS_POOLS[k] + "</h4>" + (L ? ["Free chlorine (mg/l)|" + L.fcMin + " – " + L.fcMax, "Combined chlorine (mg/l)|≤ " + L.ccMax, "pH|" + L.phMin + " – " + L.phMax, "Temperature (°C)|" + L.tMin + " – " + L.tMax, "Test frequency|" + (L.freq || "—"), "Approved by|" + L.approvedBy, "Competent person|" + L.competent, "Date|" + fd(L.approvedDate)].map(function (x) { var p = x.split("|"); return '<div class="ln"><span>' + h(p[0]) + "</span><b>" + h(p[1]) + "</b></div>"; }).join("") : '<div class="ln"><span class="bad">Not approved</span></div>') + '<button class="btnx pri" style="margin-top:10px" data-lim="' + k + '">' + (L ? "Replace limits" : "Enter approved limits") + "</button></div>"; }).join("") + "</div>";
  }
  function limitsForm(pool) {
    var L = limitsFor(pool) || {};
    var f = function (id, l) { return "<div><label>" + l + '</label><input id="lm-' + id + '" type="number" step="any" value="' + h(L[id] == null ? "" : L[id]) + '"></div>'; };
    ovOpen('<div class="mh"><h2>Approved limits — ' + HS_POOLS[pool] + '</h2><button class="x" onclick="ovClose()">✕</button></div><div class="mb hsc-f"><div class="g">' + f("fcMin", "Free chlorine min (mg/l)") + f("fcMax", "Free chlorine max (mg/l)") + f("ccMax", "Combined chlorine max (mg/l)") + "<div></div>" + f("phMin", "pH min") + f("phMax", "pH max") + f("tMin", "Temperature min (°C)") + f("tMax", "Temperature max (°C)") + '</div><label>Test frequency and method</label><input id="lm-freq" value="' + h(L.freq || "") + '" placeholder="e.g. as stated in the water-treatment plan"><div class="g"><div><label>Competent person (name, company, qualification)</label><input id="lm-competent" value="' + h(L.competent || "") + '"></div><div><label>Approved by (manager)</label><input id="lm-approvedBy" value="' + h(L.approvedBy || "") + '"></div><div><label>Approval date</label><input type="date" id="lm-approvedDate" value="' + h(L.approvedDate || today()) + '"></div><div><label>Source document / reference</label><input id="lm-source" value="' + h(L.source || "") + '" placeholder="Water-treatment plan ref."></div></div></div><div class="mf"><button class="btnx sec" onclick="ovClose()">Cancel</button><button class="btnx pri" id="lm-save">Approve and publish</button></div>');
    $("#lm-save").onclick = function () { var d = { kind: "register", type: "limits", pool: pool, approved: true, date: today() }; ["fcMin", "fcMax", "ccMax", "phMin", "phMax", "tMin", "tMax"].forEach(function (k) { var v = $("#lm-" + k).value; d[k] = v === "" ? "" : +v; }); ["freq", "competent", "approvedBy", "approvedDate", "source"].forEach(function (k) { d[k] = $("#lm-" + k).value.trim(); });
      if (d.fcMin === "" || d.fcMax === "" || d.phMin === "" || d.phMax === "" || !d.competent || !d.approvedBy) { alert("Enter the chlorine and pH ranges, the competent person and who approved them."); return; } put(d).then(ovClose).catch(function (e) { alert("Not saved: " + e.message); }); };
  }

  function vQR() {
    return '<div class="banner teal">Print these and fix them at each point (A5 in a wipe-clean sleeve works well). Scanning opens the staff check page for that point. Staff code: <b>' + h(HS_CODE) + '</b> (change in spa/spa-defs.js).</div><div class="bar"><span style="flex:1"></span><button class="btnx pri" data-act="printqr">Print all QR posters</button></div><div class="pts">' +
      HS_POINTS.map(function (p, i) { return '<div class="pt" style="text-align:center"><h4>' + p.icon + " " + h(p.name) + '</h4><div id="hsc-qr' + i + '" style="display:inline-block;margin:6px 0"></div><div class="muted" style="font-size:11.5px;word-break:break-all">' + h(HS_BASE + "?p=" + p.id) + "</div></div>"; }).join("") + "</div>";
  }
  function qrLib() { return window.QRCode ? Promise.resolve() : loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"); }

  function recordModal(id) {
    var r = S.recs.find(function (x) { return x.id === id; }); if (!r) return;
    var f = F(r.form) || {};
    var items = (r.items || []).map(function (i) { return "<tr><td>" + h(i.q) + '</td><td class="' + (i.r === "fail" ? "bad" : i.r === "pass" ? "ok" : "muted") + '">' + h(i.r.toUpperCase()) + "</td><td>" + h(i.note) + "</td></tr>"; }).join("");
    var fields = Object.keys(r.fields || {}).filter(function (k) { return r.fields[k] !== ""; }).map(function (k) { var def = (f.fields || []).find(function (x) { return x.k === k; }); return "<tr><td>" + h(def ? def.l : k) + '</td><td colspan="2">' + h(r.fields[k]) + "</td></tr>"; }).join("");
    var w = r.water ? HS_WATER.map(function (x) { return "<tr><td>" + h(x.l) + '</td><td colspan="2">' + h(r.water[x.k]) + "</td></tr>"; }).join("") + ["kit|Test kit expiry", "clarity|Clarity", "bathers|Bathers", "within|Within approved limits", "dmTold|Duty Manager told", "poolStatus|Pool status", "reopenBy|Reopening authorised by"].map(function (x) { var p = x.split("|"); return r.water[p[0]] ? "<tr><td>" + p[1] + '</td><td colspan="2">' + h(r.water[p[0]]) + "</td></tr>" : ""; }).join("") : "";
    ovOpen('<div class="mh"><h2>' + h((r.ref || "") + " " + (r.formName || "")) + '</h2><button class="x" onclick="ovClose()">✕</button></div><div class="mb hsc-f"><p class="muted">' + fd(r.date) + " at " + h(r.time) + " · " + h(r.area || r.pointName || "") + " · by <b>" + h(r.byName) + "</b> · " + h(r.source || "") + "</p>" +
      '<table style="margin-top:10px"><tbody>' + w + items + fields + (r.notes ? '<tr><td>Notes</td><td colspan="2">' + h(r.notes) + "</td></tr>" : "") + "</tbody></table>" +
      (r.sig ? '<label>Signature</label><img src="' + r.sig + '" style="height:70px;border:1px solid var(--line);border-radius:8px">' : "") +
      (r.closedNote ? '<label>Close-out</label><p>' + h(r.closedNote) + " — " + h(r.closedBy) + " (" + fd(r.closedAt) + ")</p>" : "") +
      '<label>Manager review</label><p>' + (r.reviewedBy ? '<span class="ok">✓ ' + h(r.reviewedBy) + " · " + fd(r.reviewedAt) + "</span>" : '<span class="muted">Not reviewed yet</span>') + '</p></div><div class="mf">' + (r.reviewedBy ? "" : '<button class="btnx pri" id="rv-sign">Sign off as reviewed</button>') + '<button class="btnx sec" onclick="ovClose()">Close</button></div>');
    if (!r.reviewedBy) $("#rv-sign").onclick = function () { mgr(function () { var n = prompt("Your name for the sign-off:"); if (!n) return; put({ id: r.id, reviewedBy: n.trim(), reviewedAt: today() }).then(ovClose); }); };
  }
  function closeOut(id) {
    var r = S.recs.find(function (x) { return x.id === id; });
    mgr(function () { var note = prompt("Corrective action taken / how this was closed:"); if (!note) return; var by = prompt("Your name:"); if (!by) return; var d = { id: id, closedNote: note.trim(), closedBy: by.trim(), closedAt: today() }; if (r.status) d.status = "closed"; put(d); });
  }

  function printRecords() {
    var rs = sortT(S.recs.filter(function (r) { return r.date >= S.from && r.date <= S.to && (!S.fForm || r.form === S.fForm); }));
    var w = window.open("", "_blank"); if (!w) return;
    w.document.write('<html><head><title>HosSPA records ' + S.from + " to " + S.to + '</title><style>body{font:11pt Aptos,Calibri,Arial;margin:24px;color:#14232f}h1{font-size:16pt}h2{font-size:12pt;margin:18px 0 4px;color:#0f5b53}table{width:100%;border-collapse:collapse;font-size:9.5pt}td,th{border:1px solid #ccd;padding:4px 6px;text-align:left;vertical-align:top}.f{color:#b23f3b;font-weight:bold}img{height:40px}</style></head><body><h1>Brandon Hall Hotel &amp; Spa — Spa safety records</h1><p>' + fd(S.from) + " to " + fd(S.to) + " · printed " + new Date().toLocaleString("en-GB") + " · " + rs.length + " records · Manual v" + HS_VERSION + "</p>" +
      rs.map(function (r) { return "<h2>" + h((r.ref || "") + " " + r.formName) + " — " + fd(r.date) + " " + h(r.time) + " — " + h(r.area || r.pointName) + "</h2><table><tr><th>By</th><td>" + h(r.byName) + "</td><th>Manager review</th><td>" + h(r.reviewedBy || "Not reviewed") + "</td></tr>" + (r.water ? "<tr><th>Readings</th><td colspan=3>" + HS_WATER.map(function (x) { return x.l + ": " + (r.water[x.k] == null ? "—" : r.water[x.k]); }).join(" · ") + " · clarity " + h(r.water.clarity) + " · within limits: " + h(r.water.within) + "</td></tr>" : "") + (r.items || []).map(function (i) { return '<tr><td colspan=2>' + h(i.q) + '</td><td class="' + (i.r === "fail" ? "f" : "") + '">' + h(i.r) + "</td><td>" + h(i.note) + "</td></tr>"; }).join("") + Object.keys(r.fields || {}).filter(function (k) { return r.fields[k]; }).map(function (k) { return "<tr><th>" + h(k) + "</th><td colspan=3>" + h(r.fields[k]) + "</td></tr>"; }).join("") + (r.sig ? '<tr><th>Signature</th><td colspan=3><img src="' + r.sig + '"></td></tr>' : "") + "</table>"; }).join("") + "<script>setTimeout(function(){print()},500)<\/script></body></html>");
    w.document.close();
  }
  function printQR() {
    var w = window.open("", "_blank"); if (!w) return;
    w.document.write('<html><head><title>HosSPA QR check points</title><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script><style>@page{size:A5;margin:0}body{margin:0;font-family:Lato,Arial}.pg{width:148mm;height:209mm;page-break-after:always;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:0;box-sizing:border-box;padding:12mm}.k{letter-spacing:3px;font-size:10pt;color:#15867a;font-weight:bold}h1{font-family:Georgia,serif;color:#14232f;font-size:28pt;margin:6px 0}.q{margin:14px 0}.s{font-size:11pt;color:#14232f;max-width:110mm}.u{font-size:8pt;color:#667;margin-top:10px}</style></head><body>' +
      HS_POINTS.map(function (p, i) { return '<div class="pg"><img src="assets/logos/logo---blue-transparent.png" style="width:42mm"><div class="k">SPA SAFETY CHECK POINT</div><h1>' + h(p.name) + '</h1><div class="q" id="q' + i + '"></div><div class="s">Scan to record: ' + p.forms.map(function (f) { return h(F(f).name); }).join(" · ") + ". Report defects and incidents here too." + (p.restricted ? "<br><b>Authorised staff only.</b>" : "") + '</div><div class="u">' + h(HS_BASE + "?p=" + p.id) + "</div></div>"; }).join("") +
      "<script>var U=" + JSON.stringify(HS_POINTS.map(function (p) { return HS_BASE + "?p=" + p.id; })) + ';U.forEach(function(u,i){new QRCode(document.getElementById("q"+i),{text:u,width:260,height:260,colorDark:"#14232f",correctLevel:QRCode.CorrectLevel.M})});setTimeout(function(){print()},800)<\/script></body></html>');
    w.document.close();
  }

  function bind(body) {
    body.querySelectorAll("[data-rec]").forEach(function (el) { el.onclick = function (e) { e.stopPropagation(); recordModal(el.dataset.rec); }; });
    body.querySelectorAll("[data-close]").forEach(function (el) { el.onclick = function () { closeOut(el.dataset.close); }; });
    body.querySelectorAll("[data-go]").forEach(function (el) { el.onclick = function (e) { e.preventDefault(); S.sub = el.dataset.go; render(); }; });
    body.querySelectorAll("[data-person]").forEach(function (el) { el.onclick = function () { mgr(function () { personForm(S.regs.find(function (x) { return x.id === el.dataset.person; })); }); }; });
    body.querySelectorAll("[data-coshh]").forEach(function (el) { el.onclick = function () { mgr(function () { coshhForm(S.regs.find(function (x) { return x.id === el.dataset.coshh; })); }); }; });
    body.querySelectorAll("[data-action]").forEach(function (el) { el.onclick = function () { mgr(function () { actionForm(S.regs.find(function (x) { return x.id === el.dataset.action; })); }); }; });
    body.querySelectorAll("[data-lim]").forEach(function (el) { el.onclick = function () { mgr(function () { limitsForm(el.dataset.lim); }); }; });
    var on = function (sel, ev, fn) { var e = body.querySelector(sel); if (e) e.addEventListener(ev, fn); };
    on("#hsc-from", "change", function (e) { S.from = e.target.value; render(); });
    on("#hsc-to", "change", function (e) { S.to = e.target.value; render(); });
    on("#hsc-form", "change", function (e) { S.fForm = e.target.value; render(); });
    on("#hsc-pool", "change", function (e) { S.fPool = e.target.value; render(); });
    body.querySelectorAll("[data-act]").forEach(function (el) { el.onclick = function () { act(el.dataset.act); }; });
    if (S.sub === "qr") qrLib().then(function () { HS_POINTS.forEach(function (p, i) { var el = document.getElementById("hsc-qr" + i); if (el && !el.childNodes.length) new QRCode(el, { text: HS_BASE + "?p=" + p.id, width: 150, height: 150, colorDark: "#14232f", correctLevel: QRCode.CorrectLevel.M }); }); }).catch(function () {});
  }
  function act(a) {
    var t = today();
    if (a === "signall") return mgr(function () { var n = prompt("Your name for today's sign-off:"); if (!n) return; Promise.all(recsOn(t).filter(function (r) { return !r.reviewedBy; }).map(function (r) { return put({ id: r.id, reviewedBy: n.trim(), reviewedAt: t }); })); });
    if (a === "csv") { var rs = sortT(S.recs.filter(function (r) { return r.date >= S.from && r.date <= S.to && (!S.fForm || r.form === S.fForm); })); return download("hosspa-records-" + S.from + "-to-" + S.to + ".csv", csv([["Date", "Time", "Ref", "Form", "Point/area", "By", "Fails", "Failed items", "Fields", "Notes", "Status", "Reviewed by", "Reviewed"]].concat(rs.map(function (r) { return [r.date, r.time, r.ref, r.formName, r.area || r.pointName, r.byName, r.fails, (r.items || []).filter(function (i) { return i.r === "fail"; }).map(function (i) { return i.q + ": " + i.note; }).join(" | "), Object.keys(r.fields || {}).map(function (k) { return k + "=" + r.fields[k]; }).join(" | "), r.notes, r.status || "", r.reviewedBy || "", r.reviewedAt || ""]; })))); }
    if (a === "wcsv") { var ws = sortT(S.recs.filter(function (r) { return r.water && r.pool === S.fPool; })); return download("hosspa-water-" + S.fPool + ".csv", csv([["Date", "Time", "Free Cl", "Combined Cl", "pH", "Temp", "Clarity", "Bathers", "Within limits", "Pool status", "Reopened by", "By"]].concat(ws.map(function (r) { var w = r.water; return [r.date, r.time, w.fc, w.cc, w.ph, w.temp, w.clarity, w.bathers, w.within, w.poolStatus || "", w.reopenBy || "", r.byName]; })))); }
    if (a === "tcsv") return download("hosspa-training-matrix.csv", csv([["Name", "Role"].concat(HS_COMPS.map(function (c) { return c[1] + " (achieved/expiry/evidence)"; })).concat(["Signed off by"])].concat(reg("training").map(function (p) { return [p.name, p.role].concat(HS_COMPS.map(function (c) { var x = p.comps && p.comps[c[0]]; return x ? x.date + " / " + (x.expiry || "") + " / " + (x.evidence || "") : ""; })).concat([p.signedBy || ""]); }))));
    if (a === "ccsv") return download("hosspa-coshh-register.csv", csv([["Product", "Use", "Supplier", "Container", "SDS revision", "Status", "Assessor", "Review", "Notes", "Briefed"]].concat(reg("coshh").map(function (c) { return [c.product, c.use, c.supplier, c.size, c.sdsRev, c.status, c.assessor, c.review, c.notes, c.briefed]; }))));
    if (a === "acsv") return download("hosspa-actions.csv", csv([["#", "Action", "Owner", "Interim control", "Due", "Status", "Evidence"]].concat(reg("action").sort(function (x, y) { return (x.n || 0) - (y.n || 0); }).map(function (x) { return [x.n, x.action, x.owner, x.interim, x.due, x.status, x.evidence]; }))));
    if (a === "print") return printRecords();
    if (a === "printqr") return printQR();
    if (a === "addperson") return mgr(function () { personForm(); });
    if (a === "addcoshh") return mgr(function () { coshhForm(); });
    if (a === "addaction") return mgr(function () { actionForm(); });
    if (a === "seed") return mgr(function () { if (reg("coshh").length || reg("action").length) { alert("Lists already exist."); return; } seedRegisters(false); });
  }

  /* ── start when the tab is first opened ── */
  var started = false;
  function start() {
    if (started) { render(); return; } started = true;
    var root = $(ROOT); if (root) root.innerHTML = '<div class="card pad">Connecting to the compliance records…</div>';
    connect().catch(function (e) { if (e.message !== "demo") console.warn("HosSPA compliance: using demo store —", e.message); useDemo(); }).then(function () { S.ready = true; render(); });
  }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest('.tab[data-v="compliance"]'); if (b) start(); });
  if (QS.get("tab") === "compliance") window.addEventListener("load", function () { var b = document.querySelector('.tab[data-v="compliance"]'); if (b) b.click(); });
  window.HSC = { start: start, state: S };
})();
