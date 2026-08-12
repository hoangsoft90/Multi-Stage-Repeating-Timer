## Purpose

Capability `applied-theme-setting` chuẩn hóa việc áp dụng cài đặt giao diện (themeMode: `system` | `light` | `dark`) trên toàn bộ app — không chỉ lưu được mà còn thay đổi màu sắc thực tế ở mọi màn hình, kể cả màn tự chọn màu accent theo scheme.

## ADDED Requirements

### Requirement: useTheme tôn trọng themeMode

Hook `useTheme` SHALL trả về bảng màu theo thứ tự ưu tiên: themeMode được user chọn (`light`/`dark`) thắng; `system` theo OS color scheme. Thay đổi themeMode trong Settings SHALL cập nhật màu toàn app ngay lập tức (không cần restart).

#### Scenario: Ép Dark khi hệ thống Light
- **WHEN** user chọn "Dark" trong Settings trên máy đang ở chế độ Light
- **THEN** toàn bộ màu nền/chữ của app chuyển sang dark ngay lập tức

#### Scenario: Chọn System
- **WHEN** user chọn "System"
- **THEN** app theo OS color scheme (dark/light theo máy)

### Requirement: Header navigation tôn trọng themeMode

`ThemeProvider` (navigation header) SHALL dùng dark/light theo themeMode đã chọn, nhất quán với nội dung màn hình.

#### Scenario: Ép Dark và header
- **WHEN** user chọn Dark và vào màn có header navigation
- **THEN** header hiển thị theme dark

### Requirement: Màn tự chọn màu accent dùng effective dark

Màn hình tự chọn màu theo scheme (timer screen, preset editor — stage accent) SHALL dùng dark-flag theo themeMode (hook `useIsDark`), KHÔNG gọi `useColorScheme()` raw, để theme override áp dụng ở mọi nơi.

#### Scenario: Ép Dark trên màn Timer
- **WHEN** user chọn Dark (hệ thống Light) rồi mở màn timer
- **THEN** stage accent/dot màu dùng bảng dark

### Requirement: Settings cung cấp đủ 3 lựa chọn theme

Màn Settings SHALL cho chọn cả 3 giá trị `system` / `light` / `dark` (segmented control) — không còn giới hạn 2 giá trị như switch cũ (giá trị `dark` chưa từng chọn được).

#### Scenario: Chọn Dark trong Settings
- **WHEN** user bấm segment "Dark" trong mục Theme
- **THEN** `themeMode` lưu = `'dark'` và giao diện đổi ngay

### Requirement: i18n parity cho key theme

Các key `settings.theme`, `settings.themeSystem`, `settings.themeLight`, `settings.themeDark` SHALL tồn tại ở đủ 12 ngôn ngữ (key-parity ép kiểu compile).

#### Scenario: Đổi ngôn ngữ sang bất kỳ ngôn ngữ nào
- **WHEN** user đổi ngôn ngữ sang một trong 12 ngôn ngữ được hỗ trợ
- **THEN** mục Theme hiển thị nhãn System/Light/Dark đúng ngôn ngữ đó, không fallback về tiếng Anh hoặc thiếu text
