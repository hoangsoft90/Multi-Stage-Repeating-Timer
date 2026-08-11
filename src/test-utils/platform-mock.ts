/**
 * Shared jest mock for the platform module (src/platform).
 *
 * Usage in test files:
 *   jest.mock('../../platform', () => {
 *     const m = jest.requireActual('../../test-utils/platform-mock');
 *     return m.platformMock;
 *   });
 *
 * The real native impl (impl.native.ts) imports expo-notifications, ads and
 * Firebase at module load — tests must never load it. This factory replaces
 * every export with a jest.fn() so no native module is touched.
 */
export const platformMock = {
  scheduler: {
    scheduleAt: jest.fn().mockResolvedValue(undefined),
    cancelAll: jest.fn().mockResolvedValue(undefined),
    cancelByIds: jest.fn().mockResolvedValue(undefined),
    canScheduleExactAlarm: jest.fn().mockResolvedValue(true),
    requestExactAlarmPermission: jest.fn().mockResolvedValue(undefined),
  },
  notifications: {
    requestPermission: jest.fn().mockResolvedValue(true),
    getPermissionStatus: jest.fn().mockResolvedValue('granted'),
    present: jest.fn().mockResolvedValue(undefined),
    registerActionCategories: jest.fn().mockResolvedValue(undefined),
    addNotificationResponseListener: jest.fn().mockReturnValue(() => {}),
    getLastNotificationResponse: jest.fn().mockResolvedValue(null),
  },
  audio: {
    play: jest.fn().mockResolvedValue(undefined),
    setEnabled: jest.fn(),
    preload: jest.fn().mockResolvedValue(undefined),
  },
  haptics: {
    vibrate: jest.fn().mockResolvedValue(undefined),
    setEnabled: jest.fn(),
  },
  wakeLock: {
    activate: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
  },
  adManager: {
    supported: false,
    canShowAppOpen: jest.fn().mockReturnValue(false),
    canShowInterstitial: jest.fn().mockReturnValue(false),
    canShowRewarded: jest.fn().mockReturnValue(false),
    showAppOpen: jest.fn().mockResolvedValue(false),
    showInterstitial: jest.fn().mockResolvedValue(false),
    showRewarded: jest.fn().mockResolvedValue(false),
  },
  consent: {
    gatherConsent: jest.fn().mockResolvedValue(true),
    getConsentStatus: jest.fn().mockResolvedValue('not_required'),
    canRequestAds: jest.fn().mockResolvedValue(true),
    shouldUseNonPersonalized: jest.fn().mockResolvedValue(false),
    showPrivacyOptionsForm: jest.fn().mockResolvedValue(false),
  },
  remoteConfig: {
    getNumber: jest.fn().mockReturnValue(0),
    getBoolean: jest.fn().mockReturnValue(false),
    fetchAndActivate: jest.fn().mockResolvedValue(undefined),
  },
  observability: {
    init: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn(),
    logError: jest.fn(),
    trackTransition: jest.fn(),
  },
  att: {
    requestTrackingPermission: jest.fn().mockResolvedValue('denied'),
  },
  speech: {
    speak: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    setEnabled: jest.fn(),
  },
  share: {
    share: jest.fn().mockResolvedValue(true),
  },
  widgetBridge: {
    updateTimerSnapshot: jest.fn().mockResolvedValue(undefined),
  },
  liveActivity: {
    start: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
  },
};
