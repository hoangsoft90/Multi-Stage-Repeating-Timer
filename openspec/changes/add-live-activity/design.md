# Design: add-live-activity

## Context

- `LiveActivityBridge` (platform service): `start(snapshot)` / `update(snapshot)` / `end()` — native iOS hiện no-op (`add-home-widget`), web no-op. Timer-store gọi: `syncWidgets()` → `liveActivity.update(snapshot)` mọi transition; start/startPreset → `liveActivity.start(snapshot)`; terminal → `liveActivity.end()`.
- `TimerSnapshot` + `buildTimerSnapshot` thuần 100% test.
- **Research xác nhận:** `expo-widgets` (official, SDK 56/57) hỗ trợ iOS widgets + Live Activities (ActivityKit) qua config plugin; KHÔNG hỗ trợ Android; KHÔNG chạy trong Expo Go (cần dev build).

## Decisions

1. **Thư viện:** `expo-widgets` (official). Cài `npx expo install expo-widgets`. Config plugin trong `app.json`:
   ```json
   ["expo-widgets", {
     "bundleIdentifier": "com.looptimer.app",
     "groupIdentifier": "group.com.looptimer",
     "enablePushNotifications": false,
     "widgets": [{ "name": "Timer", "displayName": "LoopTimer", "description": "Timer đang chạy", "supportedFamilies": ["systemSmall", "systemMedium"] }]
   }]
   ```
   Live Activity được khai báo riêng qua `createLiveActivity` trong code.
2. **Live Activity definition + layout:** `createLiveActivity({ name, attributes, contentState })` — layout bằng `@expo/ui` primitives (VStack/HStack/Text/Symbol). Các slot: compactLeading (stage), compactTrailing (countdown), minimal (countdown), expanded (stage + countdown + round + next stage). Countdown từ `stageEndsAt` tuyệt đối (ActivityKit tự đếm realtime — giải quyết giới hạn 50-notif).
3. **Wire bridge (iOS):** thay impl no-op:
   - `start(snapshot)` → `createLiveActivity(...).start(contentState)`.
   - `update(snapshot)` → cập nhật contentState (giữ activityId).
   - `end()` → end activity.
   - Helper thuần `snapshotToActivityContent(snapshot)` (→ `{ stageName, remainingMs, round, totalRounds, nextStageName, status }`) + unit test.
   - Web/Android giữ no-op.
4. **Timer-store:** KHÔNG đổi logic — vẫn qua `LiveActivityBridge` (layer native implement). Chỉ cần đảm bảo `syncWidgets` gọi đủ start/update/end (đã đúng từ add-home-widget).
5. **Local updates only:** không APNs push; không push-to-start. Đủ cho countdown (ActivityKit giữ activity sống khi app nền).
6. **EAS build + App Group provisioning** bắt buộc (Apple team id, entitlements `com.apple.developer.usergroup.access`). Không test trong môi trường hiện tại.
7. **Config plugin cần `appleTeamId`** — phải set trong khi build; ghi rõ trong tasks (phụ thuộc tài khoản dev).

## Risks / Trade-offs

- **expo-widgets alpha/GA mới** → API có thể đổi giữa SDK; giữ mapping thuần + bridge (JS layer ổn định, native tách riêng).
- **App Group + team provisioning** → blocker cho CI/test không có Apple account; đánh dấu native task rõ.
- **Live Activity giới hạn budget** (Apple giới hạn cập nhật 1/giờ cho push, nhưng local update không giới hạn cứng) — local update qua ActivityKit OK.
- **Live Activity chỉ iOS 16.1+** — device cũ fallback về notification (không đổi hành vi cũ).

## Migration Plan

Không migrate dữ liệu. Prebuild lại với expo-widgets plugin (CNG). Cần EAS build iOS + device thật iOS 16.1+ để verify Live Activity.

## Open Questions

- Có thêm iOS home-screen widget (systemSmall/Medium) trong cùng change này không? → Mặc định: CÓ (cùng expo-widgets, chi phí thấp), tách task riêng.