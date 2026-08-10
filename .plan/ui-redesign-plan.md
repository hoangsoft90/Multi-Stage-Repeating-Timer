# Plan: Thiết kế lại UX/UI — LoopTimer (Multi-Stage Repeating Timer)

> Phong cách: **Vibrant thể thao** (tương phản mạnh, gradient, năng lượng — kiểu Seconds Pro / HIIT apps)
> Accent: **đổi màu theo stage** (WORK đỏ cam / BREAK xanh lá / FOCUS tím / COOLDOWN xanh dương)
> Phạm vi: **toàn bộ app, 1 phase**

---

## 1. Nguyên tắc thiết kế

1. **Màu = trạng thái.** Người dùng đọc được stage hiện tại chỉ bằng màu (WORK đỏ, BREAK xanh) — ngay cả khi không nhìn chữ.
2. **Màn Timer là "ngôi sao".** 80% thời gian người dùng nhìn vào đây → đầu tư animation + typography nhiều nhất.
3. **Nút Start = gradient lớn, không thể bỏ lỡ.** CTA chính luôn nổi bật nhất màn hình.
4. **Dark-first nhưng phải đẹp cả light** (tôn trọng setting hệ thống).
5. **Icon thay emoji, nhất quán trên mọi platform** (Ionicons).

---

## 2. Design tokens (`src/constants/theme.ts` — mở rộng)

### 2.1 Màu nền / text (dark-first)

| Token | Dark | Light |
|---|---|---|
| `background` | `#0B0F14` (đen pha xanh) | `#F6F7F9` |
| `surface` (card) | `#151B22` | `#FFFFFF` |
| `surfaceElevated` | `#1C242E` | `#FFFFFF` |
| `border` | `rgba(255,255,255,0.08)` | `rgba(15,20,25,0.08)` |
| `text` | `#F5F7FA` | `#0F1419` |
| `textSecondary` | `#8B95A3` | `#5B6472` |
| `overlay` (backdrop dialog) | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.4)` |

### 2.2 Stage colors (accent động — `src/constants/stage-colors.ts` mới)

| Stage type (theo tên stage, chuẩn hóa lowercase) | Dark | Light | Ý nghĩa |
|---|---|---|---|
| `work` (chứa "work"/"focus"/"hiit"/"sprint") | `#FF4D2E` | `#E23D12` | Đỏ cam — cường độ |
| `break` / `rest` (chứa "break"/"rest"/"rest") | `#22C55E` | `#16A34A` | Xanh lá — thư giãn |
| `focus` (chứa "focus"/"deep") | `#A78BFA` | `#7C3AED` | Tím — tập trung |
| `cooldown` (chứa "cooldown"/"cool"/"stretch") | `#38BDF8` | `#0284C7` | Xanh dương — hồi phục |
| `default` | `#F59E0B` | `#D97706` | Amber — mặc định |

- **Fallback heuristic:** map tên stage → nhóm; nếu không khớp → `default`.
- Mỗi stage color có cặp `{ main, dark, gradient: [c1, c2] }` (cho ring/gradient).

### 2.3 Brand gradient (CTA chính)

- `brandGradient: ['#FF512F', '#F09819']` (đỏ cam → vàng cam — năng lượng)
- Secondary gradient (nút phụ): `['#22D3EE', '#3B82F6']` (cyan → blue)

### 2.4 Typography (hệ thống, không cần font mới — dùng system + weight)

| Scale | Size/Weight | Dùng cho |
|---|---|---|
| `display` | 64–96 / 700–800, `tabular-nums` | Countdown màn Timer |
| `title` | 34 / 700 | Stage name (Timer) |
| `heading` | 22 / 700 | Header màn |
| `subtitle` | 17 / 600 | Tên card, section |
| `body` | 15 / 500 | Nội dung |
| `caption` | 13 / 500 | Meta, chips |
| `micro` | 11 / 600, `letterSpacing: 1` | Label uppercase |

### 2.5 Spacing / Radius / Elevation

- Spacing: 4 / 8 / 12 / 16 / 24 / 32 (giữ `Spacing` hiện có + thêm `three=12`)
- Radius: `sm 10 · md 14 · lg 20 · xl 24 · pill 999`
- Elevation: `soft` (shadow 0/4/16, opacity 0.12) cho card; `lift` cho nút chính; web dùng `boxShadow` tương đương.

---

## 3. Dependency cần thêm (Phase 0)

