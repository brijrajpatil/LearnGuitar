// Joins the catalog with the chart files. Vite bundles every chart as text, so the
// library works offline.

import type { SongSource } from "@/data/builtin-songs"
import { CATALOG, type CatalogEntry } from "@/data/library/catalog"

export interface LibrarySong extends SongSource, CatalogEntry {}

/** Chart text by path, such as "./traditional/amazing-grace.txt". */
export const LIBRARY_FILES: Readonly<Record<string, string>> = import.meta.glob<string>("./*/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
})

export const chartPath = (e: CatalogEntry): string => `./${e.collection}/${e.id}.txt`

/** Every catalog entry that has a chart file. The library test checks that none is missing. */
export const LIBRARY: readonly LibrarySong[] = CATALOG.flatMap((e) => {
  const chart = LIBRARY_FILES[chartPath(e)]
  return chart === undefined ? [] : [{ ...e, chart }]
})
