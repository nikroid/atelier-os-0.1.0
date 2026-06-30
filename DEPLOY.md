# Déploiement — Atelier OS v2 (GitHub Pages)

> Prototype Netlify : voir `../atelier-os` et https://atelier-os.netlify.app

## GitHub Pages (production)

### 1. Repo GitHub

- Nom du repo : **`atelier-os-v2`** (doit correspondre au `base` Vite `/atelier-os-v2/`)
- Activer **Pages** → source **GitHub Actions**

### 2. Secret

**Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|--------|--------|
| `VITE_GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` |

### 3. Google Cloud OAuth

**Origines JavaScript autorisées** :

- `http://localhost:5191`
   - `https://nikroid.github.io`

**Domaines autorisés** (écran de consentement) : `github.io`

**Utilisateurs test** : chaque Gmail qui doit se connecter (mode Test).

Voir aussi la section Gmail dans l’ancien `DEPLOY.md` du prototype pour les scopes (`gmail.send`, etc.).

### 4. Déploiement

Push sur `main` → le workflow build + déploie automatiquement.

Build manuel local (aperçu du chemin Pages) :

```bash
GITHUB_PAGES=true npm run build
npx vite preview --base /atelier-os-v2/
```

## Données

Chaque utilisateur garde sa base **locale** (IndexedDB). Export `.artdb` depuis la barre latérale.

## Rappels

| | |
|---|---|
| Hébergement v2 | GitHub Pages (gratuit, repo public) |
| Prototype | Netlify — dossier `../atelier-os` |
| Mails | Gmail API — pas de serveur Atelier |
