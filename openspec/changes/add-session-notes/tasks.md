# Tasks: add-session-notes

## 1. Model + repo

- [x] 1.1 `SessionLogEntry.mood?` + `note?` (additive) — `src/core/storage/repos.ts`
- [x] 1.2 `SessionLogRepo.updateMoodNote(id, mood?, note?)` (no-op khi không có entry, giữ cap 500)
- [x] 1.3 Unit test: cập nhật mood/note, xóa field khi truyền undefined, entry cũ thiếu field vẫn đọc được, no-op id không tồn tại

## 2. Timer-store wiring

- [x] 2.1 `CompletionInfo.sessionId` + set bằng `ended.id` trong nhánh SessionCompleted — `src/features/timer/timer-store.ts`

## 3. CompletionDialog

- [x] 3.1 Mood picker [🙂][😐][😓] + nút "Thêm ghi chú" (collapsible TextInput) + nút Lưu → `updateMoodNote` — `src/components/completion-dialog.tsx`
- [x] 3.2 Done vẫn dismiss không lưu; sau Lưu ẩn khối nhập

## 4. Stats

- [x] 4.1 `moodSummaryByPreset(entries)` thuần — `src/features/stats/stats.ts`
- [x] 4.2 Unit test: gộp theo preset, đếm happy/neutral/sad/noted, chỉ trả preset có mood/note, deterministic
- [x] 4.3 Stats screen: section "Mood theo preset" + mood emoji trên từng phiên gần đây — `src/app/stats.tsx`

## 5. i18n

- [x] 5.1 Key `notes.*` + `stats.mood` đủ 12 ngôn ngữ

## 6. Kiểm tra JS

- [x] 6.1 `npx tsc --noEmit` sạch · `npx jest` xanh · `npx expo export --platform web` OK
