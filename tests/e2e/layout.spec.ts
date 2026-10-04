import { expect, test } from "@playwright/test"
import { openApp } from "./helpers"

// Browser zoom Z on a window W x H gives a CSS viewport of W/Z x H/Z at a device scale
// of Z, which is what these sizes reproduce. Zoom on a 1440x900 laptop window first,
// then common window widths at 100%.
const ZOOMS = [1, 1.25, 1.5, 2, 3, 4]
const SIZES = [
  ...ZOOMS.map((z) => ({ name: `${z * 100}% zoom`, width: Math.round(1440 / z), height: Math.round(900 / z), scale: z })),
  { name: "phone", width: 360, height: 740, scale: 1 },
  { name: "tablet portrait", width: 768, height: 1024, scale: 1 },
  { name: "small laptop", width: 1280, height: 720, scale: 1 },
  { name: "large screen", width: 1920, height: 1080, scale: 1 },
]

for (const size of SIZES) {
  test(`fits at ${size.name} (${size.width}x${size.height})`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale })
    await openApp(page)

    const r = await page.evaluate(() => {
      const inside = (el: Element | null) => {
        if (!el) return false
        const b = el.getBoundingClientRect()
        return b.left >= -1 && b.right <= innerWidth + 1 && b.width > 0
      }
      const play = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Play")
      const pb = play?.getBoundingClientRect()
      const checks = {
        song: inside(document.querySelector('[aria-label="Song"]')),
        modes: inside(document.querySelector('[aria-label="What are you practising?"]')),
        now: inside(document.querySelector('[aria-label="Now"]')),
        next: inside(document.querySelector('[aria-label="Next"]')),
        strum: inside(document.querySelector('[aria-label="Strum"]')),
        map: inside(document.querySelector('[aria-label="Song map"]')),
        speed: inside(document.querySelector('[aria-label="Speed"]')),
        level: inside(document.querySelector('[aria-label="Level"]')),
      }
      return {
        sideways: document.documentElement.scrollWidth - innerWidth,
        playOnScreen: !!pb && pb.top >= 0 && pb.bottom <= innerHeight && inside(play!),
        checks,
        canScroll: getComputedStyle(document.documentElement).overflowY !== "hidden" && getComputedStyle(document.body).overflowY !== "hidden",
        bodyPx: parseFloat(getComputedStyle(document.body).fontSize),
      }
    })

    expect(r.sideways, "no sideways scrolling").toBeLessThanOrEqual(0)
    // The bar is pinned in windows at least 28rem (448 px) tall. Shorter, it's at the end of the page.
    if (size.height >= 448) expect(r.playOnScreen, "Play is on screen without scrolling").toBe(true)
    else {
      const play = page.getByRole("button", { name: "Play", exact: true })
      await play.scrollIntoViewIfNeeded()
      await expect(play, "Play is reachable by scrolling").toBeInViewport()
    }
    for (const [name, ok] of Object.entries(r.checks)) expect(ok, `${name} fits the width`).toBe(true)
    expect(r.canScroll, "the page can scroll").toBe(true)
    expect(r.bodyPx).toBe(16)
    await page.close()
  })
}

test("chord text grows with zoom instead of staying the same size", async ({ browser }) => {
  const onScreen: number[] = []
  for (const z of ZOOMS) {
    const page = await browser.newPage({ viewport: { width: Math.round(1440 / z), height: Math.round(900 / z) }, deviceScaleFactor: z })
    await openApp(page)
    const css = await page
      .getByRole("region", { name: "Now" })
      .locator(".text-stage-chord")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    onScreen.push(css * z)
    await page.close()
  }
  for (let i = 1; i < onScreen.length; i++) expect(onScreen[i], `zoom ${ZOOMS[i] * 100}%`).toBeGreaterThanOrEqual(onScreen[i - 1] - 1)
  expect(onScreen[onScreen.length - 1]).toBeGreaterThan(onScreen[0])
})
