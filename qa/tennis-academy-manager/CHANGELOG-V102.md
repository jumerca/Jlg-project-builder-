# Tennis Academy Manager V10.2 — QA de stabilisation

Déploiement officiel : `dpl_29hgrmA6nsb4LWZuLMqUT9yKFTjQ`
Clone QA testé : `dpl_BxVDLPpuKKxuyvn7H5kiaUQnzjud`
GitHub Actions : https://github.com/jumerca/Jlg-project-builder-/actions/runs/38870055376

## Contrôles automatisés

41 tests réussis, aucun échec, un test volontairement ignoré selon le profil.
Exécutés sur Chromium desktop et profil Android simulé.

## Correction ciblée

Le module V5 lit les contrats salariés signés dans le marché V10 avant le calcul
financier, la navigation et la sauvegarde `pagehide`. Le recrutement reste
visible après rechargement. Les résiliations V5 retirent aussi le contrat V10
pour éviter de ressusciter un ancien employé.

Le moteur, les 16 types d'installations et les autres modules conservent leurs
fichiers inchangés entre la V10.1 et la V10.2, hormis le script de démarrage et
le service worker.

## Limites

Les tests n'épuisent pas tous les parcours de plusieurs années, les contrats
expirés ou les combinaisons financières complexes. Aucun test sur appareil
Android physique n'a été réalisé.

## Retour arrière

Version V10.1 : `dpl_HJdTHuQ69KyvnVvmuMnRTLWHfYnL`.
