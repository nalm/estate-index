// 파생 지표 어댑터 (다른 지표로부터 계산). 예: 전세가율.
// 다른 소스가 먼저 채워진 뒤 실행되므로 assembled(누적 series)를 입력받는다.
import { NotReady } from '../lib/errors.mjs'

export function deriveSeries({ cfg, months, regions, assembled }) {
  if (cfg.op === 'ratio-pct') {
    const [numId, denId] = cfg.from
    const num = assembled[numId]
    const den = assembled[denId]
    if (!num || !den) throw new NotReady(`파생 소스(${cfg.from.join(',')}) 아직 없음`)

    const targetRegions = cfg.regional ? regions : ['전국']
    const out = {}
    for (const region of targetRegions) {
      const ns = num[region] || num['전국']
      const ds = den[region] || den['전국']
      if (!ns || !ds) continue
      const dMap = Object.fromEntries(ds.map((p) => [p.date, p.value]))
      // 지수비 × base(기준 전세가율). 지수는 동일 기준시점이라 비율이 근사치로 성립.
      out[region] = ns
        .map((p) => {
          const dv = dMap[p.date]
          if (!Number.isFinite(dv) || dv === 0) return null
          return { date: p.date, value: Number(((p.value / dv) * (cfg.base || 100)).toFixed(1)) }
        })
        .filter(Boolean)
    }
    if (Object.keys(out).length === 0) throw new NotReady('파생 계산 결과 없음')
    return out
  }
  throw new NotReady(`알 수 없는 파생 연산: ${cfg.op}`)
}
