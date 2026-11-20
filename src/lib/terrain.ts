export const TERRAIN_RADIUS = 12.5
export const PLATEAU_RADIUS = 6.2
export const PLATEAU_HEIGHT = 3.4

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Altura del terreno en (x, z). Meseta plana al centro, ladera suave y orilla en y≈0. */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const t = clamp01((r - PLATEAU_RADIUS) / (TERRAIN_RADIUS - PLATEAU_RADIUS))
  const base = PLATEAU_HEIGHT * (1 - smoothstep(0, 1, t))
  const n =
    Math.sin(x * 0.72 + 1.3) * Math.cos(z * 0.61 - 0.4) +
    0.8 * Math.sin(x * 0.29 - z * 0.41 + 2.0) +
    0.4 * Math.sin(x * 1.3 + z * 1.1)
  const amp = 0.3 * smoothstep(5, 8, r) * (1 - t * t * t)
  return base + n * amp
}