```bash
npx expo install react-native-svg expo-linear-gradient @expo/vector-icons
# tuỳ chọn đẹp hơn:
npx expo install expo-blur            # glass cho control trên Timer
```
- `react-native-reanimated` 4.5.1 đã có ✅ — kiểm tra `babel.config.js` phải có plugin `react-native-worklets/plugin` (Reanimated 4 bắt buộc).
- Cập nhật `transformIgnorePatterns` của jest nếu cần (svg, linear-gradient, vector-icons).
- Icon: dùng `@expo/vector-icons` **Ionicons** (tên trực quan: `play`, `pause`, `play-skip-forward`, `close`, `trash-outline`, `copy-outline`, `settings-outline`, `save-outline`, `notifications-outline`, `timer-outline`…).

---

## 4. Component mới (`src/components/`)

| Component | Mô tả |
|---|---|
| `GradientButton` | Nút gradient (brand/secondary), press scale 0.97, shadow lift |
| `IconButton` | Nút tròn icon (thay nút emoji hiện tại) |
| `AppCard` | Card chuẩn: surface, radius lg, shadow soft, padding 16 |
| `Chip` | Meta chip: nền `surfaceElevated`, text caption, chấm màu stage |
| `SegmentedControl` | Điều khiển 3 lựa chọn (repeat mode) — dùng ở Editor |
| `Stepper` | `-` / `+` tròn cho duration (Editor) |
| `ProgressRing` | **Vòng tròn tiến trình SVG** (react-native-svg): gradient stroke theo stage color, round caps, dùng cho màn Timer |
| `StagePill` | Dải chips stage WORK/BREAK… highlight stage hiện tại (Timer) |
| `SwitchRow` (nâng cấp) | Row Settings có icon trái + Switch custom |

---

## 5. Redesign từng màn hình

### 5.1 Timer (`src/app/timer.tsx`) — màn chủ đạo ⭐

- **Nền:** linear-gradient mờ theo màu stage hiện tại (ví dụ `rgba(255,77,46,0.10)` → trong suốt) — đổi màu mượt khi đổi stage (Animated crossfade 400ms).
- **ProgressRing** đường kính ~300: nền vòng `surfaceElevated`, stroke gradient theo stage, **đếm ngược chạy 60fps bằng Reanimated** (không tick 250ms).
- **Bên trong vòng:** stage name (title 34) + countdown **display 80–96, tabular-nums** + round label `Round 2 / 8` (caption, uppercase).
- **StagePill** dưới vòng: chips tên từng stage, chip đang chạy sáng màu stage, đã qua xám mờ.
- **Controls:** 2 nút tròn lớn (Pause ▶ / Skip ⏭) + Stop. Nút Pause đổi thành Resume khi paused (màu vàng). Dùng `expo-blur` glass (tuỳ chọn, có fallback `surface`).
- **Hiệu ứng:** countdown < 10s → ring + chữ pulse nhẹ; đổi stage → màu nền/stroke crossfade; chữ đếm giây animate (sliding number).
- **Top bar:** nút ✕ (exit, giữ logic cũ: web = stop confirm, native = back giữ chạy) + tên preset.
- **Giữ nguyên logic hiện có:** `useTimerStore`, `confirmAsync`, recovery — **chỉ đổi lớp trình bày**.

### 5.2 Home (`src/app/index.tsx`)

- **Header:** logo mark (vòng tròn gradient) + "LoopTimer" + subtitle + IconButton ⚙️.
- **Cards template:** AppCard có:
  - chấm/icon màu theo stage đầu tiên,
  - tên đậm,
  - Chip meta `2 stages · loop` (giữ text hiện có để test không vỡ),
  - nút **Start gradient** (brand) bên phải, icon `play` + text "Start".
- **"＋ Tạo preset mới"**: card dashed → hover/touch nổi gradient nhẹ.
- **Empty state** (không có preset user): icon + caption hướng dẫn.
- **Long-press menu**: ActionMenu giữ nguyên, restyle theo token (đã hoạt động cross-platform).

### 5.3 Editor (`src/app/preset/[id].tsx`)

- **Repeat mode:** SegmentedControl (1 lần / N rounds / Vô hạn) — bỏ chip hiện tại.
- **N rounds:** Stepper `− 4 +` (thay TextInput, vẫn hiện số).
- **Stage rows:** AppCard nhỏ, mỗi stage có **chấm màu stage** (theo heuristic tên), TextInput tên + duration, Stepper giây, nút xoá.
- **Thêm stage:** nút "+ Thêm stage" (icon, màu stage default).
- **Validation:** error text đỏ + border viền đỏ; vẫn gọi `validatePreset`.
- **CTA:** "▶ Start timer" = GradientButton toàn chiều rộng (brand); "💾 Lưu preset" = secondary; "Xóa preset" = danger text.
- Giữ `alertAsync` / `confirmAsync` hiện tại.

