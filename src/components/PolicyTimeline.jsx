// 하단 정책 타임라인. 정책 이벤트를 5년 시간축에 배치.
// 마커 클릭 → 해당 정책 노드 패널 열기.
export default function PolicyTimeline({ events, months, onSelect }) {
  if (!months || months.length < 2) return null
  const idxOf = (ym) => {
    const i = months.indexOf(ym)
    if (i >= 0) return i
    // 범위 밖이면 근사 클램프
    return ym < months[0] ? 0 : months.length - 1
  }
  const pct = (ym) => (idxOf(ym) / (months.length - 1)) * 100

  // 연도 눈금
  const years = []
  for (let i = 0; i < months.length; i++) {
    const [y, m] = months[i].split('-')
    if (m === '01' || i === 0) years.push({ label: y, left: (i / (months.length - 1)) * 100 })
  }

  const sorted = [...(events || [])].sort((a, b) => a.date.localeCompare(b.date))

  return (
    // 모바일에서는 마커가 겹쳐 가독성이 없어 숨김 (md 이상에서만 표시)
    <div className="hidden border-t border-slate-200 bg-white px-4 py-1.5 md:block">
      <div className="relative h-[62px]">
        {/* 좌측 제목·범례 (인라인으로 높이 절약) */}
        <div className="absolute left-0 top-[40px] flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600">정책 타임라인</span>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#dc2626' }} /> 강화
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#2563eb' }} /> 완화
        </div>
        {/* 기준선 */}
        <div className="absolute left-0 right-0 top-[44px] h-px bg-slate-200" />
        {/* 연도 눈금 */}
        {years.map((y, k) => (
          <div key={k} className="absolute top-[47px] -translate-x-1/2 text-[10px] text-slate-400" style={{ left: `${y.left}%` }}>
            {y.label}
          </div>
        ))}
        {/* 이벤트 마커 */}
        {sorted.map((ev, i) => {
          const color = ev.direction === 'tighten' ? '#dc2626' : '#2563eb'
          const left = pct(ev.date)
          const up = i % 2 === 0 // 라벨 상/하 교차 배치로 겹침 완화
          return (
            <button
              key={ev.id}
              onClick={() => onSelect?.(ev.nodeId)}
              title={`${ev.date} · ${ev.title} — ${ev.note}`}
              className="absolute -translate-x-1/2 cursor-pointer"
              style={{ left: `${left}%`, top: up ? 0 : 22 }}
            >
              <div
                className="max-w-[130px] truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                style={{ background: color }}
              >
                {ev.title}
              </div>
              {/* 스템 + 점 (기준선까지) */}
              <div
                className="mx-auto w-px bg-slate-300"
                style={{ height: up ? 22 : 2 }}
              />
              <div className="mx-auto h-2 w-2 rounded-full ring-2 ring-white" style={{ background: color }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
