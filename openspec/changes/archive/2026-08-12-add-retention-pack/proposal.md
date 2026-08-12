# Proposal: add-retention-pack — Voice coaching + Routine hôm nay + Màn hoàn thành & chia sẻ

## Vấn đề

App đã có đủ core loop (create → start → reliable auto-transition) nhưng chưa có cơ chế **kéo user quay lại hàng ngày** ngoài streak tĩnh trong Stats. Nghiên cứu đối thủ (Seconds Pro, Interval Timer, Forest, Streaks) cho thấy 3 driver retention mạnh nhất mà LoopTimer còn thiếu:

1. **Hands-free guidance** — voice coaching (đọc tên stage + đếm ngược 10s/30s) giúp user không cần nhìn màn hình; đây là tính năng chấm điểm cao nhất của Seconds Pro.
2. **Giảm quyết định** — gợi ý "Routine hôm nay" theo giờ trong ngày từ lịch sử local (thói quen cố định).
3. **Moment tích cực + lan truyền** — màn chúc mừng sau khi hoàn thành với nút chia sẻ kết quả (streak/tổng thời gian).

## Giải pháp

- **Voice coaching**: platform service `SpeechService` (expo-speech native / Web Speech API web), đọc tên stage khi bắt đầu + cảnh báo 30s/10s + thông báo hoàn thành, theo locale hiện tại, tôn trọng toggle mới trong Settings.
- **Routine hôm nay**: helper thuần `suggestPresetForNow(entries, presetIds, now)` — histogram giờ-trong-ngày × preset trong 7 ngày gần nhất → gợi ý preset hay dùng nhất vào khung giờ hiện tại; hiện card nổi trên Home.
- **Màn hoàn thành + chia sẻ**: khi session completed, timer-store ghi thông tin completion (presetName, duration, streak) → `CompletionDialog` (root-level như RecoveryDialog) hiện chúc mừng + nút Share (ShareService: Share.share native / navigator.share web fallback clipboard).

## Non-goals

- Không làm widget/Live Activities (change riêng `add-home-widget`).
- Không làm onboarding (change riêng `add-onboarding`).
- Không làm import/export preset (change riêng `add-preset-sharing`).
- Không thêm backend — 100% local-first.