### 5.4 Settings (`src/app/settings.tsx`)

- Nhóm card (Âm thanh & Rung / Màn hình / Thông tin) có tiêu đề caption uppercase.
- Mỗi row: icon trái (Ionicons) + label + Switch custom (thumb tròn, track màu brand khi on).
- About/Privacy/Rate giữ logic `alertAsync`/`WebBrowser`.

### 5.5 Dialogs & feedback

- **RecoveryDialog:** card surface, radius xl, nút Resume gradient brand, Restart secondary, Dismiss ghost. Giữ logic.
- **ActionMenu:** đã có, restyle theo token.
- **Toast** (tuỳ chọn): thông báo nhỏ khi save preset thành công (không bắt buộc phase này).

### 5.6 Splash & App icon

- **Logo:** 2 vòng tròn đồng tâm nửa điền (minh hoạ timer ring), gradient brand, sinh bằng script SVG → PNG.
- Thay `assets/images/icon.png`, `splash-icon.png`, favicon, adaptive icon Android.
- Cập nhật `app.json` splash background gradient tối + logo.

---

## 6. Accessibility

- Contrast stage colors đã chọn đạt ≥ 4.5:1 trên cả dark/light (bảng ở 2.2).
- Touch target ≥ 44×44 (IconButton, Stepper, nút tròn).
- Giữ `accessibilityLabel` cho nút icon; không phụ thuộc màu duy nhất (stage name luôn hiển thị kèm màu).

---

## 7. Phases triển khai & validation

| Phase | Nội dung | Validate |
|---|---|---|
| **0. Nền tảng** | Install deps; babel reanimated; mở rộng `theme.ts` (tokens); thêm `stage-colors.ts`; icon helper | `tsc` + `jest` (giữ 94 test xanh) |
| **1. Components** | GradientButton, IconButton, AppCard, Chip, SegmentedControl, Stepper, ProgressRing, StagePill | `tsc` + render test cho ProgressRing/SegmentedControl |
| **2. Màn Timer** | ProgressRing + stage color + animation + restyle controls | `tsc` + cập nhật test Timer (nếu text đổi) |
| **3. Home** | Header/cards/gradient CTA + ActionMenu restyle | `tsc` + cập nhật test Home (giữ text "Start") |
| **4. Editor** | SegmentedControl, Stepper, stage dots, CTA | `tsc` + cập nhật test Editor (giữ text "💾 Lưu preset") |
| **5. Settings + dialogs + splash/icon** | Restyle Settings, RecoveryDialog, ActionMenu; tạo logo & cập nhật app.json | `tsc` + web export + xem trước |
| **6. Hoàn thiện** | Full `tsc --noEmit` + `jest` + `npx expo export --platform web` + serve; rà animation; **user duyệt UI trên web + Expo Go** | Toàn bộ suite xanh; web 200 |

**Nguyên tắc giữ test xanh:** giữ nguyên các **chuỗi text** hiện có mà test đang assert (`▶ Start`, `💾 Lưu preset`, `■ Stop`, `Dừng timer?`, template names, …) — icon thêm *bên cạnh* text, không thay thế. Nếu bắt buộc đổi text → cập nhật test tương ứng trong cùng phase.

**Lưu ý môi trường:** không có Chrome → không chụp screenshot tự động; user xác nhận qua web (`localhost:8081`) và Expo Go.

---

## 8. Rủi ro / lưu ý

- **Reanimated 4 + babel plugin:** nếu thiếu `react-native-worklets/plugin` → animation không chạy (crash ở dev). Phải xác minh từ Phase 0; nếu phức tạp có thể dùng `Animated` (RN core) thay cho ring.
- **ProgressRing trên web:** react-native-svg hoạt động tốt web ✅.
- **Test đang assert emoji** (`▶`, `💾`, `■`, `⚙️`) — nếu thay bằng icon thuần, tests vỡ → ưu tiên icon + text, hoặc cập nhật test.
- **Stage heuristic theo tên** — preset người dùng đặt tên tùy ý sẽ rơi vào `default` (amber) → vẫn hợp lý, không gây lỗi.

---

## 9. Điểm cần chốt với user (trước khi code)

1. ✅ Phong cách vibrant thể thao — đã chốt
2. ✅ Accent theo stage — đã chốt
3. Splash/logo: OK làm theo mô tả (2 vòng tròn gradient)?
4. Timer ring: chạy 60fps bằng Reanimated hay dùng Animated core (an toàn hơn, ít rủi ro)? *(mặc định: thử Reanimated, fallback Animated)*
