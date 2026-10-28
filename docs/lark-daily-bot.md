# GitHub 今日好玩飞书推送（send-lark-notify.py）

每天的飞书卡片由 **Aime 14:30 定时任务**统一调用 `scripts/send-lark-notify.py` 推送（读取 `public/data/feed.json` 中当天期刊，精选前 5 个项目）。`pnpm bot:send` 只是该脚本的兼容别名，旧的 `send-lark-daily.ts` 已下线，不存在第二套发送实现。

## 去重与补发

- 发送成功后写入 `.daily-pipeline/lark-sent/<date>-<recipient>.json` 标记；同一天重复执行会直接跳过（输出 `already_sent`），不会重发。
- 确认需要当天重发时，加 `--force` 忽略标记。

## 飞书开放平台配置（必须由用户完成）

1. 在飞书开放平台创建企业自建应用，名称可设为「GitHub 今日好玩」。不要复用或替换 AIME 内置应用。
2. 添加「机器人」能力，并开通 **获取与发送单聊、群组消息**（`im:message`）权限；发布应用版本。
3. 在应用的可用范围中加入 `wudan.seiya`。若推送群聊，还需把机器人加入目标群。
4. 获取该应用域下目标用户的 `open_id`。可由管理员通过通讯录接口查询，或让应用接收用户给机器人的首次消息事件并读取事件中的 `sender.sender_id.open_id`。OpenID 与应用绑定，不可复用其他应用取得的值。
5. 在 GitHub 仓库 Settings → Secrets and variables → Actions 新建：`LARK_APP_ID`、`LARK_APP_SECRET`、`LARK_RECIPIENT_ID`。所有值只放 Secret，禁止提交到仓库。
6. 将本次本地改动审核后推送到远端。Actions 的 schedule 仅在工作流已存在于默认分支时自动运行。

## 配置

参考 `.env.example`。默认接收者类型是 `open_id`，默认网站为 `https://1384e82de8f4.ida-app.bytedance.net`，默认精选 5 项（可设 1–10）。

## 手动测试

```bash
# 不请求飞书，仅验证当天 edition 并打印完整 CardKit JSON
pnpm bot:send -- --date 2026-09-09 --dry-run

# 配好本地环境变量后真实发送
pnpm bot:send -- --date 2026-09-09
```

也可在 GitHub Actions 手动运行「GitHub 今日好玩飞书推送」，先勾选 dry run；确认日志中的卡片 JSON 后再真实运行。

## 调度与失败处理

- 自动推送由 Aime 定时任务「GitHub今日好玩每日飞书推送」每天 14:30（北京时间）执行；发送前会确认 `public/data/feed.json` 的 latest 为当天，否则停止不报旧刊。
- `.github/workflows/lark-daily-push.yml` 已去掉 schedule，仅保留手动派发，作为应急补发通道（注意 CI 环境不保留 `.daily-pipeline/lark-sent` 去重标记，手动派发默认会真实发送）。
- edition 缺失、日期不匹配、项目为空、配置缺失或飞书返回业务错误时，脚本以非零退出，不会发送“成功”假消息。
- 网络错误、HTTP 429 和 5xx 最多尝试 3 次，指数退避；4xx 配置/权限错误直接失败。
- 当天重复执行自动跳过（依据 `.daily-pipeline/lark-sent` 标记）；确需重发用 `--force`，重发前先确认群内是否已有当天卡片。

## 常见排查

- `99991663` / 权限不足：确认 `im:message` 已开通且新版本已发布。
- 用户不可见：确认 `wudan.seiya` 在应用可用范围内，并且 `LARK_RECIPIENT_ID` 来自这个独立应用域。
- 当天 edition 不存在：先检查 09:30 发布任务和对应 JSON 是否已提交到调度所检出的分支。
