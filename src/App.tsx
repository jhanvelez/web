import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HOTSPOTS, projectById } from './data/projects'
import { PROFILE } from './data/profile'
import { useGitHubRepos } from './hooks/useGitHubRepos'
import { installInput } from './lib/input'
import type { ArrieroApi } from './components/canvas/Arriero'
import { Loader } from './components/ui/Loader'
import { MiniMap } from './components/ui/MiniMap'
import { MusicPlayer } from './components/ui/MusicPlayer'
import { Navbar } from './components/ui/Navbar'
import { ProjectDrawer } from './components/ui/ProjectDrawer'
import { IntroCard } from './components/ui/IntroCard'
import { TouchPad } from './components/ui/TouchPad'
import { TreeToast } from './components/ui/TreeToast'

// Three.js pesa bastante: se carga aparte para que el Loader aparezca de inmediato.
const Scene = lazy(() => import('./components/canvas/Scene'))

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = window.location.hash.slice(1)
    return HOTSPOTS.some((h) => h.id === id) ? id : null
  })
  const [nearId, setNearId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  // Bienvenida: arriero grande + tarjeta, salvo que se llegue con un enlace directo a un proyecto.
  const [intro, setIntro] = useState(() => !HOTSPOTS.some((h) => h.id === window.location.hash.slice(1)))
  const [ready, setReady] = useState(false)
  const walker = useRef<ArrieroApi | null>(null)
  const github = useGitHubRepos(PROFILE.githubUser)

  const selected = useMemo(() => HOTSPOTS.find((h) => h.id === selectedId) ?? null, [selectedId])
  const project = selected ? (projectById(selected.projectId) ?? null) : null
  const nearHotspot = HOTSPOTS.find((h) => h.id === nearId) ?? null

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
  const interact = useCallback(() => {
    if (nearId) setSelectedId(nearId)
  }, [nearId])

  useEffect(() => installInput(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(e.key)) setIntro(false)
      if (e.key === 'f' || e.key === 'F' || e.key === 'Enter') interact()
      if (e.key === 'm' || e.key === 'M') setMapOpen((o) => !o)
      if (e.key === 'Escape') setMapOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [interact])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0d10]">
      <Suspense fallback={null}>
        <Scene
          selectedId={selectedId}
          nearId={nearId}
          intro={intro && !selectedId}
          onSelect={setSelectedId}
          onNear={setNearId}
          onReady={onReady}
          walkerRef={walker}
        />
      </Suspense>

      <Navbar selectedId={selectedId} onSelect={setSelectedId} />
      <ProjectDrawer project={project} github={github} onClose={close} onPrev={prev} onNext={next} />
      <MiniMap open={mapOpen} onToggle={() => setMapOpen((o) => !o)} onSelect={setSelectedId} />
      <MusicPlayer />
      <TreeToast />
      <IntroCard visible={ready && intro && !selectedId} onStart={() => setIntro(false)} />
      <TouchPad canInteract={!!nearId} onInteract={interact} />

      {ready && !selectedId && !intro && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex flex-col items-center gap-2 text-center max-[767px]:hidden">
          {nearHotspot && (
            <p className="rounded-full bg-[#ffb454] px-5 py-2 font-mono text-sm font-bold text-[#0b0d10] shadow-xl">
              Presiona <kbd className="mx-1 rounded bg-[#0b0d10] px-2 py-0.5 text-[#ffd36a]">F</kbd> para ver · {nearHotspot.label}
            </p>
          )}
          <p className="rounded-full bg-[#0b0d10]/70 px-4 py-1.5 text-xs text-[#fff1dc] backdrop-blur-md">
            ↑ ↓ ← → mover · Shift correr · Espacio saltar · Q / E girar · rueda zoom · M mapa
          </p>
        </div>
      )}

      <Loader ready={ready} />
    </main>
  )
}
