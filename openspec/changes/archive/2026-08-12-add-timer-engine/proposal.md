## Why

Lõi sản phẩm Multi-Stage Repeating Timer ("LoopTimer") là một **timer engine đáng tin cậy**: user bấm Start một lần, rồi các stage tự chuyển tiếp (âm thanh/rung/thông báo) mà user không bao giờ phải can thiệp tay. Nếu engine tính sai thời điểm stage kết thúc, toàn bộ promise của app sụp đổ — kể cả khi notification bị trễ hay bị chặn. Vì vậy engine phải là **pure TypeScript, độc lập nền tảng (không import React Native/notification/ad), test được với Clock giả** và được xây dựng + unit-test trước mọi UI (Phase 0 trong plan v1.2).

## What Changes

- Tạo module **TimerEngine** (TypeScript thuần, chạy được trong Node/Jest/web) dùng **absolute timestamps** + **state machine** + `reconcile(now)` để khôi phục trạng thái đúng sau khi app bị kill/background/reboot.
- Định nghĩa domain models: `Stage`, `Preset`, `TimerSession` (immutable snapshot), `RepeatMode` (once | fixedCount | forever), `TimerStatus`.
- Phát sinh **TimerEvents** theo mô hình event-sourcing: `StageStarted`, `StageCompleted`, `RoundCompleted`, `SessionCompleted`, `SessionPaused`, `SessionResumed`, `SessionStopped` — UI và platform adapter chỉ *react* lên events, không tự chuyển state.
- Cơ chế **Clock injectable** (`FakeClock`) để unit-test chính xác các kịch bản: missed K stages, repeat once/N/forever, skip, race expire+skip.
- Bộ unit test đầy đủ cho engine (dùng **Jest**).

**Không đổi behavior hiện có**: dự án greenfield, chưa có code.

## Capabilities

### New Capabilities

- `timer-engine`: State machine timer thuần TypeScript với absolute timestamps, `reconcile(now)`, event-sourcing, repeat modes, và Clock injectable — nền tảng cho mọi phase sau (UI, background scheduling, feedback, monetization).

### Modified Capabilities

<!-- Không có — dự án greenfield, chưa có spec nào tồn tại. -->

## Impact

- **Code mới**: thư mục `src/core/timer/` (engine + domain models + events) và `src/core/timer/__tests__/` (unit test Jest).
- **Dependencies mới**: chỉ `jest` + `ts-jest` (dev) — engine không phụ thuộc package RN nào để giữ pure TypeScript.
- **Stack dự án**: Expo (React Native) + TypeScript; engine là layer thuần, không phụ thuộc `react-native`, test được cả trong Node lẫn web.
- **Hệ thống liên quan**: engine sẽ là source of truth cho timer store (Phase 1), background scheduler (Phase 2), audio/haptics/notification (Phase 3).
- **Rủi ro kỹ thuật**: LOW (theo plan §9) — thuần logic, test toàn diện bằng FakeClock.
