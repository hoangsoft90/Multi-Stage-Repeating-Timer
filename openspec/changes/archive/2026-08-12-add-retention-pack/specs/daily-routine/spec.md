## Purpose

Capability `daily-routine` định nghĩa tính năng "Routine hôm nay": gợi ý preset mà user hay dùng nhất vào khung giờ hiện tại trong ngày, dựa trên lịch sử phiên local (SessionLog). Mục tiêu giảm quyết định ("mở app → bấm Start ngay") và xây thói quen dùng hàng ngày — một driver retention chính.

## ADDED Requirements

### Requirement: Gợi ý preset theo khung giờ
Hệ thống SHALL tính gợi ý "Routine hôm nay" từ lịch sử phiên: chia 7 ngày gần nhất thành 4 khung giờ theo `hourBucket` (đêm: ≥21h và <5h, sáng: 5–11h, chiều: 12–16h, tối: 17–20h), đếm số phiên theo preset trong khung giờ hiện tại, và chọn preset có số phiên nhiều nhất (tie → preset có lastUsedAt gần nhất). Nếu không có phiên nào trong khung giờ hiện tại trong 7 ngày, hệ thống SHALL không đưa ra gợi ý.

#### Scenario: Có thói quen sáng
- **WHEN** trong 7 ngày gần nhất user hay chạy HIIT 40/20 vào buổi sáng (8h) và hiện tại là 9h sáng
- **THEN** hệ thống gợi ý preset HIIT 40/20

#### Scenario: Chưa có thói quen khung giờ
- **WHEN** user chưa từng chạy timer vào khung giờ hiện tại trong 7 ngày
- **THEN** hệ thống không đưa ra gợi ý (không hiện card)

### Requirement: Card "Routine hôm nay" trên Home
Home SHALL hiển thị card "Routine hôm nay" nổi bật (trên danh sách templates) khi có gợi ý: tên preset + meta (số stage, repeat mode) + nút Start (gradient). Chạm vào card SHALL không mở Editor — chỉ nút Start bắt đầu chạy (giảm friction). Card SHALL không hiển thị khi không có gợi ý.

#### Scenario: Hiện card gợi ý
- **WHEN** có gợi ý preset cho khung giờ hiện tại và user ở Home
- **THEN** Home hiển thị card "Routine hôm nay" với tên preset + nút Start gradient

#### Scenario: Start từ card
- **WHEN** user bấm Start trên card Routine hôm nay
- **THEN** preset được start như bấm Start trên card preset thường (kèm confirm nếu timer đang chạy)

#### Scenario: Không hiện card khi không có gợi ý
- **WHEN** không có gợi ý (chưa có thói quen khung giờ) và user ở Home
- **THEN** Home không hiển thị card Routine hôm nay

### Requirement: Tính toán thuần và test được
Việc tính gợi ý SHALL là hàm thuần (`suggestPresetForNow`) nhận `entries: SessionLogEntry[]`, `presetIds: string[]`, `now: number` (không cần toàn bộ object preset — chỉ cần danh sách id được phép) — test được với dữ liệu giả, không phụ thuộc platform.

#### Scenario: Deterministic
- **WHEN** gọi hàm với cùng entries/presets/now
- **THEN** kết quả gợi ý giống hệt nhau giữa các lần gọi
