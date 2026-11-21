import { Suspense, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { HOTSPOTS } from '../../data/projects'
import { ARRIERO_START, HOTSPOT_POINTS, HOUSES, resolvePlacement, standPoint } from '../../lib/layout'
import { createRng } from '../../lib/random'
import { live } from '../../lib/state'
import { terrainHeight } from '../../lib/terrain'
import type { HotspotKind, Vec3 } from '../../types/portfolio'
import { Fireflies, Lamps } from './Ambient'
import { ArrieroWalker, type ArrieroApi, type NearTarget } from './Arriero'
import { CameraRig } from './CameraRig'
import { CoffeeCorner } from './CoffeeCorner'
import { ColombianHouse } from './ColombianHouse'
import { DrivingJeep } from './DrivingJeep'
import { Hotspot } from './Hotspot'
import { Mountain } from './Mountain'
import { FallingPetals, Forest } from './Trees'
import { CoffeeSack, FincaSign, JeepWillys, Viewpoint } from './Props'

// Sol bajo, de frente y a la izquierda: contraluz de atardecer con sombras largas.
const SUN_DIR = new THREE.Vector3(-16, 5.5, -13).normalize()

const PROP_BY_KIND: Record<Exclude<HotspotKind, 'jeep'>, () => ReactNode> = {
  house: () => <ColombianHouse palette={4} floors={2} detail="full" scale={1} />,
  sack: () => <CoffeeSack />,
  sign: () => <FincaSign />,
  viewpoint: () => <Viewpoint />,
  cafe: () => <CoffeeCorner />,
}

/** Cielo de atardecer colombiano: magenta → carmesí → naranja → oro, con estelas y disco solar. */
function SkyDome() {
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color('#07050d') },
      upper: { value: new THREE.Color('#34102b') },
      mid: { value: new THREE.Color('#b53a2a') },
      horizon: { value: new THREE.Color('#e08a35') },
      sunDir: { value: SUN_DIR.clone() },
    }),
    [],
  )
  return (
    <mesh scale={520} renderOrder={-1}>
      <sphereGeometry args={[1, 48, 28]} />
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
          uniform vec3 top; uniform vec3 upper; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir;
          varying vec3 vDir;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
          }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.1, h));
            col = mix(col, upper, smoothstep(0.08, 0.38, h));
            col = mix(col, top, smoothstep(0.32, 0.9, h));
            // Estelas de nubes alargadas, teñidas por el sol.
            float ang = atan(d.z, d.x);
            float streak = noise(vec2(ang * 2.2, h * 16.0)) * 0.6 + noise(vec2(ang * 5.0, h * 34.0)) * 0.4;
            float band = smoothstep(0.02, 0.2, h) * (1.0 - smoothstep(0.35, 0.7, h));
            col = mix(col, col * vec3(1.35, 0.72, 0.78), smoothstep(0.45, 0.8, streak) * band * 0.75);
            col += vec3(1.0, 0.8, 0.5) * smoothstep(0.55, 0.9, streak) * band * 0.15;
            float s = max(dot(d, normalize(sunDir)), 0.0);
            col += vec3(1.0, 0.55, 0.25) * pow(s, 10.0) * 0.55;
            col += vec3(1.0, 0.75, 0.4) * pow(s, 60.0) * 0.8;
            col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9985, 0.9996, s) * 3.0;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  )
}

