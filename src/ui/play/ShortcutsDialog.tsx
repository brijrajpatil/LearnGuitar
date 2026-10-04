import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/ui/components/dialog"
import { Kbd } from "@/ui/components/kbd"

const SHORTCUTS: [string, string][] = [
  ["Space", "Play or pause, after a one-bar count-in"],
  ["← →", "Previous or next section"],
  ["↑ ↓", "Speed up or down 1 BPM, or 5 with Shift"],
  ["L", "Loop this section, or play the whole song again"],
  ["⌘ Enter", "Apply chart edits (Ctrl+Enter on Windows)"],
  ["Esc", "Close the editor or a dialog"],
]

/** The keyboard shortcuts. A foot pedal that sends these keys works too. */
export function ShortcutsDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>They work anywhere on the play screen, so a foot pedal that sends these keys works too.</DialogDescription>
      </DialogHeader>
      <table className="w-full border-collapse">
        <tbody>
          {SHORTCUTS.map(([key, what]) => (
            <tr key={key}>
              <td className="py-1.5 pr-4 align-top whitespace-nowrap">
                <Kbd>{key}</Kbd>
              </td>
              <td className="py-1.5">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  )
}
