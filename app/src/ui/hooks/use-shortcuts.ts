import { useEffect } from "react"
import type { AppController } from "@/app/controller"

const isTyping = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return true
  return t.tagName === "INPUT" && !["range", "checkbox", "button", "radio"].includes((t as HTMLInputElement).type)
}

const isReadOnly = (t: EventTarget | null): boolean =>
  (t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) && t.readOnly

// Inside these, keys belong to the open dialog, menu or list.
const inOverlay = (t: EventTarget | null): boolean =>
  t instanceof Element && !!t.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')

// A slider or a segmented switch reached with the keyboard keeps its arrow keys. One that
// was clicked doesn't, so a pedal's arrow keys still move between sections.
const keyboardWidget = (t: EventTarget | null): boolean =>
  t instanceof Element && !!t.closest('[role="radiogroup"] [data-focus-visible], [role="slider"]:focus-visible, [data-focus-visible] [role="slider"]')

/**
 * Play mode's keys. They work wherever focus is, apart from text fields and open
 * dialogs, so a foot pedal that sends Space or the arrow keys always reaches them.
 * Space never presses the focused button: it always plays or pauses.
 */
export function useShortcuts(app: AppController): void {
  useEffect(() => {
    const t = app.transport
    const onKeyDown = (e: KeyboardEvent) => {
      // The library page has its own keys.
      if (app.getState().libraryOpen) return
      // While tapping to sync lyrics, Space taps, Backspace takes a tap back and Esc stops.
      if (app.getState().sync?.recording && !inOverlay(e.target) && !(isTyping(e.target) && !isReadOnly(e.target))) {
        let synced = true
        if (e.key === " " || e.key === "Spacebar") {
          if (!e.repeat) app.tapSync()
        } else if (e.key === "Backspace") app.undoSyncTap()
        else if (e.key === "Escape") app.stopSync()
        else synced = false
        if (synced) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
      if (isTyping(e.target) || inOverlay(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.startsWith("Arrow") && keyboardWidget(e.target)) return
      let handled = true
      switch (e.key) {
        case " ":
        case "Spacebar":
          if (!e.repeat) t.toggle()
          break
        case "ArrowLeft":
          t.prevSection()
          break
        case "ArrowRight":
          t.nextSection()
          break
        case "ArrowUp":
          t.nudgeTempo(e.shiftKey ? 5 : 1)
          break
        case "ArrowDown":
          t.nudgeTempo(e.shiftKey ? -5 : -1)
          break
        case "l":
        case "L":
          app.toggleLoop()
          break
        case "/":
          app.openLibrary()
          break
        case "k":
        case "K":
          app.setKeyPickerOpen(true)
          break
        default:
          handled = false
      }
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    // Stop the Space key-up from pressing whichever button has focus.
    const onKeyUp = (e: KeyboardEvent) => {
      if (app.getState().libraryOpen) return
      if ((e.key === " " || e.key === "Spacebar") && !isTyping(e.target) && !inOverlay(e.target)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onVisibility = () => t.tick()
    // Capture phase, so these run before the focused control sees the key.
    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [app])
}
