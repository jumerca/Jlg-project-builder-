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

19 tests (dont emprunt, animations, améliorations, snack-bar, événements, avis) : réservations simultanées (pas de double attribution), capacité maximale, arrivées/départs et rotation le même jour, facturation (acompte 30 % + solde, tarif verrouillé, annulation), salaires, cohérence trésorerie/grand livre, déplacements sur les allées uniquement, capacité des équipements, sauvegarde/reprise, migration et rejet de fichiers invalides, saison complète avec bilan, construction et démolition protégée.

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
