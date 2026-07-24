import { LAYER_META, LAYER_ORDER } from '../lib/layers.js'
import { STATUS_META, STATUS_ORDER } from '../lib/status.js'

// 좌하단 고정 범례: 층위 색상 + 엣지 의미
export default function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-md backdrop-blur">
      <div className="mb-1.5 font-semibold text-slate-700">층위</div>
      <div className="mb-2 grid grid-cols-1 gap-1">
        {LAYER_ORDER.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: LAYER_META[key].color }} />
            <span className="text-slate-600">{LAYER_META[key].name}</span>
          </div>
        ))}
      </div>
      <div className="mb-1.5 font-semibold text-slate-700">관계</div>
      <div className="flex flex-col gap-1 text-slate-600">
        <div className="flex items-center gap-1.5">
          <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#64748b" strokeWidth="2" /></svg>
          정방향 인과
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#64748b" strokeWidth="2" strokeDasharray="4 3" /></svg>
          역방향·충격
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#a855f7" strokeWidth="2.5" /></svg>
          피드백 루프
        </div>
      </div>
      <div className="mb-1.5 mt-2 font-semibold text-slate-700">데이터 출처</div>
      <div className="flex flex-col gap-1">
        {STATUS_ORDER.map((k) => {
          const m = STATUS_META[k]
          return (
            <div key={k} className="flex items-center gap-1.5 text-slate-600">
              <span
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded text-[9px] font-bold"
                style={{ background: m.bg, color: m.color }}
              >
                {m.short}
              </span>
              {m.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
