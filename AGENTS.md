# Song Practice: instructions for AI coding tools

A guitar practice app for learning songs from easy chords up to the recorded version. Read `docs/product/product-brief.md` before any product or architecture decision.

These are the project's rules for every AI coding tool: Codex, Antigravity, Gemini CLI, Claude Code, Copilot, Cursor and others. The tool-specific files only point here (see "Files for each tool" at the end). Put new rules in this file.

## Who reads this repo

The repo is public on GitHub. Weigh every decision for three readers:

1. The owner, who practises with the app every day. This is the user the app is built for first.
2. Future users: other self-taught guitarists. Features must not depend on the owner's own gear, songs or devices.
3. People reviewing the repo, such as hiring managers. They read the README, the docs and the commit history to see how the product was framed, decided and built.

## Working with the owner

- Plan before any change bigger than a small fix. Write the plan in plain words, with what you'll change and how you'll check it, and wait for the owner's approval.
- Some design choices are the owner's to make, such as how a screen looks or which controls a feature has. Show two or three mockups and ask before building.
- Ask before committing, and ask again before pushing. A push to `main` puts the change on the live site.
- When you report back, say what changed, which checks ran and what they showed, and what's left. Say so plainly when a check failed or was skipped.

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
| How to run, build or test | `app/README.md`, the README's "Run it" quick start if the first steps change, and the Code section of this file |
| The chart format | The in-app help in the editor, and the README example |
| How AI tools should work here | This file. Also `.github/copilot-instructions.md` when you change a rule it repeats |

Never rewrite an accepted decision note. Write a new one that supersedes it, and mark the old one superseded.

## Content rules

- Lyrics, tabs, record figures and cue text are only what the player types into the app. Never fetch, generate or copy them from websites into the app, the repo or the docs. The one exception is adding a song with AI, which drafts chords only, when the player asks, with the player's own key, and keeps them on their device (`docs/decisions/0017-ai-chord-drafts.md`). Its tests use made-up words and public domain chords.
- Song files with lyrics, tabs or record figures stay out of the repo. They go in `songs/`, which is git-ignored. The owner's charts, starting with Let Down, are in `songs/personal.js`.
- Songs built into the app ship to everyone, so they are progression studies or public domain songs, with chords only and no lyrics or tabs. The public domain rule and what else is left out are in `docs/decisions/0015-built-in-library-contents.md`. The library is in `app/src/data/library/`.
- No personal data in the repo beyond what the owner chose to put in the brief.

## Code

- The app is in `app/`, and npm commands run from there. Code paths in this section (`src/`, `tests/`) are inside `app/`. The repo layout is in `docs/decisions/0012-repo-layout.md`.
- The app is a TypeScript PWA built with Vite and React, in `src/`. The brief's Architecture section describes the modules. `src/core`, `src/audio`, `src/practice` and `src/ai` never import React or anything from `src/ui`.
- Match the code around you. The repo has a Prettier config, but the code isn't formatted with it and uses long lines, so don't run Prettier over files you change.
- The single-file prototype is in `prototype/index.html`. Leave it as it is, apart from fixes the owner asks for, until milestone 1's review retires it.
- Follow the design system in `docs/design/design-system.md`. Decisions 0001, 0009, 0010 and 0011 in `docs/decisions/` have the reasons behind it. Shared components are in `src/ui/components` (shadcn, Luma style, React Aria base). Colors, stage type sizes and spacing are tokens in `src/index.css`. Components contain no raw hex values or one-off pixel sizes.
- The theme is monochrome. Emphasis (`bg-emphasis`) means "now" or "progress" and nothing else, and red (`destructive`) means an error or a destructive action. Don't add colors: color comes back through the `--emphasis` tokens, with a new decision note first.
- Size everything in rem, never `vh` or px font sizes, so browser zoom works. The one exception is the app shell's height (`h-dvh`), which makes the play screen fit the window. Window-height variants (`fit`, `short`, `roomy`) are in `src/index.css`. `npm test` checks the theme's contrast. `tests/e2e/layout.spec.ts` checks zoom levels and window sizes, including Chrome's page area on real laptops, and that laptop-sized windows show everything without scrolling. Both must pass.
- Add shadcn components with `npx shadcn@latest add <name>`. Variants the app needs go into the copied component file.
- Keep the chart text format backwards compatible. Songs already saved must keep loading.
- The app stores edits, tempos and pattern choices per song id in IndexedDB. Never change or drop a song's id, or the owner loses that data.
- `npm run dev` serves the app at `http://localhost:8642`, with `songs/` and the prototype (at `/prototype/`) from the repo root. `npm test` runs the unit tests, `npm run test:e2e` the browser tests (flows, layout and timing), `npm run lint` and `npm run typecheck` the checks. Run all four before saying a change works.
- `.github/workflows/deploy.yml` runs lint, typecheck, the unit tests, the browser tests (without the timing test) and the build on every pull request and every push to `main`. Pushes to `main` deploy to GitHub Pages at <https://brijrajpatil.github.io/LearnGuitar/>, so anything merged into `main` goes live. See `docs/decisions/0013-github-pages-hosting.md`.
- `.github/workflows/react-doctor.yml` runs React Doctor on every pull request and every push to `main`, with telemetry off. It comments on new issues and never fails the check. Read each finding against the code before fixing it: none of the first scan's 23 warnings was a real bug. See `docs/decisions/0019-react-doctor-in-ci.md`.
- In the browser console, `window.__practice.sync()` reports timing stats for the audio scheduler. `window.__practice.state` and `window.__practice.view` show the app's state and the playhead, which browser tests read too.

