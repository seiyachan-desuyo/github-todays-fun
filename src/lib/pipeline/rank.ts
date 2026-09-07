import type { CandidateProject, ScoreBreakdown } from "@/lib/types";

function ageInDays(value: string | undefined, now: Date): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.max(0, (now.getTime() - time) / 86_400_000) : undefined;
}

export function scoreProject(project: CandidateProject, now: Date): ScoreBreakdown {
  const signals: string[] = [];
  const growth = project.recentGrowth ?? 0;
  const snapshotGrowth = project.growthSource === "snapshot" ? Math.min(45, Math.log2(growth + 1) * 7) : 0;
  const trendingGrowth = project.growthSource === "github-trending" ? Math.min(55, Math.log2(growth + 1) * 6) : 0;
  if (snapshotGrowth) signals.push(`快照实增 +${growth}`);
  if (trendingGrowth) signals.push(`Trending 披露 +${growth}`);

  const createdAge = ageInDays(project.createdAt, now);
  const starsPerDay = createdAge !== undefined && typeof project.stars === "number" ? project.stars / Math.max(1, createdAge) : 0;
  const newProjectVelocity = createdAge !== undefined && createdAge <= 30 ? Math.min(30, Math.log2(starsPerDay + 1) * 5) : 0;
  if (newProjectVelocity) signals.push(`新仓约 ${Math.round(starsPerDay)} stars/day`);

  const pushedAge = ageInDays(project.pushedAt ?? project.updatedAt, now);
  const pushedFreshness = pushedAge === undefined ? 0 : pushedAge <= 1 ? 12 : pushedAge <= 3 ? 8 : pushedAge <= 7 ? 4 : 0;
  if (pushedFreshness) signals.push(`${Math.max(0, Math.ceil(pushedAge ?? 0))} 天内有更新`);

  const crossSource = Math.min(12, Math.max(0, project.sources.length - 1) * 6);
  if (crossSource) signals.push(`${project.sources.length} 个来源交叉出现`);

  const total = Math.round((snapshotGrowth + trendingGrowth + newProjectVelocity + pushedFreshness + crossSource) * 10) / 10;
  if (!signals.length) signals.push("进入 GitHub 官方候选源");
  return { snapshotGrowth, trendingGrowth, newProjectVelocity, pushedFreshness, crossSource, total, signals };
}

export function rankProjects(projects: CandidateProject[], now: Date, limit = 10): CandidateProject[] {
  return projects
    .filter((project) => Boolean(project.description) && project.sources.some((source) => source.startsWith("github")))
    .map((project) => ({ ...project, score: scoreProject(project, now) }))
    .sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0) || (b.recentGrowth ?? 0) - (a.recentGrowth ?? 0) || (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, limit);
}
