/**
 * TimerEngine — pure TypeScript state machine.
 *
 * Design invariants (see openspec/changes/add-timer-engine):
 * - Absolute timestamps: stageEndsAt = stageStartedAt + duration
 * - Only the engine computes remaining; UI renders what the engine publishes.
 * - reconcile(now) catches up ALL expired stages in a loop (not one per call).
 * - Every transition is applied exactly once; events are the only side-effect
 *   channel (event-sourcing). Platform adapters + UI react, never mutate.
 */
import { Clock, SystemClock } from './clock';
import { TimerEvent, TimerEventEmitter } from './events';
import {
  Preset,
  RepeatMode,
  Stage,
  TimerSession,
  TimerStatus,
  cloneStages,
  createSessionId,
} from './models';

export interface EngineState {
  status: TimerStatus;
  session: TimerSession | null;
  currentStage: Stage | null;
  currentStageIndex: number;
  currentRound: number;
  totalRounds: number;
  nextStage: Stage | null;
  /** RUNNING: absolute end (epoch ms); otherwise null */
  stageEndsAt: number | null;
  /** PAUSED: remaining ms of current stage */
  pausedRemainingMs: number | null;
  /** Always >= 0; computed from clock at read time */
  remainingMs: number;
  /** 0..1 progress within current stage */
  progress: number;
}

const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

export class TimerEngine {
  readonly events = new TimerEventEmitter();

  private clock: Clock;
  private session: TimerSession | null = null;
  private preset: Preset | null = null;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  // ---------------------------------------------------------------- helpers

  private emit(event: TimerEvent): void {
    this.events.emit(event);
  }

  private totalRounds(): number {
    if (!this.preset) return 1;
    switch (this.preset.repeatMode) {
      case 'once':
        return 1;
      case 'fixedCount':
        return Math.max(1, this.preset.fixedCount ?? 1);
      case 'forever':
        return Infinity;
    }
  }

  private currentStage(): Stage | null {
    if (!this.session) return null;
    return this.session.stagesSnapshot[this.session.currentStageIndex] ?? null;
  }

  private nextStage(): Stage | null {
    if (!this.session) return null;
    const next = this.session.stagesSnapshot[this.session.currentStageIndex + 1];
    return next ?? null;
  }

  private hasNextStage(): boolean {
    if (!this.session) return false;
    const idx = this.session.currentStageIndex;
    if (idx + 1 < this.session.stagesSnapshot.length) return true;
    // last stage of the current round — is there a next round?
    const rounds = this.totalRounds();
    return this.session.currentRound < rounds;
  }

  // ---------------------------------------------------------------- commands

  /** Create a new session from a preset snapshot. Only valid from IDLE. */
  start(preset: Preset, now?: Date): void {
    if (this.session && this.session.status === 'running') {
      throw new Error('TimerEngine: already running — stop before starting.');
    }
    const t = (now ?? this.clock.now()).getTime();
    if (preset.stages.length === 0) {
      throw new Error('TimerEngine: preset has no stages.');
    }
    const first = preset.stages[0];
    this.preset = { ...preset };
    this.session = {
      id: createSessionId(),
      presetId: preset.id,
      stagesSnapshot: cloneStages(preset.stages),
      currentStageIndex: 0,
      currentRound: 1,
      status: 'running',
      dateStarted: t,
      stageEndsAt: t + first.durationSeconds * 1000,
      pausedRemainingMs: null,
      completedAt: null,
      createdAt: t,
      schemaVersion: 1,
    };
    this.emit({
      type: 'StageStarted',
      index: 0,
      name: first.name,
      endsAt: this.session.stageEndsAt!,
    });
  }

