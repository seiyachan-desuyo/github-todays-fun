"use client";

import Image from "next/image";
import Link from "next/link";
import siteLogo from "@/assets/site-logo.png";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark, Check, ChevronDown, Clock3, Github, Heart, LibraryBig,
  Menu, Search, Settings2, Sparkles, X,
} from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import {
  DISCOVERY_CATEGORIES, INTEREST_OPTIONS, SOURCE_LABELS,
  interestMatchCount, matchesCategory, personalizedScore, projectCategory,
  type DiscoveryCategory,
} from "@/lib/discovery";
import type { DailyEdition, EditorialProject, EditorialTag } from "@/lib/types";

const SAVED_KEY = "github-today-saved";
const INTEREST_KEY = "github-today-interests";

function MastheadMark() {
  return <Image src={siteLogo} alt="GitHub 今日好玩" width={48} height={48} priority className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-lg shadow-violet-200 sm:h-12 sm:w-12" />;
}

function readLocalList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function DailyDiscover({ edition, editions, candidates }: {
  edition: DailyEdition;
  editions: DailyEdition[];
  candidates: EditorialProject[];
}) {
  const [active, setActive] = useState<DiscoveryCategory>("all");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [interests, setInterests] = useState<EditorialTag[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [candidateLimit, setCandidateLimit] = useState(30);
  const [storageReady, setStorageReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setSaved(readLocalList(SAVED_KEY));
    setInterests(readLocalList(INTEREST_KEY).filter((item): item is EditorialTag => INTEREST_OPTIONS.some((option) => option.tag === item)));
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const allPublishedProjects = useMemo(() => {
    const unique = new Map(editions.flatMap((item) => item.projects).map((project) => [project.canonicalUrl, project]));
    return [...unique.values()];
  }, [editions]);

  const categoryCounts = useMemo(() => Object.fromEntries(DISCOVERY_CATEGORIES.map(({ id }) => [
    id,
    id === "saved"
      ? allPublishedProjects.filter((project) => saved.includes(project.canonicalUrl)).length
      : id === "for-you"
        ? edition.projects.filter((project) => interestMatchCount(project, interests) > 0).length
        : edition.projects.filter((project) => matchesCategory(project, id, edition.date, saved)).length,
  ])), [allPublishedProjects, edition, interests, saved]);

  const projects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const sourceProjects = active === "saved" ? allPublishedProjects : edition.projects;
    const result = sourceProjects.filter((project) => {
      if (!matchesCategory(project, active, edition.date, saved)) return false;
      if (!normalizedQuery) return true;
      return [project.name, project.plainSummary, project.introduction, project.whyToday, project.language, ...project.editorialTags]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
    });
    if (active === "for-you" || interests.length) {
      return [...result].sort((a, b) => personalizedScore(b, interests) - personalizedScore(a, interests));
    }
    return result;
  }, [active, allPublishedProjects, edition, interests, query, saved]);

  function toggleSaved(url: string) {
    setSaved((current) => {
      const isRemoving = current.includes(url);
      const next = isRemoving ? current.filter((item) => item !== url) : [...current, url];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setToast(isRemoving ? "已移出稍后看" : "已加入稍后看");
      return next;
    });
  }

  function toggleInterest(tag: EditorialTag) {
    setInterests((current) => {
      const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
      localStorage.setItem(INTEREST_KEY, JSON.stringify(next));
      return next;
    });
  }

  function chooseCategory(category: DiscoveryCategory) {
    setActive(category);
    setMenuOpen(false);
    document.getElementById("today-picks")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const formattedDate = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date(`${edition.date}T12:00:00+08:00`));
  const isDemo = edition.mode === "demo";

  return (
    <main className="min-h-screen overflow-x-hidden bg-transparent text-stone-900">
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-sm font-bold text-white shadow-xl"><Check className="mr-2 inline" size={15} />{toast}</div>}

      <div className="top-gradient-shell">
      <header>
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex min-h-20 items-center justify-between gap-5 py-4">
            <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="GitHub 今日好玩首页">
              <MastheadMark />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Daily Open-source Zine</p>
                <h1 className="truncate font-serif text-2xl font-black tracking-tight sm:text-3xl">GitHub 今日好玩</h1>
              </div>
            </Link>
            <div className="hidden items-center gap-5 text-xs text-stone-500 md:flex">
              <span>{formattedDate}</span>
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1.5 font-bold text-stone-700">第 {String(edition.issue).padStart(3, "0")} 期</span>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-16">
        <div className="hero-orb-one pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full blur-3xl" />
        <div className="hero-orb-two pointer-events-none absolute -right-20 top-12 h-80 w-80 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-5xl">
            <div className="mb-7 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-white">今日 30 个</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-bold text-violet-700 shadow-sm backdrop-blur-xl"><Clock3 size={13} /> 约 5 分钟读完</span>
              {isDemo && <span className="rounded-full bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900">示例刊物 · {edition.date}</span>}
            </div>
            <h2 className="max-w-5xl bg-gradient-to-r from-[#241345] via-[#5f32db] to-[#9d74ff] bg-clip-text font-serif text-5xl font-black leading-[1.02] tracking-[-0.055em] text-transparent sm:text-7xl lg:text-[5.6rem]">今天的 GitHub <span className="emoji-hand" role="img" aria-label="挥手">👋</span><br /><span>有什么好玩的？</span></h2>
            <p className="mt-7 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">{edition.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => chooseCategory("all")} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-start to-brand-end px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-200 transition hover:-translate-y-1 hover:shadow-2xl"><Sparkles size={16} /> 开始翻今天这期</button>
              <button onClick={() => setInterestOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-6 py-3.5 text-sm font-bold text-stone-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-300 hover:text-violet-700"><Settings2 size={16} /> {interests.length ? `已选 ${interests.length} 个兴趣` : "告诉我你爱看什么"}</button>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div className="sticky top-2 z-30">
        <div className="discovery-dock px-3 sm:px-4">
          <div className="flex min-h-16 items-center gap-3">
            <button className="dock-action flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-bold md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}>{menuOpen ? <X size={16} /> : <Menu size={16} />} 分类</button>
            <nav className={`${menuOpen ? "category-menu-open" : ""} category-menu flex-1`} aria-label="发现分类">
              {DISCOVERY_CATEGORIES.map((category) => (
                <button key={category.id} onClick={() => chooseCategory(category.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition ${active === category.id ? "category-active" : "text-stone-500 hover:bg-white hover:text-orange-600"}`}>
                  {category.shortLabel}<span className="ml-1 text-xs opacity-60">{categoryCounts[category.id] ?? 0}</span>
                </button>
              ))}
            </nav>
            <div className="relative hidden w-56 shrink-0 sm:block">
              <Search className="absolute left-3 top-2.5 text-white/60" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜项目、用途或标签" aria-label="搜索项目" className="w-full rounded-full border border-white/10 bg-white/10 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30" />
            </div>
            <div className="relative block">
              <button onClick={() => setArchiveOpen((value) => !value)} className="dock-action flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold" aria-expanded={archiveOpen}><LibraryBig size={15} /> 第 {String(edition.issue).padStart(3, "0")} 期 <ChevronDown size={14} className={archiveOpen ? "rotate-180" : ""} /></button>
              {archiveOpen && (
                <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                  <div className="px-3 pb-2 pt-1"><p className="text-xs font-black uppercase tracking-widest text-orange-600">Past editions</p><p className="mt-1 text-sm text-stone-500">按期数浏览往期推送</p></div>
                  <div className="max-h-80 overflow-y-auto">
                    {editions.map((item) => {
                      const selected = item.date === edition.date;
                      return <Link key={item.date} href={item.date === editions[0].date ? "/" : `/archive/${item.date}`} className={`flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition ${selected ? "bg-orange-50 text-orange-700" : "hover:bg-orange-50"}`}><span><strong className="block text-sm">第 {String(item.issue).padStart(3, "0")} 期</strong><span className="mt-1 block text-xs text-stone-500">{item.title}</span></span><span className="shrink-0 text-xs text-stone-400">{item.date.slice(5).replace("-", ".")}</span></Link>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="pb-3 sm:hidden"><div className="relative"><Search className="absolute left-3 top-2.5 text-stone-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜项目、用途或标签" aria-label="搜索项目" className="w-full rounded-full border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-300" /></div></div>
        </div>
      </div>

      <section id="today-picks" className="scroll-mt-24 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-orange-600">Today&apos;s Picks · {String(projects.length).padStart(2, "0")}</p>
              <h2 className="mt-1 font-serif text-3xl font-black sm:text-4xl">{DISCOVERY_CATEGORIES.find((item) => item.id === active)?.label}</h2>
              {active === "for-you" && <p className="mt-2 text-sm text-stone-500">兴趣匹配越多，越靠前；事实热度与编辑推荐也会参与排序。</p>}
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500"><span className={`h-2 w-2 rounded-full ${storageReady ? "bg-emerald-500" : "animate-pulse bg-amber-400"}`} /> {storageReady ? "收藏与兴趣已保存在本机" : "正在读取你的偏好"}</div>
          </div>

          {projects.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project, index) => <ProjectCard key={project.canonicalUrl} project={project} index={index} saved={saved.includes(project.canonicalUrl)} onToggleSaved={() => toggleSaved(project.canonicalUrl)} category={projectCategory(project, edition.date)} matchedInterest={interestMatchCount(project, interests) > 0} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 px-6 py-20 text-center">
              {active === "saved" ? <Bookmark className="mx-auto text-orange-400" size={34} /> : <Search className="mx-auto text-orange-400" size={34} />}
              <p className="mt-4 font-serif text-2xl font-bold">{active === "saved" ? "稍后看还是空的" : "这次没搜到，换个说法试试"}</p>
              <p className="mt-2 text-sm text-stone-500">{active === "saved" ? "看到喜欢的项目，点卡片右上角的书签就能收进来。" : "可以搜索项目名、用途、语言或中文标签。"}</p>
              <button className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setActive("all"); setQuery(""); }}>看看全部 30 个</button>
            </div>
          )}
        </div>
      </section>

      {candidates.length > 0 && (
        <section className="border-t border-stone-200 pb-12 sm:pb-16">
          <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
            {!candidateOpen ? (
              <div className="text-center">
                <button onClick={() => setCandidateOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white px-6 py-3 text-sm font-black text-orange-700 transition hover:bg-orange-500 hover:text-white">
                  查看全部 {candidates.length} 个可核验候选 <ChevronDown size={16} />
                </button>
                <p className="mt-3 text-xs text-stone-500">精选 30 个还没看够？继续浏览当天完整候选池。</p>
              </div>
            ) : (
              <div>
                <div className="mb-6 flex flex-col justify-between gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-end">
                  <div><p className="text-xs font-black uppercase tracking-widest text-orange-600">All verified candidates</p><h2 className="mt-1 font-serif text-3xl font-black">当天全部可核验候选</h2><p className="mt-2 text-sm text-stone-500">基于原始描述与 README 编辑的中文介绍，供你发现更多可能。</p></div>
                  <button onClick={() => setCandidateOpen(false)} className="self-start text-sm font-bold text-stone-500 hover:text-orange-700">收起候选列表</button>
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {candidates.slice(0, candidateLimit).map((candidate, index) => (
                    <ProjectCard
                      key={candidate.canonicalUrl}
                      project={candidate}
                      index={index}
                      saved={saved.includes(candidate.canonicalUrl)}
                      onToggleSaved={() => toggleSaved(candidate.canonicalUrl)}
                      category={projectCategory(candidate, edition.date)}
                      matchedInterest={interestMatchCount(candidate, interests) > 0}
                    />
                  ))}
                </div>
                {candidateLimit < candidates.length && <div className="mt-6 text-center"><button onClick={() => setCandidateLimit((value) => Math.min(value + 30, candidates.length))} className="rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600">再看 30 个</button></div>}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="border-y border-stone-200 bg-white py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-orange-600">Facts, then words</p><h2 className="mt-2 font-serif text-2xl font-black">这些内容从哪来？</h2><p className="mt-3 text-sm leading-6 text-stone-500">程序先采集可核验事实、去重并评分，再由 Aime 只根据真实 description 与可用 README 写成中文，校验通过后发布。</p></div>
          <div className="lg:col-span-2 grid gap-3 sm:grid-cols-3">
            {edition.sourceStatus.map((source) => <div key={source.source} className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="flex items-center justify-between"><Github size={18} /><span className={`rounded-full px-2 py-1 text-xs font-bold ${source.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{source.status === "ok" ? "正常" : "降级"}</span></div><p className="mt-3 text-sm font-bold">{SOURCE_LABELS[source.source]}</p><p className="mt-1 text-xs leading-5 text-stone-500">{source.normalizedCount ?? 0} 条可用事实</p></div>)}
          </div>
        </div>
      </section>

      <footer className="bg-amber-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 text-sm text-stone-500 sm:flex-row sm:px-8"><div><p className="font-serif text-xl font-black text-stone-900">GitHub 今日好玩</p><p className="mt-1">每天替你多逛一会儿 GitHub，少一点术语，多一点发现。</p></div><p className="flex items-center gap-1.5 sm:self-end"><Heart size={14} className="text-rose-500" /> 由真实数据与 Aime 中文编辑共同完成</p></div>
      </footer>

      {interestOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="interest-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setInterestOpen(false); }}>
          <div className="w-full max-w-2xl rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Make it yours</p><h2 id="interest-title" className="mt-1 font-serif text-3xl font-black">你最近想看什么？</h2><p className="mt-2 text-sm text-stone-500">可多选。只保存在这台设备上，不用登录。</p></div><button onClick={() => setInterestOpen(false)} aria-label="关闭兴趣设置" className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 hover:bg-stone-200"><X size={18} /></button></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{INTEREST_OPTIONS.map((option) => { const selected = interests.includes(option.tag); return <button key={option.tag} onClick={() => toggleInterest(option.tag)} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${selected ? "border-violet-300 bg-violet-50 ring-2 ring-violet-100" : "border-stone-200 hover:border-orange-200 hover:bg-orange-50"}`}><span><strong className="block text-sm">{option.label}</strong><span className="mt-1 block text-xs text-stone-500">{option.hint}</span></span><span className={`grid h-6 w-6 place-items-center rounded-full ${selected ? "bg-violet-600 text-white" : "border border-stone-300"}`}>{selected && <Check size={14} />}</span></button>; })}</div>
            <div className="mt-6 flex items-center justify-between gap-4"><button onClick={() => { setInterests([]); localStorage.setItem(INTEREST_KEY, "[]"); }} className="text-sm font-bold text-stone-400 hover:text-stone-700">清空选择</button><button onClick={() => { setInterestOpen(false); setActive("for-you"); }} className="rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700">看看为我排的顺序</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
