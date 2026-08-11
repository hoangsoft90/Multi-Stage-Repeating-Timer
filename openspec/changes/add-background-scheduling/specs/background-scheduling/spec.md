## Purpose

Capability `background-scheduling` định nghĩa cách app nhờ OS đánh thức đúng lúc stage kết thúc khi app ở nền/kill: Android Exact Alarm + khôi phục sau reboot + FGS opt-in; iOS schedule transition kế tiếp (runtime 1 notification/lần, trần 50 dành cho coverage-warning Editor) + BGAppRefreshTask deferred; cùng quy tắc notification ID và cancel/reschedule. Mục tiêu là state luôn đúng khi user quay lại và thông báo transition đáng tin cậy trong giới hạn nền tảng đã công khai.

## ADDED Requirements

### Requirement: Android — Exact Alarm tại stageEndsAt (primary)
Hệ thống SHALL lên lịch Exact Alarm tại `stageEndsAt` của stage hiện tại ngay khi nhận `StageStarted`. Khi alarm fire, app SHALL thức dậy ngắn, gọi `engine.reconcile(now)`, phát transition (notification/audio/vibration theo Phase 3) và schedule alarm cho stage kế. Nếu `SCHEDULE_EXACT_ALARM` bị từ chối, hệ thống SHALL degrade xuống `setAndAllowWhileIdle` (POSSIBLY_EXACT) và hiển thị trong Settings thông báo "Độ chính xác nền có thể giảm".

#### Scenario: Schedule alarm khi stage bắt đầu
- **WHEN** engine emit StageStarted(stage WORK, endsAt = T+60s) và app đang foreground
- **THEN** hệ thống đăng ký Exact Alarm tại T+60s

#### Scenario: Alarm fire khi app ở nền
- **WHEN** alarm tại stageEndsAt fire và app đang ở nền
- **THEN** app reconcile, chuyển sang stage kế, phát transition và schedule alarm kế tiếp

#### Scenario: Exact alarm bị từ chối
- **WHEN** user không cấp SCHEDULE_EXACT_ALARM
- **THEN** hệ thống dùng setAndAllowWhileIdle (không chính xác tuyệt đối) và Settings hiển thị cảnh báo độ chính xác nền giảm

### Requirement: Android — BootCompletedReceiver khôi phục alarm sau reboot
Hệ thống SHALL đảm bảo các notification/alarm đã lên lịch được khôi phục sau khi thiết bị reboot (thông qua cơ chế `RECEIVE_BOOT_COMPLETED`/`ACTION_BOOT_COMPLETED` của Android — thư viện notification phải tự khai và xử lý, không cần dev viết receiver riêng). Khi app mở lại sau reboot: đọc session active từ SessionRepo, nếu status = RUNNING thì `engine.reconcile(now)` rồi reschedule notification/alarm tại stageEndsAt mới. Alarm/notification bị OS xóa sạch mỗi lần reboot — cơ chế này là yêu cầu bắt buộc để "Device reboot policy = continue" hoạt động thật.

#### Scenario: Reboot khi session đang chạy
- **WHEN** thiết bị reboot trong lúc session RUNNING (stage còn 30 phút)
- **THEN** sau khi khởi động, BootCompletedReceiver khôi phục session, reconcile, và alarm được đăng ký lại tại stageEndsAt (timer vẫn continue)

#### Scenario: Reboot khi không có session
- **WHEN** thiết bị reboot mà không có session active (IDLE/COMPLETED)
- **THEN** receiver không làm gì, không crash

#### Scenario: Session storage corrupt sau reboot
- **WHEN** sau reboot session đọc từ storage bị corrupt/không phục hồi được
- **THEN** app xử lý graceful "Timer stopped after reboot" — không crash, không alarm treo

### Requirement: Android — FGS opt-in (JS dialog đã làm; native foreground service CHƯA IMPLEMENT — defer)
Hệ thống SHALL chỉ đề xuất bật "Keep timer alive" khi `missed_transition_rate` đo được trên thiết bị vượt ngưỡng (> 15%, theo Remote Config) — **phần này đã implement**: dialog opt-in (`fgs-trigger.ts` pub/sub + `fgs-dialog.tsx`, dismiss persist qua `settings.fgsDialogDismissed`, nút hiện chỉ điều hướng "Mở Settings"). Việc chạy foreground service thật với `foregroundServiceType=specialUse`, **persistent notification bắt buộc không thể ẩn** + justification string **chưa implement** — chờ EAS build phase (tasks 3.4).

#### Scenario: Chỉ đề xuất FGS khi vượt ngưỡng
- **WHEN** missed_transition_rate trên thiết bị = 20% (> 15%)
- **THEN** hệ thống hiện dialog gợi ý "Keep timer alive"; khi rate ≤ 15% thì không hiện

#### Scenario: Bật FGS hiện persistent notification (chờ implement native)
- **WHEN** (sau khi implement native) user bật Keep timer alive và timer chạy
- **THEN** thanh trạng thái hiện notification persistent của timer mà user không thể ẩn cho tới khi dừng timer

