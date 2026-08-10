# Multi-Stage Repeating Timer — Final Plan (v1.2 · Implementation-Ready)

> Idea ID: #15 | plan1_final: ~7.5/10 | plan1_final_1 (v1.1): 8.0/10 | **v1.2: 8.3/10 — APPROVED, READY TO CODE**
> Created: 2026-08-09 | Updated: 2026-08-09
> Nguồn: `plan1_final.md` → `plan1_final_review1..5.md` → `plan1_final_1.md` (v1.1) → **v1.2 vá 6 lỗ hổng thực thi**
> §14 liệt kê diff so với v1.1.

---

## 0. Final Assessment

**App nên làm — bản này giao thẳng được cho dev, không cần review vòng nào nữa.** Backbone kỹ thuật đã hội tụ tuyệt đối qua 6+ vòng review. v1.1 đã tối giản scope và chốt hầu hết magic numbers. v1.2 vá nốt **các chỗ spec nói "đã chốt" nhưng thiếu chi tiết thực thi** — nếu bỏ qua, dev sẽ code sai hoặc phát hiện lỗ hổng giữa chừng (reboot không hoạt động, iOS im lặng sau 50 phút, thiếu permission runtime).

### Giữ nguyên tuyệt đối (không tranh cãi qua 6+ review)
- Product thesis: "Create → Start once → Leave phone alone → Reliable auto-transition".
- Timer Engine = Pure Dart, platform-independent, absolute timestamps + State Machine + `reconcile()`, event-sourcing.
- Preset (mutable) ≠ Session (immutable snapshot tại Start).
- Single active session/device.
- Flutter + Riverpod + Hive, local-first, không backend/account.
- Không interstitial giữa stage. Không ad trên Timer Running (sacred screen).
- Exact Alarm primary (Android) / FGS opt-in fallback. iOS queue max 50. App Open chỉ cold-start + no active session.
- 3 templates, 2 vibration patterns, auto-transition Always ON, timeline 10–12 ngày.

### 6 lỗ hổng thực thi được vá trong v1.2

| # | Vấn đề trong v1.1 | Vá trong v1.2 |
|---|---|---|
| 1 | iOS: không nói rõ chuyện gì xảy ra khi 50 notification đã fire hết mà app chưa mở lại | **Ghi rõ giới hạn + mitigation**: `BGAppRefreshTask` best-effort + spec hoá thành known-limitation với UX cảnh báo (§4.2) |
| 2 | Android: "reboot → continue" không có cơ chế reschedule alarm sau reboot | Thêm `BOOT_COMPLETED` `BroadcastReceiver` + `RECEIVE_BOOT_COMPLETED` permission (§4.1) |
| 3 | Thiếu `POST_NOTIFICATIONS` runtime permission (Android 13+) | Thêm vào flow permission + checklist (§4.1, §10) |
| 4 | FGS opt-in chưa nói rõ UX khi bật (persistent notification bắt buộc, không thể ẩn) | Ghi rõ trade-off trong dialog "Keep alive" (§4.1) |
| 5 | Remote Config không có giá trị mặc định gợi ý | Thêm bảng default values cụ thể (§5, §6) |
| 6 | Thiếu ATT timing + non-personalized ads fallback (iOS) | Thêm flow ATT + degrade path (§5) |

---

## 1. Product Thesis (North Star)

> **"Create any multi-stage routine in seconds → Start once → Leave the phone alone → Stages auto-transition reliably (sound/vibration/notification) → The user never has to manually advance."**

### Core promise — chính xác và defensible
Không cam kết *"never miss a stage"* (không thể đảm bảo tuyệt đối: DND, OEM kill, battery saver, permission revoke, reboot, iOS notification-window limit). Thay bằng:

> **"Timer engine maintains correct elapsed state even when the app is backgrounded. The user does not need to manually advance stages when returning to the app."**

Chú ý cụm *"when returning to the app"* — đây là điểm chỉnh so với v1.1: promise không bao gồm "âm thanh/notification chắc chắn nổ đúng giây" khi app bị treo quá lâu ngoài cửa sổ hỗ trợ (xem §4.2), chỉ đảm bảo **state luôn đúng khi user quay lại**.

