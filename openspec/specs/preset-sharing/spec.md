# preset-sharing Specification

## Purpose
Capability `preset-sharing` định nghĩa khả năng chia sẻ preset ra ngoài (share sheet / clipboard) và import preset từ JSON (deep-link hoặc paste). Preset được mã hóa thành chuỗi JSON versioned, validate trước khi lưu — không bao giờ crash khi gặp dữ liệu xấu.
## Requirements
### Requirement: Mã hóa preset thành JSON
Hệ thống SHALL mã hóa preset thành chuỗi JSON versioned có cấu trúc rõ ràng: `{ type: 'looptimer-preset', version: 1, preset: { name, stages, repeatMode, fixedCount } }` — KHÔNG bao gồm `id`/stage-id (id mới được sinh khi import để tránh trùng).

#### Scenario: Encode preset
- **WHEN** user chọn Share trên preset HIIT 40/20
- **THEN** hệ thống tạo chuỗi JSON chứa đầy đủ tên, stages, repeatMode, fixedCount của preset

### Requirement: Share preset
ActionMenu (long-press) của mỗi preset SHALL có item "Share preset" mở share sheet (native) hoặc fallback copy clipboard (web). Nội dung chia sẻ là chuỗi JSON mã hóa preset.

#### Scenario: Share preset
- **WHEN** user long-press preset và chọn Share preset
- **THEN** hệ thống mở share sheet với JSON mã hóa preset

### Requirement: Import từ JSON an toàn
Hệ thống SHALL import preset từ chuỗi JSON: parse an toàn (dữ liệu sai → null, không crash), validate bằng `validatePreset` (duration 1s–24h, 1–50 stage, fixedCount ≥ 1, tên ≤ 50), sinh id/stage-id mới khi lưu. Preset hợp lệ SHALL được lưu vào PresetRepo và xuất hiện trên Home.

#### Scenario: Import preset hợp lệ
- **WHEN** user import JSON hợp lệ của preset HIIT
- **THEN** preset HIIT được lưu và xuất hiện trên Home

#### Scenario: Import JSON sai
- **WHEN** user import chuỗi JSON không phải định dạng preset (hoặc preset không hợp lệ)
- **THEN** hệ thống không lưu, không crash, hiện thông báo lỗi

### Requirement: Import qua deep-link
Deep-link `looptimer:///?import=<encoded>` (web: `?import=<encoded>`) SHALL import preset tương ứng khi app mở. Nếu import thành công SHALL hiện thông báo; nếu sai SHALL hiện thông báo lỗi mà không crash.

#### Scenario: Deep-link import
- **WHEN** app mở với URL chứa `?import=<encoded hợp lệ>`
- **THEN** preset được import và user thấy thông báo thành công

### Requirement: Import qua dialog paste
Home SHALL có nút "Import preset" mở dialog với TextInput để paste JSON. Bấm Import SHALL xử lý giống deep-link (validate + lưu + thông báo).

#### Scenario: Paste JSON
- **WHEN** user mở dialog Import, paste JSON hợp lệ và bấm Import
- **THEN** preset được lưu và dialog đóng kèm thông báo thành công

