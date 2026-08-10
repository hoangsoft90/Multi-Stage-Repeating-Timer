/**
 * Preset codec (spec: preset-sharing) — encode a preset into a versioned JSON
 * string for sharing/importing, and decode it back safely. Decoding never
 * throws: invalid data yields null (callers show a friendly error).
 */
import { Preset, createPresetId, createStageId } from '../../core/timer/models';
import { validatePreset } from '../../core/validation';

const TYPE = 'looptimer-preset';
const VERSION = 1;

/** Encode a preset to a portable, versioned JSON string. */
export function encodePreset(preset: Preset): string {
  return JSON.stringify({
    type: TYPE,
    version: VERSION,
    preset: {
      name: preset.name,
      stages: preset.stages.map((s) => ({
        name: s.name,
        durationSeconds: s.durationSeconds,
        soundId: s.soundId ?? null,
        vibrationPatternId: s.vibrationPatternId ?? null,
      })),
      repeatMode: preset.repeatMode,
      fixedCount: preset.fixedCount ?? null,
    },
  });
}

/**
 * Decode a preset JSON string. Validates the result with `validatePreset`
 * (duration 1s..24h, 1..50 stages, fixedCount >= 1, name <= 50 chars) and
 * assigns fresh ids on success. Returns null for anything invalid.
 */
export function decodePreset(json: string): Preset | null {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (data?.type !== TYPE) return null;
    const p = data.preset as Record<string, unknown> | undefined;
    if (!p || typeof p !== 'object') return null;

    const name = typeof p.name === 'string' ? p.name : '';
    const repeatMode = p.repeatMode === 'once' || p.repeatMode === 'fixedCount' || p.repeatMode === 'forever'
      ? p.repeatMode
      : 'once';
    const fixedCount =
      typeof p.fixedCount === 'number' && Number.isFinite(p.fixedCount) ? p.fixedCount : null;
    const rawStages = Array.isArray(p.stages) ? p.stages : [];

    const preset: Preset = {
      id: createPresetId(),
      name,
      stages: rawStages.map((s) => {
        const stage = s as Record<string, unknown>;
        return {
          id: createStageId(),
          name: typeof stage.name === 'string' ? stage.name : '',
          durationSeconds:
            typeof stage.durationSeconds === 'number' ? stage.durationSeconds : 0,
          soundId: typeof stage.soundId === 'string' ? stage.soundId : null,
          vibrationPatternId:
            typeof stage.vibrationPatternId === 'string' ? stage.vibrationPatternId : null,
        };
      }),
      repeatMode,
      fixedCount,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      schemaVersion: 1,
    };

    const errors = validatePreset(preset);
    if (errors.name || errors.stages || errors.fixedCount || errors.stageErrors) return null;
    return preset;
  } catch {
    return null;
  }
}
