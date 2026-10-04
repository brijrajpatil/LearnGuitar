# 0005. Rebuild as a TypeScript PWA

Status: Accepted
Date: 2026-10-04

## Context

The prototype is one 2,000-line HTML file with no tests (see [0002](0002-single-file-prototype.md)). The plan adds a song library, lyrics, lead parts, a mixer, progress tracking and recording. The app has to run on a Mac and an Android tablet, and later for people who aren't me.

The prototype's Web Audio scheduler already keeps time well: zero drift and no late events over two-minute runs at 70 and 103 BPM.

## Options

- Keep extending the single file. Fastest today, and harder to change safely with every feature.
- Native apps, one for macOS and one for Android. Two codebases, and the audio engine written twice.
- A cross-platform framework such as Flutter or React Native. One codebase, but its own audio code, and the working Web Audio engine is thrown away.
- A TypeScript web app, installable as a PWA. One codebase for both devices, and it keeps the Web Audio engine.

## Decision

A TypeScript PWA built with Vite and React, tested with Vitest and Playwright. The music and audio code is plain TypeScript with no React imports, so the UI library can change without touching it. If the app later needs a desktop window or direct file access, it can be wrapped with Tauri, which builds for macOS and Android.

## Consequences

- One codebase for the Mac and the tablet.
- Anyone can try the app from a link, with nothing to install. This matters for future users and for people reviewing the repo.
- A PWA installs on another device only over HTTPS, so the tablet needs hosting (GitHub Pages is the proposal in [0004](0004-public-repo-and-future-users.md)).
- The project gains a build step and dependencies, which the prototype avoided.
- Browser audio input latency limits how precise strum timing feedback can be. That feature has its own test before it's built.
