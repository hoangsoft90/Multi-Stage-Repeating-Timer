import { TimerSnapshot } from '../../../platform/types';
import {
  ACTIVITY_PAUSE_TARGET,
  ACTIVITY_RESUME_TARGET,
  ACTIVITY_SKIP_TARGET,
  ACTIVITY_SOURCE,
  DEFAULT_ACTIVITY_LABELS,
  snapshotToActivityContent,
} from '../activity-content';

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

describe('snapshotToActivityContent', () => {
  it('maps a running snapshot (stage, remaining, round, next stage)', () => {
    const content = snapshotToActivityContent(snapshot());
    expect(content).toEqual({
      presetName: 'HIIT 40/20',
      stageName: 'WORK',
      remainingMs: 30_000,
      round: 2,
      totalRounds: 5,
      isForever: false,
      nextStageName: 'REST',
      status: 'running',
      pauseLabel: DEFAULT_ACTIVITY_LABELS.pause,
      skipLabel: DEFAULT_ACTIVITY_LABELS.skip,
      resumeLabel: DEFAULT_ACTIVITY_LABELS.resume,
    });
  });

  it('defaults the control labels to English (self-contained for tests)', () => {
    const content = snapshotToActivityContent(snapshot());
    expect(content.pauseLabel).toBe('Pause');
    expect(content.skipLabel).toBe('Skip');
    expect(content.resumeLabel).toBe('Resume');
  });

  it('carries the app-localized control labels (i18n lives in the app)', () => {
    const content = snapshotToActivityContent(snapshot(), {
      pause: 'Tạm dừng',
      skip: 'Bỏ qua',
      resume: 'Tiếp tục',
    });
    expect(content.pauseLabel).toBe('Tạm dừng');
    expect(content.skipLabel).toBe('Bỏ qua');
    expect(content.resumeLabel).toBe('Tiếp tục');
  });

  it('exports the interaction source + control targets used by the layout', () => {
    expect(ACTIVITY_SOURCE).toBe('TimerActivity');
    expect(ACTIVITY_PAUSE_TARGET).toBe('pause');
    expect(ACTIVITY_SKIP_TARGET).toBe('skip');
    expect(ACTIVITY_RESUME_TARGET).toBe('resume');
  });

  it('carries empty next stage on the last stage', () => {
    const content = snapshotToActivityContent(snapshot({ stageName: 'REST', nextStageName: '' }));
    expect(content.nextStageName).toBe('');
  });

  it('carries paused status + frozen remaining', () => {
    const content = snapshotToActivityContent(snapshot({ status: 'paused', remainingMs: 8_000 }));
    expect(content.status).toBe('paused');
    expect(content.remainingMs).toBe(8_000);
  });

  it('carries the forever flag for the ∞ round label', () => {
    const content = snapshotToActivityContent(snapshot({ isForever: true }));
    expect(content.isForever).toBe(true);
  });

  it('is deterministic', () => {
    expect(snapshotToActivityContent(snapshot())).toEqual(snapshotToActivityContent(snapshot()));
  });
});
