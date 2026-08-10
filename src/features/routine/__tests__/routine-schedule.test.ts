import {
  RoutineSchedule,
  canSnooze,
  dateKey,
  effectiveMaxStageQueue,
  isMissed,
  nextTriggerAt,
  weekDay,
} from '../routine-schedule';

// routine-schedule.ts hosts the RoutineScheduleRepo (AsyncStorage) — mock the
// native module like the other repo tests do.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function schedule(overrides: Partial<RoutineSchedule> = {}): RoutineSchedule {
  return {
    id: 's1',
    presetId: 'p1',
    enabled: true,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    hour: 8,
    minute: 0,
    notificationMinutesBefore: [0],
    schemaVersion: 1,
    ...overrides,
  };
}

describe('weekDay / dateKey', () => {
  it('maps JS getDay (0=Sun) to 1=Mon..7=Sun', () => {
    // 2026-08-10 is a Monday.
    expect(weekDay(new Date(2026, 7, 10).getTime())).toBe(1);
    // 2026-08-09 is a Sunday.
    expect(weekDay(new Date(2026, 7, 9).getTime())).toBe(7);
  });

  it('formats dateKey as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 7, 10, 9, 30).getTime())).toBe('2026-08-10');
  });
});

describe('nextTriggerAt', () => {
  it('returns today at 08:00 when now is before it', () => {
    // Monday 2026-08-10 07:00.
    const now = new Date(2026, 7, 10, 7, 0).getTime();
    const at = nextTriggerAt(schedule(), now);
    expect(at).toBe(new Date(2026, 7, 10, 8, 0).getTime());
  });

  it('rolls to the next active day when today already passed', () => {
    // Monday 09:00 — today's 08:00 passed → next is Tuesday.
    const now = new Date(2026, 7, 10, 9, 0).getTime();
    const at = nextTriggerAt(schedule(), now);
    expect(at).toBe(new Date(2026, 7, 11, 8, 0).getTime());
  });

  it('skips weekend for Mon-Fri schedule', () => {
    // Friday 2026-08-14 09:00 → next is Monday 2026-08-17.
    const now = new Date(2026, 7, 14, 9, 0).getTime();
    const at = nextTriggerAt(schedule(), now);
    expect(at).toBe(new Date(2026, 7, 17, 8, 0).getTime());
  });

  it('applies notificationMinutesBefore to the fire time', () => {
    const s = schedule({ notificationMinutesBefore: [10] });
    const now = new Date(2026, 7, 10, 7, 0).getTime();
    const at = nextTriggerAt(s, now);
    expect(at).toBe(new Date(2026, 7, 10, 7, 50).getTime());
  });

  it('returns null when disabled or no days', () => {
    expect(nextTriggerAt(schedule({ enabled: false }))).toBeNull();
    expect(nextTriggerAt(schedule({ daysOfWeek: [] }))).toBeNull();
  });
});

describe('isMissed', () => {
  it('false before the fire time', () => {
    const now = new Date(2026, 7, 10, 7, 0).getTime(); // Monday 07:00
    expect(isMissed(schedule(), now)).toBe(false);
  });

  it('true after the fire time, same day, not handled', () => {
    const now = new Date(2026, 7, 10, 9, 0).getTime(); // Monday 09:00
    expect(isMissed(schedule(), now)).toBe(true);
  });

  it('false when already handled today', () => {
    const now = new Date(2026, 7, 10, 9, 0).getTime();
    expect(isMissed(schedule({ lastTriggeredDate: '2026-08-10' }), now)).toBe(false);
  });

  it('false on a non-scheduled day', () => {
    const now = new Date(2026, 7, 16, 9, 0).getTime(); // Sunday
    expect(isMissed(schedule(), now)).toBe(false);
  });

  it('counts the before-window fire time (notificationMinutesBefore)', () => {
    const s = schedule({ notificationMinutesBefore: [10] });
    // Notification fires 07:50 → at 07:55 it's already missed.
    expect(isMissed(s, new Date(2026, 7, 10, 7, 55).getTime())).toBe(true);
    // Trước 07:50 thì chưa missed.
    expect(isMissed(s, new Date(2026, 7, 10, 7, 45).getTime())).toBe(false);
  });
});

describe('snooze bounds + budget', () => {
  it('allows up to 3 snoozes then blocks', () => {
    expect(canSnooze(schedule())).toBe(true);
    expect(canSnooze(schedule({ snoozeCount: 2 }))).toBe(true);
    expect(canSnooze(schedule({ snoozeCount: 3 }))).toBe(false);
  });

  it('reserves reminder slots from the iOS stage queue', () => {
    // 64 - 10 reserved - 5 active = 49, but never below configured max (50→49).
    expect(effectiveMaxStageQueue(10, 5, 50)).toBe(49);
    // No schedules → 64 - 10 = 54, capped by configured 50.
    expect(effectiveMaxStageQueue(10, 0, 50)).toBe(50);
    // Heavy usage can't drop below the floor.
    expect(effectiveMaxStageQueue(10, 60, 50)).toBe(10);
  });
});
