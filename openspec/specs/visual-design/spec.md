# visual-design Specification

## Purpose

Capability `visual-design` định nghĩa hệ thống thiết kế (design tokens, stage colors, typography, spacing/radius/elevation, gradient), các component trình bày chung (ProgressRing, GradientButton, SegmentedControl, Stepper, StagePill, AppCard, Chip, IconButton), và quy tắc áp dụng trên các màn hình. Change này CHỈ đổi lớp trình bày — mọi hành vi observable đã có (luồng Start/Stop/confirm, sacred timer screen, validation, storage) KHÔNG thay đổi.

## Requirements

### Requirement: Design tokens
App SHALL có bộ tokens: `background`, `surface`, `surfaceElevated`, `border`, `text`, `textSecondary`, `overlay`, `danger` cho cả dark và light; `brandGradient` (đỏ cam → vàng cam) cho CTA chính; `secondaryGradient` (cyan → blue) cho CTA phụ. Nền tối dark-first (`#0B0F14`), light theme đầy đủ khi hệ thống dùng light.

#### Scenario: Dark mode mặc định
- **WHEN** hệ thống ở dark mode
- **THEN** app dùng nền `#0B0F14`, surface `#151B22`, text `#F5F7FA`

#### Scenario: Light mode
- **WHEN** hệ thống ở light mode
- **THEN** app dùng nền `#F6F7F9`, surface `#FFFFFF`, text `#0F1419` và vẫn giữ đủ contrast

### Requirement: Stage colors
Mỗi stage SHALL được gán màu accent theo heuristic tên stage: `work` (work/focus/hiit/sprint) đỏ cam, `break` (break/rest) xanh lá, `focus` (focus/deep) tím, `cooldown` (cooldown/cool/stretch) xanh dương, không khớp → amber `default`. Màu có bản dark/light + gradient. Tên stage SHALL luôn hiển thị kèm màu (không phụ thuộc màu duy nhất).

#### Scenario: Stage WORK
- **WHEN** preset có stage tên "WORK"
- **THEN** màu accent của stage là đỏ cam (`#FF4D2E` dark / `#E23D12` light)

#### Scenario: Stage tên lạ
- **WHEN** stage có tên không khớp keyword nào (vd "STRETCH-LEGS")
- **THEN** màu accent là amber default (`#F59E0B`) — không lỗi

### Requirement: ProgressRing màn Timer
Màn Timer SHALL hiển thị tiến trình stage dưới dạng vòng tròn (SVG) với stroke gradient theo màu stage hiện tại, đếm ngược liên tục, và nền màn hình có tint nhẹ theo màu stage đổi mượt khi chuyển stage. Countdown SHALL là chữ số lớn tabular-nums. Khi remaining < 10 giây, vòng + chữ SHALL pulse nhẹ.

#### Scenario: Đổi stage đổi màu
- **WHEN** stage chuyển từ WORK sang BREAK
- **THEN** màu stroke vòng tròn + tint nền chuyển từ đỏ cam sang xanh lá (crossfade, không nháy đột ngột)

### Requirement: CTA gradient
Nút hành động chính (Start timer trên Editor, Start trên Home, Resume trên RecoveryDialog) SHALL dùng gradient brand, nổi bật nhất màn hình. Nút phụ dùng surface/secondary. Nút icon SHALL có `accessibilityLabel` và kích thước chạm ≥ 44px.

#### Scenario: Start timer nổi bật
- **WHEN** user mở Editor với preset hợp lệ
- **THEN** nút "▶ Start timer" là nút gradient brand toàn chiều rộng, nổi bật hơn nút Lưu

### Requirement: Icon nhất quán
Emoji trong UI (⚙️ ▶ ⏸ ⏭ ■ 💾 🗑 ✕ …) SHALL được thay bằng icon vector nhất quán (Ionicons), GIỮ text label kèm theo để không đổi hành vi/test hiện có.

#### Scenario: Nút settings có icon
- **WHEN** user nhìn header Home
- **THEN** nút Settings hiển thị icon vector (không phải emoji) và có `accessibilityLabel`

### Requirement: Screens — presentation
Các màn Home/Editor/Timer/Settings giữ nguyên hành vi đã có (templates-first, sacred timer screen không ad, Start/Stop confirm qua confirmAsync, validation chặn lưu) và được áp dụng visual-design: card surface + shadow, section label uppercase, chip meta, chấm màu stage.

#### Scenario: Start vẫn confirm khi timer đang chạy
- **WHEN** timer đang chạy và user bấm Start preset khác
- **THEN** vẫn hiện xác nhận (confirmAsync) trước khi ngưng timer cũ — không đổi

### Requirement: Settings — presentation
Settings giữ nguyên toggles (sound, vibration, wake lock, theme) và About/Privacy/Rate, trình bày theo nhóm card với icon + Switch custom.

#### Scenario: Bật/tắt âm thanh
- **WHEN** user bật/tắt Switch "Âm thanh"
- **THEN** giá trị vẫn được lưu qua SettingsRepo và áp dụng ngay — chỉ thay đổi cách trình bày, không đổi hành vi
