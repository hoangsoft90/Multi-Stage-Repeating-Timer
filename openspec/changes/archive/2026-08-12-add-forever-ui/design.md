# Design: add-forever-ui

## Context

Engine repeat mode `forever`: không bao giờ emit SessionCompleted (vô hạn). Session log chỉ ghi khi terminal = stopped (timer-store: isTerminal = SessionStopped hoặc SessionCompleted). CompletionDialog hiện hiển thị khi `completion != null` — chỉ set khi SessionCompleted, nên forever không hiện dialog (đúng). Vấn đề còn lại là hiển thị `round / ∞` và thông tin Stop.

## Decisions

1. **Timer screen** (`timer.tsx`): khi `state.totalRounds === Infinity` (engine normalize về Infinity hoặc repeatMode forever) → hiển thị `ROUND ${currentRound} / ∞` (glyph '∞' — không cần thêm font). StagePill và next-stage giữ nguyên.
2. **Notification** (`timer-store.reschedule`): body `t('notif.nextStage', { name })` giữ; title `t('notif.stageFallback')` → thêm round format: khi forever, `WORK · Round 37` (bỏ `/ ∞`). Kiểm tra format hiện tại — dùng round số thường.
3. **CompletionDialog**: không đổi logic (chỉ SessionCompleted) — thêm test đảm bảo forever + stop thủ công KHÔNG set completion (đã đúng nhờ isTerminal + event.type === 'SessionCompleted').
4. **Stats**: verify session forever log status=stopped — test sessionLog entry cho stopped session có presetName đúng. Không đổi code.
5. **UI label**: `home.modeLoop` (đã có — "Vô hạn") dùng cho chips; không đổi.

## Risks / Trade-offs

- `∞` glyph trong notification/UI — font hệ thống hỗ trợ; web OK.
- Test: simulate engine forever + stop → completion null, log stopped.
