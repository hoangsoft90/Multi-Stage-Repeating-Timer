# Design: add-quick-start

## Context

Home đã có: templates-first list + "Routine hôm nay" card + ActionMenu (Duplicate/Share/Delete) + deep-link `?start=`. presets-store sort theo lastUsedAt. CompletionDialog root-level hiện có [Chia sẻ] [Done]. SessionLogRepo log mọi session kết thúc.

## Decisions

1. **`Preset.isFavorite?: boolean = false`** — additive field (giống Settings pattern), không bump schema. presets-store thêm `setFavorite(id, fav)` → save + reload.
2. **Home reorder**: FAVORITES section (preset.isFavorite) hiển thị TRƯỚC templates + presets thường; templates/khác giữ nguyên. `rows` chia: favorites → templates → user. Preset chips: hàng ngang chip dưới header (tên + ▶), tap ▶ = start, tap thân = Editor.
3. **ActionMenu**: thêm item "⭐ Favorite / ★ Bỏ yêu thích" giữa Duplicate và Share.
4. **Quick Routine** — `QUICK_SESSION_PRESET_ID = 'temp_quick_session'` (khai trong `src/features/routine/routine-schedule.ts`; form trên Home là component `src/components/quick-routine-card.tsx`). Form trên Home (2 stage Work/Break + repeat count, mặc định 25/5 × 4) — không mở Editor. `startPreset({ id: temp_quick_session, name: t('quick.defaultName'), ... })`. Session log presetName = "Quick Routine".
5. **Save as preset**: CompletionDialog — khi `completion.presetId === temp_quick_session`, hiện thêm nút [💾 Lưu thành Preset] → dialog nhập tên (TextInput trong dialog) → `save()` preset mới từ session snapshot (stages + repeat từ session) → Home reload; session log giữ nguyên (không ghi đè presetId — tránh phức tạp).
6. **Streak preset-agnostic**: `currentStreak` đã không filter theo presetId (chỉ dayKey(endedAt)) — KHÔNG đổi logic; thêm test case: 2 session quick (temp id) 2 ngày liên tiếp → streak 2. Ghi chú trong code comment để dev không vô tình thêm filter.
7. **Overwrite Guard dùng chung** (với scheduled-routine): `startWithOverwriteGuard(preset)` trong `src/features/timer/start-guard.ts` — Home card/button/quick routine/chips/deep-link đều đi qua.

## Risks / Trade-offs

- `temp_quick_session` không phải preset thật → sửa/xóa preset không ảnh hưởng; routine suggestion bỏ qua id này (allowed set từ rows — tự loại vì không nằm trong list).
- Save as sau khi session hoàn thành: lấy stagesSnapshot từ session (immutable) → preset mới chính xác với cái đã chạy.
- Chips hàng ngang có thể chật trên màn nhỏ → scroll ngang, tối đa ~6 chip hiển thị.
