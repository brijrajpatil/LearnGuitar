# Song Practice: working notes for Claude

A guitar practice app for learning songs from easy chords up to the recorded version. Read `docs/product/product-brief.md` before any product or architecture decision.

## Who reads this repo

The repo is public on GitHub. Weigh every decision for three readers:

1. The owner, who practises with the app every day. This is the user the app is built for first.
2. Future users: other self-taught guitarists. Features must not depend on the owner's own gear, songs or devices.
3. People reviewing the repo, such as hiring managers. They read the README, the docs and the commit history to see how the product was framed, decided and built.

## Keep the docs current

Update the docs in the same change as the code. A change is not done until its docs are.

| When you change | Update |
|---|---|
| Anything a user can see or do | `CHANGELOG.md` under Unreleased, and the README's feature list if it changes what the app does |
| Scope, goals, users, principles or milestones | `docs/product/product-brief.md`, plus a line in its decision log |
| A choice with alternatives worth remembering (stack, data format, storage, a scope cut) | A new note in `docs/decisions/`, and add it to the index there with its area (product, design or tech) |
| Tokens, shared components or the play screen's layout | `docs/design/design-system.md`, and its screenshots in `docs/design/images/` when the screen changes visibly |
| Milestone status | The status line in the README and the milestone list in the brief |
| The end of a milestone | A review in `docs/product/reviews/`, using the template there |
| How to run, build or test | `app/README.md`, the README's "Run it" quick start if the first steps change, and the Code section here |
| The chart format | The in-app help in the editor, and the README example |

Never rewrite an accepted decision note. Write a new one that supersedes it, and mark the old one superseded.

## Content rules

- Lyrics, tabs and record figures are only what the owner types into the app. Never fetch, generate or copy them from websites into the app, the repo or the docs.
- Song files with lyrics, tabs or record figures stay out of the repo. They go in `songs/`, which is git-ignored. The owner's charts, starting with Let Down, are in `songs/personal.js`.
- Songs built into the app ship to everyone, so they are public domain songs with chords only, with no lyrics or tabs (see `docs/decisions/0006-public-domain-demo-song.md`).
- No personal data in the repo beyond what the owner chose to put in the brief.

## Code

- The app is in `app/`, and npm commands run from there. Code paths in this section (`src/`, `tests/`) are inside `app/`. The repo layout is in `docs/decisions/0012-repo-layout.md`.
- The app is a TypeScript PWA built with Vite and React, in `src/`. The brief's Architecture section describes the modules. `src/core`, `src/audio` and `src/practice` never import React or anything from `src/ui`.
- The single-file prototype is in `prototype/index.html`. Leave it as it is, apart from fixes the owner asks for, until milestone 1's review retires it.
- Follow the design system in `docs/design/design-system.md`. Decisions 0001, 0009, 0010 and 0011 in `docs/decisions/` have the reasons behind it. Shared components are in `src/ui/components` (shadcn, Luma style, React Aria base). Colors, stage type sizes and spacing are tokens in `src/index.css`. Components contain no raw hex values or one-off pixel sizes.
- The theme is monochrome. Emphasis (`bg-emphasis`) means "now" or "progress" and nothing else, and red (`destructive`) means an error or a destructive action. Don't add colors: color comes back through the `--emphasis` tokens, with a new decision note first.
- Size everything in rem, never `vh` or px font sizes, so browser zoom works. The one exception is the app shell's height (`h-dvh`), which makes the play screen fit the window. Window-height variants (`fit`, `short`, `roomy`) are in `src/index.css`. `npm test` checks the theme's contrast. `tests/e2e/layout.spec.ts` checks zoom levels and window sizes, including Chrome's page area on real laptops, and that laptop-sized windows show everything without scrolling. Both must pass.
- Add shadcn components with `npx shadcn@latest add <name>`. Variants the app needs go into the copied component file.
- Keep the chart text format backwards compatible. Songs already saved must keep loading.
- The app stores edits, tempos and pattern choices per song id in IndexedDB. Never change or drop a song's id, or the owner loses that data.
- `npm run dev` serves the app at `http://localhost:8642`, with `songs/` and the prototype (at `/prototype/`) from the repo root. `npm test` runs the unit tests, `npm run test:e2e` the browser tests (flows, layout and timing), `npm run lint` and `npm run typecheck` the checks. Run all four before saying a change works.
- `.github/workflows/deploy.yml` runs lint, typecheck, the unit tests, the browser tests (without the timing test) and the build on every pull request and every push to `main`. Pushes to `main` deploy to GitHub Pages at <https://brijrajpatil.github.io/LearnGuitar/>, so anything merged into `main` goes live. See `docs/decisions/0013-github-pages-hosting.md`.
- In the browser console, `window.__practice.sync()` reports timing stats for the audio scheduler.

## Commits

- Small commits, one change each.
- Subject in the imperative, under 72 characters ("Add gap click to practice tools"). Body says why when it isn't obvious.
- Ask before committing or pushing.
