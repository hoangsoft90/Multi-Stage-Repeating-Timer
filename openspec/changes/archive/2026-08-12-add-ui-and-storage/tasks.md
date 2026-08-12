## 1. Scaffold app Expo

- [x] 1.1 Tạo Expo app TypeScript (`npx create-expo-app@latest --template blank-typescript`), platforms android/ios/web
- [x] 1.2 Thêm dependencies: `zustand`, `@react-native-async-storage/async-storage`, `expo-router` (kèm setup entry `main`), `expo-system-ui`, `expo-application`
- [x] 1.3 Tạo app shell: root layout, theme light/dark theo hệ thống, khởi tạo storage repos trước khi render
- [x] 1.4 Cấu hình routing expo-router: `index` Home, `preset/[id]` Editor, `timer` Timer Running, `settings` Settings

## 2. Models + storage

- [x] 2.1 Model `Stage`, `Preset`, `TimerSession` (kế thừa từ change add-timer-engine) có `schemaVersion` + `toJSON/fromJSON`
- [x] 2.2 `PresetRepo`: CRUD preset (AsyncStorage), đọc an toàn bản ghi schema cũ, `lastUsedAt` update khi start
- [x] 2.3 `SettingsRepo`: soundEnabled, vibrationEnabled, wakeLockEnabled, themeMode (mặc định sound/vibration/wakelock = true, theme = system)
- [x] 2.4 `SessionRepo`: lưu/đọc session active, đảm bảo chỉ 1 session active (đánh dấu cũ là stopped khi lưu mới)

## 3. Templates + presets logic

- [x] 3.1 Định nghĩa 3 templates built-in trong code: Work/Break 60/10 (forever), Pomodoro 25/5+15 (once), HIIT 40/20 (fixedCount=8)
- [x] 3.2 Logic duplicate preset (id mới, tên "(copy)")
- [x] 3.3 Validation preset: duration 1s–24h, stages 1–50, fixedCount ≥ 1, name ≤ 50 ký tự

## 4. Home screen

- [x] 4.1 Danh sách templates-first: 3 templates nổi bật + danh sách preset user
- [x] 4.2 Nút tạo preset mới + icon vào Settings
- [x] 4.3 Chạm template/preset → mở Editor; empty state khi chưa có preset
- [x] 4.4 Xóa preset (confirm) + duplicate preset từ Home/Editor

## 5. Editor screen

- [x] 5.1 Form preset: tên, danh sách stage (tên + duration), thêm/xóa stage, repeat mode selector, fixedCount input
- [x] 5.2 Chọn sound pattern + vibration pattern per stage (placeholder cho Phase 3 — danh sách pattern từ const)
- [x] 5.3 Validation + hiển thị lỗi per-field, chặn lưu khi không hợp lệ
- [x] 5.4 Lưu preset mới / cập nhật preset cũ; duplicate từ Editor

## 6. Timer Running screen + timer store

- [x] 6.1 `useTimerStore` (Zustand) bọc TimerEngine: start/pause/resume/skip/stop, subscribe events, expose state (stage name, remaining, progress, round, next stage)
- [x] 6.2 Reconcile khi restore: khởi tạo store với session active từ SessionRepo → `engine.reconcile(now)` trước khi render
- [x] 6.3 Màn Timer Running: stage name, countdown lớn, progress bar, round x/y, next stage; KHÔNG có ad
- [x] 6.4 Controls: Pause, Skip, Stop (confirm dialog); Start preset B khi A chạy → confirm ngưng A
- [x] 6.5 Persist snapshot session vào SessionRepo tại mỗi event transition (không theo tick)

## 7. Settings screen

- [x] 7.1 Toggles: Sound, Vibration, Wake Lock, Theme (system) — persist qua SettingsRepo
- [x] 7.2 Mục About (version từ expo-application), Privacy Policy (mở URL), Rate app (store link)

## 8. Kiểm tra

- [x] 8.1 `npx tsc --noEmit` sạch
- [x] 8.2 Unit test (Jest): validation preset, duplicate, repo AsyncStorage (schema cũ không crash), single active session, timer store (reconcile khi restore)
- [x] 8.3 Render test (react-test-renderer/Testing Library): Home hiển thị templates, Editor chặn lưu sai, Timer Running render đúng state, Stop confirm
- [x] 8.4 Smoke test web: `npx expo export --platform web` + mở browser — tạo → sửa → start → pause/resume/skip/stop
