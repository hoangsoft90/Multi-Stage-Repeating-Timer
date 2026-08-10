## Purpose

Capability `session-recovery` định nghĩa cách app xử lý khi user quay lại sau khi app bị kill/reboot giữa chừng: hiện dialog "Continue where you left off?" với 3 lựa chọn (Resume/Restart/Dismiss), KHÔNG auto-resume, và phân biệt trường hợp session đã hoàn thành trong lúc user vắng mặt (dựa trên completedAt). Trạng thái hiển thị luôn được tính từ reconcile(now) nên luôn đúng.

## ADDED Requirements

### Requirement: Dialog "Continue where you left off?" sau kill/reboot
Khi app mở lại (cold start) và có session active được phục hồi từ SessionRepo, hệ thống SHALL hiện dialog: "Timer was running — Stage: WORK · 24:58 left" với 3 lựa chọn [▶ Resume] [↻ Restart] [✕ Dismiss]. Hệ thống SHALL KHÔNG tự động resume session.

#### Scenario: Mở lại app khi session đang chạy
- **WHEN** app bị kill khi session RUNNING (stage WORK còn 24:58) và user mở lại
- **THEN** app hiện dialog continue với đúng stage + thời gian còn lại; không auto-resume

#### Scenario: Resume
- **WHEN** user chọn Resume
- **THEN** session tiếp tục chạy từ trạng thái reconcile hiện tại (stage/round/remaining đúng)

#### Scenario: Restart
- **WHEN** user chọn Restart
- **THEN** session hiện tại dừng và session mới bắt đầu lại từ stage 1 round 1 của preset

#### Scenario: Dismiss
- **WHEN** user chọn Dismiss
- **THEN** session bị dừng (STOPPED) và app về Home, không còn dialog

### Requirement: Nhận diện "đã hoàn thành trong lúc vắng mặt"
Khi reconcile(now) cho thấy sequence đã trôi hết (completedAt hợp lệ hoặc session ở trạng thái COMPLETED), dialog SHALL hiển thị nội dung "Routine đã hoàn thành trong lúc bạn vắng mặt" thay vì "Timer was running". Hệ thống SHALL KHÔNG cho Resume trong trường hợp này.

#### Scenario: Sequence hết hạn khi vắng mặt
- **WHEN** user mở lại app và reconcile phát hiện toàn bộ sequence (không phải forever) đã expired
- **THEN** dialog hiện "Routine đã hoàn thành trong lúc bạn vắng mặt" và không có nút Resume

#### Scenario: Repeat forever vẫn còn chạy
- **WHEN** user mở lại app và preset là repeat forever (vẫn còn stage kế)
- **THEN** dialog hiện "Timer was running" với Resume hợp lệ (không tính là hoàn thành)

### Requirement: Phục hồi trạng thái đúng qua reconcile
Mọi thông tin hiển thị trong dialog (stage, round, remaining) SHALL được tính từ `engine.reconcile(now)` tại thời điểm mở lại — không dùng giá trị stageEndsAt lỗi thời lưu trong storage.

#### Scenario: App bị kill lâu, nhiều stage trôi qua
- **WHEN** app bị kill 3 stage và user mở lại sau đó
- **THEN** dialog hiển thị đúng stage hiện tại (stage thứ 4) với remaining đúng chứ không phải stage cũ từ storage

### Requirement: Không auto-resume và không mất tiến trình khi Resume
Hệ thống SHALL không bao giờ tự chạy session khi mở lại app (kể cả khi wake lock/notification active). Khi user Resume, tiến trình (round, stage index, thời gian trôi) SHALL được giữ đúng như reconcile tính — không reset về 0.

#### Scenario: Không auto-resume khi cold start
- **WHEN** app cold start với session active
- **THEN** app hiện dialog continue, timer không chạy ngầm cho tới khi user chọn Resume

### Requirement: Recovery sau reboot trên Android
Sau reboot, nếu cơ chế khôi phục notification của Phase 2 (Android: tự phục hồi sau reboot; iOS: reconcile khi mở lại) đã hoạt động, khi user mở app SHALL vẫn hiện dialog continue đúng trạng thái như kill-app thường (không phân biệt nguồn gốc kill hay reboot). Nếu session không phục hồi được (storage corrupt), hệ thống SHALL thông báo "Timer stopped after reboot" một lần và không crash.

#### Scenario: Mở app sau reboot
- **WHEN** thiết bị reboot trong lúc session chạy và user mở app
- **THEN** dialog continue hiện đúng stage hiện tại (reconcile sau reboot)

#### Scenario: Session corrupt sau reboot
- **WHEN** session storage corrupt sau reboot
- **THEN** app hiện thông báo "Timer stopped after reboot" và vào Home bình thường
