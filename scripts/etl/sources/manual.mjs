// 수동 CSV 어댑터 (공개 API 없는 지표: 매물량 등).
// 파일: scripts/etl/manual/{id}.csv — mapping의 `manualFile`로 다른 파일명 지정 가능
//       (원본 내려받은 파일명을 그대로 두고 쓸 수 있게. 복사본을 만들면 갱신 시 어긋남)
// 형식(롱): date,region,value   예) 2024-01,서울,88.3
//   - 헤더 필수. region 생략 시 '전국'으로 간주.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { NotReady } from '../lib/errors.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANUAL_DIR = join(__dirname, '..', 'manual')

export function manualPath(id, file) {
  return join(MANUAL_DIR, file || `${id}.csv`)
}

export async function fetchSeries({ id, cfg, months, regions }) {
  const file = cfg?.manualFile || `${id}.csv`
  const path = manualPath(id, cfg?.manualFile)
  if (!existsSync(path)) throw new NotReady(`수동 파일 없음: manual/${file}`)

  const text = readFileSync(path, 'utf-8').trim()
  const lines = text.split(/\r?\n/)
  const header = lines.shift().split(',').map((s) => s.trim().toLowerCase())
  const di = header.indexOf('date')
  const ri = header.indexOf('region')
  const vi = header.indexOf('value')
  if (di < 0 || vi < 0) throw new Error(`manual/${file}: date,value 헤더 필요`)

  // 신뢰할 수 없는 구간 제외 규칙. 원본 CSV는 손대지 않으므로
  // 나중에 같은 파일을 다시 내려받아 덮어써도 제외가 유지된다.
  // 형식: [{ region: '광주', before: '2022-03' }, ...]  (before/after 는 'YYYY-MM', 경계 미포함)
  const excludes = cfg?.exclude || []
  const isExcluded = (region, date) =>
    excludes.some((x) =>
      (!x.region || x.region === region) &&
      (!x.before || date < x.before) &&
      (!x.after || date > x.after))

  const byRegion = {}
  let excluded = 0
  for (const line of lines) {
    if (!line.trim()) continue
    const c = line.split(',')
    const date = c[di]?.trim()
    const region = ri >= 0 ? (c[ri]?.trim() || '전국') : '전국'
    const value = Number(c[vi])
    if (!date || !Number.isFinite(value)) continue
    if (isExcluded(region, date)) { excluded++; continue }
    ;(byRegion[region] ||= {})[date] = value
  }
  if (Object.keys(byRegion).length === 0) throw new NotReady(`manual/${file} 비어있음`)
  if (excluded) console.log(`    ↳ manual/${file}: 신뢰구간 제외 ${excluded}행`)

  const out = {}
  const target = Object.keys(byRegion)
  for (const region of target) {
    out[region] = months
      .map((d) => ({ date: d, value: byRegion[region][d] }))
      .filter((p) => Number.isFinite(p.value))
  }
  return out
}
