import type { CandidatePool, CandidateProject, DailyEdition } from "@/lib/types";
import edition0 from "./editions/2026-09-11.json";
import edition1 from "./editions/2026-09-10.json";
import edition2 from "./editions/2026-09-09.json";
import edition3 from "./editions/2026-09-07.json";
import edition4 from "./editions/2026-09-06.json";
import enriched0 from "./enriched-candidates/2026-09-09.json";
import enriched1 from "./enriched-candidates/2026-09-10.json";
import enriched2 from "./enriched-candidates/2026-09-11.json";

export const editions = [edition0, edition1, edition2, edition3, edition4] as DailyEdition[];
export const latestEdition = editions[0];

export const candidatePools: CandidatePool[] = [{ date: "2026-09-09", projects: enriched0.projects as CandidateProject[] }, { date: "2026-09-10", projects: enriched1.projects as CandidateProject[] }, { date: "2026-09-11", projects: enriched2.projects as CandidateProject[] }];

export function getEdition(date: string): DailyEdition | undefined {
  return editions.find((edition) => edition.date === date);
}

export function getEnrichedCandidates(date: string): CandidateProject[] {
  return candidatePools.find((item) => item.date === date)?.projects ?? [];
}
