import { TimerSnapshot } from '../../../platform/types';
import {
  DEFAULT_WIDGET_LABELS,
  formatWidgetMs,
  IDLE_WIDGET_DATA,
  mapTimerSnapshotToWidgetData,
  widgetRoundLabel,
} from '../widget-data';

function snapshot(overrides: Partial<TimerSnapshot> = {}): TimerSnapshot {
  return {
    presetId: 'p_hiit',
    presetName: 'HIIT 40/20',
    stageName: 'WORK',
    stageIndex: 0,
    totalStages: 2,
    round: 2,
    totalRounds: 5,
    remainingMs: 30_000,
    stageEndsAt: 1_800_000_000_000,
    status: 'running',
    nextStageName: 'REST',
    isForever: false,
    ...overrides,
  };
}

describe('mapTimerSnapshotToWidgetData', () => {
  it('maps null → idle state (no stale timer rendered)', () => {
    expect(mapTimerSnapshotToWidgetData(null)).toEqual(IDLE_WIDGET_DATA);
    expect(mapTimerSnapshotToWidgetData(null).status).toBe('idle');
  });

  it('carries the suggested quick-start preset into idle data', () => {
    const idle = mapTimerSnapshotToWidgetData(null, 'p_fav');
    expect(idle.status).toBe('idle');
    expect(idle.quickStartPresetId).toBe('p_fav');
    // The frozen singleton itself must stay untouched (no shared mutation).
    expect(IDLE_WIDGET_DATA.quickStartPresetId).toBe('');
  });

  it('maps a running snapshot (stage, remaining, round)', () => {
    const data = mapTimerSnapshotToWidgetData(snapshot());
    expect(data).toEqual({
      status: 'running',
      presetName: 'HIIT 40/20',
      stageName: 'WORK',
      remainingMs: 30_000,
      round: 2,
      totalRounds: 5,
      isForever: false,
      quickStartPresetId: '',
      openAppLabel: DEFAULT_WIDGET_LABELS.openApp,
      startLabel: DEFAULT_WIDGET_LABELS.start,
      pauseLabel: DEFAULT_WIDGET_LABELS.pause,
      resumeLabel: DEFAULT_WIDGET_LABELS.resume,
      stopLabel: DEFAULT_WIDGET_LABELS.stop,
    });
  });

  it('defaults the labels to English (self-contained for tests)', () => {
    const data = mapTimerSnapshotToWidgetData(snapshot());
    expect(data.openAppLabel).toBe('Open the app to start a routine');
    expect(data.startLabel).toBe('Start');
    expect(data.pauseLabel).toBe('Pause');
    expect(data.resumeLabel).toBe('Resume');
    expect(data.stopLabel).toBe('Stop');
  });

  it('carries the app-localized labels into idle data', () => {
    const labels = { openApp: 'Mở app', start: 'Bắt đầu', pause: 'Tạm dừng', resume: 'Tiếp tục', stop: 'Dừng' };
    const idle = mapTimerSnapshotToWidgetData(null, '', labels);
    expect(idle.openAppLabel).toBe('Mở app');
    expect(idle.startLabel).toBe('Bắt đầu');
    // The frozen singleton itself stays untouched (no shared mutation).
    expect(IDLE_WIDGET_DATA.openAppLabel).toBe(DEFAULT_WIDGET_LABELS.openApp);
    expect(IDLE_WIDGET_DATA.startLabel).toBe(DEFAULT_WIDGET_LABELS.start);
  });

  it('carries the app-localized labels into active data', () => {
    const labels = { openApp: 'Mở app', start: 'Bắt đầu', pause: 'Tạm dừng', resume: 'Tiếp tục', stop: 'Dừng' };
    const data = mapTimerSnapshotToWidgetData(snapshot(), '', labels);
    expect(data.pauseLabel).toBe('Tạm dừng');
    expect(data.resumeLabel).toBe('Tiếp tục');
    expect(data.stopLabel).toBe('Dừng');
  });

  it('ignores the quick-start preset while a session is active', () => {
    const data = mapTimerSnapshotToWidgetData(snapshot(), 'p_fav');
    expect(data.quickStartPresetId).toBe('');
  });

  it('preserves paused status with frozen remaining', () => {
    const data = mapTimerSnapshotToWidgetData(snapshot({ status: 'paused', remainingMs: 12_345 }));
    expect(data.status).toBe('paused');
    expect(data.remainingMs).toBe(12_345);
  });

  it('clamps negative remaining to 0', () => {
    const data = mapTimerSnapshotToWidgetData(snapshot({ remainingMs: -5 }));
    expect(data.remainingMs).toBe(0);
  });

  it('carries the forever flag for the ∞ round label', () => {
    const data = mapTimerSnapshotToWidgetData(snapshot({ isForever: true, totalRounds: 1 }));
    expect(data.isForever).toBe(true);
    expect(widgetRoundLabel(data)).toBe('2 / ∞');
  });

  it('is deterministic', () => {
    const a = mapTimerSnapshotToWidgetData(snapshot());
    const b = mapTimerSnapshotToWidgetData(snapshot());
    expect(a).toEqual(b);
  });
});

describe('formatWidgetMs', () => {
  it('formats MM:SS', () => {
    expect(formatWidgetMs(0)).toBe('00:00');
    expect(formatWidgetMs(30_000)).toBe('00:30');
    expect(formatWidgetMs(90_000)).toBe('01:30');
    expect(formatWidgetMs(3_600_000)).toBe('60:00'); // hours folded into minutes
    expect(formatWidgetMs(-1)).toBe('00:00');
  });
});

describe('widgetRoundLabel', () => {
  it('renders x/y for finite rounds', () => {
    expect(widgetRoundLabel({ round: 2, totalRounds: 5, isForever: false })).toBe('2 / 5');
  });
  it('renders x / ∞ for forever', () => {
    expect(widgetRoundLabel({ round: 37, totalRounds: 1, isForever: true })).toBe('37 / ∞');
  });
});
