# GitHub Actions: Docker vers Docker Hub

Ce projet publie automatiquement l'image Docker `inbtp/elmesacad-section`.

## 1) Secrets GitHub a ajouter

Dans GitHub: `Settings` > `Secrets and variables` > `Actions` > `New repository secret`

- `DOCKERHUB_USERNAME`: `inbtp`
- `DOCKERHUB_TOKEN`: token Docker Hub (pas le mot de passe)

## 2) Workflow configure

Fichier: `.github/workflows/docker-publish.yml`

Declenchement:
- `push` sur `main`
- `push` d'un tag `v*` (ex: `v0.1.0`)
- execution manuelle (`workflow_dispatch`)

Tags pushes:
- `inbtp/elmesacad-section:0.1`
- `inbtp/elmesacad-section:main` (si push sur main)
- `inbtp/elmesacad-section:vX.Y.Z` (si tag git)
- `inbtp/elmesacad-section:sha-...`

## 3) Lancer la publication

Option A (auto):
- push sur `main`

Option B (version):
- creer un tag puis push
  - `git tag v0.1.0`
  - `git push origin v0.1.0`

Option C (manuel):
- onglet `Actions` > `Docker Publish` > `Run workflow`
