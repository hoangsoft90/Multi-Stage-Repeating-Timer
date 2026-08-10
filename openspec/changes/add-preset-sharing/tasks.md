## 1. Codec

- [x] 1.1 Tạo `src/features/presets/preset-codec.ts`: `encodePreset(preset)`, `decodePreset(json)` (validate qua `validatePreset`, sinh id mới)
- [x] 1.2 Unit test codec (round-trip, JSON sai, preset không hợp lệ)

## 2. Store

- [x] 2.1 presets-store: action `importPreset(json): Promise<{ ok: boolean; name?: string }>`

## 3. UI

- [x] 3.1 Home ActionMenu: thêm item "Share preset" (dùng ShareService)
- [x] 3.2 Home: nút "Import preset" + dialog paste JSON
- [x] 3.3 Deep-link `?import=` trên Home mount

## 4. i18n

- [x] 4.1 Keys: `home.menuShare`, `home.importPreset`, `import.title`, `import.placeholder`, `import.confirm`, `import.success`, `import.invalid`, `import.shareFail` — 12 ngôn ngữ

## 5. Kiểm tra

- [x] 5.1 `npx tsc --noEmit` sạch
- [x] 5.2 `npx jest` xanh
