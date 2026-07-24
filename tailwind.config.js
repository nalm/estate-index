/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 5개 층위 색상 (SPEC 기준)
        layer: {
          policy: '#2563eb',     // 정책 - 파랑
          macro: '#92400e',      // 거시 - 갈색
          leading: '#16a34a',    // 선행 - 초록
          coincident: '#d97706', // 동행 - 금색
          lagging: '#dc2626',    // 가격/후행 - 빨강
        },
      },
    },
  },
  plugins: [],
}
