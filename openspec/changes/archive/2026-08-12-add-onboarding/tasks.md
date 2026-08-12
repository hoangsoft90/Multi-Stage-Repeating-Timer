## 1. Settings

- [x] 1.1 Thêm `onboardingDone: boolean` (default false) vào `Settings` + `DEFAULT_SETTINGS`

## 2. Screen

- [x] 2.1 Tạo `src/app/onboarding.tsx`: 3 bước (welcome / goal / template), điều hướng Next/Back/Skip
- [x] 2.2 Bước 3: gợi ý template theo goal + nút Bắt đầu (startPreset + router.replace('/timer')) + "Để sau"
- [x] 2.3 Hoàn thành/skip → set onboardingDone + router.replace('/')

## 3. Redirect

- [x] 3.1 _layout.tsx: khi ready && !onboardingDone && route != '/onboarding' → replace('/onboarding')

## 4. i18n

- [x] 4.1 Keys: `onboarding.welcomeTitle`, `onboarding.welcomeBody`, `onboarding.goalTitle`, `onboarding.goalWorkout/Study/Work`, `onboarding.templateTitle`, `onboarding.start`, `onboarding.later`, `onboarding.skip`, `onboarding.next`, `onboarding.back` — 12 ngôn ngữ

## 5. Kiểm tra

- [x] 5.1 `npx tsc --noEmit` sạch
- [x] 5.2 `npx jest` xanh
- [x] 5.3 Test onboarding: hiện lần đầu, skip không hiện lại, start template điều hướng
