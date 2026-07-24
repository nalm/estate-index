// ETL 오케스트레이터. `npm run refresh`.
// 지표별로 소스 어댑터를 호출해 실데이터 수집 → 실패/미준비 시 목업으로 폴백.
// 산출물: public/data/snapshot.json (앱이 fetch)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { SOURCE_MAP, PROVIDER_KEY } from './mapping.mjs'
import { KEYS, ROOT } from './lib/env.mjs'
import { defaultMonths } from './lib/dates.mjs'
import { REGION_NAMES } from './lib/regions.mjs'
import { genSeries } from './lib/mock.mjs'
import { NotReady } from './lib/errors.mjs'

import * as ecos from './sources/ecos.mjs'
import * as kosis from './sources/kosis.mjs'
import * as reb from './sources/reb.mjs'
import * as subscription from './sources/subscription.mjs'
import * as kbland from './sources/kbland.mjs'
import * as movein from './sources/movein.mjs'
import * as manual from './sources/manual.mjs'
import { deriveSeries } from './sources/derived.mjs'

const ADAPTERS = { ecos, kosis, reb, subscription, kbland, movein, manual }

const __dirname = dirname(fileURLToPath(import.meta.url))
const indicators = JSON.parse(readFileSync(join(ROOT, 'src/data/indicators.json'), 'utf-8'))
const policyEvents = JSON.parse(readFileSync(join(__dirname, 'policy-events.json'), 'utf-8'))

const months = defaultMonths()
const regions = REGION_NAMES

const seriesNodes = indicators.nodes.filter((n) => n.kind === 'series')
const assembled = {}
const status = {} // id → 'live' | 'manual' | 'derived' | 'mock'
const notes = {}

// 목업 폴백 생성.
function fallback(node) {
  const rs = node.regional ? regions : ['전국']
  const s = {}
  for (const r of rs) s[r] = genSeries(node.id, r, months)
  return s
}

// 1) 파생(derived)을 제외한 지표 먼저 처리.
for (const node of seriesNodes) {
  const cfg = SOURCE_MAP[node.id]
  if (!cfg || cfg.provider === 'derived') continue

  const provider = cfg.provider
  const keyName = PROVIDER_KEY[provider]
  const key = keyName ? KEYS[keyName]() : ''

  try {
    const adapter = ADAPTERS[provider]
    if (!adapter) throw new NotReady(`알 수 없는 provider: ${provider}`)
    const data = await adapter.fetchSeries({ id: node.id, cfg, key, months, regions })
    // 유효 데이터 최소 검증
    const hasData = Object.values(data).some((arr) => Array.isArray(arr) && arr.length > 0)
    if (!hasData) throw new NotReady('수집 결과 비어있음')
    assembled[node.id] = data
    status[node.id] = provider === 'manual' ? 'manual' : 'live'
  } catch (e) {
    assembled[node.id] = fallback(node)
    status[node.id] = 'mock'
    notes[node.id] = (e instanceof NotReady ? '미준비' : '오류') + ': ' + e.message
  }
}

// 2) 파생 지표 처리 (앞서 채워진 assembled 사용).
for (const node of seriesNodes) {
  const cfg = SOURCE_MAP[node.id]
  if (!cfg || cfg.provider !== 'derived') continue
  try {
    const upstreamLive = cfg.from.every((id) => status[id] === 'live')
    const data = deriveSeries({ cfg, months, regions, assembled })
    assembled[node.id] = data
    status[node.id] = upstreamLive ? 'derived' : 'mock'
    if (!upstreamLive) notes[node.id] = '상위 지표가 목업이라 파생값도 근사'
  } catch (e) {
    assembled[node.id] = fallback(node)
    status[node.id] = 'mock'
    notes[node.id] = '파생 폴백: ' + e.message
  }
}

const liveCount = Object.values(status).filter((s) => s === 'live' || s === 'derived').length
const snapshot = {
  generatedAt: new Date().toISOString().slice(0, 10),
  mock: Object.values(status).some((s) => s === 'mock'),
  allLive: liveCount === seriesNodes.length,
  months,
  regions,
  series: assembled,
  status,
  policyEvents,
}

mkdirSync(join(ROOT, 'public/data'), { recursive: true })
writeFileSync(join(ROOT, 'public/data/snapshot.json'), JSON.stringify(snapshot), 'utf-8')

// 요약 출력
console.log(`\n스냅샷 생성 완료 → public/data/snapshot.json  (${months[0]}~${months.at(-1)})`)
const order = { live: 0, derived: 1, manual: 2, mock: 3 }
const icon = { live: '✅ 실데이터', derived: '🧮 파생', manual: '📄 수동', mock: '🟡 목업' }
for (const node of [...seriesNodes].sort((a, b) => order[status[a.id]] - order[status[b.id]])) {
  const s = status[node.id]
  console.log(`  ${icon[s].padEnd(9)} ${node.label}${notes[node.id] ? `  (${notes[node.id]})` : ''}`)
}
console.log(`\n  실데이터/파생 ${liveCount} · 수동 ${Object.values(status).filter((s) => s === 'manual').length} · 목업 ${Object.values(status).filter((s) => s === 'mock').length} / 총 ${seriesNodes.length}`)
if (!snapshot.allLive) {
  console.log('\n  ⓘ .env에 API 키를 넣고 mapping.mjs의 TODO 통계코드를 채우면 실데이터로 전환됩니다.')
}
