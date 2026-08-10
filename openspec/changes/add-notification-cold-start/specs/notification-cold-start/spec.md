## Purpose

Capability `notification-cold-start` xử lý notification actions (Pause/Skip/Stop) khi app bị kill và cung cấp dialog opt-in FGS "Keep timer alive" khi phát hiện missed transitions cao. Đây là technical debt P0 — điều kiện tiên quyết cho Scheduled Routine (cùng cơ chế notification-response).

## ADDED Requirements

### Requirement: Xử lý notification action khi app bị kill
Khi app mở lên từ một notification tap với action `pause`/`skip`/`stop` (app process đã bị kill), hệ thống SHALL hydrate store từ AsyncStorage (nếu chưa), gọi `reconcile(now)` để xác định trạng thái đúng, apply action, persist, và điều hướng tới `/timer` nếu còn active session, ngược lại tới `/`.

#### Scenario: Tap Stop khi app bị kill
- **WHEN** app bị kill, session đang chạy, user tap Stop trên notification
- **THEN** app mở lên, session được stop (persist cleared), điều hướng về Home

#### Scenario: Tap Pause khi app bị kill
- **WHEN** app bị kill, session đang chạy, user tap Pause trên notification
- **THEN** session chuyển sang paused và app mở màn Timer

#### Scenario: App mở bình thường (không từ notification)
- **WHEN** user mở app trực tiếp
- **THEN** không có action nào được apply (last response null) — flow thường giữ nguyên

### Requirement: Reconcile trước khi apply
Trước khi apply action từ cold-start, hệ thống SHALL `reconcile(now)` để các stage đã expired được xử lý đúng (không apply action lên trạng thái lỗi thời).

#### Scenario: Stage đã hết khi app mở lại
- **WHEN** app bị kill lâu, nhiều stage đã chuyển xong, user tap Pause
- **THEN** engine reconcile về trạng thái đúng hiện tại trước khi pause

### Requirement: FGS dialog opt-in
Khi phát hiện missed transition rate vượt ngưỡng Remote Config `missed_transition_rate_threshold` (mặc định 0.15), hệ thống SHALL hiện dialog "Keep timer alive" (tối đa cho tới khi user dismiss; dismiss persist qua `settings.fgsDialogDismissed`). Dialog gồm: giải thích ngắn, nút "Mở Settings" và nút "Để sau".

#### Scenario: Missed rate cao
- **WHEN** app ghi nhận missed_transition_rate_high
- **THEN** dialog FGS hiển thị 1 lần, nút Mở Settings điều hướng tới Settings

#### Scenario: Đã dismiss
- **WHEN** user đã dismiss dialog FGS trước đó
- **THEN** dialog không hiện lại (cờ persist)

### Requirement: Không chặn flow chính
Cold-start action và FGS dialog SHALL không bao giờ crash/chặn bootstrap; mọi lỗi (storage, reconcile) bị nuốt.

#### Scenario: Storage lỗi
- **WHEN** AsyncStorage không đọc được khi cold-start
- **THEN** app vẫn mở bình thường, không crash, không apply action
