import {
  DEMO_APP_IDS,
  PLACEMENT_ENABLED,
  REAL_UNIT_IDS,
  TEST_ADS,
  resolveUnitId,
} from '../ads-config';

describe('ads-config', () => {
  it('TEST_ADS=false (production) → Android dùng real unit id đã cấu hình', () => {
    expect(TEST_ADS).toBe(false);
    expect(resolveUnitId('android', 'banner', 'test-banner')).toBe(REAL_UNIT_IDS.android.banner);
    expect(resolveUnitId('android', 'interstitial', 'test-interstitial')).toBe(REAL_UNIT_IDS.android.interstitial);
    expect(resolveUnitId('android', 'rewarded', 'test-rewarded')).toBe(REAL_UNIT_IDS.android.rewarded);
    // appOpen disabled → real id trống → fallback test id (không bao giờ render).
    expect(resolveUnitId('android', 'appOpen', 'test-open')).toBe('test-open');
    // iOS chưa có real app → fallback test id.
    expect(resolveUnitId('ios', 'banner', 'test-banner')).toBe('test-banner');
  });

  it('real ids vẫn được cấu hình hợp lệ — khi tắt TEST_ADS chỉ cần đổi flag là live', () => {
    expect(REAL_UNIT_IDS.android.banner).toMatch(/^ca-app-pub-\d+\/\d+$/);
    expect(REAL_UNIT_IDS.android.interstitial).toMatch(/^ca-app-pub-\d+\/\d+$/);
    expect(REAL_UNIT_IDS.android.rewarded).toMatch(/^ca-app-pub-\d+\/\d+$/);
    // iOS chưa có real app — để trống (fallback test id).
    expect(REAL_UNIT_IDS.ios.banner).toBe('');
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
