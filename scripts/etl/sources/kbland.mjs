// KB부동산 데이터허브 어댑터 (매수우위지수 등).
// ⚠️ 비공식: KB 웹사이트(data.kbland.kr)가 내부적으로 쓰는 공개 JSON API.
//    인증키 불필요. 구조가 예고 없이 바뀔 수 있음 → 실패 시 refresh가 목업 폴백.
// 참고: PublicDataReader 라이브러리도 동일 엔드포인트 사용.
import { fetchJson } from '../lib/http.mjs'
import { NotReady } from '../lib/errors.mjs'

const BASE = 'https://data-api.kbland.kr/bfmstat/weekMnthlyHuseTrnd/maktTrnd'

// KB 지역명 → 우리 시도명 (KB는 약식 표기 사용)
const KB_REGION = {
  '전국': '전국', '서울': '서울', '부산': '부산', '대구': '대구', '인천': '인천',
  '광주': '광주', '대전': '대전', '울산': '울산', '세종': '세종',
  '경기': '경기', '강원': '강원', '충북': '충북', '충남': '충남',
  '전북': '전북', '전남': '전남', '경북': '경북', '경남': '경남', '제주': '제주',
}

export async function fetchSeries({ cfg, months }) {
  const url = new URL(BASE)
  url.searchParams.set('메뉴코드', cfg.menuCode || '01') // 01 = 매수우위지수
  url.searchParams.set('월간주간구분코드', '01') // 월간
  const json = await fetchJson(url.toString())

  const list = json?.dataBody?.data?.데이터리스트
  if (!Array.isArray(list) || list.length === 0) throw new NotReady('KB 응답 구조 변경 의심 (데이터리스트 없음)')

  const field = cfg.valueField || '매수우위지수'
  const wanted = new Set(months)
  const out = {}
  for (const item of list) {
    const region = KB_REGION[(item.지역명 || '').trim()]
    if (!region || out[region]) continue
    const series = []
    for (const p of item.dataList || []) {
      const ym = String(p.기준날짜 || '')
      if (!/^\d{6}/.test(ym)) continue
      const date = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`
      const v = Number(p[field])
      if (wanted.has(date) && Number.isFinite(v)) series.push({ date, value: Number(v.toFixed(1)) })
    }
    if (series.length) out[region] = series
  }
  if (!out['전국']) throw new NotReady('KB 전국 시계열 없음 (구조 변경 의심)')
  return out
}
