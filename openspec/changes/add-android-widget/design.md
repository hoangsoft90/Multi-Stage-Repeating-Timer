# Design: add-android-widget

## Context

- `TimerSnapshot` DTO + `buildTimerSnapshot` thuần đã có (`src/features/widget/timer-snapshot.ts`, 100% test).
- `WidgetBridge.updateTimerSnapshot(snapshot|null)` native hiện ghi AsyncStorage (`looptimer:widget-snapshot`); timer-store gọi qua `syncWidgets()` ở mọi transition (StageStarted/Resumed/Paused) + terminal → null.
- Deep-link quick start `looptimer:///?start=<presetId>` đã chạy trên Home (`?start=` + `?import=`).
- **`expo-widgets` (official SDK 57) KHÔNG hỗ trợ Android** — đã xác minh qua research (iOS only: WidgetKit + ActivityKit). Android dùng `@saleksovski/react-native-android-widget`.

## Decisions

1. **Thư viện:** `@saleksovski/react-native-android-widget`. Render widget UI từ React component (component tree → RemoteViews layout), đã được dùng phổ biến trong Expo dev builds. Yêu cầu dev build — KHÔNG chạy trong Expo Go.
2. **Data flow — kênh ghi snapshot cho widget (Android):**
   - Giữ nguyên DTO `TimerSnapshot` (không đổi contract JS).
   - Native impl `WidgetBridge.updateTimerSnapshot` (Android): song song AsyncStorage (giữ cho debug/migration) + `updateWidget(...)` qua thư viện với dữ liệu widget (mapping thuần, xem 3).
   - Timer-store KHÔNG đổi (vẫn gọi `syncWidgets()` ở transition) → widget cập nhật đúng lúc transition; không tick 250ms (nhất quán với quyết định add-home-widget design D3).
3. **Mapping thuần:** `mapTimerSnapshotToWidgetData(snapshot)` → `{ stageName, remainingMs, round, totalRounds, status, presetId, presetName }` (null → idle). Unit test deterministic. Widget component đọc fields này để render.
4. **Widget UI (1 medium):** dòng 1: presetName + status; dòng 2: stageName + countdown (MM:SS); dòng 3: Round x/y (forever → ∞). Idle: "Mở LoopTimer" + tap → mở Home. Tap khi đang chạy → deep-link `looptimer:///?start=<presetId>` (Home quick start). Click mapping qua intent extra của thư viện (onClick → app intent, đọc extra presetId).
5. **Giới hạn countdown nền tảng:** Android `updatePeriodMillis` tối thiểu 30 phút → widget KHÔNG tự tick mỗi giây. Countdown hiển thị giá trị tại lần update gần nhất (transition event + update định kỳ). Ghi rõ trong spec (không hứa realtime tick — chấp nhận, giống mọi app timer widget Android khác).
6. **i18n:** widget dùng stage/preset name từ session (đã đa ngôn ngữ). Label idle tối giản, không ép 12 ngôn ngữ cho widget extension (chi phí cao, hiệu quả thấp) — ghi rõ limitation.
7. **Remote Config:** không key mới.

## Risks / Trade-offs

- **Thư viện community** → API có thể đổi; giữ mapping thuần tách khỏi lib để giảm đau khi upgrade.
- **Countdown không realtime** trên Android widget — chấp nhận (nền tảng giới hạn); Live Activity iOS (change riêng) mới realtime.
- **App Group/SharedPreferences**: thư viện tự quản lý data pass; không cần App Group (khác iOS).
- **EAS dev build bắt buộc** — không test được trong môi trường dev hiện tại (tasks native đánh dấu rõ).

## Migration Plan

Không migrate dữ liệu. Prebuild lại khi thêm library (CNG). Cần build thật trên Android device/emulator để verify widget.

## Open Questions

- Nút "Start" khi idle nên quick-start preset gần nhất hay chỉ mở app? → Mặc định: mở app (đơn giản, an toàn). Quick-start preset khi idle là stretch — mở nếu UX chứng minh cần.
