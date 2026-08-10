/**
 * CoverageCalculator (spec: background-scheduling — iOS coverage warning).
 * Pure TS: estimatedCoverage = sum of durations of the next N stage
 * transitions (N = max_scheduled_transitions_ios, default 50).
 */
import { Preset } from '../../core/timer/models';

export function estimatedCoverageMs(preset: Pick<Preset, 'stages' | 'repeatMode' | 'fixedCount'>, maxTransitions = 50): number {
  const stages = preset.stages;
  if (stages.length === 0) return 0;

  let totalMs = 0;
  let transitions = 0;
  const rounds = preset.repeatMode === 'fixedCount' ? (preset.fixedCount ?? 1) : Infinity;

  outer: for (let round = 1; round <= rounds; round++) {
    for (const s of stages) {
      totalMs += s.durationSeconds * 1000;
      transitions += 1;
      if (transitions >= maxTransitions) break outer;
    }
  }
  return totalMs;
}

/** Heuristic: does the preset need more than `maxTransitions` before finishing? */
export function exceedsNotificationWindow(preset: Pick<Preset, 'stages' | 'repeatMode' | 'fixedCount'>, maxTransitions = 50): boolean {
  const totalStages = preset.stages.length;
  const rounds =
    preset.repeatMode === 'once' ? 1 : preset.repeatMode === 'fixedCount' ? (preset.fixedCount ?? 1) : Infinity;
  return totalStages * rounds > maxTransitions;
}
