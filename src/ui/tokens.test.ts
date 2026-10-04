import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Reads the theme's colors from src/index.css and checks the contrast rules from
// decisions 0009 and 0010, so a token change can't quietly break them.

const css = readFileSync(resolve(import.meta.dirname, "../index.css"), "utf8")
const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ""
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const t = (name: string) => {
  const v = tokens[name]
  if (!v) throw new Error(`No --${name} in src/index.css`)
  return v
}

const surfaces = ["background", "card", "slot", "tint"]

describe("theme contrast", () => {
  it("play-mode text reaches 7:1 on every surface it sits on", () => {
    for (const fg of ["foreground", "muted-foreground"]) {
      for (const bg of surfaces) expect(contrast(t(fg), t(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(7)
    }
  })

  it("text on the emphasis fill and on primary buttons reaches 7:1", () => {
    expect(contrast(t("emphasis-foreground"), t("emphasis"))).toBeGreaterThanOrEqual(7)
    expect(contrast(t("primary-foreground"), t("primary"))).toBeGreaterThanOrEqual(7)
  })

  it("graphics that carry meaning reach 3:1", () => {
    for (const bg of surfaces) expect(contrast(t("dim"), t(bg)), `dim on ${bg}`).toBeGreaterThanOrEqual(3)
    for (const fg of ["emphasis", "diagram-line", "diagram-string", "ring"]) {
      expect(contrast(t(fg), t("card")), `${fg} on card`).toBeGreaterThanOrEqual(3)
      expect(contrast(t(fg), t("background")), `${fg} on background`).toBeGreaterThanOrEqual(3)
    }
  })

  it("other text reaches 4.5:1", () => {
    expect(contrast(t("destructive"), t("card"))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t("foreground"), t("error-line"))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t("muted-foreground"), t("editor-gutter"))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t("foreground"), t("secondary"))).toBeGreaterThanOrEqual(4.5)
  })
})
