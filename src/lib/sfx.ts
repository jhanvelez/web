/**
 * Efectos de sonido sintetizados con Web Audio (sin archivos ni derechos de autor):
 * golpe de letra = "thud" grave + nota musical por letra + clic. Se activa al primer gesto del usuario.
 */
let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Pentatónica: cada letra suena a una nota distinta y todo queda afinado. */
const NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5]

/** Un golpe seco con un "ding" afinado. `power` de 0 a 1. */
export function letterHit(index: number, power: number) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime
  const p = Math.min(1, Math.max(0.25, power))

  const thud = c.createOscillator()
  const tg = c.createGain()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(160, t)
  thud.frequency.exponentialRampToValueAtTime(52, t + 0.2)
  tg.gain.setValueAtTime(0.55 * p, t)
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
  thud.connect(tg).connect(master)
  thud.start(t)
  thud.stop(t + 0.3)

  const ding = c.createOscillator()
  const dg = c.createGain()
  ding.type = 'triangle'
  ding.frequency.value = NOTES[index % NOTES.length]
  dg.gain.setValueAtTime(0.2 * p, t + 0.005)
  dg.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
  ding.connect(dg).connect(master)
  ding.start(t)
  ding.stop(t + 0.85)

  const len = Math.floor(c.sampleRate * 0.05)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const noise = c.createBufferSource()
  const ng = c.createGain()
  noise.buffer = buf
  ng.gain.value = 0.18 * p
  noise.connect(ng).connect(master)
  noise.start(t)
}

/** Golpe del Jeep contra un obstáculo. */
export function bump(power: number) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(120, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.15)
  g.gain.setValueAtTime(0.4 * Math.min(1, power), t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.22)
}

/** Pito del Willys: dos tonos. */
export function horn() {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime
  for (const f of [392, 494]) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'square'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.02)
    g.gain.setValueAtTime(0.09, t + 0.26)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + 0.36)
  }
}

/* ───────────── Motor del Jeep ───────────── */

interface Engine {
  o1: OscillatorNode
  o2: OscillatorNode
  filter: BiquadFilterNode
  gain: GainNode
  panner: PannerNode
}
let engine: Engine | null = null

interface V3 {
  x: number
  y: number
  z: number
}

/**
 * Motor sintetizado: dos osciladores graves por un filtro; el tono sube con la velocidad y el volumen con el acelerador.
 * Es posicional: la fuente está en el Jeep y el oyente en la cámara, así que se oye "venir" del Jeep.
 * Calla cuando el Jeep está quieto y sin acelerar.
 */
export function engineUpdate(p: { speed: number; throttle: number; max: number; at: V3; cam: V3; fwd: V3 }) {
  const c = audio()
  if (!c || !master) return
  if (!engine) {
    const o1 = c.createOscillator()
    const o2 = c.createOscillator()
    const filter = c.createBiquadFilter()
    const gain = c.createGain()
    const panner = c.createPanner()
    o1.type = 'sawtooth'
    o2.type = 'square'
    filter.type = 'lowpass'
    filter.Q.value = 3
    gain.gain.value = 0
    panner.panningModel = 'equalpower'
    panner.distanceModel = 'inverse'
    panner.refDistance = 28
    panner.rolloffFactor = 0.7
    o1.connect(filter)
    o2.connect(filter)
    filter.connect(gain).connect(panner).connect(master)
    o1.start()
    o2.start()
    engine = { o1, o2, filter, gain, panner }
  }
  const t = c.currentTime
  const s = Math.min(1.3, Math.abs(p.speed) / p.max)
  const th = Math.abs(p.throttle)
  const on = th > 0.05 || Math.abs(p.speed) > 0.4
  const f = 40 + s * 90 + th * 16
  engine.o1.frequency.setTargetAtTime(f, t, 0.08)
  engine.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08)
  engine.filter.frequency.setTargetAtTime(240 + s * 950 + th * 420, t, 0.1)
  engine.gain.gain.setTargetAtTime(on ? 0.05 + 0.1 * th + 0.07 * s : 0, t, 0.12)

  engine.panner.positionX.value = p.at.x
  engine.panner.positionY.value = p.at.y
  engine.panner.positionZ.value = p.at.z
  const L = c.listener
  if ('positionX' in L) {
    L.positionX.value = p.cam.x
    L.positionY.value = p.cam.y
    L.positionZ.value = p.cam.z
    L.forwardX.value = p.fwd.x
    L.forwardY.value = p.fwd.y
    L.forwardZ.value = p.fwd.z
    L.upX.value = 0
    L.upY.value = 1
    L.upZ.value = 0
  }
}

/** Silencia y libera el motor (al desmontar). */
export function engineStop() {
  if (!engine) return
  try {
    engine.o1.stop()
    engine.o2.stop()
  } catch {
    /* ya detenido */
  }
  engine = null
}
