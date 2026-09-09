# 参与贡献

感谢你参与 GitHub 今日好玩。项目坚持“事实采集”和“编辑判断”分离：代码负责真实数据与校验，编辑内容必须有候选事实支撑。

## 开发流程

```bash
cd "/path/to/github-todays-fun"
pnpm install --frozen-lockfile
pnpm dev
```

提交前运行：

```bash
cd "/path/to/github-todays-fun"
pnpm lint
pnpm test
pnpm build
```

## 贡献约定

- 不提交 `.env*`、Token、App Secret、用户 ID、运行日志或本地流水线状态。
- 不把第三方榜单伪装成 GitHub 官方事实，不根据项目名猜测功能。
- 修改数据 schema、评分规则或来源逻辑时，同步补充测试与文档。
- 修改 Aime App 构件时，同步检查 `app.json`、Skill、Command 和 `docs/aime-app.md`。
- Pull Request 请说明问题、方案、验证命令和可能影响；视觉变更建议附截图。

## 报告问题

公开 Issue 中请提供可复现步骤和脱敏日志。安全问题不要公开披露，请按 `SECURITY.md` 处理。
