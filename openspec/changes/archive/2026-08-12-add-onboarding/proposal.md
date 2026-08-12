# Proposal: add-onboarding — Onboarding 3 bước

## Vấn đề

App hiện không có onboarding: user mở app lần đầu thấy ngay Home. Activation có thể được cải thiện bằng màn chào đầu tiên ngắn giúp user hiểu value prop và chọn mục tiêu — đưa tới template phù hợp ngay.

## Giải pháp

- **3 bước ngắn** (route `/onboarding`, hiện khi `settings.onboardingDone === false`):
  1. **Welcome**: logo + 1 dòng value prop ("Create → Start once → Leave phone alone").
  2. **Mục tiêu**: chọn 1 trong 3 (Tập luyện / Học tập / Làm việc) — gợi ý template phù hợp ở bước 3.
  3. **Template khởi điểm**: gợi ý template theo mục tiêu (Workout → HIIT 40/20; Study → Pomodoro; Work → Work/Break 60/10) + nút "Bắt đầu" (start thẳng) và "Để sau" (về Home).
- **KHÔNG xin permission ở đây** (đúng spec permissions: POST_NOTIFICATIONS khi tạo timer đầu, SCHEDULE_EXACT_ALARM lúc Start).
- Hoàn thành/skip → set `onboardingDone: true` persist, lần sau không hiện nữa.

## Non-goals

- Không xin permission trong onboarding.
- Không làm tutorial chi tiết từng màn hình.
