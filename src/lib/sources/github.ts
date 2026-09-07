import { makeCandidate } from "@/lib/pipeline/normalize";
import type { CandidateProject, SourceName, SourceSnapshot } from "@/lib/types";

const API_ROOT = "https://api.github.com";
const WEB_ROOT = "https://github.com";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "github-today-fun/1.0 (+daily open-source discovery)";

type JsonRecord = Record<string, unknown>;

function headers(accept = "application/vnd.github+json"): Record<string, string> {
  const result: Record<string, string> = { Accept: accept, "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) result.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return result;
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : undefined;
}

function responseStatus(source: SourceName, fetchedAt: string, response: Response, message: string): SourceSnapshot {
  const remaining = response.headers.get("x-ratelimit-remaining");
  return {
    source,
    status: response.ok ? "ok" : response.status === 403 || response.status === 429 ? "degraded" : "unavailable",
    fetchedAt,
    message: `${message}${remaining !== null ? `；rate limit remaining=${remaining}` : ""}`,
  };
}

function candidateFromApi(raw: JsonRecord, source: SourceName, fetchedAt: string): CandidateProject | null {
  return makeCandidate({
    source,
    fetchedAt,
    raw,
    name: raw.full_name,
    githubUrl: raw.html_url,
    description: raw.description,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssues: raw.open_issues_count,
    language: raw.language,
    topics: raw.topics,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    pushedAt: raw.pushed_at,
  });
}

export interface TrendingRow {
  name: string;
  githubUrl: string;
  description?: string;
  language?: string;
  stars?: number;
  forks?: number;
  starsToday?: number;
}

export function parseTrendingHtml(html: string): TrendingRow[] {
  const articles = html.match(/<article\b[^>]*class="[^"]*Box-row[^"]*"[^>]*>[\s\S]*?<\/article>/gi) ?? [];
  return articles.flatMap((article) => {
    const repoMatch = article.match(/<h2\b[\s\S]*?<a\b[^>]*href="\/([^/"?#]+)\/([^/"?#]+)"/i);
    if (!repoMatch) return [];
    const name = `${decodeHtml(repoMatch[1])}/${decodeHtml(repoMatch[2])}`;
    const description = article.match(/<p\b[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const language = article.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const stars = article.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/i)?.[1];
    const forks = article.match(/href="\/[^"]+\/forks"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/i)?.[1];
    const growth = article.match(/([\d,]+)\s+stars?\s+(?:today|this week)/i)?.[1];
    return [{
      name,
      githubUrl: `${WEB_ROOT}/${name}`,
      description: description ? decodeHtml(description) : undefined,
      language: language ? decodeHtml(language) : undefined,
      stars: numberFrom(stars),
      forks: numberFrom(forks),
      starsToday: numberFrom(growth),
    }];
  });
}

export async function fetchGitHubSearch(date: string): Promise<{ projects: CandidateProject[]; status: SourceSnapshot }> {
  const fetchedAt = new Date().toISOString();
  const day = new Date(`${date}T00:00:00Z`);
  const threeDaysAgo = new Date(day.getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(day.getTime() - 14 * 86_400_000).toISOString().slice(0, 10);
  const queries = [
    `created:>=${threeDaysAgo} stars:>=5`,
    `created:>=${fourteenDaysAgo} stars:>=25`,
    `pushed:>=${threeDaysAgo} stars:50..5000 archived:false`,
  ];
  const projects: CandidateProject[] = [];
  const details: Array<{ query: string; status: number; count: number; message?: string }> = [];

  for (const query of queries) {
    try {
      const url = new URL(`${API_ROOT}/search/repositories`);
      url.searchParams.set("q", query);
      url.searchParams.set("sort", query.startsWith("pushed:") ? "updated" : "stars");
      url.searchParams.set("order", "desc");
      url.searchParams.set("per_page", "50");
      const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
      const payload = await response.json() as { items?: JsonRecord[]; message?: string };
      const items = Array.isArray(payload.items) ? payload.items : [];
      details.push({ query, status: response.status, count: items.length, message: payload.message });
      if (!response.ok) continue;
      projects.push(...items.map((raw) => candidateFromApi(raw, "github-search", fetchedAt)).filter((item): item is CandidateProject => Boolean(item)));
    } catch (error) {
      details.push({ query, status: 0, count: 0, message: error instanceof Error ? error.message : "请求失败" });
    }
  }

  const successCount = details.filter((item) => item.status === 200).length;
  return {
    projects,
    status: {
      source: "github-search",
      status: successCount === queries.length ? "ok" : successCount ? "degraded" : "unavailable",
      fetchedAt,
      rawCount: projects.length,
      normalizedCount: projects.length,
      message: `${successCount}/${queries.length} 个查询成功，读取 ${projects.length} 条；${process.env.GITHUB_TOKEN ? "已认证" : "匿名 Search 仅 10 次/分钟，生产强烈建议 GITHUB_TOKEN"}`,
      raw: details,
    },
  };
}

export async function fetchGitHubTrending(): Promise<{ projects: CandidateProject[]; status: SourceSnapshot }> {
  const fetchedAt = new Date().toISOString();
  const projects: CandidateProject[] = [];
  const details: Array<{ period: string; status: number; count: number }> = [];
  for (const period of ["daily", "weekly"] as const) {
    try {
      const response = await fetch(`${WEB_ROOT}/trending?since=${period}`, {
        headers: { Accept: "text/html", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const html = await response.text();
      const rows = response.ok ? parseTrendingHtml(html) : [];
      details.push({ period, status: response.status, count: rows.length });
      for (const row of rows) {
        const candidate = makeCandidate({
          source: "github-trending",
          fetchedAt,
          raw: { ...row, period },
          name: row.name,
          githubUrl: row.githubUrl,
          description: row.description,
          stars: row.stars,
          forks: row.forks,
          recentGrowth: period === "daily" ? row.starsToday : undefined,
          growthSource: period === "daily" && row.starsToday !== undefined ? "github-trending" : undefined,
          language: row.language,
        });
        if (candidate) projects.push(candidate);
      }
    } catch {
      details.push({ period, status: 0, count: 0 });
    }
  }
  const parsedPages = details.filter((item) => item.status === 200 && item.count > 0).length;
  return {
    projects,
    status: {
      source: "github-trending",
      status: parsedPages === 2 ? "ok" : parsedPages ? "degraded" : "unavailable",
      fetchedAt,
      rawCount: projects.length,
      normalizedCount: projects.length,
      message: `${parsedPages}/2 个 GitHub Trending 页面解析成功，读取 ${projects.length} 条；daily 的 stars today 作为页面明确披露的真实短期信号`,
      raw: details,
    },
  };
}

export async function probeGitHubExplore(): Promise<SourceSnapshot> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(`${WEB_ROOT}/explore`, { headers: { Accept: "text/html", "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const html = await response.text();
    const hasExplore = response.ok && html.length > 100_000;
    return {
      source: "github-explore",
      status: hasExplore ? "degraded" : "unavailable",
      fetchedAt,
      rawCount: 0,
      normalizedCount: 0,
      message: hasExplore
        ? `页面可访问（${Math.round(html.length / 1024)}KB），但内容混合专题/用户/仓库且无稳定公开结构；本次仅探活，不纳入候选以避免误解析`
        : `HTTP ${response.status} 或页面结构异常`,
    };
  } catch (error) {
    return { source: "github-explore", status: "unavailable", fetchedAt, message: error instanceof Error ? error.message : "请求失败" };
  }
}

export async function probeGitHubRepository(project?: CandidateProject): Promise<SourceSnapshot> {
  const fetchedAt = new Date().toISOString();
  if (!project) return { source: "github-repository", status: "degraded", fetchedAt, message: "候选池为空，未执行仓库详情探针" };
  const [, , , owner, repo] = project.canonicalUrl.split("/");
  try {
    const response = await fetch(`${API_ROOT}/repos/${owner}/${repo}`, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return responseStatus("github-repository", fetchedAt, response, `HTTP ${response.status}，详情补全跳过；保留 Search/Trending 已有事实`);
    return { source: "github-repository", status: "ok", fetchedAt, rawCount: 1, normalizedCount: 1, message: `仓库详情 API 可用，已验证 ${project.name}` };
  } catch (error) {
    return { source: "github-repository", status: "unavailable", fetchedAt, message: error instanceof Error ? error.message : "请求失败" };
  }
}

export async function probeGitHubEvents(): Promise<SourceSnapshot> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(`${API_ROOT}/events?per_page=10`, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return responseStatus("github-events", fetchedAt, response, `HTTP ${response.status}，可选活跃度信号跳过，不阻塞日报`);
    const payload = await response.json() as unknown[];
    return { source: "github-events", status: "ok", fetchedAt, rawCount: payload.length, normalizedCount: 0, message: `读取 ${payload.length} 条公共事件；只用于探活，公共流不适合直接推断全站热度` };
  } catch (error) {
    return { source: "github-events", status: "unavailable", fetchedAt, message: error instanceof Error ? error.message : "请求失败" };
  }
}

export async function enrichFromGitHub(project: CandidateProject): Promise<CandidateProject> {
  const [, , , owner, repo] = project.canonicalUrl.split("/");
  if (!owner || !repo) return project;
  try {
    const response = await fetch(`${API_ROOT}/repos/${owner}/${repo}`, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return project;
    const facts = await response.json() as JsonRecord;
    const enriched = candidateFromApi(facts, "github-repository", new Date().toISOString());
    if (!enriched) return project;
    return {
      ...project,
      ...enriched,
      description: enriched.description ?? project.description,
      stars: enriched.stars ?? project.stars,
      forks: enriched.forks ?? project.forks,
      openIssues: enriched.openIssues ?? project.openIssues,
      topics: enriched.topics.length ? enriched.topics : project.topics,
      recentGrowth: project.recentGrowth,
      growthSource: project.growthSource,
      sources: [...new Set([...project.sources, ...enriched.sources])],
      raw: [...project.raw, ...enriched.raw],
    };
  } catch {
    return project;
  }
}
