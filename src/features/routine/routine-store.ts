/**
 * Routine store (Zustand) — CRUD + scheduling of RoutineSchedule reminders.
 * Every mutation re-schedules the next fire via the platform Scheduler
 * (absolute DATE trigger). Snooze is bounded (max 3) per trigger.
 */
import { create } from 'zustand';
import { scheduler } from '../../platform';
import { t } from '../../i18n';
import {
  RoutineSchedule,
  RoutineScheduleRepo,
  canSnooze,
  createScheduleId,
  dateKey,
  nextTriggerAt,
} from './routine-schedule';
import { usePresetsStore } from '../presets/presets-store';
import { BUILTIN_TEMPLATES } from '../../core/templates';

interface RoutineState {
  schedules: RoutineSchedule[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (schedule: RoutineSchedule) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  /** Reschedule all enabled schedules (call after load / any mutation). */
  rescheduleAll: () => Promise<void>;
  /** Mark a schedule handled for today (skip / dismissed / fired). */
  markHandled: (id: string) => Promise<void>;
  /** Snooze a schedule by N minutes (bounded). Returns the new fire time or null. */
  snooze: (id: string, minutes: number) => Promise<number | null>;
}

const repo = new RoutineScheduleRepo();

/** Display name for the schedule's preset (presets store or templates). */
export function schedulePresetName(schedule: RoutineSchedule): string {
  const found = usePresetsStore.getState().presets.find((p) => p.id === schedule.presetId);
  if (found?.name) return found.name;
  // Schedules can be bound to built-in templates (editor lists them) —
  // resolve their display name instead of leaking a raw id like
  // "temp_quick_session" into notifications.
  return BUILTIN_TEMPLATES.find((t) => t.id === schedule.presetId)?.name ?? schedule.presetId;
}

export const useRoutineStore = create<RoutineState>((set, get) => {
  /**
   * Reminder notification body (spec: scheduled-routine R2). Before-window
   * reminders (notificationMinutesBefore > 0) say "starts in N minutes";
   * on-time reminders say "Time for X".
   */
  const reminderBody = (schedule: RoutineSchedule): string => {
    const name = schedulePresetName(schedule);
    const before = schedule.notificationMinutesBefore[0] ?? 0;
    return before > 0
      ? t('routine.beforeBody', { name, minutes: before })
      : t('routine.notificationBody', { name });
  };

  return {
    schedules: [],
    loaded: false,

    load: async () => {
      const schedules = await repo.list();
      set({ schedules, loaded: true });
    },

    save: async (schedule) => {
      await repo.save(schedule);
      await get().load();
      // A new/edited schedule must be picked up right away (not on next boot).
      await get().rescheduleAll();
    },

    remove: async (id) => {
      await repo.remove(id);
      await scheduler.cancelByIds([`routine_${id}`]);
      await get().load();
    },

    toggle: async (id, enabled) => {
      const target = get().schedules.find((s) => s.id === id);
      if (!target) return;
      await repo.save({ ...target, enabled });
      await get().load();
      await get().rescheduleAll();
    },

    rescheduleAll: async () => {
      // Best-effort: only schedule the next fire for enabled schedules.
      for (const s of get().schedules) {
        if (!s.enabled) continue;
        const at = nextTriggerAt(s);
        if (at == null) continue;
        await scheduler.scheduleAt(at, `routine_${s.id}`, schedulePresetName(s), reminderBody(s), 'reminder_actions');
      }
    },

    markHandled: async (id) => {
      const target = get().schedules.find((s) => s.id === id);
      if (!target) return;
      await repo.save({ ...target, lastTriggeredDate: dateKey(Date.now()), snoozeCount: 0, snoozeUntil: undefined });
      await get().load();
    },

    snooze: async (id, minutes) => {
      const target = get().schedules.find((s) => s.id === id);
      if (!target || !canSnooze(target)) return null;
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      const updated: RoutineSchedule = {
        ...target,
        snoozeCount: (target.snoozeCount ?? 0) + 1,
        snoozeUntil: until,
      };
      await repo.save(updated);
      await get().load();
      const fireAt = new Date(until).getTime();
      await scheduler.scheduleAt(fireAt, `routine_${id}`, schedulePresetName(updated), reminderBody(updated), 'reminder_actions');
      return fireAt;
    },

  };
});
