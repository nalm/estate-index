import dagre from '@dagrejs/dagre'

// 노드 크기 (레이아웃 계산용 — 실제 렌더 크기와 근사).
const NODE_W = 236
const nodeH = (node) => (node.kind === 'policy' ? 84 : 148)

// dagre로 좌→우 계층 배치 계산. 교차 최소화 + 랭크 정렬.
// 반환: { [id]: {x, y} } (React Flow position = 좌상단 기준)
export function computeLayout(nodes, edges, { direction = 'LR' } = {}) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction,
    ranksep: 130,   // 랭크(층) 간 간격
    nodesep: 46,    // 같은 랭크 내 노드 간격
    edgesep: 24,
    marginx: 30,
    marginy: 30,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: nodeH(n) })
  }
  for (const e of edges) {
    // 피드백(역방향) 엣지는 랭킹 왜곡을 줄이기 위해 가중치를 낮춘다.
    g.setEdge(e.source, e.target, { weight: e.feedback ? 1 : 3, minlen: 1 })
  }

  dagre.layout(g)

  const pos = {}
  for (const n of nodes) {
    const gn = g.node(n.id)
    pos[n.id] = { x: gn.x - NODE_W / 2, y: gn.y - nodeH(n) / 2 }
  }
  return pos
}
