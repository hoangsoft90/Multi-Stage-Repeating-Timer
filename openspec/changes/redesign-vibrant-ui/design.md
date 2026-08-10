# Design: redesign-vibrant-ui

## Nguyên tắc

1. **Màu = trạng thái** — stage hiện tại đọc được bằng màu (WORK đỏ, BREAK xanh) kể cả khi không nhìn chữ.
2. **Màn Timer là ngôi sao** — animation + typography đầu tư nhất.
3. **CTA chính luôn nổi** — nút Start gradient không thể bỏ lỡ.
4. **Dark-first, đẹp cả light** — tôn trọng theme hệ thống.
5. **Icon nhất quán** (Ionicons) thay emoji; text label giữ song song để test ổn định.

## Design tokens (`src/constants/theme.ts` mở rộng)

| Token | Dark | Light |
|---|---|---|
| `background` | `#0B0F14` | `#F6F7F9` |
| `surface` | `#151B22` | `#FFFFFF` |
| `surfaceElevated` | `#1C242E` | `#FFFFFF` |
| `border` | `rgba(255,255,255,0.08)` | `rgba(15,20,25,0.08)` |
| `text` | `#F5F7FA` | `#0F1419` |
| `textSecondary` | `#8B95A3` | `#5B6472` |
| `overlay` | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.40)` |
| `danger` | `#FF5A5F` | `#D9383E` |

`brandGradient = ['#FF512F', '#F09819']` — CTA chính.
`secondaryGradient = ['#22D3EE', '#3B82F6']` — CTA phụ.

## Stage colors (`src/constants/stage-colors.ts` — mới)

| Nhóm (match tên stage, lowercase) | Dark | Light | Ý nghĩa |
|---|---|---|---|
| work (work/focus/hiit/sprint) | `#FF4D2E` | `#E23D12` | cường độ |
| break (break/rest) | `#22C55E` | `#16A34A` | thư giãn |
| focus (focus/deep) | `#A78BFA` | `#7C3AED` | tập trung |
| cooldown (cooldown/cool/stretch) | `#38BDF8` | `#0284C7` | hồi phục |
| default | `#F59E0B` | `#D97706` | mặc định |

Mỗi stage color `{ main, dark, gradient: [c1, c2], tint: rgba }`. Heuristic: lowercase tên → khớp keyword → nhóm; không khớp → default. Luôn hiển thị tên stage kèm màu (accessibility — không phụ thuộc màu duy nhất).

## Typography

System font, weight đậm. `display` 80–96 / 700–800 `tabular-nums` (countdown), `title` 34/700 (stage name), `heading` 22/700, `subtitle` 17/600, `body` 15/500, `caption` 13/500, `micro` 11/600 uppercase letterSpacing 1.

## Components (`src/components/`)

- **GradientButton** — LinearGradient brand/secondary, radius lg, press scale 0.97, shadow lift; props `gradient`, `label`, `icon`, `onPress`, `disabled`.
- **IconButton** — nút tròn 44px, `@expo/vector-icons` Ionicons, `accessibilityLabel` bắt buộc.
- **AppCard** — surface, radius lg (20), shadow soft, padding 16.
- **Chip** — `surfaceElevated` nền, caption text, chấm màu stage tuỳ chọn.
- **SegmentedControl** — 3 segment, segment active = text màu + track sáng (Editor repeat mode).
- **Stepper** — `−` / `+` tròn 36px + giá trị ở giữa (duration, fixedCount).
- **ProgressRing** — react-native-svg `Circle` stroke, gradient theo stage (LinearGradient def), strokeLinecap round, quay đủ vòng theo tiến trình; chạy bằng Reanimated (rơi về RN `Animated` nếu babel plugin không có).
- **StagePill** — dải chip từng stage, chip đang chạy sáng màu stage, đã qua xám.

## Màn hình

### Timer (`src/app/timer.tsx`)
- Nền LinearGradient tint theo stage color (alpha thấp) → trong suốt, crossfade 400ms khi đổi stage.
- ProgressRing ~300px ở giữa; bên trong: stage name (title), countdown (display 80–96), round label (caption uppercase).
- StagePill dưới vòng. Controls: 2 nút tròn 96px (Pause/Resume đổi nhãn + màu; Skip) + nút Stop danger. Glass (expo-blur) với fallback surface.
- Pulse nhẹ countdown + ring khi remaining < 10s.
- Giữ: `useTimerStore`, logic exit ✕ (web: stop confirm; native: back giữ chạy), `confirmAsync` Stop.

### Home (`src/app/index.tsx`)
- Header: logo mark (vòng gradient) + LoopTimer + IconButton ⚙️.
- Card: chấm màu theo stage đầu tiên, tên đậm, Chip meta giữ nguyên text (`2 stages · loop`), nút Start gradient (icon play + "Start").
- "＋ Tạo preset mới" card dashed; empty state có icon + caption.
- Long-press → ActionMenu (restyle) giữ logic hiện có.

### Editor (`src/app/preset/[id].tsx`)
- Repeat mode = SegmentedControl; fixedCount = Stepper.
- Mỗi stage: chấm màu theo heuristic tên + TextInput tên + Stepper giây + nút xóa.
- Validation: text đỏ + border đỏ (giữ `validatePreset` + `alertAsync`).
- CTA: Start = GradientButton brand full-width (giữ text "▶ Start timer"), Save = secondary (giữ "💾 Lưu preset"), Xóa = danger.

### Settings (`src/app/settings.tsx`)
- Nhóm card, row có icon trái + Switch custom (track brand khi on). Giữ toggles + About/Privacy/Rate (`alertAsync`/`WebBrowser`).

### Dialogs
- RecoveryDialog: card surface radius xl, Resume gradient brand, Restart secondary, Dismiss ghost.
- ActionMenu: theo token (đã cross-platform).

## Splash & icon
- Logo: 2 vòng tròn đồng tâm nửa điền (timer ring) + gradient brand. Script Node sinh SVG → PNG (`icon.png`, `splash-icon.png`, favicon, adaptive). Cập nhật `app.json` (splash background `#0B0F14`).

## Phụ thuộc

- `npx expo install react-native-svg expo-linear-gradient @expo/vector-icons` (+ `expo-blur` tuỳ chọn).
- Babel: đảm bảo `react-native-worklets/plugin` (Reanimated 4). Nếu không có → dùng RN core `Animated` cho ring.
- Jest `transformIgnorePatterns` bổ sung `react-native-svg`, `expo-linear-gradient`, `@expo/vector-icons` nếu cần.

## Validation
Mỗi phase: `tsc --noEmit` + `jest`. Cuối: `npx expo export --platform web` + serve để user duyệt; giữ 94 test hiện có xanh (giữ nguyên chuỗi text đang assert).
