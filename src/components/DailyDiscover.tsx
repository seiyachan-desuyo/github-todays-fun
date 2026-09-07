"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import type { DailyEdition, EditorialTag } from "@/lib/types";

const filters: Array<{ label: string; tag?: EditorialTag }> = [
  { label: "Today" },
  { label: "AI", tag: "AI 工具" },
  { label: "效率", tag: "效率" },
  { label: "有趣", tag: "有趣" },
  { label: "设计", tag: "设计" },
];

function MastheadMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 56 56" className="h-11 w-11 text-ink sm:h-12 sm:w-12">
      <path d="M13 39c6-7 10-15 13-25M17 29c8 0 16 3 24 10M32 12l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="M11 45c10-3 22-3 34 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

export function DailyDiscover({ edition, editions }: {
  edition: DailyEdition;
  editions: Array<{ date: string; issue: number; title: string }>;
}) {
  const [active, setActive] = useState("Today");
  const [saved, setSaved] = useState<string[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("github-today-saved") ?? "[]")); } catch { setSaved([]); }
  }, []);

  const projects = useMemo(() => {
    const tag = filters.find((filter) => filter.label === active)?.tag;
    return tag ? edition.projects.filter((project) => project.editorialTags.includes(tag)) : edition.projects;
  }, [active, edition.projects]);

  function toggleSaved(url: string) {
    setSaved((current) => {
      const next = current.includes(url) ? current.filter((item) => item !== url) : [...current, url];
      localStorage.setItem("github-today-saved", JSON.stringify(next));
      return next;
    });
  }

  const formattedDate = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date(`${edition.date}T12:00:00+08:00`));

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="border-b border-ink/80">
          <div className="grid items-end gap-8 py-7 sm:py-9 lg:grid-cols-[1fr_auto]">
            <Link href="/" className="group flex items-center gap-4 sm:gap-5" aria-label="GitHub 今日好玩首页">
              <MastheadMark />
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-accent">GitHub Daily Review</p>
                <h1 className="font-serif text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-none tracking-[-0.04em]">GitHub 今日好玩</h1>
              </div>
            </Link>
            <div className="flex items-end justify-between gap-8 border-t border-ink/15 pt-4 text-xs lg:border-0 lg:pt-0">
              <div><p className="mb-1 text-ink/45">出版日期</p><p className="font-semibold">{formattedDate}</p></div>
              <div><p className="mb-1 text-ink/45">刊号</p><p className="font-semibold">NO. {String(edition.issue).padStart(3, "0")}</p></div>
            </div>
          </div>

          <nav className="relative flex min-h-12 items-center justify-between border-t border-ink/80" aria-label="栏目导航">
            <button className="flex items-center gap-2 py-3 text-xs font-semibold md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}>
              {menuOpen ? <X size={16} /> : <Menu size={16} />} 栏目
            </button>
            <div className={`${menuOpen ? "flex" : "hidden"} absolute left-0 top-12 z-30 w-full flex-col border-b border-ink bg-paper py-2 md:static md:flex md:w-auto md:flex-row md:items-center md:border-0 md:py-0`}>
              {filters.map((filter) => (
                <button key={filter.label} onClick={() => { setActive(filter.label); setMenuOpen(false); }} className={`border-b border-ink/10 px-0 py-3 text-left text-sm transition md:border-0 md:px-5 md:py-4 md:first:pl-0 ${active === filter.label ? "font-bold text-ink underline decoration-accent decoration-2 underline-offset-8" : "text-ink/55 hover:text-ink"}`}>
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setArchiveOpen((value) => !value)} className="flex items-center gap-1.5 py-4 text-sm text-ink/60 hover:text-ink">Archive <ChevronDown size={14} className={archiveOpen ? "rotate-180" : ""} /></button>
              {archiveOpen && (
                <div className="absolute right-0 top-12 z-40 w-80 border border-ink bg-paper p-1">
                  {editions.map((item) => <Link key={item.date} href={item.date === editions[0].date ? "/" : `/archive/${item.date}`} className="grid grid-cols-[5rem_1fr] gap-3 border-b border-ink/10 px-3 py-3 text-xs last:border-0 hover:bg-accent-soft">
                    <span className="font-semibold">NO. {String(item.issue).padStart(3, "0")}</span><span className="text-ink/65">{item.title}</span>
                  </Link>)}
                </div>
              )}
            </div>
          </nav>
        </header>

        <section id="today-picks" className="py-10 sm:py-12">
          <div className="mb-7 flex items-end justify-between border-b border-ink/80 pb-4">
            <div className="flex items-baseline gap-4"><span className="text-xs font-bold text-accent">SECTION 01</span><h2 className="font-serif text-2xl sm:text-3xl">今日精选</h2></div>
            <span className="text-xs text-ink/45">{String(projects.length).padStart(2, "0")} PROJECTS</span>
          </div>

          {projects.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectCard key={project.canonicalUrl} project={project} index={index} saved={saved.includes(project.canonicalUrl)} onToggleSaved={() => toggleSaved(project.canonicalUrl)} />
              ))}
            </div>
          ) : (
            <div className="border border-ink/15 py-20 text-center"><p className="font-serif text-2xl">这个栏目今天还没有项目。</p><button className="mt-5 border-b border-ink text-sm" onClick={() => setActive("Today")}>回到 Today</button></div>
          )}
        </section>
      </div>
    </main>
  );
}
