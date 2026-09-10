#!/usr/bin/env python3
"""Serve the statically exported Next.js site inside the Aime App runtime."""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] == "/healthz":
            body = json.dumps({"ok": True, "app": "github-today-fun"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self) -> None:
        if self.path.startswith("/_next/static/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "public, max-age=300")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def log_message(self, message: str, *args: object) -> None:
        print(f"[github-today-fun] {self.address_string()} - {message % args}")


def main() -> None:
    if not (DIST / "index.html").is_file():
        raise SystemExit("dist/index.html 不存在，请先运行 pnpm build")

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3000"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"[github-today-fun] serving {DIST} on http://{host}:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
