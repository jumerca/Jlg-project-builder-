/* Musée & Expéditions — art.js
 * Illustrations vectorielles des objets, style « ligne claire » : contour encré,
 * aplats, un reflet et une ombre. Chaque objet est unique (graine) et son état
 * se lit à l'image (fissures, patine, éclats).
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const A = (ME.Art = {});
  const INK = '#2b2118';

  A.PAL = {
    silex: ['#c9ad84', '#8d7350', '#e8d9bb'], obsidienne: ['#33333f', '#15151b', '#7a7a92'],
    os: ['#e3d3b0', '#b09870', '#f6eed8'], ivoire: ['#efe0bd', '#c3a979', '#fcf5e2'],
    gres: ['#c99c6c', '#8f6740', '#e6c69f'], coquillage: ['#f2e4cc', '#c4a67f', '#fffaf0'],
    ceramique: ['#c86a3e', '#8a4222', '#eb9a6e'], bronze: ['#5f9a7d', '#36654f', '#a6d2b7'],
    or: ['#e3b33a', '#a37816', '#f9e08a'], argent: ['#b9bdc2', '#7a7f85', '#eceef0'],
    fer: ['#7b5a47', '#4a3328', '#ab866d'], plomb: ['#8e9398', '#5b6065', '#c3c7cb'],
    steatite: ['#8ea6a2', '#5b706c', '#c9d9d5'], faience: ['#3ea4b6', '#1d6d7e', '#95dbe5'],
    papyrus: ['#dcc590', '#a5894f', '#f0e2ba'], bois: ['#a8733f', '#6b4524', '#d29e6b'],
    verre: ['#86c1b6', '#4c867d', '#d3efe9'], pierre: ['#d8cdb4', '#a3977c', '#f0e9d6'],
    marbre: ['#efebe3', '#bfb8aa', '#ffffff'], parchemin: ['#ecdbb2', '#bba470', '#f9f0d8'],
    email: ['#d9aa38', '#9a7314', '#f5d77c'],
  };

  const f2 = (n) => Math.round(n * 10) / 10;
  function path(d, fill, sw, extra) { return '<path d="' + d + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw == null ? 1.8 : sw) + '" stroke-linejoin="round" stroke-linecap="round"' + (extra || '') + '/>'; }
  function line(d, color, sw, op) { return '<path d="' + d + '" fill="none" stroke="' + (color || INK) + '" stroke-width="' + (sw || 1.2) + '" stroke-linecap="round" stroke-linejoin="round"' + (op != null ? ' opacity="' + op + '"' : '') + '/>'; }
  function ell(cx, cy, rx, ry, fill, sw, extra) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw == null ? 1.8 : sw) + '"' + (extra || '') + '/>'; }
  function circ(cx, cy, r, fill, sw, extra) { return ell(cx, cy, r, r, fill, sw, extra); }
  function hl(d, op) { return '<path d="' + d + '" fill="#fff" opacity="' + (op || 0.45) + '"/>'; }

  /* Chaque dessinateur reçoit (pal = [base, sombre, clair], r = aléatoire, obj) et dessine dans un carré 100×100. */
  const S = {};

  S.biface = (p, r) => {
    let s = path('M50 10 C67 22 74 52 65 77 C60 89 40 89 35 77 C26 52 33 22 50 10Z', p[0]);
    for (let i = 0; i < 7; i++) {
      const y = 22 + i * 9 + r() * 3;
      s += line('M' + f2(36 + i * 0.6) + ' ' + f2(y) + ' Q' + f2(46 + r() * 4) + ' ' + f2(y + 4) + ' 50 ' + f2(y + 2), p[1], 1.1, 0.8);
      s += line('M' + f2(64 - i * 0.6) + ' ' + f2(y + 3) + ' Q' + f2(55 - r() * 4) + ' ' + f2(y + 6) + ' 50 ' + f2(y + 4), p[1], 1.1, 0.8);
    }
    return s + hl('M45 22 C40 34 39 46 41 56 C44 44 46 32 49 20Z');
  };
  S.blade = (p, r) => {
    const c = r() * 6 - 3;
    let s = path('M45 8 Q' + f2(52 + c) + ' 6 57 10 L' + f2(59 + c) + ' 86 L50 94 L' + f2(41 + c) + ' 86 Z', p[0]);
    s += line('M51 10 L' + f2(50 + c) + ' 90', p[1], 1.2);
    let z = 'M45 14'; for (let y = 18; y < 84; y += 5) z += ' L' + f2(44 + (y % 10 ? 1.4 : -0.2) + c * y / 90) + ' ' + y;
    s += line(z, p[1], 0.9, 0.8);
    return s + hl('M53 14 L55 14 L56 80 L54 82Z', 0.5);
  };
  S.point = (p) => {
    let s = path('M50 6 L56 30 L56 80 L47 95 L44 80 L44 30 Z', p[0]);
    s += line('M50 14 L50 74', p[1], 1.4);
    s += line('M44 80 L56 72', p[1], 1.1);
    return s + hl('M52 18 L54 30 L54 70 L52 70Z');
  };
  S.propulseur = (p) => {
    let s = path('M20 90 L58 34 L64 38 L27 94 Z', p[0]);
    s += ell(66, 26, 14, 8, p[0]);
    s += circ(80, 19, 6, p[0]);
    s += line('M82 14 C86 4 76 0 72 8', INK, 2.4);
    s += line('M59 31 L56 40 M64 33 L62 42 M71 32 L72 41 M75 31 L78 39', INK, 2);
    s += circ(82, 18, 1, INK, 0);
    s += line('M58 26 Q66 22 74 26', p[1], 1);
    return s + hl('M30 86 L56 44 L58 46 L33 88Z');
  };
  S.stoneLamp = (p) => {
    let s = path('M66 52 L92 44 L94 54 L68 62 Z', p[0]);
    s += ell(44, 56, 30, 22, p[0]);
    s += ell(42, 52, 18, 11, p[1], 1.4);
    s += ell(40, 50, 12, 6, '#2b2118', 0, ' opacity="0.55"');
    return s + hl('M22 52 Q28 40 42 38 Q30 44 26 56Z');
  };
  S.venus = (p) => {
    let s = ell(50, 17, 7, 8, p[0]);
    s += line('M44 14 Q50 8 56 14', p[1], 1.2);
    s += path('M44 25 C35 31 35 41 40 47 C29 53 27 67 38 73 C41 81 45 89 48 93 L52 93 C55 89 59 81 62 73 C73 67 71 53 60 47 C65 41 65 31 56 25 Z', p[0]);
    s += ell(44, 41, 6, 8, p[0], 1.4) + ell(56, 41, 6, 8, p[0], 1.4);
    s += line('M38 50 Q50 58 62 50', p[1], 1.2) + line('M50 74 L50 92', p[1], 1.2) + line('M40 66 Q50 72 60 66', p[1], 1);
    return s + hl('M41 30 Q38 40 42 46 Q40 38 44 30Z');
  };
  S.beads = (p, r) => {
    let s = line('M14 30 Q50 92 86 30', '#6b4a2b', 1.6);
    for (let i = 0; i < 9; i++) {
      const t = i / 8, x = 14 + 72 * t, y = 30 + 62 * 2 * t * (1 - t) * 1.0 + 0;
      const a = (t - 0.5) * 60 + r() * 20 - 10;
      s += '<g transform="translate(' + f2(x) + ' ' + f2(y + 2) + ') rotate(' + f2(a) + ')">' + path('M0 -7 C6 -6 7 4 0 8 C-7 4 -6 -6 0 -7Z', p[0], 1.4) + line('M-3 -1 Q0 6 3 -1', p[1], 0.9) + circ(0, -3, 1.3, '#3a2a1a', 0) + '</g>';
    }
    return s;
  };
  S.sherd = (p, r) => {
    const d = 'M18 30 L40 ' + f2(16 + r() * 6) + ' L70 20 L86 ' + f2(40 + r() * 8) + ' L76 78 L46 ' + f2(84 + r() * 4) + ' L22 70 Z';
    let s = '<clipPath id="c' + Math.round(r() * 1e6) + '"></clipPath>';
    s = path(d, '#d98a5a');
    s += path('M20 44 L86 52 L84 60 L22 54 Z', '#7a2f1a', 0, ' opacity="0.85"');
    s += path('M21 62 L80 70 L79 74 L22 67 Z', '#f2e2c4', 0);
    for (let i = 0; i < 5; i++) s += circ(30 + i * 12, 34 + i * 1.5, 2.2, '#7a2f1a', 0);
    s += line(d.replace(/ Z$/, ' Z'), INK, 1.8);
    return s + hl('M30 26 L50 22 L40 30Z');
  };
  S.fibula = (p) => {
    let s = line('M22 62 C28 22 70 22 80 60', INK, 7);
    s += line('M22 62 C28 22 70 22 80 60', p[0], 4.4);
    s += line('M24 60 C30 28 66 28 76 56', p[2], 1.2, 0.8);
    for (let i = 0; i < 4; i++) s += ell(18 - i * 0, 62, 4, 6 - i * 0.6, p[0], 1.4);
    s += line('M20 66 L76 66', INK, 1.6);
    s += path('M74 56 L86 60 L84 70 L72 68 Z', p[0], 1.6);
    return s;
  };
  S.coin = (p, r, o) => {
    let s = circ(50, 50, 34, p[0], 2) + circ(50, 50, 29, 'none', 1.2);
    const t = o ? o.type : 'statere';
    if (t === 'denier') {
      s += line('M50 30 L50 70 M30 50 L70 50', INK, 3);
      for (let a = 0; a < 360; a += 24) s += circ(f2(50 + Math.cos(a * Math.PI / 180) * 25), f2(50 + Math.sin(a * Math.PI / 180) * 25), 1.4, INK, 0);
      s += circ(40, 40, 2, INK, 0) + circ(60, 60, 2, INK, 0);
    } else if (t === 'sesterce') {
      s += path('M40 70 C34 60 36 42 44 34 C52 28 62 32 64 40 L66 46 L62 48 L64 54 C62 60 58 62 54 64 L54 72 Z', p[1], 1.4);
      for (let i = 0; i < 5; i++) s += ell(f2(42 + i * 4), f2(34 + i * 0.5), 2.6, 1.6, p[2], 0.6);
      for (let a = 200; a < 340; a += 14) s += '<rect x="' + f2(50 + Math.cos(a * Math.PI / 180) * 24) + '" y="' + f2(50 + Math.sin(a * Math.PI / 180) * 24) + '" width="2.2" height="3.4" fill="' + INK + '"/>';
    } else if (t === 'potin') {
      s += path('M36 60 C34 44 44 32 56 34 C66 36 68 48 62 56 L60 66 Z', p[1], 1.4);
      s += line('M40 40 Q52 28 64 40', INK, 2.2) + circ(56, 46, 2, INK, 0);
    } else {
      s += path('M38 64 C34 48 42 34 54 34 C64 36 66 46 62 54 L64 58 L58 60 L56 68 Z', p[1], 1.4);
      for (let i = 0; i < 6; i++) s += line('M' + f2(40 + i * 3) + ' ' + f2(36 + (i % 2) * 3) + ' q4 -4 6 2', INK, 1.4);
      s += circ(57, 46, 1.6, INK, 0);
    }
    return s + hl('M28 40 Q32 26 46 20 Q34 30 32 44Z', 0.55);
  };
  S.amphora = (p, r, o) => {
    const rom = o && o.type === 'amphore';
    const neckTop = rom ? 18 : 8;
    let s = path('M42 ' + neckTop + ' L58 ' + neckTop + ' L58 ' + (neckTop + 4) + ' L56 ' + (neckTop + 6) + ' L56 30 C70 36 72 56 64 72 L54 88 L52 96 L48 96 L46 88 L36 72 C28 56 30 36 44 30 L44 ' + (neckTop + 6) + ' L42 ' + (neckTop + 4) + ' Z', p[0]);
    s += line('M44 ' + (neckTop + 10) + ' C30 ' + (neckTop + 10) + ' 32 30 36 34', INK, 3.4) + line('M56 ' + (neckTop + 10) + ' C70 ' + (neckTop + 10) + ' 68 30 64 34', INK, 3.4);
    s += line('M44 ' + (neckTop + 10) + ' C31 ' + (neckTop + 10) + ' 33 30 36 34', p[0], 1.6) + line('M56 ' + (neckTop + 10) + ' C69 ' + (neckTop + 10) + ' 67 30 64 34', p[0], 1.6);
    s += hl('M40 38 C36 46 36 58 40 66 C40 56 40 46 44 38Z');
    if (rom) for (let i = 0; i < 9; i++) s += circ(f2(36 + r() * 28), f2(40 + r() * 36), f2(1.5 + r() * 3), '#efe8d8', 0.6, ' opacity="0.9"');
    return s;
  };
  S.torc = (p) => {
    let s = line('M30 34 C14 50 22 82 50 84 C78 82 86 50 70 34', INK, 10);
    s += line('M30 34 C14 50 22 82 50 84 C78 82 86 50 70 34', p[0], 6.8);
    for (let i = 0; i < 14; i++) s += line('M' + f2(22 + i * 4.3) + ' ' + f2(i < 7 ? 52 + i * 4 : 80 - (i - 7) * 4) + ' l2 -2.4', p[1], 1, 0.7);
    s += circ(30, 30, 7, p[0]) + circ(70, 30, 7, p[0]);
    s += line('M27 30 q3 -4 6 0 q-3 4 -6 0', INK, 1) + line('M67 30 q3 -4 6 0 q-3 4 -6 0', INK, 1);
    return s + hl('M28 26 q2 -2 4 0', 0.6);
  };
  S.sword = (p) => {
    let s = '<g transform="rotate(-38 50 50)">';
    s += path('M45 30 L55 30 L55 92 L50 98 L45 92 Z', p[1]);
    s += path('M46 30 L54 30 L54 88 L50 93 L46 88 Z', p[0], 1.2);
    for (let y = 40; y < 86; y += 12) s += line('M46 ' + y + ' L54 ' + (y + 3), INK, 1);
    s += path('M40 26 L60 26 L58 31 L42 31 Z', '#4a3328');
    s += path('M48 6 L52 6 L52 26 L48 26 Z', '#5a3d2c', 1.4);
    s += ell(50, 6, 5, 3, p[1], 1.4);
    return s + '</g>';
  };
  S.scarab = (p) => {
    let s = '';
    for (let i = 0; i < 3; i++) s += line('M32 ' + (40 + i * 12) + ' L22 ' + (36 + i * 14) + ' M68 ' + (40 + i * 12) + ' L78 ' + (36 + i * 14), INK, 2.4);
    s += ell(50, 58, 20, 26, p[0]);
    s += path('M38 30 Q50 22 62 30 L60 38 L40 38 Z', p[0], 1.6);
    s += path('M42 18 Q50 12 58 18 L56 26 L44 26 Z', p[1], 1.6);
    s += line('M50 38 L50 84', INK, 1.6) + line('M32 40 Q50 46 68 40', INK, 1.4);
    return s + hl('M36 52 Q38 42 46 40 Q40 48 40 60Z', 0.5);
  };
  S.ushabti = (p) => {
    let s = path('M38 22 C38 10 62 10 62 22 L66 40 C66 56 62 76 58 92 L42 92 C38 76 34 56 34 40 Z', p[0]);
    s += path('M36 22 C36 8 64 8 64 22 L66 40 L58 40 L58 26 L42 26 L42 40 L34 40 Z', '#1d5f6e', 1.6);
    s += ell(50, 28, 7, 8, p[2], 1.2);
    s += line('M38 46 L62 50 M38 50 L62 46', INK, 2);
    for (let y = 56; y < 88; y += 6) s += '<rect x="46" y="' + y + '" width="8" height="3.6" fill="' + INK + '" opacity="0.8"/>';
    return s + hl('M40 30 Q38 50 42 80 Q36 54 38 32Z');
  };
  S.amulet = (p) => {
    let s = path('M20 44 Q50 22 80 44 Q50 62 20 44 Z', p[0]);
    s += circ(50, 44, 9, '#13353d');
    s += line('M18 30 Q50 16 82 30', INK, 4) + line('M18 30 Q50 16 82 30', p[0], 2);
    s += line('M44 58 L40 80', INK, 4) + line('M44 58 L40 80', p[0], 2);
    s += line('M56 56 C62 74 76 76 74 64 C72 58 66 62 68 66', INK, 4) + line('M56 56 C62 74 76 76 74 64 C72 58 66 62 68 66', p[0], 2);
    return s + hl('M28 42 Q40 34 50 34 Q38 38 32 46Z');
  };
  S.papyrus = (p, r) => {
    let d = 'M16 14';
    for (let x = 22; x <= 84; x += 8) d += ' L' + x + ' ' + f2(12 + r() * 6);
    d += ' L' + f2(84 + r() * 4) + ' 50';
    for (let x = 84; x >= 16; x -= 9) d += ' L' + x + ' ' + f2(84 + r() * 8);
    d += ' L' + f2(14 + r() * 3) + ' 48 Z';
    let s = path(d, p[0]);
    for (let x = 22; x < 82; x += 5) s += line('M' + x + ' 18 L' + (x + 1) + ' 84', p[1], 0.6, 0.5);
    for (let y = 24; y < 80; y += 7) {
      let w = 'M22 ' + y; for (let x = 24; x < 76 - r() * 20; x += 3) w += ' l1.5 ' + f2(r() * 3 - 1.5) + ' l1.5 ' + f2(r() * 3 - 1.5);
      s += line(w, '#3a2a1a', 1.1, 0.85);
    }
    return s;
  };
  S.portrait = (p, r) => {
    let s = path('M28 8 L72 8 L74 92 L26 92 Z', '#6b4524');
    s += '<rect x="31" y="12" width="40" height="76" fill="#3d3a33"/>';
    s += path('M50 22 C38 22 34 34 35 46 C36 60 42 70 50 70 C58 70 64 60 65 46 C66 34 62 22 50 22 Z', '#c58a5e', 1.4);
    s += path('M35 40 C33 24 44 16 52 18 C62 16 68 26 65 40 C62 30 56 26 50 26 C44 26 38 30 35 40 Z', '#1d1410', 1.2);
    s += ell(43, 44, 4.4, 3, '#fff', 0.8) + ell(57, 44, 4.4, 3, '#fff', 0.8) + circ(43, 44, 2.4, '#1d1410', 0) + circ(57, 44, 2.4, '#1d1410', 0);
    s += line('M38 38 Q43 35 47 38 M53 38 Q57 35 62 38', '#1d1410', 1.6);
    s += line('M50 46 L48 56 L51 57', '#7a4a2c', 1.2) + path('M45 61 Q50 64 55 61 Q50 63 45 61 Z', '#9a3a2a', 1);
    s += path('M30 88 C34 74 42 72 50 72 C58 72 66 74 70 88 Z', '#6a2a5a', 1.2);
    s += line('M40 76 Q50 82 60 76', '#e3b33a', 2.2);
    return s + hl('M58 30 Q62 40 60 52 Q58 40 56 32Z', 0.25);
  };
  S.oilLamp = (p, r, o) => {
    const rom = o && o.type === 'lampeRom';
    let s = path('M18 58 C18 44 40 38 56 42 L80 46 C88 48 88 58 80 60 L56 64 C40 70 18 70 18 58 Z', p[0]);
    s += ell(42, 52, 14, 6, p[1], 1.4) + ell(42, 52, 8, 3.4, p[2], 1);
    s += circ(80, 53, 3, '#2b2118', 0);
    s += path('M18 54 C8 50 8 64 18 62', 'none', 3);
    if (rom) s += circ(66, 46, 3.2, p[0], 1.2) + circ(66, 60, 3.2, p[0], 1.2);
    s += path('M30 66 L54 66 L52 72 L32 72 Z', p[0], 1.4);
    return s + hl('M24 54 Q30 46 40 46 Q30 50 28 58Z');
  };
  S.cat = (p) => {
    let s = path('M40 92 C30 92 30 70 36 56 C38 46 36 36 38 28 L34 12 L44 22 L54 22 L62 12 L60 28 C64 38 62 48 62 56 C70 68 70 90 58 92 Z', p[0]);
    s += path('M58 92 C74 92 80 80 74 70', 'none', 3);
    s += circ(44, 30, 1.6, INK, 0) + circ(54, 30, 1.6, INK, 0) + line('M47 36 L49 37 L51 36', INK, 1.2);
    s += circ(42, 21, 2.2, '#e3b33a', 1);
    s += line('M40 48 Q50 52 60 48', p[2], 1.2, 0.6);
    return s + hl('M40 58 Q38 70 40 84 Q36 70 38 58Z');
  };
  S.bowl = (p) => {
    let s = path('M16 34 L84 34 C84 64 68 78 50 78 C32 78 16 64 16 34 Z', '#b6452a');
    s += ell(50, 34, 34, 6, '#c9583a', 1.6);
    s += '<rect x="40" y="78" width="20" height="8" fill="#b6452a" stroke="' + INK + '" stroke-width="1.6"/>';
    s += line('M20 46 L80 46 M22 60 L78 60', INK, 1);
    for (let x = 26; x < 76; x += 10) s += line('M' + x + ' 58 Q' + (x + 5) + ' 48 ' + (x + 10) + ' 58', INK, 1.1);
    return s + hl('M22 40 Q26 60 40 72 Q26 64 22 40Z', 0.4);
  };
  S.ingot = (p) => {
    let s = path('M14 66 L22 40 L78 40 L86 66 Z', p[0]);
    s += path('M22 40 C34 30 66 30 78 40 Z', p[2], 1.6);
    s += '<rect x="36" y="48" width="28" height="9" fill="' + p[1] + '" stroke="' + INK + '" stroke-width="1.2"/>';
    s += '<text x="50" y="55.6" font-family="Georgia,serif" font-size="6.5" text-anchor="middle" fill="#e7e9eb">L·PLANI</text>';
    return s + hl('M24 62 L28 44 L32 44 L28 62Z', 0.3);
  };
  S.figurine = (p) => {
    let s = line('M70 26 L66 92', INK, 3) + circ(70, 22, 3.4, p[0], 1.4) + line('M66 30 q-4 4 0 8 q4 4 0 8', INK, 1.4);
    s += circ(46, 22, 7, p[0]);
    s += path('M34 18 Q46 8 58 18 Z', p[1], 1.4) + path('M34 16 L26 10 L30 18 Z M58 16 L66 10 L62 18 Z', p[2], 1.2);
    s += path('M38 30 L54 30 L58 60 L54 62 L52 92 L46 92 L44 64 L40 92 L34 92 L36 60 L34 58 Z', p[0]);
    s += path('M38 30 L28 52 L32 54 L40 40 Z', p[0], 1.6) + path('M54 30 L66 38 L64 42 L54 38 Z', p[0], 1.6);
    s += path('M38 30 Q32 44 36 60 L40 46 Z', p[1], 1.2);
    return s + hl('M48 34 L52 34 L54 58 L50 58Z', 0.35);
  };
  S.flask = (p) => {
    let s = path('M45 10 L55 10 L55 14 L53 16 L53 42 C70 46 76 62 70 76 C64 90 36 90 30 76 C24 62 30 46 47 42 L47 16 L45 14 Z', p[0], 1.8, ' fill-opacity="0.85"');
    s += path('M32 68 C40 74 60 74 68 68 C66 84 34 84 32 68 Z', p[1], 0, ' opacity="0.45"');
    s += line('M36 56 Q34 66 38 74', '#d38bd8', 1.6, 0.6) + line('M64 56 Q66 66 62 74', '#f2d36b', 1.6, 0.6);
    return s + hl('M38 52 Q34 62 38 72 Q38 60 42 50Z', 0.7) + hl('M49 18 L51 18 L51 40 L49 40Z', 0.6);
  };
  S.anchorStock = (p) => {
    let s = path('M8 50 L40 44 L60 44 L92 50 L60 56 L40 56 Z', p[0]);
    s += '<rect x="42" y="40" width="16" height="20" fill="' + p[1] + '" stroke="' + INK + '" stroke-width="1.8"/>';
    s += '<rect x="46" y="44" width="8" height="12" fill="#3a2a1a" opacity="0.7"/>';
    return s + hl('M14 49 L40 46 L40 48 L16 50Z', 0.4);
  };
  S.capital = (p, r) => {
    let s = path('M18 18 L82 18 L82 30 L18 30 Z', p[0]);
    s += path('M24 30 L76 30 L66 82 L34 82 Z', p[0]);
    s += path('M30 82 L70 82 L70 90 L30 90 Z', p[1]);
    s += path('M50 36 C40 40 36 52 40 62 C44 56 48 52 50 46 C52 52 56 56 60 62 C64 52 60 40 50 36 Z', p[2], 1.2);
    s += circ(45, 46, 1.6, INK, 0) + circ(55, 46, 1.6, INK, 0);
    s += line('M28 36 C26 52 32 66 38 78 M72 36 C74 52 68 66 62 78', p[1], 1.6);
    for (let i = 0; i < 4; i++) s += line('M' + (30 + i * 12) + ' 78 q6 -10 12 0', INK, 1.2);
    s += path('M24 26 C24 20 32 20 32 26 M68 26 C68 20 76 20 76 26', 'none', 1.4);
    return s;
  };
  S.seal = (p) => {
    let s = path('M50 8 C46 8 44 14 48 16 L52 16 C56 14 54 8 50 8 Z', 'none', 2.4);
    s += path('M50 16 C70 30 74 66 50 92 C26 66 30 30 50 16 Z', p[0]);
    s += path('M50 24 C64 36 66 64 50 84 C34 64 36 36 50 24 Z', 'none', 1.2);
    s += circ(50, 42, 4, p[1], 1.2) + path('M44 48 L56 48 L58 72 L42 72 Z', p[1], 1.2) + line('M58 46 L60 74 M58 46 q4 -2 3 -6', INK, 1.4);
    for (let a = 0; a < 360; a += 20) s += circ(f2(50 + Math.cos(a * Math.PI / 180) * 15), f2(54 + Math.sin(a * Math.PI / 180) * 30), 0.9, INK, 0);
    return s + hl('M40 34 Q38 50 42 64 Q36 50 40 34Z');
  };
  S.stainedGlass = (p, r) => {
    const cols = ['#2a4e9c', '#b2302a', '#e2b23a', '#3b7d4a', '#7a3b8c', '#2a4e9c'];
    let s = path('M18 16 L80 12 L86 80 L22 88 Z', '#2a4e9c', 2.4);
    const pieces = [
      'M18 16 L48 14 L44 44 L20 46 Z', 'M48 14 L80 12 L82 40 L44 44 Z', 'M20 46 L44 44 L42 66 L21 68 Z',
      'M44 44 L82 40 L84 62 L42 66 Z', 'M21 68 L42 66 L44 87 L22 88 Z', 'M42 66 L84 62 L86 80 L44 87 Z',
    ];
    pieces.forEach((d, i) => { s += path(d, cols[(i + Math.floor(r() * 6)) % 6], 2.6, ' opacity="0.92"'); });
    s += ell(52, 40, 9, 11, '#f1d9b8', 2.4) + line('M47 38 l3 0 M54 38 l3 0 M50 44 q2 2 4 0', '#3a2a1a', 1.2);
    return s + hl('M24 20 L40 18 L28 40Z', 0.35);
  };
  S.tile = (p) => {
    let s = '<rect x="14" y="14" width="72" height="72" rx="2" fill="#a8482a" stroke="' + INK + '" stroke-width="1.8"/>';
    s += path('M50 22 C44 30 44 40 50 46 C56 40 56 30 50 22 Z M50 46 C40 44 32 48 30 56 C38 56 44 52 50 50 C56 52 62 56 70 56 C68 48 60 44 50 46 Z M44 56 L56 56 L54 62 L46 62 Z M50 62 L50 76', '#f0d8a0', 1.2);
    s += '<rect x="18" y="18" width="64" height="64" fill="none" stroke="#f0d8a0" stroke-width="2"/>';
    return s + hl('M18 18 L44 18 L18 40Z', 0.25);
  };
  S.cross = (p) => {
    let s = path('M44 8 L56 8 L56 30 L76 30 L80 26 L84 36 L80 46 L76 42 L56 42 L56 86 L60 90 L50 96 L40 90 L44 86 L44 42 L24 42 L20 46 L16 36 L20 26 L24 30 L44 30 Z', p[0]);
    s += path('M47 14 L53 14 L53 34 L72 34 L72 38 L53 38 L53 82 L47 82 L47 38 L28 38 L28 34 L47 34 Z', '#2b4f9e', 1);
    s += circ(50, 36, 5, '#b2302a', 1.4) + circ(50, 18, 2.6, '#3b7d4a', 1) + circ(50, 70, 2.6, '#3b7d4a', 1) + circ(32, 36, 2.6, '#3b7d4a', 1) + circ(68, 36, 2.6, '#3b7d4a', 1);
    return s + hl('M45 10 L48 10 L48 28 L45 28Z', 0.5);
  };
  S.manuscript = (p, r) => {
    let s = path('M20 8 L82 10 L80 92 L18 90 Z', p[0]);
    s += '<rect x="26" y="18" width="20" height="20" fill="#e3b33a" stroke="' + INK + '" stroke-width="1.4"/>';
    s += '<text x="36" y="34" font-family="Georgia,serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#2b4f9e">D</text>';
    for (let y = 20; y < 86; y += 6) s += line('M' + (y < 40 ? 50 : 26) + ' ' + y + ' L' + f2(74 - r() * 6) + ' ' + y, '#3a2a1a', 1.2, 0.75);
    s += line('M22 44 C26 54 20 64 24 74 C26 80 22 86 24 88', '#3b7d4a', 1.4);
    s += circ(22, 52, 1.8, '#b2302a', 0.6) + circ(24, 70, 1.8, '#2b4f9e', 0.6);
    return s;
  };
  S.cycladic = (p) => {
    let s = path('M42 8 C42 4 58 4 58 8 L60 22 C58 26 42 26 40 22 Z', p[0]);
    s += line('M50 12 L50 20', p[1], 1.4);
    s += path('M47 26 L53 26 L54 32 C66 34 66 44 62 52 L60 70 L56 92 L52 92 L50 74 L48 92 L44 92 L40 70 L38 52 C34 44 34 34 46 32 Z', p[0]);
    s += line('M40 46 L60 46 M41 52 L59 52', p[1], 1.4) + line('M50 74 L50 60', p[1], 1.2) + line('M42 60 Q50 64 58 60', p[1], 1);
    return s + hl('M42 34 Q38 42 40 50 Q40 42 44 36Z', 0.6);
  };
  S.jug = (p) => {
    let s = path('M30 92 C16 74 22 50 38 44 L30 14 L48 30 C64 36 80 52 72 74 C68 86 58 92 50 92 Z', p[0]);
    s += line('M70 50 C88 46 86 72 72 74', INK, 4) + line('M70 50 C86 47 84 71 72 74', p[0], 2);
    for (let i = 0; i < 6; i++) s += circ(38 + i * 6, 62 + (i % 2) * 2, 1.2, INK, 0);
    s += line('M30 70 Q50 76 72 66', p[1], 1.4);
    return s + hl('M30 58 Q30 70 36 82 Q28 72 30 58Z');
  };
  S.dagger = (p) => {
    let s = '<g transform="rotate(-25 50 50)">';
    s += path('M50 96 L40 30 L60 30 Z', p[0]);
    s += line('M50 92 L50 32', p[1], 2);
    s += path('M38 22 Q50 16 62 22 L62 30 L38 30 Z', p[1]);
    s += circ(44, 26, 1.8, p[2], 1) + circ(56, 26, 1.8, p[2], 1) + circ(50, 24, 1.8, p[2], 1);
    s += hl('M44 34 L48 34 L50 80Z', 0.35);
    return s + '</g>';
  };
  S.pan = (p) => {
    let s = path('M40 82 L36 96 L44 96 L48 82 Z M60 82 L64 96 L56 96 L52 82 Z', p[0], 1.6);
    s += circ(50, 46, 36, p[0]);
    s += circ(50, 46, 30, 'none', 1.2);
    for (let i = 0; i < 6; i++) {
      const a = i * 60 * Math.PI / 180, x = 50 + Math.cos(a) * 18, y = 46 + Math.sin(a) * 18;
      s += line('M' + f2(x) + ' ' + f2(y) + ' m-5 0 a5 5 0 1 1 5 5 a3 3 0 1 1 -3 -3', INK, 1.2);
    }
    s += line('M38 46 L62 46 M40 46 L36 40 M60 46 L64 40 M44 46 L44 42 M48 46 L48 42 M52 46 L52 42 M56 46 L56 42', INK, 1.4);
    return s + hl('M22 36 Q28 20 44 14 Q30 24 26 40Z', 0.4);
  };

  /** Fissures, éclats et patine selon l'état. */
  function wearLayer(cond, r, mat) {
    let s = '';
    if (cond < 75) {
      const n = cond < 30 ? 4 : cond < 50 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        let x = 35 + r() * 30, y = 30 + r() * 40;
        let d = 'M' + f2(x) + ' ' + f2(y);
        for (let k = 0; k < 4; k++) { x += r() * 10 - 5; y += 3 + r() * 6; d += ' L' + f2(x) + ' ' + f2(y); }
        s += line(d, INK, 1, 0.75);
      }
    }
    if (cond < 60) {
      const metal = ['bronze', 'fer', 'plomb', 'argent'].includes(mat);
      const n = Math.round((60 - cond) / 6);
      for (let i = 0; i < n; i++) s += circ(f2(30 + r() * 40), f2(26 + r() * 50), f2(1.5 + r() * 4), metal ? (mat === 'fer' ? '#8a3b1a' : '#7fb08a') : '#6b5238', 0, ' opacity="' + (metal ? 0.7 : 0.35) + '"');
    }
    return s;
  }

  A.SHAPES = S;

  /** SVG complet d'un objet. opts : {size, bg, noShadow} */
  A.objectSVG = function (obj, opts) {
    opts = opts || {};
    const t = ME.DATA.TYPES[obj.type];
    const pal = A.PAL[obj.mat] || A.PAL.pierre;
    const r = ME.seeded(obj.seed || 1);
    const rot = f2((r() - 0.5) * 10);
    const draw = S[t.shape] || S.sherd;
    const body = draw(pal, r, obj);
    const size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    const shadow = opts.noShadow ? '' : '<ellipse cx="50" cy="95" rx="30" ry="3.4" fill="#2b2118" opacity="0.18"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"' + size + ' role="img" aria-label="' + t.name + '">' + (opts.bg ? '<rect width="100" height="100" fill="' + opts.bg + '"/>' : '') + shadow +
      '<g transform="rotate(' + rot + ' 50 50)">' + body + wearLayer(obj.condition, r, obj.mat) + '</g></svg>';
  };

  /* Cache d'images pour le dessin sur canvas. */
  const cache = {};
  A.image = function (obj) {
    if (typeof Image === 'undefined') return null;
    const key = obj.id + ':' + Math.round(obj.condition / 10);
    if (cache[key]) return cache[key];
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(A.objectSVG(obj, { noShadow: true, size: 256 }));
    cache[key] = img;
    return img;
  };
})(typeof window !== 'undefined' ? window : globalThis);
