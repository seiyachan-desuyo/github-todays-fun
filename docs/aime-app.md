# Aime App 打包与发布

本项目同时是可独立部署的网站和 Aime App。Aime App 清单使用仓库根目录的 `app.json`；`manifest.json` 不是当前运行时使用的清单文件。

## 应用构件

- **Service**：`runtime/start.sh` 启动 `runtime/server.py`，从 `dist/` 提供静态页面并响应 `/healthz`。
- **UI Provider**：把 Service 首页挂载到 `ui.pages.onboarding`，支持动态 UI。
- **Skill**：`skills/github-today-fun/SKILL.md` 描述触发场景、内容边界与打开方式。
- **Command**：`/github-today [latest|YYYY-MM-DD] [1-10]` 在对话中展示精选项目。

## 本地校验

```bash
cd "/path/to/github-todays-fun"
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
python3 -m py_compile runtime/server.py commands/github_today.py
printf '{"tool_input":{"args":"latest 3"}}' | python3 commands/github_today.py
PORT=3100 bash runtime/start.sh
```

服务启动后访问 `http://localhost:3100/healthz` 和 `http://localhost:3100/`。最后一条命令会持续运行，请在验证后按 Ctrl+C 停止。

## 生成发布包

```bash
cd "/path/to/github-todays-fun"
pnpm aime:package
```

发布包生成到 `release/github-today-fun-aime-app.zip`。脚本会先执行质量检查和生产构建，并排除 `.git`、依赖目录、本地环境变量、流水线运行状态与日志。

## Aime 上架前检查

1. 在 Aime App 发布入口创建应用，确认平台分配的应用 ID；如与 `app.json.id` 不同，以平台值替换。
2. 上传发布 ZIP，确认 `app.json`、`dist/index.html`、Skill 和 Command 均被识别。
3. 启动 Service，检查 `/healthz` 返回 `{ "ok": true }`，应用首页可正常打开。
4. 分别测试 `/github-today`、指定日期与非法参数。
5. 配置应用名称、图标、中文/英文简介、隐私说明、支持链接和版本说明。
6. 使用测试账号完成安装、首次打开、历史刊浏览与卸载回归，再提交审核。

> 当前仓库已绑定 Aime 平台应用 `app_b0e9666721542b2b`。如基于本仓库创建自己的副本，请先在 Aime 平台创建新应用，再将 `app.json.id` 替换为新应用实际分配的 ID。

## 发布边界

Aime App 本体不内置任何密钥。GitHub、飞书和部署凭证只通过运行环境注入，不能写入 ZIP 或 Git 仓库。每日采集与出版属于维护者工作流；安装应用的普通用户默认只浏览已随版本发布的静态刊物。
