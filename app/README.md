# Song Practice: the app

The web app's code, tests and build setup. What the app is and why it exists is in the [main README](../README.md).

A TypeScript web app built with Vite and React, installable as a PWA. The interface uses [shadcn/ui](https://ui.shadcn.com) on React Aria Components with Tailwind CSS v4. Songs and settings are stored in IndexedDB.

## Run it

You need [Node.js](https://nodejs.org) 22 or later. Run every command from this folder.

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:8642>. It opens on Amazing Grace, a public domain hymn in 3/4 with easy open chords.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app with live reload |
| `npm run build` | Type-checks and builds the installable app into `dist/` |
| `npm run preview` | Serves the built app, offline support included |
| `npm test` | Unit tests for the chart format, theory, timeline, transport, storage, practice modes and theme contrast |
| `npm run test:e2e` | Browser tests in Chrome: the main flows, layout at zoom levels from 100% to 400%, and a 20-second timing check |
| `npm run test:timing` | The full two-minute timing check |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, without building |

In the browser console, `window.__practice.sync()` reports timing stats for the audio scheduler.

## Your own songs

To keep your own charts out of git, put them in `songs/personal.js` at the repo root, one level up from this folder. The `songs/` folder is git-ignored. The local dev and preview servers serve it, and a deployed build never includes it:

```js
window.PERSONAL_SONGS = [
  { id: 'my-song', chart: `title: My song
tempo: 90

[Verse 1] pattern=C
G | C | Em | D` },
];
```

Keep each `id` the same once you've used a song. The app saves your edits and tempos under it.

## The prototype

The single-file prototype in [`../prototype/`](../prototype/) works without any of this: open its `index.html` in a browser. `npm run dev` also serves it at <http://localhost:8642/prototype/>.

The prototype has a Download backup button in its editor. To bring what you saved there into the app, choose Import prototype backup in the app's menu. If you used the prototype from `http://localhost:8642`, the app imports it by itself the first time it opens.

## Code map

Data flows one way: song, then timeline, then audio and screen. The music and audio code has no React in it, so it can be tested on its own.

| Folder | What it holds |
|---|---|
| `src/core/` | The chart format, chords and voicings, patterns, and the timeline that turns a song and your settings into timed events |
| `src/audio/` | The Web Audio engine: a synthesized acoustic guitar, the click, and a lookahead scheduler |
| `src/practice/` | The transport: count-in, playback, loops and the speed trainer |
| `src/data/` | Storage, built-in songs, personal songs and the import from the prototype |
| `src/app/` | Connects the modules and holds the app's state |
| `src/ui/` | React screens and the shadcn components |
| `src/index.css` | The design tokens: colors, type sizes and spacing |
| `tests/e2e/` | Browser tests, including the timing check |

The [product brief's architecture section](../docs/product/product-brief.md#architecture) has the reasoning behind the modules. The [design system](../docs/design/design-system.md) describes the tokens and components.
