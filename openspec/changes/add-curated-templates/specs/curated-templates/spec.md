## Purpose

Capability `curated-templates` thêm thư viện template được tuyển chọn (hard-code, không community) — 12 template, 4 category, screen `/templates` với preview + "Use this" tạo user preset thường (xóa/sửa được).

## ADDED Requirements

### Requirement: Dữ liệu curated templates

Hệ thống SHALL cung cấp dữ liệu hard-code ít nhất **10 template** (`CURATED_TEMPLATES`) thuộc **4 category**: `workout`, `focus`, `wellness`, `daily`. Mỗi template có `{ id (unique), name, category, description, emoji, stages (1–50, duration 1s–24h), repeatMode, fixedCount? }` — dữ liệu hợp lệ theo `validatePreset` (validation hiện có). Template library SHALL KHÔNG trùng id/name với 3 built-in templates hiện tại (`BUILTIN_TEMPLATES`).

#### Scenario: Dữ liệu hợp lệ
- **WHEN** duyệt toàn bộ CURATED_TEMPLATES
- **THEN** id unique, category ∈ 4 loại, stages hợp lệ, không trùng built-in

### Requirement: Helper toPreset (thuần)

Hệ thống SHALL cung cấp `toPreset(template)` — trả về `Preset` mới với id preset mới (createPresetId) và stage id mới (createStageId), tên = template.name, repeatMode/fixedCount từ template. Deterministic ngoài phần id ngẫu nhiên (không side effect).

#### Scenario: Use this
- **WHEN** user chọn "Use this" trên template Tabata
- **THEN** preset mới được tạo với stages tương ứng, xóa được (user preset thường)

### Requirement: Screen /templates

Hệ thống SHALL có screen `/templates` (Stack): header title + category chips (Tất cả + 4 category) lọc danh sách + card mỗi template: emoji + name + description + preview stages (tên + duration) + round info + nút **Use this**. Use this → tạo + lưu preset qua presets store → thông báo thành công → quay lại Home (preset xuất hiện trong danh sách).

#### Scenario: Lọc category
- **WHEN** user chọn chip "Workout"
- **THEN** chỉ hiển thị template category workout

#### Scenario: Tạo từ template
- **WHEN** user bấm Use this trên template Meditation
- **THEN** preset "Meditation" xuất hiện trên Home, mở Editor được, xóa được

### Requirement: Entry từ Home

Home SHALL có entry mở screen `/templates` (icon header, cạnh nút Thống kê — có accessibilityLabel).

#### Scenario: Mở thư viện
- **WHEN** user tap icon template trên Home header
- **THEN** navigate tới /templates

### Requirement: i18n key-parity

Category labels + UI labels (templates.*) SHALL có đủ key trong cả 12 ngôn ngữ. `name`/`description` template giữ English trong data (precedent 3 built-in).

#### Scenario: Thiếu key
- **WHEN** thêm key `templates.workout` vào tiếng Việt mà không thêm vào 11 file còn lại
- **THEN** build fail (key-parity ép kiểu tại compile)

### Requirement: Thuần + test

`toPreset` + dữ liệu SHALL có unit test: unique id, category hợp lệ, stages hợp lệ, không trùng built-in, toPreset tạo preset dùng được (validatePreset pass).

#### Scenario: Test dữ liệu
- **WHEN** chạy test data
- **THEN** toàn bộ template vượt validatePreset
