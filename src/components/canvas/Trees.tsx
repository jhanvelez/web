import { useMemo } from 'react'
import * as THREE from 'three'
import { createRng } from '../../lib/random'
import { live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import { SPECIES, TREES, type TreeInst } from '../../lib/trees'
import { WATER_LEVEL } from '../../lib/world'
import { Instanced, type InstanceItem } from './Instanced'
import { Particles, type ParticleBuffers } from './Particles'
import { getTreeModel } from './treeGeometry'

const UP = new THREE.Vector3(0, 1, 0)

/** Bosque de especies colombianas: ramas bien definidas, flores/hojas solo en las puntas. */
export function Forest({ trees = TREES }: { trees?: readonly TreeInst[] }) {
  const { groups, carpet } = useMemo(() => {
    const rng = createRng(31)
    const groups = new Map<string, TreeInst[]>()
    const carpet: InstanceItem[] = []
    for (const t of trees) {
      const key = `${t.species}-${t.variant}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(t)

      // Alfombra de pétalos bajo el árbol (guayacán, rosado, jacaranda).
      const info = SPECIES[t.species]
      if (!info.carpet) continue
      const m = getTreeModel(t.species, t.variant)
      for (let i = 0; i < 28; i++) {
        const a = rng.range(0, Math.PI * 2)
        const r = Math.sqrt(rng.next()) * m.crownRadius * t.scale * 0.95
        const x = t.x + Math.cos(a) * r
        const z = t.z + Math.sin(a) * r
        const y = terrainHeight(x, z)
        if (y < WATER_LEVEL + 0.3) continue
        const s = rng.range(0.07, 0.13)
        carpet.push({
          position: [x, y + 0.025, z],
          rotation: [rng.range(-0.2, 0.2), rng.range(0, 3), rng.range(-0.2, 0.2)],
          scale: [s, 0.012, s * rng.range(0.7, 1)],
          color: rng.pick(info.petals),
        })
      }
    }
    return { groups, carpet }
  }, [trees])

  return (
    <>
      {[...groups].map(([key, list]) => {
        const [species, variant] = key.split('-')
        const model = getTreeModel(species as TreeInst['species'], Number(variant))
        const rng = createRng(list.length * 7 + Number(variant))
        const items: InstanceItem[] = list.map((t) => ({
          position: [t.x, t.y - 0.05, t.z],
          rotation: [0, t.rot, 0],
          scale: t.scale,
          color: new THREE.Color().setHSL(0, 0, rng.range(0.6, 0.8)).getStyle(),
        }))
        return (
          <group key={key}>
            <Instanced items={items}>
              <primitive object={model.wood} attach="geometry" dispose={null} />
              <meshStandardMaterial vertexColors color="#7a706a" flatShading roughness={0.95} />
            </Instanced>
            <Instanced items={items}>
              <primitive object={model.crown} attach="geometry" dispose={null} />
              <meshStandardMaterial vertexColors flatShading roughness={0.85} side={THREE.DoubleSide} />
            </Instanced>
          </group>
        )
      })}
      <Instanced items={carpet} castShadow={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial flatShading roughness={0.8} />
      </Instanced>
    </>
  )
}

interface Emitter {
  cx: number
  cy: number
  cz: number
  r: number
  species: TreeInst['species']
}

const N = 1000
const NEAR = 42

/**
 * Pétalos y hojas que caen sin parar de las copas cercanas al arriero.
 * Tamaño ≈ medio rostro del arriero (pétalos) o ≈ una mano grande (hojas de yarumo).
 */
export function FallingPetals() {
  const emitters = useMemo<Emitter[]>(
    () =>
      TREES.filter((t) => SPECIES[t.species].petals.length > 0).map((t) => {
        const m = getTreeModel(t.species, t.variant)
        const c = m.crownCenter.clone().applyAxisAngle(UP, t.rot).multiplyScalar(t.scale)
        return { cx: t.x + c.x, cy: t.y + c.y, cz: t.z + c.z, r: m.crownRadius * t.scale, species: t.species }
      }),
    [],
  )
  const st = useMemo(
    () => ({
      rng: createRng(404),
      near: [] as Emitter[],
      cum: [] as number[],
      timer: 0,
      ready: false,
      vy: new Float32Array(N),
      ph: new Float32Array(N),
      fq: new Float32Array(N),
      ground: new Float32Array(N),
      age: new Float32Array(N),
      active: new Uint8Array(N),
    }),
    [],
  )
  const tmp = useMemo(() => new THREE.Color(), [])

  const refreshNear = () => {
    const p = live.player
    st.near = emitters.filter((e) => Math.hypot(e.cx - p.x, e.cz - p.z) < NEAR)
    let acc = 0
    st.cum = st.near.map((e) => (acc += SPECIES[e.species].fall))
    // Árbol más cercano (para el cartel del HUD).
    let best: string | null = null
    let bd = 3.6
    for (const t of TREES) {
      const d = Math.hypot(t.x - p.x, t.z - p.z)
      if (d < bd) {
        bd = d
        best = t.species
      }
    }
    live.nearTree = best
  }

  const spawn = (b: ParticleBuffers, i: number, fromTop: boolean) => {
    const { rng } = st
    if (!st.near.length) {
      st.active[i] = 0
      b.alpha[i] = 0
      return
    }
    const pick = rng.next() * st.cum[st.cum.length - 1]
    const e = st.near[st.cum.findIndex((c) => c >= pick)] ?? st.near[0]
    const info = SPECIES[e.species]
    const a = rng.range(0, Math.PI * 2)
    const rr = Math.sqrt(rng.next()) * e.r * 0.85
    const x = e.cx + Math.cos(a) * rr
    const z = e.cz + Math.sin(a) * rr
    const ground = terrainHeight(x, z)
    const top = e.cy + rng.range(-0.6, 0.5) * e.r * 0.6
    b.pos[i * 3] = x
    b.pos[i * 3 + 1] = fromTop ? top : ground + rng.range(0.3, Math.max(0.4, top - ground))
    b.pos[i * 3 + 2] = z
    st.ground[i] = ground
    st.vy[i] = rng.range(0.45, 0.95)
    st.ph[i] = rng.range(0, 100)
    st.fq[i] = rng.range(0.8, 1.8)
    st.age[i] = 0
    st.active[i] = 1
    b.size[i] = info.petalSize * rng.range(0.8, 1.3)
    tmp.set(rng.pick(info.petals))
    b.color[i * 3] = tmp.r
    b.color[i * 3 + 1] = tmp.g
    b.color[i * 3 + 2] = tmp.b
  }

  const update = (b: ParticleBuffers, dt: number, t: number) => {
    st.timer -= dt
    if (st.timer <= 0) {
      st.timer = 0.4
      refreshNear()
      // Si no estaban en juego (o el jugador se mudó de zona), se reparten por la altura de la copa.
      if (!st.ready && st.near.length) {
        for (let i = 0; i < N; i++) spawn(b, i, false)
        st.ready = true
      }
    }
    for (let i = 0; i < N; i++) {
      if (!st.active[i]) {
        if (st.near.length) spawn(b, i, true)
        continue
      }
      st.age[i] += dt
      b.pos[i * 3 + 1] -= st.vy[i] * dt
      b.pos[i * 3] += (Math.sin(t * st.fq[i] + st.ph[i]) * 0.35 + 0.3) * dt
      b.pos[i * 3 + 2] += (Math.cos(t * st.fq[i] * 0.8 + st.ph[i]) * 0.3 + 0.12) * dt
      const h = b.pos[i * 3 + 1] - st.ground[i]
      if (h <= 0.03) {
        spawn(b, i, true)
        continue
      }
      b.alpha[i] = Math.min(1, st.age[i] * 3) * Math.min(1, h / 0.35) * 0.95
    }
  }

  return <Particles count={N} color="#ffffff" perColor update={update} />
}
