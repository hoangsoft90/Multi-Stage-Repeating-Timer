## Why

TimerEngine (Phase 0) đã xong nhưng chưa có cách nào để user tạo routine, chỉnh sửa, chạy và xem kết quả. Phase 1 xây toàn bộ lớp giao diện người dùng (Home, Editor, Timer Running, Settings) + tầng lưu trữ local-first (AsyncStorage) với `schemaVersion`, kết nối UI với engine qua Zustand store. Đây là phase làm cho app "chạy được từ đầu đến cuối" trên mặt tiền, chuẩn bị nền cho background scheduling (Phase 2) và feedback (Phase 3).

## What Changes

- Tạo app Expo (React Native) scaffold: TypeScript, Zustand state management, expo-router navigation, theme system (light/dark theo hệ thống).
- **Home screen**: Templates-first activation — hiển thị 3 templates + danh sách presets của user, nút tạo preset mới, vào Settings.
- **Editor screen**: tạo/chỉnh sửa preset (tên, danh sách stage: tên + duration + sound/vibration pattern), validate (duration 1s–24h, stages 1–50, rounds ≥ 1, tên ≤ N ký tự), duplicate preset, xóa (confirm).
- **Timer Running screen** (sacred screen): hiển thị stage hiện tại, countdown, progress bar, round x/y, next stage; controls Pause/Skip/Stop (Stop có confirm; Pause/Skip không). **KHÔNG có ad trên màn này.**
- **Settings screen**: toggles Sound, Vibration, Wake Lock, Theme (system); About + Privacy Policy + Rate app.
- **Storage**: AsyncStorage với `PresetRepo`, `SettingsRepo`, `SessionRepo` — mọi model có `schemaVersion`; persist snapshot session tại event transition.
- **Single active session**: chỉ 1 session chạy/device; Start preset B khi A đang chạy → confirm ngưng A.
- 3 templates built-in: **Work/Break 60/10**, **Pomodoro 25/5+15**, **HIIT 40/20**.

**Không đổi behavior hiện có**: greenfield, chưa có code UI/storage.

## Capabilities

### New Capabilities

- `screens`: 4 màn hình chính (Home templates-first, Editor, Timer Running sacred, Settings) + routing + theme + luồng Start/Stop/confirm.
- `presets`: CRUD preset + 3 templates built-in + duplicate + validation rules.
- `storage`: repos AsyncStorage (PresetRepo, SettingsRepo, SessionRepo), `schemaVersion`, persist snapshot tại event transition, phục hồi sau kill.
- `settings`: các tùy chọn persist (sound, vibration, wake lock, theme) + About/Privacy/Rate.

### Modified Capabilities

<!-- Không có — greenfield. -->

## Impact

- **Code mới**: `src/app/` (screens: `index` Home, `preset/[id]` Editor, `timer` Timer Running, `settings` — app shell, router, theme), `src/features/timer/` (timer-store Zustand bọc engine), `src/features/settings/` (settings-store), `src/features/presets/` (presets-store), `src/core/storage/` (repos AsyncStorage), `src/core/timer/` (models — Preset, Stage, TimerSession).
- **Dependencies mới**: `zustand`, `@react-native-async-storage/async-storage`, `expo-router`, `expo-system-ui` (theme), `expo-application` (About/version).
- **Phụ thuộc**: TimerEngine từ change `add-timer-engine` (đã hoàn thành trước).
- **Hệ thống liên quan**: Phase 3 sẽ thêm âm thanh/rung/notification; Phase 2 thêm lịch nền — UI phase này chỉ render theo event engine, không tự chuyển state.
