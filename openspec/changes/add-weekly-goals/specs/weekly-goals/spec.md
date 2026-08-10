## Purpose

Capability `weekly-goals` thêm mục tiêu số phiên/tuần (goal-based progress) — model + persist + progress thuần + UI Settings + hiển thị trong CompletionDialog. Local-first, không backend.

## ADDED Requirements

### Requirement: Model WeeklyGoal + repo

Hệ thống SHALL cung cấp model `WeeklyGoal { id, presetId?, targetSessions, weekStart, schemaVersion }` — `presetId` undefined nghĩa là áp dụng cho TẤT CẢ preset; `weekStart` là YYYY-MM-DD của Thứ 2 tuần goal được tạo/cập nhật. `WeeklyGoalRepo` SHALL persist vào AsyncStorage key `looptimer:weekly-goal`, hỗ trợ **single goal** (lưu goal mới thay thế goal cũ), safe-parse (dữ liệu cũ/hỏng → null, không crash).

#### Scenario: Lưu goal mới
- **WHEN** user lưu goal mới trong khi đã có goal cũ
- **THEN** goal cũ bị thay thế (chỉ tồn tại 1 goal)

### Requirement: Progress thuần theo tuần hiện tại

Hệ thống SHALL cung cấp helper thuần `currentWeekProgress(entries, goal, now)` — đếm các session có `status === 'completed'` với `endedAt` thuộc tuần hiện tại (tuần bắt đầu Thứ 2 — `mondayKey(now)`), và nếu `goal.presetId` được set thì chỉ đếm session của preset đó. Trả về `{ completed, target }`. Goal là **recurring hàng tuần**: progress luôn tính cho tuần hiện tại theo `now`, không cần reset thủ công.

#### Scenario: Đếm đúng tuần Thứ 2
- **WHEN** hôm nay là Thứ 5, user có 3 session completed từ Thứ 2–Thứ 4 và 2 session completed tuần trước
- **THEN** completed = 3 (không tính tuần trước)

#### Scenario: Lọc theo preset
- **WHEN** goal.presetId = 'p_hiit' nhưng user hoàn thành 2 session HIIT + 1 session khác trong tuần
- **THEN** completed = 2 (chỉ HIIT)

#### Scenario: Chỉ tính completed
- **WHEN** user stop thủ công 1 session trong tuần (status 'stopped')
- **THEN** session đó không được đếm vào progress

### Requirement: Settings UI tạo/sửa goal

Settings SHALL có section "MỤC TIÊU HÀNG TUẦN": chọn `targetSessions` (3 / 5 / 7 / tùy chỉnh 1–99), chọn phạm vi (Tất cả routine / preset cụ thể qua ActionMenu), nút Lưu. Lưu thành công persist qua `WeeklyGoalRepo`. Khi chưa có goal → hiển thị trạng thái chưa đặt.

#### Scenario: Chọn preset cụ thể
- **WHEN** user chọn "preset cụ thể" và chọn HIIT từ danh sách
- **THEN** goal.presetId = 'p_hiit'

### Requirement: CompletionDialog hiển thị progress

Khi có goal (loaded), CompletionDialog sau một session hoàn thành SHALL hiển thị dòng "Mục tiêu tuần: {{done}}/{{target}} phiên" kèm thanh progress (completed/target), và text trạng thái (đã đạt / còn N phiên nữa). Không hiển thị khi không có goal.

#### Scenario: Chưa đạt
- **WHEN** goal 7 phiên/tuần, user vừa hoàn thành phiên thứ 5 trong tuần
- **THEN** dialog hiển thị "5/7" + "còn 2 phiên nữa"

#### Scenario: Đã đạt
- **WHEN** user vừa hoàn thành phiên thứ 7 trong tuần (goal 7)
- **THEN** dialog hiển thị trạng thái đã đạt mục tiêu

### Requirement: Thuần + test deterministic

Các helper (mondayKey, currentWeekProgress) SHALL là pure function, unit test deterministic (cùng entries + now → cùng kết quả, không Date.now, không phụ thuộc platform).

#### Scenario: Test deterministic
- **WHEN** gọi currentWeekProgress với cùng entries + goal + now
- **THEN** kết quả giống nhau mọi lần

### Requirement: i18n key-parity

Mọi string UI mới SHALL có đủ key trong cả 12 ngôn ngữ (goals.*).

#### Scenario: Thiếu key
- **WHEN** thêm key `goals.progress` vào tiếng Việt mà không thêm vào 11 file còn lại
- **THEN** build fail (key-parity ép kiểu tại compile)
