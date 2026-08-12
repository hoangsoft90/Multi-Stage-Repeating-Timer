# smart-routine-v2 Specification

## Purpose
Capability `smart-routine-v2` nâng cấp `suggestPresetForNow` (v1.2, gợi ý theo khung giờ chung) thành `suggestPresetForDayOfWeek` — học thói quen user theo NGÀY TRONG TUẦN (4 tuần gần nhất, cùng thứ). Độ chính xác cao hơn, fallback về model cũ khi không đủ tín hiệu.
## Requirements
### Requirement: Gợi ý theo ngày trong tuần
Hệ thống SHALL cung cấp hàm `suggestPresetForDayOfWeek(entries, presetIds, now, weeks=4)` — phân tích các session trong `weeks` tuần gần nhất, cùng ngày trong tuần (weekDay, 1=Mon..7=Sun), cùng khung giờ (hourBucket). Trả về presetId có nhiều session nhất trong cửa sổ (tie-break: lastUsedAt lớn nhất). Trả về null khi không có session nào trong cửa sổ (không đủ tín hiệu).

#### Scenario: Có thói quen Thứ 3
- **WHEN** hôm nay là Thứ 3, user có 4 session HIIT vào Thứ 3 trong 4 tuần qua, 0 session Deep Work
- **THEN** gợi ý HIIT

#### Scenario: Không có tín hiệu cùng thứ
- **WHEN** hôm nay là Thứ 3 nhưng không có session nào vào Thứ 3 trong 4 tuần qua
- **THEN** trả về null (Home fallback về model khung giờ)

#### Scenario: Không tính session khác thứ
- **WHEN** user có session HIIT vào Thứ 2 và Thứ 5, hôm nay là Thứ 3
- **THEN** không tính HIIT (khác thứ) → null

### Requirement: Fallback về model khung giờ
Khi `suggestPresetForDayOfWeek` trả về null, Home SHALL giữ nguyên hành vi v1.2: dùng `suggestPresetForNow` (khung giờ chung) — không mất card "Routine hôm nay" cho user mới.

#### Scenario: User mới
- **WHEN** user mới dùng app 2 ngày, chưa đủ 4 tuần cùng thứ
- **THEN** card vẫn hiển thị (fallback model khung giờ cũ)

### Requirement: Card hiển thị lý do (optional)
Khi gợi ý từ weekday model, Home card SHALL optionally hiển thị subtitle nhỏ "Thường tập Thứ 3" (dùng lại key `routine.dayMon..Sun` đã có 12 ngôn ngữ). Không bắt buộc — stretch task.

#### Scenario: Card weekday model
- **WHEN** gợi ý từ weekday model và subtitle được implement
- **THEN** card hiển thị thêm "Thường tập Thứ 3" dưới tên preset

### Requirement: Thuần + test deterministic
Hàm SHALL là pure function (không side effect, không phụ thuộc platform), unit test deterministic (giống suggestPresetForNow hiện tại).

#### Scenario: Test deterministic
- **WHEN** gọi với cùng entries + now
- **THEN** kết quả giống nhau mọi lần (no random, no Date.now)

