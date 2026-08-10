# LoopTimer — Inventory toàn bộ tính năng hiện tại (v1.3)

> **Mục đích tài liệu:** Cung cấp bức tranh ĐẦY ĐỦ và CHÍNH XÁC về app hiện tại (đã code xong, test xanh) để một AI khác nghiên cứu và đề xuất **tính năng mới**, với mục tiêu: *"user giữ lại cài đặt và dùng hàng ngày"* (retention + daily habit).
>
> Mọi mô tả dưới đây đều là **trạng thái thực tế trong code** (đã kiểm chứng), không phải ý tưởng. **v1.2 (2026-08-09) đã thêm:** voice coaching, Routine hôm nay, màn hoàn thành + chia sẻ, share/import preset, onboarding 3 bước, JS foundation widget/Live Activities. **v1.3 (2026-08-09) đã thêm:** Scheduled Routine/Reminder (4 guardrail + budget-split iOS), notification cold-start actions + FGS dialog, Quick Start (Favorites + chips + Quick Routine + Save as Preset), Drag & Drop stage reorder + template save-as-new, Repeat Forever UI rõ ràng. **v1.4 (2026-08-10) đã thêm — JS layer:** Smart Routine v2 (gợi ý theo ngày-trong-tuần), home-screen widget Android & iOS (deep-link + nút Start/Pause/Resume/Stop interactive, **labels localize qua content**) + iOS Live Activity (expo-widgets, helper thuần + bridge wiring + nút Pause/Skip/Resume trên Lock Screen/Dynamic Island, 243 tests); phần native (prebuild/EAS build + test device) còn lại trong tasks. Phần **§8 Hướng nghiên cứu** ghi rõ những gì còn lại chưa code.
>
> Ngôn ngữ: file này viết bằng tiếng Việt. App hỗ trợ 12 ngôn ngữ.

---

## 1. Tổng quan sản phẩm

| Mục | Giá trị |
|---|---|
| **Tên app** | LoopTimer (slug `looptimer`, display name đang là "LoopTimer") |
| **Mô tả 1 dòng** | Tạo routine nhiều stage trong vài giây → Start một lần → Bỏ mặc điện thoại → Stage tự chuyển đáng tin cậy (âm thanh/rung/thông báo) |
| **Product thesis** | "Create → Start once → Leave phone alone → Reliable auto-transition" |
| **Core promise** | Timer engine luôn duy trì trạng thái đúng kể cả khi app ở nền/bị kill; user KHÔNG cần tự bấm chuyển stage khi quay lại app |
| **Phân khúc** | Interval timer / Loop timer / Routine timer / Multi-stage timer; phụ: Pomodoro repeat, HIIT timer, Workout interval, Study timer |
| **Đối thủ điển hình** | Interval Timer, Seconds Pro, Tabata Timer, Strong (workout) |
| **Kiến trúc** | Local-first, KHÔNG backend/account. Single active session/device |
| **Phiên bản code** | v1 + v1.1 (stats/sound-pack/notif-actions…) + **v1.2** (voice, routine hôm nay, completion+share, preset sharing, onboarding, widget foundation) + **v1.3** (scheduled routine/reminder, cold-start notif fix + FGS dialog, quick start/favorites/quick routine, drag-drop stage, forever UI) + **v1.4 JS layer** (smart routine v2, widget Android/iOS + Live Activity qua expo-widgets) |
| **Nền tảng** | Android + iOS (build EAS), Web (dev/test — một số capability là no-op) |

**USP hiện tại:** độ tin cậy của engine (absolute timestamp + reconcile → không bao giờ sai giờ kể cả bị kill/reboot), single-session đơn giản, UI vibrant, 12 ngôn ngữ, **voice coaching hands-free**, gợi ý routine theo thói quen, **reminder lịch trình lặp theo ngày/giờ** (Start/Snooze/Dismiss ngay trên notification, cold-start hoạt động cả khi app bị kill), quick start zero-friction (favorites/chips/quick routine), chia sẻ preset.

---

## 2. Tech stack (chốt, đang chạy)

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Expo SDK 57** + React Native 0.86 + React 19 | `newArchEnabled: true` |
| Routing | **expo-router** (file-based, typedRoutes) | `src/app/*` |
| State | **zustand** v5 | 4 store: timer, presets, settings, routine |
| Lưu trữ | **AsyncStorage** | Repos: PresetRepo, SettingsRepo, SessionRepo — có `schemaVersion` (migration-ready) |
| i18n | **i18next** + react-i18next + expo-localization | 12 ngôn ngữ, key-parity ép kiểu tại build |
| Âm thanh | **expo-audio** | 3 chime built-in + 6 custom sound (pack), `playsInSilentMode` (vượt Silent Switch iOS) |
| Voice coaching | **expo-speech** (native) / Web Speech API (web) | Đọc tên stage + cảnh báo 30s/10s + hoàn thành; theo locale; toggle trong Settings |
| Share | RN `Share` (native) / `navigator.share` + clipboard fallback (web) | Share preset JSON + chia sẻ kết quả hoàn thành |
| Rung | **expo-haptics** | 2 pattern |
| Thông báo | **expo-notifications** | Schedule theo stageEndsAt + foreground notif |
| Màn hình sáng | **expo-keep-awake** | Wake lock khi timer chạy |
| Quảng cáo | **react-native-google-mobile-ads** v16.4 | Lazy-load (an toàn trong Expo Go) |
| Analytics/RC/Crash | **@react-native-firebase** (analytics, crashlytics, remote-config, app) | Lazy-load |
| ATT (iOS) | **expo-tracking-transparency** | Xin sau value-moment đầu |
| Icons | **@expo/vector-icons** (Ionicons) | `Ionicons.loadFont()` ở startup (fix lỗi font trên web) |
| UI nâng cao | expo-linear-gradient, react-native-svg (ProgressRing), react-native-reanimated, expo-blur, safe-area-context | |
| Ngôn ngữ | TypeScript **strict**, jest + @testing-library/react-native | **243 tests** đang xanh |

**Cấu trúc thư mục:** `src/app` (screens: `index`, `preset/[id]`, `timer`, `settings`, `stats`, `onboarding`, `routine`, `routine/[id]`, `_layout`), `src/core` (timer engine thuần, validation, templates, storage repos), `src/platform` (abstraction + impl `.native.ts` / `.web.ts`), `src/features` (timer, presets, settings, stats, background, feedback, monetization, widget, **routine**), `src/components` (design system + CompletionDialog/ImportDialog/FgsDialog/QuickRoutineCard), `src/i18n` (12 dictionary + init), `src/hooks`.

