# Camping Tycoon — JLG Creative

Jeu de gestion de camping en français : reprenez un petit camping au bord d’un lac et faites-en un domaine réputé, saison après saison.

## Lancer le jeu

Aucune installation, aucune compilation : HTML, CSS et JavaScript.

- **Le plus simple** : double-cliquez sur `index.html` (Chrome, Edge, Firefox, Safari).
- **Serveur local** (recommandé pour tablette/téléphone sur le même Wi-Fi) :
  ```bash
  python3 -m http.server 8080     # ou : npm start
  ```
  puis ouvrez `http://localhost:8080` (ou `http://IP-de-l-ordinateur:8080` sur la tablette).
- **Hébergement HTTPS** : copiez le dossier tel quel sur n’importe quel hébergement statique (GitHub Pages, Netlify, OVH…).

## Tests

```bash
node --test tests/*.test.js      # ou : npm test   (Node 18+)
```

37 tests (dont emprunt, animations, améliorations, snack-bar, événements, avis) : réservations simultanées (pas de double attribution), capacité maximale, arrivées/départs et rotation le même jour, facturation (acompte 30 % + solde, tarif verrouillé, annulation), salaires, cohérence trésorerie/grand livre, déplacements sur les allées uniquement, capacité des équipements, sauvegarde/reprise, migration et rejet de fichiers invalides, saison complète avec bilan, construction et démolition protégée.

## Architecture

| Fichier | Rôle |
|---|---|
| `src/data.js` | Données : bâtiments, profils clients, personnel, objectifs, calendrier |
| `src/sim.js` | Simulation pure, sans DOM (testable sous Node) : carte, chemins (champs de distance BFS), agents, files d’attente, réservations, facturation, météo, pannes, personnel, saisons, objectifs |
| `src/save.js` | Sérialisation versionnée, migration, sauvegarde auto (localStorage), export/import JSON |
| `src/audio.js` | Sons synthétisés (Web Audio) : interface, oiseaux, grillons, pluie, musique de scène |
| `src/render.js` | Rendu Canvas 2,5D style BD (sprites dessinés en code, mis en cache), jour/nuit, météo |
| `src/ui.js` | Interface, boucle de jeu, souris/tactile/clavier, panneaux |
| `tests/` | Tests Node |

L’état persistant est un simple objet JSON ; tout ce qui est transitoire (personnages en mouvement, files) vit dans `s.rt` et est reconstruit au chargement (les vacanciers présents sont alors replacés chez eux).

## Nouveautés v1.1

- Logo officiel (`assets/logo.svg`, `assets/logo-mark.svg` + exports PNG), écran titre animé, favicon.
- Scène d’animation + métier d’animateur : club enfants 15h–17h, spectacle 20h–22h (annulé s’il pleut), objectif « Ambiance du soir », exigé pour le 5★.
- Banque : emprunts de 10 000 à 100 000 € (capacité = 20 000 € + 50 % de la valeur des installations), 4,5 %/an, remboursement quotidien sur 300 jours d’ouverture, remboursement anticipé (+1 %).
- Sons et ambiance sonore, coupables (bouton 🔊 ou menu).

## Nouveautés v1.4 — The Living Camping

- **IA comportementale** : les besoins de chaque vacancier (énergie, faim, hygiène, loisirs, vie sociale) évoluent réellement selon l'heure, la météo et ses activités.
- **Choix de destinations par utilité** : services ouverts, durée d'attente, distance, profils familiaux et intérêt de la promenade influencent la décision.
- **Familles accompagnées** : un enfant qui rejoint un loisir part avec un adulte (sauf club enfants encadré). L'adulte reste jusqu'à ce que l'enfant termine son activité.
- **Promenades** : choix de chemins reliés selon les vues et aménagements, temps de contemplation avant le retour.
- **Satisfaction et avis** : les besoins non satisfaits affectent l'expérience vécue et les avis.
- **Personnages animés** : tenue persistante, balancement des bras à la marche, orientation, assise au repos, réactions à une longue file d'attente.
- **Indicateurs vivants** : humeur moyenne, vacanciers en activité, faim/fatigue, activité des services et sorties en groupe dans les réservations ; historique dans le bilan de saison.
- **Correctifs V1.3.1 intégrés** : version du menu correcte, vérification des mises à jour PWA, fermeture ponctuelle de la scène, reprise des anciennes sauvegardes.
- **Hasard indépendant de l'économie** : la vie quotidienne ne modifie pas les tirages de demande des futurs clients.
- **31 tests moteur** (23 historiques + 8 nouveaux), simulations intégrales de deux saisons, conservation de la clé de sauvegarde et de l'identité de la PWA.

