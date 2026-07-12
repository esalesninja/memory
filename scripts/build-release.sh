#!/usr/bin/env bash
set -euo pipefail

# Build a Hub-ready artifact in ./release/ (compiled JS only, no TypeScript source)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/release"

cd "$ROOT"

npm run build:production

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/.lmstudio" "$RELEASE_DIR/dist"

cp "$ROOT/manifest.json" "$RELEASE_DIR/"
cp "$ROOT/package.json" "$RELEASE_DIR/"
cp "$ROOT/LICENSE" "$RELEASE_DIR/"
cp "$ROOT/README.md" "$RELEASE_DIR/"
cp "$ROOT"/Remember_*.png "$RELEASE_DIR/" 2>/dev/null || true
cp -r "$ROOT/dist/." "$RELEASE_DIR/dist/"
cp "$ROOT/.lmstudio/entry.ts" "$RELEASE_DIR/.lmstudio/entry.ts"
cp "$ROOT/.lmstudio/production.js" "$RELEASE_DIR/.lmstudio/production.js"

echo "Release artifact ready in $RELEASE_DIR"
echo "Push with: cd release && lms push"
