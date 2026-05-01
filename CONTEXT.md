# CONTEXT - Endeavor Project

## Vision
Application de gestion académique et opérationnelle avec rôles (`admin`, `organisateur`, `gestionnaire`, `titulaire`, `student`) et workflows section/étudiants/finances.

Ce document sert de contexte de continuité pour les prochains chats IA.
---
## Règles d'architecture à respecter

### 1) API interne vs services externes
- **API interne** (`src/app/api/**`) : uniquement pour la logique locale/interne du projet (Mongo, scope local, composition UI, autorisations locales, etc.).
- **Server Actions** (`"use server"`) : pour consommer les microservices externes (`ETUDIANT_SERVICE`, `TITULAIRE_SERVICE`, etc.).

### 2) Communication avec services
- Ne pas passer d'URL complète en call site.
- Utiliser des chemins relatifs dans les helpers (`fetchEtudiantApi`, `fetchTitulaireService`).
- Ne pas rajouter `/api` en double.
- Avec `ETUDIANT_SERVICE=https://.../student/api`, le path attendu pour les parcours est typiquement `/parcours`.

### 3) Réutilisation maximale (pattern projet)
- Réutiliser d'abord l'existant (UI/UX/services/workflows/classes/helpers) avant de créer du nouveau.
- Priorité:
  1. composants/layouts existants
  2. workflows existants (modal, upload, search, CRUD)
  3. services/actions existants
  4. nouvelles abstractions si strictement nécessaire

### 4) Types de pages à respecter (pattern de structure)
- `Dashboard` : vue d'ensemble orientée rôle (indicateurs, accès rapides, blocs opérationnels).
- `PageManager` : gestion CRUD/listes avec tabs, recherche, bulk et cartes de création.
- `PageDetail` : détail d'une entité avec informations approfondies et actions contextuelles.
- `PageListe` (PageList) : page de listing/exploration avec sidebar filtres optionnelle.
- Règle: ne pas inventer une nouvelle structure si l'un de ces patterns couvre le besoin.

---

## Résumé de l'état actuel (Sprint 1)

## Sprint 1 - Gestion des parcours: **OK**

