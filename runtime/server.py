#!/usr/bin/env python3
"""Serve the statically exported Next.js site inside the Aime App runtime."""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
REMOTE_FEED_URL = os.environ.get(
    "GITHUB_TODAY_FEED_URL",
    "https://raw.githubusercontent.com/seiyachan-desuyo/github-todays-fun/aime/1788773097-github-today-fun/public/data/feed.json",
)


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        request_path = self.path.split("?", 1)[0]
        if request_path == "/api/feed":
            # 本地打包的 feed.json 是出版流水线 refresh-app 阶段同步的权威版本（dist/data/feed.json）。
            # 远端 raw.githubusercontent.com 分支（aime/1788773097-github-today-fun/public/data/feed.json）
            # 并不在每日流水线中同步，会长期停留在旧期，不能作为优先源。
            # 因此：**本地优先**；仅当本地缺失、且环境变量显式允许时，才尝试远端作为兜底。
            local_feed = DIST / "data" / "feed.json"
            if local_feed.is_file():
                body = local_feed.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Feed-Source", "packaged-local")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if os.environ.get("GITHUB_TODAY_ALLOW_REMOTE_FEED") == "1":
                try:
                    request = Request(REMOTE_FEED_URL, headers={"Accept": "application/json", "User-Agent": "github-today-fun-aime/0.1"})
                    with urlopen(request, timeout=10) as response:
                        body = response.read()
                        feed = json.loads(body)
                        if (
                            not isinstance(feed, dict)
                            or feed.get("schemaVersion") != 2
                            or not isinstance(feed.get("latest"), str)
                            or not isinstance(feed.get("editions"), list)
                            or not feed["editions"]
                        ):
                            raise ValueError("远程响应不是有效的 edition feed")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("X-Feed-Source", "remote-fallback")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
                    body = json.dumps({"error": "feed_unavailable", "detail": str(exc)}).encode()
                    self.send_response(502)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
            body = json.dumps({"error": "feed_missing", "detail": "dist/data/feed.json 不存在"}).encode()
            self.send_response(404)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if request_path == "/healthz":
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
    print(f"[github-today-fun] serving {DIST} on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
