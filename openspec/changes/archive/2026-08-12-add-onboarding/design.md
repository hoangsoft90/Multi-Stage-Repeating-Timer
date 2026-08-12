# Design: add-onboarding

## Context

Settings store + SettingsRepo (AsyncStorage) có sẵn. Route file-based expo-router. Templates built-in có sẵn (BUILTIN_TEMPLATES).

## Decisions

1. **Flag `onboardingDone: boolean` (default false)** thêm vào `Settings` — additive với default, không cần bump schema.
2. **Route `/onboarding`** (`src/app/onboarding.tsx`) — 1 screen 3 bước dùng state local (step index), không tạo 3 route riêng.
3. **Redirect trong `_layout.tsx`**: khi `ready && !settings.onboardingDone` và route hiện tại khác /onboarding → `router.replace('/onboarding')`. Sau khi hoàn thành → `router.replace('/')`. Tránh loop bằng điều kiện route hiện tại.
4. **Bước 3 start thẳng**: dùng `useTimerStore.startPreset(template)` (template là Preset hợp lệ) rồi `router.replace('/timer')` — tái dùng flow hiện có (kèm permission just-in-time).
5. **Mục tiêu lưu không bắt buộc** — chỉ để gợi ý template, không persist (đơn giản; hoặc persist `onboardingGoal` optional nếu rẻ).

## Risks / Trade-offs

- **Redirect loop** → chỉ redirect khi route != '/onboarding' và chưa done.
- **Test vỡ vì redirect** → _layout chỉ redirect khi chưa done; test render từng screen riêng (không qua layout).
- **Start thẳng template** → template WORK/BREAK là forever — OK (giống deep-link quick start hiện có).

## Migration Plan

Không cần migration (flag mới default false).
