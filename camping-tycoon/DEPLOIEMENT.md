# Camping Tycoon — instructions de mise en ligne (pour un assistant IA ou un humain)

Jeu web statique (HTML/CSS/JS, aucune compilation, aucune dépendance). Dossier à publier tel quel : `camping-tycoon/` de ce dépôt.

## Fichiers
- `index.html` : point d'entrée
- `style.css`, `src/data.js`, `src/sim.js`, `src/save.js`, `src/audio.js`, `src/render.js`, `src/ui.js`
- `manifest.webmanifest` + `sw.js` : application installable (PWA), fonctionne hors ligne
- `assets/` : logo et icônes d'installation (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `icon-180.png` pour iPhone)
- `camping-tycoon-autonome.html` : tout le jeu en UN seul fichier (secours pour les hébergeurs qui n'acceptent qu'un fichier ; pas de mode hors ligne)
- Ne pas publier : `tests/`, `tools/`, `manifest-netlify.webmanifest`

## Exigence importante
Le jeu doit être servi **à la racine de son propre site** (ex. `https://camping-tycoon.netlify.app/`), et **pas** dans un sous-dossier de `jumerca.github.io/Jlg-project-builder-/` : cette adresse appartient déjà à l'application installée « JLG Project Lab 360 », qui capture les liens et empêche l'installation.

## Étapes
1. Récupérer le dossier : `https://github.com/jumerca/Jlg-project-builder-/tree/main/camping-tycoon`
   (archive complète du dépôt : `https://github.com/jumerca/Jlg-project-builder-/archive/refs/heads/main.zip`, puis garder le dossier `camping-tycoon/`).
2. Publier ce dossier comme site statique (Netlify, Vercel, Cloudflare Pages…), sans commande de build, répertoire de publication = racine du dossier.
3. Vérifier : la page s'ouvre sur l'écran titre « Camping Tycoon », Chrome propose « Installer l'application », l'icône est la tente rouge sur fond bleu.

Tests (facultatif) : `node --test tests/*.test.js` (Node 18+), 31 tests.

## Production v1.5.0 — Le Camping Vivant

Déploiement attendu sur le projet Vercel existant `camping-tycoon-jlg` avec le même domaine `https://camping-tycoon-jlg.vercel.app/`.

Conserver `campingTycoon.save.auto` et `campingTycoon.save.prev`. La migration initialise `seasonRates` et `staffPolicy` lorsqu'ils sont absents. Tester les 37 scénarios `node --test tests/*.test.js` avant publication. Le service worker porte la version `camping-tycoon-v1.5.0` et remplace l'ancien cache à l'activation.

Ne pas confondre le résultat financier du camping avec la marge indicative par hébergement : celle-ci exclut les frais communs, le personnel et les investissements.

## Version V1.6 — Exploitation & Ambiances

Publier la racine `camping-tycoon/` sur le projet Vercel existant `camping-tycoon-jlg`, sans changer le domaine HTTPS. Préserver le service worker version `camping-tycoon-v1.6.0`, les 11 icônes/logos du dossier assets, les scripts du projet, la sauvegarde locale `campingTycoon.save.auto` et le fichier HTML autonome.

Tests : `node --test tests/*.test.js` (44 tests). Les dépenses d'interventions sont enregistrées dans le grand livre avec catégorie Réparations ou Interventions extérieures. Un échec de validation n'altère ni les finances ni les équipements.

## V1.7.0 — publication & vérifications

Version et journal des modifications visibles dès l'écran d'accueil. Endpoint `/version.json` pour vérifier en ligne si la version en cours de session est à jour ; ne pas faussement annoncer une installation automatique si elle n'a pas eu lieu.

Cache PWA `camping-tycoon-v1.7.0`. Garder le domaine `https://camping-tycoon-jlg.vercel.app/` et la clé `campingTycoon.save.auto` sans migration destructive.

Bundle statique : `index.html`, `version.json`, `src/*.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `assets/*` et `camping-tycoon-autonome.html`.
`node --test tests/sim.test.js` : 53 tests de non-régression. Le mode découverte est facultatif et n'est utilisé que pour une **nouvelle** partie.

### Patch V1.7.1
L’endpoint de version annonce 1.7.1 et le cache PWA utilise `camping-tycoon-v1.7.1`. La fonction de vérification doit écrire son statut dans le modal courant (ARIA live), pas dans un toast caché derrière lui.
