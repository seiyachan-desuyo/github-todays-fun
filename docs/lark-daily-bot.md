# GitHub 今日好玩飞书推送

飞书推送由 Aime App 服务内的定时线程触发：每天北京时间（`Asia/Shanghai`）10:07 读取当天刊物，截取 `projects` 的前 5 项组装 CardKit 消息并发到群聊。服务在 10:07 后启动时会补跑；成功日期记录在 `AIME_PLUGIN_DATA_DIR/lark-notify-state.json`，避免服务重启后重复发送。失败会写入服务日志，并每 15 分钟重试。

## 必需配置

在 Aime 应用运行环境的 Secret/环境变量中配置：

- `LARK_APP_ID`：飞书企业自建应用 App ID；
- `LARK_APP_SECRET`：App Secret；
- `LARK_RECIPIENT_ID`：目标群的 `chat_id`；
- `GITHUB_TODAY_WEBSITE_URL`：可选，默认 `https://1384e82de8f4.ida-app.bytedance.net`。

应用需要启用机器人能力、开通 `im:message` 权限并加入目标群。Secret 与 chat_id 不得提交到仓库。

## 数据读取顺序

`scripts/send-lark-notify.py` 会依次尝试：

1. 固定站点的 `/data/editions/YYYY-MM-DD.json`；
2. 固定站点的 `/data/YYYY-MM-DD.json`；
3. 仓库 `public/data/editions/YYYY-MM-DD.json`；
4. 仓库 `src/data/editions/YYYY-MM-DD.json`（Aime 发布包也包含此目录）。

远端不可用时自动回退到本地刊物；日期不符或项目为空时退出失败，不发送空卡片。

## 手动使用

```bash
# Dry-run：不需要飞书凭证，打印 2026-09-10 的卡片 JSON
python3 scripts/send-lark-notify.py --date 2026-09-10 --dry-run

# 真实发送到群聊
LARK_APP_ID=... LARK_APP_SECRET=... LARK_RECIPIENT_ID=oc_xxx \
  python3 scripts/send-lark-notify.py --date 2026-09-10
```

GitHub Actions 的 `schedule` 已移除，不再定时推送。需要应急补发时，可在 Actions 页面手动运行「GitHub 今日好玩飞书推送（手动备用）」，可先勾选 `dry_run` 验证。

## 排查

- 缺少变量：脚本会明确列出缺失的环境变量；
- `99991663` / 权限不足：确认 `im:message` 已开通、应用版本已发布、机器人已加入群；
- 当天刊物不存在：检查出版任务是否已生成并发布当天 JSON；
- Aime 定时运行异常：先查看 Service 日志中的 `[lark-scheduler]` 记录。
