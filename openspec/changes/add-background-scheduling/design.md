## Context

Engine (change 1) cung cấp `stageEndsAt` qua event `StageStarted`; storage (change 2) cung cấp SessionRepo để đọc session active sau kill/reboot. Phase 2 nối hai thứ đó với OS scheduling qua **expo-notifications**. Động lực và giới hạn xem `proposal.md`; yêu cầu behavior ở `specs/background-scheduling` và `specs/permissions`.

## Goals / Non-Goals

**Goals:**
- Android: timer continue qua kill & reboot (expo-notifications tự khôi phục sau reboot), degrade graceful khi thiếu quyền, FGS opt-in chỉ khi cần.
- iOS: schedule transition kế tiếp (runtime 1 notification/lần) + reschedule đúng + background task best-effort (defer) + công khai giới hạn cho user.
- Một interface `PlatformScheduler` duy nhất — engine/store không biết nền tảng; web dùng no-op.
- Notification ID deterministic để cancel chính xác.

**Non-Goals:**
- Không render notification content/audio/haptics — Phase 3 (phase này chỉ schedule/đánh thức).
- Không làm notification actions (Pause/Skip/Stop từ notification) — P1.
- Không làm ActivityKit/Live Activities — P1 (giải pháp triệt để cho iOS window).
- Không ép user bật FGS — chỉ gợi ý theo ngưỡng.

## Decisions

1. **`expo-notifications` cho cả 2 nền tảng** (thay flutter_local_notifications + native receiver). Lý do: một thư viện quản lý permission POST_NOTIFICATIONS, scheduling (date trigger), query/cancel theo identifier, và **tự khai RECEIVE_BOOT_COMPLETED + tự phục hồi scheduled notifications sau reboot** — tiết kiệm toàn bộ phần native BroadcastReceiver mà bản Flutter phải tự viết. Cấu hình qua config plugin trong app.json. Alternative: `@notifee/react-native` (mạnh hơn về FGS nhưng thêm config phức tạp) — dùng cho FGS, không cho scheduling cơ bản.
2. **Exact alarm**: `SCHEDULE_EXACT_ALARM` khai trong `app.json` → `android.permissions`. Runtime: `expo-notifications` chưa wrap sẵn `canScheduleExactAlarms()` → dùng native module nhỏ hoặc `expo-intent-launcher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM')` để mở màn cấp quyền. Degrade: khi không có quyền dùng inexact trigger + cảnh báo Settings. (Android 14+ deny mặc định — phải có degrade, không được giả định có quyền.)
3. **`PlatformScheduler` interface** (`scheduleAt(endsAt, id)`, `cancelAll()`, `cancelByIds(ids)`, `hasExactAlarmPermission`): `AndroidScheduler` + `IosScheduler` (cùng expo-notifications nhưng khác cấu hình), `WebScheduler` no-op vì **expo-notifications không hỗ trợ web** (guard `Platform.OS === 'web'`). Lý do: engine/store giữ pure, platform logic tách biệt, test bằng mock.
4. **iOS — schedule từng transition (runtime KHÔNG queue 50)**: `cancelAllScheduledNotificationsAsync` → reconcile → schedule **1 notification cho transition kế tiếp** tại `stageEndsAt` (ID deterministic `"{sessionId}_{round}_{stageIndex}"`; cancel theo ID khi Pause/Skip/Stop). Số 50 (`max_scheduled_transitions_ios`) + budget-split (64 − reserved − active) **CHỈ dùng cho coverage-warning Editor** (`coverage.ts` — comment tường minh trong timer-store). Khi notification đã fire mà app chưa mở lại → im lặng tới lần mở tiếp (reconcile đúng + reschedule); **Live Activity (v1.4) là kênh realtime thay thế trên iOS 16.1+**.
5. **Background task iOS — CHƯA IMPLEMENT (defer)**: `expo-background-fetch` + `expo-task-manager` **chưa cài/đăng ký** (UIBackgroundModes fetch khai trong app.json nhưng không có task-manager handler). Ghi là work còn lại (tasks 4.3); không ảnh hưởng state engine (reconcile khi mở lại vẫn đúng). Android dựa vào scheduled notification (không cần task riêng cho MVP).
6. **FGS opt-in — JS layer đã làm, native defer**: khi `missed_transition_rate > 0.15` hiện dialog opt-in (fgs-trigger.ts pub/sub + fgs-dialog.tsx; dismiss persist qua `settings.fgsDialogDismissed`). Native foreground service (`@notifee/react-native`, `foregroundServiceType=specialUse` + justification, persistent notification bắt buộc) **CHƯA implement** — chờ EAS build phase (tasks 3.4). Không bật mặc định.
7. **Permission flow**: `expo-notifications.requestPermissionsAsync()` cho POST_NOTIFICATIONS (xin tại lần start timer đầu tiên — `requestNotificationPermissionOnFirstTimer`, cờ `notif-asked`); SCHEDULE_EXACT_ALARM just-in-time lúc Start (`requestExactAlarmPermissionJustInTime` — settings intent qua `expo-intent-launcher`); RECEIVE_BOOT_COMPLETED khai trong app.json `android.permissions` (không dialog). Settings hiển thị trạng thái + nút mở cài đặt hệ thống (`expo-intent-launcher`/`Linking.openSettings`).
8. **Reschedule luôn đi qua reconcile**: helper `wakeUpAndReschedule()` = `engine.reconcile(now)` → `scheduler.scheduleAt(engine.currentStageEndsAt)`, dùng chung cho notification fire / background task / cold-start / resume — tránh schedule trên state lỗi thời.
9. **CoverageCalculator** (pure TS, `src/features/background/coverage.ts`): `estimatedCoverageMs` (sum duration N transition kế tiếp) + `exceedsNotificationWindow` (stageCount × rounds > maxTransitions); Editor iOS gọi `exceedsNotificationWindow(draft, effectiveMaxStageQueue(reminder_reserved_slots, activeSchedules, max_scheduled_transitions_ios))` để hiện warning. Test bằng Jest.

## Risks / Trade-offs

- **Alarm/notification bị OS xóa khi reboot** → expo-notifications tự phục hồi sau reboot; vẫn test thật trên device (test case plan §8).
- **iOS chỉ schedule transition kế tiếp** → không nhận thông báo tiếp nếu app không được mở lại để reschedule → Công khai trong Core promise + warning Editor + background task best-effort; Live Activity (v1.4) lên P1. Không hứa hẹn quá mức.
- **SCHEDULE_EXACT_ALARM bị deny (Android 14+ mặc định deny)** → degrade inexact + thông báo Settings; không crash (tránh SecurityException bằng check trước khi schedule exact).
- **FGS bị Play Console reject** → (khi implement native) `specialUse` + justification mạnh ngay Day 1; chỉ bật khi user đồng ý; `@notifee` yêu cầu dev build.
- **expo-notifications không chạy trên web** → WebScheduler no-op + platform guard; web test chỉ kiểm tra engine/UI.
- **expo-notifications tự phục hồi sau reboot nhưng không reschedule "đúng giờ mới"** → khi app mở lại sau reboot phải reconcile trước khi hiển thị/đếm ngược (đã có ở recovery Phase 3).

## Migration Plan

Greenfield — không migrate. Cấu hình app.json (config plugin notifications, permission SCHEDULE_EXACT_ALARM, background modes iOS) trước khi test device.

## Open Questions

- Chi tiết native cho `canScheduleExactAlarms()`: native module tí hon (Expo Module API) vs chỉ dùng intent-launcher + giả định. Không ảnh hưởng spec — chọn lúc code.
