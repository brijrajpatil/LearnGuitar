import { useState } from "react"
import { Input } from "@/ui/components/input"

/** A number box that commits on Enter or when it loses focus. */
export function NumberInput({
  id,
  value,
  onCommit,
  min,
  max,
  label,
}: {
  id?: string
  value: number
  onCommit: (n: number) => void
  min: number
  max: number
  label?: string
}) {
  const [text, setText] = useState(String(value))
  // When the value changes from outside, show it.
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(String(value))
  }
  const commit = () => {
    const n = Number(text)
    if (Number.isFinite(n) && text.trim() !== "") onCommit(n)
    else setText(String(value))
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
