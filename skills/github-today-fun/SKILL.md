---
name: github-today-fun
description: 当用户想发现、浏览或了解当天值得关注的 GitHub 开源项目，询问“今天 GitHub 有什么好玩”“推荐几个最近有意思的开源项目”“打开 GitHub 今日好玩”，或要查看本应用已发布的指定日期刊物时使用。
---

# GitHub 今日好玩

本应用每天从 GitHub 官方 Search、Trending 与 Repository 数据中采集真实候选，再由 Aime 基于候选事实编辑中文介绍。不要根据仓库名猜测项目能力，也不要把采集失败解释为“当天没有项目”。

## 打开应用

当用户想浏览完整榜单、筛选项目或查看历史刊物时，使用 `send_dynamic_ui` 打开应用首页：

```python
from byted_aime_sdk import send_dynamic_ui
send_dynamic_ui(uri="/", title="GitHub 今日好玩", display_mode=1)
```

## 快速查看

用户只想在对话中看几个项目时，运行应用命令：

```text
/github-today
/github-today latest 8
/github-today 2026-09-09 5
```

默认显示最新一期前 5 项；数量可设为 1–10。

## 内容可信边界

- 只引用 `src/data/editions/` 中已经发布并通过校验的内容。
- 仓库 URL、Stars、语言、更新时间、增长和来源等事实字段不得由 Agent 改写。
- 中文摘要只应来自 edition 中的 `plainSummary`、`introduction` 与 `whyToday`。
- 来源降级时应如实说明 `sourceStatus`，不得补造项目或增长数据。

## 维护者工作流

完整的采集、编辑、校验、构建和部署步骤见 `docs/daily-publishing.md`。Aime App 的本地安装、打包和上架说明见 `docs/aime-app.md`。
