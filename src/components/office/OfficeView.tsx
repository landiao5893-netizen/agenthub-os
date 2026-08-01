"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Bell, Search } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const AGENTS = [
  { id:"controller", name:"总控 · Alex", title:"AI 项目总监", task:"正在统筹项目执行", color:"#8b5cf6", abbr:"Al", bg:"linear-gradient(135deg,#6366f1,#8b5cf6)" },
  { id:"research-1", name:"研究 · Mia", title:"市场研究员", task:"正在分析行业与市场资料", color:"#3b82f6", abbr:"Mi", bg:"linear-gradient(135deg,#3b82f6,#60a5fa)" },
  { id:"content-1", name:"内容 · Leo", title:"内容创作专家", task:"正在撰写文案内容", color:"#06b6d4", abbr:"Le", bg:"linear-gradient(135deg,#06b6d4,#22d3ee)" },
  { id:"design-1", name:"设计 · Zoe", title:"视觉设计师", task:"正在设计视觉方案", color:"#f59e0b", abbr:"Zo", bg:"linear-gradient(135deg,#f59e0b,#fbbf24)" },
  { id:"dev-1", name:"开发 · Ben", title:"全栈工程师", task:"正在开发功能模块", color:"#10b981", abbr:"Be", bg:"linear-gradient(135deg,#10b981,#34d399)" },
  { id:"reviewer-1", name:"审核 · Eve", title:"质量审核员", task:"正在审核项目内容", color:"#f43f5e", abbr:"Ev", bg:"linear-gradient(135deg,#f43f5e,#fb7185)" },
];

const ZONES = [
  { agentId:"controller", label:"总控中心", top:"45%", left:"50%" },
  { agentId:"research-1", label:"研究图书区", top:"22%", left:"22%" },
  { agentId:"design-1", label:"设计工作区", top:"22%", left:"78%" },
  { agentId:"content-1", label:"内容创作区", top:"74%", left:"22%" },
  { agentId:"dev-1", label:"开发工作区", top:"74%", left:"78%" },
  { agentId:"reviewer-1", label:"审核区域", top:"92%", left:"50%" },
];

