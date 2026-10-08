import { Button } from "@/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/ui/components/field"
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/ui/components/sheet"
import { Slider } from "@/ui/components/slider"
import { Switch } from "@/ui/components/switch"
import { useAppState, useController } from "@/ui/hooks/use-app"

function Volume({ name, volume, muted, onVolume, onMute }: { name: string; volume: number; muted: boolean; onVolume: (v: number) => void; onMute: (m: boolean) => void }) {
  return (
    <Field>
      <FieldLabel>{name} volume</FieldLabel>
      <div className="flex items-center gap-4">
        <Slider aria-label={`${name} volume`} minValue={0} maxValue={100} value={volume} onChange={(v) => onVolume(v as number)} />
        <span className="flex items-center gap-2">
          <Switch isSelected={muted} onChange={onMute} aria-label={`Mute ${name.toLowerCase()}`} />
          <span aria-hidden="true" className="text-sm">
            Mute
          </span>
        </span>
      </div>
    </Field>
  )
}

/** Settings you change now and then, kept off the play screen. */
export function SettingsSheet({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const app = useController()
  const { settings, hasAiKey } = useAppState()
  const mix = settings.mix
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <SheetHeader>
        <SheetTitle>Practice settings</SheetTitle>
        <SheetDescription>These apply to every song.</SheetDescription>
      </SheetHeader>
      <FieldGroup className="px-6">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel>Simplify chords</FieldLabel>
            <FieldDescription>Use easier shapes for hard chords, such as a four-string F♯m.</FieldDescription>
          </FieldContent>
          <Switch isSelected={settings.simplify} onChange={() => app.toggleSimplify()} aria-label="Simplify chords" />
        </Field>
        <FieldSeparator />
        <Volume
          name="Click"
          volume={mix.clickVolume}
          muted={mix.clickMuted}
          onVolume={(v) => app.setMix({ clickVolume: v, clickMuted: false })}
          onMute={(m) => app.setMix({ clickMuted: m })}
        />
        <Volume
          name="Guitar"
          volume={mix.guitarVolume}
          muted={mix.guitarMuted}
          onVolume={(v) => app.setMix({ guitarVolume: v, guitarMuted: false })}
          onMute={(m) => app.setMix({ guitarMuted: m })}
        />
        {hasAiKey && (
          <>
            <FieldSeparator />
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Gemini key</FieldLabel>
                <FieldDescription>Saved in this browser for adding songs with AI.</FieldDescription>
              </FieldContent>
              <Button variant="outline" size="sm" onPress={() => void app.forgetAiKey()}>
                Forget key
              </Button>
            </Field>
          </>
        )}
      </FieldGroup>
    </Sheet>
  )
}
