#!/usr/bin/env python3
"""One-off编辑输出生成器 for 2026-09-22 (issue #13). Not part of pipeline."""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
task = json.loads((ROOT / 'src/data/editor-tasks/2026-09-22.json').read_text())
cands = task['candidates']
by_url = {c['url']: c for c in cands}

# 30 curated repoName -> handcrafted editorial fields
curated = [
    ("mizorewww/laya-mlx", {
        "plainSummary": "为 Apple Silicon 打造的 Laya 有类型决策模型 MLX 原生运行时。",
        "introduction": "把 Laya 的“有类型决策”模型跑在 Mac 本地的 MLX 后端上，用来做快速判定而不是生成文本。安装后加载 ModernBERT 权重，在 M3 Max 上做短决策只需 7–14 ms，全程不联网、不依赖 PyTorch 或云 API。",
        "whyToday": "创建仅三天就实增 +2145 stars，快照增速位列榜首，是今天最热的本地推理项目。",
        "audience": "关注 Apple Silicon 本地推理和 Jev/Laya 决策模型生态的 macOS 开发者。",
        "editorialTags": ["本地推理", "Apple Silicon", "决策模型"],
        "recommendation": 5,
    }),
    ("TheoLeeCJ/SemIf", {
        "plainSummary": "在家用 3090 上跑开源模型做“语义 if”判断。",
        "introduction": "把 if 分支的条件交给开源大模型来判断，让代码可以基于语义而不是关键词分流。项目独立开发，作者明确表示与 Jev / TypeSafe 无关，可在单张 3090 上本地部署。",
        "whyToday": "上线不到一周实增 +737 stars，是今天独立开发者项目里最亮眼的一个。",
        "audience": "想把语义判断塞进业务逻辑、又不想依赖闭源云 API 的后端工程师。",
        "editorialTags": ["语义判断", "本地部署", "开源模型"],
        "recommendation": 4,
    }),
    ("yibie/awesome-jev", {
        "plainSummary": "围绕 TypeSafe Jev 决策模型的公共项目与讨论精选清单。",
        "introduction": "系统整理基于 Jev（TypeSafe 的 System One 有类型决策模型）构建的公共项目、集成方案与社区讨论。适合把它当作了解 Jev 生态的入口。",
        "whyToday": "Jev 生态今日仍在扩散，本榜单一天新增 +324 stars，是最直接的“Jev 全景图”。",
        "audience": "刚听说 Jev 想快速摸清生态和上手方向的开发者。",
        "editorialTags": ["Awesome 列表", "Jev 生态"],
        "recommendation": 4,
    }),
    ("browser-use/jev-ultrafast", {
        "plainSummary": "号称最快最便宜的 Web 智能体。",
        "introduction": "让浏览器自动化 Agent 用有类型决策代替长文本生成，从而降低推理延迟和 token 成本。定位是“最快、最便宜的 web agent”。",
        "whyToday": "browser-use 团队的新分支一周内实增 +3220 stars，是今日快照增长最大的仓库。",
        "audience": "在做浏览器 RPA、抓取或 Web Agent 的工程团队。",
        "editorialTags": ["Web Agent", "浏览器自动化"],
        "recommendation": 5,
    }),
    ("awlevin/typesafe-computer-use", {
        "plainSummary": "用 OCR + TypeSafe 判定，把 macOS 的计算机操作单步压到约 0.0002 美元。",
        "introduction": "面向 macOS 的“电脑操作 Agent”：先 OCR 截屏，再用 TypeSafe 决策模型分类下一步动作，最后点击执行。定位是超低成本的 computer-use pipeline。",
        "whyToday": "computer-use 主题今天有多个项目冒头，这个把每步成本量化到 0.0002 美元最具工程感。",
        "audience": "研究 GUI Agent、想在本地跑 computer-use 的 macOS 开发者。",
        "editorialTags": ["Computer Use", "macOS", "OCR"],
        "recommendation": 4,
    }),
    ("Mak5er/AirCard", {
        "plainSummary": "iOS 18+ 的 Apple Wallet 卡面换肤工具，无需越狱。",
        "introduction": "为 Apple Wallet 里的银行卡、门禁卡等定制外观，通过 Swift 应用在设备侧完成，无需越狱。当前只针对 iOS 18 及以上版本。",
        "whyToday": "非 AI 类项目里今日爆发最猛，实增 +1151 stars，位列榜单前列。",
        "audience": "喜欢 iOS 折腾、想把 Wallet 卡面弄得漂亮点的用户。",
        "editorialTags": ["iOS", "个性化", "Apple Wallet"],
        "recommendation": 4,
    }),
    ("mizorewww/laya-coreml", {
        "plainSummary": "把 Laya 决策模型移植到 Apple Core ML 与神经网络引擎。",
        "introduction": "同一作者把 Laya 的有类型决策模型移到 Core ML 与 Apple Neural Engine 上跑，附有验证过的模型端口和可复现的速度/能耗 benchmark。M3 Max 上短决策约 5 ms。",
        "whyToday": "与 laya-mlx 形成 MLX / CoreML 双栈，今日实增 +456 stars，是 Apple 端本地推理的另一条路径。",
        "audience": "追求最低能耗、把决策模型跑上 Neural Engine 的 iOS/macOS 开发者。",
        "editorialTags": ["Core ML", "Apple Silicon", "端侧推理"],
        "recommendation": 4,
    }),
    ("TianyuCodings/NanoJev", {
        "plainSummary": "极简版 Jev：并行决策 + 端到端训练管线。",
        "introduction": "从零复刻一个“nano”版 Jev，支持并行决策和动态候选，附带完整的端到端训练脚本。适合当作学习 Jev 内部结构的最小示例。",
        "whyToday": "作为教学向复刻实现，一周实增 +254 stars，是理解 Jev 工作原理最直接的入口。",
        "audience": "想读代码理解“类型化决策模型”原理的研究者与学生。",
        "editorialTags": ["决策模型", "教学实现", "训练管线"],
        "recommendation": 4,
    }),
    ("bespokelabsai/nimble", {
        "plainSummary": "本地类型化决策 + 对比数据整理 + 模型评估一站式工具。",
        "introduction": "把“做类型化决策”、“用对比方式清洗数据”和“评估决策模型”打包在同一个 Python 项目里，方便在本地流水线中链式使用。",
        "whyToday": "Bespoke Labs 出品，一周实增 +225 stars，是把决策模型工程化落地的代表。",
        "audience": "做数据清洗与小模型评估的数据/ML 工程师。",
        "editorialTags": ["数据整理", "模型评估", "本地推理"],
        "recommendation": 4,
    }),
    ("rmalde/minecraft-agent", {
        "plainSummary": "在 Minecraft 里跑 Astra 规划 + JEV 控制的智能体。",
        "introduction": "在 Minecraft 里搭一套“规划器 + 控制器”的智能体：Astra 负责高层规划，JEV 决策模型负责动作控制，附有原生录屏、测试路径和运行结果核验。",
        "whyToday": "今日新出的“Minecraft Agent”类项目里增速最猛，一天实增 +142 stars。",
        "audience": "关注游戏内智能体、想把 LLM + 决策模型接进 Minecraft 的开发者。",
        "editorialTags": ["Minecraft", "Agent", "规划器"],
        "recommendation": 4,
    }),
    ("Mak5er/AirCard-iOS", {
        "plainSummary": "iOS 27 的 Apple Wallet 卡面与锁屏密码主题包。",
        "introduction": "作者的 AirCard 系列续作，聚焦 iOS 27，除了 Wallet 卡面还加入锁屏密码框的主题装饰。用 Swift 开发，走系统合规路径。",
        "whyToday": "在 AirCard 之后再度上榜，两天内实增 +128 stars，说明 iOS 个性化定制流量正旺。",
        "audience": "已经在用 AirCard，想升级到 iOS 27 主题的用户。",
        "editorialTags": ["iOS", "锁屏主题", "个性化"],
        "recommendation": 3,
    }),
    ("minorun365/minorun-marp-skill", {
        "plainSummary": "写 Marp 登壇幻灯片的 Skill 集与黑底主题。",
        "introduction": "把作者“做登壇 slides”的经验做成 Claude Code 可复用 Skill：包含故事结构、图示、设计平衡的 checklist，加上一套黑底主题和校验工具。",
        "whyToday": "面向 Agent Skill + Marp 的组合方案里今日增速最快，一天实增 +99 stars。",
        "audience": "常用 Marp 做技术分享、想让 Claude Code 帮忙打磨幻灯片的讲者。",
        "editorialTags": ["Marp", "Agent Skill", "演讲"],
        "recommendation": 4,
    }),
    ("jarrodwatts/jev-trader", {
        "plainSummary": "每个 Monad 区块都用 Jev 做一次交易决策的机器人。",
        "introduction": "在 Kuru 的 MON-USDC 交易对上，每产生一个 Monad 区块就调用 Jev 做一次买/卖/持有的决策并落链。TypeScript 项目，可作为链上决策代理的模板。",
        "whyToday": "今日“AI + 链上交易”类项目里最典型的实践，一天实增 +254 stars。",
        "audience": "想在 Monad / 链上做 AI 决策代理的 Web3 工程师。",
        "editorialTags": ["Web3", "链上交易", "决策模型"],
        "recommendation": 3,
    }),
    ("v-modal/awesome-jev-tools", {
        "plainSummary": "面向 Jev 决策模型的开发工具精选列表。",
        "introduction": "与 awesome-jev 互补，专注收集围绕 Jev 的工具链：客户端、评估器、机器人控制、机器人仿真等方向。",
        "whyToday": "补齐 Jev 工具生态视角，一天实增 +41 stars，方便查找具体工具。",
        "audience": "已经在用 Jev、想找配套 SDK / 工具的开发者。",
        "editorialTags": ["Awesome 列表", "工具链"],
        "recommendation": 3,
    }),
    ("Heman10x-NGU/openJev-verdict-2.0", {
        "plainSummary": "151M 参数的非自回归决策引擎，公开跑分优于 Jev 和 Laya。",
        "introduction": "在 LocalLLaMA/typed-decisions 基准上跑到 77.10% 准确率、Brier 0.0636、ECE 0.0144 的开源决策引擎，附 ONNX 权重与 WebGPU 演示。",
        "whyToday": "开源阵营正面挑战 TypeSafe 的公开跑分，作者披露实增 +32 stars。",
        "audience": "关心决策模型精度与校准 (calibration) 的研究者。",
        "editorialTags": ["决策模型", "非自回归", "开源"],
        "recommendation": 3,
    }),
    ("logan-markewich/jeff", {
        "plainSummary": "自托管、可替换 TypeSafe Jev 的 GliFormer 版本。",
        "introduction": "用 GliFormer 做骨干、给出 TypeSafe Jev 兼容 API 的自托管版本，可直接 drop-in 替换现有集成，Python 实现。",
        "whyToday": "作为“可自托管替代 Jev”的方案，一天实增 +31 stars，走向逐步清晰。",
        "audience": "希望摆脱云 API 依赖、内网部署决策模型的工程团队。",
        "editorialTags": ["Jev 兼容", "自托管", "GliFormer"],
        "recommendation": 3,
    }),
    ("zhengkid/Dream-RSI", {
        "plainSummary": "论文《Dream-RSI: Recursive Self-Improvement through Evolving Worlds》的官方仓库。",
        "introduction": "作者们提出让智能体在不断演化的世界模型中做递归自我提升 (RSI) 的方案，仓库是论文的官方实现与实验代码。",
        "whyToday": "研究向的 RSI 项目今日实增 +45 stars，Recursive Self-Improvement 话题重新升温。",
        "audience": "研究 world model、递归自我提升的 ML 学者。",
        "editorialTags": ["论文实现", "自我提升", "World Model"],
        "recommendation": 3,
    }),
    ("sutro-sh/jev-align", {
        "plainSummary": "用人类反馈 + GEPA 校准 Jev AI Function 的 CLI。",
        "introduction": "以 Jev 决策模型为基础，通过 human-in-the-loop 主动学习和 GEPA 提示词优化，把“AI Function”校准到目标分类精度。附命令行工具。",
        "whyToday": "把校准/主动学习流程做成 CLI，今日实增 +21 stars，工程实用度高。",
        "audience": "想把决策模型质量交给内部 QA / 标注团队来打磨的团队。",
        "editorialTags": ["Active Learning", "GEPA", "决策模型"],
        "recommendation": 3,
    }),
    ("shhivv/third-hand", {
        "plainSummary": "基于决策模型的 computer-use 助手。",
        "introduction": "以决策模型为核心，给桌面装一只“第三只手”：看屏幕、判断下一步、代替用户点击拖拽。Swift 实现，配合决策模型的低延迟特性。",
        "whyToday": "computer-use 赛道今日又一新面孔，实增 +19 stars。",
        "audience": "想在 macOS 上尝试 computer-use 助手的极客用户。",
        "editorialTags": ["Computer Use", "决策模型"],
        "recommendation": 3,
    }),
    ("HyNetworks/OpenGFW", {
        "plainSummary": "自己动手做一个防火长城的 DIY Go 项目。",
        "introduction": "作者调侃地把项目描述为“你自己的 Great Firewall of China”，用 Go 实现深度包检测和过滤策略，用来在私有网络里搭建可控的出网规则。",
        "whyToday": "老牌网络安全项目今日再次冒头，实增 +9 stars，具备教学价值。",
        "audience": "研究网络流量分析、DPI 和企业网出网策略的安全工程师。",
        "editorialTags": ["网络安全", "DPI", "Go"],
        "recommendation": 3,
    }),
    ("nftechie/stonkfly", {
        "plainSummary": "果蝇连接组仿真 + Coinbase AgentKit 交易的“脑虫”实验。",
        "introduction": "把果蝇 (fly) 全连接组仿真跑起来，接上实验性的记忆机制，再通过 Coinbase AgentKit 触发受限的交易动作。属于跨脑科学与链上代理的实验性项目。",
        "whyToday": "冷门但脑洞极大的项目，今日实增 +10 stars，值得围观。",
        "audience": "喜欢神经元连接组、类脑计算和链上代理交叉话题的爱好者。",
        "editorialTags": ["Connectome", "类脑", "AgentKit"],
        "recommendation": 3,
    }),
    ("jackwener/wx-cli-again", {
        "plainSummary": "微信本地数据的查询、解密与导出 CLI（wx-cli 的重启版）。",
        "introduction": "用 Rust 重写的微信本地数据工具：可以查询数据库、解密文件、把聊天记录导出到本地。作者说这是 wx-cli 之后的重新出发。",
        "whyToday": "Rust 版微信 CLI 今日实增 +9 stars，是本地数据管理话题的代表。",
        "audience": "需要备份或分析自己微信聊天数据的 Windows/macOS 用户。",
        "editorialTags": ["微信", "CLI", "Rust"],
        "recommendation": 3,
    }),
    ("zhouxiaoka/autoclip", {
        "plainSummary": "AI 驱动的视频剪辑与高光片段生成器。",
        "introduction": "从长视频里自动挑出精彩片段、生成短视频，主打“二创剪辑”场景。Python 项目，中英文双语文档，支持本地部署。",
        "whyToday": "GitHub Trending 披露今日 +250 stars，是今日 AI 视频剪辑赛道的代表。",
        "audience": "自媒体、短视频 up 主，想把长视频自动切成 highlights。",
        "editorialTags": ["视频剪辑", "AI 高光", "内容创作"],
        "recommendation": 4,
    }),
    ("stablyai/orca", {
        "plainSummary": "并行 coding agent 舰队的 IDE 环境（ADE）。",
        "introduction": "Orca 是一个专门为“成群并行运行的 coding agent”设计的 ADE，让开发者带着自己的订阅去驱动任意 coding agent；桌面、移动、远程 runtime 都支持。",
        "whyToday": "coding agent 平台化今日代表作，快照实增 +925 stars，跻身 GitHub Trending。",
        "audience": "想集中管理多家 coding agent、追求“agent 舰队”体验的开发者。",
        "editorialTags": ["Coding Agent", "IDE", "多 Agent"],
        "recommendation": 5,
    }),
    ("mvt-project/mvt", {
        "plainSummary": "移动设备取证工具，用来发现潜在的攻击痕迹。",
        "introduction": "Mobile Verification Toolkit (MVT)：帮助研究者、记者和维权人员从 iOS / Android 设备中提取取证信息，寻找间谍软件与被攻陷的证据。",
        "whyToday": "老牌取证工具再次登上 GitHub Trending，今日披露 +169 stars。",
        "audience": "安全研究员、调查记者、维权组织的技术支持。",
        "editorialTags": ["数字取证", "移动安全", "隐私"],
        "recommendation": 4,
    }),
    ("akitaonrails/ai-memory", {
        "plainSummary": "为 coding CLI Agent 打造的长期记忆与跨厂商交接方案。",
        "introduction": "帮助命令行 AI 编码助手保留跨会话的长期记忆，并在不同 agent 厂商之间做“无痛交接”。Rust 实现，可作为 CLI 层的记忆中间件。",
        "whyToday": "GitHub Trending 披露 +167 stars，coding CLI 长期记忆的代表方案。",
        "audience": "在 Claude Code / Codex / Cursor 间来回切换的 AI 编码用户。",
        "editorialTags": ["长期记忆", "Coding Agent", "Rust"],
        "recommendation": 4,
    }),
    ("jev-chat/jev-chat-jarvis", {
        "plainSummary": "装在手机上的对话副驾，只读屏、给候选回复。",
        "introduction": "在微信 / QQ / X / 飞书里帮你“读懂对方”，给出候选回复，一键填入输入框，是否发出由你决定。基于 Android 无障碍服务，不 hook、不改包，只读屏幕。",
        "whyToday": "刚上线一天 stars 就冲到 1758，是今日社交 AI 副驾赛道最抢眼的新面孔。",
        "audience": "在 IM 场景里被高强度聊天消耗、想借助 AI 提词的用户。",
        "editorialTags": ["聊天助手", "Android", "无障碍服务"],
        "recommendation": 4,
    }),
    ("volotat/mini-AGI", {
        "plainSummary": "在 8GB 显存笔记本上从零训练的持续学习模型。",
        "introduction": "作者从零开始训练一个持续学习 (continual learning) 模型，样本流式喂入、batch size 为 1，全过程只用一台 8GB 显存的笔记本。用来探索资源受限下的 AGI 雏形。",
        "whyToday": "极简 AGI 探索一天获得 +331 stars（新仓约 97 stars/day），是研究性小项目的代表。",
        "audience": "对小模型、持续学习、资源受限训练感兴趣的研究者。",
        "editorialTags": ["持续学习", "小模型", "从零训练"],
        "recommendation": 3,
    }),
    ("Rizzo-AI-Academy/rizzo-flow", {
        "plainSummary": "开源本地版 Jev：让 LLM 输出类型化决策而不生成一个 token。",
        "introduction": "以“不产生任何生成 token”的方式，从本地 LLM 抽取 Jev 兼容的类型化决策输出。适合放到延迟敏感的判定流水线里。",
        "whyToday": "刚上线一天就积累 232 stars，是今日 Jev 兼容开源实现里的新面孔。",
        "audience": "想在自家 LLM 里加一层零 token 决策接口的工程师。",
        "editorialTags": ["Jev 兼容", "类型化决策", "本地推理"],
        "recommendation": 3,
    }),
    ("jerryjliu/docjev", {
        "plainSummary": "用 Jev 做文档分类与切分的超快工具。",
        "introduction": "把 Jev 决策模型套到文档处理链路上，用来做“这段属于哪一节 / 是不是应该切开”的判定，速度对标传统文本分类器。",
        "whyToday": "LlamaIndex 作者的新实验，一天获得 203 stars，代表决策模型在 RAG 前处理的落地。",
        "audience": "在做 RAG 数据预处理、文档分块的 LLM 应用开发者。",
        "editorialTags": ["文档处理", "Jev", "RAG"],
        "recommendation": 3,
    }),
]

