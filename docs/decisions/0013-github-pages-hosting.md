# 0013. Host the app on GitHub Pages, from the LearnGuitar repo

Status: Accepted
Date: 2026-10-04

Decides what [0004](0004-public-repo-and-future-users.md) and [0005](0005-typescript-pwa.md) proposed for hosting, and answers the brief's hosting question.

## Context

The app is a static site. `npm run build` writes HTML, JavaScript, CSS, fonts and icons to `app/dist`, and songs and settings stay in the browser's IndexedDB. There is no server and no login, so any static host can serve it.

A PWA installs on another device only over HTTPS, and the Android tablet needs that. People reviewing the repo need a link to try the app without installing anything. The repo was local only, with no remote.

## Options

- GitHub Pages. Free for public repos, HTTPS, and the code, the CI and the live app are in one place. A project site lives under a path (`/LearnGuitar/`), and every project site on the account shares one origin.
- Cloudflare Pages. Free, with its own subdomain and preview links for branches. It needs a second account, and its main advantage over Pages, hosting from a private repo, doesn't apply to a repo meant to be read.
- Netlify or Vercel. Both work, but neither adds anything here, and Vercel's free plan is for non-commercial use only.

## Decision

The app is hosted on GitHub Pages at <https://brijrajpatil.github.io/LearnGuitar/>, from the public repo `brijrajpatil/LearnGuitar`.

The workflow in `.github/workflows/deploy.yml` runs on every pull request and every push to `main`: lint, typecheck, unit tests, the browser tests and the build. Pushes to `main` then publish `app/dist` to Pages. The timing test runs only on a real computer, because shared CI machines are too uneven for it.

The repo is named LearnGuitar, so that's the demo URL. The app's own name is still open, and it still calls itself Song Practice.

## Consequences

- Anything merged into `main` goes live once the checks pass. Work that isn't ready stays on a branch.
- The vite config's `base: "./"` makes the build work under `/LearnGuitar/` with no other changes. The service worker's scope is that path.
- The live app saves to its own browser storage, apart from `http://localhost:8642`. Songs saved locally don't appear there. Personal songs from `songs/` load only on localhost, so a deployed build never has them. Moving songs between devices needs the import and export planned for milestone 2.
- Renaming the repo changes the URL and breaks the old link. Saved data survives, because every project site on `brijrajpatil.github.io` shares one origin.
- Sharing that origin also means any other project site on the account could read the app's storage. That's acceptable while all of them are mine.
