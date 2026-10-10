# 0023. Turn off React Doctor's score in CI

Status: Accepted
Date: 2026-10-08

Partly supersedes [0019](0019-react-doctor-in-ci.md), which expected that turning telemetry off kept React Doctor from sending anything out of CI.

## Context

0019 set `REACT_DOCTOR_NO_TELEMETRY`. The first runs on `main` still posted a commit status with "Score: 71/100". React Doctor's source (CLI 0.9.17, action v2.3.1) shows why:

- React Doctor's servers compute the score. Each scan sends its findings (rule, message, file path and line) to `https://www.react.doctor/api/score`. With them go the repo name, the commit, the default branch, the React version, the number of source files and details about the run.
- `REACT_DOCTOR_NO_TELEMETRY` turns off only the usage data (Sentry crash reports and Axiom traces). The score request is separate. The `--no-telemetry` flag turns off both, which is why local scans showed no score.
- Full scans also look up the app's direct dependencies in Socket.dev's public database, which sends their names and versions. Pull request scans skip this.

The repo is public, so these runs sent nothing secret. The docs still said nothing left CI.

## Options

- Turn off the score (`noScore: true`). No findings, repo name or commit go to React Doctor's servers. The commit status shows only the error and warning counts.
- Keep the score, and correct the docs. The score is one number from a formula on React Doctor's servers, and the counts already show the trend.
- Turn off the score and the Socket.dev check. Nothing leaves CI, but the check for risky dependencies goes too, and it sends only what `package.json` already shows.

## Decision

`app/doctor.config.jsonc` sets `noScore: true`. `REACT_DOCTOR_NO_TELEMETRY` stays in the workflow, because the config setting doesn't turn off the usage data. The Socket.dev check stays on.

## Consequences

- CI sends React Doctor's makers no findings, repo name or commit. Full scans on `main` send the dependency names and versions to Socket.dev.
- The commit status shows the error and warning counts, with no score.
- Local scans read the same config, so they have no score either. They still send usage data unless they run with `--no-telemetry`.
- A new React Doctor version could add other outside calls. Read its changes before moving the pinned commit.
