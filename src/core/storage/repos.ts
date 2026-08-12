/**
 * Storage layer (spec: storage) — AsyncStorage with repository abstraction.
 * Every model carries schemaVersion; reads of older schemas must not crash.
 *
 * Persist policy: sessions are persisted ONLY on engine transition events
 * (never on UI ticks) — enforced by the timer store, not here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Preset, RepeatMode, TimerSession } from '../timer/models';

const KEY_PRESETS = 'looptimer:presets';
const KEY_SETTINGS = 'looptimer:settings';
const KEY_SESSION = 'looptimer:session'; // { session, repeatMode, fixedCount }

export type AppLanguageCode =
  | 'vi'
  | 'en'
  | 'ja'
  | 'zh-Hans'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'id'
  | 'th'
  | 'ru';

export type LanguageSetting = 'system' | AppLanguageCode;

export interface Settings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  /** Voice coaching (reads stage names / countdown warnings aloud). */
  voiceEnabled: boolean;
  wakeLockEnabled: boolean;
  themeMode: 'system' | 'light' | 'dark';
  /** UI language — 'system' follows the device locale. */
  language: LanguageSetting;
  /** True once the first-launch onboarding has been completed/skipped. */
  onboardingDone: boolean;
  /** True once the user dismissed the FGS "Keep timer alive" dialog. */
  fgsDialogDismissed: boolean;
  /**
   * Ids of in-app coach marks / tooltips the user has seen or dismissed
   * (additive field — older settings without it read safely as []).
   */
  guidesSeen: string[];
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  vibrationEnabled: true,
  voiceEnabled: true,
  wakeLockEnabled: true,
  themeMode: 'system',
  language: 'system',
  onboardingDone: false,
  fgsDialogDismissed: false,
  guidesSeen: [],
  schemaVersion: 1,
};

export interface PersistedSession {
  session: TimerSession;
  repeatMode: RepeatMode;
  fixedCount?: number | null;
}

/** Safe JSON parse — corrupt/legacy data yields null instead of crashing. */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function withSchema<T>(data: T, schemaVersion = 1): T & { schemaVersion: number } {
  return { ...data, schemaVersion };
}

// ----------------------------------------------------------------- Presets

export class PresetRepo {
  async list(): Promise<Preset[]> {
    const raw = await AsyncStorage.getItem(KEY_PRESETS);
    const data = safeParse<Preset[]>(raw);
    if (!Array.isArray(data)) return [];
    // Drop any record with an unknown/legacy schema safely.
    return data.filter((p) => p && typeof p === 'object' && Array.isArray(p.stages));
  }

  async get(id: string): Promise<Preset | null> {
    const all = await this.list();
    return all.find((p) => p.id === id) ?? null;
  }

  async save(preset: Preset): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((p) => p.id === preset.id);
    const next = withSchema(preset);
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    await AsyncStorage.setItem(KEY_PRESETS, JSON.stringify(all));
  }

  async delete(id: string): Promise<void> {
    const all = await this.list();
    await AsyncStorage.setItem(
      KEY_PRESETS,
      JSON.stringify(all.filter((p) => p.id !== id)),
    );
  }

  async touchLastUsed(id: string, at = Date.now()): Promise<void> {
    const p = await this.get(id);
    if (p) {
      p.lastUsedAt = at;
      await this.save(p);
    }
  }
}

// --------------------------------------------------------------- Settings

export class SettingsRepo {
  async load(): Promise<Settings> {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    const data = safeParse<Partial<Settings>>(raw);
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  }

  async save(settings: Settings): Promise<void> {
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(withSchema(settings)));
  }
}

// ---------------------------------------------------------------- Session

export class SessionRepo {
  /** Read the active (or last) persisted session, if any. */
  async loadActive(): Promise<PersistedSession | null> {
    const raw = await AsyncStorage.getItem(KEY_SESSION);
    const data = safeParse<PersistedSession>(raw);
    if (!data?.session) return null;
    const s = data.session;
    const valid =
      s && typeof s === 'object' && Array.isArray(s.stagesSnapshot) && typeof s.id === 'string';
    if (!valid) return null;
    return { session: s, repeatMode: data.repeatMode ?? 'once', fixedCount: data.fixedCount ?? null };
  }

