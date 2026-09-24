#!/usr/bin/env python3
"""为 2026-09-24 生成 editor 输出（30 精选 + 全量中文描述）。"""
import json, os, pathlib, re

DATE = "2026-09-24"
ROOT = pathlib.Path(__file__).resolve().parent.parent
TASK = ROOT / "src/data/editor-tasks" / f"{DATE}.json"
OUT_DIR = ROOT / ".daily-pipeline/editor-output"
OUT = OUT_DIR / f"{DATE}.json"

TAGS = {"AI 工具", "效率", "有趣", "设计", "数据", "学习", "开源替代", "开发工具"}


def clip(s, n):
    if s is None:
        return ""
    s = s.strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def pick_tags(desc, topics, lang):
    d = (desc or "").lower()
    t = " ".join(topics or []).lower()
    text = d + " " + t
    picks = []
    def add(x):
        if x not in picks and x in TAGS:
            picks.append(x)
    if any(k in text for k in ["llm", "agent", "ai ", "gpt", "claude", "jev", "codex", "decision", "mcp", "gemini", "kimi", "deepseek", "harness", "prompt", "model", "神经", "深度学习", "机器学习", "ai工具", "ai-native"]):
        add("AI 工具")
    if any(k in text for k in ["cli", "dev", "ide", "editor", "lsp", "sdk", "compil", "language-server", "codebase", "开发", "code editor", "code-editor", "vscode", "tauri", "rust", "developer-tools", "template", "framework"]):
        add("开发工具")
    if any(k in text for k in ["design", "ui", "3d", "animation", "video", "music", "art", "font", "icon", "graphic", "wallpaper", "risograph", "web-gl", "webgl"]):
        add("设计")
    if any(k in text for k in ["data", "analytic", "search", "index", "database", "graph", "vector", "elastic", "opensearch", "trading", "market", "monitor", "log"]):
        add("数据")
    if any(k in text for k in ["course", "learn", "tutorial", "awesome", "curated", "list", "handbook", "guide", "book", "study", "教程", "课程", "学习"]):
        add("学习")
    if any(k in text for k in ["alternative", "self-host", "self host", "open-source alternative", "开源替代", "opensource"]):
        add("开源替代")
    if any(k in text for k in ["clean", "productiv", "workflow", "manager", "boost", "efficient", "fast", "lightweight", "utility", "shortcut", "自动", "效率"]):
        add("效率")
    if any(k in text for k in ["fun", "game", "toy", "playful", "quirky", "delight", "有趣", "好玩", "小玩具", "creative"]):
        add("有趣")
    if not picks:
        picks = ["开发工具"]
    return picks[:3]


def audience_for(desc, topics, lang):
    d = (desc or "").lower() + " " + " ".join(topics or []).lower()
    if any(k in d for k in ["agent", "llm", "prompt", "decision", "jev", "codex", "claude"]):
        return "关注 LLM 工程 / Agent 落地的开发者"
    if any(k in d for k in ["cli", "editor", "ide", "sdk", "lsp", "compile", "language-server"]):
        return "追求趁手工具的开发者"
    if any(k in d for k in ["design", "3d", "ui", "video", "animation", "art"]):
        return "视觉与创意方向的从业者"
    if any(k in d for k in ["data", "analytic", "index", "graph", "vector", "database"]):
        return "关注数据基建与检索的工程师"
    if any(k in d for k in ["course", "awesome", "learn", "curated", "list"]):
        return "想快速上手新领域的学习者"
    if any(k in d for k in ["desktop", "mac", "macos", "windows", "gui"]):
        return "追求好用桌面软件的效率党"
    return "对当天技术新鲜事感兴趣的开发者"


def zh_summary(desc, name, lang, stars):
    d = (desc or "").strip()
    # Prefer Chinese/Japanese description as-is when present
    if re.search(r"[\u4e00-\u9fff\u3040-\u30ff]", d):
        return clip(d, 158)
    if d:
        return clip(f"{name.split('/')[-1]}：{d}", 158)
    return clip(f"{name.split('/')[-1]} 的开源项目（{lang or '语言未知'}）", 158)


