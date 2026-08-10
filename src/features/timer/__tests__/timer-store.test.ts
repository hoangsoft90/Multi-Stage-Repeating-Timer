/**
 * Timer store unit tests (task 8.2 + 7.2):
 * - single active session
 * - persist-on-transition (session written to AsyncStorage)
 * - reconcile on restore from storage (kill/reboot recovery)
 * - recovery dialog choices (resume/restart preserves repeat mode/dismiss)
 * - deterministic notification IDs from the reschedule logic
 * - missed_transition instrumentation
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTimerStore } from '../timer-store';
import { usePresetsStore } from '../../presets/presets-store';
import { Preset, TimerSession } from '../../../core/timer/models';
import { SessionLogRepo } from '../../../core/storage/repos';
import { platformMock } from '../../../test-utils/platform-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../../platform', () => {
  const m = jest.requireActual('../../../test-utils/platform-mock');
  return m.platformMock;
});

// permissions.ts pulls expo-intent-launcher at import time — stub it out.
jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue(undefined),
}));

const KEY_SESSION = 'looptimer:session';

function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p_test',
    name: 'Test',
    stages: [
      { id: 's1', name: 'WORK', durationSeconds: 60 },
      { id: 's2', name: 'BREAK', durationSeconds: 10 },
    ],
    repeatMode: 'forever',
    fixedCount: null,
    createdAt: 1,
    lastUsedAt: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

/** A RUNNING session whose stage ends ~5s in the future. */
function makeRunningSession(overrides: Partial<TimerSession> = {}): TimerSession {
  const now = Date.now();
  return {
    id: 'sess_restored',
    presetId: 'p_test',
    stagesSnapshot: [
      { id: 's1', name: 'WORK', durationSeconds: 60 },
      { id: 's2', name: 'BREAK', durationSeconds: 10 },
    ],
    currentStageIndex: 1,
    currentRound: 2,
    status: 'running',
    dateStarted: now - 70_000,
    stageEndsAt: now + 5_000,
    pausedRemainingMs: null,
    completedAt: null,
    createdAt: now - 70_000,
    schemaVersion: 1,
    ...overrides,
  };
}

async function flushAsync(): Promise<void> {
  // persistSession / scheduler calls are fire-and-forget inside the store.
  await new Promise((r) => setTimeout(r, 0));
}

async function stopIfActive(): Promise<void> {
  const st = useTimerStore.getState();
  if (st.state.status === 'running' || st.state.status === 'paused') {
    await st.stop();
  }
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

afterEach(async () => {
  await stopIfActive();
  await AsyncStorage.clear();
  // Reset state seeded by tests (e.g. the recovery-presetName test) so the
  // module-level presets store doesn't leak into later tests.
  usePresetsStore.setState({ presets: [], loaded: false });
});

describe('startPreset', () => {
  it('starts running with the first stage', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(makePreset());
    const st = useTimerStore.getState();
    expect(st.state.status).toBe('running');
    expect(st.state.currentStage?.name).toBe('WORK');
    expect(st.state.currentRound).toBe(1);
    expect(st.recovery).toBeNull();
  });

  it('enforces a single active session (starting a new one stops the old)', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(makePreset({ id: 'pA' }));
    const first = useTimerStore.getState().state.session?.id;
    await startPreset(makePreset({ id: 'pB' }));
    const st = useTimerStore.getState();
    expect(st.state.session?.id).not.toBe(first);
    expect(st.state.session?.presetId).toBe('pB');
  });

  it('persists the session snapshot to AsyncStorage', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(makePreset({ repeatMode: 'fixedCount', fixedCount: 8 }));
    await flushAsync();
    const raw = await AsyncStorage.getItem(KEY_SESSION);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!);
    expect(persisted.session.status).toBe('running');
    expect(persisted.session.currentStageIndex).toBe(0);
    expect(persisted.repeatMode).toBe('fixedCount');
    expect(persisted.fixedCount).toBe(8);
  });

  it('requests ATT after the first value-moment', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(makePreset());
    await flushAsync();
    expect(platformMock.att.requestTrackingPermission).toHaveBeenCalled();
  });

  it('persists ONLY at transitions — ticks never write to storage', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    await flushAsync();
    const before = await AsyncStorage.getItem(KEY_SESSION);
    expect(before).not.toBeNull();
    // Simulate many render ticks (no transitions in a 60s stage).
    for (let i = 0; i < 5; i++) {
      store.tick();
    }
    await flushAsync();
    expect(await AsyncStorage.getItem(KEY_SESSION)).toBe(before);
  });
});

