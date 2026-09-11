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
});
