# Tasks: add-weekly-goals

## 1. Model + storage

- [x] 1.1 `WeeklyGoal` interface + `WeeklyGoalRepo` (load/save/clear, single goal, safe-parse, key `looptimer:weekly-goal`) — `src/core/storage/repos.ts`
- [x] 1.2 Unit test repo (save thay thế goal cũ, load null khi chưa có, dữ liệu hỏng → null)

## 2. Pure helpers

- [x] 2.1 `mondayKey(ts)` + `weekKey(ts)` + `currentWeekProgress(entries, goal, now)` — `src/features/goals/weekly-goals.ts`
- [x] 2.2 Unit test: đúng tuần Thứ 2 (không tính tuần trước), lọc presetId, chỉ tính completed, deterministic, target clamp

## 3. Store

- [x] 3.1 `useGoalsStore` (Zustand): goal/loaded/load/saveGoal/clearGoal — `src/features/goals/goals-store.ts`
- [x] 3.2 Load sớm ở `_layout.tsx` (mirror effect `useRoutineStore.load`)

## 4. Settings UI

- [x] 4.1 Section "MỤC TIÊU HÀNG TUẦN": chips 3/5/7/tùy chỉnh (1–99) + row phạm vi (Tất cả / preset cụ thể qua ActionMenu) + nút Lưu — `src/app/settings.tsx`
- [x] 4.2 Hiển thị goal hiện tại + trạng thái chưa đặt

## 5. CompletionDialog progress

- [x] 5.1 Khối progress: label `{{done}}/{{target}}` + thanh progress (BrandGradient fill) + text còn N/đã đạt — `src/components/completion-dialog.tsx`

## 6. i18n

- [x] 6.1 Key `goals.*` đủ 12 ngôn ngữ (title, custom, perWeek, forAll, forPreset, choosePreset, save, progress, remaining, reached, notSet)

## 7. Kiểm tra JS

- [x] 7.1 `npx tsc --noEmit` sạch · `npx jest` xanh · `npx expo export --platform web` OK
