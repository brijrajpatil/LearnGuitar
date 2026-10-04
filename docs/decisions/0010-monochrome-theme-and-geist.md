# 0010. A monochrome theme, with Geist

Status: Accepted
Date: 2026-10-04

Supersedes the color and type sections of [0009](0009-birch-light-theme-and-session-modes.md). The rest of 0009 stands: the light theme, the session modes, speed shown against the record, rem sizing, the layout and the contrast rules.

## Context

After living with Birch, the owner asked for a monochrome theme like major software platforms, with color added later. Mockups compared two ways of marking "now" without color (flat black, or a black-to-graphite gradient) and three fonts (Lexend, Geist, and the system font).

## Decision

**Color.** Neutral greys with no hue, from `src/index.css`:

- page `#FAFAFA`, cards `#FFFFFF`, quiet surfaces `#F5F5F5`, borders `#E5E5E5`
- text `#0A0A0A`, secondary text `#525252`, faint graphics `#8C8C8C`
- primary buttons, switches and the focus outline `#171717`

**Emphasis.** The beat you're on, the playhead, progress and the Play button are flat black, through an `--emphasis` token and a `bg-emphasis` utility. The token has a companion, `--emphasis-image`, which is empty today. Color or a gradient can come back by setting those two tokens, without touching components.

**Errors.** Red (`#DC2626`) stays for errors and destructive actions only: chart errors and Delete song.

**Type.** Geist (SIL Open Font License), Vercel's interface font, served from the app so it works offline. ♯ and ♭ are still drawn as SVG.

The contrast rules from 0009 are unchanged, and `src/ui/tokens.test.ts` checks the new values.

## Consequences

- The screen has no hue except red on errors. Emphasis comes from black against light grey, and from size and weight.
- Adding color later is a token change, recorded in a new decision note when it happens.
- The icon is a black tile with white arrows.
