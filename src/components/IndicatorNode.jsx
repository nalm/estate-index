import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import Sparkline from './Sparkline.jsx'
import { statusMeta } from '../lib/status.js'

// React Flow 커스텀 노드. data = { node, color, soft, stat, series, status, dimmed, selected, isPolicy }
function IndicatorNode({ data }) {
  const { node, color, soft, stat, series, status, dimmed, selected, isPolicy } = data
  const up = stat && stat.delta > 0
  const down = stat && stat.delta < 0
  const arrow = up ? '▲' : down ? '▼' : '─'
  const deltaColor = up ? '#dc2626' : down ? '#2563eb' : '#94a3b8'
  const sm = !isPolicy && status ? statusMeta(status) : null

  return (
    <div
      className="rounded-lg border-2 bg-white shadow-sm transition-opacity"
      style={{
        borderColor: color,
        width: 190,
        opacity: dimmed ? 0.15 : 1,
        boxShadow: selected ? `0 0 0 3px ${color}55` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div
        className="flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5"
        style={{ background: soft }}
      >
        <span className="flex-1 text-[13px] font-semibold leading-tight text-slate-800">
          {node.label}
        </span>
        {sm && (
          <span
            title={`출처: ${sm.label}`}
            className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold leading-none"
            style={{ background: sm.bg, color: sm.color }}
          >
            {sm.short}
          </span>
        )}
      </div>

      <div className="px-2.5 py-2">
        {isPolicy ? (
          <div className="text-[11px] text-slate-500">정책 이벤트 · 타임라인 참조</div>
        ) : stat ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-900">
                {formatNum(stat.value)}
                <span className="ml-0.5 text-[10px] font-normal text-slate-400">{node.unit}</span>
              </span>
              <span className="text-[11px] font-semibold" style={{ color: deltaColor }}>
                {arrow} {Math.abs(stat.pct).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1">
              <Sparkline data={series} color={color} width={168} height={30} />
            </div>
            <div className="mt-0.5 text-right text-[9px] text-slate-400">{stat.date}</div>
          </>
        ) : (
          <div className="text-[11px] text-slate-400">데이터 없음</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}

function formatNum(n) {
  if (Math.abs(n) >= 10000) return n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (Math.abs(n) >= 100) return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

export default memo(IndicatorNode)
