# Proposal: add-preset-sharing — Share / import / export preset

## Vấn đề

User tạo preset hay nhưng không có cách chia sẻ cho bạn bè/PT, không backup, không chuyển máy. Deep-link scheme `looptimer://` đã sẵn nhưng chưa có codec JSON để mã hóa preset.

## Giải pháp

- **Codec thuần TS** (`src/features/presets/preset-codec.ts`): `encodePreset(preset)` → JSON string (versioned, có `type: 'looptimer-preset'`, `version: 1`); `decodePreset(json)` → Preset | null (validate qua `validatePreset`; lỗi → null, không crash).
- **Export**: ActionMenu (long-press) thêm item "Share preset" → ShareService.share(encoded) (native share sheet / web navigator.share fallback clipboard).
- **Import**: (a) deep-link `looptimer:///?import=<encoded>` (web `?import=`), parse trên Home mount; (b) nút "Import" trên Home mở dialog paste JSON (cross-platform, hoạt động cả web). Import thành công → lưu preset + alert; sai → alert lỗi.

## Non-goals

- Không làm cloud sync/account — local-first.
- Không làm community templates.
