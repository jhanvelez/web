import { HOTSPOT_POINTS, HOUSES } from './layout'
import { poiRegistry } from './state'
import { CASCADE, PLAZAS, PONDS } from './world'

/**
 * Lugares con ficha explicativa: al acercarse el HUD "escribe" su descripción.
 * Los animales y el Jeep se registran solos (prioridad 2); los fijos, aquí (prioridad 1).
 */
const BY_KIND: Record<string, string> = { sign: 'letrero', sack: 'costal', viewpoint: 'mirador', cafe: 'cafe' }

for (const h of HOTSPOT_POINTS) {
  const card = BY_KIND[h.kind]
  if (card) poiRegistry.set(`poi-${h.id}`, { x: h.x, z: h.z, card, r: 4.5, prio: 1 })
}
for (const h of HOUSES) poiRegistry.set(`poi-${h.id}`, { x: h.x, z: h.z, card: 'casa', r: 5.5, prio: 1 })
for (const id of ['A', 'B', 'C'] as const) {
  const p = PLAZAS[id]
  poiRegistry.set(`poi-plaza-${id}`, { x: p.x, z: p.z, card: 'plaza', r: 4, prio: 0 })
}
poiRegistry.set('poi-cascada', { x: CASCADE.to[0], z: CASCADE.to[1], card: 'cascada', r: 7, prio: 1 })
poiRegistry.set('poi-laguna', { x: PONDS[0].x, z: PONDS[0].z, card: 'laguna', r: 9, prio: 0 })
