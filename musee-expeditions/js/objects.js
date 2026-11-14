/* Musée & Expéditions — objects.js
 * Objets individualisés : identifiant permanent, provenance, datation, état, rareté,
 * intérêt scientifique, documentation, étude, et historique complet de leur parcours.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = ME.DATA;
  const O = (ME.Objects = {});

  O.LOCATIONS = {
    terrain: 'Sur le terrain',
    transport: 'En transport',
    reserve: 'En réserve',
    atelier: 'À l\'atelier',
    vitrine: 'Exposé',
    'pret-sortant': 'Prêté à un autre musée',
    'en-route': 'En route (prêt entrant)',
    depot: 'Dépôt chez le partenaire',
    rendu: 'Rendu à son propriétaire',
    restitue: 'Restitué',
  };

  /* Transitions autorisées : garantit qu'un objet suit un parcours cohérent. */
  const ALLOWED = {
    terrain: ['transport', 'depot'],
    transport: ['reserve'],
    'en-route': ['reserve'],
    reserve: ['atelier', 'vitrine', 'pret-sortant', 'rendu', 'restitue', 'depot'],
    atelier: ['reserve'],
    vitrine: ['reserve'],
    'pret-sortant': ['reserve'],
    depot: ['en-route'],
    rendu: ['depot', 'en-route'],
    restitue: [],
  };

  function fmtYear(y) {
    if (y < -10000) return 'vers ' + ME.fmtInt(Math.round(-y / 500) * 500) + ' av. J.-C.';
    if (y < 0) return 'vers ' + Math.round(-y / 10) * 10 + ' av. J.-C.';
    if (y < 500) return 'vers ' + Math.max(1, Math.round(y / 10) * 10) + ' apr. J.-C.';
    const c = Math.floor((y - 1) / 100) + 1;
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][c] || c;
    const part = y % 100 < 34 ? 'début du ' : y % 100 < 67 ? 'milieu du ' : 'fin du ';
    return part + roman + 'e siècle';
  }
  O.fmtYear = fmtYear;

  const VARIANTS = {
    amphora: ['', ' à col tranché', ' timbrée', ' à anses coudées'],
    coin: ['', ' bien centré', ' à flan large', ' usé par la circulation'],
    default: [''],
  };
  const SQUARES = 'ABCDEFGH';

  /** Crée un objet et l'enregistre dans l'état. opts : {mode, dest, expId, location, condition, documentation, studied, provenance, owner, lender, prefix, layer} */
  O.create = function (state, typeKey, opts) {
    opts = opts || {};
    const t = D.TYPES[typeKey];
    if (!t) throw new Error('Type inconnu : ' + typeKey);
    const prefix = opts.prefix || 'MEX-';
    const id = ME.nextId(state, prefix === 'MEX-' ? 'obj' : 'loan', prefix, 4);
    const year = Math.round(t.dates[0] + ME.rand(state) * (t.dates[1] - t.dates[0]));
    const variants = VARIANTS[t.shape] || VARIANTS.default;
    const rar = D.RARITY[t.rarity];
    const dest = opts.dest ? D.DESTINATIONS[opts.dest] : null;
    let context = null;
    if (dest) {
      context = {
        site: dest.site,
        layer: opts.layer || ME.pick(state, dest.layers),
        square: SQUARES[ME.randInt(state, 0, 7)] + ME.randInt(state, 1, 9),
        depth: (ME.randInt(state, 15, 320) / 100).toFixed(2).replace('.', ',') + ' m',
      };
    }
    const obj = {
      id,
      type: typeKey,
      name: t.name + ME.pick(state, variants),
      period: t.period,
      mat: t.mat,
      rarity: t.rarity,
      year,
      dating: fmtYear(year),
      dest: opts.dest || null,
      context,
      provenance: opts.provenance || (dest ? dest.name + ', ' + dest.place : 'Origine inconnue'),
      provenanceDoc: opts.provenanceDoc || 'complete',
      owner: opts.owner || 'musee',
      lender: opts.lender || null,
      acquisition: { mode: opts.mode || 'fouille', week: state.week, expId: opts.expId || null, price: opts.price || 0 },
      condition: Math.round(ME.clamp(opts.condition != null ? opts.condition : 60, 5, 100)),
      documentation: Math.round(ME.clamp(opts.documentation != null ? opts.documentation : 50, 0, 100)),
      studied: Math.round(ME.clamp(opts.studied || 0, 0, 100)),
      sci: Math.round(ME.clamp(rar.score * 14 + ME.randInt(state, 0, 25) + (opts.documentation || 50) * 0.2, 5, 100)),
      location: opts.location || 'reserve',
      roomId: null,
      slot: null,
      revealed: opts.revealed != null ? opts.revealed : true,
      seed: ME.randInt(state, 1, 2147483646),
      returnWeek: null,
      loanOut: null,
      history: [],
    };
    state.objects[id] = obj;
    return obj;
  };

  O.addHistory = function (state, obj, text) {
    obj.history.push({ w: state.week, loc: obj.location, text });
  };

  /** Déplace un objet en respectant les transitions autorisées. Renvoie true si le déplacement est valide. */
  O.move = function (state, obj, to, text) {
    const allowed = ALLOWED[obj.location] || [];
    if (!allowed.includes(to)) {
      throw new Error('Déplacement impossible de « ' + obj.location + ' » vers « ' + to + ' » pour ' + obj.id);
    }
    obj.location = to;
    if (to !== 'vitrine') { obj.roomId = null; obj.slot = null; }
    O.addHistory(state, obj, text || O.LOCATIONS[to]);
    return true;
  };

  O.get = (state, id) => state.objects[id];

  O.all = (state, filterFn) => Object.values(state.objects).filter(filterFn || (() => true));

  /** Objets présents physiquement au musée (réserve, atelier, vitrines). */
  O.inMuseum = (state) => O.all(state, (o) => ['reserve', 'atelier', 'vitrine'].includes(o.location));

  O.reserveCount = (state) => O.all(state, (o) => o.location === 'reserve' || o.location === 'atelier').length;

  O.type = (obj) => D.TYPES[obj.type];
  O.material = (obj) => D.MATERIALS[obj.mat];

  /** Valeur d'assurance estimée. */
  O.value = function (obj) {
    const r = D.RARITY[obj.rarity].value;
    return Math.round(r * (0.4 + 0.6 * obj.condition / 100) * (1 + obj.studied / 200));
  };

  O.conditionLabel = function (c) {
    if (c >= 85) return 'Excellent';
    if (c >= 65) return 'Bon';
    if (c >= 45) return 'Moyen';
    if (c >= 25) return 'Fragile';
    return 'Très dégradé';
  };

  /** Seuil d'état minimum pour exposer (les objets fragiles exigent plus). */
  O.minDisplayCondition = function (obj) {
    return Math.round(35 + O.material(obj).fragility * 20);
  };

  /** Fiche historique visible selon le niveau d'étude. */
  O.ficheTiers = function (obj) {
    const t = O.type(obj);
    return [
      { unlocked: true, text: t.h[0], need: 0 },
      { unlocked: obj.studied >= 40, text: t.h[1], need: 40 },
      { unlocked: obj.studied >= 80, text: t.h[2], need: 80 },
    ];
  };

  /** Attrait d'un objet exposé, avant préférences des visiteurs. */
  O.appeal = function (obj) {
    const r = D.RARITY[obj.rarity].score;
    return r * (0.35 + 0.65 * obj.condition / 100) * (0.75 + 0.25 * obj.studied / 100 + 0.1 * obj.documentation / 100);
  };

  O.isOnLoanIn = (obj) => obj.owner === 'preteur' || obj.owner === 'partenaire';

  O.ownerLabel = function (obj) {
    if (obj.owner === 'musee') return 'Collection du musée';
    const inst = obj.lender && D.INSTITUTIONS[obj.lender];
    if (obj.owner === 'partenaire') return 'Propriété de : ' + (inst ? inst.name : 'partenaire');
    return 'Prêt de : ' + (inst ? inst.name : obj.lender);
  };
})(typeof window !== 'undefined' ? window : globalThis);
