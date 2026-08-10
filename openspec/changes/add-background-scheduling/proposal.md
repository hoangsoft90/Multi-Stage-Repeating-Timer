## Why

Core promise của app: *"user không bao giờ phải tự chuyển stage khi app ở nền"*. TimerEngine chỉ đúng khi được reconcile — nhưng khi app bị background/kill, cần **OS scheduling** đánh thức app đúng lúc stage kết thúc để emit transition + thông báo. Không có lớp này, promise chỉ đúng khi user mở app — Phase 2 lấp đúng khoảng trống đó: **Android Exact Alarm + khôi phục sau reboot (expo-notifications tự xử lý) + FGS opt-in fallback**, và **iOS queue tối đa 50 notification + background task best-effort** kèm công khai giới hạn cho user (vá lỗ hổng #1, #2, #3 trong plan v1.2).

## What Changes

- **Android — Exact Alarm primary (expo-notifications)**: lên lịch notification trigger tại `stageEndsAt` khi nhận `StageStarted`; khi fire → reconcile → notify → schedule stage kế. `SCHEDULE_EXACT_ALARM` khai trong app.json (android.permissions); degrade xuống inexact trigger khi bị từ chối + thông báo trong Settings "Độ chính xác nền có thể giảm". Dùng `expo-intent-launcher` để mở màn "Alarms & reminders" khi cần user cấp quyền.
- **Android — Khôi phục sau reboot**: `expo-notifications` tự khai `RECEIVE_BOOT_COMPLETED` + tự phục hồi scheduled notifications sau reboot — không cần viết BroadcastReceiver riêng (khác Flutter). Khi app mở lại sau reboot: reconcile → reschedule từ trạng thái hiện tại.
- **Android — FGS opt-in fallback**: khi `missed_transition_rate > 15%` mới đề xuất bật; dùng `@notifee/react-native` (hoặc native module) cho foreground service; dialog nói rõ persistent notification bắt buộc; `foregroundServiceType=specialUse` + justification Day 1. **Yêu cầu dev build** (không chạy trong Expo Go).
- **iOS — Queue max 50**: `expo-notifications` schedule tối đa 50 notification kế tiếp (giới hạn hệ thống 64, chừa buffer 50); cancel-all + reschedule khi start/resume/cold-start; deterministic notification ID `"{session.id}_{round}_{stageIndex}"`; `expo-background-fetch`/`expo-task-manager` đăng ký background task best-effort (BGAppRefreshTask).
- **iOS — Coverage warning**: Editor cảnh báo nếu 50 transition kế tiếp < khoảng thời gian dự kiến quay lại (chỉ iOS); Core promise ghi rõ state luôn đúng khi quay lại, notification không đảm bảo vô hạn.
- **Permissions (thứ tự bắt buộc)**: `POST_NOTIFICATIONS` (expo-notifications.requestPermissionsAsync, xin khi tạo timer đầu tiên) → `SCHEDULE_EXACT_ALARM` (just-in-time lúc Start, qua settings intent + degrade) → `RECEIVE_BOOT_COMPLETED` (tự động qua expo-notifications, không dialog).

**Không đổi behavior hiện có**: không ảnh hưởng engine/UI phase trước.

## Capabilities

### New Capabilities

- `background-scheduling`: cơ chế OS scheduling cho cả 2 nền tảng — Android Exact Alarm + khôi phục sau reboot (expo-notifications) + FGS opt-in; iOS queue 50 + background task best-effort; deterministic ID; cancel/reschedule; coverage-warning.
- `permissions`: luồng xin 3 loại permission đúng thứ tự (POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED) + graceful degradation + UX thông báo.

### Modified Capabilities

<!-- Không có — greenfield. -->

## Impact

- **Code mới**: `src/features/background/` — `PlatformScheduler` interface + `AndroidScheduler`/`IosScheduler` (expo-notifications), `CoverageCalculator` (ước tính coverage-window), permission flow service. Web: `WebScheduler` no-op (expo-notifications không hỗ trợ web).
- **Native config**: `app.json` — `expo-notifications` config plugin, `android.permissions: [SCHEDULE_EXACT_ALARM]`, `@notifee/react-native` plugin (nếu dùng FGS), iOS background modes (fetch).
- **Dependencies mới**: `expo-notifications`, `expo-intent-launcher`, `expo-background-fetch`, `expo-task-manager`, `@notifee/react-native` (dev build cho FGS).
- **Phụ thuộc**: change `add-timer-engine` (stageEndsAt), `add-ui-and-storage` (SessionRepo, Editor cho warning).
- **Rủi ro**: HIGH theo plan §9 — phải test thật trên device (reboot, khóa máy > 60 phút); ads/firebase/FGS yêu cầu dev build, web test dùng no-op scheduler.
