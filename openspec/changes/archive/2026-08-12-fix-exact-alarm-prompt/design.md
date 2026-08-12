# Design: fix-exact-alarm-prompt

## Context

- `src/app/settings.tsx` (~dòng 418): row "Background accuracy" gọi `IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM')` trực tiếp — KHÔNG set cờ `looptimer:exact-alarm-asked`.
- `src/features/background/permissions.ts`: `requestExactAlarmPermissionJustInTime()` dùng guard "ask once" (cờ `EXACT_ALARM_ASKED_KEY`), nhưng guard này không biết user đã tự mở từ Settings → lần Start đầu mở lại system screen.
- `src/platform/impl.native.ts`: `canScheduleExactAlarm()` trả `false` luôn trên Android — expo-notifications 57.0.9 **không** expose `canScheduleExactAlarms` (đã grep `node_modules/expo-notifications/build/`) → guard `if (can) return;` không bao giờ thoát; cờ là guard duy nhất còn lại.

## Goals / Non-Goals

- **Goals**: (1) mở màn hình exact alarm tối đa 1 lần/cài đặt cho cả 2 entry point; (2) Settings row vẫn luôn bấm được (điểm hành động duy nhất để quản lý quyền).
- **Non-Goals**: không thêm API đọc trạng thái exact alarm (không tồn tại trong SDK); không đổi engine/timer; không thêm dependency native.

## Decisions

1. **Helper dùng chung `openExactAlarmSettings()`** trong `permissions.ts`: set cờ + mở intent + log `permission_requested`. **Set cờ SAU khi launch thành công** — launch fail không đốt cờ, lần Start đầu vẫn còn cơ hội hỏi. Platform guard `Platform.OS !== 'android'` ở đầu helper chống future caller (web/iOS). (Reviewer đề xuất 2 điểm này; đã áp dụng.)
2. **Settings row delegate qua helper**: bỏ import `expo-intent-launcher` trong `settings.tsx`; giữ `.catch(() => {})`.
3. **Just-in-time delegate qua helper**: `requestExactAlarmPermissionJustInTime()` giữ nguyên guard (can → asked → helper); try/catch degrade im lặng giữ nguyên.
