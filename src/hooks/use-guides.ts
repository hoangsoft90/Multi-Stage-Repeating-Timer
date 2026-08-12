/**
 * In-app guidance (coach marks): each tooltip / badge has a stable id.
 * `isSeen(id)` tells whether the user already saw it (persisted in settings),
 * `complete(id)` marks it seen forever so it never nags again.
 *
 * Guides are lightweight: they render inline on their own screen (no global
 * overlay/measurement), which keeps them robust across platforms.
 */
import { useCallback } from 'react';
import { useSettingsStore } from '@/features/settings/settings-store';

export type GuideId =
  | 'home-start'
  | 'timer-controls'
  | 'settings-permissions'
  | 'badge-templates'
  | 'badge-stats'
  | 'badge-settings';

export function useGuides() {
  const settings = useSettingsStore((s) => s.settings);
  const set = useSettingsStore((s) => s.set);
  const seen = settings.guidesSeen ?? [];

  const isSeen = useCallback((id: GuideId) => seen.includes(id), [seen]);

  const complete = useCallback(
    (id: GuideId) => {
      const current = useSettingsStore.getState().settings.guidesSeen ?? [];
      if (current.includes(id)) return;
      void set({ guidesSeen: [...current, id] });
    },
    [set],
  );

  return { isSeen, complete };
}
