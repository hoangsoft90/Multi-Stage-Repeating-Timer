# Design: add-android-widget

## Context

- `TimerSnapshot` DTO + `buildTimerSnapshot` thuần đã có (`src/features/widget/timer-snapshot.ts`, 100% test).
- `WidgetBridge.updateTimerSnapshot(snapshot|null)` native hiện ghi AsyncStorage (`looptimer:widget-snapshot`); timer-store gọi qua `syncWidgets()` ở mọi transition (StageStarted/Resumed/Paused) + terminal → null.
- Deep-link quick start `looptimer:///?start=<presetId>` đã chạy trên Home (`?start=` + `?import=`).
- **`expo-widgets` (official SDK 57, v57.0.8)** hỗ trợ Android qua config plugin `enableAndroid: true` (Glance/Compose). Ban đầu dự tính `@saleksovski/react-native-android-widget` nhưng thư viện **không tồn tại trên npm (404)** — đã loại, dùng expo-widgets cho cả 2 nền tảng (xem tasks 1.1).

## Decisions

1. **Thư viện:** `expo-widgets` (official SDK 57). Widget UI khai báo dạng widget definition trong `app.json` (name `TimerWidget`, `enableAndroid: true`, bundleIdentifier `com.looptimer.app.ExpoWidgetsTarget`, groupIdentifier `group.com.looptimer.app`) + component React render từ widget data (`src/features/widget/timer-widget.tsx`). Yêu cầu dev build — KHÔNG chạy trong Expo Go.
2. **Data flow — kênh ghi snapshot cho widget (Android):**
   - Giữ nguyên DTO `TimerSnapshot` (không đổi contract JS).
   - Native impl `WidgetBridge.updateTimerSnapshot` (Android + iOS): song song AsyncStorage (giữ cho debug/migration) + `TimerWidget.updateSnapshot(widgetData)` qua expo-widgets (lazy require, try/catch → no-op Expo Go/web, xem tasks 2.3).
   - Timer-store KHÔNG đổi (vẫn gọi `syncWidgets()` ở transition) → widget cập nhật đúng lúc transition; không tick 250ms (nhất quán với quyết định add-home-widget design D3).
3. **Mapping thuần:** `mapTimerSnapshotToWidgetData(snapshot)` → `{ stageName, remainingMs, round, totalRounds, status, presetId, presetName, labels }` (null → idle). Unit test deterministic (`src/features/widget/widget-data.ts`). Widget component đọc fields này để render.
4. **Widget UI (1 medium):** dòng 1: presetName + status; dòng 2: stageName + countdown (MM:SS); dòng 3: Round x/y (forever → ∞). Idle: "Mở LoopTimer" + nút Start. **Tap handling (đúng code — `timer-widget.tsx`):**
   - Body tap qua `widgetURL`: running/paused → `looptimer:///timer` (mở màn Timer — KHÔNG bao giờ quick-start đè session đang chạy); idle → `looptimer:///?start=<quickStartPresetId>` ('' → Home).
   - Interactive buttons qua `addUserInteractionListener` (expo-widgets): idle → nút Start (`target=start`) quick-start preset gợi ý (handleWidgetStartTap — ensureHydrated rồi startPreset, không đè session đang chạy, navigate /timer); running → Pause/Stop; paused → Resume/Stop — tất cả apply qua `applyControlAction` (reconcile + guard status, không navigate).
5. **Giới hạn countdown nền tảng:** Android `updatePeriodMillis` tối thiểu 30 phút (plugin set 0 — update theo transition) → widget KHÔNG tự tick mỗi giây. Countdown hiển thị giá trị tại lần update gần nhất (transition event). Ghi rõ trong spec (không hứa realtime tick — chấp nhận, giống mọi app timer widget Android khác).
6. **i18n:** widget dùng stage/preset name từ session (đã đa ngôn ngữ). Widget labels localize qua content (`TimerWidgetLabels` — bridge truyền `i18n.t('widget.*')`, namespace `widget.*` thống nhất với Live Activity, 6 key đủ 12 ngôn ngữ); không có i18n runtime trong widget extension — label refresh theo lần update snapshot.
7. **Remote Config:** không key mới.

## Risks / Trade-offs

- **expo-widgets mới** (SDK 57) → API có thể đổi; giữ mapping thuần tách khỏi lib để giảm đau khi upgrade.
- **Countdown không realtime** trên Android widget — chấp nhận (nền tảng giới hạn); Live Activity iOS (change riêng) mới realtime.
- **App Group bắt buộc (iOS)**: `group.com.looptimer.app` khai báo trong app.json (giống add-live-activity). Android Glance dùng data pass riêng của expo-widgets.
- **EAS dev build bắt buộc** — không test được trong môi trường dev hiện tại (tasks native đánh dấu rõ).

## Migration Plan

Không migrate dữ liệu. Prebuild lại khi thêm library (CNG). Cần build thật trên Android device/emulator để verify widget.

## Open Questions

- Nút "Start" khi idle nên quick-start preset gần nhất hay chỉ mở app? → Mặc định: mở app (đơn giản, an toàn). Quick-start preset khi idle là stretch — mở nếu UX chứng minh cần.
