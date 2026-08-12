# screens Specification

## Purpose
Capability `screens` định nghĩa hành vi observable của 4 màn hình chính (Home templates-first, Editor, Timer Running sacred, Settings), luồng điều hướng, và các quyết định UX về Start/Stop/confirm khi user chạy timer. Timer Running là màn hình thiêng: không chứa ad, không che countdown/progress/controls.
## Requirements
### Requirement: Home — templates-first activation
Home SHALL hiển thị theo thứ tự ưu tiên: 3 templates built-in (Work/Break 60/10, Pomodoro 25/5+15, HIIT 40/20) nổi bật, sau đó là danh sách preset của user (tên + thông tin ngắn: tổng số stage, repeat mode). Home SHALL có nút "Tạo preset mới" và nút vào Settings. Chạm vào template/preset SHALL mở Editor để xem/sửa trước khi Start (templates-first activation, không start trực tiếp từ Home).

#### Scenario: Mở Home lần đầu
- **WHEN** user mở app lần đầu (chưa có preset nào)
- **THEN** Home hiển thị 3 templates built-in và danh sách preset rỗng với hướng dẫn tạo mới

#### Scenario: Chạm template
- **WHEN** user chạm vào template Work/Break 60/10
- **THEN** app mở Editor với preset tạm được khởi tạo từ template để user xem/sửa trước khi Start

### Requirement: Editor — tạo và chỉnh sửa preset
Editor SHALL cho phép user sửa tên preset, danh sách stage (mỗi stage: tên, duration giây, sound pattern, vibration pattern), chọn repeat mode (once/fixedCount/forever), nhập fixedCount khi chọn fixedCount, và lưu preset. Editor SHALL hỗ trợ thêm/xóa stage, duplicate preset, và xóa preset (có confirm).

#### Scenario: Sửa stage và lưu
- **WHEN** user sửa duration của stage thứ 2 từ 30s thành 45s rồi bấm Lưu
- **THEN** preset được lưu với duration mới và quay về Home hiển thị preset đã cập nhật

#### Scenario: Xóa preset có confirm
- **WHEN** user bấm Xóa trên một preset
- **THEN** app hiện dialog xác nhận, chỉ xóa khi user xác nhận

### Requirement: Validation preset
Editor SHALL chặn lưu preset không hợp lệ theo rules: duration mỗi stage từ 1 giây đến 24 giờ; số stage từ 1 đến 50; fixedCount ≥ 1 khi repeatMode = fixedCount; tên preset không rỗng và ≤ giới hạn ký tự (50). Khi vi phạm, Editor SHALL hiện thông báo lỗi cụ thể và không lưu.

#### Scenario: Duration ngoài phạm vi
- **WHEN** user nhập duration stage = 0 giây
- **THEN** Editor hiện lỗi "Duration phải từ 1 giây đến 24 giờ" và không cho lưu

#### Scenario: Quá nhiều stage
- **WHEN** user có 51 stage trong một preset
- **THEN** Editor hiện lỗi "Tối đa 50 stage" và không cho lưu

### Requirement: Timer Running — sacred screen
Màn Timer Running SHALL hiển thị: tên stage hiện tại, countdown còn lại (do engine tính), progress bar theo stage, round x/y (khi repeatMode có round), và stage kế tiếp (tên + duration). Controls SHALL gồm Pause, Skip, Stop — Stop có dialog confirm, Pause/Skip không cần confirm. Màn này SHALL KHÔNG hiển thị bất kỳ ad nào và không che khuất countdown/progress/controls.

#### Scenario: Render trạng thái chạy
- **WHEN** session đang RUNNING ở stage WORK round 2/5
- **THEN** màn hình hiển thị WORK, countdown theo remaining do engine emit, progress, "Round 2 / 5", và next stage (tên + duration)

#### Scenario: Stop cần xác nhận
- **WHEN** user bấm Stop
- **THEN** app hiện dialog xác nhận dừng timer trước khi thực sự dừng

#### Scenario: Không có ad khi timer chạy
- **WHEN** màn Timer Running đang hiển thị và session đang hoạt động
- **THEN** không có ad (banner/native/interstitial/app-open) nào xuất hiện trên màn này

### Requirement: Single active session — confirm khi start preset khác
Chỉ SHALL tồn tại một session active trên một device. Khi user Start preset B trong lúc preset A đang chạy (chưa completed/stopped), app SHALL hiện confirm "Ngưng timer A để bắt đầu B?" — chỉ start B khi user xác nhận, kèm dừng A.

#### Scenario: Start B khi A đang chạy
- **WHEN** session A đang RUNNING và user bấm Start preset B
- **THEN** app hiện dialog xác nhận; nếu đồng ý thì A dừng và B bắt đầu, nếu hủy thì A tiếp tục chạy

### Requirement: Settings — màn hình và điều hướng
Settings SHALL cung cấp các toggle: Sound (bật/tắt âm transition), Vibration (bật/tắt rung), Wake Lock (giữ màn hình sáng khi timer chạy), Theme (theo hệ thống). Settings SHALL có các mục About, Privacy Policy (mở URL), và Rate app. Settings SHALL được truy cập từ Home.

#### Scenario: Mở Settings từ Home
- **WHEN** user bấm icon Settings trên Home
- **THEN** app mở màn Settings với các toggle và liên kết About/Privacy/Rate

