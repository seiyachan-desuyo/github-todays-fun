import { makeCandidate } from "@/lib/pipeline/normalize";
import type { CandidateProject, SourceSnapshot } from "@/lib/types";

const URL = "https://api.ossinsight.io/v1/trends/repos/?period=past_week&language=All";

type JsonRecord = Record<string, unknown>;

function rowRecords(payload: unknown): JsonRecord[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as JsonRecord).data;
  if (!data || typeof data !== "object") return [];
  const { columns, rows } = data as JsonRecord;
  if (!Array.isArray(rows)) return [];
  if (rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) return rows as JsonRecord[];
  if (!Array.isArray(columns)) return [];
  const names = columns.map((column) => typeof column === "string" ? column : column && typeof column === "object" ? String((column as JsonRecord).name ?? "") : "");
  return rows.filter(Array.isArray).map((row) => Object.fromEntries(names.map((name, index) => [name, row[index]])));
}

export async function fetchOssInsight(): Promise<{ projects: CandidateProject[]; status: SourceSnapshot }> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(URL, { headers: { Accept: "application/json", "User-Agent": "github-today-fun/1.0" }, signal: AbortSignal.timeout(12_000) });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const object = payload as JsonRecord;
    const quality = object.data_quality as JsonRecord | undefined;
    const projects = rowRecords(payload).map((raw) => makeCandidate({
      source: "ossinsight",
      fetchedAt,
      raw,
      name: raw.repo_name ?? raw.full_name ?? raw.name,
      githubUrl: raw.repo_url ?? raw.html_url ?? raw.github_url,
      description: raw.description,
      stars: raw.stars ?? raw.stargazers_count,
      recentGrowth: raw.stars_growth ?? raw.star_growth,
      language: raw.language,
      topics: raw.topics,
    })).filter((item): item is CandidateProject => Boolean(item));
    const unavailable = quality?.status === "unavailable";
    return {
      projects,
      status: {
        source: "ossinsight",
        status: unavailable ? "unavailable" : projects.length ? "ok" : "degraded",
        fetchedAt,
        message: unavailable ? String(quality?.reason ?? "数据质量标记为不可用") : projects.length ? `读取到 ${projects.length} 个候选项目` : "接口返回空结果",
        rawCount: rowRecords(payload).length,
        normalizedCount: projects.length,
        raw: payload,
      },
    };
  } catch (error) {
    return { projects: [], status: { source: "ossinsight", status: "unavailable", fetchedAt, message: error instanceof Error ? error.message : "请求失败" } };
  }
}
