# Proposal: add-quick-start — Zero-friction start

## Vấn đề

User thường dùng đi dùng lại vài preset nhưng phải mở Editor để Start. "Routine hôm nay" đã gợi ý 1 preset nhưng chưa đủ cho multi-preset users. Time-to-first-timer còn cao.

## Giải pháp

- **Favorites**: field `Preset.isFavorite` (additive, default false — không bump schema). ActionMenu thêm item ⭐ Favorite/Unfavorite. Home hiển thị section FAVORITES nổi trước.
- **Preset chips**: hàng chip "MY ROUTINES" — tap ▶ = start ngay; tap thân chip = mở Editor. Kết hợp favorites → zero-friction.
- **Quick Routine** ("killer UX"): form nhanh trên Home (Work/Break/Repeat + Start) KHÔNG qua Editor, không lưu ngay. Chạy với `presetId = temp_quick_session`. Sau khi hoàn thành, CompletionDialog thêm nút [💾 Lưu thành Preset] → dialog nhập tên → xuất hiện trên Home. Không save → vẫn log vào SessionLog (Stats).
- **Streak preset-agnostic**: streak KHÔNG filter theo presetId — mọi session completed (kể cả temp_quick_session) đều tính. Cần test case riêng.

## Non-goals

- Không làm recent presets tracking riêng (presets đã sort theo lastUsedAt).
- Không thay đổi CompletionDialog hiện có ngoài thêm nút Save khi session là quick/temp.
