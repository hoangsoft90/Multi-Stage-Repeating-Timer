/**
 * Drag & drop reorder (spec: drag-drop R1) — swapping order must keep stage
 * ids (and thus the per-stage soundId mapping) intact.
 */
import { reorderStages } from '../reorder';

describe('reorderStages', () => {
  it('moves a stage down without recreating ids', () => {
    const stages = [
      { id: 'a', name: 'WORK', durationSeconds: 60 },
      { id: 'b', name: 'REST', durationSeconds: 30 },
      { id: 'c', name: 'COOL', durationSeconds: 10 },
    ];
    const next = reorderStages(stages, 0, 2);
    expect(next.map((s) => s.name)).toEqual(['REST', 'COOL', 'WORK']);
    // Ids + any custom sound mapping are preserved.
    expect(next.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves a stage up', () => {
    const stages = [
      { id: 'a', name: 'WORK', durationSeconds: 60 },
      { id: 'b', name: 'REST', durationSeconds: 30 },
      { id: 'c', name: 'COOL', durationSeconds: 10 },
    ];
    const next = reorderStages(stages, 2, 0);
    expect(next.map((s) => s.name)).toEqual(['COOL', 'WORK', 'REST']);
    expect(next.map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op for same index / out-of-range', () => {
    const stages = [
      { id: 'a', name: 'WORK', durationSeconds: 60 },
      { id: 'b', name: 'REST', durationSeconds: 30 },
    ];
    expect(reorderStages(stages, 1, 1)).toBe(stages);
    expect(reorderStages(stages, -1, 0)).toBe(stages);
    expect(reorderStages(stages, 0, 5)).toBe(stages);
  });

  it('preserves soundId on reordered stages', () => {
    const stages = [
      { id: 'a', name: 'WORK', durationSeconds: 60, soundId: 'pack-bell' },
      { id: 'b', name: 'REST', durationSeconds: 30, soundId: 'pack-tick' },
    ];
    const next = reorderStages(stages, 0, 1);
    expect(next[1].id).toBe('a');
    expect(next[1].soundId).toBe('pack-bell');
  });
});
