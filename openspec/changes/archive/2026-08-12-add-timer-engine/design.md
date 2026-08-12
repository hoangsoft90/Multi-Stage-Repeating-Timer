## Context

Dự án greenfield: app mobile Expo (React Native) + TypeScript, local-first, không backend, theo plan `v1.2` đã duyệt. Phase 0 xây **TimerEngine pure TypeScript** trước mọi UI — đây là nguồn sự thật về trạng thái timer, độc lập nền tảng (không biết React Native/notification/ad). Động lực chi tiết xem `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Engine thuần TypeScript, deterministic, test toàn diện bằng `FakeClock` (missed stages, repeat, skip, race expire+skip, state invariants).
- State machine + absolute timestamps + `reconcile(now)` — engine luôn trả về trạng thái đúng khi user quay lại app, kể cả sau kill/reboot.
- Mọi side-effect qua `TimerEvents`; UI & adapter chỉ react (chống double-transition).

**Non-Goals:**
- Không xử lý UI (React Native/React), Zustand store, AsyncStorage persistence, notification, audio, haptics, ads — thuộc phase sau.
- Không quyết định lịch nền (AlarmManager / iOS notification queue) — adapter sẽ dựa vào `stageEndsAt` mà engine emit.
- Không implement migration storage — chỉ chuẩn bị `schemaVersion` field ở phase storage.

## Decisions

1. **Absolute timestamps thay vì đếm ngược tick.** Lý do: countdown dựa trên tick sẽ drift khi app bị treo/kill, còn `stageEndsAt` tuyệt đối cho phép `reconcile` tính lại chính xác bất kể khi nào app thức dậy. Alternative: lưu `remaining` mỗi lần persist → drift và phức tạp race; đã loại.
2. **`reconcile(now)` catch-up toàn bộ stage expired trong vòng while, không advance 1 stage mỗi lần gọi.** Lý do: nếu app bị kill 3 stage, chỉ advance 1 sẽ làm engine lệch state vĩnh viễn cho tới khi user bấm. Kèm guard: mỗi transition chỉ áp dụng 1 lần (engine tự nhiên idempotent vì sau mỗi advance `stageEndsAt = now + duration > now`, gọi lại cùng `now` không advance thêm; đồng thời các thao tác trong JS là single-threaded nên expire+skip không thể chạy đè nhau) — vẫn thêm test case race để khóa hành vi.
3. **Event-sourcing qua `TimerEvents`** — dùng simple typed event emitter (listener registry + `emit`) thuần TS, không cần thư viện. Lý do: tách engine khỏi mọi side-effect, test đơn giản, adapter platform chỉ subscribe. Alternative: Redux-style dispatcher → nặng cho core thuần; đã loại.
4. **Clock injectable** (interface `Clock { now(): Date }`) với `SystemClock` + `FakeClock` (điều khiển thời gian bằng tay). Lý do: unit test deterministic với Jest fake timers, không chờ real-time. Đây là yêu cầu spec, không phải tùy chọn.
5. **`RepeatMode` gồm once/fixedCount/forever với `RoundCompleted`.** Lý do: đúng yêu cầu plan §3; `forever` không bao giờ emit `SessionCompleted`.
6. **Session là immutable snapshot tạo tại start** (`stagesSnapshot` clone): edit preset khi đang chạy không ảnh hưởng session. Field `schemaVersion = 1` chuẩn bị migration.

## Risks / Trade-offs

- **Race expire + user skip → double-transition, double-notif** → Guard "mỗi logical transition chỉ áp dụng 1 lần" trong engine + test case riêng (kể cả khi single-threaded, giữ guard để bền vững nếu sau này có worker).
- **Clock/timezone thay đổi khi đang chạy** → best-effort: engine đúng tại reconcile kế tiếp; ghi rõ unsupported/best-effort để test matrix có expected behavior (không phải bug chưa fix).
- **Engine quá trừu tượng cho dev mới** → giữ API nhỏ (start/pause/resume/skip/stop/getState/subscribe), document invariants state machine ngay trong code.

## Migration Plan

Chưa áp dụng — đây là phase đầu greenfield, chưa có dữ liệu/spec cũ để migrate. Kiến trúc `schemaVersion` đã đặt trước để phase sau không phải refactor.

## Open Questions

Không có — các quyết định về repeat mode, skip semantics, guard double-transition đã chốt trong plan v1.2 và spec.
