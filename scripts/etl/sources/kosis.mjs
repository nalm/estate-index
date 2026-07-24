// KOSIS OpenAPI 어댑터 (인허가·착공·준공·미분양·거래량·공사비).
// 문서: https://kosis.kr/openapi/  statisticsParameterData.do / statisticsData.do(getMeta)
//
// KOSIS 표는 다차원 분류(objL1..N)를 가진다. mapping에서 표별로:
//   itmId       : 측정 항목 코드
//   fixedObj    : 지역 외 분류를 '총계' 등으로 고정 { objL1:'...', objL2:'...' }
//   regionParam : 지역이 위치한 objL 파라미터명 (예: 'objL3')
//   regionObjId : 지역 분류의 OBJ_ID → getMeta로 지역코드를 자동 구성
// 를 지정한다. 지역코드는 런타임에 getMeta에서 이름 매칭으로 만든다(수기 전사 불필요).
import { buildUrl, fetchJson } from '../lib/http.mjs'
import { toYYYYMM, fromYYYYMM } from '../lib/dates.mjs'
import { assertNoTodo, NotReady } from '../lib/errors.mjs'

const DATA = 'https://kosis.kr/openapi/Param/statisticsParameterData.do'
const META = 'https://kosis.kr/openapi/statisticsData.do'

// 'YYYY-MM' → 직전 달 'YYYY-MM'
function prevMonth(ym) {
  let [y, m] = ym.split('-').map(Number)
  m -= 1
  if (m < 1) { m = 12; y -= 1 }
  return `${y}-${String(m).padStart(2, '0')}`
}

// 시도명 → 나타날 수 있는 정식/약식 표기(정확 일치용). 시군구 오탐 방지.
const REGION_ALIASES = {
  '전국': ['전국'],
  '서울': ['서울', '서울특별시'], '부산': ['부산', '부산광역시'],
  '대구': ['대구', '대구광역시'], '인천': ['인천', '인천광역시'],
  '광주': ['광주', '광주광역시'], '대전': ['대전', '대전광역시'],
  '울산': ['울산', '울산광역시'], '세종': ['세종', '세종시', '세종특별자치시'],
  '경기': ['경기', '경기도'], '강원': ['강원', '강원도', '강원특별자치도'],
  '충북': ['충북', '충청북도'], '충남': ['충남', '충청남도'],
  '전북': ['전북', '전라북도', '전북특별자치도'], '전남': ['전남', '전라남도'],
  '경북': ['경북', '경상북도'], '경남': ['경남', '경상남도'],
  '제주': ['제주', '제주도', '제주특별자치도'],
}
const ALIAS_TO_REGION = {}
for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
  for (const a of aliases) ALIAS_TO_REGION[a] = region
}

const metaCache = new Map()

// getMeta로 지역분류 코드맵 { 지역명: ITM_ID } 구성.
async function regionCodeMap(cfg, key) {
  const ck = `${cfg.orgId}|${cfg.tblId}|${cfg.regionObjId}`
  if (metaCache.has(ck)) return metaCache.get(ck)
  const url = buildUrl(META, {
    method: 'getMeta', apiKey: key, orgId: cfg.orgId, tblId: cfg.tblId,
    type: 'ITM', format: 'json', jsonVD: 'Y',
  })
  const j = await fetchJson(url)
  if (!Array.isArray(j)) throw new Error(`KOSIS getMeta: ${JSON.stringify(j).slice(0, 120)}`)
  const map = {}
  for (const x of j) {
    if (x.OBJ_ID !== cfg.regionObjId) continue
    const region = ALIAS_TO_REGION[(x.ITM_NM || '').trim()]
    if (region && !map[region]) map[region] = x.ITM_ID
  }
  metaCache.set(ck, map)
  return map
}

export async function fetchSeries({ cfg, key, months, regions }) {
  if (!key) throw new NotReady('KOSIS_API_KEY(또는 DATA_GO_KR_KEY) 없음')
  assertNoTodo(cfg, ['tblId', 'itmId'])

  // 누계 차감(decumulate)은 첫 달 계산에 직전 달 누계가 필요 → 한 달 앞당겨 조회.
  const startYm = cfg.derive === 'decumulate' ? prevMonth(months[0]) : months[0]
  const start = toYYYYMM(startYm)
  const end = toYYYYMM(months[months.length - 1])
  const targetRegions = cfg.regional ? regions : ['전국']

  let codes = null
  if (cfg.regional) {
    if (!cfg.regionObjId || !cfg.regionParam) throw new NotReady('KOSIS regionObjId/regionParam 미설정')
    codes = await regionCodeMap(cfg, key)
    const missing = targetRegions.filter((r) => !codes[r])
    if (missing.length > 5) throw new NotReady(`지역코드 매칭 실패 다수: ${missing.slice(0, 5).join(',')}…`)
  }

  const out = {}
  for (const region of targetRegions) {
    const params = {
      method: 'getList', apiKey: key, format: 'json', jsonVD: 'Y',
      orgId: cfg.orgId, tblId: cfg.tblId, prdSe: cfg.prdSe || 'M',
      startPrdDe: start, endPrdDe: end, itmId: cfg.itmId,
      ...(cfg.fixedObj || {}),
    }
    if (cfg.regional) {
      if (!codes[region]) continue
      params[cfg.regionParam] = codes[region]
    }
    const json = await fetchJson(buildUrl(DATA, params))
    // err 30 = 해당 조합 데이터 없음 → 그 지역은 빈값으로 두고 계속(전국은 nationSum이 채움).
    if (json?.err && String(json.err) !== '30') throw new Error(`KOSIS: ${json.err} ${json.errMsg || ''}`)
    const rows = Array.isArray(json) ? json : json?.row
    if (!Array.isArray(rows)) { out[region] = []; continue }

    const byDate = {}
    for (const r of rows) {
      const prd = r.PRD_DE
      if (!/^\d{6}$/.test(prd)) continue
      const v = Number(r.DT)
      if (Number.isFinite(v)) byDate[fromYYYYMM(prd)] = v
    }
    // 연중 누계 → 월계: 1월은 그대로, 그 외는 직전 달 누계와의 차.
    if (cfg.derive === 'decumulate') {
      const monthly = {}
      for (const d of Object.keys(byDate)) {
        if (d.endsWith('-01')) { monthly[d] = byDate[d]; continue }
        const prev = byDate[prevMonth(d)]
        if (Number.isFinite(prev)) monthly[d] = byDate[d] - prev
      }
      out[region] = months.map((d) => ({ date: d, value: monthly[d] })).filter((p) => Number.isFinite(p.value))
    } else {
      out[region] = months.map((d) => ({ date: d, value: byDate[d] })).filter((p) => Number.isFinite(p.value))
    }
  }

  // 전국이 표에 없는 합산형 지표(예: 미분양)는 시도 합으로 산출.
  if (cfg.nationSum && (!out['전국'] || out['전국'].length === 0)) {
    const acc = {}
    for (const [region, arr] of Object.entries(out)) {
      if (region === '전국') continue
      for (const p of arr) acc[p.date] = (acc[p.date] || 0) + p.value
    }
    out['전국'] = months.map((d) => ({ date: d, value: acc[d] })).filter((p) => Number.isFinite(p.value))
  }
  return out
}
