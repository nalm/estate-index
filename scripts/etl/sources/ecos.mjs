// 한국은행 ECOS 어댑터 (전국 단위 지표).
// 문서: https://ecos.bok.or.kr/api/  StatisticSearch
import { buildPath, fetchJson } from '../lib/http.mjs'
import { toYYYYMM, fromYYYYMM } from '../lib/dates.mjs'
import { assertNoTodo, NotReady } from '../lib/errors.mjs'

const BASE = 'https://ecos.bok.or.kr/api/StatisticSearch'

export async function fetchSeries({ cfg, key, months }) {
  if (!key) throw new NotReady('ECOS_API_KEY 없음')
  assertNoTodo(cfg, ['statCode'])

  const start = toYYYYMM(months[0])
  const end = toYYYYMM(months[months.length - 1])
  const seg = [key, 'json', 'kr', '1', '100000', cfg.statCode, cfg.cycle || 'M', start, end]
  if (cfg.itemCode1 && cfg.itemCode1 !== 'TODO') seg.push(cfg.itemCode1)

  const json = await fetchJson(buildPath(BASE, seg))
  if (json.RESULT) throw new Error(`ECOS: ${json.RESULT.CODE} ${json.RESULT.MESSAGE}`)
  const rows = json?.StatisticSearch?.row
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('ECOS: 빈 응답')

  const scale = cfg.scale || 1 // 단위 변환 (예: 십억원→조원 = 0.001)
  const byDate = {}
  for (const r of rows) {
    // TIME이 YYYYMM(월) 형태라고 가정. 분기/연 주기는 별도 처리 필요.
    if (!/^\d{6}$/.test(r.TIME)) continue
    byDate[fromYYYYMM(r.TIME)] = Number(r.DATA_VALUE) * scale
  }
  let series = months.map((d) => ({ date: d, value: byDate[d] })).filter((p) => Number.isFinite(p.value))

  if (cfg.derive === 'diff') series = toMonthlyDiff(series)
  return { 전국: series }
}

// 잔액 시계열 → 월간 증감.
function toMonthlyDiff(series) {
  const out = []
  for (let i = 1; i < series.length; i++) {
    out.push({ date: series[i].date, value: Number((series[i].value - series[i - 1].value).toFixed(2)) })
  }
  return out
}
