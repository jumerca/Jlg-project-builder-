/* Musée & Expéditions — expeditions.js
 * Autorisations, partenariats, préparation et déroulement des expéditions,
 * tables de découvertes par site, transport et rapatriement.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const Obj = ME.Objects;
  const X = (ME.Expeditions = {});

  /* ---------------- Équipe ---------------- */
  X.staffById = (state, id) => state.staff.find((p) => p.id === id);
  X.isAvailable = (p) => !p.assign || p.assign.kind === 'accueil';

  /** Compétence d'équipe : le meilleur compte entièrement, les autres à moitié (complémentarité). */
  X.teamSkill = function (members, skill) {
    const vals = members.map((p) => p.skills[skill] || 0).sort((a, b) => b - a);
    if (!vals.length) return 0;
    return vals[0] + vals.slice(1).reduce((a, b) => a + b * 0.5, 0);
  };

  /* ---------------- Autorisations ---------------- */
  X.permitFor = (state, destKey) => state.permits[D.DESTINATIONS[destKey].inst];

  X.permitValid = function (state, destKey) {
    const p = X.permitFor(state, destKey);
    return p.status === 'granted' && p.validUntil >= state.week;
  };

  X.permitChance = function (state, instKey) {
    const p = state.permits[instKey];
    const dipl = Math.max(0, ...state.staff.map((s) => s.skills.diplomatie || 0));
    return ME.clamp(0.5 + state.reputation * 0.01 + p.partnership * 0.005 + dipl * 0.06, 0.2, 0.97);
  };

  X.requestPermit = function (state, instKey) {
    const inst = D.INSTITUTIONS[instKey];
    const p = state.permits[instKey];
    if (p.status === 'pending') return { ok: false, error: 'Demande déjà en cours d\'instruction.' };
    if (state.reputation < inst.minRep) return { ok: false, error: 'Réputation insuffisante (' + inst.minRep + ' requise).' };
    if (state.money < inst.permitCost) return { ok: false, error: 'Fonds insuffisants pour constituer le dossier.' };
    ME.money(state, -inst.permitCost, 'Dossier d\'autorisation — ' + inst.short, 'expeditions');
    p.status = 'pending';
    p.weeksLeft = inst.permitWeeks;
    ME.log(state, 'Dossier déposé auprès de : ' + inst.name + '. Réponse dans ' + inst.permitWeeks + ' semaine(s).', 'info');
    return { ok: true };
  };

  X.tickPermits = function (state) {
    for (const k in state.permits) {
      const p = state.permits[k];
      const inst = D.INSTITUTIONS[k];
      if (p.status === 'pending') {
        p.weeksLeft--;
        if (p.weeksLeft <= 0) {
          if (ME.chance(state, X.permitChance(state, k))) {
            p.status = 'granted';
            p.validUntil = state.week + 30;
            p.partnership = Math.min(100, p.partnership + 5);
            ME.log(state, inst.name + ' vous accorde une autorisation de fouille (30 semaines).', 'success');
          } else {
            p.status = 'refused';
            p.partnership = Math.min(100, p.partnership + 3);
            ME.log(state, inst.name + ' refuse votre dossier pour cette fois : renforcez votre réputation ou votre équipe diplomatique, puis redemandez.', 'warning');
          }
        }
      } else if (p.status === 'granted' && p.validUntil < state.week) {
        p.status = 'expired';
        ME.log(state, 'L\'autorisation accordée par ' + inst.short + ' a expiré.', 'warning');
      }
    }
  };

  /* ---------------- Préparation ---------------- */
  X.planCost = function (state, plan) {
    const dest = D.DESTINATIONS[plan.dest];
    const m = D.MISSIONS[plan.mission];
    const field = dest.weekly * plan.weeks;
    const equip = (plan.equip || []).reduce((a, k) => a + D.EQUIPMENT[k].cost, 0);
    const travel = 300 * dest.transport * Math.max(1, (plan.team || []).length);
    const gross = field + equip + travel;
    const total = Math.round(gross * m.costMult);
    return { field, equip, travel, gross, partnerShare: gross - total, total };
  };

  X.validatePlan = function (state, plan) {
    const errors = [];
    const dest = D.DESTINATIONS[plan.dest];
    const m = D.MISSIONS[plan.mission];
    if (!dest || !m) return ['Plan incomplet.'];
    if (state.reputation < dest.unlockRep) errors.push('Réputation insuffisante pour ce site (' + dest.unlockRep + ' requise).');
    if (m.needsPermit && !X.permitValid(state, plan.dest)) errors.push('Autorisation de fouille requise auprès de : ' + D.INSTITUTIONS[dest.inst].name + '.');
    if (m.minPartner && X.permitFor(state, plan.dest).partnership < m.minPartner) errors.push('Partenariat insuffisant (' + m.minPartner + ' requis).');
    if (plan.weeks < m.minWeeks || plan.weeks > m.maxWeeks) errors.push('Durée invalide.');
    const team = (plan.team || []).map((id) => X.staffById(state, id)).filter(Boolean);
    if (team.length < 2) errors.push('Il faut au moins 2 membres d\'équipe.');
    if (team.length > 5) errors.push('Maximum 5 membres d\'équipe.');
    team.forEach((p) => { if (!X.isAvailable(p)) errors.push(p.name + ' est déjà occupé(e).'); });
    dest.required.forEach((k) => { if (!(plan.equip || []).includes(k)) errors.push('Équipement obligatoire : ' + D.EQUIPMENT[k].label + '.'); });
    if (dest.transport >= 2 && !(plan.equip || []).includes('camp')) errors.push('Équipement obligatoire : ' + D.EQUIPMENT.camp.label + '.');
    if (dest.diver && !team.some((p) => p.traits.includes('plongeur'))) errors.push('Un plongeur est indispensable dans l\'équipe.');
    if (state.expeditions.some((e) => e.dest === plan.dest && e.phase !== 'termine')) errors.push('Une expédition est déjà en cours sur ce site.');
    const cost = X.planCost(state, plan);
    if (state.money < cost.total) errors.push('Budget insuffisant : ' + ME.fmtMoney(cost.total) + ' nécessaires.');
    return Array.from(new Set(errors));
  };

  /** Estimations affichées au joueur pour l'aider à composer son équipe. */
  X.forecast = function (state, plan) {
    const dest = D.DESTINATIONS[plan.dest];
    const m = D.MISSIONS[plan.mission];
    const team = (plan.team || []).map((id) => X.staffById(state, id)).filter(Boolean);
    const sk = (k) => X.teamSkill(team, k);
    const perWeek = (0.4 + sk('fouille') * 0.12 + ((plan.equip || []).includes('topo') ? 0.3 : 0) + state.knowledge[plan.dest] / 100 * 0.5) * m.findMult;
    return {
      finds: Math.max(0, Math.round(perWeek * plan.weeks * 10) / 10),
      care: ME.clamp(Math.round(40 + sk('conservation') * 9 + ((plan.equip || []).includes('kit') ? 12 : 0)), 0, 100),
      doc: ME.clamp(Math.round(35 + sk('recherche') * 7 + ((plan.equip || []).includes('topo') ? 18 : 0)), 0, 100),
      safety: ME.clamp(Math.round(40 + sk('logistique') * 10 + ((plan.equip || []).includes('caisses') ? 25 : 0)), 0, 100),
      diplomacy: ME.clamp(Math.round(30 + sk('diplomatie') * 12), 0, 100),
      skills: Object.keys(D.SKILLS).reduce((acc, k) => (acc[k] = sk(k), acc), {}),
    };
  };

  X.launch = function (state, plan) {
    const errors = X.validatePlan(state, plan);
    if (errors.length) return { ok: false, errors };
    const dest = D.DESTINATIONS[plan.dest];
    const cost = X.planCost(state, plan);
    ME.money(state, -cost.total, 'Expédition — ' + dest.name, 'expeditions');
    const id = ME.nextId(state, 'exp', 'EXP-', 2);
    const exp = {
      id, dest: plan.dest, mission: plan.mission, weeks: plan.weeks, weekDone: 0, phase: 'terrain',
      transportLeft: 0, team: plan.team.slice(), equip: (plan.equip || []).slice(), finds: [],
      log: [], cost: cost.total, startWeek: state.week, endWeek: null, progress: 0, morale: 80, extra: 0,
    };
    plan.team.forEach((pid) => { X.staffById(state, pid).assign = { kind: 'expedition', id }; });
    state.expeditions.push(exp);
    exp.log.push({ w: state.week, text: 'Départ de l\'équipe vers ' + dest.name + ' (' + D.MISSIONS[plan.mission].label.toLowerCase() + ', ' + plan.weeks + ' semaines).' });
    ME.log(state, 'L\'expédition ' + id + ' part pour ' + dest.name + '.', 'story', { exp: id });
    return { ok: true, exp };
  };

  /* ---------------- Événements de terrain ---------------- */
  const EVENTS = [
    { key: 'pluie', w: 1, biomes: ['valley', 'plateau', 'forest'], run(ctx) {
      if (ctx.has('camp') || ctx.sk('logistique') >= 4) return 'Pluies diluviennes. Bâches tendues à temps : le travail continue.';
      ctx.progress *= 0.5; return 'Pluies diluviennes : le chantier est noyé, la moitié de la semaine est perdue.'; } },
    { key: 'visite', w: 1, run(ctx) {
      const g = 2 + Math.round(ctx.sk('diplomatie'));
      ctx.permit.partnership = Math.min(100, ctx.permit.partnership + g);
      return 'Visite d\'une délégation (' + ctx.inst.short + ') : la rigueur du chantier impressionne. Partenariat +' + g + '.'; } },
    { key: 'presse', w: 0.8, run(ctx) { ctx.state.reputation += 1; return 'Un journaliste publie un reportage sur la fouille. Réputation +1.'; } },
    { key: 'local', w: 0.9, run(ctx) { ctx.bonusFinds += 1; ctx.state.knowledge[ctx.exp.dest] = Math.min(100, ctx.state.knowledge[ctx.exp.dest] + 5); return 'Un habitant signale un secteur prometteur. Une découverte supplémentaire !'; } },
    { key: 'blessure', w: 0.6, run(ctx) {
      if (ctx.sk('logistique') >= 3) return 'Une entorse sur le chantier, vite prise en charge grâce à une logistique solide.';
      ctx.progress *= 0.7; ctx.exp.morale -= 10; return 'Une fouilleuse se blesse : l\'équipe ralentit.'; } },
    { key: 'surcout', w: 0.7, run(ctx) {
      const c = ctx.sk('logistique') >= 4 ? 120 : 350;
      ME.money(ctx.state, -c, 'Imprévu de terrain — ' + ctx.dest.name, 'expeditions'); ctx.exp.extra += c;
      return 'Location imprévue d\'une pompe et d\'un groupe électrogène : ' + ME.fmtMoney(c) + '.'; } },
    { key: 'mistral', w: 1.4, biomes: ['sea'], run(ctx) { ctx.progress *= 0.5; return 'Coup de mistral : les plongées sont annulées trois jours.'; } },
    { key: 'compresseur', w: 0.8, biomes: ['sea'], run(ctx) {
      if (ctx.sk('logistique') >= 3) return 'Le compresseur tousse ; Théo le répare dans la soirée.';
      ctx.progress *= 0.6; return 'Panne du compresseur : on attend une pièce de rechange.'; } },
    { key: 'khamsin', w: 1.3, biomes: ['desert'], run(ctx) {
      if (ctx.has('camp')) { ctx.progress *= 0.8; return 'Le khamsin souffle ; le camp tient bon, les tranchées se remplissent de sable.'; }
      ctx.progress *= 0.4; return 'Tempête de sable : le chantier est enseveli.'; } },
    { key: 'inspecteur', w: 1, biomes: ['desert', 'island'], run(ctx) {
      if (ctx.sk('diplomatie') >= 3) { ctx.permit.partnership = Math.min(100, ctx.permit.partnership + 4); return 'L\'inspecteur des antiquités dîne au camp ; les échanges sont chaleureux. Partenariat +4.'; }
      ctx.progress *= 0.6; return 'Contrôle administratif tatillon : deux jours perdus en paperasse.'; } },
    { key: 'meltemi', w: 1.2, biomes: ['island'], run(ctx) { ctx.progress *= 0.6; return 'Le meltemi empêche le caïque de rejoindre l\'îlot.'; } },
    { key: 'labour', w: 1, biomes: ['plateau'], run(ctx) { ctx.bonusFinds += 1; return 'Un agriculteur apporte des tessons remontés par sa charrue : on ouvre un nouveau sondage.'; } },
    { key: 'ronces', w: 1, biomes: ['forest'], run(ctx) {
      if (ctx.sk('fouille') >= 4) return 'Les ronces du cloître sont dégagées en une matinée.';
      ctx.progress *= 0.75; return 'Il faut d\'abord débroussailler le cloître envahi par les ronces.'; } },
    { key: 'eboulis', w: 0.9, biomes: ['valley'], run(ctx) {
      if (ctx.sk('logistique') >= 3) return 'Un bloc menace de tomber ; il est étayé avant tout incident.';
      ctx.progress *= 0.6; return 'Un éboulis bloque l\'accès à l\'abri : chantier ralenti.'; } },
    { key: 'grotte', w: 0.5, biomes: ['valley'], run(ctx) { ctx.rareBoost += 0.6; return 'Un courant d\'air froid révèle une petite cavité scellée. Émotion sur le chantier !'; } },
    { key: 'cartonnage', w: 0.5, biomes: ['desert'], run(ctx) { ctx.rareBoost += 0.6; return 'Un puits funéraire intact est dégagé. On retient son souffle.'; } },
  ];

  function rollEvent(state, ctx) {
    if (!ME.chance(state, 0.45)) return null;
    const pool = EVENTS.filter((e) => !e.biomes || e.biomes.includes(ctx.dest.biome));
    const ev = ME.pickWeighted(state, pool, (e) => e.w);
    return ev.run(ctx);
  }

  /* ---------------- Découvertes ---------------- */
  X.rollFind = function (state, exp, ctx) {
    const dest = D.DESTINATIONS[exp.dest];
    const know = state.knowledge[exp.dest];
    const entry = ME.pickWeighted(state, dest.loot, ([type, w]) => {
      const sc = D.RARITY[D.TYPES[type].rarity].score;
      return w * (sc >= 3 ? 1 + know / 60 + ctx.sk('recherche') * 0.05 + ctx.rareBoost : 1);
    });
    const type = entry[0];
    const mat = D.MATERIALS[D.TYPES[type].mat];
    const condition = 72 - mat.fragility * 35 + ME.randInt(state, -20, 15) + ctx.sk('conservation') * 3 + (ctx.has('kit') ? 10 : 0);
    const documentation = 35 + ctx.sk('recherche') * 7 + (ctx.has('topo') ? 18 : 0) + ME.randInt(state, 0, 15);
    const mode = exp.mission === 'scientifique' ? 'scientifique' : exp.mission;
    const obj = Obj.create(state, type, {
      dest: exp.dest, mode, expId: exp.id, condition: ME.clamp(condition, 8, 96), documentation,
      location: 'terrain', revealed: false,
    });
    Obj.addHistory(state, obj, 'Mis au jour — ' + dest.site + ', ' + obj.context.layer + ', carré ' + obj.context.square + ', à ' + obj.context.depth + '. Expédition ' + exp.id + '.');
    exp.finds.push(obj.id);
    return obj;
  };

  /* ---------------- Déroulement hebdomadaire ---------------- */
  X.tick = function (state) {
    const arrivals = [];
    state.expeditions.forEach((exp) => {
      if (exp.phase === 'terrain') tickTerrain(state, exp);
      else if (exp.phase === 'transport') {
        exp.transportLeft--;
        if (exp.transportLeft <= 0) arrivals.push(...finish(state, exp));
        else exp.log.push({ w: state.week, text: 'Les caisses sont en route vers le musée.' });
      }
    });
    return arrivals;
  };

  function tickTerrain(state, exp) {
    const dest = D.DESTINATIONS[exp.dest];
    const team = exp.team.map((id) => X.staffById(state, id)).filter(Boolean);
    const ctx = {
      state, exp, dest, inst: D.INSTITUTIONS[dest.inst], permit: state.permits[dest.inst],
      sk: (k) => X.teamSkill(team, k), has: (k) => exp.equip.includes(k),
      progress: 1, bonusFinds: 0, rareBoost: 0,
    };
    const evText = rollEvent(state, ctx);
    if (evText) exp.log.push({ w: state.week, text: evText, event: true });

    const m = D.MISSIONS[exp.mission];
    const expected = (0.4 + ctx.sk('fouille') * 0.12 + (ctx.has('topo') ? 0.3 : 0) + state.knowledge[exp.dest] / 100 * 0.5) * m.findMult * ctx.progress;
    let n = Math.floor(expected) + (ME.chance(state, expected % 1) ? 1 : 0) + ctx.bonusFinds;
    const found = [];
    for (let i = 0; i < n; i++) found.push(X.rollFind(state, exp, ctx));
    if (found.length) {
      exp.log.push({ w: state.week, text: found.length === 1 ? 'Une découverte enregistrée au carnet : objet n° ' + found[0].id + '.' : found.length + ' découvertes enregistrées au carnet (' + found.map((o) => o.id).join(', ') + ').', finds: found.map((o) => o.id) });
    } else {
      exp.log.push({ w: state.week, text: 'Semaine de décapage patient, sans découverte notable.' });
    }
    exp.weekDone++;
    exp.progress = exp.weekDone / exp.weeks;
    if (exp.weekDone >= exp.weeks) closeField(state, exp, ctx);
  }

  function closeField(state, exp, ctx) {
    const dest = ctx.dest;
    const inst = ctx.inst;
    const m = D.MISSIONS[exp.mission];
    state.knowledge[exp.dest] = Math.min(100, state.knowledge[exp.dest] + m.knowledge);
    const docAvg = exp.finds.length ? exp.finds.reduce((a, id) => a + state.objects[id].documentation, 0) / exp.finds.length : 50;
    const partnerGain = m.partner + Math.round(docAvg / 25) + Math.round(ctx.sk('diplomatie'));
    ctx.permit.partnership = Math.min(100, ctx.permit.partnership + partnerGain);
    const sci = Math.round(exp.finds.reduce((a, id) => a + state.objects[id].sci, 0) / 12 * (m.science || 1));
    state.science += sci;
    // Partage des découvertes
    let keepIdx = 0;
    const sorted = exp.finds.map((id) => state.objects[id]).sort((a, b) => D.RARITY[b.rarity].score - D.RARITY[a.rarity].score);
    const toPartner = new Set();
    if (exp.mission === 'scientifique') sorted.forEach((o) => toPartner.add(o.id));
    else if (inst.share > 0) sorted.forEach((o) => { if (keepIdx++ % 2 === 0) toPartner.add(o.id); });

    exp.finds.forEach((id) => {
      const o = state.objects[id];
      if (toPartner.has(id)) {
        o.owner = 'partenaire';
        o.lender = dest.inst;
        Obj.move(state, o, 'depot', exp.mission === 'scientifique'
          ? 'Mission conjointe : objet conservé par ' + inst.name + ' (dépôt partenaire, prêt possible).'
          : 'Partage des découvertes : attribué à ' + inst.name + ' selon l\'accord de fouille.');
      } else {
        const crate = ctx.has('caisses') ? 0.3 : 1;
        const dmg = Math.round(ME.randInt(state, 0, 18) * D.MATERIALS[o.mat].fragility * crate * Math.max(0.3, 1 - ctx.sk('logistique') * 0.08));
        o.condition = Math.max(5, o.condition - dmg);
        Obj.move(state, o, 'transport', 'Emballé et expédié vers le musée' + (ctx.has('caisses') ? ' en caisse capitonnée' : '') + '.');
        if (dmg >= 2) Obj.addHistory(state, o, 'Choc pendant le transport : état −' + dmg + '.');
      }
    });
    exp.phase = 'transport';
    exp.transportLeft = dest.transport;
    exp.log.push({ w: state.week, text: 'Fin de campagne. ' + exp.finds.length + ' objet(s) inventorié(s). Partenariat ' + inst.short + ' +' + partnerGain + ', science +' + sci + '. Le camp est démonté.' });
    ME.log(state, 'Fin de campagne pour ' + exp.id + ' (' + dest.name + ') : ' + exp.finds.length + ' découverte(s). Retour des caisses dans ' + dest.transport + ' semaine(s).', 'success', { exp: exp.id });
  }

  function finish(state, exp) {
    const arrivals = [];
    exp.finds.forEach((id) => {
      const o = state.objects[id];
      if (o.location === 'transport') {
        Obj.move(state, o, 'reserve', 'Arrivé au musée. Enregistré à l\'inventaire sous le n° ' + o.id + ', rangé en réserve.');
        arrivals.push(id);
      }
    });
    exp.team.forEach((pid) => {
      const p = X.staffById(state, pid);
      if (p && p.assign && p.assign.id === exp.id) { p.assign = null; p.xp += exp.weeks; }
    });
    exp.phase = 'termine';
    exp.endWeek = state.week;
    exp.log.push({ w: state.week, text: 'Les caisses arrivent au musée. Place au déballage !' });
    state.pendingReveals.push(...exp.finds.filter((id) => !state.objects[id].revealed));
    ME.log(state, 'Les caisses de ' + exp.id + ' sont arrivées : ' + exp.finds.length + ' découverte(s) à déballer.', 'success', { exp: exp.id });
    return arrivals;
  }

  X.EVENTS = EVENTS;
})(typeof window !== 'undefined' ? window : globalThis);
