/**
 * Native (Android/iOS) implementations.
 *
 * Expo Go compatibility: ads (react-native-google-mobile-ads) and Firebase
 * (@react-native-firebase/*) are NOT present in Expo Go — their native
 * modules don't exist and importing the ads package throws at module load
 * (TurboModuleRegistry.getEnforcing). We therefore lazy-load both behind
 * try/catch: in Expo Go they degrade to no-ops, in a dev/EAS build they
 * behave exactly as before. The expo-* SDK modules below all work in
 * Expo Go, so they stay as static imports.
 *
 * The web bundle never includes this file (Metro resolves index.web.ts).
 */
import { Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import * as Tracking from 'expo-tracking-transparency';
import * as Speech from 'expo-speech';
import {
  AdManager,
  AttService,
  AudioService,
  HapticsService,
  LiveActivityBridge,
  NotificationsService,
  ObservabilityService,
  RemoteConfigService,
  Scheduler,
  ShareService,
  SpeechService,
  TimerSnapshot,
  WakeLockService,
  WidgetBridge,
} from './types';
import { PLACEMENT_ENABLED, resolveUnitId } from '../features/monetization/ads-config';
import { SOUND_SOURCES } from '../features/sounds/sound-pack';
import { notifyMissedRateHigh } from '../features/background/fgs-trigger';
import { snapshotToActivityContent, TimerActivityContent, TimerActivityLabels } from '../features/widget/activity-content';
import { mapTimerSnapshotToWidgetData, TimerWidgetData, TimerWidgetLabels } from '../features/widget/widget-data';
// Precedent for a feature import here: fgs-trigger below. Needed so the idle
// widget deep link can carry the suggested quick-start preset id.
import { resolveQuickStartPresetId } from '../features/widget/quick-start-preset';
import i18n from '../i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEFAULT_CONFIG: Record<string, number | boolean> = {
  interstitial_cooldown_seconds: 240,
  interstitial_max_per_session: 1,
  app_open_cooldown_seconds: 60,
  max_scheduled_transitions_ios: 50,
  missed_transition_rate_threshold: 0.15,
  timer_screen_native_ad_enabled: false,
  preset_free_limit: -1,
  custom_sound_unlock_hours: 24,
  // iOS notification budget reserved for routine reminders (spec: scheduled-routine).
  reminder_reserved_slots: 10,
};

// ------------------------------------------------- heavy native SDKs (lazy)

type AdsModule = typeof import('react-native-google-mobile-ads');

/** Returns the ads module or null when the native SDK isn't installed (Expo Go). */
function loadAds(): AdsModule | null {
  try {
    return require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    return null;
  }
}

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics');
type AnalyticsModule = typeof import('@react-native-firebase/analytics');
type RemoteConfigModule = typeof import('@react-native-firebase/remote-config');

function loadModule<T>(loader: () => T): T | null {
  try {
    return loader();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Scheduler
class NativeScheduler implements Scheduler {
  async scheduleAt(
    endsAt: number,
    id: string,
    title: string,
    body: string,
    category?: 'reminder_actions',
  ): Promise<void> {
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(endsAt),
    };
    // categoryIdentifier enables the action buttons (timer controls by
    // default; reminder_actions for routine reminders).
    await Notifications.scheduleNotificationAsync({
      content: { title, body, categoryIdentifier: category ?? 'timer_controls' },
      trigger,
      identifier: id,
    }).catch(() => {});
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }

  async cancelByIds(ids: string[]): Promise<void> {
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  }

  async canScheduleExactAlarm(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const androidModule = Notifications as unknown as Record<string, unknown>;
      const fn = androidModule.canScheduleExactAlarms as (() => boolean) | undefined;
      return fn ? fn() : true;
    } catch {
      return true; // best-effort; degrade handled by catch in caller
    }
  }

  async requestExactAlarmPermission(): Promise<void> {
    // SCHEDULE_EXACT_ALARM is special access — surfaced via
    // expo-intent-launcher from the UI layer (see permissions.ts).
  }
}

