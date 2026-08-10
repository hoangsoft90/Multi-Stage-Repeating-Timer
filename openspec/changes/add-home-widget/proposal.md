# Proposal: add-home-widget — Home-screen widget + Live Activities (iOS)

## Vấn đề

User phải mở app để xem timer đang chạy / bắt đầu routine. Deep-link quick start `looptimer:///?start=` đã sẵn nhưng chưa có giao diện ngoài app. iOS còn giới hạn 50 notification khi app treo lâu — Live Activities giải quyết triệt để.

## Giải pháp (2 phần — JS foundation + native extension)

1. **JS foundation (làm được ngay, test được)**: 
   - `WidgetBridge` platform service: `updateTimerSnapshot(snapshot | null)` ghi snapshot timer hiện tại (presetName, stageName, remainingMs, stageEndsAt, status, presetId) vào nơi widget đọc được (App Group shared storage native / AsyncStorage web no-op).
   - `src/features/widget/timer-snapshot.ts`: hàm thuần `buildTimerSnapshot(engineState, session)` + writer gắn vào timer-store (mọi transition; snapshot chứa `stageEndsAt` tuyệt đối — không cần sync theo tick).
2. **Native extension (cần EAS dev build — KHÔNG test được trong môi trường này)**:
   - Android: home-screen widget (expo-widgets đang alpha / native AppWidgetProvider) đọc snapshot + 1 chạm deep-link start.
   - iOS: Live Activities / Dynamic Island (ActivityKit) hiển thị countdown trên lock screen — giải quyết giới hạn 50-notif; cần widget extension target + App Groups.

## Non-goals

- Không làm widget đồng bộ real-time qua server (local-first).
- Không làm watch app.
