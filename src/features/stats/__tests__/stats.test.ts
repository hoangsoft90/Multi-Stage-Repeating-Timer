import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionLogEntry, SessionLogRepo } from '../../../core/storage/repos';
import {
  bestStreak,
  currentStreak,
  DAY_MS,
  dayKey,
  formatDuration,
  lastWeeksGrid,
  moodSummaryByPreset,
  totalDurationMs,
  totalSessions,
  weekDurationMs,
} from '../stats';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = Date.UTC(2026, 7, 9, 12, 0, 0); // 2026-08-09 12:00 UTC

function entry(daysAgo: number, durationMs = 60_000): SessionLogEntry {
  const endedAt = NOW - daysAgo * DAY_MS;
  return {
    id: `s_${daysAgo}`,
    presetId: 'p1',
    presetName: 'HIIT',
    startedAt: endedAt - durationMs,
    endedAt,
    durationMs,
    stageCount: 3,
    status: 'completed',
    schemaVersion: 1,
  };
}

describe('stats helpers', () => {
  it('totals sessions and duration', () => {
    const entries = [entry(0), entry(1), entry(2, 120_000)];
    expect(totalSessions(entries)).toBe(3);
    expect(totalDurationMs(entries)).toBe(240_000);
    expect(formatDuration(240_000)).toBe('4m');
    expect(formatDuration(3_600_000 + 30_000)).toBe('1h 1m');
  });

  it('weekDurationMs counts only the last 7 days', () => {
    expect(weekDurationMs([entry(0), entry(6), entry(8)], NOW)).toBe(120_000);
  });

  it('currentStreak: consecutive days ending today or yesterday', () => {
    expect(currentStreak([entry(0), entry(1), entry(2)], NOW)).toBe(3);
    // Today not yet done — streak still counts from yesterday.
    expect(currentStreak([entry(1), entry(2)], NOW)).toBe(2);
    // A gap breaks the streak.
    expect(currentStreak([entry(0), entry(1), entry(3)], NOW)).toBe(2);
    expect(currentStreak([], NOW)).toBe(0);
  });

  it('bestStreak tracks the longest run', () => {
    const entries = [entry(0), entry(1), entry(2), entry(5), entry(6)];
    expect(bestStreak(entries)).toBe(3);
    expect(bestStreak([entry(0)])).toBe(1);
  });

  it('streak preset-agnostic — quick sessions (temp) count like any preset (v1.3)', () => {
    const quick = (daysAgo: number) => ({
      ...entry(daysAgo),
      presetId: 'temp_quick_session',
      presetName: 'Quick Routine',
    });
    // Two consecutive quick-routine days → streak 2 (no presetId filtering).
    expect(currentStreak([quick(0), quick(1)], NOW)).toBe(2);
    // Mixed presets across days also keep one streak.
    expect(currentStreak([quick(0), entry(1)], NOW)).toBe(2);
  });

  it('lastWeeksGrid produces 12*7 cells with counts', () => {
    const cells = lastWeeksGrid([entry(0), entry(0, 10_000), entry(1)], NOW, 12);
    expect(cells).toHaveLength(84);
    const todayCount = cells.find((c) => c.day === dayKey(NOW))?.count ?? 0;
    const yesterdayCount = cells.find((c) => c.day === dayKey(NOW) - DAY_MS)?.count ?? 0;
    expect(todayCount).toBe(2);
    expect(yesterdayCount).toBe(1);
  });
});

describe('moodSummaryByPreset (v1.5 session-notes)', () => {
  const withMood = (
    presetId: string,
    mood: 'happy' | 'neutral' | 'sad' | undefined,
    note?: string,
    presetName = presetId,
  ): SessionLogEntry => ({
    ...entry(0),
    id: `${presetId}_${Math.random()}`,
    presetId,
    presetName,
    mood,
    note,
  });

  it('gộp theo preset + đếm happy/neutral/sad/noted', () => {
    const entries = [
      withMood('p1', 'happy'),
      withMood('p1', 'happy', 'great'),
      withMood('p1', 'neutral'),
      withMood('p2', 'sad'),
    ];
    const summary = moodSummaryByPreset(entries);
    expect(summary).toHaveLength(2);
    const p1 = summary.find((s) => s.presetId === 'p1')!;
    expect(p1.total).toBe(3);
    expect(p1.happy).toBe(2);
    expect(p1.neutral).toBe(1);
    expect(p1.sad).toBe(0);
    expect(p1.noted).toBe(1);
    expect(p1.presetName).toBe('p1');
  });

  it('chỉ trả preset có ít nhất 1 mood/note; bỏ qua session không ghi gì', () => {
    const entries = [withMood('p1', undefined), withMood('p2', 'happy'), entry(1)];
    const summary = moodSummaryByPreset(entries);
    expect(summary.map((s) => s.presetId)).toEqual(['p2']);
  });

  it('note-only cũng được tính (total + noted, mood = 0)', () => {
    const summary = moodSummaryByPreset([withMood('p1', undefined, 'just a note')]);
    expect(summary[0].total).toBe(1);
    expect(summary[0].noted).toBe(1);
    expect(summary[0].happy).toBe(0);
  });

  it('sắp xếp total desc, deterministic', () => {
    const entries = [
      withMood('pA', 'happy'),
      withMood('pB', 'happy'),
      withMood('pB', 'sad'),
    ];
    expect(moodSummaryByPreset(entries).map((s) => s.presetId)).toEqual(['pB', 'pA']);
    expect(moodSummaryByPreset(entries).map((s) => s.presetId)).toEqual(['pB', 'pA']);
  });

  it('rỗng khi không có dữ liệu mood', () => {
    expect(moodSummaryByPreset([])).toEqual([]);
  });
});

describe('SessionLogRepo', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('add + list round-trips entries newest last', async () => {
    const repo = new SessionLogRepo();
    await repo.add({ ...entry(1), id: 'a' });
    await repo.add({ ...entry(0), id: 'b' });
    const list = await repo.list();
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
    expect(list[0].schemaVersion).toBe(1);
  });

  it('corrupt storage yields an empty list (no crash)', async () => {
    await AsyncStorage.setItem('looptimer:session-log', 'not-json{');
    const repo = new SessionLogRepo();
    expect(await repo.list()).toEqual([]);
  });

  it('clear wipes the log', async () => {
    const repo = new SessionLogRepo();
    await repo.add({ ...entry(0), id: 'a' });
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });
});
