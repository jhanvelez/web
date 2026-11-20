import { HOTSPOTS } from '../data/projects'
import type { Vec2 } from '../types/portfolio'

export interface Circle {
  x: number
  z: number
  r: number
}

export const ARRIERO_POS: Vec2 = [2.2, 3.9]
export const ARRIERO_ROT = 0.4

function bezier(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const u = 1 - t
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ]
}

const curve = (a: Vec2, b: Vec2, c: Vec2): Vec2[] =>
  Array.from({ length: 11 }, (_, i) => bezier(a, b, c, i / 10))

/** Caminos de piedra: de la puerta de la casa al letrero y al Jeep. */
export const PATHS: readonly (readonly Vec2[])[] = [
  curve([0, 3.7], [1.2, 6.4], [4.2, 5.6]),
  curve([0, 3.7], [-2.2, 6.0], [-4.3, 4.9]),
]

/** Zonas libres de vegetación y rocas. */
export const KEEP_CLEAR: readonly Circle[] = [
  { x: 0, z: 0.4, r: 4.8 },
  { x: ARRIERO_POS[0], z: ARRIERO_POS[1], r: 1.2 },
  ...HOTSPOTS.filter((h) => h.kind !== 'house').map((h) => ({
    x: h.position[0],
    z: h.position[1],
    r: 2.7,
  })),
  ...PATHS.flat().map(([x, z]) => ({ x, z, r: 0.8 })),
]

export const isClear = (x: number, z: number, extra = 0) =>
  KEEP_CLEAR.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + extra)
