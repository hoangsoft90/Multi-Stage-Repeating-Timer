# working.md — Nhật ký công việc (Multi-Stage-Repeating-Timer)

> Đổi thường xuyên. Format ngày ISO `YYYY-MM-DD`. Xóa mục đã xong quá 1–2 tuần (nội dung cũ đã có trong AgentMemory/ADR/openspec).

## 2026-08-12

- [2026-08-12] Xong: **App Icon mới `assets/images/icon.png` (512×512)** — nền rounded dark `#0B0F14`, vòng tròn kín 5 segment (đỏ→cam→vàng→xanh→tím, đúng palette stage `stage-colors.ts`), glyph trắng "20" kiểu 7-segment ở giữa. Script `scripts/generate-app-icon.mjs` (pure Node, supersample 2048→512).
- [2026-08-12] Đang chạy: **build mới nhất `31616477651`** — commit `a4a24b4` (Settings: privacy link thật `hoangsoft90.github.io/...` + rate link Play Store `play.google.com/store/apps/details?id=com.looptimer.app`, đã push). Trước đó run `31604528686` (AAB release signed) đã success 45m28s.
- [2026-08-12] Xong: **host Privacy Policy** — `privacy-policy.html` (self-contained, mobile-friendly, email `haibasoftware@gmail.com`) push lên branch `gh-pages` → **live tại https://hoangsoft90.github.io/Multi-Stage-Repeating-Timer/** (GitHub Pages, HTTP 200). Push `gh-pages` không trigger build APK. Đã cập nhật `privacy-policy.md` (email thật) + `chplay.md` (URL + email). File nguồn chưa commit vào main (chờ gộp chung push code).
- [2026-08-12] Đang chạy: **release Play Store build** — commit `4e46696` (TEST_ADS=false + AAB signing) push lên main → **GH Actions run `31604528686`** in_progress. Prebuild (config plugin `with-release-signing`) pass. Khi xong: `gh run download 31604528686 --name looptimer-aab` → `app-release.aab` → upload Play Console. Secrets đã set: `ANDROID_KEYSTORE_BASE64`/`PASSWORD`/`ALIAS` (keystore `looptimer-upload.jks`).

- [2026-08-12] Đã push + build: commit `94547f0` (fix exact-alarm prompt) lên main → **GH Actions run `31584761847`** đang chạy (Build APK ~46–48 phút). Khi xong: `gh run download 31584761847 --name looptimer-apk` → `app-release.apk`.
- [2026-08-12] Xong: openspec change **`fix-exact-alarm-prompt`** (4 artifacts: proposal/specs `exact-alarm-ask-once`/design/tasks) + cập nhật spec `settings-ux` (change `add-settings-ux-and-user-guidance`) với requirement "Background accuracy đánh dấu đã hỏi". `openspec validate --changes` 24/24 pass. **CHƯA commit/push** (push docs-only sẽ trigger 1 build APK thừa).

- [2026-08-12] Xong: **fix double exact-alarm prompt** — Settings > Background accuracy mở system "Alarms & reminders" nhưng không set cờ `exact-alarm-asked` → lần Start đầu (just-in-time) mở lại screen đó. Tách helper chung `openExactAlarmSettings()` trong `src/features/background/permissions.ts` (set cờ sau khi launch thành công + Platform guard), `src/app/settings.tsx` gọi helper thay vì `IntentLauncher` trực tiếp. `tsc` sạch + 51 test pass.

- [2026-08-12] Xong: **Settings UX fixes** (commit `6e603dc`, đã push) — ActionMenu cuộn được (language picker), row Privacy options gọi `gatherConsent()` trước + alert fallback, row Background accuracy luôn bấm được + refresh khi focus, chevron affordance, `canScheduleExactAlarm` fallback `false`, notification body-tap → `/timer` (live + cold start), flag `TEST_ADS=true` (test unit ID), hệ thống guide trong app (badge/tooltip/guide line, `guidesSeen`).
- [2026-08-12] Xong: openspec change `add-settings-ux-and-user-guidance` (commit `1c7f5f8`, đã push cùng `6e603dc`).
- [2026-08-12] Xong: **review toàn bộ codebase** → phát hiện + fix 3 bug (commit `e74911c`, đã push):
  - `themeMode` là setting chết → `useTheme`/`useIsDark` đọc settings store, `ThemeProvider` tôn trọng, Settings dùng segmented control System/Light/Dark, `timer.tsx`/`preset/[id].tsx` chuyển sang `useIsDark`.
  - Routine editor không tạo được khi chưa có preset → merge `BUILTIN_TEMPLATES` + presets; `schedulePresetName` resolve tên built-in.
  - Timer kẹt 00:00 sau khi hoàn thành → redirect Home khi status `completed`.
  - Kèm: i18n ×12 (`settings.theme*`), jest-setup mock AsyncStorage toàn cục.
- [2026-08-12] Xong: openspec change `fix-review-issues` (commit `d8e5567`, đã push; 4/4 artifacts, validate 23/23 pass).
- [2026-08-12] Đang chạy: **APK builds GH Actions** — run `31571782269` (code cũ, user yêu cầu để nguyên) + run `31573355542` (code fix `e74911c`). Cả 2 `in_progress`.
- [2026-08-12] Lưu ý: mọi push vào `main` đều trigger build APK (~46–48 phút, workflow không có paths filter) → commit docs-only (`d8e5567`, `.project/*`) chưa push để tránh build thừa.
- [2026-08-12] Lưu ý an toàn: git đang có file nhạy cảm untracked (`credentials.json`, `looptimer-upload.jks`, `apk/`, `android/`, `dist/`...) — **không `git add -A`**; cần bổ sung `.gitignore`.
