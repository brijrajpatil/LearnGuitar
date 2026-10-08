import { useMemo } from "react"
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react"
import { Header as SectionTitle, ListBox, ListBoxItem, ListBoxSection, type Selection } from "react-aria-components"
import { capoFret } from "@/core/theory/chords"
import { keyName, moveKey, tonicName, writtenKey, type Key } from "@/core/theory/keys"
import { keyOptions, offsetFromRecord, type KeyOption } from "@/core/timeline/key-options"
import { Button } from "@/ui/components/button"
import { Kbd } from "@/ui/components/kbd"
import { Popover, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/components/popover"
import { Tooltip, TooltipTrigger } from "@/ui/components/tooltip"
import { useAppState, useController } from "@/ui/hooks/use-app"
import { ChordList, ChordName, spokenChord } from "@/ui/play/ChordName"
import { capoText, plural } from "@/ui/play/display"

const MAX_CAPO = 12

/** A key's name with ♯ and ♭ drawn, such as "F♯m". */
const KeyName = ({ k }: { k: Key }) => <ChordName name={keyName(k)} />

/** "A major" or "F♯ minor". */
const KeyInWords = ({ k }: { k: Key }) => (
  <>
    <ChordName name={tonicName(k)} /> {k.minor ? "minor" : "major"}
  </>
)

function KeyRow({ option }: { option: KeyOption }) {
  const barres = option.barres ? plural(option.barres, "barre") : "No barres"
  const chords = option.missing.length ? `Can't move ${option.missing.join(", ")}` : option.chords.map(spokenChord).join(", ")
  return (
    <ListBoxItem
      id={option.shapes}
      textValue={keyName(option.key)}
      aria-label={`${spokenChord(keyName(option.key))}: ${chords}. ${barres}. ${capoText(option)}.`}
      className="group grid cursor-default grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-xl px-3 py-1.5 outline-none data-disabled:text-muted-foreground data-focus-visible:-outline-offset-2 data-focused:bg-accent data-hovered:bg-accent data-selected:bg-tint sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_9rem]"
    >
      <span className="flex items-center gap-1.5 font-medium">
        <span className="size-2 shrink-0 rounded-full bg-emphasis opacity-0 group-data-selected:opacity-100" aria-hidden="true" />
        <KeyName k={option.key} />
      </span>
      <span className="min-w-0">
        {option.missing.length ? (
          <span>Can't move {option.missing.join(", ")}</span>
        ) : (
          <ChordList chords={option.chords} limit={5} />
        )}
        <span className="block text-sm text-muted-foreground sm:hidden">{barres}</span>
      </span>
      <span className="text-sm text-muted-foreground max-sm:hidden">{barres}</span>
      <span className="text-right text-sm">{capoText(option)}</span>
    </ListBoxItem>
  )
}

/** The capo's fret, one step at a time, and what that sounds like next to the record. */
function CapoStepper({ recordKey, heardKey, offset }: { recordKey: Key; heardKey: Key; offset: number }) {
  const app = useController()
  const { arrangement: arr } = useAppState()
  const setCapo = (capo: number) => {
    if (capo >= 0 && capo <= MAX_CAPO) app.setKey({ shapes: arr.shapes, capo })
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
      <div role="group" aria-label="Capo" className="flex items-center gap-2">
        <span className="font-medium">Capo</span>
        {/* Both stay enabled at the ends, so keyboard focus never drops out of the popover. */}
        <Button variant="outline" size="icon-sm" aria-label="Move the capo down a fret" onPress={() => setCapo(arr.capo - 1)}>
          <MinusIcon />
        </Button>
        <span className="w-14 text-center tabular-nums" aria-live="polite">
          {arr.capo ? `Fret ${arr.capo}` : "None"}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Move the capo up a fret" onPress={() => setCapo(arr.capo + 1)}>
          <PlusIcon />
        </Button>
      </div>
      <p className="min-w-0 flex-1 basis-56 text-muted-foreground" aria-live="polite">
        {offset === 0 ? (
          <>
            Sounds like the record, in <KeyName k={recordKey} />.
          </>
        ) : (
          <>
            Sounds in <KeyName k={heardKey} />, {plural(Math.abs(offset), "fret")} {offset < 0 ? "lower" : "higher"} than the record.
          </>
        )}
      </p>
    </div>
  )
}

/**
 * The key the record is in, and the shapes and capo you play it with (decision 0016).
 * The list shows every key with the song's chords in it, so you can pick the chord
 * family you're learning and still hear the record's key with a capo.
 */
export function KeyPicker() {
  const app = useController()
  const { song, songId, arrangement: arr, settings, keyPickerOpen } = useAppState()
  const written = useMemo(() => writtenKey(song), [song])
  const options = useMemo(() => keyOptions(song, arr.settings), [song, arr.settings])
  if (!written || !options) return null

  const recordKey = moveKey(written.key, capoFret(song.capo))
  const shapesKey = moveKey(written.key, arr.shapes)
  const heardKey = moveKey(written.key, arr.shapes + arr.capo)
  const offset = offsetFromRecord(song, arr)
  const detail = arr.capo ? (
    <>
      <KeyName k={shapesKey} /> shapes, capo {arr.capo}
    </>
  ) : shapesKey.tonic !== recordKey.tonic ? (
    <>
      Playing in <KeyName k={shapesKey} />
    </>
  ) : null
  const changed = Boolean(settings.key[songId])

  const choose = (keys: Selection) => {
    if (keys === "all") return
    const shapes = [...keys][0]
    const option = options.find((o) => o.shapes === shapes)
    if (option) app.setKey({ shapes: option.shapes, capo: option.capo ?? 0 })
  }
  const families = options.filter((o) => o.family)
  const others = options.filter((o) => !o.family)
  const disabled = options.filter((o) => o.missing.length).map((o) => o.shapes)

  return (
    <PopoverTrigger isOpen={keyPickerOpen} onOpenChange={(open) => app.setKeyPickerOpen(open)}>
      <TooltipTrigger delay={500}>
        <Button variant="ghost" data-slot="key-button" className="h-11 min-w-0 gap-2 px-2">
          <span className="sr-only">Key and capo: </span>
          <span className="whitespace-nowrap">
            Key of <KeyName k={recordKey} />
          </span>
          {detail && <span className="truncate text-muted-foreground">{detail}</span>}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
        <Tooltip>
          Key and capo <Kbd>K</Kbd>
        </Tooltip>
      </TooltipTrigger>
      <Popover placement="bottom start" className="w-[min(40rem,calc(100vw-2rem))] gap-3 overflow-hidden">
        <PopoverHeader>
          <PopoverTitle>
            The record is in <KeyInWords k={recordKey} />
          </PopoverTitle>
          <PopoverDescription>
            {written.guessed && "The chart doesn't give a key, so this comes from its chords. "}
            Pick the shapes you want to play. A capo keeps the record's sound.
          </PopoverDescription>
        </PopoverHeader>
        <ListBox
          aria-label="Keys to play in"
          autoFocus
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[arr.shapes]}
          disabledKeys={disabled}
          onSelectionChange={choose}
          className="-mx-1 min-h-0 overflow-y-auto outline-none"
        >
          <ListBoxSection>
            <SectionTitle className="px-3 pb-1 text-xs font-medium text-muted-foreground">Open-chord families</SectionTitle>
            {families.map((o) => (
              <KeyRow key={o.shapes} option={o} />
            ))}
          </ListBoxSection>
          <ListBoxSection>
            <SectionTitle className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">Other keys</SectionTitle>
            {others.map((o) => (
              <KeyRow key={o.shapes} option={o} />
            ))}
          </ListBoxSection>
        </ListBox>
        <CapoStepper recordKey={recordKey} heardKey={heardKey} offset={offset} />
        {changed && (
          <Button variant="outline" size="sm" className="self-start" onPress={() => app.resetKey()}>
            Back to the chart's key
          </Button>
        )}
      </Popover>
    </PopoverTrigger>
  )
}
