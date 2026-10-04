# 0011. The play screen fits the window

Status: Accepted
Date: 2026-10-04

Supersedes the "Layout and scaling" section of [0009](0009-birch-light-theme-and-session-modes.md). The rest of 0009 stands, including rem sizing and the contrast rules.

## Context

0009 let the page scroll, with the Play bar pinned to the bottom of the window. On the owner's MacBook Air (13") at 100% zoom, Chrome's page area is 1470 x 785 px. The play screen was 864 px tall there, so the strum card was cut off behind the Play bar and the song map sat below it. The owner asked for everything in one view, the way Spotify's web player fills the window.

Measurements found two causes:

- The chord cards took their height from their content. The Now diagram was 311 px tall, so the cards were 367 px tall in any window.
- The layout test checked a 1440 x 900 window at 100%, where the screen happened to fit. A MacBook Air with Chrome's toolbars is 115 px shorter.

## Options

- Keep the scrolling page and make everything smaller. It would fit this laptop, but not the next smaller window, and the chords would lose size on large screens too.
- Hide parts of the screen (the diagrams, the song map) when the window is short. It fits, but things the player uses disappear.
- Fill the window, as Spotify does: fixed rows, one flexible area, and the Play bar as the last row. When the rows can't all fit, the middle scrolls and Play stays put.

## Decision

The play screen fills the window. The chord cards are the flexible area: they take the height the other rows leave, and the chord name and diagram scale to the card's width and height. The header, position line, strum card, song map and Play bar keep their sizes.

Three window-height variants in `src/index.css` set the layout. They're in rem, so browser zoom moves them too:

| Variant | Window height | What it does |
|---|---|---|
| `fit` | 22rem or more | The app fills the window and Play is its last row. The middle scrolls when needed. |
| `short` | 44rem or less | Compact rows: smaller gaps and padding, and smaller strum slots. |
| `roomy` | 56rem or more | The large strum slots. |

The chord cards are CSS size containers. The chord name's size is `clamp(3rem, min(1.5rem + 26cqi, 100cqb - 2.5rem), 11rem)`: it follows the card's width (`cqi`) and height (`cqb`), between a rem floor and ceiling. The next chord gets 0.7 of that height, so the chord to play now reads first. Diagrams follow the same limits. The cards are at least 12rem tall side by side, and 24rem when they stack on a phone.

In windows under 22rem tall (400% zoom, or a phone held sideways), the whole page scrolls instead, so the Play bar doesn't cover the screen.

The app shell's height is the only viewport unit (`dvh`). Everything inside it stays in rem and container units.

## Consequences

- On this MacBook Air at 100% and 125% zoom, every part of the play screen is in view. At 150% and 200%, the middle scrolls and Play stays at the bottom. The chord at 100% is the same size as before (176 px). The diagram is 239 px tall instead of 311.
- Zooming in still makes the chord text bigger on screen, but not at every step: the other rows grow too and leave the chords less room. The layout test checks that the chord is never smaller on screen than at 100% zoom.
- `tests/e2e/layout.spec.ts` checks Chrome's page area on real laptops (MacBook Air 13" at 100% to 200%, MacBook Air 15", a 1366 x 768 laptop) besides the earlier sizes. Windows at least 64rem wide and 37.5rem tall must show everything without scrolling.
- On a phone, the middle scrolls and the Play bar takes two rows. Phone layout is milestone 6's work.
- On large screens the chord cards have spare room, because the chord name stops at 11rem. A larger ceiling for reading from further away can come later.