### Requirement: iOS — schedule transition kế tiếp (runtime không queue 50)
Trên iOS, hệ thống SHALL lên lịch local notification cho transition KẾ TIẾP tại `stageEndsAt` với ID deterministic `"{session.id}_{round}_{stageIndex}"`. Khi start/resume/cold-start, hệ thống SHALL `cancelAllPending` rồi reconcile và schedule lại từ trạng thái hiện tại. Runtime KHÔNG pre-schedule hàng đợi 50 notification — trần `max_scheduled_transitions_ios` (50) và budget-split (`effectiveMax = 64 − reminder_reserved_slots − activeScheduleCount`) chỉ được dùng cho coverage-warning Editor (`exceedsNotificationWindow`). Hệ thống SHALL không đảm bảo notification liên tục khi app bị treo/kill: chỉ transition kế tiếp được schedule, muốn tiếp tục nhận thông báo phải mở lại app để reschedule — known limitation công khai; Live Activity (v1.4, iOS 16.1+) là kênh hiển thị realtime thay thế.

#### Scenario: Start session dài
- **WHEN** user start preset HIIT 40/20 (repeat forever) và app ở nền
- **THEN** hệ thống schedule notification cho transition kế tiếp tại stageEndsAt của stage hiện tại

#### Scenario: Notification đã fire, app chưa mở lại
- **WHEN** notification kế tiếp đã fire và user chưa mở lại app
- **THEN** không có notification nào thêm được lên lịch (runtime chỉ schedule 1 transition/lần); khi user mở lại app, reconcile trả về đúng stage hiện tại và reschedule transition kế tiếp

#### Scenario: Resume sau pause
- **WHEN** user resume session đang PAUSED
- **THEN** hệ thống cancelAllPending rồi schedule lại notification cho transition kế tiếp từ trạng thái hiện tại

### Requirement: iOS — BGAppRefreshTask best-effort (CHƯA IMPLEMENT — defer)
Hệ thống ĐÃ THIẾT KẾ đăng ký `BGAppRefreshTask` để iOS *có thể* (không đảm bảo) đánh thức app ngắn hạn nhằm reschedule thêm notification — **nhưng chưa implement trong code hiện tại** (`expo-background-fetch`/`expo-task-manager` chưa cài; `UIBackgroundModes: [fetch]` đã khai trong app.json). Task này SHALL không được dùng cho real-time; chỉ tăng xác suất coverage dài hơn. Ghi rõ là work còn lại (tasks 4.3) — không ảnh hưởng state engine (reconcile khi mở lại vẫn đúng).

#### Scenario: BGTask chạy khi notification đã fire (chưa verify — chờ implement)
- **WHEN** (sau khi implement) iOS chạy BGAppRefreshTask lúc notification kế tiếp đã fire và session còn chạy
- **THEN** hệ thống reschedule thêm notification từ trạng thái hiện tại nếu còn stage kế

### Requirement: iOS — Coverage warning trong Editor
Trên iOS, Editor (`src/app/preset/[id].tsx`) SHALL hiện cảnh báo khi preset cần nhiều transition hơn khả năng schedule: `exceedsNotificationWindow(preset, maxTransitions)` với `maxTransitions = effectiveMaxStageQueue(reminder_reserved_slots, activeSchedules, max_scheduled_transitions_ios)` (budget-split: `64 − reserved − active` — từ `src/features/routine/routine-schedule.ts`). Cảnh báo SHALL chỉ xuất hiện trên iOS, không trên Android.

#### Scenario: Preset vượt cửa sổ notification hiệu dụng
- **WHEN** preset có `stageCount × rounds > effectiveMaxStageQueue` (vd HIIT forever, có schedule active) và user ở iOS
- **THEN** Editor hiện cảnh báo coverage-window

#### Scenario: Preset ngắn không cảnh báo
- **WHEN** preset kết thúc trong ≤ effectiveMax transition (vd Pomodoro once)
- **THEN** Editor không hiện cảnh báo

#### Scenario: Không cảnh báo trên Android
- **WHEN** user ở Android mở Editor của preset dài
- **THEN** không hiện cảnh báo coverage-window (Exact Alarm không giới hạn số lượng tương tự)

### Requirement: Deterministic notification ID và cancel chính xác
Mỗi notification SHALL có ID deterministic `"{session.id}_{round}_{stageIndex}"`. Khi Pause/Skip/Stop hoặc reschedule, hệ thống SHALL cancel đúng các notification liên quan bằng ID này, không cancel nhầm notification của session khác.

#### Scenario: Skip stage giữa chừng trên iOS
- **WHEN** user skip stage giữa chừng
- **THEN** các notification của stage bị bỏ được cancel và hàng đợi được schedule lại từ stage mới

#### Scenario: Stop session
- **WHEN** user stop session
- **THEN** toàn bộ pending notification của session đó được cancel theo ID

### Requirement: Reconcile mọi lần wake
Bất kỳ lúc nào app được đánh thức (alarm fire, BGTask, cold-start, resume), hệ thống SHALL gọi `engine.reconcile(now)` trước khi thực hiện bất kỳ hành động schedule nào, để không schedule trên trạng thái lỗi thời.

#### Scenario: Cold start khi session hết hạn lâu
- **WHEN** app cold-start và session RUNNING đã hết hạn nhiều stage
- **THEN** reconcile advance toàn bộ stage expired trước khi schedule; notification kế được schedule từ trạng thái đúng
