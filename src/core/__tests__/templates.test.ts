/**
 * Templates unit test (task 8.2 — duplicate): built-in templates are valid
 * presets and duplicatePreset produces a deep, independent copy.
 */
import { BUILTIN_TEMPLATES, duplicatePreset } from '../templates';
import { isValidPreset } from '../validation';

describe('BUILTIN_TEMPLATES', () => {
  it('all templates are valid presets', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(isValidPreset(t)).toBe(true);
    }
  });

  it('template ids are unique and stable', () => {
    const ids = BUILTIN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('template_work_break');
    expect(ids).toContain('template_pomodoro');
    expect(ids).toContain('template_hiit');
  });
});

describe('duplicatePreset', () => {
  it('creates a deep copy with a fresh id/name and new stage ids', () => {
    const src = BUILTIN_TEMPLATES[2]; // HIIT 40/20, fixedCount 8
    const originalStageIds = src.stages.map((s) => s.id);
    const copy = duplicatePreset(src, 1234);
    expect(copy.id).not.toBe(src.id);
    expect(copy.name).toBe(`${src.name} (copy)`);
    expect(copy.repeatMode).toBe('fixedCount');
    expect(copy.fixedCount).toBe(8);
    expect(copy.stages).toHaveLength(src.stages.length);
    expect(copy.stages.map((s) => s.id)).not.toEqual(originalStageIds);
    expect(copy.stages[0].durationSeconds).toBe(src.stages[0].durationSeconds);
    expect(copy.createdAt).toBe(1234);
    // original untouched — same ids, same durations
    expect(src.stages.map((s) => s.id)).toEqual(originalStageIds);
    expect(src.stages[0].durationSeconds).toBe(40);
  });
});
