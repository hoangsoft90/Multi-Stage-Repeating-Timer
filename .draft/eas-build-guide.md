# LoopTimer — Hướng dẫn EAS Build

> **Cập nhật:** 2026-08-10 · Expo SDK 57 · React Native 0.86 · EAS CLI ≥ 21.0.0
> **Trạng thái:** Code hoàn thành, app.json và eas.json đã cấu hình sẵn. Cần Firebase files + credentials thật để build.

---

## Mục lục

1. [EAS Build là gì?](#1-eas-build-là-gì)
2. [Cài đặt & đăng nhập](#2-cài-đặt--đăng-nhập)
3. [Cấu trúc `eas.json` hiện tại](#3-cấu-trúc-easjson-hiện-tại)
4. [App version — `appVersionSource: remote`](#4-app-version--appversionsource-remote)
5. [Credentials (quản lý chứng chỉ)](#5-credentials-quản-lý-chứng-chỉ)
6. [Build cho từng môi trường](#6-build-cho-từng-môi-trường)
   - [6.1 Development build](#61-development-build)
   - [6.2 Preview build](#62-preview-build)
   - [6.3 Production build](#63-production-build)
   - [6.4 Build cả 2 nền tảng](#64-build-cả-2-nền-tảng)
7. [Yêu cầu riêng cho dự án](#7-yêu-cầu-riêng-cho-dự-án)
   - [7.1 Firebase config files](#71-firebase-config-files)
   - [7.2 iOS: useFrameworks dynamic](#72-ios-useframeworks-dynamic)
   - [7.3 Widget & App Group entitlements](#73-widget--app-group-entitlements)
   - [7.4 AdMob App ID](#74-admob-app-id)
8. [Local build (`--local`)](#8-local-build---local)
9. [Submit lên store (`eas submit`)](#9-submit-lên-store-eas-submit)
10. [Quản lý version sau khi build](#10-quản-lý-version-sau-khi-build)
11. [Quản lý nhiều channel / branch](#11-quản-lý-nhiều-channel--branch)
12. [Troubleshooting](#12-troubleshooting)
13. [Checklist trước khi build production](#13-checklist-trước-khi-build-production)

---

## 1. EAS Build là gì?

**EAS Build** (Expo Application Services — Build) là dịch vụ build đám mây của Expo. Thay vì cài đầy đủ Android Studio / Xcode trên máy, bạn gửi code lên server Expo, họ build native app (APK/AAB/IPA) và trả về file cài đặt.

**Lợi ích:**
- Không cần cài JDK, Android SDK, NDK, Xcode (chỉ cần Node.js)
- Build iOS ngay cả trên Windows/Linux (Expo server dùng macOS)
- Tự động quản lý keystore, certificate, provisioning profile
- Tích hợp sẵn với store submission (`eas submit`)
- Hỗ trợ `appVersionSource: remote` — quản lý version số tập trung

**Chi phí:** EAS là dịch vụ trả phí, có free tier với quota giới hạn (thường đủ cho dev). Xem [expo.dev/pricing](https://expo.dev/pricing).

---

## 2. Cài đặt & đăng nhập

### 2.1 Cài EAS CLI

```bash
npm install -g eas-cli
# hoặc dùng npx để chạy trực tiếp
npx eas-cli@latest --version
```

Kiểm tra phiên bản — dự án yêu cầu **≥ 21.0.0** (theo `eas.json` → `cli.version`).

### 2.2 Đăng nhập Expo

```bash
eas login
```

Nhập email + password tài khoản Expo. Nếu chưa có: https://expo.dev/signup.

Kiểm tra đã login:

```bash
eas whoami
```

### 2.3 Init project (chạy 1 lần đầu)

```bash
eas init
```

Lệnh này tạo liên kết giữa project local và EAS, đồng thời sinh file `eas.json` nếu chưa có. Dự án đã có sẵn `eas.json` — vẫn chạy để đảm bảo liên kết.

### 2.4 Cấu hình app.json — kiểm tra app info

Dự án đã cấu hình:

| Thông số | Giá trị |
|---|---|
| Android package | `com.looptimer.app` |
| iOS bundle ID | `com.looptimer.app` |
| App name | LoopTimer |
| Scheme | `looptimer` |

---

## 3. Cấu trúc `eas.json` hiện tại

```json
{
  "cli": {
    "version": ">= 21.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "distribution": "store"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Giải thích các profile

| Profile | Mục đích | `developmentClient` | `distribution` | `autoIncrement` |
|---|---|---|---|---|
| `development` | Chạy dev với hot-reload, debug, test native modules | `true` | `internal` (QR/download link) | — |
| `preview` | Gửi cho tester nội bộ (TestFlight/internal track) | `false` | `internal` (QR/download link) | — |
| `production` | Build chính thức gửi store | `false` | `store` (AAB/IPA) | `true` |

**Chi tiết các field:**

- **`developmentClient: true`** — Build ra **dev client** (chứa expo-dev-client). Kết quả là app có thể chạy JavaScript bundle từ expo start. Dùng để test native modules khi dev.

- **`developmentClient: false`** — Build ra **standalone app** (app độc lập, không cần expo start). Dùng để gửi cho tester hoặc lên store.

- **`distribution: "internal"`** — Build được tải lên EAS, bạn nhận link QR/download để cài tay. Apple không kiểm duyệt. Với iOS, internal distribution cần thiết bị đã đăng ký UDID trong Apple Developer.

- **`distribution: "store"`** — Build được sign bằng distribution certificate (iOS) hoặc upload key (Android), sẵn sàng để submit lên App Store / Play Store.

- **`autoIncrement: true`** — Mỗi lần build, EAS tự động tăng version code/build number. Yêu cầu `appVersionSource: "remote"`.

---

## 4. App version — `appVersionSource: remote`

Cài đặt này (*quan trọng — dễ sai*) cho phép EAS quản lý version số tập trung trên server, thay vì phải sửa `app.json` thủ công mỗi lần release.

**Cách hoạt động:**

| Field | Android (versionCode) | iOS (buildNumber) |
|---|---|---|
| Mục đích | Số nguyên tăng dần, không trùng | String tăng dần (thường là số) |
| `autoIncrement` | `versionCode + 1` | `buildNumber + 1` |
| Version hiển thị | `app.json → version` (vd: `1.0.0`) | `app.json → version` |

> **Không sửa `versionCode`/`buildNumber` trong `app.json`** nữa — EAS sẽ ghi đè bằng giá trị remote.

### Lệnh quản lý version

```bash
# Xem version hiện tại
eas build:version:get

# Set version cụ thể (làm nếu cần reset)
eas build:version:set -p android --version-code 10
eas build:version:set -p ios --build-number 10

# Xem lịch sử build
eas build:list
```

### Khi nào cần set manual?

- **Lần đầu build production:** EAS khởi tạo `versionCode=1, buildNumber=1` tự động
- **Reset sau khi test:** nếu đã test internal nhiều lần (code=7,8,9…) và muốn production bắt đầu từ 1 → set manual
- **Sync với version display:** nếu bạn bump `version` trong `app.json` lên `1.1.0`, có thể muốn reset counter

---

## 5. Credentials (quản lý chứng chỉ)

> **Credentials = keystore (Android) + distribution certificate + provisioning profile (iOS)**.\
> Đây là bước dễ gây nhầm lẫn nhất — nhưng EAS tự động quản lý giúp bạn.

### 5.1 Android — Keystore

Keystore dùng để sign APK/AAB. EAS sẽ tự sinh keystore lần đầu bạn build production Android.

```bash
eas credentials
```

**Các lựa chọn:** "Manage Android credentials"

**Điểm quan trọng:** ⚠️ **Sao lưu keystore ngay lập tức.** Nếu mất keystore:
- App trên store **không thể cập nhật** (vì chữ ký khác)
- Phải tạo app mới trên Play Console → mất rating, download, v.v.

**Để tải keystore về:**

```bash
eas credentials
# → Android → Manage → Download keystore
```

Lưu file `.jks` + mật khẩu vào nơi an toàn (1Password, Bitwarden, hoặc sealed file trên cloud).

### 5.2 iOS — Certificate & Provisioning

EAS tự động quản lý Apple credentials nếu bạn đã login vào Apple Developer Account.

**Lần đầu build iOS production:**

```bash
eas build --platform ios --profile production
```

Lệnh này sẽ:
1. Kiểm tra Apple Developer membership
2. Tự động register bundle ID `com.looptimer.app`
3. Tạo distribution certificate + provisioning profile
4. Sign và build IPA

**Để quản lý thủ công:**

```bash
eas credentials
# → iOS → Manage
```

**Những gì EAS quản lý tự động:**
| Item | Tự động | Ghi chú |
|---|---|---|
| Bundle ID register | ✅ | `com.looptimer.app` |
| Distribution certificate | ✅ | Có hiệu lực 1 năm, tự renew |
| Provisioning profile | ✅ | Tự động tạo mới mỗi build |
| Push notification key | ❌ | Phải tự tạo trên Apple Developer |

> **Entitlements:** Vì app dùng `expo-widgets` + app group, cần đảm bảo entitlements được khai báo. Xem mục 7.3.

---

## 6. Build cho từng môi trường

### 6.1 Development build

Dùng để test native modules trên máy thật: Firebase, AdMob, notifications, widgets.

```bash
# Build Android dev client
eas build --platform android --profile development

# Build iOS dev client (cần Apple Developer account)
eas build --platform ios --profile development
```

**Output:** file `.apk` (Android) / `.ipa` (iOS) + QR code + download link.

**Sau khi build xong:**

```bash
# Chạy dev server
npx expo start --dev-client
# Trên máy: mở app → quét QR hoặc nhập URL từ terminal
```

**Khác biệt với `expo run:android/ios`:**

| | `expo run:android` | `eas build --profile development` |
|---|---|---|
| Nơi build | Máy local | Cloud EAS |
| Cần cài native toolchain | ✅ Cần Android Studio / Xcode | ❌ Chỉ cần Node.js |
| Tốc độ lần đầu | 5–15 phút | 10–20 phút (tải dependencies) |
| Hot reload | ✅ | ✅ |
| Debug native | ✅ (logcat/Xcode) | Khó hơn (log từ xa) |
| Phù hợp | Dev có sẵn toolchain, muốn debug sâu | Dev không có toolchain, cần build nhanh |

> **Khuyên dùng:** Nếu bạn có Android Studio + Xcode, `expo run:android/ios` nhanh hơn. EAS build cho development chủ yếu khi không có máy Mac (build iOS từ xa) hoặc muốn share dev build cho tester.

### 6.2 Preview build

Dùng để gửi cho QA/tester nội bộ mà không cần store. Giống development nhưng **không có expo-dev-client** (app độc lập).

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

**Dùng cho:**
- Test ads, Firebase, timer trên thiết bị thật
- Gửi build cho bạn bè/QA test
- TestFlight internal test (iOS)

### 6.3 Production build

Build chính thức để submit lên store.

```bash
# Android AAB (App Bundle)
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production
```

**Kết quả:**
- Android: file `.aab` — upload lên Google Play Console (bắt buộc từ 2021, không dùng APK)
- iOS: file `.ipa` — upload lên App Store Connect

> **Lưu ý:** `autoIncrement: true` ở profile production → mỗi lần build, `versionCode` (Android) và `buildNumber` (iOS) tự tăng 1.

### 6.4 Build cả 2 nền tảng

```bash
# Build cả 2 cùng lúc
eas build --profile production

# Build + submit (submit tự động sau khi build)
eas build --profile production --auto-submit

# Build + submit với platform cụ thể
eas build --platform android --profile production --auto-submit
```

---

## 7. Yêu cầu riêng cho dự án

Dự án LoopTimer có các yêu cầu đặc thù cần xử lý **trước khi build**.

### 7.1 Firebase config files

Dự án dùng `@react-native-firebase/*` (analytics, crashlytics, remote-config). Plugin trong `app.json` trỏ đến 2 file config:

```json
[
  "@react-native-firebase/app",
  {
    "androidGoogleServicesFile": "./google-services.json",
    "iosGoogleServicesFile": "./GoogleService-Info.plist"
  }
]
```

> **⚠️ Nếu 2 file này chưa tồn tại, build sẽ fail.** Đây là lỗi phổ biến nhất.

**Cách lấy file:**
1. Vào [Firebase Console](https://console.firebase.google.com)
2. Chọn project `looptimer` (hoặc tạo mới)
3. **Add app → Android** → package `com.looptimer.app` → tải `google-services.json`
4. **Add app → iOS** → bundle `com.looptimer.app` → tải `GoogleService-Info.plist`
5. Đặt 2 file vào **thư mục root của project** (cạnh `app.json`)

**Kiểm tra:**

```bash
ls -la google-services.json GoogleService-Info.plist
# → phải thấy 2 file
```

### 7.2 iOS: useFrameworks dynamic

Firebase iOS SDK yêu cầu `useFrameworks: "dynamic"` (dùng SPM thay vì CocoaPods static). Đã cấu hình trong `app.json`:

```json
[
  "expo-build-properties",
  {
    "ios": {
      "useFrameworks": "dynamic"
    }
  }
]
```

Không cần làm thêm — chỉ cần biết để nếu build iOS fail với lỗi liên quan đến Firebase modules, kiểm tra plugin này vẫn còn trong `app.json`.

### 7.3 Widget & App Group entitlements

`expo-widgets` yêu cầu **app group** để iOS widget có thể đọc dữ liệu timer từ app chính.

Cấu hình trong `app.json` hiện tại:

```json
[
  "expo-widgets",
  {
    "bundleIdentifier": "com.looptimer.app.ExpoWidgetsTarget",
    "groupIdentifier": "group.com.looptimer.app",
    ...
  }
]
```

**Trên EAS build:**
- Lần đầu build, EAS sẽ tạo **app group** trên Apple Developer Portal
- Cần có **Apple Developer account active** (không chỉ free account)
- Nếu build iOS fail với lỗi entitlements → `eas credentials` → kiểm tra iOS entitlements

**Trên Android:** không cần entitlements đặc biệt cho widget.

### 7.4 AdMob App ID

AdMob App ID đã được cấu hình trong `app.json`:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-3940256099942544~3347511713",
    "iosAppId": "ca-app-pub-3940256099942544~1458002511"
  }
]
```

> ID hiện tại là **test ID** của Google — an toàn khi build và test, nhưng **không sinh doanh thu**. Khi release, thay bằng ID thật từ AdMob dashboard.

---

## 8. Local build (`--local`)

Nếu không muốn dùng cloud EAS (ví dụ muốn build trên máy mình để debug nhanh hơn):

```bash
# Build Android local
eas build --platform android --profile production --local

# Build iOS local (cần Xcode trên macOS)
eas build --platform ios --profile production --local
```

**Output:** file build được lưu trong thư mục local (thường là `build-XXXX.aab` / `build-XXXX.ipa`).

**Khi nào dùng:**
- Không có internet mạnh
- Muốn kiểm tra native code trước khi build cloud
- Cần file build gấp mà EAS queue đông

**Yêu cầu:** local build cần Android Studio / Xcode cài trên máy.

---

## 9. Submit lên store (`eas submit`)

Sau khi build production thành công, submit lên store:

### 9.1 Android — Google Play

```bash
eas submit --platform android --profile production
```

**Cần chuẩn bị:**
- Google Play Developer account ($25, 1 lần)
- **Service Account JSON key** — tải từ Google Play Console:
  1. Play Console → Settings → API access → Create service account
  2. Tạo key JSON → tải về
  3. Đặt file `google-service-account.json` vào project root

Sau lần đầu, EAS nhớ credential. Lần sau chỉ cần:

```bash
eas submit -p android --profile production
```

### 9.2 iOS — App Store Connect

```bash
eas submit --platform ios --profile production
```

**Cần chuẩn bị:**
- Apple Developer Program ($99/năm)
- App Store Connect record (tạo app mới trên App Store Connect)
- Apple ID + app-specific password (cho 2FA)

**Lần đầu:** EAS sẽ hỏi Apple ID + mật khẩu app-specific. EAS tự động upload IPA lên App Store Connect.

### 9.3 TestFlight riêng

Để submit trực tiếp lên TestFlight mà không qua build:

```bash
# Build + submit luôn lên TestFlight
eas build --platform ios --profile production --auto-submit

# Hoặc upload file IPA có sẵn
eas submit --platform ios --profile production
# → chọn "I have a built IPA file"
```

---

## 10. Quản lý version sau khi build

Với `appVersionSource: "remote"`, EAS lưu version trên server.

```bash
# Xem version hiện tại
eas build:version:get

# Output:
#   android: versionCode = 1, version = 1.0.0
#   ios: buildNumber = 1, version = 1.0.0

# Set version thủ công (khi cần)
eas build:version:set --platform android --version-code 5
eas build:version:set --platform ios --build-number 5
```

**Khi nào cần set manual?**

| Tình huống | Làm gì |
|---|---|
| Lần đầu sản xuất | Không cần — EAS tự tạo version=1 |
| App đã lên store, fix bug | Không cần — `autoIncrement` tự tăng |
| Reset sau nhiều build test | `eas build:version:set -p android -c 1` |
| Sync với version name mới | `eas build:version:set -p android -c X` (X tương ứng) |

---

## 11. Quản lý nhiều channel / branch

Nếu có nhiều branch (dev/staging/production), EAS cho phép cấu hình channel riêng cho EAS Update (OTA updates).

### Cấu hình channel trong `eas.json`

Có thể thêm channel vào các profile:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "staging"
    },
    "production": {
      "autoIncrement": true,
      "distribution": "store",
      "channel": "production"
    }
  }
}
```

**Channel dùng để:**
- Phân biệt môi trường cho EAS Update
- Mỗi channel chỉ nhận update từ branch tương ứng
- `eas update --branch production` → push JS update tới channel production

> Hiện tại dự án chưa dùng EAS Update (chỉ build native). Nếu sau này thêm OTA updates, thêm `channel` field vào profiles.

---

## 12. Troubleshooting

### ❌ Build fail — "google-services.json not found"

**Nguyên nhân:** Plugin `@react-native-firebase/app` yêu cầu file config.

**Fix:** Đặt `google-services.json` + `GoogleService-Info.plist` cạnh `app.json`. Xem mục 7.1.

### ❌ Build iOS fail — "The operation couldn't be completed. Unable to find a team"

**Nguyên nhân:** EAS chưa có Apple Developer credentials.

**Fix:**
```bash
eas credentials
# → iOS → Add new Apple ID → đăng nhập
```

### ❌ Build iOS fail — "code signing entitlement 'com.apple.security.application-groups'"

**Nguyên nhân:** App group cho widget chưa được tạo trên Apple Developer.

**Fix:**
- Chạy `eas credentials` → iOS → Manage → Check entitlements
- Hoặc tự tạo: Apple Developer → Certificates, Identifiers & Profiles → App Groups → + `group.com.looptimer.app`

### ❌ Build iOS fail — "Provisioning profile doesn't include the com.apple.security.application-groups entitlement"

**Nguyên nhân:** Provisioning profile cũ chưa có app group.

**Fix:** EAS tự động tạo profile mới mỗi build — nếu vẫn lỗi, xoá profile cũ trên Apple Developer rồi build lại.

### ❌ Build iOS fail — "Multiple commands produce... useFrameworks"

**Nguyên nhân:** Thiếu `expo-build-properties` với `useFrameworks: dynamic`.

**Fix:** Kiểm tra `app.json` có plugin này chưa (mục 7.2). Nếu có rồi, thử: `npx expo prebuild --clean` trước khi build.

### ❌ "You are not authorized to perform this operation" — credentials

**Nguyên nhân:** Token EAS hết hạn.

**Fix:**
```bash
eas logout
eas login
```

### ❌ Build chậm / queue dài

**Nguyên nhân:** Tài khoản free tier bị giới hạn tài nguyên.

**Cách khắc phục:**
- Dùng `--local` để build trên máy mình
- Nâng cấp EAS plan lên paid để ưu tiên queue

### ❌ Android build thành công nhưng app crash ngay khi mở

**Nguyên nhân thường gặp:**
1. Firebase chưa init được (thiếu `google-services.json` ở runtime? → kiểm tra plugin đã đúng path)
2. `expo-dev-client` bị thiếu trong development profile
3. Conflict giữa các native module

**Cách debug:**
- Logcat: `adb logcat | grep -i error`
- Xem crash log trong Firebase Crashlytics
- Build lại với `--local` để có log đầy đủ

### ❌ iOS build — không cài được IPA internal

**Nguyên nhân:** Thiết bị chưa được register UDID.

**Fix:**
```bash
# Đăng ký UDID của thiết bị
eas device:create
# Sau đó build lại — profile mới sẽ bao gồm device này
```

---

## 13. Checklist trước khi build production

### 🔴 Bắt buộc

- [ ] **Firebase files:** `google-services.json` + `GoogleService-Info.plist` đặt cạnh `app.json`
- [ ] **AdMob ID thật** (đã thay test ID trong `app.json`)? Nếu chưa muốn thay ID thật, build preview/test vẫn dùng test ID an toàn.
- [ ] **Privacy Policy URL** thật (không `example.com`) trong `src/features/settings/settings-store.tsx`
- [ ] **Apple Developer account** active ($99/năm) — build iOS cần
- [ ] **Google Play Developer account** ($25, 1 lần) — submit Android cần
- [ ] **EAS login** — `eas whoami` trả về tên của bạn

### 🟠 Nên làm

- [ ] **Sao lưu keystore:** `eas credentials` → Android → Download keystore → lưu vào 1Password/Bitwarden
- [ ] **Push Remote Config keys** lên Firebase Console (8 keys — xem guide xuất bản)
- [ ] **Test dev build** trước — `eas build --profile development` để verify native modules hoạt động
- [ ] **Chạy typecheck + test** — `npm run typecheck && npm test`
- [ ] **Set app version** nếu cần reset: `eas build:version:set -p android -c 1` (nếu muốn production start từ 1)

### 🟢 Sau khi build

- [ ] **Download build artifact** (AAB/IPA) từ EAS dashboard hoặc link QR
- [ ] **Test production build trên máy thật:** banner, interstitial, rewarded, notifications, widget, timer
- [ ] **Submit lên store:** `eas submit -p android --profile production` / `eas submit -p ios --profile production`
- [ ] **Cập nhật store URL** vào AdMob sau khi app live

---

> **Xem thêm:** [`.draft/guide.md`](./guide.md) — hướng dẫn chi tiết xuất bản Google Play & App Store (store listing, compliance, AdMob setup).