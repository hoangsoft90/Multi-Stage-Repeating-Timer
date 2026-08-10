/**
 * Live Activity content state (spec: live-activity) — pure mapping from the
 * timer snapshot to the props rendered by the iOS Live Activity layout.
 * Deterministic + unit-tested; no platform dependency.
 */
import type { TimerSnapshot } from '../../platform/types';

/** Source name of the Live Activity (expo-widgets interaction events). */
export const ACTIVITY_SOURCE = 'TimerActivity';
/** Button targets of the Live Activity controls (expo-widgets interaction). */
export const ACTIVITY_PAUSE_TARGET = 'pause';
export const ACTIVITY_SKIP_TARGET = 'skip';
export const ACTIVITY_RESUME_TARGET = 'resume';

/**
 * Localized labels for the Live Activity control buttons. The widget
 * extension has no i18n — the app passes translated strings through the
 * content state (defaults keep the pure mapping self-contained for tests).
 */
export interface TimerActivityLabels {
  pause: string;
  skip: string;
  resume: string;
}

export const DEFAULT_ACTIVITY_LABELS: TimerActivityLabels = {
  pause: 'Pause',
  skip: 'Skip',
  resume: 'Resume',
};

export interface TimerActivityContent {
  presetName: string;
  stageName: string;
  remainingMs: number;
  round: number;
  totalRounds: number;
  /** Forever repeat → round renders as `x / ∞`. */
  isForever: boolean;
  /** Upcoming stage name ('' when the session is on its last stage). */
  nextStageName: string;
  status: TimerSnapshot['status'];
  /** Control button labels (localized by the app via i18n). */
  pauseLabel: string;
  skipLabel: string;
  resumeLabel: string;
}

export function snapshotToActivityContent(
  snapshot: TimerSnapshot,
  labels: TimerActivityLabels = DEFAULT_ACTIVITY_LABELS,
): TimerActivityContent {
  return {
    presetName: snapshot.presetName,
    stageName: snapshot.stageName,
    remainingMs: Math.max(0, snapshot.remainingMs),
    round: snapshot.round,
    totalRounds: snapshot.totalRounds,
    isForever: snapshot.isForever,
    nextStageName: snapshot.nextStageName,
    status: snapshot.status,
    pauseLabel: labels.pause,
    skipLabel: labels.skip,
    resumeLabel: labels.resume,
  };
}
