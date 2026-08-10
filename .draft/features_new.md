# LoopTimer — Feature Plan Mới (v1.3 → v1.6)

> Nguồn: `features.md` (inventory thực tế v1.2) + `plan2.md` + `plan2_review1..4.md` + phản biện cuối
> Trạng thái: **✅ v1.3 ĐÃ IMPLEMENT + VERIFY (2026-08-09)** — 5 change openspec (`add-notification-cold-start`, `add-scheduled-routine`, `add-quick-start`, `add-drag-drop`, `add-forever-ui`) đã verify 20/20 requirements, **193 tests xanh**, tsc sạch, web export OK. Phase 0 (cold-start fix + FGS dialog) đã xong. **Phần còn lại (v1.4 → v1.6) mới là READY FOR IMPLEMENTATION.**
> Mục tiêu: chuyển LoopTimer từ "timer app tốt" → "công cụ thực thi routine hàng ngày gần như không cần suy nghĩ" (**Closed Habit Loop**: Create → Schedule → Run → Complete → Track → Repeat).
> Nguyên tắc bất khả xâm phạm (giữ từ v1.2): sacred timer screen (không ad/không che countdown), single active session, local-first không backend/account, 12 ngôn ngữ key-parity, không cần backend trừ khi chứng minh cần.

---

## 0. Tổng quan quyết định

### Điểm hội tụ tuyệt đối (4 review + plan2 đồng thuận, không tranh cãi)
- **Product direction**: Timer → Habit Loop.
- **P0 v1.3**: Scheduled Routine/Reminder · Drag & Drop Stage · Quick Start/Favorites · Quick Routine (+ Save as Preset) · Cold-start notification fix · Repeat Forever UI.
- **P1 v1.4**: Widget (Android) + Live Activity (iOS) — ưu tiên **trước** Weekly Goals vì JS foundation đã sẵn và giải quyết luôn giới hạn 50-notification iOS.
- **P1 v1.5**: Weekly Goals · Session Notes · Curated Template Library · Smart Routine v2 · Duplicate/Save as.
- **P1/P2 v1.6**: Pro IAP one-time (remove ads, permanent sounds, export, backup).
- **KHÔNG làm**: Cloud Sync/Account, Community Templates, Apple Watch, Badge/Level gamification.
- **Monetization**: KHÔNG giới hạn preset free (`preset_free_limit` giữ -1). Pro bán remove-ads + permanent custom sound + export + backup, không phải giới hạn core functionality.

### 4 gap thực thi mới phát hiện khi đối chiếu với `features.md` (đưa thẳng vào spec dưới đây)
1. **Xung đột ngân sách notification iOS** giữa Stage Queue (max 50) và Reminder Queue — cần tách ngân sách rõ ràng, không để chung 1 pool không giới hạn.
2. **FGS "Keep timer alive" đã có Remote Config threshold nhưng chưa có UI** — đưa vào Phase 0 backlog, không được quên.
3. **Template immutability vs Editor Save** — mở template gốc rồi Save phải luôn là "Save as new preset", không ghi đè 3 template built-in.
4. **Streak phải preset-agnostic** (Quick Routine không lưu preset vẫn tính streak) + **buffer effort riêng cho i18n 12 ngôn ngữ** mỗi feature.

---

## 1. Phase 0 — Technical Debt & Release Readiness (BẮT BUỘC TRƯỚC v1.3)

> Không được nhảy thẳng vào feature mới. Nếu ship v1.3 mà nền tảng còn placeholder → rủi ro store reject + phá chính USP "reliability".

