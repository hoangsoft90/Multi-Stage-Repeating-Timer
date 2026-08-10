## Why

Timer đã chạy được end-to-end (Phase 1) và biết cách nhờ OS đánh thức đúng lúc (Phase 2). Nhưng user chưa *cảm nhận được* chuyển stage: cần âm thanh, rung, thông báo khi stage kết thúc; giữ màn hình sáng khi chạy (wake lock); và nếu app bị kill/reboot giữa chừng, cần dialog "Continue where you left off?" để user nối tiếp đúng trạng thái — không auto-resume, không mất tiến trình. Phase 3 biến engine + scheduling thành trải nghiệm đáng tin cậy và con người.

## What Changes

- **Audio**: 3 sound built-in (on/off theo Settings), dùng **expo-audio** với `playsInSilentModeIOS: true` để vượt Silent Switch trên iOS (P0 độ tin cậy).
- **Vibration**: 2 pattern built-in (on/off theo Settings), dùng **expo-haptics** (pattern qua nhiều `impactAsync`/`notificationAsync` call), trigger tại StageCompleted/StageStarted.
- **Local notification**: thông báo khi chuyển stage (tên stage kế) và khi session hoàn thành (dùng expo-notifications — Phase 2 đã lên lịch; Phase 3 định nghĩa content); tuân theo toggle Sound/Vibration/Notification.
- **Wake Lock**: **expo-keep-awake** giữ màn hình sáng khi session active (bật/tắt theo Settings, chỉ khi có session chạy).
- **Continue dialog** sau kill/reboot: hiện "Timer was running — Stage WORK · 24:58 left" với 3 lựa chọn [▶ Resume] [↻ Restart] [✕ Dismiss]; nếu `completedAt` cho thấy sequence đã trôi hết → "Routine đã hoàn thành trong lúc bạn vắng mặt". **Không auto-resume.**
- Gắn các trigger feedback vào đúng event engine (StageStarted → audio/vibrate/notif stage mới; SessionCompleted → notif hoàn thành).
- **Web**: audio/haptics/keep-awake có hỗ trợ web (hoặc no-op an toàn); notification dùng no-op vì expo-notifications không hỗ trợ web — platform guard.

**Không đổi behavior hiện có**: engine/UI/scheduling phase trước giữ nguyên; phase này chỉ thêm tầng cảm nhận + phục hồi.

## Capabilities

### New Capabilities

- `feedback`: âm thanh (3 sound, vượt Silent Switch iOS), rung (2 pattern), local notification chuyển stage + hoàn thành, wake lock — trigger từ event engine, tôn trọng Settings.
- `session-recovery`: dialog "Continue where you left off?" sau kill/reboot (Resume/Restart/Dismiss, không auto-resume), phân biệt session hoàn thành khi vắng mặt qua completedAt, phục hồi đúng trạng thái qua reconcile.

### Modified Capabilities

<!-- Không có — greenfield. -->

## Impact

- **Code mới**: `src/features/feedback/` — `AudioService`, `HapticsService`, `NotificationContent`, `WakeLockService`, `FeedbackCoordinator` (subscribe engine events); `src/features/recovery/` — continue-dialog + logic phục hồi.
- **Dependencies mới**: `expo-audio` (hoặc `expo-av` nếu cần), `expo-haptics`, `expo-notifications` (đã có ở Phase 2), `expo-keep-awake`.
- **Native config**: iOS audio session (expo-audio playsInSilentModeIOS), Android notification channel (Phase 2).
- **Phụ thuộc**: change `add-timer-engine` (events), `add-ui-and-storage` (Settings, SessionRepo, Timer Running), `add-background-scheduling` (scheduler + notification scheduling).
- **Rủi ro**: LOW–MED (plan §9 Phase 3) — chủ yếu cần test thiết bị thật: Silent/DND/Bluetooth/headset/battery saver.
