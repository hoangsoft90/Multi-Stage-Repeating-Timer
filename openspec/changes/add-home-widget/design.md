# Design: add-home-widget

## Context

Timer-store event-driven (transition + tick 250ms), deep-link quick start đã có trên Home. Platform abstraction cho phép thêm service mới không phá impl cũ. `expo-widgets` (alpha) + `expo-background-task` là hướng native hiện tại của Expo SDK 57.

## Decisions

1. **WidgetBridge là platform service mới** (`src/platform/types.ts` + impl): `updateTimerSnapshot(snapshot: TimerSnapshot | null)`. Native thật sẽ ghi vào App Group shared storage (cần config plugin + dev build); impl native ban đầu ghi AsyncStorage (cùng nơi widget native đọc qua App Group bridge sau này) — web no-op.
2. **`TimerSnapshot` là DTO thuần** (src/features/widget/timer-snapshot.ts): `{ presetId, presetName, stageName, stageIndex, totalStages, round, totalRounds, remainingMs, stageEndsAt, status }`. `buildTimerSnapshot(engineState, session)` thuần — test Jest.
3. **Timer-store gắn writer**: mọi transition event (StageStarted/SessionResumed/**SessionPaused**/SessionStopped/SessionCompleted) gọi `widget.updateTimerSnapshot(buildTimerSnapshot(...))`; terminal → `updateTimerSnapshot(null)`. Snapshot chứa `stageEndsAt` nên widget native tự tính countdown từ mốc tuyệt đối — **không cần sync theo tick 250ms** (tránh ghi AsyncStorage 4 lần/giây); tick-sync chỉ cần nếu widget không đọc được `stageEndsAt` (thêm sau nếu cần).
4. **Live Activities (iOS)**: cùng snapshot; ActivityKit config plugin + ActivityKit binding — phần native, spec hóa behavior, đánh dấu cần EAS build. JS side: `LiveActivityBridge` no-op ban đầu (để lộ contract).
5. **Deep-link quick start đã sẵn** (`?start=`) — widget native chỉ cần mở URL.

## Risks / Trade-offs

- **expo-widgets alpha** → native phần có thể đổi API; JS foundation ổn định, native tách riêng.
- **App Group / config plugin** → bắt buộc EAS dev build, không test trong Expo Go — ghi rõ trong tasks.
- **Widget cập nhật thường xuyên tốn pin** → cập nhật theo transition (KHÔNG theo tick — quyết định này deviate spec home-widget R1 "mỗi tick khi foreground", lý do: snapshot có `stageEndsAt` tuyệt đối để widget tự đếm ngược; tránh ghi AsyncStorage 4 lần/giây; tick-sync bật lại nếu widget cần remaining chính xác tuyệt đối).

## Migration Plan

Không migrate dữ liệu. Cần cấu hình native (App Groups, widget extension target) khi làm phần native — ngoài phạm vi JS foundation.

## Open Questions

- Chọn expo-widgets (alpha) hay native AppWidgetProvider — quyết định khi làm phase native với EAS build.