### Positioning / ASO
- Primary: **Interval Timer, Loop Timer, Routine Timer, Multi Stage Timer**
- Secondary: **Pomodoro Repeat, HIIT Timer, Workout Interval, Study Timer**
- Title: `LoopTimer – Multi-Stage Interval` / `Sequence Timer – Custom Routines`
- KHÔNG đặt tên kỹ thuật "Multi-Stage Repeating Timer".

---

## 2. Kiến trúc chốt (Production-Ready)

```
                 ┌──────────────────────────────┐
                 │         Flutter UI            │
                 │ Home · Editor · Timer · Settings
                 └─────────────┬──────────────────┘
                               │ commands + state exposure
                 ┌─────────────▼──────────────────┐
                 │        TimerController          │
                 │ start · pause · resume · skip   │
                 │ stop · getState · notify        │
                 └─────────────┬──────────────────┘
                               │
                 ┌─────────────▼──────────────────┐
                 │     TimerEngine (Pure Dart)      │
                 │  State Machine                   │
                 │  Absolute timestamps             │
                 │  reconcile(now)                  │
                 │  Sequence calculator             │
                 │  emits: TimerEvents              │
                 │  Clock injectable (FakeClock)    │
                 └─────────────┬──────────────────┘
                               │ Events
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                     ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
   │  Android      │    │  iOS         │    │ Audio · Haptics   │
   │ ExactAlarm ▲  │    │ UNQueue max  │    │ Sound (.playback) │
   │ + BootReceiver│    │ 50 + BGTask  │    │ Vibration         │
   │ FGS (opt-in)  │    │ (best-effort)│    │                   │
   └──────┬────────┘    └──────┬───────┘    └──────────────────┘
          ▼                    ▼
   OS scheduling               │
          └────────────────────┴────────────┐
                                             ▼
                    ┌───────────────────────────────┐
                    │ AdManager · Hive · Crashlytics │
                    │ · Analytics · Remote Config    │
                    └───────────────────────────────┘
```

**Nguyên tắc kiến trúc (bất khả xâm phạm):**
1. `TimerEngine` không biết Flutter/FGS/AdMob/notification. Pure Dart, test bằng `Clock` injectable (`FakeClock`).
2. Mọi side-effect đi qua **Events** — UI & adapter chỉ react, tránh double-transition.
3. **Timer correctness ≠ Notification delivery.** Engine đúng ngay cả khi notification fail/permission OFF.
4. Chỉ persist Hive **tại event transition**, không theo tick UI.
5. Source of truth = `TimerSession` + `now()`; storage chỉ là cache phục hồi.
6. **Hive schema có `schemaVersion` field** ngay từ đầu — chuẩn bị cho migration sau này mà không cần nghĩ lại kiến trúc.

### Core rules (engine)
```
stageEndsAt = stageStartedAt + duration(seconds)
remaining   = max(0, stageEndsAt - now)          // chỉ engine tính

reconcile(now):
    while (now >= currentStageEndsAt && hasNext) {
        emit(StageCompleted); advanceToNext();
        stageEndsAt = now + nextStage.duration;
    }
    if (!hasNext && now >= currentStageEndsAt) emit(SessionCompleted);
// missed K stages → advance toàn bộ stage đã expired, KHÔNG +1 tay mỗi lần
```

### State machine invariants
| Trạng thái | Field bắt buộc |
|---|---|
| IDLE | không có runtime timing field |
| RUNNING | `stageEndsAt != null`, `pausedRemaining == null` |
| PAUSED | `pausedRemaining != null`, `stageEndsAt == null` |
| COMPLETED / STOPPED | – |

**Invariant bắt buộc:** *same logical transition chỉ được apply đúng 1 lần* (chống race `expire + user skip` cùng lúc → double-transition, double-notif).

---

## 3. Data model (đóng băng)

