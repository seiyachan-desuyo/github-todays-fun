import { z } from "zod";
import { EDITORIAL_TAGS } from "@/lib/types";

export const editorialItemSchema = z.object({
  githubUrl: z.string().url().refine((url) => new URL(url).hostname === "github.com", "必须是 GitHub URL"),
  plainSummary: z.string().min(8).max(80),
  introduction: z.string().min(20).max(260),
  whyToday: z.string().min(8).max(140),
  audience: z.string().min(4).max(80),
  editorialTags: z.array(z.enum(EDITORIAL_TAGS)).min(1).max(4),
  recommendation: z.number().int().min(1).max(5),
});

export const aiEditionSchema = z.object({
  summary: z.string().min(10).max(140),
  projects: z.array(editorialItemSchema).min(1).max(10),
});

export type AiEditionOutput = z.infer<typeof aiEditionSchema>;
