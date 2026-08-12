/**
 * Timer store (Zustand) — the ONLY gateway between UI and TimerEngine.
 *
 * Responsibilities:
 * - start/pause/resume/skip/stop (UI never mutates engine state directly)
 * - subscribe engine events → persist session snapshot to SessionRepo ONLY
 *   at transitions (never on UI ticks)
 * - restore + reconcile on cold start → expose recovery info for the
 *   "Continue where you left off?" dialog
 * - a 250ms tick while RUNNING refreshes remaining for rendering (no persist)
 */
import { create } from 'zustand';
import { EngineState, TimerEngine } from '../../core/timer/engine';
import { Preset, RepeatMode, Stage, TimerSession } from '../../core/timer/models';
import { SessionLogRepo, SessionRepo, PersistedSession } from '../../core/storage/repos';
import {
  adManager,
  att,
  audio,
  haptics,
  liveActivity,
  observability,
  remoteConfig,
  scheduler,
  speech,
  wakeLock,
  widgetBridge,
} from '../../platform';
import { buildTimerSnapshot } from '../widget/timer-snapshot';
import { currentStreak } from '../stats/stats';
import { t } from '../../i18n';
import { useSettingsStore } from '../settings/settings-store';
import { usePresetsStore } from '../presets/presets-store';
import { useRoutineStore } from '../routine/routine-store';
import { BUILTIN_TEMPLATES } from '../../core/templates';
import { requestExactAlarmPermissionJustInTime, requestNotificationPermissionOnFirstTimer } from '../background/permissions';

export interface RecoveryInfo {
  /** True when a session is active that the user must choose about. */
  pending: boolean;
  /** True when reconcile found the whole sequence already finished. */
  completedWhileAway: boolean;
  stageName: string;
  remainingMs: number;
}

/** Info shown by the completion celebration dialog (v1.2). */
export interface CompletionInfo {
  presetId: string;
  presetName: string;
  durationMs: number;
  streak: number;
  /** Id of the finished session-log entry — lets the dialog attach mood/note. */
  sessionId: string;
  /** Snapshot of the finished session — lets a quick routine be saved as a preset. */
  stages?: Stage[];
  repeatMode?: RepeatMode;
  fixedCount?: number | null;
}

interface TimerState {
  engine: TimerEngine;
  state: EngineState;
  recovery: RecoveryInfo | null;
  /** Set once when a session completes naturally (SessionCompleted). */
  completion: CompletionInfo | null;
  lastEventType: string | null;
  /** Repeat context of the restored session (used by recovery Restart). */
  restoreRepeat: { repeatMode: string; fixedCount?: number | null } | null;

  initFromStorage: () => Promise<void>;
  startPreset: (preset: Preset) => Promise<void>;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => Promise<void>;
  resolveRecovery: (choice: 'resume' | 'restart' | 'dismiss') => void;
  dismissCompletion: () => void;
  /** Called every tick — refreshes rendering state, never persists. */
  tick: () => void;
}

const sessionRepo = new SessionRepo();
const sessionLogRepo = new SessionLogRepo();

/**
 * Routine reminders must survive timer activity: scheduler.cancelAll() wipes
 * EVERY scheduled notification (including routine_* ids), so re-schedule the
 * enabled routines right after each cancel. Best-effort + no-throw.
 */
async function cancelAllKeepRoutines(): Promise<void> {
  await scheduler.cancelAll();
  await useRoutineStore.getState().rescheduleAll().catch(() => {});
}

/**
 * Fallback preset display name for the current session. The authoritative
 * name comes from `presetNameFor` (presets store / templates); this only
 * backs unknown/restored presets that aren't in either.
 */
let lastStartedPresetName = 'Timer';

/** Repeat context of the last started preset (for quick-session save-as). */
let lastStartedRepeat: { repeatMode: RepeatMode; fixedCount?: number | null } = {
  repeatMode: 'once',
  fixedCount: null,
};

/**
 * Pre-stage warnings (v1.1): fire once per stage when remaining crosses the
 * 30s / 10s thresholds from above, so the user gets an audio/haptic heads-up.
 * Keyed by the stage's absolute end timestamp; cleared on stage start.
 */
const lastRemainingByEnd = new Map<number, number>();

function buildEngine(): TimerEngine {
  return new TimerEngine();
}

