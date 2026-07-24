// 5개 층위 메타. React Flow 노드는 동적 클래스가 purge되므로 색상은 JS 값으로 사용.
export const LAYER_META = {
  policy:     { name: '정책',  color: '#2563eb', soft: '#dbeafe' },
  macro:      { name: '거시',  color: '#92400e', soft: '#f5e6d8' },
  leading:    { name: '선행',  color: '#16a34a', soft: '#dcfce7' },
  coincident: { name: '동행',  color: '#d97706', soft: '#fef3c7' },
  lagging:    { name: '후행',  color: '#dc2626', soft: '#fee2e2' },
}

export const LAYER_ORDER = ['policy', 'macro', 'leading', 'coincident', 'lagging']
