import { expect, test, type Page } from "@playwright/test"
import { openApp, songButton } from "./helpers"

const library = (page: Page) => page.getByRole("main", { name: "Library" })
const songs = (page: Page) => page.getByRole("listbox", { name: "Songs" })
const familySelect = (page: Page) => page.locator('[data-slot="select-trigger"][aria-label="Chord family"]')
const keyButton = (page: Page) => page.locator('[data-slot="key-button"]')

const chooseFamily = async (page: Page, name: string) => {
  await familySelect(page).click()
  await page.getByRole("option", { name: new RegExp(`^${name}`) }).click()
}

test("the family filter lists the songs that fit, with their chords in that family", async ({ page }) => {
  await openApp(page)
  await songButton(page).click()
  await chooseFamily(page, "G family")
  await expect(page.getByText(/\d+ songs fit the G family/)).toBeVisible()
  await expect(page.getByText("Chords in G")).toBeVisible()
  // Michael, Row the Boat Ashore is in D: in the G family it's G, C and D7 with a capo on 7.
  const michael = songs(page).getByRole("option", { name: /Michael, Row/ })
  await expect(michael).toContainText("G")
  await expect(michael).toContainText("D7")
  await expect(michael).toContainText("Capo 7")
  // Greensleeves needs B, which isn't in the G family.
  await expect(songs(page).getByRole("option", { name: /Greensleeves/ })).toHaveCount(0)
})

test("a song opened from the family filter plays in the family, and the family is remembered", async ({ page }) => {
  await openApp(page)
  await songButton(page).click()
  await chooseFamily(page, "G family")
  // Search first: Playwright's scroll-then-click on a row far down the list misses it.
  await page.getByRole("searchbox", { name: "Search songs" }).fill("michael")
  await songs(page).getByRole("option", { name: /Michael, Row/ }).click()
  await expect(songButton(page)).toContainText("Michael, Row")
  await expect(keyButton(page)).toHaveAccessibleName("Key and capo: Key of D G shapes, capo 7")
  await expect(page.getByRole("region", { name: "Now" })).toContainText("G")

  // Settings save 200 ms after the last change.
  await page.waitForTimeout(400)
  await page.reload()
  await songButton(page).click()
  await expect(familySelect(page)).toContainText("G family")
  await expect(page.getByText(/songs fit the G family/)).toBeVisible()

  // Clear filters resets the family with the others.
  await page.getByRole("searchbox", { name: "Search songs" }).fill("no such song")
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(familySelect(page)).toContainText("Any family")
  await expect(library(page).getByText("Chords in G")).toHaveCount(0)
})
