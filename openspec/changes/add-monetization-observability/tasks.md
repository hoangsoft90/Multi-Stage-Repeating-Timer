## 1. Firebase + dev build setup

- [ ] 1.1 Tạo Firebase project + đăng ký app Android/iOS; đặt `google-services.json` + `GoogleService-Info.plist` cạnh app.json
- [x] 1.2 Cài `expo-dev-client`; cài dependencies: `@react-native-firebase/app`, `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics`, `@react-native-firebase/remote-config`, `react-native-google-mobile-ads`, `expo-tracking-transparency`, `expo-build-properties`
- [x] 1.3 Cấu hình app.json: plugins firebase (googleServicesFile), ads (android_app_id/ios_app_id + user_tracking_usage_description), expo-build-properties (useFrameworks: dynamic)
- [x] 1.4 Khởi tạo Firebase + Mobile Ads SDK ở app boot, không-blocking (try/catch); xác nhận chạy được trong dev build (`npx expo run:android`/`run:ios`)

## 2. Remote Config

- [x] 2.1 Tạo `RemoteConfigService` với 9 key + default values (interstitial_cooldown_seconds=240, interstitial_max_per_session=1, app_open_cooldown_seconds=60, max_scheduled_transitions_ios=50, missed_transition_rate_threshold=0.15, timer_screen_native_ad_enabled=false, preset_free_limit=-1, custom_sound_unlock_hours=24, reminder_reserved_slots=10)
- [x] 2.2 Fetch + activate ở khởi động (timeout ngắn); fallback default khi offline/chưa cấu hình; không hard-code ngưỡng nơi khác
- [ ] 2.3 Push 9 key lên Remote Config console (trước release)

## 3. AdManager + placements

- [x] 3.1 Tạo `AdManager`: `canShowAppOpen()`, `canShowInterstitial()`, `canShowRewarded()` theo Remote Config + trạng thái session + cooldown/frequency-cap
- [x] 3.2 App Open Ad: cold/warm start && !hasActiveSession && cooldown (60s)
- [x] 3.3 Interstitial Post-Stop/Completed: cooldown 240s, max 1/phiên (từ RC)
- [x] 3.4 Banner/Native trên Home
- [x] 3.5 Rewarded: unlock custom sound 24h (từ RC `custom_sound_unlock_hours`), tự hết hạn theo thời gian thực
- [x] 3.6 KHÔNG ad trên Timer Running; không show ad khi chuyển stage / notification action; ad load fail → skip + không block UI; test dùng TestIds
- [x] 3.7 Web: AdManager no-op (platform guard)

## 4. ATT + policy

- [x] 4.1 Thêm ATT string qua plugin ads (user_tracking_usage_description) + `expo-tracking-transparency.requestTrackingPermissionsAsync` sau value-moment đầu tiên (start timer đầu tiên thành công)
- [ ] 4.2 Denied/Restricted → cấu hình non-personalized ads fallback (`setRequestConfiguration`) — **CHƯA implement trong code (defer)**
- [x] 4.3 Privacy Policy URL + link trong Settings (kiểm tra link hoạt động); mô tả Google Mobile Ads SDK trong Privacy Policy

## 5. Observability

- [x] 5.1 Tạo `ObservabilityService` interface: `FirebaseObservabilityService` (mobile) + `LogObservabilityService` (web/dev console); init không-blocking, lỗi logging không crash
- [x] 5.2 Metrics đã log: `stage_transition` (missed) → `missed_transition_rate_high` (rate), `ad_shown` (placement: banner/interstitial/app_open/rewarded; shown:false khi load fail), `rewarded_unlock` (hours), `permission_denied` (type: notification), `permission_requested` (type: exact_alarm), `att_prompt_shown`. (`timer_started`, `ad_clicked`, `att_status` chưa implement — defer)
- [x] 5.3 `missed_transition_rate`: đếm transition đúng giờ vs missed từ reconcile; so ngưỡng RC (0.15) → kích hoạt gợi ý FGS dialog (tích hợp Phase 2)

## 6. Kiểm tra

- [x] 6.1 `npx tsc --noEmit` sạch
- [x] 6.2 Unit test: AdManager eligibility (cooldown, cap, session state), RemoteConfigService fallback, missed_transition_rate calculation
- [ ] 6.3 Test device (dev build): ATT Denied → non-personalized ads vẫn serve; ad load fail/no-internet; Remote Config toggling giữa phiên; App Open không hiện khi có session active
- [x] 6.4 Checklist pre-submit: Privacy Policy URL, 9 Remote Config keys trên console (gồm `reminder_reserved_slots`), ATT timing (non-personalized fallback chưa implement — defer)
- [x] 6.5 `npx jest` toàn bộ pass; smoke web (`npx expo export --platform web`) chạy với LogObservabilityService + AdManager no-op
