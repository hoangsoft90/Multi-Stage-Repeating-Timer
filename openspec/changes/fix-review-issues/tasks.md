# Tasks: fix-review-issues

## Task Group 1: Áp dụng themeMode toàn app

- [x] `use-theme.ts`: `useTheme()` đọc `themeMode` từ settings store; thêm `useIsDark()`
- [x] `_layout.tsx`: `ThemeProvider` dùng `effectiveDark` theo themeMode
- [x] `settings.tsx`: thay switch "System theme" bằng SegmentedControl System/Light/Dark (+ block label)
- [x] `timer.tsx` + `preset/[id].tsx`: chuyển `useColorScheme()` → `useIsDark()`
- [x] i18n ×12: `settings.systemTheme` → `settings.theme` + `themeSystem/themeLight/themeDark`

## Task Group 2: Routine editor built-in templates

- [x] `routine/[id].tsx`: merge `BUILTIN_TEMPLATES` + presets (dedup, built-in trước), default selection, menu items
- [x] `routine-store.ts`: `schedulePresetName()` resolve built-in template name

## Task Group 3: Timer redirect sau completed

- [x] `timer.tsx`: thêm `'completed'` vào điều kiện `router.replace('/')`

## Task Group 4: Test infra

- [x] `jest-setup.js`: mock AsyncStorage toàn cục
- [x] `v12-features.test.tsx`: switch count 5 → 4

## Task Group 5: Validate

- [x] `npx tsc --noEmit` sạch
- [x] `npm test` — 29 suites / 287 tests pass

## Ghi chú

- Shipped trong commit `e74911c` (push kèm commit openspec `1c7f5f8`).
- Build APK mới: GH Actions run `31573355542`.
