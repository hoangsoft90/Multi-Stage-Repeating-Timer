## 1. Dependencies & config

- [x] 1.1 **QUYẾT ĐỊNH THAY ĐỔI**: `@saleksovski/react-native-android-widget` **không tồn tại trên npm (404)**. Đã chốt với user: dùng **`expo-widgets`** (official SDK 57, v57.0.8) cho cả Android widget + iOS Live Activity — hỗ trợ Android qua config plugin `enableAndroid: true` (Glance/Compose). Đã cài + khai báo trong app.json.
- [x] 1.2 Widget definition `TimerWidget` (name, displayName "LoopTimer", description, iOS systemSmall/Medium, Android minWidth 180/minHeight 110, targetCell 4×2, resizeMode both) — `app.json`

## 2. Bridge re-plumb (JS + native)

- [x] 2.1 Helper thuần `mapTimerSnapshotToWidgetData(snapshot)` (null → idle) + `formatWidgetMs` + `widgetRoundLabel` (∞) — `src/features/widget/widget-data.ts`
- [x] 2.2 Unit test mapping (running/paused/forever/idle + clamp + deterministic) — `widget-data.test.ts`
- [x] 2.3 `NativeWidgetBridge.updateTimerSnapshot` (Android + iOS): giữ AsyncStorage + gọi `TimerWidget.updateSnapshot(widgetData)` qua expo-widgets (lazy require, try/catch → no-op Expo Go/web) — `src/platform/impl.native.ts`
- [x] 2.4 Widget component `TimerWidget.tsx` render từ widget data (preset + stage + countdown + round + idle state) — `src/features/widget/timer-widget.tsx`

## 3. Deep-link tap

- [x] 3.1 **Tap handling (JS layer):**
  - `widgetURL` modifier trên root `TimerWidget`: running/paused → `looptimer:///timer` (mở màn Timer — không bao giờ quick-start đè session đang chạy); idle → `looptimer:///?start=<quickStartPresetId>` (quick-start preset gợi ý, '' → Home). `quickStartPresetId` do `resolveQuickStartPresetId()` cung cấp (favorite → most-recent → ''), bridge điền khi snapshot null.
  - `addUserInteractionListener` + Button `target="start"`/`onButtonPress` (idle): `subscribeWidgetInteraction` trong `widget-interaction.ts` (lazy require expo-widgets, no-op web/Expo Go) → `handleWidgetStartTap` (ensureHydrated → không đè session đang chạy → startPreset preset gợi ý → navigate `/timer`); đăng ký trong `_layout.tsx`.
  - **Cần verify EAS/device**: widgetURL + Button interaction trên Glance (Android) và WidgetKit (iOS) — đặc biệt hành vi Button + widgetURL cùng lúc, event khi app bị kill.
- [x] 3.2 Single-session an toàn: widget chỉ hiển thị snapshot (không tạo session); handleWidgetStartTap không đè session đang chạy (chỉ mở màn Timer); deep-link `?start=` đã có overwrite confirm qua Home
- [x] 3.3 **Control buttons (mở rộng tap handling — giống Live Activity):** Button Pause/Stop (running) / Resume/Stop (paused) trong nhánh active của `TimerWidget.tsx` (target `pause|resume|stop`, contract onButtonPress như Start); `applyActivityAction` → **`applyControlAction`** (chung với Live Activity): ensureHydrated → reconcile+tick → guard status → pause/resume/skip/stop; dispatcher `subscribeWidgetInteraction` route `WIDGET_SOURCE` non-start target → `applyControlAction`; không navigate (widget tự cập nhật qua store events — SessionPaused/Resumed/Stopped → updateTimerSnapshot).
  - **Labels đã localize qua content** (giống Live Activity): `TimerWidgetLabels` (openApp/start/pause/resume/stop) + `DEFAULT_WIDGET_LABELS` trong `widget-data.ts`; bridge điền `i18n.t('widget.openApp'/'start'/'pause'/'resume'/'stop')` — **namespace `widget.*` thống nhất với Live Activity** (`widget.pause/skip/resume` cho activity, `widget.openApp/start/pause/resume/stop` cho widget), 6 key đủ 12 ngôn ngữ.
  - **Cần verify EAS/device**: Button Pause/Resume/Stop trên Glance (Android) + WidgetKit (iOS), đặc biệt khi app bị kill (cold-start hydrate → apply).

## 4. Native test (EAS dev build — KHÔNG test trong môi trường này)

- [ ] 4.1 EAS dev build Android → đặt widget, verify hiển thị + cập nhật theo transition + pause state
- [ ] 4.2 Verify tap widget mở đúng màn (timer/home) + quick-start preset
- [ ] 4.3 Ghi nhận hành vi countdown với `updatePeriodMillis` (plugin set 0; update theo transition) — xác nhận mức chấp nhận được

## 5. i18n + kiểm tra JS

- [x] 5.1 Widget labels localize qua content (`TimerWidgetLabels` — bridge truyền i18n, default English cho test) — ghi rõ giới hạn: widget extension không có i18n runtime, label refresh theo lần update snapshot
- [x] 5.2 `npx tsc --noEmit` sạch · `npx jest` xanh (243) · `npx expo export --platform web` OK
