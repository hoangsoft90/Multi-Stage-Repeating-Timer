## Purpose

Capability `android-widget` định nghĩa home-screen widget Android hiển thị trạng thái timer từ snapshot (đã duy trì sẵn từ `add-home-widget`): stage, countdown, round, và tap để mở app / quick-start preset qua deep-link. Yêu cầu EAS dev build (widget extension native) — phần JS (mapping + bridge) test được trong môi trường hiện tại.

## ADDED Requirements

### Requirement: Widget hiển thị timer snapshot (Android)
Trên Android (dev build có cài `@saleksovski/react-native-android-widget`), widget SHALL hiển thị từ snapshot hiện tại: tên stage, countdown (MM:SS tính tại thời điểm update), round (`x/y`, forever → `∞`), preset name, trạng thái (running/paused). Widget SHALL được cập nhật khi timer-store emit transition event (StageStarted / SessionResumed / SessionPaused) qua `WidgetBridge.updateTimerSnapshot` — không sync theo tick 250ms (nhất quán add-home-widget). Do giới hạn nền tảng (`updatePeriodMillis` ≥ 30 phút), widget KHÔNG tự đếm ngược realtime — hiển thị giá trị tại lần update gần nhất.

#### Scenario: Stage bắt đầu
- **WHEN** session start và StageStarted emit (WidgetBridge nhận snapshot mới)
- **THEN** widget hiển thị stage mới + countdown từ snapshot

#### Scenario: Pause
- **WHEN** user pause session (SessionPaused)
- **THEN** widget hiển thị trạng thái paused với remaining đã đóng băng

### Requirement: Tap widget → đúng màn
Tap trên widget SHALL mở app: khi có session active → màn Timer (hoặc quick-start preset qua deep-link `looptimer:///?start=<presetId>` nếu widget tap kèm presetId); khi idle → Home. Deep-link quick start đã được xử lý sẵn ở Home (v1.2).

#### Scenario: Tap khi timer chạy
- **WHEN** timer đang chạy và user tap widget
- **THEN** app mở màn Timer (hoặc start preset qua deep-link) — không tạo session thứ 2

#### Scenario: Tap khi idle
- **WHEN** không có session và user tap widget
- **THEN** app mở Home

### Requirement: Idle state
Khi snapshot null (không có session — terminal event đã xóa snapshot), widget SHALL hiển thị trạng thái rỗng (không hiển thị timer cũ đã kết thúc), ví dụ "Mở LoopTimer".

#### Scenario: Session dừng
- **WHEN** user stop session (SessionStopped → `updateTimerSnapshot(null)`)
- **THEN** widget chuyển sang idle state, không còn countdown cũ

### Requirement: Mapping thuần và test được
Dữ liệu widget SHALL được build từ `mapTimerSnapshotToWidgetData(snapshot)` — hàm thuần (snapshot → widget data, null → idle), unit test deterministic (giống `buildTimerSnapshot`).

#### Scenario: Build widget data
- **WHEN** snapshot running stage WORK round 2/5 remaining 30s
- **THEN** widget data có stageName=WORK, remainingMs=30000, round=2, totalRounds=5, status=running

### Requirement: No-op ngoài Android/Expo Go
Trên web / Expo Go / iOS, widget SHALL không gây lỗi (bridge no-op hoặc vô hại); thư viện widget chỉ hoạt động trong dev build Android.

#### Scenario: Web
- **WHEN** app chạy trên web
- **THEN** không lỗi từ widget bridge (giữ hành vi no-op hiện tại)
