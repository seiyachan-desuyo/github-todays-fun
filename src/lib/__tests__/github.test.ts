import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTrendingHtml } from "@/lib/sources/github";

describe("GitHub Trending parser", () => {
  it("parses repository facts and explicit growth from a structural fixture", async () => {
    const html = await readFile(path.join(process.cwd(), "src/lib/__tests__/fixtures/github-trending.html"), "utf8");
    const rows = parseTrendingHtml(html);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "Acme/FastRepo",
      githubUrl: "https://github.com/Acme/FastRepo",
      description: "A fast & useful tool.",
      language: "TypeScript",
      stars: 1234,
      forks: 56,
      starsToday: 321,
    });
  });

  it("fails closed when GitHub removes the repository card structure", () => {
    expect(parseTrendingHtml("<main><a href='/owner/repo'>repo</a></main>")).toEqual([]);
  });
});
