## 1. Audio

- [x] 1.1 Cài `expo-audio` (hoặc `expo-av` nếu cần); bundle 3 asset sound built-in vào assets
- [x] 1.2 Tạo `AudioService`: preload 3 sound, phát theo soundId, xử lý lỗi không crash
- [x] 1.3 iOS: `setAudioModeAsync({ playsInSilentModeIOS: true })` — test Silent Switch
- [x] 1.4 Tôn trọng toggle Sound trong Settings

## 2. Vibration

- [x] 2.1 Cài `expo-haptics`; định nghĩa 2 pattern rung built-in (chuỗi haptic call: impactAsync/notificationAsync)
- [x] 2.2 Tạo `HapticsService`: thực hiện pattern theo vibrationPatternId
- [x] 2.3 Tôn trọng toggle Vibration trong Settings

## 3. Notification

- [x] 3.1 Dùng `expo-notifications` (đã có Phase 2): định nghĩa content hiển thị stage mới / hoàn thành
- [x] 3.2 Tạo Android notification channel (importance high) + cấu hình hiển thị đúng khi app nền/kill
- [x] 3.3 FeedbackCoordinator: khi app foreground → audio/haptics local (không double-feedback với notification OS); web → notification no-op

## 4. Wake lock

- [x] 4.1 Cài `expo-keep-awake`; tạo `WakeLockService` (activateKeepAwake/deactivateKeepAwake)
- [x] 4.2 Enable khi session RUNNING && wakeLockEnabled; disable khi STOPPED/COMPLETED/PAUSED

## 5. FeedbackCoordinator

- [x] 5.1 Subscribe engine events: StageStarted/StageCompleted → audio + haptics (theo settings); SessionCompleted → notification hoàn thành
- [x] 5.2 Xử lý lỗi feedback (file hỏng...) → log, không crash timer
- [x] 5.3 Unit test coordinator với event giả (tắt/bật từng feedback type)

## 6. Continue-dialog (session recovery)

- [x] 6.1 Tạo `RecoveryController`: khi cold start có session active → engine.reconcile(now) → xác định COMPLETED hay RUNNING
- [x] 6.2 Dialog "Timer was running — Stage · time left" với [Resume] [Restart] [Dismiss]; không auto-resume
- [x] 6.3 Trường hợp COMPLETED → "Routine đã hoàn thành trong lúc bạn vắng mặt", không nút Resume
- [x] 6.4 Resume → tiếp tục từ trạng thái reconciled; Restart → session mới; Dismiss → stop + về Home
- [x] 6.5 Session corrupt (AsyncStorage) → thông báo "Timer stopped after reboot" 1 lần, không crash

## 7. Kiểm tra

- [x] 7.1 `npx tsc --noEmit` sạch
- [x] 7.2 Unit test: FeedbackCoordinator, RecoveryController (reconcile trước render, completed-vs-running, resume/restart/dismiss)
- [ ] 7.3 Test device: Silent/DND/Bluetooth/headset/battery saver; kill app → continue dialog đúng; reboot → continue dialog đúng
- [x] 7.4 Smoke web: audio/haptics/keep-awake hoạt động hoặc no-op an toàn; `npx expo export --platform web` pass
