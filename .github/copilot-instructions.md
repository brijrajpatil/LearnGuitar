# Song Practice

The full rules for AI tools are in `AGENTS.md` at the repo root. Read it before making changes. These are the ones that matter most:

- Plan before any change bigger than a small fix, and wait for the owner's approval. Ask before committing, and again before pushing: a push to `main` goes live on GitHub Pages.
- Lyrics, tabs, record figures and cue text are only what the player types into the app. Never fetch, generate or copy them into the app, the repo or the docs. Built-in songs have chords only.
- The app is in `app/`. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` there before saying a change works.
- Update the docs in the same change as the code: `CHANGELOG.md`, and the README, brief, design system or a decision note when the change touches them.
- Keep the chart format backwards compatible, and never change a song's id.
- Use the design tokens in `app/src/index.css`, sizes in rem and the monochrome theme. No new colors without a decision note.
- Several AI sessions work in this repo at once. Work on your own branch, and commit only your own changes.