| # | Việc | Vì sao bắt buộc |
|---|---|---|
| 1 | Sửa Privacy Policy URL + Store URL (Rate) — hiện là `example.com` | Bắt buộc để submit store, AdMob yêu cầu Privacy Policy thật |
| 2 | Cấu hình AdMob App ID + unit IDs thật + tích hợp Google UMP Consent | Hiện đang test ad units (không doanh thu); UMP bắt buộc cho EU/California |
| 3 | Xử lý Notification Cold-Start Actions (Pause/Skip/Stop khi app bị kill) | UX inconsistency ảnh hưởng trực tiếp USP reliability; xem chi tiết §3.4 |
| 4 | Build & test thật trên EAS dev build (Android + iOS device thật, đặc biệt exact alarm + boot completed) | `features.md` xác nhận chưa test native device thật |
| 5 | **[MỚI] Implement dialog "Keep timer alive" (FGS opt-in)** | Threshold + Remote Config đã có sẵn (`missed_transition_rate_threshold=0.15`) nhưng UI chưa code — đã bị bỏ sót trong cả 4 review trước |

**Effort ước lượng:** 3–5 ngày.

---

## 2. Release v1.3 — "Daily Routine & Zero-Friction"

### 2.1. 🔥 Scheduled Routine / Reminder (P0 #1 — quan trọng nhất)

**Mục tiêu:** đóng vòng lặp habit — user không cần tự mở app để nhớ routine.

**UX:**
```
Home → "Routine hôm nay" (đã có) + card Scheduled mới:

  Morning              [⏰ 08:00]
  ☀️ Morning Stretch
  [Start]  [⋮ Sửa lịch]

  Work                 [⏰ 09:00]
  💼 Deep Work
  [Start]  [⋮ Sửa lịch]
```
Notification lúc 08:00:
```
Time for Morning Stretch
[Start] [Snooze 5m] [Snooze 10m] [Dismiss]
```
Tap [Start] → deep-link `looptimer://?start=<presetId>` → timer chạy ngay.

**⚠️ Guardrail bắt buộc (3 cái, không được bỏ):**

1. **Overwrite Guard** — nếu reminder nổ/được tap lúc đang có active session khác:
```
Check hasActiveSession?
  CÓ → Dialog: "Bạn đang trong phiên [Deep Work] (còn 15m).
                Bắt đầu [Morning Stretch] sẽ hủy phiên hiện tại."
       [Hủy phiên & Bắt đầu]   [Tiếp tục phiên hiện tại]
  KHÔNG → Start ngay
```
   Áp dụng **cả với Quick Routine đang chạy** (temp session, presetId ẩn `temp_quick_session`) — đây là điểm dễ bị bỏ sót vì Quick Routine không phải preset thật nhưng vẫn phải được coi là "active session" cho Overwrite Guard.

2. **Snooze** — notification có [Start] [Snooze 5m] [Snooze 10m] [Dismiss], tối đa 3 lần snooze rồi tự dismiss. Lưu `snoozeCount` + `snoozeUntil` trong `RoutineSchedule`.

3. **Missed Routine không phá streak theo kiểu trừng phạt:**
```
Home → card:
  ⏰ Morning Routine
  Scheduled 08:00 — Missed today
  [▶ Start now]   [Skip]
```
   Streak chỉ reset khi user **không mở app 2 ngày liên tiếp**, không phải khi bỏ lỡ 1 lần reminder cụ thể.

**🔴 Guardrail thứ 4 — MỚI, chưa review nào nhắc: ngân sách notification chung với Stage Queue (iOS)**

`features.md` đã xác nhận iOS giới hạn `max_scheduled_transitions_ios = 50` cho stage-transition. Reminder cũng dùng cùng `UNUserNotificationCenter` — chung 1 trần ~64 pending notification của Apple. Nếu user có 1 session dài (50 slot) + nhiều `RoutineSchedule` bật cùng lúc → có thể vượt trần, khiến iOS tự drop notification cũ nhất (im lặng, không báo lỗi).

**Quyết định thiết kế bắt buộc:**
```
RESERVED_REMINDER_SLOTS = 10   // Remote Config key mới: reminder_reserved_slots
effective_max_stage_queue = 64 - RESERVED_REMINDER_SLOTS - activeRoutineScheduleCount()
// Nếu effective_max_stage_queue < max_scheduled_transitions_ios (50) → dùng effective, không dùng 50 cố định
```
`UNCalendarNotificationTrigger` với `repeats: true` chỉ tốn **1 slot** cho cả chuỗi lặp hàng ngày/hàng tuần — nên 5-10 `RoutineSchedule` bật cùng lúc chỉ tốn 5-10 slot cố định, KHÔNG nhân theo số ngày. Vẫn cần reserve cứng vì stage queue (50) + reminder queue cộng dồn có thể áp sát 64.

