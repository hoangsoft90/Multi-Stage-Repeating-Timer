## Purpose

Capability `home-widget` định nghĩa nguồn dữ liệu cho home-screen widget: hệ thống luôn duy trì một snapshot timer hiện tại (stage, round, remaining, endsAt, status, presetId) tại nơi widget đọc được, và widget (native extension — ngoài JS foundation) hiển thị trạng thái + quick start qua deep-link. JS foundation: snapshot writer + bridge; native: cần EAS dev build.

## ADDED Requirements

### Requirement: Duy trì timer snapshot
Hệ thống SHALL cập nhật snapshot timer (presetName, stageName, stageIndex, totalStages, round, totalRounds, remainingMs, stageEndsAt, status, presetId) mỗi khi có transition event (StageStarted / SessionResumed / SessionPaused) và khi session start/restart; terminal event (SessionStopped / SessionCompleted) xóa snapshot (null). Không sync theo tick 250ms — snapshot chứa `stageEndsAt` tuyệt đối nên widget native tự tính countdown từ mốc đó (xem design.md).

#### Scenario: Stage bắt đầu
- **WHEN** session start và StageStarted emit
- **THEN** snapshot ghi nhận stage mới (tên + remaining + endsAt)

#### Scenario: Session dừng
- **WHEN** user stop session (SessionStopped)
- **THEN** snapshot bị xóa (null) — widget không hiển thị timer không tồn tại

### Requirement: Snapshot thuần và test được
Snapshot SHALL được xây từ `buildTimerSnapshot(engineState, session)` — hàm thuần, test Jest deterministic (giống engine).

#### Scenario: Build snapshot
- **WHEN** engine đang RUNNING stage WORK round 2/5, remaining 30s
- **THEN** snapshot có stageName=WORK, round=2, totalRounds=5, remainingMs=30000, status=running

### Requirement: Widget hiển thị trạng thái timer (native)
Trên Android/iOS, widget (native extension) SHALL hiển thị trạng thái timer hiện tại từ snapshot: tên stage, countdown, round, và nút/tap để mở app hoặc quick-start preset (deep-link `looptimer:///?start=<presetId>`). Phần native này yêu cầu EAS dev build (expo-widgets alpha hoặc native AppWidgetProvider) — ngoài phạm vi JS foundation.

#### Scenario: Widget hiển thị stage
- **WHEN** timer đang chạy và widget được đặt trên home screen
- **THEN** widget hiển thị stage hiện tại + countdown còn lại từ snapshot

#### Scenario: Tap widget
- **WHEN** user chạm widget
- **THEN** app mở đúng màn (timer nếu đang chạy; Home nếu không) — qua deep-link

### Requirement: Web no-op
Trên web, widget SHALL không có hiệu lực (web không có home-screen widget) — snapshot writer vẫn hoạt động vô hại hoặc no-op.

#### Scenario: Web
- **WHEN** app chạy trên web
- **THEN** không có lỗi nào từ widget bridge (no-op)
