<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'
import type { Relationship } from '../types'

const props = defineProps<{
  relationships: Relationship[]
}>()

const router = useRouter()
const containerRef = ref<HTMLDivElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
let simulation: d3.Simulation<GraphNode, GraphLink> | null = null

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: string
  imageId: string | null
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relationship: Relationship
}

// Convert relationship value (-100 to 100) to color
function getRelationshipColor(value: number): string {
  if (value >= 60) return 'var(--success, #22c55e)'
  if (value >= 20) return 'var(--success-muted, #4ade80)'
  if (value > -20) return 'var(--text-muted, #9ca3af)'
  if (value > -60) return 'var(--warning, #f59e0b)'
  return 'var(--danger, #ef4444)'
}

function getRelationshipLabel(value: number): string {
  if (value >= 80) return 'Devoted'
  if (value >= 60) return 'Friendly'
  if (value >= 40) return 'Warm'
  if (value >= 20) return 'Cordial'
  if (value > -20) return 'Neutral'
  if (value > -40) return 'Cool'
  if (value > -60) return 'Unfriendly'
  if (value > -80) return 'Hostile'
  return 'Nemesis'
}

function buildGraph() {
  if (!containerRef.value) return

  // Clear previous graph
  d3.select(containerRef.value).selectAll('*').remove()

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight || 500

  // Build nodes from relationships
  const nodeMap = new Map<string, GraphNode>()
  props.relationships.forEach((r) => {
    if (!nodeMap.has(r.sourceId)) {
      nodeMap.set(r.sourceId, { id: r.sourceId, name: r.sourceName, type: r.sourceType, imageId: r.sourceImageId })
    }
    if (!nodeMap.has(r.targetId)) {
      nodeMap.set(r.targetId, { id: r.targetId, name: r.targetName, type: r.targetType, imageId: r.targetImageId })
    }
  })

  const nodes: GraphNode[] = Array.from(nodeMap.values())
  const links: GraphLink[] = props.relationships.map((r) => ({
    source: r.sourceId,
    target: r.targetId,
    relationship: r,
  }))

  // Create SVG
  const svg = d3
    .select(containerRef.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])

  // Add defs for image patterns
  const defs = svg.append('defs')

  // Create a clipPath for circular images
  defs.append('clipPath')
    .attr('id', 'circleClip')
    .append('circle')
    .attr('r', 25)
    .attr('cx', 0)
    .attr('cy', 0)

  // Create patterns for nodes with images
  nodes.forEach((node) => {
    if (node.imageId) {
      defs.append('pattern')
        .attr('id', `img-${node.id}`)
        .attr('width', 1)
        .attr('height', 1)
        .attr('patternContentUnits', 'objectBoundingBox')
        .append('image')
        .attr('href', `/images/${node.imageId}/file?width=100&height=100`)
        .attr('width', 1)
        .attr('height', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice')
    }
  })

  // Add zoom behavior
  const g = svg.append('g')
  svg.call(
    d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      }) as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void
  )

  // Create force simulation
  simulation = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(150))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))

  // Draw links
  const link = g
    .append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', (d) => getRelationshipColor(d.relationship.value))
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.7)
    .style('cursor', 'pointer')
    .on('mouseover', (event, d) => showTooltip(event, d.relationship))
    .on('mouseout', hideTooltip)

  // Draw nodes
  const node = g
    .append('g')
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')
    .call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as unknown as (selection: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>) => void
    )
    .on('click', (_event, d) => {
      const route = d.type === 'character' ? `/characters/${d.id}` : `/factions/${d.id}`
      router.push(route)
    })

  // Node circles - use image pattern if available, otherwise solid color
  node
    .append('circle')
    .attr('r', 25)
    .attr('fill', (d) => d.imageId
      ? `url(#img-${d.id})`
      : (d.type === 'character' ? 'var(--accent, #7c3aed)' : 'var(--warning, #f59e0b)'))
    .attr('stroke', 'var(--border, #3a3a5c)')
    .attr('stroke-width', 2)

  // Node labels - only show for nodes without images
  node
    .filter((d) => !d.imageId)
    .append('text')
    .text((d) => d.name.split(' ')[0] || '')
    .attr('text-anchor', 'middle')
    .attr('dy', 4)
    .attr('fill', 'white')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .style('pointer-events', 'none')

  // Name labels below nodes
  node
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', 42)
    .attr('fill', 'var(--text, #f0f0f5)')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .style('pointer-events', 'none')

  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d) => (d.source as GraphNode).x!)
      .attr('y1', (d) => (d.source as GraphNode).y!)
      .attr('x2', (d) => (d.target as GraphNode).x!)
      .attr('y2', (d) => (d.target as GraphNode).y!)

    node.attr('transform', (d) => `translate(${d.x},${d.y})`)
  })

  // Drag functions
  function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
    if (!event.active) simulation?.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
    if (!event.active) simulation?.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }
}

