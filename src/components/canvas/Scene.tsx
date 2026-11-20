import { Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { HOTSPOTS } from '../../data/projects'
import { ARRIERO_START, HOUSES, frontOf, resolvePlacement, standPoint } from '../../lib/layout'
import { createRng } from '../../lib/random'
import { terrainHeight } from '../../lib/terrain'
import type { CameraFocus, HotspotConfig, HotspotKind, Vec3 } from '../../types/portfolio'
import { ArrieroWalker, type ArrieroApi } from './Arriero'
import { CameraRig } from './CameraRig'
import { CoffeeCorner } from './CoffeeCorner'
import { ColombianHouse } from './ColombianHouse'
import { Hotspot } from './Hotspot'
import { Mountain } from './Mountain'
import { CoffeeSack, FincaSign, JeepWillys, Viewpoint } from './Props'

const SUN_DIR = new THREE.Vector3(-14, 6.5, 11).normalize()

const PROP_BY_KIND: Record<HotspotKind, () => ReactNode> = {
  house: () => <ColombianHouse palette={4} floors={2} detail="full" scale={1} />,
  jeep: () => <JeepWillys />,
  sack: () => <CoffeeSack />,
  sign: () => <FincaSign />,
  viewpoint: () => <Viewpoint />,
  cafe: () => <CoffeeCorner />,
}

/** Rota un offset local (x, z) por el yaw del objeto. */
function rotate([x, y, z]: Vec3, ry: number): Vec3 {
  const [fx, fz] = frontOf(ry) // (sin, cos)
  return [x * fz + z * fx, y, -x * fx + z * fz]
}

export function focusFor(h: HotspotConfig): CameraFocus {
  const p = resolvePlacement(h)
  const ay = terrainHeight(p.x, p.z)
  const c = rotate(h.cameraOffset, p.rotationY)
  const t = rotate(h.targetOffset, p.rotationY)
  return {
    position: [p.x + c[0], ay + c[1], p.z + c[2]],
    target: [p.x + t[0], ay + t[1], p.z + t[2]],
  }
}

/** Cielo de atardecer andino: degradado + disco solar (sin texturas externas). */
function SkyDome() {
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color('#2f4a7d') },
      mid: { value: new THREE.Color('#e98f6a') },
      horizon: { value: new THREE.Color('#ffd49a') },
      sunDir: { value: SUN_DIR.clone() },
    }),
    [],
  )
  return (
    <mesh scale={300} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 20]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.22, h));
            col = mix(col, top, smoothstep(0.18, 0.85, h));
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += vec3(1.0, 0.72, 0.4) * pow(s, 24.0) * 0.55;
            col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9985, 0.9995, s) * 2.0;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  )
}

/** Nubes low-poly que derivan lentamente alrededor del diorama. */
function Clouds() {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const rng = createRng(99)
    return Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2 + rng.range(-0.3, 0.3)
      const r = rng.range(78, 110)
      return {
        pos: [Math.cos(a) * r, rng.range(16, 30), Math.sin(a) * r] as Vec3,
        puffs: Array.from({ length: 5 }, (_, k) => ({
          p: [k * 1.9 - 3.8 + rng.range(-0.4, 0.4), rng.range(-0.3, 0.7), rng.range(-1, 1)] as Vec3,
          s: rng.range(2, 4),
        })),
      }
    })
  }, [])
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.01
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={c.pos} rotation={[0, -Math.atan2(c.pos[2], c.pos[0]), 0]}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={p.p} scale={[p.s * 1.3, p.s * 0.7, p.s]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#fff1e2" emissive="#ffc9a0" emissiveIntensity={0.35} flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#ffd9b0', '#4d6b3a', 0.7]} />
      <ambientLight intensity={0.25} color="#ffe2c8" />
      <directionalLight
        position={SUN_DIR.clone().multiplyScalar(60).toArray()}
        intensity={3.2}
        color="#ffb77a"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-44}
        shadow-camera-right={44}
        shadow-camera-top={44}
        shadow-camera-bottom={-44}
        shadow-camera-near={1}
        shadow-camera-far={170}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[20, 14, -16]} intensity={0.55} color="#8fb4ff" />
      <Environment resolution={64} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2} color="#ffb77a" position={[-8, 4, 6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1} color="#8fb4ff" position={[8, 6, -6]} scale={[10, 4, 1]} />
      </Environment>
    </>
  )
}

interface SceneProps {
  selectedId: string | null
  onSelect: (hotspotId: string | null) => void
  onReady?: () => void
}

export default function Scene({ selectedId, onSelect, onReady }: SceneProps) {
  const selected = HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const focus = useMemo(() => (selected ? focusFor(selected) : null), [selected])
  const walker = useRef<ArrieroApi | null>(null)
  const mainHouseId = HOUSES.find((h) => h.main)!.id

  // Al abrir un proyecto, el arriero se va caminando hasta ese lugar.
  useEffect(() => {
    if (!selected) return
    const [x, z] = standPoint(selected)
    walker.current?.walkTo(x, z)
  }, [selected])

  // Clic en el terreno: cierra el panel si está abierto; si no, el arriero camina hasta ahí.
  const onGround = useCallback(
    (x: number, z: number) => {
      if (selectedId) onSelect(null)
      else walker.current?.walkTo(x, z)
    },
    [selectedId, onSelect],
  )

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [80, 52, 92], fov: 38, near: 0.1, far: 700 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => onReady?.()}
      onPointerMissed={() => onSelect(null)}
    >
      <fog attach="fog" args={['#f3b98a', 110, 300]} />
      <Suspense fallback={null}>
        <SkyDome />
        <Lights />
        <Clouds />
        <Mountain onGround={onGround} />

        {/* Pueblo: casas de relleno (la principal es un hotspot) */}
        {HOUSES.filter((h) => h.id !== mainHouseId).map((h) => (
          <group key={h.id} position={[h.x, terrainHeight(h.x, h.z), h.z]} rotation={[0, h.rotationY, 0]}>
            <ColombianHouse palette={h.variant} floors={h.floors} detail="lite" scale={h.scale} />
          </group>
        ))}

        {HOTSPOTS.map((h) => {
          const p = resolvePlacement(h)
          return (
            <Hotspot
              key={h.id}
              kind={h.kind}
              label={h.label}
              position={[p.x, terrainHeight(p.x, p.z), p.z]}
              rotationY={p.rotationY}
              markerHeight={h.markerHeight}
              active={h.id === selectedId}
              onSelect={() => onSelect(h.id)}
            >
              {PROP_BY_KIND[h.kind]()}
            </Hotspot>
          )
        })}

        <ArrieroWalker apiRef={walker} start={ARRIERO_START} paused={!!selectedId} />

        <CameraRig focus={focus ?? null} />
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.35} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