**Data model:**
```typescript
interface RoutineSchedule {
  id: string;
  presetId: string;
  enabled: boolean;
  daysOfWeek: number[];              // 1=Mon .. 7=Sun
  hour: number;                      // 0-23
  minute: number;                    // 0-59
  notificationMinutesBefore: number[]; // [0] hoặc [0, 10]
  lastTriggeredDate?: string;        // YYYY-MM-DD, tránh trigger nhiều lần/ngày
  snoozeCount?: number;
  snoozeUntil?: string;              // ISO timestamp
  schemaVersion: 1;
}
```

**Không cần backend.** Priority: **P0 — làm đầu tiên trong v1.3.**

---

### 2.2. 🔥 Drag & Drop Stage Reordering (P0)

**UX:**
```
☰ WORK       30:00
☰ REST        5:00
☰ SPRINT      1:00
☰ WALK        2:00
```
Long-press → drag để đổi vị trí.

**Implementation:**
- Dùng `react-native-draggable-flatlist` hoặc `react-native-reanimated` + gesture-handler (đã có reanimated trong stack).
- **State Invariant bắt buộc:** khi swap Stage A/B chỉ đổi `order`/`index`, **KHÔNG tạo ID mới** — vì `Stage.id` đang map `soundId` (custom sound per-stage, đã code ở v1.1). Tạo ID mới sẽ làm gãy mapping sound đã build.

```typescript
// Sai — tạo stage mới, mất soundId mapping
const newStages = stages.map((s, i) => ({ ...s, id: generateId() }));
// Đúng — chỉ đổi order, giữ nguyên id
const reordered = swap(stages, fromIndex, toIndex);
```

**🔴 Ambiguity mới cần chốt trước khi code — tương tác với template immutability:**

`features.md` xác nhận 3 template built-in **không xóa được**. Nhưng khi user mở template trong Editor, kéo-thả đổi thứ tự rồi bấm "💾 Lưu preset" — hành vi hiện chưa định nghĩa: ghi đè template gốc hay tạo bản mới?

**Quyết định bắt buộc:** Template là **read-only entry point**. Bất kỳ Save nào bắt nguồn từ một template (kể cả chỉ đổi order) phải luôn là **"Save as new preset"** (tự động gợi ý tên `"[Template name] (edited)"`), không bao giờ ghi đè 3 template gốc. Cần cờ `isTemplate: boolean` (hoặc kiểm tra theo id cố định) truyền vào Editor state để route đúng luồng Save.

**Priority: P0.** Chi phí thấp, tần suất sử dụng cao.

---

### 2.3. 🔥 Quick Start / Favorites (P0)

**UX:**
```
RECENT
▶ HIIT
▶ Deep Work
▶ Morning Stretch

FAVORITES
⭐ Pomodoro
⭐ 10 × 1min Intervals
```
Tap = Start ngay, không qua Editor.

**Long-press preset (menu mở rộng từ ActionMenu hiện có):**
```
▶ Start
✏ Edit
📋 Duplicate
⭐ Favorite / Unfavorite
↗ Share
🗑 Delete
```
`⭐ Favorite` là field mới `Preset.isFavorite: boolean` (additive, có default `false` → không cần bump schemaVersion, giống cách `Settings` đã làm ở v1.2).

**Bonus — Preset chips (từ plan2 §20):**
```
MY ROUTINES
[Pomodoro ▶] [HIIT ▶] [Deep Work ▶] [Stretch ▶]
```
Tap icon ▶ = start ngay; tap phần thân = mở Editor. Kết hợp Favorites → zero-friction cực cao.

