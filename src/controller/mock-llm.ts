// ============================================
// Mock LLM — 模拟任务分析引擎
// 基于关键词匹配 + 模板生成结构化分析结果
// 未来替换为真实 LLM API 调用
// ============================================

import { TaskAnalysis, SubTaskDef, DAGEdge } from "./types";

// ============================================
// 关键词 → 领域映射
// ============================================
const DOMAIN_PATTERNS: [RegExp, string, string[]][] = [
  [/产品手册|手册|产品介绍|品牌|宣传/, "内容创作", ["controller", "research-1", "content-1", "design-1", "dev-1", "reviewer-1"]],
  [/代码|开发|编程|bug|修复|功能|API|接口|前端|后端|组件/, "软件开发", ["controller", "dev-1", "reviewer-1"]],
  [/设计|UI|UX|视觉|配色|布局|logo|海报/, "视觉设计", ["controller", "design-1", "reviewer-1"]],
  [/数据|分析|报表|统计|趋势|预测|图表/, "数据分析", ["controller", "research-1", "content-1"]],
  [/调研|研究|竞品|市场|行业|评估/, "信息调研", ["controller", "research-1", "content-1"]],
  [/审核|检查|审查|合同|质量|合规/, "质量审核", ["controller", "reviewer-1"]],
  [/部署|上线|发布|运维|监控|服务器/, "运维部署", ["controller", "dev-1", "reviewer-1"]],
  [/文案|文章|博客|内容|写作|翻译|编辑/, "文案写作", ["controller", "research-1", "content-1"]],
  [/通用|帮助|协助/, "综合任务", ["controller", "research-1", "content-1", "design-1", "dev-1"]],
];

// ============================================
// 预设任务模板
// ============================================
interface TaskTemplate {
  subtaskTemplate: (topic: string) => SubTaskDef[];
  dag: DAGEdge[];
}

const TASK_TEMPLATES: Record<string, TaskTemplate> = {
  "内容创作": {
    subtaskTemplate: (topic: string) => [
      { id: "t1", title: `调研「${topic}」相关资料`, description: `搜索和整理与${topic}相关的素材`, assignedAgent: "research-1", priority: "high", input: `目标主题：${topic}。需要：市场数据、竞品参考、内容素材`, dependsOn: [], expectedOutput: "调研报告" },
      { id: "t2", title: `撰写「${topic}」核心文案`, description: `基于调研结果撰写${topic}的文案`, assignedAgent: "content-1", priority: "high", input: `基于调研报告撰写${topic}的专业文案`, dependsOn: ["t1"], expectedOutput: "文案草稿" },
      { id: "t3", title: `设计「${topic}」视觉方案`, description: `为${topic}设计配套视觉`, assignedAgent: "design-1", priority: "medium", input: `为${topic}设计视觉方案`, dependsOn: ["t1"], expectedOutput: "视觉设计稿" },
      { id: "t4", title: "组装「" + topic + "」产品手册结构", description: "将" + topic + "的文案和视觉方案整理为可交付结构", assignedAgent: "dev-1", priority: "medium", input: "基于文案和视觉方案组装" + topic + "产品手册结构", dependsOn: ["t2", "t3"], expectedOutput: "产品手册结构" },
      { id: "t5", title: "审核「" + topic + "」最终成果", description: "审核" + topic + "的文案、设计和交付结构", assignedAgent: "reviewer-1", priority: "medium", input: "审核" + topic + "的最终产出", dependsOn: ["t4"], expectedOutput: "审核报告" },
    ],
    dag: [{ from: "t1", to: "t2" }, { from: "t1", to: "t3" }, { from: "t2", to: "t4" }, { from: "t3", to: "t4" }, { from: "t4", to: "t5" }],
  },
  "软件开发": {
    subtaskTemplate: (topic: string) => [
      { id: "t1", title: `分析「${topic}」技术需求`, description: "分析技术方案和实现路径", assignedAgent: "controller", priority: "high", input: `需求：${topic}。分析技术可行性和方案`, dependsOn: [], expectedOutput: "技术方案" },
      { id: "t2", title: `开发「${topic}」核心功能`, description: "编写核心代码实现", assignedAgent: "dev-1", priority: "high", input: `基于技术方案实现${topic}`, dependsOn: ["t1"], expectedOutput: "功能代码" },
      { id: "t3", title: `审查「${topic}」代码质量`, description: "代码审查和测试", assignedAgent: "reviewer-1", priority: "medium", input: `审查${topic}的代码`, dependsOn: ["t2"], expectedOutput: "审查报告" },
    ],
    dag: [{ from: "t1", to: "t2" }, { from: "t2", to: "t3" }],
  },
  "视觉设计": {
    subtaskTemplate: (topic: string) => [
      { id: "t1", title: `分析「${topic}」设计需求`, description: "分析设计方向和风格", assignedAgent: "controller", priority: "high", input: `${topic}的设计需求分析`, dependsOn: [], expectedOutput: "设计概要" },
      { id: "t2", title: `创作「${topic}」设计方案`, description: "生成视觉设计方案", assignedAgent: "design-1", priority: "high", input: `为${topic}创建视觉方案`, dependsOn: ["t1"], expectedOutput: "设计稿" },
      { id: "t3", title: `审核「${topic}」设计质量`, description: "审核设计一致性", assignedAgent: "reviewer-1", priority: "medium", input: `审核${topic}的设计`, dependsOn: ["t2"], expectedOutput: "审核意见" },
    ],
    dag: [{ from: "t1", to: "t2" }, { from: "t2", to: "t3" }],
  },
  "数据分析": {
    subtaskTemplate: (topic: string) => [
      { id: "t1", title: `收集「${topic}」相关数据`, description: "搜索和提取数据源", assignedAgent: "research-1", priority: "high", input: `收集${topic}的相关数据`, dependsOn: [], expectedOutput: "数据集" },
      { id: "t2", title: `分析「${topic}」数据并输出报告`, description: "数据清洗和分析", assignedAgent: "content-1", priority: "high", input: `基于数据撰写${topic}分析报告`, dependsOn: ["t1"], expectedOutput: "分析报告" },
    ],
    dag: [{ from: "t1", to: "t2" }],
  },
  "信息调研": {
    subtaskTemplate: (topic: string) => [
      { id: "t1", title: `搜索「${topic}」市场信息`, description: "多维度信息采集", assignedAgent: "research-1", priority: "high", input: `${topic}的市场调研`, dependsOn: [], expectedOutput: "调研数据" },
      { id: "t2", title: `整理「${topic}」调研报告`, description: "信息整理和洞察输出", assignedAgent: "content-1", priority: "medium", input: `基于调研数据撰写${topic}报告`, dependsOn: ["t1"], expectedOutput: "调研报告" },
    ],
    dag: [{ from: "t1", to: "t2" }],
  },
  "质量审核": {
    subtaskTemplate: (topic: string) => [
      { id: "t1", title: `初审「${topic}」材料`, description: "初步检查完整性", assignedAgent: "reviewer-1", priority: "high", input: `初步审核${topic}`, dependsOn: [], expectedOutput: "初审意见" },
      { id: "t2", title: `深度审查「${topic}」`, description: "全面质量评估", assignedAgent: "reviewer-1", priority: "medium", input: `深度审查${topic}`, dependsOn: ["t1"], expectedOutput: "审查报告" },
    ],
    dag: [{ from: "t1", to: "t2" }],
  },
};

