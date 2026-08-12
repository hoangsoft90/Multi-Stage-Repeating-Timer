## 1. Helper thuần

- [x] 1.1 `suggestPresetForDayOfWeek(entries, presetIds, now, weeks=4)` — lọc session cùng weekDay(now) + cùng hourBucket + trong weeks, count preset, tie-break lastUsedAt; null khi 0 session (`src/features/stats/stats.ts`)
- [x] 1.2 Unit test: 4 tuần cùng thứ → đúng preset; khác thứ → không tính; 1 session → chọn; null khi không có session; tie-break lastUsedAt (`src/features/stats/__tests__/routine.test.ts`)

## 2. Home card v2

- [x] 2.1 Home: ưu tiên weekday model → null → fallback khung giờ cũ (`index.tsx` `refreshSuggestion` = `suggestPresetForDayOfWeek(...) ?? suggestPresetForNow(...)`)
- [x] 2.2 Card subtitle: hiển thị ngày trong tuần khi dùng weekday model — key mới `home.routineDayReason` (`{{day}}` + `routine.dayMon..Sun` đã có)

## 3. i18n

- [x] 3.1 Key `home.routineDayReason` đã thêm đủ 12 ngôn ngữ (key-parity ép kiểu, tsc pass)

## 4. Kiểm tra

- [x] 4.1 `npx tsc --noEmit` sạch
- [x] 4.2 `npx jest` xanh — 219 tests (25 suites), gồm test mới weekday model
- [x] 4.3 `npx expo export --platform web` OK
