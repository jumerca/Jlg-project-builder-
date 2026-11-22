# JLG Média — édition indépendante Render

Application Node.js 22 en français, indépendante de Vercel. Dossiers rédigés et sourcés, brèves RSS avec attribution, rubriques locales, football/basket/rugby via ESPN et handball via TheSportsDB (couverture partielle). Les flux RSS sont des extraits, jamais présentés comme des reportages intégralement vérifiés.

## Local

`npm test` et `npm start`. Serveur sur `process.env.PORT || 3000`.

## Render

GitHub : branche `jlg-media-render` du dépôt jumerca/Jlg-project-builder-, dossier `jlg-media-render/` ; build `cd jlg-media-render && npm test` ; start `cd jlg-media-render && node server.js`. Le dépôt principal n'est pas modifié, branche séparée.

## Limites

Il s'agit d'une édition autonome reconstruite, **pas** d'une restauration ligne par ligne de l'ancienne application Vercel. Absence de données jamais transformée en zéro. Sources tierces sans garantie d'exhaustivité. L'API gratuite de TheSportsDB peut limiter à trois événements par requête. Aucune IA ne rédige automatiquement un long article sans validation éditoriale.