// 默认模板
const DEFAULT_TEMPLATE: TaskTemplate = {
  subtaskTemplate: (topic: string) => [
    { id: "t1", title: `分析「${topic}」需求`, description: "拆解需求为目标和约束", assignedAgent: "controller", priority: "high", input: topic, dependsOn: [], expectedOutput: "需求分析" },
    { id: "t2", title: `执行「${topic}」核心任务`, description: "主力 Agent 执行核心工作", assignedAgent: "dev-1", priority: "high", input: topic, dependsOn: ["t1"], expectedOutput: "核心成果" },
    { id: "t3", title: `检查「${topic}」结果`, description: "审核最终产出", assignedAgent: "reviewer-1", priority: "medium", input: topic, dependsOn: ["t2"], expectedOutput: "审核通过" },
  ],
  dag: [{ from: "t1", to: "t2" }, { from: "t2", to: "t3" }],
};

// ============================================
// MockLLM 类
// ============================================
export class MockLLM {
  /**
   * 分析用户输入 → 结构化任务分析
   * 模拟 LLM 的思考延迟
   */
  async analyze(userInput: string): Promise<TaskAnalysis> {
    // 模拟 LLM 思考时间
    await this.delay(800 + Math.random() * 1200);

    // 1. 领域识别
    let domain = "综合任务";
    let agents: string[] = [];
    for (const [pattern, d, a] of DOMAIN_PATTERNS) {
      if (pattern.test(userInput)) {
        domain = d;
        agents = a;
        break;
      }
    }
    if (agents.length === 0) agents = ["controller", "research-1", "content-1", "design-1", "dev-1", "reviewer-1"];

    // 2. 意图提取
    const intent = this.extractIntent(userInput);

    // 3. 获取模板
    const template = TASK_TEMPLATES[domain] ?? DEFAULT_TEMPLATE;
    const topic = this.extractTopic(userInput);

    // 4. 生成子任务
    const subtasks = template.subtaskTemplate(topic);

    // 5. 复杂度
    const complexity = subtasks.length <= 2 ? "simple" : subtasks.length <= 3 ? "medium" : "complex";

    return {
      intent,
      domain,
      complexity,
      suggestedAgents: agents,
      subtasks,
      dag: template.dag,
      estimatedMinutes: subtasks.length * 2 + 1,
    };
  }

  private extractIntent(input: string): string {
    const verbs = ["制作", "开发", "设计", "分析", "调研", "审核", "编写", "创建", "优化", "部署"];
    for (const v of verbs) {
      if (input.includes(v)) {
        const idx = input.indexOf(v);
        return input.slice(idx, Math.min(idx + 20, input.length));
      }
    }
    return input.slice(0, 20);
  }

  private extractTopic(input: string): string {
    // 提取「」中的内容或关键词
    const bracket = input.match(/[「「](.+?)[」」]/);
    if (bracket) return bracket[1];
    // 去掉常见的引导词
    return input
      .replace(/请|帮我|需要|想要|给我|麻烦/g, "")
      .replace(/制作|开发|设计|分析|调研|审核|编写|创建/g, "")
      .trim()
      .slice(0, 20);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockLLM = new MockLLM();
