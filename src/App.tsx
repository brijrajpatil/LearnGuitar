import { useAppState, useController } from "@/ui/hooks/use-app"
import { useShortcuts } from "@/ui/hooks/use-shortcuts"
import { ChartEditor } from "@/ui/editor/ChartEditor"
import { ChordCards } from "@/ui/play/ChordCards"
import { Header } from "@/ui/play/Header"
import { PositionLine } from "@/ui/play/PositionLine"
import { SongMap } from "@/ui/play/SongMap"
import { StrumCard } from "@/ui/play/StrumCard"
import { TransportBar } from "@/ui/play/TransportBar"

/**
 * The play screen. The page scrolls when the window is short or zoomed in, and the
 * transport bar stays pinned to the bottom, so nothing is ever cut off.
 */
export function App() {
  const app = useController()
  const { ready, editorOpen } = useAppState()
  useShortcuts(app)

  if (!ready) {
    return <main className="grid min-h-svh place-items-center text-muted-foreground">Loading your songs…</main>
  }

  return (
    <div className="flex min-h-svh">
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-4 px-4 pt-4 pb-6 select-none sm:px-6">
          <Header />
          <PositionLine />
          <div className="flex flex-1 flex-col">
            <ChordCards />
          </div>
          <StrumCard />
          <SongMap />
        </main>
        <TransportBar />
      </div>
      {editorOpen && <ChartEditor />}
    </div>
  )
}
