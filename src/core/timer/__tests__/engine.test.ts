import { FakeClock } from '../clock';
import { TimerEngine } from '../engine';
import { TimerEvent } from '../events';
import { Preset, Stage } from '../models';

function stage(name: string, durationSeconds: number): Stage {
  return { id: `s_${name}`, name, durationSeconds };
}

function preset(
  stages: Stage[],
  repeatMode: Preset['repeatMode'] = 'once',
  fixedCount: number | null = null,
): Preset {
  return {
    id: 'p1',
    name: 'Test',
    stages,
    repeatMode,
    fixedCount,
    createdAt: 0,
    lastUsedAt: 0,
    schemaVersion: 1,
  };
}

const MIN = 60 * 1000;
const SEC = 1000;

describe('TimerEngine — state machine', () => {
  it('starts IDLE with no runtime timing fields', () => {
    const engine = new TimerEngine(new FakeClock());
    const s = engine.getState();
    expect(s.status).toBe('idle');
    expect(s.session).toBeNull();
    expect(s.stageEndsAt).toBeNull();
    expect(s.pausedRemainingMs).toBeNull();
  });

  it('start -> RUNNING with stageEndsAt and no pausedRemaining', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('WORK', 60)]));
    const s = engine.getState();
    expect(s.status).toBe('running');
    expect(s.stageEndsAt).toBe(clock.now().getTime() + 60 * SEC);
    expect(s.pausedRemainingMs).toBeNull();
  });

  it('pause then resume does not drift', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('WORK', 60)]));
    clock.advance(30 * SEC);
    engine.pause();
    let s = engine.getState();
    expect(s.status).toBe('paused');
    expect(s.pausedRemainingMs).toBe(30 * SEC);
    expect(s.stageEndsAt).toBeNull();
    clock.advance(2 * MIN); // pause a long time
    engine.resume();
    s = engine.getState();
    expect(s.status).toBe('running');
    // stageEndsAt = now + pausedRemaining → total stage time is unchanged (60s)
    expect(s.stageEndsAt).toBe(clock.now().getTime() + 30 * SEC);
    expect(s.remainingMs).toBe(30 * SEC);
  });
});

describe('TimerEngine — remaining', () => {
  it('remaining never negative after stage end', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('WORK', 10)]));
    clock.advance(20 * SEC); // beyond end
    const s = engine.getState();
    expect(s.remainingMs).toBe(0);
  });
});

describe('TimerEngine — reconcile catch-up', () => {
  it('catches up ALL expired stages in one reconcile (missed K)', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 10), stage('B', 10), stage('C', 10), stage('D', 10)]));
    clock.advance(35 * SEC); // A, B, C all expired by schedule
    engine.reconcile();
    const s = engine.getState();
    expect(s.status).toBe('running');
    expect(s.currentStage?.name).toBe('D');
    expect(s.currentStageIndex).toBe(3);
    // Landed stage re-anchors to now + duration (fresh full duration)
    expect(s.remainingMs).toBe(10 * SEC);
    // All missed stages emitted exactly once
    const completed = events.filter((e) => e.type === 'StageCompleted');
    expect(completed.map((e) => (e as { name: string }).name)).toEqual(['A', 'B', 'C']);
    // Single StageStarted for the landed stage (D)
    const started = events.filter((e) => e.type === 'StageStarted');
    expect(started.map((e) => (e as { name: string }).name)).toEqual(['A', 'D']);
  });

  it('reconcile called twice with same now does not double-advance', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 10), stage('B', 10)]));
    clock.advance(15 * SEC);
    engine.reconcile();
    const afterFirst = engine.getState();
    engine.reconcile(); // same now
    const afterSecond = engine.getState();
    expect(afterSecond.currentStageIndex).toBe(afterFirst.currentStageIndex);
    expect(events.filter((e) => e.type === 'StageCompleted')).toHaveLength(1);
  });

  it('completes session when last stage expires', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 10)]));
    clock.advance(11 * SEC);
    engine.reconcile();
    const s = engine.getState();
    expect(s.status).toBe('completed');
    expect(s.session?.completedAt).not.toBeNull();
    expect(events.some((e) => e.type === 'SessionCompleted')).toBe(true);
  });
});

describe('TimerEngine — repeat modes', () => {
  it('once finishes after one round', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('A', 10), stage('B', 10)], 'once'));
    clock.advance(25 * SEC);
    engine.reconcile();
    expect(engine.getState().status).toBe('completed');
  });

  it('fixedCount completes only after N rounds and emits RoundCompleted', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 10), stage('B', 10)], 'fixedCount', 3));
    // Round 1: A(0-10) B(10-20); Round 2: A(20-30) B(30-40); Round 3: A(40-50) B(50-60)
    clock.advance(45 * SEC);
    engine.reconcile();
    let s = engine.getState();
    expect(s.status).toBe('running');
    expect(s.currentRound).toBe(3);
    expect(events.filter((e) => e.type === 'RoundCompleted')).toHaveLength(2);
    clock.advance(20 * SEC);
    engine.reconcile();
    s = engine.getState();
    expect(s.status).toBe('completed');
    expect(events.filter((e) => e.type === 'RoundCompleted')).toHaveLength(3);
  });

  it('forever never completes', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 10), stage('B', 10)], 'forever'));
    clock.advance(1000 * SEC);
    engine.reconcile();
    const s = engine.getState();
    expect(s.status).toBe('running');
    expect(events.some((e) => e.type === 'SessionCompleted')).toBe(false);
    expect(events.filter((e) => e.type === 'RoundCompleted').length).toBeGreaterThan(0);
  });
});

