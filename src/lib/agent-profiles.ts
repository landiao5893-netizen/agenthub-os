import { AgentProfile } from "@/types";
import { CORE_EXPERT_PROFILES } from "@/lib/expert-library";

export interface AgentProfileDraft {
  id: string;
  name: string;
  avatar: string;
  title: string;
  department: string;
  model: string;
  roleDescription: string;
  color?: string;
}

// ============================================
// 6 个 AI 员工完整档案
// ============================================
export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "controller",
    name: "Controller Agent",
    avatar: "🧠",
    title: "AI 项目经理",
    department: "智能调度中心",
    roleDescription: "负责理解用户需求、拆解复杂任务、调度团队资源、审核交付质量。是整个 AI 团队的指挥中枢。",
    model: "DeepSeek V4 Flash",
    color: "#8b5cf6",
    skills: [
      { name: "任务规划", level: 5, description: "将复杂需求拆解为可执行的子任务" },
      { name: "团队调度", level: 5, description: "根据 Agent 能力矩阵智能分配任务" },
      { name: "质量审核", level: 4, description: "审核子任务交付物，确保符合标准" },
      { name: "风险管理", level: 4, description: "识别项目风险并提前干预" },
      { name: "沟通协调", level: 5, description: "多 Agent 协作调度和信息同步" },
    ],
    tools: [
      { name: "任务编排", icon: "⚙️", granted: true, description: "创建和管理工作流 DAG" },
      { name: "Agent 调度", icon: "📋", granted: true, description: "分配任务给团队成员" },
      { name: "结果审核", icon: "✅", granted: true, description: "验收和汇总交付物" },
      { name: "网页搜索", icon: "🌐", granted: false, description: "（不需要直接搜索）" },
      { name: "代码执行", icon: "💻", granted: false, description: "（委托 Developer 执行）" },
    ],
    memory: {
      longTerm: [
        "用户偏好直接执行而非列步骤",
        "项目需要 26 工作日/月的计算基准",
        "用户对数字准确度要求极高",
        "所有 Agent 通过 Adapter 统一接入",
      ],
      projectExperience: [
        { name: "AgentHub OS 架构设计", role: "总控调度", outcome: "完成三栏布局 + 事件引擎架构" },
        { name: "移动端 UI 重构", role: "任务分配", outcome: "按 Tab 模式完成移动端适配" },
        { name: "WebSocket 模拟增强", role: "流程设计", outcome: "5 Agent 实时事件循环系统" },
      ],
      knowledge: ["项目管理方法论", "AI Agent 协作范式", "DAG 工作流设计", "Glassmorphism UI 设计规范"],
    },
    performance: {
      tasksCompleted: 247,
      projectsCount: 18,
      successRate: 96,
      rating: 4.8,
      recentProjects: ["AgentHub OS V1", "移动端适配", "事件引擎", "Agent 档案系统"],
    },
    status: "THINKING",
    currentTask: "规划 Agent 身份系统开发",
    createdAt: "2026-06-01",
  },
  {
    id: "research-1",
    name: "Research Agent",
    avatar: "🔍",
    title: "AI 研究员",
    department: "情报分析部",
    roleDescription: "负责信息检索、竞品分析、技术调研。为团队提供数据驱动的决策支持。",
    model: "DeepSeek V4 Flash",
    color: "#3b82f6",
    skills: [
      { name: "信息检索", level: 5, description: "多源搜索和数据聚合" },
      { name: "竞品分析", level: 4, description: "系统化对比竞品功能矩阵" },
      { name: "趋势洞察", level: 4, description: "识别行业趋势和技术方向" },
      { name: "数据可视化", level: 3, description: "调研结果图表化呈现" },
      { name: "文献综述", level: 4, description: "学术论文和技术文档摘要" },
    ],
    tools: [
      { name: "网页搜索", icon: "🌐", granted: true, description: "多引擎搜索和结果聚合" },
      { name: "网页提取", icon: "📄", granted: true, description: "提取目标页面结构化内容" },
      { name: "学术搜索", icon: "📚", granted: true, description: "arXiv 等学术数据库检索" },
      { name: "文档分析", icon: "📊", granted: true, description: "PDF/Word 文档内容提取" },
      { name: "代码执行", icon: "💻", granted: false, description: "（不需要执行代码）" },
    ],
    memory: {
      longTerm: [
        "用户偏好真实感搜索结果，讨厌百科/攻略",
        "城市情绪向内容（贵州）收藏率 10%",
        "竞品包括 CrewAI、AutoGen、LangGraph",
      ],
      projectExperience: [
        { name: "AI 工具生态调研", role: "主研究员", outcome: "完成 12 平台对比矩阵" },
        { name: "竞品 UI 设计分析", role: "主研究员", outcome: "输出三栏布局方案推荐" },
        { name: "小红书内容策略", role: "策略分析", outcome: "收藏率从 3% 提升至 10%" },
      ],
      knowledge: ["AI Agent 生态", "前端 UI 设计趋势", "社交媒体运营", "竞品分析方法论"],
    },
    performance: {
      tasksCompleted: 532,
      projectsCount: 24,
      successRate: 94,
      rating: 4.6,
      recentProjects: ["竞品 UI 分析", "模型评测报告", "市场趋势月报"],
    },
    status: "WORKING",
    currentTask: "调研主流 AI Agent 平台 UI 设计",
    createdAt: "2026-06-01",
  },
  {
    id: "content-1",
    name: "Content Agent",
    avatar: "✍️",
    title: "AI 内容创作者",
    department: "内容生产部",
    roleDescription: "负责文案撰写、多语言翻译、内容策略制定。输出高质量的品牌内容。",
    model: "DeepSeek V4 Flash",
    color: "#06b6d4",
    skills: [
      { name: "文案撰写", level: 5, description: "品牌文案、技术文档、营销内容" },
      { name: "多语言翻译", level: 4, description: "中英日韩多语种互译" },
      { name: "摘要提炼", level: 5, description: "长文精炼为核心要点" },
      { name: "风格适配", level: 4, description: "根据受众调整语调和风格" },
      { name: "SEO 优化", level: 3, description: "搜索引擎优化建议" },
    ],
    tools: [
      { name: "文本生成", icon: "✏️", granted: true, description: "生成各类格式文本" },
      { name: "翻译引擎", icon: "🌍", granted: true, description: "多语种实时翻译" },
      { name: "摘要工具", icon: "📝", granted: true, description: "提取核心要点" },
      { name: "网页搜索", icon: "🌐", granted: true, description: "内容素材搜索" },
      { name: "图像生成", icon: "🎨", granted: false, description: "（委托 Design Agent）" },
    ],
    memory: {
      longTerm: [
        "用户偏好小红书内容但不出攻略",
        "GUIZHOU COLLECTION 品牌定位高端生活方式",
        "内容需避免旅游海报风格",
      ],
      projectExperience: [
        { name: "GUIZHOU COLLECTION 文案", role: "主笔", outcome: "产出 12 城市品牌文案" },
        { name: "每日信息差简报", role: "编辑", outcome: "美东 10 点定时发布" },
        { name: "合同条款翻译", role: "翻译", outcome: "中英文商业合同互译" },
      ],
      knowledge: ["品牌文案写作", "社交媒体运营", "商业合同术语", "中英翻译规范"],
    },
    performance: {
      tasksCompleted: 389,
      projectsCount: 31,
      successRate: 92,
      rating: 4.5,
      recentProjects: ["品牌文案 V3", "信息差简报 7月", "合同翻译项目"],
    },
    status: "WAITING",
    currentTask: "等待 Research 完成调研报告",
    createdAt: "2026-06-15",
  },
  {
    id: "design-1",
    name: "Design Agent",
    avatar: "🎨",
    title: "AI 视觉设计师",
    department: "创意设计部",
    roleDescription: "负责 UI 设计、图像生成、品牌视觉规范。确保产品拥有高级科技美学。",
    model: "DeepSeek V4 Flash",
    color: "#f59e0b",
    skills: [
      { name: "UI 设计", level: 5, description: "界面布局和交互设计" },
      { name: "图像生成", level: 4, description: "AI 驱动的视觉素材生成" },
      { name: "排版布局", level: 4, description: "文字和元素的视觉层次" },
      { name: "品牌规范", level: 4, description: "色彩系统和设计令牌管理" },
      { name: "动效设计", level: 3, description: "Framer Motion 动画方案" },
    ],
    tools: [
      { name: "图像生成", icon: "🖼️", granted: true, description: "DALL·E / SD 图像生成" },
      { name: "SVG 生成", icon: "📐", granted: true, description: "矢量图形代码生成" },
      { name: "配色方案", icon: "🎯", granted: true, description: "色彩系统和调色板" },
      { name: "图标设计", icon: "🔣", granted: true, description: "自定义图标集生成" },
      { name: "代码执行", icon: "💻", granted: false, description: "（视觉设计不需要）" },
    ],
    memory: {
      longTerm: [
        "AgentHub OS 采用 Dark Glassmorphism 风格",
        "参考 Linear / Notion / Apple Vision Pro",
        "蓝紫渐变主色调，避免电竞和传统企业风格",
      ],
      projectExperience: [
        { name: "AgentHub OS UI 设计", role: "主设计师", outcome: "深色玻璃拟态设计系统" },
        { name: "移动端视觉适配", role: "主设计师", outcome: "三 Tab 响应式布局方案" },
        { name: "小红书图片模板", role: "模板设计", outcome: "10 套品牌视觉模板" },
      ],
      knowledge: ["Glassmorphism 设计", "响应式 UI", "设计令牌系统", "Framer Motion", "品牌视觉"],
    },
    performance: {
      tasksCompleted: 156,
      projectsCount: 14,
      successRate: 90,
      rating: 4.4,
      recentProjects: ["AgentHub 设计系统", "移动端适配", "图片模板库"],
    },
    status: "IDLE",
    currentTask: null,
    createdAt: "2026-06-15",
  },
  {
    id: "dev-1",
    name: "Developer Agent",
    avatar: "⚡",
    title: "AI 开发工程师",
    department: "工程研发部",
    roleDescription: "负责代码生成、架构设计、调试修复。是团队的技术实现核心。",
    model: "DeepSeek V4 Flash",
    color: "#10b981",
    skills: [
      { name: "代码生成", level: 5, description: "React/Next.js/TypeScript 全栈开发" },
      { name: "代码审查", level: 5, description: "安全扫描和质量把关" },
      { name: "调试修复", level: 4, description: "错误定位和修复方案" },
      { name: "架构设计", level: 4, description: "系统架构和技术选型" },
      { name: "性能优化", level: 4, description: "渲染性能和加载速度优化" },
    ],
    tools: [
      { name: "代码生成", icon: "⚡", granted: true, description: "全栈代码编写" },
      { name: "终端执行", icon: "💻", granted: true, description: "shell 命令和脚本执行" },
      { name: "代码审查", icon: "🔍", granted: true, description: "diff 对比和问题标记" },
      { name: "GitHub 操作", icon: "🐙", granted: true, description: "PR/Issue 管理" },
      { name: "文件操作", icon: "📁", granted: true, description: "文件读写和批量处理" },
    ],
    memory: {
      longTerm: [
        "项目使用 Next.js 14 + Tailwind CSS + Zustand",
        "rAF 批处理优化了事件引擎性能",
        "所有组件通过 'use client' 声明",
      ],
      projectExperience: [
        { name: "AgentHub OS 前端", role: "主开发者", outcome: "完整三栏布局 + 响应式" },
        { name: "Mock 事件引擎", role: "核心开发", outcome: "5 Agent 实时事件循环" },
        { name: "移动端适配", role: "前端开发", outcome: "Tab 导航 + 工作事件流" },
      ],
      knowledge: ["Next.js 14", "React 18", "Tailwind CSS", "Framer Motion", "Zustand", "TypeScript"],
    },
    performance: {
      tasksCompleted: 623,
      projectsCount: 27,
      successRate: 95,
      rating: 4.9,
      recentProjects: ["AgentHub OS", "事件引擎", "移动端适配", "每日简报 Cron"],
    },
    status: "WORKING",
    currentTask: "实现 WebSocket 状态同步模块",
    createdAt: "2026-06-01",
  },
  {
    id: "reviewer-1",
    name: "Reviewer Agent",
    avatar: "🛡️",
    title: "AI 质量审核员",
    department: "质量保障部",
    roleDescription: "负责内容审核、代码审查、合规检查。确保团队交付物符合质量标准。",
    model: "DeepSeek V4 Pro",
    color: "#f43f5e",
    skills: [
      { name: "内容审核", level: 5, description: "文本质量和准确性检查" },
      { name: "代码审查", level: 4, description: "安全漏洞和代码规范检查" },
      { name: "合规检查", level: 4, description: "合同条款和法律风险识别" },
      { name: "一致性校验", level: 4, description: "跨模块风格和逻辑一致性" },
      { name: "漏洞扫描", level: 3, description: "安全漏洞自动化检测" },
    ],
    tools: [
      { name: "质量检查", icon: "✅", granted: true, description: "多维度质量评分" },
      { name: "差异对比", icon: "📊", granted: true, description: "版本 diff 分析" },
      { name: "审计日志", icon: "📋", granted: true, description: "操作记录和合规审计" },
      { name: "合同分析", icon: "📄", granted: true, description: "法律条款风险识别" },
      { name: "代码执行", icon: "💻", granted: false, description: "（不直接执行代码）" },
    ],
    memory: {
      longTerm: [
        "合同审核只挑明显坑（争议解决地/验收免责/罚款20%）",
        "不提行业常规容忍项",
        "审核结果自动存入第二大脑 vault",
      ],
      projectExperience: [
        { name: "代码审查流程", role: "审查员", outcome: "建立 4 阶段审查标准" },
        { name: "商业合同审核", role: "审核员", outcome: "识别 8 份合同的关键风险点" },
        { name: "AgentHub 代码审核", role: "审查员", outcome: "发现 2 处类型优化建议" },
      ],
      knowledge: ["代码审查规范", "商业合同法律", "安全漏洞分类", "质量度量标准"],
    },
    performance: {
      tasksCompleted: 198,
      projectsCount: 16,
      successRate: 97,
      rating: 4.7,
      recentProjects: ["代码审查自动化", "合同风险扫描", "GUIZHOU 内容审核"],
    },
    status: "IDLE",
    currentTask: null,
    createdAt: "2026-06-20",
  },
  ...CORE_EXPERT_PROFILES,
];


