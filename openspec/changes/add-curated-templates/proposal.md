# Proposal: add-curated-templates — Curated Template Library

## Why

App mới chỉ có 3 template built-in — user mới không biết bắt đầu từ đâu, danh mục quá nghèo cho các use case phổ biến (workout/focus/wellness/daily). Plan v1.5 (§4.3): **curated** (hard-code, không community) template library với phân loại + preview + "Use this" → tạo user preset.

## What Changes

- **Data hard-code mới** `src/core/curated-templates.ts`: **12 template**, 4 category (`workout`/`focus`/`wellness`/`daily`), mỗi template có `name`, `description`, `emoji`, `stages`, `repeatMode`, `fixedCount?` + helper thuần `toPreset(template)` → tạo `Preset` mới (id/stage id mới, không đụng 3 built-in).
- **Route mới `/templates`** (Stack): header + category chips (Tất cả + 4) + danh sách card: emoji + name + description + preview stages + số round + nút **[Use this]** → `usePresetsStore.save(toPreset(...))` → alert + về Home.
- **Entry từ Home**: icon "library-outline" trên header (cạnh nút Thống kê).
- **Template từ library là user preset thường** (xóa/sửa được — KHÁC 3 built-in bất biến).
- **i18n ×12**: category labels + UI labels (templates.*); name/description giữ English trong data (precedent 3 built-in đang English).

## Capabilities

### New Capabilities

- `curated-templates`: dữ liệu template + screen library + "Use this" → user preset.

### Modified Capabilities

- Không đổi requirement spec cũ.

## Impact

- Mới `src/core/curated-templates.ts`, `src/app/templates.tsx`, `_layout.tsx` (Stack.Screen), `src/app/index.tsx` (header entry), i18n 12 file. Không đổi repos/model.
