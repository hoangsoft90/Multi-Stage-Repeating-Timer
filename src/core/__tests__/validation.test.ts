import { validatePreset, isValidPreset, validateStage } from '../validation';
import { Stage } from '../timer/models';

function stage(durationSeconds: number, name = 'S'): Stage {
  return { id: 's1', name, durationSeconds };
}

describe('validateStage', () => {
  it('rejects duration 0', () => {
    expect(validateStage(stage(0))).not.toBeNull();
  });
  it('rejects duration above 24h', () => {
    expect(validateStage(stage(24 * 3600 + 1))).not.toBeNull();
  });
  it('accepts 1s and 24h', () => {
    expect(validateStage(stage(1))).toBeNull();
    expect(validateStage(stage(24 * 3600))).toBeNull();
  });
  it('rejects empty name', () => {
    expect(validateStage(stage(10, '  '))).not.toBeNull();
  });
});

describe('validatePreset', () => {
  it('requires at least 1 stage', () => {
    const errors = validatePreset({ name: 'P', stages: [], repeatMode: 'once', fixedCount: null });
    expect(errors.stages).toBeDefined();
  });
  it('rejects more than 50 stages', () => {
    const stages = Array.from({ length: 51 }, () => stage(10));
    expect(validatePreset({ name: 'P', stages, repeatMode: 'once', fixedCount: null }).stages).toBeDefined();
  });
  it('requires fixedCount >= 1 when fixedCount mode', () => {
    const errors = validatePreset({
      name: 'P',
      stages: [stage(10)],
      repeatMode: 'fixedCount',
      fixedCount: 0,
    });
    expect(errors.fixedCount).toBeDefined();
  });
  it('requires non-empty name <= 50 chars', () => {
    expect(validatePreset({ name: '', stages: [stage(10)], repeatMode: 'once', fixedCount: null }).name).toBeDefined();
    expect(
      validatePreset({ name: 'x'.repeat(51), stages: [stage(10)], repeatMode: 'once', fixedCount: null }).name,
    ).toBeDefined();
  });
  it('valid preset passes', () => {
    const ok = isValidPreset({ name: 'HIIT', stages: [stage(40), stage(20)], repeatMode: 'fixedCount', fixedCount: 8 });
    expect(ok).toBe(true);
  });
});
