import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PADDOCK_GATE_ANGLE } from '../../lib/layout'
import { makeLabelTexture } from '../../lib/labelTexture'
import { route, WANDER_TARGETS } from '../../lib/nav'
import { createRng } from '../../lib/random'
import { horseRegistry, live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import { PADDOCK } from '../../lib/world'
import type { Vec2 } from '../../types/portfolio'
import { Horse, makeRig, type HorseLook, type RiderLook } from './Horse'
import '../../lib/pois'
import { Instanced, type InstanceItem } from './Instanced'

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
/** Escala del caballo: a la cruz mide ≈1.15 u; el arriero ≈1.8 u y una casa de pueblo ≈3 u. */
const HORSE_SCALE = 1.15

const COATS: Record<string, HorseLook> = {
  dulce: { coat: '#121013', mane: '#08070a', halter: true },
  azabache: { coat: '#17141a', mane: '#0b0a0d', blaze: true },
  bayo: { coat: '#4a2a18', mane: '#150d09', socks: false },
  castano: { coat: '#6b3a1f', mane: '#2a170c', socks: true, blaze: true },
  moro: { coat: '#6e6a66', mane: '#2b2927' },
  oscuro: { coat: '#2a1c16', mane: '#0f0a08', halter: true },
}

/** Orienta y asienta un animal sobre el terreno (cabeceo según la pendiente). */
function settle(g: THREE.Group, x: number, z: number, yaw: number) {
  const sn = Math.sin(yaw)
  const cs = Math.cos(yaw)
  const hf = terrainHeight(x + sn * 0.7, z + cs * 0.7)
  const hb = terrainHeight(x - sn * 0.7, z - cs * 0.7)
  g.position.set(x, (hf + hb) / 2, z)
  g.rotation.set(-Math.atan2(hf - hb, 1.4), yaw, 0, 'YXZ')
}

interface GrazerProps {
  id: string
  card: string
  look: HorseLook
  seed: number
  /** Posición inicial relativa al centro del potrero. */
  at: Vec2
}

/** Caballo del potrero: pasta con la cabeza baja, la levanta, da unos pasos y vuelve a pastar. */
function Grazer({ id, card, look, seed, at }: GrazerProps) {
  const group = useRef<THREE.Group>(null)
  const rig = useRef(makeRig())
  const st = useRef({
    rng: createRng(seed),
    x: PADDOCK.x + at[0],
    z: PADDOCK.z + at[1],
    yaw: seed,
    mode: 'graze' as 'graze' | 'lift' | 'walk',
    timer: 2 + (seed % 5),
    target: [0, 0] as Vec2,
  })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const r = rig.current
    const g = group.current
    if (!g) return

    if (s.mode === 'graze') {
      r.graze = damp(r.graze, 1, 2.5, dt)
      r.walk = damp(r.walk, 0, 6, dt)
      s.timer -= dt
      if (s.timer <= 0) {
        s.mode = 'lift'
        s.timer = s.rng.range(0.9, 1.8)
      }
    } else if (s.mode === 'lift') {
      r.graze = damp(r.graze, 0, 3, dt)
      s.timer -= dt
      if (s.timer <= 0) {
        const a = s.rng.range(0, Math.PI * 2)
        const rr = Math.sqrt(s.rng.next()) * (PADDOCK.r - 2)
        s.target = [PADDOCK.x + Math.cos(a) * rr, PADDOCK.z + Math.sin(a) * rr]
        s.mode = 'walk'
      }
    } else {
      r.graze = damp(r.graze, 0, 4, dt)
      const dx = s.target[0] - s.x
      const dz = s.target[1] - s.z
      const d = Math.hypot(dx, dz)
      if (d < 0.25) {
        s.mode = 'graze'
        s.timer = s.rng.range(7, 16)
      } else {
        const speed = 0.75
        s.x += (dx / d) * speed * dt
        s.z += (dz / d) * speed * dt
        s.yaw += wrap(Math.atan2(dx, dz) - s.yaw) * (1 - Math.exp(-dt * 3))
        r.walk = damp(r.walk, 1, 5, dt)
        r.phase += dt * speed * 1.1
      }
    }
    settle(g, s.x, s.z, s.yaw)
    horseRegistry.set(id, { x: s.x, z: s.z, card })
  })

  return (
    <group ref={group} scale={HORSE_SCALE}>
      <Horse look={look} rig={rig} />
    </group>
  )
}
const damp = THREE.MathUtils.damp

