# QA Tennis Academy Manager

Ces tests vérifient automatiquement les clics sur le jeu public
https://tennis-dynasty-jlg.vercel.app

- Le site se charge sans erreur JavaScript bloquante
- L'académie conserve ses écrans de gestion
- Les onglets Personnel, Juniors, Professionnels et Contrats répondent
- Tous les métiers offrent des candidats et ouvrent une négociation
- La modification du salaire actualise la satisfaction
- La signature d'un entraîneur débite la trésorerie et laisse un contrat après rechargement
- Le formulaire fonctionne en affichage mobile Android simulé (Chromium Pixel 7)

**Les scénarios créent une carrière de test isolée dans un contexte temporaire.**
Ils ne touchent jamais aux sauvegardes de l'utilisateur.

Le workflow GitHub Actions est déclenché par les commits sur la branche
\`qa/tennis-academy-manager\`, pas par les commits sur \`main\`.

Il produit un rapport HTML, des captures et des traces en cas d'échec.
Un test en échec ne corrige pas automatiquement le jeu.

Les tests s'exécutent dans le projet de développement JLG sur une branche
entièrement distincte de \`main\`, parce que la connexion GitHub courante
ne permet pas de créer un nouveau dépôt.
