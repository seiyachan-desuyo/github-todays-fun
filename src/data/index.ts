import type { CandidatePool, CandidateProject, DailyEdition } from "@/lib/types";
import edition0 from "./editions/2026-09-23.json";
import edition1 from "./editions/2026-09-22.json";
import edition2 from "./editions/2026-09-21.json";
import edition3 from "./editions/2026-09-20.json";
import edition4 from "./editions/2026-09-18.json";
import edition5 from "./editions/2026-09-17.json";
import edition6 from "./editions/2026-09-16.json";
import edition7 from "./editions/2026-09-15.json";
import edition8 from "./editions/2026-09-14.json";
import edition9 from "./editions/2026-09-11.json";
import edition10 from "./editions/2026-09-10.json";
import edition11 from "./editions/2026-09-09.json";
import edition12 from "./editions/2026-09-07.json";
import edition13 from "./editions/2026-09-06.json";
import enriched0 from "./enriched-candidates/2026-09-09.json";
import enriched1 from "./enriched-candidates/2026-09-10.json";
import enriched2 from "./enriched-candidates/2026-09-11.json";
import enriched3 from "./enriched-candidates/2026-09-14.json";
import enriched4 from "./enriched-candidates/2026-09-15.json";
import enriched5 from "./enriched-candidates/2026-09-16.json";
import enriched6 from "./enriched-candidates/2026-09-17.json";
import enriched7 from "./enriched-candidates/2026-09-18.json";
import enriched8 from "./enriched-candidates/2026-09-20.json";
import enriched9 from "./enriched-candidates/2026-09-21.json";
import enriched10 from "./enriched-candidates/2026-09-22.json";
import enriched11 from "./enriched-candidates/2026-09-23.json";

export const editions = [edition0, edition1, edition2, edition3, edition4, edition5, edition6, edition7, edition8, edition9, edition10, edition11, edition12, edition13] as DailyEdition[];
export const latestEdition = editions[0];

export const candidatePools: CandidatePool[] = [{ date: "2026-09-09", projects: enriched0.projects as CandidateProject[] }, { date: "2026-09-10", projects: enriched1.projects as CandidateProject[] }, { date: "2026-09-11", projects: enriched2.projects as CandidateProject[] }, { date: "2026-09-14", projects: enriched3.projects as CandidateProject[] }, { date: "2026-09-15", projects: enriched4.projects as CandidateProject[] }, { date: "2026-09-16", projects: enriched5.projects as CandidateProject[] }, { date: "2026-09-17", projects: enriched6.projects as CandidateProject[] }, { date: "2026-09-18", projects: enriched7.projects as CandidateProject[] }, { date: "2026-09-20", projects: enriched8.projects as CandidateProject[] }, { date: "2026-09-21", projects: enriched9.projects as CandidateProject[] }, { date: "2026-09-22", projects: enriched10.projects as CandidateProject[] }, { date: "2026-09-23", projects: enriched11.projects as CandidateProject[] }];

export function getEdition(date: string): DailyEdition | undefined {
  return editions.find((edition) => edition.date === date);
}

export function getEnrichedCandidates(date: string): CandidateProject[] {
  return candidatePools.find((item) => item.date === date)?.projects ?? [];
}
