"use client";

import { ArrowUpRight, Bookmark, Star } from "lucide-react";
import type { EditorialProject } from "@/lib/types";

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function ProjectCard({ project, index, saved, onToggleSaved }: {
  project: EditorialProject;
  index: number;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const number = String(index + 1).padStart(2, "0");
  const label = index % 5 === 0 ? "这个真的有用" : index % 5 === 1 ? "编辑推荐" : index % 5 === 2 ? "AI 又进化了" : index % 5 === 3 ? "居然有人做了这个" : "周末可以玩玩";
  const growthLabel = typeof project.recentGrowth === "number"
    ? `+${compactNumber(project.recentGrowth)} ${project.growthSource === "snapshot" ? "较上次快照" : "GitHub Trending"}`
    : "增长待观察";

  return (
    <article className="group flex h-full flex-col border border-ink/15 bg-white/35 p-5 transition hover:-translate-y-0.5 hover:border-ink/55 hover:bg-white/65 sm:p-6">
      <div className="flex items-start justify-between gap-5 border-b border-ink/10 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-serif text-2xl text-ink/30">{number}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{label}</p>
            <p className="mt-1 min-h-8 break-all text-xs font-semibold leading-4 text-ink/45" title={project.name}>{project.name}</p>
          </div>
        </div>
        <button onClick={onToggleSaved} aria-label={saved ? "取消收藏" : "收藏项目"} className={`grid h-8 w-8 shrink-0 place-items-center border transition ${saved ? "border-accent bg-accent text-paper" : "border-ink/15 text-ink/45 hover:border-ink hover:text-ink"}`}>
          <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex-1 py-5">
        <h3 className="font-serif text-xl font-semibold leading-snug tracking-[-0.015em] sm:text-2xl">{project.plainSummary}</h3>
        <p className="mt-3 text-sm leading-6 text-ink/62">{project.introduction}</p>
        <div className="mt-5 border-l-2 border-accent/45 pl-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink/40">为什么值得看</p>
          <p className="text-xs font-medium leading-5 text-ink/75">{project.whyToday}</p>
        </div>
      </div>

      <div className="border-t border-ink/10 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {project.editorialTags.slice(0, 3).map((tag) => <span key={tag} className="border border-ink/12 px-2 py-1 text-[10px] text-ink/55">{tag}</span>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-ink/45">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {project.language && <span>{project.language}</span>}
            {typeof project.stars === "number" && <span>★ {compactNumber(project.stars)}</span>}
            <span>{growthLabel}</span>
            <span className="flex items-center gap-1"><Star size={10} fill="currentColor" /> {project.recommendation}/5</span>
          </div>
          <a href={project.githubUrl} target="_blank" rel="noreferrer" aria-label={`在 GitHub 查看 ${project.name}`} className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:text-accent">GitHub <ArrowUpRight size={12} /></a>
        </div>
      </div>
    </article>
  );
}