describe('control commands', () => {
  it('pause freezes remaining and cancels notifications', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    const remainingBefore = useTimerStore.getState().state.remainingMs;
    store.pause();
    const st = useTimerStore.getState();
    expect(st.state.status).toBe('paused');
    expect(st.state.pausedRemainingMs).toBeGreaterThan(0);
    expect(remainingBefore).toBeGreaterThan(0);
    expect(platformMock.scheduler.cancelAll).toHaveBeenCalled();
    expect(platformMock.wakeLock.deactivate).toHaveBeenCalled();
  });

  it('resume reschedules with the SAME deterministic notification id (same round/stage)', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    const firstId = platformMock.scheduler.scheduleAt.mock.calls[0]?.[1];
    expect(firstId).toMatch(/^session_.+_1_0$/);
    store.pause();
    platformMock.scheduler.scheduleAt.mockClear();
    store.resume();
    await flushAsync();
    const resumeId = platformMock.scheduler.scheduleAt.mock.calls[0]?.[1];
    expect(resumeId).toBe(firstId); // deterministic across pause/resume
  });

  it('skip advances one stage and reschedules with the new stage index', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    const firstId = platformMock.scheduler.scheduleAt.mock.calls[0]?.[1];
    platformMock.scheduler.scheduleAt.mockClear();
    store.skip();
    await flushAsync();
    const st = useTimerStore.getState();
    expect(st.state.currentStage?.name).toBe('BREAK');
    const skipId = platformMock.scheduler.scheduleAt.mock.calls[0]?.[1];
    expect(skipId).toMatch(/^session_.+_1_1$/);
    expect(skipId).not.toBe(firstId);
  });

  it('stop clears the persisted session', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    await flushAsync();
    expect(await AsyncStorage.getItem(KEY_SESSION)).not.toBeNull();
    await store.stop();
    expect(useTimerStore.getState().state.status).toBe('stopped');
    expect(await AsyncStorage.getItem(KEY_SESSION)).toBeNull();
    expect(platformMock.scheduler.cancelAll).toHaveBeenCalled();
  });

  it('pause syncs a PAUSED widget snapshot (spec: home-widget R1)', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    store.pause();
    await flushAsync();
    const calls = platformMock.widgetBridge.updateTimerSnapshot.mock.calls.map((c) => c[0]);
    const last = calls[calls.length - 1];
    expect(last).not.toBeNull();
    expect(last.status).toBe('paused');
    expect(last.presetId).toBe('p_test');
  });
});

