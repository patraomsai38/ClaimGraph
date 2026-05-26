import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, Play, Route, RotateCcw, ChevronDown } from 'lucide-react'
import GraphView from '../components/GraphView'
import ClaimPanel from '../components/ClaimPanel'
import AddForms from '../components/AddForms'
import { datasets } from '../data/datasets'
import { longestPathTo } from '../engine/graph'

export default function Explorer({ graphData, currentDataset, onLoadDataset, onUpdateGraph }) {
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [highlightedNodes, setHighlightedNodes] = useState([])
  const [highlightedEdges, setHighlightedEdges] = useState([])
  const [message, setMessage] = useState(null)
  const [showDatasetMenu, setShowDatasetMenu] = useState(false)

  const showMsg = (text, kind = 'ok') => {
    setMessage({ text, kind })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSelectClaim = useCallback((id) => {
    setSelectedClaim(id)
    setHighlightedNodes([])
    setHighlightedEdges([])
  }, [])

  const handleShowTopo = () => {
    setHighlightedNodes([])
    setHighlightedEdges([])
    const ids = graphData.topo
    let i = 0
    const interval = setInterval(() => {
      if (i >= ids.length) { clearInterval(interval); return }
      setHighlightedNodes(prev => [...prev, ids[i]])
      i++
    }, 300)
    showMsg(`Topological order (Kahn): ${ids.map(id => {
      const c = graphData.claims.find(cl => cl.id === id)
      return c ? c.text.slice(0, 25) : id
    }).join(' → ')}`)
  }

  const handleLongestPath = () => {
    if (!selectedClaim) {
      showMsg('Select a claim first (click a node).', 'error')
      return
    }
    const path = longestPathTo(graphData.claims, graphData.edges, selectedClaim)
    setHighlightedNodes(path)
    const edgeIds = []
    for (let i = 0; i < path.length - 1; i++) {
      edgeIds.push(`${path[i]}_depends_on_${path[i + 1]}`)
    }
    setHighlightedEdges(edgeIds)
    showMsg(`Longest chain (${Math.max(0, path.length - 1)} hops): ${path.map(id => {
      const c = graphData.claims.find(cl => cl.id === id)
      return c ? c.text.slice(0, 25) : id
    }).join(' → ')}`)
  }

  const handleReset = () => {
    onUpdateGraph({ claims: [], evidence: [], edges: [] })
    setSelectedClaim(null)
    setHighlightedNodes([])
    setHighlightedEdges([])
    showMsg('Graph reset to empty')
  }

  const handleDeleteClaim = (claimId) => {
    const claims = graphData.claims.filter(c => c.id !== claimId)
    const evidence = graphData.evidence.filter(e => e.claim_id !== claimId)
    const edges = graphData.edges.filter(e => e.source !== claimId && e.target !== claimId)
    onUpdateGraph({ claims, evidence, edges })
    setSelectedClaim(null)
    showMsg('Claim deleted')
  }

  const handleDeleteEvidence = (evId) => {
    const evidence = graphData.evidence.filter(e => e.id !== evId)
    onUpdateGraph({ ...graphData, evidence })
    showMsg('Evidence removed; confidences re-propagated')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="glass border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Dataset picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatasetMenu(!showDatasetMenu)}
              className="flex items-center gap-2 px-3 py-1.5 glass-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-colors"
            >
              <LayoutGrid size={14} />
              {datasets[currentDataset]?.name || currentDataset}
              <ChevronDown size={12} />
            </button>
            {showDatasetMenu && (
              <div className="absolute top-full left-0 mt-1 w-56 glass rounded-xl border border-border shadow-2xl z-50 overflow-hidden">
                {Object.entries(datasets).map(([key, ds]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onLoadDataset(key)
                      setShowDatasetMenu(false)
                      setSelectedClaim(null)
                      setHighlightedNodes([])
                      setHighlightedEdges([])
                      showMsg(`Loaded: ${ds.name}`)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors ${
                      key === currentDataset ? 'text-accent bg-accent/5' : 'text-gray-300'
                    }`}
                  >
                    <p className="font-medium">{ds.name}</p>
                    <p className="text-gray-500 mt-0.5">{ds.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border" />

          <span className="text-[11px] text-gray-500">
            {graphData.claims.length} claims · {graphData.evidence.length} evidence · {graphData.edges.length} edges
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ToolButton icon={<Play size={13} />} label="Topo order" onClick={handleShowTopo} />
          <ToolButton icon={<Route size={13} />} label="Longest chain" onClick={handleLongestPath} />
          <ToolButton icon={<RotateCcw size={13} />} label="Reset" onClick={handleReset} danger />
        </div>
      </div>

      {/* Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mx-4 mt-2 px-4 py-2 rounded-lg text-xs font-medium ${
            message.kind === 'error'
              ? 'bg-bad/10 border border-bad/20 text-bad'
              : 'bg-good/10 border border-good/20 text-good'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph */}
        <div className="flex-1 relative">
          <GraphView
            graphData={graphData}
            selectedClaim={selectedClaim}
            onSelectClaim={handleSelectClaim}
            highlightedNodes={highlightedNodes}
            highlightedEdges={highlightedEdges}
          />
          {/* Legend */}
          <div className="absolute left-3 bottom-3 glass rounded-xl p-3 text-[10px] space-y-3 max-w-[180px]">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Edges</p>
              <div className="flex flex-col gap-1.5 text-gray-400">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-[1.5px] bg-slate-500 rounded" />
                  <span>depends on</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-[1.5px] bg-good/60 rounded" style={{ borderTop: '1.5px dashed #4ade80' }} />
                  <span>supports</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-[1.5px] bg-bad/60 rounded" style={{ borderTop: '1.5px dashed #f87171' }} />
                  <span>contradicts</span>
                </span>
              </div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Node border</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <span className="w-3 h-3 rounded border-2 border-red-500 bg-slate-800" />
                  <span className="w-3 h-3 rounded border-2 border-orange-500 bg-slate-800" />
                  <span className="w-3 h-3 rounded border-2 border-yellow-500 bg-slate-800" />
                  <span className="w-3 h-3 rounded border-2 border-emerald-500 bg-slate-800" />
                </div>
                <span className="text-gray-500">-1 → +1</span>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 leading-snug">Click a node to inspect</p>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-[360px] border-l border-border bg-bg-panel flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto">
            <ClaimPanel
              graphData={graphData}
              selectedClaim={selectedClaim}
              onClose={() => setSelectedClaim(null)}
              onDeleteClaim={handleDeleteClaim}
              onDeleteEvidence={handleDeleteEvidence}
            />
          </div>
          <div className="border-t border-border p-3 overflow-y-auto max-h-[40%]">
            <AddForms graphData={graphData} onUpdateGraph={onUpdateGraph} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolButton({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
        danger
          ? 'border-bad/20 text-bad/70 hover:bg-bad/10 hover:text-bad'
          : 'border-border text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
