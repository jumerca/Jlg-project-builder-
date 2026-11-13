/* Camping Tycoon — sauvegardes (sérialisation, migration, stockage local, export/import) */
(function (root) {
  'use strict';
  const S = (root.CT && root.CT.sim) || require('./sim.js');
  const FORMAT = 1;
  const KEY = 'campingTycoon.save.auto';
  const KEY_PREV = 'campingTycoon.save.prev';

  const enc = (arr) => arr.map((v) => String.fromCharCode(48 + v)).join('');
  const dec = (str) => Array.from(str, (c) => c.charCodeAt(0) - 48);

  /** État persistant -> chaîne JSON (sans le runtime : agents, files, champs). */
  function serialize(s) {
    const out = {};
    for (const k of Object.keys(s)) {
      if (k === 'rt') continue;
      out[k] = s[k];
    }
    out.tiles = enc(s.tiles);
    out.deco = enc(s.deco);
    out.format = FORMAT;
    out.savedAt = new Date().toISOString();
    return JSON.stringify(out, (k, v) => (k.startsWith('_') && k !== '_occ85' && k !== '_profit' ? undefined : v));
  }

  function migrate(o) {
    if (!o || o.game !== 'camping-tycoon') throw new Error('Ce fichier n’est pas une sauvegarde Camping Tycoon.');
    if ((o.format || 0) > FORMAT) throw new Error('Sauvegarde créée par une version plus récente du jeu.');
    // format 0 -> 1 : champs ajoutés après coup (valeurs par défaut)
    o.settings = Object.assign({ nightFast: true }, o.settings || {});
    if (o.loan === undefined) o.loan = null;
    if (o.prices && o.prices.extra === undefined) o.prices.extra = 5;
    o.mods = o.mods || []; o.reviews = o.reviews || []; o.eventLog = o.eventLog || []; if (o.event === undefined) o.event = null;
    o.tuto = o.tuto || { step: 99, done: true }; if (o.nextEventDay === undefined) o.nextEventDay = o.day + 3;
    for (const b of o.buildings) { if (!b.level) b.level = 1; }
    o.totals = Object.assign({ groups: 0, nights: 0, seasons: 0, shows: 0 }, o.totals || {});
    if (o.settings.sound === undefined) o.settings.sound = true;
    o.lastTeam = o.lastTeam || [];
    o.reports = o.reports || [];
    o.objectives = o.objectives || {};
    o.shopMarkup = o.shopMarkup || 1;
    for (const b of o.buildings) { if (b.water === undefined) b.water = 100; if (b.uses === undefined) b.uses = 0; }
    o.format = FORMAT;
    return o;
  }

  function deserialize(json) {
    const o = migrate(typeof json === 'string' ? JSON.parse(json) : json);
    if (typeof o.tiles === 'string') o.tiles = dec(o.tiles);
    if (typeof o.deco === 'string') o.deco = dec(o.deco);
    if (o.tiles.length !== o.w * o.h) throw new Error('Carte corrompue.');
    S.initRuntime(o);
    S.mapChanged(o);
    return o;
  }

  function storage() { try { return root.localStorage || null; } catch (e) { return null; } }

  function autosave(s) {
    const ls = storage(); if (!ls) return false;
    try {
      const cur = ls.getItem(KEY);
      if (cur) ls.setItem(KEY_PREV, cur);
      ls.setItem(KEY, serialize(s));
      return true;
    } catch (e) { return false; }
  }
  function loadAuto(prev) {
    const ls = storage(); if (!ls) return null;
    try { const j = ls.getItem(prev ? KEY_PREV : KEY); return j ? deserialize(j) : null; } catch (e) { return null; }
  }
  function hasAuto() { const ls = storage(); try { return !!(ls && ls.getItem(KEY)); } catch (e) { return false; } }
  function clearAuto() { const ls = storage(); try { ls && ls.removeItem(KEY); } catch (e) { /* rien */ } }

  const api = { serialize, deserialize, migrate, autosave, loadAuto, hasAuto, clearAuto, FORMAT, KEY };
  root.CT = root.CT || {};
  root.CT.save = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
