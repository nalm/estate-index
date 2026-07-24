import { useEffect, useState } from 'react'
import indicators from '../data/indicators.json'

// 구조(indicators.json)는 번들에 포함, 실측값(snapshot.json)은 런타임 fetch.
// snapshot은 ETL 산출물이라 재빌드 없이 교체 가능해야 하므로 public/에서 로드.
export function useData() {
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/snapshot.json`
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`snapshot 로드 실패 (${r.status})`)
        return r.json()
      })
      .then(setSnapshot)
      .catch((e) => setError(e.message))
  }, [])

  return { indicators, snapshot, error }
}

// 지역·지표에 대한 시계열 반환. 해당 지역 데이터 없으면 전국으로 폴백.
export function seriesFor(snapshot, nodeId, region) {
  const s = snapshot?.series?.[nodeId]
  if (!s) return null
  return s[region] || s['전국'] || null
}

// 최신값 + 전월 대비 변화 요약.
export function latestStat(series) {
  if (!series || series.length === 0) return null
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const delta = prev ? last.value - prev.value : 0
  const pct = prev && prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : 0
  return { value: last.value, date: last.date, delta, pct }
}
