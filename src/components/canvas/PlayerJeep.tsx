import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { input } from '../../lib/input'
import { carBlocked, resolveTarget, route } from '../../lib/nav'
import { live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import * as sfx from '../../lib/sfx'
import type { Vec2 } from '../../types/portfolio'
import { Arriero, type ArrieroApi, type NearTarget } from './Arriero'
import { Particles, type ParticleBuffers } from './Particles'
import { JeepWillys, type JeepRig } from './Props'

const SCALE = 1.5 // el Willys mide ≈2.6 u de largo: grande y notorio, junto a casas de ≈3 u
const WHEELBASE = 1.7
const MAX_FWD = 8.5
const MAX_TURBO = 13
const MAX_REV = 3.5
const MAX_STEER = 0.55
const DUST = 110
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const damp = THREE.MathUtils.damp

interface Props {
  apiRef: MutableRefObject<ArrieroApi | null>
  start: { x: number; z: number; yaw: number }
  targets: readonly NearTarget[]
  onNear: (id: string | null) => void
}

/**
 * El arriero al volante de su Willys.
 * ↑/↓ aceleran y frenan (reversa), ←/→ giran el volante y las llantas delanteras; Shift = turbo;
 * Espacio = pito. Con la palanca táctil el giro y la aceleración son analógicos.
 * Suspensión de resorte con baches, trepidación, polvo y colisiones con casas, árboles, cerca y agua.
 * Puede ir solo (piloto automático) hasta un lugar cuando se abre un proyecto.
 */
export function PlayerJeep({ apiRef, start, targets, onNear }: Props) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Group>(null)
  const beacon = useRef<THREE.Mesh>(null)
  const rig = useMemo<JeepRig>(() => ({ roll: 0, bounce: [0, 0, 0, 0], steer: 0 }), [])
  const walk = useRef(0)
  const pace = useRef(0)
  const steerRef = useRef(0)
  const st = useRef({
    x: start.x,
    z: start.z,
    yaw: start.yaw,
    speed: 0,
    steer: 0,
    y: 0,
    vy: 0,
    nextKick: 0.4,
    queue: [] as Vec2[],
    dest: null as Vec2 | null,
    near: null as string | null,
    bumpCd: 0,
  })
  const dust = useRef({ cursor: 0, life: new Float32Array(DUST), vel: new Float32Array(DUST * 3), carry: 0 })

  useEffect(() => {
    apiRef.current = {
      walkTo: (x, z) => {
        const s = st.current
        const target = resolveTarget(x, z)
        s.queue = route([s.x, s.z], target)
        s.dest = target
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const s = st.current
    const g = group.current
    if (!g) return

    // ── Mando: teclado/palanca o piloto automático ──
    const ax = input.axis()
    let throttle = 0
    let steerIn = 0
    let cap = input.run() ? MAX_TURBO : MAX_FWD
    if (Math.abs(ax.x) > 0.05 || Math.abs(ax.y) > 0.05) {
      s.queue = []
      s.dest = null
      throttle = ax.y
      steerIn = -ax.x // + = izquierda
    } else if (s.queue.length) {
      const n = s.queue[0]
      const dx = n[0] - s.x
      const dz = n[1] - s.z
      const d = Math.hypot(dx, dz)
      const last = s.queue.length === 1
      if (d < (last ? 1.4 : 2)) {
        s.queue.shift()
        if (!s.queue.length) s.dest = null
      } else {
        const diff = wrap(Math.atan2(dx, dz) - s.yaw)
        steerIn = THREE.MathUtils.clamp(diff * 1.8, -1, 1)
        cap = last && d < 6 ? 3 : 6.5
        throttle = Math.abs(diff) > 1.3 ? 0.35 : 1
      }
    } else if (s.dest === null && Math.abs(s.speed) < 0.2) {
      s.speed = 0
    }

    // ── Longitudinal ──
    if (throttle > 0.05) {
      s.speed += (s.speed < -0.1 ? 16 : 9) * throttle * dt
    } else if (throttle < -0.05) {
      s.speed += (s.speed > 0.1 ? -15 : 6 * throttle) * dt
    } else {
      s.speed -= Math.sign(s.speed) * Math.min(Math.abs(s.speed), 4.5 * dt)
    }
    s.speed = THREE.MathUtils.clamp(s.speed, -MAX_REV, cap)
    if (live.hitSlow < 1) {
      s.speed *= live.hitSlow
      live.hitSlow = 1
    }

    // ── Dirección: el volante gira las llantas y el Jeep describe el arco ──
    s.steer = damp(s.steer, steerIn * MAX_STEER, 9, dt)
    s.yaw += (s.speed / WHEELBASE) * Math.tan(s.steer) * dt

    // ── Avance con colisiones ──
    const sn = Math.sin(s.yaw)
    const cs = Math.cos(s.yaw)
    const nx = s.x + sn * s.speed * dt
    const nz = s.z + cs * s.speed * dt
    const lead = Math.sign(s.speed || 1) * 1.5
    s.bumpCd -= dt
    if (carBlocked(nx + sn * lead, nz + cs * lead) || carBlocked(nx, nz)) {
      if (Math.abs(s.speed) > 2.5 && s.bumpCd <= 0) {
        sfx.bump(Math.abs(s.speed) / MAX_FWD)
        s.bumpCd = 0.4
      }
      s.speed = -s.speed * 0.3
    } else {
      s.x = nx
      s.z = nz
    }

    // ── Aspereza: baches sobre un resorte amortiguado + trepidación ──
    const sf = Math.min(1.4, Math.abs(s.speed) / MAX_FWD)
    s.nextKick -= dt * sf
    if (s.nextKick <= 0) {
      s.vy += (0.9 + Math.random() * 1.1) * sf
      s.nextKick = 0.35 + Math.random() * 0.9
    }
    s.vy += (-160 * s.y - 11 * s.vy) * dt
    s.y += s.vy * dt
    const buzz = (Math.sin(t * 38) + Math.sin(t * 53 + 2)) * 0.006 * sf

    // ── Pose según el terreno ──
    const h = (lx: number, lz: number) => terrainHeight(s.x + lx * cs + lz * sn, s.z - lx * sn + lz * cs)
    const base = h(0, 0)
    const pitch = -Math.atan2(h(0, 0.9) - h(0, -0.9), 1.8)
    const roll = Math.atan2(h(0.6, 0) - h(-0.6, 0), 1.2)
    g.position.set(s.x, base + 0.05 + s.y + buzz, s.z)
    g.rotation.set(pitch + s.y * 0.9 + Math.sin(t * 21) * 0.01 * sf, s.yaw, roll + Math.sin(t * 29) * 0.016 * sf - s.steer * Math.abs(s.speed) * 0.012, 'YXZ')

    rig.roll += (s.speed * dt) / (0.2 * SCALE)
    rig.steer = s.steer
    steerRef.current = s.steer
    for (let i = 0; i < 4; i++) rig.bounce[i] = s.y * 0.6 + Math.sin(t * 35 + i * 1.7) * 0.014 * sf

    // ── Marcas para que se note ──
    const k = THREE.MathUtils.clamp(live.camDist / 26, 1, 2.6)
    if (halo.current) halo.current.scale.setScalar(k * (1 + 0.05 * Math.sin(t * 3)))
    if (beacon.current) {
      beacon.current.scale.setScalar(k)
      beacon.current.position.y = (4.0 + Math.sin(t * 3.2) * 0.14) * (0.6 + k * 0.4)
    }

    // ── Pito ──
    if (input.consumeJump()) sfx.horn()

    live.player.x = s.x
    live.player.z = s.z
    live.player.yaw = s.yaw
    live.player.speed = s.speed
    live.player.vx = sn * s.speed
    live.player.vz = cs * s.speed

    // ── ¿Qué lugar interactivo tengo cerca? ──
    let best: string | null = null
    let bd = Infinity
    for (const tg of targets) {
      const tx = tg.id === 'hs-jeep' ? live.jeep.x : tg.x
      const tz = tg.id === 'hs-jeep' ? live.jeep.z : tg.z
      const d = Math.hypot(tx - s.x, tz - s.z)
      if (d < tg.radius && d < bd) {
        bd = d
        best = tg.id
      }
    }
    if (best !== s.near) {
      s.near = best
      onNear(best)
    }

    if (ring.current) {
      ring.current.visible = !!s.dest
      if (s.dest) {
        ring.current.position.set(s.dest[0], terrainHeight(s.dest[0], s.dest[1]) + 0.08, s.dest[1])
        ring.current.scale.setScalar(1 + 0.15 * Math.sin(t * 6))
      }
    }
  })

  // Polvo en las ruedas traseras.
  const updateDust = (b: ParticleBuffers, dt: number) => {
    const s = st.current
    const d = dust.current
    d.carry += Math.abs(s.speed) * dt * 9
    while (d.carry >= 1) {
      d.carry -= 1
      for (const lx of [-0.6, 0.6]) {
        const i = d.cursor
        d.cursor = (d.cursor + 1) % DUST
        const sn = Math.sin(s.yaw)
        const cs = Math.cos(s.yaw)
        const wx = s.x + lx * cs - 0.75 * sn * Math.sign(s.speed || 1)
        const wz = s.z - lx * sn - 0.75 * cs * Math.sign(s.speed || 1)
        b.pos[i * 3] = wx
        b.pos[i * 3 + 1] = terrainHeight(wx, wz) + 0.12
        b.pos[i * 3 + 2] = wz
        d.vel[i * 3] = -sn * s.speed * 0.2 + (Math.random() - 0.5) * 0.7
        d.vel[i * 3 + 1] = 0.5 + Math.random() * 0.8
        d.vel[i * 3 + 2] = -cs * s.speed * 0.2 + (Math.random() - 0.5) * 0.7
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
      b.size[i] = 0.7 + (1 - l) * 1.7
    }
  }

  return (
    <>
      <group ref={group} position={[start.x, terrainHeight(start.x, start.z), start.z]} rotation={[0, start.yaw, 0]}>
        <group scale={SCALE}>
          <JeepWillys rig={rig} body="#d23a2e" />
          {/* El arriero al volante */}
          <group position={[0, 0.29, -0.08]} scale={0.82}>
            <Arriero walk={walk} pace={pace} seated steer={steerRef} />
          </group>
        </group>
        {/* Aro de luz bajo el Jeep y flecha flotante */}
        <group ref={halo} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[2.0, 2.3, 48]} />
            <meshBasicMaterial color="#ffd36a" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
        <mesh ref={beacon} position={[0, 4, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.3, 0.55, 4]} />
          <meshBasicMaterial color="#ffd36a" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 28]} />
        <meshBasicMaterial color="#ffb454" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Particles count={DUST} color="#e3bf8c" update={updateDust} />
    </>
  )
}
