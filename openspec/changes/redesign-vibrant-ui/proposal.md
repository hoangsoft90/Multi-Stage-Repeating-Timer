## Why

App đã chạy đủ chức năng (engine, storage, 4 màn hình, background, feedback, monetization) nhưng UI dùng theme mặc định 5 màu, icon emoji không nhất quán, asset của template Expo, và màn Timer chỉ có progress bar ngang cơ bản — chưa đạt chuẩn thẩm mỹ của một timer app thể thao. Change này thiết kế lại toàn bộ lớp trình bày (visual presentation) theo phong cách **vibrant thể thao** với hệ thống **accent đổi màu theo stage** (WORK đỏ cam, BREAK xanh lá, FOCUS tím, COOLDOWN xanh dương), KHÔNG đổi behavior/flow/logic hiện có.

## What Changes

- **Design tokens**: mở rộng `src/constants/theme.ts` (background/surface/border/text theo dark-first), thêm `src/constants/stage-colors.ts` (bảng màu stage + heuristic map theo tên stage, có fallback amber).
- **Dependency**: thêm `react-native-svg` (vòng tròn tiến trình), `expo-linear-gradient` (gradient), `@expo/vector-icons` (hệ thống icon thay emoji), tuỳ chọn `expo-blur` (glass control); xác minh babel plugin Reanimated.
- **Component mới**: `GradientButton`, `IconButton`, `AppCard`, `Chip`, `SegmentedControl`, `Stepper`, `ProgressRing` (SVG), `StagePill`.
- **Màn Timer (trọng tâm)**: vòng tròn tiến trình gradient theo màu stage chạy 60fps, countdown khổng lồ tabular-nums, nền đổi màu theo stage (crossfade), dải chips stage, nút điều khiển restyle, pulse khi < 10 giây.
- **Home**: header có logo mark + IconButton settings, template/preset card có chấm màu stage + nút Start gradient, giữ nguyên text hiện có để test không vỡ.
- **Editor**: SegmentedControl cho repeat mode, Stepper cho duration/fixedCount, chấm màu stage, CTA gradient, giữ validation + alertAsync/confirmAsync.
- **Settings + dialogs**: nhóm card có icon + Switch custom; restyle RecoveryDialog + ActionMenu theo token.
- **Splash & app icon**: logo 2 vòng tròn gradient, cập nhật `app.json`.

**Không đổi behavior**: engine, store, storage, routing, luồng confirm (confirmAsync/alertAsync), test text hiện có được giữ nguyên (icon + text song song).

## Capabilities

### New Capabilities

- `visual-design`: hệ thống thiết kế (tokens, stage colors, typography, spacing/radius/elevation, gradient brand), ProgressRing, GradientButton, icon system thay emoji, và quy tắc trình bày áp dụng trên các màn hình.

### Modified Capabilities

- `screens`: 4 màn hình được restyle theo visual-design nhưng giữ nguyên hành vi observable hiện có (luồng Start/Stop/confirm, sacred timer screen không ad, chạm template mở Editor, ...).
- `settings`: nhóm card + icon + Switch custom, giữ nguyên toggles và About/Privacy/Rate.
