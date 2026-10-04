# 0001. Design system: shadcn/ui on React Aria, with Tailwind CSS v4

Status: Accepted. Rule 5 (dark first), the play-mode colors and the contrast rules are superseded by [0009](0009-birch-light-theme-and-session-modes.md).
Date: 2026-10-04

## Context

The app gets built over six milestones by one person. Without a shared set of components and visual rules, each new screen drifts a little from the last: a slightly different button, a new grey, another font size. A design system gives every screen the same parts and the same rules, and starting from an existing free one saves building that base by hand.

What this app asks of a design system:

- It runs on a Mac with a keyboard and a Bluetooth foot pedal that acts as a keyboard, and by touch on an Android tablet. Later it runs for other guitarists on their own devices ([0004](0004-public-repo-and-future-users.md)). Controls have to work equally well with keys, mouse and fingers.
- Play mode is read from 1.5 m on a dark screen. Type sizes and contrast have to be set by the app without fighting the system's defaults.
- Much of play mode is custom drawing: chord diagrams, the strum strip, the tab view, the song map. These must use the same colors, sizes and spacing as the standard controls.
- The rest is ordinary app interface: buttons, sliders for the mixer and tempo, menus, dialogs, tabs, editor forms and toasts.
- This note assumes the TypeScript, Vite and React stack proposed in [0005](0005-typescript-pwa.md), installed as a PWA that works offline.
- Everything must be free to use under an open source license, including a Figma kit if screens are designed there first.

## Options

| Option | License | Main cost |
|---|---|---|
| shadcn/ui (chosen) | MIT | Component code is copied into the repo, so fixes shadcn ships later come in by hand. |
| Material Design 3 through MUI's Material UI | MIT (core) | MUI's docs say Material UI supports Material Design 2. Material 3 support was expected by the end of 2024 and hasn't shipped. Google's own Material Web components are in maintenance mode. On a Mac, Material also reads as an Android app. Its touch target guidance is still used below. |
| Radix Themes | MIT | Well-made color and spacing scales, but the last dated release on its changelog is 3.1.1 from June 2024. Styling goes through its own props and variables, which makes a distinct look harder. |
| React Spectrum S2 (Adobe) | Apache 2.0 | Built on the same React Aria, but it carries Adobe's visual identity. Its `styles` prop accepts only layout, spacing, sizing and positioning, so colors and internal padding can't be changed. |
| Mantine, Chakra UI, HeroUI | MIT | Complete libraries that would work. They're installed as packages and themed through their own APIs, so changing a component's markup or behavior means wrapping or forking it. |
| Carbon (IBM), Fluent 2 (Microsoft) | Apache 2.0, MIT | Thorough and free, built for business software. Their density and look don't fit a practice app. |
| Apple Human Interface Guidelines | Guidelines only | No web components. Still worth reading for macOS conventions. |

## Decision

