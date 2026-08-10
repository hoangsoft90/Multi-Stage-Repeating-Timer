import { exceedsNotificationWindow, estimatedCoverageMs } from '../coverage';
import { Preset } from '../../../core/timer/models';

function preset(stages: number, repeatMode: Preset['repeatMode'], fixedCount: number | null): Preset {
  return {
    id: 'p',
    name: 'P',
    stages: Array.from({ length: stages }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      durationSeconds: 30,
    })),
    repeatMode,
    fixedCount,
    createdAt: 0,
    lastUsedAt: 0,
    schemaVersion: 1,
  };
}

describe('CoverageCalculator', () => {
  it('finite short preset does not exceed window', () => {
    expect(exceedsNotificationWindow(preset(2, 'once', null))).toBe(false);
  });
  it('forever preset exceeds window', () => {
    expect(exceedsNotificationWindow(preset(2, 'forever', null))).toBe(true);
  });
  it('many rounds exceed window', () => {
    expect(exceedsNotificationWindow(preset(2, 'fixedCount', 100))).toBe(true);
  });
  it('estimates coverage = sum of next 50 transitions', () => {
    const ms = estimatedCoverageMs(preset(2, 'forever', null), 50);
    expect(ms).toBe(50 * 30 * 1000);
  });
  it('empty preset has zero coverage', () => {
    const p = preset(2, 'once', null);
    p.stages = [];
    expect(estimatedCoverageMs(p)).toBe(0);
  });
});
