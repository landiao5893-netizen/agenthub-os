'use client';

import { useMemo, useState } from 'react';
import {
  Bot,
  Brain,
  Braces,
  Check,
  CircleDot,
  Database,
  FileSearch,
  Globe2,
  Image,
  KeyRound,
  MemoryStick,
  MessagesSquare,
  Network,
  PlugZap,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  TerminalSquare,
  Video,
  Wrench,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { SimplePage } from '@/components/layout/SimplePage';
import { useAgentStore } from '@/stores/agentStore';
import { cn } from '@/lib/utils';

type ToolCategory = 'core' | 'knowledge' | 'web' | 'files' | 'data' | 'collaboration' | 'creative' | 'engineering';
type ToolAvailability = 'ready' | 'config' | 'beta';

interface MarketplaceTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  availability: ToolAvailability;
  icon: typeof Wrench;
  accent: string;
  tags: string[];
}

const CATEGORIES: Array<{ id: 'all' | ToolCategory; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'core', label: '核心能力' },
  { id: 'knowledge', label: '知识与记忆' },
  { id: 'web', label: '网络' },
  { id: 'files', label: '文件' },
  { id: 'data', label: '数据' },
  { id: 'collaboration', label: '协作' },
  { id: 'creative', label: '创作' },
  { id: 'engineering', label: '工程' },
];

const MARKETPLACE_TOOLS: MarketplaceTool[] = [
  { id: 'text_generation', name: '文本生成', description: '生成、改写和整理结构化文本，是 Agent 的基础输出能力。', category: 'core', availability: 'ready', icon: Sparkles, accent: '#a78bfa', tags: ['写作', '总结', '改写'] },
  { id: 'planner', name: '任务拆解', description: '将复杂目标拆成可调度、可验收的执行步骤。', category: 'core', availability: 'ready', icon: Network, accent: '#818cf8', tags: ['Controller', '计划'] },
  { id: 'knowledge_retrieval', name: '知识库检索', description: '读取 Agent 已获授权的内部知识库内容。', category: 'knowledge', availability: 'ready', icon: Database, accent: '#22d3ee', tags: ['RAG', '内部资料'] },
  { id: 'memory_recall', name: '长期记忆召回', description: '在执行前检索员工历史经验、偏好和项目结论。', category: 'knowledge', availability: 'ready', icon: Brain, accent: '#c084fc', tags: ['记忆', '经验'] },
  { id: 'memory_write', name: '经验沉淀', description: '把确认有效的结论写入员工长期记忆。', category: 'knowledge', availability: 'ready', icon: MemoryStick, accent: '#e879f9', tags: ['学习', '沉淀'] },
  { id: 'workspace_read', name: 'Workspace 读取', description: '读取上游 Agent 的产出和当前项目共享上下文。', category: 'collaboration', availability: 'ready', icon: FileSearch, accent: '#38bdf8', tags: ['共享上下文', '上游'] },
  { id: 'workspace_write', name: 'Workspace 写入', description: '将交付物、阶段结果和状态写入共享工作区。', category: 'collaboration', availability: 'ready', icon: MessagesSquare, accent: '#34d399', tags: ['交付', '下游'] },
  { id: 'orchestrator', name: 'Agent 任务交接', description: '把任务、约束与必要上下文交接给下游员工。', category: 'collaboration', availability: 'ready', icon: Bot, accent: '#60a5fa', tags: ['Multi-Agent', '调度'] },
  { id: 'quality_check', name: '质量门禁', description: '按验收标准检查产出并返回评分和修改意见。', category: 'core', availability: 'ready', icon: ShieldCheck, accent: '#fbbf24', tags: ['Supervisor', 'Reviewer'] },
  { id: 'web_search', name: '网页搜索', description: '查询公开网页并返回带来源的研究材料。', category: 'web', availability: 'ready', icon: Globe2, accent: '#2dd4bf', tags: ['搜索', '研究'] },
  { id: 'web_extract', name: '网页内容提取', description: '提取目标网页正文、标题和关键结构。', category: 'web', availability: 'ready', icon: FileSearch, accent: '#5eead4', tags: ['抓取', '正文'] },
  { id: 'browser_control', name: '浏览器操作', description: '打开网页、填写表单和验证页面交互。', category: 'web', availability: 'beta', icon: CircleDot, accent: '#14b8a6', tags: ['Browser', '自动化'] },
  { id: 'svg_generate', name: 'SVG 图形生成', description: '生成可编辑的图标、图表和矢量视觉素材。', category: 'creative', availability: 'ready', icon: Image, accent: '#ec4899', tags: ['SVG', '矢量'] },
  { id: 'document_reader', name: '文档解析', description: '提取 PDF、Word 和常见办公文档中的内容。', category: 'files', availability: 'config', icon: FileSearch, accent: '#fb7185', tags: ['PDF', 'DOCX'] },
  { id: 'spreadsheet_analysis', name: '表格分析', description: '读取表格、计算指标并生成结构化分析结果。', category: 'data', availability: 'config', icon: Table2, accent: '#4ade80', tags: ['Excel', 'CSV'] },
  { id: 'database_query', name: '数据库查询', description: '通过受控连接执行只读查询并返回数据集。', category: 'data', availability: 'config', icon: Database, accent: '#22c55e', tags: ['SQL', '只读'] },
  { id: 'image_gen', name: '图像生成', description: '根据创意方向生成视觉草图和交付素材。', category: 'creative', availability: 'ready', icon: Image, accent: '#f472b6', tags: ['视觉', '素材'] },
  { id: 'video_generate', name: '视频生成', description: '根据分镜和镜头提示词生成可播放、可下载的视频交付物。', category: 'creative', availability: 'ready', icon: Video, accent: '#fb923c', tags: ['视频', '短片', 'Agnes'] },
  { id: 'terminal', name: '终端执行', description: '在隔离环境运行脚本、测试和数据处理任务。', category: 'engineering', availability: 'ready', icon: TerminalSquare, accent: '#f59e0b', tags: ['Sandbox', '脚本'] },
  { id: 'code_generate', name: '代码生成', description: '根据任务约束生成可审查、可测试的代码实现。', category: 'engineering', availability: 'ready', icon: Braces, accent: '#fb923c', tags: ['代码', '实现'] },
  { id: 'github', name: 'GitHub 协作', description: '连接代码仓库，读取变更并参与交付协作。', category: 'engineering', availability: 'config', icon: Braces, accent: '#94a3b8', tags: ['仓库', '协作'] },
  { id: 'audit', name: '审计检查', description: '记录审核依据、风险项和质量门禁结果。', category: 'core', availability: 'ready', icon: ShieldCheck, accent: '#fda4af', tags: ['审计', '合规'] },
  { id: 'api_request', name: 'API 请求', description: '调用已审批的业务接口并解析响应。', category: 'engineering', availability: 'config', icon: Braces, accent: '#f97316', tags: ['HTTP', '集成'] },
  { id: 'secret_access', name: '凭据保险箱', description: '按员工权限读取服务端托管的连接凭据。', category: 'engineering', availability: 'beta', icon: KeyRound, accent: '#ef4444', tags: ['Secret', '权限'] },
];

