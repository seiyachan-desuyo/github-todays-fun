import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { excludePublishedProjects, loadPublishedRepoUrls } from "@/lib/pipeline/history";

const temporaryDirectories: string[] = [];

async function temporaryEditionsRoot(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "github-today-fun-history-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("published project history", () => {
  it("loads canonical repository URLs across editions and excludes the current date", async () => {
    const directory = await temporaryEditionsRoot();
    await writeFile(path.join(directory, "2026-09-08.json"), JSON.stringify({ projects: [
      { githubUrl: "https://github.com/Owner/Repo.git" },
      { canonicalUrl: "https://github.com/another/project/" },
    ] }));
    await writeFile(path.join(directory, "2026-09-09.json"), JSON.stringify({ projects: [
      { githubUrl: "https://github.com/current/edition" },
    ] }));
    await writeFile(path.join(directory, "notes.json"), "{}");

    const published = await loadPublishedRepoUrls(directory, "2026-09-09");

    expect([...published].sort()).toEqual([
      "https://github.com/another/project",
      "https://github.com/owner/repo",
    ]);
  });

  it("filters projects already published in an earlier edition", () => {
    const projects = [
      { canonicalUrl: "https://github.com/owner/old" },
      { canonicalUrl: "https://github.com/owner/new" },
    ];

    expect(excludePublishedProjects(projects, new Set(["https://github.com/owner/old"]))).toEqual([
      { canonicalUrl: "https://github.com/owner/new" },
    ]);
  });
});
