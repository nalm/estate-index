// 의존성 없는 .env 로더. process.env 우선, 없으면 프로젝트 루트 .env 파싱.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')

let fileEnv = {}
const envPath = join(ROOT, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

export function env(key) {
  return process.env[key] || fileEnv[key] || ''
}

export const KEYS = {
  ecos: () => env('ECOS_API_KEY'),
  dataGoKr: () => env('DATA_GO_KR_KEY'),
  kosis: () => env('KOSIS_API_KEY') || env('DATA_GO_KR_KEY'),
  reb: () => env('REB_RONE_KEY'),
}

export { ROOT }
