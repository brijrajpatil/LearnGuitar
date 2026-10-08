import { expect, test, type Page } from "@playwright/test"
import { applyChart, openApp, picker, songButton, view } from "./helpers"

const chooseLevel = async (page: Page, level: string) => {
  await picker(page, "Level").click()
  await page.getByRole("option", { name: new RegExp(`^${level}`) }).click()
}

const loopButton = (page: Page) => page.getByRole("button", { name: /^(Loop section|Looping )/ })

test("opens on Amazing Grace playing the whole song, with the current and next chord", async ({ page }) => {
  await openApp(page)
  await expect(loopButton(page)).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("G")
  await expect(page.getByRole("region", { name: "Next" })).toContainText("G7")
  await expect(page.getByRole("region", { name: "Next" })).toContainText("in 3 bars")
  await expect(page.getByText("Next: Verse 1 in 2 bars")).toBeVisible()
})

test("Space counts in, plays and pauses, even with a button focused", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: "Next section" }).focus()
  await page.keyboard.press("Space")
  await expect(page.getByText("Count-in")).toBeVisible()
  await expect.poll(async () => (await view(page)).state, { timeout: 5000 }).toBe("playing")
  // The focused button wasn't pressed: still in the first section.
  expect((await view(page)).bar).toBe(0)
  await page.keyboard.press("Space")
  await expect.poll(async () => (await view(page)).state).toBe("stopped")
})

test("arrow keys move between sections and change the speed, L loops the section", async ({ page }) => {
  await openApp(page)
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("heading", { name: "Verse 1" })).toBeVisible()
  expect((await view(page)).bar).toBe(2)
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Shift+ArrowUp")
  expect((await view(page)).tempo).toBe(76)
  await page.keyboard.press("l")
  await expect(loopButton(page)).toHaveText("Looping Verse 1")
  await expect(loopButton(page)).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("l")
  await expect(loopButton(page)).toHaveText("Loop section")
})

test("the loop button loops this section, and the song map picks another", async ({ page }) => {
  await openApp(page)
  await loopButton(page).click()
  await expect(loopButton(page)).toHaveText("Looping Intro")
  await page.getByRole("button", { name: "Verse 2. Loop this section" }).click()
  await expect(loopButton(page)).toHaveText("Looping Verse 2")
  expect((await view(page)).loop).toEqual({ section: 2 })
  await loopButton(page).click()
  await expect(loopButton(page)).toHaveText("Loop section")
  expect((await view(page)).loop).toBeNull()
})

test("speed shows the share of the record, and quick picks set it", async ({ page }) => {
  await openApp(page)
  await expect(page.getByText("88% of the record")).toBeVisible()
  await page.getByRole("button", { name: /Change speed/ }).click()
  await expect(page.getByRole("spinbutton", { name: "Record's speed (BPM)" })).toHaveValue("80")
  await page.getByRole("button", { name: /^75%/ }).click()
  expect((await view(page)).tempo).toBe(60)
  await expect(page.getByText("75% of the record")).toBeVisible()
})

test("type the speed in BPM or as a % of the record", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: /Change speed/ }).click()
  await page.getByRole("spinbutton", { name: "Speed in BPM" }).fill("64")
  await page.keyboard.press("Enter")
  expect((await view(page)).tempo).toBe(64)
  await page.getByRole("radio", { name: "% of record" }).click()
  const percent = page.getByRole("spinbutton", { name: "Speed in % of the record" })
  await expect(percent).toHaveValue("80")
  await percent.fill("85")
  await page.keyboard.press("Enter")
  expect((await view(page)).tempo).toBe(68)
  await percent.fill("300")
  await page.keyboard.press("Enter")
  expect((await view(page)).tempo).toBe(130)
  await expect(page.getByText("The app plays from 40 to 130 BPM")).toBeVisible()
  await expect(percent).toHaveValue("163")
  await page.keyboard.press("Escape")
  // The unit you type in comes first, and it's remembered.
  await expect(page.getByRole("button", { name: /Change speed/ })).toContainText("163%of the record, 130 BPM")
  // Settings save a moment after they change.
  await page.waitForTimeout(400)
  await page.reload()
  await expect(page.getByRole("button", { name: /Change speed/ })).toContainText("163%")
})

