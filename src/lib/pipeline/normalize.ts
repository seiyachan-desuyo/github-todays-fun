import type { CandidateProject, GrowthSource, RawProject, SourceName } from "@/lib/types";

export function canonicalizeRepoUrl(value: string): string | null {
  const normalized = value.trim().replace(/^git@github\.com:/i, "https://github.com/");
  try {
    const url = new URL(/^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const [owner, repo] = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (!owner || !repo) return null;
    return `https://github.com/${owner.toLowerCase()}/${repo.replace(/\.git$/i, "").toLowerCase()}`;
  } catch {
    return null;
  }
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function makeCandidate(input: {
  source: SourceName;
  fetchedAt: string;
  raw: unknown;
  name?: unknown;
  githubUrl?: unknown;
  description?: unknown;
  stars?: unknown;
  forks?: unknown;
  openIssues?: unknown;
  recentGrowth?: unknown;
  growthSource?: GrowthSource;
  language?: unknown;
  topics?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  pushedAt?: unknown;
  eventCount?: unknown;
}): CandidateProject | null {
  const githubUrl = asString(input.githubUrl);
  const canonicalUrl = githubUrl ? canonicalizeRepoUrl(githubUrl) : null;
  if (!canonicalUrl) return null;
  const fallbackName = canonicalUrl.split("/").slice(-2).join("/");
  return {
    name: asString(input.name) ?? fallbackName,
    githubUrl: canonicalUrl,
    canonicalUrl,
    description: asString(input.description),
    stars: asNumber(input.stars),
    forks: asNumber(input.forks),
    openIssues: asNumber(input.openIssues),
    recentGrowth: asNumber(input.recentGrowth),
    growthSource: input.growthSource,
    language: asString(input.language),
    topics: asStringArray(input.topics),
    createdAt: asString(input.createdAt),
    updatedAt: asString(input.updatedAt),
    pushedAt: asString(input.pushedAt),
    eventCount: asNumber(input.eventCount),
    sources: [input.source],
    raw: [{ source: input.source, fetchedAt: input.fetchedAt, raw: input.raw } satisfies RawProject],
  };
}

export function dedupeProjects(projects: CandidateProject[]): CandidateProject[] {
  const byUrl = new Map<string, CandidateProject>();
  for (const project of projects) {
    const current = byUrl.get(project.canonicalUrl);
    if (!current) {
      byUrl.set(project.canonicalUrl, project);
      continue;
    }
    const currentGrowth = current.recentGrowth ?? -1;
    const projectGrowth = project.recentGrowth ?? -1;
    const growthWinner = projectGrowth > currentGrowth ? project : current;
    byUrl.set(project.canonicalUrl, {
      ...current,
      description: current.description ?? project.description,
      stars: Math.max(current.stars ?? 0, project.stars ?? 0) || undefined,
      forks: Math.max(current.forks ?? 0, project.forks ?? 0) || undefined,
      openIssues: current.openIssues ?? project.openIssues,
      recentGrowth: Math.max(currentGrowth, projectGrowth) >= 0 ? Math.max(currentGrowth, projectGrowth) : undefined,
      growthSource: growthWinner.growthSource,
      language: current.language ?? project.language,
      topics: [...new Set([...current.topics, ...project.topics])],
      createdAt: current.createdAt ?? project.createdAt,
      updatedAt: current.updatedAt ?? project.updatedAt,
      pushedAt: current.pushedAt ?? project.pushedAt,
      eventCount: (current.eventCount ?? 0) + (project.eventCount ?? 0) || undefined,
      sources: [...new Set([...current.sources, ...project.sources])],
      raw: [...current.raw, ...project.raw],
    });
  }
  return [...byUrl.values()];
}
