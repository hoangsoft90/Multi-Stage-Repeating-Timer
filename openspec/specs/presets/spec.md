# presets Specification

## Purpose
Capability `presets` định nghĩa hành vi của preset — đơn vị cấu hình routine có thể chỉnh sửa (mutable): CRUD, 3 templates built-in, duplicate, và rules validation. Preset khác với Session (snapshot immutable tạo tại Start); sửa preset không ảnh hưởng session đang chạy.
## Requirements
### Requirement: CRUD preset
Hệ thống SHALL cho phép tạo, đọc, sửa, xóa preset. Mỗi preset SHALL có: id, name, danh sách stage, repeatMode, fixedCount (chỉ khi fixedCount), createdAt, lastUsedAt, schemaVersion. Xóa preset SHALL có xác nhận.

#### Scenario: Tạo preset mới
- **WHEN** user tạo preset mới với 3 stage và lưu
- **THEN** preset xuất hiện trong danh sách Home với đúng tên và thông tin tóm tắt

#### Scenario: Cập nhật lastUsedAt khi start
- **WHEN** user start một preset
- **THEN** lastUsedAt của preset được cập nhật về thời điểm start

#### Scenario: Xóa preset
- **WHEN** user xác nhận xóa một preset
- **THEN** preset biến mất khỏi Home và mọi session liên quan không bị ảnh hưởng (session là snapshot độc lập)

### Requirement: 3 templates built-in
Hệ thống SHALL cung cấp 3 template mặc định, không thể xóa, mỗi template có cấu hình cụ thể:
- **Work/Break 60/10**: stage WORK 60s + stage BREAK 10s, repeatMode = forever.
- **Pomodoro 25/5+15**: 4 round (WORK 25min + BREAK 5min) và sau round 4 là LONG BREAK 15min, repeatMode = once.
- **HIIT 40/20**: WORK 40s + REST 20s, repeatMode = fixedCount với số round mặc định (≥1, mặc định 8).

Template SHALL có thể duplicate thành preset riêng để user chỉnh sửa tự do mà không ảnh hưởng template gốc.

#### Scenario: Duplicate template
- **WHEN** user bấm Duplicate trên template Pomodoro 25/5+15
- **THEN** hệ thống tạo preset mới sao chép đầy đủ stage/repeatMode, user chỉnh được mà template gốc vẫn nguyên

#### Scenario: Duplicate preset của user
- **WHEN** user bấm Duplicate trên preset bất kỳ
- **THEN** hệ thống tạo bản sao mới với id mới, tên có hậu tố "(copy)", không đè lên bản gốc

### Requirement: Validation rules
Preset SHALL chỉ hợp lệ khi: mỗi stage có duration trong 1 giây – 24 giờ; số stage trong 1–50; fixedCount ≥ 1 khi repeatMode = fixedCount; name không rỗng và ≤ 50 ký tự. Hệ thống SHALL từ chối lưu preset vi phạm bất kỳ rule nào.

#### Scenario: Stage không có duration hợp lệ
- **WHEN** một stage có duration vượt 24 giờ
- **THEN** hệ thống từ chối lưu preset và trả lỗi validation cụ thể

#### Scenario: fixedCount thiếu
- **WHEN** repeatMode = fixedCount nhưng chưa nhập fixedCount
- **THEN** hệ thống từ chối lưu và yêu cầu nhập fixedCount ≥ 1

### Requirement: Sửa preset không ảnh hưởng session đang chạy
Sửa/xóa preset SHALL KHÔNG làm thay đổi session snapshot đã tạo từ preset đó trước khi sửa (session lưu `stagesSnapshot` riêng).

#### Scenario: Edit preset khi session đang chạy
- **WHEN** session đang chạy từ preset P và user sửa P (đổi duration stage 1)
- **THEN** session vẫn chạy theo snapshot cũ; thay đổi chỉ áp dụng cho lần Start sau

