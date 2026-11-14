# Musée & Expéditions — JLG Creative

Jeu de gestion et d'exploration archéologique en français. Vous dirigez un petit musée d'archéologie et d'histoire, organisez des expéditions, étudiez et restaurez vos découvertes, puis les exposez devant un public dont les goûts orientent la réussite du musée.

## Jouer

- **En ligne** : ouvrez le lien HTTPS de l'artifact.
- **En local** : ouvrez `index.html` dans un navigateur récent (double-clic). Aucun serveur ni installation n'est nécessaire.
- Le bouton **Semaine suivante ▶** fait avancer le temps. La partie est sauvegardée automatiquement dans le navigateur.

### La boucle de jeu
1. **Carte** : choisissez un site, demandez l'autorisation à l'institution locale, préparez la mission (type, durée, équipe, équipement, budget).
2. **Expéditions** : suivez le chantier animé et le carnet de fouille. Chaque découverte reçoit un numéro d'inventaire (`MEX-0001`…) qui ne change plus.
3. **Déballage** : à l'arrivée des caisses, dégagez chaque objet au pinceau.
4. **Atelier** : restauration (état) et étude (fiche historique, science, publications). Postes et personnel limités.
5. **Musée** : vitrines, thèmes de salle, éclairage, ordre du parcours ; exposition temporaire.
6. **Visiteurs & finances** : billetterie, boutique, dons, subventions et charges financent la mission suivante.

### Installer comme une application
Le jeu est une application web installable (icône, plein écran, fonctionnement hors ligne) dès qu'il est servi en HTTPS à sa propre adresse :
1. Déposez le dossier `musee-expeditions` sur un hébergement statique HTTPS (GitHub Pages, Netlify Drop, OVH…).
2. Ouvrez l'adresse : le bouton **⤓ Installer** apparaît (Chrome, Edge, Android). Sur iPhone/iPad : Safari → Partager → *Sur l'écran d'accueil*.
3. Le logo du jeu devient l'icône de l'application.

Fichiers concernés : `manifest.webmanifest`, `sw.js` (mise en cache hors ligne), `icons/` (logo SVG, icônes 32 à 512 px, versions « maskable » pour Android, icône Apple, logotype).
L'aperçu intégré à claude.ai reste jouable en HTTPS mais n'autorise pas l'installation.

### Vue 3D
- Le musée et les chantiers s'affichent en **vraie 3D** (WebGL), dans un style BD : aplats ombrés, contours encrés, ombres portées.
- **Souris** : glisser pour tourner, molette pour zoomer, clic droit ou Maj + glisser pour se déplacer. **Tactile** : un doigt pour tourner, deux doigts pour zoomer et se déplacer.
- Boutons ⟲ ⟳ ＋ － ⌂ en bas à droite ; touchez une vitrine pour ouvrir la fiche de son objet, une salle pour la gérer.
- Bouton **2D** pour revenir à la vue en coupe façon BD (aussi dans ⚙). Si l'appareil n'a pas WebGL, le jeu passe automatiquement en 2D.

### Sauvegarde
- Automatique (localStorage) à chaque action.
- ⚙ → **Exporter** : fichier `.json` ou code texte `MEX1:…` à copier. **Importer** : fichier ou code collé.
- Dans l'aperçu intégré claude.ai, le téléchargement de fichier est bloqué : utilisez « Copier le code ».

## Structure du code

| Fichier | Rôle |
|---|---|
| `js/core.js` | Espace de noms, hasard reproductible (graine dans la sauvegarde), utilitaires |
| `js/data.js` | Données : périodes, matériaux, 36 types d'objets avec fiches historiques, sites, institutions, équipe, salles, publics, subventions |
| `js/objects.js` | Objets individualisés, transitions de lieu contrôlées, historique |
| `js/expeditions.js` | Autorisations, partenariats, planification, événements de terrain, tables de découvertes, transport, partage |
| `js/conservation.js` | Atelier (postes, restauration, étude), réserves, usure à la lumière |
| `js/exhibitions.js` | Vitrines, thèmes, parcours, expo temporaire, prêts entrants/sortants, dépôts, acquisitions documentées |
| `js/visitors.js` | Simulation des publics (intérêts, fatigue, éclairage, prix) et raisons de satisfaction |
| `js/finances.js` | Billetterie, boutique, dons, subventions, charges, travaux, recrutement |
| `js/sim.js` | Déroulement d'une semaine, objectifs |
| `js/state.js` | Nouvelle partie, sauvegarde, export/import, migration |
| `js/art.js` | Illustrations vectorielles des objets (style ligne claire, usure visible) |
| `js/render.js` | Vue BD 2D (musée en coupe, chantiers) et carte |
| `js/gl3d.js` | Moteur WebGL maison sans dépendance : maillages, ombrage « BD », ombres, contours, transparence, sprites, caméra orbitale, sélection |
| `js/scene3d.js` | Musée 3D (salles, vitrines, éclairage, atelier, réserves, boutique, visiteurs animés) et dioramas des six chantiers |
| `js/ui.js`, `js/main.js` | Interface responsive (téléphone et ordinateur) |

Le moteur (`core` → `sim`) n'utilise pas le DOM : il est testable en Node.

## Tests

```bash
node tests/run-tests.js        # 24 tests du moteur, sans dépendance
node tests/e2e.js captures/    # parcours joueur complet dans Chrome (Playwright) + captures
```

Le test navigateur vérifie aussi l'affichage 3D, la sélection d'une vitrine au toucher dans la scène et la bascule 2D/3D.

Couverture : mission complète jusqu'à l'exposition, stabilité des identifiants (y compris après sauvegarde), capacités de l'atelier, prêts entrants/sortants et dépôts, billetterie et grand livre, reprise de sauvegarde à l'identique, import/export, endurance sur 100 semaines.

## Limites de cette première version
- Un seul musée, six sites, 36 types d'objets ; pas encore de deuxième spécialité (beaux-arts, histoire naturelle).
- Les visiteurs sont simulés par échantillon (60 profils par semaine), puis extrapolés ; leurs déplacements à l'écran sont illustratifs.
- En 3D, l'agencement des salles et la place des vitrines sont fixes : on choisit ce qu'on expose, pas où poser chaque meuble.
- Les objets exposés sont des illustrations dressées dans les vitrines (toujours tournées vers la caméra), pas des modèles 3D sculptés.
- Le moteur 3D est fait maison (Three.js n'était pas téléchargeable dans l'environnement de construction) : sobre mais sans dépendance.
- Pas de son ni de musique.
- Équilibrage réglé pour une première campagne d'environ 30 à 60 semaines ; il demandera des retours de joueurs.
- La sauvegarde automatique reste propre à un navigateur ; pour changer d'appareil, utilisez l'export.

Institutions, sites, musées et personnages sont fictifs.
