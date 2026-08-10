# Design: add-smart-routine-v2

## Context

- `suggestPresetForNow(entries, presetIds, now, days=7)` hiện tại: 4 khung giờ × 7 ngày gần nhất, count preset → best (tie-break lastUsedAt). `hourBucket(hour)` map 0-23 → 4 bucket. Thuần + test 100%.
- Home: `index.tsx` component mount + focus → gọi `suggestPresetForNow` → card "Routine hôm nay" (nếu có result). Card gồm: preset name + summary + nút Start.
- `weekDay(ts)` helper đã có trong `routine-schedule.ts` (1=Mon..7=Sun). `dateKey`/`dayKey` có sẵn.

## Decisions

1. **Hàm mới** `suggestPresetForDayOfWeek(entries, presetIds, now, weeks=4)`: lọc session trong [now - 4*7 days, now], cùng `weekDay(now)`, cùng `hourBucket(now)`, count presetId → best (count > lastUsedAt tie-break). Null khi không có session nào trong cửa sổ 4 tuần cùng thứ.
2. **Fallback:** Home kiểm tra: nếu `suggestPresetForDayOfWeek` trả về null → dùng `suggestPresetForNow` hiện tại (không mất card cho user mới).
3. **Card enhancement:** thêm subtitle nhỏ hiển thị ngày (ví dụ "Thường tập Thứ 3" hoặc "Theo thói quen Thứ 3") khi dùng weekday model. Dùng lại key `routine.dayMon..Sun` đã có (12 ngôn ngữ). Không key mới nếu ngắn gọn.
4. **Đặt code:** thêm vào `src/features/stats/stats.ts` (cạnh `suggestPresetForNow`). Export cả 2 — Home chọn phiên bản.
5. **Test:** unit test cho weekday model: 4 tuần cùng thứ → đúng preset; khác thứ → không tính; 1 session duy nhất → chọn; null khi không có session.

## Risks / Trade-offs

- **User mới hoặc ít dùng** → weekday model 4 tuần có thể rỗng → fallback v1 (không sao, giữ nguyên card).
- **4 tuần mặc định**: đủ để học pattern mà không quá rộng (giảm noise). Có thể config weeks param nếu cần sau.
- **Không cần Remote Config** — pure function, không có key mới.

## Migration Plan

Không migrate dữ liệu. Hàm mới thêm vào stats.ts; Home sửa 1 dòng gọi hàm. Không thay đổi API public.