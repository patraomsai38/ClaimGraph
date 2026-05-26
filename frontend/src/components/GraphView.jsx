import { useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

cytoscape.use(dagre)

function confidenceColor(c) {
  if (c >= 0.3) return '#34d399'
  if (c >= 0) return '#fbbf24'
  if (c >= -0.3) return '#fb923c'
  return '#f87171'
}

function confidenceBorder(c) {
  if (c >= 0.3) return '#059669'
  if (c >= 0) return '#d97706'
  if (c >= -0.3) return '#ea580c'
  return '#dc2626'
}

function shortLabel(text) {
  if (text.length <= 35) return text
  return text.slice(0, 32) + '...'
}

function confLabel(c) {
  return (c >= 0 ? '+' : '') + c.toFixed(2)
}

export default function GraphView({ graphData, selectedClaim, onSelectClaim, highlightedNodes, highlightedEdges }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  const buildElements = useCallback(() => {
    const { claims, edges, confidence } = graphData
    const nodes = claims.map(c => {
      const conf = confidence[c.id] || { final: 0 }
      return {
        data: {
          id: c.id,
          short: shortLabel(c.text),
          full: c.text,
          color: confidenceColor(conf.final),
          borderColor: confidenceBorder(conf.final),
          confVal: conf.final,
          confLabel: confLabel(conf.final),
        },
      }
    })
    const edgeEls = edges.map(e => ({
      data: {
        id: `${e.source}_${e.type}_${e.target}`,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.type === 'depends_on' ? '' : e.type,
      },
    }))
    return [...nodes, ...edgeEls]
  }, [graphData])

  useEffect(() => {
    if (!containerRef.current) return

    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        {
          selector: 'node',
          style: {
            shape: 'round-rectangle',
            label: 'data(short)',
            'text-wrap': 'wrap',
            'text-max-width': 140,
            'font-size': 11,
            'font-weight': 500,
            color: '#e2e8f0',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'background-color': '#1e293b',
            'background-opacity': 0.95,
            'border-color': 'data(borderColor)',
            'border-width': 2.5,
            'border-opacity': 0.9,
            width: 48,
            height: 48,
            padding: '0px',
            'overlay-opacity': 0,
            'transition-property': 'border-color, border-width, background-color',
            'transition-duration': '0.25s',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#60a5fa',
            'border-width': 3.5,
            'background-color': '#1e3a5f',
          },
        },
        {
          selector: 'node.highlight-topo',
          style: {
            'border-color': '#60a5fa',
            'border-width': 3.5,
            'background-color': '#1e3a5f',
          },
        },
        {
          selector: 'node.highlight-path',
          style: {
            'border-color': '#fbbf24',
            'border-width': 3.5,
            'background-color': '#422006',
          },
        },
        // Dependency edges: solid, subtle gray
        {
          selector: "edge[type = 'depends_on']",
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-fill': 'filled',
            'arrow-scale': 0.8,
            width: 1.5,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            opacity: 0.6,
            'line-style': 'solid',
          },
        },
        // Supports edges: green, thin dashed
        {
          selector: "edge[type = 'supports']",
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-fill': 'filled',
            'arrow-scale': 0.7,
            width: 1.2,
            'line-color': '#4ade80',
            'target-arrow-color': '#4ade80',
            opacity: 0.45,
            'line-style': 'dashed',
            'line-dash-pattern': [6, 4],
            label: 'data(label)',
            'font-size': 8,
            color: '#4ade80',
            'text-rotation': 'autorotate',
            'text-background-color': '#0f1115',
            'text-background-opacity': 0.8,
            'text-background-padding': 2,
            'text-opacity': 0.6,
          },
        },
        // Contradicts edges: red, thin dashed
        {
          selector: "edge[type = 'contradicts']",
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-fill': 'filled',
            'arrow-scale': 0.7,
            width: 1.2,
            'line-color': '#f87171',
            'target-arrow-color': '#f87171',
            opacity: 0.45,
            'line-style': 'dashed',
            'line-dash-pattern': [6, 4],
            label: 'data(label)',
            'font-size': 8,
            color: '#f87171',
            'text-rotation': 'autorotate',
            'text-background-color': '#0f1115',
            'text-background-opacity': 0.8,
            'text-background-padding': 2,
            'text-opacity': 0.6,
          },
        },
        // Highlighted path edges
        {
          selector: 'edge.highlight-path',
          style: {
            'line-color': '#fbbf24',
            'target-arrow-color': '#fbbf24',
            width: 2.5,
            opacity: 0.9,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        rankSep: 80,
        edgeSep: 20,
      },
      wheelSensitivity: 0.3,
      minZoom: 0.3,
      maxZoom: 3,
    })

    cy.on('tap', 'node', (evt) => {
      onSelectClaim(evt.target.id())
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectClaim(null)
      }
    })

    // Hover effects
    cy.on('mouseover', 'node', (evt) => {
      evt.target.style({ 'background-color': '#2d3748', cursor: 'pointer' })
      containerRef.current.style.cursor = 'pointer'
    })
    cy.on('mouseout', 'node', (evt) => {
      const isSelected = evt.target.selected()
      const isPath = evt.target.hasClass('highlight-path')
      const isTopo = evt.target.hasClass('highlight-topo')
      if (isSelected) evt.target.style({ 'background-color': '#1e3a5f' })
      else if (isPath) evt.target.style({ 'background-color': '#422006' })
      else if (isTopo) evt.target.style({ 'background-color': '#1e3a5f' })
      else evt.target.style({ 'background-color': '#1e293b' })
      containerRef.current.style.cursor = 'default'
    })

    cy.on('mouseover', 'edge', (evt) => {
      evt.target.style({ opacity: 1, width: Math.max(evt.target.style('width'), 2.5) })
    })
    cy.on('mouseout', 'edge', (evt) => {
      const type = evt.target.data('type')
      const isHighlighted = evt.target.hasClass('highlight-path')
      if (isHighlighted) return
      if (type === 'depends_on') evt.target.style({ opacity: 0.6, width: 1.5 })
      else evt.target.style({ opacity: 0.45, width: 1.2 })
    })

    cyRef.current = cy

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [buildElements, onSelectClaim])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass('highlight-topo highlight-path')
    cy.edges().removeClass('highlight-path')
    if (highlightedNodes && highlightedNodes.length > 0) {
      for (const id of highlightedNodes) {
        cy.getElementById(id).addClass('highlight-path')
      }
    }
    if (highlightedEdges && highlightedEdges.length > 0) {
      for (const eid of highlightedEdges) {
        cy.getElementById(eid).addClass('highlight-path')
      }
    }
  }, [highlightedNodes, highlightedEdges])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    if (selectedClaim) {
      cy.nodes().unselect()
      cy.getElementById(selectedClaim).select()
    }
  }, [selectedClaim])

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
}
