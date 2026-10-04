export const TEMPO_MIN = 40
export const TEMPO_MAX = 130
export const TRAINER_STEP_MIN = 1
export const TRAINER_STEP_MAX = 20

export const clampTempo = (bpm: number): number =>
  Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, Math.round(bpm)))

export const clampTrainerStep = (n: number): number =>
  Math.max(TRAINER_STEP_MIN, Math.min(TRAINER_STEP_MAX, Math.round(n)))

/** The speed trainer's tempo for the next loop pass. */
export function nextPassTempo(
  tempo: number,
  trainer: { on: boolean; step: number; target: number }
): number {
  if (!trainer.on || tempo >= trainer.target) return tempo
  return Math.min(trainer.target, tempo + trainer.step)
}
