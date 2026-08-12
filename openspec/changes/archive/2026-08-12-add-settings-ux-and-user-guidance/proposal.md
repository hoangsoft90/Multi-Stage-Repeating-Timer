# Proposal: add-settings-ux-and-user-guidance — Settings UX + dẫn dắt người dùng

## Why

User test trên máy thật báo 4 lỗi UX ở Settings (language picker không cuộn được, "privacy options" và "background accuracy" bấm không phản ứng) và app chưa có hướng dẫn cho người mới — người dùng bị ngợp vì không biết bắt đầu từ đâu, vì sao một tính năng không dùng được và dùng như thế nào. Đồng thời bấm vào notification chỉ mở về Home (không phải màn timer) và ads đang chạy real unit ID dễ bị AdMob giới hạn trong giai đoạn test.

## What Changes

- **Settings UX** (`src/app/settings.tsx`, `src/components/action-menu.tsx`, `src/platform/impl.native.ts`):
  - `ActionMenu` bọc danh sách item trong `ScrollView` (max 55% màn hình, Cancel luôn hiện) → language picker 13 mục cuộn được.
  - Row "Privacy options": gọi `gatherConsent()` trước khi `showPrivacyOptionsForm()`; nếu form không khả dụng → alert thân thiện (trước đây fail im lặng = "bấm không được").
  - Row "Background accuracy": **luôn bấm được** → mở màn hình hệ thống `REQUEST_SCHEDULE_EXACT_ALARM`; trạng thái tự refresh bằng `useFocusEffect` khi quay lại từ cài đặt hệ thống (trước đây row bị `disabled` vì `canScheduleExactAlarm()` luôn trả `true` do expo-notifications không expose API này).
  - `canScheduleExactAlarm()` đổi fallback mặc định `true` → `false` (Android 13+ deny theo mặc định — giữ row actionable).
  - Mọi row bấm được hiện **chevron** (affordance) + value `numberOfLines={1}`.
- **Notification tap → timer** (`src/platform/impl.native.ts`, `src/features/feedback/notification-actions.ts`): body-tap notification (DEFAULT_ACTION_IDENTIFIER) được chuẩn hóa thành action `'open'` → navigate `/timer` — cả live listener lẫn cold start (`getLastNotificationResponse`). Trước đây body-tap bị bỏ qua (về Home).
- **Test ads mode** (`src/features/monetization/ads-config.ts`): flag `TEST_ADS = true` → `resolveUnitId()` luôn trả Google test unit ID (quảng cáo "Test Ad", không revenue, tránh AdMob giới hạn). Tắt flag là chạy real ID.
- **User guidance (badge + guide line + tooltip)**:
  - Setting mới `guidesSeen: string[]` (additive, không phá schema cũ) + hook `useGuides()` (`src/hooks/use-guides.ts`) + component `GuideTooltip` / `GuideBadge` (`src/components/guide/`).
  - Home: chấm đỏ badge trên icon Templates/Stats/Settings (mất khi user bấm vào) + tooltip "Bắt đầu ngay" cho lần đầu + card "Timer đang chạy" khi session active (mở lại `/timer` ngay).
  - Timer: tooltip compact giải thích Pause/Skip/Stop + "rời màn hình KHÔNG dừng timer" (ring co 300→260 khi guide hiện để không tràn màn hình nhỏ).
  - Settings: khối giải thích "Quyền hạn — vì sao cần + bấm row để mở cài đặt hệ thống".
  - Toàn bộ guide gated trên `onboardingDone` (không hiện trong luồng onboarding lần đầu).
- **i18n ×12**: 12 key mới (`guide.*`, `home.running*`, `settings.privacyUnavailable*`) cho đủ 12 ngôn ngữ (key-parity ép kiểu compile).

## Capabilities

### New Capabilities

- `settings-ux`: hành vi Settings — language picker cuộn, row tappable, privacy options phản hồi, trạng thái exact-alarm.
- `user-guidance`: hệ thống dẫn dắt trong app — badge/tooltip/guide line, persist theo `guidesSeen`.
- `notification-open`: body-tap notification → mở màn timer (live + cold start).
- `test-ads-mode`: chế độ test ads bằng Google test unit ID.

### Modified Capabilities

- Không đổi requirement spec cũ.

## Impact

- Sửa: `src/app/settings.tsx`, `src/app/index.tsx`, `src/app/timer.tsx`, `src/components/action-menu.tsx`, `src/core/storage/repos.ts` (Settings + `guidesSeen`), `src/platform/impl.native.ts`, `src/features/feedback/notification-actions.ts`, `src/features/monetization/ads-config.ts`, i18n ×12.
- Mới: `src/hooks/use-guides.ts`, `src/components/guide/guide-tooltip.tsx`, `src/components/guide/guide-badge.tsx`.
- Không đổi model/engine/storage schema của timer. `guidesSeen` là field additive — settings cũ đọc an toàn (default `[]`).
