import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 정적 배포(개인 도구).
// GitHub Pages는 /<repo>/ 하위 경로라 CI에서 VITE_BASE=/estate-index/ 로 빌드한다.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
