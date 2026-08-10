/**
 * Weekly goals (v1.5, spec: weekly-goals) — PURE helpers, no AsyncStorage or
 * platform imports (unit-testable like stats.ts). The goal is recurring:
 * progress is always computed for the CURRENT week (Monday start), so no
 * manual reset or cron is ever needed.
 */
import type { WeeklyGoal } from '../../core/storage/repos';
import { weekDay } from '../../core/time';

export const WEEK_MS = 7 * 86_400_000;

export function createGoalId(): string {
  return `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Epoch ms of the Monday that starts the week containing `ts` (local time). */
export function mondayKey(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  // weekDay is 1=Mon..7=Sun → days since Monday = weekDay - 1.
  d.setDate(d.getDate() - (weekDay(ts) - 1));
  return d.getTime();
}

/** YYYY-MM-DD of the Monday of the week containing `ts`. */
export function weekKey(ts: number): string {
  const d = new Date(mondayKey(ts));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface WeekProgress {
  completed: number;
  target: number;
}

/**
 * Completed sessions inside the current week (Mon 00:00 .. next Mon 00:00),
 * optionally restricted to one preset (goal.presetId). Only
 * status === 'completed' counts — consistent with the completion dialog
 * (a manual stop never celebrates) and streak logic (preset-agnostic).
 * The target is clamped to the spec range 1..99.
 */
export function currentWeekProgress(
  entries: ReadonlyArray<{ status?: string; presetId: string; endedAt: number }>,
  goal: WeeklyGoal,
  now = Date.now(),
): WeekProgress {
  const from = mondayKey(now);
  const to = from + WEEK_MS;
  const presetId = goal.presetId ?? null;
  const completed = entries.filter(
    (e) =>
      e.status === 'completed' &&
      e.endedAt >= from &&
      e.endedAt < to &&
      (!presetId || e.presetId === presetId),
  ).length;
  const target = Math.max(1, Math.min(99, Math.round(goal.targetSessions)));
  return { completed, target };
}
