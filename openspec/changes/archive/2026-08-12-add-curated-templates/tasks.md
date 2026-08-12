# Tasks: add-curated-templates

## 1. Data + helper thuần

- [x] 1.1 `CuratedTemplate` interface + `CURATED_TEMPLATES` (12 template, 4 category) + `toPreset(template)` — `src/core/curated-templates.ts`
- [x] 1.2 Unit test: id unique, category hợp lệ, stages hợp lệ (validatePreset), không trùng `BUILTIN_TEMPLATES`, toPreset tạo preset mới id mới

## 2. Screen /templates

- [x] 2.1 Route + Stack.Screen ("templates") — `_layout.tsx`
- [x] 2.2 Screen: category chips (Tất cả + 4) + card (emoji/name/description/StagePill preview/round) + nút Use this → save + alert + back — `src/app/templates.tsx`

## 3. Entry Home

- [x] 3.1 Icon "library-outline" trên header Home (accessibilityLabel) → push /templates — `src/app/index.tsx`

## 4. i18n

- [x] 4.1 Key `templates.*` đủ 12 ngôn ngữ (title, all, workout, focus, wellness, daily, useThis, added, rounds)

## 5. Kiểm tra JS

- [x] 5.1 `npx tsc --noEmit` sạch · `npx jest` xanh · `npx expo export --platform web` OK
