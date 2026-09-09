import type { DailyEdition } from "@/lib/types";
import edition0 from "./editions/2026-09-09.json";
import edition1 from "./editions/2026-09-07.json";
import edition2 from "./editions/2026-09-06.json";
import task0 from "./editor-tasks/2026-09-09.json";
import task1 from "./editor-tasks/2026-09-07.json";

export interface CandidateProject {
  repoName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  growth?: { source: string; value: number };
  score?: { total: number };
}

export const editions = [edition0, edition1, edition2] as DailyEdition[];
export const latestEdition = editions[0];

const candidateTasks = [task0, task1] as Array<{ date: string; candidates: CandidateProject[] }>;

export function getEdition(date: string): DailyEdition | undefined {
  return editions.find((edition) => edition.date === date);
}

export function getCandidates(date: string): CandidateProject[] {
  return candidateTasks.find((task) => task.date === date)?.candidates ?? [];
}
