# Fiche de cotation (Titulaire) - Guide développeur

Ce document explique le fonctionnement de la plateforme côté `titulaire/notes`, depuis le `PageManager` jusqu'au `PageDetail`, avec les règles de calcul et le workflow d'import.

## Objectif fonctionnel

Permettre à un enseignant titulaire de:
- choisir une matière issue de sa charge horaire;
- choisir une année académique;
- charger les étudiants (parcours) concernés par ce cours;
- saisir/importer les 4 cotes (`CC`, `EXAMEN`, `RATTRAPAGE`, `RACHAT`);
- enregistrer en masse (create/update) vers `TITULAIRE_SERVICE`.

## Composants clés

- `src/app/(site)/(secure)/titulaire/notes/page.tsx`
  - Page serveur du manager.
- `src/app/(site)/(secure)/titulaire/notes/TitulaireNotesManagerClient.tsx`
  - `PageManager` côté client, tab matière + cartes années.
- `src/app/(site)/(secure)/titulaire/notes/detail/page.tsx`
  - Entrée serveur du détail.
- `src/app/(site)/(secure)/titulaire/notes/detail/TitulaireNotesDetailClient.tsx`
  - Vue cotation étudiant + métriques + import 3 étapes.
- `src/actions/titulaireNotesWorkflow.ts`
  - Toutes les actions serveur (charges, parcours, notes CRUD/bulk).
- `src/lib/notes/transientParcoursCache.ts`
  - Cache `sessionStorage` pour transférer les parcours manager -> detail.

## 1) Workflow PageManager

### 1.1 Chargement initial (serveur)

`loadTitulaireNotesManagerData()`:
- vérifie session `titulaire`;
- lit les charges horaires du titulaire (`/charges/all`);
- extrait les matières en tabulation;
- charge les années académiques locales.

### 1.2 Interaction utilisateur

Dans `TitulaireNotesManagerClient`:
- tabulation = matières de la charge;
- cartes = années (4 par ligne en desktop);
- au clic `Fiche de cotation`:
  1. fetch parcours via `listParcoursForTitulaireWorkflow`;
  2. si vide: modal "Aucun étudiant n'est inscrit à ce cours";
  3. sinon: stockage en `sessionStorage` + navigation vers `/titulaire/notes/detail?cacheKey=...`.

## 2) Workflow PageDetail

### 2.1 Chargement des données

`TitulaireNotesDetailClient`:
- lit les parcours depuis `cacheKey`;
- ne garde que les statuts admissibles:
  - `inscrit*`
  - `*dipl*`
- récupère les notes cours:
  - structurées: `/notes/course/:matiereRef`
  - brutes: `/notes/all` filtrées sur `matiere.reference` (pour récupérer `_id` de ligne).

### 2.2 Fusion parcours + notes

Par étudiant:
- identité depuis parcours (`nom`, `email`, `photo`, etc.);
- contexte académique (`semestre`, `unite`, `matiere`) depuis la structure de notes cours;
- valeurs `cc/examen/rattrapage/rachat` depuis la ligne brute si existante;
- `noteId` pour déterminer update/delete.

Si aucun étudiant exploitable:
- état vide + bouton `Retourner en arrière`.

## 3) Règles de calcul métier

### 3.1 Total étudiant

Formule utilisée partout:

`total = rachat ? rachat : max(cc + examen, rattrapage)`

### 3.2 Gestion du zéro

- `0` est une vraie cote.
- absence de note = champ vide (`""`) côté UI.
- le total affiche `—` si aucune cote (ni existante, ni brouillon).

### 3.3 Métriques du header detail

4 cartes:
1. **Nombre de parcours** + **Nombre de cotes disponibles** (`disponibles / (parcours * 4)`).
2. **Désignation cours** + **crédit cours**.
3. **Étudiant meilleure note** + note.
4. **Étudiant plus faible note** + note.

> Note: une cote est "disponible" dès qu'un des 4 champs est présent en base, ou en brouillon local avant enregistrement.

## 4) Saisie et enregistrement

### 4.1 Saisie manuelle

Chaque carte étudiant contient 4 inputs:
- `CC`
- `EXAMEN`
- `RATTRAPAGE`
- `RACHAT`

Les modifications alimentent un state `staged` (brouillon global).

### 4.2 Enregistrement global

Bouton header `Enregistrer (N)`:
- pour étudiants avec `noteId`: `PUT /notes/update/:id`
- pour étudiants sans `noteId`: création en lot via `POST /notes/bulk`

## 5) Import CSV en 3 étapes

### Étape 1 - Modèle + upload

- téléchargement du modèle prérempli avec les étudiants affichés:
  - colonnes: `Email, Nom, CC, EXAMEN, RATTRAPAGE, RACHAT`
  - `Email`/`Nom` déjà remplis.
- upload réel de fichier `.csv`.

### Étape 2 - Mapping colonnes

L'enseignant mappe les colonnes source vers:
- `email`, `nom`, `cc`, `examen`, `rattrapage`, `rachat`.

Règle:
- colonne note non mappée => ignorée dans payload.

### Étape 3 - Construction + envoi lots

- construction payload par ligne:
  - match étudiant par email;
  - parsing notes (`X`/vide ignorés);
  - seules les colonnes mappées sont considérées.
- envoi en **10 lots séquentiels** (feedback de progression).

## 6) Endpoints utilisés (titulaire service)

- `GET /notes/course/:courseRef`
- `GET /notes/all`
- `POST /notes/bulk`
- `PUT /notes/update/:id`

## 7) Points de vigilance

- Toujours préserver `sessionStorage` key flow manager -> detail.
- Ne pas confondre "pas de cote" et `0`.
- Garder le parsing CSV tolérant (séparateur `,` ou `;`, guillemets).
- Éviter de bloquer la page en cas d'absence d'étudiants (utiliser modal/empty state).