assert len(curated) == 30, len(curated)
urls_curated = set()
projects = []
for name, meta in curated:
    # find by repoName
    match = [c for c in cands if c['repoName'] == name]
    if not match:
        print('MISSING', name, file=sys.stderr); sys.exit(1)
    url = match[0]['url']
    if url in urls_curated:
        print('DUP', url, file=sys.stderr); sys.exit(1)
    urls_curated.add(url)
    projects.append({"githubUrl": url, **meta})

# candidateTranslations: manually crafted brief Chinese descriptions per URL.
translations_by_repo = {
    "mizorewww/laya-mlx": "让 Laya 类型化决策模型跑在 MLX 上，M3 Max 短决策 7–14 ms，无需 PyTorch 或云 API。",
    "TheoLeeCJ/SemIf": "用开源模型做“语义 if”，在家里 3090 上就能跑；独立开发，与 Jev/TypeSafe 无关。",
    "yibie/awesome-jev": "围绕 TypeSafe Jev 类型化决策模型的公共项目、集成与讨论精选清单。",
    "wuyoscar/jev-skill": "汇集 Jev 的使用案例、工作流和 agent skills。",
    "awlevin/typesafe-computer-use": "每步约 0.0002 美元的 macOS computer-use：OCR 截屏 + TypeSafe 决策 + 点击。",
    "Mak5er/AirCard": "无需越狱的 iOS 18+ Apple Wallet 卡面美化工具。",
    "mizorewww/laya-coreml": "让 Laya 决策模型本地跑在 Apple Core ML 和神经网络引擎上，M3 Max 上约 5 ms 短决策，含速度与能耗基准。",
    "TianyuCodings/NanoJev": "Jev 的“nano”复刻版：并行决策、动态候选和端到端训练管线。",
    "bespokelabsai/nimble": "本地类型化决策、对比式数据整理和模型评估的一站式工具。",
    "rmalde/minecraft-agent": "面向 Minecraft 的 Astra 规划器 + JEV 控制器，含原生录制、测试路线和运行核验。",
    "Mak5er/AirCard-iOS": "iOS 27 的 Apple Wallet 卡面皮肤与锁屏密码主题包。",
    "minorun365/minorun-marp-skill": "让 Marp 幻灯片更好看的 Skill 集：故事、图示、设计平衡，加黑底主题和检查工具（日语）。",
    "browser-use/jev-ultrafast": "号称最快、最便宜的 web agent。",
    "jarrodwatts/jev-trader": "每个 Monad 区块用 Jev 做一次交易决策，跑在 Kuru 的 MON-USDC 上。",
    "v-modal/awesome-jev-tools": "围绕 TypeSafe Jev 的工具精选列表。",
    "Heman10x-NGU/openJev-verdict-2.0": "151M 参数的非自回归决策引擎，在 typed-decisions 基准上刷分优于 Jev 和 Laya。",
    "logan-markewich/jeff": "自托管、可替换 TypeSafe Jev 的 GliFormer 版本。",
    "zhengkid/Dream-RSI": "论文 Dream-RSI（在演化世界中做递归自我提升）的官方仓库。",
    "sutro-sh/jev-align": "基于 Jev 和 GEPA，用人类反馈校准 AI Function 的 CLI。",
    "shhivv/third-hand": "基于决策模型的 computer-use 助手。",
    "HyNetworks/OpenGFW": "你的 DIY 版“Great Firewall of China”，用 Go 写。",
    "nftechie/stonkfly": "带实验性记忆的完整果蝇连接组仿真，配合 Coinbase AgentKit 做受限交易。",
    "jackwener/wx-cli-again": "微信本地数据 CLI（查询/解密/导出）——wx-cli 的重启版。",
    "zhouxiaoka/autoclip": "AI 驱动的视频剪辑与高光提取二创工具。",
    "stablyai/orca": "面向并行 coding agent 舰队的 ADE，桌面、移动、远程 runtime 都可用。",
    "mvt-project/mvt": "移动设备取证工具，用来寻找设备被入侵的痕迹。",
    "akitaonrails/ai-memory": "为 coding CLI Agent 打造的长期记忆与跨厂商交接方案。",
    "jev-chat/jev-chat-jarvis": "手机上的对话副驾：读懂对方、给出候选回复、一键填入，只读屏、不 hook。",
    "volotat/mini-AGI": "在 8GB 显存笔记本上、以 batch-1 数据流从零训练的持续学习模型。",
    "Rizzo-AI-Academy/rizzo-flow": "开源本地版 Jev：让 LLM 输出类型化决策，不生成任何 token。",
    "jerryjliu/docjev": "用 Jev 做文档分类和切分的高速工具。",
    "receptron/laya": "通过 ONNX Runtime，在 Node.js/TypeScript 中跑开源、兼容 Jev 的 Laya 决策模型。",
    "FBddcz/embodied-jev": "MuJoCo 机器人决策工作台，兼容 MiniCPM5-2B、Jev 及其他模型 API。",
    "maanHimself/OpenDLSS-NR": "NVIDIA DLSS 5 神经渲染网络的 Vulkan 重实现，与原版位对位一致。",
    "FerryCorleone/crush-monitor": "用 Jev 分析微信聊天里的情绪、意图和回复表现，本机部署 + 自带 API Key。",
    "benjiyaya/ComfyUI-Qwen-Image-2.1-Prompt-Enhancer": "ComfyUI 自定义节点：为 Qwen-Image-2.1 增强提示词，支持文生图与图编辑。",
    "shhivv/arc-cua": "面向 computer-use agent 的超快动作层。",
    "heyjunpenn/awesome-jev": "经过验证、由社区维护的 640 个 Jev 开源项目目录。",
    "yifanzhang-pro/KLPO": "论文 KLPO（面向 Agentic 强化学习的 KL 正则策略优化）项目页。",
    "isas1/skills": "解释和总结 AI 输出的 Skills：eli5-succinct、simple-summary、summary。",
    "Yinsongxu/LLM2Jev": "把本地 LLM 改造成 Jev 兼容的结构化决策引擎，通过 prefill-only 二进制推理输出 Choice/Score/Noul。",
    "ThreeDaPrint/niimbot": "Niimbot B1 打印机的解锁二进制。",
    "uehaj/jev-semgrep": "按“含义”做 grep：用 TypeSafe Jev 给每行打分，可用 AND/OR/NOT 组合语义，支持中英日互搜。",
    "caxete/crypto-tax-calculator": "支持主流钱包、交易所与区块浏览器的加密货币纳税计算方案。",
    "kloxeld/xscrape": "异步 Python 客户端，采集 X（Twitter）公开数据；含账号轮换、自适应限速、多格式导出。",
    "MSNightmare/BigDiskBuster": "Windows Defender 更新拒绝服务漏洞 PoC。",
    "amitshekhariitbhu/ai-engineer-roadmap": "AI Engineer 学习路线图，每个主题配一篇博客。",
    "ghuntley/underclass": "OpenAI 兼容的池化代理：把会话绑到单账号（保持缓存），耗尽账号自动降温，池空时快速失败。",
    "wquguru/dasheng": "“大声读”：R2T2 流式 ASR + Jev 逐词判定，做英文朗读评分。",
    "yynxxxxx/Codex-X": "OpenAI Codex 桌面端/CLI 的可视化管理工具，含 Provider 切换、会话同步、提示词注入、Skills/MCP 管理。",
    "hydra-db/open-glean": "开源 AI 知识办公平台：连接你的应用、查找答案、协作办公。",
    "haplollc/ThinkingOrbs": "SwiftUI 里为 AI/Agent 界面打造的 3D 圆点加载指示器，共 9 款设计、2 种尺寸。",
    "hirotomasato/yowes": "通过 MCP 为 13 个国家生成看起来逼真的教师文件（ID、执照、信函）。",
    "To3akaRin/mac-computer-use": "让任意大模型控制电脑，多平台可用，附 3D 建模案例与实机动图。",
    "rust-lang/crates.io-index": "crates.io 的注册索引。",
    "EddiKusS/proton-playground-warden": "2026 版 Linux 游戏训练器自动化套件，聚焦无缝 modding。",
    "WordPress/agent-skills": "为 AI 编码助手准备的专家级 WordPress 知识（blocks、themes、plugins、最佳实践）。",
    "ZhiXuanWang/cf-speed-dns": "CF 优选 IP 工具：动态获取 Cloudflare 优选 IP，配 CloudflareSpeedTest 测速。",
    "xland/DraftDepot": "DraftDepot 稿仓。",
    "iAmCorey/Wake": "把所有 AI agent 会话集中在一处：浏览、搜索、恢复；Rust + GPUI 实现。",
    "CutWire-Studios/Drift": "基于 Qt 6 与 FFmpeg 的免费开源、面向新手的桌面视频编辑器。",
    "zhiyuan1i/adblock_list": "面向中文区的广告过滤 / 隐私保护规则，快速迭代维护。",
    "0xDanielLopez/TweetFeed": "从 Twitter 汇总安全社区分享的 IoC：恶意 URL、域名、IP、SHA256/MD5。",
    "sylearn/AIUsage": "一个仪表盘管理所有 AI 订阅：额度、成本、账号、Claude Code / Codex 代理。",
    "rust-ui/ui": "Rust 版 Shadcn 风格组件库，用于构建 Web、桌面、iOS、Android 的跨平台应用。",
    "thunder-id/thunderid": "面向开发者的高性能开源身份栈，为人类、AI Agent 与机器提供可组合的身份流。",
    "palantir/javapoet": "用于生成 Java 源文件的库。",
    "MhdiTaheri/V2rayCollector": "从 Telegram 频道抓取 VLESS / VMess / Shadowsocks / Trojan 等 VPN 协议配置。",
    "iplocate/free-proxy-list": "每 30 分钟更新一次的免费 HTTP / SOCKS5 / SOCKS4 代理列表。",
    "cbusifabcap/daily_free_vpn": "分享各种免费节点、机场、订阅链接的聚合仓库。",
    "nerdai/llm-agents-from-scratch": "从零构建 LLM Agent 与多 Agent 系统，覆盖 MCP、Skills、A2A。",
    "josefbacik/systing": "基于 libbpf 的 tracer，帮助你搞清楚一个应用在做什么。",
    "iboxz/free-v2ray-collector": "多协议 V2Ray 配置收集器（Reality、VLESS、VMess、Shadowsocks、Trojan）。",
    "swapnildahiphale/OpenSRE": "以记忆为核心的自托管 AI SRE：事件调查、情景记忆、知识图谱、Web 控制台，接 Slack/Teams。",
    "sisshiki1969/monoruby": "带 JIT 编译器的另一种 Ruby 实现。",
    "AmyJeanes/TeslaMateAgile": "把 TeslaMate 的充电数据自动匹配到智能电价供应商的价格。",
    "Caplet1989/Brokies-AI-Foundry": "2026 免费 AI 开发者工具列表。",
    "juwairiyah09/spike-angular-pro-starter": "2026 版 Spike Angular Material 免费仪表盘模板。",
    "Nunes24/spotify-audio-realm": "2026 版 Spotify Premium 音质体验指南。",
    "Ney432/angular-beacon-pro": "2026 版 Angular Admin Dashboard 模板。",
    "aykutkorkut/badge-odyssey-voyage": "2026 版 Discord 徽章追踪仪表盘。",
    "disintel/VideoVault-Core": "2026 版 VideoFetch Pro：覆盖 1800+ 站点的通用视频抓取工具。",
    "GreendayBadboy/nice-angular-blaze": "2026 版 Bootstrap Angular 高级 UI Admin Dashboard。",
    "drcruz-lang/OptiGrab": "2026 版开源视频下载器，主打速度与简洁。",
    "tedydonel/Heisenberg": "面向 Laravel 的 block 内容引擎与双语博客后端：Gutenberg 风编辑器、媒体库、模板、权限、AI 写作助手。",
    "MrMarble/proxy-list": "免费 HTTPS 代理列表。",
    "thoughtbot/flightdeck": "遵循 SRE 实践、快速搭建生产级 Kubernetes 集群的 Terraform 模块。",
    "bogdanstann/printer-offline-revival-toolkit": "Canon / Epson / HP 打印机 2026 版“离线错误”修复指南。",
    "galette/galette": "开源协会成员管理系统。",
    "bgin/RF-EMT": "射频工程建模工具箱（RF-EMT）：面向雷达、通信等 RF 系统的高保真仿真框架。",
    "xiaofang142/hivemtk": "开源私域 AI 营销 SCRM：全渠道聚合、ReAct 智能体、本地 RAG 知识库、GEO 生成式引擎优化，支持 100% 私域自托管。",
    "mrbuilder1961/ChatPatches": "Minecraft 客户端 mod，聚焦聊天体验优化和可配置化。",
    "objectstack-ai/objectstack": "把数据模型、UI、工作流、权限都变成类型化元数据，让 AI 一次读完整个应用（150k tokens 内的 CRM）。",
    "RevolutionTR/keenetic-zapret2-manager": "面向 Keenetic 路由器 (OpenWrt/Entware) 的 Zapret2 高级管理器，用于绕过 DPI 限制。",
    "qianqikun/LunaTV-config": "自用 LunaTV 配置源，每日检测 API 状态，可在 CF 部署 CORSAPI 中转被墙 API。",
    "jordanhubbard/pythonos": "一个启动进 Python 的迷你操作系统。",
    "poseidon/wait-for-status-checks": "等待 GitHub check runs 完成的 GitHub Action。",
    "solovyov-jenya2004/all_subs": "在俄罗斯白名单移动网环境下使用的免费、自动更新 VPN 配置合集（俄语）。",
    "spydisec/spydithreatintel": "基于开源威胁情报、社区维护 blocklist 与公共安全研究的 Spydi ThreatIntel Feed。",
    "abusaeeidx/CricHd-playlists-Auto-Update-permanent": "自动每 15 分钟更新的 CricHD 免费体育直播 m3u8 playlist。",
    "statsig-io/statsigstatus": "Statsig 的状态页，Fork 自其开源模板。",
}

translations = []
for c in cands:
    name = c['repoName']
    if name not in translations_by_repo:
        print('MISSING TRANS', name, file=sys.stderr); sys.exit(1)
    translations.append({"githubUrl": c['url'], "chineseDescription": translations_by_repo[name]})

assert len(translations) == 101

out = {
    "summary": "今天是 Jev / Laya / TypeSafe 决策模型生态集中爆发的一天：从 MLX、Core ML 到 GliFormer 的多个开源实现同时上榜，Web、Minecraft、macOS 都出现了配套的 computer-use 与 agent 案例；同时 Apple Wallet 卡面美化、微信本地 CLI、AI 视频剪辑、coding agent 舰队 IDE 等生活与工程向项目也在快速爬升。本期一次性梳理这 30 个最值得看的项目。",
    "candidateTranslations": translations,
    "projects": projects,
}

out_path = ROOT / '.daily-pipeline/editor-output/2026-09-22.json'
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2))
print('wrote', out_path)
print('projects', len(out['projects']))
print('translations', len(out['candidateTranslations']))