describe('TimerEngine — skip', () => {
  it('skip mid-stage advances to next stage', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('A', 60), stage('B', 60)]));
    clock.advance(10 * SEC);
    engine.skip();
    const s = engine.getState();
    expect(s.currentStage?.name).toBe('B');
    expect(s.currentStageIndex).toBe(1);
  });

  it('skip last stage of last round completes session', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 60), stage('B', 60)]));
    engine.skip();
    engine.skip();
    const s = engine.getState();
    expect(s.status).toBe('completed');
    expect(events.some((e) => e.type === 'SessionCompleted')).toBe(true);
  });

  it('skip across round boundary increments round', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('A', 60), stage('B', 60)], 'fixedCount', 2));
    engine.skip(); // A -> B (round 1)
    engine.skip(); // B -> round 2 A
    const s = engine.getState();
    expect(s.currentRound).toBe(2);
    expect(s.currentStage?.name).toBe('A');
  });
});

describe('TimerEngine — race expire + skip', () => {
  it('expire then immediate skip does not double-advance beyond intent', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 10), stage('B', 10), stage('C', 10)]));
    clock.advance(11 * SEC); // A expired
    engine.reconcile(); // -> B
    engine.skip(); // user skips B too -> C (exactly one logical skip)
    const s = engine.getState();
    expect(s.currentStage?.name).toBe('C');
    // A completed once, B completed once (via skip), C started once
    expect(events.filter((e) => e.type === 'StageCompleted')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'StageStarted')).toHaveLength(3);
  });
});

describe('TimerEngine — stop', () => {
  it('stop from paused clears timing fields and emits SessionStopped', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 60)]));
    engine.pause();
    engine.stop();
    const s = engine.getState();
    expect(s.status).toBe('stopped');
    expect(s.stageEndsAt).toBeNull();
    expect(s.pausedRemainingMs).toBeNull();
    expect(events.some((e) => e.type === 'SessionStopped')).toBe(true);
  });
});

describe('TimerEngine — restore + clock change', () => {
  it('restore then reconcile catches up stages missed during restart', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('A', 10), stage('B', 10), stage('C', 60)]));
    clock.advance(12 * SEC);
    engine.reconcile(); // on B (re-anchored)
    const snapshot = engine.getSession()!;

    // simulate app restart with a fresh engine + new clock 15s later
    const clock2 = new FakeClock(new Date(clock.now().getTime() + 15 * SEC));
    const engine2 = new TimerEngine(clock2);
    engine2.restore(snapshot, undefined, clock2.now());
    engine2.reconcile();
    const s = engine2.getState();
    expect(s.status).toBe('running');
    expect(s.currentStage?.name).toBe('C'); // B expired during restart, C running
  });

  it('restore of a finished-while-away routine converges to completed', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('A', 10), stage('B', 10), stage('C', 10)]));
    clock.advance(12 * SEC);
    engine.reconcile(); // on B
    const snapshot = engine.getSession()!;

    // app reopened way after the whole sequence (30s) would have ended
    const clock2 = new FakeClock(new Date(clock.now().getTime() + 60 * SEC));
    const engine2 = new TimerEngine(clock2);
    engine2.restore(snapshot, undefined, clock2.now());
    engine2.reconcile();
    expect(engine2.getState().status).toBe('completed');
    expect(engine2.getState().session?.completedAt).not.toBeNull();
  });

  it('system clock moved back is best-effort: state converges on next reconcile', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    engine.start(preset([stage('A', 60)]));
    clock.advance(30 * SEC);
    clock.jumpTo(new Date(clock.now().getTime() - 10 * MIN)); // clock moved BACK
    engine.reconcile();
    const s = engine.getState();
    // Absolute-end semantics: stage extends, remaining recomputed from new now
    expect(s.status).toBe('running');
    expect(s.remainingMs).toBeGreaterThan(30 * SEC);
  });
});

describe('TimerEngine — persist only on transition', () => {
  it('does not emit transition events on plain getState ticks', () => {
    const clock = new FakeClock();
    const engine = new TimerEngine(clock);
    const events: TimerEvent[] = [];
    engine.events.subscribe((e) => events.push(e));
    engine.start(preset([stage('A', 60)]));
    engine.getState();
    engine.getState();
    clock.advance(5 * SEC);
    engine.getState();
    // only the initial StageStarted
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('StageStarted');
  });
});
