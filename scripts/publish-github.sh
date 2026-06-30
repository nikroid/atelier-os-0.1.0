#!/usr/bin/env bash
# Publie atelier-os-v2 sur GitHub (après : gh auth login)
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null; then
  echo "Installez GitHub CLI : brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Connectez-vous d'abord : gh auth login"
  exit 1
fi

if [[ -f .env.local ]]; then
  CLIENT_ID=$(grep -E '^VITE_GOOGLE_CLIENT_ID=' .env.local | cut -d= -f2-)
  if [[ -n "${CLIENT_ID}" && "${CLIENT_ID}" != *your-client-id* ]]; then
    echo "→ Secret VITE_GOOGLE_CLIENT_ID sur GitHub"
    gh secret set VITE_GOOGLE_CLIENT_ID --body "${CLIENT_ID}" 2>/dev/null || true
  fi
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "→ Remote origin déjà configuré"
  git push -u origin main
else
  echo "→ Création du repo nikroid/atelier-os-v2 et push"
  gh repo create nikroid/atelier-os-v2 --public --source=. --remote=origin --push --description "Atelier OS v2 — PWA documentaire artistique (GitHub Pages)"
fi

echo ""
echo "✓ Repo : https://github.com/nikroid/atelier-os-v2"
echo "→ Activez Pages : Settings → Pages → Build and deployment → GitHub Actions"
echo "→ Site : https://nikroid.github.io/atelier-os-v2/"
echo "→ Google Cloud : ajoutez http://localhost:5191 et https://nikroid.github.io aux origines JS"
