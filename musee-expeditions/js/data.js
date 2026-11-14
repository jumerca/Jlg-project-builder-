/* Musée & Expéditions — data.js
 * Données de référence : périodes, matériaux, types d'objets (avec fiches historiques),
 * destinations, institutions, équipe, équipements, salles, publics, subventions.
 * Les institutions, sites et musées partenaires sont fictifs.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const D = (ME.DATA = {});

  D.PERIODS = {
    prehistoire: { label: 'Préhistoire', long: 'Paléolithique', color: '#8a6a3b' },
    bronze: { label: 'Âge du bronze', long: 'Âge du bronze égéen', color: '#2f7f7a' },
    gaule: { label: 'Gaule', long: 'Âge du fer gaulois', color: '#5f7f2a' },
    egypte: { label: 'Égypte', long: 'Égypte ancienne et romaine', color: '#c9932a' },
    rome: { label: 'Rome', long: 'Antiquité romaine', color: '#a8442f' },
    medieval: { label: 'Moyen Âge', long: 'Moyen Âge occidental', color: '#3f5a92' },
  };

  /* fragility : sensibilité aux chocs et au transport (0..1)
     light : sensibilité à la lumière (0..1) — un éclairage vif dégrade ces matériaux */
  D.MATERIALS = {
    silex: { label: 'silex', fragility: 0.1, light: 0 },
    obsidienne: { label: 'obsidienne', fragility: 0.3, light: 0 },
    os: { label: 'bois de renne', fragility: 0.5, light: 0.3 },
    ivoire: { label: 'ivoire de mammouth', fragility: 0.6, light: 0.5 },
    gres: { label: 'grès', fragility: 0.2, light: 0 },
    coquillage: { label: 'coquillages', fragility: 0.4, light: 0.1 },
    ceramique: { label: 'terre cuite', fragility: 0.55, light: 0 },
    bronze: { label: 'bronze', fragility: 0.25, light: 0 },
    or: { label: 'or', fragility: 0.05, light: 0 },
    argent: { label: 'argent', fragility: 0.15, light: 0 },
    fer: { label: 'fer', fragility: 0.6, light: 0 },
    plomb: { label: 'plomb', fragility: 0.2, light: 0 },
    steatite: { label: 'stéatite', fragility: 0.2, light: 0 },
    faience: { label: 'faïence égyptienne', fragility: 0.45, light: 0.1 },
    papyrus: { label: 'papyrus', fragility: 0.9, light: 1 },
    bois: { label: 'bois peint', fragility: 0.8, light: 0.8 },
    verre: { label: 'verre', fragility: 0.75, light: 0.1 },
    pierre: { label: 'calcaire', fragility: 0.2, light: 0 },
    marbre: { label: 'marbre', fragility: 0.3, light: 0 },
    parchemin: { label: 'parchemin', fragility: 0.85, light: 1 },
    email: { label: 'cuivre émaillé et doré', fragility: 0.35, light: 0.2 },
  };

  D.RARITY = {
    commun: { label: 'Commun', score: 1, color: '#7b6f5a', value: 300 },
    peuCommun: { label: 'Peu commun', score: 2, color: '#2f7f7a', value: 900 },
    rare: { label: 'Rare', score: 3.5, color: '#3f5a92', value: 2800 },
    exceptionnel: { label: 'Exceptionnel', score: 6, color: '#b23a2a', value: 9000 },
  };

  /* Types d'objets. dates en années (négatif = av. J.-C.). h = fiche historique en 3 niveaux
     (révélés par l'étude : 0 %, 40 %, 80 %). */
  D.TYPES = {
    /* ---------------- Préhistoire ---------------- */
    biface: { name: 'Biface en silex', shape: 'biface', period: 'prehistoire', mat: 'silex', rarity: 'commun', dates: [-300000, -120000],
      h: ['Outil taillé sur ses deux faces, en forme d\'amande, tenu directement dans la main.',
          'Le biface est l\'outil emblématique de l\'Acheuléen. Il servait à découper, racler, fendre : un véritable « couteau suisse » préhistorique.',
          'Sa symétrie dépasse souvent le simple besoin pratique. Beaucoup de préhistoriens y voient l\'un des premiers indices d\'un sens esthétique.'] },
    lame: { name: 'Lame retouchée', shape: 'blade', period: 'prehistoire', mat: 'silex', rarity: 'commun', dates: [-19000, -12000],
      h: ['Longue lame de silex aux bords repris par de fines retouches.',
          'Au Paléolithique supérieur, les tailleurs détachent des lames régulières d\'un même bloc préparé, ce qui économise la matière première.',
          'L\'analyse des micro-traces d\'usure permet de savoir si la lame a coupé de la viande, du bois ou de la peau.'] },
    sagaie: { name: 'Pointe de sagaie', shape: 'point', period: 'prehistoire', mat: 'os', rarity: 'peuCommun', dates: [-18000, -12000],
      h: ['Pointe de projectile façonnée dans un bois de renne, à base biseautée.',
          'Fixée au bout d\'une hampe, la sagaie était lancée à la main ou au propulseur pour chasser le renne et le cheval.',
          'Les rainures gravées sur certaines pointes ont longtemps été lues comme des « rigoles à poison » ; on pense aujourd\'hui à un décor ou à une marque de propriétaire.'] },
    propulseur: { name: 'Propulseur sculpté', shape: 'propulseur', period: 'prehistoire', mat: 'os', rarity: 'rare', dates: [-17000, -13000],
      h: ['Baguette en bois de renne terminée par un crochet sculpté en forme d\'animal.',
          'Le propulseur prolonge le bras du chasseur : la sagaie part plus vite et plus loin. Les Magdaléniens en ont fait de véritables œuvres d\'art.',
          'Les animaux sculptés au crochet — bouquetins, chevaux, oiseaux — sont orientés pour rester lisibles quand l\'outil est tenu en main.'] },
    lampe: { name: 'Lampe à graisse', shape: 'stoneLamp', period: 'prehistoire', mat: 'gres', rarity: 'peuCommun', dates: [-19000, -14000],
      h: ['Galet de grès creusé d\'une cupule, prolongé par un manche.',
          'On y brûlait de la graisse animale avec une mèche végétale. Ces lampes éclairaient les artistes au fond des grottes ornées.',
          'Les expériences montrent qu\'une lampe donne la lumière d\'une bougie pendant une heure environ, sans fumée noire si la mèche est en genévrier.'] },
    venus: { name: 'Statuette féminine', shape: 'venus', period: 'prehistoire', mat: 'ivoire', rarity: 'exceptionnel', dates: [-29000, -22000],
      h: ['Petite figurine féminine aux formes généreuses, sculptée dans l\'ivoire.',
          'Ces statuettes, souvent appelées « Vénus », se retrouvent des Pyrénées à la Sibérie au Gravettien, preuve de réseaux d\'échanges d\'idées sur des milliers de kilomètres.',
          'Leur sens reste débattu : symbole de fécondité, portrait de femmes réelles, amulette ? Le visage n\'est presque jamais détaillé, contrairement au corps.'] },
    parure: { name: 'Parure de coquillages', shape: 'beads', period: 'prehistoire', mat: 'coquillage', rarity: 'commun', dates: [-25000, -12000],
      h: ['Coquillages marins percés, enfilés autrefois sur un lien.',
          'Trouvés loin des côtes, ils témoignent de déplacements ou d\'échanges entre groupes sur des centaines de kilomètres.',
          'L\'usure des perforations indique comment ils étaient portés : cousus sur un vêtement ou enfilés en collier.'] },

    /* ---------------- Gaule ---------------- */
    tesson: { name: 'Tesson peint', shape: 'sherd', period: 'gaule', mat: 'ceramique', rarity: 'commun', dates: [-150, -50],
      h: ['Fragment de vase en céramique fine, décoré de bandes peintes.',
          'Les ateliers arvernes produisaient une vaisselle peinte de grande qualité, souvent ornée de motifs géométriques ou animaliers.',
          'Remonter les tessons d\'une même fosse permet de reconstituer le service d\'un banquet.'] },
    fibule: { name: 'Fibule en bronze', shape: 'fibula', period: 'gaule', mat: 'bronze', rarity: 'commun', dates: [-200, -30],
      h: ['Épingle de sûreté antique, à ressort et ardillon.',
          'La fibule fermait les vêtements. Sa forme change vite avec la mode : c\'est un excellent marqueur de datation.',
          'Les archéologues distinguent des dizaines de types (Nauheim, Alésia…) qui permettent de dater une couche à quelques décennies près.'] },
    statere: { name: 'Statère arverne en or', shape: 'coin', period: 'gaule', mat: 'or', rarity: 'rare', dates: [-80, -52],
      h: ['Pièce d\'or frappée d\'une tête au droit et d\'un cheval au revers.',
          'Les Gaulois imitent d\'abord le statère de Philippe II de Macédoine, puis transforment le modèle en un style très personnel.',
          'Certains statères portent le nom de chefs arvernes ; leur poids en or diminue dans les années de guerre contre Rome.'] },
    potin: { name: 'Potin à la tête casquée', shape: 'coin', period: 'gaule', mat: 'bronze', rarity: 'commun', dates: [-120, -50],
      h: ['Petite monnaie coulée dans un alliage riche en étain.',
          'Les potins sont coulés en chapelets dans des moules, puis séparés : on voit parfois encore les traces de coulée.',
          'Monnaie du quotidien, le potin circulait dans les marchés des oppida, loin des statères réservés aux élites.'] },
    dressel: { name: 'Amphore Dressel 1', shape: 'amphora', period: 'gaule', mat: 'ceramique', rarity: 'peuCommun', dates: [-130, -30],
      h: ['Grande amphore à vin au col haut, importée d\'Italie.',
          'Les Gaulois achetaient massivement du vin italien. Sur certains oppida, on retrouve des dizaines de milliers de fragments d\'amphores.',
          'Le col est souvent tranché net : un geste rituel lors des banquets, ou une simple façon d\'ouvrir l\'amphore ? La question reste ouverte.'] },
    torque: { name: 'Torque', shape: 'torc', period: 'gaule', mat: 'bronze', rarity: 'rare', dates: [-400, -100],
      h: ['Collier rigide ouvert, terminé par deux tampons décorés.',
          'Porté par les guerriers et les dieux, le torque est un signe de rang dans le monde celtique.',
          'Les auteurs romains racontent que des guerriers gaulois combattaient nus, ne portant que leur torque.'] },
    epee: { name: 'Épée et fourreau', shape: 'sword', period: 'gaule', mat: 'fer', rarity: 'rare', dates: [-250, -80],
      h: ['Longue épée en fer encore engagée dans son fourreau.',
          'Les forgerons gaulois maîtrisaient le fer au point de produire des lames longues et souples, réputées dans tout le monde antique.',
          'Certaines épées étaient volontairement pliées avant d\'être déposées dans un sanctuaire : une offrande « mise hors d\'usage ».'] },

    /* ---------------- Égypte ---------------- */
    scarabee: { name: 'Scarabée', shape: 'scarab', period: 'egypte', mat: 'steatite', rarity: 'commun', dates: [-1800, -600],
      h: ['Petite amulette en forme de bousier, gravée sous sa face plate.',
          'Le scarabée évoque Khépri, le soleil levant qui renaît chaque matin. Il servait d\'amulette et de sceau.',
          'Le dessous porte souvent un nom de pharaon, parfois copié des siècles après son règne pour sa valeur protectrice.'] },
    oushebti: { name: 'Oushebti', shape: 'ushabti', period: 'egypte', mat: 'faience', rarity: 'peuCommun', dates: [-1070, -300],
      h: ['Figurine funéraire momiforme en faïence bleue.',
          'Placés par centaines dans les tombes, les oushebtis devaient travailler à la place du défunt dans l\'au-delà.',
          'Un ensemble complet comptait 365 ouvriers, un par jour, et 36 contremaîtres armés d\'un fouet.'] },
    oudjat: { name: 'Amulette œil-oudjat', shape: 'amulet', period: 'egypte', mat: 'faience', rarity: 'commun', dates: [-1500, -30],
      h: ['Amulette représentant l\'œil du dieu faucon Horus.',
          'Selon le mythe, l\'œil d\'Horus, arraché par Seth, fut guéri par Thot : l\'oudjat symbolise l\'intégrité retrouvée.',
          'C\'est l\'une des amulettes les plus portées d\'Égypte, par les vivants comme par les momies.'] },
    papyrus: { name: 'Papyrus grec', shape: 'papyrus', period: 'egypte', mat: 'papyrus', rarity: 'rare', dates: [-250, 250],
      h: ['Fragment de papyrus couvert d\'une écriture grecque cursive.',
          'Le Fayoum a livré des milliers de papyrus : contrats, lettres, comptes, qui racontent la vie quotidienne de l\'Égypte gréco-romaine.',
          'Beaucoup proviennent de cartonnages de momies, fabriqués avec de vieux papiers recyclés : il faut les démonter avec patience.'] },
    portrait: { name: 'Portrait funéraire du Fayoum', shape: 'portrait', period: 'egypte', mat: 'bois', rarity: 'exceptionnel', dates: [50, 250],
      h: ['Portrait peint sur un panneau de bois, au regard frappant.',
          'À l\'époque romaine, on plaçait sur la momie le portrait du défunt peint à l\'encaustique : la rencontre de l\'Égypte et de Rome.',
          'Ces visages comptent parmi les plus anciens portraits individuels conservés ; les bijoux et coiffures permettent de les dater.'] },
    lampeEg: { name: 'Lampe en terre cuite', shape: 'oilLamp', period: 'egypte', mat: 'ceramique', rarity: 'commun', dates: [-100, 300],
      h: ['Petite lampe moulée, avec un bec pour la mèche.',
          'On y brûlait de l\'huile d\'olive ou de ricin. Les lampes moulées étaient produites en série.',
          'Leur décor (grenouilles, dieux, scènes de cirque) renseigne sur les croyances et les goûts populaires.'] },
    bastet: { name: 'Chat de Bastet', shape: 'cat', period: 'egypte', mat: 'bronze', rarity: 'rare', dates: [-664, -30],
      h: ['Statuette de chatte assise, en bronze.',
          'La déesse Bastet, protectrice du foyer, prend la forme d\'une chatte. Ces statuettes étaient offertes dans ses temples.',
          'Certaines servaient de cercueil à de véritables chats momifiés, élevés près des sanctuaires.'] },

    /* ---------------- Rome ---------------- */
    amphore: { name: 'Amphore à vin', shape: 'amphora', period: 'rome', mat: 'ceramique', rarity: 'commun', dates: [-50, 50],
      h: ['Amphore à pied pointu, couverte de concrétions marines.',
          'Le pied pointu permet de caler les amphores en rangs serrés dans la cale, enfoncées dans des branchages.',
          'Les timbres et inscriptions peintes indiquent le producteur, le contenu et parfois l\'année du vin.'] },
    lampeRom: { name: 'Lampe à volutes', shape: 'oilLamp', period: 'rome', mat: 'ceramique', rarity: 'commun', dates: [1, 100],
      h: ['Lampe romaine au bec encadré de volutes.',
          'Sur un navire, les lampes éclairaient la cabine et servaient aux offrandes aux dieux protecteurs.',
          'Le médaillon central était décoré à partir de moules interchangeables, diffusés dans tout l\'Empire.'] },
    sigillee: { name: 'Coupe sigillée', shape: 'bowl', period: 'rome', mat: 'ceramique', rarity: 'commun', dates: [10, 150],
      h: ['Coupe au vernis rouge brillant, décorée en relief.',
          'La « sigillée » doit son nom aux sceaux (sigilla) des potiers. Les ateliers gaulois de La Graufesenque l\'exportaient partout.',
          'Une cargaison de sigillée permet de dater un naufrage à quelques années près grâce aux signatures de potiers.'] },
    sesterce: { name: 'Sesterce', shape: 'coin', period: 'rome', mat: 'bronze', rarity: 'peuCommun', dates: [14, 180],
      h: ['Grande pièce de bronze à l\'effigie d\'un empereur.',
          'Le sesterce était l\'unité de compte romaine. Un légionnaire touchait environ 900 sesterces par an au Ier siècle.',
          'Au fond de l\'eau, le bronze se couvre de concrétions : seul un nettoyage patient révèle l\'empereur.'] },
    lingot: { name: 'Lingot de plomb', shape: 'ingot', period: 'rome', mat: 'plomb', rarity: 'peuCommun', dates: [-50, 80],
      h: ['Lourd lingot de plomb en forme de demi-tronc, estampillé.',
          'Le plomb servait aux canalisations, aux sarcophages, aux poids. Il venait surtout des mines d\'Hispanie.',
          'L\'estampille donne le nom du marchand ; l\'analyse des isotopes du plomb permet même d\'identifier la mine d\'origine.'] },
    mercure: { name: 'Mercure en bronze', shape: 'figurine', period: 'rome', mat: 'bronze', rarity: 'rare', dates: [50, 200],
      h: ['Statuette du dieu Mercure, coiffé d\'un pétase ailé.',
          'Dieu du commerce et des voyageurs, Mercure était très vénéré en Gaule ; un marin pouvait l\'emporter comme protecteur.',
          'César écrit que Mercure était le dieu le plus honoré des Gaulois : une affirmation à nuancer, mais confirmée par l\'abondance de ses images.'] },
    flacon: { name: 'Flacon en verre soufflé', shape: 'flask', period: 'rome', mat: 'verre', rarity: 'peuCommun', dates: [20, 200],
      h: ['Petit flacon en verre bleu-vert, à panse globulaire.',
          'Le verre soufflé, inventé au Ier siècle av. J.-C., rend la verrerie bon marché : parfums et huiles voyagent dans ces flacons.',
          'L\'irisation de la surface vient de la lente altération du verre dans l\'eau de mer.'] },
    jas: { name: 'Jas d\'ancre en plomb', shape: 'anchorStock', period: 'rome', mat: 'plomb', rarity: 'peuCommun', dates: [-100, 100],
      h: ['Barre transversale en plomb d\'une ancre en bois.',
          'Le bois de l\'ancre a disparu ; seul le jas, qui lestait l\'ancre et la faisait mordre le fond, a survécu.',
          'Les jas perdus en mer jalonnent les mouillages antiques et aident à retrouver les routes maritimes.'] },

    /* ---------------- Moyen Âge ---------------- */
    chapiteau: { name: 'Chapiteau roman', shape: 'capital', period: 'medieval', mat: 'pierre', rarity: 'rare', dates: [1080, 1150],
      h: ['Chapiteau de colonne sculpté de feuillages et de créatures.',
          'Les sculpteurs romans racontent des histoires sur les chapiteaux du cloître : la Bible, mais aussi des monstres et des vices.',
          'Des traces de pigments montrent que ces sculptures, aujourd\'hui grises, étaient autrefois peintes de couleurs vives.'] },
    sceau: { name: 'Matrice de sceau', shape: 'seal', period: 'medieval', mat: 'bronze', rarity: 'peuCommun', dates: [1200, 1350],
      h: ['Matrice en bronze gravée en négatif, avec un anneau de suspension.',
          'Pressée dans la cire, la matrice authentifiait les actes : c\'était la signature d\'un abbé, d\'un seigneur ou d\'une ville.',
          'À la mort de son propriétaire, la matrice était souvent brisée pour éviter les faux.'] },
    vitrail: { name: 'Fragment de vitrail', shape: 'stainedGlass', period: 'medieval', mat: 'verre', rarity: 'peuCommun', dates: [1150, 1300],
      h: ['Morceaux de verre coloré encore sertis de plomb.',
          'Le bleu profond est obtenu avec du cobalt ; les détails sont peints à la grisaille puis cuits.',
          'Les vitraux enseignaient l\'histoire sainte à ceux qui ne savaient pas lire : on les appelait la « Bible des pauvres ».'] },
    carreau: { name: 'Carreau de pavement', shape: 'tile', period: 'medieval', mat: 'ceramique', rarity: 'commun', dates: [1250, 1400],
      h: ['Carreau de terre cuite à décor incrusté et glaçuré.',
          'Les sols des églises et des salles nobles étaient couverts de ces carreaux formant des tapis de motifs.',
          'Le décor est obtenu en remplissant d\'argile blanche un motif imprimé dans l\'argile rouge, avant la cuisson.'] },
    reliquaire: { name: 'Croix reliquaire émaillée', shape: 'cross', period: 'medieval', mat: 'email', rarity: 'exceptionnel', dates: [1180, 1250],
      h: ['Croix en cuivre doré, ornée d\'émail bleu et de cabochons.',
          'Les ateliers de Limoges ont diffusé leurs émaux champlevés dans toute l\'Europe au XIIIe siècle.',
          'Une petite cavité au revers abritait une relique : l\'objet était à la fois œuvre d\'art et objet de dévotion.'] },
    enluminure: { name: 'Feuillet enluminé', shape: 'manuscript', period: 'medieval', mat: 'parchemin', rarity: 'rare', dates: [1150, 1350],
      h: ['Feuillet de parchemin orné d\'une lettrine peinte et dorée.',
          'Les moines du scriptorium copiaient et décoraient les livres ; un manuscrit pouvait demander des années de travail.',
          'Le parchemin, fait de peau de veau ou de mouton, craint la lumière et l\'humidité : il s\'expose peu et sous faible éclairage.'] },
    denier: { name: 'Denier féodal', shape: 'coin', period: 'medieval', mat: 'argent', rarity: 'commun', dates: [1000, 1250],
      h: ['Petite monnaie d\'argent frappée d\'une croix.',
          'Au Moyen Âge central, évêques, abbés et seigneurs frappent leur propre monnaie.',
          'Retrouvé sur le chantier, un denier peut dater précisément une phase de construction.'] },

    /* ---------------- Âge du bronze égéen ---------------- */
    idole: { name: 'Idole cycladique', shape: 'cycladic', period: 'bronze', mat: 'marbre', rarity: 'exceptionnel', dates: [-2800, -2300],
      h: ['Figurine féminine en marbre, bras croisés, visage lisse.',
          'Les idoles des Cyclades, au style épuré, ont fasciné les artistes modernes comme Brancusi ou Modigliani.',
          'Des analyses ont révélé des traces de peinture : yeux, bijoux, tatouages. Leur blancheur actuelle est un effet du temps.'] },
    cruche: { name: 'Cruche à bec relevé', shape: 'jug', period: 'bronze', mat: 'ceramique', rarity: 'peuCommun', dates: [-2700, -2200],
      h: ['Cruche au bec fortement relevé, à décor incisé.',
          'Ces vases servaient à verser des liquides lors des repas ou des rituels.',
          'Le bec dressé rappelle la forme d\'un oiseau : un clin d\'œil des potiers au monde animal.'] },
    poignard: { name: 'Poignard en bronze', shape: 'dagger', period: 'bronze', mat: 'bronze', rarity: 'rare', dates: [-2600, -2100],
      h: ['Lame triangulaire à nervure centrale, percée de rivets.',
          'Le bronze, alliage de cuivre et d\'étain, nécessite des échanges à longue distance : l\'étain venait de très loin.',
          'Le poignard est autant une arme qu\'un insigne de prestige, souvent déposé dans les tombes masculines.'] },
    obsidienne: { name: 'Lame d\'obsidienne', shape: 'blade', period: 'bronze', mat: 'obsidienne', rarity: 'commun', dates: [-3000, -2000],
      h: ['Lame noire et brillante, taillée dans un verre volcanique.',
          'L\'obsidienne de l\'île de Milos circulait dans toute la mer Égée depuis le Néolithique.',
          'Son tranchant est plus fin qu\'un scalpel moderne : on l\'utilisait pour raser, découper, scarifier.'] },
    poele: { name: '« Poêle à frire » cycladique', shape: 'pan', period: 'bronze', mat: 'ceramique', rarity: 'rare', dates: [-2700, -2300],
      h: ['Disque en terre cuite muni d\'un manche, décoré de spirales et de navires.',
          'Leur fonction reste mystérieuse : miroir rempli d\'eau, plateau rituel, tambour ? Le surnom moderne n\'explique rien.',
          'Les navires gravés sont parmi les plus anciennes images de bateaux à rames de la mer Égée.'] },
  };

  /* ---------------- Institutions (fictives) ---------------- */
  D.INSTITUTIONS = {
    sap: { name: 'Service archéologique du Périgord', short: 'SAP', permitCost: 200, permitWeeks: 2, minRep: 0, share: 0,
      loans: [{ type: 'propulseur', fee: 700, weeks: 10, minPartner: 30 }, { type: 'lampe', fee: 300, weeks: 10, minPartner: 20 }] },
    cra: { name: 'Conservation régionale d\'Auvergne', short: 'CRA', permitCost: 250, permitWeeks: 2, minRep: 0, share: 0,
      loans: [{ type: 'torque', fee: 800, weeks: 10, minPartner: 30 }, { type: 'statere', fee: 600, weeks: 10, minPartner: 20 }] },
    fsv: { name: 'Fondation de Saint-Vorles', short: 'FSV', permitCost: 150, permitWeeks: 1, minRep: 0, share: 0,
      loans: [{ type: 'enluminure', fee: 700, weeks: 8, minPartner: 25 }, { type: 'chapiteau', fee: 600, weeks: 12, minPartner: 30 }] },
    brsm: { name: 'Bureau des recherches sous-marines de Méditerranée', short: 'BRSM', permitCost: 400, permitWeeks: 2, minRep: 5, share: 0,
      loans: [{ type: 'mercure', fee: 900, weeks: 10, minPartner: 30 }, { type: 'jas', fee: 300, weeks: 12, minPartner: 15 }] },
    caf: { name: 'Conseil des antiquités du Fayoum', short: 'CAF', permitCost: 600, permitWeeks: 3, minRep: 15, share: 0.5,
      loans: [{ type: 'portrait', fee: 2200, weeks: 8, minPartner: 50 }, { type: 'bastet', fee: 900, weeks: 10, minPartner: 30 }, { type: 'oushebti', fee: 400, weeks: 12, minPartner: 15 }] },
    eco: { name: 'Éphorie des antiquités des Cyclades orientales', short: 'EACO', permitCost: 700, permitWeeks: 3, minRep: 30, share: 0.5,
      loans: [{ type: 'idole', fee: 2500, weeks: 8, minPartner: 50 }, { type: 'poele', fee: 900, weeks: 10, minPartner: 30 }] },
  };

  /* ---------------- Destinations ---------------- */
  D.DESTINATIONS = {
    vezere: { name: 'Vallée de la Vézère', place: 'Dordogne, France', period: 'prehistoire', biome: 'valley', inst: 'sap',
      map: [318, 262], transport: 1, weekly: 550, unlockRep: 0, required: ['outils'],
      site: 'abri sous roche', layers: ['couche magdalénienne', 'couche gravettienne', 'foyer aménagé', 'éboulis de pente'],
      intro: 'Falaises de calcaire et abris sous roche : le berceau de la préhistoire française. Idéal pour une première campagne.',
      loot: [['biface', 18], ['lame', 30], ['sagaie', 14], ['parure', 20], ['lampe', 10], ['propulseur', 5], ['venus', 1.5]] },
    puy: { name: 'Oppidum du Puy-Mardoux', place: 'Auvergne, France', period: 'gaule', biome: 'plateau', inst: 'cra',
      map: [360, 238], transport: 1, weekly: 600, unlockRep: 0, required: ['outils'],
      site: 'plateau fortifié', layers: ['fosse à banquet', 'rempart', 'sanctuaire', 'atelier de bronzier'],
      intro: 'Un plateau volcanique ceinturé d\'un rempart gaulois. Les labours font remonter des tessons d\'amphores.',
      loot: [['tesson', 28], ['potin', 22], ['fibule', 20], ['dressel', 16], ['torque', 5], ['epee', 4], ['statere', 4]] },
    abbaye: { name: 'Abbaye de Saint-Vorles-des-Bois', place: 'Bourgogne, France', period: 'medieval', biome: 'forest', inst: 'fsv',
      map: [392, 205], transport: 1, weekly: 500, unlockRep: 0, required: ['outils'],
      site: 'abbaye ruinée', layers: ['cloître', 'salle capitulaire', 'scriptorium', 'cimetière des moines'],
      intro: 'Une abbaye bénédictine abandonnée à la Révolution, mangée par la forêt. Le cloître dort sous les ronces.',
      loot: [['carreau', 28], ['denier', 22], ['vitrail', 16], ['sceau', 14], ['chapiteau', 7], ['enluminure', 4], ['reliquaire', 1.5]] },
    epave: { name: 'Épave de l\'anse du Loup', place: 'Calanques de Marseille', period: 'rome', biome: 'sea', inst: 'brsm',
      map: [396, 292], transport: 1, weekly: 850, unlockRep: 5, required: ['outils', 'plongee'], diver: true,
      site: 'épave antique', layers: ['cargaison d\'amphores', 'poupe', 'cabine', 'zone de mouillage'],
      intro: 'Un navire de commerce romain par 38 mètres de fond. Plongeur indispensable.',
      loot: [['amphore', 30], ['sigillee', 18], ['lampeRom', 14], ['sesterce', 12], ['lingot', 9], ['flacon', 8], ['jas', 6], ['mercure', 3]] },
    fayoum: { name: 'Nécropole de Kôm el-Rihan', place: 'Fayoum, Égypte', period: 'egypte', biome: 'desert', inst: 'caf',
      map: [640, 400], transport: 2, weekly: 1000, unlockRep: 15, required: ['outils', 'camp'],
      site: 'nécropole gréco-romaine', layers: ['tombes à puits', 'cartonnages', 'chapelle funéraire', 'dépotoir antique'],
      intro: 'Aux portes du désert, une nécropole gréco-romaine. Les découvertes sont partagées avec les autorités égyptiennes.',
      loot: [['scarabee', 24], ['oudjat', 22], ['lampeEg', 18], ['oushebti', 16], ['papyrus', 8], ['bastet', 5], ['portrait', 2]] },
    keros: { name: 'Île de Kéros-Mikri', place: 'Cyclades, Grèce', period: 'bronze', biome: 'island', inst: 'eco',
      map: [585, 318], transport: 2, weekly: 950, unlockRep: 30, required: ['outils', 'camp'],
      site: 'sanctuaire insulaire', layers: ['dépôt rituel', 'terrasse', 'habitat', 'atelier de marbrier'],
      intro: 'Un îlot rocheux où des idoles brisées furent déposées rituellement il y a 4 500 ans.',
      loot: [['obsidienne', 30], ['cruche', 20], ['poignard', 10], ['poele', 6], ['idole', 3]] },
  };

  /* ---------------- Types de mission ---------------- */
  D.MISSIONS = {
    prospection: { label: 'Prospection', desc: 'Repérage rapide et peu coûteux. Peu de découvertes, mais le site est mieux connu (les campagnes suivantes trouvent plus d\'objets rares). Sans autorisation de fouille.',
      minWeeks: 2, maxWeeks: 2, findMult: 0.35, knowledge: 30, costMult: 0.6, needsPermit: false, partner: 4 },
    fouille: { label: 'Fouille programmée', desc: 'Campagne complète. Nécessite une autorisation en cours de validité. Les découvertes rejoignent la collection (sauf partage prévu par l\'accord).',
      minWeeks: 3, maxWeeks: 6, findMult: 1, knowledge: 12, costMult: 1, needsPermit: true, partner: 6 },
    scientifique: { label: 'Mission scientifique conjointe', desc: 'Partenariat : l\'institution locale finance 50 % de la mission. Les objets restent au pays (dépôt partenaire), mais vous gagnez beaucoup de science et pouvez les exposer en prêt gratuit.',
      minWeeks: 3, maxWeeks: 5, findMult: 1.1, knowledge: 15, costMult: 0.5, needsPermit: true, minPartner: 40, partner: 12, science: 2 },
  };

  /* ---------------- Équipements ---------------- */
  D.EQUIPMENT = {
    outils: { label: 'Trousse de fouille', cost: 250, desc: 'Truelles, pinceaux, tamis. Indispensable sur tout site terrestre.' },
    camp: { label: 'Camp & ravitaillement', cost: 600, desc: 'Tentes, eau, vivres. Obligatoire pour les sites lointains ; protège des intempéries.' },
    plongee: { label: 'Matériel de plongée', cost: 1100, desc: 'Bouteilles, compresseur, suceuse à sédiments. Obligatoire pour une épave.' },
    caisses: { label: 'Caisses capitonnées', cost: 250, desc: 'Réduisent fortement la casse pendant le transport.' },
    kit: { label: 'Kit de conservation préventive', cost: 350, desc: 'Consolidants et emballages : les objets sortent de terre en meilleur état.' },
    topo: { label: 'Station topographique', cost: 400, desc: 'Relevés précis : meilleure documentation et plus de découvertes.' },
  };

  D.SKILLS = {
    fouille: 'Fouille', conservation: 'Conservation', recherche: 'Recherche',
    logistique: 'Logistique', diplomatie: 'Diplomatie', mediation: 'Médiation',
  };

  D.STAFF_START = [
    { name: 'Hélène Castagne', role: 'Archéologue', salary: 260, skills: { fouille: 4, conservation: 1, recherche: 2, logistique: 1, diplomatie: 2, mediation: 1 }, traits: [], look: { hair: '#6b3a1f', coat: '#b23a2a', skin: '#f1c9a5', hat: true } },
    { name: 'Basile Moreau', role: 'Restaurateur', salary: 240, skills: { fouille: 1, conservation: 4, recherche: 2, logistique: 1, diplomatie: 0, mediation: 1 }, traits: [], look: { hair: '#2b2118', coat: '#2f6f73', skin: '#e6b48f', hat: false, beard: true } },
    { name: 'Inès Belkacem', role: 'Historienne', salary: 230, skills: { fouille: 1, conservation: 1, recherche: 4, logistique: 0, diplomatie: 3, mediation: 2 }, traits: [], look: { hair: '#1d1410', coat: '#d39b2a', skin: '#c99772', hat: false, glasses: true } },
    { name: 'Théo Lanvin', role: 'Logisticien', salary: 210, skills: { fouille: 2, conservation: 0, recherche: 0, logistique: 4, diplomatie: 1, mediation: 0 }, traits: ['plongeur'], look: { hair: '#c48a3a', coat: '#3f5a92', skin: '#f3d0b0', hat: true } },
    { name: 'Margaux Ferrand', role: 'Médiatrice', salary: 200, skills: { fouille: 0, conservation: 1, recherche: 1, logistique: 1, diplomatie: 2, mediation: 4 }, traits: [], look: { hair: '#8a2a1a', coat: '#5f7f2a', skin: '#f5d5bd', hat: false } },
  ];

  D.CANDIDATES = [
    { name: 'Yanis Delorme', role: 'Archéologue plongeur', salary: 270, skills: { fouille: 3, conservation: 1, recherche: 1, logistique: 2, diplomatie: 1, mediation: 0 }, traits: ['plongeur'], look: { hair: '#2b2118', coat: '#2f6f73', skin: '#d7a27c', hat: false } },
    { name: 'Clémence Arnaud', role: 'Restauratrice', salary: 250, skills: { fouille: 0, conservation: 4, recherche: 1, logistique: 0, diplomatie: 1, mediation: 1 }, traits: [], look: { hair: '#e0b25a', coat: '#b23a2a', skin: '#f6d8c2', hat: false, glasses: true } },
    { name: 'Samir Haddad', role: 'Égyptologue', salary: 280, skills: { fouille: 2, conservation: 1, recherche: 4, logistique: 1, diplomatie: 3, mediation: 1 }, traits: ['arabophone'], look: { hair: '#1d1410', coat: '#d39b2a', skin: '#b98764', hat: true, beard: true } },
    { name: 'Lucie Vasseur', role: 'Topographe', salary: 220, skills: { fouille: 3, conservation: 0, recherche: 2, logistique: 3, diplomatie: 0, mediation: 0 }, traits: [], look: { hair: '#5a3a22', coat: '#3f5a92', skin: '#f1c9a5', hat: true } },
    { name: 'Nikos Pappas', role: 'Archéologue', salary: 260, skills: { fouille: 3, conservation: 1, recherche: 3, logistique: 1, diplomatie: 3, mediation: 0 }, traits: ['hellénophone'], look: { hair: '#3a3a3a', coat: '#5f7f2a', skin: '#d9a982', hat: false, beard: true } },
    { name: 'Odile Sauvage', role: 'Médiatrice jeune public', salary: 190, skills: { fouille: 0, conservation: 0, recherche: 1, logistique: 1, diplomatie: 1, mediation: 4 }, traits: [], look: { hair: '#a0522d', coat: '#d39b2a', skin: '#f5d5bd', hat: false } },
  ];

  /* ---------------- Salles ---------------- */
  // Coupe du bâtiment : rangée 0 = étage, rangée 1 = rez-de-chaussée.
  D.ROOMS = {
    hall: { name: 'Hall & billetterie', slots: 1, cost: 0, unlocked: true, kind: 'hall', row: 1, col: 0, w: 1, desc: 'La vitrine d\'accueil présente une « pièce d\'appel » vue par tous les visiteurs.' },
    salle1: { name: 'Galerie des Origines', slots: 4, cost: 0, unlocked: true, kind: 'expo', row: 1, col: 1, w: 1 },
    salle2: { name: 'Salle des Civilisations', slots: 4, cost: 0, unlocked: true, kind: 'expo', row: 1, col: 2, w: 1 },
    salle3: { name: 'Grande Galerie', slots: 6, cost: 9000, unlocked: false, kind: 'expo', row: 0, col: 1, w: 1, desc: 'Une vaste salle sous verrière, à l\'étage.' },
    temp: { name: 'Salle des expositions temporaires', slots: 5, cost: 6000, unlocked: false, kind: 'temp', row: 0, col: 2, w: 1, desc: 'Accueille des expositions temporaires à thème, avec prêts d\'autres institutions.' },
    atelier: { name: 'Atelier de restauration', slots: 0, cost: 0, unlocked: true, kind: 'atelier', row: 0, col: 0, w: 1 },
    reserves: { name: 'Réserves', slots: 0, cost: 0, unlocked: true, kind: 'reserves', row: 0, col: 3, w: 1 },
    boutique: { name: 'Boutique', slots: 0, cost: 0, unlocked: true, kind: 'shop', row: 1, col: 3, w: 1 },
  };

  D.LIGHTING = {
    tamise: { label: 'Tamisé', attract: 0.9, wear: 0, desc: 'Protège les matériaux sensibles ; ambiance feutrée, un peu moins spectaculaire.' },
    standard: { label: 'Standard', attract: 1, wear: 0.4, desc: 'Compromis équilibré.' },
    vif: { label: 'Vif', attract: 1.15, wear: 1.4, desc: 'Spectaculaire, mais abîme papyrus, parchemin, bois peint, ivoire…' },
  };

  /* ---------------- Publics ---------------- */
  D.VISITOR_TYPES = {
    famille: { label: 'Familles', share: 0.32, priceMult: 1, interests: ['egypte', 'prehistoire', 'rome'], stamina: 3, likesBright: true, shop: 1.4, careStudy: 0.2, careRare: 0.8, color: '#d39b2a' },
    scolaire: { label: 'Scolaires', share: 0.18, priceMult: 0.5, interests: ['prehistoire', 'gaule', 'egypte', 'medieval'], stamina: 3, likesBright: true, shop: 0.5, careStudy: 0.6, careRare: 0.5, color: '#5f7f2a' },
    passionne: { label: 'Passionnés', share: 0.2, priceMult: 1, interests: ['medieval', 'gaule', 'bronze', 'rome', 'prehistoire'], stamina: 6, likesBright: false, shop: 1, careStudy: 1.2, careRare: 1, color: '#3f5a92' },
    touriste: { label: 'Touristes', share: 0.3, priceMult: 1, interests: ['egypte', 'rome', 'bronze', 'medieval'], stamina: 4, likesBright: true, shop: 1.2, careStudy: 0.4, careRare: 1.4, color: '#b23a2a' },
  };

  /* ---------------- Subventions ---------------- */
  D.GRANTS = {
    patrimoine: { label: 'Fonds régional pour le patrimoine', desc: 'Versement unique pour un musée qui étudie ses collections.', req: 'Au moins 1 objet étudié à 100 % et réputation ≥ 10', amount: 4000, weeks: 0, review: 2, cooldown: 26,
      check: (s, ME) => s.reputation >= 10 && Object.values(s.objects).some((o) => o.owner === 'musee' && o.studied >= 100) },
    recherche: { label: 'Programme national de recherche archéologique', desc: 'Financement hebdomadaire de la recherche pendant 10 semaines.', req: 'Science ≥ 40', amount: 450, weeks: 10, review: 2, cooldown: 20,
      check: (s) => s.science >= 40 },
    mecenat: { label: 'Mécénat de la Fondation Lumière & Patrimoine', desc: 'Soutien d\'une fondation privée à une exposition temporaire.', req: 'Une exposition temporaire en cours', amount: 5000, weeks: 0, review: 1, cooldown: 30,
      check: (s) => !!s.tempExpo },
    publics: { label: 'Aide à l\'accueil des publics scolaires', desc: 'Aide hebdomadaire pendant 12 semaines.', req: 'Une médiatrice à l\'accueil et satisfaction ≥ 60', amount: 250, weeks: 12, review: 1, cooldown: 24,
      check: (s) => s.staff.some((p) => p.assign && p.assign.kind === 'accueil') && s.lastVisit && s.lastVisit.satisfaction >= 60 },
  };

  /* ---------------- Améliorations ---------------- */
  D.UPGRADES = {
    salle3: { label: 'Ouvrir la Grande Galerie', cost: 9000, desc: '+6 vitrines à l\'étage.' },
    temp: { label: 'Ouvrir la salle des expositions temporaires', cost: 6000, desc: 'Permet les expositions temporaires (+5 vitrines).' },
    bench: { label: 'Poste de travail supplémentaire à l\'atelier', cost: 3500, desc: '+1 poste (maximum 4).', max: 4 },
    reserve: { label: 'Extension des réserves', cost: 2500, desc: '+10 emplacements.' },
    shop: { label: 'Agrandir la boutique', cost: 3000, desc: 'Les visiteurs dépensent davantage.', max: 3 },
  };

  /* ---------------- Musées demandeurs de prêts (fictifs) ---------------- */
  D.BORROWERS = ['Musée d\'histoire de Valcourt', 'Muséum de Port-Aurèle', 'Galerie nationale de Belmont', 'Musée départemental de Lussac', 'Maison de l\'Archéologie de Brévannes'];

  /* ---------------- Vendeurs d'antiquités (fictifs) ---------------- */
  D.SELLERS = ['Galerie Duval & Fils', 'Maison de ventes Lerouge', 'Succession du docteur Marchal', 'Collection privée Ferrières', 'Antiquités Bénazet'];

  /* ---------------- Collection de départ : legs fondateur ---------------- */
  D.START_COLLECTION = [
    { type: 'biface', condition: 88, studied: 100, room: 'salle1', slot: 0, prov: 'Legs du Dr Aubertin (1932), ramassé à Saint-Acheul' },
    { type: 'dressel', condition: 62, studied: 45, room: 'salle1', slot: 1, prov: 'Legs du Dr Aubertin (1932), trouvé en Auvergne' },
    { type: 'lampeRom', condition: 74, studied: 30, room: 'salle2', slot: 0, prov: 'Legs du Dr Aubertin (1932), acheté à Marseille' },
    { type: 'scarabee', condition: 81, studied: 60, room: 'hall', slot: 0, prov: 'Legs du Dr Aubertin (1932), souvenir de voyage en Égypte (1911), certificat d\'exportation conservé' },
    { type: 'carreau', condition: 45, studied: 10, room: null, prov: 'Don de la paroisse de Saint-Aignan (1958)' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
