# Proposal: add-weekly-goals — Weekly Goals (mục tiêu hàng tuần)

## Why

User đã có streak + stats (v1.1) nhưng chưa có **mục tiêu cấu trúc hàng tuần** — thiếu động lực "chốt số phiên/tuần". Plan v1.5 (§4.1): goal-based progress thay vì game mechanics (đã chốt không làm badge/level).

## What Changes

- **Model mới `WeeklyGoal`** (`id`, `presetId?` — undefined = tất cả preset, `targetSessions` 1–99, `weekStart` YYYY-MM-DD Monday) + `WeeklyGoalRepo` (AsyncStorage `looptimer:weekly-goal`, single goal — tạo mới thay thế cũ).
- **Helper thuần**: `mondayKey(ts)` / `currentWeekProgress(entries, goal, now)` — đếm session `status='completed'` trong tuần hiện tại (bắt đầu Thứ 2), lọc theo `presetId` nếu có. Goal **recurring hàng tuần** — progress luôn tính cho tuần hiện tại, không cần reset thủ công.
- **Store** `useGoalsStore` (Zustand): load/save/clear.
- **Settings UI**: section "MỤC TIÊU HÀNG TUẦN" — chip 3/5/7/tùy chỉnh + "Áp dụng cho: Tất cả routine / preset cụ thể" (ActionMenu) + Lưu.
- **CompletionDialog**: hiển thị progress "Mục tiêu tuần: X/Y phiên" + thanh progress (khi có goal).
- **i18n ×12** key-parity (goals.*).

## Capabilities

### New Capabilities

- `weekly-goals`: model + repo + progress thuần + UI Settings + CompletionDialog progress.

### Modified Capabilities

- Không đổi requirement spec cũ.

## Impact

- `src/core/storage/repos.ts` (WeeklyGoal + WeeklyGoalRepo), mới `src/features/goals/weekly-goals.ts` (pure) + `goals-store.ts`.
- `src/app/settings.tsx` (section mới), `src/components/completion-dialog.tsx` (progress bar), `src/features/stats/stats.ts` (không đổi — helper mới dùng riêng).
- i18n 12 file.
