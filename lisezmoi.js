"use strict";

// The file content of LISEZMOI.txt added to the zip file.
const lisezmoi = `
-------------------
Format des fichiers
-------------------

Cette archive contient la liste des étudiants en trois formats :
- .fr.csv : pour édition dans un tableur en version française
            (le séparateur décimal est « , » et le séparateur des champs est « ; »)
- .en.csv : pour édition dans un tableur en version anglaise
            (le séparateur décimal est « . » et le séparateur des champs est « , »)
- .txt : pour édition dans un éditeur de texte (le même que pour les .tex)

ATTENTION : Il est primordial que le format du fichier, CSV avec 4 colonnes dans l'ordre "Num", "NOM", "PRENOM", "Note", soit préservé lors du retour au secrétariat.

------------
Libre office
------------
C'est le tableur le plus adapté pour l'édition des .csv. Ça fonctionne aussi bien avec la version .en.csv que .fr.csv.
- Ouvrir le csv (par exemple avec clic droit « ouvrir avec »).
- Sélectionner le séparateur correspondant (« , » ou « ; »).
- Éditer le fichier.
- Lors de l'enregistrement, confirmer vouloir conserver le format « Texte CSV ».

------------
Google Drive
------------
Calc de Google Drive peut être utilisé pour éditer le fichier .csv. Souvent une seule version .en.csv est reconnue par votre Drive. Si elle n'est pas reconnue, il faut essayer la version .fr.csv.
- Ouvrir la page web de Calc.
- Glisser/déposer le fichier. Il sera automatiquement converti au format de Google.
- Éditer le fichier.
- Exporter le fichier en passant par le manu « Fichier / Télécharger / Valeurs séparées par des virgules (.csv) »

-----
Excel
-----
En fonction de votre version d'Excel, seule une des deux versions (.fr.csv ou .en.fr) sera automatiquement convertie en table de 4 colonnes. Essayer d'abord avec l'une, puis si ça ne fonctionne pas correctement, essayer l'autre.
- Ouvrir le csv (par exemple avec clic droit « ouvrir avec »).
- Prier pour que ça soit la bonne version, sinon recommencer avec l'autre version.
- Éditer le fichier.
- Lors de l'enregistrement confirmer vouloir conserver le format « CSV ».
`
