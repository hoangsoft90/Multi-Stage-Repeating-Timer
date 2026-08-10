/**
 * FGS trigger (spec: notification-cold-start R3) — a tiny pub/sub bridge so
 * the observability service can signal "missed_transition_rate_high" to the
 * UI without coupling the platform layer to React.
 */
type Listener = () => void;

let listeners: Listener[] = [];

/** Called by the observability service when the threshold is crossed. */
export function notifyMissedRateHigh(): void {
  for (const l of [...listeners]) l();
}

export function subscribeMissedRateHigh(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function resetFgsListenersForTest(): void {
  listeners = [];
}
