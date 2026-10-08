import { expect, test } from "@playwright/test"
import { openApp } from "./helpers"

// Browser zoom Z on a window W x H gives a CSS viewport of W/Z x H/Z at a device scale
// of Z, which is what these sizes reproduce. Laptop sizes are Chrome's page area: the
// screen minus the menu bar, tabs, toolbar and bookmarks bar.
const ZOOMS = [1, 1.25, 1.5, 2, 3, 4]
const zoomed = (name: string, width: number, height: number, zooms: number[]) =>
  zooms.map((z) => ({ name: `${name} at ${z * 100}%`, width: Math.round(width / z), height: Math.round(height / z), scale: z }))

const SIZES = [
  ...zoomed("a 1440x900 window", 1440, 900, ZOOMS),
  ...zoomed('MacBook Air 13"', 1470, 785, [1, 1.25, 1.5, 2]),
  { name: 'MacBook Air 15"', width: 1710, height: 940, scale: 1 },
  { name: "a 1366x768 laptop", width: 1366, height: 625, scale: 1 },
  { name: "a small laptop window", width: 1280, height: 720, scale: 1 },
  { name: "a large screen", width: 1920, height: 1080, scale: 1 },
  { name: "a tablet held upright", width: 768, height: 1024, scale: 1 },
  { name: "a phone", width: 360, height: 740, scale: 1 },
]

const REM = 16
// Decision 0011: windows at least this big show the whole play screen without scrolling.
const ONE_VIEW = { width: 64 * REM, height: 37.5 * REM }
// Windows at least this tall keep Play on screen. Shorter, the whole page scrolls.
const FIT_HEIGHT = 22 * REM

for (const size of SIZES) {
  test(`fits ${size.name} (${size.width}x${size.height})`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale })
    await openApp(page)

    const r = await page.evaluate(() => {
      const inside = (el: Element | null) => {
        if (!el) return false
        const b = el.getBoundingClientRect()
        return b.left >= -1 && b.right <= innerWidth + 1 && b.width > 0
      }
      const regions = ["Now", "Next", "Strum", "Song map", "Playback"]
      const below = regions.filter((name) => {
        const el = document.querySelector(`[aria-label="${name}"]`)
        return !el || el.getBoundingClientRect().bottom > innerHeight + 1
      })
      const main = document.querySelector("main")!
      const play = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Play")
      const pb = play?.getBoundingClientRect()
      const checks = {
        song: inside(document.querySelector('[data-slot="song-button"]')),
        loop: inside([...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Loop section") ?? null),
        now: inside(document.querySelector('[aria-label="Now"]')),
        next: inside(document.querySelector('[aria-label="Next"]')),
        strum: inside(document.querySelector('[aria-label="Strum"]')),
        map: inside(document.querySelector('[aria-label="Song map"]')),
        speed: inside(document.querySelector('[aria-label="Speed"]')),
        level: inside(document.querySelector('[aria-label="Level"]')),
      }
      return {
        sideways: document.documentElement.scrollWidth - innerWidth,
        pageScrolls: document.documentElement.scrollHeight > innerHeight + 1,
        middleScrolls: main.scrollHeight > main.clientHeight + 1,
        below,
        playOnScreen: !!pb && pb.top >= 0 && pb.bottom <= innerHeight + 1 && inside(play!),
        checks,
        bodyPx: parseFloat(getComputedStyle(document.body).fontSize),
      }
    })

    expect(r.sideways, "no sideways scrolling").toBeLessThanOrEqual(0)
    for (const [name, ok] of Object.entries(r.checks)) expect(ok, `${name} fits the width`).toBe(true)
    expect(r.bodyPx).toBe(16)

    if (size.width >= ONE_VIEW.width && size.height >= ONE_VIEW.height) {
      expect(r.pageScrolls, "the page doesn't scroll").toBe(false)
      expect(r.middleScrolls, "the middle doesn't scroll").toBe(false)
      expect(r.below, "every part of the play screen is in the window").toEqual([])
    }

    const play = page.getByRole("button", { name: "Play", exact: true })
    const map = page.getByRole("navigation", { name: "Song map" })
    if (size.height >= FIT_HEIGHT) {
      expect(r.pageScrolls, "only the middle scrolls, never the whole page").toBe(false)
      expect(r.playOnScreen, "Play is on screen without scrolling").toBe(true)
      // Whatever doesn't fit scrolls into view inside the window, and Play stays put.
      await map.scrollIntoViewIfNeeded()
      await expect(map, "the song map is reachable by scrolling").toBeInViewport()
      await expect(play, "Play stays on screen").toBeInViewport({ ratio: 1 })
    } else {
      expect(r.pageScrolls, "the page scrolls").toBe(true)
      await play.scrollIntoViewIfNeeded()
      await expect(play, "Play is reachable by scrolling").toBeInViewport()
    }
    await page.close()
  })
}

