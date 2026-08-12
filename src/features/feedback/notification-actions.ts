/**
 * Notification response handling (spec: notification-cold-start +
 * scheduled-routine R4) — the single place that routes a notification action
 * tap (timer controls + reminder actions) to the timer/routine stores. Works
 * both while the app is foregrounded and on cold start (via
 * getLastNotificationResponse).
 *
 * On cold start the stores may not be hydrated yet — we hydrate + reconcile
 * BEFORE applying the action so we never act on stale state.
 */
import { notifications } from '../../platform';
import { useTimerStore } from '../timer/timer-store';
import { useSettingsStore } from '../settings/settings-store';
import { usePresetsStore } from '../presets/presets-store';
import { BUILTIN_TEMPLATES } from '../presets/presets-store';
import { useRoutineStore } from '../routine/routine-store';

export type TimerActionId = 'pause' | 'skip' | 'stop';
export type ReminderActionId =
  | 'reminder_start'
  | 'reminder_snooze_5'
  | 'reminder_snooze_10'
  | 'reminder_dismiss';

/**
 * Normalized id for a plain notification body tap (no action button). The
 * native listener emits this for DEFAULT_ACTION_IDENTIFIER taps — keep in
 * sync with the private constant in src/platform/impl.native.ts.
 */
export const NOTIFICATION_ACTION_OPEN = 'open';

const REMINDER_ACTION_IDS: readonly string[] = [
  'reminder_start',
  'reminder_snooze_5',
  'reminder_snooze_10',
  'reminder_dismiss',
];

/** True when any session is active (running or paused). */
function hasActiveSession(): boolean {
  const status = useTimerStore.getState().state.status;
  return status === 'running' || status === 'paused';
}

/**
 * Ensure stores are hydrated. Bootstrapping happens once in the layout; on
 * cold start a notification tap may arrive before `ready` — this catches up.
 */
export async function ensureHydrated(): Promise<void> {
  try {
    if (!useSettingsStore.getState().loaded) await useSettingsStore.getState().load();
    if (!usePresetsStore.getState().loaded) await usePresetsStore.getState().load();
    if (!useRoutineStore.getState().loaded) await useRoutineStore.getState().load();
    await useTimerStore.getState().initFromStorage();
  } catch {
    /* never block a cold start on storage errors */
  }
}

/**
 * Apply a timer-control action after reconcile(now). Returns the screen the
 * user should land on ('/timer' when a session is still active).
 */
export async function applyTimerAction(actionId: TimerActionId): Promise<string> {
  const ts = useTimerStore.getState();
  // Reconcile first: stage transitions that happened while away are applied.
  ts.engine.reconcile(new Date(Date.now()));
  ts.tick();

  // Re-read status AFTER reconcile — the session may have completed/stalled
  // while the app was away; never act on the pre-reconcile state.
  const status = useTimerStore.getState().state.status;
  if (actionId === 'pause' && status === 'running') ts.pause();
  else if (actionId === 'skip' && (status === 'running' || status === 'paused')) ts.skip();
  else if (actionId === 'stop' && (status === 'running' || status === 'paused')) await ts.stop();

  return hasActiveSession() ? '/timer' : '/';
}

/** Extract the schedule id from a notification id (`routine_<id>`). */
export function scheduleIdFromNotification(notificationId?: string): string | null {
  if (!notificationId || !notificationId.startsWith('routine_')) return null;
  return notificationId.slice('routine_'.length);
}

/**
 * Apply a reminder action (spec: scheduled-routine R4). Tapping "Start" on a
 * reminder IS the explicit confirmation — we start the bound preset directly
 * (no in-app overwrite dialog possible from a notification context).
 */
export async function applyReminderAction(
  actionId: ReminderActionId,
  scheduleId: string,
): Promise<string> {
  const store = useRoutineStore.getState();
  const target = store.schedules.find((s) => s.id === scheduleId);
  if (!target) return '/';

  if (actionId === 'reminder_start') {
    const preset =
      usePresetsStore.getState().presets.find((p) => p.id === target.presetId) ??
      BUILTIN_TEMPLATES.find((p) => p.id === target.presetId);
    if (preset) {
      await useTimerStore.getState().startPreset(preset);
      await store.markHandled(scheduleId);
      return '/timer';
    }
    // Preset đã bị xóa — vẫn đánh dấu handled để reminder không nhắc lặp lại.
    await store.markHandled(scheduleId);
    return '/';
  }

  if (actionId === 'reminder_snooze_5') {
    await store.snooze(scheduleId, 5);
  } else if (actionId === 'reminder_snooze_10') {
    await store.snooze(scheduleId, 10);
  } else if (actionId === 'reminder_dismiss') {
    await store.markHandled(scheduleId);
  }
  return '/';
}

/**
 * Handle a notification action tap (either from a live listener or the
 * cold-start last-response). Returns the destination path.
 */
export async function handleNotificationAction(
  actionId: string,
  notificationId?: string,
): Promise<string> {
  await ensureHydrated();
  // A plain notification tap always opens the timer screen (idle/stopped
  // states redirect home from there).
  if (actionId === NOTIFICATION_ACTION_OPEN) {
    return '/timer';
  }
  if (actionId === 'pause' || actionId === 'skip' || actionId === 'stop') {
    return applyTimerAction(actionId);
  }
  if (REMINDER_ACTION_IDS.includes(actionId)) {
    const scheduleId = scheduleIdFromNotification(notificationId);
    if (!scheduleId) return '/';
    return applyReminderAction(actionId as ReminderActionId, scheduleId);
  }
  return '/';
}

/**
 * Subscribe to live notification taps (app running/backgrounded) and route
 * them through the shared handler. Returns an unsubscribe fn.
 */
export function subscribeNotificationActions(
  onNavigate: (path: string) => void,
): () => void {
  return notifications.addNotificationResponseListener((actionId, notificationId) => {
    void handleNotificationAction(actionId, notificationId).then(onNavigate);
  });
}

/**
 * Cold-start: read the pending notification response (if the app was opened
 * from a notification tap while killed) and apply it once.
 */
export async function handleColdStartResponse(onNavigate: (path: string) => void): Promise<void> {
  try {
    const response = await notifications.getLastNotificationResponse();
    if (!response) return;
    const path = await handleNotificationAction(response.actionId, response.notificationId);
    onNavigate(path);
  } catch {
    /* cold start must never crash */
  }
}
