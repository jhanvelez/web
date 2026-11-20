import * as THREE from 'three'

interface Line {
  text: string
  size: number
}

const FONT = "Fraunces, Georgia, 'Times New Roman', serif"

/** Genera una textura con texto (letreros y costales) sin depender de archivos externos. */
export function makeLabelTexture(
  lines: Line[],
  bg: string | null,
  fg: string,
  w = 512,
  h = 256,
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
  }
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const total = lines.reduce((s, l) => s + l.size * 1.25, 0)
  let y = (h - total) / 2
  for (const l of lines) {
    ctx.font = `800 ${l.size}px ${FONT}`
    ctx.fillText(l.text, w / 2, y + (l.size * 1.25) / 2)
    y += l.size * 1.25
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
