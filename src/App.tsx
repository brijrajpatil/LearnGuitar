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
 * The play screen fills the window, with Play as its last row (decision 0011). The chord
 * cards take the height the other rows leave. When even their smallest size doesn't fit,
 * the middle scrolls and Play stays put. Very short windows scroll the whole page.
 */
export function App() {
  const app = useController()
  const { ready, editorOpen } = useAppState()
  useShortcuts(app)

  if (!ready) {
    return <main className="grid min-h-svh place-items-center text-muted-foreground">Loading your songs…</main>
  }

  return (
    <div className="flex min-h-svh fit:h-dvh fit:min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Relative, so screen-reader-only labels scroll inside it instead of extending the page. */}
        <main className="relative flex flex-1 flex-col fit:min-h-0 fit:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-app flex-1 flex-col gap-4 px-4 pt-4 pb-6 select-none short:gap-3 short:pt-3 short:pb-4 sm:px-6 [&>*]:shrink-0">
            <Header />
            <PositionLine />
            <div className="flex min-h-stage flex-1 flex-col max-sm:min-h-stage-stacked">
              <ChordCards />
            </div>
            <StrumCard />
            <SongMap />
          </div>
        </main>
        <TransportBar />
      </div>
      {editorOpen && <ChartEditor />}
    </div>
  )
}
