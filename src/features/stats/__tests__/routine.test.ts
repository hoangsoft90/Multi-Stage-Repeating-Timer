import { SessionLogEntry } from '../../../core/storage/repos';
import { DAY_MS, dayKey, hourBucket, suggestPresetForDayOfWeek, suggestPresetForNow } from '../stats';
import { weekDay } from '../../../core/time';

const NOW = Date.UTC(2026, 7, 9, 9, 0, 0); // 2026-08-09 09:00 — morning

function entry(opts: {
  id: string;
  presetId: string;
  endedAt: number;
}): SessionLogEntry {
  return {
    id: opts.id,
    presetId: opts.presetId,
    presetName: 'HIIT',
    startedAt: opts.endedAt - 60_000,
    endedAt: opts.endedAt,
    durationMs: 60_000,
    stageCount: 3,
    status: 'completed',
    schemaVersion: 1,
  };
}

describe('hourBucket', () => {
  it('maps 4 buckets correctly', () => {
    expect(hourBucket(0)).toBe('night');
    expect(hourBucket(8)).toBe('morning');
    expect(hourBucket(12)).toBe('afternoon');
    expect(hourBucket(17)).toBe('evening');
    expect(hourBucket(22)).toBe('night');
  });
});

describe('suggestPresetForNow', () => {
  it('suggests the preset most used in the current hour bucket (7d)', () => {
    const morningYesterday = dayKey(NOW) - DAY_MS + 8 * 3_600_000; // 8h hôm qua
    const entries = [
      entry({ id: 'a', presetId: 'hiit', endedAt: morningYesterday }),
      entry({ id: 'b', presetId: 'hiit', endedAt: dayKey(NOW) - DAY_MS * 2 + 8 * 3_600_000 }),
      entry({ id: 'c', presetId: 'pomo', endedAt: dayKey(NOW) - DAY_MS + 9 * 3_600_000 }),
    ];
    const result = suggestPresetForNow(entries, ['hiit', 'pomo'], NOW);
    expect(result?.presetId).toBe('hiit');
    expect(result?.hourBucket).toBe('morning');
    expect(result?.count).toBe(2);
  });

  it('returns null when the current bucket has no history', () => {
    // Only an afternoon session exists; now is morning → no suggestion.
    const entries = [entry({ id: 'a', presetId: 'hiit', endedAt: dayKey(NOW) + 14 * 3_600_000 })];
    expect(suggestPresetForNow(entries, ['hiit'], NOW)).toBeNull();
  });

  it('ignores presets not in the list and entries older than 7 days', () => {
    const old = dayKey(NOW) - 10 * DAY_MS + 8 * 3_600_000;
    const entries = [
      entry({ id: 'a', presetId: 'unknown', endedAt: dayKey(NOW) - DAY_MS + 8 * 3_600_000 }),
      entry({ id: 'b', presetId: 'hiit', endedAt: old }),
    ];
    expect(suggestPresetForNow(entries, ['hiit'], NOW)).toBeNull();
  });

  it('is deterministic for identical inputs', () => {
    const entries = [entry({ id: 'a', presetId: 'hiit', endedAt: dayKey(NOW) - DAY_MS + 8 * 3_600_000 })];
    const first = suggestPresetForNow(entries, ['hiit'], NOW);
    const second = suggestPresetForNow(entries, ['hiit'], NOW);
    expect(first).toEqual(second);
  });

  it('tie-breaks by most recent use', () => {
    const yesterday = dayKey(NOW) - DAY_MS;
    const twoDaysAgo = dayKey(NOW) - DAY_MS * 2;
    const entries = [
      entry({ id: 'a', presetId: 'hiit', endedAt: twoDaysAgo + 8 * 3_600_000 }),
      entry({ id: 'b', presetId: 'pomo', endedAt: yesterday + 9 * 3_600_000 }),
    ];
    const result = suggestPresetForNow(entries, ['hiit', 'pomo'], NOW);
    expect(result?.presetId).toBe('pomo');
  });
});

