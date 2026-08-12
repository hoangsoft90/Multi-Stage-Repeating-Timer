# quick-start Specification

## Purpose
Capability `quick-start` định nghĩa các đường bắt đầu timer không qua Editor: Favorites, Preset chips, và Quick Routine — giảm time-to-first-timer, tăng activation và repeat usage.
## Requirements
### Requirement: Favorites
Preset SHALL có field `isFavorite` (additive, default false). User SHALL bật/tắt favorite từ ActionMenu (long-press). Home SHALL hiển thị section FAVORITES trước danh sách thường; tap Start trên card favorite = start ngay (kèm confirm nếu timer đang chạy).

#### Scenario: Favorite một preset
- **WHEN** user long-press preset HIIT và chọn Favorite
- **THEN** preset được đánh dấu favorite, xuất hiện trong section FAVORITES trên Home

#### Scenario: Bỏ favorite
- **WHEN** user chọn Bỏ yêu thích trên preset đang favorite
- **THEN** preset rời section FAVORITES, danh sách thường giữ nguyên

### Requirement: Preset chips
Home SHALL hiển thị hàng chip nhanh: mỗi chip gồm tên preset + nút ▶. Tap ▶ = start ngay; tap phần thân chip = mở Editor. Hàng chip hiển thị favorites + preset hay dùng nhất (theo lastUsedAt), scroll ngang.

#### Scenario: Start từ chip
- **WHEN** user tap ▶ trên chip "Pomodoro"
- **THEN** preset start ngay (kèm confirm nếu có session active) và điều hướng tới Timer

#### Scenario: Mở editor từ chip
- **WHEN** user tap phần thân chip Pomodoro
- **THEN** Editor mở với preset Pomodoro

### Requirement: Quick Routine
Home SHALL có form Quick Routine (Work [25m] / Break [5m] / Repeat [4] + Start) không qua Editor. Quick session SHALL dùng `presetId = temp_quick_session`, không tạo preset trong database. Sau khi hoàn thành, CompletionDialog SHALL thêm nút "Lưu thành Preset" (nhập tên → tạo preset mới xuất hiện trên Home); bỏ qua → session vẫn được log vào SessionLog (Stats).

#### Scenario: Quick routine hoàn thành
- **WHEN** user chạy Quick Routine (temp_quick_session) và hoàn thành
- **THEN** CompletionDialog hiển thị kèm nút Lưu thành Preset; bỏ qua → session có trong Stats

#### Scenario: Lưu thành preset
- **WHEN** user bấm Lưu thành Preset và nhập tên "Tabata 20/10"
- **THEN** preset mới được tạo từ session snapshot và xuất hiện trên Home

### Requirement: Streak preset-agnostic
Streak SHALL tính theo ngày có session completed bất kể presetId (kể cả `temp_quick_session`). Không filter theo preset khi tính streak.

#### Scenario: Quick session 2 ngày liên tiếp
- **WHEN** user chạy Quick Routine (temp id) hôm qua và hôm nay
- **THEN** streak = 2

