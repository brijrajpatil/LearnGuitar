import { createContext, useContext, useSyncExternalStore } from "react"
import type { AppController, AppState } from "@/app/controller"
import type { TransportView } from "@/practice/transport"

export const AppContext = createContext<AppController | null>(null)

export function useController(): AppController {
  const c = useContext(AppContext)
  if (!c) throw new Error("useController needs an AppContext provider")
  return c
}

export function useAppState(): AppState {
  const c = useController()
  return useSyncExternalStore(c.subscribe, c.getState)
}

/** The playhead and transport settings. Changes on every eighth note while playing. */
export function useTransport(): TransportView {
  const t = useController().transport
  return useSyncExternalStore(t.subscribe, t.getView)
}
