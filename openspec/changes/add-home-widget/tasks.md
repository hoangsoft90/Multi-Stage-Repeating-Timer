## 1. JS foundation — snapshot

- [x] 1.1 Tạo `src/features/widget/timer-snapshot.ts`: `TimerSnapshot` type + `buildTimerSnapshot(engineState, session)` thuần
- [x] 1.2 Unit test buildTimerSnapshot (running/paused/completed, rounds)

## 2. JS foundation — platform bridge

- [x] 2.1 Thêm `WidgetBridge` vào `src/platform/types.ts`: `updateTimerSnapshot(snapshot | null)`
- [x] 2.2 Native impl: ghi snapshot (AsyncStorage key `looptimer:widget-snapshot` — native widget sẽ đọc qua App Group sau)
- [x] 2.3 Web impl: no-op
- [x] 2.4 `LiveActivityBridge`: `start(snapshot)` / `update(snapshot)` / `end()` — native no-op (iOS cần EAS build), web no-op
- [x] 2.5 Cập nhật platform-mock

## 3. Timer-store wiring

- [x] 3.1 Mọi transition event (StageStarted/SessionResumed/SessionPaused/terminal) → `widgetBridge.updateTimerSnapshot(buildTimerSnapshot(...))` (snapshot có `stageEndsAt` tuyệt đối để widget tự đếm ngược — không sync theo tick 250ms, xem design.md)
- [x] 3.2 Terminal event → `updateTimerSnapshot(null)`

## 4. Native extension (cần EAS dev build — ghi rõ, KHÔNG test trong môi trường này)

- [ ] 4.1 Android widget: config plugin / native AppWidgetProvider đọc snapshot + deep-link quick start
- [ ] 4.2 iOS Live Activities: ActivityKit binding + widget extension target + App Groups
- [ ] 4.3 Test trên device thật (EAS build)

## 5. Kiểm tra JS foundation

- [x] 5.1 `npx tsc --noEmit` sạch
- [x] 5.2 `npx jest` xanh
- [x] 5.3 `npx expo export --platform web` bundle 200
