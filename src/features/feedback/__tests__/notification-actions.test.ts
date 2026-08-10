/**
 * Notification cold-start actions (spec: notification-cold-start) — verifies
 * the shared handler hydrates, reconciles, applies the action and returns the
 * right destination, plus the FGS trigger bridge.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TimerEngine } from '../../../core/timer/engine';
import { Preset } from '../../../core/timer/models';
import { useTimerStore } from '../../timer/timer-store';
import { usePresetsStore } from '../../presets/presets-store';
import { useRoutineStore } from '../../routine/routine-store';
import { platformMock } from '../../../test-utils/platform-mock';
import { notifyMissedRateHigh, resetFgsListenersForTest, subscribeMissedRateHigh } from '../../background/fgs-trigger';
import { applyTimerAction, handleColdStartResponse } from '../notification-actions';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../../platform', () => {
  const m = jest.requireActual('../../../test-utils/platform-mock');
  return m.platformMock;
});

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue(undefined),
}));

function preset(): Preset {
  return {
    id: 'p1',
    name: 'HIIT',
    stages: [{ id: 's1', name: 'WORK', durationSeconds: 60 }],
    repeatMode: 'once',
    fixedCount: null,
    createdAt: 1,
    lastUsedAt: 1,
    schemaVersion: 1,
  };
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(async () => {
  jest.clearAllMocks();
  resetFgsListenersForTest();
  await AsyncStorage.clear();
  usePresetsStore.setState({ presets: [], loaded: false });
  useRoutineStore.setState({ schedules: [], loaded: false });
});

afterEach(async () => {
  const st = useTimerStore.getState();
  if (st.state.status === 'running' || st.state.status === 'paused') await st.stop();
  await AsyncStorage.clear();
});

describe('applyTimerAction', () => {
  it('stops an active session and returns home', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(preset());
    await flush();
    expect(useTimerStore.getState().state.status).toBe('running');

    const dest = await applyTimerAction('stop');
    expect(dest).toBe('/');
    expect(useTimerStore.getState().state.status).toBe('stopped');
  });

  it('pauses a running session and returns /timer', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(preset());
    await flush();

    const dest = await applyTimerAction('pause');
    expect(dest).toBe('/timer');
    expect(useTimerStore.getState().state.status).toBe('paused');
  });

  it('returns / when no session is active', async () => {
    const dest = await applyTimerAction('stop');
    expect(dest).toBe('/');
  });
});

describe('handleColdStartResponse', () => {
  it('applies the pending action from getLastNotificationResponse', async () => {
    const { startPreset } = useTimerStore.getState();
    await startPreset(preset());
    await flush();
    await useTimerStore.getState().stop();
    await flush();

    // Simulate a fresh process with a pending 'stop' response.
    jest.clearAllMocks();
    (platformMock.notifications.getLastNotificationResponse as jest.Mock).mockResolvedValue({
      actionId: 'stop',
    });
    // The store still has an active session? No — re-create one like cold start.
    await useTimerStore.getState().startPreset(preset());
    await flush();

    const nav = jest.fn();
    await handleColdStartResponse(nav);
    await flush();
    expect(nav).toHaveBeenCalledWith('/');
    expect(useTimerStore.getState().state.status).toBe('stopped');
  });

  it('reminder_start từ cold start → start preset + markHandled + navigate /timer (v1.3)', async () => {
    await usePresetsStore.getState().save(preset());
    await useRoutineStore.getState().save({
      id: 'sched_1',
      presetId: 'p1',
      enabled: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      hour: 8,
      minute: 0,
      notificationMinutesBefore: [0],
      schemaVersion: 1,
    });
    jest.clearAllMocks();
    (platformMock.notifications.getLastNotificationResponse as jest.Mock).mockResolvedValue({
      actionId: 'reminder_start',
      notificationId: 'routine_sched_1',
    });
    const nav = jest.fn();
    await handleColdStartResponse(nav);
    await flush();
    expect(nav).toHaveBeenCalledWith('/timer');
    expect(useTimerStore.getState().state.status).toBe('running');
    expect(useTimerStore.getState().state.session?.presetId).toBe('p1');
    // Đã mark handled cho hôm nay (missed-no-punish).
    expect(useRoutineStore.getState().schedules[0].lastTriggeredDate).toBeTruthy();
  });

  it('does nothing when there is no pending response', async () => {
    (platformMock.notifications.getLastNotificationResponse as jest.Mock).mockResolvedValue(null);
    const nav = jest.fn();
    await handleColdStartResponse(nav);
    expect(nav).not.toHaveBeenCalled();
  });
});

describe('FGS trigger bridge', () => {
  it('notifies subscribers on missed-rate-high', () => {
    const cb = jest.fn();
    const unsub = subscribeMissedRateHigh(cb);
    notifyMissedRateHigh();
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    notifyMissedRateHigh();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