**Priority: P0.** Chi phí thấp, cần thiết cho "zero-friction repeat usage".

---

### 2.4. 🔥 Quick Routine (P0 — "killer UX")

**UX:**
```
Home → Quick Routine

Work    [ 25 min ]
Break   [ 5 min ]
Repeat  [ 4 ]
        [Start]
```
Không đặt tên, không lưu ngay, không qua Editor đầy đủ. Gán `presetId` ẩn `temp_quick_session` để tránh rác database.

**Sau khi hoàn thành:**
```
CompletionDialog:
🎉 Quick Routine Complete!
[💾 Lưu thành Preset]   [Bỏ qua]
```
Nếu chọn Lưu → dialog nhập tên → xuất hiện trên Home. Nếu không Save → session **vẫn log vào SessionLogRepo** (Stats) nhưng không có `presetId` thật (dùng `temp_quick_session` hoặc `null`).

**🔴 Điểm cần chốt — streak phải preset-agnostic:**

Streak hiện tính từ `SessionLogRepo`. Cần xác nhận rõ trong implementation: streak logic **không được filter theo `presetId`** — bất kỳ session `completed` nào (kể cả Quick Routine chưa save) đều tính vào streak, vì bản chất streak đo hành vi hoàn thành routine hàng ngày, không phải preset cụ thể. Đây là bug tiềm ẩn dễ xảy ra nếu dev vô tình join theo `presetId` khi query streak.

**Priority: P0.** Time-to-first-timer cực thấp, tăng activation mạnh hơn gamification.

---

### 2.5. 🔴 Notification Cold-Start Actions (P0 — fix bắt buộc, không phải feature mới)

**Vấn đề:** tap Pause/Skip/Stop từ notification khi app process đã bị kill → hiện chưa xử lý (chỉ hoạt động khi app đang chạy nền).

**Luồng bắt buộc:**
```
App killed
  ↓
Notification tap (Pause/Skip/Stop)
  ↓
Cold start → Hydrate Zustand store từ AsyncStorage
  ↓
Gọi reconcile(now) → xác định state đúng hiện tại
  ↓
Apply action (Pause/Skip/Stop) → Persist
  ↓
Navigate: hasActiveSession ? router.push('/timer') : router.push('/')
```

**Code pattern (expo-notifications):**
```typescript
// app/_layout.tsx
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const action = response.actionIdentifier;
      await hydrateStores();               // đọc AsyncStorage nếu store chưa hydrate
      timerStore.reconcile(Date.now());     // engine tự sửa state đúng
      if (action === 'pause') timerStore.pause();
      else if (action === 'skip') timerStore.skip();
      else if (action === 'stop') timerStore.stop();
      router.push(timerStore.hasActiveSession ? '/timer' : '/');
    }
  );
  return () => subscription.remove();
}, []);
```

**Priority: P0 — technical debt, phải xong trước khi thêm Scheduled Routine** (Scheduled Routine cũng dùng cùng cơ chế notification-response, nên fix chung 1 lần).

---

### 2.6. Repeat Forever — UI/UX rõ ràng (P0, chi phí thấp)

**Timer screen:**
```
ROUND 37 / ∞
Next: BREAK · 05:00
```
**Notification:** `WORK · Round 37` (KHÔNG hiện `/ ∞` trong notification — gây rối mắt).

**CompletionDialog (Forever mode):** không hiện "Completed" — chỉ hiện khi user bấm Stop thủ công:
```
⏸ Timer đang chạy tiếp tục
Press Stop to finish manually
```
**Stats:** session `forever` không log là "completed" tự động — chỉ log khi status = `stopped`.

**Priority: P0.** Nhỏ nhưng cần thiết để tránh hiểu nhầm UX.

---

### Tổng kết v1.3

