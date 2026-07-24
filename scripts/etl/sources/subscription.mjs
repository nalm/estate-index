// 청약홈 경쟁률 어댑터 (공공데이터포털 odcloud).
// 두 서비스를 조인해 시도·월별 1순위 가중 경쟁률을 집계한다:
//   분양정보(ApplyhomeInfoDetailSvc): HOUSE_MANAGE_NO → 지역(시도)·모집공고월
//   경쟁률(ApplyhomeInfoCmpetRtSvc):  HOUSE_MANAGE_NO × 주택형 × 순위별 접수/공급
// 경쟁률 = Σ접수건수 ÷ Σ공급세대수 (단지 평균이 아닌 가중 집계 — 대단지 왜곡 방지)
import { fetchJson } from '../lib/http.mjs'
import { NotReady } from '../lib/errors.mjs'

const DETAIL = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail'
const CMPET = 'https://api.odcloud.kr/api/ApplyhomeInfoCmpetRtSvc/v1/getAPTLttotPblancCmpet'
const PER_PAGE = 1000 // odcloud 요청당 최대 1,000행

async function fetchAll(base, key, cond = {}) {
  const rows = []
  for (let page = 1; page <= 100; page++) {
    const u = new URL(base)
    u.searchParams.set('page', String(page))
    u.searchParams.set('perPage', String(PER_PAGE))
    u.searchParams.set('serviceKey', key)
    for (const [k, v] of Object.entries(cond)) u.searchParams.set(k, v)
    const j = await fetchJson(u.toString())
    const data = j?.data || []
    rows.push(...data)
    const total = j?.matchCount ?? j?.totalCount ?? 0
    if (data.length < PER_PAGE || (total && rows.length >= total)) break
  }
  return rows
}

export async function fetchSeries({ cfg, key, months }) {
  if (!key) throw new NotReady('DATA_GO_KR_KEY 없음')

  // 1) 분양정보: 단지 → {지역, 공고월}
  const details = await fetchAll(DETAIL, key)
  if (!details.length) throw new NotReady('분양정보 응답 비어있음 (활용신청 반영 대기?)')
  const meta = {}
  for (const d of details) {
    const no = d.HOUSE_MANAGE_NO
    const region = (d.SUBSCRPT_AREA_CODE_NM || '').trim()
    const ym = String(d.RCRIT_PBLANC_DE || '').slice(0, 7) // 'YYYY-MM'
    if (no && region && /^\d{4}-\d{2}$/.test(ym)) meta[no] = { region, ym }
  }

  // 2) 경쟁률: 1순위(SUBSCRPT_RANK_CODE=1)만 — 표준 '1순위 경쟁률'
  const cmpet = await fetchAll(CMPET, key, { 'cond[SUBSCRPT_RANK_CODE::EQ]': '1' })
  if (!cmpet.length) throw new NotReady('경쟁률 응답 비어있음')

  // 3) 지역·월별 Σ접수/Σ공급
  const acc = {} // region → ym → {req, sup}
  for (const c of cmpet) {
    const m = meta[c.HOUSE_MANAGE_NO]
    if (!m) continue
    const req = Number(String(c.REQ_CNT).replace(/,/g, ''))
    const sup = Number(c.SUPLY_HSHLDCO)
    if (!Number.isFinite(req) || !Number.isFinite(sup) || sup <= 0) continue
    const slot = ((acc[m.region] ||= {})[m.ym] ||= { req: 0, sup: 0 })
    slot.req += req
    slot.sup += sup
    const nat = ((acc['전국'] ||= {})[m.ym] ||= { req: 0, sup: 0 })
    nat.req += req
    nat.sup += sup
  }
  if (!acc['전국']) throw new NotReady('경쟁률-분양정보 조인 결과 없음')

  const out = {}
  for (const [region, byYm] of Object.entries(acc)) {
    out[region] = months
      .map((d) => {
        const s = byYm[d]
        if (!s || s.sup <= 0) return null
        return { date: d, value: Number((s.req / s.sup).toFixed(1)) }
      })
      .filter(Boolean)
  }
  return out
}