  /** Persist the session snapshot at a transition. */
  async save(persisted: PersistedSession): Promise<void> {
    await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(persisted));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY_SESSION);
  }
}

// ------------------------------------------------------------ Session log

const KEY_SESSION_LOG = 'looptimer:session-log';
/** Keep the last N logged sessions (bounded storage). */
const MAX_LOG_ENTRIES = 500;

export type SessionLogStatus = 'completed' | 'stopped';

/** Optional post-session mood (v1.5, spec: session-notes). */
export type SessionMood = 'happy' | 'neutral' | 'sad';

/** One finished session — the unit of statistics/history. */
export interface SessionLogEntry {
  id: string;
  presetId: string;
  presetName: string;
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  durationMs: number;
  stageCount: number;
  status: SessionLogStatus;
  /** Additive (default undefined) — old entries without it read safely. */
  mood?: SessionMood;
  /** Additive free-text note — same migration story as mood. */
  note?: string;
  schemaVersion: number;
}

/** Statistics/log store (retention feature: history, streak, heatmap). */
export class SessionLogRepo {
  async list(): Promise<SessionLogEntry[]> {
    const raw = await AsyncStorage.getItem(KEY_SESSION_LOG);
    const data = safeParse<SessionLogEntry[]>(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e) => e && typeof e === 'object' && typeof e.id === 'string' && typeof e.endedAt === 'number',
    );
  }

  async add(entry: Omit<SessionLogEntry, 'schemaVersion'>): Promise<void> {
    const all = await this.list();
    all.push(withSchema(entry));
    // Newest last; drop the oldest beyond the cap.
    const trimmed = all.slice(-MAX_LOG_ENTRIES);
    await AsyncStorage.setItem(KEY_SESSION_LOG, JSON.stringify(trimmed));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY_SESSION_LOG);
  }

  /**
   * Update the mood/note of one logged session (v1.5, spec: session-notes).
   * Passing null/undefined clears the field (deleted from the stored JSON —
   * `add` keeps the additive fields via spread, so this stays symmetric).
   * No-op when the entry does not exist; keeps the 500-entry cap.
   */
  async updateMoodNote(
    id: string,
    mood?: SessionMood | null,
    note?: string | null,
  ): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const next = { ...all[idx] };
    if (mood == null) delete next.mood;
    else next.mood = mood;
    if (note == null) delete next.note;
    else next.note = note;
    all[idx] = next;
    await AsyncStorage.setItem(KEY_SESSION_LOG, JSON.stringify(all));
  }
}

// -------------------------------------------------------------- Weekly goal

const KEY_WEEKLY_GOAL = 'looptimer:weekly-goal';

export const MIN_WEEKLY_TARGET = 1;
export const MAX_WEEKLY_TARGET = 99;

/**
 * Weekly goal (v1.5, spec: weekly-goals) — ONE recurring goal per device;
 * saving a new goal replaces the old one. Progress is always computed for
 * the current week (Monday start), no manual reset/cron needed.
 */
export interface WeeklyGoal {
  id: string;
  /** Undefined/null = all presets count; otherwise only this preset. */
  presetId?: string | null;
  /** Target completed sessions per week, 1..99. */
  targetSessions: number;
  /** YYYY-MM-DD of the Monday when the goal was set (informational). */
  weekStart: string;
  schemaVersion: number;
}

export class WeeklyGoalRepo {
  async load(): Promise<WeeklyGoal | null> {
    const raw = await AsyncStorage.getItem(KEY_WEEKLY_GOAL);
    const data = safeParse<WeeklyGoal>(raw);
    if (!data || typeof data !== 'object' || typeof data.targetSessions !== 'number') return null;
    return data;
  }

  async save(goal: WeeklyGoal): Promise<void> {
    await AsyncStorage.setItem(KEY_WEEKLY_GOAL, JSON.stringify({ ...goal, schemaVersion: 1 }));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY_WEEKLY_GOAL);
  }
}
