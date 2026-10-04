import { expect, type Page } from "@playwright/test"

export interface SyncReport {
  runSeconds: number
  slotsScheduled: number
  slotsShown: number
  lateAudioEvents: number
  resyncs: number
  scheduleDriftMs: number
  highlightLagMs: { mean: number; p95: number; max: number }
}

export interface ViewState {
  state: "stopped" | "count-in" | "playing"
  bar: number
  slot: number
  countIn: number
  loop: { section: number } | null
  tempo: number
}

export const view = (page: Page) =>
  page.evaluate(() => (window as unknown as { __practice: { view: unknown } }).__practice.view as ViewState)

export const sync = (page: Page) =>
  page.evaluate(() => (window as unknown as { __practice: { sync(): unknown } }).__practice.sync() as SyncReport)

/** A menu button found by its label. Its accessible name also includes the chosen value. */
export const picker = (page: Page, label: string) => page.locator(`[data-slot="select-trigger"][aria-label="${label}"]`)

export const songPicker = (page: Page) => picker(page, "Song")

/** Opens the app on Amazing Grace and waits for it to load. */
export async function openApp(page: Page) {
  await page.goto("/")
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible()
  await expect(songPicker(page)).toContainText("Amazing Grace")
}

/** Replaces the chart in the editor and applies it. */
export async function applyChart(page: Page, chart: string) {
  await page.getByRole("button", { name: "Edit chart" }).click()
  const text = page.getByRole("textbox", { name: "Chart text" })
  await text.fill(chart)
  await page.getByRole("button", { name: /^Apply/ }).click()
  await expect(page.getByText("Chart applied and saved")).toBeVisible()
}
