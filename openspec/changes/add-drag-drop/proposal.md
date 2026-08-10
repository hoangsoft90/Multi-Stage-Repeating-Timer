# Proposal: add-drag-drop — Sắp xếp stage bằng kéo-thả

## Vấn đề

Tạo preset nhiều stage (vd Tabata 8 vòng, circuit 12 động tác) rất khó chịu khi muốn đổi thứ tự — hiện phải xóa rồi thêm lại. Tần suất sử dụng cao, chi phí thấp.

## Giải pháp

- **Drag & drop stage** trong Editor: long-press → kéo để đổi vị trí. Dùng `react-native-draggable-flatlist` (đã có reanimated/gesture-handler trong stack — verify version tương thích SDK 57) hoặc cơ chế reorder đơn giản hơn nếu lib không tương thích.
- **Invariant bắt buộc**: swap chỉ đổi thứ tự — **KHÔNG tạo ID mới** (Stage.id map `soundId` custom sound — tạo ID mới làm gãy mapping).
- **Template immutability**: mở template gốc (built-in) trong Editor rồi Save → **luôn tạo preset mới** "Save as new" với tên gợi ý `[Tên template] (edited)`, không bao giờ ghi đè template gốc. Xác định qua id cố định template (đã có `BUILTIN_TEMPLATES` + `isTemplate` helper trong Home).

## Non-goals

- Không làm drag ngoài Editor (vd trên Home).
- Không đổi model Stage (chỉ reorder).