### Livrables couverts
- Programmes
- Charge Horaire (Organisateur.Chargé de l'enseignement)
- Autorisation section
- Création Parcours
- Validation Parcours

### Points importants implémentés
- Page dédiée parcours par programme+année: `/section/p/[programmeSlug]/[anneeSlug]`
- Dashboard gestionnaire orienté navigation vers pages dédiées (scalable pour gros volumes)
- Cartes étudiants style e-commerce (2 cartes par ligne)
- Upload CSV bulk (3 étapes) + progression
- Édition individuelle étudiant au clic carte (infos perso + photo)
- Statut parcours:
  - bulk: secrétaire
  - individuel: secrétaire
- Transcription UI des statuts:
  - `diplômé` affiché comme `Finaliste`
- Couleurs de cartes selon statut

---

## Backlog global projet (5 sprints)

## 1. Gestion des parcours => **OK**
- Programmes
- Charge Horaire (Organisateur.Chargé de l'enseignement)
- Autorisation section
- Creation Parcours
- Validation Parcours

## 2. Gestion des notes => **NO**
- Archivage des notes
- Fiche de cotation
- Document Jury (grille de délibération, palmarès, PV de délibération)
- Délibération (modification des notes)
- Recours

## 3. Gestion finance => **NO**
- Gestion des activités (titulaire)
- Retraits argent
- Supervision activité (organisateur)
- Gestion Ressources (gestionnaire)
- Commandes manuel

## 4. MVP Admin => **NO**
- Suivi des recettes (Organisateur.Chef de Section)
- Protocole de recherche (Organisateur.Chargé de la recherche)
- Dashboard Titulaire
- Dashboard Organisateur
- Dashboard Gestionnaire

## 5. Finitions => **NO**
- Refactoring App (image template dribbble, affinage charge graphique et design system)
- Home Page
- Workflow Formation
- Workflow Produits/Ressource
- Workflow Commande/Achat

---

## Ressources service étudiant : volet recherche (sujets & stages)

**Sujets** et **stages** font partie du **volet recherche** du service étudiant (offre liée au parcours recherche / fin d’études). Les **sujets** ne sont gérables que par le **chargé de recherche**. Les **stages** le sont par le **chargé de recherche** (priorité d’affectation si les deux rôles coexistent) ou par le **chargé d’enseignement** ; les encadrants stage restent contraints au **jury de cours** (`jury.cours`).

### Rôles et routes

| Type de ressource | Catégorie API (`categorie`) | Habilitation bureau | Route de gestion | Commandes (liste) |
|-------------------|----------------------------|---------------------|------------------|---------------------|
| **Sujet** | `sujet` | **Chargé de recherche** (`bureau.chargeRecherche`) | `/section/recherche/ressources-sujets` | `/section/recherche/ressources-sujets/sujets/[resourceId]` |
| **Stage** | `stage` | **Chargé de recherche** ou **chargé d’enseignement** (`bureau.chargeRecherche` prioritaire, sinon `bureau.chargeEnseignement`) | `/section/recherche/ressources-stages` | `/section/recherche/ressources-stages/stages/[resourceId]` |

Les **sujets** ne sont gérables que par le **chargé de recherche**. Les **stages** sont ouverts au **chargé de recherche** comme au **chargé d’enseignement** (voir `getOrganisateurStageBureauSection`) ; les deux relèvent du domaine **recherche** côté service étudiant.

Les deux parcours utilisent le rôle applicatif **`organisateur`** ; le **garde-fou** est l’affectation sur le bureau (champ Mongo `Section.bureau`). Les URL historiques `/section/enseignement/ressources-stages` redirigent vers `/section/recherche/ressources-stages`.

### Pour les développeurs

- **Server Actions**
  - **Ressources sujets** : `src/actions/organisateurSujetResources.ts` — réservé au **chargé de recherche** (`getOrganisateurChargeRechercheSection` → `bureau.chargeRecherche`).
  - Stages : `src/actions/organisateurStageResources.ts` — `getOrganisateurStageBureauSection` (chargé de **recherche** en priorité, sinon chargé d’**enseignement**).
- **Service étudiant** : appels via `fetchEtudiantApi` avec chemins relatifs (pas de double `/api`). Liste : `GET /resources?categorie=…&branding.sectionRef=…` ; mutations : `POST/PATCH/DELETE /resources` et `…/resources/:id`.
- **Création** : le corps `POST` suit le schéma validé par le microservice : `matiere` limité à `reference` + `designation` (pas de `status` ni `matiere.credit` sur le POST — évite les erreurs de validation). Après création réussie, le statut est forcé à **`inactive`** par un **`PATCH`** dédié (`patchOrganisateur…ResourceStatusAction`).
- **Publication** : interrupteur sur la carte (liste) → `PATCH` partiel `{ status: "active" | "inactive" }`.
- **Jury / encadrants**
  - Sujets : membres issus de `Section.jury.recherche` ; les « lecteurs » envoyés dans `lecteurs` doivent être dans ce jury.
  - Stages : idem avec `Section.jury.cours` ; les « encadrants » doivent être dans ce jury.
- **Commandes côté organisateur** : client générique `EtudiantResourceCommandesClient` + `listEtudiantResourceCommandesAction` (`context`: `sujet-recherche` | `stage-enseignement` — libellé API interne ; les deux types relèvent du volet recherche côté métier).
- **UI réutilisable** : `ResourceWorkspaceShell`, `ResourceMultiStepFormShell`, éditeur de description partagé `SujetResourceDescriptionEditor` (blocs `title` / `contenu[]`).

### Pour les utilisateurs (chef de parcours côté section)

1. **Ressources sujets** : être désigné **chargé de recherche** sur la section. Configurer le **jury de recherche** et les **programmes** de la section. Créer une ressource (multi-étapes), puis **activer** la publication sur la carte lorsque le sujet doit être visible sur le service étudiant. Les **commandes** des étudiants sont consultables depuis la carte « Demandes ».
2. **Ressources stages** : être désigné **chargé de recherche** ou **chargé d’enseignement** sur le bureau (volet **recherche** côté étudiant). Configurer le **jury de cours** (`jury.cours`) pour les encadrants. Même principe : création en **inactive**, activation par l’interrupteur, consultation des commandes par ressource.

Menu applicatif (**organisateur**) : **Ressources sujets (recherche)** et **Ressources stages (recherche)** — sujets = CR uniquement ; stages = CR ou CE ; chaque page vérifie l’affectation côté serveur.

---

## Instruction de continuité pour prochains chats IA
- Respecter strictement:
  - API interne = local
  - Server Actions = services externes
- Vérifier d'abord les patterns existants avant d'ajouter un nouveau composant.
- Prioriser la cohérence visuelle actuelle (cards, modals, badges, pagination, filtres sidebar).
- Maintenir les règles de rôle côté serveur.
- Répondre avec résumés clairs des changements + chemins de fichiers.

