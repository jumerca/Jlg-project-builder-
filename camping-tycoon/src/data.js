/* Camping Tycoon — données de jeu (JLG Creative)
 * Constantes pures, sans dépendance au DOM. */
(function (root) {
  'use strict';

  const TERRAIN = { GRASS: 0, PATH: 1, WATER: 2, SAND: 3, ROAD: 4 };
  const DECO = { NONE: 0, TREE: 1, PINE: 2, FLOWERS: 3, HEDGE: 4, BENCH: 5, LAMP: 6 };

  // Bâtiments et parcelles. w/h en tuiles, build = jours de chantier.
  const BUILDINGS = {
    tent: {
      name: 'Emplacement tente', short: 'Tente', cat: 'heberg', w: 2, h: 2, cost: 1800, build: 1,
      unit: true, unitType: 'tent', cap: 4, upkeep: 0.5, wear: 0.05,
      desc: 'Parcelle herbeuse délimitée par une haie, borne électrique. Jusqu’à 4 personnes.'
    },
    caravan: {
      name: 'Emplacement caravane', short: 'Caravane', cat: 'heberg', w: 3, h: 2, cost: 2600, build: 1,
      unit: true, unitType: 'caravan', cap: 5, upkeep: 0.8, wear: 0.05,
      desc: 'Parcelle stabilisée pour caravane ou camping-car, eau + électricité. Jusqu’à 5 personnes.'
    },
    mobilhome: {
      name: 'Mobil-home', short: 'Mobil-home', cat: 'heberg', w: 3, h: 2, cost: 14000, build: 3,
      unit: true, unitType: 'mobilhome', cap: 6, upkeep: 3, wear: 0.25, needsCleaning: true,
      upgrade: { name: 'Mobil-home Premium', cost: 7500, build: 3, desc: 'Spa sur la terrasse, climatisation, déco soignée : loué 30 % plus cher, clients ravis.' },
      desc: 'Mobil-home 2 chambres avec terrasse bois. Ménage obligatoire entre deux séjours. Jusqu’à 6 personnes.'
    },
    reception: {
      name: 'Accueil', short: 'Accueil', cat: 'service', w: 3, h: 2, cost: 8000, build: 5,
      service: 'reception', upkeep: 5, wear: 0.02, maxCount: 1,
      upgrade: { name: 'Accueil & conciergerie', cost: 6000, build: 3, desc: 'Un guichet de plus, accueil chaleureux : arrivées plus rapides et meilleure première impression.' },
      desc: 'Arrivées, départs et renseignements. Le personnel d’accueil accélère la file.'
    },
    sanitary: {
      name: 'Sanitaires', short: 'Sanitaires', cat: 'service', w: 3, h: 2, cost: 6500, build: 4,
      service: 'sanitary', slots: 6, upkeep: 8, wear: 0.06,
      upgrade: { name: 'Sanitaires Confort', cost: 5000, build: 3, desc: '9 cabines, revêtements faciles à nettoyer, eau chaude solaire : se salissent moins vite.' },
      desc: 'Douches et WC (6 cabines). Se salissent à l’usage ; l’équipe d’entretien les nettoie.'
    },
    shop: {
      name: 'Épicerie', short: 'Épicerie', cat: 'service', w: 2, h: 2, cost: 5200, build: 4,
      service: 'shop', slots: 2, upkeep: 6, wear: 0.04,
      upgrade: { name: 'Supérette', cost: 6000, build: 3, desc: '3 caisses, rayon frais et produits locaux : paniers plus gros.' },
      desc: 'Pain du matin, boissons fraîches, dépannage. Deux caisses : attention à la file du matin.'
    },
    pool: {
      name: 'Piscine', short: 'Piscine', cat: 'loisir', w: 5, h: 4, cost: 32000, build: 10,
      service: 'pool', slots: 24, upkeep: 30, wear: 0.4, openFrom: 10 * 60, openTo: 19 * 60 + 30,
      upgrade: { name: 'Toboggan aquatique', cost: 18000, build: 6, desc: 'Toboggan géant et bassin agrandi : 36 baigneurs, les familles en raffolent.' },
      desc: 'Bassin chauffé avec plage. Ouvert 10h–19h30. Très sensible à la météo et à la qualité de l’eau.'
    },
    stage: {
      name: 'Scène d’animation', short: 'Scène', cat: 'loisir', w: 4, h: 3, cost: 7500, build: 4,
      service: 'stage', slots: 70, upkeep: 6, wear: 0.06,
      upgrade: { name: 'Scène couverte', cost: 5000, build: 2, desc: 'Grand chapiteau : les spectacles ont lieu même sous la pluie.' },
      desc: 'Club enfants 15h–17h et soirée spectacle 20h30–22h. Nécessite un animateur. Annulé en cas de pluie.'
    },
    snack: {
      name: 'Snack-bar', short: 'Snack', cat: 'service', w: 3, h: 2, cost: 9000, build: 4,
      service: 'snack', slots: 14, upkeep: 9, wear: 0.05, openFrom: 11 * 60 + 30, openTo: 21 * 60 + 30,
      desc: 'Pizzas, frites et glaces en terrasse. Service midi (11h30–14h) et soir (18h30–21h30).',
      upgrade: { name: 'Restaurant-terrasse', cost: 8000, build: 3, desc: 'Grande terrasse ombragée : 24 couverts, addition plus élevée.' }
    },
    playground: {
      name: 'Aire de jeux', short: 'Jeux', cat: 'loisir', w: 2, h: 2, cost: 2800, build: 2,
      service: 'playground', slots: 8, upkeep: 1, wear: 0.05,
      desc: 'Toboggan et balançoires. Les familles l’adorent.'
    }
  };

  const DECOR_TOOLS = {
    tree:    { name: 'Chêne', deco: DECO.TREE, cost: 60, beauty: 3 },
    pine:    { name: 'Pin parasol', deco: DECO.PINE, cost: 80, beauty: 3 },
    flowers: { name: 'Massif fleuri', deco: DECO.FLOWERS, cost: 40, beauty: 4 },
    hedge:   { name: 'Haie', deco: DECO.HEDGE, cost: 25, beauty: 2 },
    bench:   { name: 'Banc', deco: DECO.BENCH, cost: 120, beauty: 2 },
    lamp:    { name: 'Lampadaire', deco: DECO.LAMP, cost: 150, beauty: 1 }
  };

  const PATH_COST = 15;
  const DEMOLISH_REFUND = 0.3;

  const PROFILES = {
    family: {
      name: 'Famille', icon: '👨‍👩‍👧', size: [3, 5], nights: [5, 12], lead: 25,
      types: { mobilhome: 0.45, tent: 0.3, caravan: 0.25 }, elasticity: 1.4, share: 0.45,
      wants: { pool: 1.6, playground: 1.4, shop: 1.0, anim: 1.3 }, color: '#e8553d'
    },
    couple: {
      name: 'Couple', icon: '💑', size: [2, 2], nights: [2, 6], lead: 18,
      types: { mobilhome: 0.4, caravan: 0.35, tent: 0.25 }, elasticity: 1.0, share: 0.35,
      wants: { pool: 1.0, beauty: 1.5, shop: 0.8, anim: 1.0 }, color: '#9b4dca'
    },
    nomad: {
      name: 'Itinérant', icon: '🚲', size: [1, 2], nights: [1, 2], lead: 2,
      types: { tent: 0.6, caravan: 0.4 }, elasticity: 2.0, share: 0.2,
      wants: { shop: 1.4, sanitary: 1.3, anim: 0.3 }, color: '#2f9e6b'
    }
  };

  const STAFF = {
    reception:   { name: 'Accueil', wage: 1900, color: '#e8553d', hours: [8 * 60, 20 * 60], desc: 'Accélère arrivées/départs, renseigne les clients.' },
    cleaning:    { name: 'Entretien', wage: 1800, color: '#2a9dd8', hours: [7 * 60, 19 * 60], desc: 'Nettoie sanitaires et mobil-homes entre deux séjours.' },
    animation:   { name: 'Animation', wage: 1850, color: '#ff4fa0', hours: [14 * 60, 22 * 60 + 30], desc: 'Club enfants l’après-midi, spectacle le soir sur la scène.' },
    maintenance: { name: 'Maintenance', wage: 2100, color: '#f2a516', hours: [8 * 60, 18 * 60], desc: 'Répare les pannes, entretient la piscine et les équipements.' }
  };
  const EMPLOYER_RATE = 1.42; // charges patronales
  const DEFAULT_PRICES = { tent: 19, caravan: 27, mobilhome: 79, extra: 5 };
  const REF_PRICES = { tent: 18, caravan: 26, mobilhome: 75 }; // à 2★
  const DEPOSIT_RATE = 0.3;

  const FIRST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefèvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin', 'Masson', 'Janssens', 'Peeters', 'Maes', 'Van Damme', 'Schmidt', 'Smith', 'De Vries'];
  const STAFF_NAMES = ['Nadia', 'Kévin', 'Sophie', 'Malik', 'Chloé', 'Bruno', 'Inès', 'Yannick', 'Léa', 'Hugo', 'Manon', 'Rachid', 'Camille', 'Jordan', 'Sarah', 'Théo', 'Amandine', 'Lucas', 'Fatou', 'Pierre'];

  // Saison : 1er avril (jour 0) → 30 septembre (jour 182)
  const SEASON_DAYS = 183;
  const MONTHS = [['avril', 30], ['mai', 31], ['juin', 30], ['juillet', 31], ['août', 31], ['septembre', 30]];

  const WEATHER = {
    sun:     { name: 'Grand soleil', icon: '☀️' },
    cloud:   { name: 'Nuageux', icon: '⛅' },
    rain:    { name: 'Pluie', icon: '🌧️' },
    storm:   { name: 'Orage', icon: '⛈️' },
    heat:    { name: 'Canicule', icon: '🔥' }
  };

  const OBJECTIVES = [
    { id: 'first10', title: 'Premiers clients', text: 'Accueillir 10 groupes', reward: 1500 },
    { id: 'pool', title: 'Le grand plongeon', text: 'Ouvrir une piscine', reward: 3000 },
    { id: 'staff3', title: 'Une vraie équipe', text: 'Employer 3 personnes (dont 1 de chaque métier)', reward: 1000 },
    { id: 'units20', title: 'Le domaine s’agrandit', text: 'Proposer 20 hébergements', reward: 4000 },
    { id: 'rep60', title: 'Bouche-à-oreille', text: 'Atteindre 60 de réputation', reward: 2500 },
    { id: 'stars3', title: 'Trois étoiles', text: 'Obtenir le classement 3★', reward: 5000 },
    { id: 'occ85', title: 'Complet !', text: 'Atteindre 85 % d’occupation un soir', reward: 3000 },
    { id: 'guests250', title: 'Lieu de vacances', text: 'Accueillir 3 000 groupes au total', reward: 10000 },
    { id: 'profit', title: 'Saison rentable', text: 'Terminer une saison avec un résultat d’exploitation positif (hors investissements)', reward: 5000 },
    { id: 'mh8', title: 'Village de mobil-homes', text: 'Posséder 8 mobil-homes', reward: 5000 },
    { id: 'shows20', title: 'Ambiance du soir', text: 'Organiser 20 soirées animées', reward: 4000 },
    { id: 'premium4', title: 'Montée en gamme', text: 'Posséder 4 mobil-homes Premium', reward: 6000 },
    { id: 'rating45', title: 'Coup de cœur', text: 'Note moyenne ≥ 4,2/5 sur au moins 40 séjours dans la saison', reward: 7000 },
    { id: 'stars4', title: 'Domaine reconnu', text: 'Obtenir le classement 4★', reward: 10000 },
    { id: 'rep85', title: 'Adresse incontournable', text: 'Atteindre 85 de réputation', reward: 15000 }
  ];

  const api = {
    TERRAIN, DECO, BUILDINGS, DECOR_TOOLS, PATH_COST, DEMOLISH_REFUND, PROFILES, STAFF,
    EMPLOYER_RATE, DEFAULT_PRICES, REF_PRICES, DEPOSIT_RATE, FIRST_NAMES, STAFF_NAMES,
    SEASON_DAYS, MONTHS, WEATHER, OBJECTIVES
  };
  root.CT = root.CT || {};
  root.CT.data = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
