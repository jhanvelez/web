import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SKIN = '#c98a5e'
const SHIRT = '#f4efe2'
const PANTS = '#e8dcc0'

function M({ color, rough = 0.9 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} flatShading />
}

/**
 * Arriero antioqueño low-poly: sombrero aguadeño, ruana al hombro, carriel y pantalón arremangado.
 * Idle: respiración continua, leve balanceo y un saludo cada ~8 s.
 */
export function Arriero() {
  const body = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const breathe = Math.sin(t * 1.8)
    if (chest.current) chest.current.scale.set(1 + breathe * 0.012, 1 + breathe * 0.025, 1 + breathe * 0.012)
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(t * 0.9)) * 0.004
      body.current.rotation.z = Math.sin(t * 0.7) * 0.012
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.5) * 0.18
      head.current.rotation.x = Math.sin(t * 0.9) * 0.02
    }
    if (armR.current) {
      const cycle = t % 8
      const waving = cycle > 5.2 && cycle < 7.6
      const target = waving ? 2.45 + Math.sin(t * 9) * 0.3 : 0.08 + breathe * 0.015
      armR.current.rotation.z = THREE.MathUtils.damp(armR.current.rotation.z, target, 6, 1 / 60)
    }
  })

  return (
    <group scale={1.15}>
      <group ref={body}>
        {/* Alpargatas */}
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.03, 0.03]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <M color="#d8b878" />
          </mesh>
        ))}
        {/* Piernas: pantorrilla al aire, pantalón arremangado */}
        {[-0.09, 0.09].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0.14, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.045, 0.2, 6]} />
              <M color={SKIN} />
            </mesh>
            <mesh position={[0, 0.27, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.065, 0.07, 7]} />
              <M color="#d6c7a2" />
            </mesh>
            <mesh position={[0, 0.42, 0]} castShadow>
              <cylinderGeometry args={[0.065, 0.075, 0.24, 7]} />
              <M color={PANTS} />
            </mesh>
          </group>
        ))}

        <group ref={chest} position={[0, 0.5, 0]}>
          {/* Torso */}
          <mesh position={[0, 0.17, 0]} castShadow>
            <boxGeometry args={[0.3, 0.36, 0.18]} />
            <M color={SHIRT} />
          </mesh>
          {/* Cinturón */}
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
          {/* Brazo izquierdo */}
          <group position={[-0.19, 0.33, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.035, 0.3, 6]} />
              <M color={SHIRT} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <icosahedronGeometry args={[0.04, 0]} />
              <M color={SKIN} />
            </mesh>
          </group>
          {/* Brazo derecho (saluda) */}
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
