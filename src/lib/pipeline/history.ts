import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export function canonicalGitHubUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export async function loadPublishedCanonicalUrls(editionsRoot: string, beforeDate: string): Promise<Set<string>> {
  const files = await readdir(editionsRoot).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const historicalFiles = files.filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) < beforeDate);
  const published = new Set<string>();
  for (const file of historicalFiles) {
    const edition = JSON.parse(await readFile(path.join(editionsRoot, file), "utf8")) as {
      projects?: Array<{ canonicalUrl?: string; githubUrl?: string }>;
    };
    for (const project of edition.projects ?? []) {
      const url = project.canonicalUrl ?? project.githubUrl;
      if (url) published.add(canonicalGitHubUrl(url));
    }
  }
  return published;
}
