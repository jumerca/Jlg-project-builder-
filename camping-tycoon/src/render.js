/* Camping Tycoon — rendu Canvas 2,5D, style BD franco-belge (ligne claire, aplats vifs) */
(function (root) {
  'use strict';
  const D = root.CT.data, S = root.CT.sim;
  const { TERRAIN, DECO, BUILDINGS } = D;
  const TS = 32;            // pixels monde par tuile
  const SP = 3;             // sur-échantillonnage des sprites
  const INK = '#33233d';
  const C = {
    grass: '#86c95a', grass2: '#79bd4d', grassDark: '#5fa23c', path: '#ecd5a0', pathEdge: '#c49a5c', sand: '#f4e0a4', sandDot: '#d9bf7c',
    water: '#45b2e2', waterDeep: '#2c8fc8', foam: '#e9f8ff', road: '#6d7180', roadLine: '#f4d35e', cream: '#fbf3df', roofRed: '#e2553f', roofRedD: '#b63b2c',
    blue: '#3b8fd9', blueD: '#2a6aad', wood: '#c08350', woodD: '#8e5a32', leaf: '#4fae4a', leafD: '#2f7f35', leafL: '#86d36a', pine: '#3d8f55', pineD: '#256a3c', yellow: '#f6c73b'
  };
  const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- utilitaires de dessin ---------- */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function fillStroke(g, fill, lw = 1.6) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
  function box(g, x, y, w, h, fill, r = 2, lw = 1.6) { rr(g, x, y, w, h, r); fillStroke(g, fill, lw); }
  function ell(g, x, y, rx, ry, fill, lw = 1.6, stroke = true) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); } }
  function shadow(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(40,30,60,0.22)'; g.fill(); }
  function poly(g, pts, fill, lw = 1.6) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); fillStroke(g, fill, lw); }
  function text(g, t, x, y, size, color = INK, align = 'center', weight = 800) {
    g.font = `${weight} ${size}px "Fredoka","Baloo 2","Trebuchet MS",system-ui,sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(t, x, y);
  }
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(Math.min(255, Math.max(0, r * f))); g = Math.round(Math.min(255, Math.max(0, g * f))); b = Math.round(Math.min(255, Math.max(0, b * f))); return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'); };

  /* ---------- cache de sprites ---------- */
  const sprites = new Map();
  function sprite(key, w, h, ox, oy, draw) {
    let c = sprites.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil(w * SP); c.height = Math.ceil(h * SP);
      const g = c.getContext('2d'); g.scale(SP, SP); g.translate(ox, oy);
      draw(g);
      c.ox = ox; c.oy = oy; c.w = w; c.h = h;
      sprites.set(key, c);
    }
    return c;
  }

  /* ---------- objets ---------- */
  function drawTree(g, kind, v) {
    g.save(); g.translate(16, 28); g.scale(1.32, 1.32); g.translate(-16, -28);
    drawTree0(g, kind, v);
    g.restore();
  }
  function drawTree0(g, kind, v) {
    if (kind === DECO.PINE) {
      shadow(g, 16, 28, 13, 5);
      g.fillStyle = C.woodD; g.strokeStyle = INK; g.lineWidth = 1.4; rr(g, 14, 6, 4, 22, 1.5); g.fill(); g.stroke();
      ell(g, 16, 2, 15 + v * 3, 8, C.pine);
      ell(g, 13, 0, 8, 4, '#55a86b', 0, false);
      ell(g, 20, -2, 5, 2.5, '#6cbf80', 0, false);
    } else {
      shadow(g, 16, 28, 12, 5);
      g.fillStyle = C.woodD; rr(g, 14, 16, 5, 12, 1.5); g.fill(); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke();
      const s = 1 + v * 0.18;
      g.beginPath();
      g.arc(10, 12, 9 * s, 0, Math.PI * 2); g.arc(22, 11, 9 * s, 0, Math.PI * 2); g.arc(16, 3, 10 * s, 0, Math.PI * 2);
      g.fillStyle = C.leaf; g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(10, 12, 8 * s, 0, Math.PI * 2); g.arc(22, 11, 8 * s, 0, Math.PI * 2); g.arc(16, 3, 9 * s, 0, Math.PI * 2); g.fillStyle = C.leaf; g.fill();
      ell(g, 13, 0, 5, 3.5, C.leafL, 0, false); ell(g, 22, 8, 3.5, 2.5, C.leafL, 0, false);
      g.fillStyle = C.leafD; g.beginPath(); g.arc(18, 15, 3, 0, Math.PI); g.fill();
    }
  }
  function drawDeco(g, d, v) {
    if (d === DECO.FLOWERS) {
      box(g, 3, 12, 26, 14, '#7a5a3a', 6, 1.4);
      const cols = ['#ff5d73', '#ffd23f', '#ffffff', '#b06cff', '#ff9f1c'];
      for (let i = 0; i < 9; i++) { const x = 7 + (i % 5) * 4.5 + (i > 4 ? 2 : 0), y = 16 + (i > 4 ? 5 : 0) - (i % 2); ell(g, x, y - 2, 2.2, 2.2, '#3f9b3f', 0, false); ell(g, x, y - 3, 1.8, 1.8, cols[(i + Math.floor(v * 5)) % 5], 0.8); }
    } else if (d === DECO.HEDGE) {
      shadow(g, 16, 27, 15, 4);
      box(g, 1, 10, 30, 16, '#4c9e43', 7, 1.6);
      ell(g, 9, 13, 4, 2, '#73c060', 0, false); ell(g, 22, 14, 4, 2, '#73c060', 0, false);
    } else if (d === DECO.BENCH) {
      shadow(g, 16, 25, 12, 3);
      box(g, 5, 13, 22, 4, C.wood, 1.5, 1.3); box(g, 5, 18, 22, 4, C.wood, 1.5, 1.3);
      g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(7, 22); g.lineTo(7, 26); g.moveTo(25, 22); g.lineTo(25, 26); g.stroke();
    } else if (d === DECO.LAMP) {
      shadow(g, 16, 28, 5, 2);
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 28); g.lineTo(16, 0); g.stroke();
      g.strokeStyle = '#4a4f63'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(16, 28); g.lineTo(16, 0); g.stroke();
      box(g, 11, -6, 10, 8, '#fff2b8', 2, 1.4);
    }
  }

  function drawReception(g, w, h, name) {
    const W = w * TS, Hh = h * TS;
    shadow(g, W / 2, Hh - 4, W / 2, 8);
    box(g, 6, 18, W - 12, Hh - 22, C.cream, 3);
    // colombages
    g.strokeStyle = C.woodD; g.lineWidth = 2; g.beginPath(); for (let x = 16; x < W - 10; x += 18) { g.moveTo(x, 20); g.lineTo(x, Hh - 6); } g.stroke();
    poly(g, [0, 22, W / 2, -14, W, 22], C.roofRed, 2);
    g.strokeStyle = C.roofRedD; g.lineWidth = 1.2; for (let i = 1; i < 5; i++) { g.beginPath(); const t = i / 5; g.moveTo(W / 2 * (1 - t), 22 - 36 * (1 - t) * 1); g.lineTo(W / 2 * (1 - t) + 2, 22 - 36 * (1 - t)); g.stroke(); }
    for (let y = 0; y < 30; y += 7) { g.beginPath(); g.moveTo(W / 2 - (y + 6) * 1.33, 22 - (36 - y - 6) + 0); g.lineTo(W / 2 + (y + 6) * 1.33, 22 - (36 - y - 6)); g.stroke(); }
    poly(g, [0, 22, W / 2, -14, W, 22], 'rgba(0,0,0,0)', 2);
    box(g, W / 2 - 8, Hh - 26, 16, 22, '#7a4b2a', 2); ell(g, W / 2 + 4, Hh - 15, 1.2, 1.2, C.yellow, 0, false);
    box(g, 12, Hh - 28, 16, 12, '#9fd8f5', 2); box(g, W - 28, Hh - 28, 16, 12, '#9fd8f5', 2);
    box(g, 11, Hh - 16, 18, 4, '#e2553f', 1, 1.2); box(g, W - 29, Hh - 16, 18, 4, '#e2553f', 1, 1.2);
    box(g, W / 2 - 26, 14, 52, 13, C.yellow, 3, 1.8); text(g, 'ACCUEIL', W / 2, 20.5, 9);
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(W - 4, Hh - 4); g.lineTo(W - 4, -18); g.stroke();
    poly(g, [W - 4, -18, W + 12, -13, W - 4, -8], '#2a9dd8', 1.2);
    void name;
  }
  function drawSanitary(g, w, h) {
    const W = w * TS, Hh = h * TS;
    shadow(g, W / 2, Hh - 4, W / 2, 8);
    box(g, 4, 14, W - 8, Hh - 18, '#f4f7fb', 3);
    g.fillStyle = '#cfe6f5'; g.fillRect(6, Hh - 14, W - 12, 8);
    poly(g, [-2, 16, 6, 2, W - 6, 2, W + 2, 16], C.blue, 2);
    g.strokeStyle = C.blueD; g.lineWidth = 1.2; for (let x = 12; x < W - 6; x += 8) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x - 2, 15); g.stroke(); }
    const doors = [[14, '#e2553f', '♀'], [W / 2 - 6, '#2a9dd8', '♂'], [W - 26, '#2f9e6b', '🚿']];
    for (const [x, col, sym] of doors) { box(g, x, Hh - 30, 12, 24, col, 2); text(g, sym === '🚿' ? '≋' : sym, x + 6, Hh - 22, 9, '#fff'); }
    box(g, W / 2 - 18, 18, 36, 8, '#ffffff', 2, 1.2); text(g, 'SANITAIRES', W / 2, 22.5, 6);
  }
  function drawShop(g, w, h) {
    const W = w * TS, Hh = h * TS;
    shadow(g, W / 2, Hh - 4, W / 2, 7);
    box(g, 3, 8, W - 6, Hh - 12, '#e8b77a', 3);
    g.strokeStyle = C.woodD; g.lineWidth = 1; for (let y = 14; y < Hh - 6; y += 6) { g.beginPath(); g.moveTo(4, y); g.lineTo(W - 4, y); g.stroke(); }
    poly(g, [0, 10, 4, -4, W - 4, -4, W, 10], C.roofRedD, 2);
    // store rayé
    for (let i = 0; i < 6; i++) { const x0 = 2 + i * ((W - 4) / 6); poly(g, [x0, 16, x0 + (W - 4) / 6, 16, x0 + (W - 4) / 6, 24, x0, 24], i % 2 ? '#ffffff' : '#e8553d', 1.2); }
    for (let i = 0; i < 6; i++) { const x0 = 2 + i * ((W - 4) / 6); g.beginPath(); g.arc(x0 + (W - 4) / 12, 24, (W - 4) / 12, 0, Math.PI); g.fillStyle = i % 2 ? '#ffffff' : '#e8553d'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = INK; g.stroke(); }
    box(g, 6, 1, W - 12, 10, C.yellow, 2, 1.4); text(g, 'ÉPICERIE', W / 2, 6.5, 7);
    box(g, 6, Hh - 22, 20, 16, '#9fd8f5', 2); box(g, W - 22, Hh - 26, 14, 20, '#7a4b2a', 2);
    // cagettes
    box(g, 4, Hh - 10, 12, 7, C.wood, 1, 1.2); for (let i = 0; i < 3; i++) ell(g, 7 + i * 3, Hh - 11, 1.8, 1.8, ['#ff7a3d', '#ffd23f', '#7ac943'][i], 0.8);
    box(g, 17, Hh - 10, 12, 7, C.wood, 1, 1.2); for (let i = 0; i < 3; i++) ell(g, 20 + i * 3, Hh - 11, 1.8, 1.8, '#e8553d', 0.8);
  }
  function drawPoolBase(g, w, h) {
    const W = w * TS, Hh = h * TS;
    box(g, 0, 0, W, Hh, '#efe2c4', 6, 2);
    g.strokeStyle = 'rgba(160,130,90,0.35)'; g.lineWidth = 1; for (let x = 8; x < W; x += 12) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x, Hh - 2); g.stroke(); }
    box(g, 14, 16, W - 28, Hh - 40, '#d7f0fb', 10, 2);
    box(g, 18, 20, W - 36, Hh - 48, C.water, 8, 1.4);
    // échelles
    for (const x of [W - 30, 26]) { g.strokeStyle = '#c9ced8'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 22); g.moveTo(x + 6, 14); g.lineTo(x + 6, 22); g.stroke(); }
    // transats et parasols
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 34;
      box(g, x, Hh - 20, 22, 8, i % 2 ? '#ffffff' : '#ffd23f', 3, 1.3);
      g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 26, Hh - 10); g.lineTo(x + 26, Hh - 24); g.stroke();
    }
    for (let i = 0; i < 4; i++) { const x = 40 + i * 34; poly(g, [x - 10, Hh - 26, x, Hh - 32, x + 10, Hh - 26], i % 2 ? '#e8553d' : '#2a9dd8', 1.2); }
    // haie de clôture
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
  }

  function drawStage(g, w, h) {
    const W = w * TS, Hh = h * TS;
    box(g, 2, 2, W - 4, Hh - 4, '#9bd66c', 8, 1.4);
    // gradins / bancs
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) box(g, 10 + i * 38, 58 + r * 11, 32, 5, C.wood, 1.5, 1.1);
    // plateau
    shadow(g, W / 2, 48, W / 2 - 6, 6);
    box(g, 8, 26, W - 16, 22, '#c08350', 3, 1.8);
    g.strokeStyle = C.woodD; g.lineWidth = 1; for (let x = 16; x < W - 10; x += 10) { g.beginPath(); g.moveTo(x, 28); g.lineTo(x, 46); g.stroke(); }
    // fond de scène + rideaux
    box(g, 12, -12, W - 24, 40, '#4a2a6a', 3, 1.8);
    poly(g, [12, -12, 34, -12, 26, 28, 12, 28], '#e8553d', 1.6);
    poly(g, [W - 12, -12, W - 34, -12, W - 26, 28, W - 12, 28], '#e8553d', 1.6);
    box(g, 8, -20, W - 16, 10, '#e8553d', 3, 1.8);
    box(g, W / 2 - 24, -26, 48, 13, C.yellow, 3, 1.6); text(g, 'SCÈNE', W / 2, -19.5, 8);
    // guirlande
    g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(4, -14); g.quadraticCurveTo(W / 2, 8, W - 4, -14); g.stroke();
    for (let i = 1; i < 10; i++) { const t = i / 10, x = 4 + (W - 8) * t, y = -14 + 2 * (1 - t) * t * 22 * 2; ell(g, x, y + 2, 2.2, 2.2, ['#ffd23f', '#ff5d73', '#3ccfc0', '#ffffff'][i % 4], 0.8); }
    // enceintes
    box(g, 2, 14, 10, 16, '#33384d', 2, 1.3); box(g, W - 12, 14, 10, 16, '#33384d', 2, 1.3);
    ell(g, 7, 22, 3, 3, '#666', 0.8); ell(g, W - 7, 22, 3, 3, '#666', 0.8);
  }

  function drawSnack(g, w, h) {
    const W = w * TS, Hh = h * TS;
    box(g, 2, 22, W - 4, Hh - 24, '#e9d3a8', 5, 1.4);
    g.strokeStyle = 'rgba(150,110,60,.35)'; g.lineWidth = 1; for (let x = 10; x < W - 4; x += 10) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, Hh - 4); g.stroke(); }
    // kiosque
    shadow(g, W / 2, 26, W / 2 - 8, 4);
    box(g, 10, -2, W - 20, 26, '#ffffff', 3, 1.8);
    box(g, 14, 10, W - 28, 12, '#7a4b2a', 2, 1.3);
    poly(g, [6, 0, 14, -14, W - 14, -14, W - 6, 0], '#2f9e6b', 1.8);
    for (let i = 0; i < 7; i++) { const x0 = 6 + i * ((W - 12) / 7); g.beginPath(); g.arc(x0 + (W - 12) / 14, 0, (W - 12) / 14, 0, Math.PI); g.fillStyle = i % 2 ? '#ffffff' : '#2f9e6b'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = INK; g.stroke(); }
    box(g, W / 2 - 20, -24, 40, 12, '#ffd23f', 3, 1.5); text(g, 'SNACK', W / 2, -17.5, 7.5);
    ell(g, 22, 7, 5, 5, '#f6c26b', 1.2); ell(g, 22, 7, 3, 3, '#e8553d', 0, false); // pizza
    box(g, W - 30, 3, 8, 8, '#ff7fa3', 3, 1.1); // glace
    drawTables(g, [[18, 44], [48, 50], [78, 42]]);
  }
  function drawTables(g, pts) {
    pts.forEach(([x, y], i) => {
      shadow(g, x, y + 6, 10, 3);
      ell(g, x, y + 2, 7, 4, '#ffffff', 1.2);
      g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x, y - 14); g.stroke();
      poly(g, [x - 13, y - 12, x, y - 20, x + 13, y - 12], ['#e8553d', '#2a9dd8', '#ffd23f', '#2f9e6b'][i % 4], 1.3);
    });
  }
  function drawUpgrade(g, type, w, h) {
    const W = w * TS, Hh = h * TS;
    if (type === 'mobilhome') {
      ell(g, W - 20, Hh - 14, 10, 6, '#bfe9ff', 1.4); ell(g, W - 20, Hh - 14, 7, 3.6, '#45b2e2', 0, false);
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.beginPath(); g.arc(W - 22, Hh - 15, 2, 0, 7); g.stroke();
      g.strokeStyle = '#e3a400'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(4, 1); g.lineTo(W - 26, 1); g.stroke();
      box(g, 6, Hh - 18, 30, 8, '#33233d', 2, 1); text(g, 'PREMIUM', 21, Hh - 13.8, 5, '#ffd23f');
    } else if (type === 'sanitary') {
      for (let i = 0; i < 4; i++) { box(g, 12 + i * 18, 3, 15, 9, '#2c3e78', 1, 1.1); g.strokeStyle = 'rgba(160,200,255,.6)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(12 + i * 18 + 7.5, 4); g.lineTo(12 + i * 18 + 7.5, 11); g.moveTo(13 + i * 18, 7.5); g.lineTo(26 + i * 18, 7.5); g.stroke(); }
      box(g, W / 2 - 18, 28, 36, 7, '#ffd23f', 2, 1); text(g, 'CONFORT', W / 2, 31.8, 5);
    } else if (type === 'reception') {
      poly(g, [4, Hh - 34, W - 4, Hh - 34, W, Hh - 26, 0, Hh - 26], '#2f9e6b', 1.4);
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#fff' : '#2f9e6b'; g.fillRect(4 + i * ((W - 8) / 6), Hh - 30, (W - 8) / 6, 4); }
      for (const x of [-6, W + 4]) { g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, Hh); g.lineTo(x, Hh - 34); g.stroke(); poly(g, [x, Hh - 34, x + 10, Hh - 31, x, Hh - 28], x < 0 ? '#e8553d' : '#ffd23f', 1); }
    } else if (type === 'shop') {
      box(g, 3, 0, W - 6, 11, '#2f9e6b', 2, 1.4); text(g, 'SUPÉRETTE', W / 2, 5.6, 6.5, '#fff');
      box(g, W - 14, Hh - 12, 11, 8, C.wood, 1, 1.1); for (let i = 0; i < 2; i++) ell(g, W - 11 + i * 4, Hh - 13, 1.8, 1.8, '#7ac943', 0.8);
    } else if (type === 'pool') {
      // toboggan
      box(g, 2, 4, 16, 16, '#d9dee8', 2, 1.4);
      g.lineCap = 'round';
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(12, 8); g.bezierCurveTo(-14, 20, 40, 34, 20, 54); g.bezierCurveTo(10, 66, 30, 70, 40, 60); g.stroke();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.stroke();
      g.strokeStyle = '#e8553d'; g.lineWidth = 2; g.setLineDash([4, 5]); g.stroke(); g.setLineDash([]);
      g.lineCap = 'butt';
    } else if (type === 'stage') {
      poly(g, [0, -10, W / 2, -42, W, -10], '#e8553d', 2);
      for (let i = 1; i < 6; i += 2) poly(g, [W / 2, -42, (W / 6) * i, -10, (W / 6) * (i + 1), -10], '#ffffff', 1);
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -10); g.lineTo(2, 30); g.moveTo(W - 2, -10); g.lineTo(W - 2, 30); g.stroke();
      poly(g, [W / 2, -42, W / 2 + 12, -46, W / 2, -50], '#ffd23f', 1);
    } else if (type === 'snack') {
      drawTables(g, [[30, 58], [62, 58]]);
    }
  }

  /* ---------- Grands équipements V1.7 : décors dessinés à la main, volume 2,5D ---------- */
  function drawMinigolf(g, w, h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-4,W/2-5,11);
    box(g,3,6,W-6,H-12,'#2e865a',11,2);
    box(g,8,10,W-16,H-22,'#7ec45f',8,1.5);
    for(let n=0;n<6;n++) {
      const col=n%3,row=Math.floor(n/3);
      const x=12+col*37, y=18+row*32;
      box(g,x,y,32,24,'#397f4a',7,1.5);
      box(g,x+3,y+3,26,18,n%2?'#91c766':'#a3d77d',6,0.8);
      g.strokeStyle='#f1e5c2';g.lineWidth=2;g.beginPath();
      g.moveTo(x+7,y+16);g.quadraticCurveTo(x+18,y+6,x+25,y+11);g.stroke();
      ell(g,x+25,y+11,2.5,1.5,'#2b553b',.7);
      ell(g,x+8,y+17,1.7,1.7,'#fff',.6);
      if(n===2 || n===4){box(g,x+14,y+6,5,11,'#ce9b59',1,.7);
        poly(g,[x+17,y+5,x+14,y+2,x+20,y+2],'#fff3c4',.6);}
    }
    // Haies en volume, arbres ornementaux et panneau de bienvenue.
    for(const [x,y] of [[9,11],[W-9,11],[9,H-12],[W-9,H-12]]) {
      ell(g,x,y,5,5,'#37934f',1);
      ell(g,x-1,y-2,3.1,2.2,'#8be093',0,false);
    }
    box(g,40,-8,W-80,15,'#f4c348',3,1.8);
    text(g,'MINI-GOLF',W/2,-.5,8.5);
  }
  function drawMultisport(g,w,h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-2,W/2-4,9);
    box(g,3,5,W-6,H-12,'#5c9c77',7,2);
    box(g,8,10,W-16,H-22,'#3f9d83',5,1.6);
    g.strokeStyle='#f1f5e8';g.lineWidth=1.7;
    g.strokeRect(13,15,W-26,H-33);
    g.beginPath();g.moveTo(W/2,15);g.lineTo(W/2,H-18);
    g.ellipse(W/2,(H-3)/2,13,13,0,0,7);g.stroke();
    g.beginPath();g.arc(18,H/2,13,-1.2,1.2);g.arc(W-18,H/2,13,1.9,4.4);g.stroke();
    // Cages dessinées en volume avec filet.
    for(const x of [9,W-9]) {
      g.strokeStyle='#edf5eb';g.lineWidth=2.2;
      g.beginPath();g.moveTo(x,H/2-12);g.lineTo(x+(x<W/2?7:-7),H/2-17);
      g.lineTo(x+(x<W/2?7:-7),H/2+14);g.lineTo(x,H/2+10);g.closePath();g.stroke();
      g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=.6;
      for(let y=H/2-10;y<H/2+12;y+=5){g.beginPath();g.moveTo(x,y);g.lineTo(x+(x<W/2?7:-7),y);g.stroke();}
    }
    // Paniers de basket au-dessus des cages.
    for(const x of [22,W-22]) {
      g.strokeStyle='#41445c';g.lineWidth=2;g.beginPath();g.moveTo(x,14);g.lineTo(x,3);g.stroke();
      box(g,x-6,-3,12,8,'#e5f5f8',1,1);
      ell(g,x,7,4,1.5,'#f8b44c',1);
    }
    box(g,W/2-27,-8,54,14,'#f8cb4f',3,1.6);
    text(g,'MULTISPORTS',W/2,-1,7.2);
  }
  function drawBikeHire(g,w,h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-3,W/2-3,9);
    box(g,3,18,W-6,H-23,'#d9c49a',4,1.7);
    // Auvent en pente et façade bois avec vitrage.
    box(g,9,5,W-18,34,'#f3ead8',4,1.5);
    poly(g,[3,10,12,-11,W-13,-11,W-3,10],'#eaa344',2);
    g.strokeStyle='#ba7433';g.lineWidth=1.1;
    for(let i=0;i<4;i++){const x=18+i*18;g.beginPath();g.moveTo(x,-8);g.lineTo(x+4,8);g.stroke();}
    box(g,12,15,18,15,'#b7dfe3',2,1.1);
    box(g,W-32,15,19,15,'#b7dfe3',2,1.1);
    box(g,W/2-7,19,14,22,'#bc8059',2,1.5);
    text(g,'VÉLOS',W/2,8,7.2,'#fff');
    // Plusieurs vélos avec roues, cadres et guidons.
    for(let i=0;i<3;i++){
      const x=15+i*31,y=H-13;
      g.strokeStyle=INK;g.lineWidth=1.8;
      for(const off of [0,15]){g.beginPath();g.arc(x+off,y,5.3,0,7);g.stroke();}
      g.beginPath();g.moveTo(x,y);g.lineTo(x+6,y-9);g.lineTo(x+15,y);
      g.lineTo(x+9,y);g.lineTo(x+6,y-9);g.lineTo(x+8,y-12);
      g.moveTo(x+15,y);g.lineTo(x+12,y-12);g.lineTo(x+17,y-12);g.stroke();
      g.strokeStyle=['#e65f4b','#2e9bc7','#f5ba37'][i];g.lineWidth=2;g.stroke();
      g.fillStyle='#3e4355';g.fillRect(x+3,y-13,10,2);
    }
  }
  function drawLaundry(g,w,h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-3,W/2-3,8);
    box(g,3,12,W-6,H-18,'#f5ede0',4,1.8);
    poly(g,[0,13,W/2,-10,W,13],'#527ba6',2);
    box(g,9,20,W-18,30,'#d6e5ea',2,1.2);
    for(let i=0;i<2;i++){
      const cx=18+i*27;
      box(g,cx-10,23,20,23,'#fff',3,1);
      ell(g,cx,37,7,7,'#447aa2',1.5);
      ell(g,cx,37,4.5,4.5,'#b4e0ef',0,false);
      ell(g,cx-6,27,1.2,1.2,'#5aaed9',0,false);
    }
    box(g,10,8,W-20,10,'#fbd364',3,1.2);
    text(g,'LAVERIE',W/2,13,6.4);
    box(g,W-10,36,6,19,'#559f64',2,1);
  }


  /* V1.8 — bâtiments vectoriels conçus spécialement pour Camping Tycoon.
     Volumes peints (toitures, façades, estrades, rambardes), pas de textures externes. */
  function drawPetanque(g,w,h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-3,W/2-3,8);
    box(g,3,7,W-6,H-13,'#ba996d',7,2);
    for(let i=0;i<3;i++){
      const x=7+i*39;
      box(g,x,11,36,H-23,'#e6c892',4,1.2);
      g.fillStyle='rgba(130,87,49,.2)';
      for(let j=0;j<20;j++){const vx=x+4+hash(i*33+j,12)*28,vy=15+hash(99,i*19+j)*(H-31);g.fillRect(vx,vy,1.1,1.1);}
      // Cochonnet rouge et boules de métal groupées.
      ell(g,x+18,36+i%2*5,1.8,1.8,'#e95948',.7);
      for(let k=0;k<4;k++){
        const px=x+10+(k%2)*10+(i%2)*3,py=29+Math.floor(k/2)*11;
        ell(g,px,py,3.1,2.5,'#a7bac5',1);
        ell(g,px-1,py-1,.8,.8,'#fff',0,false);
      }
    }
    // Bancs extérieurs et pergola en trois-quarts.
    for(const x of [13,W-35]) {
      box(g,x,H-10,26,4,'#8b623e',1,1);
      g.strokeStyle=INK;g.lineWidth=1.4;g.beginPath();
      g.moveTo(x+4,H-6);g.lineTo(x+4,H-2);g.moveTo(x+22,H-6);g.lineTo(x+22,H-2);g.stroke();
    }
    box(g,W/2-25,-10,50,16,'#8d5339',3,1.6);
    text(g,'PÉTANQUE',W/2,-1.5,7.5,'#fff');
  }
  function drawCinema(g,w,h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-3,W/2-3,8);
    box(g,4,7,W-8,H-13,'#7fa35d',5,1.8);
    // Théâtre en perspective, écran haut et face de projection.
    poly(g,[15,10,24,-31,W-24,-31,W-15,10],'#3a435c',2);
    box(g,21,-25,W-42,44,'#f4efe1',3,2.3);
    box(g,28,-19,W-56,31,'#263a5d',2,1);
    poly(g,[30,9,W/2-12,-11,W/2+9,0,W-32,9],'#4678a5',1);
    ell(g,W/2+14,-11,6,6,'#ffd27c',0,false);
    // Bancs rangés en arc et projecteur.
    for(let row=0;row<3;row++){
      const y=35+row*17;
      for(let i=0;i<5;i++) {
        const x=17+i*22+((row%2)*7);
        box(g,x-8,y-3,17,6,row%2?'#e7c17e':'#f3d296',2,1);
        g.strokeStyle='#6c5540';g.lineWidth=1.5;g.beginPath();
        g.moveTo(x-7,y+3);g.lineTo(x-7,y+5);g.moveTo(x+8,y+3);g.lineTo(x+8,y+5);g.stroke();
      }
    }
    box(g,W-23,H-28,13,17,'#655e69',2,1.3);
    ell(g,W-16,H-26,4.5,3.2,'#d8e8ee',1);
    // Structure guirlande au-dessus de l'assistance.
    g.strokeStyle='#71604e';g.lineWidth=1.6;
    g.beginPath();g.moveTo(8,13);g.quadraticCurveTo(W/2,37,W-8,13);g.stroke();
    for(let i=0;i<9;i++){const x=12+i*(W-24)/8, y=14+Math.sin(i/8*Math.PI)*10;
      ell(g,x,y,2,2,['#ffd66d','#f8b2b3','#bbdff7'][i%3],.5);}
    box(g,W/2-27,-38,54,12,'#e0a33c',2,1);
    text(g,'CINÉ PLEIN AIR',W/2,-32,6.2);
  }
  function drawBakery(g,w,h) {
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-3,W/2-3,10);
    box(g,6,12,W-12,H-18,'#f8ecda',4,1.8);
    poly(g,[0,15,W/2,-19,W,15],'#d96749',2);
    // Tuiles tracées et cheminée maçonnée.
    g.strokeStyle='rgba(144,60,51,.7)';g.lineWidth=1;
    for(let x=12;x<W-10;x+=13){g.beginPath();g.moveTo(x,3);g.lineTo(x+10,10);g.stroke();}
    box(g,W-25,-18,11,22,'#aa7354',1,1.3);
    box(g,W-27,-21,15,5,'#765442',1,1);
    // Vitrine avec pains et corbeille de croissants.
    box(g,9,21,35,23,'#bce5ed',2,1.5);
    box(g,48,18,38,28,'#8d634c',2,1.4);
    box(g,50,20,34,24,'#f9e8b9',2,.8);
    for(let i=0;i<4;i++) {
      const x=14+i*8;
      ell(g,x,37,3.2,2.4,'#d89945',.7);
      g.strokeStyle='#fff1bc';g.lineWidth=.6;g.beginPath();g.moveTo(x-2,35);g.lineTo(x+2,36);g.stroke();
    }
    for(const [x,y] of [[57,29],[69,29],[62,38],[74,38]]){
      ell(g,x,y,4.4,3,'#bc7c40',.7);
      g.strokeStyle='#f5d19c';g.lineWidth=1;g.beginPath();g.moveTo(x-2,y);g.lineTo(x+2,y);g.stroke();
    }
    box(g,W/2-24,-7,48,14,'#f4ce73',3,1.4);
    text(g,'BOULANGERIE',W/2,0,6.3);
    // La terrasse du matin.
    ell(g,20,H-9,11,4.5,'#ffffff',1.1);
    g.strokeStyle=INK;g.lineWidth=1.5;g.beginPath();g.moveTo(20,H-7);g.lineTo(20,H-2);g.stroke();
  }
  function drawSpa(g,w,h){
    const W=w*TS,H=h*TS;
    shadow(g,W/2,H-4,W/2-4,10);
    box(g,4,8,W-8,H-15,'#d7cbb0',7,2);
    // Pergola haute avec lattes projetées sur le sol.
    for(let x=9;x<W-5;x+=18) {
      box(g,x,5,4,H-13,'#b78a56',1,.9);
      g.fillStyle='rgba(139,98,51,.1)';g.fillRect(x+7,18,4,H-29);
    }
    box(g,12,13,W-24,8,'#996b47',2,1.4);
    for(let x=15;x<W-13;x+=11) {
      g.strokeStyle='#d9b782';g.lineWidth=2;g.beginPath();g.moveTo(x,18);g.lineTo(x+4,23);g.stroke();
    }
    // Bassin avec double rebord, eau et reflets.
    box(g,24,30,W-48,H-47,'#f6ebd2',11,2);
    box(g,30,35,W-60,H-59,'#74bbcf',10,1.5);
    for(let i=0;i<6;i++){
      const x=40+((i*19)%(W-80)), y=43+(i%2)*18;
      ell(g,x,y,4.2,2.2,'rgba(224,253,255,.75)',0,false);
    }
    // Transats et arbustes.
    for(const x of [11,W-22]) {
      box(g,x,H-33,11,21,'#f7e0a2',2,1.2);
      g.strokeStyle='#976a47';g.lineWidth=1;
      g.beginPath();g.moveTo(x,H-12);g.lineTo(x+12,H-9);g.stroke();
    }
    for(const [x,y] of [[11,16],[W-11,16],[W-12,H-10]]) {
      ell(g,x,y,5,5,'#4e9f58',1);
      ell(g,x-1,y-2,3,2,'#a1dc88',0,false);
    }
    box(g,W/2-28,-11,56,16,'#a87851',3,1.4);
    text(g,'BIEN-ÊTRE',W/2,-2.5,7,'#fff');
  }

  function drawPlayground(g, w, h) {
    const W = w * TS, Hh = h * TS;
    box(g, 2, 4, W - 4, Hh - 8, '#f2d89a', 8, 1.6);
    // balançoire
    g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(6, Hh - 10); g.lineTo(12, 8); g.lineTo(18, Hh - 10); g.moveTo(30, Hh - 10); g.lineTo(36, 8); g.lineTo(42, Hh - 10); g.moveTo(12, 8); g.lineTo(36, 8); g.stroke();
    g.strokeStyle = '#e8553d'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 8); g.lineTo(36, 8); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 9); g.lineTo(20, 26); g.moveTo(27, 9); g.lineTo(27, 26); g.stroke();
    box(g, 18, 25, 11, 3, '#2a9dd8', 1, 1);
    // toboggan
    box(g, 44, 18, 12, 24, '#ffd23f', 2, 1.6);
    poly(g, [46, 22, 54, 22, 40, 52, 32, 52], '#2f9e6b', 1.6);
    box(g, 8, Hh - 22, 20, 12, '#f8e7bd', 4, 1.3);
  }
  function drawMobilhome(g, w, h, num, stage) {
    const W = w * TS, Hh = h * TS;
    const accent = ['#2a9dd8', '#2f9e6b', '#e8553d', '#f2a516', '#9b4dca'][num % 5];
    shadow(g, W / 2, Hh - 3, W / 2, 7);
    // terrasse bois
    box(g, W - 38, Hh - 26, 36, 24, C.wood, 2, 1.4);
    g.strokeStyle = C.woodD; g.lineWidth = 1; for (let x = W - 34; x < W - 2; x += 5) { g.beginPath(); g.moveTo(x, Hh - 25); g.lineTo(x, Hh - 3); g.stroke(); }
    box(g, 2, 6, W - 30, Hh - 12, '#f6f2ea', 3);
    g.strokeStyle = 'rgba(80,70,90,0.25)'; g.lineWidth = 1; for (let y = 12; y < Hh - 8; y += 5) { g.beginPath(); g.moveTo(4, y); g.lineTo(W - 30, y); g.stroke(); }
    poly(g, [0, 8, 4, 0, W - 26, 0, W - 22, 8], '#8c8f9e', 1.8);
    g.fillStyle = accent; g.fillRect(3, Hh - 14, W - 32, 3);
    box(g, 8, 14, 14, 10, '#9fd8f5', 2, 1.3); box(g, 28, 14, 14, 10, '#9fd8f5', 2, 1.3);
    box(g, W - 44, 14, 10, 24, accent, 2, 1.3);
    // table + parasol
    ell(g, W - 18, Hh - 12, 6, 3.5, '#ffffff', 1.2);
    g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.moveTo(W - 18, Hh - 12); g.lineTo(W - 18, Hh - 30); g.stroke();
    poly(g, [W - 32, Hh - 28, W - 18, Hh - 36, W - 4, Hh - 28], accent, 1.4);
    void stage;
  }
  function drawTentPitchBits(g, num) {
    // haie d'angle + borne
    for (const [x, y] of [[0, 0], [56, 0]]) box(g, x, y + 2, 8, 6, '#4c9e43', 3, 1.2);
    box(g, 2, 46, 5, 14, '#d0d4de', 1.5, 1.2); ell(g, 4.5, 47, 2, 1.2, '#2f9e6b', 0.8);
    box(g, 50, 52, 12, 8, '#ffffff', 2, 1.1); text(g, String(num), 56, 56.5, 6);
  }
  function drawTent(g, color, variant) {
    if (variant % 2) { // dôme
      shadow(g, 22, 30, 20, 5);
      g.beginPath(); g.moveTo(4, 30); g.quadraticCurveTo(22, -6, 40, 30); g.closePath(); fillStroke(g, color, 1.8);
      g.beginPath(); g.moveTo(22, 30); g.quadraticCurveTo(22, 8, 22, 6); g.lineWidth = 1.2; g.strokeStyle = shade(color, 0.7); g.stroke();
      g.beginPath(); g.moveTo(15, 30); g.quadraticCurveTo(22, 14, 29, 30); g.closePath(); fillStroke(g, shade(color, 0.6), 1.2);
    } else { // canadienne
      shadow(g, 22, 30, 21, 5);
      poly(g, [2, 30, 14, 4, 42, 4, 44, 30], shade(color, 0.85), 1.8);
      poly(g, [2, 30, 14, 4, 26, 30], color, 1.8);
      poly(g, [9, 30, 14, 16, 19, 30], shade(color, 0.55), 1.2);
    }
  }
  function drawCar(g, color) {
    shadow(g, 14, 22, 15, 4);
    box(g, 0, 8, 28, 13, color, 5, 1.6);
    box(g, 5, 2, 17, 10, shade(color, 1.15), 4, 1.5);
    box(g, 7, 4, 6, 6, '#bfe6fa', 1.5, 1); box(g, 14, 4, 6, 6, '#bfe6fa', 1.5, 1);
    ell(g, 7, 21, 3.5, 3.5, '#2b2b35', 1.2); ell(g, 21, 21, 3.5, 3.5, '#2b2b35', 1.2);
  }
  function drawCaravan(g, color, camper) {
    if (camper) {
      shadow(g, 30, 34, 30, 6);
      box(g, 2, 6, 54, 26, '#f7f4ee', 6, 1.8);
      box(g, 38, 14, 18, 18, '#f7f4ee', 4, 1.6); box(g, 44, 16, 10, 8, '#bfe6fa', 2, 1.2);
      g.fillStyle = color; g.fillRect(3, 22, 52, 4);
      box(g, 8, 11, 12, 8, '#bfe6fa', 2, 1.2); box(g, 24, 14, 9, 16, shade(color, 0.8), 2, 1.2);
      ell(g, 14, 32, 4.5, 4.5, '#2b2b35', 1.2); ell(g, 46, 32, 4.5, 4.5, '#2b2b35', 1.2);
    } else {
      shadow(g, 26, 32, 28, 6);
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(48, 26); g.lineTo(58, 28); g.stroke();
      box(g, 2, 4, 46, 26, '#fbf8f0', 10, 1.8);
      g.fillStyle = color; g.fillRect(3, 19, 44, 4);
      box(g, 8, 9, 14, 8, '#bfe6fa', 3, 1.2); box(g, 30, 10, 10, 18, shade(color, 0.8), 2, 1.2);
      ell(g, 24, 31, 4.5, 4.5, '#2b2b35', 1.2);
      // auvent
      poly(g, [0, 8, -10, 18, -10, 30, 0, 26], shade(color, 1.2), 1.4);
    }
  }
  function drawCaravanPitchBits(g, num) {
    box(g, 2, 2, 7, 5, '#4c9e43', 3, 1.2); box(g, 87, 2, 7, 5, '#4c9e43', 3, 1.2);
    box(g, 88, 44, 5, 14, '#d0d4de', 1.5, 1.2); ell(g, 90.5, 45, 2, 1.2, '#2f9e6b', 0.8);
    box(g, 4, 52, 12, 8, '#ffffff', 2, 1.1); text(g, String(num), 10, 56.5, 6);
  }
  function drawSite(g, w, h, progress, total) {
    const W = w * TS, Hh = h * TS;
    box(g, 2, 2, W - 4, Hh - 4, '#b98d5a', 4, 1.4);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(hash(i, w) * W, hash(h, i) * Hh, 2 + hash(i, i) * 3, 0, 7); g.fill(); }
    // palissade
    g.strokeStyle = '#ff8a1c'; g.lineWidth = 2.4; g.setLineDash([5, 4]); g.strokeRect(1, 1, W - 2, Hh - 2); g.setLineDash([]);
    // échafaudage proportionnel
    const done = 1 - progress / Math.max(1, total);
    const hh = 10 + done * 26;
    box(g, 10, Hh - 10 - hh, W - 20, hh, 'rgba(255,255,255,0.65)', 2, 1.4);
    g.strokeStyle = INK; g.lineWidth = 1; for (let x = 14; x < W - 12; x += 10) { g.beginPath(); g.moveTo(x, Hh - 10); g.lineTo(x, Hh - 10 - hh); g.stroke(); }
    // grue
    g.strokeStyle = '#f2a516'; g.lineWidth = 3; g.beginPath(); g.moveTo(W - 12, Hh - 6); g.lineTo(W - 12, -26); g.lineTo(W - 46, -26); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(W - 38, -26); g.lineTo(W - 38, -6); g.stroke();
    box(g, W - 42, -6, 8, 6, '#7a4b2a', 1, 1);
    box(g, 6, Hh - 12, 22, 9, '#ffd23f', 2, 1.2); text(g, 'CHANTIER', 17, Hh - 7.5, 4.5);
  }

  function drawArch(g, name) {
    g.strokeStyle = INK; g.lineWidth = 1.6;
    box(g, -4, -10, 6, 40, C.wood, 1.5); box(g, 30, -10, 6, 40, C.wood, 1.5);
    box(g, -14, -26, 60, 18, '#f6c73b', 4, 2);
    text(g, 'CAMPING ★', 16, -21, 6, INK);
    const n = name.replace(/^Camping\s+/i, '');
    text(g, n.length > 16 ? n.slice(0, 15) + '…' : n, 16, -13.5, n.length > 12 ? 5.5 : 6.5, '#b63b2c');
  }

  /* ---------- personnages ---------- */
  const SKIN = ['#f6d2b0', '#e6b48a', '#c88a5f', '#8d5a3b', '#f1c9a4'];
  const SHIRT = ['#e8553d', '#2a9dd8', '#f2a516', '#2f9e6b', '#9b4dca', '#ff7fa3', '#ffffff', '#ffd23f', '#3ccfc0'];
  function drawPerson(g, x, y, a, t, scale) {
    const kid = a.kid, sc = (kid ? 0.72 : 1) * scale;
    const skin = SKIN[a.id % SKIN.length];
    let shirt = SHIRT[Number.isInteger(a.shirt) ? a.shirt % SHIRT.length : (a.id * 7 + (a.bk || 0)) % SHIRT.length];
    if (a.kind === 'staff') shirt = D.STAFF[a.role].color;
    const walking = a.state === 'walk', seated = a.state === 'rest' || a.state === 'idle';
    const ph = walking ? Math.sin(t * 0.016 + a.id * 1.1) : 0;
    const bob = walking ? Math.abs(ph) * 0.8 : seated ? Math.sin(t * 0.003 + a.id) * 0.4 : 0;
    g.save(); g.translate(x, y - bob); g.scale(sc * (a.face === -1 ? -1 : 1), sc);
    shadow(g, 0, 0, 5, 2);
    g.strokeStyle = INK; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath();
    if (seated) {
      g.moveTo(-1.7, -5); g.lineTo(-4, -1); g.lineTo(-5.5, 0);
      g.moveTo(1.7, -5); g.lineTo(4, -1); g.lineTo(5.5, 0);
    } else {
      g.moveTo(-1.6, -6); g.lineTo(-1.6 + ph * 2, 0);
      g.moveTo(1.6, -6); g.lineTo(1.6 - ph * 2, 0);
    }
    g.stroke();
    g.strokeStyle = a.kind === 'staff' ? '#33384d' : '#4a5a8a'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-1.6, -6); g.lineTo(-1.6 + ph * 2, -0.6); g.moveTo(1.6, -6); g.lineTo(1.6 - ph * 2, -0.6); g.stroke();
    rr(g, -4, seated ? -11 : -13, 8, 8, 3); fillStroke(g, shirt, 1.4);
    // Bras et attitude : alternance de la marche, détente assise, attente.
    g.strokeStyle = skin; g.lineWidth = 2.1; g.beginPath();
    if (seated) {
      g.moveTo(-4, -9); g.lineTo(-5, -3); g.lineTo(-1, -2);
      g.moveTo(4, -9); g.lineTo(5, -3); g.lineTo(1, -2);
    } else if (a.state === 'queue') {
      g.moveTo(-4, -11); g.lineTo(-5, -6); g.lineTo(-1, -6);
      g.moveTo(4, -11); g.lineTo(5, -6); g.lineTo(2, -6);
    } else {
      g.moveTo(-4, -11); g.lineTo(-5 + ph * 1.3, -5);
      g.moveTo(4, -11); g.lineTo(5 - ph * 1.3, -5);
    }
    g.stroke();
    ell(g, 0, seated ? -14.5 : -16.5, 3.7, 3.7, skin, 1.3);
    if (a.kind === 'staff') {
      g.beginPath(); g.arc(0, seated ? -15.5 : -17.5, 3.9, Math.PI, 0);
      g.fillStyle = shirt; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke();
    } else {
      g.beginPath(); g.arc(0, seated ? -15.4 : -17.4, 3.8, Math.PI * 1.05, Math.PI * 1.95);
      g.strokeStyle = ['#3b2a20', '#8a5a2b', '#e0b84f', '#222', '#b6532f'][a.id % 5];
      g.lineWidth = 2; g.stroke();
    }
    if (a.carry && walking) box(g, 3.5, -9, 5, 5, ['#e8553d', '#2a9dd8', '#7a4b2a'][a.id % 3], 1, 1);
    if (a.towel && walking) { g.fillStyle = ['#ffd23f', '#ff7fa3', '#3ccfc0'][a.id % 3]; g.fillRect(-5.5, -13, 2.5, 8); }
    if (a.kind === 'staff' && a.state === 'work') {
      g.fillStyle = '#fff'; g.font = '700 7px system-ui'; g.textAlign = 'center';
      g.fillText(a.role === 'cleaning' ? '🧽' : a.role === 'maintenance' ? '🔧' : '', 0, -24);
    }
    if (a.kind === 'guest' && a.state === 'queue' && a.wait >= 15 && a.id % 3 === 0) {
      g.fillStyle = '#fff7df'; g.strokeStyle = '#7a4b2a'; g.lineWidth = 0.9;
      rr(g, 4, -30, 15, 12, 4); g.fill(); g.stroke();
      g.fillStyle = '#7a4b2a'; g.font = 'bold 8px system-ui'; g.fillText('…', 11.5, -22);
    }
    if (a.kind === 'guest' && seated && a.act === 'eat') {
      const hand = Math.sin(t * 0.007 + a.id);
      g.strokeStyle = skin; g.lineWidth = 1.8; g.beginPath();
      g.moveTo(3, -9); g.lineTo(6 + hand, -10 - Math.max(0, hand) * 4); g.stroke();
    }
    if (a.kind === 'guest' && a.act === 'minigolf') {
      // Petit swing et club de golf, synchronisés sur le cycle d'animation.
      const swing=Math.sin(t*.008+a.id);
      g.strokeStyle='#71634f';g.lineWidth=1.4;g.beginPath();
      g.moveTo(4,-10);g.lineTo(8+swing*5,-5-Math.max(0,swing)*7);g.lineTo(10+swing*5,-1);g.stroke();
    }
    if (a.kind === 'guest' && a.act === 'bikes') {
      // Roues et pédalage en silhouette sur la zone vélo.
      g.strokeStyle='#383b50';g.lineWidth=1.1;
      g.beginPath();g.arc(-6,0,4,0,7);g.arc(8,0,4,0,7);g.stroke();
      g.beginPath();g.moveTo(-6,0);g.lineTo(1,-5);g.lineTo(8,0);g.lineTo(1,0);g.lineTo(-6,0);g.stroke();
    }
    if (a.kind === 'guest' && a.act === 'petanque') {
      const throwPhase=Math.max(0,Math.sin(t*.006+a.id));
      g.strokeStyle=skin;g.lineWidth=1.7;g.beginPath();g.moveTo(4,-10);
      g.lineTo(7+throwPhase*6,-12-throwPhase*7);g.stroke();
      ell(g,9+throwPhase*7,-4-throwPhase*6,2,1.7,'#c7d3d6',.8);
    }
    if (a.kind === 'guest' && a.act === 'bakery') {
      ell(g,6,-8,3,2,'#d89c51',.9);
    }
    if (a.kind === 'guest' && a.act === 'multisport') {
      const ball=Math.sin(t*.009+a.id);
      ell(g,7,-1-Math.max(0,ball)*6,2.6,2.6,'#f3bb46',.8);
    }
    if (a.kind === 'guest' && a.act === 'show' && a.state === 'use') {
      const clap = Math.sin(t * 0.012 + a.id);
      g.strokeStyle = skin; g.lineWidth = 2; g.beginPath();
      g.moveTo(-4, -10); g.lineTo(-1 + clap, -16);
      g.moveTo(4, -10); g.lineTo(1 - clap, -16); g.stroke();
    }
    if (a.kind === 'guest' && seated && a.act === 'stroll') {
      g.fillStyle = '#66b6a8'; g.beginPath(); g.arc(0, -23, 2.2, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  /* Petit décor vectoriel 2,5D, animé uniquement sur les emplacements occupés visibles. */
  function drawPitchLife(g, b, t, meal, kids) {
    const px = b.x * TS, py = b.y * TS, w = b.w * TS, h = b.h * TS;
    const cx = px + (b.type === 'mobilhome' ? w - 27 : b.type === 'caravan' ? w - 25 : 39);
    const cy = py + h - 13;
    g.save();
    g.fillStyle = 'rgba(37,54,49,.16)';
    g.beginPath(); g.ellipse(cx, cy + 2, 25, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8bd85'; g.strokeStyle = 'rgba(83,67,49,.55)'; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(cx, cy - 2, 21, 7, -.08, 0, Math.PI * 2); g.fill(); g.stroke();
    for (const side of [-1, 1]) {
      g.fillStyle = '#8c583e'; g.strokeStyle = INK;
      g.beginPath(); g.rect(cx + side * 15 - 5, cy - 6, 10, 5); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx + side * 15 - 4, cy - 1);
      g.lineTo(cx + side * 15 - 4, cy + 5); g.moveTo(cx + side * 15 + 4, cy - 1);
      g.lineTo(cx + side * 15 + 4, cy + 5); g.stroke();
    }
    g.fillStyle = '#8b5b3f'; g.fillRect(cx - 2, cy - 5, 4, 11);
    g.beginPath(); g.moveTo(cx - 10, cy + 5); g.lineTo(cx + 10, cy + 5); g.strokeStyle = '#49352e'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.ellipse(cx, cy - 8, 14, 6, 0, 0, Math.PI * 2);
    g.fillStyle = '#f2dfb1'; g.strokeStyle = '#684635'; g.lineWidth = 1.3; g.fill(); g.stroke();
    if (meal) {
      for (const offset of [-7, 7]) {
        g.fillStyle = '#fffef2'; g.beginPath(); g.ellipse(cx + offset, cy - 9, 3.5, 2, 0, 0, 7); g.fill();
        g.fillStyle = offset > 0 ? '#e88d4a' : '#72a76a';
        g.beginPath(); g.ellipse(cx + offset, cy - 9, 1.9, 1, 0, 0, 7); g.fill();
      }
      g.fillStyle = '#c5e4f3'; g.fillRect(cx - 2, cy - 13, 3, 5);
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.beginPath();
      const steam = Math.sin(t * .004 + b.id) * 1.2;
      g.moveTo(cx, cy - 16); g.quadraticCurveTo(cx + steam, cy - 22, cx, cy - 25); g.stroke();
    } else {
      g.fillStyle = '#f4f2e5'; g.fillRect(cx - 7, cy - 13, 8, 5);
      g.strokeStyle = '#2a6e81'; g.strokeRect(cx - 7, cy - 13, 8, 5);
      g.fillStyle = '#d75a41'; g.beginPath(); g.ellipse(cx + 5, cy - 10, 2.6, 1.7, 0, 0, 7); g.fill();
    }
    if (kids) {
      const bx = px + 8 + (b.id % 3) * 5, by = py + h - 9;
      g.fillStyle = '#fff7dc'; g.strokeStyle = '#b64f43'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(bx, by - Math.abs(Math.sin(t * .002 + b.id)) * 2.2, 3.3, 0, 7); g.fill(); g.stroke();
    }
    g.restore();
  }

  function drawSwimmer(g, x, y, a, t) {
    const bob = Math.sin(t * 0.004 + a.id) * 1.2;
    g.beginPath(); g.ellipse(x, y + 2, 6, 2.6, 0, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.2; g.stroke();
    if (a.id % 4 === 0) { ell(g, x, y + 1 + bob, 5, 5, ['#ff7a3d', '#ffd23f', '#ff5d73'][a.id % 3], 1.2); ell(g, x, y + 1 + bob, 2, 2, C.water, 0, false); }
    ell(g, x, y - 2 + bob, 3.4, 3.4, SKIN[a.id % SKIN.length], 1.2);
    g.beginPath(); g.arc(x, y - 3 + bob, 3.5, Math.PI, 0); g.fillStyle = SHIRT[a.id % SHIRT.length]; g.fill();
  }


  // Détails de vie près des équipements. Une poignée de formes Canvas par bâtiment visible :
  // aucune nouvelle texture, pas de changement de caméra.
  function drawFacilityLife(g, b, t, weather, minute) {
    if (b.progress > 0) return;
    const px = b.x * TS, py = b.y * TS, w = b.w * TS, h = b.h * TS;
    if (b.type === 'snack' && minute >= 11 * 60 && minute < 22 * 60) {
      // Petit panneau menu et voilage de terrasse animés.
      const flutter = Math.sin(t * .002 + b.id) * (weather === 'storm' ? 3 : 1);
      g.save();g.translate(px + w - 22, py + h - 25);
      g.fillStyle = '#684633'; g.fillRect(-9,-16,18,20);
      g.strokeStyle = '#33233d';g.lineWidth = 1;g.strokeRect(-9,-16,18,20);
      g.fillStyle = '#f8ead1';g.fillRect(-7,-14,14,16);
      g.fillStyle = '#8b5738';g.fillRect(-4,-11,8,1.5);g.fillRect(-5,-7,10,1.5);g.fillRect(-3,-3,6,1.5);
      g.strokeStyle = '#e9d59d';g.lineWidth=2;
      g.beginPath();g.moveTo(-20,-22);g.quadraticCurveTo(-10,-30 + flutter,1,-22);g.stroke();
      g.restore();
    } else if (b.type === 'pool' && minute >= 9 * 60 && minute < 20 * 60) {
      g.save();
      const x = px + 13, y = py + h - 19;
      const lean = Math.sin(t * .0017 + b.id)*.9;
      // Ombre, pied et parasol en coupe avec trois panneaux colorés.
      g.fillStyle='rgba(34,73,90,.2)';g.beginPath();g.ellipse(x+10,y+2,14,4,0,0,7);g.fill();
      g.strokeStyle='#815b43';g.lineWidth=2;g.beginPath();g.moveTo(x+lean,y);g.lineTo(x+lean,y-24);g.stroke();
      g.beginPath();g.moveTo(x-16+lean,y-22);g.quadraticCurveTo(x+lean,y-39,x+16+lean,y-22);
      g.closePath();g.fillStyle='#f8e3a0';g.fill();g.lineWidth=1.1;g.strokeStyle='#6e6259';g.stroke();
      g.fillStyle='#e96869';g.beginPath();g.moveTo(x-8+lean,y-28);g.quadraticCurveTo(x+lean,y-38,x+lean,y-30);g.lineTo(x+lean,y-22);g.closePath();g.fill();
      g.restore();
    } else if (b.type === 'bakery' && minute>=7*60 && minute<13*60) {
      const x=px+w-25,y=py-19;
      for(let i=0;i<3;i++){
        const drift=Math.sin(t*.0013+i+b.id)*5;
        g.save();g.globalAlpha=.17+.07*Math.sin(t*.001+i);
        g.fillStyle='#fff4e4';g.beginPath();g.ellipse(x+drift+i*3,y-11-i*9,4+i,6+i,0,0,7);g.fill();g.restore();
      }
    } else if (b.type==='cinema' && minute>=20*60+15 && minute<22*60+30 && weather!=='rain'&&weather!=='storm'){
      const flick=.35+.06*Math.sin(t*.012+b.id);
      g.save();g.globalAlpha=flick;
      g.fillStyle='#f6edce';g.beginPath();
      g.moveTo(px+w-17,py+h-26);g.lineTo(px+27,py-18);g.lineTo(px+w-26,py-16);g.closePath();g.fill();
      g.restore();
      g.fillStyle=['#a3daef','#a3d59a','#e6b4b2'][Math.floor(t/1900)%3];
      g.fillRect(px+32+Math.sin(t*.001)*5,py-8,19,10);
    } else if (b.type==='petanque' && minute>=10*60 && minute<20*60) {
      for(let i=0;i<3;i++){
        const x=px+18+i*39,y=py+36;
        const off=Math.sin(t*.0018+b.id+i)*3;
        ell(g,x+off,y,2.8,2.3,'#b3c7d3',.9);
      }
    } else if (b.type==='spa' && minute>=10*60 && minute<21*60) {
      for(let i=0;i<5;i++){
        const x=px+40+i*11,y=py+51;
        const r=1+((t*.00045+i*.28)%1)*5;
        g.beginPath();g.arc(x,y-r*.5,r,0,7);
        g.strokeStyle='rgba(244,255,255,.7)';g.lineWidth=1;g.stroke();
      }
    } else if (b.type === 'playground' && weather !== 'storm' && weather !== 'rain') {
      // Deux ballons à proximité des jeux, le rebond n'est visible qu'en journée.
      if (minute > 9 * 60 && minute < 19 * 60) {
        const bounce = Math.abs(Math.sin(t * .003 + b.id)) * 4;
        g.beginPath();g.arc(px+w-11,py+h-10-bounce,3.2,0,7);
        g.fillStyle='#efbb45';g.strokeStyle='#9a4f2f';g.lineWidth=1.1;g.fill();g.stroke();
      }
    }
  }


  // Lac vivant : trois canards et une barque discrète au coucher du soleil.
  // Ces objets restent purement décoratifs et n'altèrent ni le cheminement ni le RNG du jeu.
  function drawLakeLife(g,s,t,daylight) {
    const dry=s.weather.type!=='storm';
    if(!dry || daylight<.25)return;
    const spots=[[42,8],[44,17],[43,30]];
    for(let i=0;i<spots.length;i++){
      const [tx,ty]=spots[i],x=(tx+.5)*TS+Math.sin(t*.00038+i*2)*11;
      const y=(ty+.45)*TS+Math.sin(t*.00022+i)*4;
      if((s.tiles[Math.floor(y/TS)*s.w+Math.floor(x/TS)]!==TERRAIN.WATER))continue;
      g.save();g.translate(x,y);
      g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.1;g.beginPath();
      g.ellipse(0,2,15,3.5,0,0,Math.PI);g.stroke();
      ell(g,0,-3,9,4.5,i===1?'#f1e9cb':'#fff6db',1);
      ell(g,7,-8,3.4,3.4,'#fbf0d4',1);
      poly(g,[9,-8,16,-7,9,-5],'#e4a048',.8);
      g.fillStyle='#32313b';g.beginPath();g.arc(8,-9,1,0,7);g.fill();
      g.restore();
    }
    // Canot de loisir à deux passagers et pagaie, au large du rivage.
    const x=44.5*TS+Math.sin(t*.0002)*14,y=25*TS+Math.cos(t*.00026)*6;
    if(s.tiles[Math.floor(y/TS)*s.w+Math.floor(x/TS)]===TERRAIN.WATER){
      g.save();g.translate(x,y);
      shadow(g,0,5,18,4);
      poly(g,[-19,-4,19,-4,11,6,-13,6],'#e65d49',1.8);
      poly(g,[-14,-1,14,-1,8,3,-8,3],'#f2bf62',.8);
      for(const dx of [-5,7]){
        ell(g,dx,-7,2.9,3.5,'#d5a47e',1);
        box(g,dx-4,-3,8,6,dx<0?'#4a9dc9':'#f6c35d',2,1);
      }
      g.strokeStyle='#8f6942';g.lineWidth=1.5;g.beginPath();
      const paddle=Math.sin(t*.003)*5;
      g.moveTo(-8,-8);g.lineTo(-19,7+paddle);g.stroke();
      g.restore();
    }
  }

  /* ---------- Renderer ---------- */
  function Renderer(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 1 };
    this.ground = null; this.groundKey = '';
    this.rain = []; this.flash = 0; this.t = 0;
    this.ghost = null; this.sel = null; this.hover = null;
    this.dpr = Math.min(2, root.devicePixelRatio || 1);
  }
  const RP = Renderer.prototype;

  RP.resize = function () {
    const r = this.c.getBoundingClientRect();
    this.dpr = Math.min(2, root.devicePixelRatio || 1);
    this.c.width = Math.max(1, Math.round(r.width * this.dpr)); this.c.height = Math.max(1, Math.round(r.height * this.dpr));
    this.vw = r.width; this.vh = r.height;
  };
  RP.fit = function (s) {
    // cadrage sur le cœur du camping, ~26 tuiles de large
    this.cam.z = Math.max(0.6, Math.min(1.3, this.vw / (30 * TS)));
    if (this.vw < 700) this.cam.z = Math.max(0.75, this.vw / (13 * TS));
    const cx = this.vw < 700 ? 9 * TS : 15 * TS, cy = 16.5 * TS;
    this.cam.x = cx - this.vw / this.cam.z / 2; this.cam.y = cy - this.vh / this.cam.z / 2;
    this.clamp(s);
  };
  RP.clamp = function (s) {
    const ww = s.w * TS, wh = s.h * TS, vw = this.vw / this.cam.z, vh = this.vh / this.cam.z, m = 120;
    this.cam.x = vw > ww + 2 * m ? (ww - vw) / 2 : Math.max(-m, Math.min(ww - vw + m, this.cam.x));
    this.cam.y = vh > wh + 2 * m ? (wh - vh) / 2 : Math.max(-m - 40, Math.min(wh - vh + m, this.cam.y));
  };
  RP.toWorld = function (sx, sy) { return { x: sx / this.cam.z + this.cam.x, y: sy / this.cam.z + this.cam.y }; };
  RP.toTile = function (sx, sy) { const w = this.toWorld(sx, sy); return { x: Math.floor(w.x / TS), y: Math.floor(w.y / TS) }; };
  RP.zoomAt = function (s, f, sx, sy) {
    const before = this.toWorld(sx, sy);
    this.cam.z = Math.max(0.35, Math.min(3, this.cam.z * f));
    this.cam.x = before.x - sx / this.cam.z; this.cam.y = before.y - sy / this.cam.z;
    this.clamp(s);
  };

  /* --- sol (mis en cache, redessiné quand la carte change) --- */
  RP.buildGround = function (s) {
    const key = s.tiles.join('') + '|' + s.buildings.map((b) => b.id + b.type + b.x + ',' + b.y + (b.progress > 0 ? 'c' : '')).join(';');
    if (key === this.groundKey && this.ground) return;
    this.groundKey = key;
    const sc = this.vw < 700 ? 1.5 : 2;
    const cv = this.ground || document.createElement('canvas');
    cv.width = s.w * TS * sc; cv.height = s.h * TS * sc;
    const g = cv.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0);
    const T = (x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? -1 : s.tiles[y * s.w + x]);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = T(x, y), px = x * TS, py = y * TS, v = hash(x, y);
      if (t === TERRAIN.WATER) { g.fillStyle = shade(C.water, 1 - Math.min(0.25, (x - 38) * 0.025)); g.fillRect(px, py, TS, TS); continue; }
      if (t === TERRAIN.ROAD) { g.fillStyle = C.road; g.fillRect(px, py, TS, TS); continue; }
      if (t === TERRAIN.SAND) { g.fillStyle = C.sand; g.fillRect(px, py, TS, TS); g.fillStyle = C.sandDot; for (let i = 0; i < 4; i++) g.fillRect(px + hash(x + i, y) * 30, py + hash(y + i, x) * 30, 1.5, 1.5); continue; }
      g.fillStyle = v < 0.5 ? C.grass : shade(C.grass, 0.97); g.fillRect(px, py, TS, TS);
      g.strokeStyle = C.grass2; g.lineWidth = 1.2; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const gx = px + hash(x * 3 + i, y) * 28 + 2, gy = py + hash(x, y * 3 + i) * 26 + 4; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - 1.5, gy - 4); g.moveTo(gx + 2, gy); g.lineTo(gx + 3, gy - 3.5); g.stroke(); }
      if (v > 0.93) { ell(g, px + 10 + v * 10, py + 18, 1.6, 1.6, ['#ffffff', '#ffd23f', '#ff8fb0'][Math.floor(v * 300) % 3], 0, false); }
    }
    // rivage + écume
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (T(x, y) !== TERRAIN.WATER) continue;
      if (T(x - 1, y) === TERRAIN.SAND) { g.fillStyle = C.foam; rr(g, x * TS - 3, y * TS - 1, 7, TS + 2, 3); g.fill(); }
    }
    // route
    g.fillStyle = C.roadLine; for (let y = 0; y < s.h * TS; y += 22) g.fillRect(TS - 1.5, y + 4, 3, 12);
    g.fillStyle = '#5b5e6b'; g.fillRect(2 * TS - 3, 0, 3, s.h * TS);
    // emprises bâtiments (dalles / parcelles)
    for (const b of s.buildings) {
      const px = b.x * TS, py = b.y * TS, w = b.w * TS, h = b.h * TS;
      if (b.progress > 0) continue;
      if (b.type === 'tent') { rr(g, px + 2, py + 2, w - 4, h - 4, 6); g.fillStyle = '#9bd66c'; g.fill(); g.strokeStyle = 'rgba(60,110,40,0.5)'; g.setLineDash([3, 3]); g.lineWidth = 1.4; g.stroke(); g.setLineDash([]); }
      else if (b.type === 'caravan') { rr(g, px + 2, py + 2, w - 4, h - 4, 5); g.fillStyle = '#d8cdb5'; g.fill(); g.strokeStyle = 'rgba(120,100,70,0.6)'; g.lineWidth = 1.4; g.stroke(); g.fillStyle = 'rgba(120,100,70,0.35)'; for (let i = 0; i < 30; i++) g.fillRect(px + 4 + hash(i, b.id) * (w - 8), py + 4 + hash(b.id, i) * (h - 8), 1.5, 1.5); }
      else if (b.type === 'mobilhome') { g.fillStyle = 'rgba(70,60,40,0.18)'; rr(g, px + 2, py + 4, w - 4, h - 4, 4); g.fill(); }
    }
    // chemins
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (T(x, y) !== TERRAIN.PATH) continue;
      const px = x * TS, py = y * TS, i = 4;
      const n = T(x, y - 1) === TERRAIN.PATH, so = T(x, y + 1) === TERRAIN.PATH, e = T(x + 1, y) === TERRAIN.PATH, w = T(x - 1, y) === TERRAIN.PATH;
      const roadW = x === 2 && T(x - 1, y) === TERRAIN.ROAD;
      g.fillStyle = C.pathEdge;
      rr(g, px + (w || roadW ? 0 : i - 1.5), py + (n ? 0 : i - 1.5), TS - (w || roadW ? 0 : i - 1.5) - (e ? 0 : i - 1.5), TS - (n ? 0 : i - 1.5) - (so ? 0 : i - 1.5), 6); g.fill();
    }
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (T(x, y) !== TERRAIN.PATH) continue;
      const px = x * TS, py = y * TS, i = 4;
      const n = T(x, y - 1) === TERRAIN.PATH, so = T(x, y + 1) === TERRAIN.PATH, e = T(x + 1, y) === TERRAIN.PATH, w = T(x - 1, y) === TERRAIN.PATH || (x === 2 && T(x - 1, y) === TERRAIN.ROAD);
      g.fillStyle = C.path;
      rr(g, px + (w ? 0 : i), py + (n ? 0 : i), TS - (w ? 0 : i) - (e ? 0 : i), TS - (n ? 0 : i) - (so ? 0 : i), 5); g.fill();
      g.fillStyle = 'rgba(160,120,70,0.35)';
      for (let k = 0; k < 5; k++) g.fillRect(px + 6 + hash(x + k, y * 2) * 20, py + 6 + hash(y + k, x * 2) * 20, 1.6, 1.6);
    }
    this.ground = cv; this.groundScale = sc;
  };

  /* --- objets triés en profondeur --- */
  RP.collect = function (s, frac, daylight) {
    const list = [];
    const vx0 = this.cam.x - 64, vy0 = this.cam.y - 64, vx1 = this.cam.x + this.vw / this.cam.z + 64, vy1 = this.cam.y + this.vh / this.cam.z + 96;
    const vis = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const d = s.deco[y * s.w + x]; if (!d) continue;
      const px = x * TS, py = y * TS;
      if (!vis(px, py)) continue;
      list.push({ z: py + TS - 2, kind: 'deco', d, x: px, y: py, v: hash(x, y), lamp: d === DECO.LAMP });
    }
    for (const b of s.buildings) {
      const px = b.x * TS, py = b.y * TS;
      if (!vis(px + b.w * TS / 2, py + b.h * TS / 2) && !vis(px, py) && !vis(px + b.w * TS, py + b.h * TS)) continue;
      list.push({ z: py + b.h * TS - (b.type === 'pool' ? 200 : 0), kind: 'b', b, x: px, y: py });
    }
    // entrée
    list.push({ z: s.entrance.y * TS + TS - 1, kind: 'arch', x: s.entrance.x * TS - 16, y: s.entrance.y * TS });
    // agents
    const rt = s.rt;
    const qpos = new Map();
    for (const b of s.buildings) {
      const st = rt.bstate.get(b.id); if (!st || b.ax < 0) continue;
      const cx = b.x + b.w / 2 - 0.5, cy = b.y + b.h / 2 - 0.5;
      let dx = b.ax - cx, dy = b.ay - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      st.queue.forEach((aid, i) => qpos.set(aid, { x: (b.ax + dx * 0.35 * (i + 0.3) - dy * 0.18 * (i % 2 ? 1 : -1)) * TS + TS / 2, y: (b.ay + dy * 0.35 * (i + 0.3)) * TS + TS / 2 + 6 }));
      if (['pool','playground','stage','snack','minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'].includes(b.type)) {
        st.users.forEach((u) => qpos.set(u.aid, { inside: b.type, b }));
      } else st.users.forEach((u) => qpos.set(u.aid, { hidden: true }));
    }
    const t = this.t;
    for (const a of rt.agents) {
      if (a.dead) continue;
      const q = qpos.get(a.id);
      if (q && q.hidden) continue;
      if (a.kind === 'staff' && a.state === 'work' && a.role === 'reception') continue;
      if (a.kind === 'staff' && a.state === 'work' && a.role === 'animation') {
        const b = S.byId(s, a.workB);
        if (b) { const live = S.stageLive(s, b); const W = b.w * TS; list.push({ z: b.y * TS + 40, kind: 'p', a: Object.assign({}, a, { state: live ? 'walk' : 'idle' }), x: b.x * TS + W / 2 + (live ? Math.sin(t * 0.003) * 22 : -30), y: b.y * TS + 40 - (live ? Math.abs(Math.sin(t * 0.012)) * 3 : 0) }); }
        continue;
      }
      let x, y;
      if (q && q.inside) {
        const b = q.b, w = b.w * TS, h = b.h * TS;
        if (q.inside === 'pool') { x = b.x * TS + 26 + hash(a.id, 1) * (w - 52) + Math.sin(t * 0.0006 + a.id) * 6; y = b.y * TS + 28 + hash(1, a.id) * (h - 66); list.push({ z: b.y * TS + h - 199 + y * 0.001, kind: 'swim', a, x, y }); continue; }
        if (q.inside === 'snack') { const tabs = b.level === 2 ? [[18, 44], [48, 50], [78, 42], [30, 58], [62, 58]] : [[18, 44], [48, 50], [78, 42]]; const tb = tabs[a.id % tabs.length]; const k = (a.id >> 2) % 4; x = b.x * TS + tb[0] + [-9, 9, -9, 9][k]; y = b.y * TS + tb[1] + [0, 0, 8, 8][k]; }
        else if (q.inside === 'stage') { x = b.x * TS + 12 + hash(a.id, 3) * (w - 24); y = b.y * TS + 60 + hash(3, a.id) * (h - 66) - (S.stageWindow(s) && S.stageWindow(s).show ? Math.abs(Math.sin(t * 0.008 + a.id)) * 2 : 0); }
        else { x = b.x * TS + 10 + hash(a.id, 2) * (w - 20) + Math.sin(t * 0.002 + a.id) * 5; y = b.y * TS + 22 + hash(2, a.id) * (h - 26); }
        if (q.inside === 'playground' && a.kid) y -= Math.max(0, Math.sin(t * 0.009 + a.id)) * 5;
        if (q.inside === 'minigolf') { x=b.x*TS+18+(a.id%3)*37; y=b.y*TS+38+((a.id>>2)%2)*29; }
        if (q.inside === 'multisport') {
          x=b.x*TS+18+((a.id*17)%90)+Math.sin(t*.002+a.id)*7;
          y=b.y*TS+31+((a.id*11)%42)+Math.cos(t*.003+a.id)*4;
        }
        if (q.inside === 'bikes') { x=b.x*TS+15+(a.id%3)*30; y=b.y*TS+46; }
        if (q.inside === 'laundry') { x=b.x*TS+21+(a.id%2)*24; y=b.y*TS+53; }
        if (q.inside === 'petanque') { x=b.x*TS+17+(a.id%3)*38; y=b.y*TS+29+(a.id%2)*15; }
        if (q.inside === 'cinema') { x=b.x*TS+16+(a.id%5)*22; y=b.y*TS+47+((a.id>>2)%3)*16; }
        if (q.inside === 'bakery') { x=b.x*TS+20+(a.id%3)*24; y=b.y*TS+54; }
        if (q.inside === 'spa') { x=b.x*TS+34+(a.id%3)*27; y=b.y*TS+66; }
        if (!vis(x, y)) continue;
        const activityAgent = q.inside === 'snack' ? Object.assign({}, a, { state: 'rest', act: 'eat' }) :
          q.inside === 'playground' ? Object.assign({}, a, { state: 'walk', act: 'play' }) :
          q.inside === 'stage' ? Object.assign({}, a, { state: 'use', act: 'show' }) :
          ['minigolf','multisport','bikes'].includes(q.inside) ?
            Object.assign({},a,{state:'walk',act:q.inside}) :
          q.inside === 'laundry' ? Object.assign({},a,{state:'rest',act:'laundry'}) :
          q.inside === 'petanque' ? Object.assign({},a,{state:'walk',act:'petanque'}) :
          ['cinema','spa','bakery'].includes(q.inside) ? Object.assign({},a,{state:'rest',act:q.inside}) : a;
        list.push({ z: b.y * TS + h + 0.5 + y * 0.0001, kind: 'p', a: activityAgent, x, y });
        continue;
      } else if (q) { x = q.x; y = q.y; }
      else {
        const ix = a.px + (a.x - a.px) * frac, iy = a.py + (a.y - a.py) * frac;
        const off = ((a.id % 5) - 2) * 3.2;
        x = ix * TS + TS / 2 + off; y = iy * TS + TS / 2 + 6 + ((a.id * 7) % 5 - 2) * 1.4;
        if (a.state === 'wait') { x += ((a.id % 3) - 1) * 8; y += 8 + (a.id % 2) * 5; }
      }
      if (!vis(x, y)) continue;
      list.push({ z: y, kind: 'p', a, x, y });
    }
    const h = s.minute / 60;
    const meal = (h >= 11.6 && h <= 14) || (h >= 18.4 && h <= 20.6);
    if (daylight > 0.5 && !['storm', 'rain'].includes(s.weather.type) && h >= 8.5 && h < 21.2) {
      for (const [bid, gr] of rt.groups) {
        if (gr.phase !== 'home' || !gr.members.some((m) => !m.aid)) continue;
        const bk = s.bookings.find((v) => v.id === bid);
        const b = bk && S.byId(s, bk.unit);
        if (!b || !vis((b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS)) continue;
        list.push({ kind: 'life', z: b.y * TS + b.h * TS + 1, b, meal, kids: !!bk.kids });
      }
    }
    // Vacanciers sur leur terrasse, assis ou discutant.
    if (daylight > 0.55) {
      for (const [bid, gr] of rt.groups) {
        if (gr.phase !== 'home') continue;
        const bk = s.bookings.find((k) => k.id === bid); if (!bk) continue;
        const u = S.byId(s, bk.unit); if (!u) continue;
        let n = 0;
        gr.members.forEach((m, i) => {
          if (m.aid || n >= 3) return;
          n++;
          const guests = bk.guests || [];
          const fake = { id: bid * 10 + i, kid: m.kid, bk: bid, kind: 'guest', state: 'idle',
            shirt: guests[i] && Number.isFinite(guests[i].style) ? guests[i].style : undefined };
          const pos = homeSpot(u, i);
          list.push({ z: pos.y, kind: 'p', a: fake, x: pos.x, y: pos.y, sit: true });
        });
      }
    }
    list.sort((p, q) => p.z - q.z);
    return list;
  };
  function homeSpot(u, i) {
    const px = u.x * TS, py = u.y * TS;
    if (u.type === 'mobilhome') return { x: px + u.w * TS - 30 + (i % 2) * 18, y: py + u.h * TS - 6 - (i > 1 ? 10 : 0) };
    if (u.type === 'caravan') return { x: px + 72 + (i % 2) * 12, y: py + 58 - (i > 1 ? 10 : 0) };
    return { x: px + 44 + (i % 2) * 11, y: py + 58 - (i > 1 ? 10 : 0) };
  }

  RP.drawBuilding = function (g, s, b, occupant) {
    const def = BUILDINGS[b.type], w = b.w, h = b.h, px = b.x * TS, py = b.y * TS;
    const put = (spr) => g.drawImage(spr, px - spr.ox, py - spr.oy, spr.w, spr.h);
    if (b.progress > 0) { const tot = b.buildTotal || def.build; put(sprite(`site${b.type}${b.progress}-${tot}`, w * TS + 20, h * TS + 40, 6, 32, (gg) => drawSite(gg, w, h, b.progress, tot))); return; }
    this.drawBase(g, s, b, occupant, put, w, h, px, py);
    if (b.level === 2) put(sprite('up' + b.type, w * TS + 40, h * TS + 70, 20, 56, (gg) => drawUpgrade(gg, b.type, w, h)));
  };
  RP.drawBase = function (g, s, b, occupant, put, w, h, px, py) {
    switch (b.type) {
      case 'reception': put(sprite('rec' + s.name, w * TS + 30, h * TS + 40, 6, 32, (gg) => drawReception(gg, w, h, s.name))); break;
      case 'sanitary': put(sprite('san', w * TS + 12, h * TS + 12, 6, 6, (gg) => drawSanitary(gg, w, h))); break;
      case 'shop': put(sprite('shop', w * TS + 12, h * TS + 12, 6, 6, (gg) => drawShop(gg, w, h))); break;
      case 'snack': put(sprite('snack', w * TS + 12, h * TS + 40, 6, 32, (gg) => drawSnack(gg, w, h))); break;
      case 'playground': put(sprite('play', w * TS + 12, h * TS + 12, 6, 6, (gg) => drawPlayground(gg, w, h))); break;
      case 'minigolf': put(sprite('minigolf', w*TS+20, h*TS+24, 10, 16, (gg) => drawMinigolf(gg,w,h))); break;
      case 'multisport': put(sprite('multisport', w*TS+20,h*TS+24,10,16,(gg)=>drawMultisport(gg,w,h))); break;
      case 'bikes': put(sprite('bikehire', w*TS+18,h*TS+30,9,22,(gg)=>drawBikeHire(gg,w,h))); break;
      case 'laundry': put(sprite('laundry',w*TS+18,h*TS+28,9,20,(gg)=>drawLaundry(gg,w,h))); break;
      case 'petanque': put(sprite('petanque',w*TS+18,h*TS+28,9,20,(gg)=>drawPetanque(gg,w,h))); break;
      case 'cinema': put(sprite('cinema',w*TS+24,h*TS+58,12,48,(gg)=>drawCinema(gg,w,h))); break;
      case 'bakery': put(sprite('bakery',w*TS+24,h*TS+50,12,38,(gg)=>drawBakery(gg,w,h))); break;
      case 'spa': put(sprite('spa',w*TS+18,h*TS+28,9,20,(gg)=>drawSpa(gg,w,h))); break;
      case 'stage': {
        put(sprite('stage', w * TS + 12, h * TS + 40, 6, 32, (gg) => drawStage(gg, w, h)));
        if (S.stageLive(s, b)) {
          const W = w * TS, t = this.t;
          const program=s.program||'family';
          const label={calm:'SOIRÉE DOUCE',family:'FAMILLES',festive:'GRANDE FÊTE'}[program]||'FAMILLES';
          const tint={calm:'#7ccfbd',family:'#f5cc63',festive:'#ea81b3'}[program]||'#f5cc63';
          g.save();
          box(g,px+W/2-32,py-31,64,12,tint,3,1.2);
          text(g,label,px+W/2,py-25,6.7,INK);
          if(program==='festive'){
            for(let i=0;i<6;i++){
              const px0=px+13+i*(W-26)/5;
              ell(g,px0,py+11+Math.sin(t*.005+i)*3,2.5,2.5,['#ffdf74','#f5a3e7','#a5dbff'][i%3],.4);
            }
          }
          g.restore();
          g.save(); g.globalAlpha = 0.22 + 0.08 * Math.sin(t * 0.004);
          for (const [x0, col] of [[px + 14, '#fff3a0'], [px + W - 14, '#ffb3e0']]) { g.fillStyle = col; g.beginPath(); g.moveTo(x0, py - 14); g.lineTo(px + W / 2 - 26 + Math.sin(t * 0.002 + x0) * 18, py + 46); g.lineTo(px + W / 2 + 26 + Math.sin(t * 0.002 + x0) * 18, py + 46); g.closePath(); g.fill(); }
          g.restore();
          for (let i = 0; i < 3; i++) { const k = ((t * 0.0006 + i / 3) % 1); g.globalAlpha = 1 - k; text(g, i % 2 ? '♪' : '♫', px + W / 2 - 30 + i * 30, py + 6 - k * 26, 12, '#ffffff'); g.globalAlpha = 1; }
        } else if (s.minute >= 14 * 60 && s.minute < 22 * 60 && !s.staff.some((x) => x.role === 'animation')) { box(g, px + w * TS / 2 - 40, py + 30, 80, 12, '#ffffff', 4, 1.3); text(g, 'Pas d’animateur', px + w * TS / 2, py + 36.5, 7); }
        break;
      }
      case 'pool': {
        put(sprite('pool', w * TS + 8, h * TS + 8, 4, 4, (gg) => drawPoolBase(gg, w, h)));
        // reflets animés
        g.save(); rr(g, px + 18, py + 20, w * TS - 36, h * TS - 48, 8); g.clip();
        if (b.water < 50) { g.fillStyle = `rgba(110,160,70,${0.55 - b.water / 120})`; g.fillRect(px, py, w * TS, h * TS); }
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) { const yy = py + 26 + i * 9, off = Math.sin(this.t * 0.0012 + i) * 8; g.beginPath(); g.moveTo(px + 24 + off + (i % 3) * 20, yy); g.quadraticCurveTo(px + 34 + off + (i % 3) * 20, yy - 3, px + 44 + off + (i % 3) * 20, yy); g.stroke(); g.beginPath(); g.moveTo(px + 90 + off - (i % 2) * 14, yy + 4); g.quadraticCurveTo(px + 100 + off, yy + 1, px + 110 + off, yy + 4); g.stroke(); }
        g.restore();
        if (!S.poolOpen(s, b) && s.minute > 7 * 60 && s.minute < 21 * 60) { box(g, px + w * TS / 2 - 24, py + 4, 48, 11, '#e8553d', 3, 1.4); text(g, 'FERMÉE', px + w * TS / 2, py + 10, 7, '#fff'); }
        break;
      }
      case 'mobilhome': put(sprite('mh' + (b.num % 5), w * TS + 12, h * TS + 12, 6, 8, (gg) => drawMobilhome(gg, w, h, b.num % 5 || 5)));
        g.save(); box(g, px + 6, py + 34, 14, 9, '#ffffff', 2, 1.1); text(g, String(b.num), px + 13, py + 38.8, 6.5); g.restore(); break;
      case 'tent': {
        put(sprite('tentpitch' + b.num, 64, 64, 0, 0, (gg) => drawTentPitchBits(gg, b.num)));
        if (occupant) {
          const col = SHIRT[occupant.id % SHIRT.length === 6 ? 1 : occupant.id % SHIRT.length];
          g.drawImage(sprite('tent' + col + (occupant.id % 2), 50, 40, 4, 8, (gg) => drawTent(gg, col, occupant.id % 2)), px + 6 - 4, py + 6 - 8, 50, 40);
          if (occupant.profile !== 'nomad') g.drawImage(sprite('car' + occupant.id % 6, 32, 28, 2, 2, (gg) => drawCar(gg, ['#e8553d', '#2a9dd8', '#ffffff', '#f2a516', '#5b6070', '#2f9e6b'][occupant.id % 6])), px + 34 - 2, py + 30 - 2, 32, 28);
          else { g.save(); g.translate(px + 40, py + 44); g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 5, 0, 7); g.moveTo(15, 0); g.arc(14, 0, 5, 0, 7); g.moveTo(0, 0); g.lineTo(6, -6); g.lineTo(12, 0); g.moveTo(6, -6); g.lineTo(13, -7); g.stroke(); g.restore(); }
        }
        break;
      }
      case 'caravan': {
        put(sprite('carpitch' + b.num, 96, 64, 0, 0, (gg) => drawCaravanPitchBits(gg, b.num)));
        if (occupant) {
          const col = ['#2a9dd8', '#2f9e6b', '#e8553d', '#f2a516', '#9b4dca'][occupant.id % 5];
          const camper = occupant.profile === 'nomad' || occupant.id % 3 === 0;
          g.drawImage(sprite('cara' + col + camper, 72, 44, 12, 4, (gg) => drawCaravan(gg, col, camper)), px + 22 - 12, py + 10 - 4, 72, 44);
          if (!camper) g.drawImage(sprite('car' + occupant.id % 6, 32, 28, 2, 2, (gg) => drawCar(gg, ['#e8553d', '#2a9dd8', '#ffffff', '#f2a516', '#5b6070', '#2f9e6b'][occupant.id % 6])), px + 64 - 2, py + 36 - 2, 32, 28);
        }
        break;
      }
    }
  };

  RP.draw = function (s, frac, now) {
    this.t = now;
    const g = this.g, z = this.cam.z * this.dpr;
    this.buildGround(s);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#5aa0d0'; g.fillRect(0, 0, this.c.width, this.c.height);
    g.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z);
    g.imageSmoothingEnabled = true;
    // hors carte : herbe sombre
    g.fillStyle = '#6fae49'; g.fillRect(-400, -400, s.w * TS + 800, s.h * TS + 800);
    g.fillStyle = C.road; g.fillRect(-400, -400, 400 + 2 * TS, s.h * TS + 800);
    g.fillStyle = C.waterDeep; g.fillRect(s.w * TS, -400, 400, s.h * TS + 800);
    g.drawImage(this.ground, 0, 0, s.w * TS, s.h * TS);
    // reflets lac
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      const y = (hash(i, 3) * s.h) * TS, x = (41 + hash(3, i) * 7) * TS + Math.sin(now * 0.0007 + i) * 10;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 3, x + 16, y); g.stroke();
    }
    const m = s.minute;
    const daylight = m < 360 ? 0 : m < 450 ? (m - 360) / 90 : m < 1230 ? 1 : m < 1320 ? 1 - (m - 1230) / 90 : 0;
    drawLakeLife(g,s,now,daylight);
    // occupants des unités
    const occ = new Map();
    for (const bk of s.bookings) if (bk.status === 'onsite') occ.set(bk.unit, bk);
    const list = this.collect(s, frac, daylight);
    const lamps = [];
    for (const o of list) {
      if (o.kind === 'deco') {
        if (o.d === DECO.TREE || o.d === DECO.PINE) {
          const spr = sprite('tree' + o.d + Math.floor(o.v * 3), 52, 64, 10, 28, (gg) => drawTree(gg, o.d, Math.floor(o.v * 3) / 3));
          const dx=o.x-10+(o.v-.5)*8,dy=o.y-28+(o.v*7%1-.5)*6;
          const wind=s.weather.type==='storm' ? .036 : s.weather.type==='rain' ? .018 : .008;
          const angle=Math.sin(now*.0008+o.x*.07+o.y*.09)*wind;
          const pivotX=o.x+16,pivotY=o.y+28;
          g.save();g.translate(pivotX,pivotY);g.rotate(angle);
          g.drawImage(spr,dx-pivotX,dy-pivotY,52,64);g.restore();
        } else {
          g.drawImage(sprite('deco' + o.d + Math.floor(o.v * 5), 36, 44, 2, 10, (gg) => drawDeco(gg, o.d, o.v)), o.x - 2, o.y - 10, 36, 44);
          // Points de lumière subtils dans les fleurs par temps doux au crépuscule.
          if (o.d===DECO.FLOWERS && s.minute>=20*60 && s.minute<23*60 && !['rain','storm'].includes(s.weather.type)) {
            g.globalAlpha=.3+.25*Math.sin(now*.003+o.x+o.y);
            g.fillStyle='#fff0a0';g.beginPath();g.arc(o.x+10,o.y+4,1.8,0,7);g.fill();g.globalAlpha=1;
          }
        }
        if (o.lamp) lamps.push([o.x + 16, o.y - 2, 60]);
      } else if (o.kind === 'b') {
        this.drawBuilding(g, s, o.b, occ.get(o.b.id));
        drawFacilityLife(g, o.b, now, s.weather.type, s.minute);
        const b = o.b, cx = b.x * TS + b.w * TS / 2;
        if (b.progress <= 0) {
          if (BUILDINGS[b.type].unit && occ.get(b.id)) lamps.push([cx, b.y * TS + b.h * TS / 2, 36]);
          if (!BUILDINGS[b.type].unit) lamps.push([cx, b.y * TS + b.h * TS - 6, 70]);
          if (b.type === 'stage' && S.stageLive(s, b)) lamps.push([cx, b.y * TS + 20, 150]);
        }
      } else if (o.kind === 'life') {
        drawPitchLife(g, o.b, now, o.meal, o.kids);
      } else if (o.kind === 'arch') {
        g.drawImage(sprite('arch' + s.name, 110, 100, 26, 44, (gg) => { gg.scale(1.4, 1.4); drawArch(gg, s.name); }), o.x - 26 + 10, o.y - 44 - 14, 110, 100);
      } else if (o.kind === 'p') drawPerson(g, o.x, o.y, o.a, now, o.sit ? 0.95 : 1);
      else if (o.kind === 'swim') drawSwimmer(g, o.x, o.y, o.a, now);
    }
    // badges d'état
    for (const b of s.buildings) {
      if (b.progress > 0) { this.badge(g, b, `${b.progress} j`, '#ff8a1c'); continue; }
      const st = s.rt.bstate.get(b.id);
      if (b.broken) this.badge(g, b, '⚠ PANNE', '#e8553d');
      else if (b.ax < 0) this.badge(g, b, '⛔ SANS ACCÈS', '#9b4dca');
      else if (b.type === 'sanitary' && b.dirt > 55) this.badge(g, b, '🪣 SALE', '#8a5a2b');
      else if (b.clean) this.badge(g, b, '🧹 À NETTOYER', '#8a5a2b');
      else if (st && st.queue.length >= 4) this.badge(g, b, `⏳ ${st.queue.length}`, '#f2a516');
    }
    // sélection & fantôme
    if (this.sel) {
      const b = this.sel; g.save(); g.setLineDash([6, 4]); g.lineDashOffset = -now * 0.02; g.strokeStyle = '#ffd23f'; g.lineWidth = 3;
      rr(g, b.x * TS - 3, b.y * TS - 3, b.w * TS + 6, b.h * TS + 6, 8); g.stroke(); g.restore();
    }
    if (this.ghost) {
      const gh = this.ghost; g.save(); g.globalAlpha = 0.55;
      g.fillStyle = gh.ok ? 'rgba(80,220,120,0.55)' : 'rgba(240,80,70,0.55)';
      for (const [x, y] of gh.tiles) { rr(g, x * TS + 1, y * TS + 1, TS - 2, TS - 2, 4); g.fill(); }
      g.globalAlpha = 1; g.strokeStyle = gh.ok ? '#1f8a4c' : '#b02a20'; g.lineWidth = 2.5; g.setLineDash([5, 3]);
      if (gh.rect) { rr(g, gh.rect.x * TS, gh.rect.y * TS, gh.rect.w * TS, gh.rect.h * TS, 6); g.stroke(); }
      g.restore();
      if (gh.label) { const lx = (gh.rect ? gh.rect.x + gh.rect.w / 2 : gh.tiles[0][0] + 0.5) * TS, ly = (gh.rect ? gh.rect.y : gh.tiles[0][1]) * TS - 12; const tw = gh.label.length * 5.4 + 14; box(g, lx - tw / 2, ly - 9, tw, 18, gh.ok ? '#ffffff' : '#ffe1dc', 6, 1.6); text(g, gh.label, lx, ly + 0.5, 9.5); }
    }
    // feu d'artifice
    if (s.rt.fireworks && s.rt.fireworks.day === s.day && s.minute >= 22 * 60 + 30 && s.minute < 23 * 60 + 20) this.fireworks = true; else this.fireworks = false;
    // météo & lumière (espace écran)
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const wx = s.phase === 'season' ? s.weather.type : 'cloud';
    if (wx === 'cloud' || wx === 'rain' || wx === 'storm') {
      g.fillStyle = 'rgba(40,50,80,0.07)';
      for (let i = 0; i < 5; i++) { const x = ((now * 0.012 + i * 330) % (this.vw + 600)) - 300, y = hash(i, 9) * this.vh; g.beginPath(); g.ellipse(x, y, 180 * this.cam.z, 70 * this.cam.z, 0, 0, 7); g.fill(); }
    }
    if (wx === 'heat') { g.fillStyle = 'rgba(255,170,60,0.10)'; g.fillRect(0, 0, this.vw, this.vh); }
    let dark = (1 - daylight) * 0.62;
    if (wx === 'rain') dark = Math.max(dark, 0.16); if (wx === 'storm') dark = Math.max(dark, 0.3);
    if (s.phase === 'winter') dark = 0.1;
    if (dark > 0.02) {
      g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${Math.round(255 - dark * 200)},${Math.round(255 - dark * 180)},${Math.round(255 - dark * 60)},1)`; g.fillRect(0, 0, this.vw, this.vh); g.restore();
      if (daylight < 0.6) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const [x, y, r] of lamps) {
          const sx = (x - this.cam.x) * this.cam.z, sy = (y - this.cam.y) * this.cam.z, rr2 = r * this.cam.z;
          if (sx < -rr2 || sy < -rr2 || sx > this.vw + rr2 || sy > this.vh + rr2) continue;
          const gr = g.createRadialGradient(sx, sy, 0, sx, sy, rr2); gr.addColorStop(0, `rgba(255,190,90,${0.38 * (1 - daylight)})`); gr.addColorStop(1, 'rgba(255,190,90,0)');
          g.fillStyle = gr; g.fillRect(sx - rr2, sy - rr2, rr2 * 2, rr2 * 2);
        }
        g.restore();
      }
    }
    if (this.fireworks) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const cols = ['#ff5d73', '#ffd23f', '#3ccfc0', '#b06cff', '#ffffff', '#ff9f1c'];
      for (let k = 0; k < 7; k++) {
        const period = 1600 + k * 230, ph = ((now + k * 517) % period) / period;
        const seed = Math.floor((now + k * 517) / period) * 13 + k;
        const wx0 = (40 + hash(seed, 1) * 6) * TS, wy0 = (4 + hash(1, seed) * 22) * TS;
        const sx = (wx0 - this.cam.x) * this.cam.z, sy = (wy0 - this.cam.y) * this.cam.z;
        const col = cols[seed % cols.length];
        if (ph < 0.25) { g.fillStyle = col; g.beginPath(); g.arc(sx, sy + (1 - ph / 0.25) * 140 * this.cam.z, 2.5, 0, 7); g.fill(); continue; }
        const t2 = (ph - 0.25) / 0.75, r0 = (30 + 60 * t2) * this.cam.z;
        g.globalAlpha = 1 - t2; g.fillStyle = col;
        for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; g.beginPath(); g.arc(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0 + t2 * t2 * 30 * this.cam.z, 2.2 * this.cam.z + 1, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      }
      g.restore();
    }
    if (wx === 'rain' || wx === 'storm') {
      const n = wx === 'storm' ? 220 : 130;
      while (this.rain.length < n) this.rain.push({ x: Math.random() * this.vw, y: Math.random() * this.vh, v: 7 + Math.random() * 6 });
      g.strokeStyle = 'rgba(200,225,255,0.55)'; g.lineWidth = 1.2; g.beginPath();
      for (const r of this.rain) { g.moveTo(r.x, r.y); g.lineTo(r.x - 2, r.y + 9); r.y += r.v; r.x -= 1.5; if (r.y > this.vh) { r.y = -10; r.x = Math.random() * (this.vw + 40); } }
      g.stroke();
      if (wx === 'storm') { if (Math.random() < 0.004) this.flash = 1; if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`; g.fillRect(0, 0, this.vw, this.vh); this.flash -= 0.08; } }
    } else this.rain.length = 0;
  };

  RP.badge = function (g, b, label, col) {
    const x = b.x * TS + b.w * TS / 2, y = b.y * TS - 14;
    g.save(); g.font = '800 9px "Fredoka","Trebuchet MS",system-ui'; const w = g.measureText(label).width + 12;
    box(g, x - w / 2, y - 8, w, 15, col, 7, 1.6); text(g, label, x, y, 9, '#fff'); g.restore();
  };

  root.CT.Renderer = Renderer;
  root.CT.TS = TS;
  root.CT.drawSpriteIcon = function (type) {
    // vignette d'outil pour la barre de construction
    const c = document.createElement('canvas'); const def = BUILDINGS[type];
    const w = def ? def.w : 1, h = def ? def.h : 1; const size = 64;
    c.width = size * 2; c.height = size * 2; const g = c.getContext('2d');
    const k = Math.min(size / ((w * TS) + 20), size / ((h * TS) + 34)); g.scale(2 * k, 2 * k); g.translate(10, 26);
    if (type === 'reception') drawReception(g, w, h, '');
    else if (type === 'sanitary') drawSanitary(g, w, h);
    else if (type === 'shop') drawShop(g, w, h);
    else if (type === 'pool') { drawPoolBase(g, w, h); }
    else if (type === 'playground') drawPlayground(g, w, h);
    else if (type === 'stage') drawStage(g, w, h);
    else if (type === 'snack') drawSnack(g, w, h);
    else if (type === 'minigolf') drawMinigolf(g,w,h);
    else if (type === 'multisport') drawMultisport(g,w,h);
    else if (type === 'bikes') drawBikeHire(g,w,h);
    else if (type === 'laundry') drawLaundry(g,w,h);
    else if (type === 'petanque') drawPetanque(g,w,h);
    else if (type === 'cinema') drawCinema(g,w,h);
    else if (type === 'bakery') drawBakery(g,w,h);
    else if (type === 'spa') drawSpa(g,w,h);
    else if (type === 'mobilhome') drawMobilhome(g, w, h, 1);
    else if (type === 'tent') { rr(g, 2, 2, 60, 60, 6); g.fillStyle = '#9bd66c'; g.fill(); drawTentPitchBits(g, 1); g.translate(8, 2); drawTent(g, '#e8553d', 0); }
    else if (type === 'caravan') { rr(g, 2, 2, 92, 60, 6); g.fillStyle = '#d8cdb5'; g.fill(); drawCaravanPitchBits(g, 1); g.translate(22, 10); drawCaravan(g, '#2a9dd8', false); }
    return c;
  };
  root.CT.drawDecoIcon = function (d) {
    const c = document.createElement('canvas'); c.width = 96; c.height = 96; const g = c.getContext('2d'); g.scale(2, 2); g.translate(8, 12);
    if (d === DECO.TREE || d === DECO.PINE) drawTree(g, d, 0.4); else drawDeco(g, d, 0.4);
    return c;
  };
})(typeof window !== 'undefined' ? window : globalThis);