  /**
   * Restore engine from a persisted session snapshot (after kill/reboot).
   * `repeat` carries the repeat context persisted alongside the session
   * (the TimerSession model itself is spec-frozen and does not store it).
   * Always call reconcile(now) right after to converge on correct state.
   */
  restore(session: TimerSession, repeat?: { repeatMode: RepeatMode; fixedCount?: number | null }, now?: Date): void {
    const t = (now ?? this.clock.now()).getTime();
    this.session = {
      ...session,
      stagesSnapshot: cloneStages(session.stagesSnapshot),
      stageEndsAt: session.stageEndsAt ?? null,
      pausedRemainingMs: session.pausedRemainingMs ?? null,
      completedAt: session.completedAt ?? null,
    };
    this.preset = {
      id: session.presetId,
      name: '',
      stages: session.stagesSnapshot,
      repeatMode: repeat?.repeatMode ?? 'once',
      fixedCount: repeat?.fixedCount ?? null,
      createdAt: 0,
      lastUsedAt: 0,
      schemaVersion: 1,
    };
  }

  /**
   * Catch up: advance through every already-expired stage using the ORIGINAL
   * schedule anchors (so a missed stage never eats into a later stage), then
   * re-anchor the landed stage to now + duration (fresh full duration — the
   * stage in progress when the user returns starts over).
   *
   * Idempotent for a given `now`: after advancing, stageEndsAt > now, so a
   * second call with the same `now` advances nothing.
   */
  reconcile(now?: Date): void {
    if (!this.session) return;
    if (this.session.status !== 'running') return;
    if (this.session.stageEndsAt == null) return;
    const t = (now ?? this.clock.now()).getTime();

    let anchor = this.session.stageEndsAt;
    let advanced = false;

    // Anchor-chained catch-up through every expired stage.
    while (t >= anchor && this.hasNextStage()) {
      const ended = this.currentStage();
      if (ended) {
        this.emit({ type: 'StageCompleted', index: this.session.currentStageIndex, name: ended.name });
      }
      this.advanceToNext();
      advanced = true;
      const stage = this.currentStage()!;
      anchor += stage.durationSeconds * 1000;
    }

    // Sequence finished: no next stage and the last anchor has passed.
    if (t >= anchor && !this.hasNextStage()) {
      this.finishSequence(t);
      return;
    }

    // Re-anchor the landed stage: it starts fresh from now.
    if (advanced) {
      const stage = this.currentStage()!;
      this.session.stageEndsAt = t + stage.durationSeconds * 1000;
      this.emit({
        type: 'StageStarted',
        index: this.session.currentStageIndex,
        name: stage.name,
        endsAt: this.session.stageEndsAt,
      });
    }
  }

  /** RUNNING -> PAUSED. No drift: pausedRemaining = max(0, endsAt - now). */
  pause(now?: Date): void {
    if (!this.session || this.session.status !== 'running') return;
    const t = (now ?? this.clock.now()).getTime();
    const remaining = Math.max(0, (this.session.stageEndsAt ?? t) - t);
    this.session.status = 'paused';
    this.session.pausedRemainingMs = remaining;
    this.session.stageEndsAt = null;
    this.emit({ type: 'SessionPaused', pausedRemainingMs: remaining });
  }

  /** PAUSED -> RUNNING. stageEndsAt = now + pausedRemaining. */
  resume(now?: Date): void {
    if (!this.session || this.session.status !== 'paused') return;
    if (this.session.pausedRemainingMs == null) return;
    const t = (now ?? this.clock.now()).getTime();
    this.session.stageEndsAt = t + this.session.pausedRemainingMs;
    this.session.pausedRemainingMs = null;
    this.session.status = 'running';
    this.emit({ type: 'SessionResumed', endsAt: this.session.stageEndsAt });
  }

  /**
   * Skip exactly one logical stage from current position. If we are on the
   * last stage of the last round (non-forever), the session completes.
   */
  skip(now?: Date): void {
    if (!this.session || this.session.status !== 'running') return;
    const t = (now ?? this.clock.now()).getTime();
    const ended = this.currentStage();
    if (ended) {
      this.emit({ type: 'StageCompleted', index: this.session.currentStageIndex, name: ended.name });
    }
    if (this.hasNextStage()) {
      this.advanceToNext();
      const stage = this.currentStage()!;
      this.session.stageEndsAt = t + stage.durationSeconds * 1000;
      this.emit({
        type: 'StageStarted',
        index: this.session.currentStageIndex,
        name: stage.name,
        endsAt: this.session.stageEndsAt,
      });
    } else {
      this.finishSequence(t);
    }
  }

