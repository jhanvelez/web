import { useEffect, useMemo, useRef } from 'react'
import { Map as MapIcon, X } from 'lucide-react'
import { HOTSPOT_POINTS, HOUSES, NETWORK } from '../../lib/layout'
import { live } from '../../lib/state'
import { smoothstep, terrainHeight } from '../../lib/terrain'
import { PONDS, WATER_LEVEL, WORLD_RADIUS } from '../../lib/world'

const RES = 360 // resolución del mapa base

/** Mapa base: relieve sombreado, agua, caminos, casas. Se dibuja una sola vez. */
function bakeBase(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = RES
  const g = c.getContext('2d')!
  const img = g.createImageData(RES, RES)
  const w = (WORLD_RADIUS + 1) * 2
  for (let py = 0; py < RES; py++) {
    for (let px = 0; px < RES; px++) {
      const x = (px / RES - 0.5) * w
      const z = (py / RES - 0.5) * w
      const o = (py * RES + px) * 4
      const r = Math.hypot(x, z)
      if (r > WORLD_RADIUS) {
        img.data.set([40, 18, 36, 0], o)
        continue
      }
      const h = terrainHeight(x, z)
      const hx = terrainHeight(x + 0.8, z) - terrainHeight(x - 0.8, z)
      const shade = 1 - Math.max(-0.35, Math.min(0.35, hx * 0.18))
      let col: [number, number, number]
      if (h < WATER_LEVEL - 0.05) col = [82, 137, 173]
      else if (h < WATER_LEVEL + 0.5) col = [172, 188, 191]
      else {
        const t = smoothstep(0.5, 8, h)
        col = [70 + t * 70, 120 + t * 60, 110 + t * 40]
      }
      img.data.set([col[0] * shade, col[1] * shade, col[2] * shade, 255], o)
    }
  }
  g.putImageData(img, 0, 0)

  const toPx = (x: number, z: number): [number, number] => [(x / w + 0.5) * RES, (z / w + 0.5) * RES]
  g.lineCap = g.lineJoin = 'round'
  g.strokeStyle = '#cfdde1'
  g.lineWidth = 4
  for (const e of NETWORK.edges) {
    g.beginPath()
    e.points.forEach(([x, z], i) => {
      const [a, b] = toPx(x, z)
      if (i) g.lineTo(a, b)
      else g.moveTo(a, b)
    })
    g.stroke()
  }
  for (const h of HOUSES) {
    const [a, b] = toPx(h.x, h.z)
    g.fillStyle = '#F4FCFB'
    g.fillRect(a - 4, b - 4, 8, 8)
    g.strokeStyle = '#243C4C'
    g.lineWidth = 1.5
    g.strokeRect(a - 4, b - 4, 8, 8)
  }
  void PONDS
  return c
}

interface Props {
  open: boolean
  onToggle: () => void
  onSelect: (hotspotId: string) => void
}

/**
 * Minimapa en esquina; al abrirlo se ve el mapa grande con los lugares (rombos).
 * Clic en un rombo: el arriero va hacia ese lugar y abre el proyecto.
 */
export function MiniMap({ open, onToggle, onSelect }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const base = useMemo(bakeBase, [])
  const w = (WORLD_RADIUS + 1) * 2
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    let raf = 0
    let last = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 40) return
      last = now
      const cv = canvas.current
      if (!cv) return
      const g = cv.getContext('2d')
      if (!g) return
      const S = cv.width
      const toPx = (x: number, z: number): [number, number] => [(x / w + 0.5) * S, (z / w + 0.5) * S]
      g.clearRect(0, 0, S, S)
      g.drawImage(base, 0, 0, S, S)

      for (const h of HOTSPOT_POINTS) {
        const x = h.id === 'hs-jeep' ? live.jeep.x : h.x
        const z = h.id === 'hs-jeep' ? live.jeep.z : h.z
        const [px, py] = toPx(x, z)
        const r = S * (openRef.current ? 0.02 : 0.03)
        g.beginPath()
        g.moveTo(px, py - r)
        g.lineTo(px + r, py)
        g.lineTo(px, py + r)
        g.lineTo(px - r, py)
        g.closePath()
        g.fillStyle = '#fff'
        g.fill()
        g.strokeStyle = '#243C4C'
        g.lineWidth = 2
        g.stroke()
      }
      // Arriero: punto con flecha de rumbo.
      const [ax, ay] = toPx(live.player.x, live.player.z)
      g.save()
      g.translate(ax, ay)
      g.rotate(-live.player.yaw + Math.PI)
      g.fillStyle = '#ff3b3b'
      g.strokeStyle = '#fff'
      g.lineWidth = 2
      const s = S * 0.028
      g.beginPath()
      g.moveTo(0, -s * 1.3)
      g.lineTo(s, s)
      g.lineTo(-s, s)
      g.closePath()
      g.fill()
      g.stroke()
      g.restore()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [base, w])

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!open) return onToggle()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * w
    const z = ((e.clientY - rect.top) / rect.height - 0.5) * w
    const hit = HOTSPOT_POINTS.map((h) => ({
      id: h.id,
      d: Math.hypot((h.id === 'hs-jeep' ? live.jeep.x : h.x) - x, (h.id === 'hs-jeep' ? live.jeep.z : h.z) - z),
    })).sort((a, b) => a.d - b.d)[0]
    if (hit && hit.d < 3.5) {
      onSelect(hit.id)
      onToggle()
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-[#243C4C]/70 backdrop-blur-sm" onClick={onToggle} aria-hidden />}
      <div
        className={
          open
            ? 'fixed left-1/2 top-1/2 z-50 aspect-square w-[min(88vw,82vh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border-4 border-[#7aa7c7] bg-[#243C4C] shadow-2xl'
            : 'pointer-events-auto fixed bottom-4 left-4 z-30 size-[150px] overflow-hidden rounded-2xl border-2 border-[#7aa7c7]/80 bg-[#243C4C] shadow-xl max-[767px]:size-[104px]'
        }
      >
        <canvas ref={canvas} width={open ? 720 : 300} height={open ? 720 : 300} onClick={onClick} className="size-full cursor-pointer" aria-label="Mapa del mundo" />
        {open && (
          <button type="button" onClick={onToggle} aria-label="Cerrar mapa" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[#243C4C]/80 text-white">
            <X size={18} />
          </button>
        )}
      </div>
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Abrir mapa (M)"
          className="pointer-events-auto fixed bottom-4 left-[172px] z-30 grid size-10 place-items-center rounded-full bg-[#243C4C]/80 text-[#9CC6E0] shadow-lg backdrop-blur-md transition hover:bg-[#5289AD] hover:text-[#F4FCFB] max-[767px]:left-[126px]"
        >
          <MapIcon size={18} />
        </button>
      )}
    </>
  )
}
