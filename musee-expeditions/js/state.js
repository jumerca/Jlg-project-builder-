/* Musée & Expéditions — state.js
 * Création d'une partie, sauvegarde automatique (localStorage), export / import,
 * migration des anciennes sauvegardes.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const S = (ME.State = {});

  S.newGame = function (seed) {
    const state = {
      version: ME.VERSION,
      createdAt: new Date().toISOString(),
      rngSeed: (seed != null ? seed : Math.floor(Math.random() * 2147483646)) | 0,
      week: 1,
      museumName: 'Musée & Expéditions',
      money: 16000,
      reputation: 8,
      science: 0,
      ticketPrice: 8,
      shopLevel: 1,
      benches: 2,
      reserveCap: 14,
      counters: {},
      staff: [],
      candidates: [],
      objects: {},
      expeditions: [],
      permits: {},
      knowledge: {},
      rooms: {},
      route: ['salle1', 'salle2'],
      jobs: [],
      tempExpo: null,
      tempHistory: [],
      loansIn: [],
      loanOffers: [],
      market: [],
      grants: {},
      ledgerCurrent: [],
      ledger: [],
      lastVisit: null,
      visitHistory: [],
      totalVisitors: 0,
      journal: [],
      pendingReveals: [],
      objectives: {},
      settings: { weeklyReport: true },
    };

    for (const k in D.INSTITUTIONS) state.permits[k] = { status: 'none', weeksLeft: 0, validUntil: 0, partnership: 10 };
    for (const k in D.DESTINATIONS) state.knowledge[k] = 0;
    for (const k in D.ROOMS) {
      const r = D.ROOMS[k];
      state.rooms[k] = { unlocked: r.unlocked, theme: null, lighting: 'standard', vitrines: new Array(r.slots).fill(null) };
    }

    D.STAFF_START.forEach((p) => state.staff.push(makeStaff(state, p)));
    state.candidates = D.CANDIDATES.slice(0, 3).map((c) => ME.deepClone(c));

    D.START_COLLECTION.forEach((c) => {
      const o = ME.Objects.create(state, c.type, {
        mode: 'legs', condition: c.condition, studied: c.studied, documentation: 55,
        provenance: c.prov, location: 'reserve',
      });
      o.acquisition.week = 0;
      ME.Objects.addHistory(state, o, 'Entrée dans la collection — ' + c.prov);
      if (c.room) {
        state.rooms[c.room].vitrines[c.slot] = o.id;
        o.location = 'vitrine'; o.roomId = c.room; o.slot = c.slot;
        ME.Objects.addHistory(state, o, 'Exposé : ' + D.ROOMS[c.room].name);
      }
    });

    state.permits.sap.partnership = 20;
    ME.log(state, 'Bienvenue ! Le musée ouvre ses portes avec le legs du Dr Aubertin. Préparez votre première expédition depuis la carte.', 'story');
    return state;
  };

  function makeStaff(state, p) {
    const id = ME.nextId(state, 'staff', 'P', 2);
    return { id, name: p.name, role: p.role, salary: p.salary, skills: Object.assign({}, p.skills), traits: (p.traits || []).slice(), look: Object.assign({}, p.look), assign: null, xp: 0 };
  }
  S.makeStaff = makeStaff;

  /* ---------------- Sauvegarde ---------------- */
  S.memorySave = null; // repli si localStorage indisponible

  S.serialize = (state) => JSON.stringify(state);

  S.validate = function (data) {
    if (!data || typeof data !== 'object') throw new Error('Fichier illisible.');
    if (typeof data.week !== 'number' || !data.objects || !data.rooms || !Array.isArray(data.staff)) {
      throw new Error('Ce fichier ne ressemble pas à une sauvegarde de Musée & Expéditions.');
    }
    return true;
  };

  /** Mise à niveau des sauvegardes plus anciennes : complète les champs manquants. */
  S.migrate = function (data) {
    const toast = ME._toast; ME._toast = null;
    const fresh = S.newGame(1);
    ME._toast = toast;
    for (const k in fresh) if (!(k in data)) data[k] = ME.deepClone(fresh[k]);
    for (const k in D.ROOMS) {
      if (!data.rooms[k]) data.rooms[k] = ME.deepClone(fresh.rooms[k]);
      const need = D.ROOMS[k].slots;
      while (data.rooms[k].vitrines.length < need) data.rooms[k].vitrines.push(null);
    }
    for (const k in D.INSTITUTIONS) if (!data.permits[k]) data.permits[k] = ME.deepClone(fresh.permits[k]);
    for (const k in D.DESTINATIONS) if (data.knowledge[k] == null) data.knowledge[k] = 0;
    Object.values(data.objects).forEach((o) => { if (!o.history) o.history = []; });
    data.version = ME.VERSION;
    return data;
  };

  S.deserialize = function (text) {
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    S.validate(data);
    return S.migrate(data);
  };

  S.save = function (state) {
    const txt = S.serialize(state);
    S.memorySave = txt;
    try { G.localStorage && G.localStorage.setItem(ME.SAVE_KEY, txt); return true; } catch (e) { return false; }
  };

  S.load = function () {
    let txt = null;
    try { txt = G.localStorage && G.localStorage.getItem(ME.SAVE_KEY); } catch (e) { txt = null; }
    if (!txt) txt = S.memorySave;
    if (!txt) return null;
    try { return S.deserialize(txt); } catch (e) { return null; }
  };

  S.clear = function () {
    S.memorySave = null;
    try { G.localStorage && G.localStorage.removeItem(ME.SAVE_KEY); } catch (e) { /* ignore */ }
  };

  /** Code de sauvegarde compact (texte copiable) : JSON encodé en base64 UTF-8. */
  S.exportCode = function (state) {
    const json = S.serialize(state);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'MEX1:' + btoa(bin);
  };

  S.importText = function (text) {
    text = (text || '').trim();
    if (text.startsWith('MEX1:')) {
      const bin = atob(text.slice(5));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      text = new TextDecoder().decode(bytes);
    }
    return S.deserialize(text);
  };
})(typeof window !== 'undefined' ? window : globalThis);
