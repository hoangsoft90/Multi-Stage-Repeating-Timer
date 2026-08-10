## Context

Engine emit events (change 1); Settings + SessionRepo + Timer Running sẵn sàng (change 2); scheduler đánh thức app đúng lúc stage end (change 3). Phase 3 gắn tầng cảm nhận (audio/haptics/notification/wake lock) vào event engine và xây dialog phục hồi sau kill/reboot. Động lực xem `proposal.md`; behavior ở `specs/feedback`, `specs/session-recovery`.

## Goals / Non-Goals

**Goals:**
- Feedback đúng thời điểm, tôn trọng Settings, không bao giờ chặn timer.
- iOS audio vượt Silent Switch (`playsInSilentModeIOS`) — P0.
- Continue-dialog chính xác (reconcile trước khi render), không auto-resume, phân biệt "hoàn thành khi vắng mặt".

**Non-Goals:**
- Không làm notification actions (Pause/Skip/Stop từ notification) — P1.
- Không làm custom sound upload (tải vĩnh viễn) — P1; 3 sound built-in chỉ.
- Không làm ActivityKit/Live Activities — P1.
- Không làm warning 30s trước stage kết thúc — P1.

## Decisions

1. **FeedbackCoordinator subscribe trực tiếp engine events** (StageStarted/StageCompleted/SessionCompleted) và điều phối AudioService/HapticsService/NotificationService theo Settings. Lý do: một nơi duy nhất quyết định feedback, dễ test (unit test với event giả), UI không nhúng logic feedback.
2. **`expo-audio` cho sound** (kế thừa expo-av, mới hơn): phát asset sound ngắn; `setAudioModeAsync({ playsInSilentModeIOS: true })` để vượt Silent Switch. Lý do: expo-av đang bị deprecated dần, expo-audio là chuẩn mới của Expo. Alternative: `expo-av` (quen hơn nhưng cũ) — chọn expo-audio, fallback expo-av nếu gặp giới hạn.
3. **`expo-haptics` cho 2 pattern**: định nghĩa 2 pattern rung (vd pattern ngắn gấp cho WORK→REST, pattern dài cho REST→WORK / round complete) dưới dạng danh sách haptic call (impactAsync/notificationAsync) chạy tuần tự; map `vibrationPatternId` → pattern. Lý do: expo-haptics không hỗ trợ pattern dạng mảng kiểu Android Vibration.vibrate(pattern) — dùng chuỗi call. Alternative: `Vibration.vibrate(pattern)` RN core (hỗ trợ mảng pattern nhưng không có haptic engine) — chọn expo-haptics cho UX tốt hơn, ghi rõ trong tasks.
4. **`expo-notifications` (đã có ở Phase 2) cho notification**: định nghĩa content hiển thị khi OS fire theo lịch; channel Android (importance high) + permission check. Notification content chỉ là thông tin (stage mới / hoàn thành) — không action. **Web: no-op** (expo-notifications không hỗ trợ web).
5. **`expo-keep-awake`** theo toggle Settings + session active: `activateKeepAwake` khi session RUNNING && wakeLockEnabled; `deactivateKeepAwake` khi STOPPED/COMPLETED/PAUSED (giữ màn hình sáng chỉ khi đang đếm). Quyết định: khi PAUSED có giữ sáng? Không — user đang không cần đếm; đơn giản hóa (ghi rõ trong tasks).
6. **Continue-dialog: RecoveryController** — khi cold start có session active: `engine.reconcile(now)` → nếu COMPLETED → dialog "hoàn thành khi vắng mặt" (không Resume); ngược lại dialog "Timer was running" với Resume/Restart/Dismiss. Resume → store start từ trạng thái reconciled; Restart → new session; Dismiss → stop + về Home. Hiển thị qua root-level (trong layout app) để không lệ thuộc screen.
7. **Notification + feedback phối hợp với Phase 2**: notification được OS fire theo lịch scheduler (Phase 2) khi app ở nền; khi app foreground, FeedbackCoordinator phát audio/haptics trực tiếp (không cần notification). Không double-feedback: nếu app foreground, bỏ qua hiện notification trùng.

## Risks / Trade-offs

- **Double-feedback (notif + audio) khi app foreground** → FeedbackCoordinator check app lifecycle (`AppState`): foreground → audio/haptics local; nền → dựa notification OS.
- **iOS Silent Switch bị chặn audio nếu quên playsInSilentModeIOS** → set audio mode ngay khi khởi tạo, test device thật (test case plan §8: Silent/DND/Bluetooth/headset).
- **Wake lock gây tốn pin nếu quên tắt** → enable/disable theo lifecycle session (dừng/hoàn thành/pause → disable); test.
- **Continue-dialog hiển thị state lỗi thời** → luôn reconcile(now) trước khi render dialog (spec bắt buộc).
- **Âm thanh chậm/delay giữa transition** → preload 3 asset sound khi khởi tạo service.

## Migration Plan

Greenfield — không migrate dữ liệu. Native config (audio mode iOS, notification channel Android) cấu hình trước khi test device.

## Open Questions

- Chi tiết 2 vibration pattern (số lần impact, loại impact) — không ảnh hưởng spec (chỉ cần 2 pattern phân biệt), chốt lúc code.
