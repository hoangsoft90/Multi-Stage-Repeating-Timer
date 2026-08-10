/**
 * Curated templates unit test (task 1.2): 12 templates across 4 categories,
 * all convert to valid presets, ids unique + disjoint from built-ins, and
 * toPreset never mutates the template data.
 */
import {
  CURATED_TEMPLATES,
  TEMPLATE_CATEGORIES,
  formatStageDuration,
  toPreset,
} from '../curated-templates';
import { BUILTIN_TEMPLATES } from '../templates';
import { isValidPreset } from '../validation';

describe('CURATED_TEMPLATES', () => {
  it('có đúng 12 template trong 4 category (mỗi category ít nhất 1)', () => {
    expect(CURATED_TEMPLATES).toHaveLength(12);
    for (const c of TEMPLATE_CATEGORIES) {
      expect(CURATED_TEMPLATES.some((t) => t.category === c)).toBe(true);
    }
  });

  it('id duy nhất + không trùng BUILTIN_TEMPLATES', () => {
    const ids = CURATED_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const builtinIds = new Set(BUILTIN_TEMPLATES.map((t) => t.id));
    for (const t of CURATED_TEMPLATES) {
      expect(builtinIds.has(t.id)).toBe(false);
    }
  });

  it('mọi template convert sang preset đều hợp lệ (validatePreset)', () => {
    for (const t of CURATED_TEMPLATES) {
      const preset = toPreset(t, 0);
      expect(isValidPreset(preset)).toBe(true);
      expect(preset.stages).toHaveLength(t.stages.length);
    }
  });
});

describe('toPreset', () => {
  it('tạo preset mới với id/stage-id mới, không mutate dữ liệu template', () => {
    const t = CURATED_TEMPLATES[0]; // Tabata 20/10
    const originalStageNames = t.stages.map((s) => s.name);

    const p1 = toPreset(t, 1000);
    const p2 = toPreset(t, 2000);

    expect(p1.id).toMatch(/^preset_/);
    expect(p1.id).not.toBe(p2.id);
    expect(p1.stages.map((s) => s.id)).not.toEqual(p2.stages.map((s) => s.id));
    expect(p1.name).toBe(t.name);
    expect(p1.repeatMode).toBe('fixedCount');
    expect(p1.fixedCount).toBe(8);
    expect(p1.createdAt).toBe(1000);
    expect(p1.lastUsedAt).toBe(1000);
    expect(p1.schemaVersion).toBe(1);
    // Template data untouched.
    expect(t.stages.map((s) => s.name)).toEqual(originalStageNames);
  });

  it('forever template giữ repeatMode + fixedCount null', () => {
    const t = CURATED_TEMPLATES.find((x) => x.repeatMode === 'forever')!;
    const preset = toPreset(t);
    expect(preset.repeatMode).toBe('forever');
    expect(preset.fixedCount).toBeNull();
  });

  it('formatStageDuration compact', () => {
    expect(formatStageDuration(20)).toBe('20s');
    expect(formatStageDuration(600)).toBe('10m');
    expect(formatStageDuration(3600)).toBe('1h');
    expect(formatStageDuration(5400)).toBe('1h 30m');
  });
});
