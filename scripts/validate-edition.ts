import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aimeEditionSchema, editorTaskSchema } from "../src/lib/editor/schema";
import { DAILY_EDITION_TARGET } from "../src/lib/pipeline/rank";
import type { DailyEdition, EditorTask, EditorTaskCandidate, EditorialProject } from "../src/lib/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function shanghaiDate(): string {
  const value = option("date") ?? process.env.EDITION_DATE ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  if (!DATE_PATTERN.test(value)) throw new Error(`非法日期：${value}，必须为 YYYY-MM-DD`);
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertFactMatch(project: EditorialProject, candidate: EditorTaskCandidate) {
  const expected = {
    name: candidate.repoName,
    githubUrl: candidate.url,
    canonicalUrl: candidate.url.toLowerCase().replace(/\/$/, ""),
    description: candidate.description,
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
  for (const [key, value] of Object.entries(expected)) {
    if (!sameJson(project[key as keyof EditorialProject], value)) throw new Error(`${project.name} 的事实字段 ${key} 与 editor task 不一致`);
  }
}

export async function validateEdition(date: string, editionFile?: string): Promise<DailyEdition> {
  if (!DATE_PATTERN.test(date)) throw new Error(`非法日期：${date}`);
  const taskPath = path.resolve(process.cwd(), `src/data/editor-tasks/${date}.json`);
  const editionPath = editionFile ? path.resolve(editionFile) : path.resolve(process.cwd(), `src/data/editions/${date}.json`);
  const task = editorTaskSchema.parse(JSON.parse(await readFile(taskPath, "utf8"))) as EditorTask;
  const edition = aimeEditionSchema.parse(JSON.parse(await readFile(editionPath, "utf8"))) as DailyEdition;

  if (task.date !== edition.date || edition.date !== date) throw new Error("editor task、edition 与命令日期不一致");
  if (task.targetCount !== DAILY_EDITION_TARGET || edition.metadata?.targetCount !== DAILY_EDITION_TARGET) throw new Error("每日正式刊目标必须为 30 项");
  const expectedCount = Math.min(DAILY_EDITION_TARGET, task.candidates.length);
  if (edition.projects.length !== expectedCount) throw new Error(`正式刊应包含 ${expectedCount} 项，实际为 ${edition.projects.length} 项`);
  const shouldDegrade = task.candidates.length < DAILY_EDITION_TARGET;
  if (edition.metadata?.degraded !== shouldDegrade) throw new Error(shouldDegrade ? "候选不足时 metadata 必须明示降级" : "候选充足时不得标记为降级出版");
  const byUrl = new Map(task.candidates.map((candidate) => [candidate.url.toLowerCase().replace(/\/$/, ""), candidate]));
  const seen = new Set<string>();
  for (const project of edition.projects) {
    const sentenceCount = [...project.introduction].filter((character) => "。！？.!?".includes(character)).length;
    if (sentenceCount < 2 || sentenceCount > 3) throw new Error(`${project.name} 的玩法/用途必须为 2–3 句`);
    const key = project.canonicalUrl.toLowerCase().replace(/\/$/, "");
    if (seen.has(key)) throw new Error(`正式刊存在重复项目：${project.githubUrl}`);
    seen.add(key);
    const candidate = byUrl.get(key);
    if (!candidate) throw new Error(`正式刊包含候选池之外的项目：${project.githubUrl}`);
    assertFactMatch(project, candidate);
  }
  if (!sameJson(edition.sourceStatus, task.sourceStatus)) throw new Error("正式刊 sourceStatus 与 editor task 不一致");
  const expectedStats = { ...task.pipelineStats, selectedCount: edition.projects.length };
  if (!sameJson(edition.pipelineStats, expectedStats)) throw new Error("正式刊 pipelineStats 与 editor task/入选数不一致");
  return edition;
}

async function main() {
  const date = shanghaiDate();
  const edition = await validateEdition(date, option("file"));
  console.log(JSON.stringify({ ok: true, stage: "validate", date, editorMode: edition.editorMode, candidateCount: edition.pipelineStats?.eligibleCandidateCount, selectedCount: edition.projects.length, projects: edition.projects.map((project) => project.name) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, stage: "validate", date: option("date") ?? process.env.EDITION_DATE ?? null, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  });
}
