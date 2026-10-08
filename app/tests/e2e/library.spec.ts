import { expect, test, type Page } from "@playwright/test"
import { openApp, songButton, view } from "./helpers"

const library = (page: Page) => page.getByRole("main", { name: "Library" })
const songs = (page: Page) => page.getByRole("listbox", { name: "Songs" })
const search = (page: Page) => page.getByRole("searchbox", { name: "Search songs" })

test("the song title opens the library, and Back returns to the song", async ({ page }) => {
  await openApp(page)
  await songButton(page).click()
  await expect(library(page)).toBeVisible()
  await expect(search(page)).toBeFocused()
  await expect(songs(page).getByRole("option", { name: /Amazing Grace/ })).toHaveAccessibleName(/^Current song/)
  await page.getByRole("button", { name: /Back to Amazing Grace/ }).click()
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
})

test("/ opens the library, search filters it, and Enter opens a song", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("menuitem", { name: "New song" }).click()
  // New song opens the editor.
  await page.getByRole("textbox", { name: "Chart text" }).fill("title: Mine\nartist: Me\n[Verse] pattern=A\nAm | Cmaj7")
  await page.getByRole("button", { name: /^Apply/ }).click()
  await expect(page.getByText("Chart applied and saved")).toBeVisible()
  await page.getByRole("button", { name: "Close the editor" }).click()
  await page.keyboard.press("/")
  await expect(library(page)).toBeVisible()
  await search(page).fill("grace")
  await expect(songs(page).getByRole("option")).toHaveCount(1)
  await expect(songs(page).getByRole("option")).toContainText("Amazing Grace")
  await search(page).fill("cmaj7")
  await expect(songs(page).getByRole("option")).toHaveCount(1)
  await expect(songs(page).getByRole("option")).toContainText("Mine")
  await search(page).fill("grace")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
  await expect(songButton(page)).toContainText("Amazing Grace")
})

test("Escape clears the search first, then goes back without changing the song", async ({ page }) => {
  await openApp(page)
  await page.keyboard.press("/")
  await search(page).fill("nothing like this")
  await expect(page.getByText("No songs match")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(search(page)).toHaveValue("")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
  await expect(songButton(page)).toContainText("Amazing Grace")
})

test("opening the library stops playback, and Space doesn't start it there", async ({ page }) => {
  await openApp(page)
  await page.keyboard.press("Space")
  await expect.poll(async () => (await view(page)).state).not.toBe("stopped")
  await page.keyboard.press("/")
  await expect(library(page)).toBeVisible()
  expect((await view(page)).state).toBe("stopped")
  await songs(page).getByRole("option").first().focus()
  await page.keyboard.press("Space")
  expect((await view(page)).state).toBe("stopped")
})

test("the collection filter shows your songs, and Add a song can start a blank chart", async ({ page }) => {
  // Without the owner's personal song file, as on the live site.
  await page.route("**/songs/personal.js", (r) => r.abort())
  await openApp(page)
  await page.keyboard.press("/")
  await page.getByRole("radio", { name: /Your songs|Yours/ }).click()
  await expect(page.getByText("Your songs show here")).toBeVisible()
  await page.getByRole("button", { name: "Add a song" }).first().click()
  await page.getByRole("button", { name: "Write the chart yourself" }).click()
  await expect(songButton(page)).toContainText("New song")
  await expect(page.getByRole("textbox", { name: "Chart text" })).toBeVisible()
})
