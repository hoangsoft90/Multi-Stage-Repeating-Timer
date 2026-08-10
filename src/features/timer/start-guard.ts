/**
 * Shared start guard (spec: scheduled-routine overwrite guard + quick-start) —
 * starting a preset while another session is active requires confirmation.
 * Applies to EVERY start path (Home card, chips, quick routine, reminders,
 * deep-link) so a quick routine's `temp_quick_session` counts as active too.
 */
import { Preset } from '../../core/timer/models';
import { useTimerStore } from './timer-store';

/**
 * True when any session is active (running OR paused) — including quick
 * routines (temp_quick_session) and restored sessions.
 */
export function hasActiveSession(): boolean {
  const status = useTimerStore.getState().state.status;
  return status === 'running' || status === 'paused';
}

/**
 * Run `confirm` only when a session is active; caller decides the outcome.
 * Returns true when the start may proceed (either no active session or the
 * user confirmed overwriting). Never mutates state itself.
 */
export async function overwriteGuard(confirm: () => Promise<boolean>): Promise<boolean> {
  if (!hasActiveSession()) return true;
  return confirm();
}
