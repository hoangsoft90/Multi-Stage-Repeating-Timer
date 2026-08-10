/**
 * RoutineSchedule (spec: scheduled-routine) — repeating reminders: days of
 * week × time of day, bound to a preset. Pure helpers + AsyncStorage repo.
 * Missed reminders never punish the streak (streak stays preset-agnostic and
 * only resets after 2 consecutive inactive days — existing stats logic).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUICK_SESSION_PRESET_ID = 'temp_quick_session';

export interface RoutineSchedule {
  id: string;
  presetId: string;
  enabled: boolean;
  /** 1=Mon .. 7=Sun */
  daysOfWeek: number[];
  hour: number; // 0-23
  minute: number; // 0-59
  /** Minutes before the trigger to notify; [0] = at the exact time. */
  notificationMinutesBefore: number[];
  /** YYYY-MM-DD of the last handled trigger (prevents double-fire). */
  lastTriggeredDate?: string;
  /** Bounded snooze: max 3 per trigger window, then auto-dismiss. */
  snoozeCount?: number;
  snoozeUntil?: string; // ISO timestamp of the snoozed fire time
  schemaVersion: number;
}

const KEY = 'looptimer:routine-schedules';
const KEY_LAST_FIRED = 'looptimer:routine-last-fired'; // map id -> YYYY-MM-DD
const MAX_SNOOZE = 3;

export function createScheduleId(): string {
  return `schedule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** YYYY-MM-DD for a timestamp in local time. */
export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// weekDay (1=Mon..7=Sun) lives in the pure `core/time` module so that other
// pure modules (e.g. stats) can reuse it without pulling in AsyncStorage.
// Re-exported here to keep existing imports working.
import { weekDay } from '../../core/time';
export { weekDay };

/**
 * Next absolute fire time (epoch ms) for the schedule at-or-after `now`,
 * considering daysOfWeek + hour:minute + notificationMinutesBefore[0].
 * Scanning 8 days covers a full week cycle; returns null only when the
 * schedule has no active days.
 */
export function nextTriggerAt(schedule: RoutineSchedule, now = Date.now()): number | null {
  if (!schedule.enabled || schedule.daysOfWeek.length === 0) return null;
  const before = schedule.notificationMinutesBefore[0] ?? 0;
  const fireMinute = schedule.hour * 60 + schedule.minute - before;

  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now + offset * 86_400_000);
    if (!schedule.daysOfWeek.includes(weekDay(day.getTime()))) continue;
    const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, fireMinute, 0, 0).getTime();
    if (candidate >= now) return candidate;
  }
  return null;
}

/**
 * True when the reminder should have fired today but wasn't handled yet.
 * Uses the SAME effective fire time as nextTriggerAt (hour:minute minus the
 * first notificationMinutesBefore) so a pre-window reminder counts as missed
 * the moment its notification fired.
 */
export function isMissed(schedule: RoutineSchedule, now = Date.now()): boolean {
  if (!schedule.enabled || !schedule.daysOfWeek.includes(weekDay(now))) return false;
  const before = schedule.notificationMinutesBefore[0] ?? 0;
  const fire = schedule.hour * 60 + schedule.minute - before;
  const d = new Date(now);
  const nowMinute = d.getHours() * 60 + d.getMinutes();
  return nowMinute > fire && schedule.lastTriggeredDate !== dateKey(now);
}

/**
 * iOS notification budget split (spec: scheduled-routine R5):
 * effectiveMaxStageQueue = 64 - reminder_reserved_slots - activeScheduleCount.
 * Never below a sane floor.
 */
export function effectiveMaxStageQueue(
  reservedSlots: number,
  activeScheduleCount: number,
  configuredMax = 50,
): number {
  const effective = 64 - reservedSlots - activeScheduleCount;
  return Math.max(10, Math.min(effective, configuredMax));
}

/** Bounded snooze: true while the schedule may still snooze for this trigger. */
export function canSnooze(schedule: RoutineSchedule): boolean {
  return (schedule.snoozeCount ?? 0) < MAX_SNOOZE;
}

// ------------------------------------------------------------------ Repo

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export class RoutineScheduleRepo {
  async list(): Promise<RoutineSchedule[]> {
    const raw = await AsyncStorage.getItem(KEY);
    const data = safeParse<RoutineSchedule[]>(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (s) => s && typeof s === 'object' && typeof s.id === 'string' && Array.isArray(s.daysOfWeek),
    );
  }

  async save(schedule: RoutineSchedule): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((s) => s.id === schedule.id);
    const next = { ...schedule, schemaVersion: 1 };
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    const all = await this.list();
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(all.filter((s) => s.id !== id)),
    );
  }

  async getLastFired(id: string): Promise<string | null> {
    const raw = await AsyncStorage.getItem(KEY_LAST_FIRED);
    const map = safeParse<Record<string, string>>(raw) ?? {};
    return map[id] ?? null;
  }

  async setLastFired(id: string, date: string): Promise<void> {
    const raw = await AsyncStorage.getItem(KEY_LAST_FIRED);
    const map = safeParse<Record<string, string>>(raw) ?? {};
    map[id] = date;
    await AsyncStorage.setItem(KEY_LAST_FIRED, JSON.stringify(map));
  }
}