  /** Any running/paused -> STOPPED. Clears all runtime timing fields. */
  stop(now?: Date): void {
    if (!this.session) return;
    if (this.session.status !== 'running' && this.session.status !== 'paused') return;
    const t = (now ?? this.clock.now()).getTime();
    this.session.status = 'stopped';
    this.session.stageEndsAt = null;
    this.session.pausedRemainingMs = null;
    this.session.completedAt = null;
    this.emit({ type: 'SessionStopped' });
  }

  /** Mark the session completed. Emits final RoundCompleted for multi-round modes (spec: "RoundCompleted(N) rồi SessionCompleted"), then SessionCompleted. */
  private finishSequence(t: number): void {
    if (!this.session) return;
    if (this.totalRounds() > 1) {
      this.emit({ type: 'RoundCompleted', round: this.session.currentRound });
    }
    this.session.status = 'completed';
    this.session.stageEndsAt = null;
    this.session.completedAt = t;
    this.emit({ type: 'SessionCompleted' });
  }

  // ---------------------------------------------------------------- internal

  /** Advance to the next stage (or next round's first stage).
   * Does NOT set stageEndsAt — callers (reconcile/skip) manage the anchor
   * timeline themselves. Emits RoundCompleted when a round boundary is
   * crossed.
   */
  private advanceToNext(): void {
    if (!this.session) return;
    const idx = this.session.currentStageIndex;
    const stages = this.session.stagesSnapshot;

    if (idx + 1 < stages.length) {
      this.session.currentStageIndex = idx + 1;
      return;
    }

    const rounds = this.totalRounds();
    if (this.session.currentRound < rounds) {
      this.session.currentRound += 1;
      this.session.currentStageIndex = 0;
      this.emit({ type: 'RoundCompleted', round: this.session.currentRound - 1 });
    }
  }

  // ---------------------------------------------------------------- reads

  /** Source of truth for UI. remaining is computed by the engine only. */
  getState(now?: Date): EngineState {
    const t = (now ?? this.clock.now()).getTime();
    const session = this.session;
    if (!session) {
      return {
        status: 'idle',
        session: null,
        currentStage: null,
        currentStageIndex: 0,
        currentRound: 0,
        totalRounds: 1,
        nextStage: null,
        stageEndsAt: null,
        pausedRemainingMs: null,
        remainingMs: 0,
        progress: 0,
      };
    }

    const stage = this.currentStage();
    const stageEndsAt = session.stageEndsAt ?? null;
    let remainingMs = 0;
    if (session.status === 'running' && stageEndsAt != null) {
      remainingMs = Math.max(0, stageEndsAt - t);
    } else if (session.status === 'paused' && session.pausedRemainingMs != null) {
      remainingMs = Math.max(0, session.pausedRemainingMs);
    }

    let progress = 0;
    if (stage && stage.durationSeconds > 0) {
      const totalMs = stage.durationSeconds * 1000;
      if (session.status === 'running' && stageEndsAt != null) {
        const elapsed = totalMs - remainingMs;
        progress = Math.min(1, Math.max(0, elapsed / totalMs));
      } else if (session.status === 'paused' && session.pausedRemainingMs != null) {
        progress = Math.min(1, Math.max(0, (totalMs - session.pausedRemainingMs) / totalMs));
      }
    }

    return {
      status: session.status,
      session,
      currentStage: stage,
      currentStageIndex: session.currentStageIndex,
      currentRound: session.currentRound,
      totalRounds: this.totalRounds(),
      nextStage: this.nextStage(),
      stageEndsAt,
      pausedRemainingMs: session.pausedRemainingMs ?? null,
      remainingMs,
      progress,
    };
  }

  /** Read access for adapters (e.g. recovery, scheduler). */
  getSession(): TimerSession | null {
    return this.session;
  }
}

export { MAX_DURATION_MS };
