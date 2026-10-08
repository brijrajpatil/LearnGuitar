import { expect, test, type Page } from "@playwright/test"
import { applyChart, openApp, view } from "./helpers"

// Made-up words, so no song's lyrics are in the repo (decision 0021).
const LYRICS_CHART = `title: Lyric test
tempo: 120
time: 4/4
[Verse 1] pattern=B
G | G | C | D
> . . . . . . /La- li- | lo . sun . . . on | high . . . the . sea | . . . . . . /Mo- ri
[Chorus] pattern=C
C | G
> /Su- . mo . ra . ti | ka`

const chartText = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __practice: { state: { songId: string; songs: { id: string; chart: string }[] } } }).__practice.state
    return s.songs.find((x) => x.id === s.songId)!.chart
  })

test("shows the line being sung with its chords, the next line, and each word under its strum", async ({ page }) => {
  await openApp(page)
  await applyChart(page, LYRICS_CHART)
  await page.getByRole("button", { name: "Close the editor" }).click()
  const lyrics = page.getByRole("region", { name: "Lyrics" })
  await expect(lyrics).toContainText("Lalilo sun on high the sea")
  await expect(lyrics).toContainText("Next line: Mori")
  const strum = page.getByRole("region", { name: "Strum" })
  await expect(strum.getByRole("listitem").nth(6)).toContainText('sing "La-"')
  // Play into bar 2: "sun" lights on beat 2, and stays lit until "on".
  await page.keyboard.press("Space")
  await expect(lyrics.locator("[data-current]")).toHaveText("sun", { timeout: 8000 })
  await page.keyboard.press("Space")
  // Stopped, it shows where Play starts again: the start of the bar.
  expect((await view(page)).bar).toBe(1)
  await expect(lyrics.locator("[data-current]")).toHaveText("li")
  // The Lyrics switch hides them.
  await strum.getByRole("button", { name: "Lyrics" }).click()
  await expect(lyrics).toHaveCount(0)
  await strum.getByRole("button", { name: "Lyrics" }).click()
  await expect(lyrics).toBeVisible()
})

test("a song without lyrics shows no lyrics or Lyrics switch", async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole("region", { name: "Lyrics" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Lyrics" })).toHaveCount(0)
})

test("tap to sync places each word on an eighth note and saves them in the chart", async ({ page }) => {
  await openApp(page)
  await applyChart(page, "title: Sync test\ntempo: 120\ntime: 4/4\n[Verse 1] pattern=B\nG | C | D | G\n[Chorus] pattern=C\nC | G")
  await page.getByRole("button", { name: "Close the editor" }).click()
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("menuitem", { name: "Add lyrics…" }).click()
  const panel = page.getByRole("complementary", { name: "Sync lyrics" })
  await panel.getByRole("textbox", { name: "Lyrics to sync" }).fill("Ka-ro mi\nta su-ne")
  await expect(panel.getByRole("status")).toContainText("0 of 6 words placed")
  await panel.getByRole("button", { name: "Start from Verse 1" }).click()
  // Count-in of one bar at 120 BPM, then tap about once a beat.
  await expect.poll(async () => (await view(page)).state, { timeout: 5000 }).toBe("playing")
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Space")
    await page.waitForTimeout(450)
  }
  // Backspace takes the last tap back, and the next tap places that word again.
  await page.keyboard.press("Backspace")
  await expect(panel.getByRole("status")).toContainText("3 of 6 words placed")
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space")
    await page.waitForTimeout(450)
  }
  // It stops by itself after the last word.
  await expect(panel.getByRole("status")).toContainText("All 6 words placed")
  await expect.poll(async () => (await view(page)).state).toBe("stopped")
  await panel.getByRole("button", { name: "Save lyrics" }).click()
  await expect(page.getByText("Lyrics saved in the chart")).toBeVisible()
  const chart = await chartText(page)
  const words = chart
    .split("\n")
    .filter((l) => l.startsWith(">"))
    .join(" ")
    .split(/[\s|]+/)
    .filter((w) => w !== ">" && w !== "." && w)
  expect(words).toEqual(["/Ka-", "ro", "mi", "/ta", "su-", "ne"])
  await expect(page.getByRole("region", { name: "Lyrics" })).toContainText("Karo mi")
})

test("sync waits for chart edits to be applied first", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: "Edit chart" }).click()
  await page.getByRole("textbox", { name: "Chart text" }).fill("title: Not applied\n[V] pattern=A\nG")
  // The editor keeps its text as a draft a moment after typing stops.
  await page.waitForTimeout(400)
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("menuitem", { name: "Add lyrics…" }).click()
  await expect(page.getByText("Your chart has edits you haven't applied")).toBeVisible()
  await page.getByRole("button", { name: "Open the chart editor" }).click()
  await expect(page.getByRole("textbox", { name: "Chart text" })).toHaveValue("title: Not applied\n[V] pattern=A\nG")
})
