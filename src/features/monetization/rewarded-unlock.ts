/**
 * RewardedUnlockService (spec: monetization) — watch a Rewarded ad to unlock
 * custom sounds temporarily for `custom_sound_unlock_hours` (default 24h).
 * Expiry is real-time based, not session based.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adManager, observability } from '../../platform';

const KEY = 'looptimer:reward-unlock-until';

export async function getUnlockExpiry(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEY);
  const n = raw ? Number(raw) : null;
  return n && n > Date.now() ? n : null;
}

export async function isUnlocked(): Promise<boolean> {
  return (await getUnlockExpiry()) !== null;
}

export async function watchAdForUnlock(hours: number): Promise<boolean> {
  const earned = await adManager.showRewarded();
  if (earned) {
    const until = Date.now() + hours * 3600 * 1000;
    await AsyncStorage.setItem(KEY, String(until));
    observability.logEvent('rewarded_unlock', { hours });
    return true;
  }
  return false;
}

export function formatUnlockRemaining(expiry: number): string {
  const ms = Math.max(0, expiry - Date.now());
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
