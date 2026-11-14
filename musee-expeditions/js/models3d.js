/* Musée & Expéditions — models3d.js
 * Modèles 3D procéduraux des 36 types d'objets (volumes simples façon BD).
 * Chaque modèle est ajusté automatiquement dans un cube unité, posé sur y = 0.
 * Les objets plats et peints (papyrus, portrait, vitrail, carreau, feuillet) sont
 * présentés sur un panneau texturé avec leur illustration, dans un cadre en volume.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const GL3D = ME.GL3D, M = GL3D.M4;
  const MOD = (ME.Models3D = {});
  const { T, S, RX, RY, RZ, chain } = M;

  /** Couleurs du matériau, assombries et ternies selon l'état de l'objet. */
  function palette(o) {
    const p = ME.Art.PAL[o.mat] || ME.Art.PAL.pierre;
    const wear = (1 - (o.condition == null ? 80 : o.condition) / 100) * 0.4;
    return p.map((c) => GL3D.mix(c, '#6b5a45', wear));
  }

  /** Ramène le maillage dans un cube unité, posé au sol et centré. */
  function fit(B, maxH, maxW) {
    const d = B.data;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < d.length; i += 12) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], d[i + k]); mx[k] = Math.max(mx[k], d[i + k]); }
    const h = mx[1] - mn[1] || 1, w = Math.max(mx[0] - mn[0], mx[2] - mn[2]) || 1;
    const s = Math.min((maxH || 1) / h, (maxW || 1) / w);
    const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
    for (let i = 0; i < d.length; i += 12) { d[i] = (d[i] - cx) * s; d[i + 1] = (d[i + 1] - mn[1]) * s; d[i + 2] = (d[i + 2] - cz) * s; }
    return B;
  }

  const F = {}; // constructeurs : (B, pal, o, rnd) => éventuellement { panel }

  F.biface = (B, p) => { B.lathe(S(1, 1, 0.38), p[0], [[0, 0], [0.2, 0.08], [0.3, 0.35], [0.24, 0.7], [0.1, 0.95], [0, 1]], 7); };
  F.blade = (B, p) => { B.lathe(S(1, 1, 0.32), p[0], [[0, 0], [0.07, 0.06], [0.1, 0.5], [0.08, 0.92], [0, 1]], 6); };
  F.point = (B, p) => {
    B.cyl(chain(T(0, 0.45, 0), S(0.1, 0.8, 0.1)), p[0], 7);
    B.cyl(chain(T(0, 0.95, 0), S(0.1, 0.2, 0.1)), p[0], 7, 0, 0.5);
    B.box(chain(T(0, 0.03, 0), RZ(0.5), S(0.08, 0.1, 0.1)), p[1]);
  };
  F.propulseur = (B, p) => {
    B.box(chain(T(0, 0.45, 0), RZ(0.35), S(0.08, 0.95, 0.08)), p[0]);
    B.sphere(chain(T(0.2, 0.95, 0), S(0.32, 0.18, 0.16)), p[0], 5, 8);
    B.sphere(chain(T(0.38, 1.05, 0), S(0.13)), p[0], 5, 8);
    for (const z of [-0.03, 0.03]) B.cyl(chain(T(0.36, 1.18, z), RZ(0.6), S(0.03, 0.22, 0.03)), p[1], 5);
    for (const x of [0.1, 0.28]) B.box(chain(T(x, 0.82, 0), S(0.04, 0.12, 0.05)), p[0]);
  };
  F.stoneLamp = (B, p) => {
    B.sphere(chain(T(0, 0.12, 0), S(0.62, 0.26, 0.5)), p[0], 5, 10);
    B.box(chain(T(0.42, 0.12, 0), S(0.36, 0.12, 0.16)), p[0]);
    B.cyl(chain(T(-0.04, 0.24, 0), S(0.34, 0.03, 0.26)), '#2b2118', 10);
  };
  F.venus = (B, p) => {
    B.sphere(chain(T(0, 1.0, 0), S(0.16, 0.2, 0.16)), p[0], 5, 8);
    B.sphere(chain(T(0, 0.72, 0), S(0.32, 0.36, 0.26)), p[0], 5, 8);
    for (const x of [-0.08, 0.08]) B.sphere(chain(T(x, 0.74, 0.1), S(0.14)), p[0], 4, 7);
    B.sphere(chain(T(0, 0.45, 0), S(0.46, 0.34, 0.34)), p[0], 5, 9);
    B.cyl(chain(T(0, 0.15, 0), S(0.26, 0.34, 0.2)), p[0], 8, 0.6, 0.15);
  };
  F.beads = (B, p) => {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.1 + 0.8 * i / 8);
      B.sphere(chain(T(Math.cos(a) * 0.5, 0.55 - Math.sin(a) * 0.45, 0), RZ(a), S(0.1, 0.16, 0.08)), p[i % 2 ? 0 : 2], 4, 7);
    }
    B.cyl(chain(T(-0.5, 0.6, 0), S(0.02, 0.2, 0.02)), '#6b4a2b', 4); B.cyl(chain(T(0.5, 0.6, 0), S(0.02, 0.2, 0.02)), '#6b4a2b', 4);
  };
  F.sherd = (B, p, o, r) => {
    B.box(chain(T(0, 0.4, 0), RZ(0.15), RY(0.2), S(0.8, 0.6, 0.05)), '#d98a5a');
    B.box(chain(T(0, 0.42, 0.03), RZ(0.15), RY(0.2), S(0.78, 0.08, 0.02)), '#7a2f1a', { outline: false });
    B.box(chain(T(0, 0.26, 0.03), RZ(0.15), RY(0.2), S(0.7, 0.04, 0.02)), '#f2e2c4', { outline: false });
  };
  F.fibula = (B, p) => {
    for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; B.sphere(chain(T(-Math.cos(a) * 0.4, 0.15 + Math.sin(a) * 0.45, 0), S(0.11)), p[0], 4, 7); }
    for (let i = 0; i < 4; i++) B.cyl(chain(T(-0.45, 0.15, -0.06 + i * 0.04), RX(Math.PI / 2), S(0.1, 0.03, 0.1)), p[1], 8);
    B.cyl(chain(T(0, 0.08, 0), RZ(Math.PI / 2), S(0.03, 0.85, 0.03)), p[1], 5);
    B.box(chain(T(0.42, 0.12, 0), S(0.1, 0.12, 0.08)), p[0]);
  };
  F.coin = (B, p, o) => {
    B.cyl(chain(T(0, 0.5, 0), RX(Math.PI / 2), S(1, 0.08, 1)), p[0], 18);
    B.cyl(chain(T(0, 0.5, 0.045), RX(Math.PI / 2), S(0.84, 0.02, 0.84)), p[2], 18, null, null, { outline: false });
    if (o.type === 'denier') { B.box(chain(T(0, 0.5, 0.06), S(0.08, 0.5, 0.02)), p[1]); B.box(chain(T(0, 0.5, 0.06), S(0.5, 0.08, 0.02)), p[1]); }
    else { B.sphere(chain(T(0.02, 0.55, 0.06), S(0.34, 0.42, 0.06)), p[1], 4, 9); B.sphere(chain(T(0.14, 0.52, 0.07), S(0.1, 0.08, 0.04)), p[1], 3, 6); }
  };
  MOD.amphoraProfile = (rom) => rom
    ? [[0, 0], [0.04, 0.02], [0.08, 0.12], [0.2, 0.32], [0.24, 0.5], [0.18, 0.68], [0.08, 0.76], [0.07, 0.94], [0.09, 0.96], [0.06, 1], [0, 1]]
    : [[0, 0], [0.04, 0.03], [0.07, 0.16], [0.17, 0.32], [0.2, 0.46], [0.15, 0.6], [0.07, 0.66], [0.065, 0.94], [0.085, 0.96], [0.06, 1], [0, 1]];
  F.amphora = (B, p, o) => {
    const rom = o.type === 'amphore';
    B.lathe(M.ident(), p[0], MOD.amphoraProfile(rom), 12);
    const y0 = rom ? 0.72 : 0.64, y1 = rom ? 0.9 : 0.86;
    for (const sg of [-1, 1]) {
      B.box(chain(T(sg * 0.15, (y0 + y1) / 2, 0), RZ(sg * 0.25), S(0.04, y1 - y0, 0.05)), p[0]);
      B.box(chain(T(sg * 0.105, y1, 0), S(0.1, 0.035, 0.05)), p[0]);
    }
    if (rom) for (let i = 0; i < 6; i++) B.sphere(chain(T(Math.cos(i * 1.7) * 0.2, 0.3 + (i % 3) * 0.12, Math.sin(i * 1.7) * 0.2), S(0.06)), '#efe8d8', 3, 6);
  };
  F.torc = (B, p) => {
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.3 + (Math.PI * 1.4) * i / 15;
      B.cyl(chain(T(Math.cos(a) * 0.45, 0.5 + Math.sin(a) * 0.45, 0), RZ(a), S(0.08, 0.2, 0.08)), p[0], 7);
    }
    for (const sg of [-1, 1]) B.sphere(chain(T(sg * 0.25, 0.9, 0), S(0.16)), p[0], 5, 8);
  };
  F.sword = (B, p, o) => {
    B.box(chain(T(0, 0.45, 0), S(0.1, 0.85, 0.035)), '#4a3328');
    B.box(chain(T(0, 0.45, 0.02), S(0.07, 0.8, 0.02)), p[0]);
    B.box(chain(T(0, 0.04, 0), S(0.12, 0.08, 0.05)), p[1]);
    B.box(chain(T(0, 0.88, 0), S(0.26, 0.05, 0.06)), '#4a3328');
    B.cyl(chain(T(0, 0.96, 0), S(0.05, 0.14, 0.05)), '#5a3d2c', 6);
    B.sphere(chain(T(0, 1.05, 0), S(0.09)), p[1], 4, 7);
  };
  F.scarab = (B, p) => {
    B.sphere(chain(T(0, 0.12, 0.05), S(0.5, 0.3, 0.62)), p[0], 5, 10);
    B.box(chain(T(0, 0.14, -0.3), S(0.32, 0.14, 0.16)), p[0]);
    B.box(chain(T(0, 0.12, -0.42), S(0.22, 0.1, 0.1)), p[1]);
    B.box(chain(T(0, 0.27, 0.08), S(0.02, 0.03, 0.5)), p[1], { outline: false });
    for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) B.box(chain(T(sg * 0.28, 0.04, -0.15 + i * 0.18), RY(sg * (i - 1) * 0.4), S(0.14, 0.03, 0.03)), p[1]);
  };
  F.ushabti = (B, p) => {
    B.cyl(chain(T(0, 0.4, 0), S(0.36, 0.8, 0.26)), p[0], 10, 0.62, 0.45);
    B.sphere(chain(T(0, 0.86, 0), S(0.24, 0.26, 0.22)), p[2], 5, 8);
    B.cyl(chain(T(0, 0.82, -0.02), S(0.34, 0.3, 0.26)), '#1d5f6e', 10, 0.5, 0.6);
    B.box(chain(T(0, 0.58, 0.12), S(0.28, 0.06, 0.04)), p[1]);
    for (let i = 0; i < 4; i++) B.box(chain(T(0, 0.12 + i * 0.09, 0.11), S(0.08, 0.04, 0.02)), '#2b2118', { outline: false });
  };
  F.amulet = (B, p) => {
    B.sphere(chain(T(0, 0.55, 0), S(0.8, 0.36, 0.12)), p[0], 4, 12);
    B.sphere(chain(T(0, 0.55, 0.05), S(0.22, 0.22, 0.08)), '#13353d', 4, 8);
    B.box(chain(T(0, 0.86, 0), S(0.8, 0.07, 0.08)), p[0]);
    B.box(chain(T(-0.1, 0.25, 0), RZ(-0.2), S(0.07, 0.36, 0.08)), p[0]);
    B.box(chain(T(0.22, 0.24, 0), RZ(0.6), S(0.07, 0.3, 0.08)), p[0]);
    B.sphere(chain(T(0.32, 0.1, 0), S(0.12, 0.12, 0.08)), p[0], 4, 7);
  };
  F.oilLamp = (B, p, o) => {
    B.lathe(chain(T(0, 0, 0), S(1, 0.6, 1)), p[0], [[0, 0], [0.3, 0.02], [0.4, 0.15], [0.36, 0.3], [0.12, 0.34], [0.1, 0.3], [0, 0.3]], 12);
    B.box(chain(T(0.42, 0.1, 0), S(0.36, 0.12, 0.18)), p[0]);
    B.cyl(chain(T(0.56, 0.17, 0), S(0.06, 0.02, 0.06)), '#2b2118', 8);
    B.cyl(chain(T(-0.42, 0.16, 0), RZ(Math.PI / 2), S(0.14, 0.05, 0.14)), p[0], 8);
    if (o.type === 'lampeRom') for (const z of [-0.12, 0.12]) B.sphere(chain(T(0.3, 0.17, z), S(0.08)), p[0], 4, 6);
  };
  F.cat = (B, p) => {
    B.cyl(chain(T(0, 0.3, 0), S(0.36, 0.6, 0.32)), p[0], 10, 0.55, 0.5);
    B.sphere(chain(T(0, 0.08, 0.05), S(0.4, 0.18, 0.45)), p[0], 4, 8);
    B.sphere(chain(T(0, 0.72, 0.03), S(0.24, 0.22, 0.24)), p[0], 5, 8);
    for (const sg of [-1, 1]) B.cyl(chain(T(sg * 0.07, 0.88, 0.02), S(0.07, 0.12, 0.05)), p[0], 4, 0, 0.5);
    B.cyl(chain(T(0.18, 0.08, -0.14), RZ(-1.2), S(0.05, 0.4, 0.05)), p[0], 6);
    B.sphere(chain(T(-0.1, 0.84, 0.02), S(0.04)), '#e3b33a', 3, 6);
    for (const sg of [-1, 1]) B.sphere(chain(T(sg * 0.05, 0.75, 0.13), S(0.03)), '#2b2118', 3, 6, { outline: false });
  };
  F.bowl = (B, p) => {
    B.lathe(M.ident(), '#b6452a', [[0, 0], [0.12, 0], [0.13, 0.06], [0.2, 0.08], [0.38, 0.22], [0.46, 0.42], [0.47, 0.46], [0.42, 0.46], [0, 0.46]], 16);
    B.cyl(chain(T(0, 0.32, 0), S(0.86, 0.04, 0.86)), '#7a2f1a', 16, null, null, { outline: false });
  };
  F.ingot = (B, p) => {
    B.box(chain(T(0, 0.15, 0), S(1, 0.3, 0.32)), p[0]);
    B.cyl(chain(T(0, 0.3, 0), RZ(Math.PI / 2), S(0.3, 0.9, 0.3)), p[2], 10);
    B.box(chain(T(0, 0.2, 0.165), S(0.4, 0.1, 0.02)), p[1]);
  };
  F.figurine = (B, p) => {
    for (const sg of [-1, 1]) B.box(chain(T(sg * 0.06, 0.2, 0), RZ(sg * 0.06), S(0.08, 0.4, 0.09)), p[0]);
    B.cyl(chain(T(0, 0.55, 0), S(0.26, 0.34, 0.18)), p[0], 8, 0.42, 0.5);
    B.sphere(chain(T(0, 0.82, 0), S(0.16)), p[0], 5, 8);
    B.cyl(chain(T(0, 0.9, 0), S(0.26, 0.03, 0.26)), p[1], 10);
    for (const sg of [-1, 1]) B.box(chain(T(sg * 0.13, 0.94, 0), RZ(sg * 0.6), S(0.12, 0.03, 0.03)), p[2]);
    B.box(chain(T(0.17, 0.62, 0), RZ(-0.4), S(0.06, 0.26, 0.06)), p[0]);
    B.cyl(chain(T(-0.2, 0.5, 0.04), S(0.025, 0.8, 0.025)), p[1], 5);
    B.sphere(chain(T(-0.2, 0.92, 0.04), S(0.06)), p[1], 4, 6);
  };
  F.flask = (B, p) => {
    B.lathe(M.ident(), p[0], [[0, 0], [0.18, 0.01], [0.32, 0.14], [0.33, 0.3], [0.22, 0.44], [0.07, 0.5], [0.06, 0.92], [0.09, 0.95], [0.06, 1], [0, 1]], 12);
    B.sphere(chain(T(-0.12, 0.27, 0.22), S(0.08, 0.14, 0.04)), p[2], 3, 6, { outline: false });
  };
  F.anchorStock = (B, p) => {
    B.box(chain(T(0, 0.12, 0), S(0.4, 0.24, 0.2)), p[1]);
    for (const sg of [-1, 1]) B.cyl(chain(T(sg * 0.5, 0.12, 0), RZ(sg * Math.PI / 2), S(0.18, 0.62, 0.14)), p[0], 6, 0.45, 0.65);
  };
  F.capital = (B, p) => {
    B.box(chain(T(0, 0.92, 0), S(1, 0.16, 1)), p[0]);
    B.cyl(chain(T(0, 0.48, 0), S(0.78, 0.72, 0.78)), p[0], 8, 0.62, 0.42);
    B.cyl(chain(T(0, 0.06, 0), S(0.5, 0.12, 0.5)), p[1], 10);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; B.sphere(chain(T(Math.cos(a) * 0.4, 0.78, Math.sin(a) * 0.4), S(0.16)), p[2], 4, 7); }
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; B.box(chain(T(Math.cos(a) * 0.27, 0.4, Math.sin(a) * 0.27), RY(-a), S(0.04, 0.4, 0.12)), p[1]); }
  };
  F.seal = (B, p) => {
    B.sphere(chain(T(0, 0.45, 0), S(0.5, 0.9, 0.1)), p[0], 4, 12);
    B.cyl(chain(T(0, 0.95, 0), RX(Math.PI / 2), S(0.16, 0.06, 0.16)), p[0], 10);
    B.sphere(chain(T(0, 0.58, 0.05), S(0.1)), p[1], 4, 6);
    B.box(chain(T(0, 0.38, 0.05), S(0.16, 0.26, 0.03)), p[1]);
  };
  F.cross = (B, p) => {
    B.box(chain(T(0, 0.5, 0), S(0.14, 1, 0.08)), p[0]);
    B.box(chain(T(0, 0.68, 0), S(0.66, 0.14, 0.08)), p[0]);
    B.box(chain(T(0, 0.5, 0.045), S(0.08, 0.9, 0.02)), '#2b4f9e', { outline: false });
    B.box(chain(T(0, 0.68, 0.045), S(0.58, 0.08, 0.02)), '#2b4f9e', { outline: false });
    B.sphere(chain(T(0, 0.68, 0.06), S(0.13)), '#b2302a', 4, 8);
    for (const [x, y] of [[0, 0.95], [0, 0.2], [-0.28, 0.68], [0.28, 0.68]]) B.sphere(chain(T(x, y, 0.05), S(0.07)), '#3b7d4a', 3, 6);
    B.cyl(chain(T(0, 0.02, 0), S(0.3, 0.04, 0.2)), p[1], 10);
  };
  F.cycladic = (B, p) => {
    B.box(chain(T(0, 0.93, 0), RX(-0.25), S(0.2, 0.18, 0.05)), p[0]);
    B.cyl(chain(T(0, 0.82, 0), S(0.06, 0.1, 0.05)), p[0], 6);
    B.box(chain(T(0, 0.64, 0), S(0.3, 0.28, 0.08)), p[0]);
    B.box(chain(T(0, 0.6, 0.045), S(0.26, 0.05, 0.02)), p[1], { outline: false });
    for (const sg of [-1, 1]) B.box(chain(T(sg * 0.06, 0.25, 0), RZ(sg * 0.04), S(0.11, 0.5, 0.07)), p[0]);
  };
  F.jug = (B, p) => {
    B.lathe(M.ident(), p[0], [[0, 0], [0.18, 0.01], [0.32, 0.18], [0.3, 0.42], [0.12, 0.6], [0.09, 0.62], [0, 0.62]], 12);
    B.cyl(chain(T(-0.14, 0.76, 0), RZ(0.6), S(0.13, 0.36, 0.13)), p[0], 8, 0.35, 0.6);
    B.box(chain(T(0.3, 0.42, 0), RZ(-0.3), S(0.05, 0.32, 0.06)), p[0]);
  };
  F.dagger = (B, p) => {
    B.prism(chain(T(0, 0.5, 0), RZ(Math.PI), S(0.36, 0.8, 0.04)), p[0]);
    B.box(chain(T(0, 0.5, 0.02), S(0.04, 0.6, 0.02)), p[1], { outline: false });
    B.box(chain(T(0, 0.95, 0), S(0.38, 0.1, 0.06)), p[1]);
    for (const x of [-0.1, 0, 0.1]) B.sphere(chain(T(x, 0.95, 0.04), S(0.04)), p[2], 3, 6);
  };
  F.pan = (B, p) => {
    B.cyl(chain(T(0, 0.55, 0), RX(Math.PI / 2), S(0.9, 0.08, 0.9)), p[0], 18);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 10 + r * 4; i++) { const a = i / (10 + r * 4) * Math.PI * 2; B.sphere(chain(T(Math.cos(a) * (0.12 + r * 0.11), 0.55 + Math.sin(a) * (0.12 + r * 0.11), 0.045), S(0.03)), p[1], 2, 4, { outline: false }); }
    for (const sg of [-1, 1]) B.box(chain(T(sg * 0.08, 0.06, 0), RZ(sg * 0.15), S(0.08, 0.18, 0.07)), p[0]);
  };

  /** Objets plats et peints : cadre en volume + panneau illustré. */
  const PANELS = {
    papyrus: { frame: '#6b4524', w: 0.9, h: 0.8 },
    manuscript: { frame: '#8a5a34', w: 0.72, h: 0.9 },
    portrait: { frame: '#6b4524', w: 0.62, h: 0.92 },
    stainedGlass: { frame: '#2b2118', w: 0.8, h: 0.9 },
    tile: { frame: '#7a5a3a', w: 0.8, h: 0.8 },
  };

  /** Construit le modèle d'un objet. Renvoie { builder, panel } ; panel = {w, h, y, z} ou null. */
  MOD.build = function (o) {
    const t = ME.DATA.TYPES[o.type];
    const B = new GL3D.Builder();
    const pal = palette(o);
    const pan = PANELS[t.shape];
    if (pan) {
      const fw = pan.w + 0.08, fh = pan.h + 0.08;
      B.box(chain(T(0, 0.04 + fh / 2, 0), S(fw, fh, 0.05)), pan.frame);
      B.box(chain(T(0, 0.08, -0.12), RX(0.35), S(0.3, 0.2, 0.05)), pan.frame);
      B.box(chain(T(0, 0.02, 0), S(fw * 0.9, 0.04, 0.24)), pan.frame);
      return { builder: B, panel: { w: pan.w, h: pan.h, y: 0.08, z: 0.028 } };
    }
    const f = F[t.shape] || F.sherd;
    f(B, pal, o, ME.seeded(o.seed || 1));
    fit(B, 1, 1);
    return { builder: B, panel: null };
  };

  /** Cache de maillages par contexte WebGL. */
  MOD.cache = function (R) {
    const map = new Map();
    return {
      get(o) {
        const key = o.type + ':' + o.id + ':' + Math.round(o.condition / 10);
        let e = map.get(key);
        if (!e) { const b = MOD.build(o); e = { mesh: R.mesh(b.builder), panel: b.panel }; map.set(key, e); }
        return e;
      },
      clear() { map.forEach((e) => R.free(e.mesh)); map.clear(); },
    };
  };

  /** Ajoute l'objet (maillage + éventuel panneau illustré) aux listes de dessin. */
  MOD.draw = function (R, cache, o, m, lists, opt) {
    opt = opt || {};
    const e = cache.get(o);
    lists.opaque.push({ mesh: e.mesh, m, tint: opt.tint, bright: opt.bright, outlineW: opt.outlineW || 0.0018, shadow: opt.shadow });
    if (e.panel && lists.sprites) {
      const tex = R.texture(o.id + ':' + Math.round(o.condition / 10), ME.Art.image(o));
      const p = e.panel;
      lists.sprites.push({ tex, m: M.chain(m, M.T(0, p.y, p.z), M.S(p.w, p.h, 1)), bright: opt.bright });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