/** Nubes low-poly encendidas por el atardecer. */
function Clouds() {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const rng = createRng(99)
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + rng.range(-0.3, 0.3)
      const r = rng.range(140, 200)
      return {
        pos: [Math.cos(a) * r, rng.range(26, 46), Math.sin(a) * r] as Vec3,
        puffs: Array.from({ length: 5 }, (_, k) => ({
          p: [k * 2.2 - 4.4 + rng.range(-0.4, 0.4), rng.range(-0.3, 0.8), rng.range(-1, 1)] as Vec3,
          s: rng.range(2.4, 4.6),
        })),
      }
    })
  }, [])
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.008
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={c.pos} rotation={[0, -Math.atan2(c.pos[2], c.pos[0]), 0]}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={p.p} scale={[p.s * 1.4, p.s * 0.6, p.s]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#7a4a58" emissive="#ff6a4a" emissiveIntensity={0.18} flatShading roughness={1} />
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
      <hemisphereLight args={['#c98a6a', '#1a1220', 0.62]} />
      <ambientLight intensity={0.2} color="#ffb48a" />
      <directionalLight
        position={SUN_DIR.clone().multiplyScalar(90).toArray()}
        intensity={3.4}
        color="#ff8545"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-66}
        shadow-camera-right={66}
        shadow-camera-top={66}
        shadow-camera-bottom={-66}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />
      {/* Relleno magenta desde el lado de la cámara para que el contraluz no apague los frentes */}
      <directionalLight position={[22, 12, 26]} intensity={0.55} color="#c05a8a" />
      <Environment resolution={64} environmentIntensity={0.4}>
        <Lightformer form="rect" intensity={2.5} color="#ff8a4a" position={[-8, 4, -6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#b04a9a" position={[8, 6, 6]} scale={[10, 4, 1]} />
      </Environment>
    </>
  )
}

/** Avisa que la escena ya dibujó unos cuantos frames (shaders compilados): el loader puede irse. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 6) onReady()
  })
  return null
}

const TARGETS: NearTarget[] = HOTSPOT_POINTS.map((h) => ({ id: h.id, x: h.x, z: h.z, radius: h.radius }))

interface SceneProps {
  selectedId: string | null
  nearId: string | null
  /** Pantalla de bienvenida activa. */
  intro: boolean
  onSelect: (hotspotId: string | null) => void
  onNear: (id: string | null) => void
  onReady?: () => void
  walkerRef: MutableRefObject<ArrieroApi | null>
}

export default function Scene({ selectedId, nearId, intro, onSelect, onNear, onReady, walkerRef }: SceneProps) {
  const selected = HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const mainHouseId = HOUSES.find((h) => h.main)!.id

  // Al abrir un proyecto, el arriero se va caminando hasta ese lugar (el Jeep se detiene donde esté).
  useEffect(() => {
    if (!selected) return
    if (selected.kind === 'jeep') walkerRef.current?.walkTo(live.jeep.x - Math.sin(live.jeep.yaw) * 2.6, live.jeep.z - Math.cos(live.jeep.yaw) * 2.6)
    else {
      const [x, z] = standPoint(selected)
      walkerRef.current?.walkTo(x, z)
    }
  }, [selected, walkerRef])

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [110, 120, 120], fov: 38, near: 0.1, far: 1000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => onSelect(null)}
    >
      <fog attach="fog" args={['#2a1320', 90, 320]} />
      <Suspense fallback={null}>
        <SkyDome />
        <Lights />
        <Clouds />
        <Mountain />
        <Forest />
        <FallingPetals />
        <Lamps />
        <Fireflies />

        {/* Pueblo: casas de relleno (la principal es un hotspot) */}
        {HOUSES.filter((h) => h.id !== mainHouseId).map((h) => (
          <group key={h.id} position={[h.x, terrainHeight(h.x, h.z), h.z]} rotation={[0, h.rotationY, 0]}>
            <ColombianHouse palette={h.variant} floors={h.floors} detail="lite" scale={h.scale} />
          </group>
        ))}

        {HOTSPOTS.map((h) => {
          if (h.kind === 'jeep') {
            // El Willys recorre los caminos solo: el hotspot viaja con él.
            return (
              <DrivingJeep key={h.id} paused={h.id === selectedId}>
                {(rig) => (
                  <Hotspot
                    kind={h.kind}
                    label={h.label}
                    position={[0, 0, 0]}
                    markerHeight={h.markerHeight}
                    active={h.id === selectedId}
                    near={h.id === nearId}
                    onSelect={() => onSelect(h.id)}
                  >
                    <JeepWillys rig={rig} />
                  </Hotspot>
                )}
              </DrivingJeep>
            )
          }
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
              near={h.id === nearId}
              onSelect={() => onSelect(h.id)}
            >
              {PROP_BY_KIND[h.kind]()}
            </Hotspot>
          )
        })}

        <ArrieroWalker apiRef={walkerRef} start={ARRIERO_START} targets={TARGETS} onNear={onNear} />
        <CameraRig focused={!!selectedId} intro={intro} />
        <ReadySignal onReady={() => onReady?.()} />

        <EffectComposer multisampling={4}>
          <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={0.8} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
