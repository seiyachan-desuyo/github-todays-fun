import { candidatePools, latestEdition, editions } from "@/data";
import { DailyDiscover } from "@/components/DailyDiscover";

export default function Home() {
  return <DailyDiscover edition={latestEdition} editions={editions} candidatePools={candidatePools} />;
}
