/** Estado mutable compartido entre sistemas 3D y HUD (se lee cada frame; no dispara renders de React). */
export const live = {
  player: { x: 0, z: 0, yaw: 0, speed: 0, vx: 0, vz: 0 },
  /** Las letras lo ponen < 1 al chocar: el Jeep pierde velocidad. */
  hitSlow: 1,
  jeep: { x: 0, z: 0, yaw: 0 },
  /** Azimut de la cámara: el movimiento del arriero es relativo a la pantalla. */
  camAz: Math.PI / 4,
  camDist: 42,
  /** Especie de árbol más cercana al arriero (para el cartel del HUD). */
  nearTree: null as string | null,
  /** Ficha del caballo o chalán más cercano (para el HUD). */
  nearHorse: null as string | null,
}

/** Caballos y jinetes: cada uno publica su posición y qué ficha mostrar al acercarse. */
export const horseRegistry = new Map<string, { x: number; z: number; card: string; r?: number; prio?: number }>()
