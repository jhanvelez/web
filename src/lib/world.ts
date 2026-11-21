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
  // Tres montañas idénticas en un triángulo equilátero (radio 28) alrededor del café.
  A: { id: 'A', x: -24.25, z: -12, h: 4, flat: 11, outer: 28, cobble: 3.4 },
  B: { id: 'B', x: 24.25, z: -12, h: 4, flat: 11, outer: 28, cobble: 3.4 },
  C: { id: 'C', x: 0, z: 30, h: 4, flat: 11, outer: 28, cobble: 3.4 },
  K: { id: 'K', x: 0, z: 2, h: 1.3, flat: 6, outer: 14, cobble: 4.6 },
}
export interface Pond {
  x: number
  z: number
  r: number
  depth: number
}
/** Una sola laguna: recibe la cascada. */
export const PONDS: readonly Pond[] = [{ x: 38, z: 26, r: 6, depth: 2.6 }]
export const WATER_LEVEL = 0.2

/**
 * Cascada: una loma de roca junto a la laguna; la cinta de agua baja por su cara oriental.
 * `from` está en la cima y `to` al pie, dentro de la laguna.
 */
export const CASCADE = {
  mound: { x: 30, z: 26, h: 3.4, flat: 2, outer: 7.5 },
  from: [30.4, 26] as readonly [number, number],
  to: [35.6, 26] as readonly [number, number],
}

export const PLAZA_LIST = Object.values(PLAZAS)
export const MOUNTAIN_IDS = ['A', 'B', 'C'] as const
