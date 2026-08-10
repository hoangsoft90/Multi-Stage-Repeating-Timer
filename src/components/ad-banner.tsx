/**
 * Adaptive banner ad (spec: monetization — Banner on Home).
 *
 * Native builds: renders a real Google Mobile Ads adaptive banner. Web (and
 * any environment where the native SDK is missing, e.g. Expo Go) renders
 * nothing — the ads package throws at module load there, so it is
 * lazy-required inside try/catch and never imported statically.
 *
 * The web platform never loads this file at all: Metro resolves the
 * `ad-banner.web.tsx` stub instead, keeping the ads package out of the web
 * bundle.
 */
import { Platform, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adManager, observability } from '@/platform';
import { resolveUnitId } from '@/features/monetization/ads-config';

type BannerAdComponent = React.ComponentType<{
  unitId: string;
  size: string;
  onAdFailedToLoad?: (error: Error) => void;
}>;

export function AdBanner() {
  const insets = useSafeAreaInsets();
  const [ads, setAds] = useState<{ BannerAd: BannerAdComponent; unitId: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !adManager.supported) return;
    try {
      const Ads = require('react-native-google-mobile-ads') as {
        BannerAd?: BannerAdComponent;
        TestIds?: { ADAPTIVE_BANNER?: string; BANNER?: string };
      };
      if (Ads?.BannerAd) {
        const platform = Platform.OS === 'android' ? 'android' : 'ios';
        const testId = Ads.TestIds?.ADAPTIVE_BANNER || Ads.TestIds?.BANNER || '';
        setAds({
          BannerAd: Ads.BannerAd as BannerAdComponent,
          unitId: resolveUnitId(platform, 'banner', testId),
        });
      }
    } catch {
      /* Expo Go / no native SDK — banner is simply absent */
    }
  }, []);

  if (!ads || failed) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 6 }]}>
      <ads.BannerAd
        unitId={ads.unitId}
        size="ANCHORED_ADAPTIVE_BANNER"
        onAdFailedToLoad={(error) => {
          observability.logEvent('ad_shown', { placement: 'banner', shown: false, reason: error.message });
          setFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
});
