## Purpose

Capability `user-guidance` dẫn dắt người dùng trong app bằng coach mark ngắn gọn (badge + tooltip + guide line) ngay tại đúng vị trí tính năng — trả lời "làm gì", "vì sao chưa dùng được" và "dùng thế nào". Mỗi guide chỉ hiện một lần và được nhớ vĩnh viễn.

## ADDED Requirements

### Requirement: Lưu trạng thái guide đã xem

Hệ thống SHALL lưu danh sách id guide mà user đã xem/dismiss (`guidesSeen`) trong settings, additive với schema cũ (settings không có field này đọc an toàn như `[]`). Guide đã xem SHALL không hiện lại.

#### Scenario: Guide chỉ hiện một lần
- **WHEN** user bấm "Đã hiểu" trên một guide
- **THEN** guide đó không bao giờ hiện lại (kể cả sau khi khởi động lại app)

### Requirement: Guide chỉ hiện sau onboarding

Guide (tooltip/badge) SHALL chỉ hiển thị khi user đã hoàn thành hoặc bỏ qua onboarding (`onboardingDone = true`) — không hiện trong luồng onboarding lần đầu.

#### Scenario: User mới chưa qua onboarding
- **WHEN** `onboardingDone` còn `false`
- **THEN** không hiển thị guide nào (badge/tooltip) trên Home/Timer/Settings

### Requirement: Badge thu hút chú ý trên Home

Home SHALL hiển thị chấm đỏ badge trên icon Templates / Stats / Settings khi user chưa từng mở tính năng đó; badge biến mất ngay khi user bấm vào icon.

#### Scenario: Mở Settings từ badge
- **WHEN** user bấm icon Settings đang có badge
- **THEN** navigate tới Settings và badge biến mất vĩnh viễn

### Requirement: Tooltip "Bắt đầu ngay" trên Home

Lần đầu tiên sau onboarding (chưa có session chạy), Home SHALL hiển thị tooltip hướng dẫn cách bắt đầu một preset — user hiểu "tap Start để chạy, các giai đoạn tự chuyển".

#### Scenario: Lần đầu vào Home
- **WHEN** user sau onboarding vào Home lần đầu, chưa có session chạy
- **THEN** hiện tooltip hướng dẫn bắt đầu, kèm nút "Đã hiểu"/"Bỏ qua"

### Requirement: Card "Timer đang chạy"

Khi có session đang chạy hoặc tạm dừng, Home SHALL hiển thị card trạng thái "Timer đang chạy" (tên giai đoạn hiện tại) với nút mở lại màn timer — giúp user biết timer vẫn chạy nền khi đã rời màn timer.

#### Scenario: Rời màn timer, quay lại Home
- **WHEN** timer đang chạy và user ở Home
- **THEN** Home hiển thị card "Timer đang chạy" + nút mở màn timer

### Requirement: Tooltip điều khiển trên màn Timer

Lần đầu vào màn timer (sau onboarding), hệ thống SHALL hiển thị tooltip compact giải thích Pause/Skip/Stop và **rời màn hình không dừng timer** (chạy nền + notification chuyển giai đoạn). Tooltip SHALL không gây tràn màn hình nhỏ (nội dung thu gọn, vòng progress co lại khi guide hiển thị).

#### Scenario: Lần đầu vào màn timer
- **WHEN** user bắt đầu session lần đầu (sau onboarding)
- **THEN** hiện tooltip điều khiển compact; mọi nút điều khiển + Stop vẫn hiển thị đầy đủ trên màn hình nhỏ

### Requirement: Guide line giải thích quyền hạn

Màn Settings SHALL hiển thị guide line giải thích khu vực Permissions: vì sao cần Notification (báo khi chuyển giai đoạn) và Background accuracy (chuyển đúng giờ khi khóa máy), và hướng dẫn "bấm row để mở cài đặt hệ thống".

#### Scenario: Lần đầu vào Settings
- **WHEN** user sau onboarding mở Settings lần đầu
- **THEN** hiện guide line giải thích quyền hạn kèm nút "Đã hiểu"/"Bỏ qua"

### Requirement: Key i18n đầy đủ

Toàn bộ chuỗi guide (`guide.*`, `home.running*`) SHALL có đủ key trong cả 12 ngôn ngữ (key-parity ép kiểu tại compile).

#### Scenario: Thiếu key guide
- **WHEN** thêm key guide mới vào tiếng Việt mà không thêm vào 11 file còn lại
- **THEN** build fail (key-parity)
