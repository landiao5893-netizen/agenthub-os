# AgentHub OS — Open Source Audit

Audit date: 2026-09-24
Repository: https://github.com/landiao5893-netizen/agenthub-os
Branch: main (head `e823873` at audit time)

> 本文件为公开审计记录,内容全部基于仓库真实代码与 GitHub 远端状态核对,不包含任何推测数据。

---

## 1. 当前状态

- 早期但真实的可运行项目:**5 个提交**,最近一次为 `e823873 docs: add UI screenshots`。
- GitHub 远端(审计时):0 stars / 0 forks / 0 open issues / 0 releases / 0 tags / 无 license / 无 topics。
- 工作区干净(uncommitted changes = 0),本地与 `origin/main` 同步。
- 项目定位:面向 AI 多 Agent 统一管理面板(control plane)的早期开源项目。

## 2. 已有功能(逐项经代码核对)

| 功能 | 状态 | 证据 |
|---|---|---|
| 多 Agent 面板管理 | Implemented | `src/components/agents/*`、`src/stores/agentStore.ts`、`src/app/chat/[agentId]/page.tsx` |
| 多 Agent 对话(私聊/群聊,Markdown) | Implemented | `src/components/chat/MultiAgentChat.tsx`(1017 行)、`AgentChat.tsx`、`MarkdownMessage.tsx` |
| Agent 状态监控 | Implemented | `src/app/api/agents/state/route.ts`、`agentStore`(IDLE/WORKING/WAITING 状态机) |
| Provider 统一配置 | Implemented | `src/app/api/providers/route.ts`、`src/lib/server/provider-config-store.ts`(AES 加密存储 API key,`data/` 目录被 gitignore) |
| 工作流画布 | Implemented | `src/components/workflow/SmartWorkflowCanvas.tsx`(711 行)、`workflowStore.ts`、`WorkflowEvent.tsx` |
| Controller / Orchestrator | Implemented | `src/controller/orchestrator.ts`(634 行,任务拆解→并行调度→汇总)、`engine.ts`、`real-llm.ts` |
| Supervisor / 质量门控 | Implemented | `src/supervisor/engine.ts`、`quality-gate.ts`(5 维评分,PASS/WARN/FAIL,失败恢复) |
| 记忆系统(按 Agent 隔离、本地持久化) | Implemented | `src/memory/store.ts`(localStorage,每 Agent 上限 120 条)、`retrieval.ts`、`summarizer.ts` |
| Shared Workspace | Implemented | `src/workspace/engine.ts`、`downloads.ts`、`src/app/api/artifacts/[...path]/route.ts` |
| Runtime Engine(统一执行入口) | Implemented | `src/runtime-engine/engine.ts` + adapters: Hermes / OpenClaw / LLM / Mock |
| Runtime 适配器 | Implemented | `src/adapters/registry.ts` + `hermes.ts` / `openclaw.ts` / `direct-llm.ts` / `mock.ts` |
| 认证与会话(HMAC + timingSafeEqual) | Implemented | `src/lib/server-auth.ts`、`src/app/api/auth/*` |
| Hermes 集成(chat-run / image / video) | Implemented | `src/app/api/hermes/*`、`scripts/hermes-embedded-worker.py`、`scripts/install-hermes-runtime.mjs` |
| Codex 相关 | 未发现专门集成代码 | 仅 README 提及;无 `codex` 适配器或脚本 |
| OpenClaw 集成 | Foundation | `src/adapters/openclaw.ts`、`src/runtime-engine/adapters/openclaw.ts` |
| 知识库 / 文档解析 | Implemented | `src/knowledge/*`、`src/app/api/documents/extract/route.ts` |
| 画布 / 3D / 视觉组件 | Implemented | `react-three-fiber`、`framer-motion` 等依赖 |

**Codex 说明**:当前代码中不存在 Codex 专用集成/适配器,README 与文档中不得声称有,只列为 Planned。

## 3. 技术栈

- Next.js 14.2.35(App Router)+ React 18 + TypeScript
- Tailwind CSS 3 + postcss + tailwind.config.ts
- Zustand(状态)、Framer Motion(动画)、Lucide(图标)
- react-three-fiber / three(3D 组件)、@tanstack/react-query
- xlsx(SheetJS,cdn.tgz 源)、react-markdown + remark-gfm
- Node.js crypto(AES-256-GCM provider key 加密、HMAC session)

## 4. 文档情况

