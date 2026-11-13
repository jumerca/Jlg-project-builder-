/* Joueur automatique pour l'équilibrage : node tools/bot.js [graine] [saisons] */
const S = require('../src/sim.js'), D = require('../src/data.js');
const seed = +(process.argv[2] || 1), seasons = +(process.argv[3] || 3);
const s = S.newGame({ seed });
const verbose = process.argv.includes('-v');
function tryPlace(type) {
  // cherche un emplacement libre adjacent à une allée reliée
  for (let y = 1; y < S.H - 1; y++) for (let x = 3; x < 38; x++) {
    const c = S.canPlace(s, type, x, y);
    if (c.ok && c.access) { const r = S.build(s, type, x, y); if (r.ok && S.accessible(s, r.building)) return true; if (r.ok) S.demolish(s, x, y); }
  }
  return false;
}
function paths() {
  const P = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) S.buildPath(s, x, y); };
  P(23, 16, 35, 16); P(24, 4, 24, 30); P(12, 4, 35, 4); P(12, 28, 35, 28); P(12, 4, 12, 30); P(35, 4, 35, 28); P(12, 10, 35, 10); P(12, 22, 35, 22);
}
let built = false;
for (let season = 0; season < seasons; season++) {
  while (s.phase === 'season') {
    if (!built && s.fin.cash > 9000) { paths(); built = true; }
    if (s.event) { const v = S.eventView(s); let i = v.choices.findIndex((c) => c.afford); S.resolveEvent(s, i < 0 ? v.choices.length - 1 : i); }
    if (s.minute === 9 * 60) {
      const roles = (r) => s.staff.filter((x) => x.role === r).length;
      const u = S.units(s).length, cash = s.fin.cash;
      if (!roles('cleaning')) S.hire(s, 'cleaning');
      if (u > 14 && roles('reception') < 1) S.hire(s, 'reception');
      if (u > 20 && !roles('maintenance')) S.hire(s, 'maintenance');
      if (u > 34 && roles('cleaning') < 2) S.hire(s, 'cleaning');
      const has = (t) => s.buildings.some((b) => b.type === t);
      const cap = S.units(s).reduce((a, b) => a + D.BUILDINGS[b.type].cap, 0), cab = s.buildings.filter((b) => b.type === 'sanitary').length * 6;
      if (built) {
        if (cap / cab > 12) { if (cash > 8000) tryPlace('sanitary'); }
        else if (!has('shop') && cash > 7000) tryPlace('shop');
        else if (!has('pool') && cash > 45000) tryPlace('pool');
        else if (!has('playground') && cash > 6000 && u > 15) tryPlace('playground');
        else if (!has('stage') && cash > 12000 && u > 22) { if (tryPlace('stage')) S.hire(s, 'animation'); }
        else if (!has('snack') && cash > 14000 && u > 25) tryPlace('snack');
        else if (cash > 16000) tryPlace('mobilhome');
        else if (cash > 9000 && s.stats.lostFull > 20) tryPlace(s.day % 2 ? 'tent' : 'caravan');
      }
    }
    S.tick(s);
  }
  const r = s.reports[s.reports.length - 1];
  console.log(`An ${r.year} | exploitation ${Math.round(r.operating)} € | invest ${Math.round(r.invest)} | résultat ${Math.round(r.result)} € | tréso ${Math.round(r.cash)} € | rép ${r.repStart}->${r.repEnd} ${'★'.repeat(r.stars)} | note ${r.avgRating} | occ ${Math.round(r.avgOcc * 100)}% été ${Math.round(r.summerOcc * 100)}% | unités ${r.units} | groupes ${r.groups} | refus plein ${r.lostFull} prix ${r.lostPrice}/${r.requests}`);
  if (verbose) {
    console.log('  recettes', JSON.stringify(r.inc), '\n  dépenses', JSON.stringify(r.exp));
    const cnt = {}; for (const rv of s.reviews) cnt[rv.text.slice(0, 40)] = (cnt[rv.text.slice(0, 40)] || 0) + 1;
    console.log('  avis récents', Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6));
  }
  S.startSeason(s);
}
