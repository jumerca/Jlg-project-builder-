/* Musée & Expéditions — tests du moteur (Node, sans dépendance).
 * Lancer : node tests/run-tests.js
 */
'use strict';
const loadEngine = require('./load-engine.js');
const ME = loadEngine();
const { State, Sim, Expeditions: X, Conservation: C, Exhibitions: E, Finances: F, Objects: Obj } = ME;

let passed = 0, failed = 0;
const results = [];
function test(name, fn) {
  try { fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; console.log('  ✘ ' + name + '\n      → ' + e.message); }
}
function assert(c, msg) { if (!c) throw new Error(msg || 'assertion échouée'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'valeurs différentes') + ' : ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }

/* Accorde une autorisation de façon déterministe (le hasard est testé ailleurs). */
function grant(s, inst) { s.permits[inst].status = 'granted'; s.permits[inst].validUntil = s.week + 30; }
function team(s, n) { return s.staff.filter((p) => !p.assign).slice(0, n || 3).map((p) => p.id); }
function runUntil(s, cond, max) { for (let i = 0; i < (max || 30) && !cond(); i++) Sim.advanceWeek(s); }
function revealAll(s) { s.pendingReveals.forEach((id) => { s.objects[id].revealed = true; }); s.pendingReveals = []; }

console.log('Musée & Expéditions — tests du moteur\n');

/* ------------------------------------------------------------------ */
console.log('1. Mission complète jusqu\'à l\'exposition');
test('demande d\'autorisation : dossier payé puis réponse après le délai', () => {
  const s = State.newGame(11);
  const m0 = s.money;
  assert(X.requestPermit(s, 'sap').ok);
  eq(s.permits.sap.status, 'pending');
  eq(s.money, m0 - ME.DATA.INSTITUTIONS.sap.permitCost);
  Sim.advanceWeek(s); Sim.advanceWeek(s);
  assert(['granted', 'refused'].includes(s.permits.sap.status), 'statut final ' + s.permits.sap.status);
});

test('fouille sans autorisation refusée, prospection autorisée', () => {
  const s = State.newGame(12);
  const errs = X.validatePlan(s, { dest: 'vezere', mission: 'fouille', weeks: 3, team: team(s), equip: ['outils'] });
  assert(errs.some((e) => e.indexOf('Autorisation') === 0), 'erreur d\'autorisation attendue');
  eq(X.validatePlan(s, { dest: 'vezere', mission: 'prospection', weeks: 2, team: team(s), equip: ['outils'] }).length, 0);
});

let fullGame, star;
test('terrain → transport → réserve → atelier → vitrine, avec visiteurs et recettes', () => {
  const s = State.newGame(2024);
  grant(s, 'sap');
  const r = X.launch(s, { dest: 'vezere', mission: 'fouille', weeks: 4, team: team(s), equip: ['outils', 'caisses', 'kit', 'topo'] });
  assert(r.ok, (r.errors || []).join(' '));
  const exp = r.exp;
  runUntil(s, () => exp.phase === 'termine', 10);
  eq(exp.phase, 'termine', 'l\'expédition doit être rentrée');
  assert(exp.finds.length >= 1, 'au moins une découverte');
  exp.finds.forEach((id) => {
    const o = s.objects[id];
    const locs = o.history.map((h) => h.loc);
    eq(locs[0], 'terrain', id + ' commence sur le terrain');
    assert(locs.includes('transport'), id + ' passe par le transport');
    eq(o.location, 'reserve', id + ' arrive en réserve');
    eq(o.acquisition.expId, exp.id);
    assert(o.context && o.context.square, 'contexte de fouille enregistré');
  });
  assert(s.pendingReveals.length === exp.finds.length, 'toutes les découvertes attendent le déballage');
  revealAll(s);
  // Restauration du plus abîmé, puis exposition
  const o = exp.finds.map((id) => s.objects[id]).sort((a, b) => a.condition - b.condition)[0];
  const resto = s.staff.find((p) => p.role === 'Restaurateur');
  const job = C.start(s, o.id, 'restauration', resto.id);
  assert(job.ok, job.error);
  eq(o.location, 'atelier');
  const before = o.condition;
  runUntil(s, () => o.location === 'reserve', 15);
  eq(o.location, 'reserve', 'retour en réserve après restauration');
  assert(o.condition > before, 'état amélioré');
  const pl = E.place(s, o.id, 'salle1', 2);
  assert(pl.ok, pl.error);
  eq(o.location, 'vitrine');
  eq(s.rooms.salle1.vitrines[2], o.id);
  const seq = o.history.map((h) => h.loc);
  ['terrain', 'transport', 'reserve', 'atelier', 'vitrine'].forEach((l) => assert(seq.includes(l), 'étape ' + l + ' absente du parcours'));
  const visitorsBefore = s.totalVisitors;
  Sim.advanceWeek(s);
  assert(s.totalVisitors > visitorsBefore, 'des visiteurs sont venus');
  assert(s.lastVisit.rooms.salle1 > 0, 'la salle 1 a été visitée');
  assert(s.objectives.exposer, 'objectif « exposer une découverte » atteint');
  fullGame = s; star = o.id;
});

/* ------------------------------------------------------------------ */
console.log('2. Conservation des identifiants');
test('identifiants uniques et stables sur tout le parcours', () => {
  const s = fullGame;
  const ids = Object.keys(s.objects);
  eq(new Set(ids).size, ids.length, 'doublon d\'identifiant');
  ids.forEach((id) => eq(s.objects[id].id, id, 'clé et identifiant concordent'));
  const o = s.objects[star];
  assert(o.history.some((h) => h.text.indexOf(star) >= 0), 'le numéro d\'inventaire figure dans l\'historique');
});
test('les identifiants survivent à la sauvegarde et au rechargement', () => {
  const s = fullGame;
  const copy = State.deserialize(State.serialize(s));
  eq(JSON.stringify(Object.keys(copy.objects)), JSON.stringify(Object.keys(s.objects)));
  eq(copy.rooms.salle1.vitrines[2], star);
  eq(copy.objects[star].history.length, s.objects[star].history.length);
});
test('un nouvel objet ne réutilise jamais un ancien numéro', () => {
  const s = State.newGame(5);
  const a = Obj.create(s, 'biface', { location: 'reserve' });
  const b = Obj.create(s, 'biface', { location: 'reserve' });
  assert(a.id !== b.id);
  const s2 = State.deserialize(State.serialize(s));
  const c = Obj.create(s2, 'biface', { location: 'reserve' });
  assert(![a.id, b.id].includes(c.id) && !Object.keys(s.objects).includes(c.id), 'compteur conservé après rechargement');
});
test('un déplacement incohérent est refusé', () => {
  const s = State.newGame(6);
  const o = Obj.create(s, 'lame', { location: 'terrain' });
  let threw = false;
  try { Obj.move(s, o, 'vitrine'); } catch (e) { threw = true; }
  assert(threw, 'terrain → vitrine doit être interdit');
});

/* ------------------------------------------------------------------ */
console.log('3. Capacités de l\'atelier');
test('deux postes : le troisième travail est refusé', () => {
  const s = State.newGame(7);
  const objs = [0, 1, 2].map(() => Obj.create(s, 'tesson', { location: 'reserve', condition: 30 }));
  const people = s.staff.filter((p) => p.skills.conservation >= 1 || p.skills.recherche >= 1);
  assert(C.start(s, objs[0].id, 'restauration', s.staff[1].id).ok);
  assert(C.start(s, objs[1].id, 'etude', s.staff[2].id).ok);
  const r = C.start(s, objs[2].id, 'etude', s.staff[0].id);
  assert(!r.ok && /postes/.test(r.error), 'refus attendu : ' + r.error);
  eq(s.jobs.length, 2);
  assert(people.length >= 3);
});
test('une personne ne peut tenir qu\'un poste, et pas pendant une expédition', () => {
  const s = State.newGame(8);
  s.benches = 4;
  const a = Obj.create(s, 'tesson', { location: 'reserve', condition: 30 });
  const b = Obj.create(s, 'tesson', { location: 'reserve', condition: 30 });
  const basile = s.staff[1];
  assert(C.start(s, a.id, 'restauration', basile.id).ok);
  assert(!C.start(s, b.id, 'restauration', basile.id).ok, 'même personne deux fois');
  grant(s, 'sap');
  const helene = s.staff[0];
  assert(X.launch(s, { dest: 'vezere', mission: 'fouille', weeks: 3, team: [helene.id, s.staff[3].id], equip: ['outils'] }).ok);
  assert(!C.start(s, b.id, 'etude', helene.id).ok, 'personne en expédition');
});
test('agrandir l\'atelier ajoute un poste, plafonné à 4', () => {
  const s = State.newGame(9);
  s.money = 100000;
  assert(F.buyUpgrade(s, 'bench').ok); eq(s.benches, 3);
  assert(F.buyUpgrade(s, 'bench').ok); eq(s.benches, 4);
  assert(!F.buyUpgrade(s, 'bench').ok); eq(s.benches, 4);
});
test('un objet doit être restauré avant d\'être exposé s\'il est trop fragile', () => {
  const s = State.newGame(10);
  const o = Obj.create(s, 'papyrus', { location: 'reserve', condition: 20 });
  assert(!E.place(s, o.id, 'salle2').ok);
});

/* ------------------------------------------------------------------ */
console.log('4. Prêts');
test('prêt entrant : partenariat requis, arrivée, exposition, retour automatique', () => {
  const s = State.newGame(13);
  s.permits.sap.partnership = 10;
  assert(!E.requestLoan(s, 'sap', 'propulseur').ok, 'partenariat insuffisant');
  s.permits.sap.partnership = 40;
  const m0 = s.money;
  const r = E.requestLoan(s, 'sap', 'propulseur');
  assert(r.ok, r.error);
  const o = r.obj;
  assert(o.id.indexOf('PRT-') === 0, 'numéro de prêt');
  eq(o.location, 'en-route');
  eq(s.money, m0 - 700);
  Sim.advanceWeek(s);
  eq(o.location, 'reserve');
  assert(E.place(s, o.id, 'salle1', 3).ok);
  const p0 = s.permits.sap.partnership;
  runUntil(s, () => o.location === 'rendu', 15);
  eq(o.location, 'rendu');
  eq(s.rooms.salle1.vitrines[3], null, 'la vitrine est libérée');
  eq(s.loansIn.length, 0);
  assert(s.permits.sap.partnership > p0, 'partenariat renforcé par un retour ponctuel');
  // ré-emprunt : même objet, même numéro
  const id = o.id;
  const r2 = E.requestLoan(s, 'sap', 'propulseur');
  assert(r2.ok);
  eq(r2.obj.id, id, 'le même objet garde son numéro');
});
test('prêt sortant : redevance, départ, retour en réserve', () => {
  const s = State.newGame(14);
  const o = Obj.create(s, 'torque', { location: 'reserve', condition: 80, studied: 60 });
  s.loanOffers.push({ id: 'D999', museum: 'Musée test', period: 'gaule', minRarity: 'peuCommun', weeks: 6, fee: 1500, rep: 2, expo: 'Test', expires: s.week + 5 });
  const m0 = s.money, r0 = s.reputation;
  assert(E.acceptLoanOut(s, 'D999', o.id).ok);
  eq(o.location, 'pret-sortant');
  eq(s.money, m0 + 1500);
  assert(s.reputation > r0);
  runUntil(s, () => o.location === 'reserve', 10);
  eq(o.location, 'reserve');
  assert(o.history.some((h) => h.text.indexOf('Retour du prêt') === 0));
});
test('partage des découvertes au Fayoum et prêt gratuit du dépôt', () => {
  const s = State.newGame(15);
  s.reputation = 20; s.money = 50000;
  grant(s, 'caf');
  const r = X.launch(s, { dest: 'fayoum', mission: 'fouille', weeks: 5, team: team(s, 4), equip: ['outils', 'camp', 'caisses'] });
  assert(r.ok, (r.errors || []).join(' '));
  runUntil(s, () => r.exp.phase === 'termine', 12);
  const finds = r.exp.finds.map((id) => s.objects[id]);
  assert(finds.length >= 2, 'assez de découvertes pour tester le partage (' + finds.length + ')');
  const deps = finds.filter((o) => o.location === 'depot');
  assert(deps.length >= 1 && deps.length < finds.length, 'partage : une partie reste chez le partenaire');
  deps.forEach((o) => eq(o.owner, 'partenaire'));
  s.permits.caf.partnership = 30;
  const d = deps[0];
  assert(E.requestDeposit(s, d.id).ok);
  Sim.advanceWeek(s);
  eq(d.location, 'reserve');
  eq(d.id, d.id);
});

/* ------------------------------------------------------------------ */
console.log('5. Billetterie et finances');
test('la billetterie applique le demi-tarif scolaire et alimente le grand livre', () => {
  const s = State.newGame(16);
  s.ticketPrice = 10;
  const visit = { counts: { famille: 100, scolaire: 50, passionne: 20, touriste: 30 }, total: 200, satisfaction: 70 };
  eq(F.ticketRevenue(s, visit), 100 * 10 + 50 * 5 + 20 * 10 + 30 * 10);
  Sim.advanceWeek(s);
  const lw = s.ledger[s.ledger.length - 1];
  const t = lw.entries.find((e) => e.cat === 'billetterie');
  assert(t, 'ligne de billetterie');
  eq(t.amount, F.ticketRevenue(s, s.lastVisit));
  eq(lw.balance, Math.round(s.money), 'solde reporté');
});
test('un billet plus cher attire moins de monde', () => {
  const s = State.newGame(17);
  s.ticketPrice = 4; const a = ME.Visitors.expectedVisitors(s);
  s.ticketPrice = 16; const b = ME.Visitors.expectedVisitors(s);
  assert(a > b, a + ' > ' + b);
});
test('les charges comprennent salaires, entretien, assurance et stockage externe', () => {
  const s = State.newGame(18);
  for (let i = 0; i < 20; i++) Obj.create(s, 'tesson', { location: 'reserve' });
  const c = F.charges(s);
  eq(c.salaries, s.staff.reduce((a, p) => a + p.salary, 0));
  assert(c.storage > 0 && c.over > 0, 'stockage externe facturé quand les réserves débordent');
  assert(c.insurance > 0, 'les objets exposés sont assurés');
});
test('une acquisition au dossier douteux finit restituée', () => {
  const s = State.newGame(19);
  s.money = 50000;
  s.market.push({ id: 'L900', type: 'scarabee', seller: 'X', price: 300, condition: 70, dossier: 'lacunaire', verified: false, illicit: true, expires: s.week + 6 });
  const r = E.buyLot(s, 'L900');
  assert(r.ok);
  const rep0 = s.reputation;
  runUntil(s, () => r.obj.location === 'restitue', 12);
  eq(r.obj.location, 'restitue');
  assert(s.reputation < rep0 + 3, 'réputation entamée');
});
test('exposition temporaire : inauguration, fin et critique', () => {
  const s = State.newGame(20);
  s.money = 60000;
  assert(F.buyUpgrade(s, 'temp').ok);
  E.setTheme(s, 'temp', 'gaule');
  ['torque', 'statere', 'fibule'].forEach((t, i) => { const o = Obj.create(s, t, { location: 'reserve', condition: 80, studied: 80 }); assert(E.place(s, o.id, 'temp', i).ok); });
  assert(E.startTemp(s, 'Les Arvernes').ok);
  runUntil(s, () => !s.tempExpo, 12);
  eq(s.tempHistory.length, 1);
  assert(s.tempHistory[0].visitors > 0 && s.tempHistory[0].stars >= 1);
});

/* ------------------------------------------------------------------ */
console.log('6. Reprise de sauvegarde');
test('reprise au milieu d\'une expédition et d\'une restauration : même avenir', () => {
  const s = State.newGame(321);
  grant(s, 'cra');
  assert(X.launch(s, { dest: 'puy', mission: 'fouille', weeks: 4, team: [s.staff[0].id, s.staff[3].id], equip: ['outils'] }).ok);
  const o = Object.values(s.objects).find((x) => x.type === 'carreau');
  assert(C.start(s, o.id, 'restauration', s.staff[1].id).ok);
  Sim.advanceWeek(s); Sim.advanceWeek(s);
  const saved = State.serialize(s);
  const resumed = State.deserialize(saved);
  for (let i = 0; i < 8; i++) { Sim.advanceWeek(s); Sim.advanceWeek(resumed); }
  eq(State.serialize(resumed), State.serialize(s), 'la partie reprise diverge');
});
test('code d\'export MEX1 : aller-retour fidèle (accents compris)', () => {
  const s = fullGame;
  s.museumName = 'Musée Élise-Aubertin';
  const back = State.importText(State.exportCode(s));
  eq(back.museumName, 'Musée Élise-Aubertin');
  eq(State.serialize(back), State.serialize(s));
});
test('une ancienne sauvegarde incomplète est complétée', () => {
  const s = State.newGame(30);
  const old = JSON.parse(State.serialize(s));
  delete old.tempHistory; delete old.market; delete old.rooms.temp; delete old.permits.eco;
  const m = State.deserialize(JSON.stringify(old));
  assert(Array.isArray(m.tempHistory) && Array.isArray(m.market) && m.rooms.temp && m.permits.eco);
  Sim.advanceWeek(m);
});
test('un fichier étranger est refusé proprement', () => {
  let msg = '';
  try { State.importText('{"hello":1}'); } catch (e) { msg = e.message; }
  assert(/sauvegarde/.test(msg), msg);
});

/* ------------------------------------------------------------------ */
console.log('7. Endurance');
test('100 semaines automatiques sans incohérence', () => {
  const s = State.newGame(77);
  s.money = 40000;
  for (let w = 0; w < 100; w++) {
    ['sap', 'cra', 'fsv'].forEach((i) => { if (['none', 'refused', 'expired'].includes(s.permits[i].status)) X.requestPermit(s, i); });
    if (!s.expeditions.some((e) => e.phase !== 'termine')) {
      for (const d of ['vezere', 'puy', 'abbaye']) { if (X.permitValid(s, d) && X.launch(s, { dest: d, mission: 'fouille', weeks: 4, team: team(s, 3), equip: ['outils', 'caisses'] }).ok) break; }
    }
    revealAll(s);
    Obj.all(s, (o) => o.location === 'reserve').forEach((o) => { for (const r of E.expoRooms(s)) if (s.rooms[r].vitrines.includes(null) && !E.canDisplay(s, o, r)) { E.place(s, o.id, r); break; } });
    Sim.advanceWeek(s);
  }
  // chaque vitrine pointe vers un objet exposé et inversement
  Object.keys(s.rooms).forEach((r) => s.rooms[r].vitrines.forEach((id, i) => { if (id) { eq(s.objects[id].location, 'vitrine'); eq(s.objects[id].roomId, r); eq(s.objects[id].slot, i); } }));
  Obj.all(s, (o) => o.location === 'vitrine').forEach((o) => eq(s.rooms[o.roomId].vitrines[o.slot], o.id));
  assert(s.jobs.length <= s.benches);
  assert(isFinite(s.money) && s.week === 101);
});

console.log('\n' + passed + ' réussi(s), ' + failed + ' échec(s).');
process.exit(failed ? 1 : 0);