export const useTimerStore = create<TimerState>((set, get) => {
  const engine = buildEngine();
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  const startTicker = () => {
    if (tickHandle) return;
    tickHandle = setInterval(() => {
      // Reconcile first so stage transitions still happen while UI is open.
      engine.reconcile();
      set({ state: engine.getState() });
    }, 250);
  };

  const stopTicker = () => {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  };

  const persistSession = async (repeat?: { repeatMode: string; fixedCount?: number | null }) => {
    const session = engine.getSession();
    if (!session) return;
    const persisted: PersistedSession = {
      session,
      repeatMode: (repeat?.repeatMode as PersistedSession['repeatMode']) ?? 'once',
      fixedCount: repeat?.fixedCount ?? null,
    };
    await sessionRepo.save(persisted);
  };

  // ---- missed_transition_rate instrumentation (spec: observability) ----
  // Consecutive StageCompleted events with no StageStarted between them mean
  // reconcile caught up stages while the app was not awake → missed.
  let pendingCompletions = 0;
  const flushPending = () => {
    if (pendingCompletions > 1) {
      observability.trackTransition(true);
      pendingCompletions = 0;
    } else if (pendingCompletions === 1) {
      observability.trackTransition(false);
      pendingCompletions = 0;
    }
  };

  const syncWakeLock = () => {
    const st = engine.getState();
    const wakeLockEnabled = useSettingsStore.getState().settings.wakeLockEnabled;
    if (st.status === 'running' && wakeLockEnabled) {
      void wakeLock.activate();
    } else {
      void wakeLock.deactivate();
    }
  };

  const reschedule = () => {
    const st = engine.getState();
    const session = engine.getSession();
    if (!session || st.status !== 'running' || st.stageEndsAt == null) return;
    const id = `${session.id}_${st.currentRound}_${st.currentStageIndex}`;
    // Forever mode (spec: forever-ui R2): show "WORK · Round 37" — never "/ ∞".
    const forever = st.totalRounds === Infinity;
    const title = forever
      ? `${st.currentStage?.name ?? t('notif.stageFallback')} · ${t('timer.roundShort', { current: st.currentRound })}`
      : st.currentStage?.name ?? t('notif.stageFallback');
    void scheduler.scheduleAt(
      st.stageEndsAt,
      id,
      title,
      t('notif.nextStage', { name: st.nextStage?.name ?? t('notif.finished') }),
    );
  };

  // iOS notification budget split (spec: scheduled-routine R5): the effective
  // stage-queue cap (64 - reserved - active) is consumed by the Editor warning
  // (exceedsNotificationWindow) — see src/app/preset/[id].tsx. The runtime
  // schedules one transition at a time, so no queue cap applies here.

  // Resolve the display name for a session: prefer the live presets store
  // (handles recovery where `lastStartedPresetName` is stale), fall back to
  // the module-level last-started name.
  const presetNameFor = (session: TimerSession | null): string => {
    if (!session) return '';
    const found = usePresetsStore.getState().presets.find((p) => p.id === session.presetId);
    if (found?.name) return found.name;
    const template = BUILTIN_TEMPLATES.find((p) => p.id === session.presetId);
    return template?.name ?? lastStartedPresetName;
  };

  // Widget/live-activity sync: publish the current snapshot on transitions.
  const syncWidgets = () => {
    const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), presetNameFor(engine.getSession()));
    void widgetBridge.updateTimerSnapshot(snapshot);
    if (snapshot) void liveActivity.update(snapshot);
  };

  // React to every engine event: persist at transitions + keep state fresh.
  engine.events.subscribe((event) => {
    set({ lastEventType: event.type, state: engine.getState() });
    const session = engine.getSession();
    if (!session) return;
    const isTerminal = event.type === 'SessionStopped' || event.type === 'SessionCompleted';
    if (isTerminal) {
      flushPending();
      // History/statistics: log every finished session (retention feature).
      const ended = engine.getSession();
      if (ended) {
        const endedAt = Date.now();
        const endedName = presetNameFor(ended);
        void (async () => {
          await sessionLogRepo.add({
            id: ended.id,
            presetId: ended.presetId,
            presetName: endedName,
            startedAt: ended.dateStarted,
            endedAt,
            durationMs: Math.max(0, endedAt - ended.dateStarted),
            stageCount: ended.stagesSnapshot.length,
            status: event.type === 'SessionCompleted' ? 'completed' : 'stopped',
          });
          // Completion celebration (v1.2): only for a natural completion.
          if (event.type === 'SessionCompleted') {
            const entries = await sessionLogRepo.list();
            const streak = currentStreak(entries);
            set({
              completion: {
                sessionId: ended.id,
                presetId: ended.presetId,
                presetName: endedName,
                durationMs: Math.max(0, endedAt - ended.dateStarted),
                streak,
                // For quick routines (temp_quick_session) the dialog offers
                // "Save as Preset" — carry the finished stages over.
                stages: ended.stagesSnapshot.map((s) => ({ ...s })),
                repeatMode: lastStartedRepeat.repeatMode,
                fixedCount: lastStartedRepeat.fixedCount,
              },
            });
          }
        })();
      }
      void sessionRepo.clear();
      void cancelAllKeepRoutines();
      stopTicker();
      syncWakeLock();
      void widgetBridge.updateTimerSnapshot(null);
      void liveActivity.end();
      // Interstitial after stop/completed (spec: monetization placement).
      if (adManager.canShowInterstitial(false, Date.now())) {
        void adManager.showInterstitial();
      }
    } else if (event.type === 'StageCompleted') {
      pendingCompletions += 1;
      void persistSession();
    } else if (event.type === 'StageStarted' || event.type === 'SessionResumed') {
      flushPending();
      if (event.type === 'StageStarted') lastRemainingByEnd.clear();
      void persistSession();
      void cancelAllKeepRoutines();
      reschedule();
      syncWakeLock();
      syncWidgets();
    } else if (event.type === 'SessionPaused') {
      // Widget snapshot must reflect the paused state (spec: home-widget R1).
      void persistSession();
      syncWidgets();
    } else {
      void persistSession();
    }
  });

  return {
    engine,
    state: engine.getState(),
    recovery: null,
    completion: null,
    restoreRepeat: null,
    lastEventType: null,

    initFromStorage: async () => {
      const persisted = await sessionRepo.loadActive();
      if (!persisted) return;
      const s = persisted.session;
      // Ignore stale sessions that already ended.
      if (s.status === 'completed' || s.status === 'stopped') {
        await sessionRepo.clear();
        set({ recovery: null });
        return;
      }
      engine.restore(s, { repeatMode: persisted.repeatMode, fixedCount: persisted.fixedCount });
      engine.reconcile();
      const st = engine.getState();
      set({ state: st, restoreRepeat: { repeatMode: persisted.repeatMode, fixedCount: persisted.fixedCount } });

      // Re-schedule notifications from the reconciled state (cold start).
      if (st.status === 'running' && st.stageEndsAt != null) {
        void cancelAllKeepRoutines();
        reschedule();
        syncWakeLock();
      }

      if (st.status === 'running') {
        const completedWhileAway = false;
        const recovery: RecoveryInfo = {
          pending: true,
          completedWhileAway,
          stageName: st.currentStage?.name ?? '?',
          remainingMs: st.remainingMs,
        };
        set({ recovery });
      } else if (st.status === 'completed') {
        // Sequence finished while the user was away.
        set({
          recovery: {
            pending: true,
            completedWhileAway: true,
            stageName: '',
            remainingMs: 0,
          },
        });
      }
      // PAUSED sessions: keep them paused; recovery dialog offers resume.
      if (st.status === 'paused') {
        set({
          recovery: {
            pending: true,
            completedWhileAway: false,
            stageName: st.currentStage?.name ?? '?',
            remainingMs: st.remainingMs,
          },
        });
      }
    },

    startPreset: async (preset) => {
      // Single active session: stop whatever is running FIRST — the old
      // session's SessionStopped event logs itself with its own name, so
      // remember the new preset name only after the old one is stopped.
      const cur = get().state;
      if (cur.status === 'running' || cur.status === 'paused') {
        engine.stop();
        await sessionRepo.clear();
        await cancelAllKeepRoutines();
      }
      lastStartedPresetName = preset.name.trim() || 'Timer';
      lastStartedRepeat = { repeatMode: preset.repeatMode, fixedCount: preset.fixedCount ?? null };
      engine.start(preset);
      set({ state: engine.getState(), recovery: null, completion: null, restoreRepeat: null });
      startTicker();
      void persistSession({ repeatMode: preset.repeatMode, fixedCount: preset.fixedCount });
      reschedule();
      syncWakeLock();
      const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), presetNameFor(engine.getSession()));
      if (snapshot) {
        void widgetBridge.updateTimerSnapshot(snapshot);
        void liveActivity.start(snapshot);
      }
      // Just-in-time permission requests (spec: permissions) + ATT after
      // first value-moment (spec: policy).
      void requestNotificationPermissionOnFirstTimer();
      void requestExactAlarmPermissionJustInTime();
      void att.requestTrackingPermission().then(() => observability.logEvent('att_prompt_shown'));
    },

    pause: () => {
      engine.pause();
      set({ state: engine.getState() });
      stopTicker();
      void cancelAllKeepRoutines();
      syncWakeLock();
    },

    resume: () => {
      engine.resume();
      set({ state: engine.getState() });
      startTicker();
      void cancelAllKeepRoutines();
      reschedule();
      syncWakeLock();
    },

    skip: () => {
      engine.skip();
      set({ state: engine.getState() });
      void cancelAllKeepRoutines();
      reschedule();
    },

    stop: async () => {
      engine.stop();
      await sessionRepo.clear();
      await cancelAllKeepRoutines();
      set({ state: engine.getState() });
      stopTicker();
      syncWakeLock();
    },

    resolveRecovery: (choice) => {
      const { recovery } = get();
      if (!recovery) return;
      if (choice === 'resume') {
        const s = get().state;
        if (s.status === 'paused') {
          engine.resume();
        } else if (s.status === 'running') {
          // already reconciled — just tick
        }
        set({ recovery: null, state: engine.getState() });
        if (get().state.status === 'running') startTicker();
      } else if (choice === 'restart') {
        // Restart the same routine from scratch, preserving its repeat mode.
        const session = engine.getSession();
        const repeat = get().restoreRepeat ?? { repeatMode: 'once' as const };
        if (session) {
          const preset: Preset = {
            id: session.presetId,
            name: '',
            stages: session.stagesSnapshot.map((s) => ({ ...s })),
            repeatMode: repeat.repeatMode as Preset['repeatMode'],
            fixedCount: repeat.fixedCount ?? null,
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            schemaVersion: 1,
          };
          engine.stop();
          engine.start(preset);
          set({ recovery: null, state: engine.getState(), restoreRepeat: null });
          startTicker();
          void persistSession(repeat);
          const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), presetNameFor(engine.getSession()));
          if (snapshot) {
            void widgetBridge.updateTimerSnapshot(snapshot);
            void liveActivity.start(snapshot);
          }
        }
      } else {
        // dismiss
        engine.stop();
        void sessionRepo.clear();
        void cancelAllKeepRoutines();
        set({ recovery: null, state: engine.getState() });
        stopTicker();
        syncWakeLock();
      }
    },

    tick: () => {
      engine.reconcile();
      const st = engine.getState();
      set({ state: st });
      // Pre-stage warnings (v1.1): cross the 30s / 10s thresholds once.
      if (st.status === 'running' && st.stageEndsAt != null) {
        const key = st.stageEndsAt;
        const prev = lastRemainingByEnd.get(key);
        const remaining = st.remainingMs;
        lastRemainingByEnd.set(key, remaining);
        if (prev != null && prev > 30_000 && remaining <= 30_000) {
          void audio.play('chime-up');
          void haptics.vibrate('pattern-light');
          if (useSettingsStore.getState().settings.voiceEnabled) {
            void speech.speak(t('voice.secondsLeft', { count: 30 })).catch(() => {});
          }
        }
        if (prev != null && prev > 10_000 && remaining <= 10_000) {
          void audio.play('chime-down');
          void haptics.vibrate('pattern-light');
          if (useSettingsStore.getState().settings.voiceEnabled) {
            void speech.speak(t('voice.secondsLeft', { count: 10 })).catch(() => {});
          }
        }
      }
    },

    dismissCompletion: () => {
      set({ completion: null });
    },
  };
});

/** Format ms -> "MM:SS" (hours folded into minutes for display). */
export function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type { TimerSession };