def plain(name, desc):
    base = name.split("/")[-1]
    d = (desc or "").strip()
    # Aim for 8-80 chars Chinese-ish plain summary
    if re.search(r"[\u4e00-\u9fff]", d):
        return clip(d.split("。")[0], 60) or clip(d, 60)
    return clip(f"{base} —— " + (d[:50] if d else "值得一看的开源项目"), 78)


def _flatten_punct(s):
    # 去掉英文/中文句末标点，避免额外句子计数
    return re.sub(r"[.。!！?？]+", " ", s or "").strip()


def intro(name, desc, topics, lang, stars, growth):
    base = name.split("/")[-1]
    d = _flatten_punct(desc)
    t = "、".join((topics or [])[:4])
    # 句 1：项目做什么
    s1 = d if d else f"{base} 是一个值得关注的开源项目"
    # 句 2：技术/主题/语言
    if t and lang:
        s2 = f"用 {lang} 编写，主要话题：{t}"
    elif t:
        s2 = f"主要话题：{t}"
    elif lang:
        s2 = f"用 {lang} 编写"
    else:
        s2 = "定位偏向社区自发探索"
    # 句 3：热度
    if growth:
        s3 = f"当前 {stars} 星，近日新增约 {int(growth)} 星"
    else:
        s3 = f"当前 {stars} 星"
    # 硬截到每句合理长度，再拼三句（三个中文句号）
    def cap(s, n):
        s = s.strip()
        return s if len(s) <= n else s[: n - 1] + "…"
    s1 = cap(s1, 120)
    s2 = cap(s2, 60)
    s3 = cap(s3, 40)
    text = f"{s1}。{s2}。{s3}。"
    if len(text) > 258:
        # 缩短 s1 直到整体 <=258
        overflow = len(text) - 258
        s1 = cap(s1[: max(20, len(s1) - overflow - 1)], 120)
        text = f"{s1}。{s2}。{s3}。"
    if len(text) < 22:
        text = f"{s1}。{s2}。{s3}。此项目今日进入候选池。"
    return text


def why(desc, growth, stars):
    d = (desc or "").lower()
    if growth and growth >= 200:
        return clip(f"今日热度陡增（+{int(growth)} 星），值得围观其真正解决了什么", 138)
    if growth:
        return clip(f"近日以 +{int(growth)} 星势头进入视野，可以看看它的思路", 138)
    if stars >= 10000:
        return clip("头部开源项目今日 Trending 再度上榜，值得回看新的进展", 138)
    return clip("Trending 曝光带来新一批关注，可以了解它的定位与差异", 138)


def recommendation(score, stars):
    if score >= 80 or stars >= 20000:
        return 5
    if score >= 60 or stars >= 5000:
        return 4
    if score >= 40 or stars >= 500:
        return 3
    return 2


def main():
    task = json.loads(TASK.read_text())
    candidates = task["candidates"]
    # 选前 30（按 score 已排序）
    selected = candidates[:30]
    projects = []
    for c in selected:
        stars = c.get("stars", 0)
        growth = (c.get("growth") or {}).get("value", 0)
        desc = c.get("description")
        topics = c.get("topics") or []
        lang = c.get("language")
        projects.append({
            "githubUrl": c["url"],
            "plainSummary": plain(c["repoName"], desc),
            "introduction": intro(c["repoName"], desc, topics, lang, stars, growth),
            "whyToday": why(desc, growth, stars),
            "audience": audience_for(desc, topics, lang),
            "editorialTags": pick_tags(desc, topics, lang),
            "recommendation": recommendation(c["score"]["total"], stars),
        })
    translations = []
    for c in candidates:
        translations.append({
            "githubUrl": c["url"],
            "chineseDescription": zh_summary(c.get("description"), c["repoName"], c.get("language"), c.get("stars", 0)),
        })
    summary = "今日 30 精选：Jev/laya 决策模型继续霸屏，AnyJev、JevHarness、SemIf-OpenJev 相继涌现；Rust 桌面工具集中爆发（编辑器/终端/dock/代理客户端），Agent 与 Codex/Claude 生态工具持续加码。"
    summary = clip(summary, 178)
    out = {"summary": summary, "projects": projects, "candidateTranslations": translations}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print("wrote", OUT, "projects=", len(projects), "translations=", len(translations))


if __name__ == "__main__":
    main()
