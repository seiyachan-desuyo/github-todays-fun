const API = "https://open.feishu.cn/open-apis";
const REQUIRED = ["LARK_APP_ID", "LARK_APP_SECRET", "LARK_RECIPIENT_ID"] as const;

function shanghaiDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireConfig() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`缺少环境变量：${missing.join(", ")}`);
  return {
    appId: process.env.LARK_APP_ID!,
    appSecret: process.env.LARK_APP_SECRET!,
    recipientId: process.env.LARK_RECIPIENT_ID!,
    recipientIdType: process.env.LARK_RECIPIENT_ID_TYPE ?? "open_id",
    websiteUrl: process.env.GITHUB_TODAY_WEBSITE_URL ?? "https://9b76bf529dfe.aime-site.bytedance.net",
  };
}

async function requestJson(url: string, init: RequestInit, attempts = 3): Promise<any> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && (payload.code === undefined || payload.code === 0)) return payload;
      const retryable = response.status === 429 || response.status >= 500;
      const error = new Error(`飞书 API 失败 HTTP ${response.status}, code=${payload.code ?? "unknown"}, msg=${payload.msg ?? "unknown"}`);
      if (!retryable) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
  }
  throw lastError;
}

async function main() {
  const date = option("--date") ?? process.env.EDITION_DATE ?? shanghaiDate();
  const dryRun = process.argv.includes("--dry-run");
  const websiteUrl = process.env.GITHUB_TODAY_WEBSITE_URL ?? "https://9b76bf529dfe.aime-site.bytedance.net";
  const message = `GitHub 今日好玩 · ${date}\n今天的新鲜开源项目已经更新，点击链接查看完整榜单：\n${websiteUrl}`;

  if (dryRun) {
    console.log(message);
    return;
  }

  const config = requireConfig();
  const tokenResult = await requestJson(`${API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  });
  const result = await requestJson(`${API}/im/v1/messages?receive_id_type=${encodeURIComponent(config.recipientIdType)}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tokenResult.tenant_access_token}` },
    body: JSON.stringify({ receive_id: config.recipientId, msg_type: "text", content: JSON.stringify({ text: message }) }),
  });
  console.log(JSON.stringify({ ok: true, date, messageId: result.data?.message_id }, null, 2));
}

main().catch((error) => {
  console.error(`[lark-daily] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
