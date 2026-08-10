# Design: add-retention-pack

## Context

App đã có FeedbackCoordinator (audio/haptics/notification), timer-store (Zustand, event-driven), stats service (SessionLogRepo + helpers), Settings store. Change này thêm 3 capability giữ chân người dùng, tất cả local-first, tôn trọng sacred timer screen và i18n 12 ngôn ngữ.

## Goals / Non-Goals

**Goals:**
- Voice coaching đa ngôn ngữ (theo locale), không chặn timer, tôn trọng toggle.
- Gợi ý routine theo giờ trong ngày từ dữ liệu local (không backend).
- Màn hoàn thành + chia sẻ kết quả, không làm phiền (dismiss 1 chạm).

**Non-Goals:**
- Widget / Live Activities — change riêng.
- Onboarding — change riêng.
- Import/export preset — change riêng.

## Decisions

1. **`SpeechService` thêm vào platform abstraction** (`src/platform/types.ts` + `impl.native.ts`/`impl.web.ts`): `speak(text)`, `stop()`, `setEnabled(bool)`. Native dùng `expo-speech` (`Speech.speak` với `language` theo i18n.language), web dùng `window.speechSynthesis`. Cả hai đều có no-op an toàn khi không khả dụng (Expo Go / trình duyệt không hỗ trợ). Mọi lỗi TTS bị nuốt — không bao giờ crash timer.
2. **Voice text lấy từ i18n**: các key `voice.*` đọc qua `t()` tại thời điểm phát (đúng locale hiện tại). Stage name đọc nguyên văn (không dịch — tên stage do user đặt).
3. **FeedbackCoordinator** là nơi duy nhất phát voice (giống audio/haptics): StageStarted → đọc tên stage; SessionCompleted → đọc "Routine complete"; warnings 30s/10s phát từ timer-store `tick()` (đã có chime/haptic ở đó — thêm voice cạnh tranh chỗ đó, không đổi logic).
4. **`suggestPresetForNow` là hàm thuần** trong `src/features/stats/stats.ts`: bucket 4 khung giờ theo `hourBucket` (đêm: ≥21h và <5h, sáng: 5–11h, chiều: 12–16h, tối: 17–20h), 7 ngày gần nhất, chọn preset xuất hiện nhiều nhất trong bucket hiện tại (≥1 lần mới gợi ý; tie → preset mới dùng gần nhất). Trả về `{ presetId, hourBucket, count } | null`. Test Jest deterministic với input giả.
5. **CompletionDialog** — component root-level (giống RecoveryDialog), đọc từ timer-store field `completion: CompletionInfo | null`. Timer-store set `completion` khi nhận `SessionCompleted` (presetName resolve qua `presetNameFor(session)` — presets store/templates, không dùng biến module stale; durationMs, streak tính qua `currentStreak(sessionLog)` sau khi log đã ghi). Share qua `ShareService.share(text)`. `dismissCompletion()` để đóng.
6. **ShareService** platform: native `Share.share({ message })`; web `navigator.share` fallback copy clipboard + alert. Không chặn flow chính khi fail.
7. **Settings**: thêm `voiceEnabled: boolean` (default true — tính năng mới khuyến khích thử, nhưng tôn trọng toggle) vào `Settings` + `DEFAULT_SETTINGS` + SettingsRepo (schemaVersion giữ 1 — field mới với default là additive, `{ ...DEFAULT_SETTINGS, ...data }` đã xử lý). Settings screen thêm toggle trong group SOUND & VIBRATION.

## Risks / Trade-offs

- **TTS phát đè tiếng nói hệ thống / audio khác** → `Speech.stop()` trước khi phát chuỗi mới; voice là tính năng chủ động, toggle tắt được.
- **Web speechSynthesis không có sẵn** → guard `typeof speechSynthesis !== 'undefined'`, no-op.
- **Streak tính tại completion có thể lệch nếu SessionLog chưa flush** → log session TRƯỚC khi tính streak trong cùng handler terminal (đã có thứ tự đúng trong timer-store).
- **Gợi ý routine khi dữ liệu ít** → chỉ gợi ý khi có ≥1 phiên trong bucket 7 ngày; Home ẩn card nếu null.

## Migration Plan

Không cần migration: field settings mới có default, SessionLogEntry không đổi schema.

## Open Questions

- Voice đọc cả tên stage có cần dịch? Không — tên stage do user đặt, đọc nguyên văn là đúng nhất.
