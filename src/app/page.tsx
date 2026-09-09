import { latestEdition, editions, getCandidates } from "@/data";
import { DailyDiscover } from "@/components/DailyDiscover";

export default function Home() {
  return <DailyDiscover edition={latestEdition} editions={editions} candidates={getCandidates(latestEdition.date)} />;
}
