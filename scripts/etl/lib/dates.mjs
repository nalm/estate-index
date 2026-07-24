// 월 범위 유틸. 스냅샷 시계열의 공통 x축을 만든다.

// end(포함)로부터 count개월치 'YYYY-MM' 배열 (오름차순).
export function monthRange(endYear, endMonth1, count) {
  const out = []
  let y = endYear
  let m = endMonth1 - 1 // 0-index
  for (let i = 0; i < count; i++) {
    out.unshift(`${y}-${String(m + 1).padStart(2, '0')}`)
    m -= 1
    if (m < 0) { m = 11; y -= 1 }
  }
  return out
}

// 'YYYY-MM' → 'YYYYMM' (ECOS/KOSIS/REB 공통 period 포맷)
export const toYYYYMM = (ym) => ym.replace('-', '')
export const fromYYYYMM = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}`

// 최근 5년(60개월) 기본 범위. 확정월은 refresh 실행 시점 기준으로 조정.
export function defaultMonths(endYear = 2026, endMonth1 = 7, count = 60) {
  return monthRange(endYear, endMonth1, count)
}
