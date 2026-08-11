## 1. PlatformScheduler abstraction

- [x] 1.1 Định nghĩa interface `PlatformScheduler` (scheduleAt, cancelAll, cancelByIds, hasExactAlarmPermission, requestExactAlarmPermission)
- [x] 1.2 Tạo `CoverageCalculator` (pure TS, `src/features/background/coverage.ts`): `estimatedCoverageMs` (sum duration N transition) + `exceedsNotificationWindow` (stageCount × rounds > N) — Editor iOS dùng với `effectiveMaxStageQueue` (budget-split)
- [x] 1.3 Unit test CoverageCalculator (forever dài, once ngắn, fixedCount trung bình)

## 2. expo-notifications setup

- [x] 2.1 Cài `expo-notifications` + `expo-intent-launcher`; cấu hình config plugin (expo-notifications + UIBackgroundModes fetch) trong app.json — `expo-background-fetch`/`expo-task-manager` **KHÔNG được cài** (background task iOS chưa implement, xem 4.3)
- [x] 2.2 app.json: `android.permissions: ["android.permission.SCHEDULE_EXACT_ALARM"]`, iOS background modes (fetch)
- [ ] 2.3 Android notification channel (importance high) + handler khi notification fire (foreground/background)

## 3. Android scheduler

- [x] 3.1 Implement `AndroidScheduler`: scheduleAt bằng date trigger (exact khi có quyền; degrade inexact + cảnh báo Settings khi không)
- [ ] 3.2 Verify khôi phục sau reboot: expo-notifications tự xử lý RECEIVE_BOOT_COMPLETED — kiểm tra scheduled notifications còn sau reboot
- [x] 3.3 Xử lý graceful khi session corrupt sau reboot ("Timer stopped after reboot", không crash)
- [ ] 3.4 Implement FGS opt-in với `@notifee/react-native` (dev build): chỉ gợi ý khi missed_transition_rate > ngưỡng RC; dialog nói rõ persistent notification bắt buộc; foregroundServiceType=specialUse + justification

## 4. iOS scheduler

- [x] 4.1 Implement `IosScheduler`: cancelAllScheduledNotificationsAsync → reconcile → schedule notification cho **transition kế tiếp** tại stageEndsAt (runtime KHÔNG pre-schedule queue 50 — 1 transition/lần, ID deterministic `"{session.id}_{round}_{stageIndex}"`; mỗi start/resume/cold-start cancelAll + reschedule). Số 50 (`max_scheduled_transitions_ios`) + budget-split chỉ dùng cho coverage-warning Editor (`src/features/background/coverage.ts`)
- [x] 4.2 Notification ID deterministic `"{session.id}_{round}_{stageIndex}"`; cancel đúng theo ID khi Pause/Skip/Stop/reschedule (query qua getAllScheduledNotificationsAsync)
- [ ] 4.3 Đăng ký background task (expo-background-fetch + task-manager): reconcile + reschedule nếu còn stage (best-effort)

## 5. Web no-op + permission flow

- [x] 5.1 Implement `WebScheduler` no-op + platform guard (`Platform.OS === 'web'`) — expo-notifications không hỗ trợ web
- [x] 5.2 POST_NOTIFICATIONS: xin khi user tạo timer đầu tiên (requestPermissionsAsync kèm giải thích); app vẫn chạy đủ khi từ chối; Settings cho bật lại
- [x] 5.3 SCHEDULE_EXACT_ALARM: xin just-in-time lúc Start (expo-intent-launcher tới màn Alarms & reminders); deny → degrade + cảnh báo Settings
- [x] 5.4 Settings hiển thị trạng thái permission + nút mở cài đặt hệ thống

## 6. Tích hợp wake-up flow

- [x] 6.1 Helper `wakeUpAndReschedule()`: reconcile(now) → scheduleAt(currentStageEndsAt), dùng chung cho notification fire / background task / cold-start / resume
- [x] 6.2 Hook vào timer store: mỗi StageStarted → scheduler.scheduleAt(endsAt); Stop/Pause → cancel
- [x] 6.3 Editor iOS: hiện coverage-warning khi estimatedCoverage < khoảng thời gian dự kiến (chỉ iOS, không Android/web)

## 7. Kiểm tra

- [x] 7.1 `npx tsc --noEmit` sạch
- [x] 7.2 Unit test: AndroidScheduler/IosScheduler với mock, CoverageCalculator, notification ID deterministic, reschedule sau reconcile
- [ ] 7.3 Test device Android: kill app → notification vẫn fire; **reboot thật → scheduled notifications còn (expo-notifications tự phục hồi) + reconcile đúng khi mở lại**; SCHEDULE_EXACT_ALARM denied → degrade; POST_NOTIFICATIONS denied → timer vẫn chạy
- [ ] 7.4 Test device iOS: chạy full 50-notification queue; khóa máy > 60 phút → xác nhận im lặng đúng spec; mở lại → reconcile đúng stage
- [x] 7.5 `npx jest` toàn bộ pass; smoke web: scheduler là no-op, timer vẫn chạy đúng
