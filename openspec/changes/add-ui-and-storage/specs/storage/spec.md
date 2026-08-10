## Purpose

Capability `storage` định nghĩa tầng lưu trữ local-first bằng AsyncStorage: 3 repository (PresetRepo, SettingsRepo, SessionRepo), mọi model có `schemaVersion` để sẵn sàng migration, persist snapshot session tại event transition, và phục hồi trạng thái sau kill app. Storage chỉ là cache phục hồi — source of truth vẫn là TimerSession + now().

## ADDED Requirements

### Requirement: Repository PresetRepo
PresetRepo SHALL lưu/đọc toàn bộ preset của user (CRUD), đảm bảo `schemaVersion` được ghi cùng mỗi bản ghi. Đọc dữ liệu cũ có schemaVersion khác SHALL không crash — phải có đường xử lý migration hoặc bỏ qua an toàn.

#### Scenario: Lưu và đọc lại preset
- **WHEN** user tạo preset và mở lại app
- **THEN** preset được khôi phục đầy đủ từ AsyncStorage với đúng tên/stages/repeatMode

#### Scenario: Gặp bản ghi schema cũ
- **WHEN** PresetRepo đọc một bản ghi có schemaVersion nhỏ hơn version hiện tại
- **THEN** hệ thống xử lý theo migration tương ứng (hoặc skip an toàn) mà không crash

#### Scenario: Lưu và đọc lại preset (AsyncStorage)
- **WHEN** app chạy trên web (AsyncStorage dùng IndexedDB) và user tạo preset rồi reload trang
- **THEN** preset được khôi phục đầy đủ từ AsyncStorage với đúng tên/stages/repeatMode

### Requirement: Repository SessionRepo — phục hồi sau kill
SessionRepo SHALL lưu snapshot session (id, presetId, stagesSnapshot, currentStageIndex, currentRound, status, dateStarted, stageEndsAt, pausedRemaining, completedAt, createdAt, schemaVersion) và cho phép đọc session active gần nhất để phục hồi. Mỗi device chỉ có tối đa 1 session active.

#### Scenario: Kill app khi đang chạy
- **WHEN** app bị kill khi session đang RUNNING
- **THEN** SessionRepo vẫn còn session active và app có thể phục hồi đúng trạng thái (stage, round, stageEndsAt) sau khi mở lại

#### Scenario: Chỉ 1 session active
- **WHEN** hệ thống lưu session mới trong lúc đã có session active cũ
- **THEN** session active cũ được đánh dấu dừng và chỉ session mới là active

### Requirement: Persist chỉ tại event transition
Hệ thống SHALL persist snapshot session (SessionRepo) chỉ khi engine emit event transition (StageStarted/StageCompleted/SessionPaused/SessionResumed/SessionStopped/SessionCompleted), không persist theo từng tick UI. Preset chỉ persist khi user lưu/sửa/xóa trên Editor.

#### Scenario: Tick giây không ghi storage
- **WHEN** màn Timer Running tick mỗi giây để render countdown mà không có transition
- **THEN** không có thao tác ghi storage nào được thực hiện cho riêng tick đó

### Requirement: Repository SettingsRepo
SettingsRepo SHALL lưu/đọc các cài đặt: soundEnabled, vibrationEnabled, wakeLockEnabled, themeMode (system). Cài đặt SHALL persist qua các lần mở app.

#### Scenario: Thay đổi cài đặt và mở lại app
- **WHEN** user tắt sound trong Settings rồi thoát app và mở lại
- **THEN** cài đặt sound tắt vẫn được giữ nguyên

### Requirement: Khởi tạo storage và schema an toàn
Hệ thống SHALL khởi tạo AsyncStorage (các key/namespace repo) trước khi UI sử dụng repository, và mọi model SHALL có field `schemaVersion` ngay từ phiên bản đầu tiên (chuẩn bị migration mà không cần refactor sau).

#### Scenario: Cold start
- **WHEN** app khởi động lần đầu sau cài đặt
- **THEN** các repo (presets, settings, sessions) sẵn sàng đọc dữ liệu rỗng mà không lỗi
