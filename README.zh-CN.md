# 🏢 AgentHub OS

**像管理员工一样,管理你的 AI Agent。**

AgentHub OS 是一个 AI Agent 管理平台,帮你把多个 AI Agent 组织成一支协同工作的团队。不用在终端和聊天窗口之间来回切换——一个面板,统一调度。

[English README](README.md)

---

## 📸 界面预览

### 主页仪表盘
![仪表盘](docs/images/dashboard.png)

### 智能工作流画布
![工作流](docs/images/workflow.png)

### 登录页
![登录](docs/images/login.png)

---

## ✨ 功能

### 🎛️ 多 Agent 面板
- 一键切换不同 Agent,每个 Agent 独立配置、独立上下文
- 内置 Controller / Research / Content / Design / Developer / Reviewer 等角色模板
- Agent 状态实时可见:空闲、工作中、等待输入

### 💬 多 Agent 对话
- 同一界面跟多个 Agent 同时交互
- 支持私聊和群聊模式
- Markdown 渲染、代码高亮、文件预览

### 📊 实时监控
- Agent 状态与任务执行时间线,回溯每一步操作
- 工作日志归档、失败恢复记录

### 🔧 Provider 统一配置
- API Key 服务端 AES 加密存储,一个地方配置所有 Provider
- 支持 OpenAI、Claude、DeepSeek 及任意 OpenAI 兼容端点
- 模型切换无需改代码

### 📝 工作流画布
- 可视化编排 Agent 协作流程
- 拖拽式添加 Agent 节点、任务节点与知识文档节点
- 并行/串行执行策略

### 🧠 Agent 智能调度
- Controller 引擎自动拆解任务并分配给最合适的 Agent
- 质量门控——输出按 5 个维度评分(PASS/WARN/FAIL),不合格触发返工
- 记忆系统按 Agent 隔离、跨会话保持上下文
- Shared Workspace 让上游产出直接供下游 Agent 使用

---

## 🔌 运行时与 Provider

| 运行时 | 状态 | 说明 |
|---|---|---|
| Hermes Agent | ✅ 已实现 | 聊天执行、图像生成、视频生成 API 路由 + 嵌入式 Python worker |
| OpenClaw | 🔧 基础适配 | 早期适配器,任务执行面较浅 |
| 通用 LLM | ✅ 已实现 | OpenAI 兼容 chat completion |
| Mock | ✅ 已实现 | 离线演示/开发 |
| Codex | 🚧 规划中 | 尚无专用适配器 |

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS + Framer Motion |
| 状态 | Zustand |
| 语言 | TypeScript |
| 3D/可视化 | Three.js + react-three-fiber |
| 安全 | Node crypto(AES 密钥加密、HMAC 会话) |

---

## 🚀 快速开始

```bash
git clone https://github.com/landiao5893-netizen/agenthub-os.git
cd agenthub-os
npm install
cp .env.example .env.local
# 编辑 .env.local 填入配置
npm run dev
```

打开 http://localhost:3099

> 注意:登录密码与 Session 密钥为必填(`AGENTHUB_PASSWORD` / `AGENTHUB_SESSION_SECRET`),不填则服务无法启动。
> `npm run build` 同样需要这两个必填变量(认证模块在构建期校验),请先按 `.env.example` 配置好 `.env.local` 再构建。

---

## ⚙️ 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `AGENTHUB_PASSWORD` | ✅ | 登录密码 |
| `AGENTHUB_SESSION_SECRET` | ✅ | Session 密钥(建议 32 位以上随机字符串) |
| `HERMES_API_TOKEN` | - | Hermes Agent API Token |
| `AGENTHUB_IMAGE_API_URL` | - | 图片生成 API 地址 |
| `AGENTHUB_IMAGE_API_TOKEN` | - | 图片生成 API Token |
| `AGENTHUB_IMAGE_MODEL` | - | 图片生成模型名 |

生产环境建议额外设置 `AGENTHUB_COOKIE_SECURE=true`(强制 Secure Cookie)。

---

## 📁 项目结构

```
src/
├── app/              # Next.js App Router(页面 + API 路由)
│   ├── api/          # 认证 / providers / hermes / llm / intelligence 等
│   ├── chat/         # 对话页
│   └── ...
├── components/       # React 组件
│   ├── agents/       # Agent 管理面板
│   ├── chat/         # 聊天组件
│   ├── workflow/     # 工作流画布
│   ├── monitor/      # 监控面板
│   ├── controller/   # Controller 工作日志
│   ├── supervisor/   # 质量监督视图
│   └── runtime/      # 运行时面板与执行时间线
├── controller/       # 任务拆解 + 多 Agent 并行编排
├── supervisor/       # 质量门控 + 失败恢复
├── runtime-engine/   # 统一执行入口与运行时适配器
├── adapters/         # Provider/运行时适配器注册
├── intelligence/     # 智能编排层(Hermes Intelligence)
├── memory/           # 记忆系统(按 Agent 隔离)
├── workspace/        # 共享工作区与产物下载
├── knowledge/        # 知识库与文档解析
├── constitution/     # Agent 行为准则
├── stores/           # Zustand 状态管理
└── lib/              # 通用逻辑与服务端配置
```

---

## 📄 License

[MIT](LICENSE)

---

> Built with ❤️ by [landiao5893-netizen](https://github.com/landiao5893-netizen)