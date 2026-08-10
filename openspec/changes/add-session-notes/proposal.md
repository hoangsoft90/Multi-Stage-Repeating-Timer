# Proposal: add-session-notes — Session Notes (mood + ghi chú)

## Why

User hoàn thành phiên nhưng không ghi lại cảm nhận → mất dữ liệu self-tracking quan trọng (cường độ, hiệu quả theo preset). Plan v1.5 (§4.2): mood + note **optional**, không ép buộc, hiển thị phân bố mood theo preset trong Stats.

## What Changes

- **Model additive** `SessionLogEntry.mood?: 'happy' | 'neutral' | 'sad'` + `note?: string` (có default undefined → **không bump schemaVersion**, đọc dữ liệu cũ an toàn).
- **Repo method mới** `SessionLogRepo.updateMoodNote(id, mood?, note?)` — cập nhật entry theo session id, giữ cap 500.
- **`CompletionInfo.sessionId`** (additive) — timer-store đã có `ended.id` lúc log, thêm vào completion để CompletionDialog update đúng entry.
- **CompletionDialog**: dòng mood picker optional [🙂][😐][😓] + ô nhập note (collapsible) + nút Lưu; dismiss vẫn là "Done". Không bắt buộc — bỏ qua được.
- **Stats**: `moodSummaryByPreset(entries)` thuần → "HIIT · 8 sessions · 🙂 6 · 😐 1 · 😓 1" + mood icon trên từng phiên gần đây.
- **i18n ×12** key-parity (notes.*, stats.mood).

## Capabilities

### New Capabilities

- `session-notes`: mood/note trên session log + flow lưu sau completion + phân bố mood trong Stats.

### Modified Capabilities

- Không đổi requirement spec cũ.

## Impact

- `src/core/storage/repos.ts` (SessionLogEntry + updateMoodNote), `src/features/timer/timer-store.ts` (CompletionInfo.sessionId), `src/components/completion-dialog.tsx`, `src/features/stats/stats.ts` (moodSummaryByPreset) + `src/app/stats.tsx`, i18n 12 file.
