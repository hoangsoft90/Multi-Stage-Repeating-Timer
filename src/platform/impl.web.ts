/**
 * Web implementations. expo-notifications / ads / firebase have NO web
 * support — these are safe no-ops/loggers so the app runs fully in the
 * browser (spec allows no-op on web for unsupported capabilities).
 */
import {
  AdManager,
  AttService,
  AudioService,
  ConsentService,
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
import { SOUND_SOURCES } from '../features/sounds/sound-pack';
import { getUserSound } from '../features/sounds/user-sounds-store';
import i18n from '../i18n';

// ----------------------------------------------------------------- Scheduler
class WebScheduler implements Scheduler {
  async scheduleAt(
    _endsAt: number,
    _id: string,
    _title: string,
    _body: string,
    _category?: 'reminder_actions',
  ): Promise<void> {
    // expo-notifications is unsupported on web — no scheduling.
  }
  async cancelAll(): Promise<void> {}
  async cancelByIds(_ids: string[]): Promise<void> {}
  async canScheduleExactAlarm(): Promise<boolean> {
    return false;
  }
  async requestExactAlarmPermission(): Promise<void> {}
}

// ------------------------------------------------------- Notifications (web)
class WebNotifications implements NotificationsService {
  async requestPermission(): Promise<boolean> {
    return false; // no-op on web
  }
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    return 'denied';
  }
  async present(_title: string, _body: string): Promise<void> {}

  async registerActionCategories(
    _labels: {
      pause: string;
      skip: string;
      stop: string;
      reminderStart: string;
      reminderSnooze5: string;
      reminderSnooze10: string;
      reminderDismiss: string;
    },
  ): Promise<void> {}

  addNotificationResponseListener(_handler: (actionId: string, notificationId?: string) => void): () => void {
    return () => {};
  }
  async getLastNotificationResponse(): Promise<{ actionId: string; notificationId?: string } | null> {
    return null; // no notifications on web
  }
}

// --------------------------------------------------------------------- Audio
class WebAudioService implements AudioService {
  private enabled = true;
  private cache = new Map<string, HTMLAudioElement>();
  private sources: Record<string, string> = SOUND_SOURCES as Record<string, string>;

