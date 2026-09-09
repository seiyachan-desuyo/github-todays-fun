# GitHub 今日好玩独立飞书 Bot

该任务每天北京时间 10:00 读取 `src/data/editions/YYYY-MM-DD.json`，按推荐等级、评分和近期增长挑选亮点，以独立飞书应用的交互卡片私聊推送，并附完整网站链接。09:30 发布到 10:00 推送之间预留 30 分钟。

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

- `.github/workflows/lark-daily-push.yml` 使用 `0 2 * * *`（UTC），即北京时间每天 10:00。
- edition 缺失、日期不匹配、项目为空、配置缺失或飞书返回业务错误时，脚本以非零退出，Action 标红，不会发送“成功”假消息。
- 网络错误、HTTP 429 和 5xx 最多尝试 3 次，指数退避；4xx 配置/权限错误直接失败。
- GitHub Actions 可能延迟数分钟触发。如果必须严格 10:00，可在固定服务器使用同一命令配置 `CRON_TZ=Asia/Shanghai` 的 cron。
- 手动重跑会再次发送；飞书消息创建接口没有跨运行的天然幂等保证。发送前请先查看当天 Action 是否已成功，避免重复。

## 常见排查

- `99991663` / 权限不足：确认 `im:message` 已开通且新版本已发布。
- 用户不可见：确认 `wudan.seiya` 在应用可用范围内，并且 `LARK_RECIPIENT_ID` 来自这个独立应用域。
- 当天 edition 不存在：先检查 09:30 发布任务和对应 JSON 是否已提交到调度所检出的分支。
