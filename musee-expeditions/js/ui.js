/* Musée & Expéditions — ui.js
 * Interface française : onglets, fiches, modales, déballage au pinceau, rapports.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA, Obj = ME.Objects, X = ME.Expeditions, C = ME.Conservation, E = ME.Exhibitions, F = ME.Finances, V = ME.Visitors;
  const UI = (ME.UI = {});
  let S = null;
  const doc = G.document;
  const $ = (sel, root) => (root || doc).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || doc).querySelectorAll(sel));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = ME.fmtMoney, int = ME.fmtInt;

  const TABS = [
    { key: 'musee', label: 'Musée', ico: '🏛️' },
    { key: 'carte', label: 'Carte', ico: '🗺️' },
    { key: 'expeditions', label: 'Expéditions', ico: '⛺' },
    { key: 'collections', label: 'Collections', ico: '🏺' },
    { key: 'atelier', label: 'Atelier', ico: '🔬' },
    { key: 'expositions', label: 'Expositions', ico: '🖼️' },
    { key: 'equipe', label: 'Équipe', ico: '👥' },
    { key: 'finances', label: 'Finances', ico: '💰' },
    { key: 'journal', label: 'Journal', ico: '📓' },
  ];

  const view = { tab: 'musee', mapSel: 'vezere', colFilter: 'tous', colSort: 'recent', plan: null, pick: null, atelier: { obj: null, kind: 'restauration', staff: null }, sceneKey: null, scenes: [], confirmReset: false };
  UI.view = view;
  let modal = null; // { render: () => html, after: fn, cls }

  UI.setState = (s) => { S = s; };
  UI.getState = () => S;

  /* ---------------- Petits composants ---------------- */
  const pips = (n) => '<span class="pips">' + '●'.repeat(Math.round(n)) + '<i>' + '●'.repeat(Math.max(0, 5 - Math.round(n))) + '</i></span>';
  const bar = (v, cls) => '<div class="bar ' + (cls || '') + '"><i style="width:' + ME.clamp(v, 0, 100) + '%' + (cls === 'cond' ? ';background:' + (v < 45 ? '#b23a2a' : v < 65 ? '#d39b2a' : '#5f7f2a') : '') + '"></i></div>';
  const periodChip = (p) => '<span class="chip c" style="background:' + D.PERIODS[p].color + '">' + D.PERIODS[p].label + '</span>';
  const rarChip = (r) => '<span class="chip c" style="background:' + D.RARITY[r].color + '">' + D.RARITY[r].label + '</span>';
  const LOC_COL = { reserve: '#7b6f5a', vitrine: '#5f7f2a', atelier: '#2f6f73', terrain: '#d39b2a', transport: '#d39b2a', 'en-route': '#d39b2a', 'pret-sortant': '#3f5a92', depot: '#7a3b8c', rendu: '#9a8f80', restitue: '#b23a2a' };
  const locChip = (o) => '<span class="chip c loc" style="background:' + LOC_COL[o.location] + '">' + esc(Obj.LOCATIONS[o.location]) + '</span>';
  const svg = (o, size) => ME.Art.objectSVG(o, { size });

  function objCard(o, extra) {
    extra = extra || {};
    const hidden = !o.revealed;
    return '<button class="obj-card' + (extra.disabled ? ' disabled' : '') + '" data-action="' + (extra.action || 'openObj') + '" data-id="' + o.id + '"' + (extra.data || '') + (extra.title ? ' title="' + esc(extra.title) + '"' : '') + '>' +
      '<div class="pic' + (hidden ? ' unrevealed' : '') + '">' + svg(o) + '</div>' +
      (hidden ? '' : '<span class="rar">' + (D.RARITY[o.rarity].score >= 3.5 ? '★' : '') + '</span>') +
      '<div class="name">' + (hidden ? 'Caisse à déballer' : esc(o.name)) + '</div>' +
      '<div class="id">' + o.id + '</div>' +
      (extra.noLoc ? '' : locChip(o)) +
      (hidden ? '' : bar(o.condition, 'cond')) +
      (extra.note ? '<small>' + extra.note + '</small>' : '') +
      '</button>';
  }

  function staffStatus(p) {
    if (!p.assign) return 'Disponible';
    if (p.assign.kind === 'expedition') return 'En expédition (' + p.assign.id + ')';
    if (p.assign.kind === 'atelier') return 'À l\'atelier';
    if (p.assign.kind === 'accueil') return 'À l\'accueil des publics';
    return '';
  }

  function skillsHTML(sk) {
    return '<div class="skills">' + Object.keys(D.SKILLS).map((k) => '<span>' + D.SKILLS[k] + '</span>' + pips(sk[k] || 0)).join('') + '</div>';
  }

  /* ---------------- Rendu global ---------------- */
  UI.render = function () {
    renderStats();
    renderTabs();
    renderView();
    if (modal) renderModal();
  };

  function renderStats() {
    const lv = S.lastVisit;
    $('#stats').innerHTML =
      '<span class="stat">📅 <b>' + ME.weekLabel(S.week) + '</b></span>' +
      '<span class="stat' + (S.money < 0 ? ' neg' : '') + '">💰 <b>' + money(S.money) + '</b></span>' +
      '<span class="stat" title="Réputation">⭐ <b>' + Math.round(S.reputation) + '</b></span>' +
      '<span class="stat" title="Points de science">🔎 <b>' + int(S.science) + '</b></span>' +
      '<span class="stat" title="Visiteurs la semaine passée">🎟️ <b>' + (lv ? int(lv.total) + ' · ' + lv.satisfaction + ' %' : '—') + '</b></span>';
    const tb = $('#topbar');
    if (tb) doc.documentElement.style.setProperty('--tb', tb.offsetHeight + 'px');
  }

  function renderTabs() {
    const pend = S.pendingReveals.length;
    const active = S.expeditions.filter((e) => e.phase !== 'termine').length;
    $('#tabs').innerHTML = TABS.map((t) => {
      let badge = '';
      if (t.key === 'collections' && pend) badge = '<span class="badge">' + pend + '</span>';
      if (t.key === 'expeditions' && active) badge = '<span class="badge">' + active + '</span>';
      return '<button class="tab' + (view.tab === t.key ? ' active' : '') + '" data-action="tab" data-tab="' + t.key + '"' + (view.tab === t.key ? ' aria-current="page"' : '') + '><span class="ico" aria-hidden="true">' + t.ico + '</span><span>' + t.label + '</span>' + badge + '</button>';
    }).join('');
  }

  function stopScenes() { view.scenes.forEach((s) => s.stop()); view.scenes = []; view.sceneKey = null; }

  function renderView() {
    const fn = VIEWS[view.tab] || VIEWS.musee;
    const main = $('#view');
    // conserve les scènes animées si elles n'ont pas changé
    const keep = $('#scene-slot', main);
    const keepKey = view.sceneKey;
    const html = fn();
    let detached = null;
    if (keep && keepKey) { detached = keep; keep.remove(); }
    main.innerHTML = html;
    const slot = $('#scene-slot', main);
    if (slot) {
      const key = slot.dataset.key;
      if (detached && key === keepKey) { slot.replaceWith(detached); }
      else { stopScenes(); mountScenes(slot, key); }
    } else stopScenes();
    paintPortraits(main);
  }

  function mountScenes(slot, key) {
    view.sceneKey = key;
    const want3d = use3d();
    if (key.indexOf('musee') === 0) {
      if (want3d) {
        slot.innerHTML = '<div class="museum-wrap gl-wrap"></div>';
        const sc = ME.Scene3D.museum($('.gl-wrap', slot), () => S, { onRoom: (r) => UI.openRoom(r), onObject: (id) => UI.openObj(id), onEmptySlot: (r, i) => { UI.openRoom(r); if (S.rooms[r].unlocked) { view.pick = { room: r, slot: i }; renderModal(); } }, onLayout: () => { ME.State.save(S); UI.render(); }, toggle: () => setView('2d') });
        if (sc) { view.scenes.push(sc); return; }
        S.settings.view = '2d';
      }
      slot.innerHTML = '<div class="museum-wrap two-d"><canvas aria-label="Vue en coupe du musée : touchez une salle"></canvas>' + (ME.GL3D.supported() ? '<div class="gl-tools"><button type="button" class="wide" data-view3d="1" title="Passer en vue 3D">3D</button></div>' : '') + '</div>';
      const b = $('[data-view3d]', slot); if (b) b.addEventListener('click', () => setView('3d'));
      view.scenes.push(ME.Render.museum($('canvas', slot), () => S, (room) => UI.openRoom(room)));
    } else if (key.indexOf('exp:') === 0) {
      key.slice(4).split('|')[0].split(',').filter(Boolean).forEach((id) => {
        const box = doc.createElement('div');
        box.className = 'scene' + (want3d ? ' gl-wrap' : ''); box.style.marginBottom = '10px';
        slot.appendChild(box);
        const getExp = () => S.expeditions.find((e) => e.id === id);
        if (want3d) { const sc = ME.Scene3D.expedition(box, getExp, () => S); if (sc) { view.scenes.push(sc); return; } box.className = 'scene'; }
        box.innerHTML = '<canvas aria-label="Scène du chantier ' + id + '"></canvas>';
        view.scenes.push(ME.Render.expedition($('canvas', box), getExp, () => S));
      });
    }
  }

  function use3d() { return (S.settings.view || '3d') === '3d' && ME.GL3D && ME.GL3D.supported(); }
  function setView(v) { S.settings.view = v; ME.State.save(S); stopScenes(); UI.render(); }
  UI.setView = setView;

  function paintPortraits(root) {
    $$('canvas[data-portrait]', root).forEach((cv) => {
      const look = JSON.parse(cv.dataset.portrait);
      const dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = 56 * dpr; cv.height = 64 * dpr; cv.style.width = '56px'; cv.style.height = '64px';
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#efe2c2'; ctx.fillRect(0, 0, 56, 64);
      ME.Render.person(ctx, 28, 62, look, { scale: 1.25, pose: 'stand' });
      ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 54, 62);
    });
  }
  const portrait = (look) => '<canvas data-portrait=\'' + esc(JSON.stringify(look)) + '\' width="56" height="64"></canvas>';

  /* ================= ONGLETS ================= */
  const VIEWS = {};

  /* ---------- Musée ---------- */
  VIEWS.musee = function () {
    const lv = S.lastVisit;
    const rooms = Object.keys(D.ROOMS).filter((k) => ['expo', 'temp', 'hall'].includes(D.ROOMS[k].kind));
    let html = installCard() + '<div id="scene-slot" data-key="musee"></div>';
    html += '<p class="hint">✎ ' + (use3d() ? 'Faites glisser pour vous déplacer dans le musée · deux doigts (ou clic droit) pour pivoter · pincez ou molette pour zoomer · flèches/ZQSD au clavier. Touchez une salle ou une vitrine.' : 'Touchez une salle pour gérer ses vitrines, son thème et son éclairage.') + '</p><div class="cols"><div>';
    if (S.pendingReveals.length) html += '<div class="panel paper"><div class="panel-head"><h3>📦 ' + S.pendingReveals.length + ' caisse(s) à déballer</h3><button class="btn gold" data-action="openReveal">Déballer au pinceau</button></div><small>Vos découvertes sont arrivées : dégagez-les délicatement pour révéler leur histoire.</small></div>';
    html += '<div class="panel"><div class="panel-head"><h3>Salles d\'exposition</h3><small>Parcours : ' + ['hall'].concat(E.normalizeRoute(S)).map((r) => esc(D.ROOMS[r].name)).join(' → ') + '</small></div><div class="room-list">';
    rooms.forEach((k) => {
      const r = S.rooms[k];
      const def = D.ROOMS[k];
      if (!r.unlocked) {
        html += '<button class="room-card locked" data-action="openRoom" data-room="' + k + '"><b>' + esc(def.name) + '</b><br><small>Fermée · ouverture ' + money(def.cost) + '</small></button>';
        return;
      }
      const an = E.analyzeRoom(S, k);
      html += '<button class="room-card" data-action="openRoom" data-room="' + k + '"><b>' + esc(def.name) + '</b> ' + (r.theme ? periodChip(r.theme) : '') +
        '<br><small>' + r.vitrines.filter(Boolean).length + '/' + r.vitrines.length + ' vitrines · éclairage ' + D.LIGHTING[r.lighting].label.toLowerCase() + ' · attrait ' + an.score.toFixed(1) + '</small>' +
        '<div class="mini-objs">' + r.vitrines.map((id) => '<span class="slot">' + (id ? svg(S.objects[id]) : '') + '</span>').join('') + '</div></button>';
    });
    html += '</div></div></div><div>';
    html += visitPanel(lv);
    html += objectivesPanel(3);
    html += '</div></div>';
    return html;
  };

  function visitPanel(lv) {
    let html = '<div class="panel"><h3>🎟️ Fréquentation</h3>';
    if (!lv) return html + '<p class="hint">Le musée n\'a pas encore ouvert ses portes. Passez à la semaine suivante pour accueillir vos premiers visiteurs.</p><p><small>Estimation : ~' + int(V.expectedVisitors(S)) + ' visiteurs par semaine.</small></p></div>';
    html += '<div class="kv"><dt>Visiteurs</dt><dd>' + int(lv.total) + ' la semaine passée</dd><dt>Satisfaction</dt><dd>' + lv.satisfaction + ' %</dd><dt>Total depuis l\'ouverture</dt><dd>' + int(S.totalVisitors) + '</dd></div>';
    html += '<div style="margin:8px 0">' + Object.keys(lv.counts).map((t) => '<div class="gauge"><small style="width:90px">' + D.VISITOR_TYPES[t].label + '</small>' + bar(lv.byType[t].sat) + '<small style="width:70px;text-align:right">' + int(lv.counts[t]) + ' · ' + lv.byType[t].sat + ' %</small></div>').join('') + '</div>';
    html += '<h4>Ce qu\'ils en disent</h4><ul class="reasons">' + (lv.reasons.length ? lv.reasons.slice(0, 6).map((r) => '<li><span class="' + (r.sign > 0 ? 'plus">＋' : 'minus">－') + '</span> ' + esc(r.text) + ' <small>(' + r.pct + ' %)</small></li>').join('') : '<li class="muted">Rien de marquant.</li>') + '</ul></div>';
    return html;
  }

  function objectivesPanel(n) {
    const todo = ME.Sim.OBJECTIVES.filter((o) => !S.objectives[o.key]);
    const list = n ? todo.slice(0, n) : ME.Sim.OBJECTIVES;
    let html = '<div class="panel paper"><h3>🧭 Objectifs</h3>';
    if (!todo.length) html += '<p>Tous les objectifs de cette première version sont atteints. Bravo, conservateur !</p>';
    list.forEach((o) => {
      const done = !!S.objectives[o.key];
      html += '<div class="objective' + (done ? ' done' : '') + '"><b>' + (done ? '✔ ' : '') + esc(o.label) + '</b> <small>+' + money(o.reward) + '</small><br><small>' + esc(o.hint) + '</small></div>';
    });
    return html + '</div>';
  }

  /* ---------- Carte ---------- */
  VIEWS.carte = function () {
    const k = view.mapSel;
    let html = '<div class="cols"><div><div class="map-box">' + ME.Render.mapSVG(S, k) + '</div><p class="hint">✎ Les sites en pointillés rouges ont une expédition en cours ; la coche verte indique une autorisation valide.</p></div><div>';
    if (k) html += destPanel(k);
    return html + '</div></div>';
  };

  function destPanel(k) {
    const d = D.DESTINATIONS[k];
    const inst = D.INSTITUTIONS[d.inst];
    const p = S.permits[d.inst];
    const locked = S.reputation < d.unlockRep;
    const active = S.expeditions.find((e) => e.dest === k && e.phase !== 'termine');
    const statusTxt = { none: 'Aucune demande', pending: 'En instruction (' + p.weeksLeft + ' sem.)', granted: 'Accordée jusqu\'à la semaine ' + p.validUntil, refused: 'Refusée — vous pouvez redemander', expired: 'Expirée' }[p.status];
    let html = '<div class="panel"><h2>' + esc(d.name) + '</h2><p><small>' + esc(d.place) + '</small> ' + periodChip(d.period) + '</p><p>' + esc(d.intro) + '</p>';
    html += '<dl class="kv"><dt>Site</dt><dd>' + esc(d.site) + '</dd><dt>Coût de terrain</dt><dd>' + money(d.weekly) + ' / semaine</dd><dt>Transport retour</dt><dd>' + d.transport + ' semaine(s)</dd><dt>Équipement requis</dt><dd>' + d.required.concat(d.transport >= 2 ? ['camp'] : []).filter((v, i, a) => a.indexOf(v) === i).map((e) => D.EQUIPMENT[e].label).join(', ') + (d.diver ? ', un plongeur' : '') + '</dd></dl>';
    html += '<h4 style="margin-top:10px">Connaissance du site</h4><div class="gauge">' + bar(S.knowledge[k]) + '<small>' + S.knowledge[k] + ' %</small></div><small>Plus le site est connu, plus les objets rares sont fréquents.</small>';
    html += '<h4 style="margin-top:10px">' + esc(inst.name) + '</h4><dl class="kv"><dt>Autorisation</dt><dd>' + statusTxt + '</dd><dt>Partenariat</dt><dd>' + Math.round(p.partnership) + ' / 100</dd>' + (inst.share ? '<dt>Accord</dt><dd>Partage des découvertes (moitié conservée sur place)</dd>' : '') + '</dl>';
    html += '<div class="gauge">' + bar(p.partnership) + '</div>';
    if (p.status !== 'pending' && !(p.status === 'granted' && p.validUntil >= S.week)) {
      html += '<div class="btn-row"><button class="btn teal" data-action="permit" data-inst="' + d.inst + '"' + (S.reputation < inst.minRep ? ' disabled' : '') + '>Demander l\'autorisation (' + money(inst.permitCost) + ')</button><small>Chance estimée : ' + Math.round(X.permitChance(S, d.inst) * 100) + ' %' + (S.reputation < inst.minRep ? ' · réputation ' + inst.minRep + ' requise' : '') + '</small></div>';
    }
    html += '<h4 style="margin-top:10px">On peut y trouver</h4><div class="chips">';
    const found = new Set(Obj.all(S, (o) => o.dest === k).map((o) => o.type));
    d.loot.forEach(([t]) => {
      const T = D.TYPES[t];
      const hidden = D.RARITY[T.rarity].score >= 3.5 && !found.has(t);
      html += '<span class="chip" style="border-color:' + D.RARITY[T.rarity].color + '">' + (hidden ? '??? (' + D.RARITY[T.rarity].label.toLowerCase() + ')' : esc(T.name)) + '</span>';
    });
    html += '</div><div class="btn-row" style="margin-top:12px">';
    if (active) html += '<button class="btn gold" data-action="tab" data-tab="expeditions">Suivre l\'expédition ' + active.id + '</button>';
    else if (locked) html += '<button class="btn" disabled>Réputation ' + d.unlockRep + ' requise</button>';
    else html += '<button class="btn primary" data-action="openPlanner" data-dest="' + k + '">Préparer une mission</button>';
    return html + '</div></div>';
  }

  /* ---------- Planificateur ---------- */
  UI.openPlanner = function (dest) {
    const d = D.DESTINATIONS[dest];
    const req = d.required.concat(d.transport >= 2 ? ['camp'] : []);
    const mission = X.permitValid(S, dest) ? 'fouille' : 'prospection';
    const free = S.staff.filter(X.isAvailable);
    const sorted = free.slice().sort((a, b) => (b.skills.fouille + b.skills.logistique) - (a.skills.fouille + a.skills.logistique));
    const team = sorted.slice(0, 3).map((p) => p.id);
    if (d.diver && !team.some((id) => S.staff.find((p) => p.id === id).traits.includes('plongeur'))) {
      const diver = free.find((p) => p.traits.includes('plongeur'));
      if (diver) team[team.length - 1] = diver.id;
    }
    view.plan = { dest, mission, weeks: D.MISSIONS[mission].minWeeks + (mission === 'fouille' ? 1 : 0), team, equip: Array.from(new Set(req.concat(['caisses']))) };
    openModal(plannerHTML);
  };

  function plannerHTML() {
    const plan = view.plan;
    const d = D.DESTINATIONS[plan.dest];
    const m = D.MISSIONS[plan.mission];
    const req = d.required.concat(d.transport >= 2 ? ['camp'] : []);
    const fc = X.forecast(S, plan);
    const cost = X.planCost(S, plan);
    const errors = X.validatePlan(S, plan);
    let html = '<h2>Préparer une mission — ' + esc(d.name) + '</h2>';
    html += '<h3>1. Type de mission</h3><div class="grid g3">';
    Object.keys(D.MISSIONS).forEach((k) => {
      const mm = D.MISSIONS[k];
      let lock = '';
      if (mm.needsPermit && !X.permitValid(S, plan.dest)) lock = 'Autorisation requise';
      if (mm.minPartner && S.permits[d.inst].partnership < mm.minPartner) lock = 'Partenariat ' + mm.minPartner + ' requis';
      html += '<button class="staff-card' + (plan.mission === k ? ' on' : '') + (lock ? ' busy' : '') + '" data-action="planMission" data-m="' + k + '"' + (lock ? ' disabled' : '') + '><div><b>' + mm.label + '</b><br><small>' + esc(mm.desc) + '</small>' + (lock ? '<br><small class="minus">' + lock + '</small>' : '') + '</div></button>';
    });
    html += '</div>';
    html += '<h3 style="margin-top:14px" id="planWeeksLabel">2. Durée sur le terrain : ' + plan.weeks + ' semaine(s)</h3>';
    if (m.minWeeks !== m.maxWeeks) html += '<input type="range" min="' + m.minWeeks + '" max="' + m.maxWeeks + '" value="' + plan.weeks + '" data-action="planWeeks" aria-label="Durée">';
    html += '<h3 style="margin-top:14px">3. Équipe (2 à 5)</h3><div class="team-pick">';
    S.staff.forEach((p) => {
      const on = plan.team.includes(p.id);
      const busy = !X.isAvailable(p);
      html += '<button class="staff-card' + (on ? ' on' : '') + (busy ? ' busy' : '') + '" data-action="planTeam" data-id="' + p.id + '"' + (busy ? ' disabled' : '') + '>' + portrait(p.look) + '<div><b>' + esc(p.name) + '</b><br><small>' + esc(p.role) + (p.traits.length ? ' · ' + p.traits.join(', ') : '') + '</small>' + skillsHTML(p.skills) + (busy ? '<small class="minus">' + staffStatus(p) + '</small>' : '') + '</div></button>';
    });
    html += '</div><h3 style="margin-top:14px">4. Équipement</h3><div class="equip">';
    Object.keys(D.EQUIPMENT).forEach((k) => {
      const e = D.EQUIPMENT[k];
      const r = req.includes(k);
      html += '<label class="' + (r ? 'req' : '') + '"><input type="checkbox" data-action="planEquip" data-k="' + k + '"' + (plan.equip.includes(k) ? ' checked' : '') + (r ? ' disabled' : '') + '><span><b>' + e.label + '</b> · ' + money(e.cost) + (r ? ' <span class="chip">obligatoire</span>' : '') + '<br><small>' + esc(e.desc) + '</small></span></label>';
    });
    html += '</div><h3 style="margin-top:14px">5. Prévisions</h3><div class="forecast">' +
      '<div><small>Découvertes attendues</small><b>≈ ' + fc.finds + '</b></div>' +
      '<div><small>Soin des objets</small><b>' + fc.care + ' %</b></div>' +
      '<div><small>Qualité de documentation</small><b>' + fc.doc + ' %</b></div>' +
      '<div><small>Sécurité du transport</small><b>' + fc.safety + ' %</b></div>' +
      '<div><small>Diplomatie</small><b>' + fc.diplomacy + ' %</b></div></div>';
    html += '<p><small>Compétences combinées : ' + Object.keys(D.SKILLS).map((k) => D.SKILLS[k] + ' ' + fc.skills[k].toFixed(1)).join(' · ') + '. Le meilleur spécialiste compte pleinement, les autres à moitié : variez les profils.</small></p>';
    html += '<h3>Budget</h3><dl class="kv"><dt>Terrain</dt><dd>' + money(cost.field) + '</dd><dt>Équipement</dt><dd>' + money(cost.equip) + '</dd><dt>Voyages</dt><dd>' + money(cost.travel) + '</dd>' + (cost.partnerShare ? '<dt>Part du partenaire</dt><dd class="plus">−' + money(cost.partnerShare) + '</dd>' : '') + '<dt>Total</dt><dd><b>' + money(cost.total) + '</b> (trésorerie : ' + money(S.money) + ')</dd></dl>';
    if (errors.length) html += '<ul class="errors">' + errors.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>';
    html += '<div class="btn-row"><button class="btn primary" data-action="launch"' + (errors.length ? ' disabled' : '') + '>Lancer l\'expédition</button><button class="btn" data-action="closeModal">Annuler</button></div>';
    return html;
  }

  /* ---------- Expéditions ---------- */
  VIEWS.expeditions = function () {
    const active = S.expeditions.filter((e) => e.phase !== 'termine');
    const past = S.expeditions.filter((e) => e.phase === 'termine').slice().reverse();
    let html = '<h2>Expéditions</h2>';
    if (!active.length) html += '<div class="panel empty">Aucune équipe sur le terrain.<br><button class="btn primary" data-action="tab" data-tab="carte" style="margin-top:10px">Ouvrir la carte</button></div>';
    html += '<div id="scene-slot" data-key="exp:' + active.map((e) => e.id).join(',') + '|' + (use3d() ? '3d' : '2d') + '"></div>';
    active.forEach((e) => { html += expPanel(e, true); });
    if (past.length) {
      html += '<h3>Campagnes terminées</h3>';
      past.forEach((e) => { html += '<details class="panel"><summary><b>' + e.id + ' — ' + esc(D.DESTINATIONS[e.dest].name) + '</b> · ' + D.MISSIONS[e.mission].label + ' · ' + e.finds.length + ' découverte(s) · ' + money(e.cost + e.extra) + '</summary>' + expPanel(e, false) + '</details>'; });
    }
    return html;
  };

  function expPanel(e, open) {
    const d = D.DESTINATIONS[e.dest];
    const team = e.team.map((id) => S.staff.find((p) => p.id === id)).filter(Boolean);
    let html = open ? '<div class="panel">' : '<div>';
    if (open) html += '<div class="panel-head"><h3>' + e.id + ' — ' + esc(d.name) + '</h3><span class="chip">' + D.MISSIONS[e.mission].label + '</span></div>' + bar(e.phase === 'terrain' ? e.progress * 100 : 100) + '<p><small>Équipe : ' + team.map((p) => esc(p.name)).join(', ') + ' · Équipement : ' + e.equip.map((k) => D.EQUIPMENT[k].label).join(', ') + '</small></p>';
    html += '<div class="cols"><div><h4>Carnet de fouille</h4><div class="carnet">' + e.log.slice().reverse().map((l) => '<div><b>S' + l.w + ' —</b> ' + esc(l.text) + '</div>').join('') + '</div></div><div><h4>Découvertes</h4>';
    if (!e.finds.length) html += '<p class="hint">Pas encore de découverte.</p>';
    html += '<div class="obj-grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">' + e.finds.map((id) => objCard(S.objects[id])).join('') + '</div></div></div>';
    return html + '</div>';
  }

  /* ---------- Collections ---------- */
  const FILTERS = {
    tous: ['Toutes', (o) => !['rendu', 'restitue'].includes(o.location) && o.owner !== 'preteur' || ['reserve', 'vitrine', 'en-route'].includes(o.location)],
    reserve: ['En réserve', (o) => o.location === 'reserve'],
    vitrine: ['Exposées', (o) => o.location === 'vitrine'],
    atelier: ['À l\'atelier', (o) => o.location === 'atelier'],
    chemin: ['En chemin', (o) => ['terrain', 'transport', 'en-route'].includes(o.location)],
    prets: ['Prêts', (o) => o.location === 'pret-sortant' || (o.owner !== 'musee' && ['reserve', 'vitrine', 'atelier'].includes(o.location))],
    depot: ['Dépôts partenaires', (o) => o.location === 'depot'],
    archives: ['Rendus & restitués', (o) => ['rendu', 'restitue'].includes(o.location)],
  };
  const SORTS = {
    recent: (a, b) => b.id.localeCompare(a.id),
    rarete: (a, b) => D.RARITY[b.rarity].score - D.RARITY[a.rarity].score,
    etat: (a, b) => a.condition - b.condition,
    periode: (a, b) => a.year - b.year,
  };

  VIEWS.collections = function () {
    const f = FILTERS[view.colFilter];
    const list = Obj.all(S, f[1]).sort(SORTS[view.colSort]);
    let html = '<div class="panel-head"><h2>Collections</h2><small>' + Obj.all(S, (o) => o.owner === 'musee' && !['restitue'].includes(o.location)).length + ' objets inventoriés · valeur exposée ' + money(Obj.all(S, (o) => o.location === 'vitrine').reduce((a, o) => a + Obj.value(o), 0)) + '</small></div>';
    if (S.pendingReveals.length) html += '<div class="panel paper"><div class="panel-head"><h3>📦 ' + S.pendingReveals.length + ' découverte(s) à déballer</h3><button class="btn gold" data-action="openReveal">Déballer au pinceau</button></div></div>';
    html += '<div class="chips" style="margin-bottom:10px">' + Object.keys(FILTERS).map((k) => '<button class="chip filter' + (view.colFilter === k ? ' on' : '') + '" data-action="colFilter" data-f="' + k + '">' + FILTERS[k][0] + ' (' + Obj.all(S, FILTERS[k][1]).length + ')</button>').join('') +
      '<select data-action="colSort" aria-label="Trier">' + [['recent', 'Plus récents'], ['rarete', 'Rareté'], ['etat', 'État (fragiles d\'abord)'], ['periode', 'Chronologie']].map(([k, l]) => '<option value="' + k + '"' + (view.colSort === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
    html += list.length ? '<div class="obj-grid">' + list.map((o) => objCard(o)).join('') + '</div>' : '<div class="panel empty">Aucun objet dans cette catégorie.</div>';
    html += marketPanel();
    return html;
  };

  function marketPanel() {
    let html = '<div class="panel" style="margin-top:18px"><div class="panel-head"><h3>🏷️ Acquisitions documentées</h3><small>Le marché de l\'art propose parfois des pièces. Un dossier lacunaire peut cacher un pillage : enquêtez avant d\'acheter.</small></div>';
    const lots = S.market.filter((l) => l.expires >= S.week);
    if (!lots.length) return html + '<p class="hint">Aucun lot proposé cette semaine.</p></div>';
    html += '<div class="grid g3">';
    lots.forEach((l) => {
      const t = D.TYPES[l.type];
      const fake = { type: l.type, mat: t.mat, seed: parseInt(l.id.slice(1), 10) * 977, condition: l.condition };
      html += '<div class="panel" style="margin:0"><div style="display:flex;gap:10px"><div style="width:90px;flex:none">' + ME.Art.objectSVG(fake, { size: 90 }) + '</div><div><b>' + esc(t.name) + '</b><br>' + periodChip(t.period) + ' ' + rarChip(t.rarity) + '<br><small>' + esc(l.seller) + ' · état ' + l.condition + '<br>Dossier : <b class="' + (l.dossier === 'complet' ? 'plus' : 'minus') + '">' + l.dossier + '</b> · expire S' + l.expires + '</small></div></div>';
      if (l.verified) html += '<p><small class="' + (l.illicit ? 'minus' : 'plus') + '">' + esc(l.verdict) + '</small></p>';
      html += '<div class="btn-row"><button class="btn small primary" data-action="buyLot" data-id="' + l.id + '">Acheter ' + money(l.price) + '</button>';
      if (!l.verified) html += '<button class="btn small" data-action="verifyLot" data-id="' + l.id + '">Enquêter (' + money(E.VERIFY_COST) + ')</button>';
      if (l.verified && l.illicit) html += '<button class="btn small teal" data-action="reportLot" data-id="' + l.id + '">Signaler aux autorités</button>';
      html += '</div></div>';
    });
    return html + '</div></div>';
  }

  /* ---------- Fiche objet ---------- */
  UI.openObj = function (id) { view.ficheAction = null; openModal(() => ficheHTML(id)); };

  function ficheHTML(id) {
    const o = S.objects[id];
    if (!o) return '<p>Objet introuvable.</p>';
    if (!o.revealed) {
      return '<h2>Caisse n° ' + o.id + '</h2><p class="hint">Cet objet attend d\'être déballé et nettoyé.</p>' + (S.pendingReveals.includes(o.id) ? '<button class="btn gold" data-action="openReveal" data-id="' + o.id + '">Déballer maintenant</button>' : '<p>Il est encore ' + esc(Obj.LOCATIONS[o.location].toLowerCase()) + '.</p>') +
        '<h3 style="margin-top:12px">Parcours</h3>' + timeline(o);
    }
    const t = Obj.type(o), m = Obj.material(o);
    const ctxTxt = o.context ? esc(o.context.site) + ', ' + esc(o.context.layer) + ', carré ' + o.context.square + ', profondeur ' + o.context.depth : '—';
    const modes = { fouille: 'Fouille programmée', prospection: 'Prospection', scientifique: 'Mission scientifique conjointe', achat: 'Acquisition documentée', legs: 'Legs / don', pret: 'Prêt' };
    const v3 = use3d() && !view.fiche2d;
    let html = '<div class="fiche"><div><div class="plate' + (v3 ? ' gl-wrap' : '') + '"' + (v3 ? ' data-viewer="' + o.id + '"' : '') + '>' + (v3 ? '' : svg(o)) + '<span class="tag">' + o.id + '</span></div>';
    if (use3d()) html += '<div class="btn-row" style="justify-content:center"><button class="btn small" data-action="ficheView">' + (v3 ? '🖼 Voir l\'illustration' : '🏺 Voir en 3D') + '</button>' + (v3 ? '<small class="muted">Glissez pour tourner l\'objet</small>' : '') + '</div>';
    html += '<div class="chips" style="margin-top:8px">' + periodChip(o.period) + rarChip(o.rarity) + locChip(o) + '</div></div><div>';
    html += '<h2>' + esc(o.name) + '</h2>';
    html += '<dl class="kv"><dt>N° d\'inventaire</dt><dd>' + o.id + '</dd><dt>Datation</dt><dd>' + esc(o.dating) + '</dd><dt>Matériau</dt><dd>' + esc(m.label) + '</dd><dt>Provenance</dt><dd>' + esc(o.provenance) + '</dd><dt>Contexte</dt><dd>' + ctxTxt + '</dd><dt>Acquisition</dt><dd>' + (modes[o.acquisition.mode] || o.acquisition.mode) + (o.acquisition.expId ? ' (' + o.acquisition.expId + ')' : '') + (o.acquisition.price ? ' · ' + money(o.acquisition.price) : '') + '</dd><dt>Propriété</dt><dd>' + esc(Obj.ownerLabel(o)) + (o.returnWeek ? ' · retour S' + o.returnWeek : '') + '</dd>' +
      '<dt>État</dt><dd>' + o.condition + ' — ' + Obj.conditionLabel(o.condition) + ' <small>(exposable dès ' + Obj.minDisplayCondition(o) + ')</small>' + bar(o.condition, 'cond') + '</dd>' +
      '<dt>Documentation</dt><dd>' + o.documentation + ' %' + bar(o.documentation) + '</dd><dt>Étude</dt><dd>' + o.studied + ' %' + bar(o.studied) + '</dd><dt>Intérêt scientifique</dt><dd>' + o.sci + ' / 100</dd><dt>Valeur estimée</dt><dd>' + money(Obj.value(o)) + '</dd>' +
      (m.light >= 0.5 ? '<dt>Conservation</dt><dd class="minus">Sensible à la lumière : préférez un éclairage tamisé.</dd>' : '') + '</dl>';
    html += '<div class="btn-row">' + ficheActions(o) + '</div>' + (view.ficheAction ? ficheSub(o) : '');
    html += '<h3 style="margin-top:14px">Fiche historique</h3><div class="histo">' + Obj.ficheTiers(o).map((tr) => tr.unlocked ? '<p>' + esc(tr.text) + '</p>' : '<p class="locked">🔒 Étude à ' + tr.need + ' % nécessaire pour en savoir plus.</p>').join('') + '</div>';
    html += '<h3 style="margin-top:14px">Parcours de l\'objet</h3>' + timeline(o);
    return html + '</div></div>';
  }

  function timeline(o) {
    return '<ul class="timeline">' + o.history.map((h) => '<li><span class="w">' + (h.w > 0 ? 'S' + h.w : 'Avant ouverture') + ' · ' + esc(Obj.LOCATIONS[h.loc] || h.loc) + '</span><br>' + esc(h.text) + '</li>').join('') + '</ul>';
  }

  function ficheActions(o) {
    let a = '';
    if (o.location === 'reserve') {
      a += '<button class="btn primary small" data-action="ficheSub" data-k="exposer" data-id="' + o.id + '">Exposer…</button>';
      if (o.owner !== 'preteur') {
        a += '<button class="btn small" data-action="ficheSub" data-k="restauration" data-id="' + o.id + '">Restaurer…</button>';
        if (o.studied < 100) a += '<button class="btn small" data-action="ficheSub" data-k="etude" data-id="' + o.id + '">Étudier…</button>';
      }
    }
    if (o.location === 'vitrine') a += '<button class="btn small" data-action="unplace" data-id="' + o.id + '">Retirer de la vitrine</button><button class="btn small" data-action="openRoom" data-room="' + o.roomId + '">Voir la salle</button>';
    if (o.location === 'atelier') { const j = S.jobs.find((x) => x.objId === o.id); if (j) a += '<span class="chip">' + C.JOBS[j.kind].label + ' : ~' + C.estimateWeeks(S, j) + ' sem.</span><button class="btn small" data-action="cancelJob" data-id="' + j.id + '">Interrompre</button>'; }
    if (o.location === 'depot') a += '<button class="btn small teal" data-action="deposit" data-id="' + o.id + '">Demander un prêt gratuit (12 sem.)</button>';
    return a;
  }

  function ficheSub(o) {
    const k = view.ficheAction;
    if (k === 'exposer') {
      const rooms = Object.keys(D.ROOMS).filter((r) => ['expo', 'temp', 'hall'].includes(D.ROOMS[r].kind) && S.rooms[r].unlocked);
      const err = E.canDisplay(S, o, 'salle1');
      if (err && err.indexOf('fragile') >= 0) return '<p class="errors">' + esc(err) + '</p>';
      return '<div class="panel paper" style="margin-top:8px"><b>Dans quelle salle ?</b><div class="btn-row">' + rooms.map((r) => {
        const free = S.rooms[r].vitrines.indexOf(null) >= 0;
        return '<button class="btn small" data-action="place" data-id="' + o.id + '" data-room="' + r + '"' + (free ? '' : ' disabled') + '>' + esc(D.ROOMS[r].name) + (S.rooms[r].theme ? ' (' + D.PERIODS[S.rooms[r].theme].label + ')' : '') + (free ? '' : ' — pleine') + '</button>';
      }).join('') + '</div></div>';
    }
    if (k === 'restauration' || k === 'etude') {
      const job = C.JOBS[k];
      const staff = S.staff.filter((p) => X.isAvailable(p) && (p.skills[job.skill] || 0) >= 1).sort((a, b) => b.skills[job.skill] - a.skills[job.skill]);
      return '<div class="panel paper" style="margin-top:8px"><b>' + job.label + ' — confier à :</b> <small>(' + C.benchesFree(S) + ' poste(s) libre(s) à l\'atelier)</small><div class="btn-row">' + (staff.length ? staff.map((p) => {
        const err = C.canStart(S, o.id, k, p.id);
        const est = err ? '' : ' · ~' + C.estimateWeeks(S, { objId: o.id, kind: k, staffId: p.id, target: k === 'restauration' ? C.restoreCap(p) : 100 }) + ' sem.';
        return '<button class="btn small" data-action="startJob" data-id="' + o.id + '" data-k="' + k + '" data-staff="' + p.id + '"' + (err ? ' disabled title="' + esc(err) + '"' : '') + '>' + esc(p.name) + ' (' + D.SKILLS[job.skill] + ' ' + p.skills[job.skill] + ')' + est + '</button>';
      }).join('') : '<small>Personne de disponible avec cette compétence.</small>') + '</div>' + (C.benchesFree(S) <= 0 ? '<p class="errors">Tous les postes de l\'atelier sont occupés.</p>' : '') + '</div>';
    }
    return '';
  }

  /* ---------- Salle ---------- */
  UI.openRoom = function (roomId) { view.pick = null; openModal(() => roomHTML(roomId)); };

  function roomHTML(id) {
    const def = D.ROOMS[id];
    const room = S.rooms[id];
    if (['atelier', 'reserves', 'shop'].includes(def.kind)) {
      const go = { atelier: 'atelier', reserves: 'collections', shop: 'finances' }[def.kind];
      return '<h2>' + esc(def.name) + '</h2><p>' + { atelier: 'L\'atelier accueille ' + S.benches + ' poste(s) de travail. ' + S.jobs.length + ' travail(aux) en cours.', reserves: Obj.reserveCount(S) + ' objets pour ' + S.reserveCap + ' emplacements.', shop: 'Boutique de niveau ' + S.shopLevel + '. Les visiteurs satisfaits y dépensent davantage.' }[def.kind] + '</p><button class="btn primary" data-action="tab" data-tab="' + go + '" data-close="1">Ouvrir l\'onglet</button>';
    }
    if (!room.unlocked) {
      return '<h2>' + esc(def.name) + '</h2><p>' + esc(def.desc || '') + '</p><p>Coût des travaux : <b>' + money(def.cost) + '</b></p><button class="btn primary" data-action="upgrade" data-k="' + id + '"' + (S.money < def.cost ? ' disabled' : '') + '>Lancer les travaux</button>';
    }
    const an = E.analyzeRoom(S, id);
    const route = E.normalizeRoute(S);
    const lv = S.lastVisit;
    let html = '<h2>' + esc(def.name) + '</h2>' + (def.desc ? '<p><small>' + esc(def.desc) + '</small></p>' : '');
    html += '<div class="cols"><div><h3>Vitrines</h3><div class="obj-grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">';
    room.vitrines.forEach((oid, i) => {
      if (oid) html += '<div>' + objCard(S.objects[oid], { noLoc: true }) + '<div class="btn-row"><button class="btn small" data-action="unplace" data-id="' + oid + '">Retirer</button></div></div>';
      else html += '<button class="obj-card" data-action="pickSlot" data-room="' + id + '" data-slot="' + i + '" style="border-style:dashed;justify-content:center;align-items:center;min-height:150px"><span style="font-size:2rem">＋</span><span>Vitrine ' + (i + 1) + ' libre</span></button>';
    });
    html += '</div>';
    if (view.pick && view.pick.room === id) {
      const cands = Obj.all(S, (o) => o.location === 'reserve' && o.revealed).sort((a, b) => Obj.appeal(b) - Obj.appeal(a));
      html += '<div class="panel paper" style="margin-top:10px"><b>Choisir un objet pour la vitrine ' + (view.pick.slot + 1) + '</b>' + (room.theme ? ' <small>(thème : ' + D.PERIODS[room.theme].label + ')</small>' : '') + '<div class="pick-list" style="margin-top:6px">' + (cands.length ? cands.map((o) => {
        const err = E.canDisplay(S, o, id);
        const note = err ? 'Trop fragile' : (room.theme && o.period !== room.theme ? 'Hors thème' : (room.theme ? '✓ Dans le thème' : ''));
        return objCard(o, { action: err ? 'openObj' : 'placeSlot', data: ' data-room="' + id + '" data-slot="' + view.pick.slot + '"', disabled: !!err, note, noLoc: true, title: err || '' });
      }).join('') : '<p class="hint">Réserve vide : partez en expédition ou empruntez des objets !</p>') + '</div></div>';
    }
    html += '</div><div>';
    if (def.kind !== 'hall') {
      html += '<h3>Thème</h3><select data-action="roomTheme" data-room="' + id + '" aria-label="Thème de la salle"><option value="">Aucun thème</option>' + Object.keys(D.PERIODS).map((p) => '<option value="' + p + '"' + (room.theme === p ? ' selected' : '') + '>' + D.PERIODS[p].long + '</option>').join('') + '</select><p><small>Avec 3 objets ou plus de la période choisie, la salle gagne +25 % d\'attrait ; chaque objet hors thème coûte 15 %.</small></p>';
    }
    if (def.kind !== 'hall') {
      html += '<h3>Disposition des vitrines</h3><div class="chips">' + Object.keys(E.PRESETS).map((k) => '<button class="chip filter" data-action="roomPreset" data-room="' + id + '" data-k="' + k + '" title="' + esc(E.PRESETS[k].desc) + '">' + E.PRESETS[k].label + '</button>').join('') + '</div>' +
        '<p><small>' + (use3d() ? 'Ou placez chaque vitrine à la main dans la vue 3D avec <b>✥ Aménager</b>. ' : '') + 'Espacez les vitrines, laissez les portes libres et isolez votre plus belle pièce : les effets s\'affichent ci-dessous.</small></p>';
    }
    html += '<h3>Éclairage</h3><div class="grid">' + Object.keys(D.LIGHTING).map((l) => '<label class="staff-card' + (room.lighting === l ? ' on' : '') + '"><input type="radio" name="light" data-action="roomLight" data-room="' + id + '" value="' + l + '"' + (room.lighting === l ? ' checked' : '') + '><span><b>' + D.LIGHTING[l].label + '</b><br><small>' + esc(D.LIGHTING[l].desc) + '</small></span></label>').join('') + '</div>';
    html += '<h3 style="margin-top:12px">Effets sur le public</h3><p>Attrait de la salle : <b>' + an.score.toFixed(1) + '</b>' + (lv && lv.rooms[id] != null ? ' · plaisir moyen mesuré la semaine passée : <b>' + lv.rooms[id] + '</b>' : '') + '</p><ul class="reasons">' + an.notes.map((n) => '<li><span class="' + (n.s > 0 ? 'plus">＋' : n.s < 0 ? 'minus">－' : 'muted">•') + '</span> ' + esc(n.t) + '</li>').join('') + '</ul>';
    if (def.kind !== 'hall') {
      const pos = route.indexOf(id);
      html += '<h3 style="margin-top:12px">Place dans le parcours</h3><p>Étape ' + (pos + 2) + ' sur ' + (route.length + 1) + ' (après le hall). <small>Les familles et scolaires se fatiguent après 3 étapes : placez vos plus belles salles tôt.</small></p><div class="btn-row"><button class="btn small" data-action="route" data-room="' + id + '" data-dir="-1"' + (pos <= 0 ? ' disabled' : '') + '>↑ Plus tôt</button><button class="btn small" data-action="route" data-room="' + id + '" data-dir="1"' + (pos >= route.length - 1 ? ' disabled' : '') + '>↓ Plus tard</button></div>';
    }
    return html + '</div></div>';
  }

  /* ---------- Atelier ---------- */
  VIEWS.atelier = function () {
    let html = '<div class="panel-head"><h2>Atelier de restauration & d\'étude</h2><small>' + S.jobs.length + ' / ' + S.benches + ' postes occupés</small></div><div class="cols"><div>';
    for (let b = 0; b < S.benches; b++) {
      const j = S.jobs[b];
      if (!j) { html += '<div class="bench free">Poste ' + (b + 1) + ' libre — choisissez un objet ci-dessous</div>'; continue; }
      const o = S.objects[j.objId], p = S.staff.find((s) => s.id === j.staffId);
      const cur = j.kind === 'restauration' ? o.condition : o.studied;
      const pct = j.target > j.from ? (cur - j.from) / (j.target - j.from) * 100 : 100;
      html += '<div class="bench"><div class="pic">' + svg(o) + '</div><div><b>' + C.JOBS[j.kind].label + '</b> — ' + esc(o.name) + ' <small>' + o.id + '</small><br><small>Par ' + esc(p ? p.name : '—') + ' · ' + (j.kind === 'restauration' ? 'état ' + cur + ' → ' + j.target : 'étude ' + cur + ' %') + ' · ~' + C.estimateWeeks(S, j) + ' semaine(s)</small>' + bar(pct) + '<div class="btn-row"><button class="btn small" data-action="openObj" data-id="' + o.id + '">Fiche</button><button class="btn small" data-action="cancelJob" data-id="' + j.id + '">Interrompre</button></div></div></div>';
    }
    const up = F.upgradeState(S, 'bench');
    html += '<div class="btn-row"><button class="btn" data-action="upgrade" data-k="bench"' + (up.done ? ' disabled' : '') + '>' + (up.done ? 'Atelier au maximum (' + S.benches + ' postes)' : '+1 poste de travail (' + money(up.cost) + ')') + '</button></div>';
    html += '<div class="panel" style="margin-top:14px"><h3>Nouveau travail</h3>';
    const a = view.atelier;
    html += '<div class="chips" style="margin-bottom:8px">' + Object.keys(C.JOBS).map((k) => '<button class="chip filter' + (a.kind === k ? ' on' : '') + '" data-action="atKind" data-k="' + k + '">' + C.JOBS[k].label + '</button>').join('') + '</div>';
    const cands = Obj.all(S, (o) => o.location === 'reserve' && o.revealed && o.owner !== 'preteur' && (a.kind === 'etude' ? o.studied < 100 : o.condition < 95)).sort((x, y) => a.kind === 'etude' ? y.sci - x.sci : (x.condition - Obj.minDisplayCondition(x)) - (y.condition - Obj.minDisplayCondition(y)));
    html += '<b>1. Objet</b> <small>' + (a.kind === 'etude' ? '(triés par intérêt scientifique)' : '(les plus urgents d\'abord)') + '</small><div class="pick-list">' + (cands.length ? cands.map((o) => {
      const card = objCard(o, { action: 'atObj', noLoc: true, note: a.kind === 'etude' ? 'Étude ' + o.studied + ' % · intérêt ' + o.sci : 'État ' + o.condition + (o.condition < Obj.minDisplayCondition(o) ? ' — non exposable' : '') });
      return a.obj === o.id ? card.replace('class="obj-card', 'style="background:#fff4d6;box-shadow:inset 0 0 0 3px #d39b2a" class="obj-card') : card;
    }).join('') : '<p class="hint">Aucun objet en réserve à traiter.</p>') + '</div>';
    const job = C.JOBS[a.kind];
    const staff = S.staff.filter((p) => (p.skills[job.skill] || 0) >= 1).sort((x, y) => y.skills[job.skill] - x.skills[job.skill]);
    html += '<b>2. Spécialiste</b><div class="team-pick" style="margin:6px 0">' + staff.map((p) => {
      const busy = !X.isAvailable(p);
      return '<button class="staff-card' + (a.staff === p.id ? ' on' : '') + (busy ? ' busy' : '') + '" data-action="atStaff" data-id="' + p.id + '"' + (busy ? ' disabled' : '') + '>' + portrait(p.look) + '<div><b>' + esc(p.name) + '</b><br><small>' + D.SKILLS[job.skill] + '</small> ' + pips(p.skills[job.skill]) + '<br><small>' + staffStatus(p) + (a.kind === 'restauration' ? ' · plafond ' + C.restoreCap(p) : '') + '</small></div></button>';
    }).join('') + '</div>';
    const err = a.obj && a.staff ? C.canStart(S, a.obj, a.kind, a.staff) : 'Choisissez un objet et un spécialiste.';
    html += (err ? '<p class="muted">' + esc(err) + '</p>' : '<p class="ok-msg">Durée estimée : ~' + C.estimateWeeks(S, { objId: a.obj, kind: a.kind, staffId: a.staff, target: a.kind === 'restauration' ? C.restoreCap(S.staff.find((p) => p.id === a.staff)) : 100 }) + ' semaine(s).</p>') + '<button class="btn primary" data-action="atStart"' + (err ? ' disabled' : '') + '>Lancer le travail</button></div>';
    html += '</div><div>';
    const ru = C.reserveUsage(S);
    const rup = F.upgradeState(S, 'reserve');
    html += '<div class="panel"><h3>Réserves</h3><div class="gauge">' + bar(ru.used / ru.cap * 100) + '<small>' + ru.used + ' / ' + ru.cap + '</small></div>' + (ru.used > ru.cap ? '<p class="minus">Réserves saturées : ' + (ru.used - ru.cap) + ' objet(s) en stockage externe (30 €/semaine chacun).</p>' : '<p><small>Les objets à l\'atelier comptent dans les réserves.</small></p>') + '<button class="btn small" data-action="upgrade" data-k="reserve">Agrandir (+10) — ' + money(rup.cost) + '</button></div>';
    html += '<div class="panel paper"><h3>Comment ça marche</h3><p><small><b>Restauration</b> : remonte l\'état de l\'objet jusqu\'au plafond permis par le talent du restaurateur. Un objet trop abîmé ne peut pas être exposé.<br><b>Étude</b> : débloque la fiche historique (40 % et 80 %), rapporte de la science et, à 100 %, une publication (+1 réputation, partenariat renforcé).<br>Chaque poste occupe une personne : elle ne peut pas partir en expédition en même temps.</small></p></div>';
    return html + '</div></div>';
  };

  /* ---------- Expositions ---------- */
  VIEWS.expositions = function () {
    const route = E.normalizeRoute(S);
    let html = '<h2>Expositions & prêts</h2><div class="cols"><div>';
    html += '<div class="panel"><h3>Parcours de visite</h3><p><small>Les visiteurs entrent par le hall puis suivent cet ordre. Leur fatigue augmente après quelques salles (3 pour les familles et scolaires, 6 pour les passionnés).</small></p><ol style="padding-left:20px">';
    html += '<li><b>Hall & billetterie</b> — pièce d\'appel : ' + (S.rooms.hall.vitrines[0] ? esc(S.objects[S.rooms.hall.vitrines[0]].name) : '<span class="minus">vide</span>') + '</li>';
    route.forEach((r, i) => { const an = E.analyzeRoom(S, r); html += '<li><b>' + esc(D.ROOMS[r].name) + '</b> ' + (S.rooms[r].theme ? periodChip(S.rooms[r].theme) : '') + ' · attrait ' + an.score.toFixed(1) + ' <span class="btn-row" style="display:inline-flex;margin:0 0 0 6px"><button class="btn small" data-action="route" data-room="' + r + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Monter">↑</button><button class="btn small" data-action="route" data-room="' + r + '" data-dir="1"' + (i === route.length - 1 ? ' disabled' : '') + ' aria-label="Descendre">↓</button><button class="btn small" data-action="openRoom" data-room="' + r + '">Gérer</button></span></li>'; });
    html += '</ol></div>';
    html += tempPanel();
    html += '<div class="panel"><h3>Demandes de prêt d\'autres musées</h3>';
    const offers = S.loanOffers.filter((of) => of.expires >= S.week);
    if (!offers.length) html += '<p class="hint">Aucune demande pour l\'instant. Plus votre réputation grandit, plus on vous sollicite.</p>';
    offers.forEach((of) => {
      const elig = E.loanOutEligible(S, of);
      html += '<div class="objective"><b>' + esc(of.museum) + '</b> — exposition « ' + esc(of.expo) + ' »<br><small>Cherche : ' + D.PERIODS[of.period].label + ', rareté ' + D.RARITY[of.minRarity].label.toLowerCase() + ' ou plus, état ≥ 60, étude ≥ 40 · ' + of.weeks + ' semaines · redevance ' + money(of.fee) + ' · réputation +' + of.rep + ' · répondre avant S' + of.expires + '</small><div class="btn-row">' + (elig.length ? elig.map((o) => '<button class="btn small" data-action="loanOut" data-offer="' + of.id + '" data-id="' + o.id + '">Prêter ' + esc(o.name) + ' (' + o.id + ')</button>').join('') : '<small class="minus">Aucun objet éligible dans vos collections.</small>') + '</div></div>';
    });
    const out = Obj.all(S, (o) => o.location === 'pret-sortant');
    if (out.length) html += '<h4>Nos objets prêtés</h4>' + out.map((o) => '<div class="objective">' + esc(o.name) + ' (' + o.id + ') — ' + esc(o.loanOut.museum) + ', retour S' + o.loanOut.returnWeek + '</div>').join('');
    html += '</div></div><div>';
    html += '<div class="panel"><h3>Emprunter à nos partenaires</h3><p><small>Un bon partenariat (gagné sur le terrain, en publiant et en rendant les prêts à l\'heure) ouvre les catalogues.</small></p>';
    const cat = E.loanCatalog(S);
    Object.keys(D.INSTITUTIONS).forEach((k) => {
      const items = cat.filter((c) => c.inst === k);
      html += '<h4 style="margin-top:8px">' + esc(D.INSTITUTIONS[k].name) + ' <small>(partenariat ' + Math.round(S.permits[k].partnership) + ')</small></h4>';
      items.forEach((c) => {
        const t = D.TYPES[c.type];
        html += '<div style="display:flex;gap:8px;align-items:center;margin:4px 0"><div style="width:46px;flex:none">' + ME.Art.objectSVG({ type: c.type, mat: t.mat, seed: c.type.length * 1301, condition: 85 }, { size: 46 }) + '</div><div style="flex:1"><b>' + esc(t.name) + '</b> ' + rarChip(t.rarity) + '<br><small>' + c.weeks + ' sem. · ' + money(c.fee) + ' · partenariat ' + c.minPartner + ' requis</small></div><button class="btn small" data-action="loanIn" data-inst="' + k + '" data-type="' + c.type + '"' + (c.available ? '' : ' disabled') + '>' + (c.busy ? 'Déjà prêté' : 'Emprunter') + '</button></div>';
      });
    });
    html += '</div>';
    const deps = Obj.all(S, (o) => o.location === 'depot');
    html += '<div class="panel"><h3>Dépôts chez nos partenaires</h3><p><small>Objets issus de nos missions mais conservés par les autorités locales. Prêt gratuit de 12 semaines (partenariat ≥ 25).</small></p>' + (deps.length ? '<div class="obj-grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">' + deps.map((o) => '<div>' + objCard(o, { noLoc: true }) + '<button class="btn small" style="width:100%;margin-top:4px" data-action="deposit" data-id="' + o.id + '">Emprunter</button></div>').join('') + '</div>' : '<p class="hint">Aucun dépôt pour l\'instant.</p>') + '</div>';
    const ins = S.loansIn;
    if (ins.length) html += '<div class="panel"><h3>Prêts reçus en cours</h3>' + ins.map((l) => { const o = S.objects[l.objId]; return '<div class="objective">' + esc(o.name) + ' (' + o.id + ') — ' + D.INSTITUTIONS[l.inst].short + ' · ' + Obj.LOCATIONS[o.location] + ' · retour S' + l.returnWeek + '</div>'; }).join('') + '</div>';
    return html + '</div></div>';
  };

  function tempPanel() {
    let html = '<div class="panel"><h3>Exposition temporaire</h3>';
    if (!S.rooms.temp.unlocked) return html + '<p>Ouvrez la salle des expositions temporaires (' + money(D.ROOMS.temp.cost) + ') pour créer des événements qui attirent un nouveau public.</p><button class="btn primary" data-action="upgrade" data-k="temp">Lancer les travaux</button></div>';
    if (S.tempExpo) {
      const t = S.tempExpo;
      return html + '<p><b>« ' + esc(t.title) + ' »</b> ' + periodChip(t.theme) + '</p><p>Fin : semaine ' + t.end + ' · ' + int(t.visitors) + ' visiteurs · satisfaction ' + (t.satN ? Math.round(t.satSum / t.satN) : '—') + ' %</p><button class="btn" data-action="openRoom" data-room="temp">Gérer la salle</button></div>';
    }
    const n = S.rooms.temp.vitrines.filter(Boolean).length;
    const err = E.canStartTemp(S, view.tempTitle || 'x');
    html += '<p><small>1) Choisissez un thème et installez au moins 3 objets dans la salle (vos pièces ou des prêts). 2) Donnez un titre. 3) Inaugurez : ' + E.TEMP_WEEKS + ' semaines d\'événement, une critique notée et de la réputation.</small></p>';
    html += '<div class="btn-row"><select data-action="roomTheme" data-room="temp" aria-label="Thème"><option value="">Thème…</option>' + Object.keys(D.PERIODS).map((p) => '<option value="' + p + '"' + (S.rooms.temp.theme === p ? ' selected' : '') + '>' + D.PERIODS[p].long + '</option>').join('') + '</select><button class="btn" data-action="openRoom" data-room="temp">Installer les objets (' + n + '/5)</button></div>';
    html += '<div class="btn-row"><input type="text" id="tempTitle" placeholder="Titre de l\'exposition" value="' + esc(view.tempTitle || '') + '" maxlength="40" style="flex:1"><button class="btn primary" data-action="startTemp">Inaugurer (' + money(E.TEMP_COST) + ')</button></div>';
    if (err && err.indexOf('titre') < 0) html += '<p class="muted"><small>' + esc(err) + '</small></p>';
    if (S.tempHistory.length) html += '<h4>Expositions passées</h4>' + S.tempHistory.map((t) => '<div class="objective">« ' + esc(t.title) + ' » — S' + t.start + '→S' + t.end + ' · ' + int(t.visitors) + ' visiteurs · ' + '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars) + '</div>').join('');
    return html + '</div>';
  }

  /* ---------- Équipe ---------- */
  VIEWS.equipe = function () {
    let html = '<h2>L\'équipe du musée</h2><div class="grid g2">';
    S.staff.forEach((p) => {
      const acc = p.assign && p.assign.kind === 'accueil';
      html += '<div class="panel" style="margin:0"><div style="display:flex;gap:10px">' + portrait(p.look) + '<div style="flex:1"><b>' + esc(p.name) + '</b> <small>' + esc(p.role) + '</small><br><small>' + staffStatus(p) + ' · ' + money(p.salary) + '/sem.' + (p.traits.length ? ' · ' + p.traits.join(', ') : '') + '</small>' + skillsHTML(p.skills) + '</div></div><div class="btn-row"><button class="btn small' + (acc ? ' gold' : '') + '" data-action="accueil" data-id="' + p.id + '"' + (p.assign && !acc ? ' disabled' : '') + '>' + (acc ? 'Quitter l\'accueil' : 'Affecter à l\'accueil') + '</button><button class="btn small" data-action="fire" data-id="' + p.id + '">Congédier</button></div></div>';
    });
    html += '</div><p class="hint" style="margin-top:10px">✎ À l\'accueil, un bon médiateur augmente la satisfaction de tous les visiteurs. Sur le terrain, la Fouille trouve, la Conservation protège, la Recherche documente, la Logistique sécurise et la Diplomatie rassure les partenaires.</p>';
    html += '<h3 style="margin-top:16px">Candidatures</h3><div class="grid g2">';
    if (!S.candidates.length) html += '<p class="hint">Aucune candidature. De nouveaux profils arrivent toutes les 8 semaines.</p>';
    S.candidates.forEach((c, i) => {
      html += '<div class="panel paper" style="margin:0"><div style="display:flex;gap:10px">' + portrait(c.look) + '<div style="flex:1"><b>' + esc(c.name) + '</b> <small>' + esc(c.role) + '</small><br><small>' + money(c.salary) + '/sem.' + (c.traits.length ? ' · ' + c.traits.join(', ') : '') + '</small>' + skillsHTML(c.skills) + '</div></div><button class="btn small primary" data-action="hire" data-i="' + i + '">Recruter (frais ' + money(c.salary * 4) + ')</button></div>';
    });
    return html + '</div>';
  };

  /* ---------- Finances ---------- */
  VIEWS.finances = function () {
    const ch = F.charges(S);
    const exp = V.expectedVisitors(S);
    let html = '<h2>Finances</h2><div class="cols"><div>';
    html += '<div class="panel"><h3>Billetterie</h3><label>Prix du billet : <b>' + money(S.ticketPrice) + '</b> <small>(demi-tarif scolaires)</small></label><input type="range" min="0" max="20" step="1" value="' + S.ticketPrice + '" data-action="price" aria-label="Prix du billet"><p><small>Estimation : ~' + int(exp) + ' visiteurs/semaine · ~' + money(exp * S.ticketPrice * 0.91) + ' de billetterie. Au-delà de 10 €, les visiteurs trouvent le billet cher.</small></p></div>';
    html += '<div class="panel"><h3>Évolution</h3><div class="chart">' + chartSVG() + '</div><small><span style="color:#5f7f2a">■</span> recettes · <span style="color:#b23a2a">■</span> dépenses · <span style="color:#3f5a92">—</span> trésorerie</small></div>';
    const lw = S.ledger[S.ledger.length - 1];
    html += '<div class="panel"><h3>Bilan de la semaine ' + (lw ? lw.week : '—') + '</h3>';
    if (lw) {
      html += '<table class="ledger"><thead><tr><th>Poste</th><th class="num">Montant</th></tr></thead><tbody>' + lw.entries.map((e) => '<tr><td>' + esc(e.label) + '</td><td class="num ' + (e.amount >= 0 ? 'plus' : 'minus') + '">' + money(e.amount) + '</td></tr>').join('') + '<tr><th>Résultat</th><th class="num">' + money(lw.net) + '</th></tr></tbody></table>';
    } else html += '<p class="hint">Aucune semaine écoulée.</p>';
    html += '</div></div><div>';
    html += '<div class="panel"><h3>Charges hebdomadaires</h3><dl class="kv"><dt>Salaires</dt><dd>' + money(ch.salaries) + '</dd><dt>Entretien</dt><dd>' + money(ch.upkeep) + '</dd><dt>Assurance</dt><dd>' + money(ch.insurance) + '</dd><dt>Stockage externe</dt><dd>' + money(ch.storage) + '</dd><dt>Total</dt><dd><b>' + money(ch.salaries + ch.upkeep + ch.insurance + ch.storage) + '</b></dd></dl></div>';
    html += '<div class="panel"><h3>Subventions</h3>';
    Object.keys(D.GRANTS).forEach((k) => {
      const g = D.GRANTS[k]; const st = S.grants[k];
      const err = F.canApply(S, k);
      const status = !st ? '' : st.status === 'pending' ? 'Dossier en instruction' : st.status === 'active' ? 'Versement en cours (' + st.weeksLeft + ' sem.)' : st.cooldownUntil > S.week ? 'Obtenue — nouvelle demande en S' + st.cooldownUntil : '';
      html += '<div class="objective"><b>' + esc(g.label) + '</b> — ' + (g.weeks ? money(g.amount) + '/sem. × ' + g.weeks : money(g.amount)) + '<br><small>' + esc(g.desc) + ' Conditions : ' + esc(g.req) + '.</small>' + (status ? '<br><small class="plus">' + status + '</small>' : '') + '<div class="btn-row"><button class="btn small teal" data-action="grant" data-k="' + k + '"' + (err ? ' disabled title="' + esc(err) + '"' : '') + '>Déposer un dossier</button></div></div>';
    });
    html += '</div><div class="panel"><h3>Travaux & investissements</h3>';
    Object.keys(D.UPGRADES).forEach((k) => {
      const u = D.UPGRADES[k]; const st = F.upgradeState(S, k);
      html += '<div class="objective"><b>' + esc(u.label) + '</b><br><small>' + esc(u.desc) + '</small><div class="btn-row"><button class="btn small" data-action="upgrade" data-k="' + k + '"' + (st.done ? ' disabled' : '') + '>' + (st.done ? 'Fait' : money(st.cost)) + '</button></div></div>';
    });
    return html + '</div></div></div>';
  };

  function chartSVG() {
    const L = S.ledger.slice(-20);
    if (!L.length) return '<p class="hint">Le graphique apparaîtra après la première semaine.</p>';
    const W = 600, H = 200, pad = 30;
    const max = Math.max(1, ...L.map((l) => Math.max(l.income, -l.spend)));
    const bmax = Math.max(1, ...L.map((l) => Math.abs(l.balance)));
    const bw = (W - pad * 2) / L.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Recettes et dépenses des dernières semaines"><line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#2b2118"/>';
    L.forEach((l, i) => {
      const x = pad + i * bw;
      const hi = l.income / max * (H - pad * 2), hs = -l.spend / max * (H - pad * 2);
      s += '<rect x="' + (x + 2) + '" y="' + (H - pad - hi) + '" width="' + (bw / 2 - 3) + '" height="' + hi + '" fill="#5f7f2a"><title>S' + l.week + ' recettes ' + money(l.income) + '</title></rect>';
      s += '<rect x="' + (x + bw / 2) + '" y="' + (H - pad - hs) + '" width="' + (bw / 2 - 3) + '" height="' + hs + '" fill="#b23a2a"><title>S' + l.week + ' dépenses ' + money(-l.spend) + '</title></rect>';
      if (i % Math.ceil(L.length / 8) === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (H - 12) + '" font-size="10" text-anchor="middle" font-family="Georgia">S' + l.week + '</text>';
    });
    s += '<polyline fill="none" stroke="#3f5a92" stroke-width="2.4" points="' + L.map((l, i) => (pad + i * bw + bw / 2) + ',' + (H - pad - Math.max(0, l.balance) / bmax * (H - pad * 2))).join(' ') + '"/>';
    return s + '</svg>';
  }

  /* ---------- Journal ---------- */
  VIEWS.journal = function () {
    let html = '<div class="cols"><div><div class="panel"><h2>Journal du conservateur</h2><ul class="journal">' + S.journal.map((j) => '<li class="' + j.kind + '"><span class="w">S' + j.week + '</span>' + esc(j.text) + '</li>').join('') + '</ul></div></div><div>';
    html += objectivesPanel(0);
    html += '<div class="panel"><h3>Sauvegarde</h3><p><small>La partie est enregistrée automatiquement à chaque action.</small></p><button class="btn" data-action="openSettings">Exporter / importer</button></div>';
    return html + '</div></div>';
  };

  /* ================= MODALES ================= */
  function openModal(render, cls) { modal = { render, cls: cls || '' }; renderModal(); }
  function closeModal() {
    modal = null; view.pick = null; view.ficheAction = null;
    const root = $('#modal-root'); root.innerHTML = '';
    if (view.revealCleanup) { view.revealCleanup(); view.revealCleanup = null; }
  }
  UI.closeModal = closeModal;
  function renderModal() {
    const root = $('#modal-root');
    const scroll = $('.modal-back', root) ? $('.modal-back', root).scrollTop : 0;
    root.innerHTML = '<div class="modal-back" data-action="backdrop"><div class="modal ' + modal.cls + '" role="dialog" aria-modal="true"><button class="btn icon close" data-action="closeModal" aria-label="Fermer">✕</button>' + modal.render() + '</div></div>';
    $('.modal-back', root).scrollTop = scroll;
    paintPortraits(root);
    $$('[data-viewer]', root).forEach((el) => { const o = S.objects[el.dataset.viewer]; if (o && ME.Scene3D) ME.Scene3D.viewer(el, o); });
    if (modal.after) modal.after(root);
  }

  /* ---------- Déballage au pinceau ---------- */
  UI.openReveal = function (id) {
    if (id && S.pendingReveals.includes(id)) S.pendingReveals = [id].concat(S.pendingReveals.filter((x) => x !== id));
    if (!S.pendingReveals.length) return;
    view.revealIdx = 0;
    showReveal();
  };

  function showReveal() {
    const id = S.pendingReveals[0];
    const o = S.objects[id];
    const total = S.pendingReveals.length;
    const rare = D.RARITY[o.rarity].score >= 3.5;
    modal = {
      cls: '',
      render: () => {
        const t = Obj.type(o);
        return '<h2>Déballage — caisse ' + o.id + '</h2><p class="hint">✎ Passez le pinceau sur la terre pour dégager la découverte.' + (total > 1 ? ' (encore ' + (total - 1) + ' après celle-ci)' : '') + '</p>' +
          '<div class="reveal"><div><div class="dig' + (rare ? ' rare' : '') + '" id="dig"><div class="obj">' + svg(o) + '</div><div class="shine"></div><canvas></canvas></div><div class="btn-row"><button class="btn small" data-action="revealAll">Tout dégager</button></div></div>' +
          '<div class="reveal-info" id="revealInfo"><div class="chips">' + periodChip(o.period) + rarChip(o.rarity) + '</div><div class="big-title">' + esc(o.name) + '</div><div class="id">N° ' + o.id + '</div>' +
          '<dl class="kv" style="margin-top:8px"><dt>Datation</dt><dd>' + esc(o.dating) + '</dd><dt>Provenance</dt><dd>' + esc(o.provenance) + '</dd>' + (o.context ? '<dt>Contexte</dt><dd>' + esc(o.context.layer) + ', carré ' + o.context.square + ', ' + o.context.depth + '</dd>' : '') + '<dt>État</dt><dd>' + o.condition + ' — ' + Obj.conditionLabel(o.condition) + bar(o.condition, 'cond') + '</dd><dt>Documentation de terrain</dt><dd>' + o.documentation + ' %</dd><dt>Intérêt scientifique</dt><dd>' + o.sci + ' / 100</dd></dl>' +
          '<p class="carnet" style="margin-top:10px">' + esc(t.h[0]) + '</p>' +
          (o.location === 'depot' ? '<p><small>Selon l\'accord, cet objet reste chez ' + esc(D.INSTITUTIONS[o.lender].name) + '. Vous pourrez l\'emprunter.</small></p>' : '') +
          (o.condition < Obj.minDisplayCondition(o) ? '<p class="minus"><small>Trop fragile pour être exposé : confiez-le à l\'atelier.</small></p>' : '') +
          '<div class="btn-row"><button class="btn primary" data-action="revealNext" disabled id="revealNext">' + (total > 1 ? 'Caisse suivante ▶' : 'Ranger en réserve') + '</button><button class="btn" data-action="openObj" data-id="' + o.id + '" id="revealFiche" disabled>Fiche complète</button></div></div></div>';
      },
      after: (root) => setupBrush(root, o),
    };
    renderModal();
  }

  function setupBrush(root, o) {
    const dig = $('#dig', root), cv = $('canvas', dig);
    if (o.revealed) {
      dig.classList.add('done'); $('#revealInfo', root).classList.add('on');
      $('#revealNext', root).disabled = false; $('#revealFiche', root).disabled = false;
      view.revealFinish = () => {};
      return;
    }
    const dpr = Math.min(2, G.devicePixelRatio || 1);
    const size = dig.clientWidth || 300;
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext('2d');
    const rnd = ME.seeded(o.seed + 99);
    const sea = o.dest && D.DESTINATIONS[o.dest].biome === 'sea';
    const desert = o.dest && D.DESTINATIONS[o.dest].biome === 'desert';
    ctx.fillStyle = sea ? '#8f9a7a' : desert ? '#d4b06e' : '#8a6a44';
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 1600; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(43,33,24,.18)' : 'rgba(255,240,210,.14)'; ctx.fillRect(rnd() * cv.width, rnd() * cv.height, 2 * dpr, 2 * dpr); }
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(rnd() * cv.width, rnd() * cv.height, (3 + rnd() * 9) * dpr, (2 + rnd() * 6) * dpr, rnd() * 3, 0, Math.PI * 2); ctx.fillStyle = sea ? '#e8e2d0' : '#a08a6a'; ctx.fill(); ctx.strokeStyle = 'rgba(43,33,24,.5)'; ctx.lineWidth = dpr; ctx.stroke(); }
    let moves = 0, done = false, down = false;
    const finish = () => {
      if (done) return; done = true;
      dig.classList.add('done');
      if (use3d()) {
        const holder = $('.obj', dig);
        holder.innerHTML = ''; holder.classList.add('gl-wrap'); holder.style.inset = '0';
        setTimeout(() => { if (holder.isConnected) ME.Scene3D.viewer(holder, o, { pop: true }); }, 350);
      }
      $('#revealInfo', root).classList.add('on');
      $('#revealNext', root).disabled = false;
      $('#revealFiche', root).disabled = false;
      if (!o.revealed) {
        o.revealed = true;
        Obj.addHistory(S, o, o.location === 'depot' ? 'Découverte nettoyée et photographiée sur place avant remise au partenaire.' : 'Déballé au musée : nettoyage au pinceau et premier constat d\'état.');
        ME.Sim.checkObjectives(S);
        UI.commit(true);
      }
    };
    const brush = (ev) => {
      const r = cv.getBoundingClientRect();
      const x = (ev.clientX - r.left) * dpr * cv.width / (r.width * dpr), y = (ev.clientY - r.top) * dpr * cv.height / (r.height * dpr);
      ctx.globalCompositeOperation = 'destination-out';
      const rad = cv.width * 0.085;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      if (++moves % 10 === 0) {
        const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let clear = 0, n = 0;
        for (let i = 3; i < data.length; i += 4 * 37) { n++; if (data[i] < 60) clear++; }
        if (clear / n > 0.58) finish();
      }
    };
    cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); brush(e); });
    cv.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse' && e.buttons) brush(e); });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointercancel', () => { down = false; });
    view.revealFinish = finish;
  }

  /* ---------- Accueil ---------- */
  UI.welcome = function () {
    openModal(() => '<img class="welcome-logo" src="icons/logotype.svg" alt="Musée & Expéditions — JLG Creative"><h2>Une lettre pour vous, conservateur</h2>' +
      '<div class="carnet"><p>« Cher ami,</p><p>Le docteur Aubertin nous a légué sa maison, quelques vitrines et une poignée d\'objets. Le reste dépend de vous : partez sur le terrain, rapportez des découvertes, étudiez-les, restaurez-les et faites-les aimer du public.</p><p>L\'atelier est petit, les finances sont modestes, mais les falaises de la Vézère n\'attendent que vous. »</p><p style="text-align:right">— La Fondation du musée</p></div>' +
      '<h3 style="margin-top:12px">La boucle de jeu</h3><ol style="padding-left:20px"><li><b>Carte</b> : demandez une autorisation, puis préparez une mission (équipe, matériel, budget).</li><li><b>Expéditions</b> : suivez le chantier semaine après semaine ; chaque découverte reçoit un numéro d\'inventaire.</li><li><b>Déballage</b> : dégagez vos trouvailles au pinceau à leur arrivée.</li><li><b>Atelier</b> : restaurez et étudiez (postes et personnel limités).</li><li><b>Musée</b> : exposez, choisissez thèmes, éclairage et parcours.</li><li><b>Visiteurs & finances</b> : billetterie, boutique, dons et subventions financent la mission suivante.</li></ol>' +
      '<p class="hint">✎ Le bouton « Semaine suivante ▶ » fait avancer le temps. La partie est sauvegardée automatiquement.</p>' +
      (installInfo().standalone ? '' : '<div class="install-box" style="margin:10px 0"><img src="icons/icon-192.png" alt=""><div><b>Astuce :</b> installez le jeu sur votre écran d\'accueil.<br><button class="btn gold small" data-action="install" style="margin-top:6px">📲 Installer le jeu</button></div></div>') +
      '<div class="btn-row"><button class="btn primary" data-action="closeModal">Ouvrir le musée</button><button class="btn" data-action="tab" data-tab="carte" data-close="1">Aller directement à la carte</button></div>', 'narrow');
  };

  /* ---------- Rapport hebdomadaire ---------- */
  function reportHTML(rep) {
    const v = rep.visit, f = rep.finance;
    const events = S.journal.filter((j) => j.week === rep.week);
    let html = '<h2>Rapport — ' + ME.weekLabel(rep.week) + '</h2><div class="forecast">' +
      '<div><small>Visiteurs</small><b>' + int(v.total) + '</b></div><div><small>Satisfaction</small><b>' + v.satisfaction + ' %</b></div>' +
      '<div><small>Recettes</small><b class="plus">' + money(f.income) + '</b></div><div><small>Dépenses</small><b class="minus">' + money(f.spend) + '</b></div><div><small>Résultat</small><b class="' + (f.net >= 0 ? 'plus' : 'minus') + '">' + money(f.net) + '</b></div></div>';
    if (v.reasons.length) html += '<h3 style="margin-top:12px">Le livre d\'or</h3><ul class="reasons">' + v.reasons.slice(0, 5).map((r) => '<li><span class="' + (r.sign > 0 ? 'plus">＋' : 'minus">－') + '</span> ' + esc(r.text) + ' <small>(' + r.pct + ' %)</small></li>').join('') + '</ul>';
    if (events.length) html += '<h3 style="margin-top:12px">Cette semaine</h3><ul class="journal">' + events.map((j) => '<li class="' + j.kind + '">' + esc(j.text) + '</li>').join('') + '</ul>';
    html += '<div class="btn-row" style="margin-top:12px">' + (S.pendingReveals.length ? '<button class="btn gold" data-action="openReveal">📦 Déballer ' + S.pendingReveals.length + ' découverte(s)</button>' : '') + '<button class="btn primary" data-action="closeModal">Continuer</button><label style="display:flex;align-items:center;gap:6px;margin-left:auto"><input type="checkbox" data-action="toggleReport"' + (S.settings.weeklyReport ? ' checked' : '') + '> <small>Afficher chaque semaine</small></label></div>';
    return html;
  }

  /* ---------- Réglages / sauvegarde ---------- */
  function settingsHTML() {
    let ls = true; try { G.localStorage.setItem('__t', '1'); G.localStorage.removeItem('__t'); } catch (e) { ls = false; }
    return '<h2>Sauvegarde & options</h2>' +
      '<p>' + (ls ? '✔ Sauvegarde automatique activée dans ce navigateur.' : '⚠ Ce navigateur bloque le stockage local : utilisez l\'export pour garder votre partie.') + '</p>' +
      '<h3>Exporter</h3><div class="btn-row"><button class="btn" data-action="exportFile">Télécharger le fichier (.json)</button><button class="btn" data-action="exportCode">Afficher le code de sauvegarde</button><button class="btn" data-action="copyCode">Copier le code</button></div>' +
      '<textarea id="saveCode" readonly placeholder="Le code de sauvegarde apparaîtra ici." aria-label="Code de sauvegarde">' + esc(view.saveCode || '') + '</textarea>' +
      '<h3 style="margin-top:12px">Importer</h3><div class="btn-row"><label class="btn">Charger un fichier…<input type="file" accept=".json,application/json,text/plain" id="importFile" class="sr"></label></div>' +
      '<textarea id="importCode" placeholder="…ou collez ici un code de sauvegarde (MEX1:…) ou le contenu JSON" aria-label="Code à importer"></textarea><div class="btn-row"><button class="btn teal" data-action="importCode">Importer le code</button></div>' +
      (view.importMsg ? '<p class="' + (view.importMsg.ok ? 'ok-msg' : 'errors') + '">' + esc(view.importMsg.text) + '</p>' : '') +
      '<h3 style="margin-top:12px">Options</h3><label><input type="checkbox" data-action="toggleReport"' + (S.settings.weeklyReport ? ' checked' : '') + '> Afficher le rapport chaque semaine</label>' +
      '<div class="btn-row"><span>Affichage :</span><button class="btn small' + (use3d() ? ' gold' : '') + '" data-action="viewMode" data-v="3d"' + (ME.GL3D.supported() ? '' : ' disabled') + '>3D</button><button class="btn small' + (!use3d() ? ' gold' : '') + '" data-action="viewMode" data-v="2d">BD 2D</button></div>' +
      installHTML() +
      '<h3 style="margin-top:12px">Nouvelle partie</h3><button class="btn ' + (view.confirmReset ? 'primary' : '') + '" data-action="reset">' + (view.confirmReset ? 'Confirmer : effacer la partie en cours' : 'Recommencer depuis le début') + '</button>' +
      '<p style="margin-top:14px"><small>Musée & Expéditions · version ' + ME.VERSION + ' · JLG Creative. Les institutions, sites et musées cités sont fictifs.</small></p>';
  }

  /* ---------- Installation comme application ---------- */
  const PUBLIC_URL = 'https://jumerca.github.io/Jlg-project-builder-/musee-expeditions/';
  function installInfo() {
    const ins = ME.install || {};
    const ua = G.navigator.userAgent || '';
    const platform = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in doc) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
    const publicHost = /github\.io$/.test(G.location.hostname) || /^localhost$|^127\./.test(G.location.hostname);
    return { standalone: !!ins.standalone, prompt: ins.prompt || null, platform, embedded: !publicHost };
  }
  UI.installInfo = installInfo;
  UI.refreshInstall = function () {
    const b = $('#installBtn');
    if (b) b.hidden = installInfo().standalone;
    if (S && view.tab === 'musee' && $('#installCard')) $('#installCard').outerHTML = installCard();
    if (modal && modal.isInstall) renderModal();
  };
  function installCard() {
    const i = installInfo();
    if (i.standalone || (S.settings && S.settings.hideInstall)) return '<div id="installCard" hidden></div>';
    return '<div class="panel install-card" id="installCard"><div class="install-box"><img src="icons/icon-192.png" alt=""><div><b>Jouez comme une vraie application</b><br><small>Icône sur l\'écran d\'accueil, plein écran, fonctionne hors ligne.</small></div></div>' +
      '<div class="btn-row"><button class="btn gold" data-action="install">📲 Installer le jeu</button><button class="btn small" data-action="hideInstall">Plus tard</button></div></div>';
  }
  function installHTML() {
    const i = installInfo();
    return '<h3 style="margin-top:12px">Installer le jeu</h3><div class="install-box"><img src="icons/icon-192.png" alt="Logo Musée & Expéditions"><div>' +
      (i.standalone ? '<p>✔ Le jeu est déjà installé et s\'ouvre comme une application.</p>' : '<button class="btn gold" data-action="install">📲 Installer sur cet appareil</button>') + '</div></div>';
  }
  function installHelpHTML() {
    const i = installInfo();
    const url = i.embedded ? PUBLIC_URL : G.location.href.split('#')[0];
    let h = '<div class="install-box" style="margin-bottom:8px"><img src="icons/icon-192.png" alt=""><div><h2 style="margin:0">Installer Musée & Expéditions</h2><small>Le jeu s\'ouvrira depuis une icône, en plein écran, même sans connexion.</small></div></div>';
    if (i.standalone) return h + '<p class="ok-msg">✔ Le jeu est déjà installé sur cet appareil.</p>';
    if (i.prompt) return h + '<button class="btn gold" data-action="install">📲 Installer maintenant</button>';
    if (i.embedded) h += '<p class="minus">Cette page (aperçu claude.ai ou fichier local) ne permet pas l\'installation : ouvrez l\'adresse publique du jeu ci-dessous, puis suivez ces étapes.</p>';
    if (i.platform === 'android') {
      const intent = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
      h += '<ol class="steps"><li><b>Ouvrez le jeu dans Chrome.</b> Si vous êtes dans l\'appli Claude, Gmail, Facebook… (onglet avec une croix ✕ en haut), l\'installation y est impossible.<div class="btn-row"><a class="btn primary" href="' + intent + '">Ouvrir dans Chrome</a></div></li>' +
        '<li>Dans Chrome, touchez <b>⋮</b> en haut à droite.</li><li>Choisissez <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>, puis <b>Installer</b>.</li><li>L\'icône du musée apparaît sur votre écran d\'accueil. 🎉</li></ol>';
    } else if (i.platform === 'ios') {
      h += '<ol class="steps"><li><b>Ouvrez le jeu dans Safari</b> (depuis une autre appli : bouton <b>⋯</b> ou <b>Safari</b> → « Ouvrir dans Safari »).</li><li>Touchez <b>Partager</b> (carré avec une flèche ↑) en bas de l\'écran.</li><li>Choisissez <b>« Sur l\'écran d\'accueil »</b>, puis <b>Ajouter</b>.</li><li>L\'icône du musée apparaît sur votre écran d\'accueil. 🎉</li></ol>';
    } else {
      h += '<ol class="steps"><li>Ouvrez le jeu dans <b>Chrome</b> ou <b>Edge</b>.</li><li>Cliquez sur l\'icône <b>⊕ Installer</b> à droite de la barre d\'adresse, ou menu <b>⋮</b> → <b>« Installer Musée & Expéditions… »</b>.</li><li>Le jeu s\'ouvre dans sa propre fenêtre et apparaît parmi vos applications.</li></ol>';
    }
    h += '<p><small>Adresse du jeu :</small><br><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a></p><div class="btn-row"><button class="btn" data-action="copyLink">📋 Copier le lien</button></div>';
    return h;
  }

  /* ================= ACTIONS ================= */
  function toast(text, kind) {
    const box = $('#toasts');
    if (!box) return;
    const el = doc.createElement('div');
    el.className = 'toast ' + (kind || 'info');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 4200);
  }
  UI.toast = toast;
  UI.mute = false;
  ME._toast = (text, kind) => { if (!UI.mute && kind !== 'info') toast(text, kind); };

  UI.commit = function (soft) {
    ME.State.save(S);
    if (soft) { renderStats(); renderTabs(); return; }
    UI.render();
  };

  function result(r) { if (r && r.ok === false && (r.error || r.errors)) toast(r.error || r.errors.join(' '), 'error'); return r; }

  const A = {
    tab: (d, el) => { if (el.dataset.close) closeModal(); view.tab = d.tab; UI.render(); $('#view').focus({ preventScroll: true }); G.scrollTo(0, 0); },
    closeModal: () => { closeModal(); UI.render(); },
    backdrop: (d, el, ev) => { if (ev.target === el) { closeModal(); UI.render(); } },
    nextWeek: () => {
      if (modal) closeModal();
      UI.mute = true;
      const rep = ME.Sim.advanceWeek(S);
      UI.mute = false;
      UI.commit();
      if (S.settings.weeklyReport) openModal(() => reportHTML(rep), 'narrow');
      else toast('Semaine ' + rep.week + ' : ' + int(rep.visit.total) + ' visiteurs, résultat ' + money(rep.finance.net) + '.', rep.finance.net >= 0 ? 'success' : 'warning');
    },
    viewMode: (d) => { closeModal(); setView(d.v); },
    roomPreset: (d) => { E.applyPreset(S, d.room, d.k); UI.commit(); },
    ficheView: () => { view.fiche2d = !view.fiche2d; renderModal(); },
    install: () => {
      const ins = ME.install || {};
      if (ins.prompt) {
        const p = ins.prompt;
        p.prompt();
        p.userChoice.then((c) => { ins.prompt = null; if (c && c.outcome === 'accepted') { ins.standalone = true; toast('Installation en cours : l\'icône arrive sur votre écran d\'accueil.', 'success'); } UI.refreshInstall(); }).catch(() => {});
        return;
      }
      openModal(installHelpHTML, 'narrow'); modal.isInstall = true;
    },
    hideInstall: () => { S.settings.hideInstall = true; ME.State.save(S); UI.render(); },
    copyLink: () => {
      const url = installInfo().embedded ? PUBLIC_URL : G.location.href.split('#')[0];
      const ok = () => toast('Lien copié.', 'success');
      try { navigator.clipboard.writeText(url).then(ok, () => toast(url, 'info')); } catch (e) { toast(url, 'info'); }
    },
    openSettings: () => { view.confirmReset = false; view.importMsg = null; openModal(settingsHTML, 'narrow'); },
    openRoom: (d) => UI.openRoom(d.room),
    openObj: (d) => UI.openObj(d.id),
    openReveal: (d) => UI.openReveal(d.id),
    revealAll: () => { const dig = $('#dig'); if (view.revealFinish) view.revealFinish(); if (dig) dig.classList.add('done'); },
    revealNext: () => {
      S.pendingReveals.shift();
      UI.commit(true);
      if (S.pendingReveals.length) showReveal(); else { closeModal(); UI.render(); }
    },
    permit: (d) => { result(X.requestPermit(S, d.inst)); UI.commit(); },
    openPlanner: (d) => UI.openPlanner(d.dest),
    planMission: (d) => { const m = D.MISSIONS[d.m]; view.plan.mission = d.m; view.plan.weeks = ME.clamp(view.plan.weeks, m.minWeeks, m.maxWeeks); renderModal(); },
    planTeam: (d) => { const t = view.plan.team; const i = t.indexOf(d.id); if (i >= 0) t.splice(i, 1); else if (t.length < 5) t.push(d.id); renderModal(); },
    launch: () => { const r = result(X.launch(S, view.plan)); if (r.ok) { closeModal(); view.tab = 'expeditions'; UI.commit(); } },
    colFilter: (d) => { view.colFilter = d.f; UI.render(); },
    ficheSub: (d) => { view.ficheAction = view.ficheAction === d.k ? null : d.k; renderModal(); },
    place: (d) => { if (result(E.place(S, d.id, d.room)).ok) { view.ficheAction = null; ME.Sim.checkObjectives(S); UI.commit(); } },
    unplace: (d) => { E.remove(S, d.id); UI.commit(); },
    startJob: (d) => { if (result(C.start(S, d.id, d.k, d.staff)).ok) { view.ficheAction = null; UI.commit(); } },
    cancelJob: (d) => { C.cancel(S, d.id); UI.commit(); },
    deposit: (d) => { result(E.requestDeposit(S, d.id)); UI.commit(); },
    pickSlot: (d) => { view.pick = { room: d.room, slot: +d.slot }; renderModal(); },
    placeSlot: (d) => { if (result(E.place(S, d.id, d.room, +d.slot)).ok) { view.pick = null; ME.Sim.checkObjectives(S); UI.commit(); } },
    route: (d) => { E.moveInRoute(S, d.room, +d.dir); UI.commit(); },
    upgrade: (d) => { if (result(F.buyUpgrade(S, d.k)).ok) { ME.Sim.checkObjectives(S); UI.commit(); } },
    atKind: (d) => { view.atelier.kind = d.k; view.atelier.obj = null; view.atelier.staff = null; UI.render(); },
    atObj: (d) => { view.atelier.obj = d.id; UI.render(); },
    atStaff: (d) => { view.atelier.staff = d.id; UI.render(); },
    atStart: () => { const a = view.atelier; if (result(C.start(S, a.obj, a.kind, a.staff)).ok) { a.obj = null; a.staff = null; UI.commit(); } },
    loanIn: (d) => { result(E.requestLoan(S, d.inst, d.type)); UI.commit(); },
    loanOut: (d) => { result(E.acceptLoanOut(S, d.offer, d.id)); UI.commit(); },
    startTemp: () => { const t = $('#tempTitle'); view.tempTitle = t ? t.value : ''; if (result(E.startTemp(S, view.tempTitle)).ok) { view.tempTitle = ''; ME.Sim.checkObjectives(S); UI.commit(); } },
    accueil: (d) => { result(F.toggleAccueil(S, d.id)); UI.commit(); },
    fire: (d) => { result(F.fire(S, d.id)); UI.commit(); },
    hire: (d) => { result(F.hire(S, +d.i)); UI.commit(); },
    grant: (d) => { result(F.applyGrant(S, d.k)); UI.commit(); },
    buyLot: (d) => { result(E.buyLot(S, d.id)); UI.commit(); },
    verifyLot: (d) => { result(E.verifyLot(S, d.id)); UI.commit(); },
    reportLot: (d) => { result(E.reportLot(S, d.id)); UI.commit(); },
    exportFile: () => {
      const blob = new Blob([ME.State.serialize(S)], { type: 'application/json' });
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'musee-expeditions-S' + S.week + '.json';
      doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Fichier préparé. S\'il ne se télécharge pas (aperçu intégré), utilisez « Copier le code ».', 'info');
    },
    exportCode: () => { view.saveCode = ME.State.exportCode(S); renderModal(); },
    copyCode: () => {
      view.saveCode = ME.State.exportCode(S); renderModal();
      const ta = $('#saveCode');
      const done = () => toast('Code de sauvegarde copié.', 'success');
      try { navigator.clipboard.writeText(view.saveCode).then(done, () => { ta.select(); doc.execCommand && doc.execCommand('copy'); done(); }); }
      catch (e) { ta.select(); toast('Sélectionnez le code et copiez-le manuellement.', 'warning'); }
    },
    importCode: () => importText($('#importCode').value),
    toggleReport: (d, el) => { S.settings.weeklyReport = el.checked; ME.State.save(S); },
    reset: () => {
      if (!view.confirmReset) { view.confirmReset = true; renderModal(); return; }
      view.confirmReset = false;
      S = ME.State.newGame();
      ME.State.save(S);
      closeModal(); view.tab = 'musee'; stopScenes(); UI.render();
      toast('Nouvelle partie commencée.', 'success');
    },
  };

  function importText(text) {
    try {
      const s = ME.State.importText(text);
      S = s; ME.State.save(S);
      view.importMsg = { ok: true, text: 'Partie importée : ' + ME.weekLabel(S.week) + ', ' + Object.keys(S.objects).length + ' objets.' };
      stopScenes(); UI.render();
    } catch (e) {
      view.importMsg = { ok: false, text: 'Import impossible : ' + e.message };
      renderModal();
    }
  }

  UI.bind = function () {
    doc.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const name = el.dataset.action;
      if (['planEquip', 'planWeeks', 'price', 'roomTheme', 'roomLight', 'colSort'].includes(name)) return;
      if (name === 'toggleReport') { A.toggleReport(el.dataset, el); return; }
      if (!A[name]) return;
      if (name !== 'backdrop') ev.preventDefault();
      A[name](el.dataset, el, ev);
    });
    doc.addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.id === 'importFile' && el.files && el.files[0]) {
        const r = new FileReader();
        r.onload = () => importText(String(r.result));
        r.readAsText(el.files[0]);
        return;
      }
      const name = el.dataset && el.dataset.action;
      if (!name) return;
      if (name === 'planEquip') { const k = el.dataset.k; const e = view.plan.equip; if (el.checked) { if (!e.includes(k)) e.push(k); } else e.splice(e.indexOf(k), 1); renderModal(); }
      if (name === 'planWeeks') { view.plan.weeks = +el.value; renderModal(); }
      if (name === 'price') { S.ticketPrice = +el.value; UI.commit(); }
      if (name === 'roomTheme') { E.setTheme(S, el.dataset.room, el.value); ME.Sim.checkObjectives(S); UI.commit(); }
      if (name === 'roomLight') { E.setLighting(S, el.dataset.room, el.value); UI.commit(); }
      if (name === 'colSort') { view.colSort = el.value; UI.render(); }
    });
    doc.addEventListener('input', (ev) => {
      const el = ev.target;
      if (el.dataset && el.dataset.action === 'planWeeks') { view.plan.weeks = +el.value; const h = $('#planWeeksLabel'); if (h) h.textContent = '2. Durée sur le terrain : ' + el.value + ' semaine(s)'; }
      if (el.id === 'tempTitle') view.tempTitle = el.value;
    });
    doc.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && modal) { closeModal(); UI.render(); }
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('pin')) { ev.preventDefault(); selectPin(ev.target); }
    });
    doc.addEventListener('click', (ev) => {
      const pin = ev.target.closest && ev.target.closest('.pin');
      if (pin) selectPin(pin);
    });
  };

  function selectPin(pin) {
    view.mapSel = pin.dataset.dest;
    UI.render();
    if (G.innerWidth < 860) { const p = $('#view .cols > div:last-child'); if (p) p.scrollIntoView({ behavior: 'smooth' }); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
