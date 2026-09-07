import { makeCandidate } from "@/lib/pipeline/normalize";
import type { CandidateProject, SourceSnapshot } from "@/lib/types";

const BASE_URL = "https://api.gitdiscover.org/v1";

function recordsFrom(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  for (const key of ["data", "repositories", "items", "results"]) {
    if (Array.isArray(object[key])) return recordsFrom(object[key]);
    if (object[key] && typeof object[key] === "object") {
      const nested = recordsFrom(object[key]);
      if (nested.length) return nested;
    }
  }
  return [];
}

export async function fetchGitDiscover(): Promise<{ projects: CandidateProject[]; status: SourceSnapshot }> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(`${BASE_URL}/hot`, {
      headers: { "User-Agent": "github-today-fun/1.0", ...(process.env.GITDISCOVER_API_KEY ? { "X-API-Key": process.env.GITDISCOVER_API_KEY } : {}) },
      signal: AbortSignal.timeout(12_000),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
    const payload: unknown = JSON.parse(text);
    const projects = recordsFrom(payload).map((raw) => makeCandidate({
      source: "gitdiscover",
      fetchedAt,
      raw,
      name: raw.full_name ?? raw.name,
      githubUrl: raw.html_url ?? raw.github_url ?? raw.url,
      description: raw.description,
      stars: raw.stargazers_count ?? raw.stars,
      recentGrowth: raw.stars_growth_24h ?? raw.star_growth,
      language: raw.language,
      topics: raw.topics,
    })).filter((item): item is CandidateProject => Boolean(item));
    return {
      projects,
      status: {
        source: "gitdiscover",
        status: projects.length ? "ok" : "degraded",
        fetchedAt,
        message: projects.length ? `读取到 ${projects.length} 个候选项目` : "接口可访问，但未识别到可确认字段的项目",
        rawCount: recordsFrom(payload).length,
        normalizedCount: projects.length,
        raw: payload,
      },
    };
  } catch (error) {
    return { projects: [], status: { source: "gitdiscover", status: "unavailable", fetchedAt, message: error instanceof Error ? error.message : "请求失败" } };
  }
}
