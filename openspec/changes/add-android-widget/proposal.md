# Proposal: add-android-widget — Android home-screen widget

## Vấn đề

JS foundation widget (v1.2, `add-home-widget`): `WidgetBridge.updateTimerSnapshot` ghi snapshot vào AsyncStorage `looptimer:widget-snapshot`, nhưng chưa có widget THẬT trên Android — user phải mở app để xem timer đang chạy / bắt đầu routine. `expo-widgets` (official, SDK 57) **chỉ hỗ trợ iOS** — Android phải dùng community library.

## Giải pháp

1. **`@saleksovski/react-native-android-widget`** — thư viện chính thức trong cộng đồng cho Android App Widgets render từ React component (RemoteViews), hoạt động với Expo dev build.
2. **Re-plumb `WidgetBridge` (Android)**: thay vì chỉ ghi AsyncStorage, native impl còn gọi `updateWidget(snapshotData)` → widget re-render ngay khi có transition (đã có sẵn từ timer-store `syncWidgets`).
3. **1 widget medium** hiển thị: tên stage + countdown + round; khi idle → trạng thái rỗng ("Mở LoopTimer"). Tap widget → mở app đúng màn (deep-link `looptimer:///?start=<presetId>` khi có preset — Home đã xử lý quick start từ v1.2).

## Non-goals

- Không làm widget Android realtime tick mỗi giây (giới hạn nền tảng: `updatePeriodMillis` tối thiểu 30 phút) — countdown hiển thị giá trị tại lần update gần nhất (transition + định kỳ).
- Không làm iOS widget/Live Activity ở change này (tách riêng `add-live-activity`).
- Không làm multi-widget hay widget editor trong app.

## Quan hệ với change cũ

Thay thế task 4.1 của `add-home-widget` (Android widget native) — khi archive `add-home-widget`, reference change này.