// --------------------------------------------------------- Notifications
class NativeNotifications implements NotificationsService {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  async present(title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null }).catch(() => {});
  }

  async registerActionCategories(labels: {
    pause: string;
    skip: string;
    stop: string;
    reminderStart: string;
    reminderSnooze5: string;
    reminderSnooze10: string;
    reminderDismiss: string;
  }): Promise<void> {
    try {
      // Timer controls on stage-transition notifications.
      await Notifications.setNotificationCategoryAsync('timer_controls', [
        { identifier: 'pause', buttonTitle: labels.pause, options: { opensAppToForeground: false } },
        { identifier: 'skip', buttonTitle: labels.skip, options: { opensAppToForeground: false } },
        { identifier: 'stop', buttonTitle: labels.stop, options: { opensAppToForeground: false } },
      ]);
      // Routine reminder actions (Start / Snooze 5' / Snooze 10' / Dismiss).
      await Notifications.setNotificationCategoryAsync('reminder_actions', [
        { identifier: 'reminder_start', buttonTitle: labels.reminderStart, options: { opensAppToForeground: true } },
        { identifier: 'reminder_snooze_5', buttonTitle: labels.reminderSnooze5, options: { opensAppToForeground: false } },
        { identifier: 'reminder_snooze_10', buttonTitle: labels.reminderSnooze10, options: { opensAppToForeground: false } },
        { identifier: 'reminder_dismiss', buttonTitle: labels.reminderDismiss, options: { opensAppToForeground: false } },
      ]);
    } catch {
      /* categories are a nicety — never crash */
    }
  }

  addNotificationResponseListener(handler: (actionId: string, notificationId?: string) => void): () => void {
    try {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const actionId = response.actionIdentifier;
        if (
          actionId === 'pause' ||
          actionId === 'skip' ||
          actionId === 'stop' ||
          actionId === 'reminder_start' ||
          actionId === 'reminder_snooze_5' ||
          actionId === 'reminder_snooze_10' ||
          actionId === 'reminder_dismiss'
        ) {
          handler(actionId, response.notification.request.identifier);
        }
      });
      return () => sub.remove();
    } catch {
      return () => {};
    }
  }

  async getLastNotificationResponse(): Promise<{ actionId: string; notificationId?: string } | null> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      const actionId = response?.actionIdentifier ?? null;
      if (response && actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        return { actionId, notificationId: response.notification.request.identifier };
      }
      return null;
    } catch {
      return null;
    }
  }
}

// -------------------------------------------------------------------- Audio
class NativeAudioService implements AudioService {
  private enabled = true;
  private players: Record<string, AudioPlayer | null> = {};

  async preload(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
      for (const [id, source] of Object.entries(SOUND_SOURCES)) {
        this.players[id] = createAudioPlayer(source as string);
      }
    } catch {
      /* audio unavailable — never crash */
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async play(soundId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const p = this.players[soundId];
      if (p) {
        void p.seekTo(0);
        p.play();
      }
    } catch {
      /* no-op */
    }
  }
}

// ------------------------------------------------------------------ Haptics
class NativeHapticsService implements HapticsService {
  private enabled = true;
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async vibrate(patternId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      if (patternId === 'pattern-strong') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      /* no-op */
    }
  }
}

// --------------------------------------------------------------- Wake lock
class NativeWakeLockService implements WakeLockService {
  async activate(): Promise<void> {
    try {
      await KeepAwake.activateKeepAwakeAsync('looptimer');
    } catch {
      /* no-op */
    }
  }
  async deactivate(): Promise<void> {
    try {
      await KeepAwake.deactivateKeepAwake('looptimer');
    } catch {
      /* no-op */
    }
  }
}

// --------------------------------------------------------------------- Ads
class NativeAdManager implements AdManager {
  /** True only when the native ads SDK is actually present (not Expo Go). */
  get supported(): boolean {
    return loadAds() !== null;
  }
  private lastInterstitial = 0;
  private lastAppOpen = 0;
  private interstitialPerSession = 0;

  canShowAppOpen(coldStart: boolean, hasActiveSession: boolean, now: number): boolean {
    if (!PLACEMENT_ENABLED.appOpen) return false;
    const cooldown = remoteConfig.getNumber('app_open_cooldown_seconds') * 1000;
    return coldStart && !hasActiveSession && now - this.lastAppOpen >= cooldown;
  }
  canShowInterstitial(sessionRunning: boolean, now: number): boolean {
    if (!PLACEMENT_ENABLED.interstitial) return false;
    const cooldown = remoteConfig.getNumber('interstitial_cooldown_seconds') * 1000;
    const maxPerSession = remoteConfig.getNumber('interstitial_max_per_session');
    return !sessionRunning && now - this.lastInterstitial >= cooldown && this.interstitialPerSession < maxPerSession;
  }
  canShowRewarded(): boolean {
    return PLACEMENT_ENABLED.rewarded;
  }

