// 지표(nodeId) → 데이터 소스 매핑.
// API별 통계코드는 앱 번들과 분리(여기 집중). 실 연동 전까지 codes는 후보/미검증.
//
// ⚠️ verified:false 항목의 statCode/statblId/tblId는 "추정 후보"입니다.
//    실 연동 시 각 API 문서·조회도구로 반드시 검증 후 verified:true 로 바꾸세요.
//
// provider: 'ecos' | 'kosis' | 'reb' | 'subscription' | 'manual'

export const SOURCE_MAP = {
  // ── 한국은행 ECOS (전국 단위) ─────────────────────────────
  'macro-rate': {
    provider: 'ecos', cycle: 'M', verified: true,
    statCode: '722Y001', itemCode1: '0101000', // 한국은행 기준금리 (월간, 199905~)
    note: '한국은행 기준금리',
  },
  'macro-cost': {
    provider: 'kosis', regional: false, verified: true,
    orgId: '397', tblId: 'DT_39701_A003', prdSe: 'M',
    itmId: '16397AAA0', // 건설공사비지수
    fixedObj: { objL1: '15397AA2AA' }, // 업종별=건설(총지수)
    note: '건설공사비지수(2020=100, 총지수)',
  },
  'fin-lendrate': {
    provider: 'ecos', cycle: 'M', verified: true,
    statCode: '121Y006', itemCode1: 'BECBLA0302', // 예금은행 대출금리(신규취급) > 주택담보대출
    note: '예금은행 주택담보대출 가중평균금리(신규취급액)',
  },
  'fin-loan': {
    provider: 'ecos', cycle: 'M', verified: true,
    statCode: '151Y002', itemCode1: '1110000', // 예금취급기관 가계대출(월, 총계) 잔액
    derive: 'diff', // 잔액 → 월간 증감
    scale: 0.001, // 십억원 → 조원
    note: '가계대출(예금취급기관) 잔액의 월간 증감',
  },

  // ── KOSIS(통계누리·공공데이터포털) — 시도별 ────────────────
  // 인허가: 월계 표가 없어 '월별 누계'(DT_MLTM_1946)를 연중 차감(decumulate)해 월계로 변환.
  // 1월 리셋 확인(2025-12: 379,834 → 2026-01: 16,531).
  'pipe-permit': {
    provider: 'kosis', regional: true, verified: true,
    orgId: '116', tblId: 'DT_MLTM_1946', prdSe: 'M',
    itmId: '13103871089T1', // 인허가실적(누계)
    fixedObj: { objL1: '13102871089A.0001', objL2: '13102871089B.0001' }, // 구분=총계, 부문=총계
    regionParam: 'objL3', regionObjId: '13101871089C',
    derive: 'decumulate', // 연중 누계 → 월계
    note: '주택 인허가실적(월별 누계→월계 차감, 시도)',
  },
  'pipe-start': {
    provider: 'kosis', regional: true, verified: true,
    orgId: '116', tblId: 'DT_MLTM_5386', prdSe: 'M',
    itmId: '13103766971T1', // 착공실적
    fixedObj: { objL1: '13102766971A.0001', objL2: '13102766971B.0001' }, // 구분=총계, 부문명=총계
    regionParam: 'objL3', regionObjId: '13101766971C', // 시도별 OBJ_ID (항목ID는 13102…C.NNNN)
    note: '주택 착공실적(월계, 시도)',
  },
  'pipe-complete': {
    provider: 'kosis', regional: true, verified: true,
    orgId: '116', tblId: 'DT_MLTM_5372', prdSe: 'M',
    itmId: '13103766972T1', // 사용검사(준공)실적
    fixedObj: { objL1: '13102766972A.0001', objL2: '13102766972B.0001' }, // 구분=총계, 부문명=총계
    regionParam: 'objL3', regionObjId: '13101766972C',
    note: '주택 준공(사용검사)실적(월계, 시도)',
  },
  // 미분양: 시도(구분) × 시군구=계. 전국은 표에 없어 시도 합으로 산출(nationSum).
  'pipe-unsold': {
    provider: 'kosis', regional: true, verified: true,
    orgId: '116', tblId: 'DT_MLTM_2082', prdSe: 'M',
    itmId: '13103871087T1', // 미분양현황
    fixedObj: { objL2: '13102871087B.0001' }, // 시군구=계
    regionParam: 'objL1', regionObjId: '13101871087A', // 구분=시도
    nationSum: true, // 전국 = 17개 시도 합
    note: '미분양주택현황(월, 시도) — 전국은 시도 합산',
  },
  'flow-volume': {
    provider: 'kosis', regional: true, verified: true,
    orgId: '408', tblId: 'DT_408_2006_S0061', prdSe: 'M',
    itmId: '13103114445T1', // 동(호)수
    fixedObj: { objL2: '13102114445B.0001' }, // 유형별=주택유형(전체)
    regionParam: 'objL1', regionObjId: '13101114445A', // 행정구역별
    note: '주택매매거래현황(월, 시도)',
  },

  // ── 부동산원 R-ONE — 시도별 ────────────────────────────────
  'price-sale':   { provider: 'reb', cycle: 'MM', regional: true, verified: true, statblId: 'A_2024_00016', itemId: '100001', note: '매매가격지수_주택종합(월간, 시도)' },
  'price-jeonse': { provider: 'reb', cycle: 'MM', regional: true, verified: true, statblId: 'A_2024_00019', itemId: '100001', note: '전세가격지수_주택종합(월간, 시도)' },
  // 입주물량: 공공데이터포털 15111714 '주택공급정보_입주예정물량정보' (단지별, 반기 갱신).
  // 과거 실적이 아닌 미래 예정 물량 → 당월~+12개월 축으로 시도·월 합산 저장.
  'pipe-movein': {
    provider: 'movein', regional: true, verified: true,
    note: '아파트 입주예정물량(시도·월 합산, 향후 12개월) — 반기 갱신',
  },
  // 전세가율: 별도 API 없이 매매·전세 지수로 파생 계산.
  'price-ratio':  { provider: 'derived', regional: true, from: ['price-jeonse', 'price-sale'], op: 'ratio-pct', base: 68, note: '전세가율 = 전세÷매매 (지수 기반 근사)' },

  // ── 청약홈 (공공데이터포털 API) ────────────────────────────
  'flow-subscription': {
    provider: 'subscription', regional: true, verified: true,
    note: '청약 1순위 경쟁률 — 분양정보×경쟁률 조인, 시도·월별 Σ접수/Σ공급 가중 집계',
  },

  // ── 소비심리: 국토연구원 → KOSIS 정식 수록 (재조사로 발견) ──
  'flow-sentiment': {
    provider: 'kosis', regional: true, verified: true,
    orgId: '390', tblId: 'DT_39002_01', prdSe: 'M',
    itmId: 'T1', // 부동산시장소비심리지수
    regionParam: 'objL1', regionObjId: 'A', // 시도별 (K01 전국, K0203 서울 …)
    note: '부동산시장 소비심리지수(월, 시도)',
  },

  // ── KB 매수우위지수: 비공식 공개 API (data-api.kbland.kr) ──
  'flow-buyer': {
    provider: 'kbland', regional: true, verified: true,
    menuCode: '01', valueField: '매수우위지수',
    note: 'KB 매수우위지수(월간) — 비공식 API, 실패 시 목업 폴백',
  },

  // ── 공개 API 없음 → 수동 CSV (scripts/etl/manual/{id}.csv) ──
  // 매물량은 신고의무가 없어 공공통계로 존재하지 않는다.
  // 전수 확인(2026-07-25): KOSIS·KB(메뉴 01~08)·R-ONE(738표)·공공데이터포털 모두 없음.
  // 민간(아실·네이버 부동산)은 robots.txt가 `User-agent: * / Disallow: /`로 봇 접근을
  // 명시 거부 → 자동 수집하지 않는다. 수동 CSV만 유효한 경로.
  'flow-listing': {
    provider: 'manual', regional: true, noPublicSource: true,
    manualFile: 'asil_offer_counts_2021-01_2026-06.csv', // 아실 매물 건수 집계 (전국+시도17, 2021-01~2026-06)
    // 아실의 광주 수집이 2022-03부터 정상화됨(2022-02: 4,745 → 2022-03: 12,356, +160%).
    // 그 이전은 과소집계 — 10만 가구당 19건으로 동급 도시(대전 67·대구 119)의 1/3 수준.
    // 잘못된 값보다 없는 값이 낫다는 원칙에 따라 제외한다.
    // 단, 원본의 '전국'은 광주를 포함한 합계이므로 2022-02 이전 전국은 약 2.7% 과소.
    // 전국을 함께 제외하면 주계열 7개월이 사라져 손실이 더 크므로 그대로 둔다.
    exclude: [{ region: '광주', before: '2022-03' }],
    note: '매물량 — 공개 API 없음(신고의무 없는 지표). 아실 집계를 수동 입력 (광주는 2022-03부터)',
  },
}

// provider별 필요한 키. 키 없으면 refresh가 폴백 처리.
export const PROVIDER_KEY = {
  ecos: 'ecos',
  kosis: 'kosis',
  subscription: 'dataGoKr',
  reb: 'reb',
  kbland: null, // 비공식 공개 API, 키 불필요
  movein: 'dataGoKr',
  manual: null,
  derived: null,
}
