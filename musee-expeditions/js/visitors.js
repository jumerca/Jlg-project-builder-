/* Musée & Expéditions — visitors.js
 * Fréquentation et satisfaction : chaque semaine, un échantillon de visiteurs aux intérêts
 * variés parcourt le musée dans l'ordre du parcours. Leurs impressions sont résumées
 * en raisons lisibles (ce qui a plu, ce qui a déçu).
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const Obj = ME.Objects;
  const E = ME.Exhibitions;
  const V = (ME.Visitors = {});

  V.SAMPLE = 60;

  V.priceFactor = (price) => ME.clamp(1.35 - (price - 5) * 0.07, 0.3, 1.45);
  V.season = function (week) {
    const w = ((week - 1) % 52) + 1;
    if (w >= 26 && w <= 35) return 1.3;
    if (w >= 48 || w <= 6) return 0.85;
    return 1;
  };
  V.mediation = function (state) {
    const m = state.staff.filter((p) => p.assign && p.assign.kind === 'accueil');
    return m.reduce((a, p) => a + 3 + (p.skills.mediation || 0) * 1.5, 0);
  };

  /** Attrait global du musée (somme des salles du parcours + pièce d'appel). */
  V.attraction = function (state) {
    const route = E.normalizeRoute(state);
    let a = 0;
    const rooms = {};
    ['hall'].concat(route).forEach((r) => {
      const an = E.analyzeRoom(state, r);
      rooms[r] = an;
      a += an.score * (r === 'hall' ? 1.6 : 1);
    });
    if (state.tempExpo) a += state.tempExpo.hype * 1.2;
    return { total: a, rooms };
  };

  V.expectedVisitors = function (state, att) {
    att = att || V.attraction(state);
    const potential = 80 + state.reputation * 5 + att.total * 9 + (state.tempExpo ? 60 : 0);
    const wom = state.lastVisit ? 0.8 + state.lastVisit.satisfaction / 250 : 1;
    return potential * V.priceFactor(state.ticketPrice) * wom * V.season(state.week);
  };

  V.simulate = function (state) {
    const att = V.attraction(state);
    const route = E.normalizeRoute(state);
    const noise = 0.9 + ME.rand(state) * 0.2;
    const total = Math.max(0, Math.round(V.expectedVisitors(state, att) * noise));
    const vitrines = ['hall'].concat(route).reduce((a, r) => a + state.rooms[r].vitrines.length, 0) || 1;
    const crowd = total / (vitrines * 60);
    const med = V.mediation(state);
    const types = Object.keys(D.VISITOR_TYPES);
    const reasons = {};
    const add = (k, sign) => { reasons[k] = reasons[k] || { text: k, n: 0, sign }; reasons[k].n++; };
    const byType = {};
    types.forEach((t) => (byType[t] = { n: 0, sat: 0 }));
    const roomStats = {};
    ['hall'].concat(route).forEach((r) => (roomStats[r] = { joy: 0, n: 0 }));
    const sample = [];
    let satSum = 0;
    let tempSat = 0, tempN = 0;

    for (let i = 0; i < V.SAMPLE; i++) {
      const tk = ME.pickWeighted(state, types, (t) => D.VISITOR_TYPES[t].share);
      const vt = D.VISITOR_TYPES[tk];
      const interest = ME.pick(state, vt.interests);
      let joy = 0;
      let sawInterest = 0, sawStar = false, unstudied = 0, darkRooms = 0;
      const path = ['hall'].concat(route);
      path.forEach((r, idx) => {
        const an = att.rooms[r];
        if (!an || !an.objs.length) return;
        const roomIdx = idx; // le hall compte comme une étape légère
        const fatigue = roomIdx <= vt.stamina ? 1 : Math.pow(0.7, roomIdx - vt.stamina);
        const room = state.rooms[r];
        let lightPref = 1;
        if (vt.likesBright && room.lighting === 'vif') lightPref = 1.1;
        if (vt.likesBright && room.lighting === 'tamise') { lightPref = 0.92; darkRooms++; }
        if (!vt.likesBright && room.lighting === 'vif') lightPref = 0.95;
        let rj = 0;
        an.objs.forEach((o) => {
          const match = o.period === interest;
          if (match) sawInterest++;
          const rs = D.RARITY[o.rarity].score;
          if (rs >= 6) sawStar = true;
          if (o.studied < 40) unstudied++;
          const studyFactor = 1 + vt.careStudy * (o.studied / 100 - 0.4) * 0.6;
          const rareFactor = 1 + vt.careRare * (rs - 1.5) * 0.08;
          rj += Obj.appeal(o) * (match ? 2.1 : 0.75) * studyFactor * rareFactor;
        });
        rj *= an.mult * lightPref * fatigue * (r === 'hall' ? 1.4 : 1);
        roomStats[r].joy += rj;
        roomStats[r].n++;
        joy += rj;
        if (r === 'temp' && state.tempExpo) { tempSat += rj; tempN++; }
      });
      let sat = 12 + 88 * (1 - Math.exp(-joy / 9));
      sat += med;
      if (crowd > 1) { sat -= (crowd - 1) * 12; add('Trop de monde devant les vitrines', -1); }
      const pricePain = Math.max(0, state.ticketPrice * vt.priceMult - 10) * (tk === 'touriste' ? 1.5 : 3);
      if (pricePain > 0) { sat -= pricePain; add('Billet jugé trop cher', -1); }
      if (path.length - 1 > vt.stamina) add('Fatigue en fin de parcours (' + vt.label.toLowerCase() + ')', -1);
      if (sawInterest >= 2) add('A adoré les collections : ' + D.PERIODS[interest].label, 1);
      else if (sawInterest === 0) add('Aurait voulu voir : ' + D.PERIODS[interest].label, -1);
      if (sawStar) add('Émerveillé·e par un chef-d\'œuvre', 1);
      if (vt.careStudy >= 1 && unstudied >= 3) add('Cartels trop pauvres (objets peu étudiés)', -1);
      if (darkRooms >= 2) add('Salles trop sombres pour les ' + vt.label.toLowerCase(), -1);
      if (med > 0 && ME.chance(state, 0.5)) add('Accueil et médiation appréciés', 1);
      sat = ME.clamp(sat, 0, 100);
      satSum += sat;
      byType[tk].n++;
      byType[tk].sat += sat;
      if (i < 16) sample.push({ type: tk, interest, sat: Math.round(sat) });
    }

    const satisfaction = Math.round(satSum / V.SAMPLE);
    const counts = {};
    types.forEach((t) => {
      counts[t] = Math.round(total * byType[t].n / V.SAMPLE);
      byType[t].sat = byType[t].n ? Math.round(byType[t].sat / byType[t].n) : 0;
    });
    if (state.tempExpo) {
      state.tempExpo.visitors += total;
      const ts = tempN ? 100 * (1 - Math.exp(-(tempSat / tempN) / 6)) : 40;
      state.tempExpo.satSum += ts;
      state.tempExpo.satN++;
    }
    const reasonList = Object.values(reasons).sort((a, b) => b.n - a.n).map((r) => ({ text: r.text, pct: Math.round(r.n * 100 / V.SAMPLE), sign: r.sign }));
    const rooms = {};
    Object.keys(roomStats).forEach((r) => { rooms[r] = roomStats[r].n ? Math.round(roomStats[r].joy / roomStats[r].n * 10) / 10 : 0; });
    return { week: state.week, total, counts, satisfaction, byType, reasons: reasonList.slice(0, 8), rooms, crowd: Math.round(crowd * 100) / 100, sample, attraction: Math.round(att.total * 10) / 10 };
  };
})(typeof window !== 'undefined' ? window : globalThis);
