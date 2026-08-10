## 1. Model + repo

- [x] 1.1 `RoutineSchedule` type + `RoutineScheduleRepo` (AsyncStorage `looptimer:routine-schedules`, safe parse, schemaVersion)
- [x] 1.2 Pure helper `nextTriggerAt(schedule, now)`: lần trigger kế tiếp (xét daysOfWeek + hour/minute); `isMissed(schedule, now)`

## 2. Store

- [x] 2.1 `useRoutineStore` (Zustand): `schedules`, `load/save/remove/toggle`, `rescheduleAll`
- [x] 2.2 `scheduleReminder(schedule)`: schedule lần kế tiếp qua Scheduler (scheduleAt hoặc scheduleRecurring nếu có)
- [x] 2.3 Snooze: `snooze(scheduleId, minutes)` — bump snoozeCount, re-schedule, tự dismiss khi >3
- [x] 2.4 `markHandled(scheduleId, date)` — set lastTriggeredDate (Skip/missed)

## 3. Budget iOS

- [x] 3.1 Remote Config: key `reminder_reserved_slots` (default 10) vào DEFAULT_CONFIG native + web
- [x] 3.2 `effectiveMaxStageQueue()` helper (64 - reserved - activeCount) trong routine module
- [x] 3.3 timer-store `reschedule()` + Editor `exceedsNotificationWindow` dùng trần hiệu dụng

## 4. Notification actions

- [x] 4.1 Category `reminder_actions`: Start/Snooze5/Snooze10/Dismiss — register trong _layout
- [x] 4.2 Handle Start → `startWithOverwriteGuard(preset)`; Snooze → `snooze()`; Dismiss → `markHandled`
- [x] 4.3 Cold-start handler nhận diện reminder_actions (phối hợp add-notification-cold-start)

## 5. UI

- [x] 5.1 `src/app/routine.tsx`: danh sách + form tạo/sửa (preset picker, days, hour:minute, before-minutes)
- [x] 5.2 Home: card "Sắp tới" (next trigger) + card "Missed today" (Start now/Skip)
- [x] 5.3 Settings: route tới Routine manager
- [x] 5.4 Overwrite Guard dialog dùng chung (`startWithOverwriteGuard`)

## 6. i18n

- [x] 6.1 Keys `routine.*` (~20): 12 ngôn ngữ

## 7. Kiểm tra

- [x] 7.1 Unit test: nextTriggerAt/isMissed (days, midnight, next week), snooze bound, budget calc
- [x] 7.2 Test store: save/toggle/snooze persist
- [x] 7.3 `npx tsc --noEmit` sạch
- [x] 7.4 `npx jest` xanh
