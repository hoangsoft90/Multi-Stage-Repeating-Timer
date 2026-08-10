## Purpose

Capability `onboarding` định nghĩa luồng chào đầu tiên 3 bước: welcome → chọn mục tiêu → template khởi điểm. Hiển thị đúng một lần (cho tới khi user hoàn thành/skip), không xin permission, không chặn quyền truy cập app sau khi hoàn thành.

## ADDED Requirements

### Requirement: Hiển thị onboarding lần đầu
Khi user mở app lần đầu và `settings.onboardingDone = false`, hệ thống SHALL hiển thị màn onboarding trước Home. Sau khi user hoàn thành hoặc skip, hệ thống SHALL set `onboardingDone = true` (persist) và KHÔNG hiển thị lại.

#### Scenario: Mở app lần đầu
- **WHEN** user mở app lần đầu (onboardingDone = false)
- **THEN** app hiển thị màn onboarding bước 1 (Welcome)

#### Scenario: Sau khi hoàn thành
- **WHEN** user hoàn thành/skip onboarding và mở lại app
- **THEN** app vào thẳng Home, không hiện onboarding

### Requirement: 3 bước onboarding
Onboarding SHALL có 3 bước theo thứ tự: (1) Welcome — value prop 1 dòng + logo; (2) Mục tiêu — chọn 1 trong 3: Tập luyện / Học tập / Làm việc; (3) Template khởi điểm — gợi ý template theo mục tiêu (Workout → HIIT 40/20, Study → Pomodoro, Work → Work/Break 60/10) với nút Start và nút "Để sau". User SHALL có thể đi lùi giữa các bước và skip toàn bộ.

#### Scenario: Đi qua 3 bước
- **WHEN** user mở onboarding, bấm Next ở bước 1, chọn mục tiêu ở bước 2
- **THEN** bước 3 hiển thị template gợi ý theo mục tiêu đã chọn

#### Scenario: Skip
- **WHEN** user bấm Skip ở bất kỳ bước nào
- **THEN** onboarding đóng, về Home, không hiện lại (onboardingDone = true)

### Requirement: Start template từ onboarding
Nút "Bắt đầu" ở bước 3 SHALL start template gợi ý ngay (kèm permission just-in-time như Start thường) và điều hướng tới màn Timer.

#### Scenario: Start từ onboarding
- **WHEN** user bấm Bắt đầu trên template gợi ý ở bước 3
- **THEN** template được start và app chuyển tới màn Timer Running

### Requirement: Không xin permission trong onboarding
Onboarding SHALL KHÔNG gọi bất kỳ yêu cầu permission nào (POST_NOTIFICATIONS / SCHEDULE_EXACT_ALARM / ATT). Các permission chỉ xin theo flow hiện có (tạo timer đầu / Start lần đầu).

#### Scenario: Không có dialog permission
- **WHEN** user đang ở onboarding
- **THEN** không có dialog permission nào xuất hiện
