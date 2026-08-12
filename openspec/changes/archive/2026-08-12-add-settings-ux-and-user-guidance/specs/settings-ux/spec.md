## Purpose

Capability `settings-ux` chuẩn hóa trải nghiệm màn Settings: mọi action row phải bấm được (hoặc hiện lý do không bấm được), menu dài cuộn được, trạng thái quyền hạn phản ánh đúng và tự refresh khi quay lại từ cài đặt hệ thống.

## ADDED Requirements

### Requirement: Menu action cuộn được

Hệ thống SHALL hiển thị menu hành động (action sheet) sao cho danh sách item vượt quá chiều cao màn hình có thể **cuộn** được, với tiêu đề và nút Hủy luôn hiển thị. Language picker (13 mục: System + 12 ngôn ngữ) SHALL cuộn được trên màn hình nhỏ — mọi item đều chạm được.

#### Scenario: Mở language picker trên màn hình nhỏ
- **WHEN** user mở menu "Language" trên màn hình có chiều cao giới hạn
- **THEN** danh sách ngôn ngữ cuộn được, không mục nào bị cắt vĩnh viễn, nút Hủy luôn hiện

### Requirement: Row "Privacy options" phản hồi khi bấm

Row "Privacy options" (phần Sound Packs) SHALL luôn phản hồi khi bấm: nếu form UMP khả dụng → hiện form; nếu không khả dụng (khu vực không yêu cầu / chưa sẵn sàng) → hiện thông báo giải thích, KHÔNG fail im lặng.

#### Scenario: Form UMP không khả dụng
- **WHEN** user bấm "Privacy options" mà form không khả dụng
- **THEN** hiện thông báo "Không có tùy chọn quyền riêng tư" kèm lời giải thích, app không crash

### Requirement: Row "Background accuracy" luôn bấm được

Trên Android, row "Background accuracy" (trạng thái `SCHEDULE_EXACT_ALARM`) SHALL luôn bấm được và mở màn hình hệ thống "Alarms & reminders" — kể cả khi quyền đã được cấp. Trạng thái hiển thị SHALL tự refresh mỗi khi màn Settings được focus lại (user quay về từ cài đặt hệ thống).

#### Scenario: Quyền đã cấp vẫn mở được
- **WHEN** user bấm row "Background accuracy" khi quyền exact alarm đã được cấp
- **THEN** mở màn hình cài đặt hệ thống tương ứng (không bị `disabled`)

#### Scenario: Refresh sau khi cấp quyền
- **WHEN** user vào cài đặt hệ thống cấp quyền exact alarm rồi quay lại màn Settings
- **THEN** trạng thái row cập nhật lại (không cần thoát app)

### Requirement: "Background accuracy" đánh dấu đã hỏi (once per install)

Khi user mở màn hình hệ thống "Alarms & reminders" từ row "Background accuracy", hệ thống SHALL đánh dấu cờ once-per-install (`looptimer:exact-alarm-asked`) để just-in-time prompt lúc Start lần đầu KHÔNG mở lại màn hình này (chống double-prompt — chi tiết change `fix-exact-alarm-prompt`).

#### Scenario: Settings trước, Start sau
- **WHEN** user bấm row "Background accuracy" rồi quay lại app và Start timer lần đầu
- **THEN** timer chạy thẳng, không nhảy lại màn hình "Alarms & reminders"

#### Scenario: Launch thất bại
- **WHEN** mở màn hình hệ thống từ Settings thất bại
- **THEN** cờ không được set, Start đầu vẫn còn cơ hội hỏi

### Requirement: Phát hiện exact alarm thận trọng

Khi không thể phát hiện trạng thái exact alarm (API không có sẵn), hệ thống SHALL báo "chưa chắc chắn" (không khẳng định đã được cấp) để user có động cơ bấm row và tự cấp quyền — thay vì khóa row.

#### Scenario: Không có API phát hiện
- **WHEN** platform không expose API phát hiện exact alarm
- **THEN** giá trị hiển thị là "May be delayed" (không phải "Exact"), row vẫn bấm được

### Requirement: Affordance row bấm được

Row có hành động khi bấm (onPress) SHALL có dấu hiệu visual (chevron) để phân biệt với row chỉ hiển thị/switch.

#### Scenario: Phân biệt row
- **WHEN** user nhìn màn Settings
- **THEN** row bấm được hiển thị chevron, row switch không hiển thị chevron
