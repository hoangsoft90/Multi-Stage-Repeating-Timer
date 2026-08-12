# working.md — Nhật ký công việc (Multi-Stage-Repeating-Timer)

> Đổi thường xuyên. Format ngày ISO `YYYY-MM-DD`. Xóa mục đã xong quá 1–2 tuần (nội dung cũ đã có trong AgentMemory/ADR/openspec).

## 2026-08-12

- [2026-08-12] Xong: **Settings UX fixes** (commit `6e603dc`, đã push) — ActionMenu cuộn được (language picker), row Privacy options gọi `gatherConsent()` trước + alert fallback, row Background accuracy luôn bấm được + refresh khi focus, chevron affordance, `canScheduleExactAlarm` fallback `false`, notification body-tap → `/timer` (live + cold start), flag `TEST_ADS=true` (test unit ID), hệ thống guide trong app (badge/tooltip/guide line, `guidesSeen`).
- [2026-08-12] Xong: openspec change `add-settings-ux-and-user-guidance` (commit `1c7f5f8`, đã push cùng `6e603dc`).
- [2026-08-12] Xong: **review toàn bộ codebase** → phát hiện + fix 3 bug (commit `e74911c`, đã push):
  - `themeMode` là setting chết → `useTheme`/`useIsDark` đọc settings store, `ThemeProvider` tôn trọng, Settings dùng segmented control System/Light/Dark, `timer.tsx`/`preset/[id].tsx` chuyển sang `useIsDark`.
  - Routine editor không tạo được khi chưa có preset → merge `BUILTIN_TEMPLATES` + presets; `schedulePresetName` resolve tên built-in.
  - Timer kẹt 00:00 sau khi hoàn thành → redirect Home khi status `completed`.
  - Kèm: i18n ×12 (`settings.theme*`), jest-setup mock AsyncStorage toàn cục.
- [2026-08-12] Xong: openspec change `fix-review-issues` (commit `d8e5567` — **CHƯA push**; 4/4 artifacts, validate 23/23 pass).
- [2026-08-12] Đang chạy: **APK builds GH Actions** — run `31571782269` (code cũ, user yêu cầu để nguyên) + run `31573355542` (code fix `e74911c`). Cả 2 `in_progress`.
- [2026-08-12] Lưu ý: mọi push vào `main` đều trigger build APK (~46–48 phút, workflow không có paths filter) → commit docs-only (`d8e5567`, `.project/*`) chưa push để tránh build thừa.
- [2026-08-12] Lưu ý an toàn: git đang có file nhạy cảm untracked (`credentials.json`, `looptimer-upload.jks`, `apk/`, `android/`, `dist/`...) — **không `git add -A`**; cần bổ sung `.gitignore`.
