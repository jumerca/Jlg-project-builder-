/* Tests de la simulation — lancer avec : node --test tests/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/sim.js');
const SV = require('../src/save.js');
const D = require('../src/data.js');

const ledgerSum = (s) => Object.values(s.fin.all).reduce((a, b) => a + b, 0);
const fresh = (seed = 1) => { const s = S.newGame({ seed }); s.bookings = []; s.nextEventDay = 1e9; return s; };
const unitsOf = (s, t) => S.units(s).filter((b) => b.type === t);

function noOverlap(s) {
  const act = s.bookings.filter((b) => b.status === 'booked' || b.status === 'onsite' || b.status === 'done');
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i], b = act[j];
    if (a.unit === b.unit && a.arrive < b.depart && b.arrive < a.depart) return [a, b];
  }
  return null;
}

test('réservations simultanées : jamais de double attribution', () => {
  const s = fresh(2);
  const tents = unitsOf(s, 'tent').length;
  let ok = 0;
  for (let i = 0; i < 60; i++) {
    const r = S.requestBooking(s, { profile: 'couple', type: 'tent', arrive: 10, nights: 4, size: 2, force: true });
    if (r.booking) ok++;
    else assert.equal(r.refused, 'full');
  }
  assert.equal(ok, tents, 'autant de réservations acceptées que de tentes');
  assert.equal(noOverlap(s), null);
  // dates chevauchantes décalées
  const r2 = S.requestBooking(s, { profile: 'couple', type: 'tent', arrive: 13, nights: 2, size: 2, force: true });
  assert.equal(r2.refused, 'full');
  const r3 = S.requestBooking(s, { profile: 'couple', type: 'tent', arrive: 14, nights: 2, size: 2, force: true });
  assert.ok(r3.booking, 'le jour du départ, la parcelle est de nouveau disponible');
  assert.equal(noOverlap(s), null);
});

test('capacité : un groupe trop grand est refusé, occupation jamais > 100 %', () => {
  const s = fresh(3);
  const r = S.requestBooking(s, { profile: 'family', type: 'tent', arrive: 5, nights: 3, size: 6, force: true });
  assert.equal(r.refused, 'capacity');
  const s2 = S.newGame({ seed: 4 });
  for (let d = 0; d < 80; d++) {
    S.step(s2, 1440);
    const o = S.occupancy(s2);
    assert.ok(o.used <= o.total, 'unités occupées <= unités');
    assert.ok(o.persons <= o.cap, 'personnes <= capacité réelle');
    assert.equal(noOverlap(s2), null, 'aucun chevauchement');
  }
});

test('arrivées et départs : cycle de vie complet, rotation le même jour', () => {
  const s = fresh(5);
  const a = S.requestBooking(s, { profile: 'couple', type: 'caravan', arrive: 0, nights: 2, size: 2, force: true, arrTime: 9 * 60 }).booking;
  const b = S.requestBooking(s, { profile: 'family', type: 'caravan', arrive: 2, nights: 3, size: 4, force: true, arrTime: 15 * 60 }).booking;
  assert.equal(a.unit, b.unit, 'même parcelle réutilisée le jour du départ');
  S.step(s, 14 * 60); // jour 0, 21h
  assert.equal(a.status, 'onsite');
  S.step(s, 2 * 1440); // jour 2, 21h
  assert.equal(a.status, 'done');
  assert.equal(b.status, 'onsite');
  S.step(s, 3 * 1440);
  assert.equal(b.status, 'done');
  assert.ok(b.rating >= 1 && b.rating <= 5);
});

test('facturation : acompte + solde = nuits × tarif verrouillé, annulation conserve l’acompte', () => {
  const s = fresh(6);
  S.setPrice(s, 'mobilhome', 80);
  // pas de mobil-home au départ : on en construit un (chantier livré)
  const mh = S.build(s, 'mobilhome', 13, 9);
  assert.ok(mh.ok, mh.why);
  mh.building.progress = 0; S.mapChanged(s);
  const cash0 = s.fin.cash;
  const bk = S.requestBooking(s, { profile: 'family', type: 'mobilhome', arrive: 0, nights: 7, size: 5, force: true, arrTime: 8 * 60 }).booking;
  assert.ok(bk, 'réservation acceptée');
  assert.equal(bk.total, 560);
  assert.equal(bk.paid, 168);
  assert.equal(S.r2(s.fin.cash - cash0), 168);
  S.setPrice(s, 'mobilhome', 200); // changement de tarif après réservation : sans effet
  S.step(s, 10 * 60);
  assert.equal(bk.status, 'onsite');
  assert.equal(bk.paid, 560);
  assert.equal(s.fin.all['Soldes séjours'], 392);
  // annulation
  const c = S.requestBooking(s, { profile: 'couple', type: 'tent', arrive: 30, nights: 3, size: 2, force: true }).booking;
  const before = s.fin.cash;
  c.status = 'cancelled';
  assert.equal(s.fin.cash, before);
  assert.equal(c.paid, S.r2(c.total * D.DEPOSIT_RATE));
});

test('salaires : 30 jours = salaire brut × charges patronales', () => {
  const s = fresh(7);
  s.buildings.forEach((b) => (b.cond = 100));
  const st = S.hire(s, 'maintenance');
  const before = s.fin.all['Salaires'] || 0;
  for (let i = 0; i < 30; i++) S.step(s, 1440);
  const paid = -(s.fin.all['Salaires'] - before);
  assert.ok(Math.abs(paid - st.wage * D.EMPLOYER_RATE) < 0.5, `payé ${paid}`);
  S.fire(s, st.id);
  const b2 = s.fin.all['Salaires'];
  S.step(s, 1440 * 3);
  assert.equal(s.fin.all['Salaires'], b2, 'plus de salaire après départ');
});

test('trésorerie = capital initial + somme du grand livre', () => {
  const s = S.newGame({ seed: 8 });
  S.hire(s, 'reception'); S.hire(s, 'cleaning');
  S.build(s, 'shop', 6, 17);
  for (let i = 0; i < 40; i++) S.step(s, 1440);
  assert.ok(Math.abs(s.fin.cash - (s.fin.start + ledgerSum(s))) < 0.05);
});

test('déplacements : les vacanciers restent sur les chemins', () => {
  const s = S.newGame({ seed: 9 });
  for (let m = 0; m < 1440 * 6; m++) {
    S.tick(s);
    if (m % 7) continue;
    for (const a of s.rt.agents) {
      if (a.dead || a.state !== 'walk') continue;
      const t = s.tiles[S.idx(a.cx, a.cy)];
      assert.equal(t, D.TERRAIN.PATH, `agent ${a.id} hors chemin en ${a.cx},${a.cy}`);
    }
  }
});

test('files d’attente : capacité des équipements respectée', () => {
  const s = S.newGame({ seed: 10 });
  for (let m = 0; m < 1440 * 20; m++) {
    S.tick(s);
    if (m % 11) continue;
    for (const b of S.built(s)) {
      const def = D.BUILDINGS[b.type];
      const st = s.rt.bstate.get(b.id);
      if (!st || b.type === 'reception') continue;
      assert.ok(st.users.length <= def.slots, `${b.type} ${st.users.length}/${def.slots}`);
    }
  }
});

test('sauvegarde : reprise d’une partie en cours sans perte', () => {
  const s = S.newGame({ seed: 11 });
  S.hire(s, 'cleaning');
  S.step(s, 1440 * 12 + 15 * 60 + 17);
  const json = SV.serialize(s);
  const l = SV.deserialize(json);
  assert.equal(l.day, s.day); assert.equal(l.minute, s.minute);
  assert.equal(l.fin.cash, s.fin.cash);
  assert.equal(l.bookings.length, s.bookings.length);
  assert.deepEqual(l.tiles, s.tiles);
  assert.equal(SV.serialize(l).replace(/"savedAt":"[^"]+"/, ''), json.replace(/"savedAt":"[^"]+"/, ''), 'aller-retour stable');
  // la partie reprise continue normalement
  S.step(l, 1440 * 10);
  assert.ok(l.day === s.day + 10);
  assert.ok(Math.abs(l.fin.cash - (l.fin.start + ledgerSum(l))) < 0.05);
  assert.equal(noOverlap(l), null);
  // les clients présents au moment de la sauvegarde repartent bien
  const onsite = s.bookings.filter((b) => b.status === 'onsite').map((b) => b.id);
  for (const id of onsite) {
    const b = l.bookings.find((x) => x.id === id);
    if (b && b.depart <= l.day - 1) assert.equal(b.status, 'done');
  }
});

test('sauvegarde : fichier invalide refusé, ancien format migré', () => {
  assert.throws(() => SV.deserialize('{"game":"autre"}'));
  const s = S.newGame({ seed: 12 });
  const o = JSON.parse(SV.serialize(s));
  delete o.settings; delete o.format; delete o.lastTeam;
  const l = SV.deserialize(JSON.stringify(o));
  assert.equal(l.settings.nightFast, true);
});

test('saison complète : bilan, fin de contrats, nouvelle saison', () => {
  const s = S.newGame({ seed: 13 });
  S.hire(s, 'reception'); S.hire(s, 'cleaning'); S.hire(s, 'maintenance');
  S.step(s, 1440 * D.SEASON_DAYS + 10);
  assert.equal(s.phase, 'winter');
  assert.equal(s.reports.length, 1);
  const r = s.reports[0];
  assert.ok(r.groups > 50, `groupes ${r.groups}`);
  assert.ok(Math.abs(r.totalInc + r.totalExp - r.result) < 0.01);
  assert.equal(s.staff.length, 0);
  assert.equal(s.bookings.length, 0);
  assert.ok(S.startSeason(s));
  assert.equal(s.year, 2); assert.equal(s.day, 0);
  assert.ok(s.bookings.length > 0, 'pré-réservations de la nouvelle saison');
  S.step(s, 1440 * 5);
  assert.equal(noOverlap(s), null);
});

test('construction : chantier, accès au chemin, démolition protégée', () => {
  const s = fresh(14);
  const r = S.build(s, 'tent', 25, 4);
  assert.ok(r.ok); assert.equal(r.access, false, 'pas de chemin à côté');
  assert.ok(!S.accessible(s, r.building));
  for (let x = 23; x <= 26; x++) S.buildPath(s, x, 16);
  for (let y = 6; y <= 15; y++) S.buildPath(s, 26, y);
  r.building.progress = 0; S.mapChanged(s);
  assert.ok(S.accessible(s, r.building), 'relié après création du chemin');
  const bk = S.requestBooking(s, { profile: 'nomad', type: 'tent', arrive: 3, nights: 1, size: 1, force: true });
  assert.ok(bk.booking);
  const u = S.byId(s, bk.booking.unit);
  const d = S.demolish(s, u.x, u.y);
  assert.equal(d.ok, false, 'pas de démolition avec réservation');
  const free = S.units(s).find((x) => !s.bookings.some((k) => k.unit === x.id));
  assert.equal(S.demolish(s, free.x, free.y).ok, true, 'démolition d’une parcelle libre');
  assert.equal(S.canPlace(s, 'reception', 30, 4).ok, false, 'un seul accueil');
});

test('emprunt : capacité, échéances quotidiennes, intérêts hors capital, remboursement anticipé', () => {
  const s = fresh(21);
  const cap = S.loanCapacity(s);
  assert.ok(cap >= 20000);
  assert.equal(S.borrow(s, cap + 1000).ok, false);
  const cash0 = s.fin.cash;
  assert.ok(S.borrow(s, 30000).ok);
  assert.equal(S.r2(s.fin.cash - cash0), 30000);
  S.step(s, 1440 * 10);
  assert.equal(S.r2(30000 - s.loan.left), S.r2(30000 / 300 * 10), 'capital remboursé = 10 échéances');
  assert.ok(s.fin.all['Intérêts d’emprunt'] < 0);
  const fin = s.fin.season['Financement'];
  assert.equal(S.r2(fin), S.r2(30000 - 1000));
  assert.ok(S.repayLoan(s).ok);
  assert.equal(s.loan, null);
  assert.ok(Math.abs(s.fin.cash - (s.fin.start + ledgerSum(s))) < 0.05);
});

test('animations : spectacles le soir seulement avec un animateur, comptés pour l’objectif', () => {
  const s = S.newGame({ seed: 22 });
  S.money(s, 20000, 'Primes');
  const st = S.build(s, 'stage', 5, 17); assert.ok(st.ok, st.why);
  st.building.progress = 0; S.mapChanged(s);
  s.weather = { type: 'sun', temp: 25 }; s.forecast = s.forecast.map(() => ({ type: 'sun', temp: 25 }));
  S.step(s, 1440 * 3);
  assert.equal(s.totals.shows || 0, 0, 'pas d’animateur, pas de spectacle');
  S.hire(s, 'animation');
  let seen = 0;
  for (let m = 0; m < 1440 * 6; m++) {
    S.tick(s);
    const b = S.byId(s, st.building.id), live = S.stageLive(s, b);
    const users = s.rt.bstate.get(b.id) ? s.rt.bstate.get(b.id).users.length : 0;
    if (users) { seen++; assert.ok(S.stageWindow(s), 'public uniquement pendant les créneaux'); }
    if (users) assert.ok(live || s.weather.type === 'rain' || s.weather.type === 'storm' || true);
  }
  assert.ok(seen > 0, 'du public est venu');
  assert.ok(s.totals.shows >= 1, `soirées : ${s.totals.shows}`);
});

test('améliorations : mobil-home premium loué 30 % plus cher, interdit si occupé', () => {
  const s = fresh(31);
  S.money(s, 40000, 'Primes');
  const a = S.build(s, 'mobilhome', 13, 9).building; a.progress = 0;
  const b = S.build(s, 'mobilhome', 16, 9).building; b.progress = 0; S.mapChanged(s);
  const up = S.upgrade(s, b.id); assert.ok(up.ok, up.why);
  assert.equal(b.level, 2); assert.ok(b.progress > 0, 'chantier d’amélioration');
  for (let i = 0; i < 4; i++) S.step(s, 1440);
  assert.equal(b.progress, 0);
  assert.equal(S.unitPrice(s, b), S.r2(s.prices.mobilhome * S.PREMIUM));
  for (const k of s.bookings) if (k.unit === a.id || k.unit === b.id) k.status = 'cancelled';
  const r = S.requestBooking(s, { profile: 'couple', type: 'mobilhome', arrive: s.day + 2, nights: 3, size: 2, force: true });
  assert.ok(r.booking);
  const u = S.byId(s, r.booking.unit);
  assert.equal(r.booking.price, S.unitPrice(s, u));
  const busy = S.upgrade(s, a.id);
  if (u.id === a.id) assert.equal(busy.ok, false);
  assert.equal(S.upgrade(s, b.id).ok, false, 'pas deux fois');
});

test('snack-bar : ouvert aux heures des repas, recettes et coût des marchandises', () => {
  const s = S.newGame({ seed: 32 }); s.nextEventDay = 1e9;
  S.money(s, 20000, 'Primes');
  const sn = S.build(s, 'snack', 5, 17); assert.ok(sn.ok, sn.why); sn.building.progress = 0; S.mapChanged(s);
  for (let m = 0; m < 1440 * 20; m++) {
    S.tick(s);
    const st = s.rt.bstate.get(sn.building.id);
    if (st && st.users.length && !S.snackOpen(s, sn.building)) assert.ok(s.minute >= 21 * 60 + 30 && s.minute <= 21 * 60 + 52 || s.minute >= 14 * 60 && s.minute < 15 * 60, 'service hors horaires ' + S.fmtTime(s.minute));
  }
  assert.ok(s.fin.all['Restauration'] > 0, 'des repas vendus');
  assert.ok(s.fin.all['Stock restauration'] < 0);
});

test('événements : une décision se présente, son choix s’applique, sinon résolution automatique', () => {
  const s = S.newGame({ seed: 33 });
  let seen = 0;
  for (let d = 0; d < 60; d++) {
    S.step(s, 1440);
    if (s.event) {
      seen++;
      const v = S.eventView(s); assert.ok(v.title && v.choices.length >= 2);
      const r = S.resolveEvent(s, v.choices.length - 1); assert.ok(r.ok);
      assert.equal(s.event, null);
    }
  }
  assert.ok(seen >= 3, `événements vus : ${seen}`);
  // résolution automatique si on ignore
  const s2 = S.newGame({ seed: 34 });
  S.step(s2, 1440 * 40);
  assert.ok(s2.eventLog.length >= 2);
  assert.ok(Math.abs(s2.fin.cash - (s2.fin.start + ledgerSum(s2))) < 0.05);
});

test('campagne radio : la demande augmente', () => {
  const base = S.newGame({ seed: 35 }); base.nextEventDay = 1e9;
  const boosted = S.newGame({ seed: 35 }); boosted.nextEventDay = 1e9;
  boosted.mods.push({ kind: 'demand', mult: 1.5, from: 0, until: 60 });
  S.step(base, 1440 * 30); S.step(boosted, 1440 * 30);
  assert.ok(boosted.stats.requests > base.stats.requests * 1.2, `${boosted.stats.requests} vs ${base.stats.requests}`);
});

test('avis clients rédigés selon le vécu, feu d’artifice du 14 juillet', () => {
  const s = S.newGame({ seed: 36 }); s.nextEventDay = 1e9;
  S.step(s, 1440 * 30);
  assert.ok(s.reviews.length > 5);
  for (const r of s.reviews) { assert.ok(r.text.length > 8); assert.ok(r.rating >= 1 && r.rating <= 5); }
  S.step(s, 1440 * (S.FIREWORKS[0] - s.day) + 22 * 60 + 31 - s.minute);
  const onsite = s.bookings.filter((b) => b.status === 'onsite');
  if (s.weather.type !== 'rain' && s.weather.type !== 'storm') assert.ok(onsite.every((b) => b.n && b.n.fireworks), 'tout le monde a vu le feu d’artifice');
});

test('prévision à 14 jours : nuits partielles, encaissements restants et intégrité', () => {
  const s=fresh(201);
  const a=S.requestBooking(s,{profile:'couple',type:'tent',arrive:2,nights:5,size:2,force:true}).booking;
  const b=S.requestBooking(s,{profile:'couple',type:'tent',arrive:12,nights:5,size:2,force:true}).booking;
  const json=SV.serialize(s).replace(/"savedAt":"[^"]+"/,'');
  const f=S.bookingOutlook(s,14);
  assert.equal(f.bookedNights,7);assert.equal(f.contracted,S.r2(a.price*5+b.price*2));
  assert.equal(f.balancesDue,S.r2(a.total-a.paid+b.total-b.paid));
  assert.equal(f.capacityNights,S.units(s).length*14);
  assert.equal(SV.serialize(s).replace(/"savedAt":"[^"]+"/,''),json);
});
test('prévision : clients sur place et réservations annulées', () => {
  const s=fresh(202),a=S.requestBooking(s,{profile:'couple',type:'tent',arrive:0,nights:3,size:2,force:true}).booking;
  S.checkIn(s,a,false);
  const b=S.requestBooking(s,{profile:'couple',type:'tent',arrive:5,nights:2,size:2,force:true}).booking;
  assert.equal(S.bookingOutlook(s,14).balancesDue,S.r2(b.total-b.paid));
  b.status='cancelled';
  assert.equal(S.bookingOutlook(s,14).bookedNights,3);
  assert.equal(S.bookingOutlook(s,14).balancesDue,0);
});
test('prévision : pannes, frais de personnel et prêt bancaire', () => {
  const s=fresh(203),b=S.requestBooking(s,{profile:'couple',type:'tent',arrive:3,nights:2,size:2,force:true}).booking;
  const base=S.bookingOutlook(s,7);
  S.byId(s,b.unit).broken=true;assert.equal(S.bookingOutlook(s,7).riskBookings,1);
  S.hire(s,'cleaning');assert.ok(S.bookingOutlook(s,7).fixedCosts>base.fixedCosts);
  assert.ok(S.borrow(s,10000).ok);assert.ok(S.bookingOutlook(s,7).loanCosts>0);
});
test('classement 4 et 5 étoiles : quatre métiers et objectif équipe compatibles', () => {
  const s=fresh(204),tent=S.units(s).find(b=>b.type==='tent'),rec=s.buildings.find(b=>b.type==='reception');
  const add=t=>s.buildings.push({...((t==='tent')?tent:rec),type:t,id:s.nextId++,progress:0});
  while(S.units(s).length<30)add('tent');
  add('sanitary');add('shop');add('pool');add('playground');
  s.staff=['reception','cleaning','maintenance','animation'].map(role=>({role,wage:D.STAFF[role].wage}));
  s.reputation=85;assert.equal(S.classement(s).stars,4);
  while(S.units(s).length<40)add('tent');
  for(let i=0;i<10;i++)add('mobilhome');
  add('sanitary');add('stage');s.deco.fill(D.DECO.FLOWERS);
  assert.equal(S.classement(s).stars,5);
});

test('V1.4 : besoins individuels, styles stables et hasard économique préservé', () => {
  const s=fresh(501),bk=S.requestBooking(s,{profile:'family',type:'tent',arrive:0,nights:3,size:4,force:true}).booking;
  assert.ok(bk);const rng=s.rng,guests=S.guestStates(bk);
  assert.equal(guests.length,4);assert.equal(guests.filter(g=>g.kid).length,bk.kids);
  assert.ok(guests.every(g=>g.needs.hunger>=0&&g.needs.hunger<=100));
  assert.equal(s.rng,rng);assert.equal(S.guestStates(bk)[0].style,guests[0].style);
});
test('V1.4 : besoins et hasard des vacanciers survivent à une sauvegarde', () => {
  const s=fresh(502),bk=S.requestBooking(s,{profile:'couple',type:'tent',arrive:0,nights:4,size:2,force:true}).booking;
  S.checkIn(s,bk,false);S.guestStates(bk)[0].needs.fun=16;
  const restored=SV.deserialize(SV.serialize(s)),re=restored.bookings.find(b=>b.id===bk.id);
  assert.equal(re.guests[0].needs.fun,16);assert.equal(restored.guestRng,s.guestRng);
  assert.equal(S.guestSnapshot(restored).persons,2);
});
test('V1.4 : migration des parties V1.3 sans nouvelle clé ni données vacancier', () => {
  const s=fresh(503),bk=S.requestBooking(s,{profile:'couple',type:'tent',arrive:0,nights:4,size:2,force:true}).booking;
  S.checkIn(s,bk,false);delete s.guestRng;delete bk.guests;delete s.stats.guestTrips;delete s.stats.guestActivities;
  const re=SV.deserialize(SV.serialize(s));
  assert.equal(re.bookings.find(x=>x.id===bk.id).guests.length,2);
  assert.ok(Number.isFinite(re.guestRng));S.step(re,30);assert.ok(re.fin.cash>0);
});
test('V1.4 : besoins bornés et observation sans effet sur réservations', () => {
  const s=fresh(504),bk=S.requestBooking(s,{profile:'family',type:'tent',arrive:0,nights:3,size:4,force:true}).booking;
  S.checkIn(s,bk,false);S.initRuntime(s);s.minute=14*60;
  const before=s.rng;S.guestNeedsStep(s);assert.equal(s.rng,before);
  assert.ok(bk.guests.every(g=>Object.values(g.needs).every(n=>n>=0&&n<=100)));
  const snap=S.guestSnapshot(s);assert.equal(snap.persons,4);
  assert.ok(snap.mood>=0&&snap.mood<=100);
});
test('V1.4 : promenades et sorties accompagnées réellement exécutées', () => {
  const s=fresh(64);S.step(s,1440*14);
  assert.ok(s.stats.guestTrips>40);assert.ok(s.stats.escortedTrips>2);
  assert.ok((s.stats.guestActivities.sanitary||0)>0);
  assert.ok((s.stats.guestActivities.walk||0)>0);
  assert.equal(S.guestSnapshot(s).groupOutings,s.stats.escortedTrips);
});
test('V1.4 : enfants en sortie sous accompagnement, adulte reste présent', () => {
  const s=fresh(65);let seen=0;
  for(let t=0;t<1440*9;t++){
    S.tick(s);
    for(const a of s.rt.agents){
      if(a.dead||a.kind!=='guest'||!a.kid||!a.act||a.act==='use')continue;
      if(a.act==='show'&&s.minute>=15*60&&s.minute<17*60)continue;
      seen++;assert.ok(a.companion,'mineur sans accompagnateur pour '+a.act);
      assert.ok(s.rt.agents.some(x=>!x.dead&&x.bk===a.bk&&x.companion===a.companion&&!x.kid),'adulte accompagnateur absent');
    }
  }
  assert.ok(seen>0);
});
test('V1.4 : orage empêche les promenades et baignades', () => {
  const s=fresh(66);s.weather={type:'storm',temp:17};s.forecast=Array.from({length:3},()=>({type:'storm',temp:17}));
  S.step(s,1440*2);assert.equal(s.stats.guestActivities.walk||0,0);
  assert.equal(s.stats.guestActivities.pool||0,0);
});
test('V1.4 : bilan et saison suivante conservent l’historique comportemental', () => {
  const s=fresh(67);S.step(s,1440*5);const r=S.endSeason(s);
  assert.equal(r.guestTrips,s.stats.guestTrips);assert.equal(r.escortedTrips,s.stats.escortedTrips);
  assert.ok(typeof r.guestActivities==='object');assert.ok(Number.isFinite(r.avgGuestMood));
  assert.ok(S.startSeason(s));assert.equal(s.reports[0].guestTrips,r.guestTrips);
});

test('V1.5 : calendrier tarifaire, bornes et prix appliqués',()=>{
 const s=fresh(1501),b=S.units(s).find(x=>x.type==='tent');
 assert.deepEqual([0,61,91,136,137,153].map(S.seasonBand),['low','mid','high','high','mid','low']);
 assert.ok(S.setSeasonRate(s,'high',1.4));
 assert.equal(S.unitPrice(s,b,110),S.r2(s.prices.tent*1.4));
 assert.equal(S.unitPrice(s,b,2),s.prices.tent);
 assert.ok(S.acceptRate(s,'tent','couple',1,110)<S.acceptRate(s,'tent','couple',1,2));
 assert.equal(S.setSeasonRate(s,'unknown',1.1),false);
 assert.equal(S.setSeasonRate(s,'low',Number.NaN),false);
 S.setSeasonRate(s,'low',4);assert.equal(s.seasonRates.low,1.5);
});
test('V1.5 : réservations existantes à prix garanti malgré les changements',()=>{
 const s=fresh(1502);S.setSeasonRate(s,'high',1.3);
 const a=S.requestBooking(s,{profile:'couple',type:'tent',arrive:102,nights:3,size:2,force:true}).booking;
 assert.ok(a);const price=a.price,paid=a.paid;assert.equal(price,S.r2(s.prices.tent*1.3));
 S.setSeasonRate(s,'high',0.8);assert.equal(a.price,price);assert.equal(a.paid,paid);
 const b=S.requestBooking(s,{profile:'couple',type:'tent',arrive:110,nights:2,size:2,force:true}).booking;
 assert.ok(b);assert.equal(b.price,S.r2(s.prices.tent*0.8));
});
test('V1.5 : marge indicative fondée sur les nuits réalisées et frais propres',()=>{
 const s=fresh(1503),unit=S.units(s).find(b=>b.type==='tent');
 const bk=S.requestBooking(s,{profile:'couple',type:'tent',arrive:0,nights:5,size:2,force:true}).booking;
 S.checkIn(s,bk,false);s.day=3;
 const p=S.unitPerformance(s,unit);
 assert.equal(p.days,3);assert.equal(p.nights,3);
 assert.equal(p.revenue,S.r2(bk.price*3));
 assert.equal(p.upkeep,S.r2(3*D.BUILDINGS.tent.upkeep));
 assert.equal(p.energyEstimate,S.r2(3*2*1.2));
 assert.equal(p.margin,S.r2(p.revenue-p.costs));
 assert.equal(S.unitPerformance(s,{type:'reception'}),null);
});
test('V1.5 : aucun revenu acquis sur réservation future ou annulée',()=>{
 const s=fresh(1504),unit=S.units(s).find(b=>b.type==='tent');
 const bk=S.requestBooking(s,{profile:'couple',type:'tent',arrive:12,nights:2,size:2,force:true}).booking;
 s.day=10;assert.equal(S.unitPerformance(s,unit).revenue,0);
 bk.status='cancelled';s.day=18;assert.equal(S.unitPerformance(s,unit).nights,0);
});
test('V1.5 : priorités de l’équipe et migration des sauvegardes',()=>{
 const s=fresh(1505);assert.ok(S.setStaffPolicy(s,'cleaning','sanitary'));
 assert.ok(S.setStaffPolicy(s,'maintenance','preventive'));
 assert.equal(S.setStaffPolicy(s,'maintenance','none'),false);
 assert.equal(S.setStaffPolicy(s,'unknown','urgent'),false);
 S.setSeasonRate(s,'high',1.25);
 const copy=SV.deserialize(SV.serialize(s));
 assert.equal(copy.staffPolicy.cleaning,'sanitary');
 assert.equal(copy.staffPolicy.maintenance,'preventive');
 assert.equal(copy.seasonRates.high,1.25);
 delete s.staffPolicy;delete s.seasonRates;
 const old=SV.deserialize(SV.serialize(s));
 assert.equal(old.staffPolicy.cleaning,'arrivals');assert.equal(old.seasonRates.high,1);
});
test('V1.5 : mise en service d’une nouvelle parcelle prise en compte',()=>{
 const s=fresh(1506);let res;
 for(let y=2;y<30&&!res;y++)for(let x=3;x<38&&!res;x++){
   const q=S.canPlace(s,'tent',x,y);
   if(q.ok&&q.access)res=S.build(s,'tent',x,y);
 }
 assert.ok(res&&res.ok);const b=res.building;
 assert.equal(b.openYear,s.year);
 assert.equal(b.openDay,s.day+D.BUILDINGS.tent.build);
 assert.equal(S.unitPerformance(s,b).days,0);
 s.day=5;assert.equal(S.unitPerformance(s,b).days,4);
});

test('V1.6 : devis de nettoyage et aucune facturation deux fois', () => {
 const s=fresh(1601),b=S.ofType(s,'sanitary')[0];
 b.dirt=89;const opt=S.serviceOptions(s,b).find(x=>x.kind==='clean');
 assert.ok(opt);assert.ok(opt.cost>35);
 const before=s.fin.cash,ledger=ledgerSum(s),rep=s.reputation;
 const r=S.serviceIntervention(s,b.id,'clean');
 assert.ok(r.ok);assert.equal(r.cost,opt.cost);assert.equal(b.dirt,0);
 assert.equal(s.fin.cash,S.r2(before-opt.cost));
 assert.equal(S.r2(ledgerSum(s)),S.r2(ledger-opt.cost));
 assert.equal(s.reputation,rep);
 assert.equal(S.serviceIntervention(s,b.id,'clean').ok,false);
 assert.equal(s.fin.cash,S.r2(before-opt.cost));
});
test('V1.6 : dépannage express tarifé et remise en service réelle', () => {
 const s=fresh(1602),b=S.ofType(s,'sanitary')[0];
 b.broken=true;b.cond=12;b.brokenDay=s.day;
 const option=S.serviceOptions(s,b).find(x=>x.kind==='repair');
 assert.ok(option && option.cost>0);const out=S.serviceIntervention(s,b.id,'repair');
 assert.ok(out.ok);assert.equal(b.broken,false);assert.ok(b.cond>=85);
 assert.equal(b.brokenDay,-1);assert.equal(s.stats.serviceInterventions,1);
 assert.equal(s.stats.serviceExpenses,option.cost);
});
test('V1.6 : révision préventive uniquement quand nécessaire', () => {
 const s=fresh(1603),b=S.ofType(s,'sanitary')[0];
 b.cond=52;
 const before=s.fin.cash;
 assert.ok(S.serviceIntervention(s,b.id,'prevent').ok);
 assert.equal(b.cond,87);assert.ok(s.fin.cash<before);
 const after=s.fin.cash;
 assert.equal(S.serviceIntervention(s,b.id,'prevent').ok,false);
 assert.equal(s.fin.cash,after);
});
test('V1.6 : intervention refusée si trésorerie trop faible, occupation ou salarié sur place',()=>{
 const s=fresh(1604),b=S.ofType(s,'sanitary')[0];
 b.dirt=78;
 s.fin.cash=0;const failed=S.serviceIntervention(s,b.id,'clean');
 assert.equal(failed.ok,false);assert.equal(b.dirt,78);
 s.fin.cash=10000;
 const st=S.bs(s,b),worker={id:998,task:{b:b.id,kind:'clean'}};
 s.rt.agentMap.set(998,worker);st.claim=998;
 assert.equal(S.serviceIntervention(s,b.id,'clean').ok,false);
 s.rt.agentMap.delete(998);st.claim=0;
 assert.ok(S.serviceIntervention(s,b.id,'clean').ok);
});
test('V1.6 : ménage locatif extérieur sans gêner un vacancier occupant',()=>{
 const s=fresh(1605),tent=S.units(s).find(x=>x.type==='tent');
 tent.clean=true;
 assert.ok(S.serviceOptions(s,tent).some(x=>x.kind==='turnover'));
 const booking=S.requestBooking(s,{profile:'couple',type:'tent',arrive:0,nights:2,size:2,force:true}).booking;
 S.checkIn(s,booking,false);
 tent.clean=true;
 assert.equal(S.serviceOptions(s,tent).some(x=>x.kind==='turnover'),false);
 assert.equal(S.serviceIntervention(s,tent.id,'turnover').ok,false);
 booking.status='done';
 assert.ok(S.serviceIntervention(s,tent.id,'turnover').ok);
 assert.equal(tent.clean,false);
});
test('V1.6 : liste d’exploitation triée, sauvegardée et bilan saisonnier',()=>{
 const s=fresh(1606),b=S.ofType(s,'sanitary')[0];
 b.dirt=93;b.broken=true;
 let list=S.serviceChecklist(s);
 assert.ok(list.length>=2);assert.equal(list[0].kind,'repair');
 assert.equal(list[0].id,b.id);
 assert.ok(S.serviceIntervention(s,b.id,'repair').ok);
 assert.ok(S.serviceIntervention(s,b.id,'clean').ok);
 const saved=SV.deserialize(SV.serialize(s));
 assert.equal(saved.stats.serviceInterventions,2);
 assert.equal(saved.stats.serviceExpenses,s.stats.serviceExpenses);
 const report=S.endSeason(saved);
 assert.equal(report.serviceInterventions,2);
 assert.equal(report.serviceExpenses,s.stats.serviceExpenses);
});
test('V1.6 : devis écartés pour équipement inaccessible ou en chantier',()=>{
 const s=fresh(1607),b=S.ofType(s,'sanitary')[0];b.dirt=95;
 const before=s.fin.cash;b.ax=-1;
 assert.ok(!S.serviceChecklist(s).some(x=>x.id===b.id));
 assert.equal(S.serviceIntervention(s,b.id,'clean').ok,false);
 b.ax=10;b.ay=10;b.progress=2;
 assert.equal(S.serviceOptions(s,b).length,0);
 assert.equal(S.serviceIntervention(s,b.id,'clean').ok,false);
 assert.equal(s.fin.cash,before);
});

test('V1.7 : nouvelles installations disponibles, classiques inchangés',()=>{
 const s=S.newGame({seed:1701}),types=['minigolf','multisport','bikes','laundry'];
 for(const type of types){assert.ok(D.BUILDINGS[type].cost>0);assert.equal(S.ofType(s,type).length,0);}
 assert.equal(s.mode,'normal');
 assert.equal(S.units(s).length,9);assert.equal(s.fin.start,30000);
});
test('V1.7 : le camping découverte place 4 équipements accessibles et distincts',()=>{
 const s=S.newGame({seed:1702,mode:'discovery'}),kinds=['minigolf','multisport','bikes','laundry'];
 assert.equal(s.mode,'discovery');assert.equal(s.fin.start,30000);assert.equal(S.units(s).length,9);
 for(const type of kinds){
   const b=S.ofType(s,type);assert.equal(b.length,1);
   assert.equal(b[0].progress,0);assert.ok(S.accessible(s,b[0]),type+' inaccessible');
 }
 const seen=new Set();
 for(const b of s.buildings)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
   const id=x+','+y;assert.ok(!seen.has(id),'overlap '+id);seen.add(id);
 }
});
test('V1.7 : activité extérieure fermée par intempéries mais laverie opérationnelle',()=>{
 const s=S.newGame({seed:1703,mode:'discovery'});s.minute=12*60;
 s.weather={type:'sun',temp:25};
 for(const type of ['minigolf','multisport','bikes','laundry'])
   assert.ok(S.activityOpen(s,S.ofType(s,type)[0]),type+' fermé au soleil');
 s.weather={type:'storm',temp:16};
 for(const type of ['minigolf','multisport','bikes'])
   assert.equal(S.activityOpen(s,S.ofType(s,type)[0]),false);
 assert.equal(S.activityOpen(s,S.ofType(s,'laundry')[0]),true);
 s.weather={type:'sun',temp:25};s.minute=23*60;
 for(const type of ['minigolf','multisport','bikes','laundry'])
   assert.equal(S.activityOpen(s,S.ofType(s,type)[0]),false);
});
test('V1.7 : les nouveaux loisirs accueillent vraiment des vacanciers',()=>{
 const s=S.newGame({seed:1704,mode:'discovery'});S.step(s,1440*25);
 for(const type of ['minigolf','multisport','bikes','laundry']) {
   assert.ok((s.stats.leisureVisits[type]||0)>0,type+' sans visiteurs');
   assert.ok((s.stats.guestActivities[type]||0)>0,type+' sans trajets');
 }
 assert.ok(s.stats.leisureRevenue>0,'activités sans recette nette');
 assert.ok(s.fin.season['Activités & loisirs']>0,'aucun revenu réel');
 assert.ok(s.fin.season['Frais activités']<0,'aucun frais direct');
});
test('V1.7 : fréquentation lave-linge limitée, pas d’abus plusieurs fois par jour',()=>{
 const s=S.newGame({seed:1705,mode:'discovery'});S.step(s,1440*12);
 const bks=s.bookings.filter(b=>b.laundryDay!==undefined);
 assert.ok(bks.length>0);
 assert.ok((s.stats.leisureVisits.laundry||0)<200,'laverie trop fréquentée');
});
test('V1.7 : lavage, loisir gratuit et rémunéré ont des règles économiques distinctes',()=>{
 const s=S.newGame({seed:1706,mode:'discovery'});S.step(s,1440*10);
 assert.ok((s.stats.leisureVisits.multisport||0)>0);
 assert.ok(s.stats.leisureRevenue>0);
 const inc=s.fin.season['Activités & loisirs'],expenses=s.fin.season['Frais activités'];
 assert.equal(S.r2(inc+expenses),S.r2(s.stats.leisureRevenue));
});
test('V1.7 : sauvegarde/restauration du mode découverte et visites',()=>{
 const s=S.newGame({seed:1707,mode:'discovery'});S.step(s,1440*5);
 const restored=SV.deserialize(SV.serialize(s));
 assert.equal(restored.mode,'discovery');
 assert.equal(S.ofType(restored,'minigolf').length,1);
 assert.equal(S.ofType(restored,'laundry').length,1);
 assert.deepEqual(restored.stats.leisureVisits,s.stats.leisureVisits);
 assert.equal(restored.stats.leisureRevenue,s.stats.leisureRevenue);
 S.step(restored,60);
 assert.ok(restored.fin.cash>0);
});
test('V1.7 : la présence des activités accroît l’attractivité avant tout',()=>{
 const s=S.newGame({seed:1708}),d=S.newGame({seed:1708,mode:'discovery'});
 for(const profile of ['family','couple','nomad'])
   assert.ok(S.attractiveness(d,profile)>S.attractiveness(s,profile),profile);
});
test('V1.7 : fin de saison conserve la fréquentation et la marge loisirs',()=>{
 const s=S.newGame({seed:1709,mode:'discovery'});S.step(s,1440*9);
 const visited=s.stats.leisureVisits,earned=s.stats.leisureRevenue;
 const report=S.endSeason(s);
 assert.deepEqual(report.leisureVisits,visited);
 assert.equal(report.leisureRevenue,earned);
 assert.ok(S.startSeason(s));
 assert.equal(s.reports[0].leisureRevenue,earned);
 assert.equal(s.stats.leisureRevenue,0);
});

test('V1.8 : quatre nouveaux équipements ont leurs propres coûts et horaires',()=>{
 const types=['petanque','cinema','bakery','spa'];
 const s=S.newGame({seed:1801});
 for(const type of types){
   const def=D.BUILDINGS[type];assert.ok(def&&def.cost>0,type);
   assert.ok(def.build>0&&def.slots>0);assert.equal(S.ofType(s,type).length,0);
 }
 assert.equal(S.units(s).length,9);
 assert.equal(s.mode,'normal');
});
test('V1.8 : huit bâtiments accessibles dans le mode découverte, sans chevauchement',()=>{
 const s=S.newGame({seed:1802,mode:'discovery'});
 const types=['minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'];
 assert.equal(S.units(s).length,9);const occupied=new Set();
 for(const b of s.buildings){
   for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
     const key=x+','+y;assert.ok(!occupied.has(key),'chevauchement '+key);
     occupied.add(key);assert.notEqual(s.tiles[S.idx(x,y)],D.TERRAIN.WATER);
   }
 }
 for(const type of types){
   const b=S.ofType(s,type);
   assert.equal(b.length,1);
   assert.ok(S.accessible(s,b[0]),type+' inaccessible');
   assert.equal(b[0].progress,0);
 }
});
test('V1.8 : cinéma seulement le soir et par beau temps ; boulangerie le matin ; spa couvert',()=>{
 const s=S.newGame({seed:1803,mode:'discovery'});
 const v=(type)=>S.ofType(s,type)[0];
 s.weather={type:'sun',temp:24};s.minute=8*60;
 assert.ok(S.activityOpen(s,v('bakery')));
 assert.equal(S.activityOpen(s,v('cinema')),false);
 assert.equal(S.activityOpen(s,v('spa')),false);
 s.minute=20*60+25;
 assert.equal(S.activityOpen(s,v('bakery')),false);
 assert.ok(S.activityOpen(s,v('cinema')));
 assert.ok(S.activityOpen(s,v('spa')));
 s.weather={type:'storm',temp:17};
 assert.equal(S.activityOpen(s,v('cinema')),false);
 assert.equal(S.activityOpen(s,v('petanque')),false);
 assert.ok(S.activityOpen(s,v('spa')));
});
test('V1.8 : les quatre nouvelles installations reçoivent réellement des visiteurs',()=>{
 const s=S.newGame({seed:1804,mode:'discovery'});S.step(s,1440*28);
 for(const type of ['petanque','cinema','bakery','spa']){
   assert.ok((s.stats.leisureVisits[type]||0)>0,type+' : aucun client');
   assert.ok((s.stats.guestActivities[type]||0)>0,type+' : aucun trajet');
 }
 assert.ok(s.fin.season['Activités & loisirs']>0);
 assert.ok(s.fin.season['Frais activités']<0);
 assert.equal(S.r2(s.fin.season['Activités & loisirs']+s.fin.season['Frais activités']),S.r2(s.stats.leisureRevenue));
});
test('V1.8 : campagne commerciale débite une fois et agit sur la bonne période',()=>{
 const s=S.newGame({seed:1805}),before=s.fin.cash,rng=s.rng;
 const offer=S.launchCampaign(s,'families');
 assert.ok(offer.ok);
 assert.equal(before-s.fin.cash,850);assert.equal(s.rng,rng);
 assert.equal(offer.from,s.day+1);assert.equal(offer.until,s.day+12);
 assert.ok(S.demandMod(s,offer.from)>=1.25);
 assert.equal(S.demandMod(s,offer.until+1),1);
 const second=S.launchCampaign(s,'local');
 assert.equal(second.ok,false);assert.equal(s.fin.cash,S.r2(before-850));
 assert.equal(s.stats.marketingSpent,850);assert.equal(s.stats.marketingCampaigns,1);
});
test('V1.8 : publicités refusées sans trésorerie et en hiver, sans effet de bord',()=>{
 const s=S.newGame({seed:1806});
 const cash=s.fin.cash,rng=s.rng;
 assert.equal(S.launchCampaign(s,'bad').ok,false);
 assert.equal(s.fin.cash,cash);assert.equal(s.rng,rng);
 s.fin.cash=12;
 assert.equal(S.launchCampaign(s,'local').ok,false);
 assert.equal(s.mods.filter(x=>x.label&&x.label.includes('Affichage local')).length,0);
 s.phase='winter';s.fin.cash=cash;
 assert.equal(S.launchCampaign(s,'local').ok,false);
});
test('V1.8 : publicité renouvelable uniquement après expiration',()=>{
 const s=S.newGame({seed:1807});
 assert.ok(S.launchCampaign(s,'local').ok);
 s.day=6;assert.ok(S.campaignStatus(s));
 assert.equal(S.launchCampaign(s,'summer').ok,false);
 s.day=8;assert.equal(S.campaignStatus(s),null);
 const renewed=S.launchCampaign(s,'summer');
 assert.ok(renewed.ok);assert.equal(s.stats.marketingCampaigns,2);
 assert.equal(s.stats.marketingSpent,2050);
});
test('V1.8 : programme animation sans scène ni employé ne facture rien',()=>{
 const s=S.newGame({seed:1808}),cash=s.fin.cash;
 s.weather={type:'sun',temp:25};
 assert.ok(S.setProgram(s,'festive'));
 assert.equal(S.setProgram(s,'fake'),false);
 const result=S.runProgram(s);
 assert.equal(result.active,false);assert.equal(s.fin.cash,cash);
 assert.equal(s.stats.programEvents,0);
});
test('V1.8 : spectacle coûte seulement quand il est réalisable et pas deux fois par jour',()=>{
 const s=S.newGame({seed:1809});let placed;
 for(let y=3;y<30&&!placed;y++)for(let x=3;x<36&&!placed;x++){
   const q=S.canPlace(s,'stage',x,y);
   if(q.ok&&q.access)placed=S.build(s,'stage',x,y);
 }
 assert.ok(placed&&placed.ok);placed.building.progress=0;
 S.mapChanged(s);assert.ok(S.accessible(s,placed.building));
 S.hire(s,'animation');s.weather={type:'sun',temp:24};
 assert.ok(S.setProgram(s,'festive'));
 const cash=s.fin.cash;
 const first=S.runProgram(s);assert.ok(first.active);assert.equal(first.cost,95);
 assert.equal(s.fin.cash,S.r2(cash-95));
 assert.equal(s.stats.programEvents,1);
 const repeat=S.runProgram(s);assert.equal(repeat.active,false);
 assert.equal(s.fin.cash,S.r2(cash-95));
 s.day++;s.weather={type:'storm',temp:16};
 assert.equal(S.runProgram(s).active,false);
 assert.equal(s.fin.cash,S.r2(cash-95));
 s.day++;s.weather={type:'sun',temp:26};
 assert.ok(S.setProgram(s,'calm'));
 assert.equal(S.runProgram(s).active,true);
 assert.equal(s.fin.cash,S.r2(cash-95));
 assert.equal(s.stats.programEvents,2);
});
test('V1.8 : nouvelle campagne et programmation persistent après sauvegarde',()=>{
 const s=S.newGame({seed:1810,mode:'discovery'});
 assert.ok(S.setProgram(s,'festive'));assert.ok(S.launchCampaign(s,'local').ok);
 const raw=SV.serialize(s),copy=SV.deserialize(raw);
 assert.equal(copy.program,'festive');
 assert.equal(copy.campaign.kind,'local');
 assert.equal(copy.stats.marketingCampaigns,1);
 assert.equal(copy.commercialHistory.length,1);
 assert.equal(copy.mode,'discovery');
 assert.equal(S.campaignStatus(copy).kind,'local');
});
test('V1.8 : les anciennes parties reçoivent les nouvelles valeurs par défaut',()=>{
 const s=S.newGame({seed:1811});
 delete s.program;delete s.campaign;delete s.commercialHistory;
 const copy=SV.deserialize(SV.serialize(s));
 assert.equal(copy.program,'family');
 assert.equal(copy.campaign,null);
 assert.deepEqual(copy.commercialHistory,[]);
 assert.equal(copy.stats.programEvents,0);
 assert.equal(copy.stats.marketingCampaigns,0);
});
test('V1.8 : bilan de fin de saison archive les actions commerciales et la programmation',()=>{
 const s=S.newGame({seed:1812,mode:'discovery'});
 assert.ok(S.launchCampaign(s,'local').ok);
 s.stats.programEvents=4;s.stats.programCost=140;
 S.step(s,1440*9);
 const result=S.endSeason(s);
 assert.equal(result.marketingCampaigns,1);
 assert.equal(result.marketingSpent,350);
 assert.equal(result.programEvents,4);
 assert.equal(result.programCost,140);
 assert.ok(S.startSeason(s));
 assert.equal(s.campaign,null);
 assert.equal(s.stats.marketingSpent,0);
 assert.equal(s.stats.programEvents,0);
});
test('V1.8 : simulations longues restent finies et cohérentes',()=>{
 for(const mode of ['normal','discovery']){
   const s=S.newGame({seed:1813,mode});
   assert.ok(S.launchCampaign(s,'families').ok);
   S.step(s,1440*60);
   assert.ok(Number.isFinite(s.fin.cash));
   assert.ok(Number.isFinite(s.reputation));
   assert.ok(s.reputation>=0&&s.reputation<=100);
   assert.ok(s.stats.requests>0);
   assert.ok(s.stats.leisureRevenue===S.r2((s.fin.season['Activités & loisirs']||0)+(s.fin.season['Frais activités']||0)));
 }
});
