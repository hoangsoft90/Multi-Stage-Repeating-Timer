# Proposal: add-smart-routine-v2 — Gợi ý routine theo ngày trong tuần

## Vấn đề

v1.2 `suggestPresetForNow` gợi ý preset theo **khung giờ chung** (7 ngày gần nhất, 4 bucket: sáng/chiều/tối/đêm). User có thói quen khác nhau theo ngày trong tuần (HIIT vào Thứ 3/5/7, Deep Work vào Thứ 2/4) → app không gợi ý đúng ngày, giảm độ chính xác của "Routine hôm nay".

## Giải pháp

1. **`suggestPresetForDayOfWeek(entries, presetIds, now, weeks=4)`** — phân tích 4 tuần gần nhất, cùng `weekDay` (theo local time), cùng khung giờ (hourBucket). Count → best preset (tie-break lastUsedAt). Null khi không đủ tín hiệu (ít nhất 1 session trong 4 tuần cùng thứ).
2. **Home card "Routine hôm nay" v2**: ưu tiên kết quả từ weekday model; nếu null → fallback model khung giờ cũ (không mất tính năng). Card hiển thị thêm lý do nếu có (ví dụ "Thường tập Thứ 3").
3. **Thuần + test deterministic** — không cần data model mới, không i18n nặng (dùng lại dayOfWeek keys đã có).

## Non-goals

- Không thay đổi data model SessionLogEntry.
- Không thay đổi streak logic.
- Không thay đổi UI Routine hôm nay ngoài subtitle ngày (nếu có).