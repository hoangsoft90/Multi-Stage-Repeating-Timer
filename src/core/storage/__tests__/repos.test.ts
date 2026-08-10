/**
 * Repo unit tests (task 8.2): AsyncStorage-based repositories must never
 * crash on corrupt/legacy data and must round-trip cleanly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PresetRepo,
  SessionLogRepo,
  SessionRepo,
  SettingsRepo,
  WeeklyGoalRepo,
  DEFAULT_SETTINGS,
} from '../repos';
import { Preset, TimerSession } from '../../timer/models';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p1',
    name: 'Test',
    stages: [{ id: 's1', name: 'WORK', durationSeconds: 60 }],
    repeatMode: 'once',
    fixedCount: null,
    createdAt: 1,
    lastUsedAt: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('PresetRepo', () => {
  it('lists nothing when empty', async () => {
    const repo = new PresetRepo();
    await expect(repo.list()).resolves.toEqual([]);
  });

  it('round-trips save → list → get', async () => {
    const repo = new PresetRepo();
    const p = makePreset();
    await repo.save(p);
    await expect(repo.list()).resolves.toHaveLength(1);
    await expect(repo.get('p1')).resolves.toMatchObject({ id: 'p1', name: 'Test' });
    await expect(repo.get('nope')).resolves.toBeNull();
  });

  it('get returns null for unknown id', async () => {
    const repo = new PresetRepo();
    await expect(repo.get('missing')).resolves.toBeNull();
  });

  it('delete removes only the matching preset', async () => {
    const repo = new PresetRepo();
    await repo.save(makePreset());
    await repo.save(makePreset({ id: 'p2', name: 'Two' }));
    await repo.delete('p1');
    const all = await repo.list();
    expect(all.map((p) => p.id)).toEqual(['p2']);
  });

  it('does not crash on corrupt JSON — returns []', async () => {
    await AsyncStorage.setItem('looptimer:presets', '{not json');
    const repo = new PresetRepo();
    await expect(repo.list()).resolves.toEqual([]);
  });

  it('drops legacy records that have no stages array', async () => {
    await AsyncStorage.setItem(
      'looptimer:presets',
      JSON.stringify([{ id: 'legacy', name: 'Old' }, makePreset()]),
    );
    const repo = new PresetRepo();
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('p1');
  });

  it('touchLastUsed updates lastUsedAt', async () => {
    const repo = new PresetRepo();
    await repo.save(makePreset({ lastUsedAt: 100 }));
    await repo.touchLastUsed('p1', 500);
    const p = await repo.get('p1');
    expect(p?.lastUsedAt).toBe(500);
  });
});

describe('SettingsRepo', () => {
  it('returns defaults when empty', async () => {
    const repo = new SettingsRepo();
    await expect(repo.load()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips save → load', async () => {
    const repo = new SettingsRepo();
    await repo.save({ ...DEFAULT_SETTINGS, soundEnabled: false, themeMode: 'dark' });
    const loaded = await repo.load();
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.themeMode).toBe('dark');
    expect(loaded.vibrationEnabled).toBe(true);
  });

  it('falls back to defaults on corrupt JSON', async () => {
    await AsyncStorage.setItem('looptimer:settings', '{{');
    const repo = new SettingsRepo();
    await expect(repo.load()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('SessionRepo', () => {
  const session: TimerSession = {
    id: 'sess_1',
    presetId: 'p1',
    stagesSnapshot: [{ id: 's1', name: 'WORK', durationSeconds: 60 }],
    currentStageIndex: 0,
    currentRound: 1,
    status: 'running',
    dateStarted: 1000,
    stageEndsAt: 61000,
    pausedRemainingMs: null,
    completedAt: null,
    createdAt: 1000,
    schemaVersion: 1,
  };

  it('loads null when empty', async () => {
    const repo = new SessionRepo();
    await expect(repo.loadActive()).resolves.toBeNull();
  });

  it('round-trips save → loadActive preserving repeat context', async () => {
    const repo = new SessionRepo();
    await repo.save({ session, repeatMode: 'fixedCount', fixedCount: 8 });
    const loaded = await repo.loadActive();
    expect(loaded).not.toBeNull();
    expect(loaded?.session.id).toBe('sess_1');
    expect(loaded?.repeatMode).toBe('fixedCount');
    expect(loaded?.fixedCount).toBe(8);
  });

  it('defaults repeatMode to once when missing (legacy payload)', async () => {
    await AsyncStorage.setItem('looptimer:session', JSON.stringify({ session }));
    const repo = new SessionRepo();
    const loaded = await repo.loadActive();
    expect(loaded?.repeatMode).toBe('once');
  });

  it('returns null for invalid session (no stagesSnapshot)', async () => {
    await AsyncStorage.setItem(
      'looptimer:session',
      JSON.stringify({ session: { id: 'x', status: 'running' } }),
    );
    const repo = new SessionRepo();
    await expect(repo.loadActive()).resolves.toBeNull();
  });

  it('returns null on corrupt JSON', async () => {
    await AsyncStorage.setItem('looptimer:session', '###');
    const repo = new SessionRepo();
    await expect(repo.loadActive()).resolves.toBeNull();
  });

  it('clear removes the persisted session', async () => {
    const repo = new SessionRepo();
    await repo.save({ session, repeatMode: 'once' });
    await repo.clear();
    await expect(repo.loadActive()).resolves.toBeNull();
  });
});

describe('SessionLogRepo — mood/note (v1.5 session-notes)', () => {
  const base = {
    presetId: 'p1',
    presetName: 'HIIT',
    startedAt: 0,
    endedAt: 1000,
    durationMs: 1000,
    stageCount: 2,
    status: 'completed' as const,
  };

  it('updates mood + note on an existing entry', async () => {
    const repo = new SessionLogRepo();
    await repo.add({ id: 'a', ...base });
    await repo.updateMoodNote('a', 'happy', 'Felt great!');
    const list = await repo.list();
    expect(list[0].mood).toBe('happy');
    expect(list[0].note).toBe('Felt great!');
  });

  it('clearing via undefined/null removes the fields from the stored JSON', async () => {
    const repo = new SessionLogRepo();
    await repo.add({ id: 'a', ...base });
    await repo.updateMoodNote('a', 'sad', 'tired');
    await repo.updateMoodNote('a', undefined, undefined);
    const list = await repo.list();
    expect(list[0].mood).toBeUndefined();
    expect(list[0].note).toBeUndefined();
    const raw = JSON.stringify(list[0]);
    expect(raw).not.toContain('mood');
    expect(raw).not.toContain('note');
  });

  it('entries without mood/note (legacy) still read safely', async () => {
    const repo = new SessionLogRepo();
    await repo.add({ id: 'a', ...base });
    const list = await repo.list();
    expect(list[0].mood).toBeUndefined();
    expect(list[0].note).toBeUndefined();
  });

  it('no-op when the id does not exist', async () => {
    const repo = new SessionLogRepo();
    await repo.add({ id: 'a', ...base });
    await repo.updateMoodNote('missing', 'happy', 'x');
    expect(await repo.list()).toHaveLength(1);
  });

  it('keeps the 500-entry cap after updates', async () => {
    const repo = new SessionLogRepo();
    for (let i = 0; i < 501; i++) {
      await repo.add({ id: `s_${i}`, ...base });
    }
    await repo.updateMoodNote('s_500', 'happy', 'newest');
    const list = await repo.list();
    expect(list).toHaveLength(500);
    expect(list[list.length - 1].mood).toBe('happy');
  });
});

describe('WeeklyGoalRepo (v1.5 weekly-goals)', () => {
  const goal = {
    id: 'g1',
    presetId: null,
    targetSessions: 5,
    weekStart: '2026-08-10',
    schemaVersion: 1,
  };

  it('load null khi chưa đặt goal', async () => {
    const repo = new WeeklyGoalRepo();
    await expect(repo.load()).resolves.toBeNull();
  });

  it('round-trips save → load', async () => {
    const repo = new WeeklyGoalRepo();
    await repo.save(goal);
    const loaded = await repo.load();
    expect(loaded?.targetSessions).toBe(5);
    expect(loaded?.schemaVersion).toBe(1);
  });

  it('save thay thế goal cũ (single goal)', async () => {
    const repo = new WeeklyGoalRepo();
    await repo.save({ ...goal, id: 'g1', targetSessions: 3 });
    await repo.save({ ...goal, id: 'g2', targetSessions: 7, presetId: 'p1' });
    const loaded = await repo.load();
    expect(loaded?.id).toBe('g2');
    expect(loaded?.targetSessions).toBe(7);
    expect(loaded?.presetId).toBe('p1');
  });

  it('dữ liệu hỏng → null (no crash)', async () => {
    await AsyncStorage.setItem('looptimer:weekly-goal', 'not-json{');
    const repo = new WeeklyGoalRepo();
    await expect(repo.load()).resolves.toBeNull();
  });

  it('dữ liệu thiếu targetSessions → null', async () => {
    await AsyncStorage.setItem('looptimer:weekly-goal', JSON.stringify({ id: 'g1', weekStart: 'x' }));
    const repo = new WeeklyGoalRepo();
    await expect(repo.load()).resolves.toBeNull();
  });

  it('clear removes the goal', async () => {
    const repo = new WeeklyGoalRepo();
    await repo.save(goal);
    await repo.clear();
    await expect(repo.load()).resolves.toBeNull();
  });
});
