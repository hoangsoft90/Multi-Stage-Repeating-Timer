## 1. Favorites

- [x] 1.1 Model: `Preset.isFavorite?: boolean` (additive) + presets-store `setFavorite(id, fav)`
- [x] 1.2 ActionMenu: item Favorite/Unfavorite
- [x] 1.3 Home: section FAVORITES trước danh sách; rows chia favorites/templates/user

## 2. Preset chips

- [x] 2.1 Home: hàng chip ngang (tên + ▶), tap ▶ start, tap thân → Editor

## 3. Quick Routine

- [x] 3.1 `src/features/quick/quick-routine.ts`: `QUICK_SESSION_PRESET_ID = 'temp_quick_session'`
- [x] 3.2 Home: form Quick Routine (Work/Break/Repeat + Start) — start trực tiếp không qua Editor
- [x] 3.3 CompletionDialog: khi completion.presetId === temp_quick_session → nút "Lưu thành Preset" + dialog nhập tên + tạo preset
- [x] 3.4 Session log quick session: presetName "Quick Routine"

## 4. Start guard + streak

- [x] 4.1 `startWithOverwriteGuard(preset)` dùng chung (Home/chips/quick/deep-link) — confirm khi active session
- [x] 4.2 Test streak preset-agnostic (2 session temp liên tiếp → streak 2)
- [x] 4.3 Comment trong stats.ts: streak không filter theo presetId

## 5. i18n

- [x] 5.1 Keys `quick.*` + `home.favorites` + `home.chips` + `common.favorite/unfavorite` — 12 ngôn ngữ

## 6. Kiểm tra

- [x] 6.1 Unit test quick-routine (build preset temp, save-as)
- [x] 6.2 Test Home: favorites section + chips + quick form
- [x] 6.3 `npx tsc --noEmit` sạch
- [x] 6.4 `npx jest` xanh
