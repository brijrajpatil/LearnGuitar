// Small edits to chart text that the play screen makes for the player, so the chart stays
// the one place a song lives and the editor shows what changed.

import type { LyricWord, Song } from "@/core/song/types"

const SETTING = /^\s*([A-Za-z][A-Za-z ]*?)\s*:/
const TEMPO = /^\s*(tempo|bpm)\s*:/i

/** Sets the record's tempo: replaces the chart's tempo line, or adds one after its settings. */
export function setChartTempo(text: string, bpm: number): string {
  const lines = text.split("\n")
  const at = lines.findIndex((l) => TEMPO.test(l))
  if (at >= 0) {
    lines[at] = `${lines[at].match(TEMPO)![1]}: ${bpm}`
    return lines.join("\n")
  }
  // After the last setting above the first section, or at the top.
  const firstSection = lines.findIndex((l) => l.trim().startsWith("["))
  const head = firstSection < 0 ? lines : lines.slice(0, firstSection)
  let last = -1
  head.forEach((l, i) => {
    if (SETTING.test(l)) last = i
  })
  lines.splice(last + 1, 0, `tempo: ${bpm}`)
  return lines.join("\n")
}

/**
 * Writes the words of every bar as ">" lines, one under each line of bars that has words,
 * in place of the chart's old ">" lines (decision 0021). `song` is the chart parsed, and
 * `bars` has the words for each of its bars.
 */
export function writeLyrics(text: string, song: Song, bars: readonly (readonly LyricWord[])[]): string {
  const barsOnLine = new Map<number, number[]>()
  song.bars.forEach((bar, b) => barsOnLine.set(bar.line, [...(barsOnLine.get(bar.line) ?? []), b]))
  const out: string[] = []
  text.split("\n").forEach((line, i) => {
    if (line.trim().startsWith(">")) return
    out.push(line)
    const onLine = barsOnLine.get(i + 1)
    if (!onLine) return
    const parts = onLine.map((b) => barWords(bars[b] ?? []))
    while (parts.length && !parts[parts.length - 1]) parts.pop()
    if (parts.length) out.push("> " + parts.join(" | ").trim())
  })
  return out.join("\n")
}

/** One bar's words: a word or "." per eighth note up to the last word, "/" where a sung line starts. */
function barWords(words: readonly LyricWord[]): string {
  if (!words.length) return ""
  const bySlot = new Map(words.map((w) => [w.slot, w]))
  const last = Math.max(...words.map((w) => w.slot))
  const tokens: string[] = []
  for (let slot = 0; slot <= last; slot++) {
    const w = bySlot.get(slot)
    tokens.push(w ? (w.lineStart ? "/" : "") + w.text : ".")
  }
  return tokens.join(" ")
}
