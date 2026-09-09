"use client";

import { useState } from "react";
import { ArrowUpRight, Bookmark, Check, Flame, MessageCircle, Sparkles, Star } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/discovery";
import type { EditorialProject } from "@/lib/types";

const PUBLIC_AI_CHAT_URL = "https://chat.deepseek.com/";

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function ProjectCard({ project, index, saved, onToggleSaved, category, matchedInterest }: {
  project: EditorialProject;
  index: number;
  saved: boolean;
  onToggleSaved: () => void;
  category: string;
  matchedInterest: boolean;
}) {
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const number = String(index + 1).padStart(2, "0");
  const owner = project.name.split("/")[0] ?? project.name;
  const growthLabel = typeof project.recentGrowth === "number"
    ? `+${compactNumber(project.recentGrowth)} ${project.growthSource === "snapshot" ? "较上次收录" : "今日"}`
    : "增长待观察";

  const askAI = async () => {
    const prompt = `请帮我详细了解这个 GitHub 项目：${project.githubUrl}\n\n请重点介绍它解决什么问题、核心功能、适合谁使用、如何快速开始，以及使用时需要注意什么。`;
    window.open(PUBLIC_AI_CHAT_URL, "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard.writeText(prompt);
      setAiPromptCopied(true);
      window.setTimeout(() => setAiPromptCopied(false), 2500);
    } catch {
      // 剪贴板权限不可用时仍然打开公开 AI，用户可以手动粘贴项目链接。
    }
  };

  return (
    <article className="project-card glass-card group relative flex h-full flex-col overflow-hidden rounded-4xl border border-white/80 bg-white/70 p-5 transition duration-300 hover:-translate-y-2 sm:p-6">
      <div className="absolute right-5 top-5 font-serif text-5xl font-black leading-none text-violet-100/80 transition group-hover:text-violet-200/80" aria-hidden="true">{number}</div>

      <div className="relative flex items-start justify-between gap-4 pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-sm font-black text-orange-700 ring-1 ring-orange-200">
            <span>{owner.slice(0, 1).toUpperCase()}</span>
            {/* GitHub owner avatar；加载失败时保留底下的首字母。 */}
            <img
              src={`https://github.com/${encodeURIComponent(owner)}.png?size=88`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          </div>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{category}</span>
            <p className="mt-1.5 truncate text-xs font-semibold text-stone-500" title={project.name}>{project.name}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onToggleSaved}
        aria-label={saved ? `将 ${project.name} 移出稍后看` : `将 ${project.name} 加入稍后看`}
        aria-pressed={saved}
        className={`absolute right-5 top-16 z-10 grid h-9 w-9 place-items-center rounded-full border transition ${saved ? "border-orange-500 bg-orange-500 text-white shadow-md" : "border-stone-200 bg-white text-stone-400 hover:border-orange-300 hover:text-orange-600"}`}
      >
        <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
      </button>

      <div className="relative flex-1 pb-5 pt-6">
        {matchedInterest && (
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-violet-600"><Sparkles size={13} /> 正合你的兴趣</p>
        )}
        <h3 className="max-w-sm font-serif text-xl font-bold leading-snug tracking-tight text-stone-900 sm:text-2xl">{project.plainSummary}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-600">{project.introduction}</p>
        <div className="mt-5 rounded-3xl border border-white/80 bg-gradient-to-br from-violet-50/90 to-white/70 p-4 shadow-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-violet-700"><Flame size={13} /> 为什么今天值得看</p>
          <p className="text-xs font-medium leading-5 text-stone-700">{project.whyToday}</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-stone-500"><span className="font-bold text-stone-700">适合：</span>{project.audience}</p>
      </div>

      <div className="relative border-t border-stone-100 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {project.editorialTags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600">{tag}</span>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-stone-500 sm:grid-cols-3">
          <span title="Star 总数">★ {typeof project.stars === "number" ? compactNumber(project.stars) : "待补充"}</span>
          <span className={typeof project.recentGrowth === "number" ? "font-bold text-rose-600" : ""}>{growthLabel}</span>
          <span>{project.language ?? "其他"}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-stone-200 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
            {project.sources.map((source) => <span key={source}>{SOURCE_LABELS[source]}</span>)}
            <span className="flex items-center gap-1 text-amber-600"><Star size={11} fill="currentColor" /> 编辑推荐 {project.recommendation}/5</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={askAI}
              aria-label={`复制 ${project.name} 的提问内容并打开 DeepSeek`}
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
            >
              {aiPromptCopied ? <Check size={13} /> : <MessageCircle size={13} />}
              {aiPromptCopied ? "已复制，去问 AI" : "问问 AI"}
            </button>
            <a href={project.githubUrl} target="_blank" rel="noreferrer" aria-label={`在 GitHub 查看 ${project.name}`} className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-orange-600">去 GitHub 看看 <ArrowUpRight size={13} /></a>
          </div>
        </div>
      </div>
    </article>
  );
}
