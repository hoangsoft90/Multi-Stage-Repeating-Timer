## Purpose

Capability `scheduled-routine` định nghĩa lịch trình lặp (ngày-trong-tuần × giờ) để nhắc user chạy routine — đóng vòng lặp habit. Kèm 4 guardrail bắt buộc: Overwrite Guard, Snooze, missed không trừng phạt, và tách ngân sách notification iOS giữa stage queue và reminder queue.

## ADDED Requirements

### Requirement: Tạo/quản lý RoutineSchedule
Hệ thống SHALL cho phép tạo/sửa/xóa/bật-tắt lịch trình lặp: chọn preset, `daysOfWeek` (1=Mon..7=Sun), `hour`, `minute`, `notificationMinutesBefore` (vd [0] hoặc [0,10]). Schedule lưu persist (AsyncStorage). Nhiều schedule có thể bật cùng lúc.

#### Scenario: Tạo schedule mới
- **WHEN** user tạo schedule "Morning Stretch" 08:00 T2/T4/T6 chọn preset Stretch
- **THEN** schedule được lưu, enabled=true, và reminder được schedule cho lần trigger kế tiếp

#### Scenario: Tắt schedule
- **WHEN** user tắt một schedule
- **THEN** reminder tương ứng bị hủy, schedule giữ nguyên (enabled=false) để bật lại sau

### Requirement: Reminder đúng giờ (đa nền tảng)
Ở thời điểm đã lịch (giờ:phút, ngày trong tuần), hệ thống SHALL hiện notification reminder: tên preset + các action [Start] [Snooze 5m] [Snooze 10m] [Dismiss]. Nếu `notificationMinutesBefore` khác rỗng, hệ thống SHALL nhắc trước N phút (nội dung khác — "sắp đến giờ").

#### Scenario: Reminder đúng giờ
- **WHEN** 08:00 T2 và schedule Morning Stretch bật
- **THEN** notification "Time for Morning Stretch" hiện với 4 action

#### Scenario: Nhắc trước
- **WHEN** schedule có notificationMinutesBefore=[10] và còn 10 phút tới 08:00
- **THEN** notification nhắc trước hiện

### Requirement: Overwrite Guard
Khi reminder được Start (tap Start hoặc từ card) trong lúc đang có active session (bất kỳ — kể cả Quick Routine `temp_quick_session`), hệ thống SHALL hiện dialog confirm trước khi hủy session hiện tại: [Hủy phiên & Bắt đầu] [Tiếp tục phiên hiện tại]. Không có active session → Start ngay.

#### Scenario: Có session đang chạy
- **WHEN** user đang trong session Deep Work (còn 15m) và tap Start trên reminder Morning Stretch
- **THEN** dialog hiện; chọn Hủy & Bắt đầu → Deep Work bị dừng, Morning Stretch chạy; chọn Tiếp tục → giữ nguyên

#### Scenario: Không có session
- **WHEN** không có active session và tap Start reminder
- **THEN** preset start ngay, không confirm

### Requirement: Snooze
Action Snooze 5m/10m SHALL re-schedule reminder sau 5/10 phút. Mỗi schedule tối đa 3 lần snooze trong một lần trigger rồi tự dismiss (không nhắc nữa). `snoozeCount`/`snoozeUntil` được persist.

#### Scenario: Snooze 5m
- **WHEN** user tap Snooze 5m
- **THEN** reminder được re-schedule sau 5 phút, snoozeCount=1

#### Scenario: Vượt quá 3 lần snooze
- **WHEN** user snooze lần thứ 4 cho cùng một trigger
- **THEN** không còn notification nào (tự dismiss)

### Requirement: Missed không trừng phạt
Nếu reminder đã qua giờ mà user không start (không tap Start, không snooze), Home SHALL hiển thị card "Missed today" với [▶ Start now] [Skip]. Skip SHALL đánh dấu đã xử lý hôm nay. Việc bỏ lỡ reminder KHÔNG ảnh hưởng streak (streak giữ logic hiện tại).

#### Scenario: Bỏ lỡ reminder
- **WHEN** 09:00 (đã qua 08:00 schedule), user chưa start, `lastTriggeredDate != hôm nay`
- **THEN** card "Missed — Morning Stretch" hiện trên Home; Start now → chạy; Skip → không hiện nữa hôm nay

#### Scenario: Streak không bị ảnh hưởng
- **WHEN** user bỏ lỡ reminder hôm nay nhưng hôm qua có session
- **THEN** streak không reset (vẫn theo logic: reset khi không mở app 2 ngày liên tiếp)

### Requirement: Tách ngân sách notification iOS
Stage queue iOS SHALL không chiếm toàn bộ trần notification. Hệ thống SHALL đặt trần hiệu dụng: `effectiveMax = 64 - reminder_reserved_slots - activeScheduleCount` (Remote Config `reminder_reserved_slots`, default 10) và dùng `min(effectiveMax, max_scheduled_transitions_ios)` cho stage queue. Cảnh báo Editor (exceedsNotificationWindow) SHALL dùng trần hiệu dụng này.

#### Scenario: Nhiều schedule bật
- **WHEN** user có 5 schedule bật trên iOS
- **THEN** stage queue tối đa = 64 - 10 - 5 = 49 (thay vì 50), cảnh báo Editor tính theo 49
