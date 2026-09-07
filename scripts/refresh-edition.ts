import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deterministicEdit } from "../src/lib/editor/deterministic";
import { dedupeProjects } from "../src/lib/pipeline/normalize";
import { rankProjects } from "../src/lib/pipeline/rank";
import { applySnapshotGrowth, loadPreviousSnapshot, saveSnapshot } from "../src/lib/pipeline/snapshot";
import { fetchGitDiscover } from "../src/lib/sources/gitdiscover";
import { fetchGitHubSearch, fetchGitHubTrending, probeGitHubEvents, probeGitHubExplore, probeGitHubRepository } from "../src/lib/sources/github";
import { fetchOssInsight } from "../src/lib/sources/ossinsight";
import type { DailyEdition, EditorialProject } from "../src/lib/types";

function shanghaiDate(): string {
  return process.env.EDITION_DATE ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
}

async function main() {
  const date = shanghaiDate();
  const now = new Date(`${date}T18:00:00+08:00`);
  const [search, trending, explore, events, gitDiscover, ossInsight] = await Promise.all([
    fetchGitHubSearch(date),
    fetchGitHubTrending(),
    probeGitHubExplore(),
    probeGitHubEvents(),
    fetchGitDiscover(),
    fetchOssInsight(),
  ]);

  const allProjects = [...search.projects, ...trending.projects, ...gitDiscover.projects, ...ossInsight.projects];
  const deduped = dedupeProjects(allProjects);
  const repository = await probeGitHubRepository(deduped[0]);
  const previous = await loadPreviousSnapshot(date);
  const withGrowth = applySnapshotGrowth(deduped, previous);
  await saveSnapshot(date, withGrowth);

  const eligibleCount = withGrowth.filter((project) => Boolean(project.description) && project.sources.some((source) => source.startsWith("github"))).length;
  const ranked = rankProjects(withGrowth, now, 10);
  if (!ranked.length) throw new Error("所有来源均未产生可核验候选，拒绝生成空榜或 mock 榜单");

  let summary: string;
  let projects: EditorialProject[];
  let editorMode: "ai" | "deterministic";
  if (process.env.AI_API_KEY) {
    const { editWithAi } = await import("../src/lib/editor/client");
    const edited = await editWithAi(ranked);
    projects = edited.projects.map((item) => {
      const facts = ranked.find((project) => project.canonicalUrl === item.githubUrl.toLowerCase().replace(/\/$/, ""));
      if (!facts) throw new Error(`AI 返回了候选列表之外的仓库：${item.githubUrl}`);
      return { ...facts, ...item, githubUrl: facts.githubUrl, canonicalUrl: facts.canonicalUrl } as EditorialProject;
    });
    summary = edited.summary;
    editorMode = "ai";
  } else {
    const edited = deterministicEdit(ranked);
    summary = edited.summary;
    projects = edited.projects;
    editorMode = "deterministic";
  }

  const sourceStatus = [search.status, trending.status, repository, events, explore, gitDiscover.status, ossInsight.status];
  const edition: DailyEdition = {
    date,
    issue: Number(process.env.EDITION_ISSUE ?? 2),
    title: "真实 GitHub 信号里的今日新项目",
    summary,
    mode: "live",
    editorMode,
    notice: `仓库事实与增长数据均来自真实 GitHub 数据；中文解释为${editorMode === "ai" ? " AI 编辑判断" : "确定性规则编辑"}。${previous ? `快照增长基线：${previous.date}。` : "首日尚无历史快照基线；仅展示 GitHub Trending 页面明确披露的短期增长。"}`,
    publishedAt: new Date().toISOString(),
    sourceStatus,
    pipelineStats: {
      rawCandidateCount: allProjects.length,
      normalizedCandidateCount: allProjects.length,
      dedupedCandidateCount: deduped.length,
      eligibleCandidateCount: eligibleCount,
      selectedCount: projects.length,
    },
    projects,
  };

  const outputDir = path.resolve(process.cwd(), "src/data/editions");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, `${date}.json`), `${JSON.stringify(edition, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ date, editorMode, previousSnapshot: previous?.date ?? null, sourceStatus, pipelineStats: edition.pipelineStats, selected: projects.map((project) => ({ name: project.name, url: project.githubUrl, stars: project.stars, growth: project.recentGrowth ?? null, growthSource: project.growthSource ?? null, score: project.score?.total, reason: project.whyToday })) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
