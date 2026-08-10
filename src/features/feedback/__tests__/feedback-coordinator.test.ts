/**
 * FeedbackCoordinator tests (v1.2 voice coaching): the coordinator is the
 * single place that reads the stage name / completion aloud. Verifies the
 * voice toggle is respected, stage names are spoken on StageStarted, the
 * completed phrase on SessionCompleted, and feedback never blocks/crashes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TimerEngine } from '../../../core/timer/engine';
import { FeedbackCoordinator } from '../feedback-coordinator';
import { DEFAULT_SETTINGS, Settings } from '../../../core/storage/repos';
import { Preset } from '../../../core/timer/models';
import { platformMock } from '../../../test-utils/platform-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The coordinator imports '../monetization/rewarded-unlock' which reads
// AsyncStorage (mock above handles it) and '../sounds/sound-pack' (pure).
jest.mock('../../../platform', () => {
  const m = jest.requireActual('../../../test-utils/platform-mock');
  return m.platformMock;
});

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function preset(): Preset {
  return {
    id: 'p1',
    name: 'HIIT',
    stages: [
      { id: 's1', name: 'WORK', durationSeconds: 60 },
      { id: 's2', name: 'REST', durationSeconds: 20 },
    ],
    repeatMode: 'once',
    fixedCount: null,
    createdAt: 1,
    lastUsedAt: 1,
    schemaVersion: 1,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('FeedbackCoordinator — voice coaching (v1.2)', () => {
  it('đọc tên stage bằng voice khi StageStarted và toggle Voice bật', async () => {
    const engine = new TimerEngine();
    const coordinator = new FeedbackCoordinator(engine, settings({ voiceEnabled: true }));
    coordinator.attach();

    engine.start(preset());
    // StageStarted(0, 'WORK') emitted synchronously → wait for async handlers.
    await new Promise((r) => setTimeout(r, 0));

    expect(platformMock.speech.speak).toHaveBeenCalledWith('WORK');
  });

  it('không phát voice khi toggle Voice tắt (sound/haptic vẫn chạy)', async () => {
    const engine = new TimerEngine();
    const coordinator = new FeedbackCoordinator(engine, settings({ voiceEnabled: false }));
    coordinator.attach();

    engine.start(preset());
    await new Promise((r) => setTimeout(r, 0));

    expect(platformMock.speech.speak).not.toHaveBeenCalled();
    // Các feedback khác vẫn hoạt động độc lập.
    expect(platformMock.audio.play).toHaveBeenCalled();
  });

  it('updateSettings cập nhật voice toggle cho speech service', () => {
    const engine = new TimerEngine();
    const coordinator = new FeedbackCoordinator(engine, settings({ voiceEnabled: true }));
    coordinator.updateSettings(settings({ voiceEnabled: false }));
    expect(platformMock.speech.setEnabled).toHaveBeenCalledWith(false);
  });

  it('đọc thông báo hoàn thành khi SessionCompleted và toggle bật', async () => {
    const engine = new TimerEngine();
    const coordinator = new FeedbackCoordinator(engine, settings({ voiceEnabled: true }));
    coordinator.attach();

    engine.start(preset());
    // Skip tới stage cuối rồi hoàn thành qua skip (once → hết sequence).
    engine.skip();
    engine.skip();
    await new Promise((r) => setTimeout(r, 0));

    // SessionCompleted → voice.completed (khác tên stage).
    const spoken = (platformMock.speech.speak as jest.Mock).mock.calls.map((c) => c[0]);
    expect(spoken).toContain('Routine hoàn thành');
  });

  it('lỗi speech không làm crash timer (feedback never blocks)', async () => {
    (platformMock.speech.speak as jest.Mock).mockRejectedValueOnce(new Error('tts down'));
    const engine = new TimerEngine();
    const coordinator = new FeedbackCoordinator(engine, settings({ voiceEnabled: true }));
    coordinator.attach();

    engine.start(preset());
    await new Promise((r) => setTimeout(r, 0));
    // Không throw — engine vẫn chạy.
    expect(engine.getState().status).toBe('running');
  });
});
