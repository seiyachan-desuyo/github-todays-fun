# 出版流程线上化评估（是否可脱离本地 macOS）

本文评估把「GitHub 今日好玩」每日出版流程从本地 macOS 迁移到线上（GitHub Actions 等）的可行性，明确哪些阶段可以完全线上运行、哪些存在硬性阻碍，并给出建议方案。

## 结论速览

**完整链路（prepare → 编辑 → stage → finalize → build → deploy → git push → 飞书推送）无法完全跑在公有云 GitHub Actions 上**，卡点有两个硬阻碍：

1. **AI 编辑阶段**需要 Aime / LLM 在环（cloud runner 里没有）。
2. **IDA 部署**是字节内网服务（`*.ida-app.bytedance.net`），公有 GitHub runner 触达不到，也没有内网鉴权。

但**采集（collect）与飞书推送两段可以完全线上化**，已分别用 GitHub Actions 落地。推荐采用「云端跑确定性阶段 + Aime 定时任务跑编辑与 IDA 部署」的**混合模式**。

## 各阶段可行性逐项分析

| 阶段 | 命令 | 能否上公有云 Actions | 说明 |
| --- | --- | --- | --- |
| 采集事实 | `pnpm collect` / `pipeline:prepare` | ✅ 可以 | 只调用 GitHub 公开 API，Actions 自带 `GITHUB_TOKEN` 提额度 |
| **AI 编辑** | 写 `.daily-pipeline/editor-output/$DATE.json` | ❌ **阻碍①** | 需要 Aime/LLM 选题写文案，cloud runner 无 LLM |
| 生成 staging | `pipeline:stage` | ⚠️ 依赖编辑产物 | 计算本身纯本地，但输入来自阻碍① |
| 正式发布 | `pipeline:finalize` | ⚠️ 依赖编辑产物 | 同上 |
| 构建 | `pnpm build` | ✅ 可以 | 纯静态导出（`output: "export"`） |
| **部署 IDA** | deploy 命令 | ❌ **阻碍②** | IDA 为字节内网 + 内网鉴权，公有 runner 无法触达 |
| git push | `git push` | ✅ 可以 | Actions 用 `GITHUB_TOKEN` 即可推分支 |
| 飞书推送 | `pnpm bot:send` / `send-lark-notify.py` | ✅ 可以 | 走 `open.feishu.cn` 公网 API，已不依赖 IDA |

### 硬阻碍详解

- **阻碍①：AI 编辑必须有 Aime 在环。** 采集器只产出「事实候选」，30 项精选的中文文案、选题、候选池翻译都由 Aime 依据事实编辑。没有编辑产物时 `stage/finalize` 会直接校验失败（不会灌模板、不会降级出版）。GitHub Actions 里没有 LLM，无法自动完成这一步。
- **阻碍②：IDA 部署依赖字节内网。** 线上站点托管在 `1384e82de8f4.ida-app.bytedance.net`，部署命令需要内网连通与内网鉴权，公有 GitHub runner（GitHub 官方公网机器）既无法访问该域名，也拿不到内网凭证。

## 已落地的线上化（本次实现）

1. **飞书推送** —— `.github/workflows/lark-daily-push.yml`（既有）。改造后 `send-lark-notify.py` 与 `bot:send` 都从**已提交到仓库的期刊数据 / 本地 `public/data/feed.json`** 读数据，不再访问 IDA，可完全线上运行。
2. **每日采集** —— `.github/workflows/daily-collect.yml`（本次新增）。每天 13:30 CST 在云端跑 `pnpm collect`，把当天 `src/data/editor-tasks/$DATE.json` 与 snapshot 提交回分支。这样**即使本地 Mac 断连，当天候选事实也已在云端就绪**，Aime 可直接从云端产物开始编辑，采集阶段彻底摆脱本地依赖。

## 建议的目标架构（混合模式）

```text
[GitHub Actions · 云端]                         [Aime 定时任务 · 有 LLM + 内网]
13:30 CST daily-collect.yml                      收到/发现当天 editor-task
  └ pnpm collect → 提交 editor-task/snapshot  →   ├ AI 编辑 → editor-output
                                                  ├ pipeline:stage / finalize
                                                  ├ pnpm build（本地校验产物）
                                                  ├ 部署 IDA（内网）
                                                  ├ 更新 Aime App（app_b0e9666721542b2b）
                                                  └ git push（提交正式 edition + feed.json）
[GitHub Actions · 云端]
lark-daily-push.yml（推送时刻）
  └ 读已提交的 edition / GitHub Raw feed.json → 飞书群推送（不依赖 IDA / 本地）
```

- 采集与飞书推送两端**完全不依赖本地 Mac**。
- 编辑 + IDA 部署 + Aime App 更新仍由 Aime 定时任务承担（这两步本就要求 LLM 与内网，无法搬到公有云）。

## 若确实要「全流程零本地」的两种绕过方案

1. **自托管 Runner（self-hosted runner）挂在字节内网。** 在内网机器上注册一台 GitHub self-hosted runner，即可让 workflow 触达 IDA 完成部署；AI 编辑仍需接入内部 LLM/Aime API。工作量与合规成本较高，适合有长期值守机器的场景。
2. **改用公网静态托管（GitHub Pages）做镜像。** `dist/` 是纯静态导出，可由 Actions 直接部署到 GitHub Pages，产出一个**不依赖内网、不依赖本地**的公开镜像站点。注意：项目页路径为 `/github-todays-fun`，需要在 `next.config.ts` 里按环境加 `basePath`/`assetPrefix`，否则资源 404；且这是「新增公开镜像」，不替代 IDA（用户既有约定是 IDA + Aime App 双写）。此方案仍解决不了 AI 编辑（阻碍①），只是把「托管」这一环搬到公网。

> 备注：无论哪种方案，AI 编辑阶段都绕不开「需要 LLM 在环」。真正的「零本地、零人工」自动出版，等价于把 Aime 的编辑能力也接入云端流水线（内部 LLM API），这属于更大的工程改造，不在本次修复范围内。
