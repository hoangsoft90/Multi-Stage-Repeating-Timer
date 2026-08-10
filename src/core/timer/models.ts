/**
 * Domain models for the Multi-Stage Repeating Timer.
 * Pure TypeScript — no React Native / storage / platform imports.
 */

export type RepeatMode = 'once' | 'fixedCount' | 'forever';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'stopped';

export const SCHEMA_VERSION = 1;

export interface Stage {
  id: string;
  name: string;
  /** Validation: 1s..24h */
  durationSeconds: number;
  soundId?: string | null;
  vibrationPatternId?: string | null;
}

export interface Preset {
  id: string;
  name: string;
  stages: Stage[];
  repeatMode: RepeatMode;
  /** Required when repeatMode === 'fixedCount', >= 1 */
  fixedCount?: number | null;
  /** Quick-start favorite (additive — default false, no schema bump). */
  isFavorite?: boolean;
  createdAt: number; // epoch ms
  lastUsedAt: number; // epoch ms
  schemaVersion: number;
}

/**
 * Immutable snapshot created at START. Editing the source preset
 * never affects an already-started session.
 */
export interface TimerSession {
  id: string;
  presetId: string;
  stagesSnapshot: Stage[];
  currentStageIndex: number;
  currentRound: number;
  status: TimerStatus;
  dateStarted: number; // epoch ms
  /** RUNNING only: absolute end of current stage (epoch ms) */
  stageEndsAt?: number | null;
  /** PAUSED only: remaining time of current stage */
  pausedRemainingMs?: number | null;
  /** COMPLETED only: when the sequence finished */
  completedAt?: number | null;
  createdAt: number; // epoch ms
  schemaVersion: number;
}

export function createPresetId(): string {
  return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStageId(): string {
  return `stage_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSessionId(): string {
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneStages(stages: Stage[]): Stage[] {
  return stages.map((s) => ({ ...s }));
}
