# 부동산 지표 지도 (estate-index)

부동산 시장 지표들의 **인과관계**를 한 눈에 보고, 각 지표의 실데이터 추세를 지역별로 조망하는 싱글페이지 웹앱.

**Live**: https://nalm.github.io/estate-index/ (main 푸시 시 GitHub Actions로 자동 배포)

> 데이터 갱신: 로컬에서 `npm run refresh` 실행(API 키 필요) → `public/data/snapshot.json` 커밋·푸시하면 사이트에 반영된다.

## 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 정적 빌드 → dist/
npm run gen:mock   # (임시) 목업 snapshot 생성 → public/data/snapshot.json
```

> 참고: 데이터는 아직 목업 상태. 2단계에서 `npm run refresh`(실 API ETL)로 대체 예정.

## 구조

```
src/
  data/indicators.json   # 그래프 구조·메타 (노드/엣지) — 값은 여기 없음
  lib/                    # regions, layers, 데이터 로더
  components/             # React Flow 노드, 필터바, 범례, 사이드패널, 차트
public/data/snapshot.json # 실측 시계열 (ETL 산출물, 재빌드 없이 교체 가능)
scripts/gen-mock.mjs      # 목업 생성기 (단독)
scripts/etl/              # 실 ETL 파이프라인
  refresh.mjs             #   오케스트레이터 (npm run refresh)
  mapping.mjs             #   지표 → 소스·통계코드 매핑
  sources/                #   어댑터: ecos·kosis·reb·subscription·manual·derived
  manual/                 #   API 없는 지표의 수동 CSV (README 참조)
  lib/                    #   env·http·dates·regions·mock·errors
```

## ETL (npm run refresh)

지표별로 소스 어댑터를 호출해 `snapshot.json`을 생성한다. 키·통계코드가 없는 지표는
자동으로 **목업으로 폴백**하고 지표별 상태(`live`/`manual`/`derived`/`mock`)를 함께 기록한다.
→ 키를 넣고 `mapping.mjs`의 `TODO` 통계코드를 채우는 대로 지표 단위로 실데이터 전환.

```bash
cp .env.example .env   # 키 입력 후
npm run refresh        # 상태 요약표 출력 + snapshot.json 갱신
```

## 데이터 원칙

- **구조와 값 분리**: `indicators.json`(구조·불변) + `snapshot.json`(값·주기 갱신).
- **혼합 수집**: 공개 API(한은 ECOS, 공공데이터포털/KOSIS, 부동산원 R-ONE) + API 없는 지표(KB·심리·매물량)는 수동 CSV.
- **지역 단위**: 전국 + 시도 17개. `node.regional=false`(금리·대출 등)는 전국만.
- **정책**: 값이 아닌 이벤트 → `policyEvents` 타임라인으로 처리.

## 진행 상태

- [x] 1단계: 스캐폴드 + 스키마 + 목업 데이터로 UI 골격 (그래프·노드 스파크라인·지역 필터·사이드 패널·범례)
- [x] 2단계-a: ETL 뼈대 — 오케스트레이터 + 소스별 어댑터 구조 (키 없이 목업 폴백으로 동작)
- [x] 2단계-b: **17/17 데이터 연결 완료** (API 자동 16 + 수동 1, 목업 0)
  - ECOS: 기준금리·대출금리·가계대출(잔액→월간증감, 조원) / R-ONE: 매매·전세 가격지수(+전세가율 파생)
  - KOSIS: 인허가(월별누계→월계 차감)·착공·준공·거래량·미분양(전국=시도합)·건설공사비·소비심리(국토연구원, org390)
  - KB 비공식 API(data-api.kbland.kr): 매수우위지수(월간) — 키 불필요, 구조 변경 시 목업 폴백
  - 입주물량: data.go.kr 15111714 '주택공급정보_입주예정물량정보' — 단지별→시도·월 집계, **미래 12개월 축**(반기 갱신, uddi는 OAS에서 동적 조회)
  - 청약경쟁률: 청약홈 분양정보×경쟁률(1순위) 조인 → 시도·월별 Σ접수/Σ공급 가중 집계
  - 매물량: 공개 데이터가 존재하지 않는 지표(신고의무 없음, 민간은 `robots.txt`로 봇 거부)라
    **아실 집계를 수동 CSV로 입력** — 2021-01~2026-06, 전국+시도17. 갱신 시 같은 형식으로 덮어쓰면 된다.
    상세: [manual/README](scripts/etl/manual/README.md)

### ETL 데이터 정합성 원칙

- **가짜 값을 실측처럼 보이게 하지 않는다.** 공개 데이터가 없는 지표(`noPublicSource`)는
  목업을 만들지 않고 status `unavailable` + 빈 시계열로 두고, UI가 '데이터 없음'으로 표시한다.
- **일시적 실패로 실측을 잃지 않는다.** API 한도·네트워크 오류 시 직전 스냅샷의 실측값을
  유지하고 사유를 `notes`에 기록한다(목업으로 덮으면 실패가 그럴듯한 가짜로 바뀌므로).
- KOSIS는 분당 200건 제한이 있어 어댑터가 요청 간격을 350ms로 제한한다(전체 refresh ≈ 50초).
- [x] 3단계: 정책 타임라인 UI + 지표별 데이터 출처 배지(실/산/수/목)
- [x] 4단계: 모바일 하단 시트(md 미만) + vercel.json 배포 설정
