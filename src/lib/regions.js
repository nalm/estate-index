// 전국 + 시도 17개. code는 향후 ETL에서 통계 API 지역코드 매핑에 사용.
export const REGIONS = [
  { code: '00', name: '전국' },
  { code: '11', name: '서울' },
  { code: '26', name: '부산' },
  { code: '27', name: '대구' },
  { code: '28', name: '인천' },
  { code: '29', name: '광주' },
  { code: '30', name: '대전' },
  { code: '31', name: '울산' },
  { code: '36', name: '세종' },
  { code: '41', name: '경기' },
  { code: '51', name: '강원' },
  { code: '43', name: '충북' },
  { code: '44', name: '충남' },
  { code: '52', name: '전북' },
  { code: '46', name: '전남' },
  { code: '47', name: '경북' },
  { code: '48', name: '경남' },
  { code: '50', name: '제주' },
]

export const REGION_NAMES = REGIONS.map((r) => r.name)
export const DEFAULT_REGION = '전국'
