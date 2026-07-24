// 어댑터가 "아직 연동 준비 안 됨"(키 없음/통계코드 미검증/수동파일 없음)을 알릴 때 사용.
// refresh는 이 에러를 잡아 목업으로 폴백하고 status='mock'으로 기록한다.
export class NotReady extends Error {
  constructor(reason) {
    super(reason)
    this.name = 'NotReady'
    this.code = 'NOT_READY'
  }
}

export const notReady = (reason) => { throw new NotReady(reason) }

// cfg에 'TODO' 자리표시자가 있으면 아직 준비 안 된 것으로 간주.
export function assertNoTodo(cfg, fields) {
  for (const f of fields) {
    if (cfg[f] === 'TODO' || cfg[f] === undefined) {
      throw new NotReady(`${f} 미설정(TODO) — mapping.mjs에서 실제 코드 확인 필요`)
    }
  }
}
