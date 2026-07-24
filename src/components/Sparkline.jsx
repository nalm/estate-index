// 의존성 없는 미니 SVG 스파크라인.
export default function Sparkline({ data, color = '#334155', width = 120, height = 32 }) {
  if (!data || data.length < 2) return null
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const y = (v) => height - ((v - min) / span) * (height - 4) - 2
  const points = values.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
  const d = `M ${points.join(' L ')}`
  const lastX = (values.length - 1) * stepX
  const lastY = y(values[values.length - 1])
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.2" fill={color} />
    </svg>
  )
}