---

## 3. Feature inventory (đầy đủ — đã code)

### 3.1 Timer Engine (lõi — thuần TypeScript, độc lập nền tảng)

- **State machine 5 trạng thái:** `IDLE / RUNNING / PAUSED / COMPLETED / STOPPED` với invariants (RUNNING bắt buộc `stageEndsAt != null`; PAUSED bắt buộc `pausedRemaining != null`).
- **Absolute timestamps:** `stageEndsAt = stageStartedAt + durationSeconds`; `remaining = max(0, stageEndsAt - now)`. Chỉ engine tính remaining; UI chỉ render.
- **`reconcile(now)`:** catch-up TẤT CẢ stage đã expired trong 1 lần gọi (missed K stages → advance cả K), mỗi transition apply đúng 1 lần (chống double-transition khi `expire` + `skip` đồng thời).
- **Repeat mode 3 kiểu:** `once` (1 lượt rồi kết thúc), `fixedCount` (N round, emit `RoundCompleted`), `forever` (vô hạn, không bao giờ `SessionCompleted`).
- **Commands:** `start / pause / resume (không drift — stageEndsAt = now + pausedRemaining) / skip / stop`.
- **Event-sourcing:** mọi side-effect (UI, scheduler, audio, ad) react qua events: `StageStarted(index, name, endsAt)`, `StageCompleted`, `RoundCompleted`, `SessionCompleted`, `SessionPaused`, `SessionResumed`, `SessionStopped`.
- **Clock injectable** (FakeClock trong test) → unit test deterministic.
- **Persist CHỈ tại transition event** (không persist theo tick giây của UI).
- **Single active session/device** — Start preset B khi A đang chạy → confirm trước.

### 3.2 Màn hình Home (`src/app/index.tsx`)

