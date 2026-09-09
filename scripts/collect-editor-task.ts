import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dedupeProjects } from "../src/lib/pipeline/normalize";
import { DAILY_EDITION_TARGET, rankProjects } from "../src/lib/pipeline/rank";
import { applySnapshotGrowth, loadPreviousSnapshot, saveSnapshot } from "../src/lib/pipeline/snapshot";
import { fetchGitHubSearch, fetchGitHubTrending, probeGitHubRepository } from "../src/lib/sources/github";
import type { EditorTask, EditorTaskCandidate } from "../src/lib/types";

function shanghaiDate(): string {
  const index = process.argv.indexOf("--date");
  const value = (index >= 0 ? process.argv[index + 1] : undefined) ?? process.env.EDITION_DATE ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`非法日期：${value}，必须为 YYYY-MM-DD`);
  return value;
}

function toTaskCandidate(project: ReturnType<typeof rankProjects>[number]): EditorTaskCandidate {
  if (!project.score) throw new Error(`候选 ${project.name} 缺少评分`);
  return {
    repoName: project.name,
    url: project.githubUrl,
    description: project.description,
    readmeSummary: project.readme,
    stars: project.stars,
    forks: project.forks,
    openIssues: project.openIssues,
    growth: typeof project.recentGrowth === "number" && project.growthSource
      ? { value: project.recentGrowth, source: project.growthSource }
      : undefined,
    language: project.language,
    topics: project.topics,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    pushedAt: project.pushedAt,
    sources: project.sources,
    score: project.score,
  };
}

async function main() {
  const date = shanghaiDate();
  const now = new Date(`${date}T18:00:00+08:00`);
  const [search, trending] = await Promise.all([
    fetchGitHubSearch(date),
    fetchGitHubTrending(),
  ]);

  const allProjects = [...search.projects, ...trending.projects];
  const deduped = dedupeProjects(allProjects);
  const repository = await probeGitHubRepository(deduped[0]);
  const previous = await loadPreviousSnapshot(date);
  const withGrowth = applySnapshotGrowth(deduped, previous);
  await saveSnapshot(date, withGrowth);

  const candidates = rankProjects(withGrowth, now, Number.POSITIVE_INFINITY).map(toTaskCandidate);
  if (!candidates.length) throw new Error("所有来源均未产生可核验候选，拒绝生成空任务或 mock 数据");

  const sourceStatus = [search.status, trending.status, repository];
  const task: EditorTask = {
    date,
    generatedAt: new Date().toISOString(),
    editorMode: "aime",
    targetCount: DAILY_EDITION_TARGET,
    snapshotPath: `src/data/snapshots/${date}.json`,
    sourceStatus,
    pipelineStats: {
      rawCandidateCount: allProjects.length,
      normalizedCandidateCount: allProjects.length,
      dedupedCandidateCount: deduped.length,
      eligibleCandidateCount: candidates.length,
      selectedCount: 0,
    },
    candidates,
  };

  const outputDir = path.resolve(process.cwd(), "src/data/editor-tasks");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${date}.json`);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  console.log(JSON.stringify({
    date,
    outputPath,
    previousSnapshot: previous?.date ?? null,
    sourceStatus,
    pipelineStats: task.pipelineStats,
    targetCount: DAILY_EDITION_TARGET,
    topCandidates: candidates.slice(0, DAILY_EDITION_TARGET).map(({ repoName, url, stars, growth, score }) => ({ repoName, url, stars, growth, score: score.total })),
    next: `请让 Aime 阅读 ${outputPath}，编辑 src/data/editions/${date}.json，再运行 pnpm validate:edition`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
