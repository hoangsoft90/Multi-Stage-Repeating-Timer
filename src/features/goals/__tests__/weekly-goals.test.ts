/**
 * Weekly goal helpers (v1.5, spec: weekly-goals) — pure, deterministic tests
 * for the Monday-start week math and progress counting.
 */
import { currentWeekProgress, mondayKey, weekKey, createGoalId } from '../weekly-goals';
import { SessionLogEntry, WeeklyGoal } from '../../../core/storage/repos';

function goal(overrides: Partial<WeeklyGoal> = {}): WeeklyGoal {
  return {
    id: 'g1',
    presetId: null,
    targetSessions: 5,
    weekStart: '2026-08-10',
    schemaVersion: 1,
    ...overrides,
  };
}

function entry(
  endedAt: number,
  status: SessionLogEntry['status'] = 'completed',
  presetId = 'p1',
): SessionLogEntry {
  return {
    id: `s_${endedAt}`,
    presetId,
    presetName: 'P',
    startedAt: endedAt - 1000,
    endedAt,
    durationMs: 1000,
    stageCount: 1,
    status,
    schemaVersion: 1,
  };
}

// All timestamps are built with the LOCAL timezone constructor so they stay
// consistent with the local-time logic inside the helpers.
const MON = new Date(2026, 7, 10, 12, 0).getTime(); // Monday 2026-08-10 12:00

describe('mondayKey / weekKey', () => {
  it('mondayKey trả về đầu ngày Thứ 2 của tuần chứa ts', () => {
    expect(mondayKey(MON)).toBe(new Date(2026, 7, 10).getTime());
    // Sunday 2026-08-16 vẫn thuộc tuần bắt đầu 10/08.
    expect(mondayKey(new Date(2026, 7, 16, 23, 0).getTime())).toBe(new Date(2026, 7, 10).getTime());
    // Thứ 2 tuần sau 2026-08-17 → tuần mới.
    expect(mondayKey(new Date(2026, 7, 17, 0, 30).getTime())).toBe(new Date(2026, 7, 17).getTime());
  });

  it('weekKey format YYYY-MM-DD của Monday', () => {
    expect(weekKey(MON)).toBe('2026-08-10');
    expect(weekKey(new Date(2026, 7, 16, 12, 0).getTime())).toBe('2026-08-10');
  });

  it('createGoalId tạo id duy nhất', () => {
    expect(createGoalId()).toMatch(/^goal_/);
    expect(createGoalId()).not.toBe(createGoalId());
  });
});

describe('currentWeekProgress', () => {
  it('đếm session completed trong tuần hiện tại; không tính tuần trước/tuần sau', () => {
    const entries = [
      entry(MON + 3_600_000), // Monday this week ✓
      entry(MON + 86_400_000), // Tuesday ✓
      entry(MON - 86_400_000 - 3_600_000), // Sunday 09/08 11:00 ✗ (previous week)
      entry(MON + 7 * 86_400_000 + 1), // next Monday ✗
    ];
    expect(currentWeekProgress(entries, goal(), MON)).toEqual({ completed: 2, target: 5 });
  });

  it('chỉ tính status completed — stopped không tính', () => {
    const entries = [entry(MON, 'completed'), entry(MON + 1000, 'stopped')];
    expect(currentWeekProgress(entries, goal(), MON).completed).toBe(1);
  });

  it('lọc theo presetId khi goal chỉ áp dụng 1 preset', () => {
    const entries = [entry(MON, 'completed', 'p1'), entry(MON + 1000, 'completed', 'p2')];
    expect(currentWeekProgress(entries, goal({ presetId: 'p1' }), MON).completed).toBe(1);
    expect(currentWeekProgress(entries, goal({ presetId: 'p2' }), MON).completed).toBe(1);
    // null presetId = tất cả preset.
    expect(currentWeekProgress(entries, goal({ presetId: null }), MON).completed).toBe(2);
  });

  it('clamp target 1..99', () => {
    expect(currentWeekProgress([], goal({ targetSessions: 0 }), MON).target).toBe(1);
    expect(currentWeekProgress([], goal({ targetSessions: 150 }), MON).target).toBe(99);
  });

  it('deterministic + rỗng', () => {
    expect(currentWeekProgress([], goal(), MON)).toEqual({ completed: 0, target: 5 });
    expect(currentWeekProgress([entry(MON)], goal(), MON)).toEqual({ completed: 1, target: 5 });
    expect(currentWeekProgress([entry(MON)], goal(), MON)).toEqual({ completed: 1, target: 5 });
  });
});
