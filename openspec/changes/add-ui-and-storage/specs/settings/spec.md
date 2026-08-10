## Purpose

Capability `settings` định nghĩa các tùy chọn người dùng có thể bật/tắt và persist (sound, vibration, wake lock, theme), cùng với các liên kết thông tin app (About, Privacy Policy, Rate). Cài đặt lưu qua SettingsRepo và được các tính năng khác (audio, haptics, màn hình) đọc để áp dụng.

## ADDED Requirements

### Requirement: Toggle Sound
Settings SHALL có toggle bật/tắt âm thanh khi stage chuyển tiếp. Giá trị mặc định SHALL là bật. Thay đổi SHALL persist và áp dụng cho lần transition kế tiếp (không áp dụng retroactively).

#### Scenario: Tắt sound
- **WHEN** user tắt toggle Sound rồi timer chuyển stage
- **THEN** không có âm thanh transition nào được phát (nhưng rung/thông báo vẫn theo cài đặt riêng)

### Requirement: Toggle Vibration
Settings SHALL có toggle bật/tắt rung khi stage chuyển tiếp. Giá trị mặc định SHALL là bật. Thay đổi SHALL persist.

#### Scenario: Tắt vibration
- **WHEN** user tắt toggle Vibration rồi timer chuyển stage
- **THEN** không có pattern rung nào được thực hiện

### Requirement: Toggle Wake Lock
Settings SHALL có toggle giữ màn hình sáng (wake lock) trong lúc timer chạy. Giá trị mặc định SHALL là bật. Toggle chỉ có hiệu lực khi có session active; tắt thì màn hình tắt bình thường theo hệ thống.

#### Scenario: Bật wake lock khi timer chạy
- **WHEN** wakeLockEnabled = true và có session đang RUNNING
- **THEN** màn hình không tự tắt trong lúc session chạy

#### Scenario: Không có session thì không giữ sáng
- **WHEN** không có session active và user ở Home
- **THEN** màn hình tắt theo hành vi hệ thống bình thường dù wakeLockEnabled = true

### Requirement: Toggle Theme
Settings SHALL có lựa chọn theme: theo hệ thống (mặc định). App SHALL phản ánh ngay khi user đổi lựa chọn và persist lựa chọn.

#### Scenario: Đổi theme theo hệ thống
- **WHEN** user chọn "Theo hệ thống"
- **THEN** app dùng theme sáng/tối theo cài đặt hệ thống hiện tại và cập nhật khi hệ thống đổi

### Requirement: About / Privacy Policy / Rate
Settings SHALL có mục About (thông tin app/version), liên kết Privacy Policy (mở URL Privacy Policy), và nút Rate app (mở store page). Các mục này SHALL tồn tại sẵn ngay từ bản đầu (Day 1).

#### Scenario: Mở Privacy Policy
- **WHEN** user chạm mục Privacy Policy trong Settings
- **THEN** app mở URL Privacy Policy bằng trình duyệt ngoài
