/* Musée & Expéditions — scene3d.js
 * Le musée en 3D (maison de poupée à murs coupés) et les chantiers d'expédition en diorama.
 * Style : volumes simples, aplats ombrés, contours encrés façon BD franco-belge.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const GL3D = ME.GL3D, M = GL3D.M4, V = GL3D.V3;
  const S3 = (ME.Scene3D = {});
  const doc = G.document;

  const RW = 10, RD = 8, WALL = 2.0, OUTER = 2.6, T = 0.14;
  const INK = '#2b2118';

  /* ---------------- Géométrie des salles ---------------- */
  function roomBox(id) {
    const d = D.ROOMS[id];
    const x0 = d.col * RW, z0 = d.row === 1 ? 0 : -RD;
    return { x0, z0, x1: x0 + RW, z1: z0 + RD, cx: x0 + RW / 2, cz: z0 + RD / 2 };
  }
  S3.roomBox = roomBox;
  const GRID = {};
  Object.keys(D.ROOMS).forEach((id) => { const d = D.ROOMS[id]; GRID[d.col + ',' + d.row] = id; });
  function neighbor(id, side) {
    const d = D.ROOMS[id];
    const k = side === 'left' ? (d.col - 1) + ',' + d.row : side === 'right' ? (d.col + 1) + ',' + d.row : side === 'back' ? d.col + ',' + (d.row - 1) : d.col + ',' + (d.row + 1);
    return GRID[k] || null;
  }
  function doorPoint(a, b) {
    const A = roomBox(a), B = roomBox(b);
    if (A.z0 === B.z0) return [Math.max(A.x0, B.x0), 0, A.cz];
    return [A.cx, 0, 0];
  }

  /** Emplacements des vitrines d'une salle. */
  function slots(id, n) {
    const r = roomBox(id);
    if (id === 'hall') return [[r.cx + 1.2, r.cz - 1.2]];
    if (n === 6) return [-3, 0, 3].map((dx) => [r.cx + dx, r.cz - 2]).concat([-3, 0, 3].map((dx) => [r.cx + dx, r.cz + 1.3]));
    const step = n >= 5 ? 1.85 : 2.3;
    return Array.from({ length: n }, (_, i) => [r.cx + (i - (n - 1) / 2) * step, r.cz - 1.4]);
  }
  S3.slots = slots;

  /* ---------------- Personnages ---------------- */
  let UNIT = null;
  function unitMeshes(R) {
    const b = (fn) => { const B = new GL3D.Builder(); fn(B); return R.mesh(B); };
    return {
      box: b((B) => B.box(M.ident(), '#ffffff')),
      sphere: b((B) => B.sphere(M.ident(), '#ffffff', 6, 10)),
      cyl: b((B) => B.cyl(M.ident(), '#ffffff', 10)),
      coat: b((B) => B.cyl(M.ident(), '#ffffff', 10, 0.38, 0.5)),
      cone: b((B) => B.cyl(M.ident(), '#ffffff', 12, 0, 0.5)),
      glass: b((B) => B.box(M.ident(), '#ffffff', { outline: false })),
      beam: b((B) => B.cyl(M.ident(), '#ffffff', 14, 0.12, 0.5, { outline: false })),
      water: b((B) => B.box(M.ident(), '#ffffff', { outline: false })),
    };
  }
  const c3 = (h) => new Float32Array(GL3D.hex(h));
  const tintCache = {};
  const tint = (h) => tintCache[h] || (tintCache[h] = c3(h));

  /** Ajoute un personnage à la liste de dessin. pose : walk | stand | work | kneel | dive */
  function person(list, U, x, y, z, yaw, look, o) {
    o = o || {};
    const sc = o.scale || 1, t = o.t || 0, pose = o.pose || 'stand';
    let B = M.chain(M.T(x, y, z), M.RY(yaw), M.S(sc, sc, sc));
    if (pose === 'dive') B = M.mul(B, M.chain(M.T(0, 0.3, 0), M.RX(1.35)));
    const coat = tint(look.coat || '#b23a2a'), skin = tint(look.skin || '#f1c9a5'), hair = tint(look.hair || '#3a2a1a');
    const pants = tint(pose === 'dive' ? '#1d1d24' : '#4a3a2c');
    const add = (mesh, m, c) => list.push({ mesh, m: M.mul(B, m), tint: c });
    const kneel = pose === 'kneel';
    const lift = kneel ? -0.34 : 0;
    const walk = pose === 'walk' || pose === 'dive' ? Math.sin(t * 8) : 0;
    for (const sg of [-1, 1]) {
      if (kneel) {
        add(U.box, M.chain(M.T(sg * 0.1, 0.3, 0.05), M.RX(-1.45), M.T(0, -0.16, 0), M.S(0.14, 0.34, 0.15)), pants);
        add(U.box, M.chain(M.T(sg * 0.1, 0.1, -0.12), M.S(0.14, 0.2, 0.3)), pants);
      } else {
        add(U.box, M.chain(M.T(sg * 0.1, 0.62, 0), M.RX(sg * walk * 0.5), M.T(0, -0.31, 0), M.S(0.14, 0.62, 0.15)), pants);
        add(U.box, M.chain(M.T(sg * 0.1, 0.62, 0), M.RX(sg * walk * 0.5), M.T(0, -0.6, 0.05), M.S(0.15, 0.08, 0.24)), tint('#2b2118'));
      }
    }
    add(U.coat, M.chain(M.T(0, 0.9 + lift, 0), M.S(0.44, 0.58, 0.32)), coat);
    let armA = pose === 'walk' ? walk * 0.6 : 0;
    if (pose === 'work' || kneel) armA = -1.0 + Math.sin(t * 6) * 0.35;
    if (pose === 'dive') armA = -2.6 + Math.sin(t * 4) * 0.4;
    if (pose === 'look') armA = -0.2;
    for (const sg of [-1, 1]) {
      const a = pose === 'walk' ? -sg * armA : (sg === 1 ? armA : (pose === 'work' || kneel ? armA * 0.7 : armA * 0.2));
      add(U.box, M.chain(M.T(sg * 0.25, 1.13 + lift, 0), M.RZ(sg * 0.12), M.RX(a), M.T(0, -0.23, 0), M.S(0.12, 0.46, 0.13)), coat);
      add(U.sphere, M.chain(M.T(sg * 0.25, 1.13 + lift, 0), M.RZ(sg * 0.12), M.RX(a), M.T(0, -0.5, 0), M.S(0.12)), skin);
    }
    if (o.tool && (pose === 'work' || kneel)) add(U.box, M.chain(M.T(0.25, 1.13 + lift, 0), M.RX(armA), M.T(0, -0.62, 0.06), M.S(0.04, 0.22, 0.04)), tint('#8e9398'));
    add(U.sphere, M.chain(M.T(0, 1.4 + lift, 0), M.S(0.36)), skin);
    add(U.sphere, M.chain(M.T(0, 1.48 + lift, -0.035), M.S(0.38, 0.26, 0.38)), hair);
    for (const sg of [-1, 1]) add(U.sphere, M.chain(M.T(sg * 0.065, 1.42 + lift, 0.165), M.S(0.045)), tint('#2b2118'));
    if (look.beard) add(U.sphere, M.chain(M.T(0, 1.31 + lift, 0.09), M.S(0.24, 0.15, 0.16)), hair);
    if (look.glasses) add(U.box, M.chain(M.T(0, 1.43 + lift, 0.17), M.S(0.22, 0.05, 0.02)), tint('#2b2118'));
    if (look.hat && pose !== 'dive') {
      add(U.cyl, M.chain(M.T(0, 1.57 + lift, 0), M.S(0.5, 0.035, 0.5)), tint('#d8c08a'));
      add(U.cyl, M.chain(M.T(0, 1.64 + lift, 0), M.S(0.29, 0.13, 0.29)), tint('#d8c08a'));
    }
    if (pose === 'dive') add(U.cyl, M.chain(M.T(0, 1.0, -0.24), M.S(0.2, 0.5, 0.2)), tint('#e3b33a'));
  }
  S3.person = person;

  /* ---------------- Surcouche HTML (étiquettes, bulles, barre d'outils) ---------------- */
  function overlay(wrap) {
    const layer = doc.createElement('div');
    layer.className = 'gl-labels';
    wrap.appendChild(layer);
    const pool = [];
    return {
      layer,
      begin() { pool.forEach((p) => { p.used = false; }); },
      label(R, pos, html, cls) {
        const s = R.toScreen(pos);
        let p = pool.find((q) => !q.used && q.cls === cls);
        if (!p) { const el = doc.createElement('div'); el.className = 'gl-label ' + (cls || ''); layer.appendChild(el); p = { el, cls }; pool.push(p); }
        p.used = true;
        if (!s || s.x < -100 || s.y < -60 || s.x > wrap.clientWidth + 100 || s.y > wrap.clientHeight + 60) { p.el.style.display = 'none'; return; }
        if (p.html !== html) { p.el.innerHTML = html; p.html = html; }
        p.el.style.display = '';
        p.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(-50%,-100%)';
      },
      end() { pool.forEach((p) => { if (!p.used) p.el.style.display = 'none'; }); },
    };
  }

  function toolbar(wrap, cam, home, extra) {
    const bar = doc.createElement('div');
    bar.className = 'gl-tools';
    bar.innerHTML = '<button type="button" data-k="l" aria-label="Tourner à gauche" title="Tourner">⟲</button><button type="button" data-k="r" aria-label="Tourner à droite" title="Tourner">⟳</button><button type="button" data-k="in" aria-label="Zoomer">＋</button><button type="button" data-k="out" aria-label="Dézoomer">－</button><button type="button" data-k="home" aria-label="Vue d\'ensemble" title="Vue d\'ensemble">⌂</button>' + (extra || '');
    wrap.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.k;
      cam.userMoved = true;
      if (k === 'l') cam.goalYaw = (cam.goalYaw != null ? cam.goalYaw : cam.yaw) + Math.PI / 4;
      if (k === 'r') cam.goalYaw = (cam.goalYaw != null ? cam.goalYaw : cam.yaw) - Math.PI / 4;
      if (k === 'in') cam.goalDist = (cam.goalDist || cam.dist) * 0.78;
      if (k === 'out') cam.goalDist = (cam.goalDist || cam.dist) * 1.28;
      if (k === 'home') home();
    });
    return bar;
  }
  function ease(cam, dt) {
    if (cam.goalYaw != null) { const d = cam.goalYaw - cam.yaw; cam.yaw += d * Math.min(1, dt * 6); if (Math.abs(d) < 0.002) { cam.yaw = cam.goalYaw; cam.goalYaw = null; } }
    if (cam.goalDist != null) { cam.goalDist = ME.clamp(cam.goalDist, cam.minDist, cam.maxDist); const d = cam.goalDist - cam.dist; cam.dist += d * Math.min(1, dt * 6); if (Math.abs(d) < 0.01) cam.goalDist = null; }
    if (cam.goalTarget) { for (let i = 0; i < 3; i++) cam.target[i] += (cam.goalTarget[i] - cam.target[i]) * Math.min(1, dt * 5); if (V.len(V.sub(cam.goalTarget, cam.target)) < 0.02) cam.goalTarget = null; }
    if (cam.goalPitch != null) { cam.pitch += (cam.goalPitch - cam.pitch) * Math.min(1, dt * 5); if (Math.abs(cam.goalPitch - cam.pitch) < 0.002) cam.goalPitch = null; }
  }

  function sizeCanvas(canvas, wrap, ratio, maxH) {
    const dpr = Math.min(G.innerWidth < 720 ? 1.5 : 2, G.devicePixelRatio || 1);
    const w = wrap.clientWidth || 800;
    const h = Math.min(maxH || 9999, Math.round(w * ratio));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    return { w, h };
  }

  /* =========================================================
   *  LE MUSÉE
   * ========================================================= */
  const FLOORS = { expo: ['#b98a55', '#c79a64'], temp: ['#a8744a', '#b8845a'], hall: ['#efe7d6', '#2f2a26'], atelier: ['#b7b9b2', '#aeb0a8'], reserves: ['#a9a59a', '#b3afa3'], shop: ['#c9945e', '#d5a26c'] };
  const WALLS = { expo: '#f3e7cf', temp: '#efe0c8', hall: '#efe2c2', atelier: '#dfe6e3', reserves: '#d9d4c8', shop: '#f2d9b8' };

  function wallColor(state, id) {
    const def = D.ROOMS[id], room = state.rooms[id];
    if (!room.unlocked) return '#cfc6b4';
    const base = WALLS[def.kind] || '#f3e7cf';
    return room.theme ? GL3D.mix(base, D.PERIODS[room.theme].color, 0.3) : base;
  }

  /** Construit le maillage statique d'une salle (sol, murs intérieurs, mobilier). */
  function buildRoom(state, id, extra) {
    const B = new GL3D.Builder();
    const r = roomBox(id), def = D.ROOMS[id], room = state.rooms[id];
    const kind = room.unlocked ? def.kind : 'locked';
    // sol
    if (kind === 'hall') {
      for (let i = 0; i < RW; i++) for (let j = 0; j < RD; j++) B.block(r.x0 + i + 0.5, 0, r.z0 + j + 0.5, 1, 0.08, 1, (i + j) % 2 ? FLOORS.hall[0] : '#c9bfa8', { outline: false });
    } else if (kind === 'locked') {
      B.block(r.cx, 0, r.cz, RW, 0.06, RD, '#8a8070', { outline: false });
    } else {
      const f = FLOORS[kind] || FLOORS.expo;
      for (let i = 0; i < 10; i++) B.block(r.x0 + i + 0.5, 0, r.cz, 1, 0.08, RD, f[i % 2], { outline: false });
    }
    // murs intérieurs (côté de cette salle), avec portes
    const wc = wallColor(state, id);
    const wall = (x, z, w, d, h, c) => B.block(x, 0.08, z, w, h, d, c);
    const sides = { left: [r.x0 + T / 2, r.cz, 'z'], right: [r.x1 - T / 2, r.cz, 'z'], back: [r.cx, r.z0 + T / 2, 'x'], front: [r.cx, r.z1 - T / 2, 'x'] };
    for (const side in sides) {
      const nb = neighbor(id, side);
      if (!nb) continue; // les murs extérieurs sont gérés à part (coupe dynamique)
      const [x, z, axis] = sides[side];
      const len = axis === 'x' ? RW : RD, gap = 1.9;
      const seg = (len - gap) / 2;
      for (const sg of [-1, 1]) {
        const off = sg * (gap / 2 + seg / 2);
        if (axis === 'x') { wall(x + off, z, seg, T, WALL, wc); wall(x + off, z, seg, T + 0.02, 0.42, '#7a5a3a'); }
        else { wall(x, z + off, T, seg, WALL, wc); wall(x, z + off, T + 0.02, seg, 0.42, '#7a5a3a'); }
      }
    }
    if (kind === 'locked') {
      // chantier de travaux : échafaudage, bâche, barrière
      for (const [dx, dz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) B.cyl(M.chain(M.T(r.cx + dx, 1.6, r.cz + dz), M.S(0.12, 3.2, 0.12)), '#8a6a44', 6);
      B.block(r.cx, 1.6, r.cz - 2, 6.4, 0.12, 0.8, '#b98a55'); B.block(r.cx, 1.6, r.cz + 2, 6.4, 0.12, 0.8, '#b98a55');
      B.block(r.cx, 3.1, r.cz, 6.6, 0.1, 4.6, '#c8b88f');
      for (let i = 0; i < 6; i++) B.block(r.cx - 3.3 + i * 1.3 + 0.6, 0.06, r.z1 - 1, 1.2, 0.5, 0.15, i % 2 ? '#fffaf0' : '#b23a2a');
      B.box(M.chain(M.T(r.cx - 1.5, 0.45, r.cz + 0.5), M.RY(0.4), M.S(1.6, 0.8, 1)), '#6f8f8a');
      B.box(M.chain(M.T(r.cx + 2, 0.3, r.cz), M.S(1, 0.5, 0.8)), '#d39b2a');
      return B;
    }
    if (kind === 'expo' || kind === 'temp' || kind === 'hall') {
      const n = room.vitrines.length;
      slots(id, n).forEach(([vx, vz], i) => {
        const big = id === 'hall' ? 1.25 : 1;
        B.block(vx, 0.08, vz, 0.92 * big, 0.95, 0.92 * big, '#efe2c2');
        B.block(vx, 0.08, vz, 0.98 * big, 0.12, 0.98 * big, '#7a5a3a');
        B.box(M.chain(M.T(vx, 0.75, vz + 0.47 * big), M.RX(-0.5), M.S(0.34, 0.2, 0.03)), room.vitrines[i] ? '#fffaf0' : '#d9cfb4');
        // montants de la cloche de verre
        const h = 0.95 * big, g = 0.43 * big;
        for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.block(vx + sx * g, 1.03, vz + sz * g, 0.04, h, 0.04, '#5a4a3a', { outline: false });
        for (const sg of [-1, 1]) { B.block(vx + sg * g, 1.03 + h, vz, 0.04, 0.04, 0.9 * big, '#5a4a3a', { outline: false }); B.block(vx, 1.03 + h, vz + sg * g, 0.9 * big, 0.04, 0.04, '#5a4a3a', { outline: false }); }
      });
      if (kind !== 'hall') {
        // rail d'éclairage et projecteurs
        B.block(r.cx, 3.05, r.cz - 1.4, RW - 0.6, 0.08, 0.08, '#2b2118');
        slots(id, n).forEach(([vx, vz]) => { B.cyl(M.chain(M.T(vx, 2.98, vz), M.S(0.24, 0.22, 0.24)), '#2b2118', 8); });
        B.block(r.cx, 0.08, r.z1 - 1.6, 2.2, 0.42, 0.6, '#7a5a3a'); // banc
        B.block(r.cx, 0.5, r.z1 - 1.6, 2.4, 0.08, 0.7, '#b98a55');
      }
    }
    if (kind === 'hall') {
      B.block(r.x0 + 7.2, 0.08, r.z0 + 6.2, 2.6, 1.0, 0.7, '#8a5a34'); B.block(r.x0 + 7.2, 1.08, r.z0 + 6.2, 2.8, 0.1, 0.9, '#efe2c2');
      B.block(r.x0 + 8.3, 0.08, r.z0 + 5.3, 0.7, 1.0, 1.6, '#8a5a34');
      for (const [px, pz] of [[r.x0 + 1.2, r.z0 + 1.2], [r.x0 + 1.2, r.z1 - 1.2]]) {
        B.cyl(M.chain(M.T(px, 0.4, pz), M.S(0.6, 0.65, 0.6)), '#b23a2a', 10, 0.5, 0.4);
        B.sphere(M.chain(M.T(px, 1.15, pz), M.S(1.0)), '#6f8f4a', 5, 8);
      }
    }
    if (kind === 'atelier') {
      const nb = state.benches;
      for (let i = 0; i < nb; i++) {
        const bx = r.x0 + 1.5 + i * 2.25;
        const bz = r.z0 + 2.2;
        B.block(bx, 0.85, bz, 1.7, 0.08, 0.9, '#9a6a3c');
        for (const [sx, sz] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) B.block(bx + sx, 0.08, bz + sz, 0.08, 0.78, 0.08, '#6b4524');
        B.cyl(M.chain(M.T(bx + 0.65, 1.25, bz - 0.3), M.S(0.04, 0.8, 0.04)), '#2b2118', 6);
        B.cyl(M.chain(M.T(bx + 0.45, 1.6, bz - 0.15), M.RZ(-0.9), M.S(0.26, 0.2, 0.26)), '#d39b2a', 8, 0.12, 0.5);
        extra.benches.push([bx, bz]);
      }
      B.block(r.x1 - 0.5, 0.08, r.cz, 0.6, 2.0, 4, '#7a7f85');
      for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) B.cyl(M.chain(M.T(r.x1 - 0.5, 0.45 + k * 0.48, r.cz - 1.6 + j * 0.8), M.S(0.22, 0.3, 0.22)), ['#b23a2a', '#2f6f73', '#d39b2a', '#efe2c2', '#3f5a92'][(k + j) % 5], 8);
      B.block(r.cx - 1, 0.08, r.z1 - 2.2, 2.6, 0.8, 1.2, '#7a7f85'); B.block(r.cx - 1, 0.88, r.z1 - 2.2, 2.8, 0.08, 1.4, '#9aa0a5');
    }
    if (kind === 'reserves') {
      const used = ME.Objects.reserveCount(state), cap = state.reserveCap;
      const units = Math.max(3, Math.ceil(cap / 8));
      let n = 0;
      for (let u = 0; u < units; u++) {
        const ux = r.x0 + 1.4 + (u % 4) * 2.3, uz = r.z0 + 1.0 + Math.floor(u / 4) * 3.2;
        for (const sx of [-0.95, 0.95]) for (const sz of [-0.35, 0.35]) B.block(ux + sx, 0.08, uz + sz, 0.06, 2.2, 0.06, '#7a7f85');
        for (let k = 0; k < 4; k++) {
          B.block(ux, 0.2 + k * 0.62, uz, 2.0, 0.05, 0.8, '#9aa0a5');
          for (let s = 0; s < 2; s++) { if (n < Math.min(used, cap)) B.block(ux - 0.45 + s * 0.9, 0.25 + k * 0.62, uz, 0.8, 0.45, 0.6, '#c9a77a'); n++; }
        }
      }
      for (let i = 0; i < Math.max(0, used - cap); i++) B.block(r.x0 + 1.2 + (i % 5) * 1.0, 0.08 + Math.floor(i / 5) * 0.6, r.z1 - 1.5, 0.85, 0.55, 0.85, '#b23a2a');
    }
    if (kind === 'shop') {
      const lvl = state.shopLevel;
      for (let u = 0; u < 1 + lvl; u++) {
        const ux = r.x0 + 1.6 + u * 2.4, uz = r.z0 + 1.0;
        B.block(ux, 0.08, uz, 2.0, 2.0, 0.6, '#8a5a34');
        for (let k = 0; k < 3; k++) for (let j = 0; j < 6; j++) B.block(ux - 0.8 + j * 0.32, 0.45 + k * 0.6, uz + 0.1, 0.24, 0.42 - (j % 2) * 0.08, 0.4, ['#b23a2a', '#2f6f73', '#d39b2a', '#3f5a92', '#5f7f2a'][(j + k + u) % 5]);
      }
      B.block(r.x1 - 2.2, 0.08, r.z1 - 2.6, 2.6, 1.0, 0.8, '#8a5a34'); B.block(r.x1 - 2.2, 1.08, r.z1 - 2.6, 2.8, 0.08, 1.0, '#efe2c2');
      B.block(r.x1 - 1.6, 1.16, r.z1 - 2.6, 0.5, 0.35, 0.4, '#2b2118');
      B.cyl(M.chain(M.T(r.cx - 1, 0.9, r.z1 - 2.4), M.S(0.7, 1.6, 0.7)), '#d8c08a', 8);
    }
    return B;
  }

  /** Murs extérieurs regroupés par façade : abaissés automatiquement quand ils font face à la caméra. */
  function buildShell(state) {
    const sides = { back: new GL3D.Builder(), front: new GL3D.Builder(), left: new GL3D.Builder(), right: new GL3D.Builder() };
    Object.keys(D.ROOMS).forEach((id) => {
      const r = roomBox(id), wc = wallColor(state, id);
      for (const side of ['back', 'front', 'left', 'right']) {
        if (neighbor(id, side)) continue;
        const B = sides[side];
        const entrance = id === 'hall' && side === 'left';
        const segs = entrance ? [[r.z0 + 1.6, 3.2], [r.z1 - 1.6, 3.2]] : null;
        if (side === 'back' || side === 'front') {
          const z = side === 'back' ? r.z0 - T / 2 : r.z1 + T / 2;
          B.block(r.cx, 0, z, RW, OUTER, T * 1.6, wc); B.block(r.cx, 0, z, RW + 0.02, 0.5, T * 1.7, '#7a5a3a');
          B.block(r.cx, OUTER, z, RW + 0.05, 0.18, T * 2.2, '#efe2c2');
        } else {
          const x = side === 'left' ? r.x0 - T / 2 : r.x1 + T / 2;
          (segs || [[r.cz, RD]]).forEach(([zc, len]) => {
            B.block(x, 0, zc, T * 1.6, OUTER, len, wc); B.block(x, 0, zc, T * 1.7, 0.5, len + 0.02, '#7a5a3a');
            B.block(x, OUTER, zc, T * 2.2, 0.18, len + 0.05, '#efe2c2');
          });
          if (entrance) B.block(x, OUTER - 0.5, r.cz, T * 1.6, 0.5, 1.6, wc);
        }
      }
    });
    return sides;
  }

  function buildExterior() {
    const B = new GL3D.Builder();
    B.block(20, -0.12, 0, 160, 0.1, 120, '#9fb48a', { outline: false });
    B.block(20, -0.06, 0, 41.4, 0.1, 17.4, '#cdbf9f', { outline: false });
    B.block(-6, -0.03, 4, 12, 0.06, 2.2, '#d8c8a0', { outline: false });
    // portique d'entrée
    for (const dz of [-1.7, 1.7]) {
      B.cyl(M.chain(M.T(-1.1, 1.6, 4 + dz), M.S(0.5, 3.2, 0.5)), '#efe7d6', 12);
      B.block(-1.1, 0, 4 + dz, 0.75, 0.2, 0.75, '#d8cdb4'); B.block(-1.1, 3.2, 4 + dz, 0.75, 0.2, 0.75, '#d8cdb4');
    }
    B.block(-1.1, 3.4, 4, 1.2, 0.4, 4.6, '#efe2c2');
    B.prism(M.chain(M.T(-1.1, 4.15, 4), M.RY(Math.PI / 2), M.S(4.8, 1.1, 1.2)), '#d9c79d');
    for (let i = 0; i < 3; i++) B.block(-1.6 - i * 0.4, 0, 4, 0.4, 0.3 - i * 0.1, 3.6, '#d8cdb4');
    // arbres et bosquets
    const trees = [[-8, -6], [-10, 9], [-6, 12], [46, -7], [48, 6], [44, 12], [8, -14], [26, -14], [36, 13], [14, 13], [-12, 1]];
    trees.forEach(([x, z], i) => {
      B.cyl(M.chain(M.T(x, 0.8, z), M.S(0.35, 1.6, 0.35)), '#6b4a2b', 6);
      if (i % 3 === 0) B.cyl(M.chain(M.T(x, 2.8, z), M.S(2.4, 3.2, 2.4)), '#5f7f45', 9, 0, 0.5);
      else B.sphere(M.chain(M.T(x, 2.6, z), M.S(2.6, 2.4, 2.6)), i % 2 ? '#6f8f4a' : '#7f9f55', 5, 8);
    });
    for (let i = 0; i < 8; i++) B.sphere(M.chain(M.T(-3.5 - (i % 2) * 0.6, 0.35, 0.6 + i * 0.95 + (i > 3 ? 1.6 : 0)), M.S(0.8, 0.7, 0.8)), '#5f7f45', 4, 7);
    // réverbère et panneau
    B.cyl(M.chain(M.T(-4.5, 1.5, 6), M.S(0.12, 3, 0.12)), '#2b2118', 6); B.sphere(M.chain(M.T(-4.5, 3.1, 6), M.S(0.4)), '#ffe9a8', 4, 8);
    B.block(-5.5, 0, 2.2, 0.1, 1.1, 0.1, '#6b4524'); B.block(-5.5, 1.1, 2.2, 0.12, 0.8, 1.8, '#fffaf0');
    return B;
  }

  /* ---------------- Déplacements des visiteurs ---------------- */
  function walkable(state, id) {
    const def = D.ROOMS[id];
    return state.rooms[id].unlocked && ['hall', 'expo', 'temp', 'shop'].includes(def.kind);
  }
  function pathRooms(state, from, to) {
    if (from === to) return [from];
    const prev = { [from]: null }, q = [from];
    while (q.length) {
      const cur = q.shift();
      for (const side of ['left', 'right', 'back', 'front']) {
        const nb = neighbor(cur, side);
        if (!nb || nb in prev || !walkable(state, nb)) continue;
        prev[nb] = cur;
        if (nb === to) { const p = [to]; let c = cur; while (c) { p.unshift(c); c = prev[c]; } return p; }
        q.push(nb);
      }
    }
    return [from, to];
  }

  const VLOOKS = {
    famille: [{ coat: '#d39b2a', hair: '#6b3a1f', skin: '#f1c9a5' }, { coat: '#e07b3a', hair: '#2b2118', skin: '#c99772' }],
    scolaire: [{ coat: '#5f7f2a', hair: '#e0b25a', skin: '#f5d5bd' }, { coat: '#7fa03a', hair: '#2b2118', skin: '#b98764' }],
    passionne: [{ coat: '#3f5a92', hair: '#9a9a9a', skin: '#f1c9a5', glasses: true, beard: true }, { coat: '#2f4a7a', hair: '#5a3a22', skin: '#e6b48f', glasses: true }],
    touriste: [{ coat: '#b23a2a', hair: '#c48a3a', skin: '#f3d0b0', hat: true }, { coat: '#d0533a', hair: '#1d1410', skin: '#d9a982', hat: true }],
  };

  S3.museum = function (wrap, getState, handlers) {
    handlers = handlers || {};
    const canvas = doc.createElement('canvas');
    canvas.className = 'gl-canvas';
    canvas.setAttribute('aria-label', 'Musée en 3D : faites glisser pour vous déplacer, deux doigts ou clic droit pour pivoter, touchez une salle ou une vitrine');
    wrap.appendChild(canvas);
    let R;
    try { R = GL3D.create(canvas, { shadowSize: G.innerWidth < 720 ? 1024 : 2048, preserve: handlers.preserve }); } catch (e) { R = null; }
    if (!R) { canvas.remove(); return null; }
    const U = unitMeshes(R);
    const objCache = ME.Models3D.cache(R);
    const ov = overlay(wrap);
    const mobile = () => wrap.clientWidth < 720;
    const cam = { target: [19, 0, 0], yaw: 0.42, pitch: 0.92, dist: 38, minDist: 6, maxDist: 95, minPitch: 0.3, maxPitch: 1.42, bounds: [-14, 52, -18, 20] };
    const home = () => { cam.goalTarget = [19, 0, mobile() ? 0.5 : 0]; cam.goalYaw = 0.42; cam.goalPitch = 0.92; cam.goalDist = mobile() ? 62 : 38; };
    if (mobile()) { cam.dist = 62; }
    GL3D.orbit(canvas, cam, (x, y) => pick(x, y), { groundAt: (x, y) => R.groundAt(x, y) });
    toolbar(wrap, cam, () => { follow = null; home(); }, '<button type="button" class="wide" data-follow="1" title="Suivre un visiteur" aria-label="Suivre un visiteur">👁 Suivre</button>' + (handlers.toggle ? '<button type="button" class="wide" data-toggle="1" title="Revenir à la vue BD 2D">2D</button>' : ''));
    let follow = null;
    const fbtn = wrap.querySelector('[data-follow]');
    fbtn.addEventListener('click', () => {
      if (!agents.length) return;
      const idx = follow == null ? 0 : (agents.indexOf(follow) + 1);
      follow = idx >= agents.length ? null : agents[idx];
      fbtn.textContent = follow ? '👁 Suivant' : '👁 Suivre';
      fbtn.classList.toggle('on', !!follow);
      if (!follow) home();
    });
    canvas.addEventListener('pointerdown', () => { if (follow) { follow = null; fbtn.textContent = '👁 Suivre'; fbtn.classList.remove('on'); } });
    wrap.querySelector('[data-toggle]') && wrap.querySelector('[data-toggle]').addEventListener('click', handlers.toggle);

    let rooms = {}, shell = null, ext = R.mesh(buildExterior()), sig = '', sigT = 0, extra = { benches: [] };
    const agents = [];
    let first = true;
    let raf = null, last = 0, time = 0, size = null;

    function signature(s) {
      return JSON.stringify([Object.keys(s.rooms).map((k) => [s.rooms[k].unlocked, s.rooms[k].theme, s.rooms[k].vitrines]), s.benches, s.shopLevel, ME.Objects.reserveCount(s), s.reserveCap]);
    }
    function rebuild(s) {
      Object.values(rooms).forEach((m) => R.free(m));
      if (shell) Object.values(shell).forEach((m) => R.free(m));
      rooms = {}; extra = { benches: [] };
      Object.keys(D.ROOMS).forEach((id) => { rooms[id] = R.mesh(buildRoom(s, id, extra)); });
      const sh = buildShell(s);
      shell = {}; for (const k in sh) shell[k] = R.mesh(sh[k]);
    }

    function spawn(s, i, inside) {
      const lv = s.lastVisit;
      const sample = lv && lv.sample.length ? lv.sample[i % lv.sample.length] : { type: Object.keys(VLOOKS)[i % 4], sat: 60 };
      const looks = VLOOKS[sample.type];
      const a = { type: sample.type, interest: sample.interest || D.VISITOR_TYPES[sample.type].interests[0], sat: sample.sat, look: looks[i % looks.length], pos: [-9 - Math.random() * 6, 0, 3.4 + Math.random() * 1.2], yaw: Math.PI / 2, queue: [[-0.5, 0, 4], [3, 0, 4]], room: 'hall', step: 0, wait: Math.random() * 6, looked: 0, child: sample.type === 'famille' && i % 2 === 0, bubble: 0, done: false };
      if (inside) {
        // à l'ouverture de la vue, le musée est déjà fréquenté
        const route = ['hall'].concat(ME.Exhibitions.normalizeRoute(s));
        a.step = Math.floor(Math.random() * route.length);
        a.room = route[a.step];
        const r = roomBox(a.room);
        a.pos = [r.cx + (Math.random() - 0.5) * 6, 0, r.cz + 0.5 + Math.random() * 2.5];
        a.queue = []; a.wait = Math.random() * 2; a.yaw = Math.random() * 6.28;
      }
      return a;
    }
    function plan(s, a) {
      const route = ['hall'].concat(ME.Exhibitions.normalizeRoute(s));
      if (a.done) { a.done = false; Object.assign(a, spawn(s, agents.indexOf(a)), { wait: 1 + Math.random() * 4 }); return; }
      const room = s.rooms[a.room];
      const filled = room ? room.vitrines.map((v, i) => [v, i]).filter(([v]) => v) : [];
      if (filled.length && a.looked < Math.min(3, filled.length)) {
        const [, i] = filled[Math.floor(Math.random() * filled.length)];
        const [vx, vz] = slots(a.room, room.vitrines.length)[i];
        a.queue.push([vx + (Math.random() - 0.5) * 0.8, 0, vz + 1.05 + Math.random() * 0.3]);
        a.lookAt = [vx, vz]; a.looked++;
        return;
      }
      a.looked = 0;
      a.step++;
      let next = route[a.step];
      if (!next) next = s.rooms.boutique.unlocked && a.room !== 'boutique' && a.step === route.length ? 'boutique' : null;
      if (!next) {
        // sortie
        pathRooms(s, a.room, 'hall').slice(1).forEach((rid, k, arr) => { a.queue.push(doorPoint(k === 0 ? a.room : arr[k - 1], rid)); });
        a.queue.push([3, 0, 4], [-0.5, 0, 4], [-10, 0, 4]);
        a.room = 'hall'; a.done = true; a.lookAt = null;
        return;
      }
      const path = pathRooms(s, a.room, next);
      for (let k = 1; k < path.length; k++) {
        const dp = doorPoint(path[k - 1], path[k]);
        const r = roomBox(path[k]);
        a.queue.push(dp, [r.cx + (Math.random() - 0.5) * 4, 0, r.cz + 1 + Math.random() * 1.5]);
      }
      a.room = next; a.lookAt = null;
      if (next === 'boutique') a.step = route.length;
    }

    function tickAgents(s, dt, list) {
      const total = s.lastVisit ? s.lastVisit.total : 120;
      const want = Math.max(4, Math.min(mobile() ? 12 : 18, Math.round(total / 30)));
      while (agents.length < want) agents.push(spawn(s, agents.length, first));
      first = false;
      agents.length = want;
      agents.forEach((a) => {
        if (a.wait > 0) { a.wait -= dt; a.walking = false; }
        else if (a.queue.length) {
          const t = a.queue[0];
          const d = V.sub(t, a.pos), L = Math.hypot(d[0], d[2]);
          const sp = 1.6 * dt;
          if (L <= sp) { a.pos = [t[0], 0, t[2]]; a.queue.shift(); if (!a.queue.length && a.lookAt) { a.wait = 2 + Math.random() * 3; a.yaw = Math.atan2(a.lookAt[0] - a.pos[0], a.lookAt[1] - a.pos[2]); a.bubble = 2.2; } }
          else { a.pos[0] += d[0] / L * sp; a.pos[2] += d[2] / L * sp; a.yaw = Math.atan2(d[0], d[2]); a.walking = true; }
        } else plan(s, a);
        a.bubble -= dt;
        const pose = a.walking ? 'walk' : (a.lookAt ? 'look' : 'stand');
        person(list, U, a.pos[0], 0.08, a.pos[2], a.yaw, a.look, { pose, t: time + agents.indexOf(a) });
        if (a.child) person(list, U, a.pos[0] - Math.cos(a.yaw) * 0.55, 0.08, a.pos[2] + Math.sin(a.yaw) * 0.55, a.yaw, a.look, { pose, t: time + 2, scale: 0.68 });
      });
    }

    function pick(px, py) {
      const s = getState();
      const ray = R.ray(px, py);
      let best = null;
      const consider = (t, hit) => { if (t >= 0 && (!best || t < best.t)) best = Object.assign({ t }, hit); };
      Object.keys(D.ROOMS).forEach((id) => {
        const r = roomBox(id);
        consider(GL3D.rayBox(ray, [r.x0, 0, r.z0], [r.x1, 0.12, r.z1]), { room: id });
        const room = s.rooms[id];
        if (room.unlocked && room.vitrines.length) slots(id, room.vitrines.length).forEach(([vx, vz], i) => {
          consider(GL3D.rayBox(ray, [vx - 0.5, 0, vz - 0.5], [vx + 0.5, 2.1, vz + 0.5]), { room: id, obj: room.vitrines[i], slot: i });
        });
      });
      if (!best) return;
      if (best.obj && handlers.onObject) handlers.onObject(best.obj);
      else if (best.slot != null && handlers.onEmptySlot) handlers.onEmptySlot(best.room, best.slot);
      else if (handlers.onRoom) handlers.onRoom(best.room);
    }

    function frame(ts) {
      if (!wrap.isConnected) { stop(); return; }
      const s = getState();
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; time += dt;
      if (!size || size.w !== wrap.clientWidth) size = sizeCanvas(canvas, wrap, mobile() ? 1.05 : 0.56, G.innerHeight * 0.78);
      sigT -= dt;
      if (sigT <= 0) { const sg = signature(s); if (sg !== sig) { sig = sg; rebuild(s); } sigT = 0.4; }
      if (follow && agents.includes(follow)) {
        const behind = follow.yaw + Math.PI;
        cam.goalTarget = [follow.pos[0], 0.6, follow.pos[2]];
        let dy = (behind - cam.yaw) % (Math.PI * 2); if (dy > Math.PI) dy -= Math.PI * 2; if (dy < -Math.PI) dy += Math.PI * 2;
        cam.yaw += dy * Math.min(1, dt * 1.5);
        cam.goalDist = 9; cam.goalPitch = 0.5;
      }
      ease(cam, dt);
      cam.keyTick && cam.keyTick(dt);
      const eye = cam.eye();
      const opaque = [{ mesh: ext, shadow: false }];
      const transparent = [], sprites = [];
      Object.keys(rooms).forEach((id) => {
        const room = s.rooms[id];
        const bright = !room.unlocked ? 0.8 : D.ROOMS[id].kind === 'expo' || D.ROOMS[id].kind === 'temp' || id === 'hall' ? { tamise: 0.82, standard: 1, vif: 1.1 }[room.lighting] : 1;
        opaque.push({ mesh: rooms[id], bright });
      });
      // façades : abaissées si elles regardent la caméra
      const dir = V.norm([eye[0] - 20, 0, eye[2]]);
      const face = { back: [0, 0, -1, -RD], front: [0, 0, 1, RD], left: [-1, 0, 0, 0], right: [1, 0, 0, 40] };
      for (const k in shell || {}) {
        const n = face[k];
        const facing = n[0] * dir[0] + n[2] * dir[2] > 0.25;
        opaque.push({ mesh: shell[k], m: facing ? M.S(1, 0.2, 1) : null });
      }
      // vitrines : objets, verre, faisceaux
      Object.keys(D.ROOMS).forEach((id) => {
        const room = s.rooms[id];
        if (!room.unlocked || !room.vitrines.length) return;
        const big = id === 'hall' ? 1.25 : 1;
        const alpha = { tamise: 0.07, standard: 0.12, vif: 0.2 }[room.lighting];
        slots(id, room.vitrines.length).forEach(([vx, vz], i) => {
          const oid = room.vitrines[i];
          if (oid) {
            const o = s.objects[oid];
            const flat = ME.Models3D.build && objCache.get(o).panel;
            const spin = flat ? Math.sin(time * 0.5 + i) * 0.35 : time * 0.45 + (o.seed % 628) / 100;
            const sc = (flat ? 0.78 : 0.72) * big;
            opaque.push({ mesh: U.cyl, m: M.chain(M.T(vx, 1.06, vz), M.RY(spin), M.S(0.6 * big, 0.05, 0.6 * big)), tint: tint('#7a5a3a') });
            ME.Models3D.draw(R, objCache, o, M.chain(M.T(vx, 1.085, vz), M.RY(spin), M.S(sc)), { opaque, sprites }, { bright: room.lighting === 'tamise' ? 0.9 : room.lighting === 'vif' ? 1.08 : 1 });
          }
          transparent.push({ mesh: U.glass, m: M.chain(M.T(vx, 1.03 + 0.475 * big, vz), M.S(0.86 * big, 0.95 * big, 0.86 * big)), tint: tint('#d8f2f4'), alpha: 0.13, c: [vx, 1.5, vz], outline: false });
          if (id !== 'hall') transparent.push({ mesh: U.beam, m: M.chain(M.T(vx, 2.45, vz), M.S(1.1, 1.0, 1.1)), tint: tint('#ffe9a8'), alpha, c: [vx, 2.4, vz], outline: false });
        });
      });
      // atelier : objets en cours et spécialistes au travail
      s.jobs.forEach((j, i) => {
        const b = extra.benches[i]; if (!b) return;
        const o = s.objects[j.objId];
        ME.Models3D.draw(R, objCache, o, M.chain(M.T(b[0] - 0.2, 0.9, b[1]), M.RY(time * 0.2), M.S(0.5)), { opaque, sprites });
        const p = s.staff.find((x) => x.id === j.staffId);
        if (p) person(opaque, U, b[0], 0.08, b[1] + 0.95, Math.PI, p.look, { pose: 'work', t: time + i, tool: true });
      });
      // médiation à l'accueil
      s.staff.filter((p) => p.assign && p.assign.kind === 'accueil').forEach((p, i) => person(opaque, U, 6.4 - i * 0.7, 0.08, 5.4, Math.PI * 0.85, p.look, { pose: 'stand', t: time }));
      tickAgents(s, dt, opaque);
      R.frame({ eye, target: cam.target, fov: 0.62, light: { dir: [-0.45, -1, -0.5], center: [cam.target[0], 0, cam.target[2]], radius: ME.clamp(cam.dist * 0.62, 9, 26) }, bg: [0.78, 0.86, 0.85], opaque, transparent, sprites, outline: 0.0022 });
      // étiquettes
      ov.begin();
      Object.keys(D.ROOMS).forEach((id) => {
        const r = roomBox(id), room = s.rooms[id], def = D.ROOMS[id];
        if (!room.unlocked) { ov.label(R, [r.cx, 3.6, r.cz], '<b>' + def.name + '</b><small>Travaux · ' + ME.fmtMoney(def.cost) + '</small>', 'room locked'); return; }
        let h = '<b>' + def.name + '</b>';
        if (room.theme) h += '<small style="color:' + D.PERIODS[room.theme].color + '">● ' + D.PERIODS[room.theme].label + '</small>';
        if (id === 'temp' && s.tempExpo) h += '<small>« ' + s.tempExpo.title + ' »</small>';
        if (def.kind === 'atelier') h += '<small>' + s.jobs.length + ' / ' + s.benches + ' postes</small>';
        if (def.kind === 'reserves') h += '<small>' + ME.Objects.reserveCount(s) + ' / ' + s.reserveCap + '</small>';
        ov.label(R, [r.cx, 3.3, r.z0 + 0.6], h, 'room');
      });
      ov.label(R, [-1.1, 4.9, 4], '<b>MUSÉE &amp; EXPÉDITIONS</b>', 'sign');
      if (follow && agents.includes(follow)) {
        const vt = D.VISITOR_TYPES[follow.type];
        const room = D.ROOMS[follow.room] ? D.ROOMS[follow.room].name : '';
        const mood = follow.sat >= 80 ? 'Enchanté·e' : follow.sat >= 60 ? 'Content·e' : follow.sat >= 40 ? 'Mitigé·e' : 'Déçu·e';
        const reason = s.lastVisit && s.lastVisit.reasons.length ? s.lastVisit.reasons[agents.indexOf(follow) % s.lastVisit.reasons.length] : null;
        ov.label(R, [follow.pos[0], 2.5, follow.pos[2]], '<b>' + vt.label.replace(/s$/, '') + ' · ' + mood + ' (' + follow.sat + ' %)</b><small>Aime : ' + D.PERIODS[follow.interest].label + ' · ' + room + '</small>' + (reason ? '<small>« ' + reason.text + ' »</small>' : ''), 'room think');
      }
      agents.forEach((a) => {
        if (a.bubble > 0 && a.lookAt) ov.label(R, [a.pos[0], 2.05, a.pos[2]], a.sat >= 80 ? '★' : a.sat >= 60 ? '♥' : a.sat < 40 ? 'zz' : '?', 'bubble ' + (a.sat >= 80 ? 'wow' : a.sat >= 60 ? 'love' : a.sat < 40 ? 'tired' : 'hmm'));
      });
      ov.end();
      raf = G.requestAnimationFrame(frame);
    }
    function stop() { if (raf) G.cancelAnimationFrame(raf); raf = null; R.destroy(); }
    raf = G.requestAnimationFrame(frame);
    return { stop, cam, R, agents, follow: (i) => { follow = agents[i] || null; } };
  };

  /* =========================================================
   *  LES CHANTIERS D'EXPÉDITION
   * ========================================================= */
  const BIOME = {
    valley: { ground: '#b59a6a', bg: [0.75, 0.85, 0.88] },
    plateau: { ground: '#8fa35a', bg: [0.76, 0.85, 0.89] },
    forest: { ground: '#6f8a4a', bg: [0.74, 0.83, 0.8] },
    sea: { ground: '#d9c79d', bg: [0.62, 0.79, 0.86] },
    desert: { ground: '#e0bf7f', bg: [0.93, 0.85, 0.7] },
    island: { ground: '#cbb68a', bg: [0.65, 0.82, 0.9] },
  };

  function amphora(B, m, color) {
    B.lathe(m, color || '#c86a3e', [[0, -0.5], [0.06, -0.45], [0.18, -0.2], [0.22, 0.05], [0.16, 0.25], [0.07, 0.32], [0.07, 0.5], [0.09, 0.52], [0, 0.53]], 10);
  }

  function buildBackdrop(biome, rnd) {
    const B = new GL3D.Builder();
    const g = BIOME[biome].ground;
    if (biome !== 'sea') B.block(0, -0.3, 0, 34, 0.3, 26, g, { outline: false });
    const tree = (x, z, s, round) => {
      B.cyl(M.chain(M.T(x, 0.7 * s, z), M.S(0.3 * s, 1.4 * s, 0.3 * s)), '#6b4a2b', 6);
      if (round) B.sphere(M.chain(M.T(x, 2.2 * s, z), M.S(2.2 * s, 2.0 * s, 2.2 * s)), rnd() < 0.5 ? '#5f7f45' : '#6f8f4a', 5, 8);
      else B.cyl(M.chain(M.T(x, 2.6 * s, z), M.S(2 * s, 3 * s, 2 * s)), '#4f6a3a', 8, 0, 0.5);
    };
    if (biome === 'valley') {
      const strata = ['#d8c8a0', '#cdb98c', '#e2d4b0', '#c9b282'];
      for (let i = 0; i < 4; i++) B.block(0, i * 1.8, -9 + i * 0.25, 32, 1.8, 4 - i * 0.4, strata[i]);
      B.block(-2, 3.2, -6.6, 9, 0.9, 2.6, '#cdb98c');
      B.block(-2, 0, -8, 8, 3.2, 1.2, '#4a3a2a', { outline: false });
      B.block(0, -0.25, 10.5, 34, 0.3, 4, '#7fa0b0', { outline: false });
      [[-13, 6], [12, 7], [14, -4], [-14, -3]].forEach(([x, z]) => tree(x, z, 1, true));
    } else if (biome === 'plateau') {
      [[-10, -16, 7], [2, -18, 9], [12, -15, 6]].forEach(([x, z, h]) => B.cyl(M.chain(M.T(x, h / 2, z), M.S(h * 1.6, h, h * 1.6)), '#7f8f6a', 12, 0.12, 0.5));
      for (let i = 0; i < 22; i++) B.block(-15 + i * 1.4, 0, -7 + Math.sin(i * 0.5) * 0.4, 1.3, 1.2 + (i % 3) * 0.15, 1.2, i % 2 ? '#9a8a6a' : '#a49474');
      [[-12, 7], [13, 6]].forEach(([x, z]) => tree(x, z, 0.9, true));
    } else if (biome === 'forest') {
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; tree(Math.cos(a) * 14, Math.sin(a) * 10 - 1, 0.9 + rnd() * 0.5, i % 3 !== 0); }
      for (let k = 0; k < 4; k++) {
        const x = -6 + k * 4;
        B.block(x - 1.4, 0, -7, 0.8, 3.6, 0.8, '#d9cfb4'); B.block(x + 1.4, 0, -7, 0.8, 3.6, 0.8, '#d9cfb4');
        for (let j = 0; j < 7; j++) { const a = Math.PI * j / 6; B.block(x - Math.cos(a) * 1.4, 3.6 + Math.sin(a) * 1.3, -7, 0.75, 0.6, 0.8, '#d9cfb4'); }
      }
      B.cyl(M.chain(M.T(5, 0.3, -3), M.RZ(Math.PI / 2), M.S(0.7, 3, 0.7)), '#d9cfb4', 10);
    } else if (biome === 'sea') {
      B.block(0, -0.3, 0, 70, 0.3, 56, '#d9c79d', { outline: false });
      for (let i = 0; i < 20; i++) amphora(B, M.chain(M.T(3 + (i % 5) * 0.9 - 1, 0.25 + Math.floor(i / 10) * 0.3, -3 + Math.floor(i / 5) * 0.7), M.RZ(Math.PI / 2 + (rnd() - 0.5) * 0.6), M.RY(rnd() * 0.5), M.S(1.4)));
      for (let i = 0; i < 9; i++) B.sphere(M.chain(M.T(-12 + rnd() * 24, 0.2, -8 + rnd() * 6), M.S(1 + rnd() * 2, 0.8 + rnd(), 1 + rnd() * 2)), '#8a9a7a', 4, 7);
      for (let i = 0; i < 12; i++) B.cyl(M.chain(M.T(-13 + rnd() * 26, 0.6, -9 + rnd() * 18), M.S(0.12, 1.2 + rnd(), 0.12)), '#5f8f5a', 5);
      B.box(M.chain(M.T(1, 0.35, -4.6), M.RY(0.2), M.S(9, 0.4, 2.4)), '#6b4a2b');
    } else if (biome === 'desert') {
      [[-10, -12, 12], [5, -14, 16], [17, -9, 9]].forEach(([x, z, w]) => B.sphere(M.chain(M.T(x, 0, z), M.S(w, 4, w * 0.6)), '#d7b375', 5, 10));
      [[-12, 4], [-10, 7], [12, 6]].forEach(([x, z]) => {
        for (let k = 0; k < 5; k++) B.cyl(M.chain(M.T(x + k * 0.12, 0.5 + k * 0.9, z), M.S(0.35, 1, 0.35)), '#8a6a44', 6);
        for (let k = 0; k < 6; k++) B.box(M.chain(M.T(x + 0.6, 4.7, z), M.RY(k * 1.05), M.RZ(0.5), M.T(1.1, 0, 0), M.S(2.2, 0.08, 0.6)), '#4f7a3a');
      });
      B.block(-9, 0, -4, 3, 2, 0.8, '#b98a5a'); B.block(-10.5, 0, -2.8, 0.8, 1.4, 3, '#c49a68');
    } else if (biome === 'island') {
      B.block(0, -0.6, 0, 80, 0.3, 70, '#3f7fa0', { outline: false });
      B.sphere(M.chain(M.T(0, -0.74, 0), M.S(30, 1.4, 22)), '#cbb68a', 6, 14);
      [[-11, -5], [10, -6], [12, 4]].forEach(([x, z]) => B.sphere(M.chain(M.T(x, 0.4, z), M.S(3, 2, 2.4)), '#9a8a6a', 4, 7));
      B.block(8, 0, -6, 2.6, 2.2, 2.6, '#fffaf0'); B.sphere(M.chain(M.T(8, 2.2, -6), M.S(2.2)), '#3f6fb0', 6, 10);
      B.block(8, 2.9, -6, 0.1, 0.8, 0.1, '#2b2118'); B.block(8, 3.4, -6, 0.5, 0.1, 0.1, '#2b2118');
    }
    return B;
  }

  function buildDig(exp, state, biome) {
    const B = new GL3D.Builder();
    const sea = biome === 'sea';
    const cols = 6, rows = 2, cw = 1.5;
    const opened = Math.round(exp.progress * cols * rows) + (exp.phase !== 'terrain' ? 99 : 0);
    const x0 = -4.5, z0 = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = x0 + c * cw + cw / 2, z = z0 + r * cw + cw / 2;
      if (i < opened) B.block(x, -0.32, z, cw - 0.08, 0.1, cw - 0.08, sea ? '#b8a77a' : '#6b4a2b', { outline: false });
      else B.block(x, -0.02, z, cw - 0.08, 0.05, cw - 0.08, sea ? '#d2c194' : '#a98f5f', { outline: false });
    }
    for (let c = 0; c <= cols; c++) { B.block(x0 + c * cw, 0.05, z0 + cw, 0.03, 0.03, rows * cw, sea ? '#e3b33a' : '#fffaf0', { outline: false }); B.cyl(M.chain(M.T(x0 + c * cw, 0.2, z0), M.S(0.06, 0.4, 0.06)), '#7a5a3a', 5); B.cyl(M.chain(M.T(x0 + c * cw, 0.2, z0 + rows * cw), M.S(0.06, 0.4, 0.06)), '#7a5a3a', 5); }
    for (let r = 0; r <= rows; r++) B.block(x0 + cols * cw / 2, 0.05, z0 + r * cw, cols * cw, 0.03, 0.03, sea ? '#e3b33a' : '#fffaf0', { outline: false });
    // fanions des découvertes
    exp.finds.forEach((id, k) => {
      const o = state.objects[id];
      const x = x0 + (k % cols) * cw + 0.5 + (k * 0.37) % 0.6, z = z0 + (Math.floor(k / cols) % rows) * cw + 0.5;
      B.cyl(M.chain(M.T(x, 0.35, z), M.S(0.04, 0.7, 0.04)), '#2b2118', 5);
      B.box(M.chain(M.T(x + 0.16, 0.6, z), M.S(0.3, 0.2, 0.02)), D.RARITY[o.rarity].color);
    });
    if (!sea) {
      const camp = exp.equip.includes('camp');
      const tents = camp ? [[6.5, -2.5, '#e3d4ae'], [9, -0.5, '#c9b48a']] : [[7.5, -2, '#d8c8a0']];
      tents.forEach(([x, z, c]) => { B.prism(M.chain(M.T(x, 0.9, z), M.RY(0.3), M.S(2.4, 1.8, 2.8)), c); B.prism(M.chain(M.T(x + 0.05, 0.45, z + 1.42 * Math.cos(0.3)), M.RY(0.3), M.S(0.7, 0.9, 0.02)), '#3a2a1a', { outline: false }); });
      B.cyl(M.chain(M.T(9.5, 1.6, 3), M.S(0.08, 3.2, 0.08)), '#2b2118', 5);
      // table de terrain + caisses
      B.block(5.5, 0.8, 3, 2.2, 0.08, 1, '#9a6a3c');
      for (const [sx, sz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) B.block(5.5 + sx, 0, 3 + sz, 0.08, 0.8, 0.08, '#6b4524');
      for (let i = 0; i < Math.min(6, exp.finds.length); i++) B.block(4.2 + (i % 3) * 0.75, (Math.floor(i / 3)) * 0.55, 4.6, 0.65, 0.5, 0.65, '#b98a55');
      // brouette, tamis, seau
      B.box(M.chain(M.T(-6.8, 0.55, 3.2), M.RY(0.5), M.S(1.1, 0.45, 0.75)), '#7a7f85');
      B.cyl(M.chain(M.T(-7.4, 0.25, 2.9), M.RZ(Math.PI / 2), M.S(0.5, 0.1, 0.5)), '#2b2118', 8);
      B.cyl(M.chain(M.T(-5.6, 0.12, 4.4), M.S(1.4, 0.2, 1.4)), '#c9a77a', 12);
      B.cyl(M.chain(M.T(-4.6, 0.25, 4.5), M.S(0.5, 0.5, 0.5)), '#b23a2a', 10, 0.5, 0.4);
      // feu de camp
      if (camp) { for (let i = 0; i < 6; i++) B.block(4 + Math.cos(i) * 0.5, 0, -0.8 + Math.sin(i) * 0.5, 0.25, 0.22, 0.25, '#7a7f85'); }
    }
    if (exp.phase !== 'terrain') {
      // départ des caisses
      if (!sea) {
        const tx = 2;
        B.block(tx, 0.5, 6.5, 4.4, 1.9, 2.1, '#3f5a92'); B.block(tx + 3, 0.5, 6.5, 1.7, 1.5, 2.1, '#5f7aa2');
        B.block(tx + 3.55, 1.25, 6.5, 0.05, 0.55, 1.7, '#cfe0e6');
        for (const wx of [tx - 1.3, tx + 1.3, tx + 3.1]) for (const wz of [5.4, 7.6]) B.cyl(M.chain(M.T(wx, 0.45, wz), M.RX(Math.PI / 2), M.S(0.9, 0.3, 0.9)), '#2b2118', 10);
        for (let i = 0; i < Math.min(8, exp.finds.length); i++) B.block(tx - 1.6 + (i % 4) * 1.05, 2.4 + Math.floor(i / 4) * 0.7, 6.5, 0.95, 0.65, 0.95, '#b98a55');
      } else {
        for (let i = 0; i < Math.min(8, exp.finds.length); i++) B.block(-1 + (i % 4) * 1.05, 0, 4.5 + Math.floor(i / 4), 0.95, 0.65, 0.95, '#b98a55');
      }
    }
    return B;
  }

  function buildBoat() {
    const B = new GL3D.Builder();
    B.box(M.chain(M.T(0, 0.4, 0), M.S(6, 0.8, 2.2)), '#fffaf0');
    B.box(M.chain(M.T(0, 0.85, 0), M.S(6.1, 0.15, 2.3)), '#b23a2a');
    B.prism(M.chain(M.T(3.45, 0.45, 0), M.RZ(-Math.PI / 2), M.S(2.2, 0.9, 0.8)), '#fffaf0');
    B.block(-0.8, 0.9, 0, 2.2, 1.2, 1.7, '#fffaf0'); B.block(-0.8, 2.1, 0, 2.4, 0.1, 1.9, '#3f5a92');
    B.cyl(M.chain(M.T(1.6, 2.2, 0), M.S(0.08, 2.6, 0.08)), '#2b2118', 5);
    B.box(M.chain(M.T(1.85, 3.2, 0), M.S(0.5, 0.3, 0.02)), '#b23a2a');
    return B;
  }

  S3.expedition = function (wrap, getExp, getState) {
    const canvas = doc.createElement('canvas');
    canvas.className = 'gl-canvas';
    wrap.appendChild(canvas);
    let R;
    try { R = GL3D.create(canvas, { shadowSize: 1024 }); } catch (e) { R = null; }
    if (!R) { canvas.remove(); return null; }
    const U = unitMeshes(R);
    const objCache = ME.Models3D.cache(R);
    const ov = overlay(wrap);
    const exp0 = getExp();
    const dest = D.DESTINATIONS[exp0.dest];
    const biome = dest.biome;
    const sea = biome === 'sea';
    const rnd = ME.seeded(exp0.id.length * 7919 + exp0.startWeek);
    const cam = { target: [0, sea ? 1.5 : 0.5, 1.2], yaw: 0.55, pitch: sea ? 0.32 : 0.62, dist: sea ? 15 : 15.5, minDist: 8, maxDist: 40, minPitch: 0.15, maxPitch: 1.35, bounds: [-12, 12, -10, 10] };
    GL3D.orbit(canvas, cam, null, { groundAt: (x, y) => R.groundAt(x, y) });
    toolbar(wrap, cam, () => { cam.goalYaw = 0.55; cam.goalDist = sea ? 15 : 15.5; cam.goalTarget = [0, sea ? 1.5 : 0.5, 1]; cam.goalPitch = sea ? 0.32 : 0.6; });
    const back = R.mesh(buildBackdrop(biome, rnd));
    const boat = sea ? R.mesh(buildBoat()) : null;
    let dig = null, sig = '';
    let raf = null, last = 0, time = 0, size = null;
    function frame(ts) {
      const exp = getExp(), state = getState();
      if (!wrap.isConnected || !exp) { stop(); return; }
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; time += dt;
      if (!size || size.w !== wrap.clientWidth) size = sizeCanvas(canvas, wrap, wrap.clientWidth < 720 ? 0.85 : 0.46, 560);
      const sg = exp.phase + exp.weekDone + ':' + exp.finds.length;
      if (sg !== sig) { sig = sg; if (dig) R.free(dig); dig = R.mesh(buildDig(exp, state, biome)); }
      if (!cam.userMoved) cam.yaw = 0.55 + Math.sin(time * 0.12) * 0.35;
      ease(cam, dt);
      cam.keyTick && cam.keyTick(dt);
      const opaque = [{ mesh: back }, { mesh: dig }];
      const transparent = [], sprites = [];
      exp.finds.forEach((id, k) => {
        const o = state.objects[id];
        if (!o || exp.phase !== 'terrain') return;
        const x = -4.5 + (k % 6) * 1.5 + 0.95 - (k * 0.37) % 0.6 * 0.3, z = (Math.floor(k / 6) % 2) * 1.5 + 0.9;
        ME.Models3D.draw(R, objCache, o, M.chain(M.T(x + 0.25, 0.05, z), M.RY(o.seed % 6), M.RX(sea ? 1.3 : 1.2), M.S(0.62)), { opaque, sprites: null }, { tint: tint(o.revealed ? '#ffffff' : '#9c8460') });
      });
      const team = exp.team.map((id) => state.staff.find((p) => p.id === id)).filter(Boolean);
      if (exp.phase === 'terrain') {
        team.forEach((p, i) => {
          if (sea) {
            const x = -3 + i * 2.2 + Math.sin(time * 0.7 + i) * 1.2, y = 1.2 + Math.sin(time + i) * 0.3, z = 1 + Math.cos(time * 0.6 + i) * 1.2;
            person(opaque, U, x, y, z, Math.sin(time * 0.3 + i) + 1.5, p.look, { pose: 'dive', t: time + i, scale: 1.35 });
            for (let b = 0; b < 3; b++) { const by = (time * 1.2 + b * 1.4 + i) % 4.5; transparent.push({ mesh: U.glass, m: M.chain(M.T(x + 0.1, y + 0.8 + by, z - 0.2), M.S(0.12)), tint: tint('#ffffff'), alpha: 0.5, c: [x, y + by, z] }); }
          } else {
            const k = i % 3 === 2;
            person(opaque, U, -3.8 + i * 2.1, 0, k ? 3.6 : 0.9 + (i % 2) * 1.5, k ? Math.PI * 1.1 : Math.PI * 0.95, p.look, { pose: k ? 'stand' : 'kneel', t: time + i, tool: !k, scale: 1.4 });
          }
        });
        if (!sea) {
          opaque.push({ mesh: U.box, m: M.chain(M.T(9.5, 3.0, 3), M.RY(Math.sin(time * 3) * 0.25), M.T(0.45, 0, 0), M.S(0.9, 0.55, 0.03)), tint: tint('#b23a2a') });
          if (exp.equip.includes('camp')) opaque.push({ mesh: U.cone, m: M.chain(M.T(4, 0.35 + Math.sin(time * 9) * 0.04, -0.8), M.S(0.6, 0.7 + Math.sin(time * 11) * 0.1, 0.6)), tint: tint('#e07b3a'), shadow: false });
        }
      } else {
        team.forEach((p, i) => person(opaque, U, sea ? -1 + i * 1.2 : -1.5 + i * 1.1, 0, sea ? 3.2 : 4.4, Math.PI * 0.2, p.look, { pose: i % 2 ? 'stand' : 'walk', t: time + i }));
      }
      if (sea) {
        const by = 5.6 + Math.sin(time * 1.4) * 0.12;
        opaque.push({ mesh: boat, m: M.chain(M.T(4, by, -3), M.RZ(Math.sin(time * 1.1) * 0.04)) });
        transparent.push({ mesh: U.water, m: M.chain(M.T(0, 2.8, 0), M.S(70, 5.6, 56)), tint: tint('#2f7fa0'), alpha: 0.2, c: [0, 2.8, 60] });
        transparent.push({ mesh: U.water, m: M.chain(M.T(0, 5.6 + Math.sin(time) * 0.05, 0), M.S(70, 0.05, 56)), tint: tint('#7fc0d8'), alpha: 0.4, c: [0, 5.6, 0] });
      }
      R.frame({ eye: cam.eye(), target: cam.target, fov: 0.7, light: { dir: [-0.5, -1, -0.35], center: [0, 0, 0], radius: 18 }, bg: BIOME[biome].bg, opaque, transparent, sprites, outline: 0.0026 });
      ov.begin();
      const phase = exp.phase === 'terrain' ? 'Semaine ' + Math.min(exp.weeks, exp.weekDone + 1) + ' / ' + exp.weeks + ' sur le terrain' : exp.phase === 'transport' ? 'Caisses en route vers le musée' : 'Campagne terminée';
      ov.label(R, [cam.target[0], cam.target[1], cam.target[2]], '', 'hidden');
      ov.end();
      banner.innerHTML = '<b>' + dest.name + '</b><small>' + phase + ' · ' + exp.finds.length + ' découverte(s)</small>';
      raf = G.requestAnimationFrame(frame);
    }
    const banner = doc.createElement('div'); banner.className = 'gl-banner'; wrap.appendChild(banner);
    function stop() { if (raf) G.cancelAnimationFrame(raf); raf = null; R.destroy(); }
    raf = G.requestAnimationFrame(frame);
    return { stop, cam };
  };
  /* =========================================================
   *  VISIONNEUSE D'OBJET (fiche, déballage)
   * ========================================================= */
  S3.viewer = function (wrap, obj, opts) {
    opts = opts || {};
    const canvas = doc.createElement('canvas');
    canvas.className = 'gl-canvas';
    canvas.setAttribute('aria-label', 'Objet en 3D : faites glisser pour le tourner');
    wrap.appendChild(canvas);
    let R;
    try { R = GL3D.create(canvas, { shadowSize: 512 }); } catch (e) { R = null; }
    if (!R) { canvas.remove(); return null; }
    const U = unitMeshes(R);
    const cache = ME.Models3D.cache(R);
    const plinth = (() => { const B = new GL3D.Builder(); B.cyl(M.chain(M.T(0, -0.09, 0), M.S(1.5, 0.18, 1.5)), '#efe2c2', 24); B.cyl(M.chain(M.T(0, -0.2, 0), M.S(1.62, 0.06, 1.62)), '#7a5a3a', 24); return R.mesh(B); })();
    const cam = { target: [0, 0.5, 0], yaw: 0.6, pitch: 0.3, dist: 2.25, minDist: 1.3, maxDist: 5, minPitch: -0.1, maxPitch: 1.3 };
    GL3D.orbit(canvas, cam, null, { dragRotate: true });
    let raf = null, last = 0, time = 0, size = null, idle = 0;
    function frame(ts) {
      if (!wrap.isConnected) { stop(); return; }
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; time += dt;
      if (!size || size.w !== wrap.clientWidth) size = sizeCanvas(canvas, wrap, 1, 420);
      if (cam.userMoved) { idle += dt; if (idle > 4) { cam.userMoved = false; } } else { idle = 0; cam.yaw += dt * 0.5; }
      cam.clamp && cam.clamp();
      const opaque = [{ mesh: plinth, shadow: false }], sprites = [];
      const pop = opts.pop ? Math.min(1, time / 0.8) : 1;
      const s = 0.25 + 0.75 * (1 - Math.pow(1 - pop, 3));
      ME.Models3D.draw(R, cache, obj, M.chain(M.T(0, 0, 0), M.RY(opts.pop ? (1 - pop) * 3 : 0), M.S(s)), { opaque, sprites }, { outlineW: 0.0024 });
      R.frame({ eye: cam.eye(), target: cam.target, fov: 0.62, near: 0.1, far: 40, light: { dir: [-0.45, -1, -0.6], center: [0, 0.5, 0], radius: 2 }, bg: [0.98, 0.95, 0.88], opaque, transparent: [], sprites, outline: 0.0024 });
      raf = G.requestAnimationFrame(frame);
    }
    function stop() { if (raf) G.cancelAnimationFrame(raf); raf = null; R.destroy(); }
    raf = G.requestAnimationFrame(frame);
    return { stop, cam };
  };
})(typeof window !== 'undefined' ? window : globalThis);
