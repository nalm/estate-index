import { LAYER_META, LAYER_ORDER } from '../lib/layers.js'
import { REGION_NAMES } from '../lib/regions.js'
import { STATUS_META, STATUS_ORDER } from '../lib/status.js'

// 상단 필터 바: 지역 선택 · 층위 토글 · 피드백 루프 · fitView
export default function FilterBar({
  region, setRegion,
  activeLayers, toggleLayer,
  feedbackOnly, setFeedbackOnly,
  layoutMode, setLayoutMode,
  showTimeline, setShowTimeline,
  onFit, generatedAt, statusCounts,
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur md:gap-x-4 md:gap-y-2 md:px-4 md:py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-800">부동산 지표 지도</span>
        {statusCounts && (
          <div className="hidden items-center gap-1 sm:flex">
            {STATUS_ORDER.filter((k) => statusCounts[k] > 0).map((k) => {
              const m = STATUS_META[k]
              return (
                <span
                  key={k}
                  title={m.label}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: m.bg, color: m.color }}
                >
                  {m.label} {statusCounts[k]}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-slate-500">지역</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          {REGION_NAMES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1">
        {LAYER_ORDER.map((key) => {
          const meta = LAYER_META[key]
          const on = activeLayers.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition"
              style={{
                borderColor: meta.color,
                background: on ? meta.color : 'transparent',
                color: on ? '#fff' : meta.color,
                opacity: on ? 1 : 0.5,
              }}
            >
              {meta.name}
            </button>
          )
        })}
      </div>

      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={feedbackOnly}
          onChange={(e) => setFeedbackOnly(e.target.checked)}
        />
        피드백 루프만 강조
      </label>

      {/* 타임라인은 모바일에서 숨기므로 토글도 md 이상에서만 */}
      <label className="hidden items-center gap-1.5 text-xs text-slate-600 md:flex">
        <input
          type="checkbox"
          checked={showTimeline}
          onChange={(e) => setShowTimeline(e.target.checked)}
        />
        정책 타임라인
      </label>

      <div className="hidden items-center overflow-hidden rounded border border-slate-300 text-xs md:flex">
        <button
          onClick={() => setLayoutMode('auto')}
          className={`px-2 py-1 ${layoutMode === 'auto' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          정돈 배치
        </button>
        <button
          onClick={() => setLayoutMode('original')}
          className={`border-l border-slate-300 px-2 py-1 ${layoutMode === 'original' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          원본 배치
        </button>
      </div>

      <button
        onClick={onFit}
        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
      >
        화면 맞춤
      </button>

      <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">기준: {generatedAt}</span>
    </div>
  )
}
