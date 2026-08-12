# completion-celebration Specification

## Purpose
Capability `completion-celebration` định nghĩa trải nghiệm sau khi session hoàn thành: màn chúc mừng (CompletionDialog) hiển thị thông tin phiên + streak, và nút chia sẻ kết quả qua ShareService. Mục tiêu biến thời điểm tích cực nhất của user (hoàn thành routine) thành động lực quay lại ngày mai và lan truyền nhẹ qua chia sẻ.
## Requirements
### Requirement: Hiển thị CompletionDialog khi session hoàn thành
Khi session emit SessionCompleted, hệ thống SHALL ghi thông tin completion (presetName, durationMs, streak) vào timer-store và hiển thị CompletionDialog (root-level, không lệ thuộc screen). Dialog SHALL hiển thị: tiêu đề chúc mừng, tên preset, tổng thời gian, streak hiện tại. User SHALL có thể đóng dialog bằng 1 chạm (nút Done / dismiss), không auto-dismiss trong thời gian ngắn.

#### Scenario: Hoàn thành session
- **WHEN** session hoàn thành (SessionCompleted) với preset HIIT, duration 20 phút, streak 5 ngày
- **THEN** CompletionDialog hiển thị tiêu đề chúc mừng + "HIIT" + "20m" + streak 5 ngày

#### Scenario: Đóng dialog
- **WHEN** user bấm nút Done trên CompletionDialog
- **THEN** dialog đóng và không hiện lại cho session đó (completion bị xóa khỏi store)

### Requirement: Chia sẻ kết quả
CompletionDialog SHALL có nút "Chia sẻ kết quả": gọi ShareService.share với text mô tả kết quả (tên preset, thời lượng, streak) theo ngôn ngữ hiện tại. Nếu share fail/không khả dụng, hệ thống SHALL không crash và không chặn flow (có thể fallback copy clipboard + alert).

#### Scenario: Chia sẻ thành công
- **WHEN** user bấm Chia sẻ kết quả và share sheet hiện
- **THEN** text chia sẻ chứa tên preset + duration + streak theo locale hiện tại

#### Scenario: Share không khả dụng
- **WHEN** platform không hỗ trợ share (vd web không có navigator.share)
- **THEN** hệ thống fallback copy vào clipboard + hiện thông báo, không crash

### Requirement: Không làm phiền flow chính
CompletionDialog SHALL không xuất hiện khi user stop thủ công (chỉ khi hoàn thành tự nhiên), không chặn Start/Stop/Resume, và không che màn Timer Running khi đang chạy (chỉ sau completed).

#### Scenario: Stop thủ công
- **WHEN** user stop timer thủ công (SessionStopped)
- **THEN** CompletionDialog không xuất hiện

#### Scenario: Không chặn timer
- **WHEN** CompletionDialog đang hiển thị và timer không còn chạy
- **THEN** mọi điều hướng/action khác vẫn hoạt động (dialog là modal dismissible)

### Requirement: Streak tính đúng tại completion
Streak hiển thị trong dialog SHALL được tính từ SessionLog sau khi phiên hiện tại được ghi (currentStreak bao gồm phiên vừa hoàn thành).

#### Scenario: Streak mới
- **WHEN** user hoàn thành phiên hôm nay (chưa từng chạy hôm qua)
- **THEN** streak hiển thị là streak tính đến hôm nay (phiên hôm nay được tính)

