import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Pause, Play, Volume2, VolumeX } from 'lucide-react'

const VIDEO_ID = '-ai7166QvqM'
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`
const TITLE = 'Colombian Lofi · 1 Hour Mix'
const ARTIST = 'Latin Lofi Beats'
const PREF_KEY = 'music-pref'
/** Volumen de fondo: se oye, pero no se siente (0–100). */
const VOLUME = 14

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  mute(): void
  unMute(): void
  setVolume(v: number): void
}
interface YTApi {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
}
declare global {
  interface Window {
    YT?: YTApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTApi> | null = null
function loadYouTubeApi(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => reject(new Error('No se pudo cargar YouTube'))
    document.head.appendChild(s)
  })
  return apiPromise
}

const readPref = () => {
  try {
    return localStorage.getItem(PREF_KEY)
  } catch {
    return null
  }
}
const writePref = (v: string) => {
  try {
    localStorage.setItem(PREF_KEY, v)
  } catch {
    /* sin almacenamiento */
  }
}

/**
 * Música ambiental con el reproductor oficial de YouTube (el audio lo sirve YouTube; no se copia ni se aloja).
 * Los navegadores exigen un gesto del usuario: arranca con la primera tecla o clic, salvo que la hayas apagado.
 */
export function MusicPlayer() {
  const holder = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const starting = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState(false)

  const start = useCallback(async () => {
    if (player.current || starting.current) return
    starting.current = true
    try {
      const YT = await loadYouTubeApi()
      const mount = document.createElement('div')
      holder.current?.replaceChildren(mount)
      player.current = new YT.Player(mount, {
        width: '200',
        height: '112',
        videoId: VIDEO_ID,
        playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1, disablekb: 1, loop: 1, playlist: VIDEO_ID },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            // Entrada suave: sube de 0 al volumen de fondo en ~5 s.
            e.target.setVolume(0)
            e.target.playVideo()
            let v = 0
            const fade = window.setInterval(() => {
              v = Math.min(VOLUME, v + 1)
              e.target.setVolume(v)
              if (v >= VOLUME) window.clearInterval(fade)
            }, 350)
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true)
            if (e.data === YT.PlayerState.PAUSED) setPlaying(false)
            if (e.data === YT.PlayerState.ENDED) player.current?.playVideo()
          },
          onError: () => setError(true),
        },
      })
    } catch {
      setError(true)
      starting.current = false
    }
  }, [])

  // Primera interacción del usuario → arranca (si no la apagó antes).
  useEffect(() => {
    if (readPref() === 'off') return
    const go = () => {
      void start()
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [start])

  const toggle = () => {
    if (!player.current) {
      writePref('on')
      void start()
      return
    }
    if (playing) {
      player.current.pauseVideo()
      writePref('off')
    } else {
      player.current.playVideo()
      writePref('on')
    }
  }
  const toggleMute = () => {
    if (!player.current) return
    if (muted) player.current.unMute()
    else player.current.mute()
    setMuted(!muted)
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30 w-[200px] overflow-hidden rounded-2xl bg-[#0b0d10]/80 text-[#fff1dc] shadow-xl backdrop-blur-md max-[767px]:bottom-24">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar música' : 'Reproducir música'}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ffb454] text-[#0b0d10] transition hover:scale-105"
        >
          {playing ? <Pause size={15} /> : <Play size={15} className="translate-x-px" />}
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold">{TITLE}</p>
          <p className="truncate text-[11px] text-[#fff1dc]/65">{ARTIST}</p>
        </div>
        <button type="button" onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'} className="shrink-0 text-[#fff1dc]/75 transition hover:text-white">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
      {!error && !playing && (
        <p className="px-3 pb-2 text-[11px] text-[#fff1dc]/60">Pulsa ▶ o cualquier tecla para activar la música.</p>
      )}
      {error && (
        <a href={VIDEO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 pb-2 text-[11px] text-[#ffd36a] underline">
          No pude reproducirla aquí · abrir en YouTube <ExternalLink size={11} />
        </a>
      )}
      {/* El reproductor se monta fuera de pantalla: solo se oye, no se ve. */}
      <div ref={holder} aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 h-[112px] w-[200px] opacity-0" />
    </div>
  )
}
