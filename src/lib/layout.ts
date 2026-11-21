import { HOTSPOTS } from '../data/projects'
import type { HotspotConfig, PlazaId, Vec2 } from '../types/portfolio'
import { createRng } from './random'
import { CASCADE, MOUNTAIN_IDS, PLAZAS } from './world'

export interface Circle {
  x: number
  z: number
  r: number
}

export interface Placement {
  x: number
  z: number
  rotationY: number
}

const deg = (d: number) => (d * Math.PI) / 180
const K = PLAZAS.K

/** Yaw para que el frente (+z) mire desde (x, z) hacia (tx, tz). */
const facing = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z)
export const frontOf = (ry: number): Vec2 => [Math.sin(ry), Math.cos(ry)]

/* ───────────── Casas del pueblo ───────────── */

export const HOUSE_RING = 9
export const HOUSE_SCALE = 1

export interface HouseDef extends Placement {
  id: string
  plaza: PlazaId
  variant: number
  floors: 1 | 2
  scale: number
  main: boolean
}

/** Casas por montaña. */
const COUNTS: Record<'A' | 'B' | 'C', number> = { A: 3, B: 3, C: 3 }

function buildHouses(): HouseDef[] {
  const out: HouseDef[] = []
  // Orden matemático: n casas a 360°/n exactos, mismo radio, misma escala y mirando al centro de la plaza.
  // La fase arranca opuesta a la cámara inicial para que la casa principal quede siempre de frente.
  const PHASE = Math.atan2(-1, -1)
  for (const id of MOUNTAIN_IDS) {
    const p = PLAZAS[id]
    const n = COUNTS[id]
    for (let i = 0; i < n; i++) {
      const a = PHASE + (i * 2 * Math.PI) / n
      const x = p.x + Math.cos(a) * HOUSE_RING
      const z = p.z + Math.sin(a) * HOUSE_RING
      out.push({ id: `${id}${i}`, plaza: id, x, z, rotationY: facing(x, z, p.x, p.z), variant: i % 3, floors: 2, scale: HOUSE_SCALE, main: false })
    }
  }
  const main = out.find((h) => h.id === 'A0')!
  main.main = true
  return out
}
export const HOUSES: readonly HouseDef[] = buildHouses()
export const MAIN_HOUSE = HOUSES.find((h) => h.main)!

/* ───────────── Colocación de hotspots ───────────── */

export function resolvePlacement(h: HotspotConfig): Placement {
  if (h.place.type === 'house') {
    return { x: MAIN_HOUSE.x, z: MAIN_HOUSE.z, rotationY: MAIN_HOUSE.rotationY + h.rotationY }
  }
  const { around, radius, angleDeg } = h.place
  const p = PLAZAS[around]
  const base = around === 'K' ? 0 : Math.atan2(K.z - p.z, K.x - p.x)
  const a = base + deg(angleDeg)
  const x = p.x + Math.cos(a) * radius
  const z = p.z + Math.sin(a) * radius
  const face = radius === 0 ? 0 : facing(x, z, p.x, p.z)
  return { x, z, rotationY: face + h.rotationY }
}

export function standPoint(h: HotspotConfig): Vec2 {
  const pl = resolvePlacement(h)
  const [fx, fz] = frontOf(pl.rotationY)
  return [pl.x + fx * h.standDistance, pl.z + fz * h.standDistance]
}

export const houseStand = (h: HouseDef): Vec2 => {
  const [fx, fz] = frontOf(h.rotationY)
  return [h.x + fx * 3.2, h.z + fz * 3.2]
}

/* ───────────── Red de caminos (árbol) ───────────── */

export interface NavNode {
  id: string
  x: number
  z: number
}
export interface NavEdge {
  a: string
  b: string
  points: Vec2[]
}

/** Camino sinuoso entre dos puntos, muestreado cada ~0.6 u. */
function windingPath(a: Vec2, b: Vec2, amp: number, seed: number): Vec2[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const n = Math.max(2, Math.ceil(len / 0.6))
  const nx = -(b[1] - a[1]) / len
  const nz = (b[0] - a[0]) / len
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const off = amp * Math.sin(t * Math.PI) * Math.sin(t * 3.2 + seed)
    return [a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + nz * off] as Vec2
  })
}

