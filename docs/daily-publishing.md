# Aime 每日自动出版运行手册

本链路由 Aime 定时任务在仓库根目录执行，不依赖 GitHub Actions。所有命令都必须带上海日期 `YYYY-MM-DD`，并以命令退出码判断成功或失败。

## 定时 Agent 的精确步骤

以下示例中的 `$DATE` 必须由 Agent 按 `Asia/Shanghai` 当天计算，不要依赖宿主机时区。

### 1. 准备事实任务

```bash
pnpm pipeline:prepare -- --date "$DATE"
```

- 首次执行会采集 GitHub 官方事实并生成 `src/data/snapshots/$DATE.json` 与 `src/data/editor-tasks/$DATE.json`。
- 同一天任务已存在且 schema 合法时直接复用，避免重跑采集；确需刷新时追加 `--force`。
- 退出码非 0：停止，最终回复必须写明失败阶段为 `prepare`，不得编辑、发布、部署或发送成功回执。

### 2. Aime 编辑

Aime 读取 `src/data/editor-tasks/$DATE.json`，只依据候选中的 `description`、`readmeSummary`、增长与评分信号选题和写中文文案。不得按项目名猜测；不得改写任何事实字段。

把编辑结果写到 `.daily-pipeline/editor-output/$DATE.json`：

```json
{
  "summary": "本期导语",
  "projects": [
    {
      "githubUrl": "必须来自当天 candidates",
      "plainSummary": "一句通俗说明",
      "introduction": "第一句用途。第二句玩法。",
      "whyToday": "基于当天真实信号的推荐理由",
      "audience": "适合人群",
      "editorialTags": ["效率"],
      "recommendation": 4
    }
  ]
}
```

编辑结果必须恰好包含 30 项且 URL 去重。当天可核验候选池少于 30 项时停止出版，不生成降级刊。Aime 只编辑这 30 个入选项目，不需要为完整候选池逐条撰写文案。

### 3. 生成并校验 staging edition

```bash
pnpm pipeline:stage -- --date "$DATE"
```

该命令把 30 个精选的事实字段从 editor task 原样装配到 `.daily-pipeline/staging/$DATE.json`，同时把当天全部程序评分候选确定性映射到 `.daily-pipeline/staging/enriched-$DATE.json`。随后执行严格校验，覆盖 schema、日期、固定 30 项、URL 去重、候选归属、全部事实字段、来源状态和 pipelineStats。

退出码非 0：停止，报告失败阶段 `stage`；正式 edition 不会变化。

### 4. 原子发布正式 edition

```bash
pnpm pipeline:finalize -- --date "$DATE"
```

该命令先再次校验 staging，再通过同目录临时文件加 `rename` 原子写入 `src/data/editions/$DATE.json` 与 `src/data/enriched-candidates/$DATE.json`，重新生成按日期倒序的 `src/data/index.ts`，并生成同时包含 `editions` 与 `candidatePools` 的动态 Feed。同日期重跑复用原刊号。

退出码非 0：停止，报告失败阶段 `finalize`；不得进入构建和部署。

### 5. 质量检查与生产构建

```bash
pnpm validate:edition -- --date "$DATE"
pnpm lint
pnpm test
pnpm build
```

任一命令失败：停止，报告准确阶段与错误，不部署。由于部署尚未发生，线上上一期保持不变。

### 6. 部署现有 Vercel 站点

仓库已链接 Vercel 项目时执行：

```bash
npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
```

如果定时运行环境已通过 Vercel CLI 登录，可省略 `--token`。必须保存命令返回的生产 URL；部署失败时报告 `deploy` 失败，不得发送成功回执，线上旧部署保持可用。

### 7. 生成成功回执

先访问生产 URL，确认 HTTP 可达且首页显示当天日期，再执行：

```bash
pnpm pipeline:success -- --date "$DATE" --url "$DEPLOYED_URL"
```

公开可访问站点无需配置认证，检查请求不会发送 `Authorization` Header。仅当目标站点确实要求认证时，才设置目标站点接受的完整请求头值：

```bash
export PIPELINE_SUCCESS_AUTHORIZATION="Bearer <token>"
pnpm pipeline:success -- --date "$DATE" --url "$DEPLOYED_URL"
```

`PIPELINE_SUCCESS_AUTHORIZATION` 仅从环境变量读取，不要写入命令参数、代码或提交到 Git。配置后脚本会原样添加为 `Authorization` Header；未配置或仅包含空白时按公开站点处理。

只有该命令退出码为 0，Aime 才能在定时任务最终回复中向当前用户回传成功。输出包含日期、项目数、各来源状态和线上链接；无需配置飞书 Webhook。

## 并发、幂等与恢复

- `prepare`、`stage`、`finalize`、`success` 使用 `.daily-pipeline/locks/$DATE.lock`，同日期并发会立即失败。
- 锁超过 6 小时且确认没有任务运行时，才可添加 `--force-lock` 清理陈旧锁。
- `prepare` 默认复用合法任务；`stage` 只覆盖 staging；`finalize` 只接受通过全部校验的 staging。
- `pnpm pipeline:status -- --date "$DATE"` 可查看 task、编辑输出、staging、正式版和构建产物是否存在，再从缺失阶段恢复。
- 已部署成功但回执失败时，可在确认线上页面后单独重跑 `pipeline:success`；它会重新校验正式 edition 和构建产物。
- 流水线不会删除、reset 或回滚仓库文件。发布新日期不会覆盖上一期正式 JSON；构建或部署失败也不会替换线上上一部署。

## 环境变量

- `GITHUB_TOKEN`：推荐。用于提高 GitHub Search / Repository API 限额；不配置时会使用匿名额度并如实记录来源状态。
- `VERCEL_TOKEN`：定时环境未登录 Vercel CLI 时需要，仅在部署命令中读取。
- `PIPELINE_SUCCESS_AUTHORIZATION`：可选。仅在 `pipeline:success` 访问需要认证的生产站点时填写完整 `Authorization` 请求头值（例如 `Bearer <token>`）；公开站点留空。
- `EDITION_DATE`：可选兼容变量；定时任务优先显式传 `--date`。

不需要 LLM API Key、Webhook、飞书用户 ID。Aime 本身负责编辑，并由定时任务最终回复通知当前用户。

## 安全降级边界

GitHub Repository 探针限流时，采集器保留 GitHub Search / Trending 已取得的事实，并把探针标记为 `degraded`。如果所有来源均没有任何可核验候选，采集直接失败；不会生成空任务或编造项目。候选不足 30 项时停止出版并报告采集不足，正式 edition 始终固定为 30 个 AI 精选。
