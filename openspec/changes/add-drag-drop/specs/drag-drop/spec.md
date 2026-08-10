## Purpose

Capability `drag-drop` định nghĩa khả năng sắp xếp lại thứ tự stage trong Editor và luật bất biến: reorder không tạo ID mới; template built-in khi Save luôn tạo preset mới (không ghi đè).

## ADDED Requirements

### Requirement: Sắp xếp lại stage
Editor SHALL cho phép đổi thứ tự stage (tối thiểu: nút up/down trên mỗi stage; nếu drag gesture khả thi thì thêm). Thứ tự mới SHALL được phản ánh ngay trong danh sách và trong preset khi Save/Start. Stage.id SHALL không đổi khi reorder.

#### Scenario: Đổi thứ tự
- **WHEN** user đưa stage B lên trước stage A
- **THEN** danh sách hiển thị B trước A; khi Save, preset.stages theo thứ tự mới; ids của A và B không đổi

#### Scenario: Invariant id
- **WHEN** reorder diễn ra
- **THEN** mọi Stage.id và Stage.soundId giữ nguyên (không sinh id mới)

### Requirement: Template Save-as-new
Khi mở template built-in trong Editor và user Save, hệ thống SHALL tạo preset mới (id mới, tên gợi ý `[Tên] (edited)`) — không bao giờ ghi đè template gốc. Nút Save SHALL có nhãn thể hiện "lưu thành bản mới".

#### Scenario: Save template đã sửa
- **WHEN** user mở template Pomodoro, đổi 1 stage, bấm Save
- **THEN** preset mới "Pomodoro (edited)" được tạo; template Pomodoro gốc không đổi

#### Scenario: Template không có nút Xóa
- **WHEN** user mở template built-in
- **THEN** không có nút Xóa preset (template bất biến)
