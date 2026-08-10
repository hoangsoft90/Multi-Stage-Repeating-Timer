/**
 * Timer snapshot (spec: home-widget) — an immutable DTO describing the current
 * timer state, consumed by home-screen widgets and Live Activities. Built by a
 * pure function so it's deterministic and unit-testable without a platform.
 */
import type { EngineState } from '../../core/timer/engine';
import type { TimerSession } from '../../core/timer/models';
import type { TimerSnapshot } from '../../platform/types';

/**
 * Build a widget snapshot from engine state + session + the preset display
 * name (the session model only stores presetId). Pure, no I/O.
 */
export function buildTimerSnapshot(
  state: EngineState,
  session: TimerSession | null,
  presetName: string,
): TimerSnapshot | null {
  if (!session) return null;
  const totalRounds =
    state.totalRounds === Infinity || state.totalRounds <= 0 ? 1 : state.totalRounds;
  return {
    presetId: session.presetId,
    presetName: presetName || session.presetId,
    stageName: state.currentStage?.name ?? '',
    stageIndex: state.currentStageIndex,
    totalStages: session.stagesSnapshot.length,
    round: state.currentRound,
    totalRounds,
    remainingMs: state.remainingMs,
    stageEndsAt: state.stageEndsAt ?? null,
    status: state.status,
    // v1.4 (spec: live-activity) — next stage + forever flag for widget/Live
    // Activity layouts (totalRounds above is normalized to 1 for Infinity).
    nextStageName: state.nextStage?.name ?? '',
    isForever: state.totalRounds === Infinity,
  };
}
