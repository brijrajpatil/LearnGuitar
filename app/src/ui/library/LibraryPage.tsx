import { useRef, useState, type KeyboardEvent } from "react"
import { ArrowLeftIcon, PlusIcon, SearchIcon } from "lucide-react"
import { ListBox, ListBoxItem, SearchField } from "react-aria-components"
import { cn } from "cn"
import type { SongEntry } from "@/app/controller"
import { DIFFICULTIES } from "@/data/library/catalog"
import { Badge } from "@/ui/components/badge"
import { Button } from "@/ui/components/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/components/input-group"
import { Kbd } from "@/ui/components/kbd"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/select"
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group"
import { useAppState, useController } from "@/ui/hooks/use-app"
import {
  byline,
  COLLECTION_NAMES,
  DIFFICULTY_NAMES,
  filterSongs,
  type CollectionFilter,
  type DifficultyFilter,
} from "@/ui/library/filter"
import { AddSongPanel } from "@/ui/library/AddSongPanel"
import { ChordList } from "@/ui/play/ChordName"

const COLLECTIONS: { id: CollectionFilter; name: string; short: string }[] = [
  { id: "all", name: "All", short: "All" },
  { id: "study", name: COLLECTION_NAMES.study, short: "Studies" },
  { id: "traditional", name: COLLECTION_NAMES.traditional, short: "Folk" },
  { id: "yours", name: COLLECTION_NAMES.yours, short: "Yours" },
]

/** At most this many chords in a row, then "+3". */
const CHORDS_SHOWN = 6

const Chords = ({ chords }: { chords: string[] }) => <ChordList chords={chords} limit={CHORDS_SHOWN} />

function SongRow({ song, current }: { song: SongEntry; current: boolean }) {
  const by = byline(song)
  return (
    <ListBoxItem
      id={song.id}
      textValue={song.title}
      className="grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-border px-4 py-3 outline-none first:border-t-0 data-focus-visible:-outline-offset-2 data-focused:bg-accent data-hovered:bg-accent sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_7rem]"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-medium">
          {current && (
            <span className="size-2 shrink-0 rounded-full bg-emphasis" role="img" aria-label="Current song" />
          )}
          <span className="truncate">{song.title}</span>
        </span>
        {(by || song.aiDraft) && (
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {by && <span className="truncate">{by}</span>}
            {song.aiDraft && <Badge variant="outline">AI draft</Badge>}
          </span>
        )}
        {/* Phones have no chords column, so the chords go under the title. */}
        <span className="mt-0.5 block text-sm sm:hidden">
          <Chords chords={song.chords} />
        </span>
      </span>
      <span className="text-sm max-sm:hidden">
        <Chords chords={song.chords} />
      </span>
      <span className="text-right text-sm text-muted-foreground sm:text-left">
        {song.difficulty ? DIFFICULTY_NAMES[song.difficulty] : ""}
      </span>
    </ListBoxItem>
  )
}

/**
 * The library page, in place of the play screen (decision 0014). Search, filter by
 * collection and difficulty, then open a song with Enter or a click.
 */
