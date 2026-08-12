## Context

TimerEngine pure TypeScript (change `add-timer-engine`) đã xong: state machine, `reconcile`, event-sourcing, Clock injectable. Phase này thêm lớp React Native: Zustand store, 4 màn hình (expo-router), AsyncStorage storage. Động lực chi tiết xem `proposal.md`. Yêu cầu behavior ở `specs/screens`, `specs/presets`, `specs/storage`, `specs/settings`.

## Goals / Non-Goals

**Goals:**
- App chạy được end-to-end: Home → Editor → Start → Timer Running (render + controls) → Stop/Complete.
- Storage local-first (AsyncStorage) với `schemaVersion`, repository abstraction, persist chỉ tại event transition.
- Timer store (Zustand) là lớp trung gian duy nhất nối UI ↔ engine; UI chỉ react event, không tự chuyển state.
- Single active session/device với confirm khi start chồng.

**Non-Goals:**
- Không làm background scheduling (AlarmManager / iOS notification queue) — Phase 2.
- Không làm audio/haptics/notification/wake-lock enforcement — Phase 3 (chỉ có toggle + storage ở phase này; áp dụng thực tế ở phase 3).
- Không làm ads/monetization — Phase 4.
- Không làm continue-dialog sau kill (Phase 3) — phase này chỉ phục hồi dữ liệu session từ AsyncStorage.

## Decisions

1. **Zustand là state management duy nhất** (thay Riverpod). Lý do: nhẹ, không cần Provider tree, hook-based (`useTimerStore()`), test dễ với vanilla store; là lựa chọn chuẩn cộng đồng RN. Alternative: Redux Toolkit (nặng hơn cho quy mô này), Jotai (tốt nhưng ít quen hơn).
2. **Timer store (Zustand) là cửa ngõ duy nhất vào engine.** UI gọi `start/pause/resume/skip/stop`; engine emit event → store cập nhật state → UI render. UI không bao giờ thay đổi state engine trực tiếp (đúng nguyên tắc "mọi side-effect qua Events").
3. **`@react-native-async-storage/async-storage` với repository pattern** (`PresetRepo`, `SettingsRepo`, `SessionRepo`) bọc AsyncStorage (key-value). Lý do: AsyncStorage chạy mọi nền tảng gồm web (IndexedDB) — khớp yêu cầu "test trên web"; repository abstraction giúp đổi sang MMKV/SQLite (P1+) không đụng UI. Model là plain TS class có `schemaVersion` + `toJSON/fromJSON`.
4. **Routing bằng `expo-router`** (file-based, dựng trên React Navigation): `app/index.tsx` (Home), `app/preset/[id].tsx` (Editor), `app/timer.tsx` (Timer Running), `app/settings.tsx`. Lý do: chuẩn Expo mới, deep-link sẵn, hoạt động trên web export. Alternative: React Navigation thuần — thêm boilerplate route table.
5. **Snackbar/validation trong Editor** hiện lỗi cụ thể per-field; không chặn typing, chỉ chặn lưu (validate-on-save + realtime feedback đơn giản). Lý do: UX mượt hơn validate-on-submit cứng, vẫn đúng spec "từ chối lưu khi không hợp lệ".
6. **Templates built-in là dữ liệu hằng trong code**, duplicate tạo preset thật. Không lưu template vào storage (tránh user xóa), chỉ preset duplicated vào AsyncStorage.
7. **Persist theo event transition**: timer store subscribe engine events → gọi `SessionRepo.write` tại transition; UI tick mỗi giây chỉ update local state render, không ghi storage.

## Risks / Trade-offs

- **Ghi AsyncStorage quá thường xuyên gây jank** → chỉ persist tại transition; batch mỗi transition 1 lần.
- **Session phục hồi sau kill hiển thị sai nếu engine không reconcile** → timer store luôn gọi `engine.reconcile(now)` trước khi expose state cho UI sau restore.
- **Storage schema thay đổi giữa chừng** → `schemaVersion` + migration path từ đầu (spec storage), test bản ghi cũ không crash.
- **UI tự ý đổi state engine (double-transition)** → timer store là cửa ngõ duy nhất; unit-test store riêng.
- **AsyncStorage trên web là IndexedDB (async, không giới hạn lớn)** → vẫn dùng repository, không gọi trực tiếp ở UI.

## Migration Plan

Greenfield — không migrate dữ liệu cũ. `schemaVersion` đặt từ bản đầu; khi thay đổi model ở phase sau, bump version + viết migration trong repo.

## Open Questions

- `expo-router` (file-based) vs React Navigation thuần — đã chọn expo-router; không ảnh hưởng spec.
