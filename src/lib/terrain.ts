import { PLAZA_LIST, WORLD_RADIUS } from './world'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * Altura del terreno: tres montañas con meseta + hondonada central, unidas con una norma-4
 * (suave, y 0 donde no hay montaña). Las mesetas se aplanan exactamente para poder construir encima.
 */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  let p4 = Math.pow(1 - smoothstep(18, WORLD_RADIUS, r), 4) // valle base ≈ 1
  for (const p of PLAZA_LIST) {
    const d = Math.hypot(x - p.x, z - p.z)
    p4 += Math.pow(p.h * (1 - smoothstep(p.flat, p.outer, d)), 4)
  }
  let h = Math.sqrt(Math.sqrt(p4))

  let flatMask = 0
  for (const p of PLAZA_LIST) {
    const d = Math.hypot(x - p.x, z - p.z)
    const m = 1 - smoothstep(p.flat, p.flat + 2.5, d)
    h = h * (1 - m) + p.h * m
    flatMask = Math.max(flatMask, m)
  }

  const edge = 1 - smoothstep(WORLD_RADIUS - 7, WORLD_RADIUS, r)
  const n =
    Math.sin(x * 0.72 + 1.3) * Math.cos(z * 0.61 - 0.4) +
    0.8 * Math.sin(x * 0.29 - z * 0.41 + 2.0) +
    0.4 * Math.sin(x * 1.3 + z * 1.1)
  return h * edge + n * 0.4 * (1 - flatMask) * edge
}
