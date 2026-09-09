import type { DailyEdition, EditorialProject } from "@/lib/types";
import edition0 from "./editions/2026-09-09.json";
import edition1 from "./editions/2026-09-07.json";
import edition2 from "./editions/2026-09-06.json";
import enriched0 from "./enriched-candidates/2026-09-09.json";

export const editions = [edition0, edition1, edition2] as DailyEdition[];
export const latestEdition = editions[0];

const enrichedCandidates = [{ date: "2026-09-09", projects: enriched0.projects as EditorialProject[] }];

export function getEdition(date: string): DailyEdition | undefined {
  return editions.find((edition) => edition.date === date);
}

export function getEnrichedCandidates(date: string): EditorialProject[] {
  return enrichedCandidates.find((item) => item.date === date)?.projects ?? [];
}
