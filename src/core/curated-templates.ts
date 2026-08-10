/**
 * Curated template library (v1.5, spec: curated-templates) — 12 hand-picked
 * templates in 4 categories (workout/focus/wellness/daily). Unlike the 3
 * immutable BUILTIN_TEMPLATES, these become REGULAR user presets when the
 * user taps "Use this" (editable / deletable, stored in PresetRepo).
 */
import { Preset, RepeatMode, createPresetId, createStageId } from './timer/models';

export type TemplateCategory = 'workout' | 'focus' | 'wellness' | 'daily';

export interface CuratedTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  emoji: string;
  stages: Array<{ name: string; durationSeconds: number }>;
  repeatMode: RepeatMode;
  fixedCount?: number | null;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['workout', 'focus', 'wellness', 'daily'];

/** EMOM — 10×60 with "MIN 1".."MIN 10" stage names (spec design decision). */
const emomStages = Array.from({ length: 10 }, (_, i) => ({
  name: `MIN ${i + 1}`,
  durationSeconds: 60,
}));

/** Full Body Stretch — 10×30s body-part stages. */
const stretchStages = ['Neck', 'Shoulders', 'Arms', 'Back', 'Hips', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Full'].map(
  (name) => ({ name, durationSeconds: 30 }),
);

export const CURATED_TEMPLATES: CuratedTemplate[] = [
  // ---- workout ----
  {
    id: 'ct_tabata',
    name: 'Tabata 20/10',
    category: 'workout',
    description: '8 rounds of all-out 20s work with 10s rest',
    emoji: '⚡',
    stages: [
      { name: 'WORK', durationSeconds: 20 },
      { name: 'REST', durationSeconds: 10 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 8,
  },
  {
    id: 'ct_emom',
    name: 'EMOM 10×60',
    category: 'workout',
    description: 'Every minute on the minute — 10 work minutes',
    emoji: '🔥',
    stages: emomStages,
    repeatMode: 'once',
    fixedCount: null,
  },
  {
    id: 'ct_sprint',
    name: 'Sprint 30/90',
    category: 'workout',
    description: 'Sprint 30s, walk 90s — 6 rounds',
    emoji: '🏃',
    stages: [
      { name: 'SPRINT', durationSeconds: 30 },
      { name: 'WALK', durationSeconds: 90 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 6,
  },
  // ---- focus ----
  {
    id: 'ct_deep_work',
    name: 'Deep Work 52/17',
    category: 'focus',
    description: '52 min deep focus, 17 min break — 4 blocks',
    emoji: '🧠',
    stages: [
      { name: 'DEEP WORK', durationSeconds: 52 * 60 },
      { name: 'BREAK', durationSeconds: 17 * 60 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 4,
  },
  {
    id: 'ct_pomodoro_15',
    name: 'Pomodoro 15/5',
    category: 'focus',
    description: 'Short 15 min pomodoros with 5 min breaks',
    emoji: '🍅',
    stages: [
      { name: 'FOCUS', durationSeconds: 15 * 60 },
      { name: 'BREAK', durationSeconds: 5 * 60 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 4,
  },
  {
    id: 'ct_reading',
    name: 'Reading 25/5',
    category: 'focus',
    description: '25 min reading, 5 min pause — 3 rounds',
    emoji: '📚',
    stages: [
      { name: 'READ', durationSeconds: 25 * 60 },
      { name: 'BREAK', durationSeconds: 5 * 60 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 3,
  },
  // ---- wellness ----
  {
    id: 'ct_box_breathing',
    name: 'Box Breathing',
    category: 'wellness',
    description: 'Inhale 4s – hold 4s – exhale 4s – hold 4s, forever',
    emoji: '🧘',
    stages: [
      { name: 'INHALE', durationSeconds: 4 },
      { name: 'HOLD', durationSeconds: 4 },
      { name: 'EXHALE', durationSeconds: 4 },
      { name: 'HOLD', durationSeconds: 4 },
    ],
    repeatMode: 'forever',
    fixedCount: null,
  },
  {
    id: 'ct_meditation',
    name: 'Meditation 10',
    category: 'wellness',
    description: 'One quiet 10 minute meditation session',
    emoji: '🕉️',
    stages: [{ name: 'MEDITATE', durationSeconds: 600 }],
    repeatMode: 'once',
    fixedCount: null,
  },
  {
    id: 'ct_stretch',
    name: 'Full Body Stretch',
    category: 'wellness',
    description: '10×30s stretches — neck to full body',
    emoji: '🤸',
    stages: stretchStages,
    repeatMode: 'once',
    fixedCount: null,
  },
  // ---- daily ----
  {
    id: 'ct_study',
    name: 'Study 45/10',
    category: 'daily',
    description: '45 min study, 10 min break — 3 rounds',
    emoji: '📖',
    stages: [
      { name: 'FOCUS', durationSeconds: 45 * 60 },
      { name: 'BREAK', durationSeconds: 10 * 60 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 3,
  },
  {
    id: 'ct_cleaning',
    name: 'Cleaning 20/5',
    category: 'daily',
    description: '20 min cleaning bursts with 5 min breaks',
    emoji: '🧹',
    stages: [
      { name: 'CLEAN', durationSeconds: 20 * 60 },
      { name: 'BREAK', durationSeconds: 5 * 60 },
    ],
    repeatMode: 'fixedCount',
    fixedCount: 3,
  },
  {
    id: 'ct_cooking',
    name: 'Cooking Multi-Timer',
    category: 'daily',
    description: 'Prep, cook and rest timers in one routine',
    emoji: '🍳',
    stages: [
      { name: 'PREP', durationSeconds: 10 * 60 },
      { name: 'COOK', durationSeconds: 20 * 60 },
      { name: 'REST', durationSeconds: 5 * 60 },
    ],
    repeatMode: 'once',
    fixedCount: null,
  },
];

/** Turn a curated template into a brand-new user preset (fresh ids). */
export function toPreset(template: CuratedTemplate, now = Date.now()): Preset {
  return {
    id: createPresetId(),
    name: template.name,
    stages: template.stages.map((s) => ({
      id: createStageId(),
      name: s.name,
      durationSeconds: s.durationSeconds,
    })),
    repeatMode: template.repeatMode,
    fixedCount: template.fixedCount ?? null,
    createdAt: now,
    lastUsedAt: now,
    schemaVersion: 1,
  };
}

/** Compact duration for the template preview: 20s / 10m / 1h 30m. */
export function formatStageDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  // Math.floor — Math.round would overflow to "1h 60m" for e.g. 1h 59m 58s.
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}
