## Purpose

Capability `remote-config` định nghĩa cấu hình từ xa Firebase Remote Config: 9 key chuẩn với giá trị mặc định cụ thể (áp dụng ngay khi chưa fetch được), cơ chế fallback khi không có network, và quy tắc mọi magic number phải qua Remote Config thay vì hard-code.

## ADDED Requirements

### Requirement: 9 Remote Config key với default values
Hệ thống SHALL sử dụng các key sau với default values (áp dụng khi chưa có giá trị từ server):

| Key | Default | Ý nghĩa |
|---|---|---|
| `interstitial_cooldown_seconds` | 240 | Khoảng cách tối thiểu giữa 2 interstitial |
| `interstitial_max_per_session` | 1 | Số interstitial tối đa mỗi phiên |
| `app_open_cooldown_seconds` | 60 | Khoảng cách tối thiểu giữa 2 App Open |
| `max_scheduled_transitions_ios` | 50 | Giới hạn notification iOS |
| `missed_transition_rate_threshold` | 0.15 | Ngưỡng gợi ý bật FGS |
| `timer_screen_native_ad_enabled` | false | Bật native ad trên timer screen (A/B sau) |
| `preset_free_limit` | -1 | Giới hạn preset (không giới hạn) |
| `custom_sound_unlock_hours` | 24 | Thời hạn Rewarded unlock tạm thời |
| `reminder_reserved_slots` | 10 | Ngân sách notification dành riêng cho RoutineSchedule (iOS budget-split, spec scheduled-routine) |

#### Scenario: Giá trị mặc định khi chưa fetch
- **WHEN** app mới cài, chưa fetch được Remote Config (hoặc chưa có network)
- **THEN** hệ thống dùng đúng default values bảng trên

#### Scenario: Remote Config thay đổi cooldown
- **WHEN** admin đẩy `interstitial_cooldown_seconds = 600` lên console
- **THEN** sau khi app fetch, cooldown interstitial áp dụng là 600 giây

### Requirement: Fallback khi không có network
Khi không fetch được Remote Config (offline, server lỗi), hệ thống SHALL tiếp tục chạy bình thường với default values local, không crash và không chặn chức năng.

#### Scenario: Offline
- **WHEN** app chạy offline và cần đọc cấu hình ad cooldown
- **THEN** hệ thống dùng default value (240s) và không có lỗi

### Requirement: Không hard-code magic number
Mọi ngưỡng vận hành liên quan ad/giới hạn (cooldown, cap, unlock hours, FGS threshold) SHALL đọc qua Remote Config service; code SHALL không chứa giá trị cứng cho các ngưỡng này (default chỉ nằm trong 1 nơi khai báo cấu hình).

#### Scenario: Sửa ngưỡng không cần release
- **WHEN** team muốn đổi `missed_transition_rate_threshold` từ 0.15 thành 0.2
- **THEN** chỉ cần đổi trên Remote Config console, không cần build mới

### Requirement: Activation thời điểm hợp lý
Hệ thống SHALL fetch Remote Config ở khởi động và activate khi fetch xong; giá trị áp dụng cho các quyết định ad/scheduling kế tiếp (không bắt buộc thay đổi hành vi đang chạy giữa chừng).

#### Scenario: Fetch xong giữa phiên
- **WHEN** app fetch + activate Remote Config trong lúc session đang chạy
- **THEN** các quyết định mới dùng giá trị mới; session đang chạy không bị gián đoạn
