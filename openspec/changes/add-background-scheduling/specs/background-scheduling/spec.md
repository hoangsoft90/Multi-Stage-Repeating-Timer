## Purpose

Capability `background-scheduling` định nghĩa cách app nhờ OS đánh thức đúng lúc stage kết thúc khi app ở nền/kill: Android Exact Alarm + khôi phục sau reboot + FGS opt-in; iOS queue tối đa 50 notification + BGAppRefreshTask best-effort; cùng quy tắc notification ID và cancel/reschedule. Mục tiêu là state luôn đúng khi user quay lại và thông báo transition đáng tin cậy trong giới hạn nền tảng đã công khai.

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

### Requirement: Android — FGS opt-in fallback (tùy chọn)
Hệ thống SHALL chỉ đề xuất bật "Keep timer alive" (Foreground Service) khi `missed_transition_rate` đo được trên thiết bị vượt ngưỡng (> 15%, theo Remote Config). Khi user bật, hệ thống SHALL chạy foreground service với `foregroundServiceType=specialUse`, hiện **persistent notification bắt buộc không thể ẩn** trong lúc timer chạy, và khai justification string đầy đủ. Dialog xin bật SHALL nói rõ trade-off: "Sẽ hiện thông báo cố định trên thanh trạng thái trong lúc timer chạy để đảm bảo không bị hệ thống tắt."

#### Scenario: Chỉ đề xuất FGS khi vượt ngưỡng
- **WHEN** missed_transition_rate trên thiết bị = 20% (> 15%)
- **THEN** hệ thống hiện gợi ý bật "Keep timer alive"; khi rate ≤ 15% thì không gợi ý

#### Scenario: Bật FGS hiện persistent notification
- **WHEN** user bật Keep timer alive và timer chạy
- **THEN** thanh trạng thái hiện notification persistent của timer mà user không thể ẩn cho tới khi dừng timer

### Requirement: iOS — Queue tối đa 50 notification
Trên iOS, hệ thống SHALL lên lịch tối đa 50 local notification kế tiếp theo thứ tự stage-end (cấu hình qua Remote Config `max_scheduled_transitions_ios`, mặc định 50). Khi start/resume/cold-start, hệ thống SHALL `cancelAllPending` rồi reconcile và schedule lại từ trạng thái hiện tại (anchor = now, cộng dồn duration từng stage). Hệ thống SHALL không đảm bảo notification liên tục sau khi 50 notification đã fire mà app chưa được mở lại — đây là known limitation công khai.

#### Scenario: Start session dài
- **WHEN** user start preset HIIT 40/20 (repeat forever, tổng 50+ transition)
- **THEN** hệ thống schedule đúng 50 notification đầu tiên tính từ now

#### Scenario: 50 notification đã fire, app chưa mở lại
- **WHEN** cả 50 notification đã fire và user chưa mở lại app
- **THEN** không có notification nào thêm được lên lịch; khi user mở lại app, reconcile trả về đúng stage hiện tại

#### Scenario: Resume sau pause
- **WHEN** user resume session đang PAUSED
- **THEN** hệ thống cancelAllPending rồi schedule lại 50 notification từ trạng thái hiện tại

### Requirement: iOS — BGAppRefreshTask best-effort
Hệ thống SHALL đăng ký `BGAppRefreshTask` để iOS *có thể* (không đảm bảo) đánh thức app ngắn hạn nhằm reschedule thêm notification khi queue cạn. Task này SHALL không được dùng cho real-time; nó chỉ tăng xác suất coverage dài hơn.

#### Scenario: BGTask chạy khi queue cạn
- **WHEN** iOS chạy BGAppRefreshTask lúc queue notification đang cạn và session còn chạy
- **THEN** hệ thống reschedule thêm notification từ trạng thái hiện tại nếu còn stage kế

### Requirement: iOS — Coverage warning trong Editor
Hệ thống SHALL ước tính `estimatedCoverage = tổng duration của 50 transition kế tiếp`. Nếu preset cần hơn 50 transition trước khi user dự kiến quay lại (heuristic: estimatedCoverage < khoảng thời gian mong đợi), Editor SHALL hiện cảnh báo: "Routine dài này có thể cần mở lại app sau khoảng ~X phút để tiếp tục nhận thông báo đầy đủ." Cảnh báo này SHALL chỉ xuất hiện trên iOS, không trên Android.

#### Scenario: Preset vượt cửa sổ 50 notification
- **WHEN** preset có tổng duration của 50 transition kế tiếp < khoảng thời gian dự kiến (vd HIIT forever) và user ở iOS
- **THEN** Editor hiện cảnh báo coverage-window

#### Scenario: Preset ngắn không cảnh báo
- **WHEN** preset kết thúc trong < 50 transition (vd Pomodoro once)
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