| # | Feature | Effort | Priority |
|---|---|---|---|
| 1 | Scheduled Routine + Overwrite Guard + Snooze + Missed-no-punish + budget-split iOS | Medium-High | P0 |
| 2 | Drag & Drop (+ template-save-as-new rule) | Low-Medium | P0 |
| 3 | Quick Start / Favorites + Preset chips | Low | P0 |
| 4 | Quick Routine + Save as (+ streak preset-agnostic) | Low-Medium | P0 |
| 5 | Cold-start notification actions | Medium | P0 |
| 6 | Repeat Forever UI | Low | P0 |

**Effort tổng:** ~2–3 tuần (1 dev). **Lưu ý effort:** cộng thêm buffer riêng cho i18n — mỗi feature trên sinh ra hàng chục string UI mới × 12 ngôn ngữ (key-parity ép kiểu build-time, không được bỏ file nào), effort "Low/Medium" ở trên chưa gồm phần này.

---

## 3. Release v1.4 — "Widget & Lock-Screen (At-a-Glance)"

> Ưu tiên **trước** Weekly Goals vì JS foundation (`WidgetBridge`, `buildTimerSnapshot`, deep-link `?start=`) đã code xong ở v1.2 — phần còn lại là technical work (EAS native extension), không phải design work. Live Activity còn giải quyết luôn giới hạn iOS 50-notification (hiển thị realtime không cần notification).

### 3.1. Android Home Widget
```
┌──────────────────────┐
│ 🏃 HIIT              │
│       18:32          │
│      WORK            │
│ [▶ Start]            │
└──────────────────────┘
```
Đọc `looptimer:widget-snapshot` (AsyncStorage) đã có sẵn từ `WidgetBridge`. Tap "Start" khi idle → deep-link `?start=<presetId>` (chọn preset gần nhất/favorite mặc định).

### 3.2. iOS Live Activity (ActivityKit)
```
┌────────────────────────┐
│ HIIT          Round 4/8│
│        18:32           │
│        WORK            │
│ Next: REST · 00:20     │
└────────────────────────┘
```
Cần App Groups + ActivityKit binding (EAS config plugin native). Đây là hạng mục duy nhất thực sự yêu cầu native code ngoài Expo managed workflow thuần.

### 3.3. Smart Routine v2 (nâng cấp `suggestPresetForNow`)
```typescript
// hiện tại: 4 khung giờ × 7 ngày gần nhất
suggestPresetForNow(entries, presets, now) → preset
// nâng cấp: học theo NGÀY TRONG TUẦN (4 tuần gần nhất, cùng thứ)
suggestPresetForDayOfWeek(entries, presets, now) → preset
```
Ví dụ: user hay HIIT vào Thứ 3/5/7 → app gợi ý đúng những ngày đó thay vì chỉ theo khung giờ chung. Deterministic local, không AI/cloud.

### 3.4. Effort
Widget + Live Activity: 2–3 tuần (cần EAS dev build, test thật). Smart Routine v2: Low effort, tận dụng hạ tầng có sẵn.

---

## 4. Release v1.5 — "Habit & Goals"

### 4.1. Weekly Goals (tối giản, không phức tạp)
```typescript
interface WeeklyGoal {
  id: string;
  presetId?: string;        // undefined = tất cả preset
  targetSessions: number;   // 3, 5, 7, hoặc custom
  weekStart: string;        // YYYY-MM-DD (Monday)
  schemaVersion: 1;
}
```
```
Settings → Weekly Goal
○ 3 sessions   ○ 5 sessions   ○ 7 sessions   ○ Custom: [__]
For: ● All routines   ○ [Chọn preset cụ thể]
```
CompletionDialog hiển thị thêm:
```
🎉 HIIT Complete
Weekly goal: 5/7 sessions  ████████████░░░  2 more to go!
```
Không làm badge/level — giữ nguyên "goal-based progress > game mechanics" (đồng thuận cả 4 review).

### 4.2. Session Notes (optional, không ép user)
```
🎉 HIIT Complete
[🙂] [😐] [😓]   ← optional
[Add note]       ← optional, mở text input
[Done]
```
```typescript
// Thêm vào SessionLogEntry hiện có
mood?: 'happy' | 'neutral' | 'sad';
note?: string;
```
Stats hiển thị phân bố mood theo preset: `HIIT · 8 sessions · 🙂 6 · 😐 1 · 😓 1`.