## Nouveautés v1.3

- **Pilotage des 14 prochains jours** dans Réservations et Finances : nuits confirmées, taux d'occupation et recettes contractées par hébergement.
- **Trésorerie prévisionnelle prudente** : soldes restant à encaisser, charges fixes et échéances d'emprunt distinguées des revenus déjà perçus. Les futures demandes restent inconnues.
- **Alertes réservations** quand un hébergement assigné est en panne ou inaccessible.
- **Progression réparée** : les 4 étoiles et l'objectif « Une vraie équipe » exigent les métiers accueil, entretien et maintenance sans pénaliser le recrutement d'un animateur ; les 5 étoiles redeviennent accessibles.
- **4 nouveaux tests de régression**. Sauvegardes inchangées, cache PWA actualisé pour les appareils déjà installés.

## Nouveautés v1.2

- **Décisions de directeur** : 12 événements à choix (contrôle sanitaire, motards, influenceuse, tour-opérateur, campagne radio, concurrent, fuite d’eau, augmentation, canicule, mariage, festival, subvention).
- **Améliorations niveau 2** : mobil-home Premium (+30 %), Sanitaires Confort, Supérette, Toboggan aquatique, Accueil & conciergerie, Scène couverte, Restaurant-terrasse.
- **Snack-bar** (service midi et soir) et **feux d’artifice** du 14 juillet et du 15 août.
- **Avis des vacanciers** rédigés selon leur séjour réel (onglet 💬).
- **Tutoriel « Premiers pas »** en 7 étapes.
- **Tarifs** : supplément par personne au-delà de 2 (tentes et caravanes).
- **Bilan** : résultat d’exploitation séparé des investissements.
- **Équilibrage** vérifié par un joueur automatique : `node tools/bot.js [graine] [saisons] -v`.

## Commandes

- Espace : pause · 1/2/3 : vitesse · Échap : annuler l’outil · molette ou pincement : zoom · glisser : déplacer la vue (deux doigts sur tactile quand un outil est actif)
- Tactile : pour construire, touchez une fois pour placer le fantôme, une seconde fois dessus pour confirmer.

## Sauvegardes

Sauvegarde automatique chaque jour de jeu, toutes les 45 s et à la fermeture de l’onglet (avec une copie de la précédente). Menu ☰ → Exporter (fichier `.json` ou texte à copier) / Importer (fichier ou texte collé).

## Nouveautés v1.5 — Le Camping Vivant

- **2,5D enrichie sans changer de caméra** : mobilier et scènes de vie vectorielles sur les emplacements occupés (table, repas, détente, accessoires), animations de service au snack, jeux d'enfants et réactions pendant les spectacles.
- **Tarification selon la saison** : coefficients basse saison (avril-mai, septembre), moyenne saison (juin et fin août) et haute saison (juillet et début août). Plage ajustable ×0,70 à ×1,50, réservation calculée au jour d'arrivée et tarif garanti après confirmation.
- **Marge indicative par hébergement** : chiffre d'affaires des seules nuits réalisées, occupation, entretien propre à la parcelle et eau/énergie estimée. Ces chiffres ne constituent pas un bénéfice net : coûts communs, personnel, amortissements et taxes non attribués.
- **Pilotage du personnel** : stratégie de l'entretien (mobil-homes avant les arrivées ou sanitaires d'abord), maintenance urgente ou préventive ; les pannes restent prioritaires.
- **Anciennes parties compatibles** : les nouveaux réglages sont ajoutés à la migration, sans modifier la clé de sauvegarde ni imposer une réinstallation.
- **6 tests de non-régression supplémentaires**, 37 tests au total, plus validation de syntaxe Canvas et synchronisation de la version HTML autonome.

### Limites restant à valider

Les animations sont un enrichissement progressif du Canvas 2,5D existant, et non une nouvelle caméra isométrique. Les tests fonctionnels automatisés ne remplacent pas une vérification visuelle et une mesure de FPS sur téléphone physique. Le rendement par hébergement est analytique et indicatif, pas un compte de résultat comptable complet.
