import { DEMO_APP_IDS, PLACEMENT_ENABLED, resolveUnitId } from '../ads-config';

describe('ads-config', () => {
  it('fallback: dùng platform test id khi chưa cấu hình real id (iOS + appOpen)', () => {
    expect(resolveUnitId('ios', 'banner', 'test-banner')).toBe('test-banner');
    expect(resolveUnitId('ios', 'interstitial', 'test-interstitial')).toBe('test-interstitial');
    expect(resolveUnitId('android', 'appOpen', 'test-open')).toBe('test-open');
  });

  it('ưu tiên real id khi đã cấu hình (Android live)', () => {
    expect(resolveUnitId('android', 'banner', 'test-banner')).toBe('ca-app-pub-6917313063209470/2118295781');
    expect(resolveUnitId('android', 'interstitial', 'test-interstitial')).toBe('ca-app-pub-6917313063209470/9989046949');
    expect(resolveUnitId('android', 'rewarded', 'test-rewarded')).toBe('ca-app-pub-6917313063209470/9581852835');
  });

  it('iOS chưa cấu hình real id — tất cả placement fallback test id', () => {
    expect(resolveUnitId('ios', 'banner', 'test-banner')).toBe('test-banner');
    expect(resolveUnitId('ios', 'interstitial', 'test-interstitial')).toBe('test-interstitial');
    expect(resolveUnitId('ios', 'rewarded', 'test-rewarded')).toBe('test-rewarded');
  });

  it('appOpen bị tắt mặc định; banner/interstitial/rewarded bật', () => {
    expect(PLACEMENT_ENABLED.appOpen).toBe(false);
    expect(PLACEMENT_ENABLED.banner).toBe(true);
    expect(PLACEMENT_ENABLED.interstitial).toBe(true);
    expect(PLACEMENT_ENABLED.rewarded).toBe(true);
  });

  it('demo app ids hợp lệ định dạng ca-app-pub-xxx~yyy', () => {
    expect(DEMO_APP_IDS.android).toMatch(/^ca-app-pub-\d+~\d+$/);
    expect(DEMO_APP_IDS.ios).toMatch(/^ca-app-pub-\d+~\d+$/);
  });
});
