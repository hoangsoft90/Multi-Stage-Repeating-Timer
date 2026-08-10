/**
 * AdMob configuration (spec: monetization).
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
  android: { banner: '', interstitial: '', appOpen: '', rewarded: '' },
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