test("set the record's speed when the chart doesn't give it", async ({ page }) => {
  await openApp(page)
  await applyChart(page, "title: No tempo\n[V] pattern=A\nG | C")
  await page.getByRole("button", { name: "Close the editor" }).click()
  await page.getByRole("button", { name: /Change speed/ }).click()
  await expect(page.getByRole("radio", { name: "% of record" })).toHaveCount(0)
  await expect(page.getByText("Not in the chart yet.")).toBeVisible()
  await page.getByRole("spinbutton", { name: "Record's speed (BPM)" }).fill("100")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("radio", { name: "% of record" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByText("70% of the record")).toBeVisible()
  await page.getByRole("button", { name: "Edit chart" }).click()
  await expect(page.getByRole("textbox", { name: "Chart text" })).toHaveValue("title: No tempo\ntempo: 100\n[V] pattern=A\nG | C")
})

test("speed-up adds speed each time through the loop and shows its progress", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: /Change speed/ }).click()
  await page.getByRole("switch", { name: "Speed up each time through the loop" }).check({ force: true })
  await expect(page.getByText("It works while a section loops.")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("progressbar", { name: /Speeding up/ })).toHaveCount(0)
  await loopButton(page).click()
  await expect(page.getByText("From 70 to 80 BPM, +3 each time through")).toBeVisible()
  await page.keyboard.press("Space")
  // Intro is 2 bars of 3/4: about 5 seconds a time through at 70 BPM, after a 2.6 second count-in.
  await expect.poll(async () => (await view(page)).tempo, { timeout: 12000 }).toBe(73)
  await expect(page.getByRole("progressbar", { name: /Speeding up/ })).toHaveAttribute("aria-valuenow", "30")
  await page.keyboard.press("Space")
})

test("levels change the pattern, and Simplify chords swaps hard shapes", async ({ page }) => {
  await openApp(page)
  await chooseLevel(page, "Beginner")
  await expect(page.getByRole("region", { name: "Strum" })).toContainText("Beat downs")
  await chooseLevel(page, "Record")
  await expect(page.getByRole("region", { name: "Strum" })).toContainText("The chart's pattern")
  await applyChart(page, "title: Simple\n[V] pattern=A\nF#m | A")
  await page.getByRole("button", { name: "Close the editor" }).click()
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("menuitem", { name: "Practice settings…" }).click()
  await page.getByRole("switch", { name: "Simplify chords" }).check({ force: true })
  await page.keyboard.press("Escape")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("(easy)")
})

test("the editor marks errors by line, applies a fix and keeps it after a reload", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: "Edit chart" }).click()
  const text = page.getByRole("textbox", { name: "Chart text" })
  await text.fill("title: Mine\n[Verse] pattern=C\nG | Q")
  await expect(page.getByRole("button", { name: "Line 3" })).toBeVisible()
  await expect(page.getByText('Unknown chord "Q"')).toBeVisible()
  await text.fill("title: Mine\n[Verse] pattern=C\nG | C")
  await expect(page.getByText(/Chart OK: 1 section, 2 bars/)).toBeVisible()
  await page.getByRole("button", { name: /^Apply/ }).click()
  await expect(page.getByText("Chart applied and saved")).toBeVisible()
  await page.reload()
  await expect(songButton(page)).toContainText("Mine")
})

test("a custom pattern is saved and used for the section", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: /Strum pattern for Intro/ }).click()
  await page.getByRole("option", { name: "Write a new pattern…" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Name").fill("Waltz")
  await dialog.getByLabel("Pattern", { exact: true }).fill("B.DUD")
  await expect(dialog.getByText("It starts on beat 1 again every 5 bars.")).toBeVisible()
  await dialog.getByRole("button", { name: "Save and use for this section" }).click()
  await expect(page.getByRole("region", { name: "Strum" })).toContainText("Waltz")
  await expect(page.getByRole("region", { name: "Strum" })).toContainText("your choice")
})

test("a new song starts from the template and opens the editor", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("menuitem", { name: "New song" }).click()
  await expect(songButton(page)).toContainText("New song")
  await expect(page.getByRole("textbox", { name: "Chart text" })).toBeVisible()
})

test("imports the prototype's data on first run from the same origin", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return
    sessionStorage.setItem("seeded", "1")
    localStorage.setItem("strumpractice.v1.songs", JSON.stringify(["song-old"]))
    localStorage.setItem("strumpractice.v1.chart.song-old", JSON.stringify("title: From the prototype\n[V] pattern=A\nG"))
    localStorage.setItem("strumpractice.v1.state", JSON.stringify({ songId: "song-old", mode: "beginner", tempo: { "song-old": 88 } }))
  })
  await page.goto("/")
  await expect(page.getByText("Your songs and settings from the prototype were imported.")).toBeVisible()
  await expect(songButton(page)).toContainText("From the prototype")
  expect((await view(page)).tempo).toBe(88)
  await expect(picker(page, "Level")).toContainText("Beginner")
})

test("imports the prototype's backup file from the menu", async ({ page }) => {
  await openApp(page)
  const backup = {
    format: "song-practice-prototype-backup",
    version: 1,
    localStorage: {
      "strumpractice.v1.songs": JSON.stringify(["song-file"]),
      "strumpractice.v1.chart.song-file": JSON.stringify("title: From a backup\n[V] pattern=A\nC"),
    },
  }
  await page.getByRole("button", { name: "Menu" }).click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "Import prototype backup…" }).click()
  await (await chooser).setFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByText(/Backup imported/)).toBeVisible()
  await songButton(page).click()
  await expect(page.getByRole("option", { name: "From a backup" })).toBeVisible()
})
