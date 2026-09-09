import { describe, expect, it } from "vitest";
import { buildDailyCard, selectHighlights } from "../lark/daily-card";
import type { DailyEdition, EditorialProject } from "../types";

function project(name: string, recommendation: 1 | 2 | 3 | 4 | 5, score: number, growth: number): EditorialProject {
  return {
    name, githubUrl: `https://github.com/${name}`, canonicalUrl: `https://github.com/${name}`,
    topics: [], sources: ["github-search"], plainSummary: `${name} 摘要`, introduction: "介绍",
    whyToday: `${name} 推荐理由`, audience: "开发者", editorialTags: ["开发工具"], recommendation,
    recentGrowth: growth, score: { snapshotGrowth: 0, trendingGrowth: 0, newProjectVelocity: 0, pushedFreshness: 0, crossSource: 0, total: score, signals: [] },
  };
}

const edition: DailyEdition = {
  date: "2026-09-09", issue: 3, title: "标题", summary: "今日导语", mode: "live",
  publishedAt: "2026-09-09T01:30:00Z", sourceStatus: [],
  projects: [project("a/low", 4, 99, 999), project("b/high", 5, 80, 1), project("c/high", 5, 90, 2)],
};

describe("飞书每日卡片", () => {
  it("优先按推荐等级、评分和增长挑选亮点", () => {
    expect(selectHighlights(edition, 2).map((item) => item.name)).toEqual(["c/high", "b/high"]);
  });

  it("生成 CardKit 2.0 卡片并包含网站入口", () => {
    const card = buildDailyCard(edition, "https://example.com", 2);
    expect(card.schema).toBe("2.0");
    expect(JSON.stringify(card)).toContain("https://example.com");
    expect(JSON.stringify(card)).toContain("c/high");
    expect(JSON.stringify(card)).not.toContain("a/low");
  });

  it("拒绝异常精选数量", () => {
    expect(() => selectHighlights(edition, 0)).toThrow("1 到 10");
  });
});
