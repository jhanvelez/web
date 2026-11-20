type Key = 'up' | 'down' | 'left' | 'right' | 'run'

const down = new Set<Key>()
let jump = false

const MAP: Record<string, Key> = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  Shift: 'run',
}

export const input = {
  set(k: Key, on: boolean) {
    if (on) down.add(k)
    else down.delete(k)
  },
  /** Eje en pantalla: x (derecha +), y (adelante +). */
  axis() {
    return {
      x: (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0),
      y: (down.has('up') ? 1 : 0) - (down.has('down') ? 1 : 0),
    }
  },
  run: () => down.has('run'),
  pressJump() {
    jump = true
  },
  consumeJump() {
    const j = jump
    jump = false
    return j
  },
}

/** Registra el teclado global. Devuelve la función de limpieza. */
export function installInput() {
  const onDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const k = MAP[e.key]
    if (k) {
      down.add(k)
      if (e.key.startsWith('Arrow')) e.preventDefault()
    } else if (e.key === ' ') {
      if (!e.repeat) jump = true
      e.preventDefault()
    }
  }
  const onUp = (e: KeyboardEvent) => {
    const k = MAP[e.key]
    if (k) down.delete(k)
  }
  const clear = () => down.clear()
  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', clear)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', clear)
  }
}
