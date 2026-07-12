#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="${HOME}/.lmstudio/extensions/plugins/esalesninja/memory"

cd "$ROOT"

npm run build

# Runtime loads compiled JS — installed plugins have no src/ (.lmsignore)
sed -i 's|src/index.ts|dist/index.js|g' "$ROOT/.lmstudio/entry.ts"

mkdir -p "$INSTALL_DIR/.lmstudio"
cp "$ROOT/.lmstudio/entry.ts" "$INSTALL_DIR/.lmstudio/entry.ts"
rm -f "$INSTALL_DIR/.lmstudio/production.js"

lms dev --install -y --no-notify

# lms may regenerate entry with src/ — enforce dist import and rebundle
sed -i 's|src/index.ts|dist/index.js|g' "$INSTALL_DIR/.lmstudio/entry.ts"
sed -i 's|src/index.ts|dist/index.js|g' "$ROOT/.lmstudio/entry.ts"

if grep -q 'src/index.ts' "$INSTALL_DIR/.lmstudio/production.js" 2>/dev/null; then
  rm -f "$INSTALL_DIR/.lmstudio/production.js"
  lms dev --install -y --no-notify
  sed -i 's|src/index.ts|dist/index.js|g' "$INSTALL_DIR/.lmstudio/entry.ts"
fi

# Dynamic import path is inlined in the bundle
sed -i 's|src/index.ts|dist/index.js|g' "$INSTALL_DIR/.lmstudio/production.js"

mkdir -p "$INSTALL_DIR"
cp -r "$ROOT/dist" "$INSTALL_DIR/dist"

if [[ ! -f "$INSTALL_DIR/.lmstudio/production.js" ]]; then
  echo "Error: production bundle not found at $INSTALL_DIR/.lmstudio/production.js" >&2
  exit 1
fi

if grep -q 'src/index.ts' "$INSTALL_DIR/.lmstudio/production.js"; then
  echo "Error: production.js still imports src/index.ts" >&2
  exit 1
fi

mkdir -p "$ROOT/.lmstudio"
cp "$INSTALL_DIR/.lmstudio/production.js" "$ROOT/.lmstudio/production.js"
echo "Production bundle written to .lmstudio/production.js"
