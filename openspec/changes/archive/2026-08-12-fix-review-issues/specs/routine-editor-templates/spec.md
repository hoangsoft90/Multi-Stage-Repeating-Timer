## Purpose

Capability `routine-editor-templates` đảm bảo màn chỉnh sửa lịch trình (routine schedule editor) dùng được cho mọi user — kể cả người chưa tạo preset nào — bằng cách cho chọn built-in template, và hiển thị tên preset đúng trong notification nhắc lịch.

## ADDED Requirements

### Requirement: Routine editor liệt kê built-in templates

Preset picker trong routine editor SHALL liệt kê cả `BUILTIN_TEMPLATES` lẫn preset user tự tạo (built-in trước, dedup theo id). Khi user chưa có preset nào, picker SHALL vẫn có template để chọn và tự chọn mặc định mục đầu tiên — không hiện menu rỗng.

#### Scenario: User mới chưa có preset
- **WHEN** user chưa tạo preset nào mở màn "Add schedule"
- **THEN** picker hiển thị danh sách built-in template, preset mặc định là template đầu tiên, lưu được lịch trình

#### Scenario: Có cả built-in và preset riêng
- **WHEN** user vừa có preset riêng vừa có built-in
- **THEN** cả hai đều chọn được, không bị trùng id

### Requirement: Tên built-in trong notification lịch trình

`schedulePresetName` SHALL resolve tên hiển thị từ built-in templates khi schedule trỏ tới built-in (thay vì fallback raw `presetId` như `temp_quick_session`).

#### Scenario: Lịch trình dùng built-in template
- **WHEN** schedule trỏ tới built-in template và notification nhắc lịch được gửi
- **THEN** body notification hiển thị tên template (vd "HIIT 40/20"), không phải id thô