interface RiderProps {
  id: string
  look: HorseLook
  rider: RiderLook
  seed: number
}

/** Chalán a caballo: recorre los caminos de piedra con el andar corto y brioso del paso fino. */
function RiderHorse({ id, look, rider, seed }: RiderProps) {
  const group = useRef<THREE.Group>(null)
  const rig = useRef(makeRig())
  const start = WANDER_TARGETS[seed % WANDER_TARGETS.length]
  const st = useRef({
    rng: createRng(seed * 31 + 7),
    x: start[0],
    z: start[1],
    yaw: seed,
    queue: [] as Vec2[],
    wait: 1 + (seed % 4) * 1.5,
  })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const r = rig.current
    const g = group.current
    if (!g) return

    if (!s.queue.length) {
      r.walk = damp(r.walk, 0, 6, dt)
      s.wait -= dt
      if (s.wait <= 0) {
        // Elige otro destino (una puerta, el café o el potrero) y va por los caminos.
        let t = WANDER_TARGETS[Math.floor(s.rng.next() * WANDER_TARGETS.length)]
        if (Math.hypot(t[0] - s.x, t[1] - s.z) < 6) t = WANDER_TARGETS[(seed + Math.floor(s.rng.next() * 7) + 1) % WANDER_TARGETS.length]
        s.queue = route([s.x, s.z], t)
        s.wait = s.rng.range(4, 9)
      }
    } else {
      const n = s.queue[0]
      const dx = n[0] - s.x
      const dz = n[1] - s.z
      const d = Math.hypot(dx, dz)
      if (d < 0.2) s.queue.shift()
      else {
        const speed = 2.1
        s.x += (dx / d) * speed * dt
        s.z += (dz / d) * speed * dt
        s.yaw += wrap(Math.atan2(dx, dz) - s.yaw) * (1 - Math.exp(-dt * 5))
        r.walk = damp(r.walk, 1, 6, dt)
        r.phase += dt * speed * 0.95
      }
    }
    settle(g, s.x, s.z, s.yaw)
    horseRegistry.set(id, { x: s.x, z: s.z, card: 'chalan' })
  })

  return (
    <group ref={group} scale={HORSE_SCALE}>
      <Horse look={look} rig={rig} rider={rider} />
    </group>
  )
}

/** Un chalán a caballo, con sombrero claro, chaqueta oscura, jeans y botas. */
export function Riders() {
  return (
    <>
      <RiderHorse id="r1" seed={1} look={{ ...COATS.oscuro }} rider={{ jacket: '#1d2126', hat: '#e9dcc0' }} />
    </>
  )
}

