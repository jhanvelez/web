import { HOTSPOTS } from '../data/projects'
import type { HotspotConfig, PlazaId, Vec2 } from '../types/portfolio'
import { createRng } from './random'
import { MOUNTAIN_IDS, PLAZAS } from './world'

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
export const HOUSE_SCALE = 0.9

export interface HouseDef extends Placement {
  id: string
  plaza: PlazaId
  variant: number
  floors: 1 | 2
  scale: number
  main: boolean
}

const COUNTS: Record<'A' | 'B' | 'C', number> = { A: 5, B: 5, C: 4 }

function buildHouses(): HouseDef[] {
  const out: HouseDef[] = []
  let v = 0
  // Las casas se abren en arco en el lado opuesto a la cámara y miran al centro de la plaza:
  // así todas muestran su frente (y su balcón) hacia quien mira.
  const AWAY = Math.atan2(-1, -1) // dirección contraria a la cámara inicial (+x, +z)
  const SPAN = deg(210)
  for (const id of MOUNTAIN_IDS) {
    const p = PLAZAS[id]
    const toK = Math.atan2(K.z - p.z, K.x - p.x)
    const n = COUNTS[id]
    // Candidatos repartidos en el arco; se descarta el sector del camino que baja al café.
    const cand = Array.from({ length: n + 3 }, (_, i) => AWAY - SPAN / 2 + ((i + 0.5) * SPAN) / (n + 3)).filter(
      (a) => Math.abs(Math.atan2(Math.sin(a - toK), Math.cos(a - toK))) > deg(30),
    )
    cand.slice(0, n).forEach((a, i) => {
      const x = p.x + Math.cos(a) * HOUSE_RING
      const z = p.z + Math.sin(a) * HOUSE_RING
      out.push({
        id: `${id}${i}`,
        plaza: id,
        x,
        z,
        rotationY: facing(x, z, p.x, p.z),
        variant: v++ % 5,
        floors: i % 3 === 2 ? 1 : 2,
        scale: HOUSE_SCALE,
        main: false,
      })
    })
  }
  // Casa principal: la de dos pisos de la montaña A que mejor se ve desde la cámara inicial.
  const main = out
    .filter((h) => h.plaza === 'A' && h.floors === 2)
    .reduce((best, h) => (h.x + h.z < best.x + best.z ? h : best))
  main.main = true
  main.variant = 4
  main.scale = 1
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
    edges.push({ a: `P-${id}`, b: 'P-K', points: windingPath([p.x, p.z], [K.x, K.z], 2.4, rng.range(0, 6)) })
  }
  // Ramas: cada casa sale a la plaza de su montaña.
  for (const h of HOUSES) {
    const s = houseStand(h)
    const p = PLAZAS[h.plaza]
    nodes.push({ id: `H-${h.id}`, x: s[0], z: s[1] })
    edges.push({ a: `H-${h.id}`, b: `P-${h.plaza}`, points: windingPath(s, [p.x, p.z], 0.25, rng.range(0, 6)) })
  }
  return { nodes, edges }
}
export const NETWORK = buildNetwork()

/* ───────────── Zonas libres ───────────── */

export const ARRIERO_START: Vec2 = [K.x + 2.6, K.z + 2.6]

export const KEEP_CLEAR: readonly Circle[] = [
  ...Object.values(PLAZAS).map((p) => ({ x: p.x, z: p.z, r: p.id === 'K' ? 7 : 8.4 })),
  ...HOUSES.map((h) => ({ x: h.x, z: h.z, r: 3.6 })),
  ...HOTSPOTS.filter((h) => h.place.type !== 'house').map((h) => {
    const p = resolvePlacement(h)
    return { x: p.x, z: p.z, r: 2.3 }
  }),
  ...NETWORK.edges.flatMap((e) => e.points.map(([x, z]) => ({ x, z, r: 0.9 }))),
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
  ...NETWORK.edges.flatMap((e) => e.points.map(([x, z]) => ({ x, z, r: 0.95 }))),
]
