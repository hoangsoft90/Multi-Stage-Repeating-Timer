## Purpose

TimerEngine là state machine timer thuần TypeScript dùng absolute timestamps để tính thời điểm stage kết thúc, tự động catch-up mọi stage bị trễ khi app quay lại (reconcile), và phát sinh event để UI/adapter phản ứng. Đây là nguồn sự thật duy nhất về trạng thái timer, độc lập nền tảng và test được với Clock giả.

## ADDED Requirements

### Requirement: State machine với các trạng thái ràng buộc
Engine SHALL duy trì đúng một trạng thái trong tập {IDLE, RUNNING, PAUSED, COMPLETED, STOPPED} với các invariant sau:
- IDLE: không có field timing runtime nào.
- RUNNING: `stageEndsAt != null` và `pausedRemaining == null`.
- PAUSED: `pausedRemaining != null` và `stageEndsAt == null`.
- COMPLETED/STOPPED: không có field timing runtime hoạt động.

#### Scenario: Khởi tạo engine
- **WHEN** engine được khởi tạo với preset hợp lệ nhưng chưa có lệnh start
- **THEN** engine ở trạng thái IDLE và không có stageEndsAt/pausedRemaining

#### Scenario: Chuyển trạng thái hợp lệ
- **WHEN** user start timer đang IDLE
- **THEN** engine chuyển sang RUNNING với stageEndsAt != null và pausedRemaining == null

#### Scenario: Pause rồi resume không drift
- **WHEN** user pause timer đang RUNNING rồi resume sau một khoảng thời gian
- **THEN** engine ở RUNNING với stageEndsAt được tính lại từ `now + pausedRemaining` — tổng thời gian stage không đổi, không mất/bù thừa giây

### Requirement: Tính thời điểm stage kết thúc bằng absolute timestamp
Engine SHALL tính `stageEndsAt = stageStartedAt + durationSeconds` và `remaining = max(0, stageEndsAt - now)`. Chỉ engine được tính remaining; UI chỉ render giá trị do engine công bố. Duration mỗi stage SHALL nằm trong 1 giây đến 24 giờ (đã validate từ Editor).

#### Scenario: Stage kết thúc đúng thời điểm
- **WHEN** stage WORK duration 60s bắt đầu lúc stageStartedAt = T
- **THEN** stageEndsAt = T + 60s và remaining tại thời điểm T+30s là 30s

#### Scenario: Remaining không âm
- **WHEN** `now` vượt quá stageEndsAt của stage hiện tại
- **THEN** remaining được báo về 0 thay vì số âm

### Requirement: reconcile(now) tự động catch-up stage bị trễ
Khi `reconcile(now)` được gọi, engine SHALL advance liên tục qua **tất cả** stage đã expired (không chỉ 1 stage mỗi lần gọi) theo vòng lặp:
```
while (now >= currentStageEndsAt && hasNext) { emit(StageCompleted); advanceToNext(); stageEndsAt = now + nextStage.duration; }
if (!hasNext && now >= currentStageEndsAt) emit(SessionCompleted);
```
Mỗi transition SHALL được áp dụng đúng một lần kể cả khi `reconcile` được gọi nhiều lần cho cùng một mốc thời gian (chống double-transition khi `expire` và `user skip` xảy ra đồng thời).

#### Scenario: Missed K stages — catch-up toàn bộ
- **WHEN** app bị kill trong 3 stage và user mở lại (reconcile với now vượt qua cả 3 stage)
- **THEN** engine emit StageCompleted cho từng stage đã expired và đứng ở stage thứ 4 với stageEndsAt = now + duration stage 4

#### Scenario: Reconcile lặp lại không gây double-transition
- **WHEN** reconcile được gọi 2 lần với cùng giá trị now đã vượt qua stage hiện tại
- **THEN** stage chỉ được advance đúng một lần và StageCompleted chỉ emit một lần cho stage đó

#### Scenario: Stage cuối expired — session completed
- **WHEN** stage cuối của preset đã hết hạn và không còn stage tiếp theo
- **THEN** engine emit SessionCompleted và chuyển sang COMPLETED

### Requirement: Repeat mode once / fixedCount / forever
Engine SHALL hỗ trợ 3 chế độ lặp:
- `once`: chạy một lượt toàn bộ stages rồi kết thúc.
- `fixedCount`: lặp đủ N round (N ≥ 1) rồi kết thúc; hết round thì emit `RoundCompleted`.
- `forever`: lặp vô hạn; mỗi round emit `RoundCompleted`, không bao giờ emit `SessionCompleted`.

#### Scenario: Repeat once
- **WHEN** preset repeatMode = once và stage cuối expired
- **THEN** engine emit SessionCompleted và ở trạng thái COMPLETED

