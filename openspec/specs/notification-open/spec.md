# notification-open Specification

## Purpose
Capability `notification-open` định nghĩa hành vi khi user **bấm vào thân notification** (không phải action button): mở màn hình timer. Hoạt động cả khi app đang chạy/background và khi app bị kill (cold start).
## Requirements
### Requirement: Body-tap mở màn timer

Bấm vào thân một notification (action identifier = DEFAULT) SHALL mở màn hình `/timer`. Nếu không có session đang chạy, màn timer tự chuyển về Home (hành vi có sẵn của màn timer).

#### Scenario: Bấm thân notification khi session đang chạy
- **WHEN** timer đang chạy nền và user bấm vào thân notification chuyển giai đoạn
- **THEN** app mở màn `/timer` hiển thị trạng thái session hiện tại

#### Scenario: Bấm thân notification khi không có session
- **WHEN** user bấm thân notification (vd. thông báo routine) mà không có session chạy
- **THEN** app mở `/timer` rồi chuyển về Home (không crash)

### Requirement: Cold start từ body-tap

Khi app bị kill và được mở lại bằng cách bấm vào thân notification, hệ thống SHALL đọc pending response, hydrate các store, và navigate tới `/timer` — tương đương hành vi live listener.

#### Scenario: Mở app từ notification khi app đã bị kill
- **WHEN** app bị kill, user bấm thân notification
- **THEN** app khởi động, hydrate store, và mở `/timer`

### Requirement: Không đổi hành vi action button

Các action button hiện có (Pause/Skip/Stop, reminder Start/Snooze/Dismiss) SHALL giữ nguyên hành vi — body-tap chỉ bổ sung, không thay thế.

#### Scenario: Action button vẫn hoạt động
- **WHEN** user bấm action "Pause" trên notification
- **THEN** session pause và điều hướng theo hành vi cũ (không bị ảnh hưởng bởi body-tap)

