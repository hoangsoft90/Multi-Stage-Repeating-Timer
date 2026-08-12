/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 *
 * Effective theme resolution: the persisted `themeMode` setting
 * (Settings → Display) wins; 'system' follows the OS color scheme until the
 * user makes an explicit choice.
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/features/settings/settings-store';

/**
 * Effective dark flag honouring the persisted `themeMode` setting
 * ('system' follows the OS; explicit Light/Dark wins). Screens that pick
 * stage accent colours by scheme (timer, preset editor) must use this
 * instead of `useColorScheme()` directly, or the setting wouldn't apply.
 */
export function useIsDark(): boolean {
  const scheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.settings.themeMode);
  if (themeMode !== 'system') return themeMode === 'dark';
  return scheme === 'dark';
}

export function useTheme() {
  const isDark = useIsDark();

  return Colors[isDark ? 'dark' : 'light'];
}
