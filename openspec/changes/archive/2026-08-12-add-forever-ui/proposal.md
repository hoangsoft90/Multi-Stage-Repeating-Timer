# Proposal: add-forever-ui — Repeat Forever rõ ràng

## Vấn đề

Repeat mode `forever` (Work/Break 60/10 là template mặc định!) hiện hiển thị mơ hồ: CompletionDialog có thể hiện "Completed" không đúng ngữ nghĩa, notification có thể hiện `/ ∞`, Stats log "completed" cho session forever chỉ khi Stop thủ công — nhưng UI chưa phân biệt rõ.

## Giải pháp

- **Timer screen**: hiển thị `ROUND 37 / ∞` (thay `/ ∞` chung chung); next stage như cũ.
- **Notification**: `WORK · Round 37` — KHÔNG hiện `/ ∞`.
- **CompletionDialog**: với session forever, không hiện "Completed 🎉" tự động (forever không bao giờ completed tự nhiên) — chỉ khi Stop thủ công, hiện trạng thái "Timer đã dừng" (không phải celebration). Thực tế engine: `forever` không emit SessionCompleted — kiểm tra và đảm bảo CompletionDialog chỉ hiện cho completed thật.
- **Stats**: session forever chỉ log khi status = stopped (đã đúng — verify + test).

## Non-goals

- Không đổi engine behavior (forever đã đúng).
- Không thêm auto-stop cho forever.
