# 0007. shadcn's Luma style, with Inter as the font

Status: Superseded by [0009](0009-birch-light-theme-and-session-modes.md)
Date: 2026-10-04

## Context

[0001](0001-design-system.md) chose shadcn/ui on React Aria and left two choices to milestone 1: the style (Maia or Luma) and the font. Milestone 1 needed a style before its components could be added, because shadcn copies each component's source in the chosen style.

Both styles were set up in a throwaway project and their component source compared:

| | Luma | Maia |
|---|---|---|
| Buttons and toggles | Fully rounded, 36 px tall by default | Fully rounded, 36 px tall by default |
| Cards | Large radius (`rounded-4xl`) with a soft shadow | Smaller radius (`rounded-2xl`) with a thin ring, no shadow |
| Slider | 8 px track, a pill-shaped thumb like macOS | 12 px track, a round thumb |

The two differ less than their descriptions suggest. Play mode is mostly custom drawing (chord diagrams, the strum strip, the song map), which follows the app's own tokens in either style.

For the font, chord names at stage size need clear numerals, and the app shows ♯ and ♭ in place of `#` and `b`.

## Options

- Luma. Soft elevation separates the cards on the dark stage, and its slider thumb matches the Mac, where most practice happens.
- Maia. The thicker slider track is easier to hit by touch, which matters on the tablet in milestone 6.
- Font: Inter, which comes with the Luma preset. Free (SIL Open Font License), clear numerals with tabular figures, served from the app so it works offline. It has no ♯ or ♭, so those fall back to the system font.
- Font: Atkinson Hyperlegible Next, designed for legibility. It isn't in shadcn's presets, and wasn't checked for ♯ and ♭ either.

## Decision

Luma, with Inter. The app adds its own variants to the copied components where play mode needs them: a large play button, a toggle with an on indicator, a mute toggle and a segmented control for levels.

This is proposed rather than accepted because 0001 left the choice to the owner after seeing both. The milestone 1 review accepts it or picks Maia.

## Consequences

- Switching to Maia later means re-adding the components in that style and re-applying the app's variants. The tokens and custom views don't change.
- ♯ and ♭ come from the system font. On a Mac that looks close to Inter. Worth checking on the Android tablet.
- The slider and toggle sizes are below the 48 px touch target from 0001. That rule applies from milestone 6, when the tablet layout is built.
