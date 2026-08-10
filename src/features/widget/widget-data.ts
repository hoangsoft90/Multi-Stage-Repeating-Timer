/**
 * Home-screen widget data (spec: android-widget) — pure mapping from the
 * timer snapshot to the props consumed by the widget layout. `null` input
 * maps to the idle state ("Mở LoopTimer" — no stale timer rendered).
 * Deterministic + unit-tested; no platform dependency.
 */
import type { TimerSnapshot } from '../../platform/types';

/** Source name of the home widget (expo-widgets interaction events). */
export const WIDGET_SOURCE = 'TimerWidget';
/**
 * Button targets of the home-widget actions (expo-widgets interaction).
 * `pause`/`resume` are INTENTIONALLY identical to the Live Activity targets
 * in activity-content.ts — the interaction handler matches on these shared
 * values regardless of source (sources disambiguate). Keep in sync.
 */
export const WIDGET_START_TARGET = 'start';
export const WIDGET_PAUSE_TARGET = 'pause';
export const WIDGET_RESUME_TARGET = 'resume';
export const WIDGET_STOP_TARGET = 'stop';

/**
 * Localized labels for the home-widget buttons + idle subtitle. The widget
 * extension has no i18n — the app passes translated strings through the
 * widget data (defaults keep the pure mapping self-contained for tests),
 * mirroring the Live Activity labels (activity-content.ts).
 */
export interface TimerWidgetLabels {
  /** Idle subtitle ("Open the app to start a routine"). */
  openApp: string;
  /** Idle quick-start button. */
  start: string;
  /** Pause button (running). */
  pause: string;
  /** Resume button (paused). */
  resume: string;
  /** Stop button (running or paused). */
  stop: string;
}

export const DEFAULT_WIDGET_LABELS: TimerWidgetLabels = {
  openApp: 'Open the app to start a routine',
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  stop: 'Stop',
};

export interface TimerWidgetData {
  status: TimerSnapshot['status'];
  presetName: string;
  stageName: string;
  remainingMs: number;
  round: number;
  totalRounds: number;
  /** Forever repeat → round label renders as `x / ∞`. */
  isForever: boolean;
  /**
   * Idle only (spec: android-widget R2): preset to quick-start on tap via
   * `looptimer:///?start=<id>`; '' → just open Home. Ignored while running.
   */
  quickStartPresetId: string;
  /** Localized control labels (i18n lives in the app; defaults for tests). */
  openAppLabel: string;
  startLabel: string;
  pauseLabel: string;
  resumeLabel: string;
  stopLabel: string;
}

/** Widget state when there is no active session (snapshot cleared). */
export const IDLE_WIDGET_DATA: Readonly<TimerWidgetData> = Object.freeze({
  status: 'idle',
  presetName: '',
  stageName: '',
  remainingMs: 0,
  round: 0,
  totalRounds: 1,
  isForever: false,
  quickStartPresetId: '',
  openAppLabel: DEFAULT_WIDGET_LABELS.openApp,
  startLabel: DEFAULT_WIDGET_LABELS.start,
  pauseLabel: DEFAULT_WIDGET_LABELS.pause,
  resumeLabel: DEFAULT_WIDGET_LABELS.resume,
  stopLabel: DEFAULT_WIDGET_LABELS.stop,
});

export function mapTimerSnapshotToWidgetData(
  snapshot: TimerSnapshot | null,
  quickStartPresetId = '',
  labels: TimerWidgetLabels = DEFAULT_WIDGET_LABELS,
): TimerWidgetData {
  const labelFields = {
    openAppLabel: labels.openApp,
    startLabel: labels.start,
    pauseLabel: labels.pause,
    resumeLabel: labels.resume,
    stopLabel: labels.stop,
  };
  if (!snapshot) {
    // Fresh object (never share the frozen singleton) carrying the suggested
    // preset for the idle quick-start deep link.
    return { ...IDLE_WIDGET_DATA, quickStartPresetId, ...labelFields };
  }
  return {
    status: snapshot.status,
    presetName: snapshot.presetName,
    stageName: snapshot.stageName,
    remainingMs: Math.max(0, snapshot.remainingMs),
    round: snapshot.round,
    totalRounds: snapshot.totalRounds,
    isForever: snapshot.isForever,
    quickStartPresetId: '',
    ...labelFields,
  };
}

/** MM:SS countdown label (hours folded into minutes — matches timer screen). */
export function formatWidgetMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Round label: `x / y`, or `x / ∞` for forever repeats. */
export function widgetRoundLabel(data: Pick<TimerWidgetData, 'round' | 'totalRounds' | 'isForever'>): string {
  return data.isForever ? `${data.round} / ∞` : `${data.round} / ${data.totalRounds}`;
}
