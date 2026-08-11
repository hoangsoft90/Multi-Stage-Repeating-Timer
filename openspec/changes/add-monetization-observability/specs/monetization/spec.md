## Purpose

Capability `monetization` định nghĩa vị trí và điều kiện hiển thị quảng cáo AdMob: App Open, Interstitial sau Stop/hoàn thành, Native trên Home, Rewarded unlock tạm thời — với cooldown + frequency cap qua Remote Config, và quy tắc bất khả xâm phạm: KHÔNG có ad trên Timer Running và không show ad khi chuyển stage.

## ADDED Requirements

### Requirement: Bảng placement ad (đóng băng)
Hệ thống SHALL hiển thị ad đúng 4 placement:
- **App Open**: cold/warm start, chỉ khi `!hasActiveSession` và cooldown đã qua. ⚠️ Hiện đang **TẮT mặc định** (`PLACEMENT_ENABLED.appOpen = false` — quyết định product, ghi rõ trong `ads-config.ts`); bật lại bằng cách flip cờ này.
- **Interstitial Post-Stop/Completed**: sau Stop thủ công hoặc session tự kết thúc, cooldown 240s giữa 2 lần, tối đa 1 lần mỗi phiên.
- **Native/Banner Home**: mỗi lần mở Home.
- **Rewarded**: user chủ động bấm unlock (tạm thời 24h custom sound).
- **Timer Running**: KHÔNG có bất kỳ ad nào.

#### Scenario: App Open khi không có session
- **WHEN** app cold/warm start và không có session active và cooldown app_open đã qua
- **THEN** hệ thống hiển thị App Open Ad

#### Scenario: App Open khi có session active
- **WHEN** app cold/warm start nhưng có session active (vd user đang chạy timer)
- **THEN** KHÔNG hiển thị App Open Ad

#### Scenario: Interstitial sau Stop
- **WHEN** user stop timer thủ công và cooldown interstitial (240s) đã qua và chưa show ad trong phiên này
- **THEN** hệ thống hiển thị interstitial

#### Scenario: Interstitial bị cap mỗi phiên
- **WHEN** user stop timer lần 2 trong cùng phiên (đã show 1 interstitial)
- **THEN** KHÔNG hiển thị interstitial thêm (max 1/phiên)

#### Scenario: Không có ad khi chuyển stage
- **WHEN** timer chuyển stage (StageStarted/StageCompleted)
- **THEN** KHÔNG có interstitial/app-open/native nào xuất hiện

### Requirement: AdManager eligibility
AdManager SHALL quyết định eligibility qua: `canShowAppOpen() = isColdStartOrWarmResume && !hasActiveSession && cooldownPassed`; `canShowInterstitial() = !sessionRunning && cooldownPassed && frequencyCapOk`; `canShowRewarded() = luôn (user chủ động)`. Mọi ngưỡng (cooldown, max-per-session) SHALL đọc từ Remote Config, không hard-code.

#### Scenario: Eligibility phụ thuộc trạng thái session
- **WHEN** session đang RUNNING và có sự kiện trigger ad
- **THEN** mọi placement (trừ Rewarded do user chủ động) bị chặn

### Requirement: Ad load fail / no internet
Khi ad load fail hoặc không có internet, hệ thống SHALL bỏ qua hiển thị ad (skip) mà không crash, không block flow chính của app, và ghi analytics `ad_shown=false` với lý do fail.

#### Scenario: Load ad thất bại
- **WHEN** interstitial load fail do không có internet
- **THEN** app bỏ qua ad, user tiếp tục flow bình thường, không crash

### Requirement: Rewarded unlock tạm thời (24h)
Hệ thống SHALL cho phép user xem Rewarded ad để unlock tạm thời custom sound trong thời hạn theo Remote Config `custom_sound_unlock_hours` (mặc định 24). Unlock SHALL áp dụng cho toàn app, hết hạn tự động theo thời gian thực (không phụ thuộc phiên), và không unlock vĩnh viễn tính năng core.

#### Scenario: Xem Rewarded thành công
- **WHEN** user xem xong Rewarded ad
- **THEN** custom sound được unlock trong 24 giờ kể từ lúc xem

#### Scenario: Hết hạn unlock
- **WHEN** đã qua 24 giờ kể từ lúc unlock
- **THEN** custom sound trở về khóa, user phải xem Rewarded lần nữa

### Requirement: Không quảng cáo làm phiền timer
Quảng cáo SHALL không bao giờ xuất hiện giữa stage, không hiện khi user mở app để xem timer đang chạy, và không chặn flow Start/Stop/Resume.

#### Scenario: Mở app để xem timer
- **WHEN** user mở app để xem timer đang chạy (có session active)
- **THEN** không có ad nào hiển thị trên màn Timer Running
