# 0009. Birch: a light theme, session modes, and a layout that scales

Status: Accepted. The color and type sections are superseded by [0010](0010-monochrome-theme-and-geist.md), and the layout and scaling section by [0011](0011-play-screen-fits-the-window.md).
Date: 2026-10-04

Supersedes [0007](0007-luma-style-and-inter.md), and the parts of [0001](0001-design-system.md) on dark first (rule 5), play-mode colors and the contrast wording. 0001's component choices (shadcn/ui on React Aria, Tailwind CSS v4) stand.

## Context

The owner reviewed the milestone 1 rebuild and found:

- **Colors and contrast.** It was too dark, the contrast and colors didn't work for them, and it used too many colors.
- **Zoom and breakpoints.** It didn't scale when the window size changed or the browser was zoomed.
- **Crowding.** The screen was crowded, and it wasn't clear which controls to use for what they were practising, or what tempo was and how to use it to learn.

Measurements confirmed each one:

- **Colors.** The prototype's palette had about 17 hues: teal, amber, periwinkle, light blue for up strums, lavender for picks, yellow for cues, red, and 8 section colors.
- **Zoom.** Stage text was sized from the window height (`vh`), so the Now chord stayed 140 px on screen from 100% to 200% zoom while body text doubled. The layout was pinned to the window height with overflow hidden: at 150% zoom the song map was cut off and the page couldn't scroll, and at 200% the Play button sat 1148 px down the page.
- **Crowding.** There were 7 rows and about 25 controls on screen at once, with all-caps labels and "·" separators.

## Options

Three light directions were mocked up on the same simplified screen:

- A, "Daylight": cool white, a blue-to-violet gradient, Figtree.
- B, "Birch": soft grey-green paper, dark olive text, a teal-to-green gradient, Lexend.
- C, "Stage": pale lilac, a magenta-to-orange gradient, Bricolage Grotesque for chords.

For the screen itself, the choice was between one simple screen with everything else in a settings panel, and session modes that each show their own controls. For speed, it was between keeping "Tempo" with a help note, and showing speed as a percentage of the record with quick picks.

The owner chose B, session modes, speed as a percentage of the record, and a light theme only.

## Decision

### Color

One accent, plus neutrals, plus a red used only for editor errors. Values live in `src/index.css`.

| Token | Value | Use |
|---|---|---|
| paper (`--background`) | `#EFF1EC` | page |
| card | `#FAFBF8` | surfaces |
| ink (`--foreground`) | `#20241E` | text, strum arrows |
| ink-muted (`--muted-foreground`) | `#4B5148` | secondary text |
| dim | `#7D8578` | missed-strum dots, faint graphics |
| line (`--border`) | `#DCE0D6` | borders, decoration only |
| accent gradient | `#0B6B5F` to `#287A3E` | the lit beat, the playhead, progress, Play |
| tint | `#E3F1EA` | the Next card, selected and looped backgrounds |
| error (`--destructive`) | `#B42318` | editor errors |

The gradient means "now" or "progress toward a goal" and is used for nothing else. Strum directions are told apart by the arrow's direction, not by color. Song map sections are neutral, with the current and looped ones in the accent. A coming pattern change uses the accent too, so there's no separate warning color.

### Contrast

This replaces the rules in 0001:

- Play-mode text: at least 7:1, or 4.5:1 for large text (WCAG AAA).
- Graphics that carry meaning: at least 3:1.
- Other text: at least 4.5:1.

`src/ui/tokens.test.ts` reads the theme file and checks these pairs on every test run. It caught one value in this note's first draft: the gradient's green end was `#2F8A47`, where white text reaches only 4.3:1, so it became `#287A3E` (5.3:1).

### Type

Lexend for everything (SIL Open Font License, served from the app so it works offline). It was designed for easier reading, which suits reading chords from 1.5 m. It has no ♯ or ♭, so the app draws them as small SVGs that take the text's color and size.

All sizes are in rem, so browser zoom scales everything. Stage text follows its card's width between a rem floor and ceiling: `clamp(4rem, 1.5rem + 26cqi, 11rem)`. The rem part makes the chord grow when zooming in, and the container part keeps it inside its card.

### Layout and scaling

- The page scrolls instead of clipping. The transport bar is pinned to the bottom when the window is at least 28rem tall. In shorter windows (a phone held sideways, 400% zoom), it sits at the end of the page instead of covering it.
- Breakpoints are in rem, so zoom triggers them. The chord cards use container queries.
- `tests/e2e/layout.spec.ts` checks the sizes equivalent to 100% to 400% zoom on a 1440×900 window, and common widths from 360 to 1920. It checks there's no sideways scrolling, Play can be reached, the main controls fit the width, and chord text grows with zoom.

### Session modes

The play screen asks what you're practising:

- **Learn a section** loops one section. Pick it in the song map or with ←/→.
- **Build speed** loops the section and adds a few BPM each time through, from a start speed to a goal, with a progress bar.
- **Play the song** plays start to end.

New players start in Play the song, and the app remembers the last mode. Speed shows the BPM and the share of the record ("70 BPM, 88% of the record"), with quick picks (60%, 75%, 90%, Record) and a note on how to use it. A "How to practise" note explains the three modes in order.

Settings changed now and then (Simplify chords, volumes, mutes) moved to a Practice settings panel. Level moved beside the strum pattern it changes. The pattern override is a small "Change pattern" menu. The banner and status rows were merged into the strum card and a slim position line, which takes the screen from 7 rows to 5.

### Shapes

shadcn's Luma controls stay. The Now, Next and strum cards use shadcn's `Card`, with the Now card largest and the Next card quieter (tint, no border). Keyboard focus shows a 2 px accent outline on every control.

## Consequences

- The owner chose the look from mockups and gets one theme, tested for contrast. A dim or dark theme isn't offered. It can come later as its own decision.
- 0001's rule that play mode is dark first no longer applies. 0001's other rules stand: tokens only, shared components in `src/ui/components`, and React Aria for custom interactive views.
- The mode is saved with the other settings. The old trainer on/off setting is gone, because the mode decides it.
- The headless Chrome used for tests ran at 30 frames per second on the day this was measured, even on a blank page. The strip still lit within 35 ms of the sound, inside the test's 50 ms limit.
- Touch targets are still below 48 px. That rule applies from milestone 6.