```dart
class Preset {
  String id; String name;
  List<Stage> stages;
  RepeatMode repeatMode;        // once | fixedCount | forever
  int? fixedCount;
  DateTime createdAt; DateTime lastUsedAt;
  int schemaVersion = 1;        // migration-ready
}

class Stage {
  String id; String name;
  int durationSeconds;          // validate: 1s..24h
  String? soundId; String? vibrationPatternId;
}

class TimerSession {            // immutable snapshot tạo tại START
  String id; String presetId;
  List<Stage> stagesSnapshot;   // clone lúc Start — edit preset không ảnh hưởng
  int currentStageIndex; int currentRound;
  TimerStatus status;           // idle | running | paused | completed | stopped
  DateTime dateStarted;
  DateTime? stageEndsAt;        // RUNNING
  Duration? pausedRemaining;    // PAUSED
  DateTime? completedAt;        // NEW — analytics + "continue" dialog dùng để tính "đã trôi bao lâu"
  DateTime createdAt;
  int schemaVersion = 1;
}
```

- **Preset = mutable.** Session = immutable snapshot. Edit Preset khi đang chạy → KHÔNG ảnh hưởng session.
- **Chỉ 1 active session/device.** Start timer mới → confirm ngưng cái cũ.
- Hive: `PresetRepo`, `SettingsRepo`, `SessionRepo` (lưu snapshot để phục hồi sau kill/reboot).

### TimerEvents
```
StageStarted(index, name, endsAt)   → UI render + platform adapters
StageCompleted(index, name)          → audio/vibration/notification stage mới
RoundCompleted(round)
SessionCompleted()                   → ad eligibility "Post-Stop", ghi completedAt
SessionPaused(pausedRemaining) / SessionResumed(endsAt) / SessionStopped()
```

---

## 4. Background Architecture — ĐÃ CHỐT + vá lỗ hổng thực thi

### 4.1. Android — Exact Alarm primary + Boot recovery (MỚI trong v1.2)

```
TimerEngine (pure) ── reconcile(now) mỗi lần wake ── Platform Scheduler Adapter (Android)
                                                        │
                        ┌───────────────────────────────┼──────────────────────────┐
                        ▼                                ▼                          ▼
                Exact Alarm (primary)          BootCompletedReceiver         FGS (opt-in fallback)
                AlarmManager @stageEndsAt       reschedule alarm sau reboot   persistent notification
                wake ngắn → reconcile → notify  (đọc SessionRepo Hive)        bắt buộc, không ẩn được
                → schedule next
```

**Permission flow (thứ tự bắt buộc):**
1. `POST_NOTIFICATIONS` (Android 13+, runtime) — xin **ngay khi user tạo timer đầu tiên** (giải thích: "Cần quyền thông báo để báo khi hết stage"), không xin lúc onboarding.
2. `SCHEDULE_EXACT_ALARM` (Android 12+, special access) — xin **just-in-time** khi user bấm Start lần đầu, không phải onboarding. Nếu bị từ chối → dùng `AlarmManager.setAndAllowWhileIdle` (inexact, `POSSIBLY_EXACT`) làm graceful degradation, thông báo rõ trong Settings "Độ chính xác nền có thể giảm".
3. `RECEIVE_BOOT_COMPLETED` (normal permission, khai trong Manifest, không cần runtime dialog).

**Boot recovery (bắt buộc, thiếu là tính năng "reboot policy" vô nghĩa):**
```dart
class BootCompletedReceiver extends BroadcastReceiver {
  onReceive(context, intent) {
    if (intent.action == ACTION_BOOT_COMPLETED) {
      session = SessionRepo.getActiveSession(); // đọc từ Hive
      if (session != null && session.status == RUNNING) {
        engine.reconcile(now);          // xác định state đúng ngay sau reboot
        scheduler.rescheduleAlarm(engine.currentStageEndsAt);
      }
    }
  }
}
```
AlarmManager **bị OS xoá sạch mỗi lần reboot** — đây là lý do bắt buộc phải có receiver này nếu muốn "Device reboot policy = continue" là sự thật, không phải lời hứa suông.

