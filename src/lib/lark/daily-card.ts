import type { DailyEdition, EditorialProject } from "../types";

export const DEFAULT_HIGHLIGHT_COUNT = 5;

function projectScore(project: EditorialProject): number {
  return project.recommendation * 1_000_000 + (project.score?.total ?? 0) * 1_000 + (project.recentGrowth ?? 0);
}

export function selectHighlights(edition: DailyEdition, count = DEFAULT_HIGHLIGHT_COUNT): EditorialProject[] {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error("LARK_HIGHLIGHT_COUNT 必须是 1 到 10 的整数");
  }
  return [...edition.projects].sort((a, b) => projectScore(b) - projectScore(a)).slice(0, count);
}

function text(value: string) {
  return { tag: "plain_text", content: value };
}

function consumerSummary(summary: string): string {
  const cleaned = summary
    .replace(/今天从\s*\d+\s*个可核验候选中选出\s*(\d+)\s*项/, "今天精选了 $1 个值得一看的开源项目")
    .replace(/[；;]\s*GitHub Search[^。]*。?$/i, "。")
    .replace(/[；;]\s*仓库详情探针[^。]*。?$/i, "。")
    .trim();
  return cleaned.endsWith("。") ? cleaned : `${cleaned}。`;
}

export function buildDailyCard(edition: DailyEdition, websiteUrl: string, count = DEFAULT_HIGHLIGHT_COUNT) {
  const highlights = selectHighlights(edition, count);
  const elements: Array<Record<string, unknown>> = [
    { tag: "markdown", content: `**${consumerSummary(edition.summary)}**` },
    { tag: "hr" },
  ];

  highlights.forEach((project, index) => {
    const stats = [
      project.language,
      project.stars === undefined ? undefined : `⭐ ${project.stars.toLocaleString("en-US")}`,
      project.recentGrowth === undefined ? undefined : `近期 +${project.recentGrowth}`,
    ].filter(Boolean).join(" · ");
    elements.push({
      tag: "markdown",
      content: `**${index + 1}. [${project.name}](${project.githubUrl})**\n${project.plainSummary}\n${project.whyToday}${stats ? `\n${stats}` : ""}`,
    });
  });

  elements.push({
    tag: "button",
    text: text("查看今日完整榜单"),
    type: "primary",
    url: websiteUrl,
  });

  return {
    schema: "2.0",
    config: { wide_screen_mode: true },
    header: {
      title: text(`GitHub 今日好玩 · ${edition.date}`),
      subtitle: text(`第 ${edition.issue} 期 · 精选 ${highlights.length} 个`),
      template: "blue",
    },
    body: { elements },
  };
}
