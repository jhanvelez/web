import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pathBetween } from '../../lib/nav'
import { poiRegistry, live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import type { Vec2 } from '../../types/portfolio'
import { Particles, type ParticleBuffers } from './Particles'
import type { JeepRig } from './Props'

/** Ronda del Jeep: baja por la troncal de cada montaña pasando siempre por el café. */
const SEQ = ['P-B', 'P-K', 'P-A', 'P-K', 'P-C', 'P-K']
const PATROL: Vec2[] = SEQ.flatMap((id, i) => pathBetween(id, SEQ[(i + 1) % SEQ.length]))

const CRUISE = 3.8
const DUST = 90
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

interface Props {
  /** Con el panel del Jeep abierto se detiene. */
  paused: boolean
  children: (rig: JeepRig) => ReactNode
}

/**
 * Willys autónomo: sigue los caminos de piedra con una conducción "áspera":
 * suspensión de resorte con baches aleatorios, trepidación continua, cabeceo/alabeo según el
 * terreno, ruedas que rebotan por separado y una estela de polvo.
 */
export function DrivingJeep({ paused, children }: Props) {
  const group = useRef<THREE.Group>(null)
  const rig = useMemo<JeepRig>(() => ({ roll: 0, bounce: [0, 0, 0, 0], steer: 0 }), [])
  const st = useRef({
    x: PATROL[0][0],
    z: PATROL[0][1],
    yaw: 0,
    speed: 0,
    idx: 1,
    y: 0, // desplazamiento vertical de la carrocería (resorte)
    vy: 0,
    nextKick: 0.6,
  })
  const dust = useRef({ cursor: 0, life: new Float32Array(DUST), vel: new Float32Array(DUST * 3), carry: 0 })

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const s = st.current
    const g = group.current
    if (!g) return

    // Dirección: hacia el siguiente punto de la ronda.
    let target = PATROL[s.idx]
    if (Math.hypot(target[0] - s.x, target[1] - s.z) < 0.9) {
      s.idx = (s.idx + 1) % PATROL.length
      target = PATROL[s.idx]
    }
    const want = Math.atan2(target[0] - s.x, target[1] - s.z)
    const diff = wrap(want - s.yaw)
    s.yaw += diff * (1 - Math.exp(-dt * 4))
    const goal = paused ? 0 : CRUISE * (1 - Math.min(Math.abs(diff), 1) * 0.45)
    s.speed = THREE.MathUtils.damp(s.speed, goal, 2.2, dt)
    s.x += Math.sin(s.yaw) * s.speed * dt
    s.z += Math.cos(s.yaw) * s.speed * dt

    // Aspereza: baches aleatorios sobre un resorte amortiguado + trepidación continua.
    const sf = s.speed / CRUISE
    s.nextKick -= dt * sf
    if (s.nextKick <= 0) {
      s.vy += (0.9 + Math.random() * 1.1) * sf
      s.nextKick = 0.35 + Math.random() * 0.9
    }
    s.vy += (-160 * s.y - 11 * s.vy) * dt
    s.y += s.vy * dt
    const buzz = (Math.sin(t * 38) + Math.sin(t * 53 + 2)) * 0.006 * sf

    // Pose según el terreno bajo las ruedas.
    const sn = Math.sin(s.yaw)
    const cs = Math.cos(s.yaw)
    const h = (lx: number, lz: number) => terrainHeight(s.x + lx * cs + lz * sn, s.z - lx * sn + lz * cs)
    const base = h(0, 0)
    const pitch = -Math.atan2(h(0, 0.8) - h(0, -0.8), 1.6)
    const roll = Math.atan2(h(0.42, 0) - h(-0.42, 0), 0.84)
    g.position.set(s.x, base + 0.04 + s.y + buzz, s.z)
    g.rotation.set(pitch + s.y * 0.9 + Math.sin(t * 21) * 0.01 * sf, s.yaw, roll + Math.sin(t * 29) * 0.016 * sf, 'YXZ')

    rig.roll += (s.speed * dt) / 0.2
    for (let i = 0; i < 4; i++) rig.bounce[i] = s.y * 0.6 + Math.sin(t * 35 + i * 1.7) * 0.014 * sf

    poiRegistry.set('npc-jeep', { x: s.x, z: s.z, card: 'jeep', r: 4, prio: 2 })
    live.jeep.x = s.x
    live.jeep.z = s.z
    live.jeep.yaw = s.yaw
  })

  // Polvo: puff en cada rueda trasera, sube, se expande y se desvanece.
  const updateDust = (b: ParticleBuffers, dt: number) => {
    const s = st.current
    const d = dust.current
    d.carry += s.speed * dt * 9
    while (d.carry >= 1) {
      d.carry -= 1
      for (const lx of [-0.42, 0.42]) {
        const i = d.cursor
        d.cursor = (d.cursor + 1) % DUST
        const sn = Math.sin(s.yaw)
        const cs = Math.cos(s.yaw)
        const wx = s.x + lx * cs - 0.5 * sn
        const wz = s.z - lx * sn - 0.5 * cs
        b.pos[i * 3] = wx
        b.pos[i * 3 + 1] = terrainHeight(wx, wz) + 0.12
        b.pos[i * 3 + 2] = wz
        d.vel[i * 3] = -sn * s.speed * 0.25 + (Math.random() - 0.5) * 0.6
        d.vel[i * 3 + 1] = 0.5 + Math.random() * 0.7
        d.vel[i * 3 + 2] = -cs * s.speed * 0.25 + (Math.random() - 0.5) * 0.6
        d.life[i] = 1
      }
    }
    for (let i = 0; i < DUST; i++) {
      if (d.life[i] <= 0) {
        b.alpha[i] = 0
        continue
      }
      d.life[i] -= dt * 1.1
      b.pos[i * 3] += d.vel[i * 3] * dt
      b.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt
      b.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt
      d.vel[i * 3 + 1] *= 1 - dt * 1.4
      const l = Math.max(0, d.life[i])
      b.alpha[i] = l * 0.5
      b.size[i] = 0.5 + (1 - l) * 1.3
    }
  }

  return (
    <>
      <group ref={group}>{children(rig)}</group>
      <Particles count={DUST} color="#e3bf8c" update={updateDust} />
    </>
  )
}
