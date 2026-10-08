# 0022. One instruction file for every AI coding tool

Status: Accepted
Date: 2026-10-08

Changes the `CLAUDE.md` row of [0012](0012-repo-layout.md)'s repo layout: the working notes for AI tools are in `AGENTS.md` now.

## Context

The app is built with AI coding tools. Until now the project's rules for them (keep the docs current, the content rules, how to run the checks, ask before committing) were in `CLAUDE.md`, which only Claude Code reads. Other working knowledge, such as how several sessions share the repo and the traps in worktrees and browser tests, was only in Claude's private notes on the owner's Mac.

The owner wants to use other tools too, starting with Google Antigravity and OpenAI Codex. On 2026-10-08 the tools read these files:

| Tool | Project file it reads |
|---|---|
| Codex | `AGENTS.md`, from the repo root down to the working folder |
| Antigravity (2.21.1 here) | `AGENTS.md` (since 1.20.3) and `GEMINI.md` |
| Gemini CLI | `GEMINI.md` by default, which can pull in other files with `@file` |
| Claude Code | `CLAUDE.md`. It reads `AGENTS.md` only when there's no `CLAUDE.md`, and `CLAUDE.md` can pull it in with `@AGENTS.md` |
| Copilot | The coding agent reads `AGENTS.md`. Copilot Chat on GitHub and in some IDEs reads only `.github/copilot-instructions.md` |
| Cursor | `AGENTS.md` |

## Options

- A full copy of the rules in each tool's file. Every tool reads its own file, but the copies drift apart as soon as one is edited.
- One file, with symlinks under each tool's name. No drift, but symlinks break on Windows checkouts and show up oddly on GitHub.
- `AGENTS.md` as the one file, with each tool's own file pointing to it, pulling it in where the tool can.

## Decision

`AGENTS.md` at the repo root holds all the rules for AI tools. It takes over everything `CLAUDE.md` had, and adds what lived only in Claude's notes: how the owner likes to work (plan first, mockups for design choices, ask before committing and pushing), how to work alongside other sessions, the worktree and test traps, and the writing style the docs follow.

The other files only point to it:

- `CLAUDE.md` starts with `@AGENTS.md`, so Claude Code loads the rules whatever its settings.
- `GEMINI.md` tells the tool to follow `AGENTS.md` and pulls it in with `@./AGENTS.md`, which Gemini CLI expands.
- `.github/copilot-instructions.md` repeats the rules that matter most, since Copilot Chat can't pull in another file, and points to `AGENTS.md` for the rest.

The owner's personal preferences, such as how they like explanations, stay out of the repo. Each tool has a user-level file for them (`~/.gemini/GEMINI.md` for Antigravity and Gemini CLI, `~/.codex/AGENTS.md` for Codex, `~/.claude/CLAUDE.md` for Claude Code).

## Consequences

- Any of these tools can work on the project with the same rules, and a rule changes in one place.
- `.github/copilot-instructions.md` repeats a few rules, so it has to change when they do. `AGENTS.md` says so in its docs table.
- Tool support for `AGENTS.md` is new and still changing. The table above records what was checked on 2026-10-08, and this setup should be checked again when a tool changes how it reads instructions.
- Contributors who don't use AI tools can skip these files. People reviewing the repo can read `AGENTS.md` to see how the project is built with AI.