/** Potrero cercado con la manada pastando, comedero, pacas de heno y el letrero de Dulce Sueño. */
export function Paddock() {
  const { posts, rails } = useMemo(() => {
    const N = 30
    const posts: InstanceItem[] = []
    const rails: InstanceItem[] = []
    const pts: { x: number; z: number; a: number; gate: boolean }[] = []
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const gate = Math.abs(wrap(a - PADDOCK_GATE_ANGLE)) < 0.3
      pts.push({ x: PADDOCK.x + Math.cos(a) * PADDOCK.r, z: PADDOCK.z + Math.sin(a) * PADDOCK.r, a, gate })
    }
    pts.forEach((p, i) => {
      const y = terrainHeight(p.x, p.z)
      posts.push({ position: [p.x, y + 0.6, p.z], scale: [0.14, 1.3, 0.14], color: '#34444f' })
      const q = pts[(i + 1) % N]
      if (p.gate && q.gate) return
      const qy = terrainHeight(q.x, q.z)
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      const yaw = Math.atan2(q.x - p.x, q.z - p.z)
      for (const h of [0.45, 0.95]) {
        rails.push({
          position: [(p.x + q.x) / 2, (y + qy) / 2 + h, (p.z + q.z) / 2],
          rotation: [-Math.atan2(qy - y, len), yaw, 0],
          scale: [0.07, 0.09, len],
          color: '#5d6d76',
        })
      }
    })
    return { posts, rails }
  }, [])

  const hay = useMemo<InstanceItem[]>(() => {
    const a = PADDOCK_GATE_ANGLE + Math.PI
    return [0, 1, 2].map((i) => {
      const x = PADDOCK.x + Math.cos(a + i * 0.28 - 0.28) * (PADDOCK.r - 1.2)
      const z = PADDOCK.z + Math.sin(a + i * 0.28 - 0.28) * (PADDOCK.r - 1.2)
      return { position: [x, terrainHeight(x, z) + 0.42, z], rotation: [0, a + i, Math.PI / 2], scale: [0.45, 0.9, 0.45], color: '#b9b58f' }
    })
  }, [])

  const troughAt = useMemo(() => {
    const a = PADDOCK_GATE_ANGLE + Math.PI + 0.9
    const x = PADDOCK.x + Math.cos(a) * (PADDOCK.r - 1.5)
    const z = PADDOCK.z + Math.sin(a) * (PADDOCK.r - 1.5)
    return { x, y: terrainHeight(x, z), z, rot: -a + Math.PI / 2 }
  }, [])

  const signAt = useMemo(() => {
    const a = PADDOCK_GATE_ANGLE + 0.42
    const x = PADDOCK.x + Math.cos(a) * (PADDOCK.r + 1.6)
    const z = PADDOCK.z + Math.sin(a) * (PADDOCK.r + 1.6)
    return { x, y: terrainHeight(x, z), z, rot: Math.atan2(-Math.cos(a), -Math.sin(a)) }
  }, [])
  const label = useMemo(
    () => makeLabelTexture([{ text: 'DULCE SUEÑO', size: 52 }, { text: 'de Lusitania', size: 46 }, { text: 'Paso fino colombiano', size: 28 }], null, '#F4FCFB', 512, 256),
    [],
  )

  // Al acercarse a un caballo o jinete, el HUD muestra su ficha.
  const timer = useRef(0)
  useFrame((_, dt) => {
    timer.current -= dt
    if (timer.current > 0) return
    timer.current = 0.25
    let best: string | null = null
    let bp = -1
    let bd = Infinity
    for (const h of horseRegistry.values()) {
      const d = Math.hypot(h.x - live.player.x, h.z - live.player.z)
      const prio = h.prio ?? 2
      if (d < (h.r ?? 3.4) && (prio > bp || (prio === bp && d < bd))) {
        bp = prio
        bd = d
        best = h.card
      }
    }
    live.nearHorse = best
  })
  useEffect(() => () => void (live.nearHorse = null), [])

  return (
    <group>
      <Instanced items={posts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </Instanced>
      <Instanced items={rails}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </Instanced>
      <Instanced items={hay}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial roughness={1} flatShading />
      </Instanced>

      {/* Comedero con agua */}
      <group position={[troughAt.x, troughAt.y, troughAt.z]} rotation={[0, troughAt.rot, 0]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[1.9, 0.5, 0.65]} />
          <meshStandardMaterial color="#3c4c56" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.7, 0.02, 0.45]} />
          <meshStandardMaterial color="#5289AD" emissive="#3a6f93" emissiveIntensity={0.4} roughness={0.2} />
        </mesh>
      </group>

      {/* Letrero de Dulce Sueño de Lusitania junto a la puerta */}
      <group position={[signAt.x, signAt.y, signAt.z]} rotation={[0, signAt.rot, 0]}>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} position={[x, 0.7, 0]} castShadow>
            <boxGeometry args={[0.12, 1.4, 0.12]} />
            <meshStandardMaterial color="#2b3a44" flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[1.8, 0.85, 0.08]} />
          <meshStandardMaterial color="#1c2a33" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 1.1, 0.05]}>
          <planeGeometry args={[1.7, 0.78]} />
          <meshBasicMaterial map={label} transparent />
        </mesh>
      </group>

      {/* La manada */}
      <Grazer id="dulce" card="dulce" look={COATS.dulce} seed={3} at={[-1.5, 1]} />
      <Grazer id="p2" card="paso" look={COATS.bayo} seed={11} at={[2.5, -1.5]} />
      <Grazer id="p3" card="paso" look={COATS.castano} seed={17} at={[-3, -3]} />
      <Grazer id="p4" card="paso" look={COATS.moro} seed={23} at={[3, 3]} />
    </group>
  )
}