  async showInterstitial(): Promise<boolean> {
    const Ads = loadAds();
    if (!Ads) return false; // Expo Go / no SDK
    try {
      const ad = Ads.InterstitialAd.createForAdRequest(
        resolveUnitId(Platform.OS === 'android' ? 'android' : 'ios', 'interstitial', Ads.TestIds.INTERSTITIAL),
      );
      const shown = await new Promise<boolean>((resolve) => {
        ad.addAdEventListener(Ads.AdEventType.LOADED, () => {
          ad.show();
        });
        ad.addAdEventListener(Ads.AdEventType.CLOSED, () => resolve(true));
        ad.addAdEventListener(Ads.AdEventType.ERROR, () => {
          observability.logEvent('ad_shown', { placement: 'interstitial', shown: false });
          resolve(false);
        });
        ad.load();
      });
      // Chỉ burn cooldown/frequency cap khi ad THỰC SỰ hiển thị — load fail
      // không tính, để lần sau vẫn có cơ hội hiện ad (revenue).
      if (shown) {
        this.lastInterstitial = Date.now();
        this.interstitialPerSession += 1;
      }
      return shown;
    } catch {
      return false;
    }
  }

  async showAppOpen(): Promise<boolean> {
    const Ads = loadAds();
    if (!Ads) return false;
    try {
      this.lastAppOpen = Date.now();
      const ad = Ads.AppOpenAd.createForAdRequest(
        resolveUnitId(Platform.OS === 'android' ? 'android' : 'ios', 'appOpen', Ads.TestIds.APP_OPEN),
      );
      const shown = await new Promise<boolean>((resolve) => {
        ad.addAdEventListener(Ads.AdEventType.LOADED, () => {
          ad.show();
        });
        ad.addAdEventListener(Ads.AdEventType.CLOSED, () => resolve(true));
        ad.addAdEventListener(Ads.AdEventType.ERROR, () => {
          observability.logEvent('ad_shown', { placement: 'app_open', shown: false });
          resolve(false);
        });
        ad.load();
      });
      return shown;
    } catch {
      return false;
    }
  }

  async showRewarded(): Promise<boolean> {
    const Ads = loadAds();
    if (!Ads) return false;
    try {
      const ad = Ads.RewardedAd.createForAdRequest(
        resolveUnitId(Platform.OS === 'android' ? 'android' : 'ios', 'rewarded', Ads.TestIds.REWARDED),
      );
      const earned = await new Promise<boolean>((resolve) => {
        let rewarded = false;
        ad.addAdEventListener(Ads.RewardedAdEventType.LOADED, () => {
          ad.show();
        });
        ad.addAdEventListener(Ads.RewardedAdEventType.EARNED_REWARD, () => {
          rewarded = true;
        });
        ad.addAdEventListener(Ads.AdEventType.CLOSED, () => resolve(rewarded));
        ad.addAdEventListener(Ads.AdEventType.ERROR, () => {
          observability.logEvent('ad_shown', { placement: 'rewarded', shown: false });
          resolve(false);
        });
        ad.load();
      });
      return earned;
    } catch {
      return false;
    }
  }
}

// ----------------------------------------------------------- Remote config
class NativeRemoteConfig implements RemoteConfigService {
  private initialized = false;

  private async ensure(): Promise<void> {
    if (this.initialized) return;
    try {
      const RC = loadModule<RemoteConfigModule>(() => require('@react-native-firebase/remote-config'));
      if (!RC) return;
      await RC.fetchAndActivate(RC.getRemoteConfig());
    } catch {
      /* offline fallback to local defaults */
    } finally {
      this.initialized = true;
    }
  }

  getNumber(key: string): number {
    void this.ensure();
    try {
      const RC = loadModule<RemoteConfigModule>(() => require('@react-native-firebase/remote-config'));
      if (!RC) return typeof DEFAULT_CONFIG[key] === 'number' ? (DEFAULT_CONFIG[key] as number) : 0;
      return RC.getValue(RC.getRemoteConfig(), key).asNumber();
    } catch {
      const d = DEFAULT_CONFIG[key];
      return typeof d === 'number' ? d : 0;
    }
  }

  getBoolean(key: string): boolean {
    void this.ensure();
    try {
      const RC = loadModule<RemoteConfigModule>(() => require('@react-native-firebase/remote-config'));
      if (!RC) return Boolean(DEFAULT_CONFIG[key]);
      return RC.getValue(RC.getRemoteConfig(), key).asBoolean();
    } catch {
      return Boolean(DEFAULT_CONFIG[key]);
    }
  }