export function LibraryPage() {
  const app = useController()
  const { songs, songId } = useAppState()
  const current = songs.find((s) => s.id === songId)
  const [query, setQuery] = useState("")
  const [collection, setCollection] = useState<CollectionFilter>("all")
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("any")
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const shown = filterSongs(songs, { query, collection, difficulty })
  // The Add a song panel, opened with what was typed in the search (decision 0017).
  const [adding, setAdding] = useState<string | null>(null)
  const openAdd = (seed: string) => setAdding(seed.trim())
  const closeAdd = () => {
    setAdding(null)
    requestAnimationFrame(() => search.current?.focus())
  }

  const clearFilters = () => {
    setQuery("")
    setCollection("all")
    setDifficulty("any")
    search.current?.focus()
  }

  // Escape closes the Add a song panel, then goes back to the play screen once the search
  // is empty (the search field clears itself first). "/" jumps to the search from anywhere.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      if (adding !== null) closeAdd()
      else app.closeLibrary()
    } else if (e.key === "/" && e.target !== search.current) {
      e.preventDefault()
      search.current?.focus()
    }
  }

  return (
    <div className="flex min-h-svh fit:h-dvh fit:min-h-0" onKeyDown={onKeyDown}>
      <main className="relative flex min-w-0 flex-1 flex-col fit:min-h-0" aria-labelledby="library-title">
        <div className="mx-auto flex w-full max-w-app flex-1 flex-col gap-4 px-4 pt-4 pb-6 short:gap-3 short:pt-3 short:pb-4 sm:px-6 fit:min-h-0 [&>*]:shrink-0">
          <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h1 id="library-title" className="text-xl font-semibold">
              Library
            </h1>
            <SearchField
              aria-label="Search songs"
              value={query}
              onChange={setQuery}
              autoFocus
              className="order-last w-full sm:order-none sm:w-auto sm:flex-1"
              // Enter with nothing found opens Add a song with what was typed.
              onSubmit={(value) => value.trim() && !shown.length && openAdd(value)}
              onKeyDown={(e) => {
                // React Aria stops other keys here unless told to pass them on.
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  list.current?.querySelector<HTMLElement>('[role="option"]')?.focus()
                } else e.continuePropagation()
              }}
            >
              <InputGroup className="h-10">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  ref={search}
                  placeholder="Song, artist or chord, like Am"
                  className="[&::-webkit-search-cancel-button]:hidden"
                />
                <InputGroupAddon align="inline-end" className="max-sm:hidden">
                  <Kbd>/</Kbd>
                </InputGroupAddon>
              </InputGroup>
            </SearchField>
            <Button variant="outline" className="ml-auto max-w-[min(20rem,60vw)] sm:ml-0" onPress={() => app.closeLibrary()}>
              <ArrowLeftIcon />
              <span className="truncate">
                <span className="max-sm:hidden">Back to </span>
                <span className="sm:hidden">Back</span>
                <span className="max-sm:hidden">{current?.title ?? "the song"}</span>
              </span>
            </Button>
          </header>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <ToggleGroup
              aria-label="Collection"
              variant="segment"
              size="sm"
              spacing={1}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[collection]}
              onSelectionChange={(keys) => {
                const [key] = [...keys] as CollectionFilter[]
                if (key) setCollection(key)
              }}
            >
              {COLLECTIONS.map((c) => (
                <ToggleGroupItem key={c.id} id={c.id}>
                  {/* Phones and high zoom get the short name, so the filters fit in one row. */}
                  <span className="sm:hidden">{c.short}</span>
                  <span className="max-sm:hidden">{c.name}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select
              aria-label="Difficulty"
              selectedKey={difficulty}
              onSelectionChange={(key) => key !== null && setDifficulty(key as DifficultyFilter)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-44">
                <SelectGroup>
                  <SelectItem id="any">Any difficulty</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} id={d}>
                      {DIFFICULTY_NAMES[d]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {shown.length === 1 ? "1 song" : `${shown.length} songs`}
            </p>
            {collection === "yours" && adding === null && (
              <Button variant="outline" size="sm" className="ml-auto" onPress={() => openAdd(query)}>
                <PlusIcon />
                Add a song
              </Button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card fit:min-h-48",
                // Narrow screens show the panel in place of the list.
                adding !== null && "max-lg:hidden"
              )}
            >
              <div
                aria-hidden="true"
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,16rem)_7rem] gap-x-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground max-sm:hidden"
              >
                <span>Song</span>
                <span>Chords</span>
                <span>Difficulty</span>
              </div>
              <ListBox
                ref={list}
                aria-label="Songs"
                items={shown}
                onAction={(key) => app.selectSong(String(key))}
                // relative: the chord names' screen reader text is positioned absolutely, and
                // has to scroll with the list instead of making the whole page taller.
                className="relative min-h-0 flex-1 overflow-y-auto outline-none"
                renderEmptyState={() => (
                  <EmptyState
                    noSongsYet={collection === "yours" && !songs.some((s) => s.collection === "yours")}
                    query={adding === null ? query.trim() : ""}
                    onClear={clearFilters}
                    onAdd={() => openAdd(query)}
                  />
                )}
              >
                {(song) => <SongRow song={song} current={song.id === songId} />}
              </ListBox>
              {query.trim() && shown.length > 0 && adding === null && (
                <div className="border-t border-border px-2 py-1.5">
                  <Button variant="ghost" size="sm" onPress={() => openAdd(query)}>
                    <PlusIcon />
                    <span className="truncate">Add "{query.trim()}"</span>
                  </Button>
                </div>
              )}
            </div>
            {adding !== null && <AddSongPanel key={adding} seed={adding} onClose={closeAdd} />}
          </div>
        </div>
      </main>
    </div>
  )
}

/** Shown when the list is empty: an invitation to add a song, or a way out of the filters. */
function EmptyState({
  noSongsYet,
  query,
  onClear,
  onAdd,
}: {
  noSongsYet: boolean
  query: string
  onClear: () => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      {noSongsYet && !query ? (
        <>
          <p className="font-medium">Your songs show here</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add a song you want to learn. The AI can draft its chords, or you can paste them from a chord page.
          </p>
          <Button variant="outline" size="sm" onPress={onAdd}>
            <PlusIcon />
            Add a song
          </Button>
        </>
      ) : (
        <>
          <p className="font-medium">No songs match</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {query ? "Add it to your songs, or try another word or chord." : "Try another word or chord, or clear the filters."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {query && (
              <Button size="sm" onPress={onAdd}>
                <PlusIcon />
                <span className="max-w-60 truncate">Add "{query}"</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onPress={onClear}>
              Clear filters
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
