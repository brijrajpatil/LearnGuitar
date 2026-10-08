import { expect, test, type Page, type Request } from "@playwright/test"
import { openApp, songButton } from "./helpers"

// Gemini is never called for real: every request to Google's API gets a canned reply,
// and the key is a made-up test value (decision 0017).
const API = "https://generativelanguage.googleapis.com/**"
const TEST_KEY = "test-key-not-real"

// The Water Is Wide is a traditional song, and not in the built-in library.
const DRAFT = {
  found: true,
  title: "The Water Is Wide",
  artist: "Traditional",
  key: "D",
  capo: 0,
  beatsPerBar: 4,
  tempo: 76,
  sections: [
    { name: "Verse 1", pattern: "D", bars: ["D", "G D", "Bm", "Em A"] },
    { name: "Verse 2", pattern: "D", bars: ["D", "G D", "Bm", "Em A D"] },
  ],
  shapes: [],
}

const reply = (json: unknown) =>
  JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(json) }] }, finishReason: "STOP" }] })

/** Answers every Gemini request with `answer`, and records what was sent. */
async function fakeGemini(page: Page, answer: { status: number; body: string }) {
  const sent: Request[] = []
  await page.route(API, async (route) => {
    sent.push(route.request())
    await route.fulfill({ status: answer.status, contentType: "application/json", body: answer.body })
  })
  return sent
}

const panel = (page: Page) => page.getByRole("region", { name: "Add a song" })

async function addFromSearch(page: Page, text: string) {
  await page.keyboard.press("/")
  await page.getByRole("searchbox", { name: "Search songs" }).fill(text)
  await page.keyboard.press("Enter")
  await expect(panel(page)).toBeVisible()
}

async function addKey(page: Page) {
  await page.getByRole("textbox", { name: "Gemini API key" }).fill(TEST_KEY)
  await page.getByRole("button", { name: "Save key and draft" }).click()
}

test("drafts a song from its name with the player's key, then saves and plays it", async ({ page }) => {
  const sent = await fakeGemini(page, { status: 200, body: reply(DRAFT) })
  await openApp(page)
  await addFromSearch(page, "the water is wide")
  await expect(page.getByRole("textbox", { name: "Song" })).toHaveValue("the water is wide")
  await panel(page).getByRole("button", { name: "Draft with AI" }).click()
  await addKey(page)

  await expect(panel(page).getByText("The Water Is Wide", { exact: true })).toBeVisible()
  await expect(panel(page).getByText("From Gemini's memory. Check it against the record.")).toBeVisible()
  await expect(panel(page).getByRole("list", { name: "Steps" })).toContainText("Checking the chart")
  expect(sent).toHaveLength(1)
  expect(sent[0].url()).toContain("gemini-3.8-flash:generateContent")
  expect(sent[0].headers()["x-goog-api-key"]).toBe(TEST_KEY)

  await panel(page).getByRole("button", { name: "Save and play" }).click()
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
  await expect(songButton(page)).toContainText("The Water Is Wide")

  // The library marks it as an AI draft, and the key is remembered after a reload.
  await page.reload()
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
  await page.keyboard.press("/")
  await page.getByRole("searchbox", { name: "Search songs" }).fill("water")
  await expect(page.getByRole("option", { name: /The Water Is Wide/ })).toContainText("AI draft")
  await page.getByRole("button", { name: 'Add "water"' }).click()
  await panel(page).getByRole("button", { name: "Draft with AI" }).click()
  await expect(panel(page).getByText("The Water Is Wide", { exact: true })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Gemini API key" })).toHaveCount(0)
})

test("converts pasted chords on the device, with no key and no request to Google", async ({ page }) => {
  const sent = await fakeGemini(page, { status: 500, body: "{}" })
  await openApp(page)
  await addFromSearch(page, "my test song")
  await page
    .getByRole("textbox", { name: "Page address or chord text" })
    .fill("Key: G\n[Verse]\nG        C\nfiller words for a test\nD        G\nmore filler words\n[Chorus]\nC D G G")
  await panel(page).getByRole("button", { name: "Convert these chords" }).click()
  await expect(panel(page).getByText("From your pasted chords.", { exact: false })).toBeVisible()
  await expect(panel(page).getByText("My Test Song", { exact: true })).toBeVisible()
  await expect(panel(page)).not.toContainText("filler")
  await panel(page).getByRole("button", { name: "Save and play" }).click()
  await expect(songButton(page)).toContainText("My Test Song")
  expect(sent).toHaveLength(0)
})

test("asks for a key before reading a chord page", async ({ page }) => {
  await fakeGemini(page, { status: 500, body: "{}" })
  await openApp(page)
  await addFromSearch(page, "the water is wide")
  await page.getByRole("textbox", { name: "Page address or chord text" }).fill("https://example.com/chords/the-water-is-wide")
  await panel(page).getByRole("button", { name: "Read this page" }).click()
  await expect(panel(page).getByText("Reading a page needs a key.", { exact: false })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Gemini API key" })).toBeVisible()
})

test("tries Flash-Lite when the quota runs out, then says the free requests are used up", async ({ page }) => {
  const sent = await fakeGemini(page, { status: 429, body: JSON.stringify({ error: { code: 429, message: "Quota exceeded" } }) })
  await openApp(page)
  await addFromSearch(page, "the water is wide")
  await panel(page).getByRole("button", { name: "Draft with AI" }).click()
  await addKey(page)
  await expect(panel(page).getByRole("alert")).toContainText("Today's free requests are used up")
  expect(sent.map((r) => r.url().match(/models\/([^:]+)/)?.[1])).toEqual(["gemini-3.8-flash", "gemini-3.5-flash-lite"])
})

test("Escape closes the panel first, then the library", async ({ page }) => {
  await openApp(page)
  await addFromSearch(page, "the water is wide")
  await page.keyboard.press("Escape")
  await expect(panel(page)).toHaveCount(0)
  await expect(page.getByRole("main", { name: "Library" })).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "Search songs" })).toBeFocused()
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
})