const PROFILE_STORAGE_KEY = 'ah_agent_profiles';
const CORE_PROFILE_MODELS: Record<string, string> = {
  controller: 'DeepSeek V4 Flash',
  'research-1': 'DeepSeek V4 Flash',
  'content-1': 'DeepSeek V4 Flash',
  'design-1': 'DeepSeek V4 Flash',
  'dev-1': 'DeepSeek V4 Flash',
  'reviewer-1': 'DeepSeek V4 Pro',
};
let profilesHydrated = false;

function canUseProfileStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function buildAgentProfile(draft: AgentProfileDraft): AgentProfile {
  return {
    id: draft.id,
    name: draft.name,
    avatar: draft.avatar,
    title: draft.title,
    department: draft.department,
    roleDescription: draft.roleDescription || draft.title + '，负责按任务上下文完成专业交付。',
    model: draft.model,
    color: draft.color ?? '#8b5cf6',
    skills: [
      { name: '任务执行', level: 4, description: '根据 Controller 分配完成任务' },
      { name: '协作沟通', level: 4, description: '与其他 Agent 共享上下文和产出' },
      { name: '质量自检', level: 3, description: '提交前检查完整性和准确性' },
    ],
    tools: [
      { name: '文本生成', icon: '✏️', granted: true, description: '生成结构化文本交付物' },
      { name: '知识库检索', icon: '📚', granted: true, description: '读取可访问的项目知识' },
    ],
    memory: { longTerm: [], projectExperience: [], knowledge: [] },
    performance: { tasksCompleted: 0, projectsCount: 0, successRate: 100, rating: 4.0, recentProjects: [] },
    status: 'IDLE',
    currentTask: null,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

function applyProfileDraft(profile: AgentProfile, draft: AgentProfileDraft) {
  Object.assign(profile, {
    name: draft.name, avatar: draft.avatar, title: draft.title,
    department: draft.department, model: draft.model,
    roleDescription: draft.roleDescription || profile.roleDescription,
    color: draft.color ?? profile.color,
  });
}

function hydrateStoredProfiles() {
  if (profilesHydrated) return;
  profilesHydrated = true;
  if (!canUseProfileStorage()) return;

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as AgentProfileDraft[];
    if (!Array.isArray(parsed)) return;
    parsed.forEach((draft) => {
      if (!draft?.id || !draft.name) return;
      const normalizedDraft = CORE_PROFILE_MODELS[draft.id]
        ? { ...draft, model: CORE_PROFILE_MODELS[draft.id] }
        : draft;
      const existing = AGENT_PROFILES.find((profile) => profile.id === draft.id);
      const profile = buildAgentProfile(normalizedDraft);
      if (existing) applyProfileDraft(existing, normalizedDraft);
      else AGENT_PROFILES.push(profile);
    });
  } catch {
    // Ignore invalid persisted profile data.
  }
}

function persistProfileDraft(draft: AgentProfileDraft) {
  if (!canUseProfileStorage()) return;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as AgentProfileDraft[] : [];
    const drafts = Array.isArray(parsed) ? parsed : [];
    const idx = drafts.findIndex((item) => item.id === draft.id);
    if (idx >= 0) drafts[idx] = draft;
    else drafts.push(draft);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // localStorage can be unavailable; profile remains available this session.
  }
}

export function getAgentProfile(id: string): AgentProfile | undefined {
  hydrateStoredProfiles();
  return AGENT_PROFILES.find((a) => a.id === id);
}

export function registerAgentProfile(draft: AgentProfileDraft): AgentProfile {
  hydrateStoredProfiles();
  const profile = buildAgentProfile(draft);
  const existing = AGENT_PROFILES.find((a) => a.id === draft.id);
  if (existing) applyProfileDraft(existing, draft);
  else AGENT_PROFILES.push(profile);

  persistProfileDraft(draft);
  return existing ?? profile;
}
