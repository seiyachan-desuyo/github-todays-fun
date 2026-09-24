import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export function canonicalGitHubUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * 采集候选去重规则（长期约定，请勿放宽）：
 * - 只排除**已进入历史最终 30 精选**（`src/data/editions/*.json` 的 `projects`）的项目。
 * - 历史 candidatePool（`src/data/enriched-candidates/*.json`）中出现过、但从未被选入最终 30 精选的项目，
 *   允许被再次采集为新候选，避免候选池被过度收敛导致后续期次候选不足。
 * - 因此本函数只读 `editionsRoot`（= `src/data/editions`），绝不读取 `enriched-candidates/`
 *   或其他 candidatePool 快照来源。
 */
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
