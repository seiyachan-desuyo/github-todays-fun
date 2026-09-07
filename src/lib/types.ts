export const EDITORIAL_TAGS = [
  "AI 工具",
  "效率",
  "有趣",
  "设计",
  "数据",
  "学习",
  "开源替代",
  "开发工具",
] as const;

export type EditorialTag = (typeof EDITORIAL_TAGS)[number];
export type SourceName =
  | "github-search"
  | "github-trending"
  | "github-explore"
  | "github-repository"
  | "github-events"
  | "gitdiscover"
  | "ossinsight"
  | "github";
export type GrowthSource = "snapshot" | "github-trending";

export interface SourceSnapshot {
  source: SourceName;
  status: "ok" | "degraded" | "unavailable";
  fetchedAt: string;
  message: string;
  rawCount?: number;
  normalizedCount?: number;
  raw?: unknown;
}

export interface RawProject {
  source: SourceName;
  fetchedAt: string;
  raw: unknown;
}

export interface ScoreBreakdown {
  snapshotGrowth: number;
  trendingGrowth: number;
  newProjectVelocity: number;
  pushedFreshness: number;
  crossSource: number;
  total: number;
  signals: string[];
}

export interface CandidateProject {
  name: string;
  githubUrl: string;
  canonicalUrl: string;
  description?: string;
  readme?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  recentGrowth?: number;
  growthSource?: GrowthSource;
  language?: string;
  topics: string[];
  createdAt?: string;
  updatedAt?: string;
  pushedAt?: string;
  eventCount?: number;
  sources: SourceName[];
  raw: RawProject[];
  score?: ScoreBreakdown;
}

export interface EditorialProject extends CandidateProject {
  plainSummary: string;
  introduction: string;
  whyToday: string;
  audience: string;
  editorialTags: EditorialTag[];
  recommendation: 1 | 2 | 3 | 4 | 5;
}

export interface PipelineStats {
  rawCandidateCount: number;
  normalizedCandidateCount: number;
  dedupedCandidateCount: number;
  eligibleCandidateCount: number;
  selectedCount: number;
}

export interface DailyEdition {
  date: string;
  issue: number;
  title: string;
  summary: string;
  mode: "live" | "demo";
  editorMode?: "ai" | "deterministic" | "manual";
  notice?: string;
  publishedAt: string;
  sourceStatus: SourceSnapshot[];
  pipelineStats?: PipelineStats;
  projects: EditorialProject[];
}

export interface ProjectSnapshot {
  canonicalUrl: string;
  name: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  pushedAt?: string;
  observedAt: string;
  sources: SourceName[];
}

export interface DailySnapshot {
  date: string;
  observedAt: string;
  projects: ProjectSnapshot[];
}
