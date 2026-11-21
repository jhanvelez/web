import { useEffect, useState } from 'react'

/**
 * Efecto de escritura "por un PC": revela varias líneas en orden, letra por letra.
 * Se reinicia cuando cambia `resetKey` o cuando `enabled` pasa a true.
 * Respeta `prefers-reduced-motion` (muestra todo de una vez).
 */
export function useTypedLines(lines: readonly string[], resetKey: string, { enabled = true, cps = 48, startDelay = 150 } = {}) {
  const total = lines.reduce((s, l) => s + l.length, 0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(total)
      return
    }
    let timer = 0
    let n = 0
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        // Ritmo irregular, como alguien que teclea.
        n += Math.random() < 0.15 ? 0 : Math.random() < 0.2 ? 2 : 1
        setCount(Math.min(n, total))
        if (n >= total) window.clearInterval(timer)
      }, 1000 / cps)
    }, startDelay)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, enabled, total, cps, startDelay])

  let left = count
  let active = -1
  const parts = lines.map((l, i) => {
    const take = Math.max(0, Math.min(l.length, left))
    left -= take
    if (take < l.length && active < 0) active = i
    return l.slice(0, take)
  })
  return { parts, active, done: count >= total && total > 0 }
}
