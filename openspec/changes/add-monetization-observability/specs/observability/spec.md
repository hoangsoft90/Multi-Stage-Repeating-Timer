## Purpose

Capability `observability` định nghĩa việc thu thập dữ liệu vận hành từ Day 1: Firebase Analytics + Crashlytics, danh sách metrics chuẩn (missed_transition_rate, ad_shown/clicked, permission_denied, timer_started, att_status) và quy tắc không chặn chức năng khi đo lường lỗi. Metrics này quyết định khi nào gợi ý bật FGS (Phase 2) và tối ưu monetization.

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
Hệ thống SHALL log các metrics sau:
- `missed_transition_rate`: tỷ lệ transition bị trễ/bỏ lỡ so với đúng giờ — tính theo lượt reconcile bắt kịp ≥ 1 stage bị missed; ngưỡng 0.15 dùng để gợi ý FGS (Remote Config).
- `ad_shown` / `ad_clicked`: với tham số placement (app_open/interstitial/native/rewarded) và kết quả.
- `permission_denied`: tách riêng theo loại permission (notification / exact_alarm / boot).
- `timer_started`: với preset_id, repeat_mode, số stage, duration tổng.
- `att_status`: trạng thái ATT (authorized/denied/restricted/notDetermined) sau khi user trả lời.

#### Scenario: Log timer_started
- **WHEN** user start một session
- **THEN** hệ thống log event timer_started với đúng preset_id, repeat_mode, số stage, tổng duration

#### Scenario: Log missed_transition_rate
- **WHEN** reconcile bắt kịp 1+ stage bị missed
- **THEN** hệ thống log missed transition để tính rate trên thiết bị

#### Scenario: Log permission_denied tách loại
- **WHEN** user từ chối POST_NOTIFICATIONS
- **THEN** hệ thống log permission_denied với type = notification (không trộn với exact_alarm)

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