- Header: logo gradient + tên app + nút **Thống kê** (bar-chart) + nút **Settings** (icon, có accessibilityLabel).
- **Templates-first:** 3 template built-in (không xóa được) luôn nổi trước: **Work/Break 60/10** (forever), **Pomodoro 25/5+15** (once, có Long Break 15' sau round 4), **HIIT 40/20** (fixedCount, mặc định 8 round).
- **Card "Routine hôm nay"** (v1.2): gợi ý preset hay dùng nhất theo khung giờ hiện tại (7 ngày local) — nổi trên danh sách templates, Start 1 chạm, refresh mỗi lần focus. Ẩn khi chưa có thói quen.
- **Quick Routine** (v1.3): card form Work [25m] / Break [5m] / Repeat [4] + nút Start — không qua Editor, chạy dưới `temp_quick_session` (không tạo preset trong database).
- **Preset chips** (v1.3): hàng chip ngang (tên + nút ▶) — tap ▶ = start ngay, tap thân chip = mở Editor; scroll ngang.
- **FAVORITES section** (v1.3): preset có `isFavorite` nổi lên TRƯỚC templates + danh sách thường (bật/tắt từ ActionMenu long-press).
- **Card "Sắp tới"** (v1.3): reminder kế tiếp (sớm nhất trong các schedule đang bật) — tên preset + giờ.
- **Card "Missed today"** (v1.3): reminder đã qua giờ chưa xử lý — [▶ Start now] [Skip]; Skip → đánh dấu handled hôm nay (không phá streak).
- Card preset/template: chấm màu stage đầu, tên, chip meta (số stage · mode loop/rounds), nút **▶ Start** gradient.
- Chạm vào card → mở **Editor** (templates-first activation — không start trực tiếp).
- **Long-press** → ActionMenu: **Duplicate** (bản sao "(copy)"), **⭐ Favorite / Bỏ yêu thích** (v1.3), **Share preset** (v1.2 — JSON qua share sheet) và **Xóa** (chỉ preset user, có dialog confirm; template không có nút Xóa).
- Nút **"+ Tạo preset mới"** (dashed card) + nút **"Import preset"** (v1.2 — dialog paste JSON).
- **Deep-link:** `?start=<presetId>` quick start (widget foundation) và `?import=<encoded>` import preset.
- **Banner ad** (native only — web/Expo Go render null) nằm cố định cuối màn hình.
- Start khi timer đang chạy → ConfirmDialog "Ngưng timer hiện tại để bắt đầu preset này?".

### 3.3 Editor (`src/app/preset/[id].tsx`)

- **Tên preset** (input, placeholder theo locale).
- **Repeat mode** (SegmentedControl): 1 lần / N rounds / Vô hạn. N rounds → **Stepper** số round (min 1).
- **Danh sách stage:** mỗi stage gồm tên (input) + **duration Stepper** (giây) + nút xóa stage; nút "+ Thêm stage".
- **Sắp xếp lại stage (v1.3):** nút lên/xuống (chevron) trên mỗi stage card — reorder ngay lập tức, `Stage.id` + `soundId` GIỮ NGUYÊN (helper thuần `reorderStages` — không sinh id mới, không gãy mapping sound).
- **Template = read-only entry point (v1.3):** mở template built-in rồi Save → LUÔN tạo preset mới ("Lưu thành preset mới", id mới, tên gợi ý `[Tên] (edited)`), không bao giờ ghi đè 3 template gốc; template không có nút Xóa.
- **Validation (chặn lưu + chặn start):** tên preset không rỗng & ≤ 50 ký tự; 1–50 stage; duration mỗi stage 1s–24h; rounds ≥ 1. Hiện lỗi cụ thể qua ConfirmDialog/alert nội bộ.
- **CTA:** "▶ Start timer" (gradient brand, toàn chiều rộng, nổi bật) / "💾 Lưu preset" / "Xóa preset" (confirm).
- **iOS coverage warning:** nếu preset cần > trần hiệu dụng → cảnh báo nhẹ (chỉ iOS, không Android). **Trần hiệu dụng (v1.3):** `effectiveMax = 64 − reminder_reserved_slots(10) − số schedule đang bật`, so với `max_scheduled_transitions_ios` (50) — stage queue nhường slot cho reminder queue (budget-split iOS).
- Start khi timer đang chạy → confirm "Ngưng timer hiện tại?".

### 3.4 Màn hình Timer Running — "sacred screen" (`src/app/timer.tsx`)

- **ProgressRing SVG** (stroke gradient theo màu stage, tint nền theo màu stage, crossfade khi đổi stage; pulse nhẹ khi < 10s).
- Countdown lớn tabular-nums; tên stage; **Round x / y** — forever hiển thị **`ROUND x / ∞`** (v1.3); dải **StagePill** (các stage còn lại, highlight stage hiện tại); stage kế tiếp (tên + duration).
- **Controls:** ⏸ Pause / Resume, ⏭ Skip, **■ Stop** (có ConfirmDialog "Dừng timer?" — destructive). Exit ✕ → về Home nhưng **timer vẫn chạy nền** (background design).
- **KHÔNG có ad nào trên màn này** (bất khả xâm phạm).

### 3.5 Settings (`src/app/settings.tsx`)

- **ÂM THANH & RUNG:** toggle Âm thanh, toggle Rung, toggle **Đọc voice** (v1.2 — voice coaching, mặc định bật; persist + áp dụng transition kế tiếp).
- **MÀN HÌNH:** toggle "Giữ màn hình sáng khi timer chạy" (wake lock, chỉ khi có session), toggle "Theme theo hệ thống".
- **NGÔN NGỮ:** ActionMenu 13 lựa chọn (Theo hệ thống + 12 ngôn ngữ, tên bản địa). Mặc định theo máy.
- **LỊCH TRÌNH (v1.3):** route tới **Routine manager** (`/routine`) — danh sách + tạo/sửa/xóa/bật-tắt reminder lặp.
- **GÓI ÂM THANH** (chỉ hiện khi ads SDK khả dụng — native): row Rewarded unlock — nếu khóa: "Xem 1 quảng cáo để mở khóa 24 giờ"; nếu đã mở: "Đã mở khóa · còn Xh Ym". Thời hạn đọc từ Remote Config `custom_sound_unlock_hours` (mặc định 24h). Unlock được tiêu thụ bởi custom sound pack trong Editor (§3.13).
- **THÔNG TIN:** About (version), Privacy Policy (mở URL — đang là placeholder!), Rate app (placeholder), Quay lại.

### 3.6 Recovery — "Continue where you left off?"

- Sau kill/reboot, cold start có session active → **RecoveryDialog** (KHÔNG auto-resume): "Timer đang chạy — Stage: WORK · 24:58 còn lại" với **[▶ Tiếp tục] [↻ Khởi động lại] [✕ Bỏ qua]**.
- Phân biệt case **đã hoàn thành trong lúc vắng mặt** (reconcile thấy sequence hết → "Routine đã hoàn thành trong lúc bạn vắng mặt 🎉", không có nút Resume).
- Mọi thông tin (stage/round/remaining) tính từ `reconcile(now)` tại thời điểm mở lại — không dùng giá trị lỗi thời trong storage.

### 3.7 Feedback khi chuyển stage (FeedbackCoordinator — wiring engine events → nền tảng)

- **3 âm thanh built-in:** `chime-up.wav`, `chime-down.wav`, `chime-done.wav`; `playsInSilentMode: true` (iOS vượt Silent Switch). Tôn trọng toggle Sound.
- **2 vibration pattern:** `pattern-strong` (notification success) / mặc định light impact. Tôn trọng toggle Rung.
- **Local notification:** khi chuyển stage ("Stage tiếp theo: X") và khi hoàn thành ("Routine hoàn thành 🎉" — kể cả foreground).
- **Voice coaching (v1.2):** đọc tên stage khi bắt đầu + "Routine hoàn thành" khi kết thúc (theo locale, tôn trọng toggle Voice); lỗi TTS bị nuốt (`.catch`), không bao giờ unhandled rejection.
- **Wake lock** khi session RUNNING + toggle bật; tự giải phóng khi stop/completed.
- Feedback KHÔNG bao giờ block/chậm timer; lỗi bị nuốt, không crash.

### 3.8 Background scheduling & permissions

- **Android (primary):** Exact Alarm tại `stageEndsAt` (expo-notifications DATE trigger); reconcile trên mỗi lần wake; **`RECEIVE_BOOT_COMPLETED`** + **`SCHEDULE_EXACT_ALARM`** khai trong app.json (khôi phục alarm sau reboot); nếu deny exact alarm → degrade sang inexact (cảnh báo trong Settings theo spec).
- **iOS:** queue **tối đa 50 notification** (Remote Config `max_scheduled_transitions_ios`), ID deterministic `"{session.id}_{round}_{stageIndex}"` → cancel chính xác khi pause/skip/stop; cancelAll + reconcile + reschedule mỗi start/resume/cold-start.
- **Permissions flow đúng thứ tự:** `POST_NOTIFICATIONS` (xin ngay khi tạo timer đầu tiên) → `SCHEDULE_EXACT_ALARM` (just-in-time lúc Start lần đầu) → `RECEIVE_BOOT_COMPLETED` (manifest, không dialog).
- Từ chối permission → app vẫn chạy đầy đủ (chỉ mất notification/độ chính xác nền).

### 3.9 Monetization (AdMob — trạng thái hiện tại)

| Placement | Type | Trigger | Trạng thái |
|---|---|---|---|
| Banner | Adaptive banner | Cuối màn Home | ✅ code xong (native only) |
| Interstitial | Fullscreen | Sau Stop / hoàn thành (cooldown 240s, max 1/phiên — đọc từ Remote Config) | ✅ code xong |
| Rewarded | Fullscreen | Settings → GÓI ÂM THANH → xem ad mở khóa 24h | ✅ code xong (UI + service) |
| App Open | Fullscreen | Cold start, không có session | 🔕 **Đang TẮT** (`PLACEMENT_ENABLED.appOpen = false`) |

- **ID đang dùng:** demo App ID của Google trong `app.json` + **test ad units** (hiện "Test Ad", KHÔNG có doanh thu). Chỗ duy nhất cần sửa khi có tài khoản thật: `src/features/monetization/ads-config.ts` (REAL_UNIT_IDS) + App ID trong `app.json`.
- **Eligibility đọc Remote Config** (không hard-code): cooldown, max-per-session.
- Frequency cap chỉ burn khi ad hiện thật; load fail → analytics `ad_shown=false` + không crash.
- `adManager.supported` = getter kiểm tra SDK thật → **Expo Go/web tự ẩn quảng cáo** (không CTA chết).

### 3.10 Observability & Policy

- **Firebase Analytics + Crashlytics + Remote Config** (lazy-load, không block app).
- **Metrics chuẩn:** `missed_transition_rate` (ngưỡng 0.15 → gợi ý FGS), `ad_shown`, `permission_denied` (tách loại), `timer_started`, `att_status`.
- **ATT (iOS):** xin sau value-moment đầu (sau khi start timer đầu tiên thành công), KHÔNG xin lúc cold start; deny → non-personalized ads fallback.
- **Remote Config 9 key:** `interstitial_cooldown_seconds` (240), `interstitial_max_per_session` (1), `app_open_cooldown_seconds` (60), `max_scheduled_transitions_ios` (50), `missed_transition_rate_threshold` (0.15), `timer_screen_native_ad_enabled` (false), `preset_free_limit` (-1), `custom_sound_unlock_hours` (24), **`reminder_reserved_slots` (10 — v1.3, ngân sách notification dành riêng cho reminder)**.

### 3.11 i18n — 12 ngôn ngữ

- **Tiếng Việt, English, 日本語, 中文 (giản thể), 한국어, Español, Français, Deutsch, Português, Bahasa Indonesia, ไทย, Русский** (~110 key mỗi ngôn ngữ).
- Mặc định theo ngôn ngữ máy (expo-localization); Settings đổi được; key-parity ép kiểu tại build (`satisfies Record<keyof typeof vi, string>`) — thêm key mới phải thêm đủ 12 file.
- Có regression test: mọi token `{{var}}` khớp giữa các ngôn ngữ.

### 3.12 Visual design (design system)

- **Design tokens** dark-first: nền `#0B0F14`, surface `#151B22`; light đầy đủ. `brandGradient` (đỏ cam → vàng cam) cho CTA chính; `secondaryGradient` (cyan → blue).
- **Stage colors heuristic theo tên:** work/focus/hiit/sprint → đỏ cam; break/rest → xanh lá; focus/deep → tím; cooldown/cool/stretch → xanh dương; không khớp → amber.
- **Components:** ProgressRing (SVG), GradientButton, SegmentedControl, Stepper, StagePill, AppCard, Chip, IconButton (chạm ≥ 44px, accessibilityLabel), ActionMenu, ConfirmDialog (thay thế Alert.alert / window.confirm — cross-platform), RecoveryDialog, AppSwitch, ThemedText/View.
- Màn hình đồng nhất: card surface + shadow, section label uppercase, icon vector Ionicons (không emoji).

### 3.13 Tính năng v1.1 (mới thêm — retention & daily habit)

1. **Lịch sử & Thống kê** — `SessionLogRepo` log mọi phiên kết thúc (completed/stopped) → màn **Stats** (`/stats`, icon bar-chart trên Home): tổng phiên / tổng thời gian / tuần này / **chuỗi ngày (streak, có chế độ tha thứ — hôm nay chưa tập không gãy chuỗi)** / kỷ lục / **heatmap 12 tuần** / danh sách phiên gần đây. Local 100%, không backend.
2. **Custom sound pack** — 6 âm thanh tổng hợp mới (Beep, Tick, Bell, Gong, Alarm, Marimba — `assets/sounds/soundpack/*.wav`); **tiêu thụ Rewarded unlock đã có**: chọn sound per-stage trong Editor (chip music-note), sound khóa (🔒) → confirm → xem ad 24h mở khóa. `Stage.soundId` (đã có trong model từ trước) giờ được FeedbackCoordinator dùng khi stage bắt đầu.
3. **Cảnh báo 30s/10s trước khi hết stage** — timer-store tick phát chime + haptic khi remaining vượt ngưỡng (mỗi stage 1 lần, tôn trọng toggle Sound/Vibration).
4. **Notification actions** — thông báo chuyển stage có 3 nút **Pause / Skip / Stop** (category `timer_controls`, label theo ngôn ngữ hiện tại, re-register khi đổi ngôn ngữ); chạm nút → gọi thẳng timer-store. Web no-op.
5. **Settings → QUYỀN HẠN** — hiển thị trạng thái quyền Thông báo + Độ chính xác nền (Android), nút mở cài đặt hệ thống khi bị từ chối. Chỉ native.
6. **Deep-link quick start** — `looptimer:///?start=<presetId>` (hoặc `/?start=hiit` trên web) start timer ngay — **nền tảng cho widget tương lai**.

### 3.14 v1.2 — Bộ tính năng retention & daily habit (đã code + test)

1. **🗣️ Voice coaching** — `SpeechService` platform (expo-speech native / Web Speech API web), đọc tên stage khi bắt đầu, cảnh báo "30 giây"/"10 giây" khi vượt ngưỡng (timer-store tick), "Routine hoàn thành" khi kết thúc. Ngôn ngữ theo i18n locale hiện tại, fallback giọng hệ thống khi không hỗ trợ. Toggle **"Đọc voice"** trong Settings (mặc định bật). Mọi lỗi TTS bị nuốt — không crash, không unhandled rejection.
2. **🌤️ Routine hôm nay** — `suggestPresetForNow(entries, presets, now)` thuần (4 khung giờ × 7 ngày gần nhất, tie-break theo lần dùng gần nhất) → card nổi trên Home với nút Start gradient; refresh mỗi lần màn được focus; ẩn khi chưa có thói quen khung giờ.
3. **🎉 Màn hoàn thành + chia sẻ** — khi session completed tự nhiên, timer-store ghi `completion {presetName, durationMs, streak}` (streak tính SAU khi log phiên) → **CompletionDialog** root-level: trophy + tên preset + duration + streak 🔥 + nút **Chia sẻ kết quả** (ShareService, text theo locale). Không hiện khi stop thủ công; dismiss 1 chạm.
4. **🔗 Share / import / export preset** — `preset-codec.ts` JSON versioned (`{type:'looptimer-preset', version:1, preset}`); `decodePreset` validate qua `validatePreset` + sinh id mới, JSON sai → null (không crash). Export: ActionMenu → **Share preset**. Import: dialog paste JSON trên Home **hoặc** deep-link `?import=<encoded>`. Import thành công → đóng dialog + alert, preset xuất hiện ngay trên Home.
5. **🚀 Onboarding 3 bước** — route `/onboarding` (Welcome → Chọn mục tiêu: Tập luyện/Học tập/Làm việc → Template gợi ý + Start thẳng). Hiện khi `settings.onboardingDone = false`, redirect trong `_layout` (không loop), KHÔNG xin permission trong onboarding (đúng spec). Skip/hoàn thành → persist `onboardingDone`.
6. **📱 Widget + Live Activities — JS foundation** — `WidgetBridge.updateTimerSnapshot(snapshot|null)` (native ghi AsyncStorage `looptimer:widget-snapshot`; web no-op) + `LiveActivityBridge` (no-op, iOS cần EAS build) + `buildTimerSnapshot(state, session, presetName)` thuần (100% test). Timer-store đồng bộ snapshot mọi transition (StageStarted/Resumed/Paused/Terminal → null), preset name resolve từ presets store (đúng cả khi recovery). **Phần native (widget extension / ActivityKit) chưa làm — cần EAS dev build (xem `openspec/changes/add-home-widget`).**

### 3.15 v1.3 — Bộ tính năng "Daily Routine & Zero-Friction" (đã code + verify + test)

1. **🔔 Scheduled Routine / Reminder** — `RoutineSchedule` (id, presetId, enabled, `daysOfWeek` 1=Mon..7=Sun, hour, minute, `notificationMinutesBefore`, `lastTriggeredDate`, `snoozeCount`, `snoozeUntil`, schemaVersion) + `RoutineScheduleRepo` (AsyncStorage `looptimer:routine-schedules`, safe parse). Store `useRoutineStore` (Zustand): load/save/remove/toggle + `rescheduleAll` (mọi mutation → reschedule lần trigger kế tiếp) + `markHandled` + `snooze`. UI: `src/app/routine.tsx` (list: tên preset, giờ, days, next, missed row, toggle/edit/delete) + `routine/[id].tsx` (form: preset picker, days chips, giờ:phút, nhắc trước 0–30′). Entry từ Settings.
2. **🛡️ 4 guardrail bắt buộc:**
   - **Overwrite Guard** — `overwriteGuard(confirm)` trong `start-guard.ts` dùng chung mọi đường start (Home card/chips/Quick Routine/reminder): có active session (kể cả `temp_quick_session`) → dialog [Hủy phiên & Bắt đầu] [Tiếp tục].
   - **Snooze** — category notification `reminder_actions`: [Start] [Snooze 5'] [Snooze 10'] [Dismiss]; `snoozeCount` tối đa 3/trigger rồi tự dismiss; persist `snoozeCount`/`snoozeUntil`.
   - **Missed không trừng phạt** — `isMissed(schedule, now)` (dùng đúng fire-time kể cả before-window) → Home card "Missed today" [▶ Start now] [Skip]; Skip → `markHandled`; **streak preset-agnostic** (không filter theo presetId — đã test + comment trong `stats.ts`).
   - **Budget-split iOS** — `effectiveMaxStageQueue(64 − reminder_reserved_slots − activeSchedules)` (Remote Config `reminder_reserved_slots` default 10) dùng cho Editor warning; reminder dùng body riêng "sắp bắt đầu sau N phút" khi `notificationMinutesBefore > 0`.
3. **📲 Notification cold-start actions (P0 fix)** — `src/features/feedback/notification-actions.ts`: `handleNotificationAction(actionId, notificationId)` hydrate store (nếu chưa) → `engine.reconcile(now)` → apply (timer-control pause/skip/stop + reminder start/snooze/dismiss) → navigate `/timer` hoặc `/`. Listener nền + cold-start (`getLastNotificationResponse` — contract mới `{actionId, notificationId}`) đều route qua helper này; mọi lỗi bị nuốt (không crash cold start).
4. **🔕 FGS "Keep timer alive" dialog** — `fgs-trigger.ts` (pub/sub `notifyMissedRateHigh` từ observability khi missed rate > 0.15) + `fgs-dialog.tsx` root-level: [Mở Settings] [Để sau]; dismiss persist `settings.fgsDialogDismissed` (không hiện lại).
5. **⚡ Quick Start / Favorites** — `Preset.isFavorite?: boolean` (additive, không bump schema) + `setFavorite`; ActionMenu item Favorite/Bỏ yêu thích; Home section FAVORITES nổi trước; preset chips ngang (tên + ▶).
6. **🚀 Quick Routine + Save as Preset** — `QuickRoutineCard` trên Home (25/5×4 mặc định), chạy `temp_quick_session` (không rác database); CompletionDialog khi completion.presetId = temp → nút "Lưu thành Preset" (nhập tên → tạo preset mới từ session snapshot, stage id được regenerate); session vẫn log vào SessionLog (Stats).
7. **↕️ Drag & Drop stage reorder** — helper thuần `reorderStages(stages, from, to)` (giữ `Stage.id`/`soundId`) + nút up/down trên mỗi stage card (giải pháp cross-platform, đã chốt trong design.md); template mở từ Editor luôn Save-as-new.
8. **♾️ Repeat Forever UI** — Timer screen `ROUND x / ∞`; notification stage-transition `WORK · Round 37` (không `/ ∞`); forever không bao giờ hiện CompletionDialog; Stop thủ công → log `status=stopped` (Stats).

### 3.16 Platform hỗ trợ

| Capability | Android | iOS | Web | Expo Go |
|---|---|---|---|---|
| Timer engine | ✅ | ✅ | ✅ | ✅ |
| Audio | ✅ | ✅ (vượt silent switch) | ✅ (HTML Audio) | ✅ |
| Voice (TTS) | ✅ | ✅ | ✅ (speechSynthesis) | ✅ |
| Haptics | ✅ | ✅ | ⚠️ navigator.vibrate | ✅ |
| Notifications/scheduling | ✅ exact alarm + boot | ✅ queue 50 | ❌ no-op | ❌ no-op |
| Share | ✅ share sheet | ✅ share sheet | ⚠️ navigator.share / clipboard | ⚠️ (nếu có) |
| Widget bridge | ✅ (AsyncStorage) | ✅ (AsyncStorage) | no-op | no-op |
| Live Activities | — | ⚠️ cần EAS build | no-op | no-op |
| Ads | ✅ (dev build) | ✅ | ❌ no-op | ❌ no-op |
| Firebase | ✅ | ✅ | ❌ no-op (log console) | ❌ no-op |
| Banner Home | ✅ | ✅ | ẩn | ẩn |
| Rewarded section | ✅ | ✅ | ẩn | ẩn |

### 3.17 v1.4 — Widget & Lock-Screen (At-a-Glance) — JS layer (đã code + test)

1. **🧠 Smart Routine v2** — `suggestPresetForDayOfWeek(entries, presetIds, now, weeks=4)` thuần trong `stats.ts` (cùng weekDay + cùng hourBucket trong 4 tuần, tie-break lastUsedAt). Home card ưu tiên weekday model → null → fallback `suggestPresetForNow` (không mất card user mới); subtitle "Thường tập T3" khi dùng weekday model (key mới `home.routineDayReason`, đủ 12 ngôn ngữ).
2. **📱 Home-screen widget Android + iOS** — `expo-widgets` (official SDK 57, **thay thế** `@saleksovski/react-native-android-widget` — package này không tồn tại trên npm). `TimerWidget.tsx` (directive `'widget'`, layout @expo/ui: preset + stage + countdown + round `x/∞` + idle subtitle + Start button); `mapTimerSnapshotToWidgetData`/`formatWidgetMs`/`widgetRoundLabel` thuần + test; `NativeWidgetBridge` gọi `TimerWidget.updateSnapshot` song song AsyncStorage (lazy require, no-op Expo Go). Config plugin `enableAndroid: true` (Glance) + iOS systemSmall/Medium. **Giới hạn:** không tick realtime (update theo transition — `updatePeriodMillis` nền tảng). **Tap handling:** widgetURL — running → `looptimer:///timer`; idle → `looptimer:///?start=<preset gợi ý>` (favorite → most-recent, `resolveQuickStartPresetId`); **nút interactive** → `addUserInteractionListener` (`widget-interaction.ts`, đăng ký ở `_layout.tsx`): idle Start → `handleWidgetStartTap` (không đè session đang chạy); active Pause/Stop (running) / Resume/Stop (paused) → `applyControlAction` (chung với Live Activity, không navigate — widget tự cập nhật qua store events). **Labels localize qua content** (`TimerWidgetLabels` — openApp/start/pause/resume/stop; bridge điền `i18n.t('widget.openApp'/'start'/'pause'/'resume'/'stop')` từ **namespace `widget.*` dùng chung với Live Activity** — 6 key đủ 12 ngôn ngữ; default English cho test). Cần verify Glance/WidgetKit trên device.
3. **🔒 iOS Live Activity (ActivityKit)** — `live-activity.tsx` (`createLiveActivity('TimerActivity', …)`: banner + compactLeading/Trailing + minimal + expanded slots); `snapshotToActivityContent` thuần + test; `NativeLiveActivityBridge` start/update/end (iOS 16.1+, local update, no APNs push). **Giải quyết triệt để giới hạn 50-notification** (ActivityKit tự đếm ngược realtime khi app treo). **Control buttons (R3):** Pause/Skip (running) / Resume (paused) trên Lock Screen banner + Dynamic Island expandedBottom — `Button` target `pause|skip|resume` → `addUserInteractionListener` (`widget-interaction.ts`): **`applyControlAction`** (dùng chung với home-widget) hydrate + reconcile+tick + guard theo status (mirror notification actions, skip an toàn từ paused — engine tự no-op); labels i18n (`widget.pause/skip/resume` — namespace `widget.*` dùng chung) truyền qua content (`TimerActivityLabels`, default English); không navigate (user ở Lock Screen).
4. **TimerSnapshot mở rộng (additive, không bump schema):** `nextStageName` + `isForever` — `buildTimerSnapshot` tính từ engine (`state.nextStage?.name`, `totalRounds === Infinity`).
5. **Native còn lại (cần EAS dev build + device):** prebuild verify plugin, hiển thị/update/tap thật (widgetURL deep-link + Start button trên Glance/WidgetKit, nút Pause/Skip/Resume trên ActivityKit), hành vi khi app bị kill, open question config entry Live Activity. Chi tiết trong tasks của 2 change.

---

## 4. Data model (tóm tắt)

```
Preset (mutable)       Stage (trong Preset)        TimerSession (immutable snapshot @Start)
├ id                   ├ id                         ├ id / presetId
├ name                 ├ name (màu accent heuristic)├ stagesSnapshot (clone)
├ stages[]             ├ durationSeconds (1s–24h)   ├ currentStageIndex / currentRound
├ repeatMode           └ (soundId, vibrationPatternId └ status (idle|running|paused|completed|stopped)
│   once|fixedCount|forever    — có UI picker âm thanh ├ dateStarted / stageEndsAt / pausedRemaining
├ fixedCount            trong Editor từ v1.1)        ├ completedAt
├ createdAt / lastUsedAt (update khi start)         └ schemaVersion = 1
├ isFavorite? (v1.3 — additive)
└ schemaVersion = 1
```

```
Settings (persist)             SessionLogEntry (stats/routine)
├ soundEnabled / vibrationEnabled├ id / presetId / presetName
├ voiceEnabled (v1.2)          ├ startedAt / endedAt / durationMs
├ wakeLockEnabled / themeMode  ├ stageCount / status (completed|stopped)
├ language (system|12 codes)   └ schemaVersion = 1
├ onboardingDone (v1.2)
├ fgsDialogDismissed (v1.3)
└ schemaVersion = 1
```

```
RoutineSchedule (v1.3 — AsyncStorage looptimer:routine-schedules)
├ id / presetId / enabled
├ daysOfWeek: number[] (1=Mon..7=Sun) / hour / minute
├ notificationMinutesBefore: number[]
├ lastTriggeredDate? (YYYY-MM-DD, chống trigger lại) / snoozeCount? / snoozeUntil?
└ schemaVersion = 1
```

**Quy tắc:** Preset mutable ≠ Session immutable. Sửa/xóa preset khi session đang chạy KHÔNG ảnh hưởng session. Chỉ 1 session active. Fields Settings/Preset mới là **additive có default** → không cần bump schemaVersion. Quick Routine chạy dưới `temp_quick_session` (không nằm trong presets DB).

---

## 5. Khả năng mở rộng đã chuẩn bị sẵn

- `schemaVersion` trên Preset/Session/Settings → migration an toàn.
- `preset_free_limit = -1` (Remote Config) → sẵn sàng giới hạn preset miễn phí khi làm Pro.
- `timer_screen_native_ad_enabled` (Remote Config, false) → sẵn sàng A/B native ad trên timer screen.
- `custom_sound_unlock_hours` → Rewarded unlock đã có service + UI **và đã được tiêu thụ** bởi custom sound pack (§3.13) + gợi ý Pro future.
- **Widget foundation (v1.2):** `WidgetBridge` + `buildTimerSnapshot` + deep-link `?start=` sẵn sàng — chỉ cần native extension (EAS build) để hiển thị widget thật.
- Platform abstraction (`src/platform`) → thêm capability mới không phá impl cũ.
- 12 ngôn ngữ → thêm ngôn ngữ = thêm 1 file dictionary.
- i18n key-parity ép kiểu (`satisfies Record<keyof typeof vi, string>`) → thêm key phải thêm đủ 12 file (bảo đảm an toàn khi thêm tính năng đa ngôn ngữ).

---

## 6. Trạng thái phát hành (v1 readiness)

| Hạng mục | Trạng thái |
|---|---|
| Code + tests | ✅ **243 tests xanh** (114 → 155 → 193 → 219 → 228 → 238 → 240 → 243), tsc sạch, web export 200 (gồm route `/onboarding`, `/routine`, `/routine/[id]`) |
| v1.2 retention pack | ✅ Voice coaching · Routine hôm nay · Completion+share · Share/import preset · Onboarding · Widget JS foundation |
| **v1.3 daily routine** | ✅ Scheduled Routine/Reminder (4 guardrail + budget-split) · Cold-start notif actions + FGS dialog · Quick Start (Favorites/chips/Quick Routine + Save as) · Drag & Drop + template save-as-new · Forever UI |
| **v1.4 at-a-glance (JS layer)** | ✅ Smart Routine v2 · Widget Android/iOS + Live Activity (expo-widgets: layout + mapping thuần + bridge wiring + tap handling widgetURL/Start button + widget Pause/Resume/Stop + Live Activity Pause/Skip/Resume + labels localize qua content) · ⏳ native (EAS build + test device) còn lại |
| ASO (tên/mô tả/keywords) | ⚠️ Chưa làm |
| **Privacy Policy URL** | 🔴 **Đang là placeholder `example.com`** — bắt buộc sửa trước khi submit store |
| **Store URLs** (Rate) | 🔴 **Placeholder `example.com`** |
| AdMob real App ID + unit IDs | 🔴 Chưa có (đang test ad, không doanh thu) |
| Consent GDPR/CCPA (UMP) | 🔴 Chưa tích hợp lib (spec yêu cầu) |
| Build native thật (EAS) | ⚠️ Chưa build/test trên device thật |
| Firebase console config | ⚠️ Chưa push Remote Config defaults lên console |

---

## 7. Known limitations & gaps (quan trọng cho AI nghiên cứu)

1. **iOS im lặng sau trần notification** khi app bị treo lâu (đã công khai trong UX + cảnh báo Editor). **v1.3 đã tách ngân sách:** stage queue dùng trần hiệu dụng `64 − reminder_reserved_slots(10) − activeSchedules` (không tranh slot với reminder). Giải pháp triệt để vẫn là **Live Activities** — JS foundation đã có trong `add-home-widget`, cần EAS build để hoàn thiện native.
2. ~~Rewarded unlock không có "thứ để unlock"~~ → **đã đóng vòng lặp** bằng custom sound pack (§3.13).
3. **FGS "Keep timer alive"** — ✅ **v1.3 đã có UI dialog** (`fgs-dialog.tsx` + `fgs-trigger.ts`, hiện khi missed-rate > 0.15, dismiss persist). Phần khai báo foreground service native (config plugin + EAS build) vẫn còn lại.
4. **`timer_screen_native_ad_enabled`** chưa được dùng (không có native ad trên timer screen).
5. **Widget & Live Activity — JS layer ĐÃ XONG v1.4** (expo-widgets: `TimerWidget` layout + `LiveActivityBridge` + mapping thuần, 219 tests); **phần native extension (prebuild/EAS build + test device thật) chưa làm** — xem `openspec/changes/add-{android-widget,live-activity}/tasks.md`. Lưu ý: `@saleksovski/react-native-android-widget` trong design cũ **không tồn tại** trên npm — đã thay bằng `expo-widgets` (hỗ trợ cả Android qua `enableAndroid: true`).
6. **Chưa có:** custom sound vĩnh viễn (Pro), watch, cloud sync, community templates, Pro/IAP, Smart Routine theo ngày-trong-tuần, Weekly Goals, Session Notes.
7. **Expo Go không chạy được:** ads, Firebase, notification scheduling (native module) — chỉ test UI. Test ads/background phải dùng EAS dev build.
8. Web là môi trường dev/test — không phải nền tảng phát hành (notifications/ads/haptics no-op).
9. ~~Notification actions chỉ hoạt động khi app nền~~ → **✅ v1.3 đã xử lý cold-start** (`notification-actions.ts` + `getLastNotificationResponse`, kể cả reminder actions).
10. **Chưa test visual trên device/web** — môi trường dev không có Chrome; các tính năng v1.3 đã test unit (193 tests) nhưng cần `npx expo start --web` / Expo Go để duyệt UI thật.

---

## 8. Hướng nghiên cứu tính năng mới (mục tiêu: retention + dùng hàng ngày)

### 8.1 Yêu cầu cốt lõi của mọi đề xuất
Mọi tính năng mới phải: (a) không vi phạm **sacred timer screen** (không ad, không che countdown/controls); (b) không chặn Start/Stop/Resume; (c) tôn trọng single-session; (d) hỗ trợ **12 ngôn ngữ** (i18n key parity); (e) chạy được trên cả web (no-op hợp lý) lẫn native; (f) không cần backend trừ khi tính năng đó chứng minh cần (nếu cần backend — đề xuất giải pháp local-first trước, cloud sau).

### 8.2 Shortlist theo plan — trạng thái cập nhật (2026-08-09)
**ĐÃ CODE (v1.1 + v1.2 + v1.3):**
- ✅ Cảnh báo 30s/10s trước khi hết stage
- ✅ Notification actions (Pause/Skip/Stop trên notification)
- ✅ Custom sound pack (tiêu thụ Rewarded unlock)
- ✅ **Voice coaching (TTS)**
- ✅ **Routine hôm nay** (gợi ý theo khung giờ)
- ✅ **Màn hoàn thành + chia sẻ kết quả**
- ✅ Share / import / export preset (JSON)
- ✅ Onboarding 3 bước
- ✅ Statistics (lịch sử phiên, streak preset-agnostic, heatmap 12 tuần)
- ✅ Widget — **JS foundation** (native extension còn lại, cần EAS build)
- ✅ Live Activities — **JS foundation** (ActivityKit binding còn lại, cần EAS build)
- ✅ **Scheduled Routine / Reminder** (lịch lặp ngày×giờ + Start/Snooze/Dismiss + 4 guardrail + budget-split iOS)
- ✅ **Notification cold-start actions** (Pause/Skip/Stop khi app bị kill) + reminder actions
- ✅ **FGS "Keep timer alive" dialog** (opt-in khi missed-rate cao)
- ✅ **Quick Start / Favorites / Preset chips**
- ✅ **Quick Routine** (temp_quick_session) + **Save as Preset**
- ✅ **Drag & Drop stage reorder** (giữ id/soundId) + **template save-as-new**
- ✅ **Repeat Forever UI** (ROUND x / ∞, notification không /∞, log stopped)

**ĐÃ CODE (v1.4 — JS layer):**
- ✅ Smart Routine v2 (theo ngày trong tuần, fallback v1.2)
- ✅ Home-screen widget Android + iOS (expo-widgets: `TimerWidget` — layout + `mapTimerSnapshotToWidgetData` + bridge + tap handling: widgetURL deep-link + **nút Start/Pause/Resume/Stop** interactive qua `applyControlAction`, **labels localize qua `TimerWidgetLabels`**)
- ✅ iOS Live Activity (expo-widgets: `TimerActivity` — layout slots + `snapshotToActivityContent` + bridge + **nút Pause/Skip/Resume** qua `addUserInteractionListener`)

**CÒN LẠI (ưu tiên tiếp theo):**
- Widget/Live Activity **native test** (EAS dev build + device) — v1.4
- Weekly Goals · Session Notes · Curated Template Library · Duplicate/Save as nâng cao — v1.5
- Pro IAP one-time (remove ads, permanent sounds, export stats, backup/restore) — v1.6
- Cloud sync + account · Apple Watch · Community templates (đã loại khỏi roadmap)

### 8.3 Vùng nghiên cứu gợi ý (retention & daily habit)
AI nghiên cứu được tự do đề xuất, nhưng nên ưu tiên trả lời các câu hỏi sau (kèm cơ chế tương tác cụ thể, không chỉ ý tưởng chung):

1. **Vòng lặp thói quen hàng ngày:** Đã có streak + Routine hôm nay + voice coaching. Còn có thể: widget hiển thị routine hôm nay, thử thách hàng ngày, reminder theo thói quen.
2. **Lịch sử & thống kê:** Đã có (tổng phiên/thời gian, streak, heatmap 12 tuần, phiên gần đây). Còn: export stats, mục tiêu hàng tuần, so sánh tuần.
3. **Cá nhân hóa:** Routine hôm nay đã gợi ý theo giờ — còn có thể gợi ý theo lịch sử dài hạn hoặc theo ngày trong tuần.
4. **Chia sẻ xã hội:** Share preset JSON + share kết quả hoàn thành đã có. Còn: deep-link share qua message, community templates.
5. **Gamification:** streak 🔥 đã có trong CompletionDialog — còn có thể badge/level; cần nghiên cứu đối thủ làm gì.
6. **Onboarding:** ✅ ĐÃ LÀM (3 bước). Đo lường activation sau khi ship.
7. **Monetization bổ trợ:** Pro one-time purchase (remove ads, unlimited preset, custom sounds vĩnh viễn, statistics export) — Remote Config đã có sẵn `preset_free_limit`; đây là hướng sinh lời phù hợp nhất với app local-first (nghiên cứu đã chỉ ra user timer apps ghét subscription).

### 8.4 Định dạng đề xuất mong muốn
Với mỗi tính năng đề xuất: **mục tiêu → đối tượng → cơ chế giữ chân → luồng UX cụ thể → đổi gì trong data model/storage → có cần backend không → rủi ro/chi phí → độ ưu tiên so với các tính năng khác**. Nên tham khảo đối thủ (Interval Timer, Seconds, Strong, Forest, Habitica... nếu hợp lý).

---

## 9. Thông tin tham khảo trong repo (nếu AI cần đọc code)

| Muốn biết | Xem |
|---|---|
| Engine | `src/core/timer/engine.ts` (+ test `src/core/__tests__/`) |
| Data model | `src/core/timer/models.ts`, storage `src/core/storage/repos.ts` |
| Screens | `src/app/index.tsx`, `src/app/preset/[id].tsx`, `src/app/timer.tsx`, `src/app/settings.tsx`, `src/app/stats.tsx`, `src/app/onboarding.tsx` |
| Voice coaching | `src/platform/{types,impl.native,impl.web}.ts` (SpeechService), `src/features/feedback/feedback-coordinator.ts`, warnings trong `timer-store.ts` |
| Routine hôm nay | `src/features/stats/stats.ts` (`suggestPresetForNow`) + card trong `src/app/index.tsx` |
| Completion + share | `src/components/completion-dialog.tsx`, `timer-store.ts` (`completion` state), ShareService platform |
| Preset sharing | `src/features/presets/preset-codec.ts`, `import-dialog.tsx`, `?import=` trong `src/app/index.tsx` |
| Widget foundation | `src/features/widget/timer-snapshot.ts`, WidgetBridge/LiveActivityBridge platform |
| Scheduled Routine | `src/features/routine/routine-schedule.ts` (model+repo+helpers), `routine-store.ts`, `src/app/routine.tsx` + `routine/[id].tsx` |
| Notification actions (cold-start) | `src/features/feedback/notification-actions.ts`, `_layout.tsx`, platform `getLastNotificationResponse` |
| FGS dialog | `src/features/background/fgs-trigger.ts`, `src/components/fgs-dialog.tsx` |
| Quick start / favorites | `src/components/quick-routine-card.tsx`, `start-guard.ts`, `src/features/presets/reorder.ts`, `template-utils.ts` |
| Specs v1.3 | `openspec/changes/add-{notification-cold-start,scheduled-routine,quick-start,drag-drop,forever-ui}/` |
| Design system | `src/components/*`, `src/constants/theme.ts`, `src/constants/stage-colors.ts` |
| Platform abstraction | `src/platform/types.ts`, `impl.native.ts`, `impl.web.ts` |
| Ads config | `src/features/monetization/ads-config.ts`, `rewarded-unlock.ts` |
| i18n | `src/i18n/*` (12 file) |
| Specs gốc (chi tiết từng requirement) | `openspec/changes/<change>/specs/**/spec.md` (thêm 4 change v1.2: `add-retention-pack`, `add-preset-sharing`, `add-onboarding`, `add-home-widget`) |
| Kế hoạch sản phẩm đầy đủ | `.plan/plan1_final_2.md` |

---

*Tài liệu được sinh từ code thực tế + openspec specs + plan. Cập nhật lần cuối: 2026-08-09 (v1.3 — 5 change v1.3 đã verify 20/20 requirements, 193 tests xanh). Nếu code thay đổi, cập nhật lại tài liệu này.*
