import type { PlazaId } from '../types/portfolio'

export const WORLD_RADIUS = 56

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
  A: { id: 'A', x: -26, z: -14, h: 4.6, flat: 11, outer: 28, cobble: 3.4 },
  B: { id: 'B', x: 26, z: -16, h: 4, flat: 11, outer: 28, cobble: 3.4 },
  C: { id: 'C', x: 4, z: 28, h: 3.4, flat: 10, outer: 26, cobble: 3.4 },
  K: { id: 'K', x: 0, z: 2, h: 1.3, flat: 6, outer: 14, cobble: 4.6 },
}
export interface Pond {
  x: number
  z: number
  r: number
  depth: number
}
/** Estanques en el valle, lejos de los caminos. */
export const PONDS: readonly Pond[] = [
  { x: 40, z: 10, r: 7, depth: 2.4 },
  { x: -42, z: 14, r: 6.5, depth: 2.4 },
  { x: 4, z: -40, r: 8, depth: 2.6 },
]
export const WATER_LEVEL = 0.2

/** Potrero de los caballos de paso fino, en la llanura al noroeste del café. */
export const PADDOCK = { x: -22, z: 20, r: 8.5 }

export const PLAZA_LIST = Object.values(PLAZAS)
export const MOUNTAIN_IDS = ['A', 'B', 'C'] as const