function buildNetwork() {
  const nodes: NavNode[] = []
  const edges: NavEdge[] = []
  const rng = createRng(5)
  for (const p of Object.values(PLAZAS)) nodes.push({ id: `P-${p.id}`, x: p.x, z: p.z })
  // Troncal: cada montaña baja al café.
  for (const id of MOUNTAIN_IDS) {
    const p = PLAZAS[id]
    edges.push({ a: `P-${id}`, b: 'P-K', points: windingPath([p.x, p.z], [K.x, K.z], 0, rng.range(0, 6)) })
  }
  // Ramas: cada casa sale a la plaza de su montaña.
  for (const h of HOUSES) {
    const s = houseStand(h)
    const p = PLAZAS[h.plaza]
    nodes.push({ id: `H-${h.id}`, x: s[0], z: s[1] })
    edges.push({ a: `H-${h.id}`, b: `P-${h.plaza}`, points: windingPath(s, [p.x, p.z], 0, rng.range(0, 6)) })
  }
  return { nodes, edges }
}
export const NETWORK = buildNetwork()

/* ───────────── Zonas libres ───────────── */

/** Letras del nombre: en el centro del mundo, de cara a la cámara inicial (+x, +z). */
export const NAME_CENTER: Vec2 = [10, 8]
export const NAME_YAW = Math.PI / 4
/** El Jeep arranca frente a las letras, mirándolas. */
export const JEEP_START = { x: NAME_CENTER[0] + 5.5, z: NAME_CENTER[1] + 5.5, yaw: Math.atan2(-1, -1) }
export const ARRIERO_START: Vec2 = [JEEP_START.x, JEEP_START.z]

/** Ancho de media vía: troncales de carretera y ramales a las casas. */
export const ROAD_HALF = (edgeA: string) => (edgeA.startsWith('H-') ? 1.1 : 1.9)

export const KEEP_CLEAR: readonly Circle[] = [
  { x: CASCADE.mound.x + 2, z: CASCADE.mound.z, r: 10 },
  { x: NAME_CENTER[0], z: NAME_CENTER[1], r: 11 },
  ...Object.values(PLAZAS).map((p) => ({ x: p.x, z: p.z, r: p.id === 'K' ? 7 : 8.4 })),
  ...HOUSES.map((h) => ({ x: h.x, z: h.z, r: 3.6 })),
  ...HOTSPOTS.filter((h) => h.place.type !== 'house').map((h) => {
    const p = resolvePlacement(h)
    return { x: p.x, z: p.z, r: 2.3 }
  }),
  ...NETWORK.edges.flatMap((e) => e.points.map(([x, z]) => ({ x, z, r: ROAD_HALF(e.a) + 0.6 }))),
]

export const isClear = (x: number, z: number, extra = 0) =>
  KEEP_CLEAR.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + extra)

/* ───────────── Farolas, posiciones y zonas para el pasto ───────────── */

/** Una farola por plaza, del lado opuesto al camino que baja al café. */
export const LAMPS: readonly Vec2[] = Object.values(PLAZAS).map((p) => {
  if (p.id === 'K') return [p.x - 3.1, p.z + 1.4] as Vec2
  const a = Math.atan2(K.z - p.z, K.x - p.x) + Math.PI
  return [p.x + Math.cos(a) * 2.2, p.z + Math.sin(a) * 2.2] as Vec2
})

/** Centro de cada hotspot (el Jeep se mueve: su posición viva está en lib/state). */
export const HOTSPOT_POINTS = HOTSPOTS.map((h) => {
  const p = resolvePlacement(h)
  return { id: h.id, kind: h.kind, label: h.label, x: p.x, z: p.z, radius: h.kind === 'house' ? 6 : 4.2 }
})

/** Sitios donde no debe crecer pasto (caminos, plazas, casas, objetos). */
export const GRASS_AVOID: readonly Circle[] = [
  ...Object.values(PLAZAS).map((p) => ({ x: p.x, z: p.z, r: p.cobble + 0.6 })),
  ...HOUSES.map((h) => ({ x: h.x, z: h.z, r: 2.7 })),
  ...HOTSPOTS.filter((h) => h.place.type !== 'house').map((h) => {
    const p = resolvePlacement(h)
    return { x: p.x, z: p.z, r: 1.7 }
  }),
  ...LAMPS.map(([x, z]) => ({ x, z, r: 0.5 })),
  ...NETWORK.edges.flatMap((e) => e.points.map(([x, z]) => ({ x, z, r: ROAD_HALF(e.a) + 0.35 }))),
]
