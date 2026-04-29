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

## Instruction de continuité pour prochains chats IA
- Respecter strictement:
  - API interne = local
  - Server Actions = services externes
- Vérifier d'abord les patterns existants avant d'ajouter un nouveau composant.
- Prioriser la cohérence visuelle actuelle (cards, modals, badges, pagination, filtres sidebar).
- Maintenir les règles de rôle côté serveur.
- Répondre avec résumés clairs des changements + chemins de fichiers.

