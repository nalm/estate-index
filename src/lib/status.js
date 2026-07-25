// 데이터 출처 상태 메타 (snapshot.status 값 → 표시).
export const STATUS_META = {
  live:    { short: '실', label: '실데이터', color: '#15803d', bg: '#dcfce7' },
  derived: { short: '산', label: '파생',     color: '#0e7490', bg: '#cffafe' },
  manual:  { short: '수', label: '수동',     color: '#b45309', bg: '#fef3c7' },
  mock:    { short: '목', label: '목업',     color: '#64748b', bg: '#f1f5f9' },
  // 공개 데이터가 존재하지 않는 지표 — 목업으로 채우지 않고 빈 값으로 둔다.
  unavailable: { short: '−', label: '데이터 없음', color: '#94a3b8', bg: '#f8fafc' },
}

export const STATUS_ORDER = ['live', 'derived', 'manual', 'mock', 'unavailable']

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.mock
}
