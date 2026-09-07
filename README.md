# GitHub 今日好玩

面向普通用户、AI 爱好者和轻度开发者的 GitHub 中文每日编辑精选。它不是排行榜，而是把真实项目说明转成 3～5 分钟能读完的“今天有什么好玩”。

## 当前状态（2026-09-07）

- GitDiscover 官方 Base URL 为 `https://api.gitdiscover.org/v1`，匿名限额 100 次/小时，使用 cursor 分页。实测 `/repositories`、`/hot` 等端点返回 HTTP 502。
- OSS Insight Trending 优先使用 MCP；当前环境未注册对应 MCP 工具，因此按技能要求使用 REST：`GET https://api.ossinsight.io/v1/trends/repos/?period=past_week&language=All`。实测返回 `data.rows=[]` 且 `data_quality.status=unavailable`，上游明确说明这不代表没有项目。
- 因两个趋势源均不可用，首页明确展示“演示刊”。演示内容只使用真实 GitHub 仓库 URL 与公开 description，并由人工编写编辑文案，不伪装成实时数据。

## 架构

```text
src/app/                    Next.js App Router 页面与历史日期路由
src/components/             每日发现、筛选、收藏与项目卡片
src/data/editions/          按日期保存的静态刊物
src/lib/sources/            GitDiscover、OSS Insight、GitHub 适配器
src/lib/pipeline/           URL 规范化、标准化与去重
src/lib/editor/             OpenAI-compatible AI Editor 与 Zod 校验
scripts/refresh-edition.ts  拉取、补全、AI 编辑并生成一期
```

### 数据链路

1. 并行请求 GitDiscover 与 OSS Insight。
2. 适配器使用宽松运行时读取；仅映射实际存在且类型正确的字段，完整原始对象放入 `raw`。
3. 将 GitHub URL 统一为小写 canonical URL，并合并重复项目与来源。
4. GitHub API 补全真实 description、README、stars、language 与 topics。
5. 只把这些真实事实交给 LLM；返回 JSON 通过 Zod 严格校验，并核对 URL 必须来自候选集合。
6. 没有 AI key 时不按项目名编故事，保留人工核验的 demo edition。

## 本地开发

要求 Node.js 20+ 与 pnpm。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。生产检查：

```bash
pnpm lint
pnpm test
pnpm build
```

构建采用 Next.js 静态导出，产物位于 `dist/`。

## 环境变量

复制 `.env.example` 为 `.env.local`：

- `AI_API_KEY`：OpenAI-compatible 服务密钥。
- `AI_BASE_URL`：接口根地址，默认 `https://api.openai.com/v1`。
- `AI_MODEL`：支持 JSON 输出的模型名。
- `GITDISCOVER_API_KEY`：可选，提高 GitDiscover 限额。
- `GITHUB_TOKEN`：可选，提高 GitHub API 限额。
- `EDITION_ISSUE`：刷新时指定刊号。

## 刷新一期

```bash
pnpm refresh
```

脚本会打印两个上游的真实状态。仅当存在候选项目且配置了 AI key 时才生成 `src/data/editions/YYYY-MM-DD.json`；随后把该 JSON 导入 `src/data/index.ts`，再运行测试与构建。若上游失败或缺少 key，脚本不会生成推测文案。

## 已知限制

- 收藏使用浏览器 `localStorage`，不跨设备同步。
- 当前部署为静态站点，刷新一期是构建前任务，不在公开页面暴露写入 API。
- GitDiscover 当前 502，OSS Insight 的事件派生趋势当前不可用；恢复后需先观察真实返回，再决定是否扩展字段映射。
- 历史刊为静态 JSON；第一版不含账号、社交、个性化推荐与全量爬虫。
