import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { input } from '../../lib/input'
import { blocked, resolveTarget, route } from '../../lib/nav'
import { live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import type { Vec2 } from '../../types/portfolio'

const SKIN = '#c98a5e'
const SHIRT = '#f4efe2'
const PANTS = '#e8dcc0'
const AUTO_SPEED = 2.6
const WALK_SPEED = 2.9
const RUN_SPEED = 5.4

function M({ color, rough = 0.9 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} flatShading />
}

/**
 * Arriero antioqueño low-poly: sombrero aguadeño, ruana al hombro, carriel y pantalón arremangado.
 * `walk` (0..1) mezcla la animación de caminata; en reposo respira, mueve la cabeza y saluda cada ~8 s.
 */
function Arriero({ walk, pace }: { walk: MutableRefObject<number>; pace: MutableRefObject<number> }) {
  const phase = useRef(0)
  const body = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const w = walk.current
    const breathe = Math.sin(t * 1.8)
    phase.current += dt * pace.current
    const stride = Math.sin(phase.current)

    if (chest.current) chest.current.scale.set(1 + breathe * 0.012, 1 + breathe * 0.025, 1 + breathe * 0.012)
    if (body.current) {
      body.current.position.y = w > 0.05 ? Math.abs(stride) * 0.03 * w : Math.abs(Math.sin(t * 0.9)) * 0.004
      body.current.rotation.z = Math.sin(t * 0.7) * 0.012 * (1 - w) + stride * 0.03 * w
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.5) * 0.18 * (1 - w)
      head.current.rotation.x = Math.sin(t * 0.9) * 0.02
    }
    if (legL.current) legL.current.rotation.x = stride * 0.65 * w
    if (legR.current) legR.current.rotation.x = -stride * 0.65 * w
    if (armL.current) armL.current.rotation.x = -stride * 0.5 * w

    if (armR.current) {
      const cycle = t % 8
      const waving = w < 0.1 && cycle > 5.2 && cycle < 7.6
      const target = waving ? 2.45 + Math.sin(t * 9) * 0.3 : 0.08 + breathe * 0.015
      armR.current.rotation.z = THREE.MathUtils.damp(armR.current.rotation.z, target, 6, dt)
      armR.current.rotation.x = THREE.MathUtils.damp(armR.current.rotation.x, w > 0.1 ? stride * 0.5 * w : 0, 10, dt)
    }
  })

  return (
    <group scale={1.15}>
      <group ref={body}>
        {/* Piernas articuladas en la cadera: pantorrilla al aire, pantalón arremangado, alpargata */}
        {([[-0.09, legL], [0.09, legR]] as const).map(([x, ref]) => (
          <group key={x} ref={ref} position={[x, 0.5, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.045, 0.2, 6]} />
              <M color={SKIN} />
            </mesh>
            <mesh position={[0, -0.23, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.065, 0.07, 7]} />
              <M color="#d6c7a2" />
            </mesh>
            <mesh position={[0, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.065, 0.075, 0.24, 7]} />
              <M color={PANTS} />
            </mesh>
            <mesh position={[0, -0.47, 0.03]} castShadow>
              <boxGeometry args={[0.1, 0.06, 0.18]} />
              <M color="#d8b878" />
            </mesh>
          </group>
        ))}

        <group ref={chest} position={[0, 0.5, 0]}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <boxGeometry args={[0.3, 0.36, 0.18]} />
            <M color={SHIRT} />
          </mesh>
          <mesh position={[0, 0.0, 0]} castShadow>
            <boxGeometry args={[0.31, 0.04, 0.19]} />
            <M color="#4a2c17" />
          </mesh>
          {/* Ruana al hombro izquierdo */}
          <mesh position={[-0.17, 0.3, 0]} rotation={[0, 0, 0.2]} castShadow>
            <boxGeometry args={[0.14, 0.12, 0.24]} />
            <M color="#223a63" />
          </mesh>
          <mesh position={[-0.19, 0.12, 0.0]} rotation={[0, 0, 0.1]} castShadow>
            <boxGeometry args={[0.07, 0.3, 0.23]} />
            <M color="#223a63" />
          </mesh>
          <mesh position={[-0.19, 0.12, 0.118]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.072, 0.3, 0.012]} />
            <M color="#c8372d" />
          </mesh>
          {/* Carriel con correa cruzada */}
          <mesh position={[0.02, 0.17, 0.092]} rotation={[0, 0, -0.75]}>
            <boxGeometry args={[0.46, 0.025, 0.012]} />
            <M color="#4a2c17" />
          </mesh>
          <mesh position={[0.13, -0.06, 0.1]} castShadow>
            <boxGeometry args={[0.15, 0.13, 0.07]} />
            <M color="#6b3f20" />
          </mesh>
          <mesh position={[0.13, -0.02, 0.138]}>
            <boxGeometry args={[0.1, 0.035, 0.01]} />
            <M color="#e0c27a" />
          </mesh>
          {/* Brazos */}
          <group ref={armL} position={[-0.19, 0.33, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.035, 0.3, 6]} />
              <M color={SHIRT} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <icosahedronGeometry args={[0.04, 0]} />
              <M color={SKIN} />
            </mesh>
          </group>
          <group ref={armR} position={[0.19, 0.33, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.035, 0.3, 6]} />
              <M color={SHIRT} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <icosahedronGeometry args={[0.04, 0]} />
              <M color={SKIN} />
            </mesh>
          </group>

          {/* Cabeza, bigote y sombrero aguadeño */}
          <group ref={head} position={[0, 0.46, 0]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.105, 1]} />
              <M color={SKIN} />
            </mesh>
            <mesh position={[0, -0.03, 0.098]}>
              <boxGeometry args={[0.1, 0.022, 0.02]} />
              <M color="#2b1b12" />
            </mesh>
            {[-0.035, 0.035].map((x) => (
              <mesh key={x} position={[x, 0.02, 0.098]}>
                <sphereGeometry args={[0.011, 6, 4]} />
                <meshBasicMaterial color="#1b1b1b" />
              </mesh>
            ))}
            <mesh position={[0, 0.075, 0]} castShadow>
              <cylinderGeometry args={[0.215, 0.215, 0.02, 14]} />
              <M color="#f1e6c8" />
            </mesh>
            <mesh position={[0, 0.135, 0]} castShadow>
              <cylinderGeometry args={[0.085, 0.105, 0.12, 12]} />
              <M color="#f1e6c8" />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.108, 0.108, 0.03, 12]} />
              <M color="#1c1c1c" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

