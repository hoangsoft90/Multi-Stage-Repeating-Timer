# operating_rules.md — Rule riêng của project

> Chỉ chứa RULE cụ thể của riêng project này (không lặp lại nội dung AGENTS.md). Quy tắc hạ tầng/memory/retrieval chung → `AGENTS.md` (repo root).

1. **KHÔNG bao giờ commit file nhạy cảm**: `credentials.json`, `looptimer-upload.jks`, `google-services.json`, `GoogleService-Info.plist`, `.env*`, `apk/`, `android/`, `dist/`. Khi `git add`, chọn file cụ thể — không `git add -A` khi các file này tồn tại trong working tree.
2. **`TEST_ADS = true`** đang bật trong `src/features/monetization/ads-config.ts` — phải đổi `false` trước khi phát hành production (nếu không mọi ads là test ad).
3. **Build APK qua GH Actions** (`.github/workflows/build-apk.yml`) — mọi push vào `main` tự trigger build (~46–48 phút). Push commit docs-only cần cân nhắc vì vẫn tốn 1 build.
4. **i18n**: `src/i18n/vi.ts` là source of truth; mọi key mới phải có đủ ở **12 ngôn ngữ** (key-parity ép kiểu compile — thiếu là `tsc` fail).
5. **Trước khi commit code**: chạy `npx tsc --noEmit` + `npm test` (jest). Code không pass test/typecheck thì không báo hoàn thành.
6. **OpenSpec**: tạo change qua CLI `openspec new change <tên>` (tên không bắt đầu bằng số); viết đủ 4 artifacts (proposal/specs/design/tasks) và chạy `openspec validate --changes` trước khi commit.
7. **Giao tiếp với user bằng tiếng Việt**; build/test output giữ nguyên bản gốc.
8. **Phone test**: cài APK qua adb/Tailscale; test trên máy thật là nguồn bug-report chính (như đợt settings UX).
