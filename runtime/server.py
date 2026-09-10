#!/usr/bin/env python3
"""Serve the static site and run the Aime-owned daily Lark notification."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, time as clock_time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
NOTIFY_SCRIPT = ROOT / "scripts" / "send-lark-notify.py"
SHANGHAI = ZoneInfo("Asia/Shanghai")
SCHEDULE_TIME = clock_time(10, 7)
RETRY_SECONDS = 15 * 60


def state_file() -> Path:
    data_dir = Path(os.environ.get("AIME_PLUGIN_DATA_DIR", ROOT / ".runtime-data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "lark-notify-state.json"


def last_sent_date() -> str | None:
    try:
        data = json.loads(state_file().read_text(encoding="utf-8"))
        return data.get("lastSentDate") if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def mark_sent(date: str) -> None:
    target = state_file()
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps({"lastSentDate": date}, ensure_ascii=False), encoding="utf-8")
    temporary.replace(target)


def run_notification(date: str) -> bool:
    print(f"[lark-scheduler] 开始推送 {date}", flush=True)
    result = subprocess.run(
        [sys.executable, str(NOTIFY_SCRIPT), "--date", date],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=90,
        check=False,
    )
    if result.stdout.strip():
        print(f"[lark-scheduler] {result.stdout.strip()}", flush=True)
    if result.returncode != 0:
        print(f"[lark-scheduler] 推送失败：{result.stderr.strip()}", file=sys.stderr, flush=True)
        return False
    mark_sent(date)
    print(f"[lark-scheduler] {date} 推送完成", flush=True)
    return True


def scheduler_loop() -> None:
    """At/after 10:07 Asia/Shanghai, send once; retry failures every 15 minutes."""
    while True:
        now = datetime.now(SHANGHAI)
        date = now.date().isoformat()
        if now.time() >= SCHEDULE_TIME and last_sent_date() != date:
            run_notification(date)
            time.sleep(RETRY_SECONDS)
        else:
            time.sleep(30)


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] == "/healthz":
            body = json.dumps({"ok": True, "app": "github-today-fun", "larkScheduler": "10:07 Asia/Shanghai"}).encode()
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
    if not NOTIFY_SCRIPT.is_file():
        raise SystemExit(f"飞书推送脚本不存在：{NOTIFY_SCRIPT}")

    threading.Thread(target=scheduler_loop, name="lark-daily-scheduler", daemon=True).start()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3000"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"[github-today-fun] serving {DIST} on http://{host}:{port}", flush=True)
    print("[lark-scheduler] 已启用：每天 Asia/Shanghai 10:07", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