export interface ArrieroApi {
  /** Camina solo hasta (x, z) por la ruta más lógica (caminos de piedra entre montañas). */
  walkTo: (x: number, z: number) => void
}

export interface NearTarget {
  id: string
  x: number
  z: number
  radius: number
}

interface WalkerProps {
  apiRef: MutableRefObject<ArrieroApi | null>
  start: Vec2
  /** Lugares interactivos: se avisa cuál es el más cercano dentro de su radio. */
  targets: readonly NearTarget[]
  onNear: (id: string | null) => void
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Controla al arriero con el teclado (flechas/WASD, Shift corre, Espacio salta); el movimiento es
 * relativo a la pantalla. No atraviesa agua, casas ni el borde del mundo. Además puede caminar solo
 * hasta un lugar (al abrir un proyecto); cualquier tecla de movimiento cancela ese trayecto.
 */
export function ArrieroWalker({ apiRef, start, targets, onNear }: WalkerProps) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const walk = useRef(0)
  const pace = useRef(9)
  const st = useRef({ x: start[0], z: start[1], yaw: 0.4, queue: [] as Vec2[], dest: null as Vec2 | null, h: 0, vy: 0, near: null as string | null })

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
    const s = st.current
    const g = group.current
    if (!g) return

    const ax = input.axis()
    let speed = 0

    if (ax.x !== 0 || ax.y !== 0) {
      // Manual: relativo a la cámara (arriba = alejarse de la cámara).
      s.queue = []
      s.dest = null
      const az = live.camAz
      let dx = -Math.sin(az) * ax.y + Math.cos(az) * ax.x
      let dz = -Math.cos(az) * ax.y - Math.sin(az) * ax.x
      const l = Math.hypot(dx, dz)
      dx /= l
      dz /= l
      speed = input.run() ? RUN_SPEED : WALK_SPEED
      const nx = s.x + dx * speed * dt
      const nz = s.z + dz * speed * dt
      if (!blocked(nx, nz)) {
        s.x = nx
        s.z = nz
      } else if (!blocked(nx, s.z)) s.x = nx
      else if (!blocked(s.x, nz)) s.z = nz
      else speed = 0
      s.yaw += wrapAngle(Math.atan2(dx, dz) - s.yaw) * (1 - Math.exp(-dt * 12))
    } else if (s.queue.length) {
      const next = s.queue[0]
      const dx = next[0] - s.x
      const dz = next[1] - s.z
      const d = Math.hypot(dx, dz)
      if (d < 0.1) {
        s.queue.shift()
        if (!s.queue.length) s.dest = null
      } else {
        speed = AUTO_SPEED
        const step = Math.min(d, speed * dt)
        s.x += (dx / d) * step
        s.z += (dz / d) * step
        s.yaw += wrapAngle(Math.atan2(dx, dz) - s.yaw) * (1 - Math.exp(-dt * 10))
      }
    }

    // Salto
    if (input.consumeJump() && s.h <= 0.001) s.vy = 4.6
    s.vy -= 13 * dt
    s.h = Math.max(0, s.h + s.vy * dt)
    if (s.h === 0 && s.vy < 0) s.vy = 0

    walk.current = THREE.MathUtils.damp(walk.current, speed > 0 ? 1 : 0, 10, dt)
    pace.current = speed > WALK_SPEED + 0.5 ? 14 : 9.5

    const y = terrainHeight(s.x, s.z)
    g.position.set(s.x, y + s.h, s.z)
    g.rotation.y = s.yaw

    live.player.x = s.x
    live.player.z = s.z
    live.player.yaw = s.yaw
    live.player.speed = speed

    // ¿Qué lugar interactivo tengo cerca?
    let best: string | null = null
    let bd = Infinity
    for (const t of targets) {
      const tx = t.id === 'hs-jeep' ? live.jeep.x : t.x
      const tz = t.id === 'hs-jeep' ? live.jeep.z : t.z
      const d = Math.hypot(tx - s.x, tz - s.z)
      if (d < t.radius && d < bd) {
        bd = d
        best = t.id
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
        ring.current.scale.setScalar(1 + 0.15 * Math.sin(clock.elapsedTime * 6))
      }
    }
  })

  return (
    <>
      <group ref={group} position={[start[0], terrainHeight(start[0], start[1]), start[1]]}>
        <Arriero walk={walk} pace={pace} />
      </group>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.4, 28]} />
        <meshBasicMaterial color="#f2b632" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </>
  )
}
