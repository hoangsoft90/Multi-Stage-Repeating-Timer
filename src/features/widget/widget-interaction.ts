/**
 * Widget + Live Activity interaction handling (spec: android-widget R2 /
 * live-activity R3) — the app-side listener for expo-widgets button taps.
 *
 * Home widget (iOS WidgetKit + Android Glance): tapping "Start" while idle
 * quick-starts the suggested preset (hydrates stores first, so it also works
 * when the app was killed) and navigates to the timer screen. Never
 * overwrites a running session — it just surfaces the timer screen instead.
 * While a session is active, Pause/Resume/Stop control taps are applied to
 * the timer store in place (no navigation — the user stays on the home
 * screen, the widget updates to the new state via the store events).
 *
 * Live Activity: Pause/Skip/Resume control taps are applied the same way
 * (no navigation — the user stays on the Lock Screen).
 *
 * Mirror of the notification-actions pattern (lazy platform module, no-op on
 * web / Expo Go, all errors swallowed).
 */
import type { UserInteractionEvent } from 'expo-widgets';
import { ensureHydrated } from '../feedback/notification-actions';
import { useTimerStore } from '../timer/timer-store';
import { usePresetsStore } from '../presets/presets-store';
import { resolveQuickStartPresetId } from './quick-start-preset';
import {
  WIDGET_SOURCE,
  WIDGET_START_TARGET,
  WIDGET_PAUSE_TARGET,
  WIDGET_RESUME_TARGET,
  WIDGET_STOP_TARGET,
} from './widget-data';
import { ACTIVITY_SKIP_TARGET, ACTIVITY_SOURCE } from './activity-content';

type WidgetsModule = typeof import('expo-widgets');

function loadWidgets(): WidgetsModule | null {
  try {
    return require('expo-widgets') as WidgetsModule;
  } catch {
    return null; // Expo Go / web — no widget module.
  }
}

/** True when any session is active (running or paused). */
function hasActiveSession(): boolean {
  const status = useTimerStore.getState().state.status;
  return status === 'running' || status === 'paused';
}

/**
 * "Start" pressed on the widget. Quick-starts the suggested preset when idle;
 * when a session is already running it only navigates to the timer screen
 * (single-session rule — never silently overwrite). Returns the destination.
 */
export async function handleWidgetStartTap(): Promise<string> {
  try {
    await ensureHydrated();

    if (hasActiveSession()) return '/timer';

    const presetId = resolveQuickStartPresetId();
    const preset = usePresetsStore.getState().presets.find((p) => p.id === presetId);
    if (!preset) return '/';

    await useTimerStore.getState().startPreset(preset);
    return '/timer';
  } catch {
    return '/'; // never crash a widget tap
  }
}

/**
 * Apply a control tap (Pause / Resume / Skip / Stop) from the home widget or
 * the Live Activity to the timer store. Hydrates first so it also works when
 * the app was killed (initFromStorage restores), then reconciles + ticks so
 * transitions that happened while the app was suspended are applied BEFORE
 * acting — never act on stale state (mirrors applyTimerAction). Status
 * guards: pause only while running, resume only while paused, skip/stop from
 * running or paused (the engine itself no-ops unless running). Targets are
 * matched on the shared pause/resume/stop values (identical in widget-data
 * and activity-content — keep in sync; see widget-data.ts). Never navigates
 * — the widget/activity updates via the store events.
 */
export async function applyControlAction(target: string): Promise<void> {
  try {
    await ensureHydrated();
    const ts = useTimerStore.getState();
    // Reconcile first: stage transitions that happened while the app was
    // suspended are applied BEFORE acting — never act on stale in-memory
    // state (mirrors applyTimerAction in notification-actions.ts).
    ts.engine.reconcile(new Date(Date.now()));
    ts.tick();
    const status = useTimerStore.getState().state.status;
    if (target === WIDGET_PAUSE_TARGET && status === 'running') ts.pause();
    else if (target === WIDGET_RESUME_TARGET && status === 'paused') ts.resume();
    else if (target === ACTIVITY_SKIP_TARGET && (status === 'running' || status === 'paused')) ts.skip();
    else if (target === WIDGET_STOP_TARGET && (status === 'running' || status === 'paused')) await ts.stop();
  } catch {
    /* never crash a control tap */
  }
}

/**
 * Subscribe to widget/Live Activity button taps (expo-widgets; no-op on
 * web/Expo Go). Returns an unsubscribe fn. Routes:
 * - Widget "Start" (idle) → quick-start + navigate (TimerWidget.tsx)
 * - Widget Pause/Resume/Stop (active session) → applyControlAction
 * - Live Activity Pause/Skip/Resume → applyControlAction (live-activity.tsx)
 */
export function subscribeWidgetInteraction(onNavigate: (path: string) => void): () => void {
  const mod = loadWidgets();
  if (!mod) return () => {};
  try {
    const sub = mod.addUserInteractionListener((event: UserInteractionEvent) => {
      if (event.source === WIDGET_SOURCE) {
        if (event.target === WIDGET_START_TARGET) {
          void handleWidgetStartTap().then(onNavigate);
        } else {
          void applyControlAction(event.target);
        }
      } else if (event.source === ACTIVITY_SOURCE) {
        void applyControlAction(event.target);
      }
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
