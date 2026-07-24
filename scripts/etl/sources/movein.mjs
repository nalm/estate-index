// 입주예정물량 어댑터 (공공데이터포털 파일데이터 API, 한국부동산원).
// 데이터셋 15111714: 단지별 [지역(시도), 입주예정월, 세대수] → 시도·월별 합산.
// ⚠️ 이 데이터는 과거 실적이 아닌 "향후 입주예정" 물량 (반기 갱신).
//    시계열 축도 미래(당월~+12개월)로 저장한다 — 입주 절벽/폭탄 예고 지표.
// 파일 재등록 시 uddi가 바뀔 수 있어 OAS에서 경로를 동적으로 조회한다.
import { fetchJson } from '../lib/http.mjs'
import { NotReady } from '../lib/errors.mjs'

const NAMESPACE = '15111714/v1'
const OAS = `https://infuser.odcloud.kr/oas/docs?namespace=${NAMESPACE}`
const API = 'https://api.odcloud.kr/api'

const REGION_ALIAS = {
  '전국': '전국', '서울': '서울', '부산': '부산', '대구': '대구', '인천': '인천',
  '광주': '광주', '대전': '대전', '울산': '울산', '세종': '세종',
  '경기': '경기', '강원': '강원', '충북': '충북', '충남': '충남',
  '전북': '전북', '전남': '전남', '경북': '경북', '경남': '경남', '제주': '제주',
}

async function resolvePath() {
  const spec = await fetchJson(OAS)
  const paths = Object.keys(spec?.paths || {})
  if (!paths.length) throw new NotReady('입주예정물량 OAS에서 uddi 경로를 찾지 못함')
  return paths[0] // '/15111714/v1/uddi:...'
}

export async function fetchSeries({ cfg, key, months }) {
  if (!key) throw new NotReady('DATA_GO_KR_KEY 없음')
  const path = await resolvePath()

  // 전체 행 수집 (수백 행 규모 — perPage 크게 한 번, 모자라면 페이지네이션)
  const rows = []
  for (let page = 1; page <= 10; page++) {
    const u = new URL(API + path)
    u.searchParams.set('page', String(page))
    u.searchParams.set('perPage', '1000')
    u.searchParams.set('serviceKey', key)
    const j = await fetchJson(u.toString())
    const data = j?.data || []
    rows.push(...data)
    if (rows.length >= (j?.totalCount || 0) || data.length === 0) break
  }
  if (!rows.length) throw new NotReady('입주예정물량 응답 비어있음 (활용신청 반영 대기?)')

  // 시도·월별 세대수 합산
  const byRegion = {}
  for (const r of rows) {
    const region = REGION_ALIAS[(r['지역'] || '').trim()]
    const ym = String(r['입주예정월'] || '').slice(0, 7) // 'YYYY-MM'
    const n = Number(r['세대수'])
    if (!region || !/^\d{4}-\d{2}$/.test(ym) || !Number.isFinite(n)) continue
    ;((byRegion[region] ||= {})[ym] ||= 0)
    byRegion[region][ym] += n
  }

  // 미래 12개월 축: 스냅샷 마지막 월(=당월)부터 +12개월
  const horizon = []
  {
    let [y, m] = months[months.length - 1].split('-').map(Number)
    for (let i = 0; i < 13; i++) {
      horizon.push(`${y}-${String(m).padStart(2, '0')}`)
      m += 1
      if (m > 12) { m = 1; y += 1 }
    }
  }

  const out = {}
  for (const [region, byYm] of Object.entries(byRegion)) {
    out[region] = horizon.map((d) => ({ date: d, value: byYm[d] ?? 0 }))
  }
  // 전국 = 시도 합
  const acc = {}
  for (const [region, arr] of Object.entries(out)) {
    if (region === '전국') continue
    for (const p of arr) acc[p.date] = (acc[p.date] || 0) + p.value
  }
  out['전국'] = horizon.map((d) => ({ date: d, value: acc[d] || 0 }))
  return out
}
