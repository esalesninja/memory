#!/usr/bin/env bash
set -euo pipefail

# Build a Hub-ready artifact in ./release/
# lms push cannot upload dot-paths like .lmstudio/, so Hub installs bundle from src/index.ts.
# We publish a one-file src/index.ts shim that re-exports compiled dist/index.js.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/release"

cd "$ROOT"

rm -rf "$RELEASE_DIR"
npm run build:production

mkdir -p "$RELEASE_DIR/src" "$RELEASE_DIR/dist"

cp "$ROOT/manifest.json" "$RELEASE_DIR/"
cp "$ROOT/LICENSE" "$RELEASE_DIR/"
cp "$ROOT/README.md" "$RELEASE_DIR/"
cp "$ROOT"/Remember_*.png "$RELEASE_DIR/" 2>/dev/null || true
cp -r "$ROOT/dist/." "$RELEASE_DIR/dist/"

cat > "$RELEASE_DIR/src/index.ts" <<'EOF'
export { main } from "../dist/index.js";
EOF

ROOT="$ROOT" node <<'EOF'
const fs = require("fs");
const path = require("path");
const root = process.env.ROOT;
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releasePkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: pkg.main,
  author: pkg.author,
  license: pkg.license,
  dependencies: pkg.dependencies,
};
fs.writeFileSync(
  path.join(root, "release/package.json"),
  JSON.stringify(releasePkg, null, 2) + "\n",
);
EOF

cat > "$RELEASE_DIR/.lmsignore" <<'EOF'
# Dev-only paths — not published to LM Studio Hub
scripts/
tsconfig.json
README.dev.md
node_modules/
*.lock
*-lock.json
.gitignore
.lmstudio/
EOF

for file in \
  "$RELEASE_DIR/src/index.ts" \
  "$RELEASE_DIR/dist/index.js" \
  "$RELEASE_DIR/manifest.json" \
  "$RELEASE_DIR/package.json"; do
  if [[ ! -f "$file" ]]; then
    echo "Error: missing release artifact: $file" >&2
    exit 1
  fi
done

if ! grep -q 'dist/index.js' "$RELEASE_DIR/src/index.ts"; then
  echo "Error: release src/index.ts must re-export dist/index.js" >&2
  exit 1
fi

echo "Release artifact ready in $RELEASE_DIR"
echo "Hub publish includes:"
echo "  src/index.ts   (shim → dist/index.js)"
echo "  dist/index.js"
echo ""
echo "Note: lms push excludes dot-paths, so .lmstudio/ is not uploaded."
echo "LM Studio generates .lmstudio/production.js at install time from src/index.ts."
echo ""
echo "Push with: cd release && lms push -y --write-revision"
echo "Verify the upload list includes src/index.ts and dist/index.js"
