import { Suspense, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { HOTSPOTS } from '../../data/projects'
import { ARRIERO_POS, ARRIERO_ROT } from '../../lib/layout'
import { createRng } from '../../lib/random'
import { terrainHeight } from '../../lib/terrain'
import type { CameraFocus, HotspotConfig, HotspotKind, Vec3 } from '../../types/portfolio'
import { Arriero } from './Arriero'
import { CameraRig } from './CameraRig'
import { ColombianHouse } from './ColombianHouse'
import { Hotspot } from './Hotspot'
import { Mountain } from './Mountain'
import { CoffeeSack, FincaSign, JeepWillys, Viewpoint } from './Props'

const SUN_DIR = new THREE.Vector3(-14, 6.5, 11).normalize()

const PROP_BY_KIND: Record<HotspotKind, () => ReactNode> = {
  house: () => <ColombianHouse />,
  jeep: () => <JeepWillys />,
  sack: () => <CoffeeSack />,
  sign: () => <FincaSign />,
  viewpoint: () => <Viewpoint />,
}

const anchorOf = (h: HotspotConfig): Vec3 => [h.position[0], terrainHeight(h.position[0], h.position[1]), h.position[1]]

export function focusFor(h: HotspotConfig): CameraFocus {
  const [ax, ay, az] = anchorOf(h)
  const [cx, cy, cz] = h.cameraOffset
  const [tx, ty, tz] = h.targetOffset
  return { position: [ax + cx, ay + cy, az + cz], target: [ax + tx, ay + ty, az + tz] }
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
    <mesh scale={160} renderOrder={-1}>
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

/** Nubes low-poly que derivan lentamente alrededor de la montaña. */
function Clouds() {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const rng = createRng(99)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rng.range(-0.3, 0.3)
      const r = rng.range(40, 58)
      return {
        pos: [Math.cos(a) * r, rng.range(14, 24), Math.sin(a) * r] as Vec3,
        puffs: Array.from({ length: 5 }, (_, k) => ({
          p: [k * 1.3 - 2.6 + rng.range(-0.3, 0.3), rng.range(-0.2, 0.5), rng.range(-0.7, 0.7)] as Vec3,
          s: rng.range(1.6, 3.0),
        })),
      }
    })
  }, [])
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.012
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
        position={SUN_DIR.clone().multiplyScalar(20).toArray()}
        intensity={3.2}
        color="#ffb77a"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={5}
      />
      {/* Relleno frío desde el lado opuesto para que la sombra no quede muerta */}
      <directionalLight position={[10, 6, -8]} intensity={0.55} color="#8fb4ff" />
      {/* Entorno procedural para reflejos suaves, sin HDR remoto */}
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
  const houseY = terrainHeight(0, 0)
  const arrieroY = terrainHeight(ARRIERO_POS[0], ARRIERO_POS[1])

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [28, 18, 32], fov: 38, near: 0.1, far: 400 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => onReady?.()}
      onPointerMissed={() => onSelect(null)}
    >
      <fog attach="fog" args={['#f3b98a', 55, 150]} />
      <Suspense fallback={null}>
        <SkyDome />
        <Lights />
        <Clouds />
        <Mountain />
        <group position={[ARRIERO_POS[0], arrieroY, ARRIERO_POS[1]]} rotation={[0, ARRIERO_ROT, 0]}>
          <Arriero />
        </group>
        {HOTSPOTS.map((h) => (
          <Hotspot
            key={h.id}
            kind={h.kind}
            label={h.label}
            position={h.kind === 'house' ? [0, houseY, 0] : anchorOf(h)}
            rotationY={h.rotationY}
            markerHeight={h.markerHeight}
            active={h.id === selectedId}
            onSelect={() => onSelect(h.id)}
          >
            {PROP_BY_KIND[h.kind]()}
          </Hotspot>
        ))}
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

