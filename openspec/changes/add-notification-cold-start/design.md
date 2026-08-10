# Design: add-notification-cold-start

## Context

`_layout.tsx` hiện đăng ký `addNotificationResponseReceivedListener` trong một `useEffect` chạy khi `ready === true`. Khi app bị kill, listener này không thể nhận response đã đến (listener chỉ đăng ký sau khi app đã mount + hydrate). expo-notifications cung cấp `getLastNotificationResponseAsync()` để lấy response tồn đọng ngay sau khi app mở lên từ notification tap.

Observability đã track `stage_transition` với `missed: boolean` và `missed_transition_rate_high` khi vượt ngưỡng — nhưng chưa có UI opt-in FGS.

## Decisions

1. **`handleNotificationResponse(actionId)` — helper dùng chung** trong `src/features/feedback/notification-actions.ts`: nhận `'pause' | 'skip' | 'stop'`, đảm bảo store đã hydrate (nếu `!ready` → gọi `useBootstrap` tương đương qua `initFromStorage`/`load`), `engine.reconcile(Date.now())`, apply action, điều hướng: active session → `/timer`, else → `/`.
2. **Listener + last-response đều route qua helper** — `_layout.tsx`:
   - Listener (khi app nền): như cũ, nhưng gọi helper.
   - Cold start: `useEffect` một lần → `getLastNotificationResponseAsync()` → nếu có action hợp lệ → helper.
3. **`actionIdentifier` mapping**: `'pause' | 'skip' | 'stop'` là category identifier của `timer_controls`; response khác (tap thân notification) → không apply action, chỉ navigate.
4. **FGS dialog**: component `fgs-dialog.tsx` root-level (kiểu RecoveryDialog). Hiện khi: `observability` báo missed rate cao (log event `missed_transition_rate_high`) VÀ `settings.fgsDialogDismissed === false`. Nút "Mở Settings" → `router.push('/settings')` + dismiss; nút "Để sau" → dismiss 1 lần (persist). Không hiện lại sau dismiss.
5. **Settings thêm cờ** `fgsDialogDismissed: boolean` (default false — additive, không bump schema).

## Risks / Trade-offs

- `getLastNotificationResponseAsync` trả về `null` nếu app không mở từ notification — vô hại.
- FGS thật cần config plugin native (expo-background-task / expo-task-manager) — dialog + đo lường là phần JS; native ghi rõ cần EAS build.
- Tránh hiện dialog spam: chỉ hiện sau sự kiện missed-rate-high gần nhất, dismiss persist.
