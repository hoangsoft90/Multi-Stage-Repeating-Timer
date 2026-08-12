/**
 * Permission flow (spec: permissions) — strict order:
 * 1. POST_NOTIFICATIONS — requested right when the user creates their first
 *    timer (NOT at onboarding).
 * 2. SCHEDULE_EXACT_ALARM — just-in-time on first Start (Android 12+);
 *    graceful degradation to inexact scheduling if denied.
 * 3. RECEIVE_BOOT_COMPLETED — manifest-declared via expo-notifications,
 *    no runtime dialog.
 */
import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifications, observability, scheduler } from '../../platform';

const NOTIF_ASKED_KEY = 'looptimer:notif-asked';
/** Only surface the exact-alarm special-access screen once per install. */
const EXACT_ALARM_ASKED_KEY = 'looptimer:exact-alarm-asked';

/** Ask POST_NOTIFICATIONS when the user creates their first timer. */
export async function requestNotificationPermissionOnFirstTimer(): Promise<boolean> {
  try {
    const asked = await AsyncStorage.getItem(NOTIF_ASKED_KEY);
    if (asked) return (await notifications.getPermissionStatus()) === 'granted';

    await AsyncStorage.setItem(NOTIF_ASKED_KEY, 'true');
    const granted = await notifications.requestPermission();
    if (!granted) {
      observability.logEvent('permission_denied', { type: 'notification' });
    }
    return granted;
  } catch {
    return false;
  }
}

/**
 * Just-in-time on first Start (Android 12+). Degrades gracefully.
 *
 * expo-notifications (SDK 57) exposes NO JS check for SCHEDULE_EXACT_ALARM
 * (canScheduleExactAlarms does not exist), so canScheduleExactAlarm() is
 * conservatively false even when granted — the only safe signal is "ask
 * once". Without this guard the system "Alarms & reminders" screen would
 * pop on EVERY timer start, not just the first.
 */
export async function requestExactAlarmPermissionJustInTime(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const can = await scheduler.canScheduleExactAlarm();
    if (can) return;
    const asked = await AsyncStorage.getItem(EXACT_ALARM_ASKED_KEY);
    if (asked) return;
    await AsyncStorage.setItem(EXACT_ALARM_ASKED_KEY, 'true');
    // Open the system "Alarms & reminders" special-access screen.
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
    observability.logEvent('permission_requested', { type: 'exact_alarm' });
  } catch {
    /* degrade to inexact silently */
  }
}
