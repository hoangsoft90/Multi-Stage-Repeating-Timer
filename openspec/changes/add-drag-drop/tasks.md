## 1. Reorder core

- [x] 1.1 Helper thuần `reorderStages(stages, from, to)` — giữ nguyên id
- [x] 1.2 Unit test: reorder giữ id, soundId mapping

## 2. Editor UI

- [x] 2.1 Editor: nút up/down trên mỗi stage card (reorder ngay lập tức)
- [ ] 2.2 (Nếu tương thích) drag gesture via draggable-flatlist — verify SDK 57

## 3. Template save-as-new

- [x] 3.1 Tách `isTemplate(id)` vào `template-utils.ts` (Home + Editor)
- [x] 3.2 Editor: khi source là template → Save = "Lưu thành preset mới" (id mới, tên gợi ý `(edited)`)
- [x] 3.3 Test: save template không ghi đè gốc

## 4. i18n

- [x] 4.1 Keys: `editor.saveAsNew`, `editor.editedSuffix` — 12 ngôn ngữ

## 5. Kiểm tra

- [x] 5.1 `npx tsc --noEmit` sạch
- [x] 5.2 `npx jest` xanh
