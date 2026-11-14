/* Musée & Expéditions — sim.js
 * Orchestration d'une semaine de jeu et objectifs de progression.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const Sim = (ME.Sim = {});

  const fromField = (o) => ['fouille', 'prospection', 'scientifique'].includes(o.acquisition.mode);
  const hasHist = (o, s) => o.history.some((h) => h.text.indexOf(s) === 0);

  Sim.OBJECTIVES = [
    { key: 'permis', label: 'Obtenir une autorisation de fouille', hint: 'Carte → choisissez un site → « Demander l\'autorisation ».', reward: 500,
      check: (s) => Object.values(s.permits).some((p) => p.status === 'granted') },
    { key: 'expe', label: 'Lancer une première expédition', hint: 'Carte → site autorisé → « Préparer une mission ».', reward: 500,
      check: (s) => s.expeditions.length > 0 },
    { key: 'deballer', label: 'Déballer une découverte au musée', hint: 'Attendez le retour des caisses, puis dégagez l\'objet au pinceau.', reward: 800,
      check: (s) => Object.values(s.objects).some((o) => fromField(o) && o.revealed && ['reserve', 'atelier', 'vitrine'].includes(o.location)) },
    { key: 'restaurer', label: 'Restaurer un objet à l\'atelier', hint: 'Atelier → choisissez un objet abîmé et un restaurateur.', reward: 800,
      check: (s) => Object.values(s.objects).some((o) => hasHist(o, 'Restauration terminée')) },
    { key: 'exposer', label: 'Exposer l\'une de vos découvertes', hint: 'Musée → touchez une salle → placez l\'objet dans une vitrine.', reward: 1000,
      check: (s) => Object.values(s.objects).some((o) => fromField(o) && o.location === 'vitrine') },
    { key: 'etudier', label: 'Étudier une découverte à 100 %', hint: 'Atelier → « Étude scientifique » avec une historienne.', reward: 600,
      check: (s) => Object.values(s.objects).some((o) => fromField(o) && o.studied >= 100) },
    { key: 'theme', label: 'Créer une salle thématique cohérente', hint: 'Choisissez un thème de salle et exposez 3 objets de cette période.', reward: 800,
      check: (s) => Object.keys(s.rooms).some((r) => s.rooms[r].theme && s.rooms[r].vitrines.filter(Boolean).filter((id) => s.objects[id].period === s.rooms[r].theme).length >= 3) },
    { key: 'visiteurs', label: 'Accueillir 3 000 visiteurs au total', hint: 'Un musée attrayant et un prix juste attirent du monde.', reward: 1500,
      check: (s) => s.totalVisitors >= 3000 },
    { key: 'pret', label: 'Exposer un objet prêté par un partenaire', hint: 'Expositions → Prêts : le partenariat ouvre le catalogue.', reward: 600,
      check: (s) => Object.values(s.objects).some((o) => o.owner !== 'musee' && o.location === 'vitrine') },
    { key: 'temporaire', label: 'Inaugurer une exposition temporaire', hint: 'Ouvrez la salle temporaire (Finances → Travaux), puis Expositions.', reward: 2000,
      check: (s) => !!s.tempExpo || s.tempHistory.length > 0 },
    { key: 'fayoum', label: 'Mener une campagne au Fayoum', hint: 'Il faut une réputation de 15 et un camp complet.', reward: 1500,
      check: (s) => s.expeditions.some((e) => e.dest === 'fayoum') },
  ];

  Sim.checkObjectives = function (state) {
    const done = [];
    Sim.OBJECTIVES.forEach((o) => {
      if (!state.objectives[o.key] && o.check(state)) {
        state.objectives[o.key] = state.week;
        ME.money(state, o.reward, 'Objectif atteint : ' + o.label, 'divers');
        state.reputation += 1;
        ME.log(state, 'Objectif atteint : « ' + o.label + ' » (+' + ME.fmtMoney(o.reward) + ', réputation +1).', 'success');
        done.push(o);
      }
    });
    return done;
  };

  /** Avance d'une semaine. Renvoie un rapport synthétique. */
  Sim.advanceWeek = function (state) {
    const report = { week: state.week };
    ME.Expeditions.tickPermits(state);
    report.arrivals = ME.Expeditions.tick(state);
    report.jobsDone = ME.Conservation.tick(state).map((j) => j.objId);
    ME.Exhibitions.tickLoans(state);
    ME.Exhibitions.tickMarket(state);
    const visit = ME.Visitors.simulate(state);
    state.lastVisit = visit;
    state.totalVisitors += visit.total;
    state.visitHistory.push({ week: state.week, total: visit.total, sat: visit.satisfaction });
    if (state.visitHistory.length > 52) state.visitHistory.shift();
    report.visit = visit;
    report.finance = ME.Finances.week(state, visit);
    ME.Conservation.wear(state);
    report.tempEnded = ME.Exhibitions.tickTemp(state);
    // La réputation évolue lentement avec la satisfaction.
    state.reputation = ME.clamp(state.reputation + (visit.satisfaction - 50) / 60, 0, 100);
    if (state.week % 8 === 0) ME.Finances.refreshCandidates(state);
    if (state.money < 0 && state.week % 2 === 0) ME.log(state, 'Trésorerie négative ! Baissez les charges, augmentez la billetterie ou demandez une subvention.', 'danger');
    state.week++;
    report.objectives = Sim.checkObjectives(state);
    return report;
  };

  Sim.advance = function (state, n) {
    let r;
    for (let i = 0; i < n; i++) r = Sim.advanceWeek(state);
    return r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
