## Purpose

Capability `feedback` định nghĩa cách user cảm nhận chuyển stage: âm thanh (3 sound built-in, vượt Silent Switch trên iOS), rung (2 pattern), local notification khi chuyển stage và khi session hoàn thành, và wake lock giữ màn hình sáng khi timer chạy. Mọi feedback SHALL trigger từ event engine (StageStarted/StageCompleted/SessionCompleted) và tôn trọng cài đặt Settings tương ứng.

## ADDED Requirements

### Requirement: Audio — 3 sound built-in, on/off theo Settings
Hệ thống SHALL cung cấp 3 âm thanh transition built-in và phát đúng âm thanh đã chọn (per preset stage `soundId`; fallback âm mặc định khi rỗng) khi stage chuyển tiếp, chỉ khi toggle Sound bật. Trên iOS, audio session SHALL dùng `AVAudioSession category = .playback` để âm thanh vẫn phát khi Silent Switch bật.

#### Scenario: Phát âm khi chuyển stage
- **WHEN** stage kết thúc (StageCompleted) và toggle Sound bật
- **THEN** hệ thống phát âm thanh transition của stage đã chọn

#### Scenario: Tắt sound
- **WHEN** toggle Sound tắt
- **THEN** không phát âm thanh nào khi chuyển stage

#### Scenario: Silent Switch iOS vẫn phát
- **WHEN** iOS ở chế độ Silent Switch và stage chuyển tiếp
- **THEN** âm thanh transition vẫn phát (do audio session .playback)

### Requirement: Vibration — 2 pattern built-in
Hệ thống SHALL cung cấp 2 pattern rung built-in và thực hiện đúng pattern đã chọn (per preset stage `vibrationPatternId`; fallback pattern mặc định) khi stage chuyển tiếp, chỉ khi toggle Vibration bật.

#### Scenario: Rung khi chuyển stage
- **WHEN** stage kết thúc và toggle Vibration bật
- **THEN** hệ thống thực hiện pattern rung tương ứng

#### Scenario: Tắt vibration
- **WHEN** toggle Vibration tắt
- **THEN** không có pattern rung nào khi chuyển stage

### Requirement: Local notification khi chuyển stage và hoàn thành
Hệ thống SHALL hiển thị local notification khi stage chuyển tiếp (nội dung: tên stage mới) và khi session hoàn thành (nội dung: "Routine hoàn thành"). Notification SHALL xuất hiện kể cả khi app ở nền/kill (dựa trên scheduling Phase 2). Nếu POST_NOTIFICATIONS bị từ chối, hệ thống SHALL không hiện notification nhưng không ảnh hưởng các feedback khác.

#### Scenario: App ở nền, stage chuyển
- **WHEN** app ở nền và stage kết thúc (notification được OS fire theo lịch Phase 2)
- **THEN** user nhận notification thông báo stage mới

#### Scenario: Session hoàn thành
- **WHEN** session hoàn thành (SessionCompleted)
- **THEN** user nhận notification "Routine hoàn thành" (nếu quyền notification được cấp)

#### Scenario: Notification bị từ chối quyền
- **WHEN** POST_NOTIFICATIONS bị từ chối và stage chuyển tiếp
- **THEN** không có notification nhưng âm thanh/rung (nếu bật) vẫn hoạt động bình thường

### Requirement: Wake lock khi session active
Hệ thống SHALL giữ màn hình sáng (wake lock) khi có session active và toggle Wake Lock bật trong Settings; không giữ sáng khi không có session hoặc toggle tắt. Wake lock SHALL tự giải phóng khi session dừng/hoàn thành.

#### Scenario: Timer chạy, màn hình sáng
- **WHEN** session RUNNING, wakeLockEnabled = true
- **THEN** màn hình không tự tắt trong lúc session chạy

#### Scenario: Stop session
- **WHEN** user stop session
- **THEN** wake lock được giải phóng, màn hình tắt theo hành vi hệ thống bình thường

### Requirement: Feedback không chặn timer
Mọi thao tác feedback (phát âm, rung, hiện notification) SHALL không bao giờ chặn hay làm chậm engine/UI — lỗi feedback (vd file âm thanh hỏng) SHALL không làm crash timer.

#### Scenario: Lỗi phát âm thanh
- **WHEN** phát âm thanh transition gặp lỗi (file missing)
- **THEN** timer vẫn tiếp tục chạy bình thường, lỗi được log (Crashlytics/analytics) mà không crash
