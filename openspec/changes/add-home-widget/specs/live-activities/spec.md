## Purpose

Capability `live-activities` định nghĩa hiển thị timer trên iOS Lock Screen / Dynamic Island qua ActivityKit — giải quyết triệt để giới hạn 50-notification khi app bị treo lâu: countdown luôn nhìn thấy trên lock screen, cập nhật qua ActivityKit (ActivityKit binding). Yêu cầu widget extension target + App Groups → EAS dev build. JS foundation: LiveActivityBridge contract + cùng TimerSnapshot.

## ADDED Requirements

### Requirement: Live Activity khi session chạy (iOS)
Trên iOS (device có ActivityKit — iOS 16.1+), khi session chạy, hệ thống SHALL start một Live Activity hiển thị: tên stage, countdown, round. Activity SHALL cập nhật qua cùng nhánh `syncWidgets` (StageStarted / SessionResumed / SessionPaused) và kết thúc (end) khi session completed/stopped. Nền tảng khác (Android/web) SHALL no-op.

#### Scenario: Session chạy trên iOS
- **WHEN** session RUNNING trên iOS 16.1+
- **THEN** Live Activity hiển thị stage + countdown trên Lock Screen / Dynamic Island

#### Scenario: Cập nhật khi đổi stage
- **WHEN** stage chuyển từ WORK sang BREAK
- **THEN** Live Activity cập nhật tên stage + countdown mới

#### Scenario: Kết thúc activity
- **WHEN** session completed/stopped
- **THEN** Live Activity kết thúc và biến mất khỏi Lock Screen

### Requirement: Không vi phạm giới hạn notification
Live Activity SHALL là kênh hiển thị độc lập — việc cập nhật không phụ thuộc vào việc user mở app, không bị giới hạn 50-notification.

#### Scenario: App treo lâu
- **WHEN** app bị treo > 50 phút trên iOS với session còn chạy
- **THEN** Live Activity vẫn hiển thị trạng thái timer (không bị giới hạn 50-notif)

### Requirement: JS foundation test được
Hệ thống SHALL có `LiveActivityBridge` (platform service, no-op ban đầu ngoài iOS) + `buildTimerSnapshot` dùng chung — contract rõ ràng để phase native implement không đổi JS layer.

#### Scenario: Bridge no-op ngoài iOS
- **WHEN** app chạy trên Android hoặc web
- **THEN** LiveActivityBridge no-op, không lỗi
