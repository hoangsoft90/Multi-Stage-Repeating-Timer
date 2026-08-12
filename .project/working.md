# working.md — Nhật ký công việc (Multi-Stage-Repeating-Timer)

> Đổi thường xuyên. Format ngày ISO `YYYY-MM-DD`. Xóa mục đã xong quá 1–2 tuần (nội dung cũ đã có trong AgentMemory/ADR/openspec).

## 2026-08-12

### Trạng thái hiện tại

- **Builds GH Actions (3 đang chạy):**
  - `31616477651` — Settings links (privacy + rate) — `in_progress`
  - `31616883001` — **icon mới + links → artifact đầy đủ nhất** (AAB signed + APK) — `in_progress`
  - `31618321688` — docs-only (privacy sources) — `in_progress`
  - ✅ Đã xong hôm nay: `31604528686` (AAB release signed, 45m28s) · `31584761847` (exact-alarm, 36m32s) · pages deploy
- **Commit chưa push (local):** `d0e9210` (archive openspec 17 changes + 27 main specs) + `a8569c9` (audit spec sync) + `fb0200c` (openspec monetization) + `eb7bd9a` (journal) + `14df6fc` (.project refresh) — đẩy cùng lần tới (sẽ trigger 1 build nữa)
- **Untracked cố ý:** `AGENTS.md`, `initp.sh`
- **Còn chờ:** AdMob app iOS (`REAL_UNIT_IDS.ios`), push 9 Remote Config keys lên console, upload AAB lên Play Console (internal testing → production)

### Đã xong hôm nay

- [2026-08-12] **Release Play Store prep** (commit `4e46696`, đã push): `TEST_ADS=false` (AdMob thật — banner/interstitial/rewarded `ca-app-pub-6917313063209470/...`), config plugin `plugins/with-release-signing.js` (ký AAB bằng upload keystore, sống sót `prebuild --clean`, fallback debug keystore), GH Actions thêm `bundleRelease` + upload artifact `looptimer-aab`, 4 secrets đã set (`ANDROID_KEYSTORE_BASE64/PASSWORD/ALIAS/KEY_PASSWORD`). Run `31604528686` → success.
- [2026-08-12] **Settings links** (commit `a4a24b4`, đã push): Privacy Policy URL thật (GitHub Pages) + Rate app → Play Store `com.looptimer.app` (`src/app/settings.tsx`).
- [2026-08-12] **Host Privacy Policy** (branch `gh-pages`): live tại https://hoangsoft90.github.io/Multi-Stage-Repeating-Timer/ — email `haibasoftware@gmail.com`. Nguồn `privacy-policy.html`/`.md` đã commit vào main (`c4ece84`).
- [2026-08-12] **App icon mới** (commit `cdf7f3b`, đã push): `assets/images/icon.png` 512×512 — nền `#0B0F14`, ring kín 5 segment (stage palette), glyph trắng "20" 7-seg. Script `scripts/generate-app-icon.mjs` (pure Node, supersample 2048→512).
- [2026-08-12] **Feature graphic** (commit `ed44a33`, đã push): `assets/images/feature-graphic.png` 1024×500 — ring gradient blue→purple + gap countdown + "20", chain 5 ring stage, LOOPTIMER + subtitle, badge FREE, clock icon. Script `scripts/generate-feature-graphic.mjs` (text vẽ bằng vector hình học).
- [2026-08-12] **`chplay.md`** (commit `4eab7db`): toàn bộ thông tin Play Console (tiếng Anh) + gắn file asset thật (icon, feature graphic, privacy URL).
- [2026-08-12] **openspec audit + archive** (commits `a8569c9` + `d0e9210`, local): đối chiếu 24 changes/33 specs với code — sửa 3 spec lệch (monetization + custom sounds, scheduled-routine floor 10, permissions once-per-install); **archive 17 changes hoàn thành** → `openspec/changes/archive/2026-08-12-*/`, sync **27 main specs** vào `openspec/specs/` (`visual-design` tạo tay vì delta có MODIFIED requirement khi main spec chưa tồn tại). Còn 7 changes active (monetization, background, widget ×2, live-activity, feedback, drag-drop) — validate 34/34 pass.
- [2026-08-12] **openspec monetization** (commit `fb0200c`, local): spec `monetization` thêm requirement "production mode — TEST_ADS=false, AdMob thật" + tasks.md section 7 Release (AAB signing, links, assets, còn 7.5–7.7). Validate 24/24.
- [2026-08-12] openspec change `fix-exact-alarm-prompt` (4 artifacts, đã push kèm `a4a24b4`) + cập nhật spec `settings-ux` (requirement mark-asked).
- [2026-08-12] **fix double exact-alarm prompt** (commit `94547f0`, đã push): helper `openExactAlarmSettings()` — set cờ once-per-install, Platform guard.
- [2026-08-12] **Settings UX fixes** (commit `6e603dc`) + **3 bug fixes** `themeMode`/routine editor/timer-completed (commit `e74911c`) — đã push.

### Lưu ý

- Mọi push vào `main` trigger build APK (~46–48 phút, workflow không có paths filter) → docs-only push cần cân nhắc.
- Không commit file nhạy cảm (`credentials.json`, `looptimer-upload.jks`, `apk/`, `android/`, `dist/`...) — luôn `git add` file cụ thể.
- ⚠️ Token `ghp_...` đã lộ trong chat nhiều lần — nên revoke/rotate sau khi build xong.
