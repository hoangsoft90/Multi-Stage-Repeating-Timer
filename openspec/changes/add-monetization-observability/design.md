## Context

App hoàn chỉnh chức năng sau 4 phase (engine → UI/storage → background → feedback). Phase 4 thêm nguồn thu AdMob đúng vị trí, Remote Config, ATT, và đo lường — theo bảng placement đóng băng §5 của plan v1.2. Động lực xem `proposal.md`; behavior ở `specs/monetization`, `specs/remote-config`, `specs/observability`, `specs/policy`.

## Goals / Non-Goals

**Goals:**
- 4 placement ad đúng vị trí + eligibility qua AdManager; tuyệt đối không ad trên Timer Running.
- Remote Config với 9 default values; mọi magic number qua config.
- ATT đúng thời điểm + non-personalized fallback (⚠️ chưa implement — defer, xem policy spec); Privacy Policy Day 1.
- Analytics/Crashlytics + metrics chuẩn từ Day 1 (gồm missed_transition_rate → FGS suggestion).

**Non-Goals:**
- Không giới hạn preset ở MVP (`preset_free_limit = -1`) — Pro (remove ads/history/advanced) là P2.
- Không làm custom sound upload vĩnh viễn — chỉ unlock tạm 24h qua Rewarded (P1: tải vĩnh viễn).
- Không làm statistics/cloud sync/account — P2.
- Không làm consent SDK (UMP) nâng cao — cơ bản đúng chuẩn + fallback non-personalized là đủ MVP (⚠️ cả UMP lẫn fallback đều chưa implement — defer, bắt buộc trước release tại EEA/UK/CH).

## Decisions

1. **`react-native-google-mobile-ads` là facade ad duy nhất** (thay google_mobile_ads): App Open qua `AppOpenAd`, Interstitial qua `InterstitialAd`, Banner/Native qua `BannerAd`/`AdView`, Rewarded qua `RewardedAd`. `AdManager` quyết định eligibility (theo Remote Config + session state) rồi gọi show; UI không gọi SDK trực tiếp. **Cấu hình**: config plugin trong app.json với `android_app_id`/`ios_app_id` (App ID sai → crash lúc khởi động, phải đúng ngay từ đầu); test dùng `TestIds` riêng, không lẫn production. **Yêu cầu dev build** (expo-dev-client/EAS) — không chạy trong Expo Go. **Web: AdManager no-op** (SDK không hỗ trợ web).
2. **`@react-native-firebase/app` + `analytics` + `crashlytics` + `remote-config`** (thay firebase_* Flutter): config plugin trong app.json; `google-services.json` + `GoogleService-Info.plist` đặt cạnh app.json, khai qua `android.googleServicesFile`/`ios.googleServicesFile`; cần `expo-build-properties` với `useFrameworks: dynamic` (SPM). Init phải không-blocking (try/catch, log lỗi). **Yêu cầu dev build**; **web: no-op** (dùng LogObservabilityService).
3. **Remote Config service**: `RemoteConfigService` bọc @react-native-firebase/remote-config, khai báo 9 default values tập trung (gồm `reminder_reserved_slots=10` — dùng cho iOS budget-split, spec scheduled-routine), `fetchAndActivate()` ở khởi động (timeout ngắn), offline → default local. Không hard-code ngưỡng ở nơi khác. Khi Firebase chưa cấu hình (web/dev chưa có credentials) → fallback default values.
4. **ATT qua `expo-tracking-transparency`**: gọi `requestTrackingPermissionsAsync()` trong `startPreset` (start timer đầu tiên = value-moment; gọi lại các lần sau vô hại vì iOS chỉ prompt một lần). Sau khi trả lời ghi event `att_prompt_shown` (chưa log trạng thái chi tiết `att_status`). Non-personalized fallback qua `setRequestConfiguration`/tag **chưa implement (defer)** — ghi rõ trong policy spec.
5. **missed_transition_rate**: engine đã có thông tin missed (reconcile bắt kịp K stage) → ObservabilityService đếm transition đúng giờ vs missed; lưu tỷ lệ rolling local + log analytics; so với `missed_transition_rate_threshold` (RC) → gợi ý FGS dialog (Phase 2 logic, gọi từ đây).
6. **AdManager eligibility**: `canShowAppOpen() = isColdStartOrWarmResume && !hasActiveSession && cooldownPassed`; `canShowInterstitial() = !sessionRunning && cooldownPassed && frequencyCapOk`; `canShowRewarded() = luôn (user chủ động)`. Cooldown/cap đọc từ RC, không hard-code.
7. **Privacy Policy + consent**: URL đặt trong code (hằng số, dễ đổi), link Settings (đã có Phase 1). UMP: cài đặt tối thiểu theo Google — nếu khu vực yêu cầu thì thêm `UserMessagingPlatform` (quyết định lúc code theo đơn vị phát hành).
8. **ObservabilityService interface**: `FirebaseObservabilityService` (mobile) + `LogObservabilityService` (web/dev — console + no-op). Lý do: web export không có Firebase web config; mọi metrics vẫn log được trong dev.

## Risks / Trade-offs

- **Policy reject (AdMob/Play/App Store)** → Privacy Policy Day 1 + ATT đúng timing + non-personalized fallback + specialUse justification (FGS Phase 2) + frequency cap. Không show ad trên sacred screen.
- **Revenue thấp vì user khóa máy** → placement App Open + Interstitial post-Stop + Native Home (đúng chỗ AdMob trả tiền: impression rendered), không kỳ vọng dwell-time.
- **Remote Config không fetch được** → default values local, app vẫn chạy (spec remote-config).
- **ATT xin quá sớm bị deny cao** → chỉ xin sau value-moment; deny vẫn serve non-personalized (không mất hẳn eCPM — ⚠️ fallback chưa implement, xem tasks 4.2).
- **Ad load fail làm block flow** → AdManager skip + analytics `ad_shown=false`, không block UI.
- **Ads/Firebase chỉ chạy trong dev build** → tách AdManager/ObservabilityService theo interface + platform guard; core app chạy được trong Expo Go/web với no-op.

## Migration Plan

Greenfield — không migrate. Cần tạo Firebase project + đăng ký app Android/iOS, đặt google-services.json/GoogleService-Info.plist, push 9 Remote Config keys lên console trước release (checklist §10 plan).

## Open Questions

- Có cần UMP (consent SDK) ở bản MVP hay chỉ fallback non-personalized — phụ thuộc thị trường phát hành; không ảnh hưởng spec (fallback là bắt buộc, UMP là optional enhancement).
