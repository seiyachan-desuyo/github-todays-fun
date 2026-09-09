#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/release"
STAGE="$RELEASE_DIR/github-today-fun"
OUTPUT="$RELEASE_DIR/github-today-fun-aime-app.zip"

cd "$ROOT"

pnpm lint
pnpm test
rm -rf "$ROOT/dist"
pnpm build
python3 -m py_compile runtime/server.py commands/github_today.py

rm -rf "$STAGE" "$OUTPUT"
mkdir -p "$STAGE"

for path in app.json runtime commands skills dist src/data/editions README.md LICENSE; do
  cp -R "$ROOT/$path" "$STAGE/"
done

(
  cd "$RELEASE_DIR"
  zip -qr "$(basename "$OUTPUT")" "$(basename "$STAGE")" \
    -x '*/__pycache__/*' '*.pyc' '*.DS_Store' '*.env*' '*.log'
)

rm -rf "$STAGE"
echo "Aime App 发布包：$OUTPUT"
