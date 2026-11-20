import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '../../types/portfolio'

export interface InstanceItem {
  position: Vec3
  rotation?: Vec3
  scale?: number | Vec3
  color?: string
}

interface Props {
  items: readonly InstanceItem[]
  /** Geometría y material como hijos JSX. */
  children: ReactNode
  castShadow?: boolean
  receiveShadow?: boolean
}

/** InstancedMesh declarativo: un draw call para cientos de piezas (vegetación, piedras, tejas…). */
export function Instanced({ items, children, castShadow = true, receiveShadow = true }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    // YXZ: primero el giro (yaw) y luego la inclinación; lo que necesitan las hojas de palma.
    o.rotation.order = 'YXZ'
    items.forEach((it, i) => {
      o.position.set(...it.position)
      o.rotation.set(...(it.rotation ?? [0, 0, 0]))
      const s = it.scale ?? 1
      if (typeof s === 'number') o.scale.setScalar(s)
      else o.scale.set(...s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      if (it.color) mesh.setColorAt(i, c.set(it.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  return (
    <instancedMesh
      // Si cambia la cantidad hay que recrear el buffer.
      key={items.length}
      ref={ref}
      args={[undefined as never, undefined as never, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  )
}
