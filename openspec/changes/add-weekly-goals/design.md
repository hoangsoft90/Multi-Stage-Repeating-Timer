# Design: add-weekly-goals

## Context

- `SessionLogEntry` (repos.ts): `id, presetId, presetName, startedAt, endedAt, durationMs, stageCount, status, schemaVersion` — đã có `SessionLogRepo.list/add/clear`, cap 500. `status: 'completed' | 'stopped'`.
- `stats.ts` đã có `dayKey(ts)` (start of local day), `currentStreak` (preset-agnostic), `totalSessions`, `weekDurationMs`.
- `core/time.ts` có `weekDay(ts)` (1=Mon..7=Sun, theo local time) — dùng lại để tính Monday.
- `completion-dialog.tsx` root-level, hiển thị khi `useTimerStore.completion` set (chỉ SessionCompleted). Có sẵn `formatMs`, streak.
- `settings.tsx` đã có các section dạng ActionMenu + Chip/Stepper components sẵn.
- Precedent pattern: `RoutineSchedule` + repo trong `repos.ts` (safe parse, schemaVersion) + store Zustand (`useRoutineStore`) + UI route.

## Decisions

1. **Model + repo trong `repos.ts`** (theo convention tất cả repo trong 1 file): `WeeklyGoal` + `WeeklyGoalRepo` (load → single goal | null; save thay thế; clear). Key `looptimer:weekly-goal`.
2. **Pure helpers mới** `src/features/goals/weekly-goals.ts` (không AsyncStorage — testable):
   - `mondayKey(ts)`: start-of-day của Thứ 2 trong tuần chứa `ts` — dùng `weekDay` từ `core/time.ts` để tính offset (Monday = 1 → offset = weekDay - 1).
   - `weekKey(ts)` → `YYYY-MM-DD` của Monday (so sánh với `goal.weekStart` — thông tin thôi, progress không phụ thuộc).
   - `currentWeekProgress(entries, goal, now)`: count `status==='completed'` && `endedAt ∈ [mondayKey(now), mondayKey(now)+7d)` && (`!goal.presetId || e.presetId === goal.presetId`) → `{ completed, target: goal.targetSessions }`.
   - Goal **recurring**: không có trạng thái "đã kết thúc tuần" — progress luôn theo tuần hiện tại (không cần cron/reset).
3. **Store** `src/features/goals/goals-store.ts` (Zustand): `goal: WeeklyGoal | null`, `loaded`, `load()`, `saveGoal(goal)`, `clearGoal()` — mirror `useRoutineStore`.
4. **Settings UI**: section mới "MỤC TIÊU HÀNG TUẦN" giữa "LỊCH TRÌNH" và "GÓI ÂM THANH": chip [3][5][7] + [Tùy chỉnh] (mở input số) → `targetSessions`; row "Áp dụng cho" → ActionMenu: Tất cả routine / từng preset user (tên + chấm màu); nút "Lưu mục tiêu" (GradientButton nhỏ) → `saveGoal`. Hiển thị goal hiện tại nếu có.
5. **CompletionDialog**: khi `goal` loaded và có, render khối progress: label `goals.progress` ({{done}}/{{target}}) + thanh (View flex chiều ngang, fill `done/target` bằng `BrandGradient` — không thêm thư viện) + text `goals.remaining` hoặc `goals.reached`. Lấy goal qua `useGoalsStore` (đã load ở bootstrap/layout — cần load sớm: thêm vào `ensureHydrated` hoặc effect trong `_layout` cạnh routine store).
6. **i18n ×12** key mới `goals.*`: title, optionCustom, perWeek, forAll, forPreset, choosePreset, save, progress ({{done}}/{{target}}), remaining ({{n}}), reached, notSet, custom.

## Risks / Trade-offs

- **Single goal (v1.5)** — plan v1.6 gợi ý Pro "nhiều goal cùng lúc": model đã có `id` + `weekStart`, migration sau chỉ là đổi repo sang array (additive, không phá).
- **Counting chỉ 'completed'**: stop thủ công không tính — nhất quán với CompletionDialog (chỉ hiện khi hoàn thành tự nhiên) và streak (preset-agnostic, không bị trừng phạt).
- **Dependency**: CompletionDialog cần `useGoalsStore.loaded` — load sớm trong `_layout` (mirror `useRoutineStore.load` effect) để không hiện progress "0/7" nháy trước khi hydrate.

## Migration Plan

Không migrate dữ liệu cũ — key mới hoàn toàn. `SessionLogEntry`/`Preset`/`Settings` không đổi. `schemaVersion` của WeeklyGoal = 1.
