import { describe, expect, it } from "vitest";
import { canonicalizeRepoUrl, dedupeProjects, makeCandidate } from "@/lib/pipeline/normalize";

const fetchedAt = "2026-09-07T00:00:00.000Z";

describe("canonicalizeRepoUrl", () => {
  it.each([
    ["https://github.com/Owner/Repo/", "https://github.com/owner/repo"],
    ["git" + "@github.com:Owner/Repo.git", "https://github.com/owner/repo"],
    ["github.com/owner/repo?tab=readme", "https://github.com/owner/repo"],
  ])("canonicalizes %s", (input, expected) => expect(canonicalizeRepoUrl(input)).toBe(expected));
  it("rejects non-GitHub URLs", () => expect(canonicalizeRepoUrl("https://example.com/a/b")).toBeNull());
});

describe("normalization and dedupe", () => {
  it("only maps confirmed fields and merges sources", () => {
    const first = makeCandidate({ source: "gitdiscover", fetchedAt, raw: { any: true }, name: "Owner/Repo", githubUrl: "https://github.com/Owner/Repo", stars: 12 });
    const second = makeCandidate({ source: "ossinsight", fetchedAt, raw: { other: true }, githubUrl: "https://github.com/owner/repo.git", description: "Real description", topics: ["ai"] });
    const result = dedupeProjects([first!, second!]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ canonicalUrl: "https://github.com/owner/repo", stars: 12, description: "Real description", sources: ["gitdiscover", "ossinsight"], topics: ["ai"] });
    expect(result[0].raw).toHaveLength(2);
  });
});
