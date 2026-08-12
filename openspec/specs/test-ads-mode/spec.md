# test-ads-mode Specification

## Purpose
Capability `test-ads-mode` cung cấp chế độ test ads qua một flag config: khi bật, mọi quảng cáo dùng Google **test unit ID** (hiển thị watermark "Test Ad", không sinh revenue, không đụng giới hạn/chính sách AdMob của app id thật) — phù hợp giai đoạn phát triển.
## Requirements
### Requirement: Flag TEST_ADS trong config

Hệ thống SHALL có flag `TEST_ADS` (boolean) trong config ads (`ads-config.ts`). Khi `TEST_ADS = true`, `resolveUnitId()` SHALL trả về Google test unit ID cho MỌI placement (banner/interstitial/appOpen/rewarded) trên MỌI platform — bỏ qua real unit ID đã cấu hình. Khi `false`, dùng real unit ID nếu có (fallback test id khi chưa cấu hình — hành vi cũ).

#### Scenario: Bật test ads
- **WHEN** `TEST_ADS = true` và user mở app
- **THEN** mọi ad request dùng Google test unit ID (quảng cáo test hiển thị, không revenue)

#### Scenario: Tắt test ads
- **WHEN** `TEST_ADS = false` và real unit ID đã cấu hình
- **THEN** ad request dùng real unit ID (hành vi cũ)

### Requirement: Không đổi cấu trúc real IDs

Dữ liệu `REAL_UNIT_IDS` SHALL được giữ nguyên hợp lệ (định dạng `ca-app-pub-*`) — khi chuyển sang live chỉ cần đổi flag, không cần sửa code khác.

#### Scenario: Chuyển live
- **WHEN** sẵn sàng chạy ads thật
- **THEN** chỉ cần đặt `TEST_ADS = false` và rebuild (real IDs đã có sẵn)

