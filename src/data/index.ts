import type { DailyEdition } from "@/lib/types";
import latest from "./editions/2026-09-07.json";
import previous from "./editions/2026-09-06.json";

export const editions = [latest, previous] as DailyEdition[];
export const latestEdition = editions[0];

export function getEdition(date: string): DailyEdition | undefined {
  return editions.find((edition) => edition.date === date);
}