function FloatingLabel({ agentId, label, top, left }: { agentId: string; label: string; top: string; left: string }) {
  const { openProfile } = useUIStore();
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) return null;

  return (
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3 + Math.random()*2, repeat: Infinity, ease: "easeInOut" }}
      onClick={() => openProfile(agentId)}
      className="absolute cursor-pointer z-10"
      style={{ top, left, transform: "translate(-50%, -50%)" }}
    >
      {/* 区域标签 */}
      <div className="text-[10px] font-medium text-center mb-3 tracking-wider"
        style={{ color: agent.color, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        {label}
      </div>

      {/* Agent 卡片 */}
      <div className="px-2.5 py-2 rounded-2xl border backdrop-blur-xl whitespace-nowrap"
        style={{
          background: `linear-gradient(135deg, ${agent.color}18, rgba(255,255,255,0.15))`,
          borderColor: `${agent.color}35`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.08)`,
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
            style={{ background: agent.bg }}>
            {agent.abbr}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-gray-800">{agent.name}</div>
            <div className="text-[9px] text-gray-400">{agent.title}</div>
          </div>
          <div className="w-2 h-2 rounded-full animate-pulse ml-1" style={{ backgroundColor: agent.color }} />
        </div>
        <div className="text-[10px] text-gray-500 mt-1.5 ml-10">{agent.task}</div>
      </div>
    </motion.div>
  );
}

export function OfficeView({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-30 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f5f0eb 0%, #ede4d8 30%, #e8ddd0 60%, #f0e8dc 100%)" }}>

      {/* ===== 暖调工作室背景 ===== */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 天窗光 */}
        <div className="absolute top-0 left-[15%] w-[600px] h-[500px] opacity-60"
          style={{ background: "radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.8) 0%, rgba(255,248,240,0.3) 40%, transparent 70%)" }} />
        
        {/* 右侧窗户光 */}
        <div className="absolute top-[10%] right-0 w-[400px] h-[600px] opacity-50"
          style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(255,255,255,0.7) 0%, rgba(245,240,230,0.2) 50%, transparent 80%)" }} />
        
        {/* 木地板纹理 */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(139,90,43,0.5) 4px, rgba(139,90,43,0.5) 5px)" }} />
        
        {/* 暖光氛围 */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,220,180,0.25) 0%, transparent 60%)" }} />
        
        {/* 玻璃隔断线条 */}
        <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-black/[0.03]" />
        <div className="absolute right-[25%] top-0 bottom-0 w-[1px] bg-black/[0.03]" />
        
        {/* 天花板灯 */}
        {[[20,15],[50,12],[80,15]].map(([x,y],i) => (
          <div key={i} className="absolute" style={{ left:`${x}%`, top:`${y}%`, transform:"translate(-50%,-50%)" }}>
            <div className="w-12 h-1.5 rounded-full bg-black/[0.04] mx-auto" />
            <div className="w-1 h-6 bg-black/[0.03] mx-auto" />
            <div className="w-6 h-3 rounded-b-full bg-black/[0.05] mx-auto" />
            <div className="w-32 h-20 rounded-full blur-xl -mt-2 opacity-30"
              style={{ background: "radial-gradient(ellipse, rgba(255,240,220,0.6), transparent)" }} />
          </div>
        ))}
      </div>

      {/* ===== 顶部导航栏 ===== */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 70%, transparent 100%)" }}>
        
        {/* 左侧 Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="leading-tight">
              <span className="text-[14px] font-bold text-gray-800">AGENTHUB</span>
              <span className="text-[14px] font-bold text-blue-500"> OS</span>
              <div className="text-[8px] text-gray-400 -mt-0.5">AI 创意公司操作系统</div>
            </div>
          </div>
        </div>

        {/* 中间 */}
        <div className="text-center">
          <div className="text-[12px] font-medium text-gray-700">早上好，周总 <span className="text-base">👋</span></div>
          <div className="text-[9px] text-gray-400">欢迎来到你的 AI 创意公司</div>
        </div>

        {/* 右侧 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 gap-2">
            <Search size={12} className="text-gray-400" />
            <input type="text" placeholder="搜索 Agent / 任务 / 项目" className="bg-transparent text-[11px] text-gray-600 placeholder:text-gray-300 outline-none w-[180px]" />
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 relative">
            <Bell size={14} />
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1">17</span>
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">周</div>
            <div className="leading-tight">
              <div className="text-[11px] text-gray-700">周总</div>
              <div className="text-[8px] text-gray-400">创始人</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 浮动 Agent 标签 ===== */}
      <div className="absolute inset-0">
        {ZONES.map(z => (
          <FloatingLabel key={z.agentId} agentId={z.agentId} label={z.label} top={z.top} left={z.left} />
        ))}
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-20"
        style={{ background: "linear-gradient(0deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 70%, transparent 100%)" }}>
        
        <div className="flex items-center justify-between px-5 py-3 max-w-[900px] mx-auto">
          {/* 项目进度 */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[9px] text-gray-400">贵州城市产品手册设计</div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-purple-500">62%</span>
                <div className="w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="flex items-center gap-2">
            {[
              ["创建任务","📋","#8b5cf6"],["分配任务","👥","#3b82f6"],["项目看板","📊","#10b981"],
              ["团队沟通","💬","#f59e0b"],["知识库","📚","#06b6d4"],["生成报告","📝","#f43f5e"],
            ].map(([label,icon,color]) => (
              <button key={label}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors hover:bg-gray-50"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: `${color}12` }}>{icon}</div>
                <span className="text-[9px] text-gray-500">{label}</span>
              </button>
            ))}
          </div>

          {/* 返回控制台 */}
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={12} /> 控制台
          </button>
        </div>
      </div>
    </div>
  );
}
