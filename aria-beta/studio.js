/* ARIA Studio front end (v9): lays out ARIA's designs in the Brandon Hall house style, previews them in the chat and
   downloads them: PNG for social posts and stories (drawn on a canvas at full size), PDF for flyers, posters and menus
   (print to PDF at A5/A4), and email-safe HTML for Mailchimp newsletters. Photos come only from the HosPRO library
   on this same site, so nothing leaves the hotel's own pages. */
(function () {
  'use strict';
  const designs = {};
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Lato:wght@400;700&display=swap" rel="stylesheet">';
  const pal = s => {
    const c = s.brand && s.brand.colours || { navy: '#1A2B3A', gold: '#C78A3B', cream: '#F3E8D2', paper: '#FFFBF2' };
    if (s.style === 'light') return { bg: c.paper, ink: c.navy, accent: c.gold, band: c.cream, onBand: c.navy };
    if (s.style === 'festive') return { bg: '#1F3B2D', ink: '#FFFBF2', accent: '#D9A441', band: '#7A1F1F', onBand: '#FFFBF2' };
    return { bg: c.navy, ink: '#FFFBF2', accent: c.gold, band: c.cream, onBand: c.navy };
  };
  const logo = s => (s.brand && s.brand.logo) || 'https://brandon.hospro.co.uk/bh-logo.svg';

  /* ---------- full-size HTML for each kind ---------- */
  function docHtml(s, forPrint) {
    const k = s.kind, W = s.size.w, H = s.size.h, P = pal(s), u = W / 1080;
    const base = '<!doctype html><html><head><meta charset="utf-8">' + FONTS + '<style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:' + W + 'px;' + (H ? 'height:' + H + 'px;' : '') + 'background:' + P.bg + ';-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Lato,Arial,sans-serif;color:' + P.ink + '}h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600}' +
      (forPrint ? '@page{size:' + (k === 'flyer' ? 'A5' : 'A4') + ' portrait;margin:0}html,body{width:100%;height:100%}.pg{width:100%!important;height:100%!important}' : '') + '</style>';
    if (k === 'social_post' || k === 'story') {
      const tall = k === 'story';
      return base + '</head><body><div class="pg" style="position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden">' +
        (s.photo ? '<img src="' + e(s.photo) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">' : '') +
        '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,43,58,.15) 0%,rgba(26,43,58,.05) 35%,rgba(26,43,58,.88) ' + (tall ? '72%' : '78%') + ',' + P.bg + ' 100%)"></div>' +
        '<div style="position:absolute;top:' + 48 * u + 'px;left:' + 56 * u + 'px;background:rgba(255,251,242,.92);border-radius:' + 40 * u + 'px;padding:' + 14 * u + 'px ' + 26 * u + 'px"><img src="' + e(logo(s)) + '" style="height:' + 52 * u + 'px;display:block"></div>' +
        '<div style="position:absolute;left:' + 64 * u + 'px;right:' + 64 * u + 'px;bottom:' + (tall ? 220 : 72) * u + 'px;color:#FFFBF2">' +
        (s.subheadline ? '<div style="font:700 ' + 26 * u + 'px Lato;letter-spacing:.18em;text-transform:uppercase;color:' + P.accent + ';margin-bottom:' + 18 * u + 'px">' + e(s.subheadline) + '</div>' : '') +
        '<h1 style="font-size:' + (s.headline.length > 34 ? 78 : 96) * u + 'px;line-height:1.02;margin-bottom:' + 22 * u + 'px">' + e(s.headline) + '</h1>' +
        (s.body ? '<p style="font-size:' + 32 * u + 'px;line-height:1.4;max-width:92%;opacity:.95;margin-bottom:' + 22 * u + 'px">' + e(s.body) + '</p>' : '') +
        (s.details.length ? '<div style="font-size:' + 28 * u + 'px;line-height:1.5;margin-bottom:' + 26 * u + 'px">' + s.details.map(d => '<div>◆ ' + e(d) + '</div>').join('') + '</div>' : '') +
        (s.cta ? '<div style="display:inline-block;background:' + P.accent + ';color:#1A2B3A;font:700 ' + 28 * u + 'px Lato;padding:' + 16 * u + 'px ' + 30 * u + 'px;border-radius:' + 8 * u + 'px">' + e(s.cta) + '</div>' : '') +
        '</div></div></body></html>';
    }
    if (k === 'menu') {
      const m = s.menu || { courses: [] }, mu = W / 1240;
      return base + '</head><body><div class="pg" style="width:' + W + 'px;height:' + H + 'px;background:#FFFBF2;color:#1A2B3A;padding:' + 110 * mu + 'px ' + 140 * mu + 'px;display:flex;flex-direction:column;border:' + 22 * mu + 'px solid #F3E8D2">' +
        '<div style="text-align:center"><img src="' + e(logo(s)) + '" style="height:' + 110 * mu + 'px"><div style="font:700 ' + 18 * mu + 'px Lato;letter-spacing:.32em;color:#C78A3B;margin:' + 26 * mu + 'px 0 ' + 6 * mu + 'px">THE CLARENDON</div>' +
        '<h1 style="font-size:' + 92 * mu + 'px;line-height:1.05">' + e(m.title || s.headline) + '</h1>' + (m.subtitle || s.subheadline ? '<div style="font:italic 500 ' + 40 * mu + 'px \'Cormorant Garamond\';margin-top:' + 6 * mu + 'px">' + e(m.subtitle || s.subheadline) + '</div>' : '') +
        (m.price ? '<div style="font:700 ' + 24 * mu + 'px Lato;letter-spacing:.12em;color:#C78A3B;margin-top:' + 16 * mu + 'px">' + e(m.price) + '</div>' : '') + '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:' + (m.courses.length > 4 ? 18 : 40) * mu + 'px;margin-top:' + 30 * mu + 'px">' +
        m.courses.map(c => '<div style="text-align:center"><div style="font:700 ' + 22 * mu + 'px Lato;letter-spacing:.28em;text-transform:uppercase;color:#C78A3B;margin-bottom:' + 14 * mu + 'px">' + e(c.name) + '</div>' +
          (c.items || []).map(it => '<div style="margin:0 auto ' + 14 * mu + 'px;max-width:88%"><span style="font:600 ' + 36 * mu + 'px \'Cormorant Garamond\'">' + e(it.name) + '</span>' + (it.price ? '<span style="font:700 ' + 22 * mu + 'px Lato;color:#C78A3B;margin-left:' + 14 * mu + 'px">' + e(it.price) + '</span>' : '') +
            (it.desc ? '<div style="font:400 ' + 22 * mu + 'px Lato;color:#4a5866;margin-top:' + 3 * mu + 'px">' + e(it.desc) + '</div>' : '') + '</div>').join('') + '</div>').join('<div style="width:' + 80 * mu + 'px;height:2px;background:#C78A3B;margin:' + 8 * mu + 'px auto;opacity:.6"></div>') + '</div>' +
        '<div style="text-align:center;font:400 ' + 17 * mu + 'px Lato;color:#6b7785;margin-top:' + 24 * mu + 'px;line-height:1.5">' + e(m.footer || '') + '<br>Brandon Hall Hotel & Spa · Main Street, Brandon, Coventry CV8 3FW · 024 7710 2555 · brandonhallhotelandspa.com</div></div></body></html>';
    }
    if (k === 'brochure') {   /* v13: cover, inside pages, back cover; prints one A4 page each */
      const PH = s.size.pageH || 3508, bu = W / 1240, pages = s.pages || [];
      const pg = (inner, bg) => '<div class="bp" style="position:relative;width:' + W + 'px;height:' + PH + 'px;overflow:hidden;background:' + (bg || '#FFFBF2') + ';page-break-after:always;break-after:page">' + inner + '</div>';
      const head = '<!doctype html><html><head><meta charset="utf-8">' + FONTS + '<style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:' + W + 'px;background:#FFFBF2;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Lato,sans-serif;color:#1A2B3A}h1,h2{font-family:"Cormorant Garamond",serif;font-weight:600}' +
        (forPrint ? '@page{size:A4 portrait;margin:0}html,body{width:210mm}.bp{width:210mm!important;height:297mm!important;font-size:0}.bp *{font-size:revert}' : '') + '</style></head><body>';
      const cover = pg((s.photo ? '<img src="' + e(s.photo) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">' : '') +
        '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,43,58,.25),rgba(26,43,58,.1) 40%,rgba(26,43,58,.9) 80%)"></div>' +
        '<div style="position:absolute;top:' + 90 * bu + 'px;left:0;right:0;text-align:center"><span style="display:inline-block;background:rgba(255,251,242,.94);border-radius:' + 60 * bu + 'px;padding:' + 22 * bu + 'px ' + 44 * bu + 'px"><img src="' + e(logo(s)) + '" style="height:' + 100 * bu + 'px;display:block"></span></div>' +
        '<div style="position:absolute;left:' + 120 * bu + 'px;right:' + 120 * bu + 'px;bottom:' + 200 * bu + 'px;color:#FFFBF2;text-align:center">' +
        (s.subheadline ? '<div style="font:700 ' + 26 * bu + 'px Lato;letter-spacing:.3em;text-transform:uppercase;color:#C78A3B;margin-bottom:' + 24 * bu + 'px">' + e(s.subheadline) + '</div>' : '') +
        '<h1 style="font-size:' + 140 * bu + 'px;line-height:1">' + e(s.headline) + '</h1>' + (s.body ? '<p style="font-size:' + 32 * bu + 'px;line-height:1.5;margin-top:' + 30 * bu + 'px;opacity:.95">' + e(s.body) + '</p>' : '') + '</div>', '#1A2B3A');
      const inside = pages.map((p, i) => pg('<div style="height:46%;position:relative;overflow:hidden">' + (p.photo ? '<img src="' + e(p.photo) + '" style="width:100%;height:100%;object-fit:cover">' : '') + '</div>' +
        '<div style="padding:' + 90 * bu + 'px ' + 130 * bu + 'px">' + '<div style="font:700 ' + 20 * bu + 'px Lato;letter-spacing:.3em;color:#C78A3B;margin-bottom:' + 16 * bu + 'px">' + String(i + 1).padStart(2, '0') + '</div>' +
        '<h2 style="font-size:' + 92 * bu + 'px;line-height:1.05;margin-bottom:' + 24 * bu + 'px">' + e(p.title) + '</h2><div style="width:' + 90 * bu + 'px;height:3px;background:#C78A3B;margin-bottom:' + 34 * bu + 'px"></div>' +
        (p.text ? '<p style="font-size:' + 30 * bu + 'px;line-height:1.6;color:#2d3d4c;margin-bottom:' + 30 * bu + 'px;white-space:pre-line">' + e(p.text) + '</p>' : '') +
        (p.bullets && p.bullets.length ? '<div style="font-size:' + 28 * bu + 'px;line-height:1.7;columns:' + (p.bullets.length > 5 ? 2 : 1) + '">' + p.bullets.map(b => '<div style="break-inside:avoid">◆ ' + e(b) + '</div>').join('') + '</div>' : '') + '</div>' +
        '<div style="position:absolute;bottom:' + 60 * bu + 'px;left:' + 130 * bu + 'px;right:' + 130 * bu + 'px;display:flex;justify-content:space-between;font:400 ' + 18 * bu + 'px Lato;color:#8a95a1"><span>Brandon Hall Hotel & Spa</span><span>' + (i + 2) + '</span></div>')).join('');
      const back = pg('<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#FFFBF2;padding:' + 140 * bu + 'px">' +
        '<span style="display:inline-block;background:#FFFBF2;border-radius:' + 60 * bu + 'px;padding:' + 22 * bu + 'px ' + 44 * bu + 'px;margin-bottom:' + 70 * bu + 'px"><img src="' + e(logo(s)) + '" style="height:' + 100 * bu + 'px;display:block"></span>' +
        (s.cta ? '<div style="font:600 ' + 64 * bu + 'px \'Cormorant Garamond\';margin-bottom:' + 40 * bu + 'px">' + e(s.cta) + '</div>' : '') +
        '<div style="font:400 ' + 28 * bu + 'px Lato;line-height:1.8;opacity:.9">Main Street, Brandon, Coventry CV8 3FW<br>024 7710 2555 · events@brandonhallhotelandspa.com<br>brandonhallhotelandspa.com</div></div>', '#1A2B3A');
      return head + cover + inside + back + '</body></html>';
    }
    if (k === 'flyer' || k === 'poster') {
      const fu = W / 1240;
      return base + '</head><body><div class="pg" style="width:' + W + 'px;height:' + H + 'px;background:#FFFBF2;color:#1A2B3A;display:flex;flex-direction:column">' +
        '<div style="position:relative;height:52%;overflow:hidden">' + (s.photo ? '<img src="' + e(s.photo) + '" style="width:100%;height:100%;object-fit:cover">' : '') +
        '<div style="position:absolute;inset:auto 0 0 0;height:30%;background:linear-gradient(180deg,rgba(255,251,242,0),#FFFBF2)"></div>' +
        '<div style="position:absolute;top:' + 44 * fu + 'px;left:' + 56 * fu + 'px;background:rgba(255,251,242,.94);border-radius:' + 40 * fu + 'px;padding:' + 14 * fu + 'px ' + 28 * fu + 'px"><img src="' + e(logo(s)) + '" style="height:' + 60 * fu + 'px;display:block"></div></div>' +
        '<div style="flex:1;padding:' + 10 * fu + 'px ' + 110 * fu + 'px ' + 70 * fu + 'px;display:flex;flex-direction:column">' +
        (s.subheadline ? '<div style="font:700 ' + 22 * fu + 'px Lato;letter-spacing:.24em;text-transform:uppercase;color:#C78A3B">' + e(s.subheadline) + '</div>' : '') +
        '<h1 style="font-size:' + (s.headline.length > 30 ? 84 : 104) * fu + 'px;line-height:1.02;margin:' + 14 * fu + 'px 0 ' + 20 * fu + 'px">' + e(s.headline) + '</h1>' +
        '<div style="width:' + 90 * fu + 'px;height:3px;background:#C78A3B;margin-bottom:' + 26 * fu + 'px"></div>' +
        (s.body ? '<p style="font-size:' + 30 * fu + 'px;line-height:1.5;color:#2d3d4c;max-width:95%">' + e(s.body) + '</p>' : '') +
        (s.details.length ? '<div style="margin-top:' + 26 * fu + 'px;font-size:' + 28 * fu + 'px;line-height:1.6">' + s.details.map(d => '<div><span style="color:#C78A3B">◆</span> ' + e(d) + '</div>').join('') + '</div>' : '') +
        '<div style="flex:1"></div>' + (s.cta ? '<div style="background:#1A2B3A;color:#FFFBF2;padding:' + 26 * fu + 'px ' + 34 * fu + 'px;border-radius:' + 10 * fu + 'px;font:700 ' + 30 * fu + 'px Lato;display:flex;justify-content:space-between;align-items:center"><span>' + e(s.cta) + '</span><span style="color:#C78A3B;font:600 ' + 26 * fu + 'px \'Cormorant Garamond\'">Brandon Hall</span></div>' : '') +
        '<div style="font:400 ' + 18 * fu + 'px Lato;color:#6b7785;margin-top:' + 18 * fu + 'px;text-align:center">Brandon Hall Hotel & Spa · Main Street, Brandon, Coventry CV8 3FW · 024 7710 2555 · brandonhallhotelandspa.com</div></div></div></body></html>';
    }
    /* newsletter: email-safe table layout for a Mailchimp "Code" block */
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#F3E8D2">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E8D2"><tr><td align="center" style="padding:24px 12px">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#FFFBF2;font-family:Lato,Arial,sans-serif;color:#1A2B3A">' +
      '<tr><td align="center" style="background:#1A2B3A;padding:22px"><img src="' + e(logo(s)) + '" alt="Brandon Hall Hotel &amp; Spa" height="48" style="display:block;height:48px;background:#FFFBF2;border-radius:24px;padding:6px 14px"></td></tr>' +
      (s.photo ? '<tr><td><img src="' + e(s.photo) + '" width="600" alt="" style="display:block;width:100%;height:auto"></td></tr>' : '') +
      '<tr><td style="padding:30px 40px 8px">' + (s.subheadline ? '<div style="font:700 12px Lato,Arial;letter-spacing:3px;text-transform:uppercase;color:#C78A3B">' + e(s.subheadline) + '</div>' : '') +
      '<h1 style="font-family:Georgia,\'Times New Roman\',serif;font-weight:normal;font-size:34px;line-height:1.15;margin:10px 0 14px;color:#1A2B3A">' + e(s.headline) + '</h1>' +
      '<p style="font-size:16px;line-height:1.6;margin:0 0 14px">Dear *|FNAME|*,</p><p style="font-size:16px;line-height:1.6;margin:0 0 16px">' + e(s.body).replace(/\n/g, '<br>') + '</p>' +
      (s.details.length ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">' + s.details.map(d => '<tr><td style="color:#C78A3B;padding:3px 10px 3px 0;vertical-align:top">&#9670;</td><td style="font-size:15px;line-height:1.5;padding:3px 0">' + e(d) + '</td></tr>').join('') + '</table>' : '') + '</td></tr>' +
      (s.cta ? '<tr><td align="center" style="padding:6px 40px 34px"><a href="https://www.brandonhallhotelandspa.com" style="display:inline-block;background:#C78A3B;color:#1A2B3A;font:700 15px Lato,Arial;text-decoration:none;padding:14px 28px;border-radius:6px">' + e(s.cta) + '</a></td></tr>' : '') +
      '<tr><td align="center" style="background:#1A2B3A;color:#cfd8e2;font:12px Lato,Arial;line-height:1.6;padding:20px 30px">Brandon Hall Hotel &amp; Spa · Main Street, Brandon, Coventry CV8 3FW · 024 7710 2555<br>You are receiving this because you opted in at Brandon Hall. <a href="*|UNSUB|*" style="color:#C78A3B">Unsubscribe</a> · <a href="*|UPDATE_PROFILE|*" style="color:#C78A3B">Update preferences</a></td></tr>' +
      '</table></td></tr></table></body></html>';
  }

  /* ---------- chat card ---------- */
  function card(v) {
    const s = v.spec; if (!s || !s.id) return '';
    designs[s.id] = s;
    const out = s.size.out;
    const btns = (out === 'png' ? '<button data-st="png" data-id="' + e(s.id) + '">⬇ Download image</button>' : '') + (out === 'pdf' ? '<button data-st="pdf" data-id="' + e(s.id) + '">⬇ PDF (print)</button>' : '') +
      (out === 'html' ? '<button data-st="html" data-id="' + e(s.id) + '">⧉ Copy HTML for Mailchimp</button>' : '') + (s.caption ? '<button data-st="cap" data-id="' + e(s.id) + '">⧉ Copy caption</button>' : '') + '<button data-st="open" data-id="' + e(s.id) + '">⤢ Full size</button>';
    return '<div class="vw st"><h3>' + e(v.title || 'Design') + '</h3><div class="st-prev" data-w="' + s.size.w + '" data-h="' + (s.size.h || 1400) + '"><iframe sandbox="allow-same-origin" title="Design preview" srcdoc="' + e(docHtml(s, false)) + '" style="width:' + s.size.w + 'px;height:' + (s.size.h || 1400) + 'px"></iframe></div>' +
      (s.caption ? '<div class="st-cap">' + e(s.caption) + '</div>' : '') + '<div class="st-acts">' + btns + '</div><div class="st-note">Approved HosPRO photo and house style. Ask ARIA for changes, e.g. "warmer photo", "shorter headline", "make it festive".</div></div>';
  }
  function fit() {
    document.querySelectorAll('.st-prev').forEach(box => {
      const w = +box.dataset.w, h = +box.dataset.h, f = box.querySelector('iframe'); if (!f) return;
      const max = Math.min(box.parentElement.clientWidth - 2, h > w ? 330 : 460), sc = max / w;
      f.style.transform = 'scale(' + sc + ')'; box.style.width = (w * sc) + 'px'; box.style.height = (h * sc) + 'px';
      if (!h || box.dataset.h === '1400') { try { const dh = f.contentDocument && f.contentDocument.body && f.contentDocument.body.scrollHeight; if (dh) { f.style.height = dh + 'px'; box.style.height = (dh * sc) + 'px'; } } catch (x) {} }
    });
  }
  new MutationObserver(() => requestAnimationFrame(fit)).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', fit);

  /* ---------- downloads ---------- */
  function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => no(new Error('Could not load ' + src)); i.src = src; }); }
  function wrap(ctx, text, maxW) { const words = String(text || '').split(/\s+/), lines = []; let l = ''; words.forEach(w => { const t = l ? l + ' ' + w : w; if (ctx.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }); if (l) lines.push(l); return lines; }
  async function png(s) {
    const W = s.size.w, H = s.size.h, u = W / 1080, P = pal(s), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    try { await Promise.all([document.fonts.load('600 96px "Cormorant Garamond"'), document.fonts.load('700 28px Lato'), document.fonts.load('400 32px Lato')]); } catch (er) {}
    x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
    if (s.photo) { const im = await loadImg(s.photo); const r = Math.max(W / im.width, H / im.height), iw = im.width * r, ih = im.height * r; x.drawImage(im, (W - iw) / 2, (H - ih) / 2, iw, ih); }
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(26,43,58,.15)'); g.addColorStop(.35, 'rgba(26,43,58,.05)'); g.addColorStop(H > W ? .72 : .78, 'rgba(26,43,58,.88)'); g.addColorStop(1, P.bg); x.fillStyle = g; x.fillRect(0, 0, W, H);
    try { const lg = await loadImg(logo(s)); const lh = 52 * u, lw = lg.width * lh / lg.height; x.fillStyle = 'rgba(255,251,242,.92)'; const pw = lw + 52 * u, ph = lh + 28 * u; x.beginPath(); (x.roundRect ? x.roundRect(56 * u, 48 * u, pw, ph, ph / 2) : x.rect(56 * u, 48 * u, pw, ph)); x.fill(); x.drawImage(lg, 56 * u + 26 * u, 48 * u + 14 * u, lw, lh); } catch (er) {}
    const L = 64 * u, maxW = W - 128 * u; const blocks = [];
    if (s.subheadline) { x.font = '700 ' + 26 * u + 'px Lato'; blocks.push({ f: x.font, c: P.accent, lines: [s.subheadline.toUpperCase()], lh: 40 * u, gap: 18 * u }); }
    const hs = (s.headline.length > 34 ? 78 : 96) * u; x.font = '600 ' + hs + 'px "Cormorant Garamond"'; blocks.push({ f: x.font, c: '#FFFBF2', lines: wrap(x, s.headline, maxW), lh: hs * 1.02, gap: 22 * u });
    if (s.body) { x.font = '400 ' + 32 * u + 'px Lato'; blocks.push({ f: x.font, c: '#FFFBF2', lines: wrap(x, s.body, maxW * .92), lh: 45 * u, gap: 22 * u }); }
    if (s.details.length) { x.font = '400 ' + 28 * u + 'px Lato'; blocks.push({ f: x.font, c: '#FFFBF2', lines: s.details.map(d => '◆ ' + d), lh: 42 * u, gap: 26 * u }); }
    const ctaH = s.cta ? 64 * u : 0; let y = H - (H > W ? 220 : 72) * u - ctaH - blocks.reduce((t, b) => t + b.lines.length * b.lh + b.gap, 0);
    blocks.forEach(b => { x.font = b.f; x.fillStyle = b.c; b.lines.forEach(l => { y += b.lh; x.fillText(l, L, y - b.lh * .22); }); y += b.gap; });
    if (s.cta) { x.font = '700 ' + 28 * u + 'px Lato'; const tw = x.measureText(s.cta).width + 60 * u; x.fillStyle = P.accent; x.beginPath(); (x.roundRect ? x.roundRect(L, y, tw, ctaH, 8 * u) : x.rect(L, y, tw, ctaH)); x.fill(); x.fillStyle = '#1A2B3A'; x.fillText(s.cta, L + 30 * u, y + ctaH * .64); }
    const a = document.createElement('a'); a.download = (s.headline || 'brandon-hall').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + s.kind + '.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }
  function openDoc(s, print) {
    const w = window.open('', '_blank'); if (!w) { alert('Allow pop-ups for ARIA to open the design.'); return; }
    w.document.open(); w.document.write(docHtml(s, print).replace('</body>', print ? '<script>Promise.all([document.fonts.ready].concat(Array.from(document.images).map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})))).then(()=>setTimeout(()=>print(),300))<\/script></body>' : '</body>')); w.document.close();
  }
  async function act(kind, id) {
    const s = designs[id]; if (!s) return;
    try {
      if (kind === 'png') await png(s);
      else if (kind === 'pdf') openDoc(s, true);
      else if (kind === 'open') openDoc(s, false);
      else if (kind === 'html') { await navigator.clipboard.writeText(docHtml(s, false)); flash('Newsletter HTML copied. In Mailchimp add a "Code" block and paste.'); }
      else if (kind === 'cap') { await navigator.clipboard.writeText(s.caption); flash('Caption copied.'); }
    } catch (er) { alert(er.message); }
  }
  function flash(t) { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1A2B3A;color:#fff;padding:10px 16px;border-radius:10px;z-index:99;font:600 14px Manrope,Lato,sans-serif'; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-st]'); if (b) { ev.preventDefault(); ev.stopPropagation(); act(b.dataset.st, b.dataset.id); } }, true);
  const css = document.createElement('style');
  css.textContent = '.st .st-prev{position:relative;overflow:hidden;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);background:#111;margin:6px 0 10px}.st .st-prev iframe{border:0;transform-origin:0 0;position:absolute;left:0;top:0;pointer-events:none;background:#fff}' +
    '.st-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}.st-acts button{background:transparent;border:1px solid #33405e;border-radius:999px;padding:7px 13px;font-size:13.5px;color:inherit;cursor:pointer}.st-acts button:hover{border-color:#C78A3B}' +
    '.st-cap{white-space:pre-wrap;font-size:14px;line-height:1.5;background:rgba(255,255,255,.04);border:1px solid #2a3552;border-radius:10px;padding:10px 12px;margin-bottom:8px}.st-note{font-size:12.5px;opacity:.7;margin-top:8px}';
  document.head.appendChild(css);
  const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Lato:wght@400;700&display=swap'; document.head.appendChild(fl);
  window.ARIA_STUDIO = { card, docHtml, fit, act };
})();
