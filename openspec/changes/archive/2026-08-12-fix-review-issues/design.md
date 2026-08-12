# Design: fix-review-issues

## Context

3 bug phát hiện khi review toàn bộ codebase, tất cả do code "lưu setting nhưng không consume" hoặc "bỏ sót nhánh dữ liệu":

| Bug | Gốc rễ | Hướng fix |
|---|---|---|
| themeMode chết | `useTheme()` chỉ đọc OS scheme; `timer.tsx`/`preset/[id].tsx` gọi `useColorScheme()` raw | `useTheme` + hook mới `useIsDark()` đọc `themeMode` từ settings store; `ThemeProvider` tôn trọng `themeMode`; 2 màn accent dùng `useIsDark` |
| Routine editor trống | picker chỉ map `presets` (user-created) | merge `BUILTIN_TEMPLATES` + presets (dedup theo id); `schedulePresetName` thêm lookup built-in |
| Timer kẹt 00:00 | status `completed` không được redirect | thêm `'completed'` vào điều kiện redirect của `timer.tsx` |

## Key Decisions

### 1. `useIsDark()` tách riêng khỏi `useTheme()`
Các màn (timer, preset editor) cần boolean dark để chọn màu stage accent (`stageAccent(name, isDark)`, `StagePill isDark`) chứ không cần cả bảng màu. Hook riêng `useIsDark(): boolean` trả về dark-flag theo themeMode → dùng được ở cả 2 màn mà không phải refactor sang toàn bộ bảng màu. `useTheme()` được viết lại trên `useIsDark()` (1 nguồn logic).

- **Chọn zustand selector primitive** `(s) => s.settings.themeMode` → re-render chỉ xảy ra khi giá trị đổi (Object.is), không loop.

### 2. SegmentedControl 3 lựa chọn thay cho switch
Switch cũ chỉ cho 2 trạng thái (system/light) và vô dụng. Dùng `SegmentedControl` có sẵn (đang dùng cho repeat mode) — tận dụng component, đủ 3 giá trị. Bố cục: label + icon riêng (tái dùng `styles.iconWrap`/`rowLabel`) đặt phía trên segmented control full-width — tránh overflow khi control slot hẹp trong `Row`.

### 3. Merge built-in + preset trong routine editor
`allPresets = [...BUILTIN_TEMPLATES, ...presets]` lọc dedup theo id (built-in trước). Built-in luôn tồn tại → user mới luôn có lựa chọn. `useMemo` theo `presets` tránh tạo mảng mới mỗi render (effect phụ thuộc `allPresets`).

### 4. Redirect `completed` — dialog không phụ thuộc màn
CompletionDialog + RecoveryDialog render **toàn cục** ở root layout (`_layout.tsx`), đọc state từ store — không gắn với screen nào. Nên redirect màn timer khi `completed` là an toàn: dialog vẫn hiện phía trên Home. Không đụng `dismissCompletion` (engine không có lệnh clear cho trạng thái terminal).

### 5. AsyncStorage mock toàn cục trong jest-setup
`use-theme` → `settings-store` → `repos` → AsyncStorage khiến mọi component test render themed component cần mock. Mock toàn cục trong `jest-setup.js` (chuẩn `async-storage-mock`) thay vì duplicate trong từng file; per-file `jest.mock` vẫn override được (cùng module, không xung đột).

## Alternatives Considered

- **`dismissCompletion` reset session**: bị loại — `engine.stop()` là no-op với trạng thái `completed`, cần thêm lệnh mới vào engine; redirect đơn giản hơn và an toàn.
- **`useTheme()` chỉ trả bảng màu, màn accent tự suy**: gây lệch 2 nguồn logic — bị loại, chọn `useIsDark` 1 nguồn.
- **Giữ switch và thêm option**: switch không phù hợp 3 giá trị — bị loại.

## Risks

- **Re-render toàn app khi đổi theme**: chấp nhận (primitive selector, chỉ đổi khi themeMode đổi) — đây chính là hành vi mong muốn.
- **Test switch count 5→4**: `v12-features.test.tsx` cập nhật kèm — System theme không còn là switch.
- **Mock AsyncStorage toàn cục có thể che lỗi thiếu mock**: chấp nhận — là chuẩn jest cho RN AsyncStorage.