  async fetchAndActivate(): Promise<void> {
    await this.ensure();
  }
}

// ------------------------------------------------------------ Observability
class FirebaseObservabilityService implements ObservabilityService {
  private initialized = false;
  private totalTransitions = 0;
  private missedTransitions = 0;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.initialized = true;
    } catch {
      /* no-op */
    }
  }

  logEvent(name: string, params?: Record<string, unknown>): void {
    try {
      const Analytics = loadModule<AnalyticsModule>(() => require('@react-native-firebase/analytics'));
      if (!Analytics) return;
      Analytics.logEvent(Analytics.getAnalytics(), name, (params ?? {}) as Record<string, string | number>);
    } catch {
      /* no-op */
    }
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    try {
      const Crashlytics = loadModule<CrashlyticsModule>(() => require('@react-native-firebase/crashlytics'));
      if (!Crashlytics) return;
      Crashlytics.recordError(Crashlytics.getCrashlytics(), error);
      if (context) this.logEvent('error_context', context);
    } catch {
      /* no-op */
    }
  }

  trackTransition(missed: boolean): void {
    this.totalTransitions += 1;
    if (missed) this.missedTransitions += 1;
    this.logEvent('stage_transition', { missed });
    const rate = this.totalTransitions > 0 ? this.missedTransitions / this.totalTransitions : 0;
    if (rate > 0.15) {
      this.logEvent('missed_transition_rate_high', { rate });
      // Surface to the UI once (FGS opt-in dialog) — the layout decides
      // whether to show it based on settings.fgsDialogDismissed.
      notifyMissedRateHigh();
    }
  }
}

// ------------------------------------------------------------------- Speech
const WIDGET_SNAPSHOT_KEY = 'looptimer:widget-snapshot';

class NativeSpeechService implements SpeechService {
  private enabled = true;
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  async speak(text: string): Promise<void> {
    if (!this.enabled || !text) return;
    try {
      Speech.stop();
      Speech.speak(text, {
        language: i18n.language,
        // Speech is a nicety — it must never interrupt anything critical.
        onError: () => {},
      });
    } catch {
      /* speech unavailable — never crash the timer */
    }
  }
  stop(): void {
    try {
      Speech.stop();
    } catch {
      /* no-op */
    }
  }
}

// -------------------------------------------------------------------- Share
class NativeShareService implements ShareService {
  async share(text: string): Promise<boolean> {
    try {
      const result = await Share.share({ message: text });
      return result.action === Share.sharedAction;
    } catch {
      return false;
    }
  }
}

// ------------------------------------------------------------------ Widget
// expo-widgets (official, SDK 57) powers BOTH the home-screen widget (iOS
// WidgetKit + Android Glance) and the iOS Live Activity (ActivityKit). Its
// native module only exists in a dev build — in Expo Go the require throws and
// the bridges degrade to no-ops (same lazy pattern as ads/firebase above).
// The layout instances are required lazily too: constructing a Widget/Live
// Activity touches the native module, so we never do it at module load.

type TimerWidgetInstance = { updateSnapshot(props: TimerWidgetData): void };
type LiveActivityInstance = {
  update(props: TimerActivityContent): Promise<void>;
  end(dismissalPolicy?: string): Promise<void>;
};
type LiveActivityFactory = {
  start(props: TimerActivityContent, url?: string): LiveActivityInstance;
  getInstances(): LiveActivityInstance[];
};

/** Localized home-widget labels — i18n lives in the app, the widget extension
 * has no i18n. Read at update time so language changes are picked up on the
 * next sync. Single `widget.*` namespace shared with the Live Activity labels
 * (activityLabels below). */
function widgetLabels(): TimerWidgetLabels {
  return {
    openApp: i18n.t('widget.openApp'),
    start: i18n.t('widget.start'),
    pause: i18n.t('widget.pause'),
    resume: i18n.t('widget.resume'),
    stop: i18n.t('widget.stop'),
  };
}

let timerWidgetInstance: TimerWidgetInstance | null | undefined;
/** Lazy-load the home-screen widget instance (expo-widgets native required). */
function loadTimerWidget(): TimerWidgetInstance | null {
  if (timerWidgetInstance !== undefined) return timerWidgetInstance;
  try {
    const mod = require('../features/widget/timer-widget') as { default?: TimerWidgetInstance };
    timerWidgetInstance = mod?.default ?? null;
  } catch {
    timerWidgetInstance = null;
  }
  return timerWidgetInstance;
}

