# Proposal: add-notification-cold-start — Cold-start actions + FGS dialog

## Vấn đề

1. **Cold-start notification actions chưa hoạt động** — tap Pause/Skip/Stop từ notification khi app process bị kill hiện chỉ hoạt động khi app đang chạy nền (`_layout.tsx` đăng ký listener sau khi ready). Đây là technical debt P0: phá trực tiếp USP "reliability", và Scheduled Routine (v1.3) sẽ dùng chung cơ chế notification-response nên phải fix trước.
2. **FGS "Keep timer alive" có threshold Remote Config nhưng chưa có UI** — `missed_transition_rate_threshold=0.15` đã tồn tại nhưng chưa từng hiển thị dialog opt-in cho user bị OEM kill.

## Giải pháp

- **Cold-start actions**: dùng `getLastNotificationResponseAsync()` của expo-notifications — khi app mở lên từ notification tap, lấy response còn tồn đọng, hydrate store (nếu chưa), `reconcile(now)`, apply action, điều hướng đúng màn (timer nếu active, Home nếu không).
- **FGS dialog**: khi `missed_transition_rate` vượt ngưỡng (đo từ `observability`), hiện dialog opt-in 1 lần (không spam): giải thích "điện thoại có thể tắt timer khi app chạy nền" + nút mở Settings (và ghi chú cần dev build có FGS). Lưu cờ `fgsDialogDismissed` để không hiện lại.

## Non-goals

- Không implement native FGS config plugin (cần EAS build — ghi rõ trong tasks).
- Không thay đổi luồng permission hiện có.
