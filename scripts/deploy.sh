#!/usr/bin/env bash
# Deploy: build the SPA, copy it into firebase/app/, deploy hosting + functions + rules.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Fail fast if the Firebase project id was never set.
if grep -q "REPLACE_ME" "$ROOT/.firebaserc"; then
  echo "ERROR: .firebaserc still contains REPLACE_ME. Set your real Firebase project id first." >&2
  exit 1
fi

echo "→ Building app…"
cd "$ROOT/app"
npm run build

echo "→ Copying dist → firebase/app…"
rm -rf "$ROOT/firebase/app"
cp -r dist "$ROOT/firebase/app"

echo "→ Deploying…"
cd "$ROOT/firebase"
firebase deploy

echo "✓ Done."
