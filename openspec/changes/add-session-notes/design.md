# Design: add-session-notes

## Context

- `SessionLogEntry` (repos.ts): `{ id, presetId, presetName, startedAt, endedAt, durationMs, stageCount, status, schemaVersion }` — `SessionLogRepo.list/add/clear`, cap 500, `add(entry: Omit<Entry,'schemaVersion'>)` dùng `withSchema` (spread thêm schemaVersion, giữ field lạ? — KHÔNG: withSchema chỉ thêm schemaVersion, không strip field — field mới mood/note sẽ được giữ qua `add` vì spread từ object gốc).
- Timer-store terminal handler (SessionCompleted): log entry `{ id: ended.id, ... }` rồi set `completion: { presetId, presetName, durationMs, streak, stages, repeatMode, fixedCount }`.
- `completion-dialog.tsx`: root-level, đọc `completion`, có `dismissCompletion`, save-as preset cho quick session. Dismiss hiện tại là "Done" ghost button.
- Stats screen (`src/app/stats.tsx`): tổng phiên/thời gian, streak, heatmap 12 tuần, danh sách phiên gần đây (SessionLogRepo.list).

## Decisions

1. **Model additive**: thêm `mood?`/`note?` vào `SessionLogEntry` (repos.ts). Không bump schemaVersion — `SessionLogRepo.list()` filter chỉ kiểm tra `id`/`endedAt` (không strip field), `withSchema` giữ field mới. Dữ liệu cũ thiếu field → undefined, an toàn.
2. **`updateMoodNote(id, mood?, note?)`**: đọc list → tìm entry → `{ ...e, ...(mood ? { mood } : { mood: undefined }), ...(note ? { note } : { note: undefined }) }` — truyền undefined xóa field khỏi JSON (JSON.stringify bỏ undefined) → ghi lại full list (giữ cap 500). No-op khi không tìm thấy. Không cần async nhiều — await repo.list + setItem.
3. **`CompletionInfo.sessionId`** (additive): timer-store set `completion.sessionId = ended.id` trong nhánh SessionCompleted (đã có `ended` trong scope).
4. **CompletionDialog**: thêm state local `mood: 'happy'|'neutral'|'sad'|null`, `note: string`, `showNote: boolean`, `saving`. Row 3 emoji button (reuse pressed style) + toggle "Add note" + TextInput multiline + [Lưu] (chỉ active khi mood || note.trim()). Lưu → `sessionLogRepo.updateMoodNote(completion.sessionId, mood, note)` → ẩn khối (đã lưu) → không đóng dialog (user vẫn xem streak + share). Chỉ render khối khi `completion` có (mọi preset kể cả quick).
   - Cần truy cập `SessionLogRepo` — tạo instance module-level trong completion-dialog (hoặc export từ timer-store). Đơn giản: `new SessionLogRepo()` local (pattern repos.ts).
5. **`moodSummaryByPreset(entries)`** trong `stats.ts` (pure): Map theo presetId → { presetId, presetName (lấy entry gần nhất), total (số session có mood), happy, neutral, sad, noted (có note) } — chỉ trả preset có ít nhất 1 mood/note. Sắp xếp total desc. Stats screen: section "Mood theo preset" (hiển thị nếu có) + mood emoji trên từng row phiên gần đây.
6. **i18n ×12**: `notes.*` (title, happy/neutral/sad — chỉ dùng làm accessibilityLabel/tooltip, emoji là chính, addNote, notePlaceholder, save, saved) + `stats.mood` (section title).

## Risks / Trade-offs

- **Emoji làm UI chính** (🙂😐😓) — không phụ thuộc font icon; i18n label chỉ là aria/long-label (không hiển thị chính) → giảm rủi ro key dịch sai cảm xúc.
- **Dismiss không lưu**: user bỏ qua → không có dữ liệu — đúng thiết kế optional, không ép.
- **Quick session**: cũng có mood/note (id entry = session id thật, presetId = temp) — preset-agnostic nhất quán với streak.

## Migration Plan

Không migrate. Field additive + repo safe-parse → dữ liệu cũ đọc bình thường. schemaVersion giữ 1.
