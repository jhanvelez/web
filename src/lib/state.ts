/** Estado mutable compartido entre sistemas 3D y HUD (se lee cada frame; no dispara renders de React). */
export const live = {
  player: { x: 0, z: 0, yaw: 0, speed: 0 },
  jeep: { x: 0, z: 0, yaw: 0 },
  /** Azimut de la cámara: el movimiento del arriero es relativo a la pantalla. */
  camAz: Math.PI / 4,
  /** Especie de árbol más cercana al arriero (para el cartel del HUD). */
  nearTree: null as string | null,
}
