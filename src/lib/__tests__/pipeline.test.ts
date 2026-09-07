import { describe, expect, it } from "vitest";
import { rankProjects, scoreProject } from "@/lib/pipeline/rank";
import { applySnapshotGrowth } from "@/lib/pipeline/snapshot";
import type { CandidateProject, DailySnapshot } from "@/lib/types";

const project: CandidateProject = {
  name: "owner/repo",
  githubUrl: "https://github.com/owner/repo",
  canonicalUrl: "https://github.com/owner/repo",
  description: "A real developer tool",
  stars: 120,
  createdAt: "2026-09-05T00:00:00Z",
  pushedAt: "2026-09-07T00:00:00Z",
  topics: [],
  sources: ["github-search"],
  raw: [],
};

describe("snapshot growth and ranking", () => {
  it("does not invent growth without a previous snapshot", () => {
    expect(applySnapshotGrowth([project])[0].recentGrowth).toBeUndefined();
  });

  it("computes a real non-negative delta from the previous observation", () => {
    const previous: DailySnapshot = { date: "2026-09-06", observedAt: "2026-09-06T10:00:00Z", projects: [{ canonicalUrl: project.canonicalUrl, name: project.name, stars: 100, observedAt: "2026-09-06T10:00:00Z", sources: ["github-search"] }] };
    expect(applySnapshotGrowth([project], previous)[0]).toMatchObject({ recentGrowth: 20, growthSource: "snapshot" });
  });

  it("scores multiple explainable signals and filters ungrounded candidates", () => {
    const score = scoreProject(project, new Date("2026-09-07T10:00:00Z"));
    expect(score.newProjectVelocity).toBeGreaterThan(0);
    expect(score.pushedFreshness).toBeGreaterThan(0);
    expect(rankProjects([project, { ...project, canonicalUrl: "https://github.com/no/description", description: undefined }], new Date("2026-09-07T10:00:00Z"))).toHaveLength(1);
  });
});
