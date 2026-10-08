import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalGitHubUrl, loadPublishedCanonicalUrls } from "@/lib/pipeline/history";

const fixtureRoot = path.join(process.cwd(), ".daily-pipeline", "test-history");

afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

describe("published edition history", () => {
  it("normalizes canonical URLs", () => {
    expect(canonicalGitHubUrl(" HTTPS://GitHub.com/Owner/Repo/// ")).toBe("https://github.com/owner/repo");
  });

  it("loads only projects published before the target date", async () => {
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(path.join(fixtureRoot, "2026-09-09.json"), JSON.stringify({ projects: [{ canonicalUrl: "https://github.com/Owner/Old/" }] }));
    await writeFile(path.join(fixtureRoot, "2026-09-10.json"), JSON.stringify({ projects: [{ githubUrl: "https://github.com/owner/current" }] }));
    await writeFile(path.join(fixtureRoot, "notes.json"), "{}");

    const published = await loadPublishedCanonicalUrls(fixtureRoot, "2026-09-10");
    expect([...published]).toEqual(["https://github.com/owner/old"]);
  });

  it("只排除历史最终 30 精选；candidatePool（enriched-candidates）中未被精选的项目不排除", async () => {
    const editionsRoot = path.join(fixtureRoot, "editions");
    const enrichedRoot = path.join(fixtureRoot, "enriched-candidates");
    await mkdir(editionsRoot, { recursive: true });
    await mkdir(enrichedRoot, { recursive: true });
    await writeFile(
      path.join(editionsRoot, "2026-09-20.json"),
      JSON.stringify({ projects: [{ canonicalUrl: "https://github.com/owner/final-selected" }] }),
    );
    await writeFile(
      path.join(enrichedRoot, "2026-09-20.json"),
      JSON.stringify({ projects: [{ canonicalUrl: "https://github.com/owner/pool-only" }] }),
    );

    const published = await loadPublishedCanonicalUrls(editionsRoot, "2026-09-24");
    expect(published.has("https://github.com/owner/final-selected")).toBe(true);
    // 关键断言：仅在 candidatePool 出现、未进入最终 30 的项目不会被排除。
    expect(published.has("https://github.com/owner/pool-only")).toBe(false);
  });
});
