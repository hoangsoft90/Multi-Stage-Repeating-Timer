# Tasks: fix-exact-alarm-prompt

> Trạng thái: toàn bộ task đã hoàn thành trong commit `94547f0` (đã push main — GH Actions run `31584761847` build APK đang chạy). Đánh dấu `[x]` ghi nhận thực trạng.

## 1. Helper dùng chung

- [x] 1.1 `openExactAlarmSettings()` trong `src/features/background/permissions.ts` — set cờ `exact-alarm-asked` sau khi launch thành công + Platform guard + log `permission_requested`
- [x] 1.2 `requestExactAlarmPermissionJustInTime()` delegate qua helper — guard "ask once" giữ nguyên

## 2. Settings row

- [x] 2.1 Row "Background accuracy" gọi `openExactAlarmSettings()` thay `IntentLauncher` trực tiếp — bỏ import thừa — `src/app/settings.tsx`

## 3. Kiểm tra

- [x] 3.1 `npx tsc --noEmit` sạch
- [x] 3.2 jest screens/v12-features/background pass (51 tests)
- [x] 3.3 Code review (flag semantics, error handling, platform gating) — không còn vấn đề
