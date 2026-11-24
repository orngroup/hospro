/* Floating ARIA panel — v39.24
   A global "Ask ARIA" button fixed to the bottom-right of the dashboard.
   Clicking opens a slide-in panel from the right with a question input and
   the current Q+A displayed prominently at the top (not buried in history).
   Works from any tab — context-aware (knows which tab the user is on).
   Reuses the existing hosrevAgent endpoint. Self-contained — nothing else
   in the dashboard reads from or writes to this module's state. */
(function () {
  'use strict';

  var AGENT_ENDPOINT = 'https://europe-west2-brandonhall-7bdef.cloudfunctions.net/hosrevAgent';
  var AI_TOKEN_KEY = 'hosbusiness_gl_token';
  var HIST_KEY = 'floating_aria_history_v1';
  var INFLIGHT = false;

  function aiTok() {
    try { return localStorage.getItem(AI_TOKEN_KEY) || sessionStorage.getItem(AI_TOKEN_KEY); } catch (e) { return null; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mdLite(md) {
    if (!md) return '';
    var out = String(md).replace(/\r\n/g, '\n');
    out = out.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    out = out.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/^# (.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    out = out.replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
    out = out.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    var lines = out.split('\n'), body = '', bullets = [];
    function flushBul() { if (bullets.length) { body += '<ul>' + bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>'; bullets = []; } }
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (/^[\-\*]\s+/.test(L)) { bullets.push(L.replace(/^[\-\*]\s+/, '')); }
      else if (/^\d+\.\s+/.test(L)) { bullets.push(L.replace(/^\d+\.\s+/, '')); }
      else { flushBul(); if (L.trim()) body += '<p>' + L + '</p>'; }
    }
    flushBul();
    return body;
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { return []; }
  }
  function saveHistory(h) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-10))); } catch (e) {}
  }
  function activeTab() {
    /* Infer the current tab from which pf-* div is visible, so ARIA has context. */
    var tabs = document.querySelectorAll('[id^="pf-"],[id="explore"],[id="bar"],[id="rooms"]');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (t.offsetParent !== null && t.getBoundingClientRect().height > 0) {
        return t.id;
      }
    }
    return 'pf-home';
  }
  function contextFor(tabId) {
    var map = {
      'pf-home': 'Business Today — overall trading overview',
      'pf-forecast': 'Forecast — next 6 months on the books',
      'pf-rev': 'Revenue Management — 365-night rate recommendations',
      'pf-fb': 'Food & Beverage — sales by outlet and meal',
      'pf-demand': 'Channels & rates — booking sources and rate plans',
      'pf-comp': 'Comp Set — competitor rates and estimated occupancy',
      'pf-cnb': 'Conference & Events — weddings, meetings, private events',
      'pf-trends': 'Trends — ADR, RevPAR, revenue over time',
      'pf-profit': 'Profitability — revenue, costs and profit',
      'pf-labour': 'Labour — payroll by department',
      'pf-stock': 'Purchased vs consumed',
      'bar': 'Bar & keg prices',
      'rooms': 'Rooms & linen'
    };
    return map[tabId] || 'Brandon Hall dashboard';
  }

  function injectStyles() {
    if (document.getElementById('floating-aria-css')) return;
    var s = document.createElement('style');
    s.id = 'floating-aria-css';
    s.textContent = [
      '.fa-btn{position:fixed;bottom:22px;right:22px;z-index:9998;background:linear-gradient(135deg,#1a2238 0%,#2d3b5c 100%);color:#fff;border:none;border-radius:28px;padding:14px 22px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.25),0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s}',
      '.fa-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,0.3),0 4px 10px rgba(0,0,0,0.2)}',
      '.fa-btn-ic{font-size:18px}',
      '.fa-overlay{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:100vw;z-index:9999;background:#fff;box-shadow:-8px 0 30px rgba(0,0,0,0.18);display:flex;flex-direction:column;transform:translateX(110%);transition:transform .25s ease-out;font-family:inherit}',
      '.fa-overlay.open{transform:translateX(0)}',
      '.fa-head{padding:14px 18px;border-bottom:1px solid #e3e8ee;background:linear-gradient(135deg,#1a2238 0%,#2d3b5c 100%);color:#fff;display:flex;align-items:center;justify-content:space-between}',
      '.fa-head-l{display:flex;flex-direction:column;gap:2px}',
      '.fa-head-t{font-size:15px;font-weight:700;letter-spacing:.2px}',
      '.fa-head-c{font-size:11px;opacity:.75;letter-spacing:.3px;text-transform:uppercase}',
      '.fa-head-r{display:flex;gap:8px}',
      '.fa-head-r button{background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:14px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:inherit}',
      '.fa-head-r button:hover{background:rgba(255,255,255,0.28)}',
      '.fa-body{flex:1;overflow-y:auto;padding:16px 18px;background:#fafbfc}',
      '.fa-welcome{padding:14px;background:#fff;border:1px dashed #d0d7de;border-radius:10px;color:#52647a;font-size:13px;line-height:1.5}',
      '.fa-welcome b{color:#1a2238}',
      '.fa-welcome ul{margin:8px 0 0;padding-left:20px}',
      '.fa-welcome li{margin:4px 0}',
      '.fa-turn{background:#fff;border:1px solid #e3e8ee;border-radius:10px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}',
      '.fa-q{font-weight:600;color:#1a2238;font-size:13.5px;margin:0 0 8px;line-height:1.4}',
      '.fa-q::before{content:"\\201C";color:#4a6fa5;font-weight:400;margin-right:4px}',
      '.fa-a{font-size:13px;line-height:1.55;color:#2a3144}',
      '.fa-a h3{font-size:13.5px;margin:10px 0 6px;color:#1a2238}',
      '.fa-a p{margin:6px 0}',
      '.fa-a ul{margin:6px 0;padding-left:20px}',
      '.fa-a li{margin:3px 0}',
      '.fa-a a{color:#4a6fa5}',
      '.fa-a b{color:#1a2238}',
      '.fa-pending{opacity:.7;font-style:italic;color:#7b8494}',
      '.fa-pending .fa-a::before{content:"ARIA is thinking…";display:block;margin-bottom:6px;color:#b26a00;font-weight:600;font-style:normal}',
      '.fa-sources{margin-top:8px;padding-top:8px;border-top:1px solid #eef0f3;font-size:11px;color:#7b8494}',
      '.fa-sources a{color:#4a6fa5;margin-right:8px}',
      '.fa-input-wrap{padding:14px 16px;border-top:1px solid #e3e8ee;background:#fff}',
      '.fa-input{display:flex;gap:8px}',
      '.fa-input textarea{flex:1;border:1px solid #c8d3dd;border-radius:8px;padding:10px 12px;font-family:inherit;font-size:13px;resize:none;min-height:44px;max-height:120px;line-height:1.4}',
      '.fa-input textarea:focus{outline:none;border-color:#4a6fa5;box-shadow:0 0 0 2px rgba(74,111,165,0.12)}',
      '.fa-ask{background:#1a2238;color:#fff;border:none;border-radius:8px;padding:0 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}',
      '.fa-ask:hover:not(:disabled){background:#2d3b5c}',
      '.fa-ask:disabled{opacity:.5;cursor:not-allowed}',
      '.fa-hint{margin:8px 0 0;font-size:11px;color:#7b8494}',
      '@media (max-width:640px){.fa-overlay{width:100vw}.fa-btn{padding:12px 18px;font-size:13px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function renderPanel() {
    var panel = document.getElementById('fa-overlay');
    if (!panel) return;
    var body = panel.querySelector('.fa-body');
    var tabId = activeTab();
    var ctx = contextFor(tabId);

    /* Update context chip */
    var chip = panel.querySelector('.fa-head-c');
    if (chip) chip.textContent = 'Context · ' + ctx;

    var hist = getHistory();
    if (!hist.length && !INFLIGHT) {
      body.innerHTML = '<div class="fa-welcome"><b>Ask ARIA anything about Brandon Hall.</b>' +
        '<p style="margin:6px 0 4px">ARIA knows your current context (<i>' + esc(ctx) + '</i>) and has access to live Google Search. Try:</p>' +
        '<ul>' +
          '<li>"What rate should I push next Friday night?"</li>' +
          '<li>"Is our comp set tightening up for December?"</li>' +
          '<li>"What events are happening in Coventry next weekend?"</li>' +
          '<li>"Should I drop the exec supplement next Tue-Thu?"</li>' +
        '</ul></div>';
      return;
    }
    /* Newest turn first — so you see the latest answer immediately, not at the bottom. */
    var reversed = hist.slice().reverse();
    body.innerHTML = reversed.map(function (t) {
      var cls = t.pending ? 'fa-turn fa-pending' : 'fa-turn';
      var sources = (t.sources || []).map(function (s) {
        return '<a href="' + esc(s.uri || s.url) + '" target="_blank" rel="noopener">' + esc(s.title || s.uri || s.url) + '</a>';
      }).join('');
      return '<div class="' + cls + '">' +
        '<p class="fa-q">' + esc(t.question) + '</p>' +
        '<div class="fa-a">' + (t.answer ? mdLite(t.answer) : '<p>…</p>') + '</div>' +
        (sources ? '<div class="fa-sources">' + sources + '</div>' : '') +
      '</div>';
    }).join('');
    body.scrollTop = 0;
  }

  function ask(question) {
    if (!question || !question.trim() || INFLIGHT) return;
    var tok = aiTok();
    if (!tok) {
      alert('Please sign in to use ARIA.');
      return;
    }
    INFLIGHT = true;
    var hist = getHistory();
    hist.push({ ts: Date.now(), question: question, answer: '', sources: [], pending: true, context: contextFor(activeTab()) });
    saveHistory(hist);
    renderPanel();
    var btn = document.querySelector('.fa-ask'); if (btn) btn.disabled = true;

    var payload = {
      question: '[Context: user is viewing ' + contextFor(activeTab()) + '] ' + question,
      snapshot: { hotel: 'Brandon Hall Hotel & Spa', context: contextFor(activeTab()) },
      ground: true
    };

    fetch(AGENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        INFLIGHT = false;
        if (btn) btn.disabled = false;
        var h = getHistory();
        var last = h[h.length - 1];
        if (last && last.pending) {
          if (j && j.ok) {
            last.answer = j.answer || '';
            last.sources = j.sources || [];
          } else {
            last.answer = 'Sorry — ARIA could not answer. ' + ((j && j.error) || '');
          }
          last.pending = false;
        }
        saveHistory(h);
        renderPanel();
      }).catch(function (e) {
        INFLIGHT = false;
        if (btn) btn.disabled = false;
        var h = getHistory();
        var last = h[h.length - 1];
        if (last && last.pending) {
          last.answer = 'Network error: ' + (e && e.message || e);
          last.pending = false;
        }
        saveHistory(h);
        renderPanel();
      });
  }

  function clearHistory() {
    try { localStorage.removeItem(HIST_KEY); } catch (e) {}
    renderPanel();
  }

  function openPanel() {
    var p = document.getElementById('fa-overlay');
    if (!p) return;
    p.classList.add('open');
    renderPanel();
    setTimeout(function () {
      var ta = p.querySelector('textarea'); if (ta) ta.focus();
    }, 260);
  }
  function closePanel() {
    var p = document.getElementById('fa-overlay');
    if (p) p.classList.remove('open');
  }

  function build() {
    if (document.getElementById('fa-btn')) return;
    /* Don't render on sign-in screen */
    if (document.body.classList.contains('locked')) { setTimeout(build, 800); return; }
    injectStyles();

    var btn = document.createElement('button');
    btn.id = 'fa-btn';
    btn.className = 'fa-btn';
    btn.title = 'Ask ARIA — floating panel (works from any tab)';
    btn.innerHTML = '<span class="fa-btn-ic" style="font-size:16px">🎩</span> Ask ARIA';
    btn.onclick = openPanel;
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.id = 'fa-overlay';
    panel.className = 'fa-overlay';
    panel.innerHTML =
      '<div class="fa-head">' +
        '<div class="fa-head-l">' +
          '<div class="fa-head-t">🎩 ARIA</div>' +
          '<div class="fa-head-c">Context · Brandon Hall dashboard</div>' +
        '</div>' +
        '<div class="fa-head-r">' +
          '<button class="fa-clear" title="Clear history">↺ Clear</button>' +
          '<button class="fa-close" title="Close panel">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="fa-body"></div>' +
      '<div class="fa-input-wrap">' +
        '<div class="fa-input">' +
          '<textarea placeholder="Ask ARIA anything…" rows="2"></textarea>' +
          '<button class="fa-ask">Ask →</button>' +
        '</div>' +
        '<p class="fa-hint">Enter to send · Shift+Enter for newline · newest answer shows at top</p>' +
      '</div>';
    document.body.appendChild(panel);

    panel.querySelector('.fa-close').onclick = closePanel;
    panel.querySelector('.fa-clear').onclick = clearHistory;
    var ta = panel.querySelector('textarea');
    var send = panel.querySelector('.fa-ask');
    send.onclick = function () {
      var q = ta.value.trim();
      if (!q) return;
      ta.value = '';
      ask(q);
    };
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send.click();
      }
    });
    /* ESC closes */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });

    renderPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 400); });
  } else {
    setTimeout(build, 400);
  }
  /* If user signs in later, the button will appear once body loses .locked */
  setInterval(function () {
    if (!document.getElementById('fa-btn') && !document.body.classList.contains('locked')) build();
  }, 1500);

  /* Expose for debugging */
  window.FloatingARIA = { open: openPanel, close: closePanel, ask: ask, clear: clearHistory };
})();
