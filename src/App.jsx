import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MarkerType, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import IndicatorNode from './components/IndicatorNode.jsx'
import FilterBar from './components/FilterBar.jsx'
import Legend from './components/Legend.jsx'
import SidePanel from './components/SidePanel.jsx'
import PolicyTimeline from './components/PolicyTimeline.jsx'
import { LAYER_META, LAYER_ORDER } from './lib/layers.js'
import { DEFAULT_REGION } from './lib/regions.js'
import { useData, seriesFor, latestStat } from './lib/useData.js'
import { computeLayout } from './lib/layout.js'

const nodeTypes = { indicator: IndicatorNode }

function Flow() {
  const { indicators, snapshot, error } = useData()
  const rf = useRef(null)

  const [region, setRegion] = useState(DEFAULT_REGION)
  const [selectedId, setSelectedId] = useState(null)
  const [activeLayers, setActiveLayers] = useState(new Set(LAYER_ORDER))
  const [feedbackOnly, setFeedbackOnly] = useState(false)
  const [layoutMode, setLayoutMode] = useState('auto') // 'auto' | 'original'
  const [showTimeline, setShowTimeline] = useState(true)

  const toggleLayer = useCallback((key) => {
    setActiveLayers((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  // 자동 배치 좌표 (교차 최소화). indicators 고정이라 한 번만 계산.
  const autoPos = useMemo(
    () => computeLayout(indicators.nodes, indicators.edges),
    [indicators.nodes, indicators.edges],
  )

  const nodes = useMemo(() => {
    return indicators.nodes.map((node) => {
      const meta = LAYER_META[node.layer]
      const isPolicy = node.kind === 'policy'
      const series = isPolicy ? null : seriesFor(snapshot, node.id, region)
      const stat = latestStat(series)
      const layerOff = !activeLayers.has(node.layer)
      const dimmed = layerOff || (feedbackOnly && !isFeedbackNode(node.id, indicators.edges))
      return {
        id: node.id,
        type: 'indicator',
        position: layoutMode === 'auto' ? autoPos[node.id] : node.position,
        data: {
          node, color: meta.color, soft: meta.soft, stat, series,
          status: snapshot?.status?.[node.id],
          dimmed, selected: node.id === selectedId, isPolicy,
        },
        selectable: !layerOff,
      }
    })
  }, [indicators.nodes, indicators.edges, snapshot, region, activeLayers, feedbackOnly, selectedId, layoutMode, autoPos])

  const edges = useMemo(() => {
    return indicators.edges.map((e) => {
      const isFeedback = e.feedback
      const color = isFeedback ? '#a855f7' : e.dashed ? '#94a3b8' : '#64748b'
      const srcOff = !activeLayers.has(layerOf(indicators.nodes, e.source))
      const tgtOff = !activeLayers.has(layerOf(indicators.nodes, e.target))
      let opacity = srcOff || tgtOff ? 0.08 : 0.9
      let width = isFeedback ? 2.5 : 1.5
      if (feedbackOnly) {
        opacity = isFeedback ? 1 : 0.06
        if (isFeedback) width = 3
      }
      if (selectedId) {
        const touches = e.source === selectedId || e.target === selectedId
        opacity = touches ? 1 : Math.min(opacity, 0.1)
        if (touches) width += 1
      }
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        pathOptions: { borderRadius: 14 },
        label: e.label || undefined,
        labelShowBg: true,
        labelStyle: { fontSize: 10, fill: '#475569' },
        labelBgStyle: { fill: '#ffffffcc' },
        labelBgPadding: [3, 1],
        style: {
          stroke: color,
          strokeWidth: width,
          strokeDasharray: e.dashed && !isFeedback ? '6 4' : undefined,
          opacity,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      }
    })
  }, [indicators.edges, indicators.nodes, activeLayers, feedbackOnly, selectedId])

  const selectedNode = useMemo(
    () => indicators.nodes.find((n) => n.id === selectedId) || null,
    [selectedId, indicators.nodes],
  )

  // 출처 요약 (실데이터/파생/수동/목업 개수)
  const statusCounts = useMemo(() => {
    const c = { live: 0, derived: 0, manual: 0, mock: 0 }
    for (const v of Object.values(snapshot?.status || {})) if (v in c) c[v]++
    return c
  }, [snapshot])

  const onFit = useCallback(() => rf.current?.fitView({ padding: 0.15, duration: 400 }), [])

  // 배치 모드 전환 시 화면 다시 맞춤.
  useEffect(() => {
    const t = setTimeout(() => rf.current?.fitView({ padding: 0.15, duration: 400 }), 60)
    return () => clearTimeout(t)
  }, [layoutMode])

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-600">데이터 로드 오류: {error}</div>
  }

  return (
    <div className="flex h-full flex-col">
      <FilterBar
        region={region} setRegion={setRegion}
        activeLayers={activeLayers} toggleLayer={toggleLayer}
        feedbackOnly={feedbackOnly} setFeedbackOnly={setFeedbackOnly}
        layoutMode={layoutMode} setLayoutMode={setLayoutMode}
        showTimeline={showTimeline} setShowTimeline={setShowTimeline}
        onFit={onFit}
        generatedAt={snapshot?.generatedAt || '로딩...'}
        statusCounts={statusCounts}
      />
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(inst) => { rf.current = inst }}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <Legend />
        {selectedNode && (
          <SidePanel
            node={selectedNode}
            indicators={indicators}
            snapshot={snapshot}
            region={region}
            onClose={() => setSelectedId(null)}
            onSelectNode={(id) => setSelectedId(id)}
          />
        )}
      </div>
      {showTimeline && snapshot?.policyEvents && (
        <PolicyTimeline
          events={snapshot.policyEvents}
          months={snapshot.months}
          onSelect={(id) => setSelectedId(id)}
        />
      )}
    </div>
  )
}

function layerOf(nodes, id) {
  return nodes.find((n) => n.id === id)?.layer
}
function isFeedbackNode(id, edges) {
  return edges.some((e) => e.feedback && (e.source === id || e.target === id))
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}