**FGS opt-in — UX trade-off cần nói rõ với user:**
- Khi bật "Keep timer alive" → **bắt buộc hiện persistent notification** không thể ẩn/tắt trong lúc timer chạy (yêu cầu của Android OS, không phải lựa chọn của app). Dialog xin bật FGS phải nói rõ: *"Sẽ hiện thông báo cố định trên thanh trạng thái trong lúc timer chạy để đảm bảo không bị hệ thống tắt."*
- Chỉ đề xuất bật khi `missed_transition_rate > 15%` đo được trên thiết bị đó (không mặc định bật cho ai).
- Nếu dùng → khai `foregroundServiceType=specialUse` + justification string ngay Day 1 (rủi ro Play Console reject nếu justification yếu).

### 4.2. iOS — Queue max 50 + giới hạn cần công khai (MỚI trong v1.2)

```
scheduleNext(upTo: 50):
  cancelAllPending()
  anchor = now
  while (hasNextStage && count < 50):
      schedule(stage-end tại anchor + duration)
      advance anchor
// Resume / cold start → cancelAll + reconcile + reschedule từ trạng thái hiện tại
```

**⚠️ Giới hạn thực tế cần công khai trong spec (v1.1 chưa nói rõ):**
Local notification **không đánh thức code chạy nền** trừ khi user tap vào nó. Vì vậy khi notification thứ 50 đã fire mà user chưa mở lại app, **không có notification nào tiếp theo được lên lịch** cho tới khi họ tự mở app.

Ví dụ cụ thể: HIIT 40s/20s forever → 50 transitions ≈ 50 phút. Nếu user khoá máy và không đụng vào điện thoại quá 50 phút, các stage sau đó **im lặng hoàn toàn** (không sound/vibration/notification) — dù `reconcile()` vẫn trả về đúng stage hiện tại ngay khi họ mở app trở lại.

**Mitigation (best-effort, không phải guarantee):**
1. `BGAppRefreshTask` — đăng ký task để iOS *có thể* (không đảm bảo) đánh thức app ngắn hạn để reschedule thêm 50 notification. iOS tự quyết định thời điểm chạy dựa trên usage pattern, **không dùng được cho real-time**, chỉ tăng xác suất coverage dài hơn.
2. **UX minh bạch**: nếu preset có tổng thời lượng ước tính vượt quá "cửa sổ 50 notification" (engine tính được `estimatedCoverage = sum of next 50 stage durations`), hiện cảnh báo nhẹ trong Editor: *"Routine dài này có thể cần mở lại app sau khoảng X phút để tiếp tục nhận thông báo."*
3. Ghi thẳng vào Core Promise (§1): app đảm bảo **state đúng khi quay lại**, không đảm bảo **notification liên tục vô hạn** trên iOS khi app bị treo quá lâu ngoài cửa sổ 50 notification.

**Audio:** `AVAudioSession category = .playback` để âm thanh transition vượt qua Silent Switch — P0 bắt buộc cho độ tin cậy trên iOS.

**Notification ID:** deterministic `"${session.id}_${round}_${stageIndex}"` → cancel chính xác khi Pause/Skip/Stop.

### 4.3. Policy chung
- **Clock/timezone thay đổi khi đang chạy:** best-effort. Engine luôn đúng ở lần `reconcile()` kế tiếp, nhưng spec ghi rõ "thay đổi giờ hệ thống là unsupported/best-effort" để test matrix có expected behavior rõ ràng, không phải bug chưa fix.
- **Device reboot:** MVP hỗ trợ **continue** qua `BootCompletedReceiver` (Android) / cold-start reconcile (iOS, không cần receiver vì iOS tự xử lý app launch). Nếu vì lý do nào đó không phục hồi được (session Hive bị corrupt) → graceful "Timer stopped after reboot", không crash.

---

## 5. Monetization — Placement + giá trị mặc định (bổ sung Remote Config defaults)

> AdMob trả theo **impression rendered**, không phải dwell-time. Nguồn thu = tần suất user quay lại app, không phải phiên dài chạy timer.

### Ad placement (đóng băng)
| Placement | Type | Trigger | Kỳ vọng |
|---|---|---|---|
| **App Open** | App Open Ad | Cold/warm start **và !hasActiveSession** | 🔥 Chính |
| **Post-Stop / Completed** | Interstitial | Sau Stop thủ công hoặc session tự kết thúc | 🔥 Cao, frequency-capped |
| **Home** | Native / Banner | Mỗi lần mở Home | 🟡 Ổn định |
| **Custom sound / Pro** | Rewarded | User chủ động unlock **tạm thời 24h** | 🔥 eCPM cao |
| **Running Timer** | — | **KHÔNG có ad** | – |

