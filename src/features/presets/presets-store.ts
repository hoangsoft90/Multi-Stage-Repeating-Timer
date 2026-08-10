/**
 * Presets store (Zustand) — CRUD + built-in templates + duplicate.
 */
import { create } from 'zustand';
import { Preset } from '../../core/timer/models';
import { PresetRepo } from '../../core/storage/repos';
import { BUILTIN_TEMPLATES, duplicatePreset } from '../../core/templates';
import { decodePreset } from './preset-codec';

interface PresetsState {
  presets: Preset[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (preset: Preset) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Preset | null>;
  /** Toggle the quick-start favorite flag (persist + reload). */
  setFavorite: (id: string, favorite: boolean) => Promise<void>;
  /** Import a preset from its encoded JSON. Returns { ok, name? }. */
  importPreset: (json: string) => Promise<{ ok: boolean; name?: string }>;
}

const repo = new PresetRepo();

export const usePresetsStore = create<PresetsState>((set, get) => ({
  presets: [],
  loaded: false,

  load: async () => {
    const presets = await repo.list();
    presets.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    set({ presets, loaded: true });
  },

  save: async (preset) => {
    await repo.save(preset);
    await get().load();
  },

  remove: async (id) => {
    await repo.delete(id);
    await get().load();
  },

  duplicate: async (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return null;
    const copy = duplicatePreset(preset);
    await repo.save(copy);
    await get().load();
    return copy;
  },

  setFavorite: async (id, favorite) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    await repo.save({ ...preset, isFavorite: favorite });
    await get().load();
  },

  importPreset: async (json) => {
    const preset = decodePreset(json);
    if (!preset) return { ok: false };
    await repo.save(preset);
    await get().load();
    return { ok: true, name: preset.name };
  },
}));

export { BUILTIN_TEMPLATES };
