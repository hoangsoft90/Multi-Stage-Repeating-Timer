/**
 * Widget + Live Activity interaction (spec: android-widget R2 / live-activity
 * R3) — verifies the idle quick-start flow (suggested preset resolution +
 * hydrate → never overwrite a running session → start preset → navigate) and
 * the control taps (Pause/Skip/Resume/Stop applied in place from both the
 * home widget and the Live Activity). The expo-widgets native listener itself
 * is lazy + no-op outside dev builds (covered by the try/catch in
 * subscribeWidgetInteraction — not unit-tested).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Preset } from '../../../core/timer/models';
import { useTimerStore } from '../../timer/timer-store';
import { usePresetsStore } from '../../presets/presets-store';
import { platformMock } from '../../../test-utils/platform-mock';
import { ACTIVITY_SKIP_TARGET } from '../activity-content';
import { WIDGET_PAUSE_TARGET, WIDGET_RESUME_TARGET, WIDGET_STOP_TARGET } from '../widget-data';
import { applyControlAction, handleWidgetStartTap } from '../widget-interaction';
import { resolveQuickStartPresetId } from '../quick-start-preset';

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

function preset(id = 'p1', lastUsedAt = 100, stageCount = 1): Preset {
  const stages = Array.from({ length: stageCount }, (_, i) => ({
    id: `s${i + 1}`,
    name: i === 0 ? 'WORK' : 'REST',
    durationSeconds: 60,
  }));
  return {
    id,
    name: 'HIIT',
    stages,
    repeatMode: 'once',
    fixedCount: null,
    createdAt: 1,
    lastUsedAt,
    schemaVersion: 1,
  };
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePresetsStore.setState({ presets: [], loaded: false });
});

afterEach(async () => {
  const st = useTimerStore.getState();
  if (st.state.status === 'running' || st.state.status === 'paused') await st.stop();
  await AsyncStorage.clear();
});

describe('resolveQuickStartPresetId', () => {
  it('prefers the favorite over the most recent', () => {
    usePresetsStore.setState({
      presets: [{ ...preset('a', 50) }, { ...preset('fav', 10), isFavorite: true }],
    });
    expect(resolveQuickStartPresetId()).toBe('fav');
  });

  it('falls back to the most recently used preset', () => {
    usePresetsStore.setState({ presets: [preset('a', 50), preset('b', 200)] });
    expect(resolveQuickStartPresetId()).toBe('b');
  });

  it('returns empty when there are no user presets', () => {
    usePresetsStore.setState({ presets: [] });
    expect(resolveQuickStartPresetId()).toBe('');
  });
});

describe('handleWidgetStartTap', () => {
  it('starts the suggested preset when idle and returns /timer', async () => {
    await usePresetsStore.getState().save(preset());
    const dest = await handleWidgetStartTap();
    await flush();
    expect(dest).toBe('/timer');
    expect(useTimerStore.getState().state.status).toBe('running');
    expect(useTimerStore.getState().state.session?.presetId).toBe('p1');
  });

  it('never overwrites a running session — just opens the timer screen', async () => {
    await usePresetsStore.getState().save(preset('other', 500));
    await useTimerStore.getState().startPreset(preset());
    await flush();
    expect(useTimerStore.getState().state.status).toBe('running');

    const dest = await handleWidgetStartTap();
    await flush();
    expect(dest).toBe('/timer');
    // The running session is untouched (no quick-start over it).
    expect(useTimerStore.getState().state.session?.presetId).toBe('p1');
  });

  it('returns / when there is nothing to quick-start', async () => {
    usePresetsStore.setState({ presets: [], loaded: true });
    const dest = await handleWidgetStartTap();
    expect(dest).toBe('/');
  });

  it('never rejects — errors are swallowed and fall back to /', async () => {
    usePresetsStore.setState({ presets: [preset()], loaded: true });
    const spy = jest.spyOn(usePresetsStore, 'getState').mockImplementation(() => {
      throw new Error('boom');
    });
    const dest = await handleWidgetStartTap();
    expect(dest).toBe('/');
    spy.mockRestore();
  });
});

describe('applyControlAction (widget + Live Activity controls)', () => {
  it('pauses a running session (widget Pause)', async () => {
    await usePresetsStore.getState().save(preset());
    await useTimerStore.getState().startPreset(preset());
    await flush();
    expect(useTimerStore.getState().state.status).toBe('running');

    await applyControlAction(WIDGET_PAUSE_TARGET);
    await flush();
    expect(useTimerStore.getState().state.status).toBe('paused');
  });

  it('resumes a paused session (widget Resume)', async () => {
    await usePresetsStore.getState().save(preset());
    await useTimerStore.getState().startPreset(preset());
    await flush();
    useTimerStore.getState().pause();
    await flush();
    expect(useTimerStore.getState().state.status).toBe('paused');

    await applyControlAction(WIDGET_RESUME_TARGET);
    await flush();
    expect(useTimerStore.getState().state.status).toBe('running');
  });

  it('skips to the next stage of a running session', async () => {
    await usePresetsStore.getState().save(preset('p2', 1, 2));
    await useTimerStore.getState().startPreset(preset('p2', 1, 2));
    await flush();
    expect(useTimerStore.getState().state.currentStageIndex).toBe(0);

    await applyControlAction(ACTIVITY_SKIP_TARGET);
    await flush();
    expect(useTimerStore.getState().state.currentStageIndex).toBe(1);
    expect(useTimerStore.getState().state.status).toBe('running');
  });

  it('stops a running session (widget Stop)', async () => {
    await usePresetsStore.getState().save(preset());
    await useTimerStore.getState().startPreset(preset());
    await flush();

    await applyControlAction(WIDGET_STOP_TARGET);
    await flush();
    expect(useTimerStore.getState().state.status).toBe('stopped');
  });

  it('stops a paused session (widget Stop)', async () => {
    await usePresetsStore.getState().save(preset());
    await useTimerStore.getState().startPreset(preset());
    await flush();
    useTimerStore.getState().pause();
    await flush();

    await applyControlAction(WIDGET_STOP_TARGET);
    await flush();
    expect(useTimerStore.getState().state.status).toBe('stopped');
  });

  it('does not pause a paused session (no-op)', async () => {
    await usePresetsStore.getState().save(preset());
    await useTimerStore.getState().startPreset(preset());
    await flush();
    useTimerStore.getState().pause();
    await flush();

    await applyControlAction(WIDGET_PAUSE_TARGET);
    await flush();
    expect(useTimerStore.getState().state.status).toBe('paused');
  });

  it('does nothing without an active session', async () => {
    await applyControlAction(ACTIVITY_SKIP_TARGET);
    await applyControlAction(WIDGET_PAUSE_TARGET);
    await applyControlAction(WIDGET_STOP_TARGET);
    await flush();
    // Guards no-op for any inactive status (idle, or a leftover stopped session).
    const status = useTimerStore.getState().state.status;
    expect(['running', 'paused']).not.toContain(status);
  });

  it('ignores unknown targets', async () => {
    await usePresetsStore.getState().save(preset());
    await useTimerStore.getState().startPreset(preset());
    await flush();

    await applyControlAction('unknown');
    await flush();
    expect(useTimerStore.getState().state.status).toBe('running');
  });

  it('never rejects — errors are swallowed', async () => {
    const spy = jest.spyOn(useTimerStore, 'getState').mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(applyControlAction(WIDGET_PAUSE_TARGET)).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
