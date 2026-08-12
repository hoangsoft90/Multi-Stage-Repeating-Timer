# Proposal: add-scheduled-routine — Reminder lịch trình + guardrails

## Vấn đề

User vẫn phải tự mở app để nhớ chạy routine — vòng lặp habit chưa đóng. Đã có "Routine hôm nay" (gợi ý passive) nhưng chưa có **lịch trình chủ động** (nhắc đúng giờ).

## Giải pháp

- **RoutineSchedule**: lịch lặp theo ngày-trong-tuần × giờ (vd 08:00 T2/T4/T6), lưu trong AsyncStorage (repo riêng). Mỗi schedule bật → schedule notification lặp (`UNCalendarNotificationTrigger` repeats:true — tốn 1 slot iOS cho cả chuỗi).
- **4 guardrail bắt buộc:**
  1. **Overwrite Guard** — reminder nổ/tap lúc đang có active session (kể cả `temp_quick_session` của Quick Routine) → dialog confirm "Hủy phiên hiện tại & Bắt đầu" / "Tiếp tục phiên hiện tại".
  2. **Snooze** — notification có [Start] [Snooze 5m] [Snooze 10m] [Dismiss], tối đa 3 lần rồi tự dismiss; lưu `snoozeCount`/`snoozeUntil`.
  3. **Missed không trừng phạt** — bỏ lỡ 1 reminder không phá streak (streak vẫn theo logic hiện tại: reset khi không mở app 2 ngày liên tiếp). Card "Missed today" cho phép Start now / Skip.
  4. **Ngân sách notification iOS** — `reminder_reserved_slots = 10` (Remote Config); `effective_max_stage_queue = 64 - reserved - activeSchedules` áp dụng khi nhỏ hơn 50 hiện tại.
- **UI**: Settings mới hoặc màn con trên Home — danh sách schedule (tên preset + giờ + days) + tạo/sửa/xóa. Home hiển thị card "Sắp tới / Missed".

## Non-goals

- Không làm reminder thông minh (học giờ từ lịch sử) — chỉ lặp cố định.
- Không backend — local-first hoàn toàn.
