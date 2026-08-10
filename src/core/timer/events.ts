/**
 * TimerEvents — event-sourcing contract.
 * UI and platform adapters only REACT to these events; they never
 * mutate engine state directly.
 */

export type TimerEvent =
  | { type: 'StageStarted'; index: number; name: string; endsAt: number }
  | { type: 'StageCompleted'; index: number; name: string }
  | { type: 'RoundCompleted'; round: number }
  | { type: 'SessionCompleted' }
  | { type: 'SessionPaused'; pausedRemainingMs: number }
  | { type: 'SessionResumed'; endsAt: number }
  | { type: 'SessionStopped' };

export type TimerEventListener = (event: TimerEvent) => void;

/** Minimal typed event emitter — no external deps. */
export class TimerEventEmitter {
  private listeners: TimerEventListener[] = [];

  subscribe(listener: TimerEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: TimerEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}
