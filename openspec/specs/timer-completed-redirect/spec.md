# timer-completed-redirect Specification

## Purpose
Capability `timer-completed-redirect` đảm bảo màn timer không bao giờ "kẹt" ở trạng thái hoàn thành (00:00 chết) sau khi user đóng completion dialog — app tự điều hướng về Home, dialog hoàn thành vẫn hiển thị (render toàn cục ở root layout).
## Requirements
### Requirement: Redirect về Home sau khi completed

Màn timer SHALL điều hướng về Home khi session ở trạng thái `completed` (ngoài `idle`/`stopped` đã có). Completion dialog (render toàn cục) SHALL vẫn hiển thị phía trên màn Home sau khi redirect.

#### Scenario: Hoàn thành khi đang ở màn timer
- **WHEN** session hoàn thành trong lúc user đang ở màn timer
- **THEN** màn timer tự chuyển về Home, completion dialog vẫn hiện (celebration + "Save as Preset" không bị mất)

#### Scenario: Đóng dialog
- **WHEN** user bấm "Xong" trên completion dialog
- **THEN** không còn màn 00:00 chết — user đứng ở Home

