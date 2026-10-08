import { useState } from "react"
import { Input } from "@/ui/components/input"

/** A number box that commits on Enter or when it loses focus. Null shows it empty. */
export function NumberInput({
  id,
  value,
  onCommit,
  min,
  max,
  label,
}: {
  id?: string
  value: number | null
  onCommit: (n: number) => void
  min: number
  max: number
  label?: string
}) {
  const show = (v: number | null) => (v === null ? "" : String(v))
  const [text, setText] = useState(show(value))
  // When the value changes from outside, show it.
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(show(value))
  }
  // A value that changes shows up above. One that doesn't, such as a number past the
  // limit when the value is already at it, goes back to the value here.
  const commit = () => {
    const n = Number(text)
    if (Number.isFinite(n) && text.trim() !== "") onCommit(n)
    setText(show(value))
  }
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={min}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
      }}
      className="w-20 text-center tabular-nums"
    />
  )
}
