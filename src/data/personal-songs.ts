// Personal songs live in songs/personal.js, which is git-ignored. The local dev and
// preview servers serve that folder (see vite.config.ts). A deployed build has no
// songs/ folder, so it only asks for the file on this computer.

import type { SongSource } from "@/data/builtin-songs"

declare global {
  interface Window {
    PERSONAL_SONGS?: unknown
  }
}

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

export function validPersonalSongs(value: unknown, builtinIds: readonly string[]): SongSource[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (x): x is SongSource =>
      !!x && typeof x.id === "string" && typeof x.chart === "string" && !builtinIds.includes(x.id)
  )
}

export function loadPersonalSongs(builtinIds: readonly string[]): Promise<SongSource[]> {
  if (typeof location === "undefined" || !LOCAL_HOSTS.includes(location.hostname)) return Promise.resolve([])
  return new Promise((resolve) => {
    const s = document.createElement("script")
    s.src = "songs/personal.js"
    s.onload = () => resolve(validPersonalSongs(window.PERSONAL_SONGS, builtinIds))
    s.onerror = () => resolve([])
    document.head.appendChild(s)
  })
}
