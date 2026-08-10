## Purpose

Capability `permissions` định nghĩa thứ tự, thời điểm và hành vi degrade của 3 loại permission cần thiết để chạy timer đáng tin cậy ở nền: `POST_NOTIFICATIONS` (Android 13+, runtime), `SCHEDULE_EXACT_ALARM` (Android 12+, special access), `RECEIVE_BOOT_COMPLETED` (manifest, không dialog). Mục tiêu: app vẫn hoạt động đầy đủ chức năng chính khi user từ chối — chỉ giảm độ tin cậy của notification/alarm, không chặn timer.

## ADDED Requirements

### Requirement: Thứ tự xin permission bắt buộc
Hệ thống SHALL xin permission theo đúng thứ tự và thời điểm:
1. `POST_NOTIFICATIONS` — xin **ngay khi user tạo timer đầu tiên** (không xin lúc onboarding), kèm giải thích "Cần quyền thông báo để báo khi hết stage".
2. `SCHEDULE_EXACT_ALARM` — xin **just-in-time** khi user bấm Start lần đầu (không xin lúc onboarding).
3. `RECEIVE_BOOT_COMPLETED` — khai trong Manifest, không cần runtime dialog.

#### Scenario: Tạo timer đầu tiên
- **WHEN** user tạo preset/timer đầu tiên
- **THEN** hệ thống xin POST_NOTIFICATIONS với lời giải thích rõ ràng

#### Scenario: Bấm Start lần đầu
- **WHEN** user bấm Start lần đầu tiên
- **THEN** hệ thống xin SCHEDULE_EXACT_ALARM ngay tại thời điểm đó

### Requirement: POST_NOTIFICATIONS bị từ chối — app vẫn chạy
Khi `POST_NOTIFICATIONS` bị từ chối, hệ thống SHALL tiếp tục cho chạy timer đầy đủ: countdown, chuyển stage, wake lock vẫn hoạt động; chỉ mất sound/notification. Hệ thống SHALL không block Start, không hiện dialog lặp lại quá mức.

#### Scenario: Từ chối POST_NOTIFICATIONS
- **WHEN** user từ chối POST_NOTIFICATIONS
- **THEN** timer vẫn start/đếm/chuyển stage bình thường, chỉ không có notification; Settings cho phép user bật lại quyền

### Requirement: SCHEDULE_EXACT_ALARM bị từ chối — graceful degradation
Khi `SCHEDULE_EXACT_ALARM` bị từ chối, hệ thống SHALL chuyển sang `setAndAllowWhileIdle` (POSSIBLY_EXACT) và hiển thị trong Settings: "Độ chính xác nền có thể giảm — timer có thể chậm vài phút khi app bị treo lâu." App SHALL không crash và vẫn schedule.

#### Scenario: Từ chối SCHEDULE_EXACT_ALARM
- **WHEN** user từ chối SCHEDULE_EXACT_ALARM
- **THEN** hệ thống dùng inexact alarm, Settings hiển thị cảnh báo, timer vẫn chạy

### Requirement: Runtime permission theo version Android
Hệ thống SHALL chỉ xin runtime permission khi API level yêu cầu: POST_NOTIFICATIONS chỉ trên Android 13+ (API 33), SCHEDULE_EXACT_ALARM chỉ trên Android 12+ (API 31) với check `canScheduleExactAlarms()`; trên bản thấp hơn SHALL bỏ qua không xin.

#### Scenario: Android 12 trở xuống
- **WHEN** thiết bị chạy Android 11
- **THEN** hệ thống không xin POST_NOTIFICATIONS/SCHEDULE_EXACT_ALARM (không cần) và vẫn schedule alarm bình thường

### Requirement: RECEIVE_BOOT_COMPLETED — manifest-only
Hệ thống SHALL khai `RECEIVE_BOOT_COMPLETED` + receiver trong AndroidManifest và không yêu cầu runtime dialog cho permission này. Hành vi xử lý boot được định nghĩa trong capability `background-scheduling`.

#### Scenario: Không có dialog boot permission
- **WHEN** user cài app lần đầu trên Android
- **THEN** không có dialog nào về RECEIVE_BOOT_COMPLETED xuất hiện

### Requirement: Trạng thái permission hiển thị trong Settings
Settings SHALL hiển thị trạng thái các permission (notification, exact alarm) và cho phép user điều hướng tới màn cài đặt hệ thống để bật lại khi đã từ chối.

#### Scenario: Xem trạng thái permission
- **WHEN** user mở Settings
- **THEN** app hiển thị trạng thái notification/alarm hiện tại và nút "Mở cài đặt hệ thống" khi permission đang bị từ chối
