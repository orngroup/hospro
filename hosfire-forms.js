/* ============================================================
   HosFIRE — FILL-IN & PRINT FORMS
   On-screen, pre-filled versions of Brandon Hall's fire safety
   pro-formas (Glenn Randell's document set). Complete online,
   then Print / Save as PDF. Attach the signed scan under Documents.
   Loads after hosfire.js (uses its globals: VIEWS, BIND, S, h,
   today, HF_HOTEL, HF_FIRE_MANAGER). Adds the "forms" view.
   ============================================================ */
(function () {
  "use strict";
  const HOTEL = (typeof HF_HOTEL !== "undefined" && HF_HOTEL) || { name: "Brandon Hall Hotel and Spa", address: "Main Street, Brandon, Coventry CV8 3FW" };
  const FM = (typeof HF_FIRE_MANAGER !== "undefined" && HF_FIRE_MANAGER) || { name: "Glenn Randell" };
  const esc = (v) => (typeof h === "function" ? h(v) : String(v == null ? "" : v));
  const td = () => { try { return (typeof today === "function") ? today() : new Date().toISOString().slice(0, 10); } catch (e) { return ""; } };
  const me = () => { try { return (S.user && S.user.name) || ""; } catch (e) { return ""; } };
  const logoURL = () => { try { return location.origin + location.pathname.replace(/[^/]*$/, "") + "assets/marketing/logos/logo-primary.png"; } catch (e) { return ""; } };

  /* ---------- the 22 forms ---------- */
  // Pre-filled register rows (Glenn edits rather than starting blank)
  const CONTRACTORS = [
    ["Fire alarm system", "Leader Systems", "25/02/2026", "", "Service certificate"],
    ["Emergency lighting", "YEC Limited", "", "", "Annual test & certificate"],
    ["Gas safety (LPG/boilers)", "WarmFix Ltd", "30/11/2025", "", "Gas safety record"],
    ["Electrical installation (EICR)", "", "25/11/2025", "", "EICR report 40697526"],
    ["Portable appliances (PAT)", "", "12/12/2025", "", "PAT report ESWO173507"],
    ["Fire extinguishers", "", "", "", "Annual service (BS 5306-3)"],
    ["Kitchen extract / suppression", "", "", "", "Deep clean & service record"],
  ];
  const ASSETS = [
    ["FA-PANEL-01", "Fire alarm control panel — reception", "", "", ""],
    ["FA-MCP", "Manual call points — by each final exit & stairs", "", "", ""],
    ["FA-DET", "Smoke / heat detectors — throughout", "", "", ""],
    ["FA-SND", "Alarm sounders / beacons — throughout", "", "", ""],
    ["EXT", "Extinguishers (water / foam / CO₂) — per location", "", "", ""],
    ["BLK", "Fire blankets — kitchens & pantries", "", "", ""],
    ["EL", "Emergency lighting units — escape routes & stairs", "", "", ""],
    ["FD", "Fire doors — escape routes & compartment lines", "", "", ""],
    ["SIGN", "Fire action notices & illuminated exit signs", "", "", ""],
    ["CO", "Carbon monoxide alarms — plant / boiler rooms", "", "", ""],
  ];
  const DOCINDEX = [
    ["Current fire risk assessment (FRA)", "HosFIRE ▸ Documents", "", "annually", "Responsible Person"],
    ["Fire alarm service certificate", "HosFIRE ▸ Certificates", "25/02/2026", "", "Leader Systems"],
    ["Emergency lighting test report", "HosFIRE ▸ Certificates", "16/12/2025", "", "YEC Limited"],
    ["Gas safety record", "HosFIRE ▸ Certificates", "30/11/2025", "", "WarmFix Ltd"],
    ["EICR report", "HosFIRE ▸ Certificates", "25/11/2025", "", ""],
    ["PAT report", "HosFIRE ▸ Certificates", "12/12/2025", "", ""],
    ["Fire safety policy & manual", "HosFIRE ▸ Documents", "", "annually", "Glenn Randell"],
    ["Training & induction records", "HosFIRE ▸ Training", "", "annually", "Glenn Randell"],
  ];

  const FORMS = [
    // ---- Daily ----
    { id: "f07", no: "07", group: "Daily", title: "Daily Fire Safety Checks",
      intro: "Check exits, routes, fire doors, alarm panel, extinguishers, housekeeping and high-risk rooms. Record exceptions, not just ticks.",
      type: "grid", cols: ["Date", "Area / check", "Pass / Fail / NA", "Defect / action", "Initials"], blank: 14 },
    { id: "f14", no: "14", group: "Daily", title: "Escape Route & Final Exit Checks",
      intro: "Walk the escape routes and final exits — clear, unlocked, usable and signed.",
      type: "grid", cols: ["Date / floor", "Route clear", "Exit usable", "Signs / lighting", "Defect / initials"], blank: 14 },
    // ---- Weekly ----
    { id: "f08", no: "08", group: "Weekly", title: "Weekly Fire Alarm Test Record",
      intro: "Notify the monitoring company and occupants before testing; restore normal operation afterwards. Rotate the call point each week.",
      type: "grid", cols: ["Date / time", "Call point / zone", "Sounders / panel", "Result", "Tester / action"], blank: 14 },
    { id: "f09", no: "09", group: "Weekly", title: "Weekly Fire Safety Walk-Around",
      intro: "Check doors, escape routes, final exits, extinguishers, blankets, alarms, signage and visible hazards.",
      type: "grid", cols: ["Area / floor", "Doors / exits", "Routes / signs", "Equipment", "Fault / action"], blank: 14 },
    // ---- Monthly ----
    { id: "f10", no: "10", group: "Monthly", title: "Emergency Lighting Functional Test Log",
      intro: "Use the site-specific test method; record restoration of normal power and the charge indication.",
      type: "grid", cols: ["Date", "Area / fitting ID", "Test / duration", "Result", "Action / initials"], blank: 14 },
    { id: "f11", no: "11", group: "Monthly", title: "Monthly Fire Extinguisher Visual Checks",
      intro: "Visual checks do not replace competent periodic servicing (BS 5306-3).",
      type: "grid", cols: ["Date", "Location / ID", "Accessible / seal", "Condition / gauge", "Action / initials"], blank: 14 },
    { id: "f12", no: "12", group: "Monthly", title: "Carbon Monoxide Alarm Test Log",
      intro: "Test frequency and method must follow manufacturer instructions and the site risk assessment.",
      type: "grid", cols: ["Date", "Location / ID", "Method", "Result / expiry", "Action / initials"], blank: 12 },
    { id: "f13", no: "13", group: "Monthly", title: "Fire Door Inspection & Defects",
      intro: "Record defects individually and refer repairs to a competent person.",
      type: "grid", cols: ["Door ID / location", "Closer / latch", "Seals / gaps", "Damage / sign", "Action / date"], blank: 14 },
    // ---- Incident & event ----
    { id: "f02", no: "02", group: "Incident & event", title: "Fire Drill Record",
      intro: "Complete for each planned or unplanned drill. At least twice a year, including one with night staff.",
      type: "record", fields: ["Drill date / start time", "Drill leader / observers", "Area / shift / occupancy estimate", "Scenario / alarm initiation point", "Evacuation completion time / assembly point", "Persons requiring assistance / PEEP arrangements", "Roll call / accountability result", "Issues: delays, doors, routes, communications", "Actions & who / by when"],
      prefill: { "Drill leader / observers": FM.name } },
    { id: "f15", no: "15", group: "Incident & event", title: "Alarm Activation & False Alarm Record",
      intro: "Record every activation. Log unwanted/false alarms to spot trends and reduce them.",
      type: "grid", cols: ["Date / time", "Zone / cause", "Evacuation / response", "Reset / service", "Follow-up"], blank: 12 },
    { id: "f16", no: "16", group: "Incident & event", title: "Fire System Isolation / Impairment Log",
      intro: "Never leave a life-safety system impaired without a suitable risk assessment and documented controls.",
      type: "grid", cols: ["System / zone", "Start / reason", "Authorised by", "Mitigation / notify", "Reinstated / tested"], blank: 12 },
    { id: "fhw", no: "HW", group: "Incident & event", title: "Hot Work Permit & Safe System of Work", type: "hotwork" },
    // ---- Registers ----
    { id: "f18", no: "18", group: "Registers", title: "Fire Risk Assessment Action Tracker",
      intro: "Transfer the findings from the current FRA. This blank tracker is not an FRA.",
      type: "grid", cols: ["FRA ref / risk", "Required action", "Owner", "Due date", "Closed / evidence"], blank: 16 },
    { id: "f19", no: "19", group: "Registers", title: "Fire System Service & Certificate Register",
      intro: "Every fire-related service, inspection and certificate, with the next due date.",
      type: "grid", cols: ["Asset / system", "Contractor", "Service date", "Next due", "Report / defects"], rows: CONTRACTORS, blank: 6 },
    { id: "f20", no: "20", group: "Registers", title: "Fire Safety Equipment Asset Register",
      intro: "Every fire safety asset on site, where it is, and when it was last checked.",
      type: "grid", cols: ["Asset ID", "Type / location", "Make / model", "Last check", "Next due"], rows: ASSETS, blank: 8 },
    { id: "f21", no: "21", group: "Registers", title: "Fire Safety Evidence & Document Index",
      intro: "The master index of every fire safety document and certificate, and where it is held.",
      type: "grid", cols: ["Document / certificate", "Location / filename", "Issue date", "Expiry / review", "Owner"], rows: DOCINDEX, blank: 8 },
    { id: "f03", no: "03", group: "Registers", title: "Fire Safety Manuals & Policies Register",
      intro: "Document control register — attach the approved policies and manuals separately.",
      type: "grid", cols: ["Document / policy title", "Category", "Owner / approver", "Version / issue date", "Review due"], blank: 12 },
    { id: "f17", no: "17", group: "Registers", title: "Fire Training & Staff Induction",
      intro: "Every fire induction, refresher, drill and marshal course. The management training matrix is held under Training.",
      type: "grid", cols: ["Date", "Employee / role", "Training / drill", "Trainer", "Signature"], blank: 16, prefillTrainer: FM.name },
    { id: "f04", no: "04", group: "Registers", title: "Fire Safety Maintenance & Fault Log",
      intro: "Fire doors, emergency lighting, fire alarms and other fire safety faults — reported, controlled and closed out.",
      type: "grid", cols: ["Date reported", "Asset / location", "Fault / work required", "Risk / interim control", "Job ref / engineer", "Work done / closed"], blank: 14 },
    // ---- Combined & manuals ----
    { id: "f01", no: "01", group: "Combined & manuals", title: "Combined Fire Safety Inspection & Incident Log", type: "combined",
      intro: "One sheet covering daily checks, weekly call point, monthly extinguishers, CO alarms and activations." },
    { id: "f05", no: "05", group: "Combined & manuals", title: "Fire Safety Manual & Policies", type: "manual",
      body: "This is the hotel's fire safety management manual and policy set (management draft — requires site-specific review and formal approval before operational use). The current fire risk assessment and approved evacuation strategy take precedence.\n\nThe full approved manual is held under HosFIRE ▸ Documents (category: Policy and procedure / Manual). Use this cover sheet to record the controlled-copy details, approver and review date." },
    { id: "f06", no: "06", group: "Combined & manuals", title: "Fire Safety Operating Manual", type: "manual",
      body: "A site working manual and template set for fire safety management — not a completed fire risk assessment or proof of compliance. The Responsible Person must adopt, tailor and approve it against the current FRA, evacuation strategy and building systems.\n\nThe full operating manual is held under HosFIRE ▸ Documents. Keep the current FRA, action plan, premises plans, evacuation strategy, alarm zone chart, equipment inventories and service records with this pack." },
  ];
  const GROUPS = ["Daily", "Weekly", "Monthly", "Incident & event", "Registers", "Combined & manuals"];
  const GROUP_ICON = { "Daily": "📅", "Weekly": "🗓️", "Monthly": "📆", "Incident & event": "🚨", "Registers": "📇", "Combined & manuals": "📘" };

  /* ---------- shared blocks ---------- */
  const inp = (val, ph) => `<input class="ff-in" value="${esc(val || "")}" placeholder="${esc(ph || "")}">`;
  function headerBlock() {
    return `<div class="ff-meta">
      <div><label>Site</label>${inp(HOTEL.name)}</div>
      <div><label>Address</label>${inp(HOTEL.address)}</div>
      <div><label>Date</label>${inp(td())}</div>
      <div><label>Completed by</label>${inp(me())}</div>
      <div><label>Responsible person</label>${inp(FM.name)}</div>
      <div><label>Shift / time</label>${inp("")}</div>
    </div>`;
  }
  function footerBlock() {
    return `<div class="ff-foot">
      <div class="ff-full"><label>Defects / actions / reference</label><textarea class="ff-in" rows="2"></textarea></div>
      <div class="ff-sign">
        <div><label>Escalated to</label>${inp("")}</div>
        <div><label>Time</label>${inp("")}</div>
        <div><label>Signed</label>${inp("")}</div>
      </div></div>`;
  }
  function gridBody(f) {
    const head = `<tr>${f.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    let body = "";
    (f.rows || []).forEach((r) => { body += `<tr>${f.cols.map((_, i) => `<td>${inp(r[i])}</td>`).join("")}</tr>`; });
    const blanks = f.blank || 10;
    for (let i = 0; i < blanks; i++) body += `<tr>${f.cols.map((_, ci) => `<td>${inp("", ci === 0 && f.prefillTrainer && f.cols[3] === "Trainer" ? "" : "")}</td>`).join("")}</tr>`;
    return `<table class="ff-grid"><thead>${head}</thead><tbody>${body}</tbody></table>
      <button class="btn ghost sm noprint" data-addrow style="margin-top:8px">+ Add row</button>`;
  }
  function recordBody(f) {
    return `<table class="ff-rec">${f.fields.map((lab) => `<tr><th>${esc(lab)}</th><td>${inp((f.prefill && f.prefill[lab]) || "")}</td></tr>`).join("")}</table>`;
  }
  function manualBody(f) {
    return `<div class="ff-manual">${f.body.split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("")}
      <table class="ff-rec" style="margin-top:10px">
        <tr><th>Controlled copy / location</th><td>${inp("HosFIRE ▸ Documents")}</td></tr>
        <tr><th>Version</th><td>${inp("")}</td></tr>
        <tr><th>Approved by</th><td>${inp("")}</td></tr>
        <tr><th>Approval date</th><td>${inp("")}</td></tr>
        <tr><th>Next review</th><td>${inp("")}</td></tr>
      </table></div>`;
  }
  function combinedBody() {
    const sec = (title, items) => `<div class="ff-sec"><div class="ff-sech">${title}</div>${items.map((it) => `<div class="ff-ck"><span>${esc(it)}</span><span class="ff-pfn">Pass &nbsp; Fail &nbsp; N/A</span></div>`).join("")}</div>`;
    return `
      ${sec("Daily fire safety checks", ["Escape routes and exits clear", "Fire doors closed, unobstructed and operating", "Fire alarm panel normal / no unresolved fault", "Fire extinguishers and fire blankets accessible", "Signage and emergency lighting evident"])}
      <div class="ff-sec"><div class="ff-sech">Weekly fire alarm call point test</div>${miniRows(["Call point ID / location & time tested", "Alarm operation / audibility / panel result"])}</div>
      <div class="ff-sec"><div class="ff-sech">Monthly extinguisher visual checks</div>${miniRows(["Locations / IDs inspected and defects"])}</div>
      <div class="ff-sec"><div class="ff-sech">Carbon monoxide alarm test</div>${miniRows(["Detector ID / location, test result"])}</div>
      <div class="ff-sec"><div class="ff-sech">Alarm activations & false alarms</div>${miniRows(["Time / zone / cause / action / reset authorisation", "Fault reference / corrective action / responsible person"])}</div>`;
  }
  function miniRows(labels) { return labels.map((l) => `<div class="ff-mr"><label>${esc(l)}</label>${inp("")}</div>`).join(""); }
  function hotworkBody() {
    const checks = ["Work area inspected and exact scope/location confirmed.", "Flammable and combustible items removed or adequately segregated / screened.", "Floors, walls, ceilings, voids and opposite sides of partitions checked for hidden combustibles.", "Fire-resistant blankets / screens in place where sparks, flame or hot debris may travel.", "Suitable fire extinguishing appliances immediately available.", "Gas cylinders / fuel sources safely positioned, secured and away from ignition risks.", "Hot-work equipment, hoses, leads, regulators, guards and connections checked before use.", "Escape routes and fire exits clear throughout the work.", "Adjacent rooms / areas that could be affected by heat, smoke or sparks checked.", "Any fire-alarm detector isolation agreed with the hotel and limited to the minimum area.", "Relevant hotel staff / management informed before hot work starts."];
    const f2 = (a, b) => `<div class="ff-hw2"><div><label>${esc(a)}</label>${inp("")}</div><div><label>${esc(b)}</label>${inp("")}</div></div>`;
    return `
      ${f2("Permit No.", "Date")}${f2("Exact work location", "Start time")}${f2("Description of hot work", "Expected finish")}${f2("Person(s) carrying out work", "Permit expiry")}
      <div class="ff-sech">1. Pre-work safety checks</div>
      ${checks.map((c) => `<div class="ff-ck ff-ckl"><span class="ff-tick">☐</span><span>${esc(c)}</span></div>`).join("")}
      <div class="ff-sech">2. Controls during hot work</div>
      <p class="ff-p">Maintain supervision and good housekeeping. Keep extinguishing equipment ready for immediate use. Prevent sparks, slag and hot debris travelling outside the controlled area. Never leave hot-work equipment operating unattended. Stop work immediately if conditions change, fire precautions become inadequate, the alarm is raised or unexpected combustible materials are exposed.</p>
      <div class="ff-sech">3. Fire watch &amp; completion</div>
      <p class="ff-p">A fire watch must be maintained during the hot work and for a minimum of <b>1 hour</b> after all hot work has finished. Inspect the work area and adjacent / hidden areas. Any isolated fire-alarm detection must be reinstated as soon as it is safe and confirmed with the hotel's authorised person.</p>
      ${f2("Hot work finished", "Fire watch started")}${f2("Fire watch completed", "Minimum 1 hour confirmed (Yes)")}${f2("Fire detection reinstated (Yes / N/A)", "Area left safe (Yes)")}
      <div class="ff-sech">4. Authorisation &amp; sign-off</div>
      ${f2("Hotel permit authorised by", "Signature")}${f2("Contractor (name / company)", "Signature")}${f2("Fire watch carried out by", "Signature")}${f2("Brandon Hall final acceptance", "Signature")}
      <p class="ff-note">Valid only for the work, location and period stated. Issue a new permit if the scope, location, personnel or conditions materially change.</p>`;
  }

  function formInner(f) {
    if (f.type === "grid") return gridBody(f);
    if (f.type === "record") return recordBody(f);
    if (f.type === "manual") return manualBody(f);
    if (f.type === "combined") return combinedBody();
    if (f.type === "hotwork") return hotworkBody();
    return "";
  }

  function renderOpen(f) {
    const noMeta = f.type === "hotwork";
    return `<div class="ff-bar noprint">
        <button class="btn ghost" id="ff-back">← All forms</button>
        <div class="grow"></div>
        <span class="muted" style="font-size:12.5px">${S.formRec ? "Saved in HosFIRE — view, edit, download or re-save." : "Save to HosFIRE to view & download later, or Print / Save as PDF now."}</span>
        <button class="btn gold" id="ff-save">💾 ${S.formRec ? "Update saved" : "Save to HosFIRE"}</button>
        <button class="btn red" id="ff-print">🖨 Print / Save as PDF</button>
      </div>
      <div class="ff-doc" id="ff-doc">
        <div class="ff-head">
          <img src="${logoURL()}" onerror="this.style.display='none'">
          <div><div class="ff-brand">${esc(HOTEL.name)}</div><div class="ff-ttl">${esc(f.title)}</div></div>
          <div class="ff-no">${esc(f.no)}</div>
        </div>
        ${f.intro ? `<p class="ff-intro">${esc(f.intro)}</p>` : ""}
        ${noMeta ? "" : headerBlock()}
        ${formInner(f)}
        ${(f.type === "grid" || f.type === "combined") ? footerBlock() : ""}
        <div class="ff-docfoot">${esc(HOTEL.name)} · Fire Safety · ${esc(f.title)}</div>
      </div>`;
  }

  function renderGallery() {
    let html = `<h2>Fire safety <span class="fl">forms</span></h2>
      <p class="lead">Complete any form on screen — the hotel details are already filled in — then <b>Save to HosFIRE</b> (to view &amp; download it again later) or <b>Print / Save as PDF</b>. Once signed, scan and upload under <b>Documents</b>. These mirror the pro-formas in the fire safety pack.</p>`;
    const done = (typeof reg === "function" ? reg("formfill") : []).slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    if (done.length) {
      html += `<h3 style="margin:16px 0 8px">✅ Completed &amp; saved (${done.length})</h3>
        <div class="tw"><table><tr><th>Form</th><th>Date</th><th>Saved by</th><th>Saved</th><th></th></tr>
        ${done.map((r) => `<tr><td><a href="#" data-view="${esc(r.id)}" style="color:var(--navy);font-weight:700;text-decoration:none">${esc(r.title || "Form")}</a></td><td>${esc(r.date ? (typeof fds === "function" ? fds(r.date) : r.date) : "")}</td><td>${esc(r.by || "")}</td><td class="muted">${esc(r.savedAtStr || "")}</td>
          <td style="white-space:nowrap;text-align:right"><a href="#" data-view="${esc(r.id)}" style="color:var(--navy);font-weight:700;text-decoration:none;margin-right:12px">👁 View / download</a><a href="#" data-delrec="${esc(r.id)}" style="color:var(--red);font-weight:700;text-decoration:none">🗑 Delete</a></td></tr>`).join("")}
        </table></div>`;
    }
    GROUPS.forEach((g) => {
      const items = FORMS.filter((f) => f.group === g);
      if (!items.length) return;
      html += `<h3 style="margin:16px 0 8px">${GROUP_ICON[g] || ""} ${esc(g)}</h3>
        <div class="ff-cards">${items.map((f) => `<button class="ff-card" data-form="${f.id}">
          <span class="ff-cardno">${esc(f.no)}</span>
          <span class="ff-cardt">${esc(f.title)}</span>
          <span class="ff-cardgo">Open →</span></button>`).join("")}</div>`;
    });
    return html;
  }

  VIEWS.forms = () => (S.form ? renderOpen(FORMS.find((x) => x.id === S.form) || FORMS[0]) : renderGallery());

  function addGridRow(v) {
    const tb = v.querySelector(".ff-grid tbody"); if (!tb) return false;
    const cols = tb.querySelector("tr").children.length;
    const tr = document.createElement("tr"); let c = "";
    for (let i = 0; i < cols; i++) c += `<td><input class="ff-in" value=""></td>`;
    tr.innerHTML = c; tb.appendChild(tr); return true;
  }
  function fillValues(v, vals) {
    if (!vals || !vals.length) return;
    const doc = v.querySelector("#ff-doc"); if (!doc) return;
    let guard = 0;
    while (doc.querySelectorAll("input,textarea,select").length < vals.length && guard < 200) { if (!addGridRow(v)) break; guard++; }
    const els = doc.querySelectorAll("input,textarea,select");
    vals.forEach((val, i) => { if (els[i]) els[i].value = val; });
  }

  BIND.forms = (v) => {
    const $$l = (s) => Array.prototype.slice.call(v.querySelectorAll(s));
    $$l("[data-form]").forEach((b) => (b.onclick = () => { S.form = b.dataset.form; S.formRec = null; render(); window.scrollTo(0, 0); }));
    $$l("[data-view]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); const rec = reg("formfill").find((r) => r.id === a.dataset.view); if (!rec) return; S.form = rec.formId; S.formRec = rec.id; render(); window.scrollTo(0, 0); }));
    $$l("[data-delrec]").forEach((a) => (a.onclick = async (e) => { e.preventDefault(); const rec = reg("formfill").find((r) => r.id === a.dataset.delrec); if (!confirm(`Delete the saved "${(rec && rec.title) || "form"}"?`)) return; await del("registers", a.dataset.delrec); audit(`Deleted saved form: ${(rec && rec.title) || ""}`); }));
    const back = v.querySelector("#ff-back"); if (back) back.onclick = () => { S.form = null; S.formRec = null; render(); };
    const addr = v.querySelector("[data-addrow]"); if (addr) addr.onclick = () => addGridRow(v);
    const pr = v.querySelector("#ff-print"); if (pr) pr.onclick = () => printForm(v.querySelector("#ff-doc"), (FORMS.find((x) => x.id === S.form) || {}).title || "Fire safety form");
    // re-populate a saved form
    if (S.form && S.formRec) { const rec = reg("formfill").find((r) => r.id === S.formRec); if (rec) fillValues(v, rec.vals); }
    // save / update
    const sv = v.querySelector("#ff-save"); if (sv) sv.onclick = async () => {
      const f = FORMS.find((x) => x.id === S.form) || {}; const doc = v.querySelector("#ff-doc"); if (!doc) return;
      const vals = Array.prototype.slice.call(doc.querySelectorAll("input,textarea,select")).map((el) => el.value);
      const dateEl = doc.querySelector(".ff-meta .ff-in"); // first meta input is Site; date is 3rd — find by label
      let date = td(); const metas = doc.querySelectorAll(".ff-meta > div");
      metas.forEach((d) => { const l = d.querySelector("label"); if (l && /date/i.test(l.textContent)) { const i = d.querySelector(".ff-in"); if (i && i.value) date = i.value; } });
      const rec = { kind: "formfill", formId: f.id, title: f.title, no: f.no, date: date, by: me(), vals: vals, savedAt: Date.now(), savedAtStr: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) };
      sv.disabled = true;
      try {
        if (S.formRec) { await put("registers", S.formRec, rec); } else { const id = await add("registers", rec); S.formRec = id; }
        fillValues(v, vals); // a demo-mode rerender can blank the form; restore the entered values
        const sv2 = v.querySelector("#ff-save"); if (sv2) { sv2.textContent = "💾 Update saved"; sv2.disabled = false; }
        const hint = v.querySelector(".ff-bar .muted"); if (hint) hint.textContent = "Saved in HosFIRE — view, edit, download or re-save.";
        toast("Saved to HosFIRE"); audit(`Form saved: ${f.title}`);
      } catch (e) { sv.disabled = false; alert("Couldn't save: " + (e.message || e)); }
    };
  };

  function printForm(docEl, title) {
    if (!docEl) return;
    const clone = docEl.cloneNode(true);
    clone.querySelectorAll("input, textarea").forEach((el) => { const s = document.createElement("span"); s.className = "pv"; s.textContent = el.value || ""; el.replaceWith(s); });
    clone.querySelectorAll("select").forEach((el) => { const s = document.createElement("span"); s.className = "pv"; s.textContent = el.value || ""; el.replaceWith(s); });
    clone.querySelectorAll(".noprint, [data-addrow]").forEach((e) => e.remove());
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups to print this form."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${clone.outerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
  }

  /* ---------- styles (screen + print) ---------- */
  const CSS = `
    .ff-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
    .ff-card{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;background:#fff;border:1px solid var(--line,#e2ded6);border-left:4px solid var(--red,#B3261E);border-radius:10px;padding:12px 14px;cursor:pointer;font:inherit}
    .ff-card:hover{box-shadow:0 2px 10px rgba(0,0,0,.08)}
    .ff-cardno{font-size:11px;font-weight:800;color:#fff;background:var(--navy,#2C3E50);border-radius:6px;padding:1px 8px}
    .ff-cardt{font-weight:700;color:var(--navy,#2C3E50);font-size:14px;line-height:1.25}
    .ff-cardgo{font-size:12px;color:var(--red,#B3261E);font-weight:700;margin-top:2px}
    .ff-bar{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
    .ff-doc{background:#fff;border:1px solid var(--line,#e2ded6);border-radius:12px;padding:22px 24px;max-width:1000px}
    .ff-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid var(--red,#B3261E);padding-bottom:10px}
    .ff-head img{height:46px}
    .ff-brand{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700}
    .ff-ttl{font-size:21px;font-weight:800;color:var(--navy,#1F3864)}
    .ff-no{margin-left:auto;font-size:22px;font-weight:800;color:#fff;background:var(--navy,#1F3864);border-radius:8px;padding:4px 12px}
    .ff-intro{font-size:12.5px;color:#5f6b78;margin:10px 0}
    .ff-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;margin:8px 0 14px}
    .ff-meta label,.ff-foot label,.ff-rec th,.ff-mr label,.ff-hw2 label{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#6b7280;margin-bottom:2px;text-align:left}
    .ff-in{width:100%;padding:7px 8px;border:1px solid #cfd8e0;border-radius:7px;font:inherit;font-size:13px;background:#fff}
    textarea.ff-in{resize:vertical}
    table.ff-grid{width:100%;border-collapse:collapse;margin-top:4px}
    table.ff-grid th{background:var(--navy,#1F3864);color:#fff;font-size:11px;padding:7px 6px;text-align:left}
    table.ff-grid td{border:1px solid #e2ded6;padding:3px}
    table.ff-grid td .ff-in{border:none;border-radius:0;padding:6px 6px}
    table.ff-rec{width:100%;border-collapse:collapse;margin-top:4px}
    table.ff-rec th{width:33%;background:#f6f3ee;border:1px solid #e2ded6;padding:8px 10px;font-size:11px;vertical-align:middle}
    table.ff-rec td{border:1px solid #e2ded6;padding:4px}
    table.ff-rec td .ff-in{border:none}
    .ff-foot{margin-top:12px;border-top:1px solid #e2ded6;padding-top:10px}
    .ff-full{margin-bottom:8px}
    .ff-sign{display:grid;grid-template-columns:2fr 1fr 2fr;gap:12px}
    .ff-sec{margin-top:12px;border:1px solid #e2ded6;border-radius:8px;padding:10px 12px}
    .ff-sech{font-weight:800;color:var(--navy,#1F3864);font-size:13px;margin:14px 0 6px}
    .ff-sec .ff-sech{margin-top:0}
    .ff-ck{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-bottom:1px dashed #eee;font-size:13px}
    .ff-ck:last-child{border-bottom:0}
    .ff-ckl{justify-content:flex-start;gap:10px}
    .ff-pfn{color:#6b7280;font-size:11.5px;white-space:nowrap}
    .ff-tick{font-size:16px;color:var(--navy,#1F3864)}
    .ff-mr{margin:6px 0}
    .ff-hw2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0}
    .ff-p,.ff-note,.ff-manual p{font-size:12.5px;color:#42505f;line-height:1.55;margin:6px 0}
    .ff-note{font-style:italic;color:#6b7280}
    .ff-docfoot{margin-top:14px;font-size:10px;color:#9aa6b2;border-top:1px solid #eee;padding-top:6px}
  `;
  const PRINT_CSS = `
    @page{size:A4 portrait;margin:12mm}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;font-family:Lato,Arial,sans-serif;color:#1f2a37;font-size:12px}
    .ff-doc{padding:0}
    .ff-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #B3261E;padding-bottom:8px}
    .ff-head img{height:44px}
    .ff-brand{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700}
    .ff-ttl{font-size:19px;font-weight:800;color:#1F3864}
    .ff-no{margin-left:auto;font-size:18px;font-weight:800;color:#fff;background:#1F3864;border-radius:8px;padding:3px 10px}
    .ff-intro{font-size:11px;color:#5f6b78;margin:8px 0}
    .ff-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 12px;margin:6px 0 12px}
    .ff-meta label,.ff-foot label,.ff-rec th,.ff-mr label,.ff-hw2 label{display:block;font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:1px}
    .pv{display:block;min-height:15px;border-bottom:1px solid #cfd8e0;padding:3px 2px;font-size:12px}
    table.ff-grid,table.ff-rec{width:100%;border-collapse:collapse}
    table.ff-grid th{background:#1F3864;color:#fff;font-size:10px;padding:5px;text-align:left}
    table.ff-grid td{border:1px solid #cfd8e0;padding:0}
    table.ff-grid td .pv{min-height:20px;border-bottom:none;padding:5px 5px}
    table.ff-rec th{width:33%;background:#f6f3ee;border:1px solid #cfd8e0;padding:6px 8px;font-size:10px;text-align:left}
    table.ff-rec td{border:1px solid #cfd8e0;padding:0}
    table.ff-rec td .pv{border-bottom:none;padding:6px}
    .ff-foot{margin-top:10px;border-top:1px solid #cfd8e0;padding-top:8px}
    .ff-sign{display:grid;grid-template-columns:2fr 1fr 2fr;gap:12px}
    .ff-sec{margin-top:10px;border:1px solid #cfd8e0;border-radius:6px;padding:8px 10px;break-inside:avoid}
    .ff-sech{font-weight:800;color:#1F3864;font-size:12px;margin:12px 0 5px}
    .ff-ck{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px dashed #eee;font-size:12px}
    .ff-ckl{justify-content:flex-start}
    .ff-tick{font-size:15px}
    .ff-hw2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:5px 0}
    .ff-p,.ff-note,.ff-manual p{font-size:11px;color:#42505f;line-height:1.5;margin:5px 0}
    .ff-note{font-style:italic;color:#6b7280}
    .ff-docfoot{margin-top:12px;font-size:9px;color:#9aa6b2;border-top:1px solid #eee;padding-top:5px}
  `;
  try { const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st); } catch (e) {}
})();
