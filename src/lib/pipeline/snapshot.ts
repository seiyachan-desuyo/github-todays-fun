import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CandidateProject, DailySnapshot } from "@/lib/types";

const SNAPSHOT_DIR = path.resolve(process.cwd(), "src/data/snapshots");

export async function loadPreviousSnapshot(date: string): Promise<DailySnapshot | undefined> {
  try {
    const files = (await readdir(SNAPSHOT_DIR))
      .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) < date)
      .sort()
      .reverse();
    if (!files[0]) return undefined;
    return JSON.parse(await readFile(path.join(SNAPSHOT_DIR, files[0]), "utf8")) as DailySnapshot;
  } catch {
    return undefined;
  }
}

export function applySnapshotGrowth(projects: CandidateProject[], previous?: DailySnapshot): CandidateProject[] {
  if (!previous) return projects;
  const baseline = new Map(previous.projects.map((project) => [project.canonicalUrl, project]));
  return projects.map((project) => {
    const old = baseline.get(project.canonicalUrl);
    if (typeof project.stars !== "number" || typeof old?.stars !== "number") return project;
    const delta = Math.max(0, project.stars - old.stars);
    return { ...project, recentGrowth: delta, growthSource: "snapshot" as const };
  });
}

export async function saveSnapshot(date: string, projects: CandidateProject[], observedAt = new Date().toISOString()): Promise<DailySnapshot> {
  const snapshot: DailySnapshot = {
    date,
    observedAt,
    projects: projects.map(({ canonicalUrl, name, stars, forks, openIssues, pushedAt, sources }) => ({
      canonicalUrl, name, stars, forks, openIssues, pushedAt, observedAt, sources,
    })),
  };
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  await writeFile(path.join(SNAPSHOT_DIR, `${date}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}
