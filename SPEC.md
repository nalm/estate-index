# 부동산 지표 대시보드 웹앱 — 구현 명세

## 목적
부동산 시장 지표들을 인과관계 다이어그램으로 일람하는 싱글페이지 웹앱.
노드를 클릭하면 해당 지표의 상세 정보(정의, 제공처, 발표 주기, 링크, 해석 포인트)를 볼 수 있다.

## 기술 스택
- React + Vite
- 다이어그램: **React Flow** (노드 클릭·드래그·줌 인터랙션에 최적. mermaid는 정적이라 부적합)
- 스타일: Tailwind CSS
- 데이터: `src/data/indicators.json` 단일 파일에서 로드 (노드·엣지 분리 구조)
- 상태관리·백엔드 없음. 정적 배포 가능해야 함 (GitHub Pages / Vercel)

## 화면 구성
1. **메인 캔버스**: React Flow 다이어그램
   - 노드는 5개 층위(layer)로 색 구분: 정책(파랑) / 거시(갈색) / 공급 파이프라인·선행(초록) / 금융·거래·심리·동행(금색) / 가격·후행(빨강)
   - 레이아웃: 왼쪽(정책·거시) → 중앙(파이프라인·거래) → 오른쪽(가격) 방향의 좌→우 흐름. 초기 좌표는 indicators.json의 position 값 사용
   - 엣지: 실선 = 정방향 인과, 점선(dashed) = 역방향 충격·피드백 루프. label 표시
2. **사이드 패널** (노드 클릭 시 우측 슬라이드인)
   - 지표명, 층위 배지, 정의, 제공처(외부 링크), 발표 주기, 선행/동행/후행 구분, 해석 포인트(interpretation)
   - 이 노드와 연결된 엣지 목록("이 지표가 영향을 주는 것 / 받는 것")
3. **상단 필터 바**
   - 층위별 토글(정책/거시/선행/동행/후행) — 끄면 해당 노드·연결 엣지 흐리게(opacity 0.15)
   - "피드백 루프만 보기" 토글 — feedback: true 엣지 강조
4. **범례**: 좌하단 고정. 색상·실선/점선 의미

## 인터랙션 요구사항
- 노드 클릭 → 사이드 패널 오픈 + 해당 노드의 인접 엣지 하이라이트
- 캔버스 빈 곳 클릭 → 패널 닫기
- 줌/팬 기본 지원, fitView 초기화 버튼
- 모바일: 사이드 패널은 하단 시트로 전환 (breakpoint md)

## 데이터 스키마 (indicators.json)
```
{
  "nodes": [{
    "id": string,
    "label": string,          // 지표명
    "layer": "policy"|"macro"|"leading"|"coincident"|"lagging",
    "source": string,         // 제공처
    "url": string,            // 제공처 링크
    "frequency": string,      // 발표 주기
    "definition": string,
    "interpretation": string, // 해석 포인트
    "position": { "x": number, "y": number }
  }],
  "edges": [{
    "id": string,
    "source": string, "target": string,
    "label": string,          // 인과 설명 (예: "2~3년 시차")
    "dashed": boolean,        // 역방향 충격·간접 경로
    "feedback": boolean       // 양의 피드백 루프 여부
  }]
}
```

## 구현 순서 (단계별로 진행하고 각 단계 후 확인받을 것)
1. Vite + React + Tailwind 스캐폴드, indicators.json 로드 확인
2. React Flow로 노드·엣지 렌더링 + 층위별 색상
3. 사이드 패널 + 노드 클릭 인터랙션
4. 필터 바 + 범례
5. 모바일 대응 + 배포 설정(vercel.json 또는 gh-pages)

## 하지 말 것
- 백엔드/DB 추가 금지
- 실시간 데이터 수집(크롤링) 기능 금지 — 이번 버전은 지표 '지도'이지 데이터 뷰어가 아님
- indicators.json 외의 곳에 지표 정보 하드코딩 금지