- 只有中文 README.md(质量尚可,但项目结构章节与真实目录**不符**,需修正;个别功能描述需降级为真实口径)。
- 缺:英文 README、LICENSE、CONTRIBUTING.md、SECURITY.md、ROADMAP.md、CHANGELOG.md、docs/ARCHITECTURE.md、docs/SECURITY_MODEL.md。
- 截图:`docs/images/` 下 dashboard.png / workflow.png / login.png 三张,1280×577,均为有效 PNG(commit `e823873` 已提交)。

## 5. 测试情况

- **无自动化测试**:无 `test`/`*.test.*`/`*.spec.*`,无 Jest/Vitest/Playwright 配置。
- 仓库内有两个本地 E2E 调试脚本(`e2e-real-task.mjs`、`e2e-real-task-round2.mjs`)与 `e2e-artifacts/` 产物,但它们:
  - 内含**真实私有服务器地址**(`[REDACTED private server endpoint]`)与真实业务任务内容([REDACTED business project])。
  - `e2e-artifacts/[REDACTED artifact]` 内含**真实报价单数据**(厨房设备详细配置技术清单,含单价)。
  - 结论:属于用户私有/调试数据,不应出现在公开仓库 → 本次已取消跟踪(本地保留),并加入 `.gitignore`。
- 提示词要求的 `npm install` / `npm run build` / `npm run lint` 验证在本轮执行,结果记入 `VALIDATION_REPORT.md`。

## 6. 截图情况

- `docs/images/dashboard.png`、`docs/images/workflow.png`、`docs/images/login.png`:3 张真实截图,已在 git,路径在 README 中引用正确。

## 7. 缺失项

- LICENSE(无 → 本轮补齐 MIT)
- 英文 README、贡献/安全/路线图/变更日志/架构/安全模型文档
- `.github/` 目录、GitHub Actions、issue 模板
- Topics、description(英文)、Issues、Release/Tag
- 自动化测试
- Codex 专用集成(Planned)

## 8. 安全风险

| 风险 | 级别 | 处置 |
|---|---|---|
| `e2e-artifacts/[REDACTED artifact]` 含真实报价单(已进 git 历史) | 高 | 本轮取消跟踪;历史清理需重写历史(高风险操作,需用户确认后再做) |
| E2E 脚本含私有服务器 IP `[REDACTED private server endpoint]`(已进 git 历史) | 中 | 本轮取消跟踪;同上 |
| Provider API key 加密存储(`data/.provider-secrets.key`) | 低 | 已 gitignore;文档化 |
| `.env.example` | 安全 | 全部为示例占位值,无真实 Secret |
| 代码硬编码 Secret | 未发现 | 全仓扫描 `api_key/secret/token/password/...`,仅命中代码逻辑与示例值 |
| SSRF 防护 | 已具备 | providers / hermes / llm API 路由对 localhost 与内网网段(10./127./169.254./192.168./172.16-31.)有目标地址校验 |

## 9. 仓库卫生问题

- `dev-3104.err.log` / `dev-3104.out.log`(0 字节生成日志)**被 git 跟踪** → 本轮取消跟踪 + 加入 .gitignore。
- `tsconfig.tsbuildinfo`(TypeScript 增量编译缓存,**被 git 跟踪**)→ 本轮取消跟踪 + 加入 .gitignore。
- `e2e-artifacts/`(测试产物)→ 取消跟踪 + 加入 .gitignore。
- `node_modules/`、`.next/` 已在本地存在但未被跟踪(gitignore 已覆盖)→ 无需处理。
- `package-lock.json` 正常跟踪(锁文件应保留)。

## 10. 必须修复项(本轮全部处理)

1. 添加 LICENSE(MIT)。
2. 完善 .gitignore(dist/*.log/*.tsbuildinfo/coverage/test-results/e2e-artifacts/.vercel 等)。
3. 取消跟踪生成文件与私有数据(见上)。
4. 修正 README 中与真实代码不符的描述(项目结构、心跳告警、Provider 支持范围等)。
5. 补齐 CONTRIBUTING / SECURITY / ROADMAP / CHANGELOG / ARCHITECTURE / SECURITY_MODEL。
6. 英文 README + 保留中文 README。
7. 验证 npm install / build / lint 并记录真实结果。
8. 创建 Issues、Topics、更新 description、打 tag v0.1.0 发布 Release。

## 11. 推荐项

- 建立 CI(GitHub Actions:build + lint),本期暂不新增(仓库无 .github,避免引入未经验证的流水线;列为 Roadmap Next)。
- 为公开仓库补充 issue 模板。
- 尽快移除 git 历史中的私有数据(需重写历史,待用户确认)。

## 12. 可选项

- 增加单元测试(如 quality-gate、server-auth)。
- 增加 Codex 集成示例(Planned)。
- 增加 Demonstrated screenshots 之外的截图数量。