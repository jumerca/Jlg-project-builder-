/* Musée & Expéditions — finances.js
 * Billetterie, boutique, dons, subventions, charges, investissements et personnel.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const Obj = ME.Objects;
  const F = (ME.Finances = {});

  F.CATS = {
    billetterie: 'Billetterie', boutique: 'Boutique', dons: 'Dons', subventions: 'Subventions', prets: 'Prêts',
    salaires: 'Salaires', entretien: 'Entretien', assurance: 'Assurance', stockage: 'Stockage',
    expeditions: 'Expéditions', expositions: 'Expositions', acquisitions: 'Acquisitions', investissements: 'Investissements', divers: 'Divers',
  };

  /** Billetterie : chaque public paie selon son tarif (scolaires à demi-tarif). */
  F.ticketRevenue = function (state, visit) {
    let r = 0;
    for (const t in visit.counts) r += visit.counts[t] * state.ticketPrice * D.VISITOR_TYPES[t].priceMult;
    return Math.round(r);
  };

  F.shopRevenue = function (state, visit) {
    let r = 0;
    for (const t in visit.counts) r += visit.counts[t] * (0.8 + state.shopLevel * 0.9) * D.VISITOR_TYPES[t].shop;
    return Math.round(r * ME.clamp(visit.satisfaction / 70, 0.4, 1.4));
  };

  F.donations = function (state, visit) {
    let d = Math.round(visit.total * 0.12 * visit.satisfaction / 100);
    let mecene = 0;
    if (state.reputation >= 20 && visit.satisfaction >= 65 && ME.chance(state, 0.08)) mecene = ME.randInt(state, 5, 20) * 100;
    return { d, mecene };
  };

  F.openRooms = (state) => Object.keys(state.rooms).filter((k) => state.rooms[k].unlocked).length;

  F.charges = function (state) {
    const salaries = state.staff.reduce((a, p) => a + p.salary, 0);
    const upkeep = 120 + F.openRooms(state) * 40;
    const exhibited = Obj.all(state, (o) => o.location === 'vitrine');
    const insurance = Math.round(exhibited.reduce((a, o) => a + Obj.value(o), 0) * 0.002);
    const over = Math.max(0, Obj.reserveCount(state) - state.reserveCap);
    const storage = over * 30;
    return { salaries, upkeep, insurance, storage, over };
  };

  F.week = function (state, visit) {
    const ticket = F.ticketRevenue(state, visit);
    const shop = F.shopRevenue(state, visit);
    const don = F.donations(state, visit);
    ME.money(state, ticket, 'Billetterie (' + ME.fmtInt(visit.total) + ' visiteurs)', 'billetterie');
    ME.money(state, shop, 'Boutique', 'boutique');
    if (don.d) ME.money(state, don.d, 'Dons des visiteurs', 'dons');
    if (don.mecene) { ME.money(state, don.mecene, 'Don d\'un mécène enthousiaste', 'dons'); ME.log(state, 'Un mécène, conquis par sa visite, fait un don de ' + ME.fmtMoney(don.mecene) + ' !', 'success'); }
    F.tickGrants(state);
    const c = F.charges(state);
    ME.money(state, -c.salaries, 'Salaires de l\'équipe', 'salaires');
    ME.money(state, -c.upkeep, 'Entretien du bâtiment', 'entretien');
    if (c.insurance) ME.money(state, -c.insurance, 'Assurance des objets exposés', 'assurance');
    if (c.storage) ME.money(state, -c.storage, 'Stockage externe (' + c.over + ' objets hors réserves)', 'stockage');
    const entries = state.ledgerCurrent;
    const totals = {};
    entries.forEach((e) => { totals[e.cat] = (totals[e.cat] || 0) + e.amount; });
    const income = entries.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0);
    const spend = entries.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0);
    const rec = { week: state.week, entries, totals, income, spend, net: income + spend, balance: Math.round(state.money) };
    state.ledger.push(rec);
    if (state.ledger.length > 52) state.ledger.shift();
    state.ledgerCurrent = [];
    return rec;
  };

  /* ---------------- Subventions ---------------- */
  F.grantStatus = function (state, key) {
    const g = state.grants[key];
    if (!g) return { status: 'none' };
    return g;
  };

  F.canApply = function (state, key) {
    const def = D.GRANTS[key];
    const g = state.grants[key];
    if (g && (g.status === 'pending' || g.status === 'active')) return 'Dossier déjà en cours.';
    if (g && g.cooldownUntil > state.week) return 'Nouvelle demande possible à partir de la semaine ' + g.cooldownUntil + '.';
    if (!def.check(state, ME)) return 'Conditions non remplies : ' + def.req + '.';
    return null;
  };

  F.applyGrant = function (state, key) {
    const err = F.canApply(state, key);
    if (err) return { ok: false, error: err };
    const def = D.GRANTS[key];
    state.grants[key] = { status: 'pending', reviewLeft: def.review, weeksLeft: def.weeks, cooldownUntil: 0 };
    ME.log(state, 'Dossier de subvention déposé : ' + def.label + '.', 'info');
    return { ok: true };
  };

  F.tickGrants = function (state) {
    for (const key in state.grants) {
      const g = state.grants[key];
      const def = D.GRANTS[key];
      if (g.status === 'pending') {
        g.reviewLeft--;
        if (g.reviewLeft <= 0) {
          if (def.weeks === 0) {
            ME.money(state, def.amount, 'Subvention : ' + def.label, 'subventions');
            g.status = 'done';
            g.cooldownUntil = state.week + def.cooldown;
            ME.log(state, 'Subvention accordée : ' + def.label + ' (' + ME.fmtMoney(def.amount) + ').', 'success');
          } else {
            g.status = 'active';
            ME.log(state, 'Subvention accordée : ' + def.label + ' (' + ME.fmtMoney(def.amount) + ' par semaine pendant ' + def.weeks + ' semaines).', 'success');
          }
        }
      } else if (g.status === 'active') {
        ME.money(state, def.amount, 'Subvention : ' + def.label, 'subventions');
        g.weeksLeft--;
        if (g.weeksLeft <= 0) { g.status = 'done'; g.cooldownUntil = state.week + def.cooldown; }
      }
    }
  };

  /* ---------------- Investissements ---------------- */
  F.upgradeState = function (state, key) {
    const u = D.UPGRADES[key];
    if (key === 'salle3' || key === 'temp') return { done: state.rooms[key].unlocked, cost: u.cost };
    if (key === 'bench') return { done: state.benches >= u.max, cost: u.cost + (state.benches - 2) * 1500, level: state.benches };
    if (key === 'shop') return { done: state.shopLevel >= u.max, cost: u.cost * state.shopLevel, level: state.shopLevel };
    if (key === 'reserve') return { done: false, cost: u.cost + Math.max(0, (state.reserveCap - 14) / 10) * 1000, level: state.reserveCap };
    return { done: true, cost: 0 };
  };

  F.buyUpgrade = function (state, key) {
    const st = F.upgradeState(state, key);
    if (st.done) return { ok: false, error: 'Déjà au maximum.' };
    if (state.money < st.cost) return { ok: false, error: 'Fonds insuffisants (' + ME.fmtMoney(st.cost) + ').' };
    ME.money(state, -st.cost, D.UPGRADES[key].label, 'investissements');
    if (key === 'salle3' || key === 'temp') { state.rooms[key].unlocked = true; ME.Exhibitions.normalizeRoute(state); }
    if (key === 'bench') state.benches++;
    if (key === 'shop') state.shopLevel++;
    if (key === 'reserve') state.reserveCap += 10;
    ME.log(state, 'Travaux terminés : ' + D.UPGRADES[key].label + '.', 'success');
    return { ok: true };
  };

  /* ---------------- Personnel ---------------- */
  F.hire = function (state, idx) {
    const c = state.candidates[idx];
    if (!c) return { ok: false, error: 'Candidat introuvable.' };
    if (state.staff.length >= 9) return { ok: false, error: 'Équipe complète (9 personnes maximum).' };
    const fee = c.salary * 4;
    if (state.money < fee) return { ok: false, error: 'Fonds insuffisants (frais d\'embauche ' + ME.fmtMoney(fee) + ').' };
    ME.money(state, -fee, 'Recrutement — ' + c.name, 'salaires');
    state.staff.push(ME.State.makeStaff(state, c));
    state.candidates.splice(idx, 1);
    state.hiredNames = (state.hiredNames || []).concat(c.name);
    ME.log(state, c.name + ' (' + c.role.toLowerCase() + ') rejoint l\'équipe.', 'success');
    return { ok: true };
  };

  F.fire = function (state, staffId) {
    const p = state.staff.find((s) => s.id === staffId);
    if (!p) return { ok: false };
    if (p.assign && p.assign.kind !== 'accueil') return { ok: false, error: p.name + ' est en mission ou à l\'atelier.' };
    if (state.staff.length <= 2) return { ok: false, error: 'Le musée a besoin d\'au moins deux personnes.' };
    state.staff = state.staff.filter((s) => s !== p);
    ME.money(state, -p.salary * 2, 'Indemnité de départ — ' + p.name, 'salaires');
    ME.log(state, p.name + ' quitte le musée.', 'info');
    return { ok: true };
  };

  F.toggleAccueil = function (state, staffId) {
    const p = state.staff.find((s) => s.id === staffId);
    if (!p) return { ok: false };
    if (p.assign && p.assign.kind === 'accueil') { p.assign = null; return { ok: true }; }
    if (p.assign) return { ok: false, error: p.name + ' est occupé(e).' };
    p.assign = { kind: 'accueil' };
    return { ok: true };
  };

  F.refreshCandidates = function (state) {
    const hired = new Set((state.hiredNames || []).concat(state.staff.map((s) => s.name)));
    const pool = D.CANDIDATES.filter((c) => !hired.has(c.name));
    const out = [];
    while (pool.length && out.length < 3) out.push(ME.deepClone(pool.splice(ME.randInt(state, 0, pool.length - 1), 1)[0]));
    state.candidates = out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
