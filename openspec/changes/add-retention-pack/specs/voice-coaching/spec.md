## Purpose

Capability `voice-coaching` định nghĩa tính năng đọc voice khi chuyển stage: đọc tên stage mới, cảnh báo 30s/10s trước khi hết stage, và thông báo khi hoàn thành routine — bằng giọng nói theo ngôn ngữ UI hiện tại. Voice coaching giúp user dùng timer mà không cần nhìn màn hình (hands-free), là tính năng giữ chân hàng đầu của các app interval timer.

## ADDED Requirements

### Requirement: Đọc tên stage khi bắt đầu
Khi stage mới bắt đầu (StageStarted) và toggle Voice bật, hệ thống SHALL phát voice đọc tên stage hiện tại. Nếu toggle Voice tắt, hệ thống SHALL không phát voice nhưng các feedback khác (sound/haptic) vẫn hoạt động theo cài đặt riêng.

#### Scenario: Stage mới bắt đầu
- **WHEN** session đang RUNNING chuyển sang stage WORK và toggle Voice bật
- **THEN** hệ thống phát voice "WORK" (hoặc tên stage theo ngôn ngữ hiện tại nếu có bản dịch)

#### Scenario: Tắt voice
- **WHEN** user tắt toggle Voice và timer chuyển stage
- **THEN** không phát voice nào nhưng sound/haptic vẫn theo cài đặt riêng

### Requirement: Cảnh báo 30s / 10s bằng voice
Khi remaining của stage hiện tại vượt ngưỡng 30s và 10s (mỗi stage đúng một lần mỗi ngưỡng), hệ thống SHALL phát voice cảnh báo tương ứng theo ngôn ngữ hiện tại (nếu toggle Voice bật).

#### Scenario: Còn 30 giây
- **WHEN** remaining vừa vượt ngưỡng 30s (từ >30s xuống ≤30s) và toggle Voice bật
- **THEN** hệ thống phát voice "30 giây" (theo locale)

#### Scenario: Còn 10 giây
- **WHEN** remaining vừa vượt ngưỡng 10s và toggle Voice bật
- **THEN** hệ thống phát voice "10 giây" (theo locale)

#### Scenario: Không lặp lại cảnh báo
- **WHEN** cùng một ngưỡng (vd 30s) đã được phát cho stage này
- **THEN** hệ thống không phát lại cho cùng ngưỡng đó (mỗi stage 1 lần/ngưỡng)

### Requirement: Thông báo hoàn thành bằng voice
Khi session hoàn thành (SessionCompleted) và toggle Voice bật, hệ thống SHALL phát voice thông báo hoàn thành theo ngôn ngữ hiện tại.

#### Scenario: Hoàn thành routine
- **WHEN** session emit SessionCompleted và toggle Voice bật
- **THEN** hệ thống phát voice "Routine hoàn thành" (theo locale)

### Requirement: Voice theo ngôn ngữ UI
Voice SHALL được phát bằng ngôn ngữ UI hiện tại (i18n.language). Nếu ngôn ngữ không được speech engine hỗ trợ, hệ thống SHALL fallback sang giọng nói hệ thống mặc định — không crash.

#### Scenario: Đổi ngôn ngữ
- **WHEN** user đổi ngôn ngữ UI sang tiếng Nhật và timer chuyển stage
- **THEN** voice phát bằng tiếng Nhật (hoặc fallback giọng hệ thống nếu không hỗ trợ)

### Requirement: Voice không chặn timer
Mọi lỗi phát voice (speech engine không khả dụng, giọng nói lỗi) SHALL được nuốt và không làm crash/chậm timer.

#### Scenario: Speech engine không khả dụng
- **WHEN** platform không có speech engine (vd web cũ) và timer chuyển stage
- **THEN** timer vẫn chạy bình thường, không phát voice, không crash

### Requirement: Toggle Voice trong Settings
Settings SHALL hiển thị toggle Voice (bật/tắt voice coaching), giá trị mặc định SHALL là bật, thay đổi SHALL persist qua SettingsRepo và áp dụng cho transition kế tiếp (không áp dụng retroactively).

#### Scenario: Bật/tắt Voice
- **WHEN** user tắt toggle Voice trong Settings rồi thoát app và mở lại
- **THEN** cài đặt Voice tắt vẫn được giữ nguyên
