## Purpose

Capability `forever-ui` đảm bảo Repeat Forever mode hiển thị rõ ràng trên Timer screen, notification, CompletionDialog và Stats — không gây hiểu nhầm "completed" cho session vô hạn.

## ADDED Requirements

### Requirement: Timer screen hiển thị round/∞
Với repeatMode forever, Timer screen SHALL hiển thị `ROUND x / ∞`.

#### Scenario: Round 37 của forever
- **WHEN** session forever đang ở round 37
- **THEN** màn Timer hiển thị "ROUND 37 / ∞"

### Requirement: Notification không hiển thị /∞
Notification stage-transition của session forever SHALL hiển thị `WORK · Round 37` (round số thường), không chứa `/ ∞`.

#### Scenario: Notification round
- **WHEN** session forever chuyển stage ở round 37
- **THEN** notification body/title hiển thị "Round 37" không kèm "/ ∞"

### Requirement: Không celebration cho forever
Session forever KHÔNG bao giờ hiển thị CompletionDialog (forever không completed tự nhiên); khi user Stop thủ công, hệ thống SHALL không hiện màn chúc mừng.

#### Scenario: Stop thủ công forever
- **WHEN** user bấm Stop trên session forever
- **THEN** không có CompletionDialog; session log ghi status=stopped

### Requirement: Stats log stopped
Session forever khi kết thúc SHALL được log với status `stopped` (không phải completed) và xuất hiện trong Stats như phiên đã dừng.

#### Scenario: Session forever trong Stats
- **WHEN** user dừng session forever
- **THEN** Stats có entry status=stopped, presetName đúng
