/**
 * NativeScheduler unit tests (task 7.2): the native platform impl routes
 * through expo-notifications. We mock every native module so no device code
 * runs. Asserts: DATE trigger at the absolute time, identifier passthrough,
 * cancelAll/cancelByIds, and exact-alarm capability (false on iOS).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif_id'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), seekTo: jest.fn(), pause: jest.fn() })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-tracking-transparency', () => ({
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'authorized' }),
}));
jest.mock('react-native-google-mobile-ads', () => ({
  InterstitialAd: { createForAdRequest: jest.fn() },
  RewardedAd: { createForAdRequest: jest.fn() },
  AppOpenAd: { createForAdRequest: jest.fn() },
  TestIds: { INTERSTITIAL: 't-int', APP_OPEN: 't-open', REWARDED: 't-reward', BANNER: 't-banner' },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error', OPENED: 'opened' },
  RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' },
}));
jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: jest.fn(() => ({})),
  recordError: jest.fn(),
}));
jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(),
}));
jest.mock('@react-native-firebase/remote-config', () => ({
  getRemoteConfig: jest.fn(() => ({})),
  fetchAndActivate: jest.fn().mockResolvedValue(true),
  getValue: jest.fn(() => ({
    asNumber: () => 1,
    asBoolean: () => true,
    asString: () => '',
  })),
}));

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { scheduler } from '../../../platform/impl.native';

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NativeScheduler', () => {
  it('scheduleAt uses a DATE trigger at the absolute time with the given identifier', async () => {
    const t = Date.now() + 60_000;
    await scheduler.scheduleAt(t, 'sess_1_2_3', 'WORK', 'Next: BREAK');
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    const [arg] = scheduleMock.mock.calls[0];
    expect(arg).toEqual({
      content: { title: 'WORK', body: 'Next: BREAK', categoryIdentifier: 'timer_controls' },
      trigger: { type: 'date', date: new Date(t) },
      identifier: 'sess_1_2_3',
    });
  });

  it('scheduleAt passes identifiers verbatim (deterministic IDs from the store)', async () => {
    await scheduler.scheduleAt(1234, 'sess_a_1_0', 'A', 'B');
    await scheduler.scheduleAt(2345, 'sess_a_1_1', 'A', 'B');
    expect(scheduleMock.mock.calls.map((c) => c[0].identifier)).toEqual([
      'sess_a_1_0',
      'sess_a_1_1',
    ]);
  });

  it('cancelAll clears every scheduled notification', async () => {
    await scheduler.cancelAll();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('cancelByIds cancels each identifier individually', async () => {
    await scheduler.cancelByIds(['a', 'b']);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('b');
  });

  it('canScheduleExactAlarm returns false on iOS (exact alarms are Android-only)', async () => {
    await expect(scheduler.canScheduleExactAlarm()).resolves.toBe(false);
  });

  it('canScheduleExactAlarm reports false on Android when the API is missing (conservative default keeps the Settings row actionable)', async () => {
    const notif = Notifications as unknown as { canScheduleExactAlarms?: () => boolean };
    const prev = notif.canScheduleExactAlarms;
    notif.canScheduleExactAlarms = undefined;
    jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await expect(scheduler.canScheduleExactAlarm()).resolves.toBe(false);
    } finally {
      notif.canScheduleExactAlarms = prev;
    }
  });

  it('canScheduleExactAlarm honors the native answer on Android', async () => {
    const notif = Notifications as unknown as { canScheduleExactAlarms?: () => boolean };
    notif.canScheduleExactAlarms = () => false;
    jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await expect(scheduler.canScheduleExactAlarm()).resolves.toBe(false);
    } finally {
      delete notif.canScheduleExactAlarms;
    }
  });

  it('never throws when expo-notifications fails (best-effort)', async () => {
    scheduleMock.mockRejectedValueOnce(new Error('boom'));
    await expect(scheduler.scheduleAt(1, 'x', 't', 'b')).resolves.toBeUndefined();
  });
});
