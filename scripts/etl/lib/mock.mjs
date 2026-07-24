// 목업 시계열 생성기 (공용).
// gen-mock.mjs와 refresh.mjs(폴백)가 함께 사용한다.

// 지표별 목업 형태: start=시작값, endMul=종료배수, season=계절성진폭, noise=노이즈, unitAbs=절대값형(금리 등)
export const SHAPE = {
  'macro-rate':        { start: 0.5, endMul: 6.5, unitAbs: true, season: 0, noise: 0.02, floor: 0 },
  'macro-cost':        { start: 80, endMul: 1.5, season: 0, noise: 0.01 },
  'fin-lendrate':      { start: 2.7, endMul: 1.6, unitAbs: true, season: 0, noise: 0.05, floor: 0 },
  'fin-loan':          { start: 6, endMul: 0.2, season: 0.4, noise: 0.5, floor: -3 },
  'pipe-permit':       { start: 45000, endMul: 0.55, season: 0.25, noise: 0.15 },
  'pipe-start':        { start: 35000, endMul: 0.4, season: 0.25, noise: 0.18 },
  'pipe-complete':     { start: 32000, endMul: 0.85, season: 0.2, noise: 0.12 },
  'pipe-movein':       { start: 30000, endMul: 0.9, season: 0.3, noise: 0.15 },
  'pipe-unsold':       { start: 18000, endMul: 3.8, season: 0.1, noise: 0.1 },
  'flow-sentiment':    { start: 130, endMul: 0.75, season: 0.05, noise: 0.04 },
  'flow-buyer':        { start: 90, endMul: 0.45, season: 0.08, noise: 0.08 },
  'flow-volume':       { start: 90000, endMul: 0.55, season: 0.35, noise: 0.2 },
  'flow-listing':      { start: 60000, endMul: 1.9, season: 0.15, noise: 0.1 },
  'flow-subscription': { start: 12, endMul: 0.8, season: 0.3, noise: 0.5, floor: 0 },
  'price-sale':        { start: 95, endMul: 1.08, season: 0.02, noise: 0.015 },
  'price-jeonse':      { start: 96, endMul: 1.05, season: 0.02, noise: 0.02 },
  'price-ratio':       { start: 68, endMul: 0.95, season: 0.02, noise: 0.02 },
}

// 지역 배수(전국=1). 물량형 지표만 적용.
export const REGION_MUL = {
  '전국': 1, '서울': 0.22, '부산': 0.07, '대구': 0.05, '인천': 0.06,
  '광주': 0.03, '대전': 0.03, '울산': 0.02, '세종': 0.01, '경기': 0.28,
  '강원': 0.03, '충북': 0.03, '충남': 0.04, '전북': 0.03, '전남': 0.03,
  '경북': 0.04, '경남': 0.05, '제주': 0.01,
}

function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// months: ['2021-08', ...] 형태의 월 배열
export function genSeries(id, region, months) {
  const shp = SHAPE[id] || { start: 100, endMul: 1, season: 0, noise: 0.05 }
  const rng = makeRng(hash(id + region))
  const isCount = !shp.unitAbs && shp.start > 500
  const mul = region === '전국' ? 1 : isCount ? (REGION_MUL[region] || 0.03) : 1
  const startV = shp.start * mul
  const endV = startV * shp.endMul
  const regionPhase = rng() * Math.PI * 2
  const N = months.length
  return months.map((date, i) => {
    const t = i / (N - 1)
    const ease = t * t * (3 - 2 * t)
    const base = startV + (endV - startV) * ease
    const season = 1 + shp.season * Math.sin((i / 12) * Math.PI * 2 + regionPhase)
    const noise = 1 + (rng() - 0.5) * 2 * shp.noise
    let v = base * season * noise
    if (shp.floor !== undefined && v < shp.floor) v = shp.floor
    const round = shp.unitAbs ? 2 : v > 1000 ? 0 : 1
    return { date, value: Number(v.toFixed(round)) }
  })
}