**Ad eligibility (AdManager):**
```
canShowAppOpen()       = isColdStartOrWarmResume && !hasActiveTimerSession && cooldownPassed
canShowInterstitial()  = !sessionRunning && cooldownPassed && frequencyCapOk
canShowRewarded()      = luôn (user chủ động)
// notif action → không show ad. stage change → không show ad.
```

### Remote Config — giá trị mặc định khởi điểm (MỚI trong v1.2)
Không để trống hoàn toàn — dev cần số khởi điểm, chỉnh sau khi có data thật:

| Key | Default | Ghi chú |
|---|---|---|
| `interstitial_cooldown_seconds` | 240 (4 phút) | Giữa 2 lần interstitial |
| `interstitial_max_per_session` | 1 | Post-Stop chỉ 1 lần/phiên |
| `app_open_cooldown_seconds` | 60 | Tránh App Open dồn dập khi user mở/đóng liên tục |
| `max_scheduled_transitions_ios` | 50 | Giới hạn Apple ~64, chừa buffer |
| `missed_transition_rate_threshold` | 0.15 | Ngưỡng đề xuất bật FGS |
| `timer_screen_native_ad_enabled` | false | Bật qua A/B sau khi có data |
| `preset_free_limit` | -1 (unlimited) | Không giới hạn ở MVP |
| `custom_sound_unlock_hours` | 24 | Thời hạn Rewarded unlock tạm thời |

### ATT (App Tracking Transparency) — thiếu trong v1.1, bổ sung (iOS)
- **Thời điểm xin:** sau khi user đã có ít nhất 1 "value moment" (vd sau khi tạo/start timer đầu tiên thành công), **không xin ngay lúc cold-start đầu tiên** — xin quá sớm khi chưa thấy giá trị app dễ bị Deny cao, giảm eCPM về sau.
- **Nếu Denied/Restricted:** AdMob vẫn phục vụ **non-personalized ads** — không chặn monetization, chỉ giảm eCPM. Cần cấu hình `requestConfiguration` cho non-personalized fallback, không được để ads fail hoàn toàn.
- Privacy Policy phải mô tả rõ việc dùng Google Mobile Ads SDK + khả năng tracking nếu được cho phép.

### Quy tắc vàng
1. Không interstitial giữa stage / khi unlock-để-xem-timer.
2. Không limit preset ở MVP. Pro sau này = remove ads + custom sounds + history + advanced templates.
3. Rewarded unlock premium **tạm thời**, không unlock core vĩnh viễn.
4. Mọi magic number → Firebase Remote Config (bảng trên là default, không phải hard-code).

---

## 6. MVP Scope — P0 (đóng băng)

| Nhóm | Nội dung |
|---|---|
| **Timer Engine** | Pure Dart · state machine · absolute timestamps · reconcile · event-sourcing · repeat Once/N/Forever · auto-transition Always ON |
| **Controls** | Start, Pause, Resume (không drift), Skip, Stop (confirm; Pause/Skip không cần) |
| **Feedback** | Sound 3 built-in (on/off, `.playback` category iOS) · Vibration 2 pattern · local notif stage-change + complete |
| **Background** | Android: Exact Alarm primary + `BootCompletedReceiver` + FGS opt-in fallback · iOS: queue max 50 + `BGAppRefreshTask` best-effort · reconcile mọi lần wake |
| **Permissions** | `POST_NOTIFICATIONS` (khi tạo timer đầu) · `SCHEDULE_EXACT_ALARM` (just-in-time lúc Start) · `RECEIVE_BOOT_COMPLETED` (manifest, không dialog) |
| **Presets** | CRUD + 3 templates (Work/Break 60/10, Pomodoro 25/5+15, HIIT 40/20) + Duplicate |
| **Screens** | Home (templates+presets) · Editor · Timer Running · Settings |
| **Settings** | Sound, Vibration, Wake Lock, Theme (system), About + Privacy + Rate. Không toggle auto-start |
| **UX quyết định** | "Continue where you left off?" sau kill/reboot (Resume/Restart/Dismiss) · Stop confirmation · cảnh báo iOS coverage-window nếu routine dài |
| **Validation** | Editor: duration 1s–24h, stages 1–50, rounds ≥1, name max length |
| **Storage** | Hive + `schemaVersion` field, repository abstraction |
| **Policy** | Privacy Policy + Consent Day 1 · ATT timing đúng (§5) · `specialUse` justification nếu dùng FGS |
| **Observability** | Firebase Analytics + Crashlytics + `missed_transition_rate` instrumentation từ Day 1 |
| **Ads** | App Open + Interstitial post-Stop + Native Home + Rewarded (tạm thời) — Remote Config defaults theo §5 |

