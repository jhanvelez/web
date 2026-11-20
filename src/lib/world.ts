import type { PlazaId } from '../types/portfolio'

export const WORLD_RADIUS = 36

export interface Plaza {
  id: PlazaId
  x: number
  z: number
  /** Altura de la meseta. */
  h: number
  /** Radio plano (meseta). */
  flat: number
  /** Radio donde la ladera llega a la base. */
  outer: number
  /** Radio del empedrado. */
  cobble: number
}

/** Tres montañas en triángulo y un café en la hondonada central. */
export const PLAZAS: Record<PlazaId, Plaza> = {
  A: { id: 'A', x: -15, z: -8, h: 9, flat: 6.2, outer: 16, cobble: 2.5 },
  B: { id: 'B', x: 15, z: -10, h: 8, flat: 6.2, outer: 16, cobble: 2.5 },
  C: { id: 'C', x: 2, z: 16, h: 6.5, flat: 6.2, outer: 15, cobble: 2.5 },
  K: { id: 'K', x: 0, z: 1, h: 1.5, flat: 3.8, outer: 8, cobble: 3.6 },
}
export interface Pond {
  x: number
  z: number
  r: number
  depth: number
}
/** Estanques en el valle, lejos de los caminos. */
export const PONDS: readonly Pond[] = [
  { x: 22, z: 8, r: 5.5, depth: 2.2 },
  { x: -25, z: 12, r: 5, depth: 2.2 },
  { x: 2, z: -24, r: 6, depth: 2.4 },
]
export const WATER_LEVEL = 0.2

export const PLAZA_LIST = Object.values(PLAZAS)
export const MOUNTAIN_IDS = ['A', 'B', 'C'] as const
