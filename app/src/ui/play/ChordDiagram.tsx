import { cn } from "@/lib/utils"
import type { Voicing } from "@/core/song/types"

const ROWS = 4
const X0 = 32
const DX = 20
const Y0 = 34
const DY = 30
const W = X0 + DX * 5 + 18
const H = Y0 + DY * ROWS + 12

/**
 * A chord box: six strings, four frets, dots for fingers. The chord to play now has
 * dots in the emphasis color. The next chord is drawn quieter, in muted ink.
 */
export function ChordDiagram({ voicing, tone, className }: { voicing: Voicing | null; tone: "now" | "next"; className?: string }) {
  if (!voicing) return null
  const f = voicing.frets
  const fg = voicing.fingers ?? []
  const fretted = f.filter((x) => x > 0)
  const max = fretted.length ? Math.max(...fretted) : 0
  const min = fretted.length ? Math.min(...fretted) : 0
  const base = max <= ROWS ? 1 : min
  const xs = (i: number) => X0 + i * DX
  const yc = (fr: number) => Y0 + (fr - base + 0.5) * DY
  const dot = tone === "now" ? "fill-emphasis" : "fill-muted-foreground"
  const ink = tone === "now" ? "fill-emphasis-foreground" : "fill-card"
  const b = voicing.barre
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("block h-auto w-full", className)} aria-hidden="true">
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <line key={r} className="stroke-diagram-line" strokeWidth={1.4} x1={X0} x2={xs(5)} y1={Y0 + r * DY} y2={Y0 + r * DY} />
      ))}
      {base === 1 ? (
        <rect className="fill-foreground" x={X0 - 1.5} y={Y0 - 6} width={DX * 5 + 3} height={6} rx={1.5} />
      ) : (
        <text className="fill-muted-foreground" fontSize={13} fontWeight={600} x={X0 - 8} y={yc(base) + 5} textAnchor="end">
          {base}fr
        </text>
      )}
      {f.map((_, i) => (
        <line key={i} className="stroke-diagram-string" strokeWidth={2 - i * 0.2} x1={xs(i)} x2={xs(i)} y1={Y0} y2={Y0 + ROWS * DY} />
      ))}
      {f.map((fret, i) => {
        const x = xs(i)
        const y = Y0 - 17
        if (fret < 0) {
          return (
            <path
              key={i}
              className="stroke-diagram-string"
              strokeWidth={2}
              strokeLinecap="round"
              d={`M${x - 4.5} ${y - 4.5}L${x + 4.5} ${y + 4.5}M${x + 4.5} ${y - 4.5}L${x - 4.5} ${y + 4.5}`}
            />
          )
        }
        if (fret === 0) return <circle key={i} className="fill-none stroke-diagram-string" strokeWidth={1.8} cx={x} cy={y} r={5} />
        return null
      })}
      {b && (
        <>
          <rect className={dot} x={xs(b.from) - 9.5} y={yc(b.fret) - 9.5} width={(b.to - b.from) * DX + 19} height={19} rx={9.5} />
          {b.finger && (
            <text className={ink} fontSize={12.5} fontWeight={700} x={xs(b.from)} y={yc(b.fret) + 4.5} textAnchor="middle">
              1
            </text>
          )}
        </>
      )}
      {f.map((fret, i) => {
        if (fret <= 0) return null
        if (b && fret === b.fret && i >= b.from && i <= b.to) return null
        const x = xs(i)
        const y = yc(fret)
        return (
          <g key={i}>
            <circle className={dot} cx={x} cy={y} r={9.5} />
            {fg[i] && (
              <text className={ink} fontSize={12.5} fontWeight={700} x={x} y={y + 4.5} textAnchor="middle">
                {fg[i]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
