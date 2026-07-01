# Versioning Atelier OS

## Affichage

Le pied de page affiche uniquement `vMAJOR.MINOR.PATCH` (ex. `v2.1.0`), lu depuis `package.json`.

## Règles semver

| Segment | Déclencheur | Mécanisme |
|---------|-------------|-----------|
| **PATCH** (3e chiffre) | Hot-reload dev (modification dans `src/`) | Plugin Vite [`vite.atelier-version.ts`](../vite.atelier-version.ts) → `bumpPatch` dans `package.json` |
| **MINOR** (2e chiffre) | Déploiement Git (push vers `main` / GitHub Pages) | `npm run version:deploy` avant le commit de release (`minor++`, `patch = 0`) |
| **MAJOR** (1er chiffre) | Instruction explicite de l'utilisateur uniquement | Procédure manuelle ci-dessous |

## Déploiement (mineur)

Avant chaque push de déploiement :

```bash
npm run version:deploy
git add package.json
# inclure package.json dans le commit de release
```

Le CI GitHub Actions **ne** bump pas la version : il build la version déjà commitée.

## Version majeure (manuel)

Quand l'utilisateur demande une version **MAJEURE** (ex. `2.x.x` → `3.0.0`) :

1. Exécuter `node -e "import('./scripts/semver.mjs').then(m => m.writePackageVersion(m.bumpMajor(m.readPackageVersion())))"` ou éditer `package.json` → `3.0.0`
2. **Archiver** le dossier courant, ex. :
   - `/Applications/MAMP/htdocs/atelier-os-v2` → `atelier-os-v2-archive` ou `atelier-os-v2.2.x-backup-YYYY-MM-DD`
3. **Continuer le développement** dans un nouveau dossier nommé d'après la version, ex. `atelier-os-v3`
4. Mettre à jour le remote Git / repo si nécessaire
5. Ne jamais bumper le MAJOR sans demande explicite de l'utilisateur

## Fichiers clés

- [`package.json`](../package.json) — source de vérité `version`
- [`scripts/semver.mjs`](../scripts/semver.mjs) — parse / bump semver
- [`scripts/version-deploy.mjs`](../scripts/version-deploy.mjs) — bump mineur pour release
- [`src/version.ts`](../src/version.ts) — label affiché dans l'app

## Obsolète (ne plus utiliser)

- `build-info.json` / `#NNN` build number
- `config.codename` (ex. `github-pages`)
- Badge « Hors ligne » dans la sidebar
