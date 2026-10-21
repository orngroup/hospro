/* ============================================================
   HosPEOPLE — ATTENDANCE (rota vs fingerprint clock log)
   ------------------------------------------------------------
   Compares the scheduled rota against the T&A device's clock
   in/out log to show lateness, time lost and the cost of it.
   Upload the weekly clock-log CSV (the T&A export); the rota
   comes from the bundled seed or a rota file you upload.
   ============================================================ */
(function(){
  const LS_KEY = "hp_attend_v1";
  const GRACE_DEFAULT = 5;
  const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

  const ATT = {
    rota: (typeof ATTEND_ROTA_SEED!=="undefined") ? JSON.parse(JSON.stringify(ATTEND_ROTA_SEED)) : {},
    rotaLabel: "Bundled rota (1–18 Oct 2026)",
    grace: GRACE_DEFAULT,
    clockRows: (typeof ATTEND_CLOCK_SEED!=="undefined") ? ATTEND_CLOCK_SEED : null,  // [{name, d, t, type}]
    clockLabel: (typeof ATTEND_CLOCK_LABEL!=="undefined") ? ATTEND_CLOCK_LABEL : "",
    results: null,
    sort: "cost"
  };
  function attLoad(){ try{ const s=JSON.parse(localStorage.getItem(LS_KEY)||"null");
    if(s){ if(s.rota) ATT.rota=s.rota; if(s.rotaLabel) ATT.rotaLabel=s.rotaLabel;
      if(s.clockRows) ATT.clockRows=s.clockRows; if(s.clockLabel) ATT.clockLabel=s.clockLabel;
      if(s.grace) ATT.grace=s.grace; } }catch(e){} }
  function attSave(){ try{ localStorage.setItem(LS_KEY, JSON.stringify({ rota:ATT.rota, rotaLabel:ATT.rotaLabel, clockRows:ATT.clockRows, clockLabel:ATT.clockLabel, grace:ATT.grace })); }catch(e){} }

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
    if(cands.length>1 && lk) cands=cands.filter(s=>norm(s.name).includes(lk)).concat(cands).slice(0,1).length?cands.filter(s=>norm(s.name).includes(lk)):cands;
    const s=cands[0];
    return s ? { rate:+s.hourlyRate||0, dept:(s.deptName||s.dept||""), name:s.name } : null;
  }

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
    const d=new Date(2026,mo,+m[1]); return d.toISOString().slice(0,10); }
  function parseShift(s){ if(s==null) return null; s=String(s).trim();
    if(!s || /^(off|holiday|hol|sick|in lieu|on call)$/i.test(s)) return null;
    const m=s.match(/(\d{1,2}):(\d{2})\s*[-:to ]+\s*(\d{1,2}):(\d{2})/); if(!m) return null;
    let a=(+m[1])*60+(+m[2]), b=(+m[3])*60+(+m[4]); if(b<a) b+=1440; return [a,b]; }
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

  // ---------- analysis ----------
  function analyse(){
    const grace=+ATT.grace||0;
    const rota=ATT.rota||{}, clock=ATT.clockRows||[];
    // index clock by name -> date -> scans
    const byName={}; clock.forEach(r=>{ (byName[r.name]=byName[r.name]||{}); (byName[r.name][r.d]=byName[r.name][r.d]||[]).push(r); });
    // rota index by firstKey
    const rotaByFirst={}; Object.keys(rota).forEach(rn=>{ (rotaByFirst[firstKey(rn)]=rotaByFirst[firstKey(rn)]||[]).push(rn); });
    const matchRota=cn=>{ const fk=firstKey(cn), lk=lastKey(cn); const cands=rotaByFirst[fk]||[];
      if(cands.length===1) return cands[0]; if(lk){ const x=cands.find(rn=>norm(rn).includes(lk)); if(x) return x; } return cands[0]||null; };
    // date span from clock
    let minD=null,maxD=null; clock.forEach(r=>{ if(!minD||r.d<minD)minD=r.d; if(!maxD||r.d>maxD)maxD=r.d; });
    const rows=[];
    Object.keys(byName).forEach(cn=>{
      if(isExcluded(cn)) return;                 // left out of the review
      const rn=matchRota(cn); if(!rn) return;
      const sched=rota[rn]; const st=matchStaff(cn)||matchStaff(rn)||{rate:0,dept:""};
      let daysSched=0,daysClocked=0,noScan=0,timesLate=0,totalLate=0,lost=0;
      Object.keys(sched).forEach(d=>{
        if(minD && (d<minD||d>maxD)) return;     // only days the clock file covers
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
    ATT.results={ rows, span:{from:minD,to:maxD},
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

  window.renderAttendance = function(v){
    attLoad();
    if(ATT.clockRows && ATT.clockRows.length && !ATT.results){ try{ analyse(); }catch(e){} }  // show the bundled data straight away
    const R=ATT.results;
    const tile=(val,lab,col,tip)=>`<div title="${tip||''}" style="background:#fff;border:1px solid #e4e9ef;border-radius:12px;padding:13px 15px;box-shadow:0 1px 2px rgba(0,0,0,.04)"><div style="font:800 24px Lato;color:${col}">${val}</div><div style="font-size:10.5px;color:#8296a8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${lab}</div></div>`;
    v.innerHTML = `
      <div class="page-head" style="margin-bottom:6px"><h2 style="margin:0;font:800 22px Lato;color:#1a2b3a">🕒 Attendance — rota vs clock log</h2>
        <p style="font-size:13px;color:#5b6b7b;max-width:62em">Compares the scheduled rota against the fingerprint (T&amp;A) clock in/out log — who's late, how often, the time lost and what it costs. Upload the weekly clock-log CSV; the rota is the bundled one unless you upload a new one.</p></div>

      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04);margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
        <div><label style="display:block;font:700 10.5px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Clock-log CSV (T&amp;A export)</label>
          <input type="file" id="att-clock" accept=".csv"><div style="font-size:11px;color:#8296a8;margin-top:3px">${ATT.clockLabel?('Loaded: '+ATT.clockLabel):'Not loaded yet'}</div></div>
        <div><label style="display:block;font:700 10.5px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Rota (optional — .xlsx/.csv)</label>
          <input type="file" id="att-rota" accept=".xlsx,.csv"><div style="font-size:11px;color:#8296a8;margin-top:3px">${ATT.rotaLabel||''} · ${Object.keys(ATT.rota||{}).length} people</div></div>
        <div><label style="display:block;font:700 10.5px Lato;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Grace (min)</label>
          <input type="number" id="att-grace" value="${ATT.grace}" min="0" max="30" style="width:70px;padding:8px;border:1px solid #d7dde4;border-radius:8px"></div>
        <button id="att-run" style="padding:10px 18px;border:none;background:#2B726A;color:#fff;border-radius:9px;font:800 13px Lato;cursor:pointer">Analyse</button>
        <button id="att-csv" style="padding:10px 14px;border:1px solid #2B726A;background:#fff;color:#2B726A;border-radius:9px;font:700 12.5px Lato;cursor:pointer">⬇ Export CSV</button>
      </div>

      <div id="att-out">${R?"":'<div style="padding:24px;text-align:center;color:#8296a8;background:#fff;border:1px solid #e4e9ef;border-radius:14px">Upload the clock-log CSV and press <b>Analyse</b> to see the attendance dashboard.</div>'}</div>`;

    const out=()=>document.getElementById("att-out");
    document.getElementById("att-grace").onchange=e=>{ ATT.grace=+e.target.value||0; };
    document.getElementById("att-clock").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
      const fr=new FileReader(); fr.onload=()=>{ try{ ATT.clockRows=parseClockCSV(fr.result); ATT.clockLabel=f.name+" ("+ATT.clockRows.length+" scans)"; attSave();
        out().innerHTML='<div style="padding:16px;background:#eaf4ee;border:1px solid #bfe0cd;border-radius:12px;color:#1e6b2f;font-weight:700">✓ Loaded '+ATT.clockRows.length+' clock scans. Press Analyse.</div>'; }
        catch(err){ out().innerHTML='<div style="padding:16px;background:#fdecea;border:1px solid #f3c0ba;border-radius:12px;color:#b3261e">⚠ '+err.message+'</div>'; } };
      fr.readAsText(f); };
    document.getElementById("att-rota").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
      readRotaFile(f,(err,rota)=>{ if(err){ out().innerHTML='<div style="padding:16px;background:#fdecea;border:1px solid #f3c0ba;border-radius:12px;color:#b3261e">⚠ '+err.message+'</div>'; return; }
        ATT.rota=rota; ATT.rotaLabel="Uploaded: "+f.name; attSave();
        out().innerHTML='<div style="padding:16px;background:#eaf4ee;border:1px solid #bfe0cd;border-radius:12px;color:#1e6b2f;font-weight:700">✓ Rota loaded — '+Object.keys(rota).length+' people. Press Analyse.</div>'; }); };
    document.getElementById("att-run").onclick=()=>{ if(!ATT.clockRows||!ATT.clockRows.length){ out().innerHTML='<div style="padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;color:#9a3412">Upload the clock-log CSV first.</div>'; return; } analyse(); renderResults(out()); };
    document.getElementById("att-csv").onclick=exportCSV;

    if(R) renderResults(out());
  };

  function renderResults(box){
    const R=ATT.results; if(!R||!box) return;
    const rows=sortedRows();
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
    box.innerHTML=`
      <div style="font-size:12.5px;color:#5b6b7b;margin-bottom:10px">Period from the clock file: <b>${fmtD(R.span.from)} – ${fmtD(R.span.to)}</b> · grace ${ATT.grace} min · ${ATT.rotaLabel}</div>
      ${tiles}
      ${worst.length?`<div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04);margin:14px 0">
        <div style="font:800 14px Lato;color:#1a2b3a;margin-bottom:8px">⏰ Most often late</div>
        ${worst.map((r,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-top:${i?'1px solid #eef1f4':'none'}"><span style="font-weight:700">${esc(r.name)}</span><span style="font-size:12.5px;color:#b3261e;font-weight:700">${r.timesLate} late · ${r.totalLate} min total · avg ${r.avgLate} min</span></div>`).join('')}
      </div>`:''}
      <div style="background:#fff;border:1px solid #e4e9ef;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div style="font:800 14px Lato;color:#1a2b3a">By person</div>
          <div style="display:flex;gap:6px">Sort: ${sortBtn('cost','£ cost')}${sortBtn('late','most late')}${sortBtn('lost','time lost')}</div></div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead><tr style="text-align:center;color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px">
            <th style="padding:6px 9px;text-align:left">Name</th><th style="padding:6px 9px;text-align:left">Dept</th><th style="padding:6px 9px">Sched days</th><th style="padding:6px 9px">Clocked</th><th style="padding:6px 9px">No-scan</th><th style="padding:6px 9px">Times late</th><th style="padding:6px 9px">Avg late (m)</th><th style="padding:6px 9px">Lost (h)</th><th style="padding:6px 9px;text-align:right">Rate</th><th style="padding:6px 9px;text-align:right">Est. cost</th></tr></thead>
          <tbody>${rows.map(tr).join('')||'<tr><td colspan="10" style="padding:14px;color:#8296a8">No matched staff.</td></tr>'}</tbody>
        </table></div>
        <div style="font-size:11px;color:#8296a8;margin-top:9px;line-height:1.6">
          <b>Time lost</b> = minutes late beyond the ${ATT.grace}-min grace. <b>No-scan</b> = scheduled days with no clock record (often a missed fingerprint scan rather than a true absence) — flagged, not costed. Early finishes aren't counted because the device's clock-out scans are patchy and night shifts cross midnight, which would distort them. ${R.noRate?('<b>'+R.noRate+'</b> people have no hourly rate on their staff record, so their cost shows n/a — add the rate in Staff Profiles. '):''}Cost of lateness = time lost × hourly rate.
        </div>
      </div>`;
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  window._attSort=function(k){ ATT.sort=k; const box=document.getElementById("att-out"); if(box) renderResults(box); };

  function exportCSV(){
    const R=ATT.results; if(!R){ alert("Run Analyse first."); return; }
    const esc=s=>`"${String(s==null?'':s).replace(/"/g,'""')}"`;
    const head=["Name","Department","Scheduled days","Clocked days","No-scan days","Times late","Avg late (min)","Total late (min)","Time lost (hrs)","Hourly rate","Est. cost"];
    const lines=[head.join(",")];
    sortedRows().forEach(r=>lines.push([esc(r.name),esc(r.dept),r.daysSched,r.daysClocked,r.noScan,r.timesLate,r.avgLate,r.totalLate,r.lostHrs,r.rate,r.cost].join(",")));
    const blob=new Blob([lines.join("\n")],{type:"text/csv"}); const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download="attendance-"+(R.span.from||"")+"_to_"+(R.span.to||"")+".csv";
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  }
})();
