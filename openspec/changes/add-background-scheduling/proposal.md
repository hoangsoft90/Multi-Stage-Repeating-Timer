## Why

Core promise của app: *"user không bao giờ phải tự chuyển stage khi app ở nền"*. TimerEngine chỉ đúng khi được reconcile — nhưng khi app bị background/kill, cần **OS scheduling** đánh thức app đúng lúc stage kết thúc để emit transition + thông báo. Không có lớp này, promise chỉ đúng khi user mở app — Phase 2 lấp đúng khoảng trống đó: **Android Exact Alarm + khôi phục sau reboot (expo-notifications tự xử lý) + FGS opt-in fallback**, và **iOS — schedule từng transition kế tiếp** (runtime 1 notification/lần; trần `max_scheduled_transitions_ios` 50 chỉ dùng cho coverage-warning Editor) kèm công khai giới hạn cho user (vá lỗ hổng #1, #2, #3 trong plan v1.2).

## What Changes

- **Android — Exact Alarm primary (expo-notifications)**: lên lịch notification trigger tại `stageEndsAt` khi nhận `StageStarted`; khi fire → reconcile → notify → schedule stage kế. `SCHEDULE_EXACT_ALARM` khai trong app.json (android.permissions); degrade xuống inexact trigger khi bị từ chối + thông báo trong Settings "Độ chính xác nền có thể giảm". Dùng `expo-intent-launcher` để mở màn "Alarms & reminders" khi cần user cấp quyền.
- **Android — Khôi phục sau reboot**: `expo-notifications` tự khai `RECEIVE_BOOT_COMPLETED` + tự phục hồi scheduled notifications sau reboot — không cần viết BroadcastReceiver riêng (khác Flutter). Khi app mở lại sau reboot: reconcile → reschedule từ trạng thái hiện tại.
- **Android — FGS opt-in fallback (JS layer đã làm, native defer)**: khi `missed_transition_rate > 15%` hiện dialog opt-in "Keep timer alive" (`fgs-trigger.ts` pub/sub + `fgs-dialog.tsx`, dismiss persist qua `settings.fgsDialogDismissed`). Native foreground service (`@notifee/react-native`, `foregroundServiceType=specialUse` + justification, persistent notification) **chưa implement** — chờ EAS build phase (tasks 3.4).
- **iOS — Schedule từng transition + reschedule**: `expo-notifications` schedule notification cho transition kế tiếp tại `stageEndsAt` (runtime KHÔNG queue 50 — 1 transition/lần); cancel-all + reschedule khi start/resume/cold-start; deterministic notification ID `"{session.id}_{round}_{stageIndex}"`. Trần `max_scheduled_transitions_ios` (50) + budget-split chỉ dùng cho coverage-warning Editor. BGAppRefreshTask (`expo-background-fetch`/`expo-task-manager`) **chưa implement** — defer (tasks 4.3).
- **iOS — Coverage warning**: Editor (iOS) cảnh báo khi preset cần nhiều transition hơn `effectiveMaxStageQueue` (64 − reminder_reserved_slots − activeSchedules, trần `max_scheduled_transitions_ios`); Core promise ghi rõ state luôn đúng khi quay lại, notification không đảm bảo vô hạn.
- **Permissions (thứ tự bắt buộc)**: `POST_NOTIFICATIONS` (expo-notifications.requestPermissionsAsync, xin tại lần start timer đầu tiên — `requestNotificationPermissionOnFirstTimer`, cờ `notif-asked`) → `SCHEDULE_EXACT_ALARM` (just-in-time lúc Start, qua settings intent + degrade) → `RECEIVE_BOOT_COMPLETED` (khai trong app.json `android.permissions`, không dialog).

**Không đổi behavior hiện có**: không ảnh hưởng engine/UI phase trước.

## Capabilities

### New Capabilities

- `background-scheduling`: cơ chế OS scheduling cho cả 2 nền tảng — Android Exact Alarm + khôi phục sau reboot (expo-notifications) + FGS opt-in; iOS schedule từng transition (trần 50 dành cho coverage-warning); deterministic ID; cancel/reschedule; coverage-warning.
- `permissions`: luồng xin 3 loại permission đúng thứ tự (POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED) + graceful degradation + UX thông báo.

### Modified Capabilities

<!-- Không có — greenfield. -->

## Impact

- **Code mới**: `src/features/background/` — `PlatformScheduler` interface + `AndroidScheduler`/`IosScheduler` (expo-notifications), `CoverageCalculator` (ước tính coverage-window), permission flow service. Web: `WebScheduler` no-op (expo-notifications không hỗ trợ web).
- **Native config**: `app.json` — `expo-notifications` config plugin, `android.permissions: [SCHEDULE_EXACT_ALARM]` (+ `RECEIVE_BOOT_COMPLETED`), iOS background modes (fetch).
- **Dependencies mới**: `expo-notifications`, `expo-intent-launcher`. (`expo-background-fetch`/`expo-task-manager`/`@notifee/react-native` **chưa cài** — BGTask + FGS native defer tới EAS build phase.)
- **Phụ thuộc**: change `add-timer-engine` (stageEndsAt), `add-ui-and-storage` (SessionRepo, Editor cho warning).
- **Rủi ro**: HIGH theo plan §9 — phải test thật trên device (reboot, khóa máy > 60 phút); ads/firebase/FGS yêu cầu dev build, web test dùng no-op scheduler.
