# 0020. A loop button and a speed-up switch, and speed typed in BPM or %

Status: Accepted
Date: 2026-10-08

Supersedes the session modes in [0009](0009-birch-light-theme-and-session-modes.md). 0009's speed readout ("70 BPM, 88% of the record") and its quick picks stand.

## Context

0009 put three practice modes in the header: Learn a section, Build speed and Play the song. After using them, the owner saw no point in the switch.

Under the hood the modes set two things: whether the current section loops, and whether the speed goes up each time through the loop. Learn a section and Build speed looked almost the same on screen, and the song map already looped a section with one click. So the switch was a second way to do something the screen already did, plus one setting.

The owner also wanted to type the speed, in BPM or as a share of the record. The popover only had a slider and four quick picks, so 85% of the record couldn't be set. And when a chart had no `tempo:` line, there was no way to give the record's speed without editing the chart.

The owner chose from mockups and answered two questions.

## Options

For the modes:

- A. A loop button beside Play, which shows the section it loops, and speeding up as a switch in the Speed popover. The song map keeps looping sections.
- B. The loop button only, without speeding up. The speed goes up only by hand.
- C. A plain Loop on/off button beside Play instead of a button that names the section.

For speed:

- Type the playing speed in BPM or %, and set the record's speed from the same popover.
- Type the playing speed only, and keep the record's speed in the chart.
- Set the record's speed only.

The owner chose A and both parts of speed.

## Decision

### Loop and speed-up

- The header's mode switch and its How to practise note are gone.
- The transport bar has a loop button between the section skips and Speed. Off, it reads "Loop section". On, it reads "Looping Verse 1" with an x, on `--tint` with a dark border like the looped section in the song map. The song map's section names and the L key do the same.
- The Speed popover has a "Speed up each time through the loop" switch with the start, goal and step from Build speed. Turning it on starts from the speed you're at. While a section loops with the switch on, the transport bar shows the progress bar Build speed had. With the switch on and nothing looping, the popover says it works while a section loops.
- Settings store `loop` and `speedUp` in place of `mode`. Saved settings convert on load: Learn a section becomes loop on, Build speed becomes loop and speed-up on, and Play the song both off. New players still start with nothing looping.

### Typed speed

- The Speed popover has a number box with a BPM or % of record switch. The % box works out the BPM from the record's speed. The app plays 40 to 130 BPM, so a number outside that stops at the limit and the popover says so.
- The readout in the transport bar shows the unit you type in first ("85%" over "of the record, 68 BPM"), and the unit is saved in the settings.
- "Record's speed (BPM)" in the same popover sets the chart's `tempo:` line, or adds one after the chart's settings, and saves the chart. Playback goes on. If the editor has unsaved changes, they get the same tempo line. Without a record speed, the % switch is hidden and the field says why to set it.

## Consequences

- The header has room again, so it no longer needs its own width rules to fit the mode switch.
- The loop is visible beside Play, where the eye goes when starting a run, and it names the section, so it's clear what will repeat.
- The play screen's practice steps (learn a section slowly, build speed, play it through) are no longer spelled out on screen. The Speed popover keeps a one-line tip, and the brief keeps the steps.
- The chart stays the one place a song's facts live: the record's speed typed in the popover shows up in the editor and in exported charts.
- Records faster than 130 BPM can't be played at full speed yet. Raising the limit is a separate change.
