## 1. Dependencies & config

- [x] 1.1 Cài `expo-widgets` (v57.0.8, official SDK 57) + config plugin trong app.json (`enableAndroid: true`, bundleIdentifier `com.looptimer.app.ExpoWidgetsTarget`, groupIdentifier `group.com.looptimer.app`, widget `TimerWidget`)
- [ ] 1.2 Prebuild (npx expo prebuild) — **cần máy có native tooling / EAS build** (môi trường dev hiện tại không chạy). Plugin sinh extension target tự động khi prebuild (CNG).

## 2. Live Activity definition + layout

- [x] 2.1 Activity definition: `createLiveActivity('TimerActivity', …)` + layout bằng @expo/ui (VStack/HStack/Text/Spacer + modifiers font/foregroundStyle/padding) — `src/features/widget/live-activity.tsx` (directive `'widget'`)
- [x] 2.2 Layout slots: compactLeading (stage name), compactTrailing (countdown), minimal (countdown), expanded (stage + preset + countdown + round + next stage), banner (Lock Screen)
- [x] 2.3 **Control buttons (R3):** Pause/Skip (running) / Resume (paused) trong banner + expandedBottom — `Button` target `pause|skip|resume` (contract expo-widgets: `onButtonPress` cast, như TimerWidget); labels i18n truyền qua content (`TimerActivityLabels`, default English cho test) — `activity-content.ts` + `live-activity.tsx`
- [x] 2.4 App-side: **`applyControlAction`** (chung với home-widget — trước là `applyActivityAction`; ensureHydrated → reconcile+tick → guard status → pause/resume/skip/stop) + dispatcher `subscribeWidgetInteraction` route `source=TimerActivity` — `widget-interaction.ts`, đăng ký sẵn ở `_layout.tsx`; bridge truyền `i18n.t('widget.pause'/'skip'/'resume')` (namespace `widget.*` dùng chung với home-widget) vào start/update — `impl.native.ts`

## 3. Bridge wiring (native iOS)

- [x] 3.1 Helper thuần `snapshotToActivityContent(snapshot)` — `src/features/widget/activity-content.ts`
- [x] 3.2 Unit test mapping (running/paused/forever/nextStage) — `activity-content.test.ts`
- [x] 3.3 Native impl `NativeLiveActivityBridge` (iOS): start/update/end qua expo-widgets (lazy require, try/catch → no-op Expo Go); Android/web giữ no-op — `src/platform/impl.native.ts`
- [x] 3.4 Timer-store không đổi — `syncWidgets()`/`startPreset`/terminal đã gọi đúng `liveActivity.start/update/end` từ add-home-widget

## 4. iOS home-screen widget (stretch)

- [x] 4.1 Widget definition `TimerWidget` (systemSmall/SystemMedium) + layout chung với Android — `src/features/widget/timer-widget.tsx`
- [x] 4.2 Widget update qua `WidgetBridge.updateTimerSnapshot` → `TimerWidget.updateSnapshot(...)` (chung bridge, không tick realtime — đúng spec)

## 5. Native test (EAS dev build — KHÔNG test trong môi trường này)

- [ ] 5.1 EAS build iOS (device iOS 16.1+) → verify Live Activity hiển thị + cập nhật + kết thúc
- [ ] 5.2 Verify Dynamic Island (nếu có) + Lock Screen
- [ ] 5.3 Timeshift test: app treo lâu → Live Activity vẫn đúng (không mất kill)
- [ ] 5.4 Verify nút Pause/Skip/Resume trên Lock Screen/Dynamic Island phát `UserInteractionEvent` (source `TimerActivity`) và app apply đúng; đặc biệt khi app bị kill (cold-start hydrate → apply)
- [ ] 5.5 **Open question**: nếu Live Activity không start trên device, thêm config entry `{ name: 'TimerActivity', ios: { supportedFamilies: [] }, android: null }` vào `app.json` → expo-widgets `widgets` (plugin chỉ sinh home-widget kinds từ array này; `WidgetLiveActivity()` luôn được thêm sẵn)

## 6. Kiểm tra JS

- [x] 6.1 `npx tsc --noEmit` sạch · `npx jest` xanh (240) · `npx expo export --platform web` OK
