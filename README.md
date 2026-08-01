# AgentHub OS

AI Agent 管理平台 — 像管理员工一样管理你的 AI Agent。

## 功能

- 🎛️ **多 Agent 面板** — 切换不同 Agent，实时查看状态和输出
- 📊 **实时状态监控** — 任务执行、Agent 心跳、工作日志
- 🔧 **Provider 配置** — 统一管理 API Key 和模型配置
- 📝 **工作流画布** — 可视化编排 Agent 协作流程
- 💬 **多 Agent 对话** — 同一界面跟多个 Agent 同时交互

## 技术栈

Next.js 14 + Tailwind CSS + Zustand + TypeScript

## 快速开始

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的配置

# 启动开发服务器
npm run dev
```

打开 http://localhost:3099

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `HERMES_API_TOKEN` | 否 | Hermes Agent API token |
| `AGENTHUB_PASSWORD` | 是 | 登录密码 |
| `AGENTHUB_SESSION_SECRET` | 是 | Session 加密密钥（32位以上随机字符串） |
| `AGENTHUB_IMAGE_API_URL` | 否 | 图片生成 API 地址 |
| `AGENTHUB_IMAGE_API_TOKEN` | 否 | 图片生成 API token |
| `AGENTHUB_IMAGE_MODEL` | 否 | 图片生成模型名 |

## 项目结构

```
src/
├── app/          # Next.js App Router 页面 & API
├── components/   # React 组件
├── stores/       # Zustand 状态管理
├── hooks/        # 自定义 Hooks
├── lib/          # 工具库 & 服务端逻辑
├── controller/   # Agent 调度引擎
├── memory/       # 记忆系统
├── supervisor/   # 质量监控
└── workspace/    # 工作区引擎
```
