// Small edits to chart text that the play screen makes for the player, so the chart stays
// the one place a song lives and the editor shows what changed.

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
