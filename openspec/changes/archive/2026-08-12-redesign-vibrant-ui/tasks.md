## 0. Nền tảng

- [x] 0.1 Cài dependencies: `npx expo install react-native-svg expo-linear-gradient @expo/vector-icons` (+ `expo-blur` tuỳ chọn); xác minh babel `react-native-worklets/plugin`
- [x] 0.2 Mở rộng `src/constants/theme.ts`: tokens background/surface/surfaceElevated/border/text/textSecondary/overlay/danger + brandGradient/secondaryGradient + typography scale
- [x] 0.3 Tạo `src/constants/stage-colors.ts`: bảng màu 5 nhóm stage (dark/light, main/gradient/tint) + heuristic map theo tên + fallback default
- [x] 0.4 Thêm icon helper (Ionicons) và cập nhật jest `transformIgnorePatterns` nếu cần; chạy `tsc` + `jest` (94 test xanh)

## 1. Component

- [x] 1.1 `GradientButton` (LinearGradient, press scale, shadow)
- [x] 1.2 `IconButton` (tròn 44px, accessibilityLabel)
- [x] 1.3 `AppCard` + `Chip` (surface, radius, shadow, chấm màu stage)
- [x] 1.4 `SegmentedControl` (3 segment) + `Stepper` (− / + / giá trị)
- [x] 1.5 `ProgressRing` (react-native-svg, gradient stroke, Reanimated 60fps, fallback Animated)
- [x] 1.6 `StagePill` (dải chips stage, highlight stage hiện tại)
- [x] 1.7 Render test cơ bản cho ProgressRing/SegmentedControl/GradientButton

## 2. Màn Timer

- [x] 2.1 Restyle Timer: ProgressRing thay progress bar, countdown display 80–96 tabular-nums, stage name title, round label
- [x] 2.2 Nền gradient tint theo stage color + crossfade khi đổi stage
- [x] 2.3 StagePill dưới vòng; controls nút tròn (Pause/Resume đổi nhãn, Skip) + Stop danger
- [x] 2.4 Pulse khi remaining < 10s; exit ✕ + Stop confirm giữ logic hiện có
- [x] 2.5 Cập nhật render test Timer (giữ text hiện có)

## 3. Home

- [x] 3.1 Header: logo mark + LoopTimer + IconButton settings
- [x] 3.2 Card template/preset: chấm màu stage đầu, tên, Chip meta, nút Start gradient
- [x] 3.3 "＋ Tạo preset mới" + empty state restyle
- [x] 3.4 ActionMenu restyle theo token; cập nhật render test nếu cần

## 4. Editor

- [x] 4.1 Repeat mode = SegmentedControl; fixedCount = Stepper
- [x] 4.2 Stage rows: chấm màu stage + TextInput + Stepper giây + xóa
- [x] 4.3 Validation style (text đỏ, border đỏ) giữ logic
- [x] 4.4 CTA: Start gradient full-width, Save secondary, Xóa danger (giữ text)
- [x] 4.5 Cập nhật render test Editor (giữ text)

## 5. Settings + dialogs + assets

- [x] 5.1 Settings: nhóm card + icon trái + Switch custom
- [x] 5.2 RecoveryDialog restyle (Resume gradient brand)
- [x] 5.3 Logo splash/app icon: script SVG → PNG (icon, splash, favicon, adaptive); cập nhật `app.json`
- [x] 5.4 Cập nhật test nếu cần

## 6. Hoàn thiện

- [x] 6.1 `tsc --noEmit` sạch + `jest` toàn bộ xanh
- [x] 6.2 `npx expo export --platform web` thành công; serve để user duyệt trên web + Expo Go
- [x] 6.3 Rà lại contrast stage colors, touch target ≥ 44px, accessibilityLabel nút icon
