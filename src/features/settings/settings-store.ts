/**
 * Settings store (Zustand) — persisted toggles (sound, vibration, wake lock,
 * theme) + About/Privacy/Rate.
 */
import { create } from 'zustand';
import { DEFAULT_SETTINGS, Settings, SettingsRepo } from '../../core/storage/repos';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  set: (patch: Partial<Settings>) => Promise<void>;
}

const repo = new SettingsRepo();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await repo.load();
    set({ settings, loaded: true });
  },

  set: async (patch) => {
    const next = { ...get().settings, ...patch };
    await repo.save(next);
    set({ settings: next });
  },
}));