const AVAILABILITY_LABEL: Record<ToolAvailability, string> = {
  ready: '可授权',
  config: '需要配置',
  beta: 'Beta',
};

function ToolsConsole() {
  const agents = useAgentStore((state) => state.agents);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const [agentId, setAgentId] = useState('controller');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ToolCategory>('all');
  const agent = agents.find((item) => item.id === agentId) ?? agents[0];
  const enabledIds = useMemo(() => new Set(agent?.tools ?? []), [agent?.tools]);
  const visibleTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return MARKETPLACE_TOOLS.filter((tool) => {
      if (category !== 'all' && tool.category !== category) return false;
      return !normalized || [tool.name, tool.description, ...tool.tags].join(' ').toLowerCase().includes(normalized);
    });
  }, [category, query]);

  const toggleTool = (tool: MarketplaceTool) => {
    if (!agent || tool.availability !== 'ready') return;
    const next = enabledIds.has(tool.id)
      ? agent.tools.filter((id) => id !== tool.id)
      : [...agent.tools, tool.id];
    updateAgent(agent.id, { tools: next });
  };

  return (
    <SimplePage
      title="插件与能力"
      description="选择一名员工，然后决定他可以使用哪些能力。"
      eyebrow="设置"
      backHref="/settings"
      actions={
        <select value={agent?.id ?? ''} onChange={(event) => setAgentId(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-violet-400">
          {agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      }
    >
      <div className="mx-auto max-w-[900px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 sm:max-w-[380px]"><Search size={15} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索能力" className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400" /></label>
          <div className="flex gap-1 overflow-x-auto">
            {CATEGORIES.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={cn('h-9 shrink-0 rounded-md px-3 text-[11px]', category === item.id ? 'bg-violet-50 font-medium text-violet-700' : 'text-slate-500 hover:bg-slate-100')}>{item.label}</button>)}
          </div>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {visibleTools.map((tool) => {
            const Icon = tool.icon;
            const enabled = enabledIds.has(tool.id);
            const ready = tool.availability === 'ready';
            return (
              <div key={tool.id} className="flex items-center gap-3 px-4 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ color: tool.accent, backgroundColor: tool.accent + '12' }}><Icon size={18} /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-[12px] font-medium text-slate-900">{tool.name}</h2>{!ready && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] text-amber-700">{AVAILABILITY_LABEL[tool.availability]}</span>}</div><p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{tool.description}</p></div>
                <button type="button" onClick={() => toggleTool(tool)} disabled={!ready} className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[10px] transition-colors', !ready ? 'cursor-not-allowed border-slate-200 text-slate-300' : enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700')}>
                  {enabled ? <Check size={12} /> : <PlugZap size={12} />}{ready ? enabled ? '已启用' : '启用' : '待配置'}
                </button>
              </div>
            );
          })}
          {visibleTools.length === 0 && <div className="px-6 py-14 text-center text-[11px] text-slate-400">没有匹配的能力。</div>}
        </div>
      </div>
    </SimplePage>
  );
}

export default function ToolsPage() {
  return <AppShell centerPanel={<ToolsConsole />} leftPanel={<LeftSidebar />} hideRightPanel />;
}
