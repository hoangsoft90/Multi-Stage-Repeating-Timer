# LoopTimer — Hướng dẫn xuất bản lên Google Play & App Store

> **Trạng thái:** READY-TO-PUBLISH (code đã xong + UMP consent/non-personalized đã implement; **Android đã dán AdMob real IDs**; đang chờ iOS AdMob IDs + các bước setup tài khoản + config bên ngoài).
> Cập nhật: 2026-08-11 · Expo SDK 57 · React Native 0.86

---

## Mục lục

1. [Tổng quan & trạng thái](#1-tổng-quan--trạng-thái)
2. [Icon app (đã tạo xong)](#2-icon-app-đã-tạo-xong)
3. [Gaps cần xử lý trước khi build](#3-gaps-cần-xử-lý-trước-khi-build)
4. [AdMob — checklist setup](#4-admob--checklist-setup)
5. [Firebase + Remote Config](#5-firebase--remote-config)
6. [GDPR / EU user consent (UMP)](#6-gdpr--eu-user-consent-ump)
7. [Build & chạy trên Android device](#7-build--chạy-trên-android-device)
8. [Build & chạy iOS](#8-build--chạy-ios)
9. [Phát hành Google Play — checklist](#9-phát-hành-google-play--checklist)
10. [Phát hành App Store — checklist](#10-phát-hành-app-store--checklist)
11. [Việc con người cần làm — tổng hợp](#11-việc-con-người-cần-làm--tổng-hợp)
12. [Troubleshooting](#12-troubleshooting)

> 📖 **Guide EAS Build riêng:** [`eas-build-guide.md`](./eas-build-guide.md) — cấu trúc `eas.json`, quản lý credentials/keystore, build từng profile (development/preview/production), Firebase files, widget entitlements, `eas submit`, troubleshooting.

---

## 1. Tổng quan & trạng thái

**App:** LoopTimer — Multi-Stage Repeating Timer (tập luyện interval).
**Identity:**
- Android package: `com.looptimer.app` · iOS bundle ID: `com.looptimer.app`
- Android App ID (AdMob, **thật**): `ca-app-pub-6917313063209470~4808606529`
- iOS App ID (AdMob, **đang là demo/test**): `ca-app-pub-3940256099942544~1458002511` → tạo app AdMob iOS riêng khi cần
- Privacy Policy URL: **đang là placeholder** `https://example.com/privacy` → phải thay
- Store URL: **đang là placeholder** `https://example.com/store` → phải thay

| Mảng | Trạng thái |
|---|---|
| Code (timer engine, notifications, widgets, ads, i18n ×12) | ✅ Hoàn thành, 285 test pass, tsc clean |
| Icon app (iOS + Android adaptive + monochrome) | ✅ Mới tạo (xem mục 2) |
| AdMob integration (code) | ✅ Đủ 4 placement |
| AdMob tài khoản + Unit ID thật (Android) | ✅ Đã dán banner/interstitial/rewarded (checklist mục 4) |
| AdMob tài khoản + Unit ID thật (iOS) | ❌ Chưa làm — iOS vẫn dùng test IDs (checklist mục 4) |
| Firebase config files (`google-services.json` + `GoogleService-Info.plist`) | ✅ Đã có ở root — cần xác nhận đúng project (mục 5.1) |
| Remote Config 9 keys trên console | ❌ Chưa push |
| GDPR consent (UMP) — code | ✅ Đã implement (AdsConsent: gatherConsent/CanRequestAds/NPA fallback) |
| GDPR consent (UMP) — AdMob message | ❌ Chưa tạo message trên console (mục 6) |
| Build Android test | ❌ Chưa |
| Build iOS test | ❌ Chưa (cần máy Mac) |
| Play Console / App Store Connect | ❌ Chưa tạo |

---

## 2. Icon app (đã tạo xong)

Mình đã nâng cấp script `scripts/generate-icons.mjs` (v2) và chạy — **không cần làm gì thêm về icon**:

```
node scripts/generate-icons.mjs
```

**Thiết kế:** timer-ring — vòng tròn gradient brand (`#FF512F → #F09819`) có khe hở bên phải (ẩn dụ countdown) quanh play triangle trắng, nền navy `#0B0F14`. V2 thêm: supersampling 4× (nét mượt, chống răng cưa), radial glow cam sau logo, nền radial gradient chiều sâu.

**Output (6 file, đã ghi vào `assets/images/`):**

| File | Kích thước | Dùng cho |
|---|---|---|
| `icon.png` | 1024×1024 | iOS app icon (app.json `icon`) |
| `favicon.png` | 48×48 | Web favicon |
| `splash-icon.png` | 512×512 | Splash screen (nền trong suốt) |
| `android-icon-foreground.png` | 1024×1024 | Adaptive icon foreground (safe zone 72%) |
| `android-icon-background.png` | 1024×1024 | Adaptive icon background (`#0B0F14`) |
| `android-icon-monochrome.png` | 1024×1024 | Android 13+ themed icon |

> 💡 Muốn xem trước: `npx expo start --web` rồi mở trang web — favicon hiện ở tab. Hoặc mở trực tiếp file PNG.

---

## 3. Gaps cần xử lý trước khi build

⚠️ **3 mục trong `tasks.md` đánh `[x]` nhưng thực tế CHƯA tồn tại trong code** — phải sửa trước khi build:

✅ **Gap 1 + Gap 2 đã xử lý** (code hiện tại):
- `expo-dev-client` (`~57.0.10`) + `expo-build-properties` (`~57.0.9`) **đã có** trong package.json
- Firebase config plugin **đã có** trong `app.json` (`@react-native-firebase/app` trỏ 2 file config) + `useFrameworks: dynamic`

### Gap 3 — Privacy Policy + Store URL đang là placeholder (CÒN)
Trong `src/app/settings.tsx`:
```ts
const PRIVACY_URL = 'https://example.com/privacy';  // ← thay bằng URL thật
const STORE_URL = 'https://example.com/store';       // ← thay bằng link store thật
```

---

## 4. AdMob — checklist setup

### 4.1 Tạo tài khoản
- [ ] Truy cập https://admob.google.com → đăng nhập Google account (nên dùng account dev riêng)
- [ ] Chọn **country/territory, time zone, billing currency** (⚠️ **không đổi được sau này**)
- [ ] Hoàn tất hồ sơ thanh toán + khai báo thuế (W-8BEN nếu không phải US) → chờ duyệt (24h → vài ngày)

### 4.2 Tạo app + lấy ID
- [ ] **Apps → Add app** → chọn platform **Android** → tên "LoopTimer" → App ID `com.looptimer.app`
- [ ] Tạo tiếp app **iOS** → bundle ID `com.looptimer.app`
- [ ] Lưu 2 **App ID** (dạng `ca-app-pub-XXXX~YYYY`) → dán vào `app.json`:
  ```json
  ["react-native-google-mobile-ads", {
    "androidAppId": "ca-app-pub-YOUR_REAL_ID~XXXX",
    "iosAppId": "ca-app-pub-YOUR_REAL_ID~YYYY"
  }]
  ```
- [ ] ⚠️ **Chưa cần store URL để hiện ads** — có thể đánh dấu "Not yet published". Nhưng để fill rate cao + monetize tốt thì sau khi lên store phải link URL + tạo **`app-ads.txt`** trên website dev.

### 4.3 Tạo 4 Ad Unit + dán vào code

✅ **Android đã dán xong** trong `src/features/monetization/ads-config.ts`:
```ts
REAL_UNIT_IDS.android = {
  banner: 'ca-app-pub-6917313063209470/2118295781',
  interstitial: 'ca-app-pub-6917313063209470/9989046949',
  appOpen: '', // placement tắt (PLACEMENT_ENABLED.appOpen = false)
  rewarded: 'ca-app-pub-6917313063209470/9581852835',
};
```

**iOS còn lại (khi tạo app AdMob iOS):**
- [ ] Tạo app iOS → bundle ID `com.looptimer.app` → tạo 4 ad unit: **Banner, Interstitial, Rewarded, App Open**
- [ ] Dán ID thật vào `REAL_UNIT_IDS.ios` trong `src/features/monetization/ads-config.ts`
- [ ] Bật App Open nếu muốn: `PLACEMENT_ENABLED.appOpen = true` (mặc định OFF theo quyết định product)
- [ ] **Rebuild app** (đổi Unit ID cần build lại, không chỉ reload JS)

### 4.4 Test IDs (mặc định khi chưa dán ID thật)
App đang tự fallback về test IDs của Google (an toàn, có watermark "Test Ad", **không sinh doanh thu**):

| Format | Android | iOS |
|---|---|---|
| Banner | `ca-app-pub-3940256099942544/9214589741` | `ca-app-pub-3940256099942544/2435281174` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` | `ca-app-pub-3940256099942544/4411468910` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` | `ca-app-pub-3940256099942544/1712485313` |
| App Open | `ca-app-pub-3940256099942544/9257395921` | `ca-app-pub-3940256099942544/5575463023` |

> ⚠️ **Tuyệt đối không click/test ad bằng ID thật khi dev** — sẽ dính invalid traffic, bị giới hạn hoặc treo account.

### 4.5 Thanh toán (sau khi có doanh thu)
- [ ] Ngưỡng rút: **$100 USD** (rollover hàng tháng, thanh toán ~21–26 tháng sau)
- [ ] Xác minh danh tính khi earnings chạm **$10** (cần giấy tờ tùy thân)
- [ ] Xác minh địa chỉ bằng **PIN qua thư giấy** (bắt buộc trước khi nhận tiền)

---

## 5. Firebase + Remote Config

### 5.1 Tạo project
- [ ] https://console.firebase.google.com → **Add project** (tên: `looptimer`) → Analytics: chọn "Not now" hoặc bật Google Analytics đều được
- [ ] **Add app → Android** → package `com.looptimer.app` → tải **`google-services.json`** → đặt **cạnh `app.json`** (cùng thư mục root)
- [ ] **Add app → iOS** → bundle `com.looptimer.app` → tải **`GoogleService-Info.plist`** → đặt cạnh `app.json`
- [ ] Thêm Firebase config plugin vào app.json (Gap 2 ở mục 3)

### 5.2 Remote Config — push 9 keys
- [ ] Firebase console → **Remote Config** → tạo 9 key với đúng giá trị mặc định:

| Key | Default |
|---|---|
| `interstitial_cooldown_seconds` | `240` |
| `interstitial_max_per_session` | `1` |
| `app_open_cooldown_seconds` | `60` |
| `max_scheduled_transitions_ios` | `50` |
| `missed_transition_rate_threshold` | `0.15` |
| `timer_screen_native_ad_enabled` | `false` |
| `preset_free_limit` | `-1` |
| `custom_sound_unlock_hours` | `24` |
| `reminder_reserved_slots` | `10` |

- [ ] Publish changes (bản đầu có thể dùng "Publish now")

> Code đã có fallback defaults giống hệt (`src/platform/impl.native.ts` DEFAULT_CONFIG) — app chạy bình thường dù chưa push.

> Code đã có fallback defaults giống hệt — app chạy bình thường dù chưa push.

### 5.3 Verify sau khi build
- [ ] Chạy dev build → kiểm tra log không có lỗi Firebase init
- [ ] `remoteConfig.getNumber('interstitial_cooldown_seconds')` trả 240 (hoặc giá trị bạn set)

---

## 6. GDPR / EU user consent (UMP)

> ✅ **UMP đã implement trong code** — bắt buộc nếu serve ads cho người dùng EEA/UK/CH.

**Trạng thái code (đã xong, xem `openspec/changes/add-monetization-observability` tasks 4.2):**
- Dùng module **`AdsConsent` sẵn có trong `react-native-google-mobile-ads`** (không cần cài thêm)
- `consent.gatherConsent()` chạy ở bootstrap (`use-bootstrap.ts`) — request info + hiện consent form khi cần
- UMP gate `canRequestAds()` trước mỗi show ad (interstitial/app-open/rewarded/banner)
- Non-personalized fallback: `resolveNonPersonalized` (`src/features/monetization/consent.ts`) → `requestNonPersonalizedAdsOnly`; ATT denied/restricted → NPA vẫn serve
- Settings có row "Privacy options" (mở `showPrivacyOptionsForm`)

**Việc con người còn lại (console AdMob):**
- [ ] AdMob → **Privacy & messaging** → tạo message "European regulations" (TCF v2.3, 2 hoặc 3 button)
- [ ] Xác nhận message áp dụng (mặc định cho EEA/UK/CH) — form sẽ tự hiện qua `AdsConsent.gatherConsent()`
- [ ] **Verify trên dev build:** chọn "Denied" trong UMP form → ads vẫn serve non-personalized (không fail)

---

## 7. Build & chạy trên Android device

### 7.1 Chuẩn bị máy
- [ ] Cài **Android Studio** (SDK + platform-tools + JDK 17+)
- [ ] Điện thoại Android: bật **Developer options** → **USB debugging**
- [ ] Cắm máy, xác nhận `adb devices` thấy device

### 7.2 Cách 1 — Dev build nhanh (không cần EAS)
```bash
# sau khi đã cài expo-dev-client (Gap 1)
npx expo install expo-dev-client
npx expo run:android
```
- Build native + cài lên máy (~5–15 phút lần đầu)
- Mở app → **thấy Test Ad banner trên Home** (nếu chưa dán ID thật)
- Test: chạy 1 session xong → **Interstitial** hiện; Settings → custom sound → **Rewarded**

### 7.3 Cách 2 — EAS dev client (build đám mây)
```bash
npx eas-cli login
npx eas build --platform android --profile development
npx expo start --dev-client   # rồi quét QR / gõ URL trên máy
```
- Cần tạo `eas.json` nếu chưa có (EAS tự generate khi chạy lệnh build lần đầu)

### 7.4 Checklist test trên máy thật
- [ ] Banner hiện trên Home (có watermark "Test Ad")
- [ ] Interstitial hiện sau khi Stop/Completed (cooldown 240s, max 1/phiên)
- [ ] Rewarded: Settings → mở khoá custom sound → video hiện → mở khoá 24h
- [ ] App Open: bật `PLACEMENT_ENABLED.appOpen = true` → kill app → mở lại → ad hiện
- [ ] Tắt mạng → ad load fail → **không crash, không block UI**
- [ ] Notification + timer vẫn chạy đúng (regression)

---

## 8. Build & chạy iOS

> ⚠️ **Cần máy Mac** (Xcode 26+). Không build iOS trên Windows/Linux.

- [ ] Cài Xcode 26+ từ App Store
- [ ] `npx expo run:ios` (dev build, cần simulator hoặc máy thật + Apple ID)
- [ ] Test ads trên simulator (simulator tự động là test device)
- [ ] Test ATT: chạy timer lần đầu → prompt "Dữ liệu này dùng để hiển thị quảng cáo phù hợp hơn" hiện → chọn Denied → ads vẫn serve (non-personalized)
- [ ] Test Live Activity + home widget (iOS 16.1+)

---

## 9. Phát hành Google Play — checklist

### 9.1 Tài khoản
- [ ] https://play.google.com/console → đăng ký developer account (**$25 một lần**)
- [ ] Hoàn tất thông tin tài khoản + xác minh danh tính

### 9.2 Build production AAB
```bash
npx eas build --platform android --profile production
```
- [ ] Output là file `.aab` (bắt buộc dùng App Bundle từ 2021)
- [ ] Version: kiểm tra `app.json` → `android.versionCode` (tăng mỗi lần release; nếu chưa có, thêm vào)

### 9.3 Tạo app trong Play Console
- [ ] **Create app** → tên "LoopTimer", ngôn ngữ, free/paid
- [ ] **App signing:** enroll **Play App Signing** (bắt buộc với AAB). EAS có thể quản lý upload key — lưu keystore ở nơi an toàn (mất = mất khả năng cập nhật app!)
- [ ] Upload AAB vào **Production track** (hoặc Internal testing trước)

### 9.4 Store listing
- [ ] **Feature graphic** 1024×500 PNG/JPEG (≤15MB)
- [ ] **4–8 screenshots** tỷ lệ 8:5 (PNG/JPEG, ≤8MB mỗi ảnh)
- [ ] Short description (≤80 ký tự) + Full description
- [ ] App icon (dùng `icon.png` đã tạo) + feature graphic
- [ ] **Privacy Policy URL** hoạt động (không phải PDF) — bắt buộc vì app dùng ads SDK
- [ ] Khai báo category: Health & Fitness / Lifestyle

### 9.5 Compliance bắt buộc
- [ ] **Data safety form** (Play Console → App content → Data safety): khai báo ad SDK thu thập device ID, analytics, v.v.
- [ ] **Content rating** — hoàn thành bảng hỏi IARC (app không có nội dung nhạy cảm → rate thấp, ~Everyone)
- [ ] **Target API level:** từ **31/08/2026** tất cả app mới/update phải target **Android 16 (API 36)**. ✅ Đã nâng `targetSdkVersion: 36` + `compileSdkVersion: 36` trong `app.json` (`expo-build-properties`) — xác nhận build OK trên EAS
- [ ] **App access:** khai báo app không yêu cầu login
- [ ] **Ads declaration:** khai báo có chứa ads (bắt buộc)
- [ ] **Government apps:** không áp dụng

### 9.6 Sau khi đăng
- [ ] Review: thường 1–7 ngày làm việc
- [ ] Sau khi live → link store URL vào AdMob + tạo `app-ads.txt`

---

## 10. Phát hành App Store — checklist

### 10.1 Tài khoản
- [ ] https://developer.apple.com → **Apple Developer Program** (**$99/năm**)
- [ ] Hoàn tất hợp đồng Paid Apps (tax/banking) trong **App Store Connect**

### 10.2 Build production IPA
```bash
npx eas build --platform ios --profile production
```
- [ ] Cần Xcode/macOS cho build, hoặc EAS cloud (vẫn cần Apple Developer account + đăng nhập EAS)
- [ ] Certificates/provisioning: EAS tự quản lý qua `eas credentials` — đăng ký bundle ID `com.looptimer.app`
- [ ] Version: kiểm tra `ios.buildNumber` trong app.json (tăng mỗi build)

### 10.3 App Store Connect
- [ ] **My Apps → + → New App** → tên "LoopTimer", primary language, bundle ID
- [ ] Upload build: `eas submit --platform ios` (hoặc Transporter)
- [ ] Chọn build cho version → điền metadata

### 10.4 Store listing
- [ ] **Screenshots:** tối thiểu cho iPhone 6.9" và 6.7" (tối đa 10/platform). Nên chụp từ app thật (Timer, Home, Templates, Settings, Stats)
- [ ] App preview video (optional, ≤30s, muted)
- [ ] Description, keywords, support URL
- [ ] **Age rating questionnaire** (4+ — không có nội dung nhạy cảm; ad nội dung do Google kiểm soát, khai báo trung thực)

### 10.5 App Privacy (nutrition labels)
- [ ] App Privacy → khai báo:
  - **Identifiers / Device ID** — thu thập, dùng cho Third-Party Advertising (Google AdMob)
  - **Analytics** — Firebase Analytics (Usage Data)
  - **Diagnostics** — Crashlytics (Crash Data)
- [ ] **Tracking:** khai báo app track user (ATT + IDFA) → đúng vì dùng AdMob
- [ ] Khai báo phải **khớp với code**: app đã có `NSUserTrackingUsageDescription` + `expo-tracking-transparency`

### 10.6 Export compliance
- [ ] Bảng hỏi encryption: app chỉ dùng HTTPS/TLS chuẩn → chọn **"exempt"** (Category 5 Part 2)
- [ ] Để chắc chắn tránh delay: thêm vào `app.json` → `ios.infoPlist`:
  ```json
  "ITSAppUsesNonExemptEncryption": false
  ```

### 10.7 TestFlight (trước khi submit)
- [ ] **Internal testing:** thêm tối đa 100 thành viên team — test ngay không cần review
- [ ] **External testing:** build đầu tiên cần qua Beta App Review, sau đó dùng Public Link
- [ ] Test ATT, ads, timer, widget trên nhiều model

### 10.8 Submit
- [ ] **Submit for Review** → chờ 24h–72h (thường 1–2 ngày)
- [ ] Trả lời nhanh nếu Apple hỏi về quyền truy cập notification/widget (có sẵn reason string)

---

## 11. Việc con người cần làm — tổng hợp

> Mọi thứ dưới đây đều **không thể tự động hoá** — cần tài khoản, giấy tờ, tiền, thiết bị thật.

### 🔴 Bắt buộc trước khi build
- [ ] **1.** ✅ Đã xong: `expo-dev-client` + `expo-build-properties` đã trong package.json
- [ ] **2.** ✅ Android đã xong (App ID thật trong `app.json`); iOS còn chờ tạo app AdMob riêng (mục 4.2)
- [ ] **3.** ✅ Android đã dán banner/interstitial/rewarded vào `ads-config.ts`; iOS còn lại (mục 4.3)
- [ ] **4.** Firebase files đã có ở root — xác nhận đúng project `looptimer` + plugin trong app.json (mục 5.1)
- [ ] **5.** Push **9** Remote Config keys (mục 5.2)
- [ ] **6.** Thay Privacy Policy + Store URL placeholder trong `settings.tsx` (Gap 3)
- [ ] **7.** UMP code đã xong — chỉ cần tạo message trên AdMob Privacy & messaging nếu phục vụ EU (mục 6)
- [ ] **7b.** ✅ Đã xong: `targetSdkVersion: 36` + `compileSdkVersion: 36` trong `app.json` (deadline Play 31/08/2026)

### 🟠 Trước khi lên store
- [ ] **8.** Đăng ký Google Play developer ($25) + Apple Developer ($99/năm)
- [ ] **9.** Chụp screenshots (4–8 Android, tối thiểu 2 size iPhone)
- [ ] **10.** Tạo feature graphic 1024×500 (Android)
- [ ] **11.** Viết Privacy Policy thật (host URL, không PDF) — mô tả Google Mobile Ads SDK + Firebase
- [ ] **12.** Viết description + keywords (12 ngôn ngữ app đã có sẵn → listing có thể theo ngôn ngữ chính)

### 🟡 Sau khi live
- [ ] **13.** Link store URL vào AdMob + tạo `app-ads.txt`
- [ ] **14.** Kiểm tra AdMob dashboard: impressions, eCPM, fill rate
- [ ] **15.** Cấu hình doanh thu: tax info (W-8BEN), PIN xác minh địa chỉ
- [ ] **16.** Theo dõi Firebase: crash-free rate, missed_transition_rate < 0.15

---

## 12. Troubleshooting

| Vấn đề | Nguyên nhân / Cách xử lý |
|---|---|
| Không thấy banner trên Home | Đang chạy **web** (web luôn no-op) hoặc **Expo Go** (native SDK không có). Phải chạy dev build (`expo run:android`) |
| Ad không hiện, không crash | Đúng hành vi spec: load fail → skip. Kiểm tra mạng, unit ID, hoặc xem log `ad_shown shown:false` |
| "Test Ad" watermark (Android) | Đang chạy build cũ hoặc Expo Go — build lại với real IDs. Nếu vẫn hiện: kiểm tra `REAL_UNIT_IDS` (không phải lỗi app) |
| "Test Ad" watermark (iOS) | Đúng — iOS chưa dán real IDs, đang fallback test IDs. Không phải lỗi |
| `Unauthorized request` trên web preview | Lỗi CORS của proxy Cloud Shell, không phải lỗi app |
| Firebase init lỗi khi build | Chưa có `google-services.json`/`GoogleService-Info.plist` hoặc chưa thêm config plugin |
| Build iOS fail trên Linux | Không build iOS được ngoài macOS. Dùng EAS cloud build + `eas submit` |
| Interstitial không hiện lần 2 | Cooldown 240s + max 1/phiên (theo Remote Config) — đúng thiết kế |
| App bị Google từ chối vì ads | Thiếu Privacy Policy URL, Data safety form sai, hoặc click ads của chính mình khi test |

---

## Khi nào xong việc?

Khi bạn đã: **(1)** dán ID thật + có Firebase files, **(2)** build được dev build thấy Test Ad trên máy, **(3)** có 2 tài khoản store + listing + compliance, **(4)** `eas build` ra `.aab` + `.ipa` — lúc đó nhờ mình verify lại toàn bộ (tsc + jest + export) trước khi submit.