/** Localized Live Activity control labels — i18n lives in the app, the widget
 * extension has no i18n. Read at start/update time so language changes are
 * picked up on the next sync. Shared `widget.*` namespace with the home-widget
 * labels (widgetLabels above). */
function activityLabels(): TimerActivityLabels {
  return {
    pause: i18n.t('widget.pause'),
    skip: i18n.t('widget.skip'),
    resume: i18n.t('widget.resume'),
  };
}

let timerActivityFactory: LiveActivityFactory | null | undefined;
/** Lazy-load the Live Activity factory (iOS only; Android/web stay no-op). */
function loadTimerActivityFactory(): LiveActivityFactory | null {
  if (timerActivityFactory !== undefined) return timerActivityFactory;
  try {
    const mod = require('../features/widget/live-activity') as { default?: LiveActivityFactory };
    timerActivityFactory = mod?.default ?? null;
  } catch {
    timerActivityFactory = null;
  }
  return timerActivityFactory;
}

class NativeWidgetBridge implements WidgetBridge {
  async updateTimerSnapshot(snapshot: TimerSnapshot | null): Promise<void> {
    // AsyncStorage snapshot (debug / recovery path) — unchanged behaviour.
    try {
      if (snapshot == null) {
        await AsyncStorage.removeItem(WIDGET_SNAPSHOT_KEY);
      } else {
        await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
      }
    } catch {
      /* widget data is best-effort — never block the timer */
    }
    // Home-screen widget (iOS + Android via expo-widgets) — best-effort.
    try {
      const widget = loadTimerWidget();
      if (!widget) return;
      // Idle: carry the suggested preset so a body tap can quick-start it
      // (spec: android-widget R2 — `looptimer:///?start=<id>`); labels
      // localized through the data (the widget extension has no i18n).
      const idleQuickStart = snapshot == null ? resolveQuickStartPresetId() : '';
      widget.updateSnapshot(mapTimerSnapshotToWidgetData(snapshot, idleQuickStart, widgetLabels()));
    } catch {
      /* no-op */
    }
  }
}

// Live Activities (iOS 16.1+, ActivityKit) via expo-widgets. The activity
// keeps counting down on the Lock Screen even when the app is backgrounded —
// independent of the 50-notification queue (spec: live-activity R2).
class NativeLiveActivityBridge implements LiveActivityBridge {
  private instance: LiveActivityInstance | null = null;

  async start(snapshot: TimerSnapshot): Promise<void> {
    if (Platform.OS !== 'ios') return;
    try {
      const factory = loadTimerActivityFactory();
      if (!factory) return;
      // Single active session — never leave a stale activity on screen.
      await this.end();
      this.instance = factory.start(snapshotToActivityContent(snapshot, activityLabels()), 'looptimer:///timer');
    } catch {
      /* Live Activity unavailable — never crash the timer */
    }
  }

  async update(snapshot: TimerSnapshot): Promise<void> {
    if (Platform.OS !== 'ios' || !this.instance) return;
    try {
      await this.instance.update(snapshotToActivityContent(snapshot, activityLabels()));
    } catch {
      /* no-op */
    }
  }

  async end(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    const instance = this.instance;
    this.instance = null;
    if (!instance) return;
    try {
      await instance.end('immediate');
    } catch {
      /* no-op */
    }
  }
}

// --------------------------------------------------------------------- ATT
class NativeAttService implements AttService {
  async requestTrackingPermission(): Promise<'authorized' | 'denied' | 'restricted' | 'undetermined'> {
    try {
      if (Platform.OS !== 'ios') return 'denied';
      const { status } = await Tracking.requestTrackingPermissionsAsync();
      return status === 'granted' ? 'authorized' : status;
    } catch {
      return 'undetermined';
    }
  }
}

export const scheduler: Scheduler = new NativeScheduler();
export const notifications: NotificationsService = new NativeNotifications();
export const audio: AudioService = new NativeAudioService();
export const haptics: HapticsService = new NativeHapticsService();
export const wakeLock: WakeLockService = new NativeWakeLockService();
export const adManager: AdManager = new NativeAdManager();
export const remoteConfig: RemoteConfigService = new NativeRemoteConfig();
export const observability: ObservabilityService = new FirebaseObservabilityService();
export const att: AttService = new NativeAttService();
export const speech: SpeechService = new NativeSpeechService();
export const share: ShareService = new NativeShareService();
export const widgetBridge: WidgetBridge = new NativeWidgetBridge();
export const liveActivity: LiveActivityBridge = new NativeLiveActivityBridge();
