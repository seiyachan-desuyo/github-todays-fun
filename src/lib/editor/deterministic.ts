import type { CandidateProject, EditorialProject, EditorialTag } from "@/lib/types";

const tagRules: Array<[RegExp, EditorialTag]> = [
  [/\b(ai|llm|agent|model|machine learning)\b/i, "AI 工具"],
  [/\b(cli|automation|workflow|productivity|manager)\b/i, "效率"],
  [/\b(design|visual|ui|css|editor)\b/i, "设计"],
  [/\b(data|database|analytics|sql)\b/i, "数据"],
  [/\b(learn|tutorial|course|education)\b/i, "学习"],
  [/\b(developer|api|sdk|framework|library|code)\b/i, "开发工具"],
  [/\b(self-hosted|open.source alternative|privacy)\b/i, "开源替代"],
];

function clip(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function tagsFor(project: CandidateProject): EditorialTag[] {
  const facts = `${project.description ?? ""} ${project.topics.join(" ")}`;
  const tags = tagRules.filter(([pattern]) => pattern.test(facts)).map(([, tag]) => tag);
  return [...new Set(tags)].slice(0, 3).length ? [...new Set(tags)].slice(0, 3) : ["有趣"];
}

export function deterministicEdit(projects: CandidateProject[]): { summary: string; projects: EditorialProject[] } {
  return {
    summary: `本期从 ${projects.length} 个真实 GitHub 候选中按近期增长、更新活跃与跨源信号选出；中文说明由确定性规则生成。`,
    projects: projects.map((project) => {
      const description = project.description ?? "该仓库没有公开 description。";
      const why = project.score?.signals.join("；") ?? "进入 GitHub 官方候选源";
      const recommendation = Math.max(1, Math.min(5, Math.ceil((project.score?.total ?? 0) / 20))) as 1 | 2 | 3 | 4 | 5;
      return {
        ...project,
        plainSummary: clip(`原始说明：${description}`, 80),
        introduction: clip(`GitHub 仓库公开 description：${description}。以下排序只使用可核验的仓库事实与来源信号。`, 260),
        whyToday: clip(`入选信号：${why}。`, 140),
        audience: "希望从真实 GitHub 数据中发现近期项目的读者",
        editorialTags: tagsFor(project),
        recommendation,
      };
    }),
  };
}
