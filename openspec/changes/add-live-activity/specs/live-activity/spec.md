## Purpose

Capability `live-activity` định nghĩa hiển thị timer trên iOS Lock Screen / Dynamic Island qua ActivityKit (expo-widgets) — giải quyết triệt để giới hạn 50-notification iOS: Live Activity cập nhật realtime, độc lập notification queue. JS foundation (LiveActivityBridge + TimerSnapshot + syncWidgets) đã có từ `add-home-widget`; change này implement native layer (iOS) và mapping helper.

## ADDED Requirements

### Requirement: Live Activity khi session chạy (iOS 16.1+)
Trên iOS (device có ActivityKit, iOS 16.1+), khi session chạy, hệ thống SHALL start một Live Activity hiển thị: stage name, countdown (tự đếm ngược từ `stageEndsAt` tuyệt đối), round (`x/y`, forever → `∞`), và next stage (nếu có). Activity SHALL được cập nhật qua `LiveActivityBridge.update(snapshot)` khi timer-store emit transition (StageStarted / SessionResumed / SessionPaused) trong `syncWidgets()`. Activity SHALL kết thúc (end) khi session completed/stopped (terminal event). Nền tảng khác (Android/web) SHALL no-op (giữ hành vi bridge hiện tại).

#### Scenario: Session chạy trên iOS
- **WHEN** session RUNNING trên iOS 16.1+
- **THEN** Live Activity hiển thị stage + countdown trên Lock Screen / Dynamic Island

#### Scenario: Cập nhật khi đổi stage
- **WHEN** stage chuyển từ WORK sang BREAK (StageStarted emit)
- **THEN** Live Activity cập nhật stage name + countdown mới

#### Scenario: Kết thúc activity
- **WHEN** session completed/stopped (terminal event)
- **THEN** Live Activity kết thúc và biến mất khỏi Lock Screen

### Requirement: Độc lập giới hạn notification
Live Activity SHALL hiển thị countdown realtime kể cả khi app bị treo lâu (không phụ thuộc notification queue, không bị ảnh hưởng bởi giới hạn 50 pending notification). Việc cập nhật Activity diễn ra qua ActivityKit API (local), không cần APNs push.

#### Scenario: App treo > 50 phút
- **WHEN** app bị treo > 50 phút trên iOS với session còn chạy
- **THEN** Live Activity vẫn hiển thị trạng thái timer (không bị giới hạn 50-notif)

### Requirement: Mapping thuần và test được
Mapping từ TimerSnapshot → Live Activity content state SHALL là hàm thuần `snapshotToActivityContent(snapshot)`, unit test deterministic.

#### Scenario: Build content state
- **WHEN** snapshot running stage WORK round 2/5 remaining 30s, nextStage BREAK
- **THEN** content state có stageName=WORK, remainingMs=30000, round=2, totalRounds=5, nextStageName=BREAK, status=running

### Requirement: No-op ngoài iOS / Expo Go
Trên Android / web / Expo Go, LiveActivityBridge SHALL no-op (không lỗi, không crash). expo-widgets chỉ khả dụng trong dev build iOS.

#### Scenario: Chạy trên web
- **WHEN** app chạy trên web
- **THEN** LiveActivityBridge no-op (giữ nguyên trạng thái hiện tại)

### Requirement: (Stretch) iOS home-screen widget
Cùng expo-widgets, hệ thống SHALL optionally khai báo 1 home-screen widget iOS (systemSmall/Medium) hiển thị timer snapshot — tái sử dụng cùng TimerSnapshot + layout logic. Không bắt buộc cho v1.4 (task riêng).

#### Scenario: Widget iOS home screen
- **WHEN** timer đang chạy và widget được đặt trên home screen iOS
- **THEN** widget hiển thị stage + countdown (WidgetKit tự update theo timeline)