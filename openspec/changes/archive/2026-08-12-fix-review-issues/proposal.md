# Proposal: fix-review-issues — Sửa 3 bug phát hiện khi review toàn bộ code

## Why

Sau đợt review toàn bộ codebase (core engine, stores, screens, components, platform), phát hiện 3 bug thật + 1 bất nhất ảnh hưởng trải nghiệm:

1. **Setting "themeMode" là setting chết**: `settings.tsx` ghi `themeMode` vào store, nhưng `useTheme()` chỉ đọc OS color scheme → bật Dark/Light trong Settings không đổi gì. Tệ hơn, `timer.tsx` và `preset/[id].tsx` gọi `useColorScheme()` trực tiếp nên dù fix `useTheme` vẫn bỏ qua theme override.
2. **Routine editor không dùng được cho user mới**: preset picker chỉ liệt kê preset user tự tạo → user chưa tạo preset nào không thể tạo routine (menu rỗng). `schedulePresetName()` còn fallback về raw `presetId` (vd `temp_quick_session`) trong notification.
3. **Timer screen "kẹt" sau khi hoàn thành**: sau khi đóng completion dialog, session vẫn ở trạng thái `completed` → màn timer hiện 00:00 chết, chỉ thoát được bằng nút X.

## What Changes

- **Áp dụng themeMode toàn app** (`src/hooks/use-theme.ts`, `src/app/_layout.tsx`, `src/app/settings.tsx`, `src/app/timer.tsx`, `src/app/preset/[id].tsx`):
  - `useTheme()` đọc `themeMode` từ settings store; thêm hook **`useIsDark()`** (dark-flag theo đúng setting) cho các màn tự chọn màu stage accent.
  - `ThemeProvider` (header navigation) tôn trọng `themeMode`.
  - Settings: bỏ switch "System theme" chết → **SegmentedControl 3 lựa chọn System / Light / Dark** (đầy đủ cả giá trị `'dark'` chưa từng chọn được).
  - `timer.tsx` + `preset/[id].tsx` chuyển sang `useIsDark()` thay vì `useColorScheme()` raw.
  - i18n: `settings.systemTheme` → `settings.theme` + `settings.themeSystem/themeLight/themeDark`, đủ **12 ngôn ngữ**.
- **Routine editor liệt kê built-in templates** (`src/app/routine/[id].tsx`, `src/features/routine/routine-store.ts`):
  - Preset picker merge `BUILTIN_TEMPLATES` + preset user (built-in trước, dedup theo id) → user mới chọn template ngay được.
  - `schedulePresetName()` resolve tên built-in template (không còn leak raw id vào notification).
- **Timer redirect sau khi completed** (`src/app/timer.tsx`): status `'completed'` cũng `router.replace('/')` — dialog hoàn thành render toàn cục ở root layout nên vẫn hiện đúng, màn timer không kẹt 00:00.
- **Test infra** (`jest-setup.js`): mock AsyncStorage toàn cục — `use-theme` giờ chạm tới `settings-store → repos → AsyncStorage`, mọi component test render themed component cần mock này (thay vì duplicate trong từng file).

## Capabilities

### New Capabilities

- `applied-theme-setting`: theme override (System/Light/Dark) được áp dụng nhất quán toàn app — colors, navigation header, stage accents.
- `routine-editor-templates`: routine editor chọn được built-in template; tên built-in hiển thị đúng trong notification.
- `timer-completed-redirect`: sau khi session hoàn thành, màn timer tự điều hướng về Home (không kẹt 00:00).

### Modified Capabilities

- Không đổi requirement spec cũ.

## Impact

- Sửa: `src/hooks/use-theme.ts`, `src/app/_layout.tsx`, `src/app/settings.tsx`, `src/app/timer.tsx`, `src/app/preset/[id].tsx`, `src/app/routine/[id].tsx`, `src/features/routine/routine-store.ts`, `jest-setup.js`, i18n ×12.
- Test: `src/app/__tests__/v12-features.test.tsx` (switch count 5→4 vì System theme không còn là switch).
- Không đổi model/engine/storage schema. `themeMode` vốn đã có trong `Settings` — chỉ là giờ được consume.
