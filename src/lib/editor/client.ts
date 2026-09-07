import { aiEditionSchema, type AiEditionOutput } from "@/lib/editor/schema";
import type { CandidateProject } from "@/lib/types";

export async function editWithAi(projects: CandidateProject[]): Promise<AiEditionOutput> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("缺少 AI_API_KEY；禁止根据项目名生成兜底文案");
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const facts = projects.map(({ name, githubUrl, description, readme, stars, recentGrowth, language, topics, sources }) => ({
    name, githubUrl, description, readme: readme?.slice(0, 8000), stars, recentGrowth, language, topics, sources,
  }));
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: "你是面向普通人的 GitHub 中文编辑。只依据输入中的 description 和 README 写作，不得凭项目名猜测。选出最多 10 个项目。输出严格 JSON：{summary,projects:[{githubUrl,plainSummary,introduction,whyToday,audience,editorialTags,recommendation}]}。标签只能从 AI 工具、效率、有趣、设计、数据、学习、开源替代、开发工具中选择。" },
        { role: "user", content: JSON.stringify(facts) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`AI Editor 请求失败：HTTP ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI Editor 未返回内容");
  return aiEditionSchema.parse(JSON.parse(content));
}
