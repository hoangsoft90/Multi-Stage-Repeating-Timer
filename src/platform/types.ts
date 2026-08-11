/**
 * Platform service contracts (spec: background-scheduling, feedback,
 * monetization, observability). Web and native implement these; Metro picks
 * the right one via index.web.ts / index.native.ts resolution.
 */

export interface Scheduler {
  /**
   * Schedule a notification/alarm at an absolute time. `category` selects
   * the action buttons on the notification: undefined → timer controls
   * (Pause/Skip/Stop), 'reminder_actions' → Start/Snooze/Dismiss.
   */
  scheduleAt(
    endsAt: number,
    id: string,
    title: string,
    body: string,
    category?: 'reminder_actions',
  ): Promise<void>;
  cancelAll(): Promise<void>;
  cancelByIds(ids: string[]): Promise<void>;
  /** Permission state helpers (Android). */
  canScheduleExactAlarm(): Promise<boolean>;
  requestExactAlarmPermission(): Promise<void>;
}

export interface NotificationsService {
  /** Ask POST_NOTIFICATIONS (Android 13+) — called on first timer creation. */
  requestPermission(): Promise<boolean>;
  getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'>;
  /** Show an immediate foreground notification (session complete, etc.). */
  present(title: string, body: string): Promise<void>;
  /**
   * Register the action categories on notifications: 'timer_controls'
   * (Pause/Skip/Stop) + 'reminder_actions' (Start/Snooze/Dismiss). Button
   * labels are localized — re-register on language change. Web: no-op.
   */
  registerActionCategories(labels: {
    pause: string;
    skip: string;
    stop: string;
    reminderStart: string;
    reminderSnooze5: string;
    reminderSnooze10: string;
    reminderDismiss: string;
  }): Promise<void>;
  /**
   * Subscribe to notification action taps. `notificationId` is the id the
   * notification was scheduled with (e.g. `routine_<scheduleId>`) so reminder
   * actions can map back to their schedule. Returns an unsubscribe fn.
   */
  addNotificationResponseListener(
    handler: (actionId: string, notificationId?: string) => void,
  ): () => void;
  /**
   * Read the notification response that launched the app (cold start).
   * Returns the action id + notification id, or null when the app wasn't
   * opened from a notification tap / there is no pending response.
   */
  getLastNotificationResponse(): Promise<{ actionId: string; notificationId?: string } | null>;
}

export interface AudioService {
  play(soundId: string): Promise<void>;
  setEnabled(enabled: boolean): void;
  preload(): Promise<void>;
}

export interface HapticsService {
  vibrate(patternId: string): Promise<void>;
  setEnabled(enabled: boolean): void;
}

export interface WakeLockService {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

export type AdPlacement = 'app_open' | 'interstitial' | 'native_home' | 'rewarded';

export interface AdManager {
  /** True when the platform can actually show ads (web = false). */
  readonly supported: boolean;
  /** Eligibility gates (spec: monetization). */
  canShowAppOpen(coldStart: boolean, hasActiveSession: boolean, now: number): boolean;
  canShowInterstitial(sessionRunning: boolean, now: number): boolean;
  canShowRewarded(): boolean;
  showAppOpen(): Promise<boolean>;
  showInterstitial(): Promise<boolean>;
  showRewarded(): Promise<boolean>;
}

export interface RemoteConfigService {
  getNumber(key: string): number;
  getBoolean(key: string): boolean;
  fetchAndActivate(): Promise<void>;
}

export interface ObservabilityService {
  init(): Promise<void>;
  logEvent(name: string, params?: Record<string, unknown>): void;
  logError(error: Error, context?: Record<string, unknown>): void;
  /** Track a transition for missed_transition_rate. */
  trackTransition(missed: boolean): void;
}

export interface AttService {
  /** Request ATT after the first value-moment (iOS). Returns tracking status. */
  requestTrackingPermission(): Promise<'authorized' | 'denied' | 'restricted' | 'undetermined'>;
}

export type ConsentStatus = 'unknown' | 'required' | 'not_required' | 'obtained';

export interface ConsentService {
  /**
   * Run the Google UMP consent flow (request info + show consent form when
   * required). No-op on web / Expo Go (no ads SDK). Returns whether the app
   * is allowed to request ads.
   */
  gatherConsent(): Promise<boolean>;
  /** Current UMP consent status (AdsConsentStatus mapping). */
  getConsentStatus(): Promise<ConsentStatus>;
  /**
   * True when the Mobile Ads SDK may request ads (UMP gate: consent obtained
   * or not required). False while consent is required but not yet given.
   */
  canRequestAds(): Promise<boolean>;
  /**
   * True when the NEXT ad request must be non-personalized-only (ATT
   * denied/restricted, or the user declined personalized ads in UMP).
   */
  shouldUseNonPersonalized(): Promise<boolean>;
  /** Show the UMP privacy options form (GDPR) — returns success. */
  showPrivacyOptionsForm(): Promise<boolean>;
}

export interface SpeechService {
  /** Speak a short phrase (stage names, countdown warnings). No-op when off. */
  speak(text: string): Promise<void>;
  /** Stop any ongoing speech (before starting a new phrase). */
  stop(): void;
  setEnabled(enabled: boolean): void;
}

export interface ShareService {
  /**
   * Share text via the system sheet (native) or navigator.share with a
   * clipboard fallback (web). Resolves false when sharing failed/skipped.
   */
  share(text: string): Promise<boolean>;
}

/** Immutable timer state snapshot consumed by home-screen widgets. */
export interface TimerSnapshot {
  presetId: string;
  presetName: string;
  stageName: string;
  stageIndex: number;
  totalStages: number;
  round: number;
  totalRounds: number;
  remainingMs: number;
  stageEndsAt: number | null;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped';
  /** v1.4 (spec: live-activity): name of the upcoming stage ('' when none). */
  nextStageName: string;
  /** v1.4 (spec: android-widget): repeat is forever → round renders as `x / ∞`. */
  isForever: boolean;
}

export interface WidgetBridge {
  /** Publish the current timer snapshot (null clears it). */
  updateTimerSnapshot(snapshot: TimerSnapshot | null): Promise<void>;
}

export interface LiveActivityBridge {
  start(snapshot: TimerSnapshot): Promise<void>;
  update(snapshot: TimerSnapshot): Promise<void>;
  end(): Promise<void>;
}
