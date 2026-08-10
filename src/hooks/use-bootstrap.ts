/**
 * App bootstrap: load settings + presets, restore any active session
 * (recovery dialog), init observability, preload sounds. Runs once.
 *
 * NOTE: never use array/object-literal selectors here — e.g.
 * `useSettingsStore((s) => [s.settings, s.set])` returns a NEW array on
 * every call, which fails zustand's Object.is comparison and triggers an
 * infinite re-render ("Maximum update depth exceeded"). Each selector must
 * return a stable reference or primitive.
 */
import { useEffect } from 'react';
import { useSettingsStore } from '@/features/settings/settings-store';
import { usePresetsStore } from '@/features/presets/presets-store';
import { useTimerStore } from '@/features/timer/timer-store';
import { audio, observability } from '@/platform';

let booted = false;

export function useBootstrap(): boolean {
  const loadSettings = useSettingsStore((s) => s.load);
  const loadPresets = usePresetsStore((s) => s.load);
  const initFromStorage = useTimerStore((s) => s.initFromStorage);

  useEffect(() => {
    if (booted) return;
    booted = true;

    void (async () => {
      await loadSettings();
      await loadPresets();
      await initFromStorage();

      // Platform services (audio/haptics toggles) are kept in sync by the
      // FeedbackCoordinator in the root layout — no per-settings effect here.
      void audio.preload();
      void observability.init();
    })();
  }, [loadSettings, loadPresets, initFromStorage]);

  // Call both hooks UNCONDITIONALLY — short-circuiting with `&&` would change
  // hook order between renders (loaded false -> true) and crash React.
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const presetsLoaded = usePresetsStore((s) => s.loaded);
  return settingsLoaded && presetsLoaded;
}