### 4.3. Curated Template Library (KHÔNG community)
```typescript
// templates.json (build-time, hard-code)
const TEMPLATES = [
  { id: 'tabata', name: 'Tabata', category: 'workout',
    stages: [{ name: 'Work', durationSeconds: 20 }, { name: 'Rest', durationSeconds: 10 }],
    repeatMode: 'fixedCount', fixedCount: 8,
    description: '20s work · 10s rest · 8 rounds' },
  // ... 10-15 template: EMOM, AMRAP, 52/17, Breathing, Meditation, Cooking, Study...
];
```
Phân loại: 🏃 Workout · 🧠 Focus · 🧘 Wellness · 🍳 Daily. Mỗi template có preview + nút "Use this" → tạo preset mới (KHÔNG phải template built-in bất biến — user preset thường, xóa được).

Community Templates (backend + account + moderation) **chỉ làm khi có traction chứng minh nhu cầu** — không làm ở giai đoạn này.

### 4.4. Duplicate / Save as (đẩy P0→P1, đã có Duplicate cơ bản ở v1.2 §3.2)
```
Edit preset đang chạy
  ↓
[Save changes]  hoặc  [Save as new preset]
```
Đặc biệt hữu ích khi preset được share/import (v1.2 đã có preset-codec) — tránh user vô tình sửa preset đã import từ người khác.

### 4.5. Effort
~2 tuần. i18n buffer riêng cho Weekly Goals + Session Notes + Template Library (nhiều string mô tả × 12 ngôn ngữ).

---

## 5. Release v1.6 — "Pro Monetization"

### 5.1. Bảng Freemium (chốt cuối, đồng thuận 4 review)

| Tính năng | Free (Ad-supported) | Pro (One-time $4.99–$6.99) |
|---|---|---|
| Presets | **Unlimited** (không giới hạn) | Unlimited |
| Ads (Banner/Interstitial) | Có, cooldown 240s | ✅ Tắt 100% |
| Custom Sound Pack | Rewarded unlock 24h | ✅ Vĩnh viễn |
| Widget | Có (hiển thị + start) | ✅ Có + Quick Start nâng cao |
| Live Activity (iOS) | Có (cơ bản) | ✅ Đầy đủ |
| Weekly Goals | Có (cơ bản) | ✅ Nâng cao (nhiều goal cùng lúc) |
| Export Stats | ❌ | ✅ CSV/JSON |
| Backup/Restore | ❌ | ✅ |
| Future premium | ❌ | ✅ |

**Quan trọng:** KHÔNG dùng `preset_free_limit` để ép Pro (giữ `-1`). User timer app rất nhạy cảm với "nickel-and-diming" — 4/4 review đồng thuận điểm này.

### 5.2. Backup / Restore (local, không cloud)
```
Settings → Backup → Export all data → looptimer-backup-YYYY-MM-DD.json
Settings → Restore → Import backup file
```
Đủ cho hầu hết use case mà vẫn giữ thesis local-first — thay thế hoàn toàn nhu cầu Cloud Sync ở giai đoạn này.

### 5.3. Ghi chú về App Open Ad hiện đang tắt
`features.md` xác nhận `PLACEMENT_ENABLED.appOpen = false`. Sau khi Phase 0 hoàn tất UMP consent, cân nhắc bật lại App Open cho user Free (đã có eligibility rule `canShowAppOpen()` sẵn từ trước) như một phần hoàn thiện monetization stack song song với Pro — không phải feature mới, chỉ là bật lại cấu hình đã có.

### 5.4. Effort
~2–3 tuần (IAP integration + backup/restore + gate ads theo Pro status).

---

## 6. Không làm (đồng thuận tuyệt đối 4 review + plan2)

