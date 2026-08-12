# Design: add-settings-ux-and-user-guidance

## Context

- `src/app/settings.tsx`: Row component dùng `Pressable` với `disabled={!onPress}` — row bị khóa khi không có handler → "Background accuracy" không bấm được do `alarmExact` luôn `true`.
- `src/platform/impl.native.ts`: `canScheduleExactAlarm()` cố gọi `Notifications.canScheduleExactAlarms` — API **không tồn tại** trong expo-notifications SDK 57 → fallback trả `true` (sai trên Android 13+ deny mặc định).
- `src/features/monetization/consent.ts` + `platform` consent service: `showPrivacyOptionsForm()` yêu cầu UMP form đã load (qua `gatherConsent()`/`requestInfoUpdate`) — gọi trực tiếp khi chưa gather → fail im lặng.
- `src/components/action-menu.tsx`: card không có scroll — 13 item + Cancel tràn màn hình nhỏ.
- `src/features/feedback/notification-actions.ts` + `NativeNotifications` listener: chỉ xử lý 7 action id đã biết; DEFAULT body-tap bị bỏ qua (live) và lọc bỏ (cold start).
- `src/core/storage/repos.ts`: `Settings` có `onboardingDone`, `fgsDialogDismissed` — precedent field additive.
- `expo-alarms` trên npm 1.5.1 là package scaffold third-party (chứa `multiply()` boilerplate) — **KHÔNG dùng**; revert để tránh rủi ro.

## Goals / Non-Goals

- **Goals**: (1) mọi action row ở Settings phản hồi hoặc giải thích được, menu dài cuộn được; (2) body-tap notification mở màn timer; (3) chế độ test ads an toàn; (4) hệ thống guide nhẹ (badge/tooltip/guide line) dẫn dắt user mới.
- **Non-Goals**: không đổi engine/model timer; không thêm dependency native mới (đặc biệt không thêm expo-alarms); không thay đổi hành vi action button notification; không thêm onboarding mới (guide chạy SAU onboarding).

## Decisions

1. **Scroll cho ActionMenu**: bọc item list trong `ScrollView` với `maxHeight = min(55% window, 420)`; title + Cancel nằm ngoài scroll (luôn thấy). Lý do: không cần thư viện, hoạt động mọi platform, item cuối không bị cắt. (Cân nhắc `Modal` + flex layout — phức tạp hơn, không cần thiết.)
2. **Exact alarm**: `canScheduleExactAlarm()` fallback `true` → `false` khi API vắng mặt (bảo thủ, đúng Android 13+); row luôn có `onPress` mở `REQUEST_SCHEDULE_EXACT_ALARM`; refresh trạng thái bằng `useFocusEffect` (thay `useEffect([])`) để cập nhật sau khi về từ cài đặt hệ thống. Trade-off: expo-notifications không expose JS API đọc trạng thái → sau khi cấp quyền, label vẫn "May be delayed" (không thể đọc chính xác); row vẫn là điểm hành động duy nhất. Không dùng `expo-alarms` (package không đáng tin cậy, cần native rebuild).
3. **Privacy options**: handler `onPrivacyOptions()` gọi `consent.gatherConsent()` trước (idempotent), rồi `showPrivacyOptionsForm()`; nếu `false`/throw → `alertAsync(privacyUnavailable, privacyUnavailableBody)`. Lý do: form UMP chỉ tồn tại sau khi gather; thông báo rõ lý do thay vì fail im lặng.
4. **Chevron affordance**: Row tự render `chevron-forward` khi `onPress && !control`; value thêm `numberOfLines={1}` + `flexShrink`. Lý do: phân biệt row bấm được/không bấm được trực quan, không cần prop mới.
5. **Notification open**: thêm hằng số chuẩn hóa `'open'` — listener map `DEFAULT_ACTION_IDENTIFIER` → `handler('open', id)`; `getLastNotificationResponse()` trả `{ actionId: 'open' }` thay vì null; `handleNotificationAction('open')` → `'/timer'`. Giữ comment cross-reference giữa `impl.native.ts` và `notification-actions.ts` để 2 hằng số `'open'` không lệch. Lý do: body-tap cần mở timer cả live lẫn cold start; `/timer` tự redirect Home khi idle nên an toàn.
6. **TEST_ADS**: flag `const TEST_ADS = true` trong `ads-config.ts`; `resolveUnitId()` trả `testId` ngay khi bật. Real IDs giữ nguyên trong `REAL_UNIT_IDS` → chuyển live chỉ đổi flag + rebuild. (Test cũ được cập nhật để khớp contract mới.)
7. **Guide system — thiết kế nhẹ, không overlay đo vị trí**: mỗi guide là component inline render ngay tại màn hình của nó (không global overlay, không `measure`) — bền trên mọi platform và dễ test. Trạng thái lưu `settings.guidesSeen: string[]` (additive). Hook `useGuides()` (`isSeen`/`complete`) đọc state qua `getState()` để tránh stale closure. Gate chung: `onboardingDone && !isSeen(id)`.
   - **GuideTooltip**: card inline (title + body + Skip/Got-it), có variant `compact` cho màn Timer (non-scroll) — kèm co ring `300→260` khi guide hiện để không tràn màn hình nhỏ (Redmi 9 ~640dp).
   - **GuideBadge**: chấm đỏ tuyệt đối trên icon header; `complete(id)` khi bấm icon.
   - Cân nhắc: spotlight overlay (che phần còn lại màn hình) — đẹp hơn nhưng cần đo lường + phức tạp, không xứng cho coach mark 1 lần.
8. **i18n**: 12 key mới × 12 file, vi.ts là source of truth, các file khác dùng `satisfies Record<keyof typeof vi, string>` (key-parity compile-time).

## Risks / Trade-offs

- [Label exact alarm không chính xác sau khi cấp quyền (không đọc được state)] → Row luôn bấm được + refresh focus; bản thân màn hệ thống xác nhận trạng thái.
- [Tooltip màn Timer đẩy layout trên màn nhỏ] → variant compact + ring co 260; nếu vẫn tràn, content overflow không crash (chỉ ảnh hưởng tầm nhìn Stop trong 1 lần đầu).
- [2 hằng số `'open'` lệch nhau → body-tap ngừng mở timer] → comment cross-reference + test `handleNotificationAction('open')` bảo vệ phía handler.
- [Guide hiện thêm lần trong môi trường test (onboardingDone=true)] → chuỗi text guide dùng key riêng, không trùng chuỗi test đang assert; test suite xanh.
- [TEST_ADS quên tắt khi release] → flag có comment rõ "flip to false only when ready"; real IDs hợp lệ sẵn.

## Migration Plan

- `Settings.guidesSeen` additive — settings cũ (không có field) đọc về `[]` qua spread default, không cần migrate. Không đổi bất kỳ model/engine nào khác.
- Rollback: revert commit (thay đổi độc lập từng phần; guide có thể tắt bằng cách set `guidesSeen` đầy đủ hoặc xóa khối guide).
