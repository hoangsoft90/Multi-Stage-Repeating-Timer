# context.md — Multi-Stage-Repeating-Timer

> File context **tĩnh** (ít đổi) — tổng quan project. Chi tiết quyết định kiến trúc xem OpenSpec (`openspec/changes/*`, `openspec/specs/*`) và ADR. Nhật ký công việc đang làm/xong gần đây → `working.md`.

## Mục đích

App **LoopTimer** — đồng hồ interval nhiều giai đoạn (multi-stage repeating timer): user tạo preset nhiều stage (WORK/BREAK...), chạy lặp theo round, app tự chuyển stage bằng notification ngay cả khi ở nền/khóa màn hình.

## Tech stack

- **Expo SDK 57 / React Native 0.86** + TypeScript, **Expo Router** (file-based), **Zustand** (state).
- `react-i18next` — **12 ngôn ngữ** (`src/i18n/`, `vi` là source of truth, key-parity ép kiểu compile).
- AdMob (`react-native-google-mobile-ads` 16.3.4) + UMP consent + rewarded unlock; Firebase (Crashlytics/Analytics/Remote Config).
- Widget Android + iOS Live Activity (`expo-widgets`).
- Test: Jest (`jest-expo`) — 30 suites / 296 tests. Typecheck: `npx tsc --noEmit`.

## Cấu trúc thư mục chính

- `src/core/` — logic thuần (timer engine, templates, validation, time, storage repos).
- `src/features/` — zustand stores + logic feature (timer, presets, routine, goals, stats, sounds, monetization, background, feedback, widget).
- `src/app/` — screens (expo-router): `index` (Home), `timer`, `settings`, `templates`, `preset/[id]`, `routine`, `routine/[id]`, `stats`, `onboarding`.
- `src/components/` — UI (themed, app-card, progress-ring, guide/*, dialogs...).
- `src/platform/` — adapter native/web (`impl.native.ts` / `impl.web.ts`, index platform-agnostic).
- `src/hooks/`, `src/constants/`, `src/i18n/`, `src/test-utils/`.
- `openspec/` — workflow OpenSpec (changes/specs).
- `.github/workflows/build-apk.yml` — build APK tự động khi push main.

## Quyết định kiến trúc quan trọng (chi tiết: openspec)

- **TimerEngine thuần** (`src/core/timer/engine.ts`): timestamp tuyệt đối + `reconcile(now)` bắt kịp stage đã hết; UI chỉ render state do engine publish — spec `add-timer-engine`.
- **Chỉ 1 session active**; mọi transition persist qua `SessionRepo`, cold start restore + reconcile → recovery dialog.
- **Chuyển stage ở nền** bằng notification (`scheduler.scheduleAt`) + wake lock tùy setting.
- **Ads**: real AdMob IDs (Android) + UMP consent, `TEST_ADS = false` (production) trong `src/features/monetization/ads-config.ts`.
- **Release signing**: config plugin `plugins/with-release-signing.js` — release AAB ký bằng upload keystore (`looptimer-upload.jks`, secrets GH Actions); build qua GH Actions `bundleRelease` → artifact `looptimer-aab`.
- **Privacy Policy**: hosted trên GitHub Pages (`gh-pages`) — https://hoangsoft90.github.io/Multi-Stage-Repeating-Timer/ — nguồn `privacy-policy.html`/`.md`.
- **Store assets**: icon 512px + feature graphic 1024×500 tự sinh bằng script pure Node (`scripts/generate-app-icon.mjs`, `scripts/generate-feature-graphic.mjs`); hướng dẫn nộp app → `chplay.md`.
- **Theme**: `themeMode` (`system|light|dark`) áp dụng toàn app — `useTheme`/`useIsDark` (`src/hooks/use-theme.ts`), Settings có segmented control.
- **Build APK/AAB**: GH Actions (không EAS) — mọi push vào `main` đều trigger build ~46–48 phút; push `gh-pages` không trigger.

## Lưu ý vận hành

- Không commit file nhạy cảm (`credentials.json`, `looptimer-upload.jks`, `google-services*`, `.env*`) — xem `operating_rules.md`.
- Trạng thái build APK gần nhất / việc đang chạy → `working.md`.