// The library page (decision 0014): nothing sideways, the filters and list fit the width,
// and in windows that fit, only the list scrolls.
for (const size of SIZES) {
  test(`the library fits ${size.name} (${size.width}x${size.height})`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale })
    await openApp(page)
    await page.keyboard.press("/")
    await expect(page.getByRole("main", { name: "Library" })).toBeVisible()

    const r = await page.evaluate(() => {
      const inside = (el: Element | null) => {
        if (!el) return false
        const b = el.getBoundingClientRect()
        return b.left >= -1 && b.right <= innerWidth + 1 && b.width > 0
      }
      const first = document.querySelector('[role="listbox"][aria-label="Songs"] [role="option"]')
      return {
        sideways: document.documentElement.scrollWidth - innerWidth,
        pageScrolls: document.documentElement.scrollHeight > innerHeight + 1,
        firstSongInView: !!first && first.getBoundingClientRect().bottom <= innerHeight + 1,
        checks: {
          search: inside(document.querySelector('[aria-label="Search songs"]')),
          collection: inside(document.querySelector('[aria-label="Collection"]')),
          difficulty: inside(document.querySelector('[data-slot="select-trigger"][aria-label="Difficulty"]')),
          list: inside(document.querySelector('[aria-label="Songs"]')),
          firstSong: inside(first),
        },
      }
    })

    expect(r.sideways, "no sideways scrolling").toBeLessThanOrEqual(0)
    for (const [name, ok] of Object.entries(r.checks)) expect(ok, `${name} fits the width`).toBe(true)
    if (size.height >= FIT_HEIGHT) {
      expect(r.pageScrolls, "only the list scrolls, never the whole page").toBe(false)
      expect(r.firstSongInView, "the first song is in the window").toBe(true)
    }
    await page.close()
  })
}

// The Add a song panel (decision 0017): beside the list on wide screens, in its place on
// narrow ones. Nothing sideways, and in windows that fit, only the panel's body scrolls.
for (const size of SIZES) {
  test(`the Add a song panel fits ${size.name} (${size.width}x${size.height})`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale })
    await openApp(page)
    await page.keyboard.press("/")
    await page.getByRole("searchbox", { name: "Search songs" }).fill("a song not in the library")
    await page.keyboard.press("Enter")
    const panel = page.getByRole("region", { name: "Add a song" })
    await expect(panel).toBeVisible()
    const r = await page.evaluate(() => {
      const inside = (el: Element | null) => {
        if (!el) return false
        const b = el.getBoundingClientRect()
        return b.left >= -1 && b.right <= innerWidth + 1 && b.width > 0
      }
      return {
        sideways: document.documentElement.scrollWidth - innerWidth,
        pageScrolls: document.documentElement.scrollHeight > innerHeight + 1,
        panel: inside(document.querySelector('[aria-labelledby="add-song-title"]')),
        song: inside(document.getElementById("add-song-name")),
        draft: inside([...document.querySelectorAll("button")].find((b) => b.textContent === "Draft with AI") ?? null),
      }
    })
    expect(r.sideways, "no sideways scrolling").toBeLessThanOrEqual(0)
    for (const name of ["panel", "song", "draft"] as const) expect(r[name], `${name} fits the width`).toBe(true)
    if (size.height >= FIT_HEIGHT) expect(r.pageScrolls, "only the panel scrolls, never the whole page").toBe(false)
    await page.close()
  })
}

// Zooming in makes the chord text bigger on screen. In a window that fits, the header,
// strum card and Play bar grow too and leave the chords less room, so the chord can't
// grow at every step. It's never smaller than at 100%, and it's bigger at 400%.
for (const [name, width, height] of [
  ["a 1440x900 window", 1440, 900],
  ['MacBook Air 13"', 1470, 785],
] as const) {
  test(`chord text on ${name} is never smaller than at 100% zoom`, async ({ browser }) => {
    const onScreen: number[] = []
    for (const z of ZOOMS) {
      const page = await browser.newPage({ viewport: { width: Math.round(width / z), height: Math.round(height / z) }, deviceScaleFactor: z })
      await openApp(page)
      const css = await page
        .getByRole("region", { name: "Now" })
        .locator(".font-semibold")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      onScreen.push(css * z)
      await page.close()
    }
    for (let i = 1; i < onScreen.length; i++) expect(onScreen[i], `zoom ${ZOOMS[i] * 100}%`).toBeGreaterThanOrEqual(onScreen[0] - 1)
    expect(onScreen[onScreen.length - 1]).toBeGreaterThan(onScreen[0])
  })
}
