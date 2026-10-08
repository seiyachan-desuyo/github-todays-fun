#!/usr/bin/env python3
"""为 2026-09-24 第 015 期重新生成中文化的 editor 输出。

修复：plainSummary/introduction 必须是纯中文；不得照搬英文 description，
也不得只做英文截断拼中文数字。
"""
import json
import pathlib
import re

DATE = "2026-09-24"
ROOT = pathlib.Path(__file__).resolve().parent.parent
TASK = ROOT / "src/data/editor-tasks" / f"{DATE}.json"
OUT_DIR = ROOT / ".daily-pipeline/editor-output"
OUT = OUT_DIR / f"{DATE}.json"

# ---- 30 精选项目的手写中文编辑内容 ----
FEATURED = {
    "NandhaKishorM/laya": {
        "plainSummary": "laya —— 一次前向就能给出「打分/是否/分类」的非自回归决策模型。",
        "introduction": "laya 是一个非自回归的 System 1 决策引擎，只跑一次前向就能对任意文本给出「有类型」的选择、评分或是非判断，支持 100 多种语言。项目自带一个路由器，会为每次请求挑选最合适的检查点，适合在流水线里替代反复 prompt 大模型做分类的场景。",
        "whyToday": "今日实增约 +3632 星，Jev 生态最热门的落地实现，值得看看它的类型化决策思路。",
        "audience": "关注 LLM 工程与决策模型落地的算法与后端工程师。",
        "editorialTags": ["AI 工具", "开发工具"],
        "recommendation": 5,
    },
    "nokia-applied-research/AnyJev": {
        "plainSummary": "AnyJev —— 让任意 LLM 变成 Jev 式决策模型，无需训练。",
        "introduction": "AnyJev 把已有的通用 LLM 包装成 Jev 风格的决策模型：只做推理即可给出有类型的判断和真实概率，不需要额外训练。项目定位是一个可插拔适配层，可以在 vLLM 等推理后端上直接跑。",
        "whyToday": "近日 +290 星迅速起量，Nokia 官方实验室出品，值得关注决策模型的通用化路径。",
        "audience": "想把现有 LLM 用于结构化判断的算法与推理平台开发者。",
        "editorialTags": ["AI 工具", "开发工具"],
        "recommendation": 4,
    },
    "OnlistTeam/ai-manager": {
        "plainSummary": "AI Manager —— 用 Rust 写的 AI 编码工具桌面管家。",
        "introduction": "AI Manager 是一个桌面客户端，集中管理各种 AI 编码工具（如 Claude Code、Codex 类 CLI 等）的配置、账号和会话。用 Rust 编写，追求轻量与跨平台，适合同时挂多种 AI Coding 工具的开发者。",
        "whyToday": "近日 +65 星，Rust 桌面工具集中爆发的一员，值得看看它如何组织多 AI 工具工作流。",
        "audience": "在多种 AI 编码工具间来回切换的开发者。",
        "editorialTags": ["开发工具", "效率"],
        "recommendation": 3,
    },
    "rgem227/knoweldge-base": {
        "plainSummary": "knoweldge-base —— 个人/团队知识库，天然支持 MCP 调用。",
        "introduction": "这是一个面向个人或小团队的知识库项目，除了常规的知识管理外，把 MCP API 作为一等公民对外暴露，方便 Claude、Codex 等 Agent 直接检索和写入。适合想把自己的资料库接到 AI 工作流里的用户。",
        "whyToday": "近日 +303 星快速起量，MCP + 知识库组合方向的新面孔。",
        "audience": "希望把知识库接入 AI Agent 工作流的开发者与知识工作者。",
        "editorialTags": ["AI 工具", "开发工具"],
        "recommendation": 4,
    },
    "lhlGitHub/threejs-architecture-effects": {
        "plainSummary": "threejs-architecture-effects —— 用 Three.js 现场搭建、可交互的 3D 建筑 Agent Skill。",
        "introduction": "项目是一个 Agent Skill，让 AI 通过 Three.js 在网页上「自组装」出可交互的 3D 建筑：可以边搭边动，支持动态建造与调整。作者同时提供了中文说明，方便国内开发者接入自己的 Agent 场景。",
        "whyToday": "近日 +67 星，把 Three.js 与 Agent Skill 组合的少见案例，可视化效果亮眼。",
        "audience": "对 Web 3D、Agent Skill、可视化演示感兴趣的前端与创意开发者。",
        "editorialTags": ["设计", "开发工具"],
        "recommendation": 4,
    },
    "TianyuCodings/JevHarness": {
        "plainSummary": "JevHarness —— 用 LLM 自己写 Jev 决策任务的 harness 框架。",
        "introduction": "JevHarness 让 LLM 为具体任务自动生成专用的 Jev 决策 harness，可选启用「全轨迹奖励反思」和 GEPA 演化机制持续迭代。适合把决策模型嵌入到自动化 Agent 流水线的实验场景。",
        "whyToday": "近日 +38 星，围绕 laya/Jev 生态的又一个训练与调度工具，值得关注。",
        "audience": "研究决策模型训练、Agent 自我改进机制的研究者。",
        "editorialTags": ["AI 工具", "开发工具"],
        "recommendation": 3,
    },
    "FluidInference/FluidUse": {
        "plainSummary": "FluidUse —— 在 Apple Silicon 上本地跑的 Computer Use 方案。",
        "introduction": "FluidUse 在 macOS 上通过 Accessibility API 驱动本机操作，用 laya 做类型化决策，再用 CUA-S1-FORMS 完成表单填写，全程在 Apple Silicon 上本地推理。适合关注隐私、追求端上 AI 自动化的 Mac 用户。",
        "whyToday": "近日 +13 星，端上 Computer Use 的稀缺开源实现，Swift + Neural Engine 组合。",
        "audience": "关注端侧 AI、macOS 自动化的开发者与效率党。",
        "editorialTags": ["AI 工具", "效率"],
        "recommendation": 4,
    },
    "Futureppo/typesafe_register": {
        "plainSummary": "typesafe_register —— 面向 typesafe.ai 的极致优化注册工具。",
        "introduction": "项目定位是 typesafe.ai 的注册辅助工具，作者宣称做了大量性能优化，并支持「无限 jev」使用。项目描述比较简短，功能偏工具类，具体行为需结合仓库进一步查看。",
        "whyToday": "近日 +6 星，围绕 Jev/typesafe.ai 生态的又一个第三方工具。",
        "audience": "使用 typesafe.ai / Jev 相关服务的重度用户。",
        "editorialTags": ["开发工具"],
        "recommendation": 2,
    },
    "pbakaus/impeccable": {
        "plainSummary": "impeccable —— 让 AI harness 变得更懂设计的设计语言。",
        "introduction": "impeccable 定位为一套「设计语言」，目标是把设计规范、组件与交互模式喂给 AI harness，让 AI 产出的界面更符合审美与体验规范。适合想把 AI 编码与 UI/UX 规范打通的团队。",
        "whyToday": "当前 7 万+ 星、近日 +304 星，头部项目继续发酵，设计与 AI 的结合点值得关注。",
        "audience": "关心 AI 生成 UI 质量的设计师与前端工程师。",
        "editorialTags": ["设计", "AI 工具"],
        "recommendation": 5,
    },
    "DeusData/codebase-memory-mcp": {
        "plainSummary": "codebase-memory-mcp —— 把代码库索引成持久知识图的高性能 MCP 服务器。",
        "introduction": "这是一个用 C 写的高性能 MCP 服务器，能把整个代码库索引成常驻知识图，平均一个仓库毫秒级完成索引，支持 158 种语言、亚毫秒级查询，作者称能把 Agent 使用的 token 降低 99%。单静态二进制部署，非常适合大仓 AI 编码场景。",
        "whyToday": "当前 4.4 万+ 星、近日 +190 星，MCP 生态里少见的性能怪物，值得 CodeAgent 玩家收藏。",
        "audience": "在大型代码库上跑 AI Coding 的工程师与平台团队。",
        "editorialTags": ["开发工具", "AI 工具"],
        "recommendation": 5,
    },
    "davila7/claude-code-templates": {
        "plainSummary": "claude-code-templates —— 一键配置和监控 Claude Code 的 CLI 工具。",
        "introduction": "项目提供一套 CLI，用于快速初始化、配置和监控 Claude Code 的工作环境：模板管理、状态观察、常用命令封装。适合刚上手 Claude Code、想少踩坑的开发者。",
        "whyToday": "当前 3.1 万+ 星、近日 +386 星，Claude Code 生态最活跃的配套工具之一。",
        "audience": "使用 Claude Code 的开发者与团队管理员。",
        "editorialTags": ["开发工具", "效率"],
        "recommendation": 5,
    },
    "TheoLeeCJ/SemIf-OpenJev": {
        "plainSummary": "SemIf-OpenJev —— 用开源模型在家用 3090 上跑「语义 if」的实现。",
        "introduction": "SemIf-OpenJev 用开源模型复刻「语义 if」的效果——即用自然语言写条件判断的能力，声称在家用的 3090 上就能跑起来。项目独立开发，与 Jev / typesafe.ai 官方无关联，适合想在本地验证类似能力的研究者。",
        "whyToday": "当前 4127 星，Jev 生态的开源平替方向，端侧可跑是最大亮点。",
        "audience": "关注端侧 LLM 决策、语义控制流的研究者与开发者。",
        "editorialTags": ["AI 工具", "开源替代"],
        "recommendation": 4,
    },
    "shilapi/xcertplay": {
        "plainSummary": "xcertplay —— 让 Android 车机通过 MFi 芯片或 CH341 跑 CarPlay。",
        "introduction": "xcertplay 是一个安卓车机上使用 CarPlay 的开源方案：通过板载的 MFi 芯片或者 CH341 转接，让原本只属于 iOS 的 CarPlay 在 Android Head Unit 上跑起来。硬核折腾向，适合喜欢改车机的玩家。",
        "whyToday": "当前 798 星，改装车机圈子里少见的 CarPlay 开源实现。",
        "audience": "喜欢折腾车机、改装 Android Head Unit 的极客。",
        "editorialTags": ["有趣", "开发工具"],
        "recommendation": 3,
    },
    "driceroland/Search": {
        "plainSummary": "Search —— 一个小巧快速的 macOS WebKit 浏览器。",
        "introduction": "Search 是 Office Commun 出品的 macOS 浏览器，基于系统 WebKit 打造，追求「小而快」，启动秒开、界面极简。适合当作辅助浏览器或专门用来读文档的备用浏览器。",
        "whyToday": "当前 793 星，macOS 上又一个走极简路线的浏览器新面孔。",
        "audience": "喜欢极简效率工具的 Mac 用户。",
        "editorialTags": ["效率", "开发工具"],
        "recommendation": 3,
    },
    "heyjunpenn/awesome-jev": {
        "plainSummary": "awesome-jev —— 收录了 896 个基于 Jev 的开源项目的精选目录。",
        "introduction": "这是一份社区维护的 Jev 生态开源项目清单，目前收录了 896 个已经过验证的项目，按用途分类整理，用 Astro 构建站点。适合想快速了解 Jev 生态版图、寻找可复用轮子的开发者入口。",
        "whyToday": "当前 782 星，Jev 生态本周继续霸屏，配套 awesome 列表值得收藏。",
        "audience": "想快速盘点 Jev 生态、找现成项目的开发者。",
        "editorialTags": ["学习", "开发工具"],
        "recommendation": 4,
    },
    "SewCabinSpout/cleanupper": {
        "plainSummary": "cleanupper —— 免费开源的 macOS 磁盘清理 CLI。",
        "introduction": "cleanupper 是一个跑在终端里的 macOS 磁盘清理工具，会扫描并安全清理各类缓存、日志、Xcode DerivedData，以及 npm/Homebrew/pip 遗留物和陈旧的 node_modules，默认走废纸篓、零遥测。定位是 CleanMyMac 的开源替代。",
        "whyToday": "当前 724 星，macOS 用户常年痛点方向，开源无追踪版本很有吸引力。",
        "audience": "苦于 Mac 硬盘告急的开发者。",
        "editorialTags": ["效率", "开源替代"],
        "recommendation": 4,
    },
    "anishfn/shapeshift": {
        "plainSummary": "shapeshift —— 一个会「变形」成合适 UI 的智能输入框。",
        "introduction": "shapeshift 是一个「你要什么它就变什么」的输入框：一个文本框会根据你输入的内容，实时变形成对应的 UI 控件（日期、下拉、地址等），底层由 TypeSafe Jev 驱动，可离线运行。适合想减少表单复杂度的产品。",
        "whyToday": "当前 466 星，AI 化输入框的新玩法，交互思路很有想象空间。",
        "audience": "关注 AI 原生交互、极简表单的前端与产品设计师。",
        "editorialTags": ["AI 工具", "设计"],
        "recommendation": 4,
    },
    "JohnHeibel/PDoomVideo": {
        "plainSummary": "PDoomVideo —— Claude Opus 5.5 音乐 MV「I'm Upping My P(doom)」的源码。",
        "introduction": "这是一个音乐 MV 项目的源码：为一首名为「I'm Upping My P(doom)」的 AI 主题歌曲制作的 Claude Opus 5.5 视觉动画，全部代码开源。适合想看 AI 生成音乐 MV 是怎么工程化落地的创作者。",
        "whyToday": "当前 429 星，AI 音乐视频的完整源码开源，创意与技术兼具。",
        "audience": "对 AI 创意、生成式音乐/视频感兴趣的创作者与前端开发者。",
        "editorialTags": ["有趣", "设计"],
        "recommendation": 3,
    },
    "Alex314618-create/JevRev": {
        "plainSummary": "JevRev —— 把 LLM 与 Jev 拼在一起的推理工作流。",
        "introduction": "JevRev 是一个把 LLM 和 Jev 决策模型串起来的工作流库，用作者的话说是「给你的脊椎骨（LLM）里再装一根脊柱（Jev）」——让大模型在需要结构化判断的地方稳定输出。TypeScript 实现，容易集成到 Web 后端。",
        "whyToday": "当前 283 星，Jev 生态又一款上手门槛较低的工作流工具。",
        "audience": "在 Web 后端里做 LLM + 结构化判断的 TypeScript 开发者。",
        "editorialTags": ["AI 工具", "开发工具"],
        "recommendation": 3,
    },
    "yetone/magpie": {
        "plainSummary": "magpie —— 从菜单栏一次切换所有 Agent 模型的桌面工具。",
        "introduction": "magpie 由 yetone 出品，把「每个 Agent 用哪家模型」这件事收进 macOS 菜单栏：可以让 Codex 走 DeepSeek、Claude Code 走 Kimi 等自由组合，一键切换。用 Go 写成，适合同时对接多家模型的重度玩家。",
        "whyToday": "当前 272 星，中国 AI Coding 圈里作者活跃度极高，工具向立即上手。",
        "audience": "同时使用 Codex/Claude Code/Gemini CLI 的 AI Coding 玩家。",
        "editorialTags": ["AI 工具", "效率"],
        "recommendation": 4,
    },
    "samyost1/3dicon": {
        "plainSummary": "3dicon —— 一句 prompt 生成会循环转的透明 3D 图标。",
        "introduction": "3dicon 是一个 Claude Code Skill：输入一段文字描述，就产出带真实透明背景的循环动画 3D 图标，可直接用作 UI 或站点素材。适合想快速做出精致视觉小物的设计师和产品。",
        "whyToday": "当前 230 星，AIGC 与 3D 图标结合的轻量神作，非常适合尝鲜。",
        "audience": "追求快速产出精致 3D 素材的设计师与产品经理。",
        "editorialTags": ["设计", "有趣"],
        "recommendation": 4,
    },
    "852wa/JIZURA": {
        "plainSummary": "JIZURA —— 输入歌词就能自动排出文字 PV 的浏览器应用。",
        "introduction": "JIZURA 是一个纯浏览器端应用，粘贴歌词后会自动把歌词组合、动画化成一支「文字 PV」（Kinetic Typography 风格），不用装任何软件。作者原描述是日文，属于典型的日系 Web 玩具应用。",
        "whyToday": "当前 227 星，纯前端搞的创意小工具，玩起来上手很快。",
        "audience": "喜欢做 MV/歌词动画的 up 主与前端玩家。",
        "editorialTags": ["有趣", "设计"],
        "recommendation": 3,
    },
    "BricklayerSurmount/DockForge": {
        "plainSummary": "DockForge —— 灵活的桌面应用 Dock 与面板布局系统。",
        "introduction": "DockForge 是一个 Rust 写的桌面 UI 库，专注于处理复杂的 Dock、面板拖拽、分屏布局场景。想做 IDE 类、工作台类桌面应用又不想自己撸布局引擎的开发者可以直接拿来用。",
        "whyToday": "当前 223 星，Rust 桌面生态本轮爆发的一员，聚焦布局这块痛点。",
        "audience": "用 Rust 做桌面工具、IDE 类应用的开发者。",
        "editorialTags": ["开发工具", "效率"],
        "recommendation": 3,
    },
    "BridgeDruidCompress/TauriKit": {
        "plainSummary": "TauriKit —— 面向 Rust 桌面应用的现代 UI 组件库。",
        "introduction": "TauriKit 是给 Tauri 桌面应用准备的一套现代 UI 组件库，跨平台、组件齐全，帮开发者用 Rust 快速拼出一套体面的桌面界面。定位类似前端里的 Ant Design、Element Plus。",
        "whyToday": "当前 223 星，Tauri 生态里少见的完整组件库，值得收藏。",
        "audience": "在 Tauri 上写桌面应用的 Rust/前端开发者。",
        "editorialTags": ["开发工具", "设计"],
        "recommendation": 3,
    },
    "BufferHerald/WarpLite": {
        "plainSummary": "WarpLite —— 用 GPU 加速的快速终端与 Shell 体验。",
        "introduction": "WarpLite 是一款 GPU 加速的跨平台终端，追求丝滑滚动、快速渲染和现代化的 shell 交互体验，Rust 编写。可以看作对 Warp、Ghostty 等新一代终端的开源替代尝试。",
        "whyToday": "当前 223 星，终端赛道竞争依旧激烈，GPU 加速方向持续有新玩家。",
        "audience": "在终端里泡一天、想要更好体验的开发者。",
        "editorialTags": ["开发工具", "效率"],
        "recommendation": 3,
    },
    "AutocratGirder/ClashDesk": {
        "plainSummary": "ClashDesk —— 现代跨平台的 Clash 代理桌面客户端。",
        "introduction": "ClashDesk 是一款用 Rust + Tauri 构建的跨平台桌面客户端，主打 Clash 代理工作流。可视化规则、订阅管理、流量监控等常用能力齐全，覆盖 Windows/macOS/Linux。",
        "whyToday": "当前 223 星，Clash 系客户端里 UI 走现代化路线的新面孔。",
        "audience": "使用 Clash 类代理工具、追求好看好用 GUI 的用户。",
        "editorialTags": ["效率", "开发工具"],
        "recommendation": 3,
    },
    "BinaryDeliverer/CodexDesk": {
        "plainSummary": "CodexDesk —— 面向 AI 编码 Agent 和 Codex 工作流的桌面伴侣。",
        "introduction": "CodexDesk 是给 AI 编码 Agent（如 Codex 系工具）用的桌面伴侣。任务面板、会话切换、代理管理、常用工具集成打包在一个 Rust + Tauri 客户端里，方便重度 AI Coding 用户操作。",
        "whyToday": "当前 222 星，围绕 Codex 生态又一款「桌面壳子」，可以对比 magpie 一起看。",
        "audience": "重度使用 Codex/AI Coding Agent 的开发者。",
        "editorialTags": ["AI 工具", "开发工具"],
        "recommendation": 3,
    },
    "centralcashierboost/ZedLite": {
        "plainSummary": "ZedLite —— 用 Rust 写的轻量高性能代码编辑器。",
        "introduction": "ZedLite 定位在 Zed 之后再走「更轻」的路线：仍用 Rust + GPUI 架构，砍掉部分复杂特性，主打启动秒开、渲染流畅，跨平台运行。适合想在小机器上跑一个性能优先的编辑器的用户。",
        "whyToday": "当前 222 星，Rust 编辑器赛道又一名新选手，可与 Zed / Helix 对比。",
        "audience": "喜欢轻量、极速编辑器的开发者。",
        "editorialTags": ["开发工具", "效率"],
        "recommendation": 3,
    },
    "CassowaryDevelop/HelixEdit": {
        "plainSummary": "HelixEdit —— 用 Rust 写、支持 LSP 的 Modal 代码编辑器。",
        "introduction": "HelixEdit 是一个模仿 Helix 风格的模态编辑器：内置 LSP 支持，跨平台，键盘为中心、开箱即用。适合喜欢 Vim/Helix 风格又不想自己配一大堆插件的开发者。",
        "whyToday": "当前 221 星，Helix 风格模态编辑器的又一次尝试，LSP 开箱即用是加分项。",
        "audience": "偏好 Modal Editing 风格的开发者。",
        "editorialTags": ["开发工具", "效率"],
        "recommendation": 3,
    },
    "Behemothlyaoscillate/RustDeskPro": {
        "plainSummary": "RustDeskPro —— 面向团队的自托管远程桌面客户端。",
        "introduction": "RustDeskPro 在 RustDesk 思路的基础上做团队向增强：自托管服务端、账号权限、跨平台客户端，用 Rust 打造，追求性能与安全。适合想在公司内网自己搭一套远程桌面平台的团队。",
        "whyToday": "当前 221 星，自托管远程桌面这条赛道继续有新玩家。",
        "audience": "需要自建远程办公/运维远程桌面方案的技术团队。",
        "editorialTags": ["开发工具", "开源替代"],
        "recommendation": 3,
    },
}


