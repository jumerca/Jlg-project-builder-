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

Tests (facultatif) : `node --test tests/*.test.js` (Node 18+), 23 tests.
