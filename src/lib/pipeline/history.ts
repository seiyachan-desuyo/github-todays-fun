import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { canonicalizeRepoUrl } from "./normalize";

const EDITION_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.json$/;

export async function loadPublishedRepoUrls(
  editionsRoot = path.resolve(process.cwd(), "src/data/editions"),
  excludeDate?: string,
): Promise<Set<string>> {
  const files = await readdir(editionsRoot).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const published = new Set<string>();

  for (const file of files) {
    const match = EDITION_FILE_PATTERN.exec(file);
    if (!match || match[1] === excludeDate) continue;
    const edition = JSON.parse(await readFile(path.join(editionsRoot, file), "utf8")) as {
      projects?: Array<{ canonicalUrl?: unknown; githubUrl?: unknown }>;
    };
    for (const project of edition.projects ?? []) {
      const rawUrl = typeof project.canonicalUrl === "string"
        ? project.canonicalUrl
        : typeof project.githubUrl === "string"
          ? project.githubUrl
          : "";
      const canonicalUrl = canonicalizeRepoUrl(rawUrl);
      if (canonicalUrl) published.add(canonicalUrl);
    }
  }

  return published;
}

export function excludePublishedProjects<T extends { canonicalUrl: string }>(
  projects: T[],
  published: ReadonlySet<string>,
): T[] {
  return projects.filter((project) => !published.has(project.canonicalUrl));
}