describe('suggestPresetForDayOfWeek', () => {
  // 2026-08-09 is a Sunday → weekDay(now) === 7.
  const sunday = 7;
  const sundayMorning = (weeksAgo: number) => dayKey(NOW) - weeksAgo * 7 * DAY_MS + 8 * 3_600_000;

  it('is deterministic and reports the matched weekday', () => {
    const entries = [entry({ id: 'a', presetId: 'hiit', endedAt: sundayMorning(1) })];
    const first = suggestPresetForDayOfWeek(entries, ['hiit'], NOW);
    const second = suggestPresetForDayOfWeek(entries, ['hiit'], NOW);
    expect(first).toEqual(second);
    expect(first?.weekDay).toBe(sunday);
  });

  it('suggests the preset most used on this weekday over 4 weeks', () => {
    const entries = [
      entry({ id: 'a', presetId: 'hiit', endedAt: sundayMorning(0) }),
      entry({ id: 'b', presetId: 'hiit', endedAt: sundayMorning(1) }),
      entry({ id: 'c', presetId: 'hiit', endedAt: sundayMorning(2) }),
      entry({ id: 'd', presetId: 'hiit', endedAt: sundayMorning(3) }),
      entry({ id: 'e', presetId: 'pomo', endedAt: sundayMorning(1) }),
    ];
    const result = suggestPresetForDayOfWeek(entries, ['hiit', 'pomo'], NOW);
    expect(result?.presetId).toBe('hiit');
    expect(result?.count).toBe(4);
  });

  it('ignores sessions on other weekdays', () => {
    // Saturday (weekDay 6) sessions — today is Sunday → no signal.
    const saturdayMorning = (weeksAgo: number) => dayKey(NOW) - (weeksAgo * 7 + 1) * DAY_MS + 8 * 3_600_000;
    const entries = [
      entry({ id: 'a', presetId: 'hiit', endedAt: saturdayMorning(1) }),
      entry({ id: 'b', presetId: 'hiit', endedAt: saturdayMorning(2) }),
    ];
    expect(suggestPresetForDayOfWeek(entries, ['hiit'], NOW)).toBeNull();
  });

  it('returns null when there is no session on this weekday in the window', () => {
    // Only a Tuesday session (outside any Sunday window).
    const tuesdayMorning = dayKey(NOW) - 2 * DAY_MS + 9 * 3_600_000;
    const entries = [entry({ id: 'a', presetId: 'hiit', endedAt: tuesdayMorning })];
    expect(suggestPresetForDayOfWeek(entries, ['hiit'], NOW)).toBeNull();
  });

  it('suggests from a single session (minimal signal)', () => {
    const entries = [entry({ id: 'a', presetId: 'pomo', endedAt: sundayMorning(1) })];
    const result = suggestPresetForDayOfWeek(entries, ['pomo'], NOW);
    expect(result?.presetId).toBe('pomo');
  });

  it('tie-breaks equal weekday counts by most recent use', () => {
    const entries = [
      entry({ id: 'a', presetId: 'hiit', endedAt: sundayMorning(1) }),
      entry({ id: 'b', presetId: 'hiit', endedAt: sundayMorning(3) }),
      entry({ id: 'c', presetId: 'pomo', endedAt: sundayMorning(2) }),
      entry({ id: 'd', presetId: 'pomo', endedAt: sundayMorning(0) }),
    ];
    // Both have 2 Sunday sessions; pomo was used most recently (today).
    const result = suggestPresetForDayOfWeek(entries, ['hiit', 'pomo'], NOW);
    expect(result?.presetId).toBe('pomo');
  });

  it('ignores sessions older than the weeks window and unknown presets', () => {
    const old = sundayMorning(5); // 5 weeks ago — outside the 4-week window.
    const entries = [
      entry({ id: 'a', presetId: 'unknown', endedAt: sundayMorning(1) }),
      entry({ id: 'b', presetId: 'hiit', endedAt: old }),
    ];
    expect(suggestPresetForDayOfWeek(entries, ['hiit'], NOW)).toBeNull();
  });

  it('matches the same hour bucket only (afternoon ≠ morning)', () => {
    const entries = [
      entry({ id: 'a', presetId: 'hiit', endedAt: sundayMorning(1) }),
      entry({ id: 'b', presetId: 'hiit', endedAt: dayKey(NOW) - 7 * DAY_MS + 14 * 3_600_000 }), // Sunday 14:00
    ];
    // Only the 08:00 session is in the morning bucket → count 1.
    const result = suggestPresetForDayOfWeek(entries, ['hiit'], NOW);
    expect(result?.count).toBe(1);
  });

  it('is consistent with weekDay helper (1=Mon..7=Sun)', () => {
    expect(weekDay(NOW)).toBe(7); // 2026-08-09 is a Sunday
  });
});
