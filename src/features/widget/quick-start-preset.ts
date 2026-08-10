/**
 * Idle widget quick-start suggestion (spec: android-widget R2) — which preset
 * the home-screen widget should quick-start when tapped while no session is
 * running (`looptimer:///?start=<id>`). Favorite wins, then the most recently
 * used preset; '' means "just open Home" (no user presets yet).
 */
import { usePresetsStore } from '../presets/presets-store';

export function resolveQuickStartPresetId(): string {
  const presets = usePresetsStore.getState().presets;
  const favorite = presets.find((p) => p.isFavorite);
  if (favorite) return favorite.id;
  const mostRecent = [...presets].sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
  return mostRecent?.id ?? '';
}