### P1 (v1.1 tiếp theo — không kéo vào MVP)
Warning 30s · Drag-reorder stage · Notification actions (Pause/Skip/Stop) · Toggle auto-transition (chỉ khi data chứng minh cần) · Custom sound tải vĩnh viễn · ActivityKit/Live Activities (Lock Screen/Dynamic Island — giải quyết triệt để giới hạn §4.2 trên iOS) · share/import/export.

### P2 (có traction mới làm)
Statistics · cloud sync · account · widgets · watch · community templates.

---

## 7. UX chốt

### Timer Running — sacred screen
```
┌────────────────────────────┐
│ WORK                 (48px) │
│                             │
│        24:58        (72px) │
│    ─── progress ────        │
│    Round 2 / 5              │
│  Next: BREAK · 05:00        │
│                             │
│ [ ⏸ Pause ]  [ ⏭ Skip ]     │
│          Stop (confirm)     │
└────────────────────────────┘
```
Không ad. Không che countdown/progress/controls.

### "Continue where you left off" (sau kill / reboot)
```
  Timer was running
  Stage: WORK · 24:58 left
  (nếu completedAt cho thấy đã trôi qua hết sequence → "Routine đã hoàn thành trong lúc bạn vắng mặt")
  [ ▶ Resume ]   [ ↻ Restart ]   [ ✕ Dismiss ]
```
Không auto-resume.

### Cảnh báo coverage-window (MỚI — chỉ hiện khi cần)
Trong Editor, nếu tổng thời lượng ước tính của preset khiến >50 transitions cần schedule trước khi user dự kiến quay lại (heuristic đơn giản: tổng stage-duration của 50 transition kế tiếp < X giờ mong đợi):
```
ⓘ Routine dài này có thể cần mở lại app sau khoảng ~50 phút
   để tiếp tục nhận thông báo đầy đủ trên iOS.
```
Chỉ hiện trên iOS, không hiện trên Android (Exact Alarm không có giới hạn số lượng tương tự).

### Home / Editor / Settings
Giữ nguyên như v1.1 — Templates-first activation, Native ad chỉ ở Home, validation theo §6.

---

## 8. Test suite (bắt buộc device thật)

### Unit (Engine — FakeClock)
Missed K stages · clock/timezone change (best-effort) · repeat once/N/forever · skip cuối stage/round · race expire+skip · state invariants.

