## 1. Khởi tạo module engine

- [x] 1.1 Tạo cấu trúc thư mục `src/core/timer/` (engine, domain models, events, clock) và `src/core/timer/__tests__/`
- [x] 1.2 Định nghĩa enum `RepeatMode` (once | fixedCount | forever), `TimerStatus` (idle | running | paused | completed | stopped)
- [x] 1.3 Định nghĩa domain models: `Stage` (id, name, durationSeconds, soundId?, vibrationPatternId?), `Preset` (id, name, stages, repeatMode, fixedCount?, createdAt, lastUsedAt, schemaVersion=1)
- [x] 1.4 Định nghĩa `TimerSession` immutable snapshot (id, presetId, stagesSnapshot, currentStageIndex, currentRound, status, dateStarted, stageEndsAt?, pausedRemaining?, completedAt?, createdAt, schemaVersion=1)
- [x] 1.5 Cấu hình Jest + ts-jest cho test thuần Node (không cần react-native preset)

## 2. Clock injectable

- [x] 2.1 Tạo interface `Clock { now(): Date }` + `SystemClock` (Date.now) + `FakeClock` (điều khiển thời gian bằng tay)

## 3. TimerEvents

- [x] 3.1 Định nghĩa các event: `StageStarted(index, name, endsAt)`, `StageCompleted(index, name)`, `RoundCompleted(round)`, `SessionCompleted()`, `SessionPaused(pausedRemaining)`, `SessionResumed(endsAt)`, `SessionStopped()`
- [x] 3.2 Typed event emitter thuần TS (listener registry + emit) — không cần thư viện

## 4. Core engine

- [x] 4.1 Implement state machine với invariants: IDLE không field timing; RUNNING có stageEndsAt, không pausedRemaining; PAUSED ngược lại; COMPLETED/STOPPED không field hoạt động
- [x] 4.2 Implement `start(preset, now)` — snapshot preset thành session, emit `StageStarted(0)`
- [x] 4.3 Implement `reconcile(now)` — vòng while catch-up toàn bộ stage expired; emit StageCompleted + advance; `RoundCompleted` khi hết round; `SessionCompleted` khi hết sequence (không phải forever)
- [x] 4.4 Guard chống double-transition: mỗi logical transition chỉ áp dụng 1 lần dù reconcile gọi nhiều lần cùng mốc
- [x] 4.5 Implement `pause(now)` / `resume(now)` — lưu/khôi phục pausedRemaining, tính lại stageEndsAt không drift
- [x] 4.6 Implement `skip(now)` — advance sang stage/round kế, emit StageCompleted (+ SessionCompleted nếu hết sequence không-forever)
- [x] 4.7 Implement `stop(now)` — chuyển STOPPED, emit SessionStopped, xóa field timing
- [x] 4.8 Implement `getState()` trả về trạng thái hiện tại (stage index, round, remaining, status) — chỉ engine tính remaining

## 5. Unit tests (Jest + FakeClock)

- [x] 5.1 Test state invariants (mọi trạng thái + chuyển hợp lệ/không hợp lệ)
- [x] 5.2 Test missed K stages — catch-up toàn bộ trong 1 reconcile
- [x] 5.3 Test repeat once / fixedCount / forever (RoundCompleted, không SessionCompleted khi forever)
- [x] 5.4 Test skip giữa stage, skip stage cuối round, skip stage cuối sequence
- [x] 5.5 Test race expire + user skip → không double-transition, không double-event
- [x] 5.6 Test reconcile lặp lại cùng now → không advance lần 2
- [x] 5.7 Test pause/resume không drift; remaining không âm
- [x] 5.8 Test clock/timezone change best-effort (đồng hồ chỉnh sau/về trước → reconcile đúng)
- [x] 5.9 Test chỉ persist-trigger tại transition (không persist theo tick)

## 6. Kiểm tra

- [x] 6.1 Chạy `npx tsc --noEmit` sạch lỗi trên module engine
- [x] 6.2 Chạy `npx jest src/core/timer` — toàn bộ test pass
