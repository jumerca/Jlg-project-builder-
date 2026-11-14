/* Musée & Expéditions — exhibitions.js
 * Salles, vitrines, thèmes, éclairage, parcours de visite, expositions temporaires,
 * prêts entrants et sortants, acquisitions documentées.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const Obj = ME.Objects;
  const E = (ME.Exhibitions = {});

  /* ---------------- Vitrines ---------------- */
  E.canDisplay = function (state, obj, roomId) {
    const room = state.rooms[roomId];
    if (!room || !room.unlocked) return 'Salle fermée.';
    if (obj.location !== 'reserve') return 'L\'objet doit être en réserve.';
    if (obj.condition < Obj.minDisplayCondition(obj)) return 'Trop fragile pour être exposé (état ' + obj.condition + ', minimum ' + Obj.minDisplayCondition(obj) + ') : restaurez-le d\'abord.';
    return null;
  };

  E.place = function (state, objId, roomId, slot) {
    const obj = state.objects[objId];
    const err = E.canDisplay(state, obj, roomId);
    if (err) return { ok: false, error: err };
    const room = state.rooms[roomId];
    if (slot == null) slot = room.vitrines.indexOf(null);
    if (slot < 0 || slot >= room.vitrines.length) return { ok: false, error: 'Aucune vitrine libre dans cette salle.' };
    if (room.vitrines[slot]) E.remove(state, room.vitrines[slot]);
    room.vitrines[slot] = objId;
    Obj.move(state, obj, 'vitrine', 'Exposé : ' + D.ROOMS[roomId].name + ', vitrine ' + (slot + 1) + '.');
    obj.roomId = roomId;
    obj.slot = slot;
    return { ok: true };
  };

  E.remove = function (state, objId, text) {
    const obj = state.objects[objId];
    if (!obj || obj.location !== 'vitrine') return;
    const room = state.rooms[obj.roomId];
    if (room) room.vitrines[obj.slot] = null;
    Obj.move(state, obj, 'reserve', text || 'Retiré de la vitrine, retour en réserve.');
  };

  E.setTheme = (state, roomId, theme) => { state.rooms[roomId].theme = theme || null; };
  E.setLighting = (state, roomId, l) => { state.rooms[roomId].lighting = l; };

  E.expoRooms = (state) => Object.keys(D.ROOMS).filter((k) => ['expo', 'temp'].includes(D.ROOMS[k].kind) && state.rooms[k].unlocked);

  /** Parcours : ordre de visite des salles ouvertes (le hall est toujours en premier). */
  E.normalizeRoute = function (state) {
    const open = E.expoRooms(state);
    state.route = state.route.filter((r) => open.includes(r));
    open.forEach((r) => { if (!state.route.includes(r)) state.route.push(r); });
    return state.route;
  };
  E.moveInRoute = function (state, roomId, dir) {
    const r = E.normalizeRoute(state);
    const i = r.indexOf(roomId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]];
  };

  /* ---------------- Disposition des vitrines ----------------
   * Positions relatives au centre de la salle (10 × 8 unités), en unités de jeu.
   * Effets : vitrines trop serrées (circulation), vitrine devant une porte (passage encombré),
   * pièce maîtresse isolée (mise en valeur). */
  E.ROOM_W = 10; E.ROOM_D = 8;
  E.MIN_GAP = 1.15;   // en dessous, deux vitrines se chevauchent : interdit
  E.CROWD = 1.7;      // en dessous, la circulation est gênée
  E.DOOR_CLEAR = 1.7; // une vitrine plus proche d'une porte encombre le passage
  E.SOLO = 2.6;       // espace libre autour d'une pièce maîtresse mise en valeur
  const MARGIN = 0.75;

  E.defaultLayout = function (roomId, n) {
    if (roomId === 'hall') return [{ x: 1.2, z: -1.2, r: 0 }];
    if (n === 6) return [-3, 0, 3].map((x) => ({ x, z: -2, r: 0 })).concat([-3, 0, 3].map((x) => ({ x, z: 1.3, r: 0 })));
    const step = n >= 5 ? 1.85 : 2.3;
    return Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * step, z: -1.4, r: 0 }));
  };

  E.PRESETS = {
    ligne: { label: 'Alignée', desc: 'Une rangée face au public, le long du mur du fond.' },
    ilots: { label: 'En îlots', desc: 'Petits groupes répartis : on circule autour.' },
    galerie: { label: 'Allée centrale', desc: 'Deux rangées qui encadrent une allée.' },
    maitresse: { label: 'Pièce maîtresse au centre', desc: 'La vitrine 1 trône au milieu, les autres en couronne.' },
  };
  E.presetLayout = function (roomId, n, key) {
    if (roomId === 'hall' || n <= 1) return E.defaultLayout(roomId, n);
    const out = [];
    if (key === 'ligne') {
      const step = Math.min(2.2, 8 / Math.max(1, n - 1));
      for (let i = 0; i < n; i++) out.push({ x: (i - (n - 1) / 2) * step, z: -2.4, r: 0 });
    } else if (key === 'ilots') {
      const spots = [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.2], [2.8, 1.2], [0, -0.3], [0, 2.2]];
      for (let i = 0; i < n; i++) out.push({ x: spots[i][0], z: spots[i][1], r: 0 });
    } else if (key === 'galerie') {
      const per = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) { const row = i < per ? 0 : 1, k = row ? i - per : i, m = row ? n - per : per; out.push({ x: (k - (m - 1) / 2) * 2.4, z: row ? 1.6 : -2.4, r: row ? Math.PI : 0 }); }
    } else { // pièce maîtresse
      out.push({ x: 0, z: -0.2, r: 0 });
      const ring = [[-3.4, -2.4], [3.4, -2.4], [-3.4, 2.0], [3.4, 2.0], [0, -2.9]];
      for (let i = 1; i < n; i++) out.push({ x: ring[i - 1][0], z: ring[i - 1][1], r: 0 });
    }
    return out;
  };
  E.applyPreset = function (state, roomId, key) {
    const room = state.rooms[roomId];
    room.layout = E.presetLayout(roomId, room.vitrines.length, key);
    return room.layout;
  };

  /** Positions des vitrines (créées par défaut si absentes ou si le nombre de vitrines a changé). */
  E.layout = function (state, roomId) {
    const room = state.rooms[roomId];
    if (!room.layout || room.layout.length !== room.vitrines.length) room.layout = E.defaultLayout(roomId, room.vitrines.length);
    return room.layout;
  };

  /** Portes d'une salle (centres, coordonnées relatives). */
  E.doors = function (roomId) {
    const d = D.ROOMS[roomId], out = [];
    const has = (c, r) => Object.values(D.ROOMS).some((x) => x.col === c && x.row === r);
    if (has(d.col - 1, d.row) || roomId === 'hall') out.push({ x: -E.ROOM_W / 2, z: 0 });
    if (has(d.col + 1, d.row)) out.push({ x: E.ROOM_W / 2, z: 0 });
    if (has(d.col, d.row - 1)) out.push({ x: 0, z: -E.ROOM_D / 2 });
    if (has(d.col, d.row + 1)) out.push({ x: 0, z: E.ROOM_D / 2 });
    return out;
  };

  /** Vérifie un emplacement : hors limites ou chevauchement = refusé ; avertissements sinon. */
  E.checkSpot = function (state, roomId, index, x, z) {
    const lim = { x: E.ROOM_W / 2 - MARGIN, z: E.ROOM_D / 2 - MARGIN };
    if (Math.abs(x) > lim.x || Math.abs(z) > lim.z) return { ok: false, reason: 'Trop près du mur.' };
    const L = E.layout(state, roomId);
    for (let i = 0; i < L.length; i++) {
      if (i === index) continue;
      if (Math.hypot(L[i].x - x, L[i].z - z) < E.MIN_GAP) return { ok: false, reason: 'Une autre vitrine occupe déjà cette place.' };
    }
    const warn = [];
    if (E.doors(roomId).some((d) => Math.hypot(d.x - x, d.z - z) < E.DOOR_CLEAR)) warn.push('encombre un passage');
    if (L.some((p, i) => i !== index && Math.hypot(p.x - x, p.z - z) < E.CROWD)) warn.push('trop serrée');
    return { ok: true, warn };
  };

  E.moveVitrine = function (state, roomId, index, x, z, r) {
    const snap = (v) => Math.round(v * 4) / 4;
    x = snap(x); z = snap(z);
    const chk = E.checkSpot(state, roomId, index, x, z);
    if (!chk.ok) return { ok: false, error: chk.reason };
    const L = E.layout(state, roomId);
    L[index] = { x, z, r: r != null ? r : L[index].r || 0 };
    return { ok: true, warn: chk.warn };
  };
  E.rotateVitrine = function (state, roomId, index) {
    const L = E.layout(state, roomId);
    L[index].r = ((L[index].r || 0) + Math.PI / 2) % (Math.PI * 2);
  };

  /** Effets de la disposition sur l'attrait d'une salle. */
  E.layoutEffects = function (state, roomId) {
    const room = state.rooms[roomId];
    const L = E.layout(state, roomId);
    const notes = [];
    let mult = 1;
    if (L.length < 2 && roomId !== 'hall') return { mult, notes };
    let crowded = 0;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (Math.hypot(L[i].x - L[j].x, L[i].z - L[j].z) < E.CROWD) crowded++;
    if (crowded) { const m = Math.max(0.8, 1 - 0.05 * crowded); mult *= m; notes.push({ t: 'Vitrines trop serrées : circulation difficile (−' + Math.round((1 - m) * 100) + ' %)', s: -1, layout: true }); }
    const doors = E.doors(roomId);
    const blocking = L.filter((p) => doors.some((d) => Math.hypot(d.x - p.x, d.z - p.z) < E.DOOR_CLEAR)).length;
    if (blocking) { mult *= 0.9; notes.push({ t: blocking + ' vitrine(s) encombrent un passage : −10 %', s: -1, layout: true }); }
    // pièce maîtresse isolée
    let best = -1, bestScore = 0;
    room.vitrines.forEach((id, i) => { if (id) { const sc = D.RARITY[state.objects[id].rarity].score; if (sc > bestScore) { bestScore = sc; best = i; } } });
    if (best >= 0 && bestScore >= 3.5 && L.length > 1) {
      const free = L.every((p, i) => i === best || Math.hypot(p.x - L[best].x, p.z - L[best].z) >= E.SOLO);
      if (free) { mult *= 1.1; notes.push({ t: 'Pièce maîtresse mise en valeur, avec de l\'espace autour : +10 %', s: 1, layout: true }); }
      else notes.push({ t: 'Astuce : isolez votre plus belle pièce (≥ ' + E.SOLO + ' m des autres) pour la mettre en valeur', s: 0, layout: true });
    }
    return { mult, notes };
  };

  /** Analyse d'une salle : score d'attrait et explications lisibles. */
  E.analyzeRoom = function (state, roomId) {
    const room = state.rooms[roomId];
    const def = D.ROOMS[roomId];
    const objs = room.vitrines.filter(Boolean).map((id) => state.objects[id]);
    const notes = [];
    let mult = 1;
    const light = D.LIGHTING[room.lighting];
    if (!objs.length) return { score: 0, mult: 0, objs, notes: [{ t: 'Aucun objet exposé.', s: -1 }], periods: {} };
    const periods = {};
    objs.forEach((o) => { periods[o.period] = (periods[o.period] || 0) + 1; });
    if (room.theme) {
      const match = periods[room.theme] || 0;
      const off = objs.length - match;
      if (match >= 3) { mult *= 1.25; notes.push({ t: 'Thème cohérent (' + D.PERIODS[room.theme].label + ', ' + match + ' objets) : +25 %', s: 1 }); }
      else notes.push({ t: 'Thème « ' + D.PERIODS[room.theme].label + ' » : ajoutez au moins 3 objets de cette période pour un bonus', s: 0 });
      if (off > 0) { mult *= Math.pow(0.85, off); notes.push({ t: off + ' objet(s) hors thème : −' + Math.round((1 - Math.pow(0.85, off)) * 100) + ' %', s: -1 }); }
    } else if (Object.keys(periods).length >= 3 && def.kind !== 'hall') {
      mult *= 0.9; notes.push({ t: 'Salle sans fil conducteur (' + Object.keys(periods).length + ' périodes mélangées) : −10 %. Choisissez un thème.', s: -1 });
    }
    const empty = room.vitrines.length - objs.length;
    if (def.kind !== 'hall' && empty > room.vitrines.length / 2) { mult *= 0.85; notes.push({ t: 'Salle clairsemée (' + empty + ' vitrines vides) : −15 %', s: -1 }); }
    if (light.attract !== 1) notes.push({ t: 'Éclairage ' + light.label.toLowerCase() + ' : ' + (light.attract > 1 ? '+' : '') + Math.round((light.attract - 1) * 100) + ' % d\'attrait', s: light.attract > 1 ? 1 : -1 });
    mult *= light.attract;
    const sensitive = objs.filter((o) => D.MATERIALS[o.mat].light >= 0.5);
    if (sensitive.length && room.lighting !== 'tamise') notes.push({ t: sensitive.length + ' objet(s) sensible(s) à la lumière s\'abîment ici', s: -1 });
    const unstudied = objs.filter((o) => o.studied < 40).length;
    if (unstudied) notes.push({ t: unstudied + ' cartel(s) pauvre(s) : objets peu étudiés', s: -1 });
    const stars = objs.filter((o) => D.RARITY[o.rarity].score >= 3.5).length;
    if (stars) notes.push({ t: stars + ' chef(s)-d\'œuvre exposé(s)', s: 1 });
    const lay = E.layoutEffects(state, roomId);
    mult *= lay.mult;
    notes.push(...lay.notes);
    const base = objs.reduce((a, o) => a + Obj.appeal(o), 0);
    return { score: base * mult, base, mult, objs, notes, periods };
  };

  /* ---------------- Exposition temporaire ---------------- */
  E.TEMP_COST = 1500;
  E.TEMP_WEEKS = 8;

  E.canStartTemp = function (state, title) {
    if (!state.rooms.temp.unlocked) return 'La salle des expositions temporaires n\'est pas encore ouverte.';
    if (state.tempExpo) return 'Une exposition temporaire est déjà en cours.';
    if (!title || !title.trim()) return 'Donnez un titre à l\'exposition.';
    if (!state.rooms.temp.theme) return 'Choisissez un thème pour l\'exposition.';
    const n = state.rooms.temp.vitrines.filter(Boolean).length;
    if (n < 3) return 'Installez au moins 3 objets dans la salle temporaire.';
    if (state.money < E.TEMP_COST) return 'Fonds insuffisants pour la scénographie (' + ME.fmtMoney(E.TEMP_COST) + ').';
    return null;
  };

  E.startTemp = function (state, title) {
    const err = E.canStartTemp(state, title);
    if (err) return { ok: false, error: err };
    ME.money(state, -E.TEMP_COST, 'Scénographie — « ' + title.trim() + ' »', 'expositions');
    const a = E.analyzeRoom(state, 'temp');
    state.tempExpo = { title: title.trim(), theme: state.rooms.temp.theme, start: state.week, end: state.week + E.TEMP_WEEKS, hype: Math.round(a.score * 10) / 10, visitors: 0, satSum: 0, satN: 0, objIds: state.rooms.temp.vitrines.filter(Boolean) };
    state.tempExpo.objIds.forEach((id) => Obj.addHistory(state, state.objects[id], 'Présenté dans l\'exposition temporaire « ' + title.trim() + ' ».'));
    ME.log(state, 'Inauguration de l\'exposition « ' + title.trim() + ' » ! Elle durera ' + E.TEMP_WEEKS + ' semaines.', 'story');
    return { ok: true };
  };

  E.tickTemp = function (state) {
    const t = state.tempExpo;
    if (!t || state.week < t.end) return null;
    const sat = t.satN ? t.satSum / t.satN : 50;
    const stars = ME.clamp(Math.round(sat / 20), 1, 5);
    state.reputation += stars;
    state.tempHistory.push({ title: t.title, theme: t.theme, start: t.start, end: t.end, visitors: t.visitors, stars });
    state.tempExpo = null;
    ME.log(state, 'L\'exposition « ' + t.title + ' » ferme ses portes : ' + ME.fmtInt(t.visitors) + ' visiteurs, critique ' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + '. Réputation +' + stars + '.', 'story');
    return t;
  };

  /* ---------------- Prêts entrants ---------------- */
  E.loanCatalog = function (state) {
    const list = [];
    for (const k in D.INSTITUTIONS) {
      const inst = D.INSTITUTIONS[k];
      inst.loans.forEach((l) => {
        const busy = state.loansIn.find((x) => x.inst === k && x.type === l.type);
        list.push({ inst: k, type: l.type, fee: l.fee, weeks: l.weeks, minPartner: l.minPartner, partnership: state.permits[k].partnership, available: !busy && state.permits[k].partnership >= l.minPartner, busy: !!busy });
      });
    }
    return list;
  };

  E.requestLoan = function (state, instKey, type) {
    const inst = D.INSTITUTIONS[instKey];
    const l = inst.loans.find((x) => x.type === type);
    if (!l) return { ok: false, error: 'Objet introuvable dans le catalogue.' };
    if (state.permits[instKey].partnership < l.minPartner) return { ok: false, error: 'Partenariat insuffisant avec ' + inst.short + ' (' + l.minPartner + ' requis).' };
    if (state.loansIn.find((x) => x.inst === instKey && x.type === type)) return { ok: false, error: 'Cet objet est déjà prêté au musée.' };
    if (state.money < l.fee) return { ok: false, error: 'Fonds insuffisants.' };
    ME.money(state, -l.fee, 'Frais de prêt — ' + D.TYPES[type].name + ' (' + inst.short + ')', 'expositions');
    state.catalogObjects = state.catalogObjects || {};
    const key = instKey + ':' + type;
    let obj = state.catalogObjects[key] && state.objects[state.catalogObjects[key]];
    if (!obj) {
      obj = Obj.create(state, type, { prefix: 'PRT-', owner: 'preteur', lender: instKey, mode: 'pret', condition: 82, studied: 100, documentation: 90, location: 'rendu', provenance: 'Collections de : ' + inst.name });
      Obj.addHistory(state, obj, 'Inscrit au catalogue des prêts de ' + inst.name + '.');
      state.catalogObjects[key] = obj.id;
    }
    Obj.move(state, obj, 'en-route', 'Prêt accordé par ' + inst.name + ' pour ' + l.weeks + ' semaines. Convoiement en cours.');
    obj.returnWeek = state.week + 1 + l.weeks;
    state.loansIn.push({ objId: obj.id, inst: instKey, type, returnWeek: obj.returnWeek, fee: l.fee });
    ME.log(state, inst.short + ' prête « ' + obj.name + ' » (' + obj.id + ') : arrivée la semaine prochaine.', 'success', { obj: obj.id });
    return { ok: true, obj };
  };

  /** Objets de nos missions conservés par un partenaire : prêt gratuit de 12 semaines. */
  E.requestDeposit = function (state, objId) {
    const obj = state.objects[objId];
    if (!obj || obj.location !== 'depot') return { ok: false, error: 'Objet indisponible.' };
    const inst = D.INSTITUTIONS[obj.lender];
    if (state.permits[obj.lender].partnership < 25) return { ok: false, error: 'Partenariat insuffisant avec ' + inst.short + ' (25 requis).' };
    Obj.move(state, obj, 'en-route', 'Prêt gratuit consenti par ' + inst.name + ' (12 semaines). Convoiement en cours.');
    obj.returnWeek = state.week + 13;
    state.loansIn.push({ objId, inst: obj.lender, type: obj.type, returnWeek: obj.returnWeek, fee: 0, deposit: true });
    ME.log(state, inst.short + ' accepte de prêter « ' + obj.name + ' » (' + obj.id + ').', 'success', { obj: objId });
    return { ok: true };
  };

  /* ---------------- Prêts sortants ---------------- */
  E.loanOutEligible = function (state, offer) {
    return Obj.all(state, (o) => o.owner === 'musee' && ['reserve', 'vitrine'].includes(o.location) && o.period === offer.period && o.condition >= 60 && o.studied >= 40 && D.RARITY[o.rarity].score >= D.RARITY[offer.minRarity].score);
  };

  E.acceptLoanOut = function (state, offerId, objId) {
    const offer = state.loanOffers.find((x) => x.id === offerId);
    const obj = state.objects[objId];
    if (!offer || !obj) return { ok: false, error: 'Offre ou objet introuvable.' };
    if (offer.expires < state.week) return { ok: false, error: 'Cette demande a expiré.' };
    if (!E.loanOutEligible(state, offer).includes(obj)) return { ok: false, error: 'Cet objet ne remplit pas les conditions du prêt (période, rareté, état ≥ 60, étude ≥ 40).' };
    if (obj.location === 'vitrine') E.remove(state, objId, 'Décroché pour un prêt.');
    Obj.move(state, obj, 'pret-sortant', 'Prêté au ' + offer.museum + ' pour ' + offer.weeks + ' semaines (exposition « ' + offer.expo + ' »).');
    obj.loanOut = { museum: offer.museum, returnWeek: state.week + offer.weeks, expo: offer.expo };
    ME.money(state, offer.fee, 'Redevance de prêt — ' + offer.museum, 'prets');
    state.reputation += offer.rep;
    state.loanOffers = state.loanOffers.filter((x) => x.id !== offerId);
    ME.log(state, '« ' + obj.name + ' » (' + obj.id + ') part pour le ' + offer.museum + '. Redevance ' + ME.fmtMoney(offer.fee) + ', réputation +' + offer.rep + '.', 'success', { obj: objId });
    return { ok: true };
  };

  E.tickLoans = function (state) {
    // Arrivées et retours des prêts entrants
    state.loansIn.slice().forEach((l) => {
      const o = state.objects[l.objId];
      if (o.location === 'en-route') {
        Obj.move(state, o, 'reserve', 'Arrivé au musée, constat d\'état réalisé (état ' + o.condition + ').');
      } else if (state.week >= l.returnWeek) {
        if (o.location === 'vitrine') E.remove(state, o.id, 'Décroché : fin du prêt.');
        if (o.location === 'reserve') {
          const inst = D.INSTITUTIONS[l.inst];
          Obj.move(state, o, 'rendu', 'Rendu à ' + inst.name + ' à l\'échéance du prêt.');
          if (l.deposit) Obj.move(state, o, 'depot', 'De retour en dépôt chez ' + inst.name + '.');
          o.returnWeek = null;
          state.loansIn.splice(state.loansIn.indexOf(l), 1);
          state.permits[l.inst].partnership = Math.min(100, state.permits[l.inst].partnership + 2);
          ME.log(state, '« ' + o.name + ' » (' + o.id + ') a été rendu à ' + inst.short + ' en temps voulu.', 'info', { obj: o.id });
        }
      }
    });
    // Retours des prêts sortants
    Object.values(state.objects).forEach((o) => {
      if (o.location === 'pret-sortant' && o.loanOut && state.week >= o.loanOut.returnWeek) {
        Obj.move(state, o, 'reserve', 'Retour du prêt au ' + o.loanOut.museum + '. Constat d\'état : ' + o.condition + '.');
        ME.log(state, '« ' + o.name + ' » (' + o.id + ') est revenu du ' + o.loanOut.museum + '.', 'info', { obj: o.id });
        o.loanOut = null;
      }
    });
    // Nouvelles demandes de prêt d'autres musées
    state.loanOffers = state.loanOffers.filter((x) => x.expires >= state.week);
    if (state.loanOffers.length < 2 && ME.chance(state, 0.22 + state.reputation * 0.004)) {
      const owned = Obj.all(state, (o) => o.owner === 'musee' && ['reserve', 'vitrine'].includes(o.location));
      if (owned.length) {
        const ref = ME.pick(state, owned);
        const minRarity = D.RARITY[ref.rarity].score >= 2 ? 'peuCommun' : 'commun';
        const fee = (minRarity === 'commun' ? 600 : 1400) + ME.randInt(state, 0, 6) * 100;
        const themes = { prehistoire: 'Chasseurs de l\'ère glaciaire', gaule: 'Gaulois, une civilisation retrouvée', egypte: 'Rites d\'éternité', rome: 'Naufrages et commerce antique', medieval: 'Le temps des abbayes', bronze: 'Les îles de marbre' };
        state.loanOffers.push({ id: ME.nextId(state, 'offer', 'D', 3), museum: ME.pick(state, D.BORROWERS), period: ref.period, minRarity, weeks: ME.randInt(state, 6, 10), fee, rep: minRarity === 'commun' ? 1 : 2, expo: themes[ref.period], expires: state.week + 5 });
      }
    }
  };

  /* ---------------- Acquisitions documentées ---------------- */
  E.tickMarket = function (state) {
    state.market = state.market.filter((m) => m.expires >= state.week && !m.sold);
    if (state.market.length < 3 && ME.chance(state, 0.3)) {
      const types = Object.keys(D.TYPES).filter((k) => D.TYPES[k].rarity !== 'exceptionnel');
      const type = ME.pick(state, types);
      const t = D.TYPES[type];
      const lacunaire = ME.chance(state, 0.35);
      const cond = ME.randInt(state, 45, 90);
      const price = Math.round(D.RARITY[t.rarity].value * (0.7 + cond / 150) * (lacunaire ? 0.6 : 1) / 50) * 50;
      state.market.push({
        id: ME.nextId(state, 'lot', 'L', 3), type, seller: ME.pick(state, D.SELLERS), price, condition: cond,
        dossier: lacunaire ? 'lacunaire' : 'complet', verified: false, illicit: lacunaire && ME.chance(state, 0.55),
        expires: state.week + 6,
      });
    }
    // Réclamations différées sur des achats illicites
    Object.values(state.objects).forEach((o) => {
      if (o.claimWeek && state.week >= o.claimWeek && o.owner === 'musee' && o.location !== 'restitue') {
        if (o.location === 'vitrine') E.remove(state, o.id, 'Décroché à la demande des autorités.');
        if (o.location === 'atelier') ME.Conservation.cancel(state, (state.jobs.find((j) => j.objId === o.id) || {}).id);
        if (o.location === 'pret-sortant') return; // sera traité au retour
        if (o.location === 'reserve') {
          ME.Objects.move(state, o, 'restitue', 'Saisi et restitué à son pays d\'origine : l\'objet provenait d\'un pillage récent.');
          o.claimWeek = null;
          state.reputation = Math.max(0, state.reputation - 8);
          ME.log(state, 'Scandale : « ' + o.name + ' » (' + o.id + ') provenait d\'un pillage. Objet restitué, réputation −8.', 'danger', { obj: o.id });
        }
      }
    });
  };

  E.VERIFY_COST = 200;
  E.verifyLot = function (state, lotId) {
    const lot = state.market.find((m) => m.id === lotId);
    if (!lot || lot.verified) return { ok: false, error: 'Rien à vérifier.' };
    if (state.money < E.VERIFY_COST) return { ok: false, error: 'Fonds insuffisants.' };
    ME.money(state, -E.VERIFY_COST, 'Enquête de provenance — lot ' + lot.id, 'acquisitions');
    lot.verified = true;
    if (lot.dossier === 'complet') lot.verdict = 'Historique de propriété complet et vérifié.';
    else lot.verdict = lot.illicit ? 'Alerte : l\'objet figure sur une liste d\'objets volés. Pillage probable.' : 'Lacune bénigne : l\'objet dormait dans un grenier familial depuis 1920, attestations retrouvées.';
    return { ok: true, lot };
  };

  E.reportLot = function (state, lotId) {
    const lot = state.market.find((m) => m.id === lotId);
    if (!lot || !lot.verified || !lot.illicit) return { ok: false };
    state.market = state.market.filter((m) => m !== lot);
    state.reputation += 3;
    ME.log(state, 'Vous signalez le lot ' + lot.id + ' aux autorités : l\'objet sera rendu à son pays. Réputation +3.', 'success');
    return { ok: true };
  };

  E.buyLot = function (state, lotId) {
    const lot = state.market.find((m) => m.id === lotId);
    if (!lot || lot.expires < state.week) return { ok: false, error: 'Lot indisponible.' };
    if (state.money < lot.price) return { ok: false, error: 'Fonds insuffisants.' };
    ME.money(state, -lot.price, 'Acquisition — ' + D.TYPES[lot.type].name + ' (' + lot.seller + ')', 'acquisitions');
    const dossierTxt = lot.verified ? lot.verdict : (lot.dossier === 'complet' ? 'dossier complet' : 'dossier lacunaire, non vérifié');
    const o = Obj.create(state, lot.type, { mode: 'achat', price: lot.price, condition: lot.condition, documentation: lot.dossier === 'complet' ? 70 : 35, location: 'reserve', provenance: 'Acquis auprès de : ' + lot.seller, provenanceDoc: lot.verified && !lot.illicit ? 'verifiee' : lot.dossier });
    Obj.addHistory(state, o, 'Acquis auprès de ' + lot.seller + ' pour ' + ME.fmtMoney(lot.price) + '. Provenance : ' + dossierTxt + '. Enregistré sous le n° ' + o.id + '.');
    if (lot.illicit) o.claimWeek = state.week + ME.randInt(state, 3, 8);
    lot.sold = true;
    state.market = state.market.filter((m) => m !== lot);
    ME.log(state, 'Nouvelle acquisition : « ' + o.name + ' » (' + o.id + ').', 'success', { obj: o.id });
    return { ok: true, obj: o };
  };
})(typeof window !== 'undefined' ? window : globalThis);
