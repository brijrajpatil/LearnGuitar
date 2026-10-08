import { expect, test, type Page } from "@playwright/test"
import { openApp } from "./helpers"

const keyButton = (page: Page) => page.locator('[data-slot="key-button"]')
const keyList = (page: Page) => page.getByRole("listbox", { name: "Keys to play in" })

/** The capo readout as a screen reader says it. Chord names are drawn twice: once hidden, once for readers. */
const readout = (page: Page) =>
  page.locator('[data-slot="popover-content"] p[aria-live]').evaluate((p) => {
    const copy = p.cloneNode(true) as Element
    copy.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove())
    return copy.textContent?.replace(/\s+/g, " ").trim()
  })

test("shows the record's key and plays the song in other shapes with a capo", async ({ page }) => {
  await openApp(page)
  await expect(keyButton(page)).toContainText("Key of G")

  await keyButton(page).click()
  await expect(page.getByRole("heading", { name: "The record is in G major" })).toBeVisible()
  await expect(keyList(page).getByRole("option", { selected: true })).toHaveAccessibleName(/^G: .*As written\.$/)
  await keyList(page).getByRole("option", { name: /^E: .*Capo 3\.$/ }).click()

  await expect(keyButton(page)).toHaveAccessibleName("Key and capo: Key of G E shapes, capo 3")
  await expect.poll(() => readout(page)).toBe("Sounds like the record, in G.")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("E")
  await expect(page.getByRole("region", { name: "Next" })).toContainText("E7")

  // Without the capo, the E shapes sound lower than the record.
  await page.getByRole("button", { name: "Move the capo down a fret" }).click()
  await expect.poll(() => readout(page)).toBe("Sounds in F sharp, 1 fret lower than the record.")
  await page.keyboard.press("Escape")

  // The choice is saved for this song. Settings save 200 ms after the last change.
  await page.waitForTimeout(400)
  await page.reload()
  await expect(keyButton(page)).toHaveAccessibleName("Key and capo: Key of G E shapes, capo 2")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("E")
})

test("K opens the key picker, and Back to the chart's key undoes the change", async ({ page }) => {
  await openApp(page)
  await page.keyboard.press("k")
  await expect(keyList(page)).toBeVisible()
  await keyList(page).getByRole("option", { name: /^C: / }).click()
  await expect(keyButton(page)).toHaveAccessibleName("Key and capo: Key of G C shapes, capo 7")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("C")

  await page.getByRole("button", { name: "Back to the chart's key" }).click()
  await expect(keyButton(page)).toHaveAccessibleName("Key and capo: Key of G")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("G")
  await expect(page.getByRole("button", { name: "Back to the chart's key" })).toBeHidden()
})
