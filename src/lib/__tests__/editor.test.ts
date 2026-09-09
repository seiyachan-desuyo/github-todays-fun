import { describe, expect, it } from "vitest";
import { aiEditionSchema, editorTaskSchema, editorialItemSchema } from "@/lib/editor/schema";

const validEditorialFields = {
  githubUrl: "https://github.com/owner/repo",
  plainSummary: "这是一个普通人也能看懂的项目介绍",
  introduction: "它基于真实的项目说明，解释可以解决的问题以及具体怎么玩。",
  whyToday: "它代表了一个正在发生的新趋势。",
  audience: "想提高效率的普通用户",
  editorialTags: ["效率"],
  recommendation: 4,
};

const score = { snapshotGrowth: 0, trendingGrowth: 12, newProjectVelocity: 3, pushedFreshness: 8, crossSource: 0, total: 23, signals: ["Trending 披露 +10"] };

describe("Aime editor schemas", () => {
  it("keeps the compatibility editorial output strict", () => expect(aiEditionSchema.parse({ summary: "今天关注真正能派上用场的新工具。", projects: [validEditorialFields] }).projects).toHaveLength(1));
  it("rejects unknown tags", () => expect(() => editorialItemSchema.parse({ ...validEditorialFields, editorialTags: ["区块链"] })).toThrow());
  it("rejects non-GitHub URLs and scores outside 1-5", () => {
    expect(() => aiEditionSchema.parse({ summary: "今天关注真正能派上用场的新工具。", projects: [{ ...validEditorialFields, githubUrl: "https://example.com/a/b", recommendation: 6 }] })).toThrow();
  });
  it("accepts a fact-only editor task without editorial copy", () => {
    const task = editorTaskSchema.parse({
      date: "2026-09-07",
      generatedAt: "2026-09-07T10:00:00.000Z",
      editorMode: "aime",
      targetCount: 30,
      snapshotPath: "src/data/snapshots/2026-09-07.json",
      sourceStatus: [{ source: "github-search", status: "ok", fetchedAt: "2026-09-07T10:00:00.000Z", message: "ok" }],
      pipelineStats: { rawCandidateCount: 1, normalizedCandidateCount: 1, dedupedCandidateCount: 1, eligibleCandidateCount: 1, selectedCount: 0 },
      candidates: [{ repoName: "owner/repo", url: "https://github.com/owner/repo", description: "A factual description", topics: [], sources: ["github-search"], score }],
    });
    expect(task.candidates[0]).not.toHaveProperty("plainSummary");
  });
});