#### Scenario: Repeat fixedCount đủ số round
- **WHEN** preset repeatMode = fixedCount với fixedCount = 3 và stage cuối round 3 expired
- **THEN** engine emit RoundCompleted(3) rồi SessionCompleted

#### Scenario: Repeat forever không kết thúc
- **WHEN** preset repeatMode = forever và stage cuối round N expired
- **THEN** engine emit RoundCompleted(N) và bắt đầu stage đầu của round N+1, không emit SessionCompleted

### Requirement: Commands start, pause, resume, skip, stop
Engine SHALL expose các lệnh sau với semantics rõ ràng:
- `start`: bắt đầu session từ IDLE; snapshot preset thành session mới.
- `pause`: RUNNING → PAUSED, lưu `pausedRemaining`.
- `resume`: PAUSED → RUNNING, tính lại stageEndsAt từ pausedRemaining.
- `skip`: chuyển ngay sang stage kế (hoặc round kế nếu đang ở stage cuối); emit StageCompleted; nếu skip stage cuối của round cuối (không forever) thì emit SessionCompleted.
- `stop`: hủy session bất kỳ trạng thái đang chạy → STOPPED, emit SessionStopped.

#### Scenario: Skip stage giữa chừng
- **WHEN** user skip stage 2/5 đang RUNNING
- **THEN** engine emit StageCompleted(2) và bắt đầu stage 3 với stageEndsAt = now + duration stage 3

#### Scenario: Skip stage cuối của round cuối
- **WHEN** user skip stage cuối của round cuối (repeatMode ≠ forever)
- **THEN** engine emit StageCompleted rồi SessionCompleted và ở trạng thái COMPLETED

#### Scenario: Stop từ trạng thái PAUSED
- **WHEN** user stop timer đang PAUSED
- **THEN** engine emit SessionStopped, chuyển STOPPED, và mọi field timing runtime bị xóa

### Requirement: Event-sourcing — mọi side-effect đi qua TimerEvents
Engine SHALL emit đầy đủ các event: `StageStarted(index, name, endsAt)`, `StageCompleted(index, name)`, `RoundCompleted(round)`, `SessionCompleted()`, `SessionPaused(pausedRemaining)`, `SessionResumed(endsAt)`, `SessionStopped()`. Listener (UI, adapter) chỉ được phép *react* lên event; không được tự ý thay đổi state engine.

#### Scenario: UI nhận StageStarted khi bắt đầu
- **WHEN** engine start session
- **THEN** engine emit StageStarted(stageIndex=0, name, endsAt) và listener UI nhận đúng event này

#### Scenario: Adapter schedule nhận StageStarted để lên lịch nền
- **WHEN** engine emit StageStarted với endsAt
- **THEN** adapter platform (vd scheduler) dùng endsAt này để lên lịch notification/alarm kế tiếp

### Requirement: Clock injectable để test xác định
Engine SHALL nhận `Clock` (interface trả về thời gian hiện tại) qua constructor, mặc định dùng đồng hồ hệ thống. Test SHALL dùng `FakeClock` để mô phỏng trôi thời gian chính xác, không cần chờ real-time.

#### Scenario: Test với FakeClock
- **WHEN** test tạo engine với FakeClock và dịch clock về phía trước 3 phút
- **THEN** engine reconcile theo thời gian giả mới và trả về trạng thái đúng như thể đã trôi 3 phút thật

### Requirement: Hành vi khi clock/timezone thay đổi
Engine SHALL ghi nhận thay đổi giờ hệ thống hoặc timezone là best-effort: trạng thái engine luôn đúng tại lần `reconcile(now)` kế tiếp, nhưng không đảm bảo lịch nền khớp tuyệt đối với khoảng nghỉ (gap) sinh ra do thay đổi giờ.

#### Scenario: Đồng hồ hệ thống bị chỉnh về sau
- **WHEN** đồng hồ hệ thống bị chỉnh về sau 1 giờ trong lúc timer đang chạy và reconcile được gọi
- **THEN** engine tính lại dựa trên now mới — stage hiện tại có thể được kéo dài theo mốc thời gian tuyệt đối cũ, và trạng thái vẫn nhất quán tại lần reconcile kế tiếp

### Requirement: Chỉ persist tại event transition
Engine SHALL chỉ đánh dấu cần persist (snapshot) tại thời điểm transition event xảy ra (StageStarted/Completed, SessionPaused/Resumed/Stopped/Completed), không persist theo từng tick UI.

#### Scenario: Không persist khi tick giây
- **WHEN** UI tick mỗi giây để render countdown mà không có transition
- **THEN** không có lệnh persist nào được sinh ra cho riêng tick đó
