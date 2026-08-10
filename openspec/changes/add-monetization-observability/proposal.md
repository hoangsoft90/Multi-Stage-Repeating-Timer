## Why

App đã hoàn chỉnh về chức năng (engine → UI → background → feedback) nhưng chưa có nguồn thu và chưa quan sát được hành vi user. Phase 4 đưa vào AdMob đúng vị trí (App Open + Interstitial post-Stop + Native Home + Rewarded tạm thời, KHÔNG ad trên Timer Running), Remote Config với default values cụ thể, luồng ATT đúng thời điểm (sau value-moment, non-personalized fallback khi bị deny), và Firebase Analytics/Crashlytics với `missed_transition_rate` từ Day 1 — để biết khi nào nên gợi ý FGS (Phase 2) và tối ưu eCPM.

## What Changes

- **Ad placement (đóng băng)**: App Open (cold/warm start && !hasActiveSession && cooldown), Interstitial sau Stop thủ công hoặc session tự kết thúc (cooldown 240s, max 1/phiên), Native/Banner Home, Rewarded (user chủ động unlock **tạm thời 24h** custom sound). **Timer Running: KHÔNG có ad.** Notification action / stage change: không show ad.
- **Ad library**: **`react-native-google-mobile-ads`** (config plugin trong app.json, App ID Android/iOS; **yêu cầu dev build** — không chạy trong Expo Go; web: no-op vì SDK ads không hỗ trợ web).
- **Ad eligibility (AdManager)**: `canShowAppOpen()`, `canShowInterstitial()`, `canShowRewarded()` theo cooldown + frequency cap + trạng thái session; mọi magic number từ Remote Config.
- **Remote Config default values**: bảng 8 key (interstitial_cooldown_seconds=240, interstitial_max_per_session=1, app_open_cooldown_seconds=60, max_scheduled_transitions_ios=50, missed_transition_rate_threshold=0.15, timer_screen_native_ad_enabled=false, preset_free_limit=-1, custom_sound_unlock_hours=24) qua **`@react-native-firebase/remote-config`**.
- **ATT (iOS)**: **`expo-tracking-transparency`** — xin sau khi user có value-moment đầu tiên (tạo/start timer đầu tiên thành công), không xin lúc cold-start; Denied/Restricted → non-personalized ads fallback vẫn serve.
- **Observability**: **`@react-native-firebase/analytics` + `crashlytics`**; metrics: `missed_transition_rate` (ngưỡng 0.15 → gợi ý FGS), `ad_shown/clicked`, `permission_denied` (tách theo loại), `timer_started`, `att_status`.
- **Policy**: Privacy Policy + Consent Day 1, link trong Settings (đã có Phase 1), mô tả Google Mobile Ads SDK.

**Không đổi behavior hiện có**: không ảnh hưởng engine/UI/scheduling/feedback; ad chỉ xuất hiện ở nơi quy định.

## Capabilities

### New Capabilities

- `monetization`: AdMob placement + AdManager eligibility (App Open, Interstitial post-Stop, Native Home, Rewarded 24h; không ad khi timer chạy/stage change).
- `remote-config`: Remote Config với 8 default values + mechanism fallback khi không có network.
- `observability`: Analytics + Crashlytics, danh sách metrics chuẩn (missed_transition_rate, ad_shown/clicked, permission_denied, timer_started, att_status).
- `policy`: Privacy Policy + Consent Day 1 + ATT timing (sau value-moment) + non-personalized fallback.

### Modified Capabilities

<!-- Không có — greenfield. -->

## Impact

- **Code mới**: `src/features/monetization/` — `AdManager` (eligibility + show), `RewardedUnlockService` (24h unlock); `src/features/observability/` — AnalyticsService, Crashlytics init, metrics helpers; `src/config/remote-config.ts` (defaults + service).
- **Dependencies mới**: `react-native-google-mobile-ads`, `@react-native-firebase/app`, `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics`, `@react-native-firebase/remote-config`, `expo-tracking-transparency`.
- **Native config**: app.json — config plugins ads (App ID) + firebase (google-services.json / GoogleService-Info.plist), ATT string trong Info.plist (qua plugin ads hoặc ios.infoPlist), Privacy Policy URL.
- **Dev build bắt buộc** cho ads + firebase (expo-dev-client/EAS) — không chạy trong Expo Go; **web: tất cả no-op an toàn** (ads/firebase không hỗ trợ web).
- **Phụ thuộc**: change `add-ui-and-storage` (Settings link Privacy/Rate, Home native ad slot, Timer Running sacred), `add-background-scheduling` (missed_transition_rate → FGS suggestion), `add-feedback-notifications` (Rewarded unlock custom sound).
- **Rủi ro**: MED theo plan §9 — chính yếu là policy (ATT timing, specialUse justification, frequency cap, Privacy Policy Day 1).
