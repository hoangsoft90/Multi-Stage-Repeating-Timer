/**
 * Preset validation (spec: presets, screens/Editor).
 * duration 1s..24h | stages 1..50 | fixedCount >= 1 | name <= 50 chars
 */
import { Preset, Stage } from './timer/models';
import { t } from '@/i18n';

export const MIN_DURATION_SECONDS = 1;
export const MAX_DURATION_SECONDS = 24 * 60 * 60; // 24h
export const MAX_STAGES = 50;
export const MAX_NAME_LENGTH = 50;

export interface ValidationErrors {
  name?: string;
  fixedCount?: string;
  stages?: string;
  /** stageIndex -> error */
  stageErrors?: Record<number, string>;
}

export function validateStage(stage: Pick<Stage, 'name' | 'durationSeconds'>): string | null {
  if (!stage.name.trim()) return t('validation.stageNameEmpty');
  if (!Number.isFinite(stage.durationSeconds) || stage.durationSeconds < MIN_DURATION_SECONDS) {
    return t('validation.durationMin', { min: MIN_DURATION_SECONDS });
  }
  if (stage.durationSeconds > MAX_DURATION_SECONDS) {
    return t('validation.durationMax', { max: MAX_DURATION_SECONDS / 3600 });
  }
  return null;
}

export function validatePreset(preset: Pick<Preset, 'name' | 'stages' | 'repeatMode' | 'fixedCount'>): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!preset.name.trim()) {
    errors.name = t('validation.presetNameEmpty');
  } else if (preset.name.length > MAX_NAME_LENGTH) {
    errors.name = t('validation.nameMax', { max: MAX_NAME_LENGTH });
  }

  if (preset.stages.length < 1) {
    errors.stages = t('validation.minStages');
  } else if (preset.stages.length > MAX_STAGES) {
    errors.stages = t('validation.stagesMax', { max: MAX_STAGES });
  } else {
    const stageErrors: Record<number, string> = {};
    preset.stages.forEach((s, i) => {
      const err = validateStage(s);
      if (err) stageErrors[i] = err;
    });
    if (Object.keys(stageErrors).length > 0) errors.stageErrors = stageErrors;
  }

  if (preset.repeatMode === 'fixedCount' && (!preset.fixedCount || preset.fixedCount < 1)) {
    errors.fixedCount = t('validation.roundsMin');
  }

  return errors;
}

export function isValidPreset(preset: Pick<Preset, 'name' | 'stages' | 'repeatMode' | 'fixedCount'>): boolean {
  const errors = validatePreset(preset);
  return !errors.name && !errors.stages && !errors.fixedCount && !errors.stageErrors;
}
