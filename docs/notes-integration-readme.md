# Notes Integration Guide (Programme <-> Titulaire Service)

Ce document décrit le flux de récupération des parcours, de mapping vers le `TITULAIRE_SERVICE`, puis de consolidation/affichage des notes dans une modal générique.

## 1) Endpoints utilisés pour le mapping programme -> notes

### Programme local (source de structure académique)
- `GET /api/sections/:id/programmes`
  - Liste les programmes d'une section (avec semestres/unites/matieres via populate).
- `GET /api/sections/:id/programmes/:programmeId`
  - Détail d'un programme (semestres -> unites -> matieres).
- `GET /api/sections/:id/programmes/:programmeId/notes-mapping`
  - Endpoint dédié au mapping notes.
  - Renvoie une structure plate exploitable:
    - `matiere { designation, reference, credits }`
    - `unite { designation, reference, code, credits }`
    - `semestre { designation, reference, credits }`
    - `key` stable (`semestreRef|uniteRef|matiereRef`)

### Service étudiant (source de parcours)
- `GET /api/parcours?...` (via Server Action `listParcoursForArchivage`)
  - Filtres: `annee`, `filiere`, `classe`, `search`, pagination.

### Service titulaire (source de notes)
- `GET /api/notes/student/:matricule` (via Server Action `fetchStructuredNotesByMatricules`)
  - Fiche structurée par étudiant:
    - `studentId`, `studentName`, `matricule`, `semestres[]`.
- `POST /api/notes/bulk` (via Server Action `sendRattrapageNotesBatch`)
  - Import bulk des notes.

---

## 2) Mécanisme de mapping (création, récupération, affichage)

### 2.1 Création des notes (import CSV)
1. Charger CSV.
2. Matcher chaque ligne au parcours (`matricule` et/ou `email`).
3. Mapper chaque matière locale vers une colonne CSV.
4. Construire les lignes payload:
   - étudiant depuis parcours (`email`, `matricule`, `studentId`, `studentName`)
   - contexte académique depuis `notes-mapping` (semestre/unite/matiere)
   - notes selon règle métier:
     - `X` ou vide => ignoré
     - `cc=0`, `examen=0`, `rachat=0`
     - `rattrapage=note`
5. Envoi en 10 lots séquentiels (`1..10`) avec feedback utilisateur.

### 2.2 Récupération des notes
- Au clic sur "Voir les notes", fetch lazy de `/notes/student/:matricule`.
- Cache local par matricule pour éviter les refetchs.

### 2.3 Affichage des notes
- Ne jamais afficher uniquement la structure externe brute.
- Construire une payload consolidée:
  - base = structure programme locale (semestres/unites/matieres),
  - enrichissement = notes externes mappées par:
    1) `matiere.reference` (`_id`) prioritaire,
    2) fallback `designation` normalisée.

---

## 3) Payload de présentation (modal générique)

Nom générique recommandé: `StudentConsolidatedResultModal`.

Payload attendue:

```ts
type ConsolidatedElement = {
  _id: string;
  designation: string;
  credit: number;
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
};

type ConsolidatedUnite = {
  _id: string;
  code: string;
  designation: string;
  credit: number;
  elements: ConsolidatedElement[];
};

type ConsolidatedSemestre = {
  _id: string;
  designation: string;
  credit: number;
  unites: ConsolidatedUnite[];
};

type ConsolidatedStudentPayload = {
  studentId: string;
  studentName: string;
  matricule: string;
  semestres: ConsolidatedSemestre[];
};
```

Cette payload est la source unique de la modal:
- colonne gauche: identité/parcours/résultat,
- colonne droite: tabs semestres + UEs + détails matières.

---

## 4) Fonctions de consolidation et calcul

### 4.1 Formules métier
- `noteMatiere = rachat ? rachat : ((cc + examen) > rattrapage ? (cc + examen) : rattrapage)`
- `MoyUnite = Somme(noteMatiere * creditMatiere) / unite.credit`
- `NCV = Somme(creditUnite si MoyUnite >= 10)`
- `NCNV = programme.credits - NCV` (borné/normalisé pour conserver l’égalité)

### 4.2 Décision jury et mention
- Décision:
  - `Passé` si `NCV >= 45`
  - `Double` sinon
- Mention (A-E) selon pourcentage local:
  - A >= 90, B >= 80, C >= 70, D >= 60, E < 60

### 4.3 Normalisations utiles
- Normalisation texte (`designation`) pour mapping fallback.
- Correction simple d’encodage des labels accentués.
- Arrondi des crédits (2 décimales) pour cohérence affichage.

---

## Réutilisation cible

Pour réutiliser chez titulaire, jury et étudiant:
- récupérer les parcours via le hook `useParcoursByActiveProgramme`,
- afficher la synthèse dans `StudentConsolidatedResultModal`,
- injecter la payload consolidée (structure locale + notes externes).

