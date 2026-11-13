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
    let shirt = SHIRT[(a.id * 7 + (a.bk || 0)) % SHIRT.length];
    if (a.kind === 'staff') shirt = D.STAFF[a.role].color;
    const walking = a.state === 'walk';
    const ph = walking ? Math.sin(t * 0.018 + a.id) : 0;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    shadow(g, 0, 0, 5, 2);
    g.strokeStyle = INK; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-1.6, -6); g.lineTo(-1.6 + ph * 2, 0); g.moveTo(1.6, -6); g.lineTo(1.6 - ph * 2, 0); g.stroke();
    g.strokeStyle = a.kind === 'staff' ? '#33384d' : '#4a5a8a'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-1.6, -6); g.lineTo(-1.6 + ph * 2, -0.6); g.moveTo(1.6, -6); g.lineTo(1.6 - ph * 2, -0.6); g.stroke();
    rr(g, -4, -13, 8, 8, 3); fillStroke(g, shirt, 1.4);
    ell(g, 0, -16.5, 3.7, 3.7, skin, 1.3);
    if (a.kind === 'staff') { g.beginPath(); g.arc(0, -17.5, 3.9, Math.PI, 0); g.fillStyle = shirt; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke(); }
    else { g.beginPath(); g.arc(0, -17.4, 3.8, Math.PI * 1.05, Math.PI * 1.95); g.strokeStyle = ['#3b2a20', '#8a5a2b', '#e0b84f', '#222', '#b6532f'][a.id % 5]; g.lineWidth = 2; g.stroke(); }
    if (a.carry && walking) box(g, 3.5, -9, 5, 5, ['#e8553d', '#2a9dd8', '#7a4b2a'][a.id % 3], 1, 1);
    if (a.towel && walking) { g.fillStyle = ['#ffd23f', '#ff7fa3', '#3ccfc0'][a.id % 3]; g.fillRect(-5.5, -13, 2.5, 8); }
    if (a.kind === 'staff' && a.state === 'work') { g.fillStyle = '#fff'; g.font = '700 7px system-ui'; g.textAlign = 'center'; g.fillText(a.role === 'cleaning' ? '🧽' : a.role === 'maintenance' ? '🔧' : '', 0, -24); }
    g.restore();
  }
  function drawSwimmer(g, x, y, a, t) {
    const bob = Math.sin(t * 0.004 + a.id) * 1.2;
    g.beginPath(); g.ellipse(x, y + 2, 6, 2.6, 0, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.2; g.stroke();
    if (a.id % 4 === 0) { ell(g, x, y + 1 + bob, 5, 5, ['#ff7a3d', '#ffd23f', '#ff5d73'][a.id % 3], 1.2); ell(g, x, y + 1 + bob, 2, 2, C.water, 0, false); }
    ell(g, x, y - 2 + bob, 3.4, 3.4, SKIN[a.id % SKIN.length], 1.2);
    g.beginPath(); g.arc(x, y - 3 + bob, 3.5, Math.PI, 0); g.fillStyle = SHIRT[a.id % SHIRT.length]; g.fill();
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
      if (b.type === 'pool' || b.type === 'playground' || b.type === 'stage' || b.type === 'snack') {
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
        if (!vis(x, y)) continue;
        list.push({ z: b.y * TS + h + 0.5 + y * 0.0001, kind: 'p', a, x, y });
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
    // vacanciers chez eux (journée)
    if (daylight > 0.55) {
      for (const [bid, gr] of rt.groups) {
        if (gr.phase !== 'home') continue;
        const bk = s.bookings.find((k) => k.id === bid); if (!bk) continue;
        const u = S.byId(s, bk.unit); if (!u) continue;
        let n = 0;
        gr.members.forEach((m, i) => {
          if (m.aid || n >= 3) return;
          n++;
          const fake = { id: bid * 10 + i, kid: m.kid, bk: bid, kind: 'guest', state: 'idle' };
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
      case 'stage': {
        put(sprite('stage', w * TS + 12, h * TS + 40, 6, 32, (gg) => drawStage(gg, w, h)));
        if (S.stageLive(s, b)) {
          const W = w * TS, t = this.t;
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
    // occupants des unités
    const occ = new Map();
    for (const bk of s.bookings) if (bk.status === 'onsite') occ.set(bk.unit, bk);
    const list = this.collect(s, frac, daylight);
    const lamps = [];
    for (const o of list) {
      if (o.kind === 'deco') {
        if (o.d === DECO.TREE || o.d === DECO.PINE) g.drawImage(sprite('tree' + o.d + Math.floor(o.v * 3), 52, 64, 10, 28, (gg) => drawTree(gg, o.d, Math.floor(o.v * 3) / 3)), o.x - 10 + (o.v - 0.5) * 8, o.y - 28 + (o.v * 7 % 1 - 0.5) * 6, 52, 64);
        else g.drawImage(sprite('deco' + o.d + Math.floor(o.v * 5), 36, 44, 2, 10, (gg) => drawDeco(gg, o.d, o.v)), o.x - 2, o.y - 10, 36, 44);
        if (o.lamp) lamps.push([o.x + 16, o.y - 2, 60]);
      } else if (o.kind === 'b') {
        this.drawBuilding(g, s, o.b, occ.get(o.b.id));
        const b = o.b, cx = b.x * TS + b.w * TS / 2;
        if (b.progress <= 0) {
          if (BUILDINGS[b.type].unit && occ.get(b.id)) lamps.push([cx, b.y * TS + b.h * TS / 2, 36]);
          if (!BUILDINGS[b.type].unit) lamps.push([cx, b.y * TS + b.h * TS - 6, 70]);
          if (b.type === 'stage' && S.stageLive(s, b)) lamps.push([cx, b.y * TS + 20, 150]);
        }
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
