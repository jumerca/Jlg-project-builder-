/* Musée & Expéditions — conservation.js
 * Atelier de restauration et d'étude (postes et personnel limités), réserves,
 * vieillissement des objets exposés selon l'éclairage.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const Obj = ME.Objects;
  const C = (ME.Conservation = {});

  C.JOBS = {
    restauration: { label: 'Restauration', skill: 'conservation', verb: 'restaurer' },
    etude: { label: 'Étude scientifique', skill: 'recherche', verb: 'étudier' },
  };

  C.benchesUsed = (state) => state.jobs.length;
  C.benchesFree = (state) => state.benches - state.jobs.length;

  /** Plafond de restauration selon le talent du restaurateur. */
  C.restoreCap = (p) => Math.min(96, 68 + (p.skills.conservation || 0) * 7);

  C.canStart = function (state, objId, kind, staffId) {
    const o = state.objects[objId];
    const p = state.staff.find((s) => s.id === staffId);
    const job = C.JOBS[kind];
    if (!o || !job) return 'Objet ou travail inconnu.';
    if (o.location !== 'reserve') return 'L\'objet doit être en réserve (retirez-le d\'abord de sa vitrine).';
    if (C.benchesFree(state) <= 0) return 'Tous les postes de l\'atelier sont occupés (' + state.benches + ' postes).';
    if (!p) return 'Choisissez un membre de l\'équipe.';
    if (!ME.Expeditions.isAvailable(p)) return p.name + ' n\'est pas disponible.';
    if ((p.skills[job.skill] || 0) < 1) return p.name + ' n\'a pas la compétence ' + D.SKILLS[job.skill] + '.';
    if (kind === 'restauration' && o.condition >= C.restoreCap(p)) return 'L\'état de l\'objet dépasse déjà ce que ' + p.name + ' peut obtenir.';
    if (kind === 'etude' && o.studied >= 100) return 'Objet déjà entièrement étudié.';
    if (o.owner === 'preteur') return 'Un objet prêté ne peut pas être restauré ni étudié sans accord du prêteur.';
    return null;
  };

  C.start = function (state, objId, kind, staffId) {
    const err = C.canStart(state, objId, kind, staffId);
    if (err) return { ok: false, error: err };
    const o = state.objects[objId];
    const p = state.staff.find((s) => s.id === staffId);
    const id = ME.nextId(state, 'job', 'J', 3);
    const job = { id, objId, kind, staffId, startWeek: state.week, weeks: 0 };
    if (kind === 'restauration') { job.from = o.condition; job.target = C.restoreCap(p); }
    else { job.from = o.studied; job.target = 100; }
    state.jobs.push(job);
    p.assign = { kind: 'atelier', id };
    Obj.move(state, o, 'atelier', C.JOBS[kind].label + ' confiée à ' + p.name + '.');
    return { ok: true, job };
  };

  C.estimateWeeks = function (state, job) {
    const p = state.staff.find((s) => s.id === job.staffId);
    const o = state.objects[job.objId];
    const rate = C.rate(p, o, job.kind);
    const cur = job.kind === 'restauration' ? o.condition : o.studied;
    return Math.max(1, Math.ceil((job.target - cur) / rate));
  };

  C.rate = function (p, o, kind) {
    if (kind === 'restauration') {
      const frag = D.MATERIALS[o.mat].fragility;
      return (4 + (p.skills.conservation || 0) * 5) * (1.1 - frag * 0.5);
    }
    return 6 + (p.skills.recherche || 0) * 7 + o.documentation * 0.06;
  };

  C.cancel = function (state, jobId) {
    const i = state.jobs.findIndex((j) => j.id === jobId);
    if (i < 0) return;
    const job = state.jobs[i];
    const o = state.objects[job.objId];
    const p = state.staff.find((s) => s.id === job.staffId);
    if (p) p.assign = null;
    state.jobs.splice(i, 1);
    Obj.move(state, o, 'reserve', C.JOBS[job.kind].label + ' interrompue, retour en réserve.');
  };

  C.tick = function (state) {
    const done = [];
    state.jobs.slice().forEach((job) => {
      const o = state.objects[job.objId];
      const p = state.staff.find((s) => s.id === job.staffId);
      job.weeks++;
      const r = C.rate(p, o, job.kind);
      if (job.kind === 'restauration') {
        o.condition = Math.min(job.target, Math.round(o.condition + r));
        if (o.condition >= job.target) done.push(job);
      } else {
        const before = o.studied;
        o.studied = Math.min(100, Math.round(o.studied + r));
        state.science += Math.round((o.studied - before) * o.sci / 400);
        if (before < 40 && o.studied >= 40) Obj.addHistory(state, o, 'Étude : contexte historique établi.');
        if (before < 80 && o.studied >= 80) Obj.addHistory(state, o, 'Étude : analyse approfondie terminée.');
        if (o.studied >= 100) done.push(job);
      }
    });
    done.forEach((job) => {
      const o = state.objects[job.objId];
      const p = state.staff.find((s) => s.id === job.staffId);
      state.jobs.splice(state.jobs.indexOf(job), 1);
      if (p) { p.assign = null; p.xp += job.weeks; }
      let text;
      if (job.kind === 'restauration') {
        text = 'Restauration terminée par ' + (p ? p.name : '—') + ' : état ' + job.from + ' → ' + o.condition + '.';
      } else {
        text = 'Étude terminée : publication d\'une notice scientifique.';
        state.reputation += 1;
        if (o.dest) {
          const inst = D.DESTINATIONS[o.dest].inst;
          state.permits[inst].partnership = Math.min(100, state.permits[inst].partnership + 3);
        }
      }
      Obj.move(state, o, 'reserve', text);
      ME.log(state, o.name + ' (' + o.id + ') — ' + text, 'success', { obj: o.id });
    });
    return done;
  };

  /** Usure des objets exposés selon l'éclairage et la sensibilité du matériau. */
  C.wear = function (state) {
    Object.values(state.objects).forEach((o) => {
      if (o.location !== 'vitrine') return;
      const room = state.rooms[o.roomId];
      const light = D.LIGHTING[room.lighting];
      const sens = D.MATERIALS[o.mat].light;
      const loss = light.wear * sens * 1.6;
      if (loss > 0) {
        o._wear = (o._wear || 0) + loss;
        if (o._wear >= 1) {
          const l = Math.floor(o._wear);
          o.condition = Math.max(5, o.condition - l);
          o._wear -= l;
          if (o.condition < Obj.minDisplayCondition(o) + 3 && !o._warned) {
            o._warned = true;
            ME.log(state, o.name + ' (' + o.id + ') se dégrade sous l\'éclairage « ' + light.label + ' ». Pensez à tamiser la salle ou à le restaurer.', 'warning', { obj: o.id });
          }
        }
      }
    });
  };

  C.reserveUsage = (state) => ({ used: Obj.reserveCount(state), cap: state.reserveCap });
})(typeof window !== 'undefined' ? window : globalThis);
