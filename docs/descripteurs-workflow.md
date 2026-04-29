# Workflow Descripteurs (Titulaire)

Ce document pérennise le fonctionnement de la page `titulaire/descripteurs` pour l'équipe de développement.

## Objectif

Permettre à un titulaire de définir et maintenir le descripteur de ses cours (charges horaires), avec sauvegarde dans `TITULAIRE_SERVICE`.

## Écrans et composants

- Page serveur: `src/app/(site)/(secure)/titulaire/descripteurs/page.tsx`
- Client principal: `src/app/(site)/(secure)/titulaire/descripteurs/TitulaireDescripteursClient.tsx`
- Actions serveur: `src/actions/titulaireDescripteurs.ts`
- UI réutilisée: `src/components/secure/PageManager.tsx`

## Chargement des données

`loadTitulaireDescripteursData()`:
- vérifie session titulaire;
- récupère les charges du titulaire (`/charges/all` filtré par matricule/email);
- normalise `descripteur` avec les 6 clés obligatoires.

Structure du descripteur:
- `objectif`
- `methodologie`
- `mode_evaluation`
- `penalties`
- `ressources`
- `plan_cours`

Chaque clé est un tableau de sections:
- `{ title: string; contenu: string[] }`

## Layout PageManager

- Tabulation: une entrée par charge (`matière + promotion`).
- Contenu: cartes propriétés du descripteur.
- Affichage en grille 3 colonnes (`listLayout="grid-3"`).

Chaque carte affiche:
- nom de la propriété;
- description contextualisée;
- nombre de sections existantes;
- bouton `Éditer`.

## Modal d'édition (30% / 70%)

### Colonne 30% (Sections)
- lister sections existantes;
- ajouter section;
- sélectionner section active;
- supprimer section.

### Colonne 70% (Contenus)
- éditer le titre de la section;
- ajouter/éditer/supprimer les lignes de contenu (`contenu[]`).

## Règles métier

### `plan_cours`
- `title` = chapitre;
- `contenu[]` = points du chapitre.

### `ressources`
- `title` = ouvrage;
- `contenu[]` = description (incluant auteur/référence).

### autres propriétés
- `title` = point;
- `contenu[]` = paragraphes.

## Sauvegarde

Action: `saveChargeDescripteur({ chargeId, descripteur })`

API appelée:
- `PUT /charges/update/:id`
- payload partiel:
  - `{ descripteur: { ... } }`

Nettoyage avant envoi:
- trim des titres;
- suppression des lignes `contenu` vides;
- suppression des sections complètement vides.

## Breadcrumb / menu

- Menu titulaire: `Descripteurs` -> `/titulaire/descripteurs` (déjà présent).
- Breadcrumb: `/titulaire/descripteurs` -> `Descripteurs de cours`.

## Points d'attention

- Ne jamais casser la structure complète des 6 clés du descripteur.
- Toujours garder la normalisation côté action serveur (retro-compat données incomplètes).
- Éviter d'ajouter des champs hors schéma dans `descripteur`.
