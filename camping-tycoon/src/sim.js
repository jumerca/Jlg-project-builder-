/* Camping Tycoon — moteur de simulation (JLG Creative)
 * Aucune dépendance au DOM : testable sous Node.
 * État persistant = objet JSON `s` ; état transitoire (agents, files, champs de déplacement) = `s.rt`. */
(function (root) {
  'use strict';
  const D = (root.CT && root.CT.data) || require('./data.js');
  const { TERRAIN, DECO, BUILDINGS, PROFILES, STAFF } = D;

  const W = 48, H = 34;
  const DAY = 1440;
  const r2 = (x) => Math.round(x * 100) / 100;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Aléatoire déterministe (mulberry32, état sauvegardé) ---------- */
  function rand(s) {
    s.rng = (s.rng + 0x6D2B79F5) | 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rint = (s, a, b) => a + Math.floor(rand(s) * (b - a + 1));
  const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  function wpick(s, weights) {
    let tot = 0; for (const k in weights) tot += weights[k];
    let r = rand(s) * tot;
    for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
    return Object.keys(weights)[0];
  }
  function poisson(s, l) {
    if (l <= 0) return 0;
    if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * (rand(s) + rand(s) + rand(s) - 1.5) * 2));
    const L = Math.exp(-l); let k = 0, p = 1;
    do { k++; p *= rand(s); } while (p > L);
    return k - 1;
  }

  /* ---------- Calendrier ---------- */
  function dateParts(day) {
    let d = day;
    for (const [m, n] of D.MONTHS) { if (d < n) return { d: d + 1, m }; d -= n; }
    return { d: d + 1, m: 'octobre' };
  }
  const DOW = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const dow = (s, day) => (day + (s.year - 1) + 2) % 7; // 1er avril an 1 = mercredi
  function fmtDate(s, day = s.day) { const p = dateParts(day); return `${DOW[dow(s, day)]} ${p.d} ${p.m}`; }
  const fmtTime = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}h${String(Math.floor(m % 60)).padStart(2, '0')}`;

  const CURVE = [[0, 0.12], [30, 0.24], [61, 0.42], [91, 0.75], [104, 1.0], [137, 1.0], [146, 0.72], [153, 0.38], [182, 0.1]];
  function seasonCurve(d) {
    for (let i = 1; i < CURVE.length; i++) {
      if (d <= CURVE[i][0]) {
        const [a, va] = CURVE[i - 1], [b, vb] = CURVE[i];
        return va + (vb - va) * (d - a) / (b - a);
      }
    }
    return 0.1;
  }

  /* ---------- Nouvelle partie ---------- */
  function newGame(opts = {}) {
    const s = {
      version: 1, game: 'camping-tycoon', seed: opts.seed ?? 12345, rng: opts.seed ?? 12345,
      name: opts.name || 'Camping Les Flots Bleus', guestRng: ((opts.seed ?? 12345) ^ 0x9e3779b9) >>> 0, year: 1, day: 0, minute: 7 * 60, phase: 'season',
      w: W, h: H, tiles: new Array(W * H).fill(TERRAIN.GRASS), deco: new Array(W * H).fill(DECO.NONE),
      buildings: [], nextId: 1, bookings: [], staff: [],
      mode: opts.mode === 'discovery' ? 'discovery' : 'normal',
      prices: Object.assign({}, D.DEFAULT_PRICES), seasonRates: { low: 1, mid: 1, high: 1 }, shopMarkup: 1.0, staffPolicy: { cleaning: 'arrivals', maintenance: 'urgent' },
      program: 'family', campaign: null, commercialHistory: [],
      reputation: 42, stars: 1,
      fin: { cash: 30000, start: 30000, season: {}, all: {}, history: [] },
      stats: newSeasonStats(), totals: { groups: 0, nights: 0, seasons: 0, shows: 0 },
      weather: null, forecast: [], log: [], objectives: {}, reports: [], lastTeam: [],
      settings: { nightFast: true, sound: true }, loan: null, mods: [], event: null, eventLog: [], reviews: [], tuto: { step: 0, done: false }, nextEventDay: 4
    };
    rand(s);
    genMap(s);
    s.weather = genWeather(s, 0); s.forecast = [genWeather(s, 1), genWeather(s, 2), genWeather(s, 3)];
    initRuntime(s);
    pregenerateBookings(s);
    log(s, `Bienvenue au ${s.name} ! Le domaine ouvre ses portes pour la saison.`, 'good');
    return s;
  }

  function newSeasonStats() {
    return { groups: 0, nights: 0, persons: 0, shows: 0, ratings: [], occ: [], peakOcc: 0, lostFull: 0, lostPrice: 0, requests: 0, waits: 0, breakdowns: 0, serviceInterventions: 0, serviceExpenses: 0, guestTrips: 0, escortedTrips: 0, guestActivities: {}, guestMood: [], leisureVisits: {}, leisureRevenue: 0, programEvents: 0, programCost: 0, marketingSpent: 0, marketingCampaigns: 0, repStart: null };
  }

  const idx = (x, y) => y * W + x;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  function genMap(s) {
    const T = s.tiles, Dc = s.deco;
    for (let y = 0; y < H; y++) {
      T[idx(0, y)] = TERRAIN.ROAD; T[idx(1, y)] = TERRAIN.ROAD;
      const lake = Math.round(39 + 2.5 * Math.sin(y / 5) + 1.5 * Math.sin(y / 2.3 + 1));
      for (let x = lake - 2; x < W; x++) T[idx(x, y)] = x >= lake ? TERRAIN.WATER : TERRAIN.SAND;
    }
    for (let y = 0; y < H; y++) for (let x = 2; x < W; x++) {
      const t = T[idx(x, y)];
      if (t === TERRAIN.WATER) continue;
      const n = Math.sin(x * 0.45 + y * 0.2) + Math.sin(y * 0.5 - x * 0.13) * 0.8 + rand(s) * 0.9;
      if (t === TERRAIN.SAND) { if (rand(s) < 0.12) Dc[idx(x, y)] = DECO.PINE; continue; }
      if (n > 1.15) Dc[idx(x, y)] = rand(s) < 0.65 ? DECO.TREE : DECO.PINE;
      else if (n > 0.95 && rand(s) < 0.3) Dc[idx(x, y)] = DECO.TREE;
    }
    // Chemins initiaux
    for (let x = 2; x <= 23; x++) setPath(s, x, 16);
    for (let y = 8; y <= 24; y++) setPath(s, 12, y);
    s.entrance = { x: 2, y: 16 };
    // Dégager l'entrée
    for (let y = 12; y <= 21; y++) for (let x = 2; x <= 8; x++) Dc[idx(x, y)] = DECO.NONE;
    const place = (type, x, y) => { const b = addBuilding(s, type, x, y); b.progress = 0; b.openDay = 0; return b; };
    place('reception', 4, 14);
    place('sanitary', 13, 14);
    for (const x of [16, 18, 20]) place('tent', x, 14);
    for (const x of [13, 15, 17, 19]) place('tent', x, 17);
    place('caravan', 9, 18); place('caravan', 9, 20);
    for (const [x, y] of [[3, 18], [4, 18], [7, 17], [3, 12], [8, 12], [22, 15], [22, 17]]) Dc[idx(x, y)] = DECO.FLOWERS;
    Dc[idx(8, 15)] = DECO.BENCH;
    // Terrain d'essai optionnel : les quatre nouveautés sont visibles dès le départ.
    // Le mode classique conserve exactement son agencement et ses finances.
    if (s.mode === 'discovery') {
      const link = (a, b, axis, value) => {
        for(let n=a;n<=b;n++) axis==='x' ? setPath(s,n,value) : setPath(s,value,n);
      };
      link(13,19,'x',11); // vers mini-golf
      link(10,11,'x',9);  // laverie, connectée à la colonne de chemin x=12
      link(24,24,'x',16);link(15,16,'y',24); // multisports côté est
      link(17,20,'y',24); // liaison au loueur de vélos
      place('minigolf',16,8);
      place('multisport',25,13);
      place('bikes',25,19);
      place('laundry',8,8);
      // V1.8 : quatre nouvelles installations dans le parc découverte, sans
      // retirer ni modifier les neuf hébergements historiques.
      for(let x=20;x<=21;x++)setPath(s,x,11);
      setPath(s,21,10);
      place('petanque',21,8);
      for(let y=5;y<=7;y++)setPath(s,12,y);
      for(let x=8;x<=11;x++)setPath(s,x,5);
      place('bakery',5,4);
      place('spa',13,3);
      for(let y=21;y<=25;y++)setPath(s,24,y);
      setPath(s,25,25);
      place('cinema',26,24);
      log(s, 'Mode découverte : huit équipements supplémentaires déjà aménagés.', 'good');
    }
    refreshAccess(s);
  }

  function setPath(s, x, y) { s.tiles[idx(x, y)] = TERRAIN.PATH; s.deco[idx(x, y)] = DECO.NONE; }

  function addBuilding(s, type, x, y) {
    const def = BUILDINGS[type];
    const b = { id: s.nextId++, type, x, y, w: def.w, h: def.h, cond: 100, broken: false, brokenDay: -1, dirt: 0, water: 100, progress: def.build, clean: false, uses: 0, ax: -1, ay: -1,
      openYear: s.phase === 'winter' ? s.year + 1 : s.year, openDay: s.phase === 'winter' ? 0 : s.day + def.build };
    b.level = 1; b.buildTotal = def.build;
    if (def.unit) b.num = 1 + s.buildings.filter((o) => BUILDINGS[o.type].unit).reduce((m, o) => Math.max(m, o.num || 0), 0);
    for (let j = y; j < y + def.h; j++) for (let i = x; i < x + def.w; i++) s.deco[idx(i, j)] = DECO.NONE;
    s.buildings.push(b);
    return b;
  }

  /* ---------- Runtime ---------- */
  function initRuntime(s) {
    if (!Number.isFinite(s.guestRng)) s.guestRng = ((s.seed || 12345) ^ 0x9e3779b9) >>> 0;
    s.rt = { agents: [], agentMap: new Map(), nextAgent: 1, fields: new Map(), ver: 0, bstate: new Map(), groups: new Map(), staffAgents: new Map(), events: [], pathTiles: null, grid: null };
    refreshAccess(s);
    for (const bk of s.bookings) if (bk.status === 'onsite') makeGroupHome(s, bk);
    // Personnel en service si la partie reprend pendant les heures de travail
    for (const st of s.staff) {
      const [a, b] = STAFF[st.role].hours;
      if (s.phase === 'season' && s.minute >= a && s.minute < b - 30) spawnStaff(s, st, true);
    }
  }
  function bs(s, b) {
    let st = s.rt.bstate.get(b.id);
    if (!st) { st = { users: [], queue: [], claim: 0 }; s.rt.bstate.set(b.id, st); }
    return st;
  }

  function mapChanged(s) { s.rt.ver++; s.rt.fields.clear(); s.rt.pathTiles = null; s.rt.grid = null; refreshAccess(s); }

  function occupancyGrid(s) {
    if (s.rt && s.rt.grid) return s.rt.grid;
    const g = new Int32Array(W * H);
    for (const b of s.buildings) for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) g[idx(i, j)] = b.id;
    if (s.rt) s.rt.grid = g;
    return g;
  }

  function refreshAccess(s) {
    for (const b of s.buildings) {
      let best = null, bd = 1e9;
      const cx = b.x + b.w / 2 - 0.5, cy = b.y + b.h;
      for (let j = b.y - 1; j <= b.y + b.h; j++) for (let i = b.x - 1; i <= b.x + b.w; i++) {
        const inside = i >= b.x && i < b.x + b.w && j >= b.y && j < b.y + b.h;
        const corner = (i === b.x - 1 || i === b.x + b.w) && (j === b.y - 1 || j === b.y + b.h);
        if (inside || corner || !inMap(i, j) || s.tiles[idx(i, j)] !== TERRAIN.PATH) continue;
        const d = (i - cx) ** 2 + (j - cy) ** 2;
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) { b.ax = best[0]; b.ay = best[1]; } else { b.ax = -1; b.ay = -1; }
    }
  }

  function field(s, tx, ty) {
    const key = tx * 100 + ty;
    let f = s.rt.fields.get(key);
    if (f) return f;
    f = new Int16Array(W * H).fill(-1);
    if (inMap(tx, ty) && s.tiles[idx(tx, ty)] === TERRAIN.PATH) {
      const q = new Int32Array(W * H); let h = 0, t = 0;
      f[idx(tx, ty)] = 0; q[t++] = idx(tx, ty);
      while (h < t) {
        const c = q[h++], x = c % W, y = (c / W) | 0, d = f[c];
        const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (const [nx, ny] of nb) {
          if (!inMap(nx, ny)) continue;
          const n = idx(nx, ny);
          if (f[n] >= 0 || s.tiles[n] !== TERRAIN.PATH) continue;
          f[n] = d + 1; q[t++] = n;
        }
      }
    }
    s.rt.fields.set(key, f);
    return f;
  }
  const reachable = (s, fromX, fromY, toX, toY) => toX >= 0 && fromX >= 0 && field(s, toX, toY)[idx(fromX, fromY)] >= 0;
  const accessible = (s, b) => b.ax >= 0 && reachable(s, s.entrance.x, s.entrance.y, b.ax, b.ay);

  function pathTiles(s) {
    if (s.rt.pathTiles) return s.rt.pathTiles;
    const f = field(s, s.entrance.x, s.entrance.y), out = [];
    for (let i = 0; i < W * H; i++) if (f[i] >= 0) out.push(i);
    return (s.rt.pathTiles = out);
  }

  /* ---------- Requêtes d'état ---------- */
  const built = (s) => s.buildings.filter((b) => b.progress <= 0);
  const units = (s) => built(s).filter((b) => BUILDINGS[b.type].unit);
  const ofType = (s, t) => built(s).filter((b) => b.type === t);
  const services = (s, t) => ofType(s, t).filter((b) => accessible(s, b));

  function beautyAt(s, b) {
    let n = 0; const r = 3;
    for (let j = b.y - r; j < b.y + b.h + r; j++) for (let i = b.x - r; i < b.x + b.w + r; i++) {
      if (!inMap(i, j)) continue;
      const d = s.deco[idx(i, j)], t = s.tiles[idx(i, j)];
      if (d === DECO.FLOWERS) n += 1.5; else if (d === DECO.TREE || d === DECO.PINE) n += 1; else if (d === DECO.HEDGE) n += 0.6; else if (d === DECO.BENCH) n += 0.8;
      if (t === TERRAIN.WATER) n += 0.4;
    }
    return Math.min(20, n);
  }
  function avgBeauty(s) {
    const u = units(s); if (!u.length) return 0;
    return u.reduce((a, b) => a + beautyAt(s, b), 0) / u.length;
  }

  function isBooked(s, unitId, a, d, ignoreId) {
    for (const bk of s.bookings) {
      if (bk.unit !== unitId || bk.id === ignoreId) continue;
      if (bk.status !== 'booked' && bk.status !== 'onsite') continue;
      if (a < bk.depart && bk.arrive < d) return true;
    }
    return false;
  }

  function occupancy(s, day = s.day) {
    const u = units(s); if (!u.length) return { occ: 0, used: 0, total: 0, persons: 0, cap: 0 };
    let used = 0, persons = 0;
    const set = new Set(u.map((b) => b.id));
    for (const bk of s.bookings) {
      if ((bk.status === 'booked' || bk.status === 'onsite') && bk.arrive <= day && day < bk.depart && set.has(bk.unit)) { used++; persons += bk.size; }
    }
    const cap = u.reduce((a, b) => a + BUILDINGS[b.type].cap, 0);
    return { occ: used / u.length, used, total: u.length, persons, cap };
  }

  function starMult(s) { return 0.8 + 0.1 * s.stars; }

  function classement(s) {
    const u = units(s).length, rep = s.reputation;
    const has = (t) => services(s, t).length > 0;
    const cabins = ofType(s, 'sanitary').length * 6;
    const cap = units(s).reduce((a, b) => a + BUILDINGS[b.type].cap, 0);
    const ratioOk = cabins > 0 && cap / cabins <= 14;
    const roles = new Set(s.staff.map((x) => x.role));
    const mh = ofType(s, 'mobilhome').length;
    const levels = [
      { stars: 2, req: [[u >= 8, '8 hébergements'], [has('reception'), 'un accueil relié'], [has('sanitary'), 'des sanitaires']] },
      { stars: 3, req: [[u >= 18, '18 hébergements'], [has('shop'), 'une épicerie'], [rep >= 50, 'réputation ≥ 50'], [ratioOk, '1 cabine sanitaire pour 14 pers. max']] },
      { stars: 4, req: [[u >= 30, '30 hébergements'], [has('pool'), 'une piscine'], [has('playground'), 'une aire de jeux'], [rep >= 65, 'réputation ≥ 65'], [(['reception', 'cleaning', 'maintenance'].every((role) => roles.has(role))), 'accueil, entretien et maintenance en poste']] },
      { stars: 5, req: [[u >= 50, '50 hébergements'], [mh >= 10, '10 mobil-homes'], [rep >= 80, 'réputation ≥ 80'], [avgBeauty(s) >= 8, 'paysagisme soigné (beauté ≥ 8)'], [has('stage') && roles.has('animation'), 'une scène avec animateur']] }
    ];
    let stars = 1, next = null;
    for (const L of levels) {
      if (L.req.every((r) => r[0])) stars = L.stars;
      else { next = { stars: L.stars, missing: L.req.filter((r) => !r[0]).map((r) => r[1]) }; break; }
    }
    return { stars, next };
  }

  /* ---------- Finances ---------- */
  const INCOME = new Set(['Acomptes', 'Soldes séjours', 'Épicerie', 'Restauration', 'Activités & loisirs', 'Primes', 'Ventes']);
  const FINANCING = 'Financement'; // emprunts et remboursements de capital : hors résultat
  function money(s, amount, cat) {
    amount = r2(amount);
    if (!amount) return;
    s.fin.cash = r2(s.fin.cash + amount);
    s.fin.season[cat] = r2((s.fin.season[cat] || 0) + amount);
    s.fin.all[cat] = r2((s.fin.all[cat] || 0) + amount);
    const h = s.fin.history; let last = h[h.length - 1];
    const key = s.year * 1000 + s.day;
    if (!last || last.k !== key) { last = { k: key, inc: 0, exp: 0, cash: 0 }; h.push(last); if (h.length > 400) h.shift(); }
    if (amount > 0) last.inc = r2(last.inc + amount); else last.exp = r2(last.exp - amount);
    last.cash = s.fin.cash;
  }

  function log(s, text, type = 'info') {
    s.log.push({ y: s.year, d: s.day, m: s.minute, text, type });
    if (s.log.length > 80) s.log.shift();
    if (s.rt) s.rt.events.push({ text, type });
  }

  /* ---------- Météo ---------- */
  function genWeather(s, day) {
    const c = seasonCurve(clamp(day, 0, 182));
    const base = 13 + c * 15 + (rand(s) - 0.5) * 6;
    let type;
    const r = rand(s);
    const pRain = 0.28 - c * 0.15, pStorm = 0.03 + c * 0.06;
    if (r < pStorm) type = 'storm';
    else if (r < pStorm + pRain) type = 'rain';
    else if (r < pStorm + pRain + 0.25) type = 'cloud';
    else type = 'sun';
    let temp = Math.round(base + (type === 'sun' ? 2 : type === 'rain' ? -4 : type === 'storm' ? 1 : -1));
    if (type === 'sun' && temp >= 31) type = 'heat';
    return { type, temp };
  }
  function weatherAt(s, day) {
    if (day === s.day) return s.weather;
    const i = day - s.day - 1;
    return s.forecast[i] || null;
  }

  /* ---------- Réservations ---------- */
  function availableTypes(s) {
    const t = {};
    for (const b of units(s)) if (accessible(s, b)) t[b.unitType || BUILDINGS[b.type].unitType] = 1;
    return t;
  }

  function attractiveness(s, profile) {
    const P = PROFILES[profile], w = P.wants;
    let a = 0.35 + s.reputation / 100 * 1.3;
    if (!services(s, 'sanitary').length) a *= 0.3;
    if (services(s, 'pool').length) a *= 1 + 0.25 * (w.pool || 0.5);
    if (services(s, 'playground').length) a *= 1 + 0.12 * (w.playground || 0.2);
    if (services(s, 'shop').length) a *= 1 + 0.08 * (w.shop || 0.5);
    if (services(s, 'snack').length) a *= 1.06;
    if (services(s, 'minigolf').length) a *= 1 + (profile === 'family' ? .16 : .11);
    if (services(s, 'multisport').length) a *= 1 + (profile === 'family' ? .14 : .06);
    if (services(s, 'bikes').length) a *= 1 + (profile === 'couple' || profile === 'nomad' ? .13 : .09);
    if (services(s, 'laundry').length) a *= 1 + (profile === 'family' ? .06 : .04);
    if (services(s,'petanque').length) a *= 1 + (profile === 'couple' ? .12 : .075);
    if (services(s,'cinema').length) a *= 1 + (profile === 'family' ? .13 : .1);
    if (services(s,'bakery').length) a *= 1.09;
    if (services(s,'spa').length) a *= 1 + (profile === 'couple' ? .19 : .085);
    if (services(s, 'pool').some((b) => b.level === 2)) a *= 1 + 0.1 * (w.pool || 0.5);
    if (services(s, 'stage').length && s.staff.some((x) => x.role === 'animation')) a *= 1 + 0.1 * (w.anim || 0.5);
    a *= 1 + Math.min(10, avgBeauty(s)) * 0.012 * (w.beauty || 0.6);
    return a;
  }

  /** Traite une demande de réservation de façon atomique. Retourne la réservation ou un motif de refus. */
  const PREMIUM = 1.3;
  // La saison tarifaire dépend du jour d'arrivée. Le prix est verrouillé à la réservation.
  function seasonBand(day) {
    if (day < 61 || day >= 153) return 'low';    // avril-mai et septembre
    if (day < 91 || day >= 137) return 'mid';   // juin et fin août
    return 'high';                              // juillet et première quinzaine d'août
  }
  function seasonMultiplier(s, day) {
    return (s.seasonRates && s.seasonRates[seasonBand(day)]) || 1;
  }
  function unitPrice(s, b, day = s.day) {
    return r2(s.prices[BUILDINGS[b.type].unitType] * (b.level === 2 ? PREMIUM : 1) * seasonMultiplier(s, day));
  }
  function acceptRate(s, type, profile, tier = 1, day = s.day) {
    const ref = D.REF_PRICES[type] * starMult(s) * (tier === 2 ? 1.22 : 1);
    return Math.min(1, Math.pow(ref / (s.prices[type] * (tier === 2 ? PREMIUM : 1) * seasonMultiplier(s, day)), PROFILES[profile].elasticity));
  }
  function priceAccepted(s, req, tier) { return rand(s) <= acceptRate(s, req.type, req.profile, tier, req.arrive); }
  function requestBooking(s, req) {
    s.stats.requests++;
    const def = Object.keys(BUILDINGS).find((k) => BUILDINGS[k].unitType === req.type);
    const cap = BUILDINGS[def].cap;
    if (req.size > cap) return { refused: 'capacity' };
    if (!(req.nights >= 1) || req.arrive < s.day || s.phase !== 'season') return { refused: 'dates' };
    const depart = req.arrive + req.nights;
    if (depart > D.SEASON_DAYS - 1) return { refused: 'dates' };
    const cands = units(s).filter((b) => BUILDINGS[b.type].unitType === req.type && accessible(s, b) && !b.broken && !isBooked(s, b.id, req.arrive, depart));
    if (!cands.length) { s.stats.lostFull++; return { refused: 'full' }; }
    // gamme : standard ou premium, selon le profil
    const prefPremium = rand(s) < (req.profile === 'couple' ? 0.6 : req.profile === 'family' ? 0.45 : 0);
    const tiers = prefPremium ? [2, 1] : [1, 2];
    let unit = null, priceOk = false;
    for (const tier of tiers) {
      const u = cands.find((b) => (b.level === 2 ? 2 : 1) === tier);
      if (!u) continue;
      if (!req.force && !priceAccepted(s, req, tier)) continue;
      unit = u; priceOk = true; break;
    }
    if (!unit) { s.stats.lostPrice++; return { refused: 'price' }; }
    void priceOk;
    const extra = req.type === 'mobilhome' ? 0 : Math.max(0, req.size - 2) * (s.prices.extra ?? 5);
    const price = r2(unitPrice(s, unit, req.arrive) + extra);
    const total = r2(price * req.nights);
    const deposit = r2(total * D.DEPOSIT_RATE);
    const kids = req.profile === 'family' ? Math.max(1, req.size - 2) : 0;
    const bk = {
      id: s.nextId++, name: req.name || pick(s, D.FIRST_NAMES), profile: req.profile, size: req.size, kids, type: req.type,
      unit: unit.id, arrive: req.arrive, depart, nights: req.nights, price, total, paid: 0, deposit,
      status: 'booked', bookedDay: s.day, arrTime: req.arrTime ?? (req.profile === 'nomad' ? rint(s, 15 * 60, 20 * 60) : rint(s, 13 * 60 + 30, 19 * 60)),
      depTime: rint(s, 8 * 60 + 30, 11 * 60 + 30), sat: 65, walkin: !!req.walkin, shopDay: -1, firm: !!req.force
    };
    s.bookings.push(bk);
    bk.paid = deposit; money(s, deposit, 'Acomptes');
    return { booking: bk };
  }

  function genRequest(s, profile, arrive) {
    const P = PROFILES[profile];
    const avail = availableTypes(s);
    const w = {}; let any = false;
    for (const t in P.types) if (avail[t]) { w[t] = P.types[t]; any = true; }
    if (!any) return null;
    const type = wpick(s, w);
    const nights = Math.min(rint(s, P.nights[0], P.nights[1]), D.SEASON_DAYS - 1 - arrive);
    if (nights < 1) return null;
    return { profile, type, arrive, nights, size: rint(s, P.size[0], P.size[1]) };
  }

  function generateDemand(s, fromDay, todayVirtual) {
    // Demandes émises "aujourd'hui" (todayVirtual) pour des arrivées à partir de fromDay
    const peak = 14;
    const attr = {};
    for (const p in PROFILES) attr[p] = attractiveness(s, p);
    for (let d = Math.max(fromDay, todayVirtual); d < Math.min(D.SEASON_DAYS - 1, todayVirtual + 60); d++) {
      const L = d - todayVirtual;
      const wd = dow(s, d);
      const wx = L <= 3 ? weatherAt(s, d) : null;
      let wf = 1;
      if (wx) wf = wx.type === 'rain' ? 0.6 : wx.type === 'storm' ? 0.5 : wx.type === 'heat' ? 1.2 : wx.type === 'sun' ? 1.08 : 1;
      for (const p in PROFILES) {
        const P = PROFILES[p];
        let lam = peak * seasonCurve(d) * P.share * attr[p] * wf * demandMod(s, d);
        if (p === 'family') lam *= wd === 5 ? 2.2 : 0.8; else if (wd === 4 || wd === 5) lam *= 1.3;
        const lead = (1 / P.lead) * Math.exp(-L / P.lead);
        const n = poisson(s, lam * lead);
        for (let i = 0; i < n; i++) {
          const req = genRequest(s, p, d);
          if (!req) continue;
          if (p === 'nomad' && L === 0) req.walkin = true;
          requestBooking(s, req);
        }
      }
    }
  }

  function pregenerateBookings(s) {
    const saveDay = s.day;
    for (let v = -40; v < 0; v++) {
      // jours virtuels avant l'ouverture : les arrivées ne peuvent être qu'à partir du jour 0
      s.day = 0; // requestBooking vérifie arrive >= s.day
      generateDemandVirtual(s, v);
    }
    s.day = saveDay;
  }
  function generateDemandVirtual(s, v) {
    const peak = 14; const attr = {};
    for (const p in PROFILES) attr[p] = attractiveness(s, p);
    for (let d = 0; d < 60; d++) {
      const L = d - v;
      for (const p in PROFILES) {
        const P = PROFILES[p];
        let lam = peak * seasonCurve(d) * P.share * attr[p];
        if (p === 'family') lam *= dow(s, d) === 5 ? 2.2 : 0.8;
        const n = poisson(s, lam * (1 / P.lead) * Math.exp(-L / P.lead));
        for (let i = 0; i < n; i++) { const req = genRequest(s, p, d); if (req) requestBooking(s, req); }
      }
    }
  }

  /* ---------- Agents ---------- */
  function newAgent(s, props) {
    const a = Object.assign({ id: s.rt.nextAgent++, x: 0, y: 0, px: 0, py: 0, cx: 0, cy: 0, state: 'walk', wait: 0, until: 0, speed: 0.55 }, props);
    a.px = a.x; a.py = a.y; a.cx = Math.round(a.x); a.cy = Math.round(a.y);
    s.rt.agents.push(a); s.rt.agentMap.set(a.id, a);
    return a;
  }
  function removeAgent(s, a) {
    a.dead = true; s.rt.agentMap.delete(a.id);
  }
  function destTile(s, a) {
    const d = a.dest;
    if (!d) return null;
    if (d.kind === 'b' || d.kind === 'home') { const b = byId(s, d.id); return b && b.ax >= 0 ? [b.ax, b.ay] : null; }
    if (d.kind === 'exit') return [s.entrance.x, s.entrance.y];
    if (d.kind === 'tile') return [d.x, d.y];
    return null;
  }
  function byId(s, id) {
    if (!s.rt.bmap || s.rt.bmapN !== s.buildings.length || s.rt.bmapV !== s.rt.ver) {
      s.rt.bmap = new Map(s.buildings.map((b) => [b.id, b])); s.rt.bmapN = s.buildings.length; s.rt.bmapV = s.rt.ver;
    }
    return s.rt.bmap.get(id);
  }
  const bookingById = (s, id) => s.bookings.find((b) => b.id === id);
  /** Effet individuel (une personne) sur la satisfaction du groupe : pondéré par la taille du groupe. */
  function adj(bk, v) { if (bk) bk.sat = clamp(bk.sat + v * 2 / (bk.size + 1), 0, 100); }
  /** Mémorise ce que le groupe a vécu (sert à rédiger son avis). */
  function note(bk, k, n = 1) { if (!bk) return; bk.n = bk.n || {}; bk.n[k] = (bk.n[k] || 0) + n; }

  function sendTo(s, a, dest) { a.dest = dest; a.state = 'walk'; a.wait = 0; }

  function moveAgent(s, a) {
    const t = destTile(s, a);
    if (!t) return arrive(s, a, false);
    const f = field(s, t[0], t[1]);
    const ci = idx(a.cx, a.cy);
    if (f[ci] < 0) return arrive(s, a, false);
    if (f[ci] === 0 && Math.abs(a.x - a.cx) < 0.01 && Math.abs(a.y - a.cy) < 0.01) return arrive(s, a, true);
    // prochaine case
    if (a.nx === undefined || (Math.abs(a.x - a.nx) < 0.01 && Math.abs(a.y - a.ny) < 0.01) || f[idx(a.nx, a.ny)] < 0 || f[idx(a.nx, a.ny)] >= f[ci] + 1) {
      if (a.nx !== undefined && Math.abs(a.x - a.nx) < 0.01 && Math.abs(a.y - a.ny) < 0.01) { a.cx = a.nx; a.cy = a.ny; }
      const c = idx(a.cx, a.cy);
      if (f[c] === 0) { a.x = a.cx; a.y = a.cy; return arrive(s, a, true); }
      const opts = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = a.cx + dx, ny = a.cy + dy;
        if (inMap(nx, ny) && f[idx(nx, ny)] === f[c] - 1) opts.push([nx, ny]);
      }
      if (!opts.length) return arrive(s, a, false);
      const o = opts[a.id % opts.length];
      a.nx = o[0]; a.ny = o[1];
    }
    let sp = a.speed;
    while (sp > 0) {
      const dx = a.nx - a.x, dy = a.ny - a.y, dist = Math.abs(dx) + Math.abs(dy);
      if (dx !== 0) a.face = dx < 0 ? -1 : 1;
      if (dist <= sp) {
        a.x = a.nx; a.y = a.ny; a.cx = a.nx; a.cy = a.ny; sp -= dist;
        const c = idx(a.cx, a.cy);
        if (f[c] === 0) return arrive(s, a, true);
        let nxt = null;
        for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = a.cx + ddx, ny = a.cy + ddy;
          if (inMap(nx, ny) && f[idx(nx, ny)] === f[c] - 1) { nxt = [nx, ny]; if ((a.id + nx + ny) % 2) break; }
        }
        if (!nxt) return;
        a.nx = nxt[0]; a.ny = nxt[1];
      } else {
        a.x += Math.sign(dx) * Math.min(sp, Math.abs(dx));
        a.y += Math.sign(dy) * Math.min(sp, Math.abs(dy));
        sp = 0;
      }
    }
  }


  /* Les décisions des vacanciers utilisent leur propre flux aléatoire :
     pas d'effet parasite sur la demande, le calendrier ou l'économie. */
  function guestRand(s) {
    if (!Number.isFinite(s.guestRng)) s.guestRng = ((s.seed || 12345) ^ 0x9e3779b9) >>> 0;
    let t = s.guestRng = (s.guestRng + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const guestRint = (s, a, b) => a + Math.floor(guestRand(s) * (b - a + 1));

  /* ---------- Vacanciers V1.4 : besoins persistants entre sauvegardes ---------- */
  const NEED_KEYS = ['energy', 'hunger', 'hygiene', 'fun', 'social'];
  const NEED_ACTIVITY = { use: 'sanitary', buy: 'shop', eat: 'snack', swim: 'pool', play: 'playground', show: 'stage', stroll: 'walk', golf: 'minigolf', sport: 'multisport', cycle: 'bikes', wash: 'laundry', bowl: 'petanque', movie: 'cinema', breakfast: 'bakery', relax: 'spa' };

  function guestStates(bk) {
    if (!Array.isArray(bk.guests)) bk.guests = [];
    for (let i = 0; i < bk.size; i++) {
      const kid = i >= bk.size - bk.kids && bk.kids > 0;
      if (!bk.guests[i] || !bk.guests[i].needs) {
        const hash = (bk.id * 131 + i * 47) >>> 0;
        bk.guests[i] = { kid, style: hash % 9, temperament: (hash % 13) / 12,
          needs: { energy: 78 + hash % 18, hunger: 68 + hash % 22,
            hygiene: 70 + hash % 22, fun: 54 + hash % 26, social: 55 + hash % 26 },
          last: 'arrivee', nextDecision: 0, trips: 0 };
      } else {
        const g = bk.guests[i];
        g.kid = kid;
        if (!Number.isFinite(g.nextDecision)) g.nextDecision = 0;
        if (!Number.isFinite(g.trips)) g.trips = 0;
        if (!Number.isFinite(g.style)) g.style = (bk.id * 131 + i * 47) % 9;
        if (!Number.isFinite(g.temperament)) g.temperament = 0.5;
        for (const k of NEED_KEYS) if (!Number.isFinite(g.needs[k])) g.needs[k] = 65;
      }
    }
    bk.guests.length = bk.size;
    return bk.guests;
  }
  function needAdjust(guest, changes) {
    if (!guest) return;
    for (const [k, v] of Object.entries(changes))
      if (NEED_KEYS.includes(k)) guest.needs[k] = clamp(guest.needs[k] + v, 0, 100);
  }
  function guestChildNeedsEscort(s, a) {
    if (!a.companion || a.kid) return false;
    return s.rt.agents.some((other) => !other.dead && other.id !== a.id && other.bk === a.bk &&
      other.kid && other.companion === a.companion);
  }
  function guestStateForAgent(s, a) {
    const bk = bookingById(s, a.bk);
    return bk && Number.isInteger(a.memberIndex) ? guestStates(bk)[a.memberIndex] : null;
  }
  function guestNeedsStep(s) {
    const h = s.minute / 60, night = h >= 22.5 || h < 7;
    for (const bk of s.bookings) {
      if (bk.status !== 'onsite') continue;
      const states = guestStates(bk), group = s.rt.groups.get(bk.id);
      for (let i = 0; i < states.length; i++) {
        const v = states[i], member = group && group.members[i];
        const agent = member && member.aid ? s.rt.agentMap.get(member.aid) : null;
        const busy = agent && (agent.state === 'walk' || agent.state === 'queue' || agent.state === 'use');
        if (night) needAdjust(v, { energy: 2.5, hunger: -0.3, hygiene: -0.12, fun: -0.08 });
        else {
          needAdjust(v, { energy: busy ? -0.94 : v.needs.energy < 50 ? 0.86 : -0.48, hunger: busy ? -1.48 : -1.23,
            hygiene: busy ? -0.58 : -0.34, fun: busy ? -0.18 : -0.38,
            social: busy && agent && agent.companion ? 0.28 : -0.18 });
          // Repas à l'emplacement : un camping sans snack reste viable.
          if (!busy && (s.minute === 8 * 60 || s.minute === 13 * 60 || s.minute === 19 * 60))
            needAdjust(v, { hunger: 26, energy: 3 });
        }
      }
    }
  }
  function guestMood(s, bk) {
    const states = guestStates(bk);
    if (!states.length) return 65;
    return states.reduce((sum, v) => {
      const n = v.needs;
      return sum + n.energy * 0.2 + n.hunger * 0.26 + n.hygiene * 0.18 + n.fun * 0.25 + n.social * 0.11;
    }, 0) / states.length;
  }

  /* ---------- Groupes de vacanciers ---------- */
  function makeGroupHome(s, bk) {
    const members = [];
    for (const v of guestStates(bk)) members.push({ kid: v.kid, aid: 0 });
    s.rt.groups.set(bk.id, { phase: 'home', members });
  }

  function spawnArrival(s, bk) {
    const unit = byId(s, bk.unit);
    const members = [], states = guestStates(bk);
    const g = { phase: 'arriving', members };
    s.rt.groups.set(bk.id, g);
    const rec = services(s, 'reception')[0];
    for (let i = 0; i < bk.size; i++) {
      const kid = i >= bk.size - bk.kids && bk.kids > 0;
      const a = newAgent(s, {
        kind: 'guest', bk: bk.id, kid, leader: i === 0, profile: bk.profile, carry: i < 2,
        memberIndex: i, shirt: states[i].style,
        x: s.entrance.x - 1.5 - i * 0.35, y: s.entrance.y, speed: kid ? 0.62 : 0.55
      });
      a.cx = s.entrance.x; a.cy = s.entrance.y; a.nx = s.entrance.x; a.ny = s.entrance.y;
      members.push({ kid, aid: a.id });
      if (rec) sendTo(s, a, { kind: 'b', id: rec.id, purpose: i === 0 ? 'checkin' : 'follow' });
      else sendTo(s, a, { kind: 'home', id: unit.id });
    }
    if (!rec) { checkIn(s, bk, true); }
  }

  function checkIn(s, bk, noDesk) {
    if (bk.status !== 'booked') return;
    const bal = r2(bk.total - bk.paid);
    bk.paid = r2(bk.paid + bal); money(s, bal, 'Soldes séjours');
    bk.status = 'onsite';
    const unit = byId(s, bk.unit);
    let sat = 60 - Math.max(0, s.stars - 2) * 4; // clientèle plus exigeante quand le classement monte
    if (noDesk) sat -= 10;
    const ref = D.REF_PRICES[bk.type] * starMult(s);
    const tierF = unit && unit.level === 2 ? PREMIUM : 1;
    if (bk.price > ref * tierF * 1.2) { sat -= 10; note(bk, 'price'); } else if (bk.price < ref * tierF * 0.9) { sat += 5; note(bk, 'cheap'); }
    if (unit && unit.level === 2) { sat += 8; note(bk, 'premium'); }
    const rec0 = services(s, 'reception')[0];
    if (rec0 && rec0.level === 2 && !noDesk) { sat += 3; note(bk, 'welcome'); }
    sat += Math.min(10, beautyAt(s, unit) * 0.7);
    if (unit.clean) { sat -= 18; unit.clean = false; note(bk, 'mhdirty', 3); log(s, `Famille ${bk.name} : mobil-home n°${unit.num} pas nettoyé à l’arrivée !`, 'bad'); }
    if (unit.broken) { sat -= 12; note(bk, 'broken', 2); }
    bk.sat = clamp(sat, 0, 100);
    guestStates(bk);
    s.stats.groups++; s.totals.groups++; s.stats.persons += bk.size;
    const g = s.rt.groups.get(bk.id);
    if (g) {
      g.phase = 'home';
      for (const m of g.members) { const a = s.rt.agentMap.get(m.aid); if (a) sendTo(s, a, { kind: 'home', id: bk.unit }); }
    }
  }

  function checkOut(s, bk) {
    if (bk.status !== 'onsite') return;
    bk.status = 'done';
    const rating = clamp(Math.round((1 + (bk.sat - 30) / 16.25) * 2) / 2, 1, 5);
    bk.rating = rating;
    s.stats.ratings.push(rating);
    s.stats.nights += bk.nights; s.totals.nights += bk.nights;
    const wgt = bk.influencer ? 0.12 : 0.025;
    s.reputation = clamp(s.reputation * (1 - wgt) + rating * 20 * wgt, 0, 100);
    const unit = byId(s, bk.unit);
    if (unit && BUILDINGS[unit.type].needsCleaning) unit.clean = true;
    const review = writeReview(s, bk, rating);
    s.reviews.push(review); if (s.reviews.length > 60) s.reviews.shift();
    if (rating <= 2) log(s, `Avis ${'★'.repeat(Math.max(1, Math.round(rating)))} — ${bk.name} : « ${review.text} »`, 'bad');
  }

  function startDeparture(s, bk) {
    const g = s.rt.groups.get(bk.id);
    checkOut(s, bk);
    if (!g) return;
    g.phase = 'leaving';
    const unit = byId(s, bk.unit);
    const rec = services(s, 'reception')[0];
    let first = true;
    for (const m of g.members) {
      let a = m.aid ? s.rt.agentMap.get(m.aid) : null;
      if (!a) {
        if (!unit || unit.ax < 0) continue;
        const i = g.members.indexOf(m);
        a = newAgent(s, { kind: 'guest', bk: bk.id, kid: m.kid, profile: bk.profile,
          memberIndex: i, shirt: guestStates(bk)[i].style, x: unit.ax, y: unit.ay,
          speed: m.kid ? 0.62 : 0.55, carry: !m.kid });
        m.aid = a.id;
      } else {
        const st = a.inB ? bs(s, byId(s, a.inB)) : null;
        if (st) { st.users = st.users.filter((u) => u.aid !== a.id); st.queue = st.queue.filter((q) => q !== a.id); a.inB = 0; }
        a.state = 'walk';
      }
      if (first && !m.kid && rec) { sendTo(s, a, { kind: 'b', id: rec.id, purpose: 'checkout' }); first = false; }
      else sendTo(s, a, { kind: 'exit' });
    }
  }

  function memberOf(s, a) {
    const g = s.rt.groups.get(a.bk); if (!g) return null;
    return g.members.find((m) => m.aid === a.id) || null;
  }

  function arrive(s, a, ok) {
    const d = a.dest;
    if (a.kind === 'staff') return staffArrive(s, a, ok);
    const bk = bookingById(s, a.bk);
    if (!ok) {
      // pas de chemin : on « téléporte » en pénalisant
      if (bk && d && d.kind !== 'exit') { adj(bk, -(4)); if (!bk._pathWarn) { bk._pathWarn = 1; log(s, `Des vacanciers ne trouvent pas leur chemin ! Reliez chaque parcelle et équipement à l’allée principale.`, 'bad'); } }
      if (d && d.kind === 'b' && d.purpose === 'checkin' && bk && bk.status === 'booked') { checkIn(s, bk, true); return; }
      if (d && d.kind === 'b' && d.purpose === 'follow') { a.state = 'wait'; return; }
      return goneHomeOrOut(s, a, (d && d.kind === 'exit') || !bk || bk.status !== 'onsite' ? 'exit' : 'home');
    }
    if (d.kind === 'home') return goneHomeOrOut(s, a, 'home');
    if (d.kind === 'exit') return goneHomeOrOut(s, a, 'exit');
    if (d.kind === 'tile') {
      const guest = guestStateForAgent(s, a);
      needAdjust(guest, { fun: 10, social: a.companion ? 8 : 2, energy: -3 });
      if (guest) guest.last = 'promenade';
      a.state = 'rest'; a.until = s.day * DAY + s.minute + guestRint(s, 12, 26);
      return;
    }
    if (d.kind === 'b') {
      const b = byId(s, d.id);
      if (!b) return sendTo(s, a, { kind: 'home', id: bk.unit });
      if (d.purpose === 'follow') { a.state = 'wait'; return; }
      if (b.broken && b.type !== 'reception') {
        adj(bk, -(4));
        return sendTo(s, a, { kind: 'home', id: bk.unit });
      }
      if (b.type === 'pool' && !poolOpen(s, b)) { adj(bk, -(2)); return sendTo(s, a, { kind: 'home', id: bk.unit }); }
      if (b.type === 'stage' && !stageLive(s, b)) return sendTo(s, a, { kind: 'home', id: bk.unit });
      if (b.type === 'snack' && !snackOpen(s, b)) return sendTo(s, a, { kind: 'home', id: bk.unit });
      if (['minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'].includes(b.type) && !activityOpen(s,b))
        return sendTo(s, a, { kind: 'home', id: bk.unit });
      a.state = 'queue'; a.wait = 0; a.inB = b.id; a.purpose = d.purpose;
      bs(s, b).queue.push(a.id);
    }
  }

  function goneHomeOrOut(s, a, where) {
    const g = s.rt.groups.get(a.bk);
    const m = memberOf(s, a);
    if (m) m.aid = 0;
    removeAgent(s, a);
    if (g && where === 'exit' && g.members.every((x) => !x.aid)) s.rt.groups.delete(a.bk);
    if (g && g.phase === 'leaving' && where === 'home') {
      // rare : un membre rentré pendant le départ repart vers la sortie
      const bk = bookingById(s, a.bk); const unit = bk && byId(s, bk.unit);
      if (unit && m) { const b = newAgent(s, { kind: 'guest', bk: a.bk, kid: m.kid, profile: a.profile, x: unit.ax, y: unit.ay, speed: a.speed }); m.aid = b.id; sendTo(s, b, { kind: 'exit' }); }
    }
  }

  function poolOpen(s, b) {
    const def = BUILDINGS.pool;
    return !b.broken && b.water >= 30 && s.weather.type !== 'storm' && s.minute >= def.openFrom && s.minute < def.openTo;
  }

  function activityOpen(s, b) {
    if (!b || b.broken || b.progress > 0) return false;
    const def = BUILDINGS[b.type];
    if (!def || !def.service) return false;
    if (def.openFrom !== undefined && (s.minute < def.openFrom || s.minute >= def.openTo)) return false;
    if (['minigolf','multisport','bikes','petanque','cinema'].includes(b.type) &&
        ['rain','storm'].includes(s.weather.type)) return false;
    if (b.type === 'pool') return poolOpen(s, b);
    if (b.type === 'stage') return stageLive(s, b);
    if (b.type === 'snack') return snackOpen(s, b);
    return true;
  }
  function nearestService(s, type, fromB) {
    let best = null, bd = 1e9;
    for (const b of ofType(s, type)) {
      if (b.broken || b.ax < 0) continue;
      const d = field(s, b.ax, b.ay)[idx(fromB.ax, fromB.ay)];
      if (d < 0) continue;
      const q = bs(s, b).queue.length;
      const score = d + q * 3;
      if (score < bd) { bd = score; best = b; }
    }
    return best;
  }


  /* ---------- Routines, décisions et excursions en petit groupe ---------- */
  function scenicDestination(s, home) {
    const paths = pathTiles(s);
    if (!paths.length) return null;
    const from = field(s, home.ax, home.ay);
    let best = null, bestScore = -1e9;
    for (let i = 0; i < Math.min(20, paths.length); i++) {
      const tile = paths[Math.floor(guestRand(s) * paths.length)], x = tile % W, y = (tile / W) | 0;
      const distance = from[tile];
      if (distance < 4 || distance > 28) continue;
      let scenery = (x > 28 ? 8 : 0) + (x > 35 ? 6 : 0);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy;
        if (!inMap(nx, ny)) continue;
        const d = s.deco[idx(nx, ny)], t = s.tiles[idx(nx, ny)];
        if (d === DECO.TREE || d === DECO.PINE || d === DECO.FLOWERS) scenery += 3;
        if (t === TERRAIN.WATER) scenery += 10;
      }
      const score = scenery + Math.min(18, distance) * 0.6 - Math.max(0, distance - 18) * 2;
      if (score > bestScore) { bestScore = score; best = { kind: 'tile', x, y, purpose: 'stroll' }; }
    }
    return best;
  }
  function chooseGuestActivity(s, bk, guest, home, idxMember) {
    const h = s.minute / 60, needs = guest.needs, P = PROFILES[bk.profile];
    const wx = s.weather.type, outdoors = wx !== 'rain' && wx !== 'storm';
    const actions = [], gap = (k) => 100 - needs[k];
    const consider = (service, purpose, score, allowed = true) => {
      if (!allowed || score < 20) return;
      const b = nearestService(s, service, home);
      if (!b) return;
      if (service === 'pool' && !poolOpen(s, b)) return;
      if (service === 'stage' && !stageLive(s, b)) return;
      if (service === 'snack' && !snackOpen(s, b)) return;
      if (!activityOpen(s, b)) return;
      // La proximité et la queue comptent plus qu'un simple tirage au sort.
      const distance = field(s, b.ax, b.ay)[idx(home.ax, home.ay)];
      const queue = bs(s, b).queue.length;
      const utility = score + guestRand(s) * 13 - Math.min(18, distance * 0.6 + queue * 2.5);
      actions.push({ purpose, target: { kind: 'b', id: b.id, purpose }, utility });
    };
    consider('sanitary', 'use',
      gap('hygiene') * 1.45 + ((h < 10 || h > 19) ? 20 : 0), h >= 7 && h < 22);
    consider('snack', 'eat', gap('hunger') * 1.45 + 23,
      (h >= 11.5 && h < 14) || (h >= 18.5 && h < 21.5));
    consider('shop', 'buy', gap('hunger') * 0.82 + 33,
      !guest.kid && bk.shopDay !== s.day && h >= 8 && h < 19);
    consider('pool', 'swim', gap('fun') * 0.9 + (wx === 'heat' ? 34 : wx === 'sun' ? 22 : 4)
      + (P.wants.pool || 0.5) * 10, h >= 10 && h < 19 && wx !== 'storm' && needs.energy > 30);
    consider('playground', 'play', gap('fun') * 0.95 + 34,
      guest.kid && outdoors && h >= 9 && h < 19 && needs.energy > 32);
    consider('stage', 'show', gap('fun') * 0.9 + 32 + (P.wants.anim || 0.5) * 9,
      (h >= 15 && h < 17) || (h >= 20 && h < 22));
    // V1.7 — vrais nouveaux lieux de vie : chacun possède sa propre logique de visite.
    consider('minigolf', 'golf', 29 + gap('fun') * .85 + (bk.profile === 'family' ? 13 : 5),
      outdoors && h >= 9 && h < 19.5 && needs.energy > 29);
    consider('multisport', 'sport', 28 + gap('fun') * .89 + gap('social') * .18 +
      (bk.profile === 'family' ? 17 : 0), outdoors && h >= 9 && h < 20.5 && needs.energy > 40);
    consider('bikes', 'cycle', 26 + gap('fun') * .87 + (bk.profile === 'nomad' ? 19 : 8),
      outdoors && h >= 9 && h < 18.5 && needs.energy > 43);
    consider('bakery','breakfast',28+gap('hunger')*1.12+(h<10?21:0),
      h>=7.5 && h<12 && s.day-(bk.bakeryDay??-99)>=1);
    consider('petanque','bowl',32+gap('social')*.76+gap('fun')*.54+
      (bk.profile==='couple'?15:0),outdoors && h>=10 && h<20 && needs.energy>29);
    consider('spa','relax',29+gap('energy')*.82+gap('fun')*.65+
      (bk.profile==='couple'?24:4),h>=10 && h<20.5 && !guest.kid &&
      s.day-(bk.spaDay??-99)>=1);
    consider('cinema','movie',40+gap('fun')*.83+
      (bk.profile==='family'?13:9),outdoors && h>=20.25 && h<21.6 && needs.energy>23);
    consider('laundry', 'wash', 20 + gap('hygiene') * .88 +
      (bk.nights >= 5 ? 32 : 0), !guest.kid && h >= 8 && h < 20.5 &&
      (bk.nights >= 4 || needs.hygiene < 45) && s.day - (bk.laundryDay ?? -99) >= 3);
    if (outdoors && h >= 9 && h < 20.5 && needs.energy >= 33) {
      const walk = scenicDestination(s, home);
      if (walk) actions.push({ purpose: 'stroll', target: walk,
        utility: 25 + gap('fun') * 0.52 + gap('social') * 0.22
          + (bk.profile === 'couple' ? 14 : 0) + guestRand(s) * 13 });
    }
    actions.sort((a, b) => b.utility - a.utility);
    return actions[0] && actions[0].utility >= 48 ? actions[0] : null;
  }
  function guestTrips(s) {
    const hour = s.minute / 60;
    if (hour < 7.5 || hour >= 22 || s.minute % 10) return;
    const now = s.day * DAY + s.minute;
    s.stats.guestActivities = s.stats.guestActivities || {};
    for (const [id, group] of s.rt.groups) {
      if (group.phase !== 'home') continue;
      const bk = bookingById(s, id);
      if (!bk || bk.status !== 'onsite') continue;
      const home = byId(s, bk.unit);
      if (!home || home.ax < 0 || !accessible(s, home)) continue;
      const guests = guestStates(bk);
      for (let i = 0; i < group.members.length; i++) {
        if (group.members[i].aid || guests[i].nextDecision > now) continue;
        const guest = guests[i];
        if (guest.needs.energy < 27) {
          needAdjust(guest, { energy: 6, fun: 1 });
          guest.nextDecision = now + 30;
          continue;
        }
        const chosen = chooseGuestActivity(s, bk, guest, home, i);
        if (!chosen) { guest.nextDecision = now + 20; continue; }
        const fellow = [];
        const idle = (index) => index !== i && !group.members[index].aid && guests[index].nextDecision <= now
          && guests[index].needs.energy >= 25;
        if (guest.kid && chosen.purpose !== 'use') {
          // Les mineurs ne partent pas seuls vers les loisirs :
          // exception pour le club enfants quand l'animation est encadrée.
          const supervisedClub = chosen.purpose === 'show' && hour >= 15 && hour < 17;
          if (!supervisedClub) {
            const adult = guests.findIndex((v, j) => !v.kid && idle(j));
            if (adult === -1) { guest.nextDecision = now + 20; continue; }
            fellow.push(adult);
          }
        } else if (!guest.kid && ['stroll', 'swim', 'play', 'show', 'eat', 'golf', 'sport', 'cycle', 'bowl', 'movie', 'breakfast'].includes(chosen.purpose)) {
          const kid = bk.profile === 'family' && guestRand(s) < 0.55
            ? guests.findIndex((v, j) => v.kid && idle(j)) : -1;
          if (kid >= 0) fellow.push(kid);
          else if ((bk.profile === 'couple' || bk.profile === 'family') && guestRand(s) < 0.52) {
            const partner = guests.findIndex((v, j) => !v.kid && idle(j));
            if (partner >= 0) fellow.push(partner);
          }
        }
        const party = [i, ...fellow], tripId = party.length > 1 ? 'g' + id + '-' + now + '-' + i : null;
        for (const memberIndex of party) {
          const g = guests[memberIndex], m = group.members[memberIndex];
          const a = newAgent(s, { kind: 'guest', bk: bk.id, kid: m.kid, memberIndex,
            shirt: g.style, profile: bk.profile, x: home.ax, y: home.ay,
            speed: m.kid ? 0.53 : 0.51, companion: tripId, act: chosen.purpose,
            towel: chosen.purpose === 'swim' });
          m.aid = a.id;
          sendTo(s, a, Object.assign({}, chosen.target));
          g.nextDecision = now + (chosen.purpose === 'stroll' ? 110 : 75) + Math.floor(guestRand(s) * 38);
          g.trips++;
        }
        if (chosen.purpose === 'buy') bk.shopDay = s.day;
        if (chosen.purpose === 'wash') bk.laundryDay = s.day;
        if (chosen.purpose === 'breakfast') bk.bakeryDay = s.day;
        if (chosen.purpose === 'relax') bk.spaDay = s.day;
        s.stats.guestTrips = (s.stats.guestTrips || 0) + 1;
        if (party.length > 1) s.stats.escortedTrips = (s.stats.escortedTrips || 0) + 1;
        const activity = NEED_ACTIVITY[chosen.purpose] || chosen.purpose;
        s.stats.guestActivities[activity] = (s.stats.guestActivities[activity] || 0) + party.length;
      }
    }
  }

  /* ---------- Services (files d'attente) ---------- */
  function receptionServers(s, b) {
    let n = 0;
    for (const a of s.rt.agents) if (!a.dead && a.kind === 'staff' && a.role === 'reception' && a.state === 'work' && a.workB === b.id) n++;
    return n;
  }

  function serviceStep(s) {
    const now = s.day * DAY + s.minute;
    for (const b of s.buildings) {
      if (b.progress > 0) continue;
      const def = BUILDINGS[b.type];
      if (!def.service) continue;
      const st = s.rt.bstate.get(b.id);
      if (!st) continue;
      // fin d'utilisation
      if (st.users.length) {
        const keep = [];
        for (const u of st.users) {
          const a = s.rt.agentMap.get(u.aid);
          if (!a) continue;
          const closing = (b.type === 'pool' && !poolOpen(s, b)) ||
            (b.type === 'stage' && (!stageLive(s, b) || (stageWindow(s) && stageWindow(s).to - s.minute <= 1))) ||
            (b.type === 'snack' && !snackOpen(s, b) && s.minute > 21 * 60 + 50) ||
            (['minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'].includes(b.type) && !activityOpen(s,b));
          if (u.until <= now || closing) finishUse(s, b, a, u);
          else keep.push(u);
        }
        st.users = keep;
      }
      // admission
      let slots = (def.slots || 1);
      if (b.level === 2) slots = { sanitary: 9, shop: 3, pool: 36, snack: 24 }[b.type] || slots;
      let staffed = true;
      if (b.type === 'reception') { const n = receptionServers(s, b); staffed = n > 0; slots = Math.max(1, n) + (b.level === 2 ? 1 : 0); }
      if (b.broken && b.type !== 'reception') slots = 0;
      if (b.type === 'pool' && !poolOpen(s, b)) slots = 0;
      if (b.type === 'stage' && (!stageLive(s, b) || (stageWindow(s) && stageWindow(s).to - s.minute <= 2))) slots = 0;
      if (b.type === 'snack' && !snackOpen(s, b)) slots = 0;
      if (['minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'].includes(b.type) && !activityOpen(s,b)) slots = 0;
      while (st.queue.length && st.users.length < slots) {
        const aid = st.queue.shift();
        const a = s.rt.agentMap.get(aid);
        if (!a) continue;
        const bk = bookingById(s, a.bk);
        let dur = 5;
        if (b.type === 'sanitary') { dur = rint(s, 7, 15); b.dirt = Math.min(100, b.dirt + (s.weather.type === 'heat' ? 0.9 : 0.6) * (b.level === 2 ? 0.65 : 1)); }
        else if (b.type === 'shop') dur = rint(s, 2, 4);
        else if (b.type === 'pool') dur = rint(s, 45, 130);
        else if (b.type === 'playground') dur = rint(s, 20, 55);
        else if (b.type === 'snack') dur = rint(s, 25, 45);
        else if (b.type === 'minigolf') dur = rint(s, 25, 50);
        else if (b.type === 'multisport') dur = rint(s, 25, 65);
        else if (b.type === 'bikes') dur = rint(s, 38, 90);
        else if (b.type === 'laundry') dur = rint(s, 20, 38);
        else if (b.type === 'petanque') dur = rint(s, 28, 68);
        else if (b.type === 'cinema') dur = rint(s, 50, 82);
        else if (b.type === 'bakery') dur = rint(s, 12, 26);
        else if (b.type === 'spa') dur = rint(s, 40, 70);
        else if (b.type === 'stage') { const w = stageWindow(s); dur = Math.max(1, w ? w.to - s.minute - 1 : 1); if (w && w.show) s.rt.showDay = s.day; }
        else if (b.type === 'reception') dur = a.purpose === 'checkin' ? (staffed ? rint(s, 3, 5) : rint(s, 10, 14)) : (staffed ? 2 : 5);
        if (bk && a.wait > 10) { adj(bk, -(Math.min(8, (a.wait - 10) / 4))); note(bk, 'queue', 0.5); }
        s.stats.waits += a.wait;
        b.uses++;
        a.state = 'use';
        st.users.push({ aid, until: now + dur });
      }
      // patience
      for (let i = st.queue.length - 1; i >= 0; i--) {
        const a = s.rt.agentMap.get(st.queue[i]);
        if (!a) { st.queue.splice(i, 1); continue; }
        a.wait++;
        const patience = b.type === 'reception' ? 999 : b.type === 'pool' ? 25 : 20;
        if (a.wait > patience || (b.broken && b.type !== 'reception') || (b.type === 'pool' && !poolOpen(s, b)) || (b.type === 'stage' && !stageLive(s, b)) || (b.type === 'snack' && !snackOpen(s, b)) || (['minigolf','multisport','bikes','laundry','petanque','cinema','bakery','spa'].includes(b.type) && !activityOpen(s,b))) {
          st.queue.splice(i, 1);
          const bk = bookingById(s, a.bk);
          if (bk) { adj(bk, -(5)); note(bk, 'queue'); if (!b._qwarn || b._qwarn < s.day) { b._qwarn = s.day; log(s, `File d’attente trop longue : ${BUILDINGS[b.type].short.toLowerCase()} saturé(e).`, 'warn'); } }
          a.inB = 0;
          sendTo(s, a, { kind: 'home', id: bk ? bk.unit : 0 });
        }
      }
    }
  }

  function finishUse(s, b, a, u) {
    a.inB = 0;
    const bk = bookingById(s, a.bk);
    if (!bk) { sendTo(s, a, { kind: 'exit' }); return; }
    const wx = s.weather.type;
    if (b.type === 'sanitary') {
      const d = b.dirt;
      adj(bk, ((d > 80 ? -6 : d > 50 ? -3 : d < 20 ? 1 : 0.3) + (b.level === 2 ? 0.5 : 0)));
      if (d > 50) note(bk, 'dirty'); else if (d < 20) note(bk, 'clean', 0.3);
    } else if (b.type === 'shop') {
      const basket = (4 + rand(s) * 10) * s.shopMarkup * (wx === 'heat' ? 1.3 : 1) * (b.level === 2 ? 1.25 : 1);
      money(s, basket, 'Épicerie'); money(s, -basket / s.shopMarkup * 0.55, 'Stock épicerie');
      adj(bk, ((s.shopMarkup <= 1.05 ? 1.5 : s.shopMarkup >= 1.35 ? -2 : 0.5)));
    } else if (b.type === 'pool') {
      b.water = Math.max(0, b.water - 0.22);
      adj(bk, ((wx === 'heat' ? 4 : 2.5) * (b.water < 50 ? 0.3 : 1) * (b.level === 2 ? 1.3 : 1)));
      note(bk, b.water < 50 ? 'greenpool' : b.level === 2 ? 'slide' : 'pool', b.water < 50 ? 1 : 0.4);
    } else if (b.type === 'playground') { adj(bk, (3)); note(bk, 'play', 0.3); }
    else if (b.type === 'stage') { adj(bk, a.kid ? 3 : 3.5); note(bk, 'show', 0.4); }
    else if (b.type === 'snack') {
      const bill = (9 + rand(s) * 8) * s.shopMarkup * (b.level === 2 ? 1.35 : 1) * (a.kid ? 0.7 : 1);
      money(s, bill, 'Restauration'); money(s, -bill / s.shopMarkup * 0.42, 'Stock restauration');
      adj(bk, s.shopMarkup >= 1.35 ? 0.5 : 2.5); note(bk, 'food', 0.4);
    }
    else if (['minigolf', 'multisport', 'bikes', 'laundry','petanque','cinema','bakery','spa'].includes(b.type)) {
      const fees = { minigolf: 8, multisport: 0, bikes: 12, laundry: 6, petanque: 0, cinema: 5, bakery: 7, spa: 15 };
      const expenses = { minigolf: 1.1, multisport: 0.5, bikes: 2.6, laundry: 2.1, petanque: .45, cinema: 1.9, bakery: 2.7, spa: 6 };
      const paid = fees[b.type], cost = expenses[b.type];
      if (paid) money(s, paid, 'Activités & loisirs');
      money(s, -cost, 'Frais activités');
      s.stats.leisureRevenue = r2((s.stats.leisureRevenue || 0) + paid - cost);
      const counts = s.stats.leisureVisits || (s.stats.leisureVisits = {});
      counts[b.type] = (counts[b.type] || 0) + 1;
      adj(bk, b.type === 'multisport' ? 3.7 : b.type === 'laundry' ? 1.6 :
        b.type === 'spa' ? 4.2 : b.type === 'bakery' ? 2.7 : 3.2);
      note(bk, b.type, .35);
    }
    else if (b.type === 'reception') {
      if (a.purpose === 'checkin') {
        checkIn(s, bk, false);
        return;
      }
      if (a.purpose === 'checkout') { sendTo(s, a, { kind: 'exit' }); return; }
    }
    const guest = guestStateForAgent(s, a);
    if (guest) {
      const effects = {
        sanitary: { hygiene: 46, energy: 2 }, shop: { hunger: 17, fun: 2 },
        snack: { hunger: 54, energy: 7, social: 7 }, pool: { fun: 44, energy: -10, social: 9, hygiene: -5 },
        playground: { fun: 43, energy: -8, social: 9 }, stage: { fun: 40, social: 18, energy: -3 },
        minigolf: { fun: 38, energy: -7, social: 17 }, multisport: { fun: 45, energy: -15, social: 21 },
        bikes: { fun: 37, energy: -14, social: 9 }, laundry: { hygiene: 17, energy: -2 },
        petanque: { fun: 37, social: 23, energy: -5 }, cinema: { fun: 42, social: 16, energy: -8 },
        bakery: { hunger: 46, social: 5, energy: 4 }, spa: { energy: 26, fun: 38, hygiene: 8, social: 7 }
      };
      const activity = NEED_ACTIVITY[a.purpose] || a.purpose;
      if (effects[activity]) needAdjust(guest, effects[activity]);
      guest.last = activity || 'retour';
    }
    const g = s.rt.groups.get(a.bk);
    if (g && g.phase === 'leaving') sendTo(s, a, { kind: 'exit' });
    else if (guestChildNeedsEscort(s, a)) {
      // L'adulte reste sur les lieux tant que l'enfant profite du service.
      a.state = 'rest'; a.until = s.day * DAY + s.minute + 2;
    } else sendTo(s, a, { kind: 'home', id: bk.unit });
  }

  /* ---------- Personnel ---------- */
  function hire(s, role) {
    if (!STAFF[role]) return null;
    const used = new Set(s.staff.map((x) => x.name));
    const free = D.STAFF_NAMES.filter((n) => !used.has(n));
    const st = { id: s.nextId++, role, name: free.length ? pick(s, free) : 'Saisonnier ' + s.nextId, wage: STAFF[role].wage, hired: s.day, year: s.year };
    s.staff.push(st);
    log(s, `${st.name} rejoint l’équipe (${STAFF[role].name.toLowerCase()}).`, 'good');
    const [h0, h1] = STAFF[role].hours;
    if (s.phase === 'season' && s.minute >= h0 && s.minute < h1 - 30) spawnStaff(s, st, false);
    checkObjectives(s);
    return st;
  }
  function fire(s, id) {
    const i = s.staff.findIndex((x) => x.id === id);
    if (i < 0) return false;
    const st = s.staff[i];
    s.staff.splice(i, 1);
    const aid = s.rt.staffAgents.get(id);
    if (aid) { const a = s.rt.agentMap.get(aid); if (a) { releaseClaim(s, a); removeAgent(s, a); } s.rt.staffAgents.delete(id); }
    log(s, `${st.name} quitte l’équipe.`, 'info');
    return true;
  }

  function spawnStaff(s, st, atWork) {
    if (s.rt.staffAgents.has(st.id)) return;
    const a = newAgent(s, { kind: 'staff', role: st.role, sid: st.id, name: st.name, x: s.entrance.x - 1, y: s.entrance.y, speed: 0.7 });
    a.cx = s.entrance.x; a.cy = s.entrance.y; a.nx = s.entrance.x; a.ny = s.entrance.y;
    s.rt.staffAgents.set(st.id, a.id);
    if (atWork) { a.x = a.cx; a.y = a.cy; }
    staffNext(s, a);
  }

  function releaseClaim(s, a) {
    if (a.task && a.task.b) { const b = byId(s, a.task.b); if (b) { const st = bs(s, b); if (st.claim === a.id) st.claim = 0; } }
  }

  function staffNext(s, a) {
    releaseClaim(s, a);
    a.task = null; a.workB = 0;
    const [, h1] = STAFF[a.role].hours;
    if (s.minute >= h1) { sendTo(s, a, { kind: 'exit' }); a.task = { kind: 'leave' }; return; }
    if (a.role === 'reception') {
      const rec = services(s, 'reception')[0];
      if (rec) { a.task = { kind: 'desk', b: rec.id }; sendTo(s, a, { kind: 'b', id: rec.id }); return; }
    }
    if (a.role === 'animation') {
      const st = services(s, 'stage').find((b) => !b.broken);
      if (st) { a.task = { kind: 'stage', b: st.id }; sendTo(s, a, { kind: 'b', id: st.id }); return; }
    }
    let best = null, bscore = 0;
    const consider = (b, score, kind, dur) => {
      if (b.ax < 0 || b.progress > 0) return;
      const st = bs(s, b);
      if (st.claim && st.claim !== a.id && s.rt.agentMap.has(st.claim)) return;
      if (score > bscore) { bscore = score; best = { b: b.id, kind, dur }; }
    };
    if (a.role === 'cleaning') {
      for (const b of built(s)) {
        if (b.type === 'sanitary' && b.dirt > 22) consider(b, b.dirt * ((s.staffPolicy || {}).cleaning === 'sanitary' ? 1.8 : 1), 'clean', 25);
        if (b.clean) {
          const occupied = s.rt.groups.has(currentBookingId(s, b));
          if (!occupied) consider(b, arrivalToday(s, b) ? ((s.staffPolicy || {}).cleaning === 'sanitary' ? 125 : 185) : ((s.staffPolicy || {}).cleaning === 'sanitary' ? 48 : 78), 'mh', 50);
        }
      }
    } else if (a.role === 'maintenance') {
      for (const b of built(s)) {
        if (b.broken) consider(b, 200, 'repair', 90);
        else if (b.type === 'pool' && b.water < 75) consider(b, (120 - b.water) * ((s.staffPolicy || {}).maintenance === 'preventive' ? 1.2 : 1), 'pool', 35);
        else if (b.cond < 85) consider(b, (100 - b.cond) * ((s.staffPolicy || {}).maintenance === 'preventive' ? 1.7 : 0.85), 'service', 40);
      }
    }
    if (best) {
      const b = byId(s, best.b); bs(s, b).claim = a.id;
      a.task = best; sendTo(s, a, { kind: 'b', id: b.id });
      return;
    }
    // ronde
    const pt = pathTiles(s);
    if (pt.length) { const t = pt[Math.floor(rand(s) * pt.length)]; a.task = { kind: 'patrol' }; sendTo(s, a, { kind: 'tile', x: t % W, y: (t / W) | 0 }); }
  }

  function currentBookingId(s, b) {
    for (const bk of s.bookings) if (bk.unit === b.id && bk.status === 'onsite') return bk.id;
    return -1;
  }
  function arrivalToday(s, b) { return s.bookings.some((bk) => bk.unit === b.id && bk.status === 'booked' && bk.arrive === s.day); }

  function staffArrive(s, a, ok) {
    const t = a.task;
    if (!ok || !t) {
      if (t && t.kind === 'leave') { removeAgent(s, a); s.rt.staffAgents.delete(a.sid); return; }
      if (t && t.b) { const b = byId(s, t.b); if (b && !ok) b.noAccess = true; }
      a.state = 'idle'; a.until = s.minute + 20; a.task = { kind: 'idle' };
      return;
    }
    if (t.kind === 'leave') { removeAgent(s, a); s.rt.staffAgents.delete(a.sid); return; }
    if (t.kind === 'patrol') { a.state = 'idle'; a.until = s.minute + 15; return; }
    if (t.kind === 'desk') { a.state = 'work'; a.workB = t.b; a.until = STAFF.reception.hours[1]; return; }
    if (t.kind === 'stage') { a.state = 'work'; a.workB = t.b; a.until = STAFF.animation.hours[1]; return; }
    a.state = 'work'; a.workB = t.b; a.until = s.minute + t.dur;
  }

  function staffStep(s) {
    for (const st of s.staff) {
      const [h0] = STAFF[st.role].hours;
      if (s.minute === h0 && s.phase === 'season') spawnStaff(s, st, false);
    }
    for (const a of s.rt.agents) {
      if (a.dead || a.kind !== 'staff') continue;
      const [, h1] = STAFF[a.role].hours;
      if ((a.state === 'work' || a.state === 'idle') && s.minute >= a.until) {
        if (a.state === 'work') completeTask(s, a);
        staffNext(s, a);
      } else if (s.minute >= h1 && a.task && a.task.kind !== 'leave' && a.state !== 'work') {
        staffNext(s, a);
      } else if (s.minute >= h1 && a.state === 'work' && (a.role === 'reception' || a.role === 'animation')) {
        staffNext(s, a);
      }
    }
  }

  function completeTask(s, a) {
    const t = a.task; if (!t || !t.b) return;
    const b = byId(s, t.b); if (!b) return;
    if (t.kind === 'clean') { b.dirt = 0; }
    else if (t.kind === 'mh') { b.clean = false; }
    else if (t.kind === 'repair' && b.broken) {
      const cost = Math.min(900, BUILDINGS[b.type].cost * 0.03) + 60;
      money(s, -cost, 'Réparations');
      b.broken = false; b.cond = Math.max(b.cond, 85);
      log(s, `${a.name} a réparé : ${BUILDINGS[b.type].name.toLowerCase()} (${Math.round(cost)} € de pièces).`, 'good');
    } else if (t.kind === 'pool') { b.water = 100; money(s, -35, 'Entretien'); }
    else if (t.kind === 'service') { b.cond = Math.min(100, b.cond + 35); money(s, -25, 'Entretien'); }
  }

  /* ---------- Boucle principale ---------- */
  function tick(s) {
    if (s.phase !== 'season') return;
    const rt = s.rt;
    for (const a of rt.agents) { a.px = a.x; a.py = a.y; }
    // arrivées et départs programmés
    if (s.minute % 5 === 0) {
      for (const bk of s.bookings) {
        if (bk.status === 'booked' && bk.arrive === s.day && s.minute >= bk.arrTime && !rt.groups.has(bk.id)) {
          if (!bk.firm && rand(s) < 0.02) { bk.status = 'noshow'; log(s, `${bk.name} ne s’est pas présenté (acompte conservé).`, 'info'); continue; }
          spawnArrival(s, bk);
        } else if (bk.status === 'onsite' && bk.depart === s.day && s.minute >= bk.depTime) {
          const g = rt.groups.get(bk.id);
          if (!g) { checkOut(s, bk); continue; }
          if (g.phase === 'home' && (g.members.every((m) => !m.aid) || s.minute >= 12 * 60)) startDeparture(s, bk);
        }
      }
    }
    if ((s.day === FIREWORKS[0] || s.day === FIREWORKS[1]) && s.minute === 22 * 60 + 30) fireworks(s);
    if (s.minute % 10 === 0) { guestNeedsStep(s); guestTrips(s); }
    staffStep(s);
    for (const a of rt.agents) {
      if (a.dead) continue;
      if (a.state === 'walk') moveAgent(s, a);
      else if (a.kind === 'guest' && a.state === 'rest' && s.day * DAY + s.minute >= a.until) {
        if (guestChildNeedsEscort(s, a)) {
          a.until = s.day * DAY + s.minute + 5;
        } else {
          const bk = bookingById(s, a.bk);
          sendTo(s, a, bk && bk.status === 'onsite' ? { kind: 'home', id: bk.unit } : { kind: 'exit' });
        }
      }
    }
    serviceStep(s);
    // suiveurs : quand le leader a fini, ils partent avec lui (géré par checkIn) ; nettoyage
    if (s.minute % 30 === 0 || rt.agents.length > 600) rt.agents = rt.agents.filter((a) => !a.dead);
    s.minute++;
    if (s.minute >= DAY) { s.minute = 0; endOfDay(s); }
  }

  function step(s, minutes) { for (let i = 0; i < minutes && s.phase === 'season'; i++) tick(s); }

  function endOfDay(s) {
    // bilan de la nuit écoulée (jour s.day)
    const programResult=runProgram(s);
    void programResult;
    const o = occupancy(s, s.day);
    s.stats.occ.push(o.occ);
    s.stats.peakOcc = Math.max(s.stats.peakOcc, o.occ);
    if (o.occ >= 0.85 && o.total >= 5) s.objectives._occ85 = true;
    // charges
    const persons = s.bookings.filter((b) => b.status === 'onsite').reduce((a, b) => a + b.size, 0);
    const energy = persons * (s.weather.type === 'heat' ? 1.6 : 1.2);
    let upkeep = 18; // assurances, abonnements
    for (const b of built(s)) {
      const def = BUILDINGS[b.type];
      upkeep += def.upkeep;
      // usure
      let wear = def.wear;
      if (def.unit) wear *= s.bookings.some((bk) => bk.unit === b.id && bk.status === 'onsite') ? 1 : 0.2;
      else wear *= 1 + b.uses / 60;
      b.cond = Math.max(0, b.cond - wear * (s.weather.type === 'storm' ? 2 : 1));
      b.uses = 0;
      if (b.type === 'pool') b.water = Math.max(0, b.water - (s.weather.type === 'heat' ? 12 : 7));
      // pannes
      if (!b.broken) {
        const p = 0.0015 + Math.pow((100 - b.cond) / 100, 2) * 0.12;
        if (rand(s) < p * (s.weather.type === 'storm' ? 2.5 : 1)) {
          b.broken = true; b.brokenDay = s.day; s.stats.breakdowns++;
          log(s, `Panne : ${BUILDINGS[b.type].name.toLowerCase()}${b.num ? ' n°' + b.num : ''} hors service !`, 'bad');
        }
      } else if (s.day - b.brokenDay >= 1 && !s.staff.some((x) => x.role === 'maintenance')) {
        const cost = (Math.min(900, BUILDINGS[b.type].cost * 0.03) + 60) * 2.5;
        money(s, -cost, 'Réparations');
        b.broken = false; b.cond = 80;
        log(s, `Dépanneur extérieur appelé : ${Math.round(cost)} € (embauchez un technicien de maintenance !).`, 'warn');
      }
    }
    money(s, -energy, 'Eau & énergie');
    if (s.rt.showDay === s.day) { s.totals.shows = (s.totals.shows || 0) + 1; s.stats.shows = (s.stats.shows || 0) + 1; }
    loanDaily(s);
    if (hasMod(s, 'leak')) money(s, -70, 'Eau & énergie');
    money(s, -upkeep, 'Charges fixes');
    // salaires (journaliers, charges comprises)
    let sal = 0;
    for (const st of s.staff) sal += st.wage * D.EMPLOYER_RATE / 30;
    money(s, -sal, 'Salaires');
    // sans personnel : le directeur fait le minimum le soir, des prestataires passent
    if (!s.staff.some((x) => x.role === 'cleaning')) {
      let n = 2;
      for (const b of built(s)) { if (b.type === 'sanitary') b.dirt = Math.max(0, b.dirt - 60); if (b.clean && n > 0) { b.clean = false; n--; } }
    }
    if (!s.staff.some((x) => x.role === 'maintenance')) {
      for (const b of ofType(s, 'pool')) if (b.water < 60) { b.water = Math.min(100, b.water + 35); money(s, -70, 'Entretien'); }
    }
    // satisfaction quotidienne des présents
    const hasPool = services(s, 'pool').length > 0, hasShop = services(s, 'shop').length > 0, hasPlay = services(s, 'playground').length > 0;
    for (const bk of s.bookings) {
      if (bk.status !== 'onsite') continue;
      const unit = byId(s, bk.unit);
      let d = 0;
      const wx = s.weather.type;
      if (bk.type === 'tent') { d += wx === 'rain' ? -4 : wx === 'storm' ? -7 : 0; if (wx === 'rain' || wx === 'storm') note(bk, 'rain'); }
      else d += wx === 'rain' ? -1.5 : wx === 'storm' ? -3 : 0;
      if (wx === 'heat') { d += services(s, 'pool').length ? 2 : (hasMod(s, 'mist') ? -1.5 : -4); if (!services(s, 'pool').length) note(bk, 'heat'); }
      if (wx === 'sun') d += 1;
      if (unit && unit.broken) { d -= 8; note(bk, 'broken'); }
      if (hasMod(s, 'noise')) { d -= 3; note(bk, 'noise'); }
      if (bk.kids && !hasPlay) d -= 1;
      if (!hasPool) d -= bk.profile === 'family' ? 1.5 : bk.profile === 'couple' ? 0.6 : 0;
      if (!hasShop) d -= bk.profile === 'nomad' ? 1.5 : 0.7;
      const mood = guestMood(s, bk);
      s.stats.guestMood = s.stats.guestMood || [];
      s.stats.guestMood.push(Math.round(mood));
      if (s.stats.guestMood.length > 200) s.stats.guestMood.shift();
      if (mood < 35) { d -= 2; note(bk, 'needs', 0.5); }
      else if (mood >= 78) d += 0.7;
      bk.sat = clamp(bk.sat + d, 0, 100);
    }
    // jour suivant
    s.day++;
    if (s.day >= D.SEASON_DAYS) return endSeason(s);
    s.weather = s.forecast.shift();
    s.forecast.push(genWeather(s, s.day + 3));
    // annulations
    for (const bk of s.bookings) {
      if (bk.status === 'booked' && bk.arrive > s.day && rand(s) < 0.003) { bk.status = 'cancelled'; }
      if (bk.status === 'onsite' && bk.depart < s.day) { checkOut(s, bk); s.rt.groups.delete(bk.id); }
    }
    // chantiers
    for (const b of s.buildings) if (b.progress > 0) { b.progress--; if (b.progress === 0) { log(s, `Chantier terminé : ${BUILDINGS[b.type].name.toLowerCase()}${b.num ? ' n°' + b.num : ''}.`, 'good'); mapChanged(s); } }
    if (s.event && s.day - s.event.day >= 2) { const ev = EVENTS.find((e) => e.id === s.event.id); resolveEvent(s, ev ? ev.choices.length - 1 : 0); }
    s.mods = (s.mods || []).filter((m) => m.until >= s.day);
    generateDemand(s, s.day, s.day);
    rollEvent(s);
    // purge
    if (s.bookings.length > 900) s.bookings = s.bookings.filter((b) => !((b.status === 'done' || b.status === 'cancelled' || b.status === 'noshow') && b.depart < s.day - 14));
    s.stars = classement(s).stars;
    checkObjectives(s);
    if (s.weather.type === 'storm') log(s, 'Orage aujourd’hui : piscine fermée, tentes à l’épreuve.', 'warn');
    if (s.weather.type === 'heat') log(s, `Canicule (${s.weather.temp} °C) : la piscine va être prise d’assaut.`, 'warn');
  }


  /* ---------- Animations ---------- */
  function stageWindow(s) {
    const m = s.minute;
    if (m >= 15 * 60 && m < 17 * 60) return { to: 17 * 60, show: false };
    if (m >= 20 * 60 && m < 22 * 60) return { to: 22 * 60, show: true };
    return null;
  }
  function stageLive(s, b) {
    if (!b || b.broken || b.progress > 0 || b.ax < 0) return false;
    const wx = s.weather.type;
    if ((wx === 'rain' || wx === 'storm') && b.level !== 2) return false;
    if (!stageWindow(s)) return false;
    for (const a of s.rt.agents) if (!a.dead && a.kind === 'staff' && a.role === 'animation' && a.state === 'work' && a.workB === b.id) return true;
    return false;
  }

  /* ---------- Emprunt bancaire ---------- */
  const LOAN_RATE = 0.045, LOAN_DAYS = 300;
  function loanCapacity(s) {
    const value = s.buildings.reduce((a, b) => a + BUILDINGS[b.type].cost, 0);
    const max = Math.round((20000 + value * 0.5) / 1000) * 1000;
    return Math.max(0, max - (s.loan ? Math.ceil(s.loan.left) : 0));
  }
  function borrow(s, amount) {
    amount = Math.round(amount);
    if (!(amount > 0)) return { ok: false, why: 'Montant invalide' };
    if (amount > loanCapacity(s)) return { ok: false, why: 'La banque refuse : capacité d’emprunt dépassée' };
    const left = (s.loan ? s.loan.left : 0) + amount;
    s.loan = { left: r2(left), perDay: r2(left / LOAN_DAYS), rate: LOAN_RATE, since: s.year * 1000 + s.day };
    money(s, amount, FINANCING);
    log(s, `Emprunt accordé : ${amount.toLocaleString('fr-FR')} € à ${(LOAN_RATE * 100).toFixed(1)} %, remboursé chaque jour d’ouverture.`, 'info');
    return { ok: true };
  }
  function repayLoan(s) {
    if (!s.loan) return { ok: false, why: 'Aucun emprunt' };
    const fee = r2(s.loan.left * 0.01);
    if (s.fin.cash < s.loan.left + fee) return { ok: false, why: 'Trésorerie insuffisante' };
    money(s, -s.loan.left, FINANCING); money(s, -fee, 'Intérêts d’emprunt');
    s.loan = null;
    log(s, 'Emprunt remboursé par anticipation.', 'good');
    return { ok: true, fee };
  }
  function loanDaily(s) {
    const L = s.loan; if (!L) return;
    const interest = r2(L.left * L.rate / D.SEASON_DAYS);
    const princ = r2(Math.min(L.perDay, L.left));
    money(s, -interest, 'Intérêts d’emprunt');
    money(s, -princ, FINANCING);
    L.left = r2(L.left - princ);
    if (L.left <= 0.01) { s.loan = null; log(s, 'Dernière échéance payée : emprunt soldé !', 'good'); }
  }


  /* ---------- Restauration ---------- */
  function snackOpen(s, b) {
    if (!b || b.broken || b.progress > 0 || b.ax < 0) return false;
    const m = s.minute;
    return (m >= 11 * 60 + 30 && m < 14 * 60) || (m >= 18 * 60 + 30 && m < 21 * 60 + 30);
  }

  /* ---------- Feux d'artifice (14 juillet, 15 août) ---------- */
  const FIREWORKS = [104, 136];
  function fireworks(s) {
    const wx = s.weather.type;
    if (wx === 'rain' || wx === 'storm') { log(s, 'Feu d’artifice annulé à cause de la météo… dommage !', 'warn'); return; }
    let n = 0;
    for (const bk of s.bookings) if (bk.status === 'onsite') { bk.sat = clamp(bk.sat + 4, 0, 100); note(bk, 'fireworks'); n++; }
    s.rt.fireworks = { day: s.day };
    log(s, `🎆 Feu d’artifice sur le lac ! ${n} familles émerveillées.`, 'goal');
  }

  /* ---------- Améliorations (niveau 2) ---------- */
  function canUpgrade(s, b) {
    const up = BUILDINGS[b.type].upgrade;
    if (!up) return { ok: false, why: 'Pas d’amélioration possible' };
    if (b.level === 2) return { ok: false, why: 'Déjà amélioré' };
    if (b.progress > 0) return { ok: false, why: 'Chantier en cours' };
    if (s.fin.cash < up.cost) return { ok: false, why: 'Trésorerie insuffisante', cost: up.cost };
    if (s.phase === 'season') {
      if (BUILDINGS[b.type].unit && s.bookings.some((bk) => bk.unit === b.id && (bk.status === 'onsite' || (bk.status === 'booked' && bk.arrive < s.day + up.build + 1))))
        return { ok: false, why: `Occupé ou réservé dans les ${up.build + 1} prochains jours` };
      const st = s.rt.bstate.get(b.id);
      if (st && (st.users.length || st.queue.length)) return { ok: false, why: 'Des clients l’utilisent en ce moment' };
    }
    return { ok: true, cost: up.cost, up };
  }
  function upgrade(s, id) {
    const b = byId(s, id); if (!b) return { ok: false, why: 'Introuvable' };
    const c = canUpgrade(s, b); if (!c.ok) return c;
    money(s, -c.cost, 'Constructions');
    b.level = 2; b.cond = 100; b.broken = false;
    b.progress = s.phase === 'winter' ? 0 : c.up.build; b.buildTotal = c.up.build;
    log(s, `Travaux d’amélioration : ${c.up.name}${b.num ? ' n°' + b.num : ''}${b.progress ? ` (${b.progress} j)` : ''}.`, 'good');
    mapChanged(s); checkObjectives(s);
    return { ok: true };
  }
  const displayName = (b) => (b.level === 2 && BUILDINGS[b.type].upgrade ? BUILDINGS[b.type].upgrade.name : BUILDINGS[b.type].name);

  /* ---------- Modificateurs temporaires ---------- */
  function addMod(s, kind, days, mult = 1, label = '') { s.mods.push({ kind, mult, from: s.day, until: s.day + days - 1, label }); }
  function hasMod(s, kind) { return (s.mods || []).some((m) => m.kind === kind && m.from <= s.day && m.until >= s.day); }
  function demandMod(s, d) {
    let f = 1;
    for (const m of s.mods || []) if (m.kind === 'demand' && m.from <= d && m.until >= d) f *= m.mult;
    return f;
  }

  /* ---------- Avis clients ---------- */
  const PRAISE = {
    premium: 'Le mobil-home premium avec spa : un rêve !', slide: 'Les enfants n’ont pas quitté le toboggan !', pool: 'Piscine impeccable, on y passait nos après-midi.',
    show: 'Les soirées spectacle étaient géniales.', fireworks: 'Le feu d’artifice sur le lac, inoubliable.', clean: 'Sanitaires toujours propres, bravo à l’équipe.',
    welcome: 'Accueil aux petits soins dès l’arrivée.', beauty: 'Un cadre fleuri et verdoyant, très reposant.', food: 'Le snack-bar est top, pizzas excellentes.',
    play: 'L’aire de jeux a fait le bonheur des petits.', cheap: 'Excellent rapport qualité-prix.',
    minigolf: 'On a fait de belles parties de mini-golf entre amis !',
    multisport: 'Le terrain multisports a occupé toute la famille !',
    bikes: 'La location de vélos a été parfaite pour découvrir le coin.',
    laundry: 'La laverie sur place nous a bien dépannés.',
    petanque: 'Parties de pétanque entre voisins, excellente ambiance !',
    cinema: 'Le cinéma sous les étoiles, quel souvenir !',
    bakery: 'Le café et les croissants du matin : un vrai plaisir.',
    spa: 'L’espace bien-être nous a ressourcés.'
  };
  const COMPLAINT = {
    mhdirty: 'Mobil-home sale à notre arrivée, inadmissible.', dirty: 'Sanitaires sales, ça gâche tout.', queue: 'Des files d’attente interminables.',
    price: 'Beaucoup trop cher pour ce que c’est.', rain: 'Trempés sous la tente, rien pour s’abriter.', heat: 'Fournaise et pas de piscine pour se rafraîchir.',
    broken: 'Équipement en panne pendant notre séjour.', nosan: 'Pas assez de sanitaires.', greenpool: 'Eau de la piscine douteuse…', noise: 'Bruyant jusque tard le soir.',
    needs: 'Peu de repos et de confort pendant notre séjour, nous étions fatigués.'
  };
  function writeReview(s, bk, rating) {
    const n = bk.n || {};
    const WGT = { clean: 0.15, pool: 0.8, slide: 1.5, premium: 3, show: 1.5, fireworks: 5, welcome: 2, beauty: 1, food: 1, play: 1, cheap: 2, mhdirty: 3, price: 2, broken: 1.5 };
    const top = (dict) => Object.keys(dict).filter((k) => n[k]).sort((a, b) => n[b] * (WGT[b] || 1) - n[a] * (WGT[a] || 1))[0];
    const bad = top(COMPLAINT), good = top(PRAISE);
    let text;
    if (rating <= 2.5) text = bad ? COMPLAINT[bad] : 'Séjour décevant, on ne reviendra pas.';
    else if (rating <= 3.5) text = (good ? PRAISE[good] + ' ' : 'Correct sans plus. ') + (bad ? 'Mais : ' + COMPLAINT[bad].charAt(0).toLowerCase() + COMPLAINT[bad].slice(1) : '');
    else text = good ? PRAISE[good] : 'Des vacances formidables, on reviendra !';
    return { name: bk.name, profile: bk.profile, rating, text: text.trim(), y: s.year, d: s.day, type: bk.type, nights: bk.nights };
  }

  /* ---------- Événements : décisions de directeur ---------- */
  const EVENTS = [
    { id: 'inspection', title: 'Contrôle sanitaire', icon: '🧑‍⚕️', weight: 1, min: 10,
      text: () => 'Un inspecteur de l’ARS se présente à l’accueil pour contrôler vos sanitaires et la piscine.',
      choices: [
        { label: 'Le recevoir tout de suite', go: (s) => {
          const san = ofType(s, 'sanitary'); const worst = san.reduce((m, b) => Math.max(m, b.dirt), 0);
          const pool = ofType(s, 'pool').some((b) => b.water < 50);
          if (worst > 55 || pool) { money(s, -1000, 'Amendes'); s.reputation = clamp(s.reputation - 4, 0, 100); return 'Rapport défavorable : 1 000 € d’amende et la presse locale en parle (−4 réputation).'; }
          s.reputation = clamp(s.reputation + 3, 0, 100); return 'Rapport exemplaire ! Le label « Hygiène irréprochable » vous vaut +3 de réputation.'; } },
        { label: 'Négocier un report (frais de dossier 300 €)', cost: 300, go: (s) => { money(s, -300, 'Amendes'); s.nextEventDay = s.day + 2; s.forceEvent = 'inspection'; return 'L’inspecteur repassera dans deux jours. Profitez-en pour tout nettoyer !'; } }
      ] },
    { id: 'bikers', title: 'Une bande de motards', icon: '🏍️', weight: 1, min: 20,
      text: () => 'Douze motards en road-trip demandent des emplacements pour deux nuits, à partir de ce soir. Sympathiques… mais bruyants.',
      choices: [
        { label: 'Les accueillir', go: (s) => {
          let ok = 0;
          for (let i = 0; i < 6; i++) { const r = requestBooking(s, { profile: 'nomad', type: rand(s) < 0.5 ? 'tent' : 'caravan', arrive: s.day, nights: 2, size: 2, force: true, arrTime: 17 * 60 + i * 5 }); if (r.booking) ok++; }
          if (ok) addMod(s, 'noise', 2);
          return ok ? `${ok} emplacements loués. Les voisins risquent de râler un peu…` : 'Plus aucune place libre : ils repartent sans rancune.'; } },
        { label: 'Refuser poliment', go: () => 'Ils repartent vers le camping voisin.' }
      ] },
    { id: 'influencer', title: 'Une influenceuse voyage', icon: '📸', weight: 0.8, min: 15, when: (s) => ofType(s, 'mobilhome').length > 0,
      text: () => '« Lou en Vadrouille » (480 000 abonnés) propose un séjour gratuit de 3 nuits en mobil-home contre des stories.',
      choices: [
        { label: 'Offrir le séjour', go: (s) => {
          const r = requestBooking(s, { profile: 'couple', type: 'mobilhome', arrive: s.day + 1, nights: 3, size: 2, force: true, name: 'Lou en Vadrouille' });
          if (!r.booking) return 'Aucun mobil-home libre dans les prochains jours : occasion manquée.';
          money(s, -r.booking.deposit, 'Acomptes'); r.booking.total = 0; r.booking.paid = 0; r.booking.influencer = true;
          return 'Réservation offerte. Son avis comptera triple pour la réputation… soignez-la !'; } },
        { label: 'Décliner', go: () => 'Elle choisira un autre camping.' }
      ] },
    { id: 'tour', title: 'Tour-opérateur néerlandais', icon: '🇳🇱', weight: 0.7, min: 10, when: (s) => s.day < 95 && ofType(s, 'mobilhome').length >= 2,
      text: (s) => `Zon & Vakantie propose de réserver d’un coup vos mobil-homes libres pour la 1re quinzaine d’août, à −20 % sur votre tarif (${Math.round(s.prices.mobilhome * 0.8)} €/nuit).`,
      choices: [
        { label: 'Signer le contrat', go: (s) => {
          let n = 0;
          for (const b of ofType(s, 'mobilhome')) {
            for (const a of [122, 129]) { if (isBooked(s, b.id, a, a + 7)) continue; const save = s.prices.mobilhome; s.prices.mobilhome = Math.round(save * 0.8);
              const r = requestBooking(s, { profile: 'family', type: 'mobilhome', arrive: a, nights: 7, size: 4, force: true, name: 'Zon & Vakantie' }); s.prices.mobilhome = save;
              if (r.booking) { if (r.booking.unit !== b.id) { /* attribué ailleurs : accepté quand même */ } n++; } }
            if (n >= Math.ceil(ofType(s, 'mobilhome').length * 0.6) * 2) break;
          }
          return n ? `${n} semaines vendues d’avance. Trésorerie sécurisée, marge réduite.` : 'Tout est déjà réservé en août !'; } },
        { label: 'Garder la main sur mes prix', go: () => 'Vous comptez sur la clientèle individuelle.' }
      ] },
    { id: 'radio', title: 'Campagne radio', icon: '📻', weight: 1, min: 0, when: (s) => s.day < 150,
      text: () => 'France Bleu vous propose une campagne de 3 semaines : « Le camping où il fait bon vivre ». Coût : 2 500 €.',
      choices: [
        { label: 'Lancer la campagne (2 500 €)', cost: 2500, go: (s) => { money(s, -2500, 'Publicité'); addMod(s, 'demand', 21, 1.3, 'Campagne radio'); return 'Les demandes de réservation vont grimper de 30 % pendant 3 semaines.'; } },
        { label: 'Pas cette fois', go: () => 'Le bouche-à-oreille suffira.' }
      ] },
    { id: 'competitor', title: 'Un concurrent s’installe', icon: '🏕️', weight: 0.6, min: 20,
      text: () => 'Le « Domaine des Pins » ouvre à 3 km avec des prix d’appel agressifs. Vos demandes vont baisser.',
      choices: [
        { label: 'Riposter : promo en ligne (1 800 €)', cost: 1800, go: (s) => { money(s, -1800, 'Publicité'); addMod(s, 'demand', 15, 0.95, 'Concurrence'); return 'Votre campagne limite la casse (−5 % pendant 15 jours).'; } },
        { label: 'Laisser passer l’orage', go: (s) => { addMod(s, 'demand', 20, 0.8, 'Concurrence'); return 'Demandes en baisse de 20 % pendant 20 jours.'; } }
      ] },
    { id: 'leak', title: 'Fuite d’eau', icon: '💧', weight: 0.8, min: 5,
      text: () => 'Une canalisation enterrée fuit près des sanitaires. Le compteur s’affole.',
      choices: [
        { label: 'Plombier en urgence (900 €)', cost: 900, go: (s) => { money(s, -900, 'Réparations'); return 'Fuite réparée dans la journée.'; } },
        { label: 'Attendre la fin de saison', go: (s) => { addMod(s, 'leak', 25); return 'La fuite vous coûtera ~70 €/jour pendant près d’un mois…'; } }
      ] },
    { id: 'raise', title: 'Demande d’augmentation', icon: '💬', weight: 0.8, min: 0, when: (s) => s.staff.length > 0,
      init: (s) => ({ sid: pick(s, s.staff).id }),
      text: (s, d) => { const st = s.staff.find((x) => x.id === d.sid); return `${st ? st.name : 'Un employé'} vous demande une augmentation de 150 €/mois : « Avec l’été qu’on vit, je le mérite ! »`; },
      choices: [
        { label: 'Accepter (+150 €/mois)', go: (s, d) => { const st = s.staff.find((x) => x.id === d.sid); if (st) { st.wage += 150; st.happy = true; } return 'Motivation au top : l’équipe apprécie votre geste.'; } },
        { label: 'Refuser', go: (s, d) => { const st = s.staff.find((x) => x.id === d.sid); if (st && rand(s) < 0.4) { fire(s, st.id); return `${st.name} démissionne dans la foulée…`; } return 'Il fait la moue mais reste.'; } }
      ] },
    { id: 'heatwave', title: 'Canicule annoncée', icon: '🌡️', weight: 1, min: 40, when: (s) => s.forecast.some((f) => f.type === 'heat') && !hasMod(s, 'mist'),
      text: () => 'Météo-France annonce une vague de chaleur. Un fournisseur propose d’installer des brumisateurs dans les allées (1 400 €, pour le reste de la saison).',
      choices: [
        { label: 'Installer les brumisateurs', cost: 1400, go: (s) => { money(s, -1400, 'Constructions'); addMod(s, 'mist', D.SEASON_DAYS); return 'Les vacanciers souffriront beaucoup moins de la chaleur.'; } },
        { label: 'Non merci', go: () => 'Espérons que la piscine suffise.' }
      ] },
    { id: 'wedding', title: 'Mariage au camping', icon: '💍', weight: 0.6, min: 30, when: (s) => services(s, 'stage').length > 0,
      text: () => 'Les Lambert veulent privatiser votre scène samedi soir pour leur mariage : 2 000 € de location.',
      choices: [
        { label: 'Accepter (+2 000 €)', go: (s) => { money(s, 2000, 'Ventes'); addMod(s, 'noise', 1); return 'Belle fête ! Les autres vacanciers trouvent la soirée un peu bruyante.'; } },
        { label: 'Garder la soirée pour mes clients', go: () => 'Le spectacle habituel aura lieu.' }
      ] },
    { id: 'festival', title: 'Festival au village', icon: '🎸', weight: 0.7, min: 30, when: (s) => s.day < 170,
      text: () => 'Le festival « Rock au Lac » a lieu dans 5 jours. Proposer une navette gratuite pour vos clients ? (500 €)',
      choices: [
        { label: 'Affréter la navette (500 €)', cost: 500, go: (s) => { money(s, -500, 'Publicité'); addMod(s, 'demand', 8, 1.35, 'Festival'); s.reputation = clamp(s.reputation + 2, 0, 100); return 'Afflux de festivaliers attendu, et une belle image (+2 réputation).'; } },
        { label: 'Ne rien faire', go: (s) => { addMod(s, 'demand', 8, 1.15, 'Festival'); return 'Quelques festivaliers viendront quand même.'; } }
      ] },
    { id: 'grant', title: 'Subvention de la Région', icon: '🏛️', weight: 0.5, min: 0, when: (s) => avgBeauty(s) < 9,
      text: () => 'La Région finance la moitié d’un plan de fleurissement « Village nature » : 25 massifs et 10 arbres plantés, 1 500 € à votre charge.',
      choices: [
        { label: 'Accepter (1 500 €)', cost: 1500, go: (s) => { money(s, -1500, 'Paysagisme'); return `${autoPlant(s)} plantations réalisées autour des hébergements.`; } },
        { label: 'Refuser', go: () => 'Dossier classé.' }
      ] }
  ];

  function autoPlant(s) {
    let n = 0;
    const tiles = [];
    for (const b of units(s)) for (let j = b.y - 1; j <= b.y + b.h; j++) for (let i = b.x - 1; i <= b.x + b.w; i++) {
      if (!inMap(i, j) || i < 2) continue;
      const k = idx(i, j);
      if (s.tiles[k] === TERRAIN.GRASS && !occupancyGrid(s)[k] && !s.deco[k]) tiles.push(k);
    }
    for (let t = 0; t < 35 && tiles.length; t++) {
      const k = tiles.splice(Math.floor(rand(s) * tiles.length), 1)[0];
      s.deco[k] = t < 25 ? DECO.FLOWERS : DECO.TREE; n++;
    }
    return n;
  }

  function rollEvent(s) {
    if (s.event || s.day < s.nextEventDay || s.day > D.SEASON_DAYS - 5) return;
    let pool = EVENTS.filter((e) => s.day >= e.min && (!e.when || e.when(s)) && (s.eventLog || []).filter((l) => l.id === e.id && l.y === s.year).length < (e.id === 'inspection' ? 2 : 1));
    if (s.forceEvent) { pool = EVENTS.filter((e) => e.id === s.forceEvent); s.forceEvent = null; }
    if (!pool.length) return;
    const w = {}; pool.forEach((e) => (w[e.id] = e.weight));
    const chosen = wpick(s, w);
    const ev = EVENTS.find((e) => e.id === chosen);
    s.event = { id: ev.id, day: s.day, data: ev.init ? ev.init(s) : {} };
    s.nextEventDay = s.day + rint(s, 6, 11);
    if (s.rt) s.rt.events.push({ type: 'decision' });
  }
  function eventView(s) {
    if (!s.event) return null;
    const ev = EVENTS.find((e) => e.id === s.event.id); if (!ev) return null;
    return { id: ev.id, title: ev.title, icon: ev.icon, text: ev.text(s, s.event.data), choices: ev.choices.map((c) => ({ label: c.label, afford: !c.cost || s.fin.cash >= c.cost })) };
  }
  function resolveEvent(s, i) {
    if (!s.event) return null;
    const ev = EVENTS.find((e) => e.id === s.event.id);
    const c = ev && ev.choices[i]; if (!c) return null;
    if (c.cost && s.fin.cash < c.cost) return { ok: false, text: 'Trésorerie insuffisante pour ce choix.' };
    const data = s.event.data; s.event = null;
    const text = c.go(s, data);
    s.eventLog = (s.eventLog || []).concat({ id: ev.id, y: s.year, d: s.day, choice: i }).slice(-40);
    log(s, `${ev.icon} ${ev.title} — ${text}`, 'info');
    return { ok: true, text };
  }

  /* ---------- Saisons ---------- */
  function endSeason(s) {
    s.day = D.SEASON_DAYS - 1; s.minute = 23 * 60 + 59;
    for (const bk of s.bookings) {
      if (bk.status === 'onsite') checkOut(s, bk);
      if (bk.status === 'booked') bk.status = 'cancelled';
    }
    s.rt.agents = []; s.rt.agentMap.clear(); s.rt.groups.clear(); s.rt.staffAgents.clear(); s.rt.bstate.clear();
    const st = s.stats;
    const inc = {}, exp = {};
    for (const k in s.fin.season) { if (k === FINANCING) continue; (s.fin.season[k] >= 0 && INCOME.has(k) ? inc : exp)[k] = s.fin.season[k]; }
    const totalInc = Object.values(inc).reduce((a, b) => a + b, 0);
    const totalExp = Object.values(exp).reduce((a, b) => a + b, 0);
    const result = r2(totalInc + totalExp);
    const invest = r2(-((s.fin.season['Constructions'] || 0) + (s.fin.season['Paysagisme'] || 0)));
    const operating = r2(result + invest);
    const avgRating = st.ratings.length ? st.ratings.reduce((a, b) => a + b, 0) / st.ratings.length : 0;
    const avgOcc = st.occ.length ? st.occ.reduce((a, b) => a + b, 0) / st.occ.length : 0;
    const peakDays = st.occ.slice(91, 153);
    const report = {
      year: s.year, groups: st.groups, nights: st.nights, persons: st.persons, inc, exp, totalInc: r2(totalInc), totalExp: r2(totalExp), result,
      operating, invest, avgRating: Math.round(avgRating * 10) / 10, avgOcc, peakOcc: st.peakOcc, summerOcc: peakDays.length ? peakDays.reduce((a, b) => a + b, 0) / peakDays.length : 0,
      lostFull: st.lostFull, lostPrice: st.lostPrice, requests: st.requests, breakdowns: st.breakdowns,
      guestTrips: st.guestTrips || 0, escortedTrips: st.escortedTrips || 0,
      serviceInterventions: st.serviceInterventions || 0, serviceExpenses: st.serviceExpenses || 0,
      leisureRevenue: st.leisureRevenue || 0, leisureVisits: Object.assign({}, st.leisureVisits || {}),
      marketingSpent: st.marketingSpent || 0, marketingCampaigns: st.marketingCampaigns || 0,
      programEvents: st.programEvents || 0, programCost: st.programCost || 0,
      guestActivities: Object.assign({}, st.guestActivities || {}),
      avgGuestMood: st.guestMood && st.guestMood.length ? Math.round(st.guestMood.reduce((a,b)=>a+b,0)/st.guestMood.length) : 0,
      repStart: st.repStart ?? 42, repEnd: Math.round(s.reputation), stars: s.stars, units: units(s).length, cash: s.fin.cash,
      objectives: Object.keys(s.objectives).filter((k) => !k.startsWith('_') && s.objectives[k] === s.year)
    };
    if (operating > 0) s.objectives._profit = true;
    s.reports.push(report);
    s.totals.seasons++;
    s.lastTeam = s.staff.map((x) => ({ role: x.role, name: x.name }));
    if (s.staff.length) log(s, `Fin des contrats saisonniers (${s.staff.length} personnes).`, 'info');
    s.staff = [];
    s.phase = 'winter';
    s.bookings = [];
    s.event = null; s.mods = [];
    checkObjectives(s);
    log(s, `Saison ${s.year} terminée : résultat ${result >= 0 ? '+' : ''}${Math.round(result).toLocaleString('fr-FR')} €.`, result >= 0 ? 'good' : 'bad');
    if (s.rt) s.rt.events.push({ type: 'season-end', report });
    return report;
  }

  function startSeason(s) {
    if (s.phase !== 'winter') return false;
    const value = s.buildings.reduce((a, b) => a + BUILDINGS[b.type].cost, 0);
    const winter = 3000 + value * 0.01;
    s.year++; s.day = 0; s.minute = 7 * 60;
    s.fin.season = {};
    s.campaign = null;
    money(s, -winter, 'Hivernage & taxes');
    for (const b of s.buildings) { b.progress = 0; b.water = 100; b.dirt = 0; b.clean = false; b.cond = Math.min(100, b.cond + 15); b.broken = false; }
    s.reputation = s.reputation + (50 - s.reputation) * 0.1;
    s.stats = newSeasonStats(); s.stats.repStart = Math.round(s.reputation);
    s.weather = genWeather(s, 0); s.forecast = [genWeather(s, 1), genWeather(s, 2), genWeather(s, 3)];
    s.phase = 'season';
    s.nextEventDay = 4;
    initRuntime(s);
    mapChanged(s);
    s.stars = classement(s).stars;
    pregenerateBookings(s);
    log(s, `Ouverture de la saison ${s.year} ! Frais d’hivernage : ${Math.round(winter).toLocaleString('fr-FR')} €.`, 'good');
    return true;
  }

  /* ---------- Objectifs ---------- */
  function checkObjectives(s) {
    const roles = new Set(s.staff.map((x) => x.role));
    const done = {
      first10: s.totals.groups >= 10,
      pool: services(s, 'pool').length > 0,
      staff3: s.staff.length >= 3 && ['reception', 'cleaning', 'maintenance'].every((role) => roles.has(role)),
      units20: units(s).length >= 20,
      rep60: s.reputation >= 60,
      stars3: s.stars >= 3,
      occ85: !!s.objectives._occ85,
      guests250: s.totals.groups >= 3000,
      profit: !!s.objectives._profit,
      mh8: ofType(s, 'mobilhome').length >= 8,
      shows20: (s.totals.shows || 0) >= 20,
      premium4: s.buildings.filter((b) => b.type === 'mobilhome' && b.level === 2 && b.progress <= 0).length >= 4,
      rating45: s.stats.ratings.length >= 40 && s.stats.ratings.reduce((a, b) => a + b, 0) / s.stats.ratings.length >= 4.2,
      stars4: s.stars >= 4,
      rep85: s.reputation >= 85
    };
    for (const o of D.OBJECTIVES) {
      if (s.objectives[o.id] || !done[o.id]) continue;
      s.objectives[o.id] = s.year;
      money(s, o.reward, 'Primes');
      log(s, `🏆 Objectif atteint : « ${o.title} » — prime de ${o.reward.toLocaleString('fr-FR')} €.`, 'goal');
    }
  }

  /* ---------- Construction ---------- */
  function canPlace(s, type, x, y) {
    const def = BUILDINGS[type];
    if (!def) return { ok: false, why: 'Inconnu' };
    if (x < 2 || y < 0 || x + def.w > W || y + def.h > H) return { ok: false, why: 'Hors du terrain' };
    if (def.maxCount && s.buildings.filter((b) => b.type === type).length >= def.maxCount) return { ok: false, why: 'Un seul accueil possible' };
    const g = occupancyGrid(s);
    let trees = 0;
    for (let j = y; j < y + def.h; j++) for (let i = x; i < x + def.w; i++) {
      const t = s.tiles[idx(i, j)];
      if (t === TERRAIN.WATER || t === TERRAIN.ROAD) return { ok: false, why: 'Terrain inconstructible' };
      if (t === TERRAIN.PATH) return { ok: false, why: 'Un chemin passe ici' };
      if (g[idx(i, j)]) return { ok: false, why: 'Emplacement occupé' };
      if (s.deco[idx(i, j)]) trees++;
    }
    const cost = def.cost + trees * 20;
    if (s.fin.cash < cost) return { ok: false, why: 'Trésorerie insuffisante', cost };
    // accès : au moins une case de chemin adjacente
    let access = false;
    for (let j = y - 1; j <= y + def.h; j++) for (let i = x - 1; i <= x + def.w; i++) {
      const edge = (i === x - 1 || i === x + def.w) !== (j === y - 1 || j === y + def.h);
      if (edge && inMap(i, j) && s.tiles[idx(i, j)] === TERRAIN.PATH) access = true;
    }
    return { ok: true, cost, access };
  }

  function build(s, type, x, y) {
    const c = canPlace(s, type, x, y);
    if (!c.ok) return c;
    money(s, -c.cost, 'Constructions');
    const b = addBuilding(s, type, x, y);
    if (s.phase === 'winter') b.progress = 0;
    mapChanged(s);
    checkObjectives(s);
    return { ok: true, building: b, access: c.access };
  }

  function buildPath(s, x, y) {
    if (!inMap(x, y) || x < 2) return { ok: false };
    const i = idx(x, y), t = s.tiles[i];
    if (t === TERRAIN.PATH || t === TERRAIN.WATER || t === TERRAIN.ROAD) return { ok: false };
    if (occupancyGrid(s)[i]) return { ok: false, why: 'Bâtiment' };
    const cost = D.PATH_COST + (s.deco[i] ? 20 : 0);
    if (s.fin.cash < cost) return { ok: false, why: 'Trésorerie insuffisante' };
    money(s, -cost, 'Constructions');
    setPath(s, x, y);
    mapChanged(s);
    return { ok: true, cost };
  }

  function placeDeco(s, tool, x, y) {
    const T = D.DECOR_TOOLS[tool];
    if (!T || !inMap(x, y) || x < 2) return { ok: false };
    const i = idx(x, y), t = s.tiles[i];
    if (t !== TERRAIN.GRASS && t !== TERRAIN.SAND) return { ok: false };
    if (occupancyGrid(s)[i] || s.deco[i] === T.deco) return { ok: false };
    if (s.fin.cash < T.cost) return { ok: false, why: 'Trésorerie insuffisante' };
    money(s, -T.cost, 'Paysagisme');
    s.deco[i] = T.deco;
    return { ok: true };
  }

  function buildingAt(s, x, y) { if (!inMap(x, y)) return null; const id = occupancyGrid(s)[idx(x, y)]; return id ? byId(s, id) : null; }

  function hasActiveBookings(s, b) { return s.bookings.some((bk) => bk.unit === b.id && (bk.status === 'booked' || bk.status === 'onsite')); }

  function demolish(s, x, y) {
    const b = buildingAt(s, x, y);
    if (b) {
      if (BUILDINGS[b.type].unit && hasActiveBookings(s, b)) return { ok: false, why: 'Des réservations sont en cours sur cet hébergement' };
      const st = s.rt.bstate.get(b.id);
      if (st && (st.users.length || st.queue.length)) return { ok: false, why: 'Des clients utilisent ce bâtiment' };
      if (b.type === 'reception' && s.phase === 'season' && s.rt.groups.size) { /* autorisé mais pénalisant */ }
      s.buildings = s.buildings.filter((o) => o !== b);
      const refund = BUILDINGS[b.type].cost * D.DEMOLISH_REFUND * (b.progress > 0 ? 2 : 1);
      money(s, Math.min(refund, BUILDINGS[b.type].cost), 'Ventes');
      mapChanged(s);
      return { ok: true, refund };
    }
    const i = idx(x, y);
    if (!inMap(x, y) || x < 2) return { ok: false };
    if (s.deco[i]) { s.deco[i] = DECO.NONE; return { ok: true }; }
    if (s.tiles[i] === TERRAIN.PATH) {
      if (x === s.entrance.x && y === s.entrance.y) return { ok: false, why: 'Entrée du camping' };
      const busy = s.rt.agents.some((a) => !a.dead && (a.cx === x && a.cy === y));
      if (busy) return { ok: false, why: 'Quelqu’un marche ici' };
      s.tiles[i] = TERRAIN.GRASS; mapChanged(s);
      // agents en route : leurs champs se recalculent automatiquement
      return { ok: true };
    }
    return { ok: false };
  }

  function setPrice(s, type, v) { s.prices[type] = clamp(Math.round(v), type === 'extra' ? 0 : 5, 400); }
  function setMarkup(s, v) { s.shopMarkup = clamp(Math.round(v * 100) / 100, 0.8, 1.6); }
  function setSeasonRate(s, band, value) {
    if (!['low', 'mid', 'high'].includes(band) || !Number.isFinite(Number(value))) return false;
    s.seasonRates = Object.assign({ low: 1, mid: 1, high: 1 }, s.seasonRates || {});
    s.seasonRates[band] = clamp(Math.round(Number(value) * 100) / 100, 0.7, 1.5);
    return true;
  }
  function setStaffPolicy(s, role, value) {
    const allowed = { cleaning: ['arrivals', 'sanitary'], maintenance: ['urgent', 'preventive'] };
    if (!allowed[role] || !allowed[role].includes(value)) return false;
    s.staffPolicy = Object.assign({ cleaning: 'arrivals', maintenance: 'urgent' }, s.staffPolicy || {});
    s.staffPolicy[role] = value;
    return true;
  }
  // Indicateur d'exploitation par emplacement : le CA est acquis nuit après nuit,
  // pas au moment du versement de l'acompte. Hors salaires et frais communs.
  function unitPerformance(s, unit) {
    if (!unit || !BUILDINGS[unit.type] || !BUILDINGS[unit.type].unit) return null;
    const cut = s.phase === 'winter' ? D.SEASON_DAYS : Math.min(D.SEASON_DAYS, s.day);
    const opening = unit.openYear === s.year ? (unit.openDay || 0) : 0;
    const days = Math.max(0, cut - opening);
    let nights = 0, revenue = 0, energy = 0;
    for (const bk of s.bookings) {
      if (bk.unit !== unit.id || !['done', 'onsite'].includes(bk.status)) continue;
      const earned = Math.max(0, Math.min(cut, bk.depart) - Math.max(opening, bk.arrive));
      nights += earned;
      revenue += earned * bk.price;
      energy += earned * bk.size * 1.2;
    }
    const upkeep = days * BUILDINGS[unit.type].upkeep;
    const costs = r2(upkeep + energy);
    return { days, nights, revenue: r2(revenue), upkeep: r2(upkeep),
      energyEstimate: r2(energy), costs, margin: r2(revenue - costs),
      occupancy: days ? Math.min(1, nights / days) : 0 };
  }



  /* ---------- Exploitation V1.6 : interventions ciblées et vraies conséquences ---------- */
  function serviceOptions(s, b) {
    if (!b || !s.buildings.some(x => x.id === b.id) || b.progress > 0) return [];
    const options = [];
    if (b.broken) {
      const parts = Math.min(900, BUILDINGS[b.type].cost * 0.03) + 60;
      options.push({ kind: 'repair', label: 'Dépannage express', cost: r2(parts * 1.8),
        priority: 100 + (BUILDINGS[b.type].unit ? 12 : 0) });
    }
    if (b.type === 'sanitary' && b.dirt >= 35)
      options.push({ kind: 'clean', label: 'Nettoyage immédiat', cost: r2(35 + b.dirt * 0.65), priority: b.dirt });
    if (b.clean && BUILDINGS[b.type].unit && !s.bookings.some(bk => bk.unit === b.id && bk.status === 'onsite'))
      options.push({ kind: 'turnover', label: 'Ménage avant arrivée', cost: 75, priority: arrivalToday(s, b) ? 92 : 55 });
    if (b.type === 'pool' && b.water < 70)
      options.push({ kind: 'water', label: 'Traitement du bassin', cost: r2(65 + (100 - b.water) * 1.5), priority: 70 - b.water * .4 });
    if (b.cond < 65 && !b.broken)
      options.push({ kind: 'prevent', label: 'Révision préventive', cost: r2(45 + (100 - b.cond) * 1.3), priority: 65 - b.cond * .4 });
    return options;
  }
  function serviceChecklist(s) {
    const tasks = [];
    if (s.phase !== 'season') return tasks;
    for (const b of built(s)) {
      for (const opt of serviceOptions(s, b)) {
        // Prestataires accessibles même si le bâtiment est en panne ; impossible hors carte.
        if (!accessible(s, b)) continue;
        tasks.push({ id: b.id, type: b.type, number: b.num || 0, label: opt.label,
          kind: opt.kind, cost: opt.cost, priority: opt.priority });
      }
    }
    return tasks.sort((a, b) => b.priority - a.priority || a.id - b.id);
  }
  function serviceIntervention(s, id, kind) {
    if (s.phase !== 'season') return { ok: false, why: 'Les interventions express sont réservées à la saison.' };
    const b = byId(s, id);
    if (!b || !accessible(s, b) || b.progress > 0)
      return { ok: false, why: 'Équipement absent, en chantier ou inaccessible.' };
    const option = serviceOptions(s, b).find(x => x.kind === kind);
    if (!option) return { ok: false, why: 'Cette intervention n’est plus nécessaire.' };
    const st = s.rt.bstate.get(id);
    if (st && st.claim && s.rt.agentMap.has(st.claim)) {
      const agent = s.rt.agentMap.get(st.claim);
      const sameTask = agent && agent.task && agent.task.b === id
        && ((kind === 'repair' && agent.task.kind === 'repair') ||
          (kind === 'clean' && agent.task.kind === 'clean') ||
          (kind === 'turnover' && agent.task.kind === 'mh') ||
          (kind === 'water' && agent.task.kind === 'pool') ||
          (kind === 'prevent' && agent.task.kind === 'service'));
      if (sameTask) return { ok: false, why: 'Votre équipe intervient déjà sur ce problème.' };
    }
    if (s.fin.cash < option.cost) return { ok: false, why: 'Trésorerie insuffisante.' };
    money(s, -option.cost, kind === 'repair' ? 'Réparations' : 'Interventions extérieures');
    if (kind === 'repair') { b.broken = false; b.cond = Math.max(85, b.cond); b.brokenDay = -1; }
    else if (kind === 'clean') b.dirt = 0;
    else if (kind === 'turnover') b.clean = false;
    else if (kind === 'water') b.water = 100;
    else if (kind === 'prevent') b.cond = Math.min(100, b.cond + 35);
    if (!s.stats.serviceInterventions) s.stats.serviceInterventions = 0;
    s.stats.serviceInterventions++;
    s.stats.serviceExpenses = r2((s.stats.serviceExpenses || 0) + option.cost);
    log(s, `${option.label} : ${BUILDINGS[b.type].short.toLowerCase()}${b.num ? ' n°'+b.num : ''} (${Math.round(option.cost)} €).`, 'good');
    return { ok: true, cost: option.cost, kind, id };
  }


  /* ---------- V1.8 : direction commerciale et programmation des animations ---------- */
  const MARKETING = {
    local: { label: 'Affichage local & office de tourisme', cost: 350, days: 7, mult: 1.12 },
    families: { label: 'Campagne familles', cost: 850, days: 12, mult: 1.25 },
    summer: { label: 'Grande campagne estivale', cost: 1700, days: 16, mult: 1.42 }
  };
  const PROGRAMS = {
    calm: { label: 'Soirée douce', cost: 0, family: -.4, couple: 1.5, nomad: 1.1 },
    family: { label: 'Animations familiales', cost: 35, family: 2.2, couple: .7, nomad: .3 },
    festive: { label: 'Soirée festive', cost: 95, family: 1.2, couple: 2.3, nomad: 1.0 }
  };
  function setProgram(s, kind) {
    if (!PROGRAMS[kind]) return false;
    s.program = kind;
    return true;
  }
  function runProgram(s) {
    const config=PROGRAMS[s.program]||PROGRAMS.family;
    const active=s.phase==='season' && services(s,'stage').some(b=>accessible(s,b)&&!b.broken) &&
      s.staff.some(x=>x.role==='animation') && s.weather.type!=='storm' &&
      (s.weather.type!=='rain'||services(s,'stage').some(b=>b.level===2&&!b.broken));
    if (!active) return { active:false, reason:'Scène, animateur et météo compatibles nécessaires.' };
    const dayKey=s.year*1000+s.day;
    if(s.lastProgramDay===dayKey)return { active:false, reason:'La programmation a déjà été comptabilisée ce jour.' };
    s.lastProgramDay=dayKey;
    if (config.cost) money(s,-config.cost,'Programmation');
    s.stats.programCost=r2((s.stats.programCost||0)+config.cost);
    s.stats.programEvents=(s.stats.programEvents||0)+1;
    for(const bk of s.bookings)if(bk.status==='onsite'){
      bk.sat=clamp(bk.sat+config[bk.profile],0,100);
      note(bk,'show',.15);
    }
    if(s.program==='festive')s.reputation=clamp(s.reputation+.045,0,100);
    return { active:true,kind:s.program,cost:config.cost };
  }
  function campaignStatus(s) {
    if (!s.campaign || s.campaign.until<s.day || s.phase!=='season') return null;
    return Object.assign({},s.campaign,{remaining:s.campaign.until-s.day+1});
  }
  function launchCampaign(s,kind) {
    const c=MARKETING[kind];
    if (!c) return {ok:false,why:'Campagne inconnue.'};
    if (s.phase!=='season') return {ok:false,why:'Les campagnes démarrent uniquement pendant la saison.'};
    if (campaignStatus(s)) return {ok:false,why:'Une campagne est déjà en cours.'};
    if (s.day>=D.SEASON_DAYS-1) return {ok:false,why:'La saison se termine.'};
    if (s.fin.cash<c.cost) return {ok:false,why:'Trésorerie insuffisante.'};
    const days=Math.min(c.days,D.SEASON_DAYS-1-s.day);
    if(days<=0)return {ok:false,why:'La saison se termine.'};
    money(s,-c.cost,'Publicité');
    const from=s.day+1,until=s.day+days;
    s.mods=s.mods||[];
    s.mods.push({kind:'demand',mult:c.mult,from,until,label:c.label});
    s.campaign={kind,label:c.label,cost:c.cost,from,until,mult:c.mult};
    s.commercialHistory=s.commercialHistory||[];
    s.commercialHistory.push({year:s.year,day:s.day,kind,cost:c.cost,until});
    if(s.commercialHistory.length>30)s.commercialHistory.shift();
    s.stats.marketingSpent=r2((s.stats.marketingSpent||0)+c.cost);
    s.stats.marketingCampaigns=(s.stats.marketingCampaigns||0)+1;
    log(s,'Campagne lancée : '+c.label+' ('+Math.round(c.cost)+' €). Demande attendue ×'+c.mult.toFixed(2)+'.','good');
    return {ok:true,cost:c.cost,from,until,mult:c.mult};
  }

  /* ---------- Prévisions basées exclusivement sur les contrats ---------- */
  function bookingOutlook(s, horizon = 14) {
    const days = s.phase === 'winter' ? 0 : Math.min(Math.max(0, Math.floor(Number(horizon) || 0)), Math.max(0, D.SEASON_DAYS - s.day));
    const end = s.day + days, allUnits = units(s), umap = new Map(allUnits.map((b) => [b.id, b]));
    const byType = {};
    for (const type of ['tent', 'caravan', 'mobilhome']) {
      const count = allUnits.filter((b) => BUILDINGS[b.type].unitType === type).length;
      byType[type] = { units: count, availableNights: count * days, bookedNights: 0, contracted: 0, rate: 0 };
    }
    let bookings = 0, balancesDue = 0, riskBookings = 0;
    for (const bk of s.bookings) {
      if (bk.status !== 'booked' && bk.status !== 'onsite') continue;
      const unit = umap.get(bk.unit);
      if (!unit || !byType[bk.type]) continue;
      const nights = Math.max(0, Math.min(end, bk.depart) - Math.max(s.day, bk.arrive));
      if (!nights) continue;
      const row = byType[bk.type];
      bookings++; row.bookedNights += nights; row.contracted = r2(row.contracted + nights * bk.price);
      if (bk.status === 'booked' && bk.arrive >= s.day && bk.arrive < end)
        balancesDue = r2(balancesDue + Math.max(0, bk.total - bk.paid));
      if (unit.broken || !accessible(s, unit)) riskBookings++;
    }
    let capacityNights = 0, bookedNights = 0, contracted = 0;
    for (const row of Object.values(byType)) {
      row.rate = row.availableNights ? row.bookedNights / row.availableNights : 0;
      capacityNights += row.availableNights; bookedNights += row.bookedNights;
      contracted = r2(contracted + row.contracted);
    }
    const fixedCosts = r2(days * (built(s).reduce((a, b) => a + BUILDINGS[b.type].upkeep, 18)
      + s.staff.reduce((a, st) => a + st.wage * D.EMPLOYER_RATE / 30, 0)));
    let loanCosts = 0;
    if (s.loan) {
      let left = s.loan.left;
      for (let i = 0; i < days && left > 0; i++) {
        const principal = r2(Math.min(s.loan.perDay, left));
        loanCosts = r2(loanCosts + principal + r2(left * s.loan.rate / D.SEASON_DAYS));
        left = r2(left - principal);
      }
    }
    return { days, bookings, byType, capacityNights, bookedNights,
      occupancy: capacityNights ? bookedNights / capacityNights : 0, contracted, balancesDue,
      fixedCosts, loanCosts, riskBookings, unbookedNights: Math.max(0, capacityNights - bookedNights) };
  }

  function guestSnapshot(s) {
    const onsite = s.bookings.filter((bk) => bk.status === 'onsite');
    let persons = 0, outside = 0, mood = 0, hungry = 0, tired = 0, unhappy = 0;
    for (const bk of onsite) {
      const guests = guestStates(bk), group = s.rt.groups.get(bk.id);
      for (let i = 0; i < guests.length; i++) {
        persons++;
        const n = guests[i].needs;
        mood += n.energy * 0.2 + n.hunger * 0.26 + n.hygiene * 0.18 + n.fun * 0.25 + n.social * 0.11;
        if (n.hunger < 30) hungry++;
        if (n.energy < 30) tired++;
        if (n.fun < 30) unhappy++;
        if (group && group.members[i] && group.members[i].aid) outside++;
      }
    }
    return { persons, outside, atHome: Math.max(0, persons - outside), mood: persons ? mood / persons : 0,
      hungry, tired, unhappy, activities: s.stats.guestActivities || {},
      groupOutings: s.stats.escortedTrips || 0, trips: s.stats.guestTrips || 0 };
  }

  /* ---------- Vue d'ensemble pour l'UI ---------- */
  function summary(s) {
    const o = occupancy(s);
    const onsite = s.bookings.filter((b) => b.status === 'onsite');
    const satAvg = onsite.length ? onsite.reduce((a, b) => a + b.sat, 0) / onsite.length : null;
    return { occ: o, onsite: onsite.length, persons: onsite.reduce((a, b) => a + b.size, 0), satAvg, guestsOut: s.rt.agents.filter((a) => !a.dead && a.kind === 'guest').length };
  }

  const api = {
    W, H, DAY, newGame, initRuntime, step, tick, rand, fmtDate, fmtTime, dateParts, dow, seasonCurve,
    requestBooking, isBooked, occupancy, classement, units, built, ofType, services, accessible, beautyAt, avgBeauty,
    seasonBand, seasonMultiplier, setSeasonRate, setStaffPolicy, unitPerformance,
    serviceOptions, serviceChecklist, serviceIntervention, activityOpen,
    MARKETING, PROGRAMS, launchCampaign, campaignStatus, setProgram, runProgram,
    guestStates, guestMood, guestNeedsStep, guestStateForAgent, guestSnapshot,
    hire, fire, build, buildPath, placeDeco, demolish, canPlace, buildingAt, byId, setPrice, setMarkup,
    startSeason, endSeason, endOfDay, checkIn, checkOut, money, summary, bookingOutlook, field, idx, bs, mapChanged, attractiveness, weatherAt,
    occupancyGrid, poolOpen, INCOME, FINANCING, r2, stageLive, stageWindow, borrow, repayLoan, loanCapacity,
    snackOpen, canUpgrade, upgrade, displayName, unitPrice, acceptRate, eventView, resolveEvent, EVENTS, hasMod, demandMod, FIREWORKS, rollEvent, PREMIUM
  };
  root.CT = root.CT || {};
  root.CT.sim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
