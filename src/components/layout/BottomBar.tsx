'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';

export function BottomBar() {
  const router = useRouter();
  const { workflow, eventLogs, isRunning } = useWorkflowStore();
  const totalNodes = workflow?.nodes.length ?? 0;
  const completedNodes = workflow?.nodes.filter((node) => node.status === 'completed').length ?? 0;
  const outputCount = eventLogs.filter((log) => log.level === 'success').length;
  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  const radarValues = totalNodes > 0 ? [progress, progress, progress, progress, progress, isRunning ? 70 : progress] : [0, 0, 0, 0, 0, 0];
  const bars = totalNodes > 0 ? eventLogs.slice(-24).map((_, i) => 20 + Math.min(70, i * 4)) : [4, 4, 4, 4, 4, 4, 4, 4];
  const actions = [
    ['创建任务', '📋', '/workspace'], ['分配任务', '👥', '/tasks'], ['项目看板', '📊', '/projects'],
    ['团队沟通', '💬', '/chat/controller'], ['知识库', '📚', '/knowledge'], ['工作报告', '📝', '/logs'],
  ];

  return (
    <div className='h-[140px] shrink-0 border-t border-white/[0.04] bg-[#0a0a0c]/80 backdrop-blur-xl flex'>
      <div className='w-[180px] shrink-0 border-r border-white/[0.04] flex flex-col justify-center px-4'>
        <div className='text-[24px] text-white/[0.06] leading-none mb-1'>❝</div>
        <p className='text-[10px] text-white/30 leading-relaxed mb-1'>伟大的创意源于专注的思考和高效的协作</p>
        <p className='text-[8px] text-white/12'>— AgentHub OS</p>
      </div>

      <div className='flex-1 border-r border-white/[0.04] px-4 py-3'>
        <div className='text-[10px] text-white/30 mb-2'>当前工作统计</div>
        <div className='grid grid-cols-4 gap-3'>
          {[
            ['任务完成', completedNodes + '个', totalNodes > 0 ? totalNodes + ' 总数' : '待命', '#10b981'],
            ['运行状态', isRunning ? '运行中' : '待命', workflow ? workflow.name.slice(0, 8) : '无任务', '#3b82f6'],
            ['协作事件', eventLogs.length + '条', eventLogs.length > 0 ? '已记录' : '暂无', '#8b5cf6'],
            ['有效产出', outputCount + '条', outputCount > 0 ? '已通过' : '等待', '#f59e0b'],
          ].map(([label, value, change, color]) => (
            <div key={label}>
              <div className='text-[9px] text-white/25'>{label}</div>
              <div className='text-[15px] font-bold text-white/80'>{value}</div>
              <div className='text-[9px]' style={{ color }}>{change}</div>
            </div>
          ))}
        </div>
        <div className='mt-2 h-[30px] flex items-end gap-[2px]'>
          {bars.map((h, i) => (
            <motion.div key={i} className='flex-1 rounded-t-sm'
              style={{ height: h + '%', backgroundColor: '#8b5cf6', opacity: totalNodes > 0 ? 0.3 + (i/24)*0.3 : 0.12 }}
              initial={{ height: '0%' }} animate={{ height: h + '%' }} transition={{ delay: i*0.02, duration: 0.3 }} />
          ))}
        </div>
      </div>

      <div className='w-[180px] shrink-0 border-r border-white/[0.04] flex flex-col justify-center items-center px-3 py-2'>
        <div className='text-[10px] text-white/30 mb-1'>团队效能</div>
        <svg viewBox='0 0 100 100' className='w-[70px] h-[70px]'>
          {[0.2,0.4,0.6,0.8,1].map((scale, i) => (
            <polygon key={i} points={getPolygon(scale)} fill='none' stroke='rgba(255,255,255,0.04)' strokeWidth='0.5' transform='translate(50,50)' />
          ))}
          {[0,60,120,180,240,300].map((angle, i) => (
            <line key={i} x1='50' y1='50' x2={50 + 45*Math.cos(angle*Math.PI/180)} y2={50 + 45*Math.sin(angle*Math.PI/180)} stroke='rgba(255,255,255,0.04)' strokeWidth='0.5' />
          ))}
          <polygon points={getDataPolygon(radarValues)} fill='rgba(139,92,246,0.15)' stroke='#8b5cf6' strokeWidth='1' transform='translate(50,50)' />
          {['研究','内容','视觉','开发','质量','执行'].map((label, i) => {
            const angle = i * 60 - 90;
            const r = 52;
            return (
              <text key={i} x={50 + r*Math.cos(angle*Math.PI/180)} y={50 + r*Math.sin(angle*Math.PI/180)} textAnchor='middle' dominantBaseline='middle' fill='rgba(255,255,255,0.2)' fontSize='5'>{label}</text>
            );
          })}
        </svg>
      </div>

      <div className='w-[200px] shrink-0 px-3 py-3'>
        <div className='text-[10px] text-white/30 mb-2'>快速操作</div>
        <div className='grid grid-cols-3 gap-1.5'>
          {actions.map(([label, icon, path]) => (
            <button key={label} onClick={() => router.push(path)} className='flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors'>
              <span className='text-sm'>{icon}</span>
              <span className='text-[8px] text-white/35'>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPolygon(scale: number): string {
  const r = 42 * scale;
  return [0,60,120,180,240,300]
    .map((a) => String(r*Math.cos(a*Math.PI/180)) + ',' + String(r*Math.sin(a*Math.PI/180)))
    .join(' ');
}

function getDataPolygon(values: number[]): string {
  return values.map((v, i) => {
    const angle = i * 60;
    const r = 42 * v/100;
    return String(r*Math.cos(angle*Math.PI/180)) + ',' + String(r*Math.sin(angle*Math.PI/180));
  }).join(' ');
}