describe('restore + recovery (reconcile on cold start)', () => {
  async function persistSession(session: TimerSession, repeat?: { repeatMode: string; fixedCount?: number | null }) {
    await AsyncStorage.setItem(
      KEY_SESSION,
      JSON.stringify({
        session,
        repeatMode: repeat?.repeatMode ?? 'once',
        fixedCount: repeat?.fixedCount ?? null,
      }),
    );
  }

  it('initFromStorage on a RUNNING session → pending recovery with reconciled state', async () => {
    await persistSession(makeRunningSession(), { repeatMode: 'forever', fixedCount: null });
    await useTimerStore.getState().initFromStorage();
    const st = useTimerStore.getState();
    expect(st.state.status).toBe('running');
    expect(st.state.currentStage?.name).toBe('BREAK'); // restored at index 1
    expect(st.state.currentRound).toBe(2);
    expect(st.recovery).toMatchObject({ pending: true, completedWhileAway: false, stageName: 'BREAK' });
    expect(st.recovery!.remainingMs).toBeGreaterThan(0);
    expect(st.recovery!.remainingMs).toBeLessThanOrEqual(5000);
    // cold-start reschedule fires with a deterministic id
    const id = platformMock.scheduler.scheduleAt.mock.calls[0]?.[1];
    expect(id).toMatch(/^sess_restored_2_1$/);
  });

  it('initFromStorage on a stale COMPLETED session → cleared, no recovery', async () => {
    const s = makeRunningSession({ status: 'completed', completedAt: Date.now(), stageEndsAt: null });
    await persistSession(s);
    await useTimerStore.getState().initFromStorage();
    const st = useTimerStore.getState();
    expect(st.recovery).toBeNull();
    expect(await AsyncStorage.getItem(KEY_SESSION)).toBeNull();
  });

  it('initFromStorage on a stale STOPPED session → cleared', async () => {
    await persistSession(makeRunningSession({ status: 'stopped', stageEndsAt: null }));
    await useTimerStore.getState().initFromStorage();
    expect(useTimerStore.getState().recovery).toBeNull();
    expect(await AsyncStorage.getItem(KEY_SESSION)).toBeNull();
  });

  it('initFromStorage on a PAUSED session → recovery offers resume', async () => {
    await persistSession(
      makeRunningSession({ status: 'paused', stageEndsAt: null, pausedRemainingMs: 42_000 }),
    );
    await useTimerStore.getState().initFromStorage();
    const st = useTimerStore.getState();
    expect(st.state.status).toBe('paused');
    expect(st.recovery).toMatchObject({ pending: true, completedWhileAway: false });
    // resume via the dialog
    st.resolveRecovery('resume');
    const after = useTimerStore.getState();
    expect(after.state.status).toBe('running');
    expect(after.recovery).toBeNull();
  });

  it('recovery restart PRESERVES repeat mode (fixedCount 8 → 8 rounds)', async () => {
    const now = Date.now();
    await persistSession(
      makeRunningSession({
        currentStageIndex: 0,
        currentRound: 3,
        stageEndsAt: now + 5_000,
        dateStarted: now - 10_000,
        createdAt: now - 10_000,
      }),
      { repeatMode: 'fixedCount', fixedCount: 8 },
    );
    await useTimerStore.getState().initFromStorage();
    useTimerStore.getState().resolveRecovery('restart');
    const st = useTimerStore.getState();
    expect(st.state.status).toBe('running');
    expect(st.state.totalRounds).toBe(8);
    expect(st.state.currentRound).toBe(1);
  });

  it('recovery dismiss stops and clears', async () => {
    await persistSession(makeRunningSession());
    await useTimerStore.getState().initFromStorage();
    useTimerStore.getState().resolveRecovery('dismiss');
    const st = useTimerStore.getState();
    expect(st.state.status).toBe('stopped');
    expect(st.recovery).toBeNull();
    expect(await AsyncStorage.getItem(KEY_SESSION)).toBeNull();
  });

  it('completion presetName resolves from the presets store after recovery restart (not a stale var)', async () => {
    // Restored session whose preset is NOT tracked by the module-level name
    // variable — the store must resolve the real name from the presets repo.
    await persistSession(makeRunningSession({ presetId: 'p_restored' }), { repeatMode: 'once', fixedCount: null });
    usePresetsStore.setState({
      presets: [
        {
          id: 'p_restored',
          name: 'Restored HIIT',
          stages: [
            { id: 'a', name: 'WORK', durationSeconds: 60 },
            { id: 'b', name: 'BREAK', durationSeconds: 10 },
          ],
          repeatMode: 'once',
          fixedCount: null,
          createdAt: 1,
          lastUsedAt: 1,
          schemaVersion: 1,
        },
      ],
      loaded: true,
    });
    await useTimerStore.getState().initFromStorage();
    useTimerStore.getState().resolveRecovery('restart');
    // Single-stage skip through the whole 'once' sequence → SessionCompleted.
    useTimerStore.getState().skip();
    useTimerStore.getState().skip();
    await flushAsync();
    await flushAsync();
    const completion = useTimerStore.getState().completion;
    expect(completion?.presetName).toBe('Restored HIIT');
    expect(completion?.streak).toBeGreaterThanOrEqual(1);
  });
});

describe('missed_transition instrumentation', () => {
  it('reports a non-missed transition on skip (StageCompleted then StageStarted)', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset());
    expect(platformMock.observability.trackTransition).not.toHaveBeenCalled();
    store.skip();
    await flushAsync();
    expect(platformMock.observability.trackTransition).toHaveBeenCalledWith(false);
  });
});

describe('forever repeat (v1.3, spec: forever-ui)', () => {
  it('forever session stop thủ công → completion null (không dialog)', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset()); // repeatMode: 'forever'
    // Many skips never emit SessionCompleted for a forever session.
    store.skip();
    store.skip();
    store.skip();
    await flushAsync();
    expect(useTimerStore.getState().completion).toBeNull();
    await store.stop();
    expect(useTimerStore.getState().completion).toBeNull();
    expect(useTimerStore.getState().state.status).toBe('stopped');
  });

  it('forever session dừng thủ công → session log status=stopped + presetName đúng', async () => {
    const store = useTimerStore.getState();
    await store.startPreset(makePreset({ id: 'p_forever', name: 'Forever' }));
    await store.stop();
    await flushAsync();
    await flushAsync();
    const logs = await new SessionLogRepo().list();
    const last = logs[logs.length - 1];
    expect(last.status).toBe('stopped');
    expect(last.presetName).toBe('Forever');
  });
});