## Working alongside other agents

Several AI sessions, sometimes from different tools, work in this repo at the same time. The main folder may hold another session's branch and uncommitted files.

- Leave other sessions' work alone. Don't switch the main folder's branch, and commit only your own changes.
- Start each change on its own branch from `main`, in its own git worktree under `.claude/worktrees/` (git ignores that folder in this clone). Then unset the branch's upstream, so a plain `git push` can't go to `main`:

  ```bash
  git fetch origin
  git worktree add .claude/worktrees/my-change -b my-change origin/main
  git -C .claude/worktrees/my-change branch --unset-upstream
  ```

- Don't use a bare `git stash`. Every worktree shares one stash, so you could take another session's changes. Make a temporary commit instead.
- Before writing a decision note, check the next free number on `origin/main` (`git ls-tree --name-only origin/main docs/decisions/`). If another branch took the same number first, renumber yours.
- When your branch is merged, ask the owner before removing its worktree and branch.

## Worktrees and tests

- A new worktree has no `node_modules`. Copy the main folder's from the worktree root with `cp -Rc ../../../app/node_modules app/node_modules` (`-c` makes fast copies on macOS). Don't use a symlink: Vite won't serve the Geist font through one, so pages and layout tests render with the wrong font.
- `songs/` is git-ignored, so a worktree doesn't have it. Link it from the worktree root when you need the owner's songs: `ln -s ../../../songs songs`.
- The browser tests reuse any server already on port 8642, which may be another session's older code. When another dev server could be running, run them with your own Playwright config that starts this worktree's server on a free port, such as 8651, with `reuseExistingServer: false`. Keep that config out of the repo.
- Personal songs in `songs/personal.js` load only on localhost, through the dev server. The live site doesn't have them. The owner's practice data, including their Let Down edits and lyrics, lives in their browser's storage for `http://localhost:8642`. Never clear it.
- Saves finish a moment after the screen changes: settings 200 ms after a change, and songs and charts once IndexedDB has written them. A browser test that reloads waits for the save first, with `stored()` from `tests/e2e/helpers.ts`, or a short wait for settings.
- A browser test that plays music waits for real time. A new song plays at 70 BPM, whatever the chart's tempo, and CI machines can be slower, so give playback waits room and poll often.

## Writing style

Docs, commit messages and the app's text follow these rules. They're adapted from the owner's writing rules, which draw on [blader/humanizer](https://github.com/blader/humanizer) (MIT) and Wikipedia's [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

- Lead with the point. Use common words, active voice and short sentences, one idea each. Use one term per concept.
- State things directly. No "not X but Y" contrasts, no one-line closers that restate the paragraph, and no run-ups such as "Let's dive in" or "Here's the thing".
- No em or en dashes as punctuation. Use a period, comma, colon or parentheses. Dashes in code, paths and commands are fine.
- No inflated or sales words, such as crucial, robust, seamless, leverage, showcase, pivotal or vibrant. Write "is" where "serves as" or "stands as" creeps in.
- Use three items in a list only when there are three things.
- Headings in sentence case, with no emoji. Bold only for a real warning or a term being defined, not as a label on every list item. Straight quotes.
- Describe how things work now. History belongs in `CHANGELOG.md` and the decision notes.
- Name real sources. Hedge only when the evidence calls for it, and never present a guess as a fact.
- Keep exact identifiers, commands, paths and quotes unchanged.

## Commits

- Small commits, one change each.
- Subject in the imperative, under 72 characters ("Add gap click to practice tools"). Body says why when it isn't obvious.
- Ask before committing or pushing.
- Commits are made as the owner, Brijraj Patil (git is already set up with that name). End the message with a `Co-Authored-By:` line that names the AI tool and model that wrote the change.

## Files for each tool

| File | Read by | What it holds |
|---|---|---|
| `AGENTS.md` | Codex, Antigravity, Cursor, the Copilot coding agent and other tools that follow the AGENTS.md convention | All the rules |
| `CLAUDE.md` | Claude Code | `@AGENTS.md`, which pulls this file in |
| `GEMINI.md` | Gemini CLI and Antigravity | A pointer here, and `@./AGENTS.md`, which pulls this file into Gemini CLI |
| `.github/copilot-instructions.md` | Copilot Chat on GitHub and in IDEs | The rules that matter most, and a pointer here |

The owner's personal preferences, such as how they like things explained, live in each tool's own user-level file, outside the repo. The reasons for this setup are in `docs/decisions/0022-one-instruction-file-for-ai-tools.md`.
