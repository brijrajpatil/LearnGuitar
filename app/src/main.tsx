import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { toast } from "sonner"

import "./index.css"
import { App } from "@/App"
import { AppController } from "@/app/controller"
import { Toaster } from "@/ui/components/sonner"
import { AppContext } from "@/ui/hooks/use-app"

const app = new AppController({
  notify: (message, opts) => toast(message, { duration: opts?.duration ?? 2600 }),
})
void app.init()

// Inspection hooks for checking a build from the console, and for the browser tests.
declare global {
  interface Window {
    __practice?: unknown
  }
}
window.__practice = {
  sync: () => app.transport.syncReport(),
  resetSync: () => app.transport.resetStats(),
  get view() {
    return app.transport.getView()
  },
  get state() {
    return app.getState()
  },
  parse: (text: string) => app.validate(text),
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppContext.Provider value={app}>
      <App />
      <Toaster position="top-center" />
    </AppContext.Provider>
  </StrictMode>
)
