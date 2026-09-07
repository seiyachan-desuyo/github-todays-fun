"use client";

import { ArrowUpRight, Bookmark, ExternalLink } from "lucide-react";
import type { EditorialProject } from "@/lib/types";

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function Doodle({ index }: { index: number }) {
  if (index % 3 === 0) return <svg aria-hidden="true" viewBox="0 0 90 62" className="h-14 w-20"><path d="M13 42c14-5 25-16 33-32 4 12 12 22 28 29M61 31l14 8-13 8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>;
  if (index % 3 === 1) return <svg aria-hidden="true" viewBox="0 0 70 60" className="h-14 w-16"><path d="M18 17h34v28H18zM25 51h20M28 24c4 3 10 3 14 0M26 36h18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 70 60" className="h-14 w-16"><path d="M24 41c-7-13-3-27 11-31 14 4 18 18 11 31M29 41h12M31 47h8M35 10v-6M18 17l-5-4M52 17l5-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>;
}

export function ProjectCard({ project, index, variant, saved, onToggleSaved, className = "" }: {
  project: EditorialProject;
  index: number;
  variant: "lead" | "story" | "quote";
  saved: boolean;
  onToggleSaved: () => void;
  className?: string;
}) {
  const number = String(index + 1).padStart(2, "0");
  const eyebrow = index === 0 ? "本日封面" : index % 4 === 1 ? "这个真的有用" : index % 4 === 2 ? "AI 又进化了" : index % 4 === 3 ? "居然有人做了这个" : "周末可以玩玩";
  const growthLabel = typeof project.recentGrowth === "number"
    ? `+${compactNumber(project.recentGrowth)} ${project.growthSource === "snapshot" ? "vs snapshot" : "GitHub Trending"}`
    : "增长：等待快照基线";
  const metadata = [project.language, typeof project.stars === "number" ? `★ ${compactNumber(project.stars)}` : null, growthLabel].filter(Boolean);

  if (variant === "lead") {
    return (
      <article className="group grid gap-8 border-b border-ink/80 pb-14 lg:grid-cols-[7rem_1.45fr_.55fr] lg:gap-10">
        <div className="font-serif text-6xl font-light text-ink/25 sm:text-7xl">{number}</div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
          <h3 className="max-w-4xl font-serif text-[clamp(2.5rem,6vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.045em]">{project.plainSummary}</h3>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">{project.introduction}</p>
          <a href={project.githubUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 border-b border-ink pb-1 text-sm font-semibold transition hover:translate-x-1 hover:border-accent hover:text-accent">打开项目 <ExternalLink size={14} /></a>
        </div>
        <aside className="flex flex-col justify-between border-l border-ink/15 pl-6">
          <div className="self-end opacity-80"><Doodle index={index} /></div>
          <div>
            <p className="font-serif text-2xl leading-snug">“{project.whyToday}”</p>
            <p className="mt-4 text-xs leading-5 text-ink/45">综合推荐 · {project.recommendation}/5 · 数据得分 {project.score?.total ?? "—"}</p>
            <p className="mt-8 break-all text-xs font-semibold">{project.name}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-ink/40">{metadata.join(" · ") || "GitHub repository"}</p>
          </div>
        </aside>
      </article>
    );
  }

  return (
    <article className={`editorial-story group relative border-b border-ink/80 py-10 md:px-7 lg:min-h-[34rem] ${className}`}>
      <div className="flex items-start justify-between">
        <span className="font-serif text-4xl font-light text-ink/25">{number}</span>
        <button onClick={onToggleSaved} aria-label={saved ? "取消收藏" : "收藏项目"} className={`grid h-8 w-8 place-items-center border transition ${saved ? "border-accent bg-accent text-paper" : "border-ink/20 opacity-0 group-hover:opacity-100 hover:border-ink"}`}>
          <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-9">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h3 className={`${variant === "quote" ? "font-serif text-4xl italic leading-tight" : "font-serif text-3xl leading-tight"}`}>{project.plainSummary}</h3>
        <p className="mt-4 break-all text-xs font-semibold text-ink/45">{project.name}</p>
        <p className="mt-6 line-clamp-3 text-sm leading-7 text-ink/62">{project.introduction}</p>
      </div>
      <div className="mt-8 border-l border-accent/60 pl-4">
        <p className="text-xs font-semibold leading-5">{project.whyToday}</p>
      </div>
      <div className="mt-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-ink/40"><span>{metadata.join(" · ") || "GitHub"}</span></div>
          <div className="mt-2 flex flex-wrap gap-2">{project.editorialTags.slice(0, 3).map((tag) => <span key={tag} className="border-b border-ink/25 pb-0.5 text-[10px] text-ink/55">{tag}</span>)}</div>
        </div>
        <a href={project.githubUrl} target="_blank" rel="noreferrer" aria-label={`在 GitHub 查看 ${project.name}`} className="inline-flex items-center gap-1 text-xs font-semibold underline decoration-ink/30 underline-offset-4 hover:text-accent">GitHub <ArrowUpRight size={12} /></a>
      </div>
    </article>
  );
}
