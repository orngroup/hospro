/* Brandon Hall cost dashboard — parsing and categorisation rules.
   One file used by the dashboard in the browser and by the build script in Node.
   To change how a line is categorised, edit the rules here. */
(function (root) {
  'use strict';

  var DEPT = {
    'Bar Costs (Drinks)': 'Bar',
    'Restaurant Costs': 'Restaurant',
    'Room Costs (Linen and Materials)': 'Rooms'
  };

  var SUPPLIER = {
    'SYSCO GB LTD': 'Sysco',
    'Mitre / Nisbets Limited': 'Nisbets',
    '1st Waste Management Consultants Ltd': '1st Waste Management',
    'Superclean Contract Cleaners Limited': 'Superclean',
    'Philip Dennis Foodservice Ltd': 'Philip Dennis',
    'E&P catering butchers': 'E&P Catering Butchers',
    'Flying Fish Seafoods Company Limited': 'Flying Fish Seafoods',
    'A.M Bailey': 'A.M. Bailey',
    'Brandon Hall Hotel Limited': 'Brandon Hall Hotel Ltd',
    'D&D Marquee Hire Ltd': 'D&D Marquee Hire',
    'Elite Energy Ltd': 'Elite Energy',
    'Petty Cash Purchases': 'Staff expenses & petty cash',
    'GM - Mike Blake': 'Staff expenses & petty cash',
    'Raj Kumar': 'Staff expenses & petty cash',
    'Ashwanth Kumar': 'Staff expenses & petty cash',
    'American Express': 'Staff expenses & petty cash'
  };
  var RETAIL = ['Staff expenses & petty cash', 'Amazon', 'ASDA', 'Morrisons', 'M&S', 'The Range', 'Baby Bottle'];

  /* item type -> section */
  var SECTION = {
    // Bar
    'Draught beer & cider (kegs)': 'Draught',
    'Wine & fizz': 'Wine',
    'Spirits & liqueurs': 'Spirits',
    'Soft drinks & mixers': 'Soft drinks',
    'Bottled beer & cider': 'Packaged beer',
    'Mixed drinks order': 'Mixed orders',
    'Cellar gas': 'Cellar & sundries',
    'Bar snacks & garnish': 'Cellar & sundries',
    'Bar sundries': 'Cellar & sundries',
    'Keg returns & credits': 'Draught',
    // Restaurant
    'Food – grocery & mixed': 'Food',
    'Fresh produce & dairy': 'Food',
    'Meat & poultry': 'Food',
    'Fish & seafood': 'Food',
    'Eggs & dairy': 'Food',
    'Tea, coffee & biscuits': 'Hot beverages',
    'Soft drinks, juice & water': 'Beverages',
    'Alcohol (coded to restaurant)': 'Beverages',
    'Kitchen consumables & cleaning': 'Kitchen consumables',
    'Kitchen equipment & repairs': 'Kitchen equipment',
    'Table linen hire': 'Linen & laundry',
    'Event hire': 'Events',
    'Inter-company charge (to query)': 'Non-food / to query',
    // Rooms
    'Bedroom linen hire': 'Linen & laundry',
    'Cleaning products': 'Housekeeping',
    'Gloves & PPE': 'Housekeeping',
    'Paper & bin liners': 'Housekeeping',
    'Cleaning tools': 'Housekeeping',
    'Guest toiletries': 'Guest supplies',
    'Guest tea tray': 'Guest supplies',
    'Bedding & mattresses': 'Equipment & bedding',
    'Housekeeping equipment': 'Equipment & bedding',
    'Scheduled bin collections': 'Waste management',
    'Skips, tonnage & extra charges': 'Waste management',
    'Window cleaning': 'Property services'
  };

  function has(s, list) {
    for (var i = 0; i < list.length; i++) if (s.indexOf(list[i]) !== -1) return true;
    return false;
  }
  function firstPos(s, list) {
    var best = -1;
    for (var i = 0; i < list.length; i++) {
      var p = s.indexOf(list[i]);
      if (p !== -1 && (best === -1 || p < best)) best = p;
    }
    return best;
  }
  function r2(n) { return Math.round(n * 100) / 100; }

  /* ---------- Bar ---------- */
  var K_KEG = [' keg', 'kegs', 'keg '];
  var K_WINE = ['sauv', 'merlot', 'chablis', 'prosecco', 'processo', 'pros rose', 'pinot', 'lucido', 'white zin', 'shiraz', 'chardonnay', 'malbec', 'malbex', 'rioja', 'tempran', 'picpoul', 'albarino', 'amarone', 'cndp', 'rouge', 'viog', 'taittinger', 'mirab', 'tawny', 'soumante', 'tinto', 'villa blanche', 'white rose', 'haystack'];
  var K_SPIRIT = [' gin', 'gin ', 'vodka', ' rum', 'whisk', 'cognac', 'bourbon', 'tequila', 'liqueur', ' liq', 'baileys', 'aperol', 'kahlua', 'cointreau', 'malibu', 'jack daniels', 'jd tenn', 'smirnoff', 'absolut', 'glenfiddich', 'laphroaig', 'monkey shoulder', 'courvoisier', 'grey goose', 'tanquer', 'hendricks', 'disaronno', 'saronno', 'campari', 'martini', 'licor 43', 'cacao', 'hennes', 'chivas', 'talisker', 'glenmorangie', 'glemmorangie', 'remy martin', 'jagermeister', 'fireball', 'cuervo', 'casamigos', 'casanigos', 'johnny walker', 'famous grouse', 'bacardi', 'jameson', 'kraken', 'captain morgan', 'captian morgan', 'gordons', 'bombay', 'bulleit', 'edinburgh', 'st germain', 'tequila rose'];
  var K_SOFT = ['coke', 'coca', 'coco cola', 'cocal', 'fever', 'j20', 'water', 'lemonade', 'tonic', 'soda', 'ginger', 'juice', 'cord', 'p/mix', 'monin', 'finest call', 'puree', 'foamer', 'franklin', 'bitters', 'coco real', 'lime', 'lemon', 'strawberry', 'watermelon', 'drinks'];
  var K_PKG = ['bulmer', 'kopparberg', 'peroni', 'perroni', 'corona', 'ubu', '0% can', '0.0 nrb'];
  var K_SNACK = ['crisps', 'nuts', 'peanuts', 'olives', 'hot chocolate'];

  function barCat(t) {
    var d = t.descLower;
    if (t.rawContact === 'BOC') return 'Cellar gas';
    if (t.rawContact === 'Heineken' && (t.source !== 'Payable Invoice')) return 'Keg returns & credits';
    if (t.rawContact === 'Belair Coffee') return 'Bar sundries';
    if (has(d, ['straws', 'dtraws']) || t.supplier === 'Staff expenses & petty cash' || t.supplier === 'Amazon') return 'Bar sundries';
    var lines = t.lines.length ? t.lines : [d];
    var n = { keg: 0, wine: 0, spirit: 0, soft: 0, pkg: 0, snack: 0 }, tot = 0;
    lines.forEach(function (ln) {
      var l = ' ' + ln.toLowerCase() + ' ';
      var g = null;
      if (has(l, K_KEG)) g = 'keg';
      else if (has(l, K_PKG)) g = 'pkg';
      else if (has(l, K_SPIRIT)) g = 'spirit';
      else if (has(l, K_WINE)) g = 'wine';
      else if (has(l, K_SOFT)) g = 'soft';
      else if (has(l, K_SNACK)) g = 'snack';
      if (g) { n[g]++; tot++; }
    });
    if (!tot) return 'Mixed drinks order';
    if (n.keg / tot >= 0.5 || n.keg >= 2) return 'Draught beer & cider (kegs)';
    if (n.wine / tot >= 0.6) return 'Wine & fizz';
    if (n.spirit / tot >= 0.6) return 'Spirits & liqueurs';
    if (n.soft / tot >= 0.6) return 'Soft drinks & mixers';
    if (n.pkg / tot >= 0.6) return 'Bottled beer & cider';
    if (n.snack / tot >= 0.5) return 'Bar snacks & garnish';
    return 'Mixed drinks order';
  }

  /* Keg invoices where the keg lines are known exactly: the keg value is split out
     so 'Draught' is not overstated by spirits and soft drinks on the same invoice.
     ref -> [keg value, item type for the rest] */
  var KEG_SPLIT = {
    '460437768': [857.55, 'Mixed drinks order'],
    '460477333': [268.43, 'Spirits & liqueurs'],
    '460556635': [522.73, 'Mixed drinks order'],
    '460599550': [1024.65, 'Spirits & liqueurs'],
    '460609906': [1074.84, 'Mixed drinks order'],
    '56790957': [1230.66, 'Bottled beer & cider']
  };

  /* ---------- Restaurant ---------- */
  var R_ALC = ['jameson', 'peroni', 'pimms', 'grey goose', 'bombay', 'disaronno', 'corona', 'cruzcampo', 'moretti'];
  var R_CONS = ['cling', 'parchment', 'partch', 'napkin', 'cups', 'lids', 'centrefeed', 'centrfd', 'blue roll', 'blue rolls', 'handtowel', 'hand towel', 'bin liner', 'black bag', 'refuse', 'scourer', 'cleaning', 'dishwash', 'washing up', 'mop', 'cloth', 'glove', 'skewer', 'label', 'lables', 'freshn', 'mould', 'rational care', 'hero plus', 'handy foam', 'chafing', 'cocktail sticks', 'coffee filters', 'paper bags'];
  var R_SOFT = ['juice', 'jiuce', 'water', 'coke', 'cola', 'fevertree', 'ginger beer', 'drinks', 'orange joe'];
  var R_HOT = ['coffee', 'tea,', 'teas', 'twining', 'nescafe', 'newscafe', 'english tea', 'yorkshire tea', 'earl grey'];
  var R_BISC = ['biscuit', 'bisuit', 'minipack', 'mini biscuit'];
  var R_MEAT = ['steak', 'beef', 'chicken', 'pork', 'lamb', 'sirlo', 'ribeye', 'gammon', 'sausage', 'bacon', 'burger', 'ham', 'veal', 'brisket', 'shortback'];
  var R_PROD = ['fruit', 'veg', 'herb', 'salad', 'mushroom', 'lemon', 'lime', 'tomato', 'onion', 'potato', 'celery', 'carrot', 'orange', 'grape', 'melon', 'pineapple', 'mint', 'pepper', 'garlic', 'watercress', 'corn'];
  var R_DAIRY = ['egg', 'milk', 'cream', 'yog', 'butter', 'cheese'];
  var R_EQUIP = ['pans', ' pan,', 'tongs', 'grater', 'chopping board', 'bowls', 'dishes', 'trays', 'storage', 'containers', 'glasses', 'knives', 'baskets', 'canister', 'torch', 'stoppers', 'ice buckets', 'openers', 'coaster'];
  var R_FOODWORDS = ['hash', 'bread', 'croissant', 'danish', 'beans', 'cereal', 'rice', 'oil', 'flour', 'sauce', 'jam', 'spice', 'fries', 'chips', 'cake', 'salmon', 'cod', 'pizza', 'pasta', 'dessert', 'muffin', 'breakfast', 'condiment', 'ketchup', 'paste'];

  function restCat(t) {
    var d = ' ' + t.descLower + ' ', c = t.rawContact;
    if (c === 'Brandon Hall Hotel Limited') return 'Inter-company charge (to query)';
    if (c === 'D&D Marquee Hire Ltd') return 'Event hire';
    if (c === 'Elite Energy Ltd' || c === 'Mitre / Nisbets Limited') return 'Kitchen equipment & repairs';
    if (c === 'Johnsons Hotel Linen') return 'Table linen hire';
    if (c === 'BOC') return 'Kitchen consumables & cleaning';
    if (c === 'Baby Bottle') return 'Alcohol (coded to restaurant)';
    if (c === 'Belair Coffee' || c === 'Vikings') return 'Tea, coffee & biscuits';
    if (c === 'E&P catering butchers' || c === 'Bosworths Butchers' || c === 'Midlands Foods') return 'Meat & poultry';
    if (c === 'Flying Fish Seafoods Company Limited' || c === 'Fishco') return 'Fish & seafood';
    if (c === 'Sunrise Farm') return 'Eggs & dairy';
    if (has(d, ['knives'])) return 'Kitchen equipment & repairs';
    if (has(d, ['ice cream', 'icecream', 'iceream', 'ice cram', 'sorbet']) && d.length < 45) return 'Food – grocery & mixed';
    var dj = has(d, ['juice']) ? d.replace(/orange|apple/g, '') : d;
    var isFoodMix = has(dj, R_FOODWORDS) || has(dj, R_MEAT) || has(dj, R_PROD) || has(dj, R_DAIRY);
    if (has(d, R_ALC)) return 'Alcohol (coded to restaurant)';
    if (c === 'Amazon') {
      if (has(d, ['pasta', 'mints'])) return 'Food – grocery & mixed';
      if (has(d, R_CONS) && !has(d, R_EQUIP)) return 'Kitchen consumables & cleaning';
      return 'Kitchen equipment & repairs';
    }
    if (has(d, R_EQUIP) && !isFoodMix) return 'Kitchen equipment & repairs';
    var pc = firstPos(d, R_CONS), ps = firstPos(d, R_SOFT);
    if (pc !== -1 && !isFoodMix && (ps === -1 || pc < ps || t.vat !== 0)) {
      if (ps !== -1 && ps < pc) return 'Soft drinks, juice & water';
      return 'Kitchen consumables & cleaning';
    }
    if (ps !== -1 && !isFoodMix) return 'Soft drinks, juice & water';
    if (c === 'Worcester Produce' || c === 'A.M Bailey') return 'Fresh produce & dairy';
    var hot = has(d, R_HOT) || has(d, R_BISC);
    var heavy = has(d, R_MEAT) || has(d, R_PROD) || has(d, ['hash', 'bread', 'croissant', 'beans', 'cereal', 'rice', 'fries', 'chips', 'salmon', 'cod', 'pizza', 'breakfast', 'condiment', 'ketchup', 'paste', 'egg', 'yog', 'butter', 'cheese']);
    if (hot && !heavy) return 'Tea, coffee & biscuits';
    if (has(d, R_DAIRY) && !has(d, R_MEAT) && !has(d, R_PROD) && !has(d, R_FOODWORDS)) return 'Eggs & dairy';
    if (has(d, R_MEAT) && !has(d, R_PROD) && !has(d, R_DAIRY) && !has(d, R_FOODWORDS)) return 'Meat & poultry';
    if (has(d, R_PROD) && !has(d, R_MEAT) && !has(d, R_FOODWORDS) && !has(d, R_DAIRY)) return 'Fresh produce & dairy';
    return 'Food – grocery & mixed';
  }

  /* ---------- Rooms ---------- */
  var H_TRAY = ['biscuit', 'coffee', ' tea,', ' tea ', 'milk', 'sugar'];
  var H_GLOVE = ['glove'];
  var H_PAPER = ['toilet', 'tissue', 'handtowel', 'hand towel', 'centrefeed', '2 ply', '2ply', 'bin liner', 'bins liner', 'binliner', 'black bag', 'black sack', 'refuse', 'liner', 'cleaning bags', 'bin bags'];
  var H_TOOLS = ['mop', 'broom', 'cloth', 'microfibre', 'squeegee', 'duster', 'bucket', 'hoover bags', 'sponge', 'tea towel', 'caddy'];
  var H_CHEM = ['cleaner', 'cleaning', 'bleach', 'freshner', 'washing', 'hero plus', 'beer line', 'enzyme', 'dishwashing', 'spirigel', 'refill bottles'];

  function roomCat(t) {
    var d = ' ' + t.descLower + ' ', c = t.rawContact;
    if (c === 'Johnsons Hotel Linen') return (has(d, ['napkin', 'tablecloth']) && !has(d, ['luna'])) ? 'Table linen hire' : 'Bedroom linen hire';
    if (c === '1st Waste Management Consultants Ltd') return has(d, ['euro 240', 'euro 1100', 'for the month']) ? 'Scheduled bin collections' : 'Skips, tonnage & extra charges';
    if (c === 'Superclean Contract Cleaners Limited') return 'Window cleaning';
    if (has(d, ['mattress', 'duvet', 'pillow']) && !has(d, ['soap', 'trolley'])) return 'Bedding & mattresses';
    if (has(d, ['vacuum', 'trolley', 'cots', 'twin to king']) || (c === 'Amazon' && d.trim() === 'bins')) return 'Housekeeping equipment';
    if (has(d, ['soap', 'shampoo', 'bath & shower', 'bath&shower'])) return 'Guest toiletries';
    if (has(d, ['tea towel'])) return 'Cleaning tools';
    var groups = [['Guest tea tray', H_TRAY], ['Gloves & PPE', H_GLOVE], ['Paper & bin liners', H_PAPER], ['Cleaning tools', H_TOOLS], ['Cleaning products', H_CHEM]];
    var best = null, bp = -1;
    groups.forEach(function (g) {
      var p = firstPos(d, g[1]);
      if (p !== -1 && (bp === -1 || p < bp)) { bp = p; best = g[0]; }
    });
    return best || 'Cleaning products';
  }

  /* ---------- Build transactions from raw Xero rows ---------- */
  function monthOf(iso) { return iso.slice(0, 7); }

  function normalise(raw) {
    var out = [];
    raw.forEach(function (r, idx) {
      var dept = DEPT[r.account];
      if (!dept) return;
      var contact = (r.contact || '').trim();
      var supplier = SUPPLIER[contact] || contact;
      var desc = String(r.desc || '');
      var body = desc.indexOf(contact + ' - ') === 0 ? desc.slice(contact.length + 3) : (desc === contact ? '' : desc);
      var lines = body.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var t = {
        id: idx, date: r.date, month: monthOf(r.date), dept: dept, account: r.account,
        source: r.source, rawContact: contact, supplier: supplier,
        retail: RETAIL.indexOf(supplier) !== -1,
        ref: String(r.ref || '').trim(), lines: lines, desc: lines.join(' · '),
        descLower: lines.join(' , ').toLowerCase(),
        net: r2((r.debit || 0) - (r.credit || 0)), vat: r2(r.vat || 0), gross: r2(r.gross || 0),
        credit: (r.credit || 0) > 0
      };
      t.cat = dept === 'Bar' ? barCat(t) : dept === 'Restaurant' ? restCat(t) : roomCat(t);
      // exact keg split
      var sp = dept === 'Bar' && t.rawContact === 'Heineken' && !t.credit ? KEG_SPLIT[t.ref] : null;
      if (sp && t.net > sp[0]) {
        var a = Object.assign({}, t, { net: sp[0], cat: 'Draught beer & cider (kegs)', part: 'kegs on this invoice' });
        var b = Object.assign({}, t, { id: idx + 0.5, net: r2(t.net - sp[0]), cat: sp[1], part: 'other drinks on this invoice' });
        var share = sp[0] / t.net;
        a.vat = r2(t.vat * share); b.vat = r2(t.vat - a.vat); a.gross = r2(a.net + a.vat); b.gross = r2(b.net + b.vat);
        a.section = SECTION[a.cat]; b.section = SECTION[b.cat];
        out.push(a, b);
        return;
      }
      t.section = SECTION[t.cat] || 'Other';
      out.push(t);
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; });
    return out;
  }

  /* ---------- Heineken priced lines (kegs and bottles) ---------- */
  var KEGS = [
    { key: 'moretti', name: 'Birra Moretti', test: ['moretti'] },
    { key: 'cruzcampo', name: 'Cruzcampo', test: ['cruzcampo'] },
    { key: 'guinness', name: 'Guinness', test: ['guinness original'] },
    { key: 'neckoil', name: 'Beavertown Neck Oil', test: ['neck oil'] },
    { key: 'orchard', name: 'Orchard Thieves', test: ['orchard thieves'] },
    { key: 'heineken00', name: 'Heineken 0.0', test: ['heineken 0.0 keg'] }
  ];

  function pricedLines(tx) {
    var res = [], seen = {};
    tx.forEach(function (t) {
      if (t.rawContact !== 'Heineken' || seen[t.ref + t.date]) return;
      seen[t.ref + t.date] = 1;
      t.lines.forEach(function (ln) {
        var m = ln.match(/^(.*?)\s+(\d+)\s+(KEG\d+|\d+LKEG|\d+LK|[\d.]+ML?X?\d*|\d+X\d+)\s+((?:-?\d+\.\d{2}\s+)+)B1/i);
        if (!m) return;
        var nums = m[4].trim().split(/\s+/).map(Number);
        if (nums.length < 3) return;
        var qty = +m[2], list = nums[0], total = nums[nums.length - 1], net = nums[nums.length - 2];
        if (net <= 0 || Math.abs(net * qty - total) > 0.06) return;
        var name = m[1].replace(/\s+\d+\.\d$/, '').trim();
        var low = name.toLowerCase(), size = null, keg = null;
        var sz = low.match(/keg\s+(\d+)l/) || low.match(/(\d+)l\s+keg/);
        if (sz) size = +sz[1];
        KEGS.forEach(function (k) { if (has(low, k.test) && has(low, ['keg'])) keg = k; });
        res.push({ date: t.date, ref: t.ref, name: name, keg: keg ? keg.key : null, kegName: keg ? keg.name : null,
          size: size, qty: qty, list: list, net: net, total: total, disc: list ? r2((1 - net / list) * 100) : 0 });
      });
    });
    return res;
  }

  /* ---------- Johnsons linen lines ---------- */
  function linenLines(tx) {
    var res = [], seen = {};
    tx.forEach(function (t) {
      if (t.rawContact !== 'Johnsons Hotel Linen' || seen[t.ref]) return;
      seen[t.ref] = 1;
      t.lines.forEach(function (ln) {
        var m = ln.match(/^(.+?)\s+(\d+)\s+0\s+£([\d.]+)\s+£([\d,.]+)$/);
        if (!m) return;
        res.push({ month: t.month, date: t.date, item: m[1].trim(), qty: +m[2], price: +m[3], total: +m[4].replace(/,/g, ''),
          bed: /^(Luna|Eclipse)/.test(m[1]) });
      });
    });
    return res;
  }

  /* ---------- Possible duplicates ---------- */
  function possibleDuplicates(tx) {
    var skip = ['Belair Coffee', 'Sunrise Farm', 'Superclean', '1st Waste Management', 'BOC', 'Brandon Hall Hotel Ltd'];
    var res = [], rows = tx.filter(function (t) { return t.net >= 20 && !t.part; });
    for (var i = 0; i < rows.length; i++) for (var j = i + 1; j < rows.length; j++) {
      var a = rows[i], b = rows[j];
      var days = (Date.parse(b.date) - Date.parse(a.date)) / 864e5;
      if (days > 3) break;
      if (Math.abs(a.net - b.net) > 0.005) continue;
      if (a.date === b.date && a.supplier === b.supplier) continue;         // split lines of one invoice
      if (a.supplier === b.supplier && skip.indexOf(a.supplier) !== -1) continue;
      if (a.supplier !== b.supplier && a.date !== b.date) continue;
      if (a.supplier !== b.supplier && a.net < 100) continue;
      res.push({ a: a, b: b });
    }
    return res;
  }

  /* ---------- Reading a Xero "Account Transactions" workbook (browser upload) ---------- */
  function rowsFromSheet(aoa) {
    var out = [], hdr = -1;
    for (var i = 0; i < aoa.length; i++) if (aoa[i] && aoa[i][0] === 'Date' && aoa[i][2] === 'Contact') { hdr = i; break; }
    if (hdr === -1) return out;
    for (var k = hdr + 1; k < aoa.length; k++) {
      var r = aoa[k];
      if (!r || !(r[0] instanceof Date) || !r[9]) continue;
      var d = r[0];
      var iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000 + 43200000).toISOString().slice(0, 10);
      out.push({ date: iso, source: r[1], contact: r[2] || '', desc: r[3] || '', ref: r[4] == null ? '' : String(r[4]),
        debit: +r[5] || 0, credit: +r[6] || 0, gross: +r[7] || 0, vat: +r[8] || 0, account: r[9] });
    }
    return out;
  }

  var api = { DEPT: DEPT, SECTION: SECTION, normalise: normalise, pricedLines: pricedLines, linenLines: linenLines,
    possibleDuplicates: possibleDuplicates, rowsFromSheet: rowsFromSheet, KEGS: KEGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CostsEngine = api;
})(typeof window !== 'undefined' ? window : this);
