import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HOTSPOTS, projectById } from './data/projects'
import { PROFILE } from './data/profile'
import { useGitHubRepos } from './hooks/useGitHubRepos'
import { installInput } from './lib/input'
import type { JeepApi } from './components/canvas/PlayerJeep'
import { IntroCard } from './components/ui/IntroCard'
import { Loader } from './components/ui/Loader'
import { MiniMap } from './components/ui/MiniMap'
import { MusicPlayer } from './components/ui/MusicPlayer'
import { Navbar } from './components/ui/Navbar'
import { ProjectDrawer } from './components/ui/ProjectDrawer'
import { StartScreen } from './components/ui/StartScreen'
import { TouchPad } from './components/ui/TouchPad'
import { TreeToast } from './components/ui/TreeToast'

// Three.js pesa bastante: se carga aparte para que la pantalla de carga aparezca de inmediato.
const Scene = lazy(() => import('./components/canvas/Scene'))

/** loading → start (haz clic) → card (bienvenida) → play. */
type Phase = 'loading' | 'start' | 'card' | 'play'

export default function App() {
  const deepLink = useMemo(() => HOTSPOTS.some((h) => h.id === window.location.hash.slice(1)), [])
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = window.location.hash.slice(1)
    return HOTSPOTS.some((h) => h.id === id) ? id : null
  })
  const [phase, setPhase] = useState<Phase>('loading')
  const [nearId, setNearId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const walker = useRef<JeepApi | null>(null)
  const github = useGitHubRepos(PROFILE.githubUser)

  const selected = useMemo(() => HOTSPOTS.find((h) => h.id === selectedId) ?? null, [selectedId])
  const project = selected ? (projectById(selected.projectId) ?? null) : null
  const nearHotspot = HOTSPOTS.find((h) => h.id === nearId) ?? null
  const hud = phase === 'card' || phase === 'play'

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = HOTSPOTS.findIndex((h) => h.id === selectedId)
      if (i < 0) return
      setSelectedId(HOTSPOTS[(i + dir + HOTSPOTS.length) % HOTSPOTS.length].id)
    },
    [selectedId],
  )
  const close = useCallback(() => setSelectedId(null), [])
  const prev = useCallback(() => step(-1), [step])
  const next = useCallback(() => step(1), [step])
  const onReady = useCallback(() => setReady(true), [])
  const onLoaded = useCallback(() => setPhase('start'), [])
  const onStarted = useCallback(() => setPhase(deepLink ? 'play' : 'card'), [deepLink])
  const interact = useCallback(() => {
    if (nearId) setSelectedId(nearId)
  }, [nearId])

  useEffect(() => installInput(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'start' || phase === 'loading') return
      if (/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(e.key)) setPhase((p) => (p === 'card' ? 'play' : p))
      if (e.key === 'f' || e.key === 'F' || e.key === 'Enter') interact()
      if (e.key === 'm' || e.key === 'M') setMapOpen((o) => !o)
      if (e.key === 'Escape') setMapOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [interact, phase])

  // Abrir un proyecto termina la bienvenida.
  useEffect(() => {
    if (selectedId) setPhase((p) => (p === 'card' ? 'play' : p))
  }, [selectedId])

  const intro = (phase === 'start' || phase === 'card') && !selectedId

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#141f27]">
      <Suspense fallback={null}>
        <Scene
          selectedId={selectedId}
          nearId={nearId}
          intro={intro}
          introShift={phase === 'card' && !selectedId}
          onSelect={setSelectedId}
          onNear={setNearId}
          onReady={onReady}
          walkerRef={walker}
        />
      </Suspense>

      {hud && (
        <>
          <Navbar selectedId={selectedId} onSelect={setSelectedId} />
          <ProjectDrawer project={project} github={github} onClose={close} onPrev={prev} onNext={next} />
          <MiniMap open={mapOpen} onToggle={() => setMapOpen((o) => !o)} onSelect={setSelectedId} />
          <TreeToast />
          <TouchPad canInteract={!!nearId} onInteract={interact} />
        </>
      )}
      {/* Siempre montada: arranca la música con el primer clic (el de "empezar"). */}
      <MusicPlayer hidden={!hud} />
      <IntroCard visible={phase === 'card' && !selectedId} onStart={() => setPhase('play')} />

      {phase === 'play' && !selectedId && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex flex-col items-center gap-2 text-center max-[767px]:hidden">
          {nearHotspot && (
            <p className="rounded-full bg-[#5289AD] px-5 py-2 font-mono text-sm font-bold text-[#F4FCFB] shadow-xl">
              Presiona <kbd className="mx-1 rounded bg-[#243C4C] px-2 py-0.5 text-[#9CC6E0]">F</kbd> para ver · {nearHotspot.label}
            </p>
          )}
          <p className="rounded-full bg-[#243C4C]/70 px-4 py-1.5 text-xs text-[#F4FCFB] backdrop-blur-md">
            ↑ ↓ acelerar/frenar · ← → girar · Shift turbo · Espacio pito · Q / E cámara · M mapa
          </p>
        </div>
      )}

      <StartScreen visible={phase === 'start'} onStarted={onStarted} />
      <Loader ready={ready} onDone={onLoaded} />
    </main>
  )
}
