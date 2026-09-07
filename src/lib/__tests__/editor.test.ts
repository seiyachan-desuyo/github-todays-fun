import { describe, expect, it } from "vitest";
import { aiEditionSchema, editorialItemSchema } from "@/lib/editor/schema";

const valid = {
  githubUrl: "https://github.com/owner/repo",
  plainSummary: "这是一个普通人也能看懂的项目介绍",
  introduction: "它基于真实的项目说明，解释可以解决的问题以及具体怎么玩。",
  whyToday: "它代表了一个正在发生的新趋势。",
  audience: "想提高效率的普通用户",
  editorialTags: ["效率"],
  recommendation: 4,
};

describe("AI schema", () => {
  it("accepts strict editorial JSON", () => expect(aiEditionSchema.parse({ summary: "今天关注真正能派上用场的新工具。", projects: [valid] }).projects).toHaveLength(1));
  it("rejects unknown tags", () => expect(() => editorialItemSchema.parse({ ...valid, editorialTags: ["区块链"] })).toThrow());
  it("rejects non-GitHub URLs and scores outside 1-5", () => {
    expect(() => editorialItemSchema.parse({ ...valid, githubUrl: "https://example.com/a/b", recommendation: 6 })).toThrow();
  });
});
