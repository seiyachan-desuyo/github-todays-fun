import type { CandidateProject, EditorialProject, EditorialTag, SourceName } from "@/lib/types";

export const DISCOVERY_CATEGORIES = [
  { id: "all", label: "今日 30 个", shortLabel: "全部" },
  { id: "new", label: "刚刚冒头", shortLabel: "新鲜" },
  { id: "hot", label: "突然变火", shortLabel: "变火" },
  { id: "ai", label: "AI 好玩", shortLabel: "AI" },
  { id: "useful", label: "实用工具", shortLabel: "实用" },
  { id: "wonder", label: "脑洞项目", shortLabel: "脑洞" },
  { id: "for-you", label: "为你推荐", shortLabel: "推荐" },
  { id: "saved", label: "稍后看", shortLabel: "收藏" },
] as const;

export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number]["id"];

export const INTEREST_OPTIONS: Array<{ tag: EditorialTag; label: string; hint: string }> = [
  { tag: "AI 工具", label: "AI 新玩具", hint: "模型、Agent 与创作工具" },
  { tag: "效率", label: "效率提升", hint: "省时间、少折腾" },
  { tag: "有趣", label: "有趣脑洞", hint: "周末也想打开看看" },
  { tag: "设计", label: "设计与体验", hint: "灵感、界面与创作" },
  { tag: "学习", label: "轻松学习", hint: "教程、知识与练习" },
  { tag: "开源替代", label: "开源替代", hint: "把常用服务握在自己手里" },
  { tag: "开发工具", label: "开发小帮手", hint: "写代码也可以更省心" },
  { tag: "数据", label: "数据探索", hint: "看懂、整理与使用数据" },
];

export const SOURCE_LABELS: Record<SourceName, string> = {
  "github-search": "GitHub Search",
  "github-trending": "GitHub Trending",
  "github-repository": "GitHub 仓库页",
};

function daysSince(value: string | undefined, editionDate: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const start = new Date(value).getTime();
  const end = new Date(`${editionDate}T23:59:59+08:00`).getTime();
  return Number.isFinite(start) ? Math.max(0, (end - start) / 86_400_000) : Number.POSITIVE_INFINITY;
}

export function isNewProject(project: CandidateProject, editionDate: string): boolean {
  return daysSince(project.createdAt, editionDate) <= 30;
}

export function isHotProject(project: CandidateProject): boolean {
  return typeof project.recentGrowth === "number" && project.recentGrowth > 0;
}

export function matchesCategory(project: EditorialProject, category: DiscoveryCategory, editionDate: string, saved: string[]): boolean {
  if (category === "all" || category === "for-you") return true;
  if (category === "saved") return saved.includes(project.canonicalUrl);
  if (category === "new") return isNewProject(project, editionDate);
  if (category === "hot") return isHotProject(project);
  if (category === "ai") return project.editorialTags.includes("AI 工具");
  if (category === "wonder") return project.editorialTags.includes("有趣");
  return project.editorialTags.some((tag) => ["效率", "设计", "数据", "学习", "开源替代", "开发工具"].includes(tag));
}

export function projectCategory(project: CandidateProject, editionDate: string): string {
  if (isNewProject(project, editionDate)) return "刚刚冒头";
  if (isHotProject(project)) return "突然变火";
  const editorialTags = "editorialTags" in project && Array.isArray(project.editorialTags) ? project.editorialTags : [];
  if (editorialTags.includes("AI 工具")) return "AI 好玩";
  if (editorialTags.includes("有趣")) return "脑洞项目";
  return "实用工具";
}

export function interestMatchCount(project: EditorialProject, interests: EditorialTag[]): number {
  return project.editorialTags.filter((tag) => interests.includes(tag)).length;
}

export function personalizedScore(project: EditorialProject, interests: EditorialTag[]): number {
  return interestMatchCount(project, interests) * 100 + project.recommendation * 10 + (project.score?.total ?? 0);
}
