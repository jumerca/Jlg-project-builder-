/* Musée & Expéditions — test de bout en bout dans un vrai navigateur + captures.
 * Usage : node tests/e2e.js [dossier_captures]
 * Nécessite Playwright (et Chrome/Chromium). Variable CHROME_PATH pour un exécutable précis.
 */
'use strict';
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }

const OUT = process.argv[2] || path.join(__dirname, '..', 'captures');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
fs.mkdirSync(OUT, { recursive: true });

const log = (m) => console.log('  ' + m);
function check(c, m) { if (!c) throw new Error('ÉCHEC : ' + m); log('✔ ' + m); }

(async () => {
  const launch = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROME_PATH || fs.existsSync('/usr/bin/google-chrome')) launch.executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  const browser = await pw.chromium.launch(launch);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/ERR_/.test(m.text())) errors.push(m.text()); });
  const shot = async (name, full) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full }); log('📷 ' + name + '.png'); };
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(ME.UI.getState())));
  const next = async () => { await page.click('#nextWeek'); await page.waitForTimeout(120); if (await page.$('.modal')) await page.click('.modal [data-action="closeModal"]'); };

  console.log('Parcours joueur dans le navigateur (ordinateur)');
  await page.goto(URL); // contexte neuf : stockage vide, donc nouvelle partie
  await page.waitForSelector('.modal');
  await shot('01-lettre-accueil');
  await page.click('.modal [data-action="closeModal"]');
  await page.waitForTimeout(1500);
  check(!!(await page.$('.gl-wrap canvas.gl-canvas')), 'musée affiché en 3D (WebGL)');
  await shot('02-musee-depart-3d');
  // sélection au toucher dans la scène 3D : la vitrine du hall ouvre la fiche de l'objet
  const hallTap = await page.evaluate(() => {
    const sc = ME.UI.view.scenes[0]; const R = sc.R; const [vx, vz] = ME.Scene3D.slots('hall', 1)[0];
    const p = R.toScreen([vx, 1.4, vz]); const r = document.querySelector('.gl-canvas').getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  });
  await page.mouse.click(hallTap.x, hallTap.y);
  await page.waitForSelector('.modal');
  check(await page.$eval('.modal h2', (h) => /Scarabée/.test(h.textContent)), 'toucher une vitrine 3D ouvre la fiche de son objet');
  check(!!(await page.$('.modal .plate.gl-wrap canvas')), 'la fiche présente l\'objet en 3D');
  await page.waitForTimeout(1200);
  await shot('02c-fiche-objet-3d');
  await page.click('.modal [data-action="closeModal"]');
  await page.click('.gl-tools [data-follow]');
  await page.waitForTimeout(2500);
  check(!!(await page.$('.gl-label.think')), 'mode « Suivre un visiteur » : pensée affichée');
  await shot('02d-suivre-visiteur');
  await page.click('.gl-tools [data-k="home"]');
  await page.waitForTimeout(800);
  await page.click('.gl-tools [data-toggle]');
  await page.waitForTimeout(500);
  check(!!(await page.$('.museum-wrap.two-d canvas')), 'bascule vers la vue BD 2D');
  await shot('02b-musee-2d');
  await page.click('[data-view3d]');
  await page.waitForTimeout(800);
  check(!!(await page.$('.gl-canvas')), 'retour à la vue 3D');

  // Carte et autorisation
  await page.click('[data-tab="carte"]');
  await page.click('.pin[data-dest="vezere"]');
  await shot('03-carte');
  for (let i = 0; i < 6; i++) {
    const st = await S();
    if (st.permits.sap.status === 'granted') break;
    if (st.permits.sap.status !== 'pending') await page.click('[data-action="permit"][data-inst="sap"]');
    await next();
    await page.click('[data-tab="carte"]');
  }
  check((await S()).permits.sap.status === 'granted', 'autorisation de fouille obtenue');

  // Préparation de la mission
  await page.click('[data-action="openPlanner"][data-dest="vezere"]');
  await page.check('input[data-k="kit"]');
  await page.check('input[data-k="topo"]');
  await shot('04-preparation-mission', true);
  await page.click('[data-action="launch"]');
  let st = await S();
  check(st.expeditions.length === 1 && st.expeditions[0].phase === 'terrain', 'expédition lancée depuis l\'interface');
  await next(); await next();
  await page.click('[data-tab="expeditions"]');
  await page.waitForTimeout(2500);
  check(!!(await page.$('.scene.gl-wrap canvas')), 'chantier affiché en 3D');
  await shot('05-chantier-3d', true);
  for (let i = 0; i < 6 && (await S()).expeditions[0].phase !== 'termine'; i++) await next();
  st = await S();
  check(st.expeditions[0].phase === 'termine' && st.pendingReveals.length > 0, 'caisses arrivées au musée (' + st.pendingReveals.length + ' découverte(s))');
  const firstId = st.pendingReveals[0];

  // Déballage au pinceau : on frotte réellement la terre à la souris
  await page.click('[data-tab="collections"]');
  await page.click('[data-action="openReveal"]');
  await page.waitForSelector('#dig canvas');
  const box = await page.locator('#dig canvas').boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  for (let row = 0; row < 14 && !(await page.$('#dig.done')); row++) {
    const y = box.y + 8 + row * (box.height / 13);
    await page.mouse.move(box.x + 5, y, { steps: 4 });
    await page.mouse.move(box.x + box.width - 5, y, { steps: 18 });
    if (row === 6) await shot('06-deballage-pinceau');
  }
  await page.mouse.up();
  await page.waitForSelector('#dig.done', { timeout: 4000 });
  await page.waitForTimeout(1500);
  check(!!(await page.$('#dig .obj.gl-wrap canvas')), 'présentation 3D de la découverte après le pinceau');
  await shot('07-decouverte-revelee-3d');
  check((await S()).objects[firstId].revealed, 'découverte ' + firstId + ' dégagée au pinceau');
  while (await page.$('[data-action="revealNext"]')) {
    if (await page.$('#revealNext[disabled]')) await page.click('[data-action="revealAll"]');
    await page.click('[data-action="revealNext"]');
    await page.waitForTimeout(80);
  }
  check((await S()).pendingReveals.length === 0, 'toutes les caisses déballées');

  // Fiche objet
  await page.click('.obj-card[data-id="' + firstId + '"]');
  await shot('08-fiche-objet', true);
  await page.click('.modal [data-action="closeModal"]');

  // Atelier : restauration + étude
  await page.click('[data-tab="atelier"]');
  await page.click('.pick-list .obj-card >> nth=0');
  const restoId = (await S()).staff.find((p) => p.role === 'Restaurateur').id;
  await page.click('[data-action="atStaff"][data-id="' + restoId + '"]');
  await page.click('[data-action="atStart"]');
  await page.click('[data-action="atKind"][data-k="etude"]');
  await page.click('.pick-list .obj-card >> nth=0');
  const histId = (await S()).staff.find((p) => p.role === 'Historienne').id;
  await page.click('[data-action="atStaff"][data-id="' + histId + '"]');
  await page.click('[data-action="atStart"]');
  st = await S();
  check(st.jobs.length === 2, 'deux travaux en cours à l\'atelier');
  const busy = await page.$$eval('.pick-list .obj-card', (els) => els.length);
  check((await page.$('[data-action="atStart"][disabled]')) !== null, 'atelier plein : le bouton de lancement est bloqué');
  await shot('09-atelier', true);

  // Exposition d'une découverte : via la salle (thème + vitrine)
  for (let i = 0; i < 6 && (await S()).jobs.length; i++) await next();
  await page.click('[data-tab="musee"]');
  await page.click('.room-card[data-room="salle2"]');
  await page.selectOption('select[data-action="roomTheme"]', 'prehistoire');
  const free = await page.$('[data-action="pickSlot"]');
  await free.click();
  const cand = await page.$('.pick-list [data-action="placeSlot"]');
  check(!!cand, 'au moins une découverte exposable');
  const placedId = await cand.getAttribute('data-id');
  await cand.click();
  st = await S();
  check(st.objects[placedId].location === 'vitrine', 'découverte ' + placedId + ' exposée');
  const hist = st.objects[placedId].history.map((h) => h.loc);
  check(hist[0] === 'terrain' && hist.includes('transport') && hist.includes('reserve') && hist[hist.length - 1] === 'vitrine', 'parcours complet tracé : ' + Array.from(new Set(hist)).join(' → '));
  await shot('10-salle-gestion', true);
  await page.click('.modal [data-action="closeModal"]');
  await next();
  await page.click('[data-tab="musee"]');
  await page.waitForTimeout(3500);
  await shot('11-musee-3d-anime');
  await page.evaluate(() => { const c = ME.UI.view.scenes[0].cam; c.userMoved = true; c.target = [15, 0, 1.5]; c.dist = 15; c.pitch = 0.62; c.yaw = 0.25; });
  await page.waitForTimeout(2500);
  await shot('11b-musee-3d-rapproche');
  st = await S();
  check(st.lastVisit.total > 0 && st.ledger.length > 0, 'visiteurs accueillis et billetterie encaissée (' + st.lastVisit.total + ' visiteurs)');

  // Rapport hebdomadaire + finances
  await page.click('#nextWeek');
  await page.waitForSelector('.modal');
  await shot('12-rapport-hebdo');
  await page.click('.modal [data-action="closeModal"]');
  await page.click('[data-tab="finances"]');
  await shot('13-finances', true);
  await page.click('[data-tab="expositions"]');
  await shot('14-expositions-prets', true);
  await page.click('[data-tab="equipe"]');
  await shot('15-equipe', true);

  // Sauvegarde : rechargement de la page puis export/import
  const before = await S();
  await page.reload();
  await page.waitForTimeout(500);
  const after = await S();
  check(after.week === before.week && Object.keys(after.objects).join() === Object.keys(before.objects).join(), 'reprise automatique après rechargement (semaine ' + after.week + ')');
  await page.click('[data-action="openSettings"]');
  await page.click('[data-action="exportCode"]');
  const code = await page.inputValue('#saveCode');
  check(code.startsWith('MEX1:'), 'code d\'export généré');
  await shot('16-sauvegarde');
  await page.click('[data-action="reset"]'); await page.click('[data-action="reset"]');
  check((await S()).week === 1, 'nouvelle partie');
  await page.click('[data-action="openSettings"]');
  await page.fill('#importCode', code);
  await page.click('[data-action="importCode"]');
  const imp = await S();
  check(imp.week === before.week && imp.objects[placedId] && imp.objects[placedId].location === 'vitrine', 'partie restaurée depuis le code (objet ' + placedId + ' toujours en vitrine)');
  await page.click('.modal [data-action="closeModal"]');

  // Téléphone
  console.log('Affichage téléphone');
  const saveText = await page.evaluate(() => ME.State.serialize(ME.UI.getState()));
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mob.addInitScript((t) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('musee-expeditions-save-v1', t); sessionStorage.setItem('seeded', '1'); } }, saveText);
  const mp = await mob.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await mp.goto(URL);
  await mp.waitForTimeout(3500);
  await mp.screenshot({ path: path.join(OUT, '20-mobile-musee.png') }); log('📷 20-mobile-musee.png');
  await mp.tap('[data-tab="carte"]'); await mp.waitForTimeout(400);
  await mp.screenshot({ path: path.join(OUT, '21-mobile-carte.png') }); log('📷 21-mobile-carte.png');
  await mp.tap('[data-tab="collections"]'); await mp.waitForTimeout(400);
  await mp.tap('.obj-card[data-id="' + placedId + '"]'); await mp.waitForTimeout(400);
  await mp.screenshot({ path: path.join(OUT, '22-mobile-fiche.png') }); log('📷 22-mobile-fiche.png');
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, 'pas de débordement horizontal sur téléphone (' + overflow + ' px)');

  check(errors.length === 0, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log('\nTest de bout en bout réussi. Captures : ' + OUT);
})().catch(async (e) => { console.error(e.message); process.exit(1); });