function showTooltip(event: MouseEvent, r: Relationship) {
  if (!tooltipRef.value) return
  const label = r.label || getRelationshipLabel(r.value)
  tooltipRef.value.innerHTML = `
    <strong>${r.sourceName}</strong> → <strong>${r.targetName}</strong><br>
    <span style="color: ${getRelationshipColor(r.value)}">${label}</span> (${r.value})<br>
    <small>${r.relationshipType}</small>
  `
  tooltipRef.value.style.display = 'block'
  tooltipRef.value.style.left = `${event.pageX + 10}px`
  tooltipRef.value.style.top = `${event.pageY + 10}px`
}

function hideTooltip() {
  if (tooltipRef.value) {
    tooltipRef.value.style.display = 'none'
  }
}

function handleResize() {
  buildGraph()
}

onMounted(() => {
  buildGraph()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  simulation?.stop()
  window.removeEventListener('resize', handleResize)
})

watch(() => props.relationships, buildGraph, { deep: true })
</script>

<template>
  <div class="graph-wrapper">
    <div ref="containerRef" class="graph-container"></div>
    <div ref="tooltipRef" class="graph-tooltip"></div>

    <div class="graph-legend">
      <div class="legend-title">Relationship Values</div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--success, #22c55e)"></span>
        <span>Friendly (60+)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--success-muted, #4ade80)"></span>
        <span>Positive (20-59)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--text-muted, #9ca3af)"></span>
        <span>Neutral (-19 to 19)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--warning, #f59e0b)"></span>
        <span>Unfriendly (-20 to -59)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--danger, #ef4444)"></span>
        <span>Hostile (-60 or less)</span>
      </div>
      <div class="legend-divider"></div>
      <div class="legend-item">
        <span class="legend-node" style="background: var(--accent, #7c3aed)"></span>
        <span>Character</span>
      </div>
      <div class="legend-item">
        <span class="legend-node" style="background: var(--warning, #f59e0b)"></span>
        <span>Faction</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.graph-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.graph-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: var(--bg-secondary, #16213e);
  border-radius: var(--border-radius, 8px);
  border: 1px solid var(--border, #3a3a5c);
}

.graph-tooltip {
  display: none;
  position: fixed;
  padding: 8px 12px;
  background: var(--bg-elevated, #252545);
  border: 1px solid var(--border, #3a3a5c);
  border-radius: var(--border-radius-sm, 4px);
  font-size: 13px;
  line-height: 1.4;
  color: var(--text, #f0f0f5);
  pointer-events: none;
  z-index: 1000;
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.3));
}

.graph-legend {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 12px;
  background: var(--bg-elevated, #252545);
  border: 1px solid var(--border, #3a3a5c);
  border-radius: var(--border-radius, 8px);
  font-size: 12px;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text, #f0f0f5);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: var(--text-muted, #9ca3af);
}

.legend-color {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.legend-node {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-divider {
  height: 1px;
  background: var(--border, #3a3a5c);
  margin: 8px 0;
}
</style>