def _flatten(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def _clip(s: str, n: int) -> str:
    s = _flatten(s)
    return s if len(s) <= n else s[: n - 1] + "…"


# ---- 简易的中文候选描述模板（用于全部 93 个候选池的 chineseDescription） ----
# 规则：必须是中文，短句，说清楚项目是什么；不得整段照搬英文。
LANG_ZH = {
    "Python": "Python",
    "TypeScript": "TypeScript",
    "JavaScript": "JavaScript",
    "Rust": "Rust",
    "Go": "Go",
    "Swift": "Swift",
    "Kotlin": "Kotlin",
    "Java": "Java",
    "C": "C",
    "C++": "C++",
    "C#": "C#",
    "PHP": "PHP",
    "HTML": "HTML",
    "Markdown": "Markdown",
    "Shell": "Shell",
    "Assembly": "汇编",
    "Nushell": "Nushell",
    "Solidity": "Solidity",
    "Tcl": "Tcl",
    "Groovy": "Groovy",
    "Astro": "Astro",
    "Batchfile": "Batch 脚本",
}

# 关键词 → 中文短描述片段（用于兜底翻译候选池 chineseDescription）
KEYWORDS = [
    (r"self[- ]?host", "支持自托管部署"),
    (r"docker[- ]?compose", "面向 Docker Compose"),
    (r"mcp\b", "提供 MCP 服务"),
    (r"cli\b", "命令行工具"),
    (r"desktop", "桌面客户端"),
    (r"editor", "代码编辑器"),
    (r"terminal|shell", "终端 / Shell 工具"),
    (r"proxy", "代理工具"),
    (r"vpn", "VPN 相关"),
    (r"trading|market", "行情 / 交易辅助"),
    (r"knowledge base|knowledge-base", "知识库"),
    (r"llm|agent|codex|claude", "面向 LLM / Agent"),
    (r"3d|three\.js|webgl", "3D / WebGL 可视化"),
    (r"design", "设计相关"),
    (r"data ?stream|analytics", "数据流处理 / 分析"),
    (r"course|learn|awesome|list", "学习资料 / 精选清单"),
    (r"minecraft", "Minecraft 模组 / 工具"),
    (r"wallet|crypto", "加密钱包 / 区块链"),
    (r"emulator", "模拟器"),
    (r"lsp", "LSP 服务"),
    (r"cms\b", "内容管理系统"),
    (r"image", "图片工具"),
    (r"ckan|open data", "开放数据"),
    (r"kuber|k8s|kube", "Kubernetes 相关"),
    (r"vercel|serverless", "Serverless / Vercel 相关"),
    (r"job", "招聘信息汇总"),
    (r"neural|pytorch|deep learning", "深度学习框架 / 素材"),
    (r"spec", "规范 / 规格驱动"),
    (r"chat", "AI 对话应用"),
]


def _auto_zh(desc: str, lang: str) -> str:
    d = _flatten(desc or "")
    if not d:
        return f"{LANG_ZH.get(lang, lang or '语言未知')} 开源项目，暂无详细描述。"
    # 若已经有中文，直接采用（截断即可）
    if re.search(r"[\u4e00-\u9fff]", d):
        return _clip(d, 158)
    # 命中关键词拼中文
    hits = []
    dl = d.lower()
    for pat, zh in KEYWORDS:
        if re.search(pat, dl):
            hits.append(zh)
        if len(hits) >= 3:
            break
    lang_zh = LANG_ZH.get(lang, lang or "多语言")
    if hits:
        return _clip(f"{'，'.join(hits)}的 {lang_zh} 开源项目。", 158)
    return _clip(f"{lang_zh} 编写的开源项目，主要能力见仓库说明。", 158)


# 对具体候选项做人工中文翻译（针对被展示概率高的英文项目）
MANUAL_ZH = {
    "AvenueSnowStep/ClaudePanel": "面向 Claude 与 AI 助手的桌面面板与工具箱。",
    "edison-land/paragravity": "为 Google Antigravity 打造的原生、非侵入式多账号并行沙盒管理器。",
    "sevenevesai/riso-windowseat": "在单个 HTML 里生成程序化的丝网印刷风格短片，附带 Claude Code Skills 与教程。",
    "Aureliengmz/clearwater": "用一份 HTML 实现的实时真实感浅水渲染，纯 WebGL2、零依赖、无需构建。",
    "saragordic/rooms": "把 Mac 上每个项目当作一间「房间」，用快捷键在项目之间快速切换窗口布局。",
    "strands-agents/harness-sdk": "生产级 AI Agent 的开源 SDK，端到端可控，支持任意模型和云。",
    "TNT-Likely/PanWatch": "自托管的 AI 盯盘助手，接入 TradingAgents 多 Agent 决策，覆盖 A 股 / 港美股实时行情与推送。",
    "riba2534/claude-opus-5-5-demo": "Claude Opus 5.5 的演示示例合集。",
    "zeldaboyzlix/corz-client": "面向 Minecraft 1.21.11 的客户端，主打建造工具、蓝图与 DonutSMP 相关辅助。",
    "Shelpid/SETS": "会自我迭代改进的自动交易机器。",
    "amitshekhariitbhu/ai-engineering-course": "从机器学习、神经网络到 Transformer 的免费完整 AI 工程系列课程。",
    "harry7557558/spirula-studio": "跨厂商的 3D 高斯泼溅训练器，支持 Vulkan / CUDA，视频到 splat 再到 mesh 全流程。",
    "Liyucheng1997/332_lab-jev-chat": "Windows 版微信聊天意图判断助手，接入 DeepSeek 生成回复建议。",
    "HKUDS/CLI-Anything": "把所有软件都变成 Agent 原生的 CLI-Anything 项目，附带 CLI-Hub 平台。",
    "secwind7/polytech-tree": "用 Three.js 呈现人类科技树的交互式 3D 塔状地图，涵盖从石器时代到 2024 的技术演进。",
    "Cleverfuxaqo1668/Polymarket-Telegram-Bot": "Polymarket 预测市场的 Telegram 机器人。",
    "MIgHTy-alIeN/ai-trader-bot": "一套连接自动化脚本的智能合约套利机器人。",
    "solovyov-jenya2004/all_subs": "针对俄罗斯白名单场景的免费自动更新 VPN 订阅配置合集。",
    "vllm-project/vllm-ascend": "社区维护的 vLLM 华为昇腾硬件插件。",
    "archlinuxcn/repo": "Arch Linux 中文社区维护的软件源仓库。",
    "zapplyjobs/New-Grad-Jobs-2027": "面向 2027 届应届生的综合技术与商业岗位清单。",
    "tomasz-tomczyk/crit": "帮助你与 AI Agent 建立高效反馈闭环的工具。",
    "gotempsh/temps": "AI 原生的开源替代方案，整合部署、监控、日志、通知、Sandbox 等能力。",
    "rust-lang/crates.io-index": "Rust crates.io 官方索引仓库。",
    "vaadin/platform": "基于 Vaadin Web 组件的 Java Web 开发平台。",
    "getopenpost/openpost": "开源的社交内容创作、排期与追踪平台，支持自托管。",
    "zyycn/codex-proxy-rs": "基于 Rust 的低风控自托管 Codex 多账号透明代理网关。",
    "adavak/Win_ISO_Patching_Scripts": "Windows ISO 修补脚本集合。",
    "ROCm/rocm-systems": "AMD ROCm 系统项目的聚合仓库。",
    "marianfoo/sap-ai-mcp-servers": "面向 SAP 场景的 MCP 服务器与 AI Skills 清单。",
    "Studio-Saelix/sencho": "自托管的 Docker Compose 管理平台，支持单机或多机 Compose 工作流。",
    "zapplyjobs/awesome-ml-internships-2027": "面向学生的 AI/ML 实习信息汇总，接入 Zapply 招聘管道自动更新。",
    "ROCm/rocm-libraries": "AMD ROCm 库项目的聚合仓库。",
    "gemwalletcom/wallet": "Gem Wallet：开源的 iOS 与 Android 加密钱包。",
    "SymmetricDevs/Supersymmetry": "Supersymmetry Minecraft 模组合集仓库。",
    "henjicc/Henji-AI": "痕迹 AI：一站式接入多家供应商，生成图片、视频与音频。",
    "gotgenes/pi-packages": "gotgenes 出品的 pi 系列包 Monorepo。",
    "cshaxu/nxvm": "内建调试器的完整 x86 PC 模拟器。",
    "ranxianglei/billion-context-pi": "10 万 token 就够用的稳定主动上下文压缩方案。",
    "Hessesian/kmp-lsp": "用 Rust 写的 Kotlin / Java 快速低内存 LSP 服务器。",
    "baserproject/basercms": "baserCMS：面向网站开发的 CMS 项目。",
    "orbi-build/orbi": "自托管的自主编码 Agent，给 GitHub Issue 打标签即可完成 PR、评审与发布。",
    "CharlesPikachu/imagedl": "轻量级多源图片搜索下载工具，覆盖谷歌 / 百度 / 必应 / NASA 等站点。",
    "dpangestuw/Free-Proxy": "每 5 分钟更新一次的免费代理列表。",
    "adaptive-machine-learning/CapyMOA": "面向数据流的 Python 高效机器学习工具箱，含分类与评估器。",
    "DevinoSolutions/caramel": "开源、隐私优先的优惠券工具，定位为 Honey 的替代品。",
    "SoliSpirit/proxy-list": "每 3 小时自动更新的多国 HTTP/HTTPS/SOCKS 代理清单。",
    "shepherdjerred/monorepo": "shepherdjerred 个人项目的 Monorepo。",
    "zapplyjobs/New-Grad-Data-Science-Jobs-2027": "2027 应届数据科学 / 机器学习岗位清单。",
    "stac-utils/stac-fastapi-elasticsearch-opensearch": "为 stac-fastapi 提供 Elasticsearch / OpenSearch 后端支持。",
    "likehao19/InkNote": "本地优先、所见即所得的跨平台 Markdown 编辑器，基于 Tauri 2 与 React。",
    "r3dbars/transcripted": "把 Mac 上的会议和口述录制成 Markdown，方便 Claude / Codex 检索。",
    "zapplyjobs/New-Grad-Software-Engineering-Jobs-2027": "2027 应届软件工程师岗位清单，覆盖美国头部公司与创业公司。",
    "gke-labs/kube-agents": "面向 Kubernetes 的自主 Agent Harness：巡检、GitOps 修复与 ChatOps 一体化。",
    "zapplyjobs/New-Grad-Hardware-Engineering-Jobs-2027": "2027 应届硬件 / 嵌入式 / 机器人工程师岗位清单。",
    "Particular/ServiceControl": "ServicePulse 的后端服务组件。",
    "ondata/ckan-mcp-server": "面向 CKAN 开放数据门户的 MCP 服务器，支持包搜索与 DataStore SQL。",
    "daxiaamu/oplusmutools": "一加手机的全能工具箱，作者「大侠阿木」。",
    "cyberia-to/cyber": "自称「蓝色超级智能」的开源实验项目。",
    "CaesiumY/ko-design-md": "把韩国品牌的设计语言整理成带出处的 DESIGN.md 单页开源目录。",
    "pytorch/pytorch": "PyTorch：支持 GPU 加速的 Python 张量与动态神经网络框架。",
    "Fission-AI/OpenSpec": "面向 AI 编码助手的规格驱动开发（SDD）方案。",
    "LibreChat-AI/LibreChat": "增强版 ChatGPT 克隆，支持 Agents、MCP、多家模型与 Skills。",
}


def main() -> None:
    task = json.loads(TASK.read_text())
    candidates = task["candidates"]
    selected = candidates[:30]
    projects = []
    for c in selected:
        name = c["repoName"]
        f = FEATURED.get(name)
        if not f:
            raise SystemExit(f"missing hand-written Chinese entry for {name}")
        projects.append({
            "githubUrl": c["url"],
            "plainSummary": f["plainSummary"],
            "introduction": f["introduction"],
            "whyToday": f["whyToday"],
            "audience": f["audience"],
            "editorialTags": f["editorialTags"],
            "recommendation": f["recommendation"],
        })
    translations = []
    for c in candidates:
        name = c["repoName"]
        desc = c.get("description") or ""
        lang = c.get("language") or ""
        # 若在精选池且已有 introduction，用 introduction 首句作为翻译更贴切
        if name in FEATURED:
            zh = _clip(FEATURED[name]["introduction"].split("。")[0] + "。", 158)
        elif name in MANUAL_ZH:
            zh = _clip(MANUAL_ZH[name], 158)
        else:
            zh = _auto_zh(desc, lang)
        translations.append({
            "githubUrl": c["url"],
            "chineseDescription": zh,
        })
    summary = "今日 30 精选：laya/Jev 决策模型持续霸屏，AnyJev、JevHarness、SemIf-OpenJev 同期跟进；Rust 桌面工具（编辑器 / 终端 / Dock / Clash 客户端）集中爆发；AI 编码 Agent 生态继续加码。"
    summary = _clip(summary, 178)
    out = {
        "summary": summary,
        "projects": projects,
        "candidateTranslations": translations,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print("wrote", OUT, "projects=", len(projects), "translations=", len(translations))


if __name__ == "__main__":
    main()
