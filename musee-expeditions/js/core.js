/* Musée & Expéditions — JLG Creative
 * core.js : espace de noms, hasard reproductible, utilitaires communs.
 * Tous les modules s'attachent à l'objet global ME (scripts classiques,
 * pour fonctionner aussi en ouvrant index.html directement depuis le disque).
 */
(function (G) {
  'use strict';
  const ME = (G.ME = G.ME || {});
  ME.VERSION = 1;
  ME.SAVE_KEY = 'musee-expeditions-save-v1';

  /* ---------- Hasard reproductible (mulberry32, graine stockée dans l'état) ---------- */
  ME.rand = function (state) {
    state.rngSeed = (state.rngSeed + 0x6d2b79f5) | 0;
    let t = state.rngSeed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ME.randInt = (state, min, max) => min + Math.floor(ME.rand(state) * (max - min + 1));
  ME.chance = (state, p) => ME.rand(state) < p;
  ME.pick = (state, arr) => arr[Math.floor(ME.rand(state) * arr.length)];
  ME.pickWeighted = function (state, items, weightFn) {
    const ws = items.map(weightFn);
    const total = ws.reduce((a, b) => a + b, 0);
    if (total <= 0) return items[0];
    let r = ME.rand(state) * total;
    for (let i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
  /* Générateur local, indépendant de l'état (pour le dessin : même graine → même image). */
  ME.seeded = function (seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  ME.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  ME.round = (v) => Math.round(v);
  ME.fmtMoney = function (v) {
    const n = Math.round(v);
    return n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';
  };
  ME.fmtInt = (v) => Math.round(v).toLocaleString('fr-FR');
  ME.deepClone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Identifiants ---------- */
  ME.nextId = function (state, counter, prefix, pad) {
    state.counters[counter] = (state.counters[counter] || 0) + 1;
    return prefix + String(state.counters[counter]).padStart(pad || 4, '0');
  };

  /* ---------- Journal & notifications ---------- */
  ME.log = function (state, text, kind, ref) {
    state.journal.unshift({ week: state.week, text, kind: kind || 'info', ref: ref || null });
    if (state.journal.length > 300) state.journal.length = 300;
    if (ME._toast) ME._toast(text, kind);
  };

  ME.weekLabel = function (week) {
    const year = Math.floor((week - 1) / 52) + 1;
    const w = ((week - 1) % 52) + 1;
    return 'Saison ' + year + ' · semaine ' + w;
  };

  ME.money = function (state, amount, label, cat) {
    state.money += amount;
    state.ledgerCurrent.push({ label, amount: Math.round(amount), cat: cat || (amount >= 0 ? 'divers' : 'charges') });
  };
})(typeof window !== 'undefined' ? window : globalThis);
