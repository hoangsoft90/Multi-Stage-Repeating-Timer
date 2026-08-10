import { Preset } from '../../../core/timer/models';
import { decodePreset, encodePreset } from '../preset-codec';

function preset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p1',
    name: 'HIIT 40/20',
    stages: [
      { id: 's1', name: 'WORK', durationSeconds: 40 },
      { id: 's2', name: 'REST', durationSeconds: 20 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 8,
    createdAt: 1,
    lastUsedAt: 2,
    schemaVersion: 1,
    ...overrides,
  };
}

describe('preset codec', () => {
  it('round-trips a preset through encode + decode', () => {
    const encoded = encodePreset(preset());
    const decoded = decodePreset(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe('HIIT 40/20');
    expect(decoded?.stages.map((s) => s.name)).toEqual(['WORK', 'REST']);
    expect(decoded?.stages.map((s) => s.durationSeconds)).toEqual([40, 20]);
    expect(decoded?.repeatMode).toBe('fixedCount');
    expect(decoded?.fixedCount).toBe(8);
    // Fresh ids — the copy is a brand-new preset.
    expect(decoded?.id).not.toBe('p1');
    expect(decoded?.stages[0].id).not.toBe('s1');
  });

  it('returns null for non-preset JSON', () => {
    expect(decodePreset('not json{')).toBeNull();
    expect(decodePreset(JSON.stringify({ hello: 'world' }))).toBeNull();
    expect(decodePreset('')).toBeNull();
  });

  it('returns null for an invalid preset (empty name / bad duration)', () => {
    const bad = { ...preset(), name: '' };
    expect(decodePreset(encodePreset(bad))).toBeNull();

    const badDuration = {
      ...preset(),
      stages: [{ id: 'x', name: 'WORK', durationSeconds: 0 }],
    };
    expect(decodePreset(encodePreset(badDuration))).toBeNull();
  });

  it('tolerates missing optional fields', () => {
    const encoded = encodePreset(preset());
    const decoded = decodePreset(encoded);
    expect(decoded?.stages[0].soundId ?? null).toBeNull();
  });
});
