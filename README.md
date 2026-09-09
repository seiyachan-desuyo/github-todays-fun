# GitHub 今日好玩

面向普通用户、AI 爱好者和轻度开发者的 GitHub 中文每日发现页。项目把“事实采集”和“编辑判断”分开：程序只收集、去重、评分和保存真实候选；Aime 在离线会话中阅读任务并编辑正式刊。

## 核心原则

- **事实由程序采集**：仓库 URL、description、README 摘要（如可取得）、Stars、增长及来源、语言、topics、时间、来源状态和评分信号均写入结构化任务。
- **内容由 Aime 编辑**：Aime 只依据 editor task 中的真实事实选题和写中文介绍，不从项目名猜功能。
- **前端不调用模型**：Next.js 页面只读取已经校验的静态 edition；项目无需任何模型密钥。
- **不自动灌模板**：采集命令不会生成正式刊。缺少 Aime 编辑结果时，校验/构建应明确失败，而不是悄悄发布 deterministic 文案。

## 每日工作流

### 1. 程序化采集

```bash
pnpm collect
```

该命令运行 GitHub 官方主链路及可选补充源，完成规范化、去重、增长计算与可解释评分，生成：

```text
src/data/snapshots/YYYY-MM-DD.json
src/data/editor-tasks/YYYY-MM-DD.json
```

`editor-tasks` 包含完整可编辑候选池及 `sourceStatus`、`pipelineStats`，每日正式刊目标固定为 30 项。Aime 先按综合评分、普通用户可理解性与题材多样性选题；高质量候选不足时，优先从当天采集到的 GitHub Trending daily / weekly 真实结果补足。只有整个真实候选池少于 30 项时才允许降级，并必须在 edition 的 `metadata.degradedReason` 中明示原因。它不包含任何自动生成的编辑文案。

`pnpm refresh` 与 `pnpm collect` 同义：只刷新真实事实任务和快照，绝不生成正式刊。

### 2. Aime 离线编辑

把当天 `src/data/editor-tasks/YYYY-MM-DD.json` 交给 Aime。Aime 读取 description、可用的 README 摘要、增长与评分信号，按综合评分、可理解性与题材多样性编辑 30 个项目，写入：

```text
src/data/editions/YYYY-MM-DD.json
```

每个入选项目必须有：

- 一句通俗的“这是干嘛的”（`plainSummary`）；
- 2–3 句“怎么玩 / 解决什么”（`introduction`）；
- 为什么今天值得看（`whyToday`）；
- 适合谁（`audience`）；
- 非技术标签与推荐分；
- 从 editor task 原样带回的事实字段与评分信号。

正式刊必须使用 `editorMode: "aime"`。Aime 本身不是前端运行时 API；每天自动出版时，由 Aime 定时任务按 [`docs/daily-publishing.md`](docs/daily-publishing.md) 依次执行准备、编辑、staging 校验、原子发布、构建、部署与成功回执，而不是在 Next.js 客户端配置模型密钥。

每天 10:00 的独立飞书 Bot 推送、手动测试和开放平台配置见 [`docs/lark-daily-bot.md`](docs/lark-daily-bot.md)。

### 3. 校验、构建与部署

```bash
pnpm validate:edition
pnpm lint
pnpm test
pnpm build
```

校验器会确认：正式刊 schema 合法、正常出版恰好 30 项（候选池不足时才允许等于候选数并明示降级原因）、项目全部来自当天候选池、无重复项目、所有事实字段未被编辑改写、来源状态与统计一致。Next.js 使用静态导出，产物位于 `dist/`。

## 数据源与 fallback

数据源只使用 GitHub 官方事实：

1. **GitHub Search REST API（主召回）**：新仓、近两周起量仓库、近三天活跃的中型仓库。
2. **GitHub Trending HTML（补足 + 增长信号）**：daily / weekly 卡片；daily 页面明确展示的 `stars today` 标记为 `github-trending` 增长。综合评分候选不足 30 项时，优先从这些真实榜单结果补足。
3. **GitHub Repository API（探针/补全）**：验证仓库详情接口；受限时保留 Search / Trending 已有事实。
4. **本地 snapshot**：只基于上述 GitHub 官方事实保存，用于计算跨日 Star 增量。

不请求、不展示、也不保留第三方榜单或聚合服务。生产环境建议配置 `GITHUB_TOKEN` 或 GitHub App，以提高 Search / core API 限额。

## 评分与快照

评分不是总 Star 排名，分项包括：

- `snapshotGrowth`：与更早本地快照相比的真实 Star 差值；
- `trendingGrowth`：GitHub Trending 明确披露的 `stars today`；
- `newProjectVelocity`：30 天内新仓的 Stars / 存活天数；
- `pushedFreshness`：最近 1 / 3 / 7 天是否更新；
- `crossSource`：是否跨多个真实来源出现。

首日没有历史基线时，`recentGrowth` 不会伪造成 24 小时增长，只展示 GitHub Trending 明示值。Trending 增长与本地快照增长在页面上保持不同标识。

## 目录

```text
scripts/collect-editor-task.ts  事实采集，生成 snapshot + editor task
scripts/validate-edition.ts     校验 Aime 正式刊与事实一致
src/data/editor-tasks/          交给 Aime 的结构化候选任务
src/data/snapshots/             每日事实快照
src/data/editions/              Aime 编辑完成的静态刊物
src/lib/sources/                数据源适配器
src/lib/pipeline/               规范化、去重、快照与评分
src/lib/editor/schema.ts        editor task 与正式刊 schema
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

- `GITHUB_TOKEN`：可选，建议生产配置；
- `VERCEL_TOKEN`：定时环境未登录 Vercel CLI 时用于生产部署；
- `EDITION_DATE`：可选兼容变量，推荐在命令中显式传 `--date YYYY-MM-DD`。

项目默认流程没有任何 LLM Key 配置。

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

## 2026-09-07 实跑说明

已抓取数据的来源状态、候选数量与评分保存在当天 editor task 中。首日没有更早快照基线，因此本期短期增长使用 GitHub Trending 页面明确披露的 `stars today`；Repository / Events 等可选接口即使因匿名额度降级，也不影响官方 Search / Trending 主链路候选。
