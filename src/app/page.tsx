import { latestEdition, editions, getEnrichedCandidates } from "@/data";
import { DailyDiscover } from "@/components/DailyDiscover";

export default function Home() {
  return <DailyDiscover edition={latestEdition} editions={editions} candidates={getEnrichedCandidates(latestEdition.date)} />;
}