| Feature | Lý do |
|---|---|
| Cloud Sync / Account | Kéo theo auth, sync conflict, schema migration cross-device, backend cost, privacy/delete-account — chưa chứng minh nhu cầu; Backup/Restore local đã đủ cho phần lớn use case |
| Community Templates | Cần backend + moderation + spam + ranking — Curated Template Library (v1.5) đã đủ giá trị mà không cần platform hóa |
| Apple Watch | ROI thấp hơn Widget/Live Activity ở giai đoạn hiện tại; chỉ làm khi có evidence workout-user là segment đủ lớn |
| Badge/Level gamification | Streak + Weekly Goals + heatmap đã đủ incentive; badge/level có nguy cơ biến app thành Habitica thay vì timer |

---

## 7. Roadmap tổng hợp

| Release | Nội dung chính | Effort |
|---|---|---|
| **Phase 0** | Privacy/Store URL thật · Real AdMob + UMP · Cold-start notification fix · EAS real-device test · **[mới] FGS opt-in dialog** | 3–5 ngày |
| **v1.3 Daily Routine** | Scheduled Routine (+3 guardrail +budget-split iOS) · Drag-Drop (+template-save-as-new) · Quick Start/Favorites/chips · Quick Routine (+Save as, streak-agnostic) · Forever UI | 2–3 tuần |
| **v1.4 At-a-Glance** | Android Widget · iOS Live Activity · Smart Routine v2 | 2–3 tuần |
| **v1.5 Habit & Goals** | Weekly Goals · Session Notes · Curated Templates · Duplicate/Save as | ~2 tuần |
| **v1.6 Pro** | IAP one-time · Remove Ads · Permanent sounds · Export stats · Backup/Restore · (bật lại App Open cho Free) | 2–3 tuần |

**Không làm:** Cloud Sync, Community Templates, Apple Watch, Badge/Level.

---

## 8. Data model — tổng hợp field mới cần thêm

```typescript
// Mới hoàn toàn
interface RoutineSchedule {
  id: string; presetId: string; enabled: boolean;
  daysOfWeek: number[]; hour: number; minute: number;
  notificationMinutesBefore: number[];
  lastTriggeredDate?: string;
  snoozeCount?: number; snoozeUntil?: string;
  schemaVersion: 1;
}

interface WeeklyGoal {
  id: string; presetId?: string; targetSessions: number;
  weekStart: string; schemaVersion: 1;
}

// Additive vào model có sẵn (có default → KHÔNG cần bump schemaVersion)
Preset.isFavorite?: boolean = false;
SessionLogEntry.mood?: 'happy' | 'neutral' | 'sad';
SessionLogEntry.note?: string;

// Remote Config key mới
reminder_reserved_slots: number = 10;   // ngân sách notification dành riêng cho RoutineSchedule (iOS)
```

---

## 9. Checklist trước khi bắt đầu code v1.3

- [ ] Phase 0 hoàn tất 100% (đặc biệt: cold-start notification fix + FGS dialog)
- [ ] Quyết định rõ: template Save luôn tạo preset mới (không ghi đè 3 template gốc)
- [ ] `reminder_reserved_slots` đã thêm vào Remote Config console
- [ ] Streak logic xác nhận preset-agnostic (test case riêng: Quick Routine chưa save vẫn cộng streak)
- [ ] Overwrite Guard áp dụng cho cả `temp_quick_session`, không chỉ preset đã lưu
- [ ] Buffer effort riêng cho i18n 12 ngôn ngữ đã tính vào timeline mỗi feature

---

*One-liner cho dev: "Phase 0 trước (đặc biệt FGS dialog + cold-start fix, hai cái này hay bị quên). v1.3 = Scheduled Routine (nhớ tách ngân sách notification iOS với stage queue) + Drag-Drop (template luôn Save-as-new) + Quick Start/Favorites + Quick Routine (streak preset-agnostic) + Forever UI. Sau đó Widget/Live Activity (v1.4) → Weekly Goals/Templates (v1.5) → Pro IAP (v1.6). Không cloud, không community, không watch, không giới hạn preset free."*