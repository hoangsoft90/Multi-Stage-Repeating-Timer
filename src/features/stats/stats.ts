/**
 * Statistics helpers (v1.1 retention feature) — pure functions, testable
 * without any platform dependency. Input is the session log.
 */
import { SessionLogEntry } from '../../core/storage/repos';
import { weekDay } from '../../core/time';

export const DAY_MS = 86_400_000;

/** Normalize an epoch ms to the start of its local day. */
export function dayKey(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function totalSessions(entries: SessionLogEntry[]): number {
  return entries.length;
}

export function totalDurationMs(entries: SessionLogEntry[]): number {
  return entries.reduce((acc, e) => acc + e.durationMs, 0);
}

/** Total duration of sessions that ended in the last 7 days (incl. today). */
export function weekDurationMs(entries: SessionLogEntry[], now = Date.now()): number {
  const from = dayKey(now) - 6 * DAY_MS;
  return entries
    .filter((e) => e.endedAt >= from && e.endedAt < dayKey(now) + DAY_MS)
    .reduce((acc, e) => acc + e.durationMs, 0);
}

/**
 * Consecutive days (ending today or yesterday) with at least one session —
 * forgiving: a not-yet-completed today doesn't break the streak.
 *
 * Streak is PRESET-AGNOSTIC (v1.3, spec: quick-start 4.2): it never filters
 * by presetId, so quick-routine sessions (temp_quick_session) count exactly
 * like any other preset — a missed reminder can never punish the streak.
 */
export function currentStreak(entries: SessionLogEntry[], now = Date.now()): number {
  const days = new Set(entries.map((e) => dayKey(e.endedAt)));
  let cursor = dayKey(now);
  if (!days.has(cursor)) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export function bestStreak(entries: SessionLogEntry[]): number {
  const days = [...new Set(entries.map((e) => dayKey(e.endedAt)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = 0;
  for (const d of days) {
    run = run > 0 && d - prev === DAY_MS ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

export interface HeatCell {
  day: number;
  count: number;
}

/** 12-week calendar grid ending today (inclusive). */
export function lastWeeksGrid(entries: SessionLogEntry[], now = Date.now(), weeks = 12): HeatCell[] {
  const counts = new Map<number, number>();
  for (const e of entries) {
    const k = dayKey(e.endedAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const end = dayKey(now) + DAY_MS; // exclusive
  const start = end - weeks * 7 * DAY_MS;
  const cells: HeatCell[] = [];
  for (let t = start; t < end; t += DAY_MS) {
    cells.push({ day: t, count: counts.get(t) ?? 0 });
  }
  return cells;
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDay(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Daily routine suggestion (v1.2 retention) — "Routine hôm nay".
// ---------------------------------------------------------------------------

/** 4 time-of-day buckets used to match a habit window. */
export type HourBucket = 'morning' | 'afternoon' | 'evening' | 'night';

/** Map an hour (0-23) to its bucket. Night wraps: 0-4h + 21-23h. */
export function hourBucket(hour: number): HourBucket {
  if (hour >= 21 || hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export interface RoutineSuggestion {
  presetId: string;
  /** The matching time-of-day bucket of the suggestion. */
  hourBucket: HourBucket;
  /** How many sessions of this preset ran in the bucket window (7d). */
  count: number;
}

/**
 * Suggest the preset the user most often runs in the current time-of-day
 * bucket, based on the last `days` days of session history. Pure + testable.
 * Returns null when the bucket has no history yet (no habit → no card).
 */
export function suggestPresetForNow(
  entries: SessionLogEntry[],
  presetIds: string[],
  now = Date.now(),
  days = 7,
): RoutineSuggestion | null {
  const bucket = hourBucket(new Date(now).getHours());
  const from = dayKey(now) - (days - 1) * DAY_MS;
  const allowed = new Set(presetIds);

  const counts = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  for (const e of entries) {
    if (e.endedAt < from || e.endedAt >= dayKey(now) + DAY_MS) continue;
    if (hourBucket(new Date(e.endedAt).getHours()) !== bucket) continue;
    if (!allowed.has(e.presetId)) continue;
    counts.set(e.presetId, (counts.get(e.presetId) ?? 0) + 1);
    lastSeen.set(e.presetId, Math.max(lastSeen.get(e.presetId) ?? 0, e.endedAt));
  }
  if (counts.size === 0) return null;

  // Highest count wins; ties break on the most recently used preset.
  let best: string | null = null;
  let bestCount = 0;
  let bestLastSeen = -1;
  for (const [id, count] of counts) {
    const seen = lastSeen.get(id) ?? 0;
    if (count > bestCount || (count === bestCount && seen > bestLastSeen)) {
      best = id;
      bestCount = count;
      bestLastSeen = seen;
    }
  }
  if (best == null) return null;
  return { presetId: best, hourBucket: bucket, count: bestCount };
}

// ---------------------------------------------------------------------------
// Smart routine v2 (v1.4) — suggest by DAY OF THE WEEK (4 weeks, same weekday).
// ---------------------------------------------------------------------------

export interface WeekdayRoutineSuggestion {
  presetId: string;
  /** 1=Mon..7=Sun of the matched weekday pattern. */
  weekDay: number;
  /** The matching time-of-day bucket. */
  hourBucket: HourBucket;
  /** How many sessions of this preset ran on this weekday in the window. */
  count: number;
}

/**
 * Suggest the preset the user most often runs on THIS weekday (1=Mon..7=Sun)
 * in the same time-of-day bucket, over the last `weeks` weeks of history.
 * Higher signal than the shared time-of-day model for weekly habits (HIIT on
 * Tue/Thu/Sat, Deep Work on Mon/Wed, …). Pure + testable; returns null when
 * there is no signal for this weekday (Home falls back to v1.2 model).
 */
export function suggestPresetForDayOfWeek(
  entries: SessionLogEntry[],
  presetIds: string[],
  now = Date.now(),
  weeks = 4,
): WeekdayRoutineSuggestion | null {
  const day = weekDay(now);
  const bucket = hourBucket(new Date(now).getHours());
  const from = dayKey(now) - (weeks * 7 - 1) * DAY_MS;
  const allowed = new Set(presetIds);

  const counts = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  for (const e of entries) {
    if (e.endedAt < from || e.endedAt >= dayKey(now) + DAY_MS) continue;
    // Same weekday AND same time-of-day bucket → strongest habit signal.
    if (weekDay(e.endedAt) !== day) continue;
    if (hourBucket(new Date(e.endedAt).getHours()) !== bucket) continue;
    if (!allowed.has(e.presetId)) continue;
    counts.set(e.presetId, (counts.get(e.presetId) ?? 0) + 1);
    lastSeen.set(e.presetId, Math.max(lastSeen.get(e.presetId) ?? 0, e.endedAt));
  }
  if (counts.size === 0) return null;

  // Highest count wins; ties break on the most recently used preset.
  let best: string | null = null;
  let bestCount = 0;
  let bestLastSeen = -1;
  for (const [id, count] of counts) {
    const seen = lastSeen.get(id) ?? 0;
    if (count > bestCount || (count === bestCount && seen > bestLastSeen)) {
      best = id;
      bestCount = count;
      bestLastSeen = seen;
    }
  }
  if (best == null) return null;
  return { presetId: best, weekDay: day, hourBucket: bucket, count: bestCount };
}

// ---------------------------------------------------------------------------
// Session notes (v1.5, spec: session-notes) — mood distribution per preset.
// ---------------------------------------------------------------------------

/** Mood counts for one preset (only presets with ≥1 mood/note appear). */
export interface MoodSummary {
  presetId: string;
  /** Name of the most recent entry of this preset. */
  presetName: string;
  /** Entries carrying a mood or a note. */
  total: number;
  happy: number;
  neutral: number;
  sad: number;
  /** Entries with a note (mood optional). */
  noted: number;
}

/**
 * Aggregate mood/note data by preset, most-rated first. Pure + deterministic;
 * entries without any mood or note are ignored (session-notes is optional).
 */
export function moodSummaryByPreset(entries: SessionLogEntry[]): MoodSummary[] {
  const map = new Map<string, MoodSummary>();
  for (const e of entries) {
    if (!e.mood && !e.note) continue;
    let s = map.get(e.presetId);
    if (!s) {
      s = {
        presetId: e.presetId,
        presetName: e.presetName,
        total: 0,
        happy: 0,
        neutral: 0,
        sad: 0,
        noted: 0,
      };
      map.set(e.presetId, s);
    }
    s.total += 1;
    s.happy += e.mood === 'happy' ? 1 : 0;
    s.neutral += e.mood === 'neutral' ? 1 : 0;
    s.sad += e.mood === 'sad' ? 1 : 0;
    if (e.note) s.noted += 1;
    s.presetName = e.presetName; // entries are newest last → ends at the latest
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.presetId.localeCompare(b.presetId));
}
