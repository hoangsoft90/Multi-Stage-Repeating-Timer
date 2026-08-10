import { TimerEngine } from '../../../core/timer/engine';
import { Preset } from '../../../core/timer/models';
import { buildTimerSnapshot } from '../timer-snapshot';

function preset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p_hiit',
    name: 'HIIT 40/20',
    stages: [
      { id: 's1', name: 'WORK', durationSeconds: 40 },
      { id: 's2', name: 'REST', durationSeconds: 20 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 3,
    createdAt: 1,
    lastUsedAt: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

describe('buildTimerSnapshot', () => {
  it('returns null when there is no session', () => {
    const engine = new TimerEngine();
    expect(buildTimerSnapshot(engine.getState(), engine.getSession(), 'HIIT')).toBeNull();
  });

  it('captures running state (stage, round, remaining)', () => {
    const engine = new TimerEngine();
    engine.start(preset());
    const state = engine.getState();
    const snapshot = buildTimerSnapshot(state, engine.getSession(), 'HIIT 40/20');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.presetId).toBe('p_hiit');
    expect(snapshot?.presetName).toBe('HIIT 40/20');
    expect(snapshot?.stageName).toBe('WORK');
    expect(snapshot?.stageIndex).toBe(0);
    expect(snapshot?.totalStages).toBe(2);
    expect(snapshot?.round).toBe(1);
    expect(snapshot?.totalRounds).toBe(3);
    expect(snapshot?.status).toBe('running');
    expect(snapshot?.remainingMs).toBeGreaterThan(0);
    expect(snapshot?.stageEndsAt).not.toBeNull();
  });

  it('exposes the next stage name (spec: live-activity)', () => {
    const engine = new TimerEngine();
    engine.start(preset());
    const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), 'HIIT 40/20');
    expect(snapshot?.nextStageName).toBe('REST');
  });

  it('exposes an empty next stage on the last stage', () => {
    const engine = new TimerEngine();
    engine.start(preset({ repeatMode: 'once', fixedCount: null }));
    engine.skip(); // → REST (last stage)
    const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), 'HIIT 40/20');
    expect(snapshot?.nextStageName).toBe('');
  });

  it('normalizes infinite rounds to 1 but keeps the forever flag', () => {
    const engine = new TimerEngine();
    engine.start(preset({ repeatMode: 'forever', fixedCount: null }));
    const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), 'Loop');
    expect(snapshot?.totalRounds).toBe(1);
    expect(snapshot?.isForever).toBe(true);
  });

  it('clears the forever flag for finite repeats', () => {
    const engine = new TimerEngine();
    engine.start(preset());
    const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), 'HIIT 40/20');
    expect(snapshot?.isForever).toBe(false);
  });

  it('captures paused state', () => {
    const engine = new TimerEngine();
    engine.start(preset());
    engine.pause();
    const snapshot = buildTimerSnapshot(engine.getState(), engine.getSession(), 'HIIT 40/20');
    expect(snapshot?.status).toBe('paused');
    expect(snapshot?.remainingMs).toBeGreaterThan(0);
    expect(snapshot?.stageEndsAt).toBeNull();
  });
});
