import { describe, expect, it } from "vitest"
import {
  barsUntilRealigned,
  getPattern,
  isValidSteps,
  normalizeSteps,
  resolvePatternRef,
  stepOf,
} from "@/core/pattern/patterns"

const custom = [{ name: "Let Down", steps: "D.DUD.DU.U" }]

describe("patterns", () => {
  it("accepts strums, misses and picks, but not a figure of only misses", () => {
    expect(isValidSteps("D.DU.UDU")).toBe(true)
    expect(isValidSteps("B32123")).toBe(true)
    expect(isValidSteps("....")).toBe(false)
    expect(isValidSteps("DX")).toBe(false)
  })

  it("normalizes the loose ways people type figures", () => {
    expect(normalizeSteps("d - d u | - u d u")).toBe("D.DU.UDU")
  })

  it("resolves presets, saved names and inline figures", () => {
    expect(resolvePatternRef("c", custom)).toBe("C")
    expect(resolvePatternRef("let down", custom)).toBe("c:Let Down")
    expect(resolvePatternRef("D.DU", custom)).toBe("i:D.DU")
    expect(resolvePatternRef("D", custom)).toBe("D")
    expect(resolvePatternRef("nonsense", custom)).toBeNull()
  })

  it("falls back to pattern A when a custom pattern was deleted", () => {
    expect(getPattern("c:Gone", custom).id).toBe("A")
    expect(getPattern("c:Let Down", custom)).toMatchObject({ kind: "custom", runsOn: true })
    expect(getPattern("B", custom)).toMatchObject({ kind: "preset", runsOn: false })
  })

  it("restarts presets each bar and runs custom patterns on across bar lines", () => {
    const preset = getPattern("C", custom)
    expect(stepOf(preset, 1, 0, 8)).toBe("D")
    const five = getPattern("i:DUDUDUDU.D", custom)
    // 10 steps over 8-slot bars: bar 2 starts on step 9.
    expect(stepOf(five, 1, 0, 8)).toBe(".")
    expect(stepOf(five, 1, 1, 8)).toBe("D")
    expect(barsUntilRealigned("DUDUDUDU.D", 8)).toBe(5)
    expect(barsUntilRealigned("D.DU.UDU", 8)).toBe(1)
  })
})
