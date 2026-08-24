# Registre des expéditions — SOKA

Application web autonome (HTML/CSS/JS, aucune dépendance) pour suivre les
expéditions client et transitaire, avec un visuel de progression (bateau)
et un accès direct aux dossiers Moovapps.

## Utilisation en local

Il n'y a rien à installer. Ouvre simplement `index.html` dans un navigateur
(Chrome, Edge, Firefox…), en local ou depuis n'importe quel serveur.

## Déploiement sur GitHub Pages

1. Crée un dépôt GitHub et mets-y les fichiers de ce dossier (`index.html`,
   `css/`, `js/`, `data/`) à la racine.
2. Dans le dépôt : **Settings → Pages → Source**, choisis la branche `main`
   et le dossier `/ (root)`.
3. Après quelques minutes, l'appli est accessible à une adresse du type
   `https://<ton-compte>.github.io/<nom-du-depot>/`.

## Fonctionnalités

- **Étapes personnalisables** : bouton *Étapes* dans l'en-tête — ajoute,
  renomme, réordonne ou supprime les étapes côté client et côté
  transitaire. L'ordre choisi détermine la progression affichée.
- **Import CSV** : *Importer CSV* relit un fichier `.csv` (ou du texte
  collé depuis Excel) et met à jour les envois existants (par référence)
  ou en ajoute de nouveaux. Format attendu, voir `data/exemple-envois.csv` :

  ```
  Référence,Client,Transitaire,Pays destination,Date création,Lien Moovapps,Étape client,Étape transitaire
  ```

- **Filtre par client** : clique sur le nom d'un client pour voir ses
  autres commandes en cours.
- **Lien Moovapps** : chaque fiche peut pointer vers le dossier
  correspondant.

## Stockage des données

Les envois et la liste des étapes sont stockés dans le `localStorage` du
navigateur — **propre à chaque appareil/navigateur**, sans compte ni
serveur. Pour transférer des envois vers cet appareil, utilise l'import CSV
(fichier `.csv` ou lignes collées depuis Excel).

⚠️ Si tu renommes ou supprimes une étape utilisée par des envois existants,
ces envois ne retrouveront pas automatiquement l'étape équivalente : il
faudra la resélectionner sur la fiche concernée.

## Structure du dépôt

```
index.html          page principale
css/style.css        mise en forme
js/app.js             logique de l'application
data/exemple-envois.csv  exemple de fichier CSV importable
```
