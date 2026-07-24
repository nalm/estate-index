// 한국부동산원 R-ONE OpenAPI 어댑터 (매매·전세 가격지수, 입주물량 등).
// 문서: https://www.reb.or.kr/r-one/portal/openapi/  SttsApiTblData.do
import { buildUrl, fetchJson } from '../lib/http.mjs'
import { toYYYYMM, fromYYYYMM } from '../lib/dates.mjs'
import { REB_CLS_ID } from '../lib/regions.mjs'
import { assertNoTodo, NotReady } from '../lib/errors.mjs'

const BASE = 'https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do'

export async function fetchSeries({ cfg, key, months, regions }) {
  if (!key) throw new NotReady('REB_RONE_KEY 없음')
  assertNoTodo(cfg, ['statblId'])

  const start = toYYYYMM(months[0])
  const end = toYYYYMM(months[months.length - 1])
  const targetRegions = cfg.regional ? regions : ['전국']
  const out = {}

  // CLS_ID 지역코드가 통계표마다 달라, 지역 매핑이 비어있으면 준비 안 됨.
  if (cfg.regional && Object.keys(REB_CLS_ID).length === 0) {
    throw new NotReady('REB_CLS_ID 지역코드 미설정 — regions.mjs에서 채워야 함')
  }

  for (const region of targetRegions) {
    const params = {
      KEY: key, Type: 'json', pIndex: 1, pSize: 1000, // R-ONE 요청당 최대 1,000건
      STATBL_ID: cfg.statblId,
      DTACYCLE_CD: cfg.cycle || 'MM',
      START_WRTTIME: start, END_WRTTIME: end,
      CLS_ID: cfg.regional ? REB_CLS_ID[region] : undefined,
      ITM_ID: cfg.itemId,
    }
    const json = await fetchJson(buildUrl(BASE, params))
    if (json?.RESULT) throw new Error(`REB: ${json.RESULT.CODE} ${json.RESULT.MESSAGE}`)
    const container = json?.SttsApiTblData
    if (!Array.isArray(container)) throw new Error('REB: 예상외 응답 형식')
    const rowsWrap = container.find((c) => c.row)?.row
    if (!Array.isArray(rowsWrap)) {
      const head = container.find((c) => c.head)
      throw new Error(`REB: 데이터 없음 ${head ? JSON.stringify(head).slice(0, 80) : ''}`)
    }
    const byDate = {}
    for (const r of rowsWrap) {
      const t = String(r.WRTTIME_IDTFR_ID || '')
      if (!/^\d{6}$/.test(t)) continue
      byDate[fromYYYYMM(t)] = Number(r.DTA_VAL)
    }
    out[region] = months.map((d) => ({ date: d, value: byDate[d] })).filter((p) => Number.isFinite(p.value))
  }
  return out
}
