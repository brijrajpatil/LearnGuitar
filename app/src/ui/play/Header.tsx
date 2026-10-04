import { useRef, useState } from "react"
import { ChevronDownIcon, EllipsisIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"
import { songSeconds } from "@/core/song/types"
import { Button } from "@/ui/components/button"
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/components/dropdown-menu"
import { Popover, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/components/popover"
import { Kbd } from "@/ui/components/kbd"
import { Toggle } from "@/ui/components/toggle"
import { Tooltip, TooltipTrigger } from "@/ui/components/tooltip"
import { useAppState, useController } from "@/ui/hooks/use-app"
import { formatTime } from "@/ui/play/display"
import { ModeSwitch } from "@/ui/play/ModeSwitch"
import { SettingsSheet } from "@/ui/play/SettingsSheet"
import { ShortcutsDialog } from "@/ui/play/ShortcutsDialog"

/** The song's facts and notes, kept off the play screen until asked for. */
function SongInfo() {
  const { song } = useAppState()
  const facts: [string, string][] = [
    ["Key", song.key || "Not given"],
    ["Time", `${song.beatsPerBar}/4`],
    ["Record speed", song.tempo ? `${song.tempo} BPM` : "Not given"],
    ["Length", `${song.bars.length} bars${song.tempo ? `, ${formatTime(songSeconds(song, song.tempo))} at the record's speed` : ""}`],
  ]
  if (song.capo) facts.splice(2, 0, ["Capo", song.capo])
  return (
    <PopoverTrigger>
      <Button variant="ghost" size="icon-sm" aria-label="About this song">
        <InfoIcon />
      </Button>
      <Popover placement="bottom start" className="w-96">
        <PopoverHeader>
          <PopoverTitle>{song.title || "Untitled"}</PopoverTitle>
        </PopoverHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {song.notes.map((n, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {n}
          </p>
        ))}
      </Popover>
    </PopoverTrigger>
  )
}

export function Header() {
  const app = useController()
  const { songs, songId, editorOpen } = useAppState()
  const title = songs.find((s) => s.id === songId)?.title ?? "Untitled"
  const fileInput = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  async function importFile(file: File | undefined) {
    if (!file) return
    const error = await app.importBackup(await file.text())
    if (error) toast.error(error, { duration: 6000 })
    else toast.success("Backup imported. Your charts, speeds and patterns are here now.")
  }

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-1">
        {/* The song's title opens the library, where you pick another (decision 0014). */}
        <TooltipTrigger delay={500}>
          <Button
            variant="ghost"
            data-slot="song-button"
            className="h-11 max-w-[min(28rem,70vw)] min-w-0 px-2 text-xl font-semibold"
            onPress={() => app.openLibrary()}
          >
            <span className="sr-only">Song: </span>
            <span className="truncate">{title}</span>
            <span className="sr-only">. Open the library</span>
            <ChevronDownIcon className="text-muted-foreground" />
          </Button>
          <Tooltip>
            Library <Kbd>/</Kbd>
          </Tooltip>
        </TooltipTrigger>
        <SongInfo />
      </div>

      <div className="order-last flex w-full justify-center lg:order-none lg:w-auto lg:flex-1">
        <ModeSwitch />
      </div>

      <div className="ml-auto flex items-center gap-2 lg:ml-0">
        <Toggle variant="outline" isSelected={editorOpen} onChange={(on) => app.setEditorOpen(on)}>
          Edit chart
        </Toggle>
        <DropdownMenuTrigger>
          <Button variant="outline" size="icon" aria-label="Menu">
            <EllipsisIcon />
          </Button>
          <DropdownMenu
            placement="bottom end"
            className="w-64"
            onAction={(key) => {
              if (key === "new") app.newSong()
              else if (key === "import") fileInput.current?.click()
              else if (key === "settings") setSettingsOpen(true)
              else if (key === "shortcuts") setShortcutsOpen(true)
            }}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem id="settings">Practice settings…</DropdownMenuItem>
              <DropdownMenuItem id="shortcuts">Keyboard shortcuts…</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem id="new">New song</DropdownMenuItem>
              <DropdownMenuItem id="import">Import prototype backup…</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          void importFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <SettingsSheet isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
      <ShortcutsDialog isOpen={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  )
}
