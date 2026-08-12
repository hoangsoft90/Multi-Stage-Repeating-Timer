# Proposal: fix-exact-alarm-prompt — Exact-alarm hỏi đúng 1 lần/cài đặt giữa Settings và Start

## Why

User test trên máy thật báo: vào Settings > Background accuracy (mở màn hình hệ thống "Alarms & reminders"), quay lại app nhấn Start lần đầu → app lại nhảy sang màn hình "Alarms & reminders" rồi mới vào timer screen. Không phải lỗi điều hướng: **2 entry point mở cùng 1 system screen nhưng không chia sẻ guard "ask once per install"** — row Settings gọi `IntentLauncher` trực tiếp (không set cờ), còn just-in-time Start chỉ dựa vào cờ `looptimer:exact-alarm-asked` chưa từng được set.

## What Changes

- **Helper dùng chung** `openExactAlarmSettings()` trong `src/features/background/permissions.ts`: mở system screen `android.settings.REQUEST_SCHEDULE_EXACT_ALARM` + set cờ `looptimer:exact-alarm-asked` **sau khi launch thành công** (launch fail không đốt cờ) + Platform guard Android + log event `permission_requested`.
- **Settings row "Background accuracy"** (`src/app/settings.tsx`) gọi helper này thay vì `IntentLauncher.startActivityAsync` trực tiếp → bấm row cũng đánh dấu "đã hỏi", bỏ import thừa.
- **Just-in-time Start** (`requestExactAlarmPermissionJustInTime`) delegate qua helper — guard "ask once" giữ nguyên: cờ đã set (từ Settings hoặc Start đầu) → Start không mở lại system screen.
- Không đổi behavior khác; không đổi model/schema; không thêm dependency.

## Capabilities

### New Capabilities

- `exact-alarm-ask-once`: guard "hỏi đúng 1 lần/cài đặt" dùng chung cho cả 2 entry point mở màn hình "Alarms & reminders" (Settings row + just-in-time Start) — chống prompt trùng lặp.

### Modified Capabilities

<!-- Không có -->

## Impact

- Sửa: `src/features/background/permissions.ts`, `src/app/settings.tsx`.
- Kiểm tra: `npx tsc --noEmit` sạch; jest screens/v12-features/background pass (51 tests); code review không còn vấn đề.
- Commit `94547f0` (đã push main — GH Actions run `31584761847` build APK đang chạy).
