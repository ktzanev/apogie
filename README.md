# ApogIE

Le logiciel Apogée, utilisé à l'université de Lille pour la gestion des notes des étudiants, peut exporter et importer au format (quasi)`tsv` (comme `csv`, mais le séparateur est le caractère tabulation). Malheureusement ce fichier contient beaucoup trop d'informations et est très peu tolérant aux erreurs humaines.

Ce logiciel (page web) permet de convertir ces fichiers dans un format « lisible » (`csv` avec seulement 4 colonnes `Num`, `NOM`, `PRENOM`, `Note`). Et vice-versa.

# Sécurité

Tous les calculs sont effectués dans le navigateur. Aucune information n'est envoyée sur un serveur. Il s'agit d'une page [PWA](https://fr.wikipedia.org/wiki/Progressive_web_app) qui peut être installée et executée sans connexion internet.

# Licence

[MIT](LICENCE)
