## Purpose

Capability `session-notes` cho phép user ghi lại cảm nhận (mood + ghi chú tùy chọn) sau mỗi phiên hoàn thành, lưu vào `SessionLogEntry` (additive), hiển thị phân bố mood theo preset trong Stats. Không bắt buộc — mọi bước đều optional.

## ADDED Requirements

### Requirement: Model additive mood + note

`SessionLogEntry` SHALL có thêm field optional `mood?: 'happy' | 'neutral' | 'sad'` và `note?: string` — additive có default undefined, **không bump schemaVersion**, dữ liệu log cũ đọc được bình thường (entry thiếu field không crash).

#### Scenario: Đọc dữ liệu cũ
- **WHEN** load session log được ghi trước bản cập nhật
- **THEN** entry vẫn hợp lệ, `mood`/`note` undefined

### Requirement: Repo updateMoodNote

`SessionLogRepo` SHALL có method `updateMoodNote(id, mood?, note?)` — cập nhật (hoặc xóa field nếu truyền undefined) entry có `id` tương ứng, giữ nguyên giới hạn 500 entry. Không có entry khớp → no-op (không crash).

#### Scenario: Cập nhật entry
- **WHEN** gọi updateMoodNote(sessionId, 'happy', 'Tốt lắm')
- **THEN** entry đó có mood='happy' và note='Tốt lắm'

### Requirement: CompletionInfo.sessionId

`CompletionInfo` SHALL có thêm `sessionId` (additive) — set bằng id của session vừa hoàn thành, để CompletionDialog cập nhật đúng session log entry.

#### Scenario: Hoàn thành phiên
- **WHEN** session hoàn thành tự nhiên
- **THEN** completion.sessionId = ended.id (cùng id entry đã log)

### Requirement: CompletionDialog mood + note (optional)

CompletionDialog SHALL hiển thị (khi session completed): dòng mood picker [🙂][😐][😓] (chọn 1, có thể bỏ) + nút "Thêm ghi chú" mở text input (optional) + nút Lưu khi có mood/note. Lưu → `updateMoodNote(completion.sessionId, mood, note)`. "Done" vẫn dismiss — không lưu gì nếu user bỏ qua.

#### Scenario: Lưu mood
- **WHEN** user chọn 🙂 rồi bấm Lưu
- **THEN** entry session đó được cập nhật mood='happy'

#### Scenario: Bỏ qua
- **WHEN** user không chọn mood, không ghi note, bấm Done
- **THEN** entry không đổi, không lỗi

### Requirement: Stats phân bố mood theo preset

Hệ thống SHALL cung cấp helper thuần `moodSummaryByPreset(entries)` — nhóm theo `presetId`/`presetName`, trả về `{ presetId, presetName, total, happy, neutral, sad, noted }` cho các preset có ≥1 session có mood/note. Stats screen SHALL hiển thị phân bố này (ví dụ "HIIT · 8 sessions · 🙂 6 · 😐 1 · 😓 1") và mood icon trên từng phiên gần đây (nếu có).

#### Scenario: Phân bố mood
- **WHEN** preset HIIT có 8 session: 6 happy, 1 neutral, 1 sad
- **THEN** summary hiển thị "HIIT · 8 sessions · 🙂 6 · 😐 1 · 😓 1"

### Requirement: Thuần + test deterministic

`moodSummaryByPreset` SHALL là pure function, unit test deterministic (không Date.now, không platform).

#### Scenario: Test deterministic
- **WHEN** gọi với cùng entries
- **THEN** kết quả giống nhau mọi lần

### Requirement: i18n key-parity

Mọi string UI mới SHALL có đủ key trong cả 12 ngôn ngữ (notes.*, stats.mood).

#### Scenario: Thiếu key
- **WHEN** thêm key `notes.title` vào tiếng Việt mà không thêm vào 11 file còn lại
- **THEN** build fail (key-parity ép kiểu tại compile)
