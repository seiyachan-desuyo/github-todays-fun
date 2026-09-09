import { z } from "zod";
import { EDITORIAL_TAGS } from "@/lib/types";

const sourceNameSchema = z.enum([
  "github-search", "github-trending", "github-repository",
]);
const sourceStatusSchema = z.object({
  source: sourceNameSchema,
  status: z.enum(["ok", "degraded", "unavailable"]),
  fetchedAt: z.string().datetime(),
  message: z.string().min(1),
  rawCount: z.number().int().nonnegative().optional(),
  normalizedCount: z.number().int().nonnegative().optional(),
  raw: z.unknown().optional(),
});
const scoreSchema = z.object({
  snapshotGrowth: z.number().nonnegative(),
  trendingGrowth: z.number().nonnegative(),
  newProjectVelocity: z.number().nonnegative(),
  pushedFreshness: z.number().nonnegative(),
  crossSource: z.number().nonnegative(),
  total: z.number().nonnegative(),
  signals: z.array(z.string().min(1)).min(1),
});
const pipelineStatsSchema = z.object({
  rawCandidateCount: z.number().int().nonnegative(),
  normalizedCandidateCount: z.number().int().nonnegative(),
  dedupedCandidateCount: z.number().int().nonnegative(),
  eligibleCandidateCount: z.number().int().nonnegative(),
  selectedCount: z.number().int().nonnegative(),
});

export const editorTaskSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string().datetime(),
  editorMode: z.literal("aime"),
  targetCount: z.literal(30),
  snapshotPath: z.string().min(1),
  sourceStatus: z.array(sourceStatusSchema).min(1),
  pipelineStats: pipelineStatsSchema,
  candidates: z.array(z.object({
    repoName: z.string().min(3),
    url: z.string().url().refine((url) => new URL(url).hostname === "github.com", "必须是 GitHub URL"),
    description: z.string().min(1).optional(),
    readmeSummary: z.string().min(1).optional(),
    stars: z.number().int().nonnegative().optional(),
    forks: z.number().int().nonnegative().optional(),
    openIssues: z.number().int().nonnegative().optional(),
    growth: z.object({ value: z.number().nonnegative(), source: z.enum(["snapshot", "github-trending"]) }).optional(),
    language: z.string().min(1).optional(),
    topics: z.array(z.string()),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    pushedAt: z.string().datetime().optional(),
    sources: z.array(sourceNameSchema).min(1),
    score: scoreSchema,
  })).min(1),
});

export const editorialItemSchema = z.object({
  name: z.string().min(3),
  githubUrl: z.string().url().refine((url) => new URL(url).hostname === "github.com", "必须是 GitHub URL"),
  canonicalUrl: z.string().url(),
  description: z.string().min(1).optional(),
  readme: z.string().min(1).optional(),
  stars: z.number().int().nonnegative().optional(),
  forks: z.number().int().nonnegative().optional(),
  openIssues: z.number().int().nonnegative().optional(),
  recentGrowth: z.number().nonnegative().optional(),
  growthSource: z.enum(["snapshot", "github-trending"]).optional(),
  language: z.string().min(1).optional(),
  topics: z.array(z.string()),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  pushedAt: z.string().datetime().optional(),
  sources: z.array(sourceNameSchema).min(1),
  score: scoreSchema,
  plainSummary: z.string().min(8).max(80),
  introduction: z.string().min(20).max(260),
  whyToday: z.string().min(8).max(140),
  audience: z.string().min(4).max(80),
  editorialTags: z.array(z.enum(EDITORIAL_TAGS)).min(1).max(4),
  recommendation: z.number().int().min(1).max(5),
});

export const aimeEditionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  issue: z.number().int().positive(),
  title: z.string().min(4).max(80),
  metadata: z.object({
    targetCount: z.literal(30),
    degraded: z.boolean(),
    degradedReason: z.string().min(10).optional(),
  }).superRefine((metadata, context) => {
    if (metadata.degraded && !metadata.degradedReason) context.addIssue({ code: z.ZodIssueCode.custom, message: "降级出版必须说明原因" });
    if (!metadata.degraded && metadata.degradedReason) context.addIssue({ code: z.ZodIssueCode.custom, message: "正常出版不应填写降级原因" });
  }),
  summary: z.string().min(10).max(180),
  mode: z.literal("live"),
  editorMode: z.literal("aime"),
  notice: z.string().min(10),
  publishedAt: z.string().datetime(),
  sourceStatus: z.array(sourceStatusSchema).min(1),
  pipelineStats: pipelineStatsSchema,
  projects: z.array(editorialItemSchema).min(1).max(30),
}).superRefine((edition, context) => {
  if (!edition.metadata.degraded && edition.projects.length !== 30) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["projects"], message: "正常出版必须恰好包含 30 个项目" });
  }
});

// 兼容历史测试/导入名；运行时主流程不再调用外部模型。
export const aiEditionSchema = z.object({
  summary: z.string().min(10).max(180),
  projects: z.array(editorialItemSchema.pick({ githubUrl: true, plainSummary: true, introduction: true, whyToday: true, audience: true, editorialTags: true, recommendation: true })).min(1).max(30),
});

export type AimeEditionOutput = z.infer<typeof aimeEditionSchema>;
export type AiEditionOutput = z.infer<typeof aiEditionSchema>;
