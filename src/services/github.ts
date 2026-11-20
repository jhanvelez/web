import type { GitHubRepo } from '../types/portfolio'

const TTL_MS = 60 * 60 * 1000 // 1 hora
const cacheKey = (user: string) => `gh-repos:${user}`

export interface CacheEntry {
  at: number
  repos: GitHubRepo[]
}

export function readCache(user: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(user))
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch {
    return null
  }
}

function writeCache(user: string, repos: GitHubRepo[]) {
  try {
    localStorage.setItem(cacheKey(user), JSON.stringify({ at: Date.now(), repos }))
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

export const isFresh = (entry: CacheEntry | null) => !!entry && Date.now() - entry.at < TTL_MS

/** Consulta la API pública de GitHub (60 req/h sin token; por eso existe la caché). */
export async function fetchUserRepos(user: string, signal?: AbortSignal): Promise<GitHubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${user}/repos?per_page=100&sort=pushed&type=owner`,
    { signal, headers: { Accept: 'application/vnd.github+json' } },
  )
  if (!res.ok) throw new Error(`GitHub respondió ${res.status}`)
  const repos = (await res.json()) as GitHubRepo[]
  writeCache(user, repos)
  return repos
}
