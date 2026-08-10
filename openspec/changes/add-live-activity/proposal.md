# Proposal: add-live-activity — iOS Live Activity (ActivityKit)

## Vấn đề

iOS giới hạn ~50 notification pending → session dài khi app bị treo > ~50 phút mất thông báo chuyển stage. Live Activity (ActivityKit) hiển thị countdown realtime trên Lock Screen / Dynamic Island — độc lập notification, không bị giới hạn 50-notif. JS foundation đã có sẵn (v1.2, `add-home-widget`): `LiveActivityBridge` no-op + `TimerSnapshot` + timer-store `syncWidgets()` gọi `liveActivity.update/start/end` ở mọi transition.

## Giải pháp

1. **`expo-widgets`** (official, SDK 57) — package chính thức cho iOS home-screen widget + Live Activities (WidgetKit + ActivityKit), không cần viết Swift/SwiftUI thủ công (layout bằng `@expo/ui`).
2. **Wire `LiveActivityBridge` native (iOS)** từ no-op → `createLiveActivity(...)` thật: start khi session start, update trong `syncWidgets()` (mọi transition), end khi terminal. Map `TimerSnapshot` → Live Activity content state (helper thuần + test).
3. **Layout**: stage + countdown + round; các slot (compact leading/trailing, minimal cho Dynamic Island, expanded banner cho Lock Screen).

## Non-goals

- Không làm Live Activity remote update qua APNs push (chỉ local update — đủ cho countdown timer).
- Không làm push-to-start Live Activity.
- Không làm Android widget ở change này (`add-android-widget`); iOS home-screen widget là stretch (cùng lib, tách task).

## Quan hệ với change cũ

Thay thế task 4.2 + 4.3 của `add-home-widget` (iOS Live Activities native) — khi archive `add-home-widget`, reference change này.