Use [shadcn/ui](https://ui.shadcn.com) with React Aria Components as its base, styled with Tailwind CSS v4. Start from one of shadcn's rounded consumer styles and add tokens for play mode.

| Layer | What it gives the app | License |
|---|---|---|
| shadcn/ui | Component source code, copied into the repository by its CLI, and a set of theme tokens | MIT |
| React Aria Components (Adobe) | Behavior under the components: focus, keyboard navigation, press and touch handling, screen reader semantics | Apache 2.0 |
| Tailwind CSS v4 | Design tokens as CSS variables, and the utility classes the components are styled with | MIT |

The project is set up with:

```bash
npx shadcn@latest init --base aria
```

Components land in the brief's `ui` module (`src/ui/components`), set through the aliases in `components.json`. The music and audio modules (`core/*`, `audio`) never import from them, so this decision doesn't touch that code.

### Why shadcn/ui

The code lives in the repo. The shadcn CLI copies each component's source into the project, so changing how a slider behaves on the tablet is an edit to a local file. There's no styled component package to upgrade around or fork.

Its theme is a short list of CSS variables (`background`, `foreground`, `primary`, `muted`, `accent`, `destructive`, `border`, `ring` and a few more), with light and dark values. The play mode tokens sit next to them in the same file, so custom views and standard components draw from one place.

The look is a starting point that can change. shadcn/create offers eight styles that set radius, spacing and surfaces. Two suit a consumer app. Maia has large, often fully rounded corners and generous spacing; Shadcnblocks, a third-party block library, recommends it for consumer-facing products. Luma, per the shadcn changelog, has rounded geometry, soft elevation and open spacing, with cues from macOS Tahoe minus the glass effect.

Engineers who read the repository will likely know shadcn/ui already, which matters for a public repo that people review.

### Why React Aria as the base

Since July 2026, shadcn/ui offers three bases for its components: Base UI (the default for new projects), Radix, and React Aria. All three are free and accessible.

React Aria fits this app's mix of inputs. Its documentation lists behavior the app would otherwise need its own code for:

- No sticky hover states on touch screens. Hover applies only to a mouse.
- Dragging a finger off a button cancels the press, as on a native app.
- Scroll locking and multi-touch handling.
- Arrow key navigation, typeahead and keyboard selection, following the W3C ARIA Authoring Practices.

React Aria also exports that behavior as hooks: `usePress`, `useKeyboard`, `useMove`, `useLongPress` and `useFocusRing`. The app's own interactive views, such as the pattern grid and tab grid editors, can use the same hooks. A hand-drawn grid then responds to keys, mouse and touch the same way a shadcn button does. This is the main reason over Base UI.

Radix is still supported by shadcn, but its updates have slowed since WorkOS acquired it.

### Tokens for play mode

shadcn's tokens cover standard screens. Play mode adds its own, defined in the same CSS file and exposed to Tailwind through `@theme`:

- Stage type sizes: current chord, next chord, beat countdown, lyric line, section label.
- Beat and strum colors: current, next, warning, down strum, up strum, pick, cue, missed strum, and error.
- Stage spacing and radius, sized for reading at a distance.

The prototype's colors are the starting values. Measured against its background (`#0d0f13`), most already meet the play mode rule below: main text 16.9:1, accent `#2dd4bf` 10.3:1, warning `#ffb224` 10.6:1, next chord `#a5b0ff` 9.4:1. Two need work. Muted text (`#8f98aa`) is 6.6:1, and the dim color (`#525b6c`), used for the faint missed-strum arrows, is 2.8:1.

Contrast and size rules:

- Play mode text: at least 7:1 against its background (WCAG AAA), since it's read from 1.5 m.
- Text on other screens: at least 4.5:1 (WCAG AA).
- Graphics that carry meaning, such as faint missed-strum arrows and chord diagram dots: at least 3:1 (WCAG non-text contrast). The dim color rises to meet this.
- Touch targets on the tablet: at least 48 px, following Material Design's 48 dp minimum.

### Rules that keep the interface consistent

1. Before writing a new component, check `src/ui/components`. A new shared component goes there too.
2. Colors, type sizes, spacing, radii and animation durations come from tokens. Components don't contain raw hex values or one-off pixel sizes.
3. Custom views (chord diagram, strum strip, tab view, song map) read the same tokens. SVG uses the CSS variables directly. Canvas code reads them with `getComputedStyle` when the theme changes.
4. Interactive custom views use React Aria hooks for press, keyboard and focus.
5. Dark theme first. shadcn's light theme stays in the code but isn't tuned or tested until a milestone needs it.
6. A change to one of these rules, or to a contrast or size rule above, gets a new decision note.

## Consequences

- Every screen and custom view draws from one token file, and new screens start from components already in the repo.
- The component code is the project's to change. Fixes shadcn ships later don't arrive on their own and have to be pulled in by hand.
- React Aria became a shadcn base in July 2026, so most community examples and paid block libraries still target Radix and Base UI. The app needs few components, so this costs little. If it gets in the way, the CLI can install the Base UI version of a component. Call sites of that component would change; tokens and custom views would not.
- The interface is tied to React. If [0005](0005-typescript-pwa.md) ends up with a different UI library, a new note supersedes this one.
- The prototype's muted and dim colors change in the rebuild to meet the contrast rules.

## Free resources

- Figma: shadcn/ui doesn't publish an official kit. Its docs list free community kits, including Obra shadcn/ui Community Edition (MIT) and the shadcncraft Free Starter Kit, which has Figma variables for all eight styles.
- Typography for long text (help pages, notes): shadcn/typeset, one CSS file copied into the project.

## Open items

1. Choose Maia or Luma after viewing both in shadcn/create with the dark tokens and a mock play screen.
2. Choose a font. Chord names at stage size need clear numerals, and clear ♯ and ♭ if the app displays those in place of `#` and `b`.
3. Check slider dragging and touch target sizes on an Android tablet.

Items 1 and 2 are settled in milestone 1, item 3 in milestone 6. Each result goes in that milestone's review.

## Sources

Checked on 2026-10-04.

- shadcn/ui changelog, Base UI as default and React Aria support: <https://ui.shadcn.com/docs/changelog>, <https://ui.shadcn.com/docs/changelog/2026-07-react-aria>
- shadcn/ui Figma kits: <https://ui.shadcn.com/docs/figma>
- Luma style: <https://ui.shadcn.com/docs/changelog/2026-03-luma>
- Maia and the other first five styles, described by Shadcnblocks (not affiliated with shadcn): <https://www.shadcnblocks.com/blog/shadcn-component-styles-vega-nova-maia-lyra-mira>
- React Aria interactions: <https://react-aria.adobe.com/>
- Radix maintenance since the WorkOS acquisition: <https://www.pkgpulse.com/guides/shadcn-ui-vs-base-ui-vs-radix-components-2026>
- Radix Themes releases: <https://radix-ui.com/themes/docs/overview/releases>
- Material UI supports Material Design 2: <https://mui.com/material-ui/getting-started/>
- Material UI 2024 plans for Material 3: <https://mui.com/blog/material-ui-2024-updates/>
- Material Web maintenance mode: <https://github.com/material-components/material-web/discussions/5642>
- React Spectrum S2 style overrides: <https://react-spectrum.adobe.com/styling>