### Platform / device
- Kill app → continue dialog đúng
- **Device reboot → alarm reschedule qua BootCompletedReceiver hoạt động thật** (test case mới, bắt buộc — đây chính là lỗ hổng #2 nếu bỏ qua)
- **iOS: chạy full 50-notification queue, để máy khoá >60 phút không đụng vào → xác nhận app im lặng đúng như spec, reconcile() đúng khi mở lại** (test case mới cho lỗ hổng #1)
- App update khi session chạy → snapshot hợp lệ
- Edit preset khi session chạy → snapshot không đổi
- Start B khi A chạy → block/confirm
- Exact-alarm permission denied → graceful degradation (`POSSIBLY_EXACT`)
- **`POST_NOTIFICATIONS` bị từ chối → app vẫn hoạt động, chỉ mất sound/notif, WakeLock vẫn cho phép nhìn màn hình** (test case mới)
- Silent/DND/Bluetooth/headset/battery saver
- OEM: Xiaomi/Samsung/Oppo autostart
- Ad load fail/no-internet · Remote Config toggling · **ATT Denied → non-personalized ads vẫn serve** (test case mới)

### Metrics nền tảng
`missed_transition_rate` (ngưỡng 0.15 → gợi ý FGS) · `ad_shown/clicked` · `permission_denied` (tách riêng theo loại permission) · `timer_started` · `att_status`.

---

## 9. Timeline (10–12 ngày)

| Phase | Ngày | Focus | Risk |
|---|---|---|---|
| 0 | 1–2 | Pure Dart TimerEngine + unit tests (FakeClock) | LOW |
| 1 | 2–3 | UI + Hive (+ schemaVersion) + Riverpod + 3 templates | LOW |
| 2 | 2 | Android Exact Alarm + BootCompletedReceiver + iOS queue 50 + BGAppRefreshTask | MED |
| 3 | 1–2 | Audio (.playback) + Vibration + Notification + Wake Lock + Continue-dialog | LOW |
| 4 | 2 | AdMob + Privacy + ATT flow + Remote Config (giá trị default §5) | MED |
| 5 | 1–2 | Real-device matrix (bao gồm reboot test + iOS 50-notif test) + polish + ASO + release | HIGH |
| **Total** | **10–12** | dev mạnh + boilerplate → 7–8; dev mới → 14 | |

---

## 10. Dependencies & Checklist

**Dependencies:**
`riverpod` · `hive`/`hive_flutter` · `flutter_local_notifications` · `wakelock_plus` · `audioplayers` · `vibration` · `google_mobile_ads` · `firebase_analytics` · `firebase_crashlytics` · `firebase_remote_config` · `package_info_plus` · `permission_handler` (POST_NOTIFICATIONS + SCHEDULE_EXACT_ALARM flow).

**Checklist trước khi submit store:**
- [ ] Privacy Policy URL + link in-app (Day 1)
- [ ] `POST_NOTIFICATIONS` xin lúc tạo timer đầu tiên
- [ ] `SCHEDULE_EXACT_ALARM` just-in-time lúc Start; graceful degrade nếu deny
- [ ] `RECEIVE_BOOT_COMPLETED` khai trong Manifest + `BootCompletedReceiver` implement + test thật trên device
- [ ] Nếu dùng FGS: `foregroundServiceType=specialUse` + justification, dialog nói rõ persistent notification
- [ ] App Open chỉ khi !hasActiveSession
- [ ] iOS: audio `.playback` set + test silent switch; `BGAppRefreshTask` đăng ký (best-effort)
- [ ] ATT xin sau value-moment đầu tiên, không lúc cold-start; non-personalized fallback hoạt động
- [ ] Remote Config: toàn bộ default values ở §5 đã push lên console trước khi release

---

## 11. Rủi ro & Mitigation (cập nhật)

| Risk | Severity | Mitigation |
|---|---|---|
| Timer sai / background bị kill | 🔴 CRITICAL | Absolute timestamps + reconcile + Exact Alarm + BootCompletedReceiver + real-device test |
| **iOS im lặng sau 50-notification window** | 🟡 HIGH (mới nhận diện) | Công khai giới hạn trong Core Promise + cảnh báo Editor + BGAppRefreshTask best-effort + ActivityKit ở P1 để giải quyết triệt để |
| **Reboot làm mất alarm (Android)** | 🔴 CRITICAL nếu bỏ qua | BootCompletedReceiver bắt buộc, test thật trên device |
| Revenue thấp vì user khoá máy | 🟡 HIGH | App Open + Interstitial post-Stop + Native Home, không kỳ vọng dwell-time |
| AdMob reject/policy | 🟡 HIGH | Privacy Policy Day 1, ATT đúng timing, specialUse justification, frequency cap |
| App quá generic | 🟡 HIGH | Templates + ASO niche + reliability là USP |
| OEM battery kill | 🟡 MED | Exact Alarm + reconcile vẫn khôi phục đúng state; FGS opt-in nếu cần |

---

## 12. Final Score

| Dimension | /10 |
|---|---|
| Problem clarity | 9 |
| Dev feasibility | 8 |
| MVP simplicity | 8 |
| Usage frequency | 8 |
| Monetization | 6.5 |
| Differentiation | 6 |
| Technical risk | 7.5 (tăng từ 7 nhờ vá lỗ hổng reboot/iOS-window) |
| Expansion potential | 8 |
| **Overall** | **~8.3 — APPROVED, READY TO CODE** |

Thành công = engine reliability (kể cả qua reboot) + UX tin cậy + monetization đúng chỗ AdMob trả tiền. Không còn lỗ hổng "spec nói vậy nhưng thiếu cơ chế thực thi".

---

## 13. Handoff dev (tóm tắt)

1. Pure Dart `TimerEngine` + `FakeClock` test suite trước mọi UI.
2. Android: Exact Alarm primary + **`BootCompletedReceiver` bắt buộc** (không có thì "hỗ trợ reboot" là lời hứa suông) + FGS chỉ khi `missed_transition_rate > 0.15`.
3. iOS: queue max 50 + `.playback` audio + `BGAppRefreshTask` (best-effort) — **và chấp nhận, công khai với user** rằng routine rất dài có thể mất thông báo sau ~50 phút không mở app.
4. Permissions đúng thứ tự: `POST_NOTIFICATIONS` → `SCHEDULE_EXACT_ALARM` (just-in-time) → `RECEIVE_BOOT_COMPLETED` (manifest).
5. Ads: App Open + Interstitial post-Stop + Native Home + Rewarded tạm thời; Remote Config với default values ở §5; ATT xin sau value-moment, không lúc cold-start.
6. Ship 3 templates / 2 vibration pattern / auto-transition Always ON. Timeline 10–12 ngày, test reboot + iOS-window thật trên device trước release.

---

*One-liner: Kiến trúc đã chín qua 6+ vòng review — v1.2 chỉ vá đúng những chỗ "nói đã chốt nhưng thiếu cơ chế": reboot cần BroadcastReceiver, iOS cần công khai giới hạn 50-notification, permissions cần đủ 3 loại, Remote Config cần default cụ thể, ATT cần đúng thời điểm. Không còn gì để review thêm — bắt đầu code.*

---

## 14. Diff so với v1.1 (`plan1_final_1.md`)

1. **iOS 50-notification window**: từ "chốt kỹ thuật" → công khai là **known limitation** với UX cảnh báo trong Editor + `BGAppRefreshTask` best-effort + đẩy ActivityKit thành giải pháp triệt để ở P1 (§4.2, §7).
2. **Android reboot**: thêm `BootCompletedReceiver` + `RECEIVE_BOOT_COMPLETED` cụ thể — biến "reboot policy" từ lời hứa thành cơ chế thật (§4.1, §10, test case mới ở §8).
3. **Permissions đầy đủ 3 loại** thay vì chỉ nói `SCHEDULE_EXACT_ALARM`: thêm `POST_NOTIFICATIONS` (Android 13+) và `RECEIVE_BOOT_COMPLETED` với thứ tự xin rõ ràng (§4.1, §6).
4. **FGS opt-in UX trade-off** được nói rõ trong dialog (persistent notification bắt buộc, không ẩn được) — tránh dev/design bỏ sót (§4.1).
5. **Remote Config default values** — bảng 8 giá trị khởi điểm cụ thể thay vì để trống hoàn toàn (§5).
6. **ATT timing + non-personalized ads fallback** — thêm mới hoàn toàn, v1.1 chưa đề cập (§5, §10).
7. **`completedAt` field** thêm vào `TimerSession` — phục vụ "continue dialog" phân biệt được case "đã hoàn thành trong lúc vắng mặt" (§3, §7).
8. **`schemaVersion` field** cho Preset/Session — chuẩn bị Hive migration (§2, §3).
9. Core Promise (§1) tinh chỉnh thêm cụm "when returning to the app" để phản ánh đúng giới hạn thực tế đã công khai ở #1.
10. Test suite bổ sung 3 test case cụ thể: reboot thật, iOS 50-notification window thật, `POST_NOTIFICATIONS` denied (§8).
11. Final score tăng 8.0 → 8.3 vì technical risk giảm (7 → 7.5) nhờ vá lỗ hổng reboot/iOS-window trước khi code thay vì phát hiện giữa chừng.