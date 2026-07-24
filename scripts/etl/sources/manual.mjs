// 수동 CSV 어댑터 (공개 API 없는 지표: KB 수급·심리·매물량).
// 파일: scripts/etl/manual/{id}.csv
// 형식(롱): date,region,value   예) 2024-01,서울,88.3
//   - 헤더 필수. region 생략 시 '전국'으로 간주.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { NotReady } from '../lib/errors.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANUAL_DIR = join(__dirname, '..', 'manual')

export function manualPath(id) {
  return join(MANUAL_DIR, `${id}.csv`)
}

export async function fetchSeries({ id, months, regions }) {
  const path = manualPath(id)
  if (!existsSync(path)) throw new NotReady(`수동 파일 없음: manual/${id}.csv`)

  const text = readFileSync(path, 'utf-8').trim()
  const lines = text.split(/\r?\n/)
  const header = lines.shift().split(',').map((s) => s.trim().toLowerCase())
  const di = header.indexOf('date')
  const ri = header.indexOf('region')
  const vi = header.indexOf('value')
  if (di < 0 || vi < 0) throw new Error(`manual/${id}.csv: date,value 헤더 필요`)

  const byRegion = {}
  for (const line of lines) {
    if (!line.trim()) continue
    const c = line.split(',')
    const date = c[di]?.trim()
    const region = ri >= 0 ? (c[ri]?.trim() || '전국') : '전국'
    const value = Number(c[vi])
    if (!date || !Number.isFinite(value)) continue
    ;(byRegion[region] ||= {})[date] = value
  }
  if (Object.keys(byRegion).length === 0) throw new NotReady(`manual/${id}.csv 비어있음`)

  const out = {}
  const target = Object.keys(byRegion)
  for (const region of target) {
    out[region] = months
      .map((d) => ({ date: d, value: byRegion[region][d] }))
      .filter((p) => Number.isFinite(p.value))
  }
  return out
}
