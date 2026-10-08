import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { enrichedCandidatesSchema } from "../src/lib/editor/schema";
import type { CandidatePool, DailyEdition } from "../src/lib/types";

const ROOT = process.cwd();
const EDITIONS_ROOT = path.join(ROOT, "src/data/editions");
const ENRICHED_ROOT = path.join(ROOT, "src/data/enriched-candidates");
const FEED_ROOT = path.join(ROOT, "public/data");
const DATE_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;

export interface EditionFeed {
  schemaVersion: 2;
  generatedAt: string;
  latest: string;
  editions: DailyEdition[];
  candidatePools: CandidatePool[];
}

export async function generateFeed(): Promise<EditionFeed> {
  const files = (await readdir(EDITIONS_ROOT)).filter((file) => DATE_FILE.test(file)).sort().reverse();
  if (!files.length) throw new Error("没有可发布的 edition，无法生成 feed");
  const editions = await Promise.all(files.map(async (file) => {
    const value: unknown = JSON.parse(await readFile(path.join(EDITIONS_ROOT, file), "utf8"));
    const edition = value as Partial<DailyEdition>;
    if (!edition || typeof edition.date !== "string" || typeof edition.issue !== "number" || !Array.isArray(edition.projects)) {
      throw new Error(`${file} 不是有效的 edition`);
    }
    return edition as DailyEdition;
  }));
  const enrichedFiles = (await readdir(ENRICHED_ROOT).catch(() => []))
    .filter((file) => DATE_FILE.test(file))
    .sort()
    .reverse();
  const candidatePools = await Promise.all(enrichedFiles.map(async (file) => {
    const value: unknown = JSON.parse(await readFile(path.join(ENRICHED_ROOT, file), "utf8"));
    return enrichedCandidatesSchema.parse(value) as CandidatePool;
  }));
  const feed: EditionFeed = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    latest: editions[0].date,
    editions,
    candidatePools,
  };
  await mkdir(FEED_ROOT, { recursive: true });
  const target = path.join(FEED_ROOT, "feed.json");
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return feed;
}

if (process.argv[1]?.endsWith("generate-feed.ts")) {
  generateFeed()
    .then((feed) => console.log(JSON.stringify({ ok: true, latest: feed.latest, editionCount: feed.editions.length, candidatePoolCount: feed.candidatePools.length, output: "public/data/feed.json" }, null, 2)))
    .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
