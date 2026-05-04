# GEMINI.md - Projet Endeavor (INBTP)

Ce fichier définit les instructions fondamentales, l'architecture et les standards de développement pour le projet Endeavor. Ces règles priment sur tout comportement par défaut.

## 🏗️ Architecture & Flux de Données

### 1. Séparation des Responsabilités
- **API Interne (`src/app/api/**`)** : Exclusivement pour la logique locale (Mongo local, composition UI, autorisations spécifiques au frontend).
- **Server Actions (`"use server"`)** : Point de passage OBLIGATOIRE pour consommer les microservices externes.
- **Microservices** :
    - `ETUDIANT_SERVICE` : Gestion des parcours, ressources (stages, sujets, labos) et commandes.
    - `TITULAIRE_SERVICE` : Gestion des charges horaires, séances, présences et notes.

### 2. Communication avec les Services
- Utiliser les helpers dédiés : `fetchEtudiantApi`, `fetchTitulaireService`.
- **Règle d'URL** : Passer uniquement des chemins relatifs (ex: `/parcours`). Le helper gère la base et le segment `/api`.
- **Interdiction** : Ne jamais coder en dur des URLs complètes dans les composants ou les actions.

## 🎨 Standards UI/UX (Patterns Mandatoires)

### 1. Types de Pages
Respecter strictement les structures existantes :
- **Dashboard** : Vue d'ensemble, indicateurs, accès rapides.
- **PageManager** : Tableaux/Listes avec onglets, recherche, filtres et actions bulk.
- **PageDetail** : Informations approfondies d'une entité.
- **PageListe** : Listing avec sidebar de filtres.

### 2. Design System
- **Couleurs** :
    - `Primary`: `#058AC5` (CTA, Accents, bg-primary).
    - `Secondary`: `#E76067`.
    - `Black`: `#272826`.
    - `White`: `#FFFFFF`.
- **Composants** : Réutiliser en priorité `ResourceWorkspaceShell`, `ResourceMultiStepFormShell`, et les patterns de cartes "e-commerce".

## 🔐 Sécurité & Rôles
- **Validation Serveur** : Les contraintes de rôle (Admin, Organisateur, Gestionnaire, Titulaire, Student) doivent être vérifiées dans les Server Actions.
- **Bureaux (Organisateur)** : L'accès aux ressources dépend de l'affectation dans `Section.bureau` (ex: `chargeRecherche` pour les sujets).

## 🛠️ Guide de Développement

### 1. Priorité de Réutilisation
1. Composants UI/Layouts existants.
2. Workflows existants (Modals, Upload CSV, Search).
3. Actions et Services existants.
4. Nouvelles abstractions (seulement si nécessaire).

### 2. Gestion des Ressources (Services Étudiants)
- Les ressources (Sujets, Stages, etc.) sont créées avec le statut `inactive`.
- Activation via un `PATCH` dédié après validation.
- Le corps des `POST` doit être minimaliste (matière limitée à `reference` + `designation`).

### 3. Gestion des Notes (Titulaire)
- Les notes sont stockées ligne par ligne (1 ligne = 1 étudiant/matière/unité).
- Utiliser `/api/notes/bulk` pour les imports massifs.

## 📝 Conventions de Sortie (AI)
- Toujours citer les chemins de fichiers modifiés.
- Fournir des résumés concis des changements.
- Vérifier la cohérence avec les types TypeScript existants.

## 🛰️ Documentation des Microservices (API Reference)

### 1. TITULAIRE_SERVICE (Académique & Enseignants)
Base URL relative : `/api` (via `fetchTitulaireService`)

| Domaine | Endpoint | Méthode | Structure Clé |
| :--- | :--- | :--- | :--- |
| **Charges** | `/charges/all` | GET | `matiere`, `unite`, `promotion`, `titulaire`, `horaire`, `status` |
| **Notes** | `/notes/bulk` | POST | `[{ studentId, matricule, semestre: { reference }, unite, matiere, cc, examen }]` |
| **Séances** | `/seances/add` | POST | `charge_horaire`, `jour`, `heure_debut`, `heure_fin`, `date`, `salle` |
| **Présences**| `/presences/check`| POST | `{ matricule, email, seanceRef, latitude, longitude }` |

- **Notes** : Stockage granulaire par ligne (1 étudiant/1 matière).
- **Validation Géo** : Rayon de 30m autour de l'INBTP pour les présences.

### 2. ETUDIANT_SERVICE (Parcours & Ressources)
Base URL relative : `/api` (via `fetchEtudiantApi`)

| Domaine | Endpoint | Méthode | Structure Clé |
| :--- | :--- | :--- | :--- |
| **Parcours** | `/parcours` | GET/POST | `student` (email, matricule, nom), `programme`, `annee`, `status` |
| **Ressources**| `/resources` | GET/POST | `categorie` (labo, stage, sujet, session, validation, releve), `branding` |
| **Commandes** | `/commandes` | POST | `type`, `parcoursId`, `ressourceId`, `telephone`, `payment` |

- **Discriminants Ressources** : Le corps du `POST` varie selon la `categorie` (ex: `matiere` pour labo, `lecteurs` pour sujet).
- **Statuts Parcours** : `inscrit`, `suspendu`, `abandon`, `diplômé` (affiché `Finaliste`).

## 🧠 Règles de Style & Cohérence (Anti-Mal de Tête)

### 1. Zéro Hexadécimal Hardcodé
- **INTERDICTION** : Ne jamais utiliser de codes hexadécimaux (`#058AC5`, `#082b1c`, etc.) dans les classes Tailwind.
- **OBLIGATION** : Utiliser les tokens du thème : `primary`, `darkprimary`, `secondary`, `midnight_text`, `darkmode`, etc.
- **Réflexe** : Si tu vois un ancien code couleur (ex: `#082b1c`, `#5ec998`), **REFACTORE-LE** immédiatement vers les tokens `primary` ou `darkprimary`.

### 2. Le "Dock Style" est la norme
- Le menu flottant en bas à droite est un **Dock horizontal**.
- Toute modification du menu utilisateur ou du switch de thème doit respecter ce pattern (Glassmorphism, bords arrondis full, icônes Solar).

### 3. Icônes & Éléments Visuels
- **Standard** : Utiliser `@iconify/react` avec le jeu d'icônes `solar:` (ex: `solar:user-bold`).
- **Animations** : Utiliser les classes d'animation définies dans `globals.css` (`animate-dashboard-in`, `metrics-item-fade`) pour les nouveaux éléments UI.
- **Dates** : Utiliser exclusivement l'utilitaire `src/utils/formatDate.ts` pour parser et afficher les dates en français (`formatNaturalDate`, `formatShortDate`, `formatStandardDate`).

### 4. Proactivité de Refactoring
- Lors de l'édition d'un fichier, si tu identifies des composants qui ne respectent pas la charte graphique (couleurs, espacements, ombres), propose ou effectue leur refactorisation vers le standard actuel.
