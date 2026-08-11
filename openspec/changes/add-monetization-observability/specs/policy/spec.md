## Purpose

Capability `policy` định nghĩa các yêu cầu tuân thủ store/quảng cáo từ Day 1: Privacy Policy URL + consent (Google UMP), luồng ATT (App Tracking Transparency) đúng thời điểm sau value-moment đầu tiên, fallback non-personalized ads khi user deny/từ chối, và cấu hình SDK Google Mobile Ads đúng chuẩn.

## ADDED Requirements

### Requirement: Privacy Policy + link in-app (Day 1)
Hệ thống SHALL có Privacy Policy URL hoạt động, link trong Settings (mục Privacy Policy), và nội dung mô tả việc sử dụng Google Mobile Ads SDK + khả năng tracking khi được cho phép. Privacy Policy SHALL tồn tại trước khi submit store.

#### Scenario: User mở Privacy Policy
- **WHEN** user chạm mục Privacy Policy trong Settings
- **THEN** app mở URL Privacy Policy hợp lệ, không lỗi 404

### Requirement: ATT xin sau value-moment đầu tiên
Trên iOS, hệ thống SHALL xin ATT gắn với value-moment đầu tiên: `requestTrackingPermissionsAsync()` được gọi trong `startPreset` (start timer đầu tiên thành công = value-moment; các lần start sau vẫn gọi nhưng vô hại vì iOS chỉ prompt một lần). KHÔNG xin ngay lúc cold-start đầu tiên. Sau khi user trả lời, hệ thống SHALL ghi event `att_prompt_shown` vào analytics (chưa log trạng thái chi tiết `att_status` — defer).

#### Scenario: Xin ATT đúng thời điểm
- **WHEN** user vừa start timer đầu tiên thành công (value-moment)
- **THEN** hệ thống gọi requestTrackingPermissionsAsync → hiện prompt ATT (nếu chưa xin trước đó)

#### Scenario: Không xin ATT lúc cold start đầu
- **WHEN** app cold-start lần đầu tiên (chưa start timer nào)
- **THEN** hệ thống KHÔNG hiện prompt ATT

### Requirement: Non-personalized ads fallback khi Denied/Restricted
Khi user Denied/Restricted ATT (hoặc từ chối personalized ads trong UMP consent), hệ thống SHALL yêu cầu Google Mobile Ads dùng **non-personalized ads** (`requestNonPersonalizedAdsOnly: true` trên từng ad request — interstitial/app-open/rewarded qua `createForAdRequest(unitId, { requestNonPersonalizedAdsOnly })`, banner qua `requestOptions`), ads vẫn serve bình thường (chỉ giảm eCPM) — KHÔNG được để ads fail hoàn toàn. Quyết định NPA qua helper thuần `resolveNonPersonalized` (`src/features/monetization/consent.ts`): consent jurisdiction (UMP obtained) → theo user choice; ngoài jurisdiction → theo ATT status.

#### Scenario: ATT Denied
- **WHEN** user deny ATT và app không thuộc khu vực yêu cầu consent
- **THEN** ads vẫn được phục vụ dạng non-personalized, không lỗi show ad

### Requirement: Cấu hình SDK Google Mobile Ads
Hệ thống SHALL khai App ID Google Mobile Ads trong AndroidManifest và Info.plist, khởi tạo SDK Mobile Ads trước khi load ad, và đảm bảo test ad unit dùng đúng cho dev (không dùng production ad unit khi test).

#### Scenario: Khởi tạo SDK trước khi load
- **WHEN** app khởi động
- **THEN** Mobile Ads SDK được khởi tạo trước khi bất kỳ ad nào được load

### Requirement: Consent / UMP
Hệ thống SHALL xử lý consent theo yêu cầu GDPR/CCPA qua **Google UMP** (module `AdsConsent` sẵn có trong react-native-google-mobile-ads — không cần dependency riêng): `gatherConsent()` chạy ở bootstrap (request info + hiện consent form khi cần, no-op web/Expo Go), `canRequestAds()` gate trước mỗi lần show ad, `showPrivacyOptionsForm()` từ Settings (row "Privacy options"). Khi user không đồng ý personalized, hệ thống SHALL fallback non-personalized ads (`resolveNonPersonalized`) và không hiển thị ad vi phạm.

#### Scenario: User không đồng ý consent
- **WHEN** user không đồng ý personalized ads trong UMP form ở khu vực yêu cầu
- **THEN** hệ thống fallback non-personalized ads và không hiển thị ad vi phạm
