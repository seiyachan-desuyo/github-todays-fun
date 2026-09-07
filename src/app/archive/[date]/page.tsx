import { notFound } from "next/navigation";
import { DailyDiscover } from "@/components/DailyDiscover";
import { editions, getEdition } from "@/data";

export function generateStaticParams() {
  return editions.map(({ date }) => ({ date }));
}

export default async function ArchivePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const edition = getEdition(date);
  if (!edition) notFound();
  return <DailyDiscover edition={edition} editions={editions.map(({ date: itemDate, issue, title }) => ({ date: itemDate, issue, title }))} />;
}
