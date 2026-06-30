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

## Stockage images

Les photos (œuvres, artistes, modèles) sont stockées en **Blobs** dans IndexedDB (table `media`), avec 3 variantes générées à l’import :

| Variante | Usage |
|----------|--------|
| thumb (300 px) | grilles, listes |
| display (1600 px) | fiches, éditeur, PDF |
| original (3000 px max) | impression, pièces jointes |

Mode galerie : jusqu’à **20 images par œuvre**. Les imports lourds (iPhone, DSLR) sont acceptés sans préparation.

## Sauvegarde `.artdb`

Le fichier `.artdb` est une **archive ZIP** (format v2.0) :

```
manifest.json    ← données texte + références imageIds
media/           ← fichiers JPEG binaires par variante
```

Les anciens `.artdb` JSON (prototype v1.x) restent importables — les images sont migrées automatiquement.

## Prototype Netlify

L’ancienne version reste dans `../atelier-os` → https://atelier-os.netlify.app

Les sauvegardes v1 JSON sont importables dans v2 ; les exports v2 (ZIP) sont réservés à v2.

## Tests

```bash
npm test
```
