/* Musée & Expéditions — render.js
 * Scènes animées sur canvas : le musée en coupe (vitrines, éclairage, visiteurs,
 * chercheurs à l'atelier) et les chantiers d'expédition (camp, terrain, progression).
 * + la carte des expéditions (SVG).
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const R = (ME.Render = {});
  const INK = '#2b2118';

  /* ---------------- Outils de dessin ---------------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillStroke(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 2; ctx.strokeStyle = INK; ctx.stroke(); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /** Personnage « ligne claire ». pose : walk | stand | kneel | work | dive */
  R.person = function (ctx, x, y, look, o) {
    o = o || {};
    const s = o.scale || 1, t = o.t || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.flip ? -s : s, s);
    ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const coat = look.coat || '#b23a2a', skin = look.skin || '#f1c9a5', hair = look.hair || '#3a2a1a';
    const pose = o.pose || 'stand';
    // ombre
    ctx.fillStyle = 'rgba(43,33,24,.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    if (pose === 'kneel') {
      ctx.fillStyle = '#5a4a3a'; poly(ctx, [-6, 0, 6, 0, 6, -6, -8, -8]); ctx.fill(); ctx.stroke();
      ctx.translate(0, 8);
    } else {
      const sw = pose === 'walk' ? Math.sin(t * 8) * 4 : 0;
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-2 + sw, 0); ctx.moveTo(2, -14); ctx.lineTo(2 - sw, 0); ctx.stroke();
      ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-2 + sw, -1); ctx.moveTo(2, -14); ctx.lineTo(2 - sw, -1); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = INK;
    }
    // corps
    poly(ctx, [-7, -14, 7, -14, 6, -30, -6, -30]); fillStroke(ctx, coat, 1.6);
    // bras
    const arm = pose === 'work' || pose === 'kneel' ? Math.sin(t * 6) * 5 : pose === 'walk' ? Math.sin(t * 8) * 3 : 0;
    ctx.beginPath(); ctx.moveTo(5, -28); ctx.lineTo(10, -18 + arm); ctx.lineWidth = 3; ctx.strokeStyle = coat; ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
    if (o.tool) { ctx.beginPath(); ctx.moveTo(10, -18 + arm); ctx.lineTo(14, -14 + arm); ctx.lineWidth = 2; ctx.strokeStyle = '#7a7f85'; ctx.stroke(); }
    // tête
    ctx.beginPath(); ctx.arc(0, -36, 6, 0, Math.PI * 2); fillStroke(ctx, skin, 1.4);
    ctx.beginPath(); ctx.arc(0, -38, 6, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(4, -38); ctx.closePath(); ctx.fillStyle = hair; ctx.fill();
    if (look.beard) { ctx.beginPath(); ctx.arc(0, -33, 4, 0.1, Math.PI - 0.1); ctx.fillStyle = hair; ctx.fill(); }
    if (look.glasses) { ctx.beginPath(); ctx.arc(2.5, -36, 1.8, 0, Math.PI * 2); ctx.lineWidth = 0.9; ctx.stroke(); }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3, -36.5, 0.9, 0, Math.PI * 2); ctx.fill();
    if (look.hat) {
      ctx.beginPath(); ctx.ellipse(0, -41, 9, 2.4, 0, 0, Math.PI * 2); fillStroke(ctx, '#d8c08a', 1.2);
      ctx.beginPath(); ctx.ellipse(0, -43, 5.4, 3.6, 0, Math.PI, 0); fillStroke(ctx, '#d8c08a', 1.2);
    }
    if (pose === 'dive') { ctx.fillStyle = '#e3b33a'; rr(ctx, -10, -30, 4, 12, 2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };

  function bubble(ctx, x, y, kind) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, 9, 7.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 6, y + 9, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (kind === 'love') { ctx.fillStyle = '#b23a2a'; ctx.fillText('♥', x, y + 0.5); }
    else if (kind === 'wow') { ctx.fillStyle = '#d39b2a'; ctx.fillText('★', x, y + 0.5); }
    else if (kind === 'tired') { ctx.fillStyle = '#3f5a92'; ctx.font = 'bold 8px Georgia'; ctx.fillText('zz', x, y + 0.5); }
    else { ctx.fillStyle = '#3f5a92'; ctx.fillText('?', x, y + 0.5); }
    ctx.restore();
  }

  /* ---------------- Le musée en coupe ---------------- */
  const MW = 1200, MH = 660, TOP = 92, FLOOR_H = 270, COL_W = 280, LEFT = 40;
  R.MUSEUM_SIZE = [MW, MH];

  R.roomRect = function (roomId) {
    const d = D.ROOMS[roomId];
    return { x: LEFT + d.col * COL_W, y: TOP + d.row * FLOOR_H, w: COL_W * d.w, h: FLOOR_H };
  };

  const VTYPES = Object.keys(D.VISITOR_TYPES);
  const VLOOKS = {
    famille: [{ coat: '#d39b2a', hair: '#6b3a1f', skin: '#f1c9a5' }, { coat: '#e07b3a', hair: '#2b2118', skin: '#c99772', hat: false }],
    scolaire: [{ coat: '#5f7f2a', hair: '#e0b25a', skin: '#f5d5bd' }, { coat: '#7fa03a', hair: '#2b2118', skin: '#b98764' }],
    passionne: [{ coat: '#3f5a92', hair: '#9a9a9a', skin: '#f1c9a5', glasses: true, beard: true }, { coat: '#2f4a7a', hair: '#5a3a22', skin: '#e6b48f', glasses: true }],
    touriste: [{ coat: '#b23a2a', hair: '#c48a3a', skin: '#f3d0b0', hat: true }, { coat: '#d0533a', hair: '#1d1410', skin: '#d9a982', hat: true }],
  };

  R.museum = function (canvas, getState, onRoom) {
    const ctx = canvas.getContext('2d');
    const agents = [];
    let raf = null, last = 0, time = 0, hover = null;

    function resize() {
      const dpr = Math.min(2, G.devicePixelRatio || 1);
      const w = canvas.clientWidth || 800;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * MH / MW * dpr);
      canvas.style.height = Math.round(w * MH / MW) + 'px';
    }

    function syncAgents(state) {
      const route = ['hall'].concat(ME.Exhibitions.normalizeRoute(state));
      const total = state.lastVisit ? state.lastVisit.total : 120;
      const want = Math.max(4, Math.min(24, Math.round(total / 30)));
      while (agents.length < want) {
        const sample = state.lastVisit && state.lastVisit.sample.length ? state.lastVisit.sample[agents.length % state.lastVisit.sample.length] : { type: VTYPES[agents.length % 4], sat: 60 };
        const looks = VLOOKS[sample.type];
        agents.push({ type: sample.type, sat: sample.sat, look: looks[agents.length % looks.length], step: Math.floor(Math.random() * route.length), x: Math.random(), dir: 1, pause: Math.random() * 3, speed: 0.05 + Math.random() * 0.04, child: sample.type === 'famille' && Math.random() < 0.6, bubbleT: Math.random() * 8 });
      }
      agents.length = want;
      agents.forEach((a) => { if (a.step >= route.length) a.step = 0; });
      return route;
    }

    function drawRoof(state) {
      ctx.fillStyle = '#e9dcbc';
      poly(ctx, [LEFT - 20, TOP, MW / 2, 18, MW - LEFT + 20, TOP]); fillStroke(ctx, '#d9c79d', 2.4);
      poly(ctx, [LEFT + 60, TOP - 6, MW / 2, 30, MW - LEFT - 60, TOP - 6]); fillStroke(ctx, '#efe2c2', 1.6);
      ctx.fillStyle = INK; ctx.font = 'bold 28px "Alegreya SC", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(state.museumName.toUpperCase(), MW / 2, 68);
      ctx.font = 'italic 13px Georgia, serif'; ctx.fillText('Archéologie & Histoire', MW / 2, 85);
    }

    function wallColor(room) {
      if (room && room.theme) return hexA(D.PERIODS[room.theme].color, 0.18);
      return 'rgba(255,248,230,0.65)';
    }

    function drawRoom(state, id) {
      const r = R.roomRect(id);
      const def = D.ROOMS[id];
      const room = state.rooms[id];
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      // mur
      ctx.fillStyle = '#f6ecd5'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = wallColor(room); ctx.fillRect(r.x, r.y, r.w, r.h);
      // plinthe et parquet
      const fy = r.y + r.h - 38;
      ctx.fillStyle = '#b98a55'; ctx.fillRect(r.x, fy, r.w, 38);
      ctx.strokeStyle = 'rgba(43,33,24,.25)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(r.x, fy + 6 * i + 4); ctx.lineTo(r.x + r.w, fy + 6 * i + 4); ctx.stroke(); }
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(r.x, fy - 6, r.w, 6);
      if (!room.unlocked) {
        ctx.fillStyle = 'rgba(60,50,40,.55)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#d39b2a'; ctx.lineWidth = 6;
        for (let i = -r.h; i < r.w; i += 34) { ctx.beginPath(); ctx.moveTo(r.x + i, r.y + r.h); ctx.lineTo(r.x + i + r.h, r.y); ctx.stroke(); }
        // échafaudage
        ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 4;
        [r.x + 50, r.x + r.w - 50].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, r.y + 30); ctx.lineTo(x, fy); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(r.x + 50, r.y + 110); ctx.lineTo(r.x + r.w - 50, r.y + 110); ctx.stroke();
        ctx.fillStyle = '#fffaf0'; rr(ctx, r.x + r.w / 2 - 92, r.y + r.h / 2 - 26, 184, 52, 6); fillStroke(ctx, '#fffaf0', 2);
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.font = 'bold 16px Georgia, serif';
        ctx.fillText('Travaux à venir', r.x + r.w / 2, r.y + r.h / 2 - 5);
        ctx.font = '13px Georgia, serif'; ctx.fillText(def.name + ' · ' + ME.fmtMoney(def.cost), r.x + r.w / 2, r.y + r.h / 2 + 13);
        ctx.restore(); return;
      }
      // éclairage
      if (def.kind === 'expo' || def.kind === 'temp' || def.kind === 'hall') {
        const l = room.lighting;
        const alpha = l === 'vif' ? 0.32 : l === 'standard' ? 0.2 : 0.1;
        if (l === 'tamise') { ctx.fillStyle = 'rgba(30,20,10,.18)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
        const n = room.vitrines.length || 1;
        for (let i = 0; i < n; i++) {
          const vx = r.x + (r.w / (n + 1)) * (i + 1);
          const g = ctx.createLinearGradient(0, r.y + 14, 0, fy);
          g.addColorStop(0, 'rgba(255,236,170,' + alpha + ')'); g.addColorStop(1, 'rgba(255,236,170,0)');
          ctx.fillStyle = g; poly(ctx, [vx - 6, r.y + 16, vx + 6, r.y + 16, vx + 36, fy, vx - 36, fy]); ctx.fill();
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(vx - 8, r.y + 8, 16, 7);
          ctx.fillStyle = '#ffe9a8'; ctx.fillRect(vx - 5, r.y + 15, 10, 2);
        }
      }
      // contenu
      if (def.kind === 'expo' || def.kind === 'temp' || def.kind === 'hall') drawVitrines(state, id, r, fy);
      if (def.kind === 'hall') drawHall(r, fy);
      if (def.kind === 'shop') drawShop(state, r, fy);
      if (def.kind === 'atelier') drawAtelier(state, r, fy);
      if (def.kind === 'reserves') drawReserves(state, r, fy);
      // cartel de salle
      ctx.font = 'bold 15px Georgia, serif'; ctx.textAlign = 'left';
      const lw = Math.min(r.w - 16, ctx.measureText(def.name).width + 18);
      ctx.fillStyle = '#fffaf0'; rr(ctx, r.x + 8, r.y + 8, lw, 25, 4); fillStroke(ctx, '#fffaf0', 1.4);
      ctx.fillStyle = INK; ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText(def.name, r.x + 17, r.y + 26);
      if (room.theme) {
        ctx.fillStyle = D.PERIODS[room.theme].color; rr(ctx, r.x + 8, r.y + 38, 110, 19, 9); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Georgia, serif'; ctx.fillText(D.PERIODS[room.theme].label, r.x + 18, r.y + 52);
      }
      if (state.tempExpo && id === 'temp') {
        ctx.fillStyle = '#b23a2a'; rr(ctx, r.x + r.w - 150, r.y + 8, 142, 40, 4); fillStroke(ctx, '#b23a2a', 1.4);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 11px Georgia'; ctx.fillText('EXPOSITION', r.x + r.w - 79, r.y + 23);
        ctx.font = 'italic 10px Georgia'; ctx.fillText(state.tempExpo.title.slice(0, 24), r.x + r.w - 79, r.y + 38);
      }
      if (hover === id) { ctx.fillStyle = 'rgba(211,155,42,.12)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(r.x, r.y, r.w, r.h);
    }

    function drawVitrines(state, id, r, fy) {
      const room = state.rooms[id];
      const n = room.vitrines.length;
      for (let i = 0; i < n; i++) {
        const vx = r.x + (r.w / (n + 1)) * (i + 1);
        const big = id === 'hall';
        const bw = big ? 62 : n > 4 ? 40 : 50, ph = 46, gh = big ? 74 : n > 4 ? 56 : 64;
        // socle
        ctx.fillStyle = '#efe2c2'; rr(ctx, vx - bw / 2, fy - ph, bw, ph, 2); fillStroke(ctx, '#e5d4ab', 1.6);
        ctx.fillStyle = 'rgba(43,33,24,.12)'; ctx.fillRect(vx - bw / 2 + 4, fy - ph + 4, 6, ph - 8);
        // objet
        const oid = room.vitrines[i];
        if (oid) {
          const o = state.objects[oid];
          const img = ME.Art.image(o);
          if (img && img.complete) ctx.drawImage(img, vx - gh * 0.42, fy - ph - gh + 4, gh * 0.84, gh * 0.84);
          // cartel
          ctx.fillStyle = '#fffaf0'; ctx.fillRect(vx - 9, fy - ph + 12, 18, 9); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(vx - 9, fy - ph + 12, 18, 9);
          if (o.owner !== 'musee') { ctx.fillStyle = '#3f5a92'; ctx.beginPath(); ctx.arc(vx + bw / 2 - 6, fy - ph + 8, 3.5, 0, Math.PI * 2); ctx.fill(); }
        }
        // cloche de verre
        ctx.fillStyle = 'rgba(200,232,236,.28)'; rr(ctx, vx - bw / 2 + 2, fy - ph - gh, bw - 4, gh, 3); ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(vx - bw / 2 + 7, fy - ph - gh + 6); ctx.lineTo(vx - bw / 2 + 7, fy - ph - gh * 0.45); ctx.stroke();
      }
    }

    function drawHall(r, fy) {
      // escalier
      ctx.fillStyle = '#c9a77a';
      for (let i = 0; i < 7; i++) { ctx.fillRect(r.x + 10 + i * 10, fy - 10 - i * 26, 10, 10 + i * 26); }
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r.x + 10, fy); for (let i = 0; i < 7; i++) { ctx.lineTo(r.x + 10 + i * 10, fy - 10 - i * 26); ctx.lineTo(r.x + 20 + i * 10, fy - 10 - i * 26); } ctx.stroke();
      // billetterie
      ctx.fillStyle = '#8a5a34'; rr(ctx, r.x + r.w - 92, fy - 46, 80, 46, 2); fillStroke(ctx, '#8a5a34', 1.8);
      ctx.fillStyle = '#efe2c2'; ctx.fillRect(r.x + r.w - 92, fy - 50, 80, 6); ctx.strokeRect(r.x + r.w - 92, fy - 50, 80, 6);
      ctx.fillStyle = '#fffaf0'; ctx.font = 'bold 10px Georgia'; ctx.textAlign = 'center'; ctx.fillText('BILLETS', r.x + r.w - 52, fy - 26);
    }

    function drawShop(state, r, fy) {
      for (let s = 0; s < 3; s++) {
        const y = r.y + 70 + s * 46;
        ctx.fillStyle = '#7a5a3a'; ctx.fillRect(r.x + 20, y, 150, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(r.x + 20, y, 150, 6);
        for (let k = 0; k < 7; k++) {
          const cols = ['#b23a2a', '#2f6f73', '#d39b2a', '#3f5a92', '#5f7f2a'];
          ctx.fillStyle = cols[(k + s) % 5]; rr(ctx, r.x + 26 + k * 20, y - 22 + (k % 2) * 4, 14, 22 - (k % 2) * 4, 1); fillStroke(ctx, cols[(k + s) % 5], 1);
        }
      }
      ctx.fillStyle = '#8a5a34'; rr(ctx, r.x + r.w - 100, fy - 44, 86, 44, 2); fillStroke(ctx, '#8a5a34', 1.8);
      ctx.fillStyle = INK; ctx.font = 'italic 11px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('Niveau ' + state.shopLevel, r.x + r.w - 57, fy - 18);
    }

    function drawAtelier(state, r, fy) {
      for (let b = 0; b < state.benches; b++) {
        const bx = r.x + 30 + b * ((r.w - 40) / Math.max(2, state.benches));
        ctx.fillStyle = '#9a6a3c'; ctx.fillRect(bx, fy - 46, 58, 8); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(bx, fy - 46, 58, 8);
        ctx.fillRect(bx + 4, fy - 38, 5, 38); ctx.strokeRect(bx + 4, fy - 38, 5, 38); ctx.fillRect(bx + 49, fy - 38, 5, 38); ctx.strokeRect(bx + 49, fy - 38, 5, 38);
        // lampe d'atelier
        ctx.beginPath(); ctx.moveTo(bx + 52, fy - 46); ctx.lineTo(bx + 46, fy - 80); ctx.lineTo(bx + 30, fy - 76); ctx.stroke();
        ctx.fillStyle = '#d39b2a'; poly(ctx, [bx + 24, fy - 78, bx + 36, fy - 74, bx + 32, fy - 68, bx + 22, fy - 72]); fillStroke(ctx, '#d39b2a', 1.2);
        const job = state.jobs[b];
        if (job) {
          const o = state.objects[job.objId];
          const img = ME.Art.image(o);
          ctx.fillStyle = 'rgba(255,236,170,.35)'; poly(ctx, [bx + 26, fy - 70, bx + 34, fy - 70, bx + 50, fy - 46, bx + 8, fy - 46]); ctx.fill();
          if (img && img.complete) ctx.drawImage(img, bx + 12, fy - 76, 32, 32);
          const p = state.staff.find((s) => s.id === job.staffId);
          if (p) R.person(ctx, bx - 8, fy, p.look, { pose: 'work', t: time + b, tool: true, scale: 1.4 });
        }
      }
      ctx.fillStyle = INK; ctx.font = 'italic 13px Georgia'; ctx.textAlign = 'left';
      ctx.fillText(state.jobs.length + ' / ' + state.benches + ' postes occupés', r.x + 12, r.y + 52);
    }

    function drawReserves(state, r, fy) {
      const used = ME.Objects.reserveCount(state), cap = state.reserveCap;
      const shelves = 4, perShelf = Math.ceil(cap / shelves);
      for (let s = 0; s < shelves; s++) {
        const y = fy - 8 - s * 46;
        ctx.fillStyle = '#7a7f85'; ctx.fillRect(r.x + 18, y, r.w - 36, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(r.x + 18, y, r.w - 36, 4);
        for (let k = 0; k < perShelf; k++) {
          const idx = s * perShelf + k;
          if (idx >= cap) break;
          const bw = (r.w - 44) / perShelf;
          const x = r.x + 22 + k * bw;
          if (idx < used) { ctx.fillStyle = '#c9a77a'; rr(ctx, x, y - 26, bw - 4, 26, 1); fillStroke(ctx, '#c9a77a', 1.2); ctx.fillStyle = '#fffaf0'; ctx.fillRect(x + 3, y - 18, bw - 10, 6); }
          else { ctx.strokeStyle = 'rgba(43,33,24,.25)'; ctx.setLineDash([3, 3]); ctx.strokeRect(x, y - 26, bw - 4, 26); ctx.setLineDash([]); }
        }
      }
      ctx.fillStyle = used > cap ? '#b23a2a' : INK; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'left';
      ctx.fillText(used + ' / ' + cap + ' emplacements' + (used > cap ? ' — saturées !' : ''), r.x + 12, r.y + 52);
    }

    function drawAgents(state, route, dt) {
      const medi = state.staff.filter((p) => p.assign && p.assign.kind === 'accueil');
      medi.forEach((p, i) => { const r = R.roomRect('hall'); R.person(ctx, r.x + r.w - 116 - i * 28, r.y + r.h - 36, p.look, { pose: 'stand', t: time, scale: 1.35 }); });
      agents.forEach((a) => {
        const rid = route[a.step % route.length];
        const r = R.roomRect(rid);
        if (!state.rooms[rid] || !state.rooms[rid].unlocked) { a.step++; return; }
        if (a.pause > 0) a.pause -= dt;
        else {
          a.x += a.speed * dt * a.dir;
          if (a.x > 1) { a.x = 0; a.step = (a.step + 1) % route.length; }
          if (Math.random() < dt * 0.25) a.pause = 1 + Math.random() * 3;
        }
        a.bubbleT -= dt;
        const x = r.x + 20 + a.x * (r.w - 40), y = r.y + r.h - 22 + (a.type === 'famille' ? 4 : 0);
        R.person(ctx, x, y, a.look, { pose: a.pause > 0 ? 'stand' : 'walk', t: time + a.x * 10, scale: 1.35 });
        if (a.child) R.person(ctx, x - 18, y + 2, a.look, { pose: a.pause > 0 ? 'stand' : 'walk', t: time + 1 + a.x * 10, scale: 0.85 });
        if (a.bubbleT < 1.6 && a.bubbleT > 0 && a.pause > 0) bubble(ctx, x + 12, y - 66, a.sat >= 80 ? 'wow' : a.sat >= 60 ? 'love' : a.sat < 40 ? 'tired' : 'hmm');
        if (a.bubbleT < 0) a.bubbleT = 5 + Math.random() * 6;
      });
    }

    function frame(ts) {
      const state = getState();
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts; time += dt;
      if (!canvas.isConnected) { raf = null; return; }
      const scale = canvas.width / MW;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = '#cfe0dc'; ctx.fillRect(0, 0, MW, MH);
      // ciel et sol
      const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, '#bcd6d6'); g.addColorStop(1, '#f2e6c8'); ctx.fillStyle = g; ctx.fillRect(0, 0, MW, MH);
      for (let i = 0; i < 3; i++) { const cx = ((time * 8 + i * 420) % (MW + 200)) - 100; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(cx, 30 + i * 12, 46, 12, 0, 0, Math.PI * 2); ctx.ellipse(cx + 30, 24 + i * 12, 30, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#9fb48a'; ctx.fillRect(0, TOP + FLOOR_H * 2, MW, MH - TOP - FLOOR_H * 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, TOP + FLOOR_H * 2); ctx.lineTo(MW, TOP + FLOOR_H * 2); ctx.stroke();
      drawRoof(state);
      const route = syncAgents(state);
      Object.keys(D.ROOMS).forEach((id) => drawRoom(state, id));
      ctx.save(); ctx.beginPath(); ctx.rect(LEFT, TOP, COL_W * 4, FLOOR_H * 2); ctx.clip();
      drawAgents(state, route, dt);
      ctx.restore();
      // arbres
      [[14, 610], [1180, 600]].forEach(([x, y]) => { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 3, y - 30, 6, 30); ctx.beginPath(); ctx.arc(x, y - 44, 18, 0, Math.PI * 2); fillStroke(ctx, '#6f8f4a', 1.6); });
      raf = G.requestAnimationFrame(frame);
    }

    function hit(ev) {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width * MW, y = (ev.clientY - rect.top) / rect.height * MH;
      return Object.keys(D.ROOMS).find((id) => { const r = R.roomRect(id); return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }) || null;
    }
    canvas.addEventListener('click', (ev) => { const id = hit(ev); if (id && onRoom) onRoom(id); });
    canvas.addEventListener('mousemove', (ev) => { hover = hit(ev); canvas.style.cursor = hover ? 'pointer' : 'default'; });
    canvas.addEventListener('mouseleave', () => { hover = null; });

    resize();
    G.addEventListener('resize', resize);
    raf = G.requestAnimationFrame(frame);
    return { stop() { if (raf) G.cancelAnimationFrame(raf); raf = null; G.removeEventListener('resize', resize); }, resize };
  };

  /* ---------------- Scène d'expédition ---------------- */
  const EW = 900, EH = 380;
  const BIOMES = {
    valley: { sky: ['#a9cbd6', '#f2e2c0'], ground: '#b59a6a', far: '#c9b48a', accent: '#6f8f4a' },
    plateau: { sky: ['#b7d0dc', '#efe3c6'], ground: '#8fa35a', far: '#6f7f5a', accent: '#5f7f2a' },
    forest: { sky: ['#a8c4c0', '#ece0c2'], ground: '#6f8a4a', far: '#4f6a3a', accent: '#3b5a2a' },
    sea: { sky: ['#9cc6dc', '#eaf2f0'], ground: '#d9c79d', far: '#2f6f8a', accent: '#1f4f6a' },
    desert: { sky: ['#e6c48a', '#f7e6c0'], ground: '#e0bf7f', far: '#cfa863', accent: '#b98a4a' },
    island: { sky: ['#9ccbe0', '#f0f2ea'], ground: '#cbb68a', far: '#3f7fa0', accent: '#8a7a5a' },
  };

  R.expedition = function (canvas, getExp, getState) {
    const ctx = canvas.getContext('2d');
    let raf = null, time = 0, last = 0;
    function resize() {
      const dpr = Math.min(2, G.devicePixelRatio || 1);
      const w = canvas.clientWidth || 600;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * EH / EW * dpr);
      canvas.style.height = Math.round(w * EH / EW) + 'px';
    }

    function backdrop(b, biome) {
      const g = ctx.createLinearGradient(0, 0, 0, EH); g.addColorStop(0, b.sky[0]); g.addColorStop(1, b.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, EW, EH);
      // soleil
      ctx.beginPath(); ctx.arc(780, 70, 30, 0, Math.PI * 2); fillStroke(ctx, biome === 'desert' ? '#f6d06a' : '#fbe7a0', 1.6);
      for (let i = 0; i < 3; i++) { const cx = ((time * 10 + i * 340) % (EW + 200)) - 100; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(cx, 50 + i * 16, 40, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      if (biome === 'valley') {
        ctx.fillStyle = '#d8c8a0'; poly(ctx, [0, 60, 120, 40, 260, 70, 330, 50, 330, 260, 0, 260]); fillStroke(ctx, '#d8c8a0', 2);
        ctx.strokeStyle = 'rgba(43,33,24,.3)'; for (let y = 80; y < 250; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(330, y + 4); ctx.stroke(); }
        ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.ellipse(170, 210, 110, 40, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#7fa0b0'; ctx.fillRect(0, 330, EW, 50); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, 330); ctx.lineTo(EW, 330); ctx.stroke();
      } else if (biome === 'plateau') {
        ctx.fillStyle = '#7f8f6a'; [[120, 160, 70], [300, 150, 90], [520, 170, 60]].forEach(([x, y, w]) => { poly(ctx, [x - w, 250, x - 14, y, x + 14, y, x + w, 250]); fillStroke(ctx, '#7f8f6a', 1.6); });
        ctx.fillStyle = '#9a8a6a'; for (let x = 0; x < EW; x += 26) { rr(ctx, x, 236, 24, 16, 2); fillStroke(ctx, '#a49474', 1.2); }
      } else if (biome === 'forest') {
        ctx.fillStyle = '#d9cfb4';
        [[520, 120], [600, 120], [680, 120]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 30, 250); ctx.lineTo(x - 30, y + 30); ctx.arc(x, y + 30, 30, Math.PI, 0); ctx.lineTo(x + 30, 250); ctx.lineTo(x + 18, 250); ctx.lineTo(x + 18, y + 34); ctx.arc(x, y + 34, 18, 0, Math.PI, true); ctx.lineTo(x - 18, 250); ctx.closePath(); fillStroke(ctx, '#d9cfb4', 2); });
        for (let i = 0; i < 9; i++) { const x = 30 + i * 52 + (i % 2) * 10; ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 4, 190, 8, 70); ctx.beginPath(); ctx.arc(x, 170, 30, 0, Math.PI * 2); fillStroke(ctx, i % 2 ? '#4f6a3a' : '#5f7f45', 1.6); }
      } else if (biome === 'sea') {
        ctx.fillStyle = '#2f6f8a'; ctx.fillRect(0, 120, EW, EH - 120);
        const g2 = ctx.createLinearGradient(0, 120, 0, EH); g2.addColorStop(0, '#3f8fa8'); g2.addColorStop(1, '#16384a'); ctx.fillStyle = g2; ctx.fillRect(0, 120, EW, EH - 120);
        ctx.strokeStyle = '#d9f0f4'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= EW; x += 10) ctx.lineTo(x, 120 + Math.sin(x / 30 + time * 2) * 3); ctx.stroke();
        ctx.fillStyle = '#e9e0c8'; poly(ctx, [0, 120, 0, 40, 60, 30, 120, 70, 160, 120]); fillStroke(ctx, '#e9e0c8', 2);
        // bateau
        const by = 112 + Math.sin(time * 1.6) * 2;
        ctx.fillStyle = '#fffaf0'; poly(ctx, [520, by, 700, by, 680, by + 22, 540, by + 22]); fillStroke(ctx, '#b23a2a', 2);
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(570, by - 26, 60, 26); ctx.strokeRect(570, by - 26, 60, 26);
        ctx.beginPath(); ctx.moveTo(660, by); ctx.lineTo(660, by - 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(610, by + 20); ctx.lineTo(610, 300); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e3b33a'; ctx.stroke(); ctx.setLineDash([]);
        // bulles
        for (let i = 0; i < 8; i++) { const yy = 300 - ((time * 40 + i * 30) % 170); ctx.beginPath(); ctx.arc(420 + Math.sin(i + time) * 6, yy, 2 + (i % 3), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); }
      } else if (biome === 'desert') {
        ctx.fillStyle = '#d7b375'; ctx.beginPath(); ctx.moveTo(0, 220); ctx.quadraticCurveTo(200, 150, 420, 210); ctx.quadraticCurveTo(640, 160, EW, 200); ctx.lineTo(EW, 260); ctx.lineTo(0, 260); ctx.closePath(); fillStroke(ctx, '#d7b375', 1.6);
        [[90, 190], [140, 200], [820, 190]].forEach(([x, y]) => { ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 50); ctx.quadraticCurveTo(x + 6, y + 20, x, y); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = INK; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * 20, y - 14, x + Math.cos(a) * 30, y + 6); ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = 3; ctx.stroke(); } });
        ctx.fillStyle = '#b98a5a'; [[620, 170, 50, 60], [690, 180, 40, 50]].forEach(([x, y, w, h]) => { rr(ctx, x, y, w, h, 2); fillStroke(ctx, '#c49a68', 1.6); });
      } else if (biome === 'island') {
        ctx.fillStyle = '#3f7fa0'; ctx.fillRect(0, 180, EW, 80);
        ctx.fillStyle = '#b8a47a'; poly(ctx, [180, 260, 260, 150, 380, 130, 520, 170, 640, 260]); fillStroke(ctx, '#b8a47a', 2);
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(400, 108, 40, 30); ctx.strokeRect(400, 108, 40, 30); ctx.beginPath(); ctx.arc(420, 108, 14, Math.PI, 0); fillStroke(ctx, '#3f6fb0', 1.6);
      }
      ctx.fillStyle = b.ground; ctx.fillRect(0, 250, EW, biome === 'sea' ? 0 : EH - 250);
      if (biome !== 'sea') { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(EW, 250); ctx.stroke(); }
    }

    function drawGrid(exp, state, x0, y0, sea) {
      const cols = 6, rows = 2, cw = 52, ch = 28;
      const opened = Math.round(exp.progress * cols * rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = x0 + c * cw + r * 18, y = y0 + r * ch;
        poly(ctx, [x, y, x + cw, y, x + cw + 18, y + ch, x + 18, y + ch]);
        ctx.fillStyle = i < opened ? (sea ? '#c2b48a' : '#7a5a3a') : (sea ? '#d9c79d' : 'rgba(0,0,0,.05)');
        ctx.fill(); ctx.strokeStyle = sea ? '#e3b33a' : '#fffaf0'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      // fiches de découverte
      exp.finds.forEach((id, k) => {
        const o = state.objects[id];
        const c = k % 6, r = Math.floor(k / 6) % 2;
        const x = x0 + c * cw + r * 18 + 26 + (k * 7) % 12, y = y0 + r * ch + 14;
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 22); ctx.stroke();
        ctx.fillStyle = D.RARITY[o.rarity].color; poly(ctx, [x, y - 22, x + 12, y - 18, x, y - 14]); ctx.fill(); ctx.stroke();
      });
    }

    function frame(ts) {
      const exp = getExp(); const state = getState();
      if (!canvas.isConnected || !exp) { raf = null; return; }
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; time += dt;
      const scale = canvas.width / EW; ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const dest = D.DESTINATIONS[exp.dest]; const b = BIOMES[dest.biome];
      backdrop(b, dest.biome);
      const sea = dest.biome === 'sea';
      const team = exp.team.map((id) => state.staff.find((p) => p.id === id)).filter(Boolean);
      if (exp.phase === 'terrain') {
        if (!sea) {
          // camp
          const camp = exp.equip.includes('camp');
          ctx.fillStyle = camp ? '#e9dcbc' : '#d0c4a4';
          [[640, 300], [730, 312]].forEach(([x, y], i) => { if (!camp && i) return; poly(ctx, [x - 40, y, x, y - 46, x + 40, y]); fillStroke(ctx, i ? '#c9b48a' : '#e3d4ae', 2); ctx.fillStyle = '#3a2a1a'; poly(ctx, [x - 8, y, x, y - 22, x + 8, y]); ctx.fill(); });
          ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(820, 330); ctx.lineTo(820, 260); ctx.stroke();
          ctx.fillStyle = '#b23a2a'; poly(ctx, [820, 260, 850 + Math.sin(time * 4) * 3, 268, 820, 276]); fillStroke(ctx, '#b23a2a', 1.4);
          // feu de camp
          ctx.fillStyle = '#e07b3a'; ctx.beginPath(); ctx.moveTo(560, 344); ctx.quadraticCurveTo(552 + Math.sin(time * 9) * 3, 326, 560, 316 + Math.sin(time * 7) * 3); ctx.quadraticCurveTo(568, 330, 566, 344); ctx.fill();
          drawGrid(exp, state, 70, 280, false);
          // brouette, tamis, table de terrain
          ctx.fillStyle = '#7a7f85'; poly(ctx, [440, 300, 500, 300, 490, 322, 452, 322]); fillStroke(ctx, '#8e9398', 1.8);
          ctx.fillStyle = '#7a5a3a'; poly(ctx, [446, 300, 494, 300, 486, 292, 454, 292]); ctx.fill();
          ctx.beginPath(); ctx.arc(470, 330, 9, 0, Math.PI * 2); fillStroke(ctx, '#3a2a1a', 1.6);
          ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(500, 304); ctx.lineTo(528, 318); ctx.stroke();
          ctx.fillStyle = '#c9a77a'; ctx.beginPath(); ctx.ellipse(420, 352, 26, 8, 0, 0, Math.PI * 2); fillStroke(ctx, '#c9a77a', 1.6);
          ctx.strokeStyle = 'rgba(43,33,24,.5)'; ctx.lineWidth = 1; for (let k = -20; k <= 20; k += 6) { ctx.beginPath(); ctx.moveTo(420 + k, 346); ctx.lineTo(420 + k, 358); ctx.stroke(); }
          ctx.fillStyle = '#9a6a3c'; ctx.fillRect(660, 334, 110, 8); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(660, 334, 110, 8);
          ctx.fillRect(666, 342, 5, 26); ctx.strokeRect(666, 342, 5, 26); ctx.fillRect(758, 342, 5, 26); ctx.strokeRect(758, 342, 5, 26);
          ctx.fillStyle = '#fbf3dc'; ctx.save(); ctx.translate(690, 326); ctx.rotate(-0.08); ctx.fillRect(0, 0, 34, 8); ctx.strokeRect(0, 0, 34, 8); ctx.restore();
          exp.finds.slice(-3).forEach((id, k) => { ctx.fillStyle = '#b98a55'; rr(ctx, 730 - k * 18, 318, 16, 16, 2); fillStroke(ctx, '#b98a55', 1.2); });
          team.forEach((p, i) => R.person(ctx, 120 + i * 78, 304 + (i % 2) * 30, p.look, { pose: i % 3 === 2 ? 'stand' : 'kneel', t: time + i, tool: true, scale: 1.75 }));
        } else {
          ctx.fillStyle = '#d9c79d'; ctx.beginPath(); ctx.moveTo(0, 330); ctx.quadraticCurveTo(450, 300, EW, 340); ctx.lineTo(EW, EH); ctx.lineTo(0, EH); ctx.closePath(); fillStroke(ctx, '#d9c79d', 2);
          for (let i = 0; i < 14; i++) { ctx.save(); ctx.translate(200 + i * 26, 318 + (i % 3) * 6); ctx.rotate(0.6 + (i % 4) * 0.3); ctx.fillStyle = '#c86a3e'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
          drawGrid(exp, state, 200, 336, true);
          team.forEach((p, i) => { const x = 260 + i * 90 + Math.sin(time + i) * 14, y = 230 + Math.cos(time * 0.8 + i) * 10; ctx.save(); ctx.translate(x, y); ctx.rotate(-1.2); R.person(ctx, 0, 0, Object.assign({}, p.look, { coat: '#1d1d24', hat: false }), { pose: 'dive', t: time, scale: 1.6 }); ctx.restore(); });
        }
      } else {
        // transport ou terminé : caisses et camion / bateau
        ctx.fillStyle = '#6b4a2b';
        const n = Math.min(10, exp.finds.length || 1);
        for (let i = 0; i < n; i++) { rr(ctx, 120 + (i % 5) * 44, (sea ? 330 : 300) - Math.floor(i / 5) * 32, 40, 30, 2); fillStroke(ctx, '#b98a55', 1.8); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(120 + (i % 5) * 44, (sea ? 330 : 300) - Math.floor(i / 5) * 32); ctx.lineTo(160 + (i % 5) * 44, (sea ? 360 : 330) - Math.floor(i / 5) * 32); ctx.stroke(); }
        if (!sea) {
          const tx = exp.phase === 'transport' ? 520 + Math.sin(time) * 2 : 520;
          ctx.fillStyle = '#3f5a92'; rr(ctx, tx, 262, 150, 60, 4); fillStroke(ctx, '#3f5a92', 2);
          rr(ctx, tx + 150, 282, 60, 40, 4); fillStroke(ctx, '#5f7aa2', 2);
          ctx.fillStyle = '#cfe0e6'; ctx.fillRect(tx + 168, 288, 30, 14); ctx.strokeRect(tx + 168, 288, 30, 14);
          [tx + 30, tx + 120, tx + 180].forEach((x) => { ctx.beginPath(); ctx.arc(x, 326, 12, 0, Math.PI * 2); fillStroke(ctx, '#2b2118', 1.6); ctx.beginPath(); ctx.arc(x, 326, 4, 0, Math.PI * 2); ctx.fillStyle = '#9a9a9a'; ctx.fill(); });
          ctx.fillStyle = '#fffaf0'; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('MUSÉE & EXPÉDITIONS', tx + 75, 296);
        }
      }
      // bandeau
      ctx.fillStyle = 'rgba(255,250,240,.92)'; rr(ctx, 12, 12, 330, 54, 6); fillStroke(ctx, 'rgba(255,250,240,.92)', 2);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.font = 'bold 16px "Alegreya SC", Georgia, serif'; ctx.fillText(dest.name, 24, 34);
      ctx.font = 'italic 12px Georgia, serif';
      const phase = exp.phase === 'terrain' ? 'Semaine ' + Math.min(exp.weeks, exp.weekDone + 1) + ' / ' + exp.weeks + ' sur le terrain' : exp.phase === 'transport' ? 'Caisses en route vers le musée' : 'Campagne terminée';
      ctx.fillText(phase + ' · ' + exp.finds.length + ' découverte(s)', 24, 54);
      raf = G.requestAnimationFrame(frame);
    }
    resize(); G.addEventListener('resize', resize);
    raf = G.requestAnimationFrame(frame);
    return { stop() { if (raf) G.cancelAnimationFrame(raf); raf = null; G.removeEventListener('resize', resize); } };
  };

  /* ---------------- Carte (SVG) ---------------- */
  R.mapSVG = function (state, selected) {
    const land = '#efe2c2', sea = '#bcd7d0';
    let s = '<svg viewBox="160 110 620 380" xmlns="http://www.w3.org/2000/svg" class="map-svg" role="img" aria-label="Carte des expéditions">';
    s += '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 L8 0" stroke="#9fc3bb" stroke-width="1"/></pattern></defs>';
    s += '<rect x="0" y="0" width="900" height="600" fill="' + sea + '"/><rect x="0" y="0" width="900" height="600" fill="url(#hatch)" opacity=".5"/>';
    const europe = 'M160 110 L800 110 L800 280 L760 300 L725 292 L700 302 L672 292 L650 304 L628 296 L612 306 L604 330 L588 342 L574 330 L566 312 L552 300 L538 286 L520 272 L500 250 L482 232 L468 222 L462 232 L476 256 L496 282 L516 306 L532 326 L528 346 L514 340 L506 352 L494 344 L498 324 L480 304 L458 282 L442 262 L428 256 L414 270 L398 288 L378 294 L356 296 L338 302 L322 314 L298 326 L276 342 L248 346 L228 330 L214 304 L206 276 L222 260 L262 252 L288 242 L292 216 L272 198 L250 184 L262 166 L292 158 L306 132 L300 112 Z';
    s += '<path d="' + europe + '" fill="' + land + '" stroke="#2b2118" stroke-width="1.6" stroke-linejoin="round"/>';
    const africa = 'M160 500 L160 412 L220 392 L290 384 L350 380 L410 374 L452 366 L480 382 L520 392 L560 394 L600 386 L640 384 L680 388 L720 384 L760 368 L800 360 L800 500 Z';
    s += '<path d="' + africa + '" fill="' + land + '" stroke="#2b2118" stroke-width="1.6" stroke-linejoin="round"/>';
    s += '<ellipse cx="444" cy="302" rx="6" ry="13" fill="' + land + '" stroke="#2b2118" stroke-width="1.4"/><ellipse cx="442" cy="334" rx="8" ry="15" fill="' + land + '" stroke="#2b2118" stroke-width="1.4"/>';
    s += '<path d="M480 352 L508 346 L500 366 Z" fill="' + land + '" stroke="#2b2118" stroke-width="1.4"/>';
    s += '<ellipse cx="606" cy="356" rx="18" ry="4" fill="' + land + '" stroke="#2b2118" stroke-width="1.4"/><ellipse cx="716" cy="344" rx="12" ry="4" fill="' + land + '" stroke="#2b2118" stroke-width="1.4"/>';
    for (let i = 0; i < 7; i++) s += '<circle cx="' + (574 + (i * 13) % 34) + '" cy="' + (310 + (i * 7) % 22) + '" r="2.4" fill="' + land + '" stroke="#2b2118" stroke-width="1"/>';
    s += '<path d="M664 386 Q666 420 660 450 Q664 480 668 500" fill="none" stroke="#5a9ab0" stroke-width="3"/><path d="M652 386 L664 400 L676 386" fill="none" stroke="#5a9ab0" stroke-width="2"/>';
    s += '<ellipse cx="640" cy="404" rx="8" ry="4" fill="#9cc6dc" stroke="#2b2118" stroke-width="1"/>';
    // relief et décor carnet
    [[300, 214], [338, 196], [520, 200], [560, 180], [470, 160]].forEach(([x, y]) => { s += '<path d="M' + (x - 10) + ' ' + y + ' L' + x + ' ' + (y - 12) + ' L' + (x + 10) + ' ' + y + '" fill="none" stroke="#8a7a5a" stroke-width="1.4"/>'; });
    s += '<text x="300" y="180" font-family="Georgia,serif" font-style="italic" font-size="13" fill="#7a6a4a">France</text>';
    s += '<text x="560" y="250" font-family="Georgia,serif" font-style="italic" font-size="12" fill="#7a6a4a">Balkans</text>';
    s += '<text x="420" y="350" font-family="Georgia,serif" font-style="italic" font-size="12" fill="#5a8a8a">Mer Méditerranée</text>';
    s += '<text x="680" y="440" font-family="Georgia,serif" font-style="italic" font-size="12" fill="#7a6a4a">Égypte</text>';
    // rose des vents
    s += '<g transform="translate(220 450)"><circle r="20" fill="#fffaf0" stroke="#2b2118" stroke-width="1.4"/><path d="M0 -26 L5 0 L0 26 L-5 0 Z" fill="#b23a2a" stroke="#2b2118" stroke-width="1"/><path d="M-26 0 L0 5 L26 0 L0 -5 Z" fill="#2b2118"/><text y="-30" text-anchor="middle" font-size="10" font-family="Georgia">N</text></g>';
    // musée
    const home = [350, 176];
    s += '<g transform="translate(' + home[0] + ' ' + home[1] + ')"><path d="M-12 0 L0 -10 L12 0 Z" fill="#b23a2a" stroke="#2b2118" stroke-width="1.4"/><rect x="-10" y="0" width="20" height="10" fill="#fffaf0" stroke="#2b2118" stroke-width="1.4"/><path d="M-6 0 V10 M0 0 V10 M6 0 V10" stroke="#2b2118"/><text y="24" text-anchor="middle" font-family="Georgia" font-size="11" font-weight="bold">Le musée</text></g>';
    // destinations
    for (const k in D.DESTINATIONS) {
      const d = D.DESTINATIONS[k];
      const [x, y] = d.map;
      const locked = state.reputation < d.unlockRep;
      const active = state.expeditions.some((e) => e.dest === k && e.phase !== 'termine');
      const permit = ME.Expeditions.permitValid(state, k);
      s += '<path d="M' + home[0] + ' ' + (home[1] + 4) + ' Q' + ((home[0] + x) / 2) + ' ' + (Math.min(home[1], y) - 30) + ' ' + x + ' ' + y + '" fill="none" stroke="' + (active ? '#b23a2a' : '#8a7a5a') + '" stroke-width="' + (active ? 2.4 : 1.4) + '" stroke-dasharray="5 4" opacity="' + (locked ? 0.35 : 0.9) + '"/>';
      const col = D.PERIODS[d.period].color;
      s += '<g class="pin' + (selected === k ? ' sel' : '') + (locked ? ' locked' : '') + '" data-dest="' + k + '" tabindex="0" role="button" aria-label="' + d.name + '" transform="translate(' + x + ' ' + y + ')">';
      s += '<circle r="22" fill="transparent"/>';
      s += '<path d="M0 0 C-10 -12 -10 -26 0 -26 C10 -26 10 -12 0 0 Z" fill="' + (locked ? '#a0968a' : col) + '" stroke="#2b2118" stroke-width="1.6"/><circle cy="-18" r="4" fill="#fffaf0" stroke="#2b2118"/>';
      if (active) s += '<circle cy="-18" r="9" fill="none" stroke="#b23a2a" stroke-width="2"><animate attributeName="r" values="6;14;6" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite"/></circle>';
      if (permit) s += '<path d="M6 -30 l3 3 l6 -7" fill="none" stroke="#2f7f4a" stroke-width="2.4"/>';
      const lx = k === 'abbaye' ? 10 : k === 'puy' ? 12 : 0;
      s += '<text x="' + lx + '" y="14" text-anchor="middle" font-family="Georgia" font-size="11" font-weight="bold" paint-order="stroke" stroke="#fffaf0" stroke-width="3">' + d.name.replace(/^(Vallée de la |Oppidum du |Abbaye de |Épave de l\'|Nécropole de |Île de )/, '') + '</text>';
      if (locked) s += '<text y="27" text-anchor="middle" font-family="Georgia" font-size="9" fill="#5a4a3a" paint-order="stroke" stroke="#fffaf0" stroke-width="3">réputation ' + d.unlockRep + '</text>';
      s += '</g>';
    }
    s += '<g transform="translate(600 130)"><rect x="0" y="0" width="170" height="40" rx="4" fill="#fffaf0" stroke="#2b2118" stroke-width="1.6"/><text x="85" y="18" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="13">Carte des expéditions</text><text x="85" y="32" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="10">Touchez un site pour le préparer</text></g>';
    return s + '</svg>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
