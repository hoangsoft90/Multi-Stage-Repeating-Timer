## 1. Timer screen

- [x] 1.1 Timer screen: totalRounds Infinity → "ROUND x / ∞"

## 2. Notification

- [x] 2.1 reschedule: round format bỏ "/ ∞" cho forever (title/body)

## 3. Completion + Stats verify

- [x] 3.1 Test: forever + stop thủ công → completion null (không dialog)
- [x] 3.2 Test: session forever log status=stopped + presetName đúng

## 4. i18n

- [x] 4.1 (nếu cần) key `timer.roundInfinity` — 12 ngôn ngữ

## 5. Kiểm tra

- [x] 5.1 `npx tsc --noEmit` sạch
- [x] 5.2 `npx jest` xanh
