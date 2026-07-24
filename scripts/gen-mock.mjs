// 목업 snapshot 생성기 (1단계 UI 검증용).
// 실제 ETL(scripts/etl/refresh.mjs, 2단계)로 대체될 산출물과 동일한 형식을 만든다.
// 실행: node scripts/gen-mock.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const indicators = JSON.parse(
  readFileSync(join(root, 'src/data/indicators.json'), 'utf-8'),
)

const REGIONS = [
  '전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

// 최근 5년 = 60개월. 기준월(오늘 기준 currentDate 2026-07)에서 역산.
const MONTHS = 60
const END = { y: 2026, m: 6 } // 2026-07 데이터 미확정 가정 → 6월까지
function monthList() {
  const out = []
  let y = END.y
  let m = END.m
  for (let i = 0; i < MONTHS; i++) {
    out.unshift(`${y}-${String(m + 1).padStart(2, '0')}`)
    m -= 1
    if (m < 0) { m = 11; y -= 1 }
  }
  return out
}
const months = monthList()

// 결정적 의사난수(시드) — 실행마다 동일한 목업 생성.
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

// 지표별 목업 형태 정의: [시작값, 종료값 배수, 계절성진폭, 노이즈]
const SHAPE = {
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

// 지역 배수(전국=1). 서울/경기 크고 세종/제주 작게.
const REGION_MUL = {
  '전국': 1, '서울': 0.22, '부산': 0.07, '대구': 0.05, '인천': 0.06,
  '광주': 0.03, '대전': 0.03, '울산': 0.02, '세종': 0.01, '경기': 0.28,
  '강원': 0.03, '충북': 0.03, '충남': 0.04, '전북': 0.03, '전남': 0.03,
  '경북': 0.04, '경남': 0.05, '제주': 0.01,
}

function genSeries(id, region) {
  const shp = SHAPE[id] || { start: 100, endMul: 1, season: 0, noise: 0.05 }
  const rng = makeRng(hash(id + region))
  // 지수·비율·금리류는 지역별 절대수준이 비슷 → 배수 미적용. 물량류만 배수 적용.
  const isCount = !shp.unitAbs && shp.start > 500
  const mul = region === '전국' ? 1 : isCount ? (REGION_MUL[region] || 0.03) : 1
  const startV = shp.start * mul
  const endV = startV * shp.endMul
  const regionPhase = rng() * Math.PI * 2
  return months.map((date, i) => {
    const t = i / (MONTHS - 1)
    // S자 완만한 전이 + 계절성 + 노이즈
    const ease = t * t * (3 - 2 * t)
    let base = startV + (endV - startV) * ease
    const season = 1 + shp.season * Math.sin((i / 12) * Math.PI * 2 + regionPhase)
    const noise = 1 + (rng() - 0.5) * 2 * shp.noise
    let v = base * season * noise
    if (shp.floor !== undefined && v < shp.floor) v = shp.floor
    const round = shp.unitAbs ? 2 : v > 1000 ? 0 : 1
    return { date, value: Number(v.toFixed(round)) }
  })
}

const series = {}
for (const node of indicators.nodes) {
  if (node.kind !== 'series') continue
  const regions = node.regional ? REGIONS : ['전국']
  series[node.id] = {}
  for (const r of regions) series[node.id][r] = genSeries(node.id, r)
}

// 정책 이벤트 목업 (타임라인용). 실제 이벤트로 대체 예정.
const policyEvents = [
  { id: 'pe1', nodeId: 'policy-fin', date: '2022-07', title: 'DSR 3단계 확대', direction: 'tighten', note: '차주단위 DSR 40% 전면 적용' },
  { id: 'pe2', nodeId: 'macro-rate', date: '2022-10', title: '기준금리 3.0%', direction: 'tighten', note: '빅스텝 — PF·수요 동반 위축 방아쇠' },
  { id: 'pe3', nodeId: 'policy-tax', date: '2023-01', title: '양도세 중과 한시 배제 연장', direction: 'ease', note: '다주택 매물 출회 유도' },
  { id: 'pe4', nodeId: 'policy-supply', date: '2023-09', title: '9·26 공급 활성화', direction: 'ease', note: '공공·정비사업 속도전' },
  { id: 'pe5', nodeId: 'policy-fin', date: '2024-09', title: '스트레스 DSR 2단계', direction: 'tighten', note: '수도권 가산금리 상향' },
  { id: 'pe6', nodeId: 'macro-rate', date: '2024-10', title: '기준금리 인하 개시', direction: 'ease', note: '3.5%→3.25% 피벗' },
]

const snapshot = {
  generatedAt: '2026-07-24',
  mock: true,
  months,
  regions: REGIONS,
  series,
  policyEvents,
}

mkdirSync(join(root, 'public/data'), { recursive: true })
writeFileSync(
  join(root, 'public/data/snapshot.json'),
  JSON.stringify(snapshot),
  'utf-8',
)
const cells = Object.values(series).reduce(
  (a, s) => a + Object.keys(s).length, 0)
console.log(`✓ snapshot.json 생성: ${Object.keys(series).length}개 지표, ${cells}개 지역-시계열, ${months.length}개월(${months[0]}~${months.at(-1)})`)
