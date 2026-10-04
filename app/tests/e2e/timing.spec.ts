import { expect, test } from "@playwright/test"
import { applyChart, openApp, sync, view } from "./helpers"

// The prototype's timing check as a test: play a long song and fail on any late audio
// event or drift. 20 seconds by default; `npm run test:timing` runs the full two minutes.
const SECONDS = Number(process.env.TIMING_SECONDS ?? 20)

test(`plays ${SECONDS} s at 103 BPM with nothing late and no drift`, async ({ page }) => {
  test.setTimeout((SECONDS + 60) * 1000)
  await openApp(page)
  await applyChart(page, "title: Timing\ntempo: 103\n[Verse] pattern=C\nA | E | F#m | D\nA*200")
  await page.getByRole("button", { name: "Close the editor" }).click()
  for (let i = 0; i < 33; i++) await page.keyboard.press("ArrowUp")
  expect((await view(page)).tempo).toBe(103)
  await page.keyboard.press("Space")
  await expect.poll(async () => (await view(page)).state).not.toBe("stopped")
  await page.waitForTimeout(SECONDS * 1000)
  const r = await sync(page)
  await page.keyboard.press("Space")
  console.log(JSON.stringify(r))
  expect(r.runSeconds).toBeGreaterThan(SECONDS - 2)
  expect(r.lateAudioEvents).toBe(0)
  expect(r.resyncs).toBe(0)
  expect(r.scheduleDriftMs).toBeLessThan(0.001)
  // The strip lights within a frame or two of the sound.
  expect(r.highlightLagMs.p95).toBeLessThan(50)
})
