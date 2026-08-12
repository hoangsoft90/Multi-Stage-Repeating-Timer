# Tasks: add-settings-ux-and-user-guidance

> Trạng thái: toàn bộ task đã hoàn thành trong commit `6e603dc` (đã push main, CI build đang chạy). Đánh dấu `[x]` để ghi nhận thực trạng.

## 1. Settings UX

- [x] 1.1 ActionMenu bọc item list trong ScrollView (maxHeight min(55% window, 420)) — title/Cancel ngoài scroll — `src/components/action-menu.tsx`
- [x] 1.2 Privacy options: handler `onPrivacyOptions()` gọi `gatherConsent()` trước `showPrivacyOptionsForm()`; nếu fail → alert `settings.privacyUnavailable*` — `src/app/settings.tsx`
- [x] 1.3 Row "Background accuracy" luôn tappable → mở `REQUEST_SCHEDULE_EXACT_ALARM` — `src/app/settings.tsx`
- [x] 1.4 Refresh trạng thái permissions bằng `useFocusEffect` (thay `useEffect([])`) — `src/app/settings.tsx`
- [x] 1.5 Chevron affordance cho row có onPress && !control + value numberOfLines — `src/app/settings.tsx`
- [x] 1.6 `canScheduleExactAlarm()` fallback `true` → `false` khi API vắng mặt — `src/platform/impl.native.ts`

## 2. Notification tap → timer

- [x] 2.1 Listener map `DEFAULT_ACTION_IDENTIFIER` → action `'open'` (live) — `src/platform/impl.native.ts`
- [x] 2.2 `getLastNotificationResponse()` trả `{ actionId: 'open' }` cho body-tap (cold start) — `src/platform/impl.native.ts`
- [x] 2.3 `handleNotificationAction('open')` → `/timer` — `src/features/feedback/notification-actions.ts`
- [x] 2.4 Test: body-tap live + cold start → `/timer` — `src/features/feedback/__tests__/notification-actions.test.ts`

## 3. Test ads mode

- [x] 3.1 Flag `TEST_ADS = true` + `resolveUnitId()` trả test id khi bật — `src/features/monetization/ads-config.ts`
- [x] 3.2 Cập nhật test ads-config cho contract mới — `src/features/monetization/__tests__/ads-config.test.ts`

## 4. User guidance

- [x] 4.1 Setting `guidesSeen: string[]` + default `[]` — `src/core/storage/repos.ts`
- [x] 4.2 Hook `useGuides()` (`isSeen`/`complete`) — `src/hooks/use-guides.ts`
- [x] 4.3 Components `GuideTooltip` (kèm variant compact) + `GuideBadge` — `src/components/guide/`
- [x] 4.4 Home: badge icon Templates/Stats/Settings + tooltip "home-start" + card "Timer đang chạy" — `src/app/index.tsx`
- [x] 4.5 Timer: tooltip compact điều khiển + ring co 300→260 khi guide hiện — `src/app/timer.tsx`
- [x] 4.6 Settings: guide line giải thích Permissions — `src/app/settings.tsx`

## 5. i18n

- [x] 5.1 12 key mới (`guide.*`, `home.runningTitle/Open`, `settings.privacyUnavailable*`) đủ 12 ngôn ngữ

## 6. Kiểm tra JS

- [x] 6.1 `npx tsc --noEmit` sạch · `npx jest` xanh (29 suites / 287 tests) · đã push `6e603dc` → GH Actions build
