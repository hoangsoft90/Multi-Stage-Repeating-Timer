/**
 * Web AdBanner stub — AdMob native SDK has no web support, so the Home
 * screen banner is simply absent on web. Metro resolves this file (over
 * `ad-banner.tsx`) for web bundles, keeping the ads package out of the web
 * bundle entirely.
 */
export function AdBanner() {
  return null;
}
