import { DEMO_APP_IDS, PLACEMENT_ENABLED, REAL_UNIT_IDS, resolveUnitId } from '../ads-config';

describe('ads-config', () => {
  it('fallback: dùng platform test id khi chưa cấu hình real id', () => {
    expect(resolveUnitId('android', 'banner', 'test-banner')).toBe('test-banner');
    expect(resolveUnitId('ios', 'interstitial', 'test-interstitial')).toBe('test-interstitial');
    expect(resolveUnitId('android', 'rewarded', 'test-rewarded')).toBe('test-rewarded');
  });

  it('ưu tiên real id khi đã cấu hình', () => {
    (REAL_UNIT_IDS as Record<string, { banner: string }>).android.banner = 'ca-app-pub-real/banner';
    expect(resolveUnitId('android', 'banner', 'test-banner')).toBe('ca-app-pub-real/banner');
    (REAL_UNIT_IDS as Record<string, { banner: string }>).android.banner = '';
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
