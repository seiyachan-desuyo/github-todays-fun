#!/usr/bin/env python3
"""Send today's GitHub Today Fun edition to a Lark group chat."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DEFAULT_SITE_URL = "https://1384e82de8f4.ida-app.bytedance.net"
# 数据读取不再依赖 IDA（服务端请求会被 aeolus/user/forbidden 拦截）。
# 优先读本地构建产物 public/data/feed.json，读不到再回退到公开的 GitHub Raw feed.json。
LOCAL_FEED_PATH = ROOT / "public" / "data" / "feed.json"
DEFAULT_FEED_URL = (
    "https://raw.githubusercontent.com/seiyachan-desuyo/github-todays-fun/"
    "aime/1788773097-github-today-fun/public/data/feed.json"
)
LARK_API = "https://open.feishu.cn/open-apis"
SHANGHAI = ZoneInfo("Asia/Shanghai")


def today_in_shanghai() -> str:
    return datetime.now(SHANGHAI).date().isoformat()


def request_json(url: str, *, method: str = "GET", payload: dict[str, Any] | None = None,
                 headers: dict[str, str] | None = None, attempts: int = 3) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    request_headers = {"Accept": "application/json", "User-Agent": "github-today-fun-aime/0.1"}
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    request_headers.update(headers or {})
    last_error: Exception | None = None

    for attempt in range(attempts):
        try:
            with urlopen(Request(url, data=body, headers=request_headers, method=method), timeout=15) as response:
                result = json.loads(response.read())
            if isinstance(result, dict) and result.get("code", 0) not in (0, None):
                raise RuntimeError(f"飞书 API 返回 code={result.get('code')}, msg={result.get('msg', 'unknown')}")
            if not isinstance(result, dict):
                raise ValueError("接口响应不是 JSON 对象")
            return result
        except HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            last_error = RuntimeError(f"HTTP {exc.code}: {detail}")
            if exc.code < 500 and exc.code != 429:
                raise last_error from exc
        except (URLError, TimeoutError, json.JSONDecodeError, ValueError, RuntimeError) as exc:
            last_error = exc
            if isinstance(exc, RuntimeError) and "飞书 API 返回" in str(exc):
                raise
        if attempt + 1 < attempts:
            time.sleep(0.5 * (2 ** attempt))
    raise RuntimeError(f"请求失败：{last_error}")


def validate_edition(data: dict[str, Any], date: str, source: str) -> dict[str, Any]:
    if data.get("date") != date or not isinstance(data.get("projects"), list) or not data["projects"]:
        raise ValueError(f"edition 内容无效或日期不匹配：{source}")
    return data


def edition_from_feed(feed: dict[str, Any], date: str, source: str) -> dict[str, Any]:
    editions = feed.get("editions")
    if not isinstance(editions, list) or not editions:
        raise ValueError(f"feed 缺少 editions 列表：{source}")
    for edition in editions:
        if isinstance(edition, dict) and edition.get("date") == date:
            return validate_edition(edition, date, source)
    raise ValueError(f"feed 中未找到 {date} 的期刊：{source}")


def load_edition(date: str, feed_url: str = DEFAULT_FEED_URL) -> dict[str, Any]:
    errors: list[str] = []

    # 1) 优先读取本地构建产物 public/data/feed.json（相对项目根）。
    if LOCAL_FEED_PATH.is_file():
        try:
            feed = json.loads(LOCAL_FEED_PATH.read_text(encoding="utf-8"))
            return edition_from_feed(feed, date, str(LOCAL_FEED_PATH))
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            errors.append(f"{LOCAL_FEED_PATH}: {exc}")
    else:
        errors.append(f"{LOCAL_FEED_PATH}: 文件不存在")

    # 2) 本地读不到时回退到公开的 GitHub Raw feed.json（无需登录）。
    try:
        feed = request_json(feed_url, attempts=3)
        return edition_from_feed(feed, date, feed_url)
    except Exception as exc:  # noqa: BLE001 - fallback 尽力而为
        errors.append(f"{feed_url}: {exc}")

    raise RuntimeError("未能读取当天 edition：" + "；".join(errors))


def build_card(edition: dict[str, Any], website_url: str = DEFAULT_SITE_URL) -> dict[str, Any]:
    projects = edition["projects"][:5]
    elements: list[dict[str, Any]] = []
    summary = str(edition.get("summary") or "今日 GitHub 开源项目精选")
    elements.append({"tag": "markdown", "content": f"**{summary}**"})
    elements.append({"tag": "hr"})
    for index, project in enumerate(projects, 1):
        stats = [project.get("language")]
        if project.get("stars") is not None:
            stats.append(f"⭐ {project['stars']:,}")
        if project.get("recentGrowth") is not None:
            stats.append(f"近期 +{project['recentGrowth']}")
        details = " · ".join(str(value) for value in stats if value)
        content = f"**{index}. [{project['name']}]({project['githubUrl']})**\n{project.get('plainSummary', '')}"
        if project.get("whyToday"):
            content += f"\n{project['whyToday']}"
        if details:
            content += f"\n{details}"
        elements.append({"tag": "markdown", "content": content})
    elements.append({"tag": "button", "text": {"tag": "plain_text", "content": "查看今日完整榜单"}, "type": "primary", "url": website_url})
    return {
        "schema": "2.0",
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"tag": "plain_text", "content": f"GitHub 今日好玩 · {edition['date']}"},
            "subtitle": {"tag": "plain_text", "content": f"第 {edition.get('issue', '-')} 期 · 前 {len(projects)} 个项目"},
            "template": "blue",
        },
        "body": {"elements": elements},
    }


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"缺少环境变量：{name}")
    return value


def send_card(card: dict[str, Any]) -> str | None:
    token = request_json(
        f"{LARK_API}/auth/v3/tenant_access_token/internal",
        method="POST",
        payload={"app_id": required_env("LARK_APP_ID"), "app_secret": required_env("LARK_APP_SECRET")},
    ).get("tenant_access_token")
    if not token:
        raise RuntimeError("飞书鉴权响应缺少 tenant_access_token")
    query = urlencode({"receive_id_type": "chat_id"})
    result = request_json(
        f"{LARK_API}/im/v1/messages?{query}",
        method="POST",
        headers={"Authorization": f"Bearer {token}"},
        payload={"receive_id": required_env("LARK_RECIPIENT_ID"), "msg_type": "interactive", "content": json.dumps(card, ensure_ascii=False)},
    )
    return result.get("data", {}).get("message_id")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", default=os.environ.get("EDITION_DATE") or today_in_shanghai())
    parser.add_argument("--dry-run", action="store_true", help="只生成卡片，不调用飞书 API")
    args = parser.parse_args()
    website_url = os.environ.get("GITHUB_TODAY_WEBSITE_URL", DEFAULT_SITE_URL)
    feed_url = os.environ.get("GITHUB_TODAY_FEED_URL") or DEFAULT_FEED_URL
    card = build_card(load_edition(args.date, feed_url), website_url)
    if args.dry_run:
        print(json.dumps(card, ensure_ascii=False, indent=2))
        return 0
    message_id = send_card(card)
    print(json.dumps({"ok": True, "date": args.date, "messageId": message_id}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[lark-notify] {exc}", file=sys.stderr)
        raise SystemExit(1)
