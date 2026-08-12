# exact-alarm-ask-once Specification

## Purpose
Capability `exact-alarm-ask-once` đảm bảo màn hình hệ thống "Alarms & reminders" (special access `SCHEDULE_EXACT_ALARM`) chỉ được mở **đúng 1 lần mỗi lần cài đặt**, dù user vào bằng đường nào: Settings > Background accuracy hoặc just-in-time lúc Start — không prompt trùng lặp.
## Requirements
### Requirement: Mở từ Settings đánh dấu "đã hỏi"

Trên Android, khi user bấm row "Background accuracy" trong Settings, hệ thống SHALL mở màn hình "Alarms & reminders" VÀ đánh dấu cờ once-per-install (`looptimer:exact-alarm-asked`) — lần Start đầu tiên sau đó không mở lại màn hình này.

#### Scenario: Settings trước, Start sau
- **WHEN** user bấm row "Background accuracy" (mở system screen), quay lại app, rồi nhấn Start lần đầu tiên
- **THEN** timer bắt đầu và KHÔNG nhảy lại màn hình "Alarms & reminders"

#### Scenario: Launch thất bại không đốt cờ
- **WHEN** nỗ lực mở màn hình hệ thống thất bại (intent không xử lý được)
- **THEN** cờ once-per-install KHÔNG được set — lần Start đầu vẫn còn cơ hội hỏi lại

### Requirement: Just-in-time Start tôn trọng cờ

Khi user Start timer lần đầu, hệ thống SHALL chỉ mở màn hình "Alarms & reminders" nếu cờ once-per-install chưa được set; nếu đã set (từ Settings hoặc Start trước) → degrade im lặng về inexact scheduling, không mở lại màn hình.

#### Scenario: Start đầu tiên chưa từng hỏi
- **WHEN** user Start timer lần đầu (chưa từng mở màn hình exact alarm từ bất kỳ đường nào)
- **THEN** mở màn hình "Alarms & reminders" đúng 1 lần rồi vào timer

#### Scenario: Đã hỏi rồi Start lại
- **WHEN** cờ once-per-install đã được set (Settings hoặc Start trước đó)
- **THEN** Start không mở lại màn hình hệ thống

