# GitHub 今日好玩飞书推送

飞书推送由 **Aime 平台 cron** 触发：每天北京时间（`Asia/Shanghai`）10:07 直接执行 `scripts/send-lark-notify.py`。应用 Service 只负责提供网站和健康检查，不包含定时器、自动补跑或重试调度，因此不会与平台 cron 重复推送。

## 必需配置

在 Aime 平台定时任务的 Secret/环境变量中配置：

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

## Aime 平台 cron

定时任务每天北京时间 10:07 运行一次：

```bash
python3 scripts/send-lark-notify.py
```

日期默认按 `Asia/Shanghai` 计算，也可通过 `--date YYYY-MM-DD` 指定。调度、失败重试和执行历史统一由 Aime 平台管理，仓库内不再实现第二套定时机制。

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
- 定时执行异常：查看 Aime 平台 cron 的执行记录与脚本标准错误输出。
