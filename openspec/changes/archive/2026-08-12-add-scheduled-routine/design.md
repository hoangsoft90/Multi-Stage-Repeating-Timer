# Design: add-scheduled-routine

## Context

App đã có: Scheduler platform (`scheduleAt(endsAt, id, title, body)` — notification theo date), deep-link `?start=<presetId>` (Home mount xử lý quick start), SessionLogRepo + stats (streak). iOS giới hạn 50 notification stage-transition (Remote Config `max_scheduled_transitions_ios`). `add-notification-cold-start` (change song song) cung cấp `handleNotificationResponse` — Scheduled Routine dùng chung cơ chế này.

## Decisions

1. **`RoutineSchedule` model + `RoutineScheduleRepo`** (`src/features/routine/routine-schedule.ts`): 
   ```ts
   interface RoutineSchedule { id, presetId, enabled, daysOfWeek: number[] /*1=Mon..7=Sun*/, hour, minute,
     notificationMinutesBefore: number[], lastTriggeredDate?, snoozeCount?, snoozeUntil?, schemaVersion }
   ```
   Lưu AsyncStorage key `looptimer:routine-schedules`. Additive repo — đọc an toàn dữ liệu cũ/corrupt.

2. **Store `useRoutineStore`** (Zustand): `schedules`, `load/save/remove/toggle`, `nextTrigger`. Mọi thay đổi schedule → `rescheduleAll()` → gọi Scheduler:
   - `scheduleAt` (DATE trigger) cho lần trigger kế tiếp (trong 24h) **hoặc** dùng cơ chế repeats (nếu platform hỗ trợ calendar trigger). Với `UNCalendarNotificationTrigger repeats:true` (iOS) / AlarmManager setRepeating (Android) → 1 slot/chuỗi. Vì platform hiện chỉ có `scheduleAt`, triển khai: schedule lần kế tiếp + `lastTriggeredDate` chống trigger lại; khi app mở/reschedule, tính lần kế tiếp. (Giới hạn: nếu app không mở lúc reminder, notification vẫn nổ vì đã schedule tuyệt đối — đủ cho use case chính.)
   - **Budget iOS**: `effectiveMax = 64 - reminderReservedSlots - activeScheduleCount`; dùng cho stage queue khi `effectiveMax < max_scheduled_transitions_ios`. Truyền qua `reschedule()` của timer-store (đọc từ Remote Config `reminder_reserved_slots`, default 10).

3. **Notification cho reminder**: dùng category mới `reminder_actions` với action [Start] [Snooze 5m] [Snooze 10m] [Dismiss]. Tap Start → `handleNotificationResponse` tương tự nhưng chạy `startPreset` cho preset của schedule (có Overwrite Guard). Snooze → re-schedule +5/+10 phút (bounded 3 lần).

4. **Overwrite Guard**: helper `startWithOverwriteGuard(preset)` dùng chung (Home/Quick Routine/Reminder/Deep-link): nếu `timerStatus` là running/paused → dialog confirm → Hủy & Start / Tiếp tục. Áp dụng cho mọi preset id kể cả `temp_quick_session`.

5. **Missed card**: Home tính từ `RoutineSchedule` — nếu hôm nay là ngày schedule, giờ đã qua, `lastTriggeredDate != hôm nay` → card "Missed — Start now / Skip". Skip → set `lastTriggeredDate` hôm nay (không phá streak; streak chỉ reset khi không có session 2 ngày liên tiếp — logic hiện tại giữ nguyên).

6. **UI quản lý**: `src/app/routine.tsx` — danh sách schedule (mỗi dòng: tên preset, giờ, days chips, toggle, edit/delete) + form tạo/sửa (chọn preset, giờ:minute, daysOfWeek, notificationMinutesBefore). Route `/routine` từ Settings và Home card.

7. **i18n**: keys `routine.*` — 12 ngôn ngữ, key-parity ép kiểu build.

## Risks / Trade-offs

- **Platform repeats**: `scheduleAt` hiện chỉ DATE trigger — để "1 slot/chuỗi" cần thêm cơ chế repeating vào Scheduler (native `UNCalendarNotificationTrigger.repeats` / Android setRepeating). Fallback: schedule từng lần kế tiếp (nhiều slot hơn nhưng đơn giản, đúng với budget trừ). Chọn: thêm `scheduleRecurring` optional vào Scheduler; nếu không hỗ trợ → fallback `scheduleAt` + `lastTriggeredDate`.
- **App không mở lúc reminder** → notification vẫn nổ (đã schedule tuyệt đối); Start từ notification → cold-start handler.
- **Snooze khi app bị kill** → snooze action qua notification response (cần cold-start change) — tách đúng thứ tự.
- **Budget split** áp dụng ngay cả khi chưa có reminder (default reserved=10 → stage queue tối đa 54) — chấp nhận để an toàn.
