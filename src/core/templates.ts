/**
 * 3 built-in templates (spec: presets). Templates are constant data in code —
 * users duplicate them into real presets; templates themselves are not stored.
 */
import { Preset, createPresetId, createStageId } from './timer/models';

export const BUILTIN_TEMPLATES: Preset[] = [
  {
    id: 'template_work_break',
    name: 'Work / Break 60/10',
    stages: [
      { id: createStageId(), name: 'WORK', durationSeconds: 60 },
      { id: createStageId(), name: 'BREAK', durationSeconds: 10 },
    ],
    repeatMode: 'forever',
    fixedCount: null,
    createdAt: 0,
    lastUsedAt: 0,
    schemaVersion: 1,
  },
  {
    id: 'template_pomodoro',
    name: 'Pomodoro 25/5 + Long 15',
    stages: [
      { id: createStageId(), name: 'WORK', durationSeconds: 25 * 60 },
      { id: createStageId(), name: 'BREAK', durationSeconds: 5 * 60 },
      { id: createStageId(), name: 'WORK', durationSeconds: 25 * 60 },
      { id: createStageId(), name: 'BREAK', durationSeconds: 5 * 60 },
      { id: createStageId(), name: 'WORK', durationSeconds: 25 * 60 },
      { id: createStageId(), name: 'BREAK', durationSeconds: 5 * 60 },
      { id: createStageId(), name: 'WORK', durationSeconds: 25 * 60 },
      { id: createStageId(), name: 'LONG BREAK', durationSeconds: 15 * 60 },
    ],
    repeatMode: 'once',
    fixedCount: null,
    createdAt: 0,
    lastUsedAt: 0,
    schemaVersion: 1,
  },
  {
    id: 'template_hiit',
    name: 'HIIT 40/20',
    stages: [
      { id: createStageId(), name: 'WORK', durationSeconds: 40 },
      { id: createStageId(), name: 'REST', durationSeconds: 20 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 8,
    createdAt: 0,
    lastUsedAt: 0,
    schemaVersion: 1,
  },
];

export function duplicatePreset(preset: Preset, now = Date.now()): Preset {
  return {
    ...preset,
    id: createPresetId(),
    name: `${preset.name} (copy)`,
    stages: preset.stages.map((s) => ({ ...s, id: createStageId() })),
    createdAt: now,
    lastUsedAt: now,
  };
}
