#!/usr/bin/env python3
"""Aime slash command: /github-today [latest|YYYY-MM-DD] [count]."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "src" / "data" / "editions"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def read_args() -> list[str]:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"读取命令输入失败：{exc}") from exc
    raw = payload.get("tool_input", {}).get("args", "")
    return str(raw).strip().split()


def available_dates() -> list[str]:
    return sorted((p.stem for p in EDITIONS.glob("*.json") if DATE_RE.match(p.stem)), reverse=True)


def main() -> None:
    args = read_args()
    if args and args[0] in {"help", "-h", "--help"}:
        print("用法：/github-today [latest|YYYY-MM-DD] [1-10]")
        return

    dates = available_dates()
    if not dates:
        raise SystemExit("暂无可用刊物，请先完成每日出版流程。")

    date = dates[0] if not args or args[0] == "latest" else args[0]
    if not DATE_RE.match(date):
        raise SystemExit("日期格式应为 YYYY-MM-DD，例如 /github-today 2026-09-09")

    try:
        count = int(args[1]) if len(args) > 1 else 5
    except ValueError as exc:
        raise SystemExit("展示数量应为 1–10 的整数。") from exc
    if not 1 <= count <= 10:
        raise SystemExit("展示数量应为 1–10 的整数。")

    edition_file = EDITIONS / f"{date}.json"
    if not edition_file.is_file():
        choices = "、".join(dates[:5])
        raise SystemExit(f"没有 {date} 的刊物。最近可用日期：{choices}")

    edition = json.loads(edition_file.read_text(encoding="utf-8"))
    projects = edition.get("projects", [])[:count]
    print(f"## GitHub 今日好玩 · {edition.get('date', date)}")
    if edition.get("summary"):
        print(f"\n{edition['summary']}\n")
    for index, project in enumerate(projects, 1):
        name = project.get("name", "未命名项目")
        url = project.get("githubUrl", "")
        summary = project.get("plainSummary") or project.get("description") or "暂无简介"
        print(f"{index}. [{name}]({url}) — {summary}")
    print("\n想浏览完整榜单，可以打开「GitHub 今日好玩」应用首页。")


if __name__ == "__main__":
    main()
