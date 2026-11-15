/* Camping Tycoon — interface, boucle de jeu et entrées (souris, tactile, clavier) */
(function () {
  'use strict';
  const D = CT.data, S = CT.sim, SV = CT.save, TS = CT.TS;
  const $ = (id) => document.getElementById(id);
  const eur = (v) => (Math.round(v) || 0).toLocaleString('fr-FR') + ' €';
  const eur2 = (v) => (Math.round(v * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
  const pct = (v) => Math.round(v * 100) + ' %';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SPEEDS = [0, 8, 24, 80]; // minutes de jeu par seconde réelle

  let s = null;
  const R = new CT.Renderer($('view'));
  const ui = { speed: 1, tool: 'select', item: null, tab: null, sel: null, acc: 0, last: performance.now(), lastDay: -1, lastSave: 0, ghostAt: null, panelTick: 0, opsExpanded: false };


  /* Version visible et historique : même source de vérité pour l'accueil et les menus. */
  const RELEASE = {
    version: '1.8.0', date: '15 novembre 2026',
    headline: 'Le Grand Domaine vivant',
    highlights: [
      ['petanque','Boulodrome','Parties de pétanque & vie sociale'],
      ['cinema','Cinéma sous les étoiles','Projection et gradins animés le soir'],
      ['bakery','Boulangerie-café','Croissants, clients et fumée du four'],
      ['spa','Espace bien-être','Spa animé, pergola et détente']
    ],
    history: [
      ['1.8.0','15 novembre 2026','Grand domaine : pétanque, cinéma, boulangerie et spa, huit équipements en découverte, canards et barque sur le lac, direction commerciale et programmes d’animation.'],
      ['1.7.1','15 novembre 2026','Correctif : résultat des recherches de mises à jour désormais visible sur l’accueil et dans le menu.'],
      ['1.7.0','15 novembre 2026','Quatre nouveaux bâtiments dessinés, activités et revenus réels, animations sur la carte, panneau Vie du camping et nouvel écran d’accueil avec historique.'],
      ['1.6.0','15 novembre 2026','Interventions d’exploitation, dépannage ciblé, détails animés, végétation et météo.'],
      ['1.5.0','15 novembre 2026','Scènes de vie, tarifs saisonniers, marge par emplacement, priorités du personnel.'],
      ['1.4.0','15 novembre 2026','Besoins individuels, promenades, sorties en famille et comportements adaptés à la météo.']
    ]
  };
  function releaseVisuals(root = document) {
    root.querySelectorAll('[data-ct-preview]').forEach(el => {
      if (el.childElementCount) return;
      try { const canvas=CT.drawSpriteIcon(el.dataset.ctPreview); canvas.setAttribute('aria-hidden','true'); el.appendChild(canvas); }
      catch(e) { el.textContent='🏕️'; }
    });
  }
  function releaseHistory(back) {
    modal(`<h2>🗞️ Versions & mises à jour</h2>
      <p class="release-tag">CAMPING TYCOON · VERSION ${RELEASE.version} · ${RELEASE.date}</p>
      <div class="release-history">${RELEASE.history.map(([v,d,desc])=>
        `<div class="release-history-entry"><b>Version ${v}</b><small>${d}</small><p>${desc}</p></div>`).join('')}</div>
      <div class="acts"><button class="btn primary" data-act="back">← Retour</button>
      <button class="btn" data-act="check">🔄 Vérifier en ligne</button></div><div id="updateStatus" class="update-status" role="status" aria-live="polite"></div>`,{
        back: back || (()=>titleScreen(SV.hasAuto())),
        check: ()=>checkOnlineVersion()
      });
  }
  function updateStatus(message, good) {
    const el=$('updateStatus');
    if(el){el.textContent=message;el.classList.add('visible');el.classList.toggle('good',!!good);}
    else toast(message, good?'good':'warn',8000);
  }
  async function checkOnlineVersion() {
    try {
      if ('serviceWorker' in navigator) {
        const reg=await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
      const response=await fetch('./version.json?ts='+Date.now(),{cache:'no-store'});
      if (!response.ok) throw Error('Service de version indisponible.');
      const data=await response.json();
      const compare=(a,b)=>{
        const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);
        for(let i=0;i<3;i++) if ((x[i]||0)!==(y[i]||0)) return (x[i]||0)-(y[i]||0);
        return 0;
      };
      if (compare(data.version,RELEASE.version)>0) {
        modal(`<h2>🆕 Mise à jour ${esc(data.version)} disponible</h2>
          <p>La version ${esc(data.version)} est publiée. Ta sauvegarde locale sera conservée.</p>
          <div class="acts"><button class="btn primary" data-act="install">Enregistrer et actualiser</button>
          <button class="btn" data-act="later">Plus tard</button></div>`,{
            install: ()=>{SV.autosave(s);location.reload();},later: ()=>releaseHistory(()=>titleScreen(SV.hasAuto()))
          });
      } else updateStatus(`✓ Version ${RELEASE.version} à jour. Aucune version plus récente détectée.`,true);
    } catch(err) {
      updateStatus('Vérification des versions indisponible : '+err.message,false);
    }
  }

  /* ================= Démarrage ================= */
  function boot() {
    R.resize();
    window.addEventListener('resize', () => { R.resize(); if (s) R.clamp(s); });
    bindUI(); bindInput();
    const saved = SV.loadAuto();
    if (saved) { s = saved; R.fit(s); ui.speed = 0; }
    else { s = S.newGame({ seed: (Date.now() % 1e9) | 0 }); R.fit(s); ui.speed = 0; }
    s.rt.events.length = 0;
    titleScreen(!!saved);
    requestAnimationFrame(frame);
    CT.debug = { get s() { return s; }, set s(v) { s = v; R.groundKey = ''; }, R, ui, setSpeed };
  }

  function titleScreen(hasSave) {
    const recap = hasSave ? `<p class="note">Ta partie : <b>${esc(s.name)}</b> — saison ${s.year}, ${s.phase === 'winter' ? 'hors saison' : S.fmtDate(s)} · ${eur(s.fin.cash)}</p>` : '';
    modal(`
      <div class="title-hero title-hero-compact"><img src="assets/logo.svg" alt="Camping Tycoon — JLG Creative"></div>
      <div class="release-hero">
        <div class="release-meta"><strong>VERSION ${RELEASE.version}</strong><span>Publié le ${RELEASE.date}</span></div>
        <h2>${RELEASE.headline}</h2>
        <p>Quatre nouveaux grands lieux de vie, un lac animé et des décisions de direction qui influencent réellement les réservations, les coûts et les vacanciers.</p>
      </div>
      ${recap}
      <div class="acts release-main-actions">
        ${hasSave ? '<button class="btn primary" data-act="continue">▶ Continuer ma partie</button>' : ''}
        <button class="btn ${hasSave ? '' : 'primary'}" data-act="new">⛺ Nouvelle partie</button>
        <button class="btn" data-act="import">📂 Charger / importer</button>
      </div>
      <h3 class="release-section-title">🆕 Nouveautés de la version ${RELEASE.version}</h3>
      <div class="release-cards">${RELEASE.highlights.map(([key,name,info])=>
        `<div class="release-card"><div class="release-card-art" data-ct-preview="${key}"></div>
          <div><b>${name}</b><small>${info}</small></div></div>`).join('')}</div>
      <div class="acts release-footer">
        <button class="btn blue" data-act="history">🗞️ Historique des versions</button>
        <button class="btn" data-act="check">🔄 Vérifier les mises à jour</button>
        <button class="btn" data-act="help">❓ Aide</button>
      </div><div id="updateStatus" class="update-status" role="status" aria-live="polite"></div>`,{
      continue: ()=>{closeModal();setSpeed(1);},
      new: ()=>newGameDialog(),
      import: ()=>importDialog(),
      help: ()=>helpDialog(()=>titleScreen(hasSave)),
      history: ()=>releaseHistory(()=>titleScreen(hasSave)),
      check: ()=>checkOnlineVersion()
    });
    releaseVisuals($('modalCard'));
  }


  function newGameDialog() {
    const launch=(mode)=>{
      const name=($('ngName').value||'').trim()||'Camping Les Flots Bleus';
      s=S.newGame({seed:(Date.now()%1e9)|0,name,mode});
      R.groundKey='';R.fit(s);closeModal();SV.autosave(s);setSpeed(1);
      s.rt.events.length=0;
      toast(mode==='discovery'?'Camp de découverte : 8 équipements V1.7–V1.8 installés !':`Bienvenue au ${s.name} !`,'good',8000);
      toast(mode==='discovery'?'Explore les 8 installations et profite du cinéma le soir, sans modifier les commandes.':
        'Trace des allées puis construis : tous les équipements doivent être reliés à l’entrée.','info',9000);
    };
    modal(`<h2>⛺ Nouvelle partie</h2>
      <p>Nom de ton camping :</p><input type="text" id="ngName" maxlength="32" value="Camping Les Flots Bleus">
      <p class="note">${SV.hasAuto()?'<b>Attention : cette nouvelle partie remplacera la sauvegarde actuelle. Exporte-la d’abord.</b>':'Trésorerie de départ : 30 000 €.'}</p>
      <div class="start-modes">
        <div class="start-mode"><b>⛺ Camping classique</b>
        <p>Le camping de départ habituel, à développer saison après saison.</p>
        <button class="btn primary" data-act="go">Démarrer normalement</button></div>
        <div class="start-mode discovery"><b>🎨 Camp découverte · V${RELEASE.version}</b>
        <p>Les 8 nouveautés V1.7 et V1.8 sont déjà installées sur la carte : mini-golf, multisports, vélos, laverie, boulodrome, cinéma, boulangerie et spa.</p>
        <button class="btn blue" data-act="demo">Découvrir les nouveautés</button></div>
      </div><div class="acts"><button class="btn" data-act="back">← Retour</button></div>`,{
        go:()=>launch('normal'),demo:()=>launch('discovery'),back:()=>titleScreen(SV.hasAuto())
      });
  }

  function helpDialog(back) {
    modal(`<h2>Comment jouer</h2>
      <p><b>La boucle :</b> aménager → recevoir des réservations → accueillir → gérer le séjour → encaisser → entretenir et investir.</p>
      <p>🟫 <b>Allées</b> : glissez pour tracer. Les vacanciers et le personnel ne marchent <i>que</i> sur les allées, et chaque bâtiment doit en toucher une.</p>
      <p>⛺ <b>Hébergements</b> : les tentes et caravanes ne s’affichent que lorsqu’un client occupe la parcelle. Les mobil-homes demandent un ménage entre deux séjours.</p>
      <p>📅 <b>Réservations</b> : les clients réservent à l’avance (acompte de 30 %, solde à l’arrivée). Familles le samedi pour une semaine, couples pour quelques nuits, itinérants souvent sans réserver.</p>
      <p>🏷️ <b>Tarifs</b> : trop cher, les demandes fondent ; trop bon marché, vous laissez de l’argent sur la table. Le classement ★ relève le prix accepté.</p>
      <p>👷 <b>Équipe</b> : accueil (files plus rapides), entretien (sanitaires, mobil-homes), maintenance (pannes, piscine). Contrats saisonniers payés chaque jour.</p>
      <p>🎲 <b>Décisions</b> : des événements surgissent (inspection, tour-opérateur, concurrent, motards…) : à vous de trancher.</p>
      <p>⬆️ <b>Améliorations</b> : sélectionnez un bâtiment pour le passer au niveau 2 (mobil-home Premium, toboggan, sanitaires Confort…).</p>
      <p>💬 <b>Avis</b> : chaque client raconte son séjour. Lisez-les pour savoir quoi améliorer.</p>
      <p>🎤 <b>Animations</b> : une scène + un animateur = club enfants et spectacle du soir. L’onglet 🎯 Direction permet de choisir une programmation avec de vrais coûts et effets sur les clients.</p>
      <p>📣 <b>Publicité</b> : les campagnes de l’onglet Direction augmentent temporairement les demandes de réservations, en échange d’un budget contrôlé.</p>
      <p>🍿 <b>Loisirs V1.8</b> : cinéma plein air, boulangerie, pétanque et spa. Il faut des allées et tenir compte des horaires et de la météo.</p>
      <p>🏦 <b>Banque</b> (onglet Finances) : empruntez pour investir plus vite, remboursement quotidien.</p>
      <p>☀️ <b>Météo</b> : canicule = piscine bondée ; pluie = tentes mécontentes ; orage = piscine fermée et pannes.</p>
      <p>⌨️ Espace : pause · 1-3 : vitesse · Échap : annuler l’outil · molette / pincement : zoom.</p>
      <div class="acts"><button class="btn primary" data-act="ok">Compris</button></div>`, { ok: () => (back ? back() : closeModal()) });
  }

  /* ================= Boucle ================= */
  function frame(now) {
    const dt = Math.min(0.25, (now - ui.last) / 1000); ui.last = now;
    if (s && s.phase === 'season' && ui.speed > 0 && $('modal').classList.contains('hidden')) {
      let rate = SPEEDS[ui.speed];
      const m = s.minute;
      if (s.settings.nightFast && (m >= 23 * 60 || m < 6 * 60)) rate *= 6;
      ui.acc += dt * rate;
      let n = Math.floor(ui.acc);
      if (n > 400) { n = 400; ui.acc = 400; }
      for (let i = 0; i < n && s.phase === 'season'; i++) S.tick(s);
      ui.acc -= n;
    }
    const frac = Math.max(0, Math.min(1, ui.acc));
    R.sel = ui.sel && s.buildings.includes(ui.sel) ? ui.sel : null;
    R.draw(s, frac, now);
    // événements
    while (s.rt.events.length) handleEvent(s.rt.events.shift());
    if (now - (ui.ambT || 0) > 150) { ui.ambT = now; CT.sfx.ambience(s, ui.speed > 0 && $('modal').classList.contains('hidden')); }
    // HUD
    if (now - ui.panelTick > 400) {
      ui.panelTick = now; hud(); tutoTick();
      if (ui.tab && ui.tab !== 'prices' && (ui.tab !== 'life' || now - (ui.lastLifeRender||0) > 1700)) {
        renderPanel(); if (ui.tab === 'life') ui.lastLifeRender = now;
      }
      if (ui.sel) renderInspector();
    }
    // sauvegarde auto : chaque jour de jeu et toutes les 45 s
    const dayKey = s.year * 1000 + s.day;
    if (dayKey !== ui.lastDay || now - ui.lastSave > 45000) { if (ui.lastDay !== -1) SV.autosave(s); ui.lastDay = dayKey; ui.lastSave = now; }
    requestAnimationFrame(frame);
  }

  function handleEvent(e) {
    if (e.type === 'season-end') { R.groundKey = ''; CT.sfx.play('season'); showReport(e.report); return; }
    if (e.type === 'decision') { showDecision(); return; }
    if (e.type === 'goal') CT.sfx.play('goal'); else if (e.type === 'bad') CT.sfx.play('bad');
    if (e.text.startsWith('Avis') && e.type !== 'bad') return;
    if (e.type === 'info' && /présenté/.test(e.text)) return;
    toast(e.text, e.type);
  }

  /* ================= HUD ================= */
  function hud() {
    $('campName').textContent = s.name;
    $('date').textContent = s.phase === 'winter' ? `Hiver · fin de saison ${s.year}` : `${S.fmtDate(s)} · an ${s.year}`;
    $('clock').textContent = s.phase === 'winter' ? '❄️' : S.fmtTime(s.minute);
    const wx = s.weather || { type: 'cloud', temp: 8 };
    $('wxIcon').textContent = s.phase === 'winter' ? '❄️' : D.WEATHER[wx.type].icon;
    $('wxTemp').textContent = s.phase === 'winter' ? '4 °C' : wx.temp + ' °C';
    $('weatherChip').title = s.phase === 'winter' ? 'Hors saison' : `${D.WEATHER[wx.type].name}, ${wx.temp} °C — prévisions : ` + s.forecast.map((f) => `${D.WEATHER[f.type].name} ${f.temp} °C`).join(' / ');
    $('forecast').innerHTML = s.phase === 'winter' ? '' : s.forecast.map((f) => `<span>${D.WEATHER[f.type].icon}${f.temp}°</span>`).join('');
    $('cash').textContent = eur(s.fin.cash);
    $('cashChip').classList.toggle('neg', s.fin.cash < 0);
    $('rep').textContent = Math.round(s.reputation);
    $('repBar').style.width = s.reputation + '%';
    $('stars').textContent = '★'.repeat(s.stars) + '☆'.repeat(5 - s.stars);
    const o = S.occupancy(s);
    $('occ').textContent = `${o.used}/${o.total}`;
    document.querySelectorAll('.speeds button').forEach((b) => b.classList.toggle('on', +b.dataset.speed === ui.speed));
    $('winterBar').classList.toggle('hidden', s.phase !== 'winter');
    $('soundBtn').textContent = s.settings.sound === false ? '🔇' : '🔊';
    if (s.phase === 'winter') $('openSeason').textContent = `Ouvrir la saison ${s.year + 1} ▶`;
  }

  function setSpeed(v) { ui.speed = v; hud(); }

  /* ================= Toasts & modales ================= */
  function toast(text, type = 'info', ms = 5200) {
    const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = text;
    const box = $('toasts'); box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), ms);
  }
  let modalActs = {};
  function modal(html, acts) { $('modalCard').innerHTML = html; modalActs = acts || {}; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  $('modal').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && modalActs[b.dataset.act]) modalActs[b.dataset.act](b); });

  function hint(t) { const h = $('hint'); if (!t) { h.classList.add('hidden'); return; } h.textContent = t; h.classList.remove('hidden'); }

  /* ================= Outils ================= */
  function setTool(tool, item) {
    ui.tool = tool; ui.item = item || null; ui.ghostAt = null; R.ghost = null;
    document.querySelectorAll('#tools .tool[data-tool], #tools .tool.cat').forEach((b) => b.classList.remove('active'));
    const btn = document.querySelector(`#tools [data-tool="${tool}"]`);
    if (btn) btn.classList.add('active');
    if (tool === 'build' || tool === 'deco') { const cat = tool === 'deco' ? 'deco' : D.BUILDINGS[item].cat; document.querySelector(`#tools [data-cat="${cat}"]`).classList.add('active'); }
    $('view').classList.toggle('building', tool !== 'select');
    const touch = matchMedia('(pointer: coarse)').matches;
    if (tool === 'path') hint(touch ? 'Glissez un doigt pour tracer une allée (15 €/case). Deux doigts pour déplacer la vue.' : 'Cliquez-glissez pour tracer une allée (15 €/case). Clic droit ou Échap pour quitter.');
    else if (tool === 'demolish') hint('Touchez un bâtiment, une allée ou un élément de décor pour le retirer.');
    else if (tool === 'build') hint(`${D.BUILDINGS[item].name} — ${touch ? 'touchez pour placer, touchez à nouveau pour confirmer' : 'cliquez pour construire'}. Doit toucher une allée.`);
    else if (tool === 'deco') hint(`${D.DECOR_TOOLS[item].name} (${D.DECOR_TOOLS[item].cost} €) — ${touch ? 'touchez ou glissez' : 'cliquez ou glissez'} pour planter.`);
    else hint(null);
    if (tool !== 'select') { ui.sel = null; $('inspector').classList.add('hidden'); }
  }

  function openFlyout(cat) {
    const fl = $('flyout');
    if (!fl.classList.contains('hidden') && fl.dataset.cat === cat) { fl.classList.add('hidden'); return; }
    fl.dataset.cat = cat; fl.innerHTML = '';
    if (cat === 'deco') {
      for (const k in D.DECOR_TOOLS) {
        const T = D.DECOR_TOOLS[k];
        const el = document.createElement('button'); el.className = 'item' + (ui.item === k ? ' active' : '');
        el.appendChild(CT.drawDecoIcon(T.deco));
        el.insertAdjacentHTML('beforeend', `<b>${T.name}</b><small>${T.cost} €</small>`);
        el.onclick = () => { setTool('deco', k); fl.classList.add('hidden'); };
        fl.appendChild(el);
      }
    } else {
      for (const k in D.BUILDINGS) {
        const B = D.BUILDINGS[k]; if (B.cat !== cat) continue;
        const el = document.createElement('button'); el.className = 'item' + (s.fin.cash < B.cost ? ' poor' : '');
        el.title = B.desc;
        el.appendChild(CT.drawSpriteIcon(k));
        el.insertAdjacentHTML('beforeend', `<b>${B.name}</b><small>${eur(B.cost)}${B.build ? ' · ' + B.build + ' j' : ''}</small>`);
        el.onclick = () => { setTool('build', k); fl.classList.add('hidden'); };
        fl.appendChild(el);
      }
    }
    fl.classList.remove('hidden');
  }

  function ghostFor(tx, ty) {
    if (ui.tool === 'build') {
      const def = D.BUILDINGS[ui.item];
      const x = tx - Math.floor((def.w - 1) / 2), y = ty - Math.floor((def.h - 1) / 2);
      const c = S.canPlace(s, ui.item, x, y);
      const tiles = []; for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) tiles.push([x + i, y + j]);
      const label = c.ok ? `${eur(c.cost)}${c.access ? '' : ' · ⚠ pas d’allée'}` : c.why;
      return { x, y, ok: c.ok, tiles, rect: { x, y, w: def.w, h: def.h }, label };
    }
    if (ui.tool === 'path' || ui.tool === 'deco' || ui.tool === 'demolish') {
      const b = ui.tool === 'demolish' ? S.buildingAt(s, tx, ty) : null;
      if (b) return { ok: true, tiles: [], rect: { x: b.x, y: b.y, w: b.w, h: b.h }, label: `Démolir (+${eur(D.BUILDINGS[b.type].cost * D.DEMOLISH_REFUND)})` };
      return { ok: tx >= 2 && tx < s.w && ty >= 0 && ty < s.h, tiles: [[tx, ty]], rect: null, label: ui.tool === 'path' ? '15 €' : null };
    }
    return null;
  }

  function applyTool(tx, ty, drag) {
    if (ui.tool === 'path') {
      const r = S.buildPath(s, tx, ty);
      if (!r.ok && r.why === 'Trésorerie insuffisante' && !drag) { toast('Trésorerie insuffisante.', 'bad'); CT.sfx.play('error'); }
      if (r.ok) CT.sfx.play('path');
      return r.ok;
    }
    if (ui.tool === 'deco') { const r = S.placeDeco(s, ui.item, tx, ty); if (!r.ok && r.why && !drag) { toast(r.why, 'bad'); CT.sfx.play('error'); } if (r.ok) CT.sfx.play('plant'); return r.ok; }
    if (ui.tool === 'demolish') {
      const r = S.demolish(s, tx, ty);
      if (!r.ok && r.why) { toast(r.why, 'warn'); CT.sfx.play('error'); }
      else if (r.ok) { CT.sfx.play('demolish'); if (r.refund) toast(`Démoli : +${eur(r.refund)} récupérés.`, 'info'); }
      return r.ok;
    }
    if (ui.tool === 'build') {
      const gh = ghostFor(tx, ty);
      const r = S.build(s, ui.item, gh.x, gh.y);
      if (!r.ok) { toast(r.why, 'bad'); CT.sfx.play('error'); return false; }
      CT.sfx.play('build');
      const def = D.BUILDINGS[ui.item];
      if (!r.access) toast(`${def.name} posé(e) mais non relié(e) à une allée : tracez un chemin jusqu’à lui !`, 'warn', 7000);
      else toast(`${def.name} : ${s.phase === 'winter' ? 'livré à l’ouverture' : `chantier lancé (${def.build} j)`}.`, 'good');
      return true;
    }
    return false;
  }

  /* ================= Entrées ================= */
  function bindInput() {
    const cv = $('view');
    const ptrs = new Map();
    let mode = null, startX = 0, startY = 0, camX = 0, camY = 0, moved = false, pinch = null, lastTile = null, pType = 'mouse';
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    cv.addEventListener('contextmenu', (e) => { e.preventDefault(); setTool('select'); });
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      const p = pos(e); ptrs.set(e.pointerId, p); pType = e.pointerType;
      $('flyout').classList.add('hidden');
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: R.cam.z, cx: R.cam.x, cy: R.cam.y };
        mode = 'pinch'; return;
      }
      if (e.button === 2) return;
      startX = p.x; startY = p.y; camX = R.cam.x; camY = R.cam.y; moved = false;
      const paint = (ui.tool === 'path' || ui.tool === 'deco' || (ui.tool === 'demolish' && pType === 'mouse'));
      mode = paint && (pType !== 'mouse' || e.button === 0) ? 'paint' : 'pan';
      if (e.button === 1) mode = 'pan';
      if (mode === 'paint') { const t = R.toTile(p.x, p.y); lastTile = t.x + ',' + t.y; if (pType === 'mouse') applyTool(t.x, t.y, false); else ui.pendingPaint = t; }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
      if (mode === 'pinch' && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const wx = pinch.mx / pinch.z + pinch.cx, wy = pinch.my / pinch.z + pinch.cy;
        R.cam.z = Math.max(0.35, Math.min(3, pinch.z * d / pinch.d));
        R.cam.x = wx - mx / R.cam.z; R.cam.y = wy - my / R.cam.z; R.clamp(s);
        ui.pendingPaint = null;
        return;
      }
      const t = R.toTile(p.x, p.y);
      if (mode === 'pan') {
        if (Math.hypot(p.x - startX, p.y - startY) > 6) moved = true;
        if (moved) { R.cam.x = camX - (p.x - startX) / R.cam.z; R.cam.y = camY - (p.y - startY) / R.cam.z; R.clamp(s); }
      } else if (mode === 'paint') {
        if (ui.pendingPaint) { applyTool(ui.pendingPaint.x, ui.pendingPaint.y, false); ui.pendingPaint = null; }
        const k = t.x + ',' + t.y;
        if (k !== lastTile) {
          // interpolation pour ne pas sauter de case
          const [lx, ly] = lastTile.split(',').map(Number);
          const n = Math.max(Math.abs(t.x - lx), Math.abs(t.y - ly));
          for (let i = 1; i <= n; i++) {
            const ix = Math.round(lx + (t.x - lx) * i / n), iy = Math.round(ly + (t.y - ly) * i / n);
            if (ui.tool === 'path' && i > 0) { const px = Math.round(lx + (t.x - lx) * (i - 1) / n), py = Math.round(ly + (t.y - ly) * (i - 1) / n); if (px !== ix && py !== iy) applyTool(ix, py, true); }
            applyTool(ix, iy, true);
          }
          lastTile = k;
        }
      }
      if (pType === 'mouse' && ui.tool !== 'select') { R.ghost = ghostFor(t.x, t.y); }
    });
    const up = (e) => {
      const p = pos(e);
      const wasPinch = mode === 'pinch';
      ptrs.delete(e.pointerId);
      if (wasPinch) { if (ptrs.size === 0) mode = null; return; }
      if (mode === 'pan' && !moved) click(p.x, p.y, e.pointerType);
      if (mode === 'paint' && ui.pendingPaint) { applyTool(ui.pendingPaint.x, ui.pendingPaint.y, false); ui.pendingPaint = null; }
      mode = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); mode = null; ui.pendingPaint = null; });
    cv.addEventListener('pointerleave', () => { if (pType === 'mouse' && ui.tool !== 'build') R.ghost = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); R.zoomAt(s, Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); setSpeed(ui.speed ? 0 : 1); }
      else if (e.key >= '1' && e.key <= '3') setSpeed(+e.key);
      else if (e.key === 'Escape') { setTool('select'); closePanel(); $('flyout').classList.add('hidden'); ui.sel = null; $('inspector').classList.add('hidden'); }
      else if (e.key === '+' || e.key === '=') R.zoomAt(s, 1.2, R.vw / 2, R.vh / 2);
      else if (e.key === '-') R.zoomAt(s, 1 / 1.2, R.vw / 2, R.vh / 2);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && s) SV.autosave(s); });
    window.addEventListener('pagehide', () => { if (s) SV.autosave(s); });
  }

  function click(sx, sy, ptype) {
    const t = R.toTile(sx, sy);
    if (ui.tool === 'select') {
      const b = S.buildingAt(s, t.x, t.y);
      ui.sel = b || null;
      if (b) renderInspector(); else $('inspector').classList.add('hidden');
      return;
    }
    if (ui.tool === 'build') {
      if (ptype !== 'mouse') {
        const gh = ghostFor(t.x, t.y);
        const prev = R.ghost;
        const inside = prev && prev.rect && t.x >= prev.rect.x && t.x < prev.rect.x + prev.rect.w && t.y >= prev.rect.y && t.y < prev.rect.y + prev.rect.h;
        if (inside && ui.ghostAt) { if (applyTool(ui.ghostAt.x, ui.ghostAt.y)) { R.ghost = null; ui.ghostAt = null; } return; }
        R.ghost = gh; ui.ghostAt = t;
        return;
      }
      applyTool(t.x, t.y);
      R.ghost = ghostFor(t.x, t.y);
      return;
    }
    if (ui.tool === 'demolish') applyTool(t.x, t.y);
  }

  /* ================= Boutons ================= */
  function bindUI() {
    document.querySelectorAll('.speeds button').forEach((b) => (b.onclick = () => setSpeed(+b.dataset.speed)));
    document.querySelectorAll('#tools [data-tool]').forEach((b) => (b.onclick = () => { $('flyout').classList.add('hidden'); setTool(b.dataset.tool); }));
    document.querySelectorAll('#tools [data-cat]').forEach((b) => (b.onclick = () => openFlyout(b.dataset.cat)));
    document.querySelectorAll('#tools [data-tab]').forEach((b) => (b.onclick = () => { $('flyout').classList.add('hidden'); ui.tab === b.dataset.tab ? closePanel() : openPanel(b.dataset.tab); }));
    $('pclose').onclick = closePanel;
    const unlock = () => { CT.sfx.setEnabled(s ? s.settings.sound !== false : true); CT.sfx.init(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    $('soundBtn').onclick = () => { s.settings.sound = !s.settings.sound; CT.sfx.setEnabled(s.settings.sound); hud(); if (s.settings.sound) CT.sfx.play('click'); };
    document.querySelectorAll('#tools button').forEach((b) => b.addEventListener('click', () => CT.sfx.play('click')));
    $('menuBtn').onclick = menu;
    $('openSeason').onclick = () => { if (S.startSeason(s)) { R.groundKey = ''; SV.autosave(s); setSpeed(1); toast(`Saison ${s.year} : ${s.bookings.length} réservations déjà enregistrées !`, 'good'); } };
    $('importFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { loadGame(await f.text()); } catch (err) { toast('Import impossible : ' + err.message, 'bad', 8000); }
      e.target.value = '';
    };
    $('cashChip').onclick = () => openPanel('finance');
    $('weatherChip').onclick = () => toast($('weatherChip').title, 'info', 7000);
  }

  function loadGame(json) {
    s = SV.deserialize(json);
    R.groundKey = ''; R.fit(s); ui.sel = null; closeModal(); SV.autosave(s);
    toast(`Partie « ${s.name} » chargée.`, 'good'); setSpeed(0); hud();
  }

  function menu() {
    setSpeed(0);
    modal(`<h2>☰ Menu</h2>
      <div class="acts" style="flex-direction:column;align-items:stretch">
        <button class="btn primary" data-act="resume">▶ Reprendre</button>
        <button class="btn blue" data-act="director">🎯 Bureau du directeur</button>
        <button class="btn" data-act="life">🌞 Vie du camping</button>
        <button class="btn" data-act="save">💾 Sauvegarder maintenant</button>
        <button class="btn" data-act="export">📤 Exporter la partie (.json)</button>
        <button class="btn" data-act="import">📂 Importer une partie</button>
        <button class="btn" data-act="rename">✏️ Renommer le camping</button>
        <button class="btn" data-act="night">🌙 Nuits accélérées : ${s.settings.nightFast ? 'oui' : 'non'}</button>
        <button class="btn" data-act="sound">${s.settings.sound === false ? '🔇' : '🔊'} Sons : ${s.settings.sound === false ? 'non' : 'oui'}</button>
        <button class="btn" data-act="help">❓ Comment jouer</button>
        <button class="btn" data-act="history">🗞️ Versions et nouveautés — v${RELEASE.version}</button>
        <button class="btn" data-act="updates">🔄 Rechercher une mise à jour</button>
        <button class="btn red" data-act="new">⛺ Nouvelle partie</button>
      </div>
      <p style="font-size:12px;opacity:.7;margin-top:12px">Camping Tycoon v${RELEASE.version} · JLG Creative · sauvegarde automatique chaque jour de jeu.</p>
      <div id="updateStatus" class="update-status" role="status" aria-live="polite"></div>`, {
      resume: () => { closeModal(); setSpeed(1); },
      director: () => { closeModal(); openPanel('director'); },
      life: () => { closeModal(); openPanel('life'); },
      save: () => { toast(SV.autosave(s) ? 'Partie sauvegardée.' : 'Stockage local indisponible : utilisez l’export.', SV.hasAuto() ? 'good' : 'warn'); closeModal(); },
      export: exportDialog,
      import: importDialog,
      rename: () => modal(`<h2>Renommer</h2><input type="text" id="rn" maxlength="32" value="${esc(s.name)}"><div class="acts"><button class="btn primary" data-act="ok">Valider</button></div>`, { ok: () => { s.name = ($('rn').value || '').trim() || s.name; closeModal(); hud(); } }),
      night: () => { s.settings.nightFast = !s.settings.nightFast; menu(); },
      sound: () => { s.settings.sound = s.settings.sound === false; CT.sfx.setEnabled(s.settings.sound); menu(); },
      help: () => helpDialog(menu),
      updates: ()=>checkOnlineVersion(),
      history: ()=>releaseHistory(menu),
      new: newGameDialog
    });
  }

  function exportDialog() {
    const json = SV.serialize(s);
    const fname = `camping-tycoon-${s.name.replace(/[^\w]+/g, '-').toLowerCase()}-an${s.year}.json`;
    let downloaded = false;
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = fname;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); downloaded = true;
    } catch (e) { downloaded = false; }
    modal(`<h2>📤 Exporter</h2>
      <p>${downloaded ? `Si votre navigateur l’autorise, le fichier <b>${esc(fname)}</b> vient d’être téléchargé.` : ''} Si le téléchargement est bloqué (version en ligne), copiez le texte ci-dessous et gardez-le précieusement :</p>
      <textarea id="exp" readonly>${esc(json)}</textarea>
      <div class="acts"><button class="btn primary" data-act="copy">📋 Copier</button><button class="btn" data-act="close">Fermer</button></div>`, {
      copy: async () => { try { await navigator.clipboard.writeText(json); toast('Sauvegarde copiée dans le presse-papiers.', 'good'); } catch (e) { $('exp').select(); document.execCommand('copy'); toast('Sauvegarde copiée.', 'good'); } },
      close: closeModal
    });
  }
  function importDialog() {
    modal(`<h2>📂 Importer</h2>
      <p>Choisissez un fichier <b>.json</b> exporté depuis Camping Tycoon, ou collez son contenu :</p>
      <div class="acts"><button class="btn primary" data-act="file">Choisir un fichier…</button></div>
      <textarea id="imp" placeholder='{"game":"camping-tycoon", …}'></textarea>
      <div class="acts"><button class="btn blue" data-act="paste">Charger le texte collé</button><button class="btn" data-act="close">Annuler</button></div>`, {
      file: () => $('importFile').click(),
      paste: () => { try { loadGame($('imp').value); } catch (e) { toast('Import impossible : ' + e.message, 'bad', 8000); } },
      close: () => (s ? closeModal() : titleScreen(false))
    });
  }

  /* ================= Panneaux ================= */
  const TITLES = { director: '🎯 Direction', life: '🌞 Vie du camping', reviews: '💬 Avis des vacanciers', bookings: '📅 Réservations', prices: '🏷️ Tarifs', staff: '👷 Équipe', finance: '📊 Finances', goals: '🏆 Objectifs & classement', log: '📰 Journal du camping' };
  function openPanel(tab) {
    ui.tab = tab; $('panel').classList.remove('hidden'); $('ptitle').textContent = TITLES[tab];
    document.querySelectorAll('#tools [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (matchMedia('(max-width: 760px)').matches) { ui.sel = null; $('inspector').classList.add('hidden'); }
    renderPanel(true);
  }
  function closePanel() { ui.tab = null; $('panel').classList.add('hidden'); document.querySelectorAll('#tools [data-tab]').forEach((b) => b.classList.remove('active')); }

  function renderPanel(force) {
    const body = $('pbody');
    if (!force && body.contains(document.activeElement) && document.activeElement.tagName !== 'BODY' && document.activeElement.tagName !== 'BUTTON') return;
    const scroll = body.scrollTop;
    const fn = { director: pDirector, life: pLife, reviews: pReviews, bookings: pBookings, prices: pPrices, staff: pStaff, finance: pFinance, goals: pGoals, log: pLog }[ui.tab];
    if (!fn) return;
    body.innerHTML = fn();
    body.scrollTop = scroll;
    if (ui.tab === 'finance') drawSpark();
    bindPanel();
  }

  const PROF = (p) => D.PROFILES[p].icon;
  const TYPE_NAME = { tent: 'Tente', caravan: 'Caravane', mobilhome: 'Mobil-home' };
  const satColor = (v) => (v >= 70 ? '#2f9e6b' : v >= 45 ? '#f2a516' : '#e8553d');



  function pDirector() {
    const outlook=S.bookingOutlook(s,14),stats=s.stats,active=S.campaignStatus(s);
    let h=`<div class="director-intro"><b>🎯 Bureau du directeur</b>
      <small>Remplissage, publicité, animation et suivi de l'exploitation.</small></div>
      <div class="kpis"><div class="kpi"><b>${pct(outlook.occupancy)}</b><small>nuits réservées /14 j</small></div>
        <div class="kpi"><b>${eur(outlook.contracted)}</b><small>CA contractuel /14 j</small></div>
        <div class="kpi"><b>${outlook.riskBookings}</b><small>réservations à risque</small></div></div>
      <div class="kpis" style="margin-top:6px"><div class="kpi"><b>${eur(outlook.balancesDue)}</b><small>soldes attendus</small></div>
        <div class="kpi"><b>${eur(outlook.fixedCosts)}</b><small>charges fixes prévues*</small></div>
        <div class="kpi"><b>${eur(outlook.loanCosts)}</b><small>crédit à décaisser</small></div></div>
      <p class="note">* Prévision indicative sur les contrats existants. Elle exclut futures ventes, météo, pannes et nouveaux recrutements.</p>
      <h3>📣 Campagnes de réservation</h3>`;
    if(s.phase!=='season')h+='<p class="note">Campagnes commerciales disponibles à l’ouverture de la saison.</p>';
    else if(active)h+=`<div class="director-active"><b>📣 ${active.label}</b>
      <small>Encore ${active.remaining} jour(s) · demande ×${active.mult.toFixed(2)}
      du ${S.dateParts(active.from).d} ${S.dateParts(active.from).m} au ${S.dateParts(active.until).d} ${S.dateParts(active.until).m}</small></div>`;
    else h+='<p class="note">Une seule campagne à la fois. Son coût est débité immédiatement. Son effet est limité aux demandes de la période.</p>';
    for(const [kind,cfg] of Object.entries(S.MARKETING)){
      h+=`<div class="director-option"><div><b>${cfg.label}</b>
        <small>${cfg.days} jours · demande ×${cfg.mult.toFixed(2)}</small></div>
        <button class="btn small" data-campaign="${kind}" ${active||s.phase!=='season'||s.fin.cash<cfg.cost?'disabled':''}>${eur(cfg.cost)}</button></div>`;
    }
    h+=`<p class="director-metric">${stats.marketingCampaigns||0} campagne(s) · ${eur(stats.marketingSpent||0)} investis cette saison</p>
      <h3>🎤 Programmation du camping</h3>
      <p class="note">Une scène accessible, un animateur et la météo adaptée sont nécessaires. Le coût est débité uniquement les jours où une animation est effectivement organisée.</p>`;
    for(const [kind,cfg] of Object.entries(S.PROGRAMS)){
      h+=`<button class="director-program ${(s.program||'family')===kind?'active':''}" data-program="${kind}">
        <b>${cfg.label}</b><small>${cfg.cost===0?'Sans frais supplémentaires':eur(cfg.cost)+' / journée animée'}
        · familles ${cfg.family>=0?'+':''}${cfg.family} · couples ${cfg.couple>=0?'+':''}${cfg.couple} satisfaction</small></button>`;
    }
    h+=`<p class="director-metric">${stats.programEvents||0} journée(s) animée(s) · ${eur(stats.programCost||0)} engagés</p>
      <h3>📊 Bilan des activités</h3><div class="kpis">
        <div class="kpi"><b>${eur(stats.leisureRevenue||0)}</b><small>marge loisirs*</small></div>
        <div class="kpi"><b>${stats.requests||0}</b><small>demandes reçues</small></div>
        <div class="kpi"><b>${stats.lostFull||0}</b><small>refus faute de place</small></div></div>
      <p class="note">* Hors personnel et frais fixes. Une campagne augmente les demandes, pas automatiquement les ventes si le camping est complet.</p>`;
    return h;
  }

  function pLife() {
    const snap=S.guestSnapshot(s), counts=s.stats.leisureVisits || {}, rent=s.stats.leisureRevenue || 0;
    const kinds=['petanque','cinema','bakery','spa','minigolf','multisport','bikes','laundry'];
    const total=Object.values(counts).reduce((a,v)=>a+v,0);
    let h=`<div class="life-hero"><b>🏕️ ${s.mode==='discovery'?'Camp de découverte':'Le camping vivant'}</b>
      <p>Les vacanciers choisissent leurs activités selon la météo, leurs envies et les horaires. Chaque équipement a un coût et un effet sur la satisfaction.</p></div>
      <div class="kpis"><div class="kpi"><b>${snap.persons}</b><small>personnes présentes</small></div>
        <div class="kpi"><b>${Math.round(snap.mood)}/100</b><small>bien-être</small></div>
        <div class="kpi"><b>${snap.groupOutings}</b><small>sorties accompagnées</small></div></div>
      <div class="kpis" style="margin-top:6px"><div class="kpi"><b>${total}</b><small>visites aux nouveautés</small></div>
        <div class="kpi"><b class="${rent>=0?'pos':'neg'}">${eur(rent)}</b><small>marge loisirs*</small></div>
        <div class="kpi"><b>${snap.trips}</b><small>excursions totales</small></div></div>
      <h3>🎪 Nouveautés V1.8 et V1.7</h3>`;
    for(const type of kinds){
      const d=D.BUILDINGS[type], buildings=S.ofType(s,type), visits=counts[type]||0;
      const opened=buildings.filter(b=>S.activityOpen(s,b)).length;
      h+=`<div class="life-facility"><div class="life-facility-art" data-ct-preview="${type}"></div>
        <div class="life-facility-info"><b>${d.name}</b><small>${buildings.length} construit(s) · ${opened} actif(s) actuellement</small>
        <small>${visits} utilisations cette saison</small><small>${d.desc}</small></div>
        ${buildings.length?'<span class="tag good">Présent</span>':`<button class="btn small" data-quickbuild="${type}">Construire</button>`}</div>`;
    }
    h+=`<h3>🧭 Besoins des vacanciers</h3>
      <div class="kpis"><div class="kpi"><b>${snap.hungry}</b><small>ont faim</small></div>
        <div class="kpi"><b>${snap.tired}</b><small>fatigués</small></div>
        <div class="kpi"><b>${snap.unhappy}</b><small>en manque de loisirs</small></div></div>
      <p class="note">* Marge directe : recettes moins coûts immédiats des prestations, hors personnel, entretien quotidien et coût de construction.</p>`;
    return h;
  }

  function pBookings() {
    if (s.phase === 'winter') return `<p class="note">Hors saison : les réservations de la saison ${s.year + 1} s’ouvriront dès que vous lancerez la saison.</p>`;
    const sum = S.summary(s), o = sum.occ;
    const today = s.bookings.filter((b) => b.arrive === s.day && (b.status === 'booked' || b.status === 'onsite'));
    const leaving = s.bookings.filter((b) => b.depart === s.day && (b.status === 'onsite' || b.status === 'done'));
    let h = `<div class="kpis"><div class="kpi"><b>${o.used}/${o.total}</b><small>occupés ce soir</small></div><div class="kpi"><b>${sum.persons}</b><small>vacanciers / ${o.cap} places</small></div><div class="kpi"><b style="color:${sum.satAvg == null ? 'inherit' : satColor(sum.satAvg)}">${sum.satAvg == null ? '—' : Math.round(sum.satAvg)}</b><small>satisfaction</small></div></div>`;
    const pulse = S.guestSnapshot(s);
    h += `<h3>🌿 La vie du camping</h3>
      <div class="kpis"><div class="kpi"><b>${pulse.outside}/${pulse.persons}</b><small>vacanciers en activité</small></div>
      <div class="kpi"><b style="color:${satColor(pulse.mood)}">${pulse.persons ? Math.round(pulse.mood) : '—'}/100</b><small>bien-être moyen</small></div>
      <div class="kpi"><b>${pulse.groupOutings}</b><small>sorties accompagnées saison</small></div></div>
      <p class="note">${pulse.hungry ? '🥪 ' + pulse.hungry + ' ont faim · ' : ''}${pulse.tired ? '😴 ' + pulse.tired + ' fatigués · ' : ''}${pulse.unhappy ? '🎲 ' + pulse.unhappy + ' manquent de loisirs · ' : ''}
      ${Object.entries(pulse.activities).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v]) => ({sanitary:'douches',shop:'épicerie',snack:'snack',pool:'piscine',playground:'jeux',stage:'animations',walk:'promenades'}[k] || k) + ' : ' + v).join(' · ') || 'Premières activités en préparation…'}</p>`;
    const outlook = S.bookingOutlook(s, 14);
    h += `<p class="note">📊 Sur les ${outlook.days} prochains jours : <b>${pct(outlook.occupancy)} d'occupation confirmée</b> · <b>${eur(outlook.contracted)}</b> de nuitées contractées · ${outlook.unbookedNights} nuits encore libres.${outlook.riskBookings ? ' ⚠️ ' + outlook.riskBookings + ' réservation(s) sur un hébergement en panne ou inaccessible.' : ''}</p>`;
    // calendrier 14 jours par type
    const types = ['tent', 'caravan', 'mobilhome'].filter((t) => S.units(s).some((u) => D.BUILDINGS[u.type].unitType === t));
    h += `<h3>Remplissage des 14 prochains jours</h3><div class="cal"><span></span>`;
    for (let d = 0; d < 14; d++) h += `<span class="h">${S.dateParts(s.day + d).d}</span>`;
    for (const t of types) {
      const us = S.units(s).filter((u) => D.BUILDINGS[u.type].unitType === t);
      h += `<b>${TYPE_NAME[t].slice(0, 6)}</b>`;
      for (let d = 0; d < 14; d++) {
        const day = s.day + d;
        const n = s.bookings.filter((b) => (b.status === 'booked' || b.status === 'onsite') && b.type === t && b.arrive <= day && day < b.depart).length;
        const r = us.length ? n / us.length : 0;
        h += `<span class="c" title="${n}/${us.length}" style="background:hsl(${120 - r * 120},70%,${88 - r * 30}%)"></span>`;
      }
    }
    h += `</div>`;
    const mods = (s.mods || []).filter((m) => m.kind === 'demand' && m.until >= s.day);
    if (mods.length) h += `<p class="note">📣 ${mods.map((m) => `${m.label || 'Effet'} : demande ×${m.mult.toFixed(2)} jusqu’au ${S.dateParts(m.until).d} ${S.dateParts(m.until).m}`).join('<br>📣 ')}</p>`;
    const st = s.stats;
    h += `<p class="note">Demandes cette saison : <b>${st.requests}</b> · refusées faute de place : <b>${st.lostFull}</b> · trouvées trop chères : <b>${st.lostPrice}</b>. ${st.lostFull > st.requests * 0.3 ? '👉 La demande dépasse votre capacité : construisez !' : st.lostPrice > st.requests * 0.25 ? '👉 Beaucoup de clients trouvent vos tarifs trop élevés.' : ''}</p>`;
    h += `<h3>🛬 Arrivées du jour (${today.length})</h3><div class="list">`;
    h += today.map((b) => bookingRow(b, b.status === 'onsite' ? '<span class="tag good">installés</span>' : `<span class="tag">${S.fmtTime(b.arrTime)}</span>`)).join('') || '<small>Aucune arrivée prévue.</small>';
    h += `</div><h3>🛫 Départs du jour (${leaving.length})</h3><div class="list">`;
    h += leaving.map((b) => bookingRow(b, b.status === 'done' ? `<span class="tag">${'★'.repeat(Math.round(b.rating || 0))}</span>` : `<span class="tag warn">${S.fmtTime(b.depTime)}</span>`)).join('') || '<small>Aucun départ.</small>';
    const next = s.bookings.filter((b) => b.status === 'booked' && b.arrive > s.day && b.arrive <= s.day + 7).sort((a, b) => a.arrive - b.arrive).slice(0, 30);
    h += `</div><h3>📆 Prochaines arrivées (7 j)</h3><div class="list">` + (next.map((b) => bookingRow(b, `<span class="tag">${S.dateParts(b.arrive).d} ${S.dateParts(b.arrive).m.slice(0, 4)}.</span>`)).join('') || '<small>Rien pour l’instant.</small>') + '</div>';
    const on = s.bookings.filter((b) => b.status === 'onsite').sort((a, b) => a.sat - b.sat);
    h += `<h3>🏕️ Sur place (${on.length}) — du moins au plus satisfait</h3><div class="list">` + on.map((b) => bookingRow(b, `<div class="meter" title="Satisfaction ${Math.round(b.sat)}"><i style="width:${b.sat}%;background:${satColor(b.sat)}"></i></div>`)).join('') + '</div>';
    return h;
  }
  function bookingRow(b, right) {
    const u = S.byId(s, b.unit);
    return `<div class="row"><span style="font-size:18px">${PROF(b.profile)}</span><div class="grow"><b>${esc(b.name)} · ${b.size} pers.${b.walkin ? ' · sans résa' : ''}</b><small>${TYPE_NAME[b.type]} n°${u ? u.num : '?'} · ${b.nights} nuit${b.nights > 1 ? 's' : ''} · ${eur2(b.total)}</small></div>${right}</div>`;
  }

  function pPrices() {
    const cl = S.classement(s);
    const mult = 0.8 + 0.1 * s.stars;
    let h = `<p class="note">Le prix de référence dépend de votre classement (<b>${'★'.repeat(s.stars)}</b>). Au-dessus, une partie des clients renonce — surtout les itinérants. Les réservations déjà prises gardent leur tarif.</p>`;
    for (const t of ['tent', 'caravan', 'mobilhome']) {
      const ref = Math.round(D.REF_PRICES[t] * mult);
      const accept = (p) => Math.round(Math.min(1, Math.pow(D.REF_PRICES[t] * mult / p, 1.3)) * 100);
      h += `<div class="price"><div class="top"><span>${TYPE_NAME[t]} <small>/ nuit</small></span><span class="val" id="pv-${t}">${s.prices[t]} €</span></div>
        <input type="range" min="5" max="${t === 'mobilhome' ? 220 : 80}" value="${s.prices[t]}" data-price="${t}">
        ${t === 'mobilhome' && S.units(s).some((b) => b.level === 2) ? `<small>Premium : <b id="pp">${eur2(s.prices.mobilhome * S.PREMIUM)}</b> /nuit (+30 %)</small><br>` : ''}<small id="pa-${t}">Référence ${ref} € · ~${accept(s.prices[t])} % des demandes acceptent ce prix</small></div>`;
    }
    h += `<div class="price"><div class="top"><span>Supplément par personne <small>(au-delà de 2, tente & caravane)</small></span><span class="val" id="pv-extra">${s.prices.extra} €</span></div>
      <input type="range" min="0" max="15" value="${s.prices.extra}" data-price="extra"><small>Les familles y sont sensibles ; les couples ne le paient pas.</small></div>`;
    h += `<div class="price"><div class="top"><span>Marge de l’épicerie</span><span class="val" id="pv-shop">×${s.shopMarkup.toFixed(2)}</span></div>
      <input type="range" min="80" max="160" value="${Math.round(s.shopMarkup * 100)}" data-markup="1"><small>Au-delà de ×1,35 les clients râlent ; en dessous de ×1,05 ils apprécient.</small></div>`;
    h += '<h3>📅 Tarifs selon la période d’arrivée</h3><p class="note">Les prix d’un séjour sont calculés selon sa date d’arrivée et restent garantis après réservation. Les changements de période ne modifient pas les contrats signés.</p>';
    const bands = [
      ['low', 'Basse saison', 'Avril, mai et septembre', 12],
      ['mid', 'Moyenne saison', 'Juin et deuxième quinzaine d’août', 75],
      ['high', 'Haute saison', 'Juillet et première quinzaine d’août', 110]
    ];
    for (const [band, label, dates, day] of bands) {
      const value = (s.seasonRates && s.seasonRates[band]) || 1;
      const ex = S.unitPrice(s, {type:'tent',level:1}, day);
      h += `<div class="price"><div class="top"><span><b>${label}</b> <small>${dates}</small></span><span class="val" id="sr-${band}">×${value.toFixed(2)}</span></div>
        <input type="range" min="70" max="150" step="5" value="${Math.round(value*100)}" data-season="${band}">
        <small>Exemple : tente à ${eur2(ex)}/nuit avec le tarif de base actuel.</small></div>`;
    }
    void cl;
    return h;
  }

  function pStaff() {
    if (s.phase === 'winter') {
      return `<p class="note">Hors saison : les contrats saisonniers sont terminés. Vous pourrez réembaucher à l’ouverture.</p>` + (s.lastTeam.length ? `<h3>Équipe de la saison passée</h3><div class="list">${s.lastTeam.map((t) => `<div class="row">${t.name} — ${D.STAFF[t.role].name}</div>`).join('')}</div>` : '');
    }
    let h = '';
    const pay = s.staff.reduce((a, x) => a + x.wage * D.EMPLOYER_RATE, 0);
    h += `<div class="kpis"><div class="kpi"><b>${s.staff.length}</b><small>employés</small></div><div class="kpi"><b>${eur(pay)}</b><small>masse salariale / mois</small></div><div class="kpi"><b>${eur(pay / 30)}</b><small>par jour</small></div></div>`;
    const tasks = S.serviceChecklist(s);
    h += `<details data-ops ${ui.opsExpanded ? 'open' : ''}><summary style="cursor:pointer;font-weight:800;padding:9px 2px">🧰 Interventions du jour : ${tasks.length} besoin${tasks.length > 1 ? 's' : ''}${tasks.length ? ' · à traiter en priorité' : ' · tout va bien'}</summary>
      <p class="note">Des prestataires peuvent intervenir immédiatement, mais leur intervention coûte plus cher qu’un salarié. Les interventions inutiles sont refusées et aucun paiement n’est débité.</p>
      <div class="list">${tasks.slice(0,8).map(t => `<div class="row"><span>🔧</span><div class="grow"><b>${D.BUILDINGS[t.type].short}${t.number ? ' n°' + t.number : ''}</b><small>${t.label}</small></div>
      <button class="btn small" data-intervention="${t.id}" data-kind="${t.kind}">${eur(t.cost)}</button></div>`).join('') || '<p class="note">Aucune intervention extérieure urgente à prévoir.</p>'}</div>
      ${tasks.length > 8 ? '<small>8 problèmes prioritaires affichés sur ' + tasks.length + '. Sélectionnez les autres bâtiments sur la carte.</small>' : ''}
      <p class="note">Déjà engagés cette saison : ${s.stats.serviceInterventions || 0} intervention(s), ${eur(s.stats.serviceExpenses || 0)}.</p>
    </details>`;
    h += `<h3>Recruter un saisonnier</h3>`;
    for (const r in D.STAFF) {
      const R0 = D.STAFF[r];
      const n = s.staff.filter((x) => x.role === r).length;
      h += `<div class="row"><span style="width:14px;height:14px;border-radius:50%;background:${R0.color};border:2px solid #33233d"></span><div class="grow"><b>${R0.name} (${n})</b><small>${R0.desc} ${S.fmtTime(R0.hours[0])}–${S.fmtTime(R0.hours[1])} · ${eur(R0.wage)} brut/mois</small></div><button class="btn small primary" data-hire="${r}">Embaucher</button></div>`;
    }
    const adv = [];
    const san = S.ofType(s, 'sanitary');
    if (!s.staff.some((x) => x.role === 'cleaning') && san.some((b) => b.dirt > 50)) adv.push('Les sanitaires sont sales : un agent d’entretien s’impose.');
    if (!s.staff.some((x) => x.role === 'maintenance') && s.buildings.some((b) => b.broken)) adv.push('Panne en cours : sans technicien, un dépanneur extérieur facture 2,5× plus cher.');
    const rec = S.ofType(s, 'reception')[0]; const q = rec && s.rt.bstate.get(rec.id);
    if (q && q.queue.length > 3) adv.push('File d’attente à l’accueil : un(e) réceptionniste de plus ?');
    if (adv.length) h += `<p class="note">💡 ${adv.join('<br>💡 ')}</p>`;
    const pol = s.staffPolicy || { cleaning: 'arrivals', maintenance: 'urgent' };
    h += `<h3>🛠️ Priorités opérationnelles</h3>
      <p class="note">Les équipes choisissent automatiquement leurs tâches selon tes priorités. Une panne reste urgente dans tous les cas.</p>
      <div class="price"><b>Équipe d’entretien</b><div class="acts">
      <button class="btn small ${pol.cleaning === 'arrivals' ? 'primary' : ''}" data-policy-role="cleaning" data-policy-value="arrivals">Arrivées & mobil-homes</button>
      <button class="btn small ${pol.cleaning === 'sanitary' ? 'primary' : ''}" data-policy-role="cleaning" data-policy-value="sanitary">Sanitaires d’abord</button></div></div>
      <div class="price"><b>Maintenance</b><div class="acts">
      <button class="btn small ${pol.maintenance === 'urgent' ? 'primary' : ''}" data-policy-role="maintenance" data-policy-value="urgent">Réparations urgentes</button>
      <button class="btn small ${pol.maintenance === 'preventive' ? 'primary' : ''}" data-policy-role="maintenance" data-policy-value="preventive">Prévenir l’usure</button></div></div>`;
    h += `<h3>L’équipe</h3><div class="list">`;
    h += s.staff.map((x) => {
      const aid = s.rt.staffAgents.get(x.id); const a = aid && s.rt.agentMap.get(aid);
      const status = !a ? 'au repos' : a.state === 'work' ? (a.task && a.task.kind === 'desk' ? 'au comptoir' : a.task && a.task.kind === 'clean' ? 'nettoie les sanitaires' : a.task && a.task.kind === 'mh' ? 'ménage mobil-home' : a.task && a.task.kind === 'repair' ? 'répare une panne' : a.task && a.task.kind === 'pool' ? 'traite l’eau' : a.task && a.task.kind === 'stage' ? (S.stageWindow(s) ? 'anime la scène 🎤' : 'prépare le spectacle') : 'entretien préventif') : a.task && a.task.kind === 'patrol' ? 'fait sa ronde' : 'en déplacement';
      return `<div class="row"><span style="width:14px;height:14px;border-radius:50%;background:${D.STAFF[x.role].color};border:2px solid #33233d"></span><div class="grow"><b>${esc(x.name)}</b><small>${D.STAFF[x.role].name} · ${status}</small></div><button class="btn small" data-fire="${x.id}">Congédier</button></div>`;
    }).join('') || '<small>Vous gérez tout seul pour l’instant… Les files s’allongent vite en été !</small>';
    return h + '</div>';
  }

  function pFinance() {
    const inc = [], exp = [];
    for (const k in s.fin.season) { if (k === S.FINANCING) continue; (S.INCOME.has(k) ? inc : exp).push([k, s.fin.season[k]]); }
    inc.sort((a, b) => b[1] - a[1]); exp.sort((a, b) => a[1] - b[1]);
    const ti = inc.reduce((a, b) => a + b[1], 0), te = exp.reduce((a, b) => a + b[1], 0);
    let h = `<div class="kpis"><div class="kpi"><b class="${s.fin.cash >= 0 ? 'pos' : 'neg'}">${eur(s.fin.cash)}</b><small>trésorerie</small></div><div class="kpi"><b class="pos">${eur(ti)}</b><small>recettes saison</small></div><div class="kpi"><b class="${ti + te >= 0 ? 'pos' : 'neg'}">${eur(ti + te)}</b><small>résultat saison</small></div></div>`;
    const outlook = S.bookingOutlook(s, 14);
    if (outlook.days) {
      h += `<h3>📈 Pilotage — ${outlook.days} prochains jours</h3>
        <div class="kpis"><div class="kpi"><b>${pct(outlook.occupancy)}</b><small>nuits réservées</small></div>
        <div class="kpi"><b class="pos">${eur(outlook.contracted)}</b><small>nuitées contractées*</small></div>
        <div class="kpi"><b class="pos">${eur(outlook.balancesDue)}</b><small>soldes à encaisser*</small></div></div>
        <table class="fin"><tr><th>Hébergement</th><th>Occupation</th><th>Recettes*</th></tr>
        ${['tent', 'caravan', 'mobilhome'].map((t) => {
          const o = outlook.byType[t];
          return `<tr><td>${TYPE_NAME[t]} (${o.units})</td><td>${o.bookedNights}/${o.availableNights} · ${pct(o.rate)}</td><td>${eur(o.contracted)}</td></tr>`;
        }).join('')}</table>
        <p class="note"><b>Engagements connus sur la période :</b> soldes à recevoir ${eur(outlook.balancesDue)} ; charges fixes estimées ${eur(outlook.fixedCosts)}${outlook.loanCosts ? ' ; échéances d’emprunt ' + eur(outlook.loanCosts) : ''}.
        ${outlook.riskBookings ? '<br>⚠️ ' + outlook.riskBookings + ' séjour(s) à risque : hébergement en panne ou non relié.' : ''}
        <br>* La valeur contractée inclut les acomptes déjà encaissés. Les soldes restent soumis aux annulations. Les réservations nouvelles, dépenses variables, achats, incidents et investissements ne sont pas prévus.</p>`;
    }
    if (s.phase === 'season') {
      const performances = S.units(s).filter((b) => b.progress === 0).map((b) => ({ b, perf: S.unitPerformance(s, b) }))
        .filter((o) => o.perf && o.perf.days > 0)
        .sort((a, b) => b.perf.margin - a.perf.margin);
      if (performances.length) {
        const gross = performances.reduce((a, o) => a + o.perf.revenue, 0);
        const margin = performances.reduce((a, o) => a + o.perf.margin, 0);
        h += `<h3>🏕️ Rentabilité des hébergements</h3>
          <div class="kpis"><div class="kpi"><b>${eur(gross)}</b><small>CA des nuits déjà effectuées</small></div>
          <div class="kpi"><b class="${margin >= 0 ? 'pos' : 'neg'}">${eur(margin)}</b><small>marge indicative</small></div></div>
          <table class="fin"><tr><th>Hébergement</th><th>Occupation</th><th>Marge*</th></tr>${performances.slice(0, 12).map(({b,perf}) =>
            `<tr><td>${TYPE_NAME[b.type]} n°${b.num}</td><td>${perf.nights}/${perf.days} · ${pct(perf.occupancy)}</td><td class="${perf.margin >= 0 ? 'pos' : 'neg'}">${eur(perf.margin)}</td></tr>`).join('')}</table>
          <p class="note">* Estimation : recettes des nuits déjà passées, moins entretien propre à l’hébergement et consommation d’eau/énergie estimée. Personnel, assurances, impôts, investissements et amortissements ne sont pas affectés par parcelle. Ce n’est pas un résultat net comptable.</p>`;
      }
    }
    h += `<h3>Trésorerie — 60 derniers jours</h3><canvas class="spark" id="spark"></canvas>`;
    const capL = S.loanCapacity(s);
    h += `<h3>🏦 Banque</h3><div class="loan">`;
    if (s.loan) h += `<div class="stat" style="display:flex;justify-content:space-between"><span>Capital restant dû</span><b>${eur(s.loan.left)}</b></div><small>Échéance : ${eur(s.loan.perDay)} de capital par jour d’ouverture + intérêts (${(s.loan.rate * 100).toFixed(1)} %/an).</small>`;
    else h += `<small>Aucun emprunt en cours. Taux ${(4.5).toFixed(1)} %/an, remboursement quotidien sur 300 jours d’ouverture (~2 saisons).</small>`;
    h += `<div class="acts">${[10000, 25000, 50000, 100000].map((v) => `<button class="btn small ${v <= capL ? 'primary' : ''}" data-borrow="${v}" ${v > capL ? 'disabled' : ''}>+${eur(v)}</button>`).join('')}${s.loan ? `<button class="btn small" data-repay="1">Rembourser tout (${eur(s.loan.left * 1.01)})</button>` : ''}</div><small>Capacité d’emprunt restante : <b>${eur(capL)}</b> (20 000 € + 50 % de la valeur des installations).</small></div>`;
    h += `<h3>Recettes</h3><table class="fin">${inc.map(([k, v]) => `<tr><td>${k}</td><td class="pos">${eur(v)}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td>${eur(ti)}</td></tr></table>`;
    h += `<h3>Dépenses</h3><table class="fin">${exp.map(([k, v]) => `<tr><td>${k}</td><td class="neg">${eur(v)}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td>${eur(te)}</td></tr></table>`;
    const daily = S.built(s).reduce((a, b) => a + D.BUILDINGS[b.type].upkeep, 18) + s.staff.reduce((a, x) => a + x.wage * D.EMPLOYER_RATE / 30, 0);
    h += `<p class="note">Charges fixes estimées : <b>${eur(daily)}/jour</b> (entretien des bâtiments, assurances, salaires), plus l’eau et l’énergie selon la fréquentation. Hivernage : ~${eur(3000 + s.buildings.reduce((a, b) => a + D.BUILDINGS[b.type].cost, 0) * 0.01)} à la réouverture.</p>`;
    return h;
  }
  function drawSpark() {
    const c = $('spark'); if (!c) return;
    const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.width = r.width * dpr; c.height = r.height * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const hs = s.fin.history.slice(-60); if (hs.length < 2) { g.font = '600 12px system-ui'; g.fillText('Pas encore assez de données.', 10, 20); return; }
    const vals = hs.map((x) => x.cash), mn = Math.min(0, ...vals), mx = Math.max(...vals) * 1.05;
    const W = r.width, H = r.height, pad = 8;
    const X = (i) => pad + i * (W - 2 * pad) / (hs.length - 1), Y = (v) => H - pad - (v - mn) / (mx - mn || 1) * (H - 2 * pad);
    const bw = (W - 2 * pad) / hs.length * 0.35, emax = Math.max(1, ...hs.map((x) => Math.max(x.inc, x.exp)));
    hs.forEach((x, i) => { g.fillStyle = 'rgba(47,158,107,.35)'; g.fillRect(X(i) - bw, H - pad - x.inc / emax * 30, bw, x.inc / emax * 30); g.fillStyle = 'rgba(232,85,61,.35)'; g.fillRect(X(i), H - pad - x.exp / emax * 30, bw, x.exp / emax * 30); });
    if (mn < 0) { g.strokeStyle = '#e8553d'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(pad, Y(0)); g.lineTo(W - pad, Y(0)); g.stroke(); g.setLineDash([]); }
    g.strokeStyle = '#2a9dd8'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath(); vals.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
    g.fillStyle = '#33233d'; g.font = '700 11px system-ui'; g.fillText(eur(vals[vals.length - 1]), W - 80, 14);
  }

  function pGoals() {
    const cl = S.classement(s);
    let h = `<div class="kpis"><div class="kpi"><b style="color:#e39a00">${'★'.repeat(cl.stars)}</b><small>classement</small></div><div class="kpi"><b>${Math.round(s.reputation)}</b><small>réputation /100</small></div><div class="kpi"><b>${s.totals.groups}</b><small>groupes accueillis</small></div></div>`;
    if (cl.next) h += `<p class="note">Pour passer à <b>${'★'.repeat(cl.next.stars)}</b> il manque : ${cl.next.missing.join(', ')}.</p>`;
    else h += `<p class="note">Classement maximal atteint. Bravo !</p>`;
    h += `<h3>Objectifs de progression</h3>`;
    for (const o of D.OBJECTIVES) {
      const done = s.objectives[o.id];
      h += `<div class="goal ${done ? 'done' : ''}"><span class="ico">${done ? '✅' : '🎯'}</span><div class="grow"><b>${o.title}</b><br><small>${o.text}</small></div><span class="tag ${done ? 'good' : ''}">${done ? 'an ' + done : '+' + eur(o.reward)}</span></div>`;
    }
    if (s.reports.length) {
      h += `<h3>Saisons passées</h3><div class="list">` + s.reports.slice().reverse().map((r, i) => `<div class="row"><b>An ${r.year}</b><div class="grow"><small>${r.groups} groupes · occ. ${pct(r.avgOcc)} · note ${r.avgRating}/5</small></div><span class="${r.result >= 0 ? 'pos' : 'neg'}"><b>${r.result >= 0 ? '+' : ''}${eur(r.result)}</b></span><button class="btn small" data-report="${s.reports.length - 1 - i}">Bilan</button></div>`).join('') + '</div>';
    }
    return h;
  }
  function pReviews() {
    const rv = s.reviews.slice().reverse();
    if (!rv.length) return '<p class="note">Aucun avis pour l’instant : les vacanciers notent leur séjour au moment du départ.</p>';
    const season = s.reviews.filter((r) => r.y === s.year), avg = season.length ? season.reduce((a, r) => a + r.rating, 0) / season.length : 0;
    const dist = [5, 4, 3, 2, 1].map((n) => season.filter((r) => Math.round(r.rating) === n).length);
    let h = `<div class="kpis"><div class="kpi"><b style="color:#e39a00">${avg ? avg.toFixed(1) : '—'}/5</b><small>moyenne saison</small></div><div class="kpi"><b>${season.length}</b><small>avis cette saison</small></div><div class="kpi"><b>${Math.round(s.reputation)}</b><small>réputation</small></div></div>`;
    h += '<h3>Répartition</h3>' + dist.map((n, i) => `<div class="stat" style="display:flex;gap:8px;align-items:center;font-size:12px"><span style="width:52px">${'★'.repeat(5 - i)}</span><div class="meter" style="flex:1;width:auto"><i style="width:${season.length ? n / season.length * 100 : 0}%;background:#f2a516"></i></div><b style="width:24px;text-align:right">${n}</b></div>`).join('');
    h += '<h3>Derniers avis</h3>' + rv.map((r) => `<div class="row" style="align-items:flex-start"><span style="font-size:18px">${PROF(r.profile)}</span><div class="grow"><b>${esc(r.name)} <span style="color:#e39a00">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</span></b><small style="white-space:normal;display:block">« ${esc(r.text)} »</small><small>${TYPE_NAME[r.type]} · ${r.nights} nuit${r.nights > 1 ? 's' : ''} · ${S.dateParts(r.d).d} ${S.dateParts(r.d).m}</small></div></div>`).join('');
    return h;
  }
  function pLog() {
    return s.log.slice().reverse().map((l) => `<div class="log ${l.type}"><small>an ${l.y} · ${S.dateParts(l.d).d} ${S.dateParts(l.d).m.slice(0, 4)}. ${S.fmtTime(l.m)}</small>${esc(l.text)}</div>`).join('');
  }

  function bindPanel() {
    const body = $('pbody');
    releaseVisuals(body);
    body.querySelectorAll('[data-campaign]').forEach(btn=>btn.onclick=()=>{
      const r=S.launchCampaign(s,btn.dataset.campaign);
      if(r.ok){
        CT.sfx.play('coin');
        toast('Campagne active jusqu’au '+S.dateParts(r.until).d+' '+S.dateParts(r.until).m+'.','good');
        SV.autosave(s);
      }else{CT.sfx.play('error');toast(r.why,'warn');}
      renderPanel(true);
    });
    body.querySelectorAll('[data-program]').forEach(btn=>btn.onclick=()=>{
      if(S.setProgram(s,btn.dataset.program)){CT.sfx.play('click');SV.autosave(s);renderPanel(true);}
    });
    body.querySelectorAll('[data-quickbuild]').forEach(b=>b.onclick=()=>{
      const type=b.dataset.quickbuild;
      closePanel();setTool('build',type);
      toast(`Choisis une parcelle pour construire ${D.BUILDINGS[type].name} — ${eur(D.BUILDINGS[type].cost)}.`,'info',7000);
    });
    const operations = body.querySelector('[data-ops]');
    if (operations) operations.ontoggle = () => { ui.opsExpanded = operations.open; };
    body.querySelectorAll('[data-intervention]').forEach((b) => (b.onclick = () => {
      const r = S.serviceIntervention(s, +b.dataset.intervention, b.dataset.kind);
      if (r.ok) { CT.sfx.play('coin'); toast(`Intervention effectuée : ${eur(r.cost)}.`, 'good'); SV.autosave(s); }
      else { CT.sfx.play('error'); toast(r.why || 'Intervention impossible.', 'warn'); }
      renderPanel(true); if (ui.sel) renderInspector();
    }));
    body.querySelectorAll('[data-hire]').forEach((b) => (b.onclick = () => { S.hire(s, b.dataset.hire); CT.sfx.play('hire'); renderPanel(true); }));
    body.querySelectorAll('[data-policy-role]').forEach((b) => (b.onclick = () => {
      if (S.setStaffPolicy(s, b.dataset.policyRole, b.dataset.policyValue)) { CT.sfx.play('click'); renderPanel(true); SV.autosave(s); }
    }));
    body.querySelectorAll('[data-season]').forEach((inp) => (inp.oninput = () => {
      S.setSeasonRate(s, inp.dataset.season, +inp.value / 100);
      const out = $('sr-' + inp.dataset.season);
      if (out) out.textContent = '×' + (s.seasonRates[inp.dataset.season]).toFixed(2);
    }));
    body.querySelectorAll('[data-season]').forEach((inp) => (inp.onchange = () => { renderPanel(true); SV.autosave(s); }));
    body.querySelectorAll('[data-borrow]').forEach((b) => (b.onclick = () => { const r = S.borrow(s, +b.dataset.borrow); if (r.ok) CT.sfx.play('coin'); else { CT.sfx.play('error'); toast(r.why, 'bad'); } renderPanel(true); }));
    body.querySelectorAll('[data-repay]').forEach((b) => (b.onclick = () => { const r = S.repayLoan(s); if (r.ok) { CT.sfx.play('coin'); toast('Emprunt soldé.', 'good'); } else toast(r.why, 'bad'); renderPanel(true); }));
    body.querySelectorAll('[data-fire]').forEach((b) => (b.onclick = () => { S.fire(s, +b.dataset.fire); renderPanel(true); }));
    body.querySelectorAll('[data-report]').forEach((b) => (b.onclick = () => showReport(s.reports[+b.dataset.report])));
    body.querySelectorAll('[data-price]').forEach((inp) => (inp.oninput = () => {
      const t = inp.dataset.price; S.setPrice(s, t, +inp.value);
      if (t === 'extra') { $('pv-extra').textContent = s.prices.extra + ' €'; return; }
      if (t === 'mobilhome' && $('pp')) $('pp').textContent = eur2(s.prices.mobilhome * S.PREMIUM);
      $('pv-' + t).textContent = s.prices[t] + ' €';
      const ref = D.REF_PRICES[t] * (0.8 + 0.1 * s.stars);
      $('pa-' + t).textContent = `Référence ${Math.round(ref)} € · ~${Math.round(Math.min(1, Math.pow(ref / s.prices[t], 1.3)) * 100)} % des demandes acceptent ce prix`;
    }));
    body.querySelectorAll('[data-markup]').forEach((inp) => (inp.oninput = () => { S.setMarkup(s, inp.value / 100); $('pv-shop').textContent = '×' + s.shopMarkup.toFixed(2); }));
  }

  /* ================= Inspecteur ================= */
  function meter(v, col) { return `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></div>`; }
  function renderInspector() {
    const b = ui.sel, el = $('inspector');
    if (!b || !s.buildings.includes(b)) { el.classList.add('hidden'); ui.sel = null; return; }
    const def = D.BUILDINGS[b.type];
    let h = `<h3><span>${S.displayName(b)}${b.num ? ' n°' + b.num : ''}${b.level === 2 ? ' <span class="tag warn">★ niv. 2</span>' : ''}</span><button class="iconbtn" style="width:30px;height:30px;font-size:13px" data-x="1">✕</button></h3><div class="desc">${b.level === 2 && def.upgrade ? def.upgrade.desc : def.desc}</div>`;
    if (b.progress > 0) h += `<div class="stat"><span>🚧 Chantier</span><b>encore ${b.progress} jour${b.progress > 1 ? 's' : ''}</b></div>`;
    else {
      h += `<div class="stat"><span>État ${b.broken ? '<span class="tag bad">EN PANNE</span>' : ''}</span>${meter(b.cond, b.cond > 60 ? '#2f9e6b' : b.cond > 35 ? '#f2a516' : '#e8553d')}</div>`;
      if (b.ax < 0) h += `<p class="note">⛔ Aucune allée ne touche ce bâtiment : personne ne peut y accéder.</p>`;
      else if (!S.accessible(s, b)) h += `<p class="note">⛔ L’allée devant ce bâtiment n’est pas reliée à l’entrée.</p>`;
      if (b.type === 'sanitary') h += `<div class="stat"><span>Propreté</span>${meter(100 - b.dirt, b.dirt < 40 ? '#2a9dd8' : b.dirt < 70 ? '#f2a516' : '#8a5a2b')}</div>`;
      if (b.type === 'pool') h += `<div class="stat"><span>Qualité de l’eau</span>${meter(b.water, b.water > 60 ? '#2a9dd8' : '#7a9a3a')}</div><div class="stat"><span>Ouverture</span><b>${S.poolOpen(s, b) ? 'ouverte' : 'fermée'} (10h–19h30)</b></div>`;
      const st = s.rt.bstate.get(b.id);
      const slots = b.level === 2 ? ({ sanitary: 9, shop: 3, pool: 36, snack: 24 }[b.type] || def.slots) : def.slots;
      if (def.service) h += `<div class="stat"><span>Utilisateurs / file</span><b>${st ? st.users.length : 0}${slots ? ' / ' + slots : ''} · file : ${st ? st.queue.length : 0}</b></div>`;
      if (b.type === 'snack') h += `<div class="stat"><span>Service</span><b>${S.snackOpen(s, b) ? 'en cours' : 'fermé'} (11h30–14h, 18h30–21h30)</b></div>`;
      if (b.type === 'reception') { let n = 0; for (const a of s.rt.agents) if (!a.dead && a.kind === 'staff' && a.role === 'reception' && a.state === 'work') n++; h += `<div class="stat"><span>Au comptoir</span><b>${n ? n + ' réceptionniste' + (n > 1 ? 's' : '') : 'vous (lent)'}</b></div>`; }
      if (def.unit) {
        h += `<div class="stat"><span>Capacité</span><b>${def.cap} pers. · ${eur2(S.unitPrice(s, b))}/nuit</b></div>`;
        if (s.phase === 'season') {
          const perf = S.unitPerformance(s, b);
          h += `<div class="stat"><span>Nuits réalisées</span><b>${perf.nights} / ${perf.days}</b></div>
            <div class="stat"><span>Chiffre d’affaires acquis</span><b>${eur(perf.revenue)}</b></div>
            <div class="stat"><span>Marge indicative*</span><b class="${perf.margin >= 0 ? 'pos' : 'neg'}">${eur(perf.margin)}</b></div>
            <small>* Hors personnel, frais communs et investissements.</small>`;
        }
        h += `<div class="stat"><span>Paysage alentour</span><b>${'🌿'.repeat(Math.min(5, Math.round(S.beautyAt(s, b) / 3))) || '—'}</b></div>`;
        if (b.clean) h += `<p class="note">🧹 Ménage à faire avant la prochaine arrivée.</p>`;
        const cur = s.bookings.find((k) => k.unit === b.id && k.status === 'onsite');
        if (cur) h += `<div class="row" style="margin-top:6px">${PROF(cur.profile)} <div class="grow"><b>${esc(cur.name)} · ${cur.size} pers.</b><small>départ le ${S.dateParts(cur.depart).d} ${S.dateParts(cur.depart).m}</small></div>${meter(cur.sat, satColor(cur.sat))}</div>`;
        const nx = s.bookings.filter((k) => k.unit === b.id && k.status === 'booked').sort((x, y) => x.arrive - y.arrive).slice(0, 3);
        if (nx.length) h += `<small>À venir : ${nx.map((k) => `${S.dateParts(k.arrive).d}/${S.dateParts(k.arrive).m.slice(0, 3)}. (${k.nights} n.)`).join(', ')}</small>`;
      }
    }
    if (s.phase === 'season' && b.progress <= 0) {
      const options = S.serviceOptions(s, b);
      if (options.length) {
        h += `<div class="loan" style="margin-top:8px"><b>🧰 Intervention immédiate</b>
          <p class="note">Prestataire extérieur : action immédiate, coût supérieur à une intervention interne.</p>
          <div class="acts">${options.map(o => `<button class="btn small" data-ins-service="${o.kind}">${o.label} · ${eur(o.cost)}</button>`).join('')}</div></div>`;
      }
    }
    const refund = def.cost * D.DEMOLISH_REFUND * (b.progress > 0 ? 2 : 1);
    if (def.upgrade && b.level !== 2) {
      const cu = S.canUpgrade(s, b);
      h += `<div class="loan" style="margin-top:8px"><b>⬆️ ${def.upgrade.name}</b><br><small>${def.upgrade.desc}</small><div class="acts"><button class="btn small primary" data-up="1" ${cu.ok ? '' : 'disabled'}>Améliorer — ${eur(def.upgrade.cost)} · ${def.upgrade.build} j</button></div>${cu.ok ? '' : `<small>${cu.why}</small>`}</div>`;
    }
    h += `<div class="acts"><button class="btn small red" data-demo="1">🧨 Démolir (+${eur(Math.min(refund, def.cost))})</button></div>`;
    el.innerHTML = h; el.classList.remove('hidden');
    el.querySelector('[data-x]').onclick = () => { ui.sel = null; el.classList.add('hidden'); };
    el.querySelectorAll('[data-ins-service]').forEach(btn => btn.onclick = () => {
      const result = S.serviceIntervention(s, b.id, btn.dataset.insService);
      if (result.ok) { CT.sfx.play('coin'); toast(`Intervention effectuée : ${eur(result.cost)}.`, 'good'); SV.autosave(s); }
      else { CT.sfx.play('error'); toast(result.why, 'warn'); }
      renderInspector(); if (ui.tab === 'staff') renderPanel(true);
    });
    const upb = el.querySelector('[data-up]');
    if (upb) upb.onclick = () => { const r = S.upgrade(s, b.id); if (r.ok) { CT.sfx.play('build'); toast(`Amélioration lancée : ${def.upgrade.name}.`, 'good'); renderInspector(); } else { CT.sfx.play('error'); toast(r.why, 'bad'); } };
    el.querySelector('[data-demo]').onclick = () => { const r = S.demolish(s, b.x, b.y); if (!r.ok) toast(r.why || 'Impossible', 'warn'); else { ui.sel = null; el.classList.add('hidden'); toast(`Démoli : +${eur(r.refund)}.`, 'info'); } };
  }

  /* ================= Tutoriel « Premiers pas » ================= */
  const TUTO = [
    { t: 'Tracez une allée', d: 'Outil 🟫 Allées : prolongez l’allée principale vers l’est (glissez sur la carte).', ok: () => s.tiles.filter((x) => x === 1).length >= (ui.tutoPaths || 0) + 4 },
    { t: 'Posez des emplacements', d: '⛺ Héberger → Emplacement tente, le long de votre nouvelle allée. Posez-en deux.', ok: () => s.buildings.filter((b) => D.BUILDINGS[b.type].unit).length >= (ui.tutoUnits || 9) + 2 },
    { t: 'Consultez les réservations', d: 'Ouvrez l’onglet 📅 Résas : arrivées du jour, remplissage, demandes refusées.', ok: () => ui.tab === 'bookings' },
    { t: 'Recrutez un agent d’entretien', d: 'Onglet 👷 Équipe : sans lui, les sanitaires deviennent vite sales.', ok: () => s.staff.some((x) => x.role === 'cleaning') },
    { t: 'Ajustez vos tarifs', d: 'Onglet 🏷️ Tarifs : trouvez le bon équilibre entre remplissage et recettes.', ok: () => ui.tab === 'prices' },
    { t: 'Ouvrez une épicerie', d: '🏠 Services → Épicerie : le pain du matin, c’est sacré au camping !', ok: () => s.buildings.some((b) => b.type === 'shop') },
    { t: 'Accélérez le temps', d: 'Passez en vitesse ▶▶ et regardez votre camping vivre. Bonne saison !', ok: () => ui.speed >= 2 }
  ];
  function tutoTick() {
    const el = $('tuto'); const T = s.tuto || { done: true };
    if (T.done || s.phase !== 'season' || (ui.sel && !$('inspector').classList.contains('hidden'))) { el.classList.add('hidden'); return; }
    if (ui.tutoPaths === undefined) { ui.tutoPaths = s.tiles.filter((x) => x === 1).length; ui.tutoUnits = s.buildings.filter((b) => D.BUILDINGS[b.type].unit).length; }
    const step = TUTO[T.step];
    if (!step) { T.done = true; toast('🎓 Premiers pas terminés ! À vous de jouer, directeur.', 'goal'); CT.sfx.play('goal'); el.classList.add('hidden'); return; }
    if (step.ok()) { T.step++; CT.sfx.play('coin'); if (T.step === 1) ui.tutoUnits = s.buildings.filter((b) => D.BUILDINGS[b.type].unit).length; return tutoTick(); }
    el.innerHTML = `<div class="tt"><b>🎓 Premiers pas · ${T.step + 1}/${TUTO.length}</b><button class="btn small" data-skip="1">Passer</button></div><div class="tstep">${step.t}</div><small>${step.d}</small><div class="tbar"><i style="width:${T.step / TUTO.length * 100}%"></i></div>`;
    el.querySelector('[data-skip]').onclick = () => { T.done = true; el.classList.add('hidden'); };
    el.classList.remove('hidden');
  }

  /* ================= Décisions ================= */
  function showDecision() {
    const v = S.eventView(s); if (!v) return;
    if (!$('modal').classList.contains('hidden')) { setTimeout(showDecision, 1500); return; }
    ui.speedBefore = ui.speed || 1; setSpeed(0); CT.sfx.play('hire');
    const acts = {};
    modal(`<div style="display:flex;gap:12px;align-items:center"><span style="font-size:46px">${v.icon}</span><div><small style="font-weight:700;opacity:.7">DÉCISION DU DIRECTEUR · ${S.fmtDate(s)}</small><h2 style="margin:0">${v.title}</h2></div></div>
      <p style="font-size:16px">${esc(v.text)}</p>
      <div class="acts" style="flex-direction:column;align-items:stretch">${v.choices.map((c, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="c${i}" ${c.afford ? '' : 'disabled'}>${esc(c.label)}</button>`).join('')}</div>`, acts);
    v.choices.forEach((c, i) => (acts['c' + i] = () => {
      const r = S.resolveEvent(s, i);
      if (!r || !r.ok) { toast(r ? r.text : 'Impossible', 'bad'); return; }
      modal(`<div style="text-align:center"><span style="font-size:46px">${v.icon}</span><h2>${v.title}</h2><p style="font-size:16px">${esc(r.text)}</p><div class="acts" style="justify-content:center"><button class="btn primary" data-act="ok">Continuer ▶</button></div></div>`, { ok: () => { closeModal(); setSpeed(ui.speedBefore || 1); } });
      s.rt.events = s.rt.events.filter((x) => x.type !== 'info' || !x.text.includes(v.title));
    }));
  }

  /* ================= Bilan de saison ================= */
  function showReport(r) {
    setSpeed(0);
    const rows = (o, cls) => Object.entries(o).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k, v]) => `<tr><td>${k}</td><td class="${cls}">${eur(v)}</td></tr>`).join('');
    const done = r.objectives.map((id) => D.OBJECTIVES.find((o) => o.id === id)).filter(Boolean);
    modal(`<h2>📋 Bilan de la saison ${r.year}</h2>
      <div class="report-grid">
        <div class="kpi"><span class="big ${r.result >= 0 ? 'pos' : 'neg'}">${r.result >= 0 ? '+' : ''}${eur(r.result)}</span><small>résultat de la saison</small></div>
        <div class="kpi"><span class="big">${r.avgRating || '—'}/5</span><small>note moyenne des clients</small></div>
        <div class="kpi"><b>${r.groups} groupes · ${r.persons} vacanciers</b><small>${r.nights} nuitées vendues</small></div>
        <div class="kpi"><b>Occupation ${pct(r.avgOcc)} · été ${pct(r.summerOcc)}</b><small>pic ${pct(r.peakOcc)}</small></div>
        <div class="kpi"><b>Réputation ${r.repStart} → ${r.repEnd}</b><small>classement ${'★'.repeat(r.stars)}</small></div>
        ${r.guestTrips !== undefined ? `<div class="kpi"><b>${r.guestTrips} sorties · ${r.escortedTrips || 0} accompagnées</b><small>Vie du camping · bien-être moyen ${r.avgGuestMood || '—'}/100</small></div>` : ''}
        <div class="kpi"><b>${r.lostFull} refus « complet » · ${r.lostPrice} « trop cher »</b><small>sur ${r.requests} demandes</small></div>
      </div>
      <h3>Recettes</h3><table class="fin">${rows(r.inc, 'pos')}<tr class="tot"><td>Total</td><td>${eur(r.totalInc)}</td></tr></table>
      <h3>Dépenses</h3><table class="fin">${rows(r.exp, 'neg')}<tr class="tot"><td>Total</td><td>${eur(r.totalExp)}</td></tr></table>
      <p>${done.length ? '🏆 Objectifs atteints cette saison : ' + done.map((o) => '<b>' + o.title + '</b>').join(', ') : 'Aucun objectif atteint cette saison.'}</p>
      <p class="note">${adviceFor(r)}</p>
      <div class="acts"><button class="btn primary" data-act="ok">Passer à l’hiver ❄️</button></div>`, { ok: () => { closeModal(); hud(); } });
  }
  function adviceFor(r) {
    if (r.lostFull > r.requests * 0.35) return '💡 Vous avez refusé beaucoup de clients faute de place : l’hiver est le moment idéal pour agrandir (les chantiers seront livrés à l’ouverture).';
    if (r.avgRating && r.avgRating < 3) return '💡 Les clients sont déçus : sanitaires propres, files courtes, piscine et paysage font la différence.';
    if (r.lostPrice > r.requests * 0.3) return '💡 Vos tarifs ont fait fuir beaucoup de clients : revoyez-les ou montez en gamme.';
    if (r.result < 0) return '💡 Saison déficitaire : surveillez la masse salariale et la rentabilité de chaque équipement.';
    return '💡 Belle saison ! Visez l’étoile suivante (onglet Objectifs) pour attirer une clientèle prête à payer plus.';
  }

  boot();
})();
