# Design: add-drag-drop

## Context

Editor (`src/app/preset/[id].tsx`) render danh sách stage bằng `stages.map(...)` trong ScrollView. Stack đã có react-native-reanimated + react-native-gesture-handler (chưa chắc có draggable-flatlist). `BUILTIN_TEMPLATES` có id cố định; Home đã có `isTemplate(id)` helper.

## Decisions

1. **Reorder thuần**: `reorderStages(stages, from, to)` — helper thuần trong `src/core/timer/models.ts` hoặc `editor` util, chỉ hoán đổi thứ tự, giữ nguyên `Stage.id`. Unit test invariant (id không đổi).
2. **Drag UX**: nếu `react-native-draggable-flatlist` tương thích SDK 57 → dùng; nếu không → **reorder UI tối giản tự build**: mỗi stage card có nút lên/xuống (chevron-up/down) + long-press feedback, vì scroll + drag gesture phức tạp và rủi ro phá màn. Chọn: implement **nút up/down + auto-reorder** (an toàn cross-platform, test được bằng unit) trước; drag gesture là enhancement nếu lib OK. (Quyết định giảm rủi ro: gesture drag có thể xung đột ScrollView/Stepper.)
3. **Save-as-new cho template**: Editor xác định `isTemplateSource = source && BUILTIN_TEMPLATES.some(t => t.id === source.id)`. Khi `isTemplateSource`:
   - Nút "💾 Lưu preset" → đổi nhãn "Lưu thành preset mới", tạo preset id mới, tên gợi ý `${source.name} (edited)` (user có thể đổi), save → back.
   - Không hiện nút Xóa (template không xóa được — đã đúng).
   - Start vẫn chạy trực tiếp như cũ (không save).
4. **`isTemplate` helper** dùng chung: tách ra `src/features/presets/template-utils.ts` (Home + Editor dùng).

## Risks / Trade-offs

- Gesture drag có thể phá UX (xung đột scroll/stepper) → fallback up/down buttons là tối thiểu khả thi, luôn có.
- Save-as-new đổi hành vi Save của template — cần test Editor với template vs preset user.
- i18n: `editor.saveAsNew`, `editor.editedSuffix`.
