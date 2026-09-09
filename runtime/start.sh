#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f "dist/index.html" ]; then
  echo "[github-today-fun] dist 缺失，开始安装依赖并构建..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile
    pnpm build
  else
    echo "[github-today-fun] 未找到 pnpm，且发布包中缺少 dist/index.html" >&2
    exit 1
  fi
fi

exec python3 runtime/server.py
