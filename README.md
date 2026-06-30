# Atelier OS v2

**Compilateur documentaire artistique** — suite du prototype Netlify (`../atelier-os`).

Cette version est hébergée via **GitHub Pages** (pas Netlify).

## Stack

- React + TypeScript + Vite
- Dexie.js (IndexedDB)
- jsPDF + html2canvas
- PWA (installable, offline)
- Gmail API (OAuth côté navigateur)

## Démarrage local

```bash
cd atelier-os-v2
npm install
cp .env.example .env.local   # VITE_GOOGLE_CLIENT_ID
npm run dev
```

Ouvrir [http://localhost:5191](http://localhost:5191)

## GitHub Pages

1. Créer un repo GitHub **`atelier-os-v2`** (public recommandé)
2. Pousser ce dossier :

```bash
git init
git add .
git commit -m "Atelier OS v2 — base GitHub Pages"
git branch -M main
git remote add origin git@github.com:nikroid/atelier-os-v2.git
git push -u origin main
```

3. **Settings → Pages → Source** : **GitHub Actions**
4. Secret repo : `VITE_GOOGLE_CLIENT_ID` (même Client ID Google ou un second client)
5. Google Cloud → origines JS autorisées :
   - `http://localhost:5191`
   - `https://nikroid.github.io`

Le workflow `.github/workflows/deploy-pages.yml` build et déploie à chaque push sur `main`.

URL attendue : `https://nikroid.github.io/atelier-os-v2/`

## Prototype Netlify

L’ancienne version reste dans `../atelier-os` → https://atelier-os.netlify.app

Les fichiers `.artdb` sont compatibles entre les deux (export/import).

## Tests

```bash
npm test
```
