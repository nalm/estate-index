// 공통 HTTP 유틸 (Node 22 내장 fetch 사용). 재시도·타임아웃 포함.

export function buildUrl(base, params = {}) {
  const url = new URL(base)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  }
  return url.toString()
}

// path segment 방식 API(ECOS 등)용: 세그먼트를 인코딩해 이어붙임.
export function buildPath(base, segments = []) {
  return base.replace(/\/$/, '') + '/' + segments.map((s) => encodeURIComponent(s)).join('/')
}

export async function fetchJson(url, { retries = 2, timeoutMs = 15000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        // 일부 공공 API는 오류 시 XML/HTML 반환 → 원문 일부를 에러로.
        throw new Error(`비JSON 응답: ${text.slice(0, 120)}`)
      }
    } catch (e) {
      clearTimeout(t)
      lastErr = e
      if (attempt < retries) await sleep(400 * (attempt + 1))
    }
  }
  throw lastErr
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