  async preload(): Promise<void> {
    for (const [id, src] of Object.entries(this.sources)) {
      try {
        const el = new Audio(src);
        el.preload = 'auto';
        this.cache.set(id, el);
      } catch {
        /* no-op */
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async play(soundId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      // Bundled sounds use the static source map; user-imported sounds play
      // from their file uri (spec: custom sounds).
      const src = this.sources[soundId] ?? getUserSound(soundId)?.uri;
      if (!src) return;
      const el = this.cache.get(soundId) ?? new Audio(src);
      el.currentTime = 0;
      await el.play().catch(() => {});
    } catch {
      // never crash the timer
    }
  }
}

// ------------------------------------------------------------------ Haptics
class WebHapticsService implements HapticsService {
  private enabled = true;
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  async vibrate(_patternId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch {
      /* no-op */
    }
  }
}

// ---------------------------------------------------------------- Wake lock
class WebWakeLockService implements WakeLockService {
  private sentinel: any = null;

  async activate(): Promise<void> {
    try {
      const nav = navigator as any;
      if (nav.wakeLock) {
        this.sentinel = await nav.wakeLock.request('screen');
      }
    } catch {
      /* unsupported */
    }
  }

  async deactivate(): Promise<void> {
    try {
      await this.sentinel?.release();
    } catch {
      /* no-op */
    } finally {
      this.sentinel = null;
    }
  }
}

// --------------------------------------------------------------------- Ads
class WebAdManager implements AdManager {
  readonly supported = false;
  private lastInterstitial = 0;
  private lastAppOpen = 0;
  private interstitialPerSession = 0;

  canShowAppOpen(coldStart: boolean, hasActiveSession: boolean, now: number): boolean {
    return coldStart && !hasActiveSession && now - this.lastAppOpen >= 60_000;
  }
  canShowInterstitial(sessionRunning: boolean, now: number): boolean {
    return !sessionRunning && now - this.lastInterstitial >= 240_000 && this.interstitialPerSession < 1;
  }
  canShowRewarded(): boolean {
    return true; // user-initiated
  }
  async showAppOpen(): Promise<boolean> {
    this.lastAppOpen = Date.now();
    return false; // no ad on web
  }
  async showInterstitial(): Promise<boolean> {
    this.lastInterstitial = Date.now();
    this.interstitialPerSession += 1;
    return false;
  }
  async showRewarded(): Promise<boolean> {
    return false; // reward without ad on web (dev/testing convenience)
  }
}

// ----------------------------------------------------------- Remote config
const DEFAULT_CONFIG: Record<string, number | boolean> = {
  interstitial_cooldown_seconds: 240,
  interstitial_max_per_session: 1,
  app_open_cooldown_seconds: 60,
  max_scheduled_transitions_ios: 50,
  missed_transition_rate_threshold: 0.15,
  timer_screen_native_ad_enabled: false,
  preset_free_limit: -1,
  custom_sound_unlock_hours: 24,
  reminder_reserved_slots: 10,
};

class WebRemoteConfig implements RemoteConfigService {
  getNumber(key: string): number {
    const v = DEFAULT_CONFIG[key];
    return typeof v === 'number' ? v : 0;
  }
  getBoolean(key: string): boolean {
    return Boolean(DEFAULT_CONFIG[key]);
  }
  async fetchAndActivate(): Promise<void> {}
}

// ------------------------------------------------------------ Observability
class LogObservabilityService implements ObservabilityService {
  private enabled = true;
  async init(): Promise<void> {}
  logEvent(name: string, params?: Record<string, unknown>): void {
    if (this.enabled && __DEV__) {
      console.log(`[analytics] ${name}`, params ?? '');
    }
  }
  logError(error: Error, context?: Record<string, unknown>): void {
    console.error('[error]', error.message, context ?? '');
  }
  trackTransition(missed: boolean): void {
    this.logEvent('stage_transition', { missed });
  }
}

// ------------------------------------------------------------------- Speech
class WebSpeechService implements SpeechService {
  private enabled = true;
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  async speak(text: string): Promise<void> {
    if (!this.enabled || !text) return;
    try {
      const synth =
        typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
          ? window.speechSynthesis
          : null;
      if (!synth) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = i18n.language;
      synth.speak(utterance);
    } catch {
      /* speech unavailable — never crash */
    }
  }
  stop(): void {
    try {
      const synth =
        typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
          ? window.speechSynthesis
          : null;
      synth?.cancel();
    } catch {
      /* no-op */
    }
  }
}

// -------------------------------------------------------------------- Share
class WebShareService implements ShareService {
  async share(text: string): Promise<boolean> {
    try {
      const nav = navigator as Navigator & {
        share?: (data: { text: string }) => Promise<void>;
      };
      if (typeof nav.share === 'function') {
        await nav.share({ text });
        return true;
      }
    } catch {
      // User dismissed the share sheet — fall through to clipboard.
    }
    // Fallback: copy to clipboard (still lets users paste the JSON).
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

// ------------------------------------------------------------------ Widget
class WebWidgetBridge implements WidgetBridge {
  async updateTimerSnapshot(_snapshot: TimerSnapshot | null): Promise<void> {
    // No home-screen widgets on web — no-op (kept for a shared contract).
  }
}

class WebLiveActivityBridge implements LiveActivityBridge {
  async start(_snapshot: TimerSnapshot): Promise<void> {}
  async update(_snapshot: TimerSnapshot): Promise<void> {}
  async end(): Promise<void> {}
}

// --------------------------------------------------------------------- ATT
class WebAttService implements AttService {
  async requestTrackingPermission(): Promise<'undetermined'> {
    return 'undetermined'; // no ATT on web
  }
}

// ------------------------------------------------------------------ Consent
class WebConsentService implements ConsentService {
  async gatherConsent(): Promise<boolean> {
    return true; // no ads on web — nothing to consent to
  }
  async getConsentStatus(): Promise<'not_required'> {
    return 'not_required';
  }
  async canRequestAds(): Promise<boolean> {
    return true;
  }
  async shouldUseNonPersonalized(): Promise<boolean> {
    return false;
  }
  async showPrivacyOptionsForm(): Promise<boolean> {
    return false;
  }
}

export const scheduler: Scheduler = new WebScheduler();
export const notifications: NotificationsService = new WebNotifications();
export const audio: AudioService = new WebAudioService();
export const haptics: HapticsService = new WebHapticsService();
export const wakeLock: WakeLockService = new WebWakeLockService();
export const adManager: AdManager = new WebAdManager();
export const consent: ConsentService = new WebConsentService();
export const remoteConfig: RemoteConfigService = new WebRemoteConfig();
export const observability: ObservabilityService = new LogObservabilityService();
export const att: AttService = new WebAttService();
export const speech: SpeechService = new WebSpeechService();
export const share: ShareService = new WebShareService();
export const widgetBridge: WidgetBridge = new WebWidgetBridge();
export const liveActivity: LiveActivityBridge = new WebLiveActivityBridge();
