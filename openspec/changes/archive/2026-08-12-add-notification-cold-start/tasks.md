## 1. Notification actions

- [x] 1.1 Tạo `src/features/feedback/notification-actions.ts`: `handleNotificationResponse(actionId)` — hydrate nếu chưa, reconcile(now), apply pause/skip/stop, navigate
- [x] 1.2 `_layout.tsx`: listener nền route qua helper; thêm useEffect cold-start dùng `getLastNotificationResponseAsync()`
- [x] 1.3 Platform: thêm `getLastNotificationResponse()` vào `NotificationsService` (types/native/web/mock)
- [x] 1.4 Navigate: active session → `/timer`, else → `/`

## 2. FGS dialog

- [x] 2.1 Settings: thêm `fgsDialogDismissed: boolean` (default false) + DEFAULT_SETTINGS
- [x] 2.2 `fgs-dialog.tsx` component root-level (kiểu RecoveryDialog): title + body + Mở Settings + Để sau
- [x] 2.3 Observability: lộ sự kiện missed-rate-high cho UI (getter trạng thái hoặc callback)
- [x] 2.4 `_layout.tsx`: mount FgsDialog; hiện khi missed-rate-high && !fgsDialogDismissed
- [x] 2.5 i18n keys: `fgs.*` — 12 ngôn ngữ

## 3. Kiểm tra

- [x] 3.1 Test: cold-start handler (mock getLastNotificationResponse, verify reconcile + action + navigate)
- [x] 3.2 `npx tsc --noEmit` sạch
- [x] 3.3 `npx jest` xanh
