import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { aiEditionSchema, editorTaskSchema } from "../src/lib/editor/schema";
import type { CandidateProject, DailyEdition, EditorTask, EditorTaskCandidate, EditorialProject } from "../src/lib/types";
import { validateEdition } from "./validate-edition";
import { generateFeed } from "./generate-feed";

const ROOT = process.cwd();
const STATE_ROOT = path.join(ROOT, ".daily-pipeline");
const STAGING_ROOT = path.join(STATE_ROOT, "staging");
const OUTPUT_ROOT = path.join(STATE_ROOT, "editor-output");
const EDITIONS_ROOT = path.join(ROOT, "src/data/editions");
const ENRICHED_ROOT = path.join(ROOT, "src/data/enriched-candidates");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Stage = "prepare" | "stage" | "finalize" | "status" | "success" | "refresh-app";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function editionDate(): string {
  const value = option("date") ?? process.env.EDITION_DATE ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  if (!DATE_PATTERN.test(value)) throw new Error(`非法日期：${value}，必须为 YYYY-MM-DD`);
  return value;
}

async function atomicJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

async function atomicText(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, value, "utf8");
  await rename(temporary, filePath);
}

async function withLock<T>(date: string, action: () => Promise<T>): Promise<T> {
  const lock = path.join(STATE_ROOT, "locks", `${date}.lock`);
  await mkdir(path.dirname(lock), { recursive: true });
  try {
    await mkdir(lock);
  } catch {
    const age = Date.now() - (await stat(lock)).mtimeMs;
    if (age < 6 * 60 * 60 * 1000 || !hasFlag("force-lock")) {
      throw new Error(`日期 ${date} 已有流水线操作锁；确认没有其他任务后，超过 6 小时可使用 --force-lock`);
    }
    await rm(lock, { recursive: true });
    await mkdir(lock);
  }
  try {
    await writeFile(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), "utf8");
    return await action();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

async function readTask(date: string): Promise<EditorTask> {
  const taskPath = path.join(ROOT, "src/data/editor-tasks", `${date}.json`);
  return editorTaskSchema.parse(JSON.parse(await readFile(taskPath, "utf8"))) as EditorTask;
}

async function prepare(date: string): Promise<void> {
  const taskPath = path.join(ROOT, "src/data/editor-tasks", `${date}.json`);
  if (!hasFlag("force")) {
    try {
      const task = await readTask(date);
      console.log(JSON.stringify({ ok: true, stage: "prepare", reused: true, date, taskPath, candidateCount: task.candidates.length, sourceStatus: task.sourceStatus, next: `Aime 编辑后写入 ${path.join(OUTPUT_ROOT, `${date}.json`)}` }, null, 2));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const result = spawnSync("pnpm", ["collect", "--", "--date", date], { cwd: ROOT, env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`采集失败（exit ${result.status ?? 1}）：${result.stderr || result.stdout}`);
  const task = await readTask(date);
  console.log(JSON.stringify({ ok: true, stage: "prepare", reused: false, date, taskPath, candidateCount: task.candidates.length, sourceStatus: task.sourceStatus, editorOutputPath: path.join(OUTPUT_ROOT, `${date}.json`) }, null, 2));
}

function candidateProjectFrom(candidate: EditorTaskCandidate, chineseDescription: string): CandidateProject {
  return {
    name: candidate.repoName,
    githubUrl: candidate.url,
    canonicalUrl: candidate.url.toLowerCase().replace(/\/$/, ""),
    description: candidate.description,
    chineseDescription,
    readme: candidate.readmeSummary,
    stars: candidate.stars,
    forks: candidate.forks,
    openIssues: candidate.openIssues,
    recentGrowth: candidate.growth?.value,
    growthSource: candidate.growth?.source,
    language: candidate.language,
    topics: candidate.topics,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    pushedAt: candidate.pushedAt,
    sources: candidate.sources,
    score: candidate.score,
  };
}

function projectFrom(candidate: EditorTaskCandidate, chineseDescription: string, editorial: ReturnType<typeof aiEditionSchema.parse>["projects"][number]): EditorialProject {
  return {
    ...candidateProjectFrom(candidate, chineseDescription),
    plainSummary: editorial.plainSummary,
    introduction: editorial.introduction,
    whyToday: editorial.whyToday,
    audience: editorial.audience,
    editorialTags: editorial.editorialTags,
    recommendation: editorial.recommendation as EditorialProject["recommendation"],
  };
}

async function nextIssue(date: string): Promise<number> {
  const files = await readdir(EDITIONS_ROOT);
  const issues = await Promise.all(files.filter((file) => DATE_PATTERN.test(file.slice(0, -5)) && file.endsWith(".json")).map(async (file) => {
    try {
      const edition = JSON.parse(await readFile(path.join(EDITIONS_ROOT, file), "utf8"));
      if (file === `${date}.json`) return -Number(edition.issue || 0);
      return Number(edition.issue) || 0;
    } catch { return 0; }
  }));
  const existing = issues.find((issue) => issue < 0);
  return existing ? -existing : Math.max(0, ...issues) + 1;
}

async function stage(date: string): Promise<void> {
  const task = await readTask(date);
  const inputPath = path.resolve(option("input") ?? path.join(OUTPUT_ROOT, `${date}.json`));
  const output = aiEditionSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
  if (task.candidates.length < task.targetCount) {
    throw new Error(`候选池仅 ${task.candidates.length} 个，不足以出版固定 ${task.targetCount} 个 AI 精选`);
  }
  const expectedFeaturedCount = task.targetCount;

  const candidates = new Map(task.candidates.map((item) => [item.url.toLowerCase().replace(/\/$/, ""), item]));
  const translations = new Map<string, string>();
  for (const item of output.candidateTranslations) {
    const key = item.githubUrl.toLowerCase().replace(/\/$/, "");
    if (!candidates.has(key)) throw new Error(`候选池中文描述包含候选池外项目：${item.githubUrl}`);
    if (translations.has(key)) throw new Error(`候选池中文描述重复：${item.githubUrl}`);
    translations.set(key, item.chineseDescription);
  }
  const missingTranslations = [...candidates.keys()].filter((key) => !translations.has(key));
  if (missingTranslations.length || translations.size !== candidates.size) {
    throw new Error(`候选池中文描述必须完整覆盖 ${candidates.size} 个项目，当前 ${translations.size} 个，缺少 ${missingTranslations.length} 个`);
  }
  const seen = new Set<string>();
  const editorialProjects = output.projects.map((editorial) => {
    const key = editorial.githubUrl.toLowerCase().replace(/\/$/, "");
    if (seen.has(key)) throw new Error(`Aime 编辑结果重复：${editorial.githubUrl}`);
    seen.add(key);
    const candidate = candidates.get(key);
    if (!candidate) throw new Error(`Aime 编辑结果包含候选池外项目：${editorial.githubUrl}`);
    return projectFrom(candidate, translations.get(key)!, editorial);
  });

  const featuredProjects = editorialProjects.slice(0, expectedFeaturedCount);
  if (featuredProjects.length !== expectedFeaturedCount) {
    throw new Error(`Aime 编辑结果至少应包含 ${expectedFeaturedCount} 个项目以供精选，实际总计 ${editorialProjects.length} 个`);
  }

  const edition: DailyEdition = {
    date,
    issue: await nextIssue(date),
    title: "30 个真实 GitHub 项目，今天都能玩点不一样的",
    metadata: { targetCount: 30, degraded: false },
    summary: output.summary,
    mode: "live",
    editorMode: "aime",
    notice: "仓库事实仅来自 editor task 记录的 GitHub 官方来源；中文介绍由 Aime 基于其中的 description、README 摘要（如有）和评分信号编辑。",
    publishedAt: new Date().toISOString(),
    sourceStatus: task.sourceStatus,
    pipelineStats: { ...task.pipelineStats, selectedCount: featuredProjects.length },
    projects: featuredProjects,
  };

  const stagingPath = path.join(STAGING_ROOT, `${date}.json`);
  const stagingEnrichedPath = path.join(STAGING_ROOT, `enriched-${date}.json`);
  const candidateProjects = task.candidates.map((candidate) => candidateProjectFrom(candidate, translations.get(candidate.url.toLowerCase().replace(/\/$/, ""))!));
  await atomicJson(stagingPath, edition);
  await atomicJson(stagingEnrichedPath, { date, projects: candidateProjects });
  await validateEdition(date, stagingPath);
  console.log(JSON.stringify({ ok: true, stage: "stage", date, stagingPath, stagingEnrichedPath, featuredCount: featuredProjects.length, totalEnriched: candidateProjects.length, next: `pnpm pipeline:finalize -- --date ${date}` }, null, 2));
}

async function generatedIndex(): Promise<string> {
  const dates = (await readdir(EDITIONS_ROOT)).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).map((file) => file.slice(0, 10)).sort().reverse();
  if (!dates.length) throw new Error("没有可发布的正式 edition");
  const enrichedDates = (await readdir(ENRICHED_ROOT).catch(() => [])).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).map((file) => file.slice(0, 10));

  const imports = dates.map((date, index) => `import edition${index} from "./editions/${date}.json";`).join("\n");
  const enrichedImports = enrichedDates.map((date, index) => `import enriched${index} from "./enriched-candidates/${date}.json";`).join("\n");

  return `import type { CandidatePool, CandidateProject, DailyEdition } from "@/lib/types";\n${imports}\n${enrichedImports}\n\nexport const editions = [${dates.map((_, index) => `edition${index}`).join(", ")}] as DailyEdition[];\nexport const latestEdition = editions[0];\n\nexport const candidatePools: CandidatePool[] = [${enrichedDates.map((date, index) => `{ date: "${date}", projects: enriched${index}.projects as CandidateProject[] }`).join(", ")}];\n\nexport function getEdition(date: string): DailyEdition | undefined {\n  return editions.find((edition) => edition.date === date);\n}\n\nexport function getEnrichedCandidates(date: string): CandidateProject[] {\n  return candidatePools.find((item) => item.date === date)?.projects ?? [];\n}\n`;
}

async function finalize(date: string): Promise<void> {
  const stagingPath = path.join(STAGING_ROOT, `${date}.json`);
  const stagingEnrichedPath = path.join(STAGING_ROOT, `enriched-${date}.json`);
  const edition = await validateEdition(date, stagingPath);

  const finalPath = path.join(EDITIONS_ROOT, `${date}.json`);
  const finalEnrichedPath = path.join(ENRICHED_ROOT, `${date}.json`);

  await atomicJson(finalPath, edition);
  if (await stat(stagingEnrichedPath).catch(() => null)) {
    await mkdir(ENRICHED_ROOT, { recursive: true });
    const enriched = JSON.parse(await readFile(stagingEnrichedPath, "utf8"));
    await atomicJson(finalEnrichedPath, enriched);
  }

  await atomicText(path.join(ROOT, "src/data/index.ts"), await generatedIndex());
  const feed = await generateFeed();
  console.log(JSON.stringify({ ok: true, stage: "finalize", date, finalPath, finalEnrichedPath, selectedCount: edition.projects.length, feedLatest: feed.latest, feedEditionCount: feed.editions.length, next: "pnpm lint && pnpm test && pnpm build，然后部署 dist（pipeline:deploy）；部署成功后先运行 pipeline:refresh-app 刷新 Aime App，再运行 pipeline:success" }, null, 2));
}

type AppManifest = { id: string; name: string; services?: Array<{ name: string }> };

async function readAppManifest(): Promise<AppManifest> {
  const manifest = JSON.parse(await readFile(path.join(ROOT, "app.json"), "utf8")) as AppManifest;
  if (!manifest.id || !manifest.name) throw new Error("app.json 缺少 id 或 name，无法定位 Aime App 安装目录");
  return manifest;
}

// 动态定位 Aime App 的安装目录（`<name>_<id>`），绝不硬编码绝对路径。
// 依次尝试：显式环境变量 → 工作区/家目录下的 .aime/plugins → 从仓库根向上逐级查找的 .aime/plugins。
async function resolveInstallDir(manifest: AppManifest): Promise<string> {
  const installDirName = `${manifest.name}_${manifest.id}`;
  const roots: string[] = [];
  const pushRoot = (value: string | undefined | null) => {
    if (value && !roots.includes(value)) roots.push(value);
  };

  pushRoot(process.env.AIME_PLUGINS_DIR);
  pushRoot(process.env.AIME_WORKSPACE_PATH ? path.join(process.env.AIME_WORKSPACE_PATH, ".aime", "plugins") : undefined);
  pushRoot(process.env.HOME ? path.join(process.env.HOME, ".aime", "plugins") : undefined);
  let cursor = ROOT;
  for (let depth = 0; depth < 8; depth += 1) {
    pushRoot(path.join(cursor, ".aime", "plugins"));
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  const attempted: string[] = [];
  for (const root of roots) {
    // 优先按精确目录名匹配。
    const exact = path.join(root, installDirName);
    attempted.push(exact);
    if (await stat(path.join(exact, "app.json")).catch(() => null)) return exact;
    // 回退：同一 plugins 根下查找任意以 `_<id>` 结尾的安装目录。
    const entries = await readdir(root).catch(() => [] as string[]);
    const match = entries.find((entry) => entry.endsWith(`_${manifest.id}`));
    if (match) {
      const full = path.join(root, match);
      if (await stat(path.join(full, "app.json")).catch(() => null)) return full;
    }
  }

  throw new Error(`未能定位 Aime App 安装目录 ${installDirName}；已尝试：${attempted.join(", ") || "(无候选根目录)"}。可通过环境变量 AIME_PLUGINS_DIR 显式指定 plugins 根目录`);
}

// pipeline:deploy（线上部署）成功之后、pipeline:success 之前执行：
// 由于 App runtime 容器无法访问 raw.githubusercontent.com，只能读取打包进 dist 的 feed.json 兜底，
// 因此每期出版后必须重建 dist、覆盖安装目录并重启 App 服务，否则 App 会一直停在旧期。
async function refreshApp(date: string): Promise<void> {
  // 先确认正式 edition 已存在且合法，避免在未发布的日期上重建 dist。
  await validateEdition(date, path.join(EDITIONS_ROOT, `${date}.json`));

  // 1. 重建 dist（pnpm build 内部会先跑 feed:generate，确保 dist/data/feed.json 含最新期刊）。
  const build = spawnSync("pnpm", ["build"], { cwd: ROOT, env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (build.status !== 0) throw new Error(`重建 dist 失败（exit ${build.status ?? 1}）：${build.stderr || build.stdout}`);

  // 2. 校验重建后的 feed.json 确实包含最新期刊。
  const feedPath = path.join(ROOT, "dist", "data", "feed.json");
  const feed = JSON.parse(await readFile(feedPath, "utf8")) as { latest?: string };
  if (feed.latest !== date) throw new Error(`重建后的 dist/data/feed.json latest=${feed.latest ?? "(缺失)"}，期望 ${date}；拒绝覆盖安装目录`);

  // 3. 覆盖安装目录的 dist（路径动态查找，绝不硬编码）。
  const manifest = await readAppManifest();
  const installDir = await resolveInstallDir(manifest);
  const installDist = path.join(installDir, "dist");
  await rm(installDist, { recursive: true, force: true });
  await cp(path.join(ROOT, "dist"), installDist, { recursive: true });

  // 4. 重启 Aime App 服务，使其加载新的 dist/data/feed.json。
  const serviceName = manifest.services?.[0]?.name ?? manifest.name;
  const restart = spawnSync("aime", ["app", "service", "restart", manifest.name, serviceName], { cwd: ROOT, env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (restart.status !== 0) throw new Error(`重启 Aime App 服务失败（exit ${restart.status ?? 1}）：${restart.stderr || restart.stdout}`);

  console.log(JSON.stringify({ ok: true, stage: "refresh-app", date, installDir, installDist, feedLatest: feed.latest, restarted: `${manifest.name}/${serviceName}`, next: `pnpm pipeline:success -- --date ${date} --url <DEPLOYED_URL>` }, null, 2));
}

async function status(date: string): Promise<void> {
  const checks = await Promise.all([
    ["task", path.join(ROOT, "src/data/editor-tasks", `${date}.json`)],
    ["editorOutput", path.join(OUTPUT_ROOT, `${date}.json`)],
    ["staging", path.join(STAGING_ROOT, `${date}.json`)],
    ["edition", path.join(EDITIONS_ROOT, `${date}.json`)],
    ["build", path.join(ROOT, "dist/index.html")],
  ].map(async ([name, file]) => { try { await stat(file); return [name, true]; } catch { return [name, false]; } }));
  console.log(JSON.stringify({ ok: true, stage: "status", date, checks: Object.fromEntries(checks) }, null, 2));
}

async function readFeedLatest(): Promise<{ latest: string; source: string } | null> {
  for (const candidate of [path.join(ROOT, "dist/data/feed.json"), path.join(ROOT, "public/data/feed.json")]) {
    try {
      const feed = JSON.parse(await readFile(candidate, "utf8")) as { latest?: unknown };
      if (typeof feed.latest === "string") return { latest: feed.latest, source: candidate };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

// 成功校验不再访问线上 IDA 站点（服务端请求会被字节 SSO 重定向导致误判）。
// 改为校验本地构建产物：正式 edition 合法、dist/index.html 存在，且本地
// dist/data/feed.json（优先）或 public/data/feed.json 的 latest 字段等于当天日期。
async function success(date: string): Promise<void> {
  const url = option("url");
  const edition = await validateEdition(date, path.join(EDITIONS_ROOT, `${date}.json`));
  await stat(path.join(ROOT, "dist/index.html"));

  const feed = await readFeedLatest();
  if (!feed) throw new Error("未找到本地构建产物 feed.json（dist/data 或 public/data），请先完成 finalize 与 build 后再回执");
  if (feed.latest !== date) throw new Error(`本地构建产物 ${feed.source} 的 latest=${feed.latest}，与当天 ${date} 不一致，拒绝成功回执`);

  console.log(JSON.stringify({ ok: true, stage: "success", verifiedBy: feed.source, feedLatest: feed.latest, notification: { date, projectCount: edition.projects.length, sourceStatus: edition.sourceStatus.map(({ source, status, message }) => ({ source, status, message })), url: url ?? null } }, null, 2));
}

async function main() {
  const stageName = process.argv[2] as Stage | undefined;
  if (!stageName || !["prepare", "stage", "finalize", "status", "success", "refresh-app"].includes(stageName)) throw new Error("用法：daily-pipeline.ts <prepare|stage|finalize|status|success|refresh-app> --date YYYY-MM-DD");
  const date = editionDate();
  if (stageName === "status") return status(date);
  await withLock(date, async () => {
    if (stageName === "prepare") return prepare(date);
    if (stageName === "stage") return stage(date);
    if (stageName === "finalize") return finalize(date);
    if (stageName === "refresh-app") return refreshApp(date);
    return success(date);
  });
}

if (process.argv[1]?.endsWith("daily-pipeline.ts")) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, stage: process.argv[2] ?? "unknown", date: option("date") ?? process.env.EDITION_DATE ?? null, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  });
}
