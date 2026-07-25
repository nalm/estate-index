import { LAYER_META } from '../lib/layers.js'
import { statusMeta } from '../lib/status.js'
import LineChart from './LineChart.jsx'
import { seriesFor, latestStat } from '../lib/useData.js'

// 우측 슬라이드인 패널 (모바일은 하단 시트).
export default function SidePanel({ node, indicators, snapshot, region, onClose, onSelectNode }) {
  if (!node) return null
  const meta = LAYER_META[node.layer]
  const isPolicy = node.kind === 'policy'
  const series = isPolicy ? null : seriesFor(snapshot, node.id, region)
  const stat = latestStat(series)
  const labelOf = (id) => indicators.nodes.find((n) => n.id === id)?.label || id

  const outgoing = indicators.edges.filter((e) => e.source === node.id)
  const incoming = indicators.edges.filter((e) => e.target === node.id)
  const events = (snapshot?.policyEvents || []).filter((ev) => ev.nodeId === node.id)
  const regional = node.regional
  const sm = !isPolicy ? statusMeta(snapshot?.status?.[node.id]) : null

  return (
    <aside
      className="absolute z-20 flex flex-col bg-white shadow-xl
                 inset-x-0 bottom-0 h-[62%] rounded-t-2xl border-t border-slate-200
                 md:inset-x-auto md:right-0 md:top-0 md:h-full md:w-[420px] md:rounded-none md:border-l"
    >
      {/* 모바일 시트 핸들 */}
      <div className="flex justify-center py-1.5 md:hidden">
        <div className="h-1 w-10 rounded-full bg-slate-300" />
      </div>
      <div className="flex items-start justify-between border-b border-slate-200 p-4" style={{ background: meta.soft }}>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: meta.color }}>
              {meta.name}
            </span>
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[11px] text-slate-600">
              {regional ? `지역: ${region}` : '전국 단위'}
            </span>
            {sm && (
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ background: sm.bg, color: sm.color }}
              >
                {sm.label}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{node.label}</h2>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/50 hover:text-slate-700" aria-label="닫기">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!isPolicy && stat && (
          <div className="mb-4">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{stat.value.toLocaleString('ko-KR')}</span>
              <span className="text-sm text-slate-400">{node.unit}</span>
              <span className="text-xs text-slate-400">· {stat.date}</span>
            </div>
            <LineChart data={series} color={meta.color} unit={node.unit} />
          </div>
        )}

        {!isPolicy && !stat && (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 text-sm font-semibold text-slate-600">데이터 없음</div>
            <p className="text-[13px] leading-relaxed text-slate-500">
              {snapshot?.notes?.[node.id] || '이 지표는 아직 수집되지 않았습니다.'}
            </p>
          </div>
        )}

        {isPolicy && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">관련 정책 이벤트</div>
            {events.length ? (
              <ul className="space-y-2">
                {events.map((ev) => (
                  <li key={ev.id} className="rounded border border-slate-200 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{ev.title}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ev.direction === 'tighten' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {ev.direction === 'tighten' ? '강화' : '완화'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{ev.date} · {ev.note}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400">등록된 이벤트 없음</div>
            )}
          </div>
        )}

        <Section title="정의">{node.definition}</Section>
        <Section title="해석 포인트">{node.interpretation}</Section>

        <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Field label="제공처">
            <a href={node.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              {node.source} ↗
            </a>
          </Field>
          <Field label="발표 주기">{node.frequency}</Field>
        </div>

        {/* 지표에 딸린 심층 리포트 (indicators.json의 report 필드) */}
        {node.report && (
          <a
            href={`${import.meta.env.BASE_URL}${node.report.path}`}
            target="_blank"
            rel="noreferrer"
            className="mb-4 flex items-center justify-between gap-2 rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <span>
              <span className="font-semibold text-slate-700">{node.report.label}</span>
              {node.report.desc && (
                <span className="mt-0.5 block text-[12px] font-normal text-slate-500">{node.report.desc}</span>
              )}
            </span>
            <span className="shrink-0 text-slate-400">↗</span>
          </a>
        )}

        <EdgeList title="이 지표가 영향을 주는 것" edges={outgoing} pick={(e) => e.target} labelOf={labelOf} onSelectNode={onSelectNode} />
        <EdgeList title="이 지표가 영향을 받는 것" edges={incoming} pick={(e) => e.source} labelOf={labelOf} onSelectNode={onSelectNode} />
      </div>
    </aside>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-sm font-semibold text-slate-700">{title}</div>
      <p className="text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-slate-700">{children}</div>
    </div>
  )
}

function EdgeList({ title, edges, pick, labelOf, onSelectNode }) {
  if (!edges.length) return null
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm font-semibold text-slate-700">{title}</div>
      <ul className="space-y-1">
        {edges.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onSelectNode(pick(e))}
              className="flex w-full items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-700">{labelOf(pick(e))}</span>
              {e.label && <span className="text-xs text-slate-400">· {e.label}</span>}
              {e.feedback && <span className="ml-auto text-[10px] font-semibold text-purple-600">피드백</span>}
              {e.dashed && !e.feedback && <span className="ml-auto text-[10px] text-slate-400">역방향</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
