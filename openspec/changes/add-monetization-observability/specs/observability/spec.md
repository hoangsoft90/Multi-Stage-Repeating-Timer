## Purpose

Capability `observability` định nghĩa việc thu thập dữ liệu vận hành từ Day 1: Firebase Analytics + Crashlytics, danh sách metrics đã implement và quy tắc không chặn chức năng khi đo lường lỗi. Metrics này quyết định khi nào gợi ý bật FGS và tối ưu monetization.

## ADDED Requirements

### Requirement: Firebase Analytics + Crashlytics từ Day 1
Hệ thống SHALL khởi tạo Firebase Analytics và Crashlytics ở khởi động và log đúng event, đúng tham số. Mọi lỗi crash SHALL được ghi vào Crashlytics. Khởi tạo/lỗi Firebase SHALL không chặn app chạy.

#### Scenario: Crash được ghi
- **WHEN** app gặp exception không bắt được
- **THEN** Crashlytics ghi lại stack trace và app không bị treo vô hạn

#### Scenario: Firebase init lỗi
- **WHEN** Firebase khởi tạo thất bại (không network, cấu hình sai)
- **THEN** app vẫn chạy bình thường, chỉ mất tính năng đo lường

### Requirement: Metrics chuẩn
Hệ thống SHALL log các metrics sau (trạng thái thực tế trong code):
- `stage_transition`: event có tham số `missed: boolean` — transition đúng giờ vs bị trễ (reconcile bắt kịp ≥ 1 stage bị missed); từ đó tính `missed_transition_rate` trên thiết bị; khi rate > ngưỡng Remote Config 0.15 → log `missed_transition_rate_high` (rate) và kích hoạt gợi ý FGS dialog (fgs-trigger).
- `ad_shown`: với tham số placement (banner/interstitial/app_open/rewarded) và `shown: false` khi load fail (kèm reason cho banner).
- `rewarded_unlock`: với `hours` khi user xem xong Rewarded ad.
- `permission_denied`: type = notification khi user từ chối POST_NOTIFICATIONS.
- `permission_requested`: type = exact_alarm khi mở màn cấp quyền SCHEDULE_EXACT_ALARM.
- `att_prompt_shown`: sau khi user trả lời ATT prompt (chưa kèm trạng thái chi tiết).

> ⚠️ Các metric `timer_started`, `ad_clicked`, `att_status` (trạng thái ATT chi tiết) đã nêu trong thiết kế gốc nhưng **chưa implement** — defer (ghi rõ trong tasks).

#### Scenario: Log stage_transition missed
- **WHEN** reconcile bắt kịp 1+ stage bị missed
- **THEN** hệ thống log `stage_transition` với missed=true; rate cao → `missed_transition_rate_high` + gợi ý FGS

#### Scenario: Log ad_shown khi fail
- **WHEN** interstitial load fail do không có internet
- **THEN** hệ thống log `ad_shown` với placement=interstitial, shown=false

#### Scenario: Log permission_denied tách loại
- **WHEN** user từ chối POST_NOTIFICATIONS
- **THEN** hệ thống log permission_denied với type = notification (không trộn với exact_alarm — exact_alarm chỉ log `permission_requested` khi mở màn cấp quyền)

### Requirement: Đo lường không chặn chức năng
Mọi service đo lường SHALL chạy không đồng bộ, không blocking UI/timer; lỗi logging SHALL được nuốt (swallow) và không crash.

#### Scenario: Analytics chậm
- **WHEN** logging analytics bị chậm/treo
- **THEN** timer và UI vẫn chạy bình thường

### Requirement: Dữ liệu cho gợi ý FGS
Hệ thống SHALL lưu `missed_transition_rate` đo được trên thiết bị và so sánh với ngưỡng Remote Config `missed_transition_rate_threshold` (0.15) để quyết định có gợi ý "Keep timer alive" (FGS) hay không.

#### Scenario: Rate vượt ngưỡng
- **WHEN** missed_transition_rate trên thiết bị > 0.15
- **THEN** hệ thống đủ điều kiện gợi ý bật FGS (theo capability background-scheduling)
