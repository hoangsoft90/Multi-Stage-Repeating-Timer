## 1. Platform services (SpeechService, ShareService)

- [x] 1.1 Thêm `SpeechService` vào `src/platform/types.ts` (`speak(text)`, `stop()`, `setEnabled(enabled)`)
- [x] 1.2 Implement `NativeSpeechService` (expo-speech, language theo i18n) trong `impl.native.ts`
- [x] 1.3 Implement `WebSpeechService` (speechSynthesis, guard availability) trong `impl.web.ts`
- [x] 1.4 Thêm `ShareService` (`share(text)`) vào types + native (Share.share) + web (navigator.share fallback clipboard)
- [x] 1.5 Cập nhật `src/test-utils/platform-mock.ts` (speech + share)

## 2. Settings

- [x] 2.1 Thêm `voiceEnabled: boolean` (default true) vào `Settings` + `DEFAULT_SETTINGS`
- [x] 2.2 Settings screen: toggle Voice trong group SOUND & VIBRATION

## 3. Voice coaching

- [x] 3.1 FeedbackCoordinator: StageStarted → `speech.speak(stageName)`; SessionCompleted → `speak(t('voice.completed'))` khi voiceEnabled
- [x] 3.2 `updateSettings` truyền voiceEnabled vào speech service
- [x] 3.3 timer-store `tick()`: vượt ngưỡng 30s/10s → `speech.speak(t('voice.secondsLeft', { count }))`
- [x] 3.4 Speech.stop() trước mỗi lần phát chuỗi mới (chống đè tiếng)

## 4. Routine hôm nay

- [x] 4.1 `src/features/stats/stats.ts`: `suggestPresetForNow(entries, presets, now)` — 4 bucket giờ, 7 ngày, trả `{ presetId, hourBucket, count } | null`
- [x] 4.2 Unit test `stats.test.ts` cho suggestPresetForNow (deterministic, tie-break, empty)
- [x] 4.3 Home (`index.tsx`): card "Routine hôm nay" + nút Start gradient khi có gợi ý

## 5. Completion + share

- [x] 5.1 timer-store: thêm `completion: CompletionInfo | null` + `dismissCompletion()`; set khi SessionCompleted (presetName, durationMs, streak)
- [x] 5.2 `CompletionDialog` component (root-level, kiểu RecoveryDialog)
- [x] 5.3 _layout.tsx: mount CompletionDialog
- [x] 5.4 Share kết quả qua ShareService (text theo locale)

## 6. i18n

- [x] 6.1 Thêm keys: `settings.voice`, `voice.completed`, `voice.secondsLeft`, `home.todayRoutine`, `complete.title/name/duration/streak/done/share/shareText` — vào 12 file ngôn ngữ
- [x] 6.2 Regression test token `{{var}}` vẫn pass

## 7. Kiểm tra

- [x] 7.1 `npx tsc --noEmit` sạch
- [x] 7.2 `npx jest` toàn bộ test xanh
- [x] 7.3 `npx expo export --platform web` bundle 200
