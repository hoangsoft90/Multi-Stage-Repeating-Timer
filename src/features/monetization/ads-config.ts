/**
 * AdMob configuration (spec: monetization).
 *
 * Pinned dependency note: react-native-google-mobile-ads is pinned EXACT to
 * 16.3.4 (package.json). 16.4.0 pulls play-services-ads 25.4.0 which is
 * compiled with Kotlin 2.3 metadata — RN 0.86 (Expo SDK 57) ships Kotlin
 * 2.1.20, so Gradle fails with "incompatible version of Kotlin" (issue
 * invertase/react-native-google-mobile-ads#863). 16.3.4 pins ads 25.0.0 and
 * keeps every API this app uses (AdsConsent UMP, requestNonPersonalizedAdsOnly,
 * getUserChoices.selectPersonalisedAds). Re-check before bumping.
 *
 * REAL_UNIT_IDS — paste your REAL AdMob unit IDs here when your app is
 * approved. While an ID is '' the app uses Google's public TEST unit IDs
 * (ads render a "Test Ad" watermark and generate NO revenue). Swapping IDs
 * requires a rebuild — no other code change.
 *
 * PLACEMENT_ENABLED — which placements are live. App Open is OFF by default
 * (product decision); flip `appOpen` to true to enable it.
 *
 * NOTE: this module must NEVER import the ads package statically — it throws
 * at module load where the native SDK is missing (Expo Go). Test IDs are
 * therefore supplied by callers (they already hold the loaded ads module).
 */
export type AdPlatform = 'android' | 'ios';

export interface AdUnitIds {
  banner: string;
  interstitial: string;
  appOpen: string;
  rewarded: string;
}

/** Paste your REAL AdMob unit IDs here ('' = use Google test IDs). */
export const REAL_UNIT_IDS: Record<AdPlatform, AdUnitIds> = {
  // Android (live): real AdMob app ca-app-pub-6917313063209470~4808606529.
  android: {
    banner: 'ca-app-pub-6917313063209470/2118295781',
    interstitial: 'ca-app-pub-6917313063209470/9989046949',
    appOpen: '', // placement disabled (PLACEMENT_ENABLED.appOpen = false)
    rewarded: 'ca-app-pub-6917313063209470/9581852835',
  },
  // iOS: no real AdMob app yet — Google test IDs (watermark, no revenue).
  ios: { banner: '', interstitial: '', appOpen: '', rewarded: '' },
};

/** Live placements. `appOpen` disabled by default (product decision). */
export const PLACEMENT_ENABLED = {
  appOpen: false,
  interstitial: true,
  banner: true,
  rewarded: true,
} as const;

/**
 * Real unit ID when configured, otherwise the platform's Google test ID
 * (passed in by the caller, which already loaded the ads module).
 */
export function resolveUnitId(platform: AdPlatform, placement: keyof AdUnitIds, testId: string): string {
  return REAL_UNIT_IDS[platform][placement] || testId;
}

/** Google demo App IDs — usable in app.json until a real AdMob app exists. */
export const DEMO_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;
