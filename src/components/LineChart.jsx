import { useState } from 'react'

// 상세 패널용 시계열 라인차트 (SVG, 의존성 없음). hover 시 값 표시.
export default function LineChart({ data, color = '#334155', unit = '' }) {
  const [hover, setHover] = useState(null)
  if (!data || data.length < 2) return <div className="text-sm text-slate-400">데이터 없음</div>

  const W = 560, H = 220, padL = 48, padR = 12, padT = 12, padB = 28
  const iw = W - padL - padR
  const ih = H - padT - padB
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i) => padL + (i / (data.length - 1)) * iw
  const y = (v) => padT + ih - ((v - min) / span) * ih
  const path = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' L ')

  // y축 눈금 3개
  const ticks = [min, min + span / 2, max]
  // x축 라벨: 처음/중간/끝
  const xLabels = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - padL) / iw) * (data.length - 1))
    if (i >= 0 && i < data.length) setHover(i)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {ticks.map((t, k) => (
        <g key={k}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
            {formatNum(t)}
          </text>
        </g>
      ))}
      {xLabels.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
          {data[i].date}
        </text>
      ))}
      <path d={`M ${path}`} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke={color} strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={x(hover)} cy={y(data[hover].value)} r="3.5" fill={color} />
          <text x={x(hover)} y={padT + 4} textAnchor={hover > data.length / 2 ? 'end' : 'start'} fontSize="11" fontWeight="600" fill="#0f172a">
            {data[hover].date} · {formatNum(data[hover].value)}{unit ? ` ${unit}` : ''}
          </text>
        </g>
      )}
    </svg>
  )
}

function formatNum(n) {
  if (Math.abs(n) >= 10000) return n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (Math.abs(n) >= 100) return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}
