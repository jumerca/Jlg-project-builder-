# TV Network Tycoon — Studio Edition V1.7

Jeu de gestion de réseau TV, édité par **JLG Creative**.

## Jouer / installer

Adresse publique : https://tv-network-tycoon-studio-jlg.onrender.com/

- Jeu jouable dans le navigateur du téléphone ou de l'ordinateur.
- Sur Android (Chrome ou navigateur compatible), ouvrir l'adresse puis choisir **Installer l'application** dans le menu, si l'option est proposée.
- En cas d'ancienne icône après une mise à jour, recharger la page. Si l'icône de l'application installée reste ancienne, une réinstallation peut être nécessaire après avoir exporté les sauvegardes.

## Identité V1.7

- Logo d'accueil : `icons/logo-wordmark.svg`.
- Icônes : `icons/icon-192.svg`, `icons/icon-512.svg`, `icons/icon-maskable.svg`.
- Icônes au format SVG valide, avec dimensions explicites.
- Cache PWA versionné dans `sw.js`.

## Sauvegardes

Les parties sont enregistrées localement (IndexedDB, avec mécanismes de secours selon les navigateurs). **Ne pas désinstaller ni effacer les données du navigateur sans exporter sa carrière JSON.** Une origine web différente ne récupère pas automatiquement les sauvegardes de l'ancien hébergement AppDeploy.

## Publication

Branche : `tv-network-tycoon-studio` ; dossier publié sur Render : `tv-network-tycoon`.

Le code du moteur, les studios animés, les sept profils de chaînes et la grille de programmation V1.7 sont conservés lors des mises à jour de la charte graphique.
