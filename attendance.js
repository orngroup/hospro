/* ============================================================
   HosPEOPLE — ATTENDANCE (rota vs fingerprint clock log)
   ------------------------------------------------------------
   Compares the scheduled rota against the T&A device's clock
   in/out log to show lateness, time lost and the cost of it.

   Clock scans are stored cumulatively, so every weekly upload
   adds to the history. The report can then be viewed for any
   date range (this week, month to date, last month, custom…)
   without re-uploading — the data persists.
   ============================================================ */
(function(){
  const LS_KEY = "hp_attend_v1";
  const GRACE_DEFAULT = 5;
  const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

  const ATT = {
    rota: (typeof ATTEND_ROTA_SEED!=="undefined") ? JSON.parse(JSON.stringify(ATTEND_ROTA_SEED)) : {},
    rotaLabel: "Bundled rota (1–18 Oct 2026)",
    grace: GRACE_DEFAULT,
    allScans: [],                 // cumulative history: [{name, d, t, type}]
    clockLabel: "",               // label of the most recent upload
    rotaVersion: "",              // which bundled-rota version has been merged in
    range: { mode:"all", from:null, to:null },
    view: "report",               // "report" (attendance) | "rota" (rota analysis)
    results: null,
    sort: "cost"
  };

  function attLoad(){ try{ const s=JSON.parse(localStorage.getItem(LS_KEY)||"null");
    if(s){ if(s.rota) ATT.rota=s.rota; if(s.rotaLabel) ATT.rotaLabel=s.rotaLabel;
      if(Array.isArray(s.allScans)) ATT.allScans=s.allScans;
      if(s.clockLabel) ATT.clockLabel=s.clockLabel;
      if(s.range) ATT.range=Object.assign({mode:"all",from:null,to:null}, s.range);
      if(s.view) ATT.view=s.view;
      if(s.rotaVersion) ATT.rotaVersion=s.rotaVersion;
      if(s.grace) ATT.grace=s.grace;
      // migrate older saves / the bundled seed into the cumulative store
      if((!ATT.allScans||!ATT.allScans.length) && Array.isArray(s.clockRows)) mergeScans(s.clockRows);
    } }catch(e){}
    if((!ATT.allScans||!ATT.allScans.length) && typeof ATTEND_CLOCK_SEED!=="undefined" && Array.isArray(ATTEND_CLOCK_SEED)){
      mergeScans(ATTEND_CLOCK_SEED);
      if(typeof ATTEND_CLOCK_LABEL!=="undefined" && !ATT.clockLabel) ATT.clockLabel=ATTEND_CLOCK_LABEL;
    }
    // Bundled-rota updates: merge the shipped rota into the stored one whenever the version changes,
    // so a new month of rota appears on every device without wiping uploaded clock data.
    try{
      if(typeof ATTEND_ROTA_VERSION!=="undefined" && ATTEND_ROTA_VERSION && ATT.rotaVersion!==ATTEND_ROTA_VERSION && typeof ATTEND_ROTA_SEED!=="undefined"){
        mergeRota(ATTEND_ROTA_SEED); ATT.rotaVersion=ATTEND_ROTA_VERSION;
        if(typeof ATTEND_ROTA_LABEL!=="undefined" && ATTEND_ROTA_LABEL) ATT.rotaLabel=ATTEND_ROTA_LABEL;
        attSave();
      }
    }catch(e){}
  }
  function attSave(){ try{ localStorage.setItem(LS_KEY, JSON.stringify({ rota:ATT.rota, rotaLabel:ATT.rotaLabel, allScans:ATT.allScans, clockLabel:ATT.clockLabel, range:ATT.range, view:ATT.view, rotaVersion:ATT.rotaVersion, grace:ATT.grace })); }catch(e){} }

  // Add scans to the history, skipping any already stored (dedup by person+date+time+direction).
  function mergeScans(rows){
    if(!Array.isArray(rows)) return {added:0,dup:0};
    const seen=new Set((ATT.allScans||[]).map(r=>r.name+"|"+r.d+"|"+r.t+"|"+r.type));
    let added=0,dup=0;
    rows.forEach(r=>{ const k=r.name+"|"+r.d+"|"+r.t+"|"+r.type; if(seen.has(k)){ dup++; return; } seen.add(k); ATT.allScans.push({name:r.name,d:r.d,t:r.t,type:r.type}); added++; });
    return {added,dup};
  }

  // People to leave out of the attendance review (management / not relevant).
  const EXCLUDE = ["patrik vlach","veronica webb","natalie freeman"];

  // ---------- name helpers ----------
  const norm = s => String(s||"").toLowerCase().replace(/[^a-z ]+/g," ").replace(/\s+/g," ").trim();
  function isExcluded(n){ const x=norm(n); return EXCLUDE.some(e=>{ const p=e.split(" "); return p.every(tok=>x.includes(tok)); }); }
  const firstKey = s => { const t=norm(s).split(" "); return t[0]||""; };
  const lastKey  = s => { const t=norm(s).split(" "); return t.length>1?t[t.length>2?t.length-1:1]:""; };

  function appStaff(){ try{ return (typeof spGetStaff==="function") ? spGetStaff() : []; }catch(e){ return []; } }
  function matchStaff(name){ // -> {rate, dept, name} from the app's staff (for hourly rate)
    const fk=firstKey(name), lk=lastKey(name); const staff=appStaff();
    let cands=staff.filter(s=>firstKey(s.name)===fk);
    if(cands.length>1 && lk){ const byLast=cands.filter(s=>norm(s.name).includes(lk)); if(byLast.length) cands=byLast; }
    const s=cands[0];
    return s ? { rate:+s.hourlyRate||0, dept:(s.deptName||s.dept||""), name:s.name } : null;
  }

  // ---------- date helpers ----------
  function isoLocal(dt){ const z=new Date(dt.getTime()-dt.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); }
  function todayISO(){ return isoLocal(new Date()); }
  function mondayOf(dt){ const d=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return d; }
  function rangeBounds(){
    const mode=(ATT.range&&ATT.range.mode)||"all", now=new Date(), t=todayISO();
    if(mode==="week"){ return {from:isoLocal(mondayOf(now)), to:t}; }
    if(mode==="lastweek"){ const m=mondayOf(now); const s=new Date(m); s.setDate(s.getDate()-7); const e=new Date(m); e.setDate(e.getDate()-1); return {from:isoLocal(s), to:isoLocal(e)}; }
    if(mode==="mtd"){ return {from:isoLocal(new Date(now.getFullYear(),now.getMonth(),1)), to:t}; }
    if(mode==="lastmonth"){ const s=new Date(now.getFullYear(),now.getMonth()-1,1); const e=new Date(now.getFullYear(),now.getMonth(),0); return {from:isoLocal(s), to:isoLocal(e)}; }
    if(mode==="custom"){ return {from:ATT.range.from||null, to:ATT.range.to||null}; }
    return {from:null, to:null}; // all
  }
  const RANGE_LABELS = {all:"All stored data", week:"This week", lastweek:"Last week", mtd:"Month to date", lastmonth:"Last month", custom:"Custom range"};

  // ---------- parsing ----------
  function parseClockCSV(text){
    const lines=text.replace(/\r/g,"").split("\n").filter(x=>x.trim());
    if(!lines.length) return [];
    const head=lines[0].split(",").map(h=>h.trim().toLowerCase());
    const iName=head.indexOf("employee"), iTime=head.indexOf("clock_time"), iType=head.indexOf("check_type");
    if(iName<0||iTime<0||iType<0) throw new Error("Not a clock-log CSV (need employee, clock_time, check_type columns).");
    const out=[];
    for(let i=1;i<lines.length;i++){
      const c=lines[i].split(",");
      const name=(c[iName]||"").trim(); const ts=(c[iTime]||"").trim(); const type=(c[iType]||"").trim();
      const m=ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if(!name||!m) continue;
      const d=`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
      out.push({ name, d, t:(+m[4])*60+(+m[5]), type:/out/i.test(type)?"Out":"In" });
    }
    return out;
  }
  function hdrDate(cell){ const m=String(cell||"").match(/(\d{1,2})\s+([A-Za-z]{3})/); if(!m) return null;
    const mo=MONTHS[m[2].toLowerCase().slice(0,3)]; if(mo==null) return null;
    return "2026-"+String(mo+1).padStart(2,"0")+"-"+String(+m[1]).padStart(2,"0"); }   // build directly — no toISOString (timezone-safe)
  function hhmm(x){ x=String(x); if(x.length===4) return (+x.slice(0,2))*60+(+x.slice(2)); if(x.length===3) return (+x.slice(0,1))*60+(+x.slice(1)); return null; }
  function parseShift(s){ if(s==null) return null; s=String(s).replace(/[‒-―−]/g,"-").trim();   // normalise en/em dashes
    if(!s || /^(off|holiday|hol|sick|in ?lieu|on ?call|leave|al|day ?off|n\/?a|0)$/i.test(s)) return null;
    // HH:MM (-|:|to) HH:MM  — also tolerates the "09:00:17:30" colon typo
    let m=s.match(/(\d{1,2})[:.](\d{2})\s*(?:[-]|:|to)+\s*(\d{1,2})[:.](\d{2})/i);
    if(m){ let a=(+m[1])*60+(+m[2]), b=(+m[3])*60+(+m[4]); if(b<a) b+=1440; return [a,b]; }
    // HHMM-HHMM (e.g. 0900-1700)
    m=s.match(/^(\d{3,4})\s*-\s*(\d{3,4})$/);
    if(m){ let a=hhmm(m[1]), b=hhmm(m[2]); if(a!=null&&b!=null){ if(b<a) b+=1440; return [a,b]; } }
    // hour-only (e.g. 9-5, 9-17) — 9-5 reads as 09:00-17:00
    m=s.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
    if(m){ let a=(+m[1])*60+(+(m[2]||0)), eh=+m[3], b=eh*60+(+(m[4]||0));
      if(b<a){ if(a<720 && eh<=12){ b=(eh+12)*60+(+(m[4]||0)); } if(b<a) b+=1440; } return [a,b]; }
    return null; }
  function rotaFromAOA(aoa){
    let hr=-1; for(let r=0;r<Math.min(aoa.length,8);r++){ if(String(aoa[r][0]||"").toUpperCase().startsWith("TEAM MEMBER")){ hr=r; break; } }
    if(hr<0) throw new Error("Couldn't find the 'TEAM MEMBER' header row in the rota.");
    const dates=[]; for(let c=1;c<=7;c++) dates.push(hdrDate(aoa[hr][c]));
    const out={};
    for(let r=hr+1;r<aoa.length;r++){
      const a=String(aoa[r][0]||"").replace(/\n/g," ").trim(); if(!a) continue;
      const row={};
      for(let i=0;i<7;i++){ const sh=parseShift(aoa[r][i+1]); if(sh && dates[i]) row[dates[i]]=sh; }
      if(Object.keys(row).length) out[a]=row;
    }
    if(!Object.keys(out).length) throw new Error("No shifts found in the rota file.");
    return out;
  }
  // Merge an uploaded rota into the stored one, by person and date, so several weeks build up.
  function mergeRota(newRota){
    let people=0, days=0;
    Object.keys(newRota).forEach(person=>{
      const dst=ATT.rota[person]||(ATT.rota[person]={}); people++;
      Object.keys(newRota[person]).forEach(d=>{ dst[d]=newRota[person][d]; days++; });
    });
    return {people,days};
  }
  function readRotaFile(file, cb){
    const name=file.name.toLowerCase();
    if(name.endsWith(".csv")){
      const fr=new FileReader(); fr.onload=()=>{ try{
        const aoa=fr.result.replace(/\r/g,"").split("\n").map(l=>l.split(","));
        cb(null, rotaFromAOA(aoa)); }catch(e){ cb(e); } }; fr.readAsText(file); return;
    }
    if(typeof XLSX==="undefined"){ cb(new Error("Excel reader not loaded — save the rota as CSV and upload that, or try again.")); return; }
    const fr=new FileReader(); fr.onload=()=>{ try{
      const wb=XLSX.read(new Uint8Array(fr.result),{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""});
      cb(null, rotaFromAOA(aoa)); }catch(e){ cb(e); } }; fr.readAsArrayBuffer(file);
  }

  // ---------- analysis (over the stored history, filtered to the chosen range) ----------
  function analyse(){
    const grace=+ATT.grace||0;
    const rota=ATT.rota||{};
    const rb=rangeBounds();
    const clock=(ATT.allScans||[]).filter(r=>(!rb.from||r.d>=rb.from)&&(!rb.to||r.d<=rb.to));
    const byName={}; clock.forEach(r=>{ (byName[r.name]=byName[r.name]||{}); (byName[r.name][r.d]=byName[r.name][r.d]||[]).push(r); });
    const rotaByFirst={}; Object.keys(rota).forEach(rn=>{ (rotaByFirst[firstKey(rn)]=rotaByFirst[firstKey(rn)]||[]).push(rn); });
    const matchRota=cn=>{ const fk=firstKey(cn), lk=lastKey(cn); const cands=rotaByFirst[fk]||[];
      if(cands.length===1) return cands[0]; if(lk){ const x=cands.find(rn=>norm(rn).includes(lk)); if(x) return x; } return cands[0]||null; };
    let minD=null,maxD=null; clock.forEach(r=>{ if(!minD||r.d<minD)minD=r.d; if(!maxD||r.d>maxD)maxD=r.d; });
    const rows=[];
    Object.keys(byName).forEach(cn=>{
      if(isExcluded(cn)) return;
      const rn=matchRota(cn); if(!rn) return;
      const sched=rota[rn]; const st=matchStaff(cn)||matchStaff(rn)||{rate:0,dept:""};
      let daysSched=0,daysClocked=0,noScan=0,timesLate=0,totalLate=0,lost=0;
      Object.keys(sched).forEach(d=>{
        if(minD && (d<minD||d>maxD)) return;     // only days the clock history covers in this range
        if(rb.from && d<rb.from) return; if(rb.to && d>rb.to) return;
        daysSched++;
        const scans=(byName[cn][d]||[]).slice().sort((a,b)=>a.t-b.t);
        if(!scans.length){ noScan++; return; }
        daysClocked++;
        const tin=scans[0].t;
        const late=Math.max(0, tin - sched[d][0]);
        if(late>grace){ timesLate++; totalLate+=late; lost+=late; }
      });
      if(!daysSched) return;
      const lostHrs=lost/60; const cost=lostHrs*(st.rate||0);
      rows.push({ name:cn, dept:st.dept||"", rate:st.rate||0, daysSched, daysClocked, noScan, timesLate, totalLate,
        avgLate: timesLate?Math.round(totalLate/timesLate):0, lostMin:lost, lostHrs:Math.round(lostHrs*10)/10, cost:Math.round(cost*100)/100 });
    });
    ATT.results={ rows, span:{from:minD,to:maxD}, scans:clock.length,
      totLateOcc: rows.reduce((s,r)=>s+r.timesLate,0),
      totLateHrs: Math.round(rows.reduce((s,r)=>s+r.totalLate,0)/60*10)/10,
      totCost: Math.round(rows.reduce((s,r)=>s+r.cost,0)*100)/100,
      noRate: rows.filter(r=>!r.rate).length };
  }

  // ---------- render ----------
  function sortedRows(){ const r=(ATT.results&&ATT.results.rows||[]).slice();
    const k=ATT.sort; r.sort((a,b)=> k==="late"?(b.timesLate-a.timesLate||b.totalLate-a.totalLate)
      : k==="lost"?(b.lostMin-a.lostMin) : (b.cost-a.cost||b.lostMin-a.lostMin)); return r; }
  function money(n){ return "£"+(Math.round((+n||0)*100)/100).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtD(d){ return d? new Date(d+"T12:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"—"; }
  function storedSpan(){ let mn=null,mx=null; (ATT.allScans||[]).forEach(r=>{ if(!mn||r.d<mn)mn=r.d; if(!mx||r.d>mx)mx=r.d; }); return {mn,mx}; }

  window.renderAttendance = function(v){
    attLoad();
    if(ATT.allScans && ATT.allScans.length){ try{ analyse(); }catch(e){} }  // report persists — show it straight away
    const R=ATT.results;
    const sp=storedSpan();
    const storedNote = (ATT.allScans&&ATT.allScans.length)
      ? `Stored history: <b>${ATT.allScans.length.toLocaleString("en-GB")}</b> scans · ${fmtD(sp.mn)} – ${fmtD(sp.mx)}`
      : `No clock data stored yet.`;

    const rmode=(ATT.range&&ATT.range.mode)||"all";
    const rbtn=(k,l)=>`<button onclick="window._attRange('${k}')" style="padding:6px 12px;border:1px solid ${rmode===k?'#2B726A':'#d7dde4'};background:${rmode===k?'#2B726A':'#fff'};color:${rmode===k?'#fff':'#45586b'};border-radius:8px;font:700 12px Lato;cursor:pointer">${l}</button>`;
    const rb=rangeBounds();
    const customRow = rmode==="custom"
      ? `<div style="display:flex;gap:8px;align-items:flex-end;margin-top:8px;flex-wrap:wrap">
           <div><label style="display:block;font:700 10px Lato;color:#6b7280;text-transform:uppercase;margin-bottom:3px">From</label><input type="date" id="att-from" value="${ATT.range.from||''}" style="padding:7px;border:1px solid #d7dde4;border-radius:8px"></div>
           <div><label style="display:block;font:700 10px Lato;color:#6b7280;text-transform:uppercase;margin-bottom:3px">To</label><input type="date" id="att-to" value="${ATT.range.to||''}" style="padding:7px;border:1px solid #d7dde4;border-radius:8px"></div>
           <button onclick="window._attCustom()" style="padding:8px 14px;border:none;background:#1a2b3a;color:#fff;border-radius:8px;font:700 12px Lato;cursor:pointer">Apply</button>
         </div>` : "";

    v.innerHTML = `
      <div class="page-head" style="margin-bottom:6px"><h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">🕒 Attendance — rota vs clock log</h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:62em">Compares the scheduled rota against the fingerprint (T&amp;A) clock in/out log — who's late, how often, the time lost and what it costs. Every clock file you upload is added to a stored history, so you can view any date range below without re-uploading.</p></div>

      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04);margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
        <div><label style="display:block;font:700 10.5px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Add clock-log CSV (T&amp;A export)</label>
          <input type="file" id="att-clock" accept=".csv"><div style="font-size:11px;color:#8296a8;margin-top:3px">${ATT.clockLabel?('Last added: '+ATT.clockLabel):'Nothing added yet'}</div></div>
        <div><label style="display:block;font:700 10.5px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Add rota (optional — .xlsx/.csv)</label>
          <input type="file" id="att-rota" accept=".xlsx,.csv"><div style="font-size:11px;color:#8296a8;margin-top:3px">${ATT.rotaLabel||''} · ${Object.keys(ATT.rota||{}).length} people</div></div>
        <div><label style="display:block;font:700 10.5px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Grace (min)</label>
          <input type="number" id="att-grace" value="${ATT.grace}" min="0" max="30" style="width:70px;padding:8px;border:1px solid #d7dde4;border-radius:8px"></div>
        <button id="att-run" style="padding:10px 18px;border:none;background:#2B726A;color:#fff;border-radius:9px;font:800 13px Lato;cursor:pointer">Refresh report</button>
        <button id="att-csv" style="padding:10px 14px;border:1px solid #2B726A;background:#fff;color:#2B726A;border-radius:9px;font:700 12.5px Lato;cursor:pointer">⬇ Export CSV</button>
      </div>

      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:12px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04);margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font:700 11px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-right:4px">Report period</span>
            ${rbtn('all','All')}${rbtn('week','This week')}${rbtn('lastweek','Last week')}${rbtn('mtd','Month to date')}${rbtn('lastmonth','Last month')}${rbtn('custom','Custom')}
          </div>
          <div style="font-size:11.5px;color:#8296a8">${storedNote} · <button onclick="window._attClear()" style="border:none;background:none;color:#b3261e;font:700 11.5px Lato;cursor:pointer;padding:0;text-decoration:underline">Clear stored data</button></div>
        </div>
        ${customRow}
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button onclick="window._attView('report')" style="padding:8px 16px;border:1px solid ${ATT.view==='report'?'#1a2b3a':'#d7dde4'};background:${ATT.view==='report'?'#1a2b3a':'#fff'};color:${ATT.view==='report'?'#fff':'#45586b'};border-radius:9px;font:800 12.5px Lato;cursor:pointer">📊 Attendance report</button>
        <button onclick="window._attView('rota')" style="padding:8px 16px;border:1px solid ${ATT.view==='rota'?'#1a2b3a':'#d7dde4'};background:${ATT.view==='rota'?'#1a2b3a':'#fff'};color:${ATT.view==='rota'?'#fff':'#45586b'};border-radius:9px;font:800 12.5px Lato;cursor:pointer">📅 Rota analysis</button>
      </div>

      <div id="att-out"></div>`;

    const out=()=>document.getElementById("att-out");
    document.getElementById("att-grace").onchange=e=>{ ATT.grace=+e.target.value||0; attSave(); renderView(out()); };
    document.getElementById("att-clock").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
      const fr=new FileReader(); fr.onload=()=>{ try{
        const parsed=parseClockCSV(fr.result); const res=mergeScans(parsed);
        ATT.clockLabel=f.name+" ("+parsed.length+" scans)"; attSave();
        ATT.view="report"; renderView(out());
        const banner=document.createElement('div'); banner.style.cssText="padding:12px 14px;margin-bottom:12px;background:#eaf4ee;border:1px solid #bfe0cd;border-radius:12px;color:#1e6b2f;font-weight:700";
        banner.innerHTML=`✓ Added ${res.added.toLocaleString("en-GB")} new scan${res.added===1?'':'s'}${res.dup?` (${res.dup.toLocaleString("en-GB")} already stored)`:''}. History now ${ATT.allScans.length.toLocaleString("en-GB")} scans.`;
        out().insertBefore(banner, out().firstChild);
      }catch(err){ out().innerHTML='<div style="padding:16px;background:#fdecea;border:1px solid #f3c0ba;border-radius:12px;color:#b3261e">⚠ '+err.message+'</div>'; } };
      fr.readAsText(f); e.target.value=""; };
    document.getElementById("att-rota").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
      readRotaFile(f,(err,rota)=>{ if(err){ out().innerHTML='<div style="padding:16px;background:#fdecea;border:1px solid #f3c0ba;border-radius:12px;color:#b3261e">⚠ '+err.message+'</div>'; return; }
        const m=mergeRota(rota); ATT.rotaLabel="Rota incl. "+f.name; attSave();
        renderView(out());
        const banner=document.createElement('div'); banner.style.cssText="padding:12px 14px;margin-bottom:12px;background:#eaf4ee;border:1px solid #bfe0cd;border-radius:12px;color:#1e6b2f;font-weight:700";
        banner.innerHTML=`✓ Rota merged — ${m.people} people, ${m.days} shift-days added. Now ${Object.keys(ATT.rota).length} people on file.`;
        out().insertBefore(banner, out().firstChild);
      }); e.target.value=""; };
    document.getElementById("att-run").onclick=()=>{ renderView(out()); };
    document.getElementById("att-csv").onclick=exportCSV;

    renderView(out());
  };

  // Dispatch the output area to the active view.
  function renderView(box){
    if(!box) return;
    if(ATT.view==="rota"){ renderRota(box); return; }
    if(ATT.allScans&&ATT.allScans.length){ analyse(); renderResults(box); }
    else box.innerHTML='<div style="padding:24px;text-align:center;color:#8296a8;background:#fff;border:1px solid #e4e9ef;border-radius:14px">Add a clock-log CSV above to start building the attendance history.</div>';
  }

  function renderResults(box){
    const R=ATT.results; if(!R||!box) return;
    const rows=sortedRows();
    const rmode=(ATT.range&&ATT.range.mode)||"all";
    const tiles=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:6px">
      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:13px 15px"><div style="font:800 24px Lato;color:#1a2b3a">${rows.length}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">Staff analysed</div></div>
      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:13px 15px"><div style="font:800 24px Lato;color:#b3261e">${R.totLateOcc}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">Late arrivals</div></div>
      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:13px 15px"><div style="font:800 24px Lato;color:#1a2b3a">${R.totLateHrs}h</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">Total time lost to lateness</div></div>
      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:13px 15px"><div style="font:800 24px Lato;color:#b3261e">${money(R.totCost)}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">Est. cost of lost time</div></div>
    </div>`;
    const sortBtn=(k,l)=>`<button onclick="window._attSort('${k}')" style="padding:5px 11px;border:1px solid ${ATT.sort===k?'#2B726A':'#d7dde4'};background:${ATT.sort===k?'#2B726A':'#fff'};color:${ATT.sort===k?'#fff':'#45586b'};border-radius:7px;font:700 11.5px Lato;cursor:pointer">${l}</button>`;
    const tr=r=>`<tr style="border-top:1px solid #eef1f4">
      <td style="padding:7px 9px;font-weight:700">${esc(r.name)}</td>
      <td style="padding:7px 9px;color:#5b6b7b">${esc(r.dept||'—')}</td>
      <td style="padding:7px 9px;text-align:center">${r.daysSched}</td>
      <td style="padding:7px 9px;text-align:center">${r.daysClocked}</td>
      <td style="padding:7px 9px;text-align:center;color:${r.noScan?'#9a3412':'#1f2a37'}">${r.noScan||0}</td>
      <td style="padding:7px 9px;text-align:center;font-weight:700;color:${r.timesLate?'#b3261e':'#1f2a37'}">${r.timesLate}</td>
      <td style="padding:7px 9px;text-align:center">${r.avgLate||'—'}</td>
      <td style="padding:7px 9px;text-align:center">${r.lostHrs}</td>
      <td style="padding:7px 9px;text-align:right">${r.rate?money(r.rate):'<span style="color:#9a3412" title="No hourly rate on this staff record">n/a</span>'}</td>
      <td style="padding:7px 9px;text-align:right;font-weight:700">${money(r.cost)}</td></tr>`;
    const worst=rows.slice().sort((a,b)=>b.timesLate-a.timesLate||b.totalLate-a.totalLate).filter(r=>r.timesLate>0).slice(0,5);
    const periodTxt = R.span.from ? `${fmtD(R.span.from)} – ${fmtD(R.span.to)}` : "no data in this range";
    box.innerHTML=`
      <div style="font-size:12.5px;color:#5b6b7b;margin-bottom:10px"><b>${RANGE_LABELS[rmode]||'Report'}</b> · ${periodTxt} · ${R.scans.toLocaleString("en-GB")} scans · grace ${ATT.grace} min · ${ATT.rotaLabel}</div>
      ${tiles}
      ${rows.length?'':`<div style="padding:22px;text-align:center;color:#8296a8;background:#fff;border:1px solid #e4e9ef;border-radius:14px;margin-top:12px">No matched staff in this period. ${R.span.from?'The rota may not cover these dates — upload the matching week\'s rota.':'Try a wider date range, or add clock data for these dates.'}</div>`}
      ${worst.length?`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04);margin:14px 0">
        <div style="font:800 14px Lato;color:#1a2b3a;margin-bottom:8px">⏰ Most often late</div>
        ${worst.map((r,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-top:${i?'1px solid #eef1f4':'none'}"><span style="font-weight:700">${esc(r.name)}</span><span style="font-size:12.5px;color:#b3261e;font-weight:700">${r.timesLate} late · ${r.totalLate} min total · avg ${r.avgLate} min</span></div>`).join('')}
      </div>`:''}
      ${rows.length?`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div style="font:800 14px Lato;color:#1a2b3a">By person</div>
          <div style="display:flex;gap:6px">Sort: ${sortBtn('cost','£ cost')}${sortBtn('late','most late')}${sortBtn('lost','time lost')}</div></div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead><tr style="text-align:center;color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px">
            <th style="padding:6px 9px;text-align:left">Name</th><th style="padding:6px 9px;text-align:left">Dept</th><th style="padding:6px 9px">Sched days</th><th style="padding:6px 9px">Clocked</th><th style="padding:6px 9px">No-scan</th><th style="padding:6px 9px">Times late</th><th style="padding:6px 9px">Avg late (m)</th><th style="padding:6px 9px">Lost (h)</th><th style="padding:6px 9px;text-align:right">Rate</th><th style="padding:6px 9px;text-align:right">Est. cost</th></tr></thead>
          <tbody>${rows.map(tr).join('')}</tbody>
        </table></div>
        <div style="font-size:11px;color:#8296a8;margin-top:9px;line-height:1.6">
          <b>Time lost</b> = minutes late beyond the ${ATT.grace}-min grace. <b>No-scan</b> = scheduled days with no clock record (often a missed fingerprint scan rather than a true absence) — flagged, not costed. Early finishes aren't counted because the device's clock-out scans are patchy and night shifts cross midnight, which would distort them. ${R.noRate?('<b>'+R.noRate+'</b> people have no hourly rate on their staff record, so their cost shows n/a — add the rate in Staff Profiles. '):''}Cost of lateness = time lost × hourly rate.
        </div>
      </div>`:''}`;
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  window._attSort=function(k){ ATT.sort=k; const box=document.getElementById("att-out"); if(box) renderResults(box); };
  window._attRange=function(mode){ ATT.range.mode=mode; attSave(); const v=document.getElementById("view"); if(v && typeof renderAttendance==="function") renderAttendance(v); };
  window._attCustom=function(){ const f=document.getElementById("att-from"), t=document.getElementById("att-to");
    ATT.range.mode="custom"; ATT.range.from=f&&f.value||null; ATT.range.to=t&&t.value||null; attSave();
    renderView(document.getElementById("att-out")); };
  window._attClear=function(){ if(!confirm("Clear all stored clock scans? The rota and settings are kept. This cannot be undone.")) return;
    ATT.allScans=[]; ATT.clockLabel=""; ATT.results=null; attSave();
    const v=document.getElementById("view"); if(v) renderAttendance(v); };
  window._attView=function(mode){ ATT.view=mode; attSave(); const v=document.getElementById("view"); if(v) renderAttendance(v); };

  // ---------- rota analysis (staffing pattern by day of week) ----------
  function fmtTime(m){ if(m==null) return "—"; m=((Math.round(m)%1440)+1440)%1440; return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }
  function analyseRota(){
    const rb=rangeBounds(); const rota=ATT.rota||{};
    const WD=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const wdIdx=d=>{ const g=new Date(d+"T12:00").getDay(); return (g+6)%7; };
    const deptOf={}; Object.keys(rota).forEach(p=>{ const st=matchStaff(p); deptOf[p]=(st&&st.dept)||"unassigned"; });
    const dateMap={}; const activePeople=new Set(); const depts=new Set();
    Object.keys(rota).forEach(p=>{ Object.keys(rota[p]).forEach(d=>{
      if(rb.from&&d<rb.from) return; if(rb.to&&d>rb.to) return;
      const sh=rota[p][d]; if(!sh) return;
      activePeople.add(p); const de=deptOf[p]; depts.add(de);
      const dm=dateMap[d]||(dateMap[d]={count:0,hours:0,starts:[],dept:{}});
      dm.count++; dm.hours+=(sh[1]-sh[0])/60; dm.starts.push(sh[0]); dm.dept[de]=(dm.dept[de]||0)+1;
    }); });
    const dates=Object.keys(dateMap).sort(); const totalPeople=activePeople.size;
    const rowsWD=WD.map((lab,wi)=>{
      const dd=dates.filter(d=>wdIdx(d)===wi); const n=dd.length;
      let work=0,hours=0,startSum=0,startN=0; const deptSum={};
      dd.forEach(d=>{ const dm=dateMap[d]; work+=dm.count; hours+=dm.hours; dm.starts.forEach(s=>{startSum+=s;startN++;}); Object.keys(dm.dept).forEach(k=>deptSum[k]=(deptSum[k]||0)+dm.dept[k]); });
      const avgWork=n?work/n:0; const deptAvg={}; Object.keys(deptSum).forEach(k=>deptAvg[k]=n?deptSum[k]/n:0);
      return { wd:lab, weeks:n, avgWork:Math.round(avgWork*10)/10, avgOff:Math.round(Math.max(0,totalPeople-avgWork)*10)/10, avgHours:n?Math.round(hours/n):0, avgStart:startN?Math.round(startSum/startN):null, deptAvg };
    });
    return { rowsWD, totalPeople, depts:[...depts].sort(), from:dates[0]||null, to:dates[dates.length-1]||null, daysAnalysed:dates.length };
  }
  function renderRota(box){
    if(!box) return;
    const rmode=(ATT.range&&ATT.range.mode)||"all";
    const A=analyseRota();
    if(!A.totalPeople){ box.innerHTML='<div style="padding:24px;text-align:center;color:#8296a8;background:#fff;border:1px solid #e4e9ef;border-radius:14px">No rota data for this period. Upload a rota (.xlsx/.csv) above, or widen the date range.</div>'; return; }
    const worked=A.rowsWD.filter(r=>r.weeks>0);
    const busiest=worked.slice().sort((a,b)=>b.avgWork-a.avgWork)[0];
    const quietest=worked.slice().sort((a,b)=>a.avgWork-b.avgWork)[0];
    const maxWork=Math.max(1,...worked.map(r=>r.avgWork));
    const tile=(val,lab,col)=>`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:13px 15px"><div style="font:800 24px Lato;color:${col||'#1a2b3a'}">${val}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${lab}</div></div>`;
    const tiles=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:6px">
      ${tile(A.totalPeople,'People on rota')}${tile(busiest?busiest.wd:'—','Busiest day')}${tile(quietest?quietest.wd:'—','Quietest day','#b3261e')}${tile(A.daysAnalysed,'Days analysed')}</div>`;
    const bar=v=>{ const pct=Math.round(v/maxWork*100); return `<div style="background:#eef1f4;border-radius:5px;height:9px;min-width:60px"><div style="width:${pct}%;height:100%;border-radius:5px;background:${quietest&&v<=quietest.avgWork+0.001?'#e07a5f':'#2B726A'}"></div></div>`; };
    const wdTbl=`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;margin:14px 0">
      <div style="font:800 14px Lato;color:#1a2b3a;margin-bottom:10px">By day of week</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px"><th style="padding:6px 9px;text-align:left">Day</th><th style="padding:6px 9px;text-align:center">Avg on</th><th style="padding:6px 9px;text-align:center">Avg off</th><th style="padding:6px 9px;text-align:center">Avg hours</th><th style="padding:6px 9px;text-align:center">Avg start</th><th style="padding:6px 9px;width:34%">Coverage</th></tr></thead>
        <tbody>${A.rowsWD.map(r=>`<tr style="border-top:1px solid #eef1f4"><td style="padding:7px 9px;font-weight:700">${r.wd}</td><td style="padding:7px 9px;text-align:center;font-weight:700">${r.weeks?r.avgWork:'—'}</td><td style="padding:7px 9px;text-align:center;color:#9a3412">${r.weeks?r.avgOff:'—'}</td><td style="padding:7px 9px;text-align:center">${r.weeks?r.avgHours:'—'}</td><td style="padding:7px 9px;text-align:center">${fmtTime(r.avgStart)}</td><td style="padding:7px 9px">${r.weeks?bar(r.avgWork):''}</td></tr>`).join('')}</tbody>
      </table></div>
      <div style="font-size:11px;color:#8296a8;margin-top:9px">“Avg on” is the average staff scheduled that weekday across the period; “Avg off” is the rest of the ${A.totalPeople} people on the rota. Red bars mark the quietest day.</div></div>`;
    let gridMax=0; A.depts.forEach(de=>A.rowsWD.forEach(r=>{ gridMax=Math.max(gridMax, r.deptAvg[de]||0); }));
    const heat=v=>{ if(!v) return '#f7f9fb'; const p=Math.min(1,v/(gridMax||1)); const r=Math.round(224-(224-43)*p), g=Math.round(231-(231-114)*p), b=Math.round(239-(239-106)*p); return `rgb(${r},${g},${b})`; };
    const deptGrid=A.depts.length?`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px">
      <div style="font:800 14px Lato;color:#1a2b3a;margin-bottom:10px">Cover by department &amp; day <span style="font-weight:400;color:#8296a8;font-size:11.5px">(avg staff on)</span></div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="color:#6b7280;font-size:10.5px;text-transform:uppercase"><th style="padding:6px 9px;text-align:left">Department</th>${A.rowsWD.map(r=>`<th style="padding:6px 6px;text-align:center">${r.wd}</th>`).join('')}</tr></thead>
        <tbody>${A.depts.map(de=>`<tr style="border-top:1px solid #eef1f4"><td style="padding:6px 9px;font-weight:700;text-transform:capitalize">${esc(de)}</td>${A.rowsWD.map(r=>{const v=Math.round((r.deptAvg[de]||0)*10)/10;return `<td style="padding:6px 6px;text-align:center;background:${heat(v)};color:${v/(gridMax||1)>0.55?'#fff':'#1f2a37'};font-weight:${v?'700':'400'}">${v||'·'}</td>`;}).join('')}</tr>`).join('')}</tbody>
      </table></div></div>`:'';
    const insight=(quietest&&busiest&&quietest.wd!==busiest.wd)?`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:11px 14px;margin:14px 0;font-size:12.5px;color:#9a3412"><b>${quietest.wd}</b> is the quietest day (avg ${quietest.avgWork} on) and <b>${busiest.wd}</b> the busiest (avg ${busiest.avgWork}). If cover is tight on the busy days, moving a day off from a quiet day could even it out.</div>`:'';
    box.innerHTML=`<div style="font-size:12.5px;color:#5b6b7b;margin-bottom:10px"><b>${RANGE_LABELS[rmode]||'Rota'}</b> · ${fmtD(A.from)} – ${fmtD(A.to)} · ${A.totalPeople} people · ${ATT.rotaLabel}</div>${tiles}${insight}${wdTbl}${deptGrid}`;
  }

  function exportCSV(){
    if(ATT.view==="rota"){
      const A=analyseRota(); if(!A.totalPeople){ alert("No rota data for this period."); return; }
      const esc=s=>`"${String(s==null?'':s).replace(/"/g,'""')}"`;
      const head=["Day","Avg staff on","Avg off","Avg hours","Avg start",...A.depts];
      const lines=[head.join(",")];
      A.rowsWD.forEach(r=>lines.push([r.wd,r.weeks?r.avgWork:'',r.weeks?r.avgOff:'',r.weeks?r.avgHours:'',fmtTime(r.avgStart),...A.depts.map(de=>Math.round((r.deptAvg[de]||0)*10)/10)].join(",")));
      const blob=new Blob([lines.join("\n")],{type:"text/csv"}); const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download="rota-analysis-"+(A.from||"all")+"_to_"+(A.to||"")+".csv";
      document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); return;
    }
    const R=ATT.results; if(!R||!R.rows||!R.rows.length){ alert("No data for this period."); return; }
    const esc=s=>`"${String(s==null?'':s).replace(/"/g,'""')}"`;
    const head=["Name","Department","Scheduled days","Clocked days","No-scan days","Times late","Avg late (min)","Total late (min)","Time lost (hrs)","Hourly rate","Est. cost"];
    const lines=[head.join(",")];
    sortedRows().forEach(r=>lines.push([esc(r.name),esc(r.dept),r.daysSched,r.daysClocked,r.noScan,r.timesLate,r.avgLate,r.totalLate,r.lostHrs,r.rate,r.cost].join(",")));
    const blob=new Blob([lines.join("\n")],{type:"text/csv"}); const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download="attendance-"+(R.span.from||"all")+"_to_"+(R.span.to||"")+".csv";
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  }
})();
