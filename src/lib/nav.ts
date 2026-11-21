import type { Vec2 } from '../types/portfolio'
import { HOUSES, houseStand, NETWORK, PADDOCK_GATE_ANGLE } from './layout'
import { TREES } from './trees'
import { terrainHeight } from './terrain'
import { PADDOCK, WATER_LEVEL, WORLD_RADIUS } from './world'

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

const adj = new Map<string, { to: string; points: Vec2[]; cost: number }[]>()
for (const e of NETWORK.edges) {
  const cost = e.points.reduce((s, p, i, arr) => (i ? s + dist(arr[i - 1], p) : 0), 0)
  if (!adj.has(e.a)) adj.set(e.a, [])
  if (!adj.has(e.b)) adj.set(e.b, [])
  adj.get(e.a)!.push({ to: e.b, points: e.points, cost })
  adj.get(e.b)!.push({ to: e.a, points: [...e.points].reverse(), cost })
}
const nodeById = new Map(NETWORK.nodes.map((n) => [n.id, n]))

function nearestNode(p: Vec2) {
  let best = NETWORK.nodes[0]
  let bd = Infinity
  for (const n of NETWORK.nodes) {
    const d = dist(p, [n.x, n.z])
    if (d < bd) {
      bd = d
      best = n
    }
  }
  return best
}

/** ¿El segmento a→b esquiva todas las casas? */
function segmentClear(a: Vec2, b: Vec2): boolean {
  const len2 = Math.max(1e-6, (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
  return HOUSES.every((h) => {
    const t = Math.max(0, Math.min(1, ((h.x - a[0]) * (b[0] - a[0]) + (h.z - a[1]) * (b[1] - a[1])) / len2))
    return Math.hypot(a[0] + (b[0] - a[0]) * t - h.x, a[1] + (b[1] - a[1]) * t - h.z) > 2.6
  })
}

/** Dijkstra sobre el árbol de caminos; devuelve la polilínea completa entre dos nodos. */
function networkPath(from: string, to: string): Vec2[] {
  const best = new Map<string, number>([[from, 0]])
  const prev = new Map<string, { id: string; points: Vec2[] }>()
  const open = new Set([from])
  while (open.size) {
    let cur = ''
    let cd = Infinity
    for (const id of open) {
      const d = best.get(id) ?? Infinity
      if (d < cd) {
        cd = d
        cur = id
      }
    }
    open.delete(cur)
    if (cur === to) break
    for (const e of adj.get(cur) ?? []) {
      const nd = cd + e.cost
      if (nd < (best.get(e.to) ?? Infinity)) {
        best.set(e.to, nd)
        prev.set(e.to, { id: cur, points: e.points })
        open.add(e.to)
      }
    }
  }
  const parts: Vec2[][] = []
  for (let id = to; id !== from; ) {
    const p = prev.get(id)
    if (!p) return []
    parts.unshift(p.points)
    id = p.id
  }
  return parts.flat()
}

/** Polilínea de caminos entre dos nodos de la red (p. ej. 'P-A' → 'P-K'). */
export const pathBetween = networkPath

/** ¿Está bloqueado caminar aquí? (borde del mundo, agua o casas). */
export function blocked(x: number, z: number): boolean {
  if (Math.hypot(x, z) > WORLD_RADIUS - 2.5) return true
  if (terrainHeight(x, z) < WATER_LEVEL + 0.02) return true
  for (const h of HOUSES) if (Math.hypot(x - h.x, z - h.z) < (h.main ? 2.9 : 2.5)) return true
  return false
}

/** Bloqueos para el Jeep: además de lo anterior, troncos de árbol y la cerca del potrero (salvo la puerta). */
export function carBlocked(x: number, z: number): boolean {
  if (blocked(x, z)) return true
  for (const t of TREES) if (Math.hypot(x - t.x, z - t.z) < 0.65) return true
  const d = Math.hypot(x - PADDOCK.x, z - PADDOCK.z)
  if (Math.abs(d - PADDOCK.r) < 0.7) {
    const a = Math.atan2(z - PADDOCK.z, x - PADDOCK.x)
    if (Math.abs(Math.atan2(Math.sin(a - PADDOCK_GATE_ANGLE), Math.cos(a - PADDOCK_GATE_ANGLE))) > 0.32) return true
  }
  return false
}

/** Si el destino cae dentro de una casa, se redirige a su puerta. */
export function resolveTarget(x: number, z: number): Vec2 {
  for (const h of HOUSES) if (Math.hypot(x - h.x, z - h.z) < 2.7) return houseStand(h)
  return [x, z]
}

/** Ruta caminable: directa si está despejada y cerca; si no, por la red de caminos de piedra. */
export function route(from: Vec2, to: Vec2): Vec2[] {
  if (dist(from, to) < 14 && segmentClear(from, to)) return [to]
  const na = nearestNode(from)
  const nb = nearestNode(to)
  const mid = na.id === nb.id ? [] : networkPath(na.id, nb.id)
  const start = nodeById.get(na.id)!
  return [[start.x, start.z], ...mid, to]
}

const cafeNode = NETWORK.nodes.find((n) => n.id === 'P-K')!
/** Destinos del paseo automático del arriero: la puerta de cada casa y el café. */
const gateNode = NETWORK.nodes.find((nd) => nd.id === 'G-H')!
export const WANDER_TARGETS: Vec2[] = [...HOUSES.map(houseStand), [cafeNode.x + 2.4, cafeNode.z + 2.4], [gateNode.x, gateNode.z]]
